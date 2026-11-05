/**
 * cli/print.ts
 *
 * 并入旧版已有路径：-p 打印/SDK 模式的主循环辅助。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/print.ts
 * pieces: chunk-0a7cfwp8.js (10), chunk-0yw3taqg.js (48), chunk-5xgkngpb.js (8), chunk-czq1j3j2.js (1), chunk-vxsfen55.js (8)
 * attribution: placement 12, layout 25, fingerprint 15, sole-consumer 17, callgraph-witnessed 2, affinity 2, file-local 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { cwd } from "process";
import { join, sep, dirname } from "path";
import { open, realpath } from "fs/promises";
import { normalizeUuidOrNull } from "../utils/agentId.js";
import { EMPTY_USAGE } from "../services/api/emptyUsage.js";
import {
  hasToolResultBlock_2,
  isPlainInterruptMarker,
  isLegacyInterruptMarker,
  isInterruptMarkerRow,
  findLastUserPromptUuid,
  appendSessionStartRows,
  ResumeRefusedError,
  dedupeSessionStartRows,
} from "../utils/transcript/deserialize.js";
import {
  NO_RESPONSE_REQUESTED,
  isToolUseResultMessage,
  isNoResponseRequestedMessage,
  createUserMessage,
  wrapInSystemReminder,
  createSystemMessage,
  REWIND_UNSAFE_PATH_REASON,
  isCompactBoundaryOrSummary,
  extractTextContent_2,
  getLastAssistantTextForResult,
  createModelSwitchBreadcrumbs_2,
} from "../utils/messages.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  initializeGrowthBook,
  hasFreshGrowthBookFeatures,
  getFeatureValue_SESSION_PINNED,
} from "../services/analytics/growthbook.js";
import {
  TENGU_GOOFY_HARE,
  TENGU_SQUISHY_ULLMAN,
  TENGU_WONDROUS_HAVEN,
  TENGU_WITTY_KAY,
  retryWatchdogEnv,
} from "../services/api/withRetry.js";
import {
  logFeatureOk,
  logFeatureBad,
  logFeatureSad,
  withFeatureTelemetry,
} from "../services/analytics/featureTelemetry.js";
import { isPluginServerConfig, isManagedConfigScope } from "../services/mcp/types.js";
import { disallowedToolsSchema, mcpToolNameSchema } from "../utils/attachments/skillMentions.js";
import {
  serverSignature,
  filterDuplicateServers,
  serversNeedingNotReconnect,
} from "../hooks/notifs/useMcpConnectivityStatus.js";
import {
  isMcpServerDisabled,
  isMcpServerAllowedByPolicy,
  isBuiltinInProcessMcpServer,
  filterMcpServersByPolicy,
  doesEnterpriseMcpConfigExist,
  supportsEnvExpansion,
  mcpDialBlockCause,
  emptyServerMap,
  getMcpConfigByName,
  MCP_SETTINGS_SCOPE_SET,
  getAllMcpConfigs,
  isMcpServerBlockedAtConnectTime,
  reservedServerNameMessage,
  isMcpDialBlockedByPolicy,
} from "../services/mcp/config.js";
import { import_mapValues, import_sortedIndex_2, pickAlias } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { omitAlias } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { isStandardKeyActive } from "../services/mcp/mcpStandardKeys.js";
import { CLAUDE_CODE_REMOTE, resolveHearthToolNames } from "../services/mcp/ccrMetaMcp.js";
import { awaitMcpPolicyColdStart } from "../services/mcp/mcpPolicyColdStart.js";
import { env } from "../utils/env.js";
import { getServerUrl } from "../utils/permissions/permissionRulePayload.js";
import {
  markCcrInjectedConfig,
  copyOwnServerMarks,
  hasCcrMeta,
  toolNameForTelemetry,
  copyCcrMarks,
  filterObject,
} from "../services/analytics/metadata.js";
import { isLockedOutByOrgMcpPolicy } from "../services/mcp/orgMcpPolicyLockout.js";
import {
  BUILTIN_SERVER_IGNORED_REASON,
  IGNORED_IDE_TRANSPORT_TEXT,
  IGNORED_BY_ENTERPRISE_POLICY_TEXT,
  IGNORED_HERMETIC_MODE_TEXT,
  IGNORED_EXCLUSIVE_MANAGED_CONFIG_TEXT,
  IGNORED_DISABLE_SIDELOAD_TEXT,
  IGNORED_REMOTE_CONTROL_TEXT,
  requireVtyyqz9qChunk,
  buildMcpStatusList,
  NOT_DIALED_SUPERSEDED_TEXT,
  mcpClientModule_5,
  describeMcpServerStatus,
  nonBuiltinMarketplaceServers,
  initialWriteAttempt,
  filterServersForScope,
  latchWriteAttempt,
  sanitizeMcpResourceError,
  SERVERS_OBJECT_REQUIRED_TEXT,
  sanitizeMcpStatusMap,
  describeMcpServersForStatus,
} from "./print/mcpControlRequests.js";
import {
  getPrefixServerKey,
  getMcpPrefix,
  isToolFromMcpServer,
  collectServerToolPolicies,
  mergeMcpServerPolicyRules,
  mcpInfoFromString,
  matchesListedOrParsedServer,
} from "../services/mcp/mcpStringUtils.js";
import {
  OPERATOR_SUPPLIED_IGNORED_TEXT,
  isAlwaysKeptServer,
  partitionOperatorServers,
} from "../services/mcp/mcpConfigProvenance.js";
import { isHermeticRemoteSession } from "../services/cloudSessions/eligibility.js";
import { areSideloadFlagsDisabledByPolicy } from "../utils/plugins/marketplacePolicy.js";
import { startupCcrEnv } from "../tasks/RemoteAgentTask/remoteAgentKinds.js";
import { logForDebugging, createAttachmentMessage_2 as createAttachmentMessage } from "../utils/debug.js";
import { omitKeys } from "../utils/hooks/hookCommandResolution.js";
import {
  commandBelongsToServer,
  isStdioConfig,
  refetchReasonTelemetry,
  filterCommandsByServer,
  excludeCommandsByServer,
  isMcpTool,
  removeMcpClientsWhere,
  isDeclaredUnderOtherWorkspaceRoot,
  isNonReservedStdioConfig,
} from "../services/mcp/utils.js";
import {
  parseMcpServerSettings,
  inspectToolsList,
  describeToolsListIssues,
  sameToolPolicies,
} from "../services/mcp/serverIdentity.js";
import { sanitizeTelemetryString, sanitizeRelayUrl, formatElicitationUrls } from "../utils/sanitization.js";
import { reconcileMcpClients } from "../services/mcp/mcpClientState.js";
import { isDiscoveryCacheOn, isDiscoveryCacheUsable } from "../services/mcp/mcpAccountKey.js";
import {
  getOriginalCwdOrNull,
  getProjectConfigRoot,
  mainAgentId,
  setFlagSettingsInline,
  getFlagSettingsInline,
  getMcpConnectNonBlocking,
  setHasStreamingInput,
  setSingleShotPrintSession,
  deriveSingleShotPrintSession,
  takeUsageSinceLastResult,
  trackUsageSinceLastResult,
  setSdkOAuthTokenRefreshCallback,
  setHostAuthTokenRefreshCallback,
  getSessionId,
  getMainThreadAgentType,
  getMcpClientsFromAccessor,
  claimCostLedgerForCurrentSession,
  getLocalCommandExitCode,
  getSdkPerTaskStopAffordance,
  isParkedSpare,
  setMainLoopModelOverride,
  getMainLoopModelOverride,
  noteSystemPromptSectionInvalidation,
  isSingleShotPrintSession,
  isPrintInputClosed,
  setConnectedClientWiring,
  setMcpClientsAccessor,
  setMcpServerToolsSwapper,
  setReplBridgeActive,
  getInitJsonSchema,
  isReplBridgeActive,
  getAllowedChannels,
  getHostRendersChromeSetupOffer,
  getHasStreamingInput,
  setAwaitsFirstRun,
  getOriginalCwd,
  getStrictMcpConfig,
  getSyncedPluginReloadDebt,
  getSpareClaimState,
  getTotalCostUSD,
  getTotalAPIDuration,
  getModelUsage,
  getSafetyStops,
  getSessionCronTasks,
  getAdditionalDirectoriesForClaudeMd,
  setAdditionalDirectoriesForClaudeMd,
  getProjectRoot,
  isUnclaimedSpare,
  setSdkAgentProgressSummariesEnabled,
  markSpareClaimFailed,
  getStickyBetas,
  markPrintInputClosed,
  setMainThreadAgentType,
  setSdkPerTaskStopAffordance,
  setSdkRapidFollowupPreempt,
  setSdkForwardNestedSubagentToolCalls,
  setSessionSkillAllowlist,
  clearSystemPromptSectionState,
  setInitJsonSchema,
  setAllowedChannels,
  isSessionPersistenceDisabled,
  switchSession,
} from "../bootstrap/state.js";
import { toDynamicServerConfig } from "../services/mcp/dynamicServers.js";
import { logMCPDebug, logError, getInMemoryErrors } from "../utils/log.js";
import { countWhere, uniqBy } from "../utils/collections.js";
import { logEvent, logEventAsync } from "../services/analytics/index.js";
import { fromEnum, lit, fromEnumOpt, fromNumber } from "../services/analytics/safeMetadata.js";
import { setMcpOnClose, injectMcpMessage, onMcpNotification } from "../services/mcp/mcpWireUtils.js";
import { ListMcpResourcesTool } from "../tools/ListMcpResourcesTool/ListMcpResourcesTool.js";
import { ReadMcpResourceTool } from "../tools/ReadMcpResourceTool/ReadMcpResourceTool.js";
import { matchesToolName, findToolByName, alwaysFalse as alwaysFalse_2 } from "../Tool.js";
import {
  identityChangedFailure,
  isRemoteMcpTransport,
  identityChangedForRemote,
} from "../services/mcp/discoveryIdentity.js";
import {
  identityEpoch,
  setIdentityTrippedHandler,
  takeIdentityTripUnowned,
  rearmIdentityBaseline,
} from "../services/mcp/identityChange.js";
import {
  mcpGateError,
  mcpRefusalText,
  disabledEnableBeforeText,
  notApprovedText,
} from "../services/mcp/mcpToggleMessages.js";
import {
  logHandlerFailure,
  controlHandlerError,
  dispatchControlRequest,
} from "./print/dispatchControlRequest.js";
import {
  mcpAuthToolsFor,
  hasLapsedCcrSignIn,
  isCachedAuthStaleButUsable,
  deleteNeedsAuthCache,
} from "../services/mcp/needsAuthCache.js";
import { listDirectoryResourceTool } from "../services/mcp/skillDirectoryResource.js";
import { applyMcpServerConfig } from "../components/mcp/MCPListPanel.js";
import {
  toError,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  WireSafeControlError,
  withTelemetryMessage,
  isAbortError,
  AbortError,
  sanitizedErrorNameForTelemetry,
  sanitizedErrnoLowerForTelemetry,
  getErrnoCode,
  storageCauseErrnoCode,
} from "../utils/errors.js";
import { clearConnectorCardAllows, withClearedCardAllows } from "../utils/permissions/connectorCardAllows.js";
import {
  applyConnectionResult,
  findReusableClients,
  retryRemoteMcpServers,
  CONNECT_RETRY_BASE_MS,
} from "../services/mcp/connectionBatch.js";
import {
  refusalStateFor,
  applyMcpReconnect,
  resolveReconnectConfig,
  withAuthTools,
  reconnectMcpOnIdentityChange,
  watchMcpDisconnects,
  createReconnectBackoff,
  makeCommitReconnect,
  markServerDisabled,
} from "../services/mcp/mcpReconnect.js";
import { pMap } from "../../vendor/p-map/index.js";
import {
  rowsSinceTurnStart,
  isQueuedPromptAnswered,
  answeredHeldUuids,
  runningTurnSendsForTurn,
} from "./print/transcriptChain.js";
import {
  isCompactBoundaryMessage,
  messagesSinceCompactBoundary,
  hasRelaySourceForClients,
  hasUpdateStatusToolOnly,
  hasStartThreadToolOnly,
} from "../services/projects/threadRows.js";
import { heldUuidsIfEnabled, isSelfHostedHeldRecognition } from "./print/queuedMessageUtils.js";
import {
  isPermissionCardHoldEnabled,
  pendingActionsAmbiguous,
  unambiguousPendingAgentId,
  interruptedPromptUuid,
  createTeardownStatusReporter,
  disallowedToolsFromMessages,
  isPassiveCommand,
  WakeRouter,
  publishQueuedWakeStatus,
  ResultWakeRouter,
  installWakeRouterKick,
  pendingActionToolUseIds,
  singlePendingAction,
  hasPendingActions,
} from "./print/wakeRouter.js";
import { logForDiagnosticsNoPII, isDiagLogging, withDiagnosticsTiming } from "../utils/diagLogs.js";
import {
  flagKey,
  configProbeEnv,
  knownSubtypeOrUndefined,
  elapsedMs as elapsedMs_2,
  matchRequestId,
} from "./structuredIOProtocol.js";
import {
  getRiskColor,
  unmatchedAnswerDenial,
  TENGU_WILD_BEACON,
  restoreParkedPrompt,
  cancelStaleParkedPrompt,
  findParkedPromptOpener,
  ParkedPermissionController,
} from "./print/parkedPrompts.js";
import {
  isDifferentString,
  isValidBridgeToolName,
  BridgeToolProvider,
} from "../bridge/bridgePermissionResponse.js";
import { deepEqualIgnoringUndefined } from "../bootstrap/stateSlices.js";
import {
  stripHostOwnedInputKeys,
  applyPermissionAnswerChanges,
} from "../utils/permissions/permissionAnswer.js";
import { getRemoteFlagOverrideState, needsGrowthBookRefresh } from "../utils/permissions/yoloClassifier.js";
import {
  drainTaskNotifications,
  setTaskNotificationListener,
  emitTaskNotification,
  enqueueTaskNotification,
  hasQueuedTaskNotification,
} from "../utils/task/taskNotifications.js";
import {
  setBackgroundBashWorkProbe,
  setBackgroundBashStopProbe,
} from "../tools/AgentTool/backgroundGates.js";
import { sendSessionActivitySignal_2, sendSessionActivitySignal } from "../utils/sessionActivity.js";
import {
  surfaceManagedSettingsErrorsHeadless,
  getInitialSettings,
  getSettings_DEPRECATED,
  getSettingsWithSources,
  getSettingsWithErrors,
  updateSettingsForSource,
  parentSettingsIncluded,
} from "../utils/settings/settings.js";
import { reportSettingsValidationErrors } from "./print/settingsValidationNotice.js";
import {
  isSkillsSyncActive,
  isPluginsSyncActive,
  startFirstPluginsSync,
  isSkillsSyncLive,
  isSkillsCustomizationAllowed,
  isPluginsSyncLive,
  runFirstPluginsSync,
  pluginInstallTimeoutMs,
  pluginMcpTimeoutMs,
  rerunPluginsSync,
  refreshSkillsSyncVeto,
} from "../utils/claudeAiSync/skillsSync.js";
import {
  startSkillSyncAndResync,
  awaitFirstSkillList,
  installWaitTimeoutMs,
  reloadSyncedSkills,
} from "../services/skillsSync/skillsSync.js";
import { call } from "../commands/login/login.js";
import { settingsChangeDetector } from "../utils/settings/changeDetector.js";
import {
  subscribeOrgFastModeChange,
  getFastModeState,
  getFastModeUnavailableReasonCode,
  getFastRejectedReason,
  onOrgFastModeChange,
  onFastRejectedFallbackModelsChanged,
  isMainModelFastRejected,
  clearFastRejectedFallbackModels,
} from "../utils/fastMode.js";
import {
  whenPolicyNotified,
  mergeTrustedDirectories,
} from "../utils/permissions/permissionContextRefresh.js";
import {
  headlessProfilerStartTurn,
  headlessProfilerCheckpoint,
  logHeadlessProfilerTurn,
} from "../utils/headlessProfiler.js";
import { isQualifiedForGrove, checkGroveForNonInteractive } from "../services/api/grove.js";
import {
  recordPhase,
  noteSdkMcpDial,
  recordInputReadyFromSpawn,
  markResumeHydratePrefetch,
} from "../utils/startupTiming.js";
import {
  gracefulShutdownSync,
  isShuttingDown,
  gracefulShutdown,
  markPrintModeSignalHandlersRegistered,
} from "../utils/gracefulShutdown.js";
import { markPollEventWiringForPrintRun } from "../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import {
  turnHandoffAdmission,
  shouldCarryWrites,
  isTurnHandoffResumeEnabled,
  isCarriedWritesEnabled,
  hasSaidCarriedWrites,
  buildTurnHandoffReply,
  rewindRequestAge,
  serviceClockStoredAt,
} from "./remoteIO/turnHandoff.js";
import {
  lazyTeleportRelayEnv,
  lazyPostTurnSummary,
  PRINT_TURN_FLUSH_DELAY_MS,
  PRINT_TURN_WAIT_MS,
  lazyPrintModules2,
  lazyCronTools,
  lazySessionInboxPointers,
  getMcpClientModule,
  lazyHandoffMarkerRelay,
  PRINT_TURN_TIMEOUT_MS,
  ELICIT_WAIT_RETRY_MS,
  TEAM_SHUTDOWN_REMINDER,
  teamTeardownParkTimeoutMs,
  isTeamShutdownReminder,
  lazyAutonomousLoop,
  lazyCronScheduler,
  lazyCronJitterConfig,
  PRINT_TURN_MAX_ATTEMPTS,
  CLAIM_SESSION_QUEUE_DELAY_MS,
  lazyPrintModules,
  lazyConversationExporter,
  isMcpCallResultTooLarge,
  MCP_CALL_RESULT_TOO_LARGE_TEXT,
  getMcpErrorClassificationModule,
  getMcpAuthModule,
  PRINT_TIMING_CONSTANTS,
  PRINT_TURN_RETRY_MS,
  TENGU_ANCHORED_LANTERN,
  lazyCoordinatorMode,
  lazyTeleportRelayMarker,
} from "./print/lazyModules.js";
import {
  isTranscriptPersistenceDisabled,
  saveAgentSetting,
  describeDiskTranscriptLag,
  findUnresolvedToolUses,
  recordTranscript,
  flushSessionStorage,
  isCompactPairWithheldFromRemote,
  addSessionMirror,
  getCurrentSessionIsolationLatch,
  saveIsolationLatch,
  registerLiveSuppressionProbe,
  buildFileHistorySnapshotChain,
  cacheSessionTitle,
  getSessionRowsOffDisk,
  mirrorLeafCheckpointToRemote,
  persistLeafCheckpoint,
  adoptResumedSessionFileAsync,
  adoptResumedSessionFile,
  registerTranscriptExitReStamp,
  resetSessionFilePointer,
  adoptForkSessionMetadata,
  recordContentReplacement,
  restoreSessionMetadata,
  saveMode,
  searchSessionsByCustomTitle,
  getSessionIdFromLog,
  setTranscriptLocalGcEnabled,
  hydrateFromCCRv2InternalEvents,
  hydrateRemoteSession,
  getTranscriptPathForSession,
} from "../utils/sessionStorage.js";
import {
  reportUserDataAttachments,
  classifyFoldedFollowUps,
  isTeardownUnwindRequested,
  clearTeardownUnwind,
  stopAgentsOverBudget,
  hasAwaitedRunningTaskIn,
  foldedFollowUpTelemetry,
  requestTeardownUnwind,
  installAutocompactStateReporter,
  hasAwaitedRunningTasks,
  collectOwedTaskNotifications,
  isTeammateStillWorking,
  isAwaitedBackgroundTask,
  mayEndWithBackgroundWork,
  reportsRunningBackgroundTasks,
  isAmbientBackgroundTask,
  summarizeTasksForTelemetry,
  makeThrottledLogger,
  shouldKillOnStreamClose,
  killOrphanedShells,
  hasPendingLoopWakeup,
  reportsRunningBackgroundTasksExplicit,
} from "./print/backgroundWindDown.js";
import {
  createStagedRowTracker,
  countPowerShellCallsWhenDisabled,
} from "../tools/PowerShellTool/sessionChannelPowerShell.js";
import {
  createResultStamper,
  collectResumableAgentIds,
  planRecordedAgentResumes,
  resumeCutOffAgents,
  formatRestartedAgentsReminder,
  listResumableAgentsStub,
  restoreChromeSetupOfferState,
  markHostRendersChromeSetupOffer,
  holdParkedAgentAsk,
  createBridgeSdkController,
  chromeSetupOfferKey,
  RecordedAgentResumeRun,
  classifyArtifactThreadMessage,
  resumeArtifactThreadAgent,
  readArtifactThreadHeader,
  applyHostRendersChromeSetupOffer,
} from "./print/agentResume.js";
import { setOwnBridgePeerResolver, fragmentForLog } from "../utils/udsMessaging/peerGuard.js";
import {
  ownBridgePeerAddress,
  setSdkHostedBridgeHandle,
  getSdkHostedBridgeHandle,
  reportBridgeModel,
  reportBridgePermissionMode,
  reportBridgeCrossSessionInbound,
  setSupervisedBridgeSession,
} from "../bridge/replBridgeHandle.js";
import {
  transportStateByHost,
  isTransportBacked,
  mayPersistOnHost,
  pickForTransport,
  isLocalStdinOnly,
  mayTransportPersist,
  emptyIfTransport,
  isBridgeOrTransport,
} from "./transportState.js";
import { isStreamJsonStdin, applyInitializePlugins } from "./startup/awaitInitialize.js";
import {
  isRemoteManagedEnvironment,
  workingSyncAdmission,
  isRemoteEnvPlaceholder,
  remoteEnvSystemPromptSections,
  isByocEnvironment,
  isBridgeEnvironment,
} from "../utils/remoteEnvironment.js";
import {
  gitCredentialEngineAdmission,
  sessionAuthAdmission,
  ccrAuthRefreshAdmission,
} from "./remoteIO/workerAuth.js";
import { getCwd, runWithContextKey } from "../utils/cwd.js";
import {
  decideWorkerDirSync,
  safeHomedir,
  configDirForSync,
  admitRemoteToolsAnnounce,
  createRemoteToolsAnnounceHandler,
} from "./print/remoteToolsAnnounce.js";
import { getPreSettingsEnvSnapshot } from "../utils/managedEnvApply.js";
import {
  createTurnGateParticipants,
  restoreCostState,
  COST_PUSH_INTERVAL_MS,
  heldUuidsAnsweredByTurn,
  MemoryExtractPlaceGate,
  CostStatePusher,
  TurnGate,
  classifyTurnAbort,
  startHostReturnWakes,
  HostReturnWakeTracker,
  TURN_GATE_READY,
} from "./print/turnGate.js";
import { isFirstPartyRemoteSession } from "../utils/userDataRoots.js";
import {
  createUserDataRootsTurnGate,
  resumeModelRestrictedNotice,
  modelRestrictedNotice,
  hasHitUnattendedRestartLimit,
  withWireModelRestriction,
  UnattendedStartRecord,
  createModelChangeNotices,
  buildSystemStatusMessage,
  noteStagedFilesNotPlaced,
  noteStagedFilesStillCopying,
  placeCarriedWritesAtTurnStart,
  TurnModelOverrideTracker,
  isNonRestPromptBatch,
  isStagedHomeMountPath,
  waitForHomeFilesFlag,
  isDefaultModelRefusedByPolicy,
} from "./print/unattendedStartRecord.js";
import {
  isSessionChannelDisabled,
  isRemoteToolForwardingSwitchOn,
  isRemoteToolForwardingEnabled,
} from "../services/remoteTools/servingGates.js";
import {
  sdkHostOffersOAuthRefresh,
  hostSessionsBearerOffered,
  isClaudeAISignInToken,
  isClaudeAIOAuthTokenHostInjected,
  validateForceLoginMethod,
  checkNewLoginTokenOrg,
  validateForceLoginOrg,
  getAccountInformation,
} from "../utils/auth.js";
import {
  isLauncherStartedProcess,
  setLauncherHostLoginReplacementJudge,
} from "../utils/auth/launcherHostLogin.js";
import { verifyLauncherHostLogin, runStartupHooks } from "./startup/launcherHostLogin.js";
import {
  isHostEntrypoint,
  isClaudeAiChatOrigin,
  isDesktopTopSession,
  isRemoteCowork,
  bridgeOwnerAccount,
} from "../utils/entrypointKinds.js";
import { parseNumberWithSeparators, isBareMode, isEnvTruthy } from "../utils/envUtils.js";
import {
  installStdoutGuard,
  createBridgeTurnKeepAwake,
  applyBridgeChildCliEntrypoint,
} from "./print/bridgeKeepAwake.js";
import {
  effectivePermissionPromptTool,
  isNoPromptHost,
  setPermissionPromptHostProbe,
  setPermissionPromptPerson,
} from "../utils/permissions/permissionPromptHost.js";
import { SandboxManager, isToolSandboxActive } from "../utils/sandbox/sandbox-adapter.js";
import {
  SANDBOX_UNAVAILABLE_MESSAGE,
  reportSandboxErrorUnderStandIn,
} from "../utils/sandbox/sandboxErrors.js";
import {
  publishFailedSummary,
  SdkResultReporter,
  HeldResultsController,
  startResumeLoadHold,
} from "./print/sessionResult.js";
import { buildStartupFailureResult, isStartupFailureResultRequested } from "./startupFailureResult.js";
import { sleep, withDeadline, withTimeout, raceWithAbortSignal } from "../utils/sleep.js";
import {
  createInboxPermissionChecker,
  createSandboxNetworkAsker,
  mcpCallRefusalFor,
  remoteBrowserRefusal,
  guardRemoteBrowserMcpCall,
  applyWidgetToolStates,
  FAILED_TO_RESUME_SESSION_TEXT,
  SESSION_NOT_FOUND_MESSAGE,
} from "./print/controlRequestMisc.js";
import { profileCheckpoint, addStartupContext } from "../utils/startupProfiler.js";
import {
  createDependencyWatcher,
  isUsageLimitDenialStale,
  hasVerifiedSlackHumanTurn,
  hasSlackLaterNotification,
} from "./print/rewindStandIn.js";
import { warnOfDeniesOnAnotherHostOnStderr } from "../utils/sandbox/deniesOnAnotherHost.js";
import { createSessionHooksRegistry } from "../services/plugins/accountSync/syncedPluginHooks.js";
import {
  sessionHooksRegistrySlot,
  recordSwitchIfChanged,
  switchSerializerSlot,
  hasPreModelSwitchHook,
  serializeModelSwitch,
} from "../utils/model/modelSwitchHooks.js";
import {
  createForkSeedVerifier,
  startHostCpuSampler,
  PROC_FS_READER_WITH_LINKS,
  isBridgeForkSupported,
  mcpSyncNeeded,
  pickReusableMcpClients,
  mcpServersToReconnect,
  mergeMcpToolsAndCommands,
  applySdkMcpServerChanges,
  handleForkConversation,
  ForkSeedUnverifiedError,
} from "./print/forkConversation.js";
import {
  getAttachablePrompt,
  findBackgroundSessionHolder,
  formatSessionRunningInBackground,
} from "../utils/sessionAttach.js";
import {
  messagesHeard,
  hasForeignOrigin,
  runWithTurnId,
  pickTurnIdForRelay,
} from "../services/mcp/ccrTurnId.js";
import { promptOriginOfContent, promptOriginKind } from "../utils/processUserInput/promptOrigin.js";
import {
  CloudPluginSwitches,
  retirementPromptRows,
  isStopOfHeldMessagesEnabled,
  installSdkEventDrain,
  createPromptSuggestionEmitter,
  createRateLimitFrameRelay,
  fileAdminLimitRequest,
  TurnStartChecks,
  SdkMcpServerWait,
} from "./print/turnStartChecks.js";
import {
  restoreTaskListAtBoot,
  removePlacedCopiesOfDeletedFiles,
  notifyTurnBeganBeforeInit,
  placeFilesByNameForTurn,
  WorkerDirSyncReporter,
  TeamLeadPoller,
  getSnapshotStore,
  snapshotPathForSession,
} from "./print/taskListRestore.js";
import {
  createIngressReadiness,
  isUnhandledIngressType,
  classifyInboundLane,
  resolveInboxWakeFor,
  escapedIngressPrompt,
  awaitGrowthBookSettled,
  ingressPromptContent,
  isSyntheticTriggerFrame,
  takeOnce,
  resolveIngressOrigins,
  isUserTypedTurn,
  relayMessageMeta,
  logProjectsRelayAdmission,
  initiatorOfFrame,
  isHumanComposedFrame,
  isHumanIngressFrame,
  withCloudBrowserTurnId,
  admitCloudBrowserTurnId,
  escapePromptUnlessDisabled,
  withdrawnFileUuidsOf,
  isPlainUserMessageEnvelope,
  ingressSubmitFlags,
} from "./remoteIO/ingress.js";
import {
  rebuildStartupToolsForCodeMode,
  withLateEnabledToolsIfAdvertised,
  TOOL_POOL_MEMO_TTL_MS,
  assembleToolPool,
  TOOL_CATALOG,
} from "../tools.js";
import { noopModelPinReset, switchSessionModelPin } from "../utils/sessionModelPin.js";
import { prefetchUserContext } from "./startup/sessionLaunchOptions.js";
import { takePendingInitialUserMessage } from "../utils/sessionStart.js";
import {
  shouldAttemptAgentRestoreInPrint,
  loadAgentDefinitionsForSessionCwd,
  restoreAgentFromSession,
  neutralizeForkFallbackBanners,
  rearmRefusalFallbackHeaderFromTranscript,
  restoreModelFromSession,
  installRestoredModel,
  restoreWorktreeForResume,
  worktreeResumeRefusalError,
  worktreeGoneHeadlessNotice,
  restoredMemoryPauseNotice,
  restoredAutoMemorySessionNotice,
  reloadAgentDefinitionsForModeSwitch,
  restoreSessionStateFromLog,
} from "../utils/sessionRestore.js";
import {
  isBuiltInAgent,
  withLiveRegisteredAgents,
  getActiveAgentsFromList,
  getAgentDefinitionsWithOverrides,
  parseAgentsFromJson,
} from "../tools/AgentTool/loadAgentsDir.js";
import { getMainLoopModel, modelSettingResolvesThroughModelStrings } from "../utils/model/model.js";
import { writeToStdout, markStdoutDrainExternallyClocked, outstandingStdoutBytes } from "../utils/process.js";
import { filterToolsByDenyRules } from "../utils/permissions/filterToolsByDenyRules.js";
import {
  notifyRequiresAction,
  makePermissionModeReader,
  notifyProactivityChanged,
  onProactivitySelectorChange,
  cycleProactivityLevel,
  proactivityStateStub,
} from "./print/proactivityControl.js";
import {
  shouldLeadWithOldestCard,
  restoreDeclaredDialogKinds,
  getResumeLaneOptions,
  resolveResumeInterruption,
  findUnresolvedToolUseOnAPrunedBranch,
  findUnresolvedToolUseAnywhere,
  planServedCallAdoption,
  createUnresolvedToolUseFinder,
  buildOrphanedPermissionPrompt,
  createElicitationRegistrar,
  DISABLED_ELICITATION_LIMITS,
  createSdkUserDialogHandler,
  cancelPendingUserDialogs,
  isTerminalTitleSuppressed,
  cancelDialogsOnNewPrompt,
  declareSdkDialogKinds,
} from "./print/elicitationRegistrar.js";
import { collectSendPins, collectNamedAgentIds } from "../tools/SendMessageTool/deliveryResults.js";
import { mcpTaskEndingsSlots } from "../tasks/McpTask/mcpTaskEndings.js";
import {
  createTranscriptSaver,
  createInlineMcpTiming,
  refreshMcpForTurn,
  reloadPluginHooksNow,
  reloadPluginHooksQuiet,
  planMcpConnectorPrewait,
  pluginMcpServersRequired,
  McpPrewait,
  needsPluginRefreshAfterIdle,
  isSlashCommandPrompt,
  HeadlessTurnLoop,
  createPluginHookRefresh,
  refreshPluginHooksOnClaim,
  reportTurnLoopCrash,
  watchTaskChanges,
  BesideLoopRequestQueue,
  waitForPluginSyncBudget,
  recordInlineMcpSetServers,
} from "./print/turnLoop.js";
import { isMcpTasksEnabled } from "../services/mcp/mcpTaskWorker.js";
import {
  loadMcpTaskModule,
  supersedesMessage,
  logBridgeDialogKindsDeclared,
} from "./print/resumeMcpTasks.js";
import {
  dedupeTasksById,
  isTranscriptLocalGcEnabled,
  isCcrSubagentSkipOnDeltaGateOn,
  isWondrousIslandGateOn,
} from "./remoteIO/gates.js";
import {
  collectOrphanTasks,
  restoreOrphanAgents,
  isAmbientRunning,
  orphanAgentRestoreNotice,
  enqueueOrphanRestoreWake,
} from "./remoteIO/orphanAgentRestore.js";
import { describeRunningProcesses } from "../utils/sessionState.js";
import { createTaskFramework, getRunningTasks } from "../utils/task/framework.js";
import { formatOrphanSummary, startupStandInPlan } from "../tasks/resumeOrphanedTasks.js";
import { restoreRemoteAgentTasks } from "../tasks/RemoteAgentTask/RemoteAgentTask.js";
import {
  restoreMemoryToggle,
  restoreExcludeDynamicSections,
  restoreProactivityOptIn,
  isWorkerEpochAfterFirst,
  installLifecycleForwarderUnlessRemote,
  isArchivedAfterRestartNow,
  applyInitializeProactivity,
  notifyExcludeDynamicSections,
} from "./print/workerEpochRestore.js";
import { restoreToolsKeptByClear, recordEarlierToolsUnknown } from "../services/compact/keptTools.js";
import { applyPicturesToHide, fillPicturesToHide } from "../utils/attachments/bridgeAttachments.js";
import { removeDeletedChatFiles } from "../utils/uploadsInPlace.js";
import { adoptInternalWindows } from "../services/compact/autoCompactWindow.js";
import { restoreDurableWatches } from "../services/artifacts/durableWatch.js";
import {
  settleWorkerPermissionModeRecord,
  restorePlanModeFromTranscriptOnly,
  restorePlanModeOnResume,
  isTranscriptPlanSourceAllowed,
} from "../utils/planModeResume.js";
import {
  syncUltracodeActive,
  stripCompactErrorForSdk,
  serializeGoalState,
  emitBackgroundTasksChanged,
} from "../state/onChangeAppState.js";
import { getUserSpecifiedModelSetting } from "../utils/model/smallFastModel.js";
import { ensureModelStringsInitialized } from "../utils/model/modelStrings.js";
import {
  createAssistantTextTracker,
  TurnEndPrinter,
  trackAssistantText,
  createPeerMessageRouter,
  mcpServersNamedByRules,
  runWithTurnIdReport,
  collectTrialEnvKeys,
  mcpConnectionClosedMessage,
  resolveTurnAgent,
  applyRequestedAgent,
  reportCommandRefused,
  handleTurnHandoff,
  dropBeforeAttachments,
  acceptStdinPeerMessage,
  prewarmTranscriptReadAhead,
} from "./print/peerMessages.js";
import {
  readRecordedThinkingSettings,
  restoreThinkingSettingsFromRecord,
  modelToRestoreAfterRefusal,
  withAutoModeCapableDropGuard,
  applyWorkspaceTrust,
  rewindExpiryVerdict,
  REWIND_REFUSAL_RETRYABLE,
  rewindRefusal,
  usageLimitedRewindRefusal,
  isRewindTargetQueued,
  REWIND_REFUSAL_TEXT,
  validateApplyFlagSettings,
  applyFlagSettings,
  applyFlagSettingsSideEffects,
  applyModelSetting,
} from "./print/applyFlagSettings.js";
import {
  takeNoServerCheckNotice,
  sdkSupportsFallbackDialog,
  takeServerFallbackAnnouncement,
} from "../utils/permissions/serverClassifier/fallbackNotice.js";
import { isServerClassifierOff } from "../utils/permissions/serverClassifier/arbiter.js";
import { informationalSystemMessage } from "./print/sdkMessageStream.js";
import { enableCodeMode, resumeSourceForPath } from "../utils/codeMode/sessionResumeHooks.js";
import { ndjsonStringifyWithReplacer, ndjsonStringify } from "./ndjsonSafeStringify.js";
import { isExtractModeActive } from "../memdir/paths.js";
import {
  flushPendingAsyncRewakeHooks,
  executeNotificationHooks,
  executeDirectoryAddedHooks,
} from "../utils/hooks.js";
import {
  RemoteIO,
  sessionStreamCreatedAt,
  sessionStreamWriters,
  sessionStreamReceivedAtMs,
  sessionStreamStartedBefore,
  cliRemoteWorkerInputs,
  hasResumeFlag,
  turnHandoffRegistrationNow,
  turnHandoffRegistrationToAnnounce,
} from "./remoteIO.js";
import {
  sweepOnFullDisk,
  interruptedTurnUuids,
  PrintRunState,
  wrapPersistenceWithFollowupCheck,
  countUserPromptsFromEntries_4,
  isImmediateCommandCandidate,
} from "./print/inboundMessages.js";
import { parseUserSpecifiedModel, bytesPerTokenForModel } from "../utils/model/modelDisplay.js";
import { getSessionProject } from "../bootstrap/sessionSlices.js";
import { resolvePhysicalCwd } from "../utils/Shell.js";
import {
  UnseenPanelModInputHold,
  waitBeforeInitializeReply,
  runImmediateSlashCommand,
} from "./print/immediateCommands.js";
import {
  clientRegistry,
  paneRegistry,
  normalizeDraws,
  fullscreenClients,
  showPane,
  focusPane,
  allPanes,
  closePane,
} from "../plugins/functionHooks/panes.js";
import { McpConnectionStore } from "../services/mcp/mcpConnectionStore.js";
import { PluginsStateStore } from "../utils/plugins/pluginLoadStatus.js";
import { computerUseOwnerLock, ComputerUseStateCell } from "../utils/computerUse/computerUseMcpState.js";
import { startCpuSampling, startToolCpuSampling } from "./print/toolCpuSampling.js";
import { createWatch } from "../utils/leftRunningFamilyWatch.js";
import {
  RECEIVED_MESSAGE_UUIDS,
  HOST_INGRESS_LANES,
  isNoticeKindServed,
  handleSessionNotice,
} from "./print/sessionNotices.js";
import {
  makeHeldMessageMatcher,
  compactionPreservedRows,
  classifyRedeliveredRow,
  isRowFromLoadedCompaction,
  compactionCopyTelemetry,
} from "./print/runningTurnRecord.js";
import {
  makeRewindStandInWriter,
  hasRewindTarget,
  reportCcrHistoryLoadFailure,
} from "./print/adminRequestFrames.js";
import {
  RedeliveryResolver,
  createTurnPersistenceChecks,
  DeclinedRedeliveryBatcher,
  UserFrameIntake,
  flushPendingRowsWithTerminal,
  InputLatencyLedger,
} from "./print/userFrameIntake.js";
import {
  reportRedeliveredFollowupClosed,
  installPermissionModeReporter,
  RapidFollowupPreempter,
  isRapidFollowupPreemptEnabled,
  FollowupBackgroundsSubagent,
  isFollowupBackgroundsSubagentEnabled,
  SparedWindowReporter,
  runSafely,
} from "./print/followUpPreempt.js";
import {
  detectTurnInterruption,
  collectInterruptedTurnsPrompt,
  weakMapLookup,
  tailDiagnosticsFields,
  isInterruptedTail,
  resumePromptOverride,
  loadConversationForResume,
} from "../utils/conversationRecovery.js";
import { hasReachedBudget, resetCostState, setCostStateForRestore } from "../cost-tracker.js";
import { isTidySlothGateOn } from "../tasks/LocalShellTask/backgroundNotices.js";
import {
  releaseStartupWork,
  yieldStartupWorkToTurn,
  expectStartupHandshake,
} from "./startup/startupWorkGate.js";
import { isTerminalShutdown, latchTerminalShutdown, heldUntilExit } from "../utils/terminalShutdown.js";
import { getQueuedUserTurnCount, TurnDispatcher, isBusyOrClosed, isBusy } from "./print/turnDispatch.js";
import {
  ccrLostCallsNote,
  awaitPendingPermissionAnswers,
  PENDING_PERMISSION_ANSWER_GRACE_MS,
} from "./print/permissionAsks.js";
import { ServedCallRegistry, isRemoteCapableCall } from "../utils/remoteTools/restartNotices.js";
import {
  shutdownInterruptStamp,
  createAbortController,
  userAbortReason,
  createChildAbortController,
  PromptScopedAbortController,
  turnAbortControllerOf,
  isServerFallbackDiscard,
} from "../utils/abortController.js";
import {
  KeepaliveAfterStop,
  OwnCardDeadline,
  handleRemoteCancel,
  isCancelAimedAtParkedBatch,
  cancelQueuedMessages,
  interruptCurrentTurn,
  requeueTakenMessage,
  cancelSourceLabels,
  withOwnWordStopKey,
  markOwnWord,
} from "./print/remoteCancel.js";
import {
  createKeepAliveSender,
  SDKControlReloadPluginsRequestSchema,
  SDKSetChromeBrowserHintsSetChromeBrowserHintsMessageSchema,
  SDKSetPromptSuggestionsPausedSetPromptSuggestionsPausedMessageSchema,
} from "../entrypoints/sdk/controlSchemas.js";
import { stopObserverAgents, stopAllRunningTasks, stopTaskByUser } from "../tasks/stopTask.js";
import { PrewaitLatch, interruptOnNowPriority, OneShotRunLimits } from "./print/runEndReasons.js";
import {
  commandsDiscarded,
  firstSchedulingPlugin,
  isDrainableMainThreadCommand,
  isQueuedUserTurnCommand,
  textNotTypedFlags,
} from "../utils/messageQueueManager.js";
import {
  createFetchHoldRegistry,
  filesRefetchMode,
  plannedFilePrompt,
  holdForFilesRefetch,
  refetchUserMessageFiles,
  fetchUserPromptFiles,
} from "./print/userPromptFiles.js";
import { settleOnTurnFinish, markMessagesRead } from "../bridge/readReceipts.js";
import {
  watchCommentWakeLifecycle,
  reportCommentWakesStarted,
  parseTriggerWebhookPayload,
  claudeDocCommentPrompt,
  reportDurableCommentWake,
} from "./print/triggerPayloads.js";
import {
  notificationSettleListenerSlot,
  queuedNotificationCapabilities,
  reportStartedNotifications,
  rearmNotificationNudge,
  settleTurnReads,
  watchNudgeCancel,
  createNudgeHold,
  acceptQueuedNotification,
  appendToPendingNotification,
} from "../services/queuedNotifications/queuedNotifications.js";
import { getRemoteSessionUrl } from "../constants/product.js";
import { buildBridgeConnectUrl } from "../bridge/bridgeStatusUtil.js";
import { createPersistenceChecker, loadSessionTranscriptRows } from "./print/transcriptLeaves.js";
import { getSourceUuid } from "./queuedCommands.js";
import { serializeCalls } from "../utils/promiseQueue.js";
import {
  isBridgeableMessage,
  isEphemeralSdkFrame,
  SIDE_QUESTION_TIMEOUT_MS,
  SIDE_QUESTION_TIMEOUT_MESSAGE,
} from "../bridge/bridgeMessaging.js";
import { isRealAssistantMessage } from "../utils/cronResume.js";
import {
  clearLateSessionStartRows,
  flushWaitingSessionStartRows,
  releaseHeldSessionStartRows,
  appendSessionStartHooksWhenDone,
  runLateSessionStartHooks,
  maybeWaitForSessionStartHooks,
} from "./print/lateSessionStartHooks.js";
import {
  isBridgeStateFramesEnabled,
  getBridgeSubagentFrameGate,
  isSdkBridgeStateAnnounceEnabled,
  isCcrV2SessionCrudEnabled,
  ensurePolicyLimitsLoadedForDiagnostic,
  isPersistentRemoteSessionEnabled,
  isRemoteControlInternalEventsEnabled,
  isBridgeInboundReadReceiptsEnabled,
  isRunningInRemoteEnvironment,
  getCcrAutoConnectDefault,
} from "../bridge/bridgeGates.js";
import { setCurrentForKey, getCurrentForKey } from "../utils/currentRefByKey.js";
import {
  shouldForwardSubagentMessage,
  orderedRowSource,
  appendRowsWithHooks,
  restoreRemoteFileState,
  runningTurnRegistry,
} from "../utils/queryHelpers.js";
import { useShimmerAnimation } from "../components/Spinner/useShimmerAnimation.js";
import {
  toExternalPermissionMode,
  isExternalPermissionMode,
  sessionMetadataToAppState,
} from "../utils/permissions/PermissionMode.js";
import { killRunningShellCommands } from "../utils/ShellCommand.js";
import { registerCleanup } from "../utils/cleanupRegistry.js";
import { waitForTaskCompletion } from "../tools/TaskOutputTool/TaskOutputTool.js";
import {
  bytecodeOrderStats,
  notifyVscodeHost,
  installCcdSessionTelemetryProxy,
  alwaysFalse,
  bridgeMessageUuid,
} from "./print/hostTelemetryProxy.js";
import {
  emitStatusMessage,
  toSdkModelInfos,
  resolveQueuePriority,
  remoteControlErrorCode,
} from "../entrypoints/sdk/coreSchemas.js";
import {
  refreshAndReevaluateHeld,
  getInboundRefuseCause,
  logInboundRefused,
  isGatedInbound,
  gateInboundByOrigin,
} from "../utils/crossSessionInbound/inboundGate.js";
import {
  buildBridgeInitializeCommands,
  commandNamesForBridge,
  logBridgeInitializeCommands,
} from "./print/lowLatencySubmit.js";
import { BangCommandRunner, isPassiveQueueItem, detectWorkerHosting } from "./print/commandQueueDrain.js";
import {
  RemoteMcpTaskTracker,
  createSurfaceDeclarationTracker,
  noteSurfaceClientHeard,
  applyPermissionModeChange,
  ackPollEventRow,
  handlePollEvent,
  renderPluginSurface,
  renderPluginSurfaceWithRetry,
  handleClientFault,
  handleReloadPluginsAddPlugins,
  listSkillsForSdk,
} from "./print/pollEvents.js";
import { AwsAuthStatusManager } from "../utils/awsAuthStatusManager.js";
import {
  READ_FILE_STATE_CACHE_SIZE,
  createRemoteFileState,
  stripBomAndCarriageReturn,
} from "../utils/remoteFileState.js";
import { isResumeFrameSeedEligible } from "../services/artifacts/artifactToolGates.js";
import {
  applyArtifactResumeCarry,
  collectResumeArtifactCarry,
} from "../tools/ArtifactTool/artifactResumeCarry.js";
import { rearmHeadlessCommentMonitors } from "../services/artifacts/commentMonitorResume.js";
import { ask, QueryEngine } from "../QueryEngine.js";
import { registerMemoryAttributor } from "../utils/telemetry/memorySummary.js";
import { InstanceRegistry } from "../utils/instanceRegistry.js";
import { setToolState } from "../services/remoteTools/backgroundCommands.js";
import { emptyPickerState } from "../memdir/findRelevantMemories.js";
import {
  createIsolationLatch,
  findIsolationLatchFromHistory,
  DEFAULT_EXEMPT_SERVERS,
  addExemptServers,
  isWebSearchIsolationActive,
} from "../services/tools/webToolIsolation.js";
import { androidEvidenceByHost } from "../tools/BashTool/androidCommands.js";
import { devIntentTracker } from "../services/projects/devIntent.js";
import { buildModelPickerOptions, getUnavailableModelRows } from "../utils/model/modelOptions.js";
import { onSessionSwitchCallback } from "../utils/model/refusalFallback.js";
import {
  resolveSwitchedModel,
  logUnrecognizedModelSwitch,
  handleSetModelRequest,
  modelChangeNeedsNewContext,
  MODEL_SWITCH_STATE,
} from "./print/setModelControl.js";
import {
  createUsageLimitWaitHeartbeat,
  createUserDecisionReporter,
  createWaitingStatusReporter,
  teardownAutoReactAndRooms,
} from "./print/waitingStatus.js";
import {
  createContextUsageReporter,
  logBridgeAttachmentsMissing,
  findDeclaredTurnRange,
  RESUME_DROPS_TURN_REJECTED_PREFIX,
  isAllInvisibleMeta,
} from "./print/resumeTurnBoundaries.js";
import { ThinkingDisplayState, applyThinkingBudget } from "./print/setMaxThinkingTokens.js";
import {
  checkAutoModeTransition,
  isAutoModeTransitionDue,
  checkAutoModeInUse,
  applyAutoModeTransition,
} from "../utils/permissions/autoModeTransition.js";
import { EVENT_LOGGING_FLAG_WAIT_MS } from "../utils/startupFlagWait.js";
import { modelSupportsAutoMode } from "../utils/betas.js";
import {
  setPermissionModeWithGuards,
  transitionPlanAutoMode,
  isAutoModeGateEnabled,
  isHarborWillowEnabled,
  isMaxEffortReminderEnabled,
  settlePlanAutoModeAtStart,
  guardPermissionModeChange,
  isBypassPermissionsDeniedOutsideSandbox,
  asClaimedStartModeContext,
  verifyAutoModeGateAccess,
  withToolAliases,
  declareSdkHostCodeRunningMcpTools,
  withRulesSetAsideAgain,
} from "../utils/permissions/permissionSetup.js";
import { isAutoModeActive, isAutoModeFromFallback } from "../utils/permissions/autoModeState.js";
import {
  isAutoModeCapableModel,
  burstBackdropRedraw,
  FlagSettingsClaimTracker,
  isAllowedBeforeClaim,
  SPARE_CLAIM_FAILED_TEXT,
  SPARE_NOT_CLAIMED_TEXT,
  hasSdkHostHooks,
  withHostWordedAsks,
  sdkClaudeAuthenticate,
  sdkHooksIfHostOwnsStdin,
  sdkHookReconnectFallback,
  buildSdkHookRegistrations,
} from "./print/hostSettingsClaims.js";
import { getDefaultMainLoopModel } from "../utils/model/modelFallback.js";
import { managedDenyStartupRefusal, isModelAllowed } from "../utils/model/modelAllowlist.js";
import {
  isExemptDefaultResolvingPick,
  isModelAllowedUnderActiveEnforcement,
} from "../utils/model/defaultModel.js";
import { stepDownRestrictedFamilyAliasPick } from "../utils/model/planModeModel.js";
import { formatModelRestrictedNotice } from "../utils/model/validateModel.js";
import {
  runPreModelSwitchHooks,
  describeModelSwitchBlocked,
  sanitizeHookText,
} from "../commands/model/modelSwitch.js";
import {
  seedBridgeEffortLevel,
  reportEffortForModel,
  resolveEffortLevelOrNull,
  applyBridgeFlagSettings,
  reportBridgeEffortForRequest,
} from "../bridge/applyFlagSettings.js";
import {
  PendingMcpToolsByServer,
  createMcpRetryOrchestrator,
  createNextTurnRedialer,
  pickServerResultsAfterRetry,
} from "./print/mcpTurnRedial.js";
import {
  refreshMcpServerTools,
  serverCacheKey,
  getMcpEntryRowNotServed,
  TRANSPORT_FALLBACK_TIMEOUT_MS,
  getConnectTimeoutMs,
  McpAuthError,
  McpSessionExpiredError,
} from "../services/mcp/client.js";
import { isCliOwnedConfig, getCliOwnedState } from "../services/mcp/cliOwnedClients.js";
import { primeDiscoveryCacheFlag } from "../services/mcp/elicitationDialogs.js";
import { REAUTH_RECONNECT_SIGNAL } from "../services/mcp/connectionFlags.js";
import { isCommsRoledServer } from "../coordinator/coordinatorMcpServers.js";
import {
  isSdkMcpManifestsEnabled,
  isPersistenceTrusted,
  canServeManifests,
  canServeManifestsForRemoteCall,
  needsPromptHooks,
  isCalmOspreyGateOn,
  onVsCodeRefreshLogChange,
  isUiSurfaceName,
  shouldRejectUiControl,
  leavesBelowFloor,
  manifestsDisabledReason,
  canServeManifestsWithoutWriters,
  uiSurfaceCapabilities,
  uiHookedCapabilities,
} from "./sdkMcpManifests.js";
import {
  normalizeCaseForComparison_2,
  ensureScratchpadDir,
  pinResolvedWorkingDirPath,
  matchingRuleForInput,
} from "../utils/permissions/filesystem.js";
import { setupVscodeSdkMcp } from "../services/mcp/vscodeSdkMcp.js";
import { isRefusalFallbackActive } from "../services/api/safeguardMessages.js";
import { isRefusalFallbackEnabled } from "../services/api/refusalFallback.js";
import { getNextAnnouncementJson } from "../services/startupAnnouncements.js";
import { handleAutoDefaultNudgeEventFromHost, shouldShowAutoDefaultNudge } from "./print/autoDefaultNudge.js";
import { getOwn } from "../utils/objectSafety.js";
import { memorySkillCommands } from "../services/memorySync/memorySkills.js";
import {
  createPluginFlagTracker,
  reconcileMarketplacesOnReload,
  PLUGIN_INSTALL_WAIT_MS,
  logLateInstallPass,
  logMarketplaceReconcile,
  hasCloudPluginsKey,
  splitCloudPluginsPatch,
  logMixedCloudPluginsPatch,
} from "./print/reloadPlugins.js";
import {
  connectedBridgePolicyRefusal,
  getRemoteControlPolicyLockReason,
  isRemoteControlHardDisabled,
  isRemoteControlDeploymentAvailable,
} from "../bridge/bridgeEntitlement.js";
import {
  resolveEffortLevel,
  isUltracodeActive,
  toBoundedLabel,
  modelSupportsEffort,
  resolveEffortValue,
  getEffortEnvOverride,
  isUltracodeAvailable,
  ultrathinkRaisesEffort,
  parseEffortLevel,
  persistEffortSetting,
  getEffortLevelIfSupported,
} from "../utils/effort.js";
import { currentViewMode, subscribeFocusMode } from "../utils/focusMode.js";
import {
  bridgeAdvertisedCommands,
  getSlashCommandToolSkills,
  getCommands,
  toSlashCommands,
  clearCommandsCache,
  clearCommandMemoizationCaches,
  getSkillToolCommands,
} from "../commands.js";
import { buildBridgeContextSnapshot, mirrorTokenUsageToBridge } from "./print/bridgeTokenUsageMirror.js";
import { hasLspEverConnected } from "../services/lsp/manager.js";
import { isDeclared } from "../tools/WaitForMcpServersTool/WaitForMcpServersTool.js";
import { getPolicyCacheRevision, onPolicyVerdictChanged } from "../services/policyLimits/policyState.js";
import { isCachedGitHubRepo } from "../utils/detectRepository.js";
import { isLovelyUmbrellaOn } from "../utils/settings/settingsSourceTrust.js";
import { withoutStaticMcpShadows, mergeAndFilterTools, stripSoleNonDeniableTool } from "../utils/toolPool.js";
import { createAccountMemoryToolGate } from "../services/accountMemory/accountMemoryServer.js";
import { findAgentExcludingWebFetch } from "../tools/WebFetchTool/harnessNotes.js";
import {
  resolveAgentTools,
  withWebFetchToolForAgent,
  resolveAgentToolNames,
} from "../tools/AgentTool/agentToolUtils.js";
import { createSyntheticOutputTool } from "../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { checkSchemaSatisfiable } from "../tools/SyntheticOutputTool/schemaCheck.js";
import { setProjectsThreadStateSource, shouldStampThreadState } from "../utils/projectsThreadState.js";
import { latestHumanRelayAt, threadAskMarkerFor } from "../services/projects/threadTranscript.js";
import {
  stagedFilesWaiterByRoot,
  createStagedFilesWaiter,
  stageWaitTimeoutFor,
  classifyStageWriteError,
} from "../utils/ccrStageFiles.js";
import { isToolResultForToolUse, queuePriorityOrUndefined } from "../utils/messages/messagePredicates.js";
import { makeStoreConfirmTimer } from "../utils/queryProfiler.js";
import { serverCapabilityCache } from "../services/mcp/fileReference/fileReferencePolicy.js";
import { collectContextData } from "../commands/context/context-noninteractive.js";
import {
  waitForAgentTranscriptFlush,
  normalizeAgentMessagesForApi,
} from "../tasks/LocalAgentTask/transcriptFlush.js";
import {
  createRemotePromptBox,
  createRemoteSelectionReader,
  withCurrentRequester,
  BACKDROP_CLEAR_DELAY_MS,
  causeOnlyResult,
  selectionResult,
  setUiLogSink,
  listPlacedRows,
  subscribePlaced,
} from "../plugins/functionHooks/uiApi.js";
import {
  REMOTE_EDIT_QUEUE,
  pruneDetachedClients,
  describePanesForClient,
  REMOTE_AUTOCOMPLETE,
  handlePaneScrollRequest,
} from "./print/remoteComposer.js";
import { TOAST_DEFAULT_MS } from "../plugins/functionHooks/uiToast.js";
import { jsonStringify } from "../utils/slowOperations.js";
import {
  withKeyReplaced,
  resolveConnectorTwin,
  toScopedConfig_2,
  subscribeRows,
  waitForMcpServerStatus,
} from "./print/mcpStatusMessages.js";
import { explainPluginServer } from "../services/mcp/mcpConnectionRefusals.js";
import { invalidateUserContext } from "../context.js";
import { bindSurface, release, attachedSurfaces } from "../plugins/functionHooks/surfaceBinding.js";
import { registerTurnParamsHook } from "../plugins/functionHooks/modelApi.js";
import { registerPostSamplingHook, reportQueuedSubmissions } from "../utils/hooks/postSamplingHooks.js";
import {
  UiCopyResponseSchema,
  UiPromptReadResponseSchema,
  UiPromptFillResponseSchema,
  UiPromptPaintResponseSchema,
  UiPromptSuggestResponseSchema,
  UiReadSelectionResponseSchema,
  SDKUiAttachUiAttachMessageSchema,
  UiClientAnswerableRequestSchema,
  SDKUiDetachUiDetachMessageSchema,
  SDKUiRenderUiRenderMessageSchema,
  SDKUiPressUiPressMessageSchema,
  SDKUiInputUiInputMessageSchema,
  SDKUiPromptEditUiPromptEditMessageSchema,
  SDKUiPromptAutocompleteUiPromptAutocompleteMessageSchema,
  SDKUiSelectUiSelectMessageSchema,
  SDKUiPanesUiPanesMessageSchema,
  SDKUiPaneShowUiPaneShowMessageSchema,
  SDKUiPaneFocusUiPaneFocusMessageSchema,
  SDKUiCloseUiCloseMessageSchema,
  SDKUiScrollUiScrollMessageSchema,
  SDKUiFocusUiFocusMessageSchema,
  SDKUiClientModuleUiClientModuleMessageSchema,
  SDKUiClientPressUiClientPressMessageSchema,
  SDKUiMessageUiMessageMessageSchema,
  SDKMessageRatedMessageRatedMessageSchema,
} from "../entrypoints/sdk/uiControlSchemas.js";
import {
  startSessionHooks,
  raiseSessionDetach,
  detachAllClients_2,
  raiseViewerAbsence,
  detachAllClients,
  defaultScopeKey,
} from "../plugins/functionHooks/sessionEvents.js";
import { getPluginRegistry } from "../utils/plugins/pluginLoadState.js";
import {
  isTeammate,
  hasWorkingInProcessTeammates,
  waitForTeammatesToBecomeIdle,
  hasNonLeadTeammate,
  hasActiveInProcessTeammates,
} from "../utils/teammate.js";
import { saveSessionAgentName, pushBridgeSessionTitle } from "../utils/sessionTitle.js";
import {
  emitSessionTitleChanges,
  isKnownControlRequestSubtype,
  handleSendTaskMessage_2,
  reclaimSessionNameAtStart,
} from "./print/sessionControlRequests.js";
import { getLastCacheSafeParams, clearForkCacheSafeParams } from "../utils/forkedAgent.js";
import { contextAfterTurn, getToolPermissionContext } from "../utils/permissions/toolPermissionContext.js";
import { ResumedAgentCallRegistry } from "../tools/AgentTool/agentContainerResume.js";
import {
  waitForRemoteManagedSettingsFetchToSettle,
  waitForRemoteManagedSettingsToLoad,
} from "../services/remoteManagedSettings/loader.js";
import { subscribeHelperPassSettled } from "../utils/settings/policyHelper/helperRemote.js";
import { onLastLoadStatusChanged } from "../services/remoteManagedSettings/remoteSettingsState.js";
import { bareModePluginAllow, refreshActivePlugins } from "../utils/plugins/refresh.js";
import { installPluginsForHeadlessSerialized } from "../utils/plugins/headlessPluginInstall.js";
import { initialPluginRefreshState } from "../commands/plugin/PluginSettings.js";
import { getSessionIngressAuthToken, getSessionIngressAuthHeaders } from "../utils/sessionIngressAuth.js";
import { bridgeHostState } from "../bridge/bridgeHostState.js";
import { isToolSearchToolAvailable } from "../utils/toolSearch.js";
import { sessionStartHostRefusedSlot, subscribeBackdrop } from "../plugins/functionHooks/sessionApi.js";
import { hasBesideArrivingFiles } from "../bridge/attachmentFilesWait.js";
import { createIdleTimeoutManager } from "../utils/idleTimeout.js";
import { getNonInteractiveCommands, mergeClients as mergeClients_2 } from "../utils/commandPredicates.js";
import { loadAllPluginsCacheOnly, loadAllPluginsCacheOnly_2 } from "../utils/plugins/pluginLoader.js";
import { isConnectedOrCached } from "../skills/bundled/scheduleRemoteAgents.js";
import { waitForStoreState } from "../context/voice.js";
import { marketplaceSuffix, parsePluginIdentifier_2 } from "../utils/plugins/pluginIdentifier.js";
import { SYNCED, pluginIdForTelemetry } from "../utils/telemetry/pluginTelemetry.js";
import { CLAUDEAI_SERVER_PREFIX } from "../services/mcp/normalization.js";
import { parseIsoTimestamp } from "../utils/parseIsoTimestamp.js";
import {
  createUiStatusBuffer,
  describeOpenPanes,
  subscribeOpenPanes,
  dropClosedPanes,
  paneSignals,
  syncOpenPanes,
  handlePaneFocusRequest,
} from "./print/pluginUiPanes.js";
import { getHostState, isFirstPartyTelemetryBlocked } from "../utils/hostEnvironment.js";
import { ThrottledReread } from "./print/commandRefreshThrottle.js";
import { logPluginDirReload, addPluginDirAndRebuildSandbox } from "./print/pluginDirReload.js";
import { pendingReloadSlot } from "../plugins/functionHooks/pluginLifecycle.js";
import { installDevModsPlaceholderExpander } from "../services/plugins/devMods/devModsWatcher.js";
import {
  sharedSkillChangeDetector,
  reloadSkillsAfterDirectoryChange,
} from "../utils/skills/skillChangeDetector.js";
import { getManagedFilePath } from "../utils/settings/managedPath.js";
import { managedFolderCondition } from "../plugins/functionHooks/sites/promptContextSites.js";
import { managedSettingsAskState } from "./headlessCloud/attachServe.js";
import { isBundledSkillsDisabled } from "../skills/bundledSkillsGate.js";
import {
  didPolicyLimitsColdStartTimeOut,
  waitForPolicyLimitsToLoad,
} from "../services/policyLimits/PolicyLimitsClient.js";
import { render } from "../plugins/functionHooks/ui/renderBridge.js";
import { isDetachedToolCallsEnabled } from "../components/PromptInput/promptFlags.js";
import {
  foregroundCallRegistrySlots,
  detachedCallSlots,
  stopAndDropOutside,
  discardQueuedOutside,
} from "../services/tools/detachedToolCalls.js";
import { hasWaitingFor } from "../services/artifacts/presenceSocket.js";
import {
  LOGIN_REVOKE_TIMEOUT_MS,
  LOGIN_RESTORE_TIMEOUT_MS,
  PRINT_TURN_POLL_MS,
  LOGIN_SETTLE_TIMEOUT_MS,
  MCP_CALL_RESULT_LIMITS,
  LOGIN_BLOCKED_MESSAGES,
  LOGIN_BLOCKED_POLICY_UNVERIFIED_TEXT,
  LOGIN_BLOCKED_POLICY_RESTORE_FAILED_TEXT,
  LOGIN_BLOCKED_POLICY_MAY_STILL_VALID_TEXT,
  validateUpdateSettings,
  EFFORT_LEVEL_ERROR,
} from "./print/updateSettingsControl.js";
import { cancelPendingAsyncHooks } from "../utils/hooks/AsyncHookRegistry.js";
import { drainQueuedMessages } from "../skills/bundled/updateConfig.js";
import { settlePendingPrLinks, announcePrStarted } from "../tools/shared/gitOperationTracking.js";
import { hasRequestBeenSent } from "../utils/api.js";
import {
  messageTurnAttributionKey,
  turnAttributionKeyOf,
  inheritedAttributionKey,
} from "../utils/turnAttributionKey.js";
import { withWorkloadStorage } from "../utils/http.js";
import { withInteractionSpan, endInteractionSpan } from "../utils/telemetry/sessionTracing.js";
import { activityManager } from "../utils/activityManager.js";
import {
  settleOwedTitle,
  retractPendingTitleIfCancelled,
  retractPendingTitle,
  maybeTitleFromUserMessage,
} from "./print/sessionTitles.js";
import {
  maybeStartCcrRecap,
  resetRecapState,
  markRecapStartedForTurnEnd,
  clearRecapStartedForTurnEnd,
} from "../services/awaySummary.js";
import {
  forgetCodeliveredFollowups,
  cancelQueuedThreadMessage,
  parseArtifactFollowupAck,
  codeliverArtifactFollowup,
} from "./print/artifactEditorCodelivery.js";
import {
  BackgroundTaskWaiter,
  shouldShowBackgroundWaitStatus,
  logQueuedInterruptDecision,
} from "./print/backgroundWait.js";
import { resetPdfPagesThisTurn } from "../tools/FileReadTool/FileReadTool.js";
import {
  normalizeTaskNotificationOrigin,
  backgroundSessionMovedNotice,
} from "../utils/backgroundSessionResume.js";
import { resolveTurnTerminalReason } from "../bridge/replControlHandler.js";
import { emitBangCommandNotRun, handleRemoteBashCommand } from "./print/bangCommands.js";
import { WORKLOAD_CRON } from "../utils/workloadContext.js";
import {
  wrapScheduledTaskBatchRunner,
  wrapScheduledTaskRunner,
} from "../utils/plugins/functionHooks/pluginTimers.js";
import { wakeupSourceForKind } from "../utils/promptSource.js";
import {
  markLiveOnlyResponse,
  isDisplayOnlyHistoricalMessage,
  markSyntheticControlResponse,
} from "../bridge/controlRequests.js";
import { ReannounceRequester } from "../remote/tools/reannounceRequest.js";
import {
  registerRepoRoot,
  registerRepoRootErrorClass,
  REGISTER_REPO_ROOT_ERROR_TONES,
} from "../services/repoRoots/registerRepoRoot.js";
import { applyValidatedPermissionUpdate } from "../utils/permissions/PermissionUpdate.js";
import { clearMemoryFilesCache } from "../components/Message.js";
import { isAdditionalDirWithoutNestedMemory } from "../utils/attachments.js";
import { buildSideQuestionFallbackParams } from "../utils/queryContext.js";
import { query } from "../query.js";
import { HeldInputReader } from "./print/inputReader.js";
import { isTerminalTitleEnabled } from "../utils/terminalTitle.js";
import { setJitPolicyAfterStartup } from "../utils/jitPolicy.js";
import { scheduleResumeCacheWarm } from "./print/resumeCacheWarm.js";
import { killAutoReactSubscriptions } from "../services/artifacts/frameLive.js";
import {
  drainQueuedTaskNotifications,
  artifactWatchStopNotice,
  requeueStopNotifications,
} from "../tasks/MonitorWsTask/MonitorWsTask.js";
import { limitConcurrency } from "../utils/concurrencyLimit.js";
import {
  repoRootError,
  repoRootErrorClass,
  REPO_ROOT_ERROR_TONES,
} from "../services/repoRoots/repoRootErrors.js";
import { syncReadSkills, sessionWriterSpelling } from "../utils/syncedSkillsAnchor.js";
import {
  isAsWrittenSearchEnabled,
  readFileAsWrittenUnservedReason,
  refreshAuthDependentSettings,
} from "./print/authAndPolicyRefresh.js";
import { setHostSessionsBearerSource } from "../utils/hostSessionsBearer.js";
import { endStartupMarkReporting, sanitizeMarkName } from "../utils/startupMarks.js";
import { isPrototypeKey } from "../schemas/hookEntryValidation.js";
import { isPlainObject as isPlainObject_2 } from "../utils/isPlainObject.js";
import { sanitizeSessionTitle, getFirstLine, truncateToLength } from "../utils/stringUtils.js";
import { adoptSuppliedSessionTitle } from "../utils/concurrentSessions.js";
import { parseHostManifests, isToolListChangedNotification } from "../services/mcp/toolsListChanged.js";
import { MCP_PROTOCOL_LATEST } from "../services/mcp/mcpCallConstants.js";
import { isPromptSuggestionSettingEnabled } from "../services/PromptSuggestion/promptSuggestion.js";
import {
  parsePermissionMode,
  UNRECOGNIZED_PERMISSION_MODE_ERROR,
  CAN_USE_TOOL_PROMPT_TOOL_GONE_DENY_REASON,
  CAN_USE_TOOL_PROMPT_TOOL_IS_CLOUD_BROWSER_DENY_REASON,
  CAN_USE_TOOL_ABORTED_DENY_REASON,
  CAN_USE_TOOL_INVALID_RESULT_DENY_REASON,
  PROMPT_TOOL_ALLOW_FLAGGED_MCP_DENY_REASON,
  NO_PROMPT_SURFACE_REASON,
} from "../types/permissions.js";
import {
  getGlobalConfig,
  readFreshOauthAccountFromDisk,
  getExplicitRemoteControlAtStartup,
} from "../utils/config.js";
import {
  findRewindPoint,
  rewindRerunMode,
  dropOwnRerunOnRewind,
  askRewindLimitQuestion,
  isTurnAbortedForRewind,
  reportRewindRefusal,
  stopTeammatesAfterCut,
  queueStamp,
  persistRewindCut,
  rewindTargetMoved,
  isRewindCutPersistable,
  waitForRewindQuiet,
  stopMcpTasksAfterCut,
  withdrawDeferredAfterCut,
  applyRewindCut,
  rewindReadNotifications,
} from "./print/rewindConversation.js";
import {
  getPermissionModeCycle,
  hasPermissionsToUseTool,
  consultPermissionRequestHooksForUnpromptableAsk,
} from "../utils/permissions/permissions.js";
import { getPlatform } from "../utils/platform.js";
import {
  shouldOfferLinuxSandboxHint,
  toPluginInitInfo,
  persistsWithoutRedaction,
  getFooterIndicator,
  MCP_CALL_RESULT_NOT_FOR_MODEL_V1,
  START_SHELL_TASK_V1,
} from "../utils/messages/systemInit.js";
import { UNSUPPORTED_CONTROL_SUBTYPE_TEXT } from "../remote/wireFrameShape.js";
import { hasBackdropSurface } from "../plugins/functionHooks/sites/uiSites.js";
import { expandPath } from "../utils/path.js";
import { vetPathSpellingsOrChain, pathVettingReason } from "../utils/permissions/pathVetting.js";
import { isPathAllowed } from "../utils/permissions/pathValidation.js";
import { isNonEmptyValue } from "./cloudSession/hostedSessionRestrictions.js";
import { isCloudPluginForwardingFlagOn } from "../services/analytics/violinGates.js";
import { invalidateCommandNames } from "../utils/settings/commandSyncNames.js";
import { computePluginReloadImpact, logReloadPluginsImpact } from "../utils/plugins/reloadImpact.js";
import { retryUnloadedModules } from "../plugins/functionHooks/hooksModuleLoader.js";
import { IMAGE_LIMITS } from "../utils/mediaLimits.js";
import { stripAnthropicMeta } from "../services/mcp/anthropicMeta.js";
import { McpToolResultNotReadError } from "../services/mcp/mcpResultErrors.js";
import { classifyMcpAuthTarget } from "../services/mcp/auth.js";
import {
  claudeAiConnectorAuthUrl,
  requiresConnectorGrant_2,
  promptToolAllowDenyReason,
} from "../services/mcp/claudeai.js";
import { shouldSkipCustomRedirect } from "../services/mcp/customRedirectSkip.js";
import { sanitizeErrorDetail, normalizeMcpServerName } from "../services/api/deferredToolsState.js";
import { redactMcpErrorDetail } from "../services/mcp/mcpServerOrigin.js";
import { isDcrRejection } from "../services/mcp/sdkAuth.js";
import { McpOauthRefusedError } from "../services/mcp/redirectUriOnlyRefusal.js";
import { providerBlockedMessage } from "../utils/model/allowedProviders.js";
import { OAuthService } from "../services/oauth/index.js";
import { OAuthCallbackError } from "../services/oauth/oauthErrors.js";
import { errorTelemetryFields as errorTelemetryFields_2 } from "../utils/accessibility/screenReader.js";
import { getSSLErrorHint } from "../services/api/errorUtils.js";
import {
  revokeRefusedSignInToken,
  saveLoginOrWarn,
  rollbackRefusedSignIn,
  logRollbackFailure,
  SIGN_IN_AGAIN_TO_CLEAR_MESSAGE,
} from "../services/oauth/refusedSignIn.js";
import { resetSliceIfUnchanged } from "../state/artifactReadState.js";
import { getAPIProvider } from "../utils/model/providers.js";
import { signOutFailureMessage } from "../commands/logout/logout.js";
import { flushDiscoveryCache } from "../services/mcp/discoveryCache.js";
import { AUTH_CLEARED_REASON, AUTH_CLEAR_FAILED_REASON } from "../services/mcp/redactMcpErrors.js";
import { PLUGIN_FORWARDING_DISABLED } from "../utils/plugins/cloudPluginForwarding.js";
import { shouldNudgeFastModeChange } from "../commands/fast/fast.js";
import { resolveAdvisorModel } from "../utils/advisor.js";
import {
  isPolicyLimitsCacheLoaded,
  isPolicyAllowed,
  policyDenyKind,
} from "../services/policyLimits/policyEvidence.js";
import { hookPolicySummary } from "../utils/hooks/hookSourceDisplay.js";
import { isSettingSourceEnabled } from "../utils/settings/constants.js";
import {
  submitHeadlessFeedback,
  feedbackUnavailableReason,
  orgFeedbackRefusalMessage,
  headlessFeedbackMode,
} from "../services/feedback/submitFeedback.js";
import { postFeedbackSubmission } from "../services/feedback/feedbackBundle.js";
import { runSideQuestionWithProgress } from "../utils/sideQuestionProgress.js";
import { confirmUltrareviewOverage } from "../state/appStateSetters.js";
import { buildUltrareviewMessages } from "../commands/review/ultrareviewCommand.js";
import { isTeleportedSession } from "../bridge/createSession.js";
import { REMOTE_CONTROL_SDK } from "../bridge/sessionOrigins.js";
import { forwardRateLimitToBridge, logBridgeRateLimitForward } from "./print/rateLimitForwarding.js";
import {
  extractInboundMetadata,
  isHearthOrigin,
  classifyInboundOrigin,
  refineInboundOrigin,
  humanHintOrPlatform,
  hasTeammateMessageEnvelope,
  adjustInboundPriority,
  isChatPlatformHuman,
  isDefinedHumanClientPlatform,
  isKnownHumanOrigin,
  downgradePriorityIfBusy,
  triggerFireReasonOf,
  isPeerOrigin,
  isHearthHuman,
  emailSenderModeOf,
} from "../bridge/inboundMessageOrigin.js";
import { recordRemoteSurfaceSeen } from "../services/tips/remoteControlNudges.js";
import { isPeerOrSlackPing, isProjectsRelay, isHumanOrAutoContinuation } from "../utils/messageProvenance.js";
import {
  extractInboundAttachments,
  resolveAndPrepend,
  readAheadOfFiles,
} from "../bridge/inboundAttachments.js";
import { escapePluginTags } from "../utils/messages/pluginTags.js";
import { buildExternalEventRecord } from "../utils/externalEventRecords.js";
import { dispatchSessionReceiveHooks } from "../plugins/functionHooks/sessionReceive.js";
import { originFromBridgeMetadata } from "../utils/messageOrigin.js";
import { stripPeerMessageBody, peerMessageInfo } from "../utils/peerMessageHeaders.js";
import { isUltrathinkPrompt } from "../utils/messages/ultrathinkPaste.js";
import { backgroundTaskByToolUseId, backgroundAll } from "../tasks/LocalShellTask/LocalShellTask.js";
import { setInboundAvailabilityPublisher } from "../utils/crossSessionInbound/inboundMode.js";
import { persistBridgeArtifactFrames } from "../utils/sessionTagRefresh.js";
import { installRemoteEgressSuppressor, transcriptFileSize } from "./print/turnStreaming.js";
import { ENUM_PROMPT } from "../components/nudges/nudgeIds.js";
import { sdkMessagesToInternal } from "../utils/messages/mappers.js";
import { shouldAllowManagedPermissionRulesOnly } from "../utils/permissions/permissionsLoader.js";
import { emailSenderTurnDetected, checkEmailSenderTurn } from "../utils/permissions/emailSenderFrame.js";
import { isSessionReceiveHooked } from "../plugins/functionHooks/sessionHooks.js";
import { isProjectsHumanOriginEnabled } from "../utils/crossSessionMessagingGate.js";
import { HEARTH_AGENT } from "../services/projectsRelay/relayConfig.js";
import {
  isLocalDesktopPrompt,
  takeSeededSummon,
  consumeSeededSummon,
} from "../services/artifacts/comments/autoreactState.js";
import {
  isMergeMessage,
  isRemoteNonInteractiveNonCcsSession,
  isViewOwningSdkMessage,
} from "../utils/widgetContext.js";
import { extractCcrTraceContext } from "../utils/telemetry/ccrTraceContext.js";
import { hasModuleHookingSite } from "../plugins/hooksModules/loadedModuleFilters.js";
import { pluginsMatchingEvent } from "../plugins/functionHooks/hookDispatch.js";
import { isTurnDisallowedToolName } from "./printUsageSummary.js";
import { isHumanOrigin } from "../utils/turnOrigin.js";
import {
  noPromptSurfaceDenialIfPersonOnly,
  buildNoApprovalSurfaceDenial,
  noPromptSurfaceDenialIfUnsettled,
} from "../services/pushNotifications/permissionPush.js";
import { isRemoteBrowserToolUnderModeFloor } from "../utils/permissions/remoteBrowser.js";
import { isHostWordedAsk, forwardHostWordedAsk } from "../services/tools/hostWordedAsks.js";
import { createCombinedAbortSignal } from "../utils/combinedAbortSignal.js";
import { executePermissionRequestHooksForSDK, StructuredIO } from "./structuredIO.js";
import {
  permissionPromptResultSchemaRefusing,
  PERMISSION_PROMPT_RESULT_FORMAT_HINT,
  permissionPromptToolResultToPermissionDecision,
} from "../utils/permissions/PermissionPromptToolResultSchema.js";
import { safeParseJSON } from "../utils/json.js";
import { isVsCodeOrDesktop, isVsCodeTopSession } from "../utils/sessionShape.js";
import { hookSourcesSummary } from "../utils/hooks/hookSources.js";
import { setPathTable } from "../utils/pathTable.js";
import { DEFAULT_2, getAllOutputStylesCached } from "../constants/outputStyles.js";
import { managedOutputStylesDir } from "../outputStyles/loadOutputStylesDir.js";
import { vscodeSurveyConfig, feedbackSurveyCapabilities } from "./print/hostOtelEvents.js";
import {
  fileHistoryEnabled,
  fileHistoryCanRestore,
  fileHistoryGetDiffStats,
  fileHistoryRewind,
} from "../utils/fileHistory.js";
import {
  gateChannelServer,
  ChannelMessageNotificationSchema,
  queuedChannelPush,
  findChannelEntry,
} from "../services/mcp/channelNotification.js";
import { isChannelsEnabled } from "../services/mcp/channelAllowlist.js";
import { safeErrorName } from "./remoteIO/fileStoreVerdicts.js";
import { stripAnsi } from "../utils/stripAnsi.js";
import { withTaskSuffix } from "../tasks/endedByModel.js";
import { lastResumeRecordRegistry } from "../utils/lastResumeRecord.js";
import { readFlagWithOverride } from "../services/analytics/flagOverrides.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { reportStartupModelNotice } from "./startup/prepareSession.js";
import { precomputeResumeHooks } from "../services/compact/precomputedCompact.js";
import { resolveResumeSessionAdoption } from "../utils/background/adopt.js";
import { cloudSessionsUnavailableReason } from "../services/cloudSessions/cloudSessionsPolicy.js";
import { logOrgPolicyDeniedAsync } from "../services/policyLimits/orgPolicyDeniedEvent.js";
import { parseSessionIdentifier } from "../utils/sessionUrl.js";
import { isTranscriptLoadError, win32EbadfHelp } from "../utils/transcript/transcriptFiles.js";
import { replayAsyncIterable } from "../utils/generators.js";
import { isReviewSession } from "../utils/sessionAccessToken.js";
import { rereadSessionIngressToken } from "./transports/sessionIngressToken.js";
import { uniqByExport } from "../../vendor/lodash-es/uniqBy.js";
import { SIDE_QUESTION_MAX_AGENTS } from "../components/PromptInput/AgentsPill.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-0a7cfwp8.js:628-800 placement (2.1.88 match: finalContextTokensFromLastResponse, 0.779)
function finalContextTokensFromLastResponse(messages) {
  if (messages == null || typeof messages.input_tokens !== "number") return;
  if (typeof messages.output_tokens === "number") return messages;
  return messages.output_tokens == null
    ? {
        ...messages,
        output_tokens: 0,
      }
    : undefined;
}
//@ chunk-0a7cfwp8.js:800-861 placement
/**
 * 判断中断请求是否为立即中断：send_now 为真且未 cancel_queued。
 */
function isImmediateInterruptRequest(request) {
  return request.send_now === true && request.cancel_queued !== true;
}
//@ chunk-0a7cfwp8.js:861-942 placement
/**
 * 判断 request_id 是否为 late-bind-interrupt- 前缀（延迟绑定的中断请求）。
 */
function isLateBindInterruptRequestId(requestId) {
  return typeof requestId === "string" && requestId.startsWith("late-bind-interrupt-");
}
//@ chunk-0a7cfwp8.js:942-999 layout
function isInterruptOwnedInline(requestId, request) {
  return isLateBindInterruptRequestId(requestId) || request.worker_epoch !== undefined;
}
//@ chunk-0a7cfwp8.js:999-1007 placement
var MAX_CANCEL_USER_MESSAGE_UUIDS = 8;
//@ chunk-0a7cfwp8.js:1007-1269 placement
/**
 * 解析"取消排队消息"控制请求的目标：给出 1 到上限个合法的用户消息 uuid 时，返回按 uuid（不区分大小写）匹配的判定函数。
 */
function parseCancelQueuedTarget(request) {
  let forUserMessageUuids = request.for_user_message_uuids;
  if (
    request.cancel_queued === true ||
    !Array.isArray(forUserMessageUuids) ||
    forUserMessageUuids.length === 0 ||
    forUserMessageUuids.length > MAX_CANCEL_USER_MESSAGE_UUIDS
  )
    return;
  let uuids = new Set();
  for (let forUserMessageUuid of forUserMessageUuids) {
    let normalized = normalizeUuidOrNull(forUserMessageUuid);
    if (normalized === null) return;
    uuids.add(normalized.toLowerCase());
  }
  return {
    names: (rows) => rows.some((rowUuid) => uuids.has(rowUuid.toLowerCase())),
  };
}
//@ chunk-0a7cfwp8.js:1269-1326 layout
function cancelTargetForUuid(uuid) {
  return parseCancelQueuedTarget({
    for_user_message_uuids: [uuid],
  });
}
//@ chunk-0a7cfwp8.js:1326-1428 placement
/**
 * 构造成功的 control_response 消息（request_id 与响应体）。
 */
function controlSuccessResponse(requestId, response) {
  return {
    type: "control_response",
    response: {
      subtype: "success",
      request_id: requestId,
      response,
    },
  };
}
//@ chunk-0a7cfwp8.js:1428-1584 placement
/**
 * 构造错误的 control_response 消息（错误文本，可选错误码与模型）。
 */
function controlErrorResponse(requestId, error, errorCode, model) {
  return {
    type: "control_response",
    response: {
      subtype: "error",
      request_id: requestId,
      error,
      ...(errorCode !== undefined && {
        error_code: errorCode,
      }),
      ...(model !== undefined && {
        model,
      }),
    },
  };
}
//@ chunk-0a7cfwp8.js:1584-1861 fingerprint (2.1.88 match: emitLoadError, 0.898)
/**
 * 构造加载失败时的 result 消息（subtype error_during_execution）。
 */
function emitLoadError(sessionId, errors, userMessageUuid) {
  return {
    type: "result",
    subtype: "error_during_execution",
    duration_ms: 0,
    duration_api_ms: 0,
    is_error: true,
    num_turns: 0,
    stop_reason: null,
    session_id: sessionId,
    total_cost_usd: 0,
    usage: EMPTY_USAGE,
    modelUsage: {},
    permission_denials: [],
    uuid: randomUUID(),
    errors,
    ...(userMessageUuid !== undefined && {
      user_message_uuid: userMessageUuid,
    }),
  };
}
//@ chunk-5xgkngpb.js:1895442-1895636 placement (2.1.88 match: isSystemLocalCommandMessage, 1)
/**
 * 为每条 assistant 生成“用户轮序号:message.id”键，其他消息为 undefined。
 */
function assistantTurnKeys(message) {
  let turnIndex = 0;
  return message.map((message) => {
    if (message.type === "assistant") return `${turnIndex}:${String(message.message.id)}`;
    if (
      (message.type === "user" && !hasToolResultBlock_2(message)) ||
      (message.type === "system" && message.subtype === "local_command")
    )
      turnIndex += 1;
    return;
  });
}
//@ chunk-5xgkngpb.js:1906475-1906557 fingerprint (2.1.88 match: removeInterruptedMessage, 1)
/**
 * 从消息数组里删除被中断的消息及其后一条。
 */
function removeInterruptedMessage(messages, interruptedUserMessage) {
  let idx = messages.findIndex((m) => m.uuid === interruptedUserMessage.uuid);
  if (idx !== -1) messages.splice(idx, 2);
}
//@ chunk-5xgkngpb.js:1906557-1906855 layout
/**
 * 把被中断的提示重新放回消息队列（interrupted_prompt）。
 */
function restoreInterruptedPrompt(messages, interruption, pendingRows) {
  if (interruption?.kind !== "interrupted_prompt") return false;
  let { message, tail } = interruption;
  let index = messages.findIndex((row) => row.uuid === message.uuid);
  if (index === -1) return false;
  let existingUuids = new Set(messages.map((row) => row.uuid));
  let missingRows = [];
  for (let row of pendingRows)
    if (!existingUuids.has(row.uuid)) {
      existingUuids.add(row.uuid);
      missingRows.push(row);
    }
  let replaceMarker = tail !== undefined && isPlainInterruptMarker(message);
  messages.splice(replaceMarker ? index : index + 1, 0, ...missingRows);
  return true;
}
//@ chunk-5xgkngpb.js:1906855-1907834 placement
/**
 * 续写时删除哨兵后的 "(no content)" 占位 assistant，并在只剩系统消息时去掉 "Continue from where you left off." 提示（tengu_silly_waterfall 等开关）。
 */
function dropRedundantResumeMessages(messages, interruption, onRemoved) {
  if (!interruption || interruption.kind === "none") return;
  let index = messages.findIndex((row) => row.uuid === interruption.message.uuid);
  let sentinelIndex =
    interruption.loaderSentinelUuid !== undefined
      ? messages.findIndex((row) => row.uuid === interruption.loaderSentinelUuid)
      : index !== -1
        ? index + 1
        : -1;
  let sentinelRow = sentinelIndex !== -1 ? messages[sentinelIndex] : undefined;
  if (
    sentinelRow?.type === "assistant" &&
    Array.isArray(sentinelRow.message.content) &&
    sentinelRow.message.content.length === 1 &&
    sentinelRow.message.content[0]?.type === "text" &&
    sentinelRow.message.content[0].text === NO_RESPONSE_REQUESTED
  ) {
    messages.splice(sentinelIndex, 1);
    onRemoved(sentinelIndex);
  }
  let sliced = messages.slice(index + 1);
  let row = index !== -1 ? messages[index] : undefined;
  if (row?.type !== "user" || !isLegacyInterruptMarker(row)) return;
  let precededByToolResult =
    isPrecededByToolResult(messages, index) || getFeatureValue_CACHED_MAY_BE_STALE(TENGU_GOOFY_HARE, false);
  if (!precededByToolResult && !getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SQUISHY_ULLMAN, false)) return;
  if (
    (sliced.every((row) => row.type === "system") ||
      (interruption.tail !== undefined &&
        sliced.every(
          (row) =>
            row.type === "system" ||
            (row.type === "progress" &&
              row.data.type === "hook_progress" &&
              row.data.hookEvent === "SessionStart") ||
            (row.type === "attachment" &&
              row.attachment.type === "hook_success" &&
              row.attachment.hookEvent === "SessionStart" &&
              row.attachment.content === "" &&
              row.attachment.heldContent === undefined),
        ) &&
        getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WONDROUS_HAVEN, false))) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_silly_waterfall", false)
  )
    if (precededByToolResult) {
      messages.splice(index, 1);
      onRemoved(index);
    } else {
      messages[index] = {
        ...row,
        isVirtual: true,
      };
      logFeatureOk("ccr_resume_prompt_unsent");
    }
}
//@ chunk-5xgkngpb.js:1907834-1907947 placement
/**
 * 位置之前最近的 user/assistant 是工具结果消息。
 */
function isPrecededByToolResult(messages, index) {
  let last = messages.findLast(
    (row, rowIndex) => rowIndex < index && (row.type === "user" || row.type === "assistant"),
  );
  return last !== undefined && isToolUseResultMessage(last);
}
//@ chunk-5xgkngpb.js:2578174-2578225 fingerprint (2.1.88 match: toScopedConfig, 1)
function toScopedConfig(config) {
  return config.scope === "dynamic" && !isPluginServerConfig(config);
}
//@ chunk-5xgkngpb.js:3345304-3345472 placement
/**
 * 从元数据读取禁用工具列表（最多 64 项，全部无效时返回 undefined）。
 */
function readDisallowedToolsMetadata(metadata) {
  let disallowedTools = disallowedToolsSchema().safeParse(metadata).data?.disallowed_tools;
  let sliced = disallowedTools
    ?.flatMap((disallowedTool) => mcpToolNameSchema().safeParse(disallowedTool).data ?? [])
    .slice(0, 64);
  return sliced?.length === 0 && disallowedTools?.length !== 0 ? undefined : sliced;
}
//@ chunk-5xgkngpb.js:3345472-3345579 affinity
function hasDeclaredDisallowedTools(message) {
  let disallowedTools = "disallowed_tools" in message ? (message.disallowed_tools ?? []) : [];
  return !Array.isArray(disallowedTools) || disallowedTools.length > 0;
}
//@ chunk-vxsfen55.js:10157-10662 sole-consumer
function collapsePluginServerTwins(servers, pluginCandidates, candidateServers, skipNames = new Set()) {
  let hostByConfig = new Map();
  for (let [key, value] of Object.entries(candidateServers)) {
    let fingerprint = serverSignature(value);
    if (fingerprint !== null && !hostByConfig.has(fingerprint)) hostByConfig.set(fingerprint, key);
  }
  let twins = [];
  for (let [key, value] of Object.entries(pluginCandidates)) {
    if (
      !isPluginServerConfig(value) ||
      !Object.hasOwn(servers, key) ||
      servers[key] !== value ||
      skipNames.has(key) ||
      isMcpServerDisabled(key) ||
      !isMcpServerAllowedByPolicy(key, value)
    )
      continue;
    let fingerprint = serverSignature(value);
    let duplicateOf = fingerprint === null ? undefined : hostByConfig.get(fingerprint);
    if (duplicateOf !== undefined)
      twins.push({
        name: key,
        duplicateOf,
      });
  }
  if (twins.length === 0)
    return {
      servers,
      twins,
    };
  let twinNames = new Set(twins.map((twin) => twin.name));
  let keptServers = Object.create(null);
  for (let [key, value] of Object.entries(servers)) if (!twinNames.has(key)) keptServers[key] = value;
  return {
    servers: keptServers,
    twins,
  };
}
//@ chunk-vxsfen55.js:10662-10934 sole-consumer
function stripInternalMcpConfigFields(configs) {
  return import_mapValues(configs, (serverConfig) =>
    omitAlias(serverConfig, [
      "scope",
      "pluginSource",
      "pluginPath",
      "relayed",
      "pluginEndpointTemplated",
      "pluginOfficialSourceVouched",
      "agentSource",
      "declaredIn",
      "configError",
      "configErrorReason",
      "expandedFromEnv",
      "configuredCommand",
      "redialToRelearnRegistration",
    ]),
  );
}
//@ chunk-vxsfen55.js:10934-10987 sole-consumer
var EMPTY_NAME_SET; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var EMPTY_NAME_MAP;
deferInit("chunk-vxsfen55.js:10934", () => {
  EMPTY_NAME_SET = new Set();
  EMPTY_NAME_MAP = Object.freeze(Object.create(null));
});
//@ chunk-vxsfen55.js:10987-11174 sole-consumer
function carryConfiguredCommand(desiredConfig, previousConfig) {
  return isStandardKeyActive() &&
    previousConfig?.configuredCommand !== undefined &&
    "command" in desiredConfig &&
    "command" in previousConfig &&
    desiredConfig.command === previousConfig.command &&
    import_sortedIndex_2(desiredConfig.args ?? [], previousConfig.args ?? [])
    ? {
        ...desiredConfig,
        configuredCommand: previousConfig.configuredCommand,
      }
    : desiredConfig;
}
//@ chunk-vxsfen55.js:11174-15088 fingerprint (2.1.88 match: handleMcpSetServers, 0.331)
/**
 * 处理 mcp_set_servers：按 SDK 给出的服务器集合增删改动态 MCP 服务器并重连。
 */
async function handleMcpSetServers(
  configs,
  sdkState,
  dynamicState,
  setAppState,
  onDynamicMcpChange,
  getAppState,
  caller,
  deferConnect = false,
  authoritative = false,
  options,
  hooks,
  dynamicStateHooks,
  hooks_2,
  dialOptions,
  operatorOwnedMcpConfigNames = EMPTY_NAME_SET,
) {
  if (authoritative && Object.hasOwn(configs, CLAUDE_CODE_REMOTE))
    await awaitMcpPolicyColdStart({
      hasDynamicMcpConfig: true,
    });
  let marked = !authoritative
    ? configs
    : import_mapValues(stripInternalMcpConfigFields(configs), (value, key) => {
        if (env.CLAUDE_CODE_REMOTE) getServerUrl(key, value);
        return markCcrInjectedConfig(
          key,
          copyOwnServerMarks(configs[key], carryConfiguredCommand(value, dynamicState.configs[key])),
          isLockedOutByOrgMcpPolicy,
        );
      });
  let builtinNames = new Set(
    (getAppState?.()?.mcp.clients ?? [])
      .filter(
        (client) =>
          isBuiltinInProcessMcpServer(client.name) && !Object.hasOwn(dynamicState.configs, client.name),
      )
      .map((client) => client.name),
  );
  let ignoredByBuiltin = Object.create(null);
  let kept = Object.create(null);
  for (let [key, value] of Object.entries(marked)) {
    let type = value.type;
    if (builtinNames.has(key)) ignoredByBuiltin[key] = BUILTIN_SERVER_IGNORED_REASON;
    else if (type === "sse-ide" || type === "ws-ide") ignoredByBuiltin[key] = IGNORED_IDE_TRANSPORT_TEXT;
    else kept[key] = value;
  }
  let operatorKeys = new Set([...operatorOwnedMcpConfigNames].map(getPrefixServerKey));
  let ignoredByOperator = Object.create(null);
  let afterOperator = Object.create(null);
  for (let [key, value] of Object.entries(kept))
    if (!Object.hasOwn(dynamicState.configs, key) && operatorKeys.has(getPrefixServerKey(key)))
      ignoredByOperator[key] = OPERATOR_SUPPLIED_IGNORED_TEXT;
    else afterOperator[key] = value;
  if (Object.values(afterOperator).some((config) => config.type !== "sdk"))
    await awaitMcpPolicyColdStart({
      hasDynamicMcpConfig: true,
    });
  let { allowed: allowedServers, blocked } = filterMcpServersByPolicy(afterOperator);
  let errors = Object.create(null);
  for (let serverName of blocked) errors[serverName] = IGNORED_BY_ENTERPRISE_POLICY_TEXT;
  let nonPluginCaller =
    caller === "plugin_install_diff" ||
    caller === "plugins_sync" ||
    caller === "reload_plugins" ||
    caller === "plugin_copy_recheck" ||
    caller === "set_cwd" ||
    caller === "claim_session" ||
    caller === "tool_register" ||
    caller === "plugin_connect";
  let sideloadAllowed = allowedServers;
  let droppedNames = new Set();
  let sideloadIgnoreText = nonPluginCaller
    ? undefined
    : isHermeticRemoteSession()
      ? IGNORED_HERMETIC_MODE_TEXT
      : env.CLAUDE_CODE_REMOTE && doesEnterpriseMcpConfigExist()
        ? IGNORED_EXCLUSIVE_MANAGED_CONFIG_TEXT
        : env.CLAUDE_CODE_REMOTE && areSideloadFlagsDisabledByPolicy()
          ? IGNORED_DISABLE_SIDELOAD_TEXT
          : startupCcrEnv.isBridgeCarrierChild
            ? IGNORED_REMOTE_CONTROL_TEXT
            : undefined;
  if (sideloadIgnoreText !== undefined) {
    let managedExclusive =
      !startupCcrEnv.isBridgeCarrierChild &&
      (sideloadIgnoreText === IGNORED_EXCLUSIVE_MANAGED_CONFIG_TEXT ||
        sideloadIgnoreText === IGNORED_DISABLE_SIDELOAD_TEXT);
    let alwaysKept = Object.create(null);
    for (let [key, value] of Object.entries(allowedServers))
      if (
        isAlwaysKeptServer(
          value,
          managedExclusive,
          managedExclusive && sideloadIgnoreText === IGNORED_DISABLE_SIDELOAD_TEXT,
        )
      )
        alwaysKept[key] = value;
    sideloadAllowed = alwaysKept;
    for (let key of Object.keys(allowedServers))
      if (!Object.hasOwn(sideloadAllowed, key)) {
        droppedNames.add(key);
        errors[key] = sideloadIgnoreText;
      }
  }
  if (requireVtyyqz9qChunk !== null) {
    let { kept, dropped, error } = requireVtyyqz9qChunk.withoutWithheldCcrArtifactsEntry(sideloadAllowed);
    sideloadAllowed = kept;
    for (let name of dropped) errors[name] = error;
  }
  let sdkEntries = Object.create(null);
  let otherEntries = Object.create(null);
  for (let [key, value] of Object.entries(sideloadAllowed))
    if (value.type === "sdk") sdkEntries[key] = value;
    else otherEntries[key] = value;
  let currentSdkNames = new Set(Object.keys(sdkState.configs));
  let newSdkNames = new Set(Object.keys(sdkEntries));
  let addedNames = [];
  let removedNames = [];
  let updatedNames = [];
  let configsSnapshot = Object.freeze(Object.assign(Object.create(null), sdkState.configs));
  let merged = Object.assign(Object.create(null), configsSnapshot);
  let clients = [...sdkState.clients];
  let newSdkClients = [...sdkState.tools];
  let newSdkTools = [...sdkState.commands];
  let buildSdkConfigs = () => EMPTY_NAME_MAP;
  if (authoritative) {
    let payloadDropsSdk = env.CLAUDE_CODE_REMOTE && newSdkNames.size === 0;
    if (payloadDropsSdk && currentSdkNames.size > 0)
      logForDebugging(
        `mcp_set_servers: payload names no SDK server; keeping ${currentSdkNames.size} registered SDK server(s)`,
      );
    buildSdkConfigs = payloadDropsSdk
      ? () => sdkState.configs
      : () => {
          let configs = sdkState.configs;
          let merged_2 = Object.assign(Object.create(null), omitKeys(configs, removedNames));
          for (let name of addedNames) {
            let config = merged[name];
            if (config !== undefined && !Object.hasOwn(configs, name)) merged_2[name] = config;
          }
          for (let name of updatedNames) {
            let config = merged[name];
            if (
              config !== undefined &&
              Object.hasOwn(configs, name) &&
              configs[name] === configsSnapshot[name]
            )
              merged_2[name] = config;
          }
          return merged_2;
        };
    for (let name of payloadDropsSdk ? [] : currentSdkNames)
      if (!newSdkNames.has(name)) {
        let client = clients.find((client) => client.name === name);
        await Promise.all([
          client?.type === "connected" ? client.cleanup() : undefined,
          hooks_2?.closeReplacedSdkClients?.(name),
        ]);
        clients = clients.filter((client) => client.name !== name);
        let mcpPrefix = getMcpPrefix(name);
        newSdkClients = newSdkClients.filter(
          (newSdkClient) => !isToolFromMcpServer(newSdkClient, name, mcpPrefix),
        );
        newSdkTools = newSdkTools.filter((newSdkTool) => !commandBelongsToServer(newSdkTool, name));
        delete merged[name];
        removedNames.push(name);
      }
    for (let [key, value] of Object.entries(sdkEntries)) {
      let { tools, connectorId } = parseMcpServerSettings(value).settings;
      let issues = inspectToolsList(value);
      if (issues)
        logForDebugging(`mcp_set_servers: SDK MCP server '${key}': ${describeToolsListIssues(issues)}`);
      if (!currentSdkNames.has(key)) {
        let { tools: tools_2, connectorId: connectorId_2, ...rest } = value;
        let next = {
          ...rest,
          ...(tools !== undefined && {
            tools,
          }),
          ...(connectorId !== undefined && {
            connectorId,
          }),
        };
        merged[key] = next;
        let pendingClient = {
          type: "pending",
          name: key,
          config: {
            ...next,
            scope: "dynamic",
          },
        };
        clients = [...clients, pendingClient];
        addedNames.push(key);
        continue;
      }
      let existing = merged[key];
      if (existing && !sameToolPolicies(existing.tools, tools)) {
        let { tools: tools_2, ...withoutTools } = existing;
        merged[key] =
          tools === undefined
            ? withoutTools
            : {
                ...withoutTools,
                tools,
              };
        updatedNames.push(key);
      }
    }
  }
  let reconciled = await reconcileMcpServersImpl(
    otherEntries,
    dynamicState,
    setAppState,
    onDynamicMcpChange,
    getAppState,
    caller,
    deferConnect,
    authoritative,
    new Set(
      Object.keys(configs).filter(
        (key) => !droppedNames.has(key) || !isPluginServerConfig(dynamicState.configs[key]),
      ),
    ),
    options,
    hooks,
    dynamicStateHooks,
    hooks_2?.wantsDial,
    hooks_2?.signal,
    dialOptions,
    hooks_2?.getOwnedConfigs,
    hooks_2?.operatorToolPolicyConfigs,
    buildSdkConfigs,
  );
  let formatNames = (names) => `[${names.map(sanitizeTelemetryString).join(", ")}]`;
  logForDebugging(
    `[MCP] ${caller ?? "unknown"} applied: ${Object.keys(configs).length} servers requested; added=${formatNames([...addedNames, ...reconciled.response.added])} removed=${formatNames([...removedNames, ...reconciled.response.removed])} ignored (operator-owned)=${formatNames(Object.keys(ignoredByOperator))} refused=${Object.keys(ignoredByBuiltin).length + Object.keys(errors).length}`,
  );
  return {
    response: {
      added: [...addedNames, ...reconciled.response.added],
      removed: [...removedNames, ...reconciled.response.removed],
      errors: {
        ...ignoredByBuiltin,
        ...ignoredByOperator,
        ...errors,
        ...reconciled.response.errors,
      },
    },
    newSdkState: {
      configs: merged,
      clients,
      tools: newSdkClients,
      commands: newSdkTools,
    },
    newDynamicState: reconciled.newState,
    sdkServersAdded: addedNames,
    sdkServersRemoved: removedNames,
    sdkServersUpdated: updatedNames,
    sdkConfigsAtSnapshot: configsSnapshot,
    sdkServersChanged: addedNames.length > 0 || removedNames.length > 0,
    deferredSettle: reconciled.deferredSettle,
  };
}
//@ chunk-vxsfen55.js:15088-16105 layout
/**
 * 把 SDK 动态 MCP 服务器集合应用到状态（是否权威、是否延迟连接）。
 */
async function applyDynamicMcpServers(
  context,
  { payload, desired },
  { authoritative, caller, deferConnect, dialOptions },
) {
  let { stores } = context;
  let { getAppState, setAppState, getDynamicMcpState, setDynamicMcpState } = stores;
  let dynamicState = {
    ...getDynamicMcpState(),
    configs: {
      ...context.getOwnedConfigs(),
      ...getDynamicMcpState().configs,
    },
  };
  if (authoritative) {
    let keptOwned = Object.create(null);
    for (let [key, value] of Object.entries(context.getOwnedConfigs()))
      if (Object.hasOwn(payload, key)) keptOwned[key] = value;
    context.setOwnedConfigs(keptOwned);
  }
  let sdkState = context.sdkState();
  let result = await handleMcpSetServers(
    desired,
    sdkState,
    dynamicState,
    setAppState,
    context.redactsPersistedLane(),
    getAppState,
    caller,
    deferConnect,
    authoritative,
    context.storageV5,
    context.credentials,
    stores,
    context,
    dialOptions,
    context.operatorOwnedMcpConfigNames,
  );
  if (authoritative) {
    let keptNames = new Set(Object.keys(result.newDynamicState.configs));
    context.setOwnedConfigs(
      Object.fromEntries(
        Object.entries(stripInternalMcpConfigFields(payload))
          .filter(([key]) => keptNames.has(key) && !isPluginServerConfig(result.newDynamicState.configs[key]))
          .flatMap(([key, value]) => {
            let marked = markCcrInjectedConfig(
              key,
              copyOwnServerMarks(payload[key], {
                ...carryConfiguredCommand(value, result.newDynamicState.configs[key]),
                scope: "dynamic",
              }),
              isLockedOutByOrgMcpPolicy,
            );
            return hasCcrMeta(marked) === hasCcrMeta(result.newDynamicState.configs[key])
              ? [[key, marked]]
              : [];
          }),
      ),
    );
  }
  setDynamicMcpState(
    reconcileMcpClients(
      isDiscoveryCacheOn() ? dynamicState : getDynamicMcpState(),
      getDynamicMcpState(),
      result.newDynamicState,
    ),
  );
  if (result.deferredSettle)
    result.deferredSettle.then((settled) => {
      context.enqueueSettleMerge(() => {
        setDynamicMcpState(buildMcpStatusList(getDynamicMcpState(), settled, getAppState().mcp.clients));
      });
    });
  return result;
}
//@ chunk-vxsfen55.js:16105-23975 layout
async function reconcileMcpServersImpl(
  desired,
  sdkState,
  setAppState,
  io,
  getAppState,
  caller = "unknown",
  deferConnect = false,
  authoritative = false,
  keptPluginNames,
  options,
  hooks,
  dynamicStateHooks,
  shouldDial,
  signal,
  dialOptions,
  getOwnedConfigs,
  operatorToolPolicyConfigs,
  getEnv = () => EMPTY_NAME_MAP,
) {
  let currentNames = new Set(Object.keys(sdkState.configs));
  let desiredNames = new Set(Object.keys(desired));
  let cwd = authoritative ? getOriginalCwdOrNull() : null;
  let droppedNames = authoritative
    ? [...currentNames].filter(
        (name) =>
          !desiredNames.has(name) &&
          !keptPluginNames?.has(name) &&
          (isPluginServerConfig(sdkState.configs[name]) || sdkState.configs[name]?.declaredIn === cwd),
      )
    : [];
  let retainedPluginNames = new Set(
    droppedNames.length > 0
      ? Object.keys(filterMcpServersByPolicy(pickAlias(sdkState.configs, droppedNames)).allowed)
      : [],
  );
  let filtered = [...currentNames].filter(
    (name) => !desiredNames.has(name) && !retainedPluginNames.has(name),
  );
  let filtered_2 = [...desiredNames].filter((name) => !currentNames.has(name));
  let filtered_3 = [...currentNames].filter((name) => desiredNames.has(name));
  let supersededNames = new Set(
    [...sdkState.clients, ...(getAppState?.().mcp.clients ?? [])]
      .filter((client) => client.type === "failed" && client.error === NOT_DIALED_SUPERSEDED_TEXT)
      .map((client) => client.name),
  );
  let isSameOwnedConfig = (name) => {
    let owned = getOwnedConfigs?.() ?? {};
    let ownedConfig = Object.hasOwn(owned, name) ? owned[name] : undefined;
    let desiredConfig = Object.hasOwn(desired, name) ? desired[name] : undefined;
    if (ownedConfig === undefined || desiredConfig === undefined) return false;
    let { scope, ...rest } = ownedConfig;
    return (
      supportsEnvExpansion(rest) &&
      mcpClientModule_5().areMcpConfigsEqual(
        toDynamicServerConfig(rest),
        toDynamicServerConfig(desiredConfig),
      )
    );
  };
  let stateChangedNames = new Set(
    authoritative
      ? []
      : [...sdkState.clients, ...(getAppState?.().mcp.clients ?? [])]
          .filter(
            (client) =>
              !isSameOwnedConfig(client.name) &&
              (client.type === "disabled") !== isMcpServerDisabled(client.name),
          )
          .map((client) => client.name),
  );
  let pendingNames = new Set(
    [...sdkState.clients, ...(getAppState?.().mcp.clients ?? [])]
      .filter((client) => client.type === "pending")
      .map((client) => client.name),
  );
  let filtered_4 = filtered_3.filter((name) => {
    let previousConfig = sdkState.configs[name];
    let nextConfig = desired[name];
    if (!previousConfig || !nextConfig || supersededNames.has(name) || stateChangedNames.has(name))
      return true;
    let dynamicServerConfig = toDynamicServerConfig(nextConfig);
    if (
      (getProjectConfigRoot() === null &&
        !pendingNames.has(name) &&
        isStdioConfig(previousConfig) &&
        previousConfig.declaredIn !== undefined &&
        dynamicServerConfig.declaredIn !== undefined &&
        previousConfig.declaredIn !== dynamicServerConfig.declaredIn) ||
      !mcpClientModule_5().areMcpConfigsEqual(previousConfig, dynamicServerConfig)
    ) {
      logMCPDebug(name, `reconcileMcpServers: config or folder changed, will replace (caller=${caller})`);
      return true;
    }
    return false;
  });
  let retainedPluginCount = countWhere([...retainedPluginNames], (name) =>
    isPluginServerConfig(sdkState.configs[name]),
  );
  logEvent("tengu_mcp_reconcile", {
    caller: fromEnum(caller),
    desiredCount: desiredNames.size,
    currentCount: currentNames.size,
    toRemoveCount: filtered.length,
    toAddCount: filtered_2.length,
    toReplaceCount: filtered_4.length,
    retainedPluginCount,
    retainedFolderServerCount: retainedPluginNames.size - retainedPluginCount,
  });
  let removed = [];
  let added = [];
  let errors = Object.create(null);
  let clients = [...sdkState.clients];
  let tools = [...sdkState.tools];
  for (let name of [...filtered, ...filtered_4]) {
    let client =
      clients.find((entry) => entry.name === name) ??
      getAppState?.().mcp.clients.find((client) => client.name === name);
    let previousConfig = sdkState.configs[name];
    if (previousConfig) {
      if (client?.type === "connected") {
        setMcpOnClose(client, undefined);
        try {
          await client.cleanup();
        } catch (error) {
          logForDebugging(`MCP client cleanup failed for ${name}: ${error}`, {
            level: "error",
          });
        }
      }
      await mcpClientModule_5().clearServerCache(name, previousConfig);
    }
    let mcpPrefix = getMcpPrefix(name);
    tools = tools.filter((tool) => !isToolFromMcpServer(tool, name, mcpPrefix));
    clients = clients.filter((entry) => entry.name !== name);
    if (filtered.includes(name)) removed.push(name);
  }
  let dialNames = [...filtered_2, ...filtered_4];
  let dialNameSet = new Set(dialNames);
  let any = [ListMcpResourcesTool, ReadMcpResourceTool].some(
    (resourceTool) =>
      tools.some((tool) => matchesToolName(tool, resourceTool.name)) ||
      (getAppState?.().mcp.tools ?? []).some((tool) => matchesToolName(tool, resourceTool.name)),
  );
  let supersededEntry = (name, config, dialEpoch, client) => {
    if (client.type === "connected")
      mcpClientModule_5()
        .detachAndCloseConnection(client)
        .catch(() => {});
    let failure = identityChangedFailure(name, config);
    return {
      name,
      client: failure,
      tools: [],
      error: failure.error,
      fetched: null,
      dialEpoch,
    };
  };
  let dialOne = async (name) => {
    let rawConfig = desired[name];
    if (!rawConfig) return null;
    let dialEpoch = identityEpoch();
    if (rawConfig.type === "sdk")
      return {
        name,
        client: null,
        tools: [],
        error: null,
        fetched: null,
        dialEpoch,
      };
    if (shouldDial !== undefined && !shouldDial(name, rawConfig))
      return {
        name,
        client: null,
        tools: [],
        error: NOT_DIALED_SUPERSEDED_TEXT,
        fetched: null,
        dialEpoch,
      };
    let dynamicServerConfig = toDynamicServerConfig(rawConfig);
    let isDisabledNow = () => !authoritative && !isSameOwnedConfig(name) && isMcpServerDisabled(name);
    let disabledEntry = {
      name,
      client: {
        name,
        type: "disabled",
        config: dynamicServerConfig,
      },
      tools: [],
      error: null,
      fetched: null,
      dialEpoch,
    };
    if (isDisabledNow()) return disabledEntry;
    let isStaleEpoch = () => identityEpoch() !== dialEpoch && isRemoteMcpTransport(dynamicServerConfig);
    let asSuperseded = (client) => supersededEntry(name, dynamicServerConfig, dialEpoch, client);
    let asFailed = (cause) => {
      let gateError = mcpGateError(cause, name, dynamicServerConfig);
      return {
        name,
        client: {
          name,
          type: "failed",
          config: dynamicServerConfig,
          ...gateError,
        },
        tools: [],
        error: gateError.error,
        fetched: null,
        dialEpoch,
      };
    };
    try {
      let blockCause = mcpDialBlockCause(name, dynamicServerConfig);
      if (blockCause) return asFailed(blockCause);
      let client = await mcpClientModule_5().connectToServer(
        name,
        dynamicServerConfig,
        undefined,
        options,
        hooks,
        undefined,
        dialOptions,
      );
      if (isStaleEpoch()) return asSuperseded(client);
      let tools = [];
      let fetched = null;
      if (client.type === "connected") {
        tools = await mcpClientModule_5().fetchToolsForClient(client, options);
        try {
          let [commands, fetchedCommands, extraCommands] = await Promise.all([
            mcpClientModule_5().fetchCommandsForClient(client),
            Promise.resolve([]),
            mcpClientModule_5().fetchResourcesForClient(client),
          ]);
          fetched = {
            name,
            cmds: [...commands, ...fetchedCommands],
            res: extraCommands,
          };
        } catch (error) {
          logHandlerFailure(io, `${caller}: mcp listing`, error);
        }
      } else if (client.type === "needs-auth") tools = mcpAuthToolsFor(name, dynamicServerConfig);
      if (isStaleEpoch()) return asSuperseded(client);
      let blockAfterConnect =
        isDiscoveryCacheOn() || client.type === "failed"
          ? null
          : mcpDialBlockCause(name, dynamicServerConfig);
      if (blockAfterConnect || (!isDiscoveryCacheOn() && isDisabledNow())) {
        if (client.type === "connected")
          mcpClientModule_5()
            .detachAndCloseConnection(client)
            .catch(() => {});
        return blockAfterConnect ? asFailed(blockAfterConnect) : disabledEntry;
      }
      if (
        client.type === "connected" &&
        client.discoveryAuthFailure &&
        hasLapsedCcrSignIn(name, dynamicServerConfig)
      )
        return {
          name,
          client: {
            name,
            type: "needs-auth",
            config: dynamicServerConfig,
          },
          tools: mcpAuthToolsFor(name, dynamicServerConfig),
          error: null,
          fetched: null,
          dialEpoch,
        };
      if (
        client.type === "connected" &&
        client.capabilities?.resources &&
        !any &&
        !isMcpServerDisabled(name)
      ) {
        any = true;
        tools = [...tools, ListMcpResourcesTool, ReadMcpResourceTool, listDirectoryResourceTool];
      }
      let error = client.type === "failed" ? client.error || "Connection failed" : null;
      let applied = applyMcpServerConfig(dynamicServerConfig, {
        client,
        tools,
        commands: fetched?.cmds,
      });
      return {
        name,
        client: applied.client,
        tools: applied.tools,
        error,
        fetched:
          fetched !== null && applied.commands !== undefined
            ? {
                ...fetched,
                cmds: applied.commands,
              }
            : fetched,
        dialEpoch,
      };
    } catch (error) {
      let error_2 = toError(error);
      logHandlerFailure(io, `${caller}: mcp dial`, error_2);
      return {
        name,
        client: null,
        tools: [],
        error: error_2.message,
        fetched: null,
        dialEpoch,
      };
    }
  };
  let isLocalServer = (name) => {
    let config = desired[name];
    return !config || mcpClientModule_5().isLocalMcpServer(toDynamicServerConfig(config));
  };
  let configsByName = Object.fromEntries(
    dialNames.map((name) => [name, toDynamicServerConfig(desired[name])]),
  );
  let mapped = dialNames.map((name) => ({
    type: "pending",
    name,
    config: configsByName[name],
  }));
  clients.push(...mapped);
  let nextConfigs = emptyServerMap();
  for (let name of desiredNames) {
    let config = desired[name];
    if (config) {
      let dynamicServerConfig = toDynamicServerConfig(config);
      let previousConfig = sdkState.configs[name];
      if (authoritative && previousConfig !== undefined && isPluginServerConfig(previousConfig)) {
        dynamicServerConfig.pluginSource = previousConfig.pluginSource;
        if (previousConfig.pluginPath !== undefined)
          dynamicServerConfig.pluginPath = previousConfig.pluginPath;
        if (previousConfig.pluginOfficialSourceVouched !== undefined)
          dynamicServerConfig.pluginOfficialSourceVouched = previousConfig.pluginOfficialSourceVouched;
        if (filtered_4.includes(name)) dynamicServerConfig.pluginEndpointTemplated = true;
        else if (previousConfig.pluginEndpointTemplated !== undefined)
          dynamicServerConfig.pluginEndpointTemplated = previousConfig.pluginEndpointTemplated;
      }
      nextConfigs[name] = dynamicServerConfig;
    }
  }
  for (let name of retainedPluginNames) {
    let config = sdkState.configs[name];
    if (config) nextConfigs[name] = config;
  }
  let allToolPolicies = () =>
    collectServerToolPolicies(
      {
        ...desired,
        ...operatorToolPolicyConfigs,
      },
      getEnv(),
    );
  let newState = {
    clients,
    tools,
    configs: nextConfigs,
  };
  let touchedNames = new Set([...filtered, ...filtered_4, ...dialNames]);
  let mapped_2 = [...touchedNames].map((name) => [name, getMcpPrefix(name)]);
  setAppState((state) => {
    let tools = state.mcp.tools.filter(
      (tool) => !mapped_2.some(([serverName, prefix]) => isToolFromMcpServer(tool, serverName, prefix)),
    );
    let filtered = state.mcp.clients.filter((client) => !touchedNames.has(client.name));
    let commands = state.mcp.commands.filter((command) => {
      for (let name of touchedNames) if (commandBelongsToServer(command, name)) return false;
      return true;
    });
    let toolPermissionContext = state.toolPermissionContext;
    let nextPermissionContext = authoritative
      ? mergeMcpServerPolicyRules(
          clearConnectorCardAllows(toolPermissionContext),
          allToolPolicies(),
          "replace",
        )
      : toolPermissionContext;
    if (touchedNames.size === 0 && nextPermissionContext === toolPermissionContext) return state;
    return {
      ...state,
      mcp: {
        ...state.mcp,
        tools,
        clients: [...filtered, ...mapped],
        commands,
        resources: omitKeys(state.mcp.resources, [...touchedNames]),
        resourceTemplates: omitKeys(state.mcp.resourceTemplates, [...touchedNames]),
      },
      toolPermissionContext: nextPermissionContext,
    };
  });
  if (dialNames.length === 0)
    return {
      response: {
        added,
        removed,
        errors,
      },
      newState,
    };
  let settle = () => {};
  let promise = new Promise((resolve) => {
    settle = resolve;
  });
  let newClients = [];
  let newTools = [];
  let dialEpochs = Object.create(null);
  let outcomes = Object.create(null);
  let dialHooks = {
    signal,
    getClients: () => getAppState?.().mcp.clients ?? [],
    getSuppressedPluginServers: () => getAppState?.().mcp.suppressedPluginMcpServers ?? [],
    applyMcpUpdate: (updater) =>
      setAppState((state) => {
        let mcp = updater(state.mcp);
        return mcp === state.mcp
          ? state
          : {
              ...state,
              mcp,
            };
      }),
  };
  let dialAndApply = async (name) => {
    let epoch = identityEpoch();
    let result = await dialOne(name);
    let config = configsByName[name];
    let client = result?.client ?? {
      type: "failed",
      name,
      config,
      error: result?.error ?? "Connection failed",
    };
    let outcome;
    try {
      outcome = applyConnectionResult(dialHooks, {
        client,
        tools: result?.tools ?? [],
        commands: result?.fetched?.cmds ?? [],
        attemptEpoch: result?.dialEpoch ?? epoch,
      });
    } catch (error) {
      if (client.type === "connected")
        mcpClientModule_5()
          .detachAndCloseConnection(client)
          .catch(() => {});
      throw error;
    }
    outcomes[name] = {
      outcome,
      client,
      refusedAs: outcome === "refused" ? refusalStateFor(name, client) : undefined,
    };
    if (result?.fetched) {
      let res = result.fetched.res;
      dialHooks.applyMcpUpdate((mcp) => {
        if (mcp.clients.find((client) => client.name === name) !== client) return mcp;
        return {
          ...mcp,
          resources: {
            ...mcp.resources,
            [name]: res,
          },
        };
      });
    }
    if (outcome === "superseded") return;
    newClients.push(client);
    newTools.push(...(result?.tools ?? []));
    dialEpochs[name] = result?.dialEpoch ?? epoch;
  };
  let runDials = () => {
    Promise.all([
      pMap(dialNames.filter(isLocalServer), dialAndApply, {
        concurrency: mcpClientModule_5().getMcpServerConnectionBatchSize(),
      }),
      pMap(
        dialNames.filter((name) => !isLocalServer(name)),
        dialAndApply,
        {
          concurrency: mcpClientModule_5().getRemoteMcpServerConnectionBatchSize(),
        },
      ),
    ])
      .catch((error) => {
        logHandlerFailure(io, `${caller}: mcp connect`, error);
        let error_2 = errorMessage(error);
        for (let name of dialNames)
          outcomes[name] ??= {
            outcome: "applied",
            client: {
              type: "failed",
              name,
              config: configsByName[name],
              error: error_2,
            },
          };
        dialHooks.applyMcpUpdate((mcp) => ({
          ...mcp,
          clients: mcp.clients.map((client) =>
            client.type === "pending" &&
            dialNameSet.has(client.name) &&
            mcpClientModule_5().areMcpConfigsEqual(client.config, configsByName[client.name])
              ? {
                  type: "failed",
                  name: client.name,
                  config: client.config,
                  error: error_2,
                }
              : client,
          ),
        }));
      })
      .finally(() => {
        settle({
          names: [...dialNameSet],
          clients: newClients,
          tools: newTools,
          dialEpochs,
        });
        if (findReusableClients(configsByName, dialHooks).length > 0)
          retryRemoteMcpServers(configsByName, dialHooks, options).catch((error) =>
            logHandlerFailure(io, `${caller}: mcp retry`, error),
          );
      });
  };
  if (deferConnect) {
    added.push(...dialNames);
    setImmediate(runDials);
    return {
      response: {
        added,
        removed,
        errors,
      },
      newState,
      deferredSettle: promise,
    };
  }
  if (dynamicStateHooks) {
    let dynamicMcpState = dynamicStateHooks.getDynamicMcpState();
    let next = {
      ...dynamicMcpState,
      clients: [...dynamicMcpState.clients.filter((client) => !touchedNames.has(client.name)), ...mapped],
      tools: dynamicMcpState.tools.filter(
        (tool) => !mapped_2.some(([serverName, prefix]) => isToolFromMcpServer(tool, serverName, prefix)),
      ),
      configs: nextConfigs,
    };
    dynamicStateHooks.setDynamicMcpState(next);
  }
  runDials();
  let settled = await promise;
  added.push(...dialNames);
  for (let name of dialNames) {
    let outcome = outcomes[name];
    if (!outcome) continue;
    if (outcome.outcome === "refused") {
      if (outcome.refusedAs) errors[name] = describeMcpServerStatus(outcome.refusedAs);
    } else if (outcome.outcome === "applied" && outcome.client.type === "failed")
      errors[name] = describeMcpServerStatus(outcome.client);
    else if (outcome.outcome === "superseded") {
      let found = getAppState?.().mcp.clients.find((client) => client.name === name);
      if (
        found?.type === "failed" &&
        found.errorCode === "IDENTITY_CHANGED" &&
        mcpClientModule_5().areMcpConfigsEqual(found.config, configsByName[name])
      )
        errors[name] = describeMcpServerStatus(found);
    }
  }
  return {
    response: {
      added,
      removed,
      errors,
    },
    newState: buildMcpStatusList(newState, settled, getAppState?.().mcp.clients),
  };
}
//@ chunk-vxsfen55.js:23975-24950 fingerprint (2.1.88 match: reconcileMcpServers, 0.345)
/**
 * reconcileMcpServers：比较期望与现有 MCP 配置，替换变化的连接。
 */
async function reconcileMcpServers(
  serverName,
  config,
  onProgress,
  existingClients,
  credentials,
  storage,
  options,
  options_2,
  hooks,
  getOwnedConfigs,
) {
  let allowed = Object.create(null);
  let refused = Object.create(null);
  if (config !== undefined) {
    await awaitMcpPolicyColdStart({
      hasDynamicMcpConfig: true,
    });
    let configs = Object.create(null);
    configs[serverName] = config;
    if (Object.hasOwn(filterMcpServersByPolicy(configs).allowed, serverName)) allowed[serverName] = config;
    else refused[serverName] = IGNORED_BY_ENTERPRISE_POLICY_TEXT;
  }
  let mcpPrefix = getMcpPrefix(serverName);
  let matches = (tool) => isToolFromMcpServer(tool, serverName, mcpPrefix);
  let keepServer = (dynamicMcpState) => {
    let nextConfigs = emptyServerMap();
    let nextClient = dynamicMcpState.configs[serverName];
    if (Object.hasOwn(dynamicMcpState.configs, serverName) && nextClient !== undefined)
      nextConfigs[serverName] = nextClient;
    return {
      configs: nextConfigs,
      clients: dynamicMcpState.clients.filter((client) => client.name === serverName),
      tools: dynamicMcpState.tools.filter(matches),
    };
  };
  let dropServer = (newState) => {
    let dynamicMcpState = existingClients.getDynamicMcpState();
    let dynamic = emptyServerMap();
    for (let [key, value] of Object.entries(dynamicMcpState.configs))
      if (key !== serverName) dynamic[key] = value;
    let nextDynamic = newState.configs[serverName];
    if (Object.hasOwn(newState.configs, serverName) && nextDynamic !== undefined)
      dynamic[serverName] = nextDynamic;
    existingClients.setDynamicMcpState({
      configs: dynamic,
      clients: [...dynamicMcpState.clients.filter((prev) => prev.name !== serverName), ...newState.clients],
      tools: [...dynamicMcpState.tools.filter((tool) => !matches(tool)), ...newState.tools],
    });
  };
  let result = await reconcileMcpServersImpl(
    allowed,
    keepServer(existingClients.getDynamicMcpState()),
    credentials,
    options,
    storage,
    onProgress,
    false,
    false,
    undefined,
    options_2,
    hooks,
    {
      getDynamicMcpState: () => keepServer(existingClients.getDynamicMcpState()),
      setDynamicMcpState: dropServer,
    },
    undefined,
    undefined,
    undefined,
    getOwnedConfigs,
  );
  dropServer(result.newState);
  return {
    ...result.response,
    errors: {
      ...refused,
      ...result.response.errors,
    },
  };
}
//@ chunk-0yw3taqg.js:69227-69532 placement (2.1.88 match: calculateMessagesToKeepIndex, 0.412)
/**
 * headless 会话：返回一个惰性函数，算出停放（被打断）轮次已收进的发送消息 uuid 集合。旧版名 calculateMessagesToKeepIndex 为错配，属于 cli/print 的轮次停放逻辑。
 */
function getParkedTurnSendUuids(prompt, uuid, firstUuid) {
  let messages = [];
  try {
    messages = rowsSinceTurnStart(prompt, uuid);
  } catch (error) {
    logError(error);
  }
  return () => {
    try {
      let last = messages[0];
      if (
        last === undefined ||
        (firstUuid === undefined ? !isCompactBoundaryMessage(last) : last.uuid !== firstUuid)
      )
        return new Set();
      let idx = messages
        .slice(0, -1)
        .findLastIndex((message) => isNoResponseRequestedMessage(message) || isInterruptMarkerRow(message));
      let msgTokens = heldUuidsIfEnabled(messages.slice(idx + 1));
      return new Set(
        [...heldUuidsIfEnabled(messages)].filter(
          (error) => msgTokens.has(error) || isQueuedPromptAnswered(messages, error),
        ),
      );
    } catch (error) {
      logError(error);
      return new Set();
    }
  };
}
//@ chunk-0yw3taqg.js:157375-157538 fingerprint (2.1.88 match: getStructuredIO, 0.512)
function getStructuredIO(inputPrompt, options) {
  return {
    type: "user",
    message: {
      role: "user",
      content: options,
    },
    session_id: inputPrompt,
    parent_tool_use_id: null,
    uuid: randomUUID(),
    timestamp: new Date().toISOString(),
    isReplay: true,
  };
}
//@ chunk-0yw3taqg.js:410449-413327 fingerprint (2.1.88 match: handleOrphanedPermissionResponse, 0.444)
async function handleOrphanedPermissionResponse({
  message,
  setAppState,
  onEnqueued,
  handledToolUseIds,
  findUnresolved,
  messageQueue,
  siblings,
  messageRows,
  notSent,
  note,
  initFirst,
  resumesInterruptedTurn,
  cardInput,
  askedInDirectory,
  emptyAllowRunsCardInput = false,
  startedBy,
  interruptedTurnEcho,
  ccrTurnId,
  dropContext,
  enqueueContext,
  denyIsRefusal = isPermissionCardHoldEnabled(),
}) {
  let drop = (reason, toolUseID) => {
    logForDiagnosticsNoPII("warn", "cli_orphan_answer_dropped", () => ({
      ...dropContext?.(toolUseID),
      reason,
      ...flagKey("reason", reason),
      ...getRiskColor(message),
    }));
    return false;
  };
  if (
    message.response.subtype === "success" &&
    message.response.response?.toolUseID &&
    typeof message.response.response.toolUseID === "string"
  ) {
    let permissionResult = message.response.response;
    let { toolUseID } = permissionResult;
    if (!toolUseID) return drop("no_tool_use_id");
    logForDebugging(
      `handleOrphanedPermissionResponse: received orphaned control_response for toolUseID=${toolUseID} request_id=${message.response.request_id}`,
    );
    if (handledToolUseIds.has(toolUseID)) {
      logForDebugging(
        `handleOrphanedPermissionResponse: skipping duplicate orphaned permission for toolUseID=${toolUseID} (already handled)`,
      );
      return drop("already_handled", toolUseID);
    }
    let assistantMessage = await findUnresolved(toolUseID);
    if (!assistantMessage) {
      logForDebugging(
        `handleOrphanedPermissionResponse: dropping orphaned control_response for toolUseID=${toolUseID} \u2014 no unresolved tool_use found`,
        {
          level: "warn",
        },
      );
      return drop("not_unresolved", toolUseID);
    }
    if (handledToolUseIds.has(toolUseID)) {
      logForDebugging(
        `handleOrphanedPermissionResponse: dropping orphaned permission for toolUseID=${toolUseID} \u2014 handled while its transcript read was in flight`,
      );
      return drop("handled_during_read", toolUseID);
    }
    let toolUseBlock = Array.isArray(assistantMessage.message.content)
      ? assistantMessage.message.content.find((block) => block.type === "tool_use" && block.id === toolUseID)
      : undefined;
    if (toolUseBlock?.type === "tool_use") {
      let response = message.response.response;
      if (permissionResult.behavior === "deny" && denyIsRefusal) {
        if (
          isDifferentString(response?.toolName, toolUseBlock.name) ||
          isDifferentString(response?.tool_name, toolUseBlock.name)
        )
          permissionResult = unmatchedAnswerDenial(toolUseID);
      } else if (isValidBridgeToolName(response?.toolName, toolUseBlock.name, message.response.request_id))
        return drop("name_mismatch", toolUseID);
      if (
        emptyAllowRunsCardInput &&
        permissionResult.behavior === "allow" &&
        cardInput &&
        !deepEqualIgnoringUndefined(toolUseBlock.input, cardInput)
      )
        permissionResult = {
          ...permissionResult,
          updatedInput: stripHostOwnedInputKeys(toolUseBlock.name, cardInput),
        };
    }
    handledToolUseIds.add(toolUseID);
    logForDebugging(
      `handleOrphanedPermissionResponse: enqueuing orphaned permission for toolUseID=${toolUseID} messageID=${assistantMessage.message.id}`,
    );
    let isInitFirst = initFirst?.(assistantMessage, toolUseID) === true;
    let resumesTurn = resumesInterruptedTurn?.() === true;
    let noteText = note?.(toolUseID);
    let siblingsList = siblings?.();
    let rows = messageRows?.();
    let startedByInfo = startedBy?.markOf(toolUseID);
    let notSentList = notSent?.();
    let answerEventUuid = "uuid" in message ? normalizeUuidOrNull(message.uuid) : null;
    let orphanCcrTurnId = ccrTurnId?.();
    let remoteFlagOverrideState = getRemoteFlagOverrideState(TENGU_WILD_BEACON);
    messageQueue.enqueue({
      mode: "orphaned-permission",
      agentId: mainAgentId(),
      value: [],
      ...(startedByInfo !== undefined && {
        startedBy: startedByInfo,
      }),
      ...(remoteFlagOverrideState === "on" && {
        skipSubmissionHooks: true,
      }),
      ...interruptedTurnEcho,
      orphanedPermission: {
        permissionResult,
        assistantMessage,
        ...(orphanCcrTurnId !== undefined && {
          ccrTurnId: orphanCcrTurnId,
        }),
        ...(denyIsRefusal && {
          denyIsRefusal: true,
        }),
        ...(isInitFirst && {
          initFirst: true,
        }),
        ...(resumesTurn && {
          resumesInterruptedTurn: true,
        }),
        ...(cardInput !== undefined && {
          cardInput,
        }),
        ...(askedInDirectory !== undefined && {
          askedInDirectory,
        }),
        ...(answerEventUuid !== null && {
          answerEventUuid,
        }),
        ...(siblingsList !== undefined &&
          siblingsList.length > 0 && {
            siblings: siblingsList,
          }),
        ...(rows !== undefined &&
          rows.length > 0 && {
            messageRows: rows,
          }),
        ...(notSentList !== undefined &&
          notSentList.length > 0 && {
            notSent: notSentList,
          }),
        ...(noteText !== undefined && {
          note: noteText,
        }),
      },
    });
    startedBy?.queued(toolUseID);
    onEnqueued?.();
    logForDiagnosticsNoPII("info", "cli_orphan_answer_enqueued", () => ({
      ...enqueueContext?.(toolUseID),
      ...getRiskColor(message),
      ...(remoteFlagOverrideState !== "off" && {
        prompt_check_skip_flag: remoteFlagOverrideState,
        ...flagKey("prompt_check_skip_flag", remoteFlagOverrideState),
      }),
    }));
    return true;
  }
  return drop(message.response.subtype === "success" ? "no_tool_use_id" : "not_success");
}
//@ chunk-0yw3taqg.js:669042-669111 sole-consumer
function isInformationalSystemMessage(frame) {
  return frame.type === "system" && frame.subtype === "informational";
}
//@ chunk-0yw3taqg.js:669111-669176 sole-consumer
function isApiRetrySystemMessage(frame) {
  return frame.type === "system" && frame.subtype === "api_retry";
}
//@ chunk-0yw3taqg.js:669176-670759 sole-consumer
/**
 * 是否可作为 result 前最后一条输出消息（排除 control_*、部分 system 子类型、流事件等）。
 */
function isLastMessageCandidate(frame) {
  return (
    frame.type !== "control_response" &&
    frame.type !== "control_request" &&
    frame.type !== "control_cancel_request" &&
    !(
      frame.type === "system" &&
      (frame.subtype === "session_state_changed" ||
        frame.subtype === "permission_denied" ||
        frame.subtype === "task_notification" ||
        frame.subtype === "task_started" ||
        frame.subtype === "task_updated" ||
        frame.subtype === "task_progress" ||
        frame.subtype === "background_tasks_changed" ||
        frame.subtype === "feedback_draft_queued" ||
        frame.subtype === "control_request_progress" ||
        frame.subtype === "notification" ||
        frame.subtype === "post_turn_summary" ||
        frame.subtype === "task_summary" ||
        frame.subtype === "session_metadata" ||
        frame.subtype === "hook_started" ||
        frame.subtype === "hook_progress" ||
        frame.subtype === "hook_response" ||
        frame.subtype === "commands_changed" ||
        frame.subtype === "elicitation_complete" ||
        frame.subtype === "files_persisted" ||
        frame.subtype === "mirror_error" ||
        frame.subtype === "code_change_published" ||
        frame.subtype === "tool_host_result" ||
        frame.subtype === "peer_message_hold" ||
        frame.subtype === "ui_invalidate" ||
        frame.subtype === "ui_log" ||
        frame.subtype === "ui_toast" ||
        frame.subtype === "ui_status" ||
        frame.subtype === "ui_panes" ||
        frame.subtype === "ui_placed" ||
        frame.subtype === "ui_scroll" ||
        frame.subtype === "ui_focus" ||
        frame.subtype === "permission_check_status" ||
        frame.subtype === "vcs_state_changed" ||
        frame.subtype === "dev_intent" ||
        frame.subtype === "session_title_changed" ||
        frame.subtype === "turn_preempted" ||
        frame.subtype === "per_turn_effort_changed" ||
        frame.subtype === "instruction_size_warning" ||
        frame.subtype === "file_attachments_missing")
    ) &&
    frame.type !== "stream_event" &&
    frame.type !== "keep_alive" &&
    frame.type !== "prompt_suggestion" &&
    frame.type !== "conversation_reset" &&
    frame.type !== "transcript_mirror" &&
    frame.type !== "command_lifecycle" &&
    frame.type !== "active_goal" &&
    frame.type !== "autocompact_state"
  );
}
//@ chunk-0yw3taqg.js:670759-670841 sole-consumer
/**
 * 把启动阶段缓存的 SDK 事件转发到输出流，并订阅后续事件。
 */
function registerStartupSdkEventForwarder(headlessIO) {
  let flush = () => {
    for (let write of drainTaskNotifications()) headlessIO.write(write).catch(() => {});
  };
  setTaskNotificationListener(flush);
  flush();
}
//@ chunk-0yw3taqg.js:670841-694982 callgraph-witnessed (2.1.88 match: runHeadless, 0.243)
/**
 * runHeadless（-p 模式主函数）：建立输入输出（StructuredIO 或 RemoteIO）、沙箱初始化、加载初始消息（--continue/--resume）、驱动 runHeadlessStreaming，最后按 --output-format 输出：text 打印最终结果，json 输出 result 对象（--verbose 输出全部消息数组），stream-json 逐行已输出。退出码：结果 is_error 为 1。
 */
async function runHeadless(
  session,
  promptInput,
  getAppState,
  setAppState,
  appStateEmitter,
  clients,
  startupTools,
  storeSetter,
  agentPool,
  options,
) {
  let startTime = performance.now();
  setBackgroundBashWorkProbe(sendSessionActivitySignal_2);
  setBackgroundBashStopProbe(sendSessionActivitySignal);
  surfaceManagedSettingsErrorsHeadless();
  reportSettingsValidationErrors(options.outputFormat);
  if (isSkillsSyncActive(session)) startSkillSyncAndResync(session, options.storageV5, options.credentials);
  if (isPluginsSyncActive(session)) startFirstPluginsSync(session, options.credentials);
  function onSettingsChange(source, change) {
    call({
      session,
      source,
      getAppState,
      setAppState,
      storageV5: options.storageV5,
      countsAsStart: change?.countsAsStart,
    });
  }
  let advisorModel = getAppState().advisorModel;
  if (advisorModel) {
    setFlagSettingsInline({
      ...(getFlagSettingsInline() ?? {}),
      advisorModel,
    });
    settingsChangeDetector.notifyChange("flagSettings");
  }
  settingsChangeDetector.subscribe(onSettingsChange);
  subscribeOrgFastModeChange(getAppState, setAppState, options.storageV5);
  whenPolicyNotified(() => onSettingsChange("policySettings"));
  headlessProfilerStartTurn();
  headlessProfilerCheckpoint("runHeadless_entry");
  logEvent("tengu_timer", {
    event: lit("startup"),
    durationMs: Math.round(process.uptime() * 1000),
    mcpNonBlocking: getMcpConnectNonBlocking(),
    mcpClientCount: options.configuredMcpServerCount,
    resumed: !!(options.resume || options.continue),
  });
  headlessProfilerCheckpoint("before_grove_check");
  let startTime_2 = performance.now();
  if (await isQualifiedForGrove(options.storageV5, options.credentials))
    await checkGroveForNonInteractive(options.storageV5, options.credentials);
  recordPhase("grove_check_ms", performance.now() - startTime_2, startTime_2);
  headlessProfilerCheckpoint("after_grove_check");
  initializeGrowthBook().catch((source) => logError(toError(source)));
  if (options.resumeSessionAt && !options.resume) {
    process.stderr.write(`Error: --resume-session-at requires --resume
`);
    gracefulShutdownSync(1);
    return;
  }
  if (options.resumeDropsTurn !== undefined && !options.resumeSessionAt) {
    process.stderr.write(`Error: --resume-drops-turn requires --resume-session-at
`);
    gracefulShutdownSync(1);
    return;
  }
  if (options.rewindFiles && !options.resume) {
    process.stderr.write(`Error: --rewind-files requires --resume
`);
    gracefulShutdownSync(1);
    return;
  }
  if (options.rewindFiles && promptInput) {
    process.stderr.write(`Error: --rewind-files is a standalone operation and cannot be used with a prompt
`);
    gracefulShutdownSync(1);
    return;
  }
  let hasStreamingInput = typeof promptInput !== "string";
  setHasStreamingInput(hasStreamingInput);
  markPollEventWiringForPrintRun({
    hasStreamingInput,
    sdkUrl: options.sdkUrl,
    permissionMode: getAppState().toolPermissionContext.mode,
  });
  setSingleShotPrintSession(
    deriveSingleShotPrintSession({
      hasStreamingInput,
      sdkUrl: options.sdkUrl,
    }),
  );
  let now = Date.now();
  let lastStartupPhase;
  let logStartupPhases = Boolean(options.sdkUrl) && process.env.CLAUDE_CODE_ENVIRONMENT_KIND !== "bridge";
  function markStartupPhase(phase, detail) {
    if (!logStartupPhases) return;
    lastStartupPhase = phase;
    process.stderr
      .write(`SDKStartup: phase=${phase} t=${Math.round((Date.now() - now) / 100) / 10}s${detail ? ` ${detail}` : ""}
`);
  }
  let turnHandoff = turnHandoffAdmission({
    sdkUrl: Boolean(options.sdkUrl),
    remoteSessionId: env.CLAUDE_CODE_REMOTE_SESSION_ID,
    environmentKind: env.CLAUDE_CODE_ENVIRONMENT_KIND,
    disabled: env.CLAUDE_CODE_DISABLE_TURN_HANDOFF,
  });
  let carriedWrites =
    options.earlyRemoteLink?.usesRelayMarker ??
    shouldCarryWrites({
      admission: turnHandoff,
      relayConfigured:
        lazyTeleportRelayEnv !== null && lazyTeleportRelayEnv.getTeleportRelayEnvConfig() !== null,
      persistsTranscript: !isTranscriptPersistenceDisabled(),
      sharedBackend: isDiagLogging(),
    });
  await reportUserDataAttachments(options.sdkUrl);
  let stageCallbacks = createStagedRowTracker();
  markStartupPhase("connecting_transport");
  let headlessIO = createHeadlessIO(promptInput, options, turnHandoff, carriedWrites, stageCallbacks);
  let resultStamper = createResultStamper(takeUsageSinceLastResult);
  headlessIO.resultDelivery = resultStamper;
  setOwnBridgePeerResolver(ownBridgePeerAddress);
  if (options.sdkUrl || options.outputFormat === "stream-json") {
    transportStateByHost.of(session).setActive(headlessIO);
    trackUsageSinceLastResult();
  } else transportStateByHost.of(session).markLocalTransport();
  transportStateByHost.of(session).markHeadlessStart({
    sdkUrl: options.sdkUrl,
    readsProcessStdin: isStreamJsonStdin(promptInput),
  });
  let managedWorkingSync =
    Boolean(options.sdkUrl) &&
    Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID) &&
    env.CLAUDE_CODE_ENVIRONMENT_KIND === undefined &&
    !env.CLAUDE_CODE_DISABLE_WORKING_SYNC;
  if (managedWorkingSync)
    import("../services/syncedFiles/syncedFileSyncer.js")
      .then((syncModule) => syncModule.startSyncedFileSyncer(syncModule.SYNCED_FILE_ROOT))
      .catch(() => logForDiagnosticsNoPII("warn", "working_sync_import_failed", {}));
  if (options.sdkUrl && env.CLAUDE_CODE_REMOTE_SESSION_ID && isRemoteManagedEnvironment()) {
    let vitalsOptions = {
      sessionId: env.CLAUDE_CODE_REMOTE_SESSION_ID,
      sdkUrl: options.sdkUrl,
    };
    import("../services/vitals/startHostedWorkerVitalsEmitter.lazy.js")
      .then((vitalsModule) => vitalsModule.startHostedWorkerVitalsEmitter(vitalsOptions))
      .catch(() => logForDiagnosticsNoPII("warn", "vitals_emitter_import_failed", {}));
  }
  let gitAdmission = gitCredentialEngineAdmission({
    entrypoint: env.CLAUDE_CODE_ENTRYPOINT,
    gitSwitch: false,
  });
  let cwd = getCwd();
  let runnerAdmitted =
    (Boolean(options.sdkUrl) && gitAdmission.start
      ? workingSyncAdmission(gitAdmission.engines.git, cwd)
      : "not_admitted") === "admitted";
  let wantDirSync = managedWorkingSync || runnerAdmitted;
  let admitted = null;
  let workerDirSync =
    wantDirSync && gitAdmission.start
      ? import("../services/syncedFiles/startWorkerDirSync.lazy.js")
          .then((fileStoreModule) => fileStoreModule.startWorkerDirSync(cwd))
          .catch(() => {
            logForDiagnosticsNoPII("warn", "file_store_worker_import_failed", {});
            return null;
          })
      : undefined;
  let dirSyncDecision = decideWorkerDirSync({
    admittedAs: managedWorkingSync ? "managed" : runnerAdmitted ? "runner_child" : null,
    dirSyncStarts: workerDirSync !== undefined,
    hermetic: isHermeticRemoteSession(),
    spawnEnv: getPreSettingsEnvSnapshot,
    accountHome: safeHomedir,
    currentConfigHome: configDirForSync,
  });
  if (managedWorkingSync && !dirSyncDecision.start && dirSyncDecision.reason !== "file_store_worker_off")
    logForDiagnosticsNoPII("info", "home_seed_worker_disabled", {
      reason: dirSyncDecision.reason,
    });
  let homeSeed = dirSyncDecision.start
    ? startCloudHomeSeedParticipant({
        record: stageCallbacks,
        configHome: dirSyncDecision.configHome,
        foreignFiles: dirSyncDecision.foreignFiles,
        takes: dirSyncDecision.takes,
        session,
        repoRoot: cwd,
        storageV5: options.storageV5,
        workerDirSync,
      })
    : undefined;
  let turnGateParticipants = createTurnGateParticipants();
  if (isFirstPartyRemoteSession(env.CLAUDE_CODE_REMOTE_SESSION_ID, env.CLAUDE_CODE_ENVIRONMENT_KIND))
    turnGateParticipants.register(createUserDataRootsTurnGate());
  let turnEndUploadListener = undefined;
  if (workerDirSync !== undefined)
    import("../services/remoteTools/dirSync.js")
      .then((forwardClearanceModule) => forwardClearanceModule.registerWorkerDirSyncForMidTurn(workerDirSync))
      .catch(() => {
        logForDiagnosticsNoPII("warn", "device_forward_clearance_import_failed", {});
      });
  if (homeSeed !== undefined) turnGateParticipants.register(homeSeedHoldParticipant(homeSeed));
  let pluginForwardingAdmission = sessionAuthAdmission({
    sdkUrl: Boolean(options.sdkUrl),
    remoteSessionId: env.CLAUDE_CODE_REMOTE_SESSION_ID,
    environmentKind: env.CLAUDE_CODE_ENVIRONMENT_KIND,
    entrypoint: env.CLAUDE_CODE_ENTRYPOINT,
    disabled: env.CLAUDE_CODE_DISABLE_PLUGIN_FORWARDING,
    hermetic: isHermeticRemoteSession(),
  });
  if (!pluginForwardingAdmission.admitted && pluginForwardingAdmission.reason === "disabled")
    logForDiagnosticsNoPII("info", "plugin_forwarding_worker_disabled", {});
  let deviceHooksAdmission = ccrAuthRefreshAdmission({
    sdkUrl: Boolean(options.sdkUrl),
    remoteSessionId: env.CLAUDE_CODE_REMOTE_SESSION_ID,
    environmentKind: env.CLAUDE_CODE_ENVIRONMENT_KIND,
    entrypoint: env.CLAUDE_CODE_ENTRYPOINT,
    disabled: env.CLAUDE_CODE_DISABLE_HOOK_FORWARDING,
    hermetic: isHermeticRemoteSession(),
  });
  let remoteToolsAdmission = admitRemoteToolsAnnounce({
    sdkUrl: Boolean(options.sdkUrl),
    remoteSessionId: env.CLAUDE_CODE_REMOTE_SESSION_ID,
    environmentKind: env.CLAUDE_CODE_ENVIRONMENT_KIND,
    grantedRunnerChild: isRemoteEnvPlaceholder(),
    entrypoint: env.CLAUDE_CODE_ENTRYPOINT,
    channelOff: isSessionChannelDisabled(),
    hermetic: isHermeticRemoteSession(),
  });
  if (sdkHostOffersOAuthRefresh()) {
    setSdkOAuthTokenRefreshCallback(() => headlessIO.requestOAuthTokenRefresh());
    if (isLauncherStartedProcess())
      setLauncherHostLoginReplacementJudge((judge) => verifyLauncherHostLogin(options.credentials, judge));
  }
  if (env.CLAUDE_CODE_SDK_HAS_HOST_AUTH_REFRESH && isHostEntrypoint()) {
    let refreshTimeoutMs =
      parseNumberWithSeparators(process.env.CLAUDE_CODE_HOST_AUTH_REFRESH_TIMEOUT_MS) || undefined;
    setHostAuthTokenRefreshCallback(() => headlessIO.requestHostAuthTokenRefresh(refreshTimeoutMs));
  }
  if (options.outputFormat === "stream-json") installStdoutGuard(session.host);
  let messagesRef = {
    current: [],
  };
  let toolsRef = {
    current: startupTools,
  };
  let permissionPromptToolName = effectivePermissionPromptTool({
    permissionPromptTool: options.permissionPromptToolName,
    sdkUrl: options.sdkUrl,
  });
  let noPromptHost = isNoPromptHost(options.permissionPrompts);
  if (noPromptHost) {
    headlessIO.hostAnswersElicitations = false;
    if (permissionPromptToolName !== undefined)
      logForDebugging(
        `--permission-prompts none: permission prompts are answered with a local deny; the ${permissionPromptToolName === "stdio" ? "SDK host" : "--permission-prompt-tool"} is not consulted`,
      );
  }
  let sandboxUnavailableReason = SandboxManager.getSandboxUnavailableReason();
  if (sandboxUnavailableReason) {
    if (SandboxManager.isSandboxRequired()) {
      if (options.outputFormat === "stream-json") {
        let sandboxMessage = isTransportBacked(session)
          ? SANDBOX_UNAVAILABLE_MESSAGE
          : `${SANDBOX_UNAVAILABLE_MESSAGE}: ${sandboxUnavailableReason}`;
        if (isTransportBacked(session))
          logForDebugging(`sandbox unavailable detail: ${sandboxUnavailableReason}`, {
            level: "error",
          });
        publishFailedSummary(headlessIO.sessionState, sandboxMessage);
        await headlessIO.write(
          buildStartupFailureResult({
            sessionId: getSessionId(),
            message: `${sandboxMessage}. Set sandbox.failIfUnavailable=false to allow unsandboxed execution.`,
            reason: "sandbox_required_unavailable",
            resultIndex: null,
          }),
        );
        await Promise.race([
          headlessIO.flushSessionState(),
          sleep(5000, undefined, {
            unref: true,
          }),
        ]);
      }
      process.stderr.write(
        `
Error: sandbox required but unavailable: ${sandboxUnavailableReason}
` +
          `  sandbox.failIfUnavailable is set \u2014 refusing to start without a working sandbox.

`,
      );
      gracefulShutdownSync(1);
      return;
    }
    process.stderr.write(`
\u26A0 Sandbox disabled: ${sandboxUnavailableReason}
  Commands will run WITHOUT sandboxing. Network and filesystem restrictions will NOT be enforced.

`);
  }
  let sandboxPermissionChecker = () =>
    createInboxPermissionChecker(
      noPromptHost
        ? createSandboxNetworkAsker(headlessIO)
        : headlessIO.createSandboxAskCallback(
            applyPermissionAnswerChanges,
            (updater) =>
              setAppState((prev) => ({
                ...prev,
                toolPermissionContext: updater(prev.toolPermissionContext),
              })),
            options.storageV5,
            options.credentials,
          ),
      () => getAppState().toolPermissionContext,
      () => messagesRef.current,
      () => toolsRef.current,
      options.storageV5,
      options.credentials,
    );
  if (!sandboxUnavailableReason && SandboxManager.isSandboxingEnabled()) {
    profileCheckpoint("before_sandbox_init");
    let startTime = performance.now();
    try {
      await SandboxManager.initialize(sandboxPermissionChecker());
    } catch (err) {
      process.stderr.write(`
\u274C Sandbox Error: ${errorMessage(err)}
`);
      gracefulShutdownSync(1, "other");
      return;
    }
    recordPhase("sandbox_init_ms", performance.now() - startTime, startTime);
    profileCheckpoint("after_sandbox_init");
    for (let warning of SandboxManager.getProfileReadSecurityWarnings())
      process.stderr.write(`
\u26A0 ${warning}
`);
  }
  createDependencyWatcher(
    [
      {
        subscribe: appStateEmitter,
      },
    ],
    () => [SandboxManager.isSandboxingEnabled()],
    (event) => {
      if (!event) return;
      SandboxManager.initialize(sandboxPermissionChecker()).catch((error) => {
        logForDebugging(`sandbox: initialization after a settings change failed: ${errorMessage(error)}`, {
          level: "error",
        });
      });
    },
  );
  if (!sandboxUnavailableReason) {
    let maskCredentialWarning = SandboxManager.getMaskCredentialWarning();
    if (maskCredentialWarning)
      process.stderr.write(`
\u26A0 ${maskCredentialWarning}

`);
    warnOfDeniesOnAnotherHostOnStderr();
  }
  let streamInitEvents = options.outputFormat === "stream-json" && Boolean(options.verbose);
  if (streamInitEvents) registerStartupSdkEventForwarder(headlessIO);
  if (options.setupTrigger)
    await runStartupHooks(session, {
      kind: "setup",
      trigger: options.setupTrigger,
      storageV5: options.storageV5,
      credentials: options.credentials,
    });
  headlessProfilerCheckpoint("before_loadInitialMessages");
  profileCheckpoint("before_loadInitialMessages", {
    once: true,
  });
  recordPhase("headless_prologue_ms", performance.now() - startTime, startTime);
  let appStateSnapshot = getAppState();
  let appState = createSessionHooksRegistry();
  sessionHooksRegistrySlot.of(session).registry = appState;
  let remoteControlForkChild = createForkSeedVerifier({
    sdkUrl: options.sdkUrl,
    credentials: options.credentials,
    writeNote: (forkSeedSha256) => {
      headlessIO.sessionState.notifyInternalMetadataChanged({
        fork_seed_sha256: forkSeedSha256,
      });
      return headlessIO.flushSessionState();
    },
  });
  let openingRows = [];
  let overdueSessionStartHooks;
  let diskBehind;
  let startTime_3 = performance.now();
  let {
    messages,
    turnInterruptionState,
    supersededToolUseIds,
    supersededToolNames,
    answeredToolUseIds,
    deferredToolUse,
    rescueSuppressed,
    agentSetting,
    sessionProjectPath,
    aborted,
    planModeOnResume,
    transcriptAnchor,
    liveSourceRows,
    resumedAsFork = Boolean(options.forkSession),
    messagesOrigin,
  } = await loadInitialMessages(session, setAppState, appState, {
    onFreshSessionStartRows: (rows) => {
      openingRows.push(...rows);
    },
    onOverdueSessionStartHooks: (hooks) => {
      overdueSessionStartHooks = hooks;
    },
    onDiskBehind: (info) => {
      diskBehind = info;
    },
    continue: options.continue,
    teleport: options.teleport,
    resume: options.resume,
    resumeSessionAt: options.resumeSessionAt,
    resumeDropsTurn: options.resumeDropsTurn,
    sessionBeganAsCopy: options.sessionBeganAsCopy,
    forkSession: options.forkSession,
    outputFormat: options.outputFormat,
    sessionStartHooksPromise: options.sessionStartHooksPromise,
    restoredWorkerState: headlessIO.restoredWorkerState,
    hydratePrefetch: headlessIO.hydratePrefetch,
    remoteControlForkChild,
    sdkUrl: options.sdkUrl,
    storageV5: options.storageV5,
    credentials: options.credentials,
    cliAgents: options.cliAgents,
    permissionModeSuppliedOnInvocation: options.permissionModeSuppliedOnInvocation !== false,
    relayAwaitsHandoff: carriedWrites,
    liveBackgroundHandoff: getAttachablePrompt(options.liveBackgroundHandoff, options, {
      stdin: process.stdin.isTTY === true,
      stdout: process.stdout.isTTY === true,
    }),
    tools: startupTools,
  });
  messagesHeard(messages, promptOriginOfContent);
  let startTime_4 = performance.now();
  recordPhase("initial_messages_load_ms", startTime_4 - startTime_3, startTime_3);
  if (aborted) return;
  if (options.joinAlwaysLoadMcp !== undefined) {
    await options.joinAlwaysLoadMcp();
    recordPhase("mcp_always_load_join_ms", performance.now() - startTime_4, startTime_4);
  }
  let cloudPluginSwitches = new CloudPluginSwitches(headlessIO);
  await cloudPluginSwitches.restore(
    {
      engineState: getAppState,
      setEngineState: setAppState,
    },
    options.storageV5,
  );
  let mcp = options.joinAlwaysLoadMcp !== undefined ? getAppState().mcp : appStateSnapshot.mcp;
  let startTime_5 = performance.now();
  let followUpsAtStartUp = headlessIO.isRemoteTransport()
    ? classifyFoldedFollowUps(
        messages,
        new Set(openingRows),
        supersededToolUseIds !== undefined && supersededToolUseIds.size > 0,
      )
    : undefined;
  if (options.sdkUrl && options.resume && !resumedAsFork && !isShuttingDown()) {
    await restoreTaskListAtBoot(session, messages, headlessIO.restoredWorkerState, options.storageV5);
    await headlessIO.sendOwedClientRowsAgain(createIngressReadiness(session, appState, messages));
  }
  let appendNotice = (message) => {
    messages.push(message);
    openingRows.push(message);
  };
  ownCostLedger();
  let noteRow;
  {
    let turnHandoff = weakMap_2.get(session);
    weakMap_2.delete(session);
    if (turnHandoff?.switched) {
      markPollEventWiringForPrintRun({
        hasStreamingInput,
        sdkUrl: options.sdkUrl,
        permissionMode: getAppState().toolPermissionContext.mode,
      });
      startupTools = rebuildStartupToolsForCodeMode(startupTools, getAppState().toolPermissionContext);
      toolsRef.current = startupTools;
    }
    if (turnHandoff?.takenOut === undefined)
      noopModelPinReset(turnHandoff?.declined === true || messagesOrigin === "remote");
    else {
      let userMessage = createUserMessage({
        content: wrapInSystemReminder(turnHandoff.takenOut.reminder),
        isMeta: true,
      });
      appendNotice(userMessage);
      noteRow = {
        notice: createSystemMessage(turnHandoff.takenOut.notice, "warning"),
        reminder: userMessage,
      };
    }
  }
  messagesRef.current = messages;
  prefetchUserContext(
    session,
    Boolean(options.continue || options.resume),
    options.storageV5,
    options.credentials,
  );
  if (streamInitEvents) setTaskNotificationListener(null);
  let hookInitialUserMessage = takePendingInitialUserMessage();
  if (hookInitialUserMessage) headlessIO.prependUserMessage(hookInitialUserMessage);
  let agentRestorePlan = shouldAttemptAgentRestoreInPrint({
    hasStreamingInput,
    explicitAgentFlag: options.agent,
    mainThreadAgentType: getMainThreadAgentType(),
    resumedAgentSetting: agentSetting,
  });
  if (agentRestorePlan.attempt && agentSetting) {
    let sessionAgentDefinitions = await loadAgentDefinitionsForSessionCwd(
      sessionProjectPath,
      options.storageV5,
    );
    let { agentDefinition } = restoreAgentFromSession(
      agentSetting,
      undefined,
      {
        activeAgents: agentPool,
        allAgents: agentPool,
      },
      {
        sessionAgentDefinitions,
        sessionCwd: sessionProjectPath,
        onResolveMiss: agentRestorePlan.loud
          ? (notice) => {
              appendNotice(createSystemMessage(notice, "warning"));
              process.stderr.write(
                notice +
                  `
`,
              );
            }
          : undefined,
      },
    );
    if (agentDefinition) {
      setAppState((prev) => ({
        ...prev,
        agent: agentDefinition.agentType,
      }));
      if (!options.systemPrompt && !isBuiltInAgent(agentDefinition)) {
        let agentSystemPrompt = agentDefinition.getSystemPrompt();
        if (agentSystemPrompt) options.systemPrompt = agentSystemPrompt;
      }
      saveAgentSetting(agentDefinition.agentType);
    }
  }
  if (resumedAsFork) neutralizeForkFallbackBanners(messages);
  rearmRefusalFallbackHeaderFromTranscript(messages, resumedAsFork);
  let restoredModel = await restoreModelFromSession(
    messages,
    appStateSnapshot.mainLoopModel,
    (notice, replyText) => appendNotice(resumeModelRestrictedNotice(notice, replyText)),
    {
      storageV5: options.storageV5,
      credentials: options.credentials,
    },
  );
  let installedModel = restoredModel
    ? installRestoredModel(messages, restoredModel, resumedAsFork, options.storageV5, options.credentials)
    : undefined;
  if (installedModel)
    setAppState((state) => {
      if (state.mainLoopModel === installedModel) return state;
      recordSwitchIfChanged(session, state, installedModel, "resume");
      return {
        ...state,
        mainLoopModel: installedModel,
      };
    });
  if (messages.length === 0 && process.exitCode !== undefined) return;
  let restrictedModelNotice;
  if (
    options.restrictedStartupModel &&
    isModelDifferentFromRestricted(options.userSpecifiedModel, options.restrictedStartupModel)
  ) {
    let noticeText = modelRestrictedNotice(options.restrictedStartupModel, getMainLoopModel(), "start");
    if (
      !messages.some(
        (message) =>
          message.type === "system" &&
          message.subtype === "informational" &&
          message.content.includes(noticeText.content),
      )
    )
      appendNotice(noticeText);
    restrictedModelNotice = {
      ...noticeText,
      uuid: randomUUID(),
    };
  }
  if (options.rewindFiles) {
    let targetMessage = messages.find((message) => message.uuid === options.rewindFiles);
    if (!targetMessage || targetMessage.type !== "user") {
      process.stderr
        .write(`Error: --rewind-files requires a user message UUID, but ${options.rewindFiles} is not a user message in this session
`);
      gracefulShutdownSync(1);
      return;
    }
    let currentAppState = getAppState();
    let rewindResult = await handleRewindFiles(options.rewindFiles, currentAppState, false);
    if (!rewindResult.canRewind) {
      process.stderr.write(`Error: ${rewindResult.error || "Unexpected error"}
`);
      gracefulShutdownSync(1);
      return;
    }
    if (rewindResult.skippedLinks)
      process.stderr
        .write(`Warning: ${rewindResult.skippedLinks} tracked ${rewindResult.skippedLinks === 1 ? "path was" : "paths were"} skipped: ${REWIND_UNSAFE_PATH_REASON}. Run with --debug for the paths.
`);
    writeToStdout(`Files rewound to state at message ${options.rewindFiles}
`);
    gracefulShutdownSync(0);
    return;
  }
  let resumeById = typeof options.resume === "string" && options.resume.trim().length > 0;
  let isUsingSdkUrl = Boolean(options.sdkUrl);
  if (
    typeof promptInput === "string" &&
    promptInput.trim() === "" &&
    !isUsingSdkUrl &&
    !deferredToolUse &&
    !hookInitialUserMessage
  ) {
    process.stderr.write(
      promptInput !== ""
        ? `Error: Input contained only whitespace. Provide a prompt with text through stdin or as a prompt argument when using --print
`
        : resumeById || options.continue
          ? `Error: No deferred tool marker found in the resumed session. Either the session was not deferred, the marker is stale (tool already ran), or it exceeds the tail-scan window. Provide a prompt to continue the conversation.
`
          : `Error: Input must be provided either through stdin or as a prompt argument when using --print
`,
    );
    gracefulShutdownSync(1);
    return;
  }
  if (options.outputFormat === "stream-json" && !options.verbose) {
    process.stderr.write(`Error: When using --print, --output-format=stream-json requires --verbose
`);
    gracefulShutdownSync(1);
    return;
  }
  let allowedMcpTools = filterToolsByDenyRules(mcp.tools, appStateSnapshot.toolPermissionContext);
  let toolsWithMcp = withLateEnabledToolsIfAdvertised(
    [...startupTools, ...allowedMcpTools],
    appStateSnapshot.toolPermissionContext,
  );
  toolsRef.current = toolsWithMcp;
  let permissionPromptToolServerName = permissionPromptToolName
    ? mcpInfoFromString(permissionPromptToolName)?.serverName
    : undefined;
  let onPermissionPrompt = (details) => {
    notifyRequiresAction(
      {
        io: headlessIO,
        setAppState,
        leadsWithOldestCard: shouldLeadWithOldestCard,
      },
      details,
    );
    lazyPostTurnSummary?.runClassifierSummaryForBlocked(details, headlessIO.sessionState);
  };
  headlessIO.onUserDialogParked = (prev) => {
    lazyPostTurnSummary?.runClassifierSummaryForBlocked(prev, headlessIO.sessionState);
  };
  let promptToolBinding = {
    swept: false,
  };
  let canUseTool = getCanUseToolFn(
    permissionPromptToolName,
    headlessIO,
    () => getAppState().mcp.tools,
    onPermissionPrompt,
    {
      isPromptToolServerSwept: () => promptToolBinding.swept,
    },
    options.permissionPrompts,
  );
  if (options.permissionPromptToolName)
    toolsWithMcp = toolsWithMcp.filter((tool) => !matchesToolName(tool, options.permissionPromptToolName));
  let sendPins = collectSendPins(messages);
  if (Object.keys(sendPins).length > 0)
    setAppState((state) => ({
      ...state,
      sendMessagePins: sendPins,
    }));
  if (!resumedAsFork)
    setAppState((state) => {
      let namedAgentIds = collectNamedAgentIds(messages, state.agentNameRegistry);
      return namedAgentIds === null
        ? state
        : {
            ...state,
            agentNameRegistry: namedAgentIds,
          };
    });
  mcpTaskEndingsSlots.of(session).savesWith(
    createTranscriptSaver({
      io: headlessIO,
      isShuttingDown,
    }),
  );
  let restoreMcpTaskSidecar = (tool) => {
    let conversation = [...messages];
    let sessionId = getSessionId();
    withDeadline(
      initializeGrowthBook().catch(() => null),
      PRINT_TURN_FLUSH_DELAY_MS,
    )
      .then(() => {
        if (!isMcpTasksEnabled()) {
          logForDebugging(
            "[print.ts] MCP task sidecar restore skipped: tasks gate off after the flag settle",
          );
          return;
        }
        return loadMcpTaskModule({
          sessionId,
          conversation,
          taskRegistry: tool,
          getMcpClients: () => [...(getMcpClientsFromAccessor() ?? [])],
          requestDialog: undefined,
          storageV5: options.storageV5,
          credentials: options.credentials,
        });
      })
      .catch(logError);
  };
  let restoredOrphans = [];
  let alsoResumable;
  let lostSessionTimers = [];
  let agentResumePlan = [];
  let agentResumes = [];
  let diskBehindReminder;
  let resumableAgentIds = collectResumableAgentIds(supersededToolNames);
  if (env.CLAUDE_CODE_RESUME_INTERRUPTED_TURN && headlessIO.isRemoteTransport()) {
    if (diskBehind !== undefined && !resumedAsFork) {
      await withDeadline(
        initializeGrowthBook().catch(() => null),
        PRINT_TURN_FLUSH_DELAY_MS,
      );
      if (getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WITTY_KAY, false))
        diskBehindReminder = createAttachmentMessage({
          type: "critical_system_reminder",
          content: describeDiskTranscriptLag(diskBehind, Date.now()),
        });
    }
    let restoredWorkerState = await headlessIO.restoredWorkerState;
    let runningBackgroundTasks = restoredWorkerState?.internal?.running_background_tasks;
    let orphanedPending = restoredWorkerState?.internal?.orphaned_background_tasks_pending_notification;
    let finishedPending = restoredWorkerState?.internal?.finished_background_tasks_pending_notification;
    let runningTasks = Array.isArray(runningBackgroundTasks) ? runningBackgroundTasks : [];
    let orphanedRows = Array.isArray(orphanedPending) ? orphanedPending : [];
    let allTasks = dedupeTasksById([...orphanedRows, ...runningTasks]);
    let orphanTasks = collectOrphanTasks(Array.isArray(finishedPending) ? finishedPending : [], allTasks);
    let runningForegroundAgents = restoredWorkerState?.internal?.running_foreground_agents;
    let pendingAction = restoredWorkerState?.external?.pending_action;
    let hasForegroundAgents = Array.isArray(runningForegroundAgents) && runningForegroundAgents.length > 0;
    let shouldResumeCutOff =
      hasForegroundAgents &&
      turnInterruptionState?.kind === "interrupted_prompt" &&
      !resumedAsFork &&
      !pendingActionsAmbiguous(restoredWorkerState);
    if (shouldResumeCutOff && pendingAction != null)
      await withDeadline(
        initializeGrowthBook().catch(() => null),
        PRINT_TURN_FLUSH_DELAY_MS,
      );
    if (shouldResumeCutOff && (pendingAction == null || isTurnHandoffResumeEnabled()))
      try {
        agentResumePlan = await planRecordedAgentResumes({
          recorded: runningForegroundAgents,
          agentCallIds: resumableAgentIds,
          known: new Set([...allTasks, ...orphanTasks].map((task) => task.task_id)),
          hasTool: (toolName) => findToolByName(startupTools, toolName) !== undefined,
          settleFlags: () =>
            withDeadline(
              initializeGrowthBook().catch(() => null),
              PRINT_TURN_FLUSH_DELAY_MS,
            ),
        });
      } catch (error) {
        logFeatureBad("ccr_cut_off_agents", "threw");
        logError(toError(error));
      }
    restoredOrphans = dedupeTasksById(runningTasks);
    let stillOffered = [];
    let toKeep;
    let resumableOrphanedAgents = restoredWorkerState?.internal?.resumable_orphaned_agents;
    if (
      restoredOrphans.length > 0 ||
      agentResumePlan.length > 0 ||
      (Array.isArray(resumableOrphanedAgents) && resumableOrphanedAgents.length > 0)
    ) {
      await withDeadline(
        initializeGrowthBook().catch(() => null),
        PRINT_TURN_FLUSH_DELAY_MS,
      );
      let orphanResult = await restoreOrphanAgents({
        recorded: resumableOrphanedAgents,
        stopped: [...restoredOrphans, ...agentResumePlan],
        toldOfAnyway: [...restoredOrphans, ...orphanTasks, ...agentResumePlan],
        readAgentMetadataEvents: (agentId) => headlessIO.readAgentMetadataEvents(agentId),
        storageV5: options.storageV5,
      });
      alsoResumable = orphanResult.alsoResumable;
      stillOffered = orphanResult.stillOffered;
      toKeep = orphanResult.toKeep;
      headlessIO.sessionState.resumableOrphanedAgents = toKeep ?? [];
    }
    let onlyAgentId = rescueSuppressed ? unambiguousPendingAgentId(restoredWorkerState) : undefined;
    agentResumes = await resumeCutOffAgents({
      cutOff: agentResumePlan,
      unresolvedCallIds: supersededToolUseIds ?? new Set(),
      findCalls: (callIds) => findUnresolvedToolUses(callIds, options.storageV5),
      stopped: restoredOrphans,
      alsoResumable,
      cardWaits: pendingActionsAmbiguous(restoredWorkerState),
      owesATurn: () =>
        (!rescueSuppressed || (isAmbientRunning() && onlyAgentId !== undefined)) &&
        !resumedAsFork &&
        (turnInterruptionState?.kind === "interrupted_prompt" ||
          getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_orphan_restore_wake", true)),
      onlyAgent: onlyAgentId,
      startsSpent: () => hasHitUnattendedRestartLimit(restoredWorkerState),
      tools: toolsWithMcp,
      toolPermissionContext: getAppState().toolPermissionContext,
      storageV5: options.storageV5,
    });
    let resumedAgentIds = new Set(agentResumes.map((resume) => resume.agentId));
    let calledAgentIds = new Set(agentResumes.flatMap((resume) => (resume.call ? resume.agentId : [])));
    let filtered = agentResumePlan.filter((resume) => !calledAgentIds.has(resume.task_id));
    if (hasForegroundAgents)
      headlessIO.sessionState.notifyInternalMetadataChanged({
        running_foreground_agents: agentResumePlan.filter((resume) => calledAgentIds.has(resume.task_id)),
      });
    try {
      for (let resumedFirst of [true, false]) {
        let agents = filtered.filter((resume) => resumedAgentIds.has(resume.task_id) === resumedFirst);
        if (agents.length > 0)
          appendNotice(
            createUserMessage({
              content: formatRestartedAgentsReminder(agents, resumedFirst),
              isMeta: true,
            }),
          );
      }
    } catch (error) {
      logFeatureBad("ccr_cut_off_agents", "threw");
      logError(toError(error));
    }
    let taskSummary = orphanAgentRestoreNotice(
      [...stillOffered, ...restoredOrphans, ...filtered],
      (agent) => findToolByName(startupTools, agent) !== undefined,
      alsoResumable,
      resumedAgentIds,
    );
    if (allTasks.length > 0) {
      logForDebugging(`[print.ts] ${allTasks.length} orphaned background task(s) after restart`);
      appendNotice(
        createUserMessage({
          content: describeRunningProcesses(
            dedupeTasksById([...allTasks, ...stillOffered]),
            orphanTasks,
            taskSummary,
          ),
          isMeta: true,
        }),
      );
      for (let task of allTasks)
        emitTaskNotification(task.task_id, "stopped", {
          summary: `Stopped by a worker restart: ${task.description || task.task_id}`,
          reason: "worker_restart",
          ambient: task.ambient,
        });
      let delivered = false;
      let timedOut = false;
      let startTime = performance.now();
      let writtenAt;
      try {
        for (let row of drainTaskNotifications()) await headlessIO.write(row);
        writtenAt = performance.now();
        let winner = await Promise.race([
          headlessIO.flushClientEvents(),
          sleep(PRINT_TURN_WAIT_MS, undefined, {
            unref: true,
          }).then(() => "timed_out"),
        ]);
        timedOut = winner === "timed_out";
        delivered = winner === true;
      } catch (error) {
        logForDebugging(
          `[print.ts] orphaned-task notification flush failed; keeping orphans pending for re-emit: ${toError(error).message}`,
        );
      }
      if (!delivered)
        logForDebugging(
          "[print.ts] orphaned-task notification delivery unconfirmed; keeping orphans pending for re-emit",
        );
      let startTime_2 = performance.now();
      recordPhase("orphaned_task_flush_ms", startTime_2 - startTime, startTime);
      logForDiagnosticsNoPII(delivered ? "info" : "warn", "orphaned_task_flush", {
        budget_ms: PRINT_TURN_WAIT_MS,
        write_ms: Math.round((writtenAt ?? startTime_2) - startTime),
        waited_ms: writtenAt === undefined ? 0 : Math.round(startTime_2 - writtenAt),
        timed_out: timedOut,
        delivered,
      });
      headlessIO.sessionState.notifyInternalMetadataChanged({
        running_background_tasks: [],
        orphaned_background_tasks_pending_notification: delivered ? null : allTasks,
        finished_background_tasks_pending_notification: null,
        ...(toKeep && {
          resumable_orphaned_agents: toKeep,
        }),
      });
    } else if (stillOffered.length > 0 || orphanTasks.length > 0) {
      appendNotice(
        createUserMessage({
          content: describeRunningProcesses(stillOffered, orphanTasks, taskSummary),
          isMeta: true,
        }),
      );
      headlessIO.sessionState.notifyInternalMetadataChanged({
        finished_background_tasks_pending_notification: null,
        ...(toKeep && {
          resumable_orphaned_agents: toKeep,
        }),
      });
    }
    lostSessionTimers = await listResumableAgentsStub(
      liveSourceRows === undefined
        ? messages
        : messages.filter((message) => !liveSourceRows.has(message.uuid)),
      {
        settleFlags: () =>
          withDeadline(
            initializeGrowthBook().catch(() => null),
            PRINT_TURN_FLUSH_DELAY_MS,
          ),
        addRow: appendNotice,
        diskMayChange: overdueSessionStartHooks !== undefined,
      },
    );
    restoreMcpTaskSidecar(createTaskFramework(getAppState, setAppState));
  } else if (messages.length > 0) {
    let tool = createTaskFramework(getAppState, setAppState);
    await formatOrphanSummary(messages, tool, undefined, undefined, options.storageV5, liveSourceRows, () =>
      startupStandInPlan(startupTools),
    );
    restoreRemoteAgentTasks({
      abortController: new AbortController(),
      taskRegistry: tool,
      storageV5: options.storageV5,
      credentials: options.credentials,
    });
    restoreMcpTaskSidecar(tool);
  }
  let restoredWorkerState = await headlessIO.restoredWorkerState;
  restoreDeclaredDialogKinds(restoredWorkerState);
  restoreCostState(restoredWorkerState);
  if (restoredWorkerState !== null) claimCostLedgerForCurrentSession();
  restoreChromeSetupOfferState(restoredWorkerState);
  markHostRendersChromeSetupOffer();
  restoreMemoryToggle(restoredWorkerState);
  restoreToolsKeptByClear(restoredWorkerState);
  applyPicturesToHide(headlessIO.sessionState, messages);
  await removePlacedCopiesOfDeletedFiles(await removeDeletedChatFiles(restoredWorkerState));
  adoptInternalWindows(session, restoredWorkerState, headlessIO.sessionState, setAppState);
  lazyPrintModules2.restoreMemoryExtractPlace(
    session.host,
    restoredWorkerState?.internal?.memory_extract_place,
  );
  await restoreExcludeDynamicSections(restoredWorkerState, options);
  restoreProactivityOptIn(restoredWorkerState, {
    getAppState,
    setAppState,
    sessionState: headlessIO.sessionState,
  });
  try {
    restoreDurableWatches(restoredWorkerState, {
      sink: (patch) => headlessIO.sessionState.notifyInternalMetadataChanged(patch),
      storageV5: options.storageV5,
      reread: () => headlessIO.rereadWorkerState(),
    });
  } catch (error) {
    logError(error);
  }
  settleWorkerPermissionModeRecord(headlessIO.sessionState, getAppState().toolPermissionContext.mode, {
    planModeOnResume,
    restored: restoredWorkerState,
    restartedWorker: isWorkerEpochAfterFirst(env.CLAUDE_CODE_WORKER_EPOCH),
  });
  syncUltracodeActive(headlessIO.sessionState, getAppState().ultracode, restoredWorkerState);
  let resumeLaneOptions = getResumeLaneOptions();
  let resumeInterruption = await resolveResumeInterruption({
    restored: restoredWorkerState,
    load: {
      turnInterruptionState,
      supersededToolUseIds,
      rescueSuppressed,
    },
    chain: messages,
    tools: toolsWithMcp,
    forwarding: isRemoteToolForwardingSwitchOn(),
    findUnresolved: (callIds) => findUnresolvedToolUses(callIds, options.storageV5),
    findOnPrunedBranch: (toolUseId) => findUnresolvedToolUseOnAPrunedBranch(toolUseId, options.storageV5),
    lane: resumeLaneOptions,
  });
  let { turnInterruptionState: turnInterruptionState_2, journaledToolUses } = resumeInterruption;
  let bootPark = await restoreParkedPrompt({
    restored: restoredWorkerState,
    turnInterruptionState,
    chain: messages,
    supersededToolUseIds,
    supersededToolNames,
    journaled: resumeInterruption,
    tools: startupTools,
    findUnresolved: (toolUseId) => findUnresolvedToolUseAnywhere(toolUseId, options.storageV5),
    lane: resumeLaneOptions,
  });
  let {
    parkedPermission,
    supersededToolUseIds: supersededToolUseIds_2,
    supersededToolNames: supersededToolNames_2,
    pendingActionClass,
  } = bootPark;
  let parkedAgentAsk = holdParkedAgentAsk({
    restored: restoredWorkerState,
    bootPark,
    cutOffCallIds: resumableAgentIds,
    planned: agentResumes,
    answerKind: applyPermissionAnswerChanges.kind,
    io: headlessIO,
    answerOff: resumeLaneOptions.inheritedAnswerOff,
  });
  let { servedCallsToAdopt, servedCallsNeverSent, journaledServedCalls } = await planServedCallAdoption({
    restored: restoredWorkerState,
    supersededToolUseIds: supersededToolUseIds_2 ?? new Set(),
    parkedToolUseId: parkedPermission?.tool_use_id,
    journaledToolUses,
    adoptionTools: toolsWithMcp,
    findUnresolved: (callIds) => findUnresolvedToolUses(callIds, options.storageV5),
    forwarding: isRemoteToolForwardingSwitchOn(),
    hasRemoteToolCalls: isRemoteToolForwardingEnabled,
    flagWaitMs: PRINT_TURN_FLUSH_DELAY_MS,
  });
  if (
    (parkedPermission !== undefined || servedCallsToAdopt.length > 0) &&
    restoredOrphans.length === 0 &&
    lostSessionTimers.length === 0 &&
    agentResumePlan.length === 0 &&
    turnInterruptionState_2?.kind === "interrupted_prompt" &&
    isPlainInterruptMarker(turnInterruptionState_2.message)
  )
    await withDeadline(
      initializeGrowthBook().catch(() => null),
      PRINT_TURN_FLUSH_DELAY_MS,
    );
  let bootRetiredToolUseIds = cancelStaleParkedPrompt(headlessIO, restoredWorkerState, {
    ...bootPark,
    keepRequestIds:
      parkedAgentAsk === undefined
        ? bootPark.keepRequestIds
        : new Set([...bootPark.keepRequestIds, parkedAgentAsk.card.request_id]),
    reportKept: headlessIO.isRemoteTransport() && resumeLaneOptions.holdsInputBehindPrompt?.() === true,
  });
  headlessProfilerCheckpoint("after_loadInitialMessages");
  profileCheckpoint("after_loadInitialMessages", {
    once: true,
  });
  markStartupPhase("transcript_hydrated", `messages=${messages.length}`);
  let userSpecifiedModelSetting = getUserSpecifiedModelSetting();
  await ensureModelStringsInitialized({
    sessionModelIsProviderId:
      userSpecifiedModelSetting != null &&
      !modelSettingResolvesThroughModelStrings(userSpecifiedModelSetting),
  });
  headlessProfilerCheckpoint("after_modelStrings");
  let verbose = options.outputFormat === "json" && options.verbose;
  let verboseMessages = [];
  let lastMessage;
  let weakSet = new WeakSet();
  let weakSet_2 = new WeakSet();
  let weakMap = new WeakMap();
  let lastResult;
  let assistantTextTracker = createAssistantTextTracker();
  let printTurns = options.outputFormat !== "json" && options.outputFormat !== "stream-json";
  let turnEndPrinter = new TurnEndPrinter({
    maxTurns: options.maxTurns,
    maxBudgetUsd: options.maxBudgetUsd,
  });
  let drainedMessageCount = 0;
  let sawSystemInit = false;
  let writeFailure;
  let heldStartupNotice;
  let pendingBeforeInit = [];
  recordPhase("headless_post_load_ms", performance.now() - startTime_5, startTime_5);
  headlessProfilerCheckpoint("before_runHeadlessStreaming");
  markStartupPhase("starting_query_loop");
  for await (let message of _runHeadlessStreamingForTesting(
    session,
    headlessIO,
    mcp.clients,
    clients,
    toolsWithMcp,
    messages,
    canUseTool,
    storeSetter,
    getAppState,
    setAppState,
    appStateEmitter,
    agentPool,
    {
      ...options,
      permissionPromptToolServerName,
      permissionPromptToolBinding: promptToolBinding,
      handbackPointerResults: weakSet,
      lateReleasedResults: weakSet_2,
      autoModeStopNotices: weakMap,
      markStartupPhase,
      workerDirSync,
      turnGate: turnGateParticipants,
      homeSeed,
      turnEndUploadListener,
      planModeOnResume,
      restoredOrphans,
      alsoResumable,
      agentResumes,
      cutOffAgents: agentResumePlan,
      keptSubagentAsk: parkedAgentAsk,
      lostSessionTimers,
      rescueSuppressed,
      restoredWorkerMetadata: restoredWorkerState,
      answeredToolUseIds,
      transcriptAnchor,
      initialMessagesOrigin: messagesOrigin,
      openingRowsMade: openingRows,
      overdueSessionStartHooks,
      diskBehindReminder,
      followUpsAtStartUp,
      remoteControlForkChild,
      pluginForwardingAdmission,
      deviceHooksAdmission,
      remoteToolsAdmission,
      turnHandoffAdmission: turnHandoff,
      usesRelayMarker: carriedWrites,
      sessionHooks: appState,
      servedCallsToAdopt,
      servedCallsNeverSent,
      journaledServedCalls,
      supersededToolNames: supersededToolNames_2,
      parkLane: resumeLaneOptions,
      recordedThinking: readRecordedThinkingSettings(restoredWorkerState),
      switchedOffMcpServers: cloudPluginSwitches,
      holdOpenFor: findParkedPromptOpener({
        park: parkedPermission,
        openerUuid: interruptedPromptUuid(turnInterruptionState_2),
        conversation: messages,
      }),
    },
    turnInterruptionState_2,
    supersededToolUseIds_2,
    deferredToolUse,
    parkedPermission,
    bootRetiredToolUseIds,
    fromEnum(resumeInterruption.offChainToolNames.size > 0 ? "journaled_off_chain" : pendingActionClass),
    restoredWorkerState?.initParkReport,
  )) {
    let stamped = message.type === "result" ? resultStamper.stamp(message) : message;
    let handedBack = weakSet.has(message);
    let lateReleased = weakSet_2.has(message);
    let autoModeNotice = weakMap.get(message);
    if (!sawSystemInit && isInformationalSystemMessage(stamped)) {
      pendingBeforeInit.push(stamped);
      continue;
    }
    drainedMessageCount++;
    if (drainedMessageCount === 1) markStartupPhase("first_message_drained", `type=${stamped.type}`);
    let startupNotice =
      takeNoServerCheckNotice(false) ??
      (sdkSupportsFallbackDialog()
        ? undefined
        : takeServerFallbackAnnouncement(() =>
            isServerClassifierOff(getAppState().toolPermissionContext.mode),
          ));
    if (startupNotice !== undefined)
      if (options.outputFormat === "stream-json" && options.verbose)
        heldStartupNotice = createSystemMessage(startupNotice, "warning");
      else
        process.stderr.write(`${startupNotice}
`);
    if (!sawSystemInit && stamped.type === "system" && stamped.subtype === "init") {
      sawSystemInit = true;
      markStartupPhase("system_init_emitted");
    }
    let released = sawSystemInit ? pendingBeforeInit.splice(0) : [];
    if (options.outputFormat === "stream-json" && options.verbose)
      try {
        let isInit = stamped.type === "system" && stamped.subtype === "init";
        if (sawSystemInit && !isInit && heldStartupNotice) {
          let held = heldStartupNotice;
          heldStartupNotice = undefined;
          await headlessIO.write({
            ...held,
            session_id: getSessionId(),
          });
        }
        await headlessIO.write(stamped);
        if (sawSystemInit && restrictedModelNotice) {
          let heldRow = restrictedModelNotice;
          restrictedModelNotice = undefined;
          await headlessIO.write(withWireModelRestriction(heldRow));
        }
        if (sawSystemInit && noteRow) {
          let { notice, reminder } = noteRow;
          noteRow = undefined;
          await headlessIO.write(informationalSystemMessage(notice));
          if (messages.includes(reminder)) enableCodeMode();
        }
        if (sawSystemInit && heldStartupNotice) {
          let held = heldStartupNotice;
          heldStartupNotice = undefined;
          await headlessIO.write({
            ...held,
            session_id: getSessionId(),
          });
        }
        for (let queued of released) await headlessIO.write(queued);
      } catch (error) {
        writeFailure = {
          message: stamped,
          error,
        };
        break;
      }
    for (let candidate of [stamped, ...released])
      if (isLastMessageCandidate(candidate)) {
        if (verbose) verboseMessages.push(candidate);
        if (handedBack) lastMessage = lastResult ?? candidate;
        else if (!isInformationalSystemMessage(candidate) && !isApiRetrySystemMessage(candidate)) {
          lastMessage = candidate;
          if (candidate.type === "result") lastResult = candidate;
        }
        if (printTurns && !handedBack) {
          trackAssistantText(assistantTextTracker, candidate);
          if (candidate.type === "result")
            turnEndPrinter.printAtTurnEnd(
              candidate,
              lateReleased ? undefined : assistantTextTracker.partialForResult,
              autoModeNotice,
            );
        }
      }
  }
  if (writeFailure) {
    await endHeadlessSessionOnOutputWriteFailure(
      session,
      headlessIO,
      writeFailure.message,
      writeFailure.error,
      drainedMessageCount,
    );
    return;
  }
  switch (options.outputFormat) {
    case "json":
      if (!lastMessage || lastMessage.type !== "result") {
        process.stderr.write(`Error: No messages returned from query
`);
        logForDebugging("runHeadless: no result message returned from query", {
          level: "error",
        });
        gracefulShutdownSync(1);
        return;
      }
      if (options.verbose) {
        writeToStdout(
          ndjsonStringifyWithReplacer(verboseMessages) +
            `
`,
        );
        break;
      }
      writeToStdout(
        ndjsonStringifyWithReplacer(lastMessage) +
          `
`,
      );
      break;
    case "stream-json":
      break;
    default:
      if (!lastMessage || lastMessage.type !== "result") {
        process.stderr.write(`Error: No messages returned from query
`);
        logForDebugging("runHeadless: no result message returned from query", {
          level: "error",
        });
        gracefulShutdownSync(1);
        return;
      }
      turnEndPrinter.printAtExit(lastMessage, assistantTextTracker.partialForResult);
  }
  logHeadlessProfilerTurn();
  if (isExtractModeActive() || lazyPrintModules2.isLaptopExtractActive(session.host))
    await lazyPrintModules2.drainPendingExtraction(session.host);
  await flushPendingAsyncRewakeHooks();
  await Promise.race([
    Promise.all([
      import("../services/syncedFiles/syncedFileSyncer.js")
        .then((syncModule) => syncModule.drainSyncedFiles())
        .catch(() => {}),
      workerDirSync?.then((dirSync) => dirSync?.drain()).catch(() => {}),
    ]),
    sleep(5000, undefined, {
      unref: true,
    }),
  ]);
  let transportClosedPermanently =
    headlessIO instanceof RemoteIO && headlessIO.permanentCloseCode !== undefined;
  if (logStartupPhases && lastMessage?.type !== "result") {
    let exitReason;
    if (transportClosedPermanently) exitReason = "transport closed permanently";
    else if (drainedMessageCount === 0)
      exitReason = "zero messages drained \u2014 input stream ended before any output";
    else if (!sawSystemInit) exitReason = "input stream ended before system/init was emitted";
    else exitReason = "input stream ended without a result message";
    process.stderr
      .write(`SDKStartup: exiting without result: ${exitReason} (last_phase=${lastStartupPhase}, drained=${drainedMessageCount}, exit=${transportClosedPermanently ? 1 : 0})
`);
  }
  let exitCode =
    (lastMessage?.type === "result" && lastMessage?.is_error) || transportClosedPermanently
      ? 1
      : options.outputFormat === "stream-json"
        ? 0
        : (getLocalCommandExitCode() ?? 0);
  let exitCode_2 = await sweepOnFullDisk({
    outputFormat: options.outputFormat,
    sdkUrl: options.sdkUrl,
    exitCode,
    io: headlessIO,
  });
  transportStateByHost.of(session).setActive(undefined);
  gracefulShutdownSync(exitCode_2);
}
//@ chunk-0yw3taqg.js:694982-695032 sole-consumer
function isModelDifferentFromRestricted(userSpecifiedModel, restrictedStartupModel) {
  return (
    userSpecifiedModel === undefined ||
    parseUserSpecifiedModel(userSpecifiedModel) !== parseUserSpecifiedModel(restrictedStartupModel)
  );
}
//@ chunk-0yw3taqg.js:695168-695277 sole-consumer
/**
 * 判断一次模型写入是否与当前窗口不一致：写入值存在、新旧模型相同，但写入的模型解析后与先前生效的模型不同。
 */
function isWindowDivergentWrite({ writtenModel, prevModel, newModel, prevActive }) {
  return (
    writtenModel !== undefined &&
    newModel === prevModel &&
    parseUserSpecifiedModel(writtenModel) !== parseUserSpecifiedModel(prevActive ?? prevModel)
  );
}
//@ chunk-0yw3taqg.js:695277-695360 sole-consumer
function resolveSessionCwd(snapshot) {
  let cwd = getSessionProject(snapshot).cwd;
  try {
    resolvePhysicalCwd(cwd);
    return cwd;
  } catch {
    return getSessionProject(snapshot).originalCwd;
  }
}
//@ chunk-0yw3taqg.js:695360-695441 sole-consumer
function isAdvertisedCommand(caps) {
  return caps.terminalOriented !== true || caps.advertisedOnHostedSessions === true;
}
//@ chunk-0yw3taqg.js:695441-695455 sole-consumer
var OAUTH_FLOW_JOIN_WINDOW_MS = 600000;
//@ chunk-0yw3taqg.js:695455-695583 affinity
/**
 * 已有的 OAuth 流程是否可复用（同一登录方式、同一组织、尚未收到授权码、10 分钟内）。
 */
function canJoinOAuthFlow(state, withClaudeAi, forceLoginOrgUUID, orgUuid) {
  return (
    state.loginWithClaudeAi === withClaudeAi &&
    state.orgUUID === forceLoginOrgUUID &&
    !state.service.hasReceivedAuthorizationCode() &&
    orgUuid - state.startedAt < OAUTH_FLOW_JOIN_WINDOW_MS
  );
}
//@ chunk-0yw3taqg.js:695583-898487 callgraph-witnessed (2.1.88 match: runHeadlessStreaming, 0.16)
/**
 * runHeadlessStreaming：headless 主循环。读取输入消息与 control_request（initialize、interrupt、set_model、set_permission_mode、mcp_set_servers、rewind_files 等约 90 种子类型），排队执行查询轮次并产出 SDK 消息。
 */
function _runHeadlessStreamingForTesting(
  session,
  structuredIO,
  clients,
  sdkMcpServers,
  tools,
  messages,
  canUseTool,
  sdkMcpServerConfigs,
  getAppState,
  setAppState,
  subscribe,
  initialAppState,
  options,
  turnInterruptionState,
  supersededToolUseIds,
  deferredToolUse,
  parkedPermission,
  bootRetiredToolUseIds,
  pendingActionClass,
  initParkReport,
) {
  let messageQueue = options.messageQueue;
  let panelModHold = new UnseenPanelModInputHold(messageQueue, () => clientRegistry.list().length > 0);
  let store = {
    getState: getAppState,
    setState: setAppState,
    subscribe,
  };
  let mcpConnectionStore = McpConnectionStore.over(store);
  let pluginsStateStore = PluginsStateStore.over(store);
  let startupReleased = false;
  let pluginCache;
  session.mcpSessionWiring.registerConnections(mcpConnectionStore);
  computerUseOwnerLock.of(session).acquire(ComputerUseStateCell.over(store));
  if (structuredIO instanceof RemoteIO) {
    startCpuSampling(structuredIO.sessionState, getAppState, session.host.clock);
    startHostCpuSampler(createTaskFramework(getAppState, setAppState));
    startToolCpuSampling(structuredIO.sessionState, getAppState, session.host.clock);
    createWatch(structuredIO.sessionState, session.host.clock, PROC_FS_READER_WITH_LINKS);
  }
  let neverFalse = () => false;
  let receivedMessageUuids = RECEIVED_MESSAGE_UUIDS.of(session);
  let hostIngressLanes = HOST_INGRESS_LANES.of(session);
  let heldInMemory = makeHeldMessageMatcher(messages, () => messages, getSessionId);
  let heldTurnUuids = isSelfHostedHeldRecognition() ? interruptedTurnUuids(messages) : new Set();
  let sessionId = getSessionId();
  let storeRewindStandIn = makeRewindStandInWriter(
    {
      conversation: () => conversationRows,
      append: appendToConversation,
      appendsSettled: () => orderedRows.settled(),
      storageV5: options.storageV5,
    },
    messages,
  );
  let redeliveryResolver = new RedeliveryResolver({
    io: structuredIO,
    messageQueue,
    receivedMessageUuids,
    transcript: createTurnPersistenceChecks({
      storageV5: options.storageV5,
      heldInMemory,
    }),
    holds: (uuid) => parkedPermissions.heldMessage() === uuid || parkedPermissions.waitsForItsReRun(uuid),
    storeRewindStandIn,
    hasRewindTarget: (uuid) => hasRewindTarget(conversationRows, uuid),
    noteClosedUnrun: (uuid, outcome) =>
      reportRedeliveredFollowupClosed(
        conversationRows,
        uuid,
        outcome === "cancelled" ? "cancelled" : "later",
      ),
  });
  let deliveryLedger = new DeclinedRedeliveryBatcher({
    io: structuredIO,
    messageQueue,
    declined: redeliveryResolver,
    onBatch: (batch, status) => {
      if (status === "settled" && isTeardownUnwindRequested()) return;
      parkedPermissions.noteBatch(batch, status);
    },
  });
  let runState = new PrintRunState();
  let turnInterruption = detectTurnInterruption(turnInterruptionState, messages);
  let lastPromptUuid =
    turnInterruptionState?.kind === "interrupted_prompt"
      ? turnInterruption
      : findLastUserPromptUuid(messages);
  runState.noteStoredLastPrompt(lastPromptUuid);
  let wasInterruptedPrompt = turnInterruptionState?.kind === "interrupted_prompt";
  let refetchAttemptedUuids = new Set();
  let storedPrompt =
    lastPromptUuid === undefined
      ? undefined
      : messages.findLast((message) => message.uuid === lastPromptUuid);
  let heldBackResult = null;
  let loopWakeupsInFlight = 0;
  let canReleaseHeldResult = () =>
    heldBackResult !== null && lazyCronTools.isKairosCronEnabled() && !hasReachedBudget(options.maxBudgetUsd);
  let canEndTurn = () => runState.inputClosed && canReleaseHeldResult() && isTidySlothGateOn();
  let remoteControlForkChild = options.remoteControlForkChild ?? null;
  let forkSupported = isBridgeForkSupported(options.sdkUrl);
  let startupWorkReleased = false;
  let releaseStartupWorkOnce = () => {
    if (startupWorkReleased) return;
    startupWorkReleased = true;
    setImmediate(releaseStartupWork, session.host, "host_initialized");
  };
  let pendingWorkflowLaunches = 0;
  let rewindLimitAsked = false;
  let deferred = Promise.withResolvers();
  let clearBeforeRun = options.parkLane.runsBeforeClear
    ? () => Promise.resolve(true)
    : createTeardownStatusReporter({
        io: structuredIO,
        details: parkedPermission?.details,
        holding: () => parkedPermissions.holdingParkedPermission(),
        statusTaken: () => runState.running || structuredIO.hasStandingPrompt(),
        tornDown: () => isShuttingDown() || isTerminalShutdown(),
        whenTornDown: () => deferred.promise,
        boundMs: COST_PUSH_INTERVAL_MS,
        onUnconfirmed: (detail) =>
          logForDebugging(
            `[print.ts] A parked permission's call was not run: its record's delete was not confirmed (${detail})`,
            {
              level: "warn",
            },
          ),
        onError: (context, error) => logError(error),
      });
  let intentBatchInFlight = false;
  let recapStarted = false;
  let recapResultKnown = false;
  let unattendedStart = structuredIO.isRemoteTransport()
    ? new UnattendedStartRecord(
        structuredIO,
        options.restoredWorkerMetadata ?? null,
        {
          flagsFetched: initializeGrowthBook,
          exiting: isTerminalShutdown,
        },
        options.unattendedStartsTimings,
      )
    : undefined;
  let errorRowByUuid = new Map();
  let storedDenyLists = disallowedToolsFromMessages(messages);
  let parkedPermissions = new ParkedPermissionController({
    markAnswer: unattendedStart?.answers,
    parkedPermission,
    holdOpenFor: options.holdOpenFor,
    interruptedTurnsPrompt: turnInterruption,
    fromInterruptedTurnsPrompt: collectInterruptedTurnsPrompt(messages, turnInterruption),
    turnInterruptionState,
    supersededToolUseIds,
    bootRetiredToolUseIds,
    answeredToolUseIds: options.answeredToolUseIds,
    initParkReport,
    pendingActionClass,
    cutOffAgentCalls: collectResumableAgentIds(options.supersededToolNames).size,
    resumedAgentCalls: options.agentResumes?.flatMap((agentResume) => agentResume.call ?? []),
    keptSubagentAsk: options.keptSubagentAsk,
    servedCallsToAdopt: options.servedCallsToAdopt,
    servedCallsNeverSent: options.servedCallsNeverSent,
    journaledServedCalls: options.journaledServedCalls,
    withdrawCard: (requestId) =>
      structuredIO.write({
        type: "control_cancel_request",
        request_id: requestId,
      }),
    retirementWriter: {
      append: (row) => recordTranscript(row, undefined, undefined, undefined, options.storageV5),
      flush: () => flushSessionStorage(),
      storedForNextWorker: async (rows) => {
        await structuredIO.flushInternalEvents();
        return structuredIO.refusedInternalEvents(rows).length === 0;
      },
    },
    endStoppedTurn: (rows) => {
      let promptUuid = interruptedPromptUuid(turnInterruptionState);
      let listed;
      try {
        let markerIndex =
          turnInterruptionState?.kind === "interrupted_prompt"
            ? conversationRows.findIndex(
                (row) => row.uuid === turnInterruptionState.message.uuid && isInterruptMarkerRow(row),
              )
            : -1;
        listed =
          promptUuid === undefined
            ? undefined
            : heldUuidsAnsweredByTurn(
                [
                  ...conversationRows.filter(
                    (row, index) =>
                      markerIndex === -1 ||
                      (index !== markerIndex &&
                        !(index === markerIndex + 1 && isNoResponseRequestedMessage(row))),
                  ),
                  ...rows,
                ],
                promptUuid,
              );
      } catch (error) {
        logError(error);
      }
      for (let retirementRow of retirementPromptRows({
        sessionId: getSessionId(),
        prompt: promptUuid,
        listed,
        retirementRows: rows,
        othersToCome:
          runState.endSessionRequested || isShuttingDown() || isTerminalShutdown()
            ? 0
            : getQueuedUserTurnCount(messageQueue) +
              (runState.intentBatchInFlight && intentBatchInFlight ? 1 : 0),
      }))
        output.enqueue(retirementRow);
    },
    clearBeforeRun,
    receivedAnswersRead: () => structuredIO.whenReceivedAnswersRead(),
    answers: applyPermissionAnswerChanges,
    lane: options.parkLane,
    io: structuredIO,
    drain: runState,
    messageQueue,
    declinedRedeliveries: redeliveryResolver,
    store,
    kick: () => void kickQueue(),
    isShuttingDown,
    isTerminalShutdown,
    findUnresolvedToolUse: createUnresolvedToolUseFinder({
      supersededToolUseIds,
      tookOverAPrompt: parkedPermission !== undefined,
      storageV5: options.storageV5,
    }),
    reportInheritedPromptDecided: () => reportInheritedPromptDecided(),
    reportIdleAtTurnEndAllowed: () => idleAtTurnEndAllowed(),
    dropLoaderSyntheticRows,
    removeInterruptedMessage: (interruptedUserMessage) => {
      let index = conversationRows.findIndex((row) => row.uuid === interruptedUserMessage.uuid);
      let apiErrorRow =
        index === -1
          ? undefined
          : conversationRows
              .slice(index + 1)
              .findLast((row) => row.type === "assistant" && row.isApiErrorMessage === true);
      if (apiErrorRow !== undefined) errorRowByUuid.set(interruptedUserMessage.uuid, apiErrorRow);
      removeInterruptedMessage(conversationRows, interruptedUserMessage);
    },
    putAheadOfLoaderRows: (message) =>
      restoreInterruptedPrompt(conversationRows, turnInterruptionState, message),
    sendsTheInterruptedTurnHolds: (message) => answeredHeldUuids(conversationRows, message.uuid),
    sendsOfTheCompactedTurn: (message, second) =>
      runningTurnSendsForTurn(conversationRows, message.uuid, second),
    sendsTheParkedTurnTookIn: (message, second) =>
      getParkedTurnSendUuids(conversationRows, message.uuid, second),
    adoptedServedCallsCommand: (calls) =>
      buildOrphanedPermissionPrompt({
        calls,
        tools,
        supersededToolNames: options.supersededToolNames,
        servedCallsNeverSent: options.servedCallsNeverSent,
      }),
    lostCallsNote: (message, second) => ccrLostCallsNote(options, message, second),
    inFlightServedCalls: () => toolState.get(ServedCallRegistry),
    presentAdoptedHostTools: (calls) =>
      countPowerShellCallsWhenDisabled(toolState.get(BridgeToolProvider), calls),
    servedElsewhere: (call, context) => isRemoteCapableCall(call, context, tools),
  });
  let runSafelyOrEmpty = (fn) => {
    try {
      return fn();
    } catch (error) {
      logError(error);
      return [];
    }
  };
  let declinesWithdrawalOf = (messageUuid) => {
    try {
      return parkedPermissions.declinesWithdrawalOf(messageUuid);
    } catch (error) {
      logError(error);
      return true;
    }
  };
  let sdkResultReporter = new SdkResultReporter({
    recentErrors: () => getInMemoryErrors().map((entry) => entry.error),
  });
  let deferredTool = deferredToolUse;
  let teamTeardownGaveUp = false;
  clearTeardownUnwind();
  let notificationWaits = new Map();
  let isShutdownInterrupt = () =>
    runState.abortController !== undefined &&
    runState.abortController.signal.aborted &&
    shutdownInterruptStamp(runState.abortController.signal) === true;
  let budgetPollTimer;
  let stopBudgetPoll = () => {
    if (budgetPollTimer !== undefined) {
      clearInterval(budgetPollTimer);
      budgetPollTimer = undefined;
    }
  };
  let startBudgetPoll = () => {
    let maxBudgetUsd = options.maxBudgetUsd;
    if (maxBudgetUsd === undefined || budgetPollTimer !== undefined) return;
    budgetPollTimer = setInterval(
      (getAppState, maxBudgetUsd, disarm, setAppState, isShuttingDownCheck, storageV5) => {
        try {
          if (isShuttingDown() || isShuttingDownCheck()) {
            disarm();
            return;
          }
          if (
            stopAgentsOverBudget({
              maxBudgetUsd,
              abortedForShutdown: false,
              turnAborted: true,
              getAppState,
              setAppState,
              storageV5,
            })
          ) {
            disarm();
            return;
          }
          if (!hasAwaitedRunningTaskIn(getAppState().tasks)) disarm();
        } catch (error) {
          disarm();
          logFeatureBad("per_task_stop_sparing", "budget_poll_sweep_throw");
          logError(error);
          logForDebugging(
            "[print.ts] spared-budget poll sweep failed; poll disarmed (error in error log when reporting is enabled)",
            {
              level: "error",
            },
          );
        }
      },
      100,
      getAppState,
      maxBudgetUsd,
      stopBudgetPoll,
      setAppState,
      isShutdownInterrupt,
      options.storageV5,
    );
    budgetPollTimer.unref?.();
  };
  let isSessionEnding = () =>
    isShuttingDown() || isShutdownInterrupt() || runState.endSessionRequested || runState.inputClosed;
  let keepaliveAfterStop = new KeepaliveAfterStop({
    sendKeepAlive: createKeepAliveSender(structuredIO.outbound),
    getTasks: () => getAppState().tasks,
    getTurnSignal: () => runState.abortController?.signal,
    isSessionEnding,
  });
  let spareTasksForStop = () => {
    let taskContext = {
      taskRegistry: createTaskFramework(getAppState, setAppState),
      setAppState,
      storageV5: options.storageV5,
    };
    if (getSdkPerTaskStopAffordance()) {
      logFeatureOk("per_task_stop_sparing", {
        spared: true,
      });
      stopObserverAgents(taskContext);
      startBudgetPoll();
    } else {
      logFeatureOk("per_task_stop_sparing", {
        spared: false,
      });
      stopAllRunningTasks(taskContext);
    }
    keepaliveAfterStop.arm();
    return taskContext;
  };
  let prewaitLatch = new PrewaitLatch({
    messageQueue,
    heldAheadOfTheQueue: (heldCommand) =>
      heldCommand && !isStopOfHeldMessagesEnabled()
        ? []
        : userFrameIntake
            .parkedCommands()
            .filter((parkedCommand) => !parkedPermissions.wouldHoldIfQueuedNow(parkedCommand)),
    commandLacksUserIntent: isPassiveCommand,
  });
  let unsubscribeCommandsDiscarded = commandsDiscarded.subscribe((turns) => {
    for (let turn of turns) turn.handedOffTurn?.release?.();
  });
  let abortController = createAbortController(500);
  let abortController_2 = createAbortController(500);
  let sideQuestionRequests = new Map();
  let output = structuredIO.outbound;
  let extractPlacePusher = new MemoryExtractPlaceGate(session.host, structuredIO);
  let keepAliveSender = createKeepAliveSender(output);
  let sigintSeen = false;
  let sigtermSeen = false;
  let sigintHandler = () => sigintSeen || sigtermSeen || output.ended || isTerminalShutdown();
  installLifecycleForwarderUnlessRemote(structuredIO, output);
  let stopping = () => isShuttingDown() || isTerminalShutdown() || isTeardownUnwindRequested() || sigtermSeen;
  let fetchHoldRegistry = createFetchHoldRegistry({
    stopping,
  });
  let coldFlagSettle;
  if (structuredIO instanceof RemoteIO && structuredIO.onCommandLifecycle !== undefined)
    structuredIO.onCommandLifecycle = fetchHoldRegistry.through(structuredIO.onCommandLifecycle);
  if (lazySessionInboxPointers)
    lazySessionInboxPointers.sessionInboxPointers.of(session).tapCommandLifecycle(structuredIO);
  settleOnTurnFinish(structuredIO);
  watchCommentWakeLifecycle(structuredIO);
  notificationSettleListenerSlot.of(session).listener = (frames) =>
    reportCommentWakesStarted("queued_notification", frames);
  let bridgeHandle = null;
  transportStateByHost.of(session).remoteBridgeLive = () => bridgeHandle !== null;
  let bridgeAttached = false;
  let bridgeEpoch = 0;
  let bridgeSession;
  let pendingModeChoice;
  let applyingState = false;
  function noteModeChoice(mode) {
    if (applyingState) return;
    if (bridgeSession) bridgeSession.noteModeChoice(mode);
    else if (pendingModeChoice !== undefined) pendingModeChoice = mode;
  }
  function setAppStateQuietly(updater) {
    applyingState = true;
    try {
      setAppState(updater);
    } finally {
      applyingState = false;
    }
  }
  let bridgeSdkController = createBridgeSdkController({
    storageV5: options.storageV5,
  });
  function bridgeAccountPayload(account, bridgeEpoch) {
    return {
      session_url: getRemoteSessionUrl(account.bridgeSessionId, account.sessionIngressUrl),
      connect_url: buildBridgeConnectUrl(account.environmentId, account.sessionIngressUrl),
      environment_id: account.environmentId,
      bridge_epoch: bridgeEpoch,
      bridge_session_id: account.bridgeSessionId,
    };
  }
  let resolved = Promise.resolve();
  let firstTurnGate;
  let enqueueResult;
  let handbackPending = false;
  let pendingHookRows;
  let loadedCompaction = compactionPreservedRows(messages, turnInterruption);
  let cutOffTurnOwed = () => parkedPermissions.cutOffTurnIsStillOwed() || isTeardownUnwindRequested();
  let userFrameIntake = new UserFrameIntake({
    admissionBarrier: () => switchSerializerSlot.of(session),
    firstTurnGate: () => firstTurnGate,
    messageQueue,
    drain: runState,
    receivedMessageUuids,
    declinedRedeliveries: redeliveryResolver,
    io: structuredIO,
    transcriptForFrame:
      heldTurnUuids.size > 0
        ? wrapPersistenceWithFollowupCheck(
            createPersistenceChecker({
              storageV5: options.storageV5,
              heldInMemory,
            }),
            (uuid) =>
              heldTurnUuids.has(uuid) && getSessionId() === sessionId && isSelfHostedHeldRecognition(),
            async (uuid) =>
              countUserPromptsFromEntries_4(
                await loadSessionTranscriptRows(sessionId, options.storageV5),
                uuid,
              ),
          )
        : createPersistenceChecker({
            storageV5: options.storageV5,
            heldInMemory,
          }),
    kick: () => void kickQueue(),
    retirementMayLandDuringReads: () => parkedPermissions.retirementMayLandDuringReads(),
    rescueOwnsReRun: () => parkedPermissions.rescueOwnsReRun(),
    idleTeeAllowed: () => idleAtTurnEndAllowed() && !structuredIO.hasStandingPrompt(),
    heldForParkedTurn: (uuid) =>
      parkedPermissions.heldMessage() === uuid || parkedPermissions.waitsForItsReRun(uuid),
    summarisedAway: (row) =>
      classifyRedeliveredRow(row, {
        loadedCompaction,
        carriesTheCutOffTurnOn: () => parkedPermissions.hasCarriedTheCutOffTurnOn(),
        anInheritedPromptWaits: () => parkedPermissions.inheritedPromptPending(),
        startedAtMs: (uuid) => structuredIO.userFrameStartedAtMs(uuid),
        noteCopyAwaitsTheCutOffTurn: () => parkedPermissions.noteCopyAwaitsTheCutOffTurn(),
        cutOffTurnIsStillOwed: cutOffTurnOwed,
      }),
    cutBehindItsCompaction: (uuid) =>
      !parkedPermissions.hasCarriedTheCutOffTurnOn() &&
      isRowFromLoadedCompaction({
        uuid,
        conversation: conversationRows,
        loadedCompaction,
      }),
    readAgain: (uuid) => structuredIO.readAgain(uuid),
    startAborted: (uuid) => prewaitLatch.startQueuedMessageAborted(uuid),
    prewaitLatch,
    earlierStartOf: (uuid) => {
      let startedAtMs = structuredIO.userFrameStartedAtMs(uuid);
      return startedAtMs === undefined
        ? undefined
        : {
            startedAtMs,
            inheritedPromptPending: parkedPermissions.inheritedPromptPending(),
            conversationHasCompactBoundary: conversationRows.some(isCompactBoundaryMessage),
            conversationHasMessageAsQueuedCommand: conversationRows.some(
              (row) => getSourceUuid(row) === uuid,
            ),
            followUp: foldedFollowUpTelemetry(options.followUpsAtStartUp?.get(uuid), {
              cardCanBeHeld: parkedPermissions.inheritedPromptHoldCapable(),
              openerKnown: turnInterruption !== undefined,
            }),
            endedTurnsCopy: compactionCopyTelemetry({
              uuid,
              loadedCompaction,
              carriesTheCutOffTurnOn: parkedPermissions.hasCarriedTheCutOffTurnOn(),
              finishedTail: weakMapLookup(turnInterruptionState),
              growthBookCold: needsGrowthBookRefresh(),
            }),
          };
    },
    leftToReRun: (uuid) => parkedPermissions.reRunAnswers(uuid),
    takenInAtAPrompt: (uuid) => (parkedPermissions.cardsTurnTookIn(uuid) ? cutOffTurnOwed : undefined),
    finishedAtStartUp: (uuid) =>
      tailDiagnosticsFields(weakMapLookup(turnInterruptionState), {
        uuid,
        nowMs: Date.now(),
        commandsDequeued: runState.dequeueCount,
        rerunOwed: parkedPermissions.rescueOwnsReRun(),
        shuttingDown: runState.endSessionRequested || isShuttingDown() || isTerminalShutdown(),
      }),
    noteReportedDoneUnrun: (uuid) => reportRedeliveredFollowupClosed(conversationRows, uuid, "on_arrival"),
    storeRewindStandIn,
    cutOffTurnOpenedBy: (toolUseId) =>
      turnInterruptionState?.kind === "interrupted_prompt" &&
      (turnInterruption === undefined || toolUseId === turnInterruption)
        ? {
            openerKnown: turnInterruption !== undefined,
            reRun: !parkedPermissions.hasCarriedTheCutOffTurnOn()
              ? "none"
              : !runState.running && !cutOffTurnOwed()
                ? "ended"
                : parkedPermissions.carryingTheCutOffTurnOnNow()
                  ? "under_way"
                  : "unclear",
            ...(turnInterruptionState.tail !== undefined && {
              tailKind: fromEnum(turnInterruptionState.tail.kind),
            }),
            ...(turnInterruptionState.tail?.shutdownStamped !== undefined && {
              shutdownStamped: turnInterruptionState.tail.shutdownStamped,
            }),
          }
        : undefined,
  });
  let serializeCall = serializeCalls((fn) => fn());
  let resolved_2 = Promise.resolve();
  let forwardedCount = 0;
  let diskBehindReminder = options.diskBehindReminder;
  let appliedRewind;
  let pendingReplyStamp;
  let forwardedUuids = new Set();
  let remoteForkSeed;
  function trimForwardedTail() {
    if (!remoteForkSeed) return;
    let commonPrefix = 0;
    while (
      commonPrefix < remoteForkSeed.length &&
      remoteForkSeed[commonPrefix]?.uuid === conversationRows[commonPrefix]?.uuid
    )
      commonPrefix++;
    remoteForkSeed.length = commonPrefix;
  }
  function forwardTranscriptToBridge() {
    if (!bridgeHandle) return;
    bridgeSdkController.noteTranscriptLocation();
    try {
      let startIndex = forwardedCount > conversationRows.length ? 0 : forwardedCount;
      let eligible = [];
      let withheld = [];
      for (let message of conversationRows.slice(startIndex)) {
        if (!isBridgeableMessage(message) || forwardedUuids.has(message.uuid)) continue;
        if (isCompactBoundaryOrSummary(message) && isCompactPairWithheldFromRemote()) {
          withheld.push(message);
          continue;
        }
        eligible.push(message);
      }
      if (pendingReplyStamp !== undefined) {
        let { anchor, userMessageUuid } = pendingReplyStamp;
        let anchorIndex = anchor === undefined ? -1 : conversationRows.indexOf(anchor);
        if (anchor === undefined || anchorIndex !== -1) {
          let assistantReply;
          for (let message of conversationRows.slice(anchorIndex + 1)) {
            if (isCompactBoundaryMessage(message)) {
              assistantReply = undefined;
              break;
            }
            if (!isRealAssistantMessage(message)) continue;
            if (assistantReply === undefined || supersedesMessage(message, assistantReply))
              assistantReply = message;
          }
          if (assistantReply !== undefined && eligible.includes(assistantReply))
            bridgeHandle.stampReply({
              assistantUuid: assistantReply.uuid,
              userMessageUuid,
            });
        }
      }
      if (eligible.length > 0) bridgeHandle.writeMessages(eligible);
      for (let message of eligible) forwardedUuids.add(message.uuid);
      for (let message of withheld) forwardedUuids.add(message.uuid);
      forwardedCount = conversationRows.length;
    } catch (error) {
      logForDebugging(`[bridge:sdk] transcript forward failed: ${toError(error).message}`, {
        level: "error",
      });
    }
  }
  function drainTaskEvents() {
    let events = drainTaskNotifications();
    if (events.some((event) => event.type === "conversation_reset")) {
      forwardedCount = 0;
      trimForwardedTail();
      clearLateSessionStartRows(lateSessionStartRows, options.overdueSessionStartHooks);
      diskBehindReminder = undefined;
      appliedRewind = undefined;
      remoteControlForkChild?.discardSeed();
    }
    if (bridgeHandle && events.length > 0)
      try {
        let stateFramesEnabled = isBridgeStateFramesEnabled();
        if (!stateFramesEnabled && events.some((event) => event.type === "conversation_reset"))
          setCurrentForKey(session, undefined);
        let mapped = events
          .filter(isEphemeralSdkFrame)
          .filter((event) => event.type !== "conversation_reset" || stateFramesEnabled)
          .map(stripCompactErrorForSdk);
        if (mapped.length > 0) bridgeHandle.writeSdkMessages(mapped);
      } catch (error) {
        logForDebugging(`[bridge:sdk] task-event forward failed: ${toError(error).message}`, {
          level: "error",
        });
      }
    return events;
  }
  function forwardSubagentFrame(frame) {
    if (!bridgeHandle) return;
    try {
      if ((frame.type === "assistant" || frame.type === "user") && frame.parent_tool_use_id != null) {
        let bridgeSubagentFrameGate = getBridgeSubagentFrameGate();
        if (shouldForwardSubagentMessage(bridgeSubagentFrameGate, frame))
          bridgeHandle.writeSdkMessages([frame]);
        return;
      }
      if (frame.type !== "system") return;
      if (!(
        frame.subtype === "thinking_tokens" ||
        frame.subtype === "api_retry" ||
        (frame.subtype === "status" && useShimmerAnimation(frame.status))
      ))
        return;
      bridgeHandle.writeSdkMessages([stripCompactErrorForSdk(frame)]);
    } catch (error) {
      logForDebugging(
        `[bridge:sdk] ${"subtype" in frame ? frame.subtype : frame.type} forward failed: ${toError(error).message}`,
        {
          level: "error",
        },
      );
    }
  }
  function statusFrame(permissionMode, uuid) {
    return {
      type: "system",
      subtype: "status",
      status: null,
      permissionMode,
      uuid,
      session_id: getSessionId(),
    };
  }
  function announceBridgeState() {
    if (!isSdkBridgeStateAnnounceEnabled()) return;
    forwardSubagentFrame(
      statusFrame(toExternalPermissionMode(getAppState().toolPermissionContext.mode), randomUUID()),
    );
  }
  let sdkEventDrain = installSdkEventDrain({
    drain: drainTaskEvents,
    emit: (frame) => output.enqueue(frame),
  });
  if (options.outputFormat === "stream-json" && options.sessionMirror)
    addSessionMirror((filePath, entries) => {
      structuredIO.write({
        type: "transcript_mirror",
        filePath,
        entries,
      });
    });
  let flushBufferedSdk = () => {};
  let onSigint = () => {
    logForDiagnosticsNoPII("info", "shutdown_signal", {
      signal: "SIGINT",
    });
    if (isShuttingDown()) {
      markStdoutDrainExternallyClocked();
      return;
    }
    if (runState.abortController && !runState.abortController.signal.aborted)
      runState.abortController.abort(userAbortReason("user-cancel"));
    flushBufferedSdk();
    abortController.abort();
    abortController_2.abort(userAbortReason("user-cancel"));
    markStdoutDrainExternallyClocked();
    gracefulShutdown(0);
  };
  process.on("SIGINT", onSigint);
  let sigtermHandling = false;
  let onSigterm = () => {
    if (sigtermHandling || isShuttingDown()) return;
    sigtermHandling = true;
    latchTerminalShutdown();
    killRunningShellCommands();
    flushBufferedSdk();
    abortController.abort();
    abortController_2.abort(userAbortReason("shutdown"));
    if (!sigintSeen && !sigtermSeen && !output.ended) extractPlacePusher.resendAtShutdown();
    gracefulShutdown(143);
  };
  process.on("SIGTERM", onSigterm);
  markPrintModeSignalHandlersRegistered();
  structuredIO.setOnStreamClosedWithParkedQuestion(() => {
    requestTeardownUnwind();
    stopBudgetPoll();
    if (runState.abortController && !runState.abortController.signal.aborted)
      runState.abortController.abort(userAbortReason("shutdown"));
  });
  registerCleanup(async () => {
    if (bridgeHandle)
      bridgeSdkController.persist(bridgeHandle, {
        atExit: true,
      });
    deferred.resolve();
    parkedPermissions.onShutdown();
    sdkResultReporter.reportTerminatedOnShutdown({
      aborted: runState.abortController?.signal.aborted === true,
      runPhase: runState.runPhase,
      exitCode: typeof process.exitCode === "number" ? process.exitCode : undefined,
    });
    let bgTaskCounts = {};
    for (let task of getRunningTasks(getAppState()))
      if (waitForTaskCompletion(task)) bgTaskCounts[task.type] = (bgTaskCounts[task.type] ?? 0) + 1;
    logForDiagnosticsNoPII("info", "run_state_at_shutdown", () => ({
      run_active: runState.running,
      run_phase: runState.runPhase,
      worker_status: structuredIO.sessionState.getState(),
      internal_events_pending: structuredIO.internalEventsPending,
      bg_tasks: bgTaskCounts,
      cc_version: {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
      ...bytecodeOrderStats(),
    }));
    logEvent("tengu_shutdown_pending_state", {
      had_live_turn: runState.running,
      worker_status: fromEnum(structuredIO.sessionState.getState()),
      pending_human_requests: structuredIO.pendingHumanRequestCount,
      replies_left_for_next_process: structuredIO.repliesLeftForNextProcess,
      internal_events_pending: structuredIO.internalEventsPending,
      exiting: isTerminalShutdown(),
    });
  });
  function emitModeStatus(newMode) {
    return emitStatusMessage(
      {
        io: structuredIO,
        getAppState,
      },
      newMode,
    );
  }
  installPermissionModeReporter(
    {
      io: structuredIO,
      getAppState,
    },
    (permissionMode, uuid) => {
      noteModeChoice(permissionMode);
      if (isSdkBridgeStateAnnounceEnabled()) forwardSubagentFrame(statusFrame(permissionMode, uuid));
      refreshAndReevaluateHeld("mode-changed");
    },
  );
  {
    let onProactivityChanged = alwaysFalse_2()
      ? makePermissionModeReader(getAppState, emitModeStatus)
      : () => notifyProactivityChanged(structuredIO.sessionState, getAppState());
    structuredIO.sessionState.onProactivityLevelChanged = onProactivityChanged;
    onProactivitySelectorChange(onProactivityChanged);
  }
  if (options.planModeOnResume === "restored" || options.planModeOnResume === "declined")
    structuredIO.sessionState.notifyPermissionModeChanged(getAppState().toolPermissionContext.mode);
  createPeerMessageRouter({
    output,
    io: structuredIO,
    hostIngressLanes,
    readMode: () => {
      let toolPermissionContext = getAppState().toolPermissionContext;
      return {
        mode: toolPermissionContext.mode,
        isBypassPermissionsModeAvailable: toolPermissionContext.isBypassPermissionsModeAvailable,
      };
    },
    remoteTransport: structuredIO instanceof RemoteIO,
    publishesAvailability: Boolean(env.CLAUDE_CODE_REMOTE || options.sdkUrl),
  });
  {
    let { startCrossSessionHoldReceipt } = require("../utils/crossSessionHoldReceipt.js");
    let crossSessionHoldReceipt = startCrossSessionHoldReceipt({
      clock: {
        setTimeout: (fn, delayMs) => {
          let timer = setTimeout(fn, delayMs);
          timer.unref();
          return () => clearTimeout(timer);
        },
      },
      transcript: {
        apply: (batch) => {
          for (let row of batch.type === "append" ? batch.messages : []) {
            if (row.type !== "system" || row.subtype !== "informational") continue;
            logForDebugging(`[headless] cross-session hold-receipt: ${row.content}`);
            let frame = {
              type: "system",
              subtype: "informational",
              content: row.content,
              level: "warning",
              uuid: row.uuid,
              session_id: getSessionId(),
            };
            output.enqueue(frame);
          }
        },
      },
      queue: messageQueue,
      wakesIdleSession: () => !runState.inputClosed,
      hidesFoldedNotices: true,
    });
    registerCleanup(async () => crossSessionHoldReceipt());
  }
  let autocompactReporter;
  if (env.CLAUDE_CODE_REMOTE) {
    let emitActiveGoal = (goal) => {
      output.enqueue({
        type: "active_goal",
        value: goal ? serializeGoalState(goal) : null,
        uuid: randomUUID(),
        session_id: getSessionId(),
      });
    };
    structuredIO.sessionState.onActiveGoalChanged = emitActiveGoal;
    emitActiveGoal(getAppState().activeGoal);
    autocompactReporter = installAutocompactStateReporter({
      session,
      sessionState: structuredIO.sessionState,
      enqueue: (status) => output.enqueue(status),
      readInputs: () => contextUsageInputs(),
      reportContextUsage: () => report(),
    });
  } else {
    structuredIO.sessionState.onAutocompactInputsChanged = () => {
      report();
      buildBridgeInitializeCommands(contextUsageInputs);
    };
    if (options.sdkUrl)
      initializeGrowthBook()
        .catch(() => {})
        .then(() => report());
  }
  let bangRunner = new BangCommandRunner();
  let remoteMcpTracker = new RemoteMcpTaskTracker();
  let pendingRateLimits = new Set();
  let rateLimitListener = (limits) => {
    pendingRateLimits.add(limits);
    let cleanup = () => {
      pendingRateLimits.delete(limits);
    };
    limits.then(cleanup, cleanup);
    return limits;
  };
  let rateLimitInfo = serializeCalls((fn) => fn());
  let resolved_3 = Promise.resolve();
  let sessionEndDeadline = 1 / 0;
  let promptSuggestionEmitter = createPromptSuggestionEmitter({
    emit: (frame) => output.enqueue(frame),
    promptSuggestions: () => options.promptSuggestions,
    shuttingDown: isShuttingDown,
    holdsResults: () => suggestionEmitter.holdsResults(),
    messages,
    getAppState,
  });
  let authStatusSubscription;
  if (options.enableAuthStatus)
    authStatusSubscription = AwsAuthStatusManager.getInstance().subscribe((status) => {
      output.enqueue({
        type: "auth_status",
        isAuthenticating: status.isAuthenticating,
        output: status.output,
        error: status.error,
        uuid: randomUUID(),
        session_id: getSessionId(),
      });
    });
  let rateLimitFrameRelay = createRateLimitFrameRelay({
    emit: (frame) => output.enqueue(frame),
    sessionState: structuredIO.sessionState,
    bridgeHandle: () => bridgeHandle,
  });
  let conversationRows = messages;
  let ownCardDeadline = new OwnCardDeadline({
    io: structuredIO,
    mainTranscript: () => conversationRows,
    isSessionEnding,
  });
  let unsubscribeRequestPending = structuredIO.onRequestPending(() => ownCardDeadline.arm());
  let orderedRows = orderedRowSource({
    keep: (rows) => {
      conversationRows.push(...rows);
    },
    rows: () => conversationRows,
    list: conversationRows,
    isHookable: true,
  });
  let filtered = (options.openingRowsMade ?? []).filter((row) => conversationRows.includes(row));
  if (filtered.length > 0) {
    let readFileState = appendRowsWithHooks(orderedRows, filtered, {
      fills: true,
    });
    if (readFileState instanceof Promise) readFileState.catch(logError);
  }
  headlessProfilerCheckpoint("before_extractReadFiles");
  let readFileState = restoreRemoteFileState(messages, cwd(), READ_FILE_STATE_CACHE_SIZE);
  headlessProfilerCheckpoint("after_extractReadFiles");
  let deferred_2 = Promise.withResolvers();
  if (isResumeFrameSeedEligible()) {
    applyArtifactResumeCarry(
      setAppState,
      collectResumeArtifactCarry(messages, {
        origin: options.initialMessagesOrigin ?? "local",
        seedEligible: true,
      }),
    );
    if (messages.some((row) => row.type !== "system"))
      rearmHeadlessCommentMonitors({
        initialMessages: messages,
        hostInitialized: deferred_2.promise,
        getAppState,
        storageV5: options.storageV5,
        transcriptAnchor: options.transcriptAnchor,
        buildContext: () =>
          ask(askCall(queryContext()), {
            abortController: new AbortController(),
            userSpecifiedModel,
          }),
        emit: (lines) => {
          for (let line of lines) output.enqueue(informationalSystemMessage(line));
        },
      });
  }
  registerMemoryAttributor("messages", () => ({
    entries: conversationRows.length,
  }));
  registerMemoryAttributor("file_state_cache", () => ({
    entries: readFileState.size,
    bytes: readFileState.calculatedSize,
  }));
  let sessionEnvVars = new Map();
  let toolState = new InstanceRegistry();
  setToolState(session, toolState);
  let sessionHooks = options.sessionHooks ?? createSessionHooksRegistry();
  let memorySelector = emptyPickerState();
  let clients_2 = getAppState().mcp.clients;
  let isolationLatch = createIsolationLatch(
    getCurrentSessionIsolationLatch() ??
      findIsolationLatchFromHistory(messages, tools, DEFAULT_EXEMPT_SERVERS, clients_2, session),
    (latch) => saveIsolationLatch(latch, options.storageV5),
  );
  androidEvidenceByHost.of(session.host).absorb(messages);
  if (!isParkedSpare()) devIntentTracker.of(session.host).start();
  let pendingSeeds = createRemoteFileState(READ_FILE_STATE_CACHE_SIZE);
  function cache() {
    for (let [path, seed] of pendingSeeds.entries()) {
      let existing = readFileState.get(path);
      if (!existing || seed.timestamp > existing.timestamp) readFileState.set(path, seed);
    }
  }
  function mergePendingSeeds() {
    cache();
    pendingSeeds.clear();
  }
  let pendingMemoryDirs = [];
  let liveAppender;
  function appendToConversation(rows) {
    if (liveAppender?.getMessages() === conversationRows) liveAppender.appendMessages(rows);
    else {
      let appended = appendRowsWithHooks(orderedRows, rows);
      if (appended instanceof Promise) appended.catch(logError);
    }
  }
  parkedPermissions.resumeInterruptedTurn();
  function dropLoaderSyntheticRows() {
    dropRedundantResumeMessages(conversationRows, turnInterruptionState, (index) => {
      if (forwardedCount > index) forwardedCount -= 1;
      trimForwardedTail();
    });
  }
  parkedPermissions.walkBackKeptRegistrationWithoutPark();
  let orphanRestoreContext = {
    orphans: options.restoredOrphans ?? [],
    messageQueue,
    interruptionKind: turnInterruptionState?.kind ?? "none",
    deferredResumePending: deferredToolUse !== undefined,
    rescueSuppressed: options.rescueSuppressed ?? false,
    tools,
    alsoResumable: options.alsoResumable,
    autoResumed: new Set(options.agentResumes?.map((agentResume) => agentResume.agentId)),
    lostTimers: options.lostSessionTimers ?? [],
    answerMarks: unattendedStart?.answers,
  };
  let keptSubagentAsk = isAmbientRunning() ? options.keptSubagentAsk : undefined;
  if (keptSubagentAsk === undefined) enqueueOrphanRestoreWake(orphanRestoreContext);
  else
    keptSubagentAsk.ask
      .waitEnd()
      .then((askOutcome) => {
        if (askOutcome !== "stopped")
          enqueueOrphanRestoreWake(
            orphanRestoreContext,
            askOutcome === "answered" ? keptSubagentAsk.card.tool_use_id : undefined,
          );
      })
      .catch(logError);
  let modelRows = () => {
    let modelOptions = buildModelPickerOptions();
    return {
      models: toSdkModelInfos(modelOptions.filter((option) => !option.disabled)),
      unavailable: toSdkModelInfos(getUnavailableModelRows(modelOptions)),
    };
  };
  let userSpecifiedModel = options.userSpecifiedModel;
  onSessionSwitchCallback(() => {
    userSpecifiedModel = undefined;
  });
  function activeModel() {
    return resolveSwitchedModel(userSpecifiedModel);
  }
  let usageLimitHeartbeat = retryWatchdogEnv()
    ? createUsageLimitWaitHeartbeat({
        readMainLoopModel: () => activeModel() ?? getMainLoopModel(),
        emit: (frame) =>
          output.enqueue({
            ...frame,
            uuid: randomUUID(),
            session_id: getSessionId(),
          }),
      })
    : () => {};
  let contextUsageInputs = () => ({
    messages: conversationRows,
    model: activeModel() ?? getMainLoopModel(),
    autoCompactWindow: getAppState().autoCompactWindow,
    resetBoundary: getCurrentForKey(session),
  });
  let reportUsage = () =>
    emitContextUsage({
      detail: "summary",
    });
  let { report, reportAtTurnEnd } =
    env.CLAUDE_CODE_REMOTE || options.sdkUrl
      ? createContextUsageReporter(structuredIO.sessionState, contextUsageInputs, reportUsage)
      : {
          report: () => {},
          reportAtTurnEnd: () => {},
        };
  report();
  let hasEffort = restoreThinkingSettingsFromRecord({
    launch: () =>
      new ThinkingDisplayState(
        options.thinkingConfig,
        options.thinkingConfigExplicit === true ? options.thinkingConfig : undefined,
      ),
    startupDisplay: undefined,
    recorded: options.recordedThinking ?? {
      malformed: false,
    },
    report: (record) => structuredIO.sessionState.notifyInternalMetadataChanged(record),
    log: ({ outcome, message, thinkingOff }) => {
      logEvent("tengu_thinking_budget_restored", {
        outcome: fromEnum(outcome),
        thinking_off: thinkingOff,
      });
      logForDebugging(`[print.ts] ${message} (thinking_off=${thinkingOff})`);
    },
  });
  let {
    conversationModel,
    injectModelSwitchBreadcrumbs,
    noticeRestrictedModel,
    recordAllowedModelApplied,
    noticeFlagSettingsModel,
  } = createModelChangeNotices({
    session,
    messages: () => conversationRows,
    appendToConversation,
    enqueue: (frame) => output.enqueue(frame),
    isLaunchModelPick: () => isLaunchModelPick(),
  });
  function announceInfo(text) {
    let systemMessage = createSystemMessage(text, "info");
    appendToConversation([systemMessage]);
    let frame = {
      type: "system",
      subtype: "informational",
      content: text,
      level: "notice",
      uuid: systemMessage.uuid,
      session_id: getSessionId(),
    };
    output.enqueue(frame);
  }
  let hostPromptSupersedes = env.CLAUDE_CODE_HOST_PROMPT_SUPERSEDES_RECORD;
  let modelControl = {
    surface: lit("print"),
    session,
    storageV5: options.storageV5,
    credentials: options.credentials,
    readAppState: getAppState,
    getActiveModel: () => userSpecifiedModel,
    applyModel: (model) => {
      userSpecifiedModel = model;
      setMainLoopModelOverride(model);
      setAppState((state) => ({
        ...state,
        mainLoopModelForSession: model,
      }));
      structuredIO.sessionState.notifyMetadataChanged({
        model,
      });
    },
    dropUnconfirmedLaunchModel: (modelArg, resolvedModel) => {
      let unconfirmedLaunchModel = modelToRestoreAfterRefusal({
        refused: modelArg,
        launch: options.userSpecifiedModel,
        active: userSpecifiedModel,
        restored: getMainLoopModelOverride(),
        turnDispatched: session.requestJournal.mainThreadRequestedInProcess(),
      });
      if (unconfirmedLaunchModel === undefined || resolvedModel?.(unconfirmedLaunchModel) === false)
        return false;
      userSpecifiedModel = unconfirmedLaunchModel;
      return true;
    },
    noticeRestrictedModel,
    recordAllowedModelApplied,
    getConversationModel: () => conversationModel(getMainLoopModel()),
    injectModelSwitchBreadcrumbs,
    setSystemPrompt: (systemPrompt) => {
      if (!options.systemPrompt) hostPromptSupersedes = false;
      options.systemPrompt = systemPrompt;
      noteSystemPromptSectionInvalidation("sdk_system_prompt");
    },
    isLaunchModelPick: () => isLaunchModelPick(),
  };
  let checkAutoModeTransitionTask = () =>
    checkAutoModeTransition(
      getAppState().toolPermissionContext,
      setAppStateQuietly,
      getAppState().fastMode,
      EVENT_LOGGING_FLAG_WAIT_MS,
    );
  let autoModeTransitionDue = () =>
    isAutoModeTransitionDue(getAppState().toolPermissionContext, getAppState().fastMode);
  function dropAutoModeIfUnsupported() {
    if (modelSupportsAutoMode(getMainLoopModel())) return;
    let { mode } = getAppState().toolPermissionContext;
    if (mode === "auto")
      setPermissionModeWithGuards(
        "default",
        getAppState().toolPermissionContext,
        (updater) =>
          setAppStateQuietly((prev) => ({
            ...prev,
            toolPermissionContext: updater(prev.toolPermissionContext),
          })),
        "auto_gate_denied",
      );
    else if (mode === "plan" && isAutoModeActive())
      setAppState((state) => ({
        ...state,
        toolPermissionContext: transitionPlanAutoMode(state.toolPermissionContext),
      }));
  }
  if (structuredIO instanceof RemoteIO) structuredIO.settleVouchedModelOrEffort(isAutoModeCapableModel);
  let takeVouchedModelRequest = (requestId) =>
    structuredIO instanceof RemoteIO && structuredIO.takeVouchedModelOrEffortRequest(requestId);
  async function settleAutoModeAtModelSwitch(skipChecks) {
    if (skipChecks) {
      await checkAutoModeInUse(
        getAppState().toolPermissionContext,
        setAppStateQuietly,
        getAppState().fastMode,
      );
      return;
    }
    dropAutoModeIfUnsupported();
    await checkAutoModeTransitionTask();
  }
  let applyModelPick = (requested) => {
    let isDefault = requested == null || requested.trim().toLowerCase() === "default";
    let model = isDefault ? getDefaultMainLoopModel() : requested;
    let startupRefusal = isDefault ? managedDenyStartupRefusal(model, "switch") : null;
    if (startupRefusal !== null)
      return {
        ok: false,
        error: startupRefusal,
      };
    if (!isDefault) {
      let unrecognizedRefusal = logUnrecognizedModelSwitch(model, lit("bridge_print"));
      if (unrecognizedRefusal) return unrecognizedRefusal;
    }
    let restricted =
      !isDefault &&
      !isExemptDefaultResolvingPick(model) &&
      !(isModelAllowedUnderActiveEnforcement(model) ?? isModelAllowed(model));
    let steppedDown = restricted ? stepDownRestrictedFamilyAliasPick(model) : null;
    if (restricted && steppedDown === null) {
      let currentModel = activeModel();
      noticeRestrictedModel(model, currentModel);
      return {
        ok: false,
        error: formatModelRestrictedNotice(model, currentModel ?? getMainLoopModel()),
      };
    }
    let nextModel = steppedDown ?? model;
    let readModelState = () => {
      let state = getAppState();
      return {
        mainLoopModel: state.mainLoopModel ?? userSpecifiedModel ?? getMainLoopModel(),
        mainLoopModelForSession: state.mainLoopModelForSession,
        toolPermissionContext: state.toolPermissionContext,
      };
    };
    let applySwitch = () => {
      recordSwitchIfChanged(session, readModelState(), isDefault ? null : nextModel, "sdk");
      userSpecifiedModel = nextModel;
      setMainLoopModelOverride(nextModel);
      setAppState((state) => ({
        ...state,
        mainLoopModelForSession: nextModel ?? null,
      }));
      let { mode } = getAppState().toolPermissionContext;
      if (mode === "auto" && !isAutoModeGateEnabled()) {
        applyingState = true;
        try {
          setPermissionModeWithGuards(
            "default",
            getAppState().toolPermissionContext,
            (updater) =>
              setAppState((prev) => ({
                ...prev,
                toolPermissionContext: updater(prev.toolPermissionContext),
              })),
            "auto_gate_denied",
          );
        } finally {
          applyingState = false;
        }
      } else if (mode === "plan" && isAutoModeActive() && !isAutoModeGateEnabled())
        setAppState((state) => ({
          ...state,
          toolPermissionContext: transitionPlanAutoMode(state.toolPermissionContext),
        }));
      recordAllowedModelApplied();
      if (steppedDown !== null) noticeRestrictedModel(model, steppedDown);
    };
    if (!hasPreModelSwitchHook(session) && switchSerializerSlot.of(session).pending === 0) {
      applySwitch();
      return autoModeTransitionDue()
        ? checkAutoModeTransitionTask().then(() => ({
            ok: true,
          }))
        : undefined;
    }
    return serializeModelSwitch(session, () =>
      runPreModelSwitchHooks(session, readModelState, isDefault ? null : nextModel, "sdk")
        .then(async (hookResult) => {
          if (hookResult.decision !== "proceed") {
            logFeatureSad("model_switch", "blocked_by_hook");
            return {
              ok: false,
              error: describeModelSwitchBlocked(hookResult),
            };
          }
          for (let message of hookResult.messages) announceInfo(sanitizeHookText(message));
          applySwitch();
          await checkAutoModeTransitionTask();
          return {
            ok: true,
          };
        })
        .catch((error) => {
          logError(toError(error));
          return {
            ok: false,
            error: "Model switch failed",
          };
        }),
    );
  };
  let latch = {
    seedSetUltracode: false,
  };
  let applyEffortSeed = (effortSeed) => {
    let seedResult = seedBridgeEffortLevel(effortSeed, {
      getAppState,
      setAppState,
      latch,
    });
    if (seedResult.ok) {
      reportEffortForModel(getMainLoopModel(), getAppState());
      noteEffortChange("state_change");
    }
    return seedResult;
  };
  options.homeSeed?.handle
    .then((homeSeed) =>
      homeSeed === null
        ? undefined
        : import("../services/homeSeed/formatHomeAppliedLine.lazy.js").then(
            ({ formatHomeAppliedLine, formatHomeRestoreLine }) => {
              let emitHomeSeedLine = (line) => {
                if (line === null) return;
                if (line.level === "debug") {
                  logForDebugging(`[homeSeed] ${line.text}`);
                  return;
                }
                let systemMessage = createSystemMessage(line.text, line.level);
                appendToConversation([systemMessage]);
                output.enqueue({
                  ...systemMessage,
                  session_id: getSessionId(),
                });
              };
              homeSeed.onApplied((applied) => emitHomeSeedLine(formatHomeAppliedLine(applied)));
              homeSeed.onRestore((restored) => emitHomeSeedLine(formatHomeRestoreLine(restored)));
            },
          ),
    )
    .catch(() => {
      logForDiagnosticsNoPII("warn", "home_seed_line_wiring_failed", {});
    });
  let clients_3 = [];
  let extraTools = [];
  let sdkCommands = [];
  let pendingMcpTools = new PendingMcpToolsByServer();
  let sdkServerManifests = new Map();
  let staleSdkServers = new Set();
  let gaveUpServers = new Set();
  let sdkServerListDirty = false;
  let toolRelistPending = 0;
  let sdkToolRelistPending = () => {
    if (toolRelistPending > 0) return true;
    for (let serverName of staleSdkServers)
      if (
        Object.hasOwn(sdkMcpServerConfigs, serverName) &&
        clients_3.some((client) => client.name === serverName && client.type === "connected")
      )
        return true;
    return false;
  };
  let elicitationRegistrar = createElicitationRegistrar({
    structuredIO,
    session,
    storageV5: options.storageV5,
    credentials: options.credentials,
    limits: DISABLED_ELICITATION_LIMITS,
    withdrawOn: null,
    onRefused: null,
  });
  async function refreshServerTools(client) {
    logMCPDebug(client.name, "Received tools/list_changed notification, refreshing tools");
    let refresh = await refreshMcpServerTools(client, () => {}, options.storageV5);
    if (refresh.status === "kept-previous") {
      logMCPDebug(client.name, "tools/list failed after list_changed \u2014 keeping previous tool set");
      if (gaveUpServers.delete(client.name)) {
        logFeatureSad("mcp_sdk_tools_refresh", "gave_up");
        return;
      }
      logFeatureSad("mcp_sdk_tools_refresh", "kept_previous");
      gaveUpServers.add(client.name);
      staleSdkServers.add(client.name);
      return;
    }
    gaveUpServers.delete(client.name);
    logFeatureOk("mcp_sdk_tools_refresh");
    logEvent("tengu_mcp_list_changed", {
      mcpServerKeyHash: toolNameForTelemetry(client.name),
      type: lit("tools"),
      cause: refetchReasonTelemetry(undefined),
      newCount: refresh.newTools.length,
    });
    return refresh.newTools;
  }
  let reconnectStores = {
    getAppState,
    setAppState,
    getDynamicMcpState: () => dynamicMcpState,
    setDynamicMcpState: (next) => {
      dynamicMcpState = next;
    },
  };
  function applyMcpReconnectResult(serverName, reconnectResult) {
    return applyMcpReconnect(reconnectStores, serverName, reconnectResult);
  }
  let inFlightReconnects = new Map();
  let reconnectAttemptsAt = new Map();
  let reconnectServer = async (serverName, config, reconnectOptions) => {
    let mcpClientModule = getMcpClientModule();
    let attemptEpoch = identityEpoch();
    let withEpoch = (result) => ({
      ...result,
      attemptEpoch,
    });
    let marker = {};
    inFlightReconnects.set(serverName, marker);
    try {
      if (!isDiscoveryCacheUsable())
        return withEpoch(
          await mcpClientModule.reconnectMcpServerImpl(
            serverName,
            config,
            options.storageV5,
            options.credentials,
          ),
        );
      return withEpoch(
        await (reconnectOptions.distrust
          ? mcpClientModule.reconnectMcpServerDistrusted(
              serverName,
              config,
              options.storageV5,
              options.credentials,
            )
          : mcpClientModule.reconnectMcpServerImpl(
              serverName,
              config,
              options.storageV5,
              options.credentials,
            )),
      );
    } finally {
      if (inFlightReconnects.get(serverName) === marker) inFlightReconnects.delete(serverName);
    }
  };
  let allConfigs = () => ({
    ...hostOwnedConfigs,
    ...dynamicMcpState.configs,
  });
  let reconnectConfigFor = (serverName) => {
    let client =
      getAppState().mcp.clients.find((client) => client.name === serverName) ??
      dynamicMcpState.clients.find((client) => client.name === serverName);
    if (!client && (getAppState().mcp.suppressedPluginMcpServers ?? []).includes(serverName)) return null;
    return resolveReconnectConfig(serverName, allConfigs(), client?.config, getMcpConfigByName);
  };
  let markConfigReplaced = (serverName, config) => {
    if (config.type === "sdk") return;
    let mcpClientModule = getMcpClientModule();
    let current = reconnectConfigFor(serverName);
    let sameConfig = !!current && mcpClientModule.areMcpConfigsEqual(current, config);
    let seenConfigs = [];
    let rewriteClient = (client) => {
      if (client.name !== serverName) return client;
      if (mcpClientModule.areMcpConfigsEqual(client.config, config))
        return client.type === "disabled"
          ? {
              name: serverName,
              type: "pending",
              config,
            }
          : client;
      if (!sameConfig) return client;
      if (!seenConfigs.some((config) => mcpClientModule.areMcpConfigsEqual(config, client.config)))
        seenConfigs.push(client.config);
      return {
        name: serverName,
        type: "pending",
        config,
      };
    };
    let any = dynamicMcpState.clients.some((client) => client.name === serverName);
    if (any)
      dynamicMcpState = {
        ...dynamicMcpState,
        clients: dynamicMcpState.clients.map(rewriteClient),
      };
    let any_2 = getAppState().mcp.clients.some((client) => client.name === serverName);
    setAppState((state) => {
      if (state.mcp.clients.some((client) => client.name === serverName))
        return {
          ...state,
          mcp: {
            ...state.mcp,
            clients: state.mcp.clients.map(rewriteClient),
          },
        };
      if (any || !sameConfig) return state;
      return {
        ...state,
        mcp: {
          ...state.mcp,
          clients: [
            ...state.mcp.clients,
            {
              name: serverName,
              type: "pending",
              config,
            },
          ],
        },
      };
    });
    if (!any_2 && !any && sameConfig && Object.hasOwn(dynamicMcpState.configs, serverName))
      dynamicMcpState = {
        ...dynamicMcpState,
        clients: [
          ...dynamicMcpState.clients,
          {
            name: serverName,
            type: "pending",
            config,
          },
        ],
      };
    for (let connection of seenConfigs)
      mcpClientModule.disposeServerConnectionDetached(serverName, connection);
  };
  let onModelSwitchNotice = (serverName, attempt) => {
    let breadcrumbs = applyMcpReconnectResult(serverName, withAuthTools(attempt));
    if (
      breadcrumbs === "superseded" ||
      (breadcrumbs === "dropped" && identityChangedForRemote(attempt.client.config, attempt.attemptEpoch))
    )
      return attempt.client.type === "failed" && attempt.client.errorCode === "IDENTITY_CHANGED"
        ? attempt.client
        : getMcpClientModule().inertReconnectShape(serverName, attempt.client.config).client;
    let resolvedClientModel =
      getAppState().mcp.clients.find((client) => client.name === serverName) ??
      dynamicMcpState.clients.find((client) => client.name === serverName);
    let isSameClient =
      resolvedClientModel === attempt.client ||
      (breadcrumbs === "applied" &&
        resolvedClientModel?.type === "connected" &&
        attempt.client.type === "connected" &&
        resolvedClientModel.client === attempt.client.client);
    if (resolvedClientModel !== undefined && isSameClient) {
      if (resolvedClientModel.type === "connected") {
        elicitationRegistrar([resolvedClientModel]);
        reregisterChannelHandlerAfterReconnect(resolvedClientModel, messageQueue);
      }
      return resolvedClientModel;
    }
    if (
      resolvedClientModel &&
      (resolvedClientModel.type === "disabled" || resolvedClientModel.type === "failed")
    )
      return resolvedClientModel;
    if (!resolvedClientModel && attempt.client.config.type === "sdk" && attempt.client.type !== "connected")
      return attempt.client;
    return {
      name: serverName,
      type: "failed",
      config: attempt.client.config,
      error: resolvedClientModel
        ? `Server status: ${resolvedClientModel.type}`
        : `Server not found: ${sanitizeTelemetryString(serverName)}`,
    };
  };
  let redialServer = async (request, extra) => {
    markConfigReplaced(request, extra);
    let hookResponse = await reconnectServer(request, extra, {
      distrust: false,
    });
    return onModelSwitchNotice(request, hookResponse);
  };
  let mcpRetryOrchestrator = createMcpRetryOrchestrator({
    ...reconnectStores,
    storageV5: options.storageV5,
    credentials: options.credentials,
    isControlReconnectInFlight: (serverName) => inFlightReconnects.has(serverName),
  });
  let rowAllowsRedial = (client) => {
    if (isCliOwnedConfig(client.config)) return false;
    let config = reconnectConfigFor(client.name);
    return (
      config !== null &&
      getMcpClientModule().areMcpConfigsEqual(config, client.config) &&
      !mcpDialBlockCause(client.name, client.config) &&
      !isMcpServerDisabled(client.name)
    );
  };
  let watcherAlive = () => !isSingleShotPrintSession() && !isPrintInputClosed() && !isTornDown;
  let nextTurnRedialer = createNextTurnRedialer({
    isOpen: watcherAlive,
    rows: () => rows(),
    allows: (client) => getAppState().mcp.clients.includes(client) && rowAllowsRedial(client),
    redial: async (client) => {
      let result = await mcpRetryOrchestrator.redialFailedRow(
        client,
        () => !watcherAlive() || !rowAllowsRedial(client),
      );
      if (result === "connected" || result === "degraded") {
        let found = rows().find((row) => row.name === client.name);
        if (found !== undefined) reregisterChannelHandlerAfterReconnect(found, messageQueue);
      }
      return result;
    },
  });
  let onReauthReconnect = (serverName, reauthModelArg) => {
    let found = getAppState().mcp.clients.find((client) => client.name === serverName);
    (async () => {
      let attemptEpoch = identityEpoch();
      try {
        if (
          found?.type !== "needs-auth" ||
          serverCacheKey(serverName, found.config) !== serverCacheKey(serverName, reauthModelArg)
        )
          return;
        if (isMcpServerDisabled(serverName) || mcpDialBlockCause(serverName, reauthModelArg)) return;
        let mcpClientModule = getMcpClientModule();
        let connection = await mcpClientModule.connectToServer(
          serverName,
          reauthModelArg,
          undefined,
          options.storageV5,
          options.credentials,
        );
        if (identityEpoch() !== attemptEpoch) {
          if (connection.type === "connected")
            mcpClientModule.detachAndCloseConnection(connection).catch(() => {});
          return;
        }
        if (connection.type !== "connected") return;
        let hasResources = !!connection.capabilities?.resources;
        let [prompts, resources, templates, third] = await Promise.all([
          mcpClientModule.fetchToolsForClient(connection, options.storageV5),
          mcpClientModule.fetchCommandsForClient(connection),
          Promise.resolve([]),
          hasResources ? mcpClientModule.fetchResourcesForClient(connection) : Promise.resolve([]),
        ]);
        if (identityEpoch() !== attemptEpoch) {
          mcpClientModule.detachAndCloseConnection(connection).catch(() => {});
          return;
        }
        if ((await mcpClientModule.peekSettledConnection(serverName, reauthModelArg)) !== connection) return;
        let mcp = getAppState().mcp;
        if (mcp.clients.find((client) => client.name === serverName) !== found) return;
        if (isShuttingDown() || isTornDown) return;
        let serverResults = pickServerResultsAfterRetry(mcp, serverName, {
          tools: prompts,
          prompts: resources,
          resources: third,
        });
        applyMcpReconnectResult(
          serverName,
          applyMcpServerConfig(found.config, {
            client: connection,
            tools: serverResults.tools,
            commands: [...serverResults.prompts, ...templates],
            resources: serverResults.resources,
            attemptEpoch,
          }),
        );
      } catch (error) {
        logForDebugging(
          `Failed to adopt reauth-reconnected MCP server ${serverName}: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
      }
    })();
  };
  function wireConnectedClients() {
    primeDiscoveryCacheFlag();
    let discoveryCacheOn = isDiscoveryCacheOn();
    if (!discoveryCacheOn && !options.mcpListingsHanded && !isCachedAuthStaleButUsable()) return;
    getCliOwnedState().headlessMcpTeardown?.();
    setConnectedClientWiring((wiring) => {
      elicitationRegistrar([wiring]);
      noteConnected([wiring]);
    });
    let unsubscribeRetry = mcpRetryOrchestrator.subscribe();
    let unsubscribeReauth = discoveryCacheOn
      ? REAUTH_RECONNECT_SIGNAL.subscribe(onReauthReconnect)
      : undefined;
    let unsubscribeIdentityTripped = discoveryCacheOn
      ? setIdentityTrippedHandler(
          () =>
            void reconnectMcpOnIdentityChange({
              ...reconnectStores,
              storageV5: options.storageV5,
              credentials: options.credentials,
              getHostOwnedConfigs: allConfigs,
            }),
        )
      : undefined;
    if (discoveryCacheOn && takeIdentityTripUnowned())
      queueMicrotask(() => {
        if (getCliOwnedState().headlessMcpTeardown !== teardownMarker) return;
        reconnectMcpOnIdentityChange({
          ...reconnectStores,
          storageV5: options.storageV5,
          credentials: options.credentials,
          getHostOwnedConfigs: allConfigs,
          force: true,
        });
      });
    let teardownCleanup;
    let teardownMarker = () => {
      teardownCleanup?.();
      teardownCleanup = undefined;
      unsubscribeRetry();
      unsubscribeReauth?.();
      unsubscribeIdentityTripped?.();
      setConnectedClientWiring(undefined);
      let cliOwnedState = getCliOwnedState();
      cliOwnedState.headlessConnectorMountInFlight = undefined;
      if (cliOwnedState.headlessMcpTeardown === teardownMarker) cliOwnedState.headlessMcpTeardown = null;
    };
    getCliOwnedState().headlessMcpTeardown = teardownMarker;
    teardownCleanup = registerCleanup(async () => teardownMarker());
    mcpRetryOrchestrator.catchUp();
  }
  let tearingDown = false;
  function teardownMcpState() {
    primeDiscoveryCacheFlag();
    if (!isDiscoveryCacheOn()) return;
    if (!tearingDown) {
      tearingDown = true;
      getMcpClientModule().seedMcpIdentityCheck();
    }
  }
  let commsServerNames = new Set();
  let commsRetractedClients = new Map();
  let retractFrom = (clients) => {
    for (let client of clients.filter(isCommsRoledServer))
      commsRetractedClients.set(client.name, {
        name: client.name,
        type: "disabled",
        config: client.config,
      });
  };
  let registerNames = (clients) => {
    for (let client of clients) commsServerNames.add(client.name);
    retractFrom(clients);
  };
  let noteConnected = watchMcpDisconnects({
    stores: reconnectStores,
    storageV5: options.storageV5,
  });
  let isTornDown = false;
  let reconnectBackoff = createReconnectBackoff({
    ...reconnectStores,
    storageV5: options.storageV5,
    credentials: options.credentials,
    isControlReconnectInFlight: (serverName) => inFlightReconnects.has(serverName),
    isRunEnding: () => isTornDown,
    onReconnected: (serverName) => reregisterChannelHandlerAfterReconnect(serverName, messageQueue),
  });
  let clients_4 = getAppState().mcp.clients;
  if (clients_4.length > 0 || clients.length > 0) teardownMcpState();
  wireConnectedClients();
  registerNames([...clients, ...clients_4]);
  elicitationRegistrar(clients_4);
  noteConnected(clients_4);
  reconnectBackoff(clients_4);
  subscribe(() => {
    let clients = getAppState().mcp.clients;
    if (clients === clients_4) return;
    clients_4 = clients;
    registerNames(clients);
    if (clients.length > 0) teardownMcpState();
    elicitationRegistrar(clients);
    noteConnected(clients);
    reconnectBackoff(clients);
  });
  let serializedRedialAll = serializeCalls(async (reason = "redial") => {
    for (let holder of mcpSyncMounts()) holder.reassertOwnership();
    for (let serverName of [...staleSdkServers]) {
      if (!Object.hasOwn(sdkMcpServerConfigs, serverName)) {
        staleSdkServers.delete(serverName);
        continue;
      }
      let client = clients_3.find((client) => client.name === serverName);
      if (client?.type !== "connected") continue;
      staleSdkServers.delete(serverName);
      toolRelistPending++;
      try {
        let tools = await refreshServerTools(client);
        if (tools !== undefined && clients_3.includes(client)) {
          extraTools = [...filterCommandsByServer(extraTools, serverName), ...tools];
          setAppState((state) => ({
            ...state,
            mcp: {
              ...state.mcp,
              tools: [...filterCommandsByServer(state.mcp.tools, serverName), ...tools],
            },
          }));
        }
      } finally {
        toolRelistPending--;
      }
    }
    for (let key of sdkServerManifests.keys())
      if (
        !Object.hasOwn(sdkMcpServerConfigs, key) ||
        clients_3.some((notification) => notification.name === key && notification.type === "connected")
      )
        sdkServerManifests.delete(key);
    let syncNeeded = mcpSyncNeeded(sdkMcpServerConfigs, clients_3);
    if (syncNeeded === "none" || (syncNeeded === "retry_failed" && reason === "skip")) return;
    let previousNames = new Map(sdkServerManifests);
    sdkServerManifests.clear();
    let configuredNames = new Set(Object.keys(sdkMcpServerConfigs));
    let currentServerNames = new Set(clients_3.map((client) => client.name));
    teardownMcpState();
    for (let client of clients_3)
      if (!configuredNames.has(client.name)) {
        if (client.type === "connected") await client.cleanup();
      }
    let retryState =
      syncNeeded === "retry_failed" &&
      isSdkMcpManifestsEnabled() &&
      ternalState.firstQueryAhead &&
      sdkServerListDirty &&
      hasFreshGrowthBookFeatures();
    if (!retryState) sdkServerListDirty = hasFreshGrowthBookFeatures();
    let reusable = pickReusableMcpClients(sdkMcpServerConfigs, clients_3, retryState);
    headlessProfilerCheckpoint("before_setupSdkMcp");
    noteSdkMcpDial(Object.keys(reusable).length);
    let setup = await getMcpClientModule().setupSdkMcpClients(
      reusable,
      (serverName, message) => structuredIO.sendMcpMessage(serverName, message),
      previousNames,
      options.storageV5,
    );
    headlessProfilerCheckpoint("after_setupSdkMcp");
    for (let client of setup.clients) {
      if (client.type !== "connected" || !staleSdkServers.delete(client.name)) continue;
      let tools = await refreshServerTools(client);
      if (tools !== undefined) setup.tools = [...filterCommandsByServer(setup.tools, client.name), ...tools];
    }
    let toReconnect = mcpServersToReconnect(clients_3, sdkMcpServerConfigs, reusable, retryState);
    for (let entry of toReconnect) {
      let found = setup.clients.find((client) => client.name === entry.name);
      if (found === undefined) continue;
      if (found.type === "connected") found.cleanup().catch(() => {});
      setup.clients = setup.clients.filter((client) => client !== found);
      setup.tools = filterCommandsByServer(setup.tools, entry.name);
      setup.commands = excludeCommandsByServer(setup.commands, entry.name);
    }
    if (retryState) {
      let merged = mergeMcpToolsAndCommands(
        clients_3,
        sdkMcpServerConfigs,
        reusable,
        {
          tools: extraTools,
          commands: sdkCommands,
        },
        setup,
      );
      setup.tools = merged.tools;
      setup.commands = merged.commands;
    }
    let connectedServerNames = new Set(toReconnect);
    pendingMcpTools.add(
      clients_3.filter((client) => client.type === "connected" && !connectedServerNames.has(client)),
    );
    clients_3 = [...setup.clients, ...toReconnect];
    extraTools = setup.tools;
    sdkCommands = setup.commands;
    for (let client of clients_3) if (client.type === "connected") sdkServerManifests.delete(client.name);
    let allNames = normalizeCaseForComparison_2([...currentServerNames, ...configuredNames]);
    let mapped = allNames.map((name) => [name, getMcpPrefix(name)]);
    setAppState((state) => ({
      ...state,
      mcp: {
        ...state.mcp,
        tools: [
          ...state.mcp.tools.filter(
            (tool) => !mapped.some(([serverName, prefix]) => isToolFromMcpServer(tool, serverName, prefix)),
          ),
          ...extraTools,
        ],
        commands: [
          ...state.mcp.commands.filter(
            (command) => !allNames.some((serverName) => commandBelongsToServer(command, serverName)),
          ),
          ...setup.commands,
        ],
      },
    }));
    for (let holder of mcpSyncMounts()) holder.reassertOwnership();
    setupVscodeSdkMcp(clients_3, {
      onFeedbackSurveyEvent: (event) => notifyVscodeHost(event, options.storageV5),
      refusalFallbackSettingToggleVisible: isRefusalFallbackActive(),
      refusalFallbackLaneEnabled: isRefusalFallbackEnabled(),
      startupAnnouncement: getNextAnnouncementJson(),
      autoDefaultLaunchEnabled: isHarborWillowEnabled(),
      ccrV2SessionCrudEnabled: isCcrV2SessionCrudEnabled(),
      maxEffortReminderEnabled: isMaxEffortReminderEnabled(),
      onAutoDefaultNudgeEvent: (nudgeEvent, nudgePayload) =>
        handleAutoDefaultNudgeEventFromHost(nudgeEvent, nudgePayload, options.storageV5),
      onAdminLimitRequest: fileAdminLimitRequest,
    });
    installCcdSessionTelemetryProxy(clients_3);
  });
  serializedRedialAll();
  let disableSdkServer = async (disableSdkServer) => {
    let config = getOwn(sdkMcpServerConfigs, disableSdkServer);
    let found = clients_3.find((client) => client.name === disableSdkServer);
    if (config === undefined || found?.type === "disabled") return;
    let disabled = {
      name: disableSdkServer,
      type: "disabled",
      config: {
        ...config,
        scope: "dynamic",
      },
    };
    clients_3 = [...clients_3.filter((client) => client.name !== disableSdkServer), disabled];
    extraTools = filterCommandsByServer(extraTools, disableSdkServer);
    sdkCommands = excludeCommandsByServer(sdkCommands, disableSdkServer);
    staleSdkServers.delete(disableSdkServer);
    gaveUpServers.delete(disableSdkServer);
    await Promise.all([
      pendingMcpTools.closeFor(disableSdkServer),
      found?.type === "connected" ? found.cleanup() : undefined,
    ]).catch((error) => {
      logMCPDebug(disableSdkServer, `Failed to close SDK MCP server after mcp_toggle disabled it: ${error}`);
    });
  };
  let enableSdkServer = async (enableSdkServer) => {
    let config = getOwn(sdkMcpServerConfigs, enableSdkServer);
    if (config === undefined) return;
    let found = clients_3.find((entry) => entry.name === enableSdkServer);
    if (found?.type === "connected") return found;
    if (found?.type === "disabled" || found?.type === "failed") {
      let pending = {
        name: enableSdkServer,
        type: "pending",
        config: {
          ...config,
          scope: "dynamic",
        },
      };
      clients_3 = clients_3.map((client) => (client === found ? pending : client));
    }
    await serializedRedialAll();
    return clients_3.find((pendingEntry) => pendingEntry.name === enableSdkServer);
  };
  let dynamicMcpState = {
    clients: [],
    tools: [],
    configs: {},
  };
  let addedSdkServers = Object.create(null);
  let firstSdkSync = env.CLAUDE_CODE_REMOTE
    ? partitionOperatorServers(getAppState().mcp.clients, options.mcpConfigOwnership)
    : {
        hostOwnedConfigs: {},
        operatorOwnedMcpConfigNames: new Set(),
        operatorOwnedConfigs: {},
      };
  let { hostOwnedConfigs, operatorOwnedMcpConfigNames } = firstSdkSync;
  let operatorToolPolicyConfigs =
    env.CLAUDE_CODE_REMOTE && getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_startup_policy_seed", true)
      ? firstSdkSync.operatorOwnedConfigs
      : {};
  if (env.CLAUDE_CODE_REMOTE)
    logForDebugging(
      `[MCP] mcp_set_servers authority: provenance ${options.mcpConfigOwnership === undefined ? "undeclared (all --mcp-config servers host-owned)" : "declared"}; host-owned=[${Object.keys(hostOwnedConfigs).join(", ")}] operator-owned=[${[...operatorOwnedMcpConfigNames].join(", ")}]`,
    );
  setMcpClientsAccessor(() => [...getAppState().mcp.clients, ...clients_3, ...dynamicMcpState.clients]);
  ensureScratchpadDir().catch((error) =>
    logForDebugging(`runHeadless: ensureScratchpadDir failed: ${error}`, {
      level: "error",
    }),
  );
  setMcpServerToolsSwapper(makeCommitReconnect(reconnectStores));
  let sdkServersList = Array.isArray(sdkMcpServers) ? sdkMcpServers : [];
  let mcpSyncDone = false;
  let sdkSyncPending = Array.isArray(sdkMcpServers)
    ? null
    : (async () => {
        let startTime = performance.now();
        let readyServers = await sdkMcpServers.catch((name) => {
          logError(name);
          return [];
        });
        if (!mcpSyncDone) sdkServersList = readyServers;
        recordPhase("commands_deferred_join_ms", performance.now() - startTime, startTime);
      })();
  function otherCommands(commands = getAppState().mcp.commands) {
    return commandNamesForBridge(sdkServersList, commands, memorySkillCommands());
  }
  function rewriteCommands(commands = getAppState().mcp.commands) {
    return otherCommands(commands).filter(isAdvertisedCommand);
  }
  let agents = initialAppState;
  let replaceCommandsFromFlags = (name) => {
    let filtered = agents.filter((agent) => agent.source === "flagSettings");
    agents = withLiveRegisteredAgents([...name, ...filtered]);
    notifyAgentsChanged();
  };
  let pluginFlagTracker = createPluginFlagTracker();
  let retractInlineFlagSettings = (at) => {
    let inline = getFlagSettingsInline() ?? {};
    let retracted = pluginFlagTracker.retract(inline);
    if (retracted === null) return;
    setFlagSettingsInline(retracted);
    settingsChangeDetector.notifyChange("flagSettings");
    logForDiagnosticsNoPII("info", "plugin_forwarding_retracted", {
      at,
      keys: Object.keys(inline).length - Object.keys(retracted).length,
    });
  };
  let preAgentSystemPrompt;
  let cachedAllowedAgentTypes;
  let cachedPrimitiveToolGrant;
  let announcedCapabilities;
  let announcedModelOverride;
  async function syncPluginsAtStartup() {
    try {
      bridgeSession?.undo().catch(logError);
    } catch (error) {
      logError(error);
    }
    if (!bridgeHandle) return;
    let handle = bridgeHandle;
    structuredIO.setOnControlRequestSent(undefined);
    structuredIO.setOnControlRequestResolved(undefined);
    setSdkHostedBridgeHandle(null, options.storageV5);
    setCurrentForKey(session, undefined);
    registerLiveSuppressionProbe(undefined);
    bridgeHandle = null;
    bridgeAttached = false;
    announcedCapabilities = undefined;
    announcedModelOverride = undefined;
    setReplBridgeActive(false);
    remoteForkSeed = undefined;
    bridgeSdkController.release(handle, {
      keepRecord: handle.neverArchive === true,
    });
    await handle.teardown({
      reason: "remote_control_disabled",
    });
  }
  function publishBridgeSessionUrls(account, detail, bridgeEpoch, epoch) {
    output.enqueue({
      type: "system",
      subtype: "bridge_state",
      state: account,
      detail,
      ...(account === "failed" && {
        failure_kind: epoch ?? "terminal",
      }),
      bridge_epoch: bridgeEpoch,
      uuid: randomUUID(),
      session_id: getSessionId(),
    });
  }
  let policyTeardownStarted = false;
  function watchBridgePolicy() {
    let handle = bridgeHandle;
    if (!handle || policyTeardownStarted) return;
    if (connectedBridgePolicyRefusal(handle.outboundOnly) === null) return;
    resolved_2 = serializeCall(async () => {
      let refusal = bridgeHandle === handle ? connectedBridgePolicyRefusal(handle.outboundOnly) : null;
      if (refusal === null) return;
      let bridgeEpoch_2 = bridgeEpoch;
      try {
        await syncPluginsAtStartup();
      } finally {
        publishBridgeSessionUrls("policy_disabled", refusal.detail, bridgeEpoch_2);
        try {
          logForDebugging(
            `[bridge:sdk] Org policy now refuses the attached bridge (${refusal.policy}: ${refusal.kind}); disconnected`,
          );
          logEvent("tengu_bridge_policy_teardown", {
            lane: lit("sdk_host"),
            policy: fromEnum(refusal.policy),
            deny_kind: fromEnum(refusal.kind),
            outbound_only: handle.outboundOnly,
          });
        } catch (error) {
          logForDebugging(`[bridge:sdk] Policy disconnect telemetry failed: ${errorMessage(error)}`, {
            level: "error",
          });
          logError(error);
        }
      }
    }).catch((error) => logError(error));
  }
  function queueCapabilities() {
    let mainLoopModel = getMainLoopModel();
    let state = getAppState();
    return [
      mainLoopModel,
      toExternalPermissionMode(state.toolPermissionContext.mode),
      getFastModeState(mainLoopModel, state.fastMode),
      getFastModeUnavailableReasonCode(mainLoopModel) ??
        getFastRejectedReason(mainLoopModel, state.fastMode) ??
        "",
      resolveEffortLevelOrNull(mainLoopModel, resolveEffortLevel(state)) ?? "",
      currentViewMode(),
      queuedNotificationCapabilities(buildBridgeToolsUpdate(state), session, () =>
        messagesSinceCompactBoundary(conversationRows),
      ).join(","),
      bridgeAdvertisedCommands(rewriteCommands(state.mcp.commands)).map((command) => command.name).join(`
`),
    ].join("\x00");
  }
  function noteEffortChange(reportStateChange, reason) {
    (async () => {
      try {
        if (!bridgeHandle || !isSdkBridgeStateAnnounceEnabled()) return;
        if (!reason?.force && queueCapabilities() === announcedCapabilities) {
          announcedModelOverride = getMainLoopModelOverride();
          return;
        }
        let handle = bridgeHandle;
        let sdkSetup = await getSlashCommandToolSkills(getCwd(), options.storageV5);
        if (bridgeHandle !== handle) return;
        let fingerprint = queueCapabilities();
        if (!reason?.force && fingerprint === announcedCapabilities) {
          announcedModelOverride = getMainLoopModelOverride();
          return;
        }
        let state = getAppState();
        handle.writeSdkMessages([
          buildBridgeContextSnapshot({
            session,
            tools: buildBridgeToolsUpdate(state),
            model: getMainLoopModel(),
            permissionMode: state.toolPermissionContext.mode,
            commands: rewriteCommands(state.mcp.commands),
            agents: getActiveAgentsFromList(agents),
            loadedSkills: sdkSetup.filter(isAdvertisedCommand),
            mcpCommands: state.mcp.commands,
            fastMode: state.fastMode,
            effortValue: resolveEffortLevel(state),
            messagesInView: () => messagesSinceCompactBoundary(conversationRows),
          }),
        ]);
        announcedCapabilities = fingerprint;
        announcedModelOverride = getMainLoopModelOverride();
        logForDebugging(`[bridge:sdk] system/init announced (${reportStateChange})`);
        logFeatureOk("bridge_sdk_state_announce", {
          trigger: fromEnum(reportStateChange),
        });
      } catch (error) {
        logForDebugging(
          `[bridge:sdk] system/init announce failed (${reportStateChange}): ${toError(error).message}`,
          {
            level: "error",
          },
        );
        logFeatureBad("bridge_sdk_state_announce", "emit_failed", {
          trigger: fromEnum(reportStateChange),
        });
      }
    })();
  }
  let announcedState = {
    mode: getAppState().toolPermissionContext.mode,
    modelForSession: getAppState().mainLoopModelForSession,
    fastMode: getAppState().fastMode,
    effort: resolveEffortLevel(getAppState()),
  };
  subscribe(() => {
    let state = getAppState();
    let stateUnchanged =
      state.toolPermissionContext.mode === announcedState.mode &&
      state.mainLoopModelForSession === announcedState.modelForSession &&
      state.fastMode === announcedState.fastMode &&
      resolveEffortLevel(state) === announcedState.effort;
    if (!stateUnchanged)
      announcedState = {
        mode: state.toolPermissionContext.mode,
        modelForSession: state.mainLoopModelForSession,
        fastMode: state.fastMode,
        effort: resolveEffortLevel(state),
      };
    if (!bridgeHandle) return;
    if (
      stateUnchanged &&
      (announcedCapabilities === undefined || getMainLoopModelOverride() === announcedModelOverride)
    )
      return;
    noteEffortChange("state_change");
  });
  let unsubscribeFastMode = onOrgFastModeChange(() => noteEffortChange("state_change"));
  let unsubscribeFallbackModels = onFastRejectedFallbackModelsChanged(() => noteEffortChange("state_change"));
  let unsubscribeFocusMode = subscribeFocusMode(() => noteEffortChange("state_change"));
  let syntheticOutputWarned = false;
  let toolListCache = null;
  let buildBridgeToolsUpdate = (computeBridgeTools) => {
    let mainThreadAgentType = getMainThreadAgentType();
    let jsonSchema = getInitJsonSchema();
    let bridgeTools = toolState.get(BridgeToolProvider).tools();
    let toolNames = [
      computeBridgeTools.toolPermissionContext,
      computeBridgeTools.mcp.tools,
      bridgeTools,
      computeBridgeTools.mcp.clients,
      computeBridgeTools.slackTagConnected,
      extraTools,
      clients_3,
      dynamicMcpState.tools,
      dynamicMcpState.clients,
      commsRetractedClients.size,
      agents,
      mainThreadAgentType,
      isReplBridgeActive(),
      getSdkHostedBridgeHandle(),
      getMainLoopModel(),
      hasLspEverConnected(),
      isDeclared(),
      getAllowedChannels(),
      getPolicyCacheRevision(),
      isCachedGitHubRepo(),
      jsonSchema,
      getHostRendersChromeSetupOffer(),
      chromeSetupOfferKey(structuredIO.sessionState),
      getMcpEntryRowNotServed(),
      env.CLAUDE_PROJECT_UUID,
    ];
    let handle = toolListCache;
    if (
      handle !== null &&
      Date.now() - handle.computedAt < TOOL_POOL_MEMO_TTL_MS &&
      toolNames.every((name, index) => name === handle.keys[index])
    ) {
      cachedAllowedAgentTypes = handle.allowedAgentTypes;
      cachedPrimitiveToolGrant = handle.primitiveToolGrant;
      return handle.result;
    }
    let allSdkNames = getActiveAgentsFromList(agents);
    let assembled = assembleToolPool(computeBridgeTools.toolPermissionContext, computeBridgeTools.mcp.tools, {
      activeAgents: allSdkNames,
    });
    let dynamicTools = filterToolsByDenyRules(
      dynamicMcpState.tools,
      computeBridgeTools.toolPermissionContext,
    );
    let hostTools = filterToolsByDenyRules(bridgeTools, computeBridgeTools.toolPermissionContext);
    registerNames([...computeBridgeTools.mcp.clients, ...dynamicMcpState.clients]);
    retractFrom(clients_3);
    let filterDisabled = !isLovelyUmbrellaOn();
    let filtered = withoutStaticMcpShadows(
      tools,
      isDiscoveryCacheOn() || options.mcpListingsHanded
        ? [...commsServerNames]
        : [
            ...computeBridgeTools.mcp.clients.map((prev) => prev.name),
            ...dynamicMcpState.clients.map((client) => client.name),
          ],
    ).filter((tool) => isMcpTool(tool) || !filterDisabled || tool.isEnabled());
    let deduped = uniqBy(
      mergeAndFilterTools(
        [...hostTools, ...filtered, ...extraTools, ...dynamicTools],
        assembled,
        computeBridgeTools.toolPermissionContext.mode,
        [
          ...bridgeTools,
          ...filtered,
          ...extraTools,
          ...dynamicMcpState.tools,
          ...computeBridgeTools.mcp.tools,
        ],
        createAccountMemoryToolGate(() =>
          mergeClientsWithCommsServers(clients_3, computeBridgeTools.mcp.clients, dynamicMcpState.clients, [
            ...commsRetractedClients.values(),
          ]),
        ),
      ),
      (tool) => tool.name,
    );
    cachedAllowedAgentTypes = undefined;
    cachedPrimitiveToolGrant = undefined;
    if (mainThreadAgentType) {
      let toolUseContext = findAgentExcludingWebFetch(allSdkNames, mainThreadAgentType);
      if (toolUseContext) {
        let agentTools = resolveAgentTools(
          toolUseContext,
          withWebFetchToolForAgent(toolUseContext, deduped, computeBridgeTools.toolPermissionContext, {
            activeAgents: allSdkNames,
          }),
          false,
          true,
        );
        deduped = agentTools.resolvedTools;
        cachedAllowedAgentTypes = agentTools.allowedAgentTypes;
        cachedPrimitiveToolGrant = resolveAgentToolNames(toolUseContext);
      }
    }
    if (options.permissionPromptToolName)
      deduped = deduped.filter((tool) => !matchesToolName(tool, options.permissionPromptToolName));
    if (jsonSchema && !options.jsonSchema) {
      let syntheticOutputTool = createSyntheticOutputTool(jsonSchema);
      if ("tool" in syntheticOutputTool) {
        if (syntheticOutputTool.unsatisfiable && !syntheticOutputWarned) {
          syntheticOutputWarned = true;
          logForDebugging(
            `Init JSON schema: ${checkSchemaSatisfiable(syntheticOutputTool.unsatisfiable)}: ${syntheticOutputTool.unsatisfiable.message}`,
            {
              level: "warn",
            },
          );
        }
        deduped = [...deduped, syntheticOutputTool.tool];
      } else if (!syntheticOutputWarned) {
        syntheticOutputWarned = true;
        logEvent("tengu_structured_output_failure", {
          error: lit("Invalid JSON schema"),
        });
        logForDebugging(
          `Init JSON schema rejected, structured output disabled: ${syntheticOutputTool.error}`,
          {
            level: "error",
          },
        );
      }
    }
    deduped = stripSoleNonDeniableTool(deduped, computeBridgeTools.toolPermissionContext);
    toolListCache = {
      keys: toolNames,
      computedAt: Date.now(),
      result: deduped,
      allowedAgentTypes: cachedAllowedAgentTypes,
      primitiveToolGrant: cachedPrimitiveToolGrant,
    };
    return deduped;
  };
  let CLAUDE_CODE_SYSTEM_PROMPT_GB_FEATURE = env.CLAUDE_CODE_REMOTE
    ? env.CLAUDE_CODE_SYSTEM_PROMPT_GB_FEATURE
    : undefined;
  let switchToPromptTools = () => {
    if (!CLAUDE_CODE_SYSTEM_PROMPT_GB_FEATURE) return options.systemPrompt;
    let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
      CLAUDE_CODE_SYSTEM_PROMPT_GB_FEATURE,
      "",
    );
    return typeof featureValue_CACHED_MAY_BE_STALE === "string" && featureValue_CACHED_MAY_BE_STALE.length > 0
      ? featureValue_CACHED_MAY_BE_STALE
      : options.systemPrompt;
  };
  let refreshBridgeToolList = () => buildBridgeToolsUpdate(getAppState());
  setProjectsThreadStateSource({
    messages: () => conversationRows,
    isProjectsSession: () => hasRelaySourceForClients(),
    isThread: () => hasUpdateStatusToolOnly(refreshBridgeToolList()),
    isOverview: () => hasStartThreadToolOnly(refreshBridgeToolList()),
    answerToolName: () => resolveHearthToolNames(refreshBridgeToolList()).reply,
    ownerRowsWrittenAt: latestHumanRelayAt,
  });
  let rows = () => mergeClients(getAppState().mcp.clients, clients_3, dynamicMcpState.clients);
  let pluginServerHosts = new Map();
  function operatorOwnedConfigs() {
    return {
      ...firstSdkSync.operatorOwnedConfigs,
      ...hostOwnedConfigs,
    };
  }
  function computeDynamicMcpConfig() {
    return filterDuplicateServers(
      operatorOwnedConfigs(),
      rows(),
      new Set(Object.keys(dynamicMcpState.configs).filter((key) => !Object.hasOwn(addedSdkServers, key))),
    );
  }
  let queryContext = () => ({
    session,
    refreshTools: refreshBridgeToolList,
    refreshMcpClients: rows,
    verbose: options.verbose,
    maxTurns: options.maxTurns,
    maxBudgetUsd: options.maxBudgetUsd,
    taskBudget: options.taskBudget,
    canUseTool,
    fallbackModel: options.fallbackModel,
    sessionEnvVars,
    toolState,
    sessionHooks,
    isolationLatch,
    pendingNestedMemoryTriggers: pendingMemoryDirs,
    memorySelector,
    storageV5: options.storageV5,
    credentials: options.credentials,
    messageQueue,
    getAppState,
    setAppState,
    replayUserMessages: options.replayUserMessages,
    includePartialMessages: options.includePartialMessages,
    ...false,
    replayAcksAtRequestDispatch: structuredIO instanceof RemoteIO,
    trackFirstFrameUpload:
      structuredIO instanceof RemoteIO ? (frame) => structuredIO.trackFirstFrameUpload(frame) : undefined,
    trackFirstTextFrameUpload:
      structuredIO instanceof RemoteIO ? (frame) => structuredIO.trackFirstTextFrameUpload(frame) : undefined,
    markOfRepliesShownAsStored:
      structuredIO instanceof RemoteIO ? () => structuredIO.markOfRepliesShownAsStored() : undefined,
    onCommandLifecycle: structuredIO.onCommandLifecycle,
    sessionState: structuredIO.sessionState,
    requestDialog: getHasStreamingInput()
      ? createSdkUserDialogHandler(structuredIO, messageQueue)
      : undefined,
    setSDKStatus: (status, extra) => {
      let frame = buildSystemStatusMessage(status, extra);
      forwardSubagentFrame(frame);
      output.enqueue(frame);
    },
  });
  let stagedFilesWaiter = stagedFilesWaiterByRoot.of(session);
  stagedFilesWaiter.onFilesNotPlaced = noteStagedFilesNotPlaced;
  stagedFilesWaiter.onFilesStillCopying = noteStagedFilesStillCopying;
  let askCall = (askCall) => ({
    ...askCall,
    commands: () => otherCommands(),
    cwd: () => resolveSessionCwd(session),
    tools: refreshBridgeToolList,
    mcpClients: rows,
    answers: applyPermissionAnswerChanges,
    appendSystemPrompt: () => options.appendSystemPrompt,
    appendSystemPromptHead: options.appendSystemPromptHead,
    liveAppendSections: remoteEnvSystemPromptSections(options.appendSystemPromptHead),
    planModeInstructions: () => options.planModeInstructions,
    systemPromptSnapshot: () => options.systemPromptSnapshot,
    appendSubagentSystemPrompt: () => options.appendSubagentSystemPrompt,
    toolAliases: () => options.toolAliases,
    excludeDynamicSections: () => options.excludeDynamicSections,
    forwardSubagentText: () => options.forwardSubagentText,
    thinkingConfig: () => hasEffort.current(),
    jsonSchema: () => getInitJsonSchema() ?? options.jsonSchema,
    initialMessages: conversationRows,
    storedDenyLists,
    loadShowsCutOffCalls: isInterruptedTail(turnInterruptionState),
    conversation: orderedRows,
    readFileCache: readFileState,
    customSystemPrompt: switchToPromptTools,
    takeSystemPromptDelivered: () => {
      let hostPromptSupersedesValue = hostPromptSupersedes;
      hostPromptSupersedes = false;
      return hostPromptSupersedesValue;
    },
    agents: () => getActiveAgentsFromList(agents),
    allowedAgentTypes: () => cachedAllowedAgentTypes,
    primitiveToolGrant: () => cachedPrimitiveToolGrant,
    handoffRelay: lazyHandoffMarkerRelay && options.usesRelayMarker ? lazyHandoffMarkerRelay : undefined,
    awaitStagedFiles: options.turnHandoffAdmission?.admitted
      ? createStagedFilesWaiter(stagedFilesWaiter)
      : undefined,
    beforeTurnInput: () => {
      stagedFilesWaiter.forgetWaits();
      stagedFilesWaiter.tellOfFailedStagesNow();
      flushWaitingSessionStartRows(lateSessionStartRows);
      if (diskBehindReminder !== undefined && !isToolResultForToolUse(conversationRows)) {
        appendToConversation([diskBehindReminder]);
        diskBehindReminder = undefined;
        logFeatureOk("ccr_disk_behind_reminder");
      }
    },
    onTurnBeganBeforeInit: () =>
      notifyTurnBeganBeforeInit({
        sessionState: structuredIO.sessionState,
        markStartupPhase: options.markStartupPhase,
      }),
    placeFilesByName:
      options.turnHandoffAdmission?.admitted && isClaudeAiChatOrigin() ? placeFilesByNameForTurn : undefined,
    placeCarriedWrites:
      options.turnHandoffAdmission?.admitted && isClaudeAiChatOrigin()
        ? placeCarriedWritesAtTurnStart
        : undefined,
    beginTranscriptFlush: () => {
      let storeConfirmTimer = makeStoreConfirmTimer(() => structuredIO.watchInternalEventPosts());
      return async (signal, task) => {
        let startTime = performance.now();
        let combinedSignal = AbortSignal.any([signal, abortController.signal]);
        let assembledTools = setTimeout(
          () =>
            logForDebugging("turn_handoff: the session store has not confirmed the carried lines after 15s", {
              level: "warn",
            }),
          15000,
        );
        assembledTools.unref();
        try {
          if (
            !(await Promise.race([
              structuredIO.flushInternalEvents().then(() => true),
              new Promise((resolve) => {
                if (combinedSignal.aborted) resolve(false);
                else
                  combinedSignal.addEventListener("abort", () => resolve(false), {
                    once: true,
                  });
              }),
            ]))
          )
            return false;
          return structuredIO.refusedInternalEvents(task).length > 0 ? "refused" : true;
        } finally {
          clearTimeout(assembledTools);
          storeConfirmTimer(startTime);
        }
      };
    },
  });
  let initJsonSchema = createInlineMcpTiming();
  let resolved_4 = Promise.resolve({
    response: {
      added: [],
      removed: [],
      errors: {},
    },
    sdkServersChanged: false,
  });
  let mcpSyncHooks = {
    stores: reconnectStores,
    getOwnedConfigs: () => hostOwnedConfigs,
    setOwnedConfigs: (servers) => {
      hostOwnedConfigs = servers;
    },
    sdkState: () => ({
      configs: sdkMcpServerConfigs,
      clients: clients_3,
      tools: extraTools,
      commands: sdkCommands,
    }),
    storageV5: options.storageV5,
    credentials: options.credentials,
    enqueueSettleMerge: (release) => {
      let wrap = (fn) => {
        release();
        return fn;
      };
      resolved_4 = resolved_4.then(wrap, wrap);
    },
    redactsPersistedLane: () => mayPersistOnHost(session),
    wantsDial: () => true,
    operatorOwnedMcpConfigNames,
    operatorToolPolicyConfigs,
    closeReplacedSdkClients: (mcpAccessor) => pendingMcpTools.closeFor(mcpAccessor),
  };
  let projectsMount = null;
  let bindingChangedHint = null;
  function mcpSyncMounts() {
    let mounts = [];
    if (projectsMount) mounts.push(projectsMount);
    let replyMount = bridgeSession?.projectsReplyMount();
    if (replyMount) mounts.push(replyMount);
    return mounts;
  }
  function applySdkServerSet(
    servers,
    {
      authoritative,
      caller,
      deferConnect = false,
      pluginDiffScope = "configured",
      pluginCandidates,
      dialOptions,
    },
  ) {
    let applyFromPayload = async () => {
      let { servers: servers_2, twins } =
        pluginCandidates === undefined
          ? {
              servers,
              twins: [],
            }
          : collapsePluginServerTwins(
              servers,
              pluginCandidates,
              computeDynamicMcpConfig(),
              new Set(
                caller === "reload_plugins"
                  ? []
                  : rows()
                      .filter((serverName) => serverName.type === "connected")
                      .map((serverName) => serverName.name),
              ),
            );
      for (let key of Object.keys(pluginCandidates ?? {}))
        if (Object.hasOwn(servers, key)) pluginServerHosts.delete(key);
      for (let { name: twin, duplicateOf } of twins) {
        let twinConfig = pluginCandidates?.[twin];
        if (twinConfig !== undefined)
          pluginServerHosts.set(twin, {
            host: duplicateOf,
            config: twinConfig,
          });
      }
      if (twins.length > 0)
        logForDebugging(
          `[MCP] ${caller}: plugin server(s) left out because the host already delivered the same server: ${twins.map((servers) => `${servers.name} (same as "${servers.duplicateOf}")`).join(", ")}`,
        );
      let previousNames = servers_2;
      let settingsConfigs =
        pluginDiffScope === "configured"
          ? emptyServerMap()
          : nonBuiltinMarketplaceServers(dynamicMcpState.configs, pluginDiffScope);
      let wantedConfigs = new Map([
        ...Object.entries(settingsConfigs),
        ...(authoritative ? [] : Object.entries(hostOwnedConfigs)),
      ]);
      if (wantedConfigs.size > 0) {
        let changed = Object.create(null);
        let hostKeptNames = [];
        for (let [name, entry] of wantedConfigs) {
          let config = getOwn(servers_2, name);
          let isHostOwned = Object.hasOwn(hostOwnedConfigs, name);
          let nextConfig = config;
          let isSettingsScoped =
            nextConfig?.scope !== undefined &&
            MCP_SETTINGS_SCOPE_SET.has(nextConfig.scope) &&
            !isManagedConfigScope(nextConfig.scope) &&
            nextConfig.pluginSource === undefined;
          let shouldDrop =
            config?.type === "sdk"
              ? Object.hasOwn(settingsConfigs, name) && !isHostOwned
              : isHostOwned &&
                entry.type !== "sdk" &&
                !Object.hasOwn(sdkMcpServerConfigs, name) &&
                isSettingsScoped;
          if (config !== undefined && !shouldDrop) continue;
          let { scope, ...rest } = entry;
          if (supportsEnvExpansion(rest)) {
            changed[name] = copyCcrMarks(entry, rest);
            if (config !== undefined && isHostOwned) hostKeptNames.push(name);
          }
        }
        if (hostKeptNames.length > 0)
          logForDebugging(
            `[MCP] ${caller}: host-set server(s) kept over a settings server of the same name: ${hostKeptNames.join(", ")}`,
          );
        previousNames = {
          ...servers_2,
          ...changed,
        };
      }
      if (Object.keys(addedSdkServers).length > 0)
        previousNames = {
          ...addedSdkServers,
          ...previousNames,
        };
      if (Object.keys(previousNames).length > 0 || dynamicMcpState.clients.length > 0 || clients_3.length > 0)
        teardownMcpState();
      for (let holder of mcpSyncMounts()) holder.suspendAllowsForApply(previousNames);
      serverCapabilityCache.peek(session)?.narrowTo?.(previousNames);
      let previousClients = clients_3;
      let dynamicResult = await applyDynamicMcpServers(
        mcpSyncHooks,
        {
          payload: servers_2,
          desired: previousNames,
        },
        {
          authoritative,
          caller,
          deferConnect,
          dialOptions,
        },
      );
      let previousClientNames = new Set(clients_3.map((client) => client.name));
      let sdkResult = applySdkMcpServerChanges(
        {
          configs: sdkMcpServerConfigs,
          clients: clients_3,
          tools: extraTools,
          commands: sdkCommands,
        },
        previousClients,
        dynamicResult,
      );
      if (sdkResult.state.configs !== sdkMcpServerConfigs) {
        for (let key of Object.keys(sdkMcpServerConfigs))
          if (!Object.hasOwn(sdkResult.state.configs, key)) delete sdkMcpServerConfigs[key];
        Object.assign(sdkMcpServerConfigs, sdkResult.state.configs);
      }
      clients_3 = sdkResult.state.clients;
      extraTools = sdkResult.state.tools;
      sdkCommands = sdkResult.state.commands;
      if (dynamicResult.sdkServersChanged) {
        let newSdkClientNames = new Set(clients_3.map((client) => client.name));
        let allSdkNames = normalizeCaseForComparison_2([...previousClientNames, ...newSdkClientNames]);
        let mapped = allSdkNames.map((prev) => [prev, getMcpPrefix(prev)]);
        setAppState((state) => ({
          ...state,
          mcp: {
            ...state.mcp,
            tools: [
              ...state.mcp.tools.filter(
                (name) =>
                  !mapped.some(([serverName, prefix]) => isToolFromMcpServer(name, serverName, prefix)),
              ),
              ...extraTools,
            ],
            commands: [
              ...state.mcp.commands.filter(
                (command) => !allSdkNames.some((sdkName) => commandBelongsToServer(command, sdkName)),
              ),
              ...sdkCommands,
            ],
          },
        }));
      }
      for (let client of sdkResult.clientsToCleanUp) await client.cleanup();
      for (let serverName of dynamicResult.sdkServersRemoved) await pendingMcpTools.closeFor(serverName);
      await ensureScratchpadDir().catch((error) =>
        logForDebugging(`applyMcpServerChanges: ensureScratchpadDir failed: ${error}`, {
          level: "error",
        }),
      );
      return {
        response: dynamicResult.response,
        sdkServersChanged: dynamicResult.sdkServersChanged,
      };
    };
    let reassertMounts = async () => {
      try {
        return await applyFromPayload();
      } finally {
        for (let holder of mcpSyncMounts()) holder.reassertAfterApply();
      }
    };
    resolved_4 = resolved_4.then(reassertMounts, reassertMounts);
    return resolved_4;
  }
  function applyOneMcpServer(serverName, config, reassert) {
    let run = async () => {
      if (config !== undefined) teardownMcpState();
      for (let holder of mcpSyncMounts())
        holder.suspendAllowsForApply({
          [serverName]: config,
        });
      serverCapabilityCache.peek(session)?.narrowTo?.(
        config === undefined
          ? {}
          : {
              [serverName]: config,
            },
        [serverName],
      );
      try {
        return {
          response: await reconcileMcpServers(
            serverName,
            config,
            reassert,
            reconnectStores,
            setAppState,
            getAppState,
            mcpSyncHooks.redactsPersistedLane(),
            options.storageV5,
            options.credentials,
            mcpSyncHooks.getOwnedConfigs,
          ),
          sdkServersChanged: false,
        };
      } finally {
        for (let holder of mcpSyncMounts()) holder.reassertAfterApply();
      }
    };
    resolved_4 = resolved_4.then(run, run);
    return resolved_4.then(
      ({ response }) => response,
      (error) => {
        logError(error);
        return;
      },
    );
  }
  let contextUsageInputsForSummary = () => ({
    messages: conversationRows,
    tools: buildBridgeToolsUpdate(getAppState()),
    agentDefinitions: {
      activeAgents: getActiveAgentsFromList(agents),
      allAgents: agents,
    },
    customSystemPrompt: switchToPromptTools(),
    appendSystemPrompt: options.appendSystemPrompt,
    systemPromptSnapshot: options.systemPromptSnapshot,
    excludeDynamicSections: options.excludeDynamicSections,
    mcpClients: rows(),
  });
  let emitContextUsage = async (request) => {
    let { messages, ...rest } = contextUsageInputsForSummary();
    return collectContextData({
      session,
      messages,
      getAppState,
      getMcp: () => getAppState().mcp,
      storageV5: options.storageV5,
      credentials: options.credentials,
      options: {
        mainLoopModel: getMainLoopModel(),
        ...rest,
      },
      detail: request?.detail,
      terminalWidth: request?.terminalWidth,
    });
  };
  let agentRuntime = {
    surface: null,
    ...(options.outputFormat === "stream-json" && {
      sendDisplayRows: (detail) =>
        flushPendingRowsWithTerminal(detail, {
          drain: runState,
          messageQueue,
          write: (keepArrived) => output.enqueue(keepArrived),
          pointerResults: options.handbackPointerResults,
        }),
    }),
    model: () => getMainLoopModel(),
    messages: () => conversationRows,
    conversation: (agent) =>
      agent === undefined
        ? {
            ...orderedRows,
            keepArrived: (message) =>
              liveAppender?.getMessages() === conversationRows
                ? liveAppender.keepArrivedRows(message)
                : orderedRows.keep(message),
          }
        : runningTurnRegistry.of(agent),
    tools: refreshBridgeToolList,
    commands: () => otherCommands(),
    mcpServers: () => rows().map((row) => row.name),
    toolContext: (abortController) =>
      ask(askCall(queryContext()), {
        abortController,
        userSpecifiedModel,
      }),
    savedAgentMessages: (agentId) => waitForAgentTranscriptFlush(agentId, options.storageV5),
    requestMessages: (messages) => normalizeAgentMessagesForApi(messages, refreshBridgeToolList()),
    contextData: emitContextUsage,
    canUseTool,
    composer: createRemotePromptBox(REMOTE_EDIT_QUEUE),
    selection: createRemoteSelectionReader(),
    notify: async (message, hookOrigin) => {
      await executeNotificationHooks(session, message, {
        storageV5: options.storageV5,
        credentials: options.credentials,
        hookOrigin,
      });
      return "no_surface";
    },
    toast: (kind, text, options) => {
      if (
        rewire({
          type: "system",
          subtype: "ui_toast",
          plugin: kind,
          text,
          timeout_ms: options ?? TOAST_DEFAULT_MS,
        })
      )
        return;
      logForDebugging(`$.ui.toast (${kind}): no notification bar in a headless session; kept here: ${text}`);
    },
    status: (status, detail) => {
      if (
        rewire({
          type: "system",
          subtype: "ui_status",
          plugin: status,
          text: detail ?? null,
        })
      )
        return;
      logForDebugging(
        `$.ui.status (${status}): no status row in a headless session; kept here: ${detail ?? "(cleared)"}`,
      );
    },
    addMcpServer: (serverName, config) => {
      let { scope, ...rest } = config;
      if (!supportsEnvExpansion(rest) || rest.type === "sdk") {
        logForDebugging(
          `$.tool.register: server ${jsonStringify(serverName)} has a config this session cannot connect (${String(rest.type)}); not added`,
          {
            level: "warn",
          },
        );
        return Promise.resolve();
      }
      addedSdkServers = withKeyReplaced(serverName, addedSdkServers, rest);
      return applyOneMcpServer(serverName, rest, "tool_register").then(() => {});
    },
    removeMcpServer: (serverName) => {
      if (!Object.hasOwn(addedSdkServers, serverName)) return Promise.resolve();
      addedSdkServers = withKeyReplaced(serverName, addedSdkServers, undefined);
      return applyOneMcpServer(serverName, undefined, "tool_register").then(() => {});
    },
    resolveMcpServer: async (serverName) =>
      resolveConnectorTwin(
        await explainPluginServer({
          ...serverName,
          storageV5: options.storageV5,
          credentials: options.credentials,
          dynamicServers: toScopedConfig_2(rows(), addedSdkServers),
        }),
        rows(),
        getAppState().mcp.suppressedPluginMcpServers ?? [],
      ),
    settledMcpServer: (listener) => subscribeRows(rows, listener),
    connectMcpServer: (serverName, options) =>
      waitForMcpServerStatus(
        {
          rows,
          apply: (settings, options) => {
            addedSdkServers = withKeyReplaced(settings, addedSdkServers, options);
            return applyOneMcpServer(settings, options, "plugin_connect");
          },
          isAdded: (serverName) => Object.hasOwn(addedSdkServers, serverName),
          isParked: isParkedSpare,
        },
        serverName,
        options,
      ),
    refreshCommands: () => refreshCommandsThrottled.ask(),
    refreshAgents: () => refreshAgents(),
    refreshContext: () => invalidateUserContext(session, "hooks_invalidate"),
    compact: () =>
      Promise.reject(
        Error(
          "not available in a headless (-p / SDK) session yet: compaction here runs inside a turn (a /compact prompt); catch it and carry on",
        ),
      ),
  };
  bindSurface(agentRuntime);
  registerTurnParamsHook(registerPostSamplingHook);
  let releaseRequester =
    options.outputFormat === "stream-json" &&
    (!structuredIO.isRemoteTransport() ||
      isPersistenceTrusted({
        redactsWhatItPersists: isTransportBacked(session),
        isRemoteTransport: true,
      }))
      ? withCurrentRequester({
          reach: () =>
            structuredIO.isRemoteTransport() ? (structuredIO.takesUiHostAsks() ? "each" : "none") : "first",
          copy: async (event) =>
            (
              await structuredIO.sendUiHostRequest(
                {
                  subtype: "ui_copy",
                  surface: event.surface,
                  client_id: event.clientId,
                  plugin: event.plugin,
                  text: event.text,
                },
                UiCopyResponseSchema(),
                BACKDROP_CLEAR_DELAY_MS,
              )
            )?.copied,
          readPrompt: (request) =>
            structuredIO.sendUiHostRequest(
              {
                subtype: "ui_prompt_read",
                surface: request.surface,
                client_id: request.clientId,
              },
              UiPromptReadResponseSchema(),
              BACKDROP_CLEAR_DELAY_MS,
            ),
          fillPrompt: async (request) =>
            (
              await structuredIO.sendUiHostRequest(
                {
                  subtype: "ui_prompt_fill",
                  surface: request.surface,
                  client_id: request.clientId,
                  text: request.text,
                  mode: request.mode,
                  ...(request.decorations !== undefined &&
                    request.decorations.length > 0 && {
                      decorations: [...request.decorations],
                    }),
                  ...(request.cursor !== undefined && {
                    cursor: request.cursor,
                  }),
                  ...(request.answersPress !== undefined && {
                    answers_press: request.answersPress,
                  }),
                },
                UiPromptFillResponseSchema(),
                BACKDROP_CLEAR_DELAY_MS,
              )
            )?.filled,
          paintPrompt: async (request) =>
            (
              await structuredIO.sendUiHostRequest(
                {
                  subtype: "ui_prompt_paint",
                  surface: request.surface,
                  client_id: request.clientId,
                  layer: request.layer,
                  ...(request.text !== undefined && {
                    text: request.text,
                  }),
                  ...(request.decorations !== undefined &&
                    request.decorations.length > 0 && {
                      decorations: [...request.decorations],
                    }),
                },
                UiPromptPaintResponseSchema(),
                BACKDROP_CLEAR_DELAY_MS,
              )
            )?.painted,
          suggestPrompt: async (request) =>
            (
              await structuredIO.sendUiHostRequest(
                {
                  subtype: "ui_prompt_suggest",
                  surface: request.surface,
                  client_id: request.clientId,
                  text: request.text,
                },
                UiPromptSuggestResponseSchema(),
                BACKDROP_CLEAR_DELAY_MS,
              )
            )?.shown,
          readSelection: async (request) => {
            if (!(!structuredIO.isRemoteTransport() && !isTransportBacked(session)))
              return causeOnlyResult("not_asked");
            let reply = await structuredIO.sendUiHostAsk(
              {
                subtype: "ui_read_selection",
                surface: request.surface,
                client_id: request.clientId,
              },
              UiReadSelectionResponseSchema(),
              BACKDROP_CLEAR_DELAY_MS,
            );
            return reply.cause === undefined
              ? selectionResult(reply.answer.text, reply.answer.instance_id)
              : causeOnlyResult(reply.cause);
          },
        })
      : () => {};
  let sessionHooks_2 = startSessionHooks({
    loaded: getPluginRegistry().hookRegistrationInFlight ?? getPluginRegistry().hooksLoadAtStartup,
    surface: null,
    isInteractive: false,
  });
  let initialWrite = initialWriteAttempt(false);
  let resolved_5 = Promise.resolve();
  let hostSessionOps = {
    titles: initialWrite,
    storageV5: options.storageV5,
    credentials: options.credentials,
    redactsPersistedLane: () => isTransportBacked(session),
    applyRenamedSessionName: (name) => {
      if (isTeammate()) return;
      resolved_5 = resolved_5
        .then(async () => {
          await saveSessionAgentName(
            name,
            "user",
            options.storageV5,
            undefined,
            false,
            undefined,
            undefined,
            undefined,
            "cache",
          );
        })
        .catch(logError);
    },
    pushHostRenameToBridge: (renamed, pushOptions) => {
      pushBridgeSessionTitle(renamed, pushOptions, getSdkHostedBridgeHandle, true, options.credentials);
    },
    dispatchCommands: () => otherCommands(),
    conversation: () => conversationRows,
    turnAbortSignal: () => turnAbort.turnAbortSignal(),
  };
  let currentAppState = emitSessionTitleChanges();
  let exiting = () =>
    runState.endSessionRequested ||
    isShuttingDown() ||
    isTerminalShutdown() ||
    hasReachedBudget(options.maxBudgetUsd);
  let contextForResume = async () => {
    if (!getLastCacheSafeParams()) await loadCacheSafeParams();
    let toolUseContext = getLastCacheSafeParams()?.toolUseContext;
    return toolUseContext
      ? contextAfterTurn(toolUseContext)
      : ask(askCall(queryContext()), {
          abortController: createAbortController(),
          userSpecifiedModel,
        });
  };
  let recordedAgentRun = new RecordedAgentResumeRun(
    options.agentResumes ?? [],
    {
      connectorsJoined: () =>
        refreshMcpForTurn(getAppState, subscribe, TRANSPORT_FALLBACK_TIMEOUT_MS, {
          waitForDeferrable: true,
          localOnly: false,
        }),
      contextForResume,
      canUseTool,
      exiting,
      messageQueue,
      cutOffAgentCalls: toolState.get(ResumedAgentCallRegistry),
      stopAgents: (agentsToStop) =>
        stopAllRunningTasks({
          taskRegistry: createTaskFramework(getAppState, setAppState),
          setAppState,
          storageV5: options.storageV5,
          shouldStop: (task) => agentsToStop.has(task.id),
        }),
      tracksAgent: (taskId) => Object.hasOwn(getAppState().tasks, taskId),
      storageV5: options.storageV5,
    },
    runState.whenEnding(),
    options.keptSubagentAsk,
    options.cutOffAgents,
  );
  let controlContext = {
    session,
    redactsPersistedLane: () => isTransportBacked(session),
    engineState: getAppState,
    setEngineState: setAppState,
    storageV5: options.storageV5,
    credentials: options.credentials,
    thinkingBudget: hasEffort,
    sessionTitles: hostSessionOps,
    mcpControlLanes: {
      resolveDeferredPluginStartup: loadCacheSafeParams,
      pendingManualExchange: (machineId) => oauthAuthPromises.get(machineId),
      postOAuthReconnectPending: reconnectAttemptsAt,
      ownerConfig: reconnectConfigFor,
      sdkClients: () => clients_3,
      registeredSdkServer: (serverName) => {
        let config = getOwn(sdkMcpServerConfigs, serverName);
        return config
          ? {
              ...config,
              scope: "dynamic",
            }
          : null;
      },
      startupClients: () => clients,
      dynamicClients: () => dynamicMcpState.clients,
      disableSdkServer,
      enableSdkServer,
      markDynamicServerDisabled: (serverName) => {
        dynamicMcpState = markServerDisabled(dynamicMcpState, serverName);
      },
      switchSaved: (serverName, config) => options.switchedOffMcpServers?.switchSaved(serverName, config),
      seedControlDialSlot: markConfigReplaced,
      reconnectForControlRequest: reconnectServer,
      landControlResult: onModelSwitchNotice,
    },
    replyNow: null,
    resumeUntrackedAgent: null,
    mcpConnections: () => ({
      connections: rows(),
      tools: [...getAppState().mcp.tools, ...dynamicMcpState.tools],
    }),
    isKnownMcpServer: (serverName) =>
      clients.some((client) => client.name === serverName) ||
      clients_3.some((client) => client.name === serverName) ||
      Object.hasOwn(sdkMcpServerConfigs, serverName) ||
      dynamicMcpState.clients.some((client) => client.name === serverName) ||
      getAppState().mcp.clients.some((client) => client.name === serverName) ||
      getMcpConfigByName(serverName) !== null,
    contextUsageInputs: contextUsageInputsForSummary,
  };
  let pluginSyncHooks = {
    enqueue: (frame) => output.enqueue(frame),
    storageV5: options.storageV5,
    credentials: options.credentials,
    ended: runState.whenEnding(),
  };
  let deferred_3 = Promise.withResolvers();
  let managedSettingsSettled = waitForRemoteManagedSettingsFetchToSettle().catch(logError);
  let results = Promise.all([managedSettingsSettled, deferred_3.promise]);
  let pluginInstallWait = env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL ? results : managedSettingsSettled;
  let settlePlugins =
    (onOptions, reloadPluginHooksQuiet = reloadPluginHooksNow) =>
    () => {
      onOptions.then(() => reloadPluginHooksQuiet(pluginSyncHooks)).catch(logError);
    };
  let pluginsSettled = settlePlugins(pluginInstallWait);
  let pluginsSettledWithHooks = settlePlugins(pluginInstallWait, reloadPluginHooksQuiet);
  let installState = {
    isSettled: false,
  };
  managedSettingsSettled.then(() => {
    installState.isSettled = true;
  });
  deferred_3.promise
    .then(() => (installState.isSettled ? reloadPluginHooksNow(pluginSyncHooks) : undefined))
    .catch(logError);
  pluginsSettledWithHooks();
  let unsubscribePass = subscribeHelperPassSettled(pluginsSettled);
  let unsubscribeLoadStatus = onLastLoadStatusChanged(pluginsSettledWithHooks);
  registerCleanup(async () => {
    unsubscribePass();
    unsubscribeLoadStatus();
  });
  runState.whenEnding().then(() => {
    unsubscribePass();
    unsubscribeLoadStatus();
  });
  async function prev(connection) {
    try {
      return await applyPluginConnection(connection);
    } finally {
      deferred_3.resolve();
    }
  }
  async function applyPluginConnection(connection) {
    try {
      await withDiagnosticsTiming("headless_managed_settings_wait", () =>
        waitForRemoteManagedSettingsToLoad(),
      );
    } catch (error) {
      logError(error);
    }
    let pluginsInstalled = false;
    try {
      let installedNames = new Set(
        Object.keys(
          (
            await getAllMcpConfigs({
              storageV5: options.storageV5,
              credentials: options.credentials,
              admits: bareModePluginAllow(),
            })
          ).servers,
        ),
      );
      pluginsInstalled = await installPluginsForHeadlessSerialized(
        connection,
        options.storageV5,
        options.credentials,
      );
      if (env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL)
        timings = {
          start: performance.now(),
        };
      if (pluginsInstalled) await applyPluginServers(installedNames, "plugin_install_diff");
    } catch (error) {
      logForDebugging(`Headless plugin install / MCP reconcile failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
    if (timings) {
      timings.end = performance.now();
      recordPhase("plugin_mcp_reconcile_ms", timings.end - timings.start, timings.start);
    }
    return pluginsInstalled;
  }
  let skillsSettled = null;
  let agentsSettled = null;
  let settingsSettled = null;
  let idleRefreshRan = false;
  let idleRefreshSyncTimedOut = false;
  let lastSyncedPromise = null;
  let resolveInstallGate;
  let syncInstallTimeoutMs = env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL_TIMEOUT_MS ?? 0;
  let timings;
  let skillsSyncStartedAt = performance.now();
  let skillsSyncLive = isSkillsSyncLive(session) && isSkillsCustomizationAllowed();
  let skillsSync = skillsSyncLive
    ? awaitFirstSkillList(session, options.storageV5, options.credentials)
    : null;
  let accountSkillsSyncRepopulate = !skillsSyncLive && isSkillsSyncActive(session);
  let startTime = performance.now();
  setAwaitsFirstRun(true);
  let pluginsSyncPromise = isPluginsSyncLive(session)
    ? runFirstPluginsSync(session, options.credentials)
    : null;
  let pluginRefreshState = null;
  let applySkillsSettle;
  if (!isBareMode()) {
    if (env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL) {
      applySkillsSettle =
        options.outputFormat === "stream-json"
          ? (tool) =>
              void structuredIO.write({
                type: "system",
                subtype: "plugin_install",
                status: tool.status,
                name: "name" in tool ? tool.name : undefined,
                error: "error" in tool ? tool.error : undefined,
                uuid: randomUUID(),
                session_id: getSessionId(),
              })
          : undefined;
      applySkillsSettle?.({
        status: "started",
      });
      skillsSettled = prev((prev) => applySkillsSettle?.(prev));
      let previousSkillsSettle = skillsSettled;
      let syncPromise = pluginsSyncPromise;
      let promise = new Promise((resolve) => {
        resolveInstallGate = resolve;
      });
      agentsSettled = (async () => {
        try {
          await Promise.race([previousSkillsSettle.catch(() => {}), promise]);
          if (syncPromise) {
            let remainingMs = pluginInstallTimeoutMs() - (performance.now() - startTime);
            await Promise.race([syncPromise.catch(() => {}), sleep(Math.max(0, remainingMs))]);
          }
          let pluginServers = isPluginsSyncLive(session) ? await loadPluginServerConfigs() : null;
          let startTime_2 = performance.now();
          await startRuntime();
          recordPhase("registry_refresh_ms", performance.now() - startTime_2, startTime_2);
          if (pluginServers) await applyPluginSettle(pluginServers);
        } catch (error) {
          logError(error);
        }
        try {
          let { setupPluginHookHotReload, startOwedPluginHookRegistration } =
            await import("../utils/plugins/loadPluginHooks.js");
          await startOwedPluginHookRegistration(options.storageV5, options.credentials);
          setupPluginHookHotReload(options.storageV5, options.credentials);
        } catch (error) {
          logError(error);
        }
      })();
    } else pluginRefreshState = initialPluginRefreshState(prev);
  } else deferred_3.resolve();
  {
    let hearthBridgeModule = require("../bridge/hearthBinding.js");
    bindingChangedHint = hearthBridgeModule.HEARTH_BINDING_CHANGED_HINT;
    let bridgeSdkUrl = hearthBridgeModule.parseBridgeSdkUrl(options.sdkUrl);
    if (bridgeSdkUrl && !isRemoteManagedEnvironment()) {
      let { createHeadlessHearthMount } = require("../bridge/headlessHearthMount.js");
      projectsMount = createHeadlessHearthMount({
        stores: reconnectStores,
        storageV5: options.storageV5,
        credentials: options.credentials,
        sessionId: bridgeSdkUrl.sessionId,
        apiBaseUrl: bridgeSdkUrl.apiBaseUrl,
        getBearerToken: getSessionIngressAuthToken,
        getWorkerEpoch: () => structuredIO.workerEpoch(),
        readHearthBinding: () => structuredIO.readProjectsBinding(),
        sdkHostConfigs: () => sdkMcpServerConfigs,
      });
    }
  }
  bridgeHostState().projectFilesDoor = () => {
    for (let holder of mcpSyncMounts()) {
      let door = holder.projectFilesDoor();
      if (door) return door;
    }
    return null;
  };
  let projectMountJoin = projectsMount?.sync("startup") ?? null;
  let projectThreadJoin =
    projectMountJoin !== null && env.CLAUDE_CODE_ENVIRONMENT_KIND === "bridge" ? projectMountJoin : null;
  let relayHoldFollowsBootVerdict = getFeatureValue_CACHED_MAY_BE_STALE("tengu_dapper_platypus", false);
  let deferredServerPolicy = () =>
    planMcpConnectorPrewait({
      explicitMcpConfigFlag: options.explicitMcpConfigFlag,
      sdkUrl: options.sdkUrl,
      hasStreamingInput: getHasStreamingInput(),
      toolSearchAvailable: isToolSearchToolAvailable(buildBridgeToolsUpdate(getAppState())),
      relayHoldFollowsBootVerdict,
    });
  let {
    deadlineMs,
    waitForDeferrable,
    firstTurnHold,
    localOnly,
    coordinatorMainThreadOnly,
    relayMarked,
    relayHold,
    laterWakes,
    launchNamed,
    skipFullyDeferredServers,
  } = deferredServerPolicy();
  if (relayMarked && !relayHold)
    logForDebugging(
      "relay-marked worker: no relay hold (its relay can no longer be used in this process); the first command waits for MCP servers as on an unmarked worker",
    );
  let ruleServerNames = () => mcpServersNamedByRules(getAppState().toolPermissionContext);
  let serverNamesFromRules = ruleServerNames();
  function whenPolicyAllows(policyAllows) {
    return pluginMcpServersRequired({
      policyAllows,
      clients: getAppState().mcp.clients,
      requiredServerNames: ruleServerNames,
      messages: conversationRows,
    });
  }
  let idleTimeout = whenPolicyAllows(() => skipFullyDeferredServers);
  let mcpClientCountAtKick = getAppState().mcp.clients.length;
  let startTime_2 = performance.now();
  let deferredTimeout = () =>
    relayMcpWaitLeft(startTime_2, deadlineMs ?? TRANSPORT_FALLBACK_TIMEOUT_MS, performance.now());
  let mcpPrewaitPromise = refreshMcpForTurn(getAppState, subscribe, deadlineMs, {
    waitForDeferrable,
    firstTurnHold,
    requiredServerNames: serverNamesFromRules,
    skipServerNames: idleTimeout,
    localOnly,
    coordinatorMainThreadOnly,
    relayMarked,
    relayHold,
    relayHoldFollowsBootVerdict,
    permissionPromptToolServerName: options.permissionPromptToolServerName,
  });
  let startupJoin;
  let sessionStartPending;
  sessionStartHostRefusedSlot.set(() => sessionStartPending !== undefined);
  let pluginsSessionStartOwed = false;
  let pluginsSessionStartNeeded = false;
  let lateSessionStartRows = {
    session,
    conversation: () => conversationRows,
    append: appendToConversation,
    waiting: releaseHeldSessionStartRows(conversationRows),
    clears: 0,
    storageV5: options.storageV5,
    credentials: options.credentials,
  };
  if (options.overdueSessionStartHooks !== undefined)
    appendSessionStartHooksWhenDone(lateSessionStartRows, options.overdueSessionStartHooks, (rows) =>
      structuredIO.prependUserMessage(rows),
    );
  let turnCounter = 0;
  let lastPluginRefreshStart = 0;
  let turnStartChecks = new TurnStartChecks({
    deferredCommandsJoin: sdkSyncPending,
    parkedPermissionRetirement: () => parkedPermissions.retirement,
    takeClaimSessionStartHooks: () => {
      let startupJoinSlot = startupJoin;
      startupJoin = undefined;
      return startupJoinSlot;
    },
    takeNewPluginsSessionStart: () => {
      if (!pluginsSessionStartOwed) return;
      pluginsSessionStartOwed = false;
      return runLateSessionStartHooks(lateSessionStartRows);
    },
    runSessionStartHooksOfNewPlugins: () => runLateSessionStartHooks(lateSessionStartRows),
    sdkUrl: options.sdkUrl,
    sdkMcpUpdateKind: () => mcpSyncNeeded(sdkMcpServerConfigs, clients_3),
    sdkMcpServersPending: () =>
      countWhere(Object.keys(sdkMcpServerConfigs), (serverName) => {
        let found = clients_3.find((client) => client.name === serverName);
        return found === undefined || found.type === "pending";
      }),
    sdkToolRelistPending,
    updateSdkMcp: serializedRedialAll,
    noteSdkEntryWait: () => ternalState.noteEntryWait(),
    skillsSync,
    skillsSyncStartedAt,
    accountSkillsSyncRepopulate,
    refreshCurrentCommands: () => refreshCurrentCommands(),
    pluginStateRefreshTickets: () => ({
      started: turnCounter,
      lastCompletedStart: lastPluginRefreshStart,
    }),
    pluginStartupPending: () => Boolean(pluginsSyncPromise || skillsSettled || pendingPluginInstalls > 0),
    resolveDeferredPluginStartup: loadCacheSafeParams,
    closePluginInstallBracket: () => {
      applySkillsSettle?.({
        status: "completed",
      });
      applySkillsSettle = undefined;
      resolveInstallGate?.();
    },
    backgroundInstall: pluginRefreshState,
    refreshPluginState: startRuntime,
    refillMarketplaces: () =>
      installPluginsForHeadlessSerialized(undefined, options.storageV5, options.credentials),
    applyPluginMcpDiff: applyPluginServers,
    connectedNonDynamicMcpServerNames: connectedNonDynamicServers,
    serverNamesOwnedBeforePluginsSync: loadPluginServerConfigs,
    pendingPluginRefresh: () => agentsSettled,
    pluginRefreshJoined: () => {
      agentsSettled = null;
    },
    mcpClientCountAtKick,
    mcpPrewaitPromise,
    enterPhase: (phase) => runState.turnStartClock.enter(phase),
    session,
    credentials: options.credentials,
    firstCommandMountJoin: (firstCommandMountJoin) => {
      if (projectThreadJoin !== null) {
        let mountJoin = projectThreadJoin;
        projectThreadJoin = null;
        let mountModule = require("../bridge/projectsReplyEvaluation.js");
        return mountModule.joinProjectsMountBeforeFirstCommand(
          mountJoin,
          getAppState,
          Math.max(
            mountModule.PROJECTS_MOUNT_FIRST_COMMAND_WAIT_FLOOR_MS,
            mountModule.PROJECTS_MOUNT_FIRST_COMMAND_WAIT_MS - firstCommandMountJoin,
          ),
        );
      }
      return null;
    },
    mcpPrewait: {
      deadlineMs,
      waitForDeferrable,
      firstTurnHold,
      policyAtFirstCommand: () => deferredServerPolicy(),
      skippedAtKick: idleTimeout,
      serversToSkipNow: (skipNow) => whenPolicyAllows(() => skipNow),
      requiredAtKick: serverNamesFromRules,
      requiredServersNow: ruleServerNames,
      localOnly,
      coordinatorMainThreadOnly,
      relayMarked,
      relayHold,
      relayHoldFollowsBootVerdict,
      permissionPromptToolServerName: options.permissionPromptToolServerName,
      freshWaitDeadlineMs: relayHold ? deferredTimeout : undefined,
      laterWakes,
    },
    waitForPendingMcp: (serverNames, options) =>
      refreshMcpForTurn(getAppState, subscribe, serverNames, options),
    store,
    allMcpClients: (state) => mergeClients(state.mcp.clients, clients_3, dynamicMcpState.clients),
    registerElicitationHandlers: elicitationRegistrar,
    registerChannelHandler: (serverName) => reregisterChannelHandlerAfterReconnect(serverName, messageQueue),
    buildAllTools: buildBridgeToolsUpdate,
  });
  let ternalState = new SdkMcpServerWait({
    sdkUrl: options.sdkUrl,
    unconnectedServers: () =>
      Object.entries(sdkMcpServerConfigs).flatMap(([key, value]) => {
        let found = clients_3.find((candidateClient) => candidateClient.name === key);
        return found === undefined || found.type === "pending" ? [value] : [];
      }),
    updateSdkMcp: serializedRedialAll,
    relayWaitLeftMs: relayHold ? deferredTimeout : undefined,
  });
  let any = messages.some((newCommands) => newCommands.type === "user" || newCommands.type === "assistant");
  let mcpPrewait = new McpPrewait({
    setting: launchNamed,
    kickedAtMs: options.mcpConnectKickedAtMs ?? startTime_2,
    coordinatorMainThreadOnly,
    relayMarked,
    relayHoldLog: {
      relayHold,
      relayHoldFollowsBootVerdict,
    },
    startedFromTranscript: any,
    mainThreadRequested: () => session.requestJournal.mainThreadRequestedInProcess(),
    mcpClients: () => getAppState().mcp.clients,
    waitForPendingMcp: (serverNames, options) =>
      refreshMcpForTurn(getAppState, subscribe, serverNames, options),
  });
  let run = () =>
    !runState.running &&
    !bangRunner.isBusy &&
    !remoteMcpTracker.isBusy &&
    !remoteMcpTracker.hasRunningTask(getAppState().tasks) &&
    pendingWorkflowLaunches === 0 &&
    !rewindLimitAsked &&
    !hasBesideArrivingFiles() &&
    !hasAwaitedRunningTaskIn(getAppState().tasks) &&
    !(env.CLAUDE_CODE_ENVIRONMENT_KIND === "bridge" && hasAwaitedRunningTasks(getAppState().tasks)) &&
    !hasWorkingInProcessTeammates(getAppState()) &&
    !collectOwedTaskNotifications({
      tasks: Object.values(getAppState().tasks ?? {}),
      waits: notificationWaits,
      now: Date.now(),
    });
  let timeoutMs = createIdleTimeoutManager(
    () => run() && !neverFalse(Date.now()),
    () => {
      if (
        !runState.running &&
        !isShuttingDown() &&
        !isTerminalShutdown() &&
        structuredIO.sessionState.getState() === "running"
      )
        structuredIO.sessionState.notifyStateChanged("idle");
    },
  );
  let idleRelease = timeoutMs;
  if (env.CLAUDE_CODE_SLEEP_COMPACT) {
    let {
      isSleepCompactionHost,
      SleepCompactor,
      withSleepCompaction,
    } = require("../services/compact/SleepCompactor.lazy.js");
    if (isSleepCompactionHost())
      idleRelease = withSleepCompaction(
        timeoutMs,
        new SleepCompactor({
          isIdle: run,
          isStopping: () => isShuttingDown() || isTerminalShutdown() || runState.inputClosed,
          isPermissionPending: () => parkedPermissions.inheritedPromptPending(),
          enqueueCompact: () => {
            messageQueue.enqueue({
              mode: "prompt",
              agentId: mainAgentId(),
              value: "/compact",
              uuid: randomUUID(),
              priority: "later",
              isMeta: true,
              skipAttachments: true,
            });
            kickQueue();
          },
          exitDelayMs: env.CLAUDE_CODE_EXIT_AFTER_STOP_DELAY,
        }),
      );
  }
  async function startRuntime(runtimeOptions = {}) {
    let generation = ++turnCounter;
    let { agentDefinitions } = await refreshActivePlugins(
      pluginsStateStore,
      options.storageV5,
      options.credentials,
      runtimeOptions,
    );
    startupReleased = true;
    sdkServersList = getNonInteractiveCommands(await getCommands(cwd(), options.storageV5));
    mcpSyncDone = true;
    replaceCommandsFromFlags(agentDefinitions.allAgents);
    queueDeferred();
    loadAllPluginsCacheOnly(options.storageV5, options.credentials).then(
      (cmd) =>
        addStartupContext({
          plugin_count: cmd.enabled.length,
        }),
      () => {},
    );
    lastPluginRefreshStart = Math.max(lastPluginRefreshStart, generation);
  }
  async function reloadPluginServers(
    servers,
    reloadOptions = {
      restartLaunchDirStdioServers: false,
    },
  ) {
    devIntentTracker.of(session.host).directoryChanged();
    let workspaceRoot = getOriginalCwd();
    let permissionPromptToolName = options.permissionPromptToolName;
    let redialedServers = [];
    let listedServer;
    setAppState((state) => {
      let { stale, ...rest } = removeMcpClientsWhere(state.mcp, (client) =>
        isDeclaredUnderOtherWorkspaceRoot(client.config, workspaceRoot),
      );
      if (stale.length === 0) return state;
      redialedServers = stale;
      listedServer =
        permissionPromptToolName === undefined || options.permissionPromptToolServerName === undefined
          ? undefined
          : state.mcp.tools.find((tool) => matchesToolName(tool, permissionPromptToolName))?.mcpInfo
              ?.serverName;
      return {
        ...state,
        mcp: {
          ...state.mcp,
          ...rest,
        },
      };
    });
    for (let entry of redialedServers) {
      if (
        options.permissionPromptToolBinding !== undefined &&
        matchesListedOrParsedServer(entry.name, {
          listedServer,
          parsedServer: options.permissionPromptToolServerName,
        })
      )
        options.permissionPromptToolBinding.swept = true;
      if (isConnectedOrCached(entry))
        await getMcpClientModule()
          .clearServerCache(entry.name, entry.config)
          .catch(() => {});
    }
    if (reloadOptions.restartLaunchDirStdioServers) await restartStdioServers();
    await startRuntime({
      applyStagedInstalls: false,
    });
    let previousNames = new Set(Object.keys(dynamicMcpState.configs));
    let nextNames = new Set(
      getAppState()
        .mcp.clients.filter((client) => !previousNames.has(client.name))
        .map((client) => client.name),
    );
    await applyPluginServers(nextNames, servers);
  }
  async function restartStdioServers() {
    let knownNames = new Set(Object.keys(dynamicMcpState.configs));
    let batchUuids = getAppState().mcp.clients.filter(
      (client) =>
        !knownNames.has(client.name) &&
        isStdioConfig(client.config) &&
        !isBuiltinInProcessMcpServer(client.name) &&
        (client.type === "connected" || client.type === "pending" || client.type === "failed") &&
        !mcpDialBlockCause(client.name, client.config) &&
        !isMcpServerDisabled(client.name),
    );
    let filtered = getAppState().mcp.clients.filter(
      (client) =>
        client.type === "cached" &&
        !knownNames.has(client.name) &&
        isStdioConfig(client.config) &&
        !isBuiltinInProcessMcpServer(client.name),
    );
    for (let serverName of filtered)
      getMcpClientModule()
        .clearServerCache(serverName.name, serverName.config)
        .catch(() => {});
    if (batchUuids.length === 0) return;
    logForDebugging(
      `set_cwd: re-dialling ${batchUuids.length} stdio MCP server(s) spawned in the launch directory`,
    );
    let pendingServerNames = new Set(
      batchUuids.filter((batchUuid) => batchUuid.type === "pending").map((batchUuid) => batchUuid.name),
    );
    if (pendingServerNames.size > 0)
      await waitForStoreState(
        {
          getState: getAppState,
          subscribe,
        },
        (name) =>
          !name.mcp.clients.some(
            (client) => pendingServerNames.has(client.name) && client.type === "pending",
          ),
        {
          timeoutMs: Math.min(
            Math.max(deadlineMs ?? 0, TRANSPORT_FALLBACK_TIMEOUT_MS),
            getConnectTimeoutMs(),
          ),
        },
      );
    turnStartChecks.noteServersStartedSinceKick(batchUuids.map((batchUuid) => batchUuid.name));
    let removeOne = (name) => {
      let redialOne = false;
      setAppState((state) => {
        let found = state.mcp.clients.find((client) => client.name === name.name);
        if (!found || !getMcpClientModule().areMcpConfigsEqual(found.config, name.config)) return state;
        redialOne = true;
        if (found.type === "pending") return state;
        return {
          ...state,
          mcp: {
            ...state.mcp,
            clients: state.mcp.clients.map((client) =>
              client === found
                ? {
                    name: client.name,
                    type: "pending",
                    config: client.config,
                  }
                : client,
            ),
          },
        };
      });
      return redialOne;
    };
    let reconnectBatch = async (name) => {
      if (!removeOne(name)) return;
      let entry = await redialServer(name.name, name.config);
      logMCPDebug(name.name, `re-dialled under the new project root after set_cwd: ${entry.type}`);
    };
    let results = Promise.all(
      batchUuids.map((batchUuid) =>
        reconnectBatch(batchUuid).catch((error) =>
          logForDebugging(
            `set_cwd: re-dialling ${batchUuid.name} failed (continuing): ${errorMessage(error)}`,
            {
              level: "error",
            },
          ),
        ),
      ),
    );
    if (getMcpConnectNonBlocking()) return;
    await Promise.race([
      results,
      sleep(getConnectTimeoutMs(), undefined, {
        unref: true,
      }),
    ]);
  }
  function connectedNonDynamicServers() {
    let currentNames = new Set(Object.keys(dynamicMcpState.configs));
    return new Set(
      getAppState()
        .mcp.clients.filter((client) => !currentNames.has(client.name))
        .map((client) => client.name),
    );
  }
  async function loadPluginServerConfigs() {
    let { servers } = await getAllMcpConfigs({
      storageV5: options.storageV5,
      credentials: options.credentials,
      admits: bareModePluginAllow(),
    });
    let appState = connectedNonDynamicServers();
    let suppressedPluginMcpServers = getAppState().mcp.suppressedPluginMcpServers ?? [];
    let failedNames = new Set();
    for (let [key, value] of Object.entries(servers))
      if (
        value.pluginSource === undefined ||
        marketplaceSuffix(value.pluginSource) !== SYNCED ||
        appState.has(key) ||
        suppressedPluginMcpServers.includes(key)
      )
        failedNames.add(key);
    return failedNames;
  }
  async function applyPluginServers(servers, reason, scope = "configured") {
    let { servers: servers_2 } = await getAllMcpConfigs({
      storageV5: options.storageV5,
      credentials: options.credentials,
      admits: bareModePluginAllow(),
    });
    setAppState((state) => {
      let suppressedPluginMcpServers = state.mcp.suppressedPluginMcpServers;
      if (!suppressedPluginMcpServers || suppressedPluginMcpServers.length === 0) return state;
      let filtered = suppressedPluginMcpServers.filter((suppressedPluginMcpServer) =>
        Object.hasOwn(servers_2, suppressedPluginMcpServer),
      );
      return filtered.length === suppressedPluginMcpServers.length
        ? state
        : {
            ...state,
            mcp: {
              ...state.mcp,
              suppressedPluginMcpServers: filtered,
            },
          };
    });
    addStartupContext({
      mcp_server_count: Object.keys(servers_2).length,
    });
    let hermeticRemote = isHermeticRemoteSession();
    let strictMcpConfig = getStrictMcpConfig();
    let scopedServers = filterServersForScope(servers_2, {
      scope,
      strictMcpConfig,
    });
    let skippedCount = countWhere(Object.keys(servers_2), (name) => !Object.hasOwn(scopedServers, name));
    if (skippedCount > 0)
      logForDebugging(
        `Headless MCP refresh (${reason}): ${skippedCount} configured server(s) left out (scope=${typeof scope === "string" ? scope : "copies"}, strict-mcp-config=${strictMcpConfig})`,
      );
    let connected = Object.create(null);
    for (let [key, value] of Object.entries(scopedServers)) {
      if (hermeticRemote && (value.scope === "project" || value.scope === "local")) continue;
      if (servers?.has(key) && !Object.hasOwn(dynamicMcpState.configs, key)) continue;
      if (isParkedSpare() && isNonReservedStdioConfig(key, value)) continue;
      let type = value.type;
      if (type === undefined || type === "stdio" || type === "sse" || type === "http" || type === "sdk")
        connected[key] = value;
    }
    for (let [key, value] of Object.entries(sdkMcpServerConfigs))
      if (
        value.type === "sdk" &&
        (!Object.hasOwn(connected, key) ||
          (Object.hasOwn(servers_2, key) && servers_2[key]?.scope === "dynamic"))
      )
        connected[key] = value;
    let { response, sdkServersChanged } = await applySdkServerSet(connected, {
      authoritative: false,
      caller: reason,
      deferConnect: getMcpConnectNonBlocking(),
      pluginDiffScope: scope,
      pluginCandidates: scopedServers,
    });
    if (sdkServersChanged) serializedRedialAll();
    logForDebugging(
      `Headless MCP refresh: added=${response.added.length}, removed=${response.removed.length}`,
    );
  }
  async function recheckPluginCopies() {
    try {
      if (pluginServerHosts.size === 0 || isShuttingDown() || getSyncedPluginReloadDebt().reloadHeld) return;
      let copies = serversNeedingNotReconnect(pluginServerHosts, operatorOwnedConfigs(), rows());
      if (copies.size === 0) return;
      for (let key of copies.keys()) pluginServerHosts.delete(key);
      await applyPluginServers(connectedNonDynamicServers(), "plugin_copy_recheck", {
        copies,
      });
    } catch (error) {
      logForDebugging(
        `plugin copy re-check failed, its copies wait for the next plugin diff: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    }
  }
  async function applyPluginSettle(pluginServers) {
    let startTime = performance.now();
    let relay = relayHold;
    let deferredCount = relay ? deferredTimeout() : 0;
    let timeoutMs = pluginMcpTimeoutMs();
    let waitMs = relay && timeoutMs === 0 ? deferredCount : timeoutMs;
    let applyPromise = applyPluginServers(pluginServers, "plugins_sync");
    if (waitMs === 0) {
      applyPromise.catch((error) => logError(error));
      recordPhase("plugins_sync_mcp_ms", 0);
      logEvent("tengu_plugins_sync_mcp_skipped", {
        relay_marked: relayMarked,
        relay_hold: relayHold,
      });
      return;
    }
    let timeoutPromise = sleep(waitMs).then(() => "timeout");
    let syncTimedOut = false;
    try {
      if ((await Promise.race([applyPromise, timeoutPromise])) === "timeout") {
        syncTimedOut = true;
        logEvent("tengu_plugins_sync_mcp_timeout", {
          timeout_ms: waitMs,
        });
        applyPromise.catch((error) => logError(error));
      }
    } catch (error) {
      logError(error);
    }
    let startTime_2 = performance.now();
    recordPhase("plugins_sync_mcp_ms", startTime_2 - startTime);
    if (relay) {
      if (syncTimedOut) {
        let max = Math.max(0, deferredCount - (performance.now() - startTime));
        await withDeadline(
          applyPromise.catch(() => {}),
          max,
        );
      }
      let startTime_3 = performance.now();
      let max = Math.max(0, deferredCount - (startTime_3 - startTime));
      let skipDeferred = whenPolicyAllows(() => deferredServerPolicy().skipFullyDeferredServers);
      await refreshMcpForTurn(getAppState, subscribe, max, {
        skipTelemetry: true,
        waitForDeferrable: true,
        skipServerNames: skipDeferred,
      });
      logEvent("tengu_plugins_sync_mcp_relay_wait", {
        reconcile_timed_out: syncTimedOut,
        connect_budget_ms: Math.round(max),
        connect_waited_ms: Math.round(performance.now() - startTime_3),
        pending_waited_after: countWhere(
          getAppState().mcp.clients,
          (client) => client.type === "pending" && !skipDeferred.has(client.name),
        ),
      });
      recordPhase("plugins_sync_mcp_relay_wait_ms", performance.now() - startTime_2, startTime_2);
    }
  }
  async function awaitPluginSync() {
    settingsSettled = null;
    let startTime = performance.now();
    try {
      let pluginServers = await loadPluginServerConfigs();
      await startRuntime();
      await applyPluginSettle(pluginServers);
      recordPhase("plugin_state_refresh_inline_ms", performance.now() - startTime, startTime);
    } catch (error) {
      logError(error);
    }
  }
  let pendingSync = null;
  let pendingPluginInstalls = 0;
  function loadCacheSafeParams() {
    if (pendingSync) return pendingSync;
    pendingPluginInstalls++;
    pluginsSessionStartNeeded ||= Boolean(pluginsSyncPromise || skillsSettled);
    let syncResult = loadPluginSync()
      .catch((error) => {
        logError(error);
        if (pendingSync === syncResult) pendingSync = null;
      })
      .finally(() => {
        pendingPluginInstalls--;
        pluginsSessionStartOwed ||= pluginsSessionStartNeeded;
      });
    pendingSync = syncResult;
    return syncResult;
  }
  async function loadPluginSync() {
    let syncLanded = false;
    try {
      if (pluginsSyncPromise) {
        let startTime_2 = performance.now();
        let remainingMs = pluginInstallTimeoutMs() - (startTime_2 - startTime);
        let timeoutPromise = sleep(Math.max(0, remainingMs)).then(() => "timeout");
        let timedOut = (await Promise.race([pluginsSyncPromise, timeoutPromise])) === "timeout";
        logForDiagnosticsNoPII("info", "plugins_sync_wait", {
          timed_out: timedOut,
        });
        if (timedOut) {
          logEvent("tengu_plugins_sync_wait_timeout", {});
          pluginsSyncPromise
            .then(() => {
              turnStartChecks.notePluginsSyncLanded();
            })
            .catch(logError);
        }
        recordPhase("plugins_sync_install_ms", performance.now() - startTime_2);
        pluginsSyncPromise = null;
        if (!skillsSettled && !agentsSettled) await awaitPluginSync();
        syncLanded = !timedOut;
      }
      if (skillsSettled) {
        let startTime = performance.now();
        if (syncInstallTimeoutMs > 0) {
          let timeoutPromise = sleep(syncInstallTimeoutMs).then(() => "timeout");
          if ((await Promise.race([skillsSettled, timeoutPromise])) === "timeout") {
            logForDebugging(
              `CLAUDE_CODE_SYNC_PLUGIN_INSTALL: plugin installation timed out after ${syncInstallTimeoutMs}ms`,
              {
                level: "error",
              },
            );
            logEvent("tengu_sync_plugin_install_timeout", {
              timeout_ms: syncInstallTimeoutMs,
            });
          }
        } else await skillsSettled;
        recordPhase("plugin_install_ms", performance.now() - startTime, startTime);
        if (timings)
          recordPhase(
            "plugin_mcp_reconcile_ms",
            (timings.end ?? performance.now()) - timings.start,
            timings.start,
          );
        skillsSettled = null;
        resolveInstallGate?.();
        recordPhase("plugin_install_total_ms", performance.now() - startTime, startTime);
      }
    } finally {
      applySkillsSettle?.({
        status: "completed",
      });
      applySkillsSettle = undefined;
      resolveInstallGate?.();
    }
    if (agentsSettled) {
      let startTime = performance.now();
      await agentsSettled;
      recordPhase("plugin_state_refresh_join_ms", performance.now() - startTime, startTime);
    }
    let needsRefresh = pluginRefreshState?.needsRefresh === true;
    if (
      needsPluginRefreshAfterIdle({
        idleRefreshRan,
        idleRefreshSyncTimedOut,
        syncLanded,
        syncRoundReplaced:
          lastSyncedPromise !== null && session.pluginsSync.firstSyncPromise !== lastSyncedPromise,
        installNeedsRefresh: needsRefresh,
      })
    ) {
      await awaitPluginSync();
      if (needsRefresh && pluginRefreshState) pluginRefreshState.needsRefresh = false;
    }
    if (settingsSettled) {
      let settingsPromise = settingsSettled;
      settingsSettled = null;
      try {
        await applyPluginSettle(settingsPromise);
      } catch (error) {
        logError(error);
      }
    }
  }
  function settleServer(servers, serverName, timeoutMs) {
    return servers === serverName || CLAUDEAI_SERVER_PREFIX(servers) === timeoutMs;
  }
  function keyForServer(serverName) {
    let normalized = CLAUDEAI_SERVER_PREFIX(serverName);
    return [...getAppState().mcp.clients, ...clients_3, ...dynamicMcpState.clients].filter((cache) =>
      settleServer(cache.name, serverName, normalized),
    );
  }
  async function waitForServer(serverName, params, elicitSignal) {
    let statusRow = (status) =>
      status.find(
        (status) =>
          status.type === "connected" && !isMcpServerBlockedAtConnectTime(status.name, status.config),
      );
    let deadline = params !== undefined ? parseIsoTimestamp(params) : Number.POSITIVE_INFINITY;
    let min = Math.min(Date.now() + PRINT_TURN_TIMEOUT_MS, Number.isNaN(deadline) ? Date.now() : deadline);
    let cachedAccepted = false;
    async function waitUntil(status) {
      let row = statusRow(status);
      if (row) return row;
      let found = status.find((cached) => cached.type === "cached");
      if (!found || cachedAccepted) return;
      let max = Math.max(0, min - Date.now());
      if (max === 0) {
        cachedAccepted = true;
        return;
      }
      try {
        return await getMcpClientModule().ensureConnectedClient(found, {
          signal: elicitSignal,
          timeoutMs: max,
          context: "mcp_call lazy connect",
        });
      } catch (error) {
        cachedAccepted = true;
        if (
          (await getMcpClientModule().peekSettledConnection(found.name, found.config))?.type ===
            "needs-auth" ||
          error instanceof McpAuthError
        )
          mcpConnectionStore.markNeedsAuth(found.name);
        logForDebugging(
          `mcp_call: lazy connect of cached server "${serverName}" failed: ${errorMessage(error)}`,
        );
        return;
      }
    }
    let row = await waitUntil(keyForServer(serverName));
    if (row) return row;
    if (
      (await Promise.race([
        loadCacheSafeParams().then(() => "resolved"),
        sleep(Math.max(0, min - Date.now()), elicitSignal),
      ])) === "resolved"
    ) {
      let key = CLAUDEAI_SERVER_PREFIX(serverName);
      if (!(
        keyForServer(serverName).length > 0 ||
        Object.keys(dynamicMcpState.configs).some((key_2) => settleServer(key_2, serverName, key)) ||
        (await Promise.race([
          getAllMcpConfigs({
            storageV5: options.storageV5,
            credentials: options.credentials,
            admits: bareModePluginAllow(),
          }).then(({ servers }) =>
            Object.keys(servers).some((key_2) => settleServer(key_2, serverName, key)),
          ),
          sleep(Math.max(0, min - Date.now()), elicitSignal).then(() => true),
        ]))
      ))
        return;
    }
    let min_2 = Math.min(min, Date.now() + ELICIT_WAIT_RETRY_MS);
    while (!elicitSignal.aborted) {
      let key = keyForServer(serverName);
      let row = await waitUntil(key);
      if (row) return row;
      if (
        key.length > 0 &&
        key.every((row) => row.type !== "pending" && (row.type !== "cached" || cachedAccepted))
      )
        return;
      if (Date.now() >= (key.length === 0 ? min_2 : min)) break;
      await sleep(50, elicitSignal);
    }
    if (elicitSignal.aborted) return;
    return statusRow(keyForServer(serverName));
  }
  let settled = true;
  function noteSurfaceChange() {
    return (
      settled &&
      options.outputFormat === "stream-json" &&
      canServeManifests(structuredIO.uiSurfaceChannel()) &&
      (!structuredIO.isRemoteTransport() || clientRegistry.list().length > 0)
    );
  }
  function requestRender() {
    if (noteSurfaceChange())
      enqueueTaskNotification({
        type: "system",
        subtype: "ui_invalidate",
        event: "ui.render",
      });
  }
  let uiStatusBuffer = createUiStatusBuffer(Date.now);
  let uiStatusSent = false;
  let panelAttachOwed = false;
  function rewire(rewireAfterAgentChange) {
    if (noteSurfaceChange()) {
      uiStatusBuffer.note(rewireAfterAgentChange);
      enqueueTaskNotification(rewireAfterAgentChange);
      return true;
    }
    let manifestsServable =
      settled &&
      options.outputFormat === "stream-json" &&
      canServeManifestsForRemoteCall(structuredIO.uiSurfaceChannel(), clientRegistry.list().length > 0);
    if (manifestsServable) uiStatusBuffer.hold(rewireAfterAgentChange);
    else {
      uiStatusBuffer.note(rewireAfterAgentChange);
      uiStatusSent ||= rewireAfterAgentChange.subtype === "ui_status";
    }
    return manifestsServable;
  }
  function ensureClientConnected(isFirstClient) {
    let isRemote = structuredIO.isRemoteTransport();
    if (!isRemote && !uiStatusSent) return;
    let batch = isRemote && isFirstClient ? uiStatusBuffer.forFirstClient() : uiStatusBuffer.forLaterClient();
    if (!noteSurfaceChange()) return;
    uiStatusSent = false;
    for (let uuid of batch) enqueueTaskNotification(uuid);
  }
  let surfaceDeclarationTracker = createSurfaceDeclarationTracker(
    {
      isRemoteTransport: () => structuredIO.isRemoteTransport(),
      senderStands: (result) => structuredIO.surfaceSenderStands(result),
      welcomeBack: () => {
        let renderer = renderInstance;
        pruneDetachedClients();
        ensureClientConnected(false);
        notifyPlacedRows();
        attachRenderer(renderer);
        requestRender();
      },
    },
    (clientId, options) => structuredIO.surfaceClientAttached(clientId, options),
  );
  let lastCommandsJson = null;
  let deferredQueued = false;
  let deferredPending = false;
  let queueDeferred = () => {
    if (settled) noteEffortChange("state_change");
    if (!settled || options.outputFormat !== "stream-json") return;
    if (deferredQueued) {
      deferredPending = true;
      return;
    }
    if (lastCommandsJson === null) return;
    let slashCommands = toSlashCommands(otherCommands());
    let fingerprint = jsonStringify(slashCommands);
    if (fingerprint === lastCommandsJson) return;
    lastCommandsJson = fingerprint;
    enqueueTaskNotification({
      type: "system",
      subtype: "commands_changed",
      commands: slashCommands,
    });
  };
  let refreshCommandsNow = () => {
    deferredQueued = false;
    if (deferredPending) {
      deferredPending = false;
      try {
        queueDeferred();
      } catch (error) {
        logError(error);
      }
    }
  };
  let refreshCurrentCommands = async () => {
    if (!getHostState().isAnnouncingFreshLoad) clearCommandsCache();
    sdkServersList = getNonInteractiveCommands(await getCommands(getOriginalCwd(), options.storageV5));
    mcpSyncDone = true;
    notifyAgentsChanged();
    queueDeferred();
  };
  let refreshPromise;
  let refreshFailed = false;
  let onRefreshError = (error) => {
    refreshFailed = true;
    logError(error);
  };
  let refreshCommandsThrottled = new ThrottledReread(() => refreshCurrentCommands().catch(onRefreshError));
  let reloadCommandsNow = () => {
    let commands = refreshCurrentCommands()
      .catch(onRefreshError)
      .finally(() => {
        if (refreshPromise === commands) refreshPromise = undefined;
      });
    refreshPromise = commands;
  };
  let pluginDirHooks = {
    reload: async () => {
      let reload = await logPluginDirReload(pluginsStateStore, {
        model: activeModel() ?? getMainLoopModel(),
        mcpClients: getAppState().mcp.clients,
        dynamicMcpConfig: computeDynamicMcpConfig(),
        storageV5: options.storageV5,
        credentials: options.credentials,
      });
      if (reload === "held") return reload;
      startupReleased = true;
      replaceCommandsFromFlags(getAppState().agentDefinitions.allAgents);
      let [pluginLoad, skillsLoad] = await Promise.allSettled([
        refreshCurrentCommands(),
        applyPluginServers(connectedNonDynamicServers(), "reload_plugins"),
      ]);
      if (pluginLoad.status === "rejected") logError(pluginLoad.reason);
      if (skillsLoad.status === "rejected")
        logForDebugging(
          `plugin-dir watch reload: applyPluginMcpDiff failed: ${errorMessage(skillsLoad.reason)}`,
          {
            level: "error",
          },
        );
      return reload;
    },
    joinPluginDir: addPluginDirAndRebuildSandbox,
    retarget: (dir) => pluginsStateStore.retarget(dir),
  };
  pendingReloadSlot.set(pluginDirHooks);
  installDevModsPlaceholderExpander();
  let refreshAgents = () =>
    Promise.resolve()
      .then(() => getAgentDefinitionsWithOverrides(getOriginalCwd(), options.storageV5))
      .then((result) => replaceCommandsFromFlags(result.allAgents))
      .catch((error) => {
        onRefreshError(error);
        agents = withLiveRegisteredAgents(agents);
      });
  let unsubscribeSkillChange = sharedSkillChangeDetector.subscribe(() => {
    reloadCommandsNow();
    refreshAgents();
  });
  let managedDirPrefix = "";
  let retargetSkills = () => {
    try {
      managedDirPrefix = join(getManagedFilePath(), ".claude") + sep;
      return managedFolderCondition();
    } catch (error) {
      logError(error);
      refreshFailed = true;
      return "unread:";
    }
  };
  let notifyAgentsChanged = () => {
    let state = retargetSkills();
    let managedAskReadable = managedSettingsAskState.readAs !== false;
    if (state !== "held:" && !(state === "unread:" && managedAskReadable)) return;
    let isManagedAgent = (source, baseDir) =>
      source === "policySettings" && baseDir?.startsWith(managedDirPrefix) === true;
    sdkServersList = sdkServersList.filter(
      (agent) =>
        agent.type !== "prompt" || !isManagedAgent(agent.source, agent.skillRoot ?? agent.skillFile?.path),
    );
    agents = agents.filter((agent) => !isManagedAgent(agent.source, agent.baseDir));
  };
  let readSkillState = () => {
    let initialSettings = getInitialSettings();
    return {
      skillOverrides: jsonStringify(initialSettings.skillOverrides ?? {}),
      bundledSkillsDisabled: isBundledSkillsDisabled(initialSettings),
      managedFolderHold: retargetSkills(),
    };
  };
  let lastSkillState = readSkillState();
  notifyAgentsChanged();
  sdkSyncPending?.then(notifyAgentsChanged).catch(logError);
  let unsubscribeSettings = settingsChangeDetector.subscribe(() => {
    let next = readSkillState();
    let skillOverridesChanged = next.skillOverrides !== lastSkillState.skillOverrides;
    let bundledChanged = next.bundledSkillsDisabled !== lastSkillState.bundledSkillsDisabled;
    let managedHoldChanged = refreshFailed || next.managedFolderHold !== lastSkillState.managedFolderHold;
    if (!skillOverridesChanged && !bundledChanged && !managedHoldChanged) return;
    lastSkillState = next;
    if (managedHoldChanged) {
      refreshFailed = false;
      notifyAgentsChanged();
      reloadCommandsNow();
      refreshAgents();
      queueDeferred();
      return;
    }
    if (bundledChanged) {
      reloadCommandsNow();
      return;
    }
    (sdkSyncPending ?? Promise.resolve()).then(queueDeferred).catch(logError);
  });
  let commands = getAppState().mcp.commands;
  let unsubscribeCommandsStore = subscribe(() => {
    let commands_2 = getAppState().mcp.commands;
    if (commands_2 === commands) return;
    let onlyRenamedCommands =
      commands_2.length === commands.length &&
      commands_2.every((command, existingCommand) => command.name === commands[existingCommand]?.name);
    commands = commands_2;
    if (onlyRenamedCommands) return;
    (sdkSyncPending ?? Promise.resolve()).then(queueDeferred).catch(logError);
  });
  let refreshCommandList = async () => {
    if (!settled) return;
    let json = lastCommandsJson ?? jsonStringify(toSlashCommands(otherCommands()));
    clearCommandMemoizationCaches();
    let nonInteractiveCommands = getNonInteractiveCommands(
      await getCommands(getOriginalCwd(), options.storageV5),
    );
    if (!settled) return;
    sdkServersList = nonInteractiveCommands;
    mcpSyncDone = true;
    notifyAgentsChanged();
    if (jsonStringify(toSlashCommands(otherCommands())) === json) return;
    queueDeferred();
  };
  let onPolicyVerdict = () => {
    (sdkSyncPending ?? Promise.resolve()).then(refreshCommandList).catch(logError);
  };
  let unsubscribePolicy = onPolicyVerdictChanged(onPolicyVerdict);
  let unsubscribePolicyRewire = onPolicyVerdictChanged(() => {
    queueMicrotask(watchBridgePolicy);
  });
  if (didPolicyLimitsColdStartTimeOut() && !isLovelyUmbrellaOn()) onPolicyVerdict();
  let unsubscribeInvalidate = render.onInvalidate((instances) => {
    if (!noteSurfaceChange()) return;
    enqueueTaskNotification({
      type: "system",
      subtype: "ui_invalidate",
      event: "ui.render",
      ...(needsPromptHooks() && {
        prompts_screened: true,
      }),
      ...(instances !== undefined && {
        instances: instances.map((instance) => ({
          surface: instance.surface,
          component: instance.component,
          instance_id: instance.requestId,
        })),
      }),
    });
  });
  let paneUiLogSink =
    options.outputFormat === "stream-json"
      ? setUiLogSink((sink) => {
          rewire({
            type: "system",
            subtype: "ui_log",
            plugin: sink.plugin,
            text: sink.text,
          });
        })
      : () => {};
  let renderInstance = 0;
  let onPlacedRow = (row) => {
    if (!noteSurfaceChange()) return;
    renderInstance++;
    enqueueTaskNotification({
      type: "system",
      subtype: "ui_panes",
      ...describePanesForClient(row),
    });
  };
  function attachRenderer(renderer) {
    if (renderInstance === renderer) onPlacedRow(describeOpenPanes(paneRegistry().getState()));
  }
  let renderHooks = {
    rosterMemory: surfaceDeclarationTracker,
    isRemoteTransport: () => structuredIO.isRemoteTransport(),
    givePluginUiTo: ensureClientConnected,
    paneRosterPushes: () => renderInstance,
    tellPaneRoster: attachRenderer,
    tellBackdrop: () => burstBackdropRedraw(backdropState, false),
    isPanelAttachOwed: () => panelAttachOwed,
    redactsPersistedLane: () => isTransportBacked(session),
  };
  function notifyPlacedRows() {
    let rows = listPlacedRows();
    if (rows.length > 0 && noteSurfaceChange())
      enqueueTaskNotification({
        type: "system",
        subtype: "ui_placed",
        rows: [...rows],
      });
  }
  let unsubscribePlaced = subscribePlaced(notifyPlacedRows);
  let backdropState = {
    hasEverStood: false,
  };
  let showBackdrop = subscribeBackdrop(() => burstBackdropRedraw(backdropState, true));
  let onOpenPanes = subscribeOpenPanes((panes) => {
    dropClosedPanes(panes);
    onPlacedRow(panes);
  });
  let resolved_6 = Promise.resolve();
  structuredIO.setSurfaceRoster({
    list: () => clientRegistry.list().map((client) => client.clientId),
    refuse: (clients) => {
      for (let client of clients) {
        surfaceDeclarationTracker.forget(client);
        raiseSessionDetach(client, "detach").catch((error) =>
          logForDebugging(`session.detach: failed: ${errorMessage(error)}`, {
            level: "error",
          }),
        );
      }
      logForDebugging(
        `the stream's policy would not have admitted ${clients.length} attached surface client(s): off the roster`,
      );
      try {
        pruneDetachedClients();
      } catch (error) {
        logForDebugging(`policy refused a surface client: review failed: ${errorMessage(error)}`, {
          level: "error",
        });
      }
    },
    setAside: () => {
      logForDebugging(
        "the statement of the session's writers reached its bound unrenewed: every surface client off the roster",
      );
      detachAllClients_2();
      try {
        pruneDetachedClients();
      } catch (error) {
        logForDebugging(`statement unrenewed: review failed: ${errorMessage(error)}`, {
          level: "error",
        });
      }
    },
  });
  let raiseAbsence = raiseViewerAbsence(
    (listener) => structuredIO.setSubscribersReportedListener(listener),
    () => clientRegistry.list().length > 0,
    () => {
      if (!isCalmOspreyGateOn() || isShuttingDown() || isTerminalShutdown()) return;
      let clientCount = clientRegistry.list().length;
      let detachAll = detachAllClients_2();
      let detaching = true;
      try {
        pruneDetachedClients();
      } catch (error) {
        detaching = false;
        logForDebugging(`viewer absence: review failed: ${errorMessage(error)}`, {
          level: "error",
        });
      }
      let done = detachAll.then((result) => {
        if (result > 0 && result === clientCount)
          logFeatureBad("plugin_function_hooks_viewer_absence", "detach_failed");
        else if (result > 0) logFeatureSad("plugin_function_hooks_viewer_absence", "detach_failed");
        else if (!detaching) logFeatureSad("plugin_function_hooks_viewer_absence", "review_failed");
        else logFeatureOk("plugin_function_hooks_viewer_absence");
      });
      resolved_6 = resolved_6.then(() => done);
    },
  );
  let unsubscribeRefreshLog = onVsCodeRefreshLogChange(
    () => canServeManifests(structuredIO.uiSurfaceChannel()),
    () => {
      if (isShuttingDown() || isTerminalShutdown()) return;
      panelModHold.noteSwitchedOff();
      let clients = clientRegistry.list();
      if (!settled || options.outputFormat !== "stream-json" || clients.length === 0) return;
      logForDebugging(
        `a flag refresh ended the serving of surfaces: ${clients.length} client(s) off the roster`,
      );
      for (let client of clients) surfaceDeclarationTracker.forget(client.clientId);
      let currentAppState = detachAllClients_2();
      resolved_6 = resolved_6.then(async () => {
        await currentAppState;
      });
      uiStatusSent = true;
      panelAttachOwed = true;
      enqueueTaskNotification({
        type: "system",
        subtype: "ui_invalidate",
        event: "ui.render",
      });
      pruneDetachedClients();
    },
  );
  let unsubscribeSurfaceScroll = paneSignals.scroll.subscribe((event) => {
    if (!noteSurfaceChange()) return;
    enqueueTaskNotification({
      type: "system",
      subtype: "ui_scroll",
      client_id: event.clientId,
      component: event.component,
      instance_id: event.requestId,
      offset: event.offset,
      ...(event.isFollowingEnd && {
        follow_end: true,
      }),
    });
  });
  let unsubscribeSurfaceFocus = paneSignals.focus.subscribe((event) => {
    if (!noteSurfaceChange()) return;
    enqueueTaskNotification({
      type: "system",
      subtype: "ui_focus",
      client_id: event.clientId,
      component: event.component,
      instance_id: event.requestId,
      plugin: event.plugin,
      key: event.element,
    });
  });
  interruptOnNowPriority({
    messageQueue,
    drain: runState,
  });
  let wakeRouter = new WakeRouter({
    messageQueue,
    drain: runState,
    enabled: isDetachedToolCallsEnabled,
    transcript: {
      getSnapshot: () => conversationRows,
    },
    session,
    taskRegistry: createTaskFramework(getAppState, setAppState),
    stopTask(taskId) {
      withFeatureTelemetry(
        "print_stop_ends_moved_shell",
        () =>
          stopTaskByUser(taskId, {
            taskRegistry: createTaskFramework(getAppState, setAppState),
            setAppState,
            session,
            getAppState,
            source: "client",
            storageV5: options.storageV5,
          }),
        () => "stop_failed",
      ).catch(logError);
    },
    clock: {
      setTimeout(fn, delayMs) {
        let timer = setTimeout(fn, delayMs);
        return () => clearTimeout(timer);
      },
    },
  });
  let followupPreempter = new RapidFollowupPreempter({
    messageQueue,
    drain: runState,
    enabled: isRapidFollowupPreemptEnabled,
    isSentNow: (requestId) => wakeRouter.isTaking(requestId),
    emit: enqueueTaskNotification,
  });
  let uninstallPreempt = followupPreempter.install();
  let followupBackgrounds = new FollowupBackgroundsSubagent({
    messageQueue,
    drain: runState,
    enabled: isFollowupBackgroundsSubagentEnabled,
    isSentNow: (requestId) => wakeRouter.isTaking(requestId),
    taskRegistry: createTaskFramework(getAppState, setAppState),
    hasListedForegroundToolCall: () => (foregroundCallRegistrySlots.peek(session)?.list().length ?? 0) > 0,
    isHumanDecisionPending: () =>
      hasWaitingFor(session) || structuredIO.sessionState.getState() === "requires_action",
  });
  let uninstallBackgrounds = followupBackgrounds.install();
  let costPusher = structuredIO.isRemoteTransport()
    ? publishQueuedWakeStatus({
        messageQueue,
        getTasks: () => getAppState().tasks,
        publish: (frame) =>
          structuredIO.sessionState.notifyInternalMetadataChanged({
            finished_background_tasks_pending_notification: frame,
          }),
      })
    : () => {};
  let canEndImmediately = () =>
    runState.dequeueCount === 0 && !any && !messages.some((row) => row.type === "assistant");
  let isLaunchModelPick = () => getSpareClaimState() !== "none" && canEndImmediately();
  let costStatePusher = new CostStatePusher(structuredIO);
  let waitForTurnEnd = () => {
    costStatePusher.pushIfChanged(extractPlacePusher.takeForTurnEnd());
  };
  let idleAtTurnEndAllowed = () => {
    if (parkedPermissions.inheritedPromptOwnsWorkerStatus()) return false;
    let refreshedState = getAppState();
    let values = Object.values(refreshedState.tasks ?? {});
    let any = values.some(isTeammateStillWorking);
    let any_2 = getRunningTasks(refreshedState).some(isAwaitedBackgroundTask);
    let owedTaskNotifications = collectOwedTaskNotifications({
      tasks: values,
      waits: notificationWaits,
      now: Date.now(),
    });
    let shutdownApproval = mayEndWithBackgroundWork({
      hasActiveTeammates: any,
      hasRunningBgTasks: any_2,
      hasPendingNotification: owedTaskNotifications,
    });
    if (shutdownApproval && reportsRunningBackgroundTasks() && values.some(isAmbientBackgroundTask))
      logForDiagnosticsNoPII("info", "cli_idle_gate_report_idle", () => ({
        task_count: values.length,
        tasks: summarizeTasksForTelemetry(values.slice(0, 64)),
        tasks_truncated: values.length > 64,
        has_active_teammates: any,
        has_running_bg_tasks: any_2,
        has_pending_notification: owedTaskNotifications,
      }));
    return shutdownApproval;
  };
  structuredIO.setMainLoopLiveness(() => {
    if (runState.running) return true;
    try {
      return !idleAtTurnEndAllowed();
    } catch (error) {
      logError(error);
      logFeatureBad("per_task_stop_sparing", "liveness_probe_throw");
      return false;
    }
  });
  let reportInheritedPromptDecided = () => {
    structuredIO.sessionState.notifyStateChanged(idleAtTurnEndAllowed() ? "idle" : "running");
  };
  let waitForUsageReset = async () => {
    let currentAppState = getAppState();
    if (hasWorkingInProcessTeammates(currentAppState))
      await waitForTeammatesToBecomeIdle(setAppState, currentAppState);
    let refreshedAppState = getAppState();
    return (
      hasNonLeadTeammate(refreshedAppState.teamContext) || hasActiveInProcessTeammates(refreshedAppState)
    );
  };
  let waitForTeamEnd = () => {
    if (teamTeardownGaveUp) return false;
    teamTeardownGaveUp = true;
    messageQueue.enqueue({
      mode: "prompt",
      agentId: mainAgentId(),
      value: TEAM_SHUTDOWN_REMINDER,
      uuid: randomUUID(),
    });
    kickQueue();
    return true;
  };
  let parkForTeamTeardown = async () => {
    if (isShuttingDown()) return "teardown-now";
    if (!(await waitForUsageReset())) return "teardown-now";
    if (!isShuttingDown() && waitForTeamEnd()) {
      if (!isShuttingDown()) {
        logForDebugging(
          "[print.ts] Input closed with active swarm, injected shutdown prompt \u2014 teardown handed to its lineage",
        );
        return "handed-off";
      }
      return "teardown-now";
    }
    let throttledLogger = makeThrottledLogger(keepAliveSender, env.CLAUDE_CODE_REMOTE);
    let deadline = Date.now() + teamTeardownParkTimeoutMs();
    while (!isShuttingDown()) {
      let remainingMs = deadline - Date.now();
      let exitReason;
      if (remainingMs <= 0) exitReason = "deadline";
      else
        try {
          exitReason = await withTimeout(waitForUsageReset(), remainingMs, "team teardown park deadline");
        } catch {
          exitReason = "deadline";
        }
      if (exitReason === false) return "teardown-now";
      if (exitReason === "deadline") {
        let state = getAppState();
        logForDebugging(
          `[print.ts] Team teardown park gave up after ${teamTeardownParkTimeoutMs()}ms (shutdown prompt injected: ${teamTeardownGaveUp}) with ${Object.keys(state.teamContext?.teammates ?? {}).length} roster teammate(s) and ${countWhere(Object.values(state.tasks), (task) => task.type === "in_process_teammate" && task.status === "running")} in-process teammate task(s) still active; tearing down anyway`,
        );
        logEvent("tengu_headless_team_teardown_park_timeout", {
          prompt_injected: teamTeardownGaveUp,
        });
        return "teardown-now";
      }
      throttledLogger();
      await sleep(500);
    }
    return "teardown-now";
  };
  async function settleSuggestions() {
    raiseAbsence.stop();
    abortController_2.abort(userAbortReason("shutdown"));
    let sideQuestionDrain =
      sideQuestionRequests.size > 0 && !sigintHandler()
        ? withTimeout(
            Promise.all(sideQuestionRequests.values()),
            1000,
            "side questions still unwinding at teardown",
          ).catch(() => {})
        : undefined;
    let suggestionsSettled = promptSuggestionEmitter.settle();
    if (suggestionsSettled) await suggestionsSettled;
    await withDeadline(bangRunner.ended(), 30000);
    runTeardownSteps("session_ended");
    if (pendingRateLimits.size > 0) {
      sessionEndDeadline =
        performance.now() + LOGIN_REVOKE_TIMEOUT_MS - LOGIN_RESTORE_TIMEOUT_MS - PRINT_TURN_POLL_MS;
      await withTimeout(
        Promise.allSettled(pendingRateLimits),
        LOGIN_REVOKE_TIMEOUT_MS,
        "reads still pending at teardown",
      ).catch(() => {});
    }
    await withTimeout(resolved_3, 300000, "get_context_usage still pending at teardown").catch(() => {});
    policyTeardownStarted = true;
    unsubscribePolicyRewire();
    await withTimeout(resolved_2, 30000, "remote_control operation still pending at teardown").catch(
      () => {},
    );
    await cancelPendingAsyncHooks();
    settled = false;
    unsubscribeSkillChange();
    unsubscribeSettings();
    unsubscribeCommandsStore();
    unsubscribePolicy();
    exitPath();
    bridgeTurnKeepAwake();
    teardownPath();
    await withTimeout(
      Promise.all([resolved_6, detachAllClients()]),
      30000,
      "session.detach hooks still running at teardown",
    ).catch(() => {});
    unsubscribeInvalidate();
    unsubscribeRefreshLog();
    onOpenPanes();
    unsubscribePlaced();
    showBackdrop();
    unsubscribeSurfaceScroll();
    unsubscribeSurfaceFocus();
    paneUiLogSink();
    authStatusSubscription?.();
    rateLimitFrameRelay();
    usageLimitHeartbeat();
    liveAppender?.dispose();
    release(agentRuntime);
    if (pendingReloadSlot.get() === pluginDirHooks) pendingReloadSlot.set(undefined);
    clearForkCacheSafeParams();
    releaseRequester();
    unsubscribeFastMode();
    unsubscribeFallbackModels();
    unsubscribeFocusMode();
    bridgeSdkController.dispose();
    isTornDown = true;
    nextTurnRedialer.uninstall();
    let allClients = [...getAppState().mcp.clients, ...clients_3, ...dynamicMcpState.clients];
    if (allClients.some((prev) => prev.type === "connected"))
      await getMcpClientModule().cleanupConnectedMcpClients(allClients);
    costPusher();
    await drainQueuedMessages(structuredIO, messageQueue);
    prewaitLatch.dispose();
    unsubscribeCommandsDiscarded();
    uninstallPreempt();
    wakeRouter.dispose();
    uninstallBackgrounds();
    currentAppState();
    await settlePendingPrLinks();
    if (
      shouldKillOnStreamClose({
        shuttingDown: isShuttingDown(),
        remoteTransport: structuredIO instanceof RemoteIO,
      })
    )
      killOrphanedShells(createTaskFramework(getAppState, setAppState));
    if (sideQuestionDrain) await sideQuestionDrain;
    sdkEventDrain.close();
    keepaliveAfterStop.disarm("session_ending");
    unsubscribeRequestPending();
    ownCardDeadline.dispose();
    if (!sigtermSeen) {
      output.done();
      sigintSeen = true;
    }
  }
  let userDecisionReporter = createUserDecisionReporter(session, structuredIO.sessionState);
  let turnModelTracker = new TurnModelOverrideTracker({
    modelOverride: getMainLoopModelOverride,
    activeModel: () => userSpecifiedModel,
    setActiveModel: (model) => {
      userSpecifiedModel = model;
    },
    recordAllowedModelApplied,
    noticeRestrictedModel,
  });
  let suggestionEmitter = new HeldResultsController({
    drain: runState,
    messageQueue,
    toolState,
    store,
    pendingNotificationWaits: notificationWaits,
    storageV5: options.storageV5,
    sessionMirror: options.sessionMirror === true,
    flushSessionStorage,
    emit: (frame) => output.enqueue(frame),
    heldResultTotals: () => ({
      totalCostUsd: getTotalCostUSD(),
      durationApiMs: getTotalAPIDuration(),
      modelUsage: getModelUsage(),
      usage: undefined,
      subagentStats: buildFileHistorySnapshotChain(session),
      safetyStops: getSafetyStops(),
    }),
    turnAbortedForShutdown: isShutdownInterrupt,
    shuttingDown: isShuttingDown,
    stopping: () => isShuttingDown() || isTerminalShutdown(),
    teardownRequested: isTeardownUnwindRequested,
    emitPendingSuggestion: () => promptSuggestionEmitter.emitPending(),
    handbackPointerResults: options.handbackPointerResults ?? new WeakSet(),
    lateReleasedResults: options.lateReleasedResults ?? new WeakSet(),
    autoModeStopNotices: options.autoModeStopNotices ?? new WeakMap(),
  });
  let workerDirReporter = new WorkerDirSyncReporter({
    workerDirSync: options.workerDirSync,
    enqueueSdkEvent: enqueueTaskNotification,
    turnEndUploadListener: options.turnEndUploadListener,
  });
  hasRequestBeenSent(session).then(() => setImmediate(releaseStartupWork, session.host, "turn_started"));
  let oneShotLimits = new OneShotRunLimits({
    drain: runState,
    frameIntake: userFrameIntake,
    declinedRedeliveries: redeliveryResolver,
    held: panelModHold,
    endsItsInput: !isSingleShotPrintSession(),
    isRemoteInput: () => structuredIO.isRemoteTransport(),
    maxTurns: options.maxTurns,
    maxBudgetUsd: options.maxBudgetUsd,
  });
  let turnRunner = new TurnDispatcher({
    messageQueue,
    drain: runState,
    prewaitLatch,
    turnOutcome: sdkResultReporter,
    io: structuredIO,
    emit: (frame) => {
      output.enqueue(frame);
      if (frame.type === "system" && frame.subtype === "init") {
        try {
          let currentAppState = otherCommands();
          let commandsJson = jsonStringify(frame.slash_commands);
          if (jsonStringify(mergeClients_2(currentAppState).map((client) => client.name)) !== commandsJson) {
            lastCommandsJson = commandsJson;
            deferredPending = true;
          } else if (lastCommandsJson === null)
            lastCommandsJson = jsonStringify(toSlashCommands(currentAppState));
        } catch (error) {
          logError(error);
        }
        refreshCommandsNow();
      }
    },
    stopping: () => isShuttingDown() || isTerminalShutdown(),
    messages: () => conversationRows,
    pendingMcpServerCount: () => countWhere(getAppState().mcp.clients, (client) => client.type === "pending"),
    engine: () => {
      liveAppender ??= QueryEngine(askCall(queryContext()));
      liveAppender.setModel(userSpecifiedModel);
      cache();
      return liveAppender;
    },
    drainSdkEvents: drainTaskEvents,
    deferredToolUse: () => deferredTool,
    takeErrorRowBehind: (uuid) => {
      let row = errorRowByUuid.get(uuid);
      errorRowByUuid.delete(uuid);
      return row;
    },
    inTurnScope: ({ command, members, input }, inTurnScopeOptions) => {
      hasForeignOrigin(members);
      let turnText =
        typeof input === "string"
          ? input
          : extractTextContent_2(
              input,
              `
`,
            );
      let buildFrame = (commandResult) =>
        runWithContextKey(messageTurnAttributionKey(command), () =>
          command.ccrTurnIdEndsWithTurn
            ? runWithTurnIdReport(command.ccrTurnId, commandResult, command.ccrProgramUseCaseId)
            : runWithTurnId(command.ccrTurnId, commandResult, command.ccrProgramUseCaseId),
        );
      let traceFields =
        command.traceContext || command.linkedTraceContexts?.length
          ? {
              parent: command.traceContext,
              linked: command.linkedTraceContexts ?? [],
            }
          : undefined;
      return buildFrame(() =>
        withWorkloadStorage(
          {
            workload: command.workload ?? options.workload,
            scheduledByPlugin: firstSchedulingPlugin([command]),
          },
          () => withInteractionSpan(turnText, traceFields, inTurnScopeOptions),
        ),
      );
    },
    onTurnStart: ({ command, members, input }) => {
      oneShotLimits.turnStarted(members);
      turnModelTracker.noteTurnStart();
      followupPreempter.noteTurnStart({
        command,
        members,
      });
      reportStartedNotifications(
        {
          getAppState,
          session,
        },
        members,
      );
      if (isSlashCommandPrompt(command, input, otherCommands))
        session.requestJournal.recordMainThreadTurnStart();
      activityManager.startCLIActivity("print-ask");
      userDecisionReporter(true);
      deferredQueued = true;
      followupBackgrounds.noteTurnStart();
      wakeRouter.noteTurnStart(members);
    },
    onFrame: (row, { command, refused }) => {
      if (command.handedOffTurn === undefined && !refused) deferredTool = undefined;
      followupPreempter.noteFrame(row);
      wakeRouter.noteFrame(row);
      followupBackgrounds.noteFrame(row);
      if (
        command.shouldQuery !== false &&
        (row.type === "result" || (row.type === "system" && row.subtype === "init"))
      )
        settleOwedTitle(hostSessionOps);
      if (row.type === "system" && row.subtype === "compact_boundary") forwardedCount = 0;
      forwardTranscriptToBridge();
    },
    teeFrame: forwardSubagentFrame,
    plainDeltasNeedOnlyEmit: env.CLAUDE_CODE_PLAIN_DELTA_FAST_PATH
      ? () => bridgeHandle === null && !hasQueuedTaskNotification(() => true)
      : undefined,
    writePlainDeltaNow:
      env.CLAUDE_CODE_PLAIN_DELTA_FAST_PATH &&
      env.CLAUDE_CODE_PLAIN_DELTA_DIRECT_WRITE &&
      options.outputFormat === "stream-json" &&
      options.verbose
        ? (delta) => output.readerIsWaiting && structuredIO.writePlainDeltaNow(delta)
        : undefined,
    onResult: (id, error) => {
      oneShotLimits.turnEnded(id);
      return suggestionEmitter.route(id, error);
    },
    afterTurnFinally: () => {
      if (
        messageQueue.peek(isDrainableMainThreadCommand) === undefined &&
        !userFrameIntake.hasParked() &&
        !structuredIO.hasUnconsumedInput
      )
        setImmediate(releaseStartupWork, session.host, "turn_started");
      followupPreempter.noteTurnEnd();
      wakeRouter.noteTurnEnd();
      followupBackgrounds.noteTurnEnd();
      recordedAgentRun.noteTurnEnd(recapResultKnown);
      userDecisionReporter(false);
      refreshCommandsNow();
      mergePendingSeeds();
      turnModelTracker.adoptAtTurnEnd();
      let refreshedAppState = getMainLoopModel();
      reportBridgeModel(refreshedAppState);
      reportEffortForModel(refreshedAppState, getAppState());
      structuredIO.sessionState.notifyUltracodeActive(
        isUltracodeActive(getAppState().ultracode, refreshedAppState),
      );
      if (!isShuttingDown()) structuredIO.sessionState.markResumableOrphanedAgentsToldAtTurnEnd();
      buildBridgeInitializeCommands(contextUsageInputs, reportUsage);
      mirrorTokenUsageToBridge();
      noteEffortChange("turn_end", {
        force: true,
      });
      endInteractionSpan();
      activityManager.endCLIActivity("print-ask");
    },
  });
  let drainSettle = new TurnGate({
    drain: runState,
    messageQueue,
    deliveryLedger,
    declinedRedeliveries: redeliveryResolver,
    io: structuredIO,
    emit: (frame) => output.enqueue(frame),
    drainSdkEvents: drainTaskEvents,
    flushTranscript: () => structuredIO.flushInternalEvents(),
    flushAcks: () => structuredIO.flushDeliveryAcks(),
    stopping: isShuttingDown,
    idleRelease,
    kick: () => void kickQueue(),
    endSessionHead: isTeamShutdownReminder,
    reportContextUsage: reportAtTurnEnd,
    decideIdleReport: () => parkedPermissions.decideIdleReport(),
    pushCost: waitForTurnEnd,
    startRecap: () => {
      maybeStartCcrRecap(session.ccrRecap, structuredIO.sessionState);
    },
    startStopRetirementDue: () => parkedPermissions.startStopRetirementDue(),
    rearmNudge: () => {
      rearmNotificationNudge({
        getAppState,
        setAppState,
        session,
      });
      if (lazySessionInboxPointers)
        lazySessionInboxPointers.sessionInboxPointers.peek(session)?.renotifyUnfetched(messageQueue);
    },
  });
  let teamLeadPoller = new TeamLeadPoller({
    drain: runState,
    messageQueue,
    store,
    storageV5: options.storageV5,
    kick: () => void kickQueue(),
    enqueueTeamShutdownPrompt: waitForTeamEnd,
  });
  let sparedWindowReporter = new SparedWindowReporter({
    drain: runState,
    io: structuredIO,
    stopping: () => isShuttingDown() || isTerminalShutdown(),
  });
  let reportSparedWindow = () => sparedWindowReporter.report();
  let userMessageUuid;
  let turnStartTime;
  let turnLoop;
  if (options.workerDirSync !== undefined)
    options.turnGate?.register(dirSyncPullParticipant(options.workerDirSync, session, undefined));
  let turnAbort = new HeadlessTurnLoop({
    drain: runState,
    messageQueue,
    prewaitLatch,
    deliveryLedger,
    turnRunner,
    drainSettle,
    turnOutcome: sdkResultReporter,
    io: structuredIO,
    emit: (frame) => output.enqueue(frame),
    drainSdkEvents: drainTaskEvents,
    stopping: isShuttingDown,
    terminalShutdown: isTerminalShutdown,
    endSessionHead: isTeamShutdownReminder,
    commandLacksUserIntent: isPassiveCommand,
    repeatsUsageLimitAlert: (alert) =>
      isUsageLimitDenialStale(alert, conversationRows, () => activeModel() ?? getMainLoopModel()),
    revokeCodeliveredFollowups: forgetCodeliveredFollowups,
    deferredToolUsePending: () => deferredTool !== undefined,
    idleRelease,
    turnGate: options.turnGate,
    session,
    sessionMirror: options.sessionMirror,
    host: {
      onEntry: () => {
        setAwaitsFirstRun(false);
        sparedWindowReporter.runEntered();
        if (!parkedPermissions.inheritedPromptOwnsWorkerStatus()) reportSparedWindow();
        resetRecapState(session.ccrRecap);
      },
      beforeDrain: () => turnStartChecks.beforeDrain(),
      openRun: () => {
        let throttledLogger = makeThrottledLogger(keepAliveSender, env.CLAUDE_CODE_REMOTE);
        let pulseInboxFrameActivity = makeThrottledLogger(keepAliveSender, true);
        let bgTaskWaiter = new BackgroundTaskWaiter({
          drain: runState,
          messageQueue,
          io: structuredIO,
          store,
          toolState,
          currentTools: refreshBridgeToolList,
          detachedToolCalls: detachedCallSlots.of(session),
          pendingNotificationWaits: notificationWaits,
          ccrRecap: session.ccrRecap,
          maxBudgetUsd: options.maxBudgetUsd,
          storageV5: options.storageV5,
          turnAbortedForShutdown: isShutdownInterrupt,
          stopping: isShuttingDown,
          sessionSignal: abortController.signal,
          spendRecorded: session.costLedger.spendRecorded,
          pulseKeepAlive: throttledLogger,
          hasPendingSessionWakeup: ({ now, parkedSince }) =>
            canEndTurn() &&
            (loopWakeupsInFlight > 0 ||
              hasPendingLoopWakeup(getSessionCronTasks(), {
                now,
                parkedSince,
              })),
          pendingSessionWakeupIds: () =>
            getSessionCronTasks()
              .filter((task) => task.kind === "loop")
              .map((task) => task.id),
          hasLiveSessionWakeup: (now) =>
            canReleaseHeldResult() &&
            (!runState.inputClosed || isTidySlothGateOn()) &&
            (loopWakeupsInFlight > 0 ||
              hasPendingLoopWakeup(getSessionCronTasks(), {
                now,
                parkedSince: 0,
              })),
          waitNoticeOnStderr: shouldShowBackgroundWaitStatus({
            outputFormat: options.outputFormat,
            stderrIsTerminal: process.stderr.isTTY === true,
            stdoutIsTerminal: process.stdout.isTTY === true,
          }),
          startStopRetirementDue: () => parkedPermissions.startStopRetirementDue(),
          onIdleReported: () => {
            if (lazySessionInboxPointers)
              lazySessionInboxPointers.sessionInboxPointers.peek(session)?.renotifyUnfetched(messageQueue);
          },
        });
        turnLoop = bgTaskWaiter;
        return {
          afterPass: ({ drained }) => {
            waitForTurnEnd();
            mirrorTokenUsageToBridge();
            if (drained) reportAtTurnEnd();
            return bgTaskWaiter.park({
              drainedThisIteration: drained,
            });
          },
          afterRelease: function* () {
            try {
              return yield* teamLeadPoller.poll({
                pulseKeepAlive: () => !sendSessionActivitySignal_2() && throttledLogger(),
                pulseInboxFrameActivity,
              });
            } catch (error) {
              logError(toError(error));
              return "done";
            }
          },
        };
      },
      loopTop: () => {
        recheckPluginCopies();
        return turnStartChecks.loopTop();
      },
      setAsideHeldInput: () => panelModHold.setAside(),
      holdsEvalSettles: () => turnLoop?.holdsEvalSettles() ?? false,
      onLoopTopWork: () => {
        resetRecapState(session.ccrRecap);
        let state = structuredIO.sessionState.getState();
        if (
          state === "idle" &&
          !isTerminalShutdown() &&
          (runState.runningReported || !parkedPermissions.registrationKeepsPendingAction)
        )
          structuredIO.sessionState.notifyStateChanged("running");
        else if (state === "running" && runState.runPhase !== undefined && !isTerminalShutdown())
          structuredIO.sessionState.wipeTurnScopedMetadata();
      },
      onRescueGaveWay: () => parkedPermissions.rescueGaveWay(),
      onHead: () => {
        if (runState.intentBatchInFlight) options.homeSeed?.record.markFirstCommandDequeued();
        autocompactReporter?.();
        resetPdfPagesThisTurn(session);
      },
      replayMerged: (notifications, replayOptions) => {
        if (!options.replayUserMessages) return;
        for (let notification of notifications)
          if (notification.uuid && notification.uuid !== replayOptions.uuid) {
            let origin = normalizeTaskNotificationOrigin(notification.origin);
            output.enqueue({
              type: "user",
              message: {
                role: "user",
                content: notification.value,
              },
              session_id: getSessionId(),
              parent_tool_use_id: null,
              uuid: notification.uuid,
              isReplay: true,
              ...(notification.isMeta && {
                isSynthetic: true,
              }),
              ...(notification.fileAttachments?.length && {
                file_attachments: notification.fileAttachments,
              }),
              ...(origin && {
                origin,
              }),
            });
          }
      },
      firstCommand: () => turnStartChecks.firstCommand(),
      accountPluginsJoin: ({ command }) =>
        turnStartChecks.accountPluginsJoin(() => {
          try {
            return isImmediateCommandCandidate(command, () => otherCommands());
          } catch (error) {
            logError(error);
            return true;
          }
        }),
      turnMountJoin: () => {
        if (bridgeSession) {
          let joins = bridgeSession.takeFirstTurnJoins();
          if (!joins.replyMount && !joins.grants) return null;
          let projectsMountModule = require("../bridge/projectsReplyEvaluation.js");
          let PROJECTS_MOUNT_FIRST_COMMAND_WAIT_MS = projectsMountModule.PROJECTS_MOUNT_FIRST_COMMAND_WAIT_MS;
          return Promise.all([
            joins.replyMount
              ? projectsMountModule.joinProjectsMountBeforeFirstCommand(
                  joins.replyMount,
                  getAppState,
                  PROJECTS_MOUNT_FIRST_COMMAND_WAIT_MS,
                )
              : Promise.resolve(),
            joins.grants
              ? withDeadline(joins.grants, PROJECTS_MOUNT_FIRST_COMMAND_WAIT_MS).then(() => {
                  return;
                })
              : Promise.resolve(),
          ]).then(() => {
            return;
          });
        }
        return null;
      },
      hooksModulesSwitchJoin: () =>
        createPluginHookRefresh({
          enqueue: (frame) => output.enqueue(frame),
          storageV5: options.storageV5,
          credentials: options.credentials,
          ended: runState.whenEnding(),
        }),
      organizationsLoadGate: (gate) =>
        refreshPluginHooksOnClaim(
          {
            enqueue: (frame) => output.enqueue(frame),
            storageV5: options.storageV5,
            credentials: options.credentials,
            ended: runState.whenEnding(),
          },
          gate,
        ),
      sdkMcpServersJoin: ({ command }) =>
        ternalState.join(command) ?? turnStartChecks.sdkToolRelistJoin(command),
      deferredMcpServersJoin: ({ command }) => {
        let isPrompt = isSlashCommandPrompt(
          command,
          command.mode === "poll-event" ? "" : command.value,
          otherCommands,
        );
        return mcpPrewait.join(isPrompt);
      },
      inheritedPromptAnswerJoin: () => {
        try {
          return parkedPermissions.answerOnItsWay();
        } catch (error) {
          logError(error);
          return;
        }
      },
      wireTurn: () => turnStartChecks.wireTurn(),
      onCommitted: ({ command, members }) => {
        recapResultKnown = false;
        let attributionKey = turnAttributionKeyOf(members);
        userMessageUuid = attributionKey;
        pendingReplyStamp =
          attributionKey === undefined
            ? undefined
            : {
                userMessageUuid: attributionKey,
                anchor: conversationRows.at(-1),
              };
        if (runState.intentBatchInFlight) options.homeSeed?.record.markFirstCommandDequeued();
        intentBatchInFlight = members.some(isQueuedUserTurnCommand);
        try {
          if (
            runState.intentBatchInFlight &&
            command.mode === "prompt" &&
            !command.isMeta &&
            isSlashCommandPrompt(command, command.value, otherCommands)
          )
            nextTurnRedialer.turnStarted();
        } catch (error) {
          logError(error);
        }
        if (parkedPermissions.onCommitted(command)) reportSparedWindow();
      },
      ...(unattendedStart !== undefined && {
        refuseStart: async (request, options) => {
          let result = await unattendedStart.refuseStart(request, options);
          recapResultKnown = result !== undefined;
          if (
            result === undefined &&
            isNonRestPromptBatch(request) &&
            isSlashCommandPrompt(request.command, request.command.value, otherCommands)
          )
            recordedAgentRun.start(request.command.ccrTurnId);
          if (result !== undefined) {
            markRecapStartedForTurnEnd(session.ccrRecap);
            recapStarted = true;
          } else if (recapStarted) {
            recapStarted = false;
            clearRecapStartedForTurnEnd(session.ccrRecap);
          }
          return result;
        },
      }),
      beforeArm: ({ batch: { command, members }, input }) => {
        reportQueuedSubmissions(members, "turn_end");
        markMessagesRead(members);
        if (structuredIO instanceof RemoteIO && command.mode === "prompt" && command.uuid !== undefined)
          logEvent("tengu_bridge_message_received", {
            is_repl: false,
          });
        promptSuggestionEmitter.onCommand(command, input);
      },
      afterArm: ({ signal, aheadOfStart }) => {
        if (!signal.aborted) {
          stopBudgetPoll();
          keepaliveAfterStop.disarm("live_turn");
        }
        turnStartTime = workerDirReporter.beforeTurn();
        let hooks = aheadOfStart ? undefined : sessionHooks_2;
        let retirement = parkedPermissions.retirement;
        if (retirement === undefined || hooks === undefined) return retirement ?? hooks;
        return Promise.all([retirement, hooks]).then(() => {
          return;
        });
      },
      afterTurn: ({ batch, signal, turnEnd }) => {
        forwardTranscriptToBridge();
        bridgeHandle?.serverVouch?.holds();
        pendingReplyStamp = undefined;
        bridgeHandle?.sendResult(
          resolveTurnTerminalReason({
            userMessageUuid,
            outcome: turnEnd.result,
            aborted: classifyTurnAbort(runState, signal, turnEnd),
          }),
        );
        workerDirReporter.afterTurn({
          turnStartTime,
          signal,
          userEventUuids: batch.uuids,
        });
        if (!recapResultKnown) promptSuggestionEmitter.afterResult(batch.command);
        routePeer.route();
        settleTurnReads(
          {
            getAppState,
            setAppState,
            session,
          },
          {
            signal,
            turnEnd,
          },
        );
      },
      releaseHeld: () => suggestionEmitter.release(),
      onCrash: (error) => {
        reportTurnLoopCrash(error);
        promptSuggestionEmitter.abort();
        gracefulShutdownSync(1);
      },
      onInputClosed: async () => {
        heldBackResult?.stop();
        heldBackResult = null;
        if ((await parkForTeamTeardown()) === "handed-off");
        else await settleSuggestions();
      },
    },
  });
  let onCrashPayload = (payload) => {
    let error;
    try {
      error = toError(payload);
    } catch {
      error = Error("non-Error value thrown");
    }
    if (sigintSeen || sigtermSeen || output.ended || isTerminalShutdown()) {
      logError(error);
      return;
    }
    runState.endSessionRequested = true;
    sigtermSeen = true;
    output.error(error);
  };
  let kickQueue = () => turnAbort.run().catch(onCrashPayload);
  let runTeardownSteps = (reason, detail) => {
    for (let message of messageQueue.removeByFilter(
      (message) =>
        message.clientBashCommand === true &&
        (detail === undefined || (message.uuid !== undefined && detail.names([message.uuid]))),
      {
        reason,
      },
    ))
      emitBangCommandNotRun(
        {
          emit: (status) => output.enqueue(status),
          sessionId: getSessionId(),
        },
        typeof message.value === "string" ? message.value : "",
        reason === "session_ended" ? "session_ended" : "stopped",
      );
  };
  flushBufferedSdk = () => runTeardownSteps("session_ended");
  let cloudShellCached;
  let growthBookJoin;
  let isCloudShell = () =>
    (cloudShellCached ??= getFeatureValue_SESSION_PINNED("tengu_cloud_session_shell", false) === true);
  let conversation =
    structuredIO instanceof RemoteIO
      ? {
          joins: () => {
            if (growthBookJoin !== undefined) return growthBookJoin;
            if (cloudShellCached !== undefined || hasFreshGrowthBookFeatures()) return isCloudShell();
            return (growthBookJoin = withDeadline(
              initializeGrowthBook().catch(() => null),
              PRINT_TURN_FLUSH_DELAY_MS,
            ).then(isCloudShell));
          },
          enqueue: (value, queuedValue, options) => {
            messageQueue.enqueue({
              mode: "bash",
              clientBashCommand: true,
              ...(options !== undefined && {
                clientBashCommandCwd: options,
              }),
              value,
              uuid: queuedValue,
              turnAttributionKey: queuedValue,
              agentId: mainAgentId(),
            });
            kickQueue();
          },
        }
      : undefined;
  let routePeer = new ResultWakeRouter({
    drain: runState,
    messageQueue,
    getTasks: () => getAppState().tasks,
    canUseTool,
    maxBudgetUsd: options.maxBudgetUsd,
  });
  let teardownPath = routePeer.startStrandedResume(createTaskFramework(getAppState, setAppState));
  let bridgeTurnKeepAwake = createBridgeTurnKeepAwake(structuredIO.sessionState);
  let exitPath = watchTaskChanges({
    store,
    drain: runState,
    io: structuredIO,
    ccrRecap: session.ccrRecap,
    stopping: () => isShuttingDown() || isTerminalShutdown(),
    idleAllowedAtTurnEnd: () => parkedPermissions.retirement === undefined && idleAtTurnEndAllowed(),
  });
  installWakeRouterKick({
    messageQueue,
    drain: runState,
    routeWakes: () => routePeer.route(),
    kick: () => void kickQueue(),
  });
  startHostReturnWakes({
    toolState,
    messageQueue,
    drain: runState,
    permissionMode: () => getAppState().toolPermissionContext.mode,
  });
  if (deferredToolUse) {
    logForDebugging(
      `[print.ts] Auto-resuming deferred tool: ${deferredToolUse.toolName} (${deferredToolUse.toolUseID})`,
    );
    messageQueue.enqueue({
      mode: "prompt",
      agentId: mainAgentId(),
      value: resumePromptOverride(),
      uuid: randomUUID(),
      isMeta: true,
    });
    kickQueue();
  }
  {
    let { setOnEnqueue } = require("../utils/udsMessaging.js");
    setOnEnqueue(() => {
      if (!runState.inputClosed) {
        cancelPendingUserDialogs(structuredIO, "uds_message");
        kickQueue();
      }
    });
  }
  let waitingStatusReporter = createWaitingStatusReporter(options.storageV5);
  structuredIO.sessionState.stateChanged.subscribe(waitingStatusReporter);
  waitingStatusReporter(structuredIO.sessionState.getState());
  {
    let {
      setOnPeerIdleNotice,
      setOnIdleSubscribed,
      setHostStatusSubscription,
      setIdleLastTurnTextProvider,
      notePeerIdleStatus,
      enqueueIdleNoticesForModel,
    } = require("../utils/peerIdleSubscriptions.js");
    setOnPeerIdleNotice((notice) => {
      logForDebugging(
        `[headless] cross-session idle notice: kind=${notice.kind} label=${fragmentForLog(notice.label)}`,
      );
      if (!notice.modelVisible) return;
      enqueueIdleNoticesForModel([notice]);
      if (!runState.inputClosed) {
        cancelPendingUserDialogs(structuredIO, "uds_message");
        kickQueue();
      }
    });
    setIdleLastTurnTextProvider(() => getLastAssistantTextForResult(conversationRows));
    {
      let {
        registerReplyYieldHolder,
        notifyModelOfReplyYield,
      } = require("../services/artifacts/replyYieldHolder.js");
      registerReplyYieldHolder({
        yielded: (value) => {
          logForDebugging(
            `[headless] yielded Artifact comment replies for ${value.length} Artifact(s) to another session of this conversation`,
          );
          notifyModelOfReplyYield("yielded", value.length);
        },
        reverted: (value) => {
          logForDebugging(
            `[headless] ${value.length} yielded Artifact reply hand-off(s) came back to this session`,
          );
          notifyModelOfReplyYield("reverted", value.length);
        },
        stoppedElsewhere: (value) => {
          logForDebugging(
            `[headless] ${value.length} yielded Artifact reply hand-off(s) came back stopped by the other session`,
          );
          notifyModelOfReplyYield("stopped_elsewhere", value.length);
        },
      });
    }
    setOnIdleSubscribed(
      (left, right) => {
        logForDebugging(
          `[headless] cross-session idle subscription recorded from ${fragmentForLog(left)}${right ? "" : " (unverifiable sender)"}`,
        );
      },
      (state) => {
        if (state > 0)
          logForDebugging(
            `[headless] ${state} more cross-session idle subscription(s) were recorded before this handler mounted`,
          );
      },
    );
    setHostStatusSubscription(
      structuredIO.sessionState.stateChanged.subscribe((event) => {
        notePeerIdleStatus(event === "idle", event === "running");
      }),
    );
    let state = structuredIO.sessionState.getState();
    notePeerIdleStatus(state === "idle", state === "running");
  }
  if (lazyCronTools.isKairosCronEnabled() && !configProbeEnv()) {
    let wake = (value, wakeupSource, third, wakeupScheduledFor) => {
      messageQueue.enqueue({
        mode: "prompt",
        agentId: mainAgentId(),
        value,
        uuid: randomUUID(),
        priority: "later",
        isMeta: true,
        skipSlashCommands: true,
        modelScheduledOrigin: true,
        skipAttachments: true,
        wakeupSource,
        wakeupScheduledFor,
        ...(third !== undefined && {
          scheduledByPlugin: third,
        }),
        workload: WORKLOAD_CRON,
        ...(shouldStampThreadState({
          isPeer: false,
        }) && {
          stampThreadState: true,
        }),
      });
      cancelPendingUserDialogs(structuredIO, "cron_fire");
      kickQueue();
    };
    let resolved = Promise.resolve();
    let runWake = (task, wakeupSource, third, fourth, fifth, wakeupScheduledFor) => {
      if (runState.inputClosed && !(third && canEndTurn())) return;
      let storageV5 = options.storageV5;
      if (storageV5) {
        if (third) loopWakeupsInFlight++;
        resolved = resolved.then(async () => {
          try {
            let loopDefaultFireAsync = await lazyAutonomousLoop.resolveLoopDefaultFireAsync(
              session.autonomousLoopPreamble,
              task,
              storageV5,
            );
            if (runState.inputClosed && !(third && canEndTurn())) return;
            wake(loopDefaultFireAsync, wakeupSource, fourth, wakeupScheduledFor);
            fifth?.();
          } catch (error) {
            logForDebugging(`[ScheduledTasks] loop.md v5 expansion failed; fire skipped: ${error}`);
          } finally {
            if (third) loopWakeupsInFlight--;
          }
        });
        return;
      }
      let loopDefaultFire = lazyAutonomousLoop.resolveLoopDefaultFire(session.autonomousLoopPreamble, task);
      wake(loopDefaultFire, wakeupSource, fourth, wakeupScheduledFor);
      fifth?.();
    };
    heldBackResult = lazyCronScheduler.createCronScheduler({
      onFire: (task) => runWake(task, "schedule_wakeup", false),
      onMissed: wrapScheduledTaskBatchRunner((batch, second, third) =>
        runWake(
          lazyCronScheduler.buildMissedTaskNotification(batch),
          "schedule_wakeup",
          false,
          second,
          third,
        ),
      ),
      onFireTask: wrapScheduledTaskRunner((task, second) =>
        runWake(
          task.prompt,
          wakeupSourceForKind(task),
          task.kind === "loop",
          task.plugin,
          second,
          task.scheduledFor,
        ),
      ),
      isLoading: () =>
        runState.inputClosed
          ? !(runState.running && runState.runPhase === "waiting_for_agents" && canEndTurn())
          : isBusyOrClosed({
              running: runState.running,
              runPhase: runState.runPhase,
              inputClosed: runState.inputClosed,
            }),
      filter: (prompt) => !runState.inputClosed || prompt.kind === "loop",
      leaseFileTasks: () => !runState.inputClosed,
      getJitterConfig: lazyCronJitterConfig.getCronJitterConfig,
      isKilled: () => !lazyCronTools.isKairosCronEnabled(),
    });
    heldBackResult.start();
  }
  let requestFlags = new Map();
  let flagSettingsClaims = new FlagSettingsClaimTracker();
  let sendControlResponseSuccess = function (message, response) {
    if (message.request.subtype === "apply_flag_settings") flagSettingsClaims.answered(message.request_id);
    output.enqueue(controlSuccessResponse(message.request_id, response));
  };
  let sendControlResponseError = function (message, errorMessage) {
    if (!(structuredIO instanceof RemoteIO)) {
      sendControlResponseSuccess(message, errorMessage);
      return;
    }
    output.enqueue(markLiveOnlyResponse(message.request_id, errorMessage));
  };
  let controlError = function (request, context) {
    if (isTransportBacked(session))
      logForDebugging(`${request}: ${context}`, {
        level: "error",
      });
  };
  let sendControlError = function (request, message, code, extra) {
    if (request.request.subtype === "apply_flag_settings")
      flagSettingsClaims.answered(request.request_id, message);
    output.enqueue(controlErrorResponse(request.request_id, message, code, extra));
  };
  let sendControlErrorWithMeta = function (request, message, error, meta = {}, detail) {
    sendControlError(
      request,
      controlHandlerError(SDKControlReloadPluginsRequestSchema(controlContext, message), message, error, meta)
        .error,
      detail,
    );
  };
  let sendSimpleControlError = function (request, message) {
    if (message.subtype === "success") sendControlResponseSuccess(request, message.response);
    else sendControlError(request, message.error);
  };
  let handledOrphanedToolUseIds = new Map();
  let controlDeps = {
    canUseTool,
    toolUseContext: (message) =>
      ask(askCall(queryContext()), {
        abortController: message,
        userSpecifiedModel,
      }),
    sessionAbortController: abortController,
    cancellableControlRequests: handledOrphanedToolUseIds,
  };
  let deviceHooksWorker;
  let cloudSessionReads;
  let turnHandoffHandler;
  if (options.remoteToolsAdmission?.admitted === true)
    toolState
      .get(ReannounceRequester)
      .provide((request, options) => structuredIO.askToAnnounce(request, options));
  let ingressTail = {
    current: Promise.resolve(),
  };
  let activeOAuthFlows = new Set();
  let sharedControlContext = {
    session,
    sessionHooks,
    engineState: getAppState,
    messageQueue,
    ingressTail,
    stopped: new AbortController().signal,
    storageV5: options.storageV5,
    credentials: options.credentials,
    flushSessionStorage,
    redactsPersistedLane: () => isTransportBacked(session),
  };
  let ingressTail_2 = {
    current: Promise.resolve(),
  };
  let workflowLaunchState;
  let ensureWorkflowLaunch = () =>
    (workflowLaunchState ??= (async () => {
      let { createWorkflowLaunchState, readWorkflowLaunchRecord, WORKFLOW_LAUNCH_DIGEST_ENV } =
        await import("../services/workflows/workflowLaunchResume.js");
      let { fetchFilestoreBytes } = await import("../utils/stageFile.js");
      let restoredWorkerState = await structuredIO.restoredWorkerState;
      return {
        host: session.host,
        state: createWorkflowLaunchState(
          readWorkflowLaunchRecord(restoredWorkerState?.internal?.workflow_launch),
        ),
        isRemoteTransport: () => structuredIO.isRemoteTransport(),
        postEvent: (frame) => output.enqueue(frame),
        prependUserMessage: (message) => structuredIO.prependUserMessage(message),
        ackProcessed: (uuid) => structuredIO.onCommandLifecycle?.(uuid, "completed"),
        getSessionId,
        fetchBundle: (id) => fetchFilestoreBytes(id),
        persistRecord: (workflowLaunch) =>
          structuredIO.sessionState.notifyInternalMetadataChanged({
            workflow_launch: workflowLaunch,
          }),
        flushRecord: () => structuredIO.flushSessionState(),
        getWorkerEpoch: () => env.CLAUDE_CODE_WORKER_EPOCH,
        getDispatchedDigest: () => getPreSettingsEnvSnapshot()[WORKFLOW_LAUNCH_DIGEST_ENV],
        isAccountLaunchedReview: () => isEnvTruthy(getPreSettingsEnvSnapshot().BUGHUNTER_RESULT_RELAY),
      };
    })());
  let repoRootErrorTone = function () {
    let interval = setInterval(
      (error) => {
        try {
          error.enqueue({
            type: "keep_alive",
          });
        } catch {}
      },
      30000,
      output,
    );
    return () => clearInterval(interval);
  };
  let handleAddDirectory = function (request, options) {
    logEvent("tengu_sdk_control_request_progress", {
      status: fromEnum(options.status),
    });
    output.enqueue({
      type: "system",
      subtype: "control_request_progress",
      request_id: request.request_id,
      ...options,
      uuid: randomUUID(),
      session_id: getSessionId(),
    });
  };
  async function handleRepoRoot(request, request_2) {
    let flags = {
      reload_claude_md: Boolean(request_2.reload_claude_md),
      reload_skills: Boolean(request_2.reload_skills),
      reload_plugins: Boolean(request_2.reload_plugins),
    };
    try {
      let resolvedDirectory = await registerRepoRoot(
        request_2.directory,
        () => getAppState().toolPermissionContext,
      );
      if (getAppState().toolPermissionContext.additionalWorkingDirectories.has(resolvedDirectory))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `register_repo_root: ${sanitizeTelemetryString(request_2.directory)} is already a registered working directory`,
          "register_repo_root: directory is already a registered working directory",
          "already_registered",
        );
      setAppState((state) => ({
        ...state,
        toolPermissionContext: applyValidatedPermissionUpdate(state.toolPermissionContext, {
          type: "addDirectories",
          directories: [resolvedDirectory],
          destination: "session",
        }),
      }));
      pinResolvedWorkingDirPath(resolvedDirectory);
      let additionalDirectoriesForClaudeMd = getAdditionalDirectoriesForClaudeMd();
      if (!additionalDirectoriesForClaudeMd.includes(resolvedDirectory))
        setAdditionalDirectoriesForClaudeMd([...additionalDirectoriesForClaudeMd, resolvedDirectory]);
      SandboxManager.refreshConfig();
      let tone = repoRootErrorTone();
      executeDirectoryAddedHooks(session, resolvedDirectory, "register_repo_root", {
        storageV5: options.storageV5,
        credentials: options.credentials,
      })
        .then(({ results, systemMessages }) => {
          for (let systemMessage of systemMessages) logForDebugging(`DirectoryAdded hook: ${systemMessage}`);
          for (let result of results)
            if (!result.succeeded && result.output)
              logForDebugging(`DirectoryAdded hook failed: ${result.output}`, {
                level: "error",
              });
        })
        .catch((error) => {
          logForDebugging(`DirectoryAdded hook exec failed: ${error}`, {
            level: "error",
          });
        })
        .finally(tone);
      if (request_2.reload_claude_md) {
        clearMemoryFilesCache(session);
        let claudeMdPath = join(resolvedDirectory, "CLAUDE.md");
        if (!pendingMemoryDirs.includes(claudeMdPath)) pendingMemoryDirs.push(claudeMdPath);
        if (isAdditionalDirWithoutNestedMemory(resolvedDirectory))
          invalidateUserContext(session, "directory_added");
      }
      if (request_2.reload_skills) await reloadSkillsAfterDirectoryChange();
      if (request_2.reload_plugins) {
        await Promise.race([
          Promise.allSettled([
            installPluginsForHeadlessSerialized(undefined, options.storageV5, options.credentials),
          ]),
          sleep(pluginInstallTimeoutMs()),
        ]);
        await refreshActivePlugins(pluginsStateStore, options.storageV5, options.credentials);
        startupReleased = true;
        let knownNames = new Set(Object.keys(dynamicMcpState.configs));
        let nextNames = new Set(
          getAppState()
            .mcp.clients.filter((client) => !knownNames.has(client.name))
            .map((client) => client.name),
        );
        await Promise.allSettled([applyPluginServers(nextNames, "reload_plugins")]);
      }
      let stagingOptions = {
        directory: isTransportBacked(session) ? request_2.directory : resolvedDirectory,
      };
      sendControlResponseSuccess(request, stagingOptions);
      logFeatureOk("sdk_register_repo_root", flags);
    } catch (error) {
      let errorClass = registerRepoRootErrorClass(error);
      let tone = errorClass === undefined ? undefined : REGISTER_REPO_ROOT_ERROR_TONES[errorClass];
      sendControlErrorWithMeta(request, "register_repo_root", error, {
        expected: tone === "sad" || tone === "bad",
      });
      if (errorClass !== undefined && tone === "sad")
        logFeatureSad("sdk_register_repo_root", errorClass, flags);
      else logFeatureBad("sdk_register_repo_root", errorClass ?? "error", flags);
    }
  }
  async function handleStageFile(request, request_2) {
    try {
      let { stageFile, addDirectoryDestFromMountPath } = await import("../utils/stageFile.js");
      let stagedPath;
      try {
        stagedPath = addDirectoryDestFromMountPath(request_2.mount_path);
      } catch (error) {
        controlError("add_directory dest", errorMessage(error));
        sendControlError(request, pickForTransport(session, errorMessage(error), "add_directory failed"));
        return;
      }
      if (!isEnvTruthy(env.CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD)) {
        sendControlError(
          request,
          "add_directory requires CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD to be set in the container environment",
        );
        return;
      }
      let staged = await stageFile({
        mount_path: request_2.mount_path,
        force: true,
      });
      if (!staged.ok) {
        controlError("add_directory stage", staged.error);
        sendControlError(request, pickForTransport(session, staged.error, "add_directory failed"));
        return;
      }
      let stagedDir = dirname(stagedPath);
      let additionalDirectoriesForClaudeMd = getAdditionalDirectoriesForClaudeMd();
      if (!additionalDirectoriesForClaudeMd.includes(stagedDir))
        setAdditionalDirectoriesForClaudeMd([...additionalDirectoriesForClaudeMd, stagedDir]);
      clearMemoryFilesCache(session);
      invalidateUserContext(session, "directory_added");
      await reloadSkillsAfterDirectoryChange();
      if (isTransportBacked(session)) {
        controlError("add_directory staged", `${stagedPath} (${stagedDir})`);
        sendControlResponseSuccess(request, {});
      } else
        sendControlResponseSuccess(request, {
          staged_path: stagedPath,
          directory: stagedDir,
        });
    } catch (error) {
      sendControlErrorWithMeta(request, "add_directory", error);
    }
  }
  parkedPermissions.seedHandledToolUseIds();
  let recoveredToolUseIds = new Set([...(supersededToolUseIds ?? []), ...(options.answeredToolUseIds ?? [])]);
  let handleControlRequest = (options = {}) => {
    promptSuggestionEmitter.discard();
    toolState.get(HostReturnWakeTracker).stopped();
    if (options.keepDetachedToolCalls !== true) detachedCallSlots.of(session).stopRunning();
    if (options.retireParkedPermission !== false)
      parkedPermissions.fire(options.parkedPermissionReason ?? "interrupt");
    recordedAgentRun.stop();
  };
  structuredIO.setUnexpectedResponseCallback((response) => parkedPermissions.onUnexpectedResponse(response));
  let oauthCallbackSubmitters = new Set();
  let oauthManualCallbackUsed = new Map();
  let oauthAuthPromises = new Map();
  let claudeOAuth = null;
  let buildCacheSafeParams = () =>
    buildSideQuestionFallbackParams({
      session,
      messageQueue,
      tools: buildBridgeToolsUpdate(getAppState()),
      toolCatalog: TOOL_CATALOG,
      commands: otherCommands(),
      mcpClients: [...getAppState().mcp.clients, ...clients_3, ...dynamicMcpState.clients],
      messages: conversationRows,
      turnInProgress: runState.running,
      readFileState,
      toolState,
      sessionHooks,
      getAppState,
      setAppState,
      customSystemPrompt: switchToPromptTools(),
      appendSystemPrompt: options.appendSystemPrompt,
      excludeDynamicSections: options.excludeDynamicSections,
      thinkingConfig: hasEffort.current(),
      agents: getActiveAgentsFromList(agents),
      runQuery: query,
      storageV5: options.storageV5,
      credentials: options.credentials,
    });
  (async () => {
    if (sdkSyncPending) await sdkSyncPending;
    parkedPermissions.arm();
    let heldInputReader = new HeldInputReader({
      source: structuredIO.structuredInput,
      isRequestOut: () => structuredIO.hasPendingRequests(),
      onRequestOut: (onRequest) => structuredIO.onRequestPending(onRequest),
    });
    let startupPhase = false;
    let startupPhaseDone = () =>
      runState.running ||
      messageQueue.peek(isDrainableMainThreadCommand) !== undefined ||
      userFrameIntake.hasParked() ||
      structuredIO.hasUnconsumedInput ||
      heldInputReader.hasSetAside();
    yieldStartupWorkToTurn(session.host, startupPhaseDone);
    let handlePrompt = (isRetry = false) => {
      if (!startupPhase && !isRetry && !startupPhaseDone()) releaseStartupWorkOnce();
      startupPhase = true;
      deferred_2.resolve();
    };
    latchWriteAttempt(
      initialWrite,
      messages.some((message) => message.type === "user" || message.type === "assistant") ||
        isTerminalTitleEnabled(),
    );
    let startTime_2 = performance.now();
    recordPhase("input_ready_ms", startTime_2, 0);
    recordInputReadyFromSpawn();
    let inputLatency = new InputLatencyLedger(startTime_2);
    let unknownResponseHold = new BesideLoopRequestQueue({
      drain: runState,
      onEscapedFailure: onCrashPayload,
    });
    structuredIO.setUnknownResponseHold(() => unknownResponseHold.whenIdle());
    if (pluginsSyncPromise && !agentsSettled && loadAllPluginsCacheOnly_2()) {
      let syncPromise = pluginsSyncPromise;
      idleRefreshRan = true;
      lastSyncedPromise = syncPromise;
      agentsSettled = waitForPluginSyncBudget({
        pluginsSync: syncPromise,
        remainingSyncBudgetMs: () => pluginInstallTimeoutMs() - (performance.now() - startTime),
        onSyncOutlivedBudget: () => {
          idleRefreshSyncTimedOut = true;
        },
        serverNamesOwnedBeforePluginsSync: loadPluginServerConfigs,
        refreshPluginState: async () => {
          let needsRefresh = pluginRefreshState?.needsRefresh === true;
          await startRuntime();
          if (needsRefresh && pluginRefreshState) pluginRefreshState.needsRefresh = false;
        },
      }).then((result) => {
        settingsSettled = result ?? null;
      });
    }
    let jitPolicy = setJitPolicyAfterStartup();
    logForDiagnosticsNoPII("info", "cli_message_loop_started", () => {
      let jitPolicyMode = collectTrialEnvKeys();
      return {
        ...(jitPolicy !== 1 && {
          jit_policy: jitPolicy,
        }),
        cc_version: {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
        handoff_trial_keys: jitPolicyMode,
        handoff_trial_key_count: jitPolicyMode.length,
        compiled_ahead_of_time: false,
        ...bytecodeOrderStats(),
      };
    });
    scheduleResumeCacheWarm({
      messages: conversationRows,
      interruptedTurnRescueArmed: parkedPermissions.enqueuedInterruptedTurnRescueArmed(),
      buildCacheSafeParams,
      systemPromptSnapshot: () => options.systemPromptSnapshot,
      awaitSdkMcpSettled: () => (options.sdkUrl ? serializedRedialAll("skip") : serializedRedialAll()),
      isSessionInitialized: () => startupPhase,
      isSessionEnded: () => runState.endSessionRequested || runState.inputClosed,
      maxBudgetUsd: options.maxBudgetUsd,
    });
    headlessProfilerCheckpoint("stdin_listen_started");
    expectStartupHandshake(session.host);
    if (
      env.CLAUDE_CODE_RESUME_INTERRUPTED_TURN &&
      structuredIO.isRemoteTransport() &&
      (await structuredIO.restoredWorkerState)?.internal?.workflow_launch != null
    ) {
      pendingWorkflowLaunches++;
      (async () => {
        let { resumeWorkflowLaunch } = await import("../services/workflows/workflowLaunchResume.js");
        await resumeWorkflowLaunch(await ensureWorkflowLaunch());
      })()
        .catch((error) => {
          logForDebugging(`[print.ts] workflow_launch resume failed: ${toError(error).message}`);
        })
        .finally(() => {
          pendingWorkflowLaunches--;
          if (!runState.running) timeoutMs.start();
        });
    }
    let isParkedHolding = (request) => ({
      storedAt: sessionStreamCreatedAt(request),
      serviceNow: structuredIO.sessionServiceNow(),
      newestFrameAt: structuredIO.newestSessionStreamCreatedAt(),
      machineNow: Date.now(),
    });
    let parkedHolding = () => parkedPermissions.holdingParkedPermission() && !runState.running;
    let hasActiveTeammates = () =>
      reportsRunningBackgroundTasksExplicit() && hasActiveInProcessTeammates(getAppState());
    let runningOtherTasks = () =>
      (runState.running && runState.runPhase !== "waiting_for_agents") || otherWorkRunning();
    let hasOtherWork = () =>
      (runState.running &&
        runState.runPhase !== "waiting_for_agents" &&
        (runState.dequeueCount > 0 ||
          parkedPermissions.retirement !== undefined ||
          userFrameIntake.hasParked())) ||
      otherWorkRunning();
    let otherWorkRunning = () =>
      hasActiveTeammates() ||
      (structuredIO.sessionState.getState() === "requires_action" && !parkedHolding()) ||
      parkedPermissions.stopRetirementOwed;
    let hasRunningWork = () =>
      messageQueue.getDrainableMainThreadQueueLength() > 0
        ? "commands_queued"
        : !runState.running && structuredIO.sessionState.getState() === "requires_action"
          ? "prompt_pending"
          : "turn_running";
    let handleInterrupt = (request, request_2) => {
      if (isImmediateInterruptRequest(request_2)) {
        let cancelled = handleRemoteCancel({
          messageQueue,
          drain: runState,
          prewaitLatch,
          frameIntake: userFrameIntake,
          io: structuredIO,
          pressed: request_2.message_uuid,
          deliver: () => wakeRouter.pressWaiting(),
          letHeldGo: (requestId) => runSafely(() => parkedPermissions.letPressedMessagesGo(requestId)),
        });
        if (cancelled.send_now === "stopped")
          logQueuedInterruptDecision({
            queued: messageQueue.getCommandQueueSnapshot(),
            drain: runState,
            sessionState: structuredIO.sessionState,
            lateBind: false,
            cancelQueued: false,
            sendNow: true,
          });
        sendControlResponseSuccess(request, cancelled);
        logFeatureOk("headless_interrupt_send_now", {
          outcome: fromEnum(cancelled.send_now),
        });
        return;
      }
      let cancelQueuedTarget = parseCancelQueuedTarget(request_2);
      let lateBind = isLateBindInterruptRequestId(request.request_id);
      let ownedByWorker = !isInterruptOwnedInline(request.request_id, request_2);
      if (ownedByWorker) {
        setAppState(withClearedCardAllows);
        bangRunner.interrupt(cancelQueuedTarget);
        runTeardownSteps(
          "cleared_on_cancel",
          request_2.cancel_queued === true ? undefined : cancelQueuedTarget,
        );
      }
      if (
        isCancelAimedAtParkedBatch({
          drain: runState,
          prewaitLatch,
          aim: cancelQueuedTarget,
        })
      ) {
        let { receipt } = cancelQueuedMessages({
          cancelQueued: false,
          turn: "spared",
          messageQueue,
          drain: runState,
          prewaitLatch,
          frameIntake: userFrameIntake,
          waitingCopies: redeliveryResolver,
          io: structuredIO,
        });
        runSafelyOrEmpty(() =>
          parkedPermissions.noteAStopsReceipt(receipt, {
            aim: cancelQueuedTarget,
            lateBind,
          }),
        );
        sendControlResponseSuccess(request, receipt);
        return;
      }
      let interruptResult = interruptCurrentTurn({
        drain: runState,
        prewaitLatch,
        aim: cancelQueuedTarget,
        cancelQueued: request_2.cancel_queued === true,
        lateBind,
      });
      requeueTakenMessage({
        cancelQueued: request_2.cancel_queued === true,
        messageQueue,
        io: structuredIO,
      });
      if (ownedByWorker) {
        wakeRouter.notePersonsStop();
        recordedAgentRun.notePersonsStop();
      }
      let spareContext = spareTasksForStop();
      let reactSubscriptions = killAutoReactSubscriptions(spareContext.taskRegistry, {
        durable: false,
      });
      let drainedNotifications = drainQueuedTaskNotifications(messageQueue, {
        leaveArtifactRooms: true,
      });
      handleControlRequest();
      logQueuedInterruptDecision({
        queued: messageQueue.getCommandQueueSnapshot(),
        drain: runState,
        sessionState: structuredIO.sessionState,
        lateBind: isLateBindInterruptRequestId(request.request_id),
        cancelQueued: request_2.cancel_queued === true,
        sendNow: false,
      });
      let { receipt, clearSurvivors } = watchNudgeCancel(
        {
          getAppState,
          setAppState,
          session,
        },
        () =>
          cancelQueuedMessages({
            cancelQueued: request_2.cancel_queued === true,
            turn: cancelQueuedTarget && (interruptResult ? "stopped" : "idle"),
            messageQueue,
            drain: runState,
            prewaitLatch,
            frameIntake: userFrameIntake,
            waitingCopies: redeliveryResolver,
            io: structuredIO,
          }),
      );
      let runSafelyWrapped = runSafelyOrEmpty(() =>
        parkedPermissions.noteAStopsReceipt(receipt, {
          aim: cancelQueuedTarget,
          lateBind,
        }),
      );
      retractPendingTitleIfCancelled(initialWrite, [...(receipt.cancelled ?? []), ...runSafelyWrapped]);
      sendControlResponseSuccess(
        request,
        runSafelyWrapped.length === 0
          ? receipt
          : {
              ...receipt,
              cancelled: [...(receipt.cancelled ?? []), ...runSafelyWrapped],
            },
      );
      if (reactSubscriptions > 0 || drainedNotifications.length > 0)
        artifactWatchStopNotice(reactSubscriptions, drainedNotifications);
      requeueStopNotifications(messageQueue, clearSurvivors, reactSubscriptions);
    };
    let turnContext = {
      admission: options.turnHandoffAdmission ?? {
        admitted: false,
        reason: "not_managed_cloud_worker",
      },
      tools: refreshBridgeToolList,
      toolAliases: () => options.toolAliases,
      mcpClients: rows,
      messages: () => conversationRows,
      handledToolUseIds: parkedPermissions.handledToolUseIds,
      recoveredToolUseIds,
      messageQueue,
      drain: runState,
      kick: () => void kickQueue(),
      redactsPersistedLane: () => isTransportBacked(session),
      appliedRewind: () => appliedRewind,
      linesWaitingAhead: () => runningOtherTasks() || messageQueue.getCommandQueue().some(isPassiveQueueItem),
      carriedWritesMode:
        options.turnHandoffAdmission?.admitted && isClaudeAiChatOrigin()
          ? () =>
              isCarriedWritesEnabled() || hasSaidCarriedWrites()
                ? getAppState().toolPermissionContext.mode
                : undefined
          : undefined,
      personStopped: () => toolState.get(HostReturnWakeTracker).stopped(),
      handedOffTurnStopped: ({ messages }) => {
        let aim = cancelTargetForUuid(messages[0]?.uuid);
        if (
          !isCancelAimedAtParkedBatch({
            drain: runState,
            prewaitLatch,
            aim,
          })
        )
          recordedAgentRun.notePersonsStop();
      },
      personWrote: () => session.userPresence.notePersonWrote(),
      stopUnabortedWork: () => {
        handleControlRequest();
      },
    };
    if (isParkedSpare()) {
      profileCheckpoint("spare_parked");
      headlessProfilerCheckpoint("spare_parked");
      addStartupContext({
        spare: 1,
      });
    }
    let limitTurnConcurrency = limitConcurrency(PRINT_TURN_MAX_ATTEMPTS, async (request) => {
      let { listDirectoryForRemote } = await import("../services/remoteTools/remoteDirectoryList.js");
      let projectRoot = getProjectRoot();
      let cwdChanged = () => getOriginalCwd() !== projectRoot;
      if (cwdChanged()) throw repoRootError("workspace_moved");
      return listDirectoryForRemote(
        request,
        projectRoot,
        () => getAppState().toolPermissionContext,
        cwdChanged,
      );
    });
    let stranded = {
      probes: 0,
    };
    syncReadSkills();
    let runTurn = async (request, turnRequest) => {
      let { readFileForRemote } = await import("../services/remoteTools/remoteFileRead.js");
      return readFileForRemote(request.path, request.max_bytes, () => getAppState().toolPermissionContext, {
        encoding: request.encoding,
        anchor: request.anchor,
        telemetrySource: "headless_stream",
        syncedSkillsFolder: () =>
          sessionWriterSpelling(
            session,
            getAppState().toolPermissionContext,
            structuredIO.sessionWriters(),
            true,
          ),
        asWrittenSources: turnRequest && {
          heldFiles: () => readFileState.everHeldPaths(),
          search: {
            isOn: isAsWrittenSearchEnabled,
            limitMs: LOGIN_SETTLE_TIMEOUT_MS,
          },
          timeLimitMs: LOGIN_RESTORE_TIMEOUT_MS,
          stranded,
          whyNotServed: () => readFileAsWrittenUnservedReason(session),
          whyNotBegin: () => {
            let startTime = performance.now();
            return startTime >= sessionEndDeadline
              ? "session_ending"
              : startTime - turnRequest.askedAt >= MCP_CALL_RESULT_LIMITS
                ? "waited_too_long"
                : undefined;
          },
          onRefusal: turnRequest.onRefusal,
        },
      });
    };
    let submitTurn = limitConcurrency(1, runTurn);
    let submitTask = limitConcurrency(1, runTurn);
    if (hostSessionsBearerOffered())
      setHostSessionsBearerSource({
        ask: () => structuredIO.requestHostSessionsBearer(),
        isSignInToken: isClaudeAISignInToken,
        hasSignIn: isClaudeAIOAuthTokenHostInjected,
      });
    for await (let message of heldInputReader) {
      let controlRequest = unknownResponseHold.waitBefore(message);
      if (controlRequest !== undefined) {
        let startTime = performance.now();
        await controlRequest;
        inputLatency.note("control", startTime, performance.now());
      }
      recordEarlierToolsUnknown(message);
      if (startupPhase && !startupWorkReleased && message.type !== "user" && !startupPhaseDone())
        releaseStartupWorkOnce();
      if (isTerminalShutdown() && message.type !== "control_response") continue;
      let displayOnlyHistoric =
        isDisplayOnlyHistoricalMessage(message) &&
        (message.type === "user" ? forkSupported : remoteControlForkChild?.isFork() === true);
      let uuid = "uuid" in message ? message.uuid : undefined;
      if (uuid && isUnhandledIngressType(message)) structuredIO.onCommandLifecycle?.(uuid, "completed");
      if (message.type === "control_request") {
        if (message.request.subtype === "apply_flag_settings")
          flagSettingsClaims.received(message.request_id);
        let isUiSurface = isUiSurfaceName(message.request.subtype);
        let rejectUiControl = shouldRejectUiControl(
          message.request.subtype,
          () => structuredIO.uiSurfaceFrameOf(message, clientRegistry.list().length > 0),
          () => structuredIO.surfaceRequestJudgedAt(message),
        );
        if (
          isUiSurface &&
          !rejectUiControl &&
          isCalmOspreyGateOn() &&
          !leavesBelowFloor(() => structuredIO.uiSurfaceFrameOf(message, clientRegistry.list().length > 0))
        )
          raiseAbsence.heard();
        if (isUiSurface && !rejectUiControl) {
          surfaceDeclarationTracker.readmit(message);
          noteSurfaceClientHeard(message.request);
        }
        let detached = false;
        let startTime = performance.now();
        runState.turnStartClock.controlRequestStarted(startTime);
        let deadlineMs;
        let timedOut = false;
        let readSwitchAtReconnect;
        let markControlCompleted = () => {
          if (uuid) structuredIO.onCommandLifecycle?.(uuid, "completed");
        };
        let handleControlRequestAsync = (request) => {
          detached = true;
          if (uuid && message.request.subtype !== "stage_file")
            structuredIO.onCommandLifecycle?.(uuid, "started");
          Promise.resolve()
            .then(request)
            .finally(() => {
              if (uuid) structuredIO.onCommandLifecycle?.(uuid, "completed");
            })
            .catch((error) => logError(error));
        };
        let runControl = (request) => {
          detached = true;
          if (uuid) structuredIO.onCommandLifecycle?.(uuid, "completed");
          Promise.resolve()
            .then(request)
            .catch((error) => logError(error));
        };
        try {
          if (isUnclaimedSpare() && !isAllowedBeforeClaim(message.request.subtype)) {
            sendControlError(
              message,
              getSpareClaimState() === "failed" ? SPARE_CLAIM_FAILED_TEXT : SPARE_NOT_CLAIMED_TEXT,
            );
            continue;
          }
          if (isKnownControlRequestSubtype(message.request)) {
            let request = message.request;
            let isMcpStatusLive = request.subtype === "mcp_status" && request.liveReply === true;
            let dispatchWithChecks = (request) =>
              isMcpStatusLive && request.subtype === "success"
                ? sendControlResponseError(message, request.response)
                : sendSimpleControlError(message, request);
            if (handleSendTaskMessage_2(request, controlContext)) {
              let dispatchAfterChecks = async () =>
                dispatchWithChecks(await dispatchControlRequest(request, controlContext));
              handleControlRequestAsync(() => {
                if (request.subtype !== "get_context_usage") return dispatchAfterChecks();
                if (request.detail === "summary") return rateLimitListener(dispatchAfterChecks());
                resolved_3 = rateLimitInfo(dispatchAfterChecks);
                return resolved_3;
              });
            } else {
              let replied = false;
              let replyOnce = (reply) => {
                if (replied) return;
                replied = true;
                dispatchWithChecks(reply);
              };
              let runDetachedControl = () =>
                dispatchControlRequest(request, {
                  ...controlContext,
                  replyNow: replyOnce,
                });
              if (request.subtype === "mcp_reconnect" && unknownResponseHold.takesNext())
                detached = unknownResponseHold.run(() => {
                  let reply = runDetachedControl();
                  return reply instanceof Promise ? reply.then(replyOnce) : replyOnce(reply);
                }, markControlCompleted);
              else {
                if (request.subtype === "mcp_reconnect")
                  readSwitchAtReconnect = BesideLoopRequestQueue.readSwitch();
                let maybePromise = runDetachedControl();
                replyOnce(maybePromise instanceof Promise ? await maybePromise : maybePromise);
              }
            }
          } else if (message.request.subtype === "interrupt") handleInterrupt(message, message.request);
          else if (message.request.subtype === "end_session") {
            if (isArchivedAfterRestartNow(message.request.reason)) {
              logForDebugging(
                "[print.ts] stale 'archived' end_session ignored on epoch>1 \u2014 from prior lifecycle",
              );
              sendControlResponseSuccess(message);
              continue;
            }
            logForDebugging(
              `[print.ts] end_session received, reason=${message.request.reason ?? "unspecified"}`,
            );
            runState.endSessionRequested = true;
            runTeardownSteps("session_ended");
            requestTeardownUnwind();
            messageQueue.suspendMidTurnFold();
            if (runState.abortController) runState.abortController.abort(userAbortReason("shutdown"));
            stopBudgetPoll();
            abortController.abort();
            abortController_2.abort(userAbortReason("shutdown"));
            promptSuggestionEmitter.discard();
            sendControlResponseSuccess(message);
            break;
          } else if (message.request.subtype === "initialize") {
            endStartupMarkReporting();
            let sdkMcpServers = message.request.sdkMcpServers;
            let configNotHonoured = false;
            let webSearchIsolationExemptMcpServers = message.request.webSearchIsolationExemptMcpServers;
            if (
              (sdkMcpServers != null &&
                (!Array.isArray(sdkMcpServers) ||
                  sdkMcpServers.some((sdkMcpServer) => typeof sdkMcpServer !== "string"))) ||
              (webSearchIsolationExemptMcpServers != null &&
                (!Array.isArray(webSearchIsolationExemptMcpServers) ||
                  webSearchIsolationExemptMcpServers.some(
                    (webSearchIsolationExemptMcpServer) =>
                      typeof webSearchIsolationExemptMcpServer !== "string",
                  )))
            ) {
              sendControlError(
                message,
                "initialize: sdkMcpServers and webSearchIsolationExemptMcpServers must be arrays of strings",
              );
              continue;
            }
            let found = message.request.sdkMcpServers?.find(isPrototypeKey);
            if (found !== undefined) {
              sendControlError(message, "initialize: " + reservedServerNameMessage(found));
              continue;
            }
            let sdkMcpServerConfigs_2 = message.request.sdkMcpServerConfigs;
            let sdkConfigs = isPlainObject_2(sdkMcpServerConfigs_2) ? sdkMcpServerConfigs_2 : undefined;
            if (sdkMcpServerConfigs_2 != null && sdkConfigs === undefined)
              logForDebugging(
                "initialize: ignoring sdkMcpServerConfigs (not an object keyed by server name)",
                {
                  level: "warn",
                },
              );
            let hooks = message.request.hooks;
            if (
              hooks != null &&
              (typeof hooks !== "object" ||
                Array.isArray(hooks) ||
                Object.values(hooks).some(
                  (manifest) =>
                    !Array.isArray(manifest) ||
                    manifest.some(
                      (config) =>
                        config === null ||
                        typeof config !== "object" ||
                        !("hookCallbackIds" in config) ||
                        !Array.isArray(config.hookCallbackIds) ||
                        config.hookCallbackIds.some((hookCallbackId) => typeof hookCallbackId !== "string") ||
                        ("matcher" in config && config.matcher != null && typeof config.matcher !== "string"),
                    ),
                ))
            ) {
              sendControlError(
                message,
                "initialize: hooks must map hook events to arrays of matchers carrying hookCallbackIds arrays and string matchers",
              );
              continue;
            }
            let skills = message.request.skills;
            if (
              skills !== undefined &&
              (!Array.isArray(skills) || skills.some((skill) => typeof skill !== "string"))
            ) {
              sendControlError(message, "initialize: skills must be an array of strings");
              continue;
            }
            let requestedTitle =
              typeof message.request.title === "string"
                ? sanitizeSessionTitle(message.request.title)
                : undefined;
            if (requestedTitle) {
              initialWrite.attempted = true;
              cacheSessionTitle(requestedTitle);
              adoptSuppliedSessionTitle(requestedTitle, options.storageV5).catch(logError);
            }
            let sdkServerConfigs;
            if (message.request.sdkMcpServers && message.request.sdkMcpServers.length > 0) {
              let merged = Object.create(null);
              for (let sdkMcpServer of message.request.sdkMcpServers) {
                let hostConfig = getOwn(sdkMcpServerConfigs, sdkMcpServer);
                let sdkConfig = sdkConfigs ? getOwn(sdkConfigs, sdkMcpServer) : undefined;
                let { settings, ignored } = parseMcpServerSettings(sdkConfig);
                for (let ignoredField of ignored) {
                  let toolsList = ignoredField === "tools" ? inspectToolsList(sdkConfig) : undefined;
                  logForDebugging(
                    toolsList
                      ? `initialize: SDK MCP server '${sdkMcpServer}': ${describeToolsListIssues(toolsList)}`
                      : `initialize: ignoring invalid ${ignoredField} for SDK MCP server '${sdkMcpServer}'; the default applies`,
                  );
                }
                merged[sdkMcpServer] = {
                  type: "sdk",
                  name: sdkMcpServer,
                  ...(settings.tools && {
                    tools: settings.tools,
                  }),
                };
                if (hostConfig) {
                  if (
                    hostConfig.timeout !== settings.timeout ||
                    (hostConfig.disableAutoBackground === true) !==
                      (settings.disableAutoBackground === true) ||
                    hostConfig.connectorId !== settings.connectorId
                  )
                    logForDebugging(
                      `initialize: SDK MCP server '${sdkMcpServer}' is already registered, so a different timeout, disableAutoBackground or connectorId in this request is ignored (remove and re-add the server to change them)${settings.tools === undefined ? "" : "; its tools[] is applied"}`,
                    );
                  if (settings.tools !== undefined)
                    sdkMcpServerConfigs[sdkMcpServer] = {
                      ...hostConfig,
                      tools: settings.tools,
                    };
                  continue;
                }
                sdkMcpServerConfigs[sdkMcpServer] = {
                  type: "sdk",
                  name: sdkMcpServer,
                  ...settings,
                };
              }
              let policies = collectServerToolPolicies(merged);
              setAppState((state) => {
                let rules = mergeMcpServerPolicyRules(state.toolPermissionContext, policies, "merge");
                return rules === state.toolPermissionContext
                  ? state
                  : {
                      ...state,
                      toolPermissionContext: rules,
                    };
              });
              let sdkMcpServerManifests = message.request.sdkMcpServerManifests;
              let manifestResult =
                structuredIO instanceof RemoteIO &&
                sdkMcpServerManifests !== undefined &&
                sdkMcpServerManifests !== null &&
                isSdkMcpManifestsEnabled()
                  ? await manifestsDisabledReason({
                      origin: message.request.sdkMcpServerManifestsOrigin,
                      frameCreatedAt: sessionStreamCreatedAt(message),
                      sessionWriters: sessionStreamWriters(message),
                    })
                  : undefined;
              let manifestsEnabled = isSdkMcpManifestsEnabled() && manifestResult === undefined;
              let hostManifests = parseHostManifests(sdkMcpServerManifests, message.request.sdkMcpServers);
              let hostNames = new Set(
                clients_3.filter((prev) => prev.type === "connected").map((row) => row.name),
              );
              let manifestSummary =
                sdkMcpServerManifests === undefined || sdkMcpServerManifests === null
                  ? undefined
                  : Object.create(null);
              if (manifestSummary !== undefined && manifestResult !== undefined) {
                logForDebugging(
                  `initialize: sdkMcpServerManifests not honoured on this remote-session worker (${manifestResult}); SDK MCP servers will handshake over the control channel`,
                );
                logFeatureSad("mcp_sdk_manifest", `mcp_sdk_manifest_remote_${manifestResult}`);
              }
              if (hostManifests.malformedField) {
                if (manifestSummary !== undefined)
                  for (let serverName of message.request.sdkMcpServers)
                    manifestSummary[serverName] = "malformed";
                if (manifestsEnabled) {
                  logForDebugging(
                    "initialize: sdkMcpServerManifests is not an object keyed by server name \u2014 ignoring it; SDK MCP servers will handshake over the control channel",
                    {
                      level: "warn",
                    },
                  );
                  logFeatureSad("mcp_sdk_manifest", "mcp_sdk_manifest_malformed_field");
                }
              }
              for (let malformedServerName of hostManifests.malformedServerNames) {
                if (manifestSummary !== undefined) manifestSummary[malformedServerName] = "malformed";
                if (manifestsEnabled) {
                  logForDebugging(
                    `initialize: sdkMcpServerManifests entry for '${malformedServerName}' is malformed \u2014 ignoring it; the server will handshake over the control channel`,
                    {
                      level: "warn",
                    },
                  );
                  logFeatureSad("mcp_sdk_manifest", "mcp_sdk_manifest_malformed_entry");
                }
              }
              let anyNotHonoured = false;
              for (let [name, manifest] of hostManifests.manifests) {
                if (!manifestsEnabled) {
                  if (manifestSummary !== undefined) manifestSummary[name] = "not_honoured";
                  continue;
                }
                if (hostNames.has(name)) {
                  if (manifestSummary !== undefined) manifestSummary[name] = "already_connected";
                  continue;
                }
                if (manifest.initializeResult.protocolVersion !== MCP_PROTOCOL_LATEST) {
                  logForDebugging(
                    `initialize: sdkMcpServerManifests entry for '${name}' was not captured with MCP protocol ${MCP_PROTOCOL_LATEST} \u2014 ignoring it; the server will handshake over the control channel`,
                  );
                  logFeatureSad("mcp_sdk_manifest", "mcp_sdk_manifest_protocol_version_at_initialize");
                  if (manifestSummary !== undefined) manifestSummary[name] = "protocol_version_mismatch";
                  continue;
                }
                sdkServerManifests.set(name, manifest);
                if (manifestSummary !== undefined) manifestSummary[name] = "parked";
                anyNotHonoured = true;
              }
              sdkServerConfigs = manifestSummary;
              configNotHonoured = anyNotHonoured;
              if (!configNotHonoured) serializedRedialAll();
            }
            if (message.request.webSearchIsolationExemptMcpServers)
              addExemptServers(isolationLatch, message.request.webSearchIsolationExemptMcpServers);
            let initializeResult;
            try {
              initializeResult = await handleInitializeRequest(
                message.request,
                message.request_id,
                startupPhase,
                output,
                () => otherCommands(),
                modelRows,
                structuredIO,
                !!options.enableAuthStatus,
                options,
                () => agents,
                getAppState,
                setAppState,
                () => userSpecifiedModel,
                sdkServerConfigs,
                () =>
                  waitBeforeInitializeReply({
                    rescan: () => refreshCommandsThrottled.inFlight() ?? refreshPromise,
                    isReaderOwed: () =>
                      isShuttingDown() || isTerminalShutdown() || structuredIO.hasPendingRequests(),
                    lookAgainOn: [
                      (prev) => structuredIO.onRequestPending(prev),
                      (listener) => messageQueue.subscribe(listener),
                      (unsubscribe) => registerCleanup(async () => unsubscribe()),
                    ],
                  }),
                isTransportBacked(session),
                Object.keys(sdkMcpServerConfigs),
                refreshBridgeToolList,
              );
              lastCommandsJson = jsonStringify(initializeResult.publishedCommands);
              if (jsonStringify(toSlashCommands(otherCommands())) !== lastCommandsJson) queueDeferred();
            } finally {
              if (configNotHonoured) {
                configNotHonoured = false;
                serializedRedialAll();
              }
            }
            if (initializeResult.restrictedAgentModel)
              noticeRestrictedModel(initializeResult.restrictedAgentModel);
            if (initializeResult.mergedStdinAgents?.length) {
              let knownAgents = new Set(agents);
              agents = [
                ...agents,
                ...initializeResult.mergedStdinAgents.filter(
                  (mergedStdinAgent) => !knownAgents.has(mergedStdinAgent),
                ),
              ];
            }
            if (options.promptSuggestions && isPromptSuggestionSettingEnabled())
              setAppState((state) => {
                if (state.promptSuggestionEnabled) return state;
                return {
                  ...state,
                  promptSuggestionEnabled: true,
                };
              });
            if (message.request.agentProgressSummaries) setSdkAgentProgressSummariesEnabled(true);
            let startupPhaseDone = !startupPhase;
            handlePrompt();
            if (startupPhaseDone && isDesktopTopSession() && !isParkedSpare())
              announcePrStarted(session.host);
            if (messageQueue.peek(isDrainableMainThreadCommand) !== undefined) kickQueue();
          } else if (message.request.subtype === "set_permission_mode") {
            let request = message.request;
            if (request.from_settings === true && isByocEnvironment()) {
              logEvent("tengu_settings_mode_dropped_in_runner_child", {});
              sendControlResponseSuccess(message, {
                mode: toExternalPermissionMode(getAppState().toolPermissionContext.mode),
              });
              continue;
            }
            let permissionMode = parsePermissionMode(request.mode);
            if (permissionMode === undefined || !isExternalPermissionMode(permissionMode)) {
              sendControlError(message, UNRECOGNIZED_PERMISSION_MODE_ERROR, "invalid_mode");
              continue;
            }
            if (permissionMode === "auto" && autoModeTransitionDue()) {
              let autoModeResult = await applyAutoModeTransition(
                getAppState().toolPermissionContext,
                setAppStateQuietly,
                getAppState().fastMode,
                EVENT_LOGGING_FLAG_WAIT_MS,
              );
              if (autoModeResult !== undefined) {
                sendControlError(message, autoModeResult.error, autoModeResult.code);
                continue;
              }
            }
            setAppState((prev) => {
              let modeChange = applyPermissionModeChange(request, prev.toolPermissionContext);
              if (!modeChange.ok) {
                sendControlError(message, modeChange.error, modeChange.code);
                return prev;
              }
              sendControlResponseSuccess(message, {
                mode: modeChange.mode,
              });
              noteModeChoice(modeChange.mode);
              return {
                ...prev,
                toolPermissionContext: modeChange.context,
                isUltraplanMode: request.ultraplan ?? prev.isUltraplanMode,
              };
            });
          } else if (message.request.subtype === "set_proactivity_level") {
            let offerBypass = message.request.offer_bypass;
            let proactivityLevel = getAppState().proactivityLevel;
            let nextLevel = cycleProactivityLevel(
              message.request.level,
              getAppState,
              setAppState,
              options.storageV5,
              {
                offerBypass,
                cloudOptIn: env.CLAUDE_CODE_REMOTE ? structuredIO.sessionState : undefined,
              },
            );
            if (nextLevel.ok) {
              if (nextLevel.response.level !== proactivityLevel)
                noteModeChoice(getAppState().toolPermissionContext.mode);
              sendControlResponseSuccess(message, nextLevel.response);
            } else sendControlError(message, sanitizeTelemetryString(nextLevel.error));
          } else if (message.request.subtype === "set_model") {
            let request = message.request;
            let vouchedPick = takeVouchedModelRequest(message.request_id);
            let runSetModel = async () => {
              try {
                let result = await handleSetModelRequest(
                  request,
                  vouchedPick
                    ? withAutoModeCapableDropGuard(modelControl, () => getAppState().toolPermissionContext)
                    : modelControl,
                );
                if (result.ok) {
                  await settleAutoModeAtModelSwitch(vouchedPick);
                  for (let notice of result.notices ?? []) announceInfo(notice);
                  sendControlResponseSuccess(message, {
                    model: activeModel() ?? getMainLoopModel(),
                  });
                } else
                  sendControlError(message, result.error, result.code, activeModel() ?? getMainLoopModel());
              } catch (error) {
                logError(toError(error));
                let fallbackModel;
                try {
                  fallbackModel = activeModel() ?? getMainLoopModel();
                } catch (error) {
                  logError(toError(error));
                }
                sendControlError(message, "set_model failed", "internal_error", fallbackModel);
              }
            };
            handleControlRequestAsync(() => serializeModelSwitch(session, runSetModel));
          } else if (message.request.subtype === "set_cwd") {
            let request = message.request;
            try {
              let { handleSetCwdControlRequest } = await import("../utils/cdRuleRefusalMessage.lazy.js");
              let queued = runState.dequeueCount > 0;
              let result = await handleSetCwdControlRequest(request, {
                session,
                isBusy: () =>
                  parkedPermissions.inheritedPromptPending() ||
                  isBusy({
                    running: runState.running,
                    runPhase: runState.runPhase,
                    mainThreadQueueLength: messageQueue.getMainThreadQueueLength(),
                  }),
                toolPermissionContext: getToolPermissionContext({
                  getAppState,
                }),
                retireDepartedAdditionalDirectories: (dirs) => {
                  setAppState((state) => {
                    let merged = mergeTrustedDirectories(state.toolPermissionContext, dirs);
                    return merged === state.toolPermissionContext
                      ? state
                      : {
                          ...state,
                          toolPermissionContext: merged,
                        };
                  });
                },
                enqueueMoveNotice: (value) => {
                  messageQueue.enqueue({
                    value,
                    mode: "prompt",
                    agentId: mainAgentId(),
                    uuid: randomUUID(),
                    isMeta: true,
                    shouldQuery: false,
                    skipSlashCommands: true,
                    skipAttachments: true,
                  });
                },
                storageV5: options.storageV5,
                credentials: options.credentials,
                isFreshSession: canEndImmediately,
                settlePlanAutoMode: () => {
                  setAppState((prev) => ({
                    ...prev,
                    toolPermissionContext: settlePlanAutoModeAtStart(prev.toolPermissionContext),
                  }));
                },
                requestBuilt: () => queued,
              });
              if (result.kind === "response") {
                if (result.response.status === "ok" && result.response.changed)
                  try {
                    await reloadPluginServers("set_cwd", {
                      restartLaunchDirStdioServers: result.freshSession === true,
                    });
                  } catch (error) {
                    logForDebugging(
                      `set_cwd: re-homing plugins/MCP for the new directory failed (continuing): ${errorMessage(error)}`,
                      {
                        level: "error",
                      },
                    );
                  }
                let transportBacked = isTransportBacked(session);
                let requestBacked =
                  result.response.status === "rejected" && transportBacked
                    ? {
                        ...result.response,
                        message: "set_cwd: request rejected",
                      }
                    : result.response;
                sendControlResponseSuccess(message, requestBacked);
              } else sendControlError(message, result.message);
            } catch (error) {
              let safeWireMessage = null;
              try {
                safeWireMessage = (await import("../utils/cdRuleRefusalMessage.lazy.js")).safeWireMessage;
              } catch {
                safeWireMessage = null;
              }
              let errorText = safeWireMessage
                ? safeWireMessage(
                    errorMessage(error),
                    "(error detail withheld: it contains control or invisible characters)",
                  )
                : "(error detail unavailable)";
              let cwdText = safeWireMessage
                ? safeWireMessage(
                    `The session's working directory is ${getCwd()}.`,
                    "The session stayed in its previous working directory.",
                  )
                : "The session stayed in its previous working directory.";
              controlError("set_cwd", errorMessage(error));
              sendControlError(
                message,
                `set_cwd: relocation failed \u2014 ${pickForTransport(session, errorText, "(error detail withheld)")}. ${pickForTransport(session, cwdText, "The session stayed in its previous working directory.")}`,
              );
            }
          } else if (message.request.subtype === "claim_session") {
            let mcpRequest = message.request;
            try {
              let { handleClaimSessionRequest } =
                await import("../entrypoints/warmSpare/handleClaimSessionRequest.lazy.js");
              let claimResult = await handleClaimSessionRequest(mcpRequest, {
                session,
                storageV5: options.storageV5,
                credentials: options.credentials,
                parkedSettingsRefusal: () => flagSettingsClaims.claimRefusal(),
                permissionModeSuppliedOnInvocation: options.permissionModeSuppliedOnInvocation !== false,
                isBusy: () =>
                  parkedPermissions.inheritedPromptPending() ||
                  isBusy({
                    running: runState.running,
                    runPhase: runState.runPhase,
                    mainThreadQueueLength: messageQueue.getMainThreadQueueLength(),
                  }),
                isFreshSession: canEndImmediately,
                startDeferredMcpServers: async () => {
                  let deferredServers = await options.startDeferredMcpServers?.(
                    new Set([
                      ...getAppState().mcp.clients.map((client) => client.name),
                      ...dynamicMcpState.clients.map((client) => client.name),
                      ...Object.keys(dynamicMcpState.configs),
                    ]),
                  );
                  turnStartChecks.noteServersStartedSinceKick(deferredServers ?? []);
                },
                rehomePluginsAndMcp: () => reloadPluginServers("claim_session"),
                getToolPermissionContext: () =>
                  getToolPermissionContext({
                    getAppState,
                  }),
                setToolPermissionContext: (context) => {
                  setAppState((state) =>
                    state.toolPermissionContext === context
                      ? state
                      : {
                          ...state,
                          toolPermissionContext: context,
                        },
                  );
                },
                retireDepartedAdditionalDirectories: (dirs) => {
                  setAppState((state) => {
                    let merged = mergeTrustedDirectories(state.toolPermissionContext, dirs);
                    return merged === state.toolPermissionContext
                      ? state
                      : {
                          ...state,
                          toolPermissionContext: merged,
                        };
                  });
                },
                applyPromptOptions: (promptOptions) => {
                  if (promptOptions.systemPrompt !== undefined)
                    options.systemPrompt = joinPromptValues(promptOptions.systemPrompt)
                      ? ""
                      : promptOptions.systemPrompt;
                  if (promptOptions.appendSystemPrompt !== undefined)
                    options.appendSystemPrompt = promptOptions.appendSystemPrompt;
                  let requestedTitle =
                    typeof promptOptions.title === "string"
                      ? sanitizeSessionTitle(promptOptions.title)
                      : undefined;
                  if (requestedTitle) {
                    initialWrite.attempted = true;
                    cacheSessionTitle(requestedTitle);
                    adoptSuppliedSessionTitle(requestedTitle, options.storageV5).catch(logError);
                  }
                  if (promptOptions.agents) {
                    let agentsFromJson = parseAgentsFromJson(promptOptions.agents, "flagSettings");
                    let knownAgents = new Set(agents);
                    agents = [...agents, ...agentsFromJson.filter((agent) => !knownAgents.has(agent))];
                  }
                  let mainAgent = seatMainThreadAgentFromPool(
                    getActiveAgentsFromList(agents),
                    options,
                    structuredIO,
                    {
                      deferInitialPrompt: true,
                      reapplySystemPromptIfSeated: true,
                    },
                  );
                  if (mainAgent.restrictedAgentModel) noticeRestrictedModel(mainAgent.restrictedAgentModel);
                  pendingHookRows = mainAgent.agent?.initialPrompt;
                },
                currentPermissionMode: () => getAppState().toolPermissionContext.mode,
                checkPermissionMode: (client) => {
                  let removed = parsePermissionMode(client);
                  if (removed === undefined || !isExternalPermissionMode(removed))
                    return UNRECOGNIZED_PERMISSION_MODE_ERROR;
                  let guard = guardPermissionModeChange(removed, getAppState().toolPermissionContext);
                  return guard.ok ? undefined : guard.error;
                },
                bypassPermissionsDeniedOutsideSandbox: isBypassPermissionsDeniedOutsideSandbox,
                applyPermissionMode: (cmd) => {
                  let modeResult;
                  setAppState((state) => {
                    let change = applyPermissionModeChange(
                      {
                        mode: cmd,
                      },
                      state.toolPermissionContext,
                    );
                    if (!change.ok) {
                      modeResult = change.error;
                      return state;
                    }
                    let startContext = asClaimedStartModeContext(change.context, {
                      bypassAvailableByFlag: options.bypassAvailableByFlag === true,
                    });
                    return startContext === state.toolPermissionContext && !state.isUltraplanMode
                      ? state
                      : {
                          ...state,
                          toolPermissionContext: startContext,
                          isUltraplanMode: false,
                        };
                  });
                  if (modeResult === undefined) options.permissionModeSuppliedOnInvocation = true;
                  return modeResult;
                },
                settlePlanAutoMode: settlePlanAutoModeAtStart,
                recheckAutoModeGate: () => {
                  verifyAutoModeGateAccess(getAppState().toolPermissionContext, getAppState().fastMode).then(
                    ({ updateContext }) => {
                      setAppState((state) => {
                        let normalizedPath = updateContext(state.toolPermissionContext);
                        return normalizedPath === state.toolPermissionContext
                          ? state
                          : {
                              ...state,
                              toolPermissionContext: normalizedPath,
                            };
                      });
                    },
                  );
                },
                workspaceRestrictsBypass: () => false,
                setSdkMcpServers: (serverNames) => {
                  let keepSet = new Set(serverNames);
                  for (let key of Object.keys(sdkMcpServerConfigs))
                    if (!keepSet.has(key)) delete sdkMcpServerConfigs[key];
                  for (let serverName of serverNames)
                    sdkMcpServerConfigs[serverName] ??= {
                      type: "sdk",
                      name: serverName,
                    };
                  serializedRedialAll();
                },
                sdkMcpSettled: () =>
                  Object.keys(sdkMcpServerConfigs).every((key) =>
                    clients_3.some((client) => client.name === key && client.type === "connected"),
                  ),
                startSessionStartHooks: () => {
                  setAwaitsFirstRun(false);
                  let startTime = performance.now();
                  let hookRunToken = {};
                  sessionStartPending = hookRunToken;
                  let hooksPromise = runStartupHooks(session, {
                    kind: "session-start",
                    source: "startup",
                    storageV5: options.storageV5,
                    credentials: options.credentials,
                  })
                    .finally(() => {
                      if (sessionStartPending === hookRunToken) sessionStartPending = undefined;
                    })
                    .then(
                      (hookMessages) => {
                        appendToConversation(hookMessages);
                        recordPhase("hooks_init_ms", performance.now() - startTime, startTime);
                        return takePendingInitialUserMessage();
                      },
                      (error) => {
                        logForDebugging(
                          `claim_session: SessionStart hooks failed (continuing without their output): ${errorMessage(error)}`,
                          {
                            level: "error",
                          },
                        );
                        return;
                      },
                    )
                    .then(async (hookRows) => {
                      let keptRows = cancelSourceLabels(hookRows, pendingHookRows);
                      pendingHookRows = undefined;
                      if (keptRows.length === 0) return;
                      if (handbackPending || heldInputReader.hasEnded()) {
                        let serializer = switchSerializerSlot.of(session);
                        if (serializer.pending > 0) await serializer.tail;
                        for (let { text, sentBy } of keptRows) {
                          let queueItem = {
                            mode: "prompt",
                            value: text,
                            agentId: mainAgentId(),
                            ...(!(structuredIO instanceof RemoteIO) && {
                              localStdinOrigin: true,
                            }),
                          };
                          messageQueue.enqueue(
                            sentBy === "person" ? withOwnWordStopKey(queueItem) : queueItem,
                          );
                        }
                        kickQueue();
                        return;
                      }
                      let mapped = keptRows.map((row) => row.text);
                      let promise = new Promise((resolve) => {
                        enqueueResult = (onQueued) => {
                          if ("cannotQueue" in onQueued) {
                            resolve(onQueued.cannotQueue);
                            return;
                          }
                          let queuedIndex =
                            typeof onQueued.queued === "string" ? mapped.indexOf(onQueued.queued) : -1;
                          if (queuedIndex !== -1) mapped.splice(queuedIndex, 1);
                          if (mapped.length === 0) resolve(undefined);
                        };
                      });
                      for (let { text, sentBy } of keptRows) structuredIO.prependUserMessage(text, sentBy);
                      let winner = await Promise.race([
                        promise,
                        sleep(CLAIM_SESSION_QUEUE_DELAY_MS, undefined, {
                          unref: true,
                        }).then(() => `not queued after ${CLAIM_SESSION_QUEUE_DELAY_MS}ms`),
                      ]);
                      enqueueResult = undefined;
                      if (winner !== undefined)
                        logForDebugging(
                          `claim_session: the session's own first-turn messages will not run ahead of the host's messages (${winner}); releasing the host's messages`,
                          {
                            level: "warn",
                          },
                        );
                    })
                    .catch((error) => {
                      enqueueResult = undefined;
                      logForDebugging(
                        `claim_session: queueing the session's own first-turn messages failed (continuing): ${errorMessage(error)}`,
                        {
                          level: "error",
                        },
                      );
                    })
                    .finally(() => {
                      if (firstTurnGate === hooksPromise) firstTurnGate = undefined;
                    });
                  firstTurnGate = hooksPromise;
                  startupJoin = hooksPromise;
                },
                applyWorkspaceTrust: (cmd) =>
                  applyWorkspaceTrust(structuredIO.hostOwnsStdinOrigin ? cmd : undefined, {
                    cwd: getCwd(),
                    trustedNetworkDirectories: getAppState().toolPermissionContext.trustedNetworkDirectories,
                    storageV5: options.storageV5,
                  }),
                announceStartingChange: () => {
                  if (isDesktopTopSession()) announcePrStarted(session.host);
                },
                buildInitializePayload: (cmd) => {
                  let { models, unavailable } = modelRows();
                  return _buildInitializeResponsePayloadForTesting(
                    () => otherCommands(),
                    getActiveAgentsFromList(agents),
                    models,
                    unavailable,
                    getAppState,
                    userSpecifiedModel,
                    () => structuredIO.sessionState.getState(),
                    hasSdkHostHooks() ? true : undefined,
                    undefined,
                    cmd,
                    undefined,
                    options.storageV5,
                    () => ({
                      redactsWhatItPersists: isTransportBacked(session),
                      isRemoteTransport: structuredIO.isRemoteTransport(),
                      sessionWriters: structuredIO.sessionWriters(),
                    }),
                    refreshBridgeToolList,
                  ).then((payload) => withHostWordedAsks(payload, structuredIO, options));
                },
              });
              if (claimResult.kind === "ok") {
                sendControlResponseSuccess(message, claimResult.response);
                headlessProfilerCheckpoint("claim_answered");
              } else sendControlError(message, claimResult.message);
            } catch (error) {
              if (getSpareClaimState() === "claiming") {
                markSpareClaimFailed();
                controlError("claim_session", errorMessage(error));
                sendControlError(
                  message,
                  `claim_failed: ${pickForTransport(session, sanitizeTelemetryString(errorMessage(error)), "(error detail withheld)")} \u2014 discard this spare`,
                );
              } else {
                controlError("claim_session", errorMessage(error));
                sendControlError(
                  message,
                  `rejected: ${pickForTransport(session, sanitizeTelemetryString(errorMessage(error)), "(error detail withheld)")} \u2014 the spare is still parked`,
                );
              }
            }
          } else if (message.request.subtype === "get_status") {
            if (isTransportBacked(session)) {
              sendControlError(message, "get_status is not available on this connection");
              continue;
            }
            let statusRequest = message;
            handleControlRequestAsync(async () => {
              try {
                let printModules = lazyPrintModules?.();
                if (!printModules) {
                  sendControlError(statusRequest, "get_status is not available in this build");
                  return;
                }
                sendControlResponseSuccess(statusRequest, {
                  sections: await printModules.buildStatusSections({
                    credentials: options.credentials,
                    mainLoopModel: activeModel() ?? getMainLoopModel(),
                    mcp: {
                      ...getAppState().mcp,
                      clients: rows(),
                    },
                    permissionMode: getAppState().toolPermissionContext.mode,
                    remoteSessionName: getAppState().remoteSessionName,
                  }),
                });
              } catch (error) {
                sendControlErrorWithMeta(statusRequest, "get_status", error);
              }
            });
          } else if (message.request.subtype === "export_conversation") {
            if (isTransportBacked(session)) {
              sendControlError(message, "export_conversation is not available on this connection");
              continue;
            }
            let currentAppState = contextUsageInputsForSummary();
            let messages = [...currentAppState.messages];
            let exportRequest = message;
            handleControlRequestAsync(async () => {
              try {
                let exporter = lazyConversationExporter?.();
                if (!exporter) {
                  sendControlError(exportRequest, "export_conversation is not available in this build");
                  return;
                }
                sendControlResponseSuccess(
                  exportRequest,
                  await exporter.exportConversation({
                    session,
                    messages,
                    tools: currentAppState.tools,
                    storageV5: options.storageV5,
                  }),
                );
              } catch (error) {
                sendControlErrorWithMeta(exportRequest, "export_conversation", error);
              }
            });
          } else if (
            message.request.subtype === "list_cloud_sessions" ||
            message.request.subtype === "get_cloud_session" ||
            message.request.subtype === "get_cloud_session_transcript"
          ) {
            if (!isLocalStdinOnly(session)) {
              sendControlError(message, `${message.request.subtype} is not available on this connection`);
              continue;
            }
            let cloudRequest = message;
            let request = message.request;
            handledOrphanedToolUseIds.get(cloudRequest.request_id)?.abort();
            let abortController = createAbortController();
            handledOrphanedToolUseIds.set(cloudRequest.request_id, abortController);
            let isStillCurrent = () =>
              handledOrphanedToolUseIds.get(cloudRequest.request_id) === abortController;
            let readResult = rateLimitListener(
              (async () => {
                try {
                  cloudSessionReads ??= import("../services/cloudSession/cloudSessionReads.js")
                    .then((cloudSessionReads) => new cloudSessionReads.CloudSessionReads())
                    .catch((error) => {
                      cloudSessionReads = undefined;
                      throw error;
                    });
                  let cloudReads = await cloudSessionReads;
                  let readOptions = {
                    abortController,
                    credentials: options.credentials,
                    storageV5: options.storageV5,
                  };
                  let transcriptResult =
                    request.subtype === "get_cloud_session_transcript"
                      ? await (
                          await import("../services/cloudSession/answerCloudSessionTranscript.lazy.js")
                        ).answerCloudSessionTranscript(cloudReads, request, readOptions)
                      : await cloudReads.answer(request, readOptions);
                  if (isStillCurrent()) sendControlResponseSuccess(cloudRequest, transcriptResult);
                } catch (error) {
                  if (isStillCurrent())
                    sendControlErrorWithMeta(cloudRequest, request.subtype, error, {
                      expected: error instanceof WireSafeControlError,
                    });
                } finally {
                  if (isStillCurrent()) handledOrphanedToolUseIds.delete(cloudRequest.request_id);
                }
              })(),
            );
            handleControlRequestAsync(() => readResult);
          } else if (message.request.subtype === "get_memory_dialog") {
            if (isTransportBacked(session)) {
              sendControlError(message, "get_memory_dialog is not available on this connection");
              continue;
            }
            try {
              let { buildMemoryDialogResponse } = await import("../memdir/buildMemoryDialogResponse.lazy.js");
              sendControlResponseSuccess(
                message,
                await buildMemoryDialogResponse({
                  session,
                  storageV5: options.storageV5,
                  credentials: options.credentials,
                  activeAgents: getActiveAgentsFromList(agents),
                  dreamRunning: Object.values(getAppState().tasks).some(
                    (task) => task.type === "dream" && task.status === "running",
                  ),
                }),
              );
            } catch (error) {
              sendControlErrorWithMeta(message, "get_memory_dialog", error);
            }
          } else if (message.request.subtype === "get_skills_dialog") {
            if (isTransportBacked(session)) {
              sendControlError(message, "get_skills_dialog is not available on this connection");
              continue;
            }
            try {
              let { buildSkillsDialogResponse } =
                await import("../commands/context/buildSkillsDialogResponse.lazy.js");
              sendControlResponseSuccess(
                message,
                buildSkillsDialogResponse({
                  commands: otherCommands(),
                  bytesPerToken: bytesPerTokenForModel(activeModel() ?? getMainLoopModel()),
                }),
              );
            } catch (error) {
              sendControlErrorWithMeta(message, "get_skills_dialog", error);
            }
          } else if (message.request.subtype === "get_chrome_dialog") {
            if (isTransportBacked(session)) {
              sendControlError(message, "get_chrome_dialog is not available on this connection");
              continue;
            }
            try {
              let [{ buildChromeDialogResponse }, { claudeInChromeDefaultForHost }] = await Promise.all([
                import("../commands/chrome/chromeDialogResponse.js"),
                import("../utils/claudeInChrome/claudeInChromeDefaultForHost.lazy.js"),
              ]);
              sendControlResponseSuccess(
                message,
                await buildChromeDialogResponse({
                  mcpClients: rows(),
                  atStartup: (settingOn) =>
                    claudeInChromeDefaultForHost({
                      settingOn,
                    }),
                }),
              );
            } catch (error) {
              sendControlErrorWithMeta(message, "get_chrome_dialog", error);
            }
          } else if (
            message.request.subtype === "get_chrome_browsers" ||
            message.request.subtype === "select_chrome_browser"
          ) {
            let chromeRequest = message;
            let request = message.request;
            let subtype = request.subtype;
            if (isTransportBacked(session)) {
              sendControlError(chromeRequest, `${subtype} is not available on this connection`);
              continue;
            }
            let { CLAUDE_IN_CHROME_MCP_SERVER_NAME } = await import("../utils/claudeInChrome/common.js");
            let found = rows().find(
              (prev) => prev.name === CLAUDE_IN_CHROME_MCP_SERVER_NAME && prev.type === "connected",
            );
            if (!found) {
              sendControlError(chromeRequest, "Claude in Chrome is not connected in this session");
              continue;
            }
            handleControlRequestAsync(async () => {
              let chromeModule;
              try {
                chromeModule = await import("../utils/claudeInChrome/browserPicker.js");
                let {
                  BrowserListShapeError,
                  listConnectedBrowsers,
                  noBrowsersWhenUnreachable,
                  selectBrowser,
                } = chromeModule;
                let bounded = (promise) =>
                  withTimeout(promise, LOGIN_BLOCKED_MESSAGES, "Claude in Chrome did not answer in time");
                if (request.subtype === "get_chrome_browsers") {
                  let pairedDeviceId = getGlobalConfig().chromeExtension?.pairedDeviceId;
                  let browsers = await bounded(listConnectedBrowsers(found)).catch(noBrowsersWhenUnreachable);
                  sendControlResponseSuccess(chromeRequest, {
                    browsers: browsers.map((browser) => ({
                      device_id: browser.deviceId,
                      name: browser.name,
                      ...(browser.osPlatform !== undefined && {
                        os_platform: browser.osPlatform,
                      }),
                      current: browser.deviceId === pairedDeviceId,
                    })),
                  });
                } else {
                  let deviceId = request.device_id;
                  let listedBrowsers =
                    typeof deviceId === "string" && deviceId !== ""
                      ? await bounded(listConnectedBrowsers(found)).catch((error) => {
                          if (error instanceof BrowserListShapeError) return [];
                          throw error;
                        })
                      : [];
                  await selectBrowser(found, deviceId, bounded);
                  let found_2 = listedBrowsers.find((browser) => browser.deviceId === deviceId);
                  sendControlResponseSuccess(chromeRequest, {
                    ...(found_2 && {
                      name: found_2.name,
                    }),
                  });
                  logFeatureOk("chrome_browser_picker");
                }
              } catch (error) {
                let bridgeUnreachable = chromeModule?.isChromeBridgeUnreachable(error) === true;
                let namedABrowser =
                  chromeModule !== undefined && chromeModule.isBrowserNotListed(error) && error.namedABrowser;
                sendControlErrorWithMeta(chromeRequest, subtype, error, {
                  expected: bridgeUnreachable || namedABrowser,
                });
                if (subtype === "select_chrome_browser")
                  if (chromeModule) chromeModule.logBrowserSwitchFailure(error);
                  else logFeatureBad("chrome_browser_picker", "select_failed");
              }
            });
          } else if (message.request.subtype === "get_sandbox_dialog") {
            if (isTransportBacked(session)) {
              sendControlError(message, "get_sandbox_dialog is not available on this connection");
              continue;
            }
            try {
              let { buildSandboxDialogResponse } =
                await import("../commands/sandbox-toggle/buildSandboxDialogResponse.lazy.js");
              sendControlResponseSuccess(message, await buildSandboxDialogResponse());
            } catch (error) {
              sendControlErrorWithMeta(message, "get_sandbox_dialog", error);
            }
          } else if (message.request.subtype === "mcp_message") {
            let request = message.request;
            let connection = clients_3.find((client) => client.name === request.server_name);
            if (connection && connection.type === "connected") injectMcpMessage(connection, request.message);
            if (
              isToolListChangedNotification(request.message) &&
              Object.hasOwn(sdkMcpServerConfigs, request.server_name) &&
              isSdkMcpManifestsEnabled()
            ) {
              gaveUpServers.delete(request.server_name);
              staleSdkServers.add(request.server_name);
              let entry = sdkServerManifests.get(request.server_name);
              if (entry?.toolsListResult !== undefined) {
                sdkServerManifests.set(request.server_name, {
                  initializeResult: entry.initializeResult,
                });
                logFeatureSad("mcp_sdk_manifest", "mcp_sdk_manifest_tools_changed_before_connect");
              }
              if (connection?.type === "connected") serializedRedialAll("skip");
            }
            sendControlResponseSuccess(message);
          } else if (message.request.subtype === "rewind_files") {
            let currentAppState = getAppState();
            let rewindResult = await handleRewindFiles(
              message.request.user_message_id,
              currentAppState,
              message.request.dry_run ?? false,
            );
            if (rewindResult.error !== undefined) controlError("rewind_files", rewindResult.error);
            if (rewindResult.canRewind || message.request.dry_run)
              sendControlResponseSuccess(
                message,
                ((result) => {
                  if (!isTransportBacked(session)) return result;
                  let { filesChanged, ...rest } = result;
                  return rest;
                })(
                  rewindResult.error !== undefined
                    ? {
                        ...rewindResult,
                        error: pickForTransport(session, rewindResult.error, "Failed to rewind"),
                      }
                    : rewindResult,
                ),
              );
            else
              sendControlError(
                message,
                pickForTransport(session, rewindResult.error ?? "Unexpected error", "Failed to rewind"),
              );
          } else if (message.request.subtype === "cancel_async_message") {
            let messageUuid = message.request.message_uuid;
            let rewindOutcome =
              !declinesWithdrawalOf(messageUuid) &&
              cancelQueuedThreadMessage({
                targetUuid: messageUuid,
                sender: "host",
                messageQueue,
                prewaitLatch,
                io: structuredIO,
              });
            if (rewindOutcome)
              runSafelyOrEmpty(() => parkedPermissions.noteCancelledInTheQueue([messageUuid]));
            sendControlResponseSuccess(message, {
              cancelled: rewindOutcome,
            });
          } else if (message.request.subtype === "poll_event") {
            detached = true;
            let ack = ackPollEventRow({
              row: uuid,
              rowsInFlight: activeOAuthFlows,
              tearingDown: () => abortController.signal.aborted || isShuttingDown() || isTerminalShutdown(),
              ack: (uuid) => structuredIO.onCommandLifecycle?.(uuid, "completed"),
              flushSessionStorage,
              reply: (reply) => sendSimpleControlError(message, reply),
            });
            if (ack)
              handlePollEvent(message.request, {
                ...sharedControlContext,
                ...ack,
              });
          } else if (message.request.subtype === "rewind_conversation") {
            if (typeof message.request.target_message_uuid !== "string") {
              sendControlError(message, "rewind_conversation: target_message_uuid must be a string");
              continue;
            }
            let expiryVerdict = rewindExpiryVerdict(isParkedHolding(message), message.request.expires_at);
            if (expiryVerdict !== undefined) {
              sendControlResponseSuccess(message, expiryVerdict);
              continue;
            }
            let targetMessageUuid = message.request.target_message_uuid;
            let runRewind = () => {
              let latch = isolationLatch.current;
              if (latch === "web" || latch === "connectors") return latch;
              if (latch !== null) return;
              try {
                return isWebSearchIsolationActive() ? null : undefined;
              } catch (error) {
                logForDebugging(
                  "rewind refusal: isolation enforcement check threw; isolation_latch left off",
                  {
                    level: "error",
                  },
                );
                logError(error);
                return;
              }
            };
            let lastSeenUserMessageUuid = message.request.last_seen_user_message_uuid;
            let nudgeHold = createNudgeHold({
              getAppState,
              setAppState,
              session,
            });
            let rewindOptions = {
              allowSummarizedTarget: message.request.allow_summarized_target === true,
              allowAssistantTarget: message.request.allow_assistant_target === true,
            };
            let stopSettling = parkedPermissions.stopSettling;
            if (stopSettling !== undefined) await withDeadline(stopSettling, COST_PUSH_INTERVAL_MS);
            let hasPendingRewind = () =>
              findRewindPoint(conversationRows, targetMessageUuid, lastSeenUserMessageUuid, {
                rowsOffDisk: getSessionRowsOffDisk(),
                ...rewindOptions,
              });
            let isCutOffPrompt = () =>
              runState.running &&
              (runState.runPhase !== "waiting_for_agents" ||
                structuredIO.sessionState.getState() === "requires_action");
            let request = message.request;
            let rerunMode;
            let getRerunMode = () => (rerunMode ??= rewindRerunMode());
            if (request.interrupt_if_running === true)
              dropOwnRerunOnRewind({
                messageQueue,
                io: structuredIO,
                readSwitch: getRerunMode,
                namedByTheRequest: [request.target_message_uuid, request.last_seen_user_message_uuid],
                decide: hasPendingRewind,
                logFailure: (reportFailure) =>
                  logHandlerFailure(
                    isTransportBacked(session),
                    "rewind_conversation: own re-run",
                    reportFailure,
                  ),
              });
            let refuseIfLimited = request.refuse_if_usage_limited === true;
            let limitCheck =
              refuseIfLimited &&
              request.interrupt_if_running === true &&
              runningOtherTasks() &&
              runState.dequeueCount > 0 &&
              getRerunMode() === "on";
            let askLimit = async () => {
              rewindLimitAsked = true;
              let answer = await askRewindLimitQuestion({
                promptUpOrHeld: () =>
                  structuredIO.sessionState.getState() === "requires_action" ||
                  parkedPermissions.inheritedPromptPending(),
                busy: () =>
                  messageQueue.getDrainableMainThreadQueueLength() > 0 ||
                  userFrameIntake.hasParked() ||
                  hasActiveTeammates() ||
                  parkedPermissions.stopRetirementOwed,
                runGoing: runningOtherTasks,
                interruptAsked: request.interrupt_if_running === true,
                afterTheInterruptBranch: limitCheck,
                missingTargetAsked: request.refuse_missing_target_if_usage_limited === true,
                decide: hasPendingRewind,
                rowCount: () => conversationRows.length,
                runEnding: () =>
                  isTurnAbortedForRewind({
                    drain: runState,
                    messageQueue,
                    prewaitLatch,
                  }),
                runWaitable: isCutOffPrompt,
                dequeues: () => runState.dequeueCount,
                ending: isTerminalShutdown,
                stop: abortController.signal,
                mainModel: () => activeModel() ?? getMainLoopModel(),
                credentials: options.credentials,
                storageV5: options.storageV5,
                logFailure: (reportFailure) =>
                  logHandlerFailure(
                    isTransportBacked(session),
                    "rewind_conversation: limit question",
                    reportFailure,
                  ),
              });
              rewindLimitAsked = false;
              if (answer === "ending") {
                nudgeHold.release({
                  mayBeSentAgain: false,
                });
                detached = true;
                return true;
              }
              if (answer === "turn_running") {
                nudgeHold.release({
                  mayBeSentAgain: REWIND_REFUSAL_RETRYABLE.turn_running,
                });
                sendControlResponseSuccess(message, rewindRefusal("turn_running", runRewind()));
                return true;
              }
              if (answer !== "go_on") {
                nudgeHold.release({
                  mayBeSentAgain: false,
                });
                answer.report();
                sendControlResponseSuccess(
                  message,
                  usageLimitedRewindRefusal(answer.targetFound, runRewind()),
                );
                return true;
              }
              return false;
            };
            if (refuseIfLimited && !limitCheck && (await askLimit())) continue;
            let prepareCheck =
              !runningOtherTasks() || message.request.interrupt_if_running
                ? findRewindPoint(
                    conversationRows,
                    targetMessageUuid,
                    message.request.last_seen_user_message_uuid,
                    rewindOptions,
                  )
                : undefined;
            let queuedRows =
              prepareCheck !== undefined && "cut" in prepareCheck
                ? stopAndDropOutside(
                    detachedCallSlots.of(session),
                    messageQueue,
                    conversationRows.slice(0, prepareCheck.cut.index),
                  )
                : [];
            let refuse = (reason) => {
              for (let row of queuedRows) messageQueue.enqueue(row);
              nudgeHold.release({
                mayBeSentAgain: REWIND_REFUSAL_RETRYABLE[reason],
              });
              sendControlResponseSuccess(message, rewindRefusal(reason, runRewind()));
            };
            let interruptIfRunning = message.request.interrupt_if_running
              ? hasOtherWork()
              : runningOtherTasks();
            if (
              interruptIfRunning &&
              message.request.interrupt_if_running &&
              messageQueue.getDrainableMainThreadQueueLength() === 0 &&
              !(
                getSdkPerTaskStopAffordance() &&
                !runState.running &&
                structuredIO.sessionState.getState() === "requires_action"
              ) &&
              !hasActiveTeammates()
            ) {
              if (
                runState.running &&
                runState.runPhase !== "waiting_for_agents" &&
                getSessionRowsOffDisk() === undefined &&
                prepareCheck !== undefined &&
                "refuse" in prepareCheck &&
                prepareCheck.refuse === "unseen_later_turn" &&
                isRewindTargetQueued(conversationRows, targetMessageUuid, lastSeenUserMessageUuid)
              ) {
                reportRewindRefusal(prepareCheck, prepareCheck.refuse);
                refuse(prepareCheck.refuse);
                continue;
              }
              retractPendingTitle(initialWrite);
              spareTasksForStop();
              handleControlRequest({
                retireParkedPermission: !parkedPermissions.inheritedPromptHoldCapable(),
                parkedPermissionReason: "rewind",
                keepDetachedToolCalls: true,
              });
              let dequeueCount = runState.dequeueCount;
              let deadline = Date.now() + 1e4;
              while (
                hasOtherWork() &&
                (isCutOffPrompt() ||
                  (!getSdkPerTaskStopAffordance() &&
                    structuredIO.sessionState.getState() === "requires_action" &&
                    !parkedHolding())) &&
                runState.dequeueCount === dequeueCount &&
                Date.now() < deadline
              ) {
                runState.abortController?.abort(userAbortReason("remote-cancel"));
                await sleep(20);
              }
              let stopSettling = parkedPermissions.stopSettling;
              if (stopSettling !== undefined) await withDeadline(stopSettling, COST_PUSH_INTERVAL_MS);
              keepaliveAfterStop.arm();
              interruptIfRunning = runState.dequeueCount > dequeueCount || hasOtherWork();
            }
            if (limitCheck) {
              let dequeueCount = runState.dequeueCount;
              if (await askLimit()) {
                for (let row of queuedRows) messageQueue.enqueue(row);
                continue;
              }
              interruptIfRunning ||= runState.dequeueCount > dequeueCount || hasOtherWork();
            }
            if (interruptIfRunning || messageQueue.getDrainableMainThreadQueueLength() > 0)
              refuse(hasRunningWork());
            else {
              let pending = hasPendingRewind();
              if ("refuse" in pending) {
                reportRewindRefusal(pending, pending.refuse);
                refuse(pending.refuse);
              } else {
                let { index, echoUuid, prefillText, precedingAssistantUuid, resolution } = pending.cut;
                if (getSdkPerTaskStopAffordance() || reportsRunningBackgroundTasksExplicit())
                  stopTeammatesAfterCut({
                    taskRegistry: createTaskFramework(getAppState, setAppState),
                    setAppState,
                    storageV5: options.storageV5,
                    messages: conversationRows,
                    cutIndex: index,
                  });
                if (!parkedPermissions.inheritedPromptHoldCapable()) parkedPermissions.fire("rewind");
                let mirrorOptions = {
                  mirror: (leafUuid, checkpoint) => mirrorLeafCheckpointToRemote(leafUuid, checkpoint),
                  flushInternalEvents: () => structuredIO.flushInternalEvents(),
                  persistLocal: (leafUuid, checkpoint) =>
                    persistLeafCheckpoint(leafUuid, checkpoint, options.storageV5),
                  logFailure: (leafUuid, error) => logError(error),
                };
                let persistOptions = {
                  messages: conversationRows,
                  dequeueCount: () => runState.dequeueCount,
                  drainableMainThreadQueueLength: () => messageQueue.getDrainableMainThreadQueueLength(),
                };
                let prefix = queueStamp(persistOptions);
                nudgeHold.renew();
                retractPendingTitle(initialWrite);
                if (!(await persistRewindCut(pending.cut, persistOptions, mirrorOptions))) {
                  reportRewindRefusal(pending, "persist_failed");
                  refuse("persist_failed");
                } else if (
                  rewindTargetMoved(prefix, persistOptions, pending.cut) ||
                  !isRewindCutPersistable(conversationRows, pending.cut, getSessionRowsOffDisk())
                ) {
                  await waitForRewindQuiet(persistOptions, mirrorOptions);
                  reportRewindRefusal(pending, "state_changed");
                  refuse("state_changed");
                } else {
                  let restoreOptions = {
                    messages: conversationRows,
                    appendToConversation,
                    readFileState,
                    memorySelector,
                    host: session.host,
                    toolAliases: options.toolAliases,
                    stickyBetas: getStickyBetas,
                    logFailure: (snapshot, error) => logError(error),
                  };
                  stopMcpTasksAfterCut({
                    taskRegistry: createTaskFramework(getAppState, setAppState),
                    setAppState,
                    storageV5: options.storageV5,
                    messages: conversationRows,
                    cutIndex: index,
                  });
                  withdrawDeferredAfterCut({
                    endings: mcpTaskEndingsSlots.peek(session),
                    queue: messageQueue,
                    messages: conversationRows,
                    cutIndex: index,
                  });
                  let removed = applyRewindCut(restoreOptions, index);
                  retractPendingTitle(initialWrite);
                  nudgeHold.keep();
                  rewindReadNotifications(
                    {
                      getAppState,
                      setAppState,
                      session,
                    },
                    {
                      kept: conversationRows,
                      removed,
                      targetUuid: targetMessageUuid,
                    },
                  );
                  discardQueuedOutside(detachedCallSlots.of(session), messageQueue, conversationRows);
                  if (
                    parkedPermissions.inheritedPromptPending() &&
                    turnInterruptionState &&
                    turnInterruptionState.kind !== "none"
                  ) {
                    let { uuid } = turnInterruptionState.message;
                    if (!conversationRows.some((prev) => prev.uuid === uuid))
                      parkedPermissions.fire("rewind");
                  }
                  if (!parkedPermissions.inheritedPromptPending()) {
                    redeliveryResolver.cancelAfterRewind();
                    if (getRerunMode() === "on") redeliveryResolver.closeAfterRewind();
                  }
                  forwardedCount = conversationRows.length;
                  trimForwardedTail();
                  reportRewindRefusal(pending, "rewound");
                  appliedRewind = buildTurnHandoffReply(message.request_id, conversationRows);
                  sendControlResponseSuccess(message, {
                    rewound: true,
                    targetMessageUuid: echoUuid,
                    prefillText,
                    precedingAssistantUuid,
                    ...(resolution !== undefined && {
                      resolution,
                    }),
                  });
                }
              }
            }
          } else if (message.request.subtype === "fork_conversation") {
            let request = message.request;
            runControl(async () => {
              let tone = repoRootErrorTone();
              let forkOutcome = await handleForkConversation(request, {
                messages: conversationRows,
                blockedReason: () =>
                  runningOtherTasks() || messageQueue.getDrainableMainThreadQueueLength() > 0
                    ? REWIND_REFUSAL_TEXT[hasRunningWork()]
                    : null,
                sdkUrl: options.sdkUrl,
                permissionMode: getPermissionModeCycle(getAppState()),
                credentials: options.credentials,
                storageV5: options.storageV5,
                getTools: refreshBridgeToolList,
                host: session.host,
              }).finally(tone);
              if (forkOutcome.ok) sendControlResponseSuccess(message, forkOutcome.response);
              else sendControlError(message, forkOutcome.error);
            });
          } else if (message.request.subtype === "read_file") {
            let forkRequest = message;
            let request = message.request;
            let anchoredAsWritten = request.anchor?.kind === "as_written";
            let respond = (result) => {
              try {
                if (anchoredAsWritten) result();
              } catch {}
            };
            let noticeServed = "not_served";
            let runFork = async () => {
              try {
                let respondOptions =
                  request.anchor === undefined
                    ? await runTurn(request)
                    : anchoredAsWritten
                      ? await submitTask(request, {
                          askedAt: startTime,
                          onRefusal: (onRefusal) => {
                            noticeServed = onRefusal;
                          },
                        })
                      : await submitTurn(request);
                sendControlResponseSuccess(
                  forkRequest,
                  isTransportBacked(session)
                    ? {
                        ...respondOptions,
                        absPath: request.path,
                      }
                    : respondOptions,
                );
                respond(() => logFeatureOk("remote_read_file_as_written"));
              } catch (error) {
                let isAnchoredRefusal = anchoredAsWritten && error instanceof WireSafeControlError;
                let shouldReportRefusal = isAnchoredRefusal && !isNoticeKindServed(noticeServed);
                sendControlErrorWithMeta(
                  forkRequest,
                  "read_file",
                  error,
                  {
                    expected: shouldReportRefusal,
                  },
                  isAnchoredRefusal ? "read_denied" : undefined,
                );
                respond(() =>
                  shouldReportRefusal
                    ? logFeatureSad("remote_read_file_as_written", "refused")
                    : logFeatureBad(
                        "remote_read_file_as_written",
                        isAnchoredRefusal ? noticeServed : "unexpected_error",
                      ),
                );
              }
            };
            if (request.anchor === undefined) await runFork();
            else {
              let limitedFork = rateLimitListener(runFork());
              handleControlRequestAsync(() => limitedFork);
            }
          } else if (
            message.request.subtype === "list_directory" &&
            env.CLAUDE_CODE_REMOTE &&
            getPlatform() === "linux" &&
            getFeatureValue_CACHED_MAY_BE_STALE("tengu_gentle_hummingbird", true)
          ) {
            let cwdRequest = message;
            let path = message.request.path;
            handleControlRequestAsync(async () => {
              let result;
              try {
                result = await limitTurnConcurrency(path);
              } catch (error) {
                let errorClass = repoRootErrorClass(error);
                if (errorClass !== undefined)
                  sendControlErrorWithMeta(cwdRequest, "list_directory", error, {
                    expected: errorClass !== "unexpected_error",
                  });
                else {
                  sendControlError(cwdRequest, "list denied: unexpected_error");
                  logHandlerFailure(
                    isTransportBacked(session),
                    "list_directory",
                    error instanceof WireSafeControlError
                      ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                          errorMessage(error),
                          "list_directory: a refusal of another module",
                        )
                      : error,
                  );
                }
                if (errorClass !== undefined && REPO_ROOT_ERROR_TONES[errorClass] === "sad")
                  logFeatureSad("remote_list_directory", errorClass);
                else logFeatureBad("remote_list_directory", errorClass ?? "unexpected_error");
                return;
              }
              sendControlResponseSuccess(
                cwdRequest,
                isTransportBacked(session)
                  ? {
                      ...result,
                      absPath: path,
                    }
                  : result,
              );
              logFeatureOk("remote_list_directory");
            });
          } else if (
            message.request.subtype === "start_shell_task" &&
            shouldOfferLinuxSandboxHint(refreshBridgeToolList())
          ) {
            let uiRequest = message;
            let request = message.request;
            let prefix = isParkedHolding(message);
            runControl(async () => {
              try {
                sendControlResponseSuccess(
                  uiRequest,
                  await remoteMcpTracker.answer(
                    uiRequest.request_id,
                    request,
                    {
                      readsSessionStream: structuredIO.isRemoteTransport(),
                      storedAt: prefix.storedAt,
                      joinedAt: structuredIO.sessionStreamJoinedAt(),
                      heldMs: rewindRequestAge(prefix),
                    },
                    controlDeps,
                  ),
                );
              } catch (error) {
                sendControlErrorWithMeta(uiRequest, "start_shell_task", error, {
                  expected: error instanceof WireSafeControlError,
                });
              }
            });
          } else if (rejectUiControl) {
            if (structuredIO.answersSurfaceRefusal(message))
              sendControlError(
                message,
                `${UNSUPPORTED_CONTROL_SUBTYPE_TEXT}: ${sanitizeTelemetryString(String(message.request.subtype))}`,
              );
            if (
              canServeManifestsWithoutWriters(
                structuredIO.uiSurfaceChannel(),
                clientRegistry.list().length > 0,
              )
            ) {
              for (let client of clientRegistry.list()) surfaceDeclarationTracker.forget(client.clientId);
              detachAllClients_2();
              try {
                pruneDetachedClients();
              } catch (error) {
                logForDebugging(`unserved channel: review failed: ${errorMessage(error)}`, {
                  level: "error",
                });
              }
            }
          } else if (message.request.subtype === "ui_attach") {
            let parsed = SDKUiAttachUiAttachMessageSchema().safeParse(message.request);
            if (!parsed.success) {
              sendControlError(
                message,
                `ui_attach: surface must be "desktop", "mobile" or "vscode", client_id 1-64 of letters, digits, . _ - (the colon is the engine's), viewport (when given) positive integer columns and rows with isFullscreen (when given) a boolean, answers (when given) a list of ${UiClientAnswerableRequestSchema()
                  .options.map((prev) => `"${prev}"`)
                  .join(
                    ", ",
                  )}, and draws (when given) a list of at most 16 names of at most 64 characters ("Backdrop", "Input" and "Select" are the ones known; another is ignored)`,
              );
              continue;
            }
            let attachRequest = message;
            let attachMessage = parsed.data;
            panelAttachOwed = false;
            handleControlRequestAsync(async () => {
              try {
                let joined = surfaceDeclarationTracker.join({
                  client: {
                    surface: attachMessage.surface,
                    clientId: attachMessage.client_id,
                    ...(attachMessage.viewport !== undefined && {
                      viewport: attachMessage.viewport,
                    }),
                  },
                  answers: attachMessage.answers,
                  draws: normalizeDraws(attachMessage.draws),
                  declares: true,
                  by: attachRequest,
                });
                if (!joined.isAdmitted) {
                  sendControlError(attachRequest, `${UNSUPPORTED_CONTROL_SUBTYPE_TEXT}: ui_attach`);
                  await joined.attaching;
                  return;
                }
                let render = renderInstance;
                pruneDetachedClients();
                sendControlResponseSuccess(attachRequest, {
                  surfaces: [...attachedSurfaces()],
                });
                if (!joined.wasOnRoster) {
                  ensureClientConnected(joined.isFirstClient);
                  notifyPlacedRows();
                }
                if (joined.hasNewField) requestRender();
                if (!joined.wasOnRoster && hasBackdropSurface(attachMessage.surface))
                  burstBackdropRedraw(backdropState, false);
                panelModHold.noteShown();
                if (
                  fullscreenClients().some((client) => client.clientId === attachMessage.client_id) &&
                  renderInstance === render
                )
                  onPlacedRow(describeOpenPanes(paneRegistry().getState()));
                await joined.attaching;
              } catch (error) {
                sendControlErrorWithMeta(attachRequest, "ui_attach", error);
              }
            });
          } else if (message.request.subtype === "ui_detach") {
            let parsed = SDKUiDetachUiDetachMessageSchema().safeParse(message.request);
            if (!parsed.success) {
              sendControlError(
                message,
                "ui_detach: client_id must be 1-64 of letters, digits, . _ - (the colon is the engine's)",
              );
              continue;
            }
            let detachRequest = message;
            let detachMessage = parsed.data;
            handleControlRequestAsync(async () => {
              try {
                let any = clientRegistry.list().some((client) => client.clientId === detachMessage.client_id);
                if (any) {
                  surfaceDeclarationTracker.forget(detachMessage.client_id);
                  uiStatusSent ||= !canServeManifests(structuredIO.uiSurfaceChannel());
                  panelModHold.noteLeft();
                }
                let detached = raiseSessionDetach(detachMessage.client_id, "detach");
                pruneDetachedClients();
                sendControlResponseSuccess(detachRequest, {
                  detached: any,
                  surfaces: [...attachedSurfaces()],
                });
                await detached;
              } catch (error) {
                sendControlErrorWithMeta(detachRequest, "ui_detach", error);
              }
            });
          } else if (message.request.subtype === "ui_render") {
            let parsed = SDKUiRenderUiRenderMessageSchema().safeParse(message.request);
            if (!parsed.success) {
              sendControlError(
                message,
                'ui_render: surface must be "desktop", "mobile" or "vscode", component a render site name, instance_id a string, props an object, client_id (when given) 1-64 safe characters, viewport (when given) positive integer columns and rows with isFullscreen (when given) a boolean, and on_screen (when given) null or integers first <= last < of',
              );
              continue;
            }
            if (panelAttachOwed) {
              sendControlError(message, `${UNSUPPORTED_CONTROL_SUBTYPE_TEXT}: ui_render`);
              continue;
            }
            let renderRequest = message;
            let renderMessage = parsed.data;
            let surfaceKey = `${renderMessage.instance_id}#${renderMessage.bench?.seq ?? 0}`;
            logForDebugging(
              `BENCH ui_render key=${surfaceKey} rid=${renderRequest.request_id} C0=${Date.now()}`,
            );
            let abortController = createAbortController();
            handledOrphanedToolUseIds.get(renderRequest.request_id)?.abort();
            handledOrphanedToolUseIds.set(renderRequest.request_id, abortController);
            handleControlRequestAsync(async () => {
              try {
                let rendered = await renderPluginSurface(
                  {
                    request: renderMessage,
                    by: renderRequest,
                    signal: abortController.signal,
                  },
                  renderHooks,
                );
                if (abortController.signal.aborted) return;
                if (rendered === undefined) {
                  sendControlError(renderRequest, `${UNSUPPORTED_CONTROL_SUBTYPE_TEXT}: ui_render`);
                  return;
                }
                logForDebugging(
                  `BENCH ui_render key=${surfaceKey} rid=${renderRequest.request_id} C3=${Date.now()}`,
                );
                sendControlResponseSuccess(renderRequest, rendered);
              } catch (error) {
                if (!abortController.signal.aborted)
                  sendControlErrorWithMeta(renderRequest, "ui_render", error);
              } finally {
                if (handledOrphanedToolUseIds.get(renderRequest.request_id) === abortController)
                  handledOrphanedToolUseIds.delete(renderRequest.request_id);
                if (abortController.signal.aborted)
                  structuredIO.controlRequestEnded(renderRequest.request_id);
              }
            });
          } else if (message.request.subtype === "ui_press") {
            let parsed = SDKUiPressUiPressMessageSchema().safeParse(message.request);
            if (!parsed.success) {
              sendControlError(
                message,
                'ui_press: plugin must be a string, handle an integer, key (when given) a string, surface (when given) "desktop", "mobile" or "vscode" and href (when given) a string of at most 2048 characters',
              );
              continue;
            }
            let pressRequest = message;
            let pressMessage = parsed.data;
            handleControlRequestAsync(async () => {
              try {
                let pressed = await render.press({
                  plugin: pressMessage.plugin,
                  handle: pressMessage.handle,
                  ...(pressMessage.key !== undefined && {
                    element: pressMessage.key,
                  }),
                  surface: pressMessage.surface,
                  link:
                    pressMessage.href === undefined
                      ? undefined
                      : {
                          href: pressMessage.href,
                        },
                  ...(pressMessage.press_id !== undefined && {
                    pagePress: {
                      pressId: pressMessage.press_id,
                      clientId: pressMessage.client_id,
                    },
                  }),
                });
                if (pressed === undefined) {
                  sendControlResponseSuccess(pressRequest, {
                    handled: false,
                  });
                  return;
                }
                let pressResult =
                  pressMessage.render === undefined
                    ? undefined
                    : await renderPluginSurfaceWithRetry(pressMessage.render, pressRequest, renderHooks);
                sendControlResponseSuccess(pressRequest, {
                  handled: true,
                  element: pressed.element,
                  ...(pressResult !== undefined && {
                    drawn: pressResult,
                  }),
                });
              } catch (error) {
                sendControlErrorWithMeta(pressRequest, "ui_press", error);
              }
            });
          } else if (message.request.subtype === "ui_input") {
            let parsed = SDKUiInputUiInputMessageSchema().safeParse(message.request);
            if (!parsed.success) {
              sendControlError(
                message,
                'ui_input: plugin must be a string, handle an integer, kind "change" or "submit", value a string of at most 16384 characters, key (when given) a string, component (when given) a render site name, instance_id (when given) a string and surface (when given) "desktop", "mobile" or "vscode"',
              );
              continue;
            }
            let inputRequest = message;
            let inputMessage = parsed.data;
            handleControlRequestAsync(async () => {
              try {
                let inputted = await render.input({
                  plugin: inputMessage.plugin,
                  handle: inputMessage.handle,
                  surface: inputMessage.surface,
                  kind: inputMessage.kind,
                  value: inputMessage.value,
                  ...(inputMessage.key !== undefined && {
                    element: inputMessage.key,
                  }),
                  ...(inputMessage.component !== undefined && {
                    component: inputMessage.component,
                  }),
                  ...(inputMessage.instance_id !== undefined && {
                    requestId: inputMessage.instance_id,
                  }),
                });
                sendControlResponseSuccess(
                  inputRequest,
                  inputted === undefined
                    ? {
                        handled: false,
                      }
                    : {
                        handled: true,
                        element: inputted.element,
                        value: inputted.value,
                      },
                );
              } catch (error) {
                sendControlErrorWithMeta(inputRequest, "ui_input", error);
              }
            });
          } else if (message.request.subtype === "ui_prompt_edit") {
            let parsed = SDKUiPromptEditUiPromptEditMessageSchema().safeParse(message.request);
            if (!parsed.success) {
              sendControlError(
                message,
                'ui_prompt_edit: text must be a string of at most 1000000 characters, cursor an integer >= 0, key (when given) an object with key a string of 1-32 characters and ctrl, shift, meta each true when present, by (when given) "person" or "app", surface (when given) "desktop", "mobile" or "vscode" and client_id (when given) 1-64 of letters, digits, . _ -',
              );
              continue;
            }
            let promptRequest = message;
            let promptEditMessage = parsed.data;
            let scopeKey = promptEditMessage.client_id ?? defaultScopeKey(promptEditMessage.surface);
            let draft = {
              text: promptEditMessage.text,
              cursor: promptEditMessage.cursor,
            };
            handleControlRequestAsync(async () => {
              try {
                let promptResult =
                  promptEditMessage.by === "app"
                    ? REMOTE_EDIT_QUEUE.adopt(scopeKey, draft)
                    : await REMOTE_EDIT_QUEUE.edit({
                        clientKey: scopeKey,
                        box: draft,
                        ...(promptEditMessage.key !== undefined && {
                          key: promptEditMessage.key,
                        }),
                      });
                sendControlResponseSuccess(promptRequest, {
                  ...promptResult,
                });
              } catch (error) {
                sendControlErrorWithMeta(promptRequest, "ui_prompt_edit", error);
              }
            });
          } else if (message.request.subtype === "ui_prompt_autocomplete") {
            let parsed = SDKUiPromptAutocompleteUiPromptAutocompleteMessageSchema().safeParse(
              message.request,
            );
            if (!parsed.success) {
              sendControlError(
                message,
                'ui_prompt_autocomplete: text must be a string of at most 1000000 characters, cursor an integer >= 0, surface (when given) "desktop", "mobile" or "vscode" and client_id (when given) 1-64 of letters, digits, . _ -',
              );
              continue;
            }
            let autocompleteRequest = message;
            let promptAutocompleteMessage = parsed.data;
            handleControlRequestAsync(async () => {
              try {
                sendControlResponseSuccess(autocompleteRequest, {
                  ...(await REMOTE_AUTOCOMPLETE.ask(
                    promptAutocompleteMessage.client_id ?? defaultScopeKey(promptAutocompleteMessage.surface),
                    {
                      text: promptAutocompleteMessage.text,
                      cursor: promptAutocompleteMessage.cursor,
                    },
                  )),
                });
              } catch (error) {
                sendControlErrorWithMeta(autocompleteRequest, "ui_prompt_autocomplete", error);
              }
            });
          } else if (message.request.subtype === "ui_select") {
            let parsed = SDKUiSelectUiSelectMessageSchema().safeParse(message.request);
            if (!parsed.success) {
              sendControlError(
                message,
                'ui_select: plugin must be a string, handle an integer, value a string of at most 16384 characters, key (when given) a string, component (when given) a render site name, instance_id (when given) a string and surface (when given) "desktop", "mobile" or "vscode"',
              );
              continue;
            }
            let selectRequest = message;
            let selectMessage = parsed.data;
            handleControlRequestAsync(async () => {
              try {
                let selected = await render.select({
                  plugin: selectMessage.plugin,
                  handle: selectMessage.handle,
                  surface: selectMessage.surface,
                  value: selectMessage.value,
                  ...(selectMessage.key !== undefined && {
                    element: selectMessage.key,
                  }),
                  ...(selectMessage.component !== undefined && {
                    component: selectMessage.component,
                  }),
                  ...(selectMessage.instance_id !== undefined && {
                    requestId: selectMessage.instance_id,
                  }),
                });
                sendControlResponseSuccess(
                  selectRequest,
                  selected === undefined
                    ? {
                        handled: false,
                      }
                    : {
                        handled: true,
                        element: selected.element,
                        value: selected.value,
                      },
                );
              } catch (error) {
                sendControlErrorWithMeta(selectRequest, "ui_select", error);
              }
            });
          } else if (message.request.subtype === "ui_panes") {
            if (!SDKUiPanesUiPanesMessageSchema().safeParse(message.request).success) {
              sendControlError(message, "ui_panes: client_id (when given) 1-64 safe characters");
              continue;
            }
            try {
              sendControlResponseSuccess(
                message,
                describePanesForClient(describeOpenPanes(paneRegistry().getState())),
              );
            } catch (error) {
              sendControlErrorWithMeta(message, "ui_panes", error);
            }
          } else if (message.request.subtype === "ui_pane_show") {
            let parsed = SDKUiPaneShowUiPaneShowMessageSchema().safeParse(message.request);
            if (!parsed.success) {
              sendControlError(message, "ui_pane_show: id must be 1-64 of letters, digits, _ or -");
              continue;
            }
            try {
              let focusedId = paneRegistry().getState().focusedId;
              showPane(parsed.data.id);
              if (paneRegistry().getState().focusedId !== focusedId)
                syncOpenPanes(parsed.data.client_id ?? defaultScopeKey(parsed.data.surface));
              sendControlResponseSuccess(message, {
                shown_id: paneRegistry().getState().shownId,
              });
            } catch (error) {
              sendControlErrorWithMeta(message, "ui_pane_show", error);
            }
          } else if (message.request.subtype === "ui_pane_focus") {
            let parsed = SDKUiPaneFocusUiPaneFocusMessageSchema().safeParse(message.request);
            if (!parsed.success) {
              sendControlError(
                message,
                'ui_pane_focus: id must be null or 1-64 of letters, digits, _ or -, surface (when given) "desktop", "mobile" or "vscode"',
              );
              continue;
            }
            let paneFocusMessage = parsed.data;
            try {
              focusPane(paneFocusMessage.id);
              syncOpenPanes(paneFocusMessage.client_id ?? defaultScopeKey(paneFocusMessage.surface));
              sendControlResponseSuccess(message, {
                focused_id: paneRegistry().getState().focusedId,
              });
            } catch (error) {
              sendControlErrorWithMeta(message, "ui_pane_focus", error);
            }
          } else if (message.request.subtype === "ui_close") {
            let parsed = SDKUiCloseUiCloseMessageSchema().safeParse(message.request);
            if (!parsed.success) {
              sendControlError(message, "ui_close: id must be 1-64 of letters, digits, _ or -");
              continue;
            }
            let request = message;
            let id = parsed.data.id;
            let isOpen = () => allPanes(paneRegistry().getState()).some((pane) => pane.id === id);
            if (!isOpen()) {
              sendControlResponseSuccess(request, {
                closed: true,
              });
              continue;
            }
            handleControlRequestAsync(async () => {
              try {
                await closePane(id, {
                  kind: "person",
                });
                sendControlResponseSuccess(request, {
                  closed: !isOpen(),
                });
              } catch (error) {
                sendControlErrorWithMeta(request, "ui_close", error);
              }
            });
          } else if (message.request.subtype === "ui_scroll") {
            let parsed = SDKUiScrollUiScrollMessageSchema().safeParse(message.request);
            if (!parsed.success) {
              sendControlError(
                message,
                'ui_scroll: component must be "Pane" or "AbovePrompt", instance_id a string of at most 256 characters, offset, body_rows and content_rows non-negative integers, by an integer, pointer (when given) integer column and row, keyed (when given) at most 512 of {plugin, key, top, bottom}, surface (when given) "desktop", "mobile" or "vscode"',
              );
              continue;
            }
            let scrollRequest = message;
            let scrollMessage = parsed.data;
            handleControlRequestAsync(async () => {
              try {
                let scrolled = await handlePaneScrollRequest({
                  clientId: scrollMessage.client_id ?? defaultScopeKey(scrollMessage.surface),
                  component: scrollMessage.component,
                  requestId: scrollMessage.instance_id,
                  offset: scrollMessage.offset,
                  by: scrollMessage.by,
                  bodyRows: scrollMessage.body_rows,
                  contentRows: scrollMessage.content_rows,
                  ...(scrollMessage.pointer !== undefined && {
                    pointer: scrollMessage.pointer,
                  }),
                  ...(scrollMessage.keyed !== undefined && {
                    keyed: scrollMessage.keyed,
                  }),
                });
                sendControlResponseSuccess(scrollRequest, {
                  moved: scrolled.result.deny === undefined,
                  offset: scrolled.offset,
                  ...(scrolled.result.deny !== undefined && {
                    deny: scrolled.result.deny,
                  }),
                  ...(scrolled.isFollowingEnd && {
                    follow_end: true,
                  }),
                });
              } catch (error) {
                sendControlErrorWithMeta(scrollRequest, "ui_scroll", error);
              }
            });
          } else if (message.request.subtype === "ui_focus") {
            let parsed = SDKUiFocusUiFocusMessageSchema().safeParse(message.request);
            if (!parsed.success) {
              sendControlError(
                message,
                'ui_focus: component must be "Pane" or "AbovePrompt", instance_id a string of at most 256 characters, is_held a boolean, element (when given) null or {plugin, key} of at most 256 characters each, by (when given) "person" or "auto", surface (when given) "desktop", "mobile" or "vscode"',
              );
              continue;
            }
            let focusRequest = message;
            let paneFocusMsg = parsed.data;
            handleControlRequestAsync(async () => {
              try {
                let focused = await handlePaneFocusRequest({
                  clientId: paneFocusMsg.client_id ?? defaultScopeKey(paneFocusMsg.surface),
                  component: paneFocusMsg.component,
                  requestId: paneFocusMsg.instance_id,
                  isHeld: paneFocusMsg.is_held,
                  ...(paneFocusMsg.element !== undefined && {
                    element: paneFocusMsg.element,
                  }),
                  by: paneFocusMsg.by,
                });
                sendControlResponseSuccess(focusRequest, {
                  moved: focused.result.deny === undefined,
                  element: focused.element,
                  ...(focused.result.deny !== undefined && {
                    deny: focused.result.deny,
                  }),
                });
              } catch (error) {
                sendControlErrorWithMeta(focusRequest, "ui_focus", error);
              }
            });
          } else if (message.request.subtype === "ui_client_module") {
            let parsed = SDKUiClientModuleUiClientModuleMessageSchema().safeParse(message.request);
            if (!parsed.success) {
              sendControlError(message, "ui_client_module: plugin must be a string");
              continue;
            }
            try {
              let moduleResult = render.clientModule(parsed.data.plugin);
              if (moduleResult === undefined)
                sendControlError(
                  message,
                  `ui_client_module: plugin ${sanitizeTelemetryString(parsed.data.plugin)} is not loaded or its hooks module names no surface module`,
                );
              else sendControlResponseSuccess(message, moduleResult);
            } catch (error) {
              sendControlErrorWithMeta(message, "ui_client_module", error);
            }
          } else if (message.request.subtype === "ui_client_press") {
            let parsed = SDKUiClientPressUiClientPressMessageSchema().safeParse(message.request);
            if (!parsed.success) {
              sendControlError(
                message,
                'ui_client_press: plugin, instance_id, client, module and element must be strings, component a render site name, and event {type: "press"} | {type: "input", kind, value} | {type: "select", value}',
              );
              continue;
            }
            let clientPressRequest = message;
            let clientPressMessage = parsed.data;
            handleControlRequestAsync(async () => {
              try {
                let pressed = await render.clientPress({
                  plugin: clientPressMessage.plugin,
                  component: clientPressMessage.component,
                  requestId: clientPressMessage.instance_id,
                  key: clientPressMessage.client,
                  module: clientPressMessage.module,
                  element: clientPressMessage.element,
                  event: clientPressMessage.event,
                });
                sendControlResponseSuccess(
                  clientPressRequest,
                  pressed === undefined
                    ? {
                        handled: false,
                      }
                    : {
                        handled: true,
                        ...(pressed.reached !== undefined && {
                          reached: pressed.reached,
                        }),
                      },
                );
              } catch (error) {
                sendControlErrorWithMeta(clientPressRequest, "ui_client_press", error);
              }
            });
          } else if (message.request.subtype === "ui_message") {
            let parsed = SDKUiMessageUiMessageMessageSchema().safeParse(message.request);
            if (!parsed.success) {
              sendControlError(
                message,
                "ui_message: plugin, instance_id, client and module must be strings, component a render site name, and data present (plain JSON)",
              );
              continue;
            }
            let clientMessageRequest = message;
            let clientMessage = parsed.data;
            handleControlRequestAsync(async () => {
              try {
                let delivered = await render.clientMessage({
                  plugin: clientMessage.plugin,
                  component: clientMessage.component,
                  requestId: clientMessage.instance_id,
                  key: clientMessage.client,
                  module: clientMessage.module,
                  data: clientMessage.data,
                });
                sendControlResponseSuccess(
                  clientMessageRequest,
                  delivered === undefined
                    ? {
                        handled: false,
                      }
                    : {
                        handled: true,
                        ...(delivered.props !== undefined && {
                          props: delivered.props,
                        }),
                      },
                );
              } catch (error) {
                sendControlErrorWithMeta(clientMessageRequest, "ui_message", error);
              }
            });
          } else if (message.request.subtype === "ui_client_fault") {
            let request = message;
            handleControlRequestAsync(async () => {
              try {
                sendControlResponseSuccess(request, await handleClientFault(request.request));
              } catch (error) {
                sendControlErrorWithMeta(request, "ui_client_fault", error);
              }
            });
          } else if (message.request.subtype === "get_workspace_diff") {
            let request = message;
            handleControlRequestAsync(async () => {
              try {
                let { buildWorkspaceDiffResponse } = await import("../bridge/workspaceDiff.js");
                sendControlResponseSuccess(
                  request,
                  await buildWorkspaceDiffResponse(session.host, getAppState().toolPermissionContext),
                );
              } catch (error) {
                sendControlErrorWithMeta(request, "get_workspace_diff", error);
              }
            });
          } else if (message.request.subtype === "get_plan")
            try {
              let { peekPlanSlug, getPlanAsync, getPlanFilePath, notePlanFileForgotten } =
                await import("../utils/plans.js");
              let planSlug = peekPlanSlug();
              if (planSlug !== undefined) notePlanFileForgotten(getPlanFilePath());
              let stagedRows =
                planSlug !== undefined ? await getPlanAsync(undefined, options.storageV5) : null;
              sendControlResponseSuccess(
                message,
                stagedRows !== null
                  ? {
                      exists: true,
                      content: stagedRows,
                      ...(isTransportBacked(session)
                        ? {}
                        : {
                            path: getPlanFilePath(),
                          }),
                    }
                  : {
                      exists: false,
                    },
              );
            } catch (error) {
              sendControlErrorWithMeta(message, "get_plan", error);
            }
          else if (message.request.subtype === "stage_file") {
            let request = message.request;
            let noteRead = options.homeSeed?.record.noteStagedRowRead(request);
            if (noteRead !== undefined)
              logEvent("tengu_home_seed_announcement_read", {
                on_record: noteRead.onRecord,
                epoch_gt1: isWorkerEpochAfterFirst(env.CLAUDE_CODE_WORKER_EPOCH),
                ...(noteRead.onRecord && {
                  ordinal: noteRead.ordinal,
                  behind_ms: noteRead.behindMs,
                  turns_at_hold_before: noteRead.turnsAtHoldBefore,
                  turn_at_hold_meanwhile: noteRead.turnAtHoldMeanwhile,
                }),
              });
            let filestorePath = request.filestore_path
              ? undefined
              : stagedFilesWaiter.begin(
                  isStagedHomeMountPath(request.mount_path),
                  request.mount_path,
                  request.resync === true,
                );
            handleControlRequestAsync(async () => {
              let content;
              let hasContent = true;
              try {
                let { stageFile, stageFileWireResult } = await import("../utils/stageFile.js");
                let { sameStandingFlag } = await import("../utils/stageFileStoreCheck.js");
                content = stageWaitTimeoutFor(request.mount_path);
                let { recordStagedOutputAsRead } = await import("../utils/recordStagedOutputAsRead.lazy.js");
                let currentAppState = repoRootErrorTone();
                let readFailure;
                try {
                  readFailure = await stageFile(
                    request,
                    undefined,
                    await waitForHomeFilesFlag(request.mount_path),
                    message.request_id,
                    sameStandingFlag(),
                  );
                  content = readFailure.ok
                    ? undefined
                    : stageWaitTimeoutFor(request.mount_path, readFailure.permanent);
                  hasContent = !readFailure.ok && (classifyStageWriteError(readFailure.error) ?? true);
                  if (readFailure.ok && readFailure.outputPath !== undefined) {
                    let outcome = await recordStagedOutputAsRead(readFileState, readFailure.outputPath);
                    logForDiagnosticsNoPII("info", "stage_file_output_read_state", {
                      outcome,
                    });
                  }
                } finally {
                  currentAppState();
                }
                if (readFailure.ok) sendControlResponseSuccess(message, stageFileWireResult(readFailure));
                else {
                  controlError("stage_file", readFailure.error);
                  sendControlError(
                    message,
                    sanitizeMcpResourceError(readFailure.error) ??
                      pickForTransport(session, readFailure.error, "stage_file failed"),
                  );
                }
              } catch (error) {
                sendControlErrorWithMeta(message, "stage_file", error);
              } finally {
                filestorePath?.(content, hasContent);
              }
            });
          } else if (message.request.subtype === "register_repo_root") {
            let request = message.request;
            handleControlRequestAsync(() => handleRepoRoot(message, request));
          } else if (message.request.subtype === "add_directory") {
            let request = message.request;
            handleControlRequestAsync(async () => {
              let currentAppState = repoRootErrorTone();
              try {
                await handleStageFile(message, request);
              } finally {
                currentAppState();
              }
            });
          } else if (message.request.subtype === "file_suggestions")
            try {
              let { generateFileSuggestionsWithBase, globalFileIndexCache } =
                await import("../hooks/fileSuggestions.js");
              let { items, baseDir } = await generateFileSuggestionsWithBase(
                globalFileIndexCache,
                message.request.query,
                true,
                options.storageV5,
              );
              let readBaseDir = isTransportBacked(session) ? undefined : baseDir;
              sendControlResponseSuccess(message, {
                suggestions: items.map((item) => ({
                  path: item.displayText,
                })),
                ...(readBaseDir !== undefined && {
                  cwd: readBaseDir,
                }),
              });
            } catch (error) {
              sendControlErrorWithMeta(message, "file_suggestions", error);
            }
          else if (message.request.subtype === "seed_read_state") {
            try {
              let fullPath = expandPath(message.request.path);
              let vet = vetPathSpellingsOrChain(
                message.request.path,
                fullPath,
                getAppState().toolPermissionContext.trustedNetworkDirectories,
              );
              if (!(
                !vet.ok ||
                vet.pathsToCheck.some(
                  (spelling) =>
                    !isPathAllowed(spelling, getAppState().toolPermissionContext, "read").allowed ||
                    matchingRuleForInput(spelling, getAppState().toolPermissionContext, "read", "deny") !==
                      null ||
                    matchingRuleForInput(spelling, getAppState().toolPermissionContext, "read", "ask") !==
                      null,
                )
              )) {
                let { REMOTE_READ_OPEN_FLAGS, isCanonicalPathContained } =
                  await import("../services/remoteTools/remoteFileRead.js");
                let { bindCanonicalPathToHandle, readHandleBounded } =
                  await import("../utils/fsSafety/boundOpen.js");
                let handle = await open(fullPath, REMOTE_READ_OPEN_FLAGS);
                try {
                  let stats = await handle.stat({
                    bigint: true,
                  });
                  let floored = Math.floor(Number(stats.mtimeMs));
                  let maxBytes = 10485760;
                  if (stats.isFile() && stats.size <= BigInt(10485760) && floored <= message.request.mtime) {
                    let handleBounded = await readHandleBounded(handle, 10485760, stats.size);
                    let realPath = await realpath(fullPath);
                    let boundPath = await bindCanonicalPathToHandle(handle, stats, realPath);
                    let readResult =
                      boundPath !== undefined &&
                      (await isCanonicalPathContained(boundPath, getAppState().toolPermissionContext));
                    if (!(
                      handleBounded.overLimit ||
                      boundPath === undefined ||
                      !readResult ||
                      pathVettingReason(
                        boundPath,
                        getAppState().toolPermissionContext.trustedNetworkDirectories,
                      ) !== undefined ||
                      !isPathAllowed(boundPath, getAppState().toolPermissionContext, "read").allowed ||
                      matchingRuleForInput(boundPath, getAppState().toolPermissionContext, "read", "deny") !==
                        null ||
                      matchingRuleForInput(boundPath, getAppState().toolPermissionContext, "read", "ask") !==
                        null
                    )) {
                      let content = stripBomAndCarriageReturn(handleBounded.bytes.toString("utf-8"));
                      pendingSeeds.set(fullPath, {
                        content,
                        timestamp: floored,
                        offset: undefined,
                        limit: undefined,
                        contentNotInModelContext: true,
                      });
                    }
                  }
                } finally {
                  await handle.close();
                }
              }
            } catch {}
            sendControlResponseSuccess(message);
          } else if (message.request.subtype === "mcp_set_servers") {
            let servers = message.request.servers;
            if (
              typeof servers !== "object" ||
              servers === null ||
              Array.isArray(servers) ||
              Object.values(servers).some(
                (agent) => agent === null || typeof agent !== "object" || Array.isArray(agent),
              )
            ) {
              sendControlError(message, SERVERS_OBJECT_REQUIRED_TEXT);
              continue;
            }
            if (bindingChangedHint !== null && message.request.hint === bindingChangedHint) {
              projectsMount?.sync("binding_changed");
              if (Object.keys(message.request.servers).length === 0) {
                sendControlResponseSuccess(message, {
                  added: [],
                  removed: [],
                  errors: {},
                });
                continue;
              }
            }
            let startMs = performance.now();
            let mainThreadRequested = session.requestJournal.mainThreadRequestedInProcess();
            let { servers: servers_2 } = message.request;
            let switchAtRequest = unknownResponseHold.takesNext();
            let setServersFromRequest = () =>
              applySdkServerSet(
                filterObject(servers_2, (key, value) => !isPrototypeKey(value)),
                {
                  authoritative: true,
                  caller: "mcp_set_servers",
                  dialOptions: {
                    toolsListAhead: true,
                  },
                },
              );
            let response = (appliedSet) => {
              let { sdkServersChanged } = appliedSet;
              let installOptions = {
                ...appliedSet.response,
                errors: {
                  ...Object.fromEntries(
                    Object.keys(servers_2)
                      .filter(isPrototypeKey)
                      .map((key) => [key, reservedServerNameMessage(key)]),
                  ),
                  ...appliedSet.response.errors,
                },
              };
              let shouldSanitize = mayPersistOnHost(session);
              if (shouldSanitize && Object.keys(installOptions.errors).length > 0)
                logForDebugging(`mcp_set_servers errors: ${jsonStringify(installOptions.errors)}`, {
                  level: "error",
                });
              sendControlResponseSuccess(message, {
                ...installOptions,
                errors: sanitizeMcpStatusMap(shouldSanitize, installOptions.errors),
              });
              recordInlineMcpSetServers(initJsonSchema, {
                startMs,
                answeredMs: performance.now(),
                heldLoop: !switchAtRequest,
                mainThreadRequested,
                relayMarked,
                response: installOptions,
              });
              if (sdkServersChanged) serializedRedialAll();
            };
            if (switchAtRequest)
              detached = unknownResponseHold.run(
                () => setServersFromRequest().then(response),
                markControlCompleted,
              );
            else {
              readSwitchAtReconnect = BesideLoopRequestQueue.readSwitch();
              response(await setServersFromRequest());
            }
          } else if (message.request.subtype === "reload_plugins") {
            let reloadResult;
            try {
              let readAgents = () =>
                getActiveAgentsFromList(agents).map((agent) => ({
                  name: agent.agentType,
                  description: agent.whenToUse,
                  model: agent.model,
                }));
              if (message.request.hold_on_cache_impact && !startupReleased && pluginCache === undefined)
                pluginCache = await loadAllPluginsCacheOnly(options.storageV5, options.credentials);
              if (isNonEmptyValue(message.request.add_plugins)) {
                let added = await handleReloadPluginsAddPlugins({
                  addPlugins: message.request.add_plugins,
                  fromOffMachine: mayTransportPersist(session),
                });
                if (added.kind === "refused") {
                  logFeatureBad("sdk_reload_add_plugins", added.code);
                  sendControlError(message, added.message);
                  continue;
                }
                reloadResult = added;
              }
              let installTimeoutMs = isPluginsSyncLive(session) ? pluginInstallTimeoutMs() : undefined;
              deadlineMs = installTimeoutMs;
              await Promise.all([
                reconcileMarketplacesOnReload({
                  admission: options.pluginForwardingAdmission,
                  readFlag: isCloudPluginForwardingFlagOn,
                  flagWaitCapMs: PLUGIN_INSTALL_WAIT_MS,
                  install: (pluginName) =>
                    waitForRemoteManagedSettingsToLoad().then(() =>
                      installPluginsForHeadlessSerialized(pluginName, options.storageV5, options.credentials),
                    ),
                  installTimeoutMs: pluginInstallTimeoutMs(),
                  onLateEnd: (pluginName) => {
                    logLateInstallPass(pluginName);
                    turnStartChecks.noteLateForwardedInstall();
                  },
                  now: () => performance.now(),
                }).then((result) => {
                  logMarketplaceReconcile(result);
                  if (!result.ran && result.reason === "flag_off") retractInlineFlagSettings("reload");
                }),
                installTimeoutMs === undefined
                  ? undefined
                  : withDeadline(
                      Promise.allSettled([rerunPluginsSync(session, options.credentials)]),
                      installTimeoutMs,
                    ).then((plugins) => {
                      timedOut = plugins === undefined;
                    }),
              ]);
              invalidateCommandNames();
              let refreshed;
              if (message.request.hold_on_cache_impact) {
                let impact = await computePluginReloadImpact({
                  model: activeModel() ?? getMainLoopModel(),
                  mcpClients: getAppState().mcp.clients,
                  dynamicMcpConfig: computeDynamicMcpConfig(),
                  storageV5: options.storageV5,
                  credentials: options.credentials,
                });
                logReloadPluginsImpact(impact, {
                  warned: impact.wouldInvalidateCache,
                  forced: false,
                });
                if (impact.wouldInvalidateCache) {
                  if (reloadResult) {
                    reloadResult.restore();
                    reloadResult = undefined;
                    logFeatureSad("sdk_reload_add_plugins", "held");
                  }
                  getSyncedPluginReloadDebt().holdReload();
                  let inFlight = startupReleased
                    ? getAppState().plugins
                    : (pluginCache ?? {
                        enabled: [],
                        errors: [],
                      });
                  sendControlResponseSuccess(message, {
                    commands: toSlashCommands(otherCommands()),
                    agents: readAgents(),
                    plugins: emptyIfTransport(session, inFlight.enabled.map(toPluginInitInfo)),
                    mcpServers: describeMcpServersForStatus(controlContext),
                    error_count: inFlight.errors.length,
                    held: true,
                    cache_impact: {
                      mcp_servers_added: impact.mcpServersAdded,
                      mcp_servers_removed: impact.mcpServersRemoved,
                      lsp_tool_change: impact.lspToolChange,
                    },
                  });
                  continue;
                }
                refreshed = false;
              }
              retryUnloadedModules();
              let reloadsCompleted = getSyncedPluginReloadDebt().reloadsCompleted;
              let refreshedPlugins = await refreshActivePlugins(
                pluginsStateStore,
                options.storageV5,
                options.credentials,
              );
              startupReleased = true;
              if (reloadResult) {
                reloadResult = undefined;
                logFeatureOk("sdk_reload_add_plugins");
              }
              replaceCommandsFromFlags(refreshedPlugins.agentDefinitions.allAgents);
              let plugins = [];
              let [agentsResult, commandsResult, skillsResult] = await Promise.allSettled([
                getCommands(cwd(), options.storageV5),
                applyPluginServers(connectedNonDynamicServers(), "reload_plugins"),
                loadAllPluginsCacheOnly(options.storageV5, options.credentials),
              ]);
              if (agentsResult.status === "fulfilled") {
                sdkServersList = getNonInteractiveCommands(agentsResult.value);
                notifyAgentsChanged();
              } else logError(agentsResult.reason);
              if (commandsResult.status === "rejected")
                logForDebugging(
                  `reload_plugins: applyPluginMcpDiff failed: ${errorMessage(commandsResult.reason)}`,
                  {
                    level: "error",
                  },
                );
              else turnStartChecks.noteReloadedByHost(reloadsCompleted);
              if (skillsResult.status === "fulfilled")
                plugins = emptyIfTransport(session, skillsResult.value.enabled.map(toPluginInitInfo));
              else
                logError(
                  withTelemetryMessage(toError(skillsResult.reason), "reload_plugins: loadAllPlugins failed"),
                );
              queueDeferred();
              sendControlResponseSuccess(message, {
                commands: toSlashCommands(otherCommands()),
                agents: readAgents(),
                plugins,
                mcpServers: describeMcpServersForStatus(controlContext),
                error_count: refreshedPlugins.error_count,
                ...(refreshed !== undefined && {
                  held: refreshed,
                }),
              });
            } catch (error) {
              if (reloadResult) {
                reloadResult.restore();
                logFeatureBad("sdk_reload_add_plugins", "refresh_failed");
              }
              sendControlErrorWithMeta(message, "reload_plugins", error);
            }
          } else if (message.request.subtype === "reload_skills")
            try {
              if (isSkillsSyncActive(session)) {
                deadlineMs = installWaitTimeoutMs();
                timedOut =
                  (await Promise.race([
                    Promise.allSettled([reloadSyncedSkills(session, options.storageV5, options.credentials)]),
                    sleep(deadlineMs),
                  ])) === undefined;
              }
              refreshSkillsSyncVeto();
              await refreshCurrentCommands();
              sendControlResponseSuccess(
                message,
                listSkillsForSdk(
                  await getSkillToolCommands(getOriginalCwd(), options.storageV5),
                  getAppState().mcp.commands,
                  sdkServersList,
                ),
              );
            } catch (error) {
              sendControlErrorWithMeta(message, "reload_skills", error);
            }
          else if (message.request.subtype === "mcp_call") {
            let { tool, arguments: toolArgs } = message.request;
            handledOrphanedToolUseIds.get(message.request_id)?.abort();
            handledOrphanedToolUseIds.delete(message.request_id);
            if (typeof tool !== "string") {
              sendControlError(message, "mcp_call: tool must be a string");
              continue;
            }
            let toolInfo = mcpInfoFromString(tool);
            let refusal = toolInfo?.toolName ? mcpCallRefusalFor(toolInfo) : undefined;
            if (!toolInfo || !toolInfo.toolName)
              sendControlError(
                message,
                `Not a fully-qualified MCP tool name: ${sanitizeTelemetryString(tool)}`,
              );
            else if (refusal !== undefined) sendControlError(message, refusal);
            else {
              let callContext =
                message.request.input_files !== undefined ||
                message.request.output_files !== undefined ||
                message.request.expires_at !== undefined ||
                message.request.timeout_ms !== undefined;
              let expiresAt =
                typeof message.request.expires_at === "string" ? message.request.expires_at : undefined;
              let toolName = toolInfo.toolName;
              let notForModel = message.request.result_not_for_model === true;
              let callOptions =
                notForModel &&
                persistsWithoutRedaction({
                  redactsWhatItPersists: isTransportBacked(session),
                  isRemoteTransport: structuredIO.isRemoteTransport(),
                });
              if (notForModel && !callOptions)
                logFeatureSad("mcp_call_result_not_for_model", "ignored_on_lane");
              runControl(async () => {
                if (abortController.signal.aborted) return;
                let callTone = repoRootErrorTone();
                let childAbortController = createChildAbortController(abortController);
                handledOrphanedToolUseIds.set(message.request_id, childAbortController);
                let stillWanted = () =>
                  handledOrphanedToolUseIds.get(message.request_id) === childAbortController;
                let isAborted = () => abortController.signal.aborted || !stillWanted();
                try {
                  if (callContext && !getFeatureValue_CACHED_MAY_BE_STALE("tengu_ptc_enabled", true)) {
                    logFeatureBad("ccr_mcp_call_staged", "kill_switch");
                    sendControlError(message, "staged mcp_call is disabled");
                    return;
                  }
                  let toolResult = await waitForServer(
                    toolInfo.serverName,
                    expiresAt,
                    childAbortController.signal,
                  );
                  if (isAborted()) return;
                  if (!toolResult) {
                    if (childAbortController.signal.aborted) {
                      sendControlError(
                        message,
                        `mcp_call cancelled by client: ${sanitizeTelemetryString(toolInfo.serverName)}`,
                      );
                      return;
                    }
                    if (callContext) logFeatureBad("ccr_mcp_call_staged", "not_connected");
                    sendControlError(
                      message,
                      `MCP server not connected: ${sanitizeTelemetryString(toolInfo.serverName)}`,
                    );
                    return;
                  }
                  let refusal = remoteBrowserRefusal(toolResult.name);
                  if (refusal !== undefined) {
                    sendControlError(message, refusal);
                    return;
                  }
                  if (toolResult.config.type === "sdk") {
                    sendControlError(
                      message,
                      "mcp_call does not support SDK MCP servers. " +
                        `SDK servers are caller-provided \u2014 invoke ${sanitizeTelemetryString(toolInfo.serverName)} directly.`,
                    );
                    return;
                  }
                  let tool_2 =
                    [...getAppState().mcp.tools, ...dynamicMcpState.tools].find((resolve) =>
                      matchesToolName(resolve, tool),
                    )?.mcpInfo?.toolName ?? toolName;
                  if (callContext) {
                    let { runStagedMcpCall } = await import("../services/ccrMcp/stagedMcpCall.js");
                    let resultTooLarge = false;
                    let { staging, tool } = await runStagedMcpCall(message.request, {
                      signal: childAbortController.signal,
                      call: async (args, signal) => {
                        if (isMcpServerBlockedAtConnectTime(toolResult.name, toolResult.config))
                          return {
                            isError: true,
                            content: [
                              {
                                type: "text",
                                text: `MCP server not connected: ${sanitizeTelemetryString(toolInfo.serverName)}`,
                              },
                            ],
                          };
                        let refusal = remoteBrowserRefusal(toolResult.name);
                        if (refusal !== undefined)
                          return {
                            isError: true,
                            content: [
                              {
                                type: "text",
                                text: refusal,
                              },
                            ],
                          };
                        let result;
                        try {
                          result = await getMcpClientModule().callMCPToolWithUrlElicitationRetry({
                            client: toolResult,
                            clientConnection: toolResult,
                            callToolFn: (url) =>
                              guardRemoteBrowserMcpCall(getMcpClientModule().callMCPTool, url),
                            tool: tool_2,
                            args,
                            imageLimits: IMAGE_LIMITS,
                            signal,
                            requestDialog: undefined,
                            storageV5: options.storageV5,
                            credentials: options.credentials,
                            disallowTasks: true,
                            resultNotForModel: callOptions,
                          });
                        } catch (error) {
                          if (error instanceof McpAuthError)
                            mcpConnectionStore.markNeedsAuth(error.serverName);
                          if (error instanceof McpSessionExpiredError) {
                            logFeatureBad("mcp_session_recovery", "session_expired_no_retry");
                            return {
                              isError: true,
                              content: [
                                {
                                  type: "text",
                                  text: mcpConnectionClosedMessage({
                                    serverName: toolInfo.serverName,
                                    error,
                                    namesMcpCall: false,
                                    detail: error.message,
                                  }),
                                },
                              ],
                            };
                          }
                          throw error;
                        }
                        if (result.urlElicitationDeclined !== undefined)
                          return {
                            isError: true,
                            content: [
                              {
                                type: "text",
                                text: `URL elicitation required (open URL, then retry): ${sanitizeRelayUrl(result.urlElicitationDeclined.url) ?? "[elicitation URL too long to relay \u2014 re-run this call in the terminal]"}`,
                              },
                            ],
                          };
                        if (callOptions && isMcpCallResultTooLarge(result)) {
                          resultTooLarge = true;
                          return {
                            isError: true,
                            content: [
                              {
                                type: "text",
                                text: MCP_CALL_RESULT_TOO_LARGE_TEXT,
                              },
                            ],
                          };
                        }
                        return {
                          isError: result.isError === true,
                          content: result.content,
                          structuredContent: result.structuredContent,
                          _meta: result._meta,
                        };
                      },
                    });
                    if (isAborted()) return;
                    if (callOptions && staging.ok) logFeatureOk("mcp_call_result_not_for_model");
                    else if (resultTooLarge) logFeatureBad("mcp_call_result_not_for_model", "too_large");
                    sendControlResponseSuccess(message, {
                      content: tool?.content,
                      structuredContent: tool?.structuredContent,
                      _meta: stripAnthropicMeta(tool?._meta),
                      staging,
                    });
                    return;
                  }
                  let callResult = await getMcpClientModule().callMCPToolWithUrlElicitationRetry({
                    client: toolResult,
                    clientConnection: toolResult,
                    callToolFn: (submit) =>
                      guardRemoteBrowserMcpCall(getMcpClientModule().callMCPTool, submit),
                    tool: tool_2,
                    args: toolArgs ?? {},
                    imageLimits: IMAGE_LIMITS,
                    signal: childAbortController.signal,
                    requestDialog: undefined,
                    storageV5: options.storageV5,
                    credentials: options.credentials,
                    disallowTasks: true,
                    resultNotForModel: callOptions,
                  });
                  if (isAborted()) return;
                  if (callResult.urlElicitationDeclined)
                    sendControlError(
                      message,
                      `URL elicitation required (open URL, then retry mcp_call): ${sanitizeRelayUrl(callResult.urlElicitationDeclined.url) ?? "[elicitation URL too long to relay \u2014 re-run this call in the terminal]"}` +
                        (typeof callResult.content === "string"
                          ? ` \u2014 ${pickForTransport(session, callResult.content, "(detail withheld)")}`
                          : ""),
                    );
                  else if (callResult.interrupted)
                    sendControlError(
                      message,
                      `mcp_call cancelled by client: ${sanitizeTelemetryString(toolInfo.serverName)}`,
                    );
                  else if (callOptions && isMcpCallResultTooLarge(callResult)) {
                    logFeatureBad("mcp_call_result_not_for_model", "too_large");
                    sendControlError(message, MCP_CALL_RESULT_TOO_LARGE_TEXT);
                  } else {
                    if (callOptions) logFeatureOk("mcp_call_result_not_for_model");
                    sendControlResponseSuccess(message, {
                      content: callResult.content,
                      structuredContent: callResult.structuredContent,
                      _meta: stripAnthropicMeta(callResult._meta),
                    });
                  }
                } catch (error) {
                  if (isAborted()) return;
                  if (callContext) logFeatureBad("ccr_mcp_call_staged", "dispatch_failed");
                  if (error instanceof McpAuthError) mcpConnectionStore.markNeedsAuth(error.serverName);
                  controlError("mcp_call", error instanceof Error ? error.message : String(error));
                  let wireResult = pickForTransport(
                    session,
                    error instanceof Error ? error.message : String(error),
                    "(detail withheld)",
                  );
                  if (error instanceof McpAuthError) {
                    wireResult = `MCP server ${sanitizeTelemetryString(error.serverName)} requires authentication \u2014 send mcp_authenticate and retry mcp_call: ${sanitizeTelemetryString(wireResult)}`;
                    sendControlError(message, wireResult.slice(0, 2000).replace(/[\uD800-\uDBFF]$/, ""));
                  } else if (error instanceof McpSessionExpiredError) {
                    logFeatureBad("mcp_session_recovery", "session_expired_no_retry");
                    wireResult = mcpConnectionClosedMessage({
                      serverName: toolInfo.serverName,
                      error,
                      namesMcpCall: true,
                      detail: wireResult,
                    });
                    sendControlError(message, wireResult.slice(0, 2000).replace(/[\uD800-\uDBFF]$/, ""));
                  } else if (error instanceof McpToolResultNotReadError) {
                    let prefix = sanitizeTelemetryString(toolInfo.serverName);
                    let why = error.why;
                    let response;
                    switch (why.kind) {
                      case "too_large":
                        response = `MCP server ${prefix} sent a response over Claude Code's ${Math.round(why.capBytes / 1024 / 1024)} MB limit, so this mcp_call got no result. The server may have run the tool, so check whether the call took effect before retrying mcp_call, and ask the tool for a smaller result if you retry.`;
                        break;
                      case "connection_closed":
                        response = `MCP server ${prefix} sent a message that was too large or could not be parsed, so Claude Code closed the connection and this mcp_call got no result. The server may have run the tool, so check whether the call took effect before retrying mcp_call.`;
                        break;
                    }
                    sendControlError(message, response.slice(0, 2000).replace(/[\uD800-\uDBFF]$/, ""));
                  } else if (getMcpErrorClassificationModule().isUrlElicitationRequiredMcpError(error)) {
                    let urls = getMcpClientModule()
                      .extractUrlElicitationsFromMcpError(error)
                      .map((prev) => prev.url);
                    let replaced = wireResult.slice(0, 2000).replace(/[\uD800-\uDBFF]$/, "");
                    wireResult =
                      urls.length > 0
                        ? `URL elicitation required (open URL, then retry mcp_call): ${formatElicitationUrls(urls)} \u2014 ${replaced}`
                        : `URL elicitation required (no URL in error data): ${replaced}`;
                    sendControlError(message, wireResult);
                  } else sendControlError(message, wireResult.slice(0, 2000).replace(/[\uD800-\uDBFF]$/, ""));
                } finally {
                  callTone();
                  if (stillWanted()) handledOrphanedToolUseIds.delete(message.request_id);
                  else if (!abortController.signal.aborted)
                    structuredIO.controlRequestEnded(message.request_id);
                }
              });
            }
          } else if (message.request.subtype === "set_chrome_browser_hints") {
            if (!structuredIO.isRemoteTransport()) {
              sendControlError(
                message,
                "set_chrome_browser_hints is only accepted in a remote-hosted session",
              );
              continue;
            }
            let parsed = SDKSetChromeBrowserHintsSetChromeBrowserHintsMessageSchema().safeParse(
              message.request,
            );
            if (!parsed.success) {
              sendControlError(
                message,
                `Invalid set_chrome_browser_hints: ${parsed.error.issues[0]?.message ?? "malformed"}`,
              );
              continue;
            }
            try {
              let { setChromeBrowserHints } = await import("../utils/claudeInChrome/browserHints.js");
              setChromeBrowserHints({
                preferredDeviceId: parsed.data.preferredDeviceId ?? undefined,
                localDeviceIds: parsed.data.localDeviceIds,
                hostPlatform: parsed.data.hostPlatform,
              });
              sendControlResponseSuccess(message);
            } catch (error) {
              sendControlErrorWithMeta(message, "set_chrome_browser_hints", error);
            }
          } else if (message.request.subtype === "set_prompt_suggestions_paused") {
            let parsed = SDKSetPromptSuggestionsPausedSetPromptSuggestionsPausedMessageSchema().safeParse(
              message.request,
            );
            if (!parsed.success) {
              sendControlError(
                message,
                `Invalid set_prompt_suggestions_paused: ${parsed.error.issues[0]?.message ?? "malformed"}`,
              );
              continue;
            }
            promptSuggestionEmitter.setPaused(parsed.data.paused);
            sendControlResponseSuccess(message);
          } else if (message.request.subtype === "channel_enable") {
            let state = getAppState();
            handleChannelEnable(
              message.request_id,
              message.request.serverName,
              [...state.mcp.clients, ...clients_3, ...dynamicMcpState.clients],
              output,
              messageQueue,
            );
          } else if (message.request.subtype === "mcp_authenticate") {
            let { serverName, redirectUri, redirectUriOnly, liveReply } = message.request;
            let config =
              reconnectConfigFor(serverName) ??
              clients_3.find((client) => client.name === serverName)?.config ??
              null;
            let authTarget = config ? classifyMcpAuthTarget(serverName, config) : null;
            let currentSessionId = () => {
              if (!config) return `Server not found: ${sanitizeTelemetryString(serverName)}`;
              let blockCause = mcpDialBlockCause(serverName, config);
              if (blockCause === "managed-policy")
                return mcpRefusalText(
                  serverName,
                  blockCause,
                  config,
                  `MCP server ${sanitizeTelemetryString(serverName)} is blocked by enterprise managed policy`,
                );
              if (isMcpServerDisabled(serverName))
                return disabledEnableBeforeText(serverName, "authenticating");
              if (blockCause) return notApprovedText(serverName, "authenticating");
              return null;
            };
            let sessionId = currentSessionId();
            if (!config || !authTarget)
              sendControlError(message, `Server not found: ${sanitizeTelemetryString(serverName)}`);
            else if (sessionId !== null) sendControlError(message, sessionId);
            else if (authTarget.kind === "claudeai-proxy") {
              let authUrl = claudeAiConnectorAuthUrl(authTarget.config);
              if (!authUrl)
                sendControlError(
                  message,
                  "Unable to build claude.ai connector auth URL (missing org or server id)",
                );
              else {
                logEvent("tengu_claudeai_mcp_auth_started", {});
                sendControlResponseSuccess(message, {
                  authUrl,
                  requiresUserAction: true,
                  callbackExpected: false,
                });
              }
            } else if (authTarget.kind === "unsupported-transport")
              sendControlError(
                message,
                `Server type "${authTarget.transport}" does not support OAuth authentication`,
              );
            else if (authTarget.kind === "anthropic-hosted")
              sendControlError(message, sanitizeTelemetryString(authTarget.message));
            else
              handleControlRequestAsync(async () => {
                let manualCallbackUsed;
                try {
                  let raceCallback = (redirectUri) => {
                    let adoptResolve;
                    let promise = new Promise((resolve) => {
                      adoptResolve = resolve;
                    });
                    let callbackPort;
                    let state;
                    let callbackState = {
                      oauthPromise: undefined,
                      adopted: false,
                      adopt: () => {
                        if (callbackState.adopted || !callbackState.oauthPromise) return;
                        callbackState.adopted = true;
                        oauthManualCallbackUsed.set(serverName, callbackState.oauthPromise);
                        reconnectAttemptsAt.delete(serverName);
                        getMcpAuthModule().setActiveOAuthPromise(serverName, callbackState.oauthPromise);
                      },
                    };
                    let oauthPromise = getMcpAuthModule().performMCPOAuthFlow(
                      serverName,
                      authTarget.config,
                      (callbackUrl) => adoptResolve(callbackUrl),
                      undefined,
                      {
                        skipBrowserOpen: true,
                        redirectUri,
                        redirectUriOnly,
                        onWaitingForCallback: (url, accounts, lastError) => {
                          callbackPort = accounts;
                          state = lastError;
                          callbackState.adopt();
                        },
                      },
                    );
                    callbackState.oauthPromise = oauthPromise;
                    manualCallbackUsed = oauthPromise;
                    return {
                      oauthPromise,
                      adopt: callbackState.adopt,
                      raced: Promise.race([promise, oauthPromise.then(() => null)]).then((authUrl) => ({
                        authUrl,
                        callbackPort,
                        state,
                      })),
                    };
                  };
                  let epoch = identityEpoch();
                  let autoWait =
                    !redirectUriOnly &&
                    (Boolean(authTarget.config.oauth?.clientId) ||
                      (Boolean(redirectUri) &&
                        (await shouldSkipCustomRedirect(serverName, authTarget.config))));
                  let runFlow = () => {
                    let sessionId = currentSessionId();
                    if (sessionId !== null) {
                      sendControlError(message, sessionId);
                      return true;
                    }
                    if (identityEpoch() !== epoch) {
                      sendControlError(
                        message,
                        `The Claude account changed while sign-in to MCP server ${sanitizeTelemetryString(serverName)} was starting. Try again.`,
                      );
                      return true;
                    }
                    return false;
                  };
                  if (runFlow()) return;
                  let redirectUri_2 = autoWait ? undefined : redirectUri;
                  let callbackKind = "localhost";
                  let callback = raceCallback(redirectUri_2);
                  let customCallbackUrl;
                  if (redirectUri_2)
                    try {
                      customCallbackUrl = await callback.raced;
                      callbackKind = "custom";
                    } catch (error) {
                      if (redirectUriOnly) throw error;
                      logForDebugging(
                        `[mcp_authenticate] AS rejected custom redirectUri for ${serverName}; falling back to localhost: ${sanitizeErrorDetail(redactMcpErrorDetail(serverName, authTarget.config, errorMessage(error)))}`,
                      );
                      if (oauthManualCallbackUsed.get(serverName) === callback.oauthPromise) {
                        oauthCallbackSubmitters.delete(serverName);
                        oauthManualCallbackUsed.delete(serverName);
                      }
                      if (runFlow()) return;
                      callback = raceCallback();
                      customCallbackUrl = await callback.raced;
                    }
                  else customCallbackUrl = await callback.raced;
                  let oauthPromise = callback.oauthPromise;
                  let { authUrl, callbackPort, state } = customCallbackUrl;
                  if (authUrl) {
                    let errorMessage = {
                      authUrl,
                      requiresUserAction: true,
                      callbackExpected: true,
                      redirectScheme: callbackKind,
                      state,
                      ...(callbackKind === "localhost" && {
                        callbackPort,
                      }),
                    };
                    if (liveReply === true) sendControlResponseError(message, errorMessage);
                    else sendControlResponseSuccess(message, errorMessage);
                  } else
                    sendControlResponseSuccess(message, {
                      requiresUserAction: false,
                      callbackExpected: false,
                    });
                  callback.adopt();
                  let afterFlow = oauthPromise
                    .then(async () => {
                      if (identityEpoch() !== epoch) {
                        logForDebugging(
                          `MCP server ${serverName}: OAuth completed after an identity change; discarding without reconnecting`,
                        );
                        return;
                      }
                      deleteNeedsAuthCache(options.storageV5);
                      if (isMcpServerDisabled(serverName)) return;
                      if (isMcpDialBlockedByPolicy(serverName, config)) {
                        logForDebugging(
                          `MCP server ${serverName} blocked by managed policy after OAuth \u2014 skipping reconnect`,
                          {
                            level: "warn",
                          },
                        );
                        return;
                      }
                      if (oauthCallbackSubmitters.has(serverName)) {
                        reconnectAttemptsAt.set(serverName, Date.now());
                        return;
                      }
                      if (!reconnectConfigFor(serverName)) {
                        logForDebugging(
                          `MCP server ${sanitizeTelemetryString(serverName)}: OAuth completed for a server that is no longer configured; not reconnecting`,
                        );
                        return;
                      }
                      markConfigReplaced(serverName, config);
                      let reconnected = await reconnectServer(serverName, config, {
                        distrust: false,
                      });
                      onModelSwitchNotice(serverName, reconnected);
                    })
                    .catch((error) => {
                      logForDebugging(
                        `MCP OAuth failed for ${serverName}: ${sanitizeErrorDetail(redactMcpErrorDetail(serverName, authTarget.config, errorMessage(error)))}`,
                        {
                          level: "error",
                        },
                      );
                    })
                    .finally(() => {
                      if (oauthManualCallbackUsed.get(serverName) === oauthPromise) {
                        oauthCallbackSubmitters.delete(serverName);
                        oauthManualCallbackUsed.delete(serverName);
                      }
                    });
                } catch (error) {
                  if (manualCallbackUsed && oauthManualCallbackUsed.get(serverName) === manualCallbackUsed) {
                    oauthCallbackSubmitters.delete(serverName);
                    oauthManualCallbackUsed.delete(serverName);
                  }
                  let dcrRefused = await isDcrRejection(error, serverName, authTarget.config).catch(
                    (error) => {
                      logHandlerFailure(
                        SDKControlReloadPluginsRequestSchema(controlContext, "mcp_authenticate"),
                        "mcp_authenticate: registration check",
                        error,
                      );
                      return false;
                    },
                  );
                  sendControlErrorWithMeta(
                    message,
                    "mcp_authenticate",
                    Error(
                      normalizeMcpServerName(
                        redactMcpErrorDetail(serverName, authTarget.config, errorMessage(error)),
                      ),
                    ),
                    {},
                    dcrRefused || error instanceof McpOauthRefusedError
                      ? redirectUriOnly
                        ? "mcp_redirect_uri_unusable"
                        : "mcp_client_registration_unavailable"
                      : undefined,
                  );
                }
              });
          } else if (message.request.subtype === "mcp_oauth_callback_url") {
            let { serverName, callbackUrl } = message.request;
            let oAuthCallbackSubmitter = getMcpAuthModule().getOAuthCallbackSubmitter(serverName);
            if (oAuthCallbackSubmitter) {
              let hasCode = false;
              try {
                let parsed = new URL(callbackUrl);
                hasCode = parsed.searchParams.has("code") || parsed.searchParams.has("error");
              } catch {}
              if (!hasCode)
                sendControlError(
                  message,
                  "Invalid callback URL: missing authorization code. Please paste the full redirect URL including the code parameter.",
                );
              else if (!oAuthCallbackSubmitter(callbackUrl))
                sendControlError(
                  message,
                  "Callback URL not accepted: it belongs to a different sign-in attempt (OAuth state mismatch) or carries no authorization code. The sign-in in progress is still waiting; submit the redirect URL from its own browser page.",
                );
              else {
                oauthCallbackSubmitters.add(serverName);
                let pendingFlow =
                  oauthManualCallbackUsed.get(serverName) ??
                  getMcpAuthModule().getActiveOAuthPromise(serverName);
                if (pendingFlow) {
                  oauthAuthPromises.set(serverName, pendingFlow);
                  handleControlRequestAsync(async () => {
                    try {
                      await pendingFlow;
                      sendControlResponseSuccess(message);
                    } catch (error) {
                      let config =
                        reconnectConfigFor(serverName) ??
                        clients_3.find((client) => client.name === serverName)?.config ??
                        null;
                      let detail = config
                        ? normalizeMcpServerName(
                            redactMcpErrorDetail(serverName, config, errorMessage(error)),
                          )
                        : "[error detail unavailable: server configuration could not be located]";
                      let isOauthCallbackUrl = mayPersistOnHost(session);
                      if (isOauthCallbackUrl)
                        logForDebugging(`mcp_oauth_callback_url: ${detail}`, {
                          level: "error",
                        });
                      sendControlError(message, isOauthCallbackUrl ? "OAuth authentication failed" : detail);
                    } finally {
                      if (oauthAuthPromises.get(serverName) === pendingFlow)
                        oauthAuthPromises.delete(serverName);
                    }
                  });
                } else sendControlResponseSuccess(message);
              }
            } else
              sendControlError(
                message,
                `No active OAuth flow for server: ${sanitizeTelemetryString(serverName)}`,
              );
          } else if (message.request.subtype === "claude_authenticate") {
            let { loginWithClaudeAi } = message.request;
            let verdict = validateForceLoginMethod(loginWithClaudeAi ?? true);
            if (!verdict.valid) {
              logFeatureBad("sdk_claude_authenticate", "force_login_method_refused");
              sendControlError(message, verdict.message);
              continue;
            }
            let blockedMessage = providerBlockedMessage("firstParty");
            if (blockedMessage !== undefined) {
              logFeatureBad("sdk_claude_authenticate", "provider_not_allowed");
              controlError("claude_authenticate policy", blockedMessage);
              sendControlError(
                message,
                "Login blocked: this machine's managed settings do not permit signing in to the Anthropic API here (allowedProviders), or the policy could not be read. Run claude auth login from a terminal for details.",
              );
              continue;
            }
            let settings_DEPRECATED = getSettings_DEPRECATED();
            let loginMethodDiffers =
              settings_DEPRECATED.forceLoginMethod !== undefined &&
              (loginWithClaudeAi ?? true) !== (settings_DEPRECATED.forceLoginMethod === "claudeai");
            let forceLoginOrgUUID =
              typeof settings_DEPRECATED.forceLoginOrgUUID === "string" && !loginMethodDiffers
                ? settings_DEPRECATED.forceLoginOrgUUID
                : undefined;
            let existingFlow = claudeOAuth;
            if (
              existingFlow?.urls !== undefined &&
              canJoinOAuthFlow(existingFlow, loginWithClaudeAi ?? true, forceLoginOrgUUID, Date.now())
            ) {
              logEvent("tengu_oauth_flow_joined", {
                loginWithClaudeAi: loginWithClaudeAi ?? true,
              });
              sendControlResponseSuccess(message, existingFlow.urls);
              continue;
            }
            let settingsOnlyGrant;
            claudeOAuth?.service.cleanup();
            logEvent("tengu_oauth_flow_start", {
              loginWithClaudeAi: loginWithClaudeAi ?? true,
            });
            let refused = false;
            let service = new OAuthService();
            let resolveUrl;
            let urlPromise = new Promise((resolve) => {
              resolveUrl = resolve;
            });
            let flow = service
              .startOAuthFlow(
                async (manualUrl, automaticUrl) => {
                  resolveUrl({
                    manualUrl,
                    automaticUrl,
                  });
                },
                {
                  loginWithClaudeAi: loginWithClaudeAi ?? true,
                  orgUUID: forceLoginOrgUUID,
                  skipBrowserOpen: true,
                  settingsOnlyGrant,
                },
              )
              .catch((tokens) => {
                if (!(tokens instanceof OAuthCallbackError))
                  logEvent("tengu_oauth_token_exchange_error", {
                    ...errorTelemetryFields_2(tokens),
                    ssl_error: getSSLErrorHint(tokens) !== null,
                  });
                throw tokens;
              })
              .then(async (err) => {
                let orgCheck = await checkNewLoginTokenOrg(err);
                if (orgCheck.outcome === "refused") {
                  refused = true;
                  logFeatureBad("sdk_claude_authenticate", "org_pin_refused");
                  let revokedText = await revokeRefusedSignInToken(err);
                  throw new WireSafeControlError(`${LOGIN_BLOCKED_POLICY_UNVERIFIED_TEXT} ${revokedText}`);
                }
                let authenticateError = await sdkClaudeAuthenticate(err);
                if (authenticateError !== undefined) {
                  refused = true;
                  throw new WireSafeControlError(authenticateError);
                }
                let spareUnchangedFrom = new Set([
                  ...getAppState().mcp.clients,
                  ...reconnectStores.getDynamicMcpState().clients,
                ]);
                let saved = await saveLoginOrWarn(err, {
                  storageV5: options.storageV5,
                  credentials: options.credentials,
                });
                let tokenAccount = err.tokenAccount
                  ? {
                      accountUuid: err.tokenAccount.uuid,
                      organizationUuid: err.tokenAccount.organizationUuid,
                    }
                  : err.profile?.account && err.profile.organization
                    ? {
                        accountUuid: err.profile.account.uuid,
                        organizationUuid: err.profile.organization.uuid,
                      }
                    : undefined;
                bridgeSdkController.identityChanged(tokenAccount);
                bridgeSession?.loginChanged(tokenAccount);
                setAppState((state) =>
                  state.ultrareviewOverageConfirmed
                    ? {
                        ...state,
                        ultrareviewOverageConfirmed: false,
                      }
                    : state,
                );
                setAppState(resetSliceIfUnchanged);
                let orgVerdict = await validateForceLoginOrg(
                  options.credentials,
                  orgCheck.outcome === "permitted" ? orgCheck.verified : undefined,
                );
                if (!orgVerdict.valid) {
                  refused = true;
                  logFeatureBad(
                    "sdk_claude_authenticate",
                    orgVerdict.reason === "provider_not_allowed" ? "provider_not_allowed" : "org_pin_refused",
                  );
                  let rollbackText = await rollbackRefusedSignIn(saved?.storage, {
                    storageV5: options.storageV5,
                    credentials: options.credentials,
                  }).catch((error) => {
                    logRollbackFailure(error, "headless login");
                    return {
                      restored: false,
                      revoked: false,
                    };
                  });
                  rearmIdentityBaseline();
                  reconnectMcpOnIdentityChange({
                    ...reconnectStores,
                    storageV5: options.storageV5,
                    credentials: options.credentials,
                    getHostOwnedConfigs: allConfigs,
                    force: true,
                    spareUnchangedFrom,
                  });
                  bridgeSdkController.identityChanged(undefined);
                  bridgeSession?.loginChanged(undefined);
                  throw new WireSafeControlError(
                    rollbackText.restored
                      ? LOGIN_BLOCKED_POLICY_UNVERIFIED_TEXT
                      : rollbackText.revoked
                        ? LOGIN_BLOCKED_POLICY_RESTORE_FAILED_TEXT
                        : LOGIN_BLOCKED_POLICY_MAY_STILL_VALID_TEXT,
                  );
                }
                refreshAuthDependentSettings(options.storageV5, options.credentials);
                let reconnectPromise = reconnectMcpOnIdentityChange({
                  ...reconnectStores,
                  storageV5: options.storageV5,
                  credentials: options.credentials,
                  getHostOwnedConfigs: allConfigs,
                });
                logFeatureOk("sdk_claude_authenticate");
                if (saved?.departingLoginMayRemain)
                  process.stderr.write(`${SIGN_IN_AGAIN_TO_CLEAR_MESSAGE}
`);
                logEvent("tengu_oauth_success", {
                  loginWithClaudeAi: loginWithClaudeAi ?? true,
                });
                if (reconnectPromise) await withDeadline(reconnectPromise, CONNECT_RETRY_BASE_MS);
                return;
              })
              .finally(() => {
                service.cleanup();
                if (claudeOAuth?.service === service) claudeOAuth = null;
              });
            claudeOAuth = {
              service,
              flow,
              loginWithClaudeAi: loginWithClaudeAi ?? true,
              orgUUID: forceLoginOrgUUID,
              startedAt: Date.now(),
            };
            flow.catch((error) => {
              logForDebugging(`claude_authenticate flow ended: ${error}`, {
                level: "info",
              });
              if (error instanceof OAuthCallbackError || refused) return;
              logFeatureBad("sdk_claude_authenticate", "oauth_flow_failed");
            });
            try {
              let { manualUrl, automaticUrl } = await Promise.race([
                urlPromise,
                flow.then(() => {
                  throw Error("OAuth flow completed without producing auth URLs");
                }),
              ]);
              if (claudeOAuth?.service === service)
                claudeOAuth.urls = {
                  manualUrl,
                  automaticUrl,
                };
              sendControlResponseSuccess(message, {
                manualUrl,
                automaticUrl,
              });
            } catch (error) {
              sendControlErrorWithMeta(message, "claude_authenticate", error);
            }
          } else if (
            message.request.subtype === "claude_oauth_callback" ||
            message.request.subtype === "claude_oauth_wait_for_completion"
          ) {
            if (!claudeOAuth) sendControlError(message, "No active claude_authenticate flow");
            else {
              if (message.request.subtype === "claude_oauth_callback")
                claudeOAuth.service.handleManualAuthCodeInput({
                  authorizationCode: message.request.authorizationCode,
                  state: message.request.state,
                });
              let { flow } = claudeOAuth;
              handleControlRequestAsync(() =>
                flow.then(
                  (flowResult) => {
                    let accountInfo = getAccountInformation();
                    sendControlResponseSuccess(message, {
                      account: {
                        email: accountInfo?.email,
                        organization: accountInfo?.organization,
                        subscriptionType: accountInfo?.subscription,
                        tokenSource: accountInfo?.tokenSource,
                        apiKeySource: accountInfo?.apiKeySource,
                        apiProvider: getAPIProvider(),
                      },
                      ...flowResult,
                    });
                  },
                  (error) => {
                    controlError("claude_oauth_callback", errorMessage(error));
                    sendControlError(
                      message,
                      error instanceof WireSafeControlError
                        ? sanitizeTelemetryString(errorMessage(error))
                        : pickForTransport(session, errorMessage(error), "claude_oauth_callback failed"),
                    );
                  },
                ),
              );
            }
          } else if (message.request.subtype === "mcp_clear_auth") {
            let { serverName } = message.request;
            let existingConfig =
              reconnectConfigFor(serverName) ??
              clients_3.find((client) => client.name === serverName)?.config ??
              null;
            let config =
              getAppState().mcp.clients.find((client) => client.name === serverName)?.config ??
              dynamicMcpState.clients.find((client) => client.name === serverName)?.config;
            let serverConfig = existingConfig ?? config ?? null;
            let revoke = (scope) =>
              require("../services/mcp/revokeTokens.js").revokeStoredMcpTokens(
                serverName,
                config ? [scope, config] : [scope],
              );
            let respond = (result) => {
              if (result.cleared) sendControlResponseSuccess(message, {});
              else
                sendControlError(
                  message,
                  signOutFailureMessage(sanitizeTelemetryString(serverName), result.reason, "try again"),
                );
            };
            if (!serverConfig)
              sendControlError(message, `Server not found: ${sanitizeTelemetryString(serverName)}`);
            else if (serverConfig.type !== "sse" && serverConfig.type !== "http")
              sendControlError(message, `Cannot clear auth for server type "${serverConfig.type}"`);
            else if (
              !existingConfig ||
              isMcpDialBlockedByPolicy(serverName, serverConfig) ||
              isMcpServerDisabled(serverName)
            ) {
              let revoked = await revoke(serverConfig);
              let client =
                getAppState().mcp.clients.find((client) => client.name === serverName) ??
                dynamicMcpState.clients.find((client) => client.name === serverName);
              if (client && client.type !== "disabled") {
                await getMcpClientModule().clearServerCache(serverName, client.config);
                if (isDiscoveryCacheUsable())
                  await flushDiscoveryCache(
                    getMcpClientModule().dropDiscoveryEntry(serverName, client.config),
                  );
                let blockCause = mcpDialBlockCause(serverName, client.config);
                applyMcpReconnectResult(serverName, {
                  client:
                    blockCause === "managed-policy"
                      ? {
                          name: serverName,
                          type: "failed",
                          config: client.config,
                          ...mcpGateError(blockCause, serverName, client.config),
                        }
                      : isMcpServerDisabled(serverName)
                        ? {
                            name: serverName,
                            type: "disabled",
                            config: client.config,
                          }
                        : blockCause
                          ? {
                              name: serverName,
                              type: "failed",
                              config: client.config,
                              ...mcpGateError(blockCause, serverName, client.config),
                            }
                          : {
                              name: serverName,
                              type: "failed",
                              config: client.config,
                              error: revoked.cleared ? AUTH_CLEARED_REASON : AUTH_CLEAR_FAILED_REASON,
                            },
                  tools: [],
                  commands: [],
                  attemptEpoch: identityEpoch(),
                });
              }
              respond(revoked);
            } else {
              let revokedText = await revoke(serverConfig);
              markConfigReplaced(serverName, serverConfig);
              let redialed = await reconnectServer(serverName, serverConfig, {
                distrust: true,
              });
              onModelSwitchNotice(serverName, redialed);
              respond(revokedText);
            }
          } else if (message.request.subtype === "apply_flag_settings") {
            let vouchedPick = takeVouchedModelRequest(message.request_id);
            let validation = validateApplyFlagSettings(message.request.settings);
            if (!validation.ok) {
              sendControlError(message, validation.error);
              continue;
            }
            let settings = validation.settings;
            let applyFlagPatch = async (patch, fromUser, suffix = "") => {
              let wantsFastMode =
                patch.fastMode === true && (getFlagSettingsInline()?.fastMode !== true || "model" in patch);
              let prefix = getActiveAgentsFromList(agents);
              let modelVerdict = (prev) => {
                let restricted =
                  prev.trim().toLowerCase() !== "default" &&
                  !isExemptDefaultResolvingPick(prev) &&
                  !(isModelAllowedUnderActiveEnforcement(prev) ?? isModelAllowed(prev));
                return {
                  blocked: restricted,
                  stepDown: restricted ? stepDownRestrictedFamilyAliasPick(prev) : null,
                };
              };
              let requestedAgentIds;
              let modelBreadcrumbs;
              let readModelState = () => {
                let state = getAppState();
                return {
                  mainLoopModel: state.mainLoopModel ?? userSpecifiedModel ?? getMainLoopModel(),
                  mainLoopModelForSession: state.mainLoopModelForSession,
                  toolPermissionContext: state.toolPermissionContext,
                };
              };
              if (("model" in patch || "agent" in patch) && hasPreModelSwitchHook(session)) {
                let agentIds = [];
                if ("model" in patch) {
                  let prev = patch.model == null ? null : String(patch.model);
                  let verdict = prev === null ? null : modelVerdict(prev);
                  if (prev !== null && verdict !== null)
                    modelBreadcrumbs = {
                      raw: prev,
                      verdict,
                    };
                  if (!(verdict?.blocked && verdict.stepDown === null))
                    agentIds.push(
                      prev === null || prev.trim().toLowerCase() === "default"
                        ? null
                        : (verdict?.stepDown ?? prev),
                    );
                }
                if ("agent" in patch) {
                  let turnAgent = resolveTurnAgent(patch.agent, prefix);
                  requestedAgentIds = new Set();
                  for (let agentId of [turnAgent.now, turnAgent.later])
                    if (agentId !== undefined) {
                      requestedAgentIds.add(agentId);
                      if (!agentIds.includes(agentId)) agentIds.push(agentId);
                    }
                }
                let hookRefusal;
                for (let agentId of agentIds) {
                  let hookResult;
                  try {
                    hookResult = await runPreModelSwitchHooks(session, readModelState, agentId, "sdk");
                  } catch (error) {
                    logError(toError(error));
                    hookRefusal = "apply_flag_settings failed";
                    break;
                  }
                  if (hookResult.decision !== "proceed") {
                    logFeatureSad("model_switch", "blocked_by_hook");
                    hookRefusal = describeModelSwitchBlocked(hookResult);
                    break;
                  }
                  for (let message of hookResult.messages) announceInfo(sanitizeHookText(message));
                }
                if (hookRefusal !== undefined) {
                  sendControlError(message, hookRefusal + suffix);
                  return false;
                }
              }
              let effectivePatch = patch;
              let pluginSplit = null;
              if (hasCloudPluginsKey(patch)) {
                pluginSplit = await splitCloudPluginsPatch({
                  settings: patch,
                  admission: options.pluginForwardingAdmission,
                  readFlag: isCloudPluginForwardingFlagOn,
                  flagWaitCapMs: PLUGIN_INSTALL_WAIT_MS,
                  now: () => performance.now(),
                });
                let { verdict, alone, merge } = pluginSplit;
                if (!verdict.apply) {
                  logForDiagnosticsNoPII("info", "plugin_forwarding_patch_refused", {
                    reason: verdict.reason,
                    alone,
                  });
                  if (verdict.reason === "flag_off") retractInlineFlagSettings("patch");
                  if (alone) {
                    sendControlError(message, `${PLUGIN_FORWARDING_DISABLED}: ${verdict.reason}`);
                    return false;
                  }
                }
                effectivePatch = merge;
              }
              let mainLoopModel = getMainLoopModel();
              let previousSpecifiedModel = userSpecifiedModel;
              if ("agent" in effectivePatch) {
                let turnAgent = resolveTurnAgent(effectivePatch.agent, prefix);
                let now = turnAgent.now;
                let requestedAgentIds_2 = requestedAgentIds;
                if (
                  requestedAgentIds_2 !== undefined &&
                  [turnAgent.now, turnAgent.later].some(
                    (agentId) => agentId !== undefined && !requestedAgentIds_2.has(agentId),
                  )
                ) {
                  sendControlError(
                    message,
                    `agent switch not applied: the session's model changed while PreModelSwitch hooks ran; send the request again${suffix}`,
                  );
                  return false;
                }
                let readState = readModelState();
                let agentApplied = applyRequestedAgent({
                  requestedAgent: effectivePatch.agent,
                  agents: prefix,
                  systemPrompt: options.systemPrompt,
                  preAgentSystemPrompt,
                });
                if (!agentApplied.ok) {
                  sendControlError(message, agentApplied.error);
                  return false;
                }
                if (now !== undefined) recordSwitchIfChanged(session, readState, now, "sdk");
                if (!options.systemPrompt) hostPromptSupersedes = false;
                options.systemPrompt = agentApplied.systemPrompt;
                preAgentSystemPrompt = agentApplied.preAgentSystemPrompt;
                noteSystemPromptSectionInvalidation("agent_switch");
                let agentType = agentApplied.agentDefinition?.agentType;
                setAppState((state) =>
                  state.agent === agentType
                    ? state
                    : {
                        ...state,
                        agent: agentType,
                      },
                );
              }
              applyFlagSettings(effectivePatch, () => shouldNudgeFastModeChange(getAppState().fastMode));
              if (pluginSplit !== null) {
                if (pluginSplit.verdict.apply) pluginFlagTracker.applied(pluginSplit.verdict.settings);
                if (!pluginSplit.alone) logMixedCloudPluginsPatch(pluginSplit);
              }
              let skillModelVerdict =
                "model" in effectivePatch && effectivePatch.model != null
                  ? modelBreadcrumbs?.raw === String(effectivePatch.model)
                    ? modelBreadcrumbs.verdict
                    : modelVerdict(String(effectivePatch.model))
                  : {
                      blocked: false,
                      stepDown: null,
                    };
              let { blocked, stepDown } = skillModelVerdict;
              let defaultRefused =
                "model" in effectivePatch && isDefaultModelRefusedByPolicy(effectivePatch.model);
              let modelBlocked = (blocked && stepDown === null) || defaultRefused;
              let nextModel =
                "model" in effectivePatch && effectivePatch.model != null
                  ? (stepDown ??
                    (String(effectivePatch.model).trim().toLowerCase() === "default"
                      ? getDefaultMainLoopModel()
                      : String(effectivePatch.model)))
                  : null;
              if ("model" in effectivePatch && !modelBlocked) {
                recordSwitchIfChanged(
                  session,
                  readModelState(),
                  stepDown ??
                    (effectivePatch.model == null ||
                    String(effectivePatch.model).trim().toLowerCase() === "default"
                      ? null
                      : String(effectivePatch.model)),
                  "sdk",
                );
                setMainLoopModelOverride(nextModel);
                let effectiveModel = nextModel ?? getMainLoopModel();
                setAppState((state) =>
                  state.mainLoopModelForSession === effectiveModel
                    ? state
                    : {
                        ...state,
                        mainLoopModelForSession: effectiveModel,
                      },
                );
              }
              let writtenModel =
                "model" in effectivePatch &&
                !modelBlocked &&
                effectivePatch.model != null &&
                nextModel != null
                  ? nextModel
                  : undefined;
              let prevModel = getMainLoopModel();
              let divergent = isWindowDivergentWrite({
                writtenModel,
                prevModel: mainLoopModel,
                newModel: prevModel,
                prevActive: previousSpecifiedModel,
              });
              let modelSwitchBreadcrumbs = createModelSwitchBreadcrumbs_2(
                effectivePatch,
                userSpecifiedModel,
                prevModel,
              );
              if (modelSwitchBreadcrumbs !== undefined) userSpecifiedModel = modelSwitchBreadcrumbs;
              if (prevModel !== mainLoopModel || divergent) {
                let mainLoopModelForSession = writtenModel !== undefined ? writtenModel : prevModel;
                let nextSpecifiedModel = divergent && writtenModel !== undefined ? writtenModel : prevModel;
                userSpecifiedModel = nextSpecifiedModel;
                setAppState((state) => ({
                  ...state,
                  mainLoopModelForSession,
                }));
                let breadcrumbModel =
                  effectivePatch.model && !modelBlocked
                    ? String(effectivePatch.model)
                    : "model" in effectivePatch && !modelBlocked
                      ? "default"
                      : prevModel;
                structuredIO.sessionState.notifyMetadataChanged({
                  model: prevModel,
                });
                if (
                  modelChangeNeedsNewContext({
                    appliedModel: nextSpecifiedModel,
                    previousModel: previousSpecifiedModel ?? mainLoopModel,
                    conversationModel: conversationModel(mainLoopModel),
                  })
                )
                  injectModelSwitchBreadcrumbs(breadcrumbModel, prevModel);
              }
              if ("model" in effectivePatch)
                noticeFlagSettingsModel({
                  defaultPickRefused: defaultRefused,
                  model: effectivePatch.model == null ? null : String(effectivePatch.model),
                  rejected: modelBlocked,
                  stepDown,
                  effectiveModel: () => activeModel(),
                });
              if (
                applyFlagSettingsSideEffects(effectivePatch, {
                  getEngineState: getAppState,
                  setEngineState: setAppState,
                  reportEffortMetadata: (effortLevel) =>
                    structuredIO.sessionState.notifyMetadataChanged({
                      effort_level: effortLevel,
                    }),
                  model: getMainLoopModel(),
                })
              )
                structuredIO.sessionState.notifyMetadataChanged({
                  effort_request_id: toBoundedLabel(message.request_id),
                });
              if (wantsFastMode && isMainModelFastRejected(getMainLoopModel()))
                clearFastRejectedFallbackModels();
              await settleAutoModeAtModelSwitch(vouchedPick);
              if (fromUser) sendControlResponseSuccess(message);
              return true;
            };
            let switchPending = switchSerializerSlot.of(session).pending > 0;
            if (!(
              (("model" in settings || "agent" in settings) &&
                (hasPreModelSwitchHook(session) || switchPending)) ||
              ("fastMode" in settings && switchPending)
            ))
              await applyFlagPatch(settings, true);
            else {
              if (
                typeof settings.agent === "string" &&
                settings.agent !== "" &&
                !findAgentExcludingWebFetch(getActiveAgentsFromList(agents), settings.agent)
              ) {
                sendControlError(message, `Agent "${String(settings.agent)}" not found`);
                continue;
              }
              let { model, agent, fastMode, ...restSettings } = settings;
              let agentChanges =
                "agent" in settings &&
                ((turnAgent) => turnAgent.now !== undefined || turnAgent.later !== undefined)(
                  resolveTurnAgent(agent, getActiveAgentsFromList(agents)),
                );
              let fastModeApplies =
                "fastMode" in settings && ("model" in settings || agentChanges || switchPending);
              let modelPatch = {
                ...("model" in settings && {
                  model,
                }),
                ...(agentChanges && {
                  agent,
                }),
                ...(fastModeApplies && {
                  fastMode,
                }),
              };
              let restPatch = {
                ...restSettings,
                ...("agent" in settings &&
                  !agentChanges && {
                    agent,
                  }),
                ...("fastMode" in settings &&
                  !fastModeApplies && {
                    fastMode,
                  }),
              };
              let keys = Object.keys(restPatch);
              if (keys.length > 0 && !(await applyFlagPatch(restPatch, false))) continue;
              if (Object.keys(modelPatch).length === 0) {
                sendControlResponseSuccess(message);
                continue;
              }
              let otherKeysNote =
                keys.length > 0
                  ? ` (the request's other settings were applied: ${keys.map(sanitizeHookText).join(", ")})`
                  : "";
              handleControlRequestAsync(() =>
                serializeModelSwitch(session, async () => {
                  try {
                    await applyFlagPatch(modelPatch, true, otherKeysNote);
                  } catch (error) {
                    logError(toError(error));
                    sendControlError(message, `apply_flag_settings failed${otherKeysNote}`);
                  }
                }),
              );
            }
          } else if (message.request.subtype === "get_settings") {
            if (isTransportBacked(session)) {
              sendControlError(message, "get_settings is not available on this connection");
              continue;
            }
            let getSettingsPayload = () => {
              let state = getAppState();
              let newModel = getMainLoopModel();
              let effortValue = modelSupportsEffort(newModel)
                ? resolveEffortValue(newModel, resolveEffortLevel(state))
                : undefined;
              let effortLevel = resolveEffortLevel(state, undefined, {
                withHold: false,
              });
              let effortValue_2 = resolveEffortValue(newModel, effortLevel, {
                carriedEffort: null,
              });
              let currentAppState = getEffortEnvOverride();
              let model = getSettingsWithSources();
              let mapped = getSettingsWithErrors()
                .errors.filter((error) => error.severity !== "warning")
                .map((error) => ({
                  file: error.file,
                  path: error.path,
                  message: error.message,
                }));
              let remoteControlPolicyLockReason = getRemoteControlPolicyLockReason();
              sendControlResponseSuccess(message, {
                ...model,
                remote_control_policy_lock_reason: remoteControlPolicyLockReason ?? undefined,
                applied: {
                  model: newModel,
                  effort: typeof effortValue === "string" ? effortValue : null,
                  ...(alwaysFalse() !== false && {
                    effortAuto:
                      modelSupportsEffort(newModel) &&
                      (currentAppState === null ||
                        (currentAppState === undefined && effortLevel === undefined)) &&
                      effortValue === effortValue_2,
                  }),
                  advisor: resolveAdvisorModel(state.advisorModel, newModel) ?? null,
                  ultracode: isUltracodeActive(state.ultracode, newModel),
                  ultracodeRequested: state.ultracode === true,
                  ultracodeAvailable: isUltracodeAvailable(newModel),
                  ultrathinkAvailable: ultrathinkRaisesEffort(newModel, resolveEffortLevel(state)),
                },
                errors: mapped.length > 0 ? mapped : undefined,
              });
            };
            if (
              getRemoteControlPolicyLockReason() !== null &&
              !isPolicyLimitsCacheLoaded() &&
              !isRemoteControlHardDisabled()
            )
              handleControlRequestAsync(async () => {
                await Promise.race([ensurePolicyLimitsLoadedForDiagnostic(), waitForPolicyLimitsToLoad()]);
                getSettingsPayload();
              });
            else getSettingsPayload();
          } else if (message.request.subtype === "get_hooks_listing") {
            if (isTransportBacked(session)) {
              sendControlError(message, "get_hooks_listing is not available on this connection");
              continue;
            }
            try {
              sendControlResponseSuccess(message, hookPolicySummary(sessionHooks));
            } catch (error) {
              sendControlErrorWithMeta(message, "get_hooks_listing", error);
            }
          } else if (message.request.subtype === "update_settings") {
            let source = message.request.source;
            let validation = validateUpdateSettings(
              structuredIO.isRemoteTransport(),
              source === "userSettings"
                ? isSettingSourceEnabled("userSettings")
                : isSettingSourceEnabled("localSettings"),
              source,
              message.request.settings,
              alwaysFalse() !== false,
            );
            if (validation !== null) {
              sendControlError(message, validation);
              continue;
            }
            if (source === "userSettings") {
              let effortText = String(message.request.settings.effortLevel);
              let effortLevel = effortText === "auto" ? undefined : parseEffortLevel(effortText);
              if (effortLevel === undefined && effortText !== "auto") {
                sendControlError(message, EFFORT_LEVEL_ERROR);
                continue;
              }
              let persistResult = await persistEffortSetting(
                effortLevel,
                getMainLoopModel(),
                true,
                options.storageV5,
              );
              if (persistResult) {
                sendControlError(message, persistResult.message);
                continue;
              }
              if (effortText === "auto")
                logEvent("tengu_effort_command", {
                  effort: lit("auto"),
                  from_level: fromEnumOpt(
                    getEffortLevelIfSupported(getMainLoopModel(), resolveEffortLevel(getAppState())),
                  ),
                  route: lit("slider"),
                  is_remote: false,
                });
              sendControlResponseSuccess(message, {});
              continue;
            }
            let updateResult = await updateSettingsForSource("localSettings", message.request.settings);
            if (updateResult.error) sendControlError(message, updateResult.error.message);
            else sendControlResponseSuccess(message, {});
          } else if (message.request.subtype === "list_permission_rules") {
            if (isTransportBacked(session)) {
              sendControlError(message, "list_permission_rules is not available on this connection");
              continue;
            }
            let { buildPermissionRulesWireState } =
              await import("../utils/permissions/buildPermissionRulesWireState.lazy.js");
            sendControlResponseSuccess(message, {
              state: buildPermissionRulesWireState({
                context: getAppState().toolPermissionContext,
                originalCwd: getSessionProject(session).originalCwd,
                readSettingsWithSources: getSettingsWithSources,
                readSettingsErrors: getSettingsWithErrors,
                readParentSettingsIncluded: parentSettingsIncluded,
              }),
            });
          } else if (message.request.subtype === "submit_feedback") {
            let {
              description,
              surface,
              draft_id: draftId,
              type,
              title,
              area,
              attach_transcript: attachTranscript,
              save_locally: saveLocally,
            } = message.request;
            runControl(async () => {
              try {
                if (draftId == null && saveLocally === true) {
                  sendControlResponseSuccess(
                    message,
                    await submitHeadlessFeedback({
                      messages: conversationRows,
                      description,
                      surface: surface ?? "sdk",
                      storageV5: options.storageV5,
                      host: session.host,
                    }),
                  );
                  return;
                }
                let unavailableReason = feedbackUnavailableReason();
                if (unavailableReason) {
                  sendControlResponseSuccess(message, {
                    feedback_id: null,
                    unavailable_reason: unavailableReason,
                  });
                  return;
                }
                if (draftId != null) {
                  let { submitDraftFromRequest } = await import("../utils/drafts.js");
                  sendControlResponseSuccess(
                    message,
                    await submitDraftFromRequest({
                      draftId,
                      description,
                      type,
                      title,
                      area,
                      attachTranscript,
                      surface,
                      messages: conversationRows,
                      storageV5: options.storageV5,
                      host: session.host,
                      credentials: options.credentials,
                    }),
                  );
                  return;
                }
                let postResult = await postFeedbackSubmission({
                  messages: conversationRows,
                  description,
                  surface: surface ?? "sdk",
                  storageV5: options.storageV5,
                  host: session.host,
                  credentials: options.credentials,
                });
                if (postResult.success) {
                  let ccshareUrl;
                  sendControlResponseSuccess(message, {
                    feedback_id: postResult.feedbackId,
                    ccshare_url: ccshareUrl,
                  });
                } else
                  sendControlResponseSuccess(message, {
                    feedback_id: null,
                    is_zdr_org: postResult.isZdrOrg,
                    failure_reason: postResult.failureReason,
                    status_code: postResult.statusCode,
                    unavailable_reason: orgFeedbackRefusalMessage(postResult),
                  });
              } catch (error) {
                sendControlErrorWithMeta(message, "submit_feedback", error);
              }
            });
          } else if (message.request.subtype === "submit_survey_feedback") {
            let { subtype, ...rest } = message.request;
            runControl(async () => {
              try {
                let { submitSurveyFeedbackForSdk } =
                  await import("../services/feedback/submitSurveyFeedback.js");
                sendControlResponseSuccess(
                  message,
                  await submitSurveyFeedbackForSdk({
                    request: rest,
                    messages: conversationRows,
                    storageV5: options.storageV5,
                    host: session.host,
                    credentials: options.credentials,
                  }),
                );
              } catch (error) {
                sendControlErrorWithMeta(message, "submit_survey_feedback", error);
              }
            });
          } else if (message.request.subtype === "side_question") {
            let inFlight = sideQuestionRequests.get(message.request_id);
            if (inFlight) {
              logForDebugging(
                `side_question: duplicate delivery joins the run in flight (request_id ${sanitizeTelemetryString(message.request_id)})`,
              );
              handleControlRequestAsync(() =>
                inFlight.then(() => structuredIO.controlRequestEnded(message.request_id)),
              );
              continue;
            }
            if (isShuttingDown()) {
              sendControlError(message, "Session is shutting down");
              continue;
            }
            let { question, history } = message.request;
            let childAbortController = createChildAbortController(abortController_2);
            handledOrphanedToolUseIds.set(message.request_id, childAbortController);
            let deferred = Promise.withResolvers();
            sideQuestionRequests.set(message.request_id, deferred.promise);
            let progressSent = false;
            handleControlRequestAsync(async () => {
              try {
                let answer = runSideQuestionWithProgress({
                  question,
                  history,
                  parentController: childAbortController,
                  onProgress: (progress) => {
                    if (!progressSent && !isTerminalShutdown()) handleAddDirectory(message, progress);
                  },
                  getLiveMessages: () => conversationRows,
                  isTurnInProgress: () => runState.running,
                  buildFallbackParams: buildCacheSafeParams,
                });
                let bounded = await withTimeout(
                  answer,
                  SIDE_QUESTION_TIMEOUT_MS,
                  SIDE_QUESTION_TIMEOUT_MESSAGE,
                ).finally(() => (sigintHandler() ? heldUntilExit() : undefined));
                if (bounded.cancelled) {
                  logEvent("tengu_sdk_side_question_cancelled", {});
                  sendControlError(message, "Side question cancelled");
                } else if (isTransportBacked(session)) {
                  if (bounded.response.synthetic && bounded.response.response)
                    controlError("side_question", bounded.response.response);
                  sendControlResponseSuccess(message, markSyntheticControlResponse(bounded.response));
                } else sendControlResponseSuccess(message, bounded.response);
              } catch (error) {
                if (errorMessage(error) === SIDE_QUESTION_TIMEOUT_MESSAGE) {
                  logForDebugging(
                    `side_question: no answer by the deadline, giving the run up (request_id ${sanitizeTelemetryString(message.request_id)})`,
                    {
                      level: "error",
                    },
                  );
                  childAbortController.abort(userAbortReason("shutdown"));
                  sendControlError(message, SIDE_QUESTION_TIMEOUT_MESSAGE);
                } else sendControlErrorWithMeta(message, "side_question", error);
              } finally {
                progressSent = true;
                if (handledOrphanedToolUseIds.get(message.request_id) === childAbortController)
                  handledOrphanedToolUseIds.delete(message.request_id);
                sideQuestionRequests.delete(message.request_id);
                deferred.resolve();
              }
            });
          } else if (message.request.subtype === "ultrareview_launch") {
            let { args = "", confirm = false } = message.request;
            runControl(async () => {
              try {
                let { runUltrareviewHeadless } = await import("../commands/review/reviewRemote.lazy.js");
                let result = await runUltrareviewHeadless(args, {
                  confirm,
                  confirmsBeforeLaunch: true,
                  overageConfirmed: getAppState().ultrareviewOverageConfirmed,
                  markOverageConfirmed: () => confirmUltrareviewOverage(setAppState),
                  context: {
                    abortController: createAbortController(),
                    taskRegistry: createTaskFramework(getAppState, setAppState),
                    storageV5: options.storageV5,
                    credentials: options.credentials,
                  },
                });
                let rows = buildUltrareviewMessages(args, result);
                appendToConversation(rows);
                for (let replayRow of rows)
                  output.enqueue({
                    type: "user",
                    message: replayRow.message,
                    session_id: getSessionId(),
                    parent_tool_use_id: null,
                    uuid: replayRow.uuid,
                    timestamp: replayRow.timestamp,
                    isReplay: true,
                    isSynthetic: replayRow.isMeta,
                  });
                sendControlResponseSuccess(message, result);
              } catch (error) {
                sendControlErrorWithMeta(message, "ultrareview_launch", error);
              }
            });
          } else if (message.request.subtype === "message_rated") {
            let parsed = SDKMessageRatedMessageRatedMessageSchema().safeParse(message.request);
            if (!parsed.success) {
              sendControlError(
                message,
                'message_rated: messageUuid must be a string, sentiment "positive" or "negative", surface "tool_use" or "assistant_text", and cleared a boolean',
              );
              continue;
            }
            if (isPolicyAllowed("allow_product_feedback")) {
              let { messageUuid, sentiment, surface = "tool_use", cleared = false } = parsed.data;
              logEvent("tengu_message_rated", {
                message_uuid: sanitizeMarkName(messageUuid),
                sentiment: fromEnum(sentiment),
                surface: fromEnum(surface),
                cleared,
              });
            }
            sendControlResponseSuccess(message, {});
          } else if (message.request.subtype === "remote_control") {
            let req = message.request;
            let enableTask = serializeCall(async () => {
              let transcriptSnapshot;
              try {
                if (req.enabled && structuredIO.isRemoteTransport())
                  sendControlError(message, "Remote Control cannot be enabled from inside a remote session");
                else if (req.enabled) {
                  if (bridgeHandle && (bridgeAttached || isTeleportedSession(bridgeHandle.bridgeSessionId))) {
                    let previousHandle = bridgeHandle;
                    bridgeSdkController.release(previousHandle, {
                      keepRecord: true,
                    });
                    structuredIO.setOnControlRequestSent(undefined);
                    structuredIO.setOnControlRequestResolved(undefined);
                    setSdkHostedBridgeHandle(null, options.storageV5);
                    setCurrentForKey(session, undefined);
                    registerLiveSuppressionProbe(undefined);
                    bridgeHandle = null;
                    bridgeAttached = false;
                    announcedCapabilities = undefined;
                    announcedModelOverride = undefined;
                    setReplBridgeActive(false);
                    try {
                      bridgeSession?.undo().catch(logError);
                    } catch (error) {
                      logError(error);
                    }
                    await previousHandle.teardown();
                  }
                  if (bridgeHandle)
                    sendControlResponseSuccess(message, bridgeAccountPayload(bridgeHandle, bridgeEpoch));
                  else {
                    let enableError;
                    let enableRecord;
                    let bridgeEpoch_2;
                    let messagesGrew = false;
                    let sliced = conversationRows.slice();
                    transcriptSnapshot = sliced.length > 0 ? sliced : undefined;
                    remoteForkSeed = transcriptSnapshot;
                    let declaredKinds = new Set();
                    let recordAtEnable = bridgeSdkController.armForEnable(declaredKinds);
                    if (typeof req.work_secret === "string" && req.work_secret && !bridgeSession)
                      pendingModeChoice = null;
                    bridgeSdkController.setLoginIdentity(
                      await readFreshOauthAccountFromDisk(options.storageV5).catch(() => {
                        return;
                      }),
                    );
                    let { initReplBridge, HEADLESS_BRIDGE_WORKSPACE_DIFF_COMPUTE_BUDGET } =
                      await import("../bridge/HEADLESS_BRIDGE_WORKSPACE_DIFF_COMPUTE_BUDGET.lazy.js");
                    let workSecret =
                      typeof req.work_secret === "string" && req.work_secret ? req.work_secret : undefined;
                    if (workSecret && !bridgeSession) {
                      let { createHeadlessWorkSecretSession } =
                        await import("../bridge/headlessWorkSecretSession.js");
                      bridgeSession ??= createHeadlessWorkSecretSession({
                        stores: reconnectStores,
                        storageV5: options.storageV5,
                        credentials: options.credentials,
                        getAppendSystemPrompt: () => options.appendSystemPrompt,
                        setAppendSystemPrompt: (appendSystemPrompt) => {
                          options.appendSystemPrompt = appendSystemPrompt;
                        },
                        sdkHostConfigs: () => sdkMcpServerConfigs,
                        awaitHostApplyQuiescence: () =>
                          resolved_4.then(
                            () => {
                              return;
                            },
                            () => {
                              return;
                            },
                          ),
                        permission: {
                          get: () => getAppState().toolPermissionContext,
                          set: (updater) =>
                            setAppState((prev) => ({
                              ...prev,
                              toolPermissionContext: updater(prev.toolPermissionContext),
                            })),
                        },
                        settleAutoModeAvailability: checkAutoModeTransitionTask,
                        applyModelPick,
                        applyEffortSeed,
                      });
                      if (pendingModeChoice) bridgeSession.noteModeChoice(pendingModeChoice);
                      pendingModeChoice = undefined;
                    }
                    let conversationRotated = bridgeSdkController.armedConversationRotated();
                    if (conversationRotated)
                      enableError =
                        "The conversation was cleared while Remote Control was being enabled; send the request again";
                    let newHandle = conversationRotated
                      ? null
                      : await initReplBridge({
                          recordAtEnable,
                          recordWriterHonorsServerVouch: true,
                          reportGateRefusalReason: true,
                          onProjectsBindingHint: () => {
                            bridgeSession?.resyncProjectsReplyMount();
                          },
                          onDialogKindsDeclared(kinds, source) {
                            logBridgeDialogKindsDeclared(declaredKinds, kinds, source, () => {
                              if (bridgeHandle) bridgeSdkController.persist(bridgeHandle);
                            });
                          },
                          tags: [REMOTE_CONTROL_SDK],
                          skipAutoTitle: isTerminalTitleSuppressed(),
                          remoteControlOrigin: "sdk",
                          getBackfillMessages: () =>
                            conversationRows.filter(
                              (row) =>
                                !(isCompactBoundaryOrSummary(row) && isCompactPairWithheldFromRemote()),
                            ),
                          getMessages: () => conversationRows,
                          isTurnActive: () => runState.running,
                          onGetContextUsage: emitContextUsage,
                          enableSessionPersistence:
                            isPersistentRemoteSessionEnabled() || isRemoteControlInternalEventsEnabled(),
                          storageV5: options.storageV5,
                          credentials: options.credentials,
                          onTransportRebuilt: forwardRateLimitToBridge,
                          getTools: () => buildBridgeToolsUpdate(getAppState()),
                          getToolPermissionContext: () => getAppState().toolPermissionContext,
                          host: session.host,
                          workspaceDiffComputeBudget: HEADLESS_BRIDGE_WORKSPACE_DIFF_COMPUTE_BUDGET,
                          getInitializeState: () => ({
                            current_model: getMainLoopModel(),
                            current_permission_mode: toExternalPermissionMode(
                              getAppState().toolPermissionContext.mode,
                            ),
                          }),
                          getCommands: () => logBridgeInitializeCommands(rewriteCommands()),
                          onClientInitialize: () => {
                            noteEffortChange("client_initialize", {
                              force: true,
                            });
                            announceBridgeState();
                          },
                          onQueuedNotification(notification) {
                            acceptQueuedNotification(notification, {
                              getAppState,
                              setAppState,
                              session,
                            });
                          },
                          async onInboundMessage(frame) {
                            let receivedAtMs = performance.now();
                            let previousResolved = resolved;
                            let resolveCurrent;
                            resolved = new Promise((resolve) => {
                              resolveCurrent = resolve;
                            });
                            try {
                              recordEarlierToolsUnknown(frame);
                              let fields = extractInboundMetadata(frame);
                              if (!fields) return;
                              let { uuid } = fields;
                              recordRemoteSurfaceSeen(fields.clientPlatform, options.storageV5);
                              let lane =
                                workSecret !== undefined && isHearthOrigin(fields.inboundOrigin)
                                  ? await classifyInboundLane(frame, fields)
                                  : undefined;
                              let origin = lane
                                ? lane.ingressOrigin
                                : classifyInboundOrigin(
                                    fields.content,
                                    fields.clientPlatform,
                                    fields.inboundOrigin,
                                    fields.receiverGroupingId,
                                    fields.slackOrigin,
                                    fields.activityObservation,
                                    fields.fromPlugin,
                                  );
                              let refinedOrigin = refineInboundOrigin(
                                origin,
                                fields.clientPlatform,
                                fields.inboundOrigin,
                              );
                              using ingest = messageQueue.beginInboundIngest(
                                isPeerOrSlackPing(origin) ? undefined : uuid,
                              );
                              await previousResolved;
                              await switchSerializerSlot.of(session).tail;
                              let inboundRefuseCause = getInboundRefuseCause(origin);
                              if (inboundRefuseCause !== undefined) {
                                logInboundRefused(
                                  "bridge:onInboundMessage: dropped before attachment materialization",
                                  inboundRefuseCause,
                                );
                                reportCommandRefused(structuredIO, uuid, "bridge");
                                return;
                              }
                              let inboundAttachments = extractInboundAttachments(frame);
                              let content = fields.content;
                              content = escapePluginTags(content, fields.inboundOrigin);
                              let inboxWakeFor = resolveInboxWakeFor(
                                content,
                                fields.inboundOrigin,
                                fields.wakeEnvelope,
                              );
                              let promptOrigin = promptOriginKind(fields.content);
                              if (!isPeerOrSlackPing(origin))
                                content = buildExternalEventRecord(
                                  content,
                                  fields.pastedContent,
                                  fields.inlinePastes,
                                );
                              let hookResult = await dispatchSessionReceiveHooks({
                                origin: originFromBridgeMetadata(origin ?? refinedOrigin),
                                content,
                                event: inboxWakeFor,
                              });
                              if (hookResult.consumed !== undefined) {
                                reportCommandRefused(structuredIO, uuid, "bridge");
                                return;
                              }
                              content = hookResult.content;
                              using queueing = hookResult.queueing;
                              let isSyntheticLane =
                                lane?.isSynthetic === true && !isProjectsRelay(refinedOrigin);
                              let resolved = await resolveAndPrepend(
                                frame,
                                content,
                                lane
                                  ? !lane.isSynthetic && origin?.kind === "human"
                                  : humanHintOrPlatform(origin, fields.clientPlatform, fields.inboundOrigin),
                                options.storageV5,
                                options.credentials,
                              );
                              let { content: content_2, inlinedImagePaths, missingFiles } = resolved;
                              let attributionKey = inheritedAttributionKey(uuid, {
                                isCrossSession: isGatedInbound({
                                  ingressOrigin: origin,
                                  inboundOrigin: fields.inboundOrigin,
                                  envelopePeer: hasTeammateMessageEnvelope(fields.content),
                                }),
                              });
                              let queueItem = {
                                value: content_2,
                                ...(promptOrigin !== undefined && {
                                  foreignWord: promptOrigin,
                                }),
                                mode: "prompt",
                                agentId: mainAgentId(),
                                uuid,
                                receivedAtMs,
                                ...(attributionKey && {
                                  turnAttributionKey: attributionKey,
                                }),
                                skipSlashCommands: true,
                                disallowedTools: [],
                                ...(inlinedImagePaths.length > 0 && {
                                  inlinedImagePaths,
                                }),
                                ...(inboundAttachments.length > 0 && {
                                  fileAttachments: inboundAttachments,
                                }),
                                ...(origin?.kind === "peer"
                                  ? {
                                      origin: stripPeerMessageBody(origin, content_2, fields.content),
                                      isMeta: true,
                                      skipAttachments: true,
                                      ...(hasVerifiedSlackHumanTurn(messageQueue) && {
                                        priority: "later",
                                      }),
                                    }
                                  : {
                                      bridgeOrigin: true,
                                      clientPlatform: fields.clientPlatform,
                                      ...(refinedOrigin &&
                                        !isSyntheticLane && {
                                          origin: refinedOrigin,
                                        }),
                                      ...textNotTypedFlags(frame, resolved),
                                      ...(isUltrathinkPrompt(frame) && {
                                        ultrathinkTyped: true,
                                      }),
                                      ...(refinedOrigin !== undefined &&
                                        !isHumanOrAutoContinuation(refinedOrigin) && {
                                          skipAttachments: true,
                                        }),
                                      ...(refinedOrigin?.kind === "task-notification" &&
                                        adjustInboundPriority(undefined, fields.clientPlatform) ===
                                          "later" && {
                                          priority: "later",
                                        }),
                                      ...(isChatPlatformHuman(
                                        fields.clientPlatform,
                                        fields.inboundOrigin,
                                      ) && {
                                        priority: resolveQueuePriority(
                                          undefined,
                                          fields.content,
                                          hasSlackLaterNotification(messageQueue),
                                        ),
                                        verifiedSlackHumanTurn: true,
                                      }),
                                      ...(lane && {
                                        ...lane.stamps,
                                        ...(lane.isSynthetic && {
                                          isMeta: true,
                                          skipAttachments: true,
                                        }),
                                        ...(lane.isRelayHuman && {
                                          priority: resolveQueuePriority(
                                            undefined,
                                            fields.content,
                                            hasSlackLaterNotification(messageQueue),
                                          ),
                                        }),
                                        ...(shouldStampThreadState({
                                          carrier: {
                                            origin: refinedOrigin,
                                            hearthRelayRows: lane.stamps.hearthRelayRows,
                                          },
                                          isPeer: false,
                                        }) && {
                                          stampThreadState: true,
                                        }),
                                      }),
                                    }),
                              };
                              let ownWordItem = markOwnWord(queueItem, true);
                              hostIngressLanes.mark(ownWordItem, "bridge");
                              let gateResult = gateInboundByOrigin(origin, ownWordItem);
                              if (gateResult !== "accept") {
                                if (gateResult === "refused")
                                  reportCommandRefused(structuredIO, uuid, "bridge");
                                return;
                              }
                              if (ingest.withdrawn()) {
                                let messageUuid = bridgeMessageUuid(uuid, "bridge");
                                if (messageUuid !== undefined)
                                  structuredIO.onCommandLifecycle?.(messageUuid, "cancelled");
                                return;
                              }
                              messageQueue.enqueue(ownWordItem);
                              if (lazySessionInboxPointers)
                                lazySessionInboxPointers.sessionInboxPointers.of(session).noteQueued({
                                  inboundOrigin: fields.inboundOrigin,
                                  wake: inboxWakeFor,
                                  uuid,
                                });
                              queueing.queued();
                              let queuedUuid = bridgeMessageUuid(uuid, "bridge");
                              if (queuedUuid !== undefined)
                                structuredIO.onCommandLifecycle?.(queuedUuid, "queued");
                              logBridgeAttachmentsMissing(
                                queuedUuid,
                                inboundAttachments.length,
                                missingFiles,
                              );
                              if (!runState.inputClosed) kickQueue();
                            } catch (error) {
                              logForDebugging(`[bridge:sdk] onInboundMessage failed: ${error}`, {
                                level: "error",
                              });
                            } finally {
                              previousResolved.then(resolveCurrent, resolveCurrent);
                            }
                          },
                          onPermissionResponse(response) {
                            return structuredIO.injectRemoteControlResponse(response);
                          },
                          onInterrupt() {
                            if (!isTerminalShutdown())
                              try {
                                runState.abortController?.abort(userAbortReason("remote-cancel"));
                                MODEL_SWITCH_STATE();
                                teardownAutoReactAndRooms({
                                  taskRegistry: createTaskFramework(getAppState, setAppState),
                                  setAppState,
                                  storageV5: options.storageV5,
                                });
                                handleControlRequest();
                                recordedAgentRun.notePersonsStop();
                              } catch (error) {
                                logError(error);
                                logFeatureBad("per_task_stop_sparing", "bridge_interrupt_sweep_throw");
                              }
                          },
                          onStopTask: (request) =>
                            stopTaskByUser(request, {
                              taskRegistry: createTaskFramework(getAppState, setAppState),
                              setAppState,
                              session,
                              getAppState,
                              source: "client",
                              storageV5: options.storageV5,
                            }),
                          onBackgroundTasks(toolUseId) {
                            let taskRegistry = createTaskFramework(getAppState, setAppState);
                            if (toolUseId !== undefined)
                              return backgroundTaskByToolUseId(toolUseId, taskRegistry);
                            backgroundAll(taskRegistry);
                            return true;
                          },
                          onCancelAsyncMessage: (requestId) =>
                            cancelQueuedThreadMessage({
                              targetUuid: requestId,
                              sender: "remote_client",
                              messageQueue,
                              prewaitLatch,
                              io: structuredIO,
                            }),
                          onSetModel: applyModelPick,
                          onSetMaxThinkingTokens: (tokens, display) =>
                            applyThinkingBudget(hasEffort, tokens, display),
                          onSetPermissionMode: (mode) => {
                            let result = setPermissionModeWithGuards(
                              mode,
                              getAppState().toolPermissionContext,
                              (updater) =>
                                setAppState((prev) => ({
                                  ...prev,
                                  toolPermissionContext: updater(prev.toolPermissionContext),
                                })),
                            );
                            if (result.ok) noteModeChoice(result.mode);
                            return result;
                          },
                          onApplyFlagSettings: (settings, requestId) => {
                            let mainLoopModel = getMainLoopModel();
                            let effortLevelOrNull = resolveEffortLevelOrNull(
                              mainLoopModel,
                              resolveEffortLevel(getAppState()),
                            );
                            let outcome = applyBridgeFlagSettings(settings, {
                              model: mainLoopModel,
                              getAppState,
                              setAppState,
                            });
                            if (!outcome.ok) return outcome;
                            let effortLevelOrNull_2 = resolveEffortLevelOrNull(
                              mainLoopModel,
                              resolveEffortLevel(getAppState()),
                            );
                            reportEffortForModel(mainLoopModel, getAppState());
                            reportBridgeEffortForRequest(requestId);
                            noteEffortChange("state_change", {
                              force: effortLevelOrNull_2 === effortLevelOrNull,
                            });
                            return {
                              ok: true,
                            };
                          },
                          onStateChange(state, detail, severity) {
                            if (
                              state === "connected" &&
                              transcriptSnapshot !== undefined &&
                              remoteForkSeed === transcriptSnapshot
                            )
                              remoteForkSeed = undefined;
                            if (state === "policy_disabled") {
                              enableError = detail;
                              enableRecord = "remote_control_policy_disabled";
                            } else if (state === "failed") {
                              enableError = detail;
                              enableRecord =
                                severity === undefined ||
                                policyDenyKind("allow_remote_control") === "cache_miss"
                                  ? undefined
                                  : remoteControlErrorCode(severity);
                              if (bridgeHandle) {
                                bridgeAttached = true;
                                setReplBridgeActive(false);
                                try {
                                  bridgeSession?.undo().catch(logError);
                                } catch (err) {
                                  logError(err);
                                }
                              }
                            } else if (state === "connected" || state === "ready") {
                              let wasAttached = bridgeAttached;
                              bridgeAttached = false;
                              if (bridgeHandle) {
                                setReplBridgeActive(true);
                                if (state === "connected" && wasAttached) {
                                  logBridgeRateLimitForward(bridgeHandle);
                                  noteEffortChange("reconnected", {
                                    force: true,
                                  });
                                  announceBridgeState();
                                  if (workSecret && bridgeSession) {
                                    let attachedHandle = bridgeHandle;
                                    Promise.resolve()
                                      .then(() => {
                                        if (bridgeHandle === attachedHandle && !bridgeAttached)
                                          bridgeSession?.apply(workSecret, attachedHandle);
                                      })
                                      .catch(logError);
                                  }
                                }
                              }
                              if (state === "connected" && messagesGrew) {
                                messagesGrew = false;
                                if (!runState.running) bridgeHandle?.sendResult();
                              }
                            }
                            logForDebugging(
                              `[bridge:sdk] State change: ${state}${detail ? ` \u2014 ${detail}` : ""}`,
                            );
                            publishBridgeSessionUrls(state, detail, bridgeEpoch_2, severity);
                          },
                          initialMessages: transcriptSnapshot,
                          initialName: req.name,
                          reattachSessionId:
                            typeof req.reattach_session_id === "string" ? req.reattach_session_id : undefined,
                          neverArchive: req.keep_session_on_exit === true,
                          workSecret,
                          onWorkSecretRefresh: (refresh) =>
                            structuredIO.requestRemoteControlWorkSecret(refresh),
                        });
                    if (!newHandle && remoteForkSeed === transcriptSnapshot) remoteForkSeed = undefined;
                    let priorMessageCount = sliced.length;
                    if (!newHandle) {
                      bridgeSdkController.enableFailed();
                      if (enableError !== undefined) controlError("remote_control", enableError);
                      sendControlError(
                        message,
                        pickForTransport(
                          session,
                          enableError ?? "Remote Control initialization failed",
                          "Remote Control initialization failed",
                        ),
                        enableRecord,
                      );
                    } else {
                      bridgeHandle = newHandle;
                      forwardedUuids = new Set(sliced.map((row) => row.uuid));
                      bridgeAttached = false;
                      bridgeEpoch_2 = ++bridgeEpoch;
                      try {
                        if (workSecret && bridgeSession) bridgeSession.apply(workSecret, newHandle);
                        else bridgeSession?.undo().catch(logError);
                      } catch (error) {
                        logError(error);
                      }
                      bridgeSdkController.attached(newHandle);
                      setReplBridgeActive(true);
                      setSdkHostedBridgeHandle(newHandle, options.storageV5);
                      setCurrentForKey(session, undefined);
                      registerLiveSuppressionProbe(
                        () => getSdkHostedBridgeHandle()?.noHistoryBackfill === true,
                      );
                      reportBridgePermissionMode(getAppState().toolPermissionContext.mode);
                      setInboundAvailabilityPublisher(reportBridgeCrossSessionInbound);
                      let mainLoopModel = getMainLoopModel();
                      reportBridgeModel(mainLoopModel);
                      reportEffortForModel(mainLoopModel, getAppState());
                      buildBridgeInitializeCommands(contextUsageInputs);
                      persistBridgeArtifactFrames(getAppState().frameUrls);
                      installRemoteEgressSuppressor();
                      forwardedCount = newHandle.noHistoryBackfill
                        ? Math.max(priorMessageCount, forwardedCount)
                        : Math.min(priorMessageCount, forwardedCount);
                      forwardTranscriptToBridge();
                      if (conversationRows.length > priorMessageCount) messagesGrew = true;
                      structuredIO.setOnControlRequestSent((request) => {
                        newHandle.sendControlRequest(request);
                      });
                      for (let pendingRequest of [
                        ...structuredIO.getPendingPermissionRequests(),
                        ...structuredIO
                          .getPendingUserDialogRequests()
                          .filter(
                            ({ request }) =>
                              request.subtype !== "request_user_dialog" ||
                              request.dialog_kind !== ENUM_PROMPT,
                          ),
                      ])
                        newHandle.sendControlRequest(pendingRequest);
                      structuredIO.setOnControlRequestResolved((requestId) => {
                        newHandle.sendControlCancelRequest(requestId);
                      });
                      emitBackgroundTasksChanged(getAppState());
                      logBridgeRateLimitForward(newHandle);
                      noteEffortChange("attach", {
                        force: true,
                      });
                      announceBridgeState();
                      sendControlResponseSuccess(message, bridgeAccountPayload(newHandle, bridgeEpoch_2));
                      if (!isLovelyUmbrellaOn()) watchBridgePolicy();
                    }
                  }
                } else {
                  await syncPluginsAtStartup();
                  sendControlResponseSuccess(message);
                }
              } catch (error) {
                if (remoteForkSeed === transcriptSnapshot) remoteForkSeed = undefined;
                if (!bridgeHandle) bridgeSdkController.enableFailed();
                sendControlErrorWithMeta(message, "remote_control", error);
              }
            });
            resolved_2 = enableTask;
            handleControlRequestAsync(() => enableTask);
          } else if (
            message.request.subtype === "register_device_hooks" ||
            message.request.subtype === "upload_device_hook_template"
          ) {
            let admission = options.deviceHooksAdmission ?? {
              admitted: false,
              reason: "not_managed_cloud_worker",
            };
            if (!admission.admitted) {
              logFeatureBad("device_hooks_register", admission.reason);
              sendControlError(message, `hook_forwarding_disabled: ${admission.reason}`);
            } else {
              deviceHooksWorker ??= import("../utils/hooks/deviceHooks/createDeviceHooksWorker.lazy.js")
                .then(async (deviceHooksWorkerModule) =>
                  deviceHooksWorkerModule.createDeviceHooksWorker(
                    await deviceHooksWorkerModule.productionDeviceHooksWorkerDeps({
                      projectRoot: getOriginalCwd,
                      cwd: getCwd,
                      workerEpoch: env.CLAUDE_CODE_WORKER_EPOCH,
                      sender: structuredIO,
                      toolAliases: () => options.toolAliases,
                    }),
                  ),
                )
                .catch((error) => {
                  deviceHooksWorker = undefined;
                  throw error;
                });
              try {
                let outcome = await (await deviceHooksWorker).handle(message);
                if (outcome.kind === "success") sendControlResponseSuccess(message, outcome.response);
                else sendControlError(message, outcome.error);
              } catch (error) {
                logForDiagnosticsNoPII("warn", "device_hooks_handler_failed", {});
                logError(error);
                logFeatureBad("device_hooks_register", "internal_error");
                sendControlError(message, "hook_forwarding_not_ready: internal_error; retry");
              }
            }
          } else if (message.request.subtype === "remote_tools_announce") {
            turnHandoffHandler ??= createRemoteToolsAnnounceHandler(
              options.remoteToolsAdmission ?? {
                admitted: false,
                reason: "not_managed_cloud_worker",
              },
              {
                workerEpoch: env.CLAUDE_CODE_WORKER_EPOCH,
                toolState,
                sender: structuredIO,
                mcpClients: () => getAppState().mcp.clients,
              },
            );
            await turnHandoffHandler(message.request, (outcome) => {
              if (outcome.kind === "success") sendControlResponseSuccess(message, outcome.response);
              else sendControlError(message, outcome.error);
            });
          } else if (message.request.subtype === "turn_handoff") {
            let internalMsgs = isParkedHolding(message);
            handleTurnHandoff(
              message.request,
              turnContext,
              (failureText) => sendSimpleControlError(message, failureText),
              rewindRequestAge(internalMsgs),
              serviceClockStoredAt(internalMsgs),
              inputLatency.phasesBeforeRead(sessionStreamReceivedAtMs(message), startTime),
              uuid,
              readDisallowedToolsMetadata(message),
            );
          } else
            sendControlError(
              message,
              `${UNSUPPORTED_CONTROL_SUBTYPE_TEXT}: ${sanitizeTelemetryString(String(message.request.subtype))}`,
            );
        } finally {
          if (uuid && !detached && message.request.subtype !== "mcp_tasks_changed")
            structuredIO.onCommandLifecycle?.(uuid, "completed");
          let startTime_2 = performance.now();
          let rounded = Math.round(startTime_2 - startTime);
          runState.turnStartClock.controlRequestEnded(startTime_2);
          inputLatency.note("control", startTime, startTime_2);
          if (timedOut || rounded >= PRINT_TIMING_CONSTANTS)
            logForDiagnosticsNoPII(timedOut ? "warn" : "info", "cli_control_request_handled", () => ({
              subtype: knownSubtypeOrUndefined(message.request.subtype),
              ms: rounded,
              detached,
              beside_loop_switch: readSwitchAtReconnect,
              ...(deadlineMs !== undefined && {
                deadline_ms: deadlineMs,
                timed_out: timedOut,
              }),
            }));
        }
        continue;
      } else if (message.type === "control_response") {
        if (options.replayUserMessages) output.enqueue(message);
        continue;
      } else if (message.type === "control_cancel_request") {
        let controller = handledOrphanedToolUseIds.get(message.request_id);
        logEvent("tengu_sdk_control_cancel_request", {
          in_flight: Boolean(controller),
        });
        controller?.abort(userAbortReason("remote-cancel"));
        continue;
      } else if (message.type === "keep_alive") continue;
      else if (message.type === "workflow_launch") {
        pendingWorkflowLaunches++;
        (async () => {
          let { handleWorkflowLaunchEvent } = await import("../services/workflows/workflowLaunchResume.js");
          await handleWorkflowLaunchEvent(message, await ensureWorkflowLaunch());
        })()
          .catch((error) => {
            logForDebugging(`[print.ts] workflow_launch handler failed: ${toError(error).message}`);
          })
          .finally(() => {
            pendingWorkflowLaunches--;
            if (!runState.running) timeoutMs.start();
          });
        continue;
      } else if (message.type === "update_environment_variables") continue;
      else if (message.type === "session_notice") {
        try {
          handleSessionNotice(message, {
            getAppState,
            setAppState,
            session,
            sessionHooks,
            isRemoteTransport: () => structuredIO.isRemoteTransport(),
            ingressTail: ingressTail_2,
            storageV5: options.storageV5,
            credentials: options.credentials,
          });
        } catch (error) {
          logError(error);
        }
        continue;
      } else if (message.type === "queued_notification") {
        if (!structuredIO.isRemoteTransport()) {
          logForDebugging(
            "[queued-notifications] queued_notification on a non-remote transport \u2014 dropping without ack",
            {
              level: "warn",
            },
          );
          logFeatureBad("ccr_queued_notifications", "not_remote_transport");
          continue;
        }
        try {
          let behindRunningTurn = runState.turnUnderWay;
          let accepted = acceptQueuedNotification(message, {
            getAppState,
            setAppState,
            session,
          });
          let webhook =
            accepted === undefined ? null : parseTriggerWebhookPayload(accepted.content, accepted.origin);
          if (accepted !== undefined && webhook !== null) {
            let commentPrompt = claudeDocCommentPrompt(webhook);
            if (commentPrompt !== null)
              appendToPendingNotification(accepted.notificationId, commentPrompt, setAppState);
            reportDurableCommentWake(webhook, {
              behindRunningTurn,
              carrier: "queued_notification",
              carrierId: accepted.notificationId,
              storageV5: options.storageV5,
            });
          }
        } catch (error) {
          logError(error);
        }
        continue;
      } else if (displayOnlyHistoric) {
        if (message.type === "user" && typeof message.uuid === "string")
          structuredIO.onCommandLifecycle?.(message.uuid, "completed");
        continue;
      } else if (message.type === "assistant" || message.type === "system") {
        try {
          let replayedRows = sdkMessagesToInternal([message]);
          conversationRows.push(...replayedRows);
        } catch (error) {
          logForDebugging(`Dropping malformed ${message.type} replay frame: ${errorMessage(error)}`, {
            level: "error",
          });
          continue;
        }
        if (message.type === "assistant" && options.replayUserMessages) {
          let { api_error_origin: apiErrorOrigin, ...rest } = message;
          output.enqueue(rest);
        }
        continue;
      }
      if (isUnclaimedSpare()) {
        output.enqueue(
          emitLoadError(getSessionId(), [
            getSpareClaimState() === "failed"
              ? "not_claimed: the claim of this spare failed; discard it and start the session normally"
              : "not_claimed: this process was started with --await-claim and has not been claimed; send claim_session before the first message",
          ]),
        );
        if (message.uuid) structuredIO.onCommandLifecycle?.(message.uuid, "completed");
        if (structuredIO.isLocallyPrependedMessage(message))
          enqueueResult?.({
            cannotQueue: "refused, the claim failed",
          });
        continue;
      }
      if (message.type === "bash_command") {
        handleRemoteBashCommand(
          message,
          {
            ...isParkedHolding(message),
            serviceNowAtMost: structuredIO.sessionServiceNowAtMost(),
            joinedAt: structuredIO.sessionStreamJoinedAt(),
            startedBefore: sessionStreamStartedBefore(message),
          },
          {
            session,
            sessionId: getSessionId(),
            receivedMessageUuids,
            worker: {
              hosting: detectWorkerHosting(),
              sessionKind: env.CLAUDE_CODE_SESSION_KIND,
              readsSessionStream: structuredIO instanceof RemoteIO,
            },
            running: bangRunner,
            abortController,
            emit: (frame) => output.enqueue(frame),
            started: (uuid) => structuredIO.onCommandLifecycle?.(uuid, "started"),
            completed: (uuid) => structuredIO.onCommandLifecycle?.(uuid, "completed"),
            acksConfirmed: () => structuredIO.flushDeliveryAcksConfirmed(),
            currentDirectory: getCwd,
            conversation,
            run: async (command, cwd, abortSignal) => {
              let { runHeadlessBashCommand } = await import("../utils/shell/headlessBash.js");
              return runHeadlessBashCommand({
                command,
                cwd,
                abortSignal,
                session,
              });
            },
          },
        );
        continue;
      }
      if (message.type !== "user") continue;
      let startTime = performance.now();
      let now = Date.now();
      let waits = {};
      if (userFrameIntake.dropMalformed(message)) continue;
      handlePrompt(true);
      let remoteTransport = structuredIO instanceof RemoteIO;
      let locallyPrepended = structuredIO.isLocallyPrependedMessage(message);
      let refetchMode = remoteTransport ? filesRefetchMode() : "off";
      if (message.uuid) {
        let sessionId = getSessionId();
        let plannedFetch;
        try {
          plannedFetch =
            refetchMode !== "off" &&
            !receivedMessageUuids.has(message.uuid) &&
            !refetchAttemptedUuids.has(message.uuid) &&
            turnInterruptionState?.kind === "interrupted_prompt" &&
            message.uuid === lastPromptUuid
              ? plannedFilePrompt(message, remoteTransport, locallyPrepended, "cut_off_prompt")
              : undefined;
        } catch (error) {
          logError(error);
          plannedFetch = undefined;
        }
        let fetchHold = plannedFetch === undefined ? undefined : fetchHoldRegistry.hold(message.uuid);
        let releasePlace =
          fetchHold !== undefined && wasInterruptedPrompt ? holdForFilesRefetch("cut_off_prompt") : undefined;
        let startTime = performance.now();
        let duplicateCheck = userFrameIntake.skipDuplicate(
          message.uuid,
          () => {
            if (options.replayUserMessages) {
              logForDebugging(`Sending acknowledgment for duplicate user message: ${message.uuid}`);
              let inboundAttachments = extractInboundAttachments(message);
              output.enqueue({
                type: "user",
                message: {
                  ...message.message,
                  content: escapedIngressPrompt(message, remoteTransport, locallyPrepended),
                },
                session_id: sessionId,
                parent_tool_use_id: null,
                uuid: message.uuid,
                timestamp: message.timestamp,
                isReplay: true,
                ...(inboundAttachments.length > 0 && {
                  file_attachments: inboundAttachments,
                }),
              });
            }
          },
          message,
        );
        let isDuplicate;
        try {
          isDuplicate = await duplicateCheck;
        } catch (error) {
          releasePlace?.();
          throw error;
        }
        waits.dedupMs = elapsedMs_2(startTime);
        if (!isDuplicate) wasInterruptedPrompt = false;
        if (
          isDuplicate &&
          refetchMode !== "off" &&
          message.uuid !== lastPromptUuid &&
          !refetchAttemptedUuids.has(message.uuid) &&
          redeliveryResolver.heldBack.includes(message.uuid) &&
          !redeliveryResolver.waitingToRun.includes(message.uuid)
        ) {
          try {
            plannedFetch = plannedFilePrompt(
              message,
              remoteTransport,
              locallyPrepended,
              "skipped_and_left_open",
            );
          } catch (error) {
            logError(error);
            plannedFetch = undefined;
          }
          if (plannedFetch !== undefined) releasePlace = holdForFilesRefetch("skipped_and_left_open");
        }
        if (isDuplicate && plannedFetch !== undefined) {
          refetchAttemptedUuids.add(message.uuid);
          refetchUserMessageFiles({
            uuid: message.uuid,
            ...plannedFetch,
            storedPrompt,
            conversation: conversationRows,
            releasePlaceInLine: releasePlace,
            settleColdFlags:
              refetchMode === "cold"
                ? () =>
                    (coldFlagSettle ??= awaitGrowthBookSettled({
                      uuid: matchRequestId(message.uuid),
                      for: "files_fetched_again",
                    }).finally(() => {
                      coldFlagSettle = undefined;
                    }))
                : undefined,
            stopping,
            storageV5: options.storageV5,
            credentials: options.credentials,
          })
            .then((refetched) => {
              if (refetched) fetchHold?.();
            })
            .catch(logError);
        } else {
          fetchHold?.();
          releasePlace?.();
        }
        if (isDuplicate) continue;
      }
      if (isRemoteCowork() && shouldAllowManagedPermissionRulesOnly())
        settingsChangeDetector.notifyChange("flagSettings");
      cancelPendingUserDialogs(structuredIO, "new_user_message");
      let promptContent = ingressPromptContent(message, remoteTransport, locallyPrepended);
      let clientPlatform = message.client_platform;
      let flagsSettled;
      if (
        remoteTransport &&
        (isHearthOrigin(message.inbound_origin) ||
          (!locallyPrepended && emailSenderTurnDetected(message, promptContent)))
      ) {
        let startTime = performance.now();
        flagsSettled = await awaitGrowthBookSettled({
          uuid: matchRequestId(message.uuid),
        });
        waits.flagSettleMs = elapsedMs_2(startTime);
      } else if (remoteTransport && !locallyPrepended && isSyntheticTriggerFrame(message)) {
        let startTime = performance.now();
        await takeOnce(() =>
          awaitGrowthBookSettled({
            uuid: matchRequestId(message.uuid),
          }),
        );
        waits.flagSettleMs = elapsedMs_2(startTime);
      }
      let isRelayHuman =
        remoteTransport &&
        !locallyPrepended &&
        checkEmailSenderTurn(
          message,
          promptContent,
          isSessionReceiveHooked({
            kind: "bridge",
          }),
        );
      let { ingressOrigin, peerFrom, hostPeer, nonPeerOrigin, queuedOrigin } = resolveIngressOrigins(
        message,
        promptContent,
        remoteTransport,
        locallyPrepended,
        flagsSettled,
        isRelayHuman,
      );
      let isPersonPrompt = isUserTypedTurn(message, {
        isRemoteIO: remoteTransport,
        isLocallyPrepended: locallyPrepended,
        peerFrom,
        projectsHumanEnabled:
          remoteTransport &&
          isProjectsHumanOriginEnabled({
            flagsSettled,
          }),
        wasStartedBefore:
          message.uuid !== undefined && structuredIO.userFrameStartedAtMs(message.uuid) !== undefined,
      });
      if (remoteTransport && isPersonPrompt && isDefinedHumanClientPlatform(clientPlatform))
        runSafely(applyBridgeChildCliEntrypoint);
      runSafely(() =>
        cancelDialogsOnNewPrompt(structuredIO, session.userPresence, isPersonPrompt, clientPlatform, "read"),
      );
      if (
        remoteTransport &&
        isPersonPrompt &&
        message.priority !== "now" &&
        parkedPermissions.inheritedPromptHoldCapable()
      ) {
        let startTime = performance.now();
        await awaitGrowthBookSettled({
          uuid: matchRequestId(message.uuid),
        });
        waits.flagSettleMs = (waits.flagSettleMs ?? 0) + elapsedMs_2(startTime);
        if (needsGrowthBookRefresh()) logFeatureSad("ccr_input_held_behind_prompt", "flags_cold");
      }
      let { messageIds, rows: rows_2, threadTs } = relayMessageMeta(message, nonPeerOrigin);
      if (remoteTransport && message.inbound_origin === HEARTH_AGENT)
        logProjectsRelayAdmission(message, nonPeerOrigin, rows_2);
      let isDesktopPrompt = isLocalDesktopPrompt({
        declared: message.seeded_summon,
        isRemoteIO: remoteTransport,
        isSynthetic: message.isSynthetic,
        peerDelivered: peerFrom !== undefined,
        inboundOrigin: message.inbound_origin,
        clientPlatform,
      });
      let initiator = remoteTransport ? undefined : initiatorOfFrame(message);
      let byKnownHuman = ingressOrigin
        ? isKnownHumanOrigin(
            message.inbound_origin,
            isProjectsHumanOriginEnabled({
              flagsSettled,
            }),
            isRelayHuman,
          )
        : isChatPlatformHuman(clientPlatform, message.inbound_origin);
      let humanComposed = isHumanComposedFrame(message, peerFrom);
      maybeTitleFromUserMessage(
        {
          content: promptContent,
          uuid: message.uuid,
          origin: nonPeerOrigin,
          queuedOrigin,
          dispatchesSlashCommands: !humanComposed,
          peerFrom,
          isSynthetic: message.isSynthetic,
          shouldQuery: message.shouldQuery,
        },
        hostSessionOps,
      );
      let inboundAttachments = extractInboundAttachments(message);
      let ccrTurnId = pickTurnIdForRelay(message, {
        isRelayHuman: byKnownHuman,
      });
      let gated = isGatedInbound({
        ingressOrigin,
        inboundOrigin: message.inbound_origin,
        envelopePeer: hostPeer !== undefined || hasTeammateMessageEnvelope(promptContent),
      });
      let attributionKey = inheritedAttributionKey(message.uuid, {
        isCrossSession: gated,
      });
      let viewFlags = isMergeMessage(
        message,
        isRemoteNonInteractiveNonCcsSession() &&
          isViewOwningSdkMessage(message, {
            isPersons: isHumanIngressFrame(message, {
              ingressOrigin,
              isRemoteIO: remoteTransport,
              peerFrom,
            }),
            isCrossSession: gated,
            originKind: nonPeerOrigin?.kind,
          }),
      );
      applyWidgetToolStates(session, message, viewFlags);
      let cloudBrowserTurnId = withCloudBrowserTurnId(message, {
        isRemoteIO: remoteTransport,
        isLocallyPrepended: locallyPrepended,
        isRelayHuman: byKnownHuman,
        peerFrom,
        isCrossSession: gated,
      });
      let cloudTurn;
      if (cloudBrowserTurnId !== undefined) {
        let { admitted, flagSettleMs } = await admitCloudBrowserTurnId({
          uuid: matchRequestId(message.uuid),
        });
        cloudTurn = admitted ? cloudBrowserTurnId : undefined;
        if (flagSettleMs !== undefined) waits.flagSettleMs = (waits.flagSettleMs ?? 0) + flagSettleMs;
      }
      let traceContext = env.CLAUDE_CODE_REMOTE
        ? extractCcrTraceContext(message, {
            isCrossSession: gated,
          })
        : undefined;
      let queuePriority = queuePriorityOrUndefined(message.priority);
      let priority = peerFrom
        ? downgradePriorityIfBusy(queuePriority, hasVerifiedSlackHumanTurn(messageQueue))
        : nonPeerOrigin?.kind === "task-notification"
          ? adjustInboundPriority(
              queuePriority,
              clientPlatform,
              message.inbound_origin,
              triggerFireReasonOf(message),
            )
          : byKnownHuman
            ? resolveQueuePriority(queuePriority, promptContent, hasSlackLaterNotification(messageQueue))
            : queuePriority;
      let isPeerPrompt = peerFrom !== undefined && !remoteTransport;
      let fromMode =
        isPeerPrompt &&
        message.origin?.kind === "peer" &&
        (message.origin.fromMode === "bypass" || message.origin.fromMode === "prompting")
          ? message.origin.fromMode
          : undefined;
      if (
        dropBeforeAttachments({
          io: structuredIO,
          uuid: message.uuid,
          peerFrom,
          hostInjectedPeer: isPeerPrompt,
          ingressOrigin,
          declaredPeerDenyList: hostPeer !== undefined && hasDeclaredDisallowedTools(message),
        })
      )
        continue;
      let promptText = escapePromptUnlessDisabled(
        promptContent,
        remoteTransport,
        locallyPrepended,
        message.inbound_origin,
      );
      let fromPeerOrServer = peerFrom !== undefined || (remoteTransport && !locallyPrepended);
      let inboxWakeFor = resolveInboxWakeFor(
        promptText,
        remoteTransport && peerFrom === undefined ? message.inbound_origin : undefined,
        message.wake_envelope,
      );
      let pointer = parseTriggerWebhookPayload(
        promptText,
        remoteTransport && peerFrom === undefined && !locallyPrepended ? message.inbound_origin : undefined,
      );
      let commentSuffix = pointer === null ? null : claudeDocCommentPrompt(pointer);
      if (commentSuffix !== null && typeof promptText === "string")
        promptText = `${promptText}

${commentSuffix}`;
      let promptOrigin = promptOriginKind(promptContent);
      if (peerFrom === undefined && !isPeerOrSlackPing(ingressOrigin))
        promptText = buildExternalEventRecord(
          promptText,
          "pasted_content" in message ? message.pasted_content : undefined,
          "inline_pastes" in message ? message.inline_pastes : undefined,
        );
      let queueing;
      if (fromPeerOrServer) {
        let startTime = performance.now();
        let content = promptText;
        let origin = originFromBridgeMetadata(
          ingressOrigin ??
            (peerFrom === undefined
              ? queuedOrigin
              : {
                  kind: "peer",
                }),
        );
        let dispatchHooks = () =>
          dispatchSessionReceiveHooks({
            origin,
            content,
            event: inboxWakeFor,
          });
        let hookOutcome = hasModuleHookingSite("session.receive", {
          origin,
        })
          ? await awaitPendingPermissionAnswers(dispatchHooks, {
              loopInput: heldInputReader,
              io: structuredIO,
              urgencyOf: (frame) => {
                if (frame.type !== "control_request") return;
                let { request } = frame;
                if (request.subtype === "end_session")
                  return isArchivedAfterRestartNow(request.reason) ? undefined : "end";
                return request.subtype === "interrupt" && !isImmediateInterruptRequest(request)
                  ? "stop"
                  : undefined;
              },
              onLate: (frame) => frame.queueing?.[Symbol.dispose](),
            })
          : {
              received: await dispatchHooks(),
            };
        waits.receiveHookMs = elapsedMs_2(startTime);
        if (hookOutcome === "given-up") {
          logForDebugging(
            `session.receive: hooks (${pluginsMatchingEvent("session.receive", {
              origin,
            }).join(
              "+",
            )}) still held message ${message.uuid} ${PENDING_PERMISSION_ANSWER_GRACE_MS} ms after the session's end: left to the next worker, not queued`,
            {
              level: "warn",
            },
          );
          let messageUuid = bridgeMessageUuid(message.uuid, "stdin");
          if (messageUuid !== undefined) structuredIO.onCommandLifecycle?.(messageUuid, "discarded");
          continue;
        }
        let { received } = hookOutcome;
        if (received.consumed !== undefined) {
          reportCommandRefused(structuredIO, message.uuid, "stdin");
          continue;
        }
        promptText = received.content;
        queueing = received.queueing;
      }
      using filesFetching = turnAbort.promptsFetchingFiles.begin({
        fileCount: inboundAttachments.length,
        peerFrom,
        origin: queuedOrigin,
        shouldQuery: message.shouldQuery,
        reRun: message.uuid !== undefined && userFrameIntake.isReRun(message.uuid),
      });
      let startTime_2 = performance.now();
      let downloadStage =
        inboundAttachments.length > 0 ? stagedFilesWaiter.aroundDownload(startTime_2) : undefined;
      let { resolving, queuedAheadOfFiles, frameAdmission } = fetchUserPromptFiles({
        aheadOfFiles: readAheadOfFiles(remoteTransport),
        attachments: inboundAttachments,
        resolveArguments: [
          message,
          promptText,
          {
            ingressOrigin,
            isRemoteIO: remoteTransport,
            peerFrom,
          },
          options.storageV5,
          options.credentials,
        ],
        sessionHooks,
      });
      let filesResolved = await resolving;
      let { content, inlinedImagePaths, imageFileUuids } = filesResolved;
      waits.attachments = {
        ms: elapsedMs_2(startTime_2),
        count: inboundAttachments.length,
        inlinedImages: inlinedImagePaths.length,
        ...(queuedAheadOfFiles && {
          aheadOfFiles: true,
        }),
        stages: downloadStage?.(),
      };
      let shouldStampThread =
        remoteTransport &&
        message.shouldQuery !== false &&
        shouldStampThreadState({
          carrier: {
            origin: queuedOrigin,
            hearthRelayRows: rows_2,
          },
          isPeer: peerFrom !== undefined,
        });
      let classifyInput = {
        declared: message.seeded_summon,
        isSynthetic: message.isSynthetic,
        peerDelivered: peerFrom !== undefined,
        inboundOrigin: message.inbound_origin,
        value: content,
        shouldQuery: message.shouldQuery,
        hasAttachments: inboundAttachments.length > 0 || inlinedImagePaths.length > 0,
      };
      let threadKind = classifyArtifactThreadMessage(classifyInput);
      let turnStamp = withdrawnFileUuidsOf(message, {
        ingressOrigin,
        isRemoteIO: remoteTransport,
        peerFrom,
      });
      let picturesToHide =
        isPersonPrompt && message.priority === undefined && message.inbound_origin === undefined
          ? fillPicturesToHide(structuredIO.sessionState, turnStamp)
          : undefined;
      let message_2 = {
        mode: "prompt",
        agentId: mainAgentId(),
        value: content,
        ...(promptOrigin !== undefined && {
          foreignWord: promptOrigin,
        }),
        ...(shouldStampThread && {
          stampThreadState: true,
        }),
        ...(inlinedImagePaths.length > 0 && {
          inlinedImagePaths,
        }),
        ...(imageFileUuids && {
          imageFileUuids,
        }),
        ...(filesResolved.writtenFiles && {
          savedFiles: filesResolved.writtenFiles,
        }),
        ...turnStamp,
        ...(picturesToHide && {
          picturesToHide,
        }),
        uuid: message.uuid,
        ...(attributionKey && {
          turnAttributionKey: attributionKey,
        }),
        ...(traceContext && {
          traceContext,
        }),
        priority,
        shouldQuery: message.shouldQuery,
        ...(remoteTransport &&
          typeof message.inbound_origin === "string" &&
          message.inbound_origin !== "" && {
            inboundOrigin: message.inbound_origin,
          }),
        ...(message.isSynthetic && {
          isMeta: true,
        }),
        ...(inboundAttachments.length > 0 && {
          fileAttachments: inboundAttachments,
        }),
        disallowedTools: peerFrom ? [] : readDisallowedToolsMetadata(message),
        ...(peerFrom === undefined &&
          !(remoteTransport && isTurnDisallowedToolName(message.inbound_origin)) &&
          (!locallyPrepended || structuredIO.isPersonsOwnPrepend(message)) && {
            replacesDisallowedTools: true,
          }),
        ...(peerFrom
          ? {
              origin: stripPeerMessageBody(
                ingressOrigin?.kind === "peer"
                  ? ingressOrigin
                  : {
                      kind: "peer",
                      ...hostPeer,
                      from: peerFrom,
                      ...peerMessageInfo(promptContent),
                      ...(isPeerPrompt && {
                        hostInjected: true,
                        fromMode,
                      }),
                    },
                content,
                promptContent,
              ),
              isMeta: true,
              skipAttachments: true,
            }
          : {
              clientPlatform,
              ...(queuedOrigin && {
                origin: queuedOrigin,
              }),
              ...(isDesktopPrompt && {
                seededSummon: true,
              }),
              ...(threadKind !== undefined && {
                artifactCommentTurn: threadKind,
              }),
              ...(initiator !== undefined && {
                hostInitiator: initiator,
              }),
              ...(isPlainUserMessageEnvelope(message) && {
                declaresNoSender: true,
              }),
              ...(viewFlags.namesViews && {
                namesWidgetViews: true,
              }),
              ...textNotTypedFlags(message, filesResolved),
              ...ingressSubmitFlags({
                message,
                isRemoteIO: remoteTransport,
                isRelayHuman: byKnownHuman,
                queuedOrigin,
                nonPeerOrigin,
                foreignWord: promptOrigin,
              }),
              ...(isUltrathinkPrompt(message) && {
                ultrathinkTyped: true,
              }),
              ...(isRelayHuman && {
                skipAttachments: true,
              }),
              ...((typeof message.uuid !== "string" ||
                structuredIO.userFrameStartedAtMs(message.uuid) !== undefined) && {
                ccrProgramUseCaseId: undefined,
              }),
              ...(messageIds && {
                hearthRelayMessageIds: messageIds,
              }),
              ...(rows_2 && {
                hearthRelayRows: rows_2,
              }),
              ...(threadTs && {
                hearthRelayThreadTs: threadTs,
              }),
              ...isPeerOrigin({
                isRelayHuman: byKnownHuman,
                isSynthetic: message.isSynthetic,
                ccrTurnId,
                isProjectsUser: isHearthHuman(message.inbound_origin),
                emailSenderTurn: isRelayHuman ? emailSenderModeOf(message) : undefined,
                turnEffortCap: remoteTransport ? message.turn_effort_cap : undefined,
              }),
              ...(cloudTurn !== undefined && {
                ccrTurnId: cloudTurn,
                ccrTurnIdEndsWithTurn: true,
              }),
            }),
        ...(humanComposed && {
          skipSlashCommands: true,
        }),
      };
      let ownWordItem = structuredIO.isPersonsOwnPrepend(message)
        ? withOwnWordStopKey(message_2)
        : markOwnWord(message_2, !locallyPrepended);
      let resumeAgentThread = async (target, prev) => {
        takeSeededSummon(ownWordItem);
        let resumed = false;
        try {
          resumed = await resumeArtifactThreadAgent(target, {
            exiting:
              runState.endSessionRequested ||
              isShuttingDown() ||
              isTerminalShutdown() ||
              hasReachedBudget(options.maxBudgetUsd),
            canUseTool,
            storageV5: options.storageV5,
            onLifecycle: (lifecycle) => {
              if (message.uuid !== undefined) structuredIO.onCommandLifecycle?.(message.uuid, lifecycle);
            },
          });
        } catch (error) {
          logError(toError(error));
        }
        if (!resumed) return true;
        if (options.replayUserMessages && message.uuid !== undefined)
          output.enqueue({
            type: "user",
            message: {
              role: "user",
              content,
            },
            session_id: getSessionId(),
            parent_tool_use_id: null,
            uuid: message.uuid,
            timestamp: message.timestamp ?? new Date().toISOString(),
            isReplay: true,
            isSynthetic: false,
          });
        prev?.queued();
        return false;
      };
      let serverOwnedIdle = locallyPrepended && runState.dequeueCount === 0;
      let receivedAtMs =
        message.uuid === undefined ? undefined : structuredIO.userFrameReceivedAtMs(message.uuid);
      let receivedWallMs =
        message.uuid === undefined ? undefined : structuredIO.takeUserFrameReceivedWallMs(message.uuid);
      let accepted = userFrameIntake.acceptUserFrame({
        frame: message,
        parsedAtMs: startTime,
        waits,
        receivedWallMs,
        receivedAtMs,
        aheadOfRead:
          receivedWallMs === undefined
            ? undefined
            : inputLatency.split(startTime - (now - receivedWallMs), startTime),
        command: ownWordItem,
        queueing,
        ownFirstTurnMessage: serverOwnedIdle,
        admit: (prev) => {
          if (
            !acceptStdinPeerMessage({
              io: structuredIO,
              hostIngressLanes,
              command: ownWordItem,
              uuid: message.uuid,
              peerFrom,
              hostInjectedPeer: isPeerPrompt,
              ingressOrigin,
            })
          ) {
            frameAdmission(false);
            return false;
          }
          let artifactThreadHeader = readArtifactThreadHeader(classifyInput);
          if (artifactThreadHeader !== null) return resumeAgentThread(artifactThreadHeader, prev);
          wakeRouter.takeBeforeEnqueue(ownWordItem);
          return true;
        },
        beforeEnqueue: (snapshot) => {
          let frameState = unattendedStart?.takeFrame(message.uuid, {
            reRun: message.uuid !== undefined && userFrameIntake.isReRun(message.uuid),
            ownLine: locallyPrepended,
            person: peerFrom === undefined && isHumanOrigin(queuedOrigin) && message.shouldQuery !== false,
          });
          if (frameState !== undefined) snapshot.startedBy = frameState;
        },
        afterEnqueue: () => {
          if (isPersonPrompt)
            runSafely(() =>
              cancelDialogsOnNewPrompt(structuredIO, session.userPresence, true, clientPlatform, "enqueue"),
            );
          wakeRouter.press(ownWordItem);
          runImmediateSlashCommand(ownWordItem, {
            drain: runState,
            io: structuredIO,
            commands: otherCommands,
            closing: () =>
              getAppState().endedByModel === true ||
              runState.endSessionRequested ||
              isShuttingDown() ||
              isTerminalShutdown() ||
              hasReachedBudget(options.maxBudgetUsd),
            queue: messageQueue,
            sayRanAhead: (error) =>
              output.enqueue({
                type: "command_lifecycle",
                command_uuid: error,
                state: "queued",
                ran_ahead: true,
                uuid: randomUUID(),
                session_id: getSessionId(),
              }),
          });
          frameAdmission(true);
          if (message.shouldQuery !== false) stagedFilesWaiter.resetBegun();
          if (serverOwnedIdle)
            enqueueResult?.({
              queued: message.message.content,
            });
          if (lazySessionInboxPointers && remoteTransport)
            lazySessionInboxPointers.sessionInboxPointers.of(session).noteQueued({
              inboundOrigin: message.inbound_origin,
              wake: inboxWakeFor,
              uuid: message.uuid,
            });
          let threadAck = peerFrom
            ? null
            : parseArtifactFollowupAck(message, {
                isRelayHuman: byKnownHuman,
              });
          if (threadAck !== null)
            codeliverArtifactFollowup({
              stamp: threadAck,
              content,
              hasAttachments: inboundAttachments.length > 0 || inlinedImagePaths.length > 0,
              exiting:
                runState.endSessionRequested ||
                isShuttingDown() ||
                isTerminalShutdown() ||
                hasReachedBudget(options.maxBudgetUsd),
              toolUseContext: getLastCacheSafeParams()?.toolUseContext ?? null,
              canUseTool,
              agentNames: getAppState().agentNameRegistry,
              messageQueue,
              priority,
              ccrTurnId,
              copyUuid: typeof message.uuid === "string" ? message.uuid : undefined,
            });
          consumeSeededSummon(ownWordItem);
          if (pointer !== null)
            reportDurableCommentWake(pointer, {
              behindRunningTurn: runState.turnUnderWay,
              carrier: "user_message",
              carrierId: message.uuid,
              storageV5: options.storageV5,
            });
        },
        beforeKick: () => {},
      });
      if (accepted) await accepted;
      inputLatency.note("user", startTime, performance.now());
    }
    handbackPending = true;
    enqueueResult?.({
      cannotQueue: "the input ended first",
    });
    let idleWait = unknownResponseHold.whenIdle();
    if (idleWait !== undefined) await idleWait;
    await userFrameIntake.closeInput(async () => {
      markPrintInputClosed();
      if (!runState.running && messageQueue.peek(isDrainableMainThreadCommand) === undefined)
        releaseStartupWork(session.host, "input_closed");
      abortController.abort();
      if (runState.running || teamLeadPoller.pollActive()) return;
      heldBackResult?.stop();
      heldBackResult = null;
      requestTeardownUnwind();
      stopBudgetPoll();
      if ((await parkForTeamTeardown()) === "handed-off") return;
      await settleSuggestions();
    });
  })().catch(onCrashPayload);
  return output;
}
//@ chunk-0yw3taqg.js:898487-898598 layout
/**
 * -p 是否需要等待显式 --mcp-config 服务器连接完成（有非 sdk 服务器时）。
 */
function explicitMcpConfigRequestsWait(configs, bridgeCarrier, waitMs) {
  if (bridgeCarrier) return waitMs > 0;
  return (
    !startupCcrEnv.isBridgeCarrierChild && Object.values(configs).some((config) => config.type !== "sdk")
  );
}
//@ chunk-0yw3taqg.js:898598-898656 layout
/**
 * 中继模式下 MCP 等待剩余时间（不少于下限）。
 */
function relayMcpWaitLeft(elapsedMs, budgetMs, now) {
  return Math.max(TRANSPORT_FALLBACK_TIMEOUT_MS, Math.round(elapsedMs + budgetMs - now));
}
//@ chunk-0yw3taqg.js:898656-901772 fingerprint (2.1.88 match: createCanUseToolWithPermissionPrompt, 0.361)
/**
 * 包装 canUseTool：规则判定为 ask 时转给 --permission-prompt-tool 指定的 MCP 工具；工具不可用时拒绝并说明。
 */
function createCanUseToolWithPermissionPrompt(permissionPromptTool, isServerSwept = () => false) {
  let canUseTool = async (tool, input, toolUseContext, assistantMessage, toolUseId, forceDecision) => {
    let decision =
      forceDecision ??
      (await hasPermissionsToUseTool(tool, input, toolUseContext, assistantMessage, toolUseId));
    if (decision.behavior === "allow" || decision.behavior === "deny") return decision;
    let personOnlyDenial = noPromptSurfaceDenialIfPersonOnly(
      tool,
      decision,
      input,
      toolUseContext,
      toolUseId,
    );
    if (personOnlyDenial !== undefined) return personOnlyDenial;
    if (permissionPromptTool === null || isServerSwept())
      return {
        behavior: "deny",
        message:
          "The permission prompt tool is no longer available \u2014 its MCP server is not connected in this session.",
        decisionReason: CAN_USE_TOOL_PROMPT_TOOL_GONE_DENY_REASON,
      };
    let promptToolName = permissionPromptTool.name;
    let cloudBrowserDeny = () => ({
      behavior: "deny",
      message: `${tool.name} was not run. The permission prompt tool ${promptToolName} is a tool of MCP server 'remote-browser', and in this session that server's tools can't answer permission requests, because nothing would check the call to it. To have these requests answered, set --permission-prompt-tool to a tool of another MCP server.`,
      decisionReason: CAN_USE_TOOL_PROMPT_TOOL_IS_CLOUD_BROWSER_DENY_REASON,
    });
    if (isRemoteBrowserToolUnderModeFloor(permissionPromptTool)) return cloudBrowserDeny();
    if (isHostWordedAsk(decision))
      return forwardHostWordedAsk(
        tool.name,
        "the configured --permission-prompt-tool (a tool_name+input wire)",
        {
          hostWorded: decision.hostDisplay !== undefined,
          forMcpSkill: decision.metadata?.mcpSkill !== undefined,
        },
      );
    let updatedInput = decision.updatedInput ?? input;
    let { signal: combinedSignal, cleanup: cleanupAbortListener } = createCombinedAbortSignal(
      toolUseContext.abortController.signal,
    );
    if (combinedSignal.aborted) {
      cleanupAbortListener();
      return {
        behavior: "deny",
        message: "Permission prompt was aborted.",
        decisionReason: CAN_USE_TOOL_ABORTED_DENY_REASON,
      };
    }
    let abortPromise = new Promise((resolve) => {
      combinedSignal.addEventListener("abort", () => resolve("aborted"), {
        once: true,
      });
    });
    let toolSettled = false;
    let hookRace =
      toolUseContext.forRemoteExecution === true || decision.personOnly === true
        ? new Promise(() => {})
        : executePermissionRequestHooksForSDK(
            applyPermissionAnswerChanges,
            tool,
            toolUseId,
            updatedInput,
            toolUseContext,
            decision.suggestions,
            decision,
            () => toolSettled || combinedSignal.aborted,
          ).then(
            (hookOutcome) =>
              hookOutcome
                ? {
                    hookOutcome,
                  }
                : new Promise(() => {}),
            (error) => {
              if (isAbortError(error)) logForDebugging("permission prompt tool hook race aborted");
              else logError(toError(error));
              return new Promise(() => {});
            },
          );
    let scopedAbort = new PromptScopedAbortController(toolUseContext.abortController);
    let toolCall = permissionPromptTool
      .call(
        {
          tool_name: tool.name,
          input: updatedInput,
          tool_use_id: toolUseId,
        },
        {
          ...toolUseContext,
          abortController: scopedAbort,
          permissionRound: undefined,
        },
        canUseTool,
        assistantMessage,
      )
      .then((toolResult) => {
        toolSettled = true;
        return {
          toolResult,
        };
      });
    toolCall.catch(() => {
      toolSettled = true;
    });
    let raceResult = await Promise.race([toolCall, abortPromise, hookRace]);
    cleanupAbortListener();
    scopedAbort.abort();
    if (raceResult === "aborted" || combinedSignal.aborted)
      return {
        behavior: "deny",
        message: "Permission prompt was aborted.",
        decisionReason: CAN_USE_TOOL_ABORTED_DENY_REASON,
      };
    if ("hookOutcome" in raceResult) {
      let { decision, interrupt } = raceResult.hookOutcome;
      if (interrupt) {
        logForDebugging(`Hook interrupt: tool=${tool.name} hookMessage=${decision.message}`);
        turnAbortControllerOf(toolUseContext.abortController).abort();
      }
      return decision;
    }
    let result = raceResult.toolResult;
    if (isRemoteBrowserToolUnderModeFloor(permissionPromptTool)) return cloudBrowserDeny();
    let permissionToolResultBlockParam = permissionPromptTool.mapToolResultToToolResultBlockParam(
      result.data,
      "1",
    );
    if (
      !permissionToolResultBlockParam.content ||
      !Array.isArray(permissionToolResultBlockParam.content) ||
      !permissionToolResultBlockParam.content[0] ||
      permissionToolResultBlockParam.content[0].type !== "text" ||
      typeof permissionToolResultBlockParam.content[0].text !== "string"
    )
      throw Error(
        'Permission prompt tool returned an invalid result. Expected a single text block param with type="text" and a string text value.',
      );
    let parsed = permissionPromptResultSchemaRefusing().safeParse(
      safeParseJSON(permissionToolResultBlockParam.content[0].text),
    );
    if (!parsed.success) {
      logForDebugging(
        `Permission prompt tool returned a schema-invalid result for ${tool.name}: ${parsed.error.message.slice(0, 2000)}`,
        {
          level: "error",
        },
      );
      return {
        behavior: "deny",
        message: `The permission prompt tool returned an invalid permission result. ${PERMISSION_PROMPT_RESULT_FORMAT_HINT}`,
        decisionReason: CAN_USE_TOOL_INVALID_RESULT_DENY_REASON,
      };
    }
    let promptResult = parsed.data;
    if (promptResult.behavior === "allow" && requiresConnectorGrant_2(tool)) {
      let answerRefusal = promptToolAllowDenyReason(tool);
      return {
        behavior: "deny",
        message: answerRefusal.reason,
        decisionReason: answerRefusal,
      };
    }
    if (promptResult.behavior === "allow" && isMcpTool(tool) && tool.requiresUserInteraction?.())
      return {
        behavior: "deny",
        message: "MCP tool requires user interaction; not supported via --permission-prompt-tool",
        decisionReason: PROMPT_TOOL_ALLOW_FLAGGED_MCP_DENY_REASON,
      };
    return permissionPromptToolResultToPermissionDecision(
      applyPermissionAnswerChanges,
      promptResult,
      permissionPromptTool,
      updatedInput,
      toolUseContext,
      tool,
      decision.suppressAlwaysAllowRule === true,
      false,
    );
  };
  return setPermissionPromptHostProbe(
    "promptTool",
    canUseTool,
    () => permissionPromptTool !== null && !isServerSwept(),
  );
}
//@ chunk-0yw3taqg.js:901772-901895 file-local
function messageHasToolUseId(assistantMessage, toolUseId) {
  let content = assistantMessage?.message?.content;
  if (!Array.isArray(content)) return false;
  return content.some((contentBlock) => contentBlock.type === "tool_use" && contentBlock.id === toolUseId);
}
//@ chunk-0yw3taqg.js:901895-902205 layout
/**
 * --permission-prompt-tool 找不到或不是 MCP 工具时的遥测消息模板（工具名脱敏）。
 */
var PERMISSION_PROMPT_TOOL_NOT_FOUND_TELEMETRY_MESSAGE =
  "Error: MCP tool <redacted> (passed via --permission-prompt-tool) not found. Available MCP tools: <redacted>";
var PERMISSION_PROMPT_TOOL_NOT_FOUND_NO_MCP_TOOLS_TELEMETRY_MESSAGE =
  "Error: MCP tool <redacted> (passed via --permission-prompt-tool) not found. Available MCP tools: none";
var PERMISSION_PROMPT_TOOL_NOT_MCP_TELEMETRY_MESSAGE =
  "Error: tool <redacted> (passed via --permission-prompt-tool) must be an MCP tool";
//@ chunk-0yw3taqg.js:902205-903301 fingerprint (2.1.88 match: getCanUseToolFn, 0.828)
/**
 * 根据输入格式与 --permission-prompts 选择 canUseTool：stdio 走 StructuredIO 请求宿主，none 自动拒绝，否则走权限提示工具。
 */
function getCanUseToolFn(
  permissionPromptToolName,
  headlessIO,
  getMcpTools,
  onPermissionPrompt,
  promptToolState,
  permissionPrompts,
) {
  let noPromptHost = isNoPromptHost(permissionPrompts);
  if (!noPromptHost && permissionPromptToolName === "stdio") {
    let stdioCanUseTool = headlessIO.createCanUseTool(applyPermissionAnswerChanges, onPermissionPrompt);
    return isVsCodeOrDesktop() ? setPermissionPromptPerson(stdioCanUseTool) : stdioCanUseTool;
  }
  if (noPromptHost || !permissionPromptToolName)
    return async (tool, input, toolUseContext, assistantMessage, toolUseId, forceDecision) => {
      let permissionDecision =
        forceDecision ??
        (await hasPermissionsToUseTool(tool, input, toolUseContext, assistantMessage, toolUseId));
      let effectiveDecision =
        permissionDecision.behavior === "ask" && (noPromptHost || !forceDecision)
          ? ((permissionDecision.personOnly === true
              ? null
              : await consultPermissionRequestHooksForUnpromptableAsk(
                  applyPermissionAnswerChanges,
                  tool,
                  input,
                  permissionDecision,
                  toolUseId,
                  toolUseContext,
                  undefined,
                )) ??
            (noPromptHost
              ? buildNoApprovalSurfaceDenial(permissionDecision)
              : (noPromptSurfaceDenialIfUnsettled(
                  tool,
                  permissionDecision,
                  toolUseContext,
                  NO_PROMPT_SURFACE_REASON,
                ) ?? permissionDecision)))
          : permissionDecision;
      if (
        effectiveDecision.behavior !== "allow" &&
        messageHasToolUseId(assistantMessage, toolUseId) &&
        !isServerFallbackDiscard(toolUseContext.abortController.signal)
      )
        headlessIO.emitPermissionDenied(tool.name, toolUseId, toolUseContext.agentId, effectiveDecision);
      return effectiveDecision;
    };
  let resolved = null;
  return setPermissionPromptHostProbe(
    "promptTool",
    async (tool, input, toolUseContext, assistantMessage, toolUseId, forceDecision) => {
      let serverSwept = promptToolState?.isPromptToolServerSwept() === true;
      if (!resolved && serverSwept) resolved = createCanUseToolWithPermissionPrompt(null);
      if (!resolved) {
        let mcpTools = getMcpTools();
        let permissionPromptTool = mcpTools.find((t) => matchesToolName(t, permissionPromptToolName));
        if (!permissionPromptTool) {
          let joined = mcpTools.map((t) => t.name).join(", ");
          let error = `Error: MCP tool ${permissionPromptToolName} (passed via --permission-prompt-tool) not found. Available MCP tools: ${joined || "none"}`;
          process.stderr.write(`${error}
`);
          gracefulShutdownSync(1);
          throw withTelemetryMessage(
            Error(error),
            joined
              ? PERMISSION_PROMPT_TOOL_NOT_FOUND_TELEMETRY_MESSAGE
              : PERMISSION_PROMPT_TOOL_NOT_FOUND_NO_MCP_TOOLS_TELEMETRY_MESSAGE,
          );
        }
        if (!permissionPromptTool.inputJSONSchema) {
          let error = `Error: tool ${permissionPromptToolName} (passed via --permission-prompt-tool) must be an MCP tool`;
          process.stderr.write(`${error}
`);
          gracefulShutdownSync(1);
          throw withTelemetryMessage(Error(error), PERMISSION_PROMPT_TOOL_NOT_MCP_TELEMETRY_MESSAGE);
        }
        resolved = createCanUseToolWithPermissionPrompt(
          permissionPromptTool,
          () => promptToolState?.isPromptToolServerSwept() === true,
        );
      }
      return resolved(tool, input, toolUseContext, assistantMessage, toolUseId, forceDecision);
    },
    () => promptToolState?.isPromptToolServerSwept() !== true,
  );
}
//@ chunk-0yw3taqg.js:903301-903365 file-local
function joinPromptValues(values) {
  return Array.isArray(values) && values.length === 1 && values[0] === "";
}
//@ chunk-0yw3taqg.js:903365-904045 layout
/**
 * 按 --agent 选定主线程代理：设置代理类型、采用其系统提示词与模型、可前置其 initialPrompt。
 */
function seatMainThreadAgentFromPool(
  agents,
  launchOptions,
  io,
  { deferInitialPrompt = false, reapplySystemPromptIfSeated = false } = {},
) {
  if (!launchOptions.agent)
    return {
      agent: undefined,
      seatedNow: false,
      restrictedAgentModel: undefined,
    };
  let alreadySeated = getMainThreadAgentType() === launchOptions.agent;
  let agent = findAgentExcludingWebFetch(agents, launchOptions.agent);
  if (!agent || alreadySeated) {
    if (agent && reapplySystemPromptIfSeated && !launchOptions.systemPrompt && !isBuiltInAgent(agent)) {
      let systemPrompt = agent.getSystemPrompt();
      if (systemPrompt) launchOptions.systemPrompt = systemPrompt;
    }
    return {
      agent,
      seatedNow: false,
      restrictedAgentModel: undefined,
    };
  }
  let restrictedAgentModel;
  setMainThreadAgentType(agent.agentType);
  hookSourcesSummary(agent);
  if (!launchOptions.systemPrompt && !isBuiltInAgent(agent)) {
    let systemPrompt = agent.getSystemPrompt();
    if (systemPrompt) launchOptions.systemPrompt = systemPrompt;
  }
  if (!launchOptions.userSpecifiedModel && agent.model && agent.model !== "inherit") {
    let userSpecifiedModel = parseUserSpecifiedModel(agent.model);
    if (isExemptDefaultResolvingPick(userSpecifiedModel) || isModelAllowed(userSpecifiedModel))
      setMainLoopModelOverride(userSpecifiedModel);
    else restrictedAgentModel = agent.model;
  }
  if (agent.initialPrompt && !deferInitialPrompt) io.prependUserMessage(agent.initialPrompt, "person");
  return {
    agent,
    seatedNow: true,
    restrictedAgentModel,
  };
}
//@ chunk-0yw3taqg.js:904045-909122 fingerprint (2.1.88 match: handleInitializeRequest, 0.341)
/**
 * 处理 initialize 控制请求：注册 SDK 钩子回调、提示建议、代理、MCP 服务器、输出样式等，回复 initialize 响应（命令、代理、模型、账户、pid、版本…）。
 */
async function handleInitializeRequest(
  initialize,
  requestId,
  isReinitialize,
  output,
  appState,
  accountInfo,
  structuredIO,
  authStatusEnabled,
  launchOptions,
  getAgents,
  getAppState,
  setAppState,
  getModelRows,
  sdkMcpManifestsParked,
  waitForStartupJoin,
  redactsWhatItPersists,
  aliasTable,
  buildPayloadExtra,
) {
  let restrictedAgentModel;
  if (isReinitialize) {
    let hostHooks = sdkHooksIfHostOwnsStdin(initialize, structuredIO);
    let retiredCallbacks = 0;
    if (hostHooks) {
      retiredCallbacks = structuredIO.retireSdkHostHookCallbacks(sdkHookReconnectFallback);
      buildSdkHookRegistrations(
        hostHooks,
        (hookName, matcher, onFailure) => structuredIO.createHookCallback(hookName, matcher, onFailure),
        structuredIO,
      );
    }
    let alreadyResolved = initialize.promptSuggestions === true;
    let promptSuggestionsApplied = alreadyResolved && !launchOptions.promptSuggestions && isRemoteCowork();
    if (promptSuggestionsApplied) launchOptions.promptSuggestions = true;
    applyHostRendersChromeSetupOffer(initialize.rendersChromeSetupOffer, structuredIO);
    applyInitializeProactivity(initialize.proactivity, {
      reinitialize: true,
      permissionModeSuppliedOnInvocation: launchOptions.permissionModeSuppliedOnInvocation !== false,
      restartedWorker: isWorkerEpochAfterFirst(env.CLAUDE_CODE_WORKER_EPOCH),
      planModeRestoredAtBoot: launchOptions.planModeOnResume === "restored",
      getAppState,
      setAppState,
      sessionState: structuredIO.sessionState,
    });
    let startupJoin = waitForStartupJoin();
    if (startupJoin !== undefined) await startupJoin;
    let models = accountInfo();
    let payload = await _buildInitializeResponsePayloadForTesting(
      appState,
      getActiveAgentsFromList(getAgents()),
      models.models,
      models.unavailable,
      getAppState,
      getModelRows(),
      () => structuredIO.sessionState.getState(),
      initialize.hooks ? hostHooks !== undefined : undefined,
      applyInitializePlugins(initialize.plugins),
      undefined,
      sdkMcpManifestsParked,
      launchOptions.storageV5,
      () => ({
        redactsWhatItPersists,
        isRemoteTransport: structuredIO.isRemoteTransport(),
        sessionWriters: structuredIO.sessionWriters(),
      }),
      buildPayloadExtra,
    );
    let pendingPermissionRequests = structuredIO.getPendingPermissionRequests();
    let pendingUserDialogRequests = structuredIO.getPendingUserDialogRequests();
    logEvent("tengu_reinit_pending_redelivery", {
      n_pending_permissions: fromNumber(pendingPermissionRequests.length),
      n_pending_dialogs: fromNumber(pendingUserDialogRequests.length),
      host_hooks_resent: initialize.hooks !== undefined,
      host_hooks_applied: hostHooks !== undefined,
      n_settled_hook_callbacks: fromNumber(retiredCallbacks),
      prompt_suggestions_requested: alreadyResolved,
      prompt_suggestions_opt_in_applied: promptSuggestionsApplied,
    });
    output.enqueue({
      type: "control_response",
      response: {
        subtype: "success",
        request_id: requestId,
        response: withHostWordedAsks(payload, structuredIO, launchOptions),
        pending_permission_requests: pendingPermissionRequests,
        pending_user_dialog_requests: pendingUserDialogRequests,
        pending_elicitation_requests: structuredIO.getPendingElicitationRequests(),
      },
    });
    emitBackgroundTasksChanged(getAppState());
    return {
      publishedCommands: payload.commands,
    };
  }
  if (initialize.systemPrompt !== undefined)
    launchOptions.systemPrompt = joinPromptValues(initialize.systemPrompt) ? "" : initialize.systemPrompt;
  if (initialize.supportedDialogKinds !== undefined)
    declareSdkDialogKinds(
      initialize.supportedDialogKinds,
      isWorkerEpochAfterFirst(env.CLAUDE_CODE_WORKER_EPOCH),
      structuredIO.sessionState,
    );
  if (initialize.perTaskStopAffordance === true) setSdkPerTaskStopAffordance(true);
  applyHostRendersChromeSetupOffer(initialize.rendersChromeSetupOffer, structuredIO);
  if (initialize.rapidFollowupPreempt === true) setSdkRapidFollowupPreempt(true);
  if (initialize.forwardNestedSubagentToolCalls === true) setSdkForwardNestedSubagentToolCalls(true);
  if (initialize.appendSystemPrompt !== undefined)
    launchOptions.appendSystemPrompt = initialize.appendSystemPrompt;
  if (initialize.planModeInstructions !== undefined)
    launchOptions.planModeInstructions = initialize.planModeInstructions;
  if (typeof initialize.systemPromptSnapshot === "boolean")
    launchOptions.systemPromptSnapshot = initialize.systemPromptSnapshot;
  if (initialize.appendSubagentSystemPrompt !== undefined)
    launchOptions.appendSubagentSystemPrompt = initialize.appendSubagentSystemPrompt;
  if (initialize.toolAliases !== undefined) {
    launchOptions.toolAliases = initialize.toolAliases;
    let { toolAliases } = initialize;
    setAppState((state) => ({
      ...state,
      toolPermissionContext: withToolAliases(state.toolPermissionContext, toolAliases, aliasTable),
    }));
    setPathTable(initialize.toolAliases);
  }
  let codeRunningTools =
    initialize.codeRunningMcpTools === undefined
      ? undefined
      : declareSdkHostCodeRunningMcpTools(initialize.codeRunningMcpTools);
  if (codeRunningTools !== undefined)
    setAppState((state) => {
      let agentModel = withRulesSetAsideAgain(state.toolPermissionContext);
      return agentModel === state.toolPermissionContext
        ? state
        : {
            ...state,
            toolPermissionContext: agentModel,
          };
    });
  if (typeof initialize.excludeDynamicSections === "boolean") {
    launchOptions.excludeDynamicSections = initialize.excludeDynamicSections;
    notifyExcludeDynamicSections(structuredIO.sessionState, initialize.excludeDynamicSections);
  }
  if (initialize.promptSuggestions !== undefined)
    launchOptions.promptSuggestions = initialize.promptSuggestions;
  if (initialize.forwardSubagentText !== undefined)
    launchOptions.forwardSubagentText = initialize.forwardSubagentText;
  applyInitializeProactivity(initialize.proactivity, {
    reinitialize: false,
    permissionModeSuppliedOnInvocation: launchOptions.permissionModeSuppliedOnInvocation !== false,
    restartedWorker: isWorkerEpochAfterFirst(env.CLAUDE_CODE_WORKER_EPOCH),
    planModeRestoredAtBoot: launchOptions.planModeOnResume === "restored",
    getAppState,
    setAppState,
    sessionState: structuredIO.sessionState,
  });
  if (initialize.skills !== undefined) {
    setSessionSkillAllowlist(initialize.skills);
    clearSystemPromptSectionState("settings");
  }
  let mergedAgents;
  if (initialize.agents) mergedAgents = parseAgentsFromJson(initialize.agents, "flagSettings");
  let activeAgents = () =>
    getActiveAgentsFromList(mergedAgents ? [...getAgents(), ...mergedAgents] : getAgents());
  if (launchOptions.agent) {
    let settings = isParkedSpare();
    let claimPending = !settings && getSpareClaimState() !== "none";
    let seated = seatMainThreadAgentFromPool(activeAgents(), launchOptions, structuredIO, {
      deferInitialPrompt: settings,
    });
    restrictedAgentModel = seated.restrictedAgentModel;
    if (!seated.seatedNow && seated.agent?.initialPrompt && !settings && !claimPending)
      structuredIO.prependUserMessage(seated.agent.initialPrompt, "person");
  }
  if (initialize.hooks)
    buildSdkHookRegistrations(
      initialize.hooks,
      (hasRestrictedModel, isRemoteCowork, agentRegistration) =>
        structuredIO.createHookCallback(hasRestrictedModel, isRemoteCowork, agentRegistration),
      structuredIO,
    );
  if (initialize.jsonSchema) setInitJsonSchema(initialize.jsonSchema);
  if (isParkedSpare() && initialize.workspaceTrust !== undefined)
    logForDebugging(
      "initialize: workspaceTrust ignored on a parked spare (--await-claim) \u2014 send workspace_trust with claim_session",
      {
        level: "warn",
      },
    );
  let workspaceTrustRecorded = await applyWorkspaceTrust(
    structuredIO.hostOwnsStdinOrigin && !isParkedSpare() ? initialize.workspaceTrust : undefined,
    {
      cwd: getCwd(),
      trustedNetworkDirectories: getAppState().toolPermissionContext.trustedNetworkDirectories,
      storageV5: launchOptions.storageV5,
    },
  );
  let startupJoin = waitForStartupJoin();
  if (startupJoin !== undefined) await startupJoin;
  let accountInfo_2 = accountInfo();
  let payload = await _buildInitializeResponsePayloadForTesting(
    appState,
    activeAgents(),
    accountInfo_2.models,
    accountInfo_2.unavailable,
    getAppState,
    getModelRows(),
    () => structuredIO.sessionState.getState(),
    initialize.hooks ? true : undefined,
    applyInitializePlugins(initialize.plugins),
    workspaceTrustRecorded,
    sdkMcpManifestsParked,
    launchOptions.storageV5,
    () => ({
      redactsWhatItPersists,
      isRemoteTransport: structuredIO.isRemoteTransport(),
      sessionWriters: structuredIO.sessionWriters(),
    }),
    buildPayloadExtra,
  );
  output.enqueue({
    type: "control_response",
    response: {
      subtype: "success",
      request_id: requestId,
      response: withHostWordedAsks(
        {
          ...payload,
          ...(codeRunningTools !== undefined && {
            code_running_mcp_tools_applied: codeRunningTools,
          }),
        },
        structuredIO,
        launchOptions,
      ),
      pending_permission_requests: structuredIO.getPendingPermissionRequests(),
      pending_user_dialog_requests: structuredIO.getPendingUserDialogRequests(),
      pending_elicitation_requests: structuredIO.getPendingElicitationRequests(),
    },
  });
  let mcp = getAppState().mcp;
  logEvent("tengu_sdk_init_handshake", {
    uptime_ms: Math.round(process.uptime() * 1000),
    mcp_client_count: mcp.clients.length,
    mcp_pending_count: countWhere(mcp.clients, (matcher) => matcher.type === "pending"),
    mcpNonBlocking: getMcpConnectNonBlocking(),
    session_mirror: !!launchOptions.sessionMirror,
  });
  if (authStatusEnabled) {
    let status = AwsAuthStatusManager.getInstance().getStatus();
    if (status)
      output.enqueue({
        type: "auth_status",
        isAuthenticating: status.isAuthenticating,
        output: status.output,
        error: status.error,
        uuid: randomUUID(),
        session_id: getSessionId(),
      });
  }
  return {
    restrictedAgentModel,
    mergedStdinAgents: mergedAgents,
    publishedCommands: payload.commands,
  };
}
//@ chunk-0yw3taqg.js:909122-911465 layout
/**
 * 构造 initialize 响应负载：commands、agents、output_style、models、account、pid、claude_code_version 等。
 */
async function _buildInitializeResponsePayloadForTesting(
  getCommands,
  activeAgentsFromList,
  models,
  unavailable,
  getAgents,
  getRoot,
  toolHost,
  hooksApplied,
  pluginsApplied,
  workspaceTrustRecorded,
  sdkMcpManifestsParked,
  storageV5,
  onReload,
  options,
) {
  let outputStyle = getSettings_DEPRECATED()?.outputStyle || DEFAULT_2;
  let allOutputStyles = await getAllOutputStylesCached(getCwd(), storageV5);
  let accountInformation = getAccountInformation();
  let mode = getAgents().toolPermissionContext.mode;
  let style =
    isVsCodeTopSession() && isHarborWillowEnabled()
      ? shouldShowAutoDefaultNudge(getAgents().toolPermissionContext, {
          requireOnboarding: false,
        })
      : null;
  let accountSettings = {
    commands: toSlashCommands(getCommands()),
    agents: activeAgentsFromList.map((agent) => ({
      name: agent.agentType,
      description: agent.whenToUse,
      model: agent.model,
    })),
    output_style: outputStyle,
    available_output_styles: Object.keys(allOutputStyles),
    user_output_styles_dir: managedOutputStylesDir(),
    models,
    ...(unavailable.length > 0 && {
      unavailable_models: unavailable,
    }),
    account: {
      email: accountInformation?.email,
      organization: accountInformation?.organization,
      subscriptionType: accountInformation?.subscription,
      tokenSource: accountInformation?.tokenSource,
      apiKeySource: accountInformation?.apiKeySource,
      apiProvider: getAPIProvider(),
    },
    pid: process.pid,
    claude_code_version: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
    current_permission_mode: toExternalPermissionMode(mode),
    ...(onReload().isRemoteTransport &&
      isBridgeEnvironment() &&
      isBridgeInboundReadReceiptsEnabled() && {
        inbound_read_receipts: true,
      }),
    hooks_applied: hooksApplied,
    hook_on_failure_supported: true,
    plugins_applied: pluginsApplied,
    workspace_trust_recorded: workspaceTrustRecorded,
    sdk_mcp_manifests_parked: sdkMcpManifestsParked,
    ...(isVsCodeTopSession() && {
      permission_mode_from_default_fallback: isAutoModeFromFallback() && mode === "auto",
      ...(style && {
        auto_default_nudge: toExternalPermissionMode(style),
      }),
    }),
    feedback_survey_config: vscodeSurveyConfig(),
    survey_followup_box: feedbackSurveyCapabilities(),
    feedback_mode: headlessFeedbackMode(),
    analytics_disabled: isFirstPartyTelemetryBlocked(),
    proactivity: proactivityStateStub(getAgents()),
    footer_indicator: getFooterIndicator(),
  };
  let explicitRemoteControlAtStartup = getExplicitRemoteControlAtStartup();
  let getState =
    !isRunningInRemoteEnvironment() && (explicitRemoteControlAtStartup ?? getCcrAutoConnectDefault());
  accountSettings.remote_control_auto_enable = getState;
  accountSettings.remote_control_auto_connect_default =
    !isRunningInRemoteEnvironment() && getCcrAutoConnectDefault();
  accountSettings.remote_control_available = isRemoteControlDeploymentAvailable();
  if (isVsCodeTopSession())
    accountSettings.claude_in_chrome_at_startup =
      await import("../utils/claudeInChrome/claudeInChromeDefaultForHost.lazy.js").then(
        ({ claudeInChromeDefaultForHost }) => claudeInChromeDefaultForHost(),
        (error) => {
          logError(error);
          return false;
        },
      );
  if (env.CLAUDE_CODE_DISABLE_CFC_PROMPT === true) accountSettings.claude_in_chrome_prompt_disabled = true;
  accountSettings.remote_control_auto_on_by_default =
    getState && explicitRemoteControlAtStartup === undefined;
  accountSettings.ide_rc_auto_enable_gate = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_ide_rc_auto_enable",
    false,
  );
  let state = getAgents();
  accountSettings.fast_mode_state = getFastModeState(getRoot ?? null, state.fastMode);
  accountSettings.fast_mode_disabled_reason =
    getFastModeUnavailableReasonCode(getRoot ?? null) ??
    getFastRejectedReason(getRoot ?? null, state.fastMode) ??
    undefined;
  accountSettings.session_state = toolHost();
  let capabilitySources = [
    ...uiSurfaceCapabilities(onReload),
    ...uiHookedCapabilities(onReload),
    ...(persistsWithoutRedaction(onReload()) ? [MCP_CALL_RESULT_NOT_FOR_MODEL_V1] : []),
    ...(shouldOfferLinuxSandboxHint(options()) ? [START_SHELL_TASK_V1] : []),
  ];
  if (capabilitySources.length > 0) accountSettings.capabilities = capabilitySources;
  return accountSettings;
}
//@ chunk-0yw3taqg.js:911465-911950 fingerprint (2.1.88 match: handleRewindFiles, 0.957)
/**
 * 处理 rewind_files：检查文件历史检查点，dry-run 或回滚文件。
 */
async function handleRewindFiles(userMessageId, appState, options) {
  if (!fileHistoryEnabled())
    return {
      canRewind: false,
      error: "File rewinding is not enabled.",
    };
  if (!fileHistoryCanRestore(appState.fileHistory, userMessageId))
    return {
      canRewind: false,
      error: "No file checkpoint found for this message.",
    };
  if (options) {
    let diffStats = await fileHistoryGetDiffStats(appState.fileHistory, userMessageId);
    return {
      canRewind: true,
      filesChanged: diffStats?.filesChanged,
      insertions: diffStats?.insertions,
      deletions: diffStats?.deletions,
    };
  }
  let filesChanged;
  try {
    filesChanged = await fileHistoryRewind(() => appState.fileHistory, userMessageId);
  } catch (error) {
    return {
      canRewind: false,
      error: `Failed to rewind: ${errorMessage(error)}`,
    };
  }
  return {
    canRewind: true,
    skippedLinks: filesChanged?.skippedLinks,
  };
}
//@ chunk-0yw3taqg.js:911950-912995 fingerprint (2.1.88 match: handleChannelEnable, 0.8)
/**
 * 处理 channel_enable：为已连接的插件 MCP 服务器注册频道通知。
 */
function handleChannelEnable(requestId, serverName, connectionPool, output, messageQueue) {
  let respondError = (error) => output.enqueue(controlErrorResponse(requestId, error));
  let connection = connectionPool.find((server) => server.name === serverName && server.type === "connected");
  if (!connection || connection.type !== "connected")
    return respondError(`server ${sanitizeTelemetryString(serverName)} is not connected`);
  let pluginSource = connection.config.pluginSource;
  let parsed = pluginSource ? parsePluginIdentifier_2(pluginSource) : undefined;
  if (!parsed?.marketplace)
    return respondError(
      `server ${sanitizeTelemetryString(serverName)} is not plugin-sourced; channel_enable requires a marketplace plugin`,
    );
  let entry = {
    kind: "plugin",
    name: parsed.name,
    marketplace: parsed.marketplace,
  };
  let prior = getAllowedChannels();
  let already = prior.some(
    (e) => e.kind === "plugin" && e.name === entry.name && e.marketplace === entry.marketplace,
  );
  if (!already) setAllowedChannels([...prior, entry]);
  let gate = gateChannelServer(serverName, connection.capabilities, pluginSource, connection.protocolEra);
  if (gate.action === "skip") {
    if (!already) setAllowedChannels(prior);
    return respondError(gate.reason);
  }
  let pluginId = pluginIdForTelemetry(`${entry.name}@${entry.marketplace}`);
  logMCPDebug(serverName, "Channel notifications registered");
  logEvent("tengu_mcp_channel_enable", {
    plugin: pluginId,
  });
  onMcpNotification(connection, ChannelMessageNotificationSchema(), async (notification) => {
    if (!isChannelsEnabled()) return;
    let { content, meta } = notification.params;
    logMCPDebug(serverName, `notifications/claude/channel: ${content.slice(0, 80)}`);
    logEvent("tengu_mcp_channel_message", {
      content_length: content.length,
      meta_key_count: Object.keys(meta ?? {}).length,
      entry_kind: lit("plugin"),
      is_dev: false,
      plugin: pluginId,
    });
    messageQueue.enqueue(queuedChannelPush(serverName, content, meta));
  });
  output.enqueue(controlSuccessResponse(requestId));
}
//@ chunk-0yw3taqg.js:912995-913592 fingerprint (2.1.88 match: reregisterChannelHandlerAfterReconnect, 0.789)
function reregisterChannelHandlerAfterReconnect(connection, messageQueue) {
  if (connection.type !== "connected") return;
  if (
    gateChannelServer(
      connection.name,
      connection.capabilities,
      connection.config.pluginSource,
      connection.protocolEra,
    ).action !== "register"
  )
    return;
  let entry = findChannelEntry(connection.name, getAllowedChannels());
  let pluginId =
    entry?.kind === "plugin" ? pluginIdForTelemetry(`${entry.name}@${entry.marketplace}`) : undefined;
  logMCPDebug(connection.name, "Channel notifications re-registered after reconnect");
  onMcpNotification(connection, ChannelMessageNotificationSchema(), async (notification) => {
    if (!isChannelsEnabled()) return;
    let { content, meta } = notification.params;
    logMCPDebug(connection.name, `notifications/claude/channel: ${content.slice(0, 80)}`);
    logEvent("tengu_mcp_channel_message", {
      content_length: content.length,
      meta_key_count: Object.keys(meta ?? {}).length,
      entry_kind: fromEnumOpt(entry?.kind),
      is_dev: entry?.dev ?? false,
      plugin: pluginId,
    });
    messageQueue.enqueue(queuedChannelPush(connection.name, content, meta));
  });
}
//@ chunk-0yw3taqg.js:913592-913825 layout
/**
 * 每轮开始前等待文件存储 worker 拉取同步（turn hold 参与者）。
 */
function dirSyncPullParticipant(workerDirSync, store, options, signal = false) {
  return {
    name: "file_store_worker",
    beforeTurn: async ({ signal: signal_2 }) => {
      let store = await (signal
        ? Promise.race([
            workerDirSync,
            raceWithAbortSignal(workerDirSync, signal_2, () => new AbortError()).catch(() => {
              return;
            }),
          ])
        : workerDirSync);
      if (store === undefined) return TURN_GATE_READY;
      try {
        await store?.beforeTurn(signal_2);
      } finally {
      }
      return TURN_GATE_READY;
    },
  };
}
//@ chunk-0yw3taqg.js:913825-913976 layout
/**
 * 每轮开始前等待云端 home 设置种子写入完成（turn hold 参与者）。
 */
function homeSeedHoldParticipant({ handle, record }) {
  return {
    name: "home_settings_seed",
    beforeTurn: async ({ signal }) => {
      record.markTurnAtHold();
      await (await handle)?.beforeTurn(signal);
      return TURN_GATE_READY;
    },
  };
}
//@ chunk-0yw3taqg.js:913976-914449 layout
function startCloudHomeSeedParticipant({
  record,
  configHome,
  foreignFiles,
  takes,
  session,
  repoRoot,
  storageV5,
  workerDirSync,
}) {
  return {
    handle: import("../services/homeSeed/formatHomeAppliedLine.lazy.js")
      .then((seedRecord) => {
        let seed = seedRecord.startCloudHomeSeed({
          session,
          record,
          configHome,
          foreignFiles,
          takes,
          repoRoot,
          storageV5,
        });
        workerDirSync
          ?.then((worker) => {
            if (worker === null) {
              logForDiagnosticsNoPII("warn", "home_seed_stopped_no_file_store_worker", {});
              seed.stop();
            }
          })
          .catch(() => {});
        return seed;
      })
      .catch((error) => {
        logForDiagnosticsNoPII("warn", "home_seed_worker_start_failed", {
          name: safeErrorName(error),
        });
        return null;
      }),
    record,
  };
}
//@ chunk-0yw3taqg.js:914449-914577 layout
function shortErrorText(options) {
  try {
    let text = stripAnsi(getFirstLine(errorMessage(options))).trimEnd();
    let clipped = truncateToLength(text, 200);
    return clipped.length < text.length ? `${clipped}\u2026` : clipped;
  } catch {
    return "unknown error";
  }
}
//@ chunk-0yw3taqg.js:914577-914896 layout
function logHeadlessFatalError(error, context) {
  logError(error);
  logEvent("tengu_headless_fatal_error", {
    site: fromEnum(context.site),
    message_type: fromEnumOpt(context.message?.type),
    control_subtype: fromEnumOpt(
      context.message?.type === "control_request" ? context.message.request.subtype : undefined,
    ),
    drained_message_count: context.drainedMessageCount,
    outstanding_stdout_bytes: outstandingStdoutBytes(),
    stdout_destroyed: process.stdout.destroyed,
    ...errorTelemetryFields_2(error),
  });
}
//@ chunk-0yw3taqg.js:914896-915552 layout
/**
 * headless 输出写入失败时结束会话：记录致命错误、尽量写最后一条错误、退出。
 */
async function endHeadlessSessionOnOutputWriteFailure(io, headlessIO, message, error, drainedMessageCount) {
  if (isTerminalShutdown()) {
    logForDebugging(`Headless output write failed during shutdown (${message.type})`);
    return;
  }
  let writeError = isBridgeOrTransport(io);
  transportStateByHost.of(io).setActive(undefined);
  try {
    logHeadlessFatalError(error, {
      site: "output_drain",
      message,
      drainedMessageCount,
    });
  } catch {}
  try {
    let transportFailed = writeError ? "transport write failure" : shortErrorText(error);
    let prefix = (text) =>
      `Could not write a message to the output stream (${text}); the session has ended.` +
      (isSessionPersistenceDisabled() ? "" : " You can resume this conversation.");
    process.stderr.write(`Error: ${prefix(shortErrorText(error))}
`);
    if (writeError)
      logForDebugging(`output write failure detail: ${shortErrorText(error)}`, {
        level: "error",
      });
    let message = prefix(transportFailed);
    try {
      publishFailedSummary(headlessIO.sessionState, message);
      await headlessIO.write(emitLoadError(getSessionId(), [message]));
    } catch {}
    await Promise.race([
      headlessIO.flushSessionState(),
      sleep(5000, undefined, {
        unref: true,
      }),
    ]);
  } catch {}
  gracefulShutdownSync(1);
}
//@ chunk-0yw3taqg.js:915552-915872 layout
/**
 * runHeadless 抛出未捕获错误时结束会话：停止保留流事件、写错误结果、退出 1。
 */
function endHeadlessSessionOnEscapedError(io, error, context) {
  if (isTerminalShutdown()) {
    logForDebugging("runHeadless rejected during shutdown");
    return;
  }
  let slot = transportStateByHost.of(io);
  let resultIndex = slot.active?.resultDelivery?.numbered ?? null;
  slot.active?.stopHoldingStreamEvents();
  slot.setActive(undefined);
  try {
    logHeadlessFatalError(error, {
      site: "run_headless",
    });
  } catch {}
  try {
    writeStartupFailure(`An internal error ended the session (${shortErrorText(error)}).`, context, {
      resultIndex,
    });
  } catch {}
  gracefulShutdownSync(1);
}
//@ chunk-0yw3taqg.js:915872-916069 layout
/**
 * 写启动失败：stderr 输出；stream-json 时再输出一行 result 错误（带 startupFailureReason）。
 */
function writeStartupFailure(outputFormat, outputFormat_2, { resultIndex = 0, startupFailureReason } = {}) {
  process.stderr.write(
    outputFormat +
      `
`,
  );
  logForDebugging(outputFormat, {
    level: "error",
  });
  if (outputFormat_2 === "stream-json")
    writeToStdout(
      ndjsonStringify(
        buildStartupFailureResult({
          sessionId: getSessionId(),
          message: outputFormat,
          reason: startupFailureReason,
          resultIndex,
        }),
      ) +
        `
`,
    );
}
//@ chunk-0yw3taqg.js:916069-916207 layout
function exitIfEndedByModel(message, outputFormat) {
  if (message?.endedByModel) {
    writeStartupFailure(
      withTaskSuffix("Claude ended this conversation. Start a new session to continue."),
      outputFormat,
    );
    gracefulShutdownSync(1);
    return true;
  }
  return false;
}
//@ chunk-0yw3taqg.js:916207-917448 layout
async function refuseUnsafeWorktreeResume(io, worktreeSession, resumeTarget, outputFormat) {
  let originalCwd = getOriginalCwd();
  let worktree = null;
  try {
    worktree = restoreWorktreeForResume(lastResumeRecordRegistry.of(io.host), worktreeSession, undefined, {
      storageV5: resumeTarget.storageV5,
    });
  } catch (error) {
    logError(error);
  }
  if (worktree && !worktree.poisoned) {
    writeStartupFailure(worktreeResumeRefusalError(worktree).trimEnd(), outputFormat, {
      startupFailureReason:
        worktree.reason === "unverifiable" ? "worktree_unverified" : "worktree_resume_refused",
    });
    gracefulShutdownSync(1);
    return true;
  }
  let shouldPersist = resumeTarget.persist && !isTranscriptPersistenceDisabled();
  if (worktree && worktree.reason !== "worktree-gone" && !shouldPersist) {
    writeStartupFailure(
      worktreeResumeRefusalError(worktree, {
        bindingCleared: false,
      }).trimEnd(),
      outputFormat,
      {
        startupFailureReason: "worktree_resume_refused",
      },
    );
    gracefulShutdownSync(1);
    return true;
  }
  if (!worktree && getOriginalCwd() !== originalCwd && isToolSandboxActive()) {
    await withDeadline(
      initializeGrowthBook().catch(() => null),
      PRINT_TURN_RETRY_MS,
    );
    if (
      readFlagWithOverride(TENGU_ANCHORED_LANTERN, {
        safe: true,
      })
    ) {
      let rebuilt = false;
      try {
        rebuilt = SandboxManager.refreshConfig();
      } catch (error) {
        reportSandboxErrorUnderStandIn(error, "configNotRebuilt");
      }
      if (!rebuilt) {
        logFeatureBad("sandbox_resume_rebuild", "rebuild_failed");
        writeStartupFailure(
          "Error: could not apply the sandbox's protections to this session's worktree, so the session was not resumed. Run the resume again. If it fails the same way, check the sandbox paths in your settings, or re-run with --fork-session to continue without the worktree.",
          outputFormat,
        );
        gracefulShutdownSync(1);
        return true;
      }
      logFeatureOk("sandbox_resume_rebuild");
    }
  }
  if (resumeTarget.persist)
    if (isStorageV5Enabled() && resumeTarget.storageV5 !== undefined)
      await adoptResumedSessionFileAsync(resumeTarget.storageV5);
    else adoptResumedSessionFile();
  if (!worktree) return false;
  if (worktree.reason === "worktree-gone") {
    process.stderr.write(
      worktreeGoneHeadlessNotice(worktree, {
        bindingCleared: shouldPersist,
      }),
    );
    return false;
  }
  writeStartupFailure(
    worktreeResumeRefusalError(worktree, {
      bindingCleared: true,
    }).trimEnd(),
    outputFormat,
    {
      startupFailureReason: "worktree_resume_refused",
    },
  );
  gracefulShutdownSync(1);
  return true;
}
//@ chunk-0yw3taqg.js:917448-917505 layout
/**
 * 声明本进程拥有费用账本并在退出时保存费用状态（diskless 时不做）。
 */
function ownCostLedger() {
  if (isTranscriptPersistenceDisabled()) return () => {};
  claimCostLedgerForCurrentSession();
  return registerTranscriptExitReStamp(resetCostState);
}
//@ chunk-0yw3taqg.js:917505-917670 layout
function queueMemoryNotices(outputFormat) {
  let format = restoredMemoryPauseNotice();
  if (format !== undefined)
    reportStartupModelNotice(format, {
      key: "memory-paused",
      outputFormat,
    });
  let note = restoredAutoMemorySessionNotice();
  if (note !== undefined)
    reportStartupModelNotice(note, {
      key: "session-auto-memory-off",
      outputFormat,
    });
}
//@ chunk-0yw3taqg.js:917670-917689 layout
var weakMap_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0yw3taqg.js:917670", () => {
  weakMap_2 = new WeakMap();
});
//@ chunk-0yw3taqg.js:917689-917713 layout
function restoredWorkerAgentDefinitions(_unused) {
  return false;
}
//@ chunk-0yw3taqg.js:917713-917846 layout
function resumeWarningSink(messages, outputFormat) {
  return (line) => {
    logForDebugging(`resume: ${line}`);
    messages.push(createSystemMessage(line, "warning"));
    if (outputFormat !== "json" && outputFormat !== "stream-json")
      process.stderr.write(
        line +
          `
`,
      );
  };
}
//@ chunk-0yw3taqg.js:917846-930495 fingerprint (2.1.88 match: loadInitialMessages, 0.306)
/**
 * 加载 -p 模式的初始消息：--continue 取最近会话，--resume 按 ID/名称/文件恢复（含 --resume-session-at 截断、--fork-session），失败写启动失败结果。
 */
async function loadInitialMessages(io, setAppState, storageV5, options) {
  let persistSession = !isSessionPersistenceDisabled();
  if (options.continue)
    try {
      logEvent("tengu_continue_print", {});
      let { clearSessionCaches } = await import("../commands/clear/caches.js");
      clearSessionCaches(io, undefined, undefined, undefined, options.storageV5);
      let state;
      let restoredWorkerState = await options.restoredWorkerState;
      restoreChromeSetupOfferState(restoredWorkerState);
      let resumed = pendingActionToolUseIds(restoredWorkerState, options.tools ?? []);
      let conversationForResume = await loadConversationForResume(undefined, undefined, {
        forkSession: !!options.forkSession,
        ...(options.sdkUrl && {
          acceptCustomIds: true,
        }),
        storageV5: options.storageV5,
        credentials: options.credentials,
        ...precomputeResumeHooks(io.precompute, options.storageV5, {
          forkSession: !!options.forkSession,
        }),
        onNewestRunningInBackground: (hydrateTimeout) => {
          state = hydrateTimeout;
        },
        ...(resumed.size > 0 && {
          hostAnswerableToolUseIds: resumed,
        }),
        restoredCardToolUseId: singlePendingAction(await options.restoredWorkerState),
        restoredPromptWaits: hasPendingActions(await options.restoredWorkerState),
      });
      if (conversationForResume)
        options.onFreshSessionStartRows?.(await appendSessionStartRows(conversationForResume));
      if (exitIfEndedByModel(conversationForResume, options.outputFormat))
        return {
          messages: [],
        };
      if (!conversationForResume && state !== undefined) {
        await logEventAsync("tengu_continue", {
          success: false,
          entrypoint: lit("print"),
        });
        writeStartupFailure(backgroundSessionMovedNotice(state), options.outputFormat, {
          startupFailureReason: "session_held_by_background",
        });
        gracefulShutdownSync(1);
        return {
          messages: [],
          aborted: true,
        };
      }
      if (conversationForResume) {
        let warning = lazyCoordinatorMode.matchSessionMode(conversationForResume.mode);
        if (warning) {
          process.stderr.write(
            warning +
              `
`,
          );
          let agentDefinitions = await reloadAgentDefinitionsForModeSwitch(
            getCwd(),
            options.cliAgents ?? [],
            options.storageV5,
          );
          setAppState((prev) => ({
            ...prev,
            agentDefinitions,
          }));
        }
        {
          let agentDefinitions = restoredWorkerAgentDefinitions(restoredWorkerState);
          weakMap_2.set(
            io,
            switchSessionModelPin(
              {
                ...conversationForResume,
                ...(agentDefinitions && {
                  replMode: false,
                }),
                source: options.sdkUrl ? "remote" : "store",
                sdkUrlWorker: Boolean(options.sdkUrl),
                headless: true,
              },
              resumeWarningSink(conversationForResume.messages, options.outputFormat),
            ),
          );
        }
        let { adoptedSessionId, effectiveFork } = resolveResumeSessionAdoption(
          conversationForResume.sessionId,
          !!options.forkSession,
          {
            acceptCustomIds: !!options.sdkUrl,
          },
        );
        if (adoptedSessionId) {
          switchSession(
            adoptedSessionId,
            "resume",
            conversationForResume.fullPath ? dirname(conversationForResume.fullPath) : null,
          );
          if (persistSession) await resetSessionFilePointer();
        }
        restoreSessionStateFromLog(conversationForResume, setAppState, storageV5, {
          preserveLiveBudget: false,
        });
        let planModeOnResume = restorePlanModeFromTranscriptOnly(
          conversationForResume.messages,
          options,
          setAppState,
        );
        if (effectiveFork) {
          await adoptForkSessionMetadata(conversationForResume, {
            stripWorktreeSession: true,
            stripRelocatedCwd: true,
            storageV5: options.storageV5,
          });
          if (conversationForResume.contentReplacements?.length)
            await recordContentReplacement(
              conversationForResume.contentReplacements,
              undefined,
              options.storageV5,
            );
        } else {
          restoreSessionMetadata(conversationForResume, {
            storageV5: options.storageV5,
          });
          reclaimSessionNameAtStart(options).catch(logError);
        }
        queueMemoryNotices(options.outputFormat);
        setCostStateForRestore(conversationForResume);
        if (!effectiveFork) {
          let persist = persistSession && !!adoptedSessionId;
          if (
            await refuseUnsafeWorktreeResume(
              io,
              conversationForResume.worktreeSession,
              {
                persist,
                storageV5: options.storageV5,
              },
              options.outputFormat,
            )
          )
            return {
              messages: [],
              aborted: true,
            };
        }
        saveMode(lazyCoordinatorMode.isCoordinatorMode() ? "coordinator" : "normal");
        return {
          messages: conversationForResume.messages,
          turnInterruptionState: conversationForResume.turnInterruptionState,
          supersededToolUseIds: conversationForResume.supersededToolUseIds,
          supersededToolNames: conversationForResume.supersededToolNames,
          answeredToolUseIds: conversationForResume.answeredToolUseIds,
          rescueSuppressed: conversationForResume.rescueSuppressed,
          deferredToolUse: conversationForResume.deferredToolUse,
          agentSetting: conversationForResume.agentSetting,
          sessionProjectPath: conversationForResume.projectPath,
          planModeOnResume,
          resumedAsFork: effectiveFork,
        };
      }
      logEvent("tengu_continue", {
        success: false,
        entrypoint: lit("print"),
      });
    } catch (error) {
      weakMap_2.delete(io);
      if (error instanceof ResumeRefusedError) {
        await logEventAsync("tengu_continue", {
          success: false,
          entrypoint: lit("print"),
          error_name: sanitizedErrorNameForTelemetry(error),
        });
        writeStartupFailure(`${FAILED_TO_RESUME_SESSION_TEXT}: ${error.message}`, options.outputFormat);
        gracefulShutdownSync(1);
        return {
          messages: [],
          aborted: true,
        };
      }
      logError(error);
      gracefulShutdownSync(1);
      return {
        messages: [],
      };
    }
  if (options.teleport)
    try {
      await waitForPolicyLimitsToLoad();
      let teleportError = cloudSessionsUnavailableReason();
      if (teleportError) {
        await logOrgPolicyDeniedAsync("allow_remote_sessions", "cloud_session");
        throw Error(teleportError);
      }
      logEvent("tengu_teleport_print", {});
      if (typeof options.teleport !== "string") throw Error("No session ID provided for teleport");
      let { clearSessionCaches } = await import("../commands/clear/caches.js");
      clearSessionCaches(io, undefined, undefined, undefined, options.storageV5);
      let {
        checkOutTeleportedSessionBranch,
        processMessagesForTeleportResume,
        teleportResumeCodeSession,
        validateGitState,
      } = await import("../utils/teleport.lazy.js");
      await validateGitState();
      let teleportResult = await teleportResumeCodeSession(options.teleport);
      let { branchError } = await checkOutTeleportedSessionBranch(teleportResult.branch);
      return {
        messages: processMessagesForTeleportResume(
          teleportResult.log,
          branchError,
          teleportResult.environmentKind,
        ),
        messagesOrigin: "remote",
      };
    } catch (error) {
      logForDebugging(`Teleport in print mode failed: ${errorMessage(error)}`, {
        level: "error",
      });
      gracefulShutdownSync(1);
      return {
        messages: [],
      };
    }
  if (options.resume) {
    let failure = "load_error";
    let startTime = performance.now();
    let resumeArg = options.sdkUrl ? startResumeLoadHold() : undefined;
    let resumeRows = false;
    try {
      logEvent("tengu_resume_print", {});
      let resumeIdentifier = typeof options.resume === "string" ? options.resume.trim() : "";
      let parsedSessionId = parseSessionIdentifier(resumeIdentifier);
      if (!parsedSessionId && resumeIdentifier) {
        let log = await searchSessionsByCustomTitle(
          resumeIdentifier,
          {
            exact: true,
          },
          options.storageV5,
        );
        if (log.length === 1) {
          let resumeIdentifier = getSessionIdFromLog(log[0]);
          if (resumeIdentifier) parsedSessionId = parseSessionIdentifier(resumeIdentifier);
        } else if (log.length > 1) {
          let joined = log.map(
            (candidate) =>
              `  ${getSessionIdFromLog(candidate) ?? "(unknown)"}  (modified ${candidate.modified.toISOString()})`,
          ).join(`
`);
          logEvent("tengu_session_resumed", {
            entrypoint: lit("print"),
            success: false,
            failure_reason: lit("not_found_explicit_id"),
          });
          writeStartupFailure(
            `Error: --resume "${resumeIdentifier}" matches ${log.length} sessions. Pass one of these session IDs to disambiguate:
${joined}`,
            options.outputFormat,
          );
          gracefulShutdownSync(1);
          return {
            messages: [],
          };
        }
      }
      if (!parsedSessionId) {
        let message =
          "Error: --resume requires a valid session ID or session title when used with --print. Usage: claude -p --resume <session-id|title>";
        if (resumeIdentifier)
          message += `. Provided value "${resumeIdentifier}" is not a UUID and does not match any session title.`;
        logEvent("tengu_session_resumed", {
          entrypoint: lit("print"),
          success: false,
          failure_reason: lit("not_found_explicit_id"),
        });
        writeStartupFailure(message, options.outputFormat);
        gracefulShutdownSync(1);
        return {
          messages: [],
        };
      }
      let { clearSessionCaches } = await import("../commands/clear/caches.js");
      clearSessionCaches(io, undefined, undefined, undefined, options.storageV5);
      let workerJoinStart = null;
      if (options.sdkUrl) {
        let startTime = performance.now();
        options.restoredWorkerState.then(() =>
          recordPhase("resume_worker_init_join_ms", performance.now() - startTime, startTime),
        );
        let [prefetch, metadata] = await Promise.all([
          (options.hydratePrefetch ?? Promise.resolve(null)).then(async (hydrateStart) => {
            markResumeHydratePrefetch(hydrateStart, startTime);
            setTranscriptLocalGcEnabled(isTranscriptLocalGcEnabled());
            try {
              return await hydrateFromCCRv2InternalEvents(
                parsedSessionId.sessionId,
                hydrateStart,
                isCcrSubagentSkipOnDeltaGateOn(),
                options.storageV5,
                options.onDiskBehind,
                isWondrousIslandGateOn(),
              );
            } finally {
              for (let pending of [hydrateStart?.[0], hydrateStart?.[1]])
                if (pending) pending.events.length = 0;
            }
          }),
          options.restoredWorkerState,
          getSnapshotStore().restore(snapshotPathForSession()),
        ]);
        recordPhase("resume_hydrate_ms", performance.now() - startTime, startTime);
        let resumeState = await reportCcrHistoryLoadFailure(prefetch);
        if (resumeState === "stopping")
          return {
            messages: [],
            aborted: true,
          };
        if (resumeState) {
          logEvent("tengu_session_resumed", {
            entrypoint: lit("print"),
            success: false,
            failure_reason: fromEnum(resumeState.reason),
          });
          writeStartupFailure(
            `${FAILED_TO_RESUME_SESSION_TEXT}: ${resumeState.sentence}`,
            options.outputFormat,
          );
          gracefulShutdownSync(1);
          return {
            messages: [],
            aborted: true,
          };
        }
        workerJoinStart = metadata;
        if (metadata?.readFailed === true && isRemoteManagedEnvironment()) {
          if (isShuttingDown())
            return {
              messages: [],
              aborted: true,
            };
          await withDeadline(
            initializeGrowthBook().catch(() => null),
            PRINT_TURN_FLUSH_DELAY_MS,
          );
          if (
            !readFlagWithOverride("tengu_ccr_unread_state_exit_killswitch", {
              safe: false,
            })
          ) {
            logEvent("tengu_session_resumed", {
              entrypoint: lit("print"),
              success: false,
              failure_reason: lit("worker_state_unread"),
            });
            writeStartupFailure(
              "Error: this worker could not read the session's stored state and will not start a turn without it (worker_state_unread)",
              options.outputFormat,
            );
            gracefulShutdownSync(1);
            return {
              messages: [],
              aborted: true,
            };
          }
        }
        if (metadata?.external || metadata?.internal) {
          setAppState(sessionMetadataToAppState(metadata));
          applyModelSetting(metadata.external?.model, setAppState);
        }
      } else if (parsedSessionId.isUrl && parsedSessionId.ingressUrl && isEnvTruthy("true"))
        await hydrateRemoteSession(parsedSessionId.sessionId, parsedSessionId.ingressUrl, options.storageV5);
      if (!options.forkSession) {
        let startTime = performance.now();
        let result = await findBackgroundSessionHolder(parsedSessionId.sessionId, options.storageV5);
        recordPhase("resume_live_check_ms", performance.now() - startTime, startTime);
        if (result) {
          let handoff =
            options.liveBackgroundHandoff !== undefined
              ? await options.liveBackgroundHandoff.open({
                  holder: result,
                  entrypoint: "print",
                  prompt: options.liveBackgroundHandoff.prompt,
                  storageV5: options.storageV5,
                })
              : undefined;
          writeStartupFailure(
            `Error: ${formatSessionRunningInBackground({
              holder: result,
              canFork: true,
              handoff,
            })}`,
            isStartupFailureResultRequested() ? options.outputFormat : undefined,
            {
              startupFailureReason: "session_held_by_background",
            },
          );
          gracefulShutdownSync(1);
          return {
            messages: [],
            aborted: true,
          };
        }
      }
      let startTime_2 = performance.now();
      if (
        options.sdkUrl &&
        isRemoteManagedEnvironment() &&
        !options.storageV5 &&
        !env.CLAUDE_CODE_DISABLE_TRANSCRIPT_READ_AHEAD
      ) {
        await prewarmTranscriptReadAhead(
          getTranscriptPathForSession(parsedSessionId.sessionId),
          isShuttingDown,
        );
        if (isShuttingDown()) {
          resumeRows = true;
          return {
            messages: [],
            aborted: true,
          };
        }
      }
      let transcriptAnchor = !parsedSessionId.jsonlFile
        ? await transcriptFileSize(parsedSessionId.sessionId)
        : undefined;
      let jsonl =
        (await options.remoteControlForkChild?.adoptSeed({
          sha256: workerJoinStart?.internal?.fork_seed_sha256 ?? undefined,
          unread: workerJoinStart === null || workerJoinStart.readFailed === true,
        })) ?? null;
      restoreChromeSetupOfferState(workerJoinStart);
      let forkSeed = pendingActionToolUseIds(workerJoinStart, options.tools ?? []);
      let resumedSession =
        env.CLAUDE_CODE_SESSION_BEGAN_AS_COPY === "1" || options.sessionBeganAsCopy === "1";
      let conversationForResume = await loadConversationForResume(
        parsedSessionId.sessionId,
        parsedSessionId.jsonlFile || undefined,
        {
          forkSession: !!options.forkSession,
          ...(options.sdkUrl && {
            acceptCustomIds: true,
          }),
          storageV5: options.storageV5,
          credentials: options.credentials,
          precedingRows: jsonl
            ? {
                rows: jsonl.rows,
                first: jsonl.firstBoot,
              }
            : undefined,
          ...(resumedSession && {
            copiedSessionOwnId: parsedSessionId.sessionId,
          }),
          ...precomputeResumeHooks(io.precompute, options.storageV5, {
            forkSession: !!options.forkSession,
          }),
          ...(forkSeed.size > 0 && {
            hostAnswerableToolUseIds: forkSeed,
          }),
          restoredCardToolUseId: singlePendingAction(workerJoinStart),
          restoredPromptWaits: hasPendingActions(workerJoinStart),
        },
      );
      recordPhase("resume_deserialize_ms", performance.now() - startTime_2, startTime_2);
      if (conversationForResume)
        options.onFreshSessionStartRows?.(
          await maybeWaitForSessionStartHooks(
            conversationForResume,
            options.sdkUrl && options.onOverdueSessionStartHooks
              ? {
                  overdue: options.onOverdueSessionStartHooks,
                  holdActivity: startResumeLoadHold,
                }
              : undefined,
          ),
        );
      failure = "processing_error";
      if (exitIfEndedByModel(conversationForResume, options.outputFormat))
        return {
          messages: [],
        };
      if (
        !conversationForResume ||
        (conversationForResume.messages.length === 0 &&
          (parsedSessionId.isUrl || options.sdkUrl || !conversationForResume.sessionId))
      )
        if (parsedSessionId.isUrl || options.sdkUrl) {
          let hydrated = [];
          if (isPersistentRemoteSessionEnabled()) {
            let CLAUDE_CODE_RESUME_FROM_SESSION = env.CLAUDE_CODE_RESUME_FROM_SESSION;
            if (CLAUDE_CODE_RESUME_FROM_SESSION)
              try {
                logForDebugging(
                  `[resume-from] Hydrating from source session ${CLAUDE_CODE_RESUME_FROM_SESSION}`,
                );
                let { prepareApiRequest } = await import("../utils/teleport/api.js");
                let { teleportFromSessionsAPI, deserializeRemoteSessionLog } =
                  await import("../utils/teleport.lazy.js");
                let { accessToken, orgUUID, profile } = await prepareApiRequest(options.credentials);
                let { log } = await teleportFromSessionsAPI(
                  CLAUDE_CODE_RESUME_FROM_SESSION,
                  orgUUID,
                  accessToken,
                  profile,
                );
                hydrated = deserializeRemoteSessionLog(log);
                logForDebugging(
                  `[resume-from] Loaded ${hydrated.length} messages from ${CLAUDE_CODE_RESUME_FROM_SESSION}`,
                );
              } catch (error) {
                logForDebugging(
                  `[resume-from] Failed to hydrate from ${CLAUDE_CODE_RESUME_FROM_SESSION}: ${errorMessage(error)}`,
                );
              }
          }
          let startTime = performance.now();
          let hooksStart = await (options.sessionStartHooksPromise ??
            runStartupHooks(io, {
              kind: "session-start",
              source: "startup",
              storageV5: options.storageV5,
              credentials: options.credentials,
            }));
          recordPhase("hooks_init_ms", performance.now() - startTime, startTime);
          let startRows = dedupeSessionStartRows(hydrated, hooksStart);
          options.onFreshSessionStartRows?.(startRows);
          let resumeSessionAdoption = resolveResumeSessionAdoption(
            conversationForResume?.sessionId,
            !!options.forkSession,
            {
              acceptCustomIds: !!options.sdkUrl,
            },
          );
          if (conversationForResume && resumeSessionAdoption.adoptedSessionId) {
            switchSession(
              resumeSessionAdoption.adoptedSessionId,
              "resume",
              conversationForResume.fullPath ? dirname(conversationForResume.fullPath) : null,
            );
            restoreSessionMetadata(conversationForResume, {
              storageV5: options.storageV5,
            });
          }
          let planModeOnResume = restorePlanModeOnResume(workerJoinStart, setAppState, {
            lane: options.sdkUrl ? "sdk_url" : "print",
            forkSession: options.forkSession,
          });
          if (lazyTeleportRelayMarker && options.sdkUrl)
            lazyTeleportRelayMarker.noteTeleportBootUnreached(
              "empty_hydration",
              options.relayAwaitsHandoff === true,
            );
          return {
            messages: [...hydrated, ...startRows],
            ...(hydrated.length > 0 && {
              messagesOrigin: "remote",
            }),
            planModeOnResume,
            resumedAsFork: resumeSessionAdoption.effectiveFork,
          };
        } else {
          logEvent("tengu_session_resumed", {
            entrypoint: lit("print"),
            success: false,
            failure_reason: lit("not_found_explicit_id"),
          });
          writeStartupFailure(
            `${SESSION_NOT_FOUND_MESSAGE} ${parsedSessionId.sessionId}`,
            options.outputFormat,
          );
          gracefulShutdownSync(1);
          return {
            messages: [],
          };
        }
      if (options.resumeSessionAt) {
        let index = conversationForResume.messages.findIndex(
          (message) => message.uuid === options.resumeSessionAt,
        );
        if (index < 0) {
          logEvent("tengu_session_resumed", {
            entrypoint: lit("print"),
            success: false,
            failure_reason: lit("processing_error"),
          });
          writeStartupFailure(
            `No message found with message.uuid of: ${options.resumeSessionAt}`,
            options.outputFormat,
          );
          gracefulShutdownSync(1);
          return {
            messages: [],
          };
        }
        let carriedAttachments = [];
        if (options.resumeDropsTurn !== undefined) {
          let declaredTurnRange = findDeclaredTurnRange(
            conversationForResume.messages.slice(index + 1),
            options.resumeDropsTurn,
          );
          if (!declaredTurnRange.ok) {
            logEvent("tengu_session_resumed", {
              entrypoint: lit("print"),
              success: false,
              failure_reason: lit("drop_guard_refused"),
            });
            writeStartupFailure(
              `${RESUME_DROPS_TURN_REJECTED_PREFIX} resuming at ${options.resumeSessionAt} would discard entries not attributable to turn ${options.resumeDropsTurn}: ${declaredTurnRange.reason}`,
              options.outputFormat,
            );
            gracefulShutdownSync(1);
            return {
              messages: [],
            };
          }
          let { keep } = declaredTurnRange;
          carriedAttachments =
            keep && !jsonl?.rows.some((row) => row.uuid === keep.uuid)
              ? [
                  createAttachmentMessage(keep.attachment, {
                    now: () => keep.timestamp,
                    uuid: () => randomUUID(),
                  }),
                ]
              : [];
        }
        let messages = conversationForResume.messages.slice(0, index + 1);
        let askMarker = isAllInvisibleMeta(conversationForResume.messages.slice(index + 1))
          ? null
          : threadAskMarkerFor(messages);
        conversationForResume.messages = [
          ...messages,
          ...carriedAttachments,
          ...(askMarker ? [createAttachmentMessage(askMarker)] : []),
        ];
      }
      let warning = lazyCoordinatorMode.matchSessionMode(conversationForResume.mode);
      if (warning) {
        process.stderr.write(
          warning +
            `
`,
        );
        let agentDefinitions = await reloadAgentDefinitionsForModeSwitch(
          getCwd(),
          options.cliAgents ?? [],
          options.storageV5,
        );
        setAppState((previousState) => ({
          ...previousState,
          agentDefinitions,
        }));
      }
      {
        let restoredMessages = restoredWorkerAgentDefinitions(workerJoinStart);
        let agentDefinitions = switchSessionModelPin(
          {
            ...conversationForResume,
            ...(restoredMessages && {
              replMode: false,
            }),
            source: parsedSessionId.isJsonlFile
              ? !options.sdkUrl && parsedSessionId.jsonlFile
                ? resumeSourceForPath(parsedSessionId.jsonlFile)
                : "file"
              : parsedSessionId.isUrl || options.sdkUrl
                ? "remote"
                : "store",
            sdkUrlWorker: Boolean(options.sdkUrl),
            headless: true,
          },
          resumeWarningSink(conversationForResume.messages, options.outputFormat),
        );
        weakMap_2.set(io, agentDefinitions);
      }
      let { adoptedSessionId, effectiveFork } = resolveResumeSessionAdoption(
        conversationForResume.sessionId,
        !!options.forkSession,
        {
          acceptCustomIds: !!options.sdkUrl,
        },
      );
      if (adoptedSessionId) {
        switchSession(
          adoptedSessionId,
          "resume",
          conversationForResume.fullPath ? dirname(conversationForResume.fullPath) : null,
        );
        if (persistSession) await resetSessionFilePointer();
      }
      restoreSessionStateFromLog(conversationForResume, setAppState, storageV5, {
        preserveLiveBudget: false,
      });
      let liveSourceRowIds = jsonl !== null ? new Set(jsonl.rows.map((row) => row.uuid)) : undefined;
      let planModeOnResume = restorePlanModeOnResume(workerJoinStart, setAppState, {
        lane: options.sdkUrl ? "sdk_url" : "print",
        forkSession: options.forkSession,
        transcript: {
          messages: conversationForResume.messages,
          sourceRows:
            liveSourceRowIds === undefined
              ? conversationForResume.messages
              : conversationForResume.messages.filter((prev) => !liveSourceRowIds.has(prev.uuid)),
          sourceAllowed: isTranscriptPlanSourceAllowed(options),
        },
      });
      if (effectiveFork) {
        await adoptForkSessionMetadata(conversationForResume, {
          stripWorktreeSession: true,
          stripRelocatedCwd: true,
          storageV5: options.storageV5,
        });
        if (conversationForResume.contentReplacements?.length)
          await recordContentReplacement(
            conversationForResume.contentReplacements,
            undefined,
            options.storageV5,
          );
      } else {
        restoreSessionMetadata(conversationForResume, {
          storageV5: options.storageV5,
        });
        reclaimSessionNameAtStart(options).catch(logError);
      }
      queueMemoryNotices(options.outputFormat);
      setCostStateForRestore(conversationForResume);
      if (!effectiveFork) {
        let persist = persistSession && !!adoptedSessionId;
        if (
          await refuseUnsafeWorktreeResume(
            io,
            conversationForResume.worktreeSession,
            {
              persist,
              storageV5: options.storageV5,
            },
            options.outputFormat,
          )
        )
          return {
            messages: [],
            aborted: true,
          };
      }
      saveMode(lazyCoordinatorMode.isCoordinatorMode() ? "coordinator" : "normal");
      logEvent("tengu_session_resumed", {
        entrypoint: lit("print"),
        success: true,
        interruption_kind: fromEnum(conversationForResume.turnInterruptionState?.kind ?? "none"),
        resume_duration_ms: Math.round(performance.now() - startTime),
      });
      if (lazyTeleportRelayMarker && options.sdkUrl) {
        let startTime = performance.now();
        await lazyTeleportRelayMarker.bootTeleportFromTranscript(
          parsedSessionId.sessionId,
          conversationForResume.messages,
          options.storageV5,
          options.relayAwaitsHandoff === true,
        );
        recordPhase("relay_marker_scan_ms", performance.now() - startTime, startTime);
      }
      return {
        messages: conversationForResume.messages,
        liveSourceRows: liveSourceRowIds,
        turnInterruptionState: conversationForResume.turnInterruptionState,
        supersededToolUseIds: conversationForResume.supersededToolUseIds,
        supersededToolNames: conversationForResume.supersededToolNames,
        answeredToolUseIds: conversationForResume.answeredToolUseIds,
        rescueSuppressed: conversationForResume.rescueSuppressed,
        deferredToolUse: conversationForResume.deferredToolUse,
        agentSetting: conversationForResume.agentSetting,
        sessionProjectPath: conversationForResume.projectPath,
        planModeOnResume,
        transcriptAnchor,
        resumedAsFork: effectiveFork,
      };
    } catch (error) {
      let phase = failure;
      logEvent("tengu_session_resumed", {
        entrypoint: lit("print"),
        success: false,
        failure_reason: fromEnum(phase),
        error_name: sanitizedErrorNameForTelemetry(toError(error)),
        error_code: sanitizedErrnoLowerForTelemetry(error),
      });
      if (error instanceof ResumeRefusedError);
      else if (
        phase === "load_error" &&
        (isTranscriptLoadError(error) || error instanceof ForkSeedUnverifiedError)
      )
        logForDebugging(`--print resume load failed (${getErrnoCode(error)}): ${errorMessage(error)}`, {
          level: "error",
        });
      else logError(error);
      let resumeFailure =
        error instanceof Error
          ? `${FAILED_TO_RESUME_SESSION_TEXT}: ${describeTranscriptLoadError(error, phase)}`
          : `${FAILED_TO_RESUME_SESSION_TEXT} with --print mode`;
      weakMap_2.delete(io);
      writeStartupFailure(resumeFailure, options.outputFormat);
      gracefulShutdownSync(1);
      return error instanceof ResumeRefusedError
        ? {
            messages: [],
            aborted: true,
          }
        : {
            messages: [],
          };
    } finally {
      if (!resumeRows) resumeArg?.();
    }
  }
  if (isParkedSpare())
    return {
      messages: [],
    };
  let sessionStartRows = await (options.sessionStartHooksPromise ??
    runStartupHooks(io, {
      kind: "session-start",
      source: "startup",
      storageV5: options.storageV5,
      credentials: options.credentials,
    }));
  options.onFreshSessionStartRows?.(sessionStartRows);
  return {
    messages: sessionStartRows,
  };
}
//@ chunk-0yw3taqg.js:930495-931481 sole-consumer
/**
 * 会话恢复加载失败时给出人能看懂的原因：按存储错误码 ELOOP/ENXIO/EFBIG/EAGAIN 分别说明（符号链接、不是普通文件、超出大小限制、读取不一致），其他情况返回原始错误消息。
 */
function describeTranscriptLoadError(error, phase) {
  if (phase !== "load_error") return error.message;
  let win32Help = win32EbadfHelp(error);
  if (win32Help !== undefined) return win32Help;
  switch (storageCauseErrnoCode(error)) {
    case "ELOOP":
      return "this session's transcript is a symbolic link, which session storage does not read through. If you made that link yourself, put the original file back in its place; otherwise remove the link.";
    case "ENXIO":
      return "this session's transcript path is not a regular file (a folder, pipe, socket or device sits where the transcript file should be), which session storage does not read. Remove whatever replaced the file; the session cannot be resumed from it.";
    case "EFBIG":
      return "this session's transcript is over the size limits session storage applies when loading one (the whole transcript, a single entry in it, or the number of entries), so it cannot be resumed here.";
    case "EAGAIN":
      return "this session's transcript could not be read in one consistent pass (it changed, or was briefly unavailable, while being read); run the command again.";
    default:
      return error.message;
  }
}
//@ chunk-0yw3taqg.js:931481-932527 sole-consumer
/**
 * 无头模式选输入输出通道：没有 sdkUrl 时用本地 StructuredIO；否则建 RemoteIO（会话入口认证头、worker epoch、turn_handoff 注册元数据、暂存文件回调），bridge 环境下登记受监管的桥接会话。
 */
function createHeadlessIO(prompt, options, turnHandoff, carriedWrites, stageCallbacks) {
  let initialPromptLine =
    typeof prompt === "string" && prompt.trim() !== ""
      ? jsonStringify({
          type: "user",
          session_id: "",
          message: {
            role: "user",
            content: prompt,
          },
          parent_tool_use_id: null,
        })
      : undefined;
  let stdinLane = typeof prompt === "string" ? undefined : prompt;
  if (!options.sdkUrl)
    return new StructuredIO(
      stdinLane ?? replayAsyncIterable(initialPromptLine === undefined ? [] : [initialPromptLine]),
      options.replayUserMessages,
      options.sessionState,
    );
  let { environmentKind, workerEpoch, hosting, reportParkAtInit } =
    options.earlyRemoteLink?.inputs ?? cliRemoteWorkerInputs();
  let rereadsIngressToken = environmentKind === null && !isReviewSession();
  let remoteIO = new RemoteIO({
    streamUrl: options.sdkUrl,
    initialPrompt: initialPromptLine,
    stdinLane,
    replayUserMessages: options.replayUserMessages,
    sessionState: options.sessionState,
    storageV5: options.storageV5,
    getAuthHeaders: getSessionIngressAuthHeaders,
    rereadMissingAuthHeaders: rereadsIngressToken ? rereadSessionIngressToken : undefined,
    sessionId: getSessionId(),
    workerEpoch,
    environmentKind,
    isResume: hasResumeFlag(process.argv),
    earlyHydrateReads: options.earlyHydrateReads,
    earlyRemoteLink: options.earlyRemoteLink,
    reportParkAtInit,
    hosting,
    initExternalMetadata: turnHandoffRegistrationNow(turnHandoff, workerEpoch, carriedWrites),
    announcedExternalMetadata: () =>
      turnHandoffRegistrationToAnnounce(turnHandoff, workerEpoch, carriedWrites),
    onStageFileDelivered: stageCallbacks.noteStagedRow,
    onUserFrameDelivered: stageCallbacks.markUserFrameDelivered,
  });
  if (environmentKind === "bridge")
    setSupervisedBridgeSession(
      new URL(options.sdkUrl).pathname.replace(/\/$/, "").split("/").pop() ?? "",
      options.storageV5,
      bridgeOwnerAccount(),
    );
  return remoteIO;
}
//@ chunk-0yw3taqg.js:932527-932572 sole-consumer (2.1.88 match: mergeClients, 0.78)
function mergeClients(...lists) {
  return uniqByExport(lists.flat(), "name");
}
//@ chunk-0yw3taqg.js:932572-932634 sole-consumer
function mergeClientsWithCommsServers(...lists) {
  return [...mergeClients(...lists), ...lists.flat().filter(isCommsRoledServer)];
}
//@ chunk-czq1j3j2.js:842817-843032 fingerprint (2.1.88 match: trackReceivedMessageUuid, 0.591)
function trackReceivedMessageUuid(countsByAgent, agents) {
  let seenIds = new Set();
  for (let { id, tokenCount } of agents) {
    seenIds.add(id);
    let counts = countsByAgent.get(id);
    if (!counts) countsByAgent.set(id, (counts = []));
    counts.push(tokenCount);
    if (counts.length > SIDE_QUESTION_MAX_AGENTS) counts.splice(0, counts.length - SIDE_QUESTION_MAX_AGENTS);
  }
  for (let key of countsByAgent.keys()) if (!seenIds.has(key)) countsByAgent.delete(key);
}
export {
  finalContextTokensFromLastResponse,
  emitLoadError,
  getStructuredIO,
  isInterruptOwnedInline,
  isImmediateInterruptRequest,
  readDisallowedToolsMetadata,
  handleOrphanedPermissionResponse,
  controlErrorResponse,
  removeInterruptedMessage,
  assistantTurnKeys,
  toScopedConfig,
  controlSuccessResponse,
  trackReceivedMessageUuid,
  PERMISSION_PROMPT_TOOL_NOT_FOUND_NO_MCP_TOOLS_TELEMETRY_MESSAGE,
  PERMISSION_PROMPT_TOOL_NOT_FOUND_TELEMETRY_MESSAGE,
  PERMISSION_PROMPT_TOOL_NOT_MCP_TELEMETRY_MESSAGE,
  _buildInitializeResponsePayloadForTesting,
  _runHeadlessStreamingForTesting,
  canJoinOAuthFlow,
  mergeClientsWithCommsServers,
  createCanUseToolWithPermissionPrompt,
  dirSyncPullParticipant,
  endHeadlessSessionOnEscapedError,
  endHeadlessSessionOnOutputWriteFailure,
  explicitMcpConfigRequestsWait,
  getCanUseToolFn,
  homeSeedHoldParticipant,
  messageHasToolUseId,
  isLastMessageCandidate,
  isWindowDivergentWrite,
  loadInitialMessages,
  mergeClients,
  ownCostLedger,
  registerStartupSdkEventForwarder,
  relayMcpWaitLeft,
  runHeadless,
  seatMainThreadAgentFromPool,
  isModelDifferentFromRestricted,
};
