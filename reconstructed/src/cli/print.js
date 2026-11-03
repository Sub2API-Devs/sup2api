/**
 * cli/print.ts
 *
 * 并入旧版已有路径：-p 打印/SDK 模式的主循环辅助。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/print.ts
 * pieces: chunk-18hwfzwa.js (1), chunk-e6aww6q8.js (7), chunk-j387qrdq.js (8), chunk-nkdv7dw8.js (7), chunk-tyg7f3ek.js (46)
 * attribution: fingerprint 15, placement 12, layout 28, sole-consumer 11, callgraph-witnessed 2, file-local 1
 */
import { randomUUID } from "crypto";
import { cwd } from "process";
import { join, sep, dirname } from "path";
import { open, realpath } from "fs/promises";
import {
  rowsSinceTurnStart,
  isQueuedPromptAnswered,
  answeredHeldUuids,
  runningTurnSendsForTurn,
} from "./print/transcriptChain.js";
import { logError, getInMemoryErrors, logMCPDebug } from "../utils/log.js";
import {
  isCompactBoundaryMessage,
  messagesSinceCompactBoundary,
  hasRelaySourceForClients,
  hasUpdateStatusToolOnly,
  hasStartThreadToolOnly,
} from "../services/projects/threadRows.js";
import {
  isSyntheticApiErrorMessage,
  createSystemMessage,
  createUserMessage,
  isCompactBoundaryOrSummary,
  extractTextContent_2,
  getLastAssistantTextForResult,
  isToolUseResultMessage,
} from "../utils/messages.js";
import {
  isInterruptMarkerRow,
  isPlainInterruptMarker,
  findLastUserPromptUuid,
  appendSessionStartRows,
  ResumeRefusedError,
  dedupeSessionStartRows,
  hasToolResultBlock_3,
  isLegacyInterruptMarker,
} from "../utils/transcript/deserialize.js";
import { heldUuidsIfEnabled, isSelfHostedHeldRecognition } from "./print/queuedMessageUtils.js";
import {
  isPermissionCardHoldEnabled,
  pendingActionsAmbiguous,
  interruptedPromptUuid,
  createTeardownStatusReporter,
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
  userMessagePlatformFields,
} from "./print/parkedPrompts.js";
import { logForDebugging, createAttachmentMessage_2 as createAttachmentMessage } from "../utils/debug.js";
import {
  isDifferentString,
  isValidBridgeToolName,
  BridgeToolProvider,
} from "../bridge/bridgePermissionResponse.js";
import { getRemoteFlagOverrideState, needsGrowthBookRefresh } from "../utils/permissions/yoloClassifier.js";
import {
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
  getSyncedPluginReloadDebt,
  markPrintInputClosed,
  setMainThreadAgentType,
  setSdkPerTaskStopAffordance,
  setSdkRapidFollowupPreempt,
  setSdkForwardNestedSubagentToolCalls,
  setSessionSkillAllowlist,
  setInitJsonSchema,
  setAllowedChannels,
  isSessionPersistenceDisabled,
  switchSession,
} from "../bootstrap/state.js";
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
  getInitialSettings_2,
  getSettings_DEPRECATED,
  getSettingsWithSources_2,
  getSettingsWithErrors_2,
  updateSettingsForSource,
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
  isFastModeEnabled,
  fastModeSettingDiverges,
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
import { logEvent, logEventAsync } from "../services/analytics/index.js";
import { lit, fromEnum, fromEnumOpt, fromNumber } from "../services/analytics/safeMetadata.js";
import { isQualifiedForGrove, checkGroveForNonInteractive } from "../services/api/grove.js";
import {
  recordPhase,
  noteSdkMcpDial,
  recordInputReadyFromSpawn,
  markResumeHydratePrefetch,
} from "../utils/startupTiming.js";
import {
  initializeGrowthBook,
  getFeatureValue_CACHED_MAY_BE_STALE,
  hasFreshGrowthBookFeatures,
  getFeatureValue_SESSION_PINNED,
} from "../services/analytics/growthbook.js";
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
import {
  gracefulShutdownSync,
  isShuttingDown,
  gracefulShutdown,
  markPrintModeSignalHandlersRegistered,
} from "../utils/gracefulShutdown.js";
import { markPrintPollEventWiring } from "../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
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
import { env } from "../utils/env.js";
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
  MCP_CALL_RESULT_LIMITS,
  PRINT_TURN_POLL_MS,
  TEAM_SHUTDOWN_REMINDER,
  teamTeardownParkTimeoutMs,
  isTeamShutdownReminder,
  lazyAutonomousLoop,
  lazyCronScheduler,
  lazyCronJitterConfig,
  PRINT_TURN_MAX_ATTEMPTS,
  PRINT_TURN_TIMEOUT_MS,
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
  pickForTransport,
  isLocalStdinOnly,
  mayTransportPersist,
  emptyIfTransport,
  statusesForTransport,
  isBridgeOrTransport,
} from "./transportState.js";
import { isStreamJsonStdin, applyInitializePlugins } from "./startup/awaitInitialize.js";
import {
  isRemoteManagedEnvironment,
  workingSyncAdmission,
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
import { isHermeticRemoteSession } from "../services/cloudSessions/eligibility.js";
import { getPreSettingsEnvSnapshot } from "../utils/managedEnvApply.js";
import {
  createTurnGateParticipants,
  restoreCostState,
  COST_PUSH_INTERVAL_MS,
  heldUuidsAnsweredByTurn,
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
  hasHitUnattendedRestartLimit,
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
  FAILED_TO_RESUME_SESSION_TEXT,
  SESSION_NOT_FOUND_MESSAGE,
} from "./print/controlRequestMisc.js";
import { applyPermissionAnswerChanges } from "../utils/permissions/permissionAnswer.js";
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
  CloudPluginSwitches,
  retirementPromptRows,
  installSdkEventDrain,
  createPromptSuggestionEmitter,
  createRateLimitFrameRelay,
  fileAdminLimitRequest,
  TurnStartChecks,
  SdkMcpServerWait,
} from "./print/turnStartChecks.js";
import {
  restoreTaskListAtBoot,
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
  prepareCloudBrowserTurn,
  admitCloudBrowserTurnId,
  escapePromptUnlessDisabled,
  withdrawnFileUuidsOf,
  ingressSubmitFlags,
} from "./remoteIO/ingress.js";
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
import { formatModelRestrictedNotice } from "../utils/model/validateModel.js";
import { getMainLoopModel, modelSettingResolvesThroughModelStrings } from "../utils/model/model.js";
import { REWIND_UNSAFE_PATH_REASON, NO_RESPONSE_REQUESTED } from "../constants/messages.js";
import { writeToStdout, markStdoutDrainExternallyClocked, outstandingStdoutBytes } from "../utils/process.js";
import { filterToolsByDenyRules } from "../utils/permissions/filterToolsByDenyRules.js";
import {
  withLateEnabledToolsIfAdvertised,
  TOOL_POOL_MEMO_TTL_MS,
  assembleToolPool,
  TOOL_CATALOG,
} from "../tools.js";
import {
  mcpInfoFromString,
  getMcpPrefix,
  isToolFromMcpServer,
  matchesListedOrParsedServer,
  collectServerToolPolicies,
  mergeMcpServerPolicyRules,
} from "../services/mcp/mcpStringUtils.js";
import {
  notifyRequiresAction,
  makePermissionModeReader,
  notifyProactivityChanged,
  onProactivitySelectorChange,
  cycleProactivityLevel,
  proactivityStateStub,
} from "./print/proactivityControl.js";
import { toolMatchesName, findToolByName, alwaysFalse as alwaysFalse_2 } from "../Tool.js";
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
  isIdlePluginRefreshEnabled,
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
  TENGU_WITTY_KAY,
  retryWatchdogEnv,
  TENGU_GOOFY_HARE,
  TENGU_WONDROUS_HAVEN,
} from "../services/api/withRetry.js";
import {
  dedupeTasksById,
  isTranscriptLocalGcEnabled,
  isCcrSubagentSkipOnDeltaGateOn,
  isWondrousIslandGateOn,
} from "./remoteIO/gates.js";
import {
  collectOrphanTasks,
  restoreOrphanAgents,
  orphanAgentRestoreNotice,
  describeInterruptedTasks,
} from "./remoteIO/orphanAgentRestore.js";
import {
  logFeatureBad,
  logFeatureOk,
  logFeatureSad,
  withFeatureTelemetry,
} from "../services/analytics/featureTelemetry.js";
import { describeRunningProcesses } from "../utils/sessionState.js";
import { createTaskFramework, getRunningTasks } from "../utils/task/framework.js";
import { formatOrphanSummary, startupStandInPlan } from "../tasks/resumeOrphanedTasks.js";
import { restoreRemoteAgentTasks } from "../tasks/RemoteAgentTask/RemoteAgentTask.js";
import {
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
import { restoreToolsKeptByClear } from "../services/compact/keptTools.js";
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
  mcpConnectionClosedMessage,
  resolveTurnAgent,
  applyRequestedAgent,
  reportCommandRefused,
  handleTurnHandoff,
  dropBeforeAttachments,
  acceptStdinPeerMessage,
} from "./print/peerMessages.js";
import {
  readRecordedThinkingSettings,
  restoreThinkingSettingsFromRecord,
  modelToRestoreAfterRefusal,
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
import { ndjsonStringifyWithReplacer, ndjsonStringify } from "./ndjsonSafeStringify.js";
import { isExtractModeActive, AUTO_MEM_DIRNAME_2 } from "../memdir/paths.js";
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
  fullscreenClients,
  showPane,
  focusPane,
  allPanes,
  closePane,
} from "../plugins/functionHooks/panes.js";
import { McpConnectionStore } from "../services/mcp/mcpConnectionStore.js";
import { PluginsStateStore } from "../utils/plugins/pluginLoadStatus.js";
import { computerUseOwnerLock, ComputerUseStateCell } from "../utils/computerUse/computerUseMcpState.js";
import { startCgroupCpuSampling, startToolCpuSampling } from "./print/toolCpuSampling.js";
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
  interruptedTurnUuids,
  PrintRunState,
  wrapPersistenceWithFollowupCheck,
  countUserPromptsFromEntries_4,
  isImmediateCommandCandidate,
} from "./print/inboundMessages.js";
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
import { hasBatchableQueuedPrompt, TurnDispatcher, isBusyOrClosed, isBusy } from "./print/turnDispatch.js";
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
  SDKSetChromeBrowserHintsSetChromeBrowserHintsMessageSchema,
  SDKSetPromptSuggestionsPausedSetPromptSuggestionsPausedMessageSchema,
  SDKMessageRatedMessageRatedMessageSchema,
} from "../entrypoints/sdk/controlSchemas.js";
import { stopObserverAgents, stopAllRunningTasks, stopTaskByUser } from "../tasks/stopTask.js";
import { PrewaitLatch, interruptOnNowPriority, OneShotRunLimits } from "./print/runEndReasons.js";
import {
  commandsDiscardedSignal,
  isActiveMainAgentCommand,
  firstSchedulingPlugin,
  textNotTypedFlags,
  isSendableQueuedCommand,
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
  isEligibleBridgeMessage,
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
  extractReadFilesFromMessages,
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
import { informationalSystemMessage } from "./print/sdkMessageStream.js";
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
  vscodeSurveyConfig,
  feedbackSurveyCapabilities,
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
import {
  toolNameForTelemetry,
  copyCcrMarks,
  filterObject,
  markCcrInjectedConfig,
  copyOwnServerMarks,
  hasCcrMeta,
} from "../services/analytics/metadata.js";
import {
  refetchReasonTelemetry,
  filterCommandsByServer,
  excludeCommandsByServer,
  commandBelongsToServer,
  isMcpTool,
  removeMcpClientsWhere,
  isDeclaredUnderOtherWorkspaceRoot,
  isStdioConfig,
  isNonReservedStdioConfig,
} from "../services/mcp/utils.js";
import {
  applyMcpReconnect,
  resolveReconnectConfig,
  reconnectMcpOnIdentityChange,
  watchMcpDisconnects,
  createReconnectBackoff,
  makeCommitReconnect,
  markServerDisabled,
  refusalStateFor,
} from "../services/mcp/mcpReconnect.js";
import {
  identityEpoch,
  setIdentityTrippedHandler,
  takeIdentityTripUnowned,
  rearmIdentityBaseline,
} from "../services/mcp/identityChange.js";
import { isDiscoveryCacheUsable, isDiscoveryCacheOn } from "../services/mcp/mcpAccountKey.js";
import {
  getMcpConfigByName,
  mcpDialBlockCause,
  isMcpServerDisabled,
  emptyServerMap,
  MCP_SETTINGS_SCOPE_SET,
  supportsEnvExpansion,
  getAllMcpConfigs,
  isBuiltinInProcessMcpServer,
  isMcpServerBlockedAtConnectTime,
  reservedServerNameMessage,
  isMcpDialBlockedByPolicy,
  filterMcpServersByPolicy,
  doesEnterpriseMcpConfigExist,
} from "../services/mcp/config.js";
import {
  identityChangedForRemote,
  identityChangedFailure,
  isRemoteMcpTransport,
} from "../services/mcp/discoveryIdentity.js";
import { sanitizeTelemetryString, sanitizeRelayUrl, formatElicitationUrls } from "../utils/sanitization.js";
import { isCliOwnedConfig, getCliOwnedState } from "../services/mcp/cliOwnedClients.js";
import { applyMcpServerConfig } from "../components/mcp/MCPListPanel.js";
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
import { uniq, uniqBy, count } from "../utils/collections.js";
import { setupVscodeSdkMcp } from "../services/mcp/vscodeSdkMcp.js";
import { isRefusalFallbackActive } from "../services/api/safeguardMessages.js";
import { isRefusalFallbackEnabled } from "../services/api/refusalFallback.js";
import { getNextAnnouncementJson } from "../services/startupAnnouncements.js";
import { handleAutoDefaultNudgeEventFromHost, shouldShowAutoDefaultNudge } from "./print/autoDefaultNudge.js";
import { getOwn } from "../utils/objectSafety.js";
import {
  partitionOperatorServers,
  OPERATOR_SUPPLIED_IGNORED_TEXT,
  isAlwaysKeptServer,
} from "../services/mcp/mcpConfigProvenance.js";
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
  isUltrathinkEffective,
  parseEffortLevel,
  persistEffortSetting,
  getEffortLevelIfSupported,
} from "../utils/effort.js";
import { viewTeammateOutput } from "../components/teams/TeamsDialog.js";
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
import { subscribeFocusMode } from "../utils/focusMode.js";
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
import { resolveHearthToolNames, CLAUDE_CODE_REMOTE } from "../services/mcp/ccrMetaMcp.js";
import { latestHumanRelayAt, threadAskMarkerFor } from "../services/projects/threadTranscript.js";
import {
  stagedFilesWaiterByRoot,
  createStagedFilesWaiter,
  stageWaitTimeoutFor,
  classifyStageWriteError,
} from "../utils/ccrStageFiles.js";
import { isToolResultForToolUse, queuePriorityOrUndefined } from "../utils/messages/messagePredicates.js";
import { makeStoreConfirmTimer } from "../utils/queryProfiler.js";
import {
  nonBuiltinMarketplaceServers,
  initialWriteAttempt,
  filterServersForScope,
  latchWriteAttempt,
  sanitizeMcpResourceError,
  SERVERS_OBJECT_REQUIRED_TEXT,
  sanitizeMcpStatusMap,
  describeMcpServerForStatus,
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
} from "./print/mcpControlRequests.js";
import { isManagedConfigScope, isPluginServerConfig } from "../services/mcp/types.js";
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
  UI_HOST_REQUEST_TIMEOUT_MS,
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
  toScopedConfig,
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
import { hasBesideArrivingFiles } from "../bridge/attachmentFilesWait.js";
import { createIdleTimeoutManager } from "../utils/idleTimeout.js";
import { getNonInteractiveCommands, mergeClients as mergeClients_2 } from "../utils/commandPredicates.js";
import { loadAllPluginsCacheOnly } from "../utils/plugins/pluginLoader.js";
import { isConnectedOrCached } from "../skills/bundled/scheduleRemoteAgents.js";
import { waitForStoreState } from "../context/voice.js";
import { marketplaceSuffix, parsePluginIdentifier_2 } from "../utils/plugins/pluginIdentifier.js";
import { SYNCED, pluginIdForTelemetry } from "../utils/telemetry/pluginTelemetry.js";
import { normalizeNameForMCP } from "../services/mcp/normalization.js";
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
  LOGIN_VERIFY_TIMEOUT_MS,
  LOGIN_RESTORE_TIMEOUT_MS,
  LOGIN_SETTLE_TIMEOUT_MS,
  LOGIN_REVOKE_TIMEOUT_MS,
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
import { runWithDroppableTurnId, runWithCcrTurnId, pickTurnIdForRelay } from "../services/mcp/ccrTurnId.js";
import { withWorkloadStorage } from "../utils/http.js";
import { withInteractionSpan, endInteractionSpan } from "../utils/telemetry/sessionTracing.js";
import { activityManager } from "../utils/activityManager.js";
import { settleOwedTitle, retractPendingTitle, maybeTitleFromUserMessage } from "./print/sessionTitles.js";
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
import {
  controlHandlerError,
  dispatchControlRequest,
  logHandlerFailure,
} from "./print/dispatchControlRequest.js";
import { ReannounceRequester } from "../remote/tools/reannounceRequest.js";
import {
  registerRepoRoot,
  registerRepoRootErrorClass,
  REGISTER_REPO_ROOT_ERROR_TONES,
} from "../services/repoRoots/registerRepoRoot.js";
import { applyValidatedPermissionUpdate } from "../utils/permissions/PermissionUpdate.js";
import { pinResolvedWorkingDirPath, matchingRuleForInput } from "../utils/permissions/filesystem.js";
import { clearMemoryFilesCache } from "../components/Message.js";
import { isAdditionalDirWithoutNestedMemory } from "../utils/attachments.js";
import { HeldInputReader } from "./print/inputReader.js";
import { isTerminalTitleEnabled } from "../utils/terminalTitle.js";
import { setJitPolicyAfterStartup } from "../utils/jitPolicy.js";
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
import {
  readFileAsWrittenUnservedReason,
  refreshAuthDependentSettings,
} from "./print/authAndPolicyRefresh.js";
import { setHostSessionsBearerSource } from "../utils/hostSessionsBearer.js";
import { endStartupMarkReporting, sanitizeMarkName } from "../utils/startupMarks.js";
import { isPrototypeKey } from "../schemas/hookEntryValidation.js";
import { isPlainObject as isPlainObject_2 } from "../utils/isPlainObject.js";
import { sanitizeSessionTitle, getFirstLine, truncateToLength } from "../utils/stringUtils.js";
import { adoptSuppliedSessionTitle } from "../utils/concurrentSessions.js";
import {
  parseMcpServerSettings,
  inspectToolsList,
  describeToolsListIssues,
  sameToolPolicies,
} from "../services/mcp/serverIdentity.js";
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
  PROMPT_TOOL_ALLOW_IMITATOR_DENY_REASON,
  PROMPT_TOOL_ALLOW_FLAGGED_MCP_DENY_REASON,
  NO_PROMPT_SURFACE_REASON,
} from "../types/permissions.js";
import {
  getGlobalConfig,
  readFreshOauthAccountFromDisk,
  getExplicitRemoteControlAtStartup,
} from "../utils/config.js";
import { injectMcpMessage, onMcpNotification, setMcpOnClose } from "../services/mcp/mcpWireUtils.js";
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
import { expandPath } from "../utils/path.js";
import { vetPathSpellingsOrChain, pathVettingReason } from "../utils/permissions/pathVetting.js";
import { isPathAllowed } from "../utils/permissions/pathValidation.js";
import { isNonEmptyValue } from "./cloudSession/hostedSessionRestrictions.js";
import { isCloudPluginForwardingFlagOn } from "../services/analytics/violinGates.js";
import { invalidateCommandNames } from "../utils/settings/commandSyncNames.js";
import { computePluginReloadImpact, logReloadPluginsImpact } from "../utils/plugins/reloadImpact.js";
import { retryUnloadedModules } from "../plugins/functionHooks/hooksModuleLoader.js";
import { IMAGE_LIMITS } from "../utils/truncateGraphemes.js";
import { stripAnthropicMeta } from "../services/mcp/anthropicMeta.js";
import { McpToolResultNotReadError } from "../services/mcp/mcpResultErrors.js";
import { classifyMcpAuthTarget } from "../services/mcp/auth.js";
import {
  mcpRefusalText,
  disabledEnableBeforeText,
  notApprovedText,
  mcpGateError,
} from "../services/mcp/mcpToggleMessages.js";
import { claudeAiConnectorAuthUrl, requiresConnectorGrant_2 } from "../services/mcp/claudeai.js";
import { shouldSkipCustomRedirect } from "../services/mcp/customRedirectSkip.js";
import { sanitizeErrorDetail, normalizeMcpServerName } from "../services/api/deferredToolsState.js";
import { redactMcpErrorDetail } from "../services/mcp/mcpServerOrigin.js";
import { deleteNeedsAuthCache } from "../services/mcp/needsAuthCache.js";
import { isDcrRejection } from "../services/mcp/sdkAuth.js";
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
} from "../services/oauth/refusedSignIn.js";
import { resetSliceIfUnchanged } from "../state/artifactReadState.js";
import {
  CONNECT_RETRY_BASE_MS,
  applyConnectionResult,
  findReusableClients,
  retryRemoteMcpServers,
} from "../services/mcp/connectionBatch.js";
import { getAPIProvider } from "../utils/model/providers.js";
import { signOutFailureMessage } from "../commands/logout/logout.js";
import { flushDiscoveryCache } from "../services/mcp/discoveryCache.js";
import { PLUGIN_FORWARDING_DISABLED } from "../utils/plugins/cloudPluginForwarding.js";
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
import { buildSideQuestionFallbackParams } from "../utils/queryContext.js";
import { query } from "../query.js";
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
import { promptOriginKind } from "../utils/processUserInput/promptOrigin.js";
import { buildExternalEventRecord } from "../utils/externalEventRecords.js";
import { dispatchSessionReceiveHooks } from "../plugins/functionHooks/sessionReceive.js";
import { originFromBridgeMetadata } from "../utils/messageOrigin.js";
import { stripPeerMessageBody, peerMessageInfo } from "../utils/peerMessageHeaders.js";
import { backgroundTaskByToolUseId, backgroundAll } from "../tasks/LocalShellTask/LocalShellTask.js";
import { setInboundAvailabilityPublisher } from "../utils/crossSessionInbound/inboundMode.js";
import { persistBridgeArtifactFrames } from "../utils/sessionTagRefresh.js";
import { installRemoteEgressSuppressor, transcriptFileSize } from "./print/turnStreaming.js";
import { ENUM_PROMPT } from "../components/nudges/nudgeIds.js";
import { toInternalMessages } from "../utils/messages/mappers.js";
import { emailSenderTurnDetected, checkEmailSenderTurn } from "../utils/permissions/emailSenderFrame.js";
import { isSessionReceiveHooked } from "../plugins/functionHooks/sessionHooks.js";
import { isProjectsHumanOriginEnabled } from "../utils/crossSessionMessagingGate.js";
import { HEARTH_AGENT } from "../services/projectsRelay/relayConfig.js";
import {
  isLocalDesktopPrompt,
  takeSeededSummon,
  consumeSeededSummon,
} from "../services/artifacts/comments/autoreactState.js";
import { extractCcrTraceContext } from "../utils/telemetry/ccrTraceContext.js";
import { hasModuleHookingSite } from "../plugins/hooksModules/loadedModuleFilters.js";
import { pluginsMatchingEvent } from "../plugins/functionHooks/hookDispatch.js";
import { isTurnDisallowedToolName } from "./printUsageSummary.js";
import { isHumanOrigin, isHumanDrivenOrigin } from "../utils/turnOrigin.js";
import { startupCcrEnv } from "../tasks/RemoteAgentTask/remoteAgentKinds.js";
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
import { DEFAULT, getAllOutputStylesCached } from "../constants/outputStyles.js";
import { managedOutputStylesDir } from "../outputStyles/loadOutputStylesDir.js";
import {
  fileHistoryEnabled,
  fileHistoryCanRestore,
  fileHistoryGetDiffStats,
  fileHistoryRewind,
} from "../utils/fileHistory.js";
import {
  gateChannelServer,
  ChannelMessageNotificationSchema,
  wrapChannelMessage,
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
import { Ji } from "../../vendor/lodash-es/uniqBy.js";
import { normalizeUuidOrNull } from "../utils/agentId.js";
import { EMPTY_USAGE } from "../services/api/emptyUsage.js";
import { disallowedToolsSchema, mcpToolNameSchema } from "../utils/attachments/skillMentions.js";
import { xr, En, wS } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { Uo } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { isStandardKeyActive } from "../services/mcp/mcpStandardKeys.js";
import { awaitMcpPolicyColdStart } from "../services/mcp/mcpPolicyColdStart.js";
import { getServerUrl } from "../utils/permissions/permissionRulePayload.js";
import { isLockedOutByOrgMcpPolicy } from "../services/mcp/orgMcpPolicyLockout.js";
import { getPrefixServerKey } from "../components/agents/ToolSelector.js";
import { areSideloadFlagsDisabledByPolicy } from "../utils/plugins/marketplacePolicy.js";
import { omitKeys } from "../utils/hooks/hookCommandResolution.js";
import { reconcileMcpClients } from "../services/mcp/mcpClientState.js";
import { toDynamicServerConfig } from "../services/mcp/dynamicServers.js";
import { ListMcpResourcesTool } from "../tools/ListMcpResourcesTool/ListMcpResourcesTool.js";
import { ReadMcpResourceTool } from "../tools/ReadMcpResourceTool/ReadMcpResourceTool.js";
import { listDirectoryResourceTool } from "../services/mcp/skillDirectoryResource.js";
import { pMap } from "../../vendor/p-map/index.js";
import { SIDE_QUESTION_MAX_AGENTS } from "../components/PromptInput/AgentsPill.js";

//@ chunk-tyg7f3ek.js:50315-50620 placement = calculateMessagesToKeepIndex (0.415)
/**
 * headless 会话：返回一个惰性函数，算出停放（被打断）轮次已收进的发送消息 uuid 集合。旧版名 calculateMessagesToKeepIndex 为错配，属于 cli/print 的轮次停放逻辑。
 */
function getParkedTurnSendUuids(e, uuid, r) {
  let s = [];
  try {
    s = rowsSinceTurnStart(e, uuid);
  } catch (error) {
    logError(error);
  }
  return () => {
    try {
      let h = s[0];
      if (h === undefined || (r === undefined ? !isCompactBoundaryMessage(h) : h.uuid !== r))
        return new Set();
      let idx = s.slice(0, -1).findLastIndex((R) => isSyntheticApiErrorMessage(R) || isInterruptMarkerRow(R));
      let msgTokens = heldUuidsIfEnabled(s.slice(idx + 1));
      return new Set(
        [...heldUuidsIfEnabled(s)].filter((R) => msgTokens.has(R) || isQueuedPromptAnswered(s, R)),
      );
    } catch (error) {
      logError(error);
      return new Set();
    }
  };
}
//@ chunk-tyg7f3ek.js:127589-127752 fingerprint = getStructuredIO (0.513)
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
//@ chunk-tyg7f3ek.js:375915-378573 fingerprint = handleOrphanedPermissionResponse (0.458)
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
  startedBy,
  interruptedTurnEcho,
  ccrTurnId,
  dropContext,
  enqueueContext,
  denyIsRefusal = isPermissionCardHoldEnabled(),
}) {
  let nt = (ie, toolUseID) => {
    logForDiagnosticsNoPII("warn", "cli_orphan_answer_dropped", () => ({
      ...dropContext?.(toolUseID),
      reason: ie,
      ...flagKey("reason", ie),
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
    if (!toolUseID) return nt("no_tool_use_id");
    logForDebugging(
      `handleOrphanedPermissionResponse: received orphaned control_response for toolUseID=${toolUseID} request_id=${message.response.request_id}`,
    );
    if (handledToolUseIds.has(toolUseID)) {
      logForDebugging(
        `handleOrphanedPermissionResponse: skipping duplicate orphaned permission for toolUseID=${toolUseID} (already handled)`,
      );
      return nt("already_handled", toolUseID);
    }
    let assistantMessage = await findUnresolved(toolUseID);
    if (!assistantMessage) {
      logForDebugging(
        `handleOrphanedPermissionResponse: dropping orphaned control_response for toolUseID=${toolUseID} \u2014 no unresolved tool_use found`,
        {
          level: "warn",
        },
      );
      return nt("not_unresolved", toolUseID);
    }
    if (handledToolUseIds.has(toolUseID)) {
      logForDebugging(
        `handleOrphanedPermissionResponse: dropping orphaned permission for toolUseID=${toolUseID} \u2014 handled while its transcript read was in flight`,
      );
      return nt("handled_during_read", toolUseID);
    }
    let Me = Array.isArray(assistantMessage.message.content)
      ? assistantMessage.message.content.find((Mn) => Mn.type === "tool_use" && Mn.id === toolUseID)
      : undefined;
    if (Me?.type === "tool_use") {
      let response = message.response.response;
      if (permissionResult.behavior === "deny" && denyIsRefusal) {
        if (isDifferentString(response?.toolName, Me.name) || isDifferentString(response?.tool_name, Me.name))
          permissionResult = unmatchedAnswerDenial(toolUseID);
      } else if (isValidBridgeToolName(response?.toolName, Me.name, message.response.request_id))
        return nt("name_mismatch", toolUseID);
    }
    handledToolUseIds.add(toolUseID);
    logForDebugging(
      `handleOrphanedPermissionResponse: enqueuing orphaned permission for toolUseID=${toolUseID} messageID=${assistantMessage.message.id}`,
    );
    let Ee = initFirst?.(assistantMessage, toolUseID) === true;
    let He = resumesInterruptedTurn?.() === true;
    let Xe = note?.(toolUseID);
    let We = siblings?.();
    let St = messageRows?.();
    let wt = startedBy?.markOf(toolUseID);
    let Lt = notSent?.();
    let pn = ccrTurnId?.();
    let remoteFlagOverrideState = getRemoteFlagOverrideState(TENGU_WILD_BEACON);
    messageQueue.enqueue({
      mode: "orphaned-permission",
      agentId: mainAgentId(),
      value: [],
      keepsDisallowedTools: true,
      ...(wt !== undefined && {
        startedBy: wt,
      }),
      ...(remoteFlagOverrideState === "on" && {
        skipSubmissionHooks: true,
      }),
      ...interruptedTurnEcho,
      orphanedPermission: {
        permissionResult,
        assistantMessage,
        ...(pn !== undefined && {
          ccrTurnId: pn,
        }),
        ...(denyIsRefusal && {
          denyIsRefusal: true,
        }),
        ...(Ee && {
          initFirst: true,
        }),
        ...(He && {
          resumesInterruptedTurn: true,
        }),
        ...(cardInput !== undefined && {
          cardInput,
        }),
        ...(We !== undefined &&
          We.length > 0 && {
            siblings: We,
          }),
        ...(St !== undefined &&
          St.length > 0 && {
            messageRows: St,
          }),
        ...(Lt !== undefined &&
          Lt.length > 0 && {
            notSent: Lt,
          }),
        ...(Xe !== undefined && {
          note: Xe,
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
  return nt(message.response.subtype === "success" ? "no_tool_use_id" : "not_success");
}
//@ chunk-tyg7f3ek.js:626933-627002 sole-consumer
function isInformationalSystemMessage(e) {
  return e.type === "system" && e.subtype === "informational";
}
//@ chunk-tyg7f3ek.js:627002-627067 sole-consumer
function isApiRetrySystemMessage(e) {
  return e.type === "system" && e.subtype === "api_retry";
}
//@ chunk-tyg7f3ek.js:627067-628650 sole-consumer
/**
 * 是否可作为 result 前最后一条输出消息（排除 control_*、部分 system 子类型、流事件等）。
 */
function isLastMessageCandidate(e) {
  return (
    e.type !== "control_response" &&
    e.type !== "control_request" &&
    e.type !== "control_cancel_request" &&
    !(
      e.type === "system" &&
      (e.subtype === "session_state_changed" ||
        e.subtype === "permission_denied" ||
        e.subtype === "task_notification" ||
        e.subtype === "task_started" ||
        e.subtype === "task_updated" ||
        e.subtype === "task_progress" ||
        e.subtype === "background_tasks_changed" ||
        e.subtype === "feedback_draft_queued" ||
        e.subtype === "control_request_progress" ||
        e.subtype === "notification" ||
        e.subtype === "post_turn_summary" ||
        e.subtype === "task_summary" ||
        e.subtype === "session_metadata" ||
        e.subtype === "hook_started" ||
        e.subtype === "hook_progress" ||
        e.subtype === "hook_response" ||
        e.subtype === "commands_changed" ||
        e.subtype === "elicitation_complete" ||
        e.subtype === "files_persisted" ||
        e.subtype === "mirror_error" ||
        e.subtype === "code_change_published" ||
        e.subtype === "tool_host_result" ||
        e.subtype === "peer_message_hold" ||
        e.subtype === "ui_invalidate" ||
        e.subtype === "ui_log" ||
        e.subtype === "ui_toast" ||
        e.subtype === "ui_status" ||
        e.subtype === "ui_panes" ||
        e.subtype === "ui_placed" ||
        e.subtype === "ui_scroll" ||
        e.subtype === "ui_focus" ||
        e.subtype === "permission_check_status" ||
        e.subtype === "vcs_state_changed" ||
        e.subtype === "dev_intent" ||
        e.subtype === "session_title_changed" ||
        e.subtype === "turn_preempted" ||
        e.subtype === "per_turn_effort_changed" ||
        e.subtype === "instruction_size_warning" ||
        e.subtype === "file_attachments_missing")
    ) &&
    e.type !== "stream_event" &&
    e.type !== "keep_alive" &&
    e.type !== "prompt_suggestion" &&
    e.type !== "conversation_reset" &&
    e.type !== "transcript_mirror" &&
    e.type !== "command_lifecycle" &&
    e.type !== "active_goal" &&
    e.type !== "autocompact_state"
  );
}
//@ chunk-tyg7f3ek.js:628650-628732 sole-consumer
/**
 * 把启动阶段缓存的 SDK 事件转发到输出流，并订阅后续事件。
 */
function registerStartupSdkEventForwarder(headlessIO) {
  let n = () => {
    for (let r of drainTaskNotifications()) headlessIO.write(r).catch(() => {});
  };
  setTaskNotificationListener(n);
  n();
}
//@ chunk-tyg7f3ek.js:628732-652107 callgraph-witnessed = runHeadless (0.247)
/**
 * runHeadless（-p 模式主函数）：建立输入输出（StructuredIO 或 RemoteIO）、沙箱初始化、加载初始消息（--continue/--resume）、驱动 runHeadlessStreaming，最后按 --output-format 输出：text 打印最终结果，json 输出 result 对象（--verbose 输出全部消息数组），stream-json 逐行已输出。退出码：结果 is_error 为 1。
 */
async function runHeadless(e, prompt, r, s, h, y, tools, R, w, options) {
  let startTime = performance.now();
  setBackgroundBashWorkProbe(sendSessionActivitySignal_2);
  setBackgroundBashStopProbe(sendSessionActivitySignal);
  surfaceManagedSettingsErrorsHeadless();
  reportSettingsValidationErrors(options.outputFormat);
  if (isSkillsSyncActive(e)) startSkillSyncAndResync(e, options.storageV5, options.credentials);
  if (isPluginsSyncActive(e)) startFirstPluginsSync(e, options.credentials);
  function q(source) {
    call({
      session: e,
      source,
      getAppState: r,
      setAppState: s,
      storageV5: options.storageV5,
    });
  }
  let advisorModel = r().advisorModel;
  if (advisorModel) {
    setFlagSettingsInline({
      ...(getFlagSettingsInline() ?? {}),
      advisorModel,
    });
    settingsChangeDetector.notifyChange("flagSettings");
  }
  settingsChangeDetector.subscribe(q);
  subscribeOrgFastModeChange(r, s, options.storageV5);
  whenPolicyNotified(() => q("policySettings"));
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
  initializeGrowthBook().catch((prev) => logError(toError(prev)));
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
  if (options.rewindFiles && prompt) {
    process.stderr.write(`Error: --rewind-files is a standalone operation and cannot be used with a prompt
`);
    gracefulShutdownSync(1);
    return;
  }
  let Z = typeof prompt !== "string";
  setHasStreamingInput(Z);
  markPrintPollEventWiring({
    hasStreamingInput: Z,
    sdkUrl: options.sdkUrl,
    permissionMode: r().toolPermissionContext.mode,
  });
  setSingleShotPrintSession(
    deriveSingleShotPrintSession({
      hasStreamingInput: Z,
      sdkUrl: options.sdkUrl,
    }),
  );
  let now = Date.now();
  let Ae;
  let Ue = Boolean(options.sdkUrl) && process.env.CLAUDE_CODE_ENVIRONMENT_KIND !== "bridge";
  function ce(lt, In) {
    if (!Ue) return;
    Ae = lt;
    process.stderr
      .write(`SDKStartup: phase=${lt} t=${Math.round((Date.now() - now) / 100) / 10}s${In ? ` ${In}` : ""}
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
  ce("connecting_transport");
  let headlessIO = createHeadlessIO(prompt, options, turnHandoff, carriedWrites, stageCallbacks);
  let resultStamper = createResultStamper(takeUsageSinceLastResult);
  headlessIO.resultDelivery = resultStamper;
  setOwnBridgePeerResolver(ownBridgePeerAddress);
  if (options.sdkUrl || options.outputFormat === "stream-json") {
    transportStateByHost.of(e).setActive(headlessIO);
    trackUsageSinceLastResult();
  } else transportStateByHost.of(e).markLocalTransport();
  transportStateByHost.of(e).markHeadlessStart({
    sdkUrl: options.sdkUrl,
    readsProcessStdin: isStreamJsonStdin(prompt),
  });
  let Ee =
    Boolean(options.sdkUrl) &&
    Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID) &&
    env.CLAUDE_CODE_ENVIRONMENT_KIND === undefined &&
    !env.CLAUDE_CODE_DISABLE_WORKING_SYNC;
  if (Ee)
    import("./chunk-2s3tfbmy.js")
      .then((lt) => lt.startSyncedFileSyncer(lt.SYNCED_FILE_ROOT))
      .catch(() => logForDiagnosticsNoPII("warn", "working_sync_import_failed", {}));
  if (options.sdkUrl && env.CLAUDE_CODE_REMOTE_SESSION_ID && isRemoteManagedEnvironment()) {
    let lt = {
      sessionId: env.CLAUDE_CODE_REMOTE_SESSION_ID,
      sdkUrl: options.sdkUrl,
    };
    import("./chunk-ar4s2yky.js")
      .then((In) => In.startHostedWorkerVitalsEmitter(lt))
      .catch(() => logForDiagnosticsNoPII("warn", "vitals_emitter_import_failed", {}));
  }
  let He = gitCredentialEngineAdmission({
    entrypoint: env.CLAUDE_CODE_ENTRYPOINT,
    gitSwitch: false,
  });
  let cwd = getCwd();
  let St =
    (Boolean(options.sdkUrl) && He.start ? workingSyncAdmission(He.engines.git, cwd) : "not_admitted") ===
    "admitted";
  let wt = Ee || St;
  let Lt = null;
  let pn =
    wt && He.start
      ? import("./chunk-240k3fwa.js")
          .then((lt) => lt.startWorkerDirSync(cwd))
          .catch(() => {
            logForDiagnosticsNoPII("warn", "file_store_worker_import_failed", {});
            return null;
          })
      : undefined;
  let _n = decideWorkerDirSync({
    admittedAs: Ee ? "managed" : St ? "runner_child" : null,
    dirSyncStarts: pn !== undefined,
    hermetic: isHermeticRemoteSession(),
    spawnEnv: getPreSettingsEnvSnapshot,
    accountHome: safeHomedir,
    currentConfigHome: configDirForSync,
  });
  if (Ee && !_n.start && _n.reason !== "file_store_worker_off")
    logForDiagnosticsNoPII("info", "home_seed_worker_disabled", {
      reason: _n.reason,
    });
  let Mn = _n.start
    ? startCloudHomeSeedParticipant({
        record: stageCallbacks,
        configHome: _n.configHome,
        foreignFiles: _n.foreignFiles,
        takes: _n.takes,
        session: e,
        repoRoot: cwd,
        storageV5: options.storageV5,
        workerDirSync: pn,
      })
    : undefined;
  let turnGateParticipants = createTurnGateParticipants();
  if (isFirstPartyRemoteSession(env.CLAUDE_CODE_REMOTE_SESSION_ID, env.CLAUDE_CODE_ENVIRONMENT_KIND))
    turnGateParticipants.register(createUserDataRootsTurnGate());
  let turnEndUploadListener = undefined;
  if (pn !== undefined)
    import("./chunk-0zdmp65d.js")
      .then((lt) => lt.registerWorkerDirSyncForMidTurn(pn))
      .catch(() => {
        logForDiagnosticsNoPII("warn", "device_forward_clearance_import_failed", {});
      });
  if (Mn !== undefined) turnGateParticipants.register(homeSeedHoldParticipant(Mn));
  let ze = sessionAuthAdmission({
    sdkUrl: Boolean(options.sdkUrl),
    remoteSessionId: env.CLAUDE_CODE_REMOTE_SESSION_ID,
    environmentKind: env.CLAUDE_CODE_ENVIRONMENT_KIND,
    entrypoint: env.CLAUDE_CODE_ENTRYPOINT,
    disabled: env.CLAUDE_CODE_DISABLE_PLUGIN_FORWARDING,
    hermetic: isHermeticRemoteSession(),
  });
  if (!ze.admitted && ze.reason === "disabled")
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
    entrypoint: env.CLAUDE_CODE_ENTRYPOINT,
    channelOff: isSessionChannelDisabled(),
    hermetic: isHermeticRemoteSession(),
  });
  if (sdkHostOffersOAuthRefresh()) {
    setSdkOAuthTokenRefreshCallback(() => headlessIO.requestOAuthTokenRefresh());
    if (isLauncherStartedProcess())
      setLauncherHostLoginReplacementJudge((lt) => verifyLauncherHostLogin(options.credentials, lt));
  }
  if (env.CLAUDE_CODE_SDK_HAS_HOST_AUTH_REFRESH && isHostEntrypoint()) {
    let lt = parseNumberWithSeparators(process.env.CLAUDE_CODE_HOST_AUTH_REFRESH_TIMEOUT_MS) || undefined;
    setHostAuthTokenRefreshCallback(() => headlessIO.requestHostAuthTokenRefresh(lt));
  }
  if (options.outputFormat === "stream-json") installStdoutGuard(e.host);
  let $n = {
    current: [],
  };
  let ut = {
    current: tools,
  };
  let permissionPromptToolName = effectivePermissionPromptTool({
    permissionPromptTool: options.permissionPromptToolName,
    sdkUrl: options.sdkUrl,
  });
  let nn = isNoPromptHost(options.permissionPrompts);
  if (nn) {
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
        let lt = isTransportBacked(e)
          ? SANDBOX_UNAVAILABLE_MESSAGE
          : `${SANDBOX_UNAVAILABLE_MESSAGE}: ${sandboxUnavailableReason}`;
        if (isTransportBacked(e))
          logForDebugging(`sandbox unavailable detail: ${sandboxUnavailableReason}`, {
            level: "error",
          });
        publishFailedSummary(headlessIO.sessionState, lt);
        await headlessIO.write(
          buildStartupFailureResult({
            sessionId: getSessionId(),
            message: `${lt}. Set sandbox.failIfUnavailable=false to allow unsandboxed execution.`,
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
  let En = () =>
    createInboxPermissionChecker(
      nn
        ? createSandboxNetworkAsker(headlessIO)
        : headlessIO.createSandboxAskCallback(
            applyPermissionAnswerChanges,
            (updater) =>
              s((prev) => ({
                ...prev,
                toolPermissionContext: updater(prev.toolPermissionContext),
              })),
            options.storageV5,
            options.credentials,
          ),
      () => r().toolPermissionContext,
      () => $n.current,
      () => ut.current,
      options.storageV5,
      options.credentials,
    );
  if (!sandboxUnavailableReason && SandboxManager.isSandboxingEnabled()) {
    profileCheckpoint("before_sandbox_init");
    let startTime = performance.now();
    try {
      await SandboxManager.initialize(En());
    } catch (err) {
      process.stderr.write(`
\u274C Sandbox Error: ${errorMessage(err)}
`);
      gracefulShutdownSync(1, "other");
      return;
    }
    recordPhase("sandbox_init_ms", performance.now() - startTime, startTime);
    profileCheckpoint("after_sandbox_init");
    for (let In of SandboxManager.getProfileReadSecurityWarnings())
      process.stderr.write(`
\u26A0 ${In}
`);
  }
  createDependencyWatcher(
    [
      {
        subscribe: h,
      },
    ],
    () => [SandboxManager.isSandboxingEnabled()],
    (event) => {
      if (!event) return;
      SandboxManager.initialize(En()).catch((error) => {
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
  let Mr = options.outputFormat === "stream-json" && Boolean(options.verbose);
  if (Mr) registerStartupSdkEventForwarder(headlessIO);
  if (options.setupTrigger)
    await runStartupHooks(e, {
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
  let Pn = r();
  let appState = createSessionHooksRegistry();
  sessionHooksRegistrySlot.of(e).registry = appState;
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
  let Fr = [];
  let Xo;
  let fi;
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
  } = await loadInitialMessages(e, s, appState, {
    onFreshSessionStartRows: (lt) => {
      Fr.push(...lt);
    },
    onOverdueSessionStartHooks: (lt) => {
      Xo = lt;
    },
    onDiskBehind: (lt) => {
      fi = lt;
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
    tools,
  });
  let startTime_4 = performance.now();
  recordPhase("initial_messages_load_ms", startTime_4 - startTime_3, startTime_3);
  if (aborted) return;
  if (options.joinAlwaysLoadMcp !== undefined) {
    await options.joinAlwaysLoadMcp();
    recordPhase("mcp_always_load_join_ms", performance.now() - startTime_4, startTime_4);
  }
  let ou = new CloudPluginSwitches(headlessIO);
  await ou.restore(
    {
      engineState: r,
      setEngineState: s,
    },
    options.storageV5,
  );
  let mcp = options.joinAlwaysLoadMcp !== undefined ? r().mcp : Pn.mcp;
  let startTime_5 = performance.now();
  let followUpsAtStartUp = headlessIO.isRemoteTransport()
    ? classifyFoldedFollowUps(
        messages,
        new Set(Fr),
        supersededToolUseIds !== undefined && supersededToolUseIds.size > 0,
      )
    : undefined;
  if (options.sdkUrl && options.resume && !resumedAsFork && !isShuttingDown()) {
    await restoreTaskListAtBoot(e, messages, headlessIO.restoredWorkerState, options.storageV5);
    await headlessIO.sendOwedClientRowsAgain(createIngressReadiness(e, appState, messages));
  }
  let Ro = (lt) => {
    messages.push(lt);
    Fr.push(lt);
  };
  ownCostLedger();
  let dc;
  $n.current = messages;
  prefetchUserContext(e, Boolean(options.continue || options.resume), options.storageV5, options.credentials);
  if (Mr) setTaskNotificationListener(null);
  let hookInitialUserMessage = takePendingInitialUserMessage();
  if (hookInitialUserMessage) headlessIO.prependUserMessage(hookInitialUserMessage);
  let ha = shouldAttemptAgentRestoreInPrint({
    hasStreamingInput: Z,
    explicitAgentFlag: options.agent,
    mainThreadAgentType: getMainThreadAgentType(),
    resumedAgentSetting: agentSetting,
  });
  if (ha.attempt && agentSetting) {
    let sessionAgentDefinitions = await loadAgentDefinitionsForSessionCwd(
      sessionProjectPath,
      options.storageV5,
    );
    let { agentDefinition } = restoreAgentFromSession(
      agentSetting,
      undefined,
      {
        activeAgents: w,
        allAgents: w,
      },
      {
        sessionAgentDefinitions,
        sessionCwd: sessionProjectPath,
        onResolveMiss: ha.loud
          ? (ar) => {
              Ro(createSystemMessage(ar, "warning"));
              process.stderr.write(
                ar +
                  `
`,
              );
            }
          : undefined,
      },
    );
    if (agentDefinition) {
      s((prev) => ({
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
  let Wi = await restoreModelFromSession(
    messages,
    Pn.mainLoopModel,
    (lt) => Ro(createSystemMessage(lt, "warning")),
    {
      storageV5: options.storageV5,
      credentials: options.credentials,
    },
  );
  let Rn = Wi
    ? installRestoredModel(messages, Wi, resumedAsFork, options.storageV5, options.credentials)
    : undefined;
  if (Rn)
    s((lt) => {
      if (lt.mainLoopModel === Rn) return lt;
      recordSwitchIfChanged(e, lt, Rn, "resume");
      return {
        ...lt,
        mainLoopModel: Rn,
      };
    });
  if (messages.length === 0 && process.exitCode !== undefined) return;
  let yi;
  if (
    options.restrictedStartupModel &&
    isModelDifferentFromRestricted(options.userSpecifiedModel, options.restrictedStartupModel)
  ) {
    let lt = formatModelRestrictedNotice(options.restrictedStartupModel, getMainLoopModel());
    if (
      !messages.some(
        (message) =>
          message.type === "system" && message.subtype === "informational" && message.content.includes(lt),
      )
    )
      Ro(createSystemMessage(lt, "warning"));
    yi = createSystemMessage(lt, "warning");
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
    let currentAppState = r();
    let ar = await handleRewindFiles(options.rewindFiles, currentAppState, false);
    if (!ar.canRewind) {
      process.stderr.write(`Error: ${ar.error || "Unexpected error"}
`);
      gracefulShutdownSync(1);
      return;
    }
    if (ar.skippedLinks)
      process.stderr
        .write(`Warning: ${ar.skippedLinks} tracked ${ar.skippedLinks === 1 ? "path was" : "paths were"} skipped: ${REWIND_UNSAFE_PATH_REASON}. Run with --debug for the paths.
`);
    writeToStdout(`Files rewound to state at message ${options.rewindFiles}
`);
    gracefulShutdownSync(0);
    return;
  }
  let _a = typeof options.resume === "string" && options.resume.trim().length > 0;
  let isUsingSdkUrl = Boolean(options.sdkUrl);
  if (
    typeof prompt === "string" &&
    prompt.trim() === "" &&
    !isUsingSdkUrl &&
    !deferredToolUse &&
    !hookInitialUserMessage
  ) {
    process.stderr.write(
      prompt !== ""
        ? `Error: Input contained only whitespace. Provide a prompt with text through stdin or as a prompt argument when using --print
`
        : _a || options.continue
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
  let allowedMcpTools = filterToolsByDenyRules(mcp.tools, Pn.toolPermissionContext);
  let Ks = withLateEnabledToolsIfAdvertised([...tools, ...allowedMcpTools], Pn.toolPermissionContext);
  ut.current = Ks;
  let permissionPromptToolServerName = permissionPromptToolName
    ? mcpInfoFromString(permissionPromptToolName)?.serverName
    : undefined;
  let onPermissionPrompt = (details) => {
    notifyRequiresAction(
      {
        io: headlessIO,
        setAppState: s,
      },
      details,
    );
    lazyPostTurnSummary?.runClassifierSummaryForBlocked(details, headlessIO.sessionState);
  };
  headlessIO.onUserDialogParked = (prev) => {
    lazyPostTurnSummary?.runClassifierSummaryForBlocked(prev, headlessIO.sessionState);
  };
  let vn = {
    swept: false,
  };
  let canUseTool = getCanUseToolFn(
    permissionPromptToolName,
    headlessIO,
    () => r().mcp.tools,
    onPermissionPrompt,
    {
      isPromptToolServerSwept: () => vn.swept,
    },
    options.permissionPrompts,
  );
  if (options.permissionPromptToolName)
    Ks = Ks.filter((lt) => !toolMatchesName(lt, options.permissionPromptToolName));
  let sendPins = collectSendPins(messages);
  if (Object.keys(sendPins).length > 0)
    s((lt) => ({
      ...lt,
      sendMessagePins: sendPins,
    }));
  if (!resumedAsFork)
    s((lt) => {
      let namedAgentIds = collectNamedAgentIds(messages, lt.agentNameRegistry);
      return namedAgentIds === null
        ? lt
        : {
            ...lt,
            agentNameRegistry: namedAgentIds,
          };
    });
  mcpTaskEndingsSlots.of(e).savesWith(
    createTranscriptSaver({
      io: headlessIO,
      isShuttingDown,
    }),
  );
  let zr = (taskRegistry) => {
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
          taskRegistry,
          getMcpClients: () => [...(getMcpClientsFromAccessor() ?? [])],
          requestDialog: undefined,
          storageV5: options.storageV5,
          credentials: options.credentials,
        });
      })
      .catch(logError);
  };
  let _s = [];
  let Xs;
  let is = [];
  let as = [];
  let So = [];
  let diskBehindReminder;
  let resumableAgentIds = collectResumableAgentIds(supersededToolNames);
  if (env.CLAUDE_CODE_RESUME_INTERRUPTED_TURN && headlessIO.isRemoteTransport()) {
    if (fi !== undefined && !resumedAsFork) {
      await withDeadline(
        initializeGrowthBook().catch(() => null),
        PRINT_TURN_FLUSH_DELAY_MS,
      );
      if (getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WITTY_KAY, false))
        diskBehindReminder = createAttachmentMessage({
          type: "critical_system_reminder",
          content: describeDiskTranscriptLag(fi, Date.now()),
        });
    }
    let restoredWorkerState = await headlessIO.restoredWorkerState;
    let runningBackgroundTasks = restoredWorkerState?.internal?.running_background_tasks;
    let ar = restoredWorkerState?.internal?.orphaned_background_tasks_pending_notification;
    let pr = restoredWorkerState?.internal?.finished_background_tasks_pending_notification;
    let qo = Array.isArray(runningBackgroundTasks) ? runningBackgroundTasks : [];
    let oi = Array.isArray(ar) ? ar : [];
    let ds = dedupeTasksById([...oi, ...qo]);
    let orphanTasks = collectOrphanTasks(Array.isArray(pr) ? pr : [], ds);
    let runningForegroundAgents = restoredWorkerState?.internal?.running_foreground_agents;
    let pendingAction = restoredWorkerState?.external?.pending_action;
    let rs = Array.isArray(runningForegroundAgents) && runningForegroundAgents.length > 0;
    let Zi =
      rs &&
      turnInterruptionState?.kind === "interrupted_prompt" &&
      !resumedAsFork &&
      !pendingActionsAmbiguous(restoredWorkerState);
    if (Zi && pendingAction != null)
      await withDeadline(
        initializeGrowthBook().catch(() => null),
        PRINT_TURN_FLUSH_DELAY_MS,
      );
    if (Zi && (pendingAction == null || isTurnHandoffResumeEnabled()))
      try {
        as = await planRecordedAgentResumes({
          recorded: runningForegroundAgents,
          agentCallIds: resumableAgentIds,
          known: new Set([...ds, ...orphanTasks].map((Fo) => Fo.task_id)),
          hasTool: (Fo) => findToolByName(tools, Fo) !== undefined,
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
    _s = dedupeTasksById(qo);
    let fs = [];
    let si;
    let resumableOrphanedAgents = restoredWorkerState?.internal?.resumable_orphaned_agents;
    if (
      _s.length > 0 ||
      as.length > 0 ||
      (Array.isArray(resumableOrphanedAgents) && resumableOrphanedAgents.length > 0)
    ) {
      await withDeadline(
        initializeGrowthBook().catch(() => null),
        PRINT_TURN_FLUSH_DELAY_MS,
      );
      let hr = await restoreOrphanAgents({
        recorded: resumableOrphanedAgents,
        stopped: [..._s, ...as],
        toldOfAnyway: [..._s, ...orphanTasks, ...as],
        readAgentMetadataEvents: (Fo) => headlessIO.readAgentMetadataEvents(Fo),
        storageV5: options.storageV5,
      });
      Xs = hr.alsoResumable;
      fs = hr.stillOffered;
      si = hr.toKeep;
      headlessIO.sessionState.resumableOrphanedAgents = si ?? [];
    }
    So = await resumeCutOffAgents({
      cutOff: as,
      unresolvedCallIds: supersededToolUseIds ?? new Set(),
      findCalls: (hr) => findUnresolvedToolUses(hr, options.storageV5),
      stopped: _s,
      alsoResumable: Xs,
      cardWaits: pendingActionsAmbiguous(restoredWorkerState),
      owesATurn: () =>
        !rescueSuppressed &&
        !resumedAsFork &&
        (turnInterruptionState?.kind === "interrupted_prompt" ||
          getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_orphan_restore_wake", true)),
      startsSpent: () => hasHitUnattendedRestartLimit(restoredWorkerState),
      tools: Ks,
      toolPermissionContext: r().toolPermissionContext,
      storageV5: options.storageV5,
    });
    let Po = new Set(So.map((hr) => hr.agentId));
    let ps = new Set(So.flatMap((hr) => (hr.call ? hr.agentId : [])));
    let filtered = as.filter((hr) => !ps.has(hr.task_id));
    if (rs)
      headlessIO.sessionState.notifyInternalMetadataChanged({
        running_foreground_agents: as.filter((hr) => ps.has(hr.task_id)),
      });
    try {
      for (let hr of [true, false]) {
        let filtered_2 = filtered.filter((va) => Po.has(va.task_id) === hr);
        if (filtered_2.length > 0)
          Ro(
            createUserMessage({
              content: formatRestartedAgentsReminder(filtered_2, hr),
              isMeta: true,
            }),
          );
      }
    } catch (error) {
      logFeatureBad("ccr_cut_off_agents", "threw");
      logError(toError(error));
    }
    let canUseTool = orphanAgentRestoreNotice(
      [...fs, ..._s, ...filtered],
      (tool) => findToolByName(tools, tool) !== undefined,
      Xs,
      Po,
    );
    if (ds.length > 0) {
      logForDebugging(`[print.ts] ${ds.length} orphaned background task(s) after restart`);
      Ro(
        createUserMessage({
          content: describeRunningProcesses(dedupeTasksById([...ds, ...fs]), orphanTasks, canUseTool),
          isMeta: true,
        }),
      );
      for (let jo of ds)
        emitTaskNotification(jo.task_id, "stopped", {
          summary: `Stopped by a worker restart: ${jo.description || jo.task_id}`,
          reason: "worker_restart",
          ambient: jo.ambient,
        });
      let hr = false;
      let timedOut = false;
      let startTime = performance.now();
      let Ld;
      try {
        for (let Gs of drainTaskNotifications()) await headlessIO.write(Gs);
        Ld = performance.now();
        let winner = await Promise.race([
          headlessIO.flushClientEvents(),
          sleep(PRINT_TURN_WAIT_MS, undefined, {
            unref: true,
          }).then(() => "timed_out"),
        ]);
        timedOut = winner === "timed_out";
        hr = winner === true;
      } catch (error) {
        logForDebugging(
          `[print.ts] orphaned-task notification flush failed; keeping orphans pending for re-emit: ${toError(error).message}`,
        );
      }
      if (!hr)
        logForDebugging(
          "[print.ts] orphaned-task notification delivery unconfirmed; keeping orphans pending for re-emit",
        );
      let startTime_2 = performance.now();
      recordPhase("orphaned_task_flush_ms", startTime_2 - startTime, startTime);
      logForDiagnosticsNoPII(hr ? "info" : "warn", "orphaned_task_flush", {
        budget_ms: PRINT_TURN_WAIT_MS,
        write_ms: Math.round((Ld ?? startTime_2) - startTime),
        waited_ms: Ld === undefined ? 0 : Math.round(startTime_2 - Ld),
        timed_out: timedOut,
        delivered: hr,
      });
      headlessIO.sessionState.notifyInternalMetadataChanged({
        running_background_tasks: [],
        orphaned_background_tasks_pending_notification: hr ? null : ds,
        finished_background_tasks_pending_notification: null,
        ...(si && {
          resumable_orphaned_agents: si,
        }),
      });
    } else if (fs.length > 0 || orphanTasks.length > 0) {
      Ro(
        createUserMessage({
          content: describeRunningProcesses(fs, orphanTasks, canUseTool),
          isMeta: true,
        }),
      );
      headlessIO.sessionState.notifyInternalMetadataChanged({
        finished_background_tasks_pending_notification: null,
        ...(si && {
          resumable_orphaned_agents: si,
        }),
      });
    }
    is = await listResumableAgentsStub(
      liveSourceRows === undefined
        ? messages
        : messages.filter((message) => !liveSourceRows.has(message.uuid)),
      {
        settleFlags: () =>
          withDeadline(
            initializeGrowthBook().catch(() => null),
            PRINT_TURN_FLUSH_DELAY_MS,
          ),
        addRow: Ro,
        diskMayChange: Xo !== undefined,
      },
    );
    zr(createTaskFramework(r, s));
  } else if (messages.length > 0) {
    let taskRegistry = createTaskFramework(r, s);
    await formatOrphanSummary(
      messages,
      taskRegistry,
      undefined,
      undefined,
      options.storageV5,
      liveSourceRows,
      () => startupStandInPlan(tools),
    );
    restoreRemoteAgentTasks({
      abortController: new AbortController(),
      taskRegistry,
      storageV5: options.storageV5,
      credentials: options.credentials,
    });
    zr(taskRegistry);
  }
  let restoredWorkerState = await headlessIO.restoredWorkerState;
  restoreDeclaredDialogKinds(restoredWorkerState);
  restoreCostState(restoredWorkerState);
  if (restoredWorkerState !== null) claimCostLedgerForCurrentSession();
  restoreChromeSetupOfferState(restoredWorkerState);
  markHostRendersChromeSetupOffer();
  restoreMemoryToggle(restoredWorkerState);
  restoreToolsKeptByClear(restoredWorkerState);
  adoptInternalWindows(e, restoredWorkerState, headlessIO.sessionState, s);
  lazyPrintModules2.restoreMemoryExtractPlace(e.host, restoredWorkerState?.internal?.memory_extract_place);
  await restoreExcludeDynamicSections(restoredWorkerState, options);
  restoreProactivityOptIn(restoredWorkerState, {
    getAppState: r,
    setAppState: s,
    sessionState: headlessIO.sessionState,
  });
  try {
    restoreDurableWatches(restoredWorkerState, {
      sink: (lt) => headlessIO.sessionState.notifyInternalMetadataChanged(lt),
      storageV5: options.storageV5,
      reread: () => headlessIO.rereadWorkerState(),
    });
  } catch (error) {
    logError(error);
  }
  settleWorkerPermissionModeRecord(headlessIO.sessionState, r().toolPermissionContext.mode, {
    planModeOnResume,
    restored: restoredWorkerState,
    restartedWorker: isWorkerEpochAfterFirst(env.CLAUDE_CODE_WORKER_EPOCH),
  });
  syncUltracodeActive(headlessIO.sessionState, r().ultracode, restoredWorkerState);
  let resumeLaneOptions = getResumeLaneOptions();
  let resumeInterruption = await resolveResumeInterruption({
    restored: restoredWorkerState,
    load: {
      turnInterruptionState,
      supersededToolUseIds,
      rescueSuppressed,
    },
    chain: messages,
    tools: Ks,
    forwarding: isRemoteToolForwardingSwitchOn(),
    findUnresolved: (lt) => findUnresolvedToolUses(lt, options.storageV5),
    findOnPrunedBranch: (toolUseId) => findUnresolvedToolUseOnAPrunedBranch(toolUseId, options.storageV5),
    lane: resumeLaneOptions,
  });
  let { turnInterruptionState: turnInterruptionState_2, journaledToolUses } = resumeInterruption;
  let ka = await restoreParkedPrompt({
    restored: restoredWorkerState,
    turnInterruptionState,
    chain: messages,
    supersededToolUseIds,
    supersededToolNames,
    journaled: resumeInterruption,
    tools,
    findUnresolved: (lt) => findUnresolvedToolUseAnywhere(lt, options.storageV5),
    lane: resumeLaneOptions,
  });
  let {
    parkedPermission,
    supersededToolUseIds: supersededToolUseIds_2,
    supersededToolNames: supersededToolNames_2,
    pendingActionClass,
  } = ka;
  let zi = holdParkedAgentAsk({
    restored: restoredWorkerState,
    bootPark: ka,
    cutOffCallIds: resumableAgentIds,
    planned: So,
    answerKind: applyPermissionAnswerChanges.kind,
    io: headlessIO,
    answerOff: resumeLaneOptions.inheritedAnswerOff,
  });
  let { servedCallsToAdopt, servedCallsNeverSent, journaledServedCalls } = await planServedCallAdoption({
    restored: restoredWorkerState,
    supersededToolUseIds: supersededToolUseIds_2 ?? new Set(),
    parkedToolUseId: parkedPermission?.tool_use_id,
    journaledToolUses,
    adoptionTools: Ks,
    findUnresolved: (lt) => findUnresolvedToolUses(lt, options.storageV5),
    forwarding: isRemoteToolForwardingSwitchOn(),
    hasRemoteToolCalls: isRemoteToolForwardingEnabled,
    flagWaitMs: PRINT_TURN_FLUSH_DELAY_MS,
  });
  if (
    (parkedPermission !== undefined || servedCallsToAdopt.length > 0) &&
    _s.length === 0 &&
    is.length === 0 &&
    as.length === 0 &&
    turnInterruptionState_2?.kind === "interrupted_prompt" &&
    isPlainInterruptMarker(turnInterruptionState_2.message)
  )
    await withDeadline(
      initializeGrowthBook().catch(() => null),
      PRINT_TURN_FLUSH_DELAY_MS,
    );
  let bootRetiredToolUseIds = cancelStaleParkedPrompt(headlessIO, restoredWorkerState, {
    ...ka,
    keepRequestIds:
      zi === undefined ? ka.keepRequestIds : new Set([...ka.keepRequestIds, zi.card.request_id]),
    reportKept: headlessIO.isRemoteTransport() && resumeLaneOptions.holdsInputBehindPrompt?.() === true,
  });
  headlessProfilerCheckpoint("after_loadInitialMessages");
  profileCheckpoint("after_loadInitialMessages", {
    once: true,
  });
  ce("transcript_hydrated", `messages=${messages.length}`);
  let userSpecifiedModelSetting = getUserSpecifiedModelSetting();
  await ensureModelStringsInitialized({
    sessionModelIsProviderId:
      userSpecifiedModelSetting != null &&
      !modelSettingResolvesThroughModelStrings(userSpecifiedModelSetting),
  });
  headlessProfilerCheckpoint("after_modelStrings");
  let verbose = options.outputFormat === "json" && options.verbose;
  let ws = [];
  let ns;
  let weakSet = new WeakSet();
  let weakSet_2 = new WeakSet();
  let weakMap = new WeakMap();
  let Vs;
  let assistantTextTracker = createAssistantTextTracker();
  let iu = options.outputFormat !== "json" && options.outputFormat !== "stream-json";
  let Al = new TurnEndPrinter({
    maxTurns: options.maxTurns,
    maxBudgetUsd: options.maxBudgetUsd,
  });
  let drainedMessageCount = 0;
  let Ts = false;
  let Nr;
  let Do;
  let Ya = [];
  recordPhase("headless_post_load_ms", performance.now() - startTime_5, startTime_5);
  headlessProfilerCheckpoint("before_runHeadlessStreaming");
  ce("starting_query_loop");
  for await (let lt of _runHeadlessStreamingForTesting(
    e,
    headlessIO,
    mcp.clients,
    y,
    Ks,
    messages,
    canUseTool,
    R,
    r,
    s,
    h,
    w,
    {
      ...options,
      permissionPromptToolServerName,
      permissionPromptToolBinding: vn,
      handbackPointerResults: weakSet,
      lateReleasedResults: weakSet_2,
      autoModeStopNotices: weakMap,
      markStartupPhase: ce,
      workerDirSync: pn,
      turnGate: turnGateParticipants,
      homeSeed: Mn,
      turnEndUploadListener,
      planModeOnResume,
      restoredOrphans: _s,
      alsoResumable: Xs,
      agentResumes: So,
      keptSubagentAsk: zi,
      lostSessionTimers: is,
      rescueSuppressed,
      restoredWorkerMetadata: restoredWorkerState,
      answeredToolUseIds,
      transcriptAnchor,
      initialMessagesOrigin: messagesOrigin,
      openingRowsMade: Fr,
      overdueSessionStartHooks: Xo,
      diskBehindReminder,
      followUpsAtStartUp,
      remoteControlForkChild,
      pluginForwardingAdmission: ze,
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
      switchedOffMcpServers: ou,
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
    let In = lt.type === "result" ? resultStamper.stamp(lt) : lt;
    let ar = weakSet.has(lt);
    let pr = weakSet_2.has(lt);
    let qo = weakMap.get(lt);
    if (!Ts && isInformationalSystemMessage(In)) {
      Ya.push(In);
      continue;
    }
    drainedMessageCount++;
    if (drainedMessageCount === 1) ce("first_message_drained", `type=${In.type}`);
    let oi =
      takeNoServerCheckNotice(false) ??
      (sdkSupportsFallbackDialog()
        ? undefined
        : takeServerFallbackAnnouncement(() => isServerClassifierOff(r().toolPermissionContext.mode)));
    if (oi !== undefined)
      if (options.outputFormat === "stream-json" && options.verbose) Do = createSystemMessage(oi, "warning");
      else
        process.stderr.write(`${oi}
`);
    if (!Ts && In.type === "system" && In.subtype === "init") {
      Ts = true;
      ce("system_init_emitted");
    }
    let ds = Ts ? Ya.splice(0) : [];
    if (options.outputFormat === "stream-json" && options.verbose)
      try {
        let Ct = In.type === "system" && In.subtype === "init";
        if (Ts && !Ct && Do) {
          let cs = Do;
          Do = undefined;
          await headlessIO.write({
            ...cs,
            session_id: getSessionId(),
          });
        }
        await headlessIO.write(In);
        if (Ts && yi) {
          let cs = yi;
          yi = undefined;
          await headlessIO.write({
            ...cs,
            session_id: getSessionId(),
          });
        }
        if (Ts && Do) {
          let cs = Do;
          Do = undefined;
          await headlessIO.write({
            ...cs,
            session_id: getSessionId(),
          });
        }
        for (let cs of ds) await headlessIO.write(cs);
      } catch (error) {
        Nr = {
          message: In,
          error,
        };
        break;
      }
    for (let Ct of [In, ...ds])
      if (isLastMessageCandidate(Ct)) {
        if (verbose) ws.push(Ct);
        if (ar) ns = Vs ?? Ct;
        else if (!isInformationalSystemMessage(Ct) && !isApiRetrySystemMessage(Ct)) {
          ns = Ct;
          if (Ct.type === "result") Vs = Ct;
        }
        if (iu && !ar) {
          trackAssistantText(assistantTextTracker, Ct);
          if (Ct.type === "result")
            Al.printAtTurnEnd(Ct, pr ? undefined : assistantTextTracker.partialForResult, qo);
        }
      }
  }
  if (Nr) {
    await endHeadlessSessionOnOutputWriteFailure(e, headlessIO, Nr.message, Nr.error, drainedMessageCount);
    return;
  }
  switch (options.outputFormat) {
    case "json":
      if (!ns || ns.type !== "result") {
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
          ndjsonStringifyWithReplacer(ws) +
            `
`,
        );
        break;
      }
      writeToStdout(
        ndjsonStringifyWithReplacer(ns) +
          `
`,
      );
      break;
    case "stream-json":
      break;
    default:
      if (!ns || ns.type !== "result") {
        process.stderr.write(`Error: No messages returned from query
`);
        logForDebugging("runHeadless: no result message returned from query", {
          level: "error",
        });
        gracefulShutdownSync(1);
        return;
      }
      Al.printAtExit(ns, assistantTextTracker.partialForResult);
  }
  logHeadlessProfilerTurn();
  if (isExtractModeActive() || lazyPrintModules2.isLaptopExtractActive(e.host))
    await lazyPrintModules2.drainPendingExtraction(e.host);
  await flushPendingAsyncRewakeHooks();
  await Promise.race([
    Promise.all([
      import("./chunk-2s3tfbmy.js").then((lt) => lt.drainSyncedFiles()).catch(() => {}),
      pn?.then((lt) => lt?.drain()).catch(() => {}),
    ]),
    sleep(5000, undefined, {
      unref: true,
    }),
  ]);
  let ni = headlessIO instanceof RemoteIO && headlessIO.permanentCloseCode !== undefined;
  if (Ue && ns?.type !== "result") {
    let lt;
    if (ni) lt = "transport closed permanently";
    else if (drainedMessageCount === 0)
      lt = "zero messages drained \u2014 input stream ended before any output";
    else if (!Ts) lt = "input stream ended before system/init was emitted";
    else lt = "input stream ended without a result message";
    process.stderr
      .write(`SDKStartup: exiting without result: ${lt} (last_phase=${Ae}, drained=${drainedMessageCount}, exit=${ni ? 1 : 0})
`);
  }
  transportStateByHost.of(e).setActive(undefined);
  gracefulShutdownSync(
    (ns?.type === "result" && ns?.is_error) || ni
      ? 1
      : options.outputFormat === "stream-json"
        ? 0
        : (getLocalCommandExitCode() ?? 0),
  );
}
//@ chunk-tyg7f3ek.js:652107-652157 layout
function isModelDifferentFromRestricted(userSpecifiedModel, restrictedStartupModel) {
  return (
    userSpecifiedModel === undefined ||
    parseUserSpecifiedModel(userSpecifiedModel) !== parseUserSpecifiedModel(restrictedStartupModel)
  );
}
//@ chunk-tyg7f3ek.js:652157-652293 layout = createModelSwitchBreadcrumbs (1)
function createModelSwitchBreadcrumbs(e, userSpecifiedModel, prevModel) {
  if (
    "model" in e &&
    (e.model == null || String(e.model).trim().toLowerCase() === "default") &&
    userSpecifiedModel !== undefined &&
    userSpecifiedModel !== prevModel
  )
    return prevModel;
  return;
}
//@ chunk-tyg7f3ek.js:652293-652402 layout
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
//@ chunk-tyg7f3ek.js:652402-652485 layout
function resolveSessionCwd(e) {
  let cwd = getSessionProject(e).cwd;
  try {
    resolvePhysicalCwd(cwd);
    return cwd;
  } catch {
    return getSessionProject(e).originalCwd;
  }
}
//@ chunk-tyg7f3ek.js:652485-652566 layout
function isAdvertisedCommand(e) {
  return e.terminalOriented !== true || e.advertisedOnHostedSessions === true;
}
//@ chunk-tyg7f3ek.js:652566-652580 layout
var OAUTH_FLOW_JOIN_WINDOW_MS = 600000;
//@ chunk-tyg7f3ek.js:652580-652708 layout
/**
 * 已有的 OAuth 流程是否可复用（同一登录方式、同一组织、尚未收到授权码、10 分钟内）。
 */
function canJoinOAuthFlow(e, n, forceLoginOrgUUID, s) {
  return (
    e.loginWithClaudeAi === n &&
    e.orgUUID === forceLoginOrgUUID &&
    !e.service.hasReceivedAuthorizationCode() &&
    s - e.startedAt < OAUTH_FLOW_JOIN_WINDOW_MS
  );
}
//@ chunk-tyg7f3ek.js:652708-850597 callgraph-witnessed = runHeadlessStreaming (0.158)
/**
 * runHeadlessStreaming：headless 主循环。读取输入消息与 control_request（initialize、interrupt、set_model、set_permission_mode、mcp_set_servers、rewind_files 等约 90 种子类型），排队执行查询轮次并产出 SDK 消息。
 */
function _runHeadlessStreamingForTesting(
  e,
  structuredIO,
  clients,
  s,
  h,
  messages,
  canUseTool,
  R,
  getState,
  setAppState,
  L,
  q,
  x,
  turnInterruptionState,
  supersededToolUseIds,
  deferredToolUse,
  parkedPermission,
  bootRetiredToolUseIds,
  pendingActionClass,
  initParkReport,
) {
  let messageQueue = x.messageQueue;
  let Se = new UnseenPanelModInputHold(messageQueue, () => clientRegistry.list().length > 0);
  let me = {
    getState,
    setState: setAppState,
    subscribe: L,
  };
  let Me = McpConnectionStore.over(me);
  let Ee = PluginsStateStore.over(me);
  let He = false;
  let Xe;
  e.mcpSessionWiring.registerConnections(Me);
  computerUseOwnerLock.of(e).acquire(ComputerUseStateCell.over(me));
  if (structuredIO instanceof RemoteIO) {
    startCgroupCpuSampling(structuredIO.sessionState, getState, e.host.clock);
    startHostCpuSampler(createTaskFramework(getState, setAppState));
    startToolCpuSampling(structuredIO.sessionState, getState, e.host.clock);
  }
  let We = () => false;
  let St = RECEIVED_MESSAGE_UUIDS.of(e);
  let wt = HOST_INGRESS_LANES.of(e);
  let heldInMemory = makeHeldMessageMatcher(messages, () => messages, getSessionId);
  let pn = isSelfHostedHeldRecognition() ? interruptedTurnUuids(messages) : new Set();
  let sessionId = getSessionId();
  let storeRewindStandIn = makeRewindStandInWriter(
    {
      conversation: () => messages_2,
      append: Gs,
      appendsSettled: () => rs.settled(),
      storageV5: x.storageV5,
    },
    messages,
  );
  let jn = new RedeliveryResolver({
    io: structuredIO,
    messageQueue,
    receivedMessageUuids: St,
    transcript: createTurnPersistenceChecks({
      storageV5: x.storageV5,
      heldInMemory,
    }),
    holds: (O) => Ie.heldMessage() === O || Ie.waitsForItsReRun(O),
    storeRewindStandIn,
    hasRewindTarget: (O) => hasRewindTarget(messages_2, O),
    noteClosedUnrun: (O, Q) =>
      reportRedeliveredFollowupClosed(messages_2, O, Q === "cancelled" ? "cancelled" : "later"),
  });
  let deliveryLedger = new DeclinedRedeliveryBatcher({
    io: structuredIO,
    messageQueue,
    declined: jn,
    onBatch: (O, Q) => {
      if (Q === "settled" && isTeardownUnwindRequested()) return;
      Ie.noteBatch(O, Q);
    },
  });
  let ze = new PrintRunState();
  let turnInterruption = detectTurnInterruption(turnInterruptionState, messages);
  let $r =
    turnInterruptionState?.kind === "interrupted_prompt"
      ? turnInterruption
      : findLastUserPromptUuid(messages);
  ze.noteStoredLastPrompt($r);
  let $n = turnInterruptionState?.kind === "interrupted_prompt";
  let ut = new Set();
  let storedPrompt = $r === undefined ? undefined : messages.findLast((O) => O.uuid === $r);
  let heldBackResult = null;
  let kn = 0;
  let En = () =>
    heldBackResult !== null && lazyCronTools.isKairosCronEnabled() && !hasReachedBudget(x.maxBudgetUsd);
  let Mr = () => ze.inputClosed && En() && isTidySlothGateOn();
  let remoteControlForkChild = x.remoteControlForkChild ?? null;
  let oo = isBridgeForkSupported(x.sdkUrl);
  let No = false;
  let Fr = () => {
    if (No) return;
    No = true;
    setImmediate(releaseStartupWork, e.host, "host_initialized");
  };
  let Xo = 0;
  let fi = false;
  let deferred = Promise.withResolvers();
  let clearBeforeRun = x.parkLane.runsBeforeClear
    ? () => Promise.resolve(true)
    : createTeardownStatusReporter({
        io: structuredIO,
        details: parkedPermission?.details,
        holding: () => Ie.holdingParkedPermission(),
        statusTaken: () => ze.running || structuredIO.hasStandingPrompt(),
        tornDown: () => isShuttingDown() || isTerminalShutdown(),
        whenTornDown: () => deferred.promise,
        boundMs: COST_PUSH_INTERVAL_MS,
        onUnconfirmed: (O) =>
          logForDebugging(
            `[print.ts] A parked permission's call was not run: its record's delete was not confirmed (${O})`,
            {
              level: "warn",
            },
          ),
        onError: (O, Q) => logError(Q),
      });
  let Bi = false;
  let Hi = false;
  let ja = false;
  let Qa = structuredIO.isRemoteTransport()
    ? new UnattendedStartRecord(
        structuredIO,
        x.restoredWorkerMetadata ?? null,
        {
          flagsFetched: initializeGrowthBook,
          exiting: isTerminalShutdown,
        },
        x.unattendedStartsTimings,
      )
    : undefined;
  let It = new Map();
  let Ie = new ParkedPermissionController({
    markAnswer: Qa?.answers,
    parkedPermission,
    holdOpenFor: x.holdOpenFor,
    interruptedTurnsPrompt: turnInterruption,
    fromInterruptedTurnsPrompt: userMessagePlatformFields(messages, turnInterruption),
    turnInterruptionState,
    supersededToolUseIds,
    bootRetiredToolUseIds,
    answeredToolUseIds: x.answeredToolUseIds,
    initParkReport,
    pendingActionClass,
    cutOffAgentCalls: collectResumableAgentIds(x.supersededToolNames).size,
    resumedAgentCalls: x.agentResumes?.flatMap((agentResume) => agentResume.call ?? []),
    keptSubagentAsk: x.keptSubagentAsk,
    servedCallsToAdopt: x.servedCallsToAdopt,
    servedCallsNeverSent: x.servedCallsNeverSent,
    journaledServedCalls: x.journaledServedCalls,
    withdrawCard: (requestId) =>
      structuredIO.write({
        type: "control_cancel_request",
        request_id: requestId,
      }),
    retirementWriter: {
      append: (O) => recordTranscript(O, undefined, undefined, undefined, x.storageV5),
      flush: () => flushSessionStorage(),
      storedForNextWorker: async (O) => {
        await structuredIO.flushInternalEvents();
        return structuredIO.refusedInternalEvents(O).length === 0;
      },
    },
    endStoppedTurn: (O) => {
      let Q = interruptedPromptUuid(turnInterruptionState);
      let listed;
      try {
        let ke =
          turnInterruptionState?.kind === "interrupted_prompt"
            ? messages_2.findIndex(
                (rt) => rt.uuid === turnInterruptionState.message.uuid && isInterruptMarkerRow(rt),
              )
            : -1;
        listed =
          Q === undefined
            ? undefined
            : heldUuidsAnsweredByTurn(
                [
                  ...messages_2.filter(
                    (rt, dt) =>
                      ke === -1 || (dt !== ke && !(dt === ke + 1 && isSyntheticApiErrorMessage(rt))),
                  ),
                  ...O,
                ],
                Q,
              );
      } catch (error) {
        logError(error);
      }
      for (let ke of retirementPromptRows({
        sessionId: getSessionId(),
        prompt: Q,
        listed,
        retirementRows: O,
        othersToCome:
          ze.endSessionRequested || isShuttingDown() || isTerminalShutdown()
            ? 0
            : hasBatchableQueuedPrompt(messageQueue) + (ze.intentBatchInFlight && Bi ? 1 : 0),
      }))
        output.enqueue(ke);
    },
    clearBeforeRun,
    receivedAnswersRead: () => structuredIO.whenReceivedAnswersRead(),
    answers: applyPermissionAnswerChanges,
    lane: x.parkLane,
    io: structuredIO,
    drain: ze,
    messageQueue,
    declinedRedeliveries: jn,
    store: me,
    kick: () => void Os(),
    isShuttingDown,
    isTerminalShutdown,
    findUnresolvedToolUse: createUnresolvedToolUseFinder({
      supersededToolUseIds,
      tookOverAPrompt: parkedPermission !== undefined,
      storageV5: x.storageV5,
    }),
    reportInheritedPromptDecided: () => dL(),
    reportIdleAtTurnEndAllowed: () => Ic(),
    dropLoaderSyntheticRows: ig,
    removeInterruptedMessage: (interruptedUserMessage) => {
      let index = messages_2.findIndex((ke) => ke.uuid === interruptedUserMessage.uuid);
      let he =
        index === -1
          ? undefined
          : messages_2
              .slice(index + 1)
              .findLast((ke) => ke.type === "assistant" && ke.isApiErrorMessage === true);
      if (he !== undefined) It.set(interruptedUserMessage.uuid, he);
      removeInterruptedMessage(messages_2, interruptedUserMessage);
    },
    putAheadOfLoaderRows: (O) => restoreInterruptedPrompt(messages_2, turnInterruptionState, O),
    sendsTheInterruptedTurnHolds: (O) => answeredHeldUuids(messages_2, O.uuid),
    sendsOfTheCompactedTurn: (O, Q) => runningTurnSendsForTurn(messages_2, O.uuid, Q),
    sendsTheParkedTurnTookIn: (O, Q) => getParkedTurnSendUuids(messages_2, O.uuid, Q),
    adoptedServedCallsCommand: (calls) =>
      buildOrphanedPermissionPrompt({
        calls,
        tools: h,
        supersededToolNames: x.supersededToolNames,
        servedCallsNeverSent: x.servedCallsNeverSent,
      }),
    lostCallsNote: (O, Q) => ccrLostCallsNote(x, O, Q),
    inFlightServedCalls: () => toolState.get(ServedCallRegistry),
    presentAdoptedHostTools: (O) => countPowerShellCallsWhenDisabled(toolState.get(BridgeToolProvider), O),
    servedElsewhere: (O, Q) => isRemoteCapableCall(O, Q, h),
  });
  let on = (O) => {
    try {
      return O();
    } catch (error) {
      logError(error);
      return [];
    }
  };
  let Zn = (messageUuid) => {
    try {
      return Ie.declinesWithdrawalOf(messageUuid);
    } catch (error) {
      logError(error);
      return true;
    }
  };
  let Nn = new SdkResultReporter({
    recentErrors: () => getInMemoryErrors().map((O) => O.error),
  });
  let Cr = deferredToolUse;
  let mr = false;
  clearTeardownUnwind();
  let io = new Map();
  let Hr = () =>
    ze.abortController !== undefined &&
    ze.abortController.signal.aborted &&
    shutdownInterruptStamp(ze.abortController.signal) === true;
  let es;
  let Ys = () => {
    if (es !== undefined) {
      clearInterval(es);
      es = undefined;
    }
  };
  let ou = () => {
    let maxBudgetUsd = x.maxBudgetUsd;
    if (maxBudgetUsd === undefined || es !== undefined) return;
    es = setInterval(
      (Q, maxBudgetUsd, ke, setAppState, dt, storageV5) => {
        try {
          if (isShuttingDown() || dt()) {
            ke();
            return;
          }
          if (
            stopAgentsOverBudget({
              maxBudgetUsd,
              abortedForShutdown: false,
              turnAborted: true,
              getAppState: Q,
              setAppState,
              storageV5,
            })
          ) {
            ke();
            return;
          }
          if (!hasAwaitedRunningTaskIn(Q().tasks)) ke();
        } catch (error) {
          ke();
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
      getState,
      maxBudgetUsd,
      Ys,
      setAppState,
      Hr,
      x.storageV5,
    );
    es.unref?.();
  };
  let isSessionEnding = () => isShuttingDown() || Hr() || ze.endSessionRequested || ze.inputClosed;
  let Ni = new KeepaliveAfterStop({
    sendKeepAlive: createKeepAliveSender(structuredIO.outbound),
    getTasks: () => getState().tasks,
    getTurnSignal: () => ze.abortController?.signal,
    isSessionEnding,
  });
  let Rd = () => {
    let O = {
      taskRegistry: createTaskFramework(getState, setAppState),
      setAppState,
      storageV5: x.storageV5,
    };
    if (getSdkPerTaskStopAffordance()) {
      logFeatureOk("per_task_stop_sparing", {
        spared: true,
      });
      stopObserverAgents(O);
      ou();
    } else {
      logFeatureOk("per_task_stop_sparing", {
        spared: false,
      });
      stopAllRunningTasks(O);
    }
    Ni.arm();
    return O;
  };
  let Ro = new PrewaitLatch({
    messageQueue,
    commandLacksUserIntent: isPassiveCommand,
  });
  let dc = commandsDiscardedSignal.subscribe((O) => {
    for (let Q of O) Q.handedOffTurn?.release?.();
  });
  let abortController = createAbortController(500);
  let abortController_2 = createAbortController(500);
  let Wi = new Map();
  let output = structuredIO.outbound;
  let keepAliveSender = createKeepAliveSender(output);
  let _a = false;
  let to = false;
  let sigintHandler = () => _a || to || output.ended || isTerminalShutdown();
  installLifecycleForwarderUnlessRemote(structuredIO, output);
  let stopping = () => isShuttingDown() || isTerminalShutdown() || isTeardownUnwindRequested() || to;
  let fetchHoldRegistry = createFetchHoldRegistry({
    stopping,
  });
  let Cd;
  if (structuredIO instanceof RemoteIO && structuredIO.onCommandLifecycle !== undefined)
    structuredIO.onCommandLifecycle = fetchHoldRegistry.through(structuredIO.onCommandLifecycle);
  if (lazySessionInboxPointers)
    lazySessionInboxPointers.sessionInboxPointers.of(e).tapCommandLifecycle(structuredIO);
  settleOnTurnFinish(structuredIO);
  watchCommentWakeLifecycle(structuredIO);
  notificationSettleListenerSlot.of(e).listener = (O) => reportCommentWakesStarted("queued_notification", O);
  let vn = null;
  transportStateByHost.of(e).remoteBridgeLive = () => vn !== null;
  let ts = false;
  let bridgeEpoch = 0;
  let zr;
  let _s;
  let Xs = false;
  function is(mode) {
    if (Xs) return;
    if (zr) zr.noteModeChoice(mode);
    else if (_s !== undefined) _s = mode;
  }
  function as(O) {
    Xs = true;
    try {
      setAppState(O);
    } finally {
      Xs = false;
    }
  }
  let bridgeSdkController = createBridgeSdkController({
    storageV5: x.storageV5,
  });
  function Pl(O, bridgeEpoch) {
    return {
      session_url: getRemoteSessionUrl(O.bridgeSessionId, O.sessionIngressUrl),
      connect_url: buildBridgeConnectUrl(O.environmentId, O.sessionIngressUrl),
      environment_id: O.environmentId,
      bridge_epoch: bridgeEpoch,
      bridge_session_id: O.bridgeSessionId,
    };
  }
  let resolved = Promise.resolve();
  let Jr;
  let Bs;
  let ji = false;
  let Qi;
  let loadedCompaction = compactionPreservedRows(messages, turnInterruption);
  let ka = () => Ie.cutOffTurnIsStillOwed() || isTeardownUnwindRequested();
  let Oo = new UserFrameIntake({
    admissionBarrier: () => switchSerializerSlot.of(e),
    firstTurnGate: () => Jr,
    messageQueue,
    drain: ze,
    receivedMessageUuids: St,
    declinedRedeliveries: jn,
    io: structuredIO,
    transcriptForFrame:
      pn.size > 0
        ? wrapPersistenceWithFollowupCheck(
            createPersistenceChecker({
              storageV5: x.storageV5,
              heldInMemory,
            }),
            (O) => pn.has(O) && getSessionId() === sessionId && isSelfHostedHeldRecognition(),
            async (O) =>
              countUserPromptsFromEntries_4(await loadSessionTranscriptRows(sessionId, x.storageV5), O),
          )
        : createPersistenceChecker({
            storageV5: x.storageV5,
            heldInMemory,
          }),
    kick: () => void Os(),
    retirementMayLandDuringReads: () => Ie.retirementMayLandDuringReads(),
    rescueOwnsReRun: () => Ie.rescueOwnsReRun(),
    idleTeeAllowed: () => Ic() && !structuredIO.hasStandingPrompt(),
    heldForParkedTurn: (O) => Ie.heldMessage() === O || Ie.waitsForItsReRun(O),
    summarisedAway: (O) =>
      classifyRedeliveredRow(O, {
        loadedCompaction,
        carriesTheCutOffTurnOn: () => Ie.hasCarriedTheCutOffTurnOn(),
        anInheritedPromptWaits: () => Ie.inheritedPromptPending(),
        startedAtMs: (Q) => structuredIO.userFrameStartedAtMs(Q),
        noteCopyAwaitsTheCutOffTurn: () => Ie.noteCopyAwaitsTheCutOffTurn(),
        cutOffTurnIsStillOwed: ka,
      }),
    cutBehindItsCompaction: (uuid) =>
      !Ie.hasCarriedTheCutOffTurnOn() &&
      isRowFromLoadedCompaction({
        uuid,
        conversation: messages_2,
        loadedCompaction,
      }),
    readAgain: (O) => structuredIO.readAgain(O),
    startAborted: (O) => Ro.startQueuedMessageAborted(O),
    earlierStartOf: (O) => {
      let Q = structuredIO.userFrameStartedAtMs(O);
      return Q === undefined
        ? undefined
        : {
            startedAtMs: Q,
            inheritedPromptPending: Ie.inheritedPromptPending(),
            conversationHasCompactBoundary: messages_2.some(isCompactBoundaryMessage),
            conversationHasMessageAsQueuedCommand: messages_2.some((he) => getSourceUuid(he) === O),
            followUp: foldedFollowUpTelemetry(x.followUpsAtStartUp?.get(O), {
              cardCanBeHeld: Ie.inheritedPromptHoldCapable(),
              openerKnown: turnInterruption !== undefined,
            }),
            endedTurnsCopy: compactionCopyTelemetry({
              uuid: O,
              loadedCompaction,
              carriesTheCutOffTurnOn: Ie.hasCarriedTheCutOffTurnOn(),
              finishedTail: weakMapLookup(turnInterruptionState),
              growthBookCold: needsGrowthBookRefresh(),
            }),
          };
    },
    leftToReRun: (O) => Ie.reRunAnswers(O),
    takenInAtAPrompt: (O) => (Ie.cardsTurnTookIn(O) ? ka : undefined),
    finishedAtStartUp: (uuid) =>
      tailDiagnosticsFields(weakMapLookup(turnInterruptionState), {
        uuid,
        nowMs: Date.now(),
        commandsDequeued: ze.dequeueCount,
        rerunOwed: Ie.rescueOwnsReRun(),
        shuttingDown: ze.endSessionRequested || isShuttingDown() || isTerminalShutdown(),
      }),
    noteReportedDoneUnrun: (O) => reportRedeliveredFollowupClosed(messages_2, O, "on_arrival"),
    storeRewindStandIn,
  });
  let Vi = serializeCalls((O) => O());
  let resolved_2 = Promise.resolve();
  let Ps = 0;
  let diskBehindReminder = x.diskBehindReminder;
  let wa;
  let Hs;
  let Si = new Set();
  let Ms;
  function Od() {
    if (!Ms) return;
    let O = 0;
    while (O < Ms.length && Ms[O]?.uuid === messages_2[O]?.uuid) O++;
    Ms.length = O;
  }
  function Dd() {
    if (!vn) return;
    bridgeSdkController.noteTranscriptLocation();
    try {
      let O = Ps > messages_2.length ? 0 : Ps;
      let Q = [];
      let he = [];
      for (let ke of messages_2.slice(O)) {
        if (!isEligibleBridgeMessage(ke) || Si.has(ke.uuid)) continue;
        if (isCompactBoundaryOrSummary(ke) && isCompactPairWithheldFromRemote()) {
          he.push(ke);
          continue;
        }
        Q.push(ke);
      }
      if (Hs !== undefined) {
        let { anchor, userMessageUuid } = Hs;
        let dt = anchor === undefined ? -1 : messages_2.indexOf(anchor);
        if (anchor === undefined || dt !== -1) {
          let Gt;
          for (let pt of messages_2.slice(dt + 1)) {
            if (isCompactBoundaryMessage(pt)) {
              Gt = undefined;
              break;
            }
            if (!isRealAssistantMessage(pt)) continue;
            if (Gt === undefined || supersedesMessage(pt, Gt)) Gt = pt;
          }
          if (Gt !== undefined && Q.includes(Gt))
            vn.stampReply({
              assistantUuid: Gt.uuid,
              userMessageUuid,
            });
        }
      }
      if (Q.length > 0) vn.writeMessages(Q);
      for (let ke of Q) Si.add(ke.uuid);
      for (let ke of he) Si.add(ke.uuid);
      Ps = messages_2.length;
    } catch (error) {
      logForDebugging(`[bridge:sdk] transcript forward failed: ${toError(error).message}`, {
        level: "error",
      });
    }
  }
  function ws() {
    let O = drainTaskNotifications();
    if (O.some((Q) => Q.type === "conversation_reset")) {
      Ps = 0;
      Od();
      clearLateSessionStartRows(Rc, x.overdueSessionStartHooks);
      diskBehindReminder = undefined;
      wa = undefined;
      remoteControlForkChild?.discardSeed();
    }
    if (vn && O.length > 0)
      try {
        let Q = isBridgeStateFramesEnabled();
        if (!Q && O.some((ke) => ke.type === "conversation_reset")) setCurrentForKey(e, undefined);
        let mapped = O.filter(isEphemeralSdkFrame)
          .filter((ke) => ke.type !== "conversation_reset" || Q)
          .map(stripCompactErrorForSdk);
        if (mapped.length > 0) vn.writeSdkMessages(mapped);
      } catch (error) {
        logForDebugging(`[bridge:sdk] task-event forward failed: ${toError(error).message}`, {
          level: "error",
        });
      }
    return O;
  }
  function ns(O) {
    if (!vn) return;
    try {
      if ((O.type === "assistant" || O.type === "user") && O.parent_tool_use_id != null) {
        let bridgeSubagentFrameGate = getBridgeSubagentFrameGate();
        if (shouldForwardSubagentMessage(bridgeSubagentFrameGate, O)) vn.writeSdkMessages([O]);
        return;
      }
      if (O.type !== "system") return;
      if (!(
        O.subtype === "thinking_tokens" ||
        O.subtype === "api_retry" ||
        (O.subtype === "status" && useShimmerAnimation(O.status))
      ))
        return;
      vn.writeSdkMessages([stripCompactErrorForSdk(O)]);
    } catch (error) {
      logForDebugging(
        `[bridge:sdk] ${"subtype" in O ? O.subtype : O.type} forward failed: ${toError(error).message}`,
        {
          level: "error",
        },
      );
    }
  }
  function Va(permissionMode, uuid) {
    return {
      type: "system",
      subtype: "status",
      status: null,
      permissionMode,
      uuid,
      session_id: getSessionId(),
    };
  }
  function Ga() {
    if (!isSdkBridgeStateAnnounceEnabled()) return;
    ns(Va(toExternalPermissionMode(getState().toolPermissionContext.mode), randomUUID()));
  }
  let su = installSdkEventDrain({
    drain: ws,
    emit: (O) => output.enqueue(O),
  });
  if (x.outputFormat === "stream-json" && x.sessionMirror)
    addSessionMirror((filePath, entries) => {
      structuredIO.write({
        type: "transcript_mirror",
        filePath,
        entries,
      });
    });
  let Vs = () => {};
  let Fd = () => {
    logForDiagnosticsNoPII("info", "shutdown_signal", {
      signal: "SIGINT",
    });
    if (isShuttingDown()) {
      markStdoutDrainExternallyClocked();
      return;
    }
    if (ze.abortController && !ze.abortController.signal.aborted)
      ze.abortController.abort(userAbortReason("user-cancel"));
    Vs();
    abortController.abort();
    abortController_2.abort(userAbortReason("user-cancel"));
    markStdoutDrainExternallyClocked();
    gracefulShutdown(0);
  };
  process.on("SIGINT", Fd);
  let iu = false;
  let Al = () => {
    if (iu || isShuttingDown()) return;
    iu = true;
    latchTerminalShutdown();
    killRunningShellCommands();
    Vs();
    abortController.abort();
    abortController_2.abort(userAbortReason("shutdown"));
    gracefulShutdown(143);
  };
  process.on("SIGTERM", Al);
  markPrintModeSignalHandlersRegistered();
  structuredIO.setOnStreamClosedWithParkedQuestion(() => {
    requestTeardownUnwind();
    Ys();
    if (ze.abortController && !ze.abortController.signal.aborted)
      ze.abortController.abort(userAbortReason("shutdown"));
  });
  registerCleanup(async () => {
    if (vn) bridgeSdkController.persist(vn);
    deferred.resolve();
    Ie.onShutdown();
    Nn.reportTerminatedOnShutdown({
      aborted: ze.abortController?.signal.aborted === true,
      runPhase: ze.runPhase,
      exitCode: typeof process.exitCode === "number" ? process.exitCode : undefined,
    });
    let O = {};
    for (let Q of getRunningTasks(getState())) if (waitForTaskCompletion(Q)) O[Q.type] = (O[Q.type] ?? 0) + 1;
    logForDiagnosticsNoPII("info", "run_state_at_shutdown", () => ({
      run_active: ze.running,
      run_phase: ze.runPhase,
      worker_status: structuredIO.sessionState.getState(),
      internal_events_pending: structuredIO.internalEventsPending,
      bg_tasks: O,
      cc_version: {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
      ...bytecodeOrderStats(),
    }));
    logEvent("tengu_shutdown_pending_state", {
      had_live_turn: ze.running,
      worker_status: fromEnum(structuredIO.sessionState.getState()),
      pending_human_requests: structuredIO.pendingHumanRequestCount,
      replies_left_for_next_process: structuredIO.repliesLeftForNextProcess,
      internal_events_pending: structuredIO.internalEventsPending,
      exiting: isTerminalShutdown(),
    });
  });
  function za(newMode) {
    return emitStatusMessage(
      {
        io: structuredIO,
        getAppState: getState,
      },
      newMode,
    );
  }
  installPermissionModeReporter(
    {
      io: structuredIO,
      getAppState: getState,
    },
    (permissionMode, uuid) => {
      is(permissionMode);
      if (isSdkBridgeStateAnnounceEnabled()) ns(Va(permissionMode, uuid));
      refreshAndReevaluateHeld("mode-changed");
    },
  );
  {
    let O = alwaysFalse_2()
      ? makePermissionModeReader(getState, za)
      : () => notifyProactivityChanged(structuredIO.sessionState, getState());
    structuredIO.sessionState.onProactivityLevelChanged = O;
    onProactivitySelectorChange(O);
  }
  if (x.planModeOnResume === "restored" || x.planModeOnResume === "declined")
    structuredIO.sessionState.notifyPermissionModeChanged(getState().toolPermissionContext.mode);
  createPeerMessageRouter({
    output,
    io: structuredIO,
    hostIngressLanes: wt,
    readMode: () => {
      let toolPermissionContext = getState().toolPermissionContext;
      return {
        mode: toolPermissionContext.mode,
        isBypassPermissionsModeAvailable: toolPermissionContext.isBypassPermissionsModeAvailable,
      };
    },
    remoteTransport: structuredIO instanceof RemoteIO,
    publishesAvailability: Boolean(env.CLAUDE_CODE_REMOTE || x.sdkUrl),
  });
  {
    let { startCrossSessionHoldReceipt } = require("./chunk-hgkbg5ez.js");
    let crossSessionHoldReceipt = startCrossSessionHoldReceipt({
      clock: {
        setTimeout: (he, ke) => {
          let timer = setTimeout(he, ke);
          timer.unref();
          return () => clearTimeout(timer);
        },
      },
      transcript: {
        apply: (he) => {
          for (let ke of he.type === "append" ? he.messages : []) {
            if (ke.type !== "system" || ke.subtype !== "informational") continue;
            logForDebugging(`[headless] cross-session hold-receipt: ${ke.content}`);
            let rt = {
              type: "system",
              subtype: "informational",
              content: ke.content,
              level: "warning",
              uuid: ke.uuid,
              session_id: getSessionId(),
            };
            output.enqueue(rt);
          }
        },
      },
      queue: messageQueue,
      wakesIdleSession: () => !ze.inputClosed,
      hidesFoldedNotices: true,
    });
    registerCleanup(async () => crossSessionHoldReceipt());
  }
  let Nr;
  if (env.CLAUDE_CODE_REMOTE) {
    let O = (activeGoal) => {
      output.enqueue({
        type: "active_goal",
        value: activeGoal ? serializeGoalState(activeGoal) : null,
        uuid: randomUUID(),
        session_id: getSessionId(),
      });
    };
    structuredIO.sessionState.onActiveGoalChanged = O;
    O(getState().activeGoal);
    Nr = installAutocompactStateReporter({
      session: e,
      sessionState: structuredIO.sessionState,
      enqueue: (status) => output.enqueue(status),
      readInputs: () => Il(),
      reportContextUsage: () => report(),
    });
  } else {
    structuredIO.sessionState.onAutocompactInputsChanged = () => {
      report();
      buildBridgeInitializeCommands(Il);
    };
    if (x.sdkUrl)
      initializeGrowthBook()
        .catch(() => {})
        .then(() => report());
  }
  let Do = new BangCommandRunner();
  let Ya = new RemoteMcpTaskTracker();
  let ni = new Set();
  let rateLimitListener = (limits) => {
    ni.add(limits);
    let Q = () => {
      ni.delete(limits);
    };
    limits.then(Q, Q);
    return limits;
  };
  let rateLimitInfo = serializeCalls((O) => O());
  let resolved_3 = Promise.resolve();
  let pr = 1 / 0;
  let promptSuggestionEmitter = createPromptSuggestionEmitter({
    emit: (O) => output.enqueue(O),
    promptSuggestions: () => x.promptSuggestions,
    shuttingDown: isShuttingDown,
    holdsResults: () => th.holdsResults(),
    messages,
    getAppState: getState,
  });
  let oi;
  if (x.enableAuthStatus)
    oi = AwsAuthStatusManager.getInstance().subscribe((status) => {
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
    emit: (O) => output.enqueue(O),
    sessionState: structuredIO.sessionState,
    bridgeHandle: () => vn,
  });
  let messages_2 = messages;
  let cs = new OwnCardDeadline({
    io: structuredIO,
    mainTranscript: () => messages_2,
    isSessionEnding,
  });
  let lu = structuredIO.onRequestPending(() => cs.arm());
  let rs = orderedRowSource({
    keep: (O) => {
      messages_2.push(...O);
    },
    rows: () => messages_2,
    list: messages_2,
    isHookable: true,
  });
  let filtered = (x.openingRowsMade ?? []).filter((O) => messages_2.includes(O));
  if (filtered.length > 0) {
    let readFileState = appendRowsWithHooks(rs, filtered, {
      fills: true,
    });
    if (readFileState instanceof Promise) readFileState.catch(logError);
  }
  headlessProfilerCheckpoint("before_extractReadFiles");
  let readFilesFromMessages = extractReadFilesFromMessages(messages, cwd(), READ_FILE_STATE_CACHE_SIZE);
  headlessProfilerCheckpoint("after_extractReadFiles");
  let deferred_2 = Promise.withResolvers();
  if (isResumeFrameSeedEligible()) {
    applyArtifactResumeCarry(
      setAppState,
      collectResumeArtifactCarry(messages, {
        origin: x.initialMessagesOrigin ?? "local",
        seedEligible: true,
      }),
    );
    if (messages.some((O) => O.type !== "system"))
      rearmHeadlessCommentMonitors({
        initialMessages: messages,
        hostInitialized: deferred_2.promise,
        getAppState: getState,
        storageV5: x.storageV5,
        transcriptAnchor: x.transcriptAnchor,
        buildContext: () =>
          ask(yc(_c()), {
            abortController: new AbortController(),
            userSpecifiedModel,
          }),
        emit: (O) => {
          for (let Q of O) output.enqueue(informationalSystemMessage(Q));
        },
      });
  }
  registerMemoryAttributor("messages", () => ({
    entries: messages_2.length,
  }));
  registerMemoryAttributor("file_state_cache", () => ({
    entries: readFilesFromMessages.size,
    bytes: readFilesFromMessages.calculatedSize,
  }));
  let sessionEnvVars = new Map();
  let toolState = new InstanceRegistry();
  setToolState(e, toolState);
  let ps = x.sessionHooks ?? createSessionHooksRegistry();
  let memorySelector = emptyPickerState();
  let clients_2 = getState().mcp.clients;
  let isolationLatch = createIsolationLatch(
    getCurrentSessionIsolationLatch() ??
      findIsolationLatchFromHistory(messages, h, DEFAULT_EXEMPT_SERVERS, clients_2, e),
    (O) => saveIsolationLatch(O, x.storageV5),
  );
  androidEvidenceByHost.of(e.host).absorb(messages);
  if (!isParkedSpare()) devIntentTracker.of(e.host).start();
  let pendingSeeds = createRemoteFileState(READ_FILE_STATE_CACHE_SIZE);
  function cache() {
    for (let [path, seed] of pendingSeeds.entries()) {
      let existing = readFilesFromMessages.get(path);
      if (!existing || seed.timestamp > existing.timestamp) readFilesFromMessages.set(path, seed);
    }
  }
  function Ld() {
    cache();
    pendingSeeds.clear();
  }
  let ba = [];
  let jo;
  function Gs(O) {
    if (jo?.getMessages() === messages_2) jo.appendMessages(O);
    else {
      let Q = appendRowsWithHooks(rs, O);
      if (Q instanceof Promise) Q.catch(logError);
    }
  }
  Ie.resumeInterruptedTurn();
  function ig() {
    dropRedundantResumeMessages(messages_2, turnInterruptionState, (O) => {
      if (Ps > O) Ps -= 1;
      Od();
    });
  }
  Ie.walkBackKeptRegistrationWithoutPark();
  let lc = describeInterruptedTasks(x.restoredOrphans ?? [], {
    interruptionKind: turnInterruptionState?.kind ?? "none",
    hasQueuedMainThreadCommand: messageQueue.peek(isActiveMainAgentCommand) !== undefined,
    deferredResumePending: deferredToolUse !== undefined,
    rescueSuppressed: x.rescueSuppressed ?? false,
    enabled: getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_orphan_restore_wake", true),
    includeShells: getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_orphan_restore_wake_shells", true),
    hasTool: (O) => findToolByName(h, O) !== undefined,
    alsoResumable: x.alsoResumable,
    autoResumed: new Set(x.agentResumes?.map((agentResume) => agentResume.agentId)),
    lostTimers: x.lostSessionTimers ?? [],
  });
  if (lc) {
    let { command, counts } = lc;
    logEvent("tengu_ccr_orphan_restore_wake", {
      orphan_count: x.restoredOrphans?.length ?? 0,
      wake_agent_count: counts.agent,
      wake_monitor_count: counts.monitor,
      wake_shell_count: counts.shell,
      wake_timer_count: x.lostSessionTimers?.length ?? 0,
    });
    logForDebugging("[print.ts] Waking the session for background tasks or timers lost to the restart");
    messageQueue.enqueuePendingNotification(command);
  }
  let Im = () => {
    let modelOptions = buildModelPickerOptions();
    return {
      models: toSdkModelInfos(modelOptions.filter((option) => !option.disabled)),
      unavailable: toSdkModelInfos(getUnavailableModelRows(modelOptions)),
    };
  };
  let userSpecifiedModel = x.userSpecifiedModel;
  onSessionSwitchCallback(() => {
    userSpecifiedModel = undefined;
  });
  function Ao() {
    return resolveSwitchedModel(userSpecifiedModel);
  }
  let Xa = retryWatchdogEnv()
    ? createUsageLimitWaitHeartbeat({
        readMainLoopModel: () => Ao() ?? getMainLoopModel(),
        emit: (O) =>
          output.enqueue({
            ...O,
            uuid: randomUUID(),
            session_id: getSessionId(),
          }),
      })
    : () => {};
  let Il = () => ({
    messages: messages_2,
    model: Ao() ?? getMainLoopModel(),
    autoCompactWindow: getState().autoCompactWindow,
    resetBoundary: getCurrentForKey(e),
  });
  let Om = () =>
    vg({
      detail: "summary",
    });
  let { report, reportAtTurnEnd } =
    env.CLAUDE_CODE_REMOTE || x.sdkUrl
      ? createContextUsageReporter(structuredIO.sessionState, Il, Om)
      : {
          report: () => {},
          reportAtTurnEnd: () => {},
        };
  report();
  let hasEffort = restoreThinkingSettingsFromRecord({
    launch: () =>
      new ThinkingDisplayState(
        x.thinkingConfig,
        x.thinkingConfigExplicit === true ? x.thinkingConfig : undefined,
      ),
    startupDisplay: undefined,
    recorded: x.recordedThinking ?? {
      malformed: false,
    },
    report: (O) => structuredIO.sessionState.notifyInternalMetadataChanged(O),
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
    session: e,
    messages: () => messages_2,
    appendToConversation: Gs,
    enqueue: (O) => output.enqueue(O),
    isLaunchModelPick: () => kv(),
  });
  function qd(O) {
    let systemMessage = createSystemMessage(O, "info");
    Gs([systemMessage]);
    let he = {
      type: "system",
      subtype: "informational",
      content: O,
      level: "notice",
      uuid: systemMessage.uuid,
      session_id: getSessionId(),
    };
    output.enqueue(he);
  }
  let td = env.CLAUDE_CODE_HOST_PROMPT_SUPERSEDES_RECORD;
  let nd = {
    surface: lit("print"),
    session: e,
    storageV5: x.storageV5,
    credentials: x.credentials,
    readAppState: getState,
    getActiveModel: () => userSpecifiedModel,
    applyModel: (O) => {
      userSpecifiedModel = O;
      setMainLoopModelOverride(O);
      setAppState((Q) => ({
        ...Q,
        mainLoopModelForSession: O,
      }));
      structuredIO.sessionState.notifyMetadataChanged({
        model: O,
      });
    },
    dropUnconfirmedLaunchModel: (refused) => {
      let hasAdaptiveThinking = modelToRestoreAfterRefusal({
        refused,
        launch: x.userSpecifiedModel,
        active: userSpecifiedModel,
        restored: getMainLoopModelOverride(),
        turnDispatched: e.requestJournal.mainThreadRequestedInProcess(),
      });
      if (hasAdaptiveThinking === undefined) return false;
      userSpecifiedModel = hasAdaptiveThinking;
      return true;
    },
    noticeRestrictedModel,
    recordAllowedModelApplied,
    getConversationModel: () => conversationModel(getMainLoopModel()),
    injectModelSwitchBreadcrumbs,
    setSystemPrompt: (systemPrompt) => {
      if (!x.systemPrompt) td = false;
      x.systemPrompt = systemPrompt;
      noteSystemPromptSectionInvalidation("sdk_system_prompt");
    },
    isLaunchModelPick: () => kv(),
  };
  let Ta = () =>
    checkAutoModeTransition(
      getState().toolPermissionContext,
      as,
      getState().fastMode,
      EVENT_LOGGING_FLAG_WAIT_MS,
    );
  let jd = () => isAutoModeTransitionDue(getState().toolPermissionContext, getState().fastMode);
  function uu() {
    if (modelSupportsAutoMode(getMainLoopModel())) return;
    let { mode } = getState().toolPermissionContext;
    if (mode === "auto")
      setPermissionModeWithGuards(
        "default",
        getState().toolPermissionContext,
        (updater) =>
          as((prev) => ({
            ...prev,
            toolPermissionContext: updater(prev.toolPermissionContext),
          })),
        "auto_gate_denied",
      );
    else if (mode === "plan" && isAutoModeActive())
      setAppState((Q) => ({
        ...Q,
        toolPermissionContext: transitionPlanAutoMode(Q.toolPermissionContext),
      }));
  }
  if (structuredIO instanceof RemoteIO) structuredIO.settleVouchedModelOrEffort(isAutoModeCapableModel);
  let mu = (requestId) =>
    structuredIO instanceof RemoteIO && structuredIO.takeVouchedModelOrEffortRequest(requestId);
  async function mc(O) {
    if (O) {
      await checkAutoModeInUse(getState().toolPermissionContext, as, getState().fastMode);
      return;
    }
    uu();
    await Ta();
  }
  let fu = (O) => {
    let Q = O == null || O.trim().toLowerCase() === "default";
    let he = Q ? getDefaultMainLoopModel() : O;
    let ke = Q ? managedDenyStartupRefusal(he, "switch") : null;
    if (ke !== null)
      return {
        ok: false,
        error: ke,
      };
    if (!Q) {
      let Dt = logUnrecognizedModelSwitch(he, lit("bridge_print"));
      if (Dt) return Dt;
    }
    let rt =
      !Q &&
      !isExemptDefaultResolvingPick(he) &&
      !(isModelAllowedUnderActiveEnforcement(he) ?? isModelAllowed(he));
    let dt = rt ? stepDownRestrictedFamilyAliasPick(he) : null;
    if (rt && dt === null) {
      let Dt = Ao();
      noticeRestrictedModel(he, Dt);
      return {
        ok: false,
        error: formatModelRestrictedNotice(he, Dt ?? getMainLoopModel()),
      };
    }
    let Gt = dt ?? he;
    let pt = () => {
      let Dt = getState();
      return {
        mainLoopModel: Dt.mainLoopModel ?? userSpecifiedModel ?? getMainLoopModel(),
        mainLoopModelForSession: Dt.mainLoopModelForSession,
        toolPermissionContext: Dt.toolPermissionContext,
      };
    };
    let Xt = () => {
      recordSwitchIfChanged(e, pt(), Q ? null : Gt, "sdk");
      userSpecifiedModel = Gt;
      setMainLoopModelOverride(Gt);
      setAppState((On) => ({
        ...On,
        mainLoopModelForSession: Gt ?? null,
      }));
      let { mode } = getState().toolPermissionContext;
      if (mode === "auto" && !isAutoModeGateEnabled()) {
        Xs = true;
        try {
          setPermissionModeWithGuards(
            "default",
            getState().toolPermissionContext,
            (updater) =>
              setAppState((prev) => ({
                ...prev,
                toolPermissionContext: updater(prev.toolPermissionContext),
              })),
            "auto_gate_denied",
          );
        } finally {
          Xs = false;
        }
      } else if (mode === "plan" && isAutoModeActive() && !isAutoModeGateEnabled())
        setAppState((On) => ({
          ...On,
          toolPermissionContext: transitionPlanAutoMode(On.toolPermissionContext),
        }));
      recordAllowedModelApplied();
      if (dt !== null) noticeRestrictedModel(he, dt);
    };
    if (!hasPreModelSwitchHook(e) && switchSerializerSlot.of(e).pending === 0) {
      Xt();
      return jd()
        ? Ta().then(() => ({
            ok: true,
          }))
        : undefined;
    }
    return serializeModelSwitch(e, () =>
      runPreModelSwitchHooks(e, pt, Q ? null : Gt, "sdk")
        .then(async (Dt) => {
          if (Dt.decision !== "proceed") {
            logFeatureSad("model_switch", "blocked_by_hook");
            return {
              ok: false,
              error: describeModelSwitchBlocked(Dt),
            };
          }
          for (let message of Dt.messages) qd(sanitizeHookText(message));
          Xt();
          await Ta();
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
  let applyEffortSeed = (O) => {
    let Q = seedBridgeEffortLevel(O, {
      getAppState: getState,
      setAppState,
      latch,
    });
    if (Q.ok) {
      reportEffortForModel(getMainLoopModel(), getState());
      na("state_change");
    }
    return Q;
  };
  x.homeSeed?.handle
    .then((O) =>
      O === null
        ? undefined
        : import("./chunk-twq47pff.js").then(({ formatHomeAppliedLine, formatHomeRestoreLine }) => {
            let ke = (rt) => {
              if (rt === null) return;
              if (rt.level === "debug") {
                logForDebugging(`[homeSeed] ${rt.text}`);
                return;
              }
              let systemMessage = createSystemMessage(rt.text, rt.level);
              Gs([systemMessage]);
              output.enqueue({
                ...systemMessage,
                session_id: getSessionId(),
              });
            };
            O.onApplied((rt) => ke(formatHomeAppliedLine(rt)));
            O.onRestore((rt) => ke(formatHomeRestoreLine(rt)));
          }),
    )
    .catch(() => {
      logForDiagnosticsNoPII("warn", "home_seed_line_wiring_failed", {});
    });
  let sdkClients = [];
  let os = [];
  let Ve = [];
  let ho = new PendingMcpToolsByServer();
  let $o = new Map();
  let Is = new Set();
  let rd = new Set();
  let Ti = false;
  let Su = 0;
  let sdkToolRelistPending = () => {
    if (Su > 0) return true;
    for (let O of Is)
      if (Object.hasOwn(R, O) && sdkClients.some((Q) => Q.name === O && Q.type === "connected")) return true;
    return false;
  };
  let hasFastMode = createElicitationRegistrar({
    structuredIO,
    session: e,
    storageV5: x.storageV5,
    credentials: x.credentials,
    limits: DISABLED_ELICITATION_LIMITS,
    withdrawOn: null,
    onRefused: null,
  });
  async function Ur(O) {
    logMCPDebug(O.name, "Received tools/list_changed notification, refreshing tools");
    let Q = await refreshMcpServerTools(O, () => {}, x.storageV5);
    if (Q.status === "kept-previous") {
      logMCPDebug(O.name, "tools/list failed after list_changed \u2014 keeping previous tool set");
      if (rd.delete(O.name)) {
        logFeatureSad("mcp_sdk_tools_refresh", "gave_up");
        return;
      }
      logFeatureSad("mcp_sdk_tools_refresh", "kept_previous");
      rd.add(O.name);
      Is.add(O.name);
      return;
    }
    rd.delete(O.name);
    logFeatureOk("mcp_sdk_tools_refresh");
    logEvent("tengu_mcp_list_changed", {
      mcpServerKeyHash: toolNameForTelemetry(O.name),
      type: lit("tools"),
      cause: refetchReasonTelemetry(undefined),
      newCount: Q.newTools.length,
    });
    return Q.newTools;
  }
  let rr = {
    getAppState: getState,
    setAppState,
    getDynamicMcpState: () => dynamicMcpState,
    setDynamicMcpState: (O) => {
      dynamicMcpState = O;
    },
  };
  function injectModelSwitchBreadcrumbs_2(modelArg, resolvedModel) {
    return applyMcpReconnect(rr, modelArg, resolvedModel);
  }
  let Bo = new Map();
  let _r = new Map();
  let Ol = async (O, Q, he) => {
    let mcpClientModule = getMcpClientModule();
    let attemptEpoch = identityEpoch();
    let dt = (pt) => ({
      ...pt,
      attemptEpoch,
    });
    let Gt = {};
    Bo.set(O, Gt);
    try {
      if (!isDiscoveryCacheUsable())
        return dt(await mcpClientModule.reconnectMcpServerImpl(O, Q, x.storageV5, x.credentials));
      return dt(
        await (he.distrust
          ? mcpClientModule.reconnectMcpServerDistrusted(O, Q, x.storageV5, x.credentials)
          : mcpClientModule.reconnectMcpServerImpl(O, Q, x.storageV5, x.credentials)),
      );
    } finally {
      if (Bo.get(O) === Gt) Bo.delete(O);
    }
  };
  let Ca = () => ({
    ...hostOwnedConfigs,
    ...dynamicMcpState.configs,
  });
  let Pa = (serverName) => {
    let Q =
      getState().mcp.clients.find((client) => client.name === serverName) ??
      dynamicMcpState.clients.find((client) => client.name === serverName);
    if (!Q && (getState().mcp.suppressedPluginMcpServers ?? []).includes(serverName)) return null;
    return resolveReconnectConfig(serverName, Ca(), Q?.config, getMcpConfigByName);
  };
  let Qd = (O, Q) => {
    if (Q.type === "sdk") return;
    let mcpClientModule = getMcpClientModule();
    let ke = Pa(O);
    let rt = !!ke && mcpClientModule.areMcpConfigsEqual(ke, Q);
    let dt = [];
    let Gt = (Dt) => {
      if (Dt.name !== O) return Dt;
      if (mcpClientModule.areMcpConfigsEqual(Dt.config, Q))
        return Dt.type === "disabled"
          ? {
              name: O,
              type: "pending",
              config: Q,
            }
          : Dt;
      if (!rt) return Dt;
      if (!dt.some((On) => mcpClientModule.areMcpConfigsEqual(On, Dt.config))) dt.push(Dt.config);
      return {
        name: O,
        type: "pending",
        config: Q,
      };
    };
    let any = dynamicMcpState.clients.some((client) => client.name === O);
    if (any)
      dynamicMcpState = {
        ...dynamicMcpState,
        clients: dynamicMcpState.clients.map(Gt),
      };
    let any_2 = getState().mcp.clients.some((client) => client.name === O);
    setAppState((Dt) => {
      if (Dt.mcp.clients.some((clients) => clients.name === O))
        return {
          ...Dt,
          mcp: {
            ...Dt.mcp,
            clients: Dt.mcp.clients.map(Gt),
          },
        };
      if (any || !rt) return Dt;
      return {
        ...Dt,
        mcp: {
          ...Dt.mcp,
          clients: [
            ...Dt.mcp.clients,
            {
              name: O,
              type: "pending",
              config: Q,
            },
          ],
        },
      };
    });
    if (!any_2 && !any && rt && Object.hasOwn(dynamicMcpState.configs, O))
      dynamicMcpState = {
        ...dynamicMcpState,
        clients: [
          ...dynamicMcpState.clients,
          {
            name: O,
            type: "pending",
            config: Q,
          },
        ],
      };
    for (let connection of dt) mcpClientModule.disposeServerConnectionDetached(O, connection);
  };
  let Kd = (modelArg, resolvedModel) => {
    let he = injectModelSwitchBreadcrumbs_2(modelArg, resolvedModel);
    if (
      he === "superseded" ||
      (he === "dropped" && identityChangedForRemote(resolvedModel.client.config, resolvedModel.attemptEpoch))
    )
      return resolvedModel.client.type === "failed" && resolvedModel.client.errorCode === "IDENTITY_CHANGED"
        ? resolvedModel.client
        : getMcpClientModule().inertReconnectShape(modelArg, resolvedModel.client.config).client;
    let ke =
      getState().mcp.clients.find((client) => client.name === modelArg) ??
      dynamicMcpState.clients.find((client) => client.name === modelArg);
    let rt =
      ke === resolvedModel.client ||
      (he === "applied" &&
        ke?.type === "connected" &&
        resolvedModel.client.type === "connected" &&
        ke.client === resolvedModel.client.client);
    if (ke !== undefined && rt) {
      if (ke.type === "connected") {
        hasFastMode([ke]);
        reregisterChannelHandlerAfterReconnect(ke, messageQueue);
      }
      return ke;
    }
    if (ke && (ke.type === "disabled" || ke.type === "failed")) return ke;
    if (!ke && resolvedModel.client.config.type === "sdk" && resolvedModel.client.type !== "connected")
      return resolvedModel.client;
    return {
      name: modelArg,
      type: "failed",
      config: resolvedModel.client.config,
      error: ke ? `Server status: ${ke.type}` : `Server not found: ${sanitizeTelemetryString(modelArg)}`,
    };
  };
  let Vd = async (request, extra) => {
    Qd(request, extra);
    let hookResponse = await Ol(request, extra, {
      distrust: false,
    });
    return Kd(request, hookResponse);
  };
  let mcpRetryOrchestrator = createMcpRetryOrchestrator({
    ...rr,
    storageV5: x.storageV5,
    credentials: x.credentials,
    isControlReconnectInFlight: (O) => Bo.has(O),
  });
  let rw = (O) => {
    if (isCliOwnedConfig(O.config)) return false;
    let Q = Pa(O.name);
    return (
      Q !== null &&
      getMcpClientModule().areMcpConfigsEqual(Q, O.config) &&
      !mcpDialBlockCause(O.name, O.config) &&
      !isMcpServerDisabled(O.name)
    );
  };
  let sw = () => !isSingleShotPrintSession() && !isPrintInputClosed() && !Bm;
  let nextTurnRedialer = createNextTurnRedialer({
    isOpen: sw,
    rows: () => rows(),
    allows: (O) => getState().mcp.clients.includes(O) && rw(O),
    redial: async (O) => {
      let Q = await mcpRetryOrchestrator.redialFailedRow(O, () => !sw() || !rw(O));
      if (Q === "connected" || Q === "degraded") {
        let found = rows().find((ke) => ke.name === O.name);
        if (found !== undefined) reregisterChannelHandlerAfterReconnect(found, messageQueue);
      }
      return Q;
    },
  });
  let cU = (modelArg, Q) => {
    let found = getState().mcp.clients.find((client) => client.name === modelArg);
    (async () => {
      let ke = identityEpoch();
      try {
        if (
          found?.type !== "needs-auth" ||
          serverCacheKey(modelArg, found.config) !== serverCacheKey(modelArg, Q)
        )
          return;
        if (isMcpServerDisabled(modelArg) || mcpDialBlockCause(modelArg, Q)) return;
        let mcpClientModule = getMcpClientModule();
        let dt = await mcpClientModule.connectToServer(modelArg, Q, undefined, x.storageV5, x.credentials);
        if (identityEpoch() !== ke) {
          if (dt.type === "connected") mcpClientModule.detachAndCloseConnection(dt).catch(() => {});
          return;
        }
        if (dt.type !== "connected") return;
        let Gt = !!dt.capabilities?.resources;
        let [pt, Xt, Dt, On] = await Promise.all([
          mcpClientModule.fetchToolsForClient(dt, x.storageV5),
          mcpClientModule.fetchCommandsForClient(dt),
          Promise.resolve([]),
          Gt ? mcpClientModule.fetchResourcesForClient(dt) : Promise.resolve([]),
        ]);
        if (identityEpoch() !== ke) {
          mcpClientModule.detachAndCloseConnection(dt).catch(() => {});
          return;
        }
        if ((await mcpClientModule.peekSettledConnection(modelArg, Q)) !== dt) return;
        let mcp = getState().mcp;
        if (mcp.clients.find((client) => client.name === modelArg) !== found) return;
        if (isShuttingDown() || Bm) return;
        let Rt = pickServerResultsAfterRetry(mcp, modelArg, {
          tools: pt,
          prompts: Xt,
          resources: On,
        });
        injectModelSwitchBreadcrumbs_2(
          modelArg,
          applyMcpServerConfig(found.config, {
            client: dt,
            tools: Rt.tools,
            commands: [...Rt.prompts, ...Dt],
            resources: Rt.resources,
            attemptEpoch: ke,
          }),
        );
      } catch (error) {
        logForDebugging(`Failed to adopt reauth-reconnected MCP server ${modelArg}: ${errorMessage(error)}`, {
          level: "warn",
        });
      }
    })();
  };
  function mU() {
    primeDiscoveryCacheFlag();
    let O = isDiscoveryCacheOn();
    if (!O && !x.mcpListingsHanded) return;
    getCliOwnedState().headlessMcpTeardown?.();
    setConnectedClientWiring((Gt) => {
      hasFastMode([Gt]);
      lg([Gt]);
    });
    let Q = mcpRetryOrchestrator.subscribe();
    let he = O ? REAUTH_RECONNECT_SIGNAL.subscribe(cU) : undefined;
    let ke = O
      ? setIdentityTrippedHandler(
          () =>
            void reconnectMcpOnIdentityChange({
              ...rr,
              storageV5: x.storageV5,
              credentials: x.credentials,
              getHostOwnedConfigs: Ca,
            }),
        )
      : undefined;
    if (O && takeIdentityTripUnowned())
      queueMicrotask(() => {
        if (getCliOwnedState().headlessMcpTeardown !== dt) return;
        reconnectMcpOnIdentityChange({
          ...rr,
          storageV5: x.storageV5,
          credentials: x.credentials,
          getHostOwnedConfigs: Ca,
          force: true,
        });
      });
    let rt;
    let dt = () => {
      rt?.();
      rt = undefined;
      Q();
      he?.();
      ke?.();
      setConnectedClientWiring(undefined);
      let cliOwnedState = getCliOwnedState();
      cliOwnedState.headlessConnectorMountInFlight = undefined;
      if (cliOwnedState.headlessMcpTeardown === dt) cliOwnedState.headlessMcpTeardown = null;
    };
    getCliOwnedState().headlessMcpTeardown = dt;
    rt = registerCleanup(async () => dt());
    mcpRetryOrchestrator.catchUp();
  }
  let dw = false;
  function fc() {
    primeDiscoveryCacheFlag();
    if (!isDiscoveryCacheOn()) return;
    if (!dw) {
      dw = true;
      getMcpClientModule().seedMcpIdentityCheck();
    }
  }
  let lw = new Set();
  let ag = new Map();
  let uw = (O) => {
    for (let Q of O.filter(isCommsRoledServer))
      ag.set(Q.name, {
        name: Q.name,
        type: "disabled",
        config: Q.config,
      });
  };
  let dg = (clients) => {
    for (let Q of clients) lw.add(Q.name);
    uw(clients);
  };
  let lg = watchMcpDisconnects({
    stores: rr,
    storageV5: x.storageV5,
  });
  let Bm = false;
  let reconnectBackoff = createReconnectBackoff({
    ...rr,
    storageV5: x.storageV5,
    credentials: x.credentials,
    isControlReconnectInFlight: (O) => Bo.has(O),
    isRunEnding: () => Bm,
    onReconnected: (O) => reregisterChannelHandlerAfterReconnect(O, messageQueue),
  });
  let clients_3 = getState().mcp.clients;
  if (clients_3.length > 0 || clients.length > 0) fc();
  mU();
  dg([...clients, ...clients_3]);
  hasFastMode(clients_3);
  lg(clients_3);
  reconnectBackoff(clients_3);
  L(() => {
    let clients = getState().mcp.clients;
    if (clients === clients_3) return;
    clients_3 = clients;
    dg(clients);
    if (clients.length > 0) fc();
    hasFastMode(clients);
    lg(clients);
    reconnectBackoff(clients);
  });
  let Ma = serializeCalls(async (O = "redial") => {
    for (let Rt of Ul()) Rt.reassertOwnership();
    for (let Rt of [...Is]) {
      if (!Object.hasOwn(R, Rt)) {
        Is.delete(Rt);
        continue;
      }
      let found = sdkClients.find((Ar) => Ar.name === Rt);
      if (found?.type !== "connected") continue;
      Is.delete(Rt);
      Su++;
      try {
        let Ar = await Ur(found);
        if (Ar !== undefined && sdkClients.includes(found)) {
          os = [...filterCommandsByServer(os, Rt), ...Ar];
          setAppState((no) => ({
            ...no,
            mcp: {
              ...no.mcp,
              tools: [...filterCommandsByServer(no.mcp.tools, Rt), ...Ar],
            },
          }));
        }
      } finally {
        Su--;
      }
    }
    for (let key of $o.keys())
      if (
        !Object.hasOwn(R, key) ||
        sdkClients.some((notification) => notification.name === key && notification.type === "connected")
      )
        $o.delete(key);
    let Q = mcpSyncNeeded(R, sdkClients);
    if (Q === "none" || (Q === "retry_failed" && O === "skip")) return;
    let he = new Map($o);
    $o.clear();
    let ke = new Set(Object.keys(R));
    let currentServerNames = new Set(sdkClients.map((Rt) => Rt.name));
    fc();
    for (let Rt of sdkClients)
      if (!ke.has(Rt.name)) {
        if (Rt.type === "connected") await Rt.cleanup();
      }
    let dt =
      Q === "retry_failed" &&
      isSdkMcpManifestsEnabled() &&
      qg.firstQueryAhead &&
      Ti &&
      hasFreshGrowthBookFeatures();
    if (!dt) Ti = hasFreshGrowthBookFeatures();
    let Gt = pickReusableMcpClients(R, sdkClients, dt);
    headlessProfilerCheckpoint("before_setupSdkMcp");
    noteSdkMcpDial(Object.keys(Gt).length);
    let pt = await getMcpClientModule().setupSdkMcpClients(
      Gt,
      (Rt, Zt) => structuredIO.sendMcpMessage(Rt, Zt),
      he,
      x.storageV5,
    );
    headlessProfilerCheckpoint("after_setupSdkMcp");
    for (let client of pt.clients) {
      if (client.type !== "connected" || !Is.delete(client.name)) continue;
      let Zt = await Ur(client);
      if (Zt !== undefined) pt.tools = [...filterCommandsByServer(pt.tools, client.name), ...Zt];
    }
    let Xt = mcpServersToReconnect(sdkClients, R, Gt, dt);
    for (let Rt of Xt) {
      let found = pt.clients.find((client) => client.name === Rt.name);
      if (found === undefined) continue;
      if (found.type === "connected") found.cleanup().catch(() => {});
      pt.clients = pt.clients.filter((client) => client !== found);
      pt.tools = filterCommandsByServer(pt.tools, Rt.name);
      pt.commands = excludeCommandsByServer(pt.commands, Rt.name);
    }
    if (dt) {
      let Rt = mergeMcpToolsAndCommands(
        sdkClients,
        R,
        Gt,
        {
          tools: os,
          commands: Ve,
        },
        pt,
      );
      pt.tools = Rt.tools;
      pt.commands = Rt.commands;
    }
    let connectedServerNames = new Set(Xt);
    ho.add(sdkClients.filter((Rt) => Rt.type === "connected" && !connectedServerNames.has(Rt)));
    sdkClients = [...pt.clients, ...Xt];
    os = pt.tools;
    Ve = pt.commands;
    for (let Rt of sdkClients) if (Rt.type === "connected") $o.delete(Rt.name);
    let On = uniq([...currentServerNames, ...ke]);
    let mapped = On.map((Rt) => [Rt, getMcpPrefix(Rt)]);
    setAppState((Rt) => ({
      ...Rt,
      mcp: {
        ...Rt.mcp,
        tools: [
          ...Rt.mcp.tools.filter((name) => !mapped.some(([Ar, no]) => isToolFromMcpServer(name, Ar, no))),
          ...os,
        ],
        commands: [
          ...Rt.mcp.commands.filter((name) => !On.some((Ar) => commandBelongsToServer(name, Ar))),
          ...pt.commands,
        ],
      },
    }));
    for (let Rt of Ul()) Rt.reassertOwnership();
    setupVscodeSdkMcp(sdkClients, {
      onFeedbackSurveyEvent: (Rt) => notifyVscodeHost(Rt, x.storageV5),
      refusalFallbackSettingToggleVisible: isRefusalFallbackActive(),
      refusalFallbackLaneEnabled: isRefusalFallbackEnabled(),
      startupAnnouncement: getNextAnnouncementJson(),
      autoDefaultLaunchEnabled: isHarborWillowEnabled(),
      ccrV2SessionCrudEnabled: isCcrV2SessionCrudEnabled(),
      maxEffortReminderEnabled: isMaxEffortReminderEnabled(),
      onAutoDefaultNudgeEvent: (serverName, message) =>
        handleAutoDefaultNudgeEventFromHost(serverName, message, x.storageV5),
      onAdminLimitRequest: fileAdminLimitRequest,
    });
    installCcdSessionTelemetryProxy(sdkClients);
  });
  Ma();
  let disableSdkServer = async (O) => {
    let Q = getOwn(R, O);
    let found = sdkClients.find((rt) => rt.name === O);
    if (Q === undefined || found?.type === "disabled") return;
    let ke = {
      name: O,
      type: "disabled",
      config: {
        ...Q,
        scope: "dynamic",
      },
    };
    sdkClients = [...sdkClients.filter((rt) => rt.name !== O), ke];
    os = filterCommandsByServer(os, O);
    Ve = excludeCommandsByServer(Ve, O);
    Is.delete(O);
    rd.delete(O);
    await Promise.all([ho.closeFor(O), found?.type === "connected" ? found.cleanup() : undefined]).catch(
      (error) => {
        logMCPDebug(O, `Failed to close SDK MCP server after mcp_toggle disabled it: ${error}`);
      },
    );
  };
  let enableSdkServer = async (O) => {
    let Q = getOwn(R, O);
    if (Q === undefined) return;
    let found = sdkClients.find((prev) => prev.name === O);
    if (found?.type === "connected") return found;
    if (found?.type === "disabled" || found?.type === "failed") {
      let ke = {
        name: O,
        type: "pending",
        config: {
          ...Q,
          scope: "dynamic",
        },
      };
      sdkClients = sdkClients.map((rt) => (rt === found ? ke : rt));
    }
    await Ma();
    return sdkClients.find((name) => name.name === O);
  };
  let dynamicMcpState = {
    clients: [],
    tools: [],
    configs: {},
  };
  let ta = Object.create(null);
  let ug = env.CLAUDE_CODE_REMOTE
    ? partitionOperatorServers(getState().mcp.clients, x.mcpConfigOwnership)
    : {
        hostOwnedConfigs: {},
        operatorOwnedMcpConfigNames: new Set(),
        operatorOwnedConfigs: {},
      };
  let { hostOwnedConfigs, operatorOwnedMcpConfigNames } = ug;
  let operatorToolPolicyConfigs =
    env.CLAUDE_CODE_REMOTE && getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_startup_policy_seed", true)
      ? ug.operatorOwnedConfigs
      : {};
  if (env.CLAUDE_CODE_REMOTE)
    logForDebugging(
      `[MCP] mcp_set_servers authority: provenance ${x.mcpConfigOwnership === undefined ? "undeclared (all --mcp-config servers host-owned)" : "declared"}; host-owned=[${Object.keys(hostOwnedConfigs).join(", ")}] operator-owned=[${[...operatorOwnedMcpConfigNames].join(", ")}]`,
    );
  setMcpClientsAccessor(() => [...getState().mcp.clients, ...sdkClients, ...dynamicMcpState.clients]);
  setMcpServerToolsSwapper(makeCommitReconnect(rr));
  let od = Array.isArray(s) ? s : [];
  let Hm = false;
  let xl = Array.isArray(s)
    ? null
    : (async () => {
        let startTime = performance.now();
        let Q = await s.catch((error) => {
          logError(error);
          return [];
        });
        if (!Hm) od = Q;
        recordPhase("commands_deferred_join_ms", performance.now() - startTime, startTime);
      })();
  function Ho(O = getState().mcp.commands) {
    return commandNamesForBridge(od, O, memorySkillCommands());
  }
  function cg(commands = getState().mcp.commands) {
    return Ho(commands).filter(isAdvertisedCommand);
  }
  let agents = q;
  let buildAllTools = (appState) => {
    let filtered = agents.filter((he) => he.source === "flagSettings");
    agents = withLiveRegisteredAgents([...appState, ...filtered]);
    Wl();
  };
  let pluginFlagTracker = createPluginFlagTracker();
  let pw = (at) => {
    let Q = getFlagSettingsInline() ?? {};
    let he = pluginFlagTracker.retract(Q);
    if (he === null) return;
    setFlagSettingsInline(he);
    settingsChangeDetector.notifyChange("flagSettings");
    logForDiagnosticsNoPII("info", "plugin_forwarding_retracted", {
      at,
      keys: Object.keys(Q).length - Object.keys(he).length,
    });
  };
  let preAgentSystemPrompt;
  let pc;
  let gc;
  let vu;
  let bu;
  async function Sw() {
    try {
      zr?.undo().catch(logError);
    } catch (error) {
      logError(error);
    }
    if (!vn) return;
    let O = vn;
    structuredIO.setOnControlRequestSent(undefined);
    structuredIO.setOnControlRequestResolved(undefined);
    setSdkHostedBridgeHandle(null, x.storageV5);
    setCurrentForKey(e, undefined);
    registerLiveSuppressionProbe(undefined);
    vn = null;
    ts = false;
    vu = undefined;
    bu = undefined;
    setReplBridgeActive(false);
    Ms = undefined;
    bridgeSdkController.release(O, {
      keepRecord: O.neverArchive === true,
    });
    await O.teardown({
      reason: "remote_control_disabled",
    });
  }
  function kw(O, detail, bridgeEpoch, ke) {
    output.enqueue({
      type: "system",
      subtype: "bridge_state",
      state: O,
      detail,
      ...(O === "failed" && {
        failure_kind: ke ?? "terminal",
      }),
      bridge_epoch: bridgeEpoch,
      uuid: randomUUID(),
      session_id: getSessionId(),
    });
  }
  let ww = false;
  function vw() {
    let O = vn;
    if (!O || ww) return;
    if (connectedBridgePolicyRefusal(O.outboundOnly) === null) return;
    resolved_2 = Vi(async () => {
      let ke = vn === O ? connectedBridgePolicyRefusal(O.outboundOnly) : null;
      if (ke === null) return;
      let bridgeEpoch_2 = bridgeEpoch;
      try {
        await Sw();
      } finally {
        kw("policy_disabled", ke.detail, bridgeEpoch_2);
        try {
          logForDebugging(
            `[bridge:sdk] Org policy now refuses the attached bridge (${ke.policy}: ${ke.kind}); disconnected`,
          );
          logEvent("tengu_bridge_policy_teardown", {
            lane: lit("sdk_host"),
            policy: fromEnum(ke.policy),
            deny_kind: fromEnum(ke.kind),
            outbound_only: O.outboundOnly,
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
  function Tw() {
    let mainLoopModel = getMainLoopModel();
    let Q = getState();
    return [
      mainLoopModel,
      toExternalPermissionMode(Q.toolPermissionContext.mode),
      getFastModeState(mainLoopModel, Q.fastMode),
      getFastModeUnavailableReasonCode(mainLoopModel) ??
        getFastRejectedReason(mainLoopModel, Q.fastMode) ??
        "",
      resolveEffortLevelOrNull(mainLoopModel, resolveEffortLevel(Q)) ?? "",
      viewTeammateOutput(),
      queuedNotificationCapabilities(Gd(Q), e, () => messagesSinceCompactBoundary(messages_2)).join(","),
      bridgeAdvertisedCommands(cg(Q.mcp.commands)).map((tool) => tool.name).join(`
`),
    ].join("\x00");
  }
  function na(O, Q) {
    (async () => {
      try {
        if (!vn || !isSdkBridgeStateAnnounceEnabled()) return;
        if (!Q?.force && Tw() === vu) {
          bu = getMainLoopModelOverride();
          return;
        }
        let he = vn;
        let slashCommandToolSkills = await getSlashCommandToolSkills(getCwd(), x.storageV5);
        if (vn !== he) return;
        let initJsonSchema = Tw();
        if (!Q?.force && initJsonSchema === vu) {
          bu = getMainLoopModelOverride();
          return;
        }
        let dt = getState();
        he.writeSdkMessages([
          buildBridgeContextSnapshot({
            session: e,
            tools: Gd(dt),
            model: getMainLoopModel(),
            permissionMode: dt.toolPermissionContext.mode,
            commands: cg(dt.mcp.commands),
            agents: getActiveAgentsFromList(agents),
            loadedSkills: slashCommandToolSkills.filter(isAdvertisedCommand),
            mcpCommands: dt.mcp.commands,
            fastMode: dt.fastMode,
            effortValue: resolveEffortLevel(dt),
            messagesInView: () => messagesSinceCompactBoundary(messages_2),
          }),
        ]);
        vu = initJsonSchema;
        bu = getMainLoopModelOverride();
        logForDebugging(`[bridge:sdk] system/init announced (${O})`);
        logFeatureOk("bridge_sdk_state_announce", {
          trigger: fromEnum(O),
        });
      } catch (error) {
        logForDebugging(`[bridge:sdk] system/init announce failed (${O}): ${toError(error).message}`, {
          level: "error",
        });
        logFeatureBad("bridge_sdk_state_announce", "emit_failed", {
          trigger: fromEnum(O),
        });
      }
    })();
  }
  let hc = {
    mode: getState().toolPermissionContext.mode,
    modelForSession: getState().mainLoopModelForSession,
    fastMode: getState().fastMode,
    effort: resolveEffortLevel(getState()),
  };
  L(() => {
    let O = getState();
    let Q =
      O.toolPermissionContext.mode === hc.mode &&
      O.mainLoopModelForSession === hc.modelForSession &&
      O.fastMode === hc.fastMode &&
      resolveEffortLevel(O) === hc.effort;
    if (!Q)
      hc = {
        mode: O.toolPermissionContext.mode,
        modelForSession: O.mainLoopModelForSession,
        fastMode: O.fastMode,
        effort: resolveEffortLevel(O),
      };
    if (!vn) return;
    if (Q && (vu === undefined || getMainLoopModelOverride() === bu)) return;
    na("state_change");
  });
  let syntheticOutputResult = onOrgFastModeChange(() => na("state_change"));
  let _U = onFastRejectedFallbackModelsChanged(() => na("state_change"));
  let yU = subscribeFocusMode(() => na("state_change"));
  let Wm = false;
  let bridgeHandle = null;
  let Gd = (O) => {
    let mainThreadAgentType = getMainThreadAgentType();
    let jsonSchema = getInitJsonSchema();
    let ke = toolState.get(BridgeToolProvider).tools();
    let rt = [
      O.toolPermissionContext,
      O.mcp.tools,
      ke,
      O.mcp.clients,
      O.slackTagConnected,
      os,
      sdkClients,
      dynamicMcpState.tools,
      dynamicMcpState.clients,
      ag.size,
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
    ];
    let dt = bridgeHandle;
    if (
      dt !== null &&
      Date.now() - dt.computedAt < TOOL_POOL_MEMO_TTL_MS &&
      rt.every((Zt, Ar) => Zt === dt.keys[Ar])
    ) {
      pc = dt.allowedAgentTypes;
      gc = dt.primitiveToolGrant;
      return dt.result;
    }
    let activeAgentsFromList = getActiveAgentsFromList(agents);
    let assembled = assembleToolPool(O.toolPermissionContext, O.mcp.tools, {
      activeAgents: activeAgentsFromList,
    });
    let Xt = filterToolsByDenyRules(dynamicMcpState.tools, O.toolPermissionContext);
    let Dt = filterToolsByDenyRules(ke, O.toolPermissionContext);
    dg([...O.mcp.clients, ...dynamicMcpState.clients]);
    uw(sdkClients);
    let On = !isLovelyUmbrellaOn();
    let newMessages = withoutStaticMcpShadows(
      h,
      isDiscoveryCacheOn() || x.mcpListingsHanded
        ? [...lw]
        : [
            ...O.mcp.clients.map((client) => client.name),
            ...dynamicMcpState.clients.map((client) => client.name),
          ],
    ).filter((Zt) => isMcpTool(Zt) || !On || Zt.isEnabled());
    let Rt = uniqBy(
      mergeAndFilterTools(
        [...Dt, ...newMessages, ...os, ...Xt],
        assembled,
        O.toolPermissionContext.mode,
        [...ke, ...newMessages, ...os, ...dynamicMcpState.tools, ...O.mcp.tools],
        createAccountMemoryToolGate(() =>
          mergeClientsWithCommsServers(sdkClients, O.mcp.clients, dynamicMcpState.clients, [...ag.values()]),
        ),
      ),
      (Zt) => Zt.name,
    );
    pc = undefined;
    gc = undefined;
    if (mainThreadAgentType) {
      let agentExcludingWebFetch = findAgentExcludingWebFetch(activeAgentsFromList, mainThreadAgentType);
      if (agentExcludingWebFetch) {
        let agentTools = resolveAgentTools(
          agentExcludingWebFetch,
          withWebFetchToolForAgent(agentExcludingWebFetch, Rt, O.toolPermissionContext, {
            activeAgents: activeAgentsFromList,
          }),
          false,
          true,
        );
        Rt = agentTools.resolvedTools;
        pc = agentTools.allowedAgentTypes;
        gc = resolveAgentToolNames(agentExcludingWebFetch);
      }
    }
    if (x.permissionPromptToolName) Rt = Rt.filter((Zt) => !toolMatchesName(Zt, x.permissionPromptToolName));
    if (jsonSchema && !x.jsonSchema) {
      let syntheticOutputTool = createSyntheticOutputTool(jsonSchema);
      if ("tool" in syntheticOutputTool) {
        if (syntheticOutputTool.unsatisfiable && !Wm) {
          Wm = true;
          logForDebugging(
            `Init JSON schema: ${checkSchemaSatisfiable(syntheticOutputTool.unsatisfiable)}: ${syntheticOutputTool.unsatisfiable.message}`,
            {
              level: "warn",
            },
          );
        }
        Rt = [...Rt, syntheticOutputTool.tool];
      } else if (!Wm) {
        Wm = true;
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
    Rt = stripSoleNonDeniableTool(Rt, O.toolPermissionContext);
    bridgeHandle = {
      keys: rt,
      computedAt: Date.now(),
      result: Rt,
      allowedAgentTypes: pc,
      primitiveToolGrant: gc,
    };
    return Rt;
  };
  let CLAUDE_CODE_SYSTEM_PROMPT_GB_FEATURE = env.CLAUDE_CODE_REMOTE
    ? env.CLAUDE_CODE_SYSTEM_PROMPT_GB_FEATURE
    : undefined;
  let hg = () => {
    if (!CLAUDE_CODE_SYSTEM_PROMPT_GB_FEATURE) return x.systemPrompt;
    let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
      CLAUDE_CODE_SYSTEM_PROMPT_GB_FEATURE,
      "",
    );
    return typeof featureValue_CACHED_MAY_BE_STALE === "string" && featureValue_CACHED_MAY_BE_STALE.length > 0
      ? featureValue_CACHED_MAY_BE_STALE
      : x.systemPrompt;
  };
  let Ri = () => Gd(getState());
  setProjectsThreadStateSource({
    messages: () => messages_2,
    isProjectsSession: () => hasRelaySourceForClients(),
    isThread: () => hasUpdateStatusToolOnly(Ri()),
    isOverview: () => hasStartThreadToolOnly(Ri()),
    answerToolName: () => resolveHearthToolNames(Ri()).reply,
    ownerRowsWrittenAt: latestHumanRelayAt,
  });
  let rows = () => mergeClients(getState().mcp.clients, sdkClients, dynamicMcpState.clients);
  let _c = () => ({
    session: e,
    refreshTools: Ri,
    refreshMcpClients: rows,
    verbose: x.verbose,
    maxTurns: x.maxTurns,
    maxBudgetUsd: x.maxBudgetUsd,
    taskBudget: x.taskBudget,
    canUseTool,
    fallbackModel: x.fallbackModel,
    sessionEnvVars,
    toolState,
    sessionHooks: ps,
    isolationLatch,
    pendingNestedMemoryTriggers: ba,
    memorySelector,
    storageV5: x.storageV5,
    credentials: x.credentials,
    messageQueue,
    getAppState: getState,
    setAppState,
    replayUserMessages: x.replayUserMessages,
    includePartialMessages: x.includePartialMessages,
    ...false,
    replayAcksAtRequestDispatch: structuredIO instanceof RemoteIO,
    trackFirstFrameUpload:
      structuredIO instanceof RemoteIO ? (O) => structuredIO.trackFirstFrameUpload(O) : undefined,
    trackFirstTextFrameUpload:
      structuredIO instanceof RemoteIO ? (O) => structuredIO.trackFirstTextFrameUpload(O) : undefined,
    markOfRepliesShownAsStored:
      structuredIO instanceof RemoteIO ? () => structuredIO.markOfRepliesShownAsStored() : undefined,
    onCommandLifecycle: structuredIO.onCommandLifecycle,
    sessionState: structuredIO.sessionState,
    requestDialog: getHasStreamingInput()
      ? createSdkUserDialogHandler(structuredIO, messageQueue)
      : undefined,
    setSDKStatus: (status, extra) => {
      let systemStatusMessage = buildSystemStatusMessage(status, extra);
      ns(systemStatusMessage);
      output.enqueue(systemStatusMessage);
    },
  });
  let zd = stagedFilesWaiterByRoot.of(e);
  zd.onFilesNotPlaced = noteStagedFilesNotPlaced;
  zd.onFilesStillCopying = noteStagedFilesStillCopying;
  let yc = (O) => ({
    ...O,
    commands: () => Ho(),
    cwd: () => resolveSessionCwd(e),
    tools: Ri,
    mcpClients: rows,
    answers: applyPermissionAnswerChanges,
    appendSystemPrompt: () => x.appendSystemPrompt,
    appendSystemPromptHead: x.appendSystemPromptHead,
    liveAppendSections: AUTO_MEM_DIRNAME_2(x.appendSystemPromptHead),
    planModeInstructions: () => x.planModeInstructions,
    systemPromptSnapshot: () => x.systemPromptSnapshot,
    appendSubagentSystemPrompt: () => x.appendSubagentSystemPrompt,
    toolAliases: () => x.toolAliases,
    excludeDynamicSections: () => x.excludeDynamicSections,
    forwardSubagentText: () => x.forwardSubagentText,
    thinkingConfig: () => hasEffort.current(),
    jsonSchema: () => getInitJsonSchema() ?? x.jsonSchema,
    initialMessages: messages_2,
    loadShowsCutOffCalls: isInterruptedTail(turnInterruptionState),
    conversation: rs,
    readFileCache: readFilesFromMessages,
    customSystemPrompt: hg,
    takeSystemPromptDelivered: () => {
      let Q = td;
      td = false;
      return Q;
    },
    agents: () => getActiveAgentsFromList(agents),
    allowedAgentTypes: () => pc,
    primitiveToolGrant: () => gc,
    handoffRelay: lazyHandoffMarkerRelay && x.usesRelayMarker ? lazyHandoffMarkerRelay : undefined,
    awaitStagedFiles: x.turnHandoffAdmission?.admitted ? createStagedFilesWaiter(zd) : undefined,
    beforeTurnInput: () => {
      zd.forgetWaits();
      zd.tellOfFailedStagesNow();
      flushWaitingSessionStartRows(Rc);
      if (diskBehindReminder !== undefined && !isToolResultForToolUse(messages_2)) {
        Gs([diskBehindReminder]);
        diskBehindReminder = undefined;
        logFeatureOk("ccr_disk_behind_reminder");
      }
    },
    onTurnBeganBeforeInit: () =>
      notifyTurnBeganBeforeInit({
        sessionState: structuredIO.sessionState,
        markStartupPhase: x.markStartupPhase,
      }),
    placeFilesByName:
      x.turnHandoffAdmission?.admitted && isClaudeAiChatOrigin() ? placeFilesByNameForTurn : undefined,
    placeCarriedWrites:
      x.turnHandoffAdmission?.admitted && isClaudeAiChatOrigin() ? placeCarriedWritesAtTurnStart : undefined,
    beginTranscriptFlush: () => {
      let storeConfirmTimer = makeStoreConfirmTimer(() => structuredIO.watchInternalEventPosts());
      return async (he, ke) => {
        let startTime = performance.now();
        let dt = AbortSignal.any([he, abortController.signal]);
        let timer = setTimeout(
          () =>
            logForDebugging("turn_handoff: the session store has not confirmed the carried lines after 15s", {
              level: "warn",
            }),
          15000,
        );
        timer.unref();
        try {
          if (
            !(await Promise.race([
              structuredIO.flushInternalEvents().then(() => true),
              new Promise((resolve) => {
                if (dt.aborted) resolve(false);
                else
                  dt.addEventListener("abort", () => resolve(false), {
                    once: true,
                  });
              }),
            ]))
          )
            return false;
          return structuredIO.refusedInternalEvents(ke).length > 0 ? "refused" : true;
        } finally {
          clearTimeout(timer);
          storeConfirmTimer(startTime);
        }
      };
    },
  });
  let inlineMcpTiming = createInlineMcpTiming();
  let mcpChangesPromise = Promise.resolve({
    response: {
      added: [],
      removed: [],
      errors: {},
    },
    sdkServersChanged: false,
  });
  let _g = {
    stores: rr,
    getOwnedConfigs: () => hostOwnedConfigs,
    setOwnedConfigs: (O) => {
      hostOwnedConfigs = O;
    },
    sdkState: () => ({
      configs: R,
      clients: sdkClients,
      tools: os,
      commands: Ve,
    }),
    storageV5: x.storageV5,
    credentials: x.credentials,
    enqueueSettleMerge: (O) => {
      let Q = (he) => {
        O();
        return he;
      };
      mcpChangesPromise = mcpChangesPromise.then(Q, Q);
    },
    redactsPersistedLane: () => isTransportBacked(e),
    wantsDial: () => true,
    operatorOwnedMcpConfigNames,
    operatorToolPolicyConfigs,
    closeReplacedSdkClients: (servers) => ho.closeFor(servers),
  };
  let Sc = null;
  let Sg = null;
  function Ul() {
    let O = [];
    if (Sc) O.push(Sc);
    let Q = zr?.projectsReplyMount();
    if (Q) O.push(Q);
    return O;
  }
  function Ew(
    O,
    { authoritative, caller, deferConnect = false, pluginDiffScope = "configured", dialOptions },
  ) {
    let doWork = async () => {
      let Xt = O;
      let Dt =
        pluginDiffScope === "account_plugins"
          ? nonBuiltinMarketplaceServers(dynamicMcpState.configs)
          : emptyServerMap();
      let oldSdkClientNames = new Map([
        ...Object.entries(Dt),
        ...(authoritative ? [] : Object.entries(hostOwnedConfigs)),
      ]);
      if (oldSdkClientNames.size > 0) {
        let no = Object.create(null);
        let pd = [];
        for (let [Da, Rs] of oldSdkClientNames) {
          let Ua = getOwn(O, Da);
          let gd = Object.hasOwn(hostOwnedConfigs, Da);
          let j = Ua;
          let vo =
            j?.scope !== undefined &&
            MCP_SETTINGS_SCOPE_SET.has(j.scope) &&
            !isManagedConfigScope(j.scope) &&
            j.pluginSource === undefined;
          let uo =
            Ua?.type === "sdk"
              ? Object.hasOwn(Dt, Da) && !gd
              : gd && Rs.type !== "sdk" && !Object.hasOwn(R, Da) && vo;
          if (Ua !== undefined && !uo) continue;
          let { scope, ...ql } = Rs;
          if (supportsEnvExpansion(ql)) {
            no[Da] = copyCcrMarks(Rs, ql);
            if (Ua !== undefined && gd) pd.push(Da);
          }
        }
        if (pd.length > 0)
          logForDebugging(
            `[MCP] ${caller}: host-set server(s) kept over a settings server of the same name: ${pd.join(", ")}`,
          );
        Xt = {
          ...O,
          ...no,
        };
      }
      if (Object.keys(ta).length > 0)
        Xt = {
          ...ta,
          ...Xt,
        };
      if (Object.keys(Xt).length > 0 || dynamicMcpState.clients.length > 0 || sdkClients.length > 0) fc();
      for (let no of Ul()) no.suspendAllowsForApply(Xt);
      serverCapabilityCache.peek(e)?.narrowTo?.(Xt);
      let fn = sdkClients;
      let Rt = await applyDynamicMcpServers(
        _g,
        {
          payload: O,
          desired: Xt,
        },
        {
          authoritative,
          caller,
          deferConnect,
          dialOptions,
        },
      );
      let Zt = new Set(sdkClients.map((no) => no.name));
      let Ar = applySdkMcpServerChanges(
        {
          configs: R,
          clients: sdkClients,
          tools: os,
          commands: Ve,
        },
        fn,
        Rt,
      );
      if (Ar.state.configs !== R) {
        for (let key of Object.keys(R)) if (!Object.hasOwn(Ar.state.configs, key)) delete R[key];
        Object.assign(R, Ar.state.configs);
      }
      sdkClients = Ar.state.clients;
      os = Ar.state.tools;
      Ve = Ar.state.commands;
      if (Rt.sdkServersChanged) {
        let newSdkClientNames = new Set(sdkClients.map((Rs) => Rs.name));
        let allSdkNames = uniq([...Zt, ...newSdkClientNames]);
        let mapped = allSdkNames.map((prev) => [prev, getMcpPrefix(prev)]);
        setAppState((Rs) => ({
          ...Rs,
          mcp: {
            ...Rs.mcp,
            tools: [
              ...Rs.mcp.tools.filter((name) => !mapped.some(([gd, j]) => isToolFromMcpServer(name, gd, j))),
              ...os,
            ],
            commands: [
              ...Rs.mcp.commands.filter(
                (command) => !allSdkNames.some((sdkName) => commandBelongsToServer(command, sdkName)),
              ),
              ...Ve,
            ],
          },
        }));
      }
      for (let no of Ar.clientsToCleanUp) await no.cleanup();
      for (let no of Rt.sdkServersRemoved) await ho.closeFor(no);
      return {
        response: Rt.response,
        sdkServersChanged: Rt.sdkServersChanged,
      };
    };
    let pt = async () => {
      try {
        return await doWork();
      } finally {
        for (let Xt of Ul()) Xt.reassertAfterApply();
      }
    };
    mcpChangesPromise = mcpChangesPromise.then(pt, pt);
    return mcpChangesPromise;
  }
  function kg(O, Q, he) {
    let ke = async () => {
      if (Q !== undefined) fc();
      for (let rt of Ul())
        rt.suspendAllowsForApply({
          [O]: Q,
        });
      serverCapabilityCache.peek(e)?.narrowTo?.(
        Q === undefined
          ? {}
          : {
              [O]: Q,
            },
        [O],
      );
      try {
        return {
          response: await reconcileMcpServers(
            O,
            Q,
            he,
            rr,
            setAppState,
            getState,
            _g.redactsPersistedLane(),
            x.storageV5,
            x.credentials,
            _g.getOwnedConfigs,
          ),
          sdkServersChanged: false,
        };
      } finally {
        for (let rt of Ul()) rt.reassertAfterApply();
      }
    };
    mcpChangesPromise = mcpChangesPromise.then(ke, ke);
    return mcpChangesPromise.then(
      ({ response }) => response,
      (error) => {
        logError(error);
        return;
      },
    );
  }
  let wg = () => ({
    messages: messages_2,
    tools: Gd(getState()),
    agentDefinitions: {
      activeAgents: getActiveAgentsFromList(agents),
      allAgents: agents,
    },
    customSystemPrompt: hg(),
    appendSystemPrompt: x.appendSystemPrompt,
    systemPromptSnapshot: x.systemPromptSnapshot,
    excludeDynamicSections: x.excludeDynamicSections,
    mcpClients: rows(),
  });
  let vg = async (O) => {
    let { messages, ...he } = wg();
    return collectContextData({
      session: e,
      messages,
      getAppState: getState,
      getMcp: () => getState().mcp,
      storageV5: x.storageV5,
      credentials: x.credentials,
      options: {
        mainLoopModel: getMainLoopModel(),
        ...he,
      },
      detail: O?.detail,
      terminalWidth: O?.terminalWidth,
    });
  };
  let Iw = {
    surface: null,
    model: () => getMainLoopModel(),
    messages: () => messages_2,
    conversation: (O) =>
      O === undefined
        ? {
            ...rs,
            keepArrived: (Q) => (jo?.getMessages() === messages_2 ? jo.keepArrivedRows(Q) : rs.keep(Q)),
          }
        : runningTurnRegistry.of(O),
    tools: Ri,
    commands: () => Ho(),
    mcpServers: () => rows().map((O) => O.name),
    toolContext: (abortController) =>
      ask(yc(_c()), {
        abortController,
        userSpecifiedModel,
      }),
    savedAgentMessages: (O) => waitForAgentTranscriptFlush(O, x.storageV5),
    requestMessages: (O) => normalizeAgentMessagesForApi(O, Ri()),
    contextData: vg,
    canUseTool,
    composer: createRemotePromptBox(REMOTE_EDIT_QUEUE),
    selection: createRemoteSelectionReader(),
    notify: async (O, hookOrigin) => {
      await executeNotificationHooks(e, O, {
        storageV5: x.storageV5,
        credentials: x.credentials,
        hookOrigin,
      });
      return "no_surface";
    },
    toast: (O, Q, he) => {
      if (
        Vg({
          type: "system",
          subtype: "ui_toast",
          plugin: O,
          text: Q,
          timeout_ms: he ?? TOAST_DEFAULT_MS,
        })
      )
        return;
      logForDebugging(`$.ui.toast (${O}): no notification bar in a headless session; kept here: ${Q}`);
    },
    status: (O, Q) => {
      if (
        Vg({
          type: "system",
          subtype: "ui_status",
          plugin: O,
          text: Q ?? null,
        })
      )
        return;
      logForDebugging(
        `$.ui.status (${O}): no status row in a headless session; kept here: ${Q ?? "(cleared)"}`,
      );
    },
    addMcpServer: (O, Q) => {
      let { scope, ...ke } = Q;
      if (!supportsEnvExpansion(ke) || ke.type === "sdk") {
        logForDebugging(
          `$.tool.register: server ${jsonStringify(O)} has a config this session cannot connect (${String(ke.type)}); not added`,
          {
            level: "warn",
          },
        );
        return Promise.resolve();
      }
      ta = withKeyReplaced(O, ta, ke);
      return kg(O, ke, "tool_register").then(() => {});
    },
    removeMcpServer: (O) => {
      if (!Object.hasOwn(ta, O)) return Promise.resolve();
      ta = withKeyReplaced(O, ta, undefined);
      return kg(O, undefined, "tool_register").then(() => {});
    },
    resolveMcpServer: async (O) =>
      resolveConnectorTwin(
        await explainPluginServer({
          ...O,
          storageV5: x.storageV5,
          credentials: x.credentials,
          dynamicServers: toScopedConfig(rows(), ta),
        }),
        rows(),
        getState().mcp.suppressedPluginMcpServers ?? [],
      ),
    settledMcpServer: (O) => subscribeRows(rows, O),
    connectMcpServer: (O, Q) =>
      waitForMcpServerStatus(
        {
          rows,
          apply: (he, ke) => {
            ta = withKeyReplaced(he, ta, ke);
            return kg(he, ke, "plugin_connect");
          },
          isAdded: (he) => Object.hasOwn(ta, he),
          isParked: isParkedSpare,
        },
        O,
        Q,
      ),
    refreshCommands: () => mf(),
    refreshAgents: () => Yg(),
    refreshContext: () => invalidateUserContext(e, "hooks_invalidate"),
    compact: () =>
      Promise.reject(
        Error(
          "not available in a headless (-p / SDK) session yet: compaction here runs inside a turn (a /compact prompt); catch it and carry on",
        ),
      ),
  };
  bindSurface(Iw);
  registerTurnParamsHook(registerPostSamplingHook);
  let kU =
    x.outputFormat === "stream-json" &&
    (!structuredIO.isRemoteTransport() ||
      isPersistenceTrusted({
        redactsWhatItPersists: isTransportBacked(e),
        isRemoteTransport: true,
      }))
      ? withCurrentRequester({
          reach: () =>
            structuredIO.isRemoteTransport() ? (structuredIO.takesUiHostAsks() ? "each" : "none") : "first",
          copy: async (O) =>
            (
              await structuredIO.sendUiHostRequest(
                {
                  subtype: "ui_copy",
                  surface: O.surface,
                  client_id: O.clientId,
                  plugin: O.plugin,
                  text: O.text,
                },
                UiCopyResponseSchema(),
                UI_HOST_REQUEST_TIMEOUT_MS,
              )
            )?.copied,
          readPrompt: (O) =>
            structuredIO.sendUiHostRequest(
              {
                subtype: "ui_prompt_read",
                surface: O.surface,
                client_id: O.clientId,
              },
              UiPromptReadResponseSchema(),
              UI_HOST_REQUEST_TIMEOUT_MS,
            ),
          fillPrompt: async (O) =>
            (
              await structuredIO.sendUiHostRequest(
                {
                  subtype: "ui_prompt_fill",
                  surface: O.surface,
                  client_id: O.clientId,
                  text: O.text,
                  mode: O.mode,
                  ...(O.decorations !== undefined &&
                    O.decorations.length > 0 && {
                      decorations: [...O.decorations],
                    }),
                  ...(O.cursor !== undefined && {
                    cursor: O.cursor,
                  }),
                  ...(O.answersPress !== undefined && {
                    answers_press: O.answersPress,
                  }),
                },
                UiPromptFillResponseSchema(),
                UI_HOST_REQUEST_TIMEOUT_MS,
              )
            )?.filled,
          paintPrompt: async (O) =>
            (
              await structuredIO.sendUiHostRequest(
                {
                  subtype: "ui_prompt_paint",
                  surface: O.surface,
                  client_id: O.clientId,
                  layer: O.layer,
                  ...(O.text !== undefined && {
                    text: O.text,
                  }),
                  ...(O.decorations !== undefined &&
                    O.decorations.length > 0 && {
                      decorations: [...O.decorations],
                    }),
                },
                UiPromptPaintResponseSchema(),
                UI_HOST_REQUEST_TIMEOUT_MS,
              )
            )?.painted,
          suggestPrompt: async (O) =>
            (
              await structuredIO.sendUiHostRequest(
                {
                  subtype: "ui_prompt_suggest",
                  surface: O.surface,
                  client_id: O.clientId,
                  text: O.text,
                },
                UiPromptSuggestResponseSchema(),
                UI_HOST_REQUEST_TIMEOUT_MS,
              )
            )?.shown,
          readSelection: async (O) => {
            if (!(!structuredIO.isRemoteTransport() && !isTransportBacked(e)))
              return causeOnlyResult("not_asked");
            let he = await structuredIO.sendUiHostAsk(
              {
                subtype: "ui_read_selection",
                surface: O.surface,
                client_id: O.clientId,
              },
              UiReadSelectionResponseSchema(),
              UI_HOST_REQUEST_TIMEOUT_MS,
            );
            return he.cause === undefined
              ? selectionResult(he.answer.text, he.answer.instance_id)
              : causeOnlyResult(he.cause);
          },
        })
      : () => {};
  let sessionHooks = startSessionHooks({
    loaded: getPluginRegistry().hookRegistrationInFlight ?? getPluginRegistry().hooksLoadAtStartup,
    surface: null,
    isInteractive: false,
  });
  let vc = initialWriteAttempt(false);
  let resolved_4 = Promise.resolve();
  let Tg = {
    titles: vc,
    storageV5: x.storageV5,
    credentials: x.credentials,
    redactsPersistedLane: () => isTransportBacked(e),
    applyRenamedSessionName: (O) => {
      if (isTeammate()) return;
      resolved_4 = resolved_4
        .then(async () => {
          await saveSessionAgentName(
            O,
            "user",
            x.storageV5,
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
    pushHostRenameToBridge: (O, Q) => {
      pushBridgeSessionTitle(O, Q, getSdkHostedBridgeHandle, true, x.credentials);
    },
    dispatchCommands: () => Ho(),
    conversation: () => messages_2,
    turnAbortSignal: () => nh.turnAbortSignal(),
  };
  let currentAppState = emitSessionTitleChanges();
  let exiting = () =>
    ze.endSessionRequested || isShuttingDown() || isTerminalShutdown() || hasReachedBudget(x.maxBudgetUsd);
  let contextForResume = async () => {
    if (!getLastCacheSafeParams()) await ef();
    let toolUseContext = getLastCacheSafeParams()?.toolUseContext;
    return toolUseContext
      ? contextAfterTurn(toolUseContext)
      : ask(yc(_c()), {
          abortController: createAbortController(),
          userSpecifiedModel,
        });
  };
  let Rg = new RecordedAgentResumeRun(
    x.agentResumes ?? [],
    {
      connectorsJoined: () =>
        refreshMcpForTurn(getState, L, TRANSPORT_FALLBACK_TIMEOUT_MS, {
          waitForDeferrable: true,
          localOnly: false,
        }),
      contextForResume,
      canUseTool,
      exiting,
      messageQueue,
      cutOffAgentCalls: toolState.get(ResumedAgentCallRegistry),
      stopAgents: (O) =>
        stopAllRunningTasks({
          taskRegistry: createTaskFramework(getState, setAppState),
          setAppState,
          storageV5: x.storageV5,
          shouldStop: (Q) => O.has(Q.id),
        }),
      storageV5: x.storageV5,
    },
    ze.whenEnding(),
    x.keptSubagentAsk,
  );
  let bc = {
    session: e,
    redactsPersistedLane: () => isTransportBacked(e),
    engineState: getState,
    setEngineState: setAppState,
    storageV5: x.storageV5,
    credentials: x.credentials,
    thinkingBudget: hasEffort,
    sessionTitles: Tg,
    mcpControlLanes: {
      resolveDeferredPluginStartup: ef,
      pendingManualExchange: (O) => oauthAuthPromises.get(O),
      postOAuthReconnectPending: _r,
      ownerConfig: Pa,
      sdkClients: () => sdkClients,
      registeredSdkServer: (O) => {
        let Q = getOwn(R, O);
        return Q
          ? {
              ...Q,
              scope: "dynamic",
            }
          : null;
      },
      startupClients: () => clients,
      dynamicClients: () => dynamicMcpState.clients,
      disableSdkServer,
      enableSdkServer,
      markDynamicServerDisabled: (O) => {
        dynamicMcpState = markServerDisabled(dynamicMcpState, O);
      },
      switchSaved: (O, Q) => x.switchedOffMcpServers?.switchSaved(O, Q),
      seedControlDialSlot: Qd,
      reconnectForControlRequest: Ol,
      landControlResult: Kd,
    },
    replyNow: null,
    resumeUntrackedAgent: null,
    mcpConnections: () => ({
      connections: rows(),
      tools: [...getState().mcp.tools, ...dynamicMcpState.tools],
    }),
    isKnownMcpServer: (O) =>
      clients.some((Q) => Q.name === O) ||
      sdkClients.some((Q) => Q.name === O) ||
      Object.hasOwn(R, O) ||
      dynamicMcpState.clients.some((client) => client.name === O) ||
      getState().mcp.clients.some((client) => client.name === O) ||
      getMcpConfigByName(O) !== null,
    contextUsageInputs: wg,
  };
  let Dw = {
    enqueue: (O) => output.enqueue(O),
    storageV5: x.storageV5,
    credentials: x.credentials,
    ended: ze.whenEnding(),
  };
  let deferred_3 = Promise.withResolvers();
  let Mg = waitForRemoteManagedSettingsFetchToSettle().catch(logError);
  let results = Promise.all([Mg, deferred_3.promise]);
  let Fw = env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL ? results : Mg;
  let Uw =
    (O, reloadPluginHooksQuiet = reloadPluginHooksNow) =>
    () => {
      O.then(() => reloadPluginHooksQuiet(Dw)).catch(logError);
    };
  let PU = Uw(Fw);
  let Lw = Uw(Fw, reloadPluginHooksQuiet);
  let Bw = {
    isSettled: false,
  };
  Mg.then(() => {
    Bw.isSettled = true;
  });
  deferred_3.promise.then(() => (Bw.isSettled ? reloadPluginHooksNow(Dw) : undefined)).catch(logError);
  Lw();
  let Hw = subscribeHelperPassSettled(PU);
  let Nw = onLastLoadStatusChanged(Lw);
  registerCleanup(async () => {
    Hw();
    Nw();
  });
  ze.whenEnding().then(() => {
    Hw();
    Nw();
  });
  async function prev(connection) {
    try {
      return await MU(connection);
    } finally {
      deferred_3.resolve();
    }
  }
  async function MU(connection) {
    try {
      await withDiagnosticsTiming("headless_managed_settings_wait", () =>
        waitForRemoteManagedSettingsToLoad(),
      );
    } catch (error) {
      logError(error);
    }
    let Q = false;
    try {
      let he = new Set(
        Object.keys(
          (
            await getAllMcpConfigs({
              storageV5: x.storageV5,
              credentials: x.credentials,
              admits: bareModePluginAllow(),
            })
          ).servers,
        ),
      );
      Q = await installPluginsForHeadlessSerialized(connection, x.storageV5, x.credentials);
      if (env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL)
        Ea = {
          start: performance.now(),
        };
      if (Q) await Bl(he, "plugin_install_diff");
    } catch (error) {
      logForDebugging(`Headless plugin install / MCP reconcile failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
    if (Ea) {
      Ea.end = performance.now();
      recordPhase("plugin_mcp_reconcile_ms", Ea.end - Ea.start, Ea.start);
    }
    return Q;
  }
  let id = null;
  let Yd = null;
  let Tc = null;
  let idleRefreshRan = false;
  let idleRefreshSyncTimedOut = false;
  let Ag = null;
  let Qm;
  let $m = env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL_TIMEOUT_MS ?? 0;
  let Ea;
  let skillsSyncStartedAt = performance.now();
  let $w = isSkillsSyncLive(e) && isSkillsCustomizationAllowed();
  let skillsSync = $w ? awaitFirstSkillList(e, x.storageV5, x.credentials) : null;
  let accountSkillsSyncRepopulate = !$w && isSkillsSyncActive(e);
  let startTime = performance.now();
  setAwaitsFirstRun(true);
  let ud = isPluginsSyncLive(e) ? runFirstPluginsSync(e, x.credentials) : null;
  let Jd = null;
  let Ll;
  if (!isBareMode()) {
    if (env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL) {
      Ll =
        x.outputFormat === "stream-json"
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
      Ll?.({
        status: "started",
      });
      id = prev((ke) => Ll?.(ke));
      let O = id;
      let Q = ud;
      let promise = new Promise((resolve) => {
        Qm = resolve;
      });
      Yd = (async () => {
        try {
          await Promise.race([O.catch(() => {}), promise]);
          if (Q) {
            let dt = pluginInstallTimeoutMs() - (performance.now() - startTime);
            await Promise.race([Q.catch(() => {}), sleep(Math.max(0, dt))]);
          }
          let ke = isPluginsSyncLive(e) ? await Zm() : null;
          let startTime_2 = performance.now();
          await Cc();
          recordPhase("registry_refresh_ms", performance.now() - startTime_2, startTime_2);
          if (ke) await Qg(ke);
        } catch (error) {
          logError(error);
        }
        try {
          let { setupPluginHookHotReload, startOwedPluginHookRegistration } =
            await import("./chunk-c7p56eem.js");
          await startOwedPluginHookRegistration(x.storageV5, x.credentials);
          setupPluginHookHotReload(x.storageV5, x.credentials);
        } catch (error) {
          logError(error);
        }
      })();
    } else Jd = initialPluginRefreshState(prev);
  } else deferred_3.resolve();
  {
    let O = require("./chunk-rypb72br.js");
    Sg = O.HEARTH_BINDING_CHANGED_HINT;
    let bridgeSdkUrl = O.parseBridgeSdkUrl(x.sdkUrl);
    if (bridgeSdkUrl && !isRemoteManagedEnvironment()) {
      let { createHeadlessHearthMount } = require("./chunk-zp0e6a00.js");
      Sc = createHeadlessHearthMount({
        stores: rr,
        storageV5: x.storageV5,
        credentials: x.credentials,
        sessionId: bridgeSdkUrl.sessionId,
        apiBaseUrl: bridgeSdkUrl.apiBaseUrl,
        getBearerToken: getSessionIngressAuthToken,
        getWorkerEpoch: () => structuredIO.workerEpoch(),
        readHearthBinding: () => structuredIO.readProjectsBinding(),
        sdkHostConfigs: () => R,
      });
    }
  }
  bridgeHostState().projectFilesDoor = () => {
    for (let O of Ul()) {
      let Q = O.projectFilesDoor();
      if (Q) return Q;
    }
    return null;
  };
  let Kw = Sc?.sync("startup") ?? null;
  let Ig = Kw !== null && env.CLAUDE_CODE_ENVIRONMENT_KIND === "bridge" ? Kw : null;
  let relayHoldFollowsBootVerdict = getFeatureValue_CACHED_MAY_BE_STALE("tengu_dapper_platypus", false);
  let Og = () =>
    planMcpConnectorPrewait({
      explicitMcpConfigFlag: x.explicitMcpConfigFlag,
      sdkUrl: x.sdkUrl,
      hasStreamingInput: getHasStreamingInput(),
      toolSearchAvailable: isToolSearchToolAvailable(Gd(getState())),
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
  } = Og();
  if (relayMarked && !relayHold)
    logForDebugging(
      "relay-marked worker: no relay hold (its relay can no longer be used in this process); the first command waits for MCP servers as on an unmarked worker",
    );
  let Fg = () => mcpServersNamedByRules(getState().toolPermissionContext);
  let Yw = Fg();
  function xg(policyAllows) {
    return pluginMcpServersRequired({
      policyAllows,
      clients: getState().mcp.clients,
      requiredServerNames: Fg,
      messages: messages_2,
    });
  }
  let idleTimeout = xg(() => skipFullyDeferredServers);
  let mcpClientCountAtKick = getState().mcp.clients.length;
  let startTime_2 = performance.now();
  let Ug = () =>
    relayMcpWaitLeft(startTime_2, deadlineMs ?? TRANSPORT_FALLBACK_TIMEOUT_MS, performance.now());
  let mcpPrewaitPromise = refreshMcpForTurn(getState, L, deadlineMs, {
    waitForDeferrable,
    firstTurnHold,
    requiredServerNames: Yw,
    skipServerNames: idleTimeout,
    localOnly,
    coordinatorMainThreadOnly,
    relayMarked,
    relayHold,
    relayHoldFollowsBootVerdict,
    permissionPromptToolServerName: x.permissionPromptToolServerName,
  });
  let Lg;
  let Hg = false;
  let Zw = false;
  let Rc = {
    session: e,
    conversation: () => messages_2,
    append: Gs,
    waiting: releaseHeldSessionStartRows(messages_2),
    clears: 0,
    storageV5: x.storageV5,
    credentials: x.credentials,
  };
  if (x.overdueSessionStartHooks !== undefined)
    appendSessionStartHooksWhenDone(Rc, x.overdueSessionStartHooks, (O) =>
      structuredIO.prependUserMessage(O),
    );
  let ev = 0;
  let Wg = 0;
  let ra = new TurnStartChecks({
    deferredCommandsJoin: xl,
    parkedPermissionRetirement: () => Ie.retirement,
    takeClaimSessionStartHooks: () => {
      let O = Lg;
      Lg = undefined;
      return O;
    },
    takeNewPluginsSessionStart: () => {
      if (!Hg) return;
      Hg = false;
      return runLateSessionStartHooks(Rc);
    },
    runSessionStartHooksOfNewPlugins: () => runLateSessionStartHooks(Rc),
    sdkUrl: x.sdkUrl,
    sdkMcpUpdateKind: () => mcpSyncNeeded(R, sdkClients),
    sdkMcpServersPending: () =>
      count(Object.keys(R), (O) => {
        let found = sdkClients.find((he) => he.name === O);
        return found === undefined || found.type === "pending";
      }),
    sdkToolRelistPending,
    updateSdkMcp: Ma,
    noteSdkEntryWait: () => qg.noteEntryWait(),
    skillsSync,
    skillsSyncStartedAt,
    accountSkillsSyncRepopulate,
    refreshCurrentCommands: () => af(),
    pluginStateRefreshTickets: () => ({
      started: ev,
      lastCompletedStart: Wg,
    }),
    pluginStartupPending: () => Boolean(ud || id || $g > 0),
    resolveDeferredPluginStartup: ef,
    closePluginInstallBracket: () => {
      Ll?.({
        status: "completed",
      });
      Ll = undefined;
      Qm?.();
    },
    backgroundInstall: Jd,
    refreshPluginState: Cc,
    refillMarketplaces: () => installPluginsForHeadlessSerialized(undefined, x.storageV5, x.credentials),
    applyPluginMcpDiff: Bl,
    connectedNonDynamicMcpServerNames: Jm,
    serverNamesOwnedBeforePluginsSync: Zm,
    pendingPluginRefresh: () => Yd,
    pluginRefreshJoined: () => {
      Yd = null;
    },
    mcpClientCountAtKick,
    mcpPrewaitPromise,
    enterPhase: (O) => ze.turnStartClock.enter(O),
    session: e,
    credentials: x.credentials,
    firstCommandMountJoin: (O) => {
      if (Ig !== null) {
        let Q = Ig;
        Ig = null;
        let he = require("./chunk-wpq8yj9g.js");
        return he.joinProjectsMountBeforeFirstCommand(
          Q,
          getState,
          Math.max(
            he.PROJECTS_MOUNT_FIRST_COMMAND_WAIT_FLOOR_MS,
            he.PROJECTS_MOUNT_FIRST_COMMAND_WAIT_MS - O,
          ),
        );
      }
      return null;
    },
    mcpPrewait: {
      deadlineMs,
      waitForDeferrable,
      firstTurnHold,
      policyAtFirstCommand: () => Og(),
      skippedAtKick: idleTimeout,
      serversToSkipNow: (O) => xg(() => O),
      requiredAtKick: Yw,
      requiredServersNow: Fg,
      localOnly,
      coordinatorMainThreadOnly,
      relayMarked,
      relayHold,
      relayHoldFollowsBootVerdict,
      permissionPromptToolServerName: x.permissionPromptToolServerName,
      freshWaitDeadlineMs: relayHold ? Ug : undefined,
      laterWakes,
    },
    waitForPendingMcp: (O, Q) => refreshMcpForTurn(getState, L, O, Q),
    store: me,
    allMcpClients: (O) => mergeClients(O.mcp.clients, sdkClients, dynamicMcpState.clients),
    registerElicitationHandlers: hasFastMode,
    registerChannelHandler: (O) => reregisterChannelHandlerAfterReconnect(O, messageQueue),
    buildAllTools: Gd,
  });
  let qg = new SdkMcpServerWait({
    sdkUrl: x.sdkUrl,
    unconnectedServers: () =>
      Object.entries(R).flatMap(([key, value]) => {
        let found = sdkClients.find((ke) => ke.name === key);
        return found === undefined || found.type === "pending" ? [value] : [];
      }),
    updateSdkMcp: Ma,
    relayWaitLeftMs: relayHold ? Ug : undefined,
  });
  let any = messages.some((newCommands) => newCommands.type === "user" || newCommands.type === "assistant");
  let NU = new McpPrewait({
    setting: launchNamed,
    kickedAtMs: x.mcpConnectKickedAtMs ?? startTime_2,
    coordinatorMainThreadOnly,
    relayMarked,
    relayHoldLog: {
      relayHold,
      relayHoldFollowsBootVerdict,
    },
    startedFromTranscript: any,
    mainThreadRequested: () => e.requestJournal.mainThreadRequestedInProcess(),
    mcpClients: () => getState().mcp.clients,
    waitForPendingMcp: (O, Q) => refreshMcpForTurn(getState, L, O, Q),
  });
  let run = () =>
    !ze.running &&
    !Do.isBusy &&
    !Ya.isBusy &&
    !Ya.hasRunningTask(getState().tasks) &&
    Xo === 0 &&
    !fi &&
    !hasBesideArrivingFiles() &&
    !hasAwaitedRunningTaskIn(getState().tasks) &&
    !(env.CLAUDE_CODE_ENVIRONMENT_KIND === "bridge" && hasAwaitedRunningTasks(getState().tasks)) &&
    !hasWorkingInProcessTeammates(getState()) &&
    !collectOwedTaskNotifications({
      tasks: Object.values(getState().tasks ?? {}),
      waits: io,
      now: Date.now(),
    });
  let timeoutMs = createIdleTimeoutManager(
    () => run() && !We(Date.now()),
    () => {
      if (
        !ze.running &&
        !isShuttingDown() &&
        !isTerminalShutdown() &&
        structuredIO.sessionState.getState() === "running"
      )
        structuredIO.sessionState.notifyStateChanged("idle");
    },
  );
  let idleRelease = timeoutMs;
  if (env.CLAUDE_CODE_SLEEP_COMPACT) {
    let { isSleepCompactionHost, SleepCompactor, withSleepCompaction } = require("./chunk-bbwtdypr.js");
    if (isSleepCompactionHost())
      idleRelease = withSleepCompaction(
        timeoutMs,
        new SleepCompactor({
          isIdle: run,
          isStopping: () => isShuttingDown() || isTerminalShutdown() || ze.inputClosed,
          isPermissionPending: () => Ie.inheritedPromptPending(),
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
            Os();
          },
          exitDelayMs: env.CLAUDE_CODE_EXIT_AFTER_STOP_DELAY,
        }),
      );
  }
  async function Cc(O = {}) {
    let Q = ++ev;
    let { agentDefinitions } = await refreshActivePlugins(Ee, x.storageV5, x.credentials, O);
    He = true;
    od = getNonInteractiveCommands(await getCommands(cwd(), x.storageV5));
    Hm = true;
    buildAllTools(agentDefinitions.allAgents);
    md();
    loadAllPluginsCacheOnly(x.storageV5, x.credentials).then(
      (cmd) =>
        addStartupContext({
          plugin_count: cmd.enabled.length,
        }),
      () => {},
    );
    Wg = Math.max(Wg, Q);
  }
  async function ov(
    O,
    Q = {
      restartLaunchDirStdioServers: false,
    },
  ) {
    devIntentTracker.of(e.host).directoryChanged();
    let originalCwd = getOriginalCwd();
    let permissionPromptToolName = x.permissionPromptToolName;
    let rt = [];
    let listedServer;
    setAppState((Xt) => {
      let { stale, ...On } = removeMcpClientsWhere(Xt.mcp, (fn) =>
        isDeclaredUnderOtherWorkspaceRoot(fn.config, originalCwd),
      );
      if (stale.length === 0) return Xt;
      rt = stale;
      listedServer =
        permissionPromptToolName === undefined || x.permissionPromptToolServerName === undefined
          ? undefined
          : Xt.mcp.tools.find((tool) => toolMatchesName(tool, permissionPromptToolName))?.mcpInfo?.serverName;
      return {
        ...Xt,
        mcp: {
          ...Xt.mcp,
          ...On,
        },
      };
    });
    for (let Xt of rt) {
      if (
        x.permissionPromptToolBinding !== undefined &&
        matchesListedOrParsedServer(Xt.name, {
          listedServer,
          parsedServer: x.permissionPromptToolServerName,
        })
      )
        x.permissionPromptToolBinding.swept = true;
      if (isConnectedOrCached(Xt))
        await getMcpClientModule()
          .clearServerCache(Xt.name, Xt.config)
          .catch(() => {});
    }
    if (Q.restartLaunchDirStdioServers) await qU();
    await Cc({
      applyStagedInstalls: false,
    });
    let Gt = new Set(Object.keys(dynamicMcpState.configs));
    let pt = new Set(
      getState()
        .mcp.clients.filter((client) => !Gt.has(client.name))
        .map((client) => client.name),
    );
    await Bl(pt, O);
  }
  async function qU() {
    let O = new Set(Object.keys(dynamicMcpState.configs));
    let batchUuids = getState().mcp.clients.filter(
      (client) =>
        !O.has(client.name) &&
        isStdioConfig(client.config) &&
        !isBuiltinInProcessMcpServer(client.name) &&
        (client.type === "connected" || client.type === "pending" || client.type === "failed") &&
        !mcpDialBlockCause(client.name, client.config) &&
        !isMcpServerDisabled(client.name),
    );
    let filtered = getState().mcp.clients.filter(
      (client) =>
        client.type === "cached" &&
        !O.has(client.name) &&
        isStdioConfig(client.config) &&
        !isBuiltinInProcessMcpServer(client.name),
    );
    for (let pt of filtered)
      getMcpClientModule()
        .clearServerCache(pt.name, pt.config)
        .catch(() => {});
    if (batchUuids.length === 0) return;
    logForDebugging(
      `set_cwd: re-dialling ${batchUuids.length} stdio MCP server(s) spawned in the launch directory`,
    );
    let ke = new Set(
      batchUuids.filter((batchUuid) => batchUuid.type === "pending").map((batchUuid) => batchUuid.name),
    );
    if (ke.size > 0)
      await waitForStoreState(
        {
          getState,
          subscribe: L,
        },
        (pt) => !pt.mcp.clients.some((client) => ke.has(client.name) && client.type === "pending"),
        {
          timeoutMs: Math.min(
            Math.max(deadlineMs ?? 0, TRANSPORT_FALLBACK_TIMEOUT_MS),
            getConnectTimeoutMs(),
          ),
        },
      );
    ra.noteServersStartedSinceKick(batchUuids.map((batchUuid) => batchUuid.name));
    let rt = (pt) => {
      let Xt = false;
      setAppState((Dt) => {
        let found = Dt.mcp.clients.find((client) => client.name === pt.name);
        if (!found || !getMcpClientModule().areMcpConfigsEqual(found.config, pt.config)) return Dt;
        Xt = true;
        if (found.type === "pending") return Dt;
        return {
          ...Dt,
          mcp: {
            ...Dt.mcp,
            clients: Dt.mcp.clients.map((client) =>
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
      return Xt;
    };
    let dt = async (batchUuid) => {
      if (!rt(batchUuid)) return;
      let Xt = await Vd(batchUuid.name, batchUuid.config);
      logMCPDebug(batchUuid.name, `re-dialled under the new project root after set_cwd: ${Xt.type}`);
    };
    let results = Promise.all(
      batchUuids.map((batchUuid) =>
        dt(batchUuid).catch((error) =>
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
  function Jm() {
    let O = new Set(Object.keys(dynamicMcpState.configs));
    return new Set(
      getState()
        .mcp.clients.filter((client) => !O.has(client.name))
        .map((client) => client.name),
    );
  }
  async function Zm() {
    let { servers } = await getAllMcpConfigs({
      storageV5: x.storageV5,
      credentials: x.credentials,
      admits: bareModePluginAllow(),
    });
    let appState = Jm();
    let suppressedPluginMcpServers = getState().mcp.suppressedPluginMcpServers ?? [];
    let ke = new Set();
    for (let [key, value] of Object.entries(servers))
      if (
        value.pluginSource === undefined ||
        marketplaceSuffix(value.pluginSource) !== SYNCED ||
        appState.has(key) ||
        suppressedPluginMcpServers.includes(key)
      )
        ke.add(key);
    return ke;
  }
  async function Bl(O, Q, he = "configured") {
    let { servers } = await getAllMcpConfigs({
      storageV5: x.storageV5,
      credentials: x.credentials,
      admits: bareModePluginAllow(),
    });
    setAppState((fn) => {
      let suppressedPluginMcpServers = fn.mcp.suppressedPluginMcpServers;
      if (!suppressedPluginMcpServers || suppressedPluginMcpServers.length === 0) return fn;
      let filtered = suppressedPluginMcpServers.filter((suppressedPluginMcpServer) =>
        Object.hasOwn(servers, suppressedPluginMcpServer),
      );
      return filtered.length === suppressedPluginMcpServers.length
        ? fn
        : {
            ...fn,
            mcp: {
              ...fn.mcp,
              suppressedPluginMcpServers: filtered,
            },
          };
    });
    addStartupContext({
      mcp_server_count: Object.keys(servers).length,
    });
    let rt = isHermeticRemoteSession();
    let strictMcpConfig = getStrictMcpConfig();
    let Gt = filterServersForScope(servers, {
      scope: he,
      strictMcpConfig,
    });
    let pt = count(Object.keys(servers), (fn) => !Object.hasOwn(Gt, fn));
    if (pt > 0)
      logForDebugging(
        `Headless MCP refresh (${Q}): ${pt} configured server(s) left out (scope=${he}, strict-mcp-config=${strictMcpConfig})`,
      );
    let Xt = Object.create(null);
    for (let [key, value] of Object.entries(Gt)) {
      if (rt && (value.scope === "project" || value.scope === "local")) continue;
      if (O?.has(key) && !Object.hasOwn(dynamicMcpState.configs, key)) continue;
      if (isParkedSpare() && isNonReservedStdioConfig(key, value)) continue;
      let Zt = value.type;
      if (Zt === undefined || Zt === "stdio" || Zt === "sse" || Zt === "http" || Zt === "sdk")
        Xt[key] = value;
    }
    for (let [key, value] of Object.entries(R))
      if (
        value.type === "sdk" &&
        (!Object.hasOwn(Xt, key) || (Object.hasOwn(servers, key) && servers[key]?.scope === "dynamic"))
      )
        Xt[key] = value;
    let { response, sdkServersChanged } = await Ew(Xt, {
      authoritative: false,
      caller: Q,
      deferConnect: getMcpConnectNonBlocking(),
      pluginDiffScope: he,
    });
    if (sdkServersChanged) Ma();
    logForDebugging(
      `Headless MCP refresh: added=${response.added.length}, removed=${response.removed.length}`,
    );
  }
  async function Qg(O) {
    let startTime = performance.now();
    let he = relayHold;
    let ke = he ? Ug() : 0;
    let rt = pluginMcpTimeoutMs();
    let dt = he && rt === 0 ? ke : rt;
    let Gt = Bl(O, "plugins_sync");
    if (dt === 0) {
      Gt.catch((error) => logError(error));
      recordPhase("plugins_sync_mcp_ms", 0);
      logEvent("tengu_plugins_sync_mcp_skipped", {
        relay_marked: relayMarked,
        relay_hold: relayHold,
      });
      return;
    }
    let pt = sleep(dt).then(() => "timeout");
    let Xt = false;
    try {
      if ((await Promise.race([Gt, pt])) === "timeout") {
        Xt = true;
        logEvent("tengu_plugins_sync_mcp_timeout", {
          timeout_ms: dt,
        });
        Gt.catch((error) => logError(error));
      }
    } catch (error) {
      logError(error);
    }
    let startTime_2 = performance.now();
    recordPhase("plugins_sync_mcp_ms", startTime_2 - startTime);
    if (he) {
      if (Xt) {
        let max = Math.max(0, ke - (performance.now() - startTime));
        await withDeadline(
          Gt.catch(() => {}),
          max,
        );
      }
      let startTime_3 = performance.now();
      let max = Math.max(0, ke - (startTime_3 - startTime));
      let Rt = xg(() => Og().skipFullyDeferredServers);
      await refreshMcpForTurn(getState, L, max, {
        skipTelemetry: true,
        waitForDeferrable: true,
        skipServerNames: Rt,
      });
      logEvent("tengu_plugins_sync_mcp_relay_wait", {
        reconcile_timed_out: Xt,
        connect_budget_ms: Math.round(max),
        connect_waited_ms: Math.round(performance.now() - startTime_3),
        pending_waited_after: count(
          getState().mcp.clients,
          (Zt) => Zt.type === "pending" && !Rt.has(Zt.name),
        ),
      });
      recordPhase("plugins_sync_mcp_relay_wait_ms", performance.now() - startTime_2, startTime_2);
    }
  }
  async function sv() {
    Tc = null;
    let startTime = performance.now();
    try {
      let Q = await Zm();
      await Cc();
      await Qg(Q);
      recordPhase("plugin_state_refresh_inline_ms", performance.now() - startTime, startTime);
    } catch (error) {
      logError(error);
    }
  }
  let Pc = null;
  let $g = 0;
  function ef() {
    if (Pc) return Pc;
    $g++;
    Zw ||= Boolean(ud || id);
    let O = jU()
      .catch((error) => {
        logError(error);
        if (Pc === O) Pc = null;
      })
      .finally(() => {
        $g--;
        Hg ||= Zw;
      });
    Pc = O;
    return O;
  }
  async function jU() {
    let syncLanded = false;
    try {
      if (ud) {
        let startTime_2 = performance.now();
        let ke = pluginInstallTimeoutMs() - (startTime_2 - startTime);
        let rt = sleep(Math.max(0, ke)).then(() => "timeout");
        let dt = (await Promise.race([ud, rt])) === "timeout";
        logForDiagnosticsNoPII("info", "plugins_sync_wait", {
          timed_out: dt,
        });
        if (dt) {
          logEvent("tengu_plugins_sync_wait_timeout", {});
          ud.then(() => {
            ra.notePluginsSyncLanded();
          }).catch(logError);
        }
        recordPhase("plugins_sync_install_ms", performance.now() - startTime_2);
        ud = null;
        if (!id && !Yd) await sv();
        syncLanded = !dt;
      }
      if (id) {
        let startTime = performance.now();
        if ($m > 0) {
          let ke = sleep($m).then(() => "timeout");
          if ((await Promise.race([id, ke])) === "timeout") {
            logForDebugging(`CLAUDE_CODE_SYNC_PLUGIN_INSTALL: plugin installation timed out after ${$m}ms`, {
              level: "error",
            });
            logEvent("tengu_sync_plugin_install_timeout", {
              timeout_ms: $m,
            });
          }
        } else await id;
        recordPhase("plugin_install_ms", performance.now() - startTime, startTime);
        if (Ea) recordPhase("plugin_mcp_reconcile_ms", (Ea.end ?? performance.now()) - Ea.start, Ea.start);
        id = null;
        Qm?.();
        recordPhase("plugin_install_total_ms", performance.now() - startTime, startTime);
      }
    } finally {
      Ll?.({
        status: "completed",
      });
      Ll = undefined;
      Qm?.();
    }
    if (Yd) {
      let startTime = performance.now();
      await Yd;
      recordPhase("plugin_state_refresh_join_ms", performance.now() - startTime, startTime);
    }
    let Q = Jd?.needsRefresh === true;
    if (
      needsPluginRefreshAfterIdle({
        idleRefreshRan,
        idleRefreshSyncTimedOut,
        syncLanded,
        syncRoundReplaced: Ag !== null && e.pluginsSync.firstSyncPromise !== Ag,
        installNeedsRefresh: Q,
      })
    ) {
      await sv();
      if (Q && Jd) Jd.needsRefresh = false;
    }
    if (Tc) {
      let he = Tc;
      Tc = null;
      try {
        await Qg(he);
      } catch (error) {
        logError(error);
      }
    }
  }
  function Kg(O, serverName, he) {
    return O === serverName || normalizeNameForMCP(O) === he;
  }
  function tf(serverName) {
    let Q = normalizeNameForMCP(serverName);
    return [...getState().mcp.clients, ...sdkClients, ...dynamicMcpState.clients].filter((cache) =>
      Kg(cache.name, serverName, Q),
    );
  }
  async function QU(serverName, params, elicitSignal) {
    let ke = (status) =>
      status.find((Rt) => Rt.type === "connected" && !isMcpServerBlockedAtConnectTime(Rt.name, Rt.config));
    let rt = params !== undefined ? parseIsoTimestamp(params) : Number.POSITIVE_INFINITY;
    let min = Math.min(Date.now() + MCP_CALL_RESULT_LIMITS, Number.isNaN(rt) ? Date.now() : rt);
    let Gt = false;
    async function pt(status) {
      let Rt = ke(status);
      if (Rt) return Rt;
      let found = status.find((no) => no.type === "cached");
      if (!found || Gt) return;
      let max = Math.max(0, min - Date.now());
      if (max === 0) {
        Gt = true;
        return;
      }
      try {
        return await getMcpClientModule().ensureConnectedClient(found, {
          signal: elicitSignal,
          timeoutMs: max,
          context: "mcp_call lazy connect",
        });
      } catch (error) {
        Gt = true;
        if (
          (await getMcpClientModule().peekSettledConnection(found.name, found.config))?.type ===
            "needs-auth" ||
          error instanceof McpAuthError
        )
          Me.markNeedsAuth(found.name);
        logForDebugging(
          `mcp_call: lazy connect of cached server "${serverName}" failed: ${errorMessage(error)}`,
        );
        return;
      }
    }
    let Xt = await pt(tf(serverName));
    if (Xt) return Xt;
    if (
      (await Promise.race([
        ef().then(() => "resolved"),
        sleep(Math.max(0, min - Date.now()), elicitSignal),
      ])) === "resolved"
    ) {
      let fn = normalizeNameForMCP(serverName);
      if (!(
        tf(serverName).length > 0 ||
        Object.keys(dynamicMcpState.configs).some((key) => Kg(key, serverName, fn)) ||
        (await Promise.race([
          getAllMcpConfigs({
            storageV5: x.storageV5,
            credentials: x.credentials,
            admits: bareModePluginAllow(),
          }).then(({ servers }) => Object.keys(servers).some((key) => Kg(key, serverName, fn))),
          sleep(Math.max(0, min - Date.now()), elicitSignal).then(() => true),
        ]))
      ))
        return;
    }
    let min_2 = Math.min(min, Date.now() + PRINT_TURN_POLL_MS);
    while (!elicitSignal.aborted) {
      let fn = tf(serverName);
      let Rt = await pt(fn);
      if (Rt) return Rt;
      if (fn.length > 0 && fn.every((Zt) => Zt.type !== "pending" && (Zt.type !== "cached" || Gt))) return;
      if (Date.now() >= (fn.length === 0 ? min_2 : min)) break;
      await sleep(50, elicitSignal);
    }
    if (elicitSignal.aborted) return;
    return ke(tf(serverName));
  }
  let Zd = true;
  function nl() {
    return (
      Zd &&
      x.outputFormat === "stream-json" &&
      canServeManifests(structuredIO.uiSurfaceChannel()) &&
      (!structuredIO.isRemoteTransport() || clientRegistry.list().length > 0)
    );
  }
  let uiStatusBuffer = createUiStatusBuffer(Date.now);
  let Ac = false;
  let nf = false;
  function Vg(O) {
    if (nl()) {
      uiStatusBuffer.note(O);
      enqueueTaskNotification(O);
      return true;
    }
    let Q =
      Zd &&
      x.outputFormat === "stream-json" &&
      canServeManifestsForRemoteCall(structuredIO.uiSurfaceChannel(), clientRegistry.list().length > 0);
    if (Q) uiStatusBuffer.hold(O);
    else {
      uiStatusBuffer.note(O);
      Ac ||= O.subtype === "ui_status";
    }
    return Q;
  }
  function Gg(isFirstClient) {
    let Q = structuredIO.isRemoteTransport();
    if (!Q && !Ac) return;
    let he = Q && isFirstClient ? uiStatusBuffer.forFirstClient() : uiStatusBuffer.forLaterClient();
    if (!nl()) return;
    Ac = false;
    for (let uuid of he) enqueueTaskNotification(uuid);
  }
  let surfaceDeclarationTracker = createSurfaceDeclarationTracker(
    {
      isRemoteTransport: () => structuredIO.isRemoteTransport(),
      senderStands: (result) => structuredIO.surfaceSenderStands(result),
      welcomeBack: () => {
        let O = Pu;
        pruneDetachedClients();
        Gg(false);
        Zg();
        _v(O);
        if (nl())
          enqueueTaskNotification({
            type: "system",
            subtype: "ui_invalidate",
            event: "ui.render",
          });
      },
    },
    (O, Q) => structuredIO.surfaceClientAttached(O, Q),
  );
  let cd = null;
  let zg = false;
  let of = false;
  let md = () => {
    if (Zd) na("state_change");
    if (!Zd || x.outputFormat !== "stream-json") return;
    if (zg) {
      of = true;
      return;
    }
    let slashCommands = toSlashCommands(Ho());
    let Q = jsonStringify(slashCommands);
    if (cd === null || Q === cd) return;
    cd = Q;
    enqueueTaskNotification({
      type: "system",
      subtype: "commands_changed",
      commands: slashCommands,
    });
  };
  let iv = () => {
    zg = false;
    if (of) {
      of = false;
      try {
        md();
      } catch (error) {
        logError(error);
      }
    }
  };
  let af = async () => {
    if (!getHostState().isAnnouncingFreshLoad) clearCommandsCache();
    od = getNonInteractiveCommands(await getCommands(getOriginalCwd(), x.storageV5));
    Hm = true;
    Wl();
    md();
  };
  let df;
  let lf = false;
  let av = (error) => {
    lf = true;
    logError(error);
  };
  let mf = () => {
    let O = af()
      .catch(av)
      .finally(() => {
        if (df === O) df = undefined;
      });
    df = O;
  };
  let uv = {
    reload: async () => {
      let O = await logPluginDirReload(Ee, {
        model: Ao() ?? getMainLoopModel(),
        mcpClients: getState().mcp.clients,
        storageV5: x.storageV5,
        credentials: x.credentials,
      });
      if (O === "held") return O;
      He = true;
      buildAllTools(getState().agentDefinitions.allAgents);
      let [Q, he] = await Promise.allSettled([af(), Bl(Jm(), "reload_plugins")]);
      if (Q.status === "rejected") logError(Q.reason);
      if (he.status === "rejected")
        logForDebugging(`plugin-dir watch reload: applyPluginMcpDiff failed: ${errorMessage(he.reason)}`, {
          level: "error",
        });
      return O;
    },
    joinPluginDir: addPluginDirAndRebuildSandbox,
    retarget: (O) => Ee.retarget(O),
  };
  pendingReloadSlot.set(uv);
  installDevModsPlaceholderExpander();
  let Yg = () =>
    Promise.resolve()
      .then(() => getAgentDefinitionsWithOverrides(getOriginalCwd(), x.storageV5))
      .then((O) => buildAllTools(O.allAgents))
      .catch((error) => {
        av(error);
        agents = withLiveRegisteredAgents(agents);
      });
  let $U = sharedSkillChangeDetector.subscribe(() => {
    mf();
    Yg();
  });
  let cv = "";
  let mv = () => {
    try {
      cv = join(getManagedFilePath(), ".claude") + sep;
      return managedFolderCondition();
    } catch (error) {
      logError(error);
      lf = true;
      return "unread:";
    }
  };
  let Wl = () => {
    let state = mv();
    let Q = managedSettingsAskState.readAs !== false;
    if (state !== "held:" && !(state === "unread:" && Q)) return;
    let he = (source, rt) => source === "policySettings" && rt?.startsWith(cv) === true;
    od = od.filter((ke) => ke.type !== "prompt" || !he(ke.source, ke.skillRoot ?? ke.skillFile?.path));
    agents = agents.filter((ke) => !he(ke.source, ke.baseDir));
  };
  let fv = () => {
    let initialSettings = getInitialSettings_2();
    return {
      skillOverrides: jsonStringify(initialSettings.skillOverrides ?? {}),
      bundledSkillsDisabled: isBundledSkillsDisabled(initialSettings),
      managedFolderHold: mv(),
    };
  };
  let ff = fv();
  Wl();
  xl?.then(Wl).catch(logError);
  let KU = settingsChangeDetector.subscribe(() => {
    let O = fv();
    let Q = O.skillOverrides !== ff.skillOverrides;
    let he = O.bundledSkillsDisabled !== ff.bundledSkillsDisabled;
    let ke = lf || O.managedFolderHold !== ff.managedFolderHold;
    if (!Q && !he && !ke) return;
    ff = O;
    if (ke) {
      lf = false;
      Wl();
      mf();
      Yg();
      md();
      return;
    }
    if (he) {
      mf();
      return;
    }
    (xl ?? Promise.resolve()).then(md).catch(logError);
  });
  let commands = getState().mcp.commands;
  let VU = L(() => {
    let commands_2 = getState().mcp.commands;
    if (commands_2 === commands) return;
    let Q =
      commands_2.length === commands.length &&
      commands_2.every((command, ke) => command.name === commands[ke]?.name);
    commands = commands_2;
    if (Q) return;
    (xl ?? Promise.resolve()).then(md).catch(logError);
  });
  let GU = async () => {
    if (!Zd) return;
    let O = cd ?? jsonStringify(toSlashCommands(Ho()));
    clearCommandMemoizationCaches();
    let nonInteractiveCommands = getNonInteractiveCommands(await getCommands(getOriginalCwd(), x.storageV5));
    if (!Zd) return;
    od = nonInteractiveCommands;
    Hm = true;
    Wl();
    if (jsonStringify(toSlashCommands(Ho())) === O) return;
    md();
  };
  let gv = () => {
    (xl ?? Promise.resolve()).then(GU).catch(logError);
  };
  let zU = onPolicyVerdictChanged(gv);
  let YU = onPolicyVerdictChanged(() => {
    queueMicrotask(vw);
  });
  if (didPolicyLimitsColdStartTimeOut() && !isLovelyUmbrellaOn()) gv();
  let JU = render.onInvalidate((O) => {
    if (!nl()) return;
    enqueueTaskNotification({
      type: "system",
      subtype: "ui_invalidate",
      event: "ui.render",
      ...(needsPromptHooks() && {
        prompts_screened: true,
      }),
      ...(O !== undefined && {
        instances: O.map((Q) => ({
          surface: Q.surface,
          component: Q.component,
          instance_id: Q.requestId,
        })),
      }),
    });
  });
  let XU =
    x.outputFormat === "stream-json"
      ? setUiLogSink((O) => {
          Vg({
            type: "system",
            subtype: "ui_log",
            plugin: O.plugin,
            text: O.text,
          });
        })
      : () => {};
  let Pu = 0;
  let Xg = (O) => {
    if (!nl()) return;
    Pu++;
    enqueueTaskNotification({
      type: "system",
      subtype: "ui_panes",
      ...describePanesForClient(O),
    });
  };
  function _v(O) {
    if (Pu === O) Xg(describeOpenPanes(paneRegistry().getState()));
  }
  let yv = {
    rosterMemory: surfaceDeclarationTracker,
    isRemoteTransport: () => structuredIO.isRemoteTransport(),
    givePluginUiTo: Gg,
    paneRosterPushes: () => Pu,
    tellPaneRoster: _v,
    isPanelAttachOwed: () => nf,
    redactsPersistedLane: () => isTransportBacked(e),
  };
  function Zg() {
    let O = listPlacedRows();
    if (O.length > 0 && nl())
      enqueueTaskNotification({
        type: "system",
        subtype: "ui_placed",
        rows: [...O],
      });
  }
  let ZU = subscribePlaced(Zg);
  let eL = subscribeOpenPanes((O) => {
    dropClosedPanes(O);
    Xg(O);
  });
  let resolved_5 = Promise.resolve();
  structuredIO.setSurfaceRoster({
    list: () => clientRegistry.list().map((O) => O.clientId),
    refuse: (O) => {
      for (let Q of O) {
        surfaceDeclarationTracker.forget(Q);
        raiseSessionDetach(Q, "detach").catch((error) =>
          logForDebugging(`session.detach: failed: ${errorMessage(error)}`, {
            level: "error",
          }),
        );
      }
      logForDebugging(
        `the stream's policy would not have admitted ${O.length} attached surface client(s): off the roster`,
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
  let Sv = raiseViewerAbsence(
    (O) => structuredIO.setSubscribersReportedListener(O),
    () => clientRegistry.list().length > 0,
    () => {
      if (!isCalmOspreyGateOn() || isShuttingDown() || isTerminalShutdown()) return;
      let O = clientRegistry.list().length;
      let Q = detachAllClients_2();
      let he = true;
      try {
        pruneDetachedClients();
      } catch (error) {
        he = false;
        logForDebugging(`viewer absence: review failed: ${errorMessage(error)}`, {
          level: "error",
        });
      }
      let ke = Q.then((rt) => {
        if (rt > 0 && rt === O) logFeatureBad("plugin_function_hooks_viewer_absence", "detach_failed");
        else if (rt > 0) logFeatureSad("plugin_function_hooks_viewer_absence", "detach_failed");
        else if (!he) logFeatureSad("plugin_function_hooks_viewer_absence", "review_failed");
        else logFeatureOk("plugin_function_hooks_viewer_absence");
      });
      resolved_5 = resolved_5.then(() => ke);
    },
  );
  let tL = onVsCodeRefreshLogChange(
    () => canServeManifests(structuredIO.uiSurfaceChannel()),
    () => {
      if (isShuttingDown() || isTerminalShutdown()) return;
      Se.noteSwitchedOff();
      let O = clientRegistry.list();
      if (!Zd || x.outputFormat !== "stream-json" || O.length === 0) return;
      logForDebugging(`a flag refresh ended the serving of surfaces: ${O.length} client(s) off the roster`);
      for (let he of O) surfaceDeclarationTracker.forget(he.clientId);
      let currentAppState = detachAllClients_2();
      resolved_5 = resolved_5.then(async () => {
        await currentAppState;
      });
      Ac = true;
      nf = true;
      enqueueTaskNotification({
        type: "system",
        subtype: "ui_invalidate",
        event: "ui.render",
      });
      pruneDetachedClients();
    },
  );
  let nL = paneSignals.scroll.subscribe((O) => {
    if (!nl()) return;
    enqueueTaskNotification({
      type: "system",
      subtype: "ui_scroll",
      client_id: O.clientId,
      component: O.component,
      instance_id: O.requestId,
      offset: O.offset,
      ...(O.isFollowingEnd && {
        follow_end: true,
      }),
    });
  });
  let rL = paneSignals.focus.subscribe((O) => {
    if (!nl()) return;
    enqueueTaskNotification({
      type: "system",
      subtype: "ui_focus",
      client_id: O.clientId,
      component: O.component,
      instance_id: O.requestId,
      plugin: O.plugin,
      key: O.element,
    });
  });
  interruptOnNowPriority({
    messageQueue,
    drain: ze,
  });
  let Ia = new WakeRouter({
    messageQueue,
    drain: ze,
    enabled: isDetachedToolCallsEnabled,
    transcript: {
      getSnapshot: () => messages_2,
    },
    session: e,
    taskRegistry: createTaskFramework(getState, setAppState),
    stopTask(O) {
      withFeatureTelemetry(
        "print_stop_ends_moved_shell",
        () =>
          stopTaskByUser(O, {
            taskRegistry: createTaskFramework(getState, setAppState),
            setAppState,
            session: e,
            getAppState: getState,
            source: "client",
            storageV5: x.storageV5,
          }),
        () => "stop_failed",
      ).catch(logError);
    },
    clock: {
      setTimeout(O, Q) {
        let timer = setTimeout(O, Q);
        return () => clearTimeout(timer);
      },
    },
  });
  let hf = new RapidFollowupPreempter({
    messageQueue,
    drain: ze,
    enabled: isRapidFollowupPreemptEnabled,
    isSentNow: (O) => Ia.isTaking(O),
    emit: enqueueTaskNotification,
  });
  let oL = hf.install();
  let _f = new FollowupBackgroundsSubagent({
    messageQueue,
    drain: ze,
    enabled: isFollowupBackgroundsSubagentEnabled,
    isSentNow: (O) => Ia.isTaking(O),
    taskRegistry: createTaskFramework(getState, setAppState),
    hasListedForegroundToolCall: () => (foregroundCallRegistrySlots.peek(e)?.list().length ?? 0) > 0,
    isHumanDecisionPending: () =>
      hasWaitingFor(e) || structuredIO.sessionState.getState() === "requires_action",
  });
  let sL = _f.install();
  let iL = structuredIO.isRemoteTransport()
    ? publishQueuedWakeStatus({
        messageQueue,
        getTasks: () => getState().tasks,
        publish: (O) =>
          structuredIO.sessionState.notifyInternalMetadataChanged({
            finished_background_tasks_pending_notification: O,
          }),
      })
    : () => {};
  let eh = () => ze.dequeueCount === 0 && !any && !messages.some((O) => O.type === "assistant");
  let kv = () => getSpareClaimState() !== "none" && eh();
  let aL = new CostStatePusher(structuredIO);
  let yf;
  lazyPrintModules2.onMemoryExtractPlace(e.host, (O) => {
    yf = O;
  });
  let wv = () => {
    aL.pushIfChanged(
      yf && {
        memory_extract_place: yf,
      },
    );
    yf = undefined;
  };
  let Ic = () => {
    if (Ie.inheritedPromptOwnsWorkerStatus()) return false;
    let refreshedState = getState();
    let values = Object.values(refreshedState.tasks ?? {});
    let any = values.some(isTeammateStillWorking);
    let any_2 = getRunningTasks(refreshedState).some(isAwaitedBackgroundTask);
    let owedTaskNotifications = collectOwedTaskNotifications({
      tasks: values,
      waits: io,
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
    if (ze.running) return true;
    try {
      return !Ic();
    } catch (error) {
      logError(error);
      logFeatureBad("per_task_stop_sparing", "liveness_probe_throw");
      return false;
    }
  });
  let dL = () => {
    structuredIO.sessionState.notifyStateChanged(Ic() ? "idle" : "running");
  };
  let vv = async () => {
    let currentAppState = getState();
    if (hasWorkingInProcessTeammates(currentAppState))
      await waitForTeammatesToBecomeIdle(setAppState, currentAppState);
    let refreshedAppState = getState();
    return (
      hasNonLeadTeammate(refreshedAppState.teamContext) || hasActiveInProcessTeammates(refreshedAppState)
    );
  };
  let bv = () => {
    if (mr) return false;
    mr = true;
    messageQueue.enqueue({
      mode: "prompt",
      agentId: mainAgentId(),
      value: TEAM_SHUTDOWN_REMINDER,
      uuid: randomUUID(),
    });
    Os();
    return true;
  };
  let Tv = async () => {
    if (isShuttingDown()) return "teardown-now";
    if (!(await vv())) return "teardown-now";
    if (!isShuttingDown() && bv()) {
      if (!isShuttingDown()) {
        logForDebugging(
          "[print.ts] Input closed with active swarm, injected shutdown prompt \u2014 teardown handed to its lineage",
        );
        return "handed-off";
      }
      return "teardown-now";
    }
    let throttledLogger = makeThrottledLogger(keepAliveSender, env.CLAUDE_CODE_REMOTE);
    let Q = Date.now() + teamTeardownParkTimeoutMs();
    while (!isShuttingDown()) {
      let he = Q - Date.now();
      let ke;
      if (he <= 0) ke = "deadline";
      else
        try {
          ke = await withTimeout(vv(), he, "team teardown park deadline");
        } catch {
          ke = "deadline";
        }
      if (ke === false) return "teardown-now";
      if (ke === "deadline") {
        let rt = getState();
        logForDebugging(
          `[print.ts] Team teardown park gave up after ${teamTeardownParkTimeoutMs()}ms (shutdown prompt injected: ${mr}) with ${Object.keys(rt.teamContext?.teammates ?? {}).length} roster teammate(s) and ${count(Object.values(rt.tasks), (dt) => dt.type === "in_process_teammate" && dt.status === "running")} in-process teammate task(s) still active; tearing down anyway`,
        );
        logEvent("tengu_headless_team_teardown_park_timeout", {
          prompt_injected: mr,
        });
        return "teardown-now";
      }
      throttledLogger();
      await sleep(500);
    }
    return "teardown-now";
  };
  async function Rv() {
    Sv.stop();
    abortController_2.abort(userAbortReason("shutdown"));
    let O =
      Wi.size > 0 && !sigintHandler()
        ? withTimeout(Promise.all(Wi.values()), 1000, "side questions still unwinding at teardown").catch(
            () => {},
          )
        : undefined;
    let Q = promptSuggestionEmitter.settle();
    if (Q) await Q;
    await withDeadline(Do.ended(), 30000);
    Sf("session_ended");
    if (ni.size > 0) {
      pr = performance.now() + LOGIN_VERIFY_TIMEOUT_MS - LOGIN_RESTORE_TIMEOUT_MS - LOGIN_SETTLE_TIMEOUT_MS;
      await withTimeout(
        Promise.allSettled(ni),
        LOGIN_VERIFY_TIMEOUT_MS,
        "reads still pending at teardown",
      ).catch(() => {});
    }
    await withTimeout(resolved_3, 300000, "get_context_usage still pending at teardown").catch(() => {});
    ww = true;
    YU();
    await withTimeout(resolved_2, 30000, "remote_control operation still pending at teardown").catch(
      () => {},
    );
    await cancelPendingAsyncHooks();
    Zd = false;
    $U();
    KU();
    VU();
    zU();
    gL();
    bridgeTurnKeepAwake();
    fL();
    await withTimeout(
      Promise.all([resolved_5, detachAllClients()]),
      30000,
      "session.detach hooks still running at teardown",
    ).catch(() => {});
    JU();
    tL();
    eL();
    ZU();
    nL();
    rL();
    XU();
    oi?.();
    rateLimitFrameRelay();
    Xa();
    jo?.dispose();
    release(Iw);
    if (pendingReloadSlot.get() === uv) pendingReloadSlot.set(undefined);
    clearForkCacheSafeParams();
    kU();
    syntheticOutputResult();
    _U();
    yU();
    bridgeSdkController.dispose();
    Bm = true;
    nextTurnRedialer.uninstall();
    let he = [...getState().mcp.clients, ...sdkClients, ...dynamicMcpState.clients];
    if (he.some((prev) => prev.type === "connected"))
      await getMcpClientModule().cleanupConnectedMcpClients(he);
    iL();
    await drainQueuedMessages(structuredIO, messageQueue);
    Ro.dispose();
    dc();
    oL();
    Ia.dispose();
    sL();
    currentAppState();
    await settlePendingPrLinks();
    if (
      shouldKillOnStreamClose({
        shuttingDown: isShuttingDown(),
        remoteTransport: structuredIO instanceof RemoteIO,
      })
    )
      killOrphanedShells(createTaskFramework(getState, setAppState));
    if (O) await O;
    su.close();
    Ni.disarm("session_ending");
    lu();
    cs.dispose();
    if (!to) {
      output.done();
      _a = true;
    }
  }
  let userDecisionReporter = createUserDecisionReporter(e, structuredIO.sessionState);
  let Pv = new TurnModelOverrideTracker({
    modelOverride: getMainLoopModelOverride,
    activeModel: () => userSpecifiedModel,
    setActiveModel: (O) => {
      userSpecifiedModel = O;
    },
    recordAllowedModelApplied,
    noticeRestrictedModel,
  });
  let th = new HeldResultsController({
    drain: ze,
    messageQueue,
    toolState,
    store: me,
    pendingNotificationWaits: io,
    storageV5: x.storageV5,
    sessionMirror: x.sessionMirror === true,
    flushSessionStorage,
    emit: (O) => output.enqueue(O),
    heldResultTotals: () => ({
      totalCostUsd: getTotalCostUSD(),
      durationApiMs: getTotalAPIDuration(),
      modelUsage: getModelUsage(),
      usage: undefined,
      subagentStats: buildFileHistorySnapshotChain(e),
      safetyStops: getSafetyStops(),
    }),
    turnAbortedForShutdown: Hr,
    shuttingDown: isShuttingDown,
    stopping: () => isShuttingDown() || isTerminalShutdown(),
    teardownRequested: isTeardownUnwindRequested,
    emitPendingSuggestion: () => promptSuggestionEmitter.emitPending(),
    handbackPointerResults: x.handbackPointerResults ?? new WeakSet(),
    lateReleasedResults: x.lateReleasedResults ?? new WeakSet(),
    autoModeStopNotices: x.autoModeStopNotices ?? new WeakMap(),
  });
  let Mv = new WorkerDirSyncReporter({
    workerDirSync: x.workerDirSync,
    enqueueSdkEvent: enqueueTaskNotification,
    turnEndUploadListener: x.turnEndUploadListener,
  });
  hasRequestBeenSent(e).then(() => setImmediate(releaseStartupWork, e.host, "turn_started"));
  let Av = new OneShotRunLimits({
    drain: ze,
    frameIntake: Oo,
    declinedRedeliveries: jn,
    held: Se,
    endsItsInput: !isSingleShotPrintSession(),
    isRemoteInput: () => structuredIO.isRemoteTransport(),
    maxTurns: x.maxTurns,
    maxBudgetUsd: x.maxBudgetUsd,
  });
  let turnRunner = new TurnDispatcher({
    messageQueue,
    drain: ze,
    prewaitLatch: Ro,
    turnOutcome: Nn,
    io: structuredIO,
    emit: (O) => {
      output.enqueue(O);
      if (O.type === "system" && O.subtype === "init") {
        try {
          let currentAppState = Ho();
          let he = jsonStringify(O.slash_commands);
          if (jsonStringify(mergeClients_2(currentAppState).map((rt) => rt.name)) !== he) {
            cd = he;
            of = true;
          } else if (cd === null) cd = jsonStringify(toSlashCommands(currentAppState));
        } catch (error) {
          logError(error);
        }
        iv();
      }
    },
    stopping: () => isShuttingDown() || isTerminalShutdown(),
    messages: () => messages_2,
    pendingMcpServerCount: () => count(getState().mcp.clients, (O) => O.type === "pending"),
    engine: () => {
      jo ??= QueryEngine(yc(_c()));
      jo.setModel(userSpecifiedModel);
      cache();
      return jo;
    },
    drainSdkEvents: ws,
    deferredToolUse: () => Cr,
    takeErrorRowBehind: (O) => {
      let Q = It.get(O);
      It.delete(O);
      return Q;
    },
    inTurnScope: ({ command, input }, he) => {
      let ke =
        typeof input === "string"
          ? input
          : extractTextContent_2(
              input,
              `
`,
            );
      let rt = (Gt) =>
        runWithContextKey(messageTurnAttributionKey(command), () =>
          command.ccrTurnIdEndsWithTurn
            ? runWithDroppableTurnId(command.ccrTurnId, Gt)
            : runWithCcrTurnId(command.ccrTurnId, Gt),
        );
      let dt =
        command.traceContext || command.linkedTraceContexts?.length
          ? {
              parent: command.traceContext,
              linked: command.linkedTraceContexts ?? [],
            }
          : undefined;
      return rt(() =>
        withWorkloadStorage(
          {
            workload: command.workload ?? x.workload,
            scheduledByPlugin: firstSchedulingPlugin([command]),
          },
          () => withInteractionSpan(ke, dt, he),
        ),
      );
    },
    onTurnStart: ({ command, members, input }) => {
      Av.turnStarted(members);
      Pv.noteTurnStart();
      hf.noteTurnStart({
        command,
        members,
      });
      reportStartedNotifications(
        {
          getAppState: getState,
          session: e,
        },
        members,
      );
      if (isSlashCommandPrompt(command, input, Ho)) e.requestJournal.recordMainThreadTurnStart();
      activityManager.startCLIActivity("print-ask");
      userDecisionReporter(true);
      zg = true;
      _f.noteTurnStart();
      Ia.noteTurnStart(members);
    },
    onFrame: (O, { command, refused }) => {
      if (command.handedOffTurn === undefined && !refused) Cr = undefined;
      hf.noteFrame(O);
      Ia.noteFrame(O);
      _f.noteFrame(O);
      if (
        command.shouldQuery !== false &&
        (O.type === "result" || (O.type === "system" && O.subtype === "init"))
      )
        settleOwedTitle(Tg);
      if (O.type === "system" && O.subtype === "compact_boundary") Ps = 0;
      Dd();
    },
    teeFrame: ns,
    plainDeltasNeedOnlyEmit: env.CLAUDE_CODE_PLAIN_DELTA_FAST_PATH
      ? () => vn === null && !hasQueuedTaskNotification(() => true)
      : undefined,
    onResult: (O, Q) => {
      Av.turnEnded(O);
      return th.route(O, Q);
    },
    afterTurnFinally: () => {
      if (
        messageQueue.peek(isActiveMainAgentCommand) === undefined &&
        !Oo.hasParked() &&
        !structuredIO.hasUnconsumedInput
      )
        setImmediate(releaseStartupWork, e.host, "turn_started");
      hf.noteTurnEnd();
      Ia.noteTurnEnd();
      _f.noteTurnEnd();
      Rg.noteTurnEnd(ja);
      userDecisionReporter(false);
      iv();
      Ld();
      Pv.adoptAtTurnEnd();
      let refreshedAppState = getMainLoopModel();
      reportBridgeModel(refreshedAppState);
      reportEffortForModel(refreshedAppState, getState());
      structuredIO.sessionState.notifyUltracodeActive(
        isUltracodeActive(getState().ultracode, refreshedAppState),
      );
      if (!isShuttingDown()) structuredIO.sessionState.markResumableOrphanedAgentsToldAtTurnEnd();
      buildBridgeInitializeCommands(Il, Om);
      mirrorTokenUsageToBridge();
      na("turn_end", {
        force: true,
      });
      endInteractionSpan();
      activityManager.endCLIActivity("print-ask");
    },
  });
  let drainSettle = new TurnGate({
    drain: ze,
    messageQueue,
    deliveryLedger,
    declinedRedeliveries: jn,
    io: structuredIO,
    emit: (O) => output.enqueue(O),
    drainSdkEvents: ws,
    flushTranscript: () => structuredIO.flushInternalEvents(),
    flushAcks: () => structuredIO.flushDeliveryAcks(),
    stopping: isShuttingDown,
    idleRelease,
    kick: () => void Os(),
    endSessionHead: isTeamShutdownReminder,
    reportContextUsage: reportAtTurnEnd,
    decideIdleReport: () => Ie.decideIdleReport(),
    pushCost: wv,
    startRecap: () => {
      maybeStartCcrRecap(e.ccrRecap, structuredIO.sessionState);
    },
    startStopRetirementDue: () => Ie.startStopRetirementDue(),
    rearmNudge: () => {
      rearmNotificationNudge({
        getAppState: getState,
        setAppState,
        session: e,
      });
      if (lazySessionInboxPointers)
        lazySessionInboxPointers.sessionInboxPointers.peek(e)?.renotifyUnfetched(messageQueue);
    },
  });
  let Iv = new TeamLeadPoller({
    drain: ze,
    messageQueue,
    store: me,
    storageV5: x.storageV5,
    kick: () => void Os(),
    enqueueTeamShutdownPrompt: bv,
  });
  let Ov = new SparedWindowReporter({
    drain: ze,
    io: structuredIO,
    stopping: () => isShuttingDown() || isTerminalShutdown(),
  });
  let Dv = () => Ov.report();
  let userMessageUuid;
  let turnStartTime;
  let Uv;
  if (x.workerDirSync !== undefined)
    x.turnGate?.register(dirSyncPullParticipant(x.workerDirSync, e, undefined));
  let nh = new HeadlessTurnLoop({
    drain: ze,
    messageQueue,
    prewaitLatch: Ro,
    deliveryLedger,
    turnRunner,
    drainSettle,
    turnOutcome: Nn,
    io: structuredIO,
    emit: (O) => output.enqueue(O),
    drainSdkEvents: ws,
    stopping: isShuttingDown,
    terminalShutdown: isTerminalShutdown,
    endSessionHead: isTeamShutdownReminder,
    commandLacksUserIntent: isPassiveCommand,
    repeatsUsageLimitAlert: (O) => isUsageLimitDenialStale(O, messages_2, () => Ao() ?? getMainLoopModel()),
    revokeCodeliveredFollowups: forgetCodeliveredFollowups,
    deferredToolUsePending: () => Cr !== undefined,
    idleRelease,
    turnGate: x.turnGate,
    session: e,
    sessionMirror: x.sessionMirror,
    host: {
      onEntry: () => {
        setAwaitsFirstRun(false);
        Ov.runEntered();
        if (!Ie.inheritedPromptOwnsWorkerStatus()) Dv();
        resetRecapState(e.ccrRecap);
      },
      beforeDrain: () => ra.beforeDrain(),
      openRun: () => {
        let throttledLogger = makeThrottledLogger(keepAliveSender, env.CLAUDE_CODE_REMOTE);
        let pulseInboxFrameActivity = makeThrottledLogger(keepAliveSender, true);
        let he = new BackgroundTaskWaiter({
          drain: ze,
          messageQueue,
          io: structuredIO,
          store: me,
          toolState,
          detachedToolCalls: detachedCallSlots.of(e),
          pendingNotificationWaits: io,
          ccrRecap: e.ccrRecap,
          maxBudgetUsd: x.maxBudgetUsd,
          storageV5: x.storageV5,
          turnAbortedForShutdown: Hr,
          stopping: isShuttingDown,
          sessionSignal: abortController.signal,
          spendRecorded: e.costLedger.spendRecorded,
          pulseKeepAlive: throttledLogger,
          hasPendingSessionWakeup: ({ now, parkedSince }) =>
            Mr() &&
            (kn > 0 ||
              hasPendingLoopWakeup(getSessionCronTasks(), {
                now,
                parkedSince,
              })),
          pendingSessionWakeupIds: () =>
            getSessionCronTasks()
              .filter((ke) => ke.kind === "loop")
              .map((ke) => ke.id),
          hasLiveSessionWakeup: (now) =>
            En() &&
            (!ze.inputClosed || isTidySlothGateOn()) &&
            (kn > 0 ||
              hasPendingLoopWakeup(getSessionCronTasks(), {
                now,
                parkedSince: 0,
              })),
          waitNoticeOnStderr: shouldShowBackgroundWaitStatus({
            outputFormat: x.outputFormat,
            stderrIsTerminal: process.stderr.isTTY === true,
            stdoutIsTerminal: process.stdout.isTTY === true,
          }),
          startStopRetirementDue: () => Ie.startStopRetirementDue(),
          onIdleReported: () => {
            if (lazySessionInboxPointers)
              lazySessionInboxPointers.sessionInboxPointers.peek(e)?.renotifyUnfetched(messageQueue);
          },
        });
        Uv = he;
        return {
          afterPass: ({ drained }) => {
            wv();
            mirrorTokenUsageToBridge();
            if (drained) reportAtTurnEnd();
            return he.park({
              drainedThisIteration: drained,
            });
          },
          afterRelease: function* () {
            try {
              return yield* Iv.poll({
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
      loopTop: () => ra.loopTop(),
      setAsideHeldInput: () => Se.setAside(),
      holdsEvalSettles: () => Uv?.holdsEvalSettles() ?? false,
      onLoopTopWork: () => {
        resetRecapState(e.ccrRecap);
        let state = structuredIO.sessionState.getState();
        if (
          state === "idle" &&
          !isTerminalShutdown() &&
          (ze.runningReported || !Ie.registrationKeepsPendingAction)
        )
          structuredIO.sessionState.notifyStateChanged("running");
        else if (state === "running" && ze.runPhase !== undefined && !isTerminalShutdown())
          structuredIO.sessionState.wipeTurnScopedMetadata();
      },
      onRescueGaveWay: () => Ie.rescueGaveWay(),
      onHead: () => {
        if (ze.intentBatchInFlight) x.homeSeed?.record.markFirstCommandDequeued();
        Nr?.();
        resetPdfPagesThisTurn(e);
      },
      replayMerged: (O, Q) => {
        if (!x.replayUserMessages) return;
        for (let he of O)
          if (he.uuid && he.uuid !== Q.uuid) {
            let ke = normalizeTaskNotificationOrigin(he.origin);
            output.enqueue({
              type: "user",
              message: {
                role: "user",
                content: he.value,
              },
              session_id: getSessionId(),
              parent_tool_use_id: null,
              uuid: he.uuid,
              isReplay: true,
              ...(he.isMeta && {
                isSynthetic: true,
              }),
              ...(he.fileAttachments?.length && {
                file_attachments: he.fileAttachments,
              }),
              ...(ke && {
                origin: ke,
              }),
            });
          }
      },
      firstCommand: () => ra.firstCommand(),
      accountPluginsJoin: ({ command }) =>
        ra.accountPluginsJoin(() => {
          try {
            return isImmediateCommandCandidate(command, () => Ho());
          } catch (error) {
            logError(error);
            return true;
          }
        }),
      turnMountJoin: () => {
        if (zr) {
          let O = zr.takeFirstTurnJoins();
          if (!O.replyMount && !O.grants) return null;
          let Q = require("./chunk-wpq8yj9g.js");
          let PROJECTS_MOUNT_FIRST_COMMAND_WAIT_MS = Q.PROJECTS_MOUNT_FIRST_COMMAND_WAIT_MS;
          return Promise.all([
            O.replyMount
              ? Q.joinProjectsMountBeforeFirstCommand(
                  O.replyMount,
                  getState,
                  PROJECTS_MOUNT_FIRST_COMMAND_WAIT_MS,
                )
              : Promise.resolve(),
            O.grants
              ? withDeadline(O.grants, PROJECTS_MOUNT_FIRST_COMMAND_WAIT_MS).then(() => {
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
          enqueue: (O) => output.enqueue(O),
          storageV5: x.storageV5,
          credentials: x.credentials,
          ended: ze.whenEnding(),
        }),
      organizationsLoadGate: (O) =>
        refreshPluginHooksOnClaim(
          {
            enqueue: (Q) => output.enqueue(Q),
            storageV5: x.storageV5,
            credentials: x.credentials,
            ended: ze.whenEnding(),
          },
          O,
        ),
      sdkMcpServersJoin: ({ command }) => qg.join(command) ?? ra.sdkToolRelistJoin(command),
      deferredMcpServersJoin: ({ command }) => {
        let Q = isSlashCommandPrompt(command, command.mode === "poll-event" ? "" : command.value, Ho);
        return NU.join(Q);
      },
      inheritedPromptAnswerJoin: () => {
        try {
          return Ie.answerOnItsWay();
        } catch (error) {
          logError(error);
          return;
        }
      },
      wireTurn: () => ra.wireTurn(),
      onCommitted: ({ command, members }) => {
        ja = false;
        let he = turnAttributionKeyOf(members);
        userMessageUuid = he;
        Hs =
          he === undefined
            ? undefined
            : {
                userMessageUuid: he,
                anchor: messages_2.at(-1),
              };
        if (ze.intentBatchInFlight) x.homeSeed?.record.markFirstCommandDequeued();
        Bi = members.some(canBatchWith);
        try {
          if (
            ze.intentBatchInFlight &&
            command.mode === "prompt" &&
            !command.isMeta &&
            isSlashCommandPrompt(command, command.value, Ho)
          )
            nextTurnRedialer.turnStarted();
        } catch (error) {
          logError(error);
        }
        if (Ie.onCommitted(command)) Dv();
      },
      ...(Qa !== undefined && {
        refuseStart: async (O, Q) => {
          let he = await Qa.refuseStart(O, Q);
          ja = he !== undefined;
          if (
            he === undefined &&
            isNonRestPromptBatch(O) &&
            isSlashCommandPrompt(O.command, O.command.value, Ho)
          )
            Rg.start(O.command.ccrTurnId);
          if (he !== undefined) {
            markRecapStartedForTurnEnd(e.ccrRecap);
            Hi = true;
          } else if (Hi) {
            Hi = false;
            clearRecapStartedForTurnEnd(e.ccrRecap);
          }
          return he;
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
          Ys();
          Ni.disarm("live_turn");
        }
        turnStartTime = Mv.beforeTurn();
        let he = aheadOfStart ? undefined : sessionHooks;
        let retirement = Ie.retirement;
        if (retirement === undefined || he === undefined) return retirement ?? he;
        return Promise.all([retirement, he]).then(() => {
          return;
        });
      },
      afterTurn: ({ batch, signal, turnEnd }) => {
        Dd();
        vn?.serverVouch?.holds();
        Hs = undefined;
        vn?.sendResult(
          resolveTurnTerminalReason({
            userMessageUuid,
            outcome: turnEnd.result,
            aborted: classifyTurnAbort(ze, signal, turnEnd),
          }),
        );
        Mv.afterTurn({
          turnStartTime,
          signal,
          userEventUuids: batch.uuids,
        });
        if (!ja) promptSuggestionEmitter.afterResult(batch.command);
        oh.route();
        settleTurnReads(
          {
            getAppState: getState,
            setAppState,
            session: e,
          },
          {
            signal,
            turnEnd,
          },
        );
      },
      releaseHeld: () => th.release(),
      onCrash: (O) => {
        reportTurnLoopCrash(O);
        promptSuggestionEmitter.abort();
        gracefulShutdownSync(1);
      },
      onInputClosed: async () => {
        heldBackResult?.stop();
        heldBackResult = null;
        if ((await Tv()) === "handed-off");
        else await Rv();
      },
    },
  });
  let Lv = (O) => {
    let Q;
    try {
      Q = toError(O);
    } catch {
      Q = Error("non-Error value thrown");
    }
    if (_a || to || output.ended || isTerminalShutdown()) {
      logError(Q);
      return;
    }
    ze.endSessionRequested = true;
    to = true;
    output.error(Q);
  };
  let Os = () => nh.run().catch(Lv);
  let Sf = (O, Q) => {
    for (let he of messageQueue.removeByFilter(
      (ke) =>
        ke.clientBashCommand === true && (Q === undefined || (ke.uuid !== undefined && Q.names([ke.uuid]))),
      {
        reason: O,
      },
    ))
      emitBangCommandNotRun(
        {
          emit: (ke) => output.enqueue(ke),
          sessionId: getSessionId(),
        },
        typeof he.value === "string" ? he.value : "",
        O === "session_ended" ? "session_ended" : "stopped",
      );
  };
  Vs = () => Sf("session_ended");
  let Bv;
  let rh;
  let Hv = () => (Bv ??= getFeatureValue_SESSION_PINNED("tengu_cloud_session_shell", false) === true);
  let conversation =
    structuredIO instanceof RemoteIO
      ? {
          joins: () => {
            if (rh !== undefined) return rh;
            if (Bv !== undefined || hasFreshGrowthBookFeatures()) return Hv();
            return (rh = withDeadline(
              initializeGrowthBook().catch(() => null),
              PRINT_TURN_FLUSH_DELAY_MS,
            ).then(Hv));
          },
          enqueue: (value, Q, he) => {
            messageQueue.enqueue({
              mode: "bash",
              clientBashCommand: true,
              ...(he !== undefined && {
                clientBashCommandCwd: he,
              }),
              value,
              uuid: Q,
              turnAttributionKey: Q,
              agentId: mainAgentId(),
            });
            Os();
          },
        }
      : undefined;
  let oh = new ResultWakeRouter({
    drain: ze,
    messageQueue,
    getTasks: () => getState().tasks,
    canUseTool,
    maxBudgetUsd: x.maxBudgetUsd,
  });
  let fL = oh.startStrandedResume(createTaskFramework(getState, setAppState));
  let bridgeTurnKeepAwake = createBridgeTurnKeepAwake(structuredIO.sessionState);
  let gL = watchTaskChanges({
    store: me,
    drain: ze,
    io: structuredIO,
    ccrRecap: e.ccrRecap,
    stopping: () => isShuttingDown() || isTerminalShutdown(),
    idleAllowedAtTurnEnd: () => Ie.retirement === undefined && Ic(),
  });
  installWakeRouterKick({
    messageQueue,
    drain: ze,
    routeWakes: () => oh.route(),
    kick: () => void Os(),
  });
  startHostReturnWakes({
    toolState,
    messageQueue,
    drain: ze,
    permissionMode: () => getState().toolPermissionContext.mode,
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
    Os();
  }
  {
    let { setOnEnqueue } = require("./chunk-cgamr0t5.js");
    setOnEnqueue(() => {
      if (!ze.inputClosed) {
        cancelPendingUserDialogs(structuredIO, "uds_message");
        Os();
      }
    });
  }
  let waitingStatusReporter = createWaitingStatusReporter(x.storageV5);
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
    } = require("./chunk-p4c203y6.js");
    setOnPeerIdleNotice((pt) => {
      logForDebugging(
        `[headless] cross-session idle notice: kind=${pt.kind} label=${fragmentForLog(pt.label)}`,
      );
      if (!pt.modelVisible) return;
      enqueueIdleNoticesForModel([pt]);
      if (!ze.inputClosed) {
        cancelPendingUserDialogs(structuredIO, "uds_message");
        Os();
      }
    });
    setIdleLastTurnTextProvider(() => getLastAssistantTextForResult(messages_2));
    {
      let { registerReplyYieldHolder, notifyModelOfReplyYield } = require("./chunk-4te7h8m1.js");
      registerReplyYieldHolder({
        yielded: (Dt) => {
          logForDebugging(
            `[headless] yielded Artifact comment replies for ${Dt.length} Artifact(s) to another session of this conversation`,
          );
          notifyModelOfReplyYield("yielded", Dt.length);
        },
        reverted: (Dt) => {
          logForDebugging(
            `[headless] ${Dt.length} yielded Artifact reply hand-off(s) came back to this session`,
          );
          notifyModelOfReplyYield("reverted", Dt.length);
        },
        stoppedElsewhere: (Dt) => {
          logForDebugging(
            `[headless] ${Dt.length} yielded Artifact reply hand-off(s) came back stopped by the other session`,
          );
          notifyModelOfReplyYield("stopped_elsewhere", Dt.length);
        },
      });
    }
    setOnIdleSubscribed(
      (pt, Xt) => {
        logForDebugging(
          `[headless] cross-session idle subscription recorded from ${fragmentForLog(pt)}${Xt ? "" : " (unverifiable sender)"}`,
        );
      },
      (pt) => {
        if (pt > 0)
          logForDebugging(
            `[headless] ${pt} more cross-session idle subscription(s) were recorded before this handler mounted`,
          );
      },
    );
    setHostStatusSubscription(
      structuredIO.sessionState.stateChanged.subscribe((pt) => {
        notePeerIdleStatus(pt === "idle", pt === "running");
      }),
    );
    let state = structuredIO.sessionState.getState();
    notePeerIdleStatus(state === "idle", state === "running");
  }
  if (lazyCronTools.isKairosCronEnabled() && !configProbeEnv()) {
    let O = (value, wakeupSource, dt, wakeupScheduledFor) => {
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
        ...(dt !== undefined && {
          scheduledByPlugin: dt,
        }),
        workload: WORKLOAD_CRON,
        ...(shouldStampThreadState({
          isPeer: false,
        }) && {
          stampThreadState: true,
        }),
      });
      cancelPendingUserDialogs(structuredIO, "cron_fire");
      Os();
    };
    let resolved = Promise.resolve();
    let he = (ke, wakeupSource, dt, Gt, pt, wakeupScheduledFor) => {
      if (ze.inputClosed && !(dt && Mr())) return;
      let storageV5 = x.storageV5;
      if (storageV5) {
        if (dt) kn++;
        resolved = resolved.then(async () => {
          try {
            let loopDefaultFireAsync = await lazyAutonomousLoop.resolveLoopDefaultFireAsync(
              e.autonomousLoopPreamble,
              ke,
              storageV5,
            );
            if (ze.inputClosed && !(dt && Mr())) return;
            O(loopDefaultFireAsync, wakeupSource, Gt, wakeupScheduledFor);
            pt?.();
          } catch (error) {
            logForDebugging(`[ScheduledTasks] loop.md v5 expansion failed; fire skipped: ${error}`);
          } finally {
            if (dt) kn--;
          }
        });
        return;
      }
      let loopDefaultFire = lazyAutonomousLoop.resolveLoopDefaultFire(e.autonomousLoopPreamble, ke);
      O(loopDefaultFire, wakeupSource, Gt, wakeupScheduledFor);
      pt?.();
    };
    heldBackResult = lazyCronScheduler.createCronScheduler({
      onFire: (ke) => he(ke, "schedule_wakeup", false),
      onMissed: wrapScheduledTaskBatchRunner((ke, rt, dt) =>
        he(lazyCronScheduler.buildMissedTaskNotification(ke), "schedule_wakeup", false, rt, dt),
      ),
      onFireTask: wrapScheduledTaskRunner((ke, rt) =>
        he(ke.prompt, wakeupSourceForKind(ke), ke.kind === "loop", ke.plugin, rt, ke.scheduledFor),
      ),
      isLoading: () =>
        ze.inputClosed
          ? !(ze.running && ze.runPhase === "waiting_for_agents" && Mr())
          : isBusyOrClosed({
              running: ze.running,
              runPhase: ze.runPhase,
              inputClosed: ze.inputClosed,
            }),
      filter: (prompt) => !ze.inputClosed || prompt.kind === "loop",
      leaseFileTasks: () => !ze.inputClosed,
      getJitterConfig: lazyCronJitterConfig.getCronJitterConfig,
      isKilled: () => !lazyCronTools.isKairosCronEnabled(),
    });
    heldBackResult.start();
  }
  let m1 = new Map();
  let kf = new FlagSettingsClaimTracker();
  let sendControlResponseSuccess = function (message, response) {
    if (message.request.subtype === "apply_flag_settings") kf.answered(message.request_id);
    output.enqueue(controlSuccessResponse(message.request_id, response));
  };
  let sendControlResponseError = function (message, errorMessage) {
    if (!(structuredIO instanceof RemoteIO)) {
      sendControlResponseSuccess(message, errorMessage);
      return;
    }
    output.enqueue(markLiveOnlyResponse(message.request_id, errorMessage));
  };
  let Ws = function (O, Q) {
    if (isTransportBacked(e))
      logForDebugging(`${O}: ${Q}`, {
        level: "error",
      });
  };
  let yt = function (O, Q, he, ke) {
    if (O.request.subtype === "apply_flag_settings") kf.answered(O.request_id, Q);
    output.enqueue(controlErrorResponse(O.request_id, Q, he, ke));
  };
  let Xn = function (O, Q, error, ke = {}, rt) {
    yt(O, controlHandlerError(isTransportBacked(e), Q, error, ke).error, rt);
  };
  let sh = function (O, Q) {
    if (Q.subtype === "success") sendControlResponseSuccess(O, Q.response);
    else yt(O, Q.error);
  };
  let handledOrphanedToolUseIds = new Map();
  let hL = {
    canUseTool,
    toolUseContext: (message) =>
      ask(yc(_c()), {
        abortController: message,
        userSpecifiedModel,
      }),
    sessionAbortController: abortController,
    cancellableControlRequests: handledOrphanedToolUseIds,
  };
  let ah;
  let dh;
  let Qv;
  if (x.remoteToolsAdmission?.admitted === true)
    toolState.get(ReannounceRequester).provide((O, Q) => structuredIO.askToAnnounce(O, Q));
  let ingressTail = {
    current: Promise.resolve(),
  };
  let activeOAuthFlows = new Set();
  let SL = {
    session: e,
    sessionHooks: ps,
    engineState: getState,
    messageQueue,
    ingressTail,
    stopped: new AbortController().signal,
    storageV5: x.storageV5,
    credentials: x.credentials,
    flushSessionStorage,
    redactsPersistedLane: () => isTransportBacked(e),
  };
  let ingressTail_2 = {
    current: Promise.resolve(),
  };
  let wL;
  let $v = () =>
    (wL ??= (async () => {
      let { createWorkflowLaunchState, readWorkflowLaunchRecord, WORKFLOW_LAUNCH_DIGEST_ENV } =
        await import("./chunk-w9fbg439.js");
      let { fetchFilestoreBytes } = await import("./chunk-q02nzdea.js");
      let restoredWorkerState = await structuredIO.restoredWorkerState;
      return {
        host: e.host,
        state: createWorkflowLaunchState(
          readWorkflowLaunchRecord(restoredWorkerState?.internal?.workflow_launch),
        ),
        isRemoteTransport: () => structuredIO.isRemoteTransport(),
        postEvent: (dt) => output.enqueue(dt),
        prependUserMessage: (dt) => structuredIO.prependUserMessage(dt),
        ackProcessed: (dt) => structuredIO.onCommandLifecycle?.(dt, "completed"),
        getSessionId,
        fetchBundle: (dt) => fetchFilestoreBytes(dt),
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
  let Oc = function () {
    let interval = setInterval(
      (Q) => {
        try {
          Q.enqueue({
            type: "keep_alive",
          });
        } catch {}
      },
      30000,
      output,
    );
    return () => clearInterval(interval);
  };
  let bL = function (O, Q) {
    logEvent("tengu_sdk_control_request_progress", {
      status: fromEnum(Q.status),
    });
    output.enqueue({
      type: "system",
      subtype: "control_request_progress",
      request_id: O.request_id,
      ...Q,
      uuid: randomUUID(),
      session_id: getSessionId(),
    });
  };
  async function TL(O, request) {
    let he = {
      reload_claude_md: Boolean(request.reload_claude_md),
      reload_skills: Boolean(request.reload_skills),
      reload_plugins: Boolean(request.reload_plugins),
    };
    try {
      let directory = await registerRepoRoot(request.directory, () => getState().toolPermissionContext);
      if (getState().toolPermissionContext.additionalWorkingDirectories.has(directory))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `register_repo_root: ${sanitizeTelemetryString(request.directory)} is already a registered working directory`,
          "register_repo_root: directory is already a registered working directory",
          "already_registered",
        );
      setAppState((pt) => ({
        ...pt,
        toolPermissionContext: applyValidatedPermissionUpdate(pt.toolPermissionContext, {
          type: "addDirectories",
          directories: [directory],
          destination: "session",
        }),
      }));
      pinResolvedWorkingDirPath(directory);
      let additionalDirectoriesForClaudeMd = getAdditionalDirectoriesForClaudeMd();
      if (!additionalDirectoriesForClaudeMd.includes(directory))
        setAdditionalDirectoriesForClaudeMd([...additionalDirectoriesForClaudeMd, directory]);
      SandboxManager.refreshConfig();
      let dt = Oc();
      executeDirectoryAddedHooks(e, directory, "register_repo_root", {
        storageV5: x.storageV5,
        credentials: x.credentials,
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
        .finally(dt);
      if (request.reload_claude_md) {
        clearMemoryFilesCache(e);
        let pt = join(directory, "CLAUDE.md");
        if (!ba.includes(pt)) ba.push(pt);
        if (isAdditionalDirWithoutNestedMemory(directory)) invalidateUserContext(e, "directory_added");
      }
      if (request.reload_skills) await reloadSkillsAfterDirectoryChange();
      if (request.reload_plugins) {
        await Promise.race([
          Promise.allSettled([installPluginsForHeadlessSerialized(undefined, x.storageV5, x.credentials)]),
          sleep(pluginInstallTimeoutMs()),
        ]);
        await refreshActivePlugins(Ee, x.storageV5, x.credentials);
        He = true;
        let pt = new Set(Object.keys(dynamicMcpState.configs));
        let Xt = new Set(
          getState()
            .mcp.clients.filter((client) => !pt.has(client.name))
            .map((client) => client.name),
        );
        await Promise.allSettled([Bl(Xt, "reload_plugins")]);
      }
      let Gt = {
        directory: isTransportBacked(e) ? request.directory : directory,
      };
      sendControlResponseSuccess(O, Gt);
      logFeatureOk("sdk_register_repo_root", he);
    } catch (error) {
      let rt = registerRepoRootErrorClass(error);
      let dt = rt === undefined ? undefined : REGISTER_REPO_ROOT_ERROR_TONES[rt];
      Xn(O, "register_repo_root", error, {
        expected: dt === "sad" || dt === "bad",
      });
      if (rt !== undefined && dt === "sad") logFeatureSad("sdk_register_repo_root", rt, he);
      else logFeatureBad("sdk_register_repo_root", rt ?? "error", he);
    }
  }
  async function RL(O, request) {
    try {
      let { stageFile, addDirectoryDestFromMountPath } = await import("./chunk-q02nzdea.js");
      let rt;
      try {
        rt = addDirectoryDestFromMountPath(request.mount_path);
      } catch (error) {
        Ws("add_directory dest", errorMessage(error));
        yt(O, pickForTransport(e, errorMessage(error), "add_directory failed"));
        return;
      }
      if (!isEnvTruthy(env.CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD)) {
        yt(
          O,
          "add_directory requires CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD to be set in the container environment",
        );
        return;
      }
      let dt = await stageFile({
        mount_path: request.mount_path,
        force: true,
      });
      if (!dt.ok) {
        Ws("add_directory stage", dt.error);
        yt(O, pickForTransport(e, dt.error, "add_directory failed"));
        return;
      }
      let Gt = dirname(rt);
      let additionalDirectoriesForClaudeMd = getAdditionalDirectoriesForClaudeMd();
      if (!additionalDirectoriesForClaudeMd.includes(Gt))
        setAdditionalDirectoriesForClaudeMd([...additionalDirectoriesForClaudeMd, Gt]);
      clearMemoryFilesCache(e);
      invalidateUserContext(e, "directory_added");
      await reloadSkillsAfterDirectoryChange();
      if (isTransportBacked(e)) {
        Ws("add_directory staged", `${rt} (${Gt})`);
        sendControlResponseSuccess(O, {});
      } else
        sendControlResponseSuccess(O, {
          staged_path: rt,
          directory: Gt,
        });
    } catch (error) {
      Xn(O, "add_directory", error);
    }
  }
  Ie.seedHandledToolUseIds();
  let recoveredToolUseIds = new Set([...(supersededToolUseIds ?? []), ...(x.answeredToolUseIds ?? [])]);
  let wf = (O = {}) => {
    promptSuggestionEmitter.discard();
    toolState.get(HostReturnWakeTracker).stopped();
    if (O.keepDetachedToolCalls !== true) detachedCallSlots.of(e).stopRunning();
    if (O.retireParkedPermission !== false) Ie.fire(O.parkedPermissionReason ?? "interrupt");
    Rg.stop();
  };
  structuredIO.setUnexpectedResponseCallback((O) => Ie.onUnexpectedResponse(O));
  let oauthCallbackSubmitters = new Set();
  let oauthManualCallbackUsed = new Map();
  let oauthAuthPromises = new Map();
  let claudeOAuth = null;
  (async () => {
    if (xl) await xl;
    Ie.arm();
    let O = new HeldInputReader({
      source: structuredIO.structuredInput,
      isRequestOut: () => structuredIO.hasPendingRequests(),
      onRequestOut: (j) => structuredIO.onRequestPending(j),
    });
    let Q = false;
    let he = () =>
      ze.running ||
      messageQueue.peek(isActiveMainAgentCommand) !== undefined ||
      Oo.hasParked() ||
      structuredIO.hasUnconsumedInput ||
      O.hasSetAside();
    yieldStartupWorkToTurn(e.host, he);
    let ke = (j = false) => {
      if (!Q && !j && !he()) Fr();
      Q = true;
      deferred_2.resolve();
    };
    latchWriteAttempt(
      vc,
      messages.some((j) => j.type === "user" || j.type === "assistant") || isTerminalTitleEnabled(),
    );
    let startTime_2 = performance.now();
    recordPhase("input_ready_ms", startTime_2, 0);
    recordInputReadyFromSpawn();
    let dt = new InputLatencyLedger(startTime_2);
    if (ud && !Yd && isIdlePluginRefreshEnabled()) {
      let j = ud;
      idleRefreshRan = true;
      Ag = j;
      Yd = waitForPluginSyncBudget({
        pluginsSync: j,
        remainingSyncBudgetMs: () => pluginInstallTimeoutMs() - (performance.now() - startTime),
        onSyncOutlivedBudget: () => {
          idleRefreshSyncTimedOut = true;
        },
        serverNamesOwnedBeforePluginsSync: Zm,
        refreshPluginState: async () => {
          let vo = Jd?.needsRefresh === true;
          await Cc();
          if (vo && Jd) Jd.needsRefresh = false;
        },
      }).then((vo) => {
        Tc = vo ?? null;
      });
    }
    let Gt = setJitPolicyAfterStartup();
    logForDiagnosticsNoPII("info", "cli_message_loop_started", () => ({
      ...(Gt !== 1 && {
        jit_policy: Gt,
      }),
      cc_version: {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
      ...bytecodeOrderStats(),
    }));
    headlessProfilerCheckpoint("stdin_listen_started");
    expectStartupHandshake(e.host);
    if (
      env.CLAUDE_CODE_RESUME_INTERRUPTED_TURN &&
      structuredIO.isRemoteTransport() &&
      (await structuredIO.restoredWorkerState)?.internal?.workflow_launch != null
    ) {
      Xo++;
      (async () => {
        let { resumeWorkflowLaunch } = await import("./chunk-w9fbg439.js");
        await resumeWorkflowLaunch(await $v());
      })()
        .catch((error) => {
          logForDebugging(`[print.ts] workflow_launch resume failed: ${toError(error).message}`);
        })
        .finally(() => {
          Xo--;
          if (!ze.running) timeoutMs.start();
        });
    }
    let pt = (j) => ({
      storedAt: sessionStreamCreatedAt(j),
      serviceNow: structuredIO.sessionServiceNow(),
      newestFrameAt: structuredIO.newestSessionStreamCreatedAt(),
      machineNow: Date.now(),
    });
    let Xt = () => Ie.holdingParkedPermission() && !ze.running;
    let Dt = () => reportsRunningBackgroundTasksExplicit() && hasActiveInProcessTeammates(getState());
    let On = () => (ze.running && ze.runPhase !== "waiting_for_agents") || Rt();
    let fn = () =>
      (ze.running &&
        ze.runPhase !== "waiting_for_agents" &&
        (ze.dequeueCount > 0 || Ie.retirement !== undefined || Oo.hasParked())) ||
      Rt();
    let Rt = () =>
      Dt() || (structuredIO.sessionState.getState() === "requires_action" && !Xt()) || Ie.stopRetirementOwed;
    let Zt = () =>
      messageQueue.getDrainableMainThreadQueueLength() > 0
        ? "commands_queued"
        : !ze.running && structuredIO.sessionState.getState() === "requires_action"
          ? "prompt_pending"
          : "turn_running";
    let Ar = (j, request) => {
      if (isImmediateInterruptRequest(request)) {
        let ai = handleRemoteCancel({
          messageQueue,
          drain: ze,
          prewaitLatch: Ro,
          frameIntake: Oo,
          io: structuredIO,
          pressed: request.message_uuid,
          deliver: () => Ia.pressWaiting(),
          letHeldGo: (Pi) => runSafely(() => Ie.letPressedMessagesGo(Pi)),
        });
        if (ai.send_now === "stopped")
          logQueuedInterruptDecision({
            queued: messageQueue.getCommandQueueSnapshot(),
            turnUnderWay: ze.turnUnderWay,
            lateBind: false,
            cancelQueued: false,
            sendNow: true,
          });
        sendControlResponseSuccess(j, ai);
        logFeatureOk("headless_interrupt_send_now", {
          outcome: fromEnum(ai.send_now),
        });
        return;
      }
      let cancelQueuedTarget = parseCancelQueuedTarget(request);
      let Ds = isLateBindInterruptRequestId(j.request_id);
      let ql = !Ds && request.worker_epoch === undefined;
      if (ql) {
        Do.interrupt(cancelQueuedTarget);
        Sf("cleared_on_cancel", request.cancel_queued === true ? undefined : cancelQueuedTarget);
      }
      if (
        isCancelAimedAtParkedBatch({
          drain: ze,
          prewaitLatch: Ro,
          aim: cancelQueuedTarget,
        })
      ) {
        let { receipt } = cancelQueuedMessages({
          cancelQueued: false,
          turn: "spared",
          messageQueue,
          drain: ze,
          prewaitLatch: Ro,
          waitingCopies: jn,
          io: structuredIO,
        });
        on(() =>
          Ie.noteAStopsReceipt(receipt, {
            aim: cancelQueuedTarget,
            lateBind: Ds,
          }),
        );
        sendControlResponseSuccess(j, receipt);
        return;
      }
      let Ci = interruptCurrentTurn({
        drain: ze,
        prewaitLatch: Ro,
        aim: cancelQueuedTarget,
        cancelQueued: request.cancel_queued === true,
        lateBind: Ds,
      });
      requeueTakenMessage({
        cancelQueued: request.cancel_queued === true,
        messageQueue,
        io: structuredIO,
      });
      if (ql) Ia.notePersonsStop();
      let jr = Rd();
      let Ko = killAutoReactSubscriptions(jr.taskRegistry, {
        durable: false,
      });
      let Mu = drainQueuedTaskNotifications(messageQueue, {
        leaveArtifactRooms: true,
      });
      wf();
      logQueuedInterruptDecision({
        queued: messageQueue.getCommandQueueSnapshot(),
        turnUnderWay: ze.turnUnderWay,
        lateBind: isLateBindInterruptRequestId(j.request_id),
        cancelQueued: request.cancel_queued === true,
        sendNow: false,
      });
      let { receipt, clearSurvivors } = watchNudgeCancel(
        {
          getAppState: getState,
          setAppState,
          session: e,
        },
        () =>
          cancelQueuedMessages({
            cancelQueued: request.cancel_queued === true,
            turn: cancelQueuedTarget && (Ci ? "stopped" : "idle"),
            messageQueue,
            drain: ze,
            prewaitLatch: Ro,
            waitingCopies: jn,
            io: structuredIO,
          }),
      );
      let Ql = on(() =>
        Ie.noteAStopsReceipt(receipt, {
          aim: cancelQueuedTarget,
          lateBind: Ds,
        }),
      );
      sendControlResponseSuccess(
        j,
        Ql.length === 0
          ? receipt
          : {
              ...receipt,
              cancelled: [...(receipt.cancelled ?? []), ...Ql],
            },
      );
      if (Ko > 0 || Mu.length > 0) artifactWatchStopNotice(Ko, Mu);
      requeueStopNotifications(messageQueue, clearSurvivors, Ko);
    };
    let no = {
      admission: x.turnHandoffAdmission ?? {
        admitted: false,
        reason: "not_managed_cloud_worker",
      },
      tools: Ri,
      toolAliases: () => x.toolAliases,
      mcpClients: rows,
      messages: () => messages_2,
      handledToolUseIds: Ie.handledToolUseIds,
      recoveredToolUseIds,
      messageQueue,
      drain: ze,
      kick: () => void Os(),
      redactsPersistedLane: () => isTransportBacked(e),
      appliedRewind: () => wa,
      linesWaitingAhead: () => On() || messageQueue.getCommandQueue().some(isPassiveQueueItem),
      carriedWritesMode:
        x.turnHandoffAdmission?.admitted && isClaudeAiChatOrigin()
          ? () =>
              isCarriedWritesEnabled() || hasSaidCarriedWrites()
                ? getState().toolPermissionContext.mode
                : undefined
          : undefined,
      personStopped: () => toolState.get(HostReturnWakeTracker).stopped(),
      personWrote: () => e.userPresence.notePersonWrote(),
      stopUnabortedWork: () => {
        wf();
      },
    };
    if (isParkedSpare()) {
      profileCheckpoint("spare_parked");
      headlessProfilerCheckpoint("spare_parked");
      addStartupContext({
        spare: 1,
      });
    }
    let pd = limitConcurrency(PRINT_TURN_MAX_ATTEMPTS, async (j) => {
      let { listDirectoryForRemote } = await import("./chunk-cxcyfn5m.js");
      let projectRoot = getProjectRoot();
      let Ds = () => getOriginalCwd() !== projectRoot;
      if (Ds()) throw repoRootError("workspace_moved");
      return listDirectoryForRemote(j, projectRoot, () => getState().toolPermissionContext, Ds);
    });
    let stranded = {
      probes: 0,
    };
    let Rs = async (request, vo) => {
      let { readFileForRemote } = await import("./chunk-kkqmctap.js");
      return readFileForRemote(request.path, request.max_bytes, () => getState().toolPermissionContext, {
        encoding: request.encoding,
        anchor: request.anchor,
        telemetrySource: "headless_stream",
        asWrittenSources: vo && {
          heldFiles: () => readFilesFromMessages.everHeldPaths(),
          timeLimitMs: LOGIN_RESTORE_TIMEOUT_MS,
          stranded,
          whyNotServed: () => readFileAsWrittenUnservedReason(e),
          whyNotBegin: () => {
            let startTime = performance.now();
            return startTime >= pr
              ? "session_ending"
              : startTime - vo.askedAt >= LOGIN_REVOKE_TIMEOUT_MS
                ? "waited_too_long"
                : undefined;
          },
          onRefusal: vo.onRefusal,
        },
      });
    };
    let Ua = limitConcurrency(1, Rs);
    let gd = limitConcurrency(1, Rs);
    if (hostSessionsBearerOffered())
      setHostSessionsBearerSource({
        ask: () => structuredIO.requestHostSessionsBearer(),
        isSignInToken: isClaudeAISignInToken,
        hasSignIn: isClaudeAIOAuthTokenHostInjected,
      });
    for await (let j of O) {
      if (Q && !No && j.type !== "user" && !he()) Fr();
      if (isTerminalShutdown() && j.type !== "control_response") continue;
      let vo =
        isDisplayOnlyHistoricalMessage(j) &&
        (j.type === "user" ? oo : remoteControlForkChild?.isFork() === true);
      let uuid = "uuid" in j ? j.uuid : undefined;
      if (uuid && isUnhandledIngressType(j)) structuredIO.onCommandLifecycle?.(uuid, "completed");
      if (j.type === "control_request") {
        if (j.request.subtype === "apply_flag_settings") kf.received(j.request_id);
        let Bn = isUiSurfaceName(j.request.subtype);
        let wr = shouldRejectUiControl(
          j.request.subtype,
          () => structuredIO.uiSurfaceFrameOf(j, clientRegistry.list().length > 0),
          () => structuredIO.surfaceRequestJudgedAt(j),
        );
        if (
          Bn &&
          !wr &&
          isCalmOspreyGateOn() &&
          !leavesBelowFloor(() => structuredIO.uiSurfaceFrameOf(j, clientRegistry.list().length > 0))
        )
          Sv.heard();
        if (Bn && !wr) {
          surfaceDeclarationTracker.readmit(j);
          noteSurfaceClientHeard(j.request);
        }
        let To = false;
        let startTime = performance.now();
        ze.turnStartClock.controlRequestStarted(startTime);
        let Ba;
        let sa = false;
        let Qn = (le) => {
          To = true;
          if (uuid) structuredIO.onCommandLifecycle?.(uuid, "started");
          Promise.resolve()
            .then(le)
            .finally(() => {
              if (uuid) structuredIO.onCommandLifecycle?.(uuid, "completed");
            })
            .catch((error) => logError(error));
        };
        let Io = (le) => {
          To = true;
          if (uuid) structuredIO.onCommandLifecycle?.(uuid, "completed");
          Promise.resolve()
            .then(le)
            .catch((error) => logError(error));
        };
        try {
          if (isUnclaimedSpare() && !isAllowedBeforeClaim(j.request.subtype)) {
            yt(j, getSpareClaimState() === "failed" ? SPARE_CLAIM_FAILED_TEXT : SPARE_NOT_CLAIMED_TEXT);
            continue;
          }
          if (isKnownControlRequestSubtype(j.request)) {
            let request = j.request;
            let Re = request.subtype === "mcp_status" && request.liveReply === true;
            let be = (we) =>
              Re && we.subtype === "success" ? sendControlResponseError(j, we.response) : sh(j, we);
            if (handleSendTaskMessage_2(request, bc)) {
              let we = async () => be(await dispatchControlRequest(request, bc));
              Qn(() => {
                if (request.subtype !== "get_context_usage") return we();
                if (request.detail === "summary") return rateLimitListener(we());
                resolved_3 = rateLimitInfo(we);
                return resolved_3;
              });
            } else {
              let we = false;
              let Je = (gt) => {
                if (we) return;
                we = true;
                be(gt);
              };
              let it = dispatchControlRequest(request, {
                ...bc,
                replyNow: Je,
              });
              Je(it instanceof Promise ? await it : it);
            }
          } else if (j.request.subtype === "interrupt") Ar(j, j.request);
          else if (j.request.subtype === "end_session") {
            if (isArchivedAfterRestartNow(j.request.reason)) {
              logForDebugging(
                "[print.ts] stale 'archived' end_session ignored on epoch>1 \u2014 from prior lifecycle",
              );
              sendControlResponseSuccess(j);
              continue;
            }
            logForDebugging(`[print.ts] end_session received, reason=${j.request.reason ?? "unspecified"}`);
            ze.endSessionRequested = true;
            Sf("session_ended");
            requestTeardownUnwind();
            messageQueue.suspendMidTurnFold();
            if (ze.abortController) ze.abortController.abort(userAbortReason("shutdown"));
            Ys();
            abortController.abort();
            abortController_2.abort(userAbortReason("shutdown"));
            promptSuggestionEmitter.discard();
            sendControlResponseSuccess(j);
            break;
          } else if (j.request.subtype === "initialize") {
            endStartupMarkReporting();
            let sdkMcpServers = j.request.sdkMcpServers;
            let Re = false;
            let webSearchIsolationExemptMcpServers = j.request.webSearchIsolationExemptMcpServers;
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
              yt(
                j,
                "initialize: sdkMcpServers and webSearchIsolationExemptMcpServers must be arrays of strings",
              );
              continue;
            }
            let found = j.request.sdkMcpServers?.find(isPrototypeKey);
            if (found !== undefined) {
              yt(j, "initialize: " + reservedServerNameMessage(found));
              continue;
            }
            let sdkMcpServerConfigs = j.request.sdkMcpServerConfigs;
            let it = isPlainObject_2(sdkMcpServerConfigs) ? sdkMcpServerConfigs : undefined;
            if (sdkMcpServerConfigs != null && it === undefined)
              logForDebugging(
                "initialize: ignoring sdkMcpServerConfigs (not an object keyed by server name)",
                {
                  level: "warn",
                },
              );
            let hooks = j.request.hooks;
            if (
              hooks != null &&
              (typeof hooks !== "object" ||
                Array.isArray(hooks) ||
                Object.values(hooks).some(
                  (hn) =>
                    !Array.isArray(hn) ||
                    hn.some(
                      (jt) =>
                        jt === null ||
                        typeof jt !== "object" ||
                        !("hookCallbackIds" in jt) ||
                        !Array.isArray(jt.hookCallbackIds) ||
                        jt.hookCallbackIds.some((hookCallbackId) => typeof hookCallbackId !== "string") ||
                        ("matcher" in jt && jt.matcher != null && typeof jt.matcher !== "string"),
                    ),
                ))
            ) {
              yt(
                j,
                "initialize: hooks must map hook events to arrays of matchers carrying hookCallbackIds arrays and string matchers",
              );
              continue;
            }
            let skills = j.request.skills;
            if (
              skills !== undefined &&
              (!Array.isArray(skills) || skills.some((skill) => typeof skill !== "string"))
            ) {
              yt(j, "initialize: skills must be an array of strings");
              continue;
            }
            let en = typeof j.request.title === "string" ? sanitizeSessionTitle(j.request.title) : undefined;
            if (en) {
              vc.attempted = true;
              cacheSessionTitle(en);
              adoptSuppliedSessionTitle(en, x.storageV5).catch(logError);
            }
            let yn;
            if (j.request.sdkMcpServers && j.request.sdkMcpServers.length > 0) {
              let hn = Object.create(null);
              for (let sdkMcpServer of j.request.sdkMcpServers) {
                let Tr = getOwn(R, sdkMcpServer);
                let co = it ? getOwn(it, sdkMcpServer) : undefined;
                let { settings, ignored } = parseMcpServerSettings(co);
                for (let Er of ignored) {
                  let ss = Er === "tools" ? inspectToolsList(co) : undefined;
                  logForDebugging(
                    ss
                      ? `initialize: SDK MCP server '${sdkMcpServer}': ${describeToolsListIssues(ss)}`
                      : `initialize: ignoring invalid ${Er} for SDK MCP server '${sdkMcpServer}'; the default applies`,
                  );
                }
                hn[sdkMcpServer] = {
                  type: "sdk",
                  name: sdkMcpServer,
                  ...(settings.tools && {
                    tools: settings.tools,
                  }),
                };
                if (Tr) {
                  if (
                    Tr.timeout !== settings.timeout ||
                    (Tr.disableAutoBackground === true) !== (settings.disableAutoBackground === true) ||
                    Tr.connectorId !== settings.connectorId
                  )
                    logForDebugging(
                      `initialize: SDK MCP server '${sdkMcpServer}' is already registered, so a different timeout, disableAutoBackground or connectorId in this request is ignored (remove and re-add the server to change them)${settings.tools === undefined ? "" : "; its tools[] is applied"}`,
                    );
                  if (settings.tools !== undefined)
                    R[sdkMcpServer] = {
                      ...Tr,
                      tools: settings.tools,
                    };
                  continue;
                }
                R[sdkMcpServer] = {
                  type: "sdk",
                  name: sdkMcpServer,
                  ...settings,
                };
              }
              let serverToolPolicies = collectServerToolPolicies(hn);
              setAppState((xt) => {
                let Tr = mergeMcpServerPolicyRules(xt.toolPermissionContext, serverToolPolicies, "merge");
                return Tr === xt.toolPermissionContext
                  ? xt
                  : {
                      ...xt,
                      toolPermissionContext: Tr,
                    };
              });
              let sdkMcpServerManifests = j.request.sdkMcpServerManifests;
              let un =
                structuredIO instanceof RemoteIO &&
                sdkMcpServerManifests !== undefined &&
                sdkMcpServerManifests !== null &&
                isSdkMcpManifestsEnabled()
                  ? await manifestsDisabledReason({
                      origin: j.request.sdkMcpServerManifestsOrigin,
                      frameCreatedAt: sessionStreamCreatedAt(j),
                      sessionWriters: sessionStreamWriters(j),
                    })
                  : undefined;
              let Ht = isSdkMcpManifestsEnabled() && un === undefined;
              let hostManifests = parseHostManifests(sdkMcpServerManifests, j.request.sdkMcpServers);
              let Kn = new Set(sdkClients.filter((prev) => prev.type === "connected").map((xt) => xt.name));
              let dr =
                sdkMcpServerManifests === undefined || sdkMcpServerManifests === null
                  ? undefined
                  : Object.create(null);
              if (dr !== undefined && un !== undefined) {
                logForDebugging(
                  `initialize: sdkMcpServerManifests not honoured on this remote-session worker (${un}); SDK MCP servers will handshake over the control channel`,
                );
                logFeatureSad("mcp_sdk_manifest", `mcp_sdk_manifest_remote_${un}`);
              }
              if (hostManifests.malformedField) {
                if (dr !== undefined)
                  for (let serverName of j.request.sdkMcpServers) dr[serverName] = "malformed";
                if (Ht) {
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
                if (dr !== undefined) dr[malformedServerName] = "malformed";
                if (Ht) {
                  logForDebugging(
                    `initialize: sdkMcpServerManifests entry for '${malformedServerName}' is malformed \u2014 ignoring it; the server will handshake over the control channel`,
                    {
                      level: "warn",
                    },
                  );
                  logFeatureSad("mcp_sdk_manifest", "mcp_sdk_manifest_malformed_entry");
                }
              }
              let qt = false;
              for (let [xt, Tr] of hostManifests.manifests) {
                if (!Ht) {
                  if (dr !== undefined) dr[xt] = "not_honoured";
                  continue;
                }
                if (Kn.has(xt)) {
                  if (dr !== undefined) dr[xt] = "already_connected";
                  continue;
                }
                if (Tr.initializeResult.protocolVersion !== MCP_PROTOCOL_LATEST) {
                  logForDebugging(
                    `initialize: sdkMcpServerManifests entry for '${xt}' was not captured with MCP protocol ${MCP_PROTOCOL_LATEST} \u2014 ignoring it; the server will handshake over the control channel`,
                  );
                  logFeatureSad("mcp_sdk_manifest", "mcp_sdk_manifest_protocol_version_at_initialize");
                  if (dr !== undefined) dr[xt] = "protocol_version_mismatch";
                  continue;
                }
                $o.set(xt, Tr);
                if (dr !== undefined) dr[xt] = "parked";
                qt = true;
              }
              yn = dr;
              Re = qt;
              if (!Re) Ma();
            }
            if (j.request.webSearchIsolationExemptMcpServers)
              addExemptServers(isolationLatch, j.request.webSearchIsolationExemptMcpServers);
            let Et;
            try {
              Et = await handleInitializeRequest(
                j.request,
                j.request_id,
                Q,
                output,
                () => Ho(),
                Im,
                structuredIO,
                !!x.enableAuthStatus,
                x,
                () => agents,
                getState,
                setAppState,
                () => userSpecifiedModel,
                yn,
                () =>
                  waitBeforeInitializeReply({
                    rescan: () => df,
                    isReaderOwed: () =>
                      isShuttingDown() || isTerminalShutdown() || structuredIO.hasPendingRequests(),
                    lookAgainOn: [
                      (prev) => structuredIO.onRequestPending(prev),
                      (hn) => messageQueue.subscribe(hn),
                      (hn) => registerCleanup(async () => hn()),
                    ],
                  }),
                isTransportBacked(e),
                Object.keys(R),
                Ri,
              );
              cd = jsonStringify(Et.publishedCommands);
              if (jsonStringify(toSlashCommands(Ho())) !== cd) md();
            } finally {
              if (Re) {
                Re = false;
                Ma();
              }
            }
            if (Et.restrictedAgentModel) noticeRestrictedModel(Et.restrictedAgentModel);
            if (Et.mergedStdinAgents?.length) {
              let hn = new Set(agents);
              agents = [
                ...agents,
                ...Et.mergedStdinAgents.filter((mergedStdinAgent) => !hn.has(mergedStdinAgent)),
              ];
            }
            if (x.promptSuggestions && isPromptSuggestionSettingEnabled())
              setAppState((hn) => {
                if (hn.promptSuggestionEnabled) return hn;
                return {
                  ...hn,
                  promptSuggestionEnabled: true,
                };
              });
            if (j.request.agentProgressSummaries) setSdkAgentProgressSummariesEnabled(true);
            let Wn = !Q;
            ke();
            if (Wn && isDesktopTopSession() && !isParkedSpare()) announcePrStarted(e.host);
            if (messageQueue.peek(isActiveMainAgentCommand) !== undefined) Os();
          } else if (j.request.subtype === "set_permission_mode") {
            let request = j.request;
            if (request.from_settings === true && isByocEnvironment()) {
              logEvent("tengu_settings_mode_dropped_in_runner_child", {});
              sendControlResponseSuccess(j, {
                mode: toExternalPermissionMode(getState().toolPermissionContext.mode),
              });
              continue;
            }
            let permissionMode = parsePermissionMode(request.mode);
            if (permissionMode === undefined || !isExternalPermissionMode(permissionMode)) {
              yt(j, UNRECOGNIZED_PERMISSION_MODE_ERROR, "invalid_mode");
              continue;
            }
            if (permissionMode === "auto" && jd()) {
              let be = await applyAutoModeTransition(
                getState().toolPermissionContext,
                as,
                getState().fastMode,
                EVENT_LOGGING_FLAG_WAIT_MS,
              );
              if (be !== undefined) {
                yt(j, be.error, be.code);
                continue;
              }
            }
            setAppState((prev) => {
              let we = applyPermissionModeChange(request, prev.toolPermissionContext);
              if (!we.ok) {
                yt(j, we.error, we.code);
                return prev;
              }
              sendControlResponseSuccess(j, {
                mode: we.mode,
              });
              is(we.mode);
              return {
                ...prev,
                toolPermissionContext: we.context,
                isUltraplanMode: request.ultraplan ?? prev.isUltraplanMode,
              };
            });
          } else if (j.request.subtype === "set_proactivity_level") {
            let offerBypass = j.request.offer_bypass;
            let proactivityLevel = getState().proactivityLevel;
            let be = cycleProactivityLevel(j.request.level, getState, setAppState, x.storageV5, {
              offerBypass,
              cloudOptIn: env.CLAUDE_CODE_REMOTE ? structuredIO.sessionState : undefined,
            });
            if (be.ok) {
              if (be.response.level !== proactivityLevel) is(getState().toolPermissionContext.mode);
              sendControlResponseSuccess(j, be.response);
            } else yt(j, sanitizeTelemetryString(be.error));
          } else if (j.request.subtype === "set_model") {
            let request = j.request;
            let Re = mu(j.request_id);
            let be = async () => {
              try {
                let we = await handleSetModelRequest(request, nd);
                if (we.ok) {
                  await mc(Re);
                  for (let Je of we.notices ?? []) qd(Je);
                  sendControlResponseSuccess(j, {
                    model: Ao() ?? getMainLoopModel(),
                  });
                } else yt(j, we.error, we.code, Ao() ?? getMainLoopModel());
              } catch (error) {
                logError(toError(error));
                let Je;
                try {
                  Je = Ao() ?? getMainLoopModel();
                } catch (error) {
                  logError(toError(error));
                }
                yt(j, "set_model failed", "internal_error", Je);
              }
            };
            Qn(() => serializeModelSwitch(e, be));
          } else if (j.request.subtype === "set_cwd") {
            let request = j.request;
            try {
              let { handleSetCwdControlRequest } = await import("./chunk-frfx56e3.js");
              let be = ze.dequeueCount > 0;
              let we = await handleSetCwdControlRequest(request, {
                session: e,
                isBusy: () =>
                  Ie.inheritedPromptPending() ||
                  isBusy({
                    running: ze.running,
                    runPhase: ze.runPhase,
                    mainThreadQueueLength: messageQueue.getMainThreadQueueLength(),
                  }),
                toolPermissionContext: getToolPermissionContext({
                  getAppState: getState,
                }),
                retireDepartedAdditionalDirectories: (Je) => {
                  setAppState((it) => {
                    let gt = mergeTrustedDirectories(it.toolPermissionContext, Je);
                    return gt === it.toolPermissionContext
                      ? it
                      : {
                          ...it,
                          toolPermissionContext: gt,
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
                storageV5: x.storageV5,
                credentials: x.credentials,
                isFreshSession: eh,
                settlePlanAutoMode: () => {
                  setAppState((prev) => ({
                    ...prev,
                    toolPermissionContext: settlePlanAutoModeAtStart(prev.toolPermissionContext),
                  }));
                },
                requestBuilt: () => be,
              });
              if (we.kind === "response") {
                if (we.response.status === "ok" && we.response.changed)
                  try {
                    await ov("set_cwd", {
                      restartLaunchDirStdioServers: we.freshSession === true,
                    });
                  } catch (error) {
                    logForDebugging(
                      `set_cwd: re-homing plugins/MCP for the new directory failed (continuing): ${errorMessage(error)}`,
                      {
                        level: "error",
                      },
                    );
                  }
                let Je = isTransportBacked(e);
                let it =
                  we.response.status === "rejected" && Je
                    ? {
                        ...we.response,
                        message: "set_cwd: request rejected",
                      }
                    : we.response;
                sendControlResponseSuccess(j, it);
              } else yt(j, we.message);
            } catch (error) {
              let be = null;
              try {
                be = (await import("./chunk-frfx56e3.js")).safeWireMessage;
              } catch {
                be = null;
              }
              let we = be
                ? be(
                    errorMessage(error),
                    "(error detail withheld: it contains control or invisible characters)",
                  )
                : "(error detail unavailable)";
              let Je = be
                ? be(
                    `The session's working directory is ${getCwd()}.`,
                    "The session stayed in its previous working directory.",
                  )
                : "The session stayed in its previous working directory.";
              Ws("set_cwd", errorMessage(error));
              yt(
                j,
                `set_cwd: relocation failed \u2014 ${pickForTransport(e, we, "(error detail withheld)")}. ${pickForTransport(e, Je, "The session stayed in its previous working directory.")}`,
              );
            }
          } else if (j.request.subtype === "claim_session") {
            let mcpRequest = j.request;
            try {
              let { handleClaimSessionRequest } = await import("./chunk-7n18p51h.js");
              let be = await handleClaimSessionRequest(mcpRequest, {
                session: e,
                storageV5: x.storageV5,
                credentials: x.credentials,
                parkedSettingsRefusal: () => kf.claimRefusal(),
                permissionModeSuppliedOnInvocation: x.permissionModeSuppliedOnInvocation !== false,
                isBusy: () =>
                  Ie.inheritedPromptPending() ||
                  isBusy({
                    running: ze.running,
                    runPhase: ze.runPhase,
                    mainThreadQueueLength: messageQueue.getMainThreadQueueLength(),
                  }),
                isFreshSession: eh,
                startDeferredMcpServers: async () => {
                  let we = await x.startDeferredMcpServers?.(
                    new Set([
                      ...getState().mcp.clients.map((client) => client.name),
                      ...dynamicMcpState.clients.map((client) => client.name),
                      ...Object.keys(dynamicMcpState.configs),
                    ]),
                  );
                  ra.noteServersStartedSinceKick(we ?? []);
                },
                rehomePluginsAndMcp: () => ov("claim_session"),
                getToolPermissionContext: () =>
                  getToolPermissionContext({
                    getAppState: getState,
                  }),
                setToolPermissionContext: (we) => {
                  setAppState((Je) =>
                    Je.toolPermissionContext === we
                      ? Je
                      : {
                          ...Je,
                          toolPermissionContext: we,
                        },
                  );
                },
                retireDepartedAdditionalDirectories: (we) => {
                  setAppState((Je) => {
                    let it = mergeTrustedDirectories(Je.toolPermissionContext, we);
                    return it === Je.toolPermissionContext
                      ? Je
                      : {
                          ...Je,
                          toolPermissionContext: it,
                        };
                  });
                },
                applyPromptOptions: (we) => {
                  if (we.systemPrompt !== undefined)
                    x.systemPrompt = joinPromptValues(we.systemPrompt) ? "" : we.systemPrompt;
                  if (we.appendSystemPrompt !== undefined) x.appendSystemPrompt = we.appendSystemPrompt;
                  let Je = typeof we.title === "string" ? sanitizeSessionTitle(we.title) : undefined;
                  if (Je) {
                    vc.attempted = true;
                    cacheSessionTitle(Je);
                    adoptSuppliedSessionTitle(Je, x.storageV5).catch(logError);
                  }
                  if (we.agents) {
                    let agentsFromJson = parseAgentsFromJson(we.agents, "flagSettings");
                    let Ft = new Set(agents);
                    agents = [...agents, ...agentsFromJson.filter((en) => !Ft.has(en))];
                  }
                  let it = seatMainThreadAgentFromPool(getActiveAgentsFromList(agents), x, structuredIO, {
                    deferInitialPrompt: true,
                    reapplySystemPromptIfSeated: true,
                  });
                  if (it.restrictedAgentModel) noticeRestrictedModel(it.restrictedAgentModel);
                  Qi = it.agent?.initialPrompt;
                },
                currentPermissionMode: () => getState().toolPermissionContext.mode,
                checkPermissionMode: (client) => {
                  let removed = parsePermissionMode(client);
                  if (removed === undefined || !isExternalPermissionMode(removed))
                    return UNRECOGNIZED_PERMISSION_MODE_ERROR;
                  let it = guardPermissionModeChange(removed, getState().toolPermissionContext);
                  return it.ok ? undefined : it.error;
                },
                bypassPermissionsDeniedOutsideSandbox: isBypassPermissionsDeniedOutsideSandbox,
                applyPermissionMode: (cmd) => {
                  let Je;
                  setAppState((it) => {
                    let gt = applyPermissionModeChange(
                      {
                        mode: cmd,
                      },
                      it.toolPermissionContext,
                    );
                    if (!gt.ok) {
                      Je = gt.error;
                      return it;
                    }
                    let Ft = asClaimedStartModeContext(gt.context, {
                      bypassAvailableByFlag: x.bypassAvailableByFlag === true,
                    });
                    return Ft === it.toolPermissionContext && !it.isUltraplanMode
                      ? it
                      : {
                          ...it,
                          toolPermissionContext: Ft,
                          isUltraplanMode: false,
                        };
                  });
                  if (Je === undefined) x.permissionModeSuppliedOnInvocation = true;
                  return Je;
                },
                settlePlanAutoMode: settlePlanAutoModeAtStart,
                recheckAutoModeGate: () => {
                  verifyAutoModeGateAccess(getState().toolPermissionContext, getState().fastMode).then(
                    ({ updateContext }) => {
                      setAppState((Je) => {
                        let normalizedPath = updateContext(Je.toolPermissionContext);
                        return normalizedPath === Je.toolPermissionContext
                          ? Je
                          : {
                              ...Je,
                              toolPermissionContext: normalizedPath,
                            };
                      });
                    },
                  );
                },
                workspaceRestrictsBypass: () => false,
                setSdkMcpServers: (we) => {
                  let Je = new Set(we);
                  for (let key of Object.keys(R)) if (!Je.has(key)) delete R[key];
                  for (let it of we)
                    R[it] ??= {
                      type: "sdk",
                      name: it,
                    };
                  Ma();
                },
                sdkMcpSettled: () =>
                  Object.keys(R).every((key) =>
                    sdkClients.some((Je) => Je.name === key && Je.type === "connected"),
                  ),
                startSessionStartHooks: () => {
                  setAwaitsFirstRun(false);
                  let startTime = performance.now();
                  let Je = runStartupHooks(e, {
                    kind: "session-start",
                    source: "startup",
                    storageV5: x.storageV5,
                    credentials: x.credentials,
                  })
                    .then(
                      (it) => {
                        Gs(it);
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
                    .then(async (it) => {
                      let gt = cancelSourceLabels(it, Qi);
                      Qi = undefined;
                      if (gt.length === 0) return;
                      if (ji || O.hasEnded()) {
                        let Et = switchSerializerSlot.of(e);
                        if (Et.pending > 0) await Et.tail;
                        for (let { text, sentBy } of gt) {
                          let jt = {
                            mode: "prompt",
                            value: text,
                            agentId: mainAgentId(),
                            ...(!(structuredIO instanceof RemoteIO) && {
                              localStdinOrigin: true,
                            }),
                          };
                          messageQueue.enqueue(sentBy === "person" ? withOwnWordStopKey(jt) : jt);
                        }
                        Os();
                        return;
                      }
                      let mapped = gt.map((Et) => Et.text);
                      let promise = new Promise((resolve) => {
                        Bs = (Wn) => {
                          if ("cannotQueue" in Wn) {
                            resolve(Wn.cannotQueue);
                            return;
                          }
                          let hn = typeof Wn.queued === "string" ? mapped.indexOf(Wn.queued) : -1;
                          if (hn !== -1) mapped.splice(hn, 1);
                          if (mapped.length === 0) resolve(undefined);
                        };
                      });
                      for (let { text, sentBy } of gt) structuredIO.prependUserMessage(text, sentBy);
                      let winner = await Promise.race([
                        promise,
                        sleep(PRINT_TURN_TIMEOUT_MS, undefined, {
                          unref: true,
                        }).then(() => `not queued after ${PRINT_TURN_TIMEOUT_MS}ms`),
                      ]);
                      Bs = undefined;
                      if (winner !== undefined)
                        logForDebugging(
                          `claim_session: the session's own first-turn messages will not run ahead of the host's messages (${winner}); releasing the host's messages`,
                          {
                            level: "warn",
                          },
                        );
                    })
                    .catch((error) => {
                      Bs = undefined;
                      logForDebugging(
                        `claim_session: queueing the session's own first-turn messages failed (continuing): ${errorMessage(error)}`,
                        {
                          level: "error",
                        },
                      );
                    })
                    .finally(() => {
                      if (Jr === Je) Jr = undefined;
                    });
                  Jr = Je;
                  Lg = Je;
                },
                applyWorkspaceTrust: (cmd) =>
                  applyWorkspaceTrust(structuredIO.hostOwnsStdinOrigin ? cmd : undefined, {
                    cwd: getCwd(),
                    trustedNetworkDirectories: getState().toolPermissionContext.trustedNetworkDirectories,
                    storageV5: x.storageV5,
                  }),
                announceStartingChange: () => {
                  if (isDesktopTopSession()) announcePrStarted(e.host);
                },
                buildInitializePayload: (cmd) => {
                  let { models, unavailable } = Im();
                  return _buildInitializeResponsePayloadForTesting(
                    () => Ho(),
                    getActiveAgentsFromList(agents),
                    models,
                    unavailable,
                    getState,
                    userSpecifiedModel,
                    () => structuredIO.sessionState.getState(),
                    hasSdkHostHooks() ? true : undefined,
                    undefined,
                    cmd,
                    undefined,
                    x.storageV5,
                    () => ({
                      redactsWhatItPersists: isTransportBacked(e),
                      isRemoteTransport: structuredIO.isRemoteTransport(),
                      sessionWriters: structuredIO.sessionWriters(),
                    }),
                    Ri,
                  ).then((gt) => withHostWordedAsks(gt, structuredIO, x));
                },
              });
              if (be.kind === "ok") {
                sendControlResponseSuccess(j, be.response);
                headlessProfilerCheckpoint("claim_answered");
              } else yt(j, be.message);
            } catch (error) {
              if (getSpareClaimState() === "claiming") {
                markSpareClaimFailed();
                Ws("claim_session", errorMessage(error));
                yt(
                  j,
                  `claim_failed: ${pickForTransport(e, sanitizeTelemetryString(errorMessage(error)), "(error detail withheld)")} \u2014 discard this spare`,
                );
              } else {
                Ws("claim_session", errorMessage(error));
                yt(
                  j,
                  `rejected: ${pickForTransport(e, sanitizeTelemetryString(errorMessage(error)), "(error detail withheld)")} \u2014 the spare is still parked`,
                );
              }
            }
          } else if (j.request.subtype === "get_status") {
            if (isTransportBacked(e)) {
              yt(j, "get_status is not available on this connection");
              continue;
            }
            let le = j;
            Qn(async () => {
              try {
                let Re = lazyPrintModules?.();
                if (!Re) {
                  yt(le, "get_status is not available in this build");
                  return;
                }
                sendControlResponseSuccess(le, {
                  sections: await Re.buildStatusSections({
                    credentials: x.credentials,
                    mainLoopModel: Ao() ?? getMainLoopModel(),
                    mcp: {
                      ...getState().mcp,
                      clients: rows(),
                    },
                    permissionMode: getState().toolPermissionContext.mode,
                    remoteSessionName: getState().remoteSessionName,
                  }),
                });
              } catch (error) {
                Xn(le, "get_status", error);
              }
            });
          } else if (j.request.subtype === "export_conversation") {
            if (isTransportBacked(e)) {
              yt(j, "export_conversation is not available on this connection");
              continue;
            }
            let currentAppState = wg();
            let messages = [...currentAppState.messages];
            let be = j;
            Qn(async () => {
              try {
                let we = lazyConversationExporter?.();
                if (!we) {
                  yt(be, "export_conversation is not available in this build");
                  return;
                }
                sendControlResponseSuccess(
                  be,
                  await we.exportConversation({
                    session: e,
                    messages,
                    tools: currentAppState.tools,
                    storageV5: x.storageV5,
                  }),
                );
              } catch (error) {
                Xn(be, "export_conversation", error);
              }
            });
          } else if (
            j.request.subtype === "list_cloud_sessions" ||
            j.request.subtype === "get_cloud_session" ||
            j.request.subtype === "get_cloud_session_transcript"
          ) {
            if (!isLocalStdinOnly(e)) {
              yt(j, `${j.request.subtype} is not available on this connection`);
              continue;
            }
            let le = j;
            let request = j.request;
            handledOrphanedToolUseIds.get(le.request_id)?.abort();
            let abortController = createAbortController();
            handledOrphanedToolUseIds.set(le.request_id, abortController);
            let we = () => handledOrphanedToolUseIds.get(le.request_id) === abortController;
            let it = rateLimitListener(
              (async () => {
                try {
                  dh ??= import("./chunk-w88j2ajz.js")
                    .then((yn) => new yn.CloudSessionReads())
                    .catch((error) => {
                      dh = undefined;
                      throw error;
                    });
                  let gt = await dh;
                  let Ft = {
                    abortController,
                    credentials: x.credentials,
                    storageV5: x.storageV5,
                  };
                  let en =
                    request.subtype === "get_cloud_session_transcript"
                      ? await (
                          await import("./chunk-yyv1m8fa.js")
                        ).answerCloudSessionTranscript(gt, request, Ft)
                      : await gt.answer(request, Ft);
                  if (we()) sendControlResponseSuccess(le, en);
                } catch (error) {
                  if (we())
                    Xn(le, request.subtype, error, {
                      expected: error instanceof WireSafeControlError,
                    });
                } finally {
                  if (we()) handledOrphanedToolUseIds.delete(le.request_id);
                }
              })(),
            );
            Qn(() => it);
          } else if (j.request.subtype === "get_memory_dialog") {
            if (isTransportBacked(e)) {
              yt(j, "get_memory_dialog is not available on this connection");
              continue;
            }
            try {
              let { buildMemoryDialogResponse } = await import("./chunk-7sekx49c.js");
              sendControlResponseSuccess(
                j,
                await buildMemoryDialogResponse({
                  session: e,
                  storageV5: x.storageV5,
                  credentials: x.credentials,
                  activeAgents: getActiveAgentsFromList(agents),
                  dreamRunning: Object.values(getState().tasks).some(
                    (task) => task.type === "dream" && task.status === "running",
                  ),
                }),
              );
            } catch (error) {
              Xn(j, "get_memory_dialog", error);
            }
          } else if (j.request.subtype === "get_skills_dialog") {
            if (isTransportBacked(e)) {
              yt(j, "get_skills_dialog is not available on this connection");
              continue;
            }
            try {
              let { buildSkillsDialogResponse } = await import("./chunk-a1q31s85.js");
              sendControlResponseSuccess(
                j,
                buildSkillsDialogResponse({
                  commands: Ho(),
                  bytesPerToken: bytesPerTokenForModel(Ao() ?? getMainLoopModel()),
                }),
              );
            } catch (error) {
              Xn(j, "get_skills_dialog", error);
            }
          } else if (j.request.subtype === "get_chrome_dialog") {
            if (isTransportBacked(e)) {
              yt(j, "get_chrome_dialog is not available on this connection");
              continue;
            }
            try {
              let [{ buildChromeDialogResponse }, { claudeInChromeDefaultForHost }] = await Promise.all([
                import("./chunk-b8m0n4gd.js"),
                import("./chunk-e2839z0z.js"),
              ]);
              sendControlResponseSuccess(
                j,
                await buildChromeDialogResponse({
                  mcpClients: rows(),
                  atStartup: (settingOn) =>
                    claudeInChromeDefaultForHost({
                      settingOn,
                    }),
                }),
              );
            } catch (error) {
              Xn(j, "get_chrome_dialog", error);
            }
          } else if (
            j.request.subtype === "get_chrome_browsers" ||
            j.request.subtype === "select_chrome_browser"
          ) {
            let le = j;
            let request = j.request;
            let subtype = request.subtype;
            if (isTransportBacked(e)) {
              yt(le, `${subtype} is not available on this connection`);
              continue;
            }
            let { CLAUDE_IN_CHROME_MCP_SERVER_NAME } = await import("./chunk-85j1z4a0.js");
            let found = rows().find(
              (prev) => prev.name === CLAUDE_IN_CHROME_MCP_SERVER_NAME && prev.type === "connected",
            );
            if (!found) {
              yt(le, "Claude in Chrome is not connected in this session");
              continue;
            }
            Qn(async () => {
              let it;
              try {
                it = await import("./chunk-s7jyzp3j.js");
                let {
                  BrowserListShapeError,
                  listConnectedBrowsers,
                  noBrowsersWhenUnreachable,
                  selectBrowser,
                } = it;
                let Et = (Wn) =>
                  withTimeout(Wn, LOGIN_BLOCKED_MESSAGES, "Claude in Chrome did not answer in time");
                if (request.subtype === "get_chrome_browsers") {
                  let pairedDeviceId = getGlobalConfig().chromeExtension?.pairedDeviceId;
                  let hn = await Et(listConnectedBrowsers(found)).catch(noBrowsersWhenUnreachable);
                  sendControlResponseSuccess(le, {
                    browsers: hn.map((jt) => ({
                      device_id: jt.deviceId,
                      name: jt.name,
                      ...(jt.osPlatform !== undefined && {
                        os_platform: jt.osPlatform,
                      }),
                      current: jt.deviceId === pairedDeviceId,
                    })),
                  });
                } else {
                  let deviceId = request.device_id;
                  let hn =
                    typeof deviceId === "string" && deviceId !== ""
                      ? await Et(listConnectedBrowsers(found)).catch((error) => {
                          if (error instanceof BrowserListShapeError) return [];
                          throw error;
                        })
                      : [];
                  await selectBrowser(found, deviceId, Et);
                  let found_2 = hn.find(($t) => $t.deviceId === deviceId);
                  sendControlResponseSuccess(le, {
                    ...(found_2 && {
                      name: found_2.name,
                    }),
                  });
                  logFeatureOk("chrome_browser_picker");
                }
              } catch (error) {
                let Ft = it?.isChromeBridgeUnreachable(error) === true;
                let namedABrowser = it !== undefined && it.isBrowserNotListed(error) && error.namedABrowser;
                Xn(le, subtype, error, {
                  expected: Ft || namedABrowser,
                });
                if (subtype === "select_chrome_browser")
                  if (it) it.logBrowserSwitchFailure(error);
                  else logFeatureBad("chrome_browser_picker", "select_failed");
              }
            });
          } else if (j.request.subtype === "get_sandbox_dialog") {
            if (isTransportBacked(e)) {
              yt(j, "get_sandbox_dialog is not available on this connection");
              continue;
            }
            try {
              let { buildSandboxDialogResponse } = await import("./chunk-ygsnywrv.js");
              sendControlResponseSuccess(j, await buildSandboxDialogResponse());
            } catch (error) {
              Xn(j, "get_sandbox_dialog", error);
            }
          } else if (j.request.subtype === "mcp_message") {
            let request = j.request;
            let found = sdkClients.find((be) => be.name === request.server_name);
            if (found && found.type === "connected") injectMcpMessage(found, request.message);
            if (
              isToolListChangedNotification(request.message) &&
              Object.hasOwn(R, request.server_name) &&
              isSdkMcpManifestsEnabled()
            ) {
              rd.delete(request.server_name);
              Is.add(request.server_name);
              let be = $o.get(request.server_name);
              if (be?.toolsListResult !== undefined) {
                $o.set(request.server_name, {
                  initializeResult: be.initializeResult,
                });
                logFeatureSad("mcp_sdk_manifest", "mcp_sdk_manifest_tools_changed_before_connect");
              }
              if (found?.type === "connected") Ma("skip");
            }
            sendControlResponseSuccess(j);
          } else if (j.request.subtype === "rewind_files") {
            let currentAppState = getState();
            let Re = await handleRewindFiles(
              j.request.user_message_id,
              currentAppState,
              j.request.dry_run ?? false,
            );
            if (Re.error !== undefined) Ws("rewind_files", Re.error);
            if (Re.canRewind || j.request.dry_run)
              sendControlResponseSuccess(
                j,
                ((we) => {
                  if (!isTransportBacked(e)) return we;
                  let { filesChanged, ...it } = we;
                  return it;
                })(
                  Re.error !== undefined
                    ? {
                        ...Re,
                        error: pickForTransport(e, Re.error, "Failed to rewind"),
                      }
                    : Re,
                ),
              );
            else yt(j, pickForTransport(e, Re.error ?? "Unexpected error", "Failed to rewind"));
          } else if (j.request.subtype === "cancel_async_message") {
            let messageUuid = j.request.message_uuid;
            let Re =
              !Zn(messageUuid) &&
              cancelQueuedThreadMessage({
                targetUuid: messageUuid,
                sender: "host",
                messageQueue,
                prewaitLatch: Ro,
                io: structuredIO,
              });
            if (Re) on(() => Ie.noteCancelledInTheQueue([messageUuid]));
            sendControlResponseSuccess(j, {
              cancelled: Re,
            });
          } else if (j.request.subtype === "poll_event") {
            To = true;
            let le = ackPollEventRow({
              row: uuid,
              rowsInFlight: activeOAuthFlows,
              tearingDown: () => abortController.signal.aborted || isShuttingDown() || isTerminalShutdown(),
              ack: (Re) => structuredIO.onCommandLifecycle?.(Re, "completed"),
              flushSessionStorage,
              reply: (Re) => sh(j, Re),
            });
            if (le)
              handlePollEvent(j.request, {
                ...SL,
                ...le,
              });
          } else if (j.request.subtype === "rewind_conversation") {
            if (typeof j.request.target_message_uuid !== "string") {
              yt(j, "rewind_conversation: target_message_uuid must be a string");
              continue;
            }
            let Re = rewindExpiryVerdict(pt(j), j.request.expires_at);
            if (Re !== undefined) {
              sendControlResponseSuccess(j, Re);
              continue;
            }
            let targetMessageUuid = j.request.target_message_uuid;
            let we = () => {
              let qt = isolationLatch.current;
              if (qt === "web" || qt === "connectors") return qt;
              if (qt !== null) return;
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
            let lastSeenUserMessageUuid = j.request.last_seen_user_message_uuid;
            let nudgeHold = createNudgeHold({
              getAppState: getState,
              setAppState,
              session: e,
            });
            let gt = {
              allowSummarizedTarget: j.request.allow_summarized_target === true,
              allowAssistantTarget: j.request.allow_assistant_target === true,
            };
            let stopSettling = Ie.stopSettling;
            if (stopSettling !== undefined) await withDeadline(stopSettling, COST_PUSH_INTERVAL_MS);
            let en = () =>
              findRewindPoint(messages_2, targetMessageUuid, lastSeenUserMessageUuid, {
                rowsOffDisk: getSessionRowsOffDisk(),
                ...gt,
              });
            let yn = () =>
              ze.running &&
              (ze.runPhase !== "waiting_for_agents" ||
                structuredIO.sessionState.getState() === "requires_action");
            let request = j.request;
            let Wn;
            let hn = () => (Wn ??= rewindRerunMode());
            if (request.interrupt_if_running === true)
              dropOwnRerunOnRewind({
                messageQueue,
                io: structuredIO,
                readSwitch: hn,
                namedByTheRequest: [request.target_message_uuid, request.last_seen_user_message_uuid],
                decide: en,
                logFailure: (qt) =>
                  logHandlerFailure(isTransportBacked(e), "rewind_conversation: own re-run", qt),
              });
            let jt = request.refuse_if_usage_limited === true;
            let $t =
              jt && request.interrupt_if_running === true && On() && ze.dequeueCount > 0 && hn() === "on";
            let un = async () => {
              fi = true;
              let qt = await askRewindLimitQuestion({
                promptUpOrHeld: () =>
                  structuredIO.sessionState.getState() === "requires_action" || Ie.inheritedPromptPending(),
                busy: () =>
                  messageQueue.getDrainableMainThreadQueueLength() > 0 ||
                  Oo.hasParked() ||
                  Dt() ||
                  Ie.stopRetirementOwed,
                runGoing: On,
                interruptAsked: request.interrupt_if_running === true,
                afterTheInterruptBranch: $t,
                missingTargetAsked: request.refuse_missing_target_if_usage_limited === true,
                decide: en,
                rowCount: () => messages_2.length,
                runEnding: () =>
                  isTurnAbortedForRewind({
                    drain: ze,
                    messageQueue,
                    prewaitLatch: Ro,
                  }),
                runWaitable: yn,
                dequeues: () => ze.dequeueCount,
                ending: isTerminalShutdown,
                stop: abortController.signal,
                mainModel: () => Ao() ?? getMainLoopModel(),
                credentials: x.credentials,
                storageV5: x.storageV5,
                logFailure: (xt) =>
                  logHandlerFailure(isTransportBacked(e), "rewind_conversation: limit question", xt),
              });
              fi = false;
              if (qt === "ending") {
                nudgeHold.release({
                  mayBeSentAgain: false,
                });
                To = true;
                return true;
              }
              if (qt === "turn_running") {
                nudgeHold.release({
                  mayBeSentAgain: REWIND_REFUSAL_RETRYABLE.turn_running,
                });
                sendControlResponseSuccess(j, rewindRefusal("turn_running", we()));
                return true;
              }
              if (qt !== "go_on") {
                nudgeHold.release({
                  mayBeSentAgain: false,
                });
                qt.report();
                sendControlResponseSuccess(j, usageLimitedRewindRefusal(qt.targetFound, we()));
                return true;
              }
              return false;
            };
            if (jt && !$t && (await un())) continue;
            let Ht =
              !On() || j.request.interrupt_if_running
                ? findRewindPoint(messages_2, targetMessageUuid, j.request.last_seen_user_message_uuid, gt)
                : undefined;
            let cn =
              Ht !== undefined && "cut" in Ht
                ? stopAndDropOutside(detachedCallSlots.of(e), messageQueue, messages_2.slice(0, Ht.cut.index))
                : [];
            let Kn = (refuse) => {
              for (let xt of cn) messageQueue.enqueue(xt);
              nudgeHold.release({
                mayBeSentAgain: REWIND_REFUSAL_RETRYABLE[refuse],
              });
              sendControlResponseSuccess(j, rewindRefusal(refuse, we()));
            };
            let dr = j.request.interrupt_if_running ? fn() : On();
            if (
              dr &&
              j.request.interrupt_if_running &&
              messageQueue.getDrainableMainThreadQueueLength() === 0 &&
              !(
                getSdkPerTaskStopAffordance() &&
                !ze.running &&
                structuredIO.sessionState.getState() === "requires_action"
              ) &&
              !Dt()
            ) {
              if (
                ze.running &&
                ze.runPhase !== "waiting_for_agents" &&
                getSessionRowsOffDisk() === undefined &&
                Ht !== undefined &&
                "refuse" in Ht &&
                Ht.refuse === "unseen_later_turn" &&
                isRewindTargetQueued(messages_2, targetMessageUuid, lastSeenUserMessageUuid)
              ) {
                reportRewindRefusal(Ht, Ht.refuse);
                Kn(Ht.refuse);
                continue;
              }
              Rd();
              wf({
                retireParkedPermission: !Ie.inheritedPromptHoldCapable(),
                parkedPermissionReason: "rewind",
                keepDetachedToolCalls: true,
              });
              let dequeueCount = ze.dequeueCount;
              let xt = Date.now() + 1e4;
              while (
                fn() &&
                (yn() ||
                  (!getSdkPerTaskStopAffordance() &&
                    structuredIO.sessionState.getState() === "requires_action" &&
                    !Xt())) &&
                ze.dequeueCount === dequeueCount &&
                Date.now() < xt
              ) {
                ze.abortController?.abort(userAbortReason("remote-cancel"));
                await sleep(20);
              }
              let stopSettling = Ie.stopSettling;
              if (stopSettling !== undefined) await withDeadline(stopSettling, COST_PUSH_INTERVAL_MS);
              Ni.arm();
              dr = ze.dequeueCount > dequeueCount || fn();
            }
            if ($t) {
              let dequeueCount = ze.dequeueCount;
              if (await un()) {
                for (let xt of cn) messageQueue.enqueue(xt);
                continue;
              }
              dr ||= ze.dequeueCount > dequeueCount || fn();
            }
            if (dr || messageQueue.getDrainableMainThreadQueueLength() > 0) Kn(Zt());
            else {
              let qt = en();
              if ("refuse" in qt) {
                reportRewindRefusal(qt, qt.refuse);
                Kn(qt.refuse);
              } else {
                let { index, echoUuid, prefillText, precedingAssistantUuid, resolution } = qt.cut;
                if (getSdkPerTaskStopAffordance() || reportsRunningBackgroundTasksExplicit())
                  stopTeammatesAfterCut({
                    taskRegistry: createTaskFramework(getState, setAppState),
                    setAppState,
                    storageV5: x.storageV5,
                    messages: messages_2,
                    cutIndex: index,
                  });
                if (!Ie.inheritedPromptHoldCapable()) Ie.fire("rewind");
                let Er = {
                  mirror: (leafUuid, Qr) => mirrorLeafCheckpointToRemote(leafUuid, Qr),
                  flushInternalEvents: () => structuredIO.flushInternalEvents(),
                  persistLocal: (fr, Qr) => persistLeafCheckpoint(fr, Qr, x.storageV5),
                  logFailure: (fr, Qr) => logError(Qr),
                };
                let ss = {
                  messages: messages_2,
                  dequeueCount: () => ze.dequeueCount,
                  drainableMainThreadQueueLength: () => messageQueue.getDrainableMainThreadQueueLength(),
                };
                let prefix = queueStamp(ss);
                nudgeHold.renew();
                if (!(await persistRewindCut(qt.cut, ss, Er))) {
                  reportRewindRefusal(qt, "persist_failed");
                  Kn("persist_failed");
                } else if (
                  rewindTargetMoved(prefix, ss, qt.cut) ||
                  !isRewindCutPersistable(messages_2, qt.cut, getSessionRowsOffDisk())
                ) {
                  await waitForRewindQuiet(ss, Er);
                  reportRewindRefusal(qt, "state_changed");
                  Kn("state_changed");
                } else {
                  let fr = {
                    messages: messages_2,
                    appendToConversation: Gs,
                    readFileState: readFilesFromMessages,
                    memorySelector,
                    host: e.host,
                    toolAliases: x.toolAliases,
                    stickyBetas: getStickyBetas,
                    logFailure: (yo, fo) => logError(fo),
                  };
                  stopMcpTasksAfterCut({
                    taskRegistry: createTaskFramework(getState, setAppState),
                    setAppState,
                    storageV5: x.storageV5,
                    messages: messages_2,
                    cutIndex: index,
                  });
                  withdrawDeferredAfterCut({
                    endings: mcpTaskEndingsSlots.peek(e),
                    queue: messageQueue,
                    messages: messages_2,
                    cutIndex: index,
                  });
                  let removed = applyRewindCut(fr, index);
                  retractPendingTitle(vc);
                  nudgeHold.keep();
                  rewindReadNotifications(
                    {
                      getAppState: getState,
                      setAppState,
                      session: e,
                    },
                    {
                      kept: messages_2,
                      removed,
                      targetUuid: targetMessageUuid,
                    },
                  );
                  discardQueuedOutside(detachedCallSlots.of(e), messageQueue, messages_2);
                  if (
                    Ie.inheritedPromptPending() &&
                    turnInterruptionState &&
                    turnInterruptionState.kind !== "none"
                  ) {
                    let { uuid } = turnInterruptionState.message;
                    if (!messages_2.some((prev) => prev.uuid === uuid)) Ie.fire("rewind");
                  }
                  if (!Ie.inheritedPromptPending()) {
                    jn.cancelAfterRewind();
                    if (hn() === "on") jn.closeAfterRewind();
                  }
                  Ps = messages_2.length;
                  Od();
                  reportRewindRefusal(qt, "rewound");
                  wa = buildTurnHandoffReply(j.request_id, messages_2);
                  sendControlResponseSuccess(j, {
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
          } else if (j.request.subtype === "fork_conversation") {
            let request = j.request;
            Io(async () => {
              let Re = Oc();
              let be = await handleForkConversation(request, {
                messages: messages_2,
                blockedReason: () =>
                  On() || messageQueue.getDrainableMainThreadQueueLength() > 0
                    ? REWIND_REFUSAL_TEXT[Zt()]
                    : null,
                sdkUrl: x.sdkUrl,
                permissionMode: getPermissionModeCycle(getState()),
                credentials: x.credentials,
                storageV5: x.storageV5,
                getTools: Ri,
                host: e.host,
              }).finally(Re);
              if (be.ok) sendControlResponseSuccess(j, be.response);
              else yt(j, be.error);
            });
          } else if (j.request.subtype === "read_file") {
            let le = j;
            let request = j.request;
            let be = request.anchor?.kind === "as_written";
            let we = (gt) => {
              try {
                if (be) gt();
              } catch {}
            };
            let Je = "not_served";
            let it = async () => {
              try {
                let gt =
                  request.anchor === undefined
                    ? await Rs(request)
                    : be
                      ? await gd(request, {
                          askedAt: startTime,
                          onRefusal: (Ft) => {
                            Je = Ft;
                          },
                        })
                      : await Ua(request);
                sendControlResponseSuccess(
                  le,
                  isTransportBacked(e)
                    ? {
                        ...gt,
                        absPath: request.path,
                      }
                    : gt,
                );
                we(() => logFeatureOk("remote_read_file_as_written"));
              } catch (error) {
                let Ft = be && error instanceof WireSafeControlError;
                let en = Ft && !isNoticeKindServed(Je);
                Xn(
                  le,
                  "read_file",
                  error,
                  {
                    expected: en,
                  },
                  Ft ? "read_denied" : undefined,
                );
                we(() =>
                  en
                    ? logFeatureSad("remote_read_file_as_written", "refused")
                    : logFeatureBad("remote_read_file_as_written", Ft ? Je : "unexpected_error"),
                );
              }
            };
            if (request.anchor === undefined) await it();
            else {
              let gt = rateLimitListener(it());
              Qn(() => gt);
            }
          } else if (
            j.request.subtype === "list_directory" &&
            env.CLAUDE_CODE_REMOTE &&
            getPlatform() === "linux" &&
            getFeatureValue_CACHED_MAY_BE_STALE("tengu_gentle_hummingbird", true)
          ) {
            let le = j;
            let path = j.request.path;
            Qn(async () => {
              let be;
              try {
                be = await pd(path);
              } catch (error) {
                let Je = repoRootErrorClass(error);
                if (Je !== undefined)
                  Xn(le, "list_directory", error, {
                    expected: Je !== "unexpected_error",
                  });
                else {
                  yt(le, "list denied: unexpected_error");
                  logHandlerFailure(
                    isTransportBacked(e),
                    "list_directory",
                    error instanceof WireSafeControlError
                      ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                          errorMessage(error),
                          "list_directory: a refusal of another module",
                        )
                      : error,
                  );
                }
                if (Je !== undefined && REPO_ROOT_ERROR_TONES[Je] === "sad")
                  logFeatureSad("remote_list_directory", Je);
                else logFeatureBad("remote_list_directory", Je ?? "unexpected_error");
                return;
              }
              sendControlResponseSuccess(
                le,
                isTransportBacked(e)
                  ? {
                      ...be,
                      absPath: path,
                    }
                  : be,
              );
              logFeatureOk("remote_list_directory");
            });
          } else if (j.request.subtype === "start_shell_task" && shouldOfferLinuxSandboxHint(Ri())) {
            let le = j;
            let request = j.request;
            let prefix = pt(j);
            Io(async () => {
              try {
                sendControlResponseSuccess(
                  le,
                  await Ya.answer(
                    le.request_id,
                    request,
                    {
                      readsSessionStream: structuredIO.isRemoteTransport(),
                      storedAt: prefix.storedAt,
                      joinedAt: structuredIO.sessionStreamJoinedAt(),
                      heldMs: rewindRequestAge(prefix),
                    },
                    hL,
                  ),
                );
              } catch (error) {
                Xn(le, "start_shell_task", error, {
                  expected: error instanceof WireSafeControlError,
                });
              }
            });
          } else if (wr) {
            if (structuredIO.answersSurfaceRefusal(j))
              yt(
                j,
                `${UNSUPPORTED_CONTROL_SUBTYPE_TEXT}: ${sanitizeTelemetryString(String(j.request.subtype))}`,
              );
            if (
              canServeManifestsWithoutWriters(
                structuredIO.uiSurfaceChannel(),
                clientRegistry.list().length > 0,
              )
            ) {
              for (let le of clientRegistry.list()) surfaceDeclarationTracker.forget(le.clientId);
              detachAllClients_2();
              try {
                pruneDetachedClients();
              } catch (error) {
                logForDebugging(`unserved channel: review failed: ${errorMessage(error)}`, {
                  level: "error",
                });
              }
            }
          } else if (j.request.subtype === "ui_attach") {
            let le = SDKUiAttachUiAttachMessageSchema().safeParse(j.request);
            if (!le.success) {
              yt(
                j,
                `ui_attach: surface must be "desktop", "mobile" or "vscode", client_id 1-64 of letters, digits, . _ - (the colon is the engine's), viewport (when given) positive integer columns and rows with isFullscreen (when given) a boolean, and answers (when given) a list of ${UiClientAnswerableRequestSchema()
                  .options.map((prev) => `"${prev}"`)
                  .join(", ")}`,
              );
              continue;
            }
            let Re = j;
            let be = le.data;
            nf = false;
            Qn(async () => {
              try {
                let joined = surfaceDeclarationTracker.join({
                  client: {
                    surface: be.surface,
                    clientId: be.client_id,
                    ...(be.viewport !== undefined && {
                      viewport: be.viewport,
                    }),
                  },
                  answers: be.answers,
                  declares: true,
                  by: Re,
                });
                if (!joined.isAdmitted) {
                  yt(Re, `${UNSUPPORTED_CONTROL_SUBTYPE_TEXT}: ui_attach`);
                  await joined.attaching;
                  return;
                }
                let Je = Pu;
                pruneDetachedClients();
                sendControlResponseSuccess(Re, {
                  surfaces: [...attachedSurfaces()],
                });
                if (!joined.wasOnRoster) {
                  Gg(joined.isFirstClient);
                  Zg();
                }
                Se.noteShown();
                if (fullscreenClients().some((gt) => gt.clientId === be.client_id) && Pu === Je)
                  Xg(describeOpenPanes(paneRegistry().getState()));
                await joined.attaching;
              } catch (error) {
                Xn(Re, "ui_attach", error);
              }
            });
          } else if (j.request.subtype === "ui_detach") {
            let le = SDKUiDetachUiDetachMessageSchema().safeParse(j.request);
            if (!le.success) {
              yt(
                j,
                "ui_detach: client_id must be 1-64 of letters, digits, . _ - (the colon is the engine's)",
              );
              continue;
            }
            let Re = j;
            let be = le.data;
            Qn(async () => {
              try {
                let any = clientRegistry.list().some((it) => it.clientId === be.client_id);
                if (any) {
                  surfaceDeclarationTracker.forget(be.client_id);
                  Ac ||= !canServeManifests(structuredIO.uiSurfaceChannel());
                  Se.noteLeft();
                }
                let Je = raiseSessionDetach(be.client_id, "detach");
                pruneDetachedClients();
                sendControlResponseSuccess(Re, {
                  detached: any,
                  surfaces: [...attachedSurfaces()],
                });
                await Je;
              } catch (error) {
                Xn(Re, "ui_detach", error);
              }
            });
          } else if (j.request.subtype === "ui_render") {
            let le = SDKUiRenderUiRenderMessageSchema().safeParse(j.request);
            if (!le.success) {
              yt(
                j,
                'ui_render: surface must be "desktop", "mobile" or "vscode", component a render site name, instance_id a string, props an object, client_id (when given) 1-64 safe characters, viewport (when given) positive integer columns and rows with isFullscreen (when given) a boolean, and on_screen (when given) null or integers first <= last < of',
              );
              continue;
            }
            if (nf) {
              yt(j, `${UNSUPPORTED_CONTROL_SUBTYPE_TEXT}: ui_render`);
              continue;
            }
            let Re = j;
            let be = le.data;
            let we = `${be.instance_id}#${be.bench?.seq ?? 0}`;
            logForDebugging(`BENCH ui_render key=${we} rid=${Re.request_id} C0=${Date.now()}`);
            let abortController = createAbortController();
            handledOrphanedToolUseIds.get(Re.request_id)?.abort();
            handledOrphanedToolUseIds.set(Re.request_id, abortController);
            Qn(async () => {
              try {
                let it = await renderPluginSurface(
                  {
                    request: be,
                    by: Re,
                    signal: abortController.signal,
                  },
                  yv,
                );
                if (abortController.signal.aborted) return;
                if (it === undefined) {
                  yt(Re, `${UNSUPPORTED_CONTROL_SUBTYPE_TEXT}: ui_render`);
                  return;
                }
                logForDebugging(`BENCH ui_render key=${we} rid=${Re.request_id} C3=${Date.now()}`);
                sendControlResponseSuccess(Re, it);
              } catch (error) {
                if (!abortController.signal.aborted) Xn(Re, "ui_render", error);
              } finally {
                if (handledOrphanedToolUseIds.get(Re.request_id) === abortController)
                  handledOrphanedToolUseIds.delete(Re.request_id);
                if (abortController.signal.aborted) structuredIO.controlRequestEnded(Re.request_id);
              }
            });
          } else if (j.request.subtype === "ui_press") {
            let le = SDKUiPressUiPressMessageSchema().safeParse(j.request);
            if (!le.success) {
              yt(
                j,
                'ui_press: plugin must be a string, handle an integer, key (when given) a string, surface (when given) "desktop", "mobile" or "vscode" and href (when given) a string of at most 2048 characters',
              );
              continue;
            }
            let Re = j;
            let be = le.data;
            Qn(async () => {
              try {
                let we = await render.press({
                  plugin: be.plugin,
                  handle: be.handle,
                  ...(be.key !== undefined && {
                    element: be.key,
                  }),
                  surface: be.surface,
                  link:
                    be.href === undefined
                      ? undefined
                      : {
                          href: be.href,
                        },
                  ...(be.press_id !== undefined && {
                    pagePress: {
                      pressId: be.press_id,
                      clientId: be.client_id,
                    },
                  }),
                });
                if (we === undefined) {
                  sendControlResponseSuccess(Re, {
                    handled: false,
                  });
                  return;
                }
                let Je =
                  be.render === undefined ? undefined : await renderPluginSurfaceWithRetry(be.render, Re, yv);
                sendControlResponseSuccess(Re, {
                  handled: true,
                  element: we.element,
                  ...(Je !== undefined && {
                    drawn: Je,
                  }),
                });
              } catch (error) {
                Xn(Re, "ui_press", error);
              }
            });
          } else if (j.request.subtype === "ui_input") {
            let le = SDKUiInputUiInputMessageSchema().safeParse(j.request);
            if (!le.success) {
              yt(
                j,
                'ui_input: plugin must be a string, handle an integer, kind "change" or "submit", value a string of at most 16384 characters, key (when given) a string, component (when given) a render site name, instance_id (when given) a string and surface (when given) "desktop", "mobile" or "vscode"',
              );
              continue;
            }
            let Re = j;
            let be = le.data;
            Qn(async () => {
              try {
                let we = await render.input({
                  plugin: be.plugin,
                  handle: be.handle,
                  surface: be.surface,
                  kind: be.kind,
                  value: be.value,
                  ...(be.key !== undefined && {
                    element: be.key,
                  }),
                  ...(be.component !== undefined && {
                    component: be.component,
                  }),
                  ...(be.instance_id !== undefined && {
                    requestId: be.instance_id,
                  }),
                });
                sendControlResponseSuccess(
                  Re,
                  we === undefined
                    ? {
                        handled: false,
                      }
                    : {
                        handled: true,
                        element: we.element,
                        value: we.value,
                      },
                );
              } catch (error) {
                Xn(Re, "ui_input", error);
              }
            });
          } else if (j.request.subtype === "ui_prompt_edit") {
            let le = SDKUiPromptEditUiPromptEditMessageSchema().safeParse(j.request);
            if (!le.success) {
              yt(
                j,
                'ui_prompt_edit: text must be a string of at most 1000000 characters, cursor an integer >= 0, key (when given) an object with key a string of 1-32 characters and ctrl, shift, meta each true when present, by (when given) "person" or "app", surface (when given) "desktop", "mobile" or "vscode" and client_id (when given) 1-64 of letters, digits, . _ -',
              );
              continue;
            }
            let Re = j;
            let be = le.data;
            let we = be.client_id ?? defaultScopeKey(be.surface);
            let Je = {
              text: be.text,
              cursor: be.cursor,
            };
            Qn(async () => {
              try {
                let it =
                  be.by === "app"
                    ? REMOTE_EDIT_QUEUE.adopt(we, Je)
                    : await REMOTE_EDIT_QUEUE.edit({
                        clientKey: we,
                        box: Je,
                        ...(be.key !== undefined && {
                          key: be.key,
                        }),
                      });
                sendControlResponseSuccess(Re, {
                  ...it,
                });
              } catch (error) {
                Xn(Re, "ui_prompt_edit", error);
              }
            });
          } else if (j.request.subtype === "ui_prompt_autocomplete") {
            let le = SDKUiPromptAutocompleteUiPromptAutocompleteMessageSchema().safeParse(j.request);
            if (!le.success) {
              yt(
                j,
                'ui_prompt_autocomplete: text must be a string of at most 1000000 characters, cursor an integer >= 0, surface (when given) "desktop", "mobile" or "vscode" and client_id (when given) 1-64 of letters, digits, . _ -',
              );
              continue;
            }
            let Re = j;
            let be = le.data;
            Qn(async () => {
              try {
                sendControlResponseSuccess(Re, {
                  ...(await REMOTE_AUTOCOMPLETE.ask(be.client_id ?? defaultScopeKey(be.surface), {
                    text: be.text,
                    cursor: be.cursor,
                  })),
                });
              } catch (error) {
                Xn(Re, "ui_prompt_autocomplete", error);
              }
            });
          } else if (j.request.subtype === "ui_select") {
            let le = SDKUiSelectUiSelectMessageSchema().safeParse(j.request);
            if (!le.success) {
              yt(
                j,
                'ui_select: plugin must be a string, handle an integer, value a string of at most 16384 characters, key (when given) a string, component (when given) a render site name, instance_id (when given) a string and surface (when given) "desktop", "mobile" or "vscode"',
              );
              continue;
            }
            let Re = j;
            let be = le.data;
            Qn(async () => {
              try {
                let we = await render.select({
                  plugin: be.plugin,
                  handle: be.handle,
                  surface: be.surface,
                  value: be.value,
                  ...(be.key !== undefined && {
                    element: be.key,
                  }),
                  ...(be.component !== undefined && {
                    component: be.component,
                  }),
                  ...(be.instance_id !== undefined && {
                    requestId: be.instance_id,
                  }),
                });
                sendControlResponseSuccess(
                  Re,
                  we === undefined
                    ? {
                        handled: false,
                      }
                    : {
                        handled: true,
                        element: we.element,
                        value: we.value,
                      },
                );
              } catch (error) {
                Xn(Re, "ui_select", error);
              }
            });
          } else if (j.request.subtype === "ui_panes") {
            if (!SDKUiPanesUiPanesMessageSchema().safeParse(j.request).success) {
              yt(j, "ui_panes: client_id (when given) 1-64 safe characters");
              continue;
            }
            try {
              sendControlResponseSuccess(
                j,
                describePanesForClient(describeOpenPanes(paneRegistry().getState())),
              );
            } catch (error) {
              Xn(j, "ui_panes", error);
            }
          } else if (j.request.subtype === "ui_pane_show") {
            let le = SDKUiPaneShowUiPaneShowMessageSchema().safeParse(j.request);
            if (!le.success) {
              yt(j, "ui_pane_show: id must be 1-64 of letters, digits, _ or -");
              continue;
            }
            try {
              let focusedId = paneRegistry().getState().focusedId;
              showPane(le.data.id);
              if (paneRegistry().getState().focusedId !== focusedId)
                syncOpenPanes(le.data.client_id ?? defaultScopeKey(le.data.surface));
              sendControlResponseSuccess(j, {
                shown_id: paneRegistry().getState().shownId,
              });
            } catch (error) {
              Xn(j, "ui_pane_show", error);
            }
          } else if (j.request.subtype === "ui_pane_focus") {
            let le = SDKUiPaneFocusUiPaneFocusMessageSchema().safeParse(j.request);
            if (!le.success) {
              yt(
                j,
                'ui_pane_focus: id must be null or 1-64 of letters, digits, _ or -, surface (when given) "desktop", "mobile" or "vscode"',
              );
              continue;
            }
            let Re = le.data;
            try {
              focusPane(Re.id);
              syncOpenPanes(Re.client_id ?? defaultScopeKey(Re.surface));
              sendControlResponseSuccess(j, {
                focused_id: paneRegistry().getState().focusedId,
              });
            } catch (error) {
              Xn(j, "ui_pane_focus", error);
            }
          } else if (j.request.subtype === "ui_close") {
            let le = SDKUiCloseUiCloseMessageSchema().safeParse(j.request);
            if (!le.success) {
              yt(j, "ui_close: id must be 1-64 of letters, digits, _ or -");
              continue;
            }
            let Re = j;
            let id = le.data.id;
            let we = () => allPanes(paneRegistry().getState()).some((Je) => Je.id === id);
            if (!we()) {
              sendControlResponseSuccess(Re, {
                closed: true,
              });
              continue;
            }
            Qn(async () => {
              try {
                await closePane(id, {
                  kind: "person",
                });
                sendControlResponseSuccess(Re, {
                  closed: !we(),
                });
              } catch (error) {
                Xn(Re, "ui_close", error);
              }
            });
          } else if (j.request.subtype === "ui_scroll") {
            let le = SDKUiScrollUiScrollMessageSchema().safeParse(j.request);
            if (!le.success) {
              yt(
                j,
                'ui_scroll: component must be "Pane" or "AbovePrompt", instance_id a string of at most 256 characters, offset, body_rows and content_rows non-negative integers, by an integer, pointer (when given) integer column and row, keyed (when given) at most 512 of {plugin, key, top, bottom}, surface (when given) "desktop", "mobile" or "vscode"',
              );
              continue;
            }
            let Re = j;
            let be = le.data;
            Qn(async () => {
              try {
                let we = await handlePaneScrollRequest({
                  clientId: be.client_id ?? defaultScopeKey(be.surface),
                  component: be.component,
                  requestId: be.instance_id,
                  offset: be.offset,
                  by: be.by,
                  bodyRows: be.body_rows,
                  contentRows: be.content_rows,
                  ...(be.pointer !== undefined && {
                    pointer: be.pointer,
                  }),
                  ...(be.keyed !== undefined && {
                    keyed: be.keyed,
                  }),
                });
                sendControlResponseSuccess(Re, {
                  moved: we.result.deny === undefined,
                  offset: we.offset,
                  ...(we.result.deny !== undefined && {
                    deny: we.result.deny,
                  }),
                  ...(we.isFollowingEnd && {
                    follow_end: true,
                  }),
                });
              } catch (error) {
                Xn(Re, "ui_scroll", error);
              }
            });
          } else if (j.request.subtype === "ui_focus") {
            let le = SDKUiFocusUiFocusMessageSchema().safeParse(j.request);
            if (!le.success) {
              yt(
                j,
                'ui_focus: component must be "Pane" or "AbovePrompt", instance_id a string of at most 256 characters, is_held a boolean, element (when given) null or {plugin, key} of at most 256 characters each, by (when given) "person" or "auto", surface (when given) "desktop", "mobile" or "vscode"',
              );
              continue;
            }
            let Re = j;
            let be = le.data;
            Qn(async () => {
              try {
                let we = await handlePaneFocusRequest({
                  clientId: be.client_id ?? defaultScopeKey(be.surface),
                  component: be.component,
                  requestId: be.instance_id,
                  isHeld: be.is_held,
                  ...(be.element !== undefined && {
                    element: be.element,
                  }),
                  by: be.by,
                });
                sendControlResponseSuccess(Re, {
                  moved: we.result.deny === undefined,
                  element: we.element,
                  ...(we.result.deny !== undefined && {
                    deny: we.result.deny,
                  }),
                });
              } catch (error) {
                Xn(Re, "ui_focus", error);
              }
            });
          } else if (j.request.subtype === "ui_client_module") {
            let le = SDKUiClientModuleUiClientModuleMessageSchema().safeParse(j.request);
            if (!le.success) {
              yt(j, "ui_client_module: plugin must be a string");
              continue;
            }
            try {
              let Re = render.clientModule(le.data.plugin);
              if (Re === undefined)
                yt(
                  j,
                  `ui_client_module: plugin ${sanitizeTelemetryString(le.data.plugin)} is not loaded or its hooks module names no surface module`,
                );
              else sendControlResponseSuccess(j, Re);
            } catch (error) {
              Xn(j, "ui_client_module", error);
            }
          } else if (j.request.subtype === "ui_client_press") {
            let le = SDKUiClientPressUiClientPressMessageSchema().safeParse(j.request);
            if (!le.success) {
              yt(
                j,
                'ui_client_press: plugin, instance_id, client, module and element must be strings, component a render site name, and event {type: "press"} | {type: "input", kind, value} | {type: "select", value}',
              );
              continue;
            }
            let Re = j;
            let be = le.data;
            Qn(async () => {
              try {
                let we = await render.clientPress({
                  plugin: be.plugin,
                  component: be.component,
                  requestId: be.instance_id,
                  key: be.client,
                  module: be.module,
                  element: be.element,
                  event: be.event,
                });
                sendControlResponseSuccess(
                  Re,
                  we === undefined
                    ? {
                        handled: false,
                      }
                    : {
                        handled: true,
                        ...(we.reached !== undefined && {
                          reached: we.reached,
                        }),
                      },
                );
              } catch (error) {
                Xn(Re, "ui_client_press", error);
              }
            });
          } else if (j.request.subtype === "ui_message") {
            let le = SDKUiMessageUiMessageMessageSchema().safeParse(j.request);
            if (!le.success) {
              yt(
                j,
                "ui_message: plugin, instance_id, client and module must be strings, component a render site name, and data present (plain JSON)",
              );
              continue;
            }
            let Re = j;
            let be = le.data;
            Qn(async () => {
              try {
                let we = await render.clientMessage({
                  plugin: be.plugin,
                  component: be.component,
                  requestId: be.instance_id,
                  key: be.client,
                  module: be.module,
                  data: be.data,
                });
                sendControlResponseSuccess(
                  Re,
                  we === undefined
                    ? {
                        handled: false,
                      }
                    : {
                        handled: true,
                        ...(we.props !== undefined && {
                          props: we.props,
                        }),
                      },
                );
              } catch (error) {
                Xn(Re, "ui_message", error);
              }
            });
          } else if (j.request.subtype === "ui_client_fault") {
            let le = j;
            Qn(async () => {
              try {
                sendControlResponseSuccess(le, await handleClientFault(le.request));
              } catch (error) {
                Xn(le, "ui_client_fault", error);
              }
            });
          } else if (j.request.subtype === "get_workspace_diff") {
            let le = j;
            Qn(async () => {
              try {
                let { buildWorkspaceDiffResponse } = await import("./chunk-wfz00gss.js");
                sendControlResponseSuccess(
                  le,
                  await buildWorkspaceDiffResponse(e.host, getState().toolPermissionContext),
                );
              } catch (error) {
                Xn(le, "get_workspace_diff", error);
              }
            });
          } else if (j.request.subtype === "get_plan")
            try {
              let { peekPlanSlug, getPlanAsync, getPlanFilePath, notePlanFileForgotten } =
                await import("./chunk-p2nht1vg.js");
              let Je = peekPlanSlug();
              if (Je !== undefined) notePlanFileForgotten(getPlanFilePath());
              let it = Je !== undefined ? await getPlanAsync(undefined, x.storageV5) : null;
              sendControlResponseSuccess(
                j,
                it !== null
                  ? {
                      exists: true,
                      content: it,
                      ...(isTransportBacked(e)
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
              Xn(j, "get_plan", error);
            }
          else if (j.request.subtype === "stage_file") {
            let request = j.request;
            let Re = x.homeSeed?.record.noteStagedRowRead(request);
            if (Re !== undefined)
              logEvent("tengu_home_seed_announcement_read", {
                on_record: Re.onRecord,
                epoch_gt1: isWorkerEpochAfterFirst(env.CLAUDE_CODE_WORKER_EPOCH),
                ...(Re.onRecord && {
                  ordinal: Re.ordinal,
                  behind_ms: Re.behindMs,
                  turns_at_hold_before: Re.turnsAtHoldBefore,
                  turn_at_hold_meanwhile: Re.turnAtHoldMeanwhile,
                }),
              });
            let be = request.filestore_path
              ? undefined
              : zd.begin(
                  isStagedHomeMountPath(request.mount_path),
                  request.mount_path,
                  request.resync === true,
                );
            Qn(async () => {
              let we;
              let Je = true;
              try {
                let { stageFile, stageFileWireResult } = await import("./chunk-q02nzdea.js");
                let { sameStandingFlag } = await import("./chunk-wbmcdb36.js");
                we = stageWaitTimeoutFor(request.mount_path);
                let { recordStagedOutputAsRead } = await import("./chunk-qqey4ng3.js");
                let currentAppState = Oc();
                let Et;
                try {
                  Et = await stageFile(
                    request,
                    undefined,
                    await waitForHomeFilesFlag(request.mount_path),
                    j.request_id,
                    sameStandingFlag(),
                  );
                  we = Et.ok ? undefined : stageWaitTimeoutFor(request.mount_path, Et.permanent);
                  Je = !Et.ok && (classifyStageWriteError(Et.error) ?? true);
                  if (Et.ok && Et.outputPath !== undefined) {
                    let outcome = await recordStagedOutputAsRead(readFilesFromMessages, Et.outputPath);
                    logForDiagnosticsNoPII("info", "stage_file_output_read_state", {
                      outcome,
                    });
                  }
                } finally {
                  currentAppState();
                }
                if (Et.ok) sendControlResponseSuccess(j, stageFileWireResult(Et));
                else {
                  Ws("stage_file", Et.error);
                  yt(
                    j,
                    sanitizeMcpResourceError(Et.error) ?? pickForTransport(e, Et.error, "stage_file failed"),
                  );
                }
              } catch (error) {
                Xn(j, "stage_file", error);
              } finally {
                be?.(we, Je);
              }
            });
          } else if (j.request.subtype === "register_repo_root") {
            let request = j.request;
            Qn(() => TL(j, request));
          } else if (j.request.subtype === "add_directory") {
            let request = j.request;
            Qn(async () => {
              let currentAppState = Oc();
              try {
                await RL(j, request);
              } finally {
                currentAppState();
              }
            });
          } else if (j.request.subtype === "file_suggestions")
            try {
              let { generateFileSuggestionsWithBase, globalFileIndexCache } =
                await import("./chunk-21emf7ab.js");
              let { items, baseDir } = await generateFileSuggestionsWithBase(
                globalFileIndexCache,
                j.request.query,
                true,
                x.storageV5,
              );
              let Je = isTransportBacked(e) ? undefined : baseDir;
              sendControlResponseSuccess(j, {
                suggestions: items.map((item) => ({
                  path: item.displayText,
                })),
                ...(Je !== undefined && {
                  cwd: Je,
                }),
              });
            } catch (error) {
              Xn(j, "file_suggestions", error);
            }
          else if (j.request.subtype === "seed_read_state") {
            try {
              let le = expandPath(j.request.path);
              let Re = vetPathSpellingsOrChain(
                j.request.path,
                le,
                getState().toolPermissionContext.trustedNetworkDirectories,
              );
              if (!(
                !Re.ok ||
                Re.pathsToCheck.some(
                  (we) =>
                    !isPathAllowed(we, getState().toolPermissionContext, "read").allowed ||
                    matchingRuleForInput(we, getState().toolPermissionContext, "read", "deny") !== null ||
                    matchingRuleForInput(we, getState().toolPermissionContext, "read", "ask") !== null,
                )
              )) {
                let { REMOTE_READ_OPEN_FLAGS, isCanonicalPathContained } =
                  await import("./chunk-kkqmctap.js");
                let { bindCanonicalPathToHandle, readHandleBounded } = await import("./chunk-h8ch5r1x.js");
                let Ft = await open(le, REMOTE_READ_OPEN_FLAGS);
                try {
                  let stats = await Ft.stat({
                    bigint: true,
                  });
                  let floored = Math.floor(Number(stats.mtimeMs));
                  let Et = 10485760;
                  if (stats.isFile() && stats.size <= BigInt(10485760) && floored <= j.request.mtime) {
                    let handleBounded = await readHandleBounded(Ft, 10485760, stats.size);
                    let hn = await realpath(le);
                    let jt = await bindCanonicalPathToHandle(Ft, stats, hn);
                    let $t =
                      jt !== undefined &&
                      (await isCanonicalPathContained(jt, getState().toolPermissionContext));
                    if (!(
                      handleBounded.overLimit ||
                      jt === undefined ||
                      !$t ||
                      pathVettingReason(jt, getState().toolPermissionContext.trustedNetworkDirectories) !==
                        undefined ||
                      !isPathAllowed(jt, getState().toolPermissionContext, "read").allowed ||
                      matchingRuleForInput(jt, getState().toolPermissionContext, "read", "deny") !== null ||
                      matchingRuleForInput(jt, getState().toolPermissionContext, "read", "ask") !== null
                    )) {
                      let content = stripBomAndCarriageReturn(handleBounded.bytes.toString("utf-8"));
                      pendingSeeds.set(le, {
                        content,
                        timestamp: floored,
                        offset: undefined,
                        limit: undefined,
                        contentNotInModelContext: true,
                      });
                    }
                  }
                } finally {
                  await Ft.close();
                }
              }
            } catch {}
            sendControlResponseSuccess(j);
          } else if (j.request.subtype === "mcp_set_servers") {
            let servers = j.request.servers;
            if (
              typeof servers !== "object" ||
              servers === null ||
              Array.isArray(servers) ||
              Object.values(servers).some((gt) => gt === null || typeof gt !== "object" || Array.isArray(gt))
            ) {
              yt(j, SERVERS_OBJECT_REQUIRED_TEXT);
              continue;
            }
            if (Sg !== null && j.request.hint === Sg) {
              Sc?.sync("binding_changed");
              if (Object.keys(j.request.servers).length === 0) {
                sendControlResponseSuccess(j, {
                  added: [],
                  removed: [],
                  errors: {},
                });
                continue;
              }
            }
            let startMs = performance.now();
            let mainThreadRequested = e.requestJournal.mainThreadRequestedInProcess();
            let we = await Ew(
              filterObject(j.request.servers, (gt, Ft) => !isPrototypeKey(Ft)),
              {
                authoritative: true,
                caller: "mcp_set_servers",
                dialOptions: {
                  toolsListAhead: true,
                },
              },
            );
            let { sdkServersChanged } = we;
            let it = {
              ...we.response,
              errors: {
                ...Object.fromEntries(
                  Object.keys(j.request.servers)
                    .filter(isPrototypeKey)
                    .map((key) => [key, reservedServerNameMessage(key)]),
                ),
                ...we.response.errors,
              },
            };
            if (Object.keys(it.errors).length > 0) Ws("mcp_set_servers", jsonStringify(it.errors));
            sendControlResponseSuccess(j, {
              ...it,
              errors: sanitizeMcpStatusMap(isTransportBacked(e), it.errors),
            });
            recordInlineMcpSetServers(inlineMcpTiming, {
              startMs,
              answeredMs: performance.now(),
              mainThreadRequested,
              relayMarked,
              response: it,
            });
            if (sdkServersChanged) Ma();
          } else if (j.request.subtype === "reload_plugins") {
            let le;
            try {
              let Re = () =>
                getActiveAgentsFromList(agents).map((Et) => ({
                  name: Et.agentType,
                  description: Et.whenToUse,
                  model: Et.model,
                }));
              if (j.request.hold_on_cache_impact && !He && Xe === undefined)
                Xe = await loadAllPluginsCacheOnly(x.storageV5, x.credentials);
              if (isNonEmptyValue(j.request.add_plugins)) {
                let Et = await handleReloadPluginsAddPlugins({
                  addPlugins: j.request.add_plugins,
                  fromOffMachine: mayTransportPersist(e),
                });
                if (Et.kind === "refused") {
                  logFeatureBad("sdk_reload_add_plugins", Et.code);
                  yt(j, Et.message);
                  continue;
                }
                le = Et;
              }
              let be = isPluginsSyncLive(e) ? pluginInstallTimeoutMs() : undefined;
              Ba = be;
              await Promise.all([
                reconcileMarketplacesOnReload({
                  admission: x.pluginForwardingAdmission,
                  readFlag: isCloudPluginForwardingFlagOn,
                  flagWaitCapMs: PLUGIN_INSTALL_WAIT_MS,
                  install: (Et) =>
                    waitForRemoteManagedSettingsToLoad().then(() =>
                      installPluginsForHeadlessSerialized(Et, x.storageV5, x.credentials),
                    ),
                  installTimeoutMs: pluginInstallTimeoutMs(),
                  onLateEnd: (Et) => {
                    logLateInstallPass(Et);
                    ra.noteLateForwardedInstall();
                  },
                  now: () => performance.now(),
                }).then((Et) => {
                  logMarketplaceReconcile(Et);
                  if (!Et.ran && Et.reason === "flag_off") pw("reload");
                }),
                be === undefined
                  ? undefined
                  : withDeadline(Promise.allSettled([rerunPluginsSync(e, x.credentials)]), be).then((Et) => {
                      sa = Et === undefined;
                    }),
              ]);
              invalidateCommandNames();
              let we;
              if (j.request.hold_on_cache_impact) {
                let pluginReloadImpact = await computePluginReloadImpact({
                  model: Ao() ?? getMainLoopModel(),
                  mcpClients: getState().mcp.clients,
                  storageV5: x.storageV5,
                  credentials: x.credentials,
                });
                logReloadPluginsImpact(pluginReloadImpact, {
                  warned: pluginReloadImpact.wouldInvalidateCache,
                  forced: false,
                });
                if (pluginReloadImpact.wouldInvalidateCache) {
                  if (le) {
                    le.restore();
                    le = undefined;
                    logFeatureSad("sdk_reload_add_plugins", "held");
                  }
                  getSyncedPluginReloadDebt().holdReload();
                  let Wn = He
                    ? getState().plugins
                    : (Xe ?? {
                        enabled: [],
                        errors: [],
                      });
                  sendControlResponseSuccess(j, {
                    commands: toSlashCommands(Ho()),
                    agents: Re(),
                    plugins: emptyIfTransport(e, Wn.enabled.map(toPluginInitInfo)),
                    mcpServers: statusesForTransport(e, describeMcpServerForStatus(bc.mcpConnections())),
                    error_count: Wn.errors.length,
                    held: true,
                    cache_impact: {
                      mcp_servers_added: pluginReloadImpact.mcpServersAdded,
                      mcp_servers_removed: pluginReloadImpact.mcpServersRemoved,
                      lsp_tool_change: pluginReloadImpact.lspToolChange,
                    },
                  });
                  continue;
                }
                we = false;
              }
              retryUnloadedModules();
              let reloadsCompleted = getSyncedPluginReloadDebt().reloadsCompleted;
              let it = await refreshActivePlugins(Ee, x.storageV5, x.credentials);
              He = true;
              if (le) {
                le = undefined;
                logFeatureOk("sdk_reload_add_plugins");
              }
              buildAllTools(it.agentDefinitions.allAgents);
              let plugins = [];
              let [Ft, en, yn] = await Promise.allSettled([
                getCommands(cwd(), x.storageV5),
                Bl(Jm(), "reload_plugins"),
                loadAllPluginsCacheOnly(x.storageV5, x.credentials),
              ]);
              if (Ft.status === "fulfilled") {
                od = getNonInteractiveCommands(Ft.value);
                Wl();
              } else logError(Ft.reason);
              if (en.status === "rejected")
                logForDebugging(`reload_plugins: applyPluginMcpDiff failed: ${errorMessage(en.reason)}`, {
                  level: "error",
                });
              else ra.noteReloadedByHost(reloadsCompleted);
              if (yn.status === "fulfilled")
                plugins = emptyIfTransport(e, yn.value.enabled.map(toPluginInitInfo));
              else
                logError(withTelemetryMessage(toError(yn.reason), "reload_plugins: loadAllPlugins failed"));
              md();
              sendControlResponseSuccess(j, {
                commands: toSlashCommands(Ho()),
                agents: Re(),
                plugins,
                mcpServers: statusesForTransport(e, describeMcpServerForStatus(bc.mcpConnections())),
                error_count: it.error_count,
                ...(we !== undefined && {
                  held: we,
                }),
              });
            } catch (error) {
              if (le) {
                le.restore();
                logFeatureBad("sdk_reload_add_plugins", "refresh_failed");
              }
              Xn(j, "reload_plugins", error);
            }
          } else if (j.request.subtype === "reload_skills")
            try {
              if (isSkillsSyncActive(e)) {
                Ba = installWaitTimeoutMs();
                sa =
                  (await Promise.race([
                    Promise.allSettled([reloadSyncedSkills(e, x.storageV5, x.credentials)]),
                    sleep(Ba),
                  ])) === undefined;
              }
              refreshSkillsSyncVeto();
              await af();
              sendControlResponseSuccess(
                j,
                listSkillsForSdk(
                  await getSkillToolCommands(getOriginalCwd(), x.storageV5),
                  getState().mcp.commands,
                  od,
                ),
              );
            } catch (error) {
              Xn(j, "reload_skills", error);
            }
          else if (j.request.subtype === "mcp_call") {
            let { tool, arguments: Re } = j.request;
            handledOrphanedToolUseIds.get(j.request_id)?.abort();
            handledOrphanedToolUseIds.delete(j.request_id);
            if (typeof tool !== "string") {
              yt(j, "mcp_call: tool must be a string");
              continue;
            }
            let we = mcpInfoFromString(tool);
            let Je = we?.toolName ? mcpCallRefusalFor(we) : undefined;
            if (!we || !we.toolName)
              yt(j, `Not a fully-qualified MCP tool name: ${sanitizeTelemetryString(tool)}`);
            else if (Je !== undefined) yt(j, Je);
            else {
              let it =
                j.request.input_files !== undefined ||
                j.request.output_files !== undefined ||
                j.request.expires_at !== undefined ||
                j.request.timeout_ms !== undefined;
              let expiresAt = typeof j.request.expires_at === "string" ? j.request.expires_at : undefined;
              let toolName = we.toolName;
              let en = j.request.result_not_for_model === true;
              let yn =
                en &&
                persistsWithoutRedaction({
                  redactsWhatItPersists: isTransportBacked(e),
                  isRemoteTransport: structuredIO.isRemoteTransport(),
                });
              if (en && !yn) logFeatureSad("mcp_call_result_not_for_model", "ignored_on_lane");
              Io(async () => {
                if (abortController.signal.aborted) return;
                let Et = Oc();
                let childAbortController = createChildAbortController(abortController);
                handledOrphanedToolUseIds.set(j.request_id, childAbortController);
                let hn = () => handledOrphanedToolUseIds.get(j.request_id) === childAbortController;
                let jt = () => abortController.signal.aborted || !hn();
                try {
                  if (it && !getFeatureValue_CACHED_MAY_BE_STALE("tengu_ptc_enabled", true)) {
                    logFeatureBad("ccr_mcp_call_staged", "kill_switch");
                    yt(j, "staged mcp_call is disabled");
                    return;
                  }
                  let $t = await QU(we.serverName, expiresAt, childAbortController.signal);
                  if (jt()) return;
                  if (!$t) {
                    if (childAbortController.signal.aborted) {
                      yt(j, `mcp_call cancelled by client: ${sanitizeTelemetryString(we.serverName)}`);
                      return;
                    }
                    if (it) logFeatureBad("ccr_mcp_call_staged", "not_connected");
                    yt(j, `MCP server not connected: ${sanitizeTelemetryString(we.serverName)}`);
                    return;
                  }
                  let un = remoteBrowserRefusal($t.name);
                  if (un !== undefined) {
                    yt(j, un);
                    return;
                  }
                  if ($t.config.type === "sdk") {
                    yt(
                      j,
                      "mcp_call does not support SDK MCP servers. " +
                        `SDK servers are caller-provided \u2014 invoke ${sanitizeTelemetryString(we.serverName)} directly.`,
                    );
                    return;
                  }
                  let tool_2 =
                    [...getState().mcp.tools, ...dynamicMcpState.tools].find((resolve) =>
                      toolMatchesName(resolve, tool),
                    )?.mcpInfo?.toolName ?? toolName;
                  if (it) {
                    let { runStagedMcpCall } = await import("./chunk-km6145cp.js");
                    let dr = false;
                    let { staging, tool } = await runStagedMcpCall(j.request, {
                      signal: childAbortController.signal,
                      call: async (args, signal) => {
                        if (isMcpServerBlockedAtConnectTime($t.name, $t.config))
                          return {
                            isError: true,
                            content: [
                              {
                                type: "text",
                                text: `MCP server not connected: ${sanitizeTelemetryString(we.serverName)}`,
                              },
                            ],
                          };
                        let Kr = remoteBrowserRefusal($t.name);
                        if (Kr !== undefined)
                          return {
                            isError: true,
                            content: [
                              {
                                type: "text",
                                text: Kr,
                              },
                            ],
                          };
                        let ko;
                        try {
                          ko = await getMcpClientModule().callMCPToolWithUrlElicitationRetry({
                            client: $t,
                            clientConnection: $t,
                            callToolFn: (url) =>
                              guardRemoteBrowserMcpCall(getMcpClientModule().callMCPTool, url),
                            tool: tool_2,
                            args,
                            imageLimits: IMAGE_LIMITS,
                            signal,
                            requestDialog: undefined,
                            storageV5: x.storageV5,
                            credentials: x.credentials,
                            disallowTasks: true,
                            resultNotForModel: yn,
                          });
                        } catch (error) {
                          if (error instanceof McpAuthError) Me.markNeedsAuth(error.serverName);
                          if (error instanceof McpSessionExpiredError) {
                            logFeatureBad("mcp_session_recovery", "session_expired_no_retry");
                            return {
                              isError: true,
                              content: [
                                {
                                  type: "text",
                                  text: mcpConnectionClosedMessage({
                                    serverName: we.serverName,
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
                        if (ko.urlElicitationDeclined !== undefined)
                          return {
                            isError: true,
                            content: [
                              {
                                type: "text",
                                text: `URL elicitation required (open URL, then retry): ${sanitizeRelayUrl(ko.urlElicitationDeclined.url) ?? "[elicitation URL too long to relay \u2014 re-run this call in the terminal]"}`,
                              },
                            ],
                          };
                        if (yn && isMcpCallResultTooLarge(ko)) {
                          dr = true;
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
                          isError: ko.isError === true,
                          content: ko.content,
                          structuredContent: ko.structuredContent,
                          _meta: ko._meta,
                        };
                      },
                    });
                    if (jt()) return;
                    if (yn && staging.ok) logFeatureOk("mcp_call_result_not_for_model");
                    else if (dr) logFeatureBad("mcp_call_result_not_for_model", "too_large");
                    sendControlResponseSuccess(j, {
                      content: tool?.content,
                      structuredContent: tool?.structuredContent,
                      _meta: stripAnthropicMeta(tool?._meta),
                      staging,
                    });
                    return;
                  }
                  let cn = await getMcpClientModule().callMCPToolWithUrlElicitationRetry({
                    client: $t,
                    clientConnection: $t,
                    callToolFn: (submit) =>
                      guardRemoteBrowserMcpCall(getMcpClientModule().callMCPTool, submit),
                    tool: tool_2,
                    args: Re ?? {},
                    imageLimits: IMAGE_LIMITS,
                    signal: childAbortController.signal,
                    requestDialog: undefined,
                    storageV5: x.storageV5,
                    credentials: x.credentials,
                    disallowTasks: true,
                    resultNotForModel: yn,
                  });
                  if (jt()) return;
                  if (cn.urlElicitationDeclined)
                    yt(
                      j,
                      `URL elicitation required (open URL, then retry mcp_call): ${sanitizeRelayUrl(cn.urlElicitationDeclined.url) ?? "[elicitation URL too long to relay \u2014 re-run this call in the terminal]"}` +
                        (typeof cn.content === "string"
                          ? ` \u2014 ${pickForTransport(e, cn.content, "(detail withheld)")}`
                          : ""),
                    );
                  else if (cn.interrupted)
                    yt(j, `mcp_call cancelled by client: ${sanitizeTelemetryString(we.serverName)}`);
                  else if (yn && isMcpCallResultTooLarge(cn)) {
                    logFeatureBad("mcp_call_result_not_for_model", "too_large");
                    yt(j, MCP_CALL_RESULT_TOO_LARGE_TEXT);
                  } else {
                    if (yn) logFeatureOk("mcp_call_result_not_for_model");
                    sendControlResponseSuccess(j, {
                      content: cn.content,
                      structuredContent: cn.structuredContent,
                      _meta: stripAnthropicMeta(cn._meta),
                    });
                  }
                } catch (error) {
                  if (jt()) return;
                  if (it) logFeatureBad("ccr_mcp_call_staged", "dispatch_failed");
                  if (error instanceof McpAuthError) Me.markNeedsAuth(error.serverName);
                  Ws("mcp_call", error instanceof Error ? error.message : String(error));
                  let un = pickForTransport(
                    e,
                    error instanceof Error ? error.message : String(error),
                    "(detail withheld)",
                  );
                  if (error instanceof McpAuthError) {
                    un = `MCP server ${sanitizeTelemetryString(error.serverName)} requires authentication \u2014 send mcp_authenticate and retry mcp_call: ${sanitizeTelemetryString(un)}`;
                    yt(j, un.slice(0, 2000).replace(/[\uD800-\uDBFF]$/, ""));
                  } else if (error instanceof McpSessionExpiredError) {
                    logFeatureBad("mcp_session_recovery", "session_expired_no_retry");
                    un = mcpConnectionClosedMessage({
                      serverName: we.serverName,
                      error,
                      namesMcpCall: true,
                      detail: un,
                    });
                    yt(j, un.slice(0, 2000).replace(/[\uD800-\uDBFF]$/, ""));
                  } else if (error instanceof McpToolResultNotReadError) {
                    let prefix = sanitizeTelemetryString(we.serverName);
                    let why = error.why;
                    let Kn;
                    switch (why.kind) {
                      case "too_large":
                        Kn = `MCP server ${prefix} sent a response over Claude Code's ${Math.round(why.capBytes / 1024 / 1024)} MB limit, so this mcp_call got no result. The server may have run the tool, so check whether the call took effect before retrying mcp_call, and ask the tool for a smaller result if you retry.`;
                        break;
                      case "connection_closed":
                        Kn = `MCP server ${prefix} sent a message that was too large or could not be parsed, so Claude Code closed the connection and this mcp_call got no result. The server may have run the tool, so check whether the call took effect before retrying mcp_call.`;
                        break;
                    }
                    yt(j, Kn.slice(0, 2000).replace(/[\uD800-\uDBFF]$/, ""));
                  } else if (getMcpErrorClassificationModule().isUrlElicitationRequiredMcpError(error)) {
                    let mapped = getMcpClientModule()
                      .extractUrlElicitationsFromMcpError(error)
                      .map((prev) => prev.url);
                    let replaced = un.slice(0, 2000).replace(/[\uD800-\uDBFF]$/, "");
                    un =
                      mapped.length > 0
                        ? `URL elicitation required (open URL, then retry mcp_call): ${formatElicitationUrls(mapped)} \u2014 ${replaced}`
                        : `URL elicitation required (no URL in error data): ${replaced}`;
                    yt(j, un);
                  } else yt(j, un.slice(0, 2000).replace(/[\uD800-\uDBFF]$/, ""));
                } finally {
                  Et();
                  if (hn()) handledOrphanedToolUseIds.delete(j.request_id);
                  else if (!abortController.signal.aborted) structuredIO.controlRequestEnded(j.request_id);
                }
              });
            }
          } else if (j.request.subtype === "set_chrome_browser_hints") {
            if (!structuredIO.isRemoteTransport()) {
              yt(j, "set_chrome_browser_hints is only accepted in a remote-hosted session");
              continue;
            }
            let le = SDKSetChromeBrowserHintsSetChromeBrowserHintsMessageSchema().safeParse(j.request);
            if (!le.success) {
              yt(j, `Invalid set_chrome_browser_hints: ${le.error.issues[0]?.message ?? "malformed"}`);
              continue;
            }
            try {
              let { setChromeBrowserHints } = await import("./chunk-hzej0zw0.js");
              setChromeBrowserHints({
                preferredDeviceId: le.data.preferredDeviceId ?? undefined,
                localDeviceIds: le.data.localDeviceIds,
                hostPlatform: le.data.hostPlatform,
              });
              sendControlResponseSuccess(j);
            } catch (error) {
              Xn(j, "set_chrome_browser_hints", error);
            }
          } else if (j.request.subtype === "set_prompt_suggestions_paused") {
            let le = SDKSetPromptSuggestionsPausedSetPromptSuggestionsPausedMessageSchema().safeParse(
              j.request,
            );
            if (!le.success) {
              yt(j, `Invalid set_prompt_suggestions_paused: ${le.error.issues[0]?.message ?? "malformed"}`);
              continue;
            }
            promptSuggestionEmitter.setPaused(le.data.paused);
            sendControlResponseSuccess(j);
          } else if (j.request.subtype === "channel_enable") {
            let le = getState();
            handleChannelEnable(
              j.request_id,
              j.request.serverName,
              [...le.mcp.clients, ...sdkClients, ...dynamicMcpState.clients],
              output,
              messageQueue,
            );
          } else if (j.request.subtype === "mcp_authenticate") {
            let { serverName, redirectUri, liveReply } = j.request;
            let we = Pa(serverName) ?? sdkClients.find((Ft) => Ft.name === serverName)?.config ?? null;
            let Je = we ? classifyMcpAuthTarget(serverName, we) : null;
            let it = () => {
              if (!we) return `Server not found: ${sanitizeTelemetryString(serverName)}`;
              let Ft = mcpDialBlockCause(serverName, we);
              if (Ft === "managed-policy")
                return mcpRefusalText(
                  serverName,
                  Ft,
                  we,
                  `MCP server ${sanitizeTelemetryString(serverName)} is blocked by enterprise managed policy`,
                );
              if (isMcpServerDisabled(serverName))
                return disabledEnableBeforeText(serverName, "authenticating");
              if (Ft) return notApprovedText(serverName, "authenticating");
              return null;
            };
            let gt = it();
            if (!we || !Je) yt(j, `Server not found: ${sanitizeTelemetryString(serverName)}`);
            else if (gt !== null) yt(j, gt);
            else if (Je.kind === "claudeai-proxy") {
              let Ft = claudeAiConnectorAuthUrl(Je.config);
              if (!Ft) yt(j, "Unable to build claude.ai connector auth URL (missing org or server id)");
              else {
                logEvent("tengu_claudeai_mcp_auth_started", {});
                sendControlResponseSuccess(j, {
                  authUrl: Ft,
                  requiresUserAction: true,
                  callbackExpected: false,
                });
              }
            } else if (Je.kind === "unsupported-transport")
              yt(j, `Server type "${Je.transport}" does not support OAuth authentication`);
            else if (Je.kind === "anthropic-hosted") yt(j, sanitizeTelemetryString(Je.message));
            else
              Qn(async () => {
                let Ft;
                try {
                  let en = (redirectUri) => {
                    let Tr;
                    let promise = new Promise((resolve) => {
                      Tr = resolve;
                    });
                    let callbackPort;
                    let state;
                    let Er = {
                      oauthPromise: undefined,
                      adopted: false,
                      adopt: () => {
                        if (Er.adopted || !Er.oauthPromise) return;
                        Er.adopted = true;
                        oauthManualCallbackUsed.set(serverName, Er.oauthPromise);
                        _r.delete(serverName);
                        getMcpAuthModule().setActiveOAuthPromise(serverName, Er.oauthPromise);
                      },
                    };
                    let ss = getMcpAuthModule().performMCPOAuthFlow(
                      serverName,
                      Je.config,
                      (Go) => Tr(Go),
                      undefined,
                      {
                        skipBrowserOpen: true,
                        redirectUri,
                        onWaitingForCallback: (Go, Eu, fr) => {
                          callbackPort = Eu;
                          state = fr;
                          Er.adopt();
                        },
                      },
                    );
                    Er.oauthPromise = ss;
                    Ft = ss;
                    return {
                      oauthPromise: ss,
                      adopt: Er.adopt,
                      raced: Promise.race([promise, ss.then(() => null)]).then((authUrl) => ({
                        authUrl,
                        callbackPort,
                        state,
                      })),
                    };
                  };
                  let yn = identityEpoch();
                  let Et =
                    Boolean(Je.config.oauth?.clientId) ||
                    (Boolean(redirectUri) && (await shouldSkipCustomRedirect(serverName, Je.config)));
                  let Wn = () => {
                    let xt = it();
                    if (xt !== null) {
                      yt(j, xt);
                      return true;
                    }
                    if (identityEpoch() !== yn) {
                      yt(
                        j,
                        `The Claude account changed while sign-in to MCP server ${sanitizeTelemetryString(serverName)} was starting. Try again.`,
                      );
                      return true;
                    }
                    return false;
                  };
                  if (Wn()) return;
                  let redirectUri_2 = Et ? undefined : redirectUri;
                  let jt = "localhost";
                  let $t = en(redirectUri_2);
                  let un;
                  if (redirectUri_2)
                    try {
                      un = await $t.raced;
                      jt = "custom";
                    } catch (error) {
                      logForDebugging(
                        `[mcp_authenticate] AS rejected custom redirectUri for ${serverName}; falling back to localhost: ${sanitizeErrorDetail(redactMcpErrorDetail(serverName, Je.config, errorMessage(error)))}`,
                      );
                      if (oauthManualCallbackUsed.get(serverName) === $t.oauthPromise) {
                        oauthCallbackSubmitters.delete(serverName);
                        oauthManualCallbackUsed.delete(serverName);
                      }
                      if (Wn()) return;
                      $t = en();
                      un = await $t.raced;
                    }
                  else un = await $t.raced;
                  let oauthPromise = $t.oauthPromise;
                  let { authUrl, callbackPort, state } = un;
                  if (authUrl) {
                    let errorMessage = {
                      authUrl,
                      requiresUserAction: true,
                      callbackExpected: true,
                      redirectScheme: jt,
                      state,
                      ...(jt === "localhost" && {
                        callbackPort,
                      }),
                    };
                    if (liveReply === true) sendControlResponseError(j, errorMessage);
                    else sendControlResponseSuccess(j, errorMessage);
                  } else
                    sendControlResponseSuccess(j, {
                      requiresUserAction: false,
                      callbackExpected: false,
                    });
                  $t.adopt();
                  let qt = oauthPromise
                    .then(async () => {
                      if (identityEpoch() !== yn) {
                        logForDebugging(
                          `MCP server ${serverName}: OAuth completed after an identity change; discarding without reconnecting`,
                        );
                        return;
                      }
                      deleteNeedsAuthCache(x.storageV5);
                      if (isMcpServerDisabled(serverName)) return;
                      if (isMcpDialBlockedByPolicy(serverName, we)) {
                        logForDebugging(
                          `MCP server ${serverName} blocked by managed policy after OAuth \u2014 skipping reconnect`,
                          {
                            level: "warn",
                          },
                        );
                        return;
                      }
                      if (oauthCallbackSubmitters.has(serverName)) {
                        _r.set(serverName, Date.now());
                        return;
                      }
                      if (!Pa(serverName)) {
                        logForDebugging(
                          `MCP server ${sanitizeTelemetryString(serverName)}: OAuth completed for a server that is no longer configured; not reconnecting`,
                        );
                        return;
                      }
                      Qd(serverName, we);
                      let xt = await Ol(serverName, we, {
                        distrust: false,
                      });
                      Kd(serverName, xt);
                    })
                    .catch((error) => {
                      logForDebugging(
                        `MCP OAuth failed for ${serverName}: ${sanitizeErrorDetail(redactMcpErrorDetail(serverName, Je.config, errorMessage(error)))}`,
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
                  if (Ft && oauthManualCallbackUsed.get(serverName) === Ft) {
                    oauthCallbackSubmitters.delete(serverName);
                    oauthManualCallbackUsed.delete(serverName);
                  }
                  let yn = await isDcrRejection(error, serverName, Je.config).catch((error) => {
                    logHandlerFailure(isTransportBacked(e), "mcp_authenticate: registration check", error);
                    return false;
                  });
                  Xn(
                    j,
                    "mcp_authenticate",
                    Error(
                      normalizeMcpServerName(
                        redactMcpErrorDetail(serverName, Je.config, errorMessage(error)),
                      ),
                    ),
                    {},
                    yn ? "mcp_client_registration_unavailable" : undefined,
                  );
                }
              });
          } else if (j.request.subtype === "mcp_oauth_callback_url") {
            let { serverName, callbackUrl } = j.request;
            let oAuthCallbackSubmitter = getMcpAuthModule().getOAuthCallbackSubmitter(serverName);
            if (oAuthCallbackSubmitter) {
              let we = false;
              try {
                let parsed = new URL(callbackUrl);
                we = parsed.searchParams.has("code") || parsed.searchParams.has("error");
              } catch {}
              if (!we)
                yt(
                  j,
                  "Invalid callback URL: missing authorization code. Please paste the full redirect URL including the code parameter.",
                );
              else if (!oAuthCallbackSubmitter(callbackUrl))
                yt(
                  j,
                  "Callback URL not accepted: it belongs to a different sign-in attempt (OAuth state mismatch) or carries no authorization code. The sign-in in progress is still waiting; submit the redirect URL from its own browser page.",
                );
              else {
                oauthCallbackSubmitters.add(serverName);
                let Je =
                  oauthManualCallbackUsed.get(serverName) ??
                  getMcpAuthModule().getActiveOAuthPromise(serverName);
                if (Je) {
                  oauthAuthPromises.set(serverName, Je);
                  Qn(async () => {
                    try {
                      await Je;
                      sendControlResponseSuccess(j);
                    } catch (error) {
                      let gt =
                        Pa(serverName) ?? sdkClients.find((en) => en.name === serverName)?.config ?? null;
                      let Ft = gt
                        ? normalizeMcpServerName(redactMcpErrorDetail(serverName, gt, errorMessage(error)))
                        : "[error detail unavailable: server configuration could not be located]";
                      Ws("mcp_oauth_callback_url", Ft);
                      yt(j, pickForTransport(e, Ft, "OAuth authentication failed"));
                    } finally {
                      if (oauthAuthPromises.get(serverName) === Je) oauthAuthPromises.delete(serverName);
                    }
                  });
                } else sendControlResponseSuccess(j);
              }
            } else yt(j, `No active OAuth flow for server: ${sanitizeTelemetryString(serverName)}`);
          } else if (j.request.subtype === "claude_authenticate") {
            let { loginWithClaudeAi } = j.request;
            let Re = validateForceLoginMethod(loginWithClaudeAi ?? true);
            if (!Re.valid) {
              logFeatureBad("sdk_claude_authenticate", "force_login_method_refused");
              yt(j, Re.message);
              continue;
            }
            let be = providerBlockedMessage("firstParty");
            if (be !== undefined) {
              logFeatureBad("sdk_claude_authenticate", "provider_not_allowed");
              Ws("claude_authenticate policy", be);
              yt(
                j,
                "Login blocked: this machine's managed settings do not permit signing in to the Anthropic API here (allowedProviders), or the policy could not be read. Run claude auth login from a terminal for details.",
              );
              continue;
            }
            let settings_DEPRECATED = getSettings_DEPRECATED();
            let Je =
              settings_DEPRECATED.forceLoginMethod !== undefined &&
              (loginWithClaudeAi ?? true) !== (settings_DEPRECATED.forceLoginMethod === "claudeai");
            let forceLoginOrgUUID =
              typeof settings_DEPRECATED.forceLoginOrgUUID === "string" && !Je
                ? settings_DEPRECATED.forceLoginOrgUUID
                : undefined;
            let gt = claudeOAuth;
            if (
              gt?.urls !== undefined &&
              canJoinOAuthFlow(gt, loginWithClaudeAi ?? true, forceLoginOrgUUID, Date.now())
            ) {
              logEvent("tengu_oauth_flow_joined", {
                loginWithClaudeAi: loginWithClaudeAi ?? true,
              });
              sendControlResponseSuccess(j, gt.urls);
              continue;
            }
            let settingsOnlyGrant;
            claudeOAuth?.service.cleanup();
            logEvent("tengu_oauth_flow_start", {
              loginWithClaudeAi: loginWithClaudeAi ?? true,
            });
            let en = false;
            let service = new OAuthService();
            let Et;
            let urlPromise = new Promise((resolve) => {
              Et = resolve;
            });
            let flow = service
              .startOAuthFlow(
                async (manualUrl, automaticUrl) => {
                  Et({
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
                let $t = await checkNewLoginTokenOrg(err);
                if ($t.outcome === "refused") {
                  en = true;
                  logFeatureBad("sdk_claude_authenticate", "org_pin_refused");
                  let xt = await revokeRefusedSignInToken(err);
                  throw new WireSafeControlError(`${LOGIN_BLOCKED_POLICY_UNVERIFIED_TEXT} ${xt}`);
                }
                let un = await sdkClaudeAuthenticate(err);
                if (un !== undefined) {
                  en = true;
                  throw new WireSafeControlError(un);
                }
                let spareUnchangedFrom = new Set([
                  ...getState().mcp.clients,
                  ...rr.getDynamicMcpState().clients,
                ]);
                let cn = await saveLoginOrWarn(err, {
                  storageV5: x.storageV5,
                  credentials: x.credentials,
                });
                let Kn = err.tokenAccount
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
                bridgeSdkController.identityChanged(Kn);
                zr?.loginChanged(Kn);
                setAppState((xt) =>
                  xt.ultrareviewOverageConfirmed
                    ? {
                        ...xt,
                        ultrareviewOverageConfirmed: false,
                      }
                    : xt,
                );
                setAppState(resetSliceIfUnchanged);
                let dr = await validateForceLoginOrg(
                  x.credentials,
                  $t.outcome === "permitted" ? $t.verified : undefined,
                );
                if (!dr.valid) {
                  en = true;
                  logFeatureBad(
                    "sdk_claude_authenticate",
                    dr.reason === "provider_not_allowed" ? "provider_not_allowed" : "org_pin_refused",
                  );
                  let xt = await rollbackRefusedSignIn(cn?.storage, {
                    storageV5: x.storageV5,
                    credentials: x.credentials,
                  }).catch((error) => {
                    logRollbackFailure(error, "headless login");
                    return {
                      restored: false,
                      revoked: false,
                    };
                  });
                  rearmIdentityBaseline();
                  reconnectMcpOnIdentityChange({
                    ...rr,
                    storageV5: x.storageV5,
                    credentials: x.credentials,
                    getHostOwnedConfigs: Ca,
                    force: true,
                    spareUnchangedFrom,
                  });
                  bridgeSdkController.identityChanged(undefined);
                  zr?.loginChanged(undefined);
                  throw new WireSafeControlError(
                    xt.restored
                      ? LOGIN_BLOCKED_POLICY_UNVERIFIED_TEXT
                      : xt.revoked
                        ? LOGIN_BLOCKED_POLICY_RESTORE_FAILED_TEXT
                        : LOGIN_BLOCKED_POLICY_MAY_STILL_VALID_TEXT,
                  );
                }
                refreshAuthDependentSettings(x.storageV5, x.credentials);
                let qt = reconnectMcpOnIdentityChange({
                  ...rr,
                  storageV5: x.storageV5,
                  credentials: x.credentials,
                  getHostOwnedConfigs: Ca,
                });
                logFeatureOk("sdk_claude_authenticate");
                logEvent("tengu_oauth_success", {
                  loginWithClaudeAi: loginWithClaudeAi ?? true,
                });
                if (qt) await withDeadline(qt, CONNECT_RETRY_BASE_MS);
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
              if (error instanceof OAuthCallbackError || en) return;
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
              sendControlResponseSuccess(j, {
                manualUrl,
                automaticUrl,
              });
            } catch (error) {
              Xn(j, "claude_authenticate", error);
            }
          } else if (
            j.request.subtype === "claude_oauth_callback" ||
            j.request.subtype === "claude_oauth_wait_for_completion"
          ) {
            if (!claudeOAuth) yt(j, "No active claude_authenticate flow");
            else {
              if (j.request.subtype === "claude_oauth_callback")
                claudeOAuth.service.handleManualAuthCodeInput({
                  authorizationCode: j.request.authorizationCode,
                  state: j.request.state,
                });
              let { flow } = claudeOAuth;
              Qn(() =>
                flow.then(
                  (Re) => {
                    let accountInfo = getAccountInformation();
                    sendControlResponseSuccess(j, {
                      account: {
                        email: accountInfo?.email,
                        organization: accountInfo?.organization,
                        subscriptionType: accountInfo?.subscription,
                        tokenSource: accountInfo?.tokenSource,
                        apiKeySource: accountInfo?.apiKeySource,
                        apiProvider: getAPIProvider(),
                      },
                      ...Re,
                    });
                  },
                  (error) => {
                    Ws("claude_oauth_callback", errorMessage(error));
                    yt(
                      j,
                      error instanceof WireSafeControlError
                        ? sanitizeTelemetryString(errorMessage(error))
                        : pickForTransport(e, errorMessage(error), "claude_oauth_callback failed"),
                    );
                  },
                ),
              );
            }
          } else if (j.request.subtype === "mcp_clear_auth") {
            let { serverName } = j.request;
            let Re = Pa(serverName) ?? sdkClients.find((gt) => gt.name === serverName)?.config ?? null;
            let config =
              getState().mcp.clients.find((client) => client.name === serverName)?.config ??
              dynamicMcpState.clients.find((client) => client.name === serverName)?.config;
            let we = Re ?? config ?? null;
            let Je = (gt) =>
              require("./chunk-7t2akjbm.js").revokeStoredMcpTokens(serverName, config ? [gt, config] : [gt]);
            let it = (gt) => {
              if (gt.cleared) sendControlResponseSuccess(j, {});
              else yt(j, signOutFailureMessage(sanitizeTelemetryString(serverName), gt.reason, "try again"));
            };
            if (!we) yt(j, `Server not found: ${sanitizeTelemetryString(serverName)}`);
            else if (we.type !== "sse" && we.type !== "http")
              yt(j, `Cannot clear auth for server type "${we.type}"`);
            else if (!Re || isMcpDialBlockedByPolicy(serverName, we) || isMcpServerDisabled(serverName)) {
              let gt = await Je(we);
              let Ft =
                getState().mcp.clients.find((client) => client.name === serverName) ??
                dynamicMcpState.clients.find((client) => client.name === serverName);
              if (Ft && Ft.type !== "disabled") {
                await getMcpClientModule().clearServerCache(serverName, Ft.config);
                if (isDiscoveryCacheUsable())
                  await flushDiscoveryCache(getMcpClientModule().dropDiscoveryEntry(serverName, Ft.config));
                let en = mcpDialBlockCause(serverName, Ft.config);
                injectModelSwitchBreadcrumbs_2(serverName, {
                  client:
                    en === "managed-policy"
                      ? {
                          name: serverName,
                          type: "failed",
                          config: Ft.config,
                          ...mcpGateError(en, serverName, Ft.config),
                        }
                      : isMcpServerDisabled(serverName)
                        ? {
                            name: serverName,
                            type: "disabled",
                            config: Ft.config,
                          }
                        : en
                          ? {
                              name: serverName,
                              type: "failed",
                              config: Ft.config,
                              ...mcpGateError(en, serverName, Ft.config),
                            }
                          : {
                              name: serverName,
                              type: "failed",
                              config: Ft.config,
                              error: gt.cleared
                                ? "Authentication cleared"
                                : "Authentication could not be cleared",
                            },
                  tools: [],
                  commands: [],
                  attemptEpoch: identityEpoch(),
                });
              }
              it(gt);
            } else {
              let gt = await Je(we);
              Qd(serverName, we);
              let Ft = await Ol(serverName, we, {
                distrust: true,
              });
              Kd(serverName, Ft);
              it(gt);
            }
          } else if (j.request.subtype === "apply_flag_settings") {
            let le = mu(j.request_id);
            let Re = validateApplyFlagSettings(j.request.settings);
            if (!Re.ok) {
              yt(j, Re.error);
              continue;
            }
            let settings = Re.settings;
            let we = async (gt, Ft, en = "") => {
              let yn = gt.fastMode === true && (getFlagSettingsInline()?.fastMode !== true || "model" in gt);
              let prefix = getActiveAgentsFromList(agents);
              let Wn = (prev) => {
                let Qr =
                  prev.trim().toLowerCase() !== "default" &&
                  !isExemptDefaultResolvingPick(prev) &&
                  !(isModelAllowedUnderActiveEnforcement(prev) ?? isModelAllowed(prev));
                return {
                  blocked: Qr,
                  stepDown: Qr ? stepDownRestrictedFamilyAliasPick(prev) : null,
                };
              };
              let hn;
              let jt;
              let $t = () => {
                let fr = getState();
                return {
                  mainLoopModel: fr.mainLoopModel ?? userSpecifiedModel ?? getMainLoopModel(),
                  mainLoopModelForSession: fr.mainLoopModelForSession,
                  toolPermissionContext: fr.toolPermissionContext,
                };
              };
              if (("model" in gt || "agent" in gt) && hasPreModelSwitchHook(e)) {
                let fr = [];
                if ("model" in gt) {
                  let prev = gt.model == null ? null : String(gt.model);
                  let fo = prev === null ? null : Wn(prev);
                  if (prev !== null && fo !== null)
                    jt = {
                      raw: prev,
                      verdict: fo,
                    };
                  if (!(fo?.blocked && fo.stepDown === null))
                    fr.push(
                      prev === null || prev.trim().toLowerCase() === "default"
                        ? null
                        : (fo?.stepDown ?? prev),
                    );
                }
                if ("agent" in gt) {
                  let turnAgent = resolveTurnAgent(gt.agent, prefix);
                  hn = new Set();
                  for (let fo of [turnAgent.now, turnAgent.later])
                    if (fo !== undefined) {
                      hn.add(fo);
                      if (!fr.includes(fo)) fr.push(fo);
                    }
                }
                let Qr;
                for (let yo of fr) {
                  let fo;
                  try {
                    fo = await runPreModelSwitchHooks(e, $t, yo, "sdk");
                  } catch (error) {
                    logError(toError(error));
                    Qr = "apply_flag_settings failed";
                    break;
                  }
                  if (fo.decision !== "proceed") {
                    logFeatureSad("model_switch", "blocked_by_hook");
                    Qr = describeModelSwitchBlocked(fo);
                    break;
                  }
                  for (let message of fo.messages) qd(sanitizeHookText(message));
                }
                if (Qr !== undefined) {
                  yt(j, Qr + en);
                  return false;
                }
              }
              let un = gt;
              let Ht = null;
              if (hasCloudPluginsKey(gt)) {
                Ht = await splitCloudPluginsPatch({
                  settings: gt,
                  admission: x.pluginForwardingAdmission,
                  readFlag: isCloudPluginForwardingFlagOn,
                  flagWaitCapMs: PLUGIN_INSTALL_WAIT_MS,
                  now: () => performance.now(),
                });
                let { verdict, alone, merge } = Ht;
                if (!verdict.apply) {
                  logForDiagnosticsNoPII("info", "plugin_forwarding_patch_refused", {
                    reason: verdict.reason,
                    alone,
                  });
                  if (verdict.reason === "flag_off") pw("patch");
                  if (alone) {
                    yt(j, `${PLUGIN_FORWARDING_DISABLED}: ${verdict.reason}`);
                    return false;
                  }
                }
                un = merge;
              }
              let mainLoopModel = getMainLoopModel();
              let Kn = userSpecifiedModel;
              if ("agent" in un) {
                let turnAgent = resolveTurnAgent(un.agent, prefix);
                let now = turnAgent.now;
                let yo = hn;
                if (
                  yo !== undefined &&
                  [turnAgent.now, turnAgent.later].some((_d) => _d !== undefined && !yo.has(_d))
                ) {
                  yt(
                    j,
                    `agent switch not applied: the session's model changed while PreModelSwitch hooks ran; send the request again${en}`,
                  );
                  return false;
                }
                let fo = $t();
                let Mi = applyRequestedAgent({
                  requestedAgent: un.agent,
                  agents: prefix,
                  systemPrompt: x.systemPrompt,
                  preAgentSystemPrompt,
                });
                if (!Mi.ok) {
                  yt(j, Mi.error);
                  return false;
                }
                if (now !== undefined) recordSwitchIfChanged(e, fo, now, "sdk");
                if (!x.systemPrompt) td = false;
                x.systemPrompt = Mi.systemPrompt;
                preAgentSystemPrompt = Mi.preAgentSystemPrompt;
                noteSystemPromptSectionInvalidation("agent_switch");
                let agentType = Mi.agentDefinition?.agentType;
                setAppState((_d) =>
                  _d.agent === agentType
                    ? _d
                    : {
                        ..._d,
                        agent: agentType,
                      },
                );
              }
              applyFlagSettings(
                un,
                () =>
                  isFastModeEnabled() &&
                  fastModeSettingDiverges({
                    settings: getInitialSettings_2(),
                    fastMode: getState().fastMode,
                  }),
              );
              if (Ht !== null) {
                if (Ht.verdict.apply) pluginFlagTracker.applied(Ht.verdict.settings);
                if (!Ht.alone) logMixedCloudPluginsPatch(Ht);
              }
              let dr =
                "model" in un && un.model != null
                  ? jt?.raw === String(un.model)
                    ? jt.verdict
                    : Wn(String(un.model))
                  : {
                      blocked: false,
                      stepDown: null,
                    };
              let { blocked, stepDown } = dr;
              let Tr = "model" in un && isDefaultModelRefusedByPolicy(un.model);
              let co = (blocked && stepDown === null) || Tr;
              let Kr =
                "model" in un && un.model != null
                  ? (stepDown ??
                    (String(un.model).trim().toLowerCase() === "default"
                      ? getDefaultMainLoopModel()
                      : String(un.model)))
                  : null;
              if ("model" in un && !co) {
                recordSwitchIfChanged(
                  e,
                  $t(),
                  stepDown ??
                    (un.model == null || String(un.model).trim().toLowerCase() === "default"
                      ? null
                      : String(un.model)),
                  "sdk",
                );
                setMainLoopModelOverride(Kr);
                let fr = Kr ?? getMainLoopModel();
                setAppState((Qr) =>
                  Qr.mainLoopModelForSession === fr
                    ? Qr
                    : {
                        ...Qr,
                        mainLoopModelForSession: fr,
                      },
                );
              }
              let ko = "model" in un && !co && un.model != null && Kr != null ? Kr : undefined;
              let prevModel = getMainLoopModel();
              let ss = isWindowDivergentWrite({
                writtenModel: ko,
                prevModel: mainLoopModel,
                newModel: prevModel,
                prevActive: Kn,
              });
              let modelSwitchBreadcrumbs = createModelSwitchBreadcrumbs(un, userSpecifiedModel, prevModel);
              if (modelSwitchBreadcrumbs !== undefined) userSpecifiedModel = modelSwitchBreadcrumbs;
              if (prevModel !== mainLoopModel || ss) {
                let mainLoopModelForSession = ko !== undefined ? ko : prevModel;
                let Qr = ss && ko !== undefined ? ko : prevModel;
                userSpecifiedModel = Qr;
                setAppState((fo) => ({
                  ...fo,
                  mainLoopModelForSession,
                }));
                let yo = un.model && !co ? String(un.model) : "model" in un && !co ? "default" : prevModel;
                structuredIO.sessionState.notifyMetadataChanged({
                  model: prevModel,
                });
                if (
                  modelChangeNeedsNewContext({
                    appliedModel: Qr,
                    previousModel: Kn ?? mainLoopModel,
                    conversationModel: conversationModel(mainLoopModel),
                  })
                )
                  injectModelSwitchBreadcrumbs(yo, prevModel);
              }
              if ("model" in un)
                noticeFlagSettingsModel({
                  defaultPickRefused: Tr,
                  model: un.model == null ? null : String(un.model),
                  rejected: co,
                  stepDown,
                  effectiveModel: () => Ao(),
                });
              if (
                applyFlagSettingsSideEffects(un, {
                  getEngineState: getState,
                  setEngineState: setAppState,
                  reportEffortMetadata: (effortLevel) =>
                    structuredIO.sessionState.notifyMetadataChanged({
                      effort_level: effortLevel,
                    }),
                  model: getMainLoopModel(),
                })
              )
                structuredIO.sessionState.notifyMetadataChanged({
                  effort_request_id: toBoundedLabel(j.request_id),
                });
              if (yn && isMainModelFastRejected(getMainLoopModel())) clearFastRejectedFallbackModels();
              await mc(le);
              if (Ft) sendControlResponseSuccess(j);
              return true;
            };
            let Je = switchSerializerSlot.of(e).pending > 0;
            if (!(
              (("model" in settings || "agent" in settings) && (hasPreModelSwitchHook(e) || Je)) ||
              ("fastMode" in settings && Je)
            ))
              await we(settings, true);
            else {
              if (
                typeof settings.agent === "string" &&
                settings.agent !== "" &&
                !findAgentExcludingWebFetch(getActiveAgentsFromList(agents), settings.agent)
              ) {
                yt(j, `Agent "${String(settings.agent)}" not found`);
                continue;
              }
              let { model, agent, fastMode, ...yn } = settings;
              let Et =
                "agent" in settings &&
                ((Ht) => Ht.now !== undefined || Ht.later !== undefined)(
                  resolveTurnAgent(agent, getActiveAgentsFromList(agents)),
                );
              let Wn = "fastMode" in settings && ("model" in settings || Et || Je);
              let hn = {
                ...("model" in settings && {
                  model,
                }),
                ...(Et && {
                  agent,
                }),
                ...(Wn && {
                  fastMode,
                }),
              };
              let jt = {
                ...yn,
                ...("agent" in settings &&
                  !Et && {
                    agent,
                  }),
                ...("fastMode" in settings &&
                  !Wn && {
                    fastMode,
                  }),
              };
              let keys = Object.keys(jt);
              if (keys.length > 0 && !(await we(jt, false))) continue;
              if (Object.keys(hn).length === 0) {
                sendControlResponseSuccess(j);
                continue;
              }
              let un =
                keys.length > 0
                  ? ` (the request's other settings were applied: ${keys.map(sanitizeHookText).join(", ")})`
                  : "";
              Qn(() =>
                serializeModelSwitch(e, async () => {
                  try {
                    await we(hn, true, un);
                  } catch (error) {
                    logError(toError(error));
                    yt(j, `apply_flag_settings failed${un}`);
                  }
                }),
              );
            }
          } else if (j.request.subtype === "get_settings") {
            if (isTransportBacked(e)) {
              yt(j, "get_settings is not available on this connection");
              continue;
            }
            let le = () => {
              let Re = getState();
              let newModel = getMainLoopModel();
              let we = modelSupportsEffort(newModel)
                ? resolveEffortValue(newModel, resolveEffortLevel(Re))
                : undefined;
              let effortLevel = resolveEffortLevel(Re, undefined, {
                withHold: false,
              });
              let effortValue = resolveEffortValue(newModel, effortLevel, {
                carriedEffort: null,
              });
              let currentAppState = getEffortEnvOverride();
              let model = getSettingsWithSources_2();
              let mapped = getSettingsWithErrors_2()
                .errors.filter((error) => error.severity !== "warning")
                .map((error) => ({
                  file: error.file,
                  path: error.path,
                  message: error.message,
                }));
              let remoteControlPolicyLockReason = getRemoteControlPolicyLockReason();
              sendControlResponseSuccess(j, {
                ...model,
                remote_control_policy_lock_reason: remoteControlPolicyLockReason ?? undefined,
                applied: {
                  model: newModel,
                  effort: typeof we === "string" ? we : null,
                  ...(alwaysFalse() !== false && {
                    effortAuto:
                      modelSupportsEffort(newModel) &&
                      (currentAppState === null ||
                        (currentAppState === undefined && effortLevel === undefined)) &&
                      we === effortValue,
                  }),
                  advisor: resolveAdvisorModel(Re.advisorModel, newModel) ?? null,
                  ultracode: isUltracodeActive(Re.ultracode, newModel),
                  ultracodeRequested: Re.ultracode === true,
                  ultracodeAvailable: isUltracodeAvailable(newModel),
                  ultrathinkAvailable: isUltrathinkEffective(newModel, resolveEffortLevel(Re)),
                },
                errors: mapped.length > 0 ? mapped : undefined,
              });
            };
            if (
              getRemoteControlPolicyLockReason() !== null &&
              !isPolicyLimitsCacheLoaded() &&
              !isRemoteControlHardDisabled()
            )
              Qn(async () => {
                await Promise.race([ensurePolicyLimitsLoadedForDiagnostic(), waitForPolicyLimitsToLoad()]);
                le();
              });
            else le();
          } else if (j.request.subtype === "get_hooks_listing") {
            if (isTransportBacked(e)) {
              yt(j, "get_hooks_listing is not available on this connection");
              continue;
            }
            try {
              sendControlResponseSuccess(j, hookPolicySummary(ps));
            } catch (error) {
              Xn(j, "get_hooks_listing", error);
            }
          } else if (j.request.subtype === "update_settings") {
            let source = j.request.source;
            let Re = validateUpdateSettings(
              structuredIO.isRemoteTransport(),
              source === "userSettings"
                ? isSettingSourceEnabled("userSettings")
                : isSettingSourceEnabled("localSettings"),
              source,
              j.request.settings,
              alwaysFalse() !== false,
            );
            if (Re !== null) {
              yt(j, Re);
              continue;
            }
            if (source === "userSettings") {
              let we = String(j.request.settings.effortLevel);
              let Je = we === "auto" ? undefined : parseEffortLevel(we);
              if (Je === undefined && we !== "auto") {
                yt(j, EFFORT_LEVEL_ERROR);
                continue;
              }
              let it = await persistEffortSetting(Je, getMainLoopModel(), true, x.storageV5);
              if (it) {
                yt(j, it.message);
                continue;
              }
              if (we === "auto")
                logEvent("tengu_effort_command", {
                  effort: lit("auto"),
                  from_level: fromEnumOpt(
                    getEffortLevelIfSupported(getMainLoopModel(), resolveEffortLevel(getState())),
                  ),
                  route: lit("slider"),
                  is_remote: false,
                });
              sendControlResponseSuccess(j, {});
              continue;
            }
            let be = await updateSettingsForSource("localSettings", j.request.settings);
            if (be.error) yt(j, be.error.message);
            else sendControlResponseSuccess(j, {});
          } else if (j.request.subtype === "list_permission_rules") {
            if (isTransportBacked(e)) {
              yt(j, "list_permission_rules is not available on this connection");
              continue;
            }
            let { buildPermissionRulesWireState } = await import("./chunk-eecdvv5g.js");
            sendControlResponseSuccess(j, {
              state: buildPermissionRulesWireState({
                context: getState().toolPermissionContext,
                originalCwd: getSessionProject(e).originalCwd,
                readSettingsWithSources: getSettingsWithSources_2,
                readSettingsErrors: getSettingsWithErrors_2,
              }),
            });
          } else if (j.request.subtype === "submit_feedback") {
            let {
              description,
              surface,
              draft_id: draftId,
              type,
              title,
              area,
              attach_transcript: attachTranscript,
              save_locally: saveLocally,
            } = j.request;
            Io(async () => {
              try {
                if (draftId == null && saveLocally === true) {
                  sendControlResponseSuccess(
                    j,
                    await submitHeadlessFeedback({
                      messages: messages_2,
                      description,
                      surface: surface ?? "sdk",
                      storageV5: x.storageV5,
                      host: e.host,
                    }),
                  );
                  return;
                }
                let en = feedbackUnavailableReason();
                if (en) {
                  sendControlResponseSuccess(j, {
                    feedback_id: null,
                    unavailable_reason: en,
                  });
                  return;
                }
                if (draftId != null) {
                  let { submitDraftFromRequest } = await import("./chunk-4mbryacy.js");
                  sendControlResponseSuccess(
                    j,
                    await submitDraftFromRequest({
                      draftId,
                      description,
                      type,
                      title,
                      area,
                      attachTranscript,
                      surface,
                      messages: messages_2,
                      storageV5: x.storageV5,
                      host: e.host,
                      credentials: x.credentials,
                    }),
                  );
                  return;
                }
                let yn = await postFeedbackSubmission({
                  messages: messages_2,
                  description,
                  surface: surface ?? "sdk",
                  storageV5: x.storageV5,
                  host: e.host,
                  credentials: x.credentials,
                });
                if (yn.success) {
                  let ccshareUrl;
                  sendControlResponseSuccess(j, {
                    feedback_id: yn.feedbackId,
                    ccshare_url: ccshareUrl,
                  });
                } else
                  sendControlResponseSuccess(j, {
                    feedback_id: null,
                    is_zdr_org: yn.isZdrOrg,
                    failure_reason: yn.failureReason,
                    status_code: yn.statusCode,
                    unavailable_reason: orgFeedbackRefusalMessage(yn),
                  });
              } catch (error) {
                Xn(j, "submit_feedback", error);
              }
            });
          } else if (j.request.subtype === "submit_survey_feedback") {
            let { subtype, ...Re } = j.request;
            Io(async () => {
              try {
                let { submitSurveyFeedbackForSdk } = await import("./chunk-25hrjv6b.js");
                sendControlResponseSuccess(
                  j,
                  await submitSurveyFeedbackForSdk({
                    request: Re,
                    messages: messages_2,
                    storageV5: x.storageV5,
                    host: e.host,
                    credentials: x.credentials,
                  }),
                );
              } catch (error) {
                Xn(j, "submit_survey_feedback", error);
              }
            });
          } else if (j.request.subtype === "side_question") {
            let le = Wi.get(j.request_id);
            if (le) {
              logForDebugging(
                `side_question: duplicate delivery joins the run in flight (request_id ${sanitizeTelemetryString(j.request_id)})`,
              );
              Qn(() => le.then(() => structuredIO.controlRequestEnded(j.request_id)));
              continue;
            }
            if (isShuttingDown()) {
              yt(j, "Session is shutting down");
              continue;
            }
            let { question, history } = j.request;
            let childAbortController = createChildAbortController(abortController_2);
            handledOrphanedToolUseIds.set(j.request_id, childAbortController);
            let deferred = Promise.withResolvers();
            Wi.set(j.request_id, deferred.promise);
            let it = false;
            Qn(async () => {
              try {
                let gt = runSideQuestionWithProgress({
                  question,
                  history,
                  parentController: childAbortController,
                  onProgress: (yn) => {
                    if (!it && !isTerminalShutdown()) bL(j, yn);
                  },
                  getLiveMessages: () => messages_2,
                  isTurnInProgress: () => ze.running,
                  buildFallbackParams: () =>
                    buildSideQuestionFallbackParams({
                      session: e,
                      turnInProgress: ze.running,
                      messageQueue,
                      tools: Gd(getState()),
                      toolCatalog: TOOL_CATALOG,
                      commands: Ho(),
                      mcpClients: [...getState().mcp.clients, ...sdkClients, ...dynamicMcpState.clients],
                      messages: messages_2,
                      readFileState: readFilesFromMessages,
                      toolState,
                      sessionHooks: ps,
                      getAppState: getState,
                      setAppState,
                      customSystemPrompt: hg(),
                      appendSystemPrompt: x.appendSystemPrompt,
                      excludeDynamicSections: x.excludeDynamicSections,
                      thinkingConfig: hasEffort.current(),
                      agents: getActiveAgentsFromList(agents),
                      runQuery: query,
                      storageV5: x.storageV5,
                      credentials: x.credentials,
                    }),
                });
                let en = await withTimeout(
                  gt,
                  SIDE_QUESTION_TIMEOUT_MS,
                  SIDE_QUESTION_TIMEOUT_MESSAGE,
                ).finally(() => (sigintHandler() ? heldUntilExit() : undefined));
                if (en.cancelled) {
                  logEvent("tengu_sdk_side_question_cancelled", {});
                  yt(j, "Side question cancelled");
                } else if (isTransportBacked(e)) {
                  if (en.response.synthetic && en.response.response)
                    Ws("side_question", en.response.response);
                  sendControlResponseSuccess(j, markSyntheticControlResponse(en.response));
                } else sendControlResponseSuccess(j, en.response);
              } catch (error) {
                if (errorMessage(error) === SIDE_QUESTION_TIMEOUT_MESSAGE) {
                  logForDebugging(
                    `side_question: no answer by the deadline, giving the run up (request_id ${sanitizeTelemetryString(j.request_id)})`,
                    {
                      level: "error",
                    },
                  );
                  childAbortController.abort(userAbortReason("shutdown"));
                  yt(j, SIDE_QUESTION_TIMEOUT_MESSAGE);
                } else Xn(j, "side_question", error);
              } finally {
                it = true;
                if (handledOrphanedToolUseIds.get(j.request_id) === childAbortController)
                  handledOrphanedToolUseIds.delete(j.request_id);
                Wi.delete(j.request_id);
                deferred.resolve();
              }
            });
          } else if (j.request.subtype === "ultrareview_launch") {
            let { args = "", confirm = false } = j.request;
            Io(async () => {
              try {
                let { runUltrareviewHeadless } = await import("./chunk-vvrhw27g.js");
                let result = await runUltrareviewHeadless(args, {
                  confirm,
                  confirmsBeforeLaunch: true,
                  overageConfirmed: getState().ultrareviewOverageConfirmed,
                  markOverageConfirmed: () => confirmUltrareviewOverage(setAppState),
                  context: {
                    abortController: createAbortController(),
                    taskRegistry: createTaskFramework(getState, setAppState),
                    storageV5: x.storageV5,
                    credentials: x.credentials,
                  },
                });
                let ultrareviewMessages = buildUltrareviewMessages(args, result);
                Gs(ultrareviewMessages);
                for (let ultrareviewMessage of ultrareviewMessages)
                  output.enqueue({
                    type: "user",
                    message: ultrareviewMessage.message,
                    session_id: getSessionId(),
                    parent_tool_use_id: null,
                    uuid: ultrareviewMessage.uuid,
                    timestamp: ultrareviewMessage.timestamp,
                    isReplay: true,
                    isSynthetic: ultrareviewMessage.isMeta,
                  });
                sendControlResponseSuccess(j, result);
              } catch (error) {
                Xn(j, "ultrareview_launch", error);
              }
            });
          } else if (j.request.subtype === "message_rated") {
            let le = SDKMessageRatedMessageRatedMessageSchema().safeParse(j.request);
            if (!le.success) {
              yt(
                j,
                'message_rated: messageUuid must be a string, sentiment "positive" or "negative", surface "tool_use" or "assistant_text", and cleared a boolean',
              );
              continue;
            }
            if (isPolicyAllowed("allow_product_feedback")) {
              let { messageUuid, sentiment, surface = "tool_use", cleared = false } = le.data;
              logEvent("tengu_message_rated", {
                message_uuid: sanitizeMarkName(messageUuid),
                sentiment: fromEnum(sentiment),
                surface: fromEnum(surface),
                cleared,
              });
            }
            sendControlResponseSuccess(j, {});
          } else if (j.request.subtype === "remote_control") {
            let req = j.request;
            let Re = Vi(async () => {
              let be;
              try {
                if (req.enabled && structuredIO.isRemoteTransport())
                  yt(j, "Remote Control cannot be enabled from inside a remote session");
                else if (req.enabled) {
                  if (vn && (ts || isTeleportedSession(vn.bridgeSessionId))) {
                    let we = vn;
                    bridgeSdkController.release(we, {
                      keepRecord: true,
                    });
                    structuredIO.setOnControlRequestSent(undefined);
                    structuredIO.setOnControlRequestResolved(undefined);
                    setSdkHostedBridgeHandle(null, x.storageV5);
                    setCurrentForKey(e, undefined);
                    registerLiveSuppressionProbe(undefined);
                    vn = null;
                    ts = false;
                    vu = undefined;
                    bu = undefined;
                    setReplBridgeActive(false);
                    try {
                      zr?.undo().catch(logError);
                    } catch (error) {
                      logError(error);
                    }
                    await we.teardown();
                  }
                  if (vn) sendControlResponseSuccess(j, Pl(vn, bridgeEpoch));
                  else {
                    let we;
                    let Je;
                    let bridgeEpoch_2;
                    let gt = false;
                    let sliced = messages_2.slice();
                    be = sliced.length > 0 ? sliced : undefined;
                    Ms = be;
                    let en = new Set();
                    let recordAtEnable = bridgeSdkController.armForEnable(en);
                    if (typeof req.work_secret === "string" && req.work_secret && !zr) _s = null;
                    bridgeSdkController.setLoginIdentity(
                      await readFreshOauthAccountFromDisk(x.storageV5).catch(() => {
                        return;
                      }),
                    );
                    let { initReplBridge, HEADLESS_BRIDGE_WORKSPACE_DIFF_COMPUTE_BUDGET } =
                      await import("./chunk-cg2r2hy6.js");
                    let workSecret =
                      typeof req.work_secret === "string" && req.work_secret ? req.work_secret : undefined;
                    if (workSecret && !zr) {
                      let { createHeadlessWorkSecretSession } = await import("./chunk-h3xe040t.js");
                      zr ??= createHeadlessWorkSecretSession({
                        stores: rr,
                        storageV5: x.storageV5,
                        credentials: x.credentials,
                        getAppendSystemPrompt: () => x.appendSystemPrompt,
                        setAppendSystemPrompt: (appendSystemPrompt) => {
                          x.appendSystemPrompt = appendSystemPrompt;
                        },
                        sdkHostConfigs: () => R,
                        awaitHostApplyQuiescence: () =>
                          mcpChangesPromise.then(
                            () => {
                              return;
                            },
                            () => {
                              return;
                            },
                          ),
                        permission: {
                          get: () => getState().toolPermissionContext,
                          set: (updater) =>
                            setAppState((prev) => ({
                              ...prev,
                              toolPermissionContext: updater(prev.toolPermissionContext),
                            })),
                        },
                        settleAutoModeAvailability: Ta,
                        applyModelPick: fu,
                        applyEffortSeed,
                      });
                      if (_s) zr.noteModeChoice(_s);
                      _s = undefined;
                    }
                    let jt = bridgeSdkController.armedConversationRotated();
                    if (jt)
                      we =
                        "The conversation was cleared while Remote Control was being enabled; send the request again";
                    let $t = jt
                      ? null
                      : await initReplBridge({
                          recordAtEnable,
                          recordWriterHonorsServerVouch: true,
                          reportGateRefusalReason: true,
                          onProjectsBindingHint: () => {
                            zr?.resyncProjectsReplyMount();
                          },
                          onDialogKindsDeclared(Ht, cn) {
                            logBridgeDialogKindsDeclared(en, Ht, cn, () => {
                              if (vn) bridgeSdkController.persist(vn);
                            });
                          },
                          tags: [REMOTE_CONTROL_SDK],
                          skipAutoTitle: isTerminalTitleSuppressed(),
                          remoteControlOrigin: "sdk",
                          getBackfillMessages: () =>
                            messages_2.filter(
                              (Ht) => !(isCompactBoundaryOrSummary(Ht) && isCompactPairWithheldFromRemote()),
                            ),
                          getMessages: () => messages_2,
                          isTurnActive: () => ze.running,
                          onGetContextUsage: vg,
                          enableSessionPersistence:
                            isPersistentRemoteSessionEnabled() || isRemoteControlInternalEventsEnabled(),
                          storageV5: x.storageV5,
                          credentials: x.credentials,
                          onTransportRebuilt: forwardRateLimitToBridge,
                          getTools: () => Gd(getState()),
                          getToolPermissionContext: () => getState().toolPermissionContext,
                          host: e.host,
                          workspaceDiffComputeBudget: HEADLESS_BRIDGE_WORKSPACE_DIFF_COMPUTE_BUDGET,
                          getInitializeState: () => ({
                            current_model: getMainLoopModel(),
                            current_permission_mode: toExternalPermissionMode(
                              getState().toolPermissionContext.mode,
                            ),
                          }),
                          getCommands: () => logBridgeInitializeCommands(cg()),
                          onClientInitialize: () => {
                            na("client_initialize", {
                              force: true,
                            });
                            Ga();
                          },
                          onQueuedNotification(Ht) {
                            acceptQueuedNotification(Ht, {
                              getAppState: getState,
                              setAppState,
                              session: e,
                            });
                          },
                          async onInboundMessage(Ht) {
                            let receivedAtMs = performance.now();
                            let Kn = resolved;
                            let dr;
                            resolved = new Promise((resolve) => {
                              dr = resolve;
                            });
                            try {
                              let fields = extractInboundMetadata(Ht);
                              if (!fields) return;
                              let { uuid } = fields;
                              recordRemoteSurfaceSeen(fields.clientPlatform, x.storageV5);
                              let Tr =
                                workSecret !== undefined && isHearthOrigin(fields.inboundOrigin)
                                  ? await classifyInboundLane(Ht, fields)
                                  : undefined;
                              let co = Tr
                                ? Tr.ingressOrigin
                                : classifyInboundOrigin(
                                    fields.content,
                                    fields.clientPlatform,
                                    fields.inboundOrigin,
                                    fields.receiverGroupingId,
                                    fields.slackOrigin,
                                    fields.activityObservation,
                                    fields.fromPlugin,
                                  );
                              let Kr = refineInboundOrigin(co, fields.clientPlatform, fields.inboundOrigin);
                              using ko = messageQueue.beginInboundIngest(
                                isPeerOrSlackPing(co) ? undefined : uuid,
                              );
                              await Kn;
                              await switchSerializerSlot.of(e).tail;
                              let inboundRefuseCause = getInboundRefuseCause(co);
                              if (inboundRefuseCause !== undefined) {
                                logInboundRefused(
                                  "bridge:onInboundMessage: dropped before attachment materialization",
                                  inboundRefuseCause,
                                );
                                reportCommandRefused(structuredIO, uuid, "bridge");
                                return;
                              }
                              let inboundAttachments = extractInboundAttachments(Ht);
                              let content = fields.content;
                              content = escapePluginTags(content, fields.inboundOrigin);
                              let inboxWakeFor = resolveInboxWakeFor(
                                content,
                                fields.inboundOrigin,
                                fields.wakeEnvelope,
                              );
                              let fr = promptOriginKind(fields.content);
                              if (!isPeerOrSlackPing(co))
                                content = buildExternalEventRecord(
                                  content,
                                  fields.pastedContent,
                                  fields.inlinePastes,
                                );
                              let Qr = await dispatchSessionReceiveHooks({
                                origin: originFromBridgeMetadata(co ?? Kr),
                                content,
                                event: inboxWakeFor,
                              });
                              if (Qr.consumed !== undefined) {
                                reportCommandRefused(structuredIO, uuid, "bridge");
                                return;
                              }
                              content = Qr.content;
                              using queueing = Qr.queueing;
                              let fo = Tr?.isSynthetic === true && !isProjectsRelay(Kr);
                              let Mi = await resolveAndPrepend(
                                Ht,
                                content,
                                Tr
                                  ? !Tr.isSynthetic && co?.kind === "human"
                                  : humanHintOrPlatform(co, fields.clientPlatform, fields.inboundOrigin),
                                x.storageV5,
                                x.credentials,
                              );
                              let { content: content_2, inlinedImagePaths, missingFiles } = Mi;
                              let pb = inheritedAttributionKey(uuid, {
                                isCrossSession: isGatedInbound({
                                  ingressOrigin: co,
                                  inboundOrigin: fields.inboundOrigin,
                                  envelopePeer: hasTeammateMessageEnvelope(fields.content),
                                }),
                              });
                              let LL = {
                                value: content_2,
                                ...(fr !== undefined && {
                                  foreignWord: fr,
                                }),
                                mode: "prompt",
                                agentId: mainAgentId(),
                                uuid,
                                receivedAtMs,
                                ...(pb && {
                                  turnAttributionKey: pb,
                                }),
                                skipSlashCommands: true,
                                ...(inlinedImagePaths.length > 0 && {
                                  inlinedImagePaths,
                                }),
                                ...(inboundAttachments.length > 0 && {
                                  fileAttachments: inboundAttachments,
                                }),
                                ...(co?.kind === "peer"
                                  ? {
                                      origin: stripPeerMessageBody(co, content_2, fields.content),
                                      isMeta: true,
                                      skipAttachments: true,
                                      ...(hasVerifiedSlackHumanTurn(messageQueue) && {
                                        priority: "later",
                                      }),
                                    }
                                  : {
                                      bridgeOrigin: true,
                                      clientPlatform: fields.clientPlatform,
                                      ...(Kr &&
                                        !fo && {
                                          origin: Kr,
                                        }),
                                      ...textNotTypedFlags(Ht, Mi),
                                      ...(Kr !== undefined &&
                                        !isHumanOrAutoContinuation(Kr) && {
                                          skipAttachments: true,
                                        }),
                                      ...(Kr?.kind === "task-notification" &&
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
                                      ...(Tr && {
                                        ...Tr.stamps,
                                        ...(Tr.isSynthetic && {
                                          isMeta: true,
                                          skipAttachments: true,
                                        }),
                                        ...(Tr.isRelayHuman && {
                                          priority: resolveQueuePriority(
                                            undefined,
                                            fields.content,
                                            hasSlackLaterNotification(messageQueue),
                                          ),
                                        }),
                                        ...(shouldStampThreadState({
                                          carrier: {
                                            origin: Kr,
                                            hearthRelayRows: Tr.stamps.hearthRelayRows,
                                          },
                                          isPeer: false,
                                        }) && {
                                          stampThreadState: true,
                                        }),
                                      }),
                                    }),
                              };
                              let mh = markOwnWord(LL, true);
                              wt.mark(mh, "bridge");
                              let gb = gateInboundByOrigin(co, mh);
                              if (gb !== "accept") {
                                if (gb === "refused") reportCommandRefused(structuredIO, uuid, "bridge");
                                return;
                              }
                              if (ko.withdrawn()) {
                                let gh = bridgeMessageUuid(uuid, "bridge");
                                if (gh !== undefined) structuredIO.onCommandLifecycle?.(gh, "cancelled");
                                return;
                              }
                              messageQueue.enqueue(mh);
                              if (lazySessionInboxPointers)
                                lazySessionInboxPointers.sessionInboxPointers.of(e).noteQueued({
                                  inboundOrigin: fields.inboundOrigin,
                                  wake: inboxWakeFor,
                                  uuid,
                                });
                              queueing.queued();
                              let ph = bridgeMessageUuid(uuid, "bridge");
                              if (ph !== undefined) structuredIO.onCommandLifecycle?.(ph, "queued");
                              logBridgeAttachmentsMissing(ph, inboundAttachments.length, missingFiles);
                              if (!ze.inputClosed) Os();
                            } catch (error) {
                              logForDebugging(`[bridge:sdk] onInboundMessage failed: ${error}`, {
                                level: "error",
                              });
                            } finally {
                              Kn.then(dr, dr);
                            }
                          },
                          onPermissionResponse(Ht) {
                            return structuredIO.injectRemoteControlResponse(Ht);
                          },
                          onInterrupt() {
                            if (!isTerminalShutdown())
                              try {
                                ze.abortController?.abort(userAbortReason("remote-cancel"));
                                MODEL_SWITCH_STATE();
                                teardownAutoReactAndRooms({
                                  taskRegistry: createTaskFramework(getState, setAppState),
                                  setAppState,
                                  storageV5: x.storageV5,
                                });
                                wf();
                              } catch (error) {
                                logError(error);
                                logFeatureBad("per_task_stop_sparing", "bridge_interrupt_sweep_throw");
                              }
                          },
                          onStopTask: (request) =>
                            stopTaskByUser(request, {
                              taskRegistry: createTaskFramework(getState, setAppState),
                              setAppState,
                              session: e,
                              getAppState: getState,
                              source: "client",
                              storageV5: x.storageV5,
                            }),
                          onBackgroundTasks(toolUseId) {
                            let taskRegistry = createTaskFramework(getState, setAppState);
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
                              prewaitLatch: Ro,
                              io: structuredIO,
                            }),
                          onSetModel: fu,
                          onSetMaxThinkingTokens: (Ht, cn) => applyThinkingBudget(hasEffort, Ht, cn),
                          onSetPermissionMode: (Ht) => {
                            let cn = setPermissionModeWithGuards(
                              Ht,
                              getState().toolPermissionContext,
                              (updater) =>
                                setAppState((prev) => ({
                                  ...prev,
                                  toolPermissionContext: updater(prev.toolPermissionContext),
                                })),
                            );
                            if (cn.ok) is(cn.mode);
                            return cn;
                          },
                          onApplyFlagSettings: (Ht, cn) => {
                            let mainLoopModel = getMainLoopModel();
                            let effortLevelOrNull = resolveEffortLevelOrNull(
                              mainLoopModel,
                              resolveEffortLevel(getState()),
                            );
                            let qt = applyBridgeFlagSettings(Ht, {
                              model: mainLoopModel,
                              getAppState: getState,
                              setAppState,
                            });
                            if (!qt.ok) return qt;
                            let effortLevelOrNull_2 = resolveEffortLevelOrNull(
                              mainLoopModel,
                              resolveEffortLevel(getState()),
                            );
                            reportEffortForModel(mainLoopModel, getState());
                            reportBridgeEffortForRequest(cn);
                            na("state_change", {
                              force: effortLevelOrNull_2 === effortLevelOrNull,
                            });
                            return {
                              ok: true,
                            };
                          },
                          onStateChange(Ht, detail, Kn) {
                            if (Ht === "connected" && be !== undefined && Ms === be) Ms = undefined;
                            if (Ht === "policy_disabled") {
                              we = detail;
                              Je = "remote_control_policy_disabled";
                            } else if (Ht === "failed") {
                              we = detail;
                              Je =
                                Kn === undefined || policyDenyKind("allow_remote_control") === "cache_miss"
                                  ? undefined
                                  : remoteControlErrorCode(Kn);
                              if (vn) {
                                ts = true;
                                setReplBridgeActive(false);
                                try {
                                  zr?.undo().catch(logError);
                                } catch (err) {
                                  logError(err);
                                }
                              }
                            } else if (Ht === "connected" || Ht === "ready") {
                              let dr = ts;
                              ts = false;
                              if (vn) {
                                setReplBridgeActive(true);
                                if (Ht === "connected" && dr) {
                                  logBridgeRateLimitForward(vn);
                                  na("reconnected", {
                                    force: true,
                                  });
                                  Ga();
                                  if (workSecret && zr) {
                                    let qt = vn;
                                    Promise.resolve()
                                      .then(() => {
                                        if (vn === qt && !ts) zr?.apply(workSecret, qt);
                                      })
                                      .catch(logError);
                                  }
                                }
                              }
                              if (Ht === "connected" && gt) {
                                gt = false;
                                if (!ze.running) vn?.sendResult();
                              }
                            }
                            logForDebugging(
                              `[bridge:sdk] State change: ${Ht}${detail ? ` \u2014 ${detail}` : ""}`,
                            );
                            kw(Ht, detail, bridgeEpoch_2, Kn);
                          },
                          initialMessages: be,
                          initialName: req.name,
                          reattachSessionId:
                            typeof req.reattach_session_id === "string" ? req.reattach_session_id : undefined,
                          neverArchive: req.keep_session_on_exit === true,
                          workSecret,
                          onWorkSecretRefresh: (Ht) => structuredIO.requestRemoteControlWorkSecret(Ht),
                        });
                    if (!$t && Ms === be) Ms = undefined;
                    let un = sliced.length;
                    if (!$t) {
                      bridgeSdkController.enableFailed();
                      if (we !== undefined) Ws("remote_control", we);
                      yt(
                        j,
                        pickForTransport(
                          e,
                          we ?? "Remote Control initialization failed",
                          "Remote Control initialization failed",
                        ),
                        Je,
                      );
                    } else {
                      vn = $t;
                      Si = new Set(sliced.map((cn) => cn.uuid));
                      ts = false;
                      bridgeEpoch_2 = ++bridgeEpoch;
                      try {
                        if (workSecret && zr) zr.apply(workSecret, $t);
                        else zr?.undo().catch(logError);
                      } catch (error) {
                        logError(error);
                      }
                      bridgeSdkController.attached($t);
                      setReplBridgeActive(true);
                      setSdkHostedBridgeHandle($t, x.storageV5);
                      setCurrentForKey(e, undefined);
                      registerLiveSuppressionProbe(
                        () => getSdkHostedBridgeHandle()?.noHistoryBackfill === true,
                      );
                      reportBridgePermissionMode(getState().toolPermissionContext.mode);
                      setInboundAvailabilityPublisher(reportBridgeCrossSessionInbound);
                      let mainLoopModel = getMainLoopModel();
                      reportBridgeModel(mainLoopModel);
                      reportEffortForModel(mainLoopModel, getState());
                      buildBridgeInitializeCommands(Il);
                      persistBridgeArtifactFrames(getState().frameUrls);
                      installRemoteEgressSuppressor();
                      Ps = $t.noHistoryBackfill ? Math.max(un, Ps) : Math.min(un, Ps);
                      Dd();
                      if (messages_2.length > un) gt = true;
                      structuredIO.setOnControlRequestSent((cn) => {
                        $t.sendControlRequest(cn);
                      });
                      for (let cn of [
                        ...structuredIO.getPendingPermissionRequests(),
                        ...structuredIO
                          .getPendingUserDialogRequests()
                          .filter(
                            ({ request }) =>
                              request.subtype !== "request_user_dialog" ||
                              request.dialog_kind !== ENUM_PROMPT,
                          ),
                      ])
                        $t.sendControlRequest(cn);
                      structuredIO.setOnControlRequestResolved((cn) => {
                        $t.sendControlCancelRequest(cn);
                      });
                      emitBackgroundTasksChanged(getState());
                      logBridgeRateLimitForward($t);
                      na("attach", {
                        force: true,
                      });
                      Ga();
                      sendControlResponseSuccess(j, Pl($t, bridgeEpoch_2));
                      if (!isLovelyUmbrellaOn()) vw();
                    }
                  }
                } else {
                  await Sw();
                  sendControlResponseSuccess(j);
                }
              } catch (error) {
                if (Ms === be) Ms = undefined;
                if (!vn) bridgeSdkController.enableFailed();
                Xn(j, "remote_control", error);
              }
            });
            resolved_2 = Re;
            Qn(() => Re);
          } else if (
            j.request.subtype === "register_device_hooks" ||
            j.request.subtype === "upload_device_hook_template"
          ) {
            let le = x.deviceHooksAdmission ?? {
              admitted: false,
              reason: "not_managed_cloud_worker",
            };
            if (!le.admitted) {
              logFeatureBad("device_hooks_register", le.reason);
              yt(j, `hook_forwarding_disabled: ${le.reason}`);
            } else {
              ah ??= import("./chunk-5ac1fnqf.js")
                .then(async (Re) =>
                  Re.createDeviceHooksWorker(
                    await Re.productionDeviceHooksWorkerDeps({
                      projectRoot: getOriginalCwd,
                      cwd: getCwd,
                      workerEpoch: env.CLAUDE_CODE_WORKER_EPOCH,
                      sender: structuredIO,
                      toolAliases: () => x.toolAliases,
                    }),
                  ),
                )
                .catch((error) => {
                  ah = undefined;
                  throw error;
                });
              try {
                let Re = await (await ah).handle(j);
                if (Re.kind === "success") sendControlResponseSuccess(j, Re.response);
                else yt(j, Re.error);
              } catch (error) {
                logForDiagnosticsNoPII("warn", "device_hooks_handler_failed", {});
                logError(error);
                logFeatureBad("device_hooks_register", "internal_error");
                yt(j, "hook_forwarding_not_ready: internal_error; retry");
              }
            }
          } else if (j.request.subtype === "remote_tools_announce") {
            Qv ??= createRemoteToolsAnnounceHandler(
              x.remoteToolsAdmission ?? {
                admitted: false,
                reason: "not_managed_cloud_worker",
              },
              {
                workerEpoch: env.CLAUDE_CODE_WORKER_EPOCH,
                toolState,
                sender: structuredIO,
                mcpClients: () => getState().mcp.clients,
              },
            );
            await Qv(j.request, (le) => {
              if (le.kind === "success") sendControlResponseSuccess(j, le.response);
              else yt(j, le.error);
            });
          } else if (j.request.subtype === "turn_handoff") {
            let internalMsgs = pt(j);
            handleTurnHandoff(
              j.request,
              no,
              (Re) => sh(j, Re),
              rewindRequestAge(internalMsgs),
              serviceClockStoredAt(internalMsgs),
              dt.phasesBeforeRead(sessionStreamReceivedAtMs(j), startTime),
              uuid,
              readDisallowedToolsMetadata(j),
            );
          } else
            yt(
              j,
              `${UNSUPPORTED_CONTROL_SUBTYPE_TEXT}: ${sanitizeTelemetryString(String(j.request.subtype))}`,
            );
        } finally {
          if (uuid && !To && j.request.subtype !== "mcp_tasks_changed")
            structuredIO.onCommandLifecycle?.(uuid, "completed");
          let startTime_2 = performance.now();
          let rounded = Math.round(startTime_2 - startTime);
          ze.turnStartClock.controlRequestEnded(startTime_2);
          dt.note("control", startTime, startTime_2);
          if (sa || rounded >= PRINT_TIMING_CONSTANTS)
            logForDiagnosticsNoPII(sa ? "warn" : "info", "cli_control_request_handled", () => ({
              subtype: knownSubtypeOrUndefined(j.request.subtype),
              ms: rounded,
              detached: To,
              ...(Ba !== undefined && {
                deadline_ms: Ba,
                timed_out: sa,
              }),
            }));
        }
        continue;
      } else if (j.type === "control_response") {
        if (x.replayUserMessages) output.enqueue(j);
        continue;
      } else if (j.type === "control_cancel_request") {
        let Bn = handledOrphanedToolUseIds.get(j.request_id);
        logEvent("tengu_sdk_control_cancel_request", {
          in_flight: Boolean(Bn),
        });
        Bn?.abort(userAbortReason("remote-cancel"));
        continue;
      } else if (j.type === "keep_alive") continue;
      else if (j.type === "workflow_launch") {
        Xo++;
        (async () => {
          let { handleWorkflowLaunchEvent } = await import("./chunk-w9fbg439.js");
          await handleWorkflowLaunchEvent(j, await $v());
        })()
          .catch((error) => {
            logForDebugging(`[print.ts] workflow_launch handler failed: ${toError(error).message}`);
          })
          .finally(() => {
            Xo--;
            if (!ze.running) timeoutMs.start();
          });
        continue;
      } else if (j.type === "update_environment_variables") continue;
      else if (j.type === "session_notice") {
        try {
          handleSessionNotice(j, {
            getAppState: getState,
            setAppState,
            session: e,
            sessionHooks: ps,
            isRemoteTransport: () => structuredIO.isRemoteTransport(),
            ingressTail: ingressTail_2,
            storageV5: x.storageV5,
            credentials: x.credentials,
          });
        } catch (error) {
          logError(error);
        }
        continue;
      } else if (j.type === "queued_notification") {
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
          let behindRunningTurn = ze.turnUnderWay;
          let wr = acceptQueuedNotification(j, {
            getAppState: getState,
            setAppState,
            session: e,
          });
          let To = wr === undefined ? null : parseTriggerWebhookPayload(wr.content, wr.origin);
          if (wr !== undefined && To !== null) {
            let Eo = claudeDocCommentPrompt(To);
            if (Eo !== null) appendToPendingNotification(wr.notificationId, Eo, setAppState);
            reportDurableCommentWake(To, {
              behindRunningTurn,
              carrier: "queued_notification",
              carrierId: wr.notificationId,
              storageV5: x.storageV5,
            });
          }
        } catch (error) {
          logError(error);
        }
        continue;
      } else if (vo) {
        if (j.type === "user" && typeof j.uuid === "string")
          structuredIO.onCommandLifecycle?.(j.uuid, "completed");
        continue;
      } else if (j.type === "assistant" || j.type === "system") {
        try {
          let internalMessages = toInternalMessages([j]);
          messages_2.push(...internalMessages);
        } catch (error) {
          logForDebugging(`Dropping malformed ${j.type} replay frame: ${errorMessage(error)}`, {
            level: "error",
          });
          continue;
        }
        if (j.type === "assistant" && x.replayUserMessages) {
          let { api_error_origin: apiErrorOrigin, ...wr } = j;
          output.enqueue(wr);
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
        if (j.uuid) structuredIO.onCommandLifecycle?.(j.uuid, "completed");
        if (structuredIO.isLocallyPrependedMessage(j))
          Bs?.({
            cannotQueue: "refused, the claim failed",
          });
        continue;
      }
      if (j.type === "bash_command") {
        handleRemoteBashCommand(
          j,
          {
            ...pt(j),
            serviceNowAtMost: structuredIO.sessionServiceNowAtMost(),
            joinedAt: structuredIO.sessionStreamJoinedAt(),
            startedBefore: sessionStreamStartedBefore(j),
          },
          {
            session: e,
            sessionId: getSessionId(),
            receivedMessageUuids: St,
            worker: {
              hosting: detectWorkerHosting(),
              sessionKind: env.CLAUDE_CODE_SESSION_KIND,
              readsSessionStream: structuredIO instanceof RemoteIO,
            },
            running: Do,
            abortController,
            emit: (Bn) => output.enqueue(Bn),
            started: (Bn) => structuredIO.onCommandLifecycle?.(Bn, "started"),
            completed: (Bn) => structuredIO.onCommandLifecycle?.(Bn, "completed"),
            acksConfirmed: () => structuredIO.flushDeliveryAcksConfirmed(),
            currentDirectory: getCwd,
            conversation,
            run: async (command, cwd, abortSignal) => {
              let { runHeadlessBashCommand } = await import("./chunk-9f02q1bz.js");
              return runHeadlessBashCommand({
                command,
                cwd,
                abortSignal,
                session: e,
              });
            },
          },
        );
        continue;
      }
      if (j.type !== "user") continue;
      let startTime = performance.now();
      let now = Date.now();
      let Ci = {};
      if (Oo.dropMalformed(j)) continue;
      ke(true);
      let jr = structuredIO instanceof RemoteIO;
      let Ko = structuredIO.isLocallyPrependedMessage(j);
      let Mu = jr ? filesRefetchMode() : "off";
      if (j.uuid) {
        let sessionId = getSessionId();
        let wr;
        try {
          wr =
            Mu !== "off" &&
            !St.has(j.uuid) &&
            !ut.has(j.uuid) &&
            turnInterruptionState?.kind === "interrupted_prompt" &&
            j.uuid === $r
              ? plannedFilePrompt(j, jr, Ko, "cut_off_prompt")
              : undefined;
        } catch (error) {
          logError(error);
          wr = undefined;
        }
        let To = wr === undefined ? undefined : fetchHoldRegistry.hold(j.uuid);
        let Eo = To !== undefined && $n ? holdForFilesRefetch("cut_off_prompt") : undefined;
        let startTime = performance.now();
        let sa = Oo.skipDuplicate(
          j.uuid,
          () => {
            if (x.replayUserMessages) {
              logForDebugging(`Sending acknowledgment for duplicate user message: ${j.uuid}`);
              let inboundAttachments = extractInboundAttachments(j);
              output.enqueue({
                type: "user",
                message: {
                  ...j.message,
                  content: escapedIngressPrompt(j, jr, Ko),
                },
                session_id: sessionId,
                parent_tool_use_id: null,
                uuid: j.uuid,
                timestamp: j.timestamp,
                isReplay: true,
                ...(inboundAttachments.length > 0 && {
                  file_attachments: inboundAttachments,
                }),
              });
            }
          },
          j,
        );
        let Qn;
        try {
          Qn = await sa;
        } catch (error) {
          Eo?.();
          throw error;
        }
        Ci.dedupMs = elapsedMs_2(startTime);
        if (!Qn) $n = false;
        if (
          Qn &&
          Mu !== "off" &&
          j.uuid !== $r &&
          !ut.has(j.uuid) &&
          jn.heldBack.includes(j.uuid) &&
          !jn.waitingToRun.includes(j.uuid)
        ) {
          try {
            wr = plannedFilePrompt(j, jr, Ko, "skipped_and_left_open");
          } catch (error) {
            logError(error);
            wr = undefined;
          }
          if (wr !== undefined) Eo = holdForFilesRefetch("skipped_and_left_open");
        }
        if (Qn && wr !== undefined) {
          ut.add(j.uuid);
          refetchUserMessageFiles({
            uuid: j.uuid,
            ...wr,
            storedPrompt,
            conversation: messages_2,
            releasePlaceInLine: Eo,
            settleColdFlags:
              Mu === "cold"
                ? () =>
                    (Cd ??= awaitGrowthBookSettled({
                      uuid: matchRequestId(j.uuid),
                      for: "files_fetched_again",
                    }).finally(() => {
                      Cd = undefined;
                    }))
                : undefined,
            stopping,
            storageV5: x.storageV5,
            credentials: x.credentials,
          })
            .then((Io) => {
              if (Io) To?.();
            })
            .catch(logError);
        } else {
          To?.();
          Eo?.();
        }
        if (Qn) continue;
      }
      cancelPendingUserDialogs(structuredIO, "new_user_message");
      let qs = ingressPromptContent(j, jr, Ko);
      let clientPlatform = j.client_platform;
      let Ql;
      if (jr && (isHearthOrigin(j.inbound_origin) || (!Ko && emailSenderTurnDetected(j, qs)))) {
        let startTime = performance.now();
        Ql = await awaitGrowthBookSettled({
          uuid: matchRequestId(j.uuid),
        });
        Ci.flagSettleMs = elapsedMs_2(startTime);
      } else if (jr && !Ko && isSyntheticTriggerFrame(j)) {
        let startTime = performance.now();
        await takeOnce(() =>
          awaitGrowthBookSettled({
            uuid: matchRequestId(j.uuid),
          }),
        );
        Ci.flagSettleMs = elapsedMs_2(startTime);
      }
      let ai =
        jr &&
        !Ko &&
        checkEmailSenderTurn(
          j,
          qs,
          isSessionReceiveHooked({
            kind: "bridge",
          }),
        );
      let { ingressOrigin, peerFrom, nonPeerOrigin, queuedOrigin } = resolveIngressOrigins(
        j,
        qs,
        jr,
        Ko,
        Ql,
        ai,
      );
      let isPersonPrompt = isUserTypedTurn(j, {
        isRemoteIO: jr,
        isLocallyPrepended: Ko,
        peerFrom,
        projectsHumanEnabled:
          jr &&
          isProjectsHumanOriginEnabled({
            flagsSettled: Ql,
          }),
        wasStartedBefore: j.uuid !== undefined && structuredIO.userFrameStartedAtMs(j.uuid) !== undefined,
      });
      if (jr && isPersonPrompt && isDefinedHumanClientPlatform(clientPlatform))
        runSafely(applyBridgeChildCliEntrypoint);
      runSafely(() =>
        cancelDialogsOnNewPrompt(structuredIO, e.userPresence, isPersonPrompt, clientPlatform, "read"),
      );
      if (jr && isPersonPrompt && j.priority !== "now" && Ie.inheritedPromptHoldCapable()) {
        let startTime = performance.now();
        await awaitGrowthBookSettled({
          uuid: matchRequestId(j.uuid),
        });
        Ci.flagSettleMs = (Ci.flagSettleMs ?? 0) + elapsedMs_2(startTime);
        if (needsGrowthBookRefresh()) logFeatureSad("ccr_input_held_behind_prompt", "flags_cold");
      }
      let { messageIds, rows: rows_2, threadTs } = relayMessageMeta(j, nonPeerOrigin);
      if (jr && j.inbound_origin === HEARTH_AGENT) logProjectsRelayAdmission(j, nonPeerOrigin, rows_2);
      let PL = isLocalDesktopPrompt({
        declared: j.seeded_summon,
        isRemoteIO: jr,
        isSynthetic: j.isSynthetic,
        peerDelivered: peerFrom !== undefined,
        inboundOrigin: j.inbound_origin,
        clientPlatform,
      });
      let zv = jr ? undefined : initiatorOfFrame(j);
      let Au = ingressOrigin
        ? isKnownHumanOrigin(
            j.inbound_origin,
            isProjectsHumanOriginEnabled({
              flagsSettled: Ql,
            }),
            ai,
          )
        : isChatPlatformHuman(clientPlatform, j.inbound_origin);
      let Yv = isHumanComposedFrame(j, peerFrom);
      maybeTitleFromUserMessage(
        {
          content: qs,
          origin: nonPeerOrigin,
          queuedOrigin,
          dispatchesSlashCommands: !Yv,
          peerFrom,
          isSynthetic: j.isSynthetic,
          shouldQuery: j.shouldQuery,
        },
        Tg,
      );
      let inboundAttachments = extractInboundAttachments(j);
      let ccrTurnId = pickTurnIdForRelay(j, {
        isRelayHuman: Au,
      });
      let lh = isGatedInbound({
        ingressOrigin,
        inboundOrigin: j.inbound_origin,
        envelopePeer: hasTeammateMessageEnvelope(qs),
      });
      let Xv = inheritedAttributionKey(j.uuid, {
        isCrossSession: lh,
      });
      let cloudBrowserTurn = prepareCloudBrowserTurn(j, {
        deliveredByServer: jr && !Ko && !Au && peerFrom === undefined && !lh,
      });
      let uh;
      if (cloudBrowserTurn !== undefined) {
        let { admitted, flagSettleMs } = await admitCloudBrowserTurnId({
          uuid: matchRequestId(j.uuid),
        });
        uh = admitted ? cloudBrowserTurn : undefined;
        if (flagSettleMs !== undefined) Ci.flagSettleMs = (Ci.flagSettleMs ?? 0) + flagSettleMs;
      }
      let eb = env.CLAUDE_CODE_REMOTE
        ? extractCcrTraceContext(j, {
            isCrossSession: lh,
          })
        : undefined;
      let Cf = queuePriorityOrUndefined(j.priority);
      let priority = peerFrom
        ? downgradePriorityIfBusy(Cf, hasVerifiedSlackHumanTurn(messageQueue))
        : nonPeerOrigin?.kind === "task-notification"
          ? adjustInboundPriority(Cf, clientPlatform, j.inbound_origin, triggerFireReasonOf(j))
          : Au
            ? resolveQueuePriority(Cf, qs, hasSlackLaterNotification(messageQueue))
            : Cf;
      let Pf = peerFrom !== undefined && !jr;
      let fromMode =
        Pf &&
        j.origin?.kind === "peer" &&
        (j.origin.fromMode === "bypass" || j.origin.fromMode === "prompting")
          ? j.origin.fromMode
          : undefined;
      if (
        dropBeforeAttachments({
          io: structuredIO,
          uuid: j.uuid,
          peerFrom,
          hostInjectedPeer: Pf,
          ingressOrigin,
        })
      )
        continue;
      let La = escapePromptUnlessDisabled(qs, jr, Ko, j.inbound_origin);
      let AL = peerFrom !== undefined || (jr && !Ko);
      let inboxWakeFor = resolveInboxWakeFor(
        La,
        jr && peerFrom === undefined ? j.inbound_origin : undefined,
        j.wake_envelope,
      );
      let triggerWebhookPayload = parseTriggerWebhookPayload(
        La,
        jr && peerFrom === undefined && !Ko ? j.inbound_origin : undefined,
      );
      let rb = triggerWebhookPayload === null ? null : claudeDocCommentPrompt(triggerWebhookPayload);
      if (rb !== null && typeof La === "string")
        La = `${La}

${rb}`;
      let ob = promptOriginKind(qs);
      if (peerFrom === undefined && !isPeerOrSlackPing(ingressOrigin))
        La = buildExternalEventRecord(
          La,
          "pasted_content" in j ? j.pasted_content : undefined,
          "inline_pastes" in j ? j.inline_pastes : undefined,
        );
      let queueing;
      if (AL) {
        let startTime = performance.now();
        let content = La;
        let origin = originFromBridgeMetadata(
          ingressOrigin ??
            (peerFrom === undefined
              ? queuedOrigin
              : {
                  kind: "peer",
                }),
        );
        let Eo = () =>
          dispatchSessionReceiveHooks({
            origin,
            content,
            event: inboxWakeFor,
          });
        let Ba = hasModuleHookingSite("session.receive", {
          origin,
        })
          ? await awaitPendingPermissionAnswers(Eo, {
              loopInput: O,
              io: structuredIO,
              urgencyOf: (Qn) => {
                if (Qn.type !== "control_request") return;
                let { request } = Qn;
                if (request.subtype === "end_session")
                  return isArchivedAfterRestartNow(request.reason) ? undefined : "end";
                return request.subtype === "interrupt" && !isImmediateInterruptRequest(request)
                  ? "stop"
                  : undefined;
              },
              onLate: (Qn) => Qn.queueing?.[Symbol.dispose](),
            })
          : {
              received: await Eo(),
            };
        Ci.receiveHookMs = elapsedMs_2(startTime);
        if (Ba === "given-up") {
          logForDebugging(
            `session.receive: hooks (${pluginsMatchingEvent("session.receive", {
              origin,
            }).join(
              "+",
            )}) still held message ${j.uuid} ${PENDING_PERMISSION_ANSWER_GRACE_MS} ms after the session's end: left to the next worker, not queued`,
            {
              level: "warn",
            },
          );
          let Qn = bridgeMessageUuid(j.uuid, "stdin");
          if (Qn !== undefined) structuredIO.onCommandLifecycle?.(Qn, "discarded");
          continue;
        }
        let { received } = Ba;
        if (received.consumed !== undefined) {
          reportCommandRefused(structuredIO, j.uuid, "stdin");
          continue;
        }
        La = received.content;
        queueing = received.queueing;
      }
      using g1 = nh.promptsFetchingFiles.begin({
        fileCount: inboundAttachments.length,
        peerFrom,
        origin: queuedOrigin,
        shouldQuery: j.shouldQuery,
        reRun: j.uuid !== undefined && Oo.isReRun(j.uuid),
      });
      let startTime_2 = performance.now();
      let EL = inboundAttachments.length > 0 ? zd.aroundDownload(startTime_2) : undefined;
      let { resolving, queuedAheadOfFiles, frameAdmission } = fetchUserPromptFiles({
        aheadOfFiles: readAheadOfFiles(jr),
        attachments: inboundAttachments,
        resolveArguments: [
          j,
          La,
          {
            ingressOrigin,
            isRemoteIO: jr,
            peerFrom,
          },
          x.storageV5,
          x.credentials,
        ],
        sessionHooks: ps,
      });
      let Af = await resolving;
      let { content, inlinedImagePaths, imageFileUuids } = Af;
      Ci.attachments = {
        ms: elapsedMs_2(startTime_2),
        count: inboundAttachments.length,
        inlinedImages: inlinedImagePaths.length,
        ...(queuedAheadOfFiles && {
          aheadOfFiles: true,
        }),
        stages: EL?.(),
      };
      let DL =
        jr &&
        j.shouldQuery !== false &&
        shouldStampThreadState({
          carrier: {
            origin: queuedOrigin,
            hearthRelayRows: rows_2,
          },
          isPeer: peerFrom !== undefined,
        });
      let lb = {
        declared: j.seeded_summon,
        isSynthetic: j.isSynthetic,
        peerDelivered: peerFrom !== undefined,
        inboundOrigin: j.inbound_origin,
        value: content,
        shouldQuery: j.shouldQuery,
        hasAttachments: inboundAttachments.length > 0 || inlinedImagePaths.length > 0,
      };
      let ub = classifyArtifactThreadMessage(lb);
      let cb = {
        mode: "prompt",
        agentId: mainAgentId(),
        value: content,
        ...(ob !== undefined && {
          foreignWord: ob,
        }),
        ...(DL && {
          stampThreadState: true,
        }),
        ...(inlinedImagePaths.length > 0 && {
          inlinedImagePaths,
        }),
        ...(imageFileUuids && {
          imageFileUuids,
        }),
        ...(Af.writtenFiles && {
          savedFiles: Af.writtenFiles,
        }),
        ...withdrawnFileUuidsOf(j, {
          ingressOrigin,
          isRemoteIO: jr,
          peerFrom,
        }),
        uuid: j.uuid,
        ...(Xv && {
          turnAttributionKey: Xv,
        }),
        ...(eb && {
          traceContext: eb,
        }),
        priority,
        shouldQuery: j.shouldQuery,
        ...(jr &&
          typeof j.inbound_origin === "string" &&
          j.inbound_origin !== "" && {
            inboundOrigin: j.inbound_origin,
          }),
        ...(j.isSynthetic && {
          isMeta: true,
        }),
        ...(inboundAttachments.length > 0 && {
          fileAttachments: inboundAttachments,
        }),
        disallowedTools: peerFrom ? [] : readDisallowedToolsMetadata(j),
        ...(peerFrom === undefined &&
          !(jr && isTurnDisallowedToolName(j.inbound_origin)) && {
            replacesDisallowedTools: true,
          }),
        ...(peerFrom
          ? {
              origin: stripPeerMessageBody(
                ingressOrigin?.kind === "peer"
                  ? ingressOrigin
                  : {
                      kind: "peer",
                      from: peerFrom,
                      ...peerMessageInfo(qs),
                      ...(Pf && {
                        hostInjected: true,
                        fromMode,
                      }),
                    },
                content,
                qs,
              ),
              isMeta: true,
              skipAttachments: true,
            }
          : {
              clientPlatform,
              ...(queuedOrigin && {
                origin: queuedOrigin,
              }),
              ...(PL && {
                seededSummon: true,
              }),
              ...(ub !== undefined && {
                artifactCommentTurn: ub,
              }),
              ...(zv !== undefined && {
                hostInitiator: zv,
              }),
              ...textNotTypedFlags(j, Af),
              ...ingressSubmitFlags({
                message: j,
                isRemoteIO: jr,
                isRelayHuman: Au,
                queuedOrigin,
                nonPeerOrigin,
              }),
              ...(ai && {
                skipAttachments: true,
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
                isRelayHuman: Au,
                isSynthetic: j.isSynthetic,
                ccrTurnId,
                isProjectsUser: isHearthHuman(j.inbound_origin),
                emailSenderTurn: ai ? emailSenderModeOf(j) : undefined,
              }),
              ...(uh !== undefined && {
                ccrTurnId: uh,
                ccrTurnIdEndsWithTurn: true,
              }),
            }),
        ...(Yv && {
          skipSlashCommands: true,
        }),
      };
      let $l = structuredIO.isPersonsOwnPrepend(j) ? withOwnWordStopKey(cb) : markOwnWord(cb, !Ko);
      let FL = async (artifactThreadHeader, prev) => {
        takeSeededSummon($l);
        let To = false;
        try {
          To = await resumeArtifactThreadAgent(artifactThreadHeader, {
            exiting:
              ze.endSessionRequested ||
              isShuttingDown() ||
              isTerminalShutdown() ||
              hasReachedBudget(x.maxBudgetUsd),
            canUseTool,
            storageV5: x.storageV5,
            onLifecycle: (Eo) => {
              if (j.uuid !== undefined) structuredIO.onCommandLifecycle?.(j.uuid, Eo);
            },
          });
        } catch (error) {
          logError(toError(error));
        }
        if (!To) return true;
        if (x.replayUserMessages && j.uuid !== undefined)
          output.enqueue({
            type: "user",
            message: {
              role: "user",
              content,
            },
            session_id: getSessionId(),
            parent_tool_use_id: null,
            uuid: j.uuid,
            timestamp: j.timestamp ?? new Date().toISOString(),
            isReplay: true,
            isSynthetic: false,
          });
        prev?.queued();
        return false;
      };
      let mb = Ko && ze.dequeueCount === 0;
      let receivedAtMs = j.uuid === undefined ? undefined : structuredIO.userFrameReceivedAtMs(j.uuid);
      let ch = j.uuid === undefined ? undefined : structuredIO.takeUserFrameReceivedWallMs(j.uuid);
      let fb = Oo.acceptUserFrame({
        frame: j,
        parsedAtMs: startTime,
        waits: Ci,
        receivedWallMs: ch,
        receivedAtMs,
        aheadOfRead: ch === undefined ? undefined : dt.split(startTime - (now - ch), startTime),
        command: $l,
        queueing,
        ownFirstTurnMessage: mb,
        admit: (prev) => {
          if (
            !acceptStdinPeerMessage({
              io: structuredIO,
              hostIngressLanes: wt,
              command: $l,
              uuid: j.uuid,
              peerFrom,
              hostInjectedPeer: Pf,
              ingressOrigin,
            })
          ) {
            frameAdmission(false);
            return false;
          }
          let artifactThreadHeader = readArtifactThreadHeader(lb);
          if (artifactThreadHeader !== null) return FL(artifactThreadHeader, prev);
          Ia.takeBeforeEnqueue($l);
          return true;
        },
        beforeEnqueue: (snapshot) => {
          let wr = Qa?.takeFrame(j.uuid, {
            reRun: j.uuid !== undefined && Oo.isReRun(j.uuid),
            ownLine: Ko,
            person: peerFrom === undefined && isHumanOrigin(queuedOrigin) && j.shouldQuery !== false,
          });
          if (wr !== undefined) snapshot.startedBy = wr;
        },
        afterEnqueue: () => {
          if (isPersonPrompt)
            runSafely(() =>
              cancelDialogsOnNewPrompt(structuredIO, e.userPresence, true, clientPlatform, "enqueue"),
            );
          Ia.press($l);
          runImmediateSlashCommand($l, {
            drain: ze,
            io: structuredIO,
            commands: Ho,
            closing: () =>
              getState().endedByModel === true ||
              ze.endSessionRequested ||
              isShuttingDown() ||
              isTerminalShutdown() ||
              hasReachedBudget(x.maxBudgetUsd),
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
          if (j.shouldQuery !== false) zd.resetBegun();
          if (mb)
            Bs?.({
              queued: j.message.content,
            });
          if (lazySessionInboxPointers && jr)
            lazySessionInboxPointers.sessionInboxPointers.of(e).noteQueued({
              inboundOrigin: j.inbound_origin,
              wake: inboxWakeFor,
              uuid: j.uuid,
            });
          let Bn = peerFrom
            ? null
            : parseArtifactFollowupAck(j, {
                isRelayHuman: Au,
              });
          if (Bn !== null)
            codeliverArtifactFollowup({
              stamp: Bn,
              content,
              hasAttachments: inboundAttachments.length > 0 || inlinedImagePaths.length > 0,
              exiting:
                ze.endSessionRequested ||
                isShuttingDown() ||
                isTerminalShutdown() ||
                hasReachedBudget(x.maxBudgetUsd),
              toolUseContext: getLastCacheSafeParams()?.toolUseContext ?? null,
              canUseTool,
              agentNames: getState().agentNameRegistry,
              messageQueue,
              priority,
              ccrTurnId,
              copyUuid: typeof j.uuid === "string" ? j.uuid : undefined,
            });
          consumeSeededSummon($l);
          if (triggerWebhookPayload !== null)
            reportDurableCommentWake(triggerWebhookPayload, {
              behindRunningTurn: ze.turnUnderWay,
              carrier: "user_message",
              carrierId: j.uuid,
              storageV5: x.storageV5,
            });
        },
        beforeKick: () => {},
      });
      if (fb) await fb;
      dt.note("user", startTime, performance.now());
    }
    ji = true;
    Bs?.({
      cannotQueue: "the input ended first",
    });
    await Oo.closeInput(async () => {
      markPrintInputClosed();
      if (!ze.running && messageQueue.peek(isActiveMainAgentCommand) === undefined)
        releaseStartupWork(e.host, "input_closed");
      abortController.abort();
      if (ze.running || Iv.pollActive()) return;
      heldBackResult?.stop();
      heldBackResult = null;
      requestTeardownUnwind();
      Ys();
      if ((await Tv()) === "handed-off") return;
      await Rv();
    });
  })().catch(Lv);
  return output;
}
//@ chunk-tyg7f3ek.js:850597-850708 layout
/**
 * -p 是否需要等待显式 --mcp-config 服务器连接完成（有非 sdk 服务器时）。
 */
function explicitMcpConfigRequestsWait(e, n, r) {
  if (n) return r > 0;
  return !startupCcrEnv.isBridgeCarrierChild && Object.values(e).some((s) => s.type !== "sdk");
}
//@ chunk-tyg7f3ek.js:850708-850766 layout
/**
 * 中继模式下 MCP 等待剩余时间（不少于下限）。
 */
function relayMcpWaitLeft(e, n, r) {
  return Math.max(TRANSPORT_FALLBACK_TIMEOUT_MS, Math.round(e + n - r));
}
//@ chunk-tyg7f3ek.js:850766-853865 fingerprint = createCanUseToolWithPermissionPrompt (0.384)
/**
 * 包装 canUseTool：规则判定为 ask 时转给 --permission-prompt-tool 指定的 MCP 工具；工具不可用时拒绝并说明。
 */
function createCanUseToolWithPermissionPrompt(permissionPromptTool, n = () => false) {
  let canUseTool = async (tool, input, toolUseContext, assistantMessage, toolUseId, forceDecision) => {
    let P =
      forceDecision ??
      (await hasPermissionsToUseTool(tool, input, toolUseContext, assistantMessage, toolUseId));
    if (P.behavior === "allow" || P.behavior === "deny") return P;
    let L = noPromptSurfaceDenialIfPersonOnly(tool, P, input, toolUseContext, toolUseId);
    if (L !== undefined) return L;
    if (permissionPromptTool === null || n())
      return {
        behavior: "deny",
        message:
          "The permission prompt tool is no longer available \u2014 its MCP server is not connected in this session.",
        decisionReason: CAN_USE_TOOL_PROMPT_TOOL_GONE_DENY_REASON,
      };
    let q = permissionPromptTool.name;
    let x = () => ({
      behavior: "deny",
      message: `${tool.name} was not run. The permission prompt tool ${q} is a tool of MCP server 'remote-browser', and in this session that server's tools can't answer permission requests, because nothing would check the call to it. To have these requests answered, set --permission-prompt-tool to a tool of another MCP server.`,
      decisionReason: CAN_USE_TOOL_PROMPT_TOOL_IS_CLOUD_BROWSER_DENY_REASON,
    });
    if (isRemoteBrowserToolUnderModeFloor(permissionPromptTool)) return x();
    if (isHostWordedAsk(P))
      return forwardHostWordedAsk(
        tool.name,
        "the configured --permission-prompt-tool (a tool_name+input wire)",
        {
          hostWorded: P.hostDisplay !== undefined,
          forMcpSkill: P.metadata?.mcpSkill !== undefined,
        },
      );
    let updatedInput = P.updatedInput ?? input;
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
    let Ue = false;
    let ce =
      toolUseContext.forRemoteExecution === true || P.personOnly === true
        ? new Promise(() => {})
        : executePermissionRequestHooksForSDK(
            applyPermissionAnswerChanges,
            tool,
            toolUseId,
            updatedInput,
            toolUseContext,
            P.suggestions,
            P,
            () => Ue || combinedSignal.aborted,
          ).then(
            (Xe) =>
              Xe
                ? {
                    hookOutcome: Xe,
                  }
                : new Promise(() => {}),
            (error) => {
              if (isAbortError(error)) logForDebugging("permission prompt tool hook race aborted");
              else logError(toError(error));
              return new Promise(() => {});
            },
          );
    let nt = new PromptScopedAbortController(toolUseContext.abortController);
    let ie = permissionPromptTool
      .call(
        {
          tool_name: tool.name,
          input: updatedInput,
          tool_use_id: toolUseId,
        },
        {
          ...toolUseContext,
          abortController: nt,
          permissionRound: undefined,
        },
        canUseTool,
        assistantMessage,
      )
      .then((toolResult) => {
        Ue = true;
        return {
          toolResult,
        };
      });
    ie.catch(() => {
      Ue = true;
    });
    let raceResult = await Promise.race([ie, abortPromise, ce]);
    cleanupAbortListener();
    nt.abort();
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
    if (isRemoteBrowserToolUnderModeFloor(permissionPromptTool)) return x();
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
    let Ee = permissionPromptResultSchemaRefusing().safeParse(
      safeParseJSON(permissionToolResultBlockParam.content[0].text),
    );
    if (!Ee.success) {
      logForDebugging(
        `Permission prompt tool returned a schema-invalid result for ${tool.name}: ${Ee.error.message.slice(0, 2000)}`,
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
    let He = Ee.data;
    if (He.behavior === "allow" && requiresConnectorGrant_2(tool))
      return {
        behavior: "deny",
        message: PROMPT_TOOL_ALLOW_IMITATOR_DENY_REASON.reason,
        decisionReason: PROMPT_TOOL_ALLOW_IMITATOR_DENY_REASON,
      };
    if (He.behavior === "allow" && isMcpTool(tool) && tool.requiresUserInteraction?.())
      return {
        behavior: "deny",
        message: "MCP tool requires user interaction; not supported via --permission-prompt-tool",
        decisionReason: PROMPT_TOOL_ALLOW_FLAGGED_MCP_DENY_REASON,
      };
    return permissionPromptToolResultToPermissionDecision(
      applyPermissionAnswerChanges,
      He,
      permissionPromptTool,
      updatedInput,
      toolUseContext,
      tool,
      P.suppressAlwaysAllowRule === true,
      false,
    );
  };
  return setPermissionPromptHostProbe("promptTool", canUseTool, () => permissionPromptTool !== null && !n());
}
//@ chunk-tyg7f3ek.js:853865-853988 layout = countToolCallsSince (1)
function messageHasToolUseId(messages, sinceUuid) {
  let content = messages?.message?.content;
  if (!Array.isArray(content)) return false;
  return content.some((block) => block.type === "tool_use" && block.id === sinceUuid);
}
//@ chunk-tyg7f3ek.js:853988-854298 layout
/**
 * --permission-prompt-tool 找不到或不是 MCP 工具时的遥测消息模板（工具名脱敏）。
 */
var PERMISSION_PROMPT_TOOL_NOT_FOUND_TELEMETRY_MESSAGE =
  "Error: MCP tool <redacted> (passed via --permission-prompt-tool) not found. Available MCP tools: <redacted>";
var PERMISSION_PROMPT_TOOL_NOT_FOUND_NO_MCP_TOOLS_TELEMETRY_MESSAGE =
  "Error: MCP tool <redacted> (passed via --permission-prompt-tool) not found. Available MCP tools: none";
var PERMISSION_PROMPT_TOOL_NOT_MCP_TELEMETRY_MESSAGE =
  "Error: tool <redacted> (passed via --permission-prompt-tool) must be an MCP tool";
//@ chunk-tyg7f3ek.js:854298-855389 fingerprint = getCanUseToolFn (0.812)
/**
 * 根据输入格式与 --permission-prompts 选择 canUseTool：stdio 走 StructuredIO 请求宿主，none 自动拒绝，否则走权限提示工具。
 */
function getCanUseToolFn(
  permissionPromptToolName,
  headlessIO,
  getMcpTools,
  onPermissionPrompt,
  h,
  permissionPrompts,
) {
  let S = isNoPromptHost(permissionPrompts);
  if (!S && permissionPromptToolName === "stdio") {
    let P = headlessIO.createCanUseTool(applyPermissionAnswerChanges, onPermissionPrompt);
    return isVsCodeOrDesktop() ? setPermissionPromptPerson(P) : P;
  }
  if (S || !permissionPromptToolName)
    return async (tool, input, toolUseContext, assistantMessage, toolUseId, forceDecision) => {
      let result =
        forceDecision ??
        (await hasPermissionsToUseTool(tool, input, toolUseContext, assistantMessage, toolUseId));
      let Ae =
        result.behavior === "ask" && (S || !forceDecision)
          ? ((result.personOnly === true
              ? null
              : await consultPermissionRequestHooksForUnpromptableAsk(
                  applyPermissionAnswerChanges,
                  tool,
                  input,
                  result,
                  toolUseId,
                  toolUseContext,
                  undefined,
                )) ??
            (S
              ? buildNoApprovalSurfaceDenial(result)
              : (noPromptSurfaceDenialIfUnsettled(tool, result, toolUseContext, NO_PROMPT_SURFACE_REASON) ??
                result)))
          : result;
      if (
        Ae.behavior !== "allow" &&
        messageHasToolUseId(assistantMessage, toolUseId) &&
        !isServerFallbackDiscard(toolUseContext.abortController.signal)
      )
        headlessIO.emitPermissionDenied(tool.name, toolUseId, toolUseContext.agentId, Ae);
      return Ae;
    };
  let resolved = null;
  return setPermissionPromptHostProbe(
    "promptTool",
    async (tool, input, toolUseContext, assistantMessage, toolUseId, forceDecision) => {
      let re = h?.isPromptToolServerSwept() === true;
      if (!resolved && re) resolved = createCanUseToolWithPermissionPrompt(null);
      if (!resolved) {
        let mcpTools = getMcpTools();
        let permissionPromptTool = mcpTools.find((t) => toolMatchesName(t, permissionPromptToolName));
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
          () => h?.isPromptToolServerSwept() === true,
        );
      }
      return resolved(tool, input, toolUseContext, assistantMessage, toolUseId, forceDecision);
    },
    () => h?.isPromptToolServerSwept() !== true,
  );
}
//@ chunk-tyg7f3ek.js:855389-855453 file-local
function joinPromptValues(values) {
  return Array.isArray(values) && values.length === 1 && values[0] === "";
}
//@ chunk-tyg7f3ek.js:855453-856133 layout
/**
 * 按 --agent 选定主线程代理：设置代理类型、采用其系统提示词与模型、可前置其 initialPrompt。
 */
function seatMainThreadAgentFromPool(
  e,
  n,
  r,
  { deferInitialPrompt = false, reapplySystemPromptIfSeated = false } = {},
) {
  if (!n.agent)
    return {
      agent: undefined,
      seatedNow: false,
      restrictedAgentModel: undefined,
    };
  let y = getMainThreadAgentType() === n.agent;
  let agentExcludingWebFetch = findAgentExcludingWebFetch(e, n.agent);
  if (!agentExcludingWebFetch || y) {
    if (
      agentExcludingWebFetch &&
      reapplySystemPromptIfSeated &&
      !n.systemPrompt &&
      !isBuiltInAgent(agentExcludingWebFetch)
    ) {
      let systemPrompt = agentExcludingWebFetch.getSystemPrompt();
      if (systemPrompt) n.systemPrompt = systemPrompt;
    }
    return {
      agent: agentExcludingWebFetch,
      seatedNow: false,
      restrictedAgentModel: undefined,
    };
  }
  let restrictedAgentModel;
  setMainThreadAgentType(agentExcludingWebFetch.agentType);
  hookSourcesSummary(agentExcludingWebFetch);
  if (!n.systemPrompt && !isBuiltInAgent(agentExcludingWebFetch)) {
    let systemPrompt = agentExcludingWebFetch.getSystemPrompt();
    if (systemPrompt) n.systemPrompt = systemPrompt;
  }
  if (!n.userSpecifiedModel && agentExcludingWebFetch.model && agentExcludingWebFetch.model !== "inherit") {
    let userSpecifiedModel = parseUserSpecifiedModel(agentExcludingWebFetch.model);
    if (isExemptDefaultResolvingPick(userSpecifiedModel) || isModelAllowed(userSpecifiedModel))
      setMainLoopModelOverride(userSpecifiedModel);
    else restrictedAgentModel = agentExcludingWebFetch.model;
  }
  if (agentExcludingWebFetch.initialPrompt && !deferInitialPrompt)
    r.prependUserMessage(agentExcludingWebFetch.initialPrompt, "person");
  return {
    agent: agentExcludingWebFetch,
    seatedNow: true,
    restrictedAgentModel,
  };
}
//@ chunk-tyg7f3ek.js:856133-861179 fingerprint = handleInitializeRequest (0.344)
/**
 * 处理 initialize 控制请求：注册 SDK 钩子回调、提示建议、代理、MCP 服务器、输出样式等，回复 initialize 响应（命令、代理、模型、账户、pid、版本…）。
 */
async function handleInitializeRequest(
  request,
  requestId,
  r,
  output,
  h,
  y,
  S,
  R,
  w,
  P,
  L,
  q,
  x,
  sdkMcpManifestsParked,
  Z,
  redactsWhatItPersists,
  Ae,
  Ue,
) {
  let restrictedAgentModel;
  if (r) {
    let We = sdkHooksIfHostOwnsStdin(request, S);
    let St = 0;
    if (We) {
      St = S.retireSdkHostHookCallbacks(sdkHookReconnectFallback);
      buildSdkHookRegistrations(We, (ze, Dr) => S.createHookCallback(ze, Dr), S);
    }
    let alreadyResolved = request.promptSuggestions === true;
    let Lt = alreadyResolved && !w.promptSuggestions && isRemoteCowork();
    if (Lt) w.promptSuggestions = true;
    applyHostRendersChromeSetupOffer(request.rendersChromeSetupOffer, S);
    applyInitializeProactivity(request.proactivity, {
      reinitialize: true,
      permissionModeSuppliedOnInvocation: w.permissionModeSuppliedOnInvocation !== false,
      restartedWorker: isWorkerEpochAfterFirst(env.CLAUDE_CODE_WORKER_EPOCH),
      planModeRestoredAtBoot: w.planModeOnResume === "restored",
      getAppState: L,
      setAppState: q,
      sessionState: S.sessionState,
    });
    let pn = Z();
    if (pn !== undefined) await pn;
    let _n = y();
    let Mn = await _buildInitializeResponsePayloadForTesting(
      h,
      getActiveAgentsFromList(P()),
      _n.models,
      _n.unavailable,
      L,
      x(),
      () => S.sessionState.getState(),
      request.hooks ? We !== undefined : undefined,
      applyInitializePlugins(request.plugins),
      undefined,
      sdkMcpManifestsParked,
      w.storageV5,
      () => ({
        redactsWhatItPersists,
        isRemoteTransport: S.isRemoteTransport(),
        sessionWriters: S.sessionWriters(),
      }),
      Ue,
    );
    let pendingPermissionRequests = S.getPendingPermissionRequests();
    let pendingUserDialogRequests = S.getPendingUserDialogRequests();
    logEvent("tengu_reinit_pending_redelivery", {
      n_pending_permissions: fromNumber(pendingPermissionRequests.length),
      n_pending_dialogs: fromNumber(pendingUserDialogRequests.length),
      host_hooks_resent: request.hooks !== undefined,
      host_hooks_applied: We !== undefined,
      n_settled_hook_callbacks: fromNumber(St),
      prompt_suggestions_requested: alreadyResolved,
      prompt_suggestions_opt_in_applied: Lt,
    });
    output.enqueue({
      type: "control_response",
      response: {
        subtype: "success",
        request_id: requestId,
        response: withHostWordedAsks(Mn, S, w),
        pending_permission_requests: pendingPermissionRequests,
        pending_user_dialog_requests: pendingUserDialogRequests,
        pending_elicitation_requests: S.getPendingElicitationRequests(),
      },
    });
    emitBackgroundTasksChanged(L());
    return {
      publishedCommands: Mn.commands,
    };
  }
  if (request.systemPrompt !== undefined)
    w.systemPrompt = joinPromptValues(request.systemPrompt) ? "" : request.systemPrompt;
  if (request.supportedDialogKinds !== undefined)
    declareSdkDialogKinds(
      request.supportedDialogKinds,
      isWorkerEpochAfterFirst(env.CLAUDE_CODE_WORKER_EPOCH),
      S.sessionState,
    );
  if (request.perTaskStopAffordance === true) setSdkPerTaskStopAffordance(true);
  applyHostRendersChromeSetupOffer(request.rendersChromeSetupOffer, S);
  if (request.rapidFollowupPreempt === true) setSdkRapidFollowupPreempt(true);
  if (request.forwardNestedSubagentToolCalls === true) setSdkForwardNestedSubagentToolCalls(true);
  if (request.appendSystemPrompt !== undefined) w.appendSystemPrompt = request.appendSystemPrompt;
  if (request.planModeInstructions !== undefined) w.planModeInstructions = request.planModeInstructions;
  if (typeof request.systemPromptSnapshot === "boolean")
    w.systemPromptSnapshot = request.systemPromptSnapshot;
  if (request.appendSubagentSystemPrompt !== undefined)
    w.appendSubagentSystemPrompt = request.appendSubagentSystemPrompt;
  if (request.toolAliases !== undefined) {
    w.toolAliases = request.toolAliases;
    let { toolAliases } = request;
    q((St) => ({
      ...St,
      toolPermissionContext: withToolAliases(St.toolPermissionContext, toolAliases, Ae),
    }));
    setPathTable(request.toolAliases);
  }
  let nt =
    request.codeRunningMcpTools === undefined
      ? undefined
      : declareSdkHostCodeRunningMcpTools(request.codeRunningMcpTools);
  if (nt !== undefined)
    q((We) => {
      let agentModel = withRulesSetAsideAgain(We.toolPermissionContext);
      return agentModel === We.toolPermissionContext
        ? We
        : {
            ...We,
            toolPermissionContext: agentModel,
          };
    });
  if (typeof request.excludeDynamicSections === "boolean") {
    w.excludeDynamicSections = request.excludeDynamicSections;
    notifyExcludeDynamicSections(S.sessionState, request.excludeDynamicSections);
  }
  if (request.promptSuggestions !== undefined) w.promptSuggestions = request.promptSuggestions;
  if (request.forwardSubagentText !== undefined) w.forwardSubagentText = request.forwardSubagentText;
  applyInitializeProactivity(request.proactivity, {
    reinitialize: false,
    permissionModeSuppliedOnInvocation: w.permissionModeSuppliedOnInvocation !== false,
    restartedWorker: isWorkerEpochAfterFirst(env.CLAUDE_CODE_WORKER_EPOCH),
    planModeRestoredAtBoot: w.planModeOnResume === "restored",
    getAppState: L,
    setAppState: q,
    sessionState: S.sessionState,
  });
  if (request.skills !== undefined) setSessionSkillAllowlist(request.skills);
  let ie;
  if (request.agents) ie = parseAgentsFromJson(request.agents, "flagSettings");
  let Se = () => getActiveAgentsFromList(ie ? [...P(), ...ie] : P());
  if (w.agent) {
    let settings = isParkedSpare();
    let St = !settings && getSpareClaimState() !== "none";
    let wt = seatMainThreadAgentFromPool(Se(), w, S, {
      deferInitialPrompt: settings,
    });
    restrictedAgentModel = wt.restrictedAgentModel;
    if (!wt.seatedNow && wt.agent?.initialPrompt && !settings && !St)
      S.prependUserMessage(wt.agent.initialPrompt, "person");
  }
  if (request.hooks) buildSdkHookRegistrations(request.hooks, (We, St) => S.createHookCallback(We, St), S);
  if (request.jsonSchema) setInitJsonSchema(request.jsonSchema);
  if (isParkedSpare() && request.workspaceTrust !== undefined)
    logForDebugging(
      "initialize: workspaceTrust ignored on a parked spare (--await-claim) \u2014 send workspace_trust with claim_session",
      {
        level: "warn",
      },
    );
  let workspaceTrustRecorded = await applyWorkspaceTrust(
    S.hostOwnsStdinOrigin && !isParkedSpare() ? request.workspaceTrust : undefined,
    {
      cwd: getCwd(),
      trustedNetworkDirectories: L().toolPermissionContext.trustedNetworkDirectories,
      storageV5: w.storageV5,
    },
  );
  let Me = Z();
  if (Me !== undefined) await Me;
  let accountInfo = y();
  let He = await _buildInitializeResponsePayloadForTesting(
    h,
    Se(),
    accountInfo.models,
    accountInfo.unavailable,
    L,
    x(),
    () => S.sessionState.getState(),
    request.hooks ? true : undefined,
    applyInitializePlugins(request.plugins),
    workspaceTrustRecorded,
    sdkMcpManifestsParked,
    w.storageV5,
    () => ({
      redactsWhatItPersists,
      isRemoteTransport: S.isRemoteTransport(),
      sessionWriters: S.sessionWriters(),
    }),
    Ue,
  );
  output.enqueue({
    type: "control_response",
    response: {
      subtype: "success",
      request_id: requestId,
      response: withHostWordedAsks(
        {
          ...He,
          ...(nt !== undefined && {
            code_running_mcp_tools_applied: nt,
          }),
        },
        S,
        w,
      ),
      pending_permission_requests: S.getPendingPermissionRequests(),
      pending_user_dialog_requests: S.getPendingUserDialogRequests(),
      pending_elicitation_requests: S.getPendingElicitationRequests(),
    },
  });
  let mcp = L().mcp;
  logEvent("tengu_sdk_init_handshake", {
    uptime_ms: Math.round(process.uptime() * 1000),
    mcp_client_count: mcp.clients.length,
    mcp_pending_count: count(mcp.clients, (matcher) => matcher.type === "pending"),
    mcpNonBlocking: getMcpConnectNonBlocking(),
    session_mirror: !!w.sessionMirror,
  });
  if (R) {
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
    mergedStdinAgents: ie,
    publishedCommands: He.commands,
  };
}
//@ chunk-tyg7f3ek.js:861179-863492 layout
/**
 * 构造 initialize 响应负载：commands、agents、output_style、models、account、pid、claude_code_version 等。
 */
async function _buildInitializeResponsePayloadForTesting(
  e,
  activeAgentsFromList,
  models,
  unavailable,
  h,
  y,
  S,
  hooksApplied,
  pluginsApplied,
  workspaceTrustRecorded,
  sdkMcpManifestsParked,
  storageV5,
  x,
  G,
) {
  let outputStyle = getSettings_DEPRECATED()?.outputStyle || DEFAULT;
  let allOutputStyles = await getAllOutputStylesCached(getCwd(), storageV5);
  let accountInformation = getAccountInformation();
  let mode = h().toolPermissionContext.mode;
  let nt =
    isVsCodeTopSession() && isHarborWillowEnabled()
      ? shouldShowAutoDefaultNudge(h().toolPermissionContext, {
          requireOnboarding: false,
        })
      : null;
  let ie = {
    commands: toSlashCommands(e()),
    agents: activeAgentsFromList.map((He) => ({
      name: He.agentType,
      description: He.whenToUse,
      model: He.model,
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
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
    current_permission_mode: toExternalPermissionMode(mode),
    ...(x().isRemoteTransport &&
      isBridgeEnvironment() &&
      isBridgeInboundReadReceiptsEnabled() && {
        inbound_read_receipts: true,
      }),
    hooks_applied: hooksApplied,
    plugins_applied: pluginsApplied,
    workspace_trust_recorded: workspaceTrustRecorded,
    sdk_mcp_manifests_parked: sdkMcpManifestsParked,
    ...(isVsCodeTopSession() && {
      permission_mode_from_default_fallback: isAutoModeFromFallback() && mode === "auto",
      ...(nt && {
        auto_default_nudge: toExternalPermissionMode(nt),
      }),
    }),
    feedback_survey_config: vscodeSurveyConfig(),
    survey_followup_box: feedbackSurveyCapabilities(),
    feedback_mode: headlessFeedbackMode(),
    analytics_disabled: isFirstPartyTelemetryBlocked(),
    proactivity: proactivityStateStub(h()),
    footer_indicator: getFooterIndicator(),
  };
  let explicitRemoteControlAtStartup = getExplicitRemoteControlAtStartup();
  let me = !isRunningInRemoteEnvironment() && (explicitRemoteControlAtStartup ?? getCcrAutoConnectDefault());
  ie.remote_control_auto_enable = me;
  ie.remote_control_auto_connect_default = !isRunningInRemoteEnvironment() && getCcrAutoConnectDefault();
  ie.remote_control_available = isRemoteControlDeploymentAvailable();
  if (isVsCodeTopSession())
    ie.claude_in_chrome_at_startup = await import("./chunk-e2839z0z.js").then(
      ({ claudeInChromeDefaultForHost }) => claudeInChromeDefaultForHost(),
      (error) => {
        logError(error);
        return false;
      },
    );
  if (env.CLAUDE_CODE_DISABLE_CFC_PROMPT === true) ie.claude_in_chrome_prompt_disabled = true;
  ie.remote_control_auto_on_by_default = me && explicitRemoteControlAtStartup === undefined;
  ie.ide_rc_auto_enable_gate = getFeatureValue_CACHED_MAY_BE_STALE("tengu_ide_rc_auto_enable", false);
  let Me = h();
  ie.fast_mode_state = getFastModeState(y ?? null, Me.fastMode);
  ie.fast_mode_disabled_reason =
    getFastModeUnavailableReasonCode(y ?? null) ?? getFastRejectedReason(y ?? null, Me.fastMode) ?? undefined;
  ie.session_state = S();
  let Ee = [
    ...uiSurfaceCapabilities(x),
    ...uiHookedCapabilities(x),
    ...(persistsWithoutRedaction(x()) ? [MCP_CALL_RESULT_NOT_FOR_MODEL_V1] : []),
    ...(shouldOfferLinuxSandboxHint(G()) ? [START_SHELL_TASK_V1] : []),
  ];
  if (Ee.length > 0) ie.capabilities = Ee;
  return ie;
}
//@ chunk-tyg7f3ek.js:863492-863977 fingerprint = handleRewindFiles (0.957)
/**
 * 处理 rewind_files：检查文件历史检查点，dry-run 或回滚文件。
 */
async function handleRewindFiles(userMessageId, appState, r) {
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
  if (r) {
    let diffStats = await fileHistoryGetDiffStats(appState.fileHistory, userMessageId);
    return {
      canRewind: true,
      filesChanged: diffStats?.filesChanged,
      insertions: diffStats?.insertions,
      deletions: diffStats?.deletions,
    };
  }
  let s;
  try {
    s = await fileHistoryRewind(() => appState.fileHistory, userMessageId);
  } catch (error) {
    return {
      canRewind: false,
      error: `Failed to rewind: ${errorMessage(error)}`,
    };
  }
  return {
    canRewind: true,
    skippedLinks: s?.skippedLinks,
  };
}
//@ chunk-tyg7f3ek.js:863977-865145 fingerprint = handleChannelEnable (0.902)
/**
 * 处理 channel_enable：为已连接的插件 MCP 服务器注册频道通知。
 */
function handleChannelEnable(requestId, serverName, connectionPool, output, messageQueue) {
  let respondError = (error) => output.enqueue(controlErrorResponse(requestId, error));
  let connection = connectionPool.find((Z) => Z.name === serverName && Z.type === "connected");
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
    messageQueue.enqueue({
      mode: "prompt",
      agentId: mainAgentId(),
      value: wrapChannelMessage(serverName, content, meta),
      priority: "next",
      isMeta: true,
      origin: {
        kind: "channel",
        server: serverName,
      },
      skipSlashCommands: true,
      skipAttachments: true,
    });
  });
  output.enqueue(controlSuccessResponse(requestId));
}
//@ chunk-tyg7f3ek.js:865145-865881 fingerprint = reregisterChannelHandlerAfterReconnect (0.926)
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
    messageQueue.enqueue({
      mode: "prompt",
      agentId: mainAgentId(),
      value: wrapChannelMessage(connection.name, content, meta),
      priority: "next",
      isMeta: true,
      origin: {
        kind: "channel",
        server: connection.name,
      },
      skipSlashCommands: true,
      skipAttachments: true,
    });
  });
}
//@ chunk-tyg7f3ek.js:865881-866114 layout
/**
 * 每轮开始前等待文件存储 worker 拉取同步（turn hold 参与者）。
 */
function dirSyncPullParticipant(workerDirSync, n, r, s = false) {
  return {
    name: "file_store_worker",
    beforeTurn: async ({ signal }) => {
      let y = await (s
        ? Promise.race([
            workerDirSync,
            raceWithAbortSignal(workerDirSync, signal, () => new AbortError()).catch(() => {
              return;
            }),
          ])
        : workerDirSync);
      if (y === undefined) return TURN_GATE_READY;
      try {
        await y?.beforeTurn(signal);
      } finally {
      }
      return TURN_GATE_READY;
    },
  };
}
//@ chunk-tyg7f3ek.js:866114-866265 layout
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
//@ chunk-tyg7f3ek.js:866265-866738 layout
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
    handle: import("./chunk-twq47pff.js")
      .then((P) => {
        let L = P.startCloudHomeSeed({
          session,
          record,
          configHome,
          foreignFiles,
          takes,
          repoRoot,
          storageV5,
        });
        workerDirSync
          ?.then((q) => {
            if (q === null) {
              logForDiagnosticsNoPII("warn", "home_seed_stopped_no_file_store_worker", {});
              L.stop();
            }
          })
          .catch(() => {});
        return L;
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
//@ chunk-tyg7f3ek.js:866738-866867 layout
function shortErrorText(e) {
  try {
    let n = stripAnsi(getFirstLine(errorMessage(e))).trimEnd();
    let r = truncateToLength(n, 200);
    return r.length < n.length ? `${r}\u2026` : r;
  } catch {
    return "unknown error";
  }
}
//@ chunk-tyg7f3ek.js:866867-867186 layout
function logHeadlessFatalError(e, n) {
  logError(e);
  logEvent("tengu_headless_fatal_error", {
    site: fromEnum(n.site),
    message_type: fromEnumOpt(n.message?.type),
    control_subtype: fromEnumOpt(
      n.message?.type === "control_request" ? n.message.request.subtype : undefined,
    ),
    drained_message_count: n.drainedMessageCount,
    outstanding_stdout_bytes: outstandingStdoutBytes(),
    stdout_destroyed: process.stdout.destroyed,
    ...errorTelemetryFields_2(e),
  });
}
//@ chunk-tyg7f3ek.js:867186-867842 layout
/**
 * headless 输出写入失败时结束会话：记录致命错误、尽量写最后一条错误、退出。
 */
async function endHeadlessSessionOnOutputWriteFailure(e, headlessIO, message, error, drainedMessageCount) {
  if (isTerminalShutdown()) {
    logForDebugging(`Headless output write failed during shutdown (${message.type})`);
    return;
  }
  let y = isBridgeOrTransport(e);
  transportStateByHost.of(e).setActive(undefined);
  try {
    logHeadlessFatalError(error, {
      site: "output_drain",
      message,
      drainedMessageCount,
    });
  } catch {}
  try {
    let S = y ? "transport write failure" : shortErrorText(error);
    let R = (P) =>
      `Could not write a message to the output stream (${P}); the session has ended.` +
      (isSessionPersistenceDisabled() ? "" : " You can resume this conversation.");
    process.stderr.write(`Error: ${R(shortErrorText(error))}
`);
    if (y)
      logForDebugging(`output write failure detail: ${shortErrorText(error)}`, {
        level: "error",
      });
    let w = R(S);
    try {
      publishFailedSummary(headlessIO.sessionState, w);
      await headlessIO.write(emitLoadError(getSessionId(), [w]));
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
//@ chunk-tyg7f3ek.js:867842-868162 layout
/**
 * runHeadless 抛出未捕获错误时结束会话：停止保留流事件、写错误结果、退出 1。
 */
function endHeadlessSessionOnEscapedError(e, n, r) {
  if (isTerminalShutdown()) {
    logForDebugging("runHeadless rejected during shutdown");
    return;
  }
  let s = transportStateByHost.of(e);
  let resultIndex = s.active?.resultDelivery?.numbered ?? null;
  s.active?.stopHoldingStreamEvents();
  s.setActive(undefined);
  try {
    logHeadlessFatalError(n, {
      site: "run_headless",
    });
  } catch {}
  try {
    writeStartupFailure(`An internal error ended the session (${shortErrorText(n)}).`, r, {
      resultIndex,
    });
  } catch {}
  gracefulShutdownSync(1);
}
//@ chunk-tyg7f3ek.js:868162-868359 layout
/**
 * 写启动失败：stderr 输出；stream-json 时再输出一行 result 错误（带 startupFailureReason）。
 */
function writeStartupFailure(e, outputFormat, { resultIndex = 0, startupFailureReason } = {}) {
  process.stderr.write(
    e +
      `
`,
  );
  logForDebugging(e, {
    level: "error",
  });
  if (outputFormat === "stream-json")
    writeToStdout(
      ndjsonStringify(
        buildStartupFailureResult({
          sessionId: getSessionId(),
          message: e,
          reason: startupFailureReason,
          resultIndex,
        }),
      ) +
        `
`,
    );
}
//@ chunk-tyg7f3ek.js:868359-868497 layout
function exitIfEndedByModel(e, outputFormat) {
  if (e?.endedByModel) {
    writeStartupFailure(
      withTaskSuffix("Claude ended this conversation. Start a new session to continue."),
      outputFormat,
    );
    gracefulShutdownSync(1);
    return true;
  }
  return false;
}
//@ chunk-tyg7f3ek.js:868497-869738 layout
async function refuseUnsafeWorktreeResume(e, worktreeSession, r, outputFormat) {
  let originalCwd = getOriginalCwd();
  let y = null;
  try {
    y = restoreWorktreeForResume(lastResumeRecordRegistry.of(e.host), worktreeSession, undefined, {
      storageV5: r.storageV5,
    });
  } catch (error) {
    logError(error);
  }
  if (y && !y.poisoned) {
    writeStartupFailure(worktreeResumeRefusalError(y).trimEnd(), outputFormat, {
      startupFailureReason: y.reason === "unverifiable" ? "worktree_unverified" : "worktree_resume_refused",
    });
    gracefulShutdownSync(1);
    return true;
  }
  let S = r.persist && !isTranscriptPersistenceDisabled();
  if (y && y.reason !== "worktree-gone" && !S) {
    writeStartupFailure(
      worktreeResumeRefusalError(y, {
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
  if (!y && getOriginalCwd() !== originalCwd && isToolSandboxActive()) {
    await withDeadline(
      initializeGrowthBook().catch(() => null),
      PRINT_TURN_RETRY_MS,
    );
    if (
      readFlagWithOverride(TENGU_ANCHORED_LANTERN, {
        safe: true,
      })
    ) {
      let R = false;
      try {
        R = SandboxManager.refreshConfig();
      } catch (error) {
        reportSandboxErrorUnderStandIn(error, "configNotRebuilt");
      }
      if (!R) {
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
  if (r.persist)
    if (isStorageV5Enabled() && r.storageV5 !== undefined) await adoptResumedSessionFileAsync(r.storageV5);
    else adoptResumedSessionFile();
  if (!y) return false;
  if (y.reason === "worktree-gone") {
    process.stderr.write(
      worktreeGoneHeadlessNotice(y, {
        bindingCleared: S,
      }),
    );
    return false;
  }
  writeStartupFailure(
    worktreeResumeRefusalError(y, {
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
//@ chunk-tyg7f3ek.js:869738-869795 layout
/**
 * 声明本进程拥有费用账本并在退出时保存费用状态（diskless 时不做）。
 */
function ownCostLedger() {
  if (isTranscriptPersistenceDisabled()) return () => {};
  claimCostLedgerForCurrentSession();
  return registerTranscriptExitReStamp(resetCostState);
}
//@ chunk-tyg7f3ek.js:869795-869960 layout
function queueMemoryNotices(outputFormat) {
  let n = restoredMemoryPauseNotice();
  if (n !== undefined)
    reportStartupModelNotice(n, {
      key: "memory-paused",
      outputFormat,
    });
  let r = restoredAutoMemorySessionNotice();
  if (r !== undefined)
    reportStartupModelNotice(r, {
      key: "session-auto-memory-off",
      outputFormat,
    });
}
//@ chunk-tyg7f3ek.js:869960-882005 fingerprint = loadInitialMessages (0.315)
/**
 * 加载 -p 模式的初始消息：--continue 取最近会话，--resume 按 ID/名称/文件恢复（含 --resume-session-at 截断、--fork-session），失败写启动失败结果。
 */
async function loadInitialMessages(e, setAppState, appState, s) {
  let persistSession = !isSessionPersistenceDisabled();
  if (s.continue)
    try {
      logEvent("tengu_continue_print", {});
      let { clearSessionCaches } = await import("./chunk-e1mchg1t.js");
      clearSessionCaches(e, undefined, undefined, undefined, s.storageV5);
      let state;
      let restoredWorkerState = await s.restoredWorkerState;
      restoreChromeSetupOfferState(restoredWorkerState);
      let P = pendingActionToolUseIds(restoredWorkerState, s.tools ?? []);
      let result = await loadConversationForResume(undefined, undefined, {
        forkSession: !!s.forkSession,
        ...(s.sdkUrl && {
          acceptCustomIds: true,
        }),
        storageV5: s.storageV5,
        credentials: s.credentials,
        ...precomputeResumeHooks(e.precompute, s.storageV5, {
          forkSession: !!s.forkSession,
        }),
        onNewestRunningInBackground: (q) => {
          state = q;
        },
        ...(P.size > 0 && {
          hostAnswerableToolUseIds: P,
        }),
        restoredCardToolUseId: singlePendingAction(await s.restoredWorkerState),
        restoredPromptWaits: hasPendingActions(await s.restoredWorkerState),
      });
      if (result) s.onFreshSessionStartRows?.(await appendSessionStartRows(result));
      if (exitIfEndedByModel(result, s.outputFormat))
        return {
          messages: [],
        };
      if (!result && state !== undefined) {
        await logEventAsync("tengu_continue", {
          success: false,
          entrypoint: lit("print"),
        });
        writeStartupFailure(backgroundSessionMovedNotice(state), s.outputFormat, {
          startupFailureReason: "session_held_by_background",
        });
        gracefulShutdownSync(1);
        return {
          messages: [],
          aborted: true,
        };
      }
      if (result) {
        let warning = lazyCoordinatorMode.matchSessionMode(result.mode);
        if (warning) {
          process.stderr.write(
            warning +
              `
`,
          );
          let agentDefinitions = await reloadAgentDefinitionsForModeSwitch(
            getCwd(),
            s.cliAgents ?? [],
            s.storageV5,
          );
          setAppState((prev) => ({
            ...prev,
            agentDefinitions,
          }));
        }
        let { adoptedSessionId, effectiveFork } = resolveResumeSessionAdoption(
          result.sessionId,
          !!s.forkSession,
          {
            acceptCustomIds: !!s.sdkUrl,
          },
        );
        if (adoptedSessionId) {
          switchSession(adoptedSessionId, "resume", result.fullPath ? dirname(result.fullPath) : null);
          if (persistSession) await resetSessionFilePointer();
        }
        restoreSessionStateFromLog(result, setAppState, appState, {
          preserveLiveBudget: false,
        });
        let planModeOnResume = restorePlanModeFromTranscriptOnly(result.messages, s, setAppState);
        if (effectiveFork) {
          await adoptForkSessionMetadata(result, {
            stripWorktreeSession: true,
            stripRelocatedCwd: true,
            storageV5: s.storageV5,
          });
          if (result.contentReplacements?.length)
            await recordContentReplacement(result.contentReplacements, undefined, s.storageV5);
        } else {
          restoreSessionMetadata(result, {
            storageV5: s.storageV5,
          });
          reclaimSessionNameAtStart(s).catch(logError);
        }
        queueMemoryNotices(s.outputFormat);
        setCostStateForRestore(result);
        if (!effectiveFork) {
          let persist = persistSession && !!adoptedSessionId;
          if (
            await refuseUnsafeWorktreeResume(
              e,
              result.worktreeSession,
              {
                persist,
                storageV5: s.storageV5,
              },
              s.outputFormat,
            )
          )
            return {
              messages: [],
              aborted: true,
            };
        }
        saveMode(lazyCoordinatorMode.isCoordinatorMode() ? "coordinator" : "normal");
        return {
          messages: result.messages,
          turnInterruptionState: result.turnInterruptionState,
          supersededToolUseIds: result.supersededToolUseIds,
          supersededToolNames: result.supersededToolNames,
          answeredToolUseIds: result.answeredToolUseIds,
          rescueSuppressed: result.rescueSuppressed,
          deferredToolUse: result.deferredToolUse,
          agentSetting: result.agentSetting,
          sessionProjectPath: result.projectPath,
          planModeOnResume,
          resumedAsFork: effectiveFork,
        };
      }
      logEvent("tengu_continue", {
        success: false,
        entrypoint: lit("print"),
      });
    } catch (error) {
      if (error instanceof ResumeRefusedError) {
        await logEventAsync("tengu_continue", {
          success: false,
          entrypoint: lit("print"),
          error_name: sanitizedErrorNameForTelemetry(error),
        });
        writeStartupFailure(`${FAILED_TO_RESUME_SESSION_TEXT}: ${error.message}`, s.outputFormat);
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
  if (s.teleport)
    try {
      await waitForPolicyLimitsToLoad();
      let S = cloudSessionsUnavailableReason();
      if (S) {
        await logOrgPolicyDeniedAsync("allow_remote_sessions", "cloud_session");
        throw Error(S);
      }
      logEvent("tengu_teleport_print", {});
      if (typeof s.teleport !== "string") throw Error("No session ID provided for teleport");
      let { clearSessionCaches } = await import("./chunk-e1mchg1t.js");
      clearSessionCaches(e, undefined, undefined, undefined, s.storageV5);
      let {
        checkOutTeleportedSessionBranch,
        processMessagesForTeleportResume,
        teleportResumeCodeSession,
        validateGitState,
      } = await import("./chunk-djvrn9k9.js");
      await validateGitState();
      let teleportResult = await teleportResumeCodeSession(s.teleport);
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
  if (s.resume) {
    let S = "load_error";
    let startTime = performance.now();
    let w = s.sdkUrl ? startResumeLoadHold() : undefined;
    try {
      logEvent("tengu_resume_print", {});
      let resumeIdentifier = typeof s.resume === "string" ? s.resume.trim() : "";
      let parsedSessionId = parseSessionIdentifier(resumeIdentifier);
      if (!parsedSessionId && resumeIdentifier) {
        let Ee = await searchSessionsByCustomTitle(
          resumeIdentifier,
          {
            exact: true,
          },
          s.storageV5,
        );
        if (Ee.length === 1) {
          let resumeIdentifier = getSessionIdFromLog(Ee[0]);
          if (resumeIdentifier) parsedSessionId = parseSessionIdentifier(resumeIdentifier);
        } else if (Ee.length > 1) {
          let joined = Ee.map(
            (Xe) => `  ${getSessionIdFromLog(Xe) ?? "(unknown)"}  (modified ${Xe.modified.toISOString()})`,
          ).join(`
`);
          logEvent("tengu_session_resumed", {
            entrypoint: lit("print"),
            success: false,
            failure_reason: lit("not_found_explicit_id"),
          });
          writeStartupFailure(
            `Error: --resume "${resumeIdentifier}" matches ${Ee.length} sessions. Pass one of these session IDs to disambiguate:
${joined}`,
            s.outputFormat,
          );
          gracefulShutdownSync(1);
          return {
            messages: [],
          };
        }
      }
      if (!parsedSessionId) {
        let Ee =
          "Error: --resume requires a valid session ID or session title when used with --print. Usage: claude -p --resume <session-id|title>";
        if (resumeIdentifier)
          Ee += `. Provided value "${resumeIdentifier}" is not a UUID and does not match any session title.`;
        logEvent("tengu_session_resumed", {
          entrypoint: lit("print"),
          success: false,
          failure_reason: lit("not_found_explicit_id"),
        });
        writeStartupFailure(Ee, s.outputFormat);
        gracefulShutdownSync(1);
        return {
          messages: [],
        };
      }
      let { clearSessionCaches } = await import("./chunk-e1mchg1t.js");
      clearSessionCaches(e, undefined, undefined, undefined, s.storageV5);
      let x = null;
      if (s.sdkUrl) {
        let startTime = performance.now();
        s.restoredWorkerState.then(() =>
          recordPhase("resume_worker_init_join_ms", performance.now() - startTime, startTime),
        );
        let [He, metadata] = await Promise.all([
          (s.hydratePrefetch ?? Promise.resolve(null)).then(async (St) => {
            markResumeHydratePrefetch(St, startTime);
            setTranscriptLocalGcEnabled(isTranscriptLocalGcEnabled());
            try {
              return await hydrateFromCCRv2InternalEvents(
                parsedSessionId.sessionId,
                St,
                isCcrSubagentSkipOnDeltaGateOn(),
                s.storageV5,
                s.onDiskBehind,
                isWondrousIslandGateOn(),
              );
            } finally {
              for (let wt of [St?.[0], St?.[1]]) if (wt) wt.events.length = 0;
            }
          }),
          s.restoredWorkerState,
          getSnapshotStore().restore(snapshotPathForSession()),
        ]);
        recordPhase("resume_hydrate_ms", performance.now() - startTime, startTime);
        let We = await reportCcrHistoryLoadFailure(He);
        if (We === "stopping")
          return {
            messages: [],
            aborted: true,
          };
        if (We) {
          logEvent("tengu_session_resumed", {
            entrypoint: lit("print"),
            success: false,
            failure_reason: fromEnum(We.reason),
          });
          writeStartupFailure(`${FAILED_TO_RESUME_SESSION_TEXT}: ${We.sentence}`, s.outputFormat);
          gracefulShutdownSync(1);
          return {
            messages: [],
            aborted: true,
          };
        }
        x = metadata;
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
              s.outputFormat,
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
        await hydrateRemoteSession(parsedSessionId.sessionId, parsedSessionId.ingressUrl, s.storageV5);
      if (!s.forkSession) {
        let startTime = performance.now();
        let result = await findBackgroundSessionHolder(parsedSessionId.sessionId, s.storageV5);
        recordPhase("resume_live_check_ms", performance.now() - startTime, startTime);
        if (result) {
          let handoff =
            s.liveBackgroundHandoff !== undefined
              ? await s.liveBackgroundHandoff.open({
                  holder: result,
                  entrypoint: "print",
                  prompt: s.liveBackgroundHandoff.prompt,
                  storageV5: s.storageV5,
                })
              : undefined;
          writeStartupFailure(
            `Error: ${formatSessionRunningInBackground({
              holder: result,
              canFork: true,
              handoff,
            })}`,
            isStartupFailureResultRequested() ? s.outputFormat : undefined,
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
      let transcriptAnchor = !parsedSessionId.jsonlFile
        ? await transcriptFileSize(parsedSessionId.sessionId)
        : undefined;
      let startTime_2 = performance.now();
      let re =
        (await s.remoteControlForkChild?.adoptSeed({
          sha256: x?.internal?.fork_seed_sha256 ?? undefined,
          unread: x === null || x.readFailed === true,
        })) ?? null;
      restoreChromeSetupOfferState(x);
      let Ae = pendingActionToolUseIds(x, s.tools ?? []);
      let Ue = env.CLAUDE_CODE_SESSION_BEGAN_AS_COPY === "1" || s.sessionBeganAsCopy === "1";
      let result = await loadConversationForResume(
        parsedSessionId.sessionId,
        parsedSessionId.jsonlFile || undefined,
        {
          forkSession: !!s.forkSession,
          ...(s.sdkUrl && {
            acceptCustomIds: true,
          }),
          storageV5: s.storageV5,
          credentials: s.credentials,
          precedingRows: re
            ? {
                rows: re.rows,
                first: re.firstBoot,
              }
            : undefined,
          ...(Ue && {
            copiedSessionOwnId: parsedSessionId.sessionId,
          }),
          ...precomputeResumeHooks(e.precompute, s.storageV5, {
            forkSession: !!s.forkSession,
          }),
          ...(Ae.size > 0 && {
            hostAnswerableToolUseIds: Ae,
          }),
          restoredCardToolUseId: singlePendingAction(x),
          restoredPromptWaits: hasPendingActions(x),
        },
      );
      recordPhase("resume_deserialize_ms", performance.now() - startTime_2, startTime_2);
      if (result)
        s.onFreshSessionStartRows?.(
          await maybeWaitForSessionStartHooks(
            result,
            s.sdkUrl && s.onOverdueSessionStartHooks
              ? {
                  overdue: s.onOverdueSessionStartHooks,
                  holdActivity: startResumeLoadHold,
                }
              : undefined,
          ),
        );
      S = "processing_error";
      if (exitIfEndedByModel(result, s.outputFormat))
        return {
          messages: [],
        };
      if (
        !result ||
        (result.messages.length === 0 && (parsedSessionId.isUrl || s.sdkUrl || !result.sessionId))
      )
        if (parsedSessionId.isUrl || s.sdkUrl) {
          let Ee = [];
          if (isPersistentRemoteSessionEnabled()) {
            let CLAUDE_CODE_RESUME_FROM_SESSION = env.CLAUDE_CODE_RESUME_FROM_SESSION;
            if (CLAUDE_CODE_RESUME_FROM_SESSION)
              try {
                logForDebugging(
                  `[resume-from] Hydrating from source session ${CLAUDE_CODE_RESUME_FROM_SESSION}`,
                );
                let { prepareApiRequest } = await import("./chunk-6phxatm7.js");
                let { teleportFromSessionsAPI, deserializeRemoteSessionLog } =
                  await import("./chunk-djvrn9k9.js");
                let { accessToken, orgUUID, profile } = await prepareApiRequest(s.credentials);
                let { log } = await teleportFromSessionsAPI(
                  CLAUDE_CODE_RESUME_FROM_SESSION,
                  orgUUID,
                  accessToken,
                  profile,
                );
                Ee = deserializeRemoteSessionLog(log);
                logForDebugging(
                  `[resume-from] Loaded ${Ee.length} messages from ${CLAUDE_CODE_RESUME_FROM_SESSION}`,
                );
              } catch (error) {
                logForDebugging(
                  `[resume-from] Failed to hydrate from ${CLAUDE_CODE_RESUME_FROM_SESSION}: ${errorMessage(error)}`,
                );
              }
          }
          let startTime = performance.now();
          let Xe = await (s.sessionStartHooksPromise ??
            runStartupHooks(e, {
              kind: "session-start",
              source: "startup",
              storageV5: s.storageV5,
              credentials: s.credentials,
            }));
          recordPhase("hooks_init_ms", performance.now() - startTime, startTime);
          let We = dedupeSessionStartRows(Ee, Xe);
          s.onFreshSessionStartRows?.(We);
          let resumeSessionAdoption = resolveResumeSessionAdoption(result?.sessionId, !!s.forkSession, {
            acceptCustomIds: !!s.sdkUrl,
          });
          if (result && resumeSessionAdoption.adoptedSessionId) {
            switchSession(
              resumeSessionAdoption.adoptedSessionId,
              "resume",
              result.fullPath ? dirname(result.fullPath) : null,
            );
            restoreSessionMetadata(result, {
              storageV5: s.storageV5,
            });
          }
          let planModeOnResume = restorePlanModeOnResume(x, setAppState, {
            lane: s.sdkUrl ? "sdk_url" : "print",
            forkSession: s.forkSession,
          });
          if (lazyTeleportRelayMarker && s.sdkUrl)
            lazyTeleportRelayMarker.noteTeleportBootUnreached(
              "empty_hydration",
              s.relayAwaitsHandoff === true,
            );
          return {
            messages: [...Ee, ...We],
            ...(Ee.length > 0 && {
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
          writeStartupFailure(`${SESSION_NOT_FOUND_MESSAGE} ${parsedSessionId.sessionId}`, s.outputFormat);
          gracefulShutdownSync(1);
          return {
            messages: [],
          };
        }
      if (s.resumeSessionAt) {
        let index = result.messages.findIndex((message) => message.uuid === s.resumeSessionAt);
        if (index < 0) {
          logEvent("tengu_session_resumed", {
            entrypoint: lit("print"),
            success: false,
            failure_reason: lit("processing_error"),
          });
          writeStartupFailure(`No message found with message.uuid of: ${s.resumeSessionAt}`, s.outputFormat);
          gracefulShutdownSync(1);
          return {
            messages: [],
          };
        }
        let He = [];
        if (s.resumeDropsTurn !== undefined) {
          let declaredTurnRange = findDeclaredTurnRange(result.messages.slice(index + 1), s.resumeDropsTurn);
          if (!declaredTurnRange.ok) {
            logEvent("tengu_session_resumed", {
              entrypoint: lit("print"),
              success: false,
              failure_reason: lit("drop_guard_refused"),
            });
            writeStartupFailure(
              `${RESUME_DROPS_TURN_REJECTED_PREFIX} resuming at ${s.resumeSessionAt} would discard entries not attributable to turn ${s.resumeDropsTurn}: ${declaredTurnRange.reason}`,
              s.outputFormat,
            );
            gracefulShutdownSync(1);
            return {
              messages: [],
            };
          }
          let { keep } = declaredTurnRange;
          He =
            keep && !re?.rows.some((Lt) => Lt.uuid === keep.uuid)
              ? [
                  createAttachmentMessage(keep.attachment, {
                    now: () => keep.timestamp,
                    uuid: () => randomUUID(),
                  }),
                ]
              : [];
        }
        let sliced = result.messages.slice(0, index + 1);
        let We = isAllInvisibleMeta(result.messages.slice(index + 1)) ? null : threadAskMarkerFor(sliced);
        result.messages = [...sliced, ...He, ...(We ? [createAttachmentMessage(We)] : [])];
      }
      let warning = lazyCoordinatorMode.matchSessionMode(result.mode);
      if (warning) {
        process.stderr.write(
          warning +
            `
`,
        );
        let agentDefinitions = await reloadAgentDefinitionsForModeSwitch(
          getCwd(),
          s.cliAgents ?? [],
          s.storageV5,
        );
        setAppState((He) => ({
          ...He,
          agentDefinitions,
        }));
      }
      let { adoptedSessionId, effectiveFork } = resolveResumeSessionAdoption(
        result.sessionId,
        !!s.forkSession,
        {
          acceptCustomIds: !!s.sdkUrl,
        },
      );
      if (adoptedSessionId) {
        switchSession(adoptedSessionId, "resume", result.fullPath ? dirname(result.fullPath) : null);
        if (persistSession) await resetSessionFilePointer();
      }
      restoreSessionStateFromLog(result, setAppState, appState, {
        preserveLiveBudget: false,
      });
      let me = re !== null ? new Set(re.rows.map((Ee) => Ee.uuid)) : undefined;
      let planModeOnResume = restorePlanModeOnResume(x, setAppState, {
        lane: s.sdkUrl ? "sdk_url" : "print",
        forkSession: s.forkSession,
        transcript: {
          messages: result.messages,
          sourceRows:
            me === undefined ? result.messages : result.messages.filter((prev) => !me.has(prev.uuid)),
          sourceAllowed: isTranscriptPlanSourceAllowed(s),
        },
      });
      if (effectiveFork) {
        await adoptForkSessionMetadata(result, {
          stripWorktreeSession: true,
          stripRelocatedCwd: true,
          storageV5: s.storageV5,
        });
        if (result.contentReplacements?.length)
          await recordContentReplacement(result.contentReplacements, undefined, s.storageV5);
      } else {
        restoreSessionMetadata(result, {
          storageV5: s.storageV5,
        });
        reclaimSessionNameAtStart(s).catch(logError);
      }
      queueMemoryNotices(s.outputFormat);
      setCostStateForRestore(result);
      if (!effectiveFork) {
        let persist = persistSession && !!adoptedSessionId;
        if (
          await refuseUnsafeWorktreeResume(
            e,
            result.worktreeSession,
            {
              persist,
              storageV5: s.storageV5,
            },
            s.outputFormat,
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
        interruption_kind: fromEnum(result.turnInterruptionState?.kind ?? "none"),
        resume_duration_ms: Math.round(performance.now() - startTime),
      });
      if (lazyTeleportRelayMarker && s.sdkUrl) {
        let startTime = performance.now();
        await lazyTeleportRelayMarker.bootTeleportFromTranscript(
          parsedSessionId.sessionId,
          result.messages,
          s.storageV5,
          s.relayAwaitsHandoff === true,
        );
        recordPhase("relay_marker_scan_ms", performance.now() - startTime, startTime);
      }
      return {
        messages: result.messages,
        liveSourceRows: me,
        turnInterruptionState: result.turnInterruptionState,
        supersededToolUseIds: result.supersededToolUseIds,
        supersededToolNames: result.supersededToolNames,
        answeredToolUseIds: result.answeredToolUseIds,
        rescueSuppressed: result.rescueSuppressed,
        deferredToolUse: result.deferredToolUse,
        agentSetting: result.agentSetting,
        sessionProjectPath: result.projectPath,
        planModeOnResume,
        transcriptAnchor,
        resumedAsFork: effectiveFork,
      };
    } catch (error) {
      let phase = S;
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
      let q =
        error instanceof Error
          ? `${FAILED_TO_RESUME_SESSION_TEXT}: ${describeTranscriptLoadError(error, phase)}`
          : `${FAILED_TO_RESUME_SESSION_TEXT} with --print mode`;
      writeStartupFailure(q, s.outputFormat);
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
      w?.();
    }
  }
  if (isParkedSpare())
    return {
      messages: [],
    };
  let y = await (s.sessionStartHooksPromise ??
    runStartupHooks(e, {
      kind: "session-start",
      source: "startup",
      storageV5: s.storageV5,
      credentials: s.credentials,
    }));
  s.onFreshSessionStartRows?.(y);
  return {
    messages: y,
  };
}
//@ chunk-tyg7f3ek.js:882005-882991 sole-consumer
/**
 * 会话恢复加载失败时给出人能看懂的原因：按存储错误码 ELOOP/ENXIO/EFBIG/EAGAIN 分别说明（符号链接、不是普通文件、超出大小限制、读取不一致），其他情况返回原始错误消息。
 */
function describeTranscriptLoadError(error, phase) {
  if (phase !== "load_error") return error.message;
  let r = win32EbadfHelp(error);
  if (r !== undefined) return r;
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
//@ chunk-tyg7f3ek.js:882991-884037 sole-consumer
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
//@ chunk-tyg7f3ek.js:884037-884082 sole-consumer = mergeClients (0.78)
function mergeClients(...e) {
  return Ji(e.flat(), "name");
}
//@ chunk-tyg7f3ek.js:884082-884144 sole-consumer
function mergeClientsWithCommsServers(...e) {
  return [...mergeClients(...e), ...e.flat().filter(isCommsRoledServer)];
}
//@ chunk-j387qrdq.js:628-800 placement = finalContextTokensFromLastResponse (0.778)
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
//@ chunk-j387qrdq.js:800-861 placement
/**
 * 判断中断请求是否为立即中断：send_now 为真且未 cancel_queued。
 */
function isImmediateInterruptRequest(request) {
  return request.send_now === true && request.cancel_queued !== true;
}
//@ chunk-j387qrdq.js:861-942 placement
/**
 * 判断 request_id 是否为 late-bind-interrupt- 前缀（延迟绑定的中断请求）。
 */
function isLateBindInterruptRequestId(requestId) {
  return typeof requestId === "string" && requestId.startsWith("late-bind-interrupt-");
}
//@ chunk-j387qrdq.js:942-950 placement
var MAX_CANCEL_USER_MESSAGE_UUIDS = 8;
//@ chunk-j387qrdq.js:950-1212 placement
/**
 * 解析"取消排队消息"控制请求的目标：给出 1 到上限个合法的用户消息 uuid 时，返回按 uuid（不区分大小写）匹配的判定函数。
 */
function parseCancelQueuedTarget(e) {
  let forUserMessageUuids = e.for_user_message_uuids;
  if (
    e.cancel_queued === true ||
    !Array.isArray(forUserMessageUuids) ||
    forUserMessageUuids.length === 0 ||
    forUserMessageUuids.length > MAX_CANCEL_USER_MESSAGE_UUIDS
  )
    return;
  let t = new Set();
  for (let forUserMessageUuid of forUserMessageUuids) {
    let o = normalizeUuidOrNull(forUserMessageUuid);
    if (o === null) return;
    t.add(o.toLowerCase());
  }
  return {
    names: (r) => r.some((o) => t.has(o.toLowerCase())),
  };
}
//@ chunk-j387qrdq.js:1212-1314 placement
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
//@ chunk-j387qrdq.js:1314-1470 placement
/**
 * 构造错误的 control_response 消息（错误文本，可选错误码与模型）。
 */
function controlErrorResponse(requestId, error, t, r) {
  return {
    type: "control_response",
    response: {
      subtype: "error",
      request_id: requestId,
      error,
      ...(t !== undefined && {
        error_code: t,
      }),
      ...(r !== undefined && {
        model: r,
      }),
    },
  };
}
//@ chunk-j387qrdq.js:1470-1747 fingerprint = emitLoadError (0.898)
/**
 * 构造加载失败时的 result 消息（subtype error_during_execution）。
 */
function emitLoadError(sessionId, errors, t) {
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
    ...(t !== undefined && {
      user_message_uuid: t,
    }),
  };
}
//@ chunk-e6aww6q8.js:553953-554048 fingerprint = canBatchWith (0.667)
/**
 * 排队的命令能否与前一条合并发送（同为普通 prompt 且来源允许）。
 */
function canBatchWith(e) {
  return (
    isSendableQueuedCommand(e) &&
    e.mode === "prompt" &&
    e.shouldQuery !== false &&
    !e.isMeta &&
    isHumanDrivenOrigin(e.origin)
  );
}
//@ chunk-e6aww6q8.js:1818531-1818725 placement = isSystemLocalCommandMessage (1)
/**
 * 为每条 assistant 生成“用户轮序号:message.id”键，其他消息为 undefined。
 */
function assistantTurnKeys(message) {
  let n = 0;
  return message.map((r) => {
    if (r.type === "assistant") return `${n}:${String(r.message.id)}`;
    if (
      (r.type === "user" && !hasToolResultBlock_3(r)) ||
      (r.type === "system" && r.subtype === "local_command")
    )
      n += 1;
    return;
  });
}
//@ chunk-e6aww6q8.js:1830039-1830121 fingerprint = removeInterruptedMessage (1)
/**
 * 从消息数组里删除被中断的消息及其后一条。
 */
function removeInterruptedMessage(messages, interruptedUserMessage) {
  let idx = messages.findIndex((m) => m.uuid === interruptedUserMessage.uuid);
  if (idx !== -1) messages.splice(idx, 2);
}
//@ chunk-e6aww6q8.js:1830121-1830419 layout
/**
 * 把被中断的提示重新放回消息队列（interrupted_prompt）。
 */
function restoreInterruptedPrompt(e, n, r) {
  if (n?.kind !== "interrupted_prompt") return false;
  let { message, tail } = n;
  let index = e.findIndex((G) => G.uuid === message.uuid);
  if (index === -1) return false;
  let S = new Set(e.map((G) => G.uuid));
  let w = [];
  for (let G of r)
    if (!S.has(G.uuid)) {
      S.add(G.uuid);
      w.push(G);
    }
  let L = tail !== undefined && isPlainInterruptMarker(message);
  e.splice(L ? index : index + 1, 0, ...w);
  return true;
}
//@ chunk-e6aww6q8.js:1830419-1831267 placement = isNotEmptyMessage (0.275)
/**
 * 续写时删除哨兵后的 "(no content)" 占位 assistant，并在只剩系统消息时去掉 "Continue from where you left off." 提示（tengu_silly_waterfall 等开关）。
 */
function dropRedundantResumeMessages(e, n, r) {
  if (!n || n.kind === "none") return;
  let index = e.findIndex((w) => w.uuid === n.message.uuid);
  let h =
    n.loaderSentinelUuid !== undefined
      ? e.findIndex((w) => w.uuid === n.loaderSentinelUuid)
      : index !== -1
        ? index + 1
        : -1;
  let y = h !== -1 ? e[h] : undefined;
  if (
    y?.type === "assistant" &&
    Array.isArray(y.message.content) &&
    y.message.content.length === 1 &&
    y.message.content[0]?.type === "text" &&
    y.message.content[0].text === NO_RESPONSE_REQUESTED
  ) {
    e.splice(h, 1);
    r(h);
  }
  let sliced = e.slice(index + 1);
  if (
    index !== -1 &&
    isLegacyInterruptMarker(e[index]) &&
    (isPrecededByToolResult(e, index) || getFeatureValue_CACHED_MAY_BE_STALE(TENGU_GOOFY_HARE, false)) &&
    (sliced.every((w) => w.type === "system") ||
      (n.tail !== undefined &&
        sliced.every(
          (w) =>
            w.type === "system" ||
            (w.type === "progress" &&
              w.data.type === "hook_progress" &&
              w.data.hookEvent === "SessionStart") ||
            (w.type === "attachment" &&
              w.attachment.type === "hook_success" &&
              w.attachment.hookEvent === "SessionStart" &&
              w.attachment.content === "" &&
              w.attachment.heldContent === undefined),
        ) &&
        getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WONDROUS_HAVEN, false))) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_silly_waterfall", false)
  ) {
    e.splice(index, 1);
    r(index);
  }
}
//@ chunk-e6aww6q8.js:1831267-1831380 placement
/**
 * 位置之前最近的 user/assistant 是工具结果消息。
 */
function isPrecededByToolResult(e, n) {
  let last = e.findLast((s, h) => h < n && (s.type === "user" || s.type === "assistant"));
  return last !== undefined && isToolUseResultMessage(last);
}
//@ chunk-e6aww6q8.js:3260568-3260736 placement
/**
 * 从元数据读取禁用工具列表（最多 64 项，全部无效时返回 undefined）。
 */
function readDisallowedToolsMetadata(e) {
  let disallowedTools = disallowedToolsSchema().safeParse(e).data?.disallowed_tools;
  let sliced = disallowedTools
    ?.flatMap((disallowedTool) => mcpToolNameSchema().safeParse(disallowedTool).data ?? [])
    .slice(0, 64);
  return sliced?.length === 0 && disallowedTools?.length !== 0 ? undefined : sliced;
}
//@ chunk-nkdv7dw8.js:8230-8502 sole-consumer
function stripInternalMcpConfigFields(e) {
  return xr(e, (n) =>
    Uo(n, [
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
//@ chunk-nkdv7dw8.js:8502-8555 sole-consumer
var EMPTY_NAME_SET = new Set();
var st = Object.freeze(Object.create(null));
//@ chunk-nkdv7dw8.js:8555-8742 sole-consumer
function carryConfiguredCommand(e, n) {
  return isStandardKeyActive() &&
    n?.configuredCommand !== undefined &&
    "command" in e &&
    "command" in n &&
    e.command === n.command &&
    En(e.args ?? [], n.args ?? [])
    ? {
        ...e,
        configuredCommand: n.configuredCommand,
      }
    : e;
}
//@ chunk-nkdv7dw8.js:8742-12607 fingerprint = handleMcpSetServers (0.339)
/**
 * 处理 mcp_set_servers：按 SDK 给出的服务器集合增删改动态 MCP 服务器并重连。
 */
async function handleMcpSetServers(
  desired,
  n,
  o,
  setAppState,
  r,
  getAppState,
  caller,
  deferConnect = false,
  authoritative = false,
  storageV5,
  credentials,
  stores,
  h,
  dialOptions,
  operatorOwnedMcpConfigNames = EMPTY_NAME_SET,
) {
  if (authoritative && Object.hasOwn(desired, CLAUDE_CODE_REMOTE))
    await awaitMcpPolicyColdStart({
      hasDynamicMcpConfig: true,
    });
  let B = !authoritative
    ? desired
    : xr(stripInternalMcpConfigFields(desired), (O, R) => {
        if (env.CLAUDE_CODE_REMOTE) getServerUrl(R, O);
        return markCcrInjectedConfig(
          R,
          copyOwnServerMarks(desired[R], carryConfiguredCommand(O, o.configs[R])),
          isLockedOutByOrgMcpPolicy,
        );
      });
  let F = new Set(
    (getAppState?.()?.mcp.clients ?? [])
      .filter((O) => isBuiltinInProcessMcpServer(O.name) && !Object.hasOwn(o.configs, O.name))
      .map((O) => O.name),
  );
  let I = Object.create(null);
  let U = Object.create(null);
  for (let [key, value] of Object.entries(B)) {
    let j = value.type;
    if (F.has(key)) I[key] = BUILTIN_SERVER_IGNORED_REASON;
    else if (j === "sse-ide" || j === "ws-ide") I[key] = IGNORED_IDE_TRANSPORT_TEXT;
    else U[key] = value;
  }
  let z = new Set([...operatorOwnedMcpConfigNames].map(getPrefixServerKey));
  let J = Object.create(null);
  let Z = Object.create(null);
  for (let [key, value] of Object.entries(U))
    if (!Object.hasOwn(o.configs, key) && z.has(getPrefixServerKey(key)))
      J[key] = OPERATOR_SUPPLIED_IGNORED_TEXT;
    else Z[key] = value;
  if (Object.values(Z).some((O) => O.type !== "sdk"))
    await awaitMcpPolicyColdStart({
      hasDynamicMcpConfig: true,
    });
  let { allowed: allowedServers, blocked } = filterMcpServersByPolicy(Z);
  let P = Object.create(null);
  for (let O of blocked) P[O] = IGNORED_BY_ENTERPRISE_POLICY_TEXT;
  let G =
    caller === "plugin_install_diff" ||
    caller === "plugins_sync" ||
    caller === "reload_plugins" ||
    caller === "set_cwd" ||
    caller === "claim_session" ||
    caller === "tool_register" ||
    caller === "plugin_connect";
  let oe = allowedServers;
  let xe = new Set();
  let ae = G
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
  if (ae !== undefined) {
    let O =
      !startupCcrEnv.isBridgeCarrierChild &&
      (ae === IGNORED_EXCLUSIVE_MANAGED_CONFIG_TEXT || ae === IGNORED_DISABLE_SIDELOAD_TEXT);
    let R = Object.create(null);
    for (let [key, value] of Object.entries(allowedServers))
      if (isAlwaysKeptServer(value, O, O && ae === IGNORED_DISABLE_SIDELOAD_TEXT)) R[key] = value;
    oe = R;
    for (let key of Object.keys(allowedServers))
      if (!Object.hasOwn(oe, key)) {
        xe.add(key);
        P[key] = ae;
      }
  }
  if (requireVtyyqz9qChunk !== null) {
    let { kept, dropped, error } = requireVtyyqz9qChunk.withoutWithheldCcrArtifactsEntry(oe);
    oe = kept;
    for (let name of dropped) P[name] = error;
  }
  let me = Object.create(null);
  let ge = Object.create(null);
  for (let [key, value] of Object.entries(oe))
    if (value.type === "sdk") me[key] = value;
    else ge[key] = value;
  let currentSdkNames = new Set(Object.keys(n.configs));
  let newSdkNames = new Set(Object.keys(me));
  let de = [];
  let Q = [];
  let _e = [];
  let we = Object.freeze(Object.assign(Object.create(null), n.configs));
  let merged = Object.assign(Object.create(null), we);
  let he = [...n.clients];
  let newSdkClients = [...n.tools];
  let newSdkTools = [...n.commands];
  let ke = () => st;
  if (authoritative) {
    let O = env.CLAUDE_CODE_REMOTE && newSdkNames.size === 0;
    if (O && currentSdkNames.size > 0)
      logForDebugging(
        `mcp_set_servers: payload names no SDK server; keeping ${currentSdkNames.size} registered SDK server(s)`,
      );
    ke = O
      ? () => n.configs
      : () => {
          let configs = n.configs;
          let merged_2 = Object.assign(Object.create(null), omitKeys(configs, Q));
          for (let name of de) {
            let Y = merged[name];
            if (Y !== undefined && !Object.hasOwn(configs, name)) merged_2[name] = Y;
          }
          for (let H of _e) {
            let Y = merged[H];
            if (Y !== undefined && Object.hasOwn(configs, H) && configs[H] === we[H]) merged_2[H] = Y;
          }
          return merged_2;
        };
    for (let R of O ? [] : currentSdkNames)
      if (!newSdkNames.has(R)) {
        let client = he.find((Y) => Y.name === R);
        await Promise.all([
          client?.type === "connected" ? client.cleanup() : undefined,
          h?.closeReplacedSdkClients?.(R),
        ]);
        he = he.filter((Y) => Y.name !== R);
        let mcpPrefix = getMcpPrefix(R);
        newSdkClients = newSdkClients.filter(
          (newSdkClient) => !isToolFromMcpServer(newSdkClient, R, mcpPrefix),
        );
        newSdkTools = newSdkTools.filter((newSdkTool) => !commandBelongsToServer(newSdkTool, R));
        delete merged[R];
        Q.push(R);
      }
    for (let [key, value] of Object.entries(me)) {
      let { tools, connectorId } = parseMcpServerSettings(value).settings;
      let Re = inspectToolsList(value);
      if (Re) logForDebugging(`mcp_set_servers: SDK MCP server '${key}': ${describeToolsListIssues(Re)}`);
      if (!currentSdkNames.has(key)) {
        let { tools: tools_2, connectorId: connectorId_2, ...ye } = value;
        let Te = {
          ...ye,
          ...(tools !== undefined && {
            tools,
          }),
          ...(connectorId !== undefined && {
            connectorId,
          }),
        };
        merged[key] = Te;
        let pendingClient = {
          type: "pending",
          name: key,
          config: {
            ...Te,
            scope: "dynamic",
          },
        };
        he = [...he, pendingClient];
        de.push(key);
        continue;
      }
      let Me = merged[key];
      if (Me && !sameToolPolicies(Me.tools, tools)) {
        let { tools: tools_2, ...Ce } = Me;
        merged[key] =
          tools === undefined
            ? Ce
            : {
                ...Ce,
                tools,
              };
        _e.push(key);
      }
    }
  }
  let re = await reconcileMcpServersImpl(
    ge,
    o,
    setAppState,
    r,
    getAppState,
    caller,
    deferConnect,
    authoritative,
    new Set(Object.keys(desired).filter((key) => !xe.has(key))),
    storageV5,
    credentials,
    stores,
    h?.wantsDial,
    h?.signal,
    dialOptions,
    h?.getOwnedConfigs,
    h?.operatorToolPolicyConfigs,
    ke,
  );
  let be = (O) => `[${O.map(sanitizeTelemetryString).join(", ")}]`;
  logForDebugging(
    `[MCP] ${caller ?? "unknown"} applied: ${Object.keys(desired).length} servers requested; added=${be([...de, ...re.response.added])} removed=${be([...Q, ...re.response.removed])} ignored (operator-owned)=${be(Object.keys(J))} refused=${Object.keys(I).length + Object.keys(P).length}`,
  );
  return {
    response: {
      added: [...de, ...re.response.added],
      removed: [...Q, ...re.response.removed],
      errors: {
        ...I,
        ...J,
        ...P,
        ...re.response.errors,
      },
    },
    newSdkState: {
      configs: merged,
      clients: he,
      tools: newSdkClients,
      commands: newSdkTools,
    },
    newDynamicState: re.newState,
    sdkServersAdded: de,
    sdkServersRemoved: Q,
    sdkServersUpdated: _e,
    sdkConfigsAtSnapshot: we,
    sdkServersChanged: de.length > 0 || Q.length > 0,
    deferredSettle: re.deferredSettle,
  };
}
//@ chunk-nkdv7dw8.js:12607-13624 layout
/**
 * 把 SDK 动态 MCP 服务器集合应用到状态（是否权威、是否延迟连接）。
 */
async function applyDynamicMcpServers(
  e,
  { payload, desired },
  { authoritative, caller, deferConnect, dialOptions },
) {
  let { stores } = e;
  let { getAppState, setAppState, getDynamicMcpState, setDynamicMcpState } = stores;
  let h = {
    ...getDynamicMcpState(),
    configs: {
      ...e.getOwnedConfigs(),
      ...getDynamicMcpState().configs,
    },
  };
  if (authoritative) {
    let B = Object.create(null);
    for (let [key, value] of Object.entries(e.getOwnedConfigs()))
      if (Object.hasOwn(payload, key)) B[key] = value;
    e.setOwnedConfigs(B);
  }
  let L = e.sdkState();
  let q = await handleMcpSetServers(
    desired,
    L,
    h,
    setAppState,
    e.redactsPersistedLane(),
    getAppState,
    caller,
    deferConnect,
    authoritative,
    e.storageV5,
    e.credentials,
    stores,
    e,
    dialOptions,
    e.operatorOwnedMcpConfigNames,
  );
  if (authoritative) {
    let B = new Set(Object.keys(q.newDynamicState.configs));
    e.setOwnedConfigs(
      Object.fromEntries(
        Object.entries(stripInternalMcpConfigFields(payload))
          .filter(([key]) => B.has(key) && !isPluginServerConfig(q.newDynamicState.configs[key]))
          .flatMap(([key, value]) => {
            let U = markCcrInjectedConfig(
              key,
              copyOwnServerMarks(payload[key], {
                ...carryConfiguredCommand(value, q.newDynamicState.configs[key]),
                scope: "dynamic",
              }),
              isLockedOutByOrgMcpPolicy,
            );
            return hasCcrMeta(U) === hasCcrMeta(q.newDynamicState.configs[key]) ? [[key, U]] : [];
          }),
      ),
    );
  }
  setDynamicMcpState(
    reconcileMcpClients(
      isDiscoveryCacheOn() ? h : getDynamicMcpState(),
      getDynamicMcpState(),
      q.newDynamicState,
    ),
  );
  if (q.deferredSettle)
    q.deferredSettle.then((B) => {
      e.enqueueSettleMerge(() => {
        setDynamicMcpState(buildMcpStatusList(getDynamicMcpState(), B, getAppState().mcp.clients));
      });
    });
  return q;
}
//@ chunk-nkdv7dw8.js:13624-20914 layout
async function reconcileMcpServersImpl(
  e,
  n,
  o,
  s,
  r,
  u = "unknown",
  S = false,
  y = false,
  C,
  E,
  D,
  x,
  h,
  signal,
  q,
  B,
  operatorToolPolicyConfigs,
  I = () => st,
) {
  let U = new Set(Object.keys(n.configs));
  let z = new Set(Object.keys(e));
  let J = y ? [...U].filter((p) => !z.has(p) && !C?.has(p) && isPluginServerConfig(n.configs[p])) : [];
  let Z = new Set(J.length > 0 ? Object.keys(filterMcpServersByPolicy(wS(n.configs, J)).allowed) : []);
  let filtered = [...U].filter((p) => !z.has(p) && !Z.has(p));
  let filtered_2 = [...z].filter((p) => !U.has(p));
  let filtered_3 = [...U].filter((p) => z.has(p));
  let G = new Set(
    [...n.clients, ...(r?.().mcp.clients ?? [])]
      .filter((p) => p.type === "failed" && p.error === NOT_DIALED_SUPERSEDED_TEXT)
      .map((p) => p.name),
  );
  let oe = (p) => {
    let M = B?.() ?? {};
    let v = Object.hasOwn(M, p) ? M[p] : undefined;
    let T = Object.hasOwn(e, p) ? e[p] : undefined;
    if (v === undefined || T === undefined) return false;
    let { scope, ...ee } = v;
    return (
      supportsEnvExpansion(ee) &&
      mcpClientModule_5().areMcpConfigsEqual(toDynamicServerConfig(ee), toDynamicServerConfig(T))
    );
  };
  let xe = new Set(
    y
      ? []
      : [...n.clients, ...(r?.().mcp.clients ?? [])]
          .filter((p) => !oe(p.name) && (p.type === "disabled") !== isMcpServerDisabled(p.name))
          .map((p) => p.name),
  );
  let filtered_4 = filtered_3.filter((p) => {
    let currentConfig = n.configs[p];
    let desiredConfigRaw = e[p];
    if (!currentConfig || !desiredConfigRaw || G.has(p) || xe.has(p)) return true;
    let desiredConfig = toDynamicServerConfig(desiredConfigRaw);
    if (!mcpClientModule_5().areMcpConfigsEqual(currentConfig, desiredConfig)) {
      logMCPDebug(p, `reconcileMcpServers: config changed, will replace (caller=${u})`);
      return true;
    }
    return false;
  });
  logEvent("tengu_mcp_reconcile", {
    caller: fromEnum(u),
    desiredCount: z.size,
    currentCount: U.size,
    toRemoveCount: filtered.length,
    toAddCount: filtered_2.length,
    toReplaceCount: filtered_4.length,
    retainedPluginCount: Z.size,
  });
  let me = [];
  let ge = [];
  let ce = Object.create(null);
  let Se = [...n.clients];
  let de = [...n.tools];
  for (let p of [...filtered, ...filtered_4]) {
    let M = Se.find((A) => A.name === p) ?? r?.().mcp.clients.find((client) => client.name === p);
    let v = n.configs[p];
    if (v) {
      if (M?.type === "connected") {
        setMcpOnClose(M, undefined);
        try {
          await M.cleanup();
        } catch (error) {
          logForDebugging(`MCP client cleanup failed for ${p}: ${error}`, {
            level: "error",
          });
        }
      }
      await mcpClientModule_5().clearServerCache(p, v);
    }
    let mcpPrefix = getMcpPrefix(p);
    de = de.filter((A) => !isToolFromMcpServer(A, p, mcpPrefix));
    Se = Se.filter((A) => A.name !== p);
    if (filtered.includes(p)) me.push(p);
  }
  let Q = [...filtered_2, ...filtered_4];
  let _e = new Set(Q);
  let any = [ListMcpResourcesTool, ReadMcpResourceTool].some(
    (p) =>
      de.some((M) => toolMatchesName(M, p.name)) ||
      (r?.().mcp.tools ?? []).some((M) => toolMatchesName(M, p.name)),
  );
  let fe = (name, config, dialEpoch, T) => {
    if (T.type === "connected")
      mcpClientModule_5()
        .detachAndCloseConnection(T)
        .catch(() => {});
    let A = identityChangedFailure(name, config);
    return {
      name,
      client: A,
      tools: [],
      error: A.error,
      fetched: null,
      dialEpoch,
    };
  };
  let he = async (p) => {
    let M = e[p];
    if (!M) return null;
    let dialEpoch = identityEpoch();
    if (M.type === "sdk")
      return {
        name: p,
        client: null,
        tools: [],
        error: null,
        fetched: null,
        dialEpoch,
      };
    if (h !== undefined && !h(p, M))
      return {
        name: p,
        client: null,
        tools: [],
        error: NOT_DIALED_SUPERSEDED_TEXT,
        fetched: null,
        dialEpoch,
      };
    let dynamicServerConfig = toDynamicServerConfig(M);
    let A = () => !y && !oe(p) && isMcpServerDisabled(p);
    let ee = {
      name: p,
      client: {
        name: p,
        type: "disabled",
        config: dynamicServerConfig,
      },
      tools: [],
      error: null,
      fetched: null,
      dialEpoch,
    };
    if (A()) return ee;
    let ie = () => identityEpoch() !== dialEpoch && isRemoteMcpTransport(dynamicServerConfig);
    let pe = (ue) => fe(p, dynamicServerConfig, dialEpoch, ue);
    let Oe = (ue) => {
      let W = mcpGateError(ue, p, dynamicServerConfig);
      return {
        name: p,
        client: {
          name: p,
          type: "failed",
          config: dynamicServerConfig,
          ...W,
        },
        tools: [],
        error: W.error,
        fetched: null,
        dialEpoch,
      };
    };
    try {
      let ue = mcpDialBlockCause(p, dynamicServerConfig);
      if (ue) return Oe(ue);
      let W = await mcpClientModule_5().connectToServer(
        p,
        dynamicServerConfig,
        undefined,
        E,
        D,
        undefined,
        q,
      );
      if (ie()) return pe(W);
      let He = [];
      let Ee = null;
      if (W.type === "connected") {
        He = await mcpClientModule_5().fetchToolsForClient(W, E);
        try {
          let [Be, Wt] = await Promise.all([
            mcpClientModule_5().fetchCommandsForClient(W),
            mcpClientModule_5().fetchResourcesForClient(W),
          ]);
          Ee = {
            name: p,
            cmds: Be,
            res: Wt,
          };
        } catch (error) {
          logHandlerFailure(s, `${u}: mcp listing`, error);
        }
      }
      if (ie()) return pe(W);
      let qe = isDiscoveryCacheOn() || W.type === "failed" ? null : mcpDialBlockCause(p, dynamicServerConfig);
      if (qe || (!isDiscoveryCacheOn() && A())) {
        if (W.type === "connected")
          mcpClientModule_5()
            .detachAndCloseConnection(W)
            .catch(() => {});
        return qe ? Oe(qe) : ee;
      }
      if (W.type === "connected" && W.capabilities?.resources && !any && !isMcpServerDisabled(p)) {
        any = true;
        He = [...He, ListMcpResourcesTool, ReadMcpResourceTool, listDirectoryResourceTool];
      }
      let error = W.type === "failed" ? W.error || "Connection failed" : null;
      let je = applyMcpServerConfig(dynamicServerConfig, {
        client: W,
        tools: He,
        commands: Ee?.cmds,
      });
      return {
        name: p,
        client: je.client,
        tools: je.tools,
        error,
        fetched:
          Ee !== null && je.commands !== undefined
            ? {
                ...Ee,
                cmds: je.commands,
              }
            : Ee,
        dialEpoch,
      };
    } catch (error) {
      let error_2 = toError(error);
      logHandlerFailure(s, `${u}: mcp dial`, error_2);
      return {
        name: p,
        client: null,
        tools: [],
        error: error_2.message,
        fetched: null,
        dialEpoch,
      };
    }
  };
  let ve = (p) => {
    let M = e[p];
    return !M || mcpClientModule_5().isLocalMcpServer(toDynamicServerConfig(M));
  };
  let le = Object.fromEntries(Q.map((p) => [p, toDynamicServerConfig(e[p])]));
  let mapped = Q.map((p) => ({
    type: "pending",
    name: p,
    config: le[p],
  }));
  Se.push(...mapped);
  let re = emptyServerMap();
  for (let p of z) {
    let M = e[p];
    if (M) {
      let dynamicServerConfig = toDynamicServerConfig(M);
      let T = n.configs[p];
      if (y && T !== undefined && isPluginServerConfig(T)) {
        dynamicServerConfig.pluginSource = T.pluginSource;
        if (T.pluginPath !== undefined) dynamicServerConfig.pluginPath = T.pluginPath;
        if (T.pluginOfficialSourceVouched !== undefined)
          dynamicServerConfig.pluginOfficialSourceVouched = T.pluginOfficialSourceVouched;
        if (filtered_4.includes(p)) dynamicServerConfig.pluginEndpointTemplated = true;
        else if (T.pluginEndpointTemplated !== undefined)
          dynamicServerConfig.pluginEndpointTemplated = T.pluginEndpointTemplated;
      }
      re[p] = dynamicServerConfig;
    }
  }
  for (let p of Z) {
    let M = n.configs[p];
    if (M) re[p] = M;
  }
  let be = () =>
    collectServerToolPolicies(
      {
        ...e,
        ...operatorToolPolicyConfigs,
      },
      I(),
    );
  let O = {
    clients: Se,
    tools: de,
    configs: re,
  };
  let R = new Set([...filtered, ...filtered_4, ...Q]);
  let mapped_2 = [...R].map((p) => [p, getMcpPrefix(p)]);
  o((p) => {
    let tools = p.mcp.tools.filter((tool) => !mapped_2.some(([pe, Oe]) => isToolFromMcpServer(tool, pe, Oe)));
    let filtered = p.mcp.clients.filter((client) => !R.has(client.name));
    let commands = p.mcp.commands.filter((command) => {
      for (let pe of R) if (commandBelongsToServer(command, pe)) return false;
      return true;
    });
    let toolPermissionContext = p.toolPermissionContext;
    let ee = y ? mergeMcpServerPolicyRules(toolPermissionContext, be(), "replace") : toolPermissionContext;
    if (R.size === 0 && ee === toolPermissionContext) return p;
    return {
      ...p,
      mcp: {
        ...p.mcp,
        tools,
        clients: [...filtered, ...mapped],
        commands,
        resources: omitKeys(p.mcp.resources, [...R]),
        resourceTemplates: omitKeys(p.mcp.resourceTemplates, [...R]),
      },
      toolPermissionContext: ee,
    };
  });
  if (Q.length === 0)
    return {
      response: {
        added: ge,
        removed: me,
        errors: ce,
      },
      newState: O,
    };
  let H = () => {};
  let promise = new Promise((resolve) => {
    H = resolve;
  });
  let Re = [];
  let Me = [];
  let Le = Object.create(null);
  let Ce = Object.create(null);
  let ye = {
    signal,
    getClients: () => r?.().mcp.clients ?? [],
    getSuppressedPluginServers: () => r?.().mcp.suppressedPluginMcpServers ?? [],
    applyMcpUpdate: (p) =>
      o((M) => {
        let v = p(M.mcp);
        return v === M.mcp
          ? M
          : {
              ...M,
              mcp: v,
            };
      }),
  };
  let Te = async (p) => {
    let M = identityEpoch();
    let v = await he(p);
    let config = le[p];
    let A = v?.client ?? {
      type: "failed",
      name: p,
      config,
      error: v?.error ?? "Connection failed",
    };
    let ee;
    try {
      ee = applyConnectionResult(ye, {
        client: A,
        tools: v?.tools ?? [],
        commands: v?.fetched?.cmds ?? [],
        attemptEpoch: v?.dialEpoch ?? M,
      });
    } catch (error) {
      if (A.type === "connected")
        mcpClientModule_5()
          .detachAndCloseConnection(A)
          .catch(() => {});
      throw error;
    }
    Ce[p] = {
      outcome: ee,
      client: A,
      refusedAs: ee === "refused" ? refusalStateFor(p, A) : undefined,
    };
    if (v?.fetched) {
      let res = v.fetched.res;
      ye.applyMcpUpdate((pe) => {
        if (pe.clients.find((client) => client.name === p) !== A) return pe;
        return {
          ...pe,
          resources: {
            ...pe.resources,
            [p]: res,
          },
        };
      });
    }
    if (ee === "superseded") return;
    Re.push(A);
    Me.push(...(v?.tools ?? []));
    Le[p] = v?.dialEpoch ?? M;
  };
  let Ie = () => {
    Promise.all([
      pMap(Q.filter(ve), Te, {
        concurrency: mcpClientModule_5().getMcpServerConnectionBatchSize(),
      }),
      pMap(
        Q.filter((p) => !ve(p)),
        Te,
        {
          concurrency: mcpClientModule_5().getRemoteMcpServerConnectionBatchSize(),
        },
      ),
    ])
      .catch((error) => {
        logHandlerFailure(s, `${u}: mcp connect`, error);
        let error_2 = errorMessage(error);
        for (let v of Q)
          Ce[v] ??= {
            outcome: "applied",
            client: {
              type: "failed",
              name: v,
              config: le[v],
              error: error_2,
            },
          };
        ye.applyMcpUpdate((v) => ({
          ...v,
          clients: v.clients.map((client) =>
            client.type === "pending" &&
            _e.has(client.name) &&
            mcpClientModule_5().areMcpConfigsEqual(client.config, le[client.name])
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
        H({
          names: [..._e],
          clients: Re,
          tools: Me,
          dialEpochs: Le,
        });
        if (findReusableClients(le, ye).length > 0)
          retryRemoteMcpServers(le, ye, E).catch((error) => logHandlerFailure(s, `${u}: mcp retry`, error));
      });
  };
  if (S) {
    ge.push(...Q);
    setImmediate(Ie);
    return {
      response: {
        added: ge,
        removed: me,
        errors: ce,
      },
      newState: O,
      deferredSettle: promise,
    };
  }
  if (x) {
    let dynamicMcpState = x.getDynamicMcpState();
    let M = {
      ...dynamicMcpState,
      clients: [...dynamicMcpState.clients.filter((client) => !R.has(client.name)), ...mapped],
      tools: dynamicMcpState.tools.filter(
        (tool) => !mapped_2.some(([T, A]) => isToolFromMcpServer(tool, T, A)),
      ),
      configs: re,
    };
    x.setDynamicMcpState(M);
  }
  Ie();
  let zt = await promise;
  ge.push(...Q);
  for (let p of Q) {
    let M = Ce[p];
    if (!M) continue;
    if (M.outcome === "refused") {
      if (M.refusedAs) ce[p] = describeMcpServerStatus(M.refusedAs);
    } else if (M.outcome === "applied" && M.client.type === "failed")
      ce[p] = describeMcpServerStatus(M.client);
    else if (M.outcome === "superseded") {
      let found = r?.().mcp.clients.find((client) => client.name === p);
      if (
        found?.type === "failed" &&
        found.errorCode === "IDENTITY_CHANGED" &&
        mcpClientModule_5().areMcpConfigsEqual(found.config, le[p])
      )
        ce[p] = describeMcpServerStatus(found);
    }
  }
  return {
    response: {
      added: ge,
      removed: me,
      errors: ce,
    },
    newState: buildMcpStatusList(O, zt, r?.().mcp.clients),
  };
}
//@ chunk-nkdv7dw8.js:20914-21884 fingerprint = reconcileMcpServers (0.344)
/**
 * reconcileMcpServers：比较期望与现有 MCP 配置，替换变化的连接。
 */
async function reconcileMcpServers(e, n, o, s, r, u, S, storageV5, credentials, getOwnedConfigs) {
  let D = Object.create(null);
  let x = Object.create(null);
  if (n !== undefined) {
    await awaitMcpPolicyColdStart({
      hasDynamicMcpConfig: true,
    });
    let I = Object.create(null);
    I[e] = n;
    if (Object.hasOwn(filterMcpServersByPolicy(I).allowed, e)) D[e] = n;
    else x[e] = IGNORED_BY_ENTERPRISE_POLICY_TEXT;
  }
  let mcpPrefix = getMcpPrefix(e);
  let L = (tool) => isToolFromMcpServer(tool, e, mcpPrefix);
  let q = (dynamicMcpState) => {
    let U = emptyServerMap();
    let z = dynamicMcpState.configs[e];
    if (Object.hasOwn(dynamicMcpState.configs, e) && z !== undefined) U[e] = z;
    return {
      configs: U,
      clients: dynamicMcpState.clients.filter((client) => client.name === e),
      tools: dynamicMcpState.tools.filter(L),
    };
  };
  let B = (newState) => {
    let dynamicMcpState = s.getDynamicMcpState();
    let z = emptyServerMap();
    for (let [key, value] of Object.entries(dynamicMcpState.configs)) if (key !== e) z[key] = value;
    let J = newState.configs[e];
    if (Object.hasOwn(newState.configs, e) && J !== undefined) z[e] = J;
    s.setDynamicMcpState({
      configs: z,
      clients: [...dynamicMcpState.clients.filter((prev) => prev.name !== e), ...newState.clients],
      tools: [...dynamicMcpState.tools.filter((tool) => !L(tool)), ...newState.tools],
    });
  };
  let F = await reconcileMcpServersImpl(
    D,
    q(s.getDynamicMcpState()),
    r,
    S,
    u,
    o,
    false,
    false,
    undefined,
    storageV5,
    credentials,
    {
      getDynamicMcpState: () => q(s.getDynamicMcpState()),
      setDynamicMcpState: B,
    },
    undefined,
    undefined,
    undefined,
    getOwnedConfigs,
  );
  B(F.newState);
  return {
    ...F.response,
    errors: {
      ...x,
      ...F.response.errors,
    },
  };
}
//@ chunk-18hwfzwa.js:810094-810309 fingerprint = trackReceivedMessageUuid (0.591)
function trackReceivedMessageUuid(h, x) {
  let D = new Set();
  for (let { id, tokenCount } of x) {
    D.add(id);
    let ke = h.get(id);
    if (!ke) h.set(id, (ke = []));
    ke.push(tokenCount);
    if (ke.length > SIDE_QUESTION_MAX_AGENTS) ke.splice(0, ke.length - SIDE_QUESTION_MAX_AGENTS);
  }
  for (let key of h.keys()) if (!D.has(key)) h.delete(key);
}
export {
  removeInterruptedMessage,
  finalContextTokensFromLastResponse,
  trackReceivedMessageUuid,
  controlSuccessResponse,
  controlErrorResponse,
  isImmediateInterruptRequest,
  emitLoadError,
  canBatchWith,
  assistantTurnKeys,
  getStructuredIO,
  handleOrphanedPermissionResponse,
};
