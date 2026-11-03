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
} from "crypto";
import { cwd } from "process";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  sep,
  dirname,
} from "path";
import {
  open,
  open as open_2,
  open as open_3,
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
} from "fs/promises";
import {
  rowsSinceTurnStart,
  isQueuedPromptAnswered,
  answeredHeldUuids,
  runningTurnSendsForTurn,
} from "./print/transcriptChain.js";
import { logError, getInMemoryErrors, logMCPDebug } from "../utils/log.js";
import { isCompactBoundaryMessage, Us, Qbe, Kfe, mZn } from "../services/projects/threadRows.js";
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
  hasToolResultBlock,
  wJo,
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
  elapsedMs,
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
import { getRemoteFlagOverrideState, jSt } from "../utils/permissions/yoloClassifier.js";
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
import { R_i, x_i } from "../tools/AgentTool/backgroundGates.js";
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
  Zoe,
  Jbt,
  bet,
  b3n,
  det,
  T3n,
  runFirstPluginsSync,
  ese,
  cqs,
  rerunPluginsSync,
  eN,
} from "../utils/claudeAiSync/skillsSync.js";
import { lLe, rDs, tDs, reloadSyncedSkills } from "../services/skillsSync/skillsSync.js";
import { call } from "../commands/login/login.js";
import { settingsChangeDetector } from "../utils/settings/changeDetector.js";
import {
  Zwi,
  getFastModeState,
  getFastModeUnavailableReasonCode,
  getFastRejectedReason,
  onOrgFastModeChange,
  onFastRejectedFallbackModelsChanged,
  isFastModeEnabled,
  Qwi,
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
import { Br, nyi, lyi, oyi } from "../utils/startupTiming.js";
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
  BNt,
  aQe,
  jDs,
  WDs,
  rewindRequestAge,
  serviceClockStoredAt,
} from "./remoteIO/turnHandoff.js";
import { env } from "../utils/env.js";
import {
  Zk,
  Wx,
  fa,
  Gx,
  lazyPrintModules2,
  ic,
  Qs,
  getMcpClientModule,
  qx,
  MCP_CALL_RESULT_LIMITS,
  wz,
  TEAM_SHUTDOWN_REMINDER,
  teamTeardownParkTimeoutMs,
  isTeamShutdownReminder,
  sg,
  rg,
  sU,
  vz,
  zx,
  lazyPrintModules,
  gz,
  isMcpCallResultTooLarge,
  Kx,
  getMcpErrorClassificationModule,
  getMcpAuthModule,
  PRINT_TIMING_CONSTANTS,
  kz,
  TENGU_ANCHORED_LANTERN,
  bl,
  sc,
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
import { _wn, jy } from "../utils/udsMessaging/peerGuard.js";
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
import { mn, workingSyncAdmission, op, vS } from "../utils/remoteEnvironment.js";
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
import { S1 } from "../utils/userDataRoots.js";
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
  QP,
  By,
  waitForHomeFilesFlag,
  isDefaultModelRefusedByPolicy,
} from "./_new/UnattendedStartRecord.js";
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
import { i8n, Z_e, Fet, v8n } from "../utils/permissions/permissionPromptHost.js";
import { SandboxManager, isToolSandboxActive } from "../utils/sandbox/sandbox-adapter.js";
import { wZt, reportSandboxErrorUnderStandIn } from "../utils/sandbox/sandboxErrors.js";
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
  ym,
  SESSION_NOT_FOUND_MESSAGE,
} from "./print/controlRequestMisc.js";
import { applyPermissionAnswerChanges } from "../utils/permissions/permissionAnswer.js";
import { profileCheckpoint, addStartupContext } from "../utils/startupProfiler.js";
import { createDependencyWatcher, isUsageLimitDenialStale, den, $Lt } from "./print/rewindStandIn.js";
import { warnOfDeniesOnAnotherHostOnStderr } from "../utils/sandbox/deniesOnAnotherHost.js";
import { Spe } from "../services/plugins/accountSync/syncedPluginHooks.js";
import { ptt, zE, sN, WZ, serializeModelSwitch } from "../utils/model/modelSwitchHooks.js";
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
  ap,
} from "./print/taskListRestore.js";
import {
  createIngressReadiness,
  isUnhandledIngressType,
  classifyInboundLane,
  resolveInboxWakeFor,
  ZDs,
  awaitGrowthBookSettled,
  ingressPromptContent,
  sLs,
  gEo,
  resolveIngressOrigins,
  isUserTypedTurn,
  relayMessageMeta,
  logProjectsRelayAdmission,
  iLs,
  aLs,
  prepareCloudBrowserTurn,
  admitCloudBrowserTurnId,
  zPr,
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
import { Yze } from "../tasks/McpTask/mcpTaskEndings.js";
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
import { TENGU_WITTY_KAY, pRe, TENGU_GOOFY_HARE, TENGU_WONDROUS_HAVEN } from "../services/api/withRetry.js";
import { dedupeTasksById, UDs, isCcrSubagentSkipOnDeltaGateOn, HPr } from "./remoteIO/gates.js";
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
import { formatOrphanSummary, _As } from "../tasks/resumeOrphanedTasks.js";
import { restoreRemoteAgentTasks } from "../tasks/RemoteAgentTask/RemoteAgentTask.js";
import {
  restoreDeclaredDialogKinds,
  getResumeLaneOptions,
  resolveResumeInterruption,
  findUnresolvedToolUseOnAPrunedBranch,
  gS,
  planServedCallAdoption,
  createUnresolvedToolUseFinder,
  buildOrphanedPermissionPrompt,
  createElicitationRegistrar,
  cA,
  createSdkUserDialogHandler,
  cancelPendingUserDialogs,
  isTerminalTitleSuppressed,
  cancelDialogsOnNewPrompt,
  declareSdkDialogKinds,
} from "./_new/createElicitationRegistrar.js";
import {
  restoreMemoryToggle,
  restoreExcludeDynamicSections,
  restoreProactivityOptIn,
  Am,
  Oz,
  Yx,
  buildUltrareviewMessages,
  applyInitializeProactivity,
  Pz,
} from "./_new/restoreProactivityOptIn.js";
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
  KPs,
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
import { qjr, Xjr, z5s } from "../utils/permissions/serverClassifier/fallbackNotice.js";
import { y4s } from "../utils/permissions/serverClassifier/arbiter.js";
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
import { xo } from "../bootstrap/sessionSlices.js";
import { resolvePhysicalCwd } from "../utils/Shell.js";
import {
  UnseenPanelModInputHold,
  waitBeforeInitializeReply,
  runImmediateSlashCommand,
} from "./print/immediateCommands.js";
import { vk, ul, $tr, showPane, focusPane, hxe, closePane } from "../plugins/functionHooks/panes.js";
import { McpConnectionStore } from "../services/mcp/mcpConnectionStore.js";
import { PluginsStateStore } from "../utils/plugins/pluginLoadStatus.js";
import { fNt, ComputerUseStateCell } from "../utils/computerUse/computerUseMcpState.js";
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
  nBo,
  tailDiagnosticsFields,
  v5s,
  Ijr,
  loadConversationForResume,
} from "../utils/conversationRecovery.js";
import { uN, resetCostState, setCostStateForRestore } from "../cost-tracker.js";
import { isTidySlothGateOn } from "../tasks/LocalShellTask/backgroundNotices.js";
import {
  releaseStartupWork,
  yieldStartupWorkToTurn,
  expectStartupHandshake,
} from "./startup/startupWorkGate.js";
import { isTerminalShutdown, latchTerminalShutdown, heldUntilExit } from "../utils/terminalShutdown.js";
import { hasBatchableQueuedPrompt, TurnDispatcher, isBusyOrClosed, isBusy } from "./print/turnDispatch.js";
import { ccrLostCallsNote, awaitPendingPermissionAnswers, Qh } from "./print/permissionAsks.js";
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
import { bVe, im, Y3n, textNotTypedFlags, Ffe } from "../utils/messageQueueManager.js";
import {
  createFetchHoldRegistry,
  filesRefetchMode,
  plannedFilePrompt,
  holdForFilesRefetch,
  refetchUserMessageFiles,
  fetchUserPromptFiles,
} from "./print/userPromptFiles.js";
import { Nli, markMessagesRead } from "../bridge/readReceipts.js";
import {
  watchCommentWakeLifecycle,
  reportCommentWakesStarted,
  parseTriggerWebhookPayload,
  claudeDocCommentPrompt,
  reportDurableCommentWake,
} from "./print/triggerPayloads.js";
import {
  rCo,
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
import { Z0n } from "../utils/cronResume.js";
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
import { setCurrentForKey, bUt } from "../utils/currentRefByKey.js";
import {
  shouldForwardSubagentMessage,
  Ebe,
  appendRowsWithHooks,
  extractReadFilesFromMessages,
  Mwt,
} from "../utils/queryHelpers.js";
import { useShimmerAnimation } from "../components/Spinner/useShimmerAnimation.js";
import {
  toExternalPermissionMode,
  isExternalPermissionMode,
  sessionMetadataToAppState,
} from "../utils/permissions/PermissionMode.js";
import { f3n } from "../utils/ShellCommand.js";
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
  _Le,
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
import { ZC, nv, __ } from "../utils/remoteFileState.js";
import { isResumeFrameSeedEligible } from "../services/artifacts/artifactToolGates.js";
import {
  applyArtifactResumeCarry,
  collectResumeArtifactCarry,
} from "../tools/ArtifactTool/artifactResumeCarry.js";
import { rearmHeadlessCommentMonitors } from "../services/artifacts/commentMonitorResume.js";
import { ask, QueryEngine } from "../QueryEngine.js";
import { informationalSystemMessage } from "./print/sdkMessageStream.js";
import { Bis } from "../utils/telemetry/memorySummary.js";
import { InstanceRegistry } from "../utils/instanceRegistry.js";
import { zti } from "../services/remoteTools/backgroundCommands.js";
import { efe } from "../memdir/findRelevantMemories.js";
import {
  _tt,
  findIsolationLatchFromHistory,
  DEFAULT_EXEMPT_SERVERS,
  addExemptServers,
  g3s,
} from "../services/tools/webToolIsolation.js";
import { kAe } from "../tools/BashTool/androidCommands.js";
import { devIntentTracker } from "../services/projects/devIntent.js";
import { buildModelPickerOptions, getUnavailableModelRows } from "../utils/model/modelOptions.js";
import { JPs } from "../utils/model/refusalFallback.js";
import {
  Okr,
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
import { qM } from "../utils/startupFlagWait.js";
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
  _O,
  hO,
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
import { runPreModelSwitchHooks, describeModelSwitchBlocked, Nf } from "../commands/model/modelSwitch.js";
import {
  seedBridgeEffortLevel,
  reportEffortForModel,
  M_e,
  applyBridgeFlagSettings,
  w6n,
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
  ir,
  G6o,
  Npe,
  A4e,
  McpAuthError,
  McpSessionExpiredError,
} from "../services/mcp/client.js";
import {
  toolNameForTelemetry,
  copyCcrMarks,
  filterObject,
  markCcrInjectedConfig,
  copyOwnServerMarks,
  OPt,
} from "../services/analytics/metadata.js";
import {
  Y2e,
  filterCommandsByServer,
  excludeCommandsByServer,
  commandBelongsToServer,
  isMcpTool,
  removeMcpClientsWhere,
  isDeclaredUnderOtherWorkspaceRoot,
  isStdioConfig,
  spt,
} from "../services/mcp/utils.js";
import {
  applyMcpReconnect,
  resolveReconnectConfig,
  reconnectMcpOnIdentityChange,
  watchMcpDisconnects,
  createReconnectBackoff,
  RCs,
  markServerDisabled,
  refusalStateFor,
} from "../services/mcp/mcpReconnect.js";
import { identityEpoch, setIdentityTrippedHandler, V4n, uzs } from "../services/mcp/identityChange.js";
import { IM, fd } from "../services/mcp/mcpAccountKey.js";
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
import { R_t, identityChangedFailure, isRemoteMcpTransport } from "../services/mcp/discoveryIdentity.js";
import { sanitizeTelemetryString, sanitizeRelayUrl, formatElicitationUrls } from "../utils/sanitization.js";
import { Zl, ht } from "../services/mcp/cliOwnedClients.js";
import { applyMcpServerConfig } from "../components/mcp/MCPListPanel.js";
import { primeDiscoveryCacheFlag } from "../services/mcp/elicitationDialogs.js";
import { REAUTH_RECONNECT_SIGNAL } from "../services/mcp/connectionFlags.js";
import { isCommsRoledServer } from "../coordinator/coordinatorMcpServers.js";
import {
  X1n,
  isPersistenceTrusted,
  Fce,
  gLs,
  vEo,
  EEo,
  uLs,
  jgt,
  shouldRejectUiControl,
  leavesBelowFloor,
  manifestsDisabledReason,
  yLs,
  uiSurfaceCapabilities,
  uiHookedCapabilities,
} from "./sdkMcpManifests.js";
import { uniq, uniqBy, count } from "../utils/collections.js";
import { setupVscodeSdkMcp } from "../services/mcp/vscodeSdkMcp.js";
import { Eir } from "../services/api/safeguardMessages.js";
import { isRefusalFallbackEnabled } from "../services/api/refusalFallback.js";
import { getNextAnnouncementJson } from "../services/startupAnnouncements.js";
import { handleAutoDefaultNudgeEventFromHost, shouldShowAutoDefaultNudge } from "./print/autoDefaultNudge.js";
import { getOwn } from "../utils/objectSafety.js";
import {
  partitionOperatorServers,
  OPERATOR_SUPPLIED_IGNORED_TEXT,
  isAlwaysKeptServer,
} from "../services/mcp/mcpConfigProvenance.js";
import { QRe } from "../services/memorySync/memorySkills.js";
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
import { Zir } from "../utils/focusMode.js";
import { hasLspEverConnected } from "../services/lsp/manager.js";
import { ftt } from "../tools/WaitForMcpServersTool/WaitForMcpServersTool.js";
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
import { TXs, shouldStampThreadState } from "../utils/projectsThreadState.js";
import { resolveHearthToolNames, CLAUDE_CODE_REMOTE } from "../services/mcp/ccrMetaMcp.js";
import { latestHumanRelayAt, threadAskMarkerFor } from "../services/projects/threadTranscript.js";
import { kGr, createStagedFilesWaiter, K1o, classifyStageWriteError } from "../utils/ccrStageFiles.js";
import { isToolResultForToolUse, Jvt } from "../utils/messages/messagePredicates.js";
import { makeStoreConfirmTimer } from "../utils/queryProfiler.js";
import {
  mCs,
  yCs,
  filterServersForScope,
  _Cs,
  sanitizeMcpResourceError,
  uCs,
  sanitizeMcpStatusMap,
  describeMcpServerForStatus,
  BUILTIN_SERVER_IGNORED_REASON,
  nt,
  zNn,
  et,
  ze,
  Fe,
  tt,
  $e,
  buildMcpStatusList,
  Xe,
  X,
  Pe,
} from "./print/mcpControlRequests.js";
import { isManagedConfigScope, isPluginServerConfig } from "../services/mcp/types.js";
import { pot } from "../services/mcp/fileReference/fileReferencePolicy.js";
import { collectContextData } from "../commands/context/context-noninteractive.js";
import { waitForAgentTranscriptFlush, B0n } from "../tasks/LocalAgentTask/transcriptFlush.js";
import {
  createRemotePromptBox,
  createRemoteSelectionReader,
  f$i,
  tgn,
  a2r,
  u$i,
  setUiLogSink,
  listPlacedRows,
  g$i,
} from "../plugins/functionHooks/uiApi.js";
import {
  REMOTE_EDIT_QUEUE,
  pruneDetachedClients,
  describePanesForClient,
  REMOTE_AUTOCOMPLETE,
  handlePaneScrollRequest,
} from "./print/remoteComposer.js";
import { gfn } from "../plugins/functionHooks/uiToast.js";
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
import { K$o, release, attachedSurfaces } from "../plugins/functionHooks/surfaceBinding.js";
import { kWo } from "../plugins/functionHooks/modelApi.js";
import { xBn, reportQueuedSubmissions } from "../utils/hooks/postSamplingHooks.js";
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
  detachAllClients,
  raiseViewerAbsence,
  Vpo,
  ypt,
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
  kCs,
  handleSendTaskMessage,
  reclaimSessionNameAtStart,
} from "./print/sessionControlRequests.js";
import { getLastCacheSafeParams, IGt } from "../utils/forkedAgent.js";
import { contextAfterTurn, getToolPermissionContext } from "../utils/permissions/toolPermissionContext.js";
import { ResumedAgentCallRegistry } from "../tools/AgentTool/agentContainerResume.js";
import {
  waitForRemoteManagedSettingsFetchToSettle,
  waitForRemoteManagedSettingsToLoad,
} from "../services/remoteManagedSettings/loader.js";
import { zRi } from "../utils/settings/policyHelper/helperRemote.js";
import { onLastLoadStatusChanged } from "../services/remoteManagedSettings/remoteSettingsState.js";
import { zye, refreshActivePlugins } from "../utils/plugins/refresh.js";
import { installPluginsForHeadlessSerialized } from "../utils/plugins/headlessPluginInstall.js";
import { bz } from "../commands/plugin/PluginSettings.js";
import { getSessionIngressAuthToken, getSessionIngressAuthHeaders } from "../utils/sessionIngressAuth.js";
import { ao } from "../bridge/bridgeHostState.js";
import { isToolSearchToolAvailable } from "../utils/toolSearch.js";
import { oni } from "../bridge/attachmentFilesWait.js";
import { createIdleTimeoutManager } from "../utils/idleTimeout.js";
import { getNonInteractiveCommands, mergeClients as mergeClients_2 } from "../utils/commandPredicates.js";
import { loadAllPluginsCacheOnly } from "../utils/plugins/pluginLoader.js";
import { isConnectedOrCached } from "../skills/bundled/scheduleRemoteAgents.js";
import { waitForStoreState } from "../context/voice.js";
import { marketplaceSuffix, parsePluginIdentifier_2 } from "../utils/plugins/pluginIdentifier.js";
import { SYNCED, dpe } from "../utils/telemetry/pluginTelemetry.js";
import { normalizeNameForMCP } from "../services/mcp/normalization.js";
import { L_e } from "../utils/parseIsoTimestamp.js";
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
import { Yue } from "../plugins/functionHooks/pluginLifecycle.js";
import { installDevModsPlaceholderExpander } from "../services/plugins/devMods/devModsWatcher.js";
import { fue, reloadSkillsAfterDirectoryChange } from "../utils/skills/skillChangeDetector.js";
import { getManagedFilePath } from "../utils/settings/managedPath.js";
import { W1 } from "../plugins/functionHooks/sites/promptContextSites.js";
import { managedSettingsAskState } from "./headlessCloud/attachServe.js";
import { I3 } from "../skills/bundledSkillsGate.js";
import {
  didPolicyLimitsColdStartTimeOut,
  waitForPolicyLimitsToLoad,
} from "../services/policyLimits/PolicyLimitsClient.js";
import { render } from "../plugins/functionHooks/ui/renderBridge.js";
import { FFo } from "../components/PromptInput/promptFlags.js";
import { Q_e, kT, t6s, B9n } from "../services/tools/detachedToolCalls.js";
import { mzn } from "../services/artifacts/presenceSocket.js";
import {
  Hx,
  Nx,
  lz,
  dz,
  LOGIN_BLOCKED_MESSAGES,
  Bx,
  iz,
  az,
  validateUpdateSettings,
  EFFORT_LEVEL_ERROR,
} from "./print/updateSettingsControl.js";
import { cancelPendingAsyncHooks } from "../utils/hooks/AsyncHookRegistry.js";
import { drainQueuedMessages } from "../skills/bundled/updateConfig.js";
import { Gvt, Yqo } from "../tools/shared/gitOperationTracking.js";
import { R1r } from "../utils/api.js";
import { messageTurnAttributionKey, turnAttributionKeyOf, GRn } from "../utils/turnAttributionKey.js";
import { H4s, L4s, t8n } from "../services/mcp/ccrTurnId.js";
import { DRn } from "../utils/http.js";
import { withInteractionSpan, endInteractionSpan } from "../utils/telemetry/sessionTracing.js";
import { activityManager } from "../utils/activityManager.js";
import { settleOwedTitle, retractPendingTitle, maybeTitleFromUserMessage } from "./print/sessionTitles.js";
import { maybeStartCcrRecap, aCo, rFs, oFs } from "../services/awaySummary.js";
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
import { nXs } from "../tools/FileReadTool/FileReadTool.js";
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
import { a9n } from "../utils/promptSource.js";
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
import { c_s, ye } from "../utils/startupMarks.js";
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
import { parseHostManifests, yBn } from "../services/mcp/toolsListChanged.js";
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
  ejn,
  getFooterIndicator,
  MCP_CALL_RESULT_NOT_FOR_MODEL_V1,
  START_SHELL_TASK_V1,
} from "../utils/messages/systemInit.js";
import { R7 } from "../remote/wireFrameShape.js";
import { expandPath } from "../utils/path.js";
import { NF, cH } from "../utils/permissions/pathVetting.js";
import { isPathAllowed } from "../utils/permissions/pathValidation.js";
import { isNonEmptyValue } from "./cloudSession/hostedSessionRestrictions.js";
import { isCloudPluginForwardingFlagOn } from "../services/analytics/violinGates.js";
import { or } from "../utils/settings/commandSyncNames.js";
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
import { claudeAiConnectorAuthUrl, requiresConnectorGrant } from "../services/mcp/claudeai.js";
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
import { wqn } from "../state/artifactReadState.js";
import {
  PCs,
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
import { KMr } from "../state/appStateSetters.js";
import { isTeleportedSession } from "../bridge/createSession.js";
import { REMOTE_CONTROL_SDK } from "../bridge/sessionOrigins.js";
import { forwardRateLimitToBridge, logBridgeRateLimitForward } from "./print/rateLimitForwarding.js";
import {
  extractInboundMetadata,
  nEn,
  classifyInboundOrigin,
  refineInboundOrigin,
  qsr,
  hasTeammateMessageEnvelope,
  adjustInboundPriority,
  awe,
  Die,
  ost,
  wdi,
  Zqt,
  isPeerOrigin,
  Vsr,
  tEn,
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
import { SQ, peerMessageInfo } from "../utils/peerMessageHeaders.js";
import { backgroundTaskByToolUseId, backgroundAll } from "../tasks/LocalShellTask/LocalShellTask.js";
import { setInboundAvailabilityPublisher } from "../utils/crossSessionInbound/inboundMode.js";
import { aW } from "../utils/sessionTagRefresh.js";
import { sNn, vAs } from "./print/turnStreaming.js";
import { ENUM_PROMPT } from "../components/nudges/nudgeIds.js";
import { toInternalMessages } from "../utils/messages/mappers.js";
import { e5s, checkEmailSenderTurn } from "../utils/permissions/emailSenderFrame.js";
import { oUo } from "../plugins/functionHooks/sessionHooks.js";
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
import { y3s } from "./printUsageSummary.js";
import { isHumanOrigin, A8t } from "../utils/turnOrigin.js";
import { startupCcrEnv } from "../tasks/RemoteAgentTask/remoteAgentKinds.js";
import { xLs, buildNoApprovalSurfaceDenial, lIr } from "../services/pushNotifications/permissionPush.js";
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
import { VUi } from "../utils/pathTable.js";
import { DEFAULT, getAllOutputStylesCached } from "../constants/outputStyles.js";
import { H6s } from "../outputStyles/loadOutputStylesDir.js";
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
import { Yn } from "../utils/stripAnsi.js";
import { withTaskSuffix } from "../tasks/endedByModel.js";
import { loe } from "../utils/lastResumeRecord.js";
import { readFlagWithOverride } from "../services/analytics/flagOverrides.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { reportStartupModelNotice } from "./startup/prepareSession.js";
import { precomputeResumeHooks } from "../services/compact/precomputedCompact.js";
import { resolveResumeSessionAdoption } from "../utils/background/adopt.js";
import { cloudSessionsUnavailableReason } from "../services/cloudSessions/cloudSessionsPolicy.js";
import { logOrgPolicyDeniedAsync } from "../services/policyLimits/orgPolicyDeniedEvent.js";
import { parseSessionIdentifier } from "../utils/sessionUrl.js";
import { Qoe, _et } from "../utils/transcript/transcriptFiles.js";
import { o4s } from "../utils/generators.js";
import { isReviewSession } from "../utils/sessionAccessToken.js";
import { rereadSessionIngressToken } from "./transports/sessionIngressToken.js";
import { Ji } from "../../vendor/lodash-es/uniqBy.js";
import { Vt } from "../utils/agentId.js";
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
import { H5 } from "../services/mcp/skillDirectoryResource.js";
import { pMap } from "../../vendor/p-map/index.js";
import { XJe } from "../components/PromptInput/AgentsPill.js";

/**
 * headless 会话：返回一个惰性函数，算出停放（被打断）轮次已收进的发送消息 uuid 集合。旧版名 calculateMessagesToKeepIndex 为错配，属于 cli/print 的轮次停放逻辑。
 */
//@ chunk-tyg7f3ek.js:50315-50620 placement = calculateMessagesToKeepIndex (0.415)
function getParkedTurnSendUuids(e, n, r) {
  let s = [];
  try {
    s = rowsSinceTurnStart(e, n);
  } catch (error) {
    logError(error);
  }
  return () => {
    try {
      let h = s[0];
      if (h === void 0 || (r === void 0 ? !isCompactBoundaryMessage(h) : h.uuid !== r)) return new Set();
      let idx = s.slice(0, -1).findLastIndex((R) => isSyntheticApiErrorMessage(R) || isInterruptMarkerRow(R)),
        msgTokens = heldUuidsIfEnabled(s.slice(idx + 1));
      return new Set(
        [...heldUuidsIfEnabled(s)].filter((R) => msgTokens.has(R) || isQueuedPromptAnswered(s, R)),
      );
    } catch (error) {
      return (logError(error), new Set());
    }
  };
}
//@ chunk-tyg7f3ek.js:127589-127752 fingerprint = getStructuredIO (0.513)
function getStructuredIO(inputPrompt, options) {
  return {
    type: "user",
    message: { role: "user", content: options },
    session_id: inputPrompt,
    parent_tool_use_id: null,
    uuid: randomUUID_4(),
    timestamp: new Date().toISOString(),
    isReplay: !0,
  };
}
//@ chunk-tyg7f3ek.js:375915-378573 fingerprint = handleOrphanedPermissionResponse (0.458)
async function handleOrphanedPermissionResponse({
  message: message,
  setAppState: setAppState,
  onEnqueued: onEnqueued,
  handledToolUseIds: handledToolUseIds,
  findUnresolved: findUnresolved,
  messageQueue: messageQueue,
  siblings: siblings,
  messageRows: messageRows,
  notSent: notSent,
  note: note,
  initFirst: initFirst,
  resumesInterruptedTurn: resumesInterruptedTurn,
  cardInput: cardInput,
  startedBy: startedBy,
  interruptedTurnEcho: interruptedTurnEcho,
  ccrTurnId: ccrTurnId,
  dropContext: dropContext,
  enqueueContext: enqueueContext,
  denyIsRefusal: denyIsRefusal = isPermissionCardHoldEnabled(),
}) {
  let nt = (ie, Se) => (
    logForDiagnosticsNoPII("warn", "cli_orphan_answer_dropped", () => ({
      ...dropContext?.(Se),
      reason: ie,
      ...flagKey("reason", ie),
      ...getRiskColor(message),
    })),
    !1
  );
  if (
    message.response.subtype === "success" &&
    message.response.response?.toolUseID &&
    typeof message.response.response.toolUseID === "string"
  ) {
    let permissionResult = message.response.response,
      { toolUseID: toolUseID } = permissionResult;
    if (!toolUseID) return nt("no_tool_use_id");
    if (
      (logForDebugging(
        `handleOrphanedPermissionResponse: received orphaned control_response for toolUseID=${toolUseID} request_id=${message.response.request_id}`,
      ),
      handledToolUseIds.has(toolUseID))
    )
      return (
        logForDebugging(
          `handleOrphanedPermissionResponse: skipping duplicate orphaned permission for toolUseID=${toolUseID} (already handled)`,
        ),
        nt("already_handled", toolUseID)
      );
    let assistantMessage = await findUnresolved(toolUseID);
    if (!assistantMessage)
      return (
        logForDebugging(
          `handleOrphanedPermissionResponse: dropping orphaned control_response for toolUseID=${toolUseID} \u2014 no unresolved tool_use found`,
          { level: "warn" },
        ),
        nt("not_unresolved", toolUseID)
      );
    if (handledToolUseIds.has(toolUseID))
      return (
        logForDebugging(
          `handleOrphanedPermissionResponse: dropping orphaned permission for toolUseID=${toolUseID} \u2014 handled while its transcript read was in flight`,
        ),
        nt("handled_during_read", toolUseID)
      );
    let Me = Array.isArray(assistantMessage.message.content)
      ? assistantMessage.message.content.find((Mn) => Mn.type === "tool_use" && Mn.id === toolUseID)
      : void 0;
    if (Me?.type === "tool_use") {
      let response = message.response.response;
      if (permissionResult.behavior === "deny" && denyIsRefusal) {
        if (isDifferentString(response?.toolName, Me.name) || isDifferentString(response?.tool_name, Me.name))
          permissionResult = unmatchedAnswerDenial(toolUseID);
      } else if (isValidBridgeToolName(response?.toolName, Me.name, message.response.request_id))
        return nt("name_mismatch", toolUseID);
    }
    (handledToolUseIds.add(toolUseID),
      logForDebugging(
        `handleOrphanedPermissionResponse: enqueuing orphaned permission for toolUseID=${toolUseID} messageID=${assistantMessage.message.id}`,
      ));
    let Ee = initFirst?.(assistantMessage, toolUseID) === !0,
      He = resumesInterruptedTurn?.() === !0,
      Xe = note?.(toolUseID),
      We = siblings?.(),
      St = messageRows?.(),
      wt = startedBy?.markOf(toolUseID),
      Lt = notSent?.(),
      pn = ccrTurnId?.(),
      _n = getRemoteFlagOverrideState(TENGU_WILD_BEACON);
    return (
      messageQueue.enqueue({
        mode: "orphaned-permission",
        agentId: mainAgentId(),
        value: [],
        keepsDisallowedTools: !0,
        ...(wt !== void 0 && { startedBy: wt }),
        ...(_n === "on" && { skipSubmissionHooks: !0 }),
        ...interruptedTurnEcho,
        orphanedPermission: {
          permissionResult: permissionResult,
          assistantMessage: assistantMessage,
          ...(pn !== void 0 && { ccrTurnId: pn }),
          ...(denyIsRefusal && { denyIsRefusal: !0 }),
          ...(Ee && { initFirst: !0 }),
          ...(He && { resumesInterruptedTurn: !0 }),
          ...(cardInput !== void 0 && { cardInput: cardInput }),
          ...(We !== void 0 && We.length > 0 && { siblings: We }),
          ...(St !== void 0 && St.length > 0 && { messageRows: St }),
          ...(Lt !== void 0 && Lt.length > 0 && { notSent: Lt }),
          ...(Xe !== void 0 && { note: Xe }),
        },
      }),
      startedBy?.queued(toolUseID),
      onEnqueued?.(),
      logForDiagnosticsNoPII("info", "cli_orphan_answer_enqueued", () => ({
        ...enqueueContext?.(toolUseID),
        ...getRiskColor(message),
        ...(_n !== "off" && { prompt_check_skip_flag: _n, ...flagKey("prompt_check_skip_flag", _n) }),
      })),
      !0
    );
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
/**
 * 是否可作为 result 前最后一条输出消息（排除 control_*、部分 system 子类型、流事件等）。
 */
//@ chunk-tyg7f3ek.js:627067-628650 sole-consumer
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
/**
 * 把启动阶段缓存的 SDK 事件转发到输出流，并订阅后续事件。
 */
//@ chunk-tyg7f3ek.js:628650-628732 sole-consumer
function registerStartupSdkEventForwarder(e) {
  let n = () => {
    for (let r of drainTaskNotifications()) e.write(r).catch(() => {});
  };
  (setTaskNotificationListener(n), n());
}
/**
 * runHeadless（-p 模式主函数）：建立输入输出（StructuredIO 或 RemoteIO）、沙箱初始化、加载初始消息（--continue/--resume）、驱动 runHeadlessStreaming，最后按 --output-format 输出：text 打印最终结果，json 输出 result 对象（--verbose 输出全部消息数组），stream-json 逐行已输出。退出码：结果 is_error 为 1。
 */
//@ chunk-tyg7f3ek.js:628732-652107 callgraph-witnessed = runHeadless (0.247)
async function runHeadless(e, n, r, s, h, y, S, R, w, P) {
  let startTime = performance.now();
  if (
    (R_i(sendSessionActivitySignal_2),
    x_i(sendSessionActivitySignal),
    surfaceManagedSettingsErrorsHeadless(),
    reportSettingsValidationErrors(P.outputFormat),
    Zoe(e))
  )
    lLe(e, P.storageV5, P.credentials);
  if (Jbt(e)) bet(e, P.credentials);
  function q(source) {
    call({ session: e, source: source, getAppState: r, setAppState: s, storageV5: P.storageV5 });
  }
  let advisorModel = r().advisorModel;
  if (advisorModel)
    (setFlagSettingsInline({ ...(getFlagSettingsInline() ?? {}), advisorModel: advisorModel }),
      settingsChangeDetector.notifyChange("flagSettings"));
  (settingsChangeDetector.subscribe(q),
    Zwi(r, s, P.storageV5),
    whenPolicyNotified(() => q("policySettings")),
    headlessProfilerStartTurn(),
    headlessProfilerCheckpoint("runHeadless_entry"),
    logEvent("tengu_timer", {
      event: lit("startup"),
      durationMs: Math.round(process.uptime() * 1000),
      mcpNonBlocking: getMcpConnectNonBlocking(),
      mcpClientCount: P.configuredMcpServerCount,
      resumed: !!(P.resume || P.continue),
    }),
    headlessProfilerCheckpoint("before_grove_check"));
  let startTime_2 = performance.now();
  if (await isQualifiedForGrove(P.storageV5, P.credentials))
    await checkGroveForNonInteractive(P.storageV5, P.credentials);
  if (
    (Br("grove_check_ms", performance.now() - startTime_2, startTime_2),
    headlessProfilerCheckpoint("after_grove_check"),
    initializeGrowthBook().catch((prev) => logError(toError(prev))),
    P.resumeSessionAt && !P.resume)
  ) {
    (process.stderr.write(`Error: --resume-session-at requires --resume
`),
      gracefulShutdownSync(1));
    return;
  }
  if (P.resumeDropsTurn !== void 0 && !P.resumeSessionAt) {
    (process.stderr.write(`Error: --resume-drops-turn requires --resume-session-at
`),
      gracefulShutdownSync(1));
    return;
  }
  if (P.rewindFiles && !P.resume) {
    (process.stderr.write(`Error: --rewind-files requires --resume
`),
      gracefulShutdownSync(1));
    return;
  }
  if (P.rewindFiles && n) {
    (process.stderr.write(`Error: --rewind-files is a standalone operation and cannot be used with a prompt
`),
      gracefulShutdownSync(1));
    return;
  }
  let Z = typeof n !== "string";
  (setHasStreamingInput(Z),
    markPrintPollEventWiring({
      hasStreamingInput: Z,
      sdkUrl: P.sdkUrl,
      permissionMode: r().toolPermissionContext.mode,
    }),
    setSingleShotPrintSession(deriveSingleShotPrintSession({ hasStreamingInput: Z, sdkUrl: P.sdkUrl })));
  let now = Date.now(),
    Ae,
    Ue = Boolean(P.sdkUrl) && process.env.CLAUDE_CODE_ENVIRONMENT_KIND !== "bridge";
  function ce(lt, In) {
    if (!Ue) return;
    ((Ae = lt),
      process.stderr
        .write(`SDKStartup: phase=${lt} t=${Math.round((Date.now() - now) / 100) / 10}s${In ? ` ${In}` : ""}
`));
  }
  let nt = turnHandoffAdmission({
      sdkUrl: Boolean(P.sdkUrl),
      remoteSessionId: env.CLAUDE_CODE_REMOTE_SESSION_ID,
      environmentKind: env.CLAUDE_CODE_ENVIRONMENT_KIND,
      disabled: env.CLAUDE_CODE_DISABLE_TURN_HANDOFF,
    }),
    ie =
      P.earlyRemoteLink?.usesRelayMarker ??
      shouldCarryWrites({
        admission: nt,
        relayConfigured: Zk !== null && Zk.getTeleportRelayEnvConfig() !== null,
        persistsTranscript: !isTranscriptPersistenceDisabled(),
        sharedBackend: isDiagLogging(),
      });
  await reportUserDataAttachments(P.sdkUrl);
  let Se = createStagedRowTracker();
  ce("connecting_transport");
  let me = createHeadlessIO(n, P, nt, ie, Se),
    Me = createResultStamper(takeUsageSinceLastResult);
  if (((me.resultDelivery = Me), _wn(ownBridgePeerAddress), P.sdkUrl || P.outputFormat === "stream-json"))
    (transportStateByHost.of(e).setActive(me), trackUsageSinceLastResult());
  else transportStateByHost.of(e).markLocalTransport();
  transportStateByHost.of(e).markHeadlessStart({ sdkUrl: P.sdkUrl, readsProcessStdin: isStreamJsonStdin(n) });
  let Ee =
    Boolean(P.sdkUrl) &&
    Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID) &&
    env.CLAUDE_CODE_ENVIRONMENT_KIND === void 0 &&
    !env.CLAUDE_CODE_DISABLE_WORKING_SYNC;
  if (Ee)
    import("./chunk-2s3tfbmy.js")
      .then((lt) => lt.startSyncedFileSyncer(lt.SYNCED_FILE_ROOT))
      .catch(() => logForDiagnosticsNoPII("warn", "working_sync_import_failed", {}));
  if (P.sdkUrl && env.CLAUDE_CODE_REMOTE_SESSION_ID && mn()) {
    let lt = { sessionId: env.CLAUDE_CODE_REMOTE_SESSION_ID, sdkUrl: P.sdkUrl };
    import("./chunk-ar4s2yky.js")
      .then((In) => In.startHostedWorkerVitalsEmitter(lt))
      .catch(() => logForDiagnosticsNoPII("warn", "vitals_emitter_import_failed", {}));
  }
  let He = gitCredentialEngineAdmission({ entrypoint: env.CLAUDE_CODE_ENTRYPOINT, gitSwitch: !1 }),
    Xe = getCwd(),
    St =
      (Boolean(P.sdkUrl) && He.start ? workingSyncAdmission(He.engines.git, Xe) : "not_admitted") ===
      "admitted",
    wt = Ee || St,
    Lt = null,
    pn =
      wt && He.start
        ? import("./chunk-240k3fwa.js")
            .then((lt) => lt.startWorkerDirSync(Xe))
            .catch(() => (logForDiagnosticsNoPII("warn", "file_store_worker_import_failed", {}), null))
        : void 0,
    _n = decideWorkerDirSync({
      admittedAs: Ee ? "managed" : St ? "runner_child" : null,
      dirSyncStarts: pn !== void 0,
      hermetic: isHermeticRemoteSession(),
      spawnEnv: getPreSettingsEnvSnapshot,
      accountHome: safeHomedir,
      currentConfigHome: configDirForSync,
    });
  if (Ee && !_n.start && _n.reason !== "file_store_worker_off")
    logForDiagnosticsNoPII("info", "home_seed_worker_disabled", { reason: _n.reason });
  let Mn = _n.start
      ? startCloudHomeSeedParticipant({
          record: Se,
          configHome: _n.configHome,
          foreignFiles: _n.foreignFiles,
          takes: _n.takes,
          session: e,
          repoRoot: Xe,
          storageV5: P.storageV5,
          workerDirSync: pn,
        })
      : void 0,
    jn = createTurnGateParticipants();
  if (S1(env.CLAUDE_CODE_REMOTE_SESSION_ID, env.CLAUDE_CODE_ENVIRONMENT_KIND))
    jn.register(createUserDataRootsTurnGate());
  let Jn = void 0;
  if (pn !== void 0)
    import("./chunk-0zdmp65d.js")
      .then((lt) => lt.registerWorkerDirSyncForMidTurn(pn))
      .catch(() => {
        logForDiagnosticsNoPII("warn", "device_forward_clearance_import_failed", {});
      });
  if (Mn !== void 0) jn.register(homeSeedHoldParticipant(Mn));
  let ze = sessionAuthAdmission({
    sdkUrl: Boolean(P.sdkUrl),
    remoteSessionId: env.CLAUDE_CODE_REMOTE_SESSION_ID,
    environmentKind: env.CLAUDE_CODE_ENVIRONMENT_KIND,
    entrypoint: env.CLAUDE_CODE_ENTRYPOINT,
    disabled: env.CLAUDE_CODE_DISABLE_PLUGIN_FORWARDING,
    hermetic: isHermeticRemoteSession(),
  });
  if (!ze.admitted && ze.reason === "disabled")
    logForDiagnosticsNoPII("info", "plugin_forwarding_worker_disabled", {});
  let Dr = ccrAuthRefreshAdmission({
      sdkUrl: Boolean(P.sdkUrl),
      remoteSessionId: env.CLAUDE_CODE_REMOTE_SESSION_ID,
      environmentKind: env.CLAUDE_CODE_ENVIRONMENT_KIND,
      entrypoint: env.CLAUDE_CODE_ENTRYPOINT,
      disabled: env.CLAUDE_CODE_DISABLE_HOOK_FORWARDING,
      hermetic: isHermeticRemoteSession(),
    }),
    $r = admitRemoteToolsAnnounce({
      sdkUrl: Boolean(P.sdkUrl),
      remoteSessionId: env.CLAUDE_CODE_REMOTE_SESSION_ID,
      environmentKind: env.CLAUDE_CODE_ENVIRONMENT_KIND,
      entrypoint: env.CLAUDE_CODE_ENTRYPOINT,
      channelOff: isSessionChannelDisabled(),
      hermetic: isHermeticRemoteSession(),
    });
  if (sdkHostOffersOAuthRefresh()) {
    if ((setSdkOAuthTokenRefreshCallback(() => me.requestOAuthTokenRefresh()), isLauncherStartedProcess()))
      setLauncherHostLoginReplacementJudge((lt) => verifyLauncherHostLogin(P.credentials, lt));
  }
  if (env.CLAUDE_CODE_SDK_HAS_HOST_AUTH_REFRESH && isHostEntrypoint()) {
    let lt = parseNumberWithSeparators(process.env.CLAUDE_CODE_HOST_AUTH_REFRESH_TIMEOUT_MS) || void 0;
    setHostAuthTokenRefreshCallback(() => me.requestHostAuthTokenRefresh(lt));
  }
  if (P.outputFormat === "stream-json") installStdoutGuard(e.host);
  let $n = { current: [] },
    ut = { current: S },
    Yt = i8n({ permissionPromptTool: P.permissionPromptToolName, sdkUrl: P.sdkUrl }),
    nn = Z_e(P.permissionPrompts);
  if (nn) {
    if (((me.hostAnswersElicitations = !1), Yt !== void 0))
      logForDebugging(
        `--permission-prompts none: permission prompts are answered with a local deny; the ${Yt === "stdio" ? "SDK host" : "--permission-prompt-tool"} is not consulted`,
      );
  }
  let sandboxUnavailableReason = SandboxManager.getSandboxUnavailableReason();
  if (sandboxUnavailableReason) {
    if (SandboxManager.isSandboxRequired()) {
      if (P.outputFormat === "stream-json") {
        let lt = isTransportBacked(e) ? wZt : `${wZt}: ${sandboxUnavailableReason}`;
        if (isTransportBacked(e))
          logForDebugging(`sandbox unavailable detail: ${sandboxUnavailableReason}`, { level: "error" });
        (publishFailedSummary(me.sessionState, lt),
          await me.write(
            buildStartupFailureResult({
              sessionId: getSessionId(),
              message: `${lt}. Set sandbox.failIfUnavailable=false to allow unsandboxed execution.`,
              reason: "sandbox_required_unavailable",
              resultIndex: null,
            }),
          ),
          await Promise.race([me.flushSessionState(), sleep(5000, void 0, { unref: !0 })]));
      }
      (process.stderr.write(
        `
Error: sandbox required but unavailable: ${sandboxUnavailableReason}
` +
          `  sandbox.failIfUnavailable is set \u2014 refusing to start without a working sandbox.

`,
      ),
        gracefulShutdownSync(1));
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
        ? createSandboxNetworkAsker(me)
        : me.createSandboxAskCallback(
            applyPermissionAnswerChanges,
            (lt) => s((In) => ({ ...In, toolPermissionContext: lt(In.toolPermissionContext) })),
            P.storageV5,
            P.credentials,
          ),
      () => r().toolPermissionContext,
      () => $n.current,
      () => ut.current,
      P.storageV5,
      P.credentials,
    );
  if (!sandboxUnavailableReason && SandboxManager.isSandboxingEnabled()) {
    profileCheckpoint("before_sandbox_init");
    let startTime = performance.now();
    try {
      await SandboxManager.initialize(En());
    } catch (err) {
      (process.stderr.write(`
\u274C Sandbox Error: ${errorMessage(err)}
`),
        gracefulShutdownSync(1, "other"));
      return;
    }
    (Br("sandbox_init_ms", performance.now() - startTime, startTime),
      profileCheckpoint("after_sandbox_init"));
    for (let In of SandboxManager.getProfileReadSecurityWarnings())
      process.stderr.write(`
\u26A0 ${In}
`);
  }
  if (
    (createDependencyWatcher(
      [{ subscribe: h }],
      () => [SandboxManager.isSandboxingEnabled()],
      (event) => {
        if (!event) return;
        SandboxManager.initialize(En()).catch((In) => {
          logForDebugging(`sandbox: initialization after a settings change failed: ${errorMessage(In)}`, {
            level: "error",
          });
        });
      },
    ),
    !sandboxUnavailableReason)
  ) {
    let maskCredentialWarning = SandboxManager.getMaskCredentialWarning();
    if (maskCredentialWarning)
      process.stderr.write(`
\u26A0 ${maskCredentialWarning}

`);
    warnOfDeniesOnAnotherHostOnStderr();
  }
  let Mr = P.outputFormat === "stream-json" && Boolean(P.verbose);
  if (Mr) registerStartupSdkEventForwarder(me);
  if (P.setupTrigger)
    await runStartupHooks(e, {
      kind: "setup",
      trigger: P.setupTrigger,
      storageV5: P.storageV5,
      credentials: P.credentials,
    });
  (headlessProfilerCheckpoint("before_loadInitialMessages"),
    profileCheckpoint("before_loadInitialMessages", { once: !0 }),
    Br("headless_prologue_ms", performance.now() - startTime, startTime));
  let Pn = r(),
    appState = Spe();
  ptt.of(e).registry = appState;
  let No = createForkSeedVerifier({
      sdkUrl: P.sdkUrl,
      credentials: P.credentials,
      writeNote: (lt) => (
        me.sessionState.notifyInternalMetadataChanged({ fork_seed_sha256: lt }),
        me.flushSessionState()
      ),
    }),
    Fr = [],
    Xo,
    fi,
    startTime_3 = performance.now(),
    {
      messages: messages,
      turnInterruptionState: turnInterruptionState,
      supersededToolUseIds: supersededToolUseIds,
      supersededToolNames: supersededToolNames,
      answeredToolUseIds: answeredToolUseIds,
      deferredToolUse: deferredToolUse,
      rescueSuppressed: rescueSuppressed,
      agentSetting: agentSetting,
      sessionProjectPath: sessionProjectPath,
      aborted: aborted,
      planModeOnResume: planModeOnResume,
      transcriptAnchor: transcriptAnchor,
      liveSourceRows: liveSourceRows,
      resumedAsFork: resumedAsFork = Boolean(P.forkSession),
      messagesOrigin: messagesOrigin,
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
      continue: P.continue,
      teleport: P.teleport,
      resume: P.resume,
      resumeSessionAt: P.resumeSessionAt,
      resumeDropsTurn: P.resumeDropsTurn,
      sessionBeganAsCopy: P.sessionBeganAsCopy,
      forkSession: P.forkSession,
      outputFormat: P.outputFormat,
      sessionStartHooksPromise: P.sessionStartHooksPromise,
      restoredWorkerState: me.restoredWorkerState,
      hydratePrefetch: me.hydratePrefetch,
      remoteControlForkChild: No,
      sdkUrl: P.sdkUrl,
      storageV5: P.storageV5,
      credentials: P.credentials,
      cliAgents: P.cliAgents,
      permissionModeSuppliedOnInvocation: P.permissionModeSuppliedOnInvocation !== !1,
      relayAwaitsHandoff: ie,
      liveBackgroundHandoff: getAttachablePrompt(P.liveBackgroundHandoff, P, {
        stdin: process.stdin.isTTY === !0,
        stdout: process.stdout.isTTY === !0,
      }),
      tools: S,
    }),
    startTime_4 = performance.now();
  if ((Br("initial_messages_load_ms", startTime_4 - startTime_3, startTime_3), aborted)) return;
  if (P.joinAlwaysLoadMcp !== void 0)
    (await P.joinAlwaysLoadMcp(),
      Br("mcp_always_load_join_ms", performance.now() - startTime_4, startTime_4));
  let ou = new CloudPluginSwitches(me);
  await ou.restore({ engineState: r, setEngineState: s }, P.storageV5);
  let ga = P.joinAlwaysLoadMcp !== void 0 ? r().mcp : Pn.mcp,
    startTime_5 = performance.now(),
    Rd = me.isRemoteTransport()
      ? classifyFoldedFollowUps(
          messages,
          new Set(Fr),
          supersededToolUseIds !== void 0 && supersededToolUseIds.size > 0,
        )
      : void 0;
  if (P.sdkUrl && P.resume && !resumedAsFork && !isShuttingDown())
    (await restoreTaskListAtBoot(e, messages, me.restoredWorkerState, P.storageV5),
      await me.sendOwedClientRowsAgain(createIngressReadiness(e, appState, messages)));
  let Ro = (lt) => {
    (messages.push(lt), Fr.push(lt));
  };
  ownCostLedger();
  let dc;
  if (
    (($n.current = messages),
    prefetchUserContext(e, Boolean(P.continue || P.resume), P.storageV5, P.credentials),
    Mr)
  )
    setTaskNotificationListener(null);
  let hookInitialUserMessage = takePendingInitialUserMessage();
  if (hookInitialUserMessage) me.prependUserMessage(hookInitialUserMessage);
  let ha = shouldAttemptAgentRestoreInPrint({
    hasStreamingInput: Z,
    explicitAgentFlag: P.agent,
    mainThreadAgentType: getMainThreadAgentType(),
    resumedAgentSetting: agentSetting,
  });
  if (ha.attempt && agentSetting) {
    let lt = await loadAgentDefinitionsForSessionCwd(sessionProjectPath, P.storageV5),
      { agentDefinition: agentDefinition } = restoreAgentFromSession(
        agentSetting,
        void 0,
        { activeAgents: w, allAgents: w },
        {
          sessionAgentDefinitions: lt,
          sessionCwd: sessionProjectPath,
          onResolveMiss: ha.loud
            ? (ar) => {
                (Ro(createSystemMessage(ar, "warning")),
                  process.stderr.write(
                    ar +
                      `
`,
                  ));
              }
            : void 0,
        },
      );
    if (agentDefinition) {
      if (
        (s((prev) => ({ ...prev, agent: agentDefinition.agentType })),
        !P.systemPrompt && !isBuiltInAgent(agentDefinition))
      ) {
        let agentSystemPrompt = agentDefinition.getSystemPrompt();
        if (agentSystemPrompt) P.systemPrompt = agentSystemPrompt;
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
      { storageV5: P.storageV5, credentials: P.credentials },
    ),
    Rn = Wi ? installRestoredModel(messages, Wi, resumedAsFork, P.storageV5, P.credentials) : void 0;
  if (Rn)
    s((lt) => {
      if (lt.mainLoopModel === Rn) return lt;
      return (zE(e, lt, Rn, "resume"), { ...lt, mainLoopModel: Rn });
    });
  if (messages.length === 0 && process.exitCode !== void 0) return;
  let yi;
  if (P.restrictedStartupModel && Bz(P.userSpecifiedModel, P.restrictedStartupModel)) {
    let lt = formatModelRestrictedNotice(P.restrictedStartupModel, getMainLoopModel());
    if (
      !messages.some(
        (ar) => ar.type === "system" && ar.subtype === "informational" && ar.content.includes(lt),
      )
    )
      Ro(createSystemMessage(lt, "warning"));
    yi = createSystemMessage(lt, "warning");
  }
  if (P.rewindFiles) {
    let targetMessage = messages.find((pr) => pr.uuid === P.rewindFiles);
    if (!targetMessage || targetMessage.type !== "user") {
      (process.stderr
        .write(`Error: --rewind-files requires a user message UUID, but ${P.rewindFiles} is not a user message in this session
`),
        gracefulShutdownSync(1));
      return;
    }
    let currentAppState = r(),
      ar = await handleRewindFiles(P.rewindFiles, currentAppState, !1);
    if (!ar.canRewind) {
      (process.stderr.write(`Error: ${ar.error || "Unexpected error"}
`),
        gracefulShutdownSync(1));
      return;
    }
    if (ar.skippedLinks)
      process.stderr
        .write(`Warning: ${ar.skippedLinks} tracked ${ar.skippedLinks === 1 ? "path was" : "paths were"} skipped: ${REWIND_UNSAFE_PATH_REASON}. Run with --debug for the paths.
`);
    (writeToStdout(`Files rewound to state at message ${P.rewindFiles}
`),
      gracefulShutdownSync(0));
    return;
  }
  let _a = typeof P.resume === "string" && P.resume.trim().length > 0,
    isUsingSdkUrl = Boolean(P.sdkUrl);
  if (
    typeof n === "string" &&
    n.trim() === "" &&
    !isUsingSdkUrl &&
    !deferredToolUse &&
    !hookInitialUserMessage
  ) {
    (process.stderr.write(
      n !== ""
        ? `Error: Input contained only whitespace. Provide a prompt with text through stdin or as a prompt argument when using --print
`
        : _a || P.continue
          ? `Error: No deferred tool marker found in the resumed session. Either the session was not deferred, the marker is stale (tool already ran), or it exceeds the tail-scan window. Provide a prompt to continue the conversation.
`
          : `Error: Input must be provided either through stdin or as a prompt argument when using --print
`,
    ),
      gracefulShutdownSync(1));
    return;
  }
  if (P.outputFormat === "stream-json" && !P.verbose) {
    (process.stderr.write(`Error: When using --print, --output-format=stream-json requires --verbose
`),
      gracefulShutdownSync(1));
    return;
  }
  let allowedMcpTools = filterToolsByDenyRules(ga.tools, Pn.toolPermissionContext),
    Ks = withLateEnabledToolsIfAdvertised([...S, ...allowedMcpTools], Pn.toolPermissionContext);
  ut.current = Ks;
  let $a = Yt ? mcpInfoFromString(Yt)?.serverName : void 0,
    onPermissionPrompt = (details) => {
      (notifyRequiresAction({ io: me, setAppState: s }, details),
        Wx?.runClassifierSummaryForBlocked(details, me.sessionState));
    };
  me.onUserDialogParked = (prev) => {
    Wx?.runClassifierSummaryForBlocked(prev, me.sessionState);
  };
  let vn = { swept: !1 },
    ts = getCanUseToolFn(
      Yt,
      me,
      () => r().mcp.tools,
      onPermissionPrompt,
      { isPromptToolServerSwept: () => vn.swept },
      P.permissionPrompts,
    );
  if (P.permissionPromptToolName) Ks = Ks.filter((lt) => !toolMatchesName(lt, P.permissionPromptToolName));
  let Ka = collectSendPins(messages);
  if (Object.keys(Ka).length > 0) s((lt) => ({ ...lt, sendMessagePins: Ka }));
  if (!resumedAsFork)
    s((lt) => {
      let In = collectNamedAgentIds(messages, lt.agentNameRegistry);
      return In === null ? lt : { ...lt, agentNameRegistry: In };
    });
  Yze.of(e).savesWith(createTranscriptSaver({ io: me, isShuttingDown: isShuttingDown }));
  let zr = (lt) => {
      let In = [...messages],
        ar = getSessionId();
      withDeadline(
        initializeGrowthBook().catch(() => null),
        fa,
      )
        .then(() => {
          if (!isMcpTasksEnabled()) {
            logForDebugging(
              "[print.ts] MCP task sidecar restore skipped: tasks gate off after the flag settle",
            );
            return;
          }
          return loadMcpTaskModule({
            sessionId: ar,
            conversation: In,
            taskRegistry: lt,
            getMcpClients: () => [...(getMcpClientsFromAccessor() ?? [])],
            requestDialog: void 0,
            storageV5: P.storageV5,
            credentials: P.credentials,
          });
        })
        .catch(logError);
    },
    _s = [],
    Xs,
    is = [],
    as = [],
    So = [],
    Pl,
    Ml = collectResumableAgentIds(supersededToolNames);
  if (env.CLAUDE_CODE_RESUME_INTERRUPTED_TURN && me.isRemoteTransport()) {
    if (fi !== void 0 && !resumedAsFork) {
      if (
        (await withDeadline(
          initializeGrowthBook().catch(() => null),
          fa,
        ),
        getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WITTY_KAY, !1))
      )
        Pl = createAttachmentMessage({
          type: "critical_system_reminder",
          content: describeDiskTranscriptLag(fi, Date.now()),
        });
    }
    let restoredWorkerState = await me.restoredWorkerState,
      In = restoredWorkerState?.internal?.running_background_tasks,
      ar = restoredWorkerState?.internal?.orphaned_background_tasks_pending_notification,
      pr = restoredWorkerState?.internal?.finished_background_tasks_pending_notification,
      qo = Array.isArray(In) ? In : [],
      oi = Array.isArray(ar) ? ar : [],
      ds = dedupeTasksById([...oi, ...qo]),
      Ct = collectOrphanTasks(Array.isArray(pr) ? pr : [], ds),
      cs = restoredWorkerState?.internal?.running_foreground_agents,
      lu = restoredWorkerState?.external?.pending_action,
      rs = Array.isArray(cs) && cs.length > 0,
      Zi =
        rs &&
        turnInterruptionState?.kind === "interrupted_prompt" &&
        !resumedAsFork &&
        !pendingActionsAmbiguous(restoredWorkerState);
    if (Zi && lu != null)
      await withDeadline(
        initializeGrowthBook().catch(() => null),
        fa,
      );
    if (Zi && (lu == null || BNt()))
      try {
        as = await planRecordedAgentResumes({
          recorded: cs,
          agentCallIds: Ml,
          known: new Set([...ds, ...Ct].map((Fo) => Fo.task_id)),
          hasTool: (Fo) => findToolByName(S, Fo) !== void 0,
          settleFlags: () =>
            withDeadline(
              initializeGrowthBook().catch(() => null),
              fa,
            ),
        });
      } catch (error) {
        (logFeatureBad("ccr_cut_off_agents", "threw"), logError(toError(error)));
      }
    _s = dedupeTasksById(qo);
    let fs = [],
      si,
      xd = restoredWorkerState?.internal?.resumable_orphaned_agents;
    if (_s.length > 0 || as.length > 0 || (Array.isArray(xd) && xd.length > 0)) {
      await withDeadline(
        initializeGrowthBook().catch(() => null),
        fa,
      );
      let hr = await restoreOrphanAgents({
        recorded: xd,
        stopped: [..._s, ...as],
        toldOfAnyway: [..._s, ...Ct, ...as],
        readAgentMetadataEvents: (Fo) => me.readAgentMetadataEvents(Fo),
        storageV5: P.storageV5,
      });
      ((Xs = hr.alsoResumable),
        (fs = hr.stillOffered),
        (si = hr.toKeep),
        (me.sessionState.resumableOrphanedAgents = si ?? []));
    }
    So = await resumeCutOffAgents({
      cutOff: as,
      unresolvedCallIds: supersededToolUseIds ?? new Set(),
      findCalls: (hr) => findUnresolvedToolUses(hr, P.storageV5),
      stopped: _s,
      alsoResumable: Xs,
      cardWaits: pendingActionsAmbiguous(restoredWorkerState),
      owesATurn: () =>
        !rescueSuppressed &&
        !resumedAsFork &&
        (turnInterruptionState?.kind === "interrupted_prompt" ||
          getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_orphan_restore_wake", !0)),
      startsSpent: () => hasHitUnattendedRestartLimit(restoredWorkerState),
      tools: Ks,
      toolPermissionContext: r().toolPermissionContext,
      storageV5: P.storageV5,
    });
    let Po = new Set(So.map((hr) => hr.agentId)),
      ps = new Set(So.flatMap((hr) => (hr.call ? hr.agentId : []))),
      filtered = as.filter((hr) => !ps.has(hr.task_id));
    if (rs)
      me.sessionState.notifyInternalMetadataChanged({
        running_foreground_agents: as.filter((hr) => ps.has(hr.task_id)),
      });
    try {
      for (let hr of [!0, !1]) {
        let filtered_2 = filtered.filter((va) => Po.has(va.task_id) === hr);
        if (filtered_2.length > 0)
          Ro(createUserMessage({ content: formatRestartedAgentsReminder(filtered_2, hr), isMeta: !0 }));
      }
    } catch (error) {
      (logFeatureBad("ccr_cut_off_agents", "threw"), logError(toError(error)));
    }
    let canUseTool = orphanAgentRestoreNotice(
      [...fs, ..._s, ...filtered],
      (tool) => findToolByName(S, tool) !== void 0,
      Xs,
      Po,
    );
    if (ds.length > 0) {
      (logForDebugging(`[print.ts] ${ds.length} orphaned background task(s) after restart`),
        Ro(
          createUserMessage({
            content: describeRunningProcesses(dedupeTasksById([...ds, ...fs]), Ct, canUseTool),
            isMeta: !0,
          }),
        ));
      for (let jo of ds)
        emitTaskNotification(jo.task_id, "stopped", {
          summary: `Stopped by a worker restart: ${jo.description || jo.task_id}`,
          reason: "worker_restart",
          ambient: jo.ambient,
        });
      let hr = !1,
        Fo = !1,
        startTime = performance.now(),
        Ld;
      try {
        for (let Gs of drainTaskNotifications()) await me.write(Gs);
        Ld = performance.now();
        let winner = await Promise.race([
          me.flushClientEvents(),
          sleep(Gx, void 0, { unref: !0 }).then(() => "timed_out"),
        ]);
        ((Fo = winner === "timed_out"), (hr = winner === !0));
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
      (Br("orphaned_task_flush_ms", startTime_2 - startTime, startTime),
        logForDiagnosticsNoPII(hr ? "info" : "warn", "orphaned_task_flush", {
          budget_ms: Gx,
          write_ms: Math.round((Ld ?? startTime_2) - startTime),
          waited_ms: Ld === void 0 ? 0 : Math.round(startTime_2 - Ld),
          timed_out: Fo,
          delivered: hr,
        }),
        me.sessionState.notifyInternalMetadataChanged({
          running_background_tasks: [],
          orphaned_background_tasks_pending_notification: hr ? null : ds,
          finished_background_tasks_pending_notification: null,
          ...(si && { resumable_orphaned_agents: si }),
        }));
    } else if (fs.length > 0 || Ct.length > 0)
      (Ro(createUserMessage({ content: describeRunningProcesses(fs, Ct, canUseTool), isMeta: !0 })),
        me.sessionState.notifyInternalMetadataChanged({
          finished_background_tasks_pending_notification: null,
          ...(si && { resumable_orphaned_agents: si }),
        }));
    ((is = await listResumableAgentsStub(
      liveSourceRows === void 0 ? messages : messages.filter((hr) => !liveSourceRows.has(hr.uuid)),
      {
        settleFlags: () =>
          withDeadline(
            initializeGrowthBook().catch(() => null),
            fa,
          ),
        addRow: Ro,
        diskMayChange: Xo !== void 0,
      },
    )),
      zr(createTaskFramework(r, s)));
  } else if (messages.length > 0) {
    let lt = createTaskFramework(r, s);
    (await formatOrphanSummary(messages, lt, void 0, void 0, P.storageV5, liveSourceRows, () => _As(S)),
      restoreRemoteAgentTasks({
        abortController: new AbortController(),
        taskRegistry: lt,
        storageV5: P.storageV5,
        credentials: P.credentials,
      }),
      zr(lt));
  }
  let restoredWorkerState = await me.restoredWorkerState;
  if (
    (restoreDeclaredDialogKinds(restoredWorkerState),
    restoreCostState(restoredWorkerState),
    restoredWorkerState !== null)
  )
    claimCostLedgerForCurrentSession();
  (restoreChromeSetupOfferState(restoredWorkerState),
    markHostRendersChromeSetupOffer(),
    restoreMemoryToggle(restoredWorkerState),
    restoreToolsKeptByClear(restoredWorkerState),
    adoptInternalWindows(e, restoredWorkerState, me.sessionState, s),
    lazyPrintModules2.restoreMemoryExtractPlace(e.host, restoredWorkerState?.internal?.memory_extract_place),
    await restoreExcludeDynamicSections(restoredWorkerState, P),
    restoreProactivityOptIn(restoredWorkerState, {
      getAppState: r,
      setAppState: s,
      sessionState: me.sessionState,
    }));
  try {
    restoreDurableWatches(restoredWorkerState, {
      sink: (lt) => me.sessionState.notifyInternalMetadataChanged(lt),
      storageV5: P.storageV5,
      reread: () => me.rereadWorkerState(),
    });
  } catch (error) {
    logError(error);
  }
  (settleWorkerPermissionModeRecord(me.sessionState, r().toolPermissionContext.mode, {
    planModeOnResume: planModeOnResume,
    restored: restoredWorkerState,
    restartedWorker: Am(env.CLAUDE_CODE_WORKER_EPOCH),
  }),
    KPs(me.sessionState, r().ultracode, restoredWorkerState));
  let Bs = getResumeLaneOptions(),
    ji = await resolveResumeInterruption({
      restored: restoredWorkerState,
      load: {
        turnInterruptionState: turnInterruptionState,
        supersededToolUseIds: supersededToolUseIds,
        rescueSuppressed: rescueSuppressed,
      },
      chain: messages,
      tools: Ks,
      forwarding: isRemoteToolForwardingSwitchOn(),
      findUnresolved: (lt) => findUnresolvedToolUses(lt, P.storageV5),
      findOnPrunedBranch: (lt) => findUnresolvedToolUseOnAPrunedBranch(lt, P.storageV5),
      lane: Bs,
    }),
    { turnInterruptionState: turnInterruptionState_2, journaledToolUses: journaledToolUses } = ji,
    ka = await restoreParkedPrompt({
      restored: restoredWorkerState,
      turnInterruptionState: turnInterruptionState,
      chain: messages,
      supersededToolUseIds: supersededToolUseIds,
      supersededToolNames: supersededToolNames,
      journaled: ji,
      tools: S,
      findUnresolved: (lt) => gS(lt, P.storageV5),
      lane: Bs,
    }),
    {
      parkedPermission: parkedPermission,
      supersededToolUseIds: supersededToolUseIds_2,
      supersededToolNames: supersededToolNames_2,
      pendingActionClass: pendingActionClass,
    } = ka,
    zi = holdParkedAgentAsk({
      restored: restoredWorkerState,
      bootPark: ka,
      cutOffCallIds: Ml,
      planned: So,
      answerKind: applyPermissionAnswerChanges.kind,
      io: me,
      answerOff: Bs.inheritedAnswerOff,
    }),
    {
      servedCallsToAdopt: servedCallsToAdopt,
      servedCallsNeverSent: servedCallsNeverSent,
      journaledServedCalls: journaledServedCalls,
    } = await planServedCallAdoption({
      restored: restoredWorkerState,
      supersededToolUseIds: supersededToolUseIds_2 ?? new Set(),
      parkedToolUseId: parkedPermission?.tool_use_id,
      journaledToolUses: journaledToolUses,
      adoptionTools: Ks,
      findUnresolved: (lt) => findUnresolvedToolUses(lt, P.storageV5),
      forwarding: isRemoteToolForwardingSwitchOn(),
      hasRemoteToolCalls: isRemoteToolForwardingEnabled,
      flagWaitMs: fa,
    });
  if (
    (parkedPermission !== void 0 || servedCallsToAdopt.length > 0) &&
    _s.length === 0 &&
    is.length === 0 &&
    as.length === 0 &&
    turnInterruptionState_2?.kind === "interrupted_prompt" &&
    isPlainInterruptMarker(turnInterruptionState_2.message)
  )
    await withDeadline(
      initializeGrowthBook().catch(() => null),
      fa,
    );
  let Ms = cancelStaleParkedPrompt(me, restoredWorkerState, {
    ...ka,
    keepRequestIds: zi === void 0 ? ka.keepRequestIds : new Set([...ka.keepRequestIds, zi.card.request_id]),
    reportKept: me.isRemoteTransport() && Bs.holdsInputBehindPrompt?.() === !0,
  });
  (headlessProfilerCheckpoint("after_loadInitialMessages"),
    profileCheckpoint("after_loadInitialMessages", { once: !0 }),
    ce("transcript_hydrated", `messages=${messages.length}`));
  let Od = getUserSpecifiedModelSetting();
  (await ensureModelStringsInitialized({
    sessionModelIsProviderId: Od != null && !modelSettingResolvesThroughModelStrings(Od),
  }),
    headlessProfilerCheckpoint("after_modelStrings"));
  let Dd = P.outputFormat === "json" && P.verbose,
    ws = [],
    ns,
    weakSet = new WeakSet(),
    weakSet_2 = new WeakSet(),
    weakMap = new WeakMap(),
    Vs,
    Fd = createAssistantTextTracker(),
    iu = P.outputFormat !== "json" && P.outputFormat !== "stream-json",
    Al = new TurnEndPrinter({ maxTurns: P.maxTurns, maxBudgetUsd: P.maxBudgetUsd }),
    za = 0,
    Ts = !1,
    Nr,
    Do,
    Ya = [];
  (Br("headless_post_load_ms", performance.now() - startTime_5, startTime_5),
    headlessProfilerCheckpoint("before_runHeadlessStreaming"),
    ce("starting_query_loop"));
  for await (let lt of _runHeadlessStreamingForTesting(
    e,
    me,
    ga.clients,
    y,
    Ks,
    messages,
    ts,
    R,
    r,
    s,
    h,
    w,
    {
      ...P,
      permissionPromptToolServerName: $a,
      permissionPromptToolBinding: vn,
      handbackPointerResults: weakSet,
      lateReleasedResults: weakSet_2,
      autoModeStopNotices: weakMap,
      markStartupPhase: ce,
      workerDirSync: pn,
      turnGate: jn,
      homeSeed: Mn,
      turnEndUploadListener: Jn,
      planModeOnResume: planModeOnResume,
      restoredOrphans: _s,
      alsoResumable: Xs,
      agentResumes: So,
      keptSubagentAsk: zi,
      lostSessionTimers: is,
      rescueSuppressed: rescueSuppressed,
      restoredWorkerMetadata: restoredWorkerState,
      answeredToolUseIds: answeredToolUseIds,
      transcriptAnchor: transcriptAnchor,
      initialMessagesOrigin: messagesOrigin,
      openingRowsMade: Fr,
      overdueSessionStartHooks: Xo,
      diskBehindReminder: Pl,
      followUpsAtStartUp: Rd,
      remoteControlForkChild: No,
      pluginForwardingAdmission: ze,
      deviceHooksAdmission: Dr,
      remoteToolsAdmission: $r,
      turnHandoffAdmission: nt,
      usesRelayMarker: ie,
      sessionHooks: appState,
      servedCallsToAdopt: servedCallsToAdopt,
      servedCallsNeverSent: servedCallsNeverSent,
      journaledServedCalls: journaledServedCalls,
      supersededToolNames: supersededToolNames_2,
      parkLane: Bs,
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
    Ms,
    fromEnum(ji.offChainToolNames.size > 0 ? "journaled_off_chain" : pendingActionClass),
    restoredWorkerState?.initParkReport,
  )) {
    let In = lt.type === "result" ? Me.stamp(lt) : lt,
      ar = weakSet.has(lt),
      pr = weakSet_2.has(lt),
      qo = weakMap.get(lt);
    if (!Ts && isInformationalSystemMessage(In)) {
      Ya.push(In);
      continue;
    }
    if ((za++, za === 1)) ce("first_message_drained", `type=${In.type}`);
    let oi = qjr(!1) ?? (Xjr() ? void 0 : z5s(() => y4s(r().toolPermissionContext.mode)));
    if (oi !== void 0)
      if (P.outputFormat === "stream-json" && P.verbose) Do = createSystemMessage(oi, "warning");
      else
        process.stderr.write(`${oi}
`);
    if (!Ts && In.type === "system" && In.subtype === "init") ((Ts = !0), ce("system_init_emitted"));
    let ds = Ts ? Ya.splice(0) : [];
    if (P.outputFormat === "stream-json" && P.verbose)
      try {
        let Ct = In.type === "system" && In.subtype === "init";
        if (Ts && !Ct && Do) {
          let cs = Do;
          ((Do = void 0), await me.write({ ...cs, session_id: getSessionId() }));
        }
        if ((await me.write(In), Ts && yi)) {
          let cs = yi;
          ((yi = void 0), await me.write({ ...cs, session_id: getSessionId() }));
        }
        if (Ts && Do) {
          let cs = Do;
          ((Do = void 0), await me.write({ ...cs, session_id: getSessionId() }));
        }
        for (let cs of ds) await me.write(cs);
      } catch (error) {
        Nr = { message: In, error: error };
        break;
      }
    for (let Ct of [In, ...ds])
      if (isLastMessageCandidate(Ct)) {
        if (Dd) ws.push(Ct);
        if (ar) ns = Vs ?? Ct;
        else if (!isInformationalSystemMessage(Ct) && !isApiRetrySystemMessage(Ct)) {
          if (((ns = Ct), Ct.type === "result")) Vs = Ct;
        }
        if (iu && !ar) {
          if ((trackAssistantText(Fd, Ct), Ct.type === "result"))
            Al.printAtTurnEnd(Ct, pr ? void 0 : Fd.partialForResult, qo);
        }
      }
  }
  if (Nr) {
    await endHeadlessSessionOnOutputWriteFailure(e, me, Nr.message, Nr.error, za);
    return;
  }
  switch (P.outputFormat) {
    case "json":
      if (!ns || ns.type !== "result") {
        (process.stderr.write(`Error: No messages returned from query
`),
          logForDebugging("runHeadless: no result message returned from query", { level: "error" }),
          gracefulShutdownSync(1));
        return;
      }
      if (P.verbose) {
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
        (process.stderr.write(`Error: No messages returned from query
`),
          logForDebugging("runHeadless: no result message returned from query", { level: "error" }),
          gracefulShutdownSync(1));
        return;
      }
      Al.printAtExit(ns, Fd.partialForResult);
  }
  if ((logHeadlessProfilerTurn(), isExtractModeActive() || lazyPrintModules2.isLaptopExtractActive(e.host)))
    await lazyPrintModules2.drainPendingExtraction(e.host);
  (await flushPendingAsyncRewakeHooks(),
    await Promise.race([
      Promise.all([
        import("./chunk-2s3tfbmy.js").then((lt) => lt.drainSyncedFiles()).catch(() => {}),
        pn?.then((lt) => lt?.drain()).catch(() => {}),
      ]),
      sleep(5000, void 0, { unref: !0 }),
    ]));
  let ni = me instanceof RemoteIO && me.permanentCloseCode !== void 0;
  if (Ue && ns?.type !== "result") {
    let lt;
    if (ni) lt = "transport closed permanently";
    else if (za === 0) lt = "zero messages drained \u2014 input stream ended before any output";
    else if (!Ts) lt = "input stream ended before system/init was emitted";
    else lt = "input stream ended without a result message";
    process.stderr
      .write(`SDKStartup: exiting without result: ${lt} (last_phase=${Ae}, drained=${za}, exit=${ni ? 1 : 0})
`);
  }
  (transportStateByHost.of(e).setActive(void 0),
    gracefulShutdownSync(
      (ns?.type === "result" && ns?.is_error) || ni
        ? 1
        : P.outputFormat === "stream-json"
          ? 0
          : (getLocalCommandExitCode() ?? 0),
    ));
}
//@ chunk-tyg7f3ek.js:652107-652157 layout
function Bz(e, n) {
  return e === void 0 || parseUserSpecifiedModel(e) !== parseUserSpecifiedModel(n);
}
//@ chunk-tyg7f3ek.js:652157-652293 layout = createModelSwitchBreadcrumbs (1)
function createModelSwitchBreadcrumbs(e, n, r) {
  if (
    "model" in e &&
    (e.model == null || String(e.model).trim().toLowerCase() === "default") &&
    n !== void 0 &&
    n !== r
  )
    return r;
  return;
}
/**
 * 判断一次模型写入是否与当前窗口不一致：写入值存在、新旧模型相同，但写入的模型解析后与先前生效的模型不同。
 */
//@ chunk-tyg7f3ek.js:652293-652402 layout
function isWindowDivergentWrite({
  writtenModel: writtenModel,
  prevModel: prevModel,
  newModel: newModel,
  prevActive: prevActive,
}) {
  return (
    writtenModel !== void 0 &&
    newModel === prevModel &&
    parseUserSpecifiedModel(writtenModel) !== parseUserSpecifiedModel(prevActive ?? prevModel)
  );
}
//@ chunk-tyg7f3ek.js:652402-652485 layout
function Wz(e) {
  let cwd = xo(e).cwd;
  try {
    return (resolvePhysicalCwd(cwd), cwd);
  } catch {
    return xo(e).originalCwd;
  }
}
//@ chunk-tyg7f3ek.js:652485-652566 layout
function isAdvertisedCommand(e) {
  return e.terminalOriented !== !0 || e.advertisedOnHostedSessions === !0;
}
//@ chunk-tyg7f3ek.js:652566-652580 layout
var OAUTH_FLOW_JOIN_WINDOW_MS = 600000;
/**
 * 已有的 OAuth 流程是否可复用（同一登录方式、同一组织、尚未收到授权码、10 分钟内）。
 */
//@ chunk-tyg7f3ek.js:652580-652708 layout
function canJoinOAuthFlow(e, n, r, s) {
  return (
    e.loginWithClaudeAi === n &&
    e.orgUUID === r &&
    !e.service.hasReceivedAuthorizationCode() &&
    s - e.startedAt < OAUTH_FLOW_JOIN_WINDOW_MS
  );
}
/**
 * runHeadlessStreaming：headless 主循环。读取输入消息与 control_request（initialize、interrupt、set_model、set_permission_mode、mcp_set_servers、rewind_files 等约 90 种子类型），排队执行查询轮次并产出 SDK 消息。
 */
//@ chunk-tyg7f3ek.js:652708-850597 callgraph-witnessed = runHeadlessStreaming (0.158)
function _runHeadlessStreamingForTesting(e, n, r, s, h, y, S, R, w, P, L, q, x, G, Z, re, Ae, Ue, ce, nt) {
  let messageQueue = x.messageQueue,
    Se = new UnseenPanelModInputHold(messageQueue, () => vk.list().length > 0),
    me = { getState: w, setState: P, subscribe: L },
    over = McpConnectionStore.over(me),
    over_2 = PluginsStateStore.over(me),
    He = !1,
    Xe;
  if (
    (e.mcpSessionWiring.registerConnections(over),
    fNt.of(e).acquire(ComputerUseStateCell.over(me)),
    n instanceof RemoteIO)
  )
    (startCgroupCpuSampling(n.sessionState, w, e.host.clock),
      startHostCpuSampler(createTaskFramework(w, P)),
      startToolCpuSampling(n.sessionState, w, e.host.clock));
  let We = () => !1,
    of_2 = RECEIVED_MESSAGE_UUIDS.of(e),
    of_3 = HOST_INGRESS_LANES.of(e),
    Lt = makeHeldMessageMatcher(y, () => y, getSessionId),
    pn = isSelfHostedHeldRecognition() ? interruptedTurnUuids(y) : new Set(),
    _n = getSessionId(),
    Mn = makeRewindStandInWriter(
      { conversation: () => Ct, append: Gs, appendsSettled: () => rs.settled(), storageV5: x.storageV5 },
      y,
    ),
    jn = new RedeliveryResolver({
      io: n,
      messageQueue: messageQueue,
      receivedMessageUuids: of_2,
      transcript: createTurnPersistenceChecks({ storageV5: x.storageV5, heldInMemory: Lt }),
      holds: (O) => Ie.heldMessage() === O || Ie.waitsForItsReRun(O),
      storeRewindStandIn: Mn,
      hasRewindTarget: (O) => hasRewindTarget(Ct, O),
      noteClosedUnrun: (O, Q) =>
        reportRedeliveredFollowupClosed(Ct, O, Q === "cancelled" ? "cancelled" : "later"),
    }),
    Jn = new DeclinedRedeliveryBatcher({
      io: n,
      messageQueue: messageQueue,
      declined: jn,
      onBatch: (O, Q) => {
        if (Q === "settled" && isTeardownUnwindRequested()) return;
        Ie.noteBatch(O, Q);
      },
    }),
    ze = new PrintRunState(),
    Dr = detectTurnInterruption(G, y),
    $r = G?.kind === "interrupted_prompt" ? Dr : findLastUserPromptUuid(y);
  ze.noteStoredLastPrompt($r);
  let $n = G?.kind === "interrupted_prompt",
    ut = new Set(),
    Yt = $r === void 0 ? void 0 : y.findLast((O) => O.uuid === $r),
    heldBackResult = null,
    kn = 0,
    En = () => heldBackResult !== null && ic.isKairosCronEnabled() && !uN(x.maxBudgetUsd),
    Mr = () => ze.inputClosed && En() && isTidySlothGateOn(),
    Pn = x.remoteControlForkChild ?? null,
    oo = isBridgeForkSupported(x.sdkUrl),
    No = !1,
    Fr = () => {
      if (No) return;
      ((No = !0), setImmediate(releaseStartupWork, e.host, "host_initialized"));
    },
    Xo = 0,
    fi = !1,
    withResolvers = Promise.withResolvers(),
    Gr = x.parkLane.runsBeforeClear
      ? () => Promise.resolve(!0)
      : createTeardownStatusReporter({
          io: n,
          details: Ae?.details,
          holding: () => Ie.holdingParkedPermission(),
          statusTaken: () => ze.running || n.hasStandingPrompt(),
          tornDown: () => isShuttingDown() || isTerminalShutdown(),
          whenTornDown: () => withResolvers.promise,
          boundMs: COST_PUSH_INTERVAL_MS,
          onUnconfirmed: (O) =>
            logForDebugging(
              `[print.ts] A parked permission's call was not run: its record's delete was not confirmed (${O})`,
              { level: "warn" },
            ),
          onError: (O, Q) => logError(Q),
        }),
    Bi = !1,
    Hi = !1,
    ja = !1,
    Qa = n.isRemoteTransport()
      ? new UnattendedStartRecord(
          n,
          x.restoredWorkerMetadata ?? null,
          { flagsFetched: initializeGrowthBook, exiting: isTerminalShutdown },
          x.unattendedStartsTimings,
        )
      : void 0,
    It = new Map(),
    Ie = new ParkedPermissionController({
      markAnswer: Qa?.answers,
      parkedPermission: Ae,
      holdOpenFor: x.holdOpenFor,
      interruptedTurnsPrompt: Dr,
      fromInterruptedTurnsPrompt: userMessagePlatformFields(y, Dr),
      turnInterruptionState: G,
      supersededToolUseIds: Z,
      bootRetiredToolUseIds: Ue,
      answeredToolUseIds: x.answeredToolUseIds,
      initParkReport: nt,
      pendingActionClass: ce,
      cutOffAgentCalls: collectResumableAgentIds(x.supersededToolNames).size,
      resumedAgentCalls: x.agentResumes?.flatMap((O) => O.call ?? []),
      keptSubagentAsk: x.keptSubagentAsk,
      servedCallsToAdopt: x.servedCallsToAdopt,
      servedCallsNeverSent: x.servedCallsNeverSent,
      journaledServedCalls: x.journaledServedCalls,
      withdrawCard: (O) => n.write({ type: "control_cancel_request", request_id: O }),
      retirementWriter: {
        append: (O) => recordTranscript(O, void 0, void 0, void 0, x.storageV5),
        flush: () => flushSessionStorage(),
        storedForNextWorker: async (O) => (
          await n.flushInternalEvents(),
          n.refusedInternalEvents(O).length === 0
        ),
      },
      endStoppedTurn: (O) => {
        let Q = interruptedPromptUuid(G),
          he;
        try {
          let ke =
            G?.kind === "interrupted_prompt"
              ? Ct.findIndex((rt) => rt.uuid === G.message.uuid && isInterruptMarkerRow(rt))
              : -1;
          he =
            Q === void 0
              ? void 0
              : heldUuidsAnsweredByTurn(
                  [
                    ...Ct.filter(
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
          listed: he,
          retirementRows: O,
          othersToCome:
            ze.endSessionRequested || isShuttingDown() || isTerminalShutdown()
              ? 0
              : hasBatchableQueuedPrompt(messageQueue) + (ze.intentBatchInFlight && Bi ? 1 : 0),
        }))
          output.enqueue(ke);
      },
      clearBeforeRun: Gr,
      receivedAnswersRead: () => n.whenReceivedAnswersRead(),
      answers: applyPermissionAnswerChanges,
      lane: x.parkLane,
      io: n,
      drain: ze,
      messageQueue: messageQueue,
      declinedRedeliveries: jn,
      store: me,
      kick: () => void Os(),
      isShuttingDown: isShuttingDown,
      isTerminalShutdown: isTerminalShutdown,
      findUnresolvedToolUse: createUnresolvedToolUseFinder({
        supersededToolUseIds: Z,
        tookOverAPrompt: Ae !== void 0,
        storageV5: x.storageV5,
      }),
      reportInheritedPromptDecided: () => dL(),
      reportIdleAtTurnEndAllowed: () => Ic(),
      dropLoaderSyntheticRows: ig,
      removeInterruptedMessage: (O) => {
        let index = Ct.findIndex((ke) => ke.uuid === O.uuid),
          he =
            index === -1
              ? void 0
              : Ct.slice(index + 1).findLast((ke) => ke.type === "assistant" && ke.isApiErrorMessage === !0);
        if (he !== void 0) It.set(O.uuid, he);
        removeInterruptedMessage(Ct, O);
      },
      putAheadOfLoaderRows: (O) => restoreInterruptedPrompt(Ct, G, O),
      sendsTheInterruptedTurnHolds: (O) => answeredHeldUuids(Ct, O.uuid),
      sendsOfTheCompactedTurn: (O, Q) => runningTurnSendsForTurn(Ct, O.uuid, Q),
      sendsTheParkedTurnTookIn: (O, Q) => getParkedTurnSendUuids(Ct, O.uuid, Q),
      adoptedServedCallsCommand: (O) =>
        buildOrphanedPermissionPrompt({
          calls: O,
          tools: h,
          supersededToolNames: x.supersededToolNames,
          servedCallsNeverSent: x.servedCallsNeverSent,
        }),
      lostCallsNote: (O, Q) => ccrLostCallsNote(x, O, Q),
      inFlightServedCalls: () => Po.get(ServedCallRegistry),
      presentAdoptedHostTools: (O) => countPowerShellCallsWhenDisabled(Po.get(BridgeToolProvider), O),
      servedElsewhere: (O, Q) => isRemoteCapableCall(O, Q, h),
    }),
    on = (O) => {
      try {
        return O();
      } catch (error) {
        return (logError(error), []);
      }
    },
    Zn = (O) => {
      try {
        return Ie.declinesWithdrawalOf(O);
      } catch (error) {
        return (logError(error), !0);
      }
    },
    Nn = new SdkResultReporter({ recentErrors: () => getInMemoryErrors().map((O) => O.error) }),
    Cr = re,
    mr = !1;
  clearTeardownUnwind();
  let io = new Map(),
    Hr = () =>
      ze.abortController !== void 0 &&
      ze.abortController.signal.aborted &&
      shutdownInterruptStamp(ze.abortController.signal) === !0,
    es,
    Ys = () => {
      if (es !== void 0) (clearInterval(es), (es = void 0));
    },
    ou = () => {
      let maxBudgetUsd = x.maxBudgetUsd;
      if (maxBudgetUsd === void 0 || es !== void 0) return;
      ((es = setInterval(
        (Q, he, ke, rt, dt, Gt) => {
          try {
            if (isShuttingDown() || dt()) {
              ke();
              return;
            }
            if (
              stopAgentsOverBudget({
                maxBudgetUsd: he,
                abortedForShutdown: !1,
                turnAborted: !0,
                getAppState: Q,
                setAppState: rt,
                storageV5: Gt,
              })
            ) {
              ke();
              return;
            }
            if (!hasAwaitedRunningTaskIn(Q().tasks)) ke();
          } catch (error) {
            (ke(),
              logFeatureBad("per_task_stop_sparing", "budget_poll_sweep_throw"),
              logError(error),
              logForDebugging(
                "[print.ts] spared-budget poll sweep failed; poll disarmed (error in error log when reporting is enabled)",
                { level: "error" },
              ));
          }
        },
        100,
        w,
        maxBudgetUsd,
        Ys,
        P,
        Hr,
        x.storageV5,
      )),
        es.unref?.());
    },
    ga = () => isShuttingDown() || Hr() || ze.endSessionRequested || ze.inputClosed,
    Ni = new KeepaliveAfterStop({
      sendKeepAlive: createKeepAliveSender(n.outbound),
      getTasks: () => w().tasks,
      getTurnSignal: () => ze.abortController?.signal,
      isSessionEnding: ga,
    }),
    Rd = () => {
      let O = { taskRegistry: createTaskFramework(w, P), setAppState: P, storageV5: x.storageV5 };
      if (getSdkPerTaskStopAffordance())
        (logFeatureOk("per_task_stop_sparing", { spared: !0 }), stopObserverAgents(O), ou());
      else (logFeatureOk("per_task_stop_sparing", { spared: !1 }), stopAllRunningTasks(O));
      return (Ni.arm(), O);
    },
    Ro = new PrewaitLatch({ messageQueue: messageQueue, commandLacksUserIntent: isPassiveCommand }),
    subscribe = bVe.subscribe((O) => {
      for (let Q of O) Q.handedOffTurn?.release?.();
    }),
    Wo = createAbortController(500),
    ha = createAbortController(500),
    Wi = new Map(),
    output = n.outbound,
    yi = createKeepAliveSender(output),
    _a = !1,
    to = !1,
    sigintHandler = () => _a || to || output.ended || isTerminalShutdown();
  Oz(n, output);
  let Ks = () => isShuttingDown() || isTerminalShutdown() || isTeardownUnwindRequested() || to,
    $a = createFetchHoldRegistry({ stopping: Ks }),
    Cd;
  if (n instanceof RemoteIO && n.onCommandLifecycle !== void 0)
    n.onCommandLifecycle = $a.through(n.onCommandLifecycle);
  if (Qs) Qs.sessionInboxPointers.of(e).tapCommandLifecycle(n);
  (Nli(n),
    watchCommentWakeLifecycle(n),
    (rCo.of(e).listener = (O) => reportCommentWakesStarted("queued_notification", O)));
  let vn = null;
  transportStateByHost.of(e).remoteBridgeLive = () => vn !== null;
  let ts = !1,
    Ka = 0,
    zr,
    _s,
    Xs = !1;
  function is(O) {
    if (Xs) return;
    if (zr) zr.noteModeChoice(O);
    else if (_s !== void 0) _s = O;
  }
  function as(O) {
    Xs = !0;
    try {
      P(O);
    } finally {
      Xs = !1;
    }
  }
  let So = createBridgeSdkController({ storageV5: x.storageV5 });
  function Pl(O, Q) {
    return {
      session_url: getRemoteSessionUrl(O.bridgeSessionId, O.sessionIngressUrl),
      connect_url: buildBridgeConnectUrl(O.environmentId, O.sessionIngressUrl),
      environment_id: O.environmentId,
      bridge_epoch: Q,
      bridge_session_id: O.bridgeSessionId,
    };
  }
  let resolved = Promise.resolve(),
    Jr,
    Bs,
    ji = !1,
    Qi,
    Ad = compactionPreservedRows(y, Dr),
    ka = () => Ie.cutOffTurnIsStillOwed() || isTeardownUnwindRequested(),
    Oo = new UserFrameIntake({
      admissionBarrier: () => sN.of(e),
      firstTurnGate: () => Jr,
      messageQueue: messageQueue,
      drain: ze,
      receivedMessageUuids: of_2,
      declinedRedeliveries: jn,
      io: n,
      transcriptForFrame:
        pn.size > 0
          ? wrapPersistenceWithFollowupCheck(
              createPersistenceChecker({ storageV5: x.storageV5, heldInMemory: Lt }),
              (O) => pn.has(O) && getSessionId() === _n && isSelfHostedHeldRecognition(),
              async (O) => countUserPromptsFromEntries_4(await loadSessionTranscriptRows(_n, x.storageV5), O),
            )
          : createPersistenceChecker({ storageV5: x.storageV5, heldInMemory: Lt }),
      kick: () => void Os(),
      retirementMayLandDuringReads: () => Ie.retirementMayLandDuringReads(),
      rescueOwnsReRun: () => Ie.rescueOwnsReRun(),
      idleTeeAllowed: () => Ic() && !n.hasStandingPrompt(),
      heldForParkedTurn: (O) => Ie.heldMessage() === O || Ie.waitsForItsReRun(O),
      summarisedAway: (O) =>
        classifyRedeliveredRow(O, {
          loadedCompaction: Ad,
          carriesTheCutOffTurnOn: () => Ie.hasCarriedTheCutOffTurnOn(),
          anInheritedPromptWaits: () => Ie.inheritedPromptPending(),
          startedAtMs: (Q) => n.userFrameStartedAtMs(Q),
          noteCopyAwaitsTheCutOffTurn: () => Ie.noteCopyAwaitsTheCutOffTurn(),
          cutOffTurnIsStillOwed: ka,
        }),
      cutBehindItsCompaction: (O) =>
        !Ie.hasCarriedTheCutOffTurnOn() &&
        isRowFromLoadedCompaction({ uuid: O, conversation: Ct, loadedCompaction: Ad }),
      readAgain: (O) => n.readAgain(O),
      startAborted: (O) => Ro.startQueuedMessageAborted(O),
      earlierStartOf: (O) => {
        let userFrameStartedAtMs = n.userFrameStartedAtMs(O);
        return userFrameStartedAtMs === void 0
          ? void 0
          : {
              startedAtMs: userFrameStartedAtMs,
              inheritedPromptPending: Ie.inheritedPromptPending(),
              conversationHasCompactBoundary: Ct.some(isCompactBoundaryMessage),
              conversationHasMessageAsQueuedCommand: Ct.some((he) => getSourceUuid(he) === O),
              followUp: foldedFollowUpTelemetry(x.followUpsAtStartUp?.get(O), {
                cardCanBeHeld: Ie.inheritedPromptHoldCapable(),
                openerKnown: Dr !== void 0,
              }),
              endedTurnsCopy: compactionCopyTelemetry({
                uuid: O,
                loadedCompaction: Ad,
                carriesTheCutOffTurnOn: Ie.hasCarriedTheCutOffTurnOn(),
                finishedTail: nBo(G),
                growthBookCold: jSt(),
              }),
            };
      },
      leftToReRun: (O) => Ie.reRunAnswers(O),
      takenInAtAPrompt: (O) => (Ie.cardsTurnTookIn(O) ? ka : void 0),
      finishedAtStartUp: (O) =>
        tailDiagnosticsFields(nBo(G), {
          uuid: O,
          nowMs: Date.now(),
          commandsDequeued: ze.dequeueCount,
          rerunOwed: Ie.rescueOwnsReRun(),
          shuttingDown: ze.endSessionRequested || isShuttingDown() || isTerminalShutdown(),
        }),
      noteReportedDoneUnrun: (O) => reportRedeliveredFollowupClosed(Ct, O, "on_arrival"),
      storeRewindStandIn: Mn,
    }),
    Vi = serializeCalls((O) => O()),
    resolved_2 = Promise.resolve(),
    Ps = 0,
    diskBehindReminder = x.diskBehindReminder,
    wa,
    Hs,
    Si = new Set(),
    Ms;
  function Od() {
    if (!Ms) return;
    let O = 0;
    while (O < Ms.length && Ms[O]?.uuid === Ct[O]?.uuid) O++;
    Ms.length = O;
  }
  function Dd() {
    if (!vn) return;
    So.noteTranscriptLocation();
    try {
      let O = Ps > Ct.length ? 0 : Ps,
        Q = [],
        he = [];
      for (let ke of Ct.slice(O)) {
        if (!isEligibleBridgeMessage(ke) || Si.has(ke.uuid)) continue;
        if (isCompactBoundaryOrSummary(ke) && isCompactPairWithheldFromRemote()) {
          he.push(ke);
          continue;
        }
        Q.push(ke);
      }
      if (Hs !== void 0) {
        let { anchor: anchor, userMessageUuid: userMessageUuid } = Hs,
          dt = anchor === void 0 ? -1 : Ct.indexOf(anchor);
        if (anchor === void 0 || dt !== -1) {
          let Gt;
          for (let pt of Ct.slice(dt + 1)) {
            if (isCompactBoundaryMessage(pt)) {
              Gt = void 0;
              break;
            }
            if (!Z0n(pt)) continue;
            if (Gt === void 0 || supersedesMessage(pt, Gt)) Gt = pt;
          }
          if (Gt !== void 0 && Q.includes(Gt))
            vn.stampReply({ assistantUuid: Gt.uuid, userMessageUuid: userMessageUuid });
        }
      }
      if (Q.length > 0) vn.writeMessages(Q);
      for (let ke of Q) Si.add(ke.uuid);
      for (let ke of he) Si.add(ke.uuid);
      Ps = Ct.length;
    } catch (error) {
      logForDebugging(`[bridge:sdk] transcript forward failed: ${toError(error).message}`, {
        level: "error",
      });
    }
  }
  function ws() {
    let O = drainTaskNotifications();
    if (O.some((Q) => Q.type === "conversation_reset"))
      ((Ps = 0),
        Od(),
        clearLateSessionStartRows(Rc, x.overdueSessionStartHooks),
        (diskBehindReminder = void 0),
        (wa = void 0),
        Pn?.discardSeed());
    if (vn && O.length > 0)
      try {
        let Q = isBridgeStateFramesEnabled();
        if (!Q && O.some((ke) => ke.type === "conversation_reset")) setCurrentForKey(e, void 0);
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
        let he = getBridgeSubagentFrameGate();
        if (shouldForwardSubagentMessage(he, O)) vn.writeSdkMessages([O]);
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
        { level: "error" },
      );
    }
  }
  function Va(O, Q) {
    return {
      type: "system",
      subtype: "status",
      status: null,
      permissionMode: O,
      uuid: Q,
      session_id: getSessionId(),
    };
  }
  function Ga() {
    if (!isSdkBridgeStateAnnounceEnabled()) return;
    ns(Va(toExternalPermissionMode(w().toolPermissionContext.mode), randomUUID_19()));
  }
  let su = installSdkEventDrain({ drain: ws, emit: (O) => output.enqueue(O) });
  if (x.outputFormat === "stream-json" && x.sessionMirror)
    addSessionMirror((O, Q) => {
      n.write({ type: "transcript_mirror", filePath: O, entries: Q });
    });
  let Vs = () => {},
    Fd = () => {
      if ((logForDiagnosticsNoPII("info", "shutdown_signal", { signal: "SIGINT" }), isShuttingDown())) {
        markStdoutDrainExternallyClocked();
        return;
      }
      if (ze.abortController && !ze.abortController.signal.aborted)
        ze.abortController.abort(userAbortReason("user-cancel"));
      (Vs(),
        Wo.abort(),
        ha.abort(userAbortReason("user-cancel")),
        markStdoutDrainExternallyClocked(),
        gracefulShutdown(0));
    };
  process.on("SIGINT", Fd);
  let iu = !1,
    Al = () => {
      if (iu || isShuttingDown()) return;
      ((iu = !0),
        latchTerminalShutdown(),
        f3n(),
        Vs(),
        Wo.abort(),
        ha.abort(userAbortReason("shutdown")),
        gracefulShutdown(143));
    };
  (process.on("SIGTERM", Al),
    markPrintModeSignalHandlersRegistered(),
    n.setOnStreamClosedWithParkedQuestion(() => {
      if ((requestTeardownUnwind(), Ys(), ze.abortController && !ze.abortController.signal.aborted))
        ze.abortController.abort(userAbortReason("shutdown"));
    }),
    registerCleanup(async () => {
      if (vn) So.persist(vn);
      (withResolvers.resolve(),
        Ie.onShutdown(),
        Nn.reportTerminatedOnShutdown({
          aborted: ze.abortController?.signal.aborted === !0,
          runPhase: ze.runPhase,
          exitCode: typeof process.exitCode === "number" ? process.exitCode : void 0,
        }));
      let O = {};
      for (let Q of getRunningTasks(w())) if (waitForTaskCompletion(Q)) O[Q.type] = (O[Q.type] ?? 0) + 1;
      (logForDiagnosticsNoPII("info", "run_state_at_shutdown", () => ({
        run_active: ze.running,
        run_phase: ze.runPhase,
        worker_status: n.sessionState.getState(),
        internal_events_pending: n.internalEventsPending,
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
      })),
        logEvent("tengu_shutdown_pending_state", {
          had_live_turn: ze.running,
          worker_status: fromEnum(n.sessionState.getState()),
          pending_human_requests: n.pendingHumanRequestCount,
          replies_left_for_next_process: n.repliesLeftForNextProcess,
          internal_events_pending: n.internalEventsPending,
          exiting: isTerminalShutdown(),
        }));
    }));
  function za(newMode) {
    return emitStatusMessage({ io: n, getAppState: w }, newMode);
  }
  installPermissionModeReporter({ io: n, getAppState: w }, (O, Q) => {
    if ((is(O), isSdkBridgeStateAnnounceEnabled())) ns(Va(O, Q));
    _Le("mode-changed");
  });
  {
    let O = alwaysFalse_2()
      ? makePermissionModeReader(w, za)
      : () => notifyProactivityChanged(n.sessionState, w());
    ((n.sessionState.onProactivityLevelChanged = O), onProactivitySelectorChange(O));
  }
  if (x.planModeOnResume === "restored" || x.planModeOnResume === "declined")
    n.sessionState.notifyPermissionModeChanged(w().toolPermissionContext.mode);
  createPeerMessageRouter({
    output: output,
    io: n,
    hostIngressLanes: of_3,
    readMode: () => {
      let toolPermissionContext = w().toolPermissionContext;
      return {
        mode: toolPermissionContext.mode,
        isBypassPermissionsModeAvailable: toolPermissionContext.isBypassPermissionsModeAvailable,
      };
    },
    remoteTransport: n instanceof RemoteIO,
    publishesAvailability: Boolean(env.CLAUDE_CODE_REMOTE || x.sdkUrl),
  });
  {
    let { startCrossSessionHoldReceipt: startCrossSessionHoldReceipt } = require("./chunk-hgkbg5ez.js"),
      Q = startCrossSessionHoldReceipt({
        clock: {
          setTimeout: (he, ke) => {
            let rt = setTimeout(he, ke);
            return (rt.unref(), () => clearTimeout(rt));
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
        hidesFoldedNotices: !0,
      });
    registerCleanup(async () => Q());
  }
  let Nr;
  if (env.CLAUDE_CODE_REMOTE) {
    let O = (Q) => {
      output.enqueue({
        type: "active_goal",
        value: Q ? serializeGoalState(Q) : null,
        uuid: randomUUID_19(),
        session_id: getSessionId(),
      });
    };
    ((n.sessionState.onActiveGoalChanged = O),
      O(w().activeGoal),
      (Nr = installAutocompactStateReporter({
        session: e,
        sessionState: n.sessionState,
        enqueue: (status) => output.enqueue(status),
        readInputs: () => Il(),
        reportContextUsage: () => report(),
      })));
  } else if (
    ((n.sessionState.onAutocompactInputsChanged = () => {
      (report(), buildBridgeInitializeCommands(Il));
    }),
    x.sdkUrl)
  )
    initializeGrowthBook()
      .catch(() => {})
      .then(() => report());
  let Do = new BangCommandRunner(),
    Ya = new RemoteMcpTaskTracker(),
    ni = new Set(),
    rateLimitListener = (limits) => {
      ni.add(limits);
      let Q = () => {
        ni.delete(limits);
      };
      return (limits.then(Q, Q), limits);
    },
    rateLimitInfo = serializeCalls((O) => O()),
    resolved_3 = Promise.resolve(),
    pr = 1 / 0,
    qo = createPromptSuggestionEmitter({
      emit: (O) => output.enqueue(O),
      promptSuggestions: () => x.promptSuggestions,
      shuttingDown: isShuttingDown,
      holdsResults: () => th.holdsResults(),
      messages: y,
      getAppState: w,
    }),
    oi;
  if (x.enableAuthStatus)
    oi = AwsAuthStatusManager.getInstance().subscribe((Q) => {
      output.enqueue({
        type: "auth_status",
        isAuthenticating: Q.isAuthenticating,
        output: Q.output,
        error: Q.error,
        uuid: randomUUID_19(),
        session_id: getSessionId(),
      });
    });
  let ds = createRateLimitFrameRelay({
      emit: (O) => output.enqueue(O),
      sessionState: n.sessionState,
      bridgeHandle: () => vn,
    }),
    Ct = y,
    cs = new OwnCardDeadline({ io: n, mainTranscript: () => Ct, isSessionEnding: ga }),
    onRequestPending = n.onRequestPending(() => cs.arm()),
    rs = Ebe({
      keep: (O) => {
        Ct.push(...O);
      },
      rows: () => Ct,
      list: Ct,
      isHookable: !0,
    }),
    filtered = (x.openingRowsMade ?? []).filter((O) => Ct.includes(O));
  if (filtered.length > 0) {
    let readFileState = appendRowsWithHooks(rs, filtered, { fills: !0 });
    if (readFileState instanceof Promise) readFileState.catch(logError);
  }
  headlessProfilerCheckpoint("before_extractReadFiles");
  let fs = extractReadFilesFromMessages(y, cwd(), ZC);
  headlessProfilerCheckpoint("after_extractReadFiles");
  let withResolvers_2 = Promise.withResolvers();
  if (isResumeFrameSeedEligible()) {
    if (
      (applyArtifactResumeCarry(
        P,
        collectResumeArtifactCarry(y, { origin: x.initialMessagesOrigin ?? "local", seedEligible: !0 }),
      ),
      y.some((O) => O.type !== "system"))
    )
      rearmHeadlessCommentMonitors({
        initialMessages: y,
        hostInitialized: withResolvers_2.promise,
        getAppState: w,
        storageV5: x.storageV5,
        transcriptAnchor: x.transcriptAnchor,
        buildContext: () =>
          ask(yc(_c()), { abortController: new AbortController(), userSpecifiedModel: userSpecifiedModel }),
        emit: (O) => {
          for (let Q of O) output.enqueue(informationalSystemMessage(Q));
        },
      });
  }
  (Bis("messages", () => ({ entries: Ct.length })),
    Bis("file_state_cache", () => ({ entries: fs.size, bytes: fs.calculatedSize })));
  let xd = new Map(),
    Po = new InstanceRegistry();
  zti(e, Po);
  let ps = x.sessionHooks ?? Spe(),
    Ja = efe(),
    clients = w().mcp.clients,
    hr = _tt(
      getCurrentSessionIsolationLatch() ??
        findIsolationLatchFromHistory(y, h, DEFAULT_EXEMPT_SERVERS, clients, e),
      (O) => saveIsolationLatch(O, x.storageV5),
    );
  if ((kAe.of(e.host).absorb(y), !isParkedSpare())) devIntentTracker.of(e.host).start();
  let pendingSeeds = nv(ZC);
  function va() {
    for (let [O, Q] of pendingSeeds.entries()) {
      let he = fs.get(O);
      if (!he || Q.timestamp > he.timestamp) fs.set(O, Q);
    }
  }
  function Ld() {
    (va(), pendingSeeds.clear());
  }
  let ba = [],
    jo;
  function Gs(O) {
    if (jo?.getMessages() === Ct) jo.appendMessages(O);
    else {
      let Q = appendRowsWithHooks(rs, O);
      if (Q instanceof Promise) Q.catch(logError);
    }
  }
  Ie.resumeInterruptedTurn();
  function ig() {
    dropRedundantResumeMessages(Ct, G, (O) => {
      if (Ps > O) Ps -= 1;
      Od();
    });
  }
  Ie.walkBackKeptRegistrationWithoutPark();
  let lc = describeInterruptedTasks(x.restoredOrphans ?? [], {
    interruptionKind: G?.kind ?? "none",
    hasQueuedMainThreadCommand: messageQueue.peek(im) !== void 0,
    deferredResumePending: re !== void 0,
    rescueSuppressed: x.rescueSuppressed ?? !1,
    enabled: getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_orphan_restore_wake", !0),
    includeShells: getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_orphan_restore_wake_shells", !0),
    hasTool: (O) => findToolByName(h, O) !== void 0,
    alsoResumable: x.alsoResumable,
    autoResumed: new Set(x.agentResumes?.map((O) => O.agentId)),
    lostTimers: x.lostSessionTimers ?? [],
  });
  if (lc) {
    let { command: command, counts: counts } = lc;
    (logEvent("tengu_ccr_orphan_restore_wake", {
      orphan_count: x.restoredOrphans?.length ?? 0,
      wake_agent_count: counts.agent,
      wake_monitor_count: counts.monitor,
      wake_shell_count: counts.shell,
      wake_timer_count: x.lostSessionTimers?.length ?? 0,
    }),
      logForDebugging("[print.ts] Waking the session for background tasks or timers lost to the restart"),
      messageQueue.enqueuePendingNotification(command));
  }
  let Im = () => {
      let modelOptions = buildModelPickerOptions();
      return {
        models: toSdkModelInfos(modelOptions.filter((option) => !option.disabled)),
        unavailable: toSdkModelInfos(getUnavailableModelRows(modelOptions)),
      };
    },
    userSpecifiedModel = x.userSpecifiedModel;
  JPs(() => {
    userSpecifiedModel = void 0;
  });
  function Ao() {
    return Okr(userSpecifiedModel);
  }
  let Xa = pRe()
      ? createUsageLimitWaitHeartbeat({
          readMainLoopModel: () => Ao() ?? getMainLoopModel(),
          emit: (O) => output.enqueue({ ...O, uuid: randomUUID_19(), session_id: getSessionId() }),
        })
      : () => {},
    Il = () => ({
      messages: Ct,
      model: Ao() ?? getMainLoopModel(),
      autoCompactWindow: w().autoCompactWindow,
      resetBoundary: bUt(e),
    }),
    Om = () => vg({ detail: "summary" }),
    { report: report, reportAtTurnEnd: reportAtTurnEnd } =
      env.CLAUDE_CODE_REMOTE || x.sdkUrl
        ? createContextUsageReporter(n.sessionState, Il, Om)
        : { report: () => {}, reportAtTurnEnd: () => {} };
  report();
  let hasEffort = restoreThinkingSettingsFromRecord({
      launch: () =>
        new ThinkingDisplayState(
          x.thinkingConfig,
          x.thinkingConfigExplicit === !0 ? x.thinkingConfig : void 0,
        ),
      startupDisplay: void 0,
      recorded: x.recordedThinking ?? { malformed: !1 },
      report: (O) => n.sessionState.notifyInternalMetadataChanged(O),
      log: ({ outcome: outcome, message: message, thinkingOff: thinkingOff }) => {
        (logEvent("tengu_thinking_budget_restored", {
          outcome: fromEnum(outcome),
          thinking_off: thinkingOff,
        }),
          logForDebugging(`[print.ts] ${message} (thinking_off=${thinkingOff})`));
      },
    }),
    {
      conversationModel: conversationModel,
      injectModelSwitchBreadcrumbs: injectModelSwitchBreadcrumbs,
      noticeRestrictedModel: noticeRestrictedModel,
      recordAllowedModelApplied: recordAllowedModelApplied,
      noticeFlagSettingsModel: noticeFlagSettingsModel,
    } = createModelChangeNotices({
      session: e,
      messages: () => Ct,
      appendToConversation: Gs,
      enqueue: (O) => output.enqueue(O),
      isLaunchModelPick: () => kv(),
    });
  function qd(O) {
    let Q = createSystemMessage(O, "info");
    Gs([Q]);
    let he = {
      type: "system",
      subtype: "informational",
      content: O,
      level: "notice",
      uuid: Q.uuid,
      session_id: getSessionId(),
    };
    output.enqueue(he);
  }
  let td = env.CLAUDE_CODE_HOST_PROMPT_SUPERSEDES_RECORD,
    nd = {
      surface: lit("print"),
      session: e,
      storageV5: x.storageV5,
      credentials: x.credentials,
      readAppState: w,
      getActiveModel: () => userSpecifiedModel,
      applyModel: (O) => {
        ((userSpecifiedModel = O),
          setMainLoopModelOverride(O),
          P((Q) => ({ ...Q, mainLoopModelForSession: O })),
          n.sessionState.notifyMetadataChanged({ model: O }));
      },
      dropUnconfirmedLaunchModel: (O) => {
        let hasAdaptiveThinking = modelToRestoreAfterRefusal({
          refused: O,
          launch: x.userSpecifiedModel,
          active: userSpecifiedModel,
          restored: getMainLoopModelOverride(),
          turnDispatched: e.requestJournal.mainThreadRequestedInProcess(),
        });
        if (hasAdaptiveThinking === void 0) return !1;
        return ((userSpecifiedModel = hasAdaptiveThinking), !0);
      },
      noticeRestrictedModel: noticeRestrictedModel,
      recordAllowedModelApplied: recordAllowedModelApplied,
      getConversationModel: () => conversationModel(getMainLoopModel()),
      injectModelSwitchBreadcrumbs: injectModelSwitchBreadcrumbs,
      setSystemPrompt: (O) => {
        if (!x.systemPrompt) td = !1;
        ((x.systemPrompt = O), noteSystemPromptSectionInvalidation("sdk_system_prompt"));
      },
      isLaunchModelPick: () => kv(),
    },
    Ta = () => checkAutoModeTransition(w().toolPermissionContext, as, w().fastMode, qM),
    jd = () => isAutoModeTransitionDue(w().toolPermissionContext, w().fastMode);
  function uu() {
    if (modelSupportsAutoMode(getMainLoopModel())) return;
    let { mode: mode } = w().toolPermissionContext;
    if (mode === "auto")
      setPermissionModeWithGuards(
        "default",
        w().toolPermissionContext,
        (Q) => as((he) => ({ ...he, toolPermissionContext: Q(he.toolPermissionContext) })),
        "auto_gate_denied",
      );
    else if (mode === "plan" && isAutoModeActive())
      P((Q) => ({ ...Q, toolPermissionContext: transitionPlanAutoMode(Q.toolPermissionContext) }));
  }
  if (n instanceof RemoteIO) n.settleVouchedModelOrEffort(isAutoModeCapableModel);
  let mu = (O) => n instanceof RemoteIO && n.takeVouchedModelOrEffortRequest(O);
  async function mc(O) {
    if (O) {
      await checkAutoModeInUse(w().toolPermissionContext, as, w().fastMode);
      return;
    }
    (uu(), await Ta());
  }
  let fu = (O) => {
      let Q = O == null || O.trim().toLowerCase() === "default",
        he = Q ? getDefaultMainLoopModel() : O,
        ke = Q ? managedDenyStartupRefusal(he, "switch") : null;
      if (ke !== null) return { ok: !1, error: ke };
      if (!Q) {
        let Dt = logUnrecognizedModelSwitch(he, lit("bridge_print"));
        if (Dt) return Dt;
      }
      let rt =
          !Q &&
          !isExemptDefaultResolvingPick(he) &&
          !(isModelAllowedUnderActiveEnforcement(he) ?? isModelAllowed(he)),
        dt = rt ? stepDownRestrictedFamilyAliasPick(he) : null;
      if (rt && dt === null) {
        let Dt = Ao();
        return (
          noticeRestrictedModel(he, Dt),
          { ok: !1, error: formatModelRestrictedNotice(he, Dt ?? getMainLoopModel()) }
        );
      }
      let Gt = dt ?? he,
        pt = () => {
          let Dt = w();
          return {
            mainLoopModel: Dt.mainLoopModel ?? userSpecifiedModel ?? getMainLoopModel(),
            mainLoopModelForSession: Dt.mainLoopModelForSession,
            toolPermissionContext: Dt.toolPermissionContext,
          };
        },
        Xt = () => {
          (zE(e, pt(), Q ? null : Gt, "sdk"),
            (userSpecifiedModel = Gt),
            setMainLoopModelOverride(Gt),
            P((On) => ({ ...On, mainLoopModelForSession: Gt ?? null })));
          let { mode: mode } = w().toolPermissionContext;
          if (mode === "auto" && !isAutoModeGateEnabled()) {
            Xs = !0;
            try {
              setPermissionModeWithGuards(
                "default",
                w().toolPermissionContext,
                (On) => P((fn) => ({ ...fn, toolPermissionContext: On(fn.toolPermissionContext) })),
                "auto_gate_denied",
              );
            } finally {
              Xs = !1;
            }
          } else if (mode === "plan" && isAutoModeActive() && !isAutoModeGateEnabled())
            P((On) => ({ ...On, toolPermissionContext: transitionPlanAutoMode(On.toolPermissionContext) }));
          if ((recordAllowedModelApplied(), dt !== null)) noticeRestrictedModel(he, dt);
        };
      if (!WZ(e) && sN.of(e).pending === 0) return (Xt(), jd() ? Ta().then(() => ({ ok: !0 })) : void 0);
      return serializeModelSwitch(e, () =>
        runPreModelSwitchHooks(e, pt, Q ? null : Gt, "sdk")
          .then(async (Dt) => {
            if (Dt.decision !== "proceed")
              return (
                logFeatureSad("model_switch", "blocked_by_hook"),
                { ok: !1, error: describeModelSwitchBlocked(Dt) }
              );
            for (let message of Dt.messages) qd(Nf(message));
            return (Xt(), await Ta(), { ok: !0 });
          })
          .catch((Dt) => (logError(toError(Dt)), { ok: !1, error: "Model switch failed" })),
      );
    },
    pu = { seedSetUltracode: !1 },
    _u = (O) => {
      let Q = seedBridgeEffortLevel(O, { getAppState: w, setAppState: P, latch: pu });
      if (Q.ok) (reportEffortForModel(getMainLoopModel(), w()), na("state_change"));
      return Q;
    };
  x.homeSeed?.handle
    .then((O) =>
      O === null
        ? void 0
        : import("./chunk-twq47pff.js").then(
            ({
              formatHomeAppliedLine: formatHomeAppliedLine,
              formatHomeRestoreLine: formatHomeRestoreLine,
            }) => {
              let ke = (rt) => {
                if (rt === null) return;
                if (rt.level === "debug") {
                  logForDebugging(`[homeSeed] ${rt.text}`);
                  return;
                }
                let dt = createSystemMessage(rt.text, rt.level);
                (Gs([dt]), output.enqueue({ ...dt, session_id: getSessionId() }));
              };
              (O.onApplied((rt) => ke(formatHomeAppliedLine(rt))),
                O.onRestore((rt) => ke(formatHomeRestoreLine(rt))));
            },
          ),
    )
    .catch(() => {
      logForDiagnosticsNoPII("warn", "home_seed_line_wiring_failed", {});
    });
  let Cn = [],
    os = [],
    Ve = [],
    ho = new PendingMcpToolsByServer(),
    $o = new Map(),
    Is = new Set(),
    rd = new Set(),
    Ti = !1,
    Su = 0,
    Lm = () => {
      if (Su > 0) return !0;
      for (let O of Is)
        if (Object.hasOwn(R, O) && Cn.some((Q) => Q.name === O && Q.type === "connected")) return !0;
      return !1;
    },
    hasFastMode = createElicitationRegistrar({
      structuredIO: n,
      session: e,
      storageV5: x.storageV5,
      credentials: x.credentials,
      limits: cA,
      withdrawOn: null,
      onRefused: null,
    });
  async function Ur(O) {
    logMCPDebug(O.name, "Received tools/list_changed notification, refreshing tools");
    let Q = await refreshMcpServerTools(O, () => {}, x.storageV5);
    if (Q.status === "kept-previous") {
      if (
        (logMCPDebug(O.name, "tools/list failed after list_changed \u2014 keeping previous tool set"),
        rd.delete(O.name))
      ) {
        logFeatureSad("mcp_sdk_tools_refresh", "gave_up");
        return;
      }
      (logFeatureSad("mcp_sdk_tools_refresh", "kept_previous"), rd.add(O.name), Is.add(O.name));
      return;
    }
    return (
      rd.delete(O.name),
      logFeatureOk("mcp_sdk_tools_refresh"),
      logEvent("tengu_mcp_list_changed", {
        mcpServerKeyHash: toolNameForTelemetry(O.name),
        type: lit("tools"),
        cause: Y2e(void 0),
        newCount: Q.newTools.length,
      }),
      Q.newTools
    );
  }
  let rr = {
    getAppState: w,
    setAppState: P,
    getDynamicMcpState: () => dynamicMcpState,
    setDynamicMcpState: (O) => {
      dynamicMcpState = O;
    },
  };
  function injectModelSwitchBreadcrumbs_2(modelArg, resolvedModel) {
    return applyMcpReconnect(rr, modelArg, resolvedModel);
  }
  let Bo = new Map(),
    _r = new Map(),
    Ol = async (O, Q, he) => {
      let ke = getMcpClientModule(),
        rt = identityEpoch(),
        dt = (pt) => ({ ...pt, attemptEpoch: rt }),
        Gt = {};
      Bo.set(O, Gt);
      try {
        if (!IM()) return dt(await ke.reconnectMcpServerImpl(O, Q, x.storageV5, x.credentials));
        return dt(
          await (he.distrust
            ? ke.reconnectMcpServerDistrusted(O, Q, x.storageV5, x.credentials)
            : ke.reconnectMcpServerImpl(O, Q, x.storageV5, x.credentials)),
        );
      } finally {
        if (Bo.get(O) === Gt) Bo.delete(O);
      }
    },
    Ca = () => ({ ...hostOwnedConfigs, ...dynamicMcpState.configs }),
    Pa = (O) => {
      let Q =
        w().mcp.clients.find((client) => client.name === O) ??
        dynamicMcpState.clients.find((client) => client.name === O);
      if (!Q && (w().mcp.suppressedPluginMcpServers ?? []).includes(O)) return null;
      return resolveReconnectConfig(O, Ca(), Q?.config, getMcpConfigByName);
    },
    Qd = (O, Q) => {
      if (Q.type === "sdk") return;
      let he = getMcpClientModule(),
        ke = Pa(O),
        rt = !!ke && he.areMcpConfigsEqual(ke, Q),
        dt = [],
        Gt = (Dt) => {
          if (Dt.name !== O) return Dt;
          if (he.areMcpConfigsEqual(Dt.config, Q))
            return Dt.type === "disabled" ? { name: O, type: "pending", config: Q } : Dt;
          if (!rt) return Dt;
          if (!dt.some((On) => he.areMcpConfigsEqual(On, Dt.config))) dt.push(Dt.config);
          return { name: O, type: "pending", config: Q };
        },
        any = dynamicMcpState.clients.some((client) => client.name === O);
      if (any) dynamicMcpState = { ...dynamicMcpState, clients: dynamicMcpState.clients.map(Gt) };
      let any_2 = w().mcp.clients.some((client) => client.name === O);
      if (
        (P((Dt) => {
          if (Dt.mcp.clients.some((clients) => clients.name === O))
            return { ...Dt, mcp: { ...Dt.mcp, clients: Dt.mcp.clients.map(Gt) } };
          if (any || !rt) return Dt;
          return {
            ...Dt,
            mcp: { ...Dt.mcp, clients: [...Dt.mcp.clients, { name: O, type: "pending", config: Q }] },
          };
        }),
        !any_2 && !any && rt && Object.hasOwn(dynamicMcpState.configs, O))
      )
        dynamicMcpState = {
          ...dynamicMcpState,
          clients: [...dynamicMcpState.clients, { name: O, type: "pending", config: Q }],
        };
      for (let connection of dt) he.disposeServerConnectionDetached(O, connection);
    },
    Kd = (O, Q) => {
      let he = injectModelSwitchBreadcrumbs_2(O, Q);
      if (he === "superseded" || (he === "dropped" && R_t(Q.client.config, Q.attemptEpoch)))
        return Q.client.type === "failed" && Q.client.errorCode === "IDENTITY_CHANGED"
          ? Q.client
          : getMcpClientModule().inertReconnectShape(O, Q.client.config).client;
      let ke =
          w().mcp.clients.find((client) => client.name === O) ??
          dynamicMcpState.clients.find((client) => client.name === O),
        rt =
          ke === Q.client ||
          (he === "applied" &&
            ke?.type === "connected" &&
            Q.client.type === "connected" &&
            ke.client === Q.client.client);
      if (ke !== void 0 && rt) {
        if (ke.type === "connected")
          (hasFastMode([ke]), reregisterChannelHandlerAfterReconnect(ke, messageQueue));
        return ke;
      }
      if (ke && (ke.type === "disabled" || ke.type === "failed")) return ke;
      if (!ke && Q.client.config.type === "sdk" && Q.client.type !== "connected") return Q.client;
      return {
        name: O,
        type: "failed",
        config: Q.client.config,
        error: ke ? `Server status: ${ke.type}` : `Server not found: ${sanitizeTelemetryString(O)}`,
      };
    },
    Vd = async (request, extra) => {
      Qd(request, extra);
      let hookResponse = await Ol(request, extra, { distrust: !1 });
      return Kd(request, hookResponse);
    },
    ea = createMcpRetryOrchestrator({
      ...rr,
      storageV5: x.storageV5,
      credentials: x.credentials,
      isControlReconnectInFlight: (O) => Bo.has(O),
    }),
    rw = (O) => {
      if (Zl(O.config)) return !1;
      let Q = Pa(O.name);
      return (
        Q !== null &&
        getMcpClientModule().areMcpConfigsEqual(Q, O.config) &&
        !mcpDialBlockCause(O.name, O.config) &&
        !isMcpServerDisabled(O.name)
      );
    },
    sw = () => !isSingleShotPrintSession() && !isPrintInputClosed() && !Bm,
    aw = createNextTurnRedialer({
      isOpen: sw,
      rows: () => Ns(),
      allows: (O) => w().mcp.clients.includes(O) && rw(O),
      redial: async (O) => {
        let redialFailedRow = await ea.redialFailedRow(O, () => !sw() || !rw(O));
        if (redialFailedRow === "connected" || redialFailedRow === "degraded") {
          let found = Ns().find((ke) => ke.name === O.name);
          if (found !== void 0) reregisterChannelHandlerAfterReconnect(found, messageQueue);
        }
        return redialFailedRow;
      },
    }),
    cU = (O, Q) => {
      let found = w().mcp.clients.find((client) => client.name === O);
      (async () => {
        let ke = identityEpoch();
        try {
          if (found?.type !== "needs-auth" || ir(O, found.config) !== ir(O, Q)) return;
          if (isMcpServerDisabled(O) || mcpDialBlockCause(O, Q)) return;
          let rt = getMcpClientModule(),
            connectToServer = await rt.connectToServer(O, Q, void 0, x.storageV5, x.credentials);
          if (identityEpoch() !== ke) {
            if (connectToServer.type === "connected")
              rt.detachAndCloseConnection(connectToServer).catch(() => {});
            return;
          }
          if (connectToServer.type !== "connected") return;
          let Gt = !!connectToServer.capabilities?.resources,
            [pt, Xt, Dt, On] = await Promise.all([
              rt.fetchToolsForClient(connectToServer, x.storageV5),
              rt.fetchCommandsForClient(connectToServer),
              Promise.resolve([]),
              Gt ? rt.fetchResourcesForClient(connectToServer) : Promise.resolve([]),
            ]);
          if (identityEpoch() !== ke) {
            rt.detachAndCloseConnection(connectToServer).catch(() => {});
            return;
          }
          if ((await rt.peekSettledConnection(O, Q)) !== connectToServer) return;
          let mcp = w().mcp;
          if (mcp.clients.find((client) => client.name === O) !== found) return;
          if (isShuttingDown() || Bm) return;
          let Rt = pickServerResultsAfterRetry(mcp, O, { tools: pt, prompts: Xt, resources: On });
          injectModelSwitchBreadcrumbs_2(
            O,
            applyMcpServerConfig(found.config, {
              client: connectToServer,
              tools: Rt.tools,
              commands: [...Rt.prompts, ...Dt],
              resources: Rt.resources,
              attemptEpoch: ke,
            }),
          );
        } catch (error) {
          logForDebugging(`Failed to adopt reauth-reconnected MCP server ${O}: ${errorMessage(error)}`, {
            level: "warn",
          });
        }
      })();
    };
  function mU() {
    primeDiscoveryCacheFlag();
    let O = fd();
    if (!O && !x.mcpListingsHanded) return;
    (ht().headlessMcpTeardown?.(),
      setConnectedClientWiring((Gt) => {
        (hasFastMode([Gt]), lg([Gt]));
      }));
    let subscribe = ea.subscribe(),
      he = O ? REAUTH_RECONNECT_SIGNAL.subscribe(cU) : void 0,
      ke = O
        ? setIdentityTrippedHandler(
            () =>
              void reconnectMcpOnIdentityChange({
                ...rr,
                storageV5: x.storageV5,
                credentials: x.credentials,
                getHostOwnedConfigs: Ca,
              }),
          )
        : void 0;
    if (O && V4n())
      queueMicrotask(() => {
        if (ht().headlessMcpTeardown !== dt) return;
        reconnectMcpOnIdentityChange({
          ...rr,
          storageV5: x.storageV5,
          credentials: x.credentials,
          getHostOwnedConfigs: Ca,
          force: !0,
        });
      });
    let rt,
      dt = () => {
        (rt?.(), (rt = void 0), subscribe(), he?.(), ke?.(), setConnectedClientWiring(void 0));
        let Gt = ht();
        if (((Gt.headlessConnectorMountInFlight = void 0), Gt.headlessMcpTeardown === dt))
          Gt.headlessMcpTeardown = null;
      };
    ((ht().headlessMcpTeardown = dt), (rt = registerCleanup(async () => dt())), ea.catchUp());
  }
  let dw = !1;
  function fc() {
    if ((primeDiscoveryCacheFlag(), !fd())) return;
    if (!dw) ((dw = !0), getMcpClientModule().seedMcpIdentityCheck());
  }
  let lw = new Set(),
    ag = new Map(),
    uw = (O) => {
      for (let Q of O.filter(isCommsRoledServer))
        ag.set(Q.name, { name: Q.name, type: "disabled", config: Q.config });
    },
    dg = (O) => {
      for (let Q of O) lw.add(Q.name);
      uw(O);
    },
    lg = watchMcpDisconnects({ stores: rr, storageV5: x.storageV5 }),
    Bm = !1,
    cw = createReconnectBackoff({
      ...rr,
      storageV5: x.storageV5,
      credentials: x.credentials,
      isControlReconnectInFlight: (O) => Bo.has(O),
      isRunEnding: () => Bm,
      onReconnected: (O) => reregisterChannelHandlerAfterReconnect(O, messageQueue),
    }),
    clients_2 = w().mcp.clients;
  if (clients_2.length > 0 || r.length > 0) fc();
  (mU(),
    dg([...r, ...clients_2]),
    hasFastMode(clients_2),
    lg(clients_2),
    cw(clients_2),
    L(() => {
      let clients = w().mcp.clients;
      if (clients === clients_2) return;
      if (((clients_2 = clients), dg(clients), clients.length > 0)) fc();
      (hasFastMode(clients), lg(clients), cw(clients));
    }));
  let Ma = serializeCalls(async (O = "redial") => {
    for (let Rt of Ul()) Rt.reassertOwnership();
    for (let Rt of [...Is]) {
      if (!Object.hasOwn(R, Rt)) {
        Is.delete(Rt);
        continue;
      }
      let found = Cn.find((Ar) => Ar.name === Rt);
      if (found?.type !== "connected") continue;
      (Is.delete(Rt), Su++);
      try {
        let Ar = await Ur(found);
        if (Ar !== void 0 && Cn.includes(found))
          ((os = [...filterCommandsByServer(os, Rt), ...Ar]),
            P((no) => ({
              ...no,
              mcp: { ...no.mcp, tools: [...filterCommandsByServer(no.mcp.tools, Rt), ...Ar] },
            })));
      } finally {
        Su--;
      }
    }
    for (let Rt of $o.keys())
      if (
        !Object.hasOwn(R, Rt) ||
        Cn.some((notification) => notification.name === Rt && notification.type === "connected")
      )
        $o.delete(Rt);
    let Q = mcpSyncNeeded(R, Cn);
    if (Q === "none" || (Q === "retry_failed" && O === "skip")) return;
    let he = new Map($o);
    $o.clear();
    let ke = new Set(Object.keys(R)),
      currentServerNames = new Set(Cn.map((Rt) => Rt.name));
    fc();
    for (let Rt of Cn)
      if (!ke.has(Rt.name)) {
        if (Rt.type === "connected") await Rt.cleanup();
      }
    let dt = Q === "retry_failed" && X1n() && qg.firstQueryAhead && Ti && hasFreshGrowthBookFeatures();
    if (!dt) Ti = hasFreshGrowthBookFeatures();
    let Gt = pickReusableMcpClients(R, Cn, dt);
    (headlessProfilerCheckpoint("before_setupSdkMcp"), nyi(Object.keys(Gt).length));
    let setupSdkMcpClients = await getMcpClientModule().setupSdkMcpClients(
      Gt,
      (Rt, Zt) => n.sendMcpMessage(Rt, Zt),
      he,
      x.storageV5,
    );
    headlessProfilerCheckpoint("after_setupSdkMcp");
    for (let client of setupSdkMcpClients.clients) {
      if (client.type !== "connected" || !Is.delete(client.name)) continue;
      let Zt = await Ur(client);
      if (Zt !== void 0)
        setupSdkMcpClients.tools = [...filterCommandsByServer(setupSdkMcpClients.tools, client.name), ...Zt];
    }
    let Xt = mcpServersToReconnect(Cn, R, Gt, dt);
    for (let Rt of Xt) {
      let found = setupSdkMcpClients.clients.find((client) => client.name === Rt.name);
      if (found === void 0) continue;
      if (found.type === "connected") found.cleanup().catch(() => {});
      ((setupSdkMcpClients.clients = setupSdkMcpClients.clients.filter((client) => client !== found)),
        (setupSdkMcpClients.tools = filterCommandsByServer(setupSdkMcpClients.tools, Rt.name)),
        (setupSdkMcpClients.commands = excludeCommandsByServer(setupSdkMcpClients.commands, Rt.name)));
    }
    if (dt) {
      let Rt = mergeMcpToolsAndCommands(Cn, R, Gt, { tools: os, commands: Ve }, setupSdkMcpClients);
      ((setupSdkMcpClients.tools = Rt.tools), (setupSdkMcpClients.commands = Rt.commands));
    }
    let connectedServerNames = new Set(Xt);
    (ho.add(Cn.filter((Rt) => Rt.type === "connected" && !connectedServerNames.has(Rt))),
      (Cn = [...setupSdkMcpClients.clients, ...Xt]),
      (os = setupSdkMcpClients.tools),
      (Ve = setupSdkMcpClients.commands));
    for (let Rt of Cn) if (Rt.type === "connected") $o.delete(Rt.name);
    let On = uniq([...currentServerNames, ...ke]),
      mapped = On.map((Rt) => [Rt, getMcpPrefix(Rt)]);
    P((Rt) => ({
      ...Rt,
      mcp: {
        ...Rt.mcp,
        tools: [
          ...Rt.mcp.tools.filter((name) => !mapped.some(([Ar, no]) => isToolFromMcpServer(name, Ar, no))),
          ...os,
        ],
        commands: [
          ...Rt.mcp.commands.filter((name) => !On.some((Ar) => commandBelongsToServer(name, Ar))),
          ...setupSdkMcpClients.commands,
        ],
      },
    }));
    for (let Rt of Ul()) Rt.reassertOwnership();
    (setupVscodeSdkMcp(Cn, {
      onFeedbackSurveyEvent: (Rt) => notifyVscodeHost(Rt, x.storageV5),
      refusalFallbackSettingToggleVisible: Eir(),
      refusalFallbackLaneEnabled: isRefusalFallbackEnabled(),
      startupAnnouncement: getNextAnnouncementJson(),
      autoDefaultLaunchEnabled: isHarborWillowEnabled(),
      ccrV2SessionCrudEnabled: isCcrV2SessionCrudEnabled(),
      maxEffortReminderEnabled: isMaxEffortReminderEnabled(),
      onAutoDefaultNudgeEvent: (serverName, message) =>
        handleAutoDefaultNudgeEventFromHost(serverName, message, x.storageV5),
      onAdminLimitRequest: fileAdminLimitRequest,
    }),
      installCcdSessionTelemetryProxy(Cn));
  });
  Ma();
  let fU = async (O) => {
      let Q = getOwn(R, O),
        found = Cn.find((rt) => rt.name === O);
      if (Q === void 0 || found?.type === "disabled") return;
      let ke = { name: O, type: "disabled", config: { ...Q, scope: "dynamic" } };
      ((Cn = [...Cn.filter((rt) => rt.name !== O), ke]),
        (os = filterCommandsByServer(os, O)),
        (Ve = excludeCommandsByServer(Ve, O)),
        Is.delete(O),
        rd.delete(O),
        await Promise.all([ho.closeFor(O), found?.type === "connected" ? found.cleanup() : void 0]).catch(
          (rt) => {
            logMCPDebug(O, `Failed to close SDK MCP server after mcp_toggle disabled it: ${rt}`);
          },
        ));
    },
    pU = async (O) => {
      let Q = getOwn(R, O);
      if (Q === void 0) return;
      let found = Cn.find((prev) => prev.name === O);
      if (found?.type === "connected") return found;
      if (found?.type === "disabled" || found?.type === "failed") {
        let ke = { name: O, type: "pending", config: { ...Q, scope: "dynamic" } };
        Cn = Cn.map((rt) => (rt === found ? ke : rt));
      }
      return (await Ma(), Cn.find((name) => name.name === O));
    },
    dynamicMcpState = { clients: [], tools: [], configs: {} },
    create = Object.create(null),
    ug = env.CLAUDE_CODE_REMOTE
      ? partitionOperatorServers(w().mcp.clients, x.mcpConfigOwnership)
      : { hostOwnedConfigs: {}, operatorOwnedMcpConfigNames: new Set(), operatorOwnedConfigs: {} },
    { hostOwnedConfigs: hostOwnedConfigs, operatorOwnedMcpConfigNames: operatorOwnedMcpConfigNames } = ug,
    gU =
      env.CLAUDE_CODE_REMOTE && getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_startup_policy_seed", !0)
        ? ug.operatorOwnedConfigs
        : {};
  if (env.CLAUDE_CODE_REMOTE)
    logForDebugging(
      `[MCP] mcp_set_servers authority: provenance ${x.mcpConfigOwnership === void 0 ? "undeclared (all --mcp-config servers host-owned)" : "declared"}; host-owned=[${Object.keys(hostOwnedConfigs).join(", ")}] operator-owned=[${[...operatorOwnedMcpConfigNames].join(", ")}]`,
    );
  (setMcpClientsAccessor(() => [...w().mcp.clients, ...Cn, ...dynamicMcpState.clients]),
    setMcpServerToolsSwapper(RCs(rr)));
  let od = Array.isArray(s) ? s : [],
    Hm = !1,
    xl = Array.isArray(s)
      ? null
      : (async () => {
          let startTime = performance.now(),
            Q = await s.catch((he) => (logError(he), []));
          if (!Hm) od = Q;
          Br("commands_deferred_join_ms", performance.now() - startTime, startTime);
        })();
  function Ho(O = w().mcp.commands) {
    return commandNamesForBridge(od, O, QRe());
  }
  function cg(O = w().mcp.commands) {
    return Ho(O).filter(isAdvertisedCommand);
  }
  let lo = q,
    buildAllTools = (appState) => {
      let filtered = lo.filter((he) => he.source === "flagSettings");
      ((lo = withLiveRegisteredAgents([...appState, ...filtered])), Wl());
    },
    fw = createPluginFlagTracker(),
    pw = (O) => {
      let Q = getFlagSettingsInline() ?? {},
        retract = fw.retract(Q);
      if (retract === null) return;
      (setFlagSettingsInline(retract),
        settingsChangeDetector.notifyChange("flagSettings"),
        logForDiagnosticsNoPII("info", "plugin_forwarding_retracted", {
          at: O,
          keys: Object.keys(Q).length - Object.keys(retract).length,
        }));
    },
    gw,
    pc,
    gc,
    vu,
    bu;
  async function Sw() {
    try {
      zr?.undo().catch(logError);
    } catch (error) {
      logError(error);
    }
    if (!vn) return;
    let O = vn;
    (n.setOnControlRequestSent(void 0),
      n.setOnControlRequestResolved(void 0),
      setSdkHostedBridgeHandle(null, x.storageV5),
      setCurrentForKey(e, void 0),
      registerLiveSuppressionProbe(void 0),
      (vn = null),
      (ts = !1),
      (vu = void 0),
      (bu = void 0),
      setReplBridgeActive(!1),
      (Ms = void 0),
      So.release(O, { keepRecord: O.neverArchive === !0 }),
      await O.teardown({ reason: "remote_control_disabled" }));
  }
  function kw(O, Q, he, ke) {
    output.enqueue({
      type: "system",
      subtype: "bridge_state",
      state: O,
      detail: Q,
      ...(O === "failed" && { failure_kind: ke ?? "terminal" }),
      bridge_epoch: he,
      uuid: randomUUID_19(),
      session_id: getSessionId(),
    });
  }
  let ww = !1;
  function vw() {
    let O = vn;
    if (!O || ww) return;
    if (connectedBridgePolicyRefusal(O.outboundOnly) === null) return;
    resolved_2 = Vi(async () => {
      let ke = vn === O ? connectedBridgePolicyRefusal(O.outboundOnly) : null;
      if (ke === null) return;
      let rt = Ka;
      try {
        await Sw();
      } finally {
        kw("policy_disabled", ke.detail, rt);
        try {
          (logForDebugging(
            `[bridge:sdk] Org policy now refuses the attached bridge (${ke.policy}: ${ke.kind}); disconnected`,
          ),
            logEvent("tengu_bridge_policy_teardown", {
              lane: lit("sdk_host"),
              policy: fromEnum(ke.policy),
              deny_kind: fromEnum(ke.kind),
              outbound_only: O.outboundOnly,
            }));
        } catch (error) {
          (logForDebugging(`[bridge:sdk] Policy disconnect telemetry failed: ${errorMessage(error)}`, {
            level: "error",
          }),
            logError(error));
        }
      }
    }).catch((ke) => logError(ke));
  }
  function Tw() {
    let O = getMainLoopModel(),
      Q = w();
    return [
      O,
      toExternalPermissionMode(Q.toolPermissionContext.mode),
      getFastModeState(O, Q.fastMode),
      getFastModeUnavailableReasonCode(O) ?? getFastRejectedReason(O, Q.fastMode) ?? "",
      M_e(O, resolveEffortLevel(Q)) ?? "",
      viewTeammateOutput(),
      queuedNotificationCapabilities(Gd(Q), e, () => Us(Ct)).join(","),
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
        let he = vn,
          ke = await getSlashCommandToolSkills(getCwd(), x.storageV5);
        if (vn !== he) return;
        let initJsonSchema = Tw();
        if (!Q?.force && initJsonSchema === vu) {
          bu = getMainLoopModelOverride();
          return;
        }
        let dt = w();
        (he.writeSdkMessages([
          buildBridgeContextSnapshot({
            session: e,
            tools: Gd(dt),
            model: getMainLoopModel(),
            permissionMode: dt.toolPermissionContext.mode,
            commands: cg(dt.mcp.commands),
            agents: getActiveAgentsFromList(lo),
            loadedSkills: ke.filter(isAdvertisedCommand),
            mcpCommands: dt.mcp.commands,
            fastMode: dt.fastMode,
            effortValue: resolveEffortLevel(dt),
            messagesInView: () => Us(Ct),
          }),
        ]),
          (vu = initJsonSchema),
          (bu = getMainLoopModelOverride()),
          logForDebugging(`[bridge:sdk] system/init announced (${O})`),
          logFeatureOk("bridge_sdk_state_announce", { trigger: fromEnum(O) }));
      } catch (error) {
        (logForDebugging(`[bridge:sdk] system/init announce failed (${O}): ${toError(error).message}`, {
          level: "error",
        }),
          logFeatureBad("bridge_sdk_state_announce", "emit_failed", { trigger: fromEnum(O) }));
      }
    })();
  }
  let hc = {
    mode: w().toolPermissionContext.mode,
    modelForSession: w().mainLoopModelForSession,
    fastMode: w().fastMode,
    effort: resolveEffortLevel(w()),
  };
  L(() => {
    let O = w(),
      Q =
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
    if (Q && (vu === void 0 || getMainLoopModelOverride() === bu)) return;
    na("state_change");
  });
  let syntheticOutputResult = onOrgFastModeChange(() => na("state_change")),
    _U = onFastRejectedFallbackModelsChanged(() => na("state_change")),
    yU = Zir(() => na("state_change")),
    Wm = !1,
    bridgeHandle = null,
    Gd = (O) => {
      let Q = getMainThreadAgentType(),
        he = getInitJsonSchema(),
        tools = Po.get(BridgeToolProvider).tools(),
        rt = [
          O.toolPermissionContext,
          O.mcp.tools,
          tools,
          O.mcp.clients,
          O.slackTagConnected,
          os,
          Cn,
          dynamicMcpState.tools,
          dynamicMcpState.clients,
          ag.size,
          lo,
          Q,
          isReplBridgeActive(),
          getSdkHostedBridgeHandle(),
          getMainLoopModel(),
          hasLspEverConnected(),
          ftt(),
          getAllowedChannels(),
          getPolicyCacheRevision(),
          isCachedGitHubRepo(),
          he,
          getHostRendersChromeSetupOffer(),
          chromeSetupOfferKey(n.sessionState),
          G6o(),
        ],
        dt = bridgeHandle;
      if (
        dt !== null &&
        Date.now() - dt.computedAt < TOOL_POOL_MEMO_TTL_MS &&
        rt.every((Zt, Ar) => Zt === dt.keys[Ar])
      )
        return ((pc = dt.allowedAgentTypes), (gc = dt.primitiveToolGrant), dt.result);
      let Gt = getActiveAgentsFromList(lo),
        pt = assembleToolPool(O.toolPermissionContext, O.mcp.tools, { activeAgents: Gt }),
        Xt = filterToolsByDenyRules(dynamicMcpState.tools, O.toolPermissionContext),
        Dt = filterToolsByDenyRules(tools, O.toolPermissionContext);
      (dg([...O.mcp.clients, ...dynamicMcpState.clients]), uw(Cn));
      let On = !isLovelyUmbrellaOn(),
        newMessages = withoutStaticMcpShadows(
          h,
          fd() || x.mcpListingsHanded
            ? [...lw]
            : [
                ...O.mcp.clients.map((client) => client.name),
                ...dynamicMcpState.clients.map((client) => client.name),
              ],
        ).filter((Zt) => isMcpTool(Zt) || !On || Zt.isEnabled()),
        Rt = uniqBy(
          mergeAndFilterTools(
            [...Dt, ...newMessages, ...os, ...Xt],
            pt,
            O.toolPermissionContext.mode,
            [...tools, ...newMessages, ...os, ...dynamicMcpState.tools, ...O.mcp.tools],
            createAccountMemoryToolGate(() =>
              u1(Cn, O.mcp.clients, dynamicMcpState.clients, [...ag.values()]),
            ),
          ),
          (Zt) => Zt.name,
        );
      if (((pc = void 0), (gc = void 0), Q)) {
        let Zt = findAgentExcludingWebFetch(Gt, Q);
        if (Zt) {
          let Ar = resolveAgentTools(
            Zt,
            withWebFetchToolForAgent(Zt, Rt, O.toolPermissionContext, { activeAgents: Gt }),
            !1,
            !0,
          );
          ((Rt = Ar.resolvedTools), (pc = Ar.allowedAgentTypes), (gc = resolveAgentToolNames(Zt)));
        }
      }
      if (x.permissionPromptToolName)
        Rt = Rt.filter((Zt) => !toolMatchesName(Zt, x.permissionPromptToolName));
      if (he && !x.jsonSchema) {
        let Zt = createSyntheticOutputTool(he);
        if ("tool" in Zt) {
          if (Zt.unsatisfiable && !Wm)
            ((Wm = !0),
              logForDebugging(
                `Init JSON schema: ${checkSchemaSatisfiable(Zt.unsatisfiable)}: ${Zt.unsatisfiable.message}`,
                { level: "warn" },
              ));
          Rt = [...Rt, Zt.tool];
        } else if (!Wm)
          ((Wm = !0),
            logEvent("tengu_structured_output_failure", { error: lit("Invalid JSON schema") }),
            logForDebugging(`Init JSON schema rejected, structured output disabled: ${Zt.error}`, {
              level: "error",
            }));
      }
      return (
        (Rt = stripSoleNonDeniableTool(Rt, O.toolPermissionContext)),
        (bridgeHandle = {
          keys: rt,
          computedAt: Date.now(),
          result: Rt,
          allowedAgentTypes: pc,
          primitiveToolGrant: gc,
        }),
        Rt
      );
    },
    Aw = env.CLAUDE_CODE_REMOTE ? env.CLAUDE_CODE_SYSTEM_PROMPT_GB_FEATURE : void 0,
    hg = () => {
      if (!Aw) return x.systemPrompt;
      let O = getFeatureValue_CACHED_MAY_BE_STALE(Aw, "");
      return typeof O === "string" && O.length > 0 ? O : x.systemPrompt;
    },
    Ri = () => Gd(w());
  TXs({
    messages: () => Ct,
    isProjectsSession: () => Qbe(),
    isThread: () => Kfe(Ri()),
    isOverview: () => mZn(Ri()),
    answerToolName: () => resolveHearthToolNames(Ri()).reply,
    ownerRowsWrittenAt: latestHumanRelayAt,
  });
  let Ns = () => mergeClients(w().mcp.clients, Cn, dynamicMcpState.clients),
    _c = () => ({
      session: e,
      refreshTools: Ri,
      refreshMcpClients: Ns,
      verbose: x.verbose,
      maxTurns: x.maxTurns,
      maxBudgetUsd: x.maxBudgetUsd,
      taskBudget: x.taskBudget,
      canUseTool: S,
      fallbackModel: x.fallbackModel,
      sessionEnvVars: xd,
      toolState: Po,
      sessionHooks: ps,
      isolationLatch: hr,
      pendingNestedMemoryTriggers: ba,
      memorySelector: Ja,
      storageV5: x.storageV5,
      credentials: x.credentials,
      messageQueue: messageQueue,
      getAppState: w,
      setAppState: P,
      replayUserMessages: x.replayUserMessages,
      includePartialMessages: x.includePartialMessages,
      ...!1,
      replayAcksAtRequestDispatch: n instanceof RemoteIO,
      trackFirstFrameUpload: n instanceof RemoteIO ? (O) => n.trackFirstFrameUpload(O) : void 0,
      trackFirstTextFrameUpload: n instanceof RemoteIO ? (O) => n.trackFirstTextFrameUpload(O) : void 0,
      markOfRepliesShownAsStored: n instanceof RemoteIO ? () => n.markOfRepliesShownAsStored() : void 0,
      onCommandLifecycle: n.onCommandLifecycle,
      sessionState: n.sessionState,
      requestDialog: getHasStreamingInput() ? createSdkUserDialogHandler(n, messageQueue) : void 0,
      setSDKStatus: (O, Q) => {
        let he = buildSystemStatusMessage(O, Q);
        (ns(he), output.enqueue(he));
      },
    }),
    of_4 = kGr.of(e);
  ((of_4.onFilesNotPlaced = noteStagedFilesNotPlaced),
    (of_4.onFilesStillCopying = noteStagedFilesStillCopying));
  let yc = (O) => ({
      ...O,
      commands: () => Ho(),
      cwd: () => Wz(e),
      tools: Ri,
      mcpClients: Ns,
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
      initialMessages: Ct,
      loadShowsCutOffCalls: v5s(G),
      conversation: rs,
      readFileCache: fs,
      customSystemPrompt: hg,
      takeSystemPromptDelivered: () => {
        let Q = td;
        return ((td = !1), Q);
      },
      agents: () => getActiveAgentsFromList(lo),
      allowedAgentTypes: () => pc,
      primitiveToolGrant: () => gc,
      handoffRelay: qx && x.usesRelayMarker ? qx : void 0,
      awaitStagedFiles: x.turnHandoffAdmission?.admitted ? createStagedFilesWaiter(of_4) : void 0,
      beforeTurnInput: () => {
        if (
          (of_4.forgetWaits(),
          of_4.tellOfFailedStagesNow(),
          flushWaitingSessionStartRows(Rc),
          diskBehindReminder !== void 0 && !isToolResultForToolUse(Ct))
        )
          (Gs([diskBehindReminder]), (diskBehindReminder = void 0), logFeatureOk("ccr_disk_behind_reminder"));
      },
      onTurnBeganBeforeInit: () =>
        notifyTurnBeganBeforeInit({ sessionState: n.sessionState, markStartupPhase: x.markStartupPhase }),
      placeFilesByName:
        x.turnHandoffAdmission?.admitted && isClaudeAiChatOrigin() ? placeFilesByNameForTurn : void 0,
      placeCarriedWrites:
        x.turnHandoffAdmission?.admitted && isClaudeAiChatOrigin() ? placeCarriedWritesAtTurnStart : void 0,
      beginTranscriptFlush: () => {
        let Q = makeStoreConfirmTimer(() => n.watchInternalEventPosts());
        return async (he, ke) => {
          let startTime = performance.now(),
            any = AbortSignal.any([he, Wo.signal]),
            Gt = setTimeout(
              () =>
                logForDebugging(
                  "turn_handoff: the session store has not confirmed the carried lines after 15s",
                  { level: "warn" },
                ),
              15000,
            );
          Gt.unref();
          try {
            if (
              !(await Promise.race([
                n.flushInternalEvents().then(() => !0),
                new Promise((Xt) => {
                  if (any.aborted) Xt(!1);
                  else any.addEventListener("abort", () => Xt(!1), { once: !0 });
                }),
              ]))
            )
              return !1;
            return n.refusedInternalEvents(ke).length > 0 ? "refused" : !0;
          } finally {
            (clearTimeout(Gt), Q(startTime));
          }
        };
      },
    }),
    SU = createInlineMcpTiming(),
    mcpChangesPromise = Promise.resolve({
      response: { added: [], removed: [], errors: {} },
      sdkServersChanged: !1,
    }),
    _g = {
      stores: rr,
      getOwnedConfigs: () => hostOwnedConfigs,
      setOwnedConfigs: (O) => {
        hostOwnedConfigs = O;
      },
      sdkState: () => ({ configs: R, clients: Cn, tools: os, commands: Ve }),
      storageV5: x.storageV5,
      credentials: x.credentials,
      enqueueSettleMerge: (O) => {
        let Q = (he) => (O(), he);
        mcpChangesPromise = mcpChangesPromise.then(Q, Q);
      },
      redactsPersistedLane: () => isTransportBacked(e),
      wantsDial: () => !0,
      operatorOwnedMcpConfigNames: operatorOwnedMcpConfigNames,
      operatorToolPolicyConfigs: gU,
      closeReplacedSdkClients: (servers) => ho.closeFor(servers),
    },
    Sc = null,
    Sg = null;
  function Ul() {
    let O = [];
    if (Sc) O.push(Sc);
    let Q = zr?.projectsReplyMount();
    if (Q) O.push(Q);
    return O;
  }
  function Ew(
    O,
    {
      authoritative: authoritative,
      caller: caller,
      deferConnect: deferConnect = !1,
      pluginDiffScope: pluginDiffScope = "configured",
      dialOptions: dialOptions,
    },
  ) {
    let doWork = async () => {
        let Xt = O,
          Dt = pluginDiffScope === "account_plugins" ? mCs(dynamicMcpState.configs) : emptyServerMap(),
          oldSdkClientNames = new Map([
            ...Object.entries(Dt),
            ...(authoritative ? [] : Object.entries(hostOwnedConfigs)),
          ]);
        if (oldSdkClientNames.size > 0) {
          let create = Object.create(null),
            pd = [];
          for (let [Da, Rs] of oldSdkClientNames) {
            let Ua = getOwn(O, Da),
              hasOwn = Object.hasOwn(hostOwnedConfigs, Da),
              j = Ua,
              vo =
                j?.scope !== void 0 &&
                MCP_SETTINGS_SCOPE_SET.has(j.scope) &&
                !isManagedConfigScope(j.scope) &&
                j.pluginSource === void 0,
              uo =
                Ua?.type === "sdk"
                  ? Object.hasOwn(Dt, Da) && !hasOwn
                  : hasOwn && Rs.type !== "sdk" && !Object.hasOwn(R, Da) && vo;
            if (Ua !== void 0 && !uo) continue;
            let { scope: scope, ...ql } = Rs;
            if (supportsEnvExpansion(ql)) {
              if (((create[Da] = copyCcrMarks(Rs, ql)), Ua !== void 0 && hasOwn)) pd.push(Da);
            }
          }
          if (pd.length > 0)
            logForDebugging(
              `[MCP] ${caller}: host-set server(s) kept over a settings server of the same name: ${pd.join(", ")}`,
            );
          Xt = { ...O, ...create };
        }
        if (Object.keys(create).length > 0) Xt = { ...create, ...Xt };
        if (Object.keys(Xt).length > 0 || dynamicMcpState.clients.length > 0 || Cn.length > 0) fc();
        for (let no of Ul()) no.suspendAllowsForApply(Xt);
        pot.peek(e)?.narrowTo?.(Xt);
        let fn = Cn,
          Rt = await applyDynamicMcpServers(
            _g,
            { payload: O, desired: Xt },
            {
              authoritative: authoritative,
              caller: caller,
              deferConnect: deferConnect,
              dialOptions: dialOptions,
            },
          ),
          Zt = new Set(Cn.map((no) => no.name)),
          Ar = applySdkMcpServerChanges({ configs: R, clients: Cn, tools: os, commands: Ve }, fn, Rt);
        if (Ar.state.configs !== R) {
          for (let key of Object.keys(R)) if (!Object.hasOwn(Ar.state.configs, key)) delete R[key];
          Object.assign(R, Ar.state.configs);
        }
        if (
          ((Cn = Ar.state.clients), (os = Ar.state.tools), (Ve = Ar.state.commands), Rt.sdkServersChanged)
        ) {
          let newSdkClientNames = new Set(Cn.map((Rs) => Rs.name)),
            allSdkNames = uniq([...Zt, ...newSdkClientNames]),
            mapped = allSdkNames.map((prev) => [prev, getMcpPrefix(prev)]);
          P((Rs) => ({
            ...Rs,
            mcp: {
              ...Rs.mcp,
              tools: [
                ...Rs.mcp.tools.filter((name) => !mapped.some(([gd, j]) => isToolFromMcpServer(name, gd, j))),
                ...os,
              ],
              commands: [
                ...Rs.mcp.commands.filter(
                  (command) => !allSdkNames.some((gd) => commandBelongsToServer(command, gd)),
                ),
                ...Ve,
              ],
            },
          }));
        }
        for (let no of Ar.clientsToCleanUp) await no.cleanup();
        for (let no of Rt.sdkServersRemoved) await ho.closeFor(no);
        return { response: Rt.response, sdkServersChanged: Rt.sdkServersChanged };
      },
      pt = async () => {
        try {
          return await doWork();
        } finally {
          for (let Xt of Ul()) Xt.reassertAfterApply();
        }
      };
    return ((mcpChangesPromise = mcpChangesPromise.then(pt, pt)), mcpChangesPromise);
  }
  function kg(O, Q, he) {
    let ke = async () => {
      if (Q !== void 0) fc();
      for (let rt of Ul()) rt.suspendAllowsForApply({ [O]: Q });
      pot.peek(e)?.narrowTo?.(Q === void 0 ? {} : { [O]: Q }, [O]);
      try {
        return {
          response: await reconcileMcpServers(
            O,
            Q,
            he,
            rr,
            P,
            w,
            _g.redactsPersistedLane(),
            x.storageV5,
            x.credentials,
            _g.getOwnedConfigs,
          ),
          sdkServersChanged: !1,
        };
      } finally {
        for (let rt of Ul()) rt.reassertAfterApply();
      }
    };
    return (
      (mcpChangesPromise = mcpChangesPromise.then(ke, ke)),
      mcpChangesPromise.then(
        ({ response: response }) => response,
        (rt) => {
          logError(rt);
          return;
        },
      )
    );
  }
  let wg = () => ({
      messages: Ct,
      tools: Gd(w()),
      agentDefinitions: { activeAgents: getActiveAgentsFromList(lo), allAgents: lo },
      customSystemPrompt: hg(),
      appendSystemPrompt: x.appendSystemPrompt,
      systemPromptSnapshot: x.systemPromptSnapshot,
      excludeDynamicSections: x.excludeDynamicSections,
      mcpClients: Ns(),
    }),
    vg = async (O) => {
      let { messages: messages, ...he } = wg();
      return collectContextData({
        session: e,
        messages: messages,
        getAppState: w,
        getMcp: () => w().mcp,
        storageV5: x.storageV5,
        credentials: x.credentials,
        options: { mainLoopModel: getMainLoopModel(), ...he },
        detail: O?.detail,
        terminalWidth: O?.terminalWidth,
      });
    },
    Iw = {
      surface: null,
      model: () => getMainLoopModel(),
      messages: () => Ct,
      conversation: (O) =>
        O === void 0
          ? { ...rs, keepArrived: (Q) => (jo?.getMessages() === Ct ? jo.keepArrivedRows(Q) : rs.keep(Q)) }
          : Mwt.of(O),
      tools: Ri,
      commands: () => Ho(),
      mcpServers: () => Ns().map((O) => O.name),
      toolContext: (O) => ask(yc(_c()), { abortController: O, userSpecifiedModel: userSpecifiedModel }),
      savedAgentMessages: (O) => waitForAgentTranscriptFlush(O, x.storageV5),
      requestMessages: (O) => B0n(O, Ri()),
      contextData: vg,
      canUseTool: S,
      composer: createRemotePromptBox(REMOTE_EDIT_QUEUE),
      selection: createRemoteSelectionReader(),
      notify: async (O, Q) => (
        await executeNotificationHooks(e, O, {
          storageV5: x.storageV5,
          credentials: x.credentials,
          hookOrigin: Q,
        }),
        "no_surface"
      ),
      toast: (O, Q, he) => {
        if (Vg({ type: "system", subtype: "ui_toast", plugin: O, text: Q, timeout_ms: he ?? gfn })) return;
        logForDebugging(`$.ui.toast (${O}): no notification bar in a headless session; kept here: ${Q}`);
      },
      status: (O, Q) => {
        if (Vg({ type: "system", subtype: "ui_status", plugin: O, text: Q ?? null })) return;
        logForDebugging(
          `$.ui.status (${O}): no status row in a headless session; kept here: ${Q ?? "(cleared)"}`,
        );
      },
      addMcpServer: (O, Q) => {
        let { scope: scope, ...ke } = Q;
        if (!supportsEnvExpansion(ke) || ke.type === "sdk")
          return (
            logForDebugging(
              `$.tool.register: server ${jsonStringify(O)} has a config this session cannot connect (${String(ke.type)}); not added`,
              { level: "warn" },
            ),
            Promise.resolve()
          );
        return ((create = withKeyReplaced(O, create, ke)), kg(O, ke, "tool_register").then(() => {}));
      },
      removeMcpServer: (O) => {
        if (!Object.hasOwn(create, O)) return Promise.resolve();
        return ((create = withKeyReplaced(O, create, void 0)), kg(O, void 0, "tool_register").then(() => {}));
      },
      resolveMcpServer: async (O) =>
        resolveConnectorTwin(
          await explainPluginServer({
            ...O,
            storageV5: x.storageV5,
            credentials: x.credentials,
            dynamicServers: toScopedConfig(Ns(), create),
          }),
          Ns(),
          w().mcp.suppressedPluginMcpServers ?? [],
        ),
      settledMcpServer: (O) => subscribeRows(Ns, O),
      connectMcpServer: (O, Q) =>
        waitForMcpServerStatus(
          {
            rows: Ns,
            apply: (he, ke) => ((create = withKeyReplaced(he, create, ke)), kg(he, ke, "plugin_connect")),
            isAdded: (he) => Object.hasOwn(create, he),
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
  (K$o(Iw), kWo(xBn));
  let kU =
      x.outputFormat === "stream-json" &&
      (!n.isRemoteTransport() ||
        isPersistenceTrusted({ redactsWhatItPersists: isTransportBacked(e), isRemoteTransport: !0 }))
        ? f$i({
            reach: () => (n.isRemoteTransport() ? (n.takesUiHostAsks() ? "each" : "none") : "first"),
            copy: async (O) =>
              (
                await n.sendUiHostRequest(
                  {
                    subtype: "ui_copy",
                    surface: O.surface,
                    client_id: O.clientId,
                    plugin: O.plugin,
                    text: O.text,
                  },
                  UiCopyResponseSchema(),
                  tgn,
                )
              )?.copied,
            readPrompt: (O) =>
              n.sendUiHostRequest(
                { subtype: "ui_prompt_read", surface: O.surface, client_id: O.clientId },
                UiPromptReadResponseSchema(),
                tgn,
              ),
            fillPrompt: async (O) =>
              (
                await n.sendUiHostRequest(
                  {
                    subtype: "ui_prompt_fill",
                    surface: O.surface,
                    client_id: O.clientId,
                    text: O.text,
                    mode: O.mode,
                    ...(O.decorations !== void 0 &&
                      O.decorations.length > 0 && { decorations: [...O.decorations] }),
                    ...(O.cursor !== void 0 && { cursor: O.cursor }),
                    ...(O.answersPress !== void 0 && { answers_press: O.answersPress }),
                  },
                  UiPromptFillResponseSchema(),
                  tgn,
                )
              )?.filled,
            paintPrompt: async (O) =>
              (
                await n.sendUiHostRequest(
                  {
                    subtype: "ui_prompt_paint",
                    surface: O.surface,
                    client_id: O.clientId,
                    layer: O.layer,
                    ...(O.text !== void 0 && { text: O.text }),
                    ...(O.decorations !== void 0 &&
                      O.decorations.length > 0 && { decorations: [...O.decorations] }),
                  },
                  UiPromptPaintResponseSchema(),
                  tgn,
                )
              )?.painted,
            suggestPrompt: async (O) =>
              (
                await n.sendUiHostRequest(
                  { subtype: "ui_prompt_suggest", surface: O.surface, client_id: O.clientId, text: O.text },
                  UiPromptSuggestResponseSchema(),
                  tgn,
                )
              )?.shown,
            readSelection: async (O) => {
              if (!(!n.isRemoteTransport() && !isTransportBacked(e))) return a2r("not_asked");
              let sendUiHostAsk = await n.sendUiHostAsk(
                { subtype: "ui_read_selection", surface: O.surface, client_id: O.clientId },
                UiReadSelectionResponseSchema(),
                tgn,
              );
              return sendUiHostAsk.cause === void 0
                ? u$i(sendUiHostAsk.answer.text, sendUiHostAsk.answer.instance_id)
                : a2r(sendUiHostAsk.cause);
            },
          })
        : () => {},
    wU = startSessionHooks({
      loaded: getPluginRegistry().hookRegistrationInFlight ?? getPluginRegistry().hooksLoadAtStartup,
      surface: null,
      isInteractive: !1,
    }),
    vc = yCs(!1),
    resolved_4 = Promise.resolve(),
    Tg = {
      titles: vc,
      storageV5: x.storageV5,
      credentials: x.credentials,
      redactsPersistedLane: () => isTransportBacked(e),
      applyRenamedSessionName: (O) => {
        if (isTeammate()) return;
        resolved_4 = resolved_4
          .then(async () => {
            await saveSessionAgentName(O, "user", x.storageV5, void 0, !1, void 0, void 0, void 0, "cache");
          })
          .catch(logError);
      },
      pushHostRenameToBridge: (O, Q) => {
        pushBridgeSessionTitle(O, Q, getSdkHostedBridgeHandle, !0, x.credentials);
      },
      dispatchCommands: () => Ho(),
      conversation: () => Ct,
      turnAbortSignal: () => nh.turnAbortSignal(),
    },
    currentAppState = emitSessionTitleChanges(),
    TU = () => ze.endSessionRequested || isShuttingDown() || isTerminalShutdown() || uN(x.maxBudgetUsd),
    RU = async () => {
      if (!getLastCacheSafeParams()) await ef();
      let O = getLastCacheSafeParams()?.toolUseContext;
      return O
        ? contextAfterTurn(O)
        : ask(yc(_c()), { abortController: createAbortController(), userSpecifiedModel: userSpecifiedModel });
    },
    Rg = new RecordedAgentResumeRun(
      x.agentResumes ?? [],
      {
        connectorsJoined: () => refreshMcpForTurn(w, L, Npe, { waitForDeferrable: !0, localOnly: !1 }),
        contextForResume: RU,
        canUseTool: S,
        exiting: TU,
        messageQueue: messageQueue,
        cutOffAgentCalls: Po.get(ResumedAgentCallRegistry),
        stopAgents: (O) =>
          stopAllRunningTasks({
            taskRegistry: createTaskFramework(w, P),
            setAppState: P,
            storageV5: x.storageV5,
            shouldStop: (Q) => O.has(Q.id),
          }),
        storageV5: x.storageV5,
      },
      ze.whenEnding(),
      x.keptSubagentAsk,
    ),
    bc = {
      session: e,
      redactsPersistedLane: () => isTransportBacked(e),
      engineState: w,
      setEngineState: P,
      storageV5: x.storageV5,
      credentials: x.credentials,
      thinkingBudget: hasEffort,
      sessionTitles: Tg,
      mcpControlLanes: {
        resolveDeferredPluginStartup: ef,
        pendingManualExchange: (O) => oauthAuthPromises.get(O),
        postOAuthReconnectPending: _r,
        ownerConfig: Pa,
        sdkClients: () => Cn,
        registeredSdkServer: (O) => {
          let Q = getOwn(R, O);
          return Q ? { ...Q, scope: "dynamic" } : null;
        },
        startupClients: () => r,
        dynamicClients: () => dynamicMcpState.clients,
        disableSdkServer: fU,
        enableSdkServer: pU,
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
      mcpConnections: () => ({ connections: Ns(), tools: [...w().mcp.tools, ...dynamicMcpState.tools] }),
      isKnownMcpServer: (O) =>
        r.some((Q) => Q.name === O) ||
        Cn.some((Q) => Q.name === O) ||
        Object.hasOwn(R, O) ||
        dynamicMcpState.clients.some((client) => client.name === O) ||
        w().mcp.clients.some((client) => client.name === O) ||
        getMcpConfigByName(O) !== null,
      contextUsageInputs: wg,
    },
    Dw = {
      enqueue: (O) => output.enqueue(O),
      storageV5: x.storageV5,
      credentials: x.credentials,
      ended: ze.whenEnding(),
    },
    withResolvers_3 = Promise.withResolvers(),
    Mg = waitForRemoteManagedSettingsFetchToSettle().catch(logError),
    results = Promise.all([Mg, withResolvers_3.promise]),
    Fw = env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL ? results : Mg,
    Uw =
      (O, Q = reloadPluginHooksNow) =>
      () => {
        O.then(() => Q(Dw)).catch(logError);
      },
    PU = Uw(Fw),
    Lw = Uw(Fw, reloadPluginHooksQuiet),
    Bw = { isSettled: !1 };
  (Mg.then(() => {
    Bw.isSettled = !0;
  }),
    withResolvers_3.promise.then(() => (Bw.isSettled ? reloadPluginHooksNow(Dw) : void 0)).catch(logError),
    Lw());
  let Hw = zRi(PU),
    Nw = onLastLoadStatusChanged(Lw);
  (registerCleanup(async () => {
    (Hw(), Nw());
  }),
    ze.whenEnding().then(() => {
      (Hw(), Nw());
    }));
  async function Ww(O) {
    try {
      return await MU(O);
    } finally {
      withResolvers_3.resolve();
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
    let Q = !1;
    try {
      let he = new Set(
        Object.keys(
          (await getAllMcpConfigs({ storageV5: x.storageV5, credentials: x.credentials, admits: zye() }))
            .servers,
        ),
      );
      if (
        ((Q = await installPluginsForHeadlessSerialized(connection, x.storageV5, x.credentials)),
        env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL)
      )
        Ea = { start: performance.now() };
      if (Q) await Bl(he, "plugin_install_diff");
    } catch (error) {
      logForDebugging(`Headless plugin install / MCP reconcile failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
    if (Ea) ((Ea.end = performance.now()), Br("plugin_mcp_reconcile_ms", Ea.end - Ea.start, Ea.start));
    return Q;
  }
  let id = null,
    Yd = null,
    Tc = null,
    jw = !1,
    Qw = !1,
    Ag = null,
    Qm,
    $m = env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL_TIMEOUT_MS ?? 0,
    Ea,
    startTime = performance.now(),
    $w = b3n(e) && det(),
    IU = $w ? rDs(e, x.storageV5, x.credentials) : null,
    DU = !$w && Zoe(e),
    startTime_2 = performance.now();
  setAwaitsFirstRun(!0);
  let ud = T3n(e) ? runFirstPluginsSync(e, x.credentials) : null,
    Jd = null,
    Ll;
  if (!isBareMode())
    if (env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL) {
      ((Ll =
        x.outputFormat === "stream-json"
          ? (tool) =>
              void n.write({
                type: "system",
                subtype: "plugin_install",
                status: tool.status,
                name: "name" in tool ? tool.name : void 0,
                error: "error" in tool ? tool.error : void 0,
                uuid: randomUUID_19(),
                session_id: getSessionId(),
              })
          : void 0),
        Ll?.({ status: "started" }),
        (id = Ww((ke) => Ll?.(ke))));
      let O = id,
        Q = ud,
        promise = new Promise((ke) => {
          Qm = ke;
        });
      Yd = (async () => {
        try {
          if ((await Promise.race([O.catch(() => {}), promise]), Q)) {
            let dt = ese() - (performance.now() - startTime_2);
            await Promise.race([Q.catch(() => {}), sleep(Math.max(0, dt))]);
          }
          let ke = T3n(e) ? await Zm() : null,
            startTime = performance.now();
          if ((await Cc(), Br("registry_refresh_ms", performance.now() - startTime, startTime), ke))
            await Qg(ke);
        } catch (error) {
          logError(error);
        }
        try {
          let {
            setupPluginHookHotReload: setupPluginHookHotReload,
            startOwedPluginHookRegistration: startOwedPluginHookRegistration,
          } = await import("./chunk-c7p56eem.js");
          (await startOwedPluginHookRegistration(x.storageV5, x.credentials),
            setupPluginHookHotReload(x.storageV5, x.credentials));
        } catch (error) {
          logError(error);
        }
      })();
    } else Jd = bz(Ww);
  else withResolvers_3.resolve();
  {
    let O = require("./chunk-rypb72br.js");
    Sg = O.HEARTH_BINDING_CHANGED_HINT;
    let bridgeSdkUrl = O.parseBridgeSdkUrl(x.sdkUrl);
    if (bridgeSdkUrl && !mn()) {
      let { createHeadlessHearthMount: createHeadlessHearthMount } = require("./chunk-zp0e6a00.js");
      Sc = createHeadlessHearthMount({
        stores: rr,
        storageV5: x.storageV5,
        credentials: x.credentials,
        sessionId: bridgeSdkUrl.sessionId,
        apiBaseUrl: bridgeSdkUrl.apiBaseUrl,
        getBearerToken: getSessionIngressAuthToken,
        getWorkerEpoch: () => n.workerEpoch(),
        readHearthBinding: () => n.readProjectsBinding(),
        sdkHostConfigs: () => R,
      });
    }
  }
  ao().projectFilesDoor = () => {
    for (let O of Ul()) {
      let projectFilesDoor = O.projectFilesDoor();
      if (projectFilesDoor) return projectFilesDoor;
    }
    return null;
  };
  let Kw = Sc?.sync("startup") ?? null,
    Ig = Kw !== null && env.CLAUDE_CODE_ENVIRONMENT_KIND === "bridge" ? Kw : null,
    Vm = getFeatureValue_CACHED_MAY_BE_STALE("tengu_dapper_platypus", !1),
    Og = () =>
      planMcpConnectorPrewait({
        explicitMcpConfigFlag: x.explicitMcpConfigFlag,
        sdkUrl: x.sdkUrl,
        hasStreamingInput: getHasStreamingInput(),
        toolSearchAvailable: isToolSearchToolAvailable(Gd(w())),
        relayHoldFollowsBootVerdict: Vm,
      }),
    {
      deadlineMs: deadlineMs,
      waitForDeferrable: waitForDeferrable,
      firstTurnHold: firstTurnHold,
      localOnly: localOnly,
      coordinatorMainThreadOnly: coordinatorMainThreadOnly,
      relayMarked: relayMarked,
      relayHold: relayHold,
      laterWakes: laterWakes,
      launchNamed: launchNamed,
      skipFullyDeferredServers: skipFullyDeferredServers,
    } = Og();
  if (relayMarked && !relayHold)
    logForDebugging(
      "relay-marked worker: no relay hold (its relay can no longer be used in this process); the first command waits for MCP servers as on an unmarked worker",
    );
  let Fg = () => mcpServersNamedByRules(w().toolPermissionContext),
    Yw = Fg();
  function xg(O) {
    return pluginMcpServersRequired({
      policyAllows: O,
      clients: w().mcp.clients,
      requiredServerNames: Fg,
      messages: Ct,
    });
  }
  let idleTimeout = xg(() => skipFullyDeferredServers),
    BU = w().mcp.clients.length,
    startTime_3 = performance.now(),
    Ug = () => relayMcpWaitLeft(startTime_3, deadlineMs ?? Npe, performance.now()),
    HU = refreshMcpForTurn(w, L, deadlineMs, {
      waitForDeferrable: waitForDeferrable,
      firstTurnHold: firstTurnHold,
      requiredServerNames: Yw,
      skipServerNames: idleTimeout,
      localOnly: localOnly,
      coordinatorMainThreadOnly: coordinatorMainThreadOnly,
      relayMarked: relayMarked,
      relayHold: relayHold,
      relayHoldFollowsBootVerdict: Vm,
      permissionPromptToolServerName: x.permissionPromptToolServerName,
    }),
    Lg,
    Hg = !1,
    Zw = !1,
    Rc = {
      session: e,
      conversation: () => Ct,
      append: Gs,
      waiting: releaseHeldSessionStartRows(Ct),
      clears: 0,
      storageV5: x.storageV5,
      credentials: x.credentials,
    };
  if (x.overdueSessionStartHooks !== void 0)
    appendSessionStartHooksWhenDone(Rc, x.overdueSessionStartHooks, (O) => n.prependUserMessage(O));
  let ev = 0,
    Wg = 0,
    ra = new TurnStartChecks({
      deferredCommandsJoin: xl,
      parkedPermissionRetirement: () => Ie.retirement,
      takeClaimSessionStartHooks: () => {
        let O = Lg;
        return ((Lg = void 0), O);
      },
      takeNewPluginsSessionStart: () => {
        if (!Hg) return;
        return ((Hg = !1), runLateSessionStartHooks(Rc));
      },
      runSessionStartHooksOfNewPlugins: () => runLateSessionStartHooks(Rc),
      sdkUrl: x.sdkUrl,
      sdkMcpUpdateKind: () => mcpSyncNeeded(R, Cn),
      sdkMcpServersPending: () =>
        count(Object.keys(R), (O) => {
          let found = Cn.find((he) => he.name === O);
          return found === void 0 || found.type === "pending";
        }),
      sdkToolRelistPending: Lm,
      updateSdkMcp: Ma,
      noteSdkEntryWait: () => qg.noteEntryWait(),
      skillsSync: IU,
      skillsSyncStartedAt: startTime,
      accountSkillsSyncRepopulate: DU,
      refreshCurrentCommands: () => af(),
      pluginStateRefreshTickets: () => ({ started: ev, lastCompletedStart: Wg }),
      pluginStartupPending: () => Boolean(ud || id || $g > 0),
      resolveDeferredPluginStartup: ef,
      closePluginInstallBracket: () => {
        (Ll?.({ status: "completed" }), (Ll = void 0), Qm?.());
      },
      backgroundInstall: Jd,
      refreshPluginState: Cc,
      refillMarketplaces: () => installPluginsForHeadlessSerialized(void 0, x.storageV5, x.credentials),
      applyPluginMcpDiff: Bl,
      connectedNonDynamicMcpServerNames: Jm,
      serverNamesOwnedBeforePluginsSync: Zm,
      pendingPluginRefresh: () => Yd,
      pluginRefreshJoined: () => {
        Yd = null;
      },
      mcpClientCountAtKick: BU,
      mcpPrewaitPromise: HU,
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
            w,
            Math.max(
              he.PROJECTS_MOUNT_FIRST_COMMAND_WAIT_FLOOR_MS,
              he.PROJECTS_MOUNT_FIRST_COMMAND_WAIT_MS - O,
            ),
          );
        }
        return null;
      },
      mcpPrewait: {
        deadlineMs: deadlineMs,
        waitForDeferrable: waitForDeferrable,
        firstTurnHold: firstTurnHold,
        policyAtFirstCommand: () => Og(),
        skippedAtKick: idleTimeout,
        serversToSkipNow: (O) => xg(() => O),
        requiredAtKick: Yw,
        requiredServersNow: Fg,
        localOnly: localOnly,
        coordinatorMainThreadOnly: coordinatorMainThreadOnly,
        relayMarked: relayMarked,
        relayHold: relayHold,
        relayHoldFollowsBootVerdict: Vm,
        permissionPromptToolServerName: x.permissionPromptToolServerName,
        freshWaitDeadlineMs: relayHold ? Ug : void 0,
        laterWakes: laterWakes,
      },
      waitForPendingMcp: (O, Q) => refreshMcpForTurn(w, L, O, Q),
      store: me,
      allMcpClients: (O) => mergeClients(O.mcp.clients, Cn, dynamicMcpState.clients),
      registerElicitationHandlers: hasFastMode,
      registerChannelHandler: (O) => reregisterChannelHandlerAfterReconnect(O, messageQueue),
      buildAllTools: Gd,
    }),
    qg = new SdkMcpServerWait({
      sdkUrl: x.sdkUrl,
      unconnectedServers: () =>
        Object.entries(R).flatMap(([O, Q]) => {
          let found = Cn.find((ke) => ke.name === O);
          return found === void 0 || found.type === "pending" ? [Q] : [];
        }),
      updateSdkMcp: Ma,
      relayWaitLeftMs: relayHold ? Ug : void 0,
    }),
    any = y.some((newCommands) => newCommands.type === "user" || newCommands.type === "assistant"),
    NU = new McpPrewait({
      setting: launchNamed,
      kickedAtMs: x.mcpConnectKickedAtMs ?? startTime_3,
      coordinatorMainThreadOnly: coordinatorMainThreadOnly,
      relayMarked: relayMarked,
      relayHoldLog: { relayHold: relayHold, relayHoldFollowsBootVerdict: Vm },
      startedFromTranscript: any,
      mainThreadRequested: () => e.requestJournal.mainThreadRequestedInProcess(),
      mcpClients: () => w().mcp.clients,
      waitForPendingMcp: (O, Q) => refreshMcpForTurn(w, L, O, Q),
    }),
    run = () =>
      !ze.running &&
      !Do.isBusy &&
      !Ya.isBusy &&
      !Ya.hasRunningTask(w().tasks) &&
      Xo === 0 &&
      !fi &&
      !oni() &&
      !hasAwaitedRunningTaskIn(w().tasks) &&
      !(env.CLAUDE_CODE_ENVIRONMENT_KIND === "bridge" && hasAwaitedRunningTasks(w().tasks)) &&
      !hasWorkingInProcessTeammates(w()) &&
      !collectOwedTaskNotifications({ tasks: Object.values(w().tasks ?? {}), waits: io, now: Date.now() }),
    timeoutMs = createIdleTimeoutManager(
      () => run() && !We(Date.now()),
      () => {
        if (
          !ze.running &&
          !isShuttingDown() &&
          !isTerminalShutdown() &&
          n.sessionState.getState() === "running"
        )
          n.sessionState.notifyStateChanged("idle");
      },
    ),
    jg = timeoutMs;
  if (env.CLAUDE_CODE_SLEEP_COMPACT) {
    let {
      isSleepCompactionHost: isSleepCompactionHost,
      SleepCompactor: SleepCompactor,
      withSleepCompaction: withSleepCompaction,
    } = require("./chunk-bbwtdypr.js");
    if (isSleepCompactionHost())
      jg = withSleepCompaction(
        timeoutMs,
        new SleepCompactor({
          isIdle: run,
          isStopping: () => isShuttingDown() || isTerminalShutdown() || ze.inputClosed,
          isPermissionPending: () => Ie.inheritedPromptPending(),
          enqueueCompact: () => {
            (messageQueue.enqueue({
              mode: "prompt",
              agentId: mainAgentId(),
              value: "/compact",
              uuid: randomUUID_19(),
              priority: "later",
              isMeta: !0,
              skipAttachments: !0,
            }),
              Os());
          },
          exitDelayMs: env.CLAUDE_CODE_EXIT_AFTER_STOP_DELAY,
        }),
      );
  }
  async function Cc(O = {}) {
    let Q = ++ev,
      { agentDefinitions: agentDefinitions } = await refreshActivePlugins(
        over_2,
        x.storageV5,
        x.credentials,
        O,
      );
    ((He = !0),
      (od = getNonInteractiveCommands(await getCommands(cwd(), x.storageV5))),
      (Hm = !0),
      buildAllTools(agentDefinitions.allAgents),
      md(),
      loadAllPluginsCacheOnly(x.storageV5, x.credentials).then(
        (cmd) => addStartupContext({ plugin_count: cmd.enabled.length }),
        () => {},
      ),
      (Wg = Math.max(Wg, Q)));
  }
  async function ov(O, Q = { restartLaunchDirStdioServers: !1 }) {
    devIntentTracker.of(e.host).directoryChanged();
    let he = getOriginalCwd(),
      permissionPromptToolName = x.permissionPromptToolName,
      rt = [],
      dt;
    P((Xt) => {
      let { stale: stale, ...On } = removeMcpClientsWhere(Xt.mcp, (fn) =>
        isDeclaredUnderOtherWorkspaceRoot(fn.config, he),
      );
      if (stale.length === 0) return Xt;
      return (
        (rt = stale),
        (dt =
          permissionPromptToolName === void 0 || x.permissionPromptToolServerName === void 0
            ? void 0
            : Xt.mcp.tools.find((tool) => toolMatchesName(tool, permissionPromptToolName))?.mcpInfo
                ?.serverName),
        { ...Xt, mcp: { ...Xt.mcp, ...On } }
      );
    });
    for (let Xt of rt) {
      if (
        x.permissionPromptToolBinding !== void 0 &&
        matchesListedOrParsedServer(Xt.name, {
          listedServer: dt,
          parsedServer: x.permissionPromptToolServerName,
        })
      )
        x.permissionPromptToolBinding.swept = !0;
      if (isConnectedOrCached(Xt))
        await getMcpClientModule()
          .clearServerCache(Xt.name, Xt.config)
          .catch(() => {});
    }
    if (Q.restartLaunchDirStdioServers) await qU();
    await Cc({ applyStagedInstalls: !1 });
    let Gt = new Set(Object.keys(dynamicMcpState.configs)),
      pt = new Set(
        w()
          .mcp.clients.filter((client) => !Gt.has(client.name))
          .map((Xt) => Xt.name),
      );
    await Bl(pt, O);
  }
  async function qU() {
    let O = new Set(Object.keys(dynamicMcpState.configs)),
      batchUuids = w().mcp.clients.filter(
        (client) =>
          !O.has(client.name) &&
          isStdioConfig(client.config) &&
          !isBuiltinInProcessMcpServer(client.name) &&
          (client.type === "connected" || client.type === "pending" || client.type === "failed") &&
          !mcpDialBlockCause(client.name, client.config) &&
          !isMcpServerDisabled(client.name),
      ),
      filtered = w().mcp.clients.filter(
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
    let ke = new Set(batchUuids.filter((pt) => pt.type === "pending").map((pt) => pt.name));
    if (ke.size > 0)
      await waitForStoreState(
        { getState: w, subscribe: L },
        (pt) => !pt.mcp.clients.some((client) => ke.has(client.name) && client.type === "pending"),
        { timeoutMs: Math.min(Math.max(deadlineMs ?? 0, Npe), A4e()) },
      );
    ra.noteServersStartedSinceKick(batchUuids.map((pt) => pt.name));
    let rt = (pt) => {
        let Xt = !1;
        return (
          P((Dt) => {
            let found = Dt.mcp.clients.find((client) => client.name === pt.name);
            if (!found || !getMcpClientModule().areMcpConfigsEqual(found.config, pt.config)) return Dt;
            if (((Xt = !0), found.type === "pending")) return Dt;
            return {
              ...Dt,
              mcp: {
                ...Dt.mcp,
                clients: Dt.mcp.clients.map((client) =>
                  client === found ? { name: client.name, type: "pending", config: client.config } : client,
                ),
              },
            };
          }),
          Xt
        );
      },
      dt = async (pt) => {
        if (!rt(pt)) return;
        let Xt = await Vd(pt.name, pt.config);
        logMCPDebug(pt.name, `re-dialled under the new project root after set_cwd: ${Xt.type}`);
      },
      results = Promise.all(
        batchUuids.map((pt) =>
          dt(pt).catch((Xt) =>
            logForDebugging(`set_cwd: re-dialling ${pt.name} failed (continuing): ${errorMessage(Xt)}`, {
              level: "error",
            }),
          ),
        ),
      );
    if (getMcpConnectNonBlocking()) return;
    await Promise.race([results, sleep(A4e(), void 0, { unref: !0 })]);
  }
  function Jm() {
    let O = new Set(Object.keys(dynamicMcpState.configs));
    return new Set(
      w()
        .mcp.clients.filter((client) => !O.has(client.name))
        .map((Q) => Q.name),
    );
  }
  async function Zm() {
    let { servers: servers } = await getAllMcpConfigs({
        storageV5: x.storageV5,
        credentials: x.credentials,
        admits: zye(),
      }),
      appState = Jm(),
      he = w().mcp.suppressedPluginMcpServers ?? [],
      ke = new Set();
    for (let [rt, dt] of Object.entries(servers))
      if (
        dt.pluginSource === void 0 ||
        marketplaceSuffix(dt.pluginSource) !== SYNCED ||
        appState.has(rt) ||
        he.includes(rt)
      )
        ke.add(rt);
    return ke;
  }
  async function Bl(O, Q, he = "configured") {
    let { servers: servers } = await getAllMcpConfigs({
      storageV5: x.storageV5,
      credentials: x.credentials,
      admits: zye(),
    });
    (P((fn) => {
      let suppressedPluginMcpServers = fn.mcp.suppressedPluginMcpServers;
      if (!suppressedPluginMcpServers || suppressedPluginMcpServers.length === 0) return fn;
      let filtered = suppressedPluginMcpServers.filter((Ar) => Object.hasOwn(servers, Ar));
      return filtered.length === suppressedPluginMcpServers.length
        ? fn
        : { ...fn, mcp: { ...fn.mcp, suppressedPluginMcpServers: filtered } };
    }),
      addStartupContext({ mcp_server_count: Object.keys(servers).length }));
    let rt = isHermeticRemoteSession(),
      dt = getStrictMcpConfig(),
      Gt = filterServersForScope(servers, { scope: he, strictMcpConfig: dt }),
      pt = count(Object.keys(servers), (fn) => !Object.hasOwn(Gt, fn));
    if (pt > 0)
      logForDebugging(
        `Headless MCP refresh (${Q}): ${pt} configured server(s) left out (scope=${he}, strict-mcp-config=${dt})`,
      );
    let create = Object.create(null);
    for (let [fn, Rt] of Object.entries(Gt)) {
      if (rt && (Rt.scope === "project" || Rt.scope === "local")) continue;
      if (O?.has(fn) && !Object.hasOwn(dynamicMcpState.configs, fn)) continue;
      if (isParkedSpare() && spt(fn, Rt)) continue;
      let Zt = Rt.type;
      if (Zt === void 0 || Zt === "stdio" || Zt === "sse" || Zt === "http" || Zt === "sdk") create[fn] = Rt;
    }
    for (let [fn, Rt] of Object.entries(R))
      if (
        Rt.type === "sdk" &&
        (!Object.hasOwn(create, fn) || (Object.hasOwn(servers, fn) && servers[fn]?.scope === "dynamic"))
      )
        create[fn] = Rt;
    let { response: response, sdkServersChanged: sdkServersChanged } = await Ew(create, {
      authoritative: !1,
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
    let startTime = performance.now(),
      he = relayHold,
      ke = he ? Ug() : 0,
      rt = cqs(),
      dt = he && rt === 0 ? ke : rt,
      Gt = Bl(O, "plugins_sync");
    if (dt === 0) {
      (Gt.catch((On) => logError(On)),
        Br("plugins_sync_mcp_ms", 0),
        logEvent("tengu_plugins_sync_mcp_skipped", { relay_marked: relayMarked, relay_hold: relayHold }));
      return;
    }
    let pt = sleep(dt).then(() => "timeout"),
      Xt = !1;
    try {
      if ((await Promise.race([Gt, pt])) === "timeout")
        ((Xt = !0),
          logEvent("tengu_plugins_sync_mcp_timeout", { timeout_ms: dt }),
          Gt.catch((On) => logError(On)));
    } catch (error) {
      logError(error);
    }
    let startTime_2 = performance.now();
    if ((Br("plugins_sync_mcp_ms", startTime_2 - startTime), he)) {
      if (Xt) {
        let max = Math.max(0, ke - (performance.now() - startTime));
        await withDeadline(
          Gt.catch(() => {}),
          max,
        );
      }
      let startTime_3 = performance.now(),
        max = Math.max(0, ke - (startTime_3 - startTime)),
        Rt = xg(() => Og().skipFullyDeferredServers);
      (await refreshMcpForTurn(w, L, max, { skipTelemetry: !0, waitForDeferrable: !0, skipServerNames: Rt }),
        logEvent("tengu_plugins_sync_mcp_relay_wait", {
          reconcile_timed_out: Xt,
          connect_budget_ms: Math.round(max),
          connect_waited_ms: Math.round(performance.now() - startTime_3),
          pending_waited_after: count(w().mcp.clients, (Zt) => Zt.type === "pending" && !Rt.has(Zt.name)),
        }),
        Br("plugins_sync_mcp_relay_wait_ms", performance.now() - startTime_2, startTime_2));
    }
  }
  async function sv() {
    Tc = null;
    let startTime = performance.now();
    try {
      let Q = await Zm();
      (await Cc(),
        await Qg(Q),
        Br("plugin_state_refresh_inline_ms", performance.now() - startTime, startTime));
    } catch (error) {
      logError(error);
    }
  }
  let Pc = null,
    $g = 0;
  function ef() {
    if (Pc) return Pc;
    ($g++, (Zw ||= Boolean(ud || id)));
    let O = jU()
      .catch((Q) => {
        if ((logError(Q), Pc === O)) Pc = null;
      })
      .finally(() => {
        ($g--, (Hg ||= Zw));
      });
    return ((Pc = O), O);
  }
  async function jU() {
    let O = !1;
    try {
      if (ud) {
        let startTime = performance.now(),
          ke = ese() - (startTime - startTime_2),
          rt = sleep(Math.max(0, ke)).then(() => "timeout"),
          dt = (await Promise.race([ud, rt])) === "timeout";
        if ((logForDiagnosticsNoPII("info", "plugins_sync_wait", { timed_out: dt }), dt))
          (logEvent("tengu_plugins_sync_wait_timeout", {}),
            ud
              .then(() => {
                ra.notePluginsSyncLanded();
              })
              .catch(logError));
        if ((Br("plugins_sync_install_ms", performance.now() - startTime), (ud = null), !id && !Yd))
          await sv();
        O = !dt;
      }
      if (id) {
        let startTime = performance.now();
        if ($m > 0) {
          let ke = sleep($m).then(() => "timeout");
          if ((await Promise.race([id, ke])) === "timeout")
            (logForDebugging(`CLAUDE_CODE_SYNC_PLUGIN_INSTALL: plugin installation timed out after ${$m}ms`, {
              level: "error",
            }),
              logEvent("tengu_sync_plugin_install_timeout", { timeout_ms: $m }));
        } else await id;
        if ((Br("plugin_install_ms", performance.now() - startTime, startTime), Ea))
          Br("plugin_mcp_reconcile_ms", (Ea.end ?? performance.now()) - Ea.start, Ea.start);
        ((id = null), Qm?.(), Br("plugin_install_total_ms", performance.now() - startTime, startTime));
      }
    } finally {
      (Ll?.({ status: "completed" }), (Ll = void 0), Qm?.());
    }
    if (Yd) {
      let startTime = performance.now();
      (await Yd, Br("plugin_state_refresh_join_ms", performance.now() - startTime, startTime));
    }
    let Q = Jd?.needsRefresh === !0;
    if (
      needsPluginRefreshAfterIdle({
        idleRefreshRan: jw,
        idleRefreshSyncTimedOut: Qw,
        syncLanded: O,
        syncRoundReplaced: Ag !== null && e.pluginsSync.firstSyncPromise !== Ag,
        installNeedsRefresh: Q,
      })
    ) {
      if ((await sv(), Q && Jd)) Jd.needsRefresh = !1;
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
  function Kg(O, Q, he) {
    return O === Q || normalizeNameForMCP(O) === he;
  }
  function tf(O) {
    let Q = normalizeNameForMCP(O);
    return [...w().mcp.clients, ...Cn, ...dynamicMcpState.clients].filter((cache) => Kg(cache.name, O, Q));
  }
  async function QU(serverName, params, elicitSignal) {
    let ke = (status) =>
        status.find((Rt) => Rt.type === "connected" && !isMcpServerBlockedAtConnectTime(Rt.name, Rt.config)),
      rt = params !== void 0 ? L_e(params) : Number.POSITIVE_INFINITY,
      min = Math.min(Date.now() + MCP_CALL_RESULT_LIMITS, Number.isNaN(rt) ? Date.now() : rt),
      Gt = !1;
    async function pt(fn) {
      let Rt = ke(fn);
      if (Rt) return Rt;
      let found = fn.find((no) => no.type === "cached");
      if (!found || Gt) return;
      let max = Math.max(0, min - Date.now());
      if (max === 0) {
        Gt = !0;
        return;
      }
      try {
        return await getMcpClientModule().ensureConnectedClient(found, {
          signal: elicitSignal,
          timeoutMs: max,
          context: "mcp_call lazy connect",
        });
      } catch (error) {
        if (
          ((Gt = !0),
          (await getMcpClientModule().peekSettledConnection(found.name, found.config))?.type ===
            "needs-auth" || error instanceof McpAuthError)
        )
          over.markNeedsAuth(found.name);
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
        Object.keys(dynamicMcpState.configs).some((Zt) => Kg(Zt, serverName, fn)) ||
        (await Promise.race([
          getAllMcpConfigs({ storageV5: x.storageV5, credentials: x.credentials, admits: zye() }).then(
            ({ servers: servers }) => Object.keys(servers).some((Ar) => Kg(Ar, serverName, fn)),
          ),
          sleep(Math.max(0, min - Date.now()), elicitSignal).then(() => !0),
        ]))
      ))
        return;
    }
    let min_2 = Math.min(min, Date.now() + wz);
    while (!elicitSignal.aborted) {
      let fn = tf(serverName),
        Rt = await pt(fn);
      if (Rt) return Rt;
      if (fn.length > 0 && fn.every((Zt) => Zt.type !== "pending" && (Zt.type !== "cached" || Gt))) return;
      if (Date.now() >= (fn.length === 0 ? min_2 : min)) break;
      await sleep(50, elicitSignal);
    }
    if (elicitSignal.aborted) return;
    return ke(tf(serverName));
  }
  let Zd = !0;
  function nl() {
    return (
      Zd &&
      x.outputFormat === "stream-json" &&
      Fce(n.uiSurfaceChannel()) &&
      (!n.isRemoteTransport() || vk.list().length > 0)
    );
  }
  let Mc = createUiStatusBuffer(Date.now),
    Ac = !1,
    nf = !1;
  function Vg(O) {
    if (nl()) return (Mc.note(O), enqueueTaskNotification(O), !0);
    let Q = Zd && x.outputFormat === "stream-json" && gLs(n.uiSurfaceChannel(), vk.list().length > 0);
    if (Q) Mc.hold(O);
    else (Mc.note(O), (Ac ||= O.subtype === "ui_status"));
    return Q;
  }
  function Gg(O) {
    let isRemoteTransport = n.isRemoteTransport();
    if (!isRemoteTransport && !Ac) return;
    let he = isRemoteTransport && O ? Mc.forFirstClient() : Mc.forLaterClient();
    if (!nl()) return;
    Ac = !1;
    for (let uuid of he) enqueueTaskNotification(uuid);
  }
  let Hl = createSurfaceDeclarationTracker(
      {
        isRemoteTransport: () => n.isRemoteTransport(),
        senderStands: (result) => n.surfaceSenderStands(result),
        welcomeBack: () => {
          let O = Pu;
          if ((pruneDetachedClients(), Gg(!1), Zg(), _v(O), nl()))
            enqueueTaskNotification({ type: "system", subtype: "ui_invalidate", event: "ui.render" });
        },
      },
      (O, Q) => n.surfaceClientAttached(O, Q),
    ),
    cd = null,
    zg = !1,
    of = !1,
    md = () => {
      if (Zd) na("state_change");
      if (!Zd || x.outputFormat !== "stream-json") return;
      if (zg) {
        of = !0;
        return;
      }
      let O = toSlashCommands(Ho()),
        Q = jsonStringify(O);
      if (cd === null || Q === cd) return;
      ((cd = Q), enqueueTaskNotification({ type: "system", subtype: "commands_changed", commands: O }));
    },
    iv = () => {
      if (((zg = !1), of)) {
        of = !1;
        try {
          md();
        } catch (error) {
          logError(error);
        }
      }
    },
    af = async () => {
      if (!getHostState().isAnnouncingFreshLoad) clearCommandsCache();
      ((od = getNonInteractiveCommands(await getCommands(getOriginalCwd(), x.storageV5))),
        (Hm = !0),
        Wl(),
        md());
    },
    df,
    lf = !1,
    av = (O) => {
      ((lf = !0), logError(O));
    },
    mf = () => {
      let O = af()
        .catch(av)
        .finally(() => {
          if (df === O) df = void 0;
        });
      df = O;
    },
    uv = {
      reload: async () => {
        let O = await logPluginDirReload(over_2, {
          model: Ao() ?? getMainLoopModel(),
          mcpClients: w().mcp.clients,
          storageV5: x.storageV5,
          credentials: x.credentials,
        });
        if (O === "held") return O;
        ((He = !0), buildAllTools(w().agentDefinitions.allAgents));
        let [Q, he] = await Promise.allSettled([af(), Bl(Jm(), "reload_plugins")]);
        if (Q.status === "rejected") logError(Q.reason);
        if (he.status === "rejected")
          logForDebugging(`plugin-dir watch reload: applyPluginMcpDiff failed: ${errorMessage(he.reason)}`, {
            level: "error",
          });
        return O;
      },
      joinPluginDir: addPluginDirAndRebuildSandbox,
      retarget: (O) => over_2.retarget(O),
    };
  (Yue.set(uv), installDevModsPlaceholderExpander());
  let Yg = () =>
      Promise.resolve()
        .then(() => getAgentDefinitionsWithOverrides(getOriginalCwd(), x.storageV5))
        .then((O) => buildAllTools(O.allAgents))
        .catch((O) => {
          (av(O), (lo = withLiveRegisteredAgents(lo)));
        }),
    subscribe_2 = fue.subscribe(() => {
      (mf(), Yg());
    }),
    cv = "",
    mv = () => {
      try {
        return ((cv = join(getManagedFilePath(), ".claude") + sep), W1());
      } catch (error) {
        return (logError(error), (lf = !0), "unread:");
      }
    },
    Wl = () => {
      let state = mv(),
        Q = managedSettingsAskState.readAs !== !1;
      if (state !== "held:" && !(state === "unread:" && Q)) return;
      let he = (ke, rt) => ke === "policySettings" && rt?.startsWith(cv) === !0;
      ((od = od.filter((ke) => ke.type !== "prompt" || !he(ke.source, ke.skillRoot ?? ke.skillFile?.path))),
        (lo = lo.filter((ke) => !he(ke.source, ke.baseDir))));
    },
    fv = () => {
      let O = getInitialSettings_2();
      return {
        skillOverrides: jsonStringify(O.skillOverrides ?? {}),
        bundledSkillsDisabled: I3(O),
        managedFolderHold: mv(),
      };
    },
    ff = fv();
  (Wl(), xl?.then(Wl).catch(logError));
  let subscribe_3 = settingsChangeDetector.subscribe(() => {
      let O = fv(),
        Q = O.skillOverrides !== ff.skillOverrides,
        he = O.bundledSkillsDisabled !== ff.bundledSkillsDisabled,
        ke = lf || O.managedFolderHold !== ff.managedFolderHold;
      if (!Q && !he && !ke) return;
      if (((ff = O), ke)) {
        ((lf = !1), Wl(), mf(), Yg(), md());
        return;
      }
      if (he) {
        mf();
        return;
      }
      (xl ?? Promise.resolve()).then(md).catch(logError);
    }),
    commands = w().mcp.commands,
    VU = L(() => {
      let commands_2 = w().mcp.commands;
      if (commands_2 === commands) return;
      let Q =
        commands_2.length === commands.length && commands_2.every((he, ke) => he.name === commands[ke]?.name);
      if (((commands = commands_2), Q)) return;
      (xl ?? Promise.resolve()).then(md).catch(logError);
    }),
    GU = async () => {
      if (!Zd) return;
      let O = cd ?? jsonStringify(toSlashCommands(Ho()));
      clearCommandMemoizationCaches();
      let Q = getNonInteractiveCommands(await getCommands(getOriginalCwd(), x.storageV5));
      if (!Zd) return;
      if (((od = Q), (Hm = !0), Wl(), jsonStringify(toSlashCommands(Ho())) === O)) return;
      md();
    },
    gv = () => {
      (xl ?? Promise.resolve()).then(GU).catch(logError);
    },
    zU = onPolicyVerdictChanged(gv),
    YU = onPolicyVerdictChanged(() => {
      queueMicrotask(vw);
    });
  if (didPolicyLimitsColdStartTimeOut() && !isLovelyUmbrellaOn()) gv();
  let onInvalidate = render.onInvalidate((O) => {
      if (!nl()) return;
      enqueueTaskNotification({
        type: "system",
        subtype: "ui_invalidate",
        event: "ui.render",
        ...(vEo() && { prompts_screened: !0 }),
        ...(O !== void 0 && {
          instances: O.map((Q) => ({ surface: Q.surface, component: Q.component, instance_id: Q.requestId })),
        }),
      });
    }),
    XU =
      x.outputFormat === "stream-json"
        ? setUiLogSink((O) => {
            Vg({ type: "system", subtype: "ui_log", plugin: O.plugin, text: O.text });
          })
        : () => {},
    Pu = 0,
    Xg = (O) => {
      if (!nl()) return;
      (Pu++, enqueueTaskNotification({ type: "system", subtype: "ui_panes", ...describePanesForClient(O) }));
    };
  function _v(O) {
    if (Pu === O) Xg(describeOpenPanes(ul().getState()));
  }
  let yv = {
    rosterMemory: Hl,
    isRemoteTransport: () => n.isRemoteTransport(),
    givePluginUiTo: Gg,
    paneRosterPushes: () => Pu,
    tellPaneRoster: _v,
    isPanelAttachOwed: () => nf,
    redactsPersistedLane: () => isTransportBacked(e),
  };
  function Zg() {
    let O = listPlacedRows();
    if (O.length > 0 && nl()) enqueueTaskNotification({ type: "system", subtype: "ui_placed", rows: [...O] });
  }
  let ZU = g$i(Zg),
    eL = subscribeOpenPanes((O) => {
      (dropClosedPanes(O), Xg(O));
    }),
    resolved_5 = Promise.resolve();
  n.setSurfaceRoster({
    list: () => vk.list().map((O) => O.clientId),
    refuse: (O) => {
      for (let Q of O)
        (Hl.forget(Q),
          raiseSessionDetach(Q, "detach").catch((he) =>
            logForDebugging(`session.detach: failed: ${errorMessage(he)}`, { level: "error" }),
          ));
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
      (logForDebugging(
        "the statement of the session's writers reached its bound unrenewed: every surface client off the roster",
      ),
        detachAllClients());
      try {
        pruneDetachedClients();
      } catch (error) {
        logForDebugging(`statement unrenewed: review failed: ${errorMessage(error)}`, { level: "error" });
      }
    },
  });
  let Sv = raiseViewerAbsence(
      (O) => n.setSubscribersReportedListener(O),
      () => vk.list().length > 0,
      () => {
        if (!EEo() || isShuttingDown() || isTerminalShutdown()) return;
        let O = vk.list().length,
          Q = detachAllClients(),
          he = !0;
        try {
          pruneDetachedClients();
        } catch (error) {
          ((he = !1),
            logForDebugging(`viewer absence: review failed: ${errorMessage(error)}`, { level: "error" }));
        }
        let ke = Q.then((rt) => {
          if (rt > 0 && rt === O) logFeatureBad("plugin_function_hooks_viewer_absence", "detach_failed");
          else if (rt > 0) logFeatureSad("plugin_function_hooks_viewer_absence", "detach_failed");
          else if (!he) logFeatureSad("plugin_function_hooks_viewer_absence", "review_failed");
          else logFeatureOk("plugin_function_hooks_viewer_absence");
        });
        resolved_5 = resolved_5.then(() => ke);
      },
    ),
    tL = uLs(
      () => Fce(n.uiSurfaceChannel()),
      () => {
        if (isShuttingDown() || isTerminalShutdown()) return;
        Se.noteSwitchedOff();
        let list = vk.list();
        if (!Zd || x.outputFormat !== "stream-json" || list.length === 0) return;
        logForDebugging(
          `a flag refresh ended the serving of surfaces: ${list.length} client(s) off the roster`,
        );
        for (let he of list) Hl.forget(he.clientId);
        let currentAppState = detachAllClients();
        ((resolved_5 = resolved_5.then(async () => {
          await currentAppState;
        })),
          (Ac = !0),
          (nf = !0),
          enqueueTaskNotification({ type: "system", subtype: "ui_invalidate", event: "ui.render" }),
          pruneDetachedClients());
      },
    ),
    subscribe_4 = paneSignals.scroll.subscribe((O) => {
      if (!nl()) return;
      enqueueTaskNotification({
        type: "system",
        subtype: "ui_scroll",
        client_id: O.clientId,
        component: O.component,
        instance_id: O.requestId,
        offset: O.offset,
        ...(O.isFollowingEnd && { follow_end: !0 }),
      });
    }),
    subscribe_5 = paneSignals.focus.subscribe((O) => {
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
  interruptOnNowPriority({ messageQueue: messageQueue, drain: ze });
  let Ia = new WakeRouter({
      messageQueue: messageQueue,
      drain: ze,
      enabled: FFo,
      transcript: { getSnapshot: () => Ct },
      session: e,
      taskRegistry: createTaskFramework(w, P),
      stopTask(O) {
        withFeatureTelemetry(
          "print_stop_ends_moved_shell",
          () =>
            stopTaskByUser(O, {
              taskRegistry: createTaskFramework(w, P),
              setAppState: P,
              session: e,
              getAppState: w,
              source: "client",
              storageV5: x.storageV5,
            }),
          () => "stop_failed",
        ).catch(logError);
      },
      clock: {
        setTimeout(O, Q) {
          let he = setTimeout(O, Q);
          return () => clearTimeout(he);
        },
      },
    }),
    hf = new RapidFollowupPreempter({
      messageQueue: messageQueue,
      drain: ze,
      enabled: isRapidFollowupPreemptEnabled,
      isSentNow: (O) => Ia.isTaking(O),
      emit: enqueueTaskNotification,
    }),
    install = hf.install(),
    _f = new FollowupBackgroundsSubagent({
      messageQueue: messageQueue,
      drain: ze,
      enabled: isFollowupBackgroundsSubagentEnabled,
      isSentNow: (O) => Ia.isTaking(O),
      taskRegistry: createTaskFramework(w, P),
      hasListedForegroundToolCall: () => (Q_e.peek(e)?.list().length ?? 0) > 0,
      isHumanDecisionPending: () => mzn(e) || n.sessionState.getState() === "requires_action",
    }),
    install_2 = _f.install(),
    iL = n.isRemoteTransport()
      ? publishQueuedWakeStatus({
          messageQueue: messageQueue,
          getTasks: () => w().tasks,
          publish: (O) =>
            n.sessionState.notifyInternalMetadataChanged({
              finished_background_tasks_pending_notification: O,
            }),
        })
      : () => {},
    eh = () => ze.dequeueCount === 0 && !any && !y.some((O) => O.type === "assistant"),
    kv = () => getSpareClaimState() !== "none" && eh(),
    aL = new CostStatePusher(n),
    yf;
  lazyPrintModules2.onMemoryExtractPlace(e.host, (O) => {
    yf = O;
  });
  let wv = () => {
      (aL.pushIfChanged(yf && { memory_extract_place: yf }), (yf = void 0));
    },
    Ic = () => {
      if (Ie.inheritedPromptOwnsWorkerStatus()) return !1;
      let refreshedState = w(),
        values = Object.values(refreshedState.tasks ?? {}),
        any = values.some(isTeammateStillWorking),
        any_2 = getRunningTasks(refreshedState).some(isAwaitedBackgroundTask),
        rt = collectOwedTaskNotifications({ tasks: values, waits: io, now: Date.now() }),
        shutdownApproval = mayEndWithBackgroundWork({
          hasActiveTeammates: any,
          hasRunningBgTasks: any_2,
          hasPendingNotification: rt,
        });
      if (shutdownApproval && reportsRunningBackgroundTasks() && values.some(isAmbientBackgroundTask))
        logForDiagnosticsNoPII("info", "cli_idle_gate_report_idle", () => ({
          task_count: values.length,
          tasks: summarizeTasksForTelemetry(values.slice(0, 64)),
          tasks_truncated: values.length > 64,
          has_active_teammates: any,
          has_running_bg_tasks: any_2,
          has_pending_notification: rt,
        }));
      return shutdownApproval;
    };
  n.setMainLoopLiveness(() => {
    if (ze.running) return !0;
    try {
      return !Ic();
    } catch (error) {
      return (logError(error), logFeatureBad("per_task_stop_sparing", "liveness_probe_throw"), !1);
    }
  });
  let dL = () => {
      n.sessionState.notifyStateChanged(Ic() ? "idle" : "running");
    },
    vv = async () => {
      let O = w();
      if (hasWorkingInProcessTeammates(O)) await waitForTeammatesToBecomeIdle(P, O);
      let Q = w();
      return hasNonLeadTeammate(Q.teamContext) || hasActiveInProcessTeammates(Q);
    },
    bv = () => {
      if (mr) return !1;
      return (
        (mr = !0),
        messageQueue.enqueue({
          mode: "prompt",
          agentId: mainAgentId(),
          value: TEAM_SHUTDOWN_REMINDER,
          uuid: randomUUID_19(),
        }),
        Os(),
        !0
      );
    },
    Tv = async () => {
      if (isShuttingDown()) return "teardown-now";
      if (!(await vv())) return "teardown-now";
      if (!isShuttingDown() && bv()) {
        if (!isShuttingDown())
          return (
            logForDebugging(
              "[print.ts] Input closed with active swarm, injected shutdown prompt \u2014 teardown handed to its lineage",
            ),
            "handed-off"
          );
        return "teardown-now";
      }
      let O = makeThrottledLogger(yi, env.CLAUDE_CODE_REMOTE),
        Q = Date.now() + teamTeardownParkTimeoutMs();
      while (!isShuttingDown()) {
        let he = Q - Date.now(),
          ke;
        if (he <= 0) ke = "deadline";
        else
          try {
            ke = await withTimeout(vv(), he, "team teardown park deadline");
          } catch {
            ke = "deadline";
          }
        if (ke === !1) return "teardown-now";
        if (ke === "deadline") {
          let rt = w();
          return (
            logForDebugging(
              `[print.ts] Team teardown park gave up after ${teamTeardownParkTimeoutMs()}ms (shutdown prompt injected: ${mr}) with ${Object.keys(rt.teamContext?.teammates ?? {}).length} roster teammate(s) and ${count(Object.values(rt.tasks), (dt) => dt.type === "in_process_teammate" && dt.status === "running")} in-process teammate task(s) still active; tearing down anyway`,
            ),
            logEvent("tengu_headless_team_teardown_park_timeout", { prompt_injected: mr }),
            "teardown-now"
          );
        }
        (O(), await sleep(500));
      }
      return "teardown-now";
    };
  async function Rv() {
    (Sv.stop(), ha.abort(userAbortReason("shutdown")));
    let O =
        Wi.size > 0 && !sigintHandler()
          ? withTimeout(Promise.all(Wi.values()), 1000, "side questions still unwinding at teardown").catch(
              () => {},
            )
          : void 0,
      settle = qo.settle();
    if (settle) await settle;
    if ((await withDeadline(Do.ended(), 30000), Sf("session_ended"), ni.size > 0))
      ((pr = performance.now() + Hx - Nx - lz),
        await withTimeout(Promise.allSettled(ni), Hx, "reads still pending at teardown").catch(() => {}));
    if (
      (await withTimeout(resolved_3, 300000, "get_context_usage still pending at teardown").catch(() => {}),
      (ww = !0),
      YU(),
      await withTimeout(resolved_2, 30000, "remote_control operation still pending at teardown").catch(
        () => {},
      ),
      await cancelPendingAsyncHooks(),
      (Zd = !1),
      subscribe_2(),
      subscribe_3(),
      VU(),
      zU(),
      gL(),
      pL(),
      startStrandedResume(),
      await withTimeout(
        Promise.all([resolved_5, Vpo()]),
        30000,
        "session.detach hooks still running at teardown",
      ).catch(() => {}),
      onInvalidate(),
      tL(),
      eL(),
      ZU(),
      subscribe_4(),
      subscribe_5(),
      XU(),
      oi?.(),
      ds(),
      Xa(),
      jo?.dispose(),
      release(Iw),
      Yue.get() === uv)
    )
      Yue.set(void 0);
    (IGt(), kU(), syntheticOutputResult(), _U(), yU(), So.dispose(), (Bm = !0), aw.uninstall());
    let he = [...w().mcp.clients, ...Cn, ...dynamicMcpState.clients];
    if (he.some((prev) => prev.type === "connected"))
      await getMcpClientModule().cleanupConnectedMcpClients(he);
    if (
      (iL(),
      await drainQueuedMessages(n, messageQueue),
      Ro.dispose(),
      subscribe(),
      install(),
      Ia.dispose(),
      install_2(),
      currentAppState(),
      await Gvt(),
      shouldKillOnStreamClose({ shuttingDown: isShuttingDown(), remoteTransport: n instanceof RemoteIO }))
    )
      killOrphanedShells(createTaskFramework(w, P));
    if (O) await O;
    if ((su.close(), Ni.disarm("session_ending"), onRequestPending(), cs.dispose(), !to))
      (output.done(), (_a = !0));
  }
  let Cv = createUserDecisionReporter(e, n.sessionState),
    Pv = new TurnModelOverrideTracker({
      modelOverride: getMainLoopModelOverride,
      activeModel: () => userSpecifiedModel,
      setActiveModel: (O) => {
        userSpecifiedModel = O;
      },
      recordAllowedModelApplied: recordAllowedModelApplied,
      noticeRestrictedModel: noticeRestrictedModel,
    }),
    th = new HeldResultsController({
      drain: ze,
      messageQueue: messageQueue,
      toolState: Po,
      store: me,
      pendingNotificationWaits: io,
      storageV5: x.storageV5,
      sessionMirror: x.sessionMirror === !0,
      flushSessionStorage: flushSessionStorage,
      emit: (O) => output.enqueue(O),
      heldResultTotals: () => ({
        totalCostUsd: getTotalCostUSD(),
        durationApiMs: getTotalAPIDuration(),
        modelUsage: getModelUsage(),
        usage: void 0,
        subagentStats: buildFileHistorySnapshotChain(e),
        safetyStops: getSafetyStops(),
      }),
      turnAbortedForShutdown: Hr,
      shuttingDown: isShuttingDown,
      stopping: () => isShuttingDown() || isTerminalShutdown(),
      teardownRequested: isTeardownUnwindRequested,
      emitPendingSuggestion: () => qo.emitPending(),
      handbackPointerResults: x.handbackPointerResults ?? new WeakSet(),
      lateReleasedResults: x.lateReleasedResults ?? new WeakSet(),
      autoModeStopNotices: x.autoModeStopNotices ?? new WeakMap(),
    }),
    Mv = new WorkerDirSyncReporter({
      workerDirSync: x.workerDirSync,
      enqueueSdkEvent: enqueueTaskNotification,
      turnEndUploadListener: x.turnEndUploadListener,
    });
  R1r(e).then(() => setImmediate(releaseStartupWork, e.host, "turn_started"));
  let Av = new OneShotRunLimits({
      drain: ze,
      frameIntake: Oo,
      declinedRedeliveries: jn,
      held: Se,
      endsItsInput: !isSingleShotPrintSession(),
      isRemoteInput: () => n.isRemoteTransport(),
      maxTurns: x.maxTurns,
      maxBudgetUsd: x.maxBudgetUsd,
    }),
    uL = new TurnDispatcher({
      messageQueue: messageQueue,
      drain: ze,
      prewaitLatch: Ro,
      turnOutcome: Nn,
      io: n,
      emit: (O) => {
        if ((output.enqueue(O), O.type === "system" && O.subtype === "init")) {
          try {
            let currentAppState = Ho(),
              he = jsonStringify(O.slash_commands);
            if (jsonStringify(mergeClients_2(currentAppState).map((rt) => rt.name)) !== he)
              ((cd = he), (of = !0));
            else if (cd === null) cd = jsonStringify(toSlashCommands(currentAppState));
          } catch (error) {
            logError(error);
          }
          iv();
        }
      },
      stopping: () => isShuttingDown() || isTerminalShutdown(),
      messages: () => Ct,
      pendingMcpServerCount: () => count(w().mcp.clients, (O) => O.type === "pending"),
      engine: () => ((jo ??= QueryEngine(yc(_c()))), jo.setModel(userSpecifiedModel), va(), jo),
      drainSdkEvents: ws,
      deferredToolUse: () => Cr,
      takeErrorRowBehind: (O) => {
        let Q = It.get(O);
        return (It.delete(O), Q);
      },
      inTurnScope: ({ command: command, input: input }, he) => {
        let ke =
            typeof input === "string"
              ? input
              : extractTextContent_2(
                  input,
                  `
`,
                ),
          rt = (Gt) =>
            runWithContextKey(messageTurnAttributionKey(command), () =>
              command.ccrTurnIdEndsWithTurn ? H4s(command.ccrTurnId, Gt) : L4s(command.ccrTurnId, Gt),
            ),
          dt =
            command.traceContext || command.linkedTraceContexts?.length
              ? { parent: command.traceContext, linked: command.linkedTraceContexts ?? [] }
              : void 0;
        return rt(() =>
          DRn({ workload: command.workload ?? x.workload, scheduledByPlugin: Y3n([command]) }, () =>
            withInteractionSpan(ke, dt, he),
          ),
        );
      },
      onTurnStart: ({ command: command, members: members, input: input }) => {
        if (
          (Av.turnStarted(members),
          Pv.noteTurnStart(),
          hf.noteTurnStart({ command: command, members: members }),
          reportStartedNotifications({ getAppState: w, session: e }, members),
          isSlashCommandPrompt(command, input, Ho))
        )
          e.requestJournal.recordMainThreadTurnStart();
        (activityManager.startCLIActivity("print-ask"),
          Cv(!0),
          (zg = !0),
          _f.noteTurnStart(),
          Ia.noteTurnStart(members));
      },
      onFrame: (O, { command: command, refused: refused }) => {
        if (command.handedOffTurn === void 0 && !refused) Cr = void 0;
        if (
          (hf.noteFrame(O),
          Ia.noteFrame(O),
          _f.noteFrame(O),
          command.shouldQuery !== !1 &&
            (O.type === "result" || (O.type === "system" && O.subtype === "init")))
        )
          settleOwedTitle(Tg);
        if (O.type === "system" && O.subtype === "compact_boundary") Ps = 0;
        Dd();
      },
      teeFrame: ns,
      plainDeltasNeedOnlyEmit: env.CLAUDE_CODE_PLAIN_DELTA_FAST_PATH
        ? () => vn === null && !hasQueuedTaskNotification(() => !0)
        : void 0,
      onResult: (O, Q) => (Av.turnEnded(O), th.route(O, Q)),
      afterTurnFinally: () => {
        if (messageQueue.peek(im) === void 0 && !Oo.hasParked() && !n.hasUnconsumedInput)
          setImmediate(releaseStartupWork, e.host, "turn_started");
        (hf.noteTurnEnd(),
          Ia.noteTurnEnd(),
          _f.noteTurnEnd(),
          Rg.noteTurnEnd(ja),
          Cv(!1),
          iv(),
          Ld(),
          Pv.adoptAtTurnEnd());
        let refreshedAppState = getMainLoopModel();
        if (
          (reportBridgeModel(refreshedAppState),
          reportEffortForModel(refreshedAppState, w()),
          n.sessionState.notifyUltracodeActive(isUltracodeActive(w().ultracode, refreshedAppState)),
          !isShuttingDown())
        )
          n.sessionState.markResumableOrphanedAgentsToldAtTurnEnd();
        (buildBridgeInitializeCommands(Il, Om),
          mirrorTokenUsageToBridge(),
          na("turn_end", { force: !0 }),
          endInteractionSpan(),
          activityManager.endCLIActivity("print-ask"));
      },
    }),
    cL = new TurnGate({
      drain: ze,
      messageQueue: messageQueue,
      deliveryLedger: Jn,
      declinedRedeliveries: jn,
      io: n,
      emit: (O) => output.enqueue(O),
      drainSdkEvents: ws,
      flushTranscript: () => n.flushInternalEvents(),
      flushAcks: () => n.flushDeliveryAcks(),
      stopping: isShuttingDown,
      idleRelease: jg,
      kick: () => void Os(),
      endSessionHead: isTeamShutdownReminder,
      reportContextUsage: reportAtTurnEnd,
      decideIdleReport: () => Ie.decideIdleReport(),
      pushCost: wv,
      startRecap: () => {
        maybeStartCcrRecap(e.ccrRecap, n.sessionState);
      },
      startStopRetirementDue: () => Ie.startStopRetirementDue(),
      rearmNudge: () => {
        if ((rearmNotificationNudge({ getAppState: w, setAppState: P, session: e }), Qs))
          Qs.sessionInboxPointers.peek(e)?.renotifyUnfetched(messageQueue);
      },
    }),
    Iv = new TeamLeadPoller({
      drain: ze,
      messageQueue: messageQueue,
      store: me,
      storageV5: x.storageV5,
      kick: () => void Os(),
      enqueueTeamShutdownPrompt: bv,
    }),
    Ov = new SparedWindowReporter({
      drain: ze,
      io: n,
      stopping: () => isShuttingDown() || isTerminalShutdown(),
    }),
    Dv = () => Ov.report(),
    Fv,
    xv,
    Uv;
  if (x.workerDirSync !== void 0) x.turnGate?.register(dirSyncPullParticipant(x.workerDirSync, e, void 0));
  let nh = new HeadlessTurnLoop({
      drain: ze,
      messageQueue: messageQueue,
      prewaitLatch: Ro,
      deliveryLedger: Jn,
      turnRunner: uL,
      drainSettle: cL,
      turnOutcome: Nn,
      io: n,
      emit: (O) => output.enqueue(O),
      drainSdkEvents: ws,
      stopping: isShuttingDown,
      terminalShutdown: isTerminalShutdown,
      endSessionHead: isTeamShutdownReminder,
      commandLacksUserIntent: isPassiveCommand,
      repeatsUsageLimitAlert: (O) => isUsageLimitDenialStale(O, Ct, () => Ao() ?? getMainLoopModel()),
      revokeCodeliveredFollowups: forgetCodeliveredFollowups,
      deferredToolUsePending: () => Cr !== void 0,
      idleRelease: jg,
      turnGate: x.turnGate,
      session: e,
      sessionMirror: x.sessionMirror,
      host: {
        onEntry: () => {
          if ((setAwaitsFirstRun(!1), Ov.runEntered(), !Ie.inheritedPromptOwnsWorkerStatus())) Dv();
          aCo(e.ccrRecap);
        },
        beforeDrain: () => ra.beforeDrain(),
        openRun: () => {
          let O = makeThrottledLogger(yi, env.CLAUDE_CODE_REMOTE),
            Q = makeThrottledLogger(yi, !0),
            he = new BackgroundTaskWaiter({
              drain: ze,
              messageQueue: messageQueue,
              io: n,
              store: me,
              toolState: Po,
              detachedToolCalls: kT.of(e),
              pendingNotificationWaits: io,
              ccrRecap: e.ccrRecap,
              maxBudgetUsd: x.maxBudgetUsd,
              storageV5: x.storageV5,
              turnAbortedForShutdown: Hr,
              stopping: isShuttingDown,
              sessionSignal: Wo.signal,
              spendRecorded: e.costLedger.spendRecorded,
              pulseKeepAlive: O,
              hasPendingSessionWakeup: ({ now: now, parkedSince: parkedSince }) =>
                Mr() &&
                (kn > 0 ||
                  hasPendingLoopWakeup(getSessionCronTasks(), { now: now, parkedSince: parkedSince })),
              pendingSessionWakeupIds: () =>
                getSessionCronTasks()
                  .filter((ke) => ke.kind === "loop")
                  .map((ke) => ke.id),
              hasLiveSessionWakeup: (ke) =>
                En() &&
                (!ze.inputClosed || isTidySlothGateOn()) &&
                (kn > 0 || hasPendingLoopWakeup(getSessionCronTasks(), { now: ke, parkedSince: 0 })),
              waitNoticeOnStderr: shouldShowBackgroundWaitStatus({
                outputFormat: x.outputFormat,
                stderrIsTerminal: process.stderr.isTTY === !0,
                stdoutIsTerminal: process.stdout.isTTY === !0,
              }),
              startStopRetirementDue: () => Ie.startStopRetirementDue(),
              onIdleReported: () => {
                if (Qs) Qs.sessionInboxPointers.peek(e)?.renotifyUnfetched(messageQueue);
              },
            });
          return (
            (Uv = he),
            {
              afterPass: ({ drained: drained }) => {
                if ((wv(), mirrorTokenUsageToBridge(), drained)) reportAtTurnEnd();
                return he.park({ drainedThisIteration: drained });
              },
              afterRelease: function* () {
                try {
                  return yield* Iv.poll({
                    pulseKeepAlive: () => !sendSessionActivitySignal_2() && O(),
                    pulseInboxFrameActivity: Q,
                  });
                } catch (error) {
                  return (logError(toError(error)), "done");
                }
              },
            }
          );
        },
        loopTop: () => ra.loopTop(),
        setAsideHeldInput: () => Se.setAside(),
        holdsEvalSettles: () => Uv?.holdsEvalSettles() ?? !1,
        onLoopTopWork: () => {
          aCo(e.ccrRecap);
          let state = n.sessionState.getState();
          if (
            state === "idle" &&
            !isTerminalShutdown() &&
            (ze.runningReported || !Ie.registrationKeepsPendingAction)
          )
            n.sessionState.notifyStateChanged("running");
          else if (state === "running" && ze.runPhase !== void 0 && !isTerminalShutdown())
            n.sessionState.wipeTurnScopedMetadata();
        },
        onRescueGaveWay: () => Ie.rescueGaveWay(),
        onHead: () => {
          if (ze.intentBatchInFlight) x.homeSeed?.record.markFirstCommandDequeued();
          (Nr?.(), nXs(e));
        },
        replayMerged: (O, Q) => {
          if (!x.replayUserMessages) return;
          for (let he of O)
            if (he.uuid && he.uuid !== Q.uuid) {
              let ke = normalizeTaskNotificationOrigin(he.origin);
              output.enqueue({
                type: "user",
                message: { role: "user", content: he.value },
                session_id: getSessionId(),
                parent_tool_use_id: null,
                uuid: he.uuid,
                isReplay: !0,
                ...(he.isMeta && { isSynthetic: !0 }),
                ...(he.fileAttachments?.length && { file_attachments: he.fileAttachments }),
                ...(ke && { origin: ke }),
              });
            }
        },
        firstCommand: () => ra.firstCommand(),
        accountPluginsJoin: ({ command: command }) =>
          ra.accountPluginsJoin(() => {
            try {
              return isImmediateCommandCandidate(command, () => Ho());
            } catch (error) {
              return (logError(error), !0);
            }
          }),
        turnMountJoin: () => {
          if (zr) {
            let takeFirstTurnJoins = zr.takeFirstTurnJoins();
            if (!takeFirstTurnJoins.replyMount && !takeFirstTurnJoins.grants) return null;
            let Q = require("./chunk-wpq8yj9g.js"),
              PROJECTS_MOUNT_FIRST_COMMAND_WAIT_MS = Q.PROJECTS_MOUNT_FIRST_COMMAND_WAIT_MS;
            return Promise.all([
              takeFirstTurnJoins.replyMount
                ? Q.joinProjectsMountBeforeFirstCommand(
                    takeFirstTurnJoins.replyMount,
                    w,
                    PROJECTS_MOUNT_FIRST_COMMAND_WAIT_MS,
                  )
                : Promise.resolve(),
              takeFirstTurnJoins.grants
                ? withDeadline(takeFirstTurnJoins.grants, PROJECTS_MOUNT_FIRST_COMMAND_WAIT_MS).then(() => {
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
        sdkMcpServersJoin: ({ command: command }) => qg.join(command) ?? ra.sdkToolRelistJoin(command),
        deferredMcpServersJoin: ({ command: command }) => {
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
        onCommitted: ({ command: command, members: members }) => {
          ja = !1;
          let he = turnAttributionKeyOf(members);
          if (
            ((Fv = he),
            (Hs = he === void 0 ? void 0 : { userMessageUuid: he, anchor: Ct.at(-1) }),
            ze.intentBatchInFlight)
          )
            x.homeSeed?.record.markFirstCommandDequeued();
          Bi = members.some(canBatchWith);
          try {
            if (
              ze.intentBatchInFlight &&
              command.mode === "prompt" &&
              !command.isMeta &&
              isSlashCommandPrompt(command, command.value, Ho)
            )
              aw.turnStarted();
          } catch (error) {
            logError(error);
          }
          if (Ie.onCommitted(command)) Dv();
        },
        ...(Qa !== void 0 && {
          refuseStart: async (O, Q) => {
            let refuseStart = await Qa.refuseStart(O, Q);
            if (
              ((ja = refuseStart !== void 0),
              refuseStart === void 0 && QP(O) && isSlashCommandPrompt(O.command, O.command.value, Ho))
            )
              Rg.start(O.command.ccrTurnId);
            if (refuseStart !== void 0) (rFs(e.ccrRecap), (Hi = !0));
            else if (Hi) ((Hi = !1), oFs(e.ccrRecap));
            return refuseStart;
          },
        }),
        beforeArm: ({ batch: { command: command, members: members }, input: input }) => {
          if (
            (reportQueuedSubmissions(members, "turn_end"),
            markMessagesRead(members),
            n instanceof RemoteIO && command.mode === "prompt" && command.uuid !== void 0)
          )
            logEvent("tengu_bridge_message_received", { is_repl: !1 });
          qo.onCommand(command, input);
        },
        afterArm: ({ signal: signal, aheadOfStart: aheadOfStart }) => {
          if (!signal.aborted) (Ys(), Ni.disarm("live_turn"));
          xv = Mv.beforeTurn();
          let he = aheadOfStart ? void 0 : wU,
            retirement = Ie.retirement;
          if (retirement === void 0 || he === void 0) return retirement ?? he;
          return Promise.all([retirement, he]).then(() => {
            return;
          });
        },
        afterTurn: ({ batch: batch, signal: signal, turnEnd: turnEnd }) => {
          if (
            (Dd(),
            vn?.serverVouch?.holds(),
            (Hs = void 0),
            vn?.sendResult(
              resolveTurnTerminalReason({
                userMessageUuid: Fv,
                outcome: turnEnd.result,
                aborted: classifyTurnAbort(ze, signal, turnEnd),
              }),
            ),
            Mv.afterTurn({ turnStartTime: xv, signal: signal, userEventUuids: batch.uuids }),
            !ja)
          )
            qo.afterResult(batch.command);
          (oh.route(),
            settleTurnReads(
              { getAppState: w, setAppState: P, session: e },
              { signal: signal, turnEnd: turnEnd },
            ));
        },
        releaseHeld: () => th.release(),
        onCrash: (O) => {
          (reportTurnLoopCrash(O), qo.abort(), gracefulShutdownSync(1));
        },
        onInputClosed: async () => {
          if ((heldBackResult?.stop(), (heldBackResult = null), (await Tv()) === "handed-off"));
          else await Rv();
        },
      },
    }),
    Lv = (O) => {
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
      ((ze.endSessionRequested = !0), (to = !0), output.error(Q));
    },
    Os = () => nh.run().catch(Lv),
    Sf = (O, Q) => {
      for (let he of messageQueue.removeByFilter(
        (ke) => ke.clientBashCommand === !0 && (Q === void 0 || (ke.uuid !== void 0 && Q.names([ke.uuid]))),
        { reason: O },
      ))
        emitBangCommandNotRun(
          { emit: (ke) => output.enqueue(ke), sessionId: getSessionId() },
          typeof he.value === "string" ? he.value : "",
          O === "session_ended" ? "session_ended" : "stopped",
        );
    };
  Vs = () => Sf("session_ended");
  let Bv,
    rh,
    Hv = () => (Bv ??= getFeatureValue_SESSION_PINNED("tengu_cloud_session_shell", !1) === !0),
    mL =
      n instanceof RemoteIO
        ? {
            joins: () => {
              if (rh !== void 0) return rh;
              if (Bv !== void 0 || hasFreshGrowthBookFeatures()) return Hv();
              return (rh = withDeadline(
                initializeGrowthBook().catch(() => null),
                fa,
              ).then(Hv));
            },
            enqueue: (O, Q, he) => {
              (messageQueue.enqueue({
                mode: "bash",
                clientBashCommand: !0,
                ...(he !== void 0 && { clientBashCommandCwd: he }),
                value: O,
                uuid: Q,
                turnAttributionKey: Q,
                agentId: mainAgentId(),
              }),
                Os());
            },
          }
        : void 0,
    oh = new ResultWakeRouter({
      drain: ze,
      messageQueue: messageQueue,
      getTasks: () => w().tasks,
      canUseTool: S,
      maxBudgetUsd: x.maxBudgetUsd,
    }),
    startStrandedResume = oh.startStrandedResume(createTaskFramework(w, P)),
    pL = createBridgeTurnKeepAwake(n.sessionState),
    gL = watchTaskChanges({
      store: me,
      drain: ze,
      io: n,
      ccrRecap: e.ccrRecap,
      stopping: () => isShuttingDown() || isTerminalShutdown(),
      idleAllowedAtTurnEnd: () => Ie.retirement === void 0 && Ic(),
    });
  if (
    (installWakeRouterKick({
      messageQueue: messageQueue,
      drain: ze,
      routeWakes: () => oh.route(),
      kick: () => void Os(),
    }),
    startHostReturnWakes({
      toolState: Po,
      messageQueue: messageQueue,
      drain: ze,
      permissionMode: () => w().toolPermissionContext.mode,
    }),
    re)
  )
    (logForDebugging(`[print.ts] Auto-resuming deferred tool: ${re.toolName} (${re.toolUseID})`),
      messageQueue.enqueue({
        mode: "prompt",
        agentId: mainAgentId(),
        value: Ijr(),
        uuid: randomUUID_19(),
        isMeta: !0,
      }),
      Os());
  {
    let { setOnEnqueue: setOnEnqueue } = require("./chunk-cgamr0t5.js");
    setOnEnqueue(() => {
      if (!ze.inputClosed) (cancelPendingUserDialogs(n, "uds_message"), Os());
    });
  }
  let qv = createWaitingStatusReporter(x.storageV5);
  (n.sessionState.stateChanged.subscribe(qv), qv(n.sessionState.getState()));
  {
    let {
      setOnPeerIdleNotice: setOnPeerIdleNotice,
      setOnIdleSubscribed: setOnIdleSubscribed,
      setHostStatusSubscription: setHostStatusSubscription,
      setIdleLastTurnTextProvider: setIdleLastTurnTextProvider,
      notePeerIdleStatus: notePeerIdleStatus,
      enqueueIdleNoticesForModel: enqueueIdleNoticesForModel,
    } = require("./chunk-p4c203y6.js");
    (setOnPeerIdleNotice((pt) => {
      if (
        (logForDebugging(`[headless] cross-session idle notice: kind=${pt.kind} label=${jy(pt.label)}`),
        !pt.modelVisible)
      )
        return;
      if ((enqueueIdleNoticesForModel([pt]), !ze.inputClosed))
        (cancelPendingUserDialogs(n, "uds_message"), Os());
    }),
      setIdleLastTurnTextProvider(() => getLastAssistantTextForResult(Ct)));
    {
      let {
        registerReplyYieldHolder: registerReplyYieldHolder,
        notifyModelOfReplyYield: notifyModelOfReplyYield,
      } = require("./chunk-4te7h8m1.js");
      registerReplyYieldHolder({
        yielded: (Dt) => {
          (logForDebugging(
            `[headless] yielded Artifact comment replies for ${Dt.length} Artifact(s) to another session of this conversation`,
          ),
            notifyModelOfReplyYield("yielded", Dt.length));
        },
        reverted: (Dt) => {
          (logForDebugging(
            `[headless] ${Dt.length} yielded Artifact reply hand-off(s) came back to this session`,
          ),
            notifyModelOfReplyYield("reverted", Dt.length));
        },
        stoppedElsewhere: (Dt) => {
          (logForDebugging(
            `[headless] ${Dt.length} yielded Artifact reply hand-off(s) came back stopped by the other session`,
          ),
            notifyModelOfReplyYield("stopped_elsewhere", Dt.length));
        },
      });
    }
    (setOnIdleSubscribed(
      (pt, Xt) => {
        logForDebugging(
          `[headless] cross-session idle subscription recorded from ${jy(pt)}${Xt ? "" : " (unverifiable sender)"}`,
        );
      },
      (pt) => {
        if (pt > 0)
          logForDebugging(
            `[headless] ${pt} more cross-session idle subscription(s) were recorded before this handler mounted`,
          );
      },
    ),
      setHostStatusSubscription(
        n.sessionState.stateChanged.subscribe((pt) => {
          notePeerIdleStatus(pt === "idle", pt === "running");
        }),
      ));
    let state = n.sessionState.getState();
    notePeerIdleStatus(state === "idle", state === "running");
  }
  if (ic.isKairosCronEnabled() && !configProbeEnv()) {
    let O = (ke, rt, dt, Gt) => {
        (messageQueue.enqueue({
          mode: "prompt",
          agentId: mainAgentId(),
          value: ke,
          uuid: randomUUID_19(),
          priority: "later",
          isMeta: !0,
          skipSlashCommands: !0,
          modelScheduledOrigin: !0,
          skipAttachments: !0,
          wakeupSource: rt,
          wakeupScheduledFor: Gt,
          ...(dt !== void 0 && { scheduledByPlugin: dt }),
          workload: WORKLOAD_CRON,
          ...(shouldStampThreadState({ isPeer: !1 }) && { stampThreadState: !0 }),
        }),
          cancelPendingUserDialogs(n, "cron_fire"),
          Os());
      },
      resolved = Promise.resolve(),
      he = (ke, rt, dt, Gt, pt, Xt) => {
        if (ze.inputClosed && !(dt && Mr())) return;
        let storageV5 = x.storageV5;
        if (storageV5) {
          if (dt) kn++;
          resolved = resolved.then(async () => {
            try {
              let loopDefaultFireAsync = await sg.resolveLoopDefaultFireAsync(
                e.autonomousLoopPreamble,
                ke,
                storageV5,
              );
              if (ze.inputClosed && !(dt && Mr())) return;
              (O(loopDefaultFireAsync, rt, Gt, Xt), pt?.());
            } catch (error) {
              logForDebugging(`[ScheduledTasks] loop.md v5 expansion failed; fire skipped: ${error}`);
            } finally {
              if (dt) kn--;
            }
          });
          return;
        }
        let loopDefaultFire = sg.resolveLoopDefaultFire(e.autonomousLoopPreamble, ke);
        (O(loopDefaultFire, rt, Gt, Xt), pt?.());
      };
    ((heldBackResult = rg.createCronScheduler({
      onFire: (ke) => he(ke, "schedule_wakeup", !1),
      onMissed: wrapScheduledTaskBatchRunner((ke, rt, dt) =>
        he(rg.buildMissedTaskNotification(ke), "schedule_wakeup", !1, rt, dt),
      ),
      onFireTask: wrapScheduledTaskRunner((ke, rt) =>
        he(ke.prompt, a9n(ke), ke.kind === "loop", ke.plugin, rt, ke.scheduledFor),
      ),
      isLoading: () =>
        ze.inputClosed
          ? !(ze.running && ze.runPhase === "waiting_for_agents" && Mr())
          : isBusyOrClosed({ running: ze.running, runPhase: ze.runPhase, inputClosed: ze.inputClosed }),
      filter: (prompt) => !ze.inputClosed || prompt.kind === "loop",
      leaseFileTasks: () => !ze.inputClosed,
      getJitterConfig: sU.getCronJitterConfig,
      isKilled: () => !ic.isKairosCronEnabled(),
    })),
      heldBackResult.start());
  }
  let m1 = new Map(),
    kf = new FlagSettingsClaimTracker(),
    sendControlResponseSuccess = function (message, response) {
      if (message.request.subtype === "apply_flag_settings") kf.answered(message.request_id);
      output.enqueue(controlSuccessResponse(message.request_id, response));
    },
    sendControlResponseError = function (message, errorMessage) {
      if (!(n instanceof RemoteIO)) {
        sendControlResponseSuccess(message, errorMessage);
        return;
      }
      output.enqueue(markLiveOnlyResponse(message.request_id, errorMessage));
    },
    Ws = function (O, Q) {
      if (isTransportBacked(e)) logForDebugging(`${O}: ${Q}`, { level: "error" });
    },
    yt = function (O, Q, he, ke) {
      if (O.request.subtype === "apply_flag_settings") kf.answered(O.request_id, Q);
      output.enqueue(controlErrorResponse(O.request_id, Q, he, ke));
    },
    Xn = function (O, Q, he, ke = {}, rt) {
      yt(O, controlHandlerError(isTransportBacked(e), Q, he, ke).error, rt);
    },
    sh = function (O, Q) {
      if (Q.subtype === "success") sendControlResponseSuccess(O, Q.response);
      else yt(O, Q.error);
    },
    handledOrphanedToolUseIds = new Map(),
    hL = {
      canUseTool: S,
      toolUseContext: (message) =>
        ask(yc(_c()), { abortController: message, userSpecifiedModel: userSpecifiedModel }),
      sessionAbortController: Wo,
      cancellableControlRequests: handledOrphanedToolUseIds,
    },
    ah,
    dh,
    Qv;
  if (x.remoteToolsAdmission?.admitted === !0)
    Po.get(ReannounceRequester).provide((O, Q) => n.askToAnnounce(O, Q));
  let _L = { current: Promise.resolve() },
    activeOAuthFlows = new Set(),
    SL = {
      session: e,
      sessionHooks: ps,
      engineState: w,
      messageQueue: messageQueue,
      ingressTail: _L,
      stopped: new AbortController().signal,
      storageV5: x.storageV5,
      credentials: x.credentials,
      flushSessionStorage: flushSessionStorage,
      redactsPersistedLane: () => isTransportBacked(e),
    },
    kL = { current: Promise.resolve() },
    wL,
    $v = () =>
      (wL ??= (async () => {
        let {
            createWorkflowLaunchState: createWorkflowLaunchState,
            readWorkflowLaunchRecord: readWorkflowLaunchRecord,
            WORKFLOW_LAUNCH_DIGEST_ENV: WORKFLOW_LAUNCH_DIGEST_ENV,
          } = await import("./chunk-w9fbg439.js"),
          { fetchFilestoreBytes: fetchFilestoreBytes } = await import("./chunk-q02nzdea.js"),
          restoredWorkerState = await n.restoredWorkerState;
        return {
          host: e.host,
          state: createWorkflowLaunchState(
            readWorkflowLaunchRecord(restoredWorkerState?.internal?.workflow_launch),
          ),
          isRemoteTransport: () => n.isRemoteTransport(),
          postEvent: (dt) => output.enqueue(dt),
          prependUserMessage: (dt) => n.prependUserMessage(dt),
          ackProcessed: (dt) => n.onCommandLifecycle?.(dt, "completed"),
          getSessionId: getSessionId,
          fetchBundle: (dt) => fetchFilestoreBytes(dt),
          persistRecord: (dt) => n.sessionState.notifyInternalMetadataChanged({ workflow_launch: dt }),
          flushRecord: () => n.flushSessionState(),
          getWorkerEpoch: () => env.CLAUDE_CODE_WORKER_EPOCH,
          getDispatchedDigest: () => getPreSettingsEnvSnapshot()[WORKFLOW_LAUNCH_DIGEST_ENV],
          isAccountLaunchedReview: () => isEnvTruthy(getPreSettingsEnvSnapshot().BUGHUNTER_RESULT_RELAY),
        };
      })()),
    Oc = function () {
      let O = setInterval(
        (Q) => {
          try {
            Q.enqueue({ type: "keep_alive" });
          } catch {}
        },
        30000,
        output,
      );
      return () => clearInterval(O);
    },
    bL = function (O, Q) {
      (logEvent("tengu_sdk_control_request_progress", { status: fromEnum(Q.status) }),
        output.enqueue({
          type: "system",
          subtype: "control_request_progress",
          request_id: O.request_id,
          ...Q,
          uuid: randomUUID_19(),
          session_id: getSessionId(),
        }));
    };
  async function TL(O, Q) {
    let he = {
      reload_claude_md: Boolean(Q.reload_claude_md),
      reload_skills: Boolean(Q.reload_skills),
      reload_plugins: Boolean(Q.reload_plugins),
    };
    try {
      let ke = await registerRepoRoot(Q.directory, () => w().toolPermissionContext);
      if (w().toolPermissionContext.additionalWorkingDirectories.has(ke))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `register_repo_root: ${sanitizeTelemetryString(Q.directory)} is already a registered working directory`,
          "register_repo_root: directory is already a registered working directory",
          "already_registered",
        );
      (P((pt) => ({
        ...pt,
        toolPermissionContext: applyValidatedPermissionUpdate(pt.toolPermissionContext, {
          type: "addDirectories",
          directories: [ke],
          destination: "session",
        }),
      })),
        pinResolvedWorkingDirPath(ke));
      let rt = getAdditionalDirectoriesForClaudeMd();
      if (!rt.includes(ke)) setAdditionalDirectoriesForClaudeMd([...rt, ke]);
      SandboxManager.refreshConfig();
      let dt = Oc();
      if (
        (executeDirectoryAddedHooks(e, ke, "register_repo_root", {
          storageV5: x.storageV5,
          credentials: x.credentials,
        })
          .then(({ results: results, systemMessages: systemMessages }) => {
            for (let Dt of systemMessages) logForDebugging(`DirectoryAdded hook: ${Dt}`);
            for (let Dt of results)
              if (!Dt.succeeded && Dt.output)
                logForDebugging(`DirectoryAdded hook failed: ${Dt.output}`, { level: "error" });
          })
          .catch((pt) => {
            logForDebugging(`DirectoryAdded hook exec failed: ${pt}`, { level: "error" });
          })
          .finally(dt),
        Q.reload_claude_md)
      ) {
        clearMemoryFilesCache(e);
        let pt = join(ke, "CLAUDE.md");
        if (!ba.includes(pt)) ba.push(pt);
        if (isAdditionalDirWithoutNestedMemory(ke)) invalidateUserContext(e, "directory_added");
      }
      if (Q.reload_skills) await reloadSkillsAfterDirectoryChange();
      if (Q.reload_plugins) {
        (await Promise.race([
          Promise.allSettled([installPluginsForHeadlessSerialized(void 0, x.storageV5, x.credentials)]),
          sleep(ese()),
        ]),
          await refreshActivePlugins(over_2, x.storageV5, x.credentials),
          (He = !0));
        let pt = new Set(Object.keys(dynamicMcpState.configs)),
          Xt = new Set(
            w()
              .mcp.clients.filter((client) => !pt.has(client.name))
              .map((Dt) => Dt.name),
          );
        await Promise.allSettled([Bl(Xt, "reload_plugins")]);
      }
      let Gt = { directory: isTransportBacked(e) ? Q.directory : ke };
      (sendControlResponseSuccess(O, Gt), logFeatureOk("sdk_register_repo_root", he));
    } catch (error) {
      let rt = registerRepoRootErrorClass(error),
        dt = rt === void 0 ? void 0 : REGISTER_REPO_ROOT_ERROR_TONES[rt];
      if (
        (Xn(O, "register_repo_root", error, { expected: dt === "sad" || dt === "bad" }),
        rt !== void 0 && dt === "sad")
      )
        logFeatureSad("sdk_register_repo_root", rt, he);
      else logFeatureBad("sdk_register_repo_root", rt ?? "error", he);
    }
  }
  async function RL(O, Q) {
    try {
      let { stageFile: stageFile, addDirectoryDestFromMountPath: addDirectoryDestFromMountPath } =
          await import("./chunk-q02nzdea.js"),
        rt;
      try {
        rt = addDirectoryDestFromMountPath(Q.mount_path);
      } catch (error) {
        (Ws("add_directory dest", errorMessage(error)),
          yt(O, pickForTransport(e, errorMessage(error), "add_directory failed")));
        return;
      }
      if (!isEnvTruthy(env.CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD)) {
        yt(
          O,
          "add_directory requires CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD to be set in the container environment",
        );
        return;
      }
      let dt = await stageFile({ mount_path: Q.mount_path, force: !0 });
      if (!dt.ok) {
        (Ws("add_directory stage", dt.error), yt(O, pickForTransport(e, dt.error, "add_directory failed")));
        return;
      }
      let Gt = dirname(rt),
        pt = getAdditionalDirectoriesForClaudeMd();
      if (!pt.includes(Gt)) setAdditionalDirectoriesForClaudeMd([...pt, Gt]);
      if (
        (clearMemoryFilesCache(e),
        invalidateUserContext(e, "directory_added"),
        await reloadSkillsAfterDirectoryChange(),
        isTransportBacked(e))
      )
        (Ws("add_directory staged", `${rt} (${Gt})`), sendControlResponseSuccess(O, {}));
      else sendControlResponseSuccess(O, { staged_path: rt, directory: Gt });
    } catch (error) {
      Xn(O, "add_directory", error);
    }
  }
  Ie.seedHandledToolUseIds();
  let CL = new Set([...(Z ?? []), ...(x.answeredToolUseIds ?? [])]),
    wf = (O = {}) => {
      if ((qo.discard(), Po.get(HostReturnWakeTracker).stopped(), O.keepDetachedToolCalls !== !0))
        kT.of(e).stopRunning();
      if (O.retireParkedPermission !== !1) Ie.fire(O.parkedPermissionReason ?? "interrupt");
      Rg.stop();
    };
  n.setUnexpectedResponseCallback((O) => Ie.onUnexpectedResponse(O));
  let oauthCallbackSubmitters = new Set(),
    oauthManualCallbackUsed = new Map(),
    oauthAuthPromises = new Map(),
    claudeOAuth = null;
  return (
    (async () => {
      if (xl) await xl;
      Ie.arm();
      let O = new HeldInputReader({
          source: n.structuredInput,
          isRequestOut: () => n.hasPendingRequests(),
          onRequestOut: (j) => n.onRequestPending(j),
        }),
        Q = !1,
        he = () =>
          ze.running ||
          messageQueue.peek(im) !== void 0 ||
          Oo.hasParked() ||
          n.hasUnconsumedInput ||
          O.hasSetAside();
      yieldStartupWorkToTurn(e.host, he);
      let ke = (j = !1) => {
        if (!Q && !j && !he()) Fr();
        ((Q = !0), withResolvers_2.resolve());
      };
      _Cs(vc, y.some((j) => j.type === "user" || j.type === "assistant") || isTerminalTitleEnabled());
      let startTime = performance.now();
      (Br("input_ready_ms", startTime, 0), lyi());
      let dt = new InputLatencyLedger(startTime);
      if (ud && !Yd && isIdlePluginRefreshEnabled()) {
        let j = ud;
        ((jw = !0),
          (Ag = j),
          (Yd = waitForPluginSyncBudget({
            pluginsSync: j,
            remainingSyncBudgetMs: () => ese() - (performance.now() - startTime_2),
            onSyncOutlivedBudget: () => {
              Qw = !0;
            },
            serverNamesOwnedBeforePluginsSync: Zm,
            refreshPluginState: async () => {
              let vo = Jd?.needsRefresh === !0;
              if ((await Cc(), vo && Jd)) Jd.needsRefresh = !1;
            },
          }).then((vo) => {
            Tc = vo ?? null;
          })));
      }
      let Gt = setJitPolicyAfterStartup();
      if (
        (logForDiagnosticsNoPII("info", "cli_message_loop_started", () => ({
          ...(Gt !== 1 && { jit_policy: Gt }),
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
        })),
        headlessProfilerCheckpoint("stdin_listen_started"),
        expectStartupHandshake(e.host),
        env.CLAUDE_CODE_RESUME_INTERRUPTED_TURN &&
          n.isRemoteTransport() &&
          (await n.restoredWorkerState)?.internal?.workflow_launch != null)
      )
        (Xo++,
          (async () => {
            let { resumeWorkflowLaunch: resumeWorkflowLaunch } = await import("./chunk-w9fbg439.js");
            await resumeWorkflowLaunch(await $v());
          })()
            .catch((j) => {
              logForDebugging(`[print.ts] workflow_launch resume failed: ${toError(j).message}`);
            })
            .finally(() => {
              if ((Xo--, !ze.running)) timeoutMs.start();
            }));
      let pt = (j) => ({
          storedAt: sessionStreamCreatedAt(j),
          serviceNow: n.sessionServiceNow(),
          newestFrameAt: n.newestSessionStreamCreatedAt(),
          machineNow: Date.now(),
        }),
        Xt = () => Ie.holdingParkedPermission() && !ze.running,
        Dt = () => reportsRunningBackgroundTasksExplicit() && hasActiveInProcessTeammates(w()),
        On = () => (ze.running && ze.runPhase !== "waiting_for_agents") || Rt(),
        fn = () =>
          (ze.running &&
            ze.runPhase !== "waiting_for_agents" &&
            (ze.dequeueCount > 0 || Ie.retirement !== void 0 || Oo.hasParked())) ||
          Rt(),
        Rt = () =>
          Dt() || (n.sessionState.getState() === "requires_action" && !Xt()) || Ie.stopRetirementOwed,
        Zt = () =>
          messageQueue.getDrainableMainThreadQueueLength() > 0
            ? "commands_queued"
            : !ze.running && n.sessionState.getState() === "requires_action"
              ? "prompt_pending"
              : "turn_running",
        Ar = (j, vo) => {
          if (Sat(vo)) {
            let ai = handleRemoteCancel({
              messageQueue: messageQueue,
              drain: ze,
              prewaitLatch: Ro,
              frameIntake: Oo,
              io: n,
              pressed: vo.message_uuid,
              deliver: () => Ia.pressWaiting(),
              letHeldGo: (Pi) => runSafely(() => Ie.letPressedMessagesGo(Pi)),
            });
            if (ai.send_now === "stopped")
              logQueuedInterruptDecision({
                queued: messageQueue.getCommandQueueSnapshot(),
                turnUnderWay: ze.turnUnderWay,
                lateBind: !1,
                cancelQueued: !1,
                sendNow: !0,
              });
            (sendControlResponseSuccess(j, ai),
              logFeatureOk("headless_interrupt_send_now", { outcome: fromEnum(ai.send_now) }));
            return;
          }
          let uo = parseCancelQueuedTarget(vo),
            Ds = ers(j.request_id),
            ql = !Ds && vo.worker_epoch === void 0;
          if (ql) (Do.interrupt(uo), Sf("cleared_on_cancel", vo.cancel_queued === !0 ? void 0 : uo));
          if (isCancelAimedAtParkedBatch({ drain: ze, prewaitLatch: Ro, aim: uo })) {
            let { receipt: receipt } = cancelQueuedMessages({
              cancelQueued: !1,
              turn: "spared",
              messageQueue: messageQueue,
              drain: ze,
              prewaitLatch: Ro,
              waitingCopies: jn,
              io: n,
            });
            (on(() => Ie.noteAStopsReceipt(receipt, { aim: uo, lateBind: Ds })),
              sendControlResponseSuccess(j, receipt));
            return;
          }
          let Ci = interruptCurrentTurn({
            drain: ze,
            prewaitLatch: Ro,
            aim: uo,
            cancelQueued: vo.cancel_queued === !0,
            lateBind: Ds,
          });
          if (
            (requeueTakenMessage({
              cancelQueued: vo.cancel_queued === !0,
              messageQueue: messageQueue,
              io: n,
            }),
            ql)
          )
            Ia.notePersonsStop();
          let jr = Rd(),
            Ko = killAutoReactSubscriptions(jr.taskRegistry, { durable: !1 }),
            Mu = drainQueuedTaskNotifications(messageQueue, { leaveArtifactRooms: !0 });
          (wf(),
            logQueuedInterruptDecision({
              queued: messageQueue.getCommandQueueSnapshot(),
              turnUnderWay: ze.turnUnderWay,
              lateBind: ers(j.request_id),
              cancelQueued: vo.cancel_queued === !0,
              sendNow: !1,
            }));
          let { receipt: receipt, clearSurvivors: clearSurvivors } = watchNudgeCancel(
              { getAppState: w, setAppState: P, session: e },
              () =>
                cancelQueuedMessages({
                  cancelQueued: vo.cancel_queued === !0,
                  turn: uo && (Ci ? "stopped" : "idle"),
                  messageQueue: messageQueue,
                  drain: ze,
                  prewaitLatch: Ro,
                  waitingCopies: jn,
                  io: n,
                }),
            ),
            Ql = on(() => Ie.noteAStopsReceipt(receipt, { aim: uo, lateBind: Ds }));
          if (
            (sendControlResponseSuccess(
              j,
              Ql.length === 0 ? receipt : { ...receipt, cancelled: [...(receipt.cancelled ?? []), ...Ql] },
            ),
            Ko > 0 || Mu.length > 0)
          )
            artifactWatchStopNotice(Ko, Mu);
          requeueStopNotifications(messageQueue, clearSurvivors, Ko);
        },
        no = {
          admission: x.turnHandoffAdmission ?? { admitted: !1, reason: "not_managed_cloud_worker" },
          tools: Ri,
          toolAliases: () => x.toolAliases,
          mcpClients: Ns,
          messages: () => Ct,
          handledToolUseIds: Ie.handledToolUseIds,
          recoveredToolUseIds: CL,
          messageQueue: messageQueue,
          drain: ze,
          kick: () => void Os(),
          redactsPersistedLane: () => isTransportBacked(e),
          appliedRewind: () => wa,
          linesWaitingAhead: () => On() || messageQueue.getCommandQueue().some(isPassiveQueueItem),
          carriedWritesMode:
            x.turnHandoffAdmission?.admitted && isClaudeAiChatOrigin()
              ? () => (aQe() || jDs() ? w().toolPermissionContext.mode : void 0)
              : void 0,
          personStopped: () => Po.get(HostReturnWakeTracker).stopped(),
          personWrote: () => e.userPresence.notePersonWrote(),
          stopUnabortedWork: () => {
            wf();
          },
        };
      if (isParkedSpare())
        (profileCheckpoint("spare_parked"),
          headlessProfilerCheckpoint("spare_parked"),
          addStartupContext({ spare: 1 }));
      let pd = limitConcurrency(vz, async (j) => {
          let { listDirectoryForRemote: listDirectoryForRemote } = await import("./chunk-cxcyfn5m.js"),
            uo = getProjectRoot(),
            Ds = () => getOriginalCwd() !== uo;
          if (Ds()) throw repoRootError("workspace_moved");
          return listDirectoryForRemote(j, uo, () => w().toolPermissionContext, Ds);
        }),
        Da = { probes: 0 },
        Rs = async (j, vo) => {
          let { readFileForRemote: readFileForRemote } = await import("./chunk-kkqmctap.js");
          return readFileForRemote(j.path, j.max_bytes, () => w().toolPermissionContext, {
            encoding: j.encoding,
            anchor: j.anchor,
            telemetrySource: "headless_stream",
            asWrittenSources: vo && {
              heldFiles: () => fs.everHeldPaths(),
              timeLimitMs: Nx,
              stranded: Da,
              whyNotServed: () => readFileAsWrittenUnservedReason(e),
              whyNotBegin: () => {
                let startTime = performance.now();
                return startTime >= pr
                  ? "session_ending"
                  : startTime - vo.askedAt >= dz
                    ? "waited_too_long"
                    : void 0;
              },
              onRefusal: vo.onRefusal,
            },
          });
        },
        Ua = limitConcurrency(1, Rs),
        gd = limitConcurrency(1, Rs);
      if (hostSessionsBearerOffered())
        setHostSessionsBearerSource({
          ask: () => n.requestHostSessionsBearer(),
          isSignInToken: isClaudeAISignInToken,
          hasSignIn: isClaudeAIOAuthTokenHostInjected,
        });
      for await (let j of O) {
        if (Q && !No && j.type !== "user" && !he()) Fr();
        if (isTerminalShutdown() && j.type !== "control_response") continue;
        let vo = isDisplayOnlyHistoricalMessage(j) && (j.type === "user" ? oo : Pn?.isFork() === !0),
          uo = "uuid" in j ? j.uuid : void 0;
        if (uo && isUnhandledIngressType(j)) n.onCommandLifecycle?.(uo, "completed");
        if (j.type === "control_request") {
          if (j.request.subtype === "apply_flag_settings") kf.received(j.request_id);
          let Bn = jgt(j.request.subtype),
            wr = shouldRejectUiControl(
              j.request.subtype,
              () => n.uiSurfaceFrameOf(j, vk.list().length > 0),
              () => n.surfaceRequestJudgedAt(j),
            );
          if (Bn && !wr && EEo() && !leavesBelowFloor(() => n.uiSurfaceFrameOf(j, vk.list().length > 0)))
            Sv.heard();
          if (Bn && !wr) (Hl.readmit(j), noteSurfaceClientHeard(j.request));
          let To = !1,
            startTime = performance.now();
          ze.turnStartClock.controlRequestStarted(startTime);
          let Ba,
            sa = !1,
            Qn = (le) => {
              if (((To = !0), uo)) n.onCommandLifecycle?.(uo, "started");
              Promise.resolve()
                .then(le)
                .finally(() => {
                  if (uo) n.onCommandLifecycle?.(uo, "completed");
                })
                .catch((Re) => logError(Re));
            },
            Io = (le) => {
              if (((To = !0), uo)) n.onCommandLifecycle?.(uo, "completed");
              Promise.resolve()
                .then(le)
                .catch((Re) => logError(Re));
            };
          try {
            if (isUnclaimedSpare() && !isAllowedBeforeClaim(j.request.subtype)) {
              yt(j, getSpareClaimState() === "failed" ? _O : hO);
              continue;
            }
            if (kCs(j.request)) {
              let request = j.request,
                Re = request.subtype === "mcp_status" && request.liveReply === !0,
                be = (we) =>
                  Re && we.subtype === "success" ? sendControlResponseError(j, we.response) : sh(j, we);
              if (handleSendTaskMessage(request, bc)) {
                let we = async () => be(await dispatchControlRequest(request, bc));
                Qn(() => {
                  if (request.subtype !== "get_context_usage") return we();
                  if (request.detail === "summary") return rateLimitListener(we());
                  return ((resolved_3 = rateLimitInfo(we)), resolved_3);
                });
              } else {
                let we = !1,
                  Je = (gt) => {
                    if (we) return;
                    ((we = !0), be(gt));
                  },
                  it = dispatchControlRequest(request, { ...bc, replyNow: Je });
                Je(it instanceof Promise ? await it : it);
              }
            } else if (j.request.subtype === "interrupt") Ar(j, j.request);
            else if (j.request.subtype === "end_session") {
              if (Yx(j.request.reason)) {
                (logForDebugging(
                  "[print.ts] stale 'archived' end_session ignored on epoch>1 \u2014 from prior lifecycle",
                ),
                  sendControlResponseSuccess(j));
                continue;
              }
              if (
                (logForDebugging(
                  `[print.ts] end_session received, reason=${j.request.reason ?? "unspecified"}`,
                ),
                (ze.endSessionRequested = !0),
                Sf("session_ended"),
                requestTeardownUnwind(),
                messageQueue.suspendMidTurnFold(),
                ze.abortController)
              )
                ze.abortController.abort(userAbortReason("shutdown"));
              (Ys(),
                Wo.abort(),
                ha.abort(userAbortReason("shutdown")),
                qo.discard(),
                sendControlResponseSuccess(j));
              break;
            } else if (j.request.subtype === "initialize") {
              c_s();
              let sdkMcpServers = j.request.sdkMcpServers,
                Re = !1,
                webSearchIsolationExemptMcpServers = j.request.webSearchIsolationExemptMcpServers;
              if (
                (sdkMcpServers != null &&
                  (!Array.isArray(sdkMcpServers) || sdkMcpServers.some((hn) => typeof hn !== "string"))) ||
                (webSearchIsolationExemptMcpServers != null &&
                  (!Array.isArray(webSearchIsolationExemptMcpServers) ||
                    webSearchIsolationExemptMcpServers.some((hn) => typeof hn !== "string")))
              ) {
                yt(
                  j,
                  "initialize: sdkMcpServers and webSearchIsolationExemptMcpServers must be arrays of strings",
                );
                continue;
              }
              let we = j.request.sdkMcpServers?.find(isPrototypeKey);
              if (we !== void 0) {
                yt(j, "initialize: " + reservedServerNameMessage(we));
                continue;
              }
              let sdkMcpServerConfigs = j.request.sdkMcpServerConfigs,
                it = isPlainObject_2(sdkMcpServerConfigs) ? sdkMcpServerConfigs : void 0;
              if (sdkMcpServerConfigs != null && it === void 0)
                logForDebugging(
                  "initialize: ignoring sdkMcpServerConfigs (not an object keyed by server name)",
                  { level: "warn" },
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
                skills !== void 0 &&
                (!Array.isArray(skills) || skills.some((hn) => typeof hn !== "string"))
              ) {
                yt(j, "initialize: skills must be an array of strings");
                continue;
              }
              let en = typeof j.request.title === "string" ? sanitizeSessionTitle(j.request.title) : void 0;
              if (en)
                ((vc.attempted = !0),
                  cacheSessionTitle(en),
                  adoptSuppliedSessionTitle(en, x.storageV5).catch(logError));
              let yn;
              if (j.request.sdkMcpServers && j.request.sdkMcpServers.length > 0) {
                let create = Object.create(null);
                for (let sdkMcpServer of j.request.sdkMcpServers) {
                  let Tr = getOwn(R, sdkMcpServer),
                    co = it ? getOwn(it, sdkMcpServer) : void 0,
                    { settings: settings, ignored: ignored } = parseMcpServerSettings(co);
                  for (let Er of ignored) {
                    let ss = Er === "tools" ? inspectToolsList(co) : void 0;
                    logForDebugging(
                      ss
                        ? `initialize: SDK MCP server '${sdkMcpServer}': ${describeToolsListIssues(ss)}`
                        : `initialize: ignoring invalid ${Er} for SDK MCP server '${sdkMcpServer}'; the default applies`,
                    );
                  }
                  if (
                    ((create[sdkMcpServer] = {
                      type: "sdk",
                      name: sdkMcpServer,
                      ...(settings.tools && { tools: settings.tools }),
                    }),
                    Tr)
                  ) {
                    if (
                      Tr.timeout !== settings.timeout ||
                      (Tr.disableAutoBackground === !0) !== (settings.disableAutoBackground === !0) ||
                      Tr.connectorId !== settings.connectorId
                    )
                      logForDebugging(
                        `initialize: SDK MCP server '${sdkMcpServer}' is already registered, so a different timeout, disableAutoBackground or connectorId in this request is ignored (remove and re-add the server to change them)${settings.tools === void 0 ? "" : "; its tools[] is applied"}`,
                      );
                    if (settings.tools !== void 0) R[sdkMcpServer] = { ...Tr, tools: settings.tools };
                    continue;
                  }
                  R[sdkMcpServer] = { type: "sdk", name: sdkMcpServer, ...settings };
                }
                let jt = collectServerToolPolicies(create);
                P((xt) => {
                  let Tr = mergeMcpServerPolicyRules(xt.toolPermissionContext, jt, "merge");
                  return Tr === xt.toolPermissionContext ? xt : { ...xt, toolPermissionContext: Tr };
                });
                let sdkMcpServerManifests = j.request.sdkMcpServerManifests,
                  un =
                    n instanceof RemoteIO &&
                    sdkMcpServerManifests !== void 0 &&
                    sdkMcpServerManifests !== null &&
                    X1n()
                      ? await manifestsDisabledReason({
                          origin: j.request.sdkMcpServerManifestsOrigin,
                          frameCreatedAt: sessionStreamCreatedAt(j),
                          sessionWriters: sessionStreamWriters(j),
                        })
                      : void 0,
                  Ht = X1n() && un === void 0,
                  cn = parseHostManifests(sdkMcpServerManifests, j.request.sdkMcpServers),
                  Kn = new Set(Cn.filter((prev) => prev.type === "connected").map((xt) => xt.name)),
                  dr =
                    sdkMcpServerManifests === void 0 || sdkMcpServerManifests === null
                      ? void 0
                      : Object.create(null);
                if (dr !== void 0 && un !== void 0)
                  (logForDebugging(
                    `initialize: sdkMcpServerManifests not honoured on this remote-session worker (${un}); SDK MCP servers will handshake over the control channel`,
                  ),
                    logFeatureSad("mcp_sdk_manifest", `mcp_sdk_manifest_remote_${un}`));
                if (cn.malformedField) {
                  if (dr !== void 0)
                    for (let serverName of j.request.sdkMcpServers) dr[serverName] = "malformed";
                  if (Ht)
                    (logForDebugging(
                      "initialize: sdkMcpServerManifests is not an object keyed by server name \u2014 ignoring it; SDK MCP servers will handshake over the control channel",
                      { level: "warn" },
                    ),
                      logFeatureSad("mcp_sdk_manifest", "mcp_sdk_manifest_malformed_field"));
                }
                for (let malformedServerName of cn.malformedServerNames) {
                  if (dr !== void 0) dr[malformedServerName] = "malformed";
                  if (Ht)
                    (logForDebugging(
                      `initialize: sdkMcpServerManifests entry for '${malformedServerName}' is malformed \u2014 ignoring it; the server will handshake over the control channel`,
                      { level: "warn" },
                    ),
                      logFeatureSad("mcp_sdk_manifest", "mcp_sdk_manifest_malformed_entry"));
                }
                let qt = !1;
                for (let [xt, Tr] of cn.manifests) {
                  if (!Ht) {
                    if (dr !== void 0) dr[xt] = "not_honoured";
                    continue;
                  }
                  if (Kn.has(xt)) {
                    if (dr !== void 0) dr[xt] = "already_connected";
                    continue;
                  }
                  if (Tr.initializeResult.protocolVersion !== MCP_PROTOCOL_LATEST) {
                    if (
                      (logForDebugging(
                        `initialize: sdkMcpServerManifests entry for '${xt}' was not captured with MCP protocol ${MCP_PROTOCOL_LATEST} \u2014 ignoring it; the server will handshake over the control channel`,
                      ),
                      logFeatureSad("mcp_sdk_manifest", "mcp_sdk_manifest_protocol_version_at_initialize"),
                      dr !== void 0)
                    )
                      dr[xt] = "protocol_version_mismatch";
                    continue;
                  }
                  if (($o.set(xt, Tr), dr !== void 0)) dr[xt] = "parked";
                  qt = !0;
                }
                if (((yn = dr), (Re = qt), !Re)) Ma();
              }
              if (j.request.webSearchIsolationExemptMcpServers)
                addExemptServers(hr, j.request.webSearchIsolationExemptMcpServers);
              let Et;
              try {
                if (
                  ((Et = await handleInitializeRequest(
                    j.request,
                    j.request_id,
                    Q,
                    output,
                    () => Ho(),
                    Im,
                    n,
                    !!x.enableAuthStatus,
                    x,
                    () => lo,
                    w,
                    P,
                    () => userSpecifiedModel,
                    yn,
                    () =>
                      waitBeforeInitializeReply({
                        rescan: () => df,
                        isReaderOwed: () =>
                          isShuttingDown() || isTerminalShutdown() || n.hasPendingRequests(),
                        lookAgainOn: [
                          (prev) => n.onRequestPending(prev),
                          (hn) => messageQueue.subscribe(hn),
                          (hn) => registerCleanup(async () => hn()),
                        ],
                      }),
                    isTransportBacked(e),
                    Object.keys(R),
                    Ri,
                  )),
                  (cd = jsonStringify(Et.publishedCommands)),
                  jsonStringify(toSlashCommands(Ho())) !== cd)
                )
                  md();
              } finally {
                if (Re) ((Re = !1), Ma());
              }
              if (Et.restrictedAgentModel) noticeRestrictedModel(Et.restrictedAgentModel);
              if (Et.mergedStdinAgents?.length) {
                let hn = new Set(lo);
                lo = [...lo, ...Et.mergedStdinAgents.filter((mergedStdinAgent) => !hn.has(mergedStdinAgent))];
              }
              if (x.promptSuggestions && isPromptSuggestionSettingEnabled())
                P((hn) => {
                  if (hn.promptSuggestionEnabled) return hn;
                  return { ...hn, promptSuggestionEnabled: !0 };
                });
              if (j.request.agentProgressSummaries) setSdkAgentProgressSummariesEnabled(!0);
              let Wn = !Q;
              if ((ke(), Wn && isDesktopTopSession() && !isParkedSpare())) Yqo(e.host);
              if (messageQueue.peek(im) !== void 0) Os();
            } else if (j.request.subtype === "set_permission_mode") {
              let request = j.request;
              if (request.from_settings === !0 && op()) {
                (logEvent("tengu_settings_mode_dropped_in_runner_child", {}),
                  sendControlResponseSuccess(j, {
                    mode: toExternalPermissionMode(w().toolPermissionContext.mode),
                  }));
                continue;
              }
              let Re = parsePermissionMode(request.mode);
              if (Re === void 0 || !isExternalPermissionMode(Re)) {
                yt(j, UNRECOGNIZED_PERMISSION_MODE_ERROR, "invalid_mode");
                continue;
              }
              if (Re === "auto" && jd()) {
                let be = await applyAutoModeTransition(w().toolPermissionContext, as, w().fastMode, qM);
                if (be !== void 0) {
                  yt(j, be.error, be.code);
                  continue;
                }
              }
              P((prev) => {
                let we = applyPermissionModeChange(request, prev.toolPermissionContext);
                if (!we.ok) return (yt(j, we.error, we.code), prev);
                return (
                  sendControlResponseSuccess(j, { mode: we.mode }),
                  is(we.mode),
                  {
                    ...prev,
                    toolPermissionContext: we.context,
                    isUltraplanMode: request.ultraplan ?? prev.isUltraplanMode,
                  }
                );
              });
            } else if (j.request.subtype === "set_proactivity_level") {
              let offer_bypass = j.request.offer_bypass,
                proactivityLevel = w().proactivityLevel,
                be = cycleProactivityLevel(j.request.level, w, P, x.storageV5, {
                  offerBypass: offer_bypass,
                  cloudOptIn: env.CLAUDE_CODE_REMOTE ? n.sessionState : void 0,
                });
              if (be.ok) {
                if (be.response.level !== proactivityLevel) is(w().toolPermissionContext.mode);
                sendControlResponseSuccess(j, be.response);
              } else yt(j, sanitizeTelemetryString(be.error));
            } else if (j.request.subtype === "set_model") {
              let request = j.request,
                Re = mu(j.request_id),
                be = async () => {
                  try {
                    let we = await handleSetModelRequest(request, nd);
                    if (we.ok) {
                      await mc(Re);
                      for (let Je of we.notices ?? []) qd(Je);
                      sendControlResponseSuccess(j, { model: Ao() ?? getMainLoopModel() });
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
                let { handleSetCwdControlRequest: handleSetCwdControlRequest } =
                    await import("./chunk-frfx56e3.js"),
                  be = ze.dequeueCount > 0,
                  we = await handleSetCwdControlRequest(request, {
                    session: e,
                    isBusy: () =>
                      Ie.inheritedPromptPending() ||
                      isBusy({
                        running: ze.running,
                        runPhase: ze.runPhase,
                        mainThreadQueueLength: messageQueue.getMainThreadQueueLength(),
                      }),
                    toolPermissionContext: getToolPermissionContext({ getAppState: w }),
                    retireDepartedAdditionalDirectories: (Je) => {
                      P((it) => {
                        let gt = mergeTrustedDirectories(it.toolPermissionContext, Je);
                        return gt === it.toolPermissionContext ? it : { ...it, toolPermissionContext: gt };
                      });
                    },
                    enqueueMoveNotice: (Je) => {
                      messageQueue.enqueue({
                        value: Je,
                        mode: "prompt",
                        agentId: mainAgentId(),
                        uuid: randomUUID_19(),
                        isMeta: !0,
                        shouldQuery: !1,
                        skipSlashCommands: !0,
                        skipAttachments: !0,
                      });
                    },
                    storageV5: x.storageV5,
                    credentials: x.credentials,
                    isFreshSession: eh,
                    settlePlanAutoMode: () => {
                      P((Je) => ({
                        ...Je,
                        toolPermissionContext: settlePlanAutoModeAtStart(Je.toolPermissionContext),
                      }));
                    },
                    requestBuilt: () => be,
                  });
                if (we.kind === "response") {
                  if (we.response.status === "ok" && we.response.changed)
                    try {
                      await ov("set_cwd", { restartLaunchDirStdioServers: we.freshSession === !0 });
                    } catch (error) {
                      logForDebugging(
                        `set_cwd: re-homing plugins/MCP for the new directory failed (continuing): ${errorMessage(error)}`,
                        { level: "error" },
                      );
                    }
                  let Je = isTransportBacked(e),
                    it =
                      we.response.status === "rejected" && Je
                        ? { ...we.response, message: "set_cwd: request rejected" }
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
                    : "(error detail unavailable)",
                  Je = be
                    ? be(
                        `The session's working directory is ${getCwd()}.`,
                        "The session stayed in its previous working directory.",
                      )
                    : "The session stayed in its previous working directory.";
                (Ws("set_cwd", errorMessage(error)),
                  yt(
                    j,
                    `set_cwd: relocation failed \u2014 ${pickForTransport(e, we, "(error detail withheld)")}. ${pickForTransport(e, Je, "The session stayed in its previous working directory.")}`,
                  ));
              }
            } else if (j.request.subtype === "claim_session") {
              let mcpRequest = j.request;
              try {
                let { handleClaimSessionRequest: handleClaimSessionRequest } =
                    await import("./chunk-7n18p51h.js"),
                  be = await handleClaimSessionRequest(mcpRequest, {
                    session: e,
                    storageV5: x.storageV5,
                    credentials: x.credentials,
                    parkedSettingsRefusal: () => kf.claimRefusal(),
                    permissionModeSuppliedOnInvocation: x.permissionModeSuppliedOnInvocation !== !1,
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
                          ...w().mcp.clients.map((client) => client.name),
                          ...dynamicMcpState.clients.map((client) => client.name),
                          ...Object.keys(dynamicMcpState.configs),
                        ]),
                      );
                      ra.noteServersStartedSinceKick(we ?? []);
                    },
                    rehomePluginsAndMcp: () => ov("claim_session"),
                    getToolPermissionContext: () => getToolPermissionContext({ getAppState: w }),
                    setToolPermissionContext: (we) => {
                      P((Je) =>
                        Je.toolPermissionContext === we ? Je : { ...Je, toolPermissionContext: we },
                      );
                    },
                    retireDepartedAdditionalDirectories: (we) => {
                      P((Je) => {
                        let it = mergeTrustedDirectories(Je.toolPermissionContext, we);
                        return it === Je.toolPermissionContext ? Je : { ...Je, toolPermissionContext: it };
                      });
                    },
                    applyPromptOptions: (we) => {
                      if (we.systemPrompt !== void 0)
                        x.systemPrompt = joinPromptValues(we.systemPrompt) ? "" : we.systemPrompt;
                      if (we.appendSystemPrompt !== void 0) x.appendSystemPrompt = we.appendSystemPrompt;
                      let Je = typeof we.title === "string" ? sanitizeSessionTitle(we.title) : void 0;
                      if (Je)
                        ((vc.attempted = !0),
                          cacheSessionTitle(Je),
                          adoptSuppliedSessionTitle(Je, x.storageV5).catch(logError));
                      if (we.agents) {
                        let gt = parseAgentsFromJson(we.agents, "flagSettings"),
                          Ft = new Set(lo);
                        lo = [...lo, ...gt.filter((en) => !Ft.has(en))];
                      }
                      let it = seatMainThreadAgentFromPool(getActiveAgentsFromList(lo), x, n, {
                        deferInitialPrompt: !0,
                        reapplySystemPromptIfSeated: !0,
                      });
                      if (it.restrictedAgentModel) noticeRestrictedModel(it.restrictedAgentModel);
                      Qi = it.agent?.initialPrompt;
                    },
                    currentPermissionMode: () => w().toolPermissionContext.mode,
                    checkPermissionMode: (client) => {
                      let removed = parsePermissionMode(client);
                      if (removed === void 0 || !isExternalPermissionMode(removed))
                        return UNRECOGNIZED_PERMISSION_MODE_ERROR;
                      let it = guardPermissionModeChange(removed, w().toolPermissionContext);
                      return it.ok ? void 0 : it.error;
                    },
                    bypassPermissionsDeniedOutsideSandbox: isBypassPermissionsDeniedOutsideSandbox,
                    applyPermissionMode: (cmd) => {
                      let Je;
                      if (
                        (P((it) => {
                          let gt = applyPermissionModeChange({ mode: cmd }, it.toolPermissionContext);
                          if (!gt.ok) return ((Je = gt.error), it);
                          let Ft = asClaimedStartModeContext(gt.context, {
                            bypassAvailableByFlag: x.bypassAvailableByFlag === !0,
                          });
                          return Ft === it.toolPermissionContext && !it.isUltraplanMode
                            ? it
                            : { ...it, toolPermissionContext: Ft, isUltraplanMode: !1 };
                        }),
                        Je === void 0)
                      )
                        x.permissionModeSuppliedOnInvocation = !0;
                      return Je;
                    },
                    settlePlanAutoMode: settlePlanAutoModeAtStart,
                    recheckAutoModeGate: () => {
                      verifyAutoModeGateAccess(w().toolPermissionContext, w().fastMode).then(
                        ({ updateContext: updateContext }) => {
                          P((Je) => {
                            let normalizedPath = updateContext(Je.toolPermissionContext);
                            return normalizedPath === Je.toolPermissionContext
                              ? Je
                              : { ...Je, toolPermissionContext: normalizedPath };
                          });
                        },
                      );
                    },
                    workspaceRestrictsBypass: () => !1,
                    setSdkMcpServers: (we) => {
                      let Je = new Set(we);
                      for (let it of Object.keys(R)) if (!Je.has(it)) delete R[it];
                      for (let it of we) R[it] ??= { type: "sdk", name: it };
                      Ma();
                    },
                    sdkMcpSettled: () =>
                      Object.keys(R).every((we) =>
                        Cn.some((Je) => Je.name === we && Je.type === "connected"),
                      ),
                    startSessionStartHooks: () => {
                      setAwaitsFirstRun(!1);
                      let startTime = performance.now(),
                        Je = runStartupHooks(e, {
                          kind: "session-start",
                          source: "startup",
                          storageV5: x.storageV5,
                          credentials: x.credentials,
                        })
                          .then(
                            (it) => (
                              Gs(it),
                              Br("hooks_init_ms", performance.now() - startTime, startTime),
                              takePendingInitialUserMessage()
                            ),
                            (it) => {
                              logForDebugging(
                                `claim_session: SessionStart hooks failed (continuing without their output): ${errorMessage(it)}`,
                                { level: "error" },
                              );
                              return;
                            },
                          )
                          .then(async (it) => {
                            let gt = cancelSourceLabels(it, Qi);
                            if (((Qi = void 0), gt.length === 0)) return;
                            if (ji || O.hasEnded()) {
                              let of = sN.of(e);
                              if (of.pending > 0) await of.tail;
                              for (let { text: text, sentBy: sentBy } of gt) {
                                let jt = {
                                  mode: "prompt",
                                  value: text,
                                  agentId: mainAgentId(),
                                  ...(!(n instanceof RemoteIO) && { localStdinOrigin: !0 }),
                                };
                                messageQueue.enqueue(sentBy === "person" ? withOwnWordStopKey(jt) : jt);
                              }
                              Os();
                              return;
                            }
                            let mapped = gt.map((Et) => Et.text),
                              promise = new Promise((Et) => {
                                Bs = (Wn) => {
                                  if ("cannotQueue" in Wn) {
                                    Et(Wn.cannotQueue);
                                    return;
                                  }
                                  let hn = typeof Wn.queued === "string" ? mapped.indexOf(Wn.queued) : -1;
                                  if (hn !== -1) mapped.splice(hn, 1);
                                  if (mapped.length === 0) Et(void 0);
                                };
                              });
                            for (let { text: text, sentBy: sentBy } of gt) n.prependUserMessage(text, sentBy);
                            let winner = await Promise.race([
                              promise,
                              sleep(zx, void 0, { unref: !0 }).then(() => `not queued after ${zx}ms`),
                            ]);
                            if (((Bs = void 0), winner !== void 0))
                              logForDebugging(
                                `claim_session: the session's own first-turn messages will not run ahead of the host's messages (${winner}); releasing the host's messages`,
                                { level: "warn" },
                              );
                          })
                          .catch((it) => {
                            ((Bs = void 0),
                              logForDebugging(
                                `claim_session: queueing the session's own first-turn messages failed (continuing): ${errorMessage(it)}`,
                                { level: "error" },
                              ));
                          })
                          .finally(() => {
                            if (Jr === Je) Jr = void 0;
                          });
                      ((Jr = Je), (Lg = Je));
                    },
                    applyWorkspaceTrust: (cmd) =>
                      applyWorkspaceTrust(n.hostOwnsStdinOrigin ? cmd : void 0, {
                        cwd: getCwd(),
                        trustedNetworkDirectories: w().toolPermissionContext.trustedNetworkDirectories,
                        storageV5: x.storageV5,
                      }),
                    announceStartingChange: () => {
                      if (isDesktopTopSession()) Yqo(e.host);
                    },
                    buildInitializePayload: (cmd) => {
                      let { models: models, unavailable: unavailable } = Im();
                      return _buildInitializeResponsePayloadForTesting(
                        () => Ho(),
                        getActiveAgentsFromList(lo),
                        models,
                        unavailable,
                        w,
                        userSpecifiedModel,
                        () => n.sessionState.getState(),
                        hasSdkHostHooks() ? !0 : void 0,
                        void 0,
                        cmd,
                        void 0,
                        x.storageV5,
                        () => ({
                          redactsWhatItPersists: isTransportBacked(e),
                          isRemoteTransport: n.isRemoteTransport(),
                          sessionWriters: n.sessionWriters(),
                        }),
                        Ri,
                      ).then((gt) => withHostWordedAsks(gt, n, x));
                    },
                  });
                if (be.kind === "ok")
                  (sendControlResponseSuccess(j, be.response), headlessProfilerCheckpoint("claim_answered"));
                else yt(j, be.message);
              } catch (error) {
                if (getSpareClaimState() === "claiming")
                  (markSpareClaimFailed(),
                    Ws("claim_session", errorMessage(error)),
                    yt(
                      j,
                      `claim_failed: ${pickForTransport(e, sanitizeTelemetryString(errorMessage(error)), "(error detail withheld)")} \u2014 discard this spare`,
                    ));
                else
                  (Ws("claim_session", errorMessage(error)),
                    yt(
                      j,
                      `rejected: ${pickForTransport(e, sanitizeTelemetryString(errorMessage(error)), "(error detail withheld)")} \u2014 the spare is still parked`,
                    ));
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
                      mcp: { ...w().mcp, clients: Ns() },
                      permissionMode: w().toolPermissionContext.mode,
                      remoteSessionName: w().remoteSessionName,
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
              let currentAppState = wg(),
                Re = [...currentAppState.messages],
                be = j;
              Qn(async () => {
                try {
                  let we = gz?.();
                  if (!we) {
                    yt(be, "export_conversation is not available in this build");
                    return;
                  }
                  sendControlResponseSuccess(
                    be,
                    await we.exportConversation({
                      session: e,
                      messages: Re,
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
              let le = j,
                request = j.request;
              handledOrphanedToolUseIds.get(le.request_id)?.abort();
              let be = createAbortController();
              handledOrphanedToolUseIds.set(le.request_id, be);
              let we = () => handledOrphanedToolUseIds.get(le.request_id) === be,
                it = rateLimitListener(
                  (async () => {
                    try {
                      dh ??= import("./chunk-w88j2ajz.js")
                        .then((yn) => new yn.CloudSessionReads())
                        .catch((yn) => {
                          throw ((dh = void 0), yn);
                        });
                      let gt = await dh,
                        Ft = { abortController: be, credentials: x.credentials, storageV5: x.storageV5 },
                        en =
                          request.subtype === "get_cloud_session_transcript"
                            ? await (
                                await import("./chunk-yyv1m8fa.js")
                              ).answerCloudSessionTranscript(gt, request, Ft)
                            : await gt.answer(request, Ft);
                      if (we()) sendControlResponseSuccess(le, en);
                    } catch (error) {
                      if (we())
                        Xn(le, request.subtype, error, { expected: error instanceof WireSafeControlError });
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
                let { buildMemoryDialogResponse: buildMemoryDialogResponse } =
                  await import("./chunk-7sekx49c.js");
                sendControlResponseSuccess(
                  j,
                  await buildMemoryDialogResponse({
                    session: e,
                    storageV5: x.storageV5,
                    credentials: x.credentials,
                    activeAgents: getActiveAgentsFromList(lo),
                    dreamRunning: Object.values(w().tasks).some(
                      (Re) => Re.type === "dream" && Re.status === "running",
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
                let { buildSkillsDialogResponse: buildSkillsDialogResponse } =
                  await import("./chunk-a1q31s85.js");
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
                let [
                  { buildChromeDialogResponse: buildChromeDialogResponse },
                  { claudeInChromeDefaultForHost: claudeInChromeDefaultForHost },
                ] = await Promise.all([import("./chunk-b8m0n4gd.js"), import("./chunk-e2839z0z.js")]);
                sendControlResponseSuccess(
                  j,
                  await buildChromeDialogResponse({
                    mcpClients: Ns(),
                    atStartup: (be) => claudeInChromeDefaultForHost({ settingOn: be }),
                  }),
                );
              } catch (error) {
                Xn(j, "get_chrome_dialog", error);
              }
            } else if (
              j.request.subtype === "get_chrome_browsers" ||
              j.request.subtype === "select_chrome_browser"
            ) {
              let le = j,
                request = j.request,
                subtype = request.subtype;
              if (isTransportBacked(e)) {
                yt(le, `${subtype} is not available on this connection`);
                continue;
              }
              let { CLAUDE_IN_CHROME_MCP_SERVER_NAME: CLAUDE_IN_CHROME_MCP_SERVER_NAME } =
                  await import("./chunk-85j1z4a0.js"),
                found = Ns().find(
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
                      BrowserListShapeError: BrowserListShapeError,
                      listConnectedBrowsers: listConnectedBrowsers,
                      noBrowsersWhenUnreachable: noBrowsersWhenUnreachable,
                      selectBrowser: selectBrowser,
                    } = it,
                    Et = (Wn) =>
                      withTimeout(Wn, LOGIN_BLOCKED_MESSAGES, "Claude in Chrome did not answer in time");
                  if (request.subtype === "get_chrome_browsers") {
                    let Wn = getGlobalConfig().chromeExtension?.pairedDeviceId,
                      hn = await Et(listConnectedBrowsers(found)).catch(noBrowsersWhenUnreachable);
                    sendControlResponseSuccess(le, {
                      browsers: hn.map((jt) => ({
                        device_id: jt.deviceId,
                        name: jt.name,
                        ...(jt.osPlatform !== void 0 && { os_platform: jt.osPlatform }),
                        current: jt.deviceId === Wn,
                      })),
                    });
                  } else {
                    let device_id = request.device_id,
                      hn =
                        typeof device_id === "string" && device_id !== ""
                          ? await Et(listConnectedBrowsers(found)).catch(($t) => {
                              if ($t instanceof BrowserListShapeError) return [];
                              throw $t;
                            })
                          : [];
                    await selectBrowser(found, device_id, Et);
                    let found_2 = hn.find(($t) => $t.deviceId === device_id);
                    (sendControlResponseSuccess(le, { ...(found_2 && { name: found_2.name }) }),
                      logFeatureOk("chrome_browser_picker"));
                  }
                } catch (error) {
                  let Ft = it?.isChromeBridgeUnreachable(error) === !0,
                    en = it !== void 0 && it.isBrowserNotListed(error) && error.namedABrowser;
                  if ((Xn(le, subtype, error, { expected: Ft || en }), subtype === "select_chrome_browser"))
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
                let { buildSandboxDialogResponse: buildSandboxDialogResponse } =
                  await import("./chunk-ygsnywrv.js");
                sendControlResponseSuccess(j, await buildSandboxDialogResponse());
              } catch (error) {
                Xn(j, "get_sandbox_dialog", error);
              }
            } else if (j.request.subtype === "mcp_message") {
              let request = j.request,
                found = Cn.find((be) => be.name === request.server_name);
              if (found && found.type === "connected") injectMcpMessage(found, request.message);
              if (yBn(request.message) && Object.hasOwn(R, request.server_name) && X1n()) {
                (rd.delete(request.server_name), Is.add(request.server_name));
                let be = $o.get(request.server_name);
                if (be?.toolsListResult !== void 0)
                  ($o.set(request.server_name, { initializeResult: be.initializeResult }),
                    logFeatureSad("mcp_sdk_manifest", "mcp_sdk_manifest_tools_changed_before_connect"));
                if (found?.type === "connected") Ma("skip");
              }
              sendControlResponseSuccess(j);
            } else if (j.request.subtype === "rewind_files") {
              let currentAppState = w(),
                Re = await handleRewindFiles(
                  j.request.user_message_id,
                  currentAppState,
                  j.request.dry_run ?? !1,
                );
              if (Re.error !== void 0) Ws("rewind_files", Re.error);
              if (Re.canRewind || j.request.dry_run)
                sendControlResponseSuccess(
                  j,
                  ((we) => {
                    if (!isTransportBacked(e)) return we;
                    let { filesChanged: filesChanged, ...it } = we;
                    return it;
                  })(
                    Re.error !== void 0
                      ? { ...Re, error: pickForTransport(e, Re.error, "Failed to rewind") }
                      : Re,
                  ),
                );
              else yt(j, pickForTransport(e, Re.error ?? "Unexpected error", "Failed to rewind"));
            } else if (j.request.subtype === "cancel_async_message") {
              let message_uuid = j.request.message_uuid,
                Re =
                  !Zn(message_uuid) &&
                  cancelQueuedThreadMessage({
                    targetUuid: message_uuid,
                    sender: "host",
                    messageQueue: messageQueue,
                    prewaitLatch: Ro,
                    io: n,
                  });
              if (Re) on(() => Ie.noteCancelledInTheQueue([message_uuid]));
              sendControlResponseSuccess(j, { cancelled: Re });
            } else if (j.request.subtype === "poll_event") {
              To = !0;
              let le = ackPollEventRow({
                row: uo,
                rowsInFlight: activeOAuthFlows,
                tearingDown: () => Wo.signal.aborted || isShuttingDown() || isTerminalShutdown(),
                ack: (Re) => n.onCommandLifecycle?.(Re, "completed"),
                flushSessionStorage: flushSessionStorage,
                reply: (Re) => sh(j, Re),
              });
              if (le) handlePollEvent(j.request, { ...SL, ...le });
            } else if (j.request.subtype === "rewind_conversation") {
              if (typeof j.request.target_message_uuid !== "string") {
                yt(j, "rewind_conversation: target_message_uuid must be a string");
                continue;
              }
              let Re = rewindExpiryVerdict(pt(j), j.request.expires_at);
              if (Re !== void 0) {
                sendControlResponseSuccess(j, Re);
                continue;
              }
              let target_message_uuid = j.request.target_message_uuid,
                we = () => {
                  let qt = hr.current;
                  if (qt === "web" || qt === "connectors") return qt;
                  if (qt !== null) return;
                  try {
                    return g3s() ? null : void 0;
                  } catch (error) {
                    (logForDebugging(
                      "rewind refusal: isolation enforcement check threw; isolation_latch left off",
                      { level: "error" },
                    ),
                      logError(error));
                    return;
                  }
                },
                last_seen_user_message_uuid = j.request.last_seen_user_message_uuid,
                it = createNudgeHold({ getAppState: w, setAppState: P, session: e }),
                gt = {
                  allowSummarizedTarget: j.request.allow_summarized_target === !0,
                  allowAssistantTarget: j.request.allow_assistant_target === !0,
                },
                stopSettling = Ie.stopSettling;
              if (stopSettling !== void 0) await withDeadline(stopSettling, COST_PUSH_INTERVAL_MS);
              let en = () =>
                  findRewindPoint(Ct, target_message_uuid, last_seen_user_message_uuid, {
                    rowsOffDisk: getSessionRowsOffDisk(),
                    ...gt,
                  }),
                yn = () =>
                  ze.running &&
                  (ze.runPhase !== "waiting_for_agents" || n.sessionState.getState() === "requires_action"),
                request = j.request,
                Wn,
                hn = () => (Wn ??= rewindRerunMode());
              if (request.interrupt_if_running === !0)
                dropOwnRerunOnRewind({
                  messageQueue: messageQueue,
                  io: n,
                  readSwitch: hn,
                  namedByTheRequest: [request.target_message_uuid, request.last_seen_user_message_uuid],
                  decide: en,
                  logFailure: (qt) =>
                    logHandlerFailure(isTransportBacked(e), "rewind_conversation: own re-run", qt),
                });
              let jt = request.refuse_if_usage_limited === !0,
                $t =
                  jt && request.interrupt_if_running === !0 && On() && ze.dequeueCount > 0 && hn() === "on",
                un = async () => {
                  fi = !0;
                  let qt = await askRewindLimitQuestion({
                    promptUpOrHeld: () =>
                      n.sessionState.getState() === "requires_action" || Ie.inheritedPromptPending(),
                    busy: () =>
                      messageQueue.getDrainableMainThreadQueueLength() > 0 ||
                      Oo.hasParked() ||
                      Dt() ||
                      Ie.stopRetirementOwed,
                    runGoing: On,
                    interruptAsked: request.interrupt_if_running === !0,
                    afterTheInterruptBranch: $t,
                    missingTargetAsked: request.refuse_missing_target_if_usage_limited === !0,
                    decide: en,
                    rowCount: () => Ct.length,
                    runEnding: () =>
                      isTurnAbortedForRewind({ drain: ze, messageQueue: messageQueue, prewaitLatch: Ro }),
                    runWaitable: yn,
                    dequeues: () => ze.dequeueCount,
                    ending: isTerminalShutdown,
                    stop: Wo.signal,
                    mainModel: () => Ao() ?? getMainLoopModel(),
                    credentials: x.credentials,
                    storageV5: x.storageV5,
                    logFailure: (xt) =>
                      logHandlerFailure(isTransportBacked(e), "rewind_conversation: limit question", xt),
                  });
                  if (((fi = !1), qt === "ending"))
                    return (it.release({ mayBeSentAgain: !1 }), (To = !0), !0);
                  if (qt === "turn_running")
                    return (
                      it.release({ mayBeSentAgain: REWIND_REFUSAL_RETRYABLE.turn_running }),
                      sendControlResponseSuccess(j, rewindRefusal("turn_running", we())),
                      !0
                    );
                  if (qt !== "go_on")
                    return (
                      it.release({ mayBeSentAgain: !1 }),
                      qt.report(),
                      sendControlResponseSuccess(j, usageLimitedRewindRefusal(qt.targetFound, we())),
                      !0
                    );
                  return !1;
                };
              if (jt && !$t && (await un())) continue;
              let Ht =
                  !On() || j.request.interrupt_if_running
                    ? findRewindPoint(Ct, target_message_uuid, j.request.last_seen_user_message_uuid, gt)
                    : void 0,
                cn =
                  Ht !== void 0 && "cut" in Ht ? t6s(kT.of(e), messageQueue, Ct.slice(0, Ht.cut.index)) : [],
                Kn = (qt) => {
                  for (let xt of cn) messageQueue.enqueue(xt);
                  (it.release({ mayBeSentAgain: REWIND_REFUSAL_RETRYABLE[qt] }),
                    sendControlResponseSuccess(j, rewindRefusal(qt, we())));
                },
                dr = j.request.interrupt_if_running ? fn() : On();
              if (
                dr &&
                j.request.interrupt_if_running &&
                messageQueue.getDrainableMainThreadQueueLength() === 0 &&
                !(
                  getSdkPerTaskStopAffordance() &&
                  !ze.running &&
                  n.sessionState.getState() === "requires_action"
                ) &&
                !Dt()
              ) {
                if (
                  ze.running &&
                  ze.runPhase !== "waiting_for_agents" &&
                  getSessionRowsOffDisk() === void 0 &&
                  Ht !== void 0 &&
                  "refuse" in Ht &&
                  Ht.refuse === "unseen_later_turn" &&
                  isRewindTargetQueued(Ct, target_message_uuid, last_seen_user_message_uuid)
                ) {
                  (reportRewindRefusal(Ht, Ht.refuse), Kn(Ht.refuse));
                  continue;
                }
                (Rd(),
                  wf({
                    retireParkedPermission: !Ie.inheritedPromptHoldCapable(),
                    parkedPermissionReason: "rewind",
                    keepDetachedToolCalls: !0,
                  }));
                let dequeueCount = ze.dequeueCount,
                  xt = Date.now() + 1e4;
                while (
                  fn() &&
                  (yn() ||
                    (!getSdkPerTaskStopAffordance() &&
                      n.sessionState.getState() === "requires_action" &&
                      !Xt())) &&
                  ze.dequeueCount === dequeueCount &&
                  Date.now() < xt
                )
                  (ze.abortController?.abort(userAbortReason("remote-cancel")), await sleep(20));
                let stopSettling = Ie.stopSettling;
                if (stopSettling !== void 0) await withDeadline(stopSettling, COST_PUSH_INTERVAL_MS);
                (Ni.arm(), (dr = ze.dequeueCount > dequeueCount || fn()));
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
                if ("refuse" in qt) (reportRewindRefusal(qt, qt.refuse), Kn(qt.refuse));
                else {
                  let {
                    index: index,
                    echoUuid: echoUuid,
                    prefillText: prefillText,
                    precedingAssistantUuid: precedingAssistantUuid,
                    resolution: resolution,
                  } = qt.cut;
                  if (getSdkPerTaskStopAffordance() || reportsRunningBackgroundTasksExplicit())
                    stopTeammatesAfterCut({
                      taskRegistry: createTaskFramework(w, P),
                      setAppState: P,
                      storageV5: x.storageV5,
                      messages: Ct,
                      cutIndex: index,
                    });
                  if (!Ie.inheritedPromptHoldCapable()) Ie.fire("rewind");
                  let Er = {
                      mirror: (fr, Qr) => mirrorLeafCheckpointToRemote(fr, Qr),
                      flushInternalEvents: () => n.flushInternalEvents(),
                      persistLocal: (fr, Qr) => persistLeafCheckpoint(fr, Qr, x.storageV5),
                      logFailure: (fr, Qr) => logError(Qr),
                    },
                    ss = {
                      messages: Ct,
                      dequeueCount: () => ze.dequeueCount,
                      drainableMainThreadQueueLength: () => messageQueue.getDrainableMainThreadQueueLength(),
                    },
                    prefix = queueStamp(ss);
                  if ((it.renew(), !(await persistRewindCut(qt.cut, ss, Er))))
                    (reportRewindRefusal(qt, "persist_failed"), Kn("persist_failed"));
                  else if (
                    rewindTargetMoved(prefix, ss, qt.cut) ||
                    !isRewindCutPersistable(Ct, qt.cut, getSessionRowsOffDisk())
                  )
                    (await waitForRewindQuiet(ss, Er),
                      reportRewindRefusal(qt, "state_changed"),
                      Kn("state_changed"));
                  else {
                    let fr = {
                      messages: Ct,
                      appendToConversation: Gs,
                      readFileState: fs,
                      memorySelector: Ja,
                      host: e.host,
                      toolAliases: x.toolAliases,
                      stickyBetas: getStickyBetas,
                      logFailure: (yo, fo) => logError(fo),
                    };
                    (stopMcpTasksAfterCut({
                      taskRegistry: createTaskFramework(w, P),
                      setAppState: P,
                      storageV5: x.storageV5,
                      messages: Ct,
                      cutIndex: index,
                    }),
                      withdrawDeferredAfterCut({
                        endings: Yze.peek(e),
                        queue: messageQueue,
                        messages: Ct,
                        cutIndex: index,
                      }));
                    let Qr = applyRewindCut(fr, index);
                    if (
                      (retractPendingTitle(vc),
                      it.keep(),
                      rewindReadNotifications(
                        { getAppState: w, setAppState: P, session: e },
                        { kept: Ct, removed: Qr, targetUuid: target_message_uuid },
                      ),
                      B9n(kT.of(e), messageQueue, Ct),
                      Ie.inheritedPromptPending() && G && G.kind !== "none")
                    ) {
                      let { uuid: uuid } = G.message;
                      if (!Ct.some((prev) => prev.uuid === uuid)) Ie.fire("rewind");
                    }
                    if (!Ie.inheritedPromptPending()) {
                      if ((jn.cancelAfterRewind(), hn() === "on")) jn.closeAfterRewind();
                    }
                    ((Ps = Ct.length),
                      Od(),
                      reportRewindRefusal(qt, "rewound"),
                      (wa = WDs(j.request_id, Ct)),
                      sendControlResponseSuccess(j, {
                        rewound: !0,
                        targetMessageUuid: echoUuid,
                        prefillText: prefillText,
                        precedingAssistantUuid: precedingAssistantUuid,
                        ...(resolution !== void 0 && { resolution: resolution }),
                      }));
                  }
                }
              }
            } else if (j.request.subtype === "fork_conversation") {
              let request = j.request;
              Io(async () => {
                let Re = Oc(),
                  be = await handleForkConversation(request, {
                    messages: Ct,
                    blockedReason: () =>
                      On() || messageQueue.getDrainableMainThreadQueueLength() > 0
                        ? REWIND_REFUSAL_TEXT[Zt()]
                        : null,
                    sdkUrl: x.sdkUrl,
                    permissionMode: getPermissionModeCycle(w()),
                    credentials: x.credentials,
                    storageV5: x.storageV5,
                    getTools: Ri,
                    host: e.host,
                  }).finally(Re);
                if (be.ok) sendControlResponseSuccess(j, be.response);
                else yt(j, be.error);
              });
            } else if (j.request.subtype === "read_file") {
              let le = j,
                request = j.request,
                be = request.anchor?.kind === "as_written",
                we = (gt) => {
                  try {
                    if (be) gt();
                  } catch {}
                },
                Je = "not_served",
                it = async () => {
                  try {
                    let gt =
                      request.anchor === void 0
                        ? await Rs(request)
                        : be
                          ? await gd(request, {
                              askedAt: startTime,
                              onRefusal: (Ft) => {
                                Je = Ft;
                              },
                            })
                          : await Ua(request);
                    (sendControlResponseSuccess(
                      le,
                      isTransportBacked(e) ? { ...gt, absPath: request.path } : gt,
                    ),
                      we(() => logFeatureOk("remote_read_file_as_written")));
                  } catch (error) {
                    let Ft = be && error instanceof WireSafeControlError,
                      en = Ft && !isNoticeKindServed(Je);
                    (Xn(le, "read_file", error, { expected: en }, Ft ? "read_denied" : void 0),
                      we(() =>
                        en
                          ? logFeatureSad("remote_read_file_as_written", "refused")
                          : logFeatureBad("remote_read_file_as_written", Ft ? Je : "unexpected_error"),
                      ));
                  }
                };
              if (request.anchor === void 0) await it();
              else {
                let gt = rateLimitListener(it());
                Qn(() => gt);
              }
            } else if (
              j.request.subtype === "list_directory" &&
              env.CLAUDE_CODE_REMOTE &&
              getPlatform() === "linux" &&
              getFeatureValue_CACHED_MAY_BE_STALE("tengu_gentle_hummingbird", !0)
            ) {
              let le = j,
                path = j.request.path;
              Qn(async () => {
                let be;
                try {
                  be = await pd(path);
                } catch (error) {
                  let Je = repoRootErrorClass(error);
                  if (Je !== void 0) Xn(le, "list_directory", error, { expected: Je !== "unexpected_error" });
                  else
                    (yt(le, "list denied: unexpected_error"),
                      logHandlerFailure(
                        isTransportBacked(e),
                        "list_directory",
                        error instanceof WireSafeControlError
                          ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                              errorMessage(error),
                              "list_directory: a refusal of another module",
                            )
                          : error,
                      ));
                  if (Je !== void 0 && REPO_ROOT_ERROR_TONES[Je] === "sad")
                    logFeatureSad("remote_list_directory", Je);
                  else logFeatureBad("remote_list_directory", Je ?? "unexpected_error");
                  return;
                }
                (sendControlResponseSuccess(le, isTransportBacked(e) ? { ...be, absPath: path } : be),
                  logFeatureOk("remote_list_directory"));
              });
            } else if (j.request.subtype === "start_shell_task" && shouldOfferLinuxSandboxHint(Ri())) {
              let le = j,
                request = j.request,
                prefix = pt(j);
              Io(async () => {
                try {
                  sendControlResponseSuccess(
                    le,
                    await Ya.answer(
                      le.request_id,
                      request,
                      {
                        readsSessionStream: n.isRemoteTransport(),
                        storedAt: prefix.storedAt,
                        joinedAt: n.sessionStreamJoinedAt(),
                        heldMs: rewindRequestAge(prefix),
                      },
                      hL,
                    ),
                  );
                } catch (error) {
                  Xn(le, "start_shell_task", error, { expected: error instanceof WireSafeControlError });
                }
              });
            } else if (wr) {
              if (n.answersSurfaceRefusal(j))
                yt(j, `${R7}: ${sanitizeTelemetryString(String(j.request.subtype))}`);
              if (yLs(n.uiSurfaceChannel(), vk.list().length > 0)) {
                for (let le of vk.list()) Hl.forget(le.clientId);
                detachAllClients();
                try {
                  pruneDetachedClients();
                } catch (error) {
                  logForDebugging(`unserved channel: review failed: ${errorMessage(error)}`, {
                    level: "error",
                  });
                }
              }
            } else if (j.request.subtype === "ui_attach") {
              let safeParse = SDKUiAttachUiAttachMessageSchema().safeParse(j.request);
              if (!safeParse.success) {
                yt(
                  j,
                  `ui_attach: surface must be "desktop", "mobile" or "vscode", client_id 1-64 of letters, digits, . _ - (the colon is the engine's), viewport (when given) positive integer columns and rows with isFullscreen (when given) a boolean, and answers (when given) a list of ${UiClientAnswerableRequestSchema()
                    .options.map((prev) => `"${prev}"`)
                    .join(", ")}`,
                );
                continue;
              }
              let Re = j,
                be = safeParse.data;
              ((nf = !1),
                Qn(async () => {
                  try {
                    let joined = Hl.join({
                      client: {
                        surface: be.surface,
                        clientId: be.client_id,
                        ...(be.viewport !== void 0 && { viewport: be.viewport }),
                      },
                      answers: be.answers,
                      declares: !0,
                      by: Re,
                    });
                    if (!joined.isAdmitted) {
                      (yt(Re, `${R7}: ui_attach`), await joined.attaching);
                      return;
                    }
                    let Je = Pu;
                    if (
                      (pruneDetachedClients(),
                      sendControlResponseSuccess(Re, { surfaces: [...attachedSurfaces()] }),
                      !joined.wasOnRoster)
                    )
                      (Gg(joined.isFirstClient), Zg());
                    if ((Se.noteShown(), $tr().some((gt) => gt.clientId === be.client_id) && Pu === Je))
                      Xg(describeOpenPanes(ul().getState()));
                    await joined.attaching;
                  } catch (error) {
                    Xn(Re, "ui_attach", error);
                  }
                }));
            } else if (j.request.subtype === "ui_detach") {
              let safeParse = SDKUiDetachUiDetachMessageSchema().safeParse(j.request);
              if (!safeParse.success) {
                yt(
                  j,
                  "ui_detach: client_id must be 1-64 of letters, digits, . _ - (the colon is the engine's)",
                );
                continue;
              }
              let Re = j,
                be = safeParse.data;
              Qn(async () => {
                try {
                  let any = vk.list().some((it) => it.clientId === be.client_id);
                  if (any) (Hl.forget(be.client_id), (Ac ||= !Fce(n.uiSurfaceChannel())), Se.noteLeft());
                  let Je = raiseSessionDetach(be.client_id, "detach");
                  (pruneDetachedClients(),
                    sendControlResponseSuccess(Re, { detached: any, surfaces: [...attachedSurfaces()] }),
                    await Je);
                } catch (error) {
                  Xn(Re, "ui_detach", error);
                }
              });
            } else if (j.request.subtype === "ui_render") {
              let safeParse = SDKUiRenderUiRenderMessageSchema().safeParse(j.request);
              if (!safeParse.success) {
                yt(
                  j,
                  'ui_render: surface must be "desktop", "mobile" or "vscode", component a render site name, instance_id a string, props an object, client_id (when given) 1-64 safe characters, viewport (when given) positive integer columns and rows with isFullscreen (when given) a boolean, and on_screen (when given) null or integers first <= last < of',
                );
                continue;
              }
              if (nf) {
                yt(j, `${R7}: ui_render`);
                continue;
              }
              let Re = j,
                be = safeParse.data,
                we = `${be.instance_id}#${be.bench?.seq ?? 0}`;
              logForDebugging(`BENCH ui_render key=${we} rid=${Re.request_id} C0=${Date.now()}`);
              let Je = createAbortController();
              (handledOrphanedToolUseIds.get(Re.request_id)?.abort(),
                handledOrphanedToolUseIds.set(Re.request_id, Je),
                Qn(async () => {
                  try {
                    let it = await renderPluginSurface({ request: be, by: Re, signal: Je.signal }, yv);
                    if (Je.signal.aborted) return;
                    if (it === void 0) {
                      yt(Re, `${R7}: ui_render`);
                      return;
                    }
                    (logForDebugging(`BENCH ui_render key=${we} rid=${Re.request_id} C3=${Date.now()}`),
                      sendControlResponseSuccess(Re, it));
                  } catch (error) {
                    if (!Je.signal.aborted) Xn(Re, "ui_render", error);
                  } finally {
                    if (handledOrphanedToolUseIds.get(Re.request_id) === Je)
                      handledOrphanedToolUseIds.delete(Re.request_id);
                    if (Je.signal.aborted) n.controlRequestEnded(Re.request_id);
                  }
                }));
            } else if (j.request.subtype === "ui_press") {
              let safeParse = SDKUiPressUiPressMessageSchema().safeParse(j.request);
              if (!safeParse.success) {
                yt(
                  j,
                  'ui_press: plugin must be a string, handle an integer, key (when given) a string, surface (when given) "desktop", "mobile" or "vscode" and href (when given) a string of at most 2048 characters',
                );
                continue;
              }
              let Re = j,
                be = safeParse.data;
              Qn(async () => {
                try {
                  let press = await render.press({
                    plugin: be.plugin,
                    handle: be.handle,
                    ...(be.key !== void 0 && { element: be.key }),
                    surface: be.surface,
                    link: be.href === void 0 ? void 0 : { href: be.href },
                    ...(be.press_id !== void 0 && {
                      pagePress: { pressId: be.press_id, clientId: be.client_id },
                    }),
                  });
                  if (press === void 0) {
                    sendControlResponseSuccess(Re, { handled: !1 });
                    return;
                  }
                  let Je =
                    be.render === void 0 ? void 0 : await renderPluginSurfaceWithRetry(be.render, Re, yv);
                  sendControlResponseSuccess(Re, {
                    handled: !0,
                    element: press.element,
                    ...(Je !== void 0 && { drawn: Je }),
                  });
                } catch (error) {
                  Xn(Re, "ui_press", error);
                }
              });
            } else if (j.request.subtype === "ui_input") {
              let safeParse = SDKUiInputUiInputMessageSchema().safeParse(j.request);
              if (!safeParse.success) {
                yt(
                  j,
                  'ui_input: plugin must be a string, handle an integer, kind "change" or "submit", value a string of at most 16384 characters, key (when given) a string, component (when given) a render site name, instance_id (when given) a string and surface (when given) "desktop", "mobile" or "vscode"',
                );
                continue;
              }
              let Re = j,
                be = safeParse.data;
              Qn(async () => {
                try {
                  let input = await render.input({
                    plugin: be.plugin,
                    handle: be.handle,
                    surface: be.surface,
                    kind: be.kind,
                    value: be.value,
                    ...(be.key !== void 0 && { element: be.key }),
                    ...(be.component !== void 0 && { component: be.component }),
                    ...(be.instance_id !== void 0 && { requestId: be.instance_id }),
                  });
                  sendControlResponseSuccess(
                    Re,
                    input === void 0
                      ? { handled: !1 }
                      : { handled: !0, element: input.element, value: input.value },
                  );
                } catch (error) {
                  Xn(Re, "ui_input", error);
                }
              });
            } else if (j.request.subtype === "ui_prompt_edit") {
              let safeParse = SDKUiPromptEditUiPromptEditMessageSchema().safeParse(j.request);
              if (!safeParse.success) {
                yt(
                  j,
                  'ui_prompt_edit: text must be a string of at most 1000000 characters, cursor an integer >= 0, key (when given) an object with key a string of 1-32 characters and ctrl, shift, meta each true when present, by (when given) "person" or "app", surface (when given) "desktop", "mobile" or "vscode" and client_id (when given) 1-64 of letters, digits, . _ -',
                );
                continue;
              }
              let Re = j,
                be = safeParse.data,
                we = be.client_id ?? ypt(be.surface),
                Je = { text: be.text, cursor: be.cursor };
              Qn(async () => {
                try {
                  let it =
                    be.by === "app"
                      ? REMOTE_EDIT_QUEUE.adopt(we, Je)
                      : await REMOTE_EDIT_QUEUE.edit({
                          clientKey: we,
                          box: Je,
                          ...(be.key !== void 0 && { key: be.key }),
                        });
                  sendControlResponseSuccess(Re, { ...it });
                } catch (error) {
                  Xn(Re, "ui_prompt_edit", error);
                }
              });
            } else if (j.request.subtype === "ui_prompt_autocomplete") {
              let safeParse = SDKUiPromptAutocompleteUiPromptAutocompleteMessageSchema().safeParse(j.request);
              if (!safeParse.success) {
                yt(
                  j,
                  'ui_prompt_autocomplete: text must be a string of at most 1000000 characters, cursor an integer >= 0, surface (when given) "desktop", "mobile" or "vscode" and client_id (when given) 1-64 of letters, digits, . _ -',
                );
                continue;
              }
              let Re = j,
                be = safeParse.data;
              Qn(async () => {
                try {
                  sendControlResponseSuccess(Re, {
                    ...(await REMOTE_AUTOCOMPLETE.ask(be.client_id ?? ypt(be.surface), {
                      text: be.text,
                      cursor: be.cursor,
                    })),
                  });
                } catch (error) {
                  Xn(Re, "ui_prompt_autocomplete", error);
                }
              });
            } else if (j.request.subtype === "ui_select") {
              let safeParse = SDKUiSelectUiSelectMessageSchema().safeParse(j.request);
              if (!safeParse.success) {
                yt(
                  j,
                  'ui_select: plugin must be a string, handle an integer, value a string of at most 16384 characters, key (when given) a string, component (when given) a render site name, instance_id (when given) a string and surface (when given) "desktop", "mobile" or "vscode"',
                );
                continue;
              }
              let Re = j,
                be = safeParse.data;
              Qn(async () => {
                try {
                  let select = await render.select({
                    plugin: be.plugin,
                    handle: be.handle,
                    surface: be.surface,
                    value: be.value,
                    ...(be.key !== void 0 && { element: be.key }),
                    ...(be.component !== void 0 && { component: be.component }),
                    ...(be.instance_id !== void 0 && { requestId: be.instance_id }),
                  });
                  sendControlResponseSuccess(
                    Re,
                    select === void 0
                      ? { handled: !1 }
                      : { handled: !0, element: select.element, value: select.value },
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
                sendControlResponseSuccess(j, describePanesForClient(describeOpenPanes(ul().getState())));
              } catch (error) {
                Xn(j, "ui_panes", error);
              }
            } else if (j.request.subtype === "ui_pane_show") {
              let safeParse = SDKUiPaneShowUiPaneShowMessageSchema().safeParse(j.request);
              if (!safeParse.success) {
                yt(j, "ui_pane_show: id must be 1-64 of letters, digits, _ or -");
                continue;
              }
              try {
                let focusedId = ul().getState().focusedId;
                if ((showPane(safeParse.data.id), ul().getState().focusedId !== focusedId))
                  syncOpenPanes(safeParse.data.client_id ?? ypt(safeParse.data.surface));
                sendControlResponseSuccess(j, { shown_id: ul().getState().shownId });
              } catch (error) {
                Xn(j, "ui_pane_show", error);
              }
            } else if (j.request.subtype === "ui_pane_focus") {
              let safeParse = SDKUiPaneFocusUiPaneFocusMessageSchema().safeParse(j.request);
              if (!safeParse.success) {
                yt(
                  j,
                  'ui_pane_focus: id must be null or 1-64 of letters, digits, _ or -, surface (when given) "desktop", "mobile" or "vscode"',
                );
                continue;
              }
              let Re = safeParse.data;
              try {
                (focusPane(Re.id),
                  syncOpenPanes(Re.client_id ?? ypt(Re.surface)),
                  sendControlResponseSuccess(j, { focused_id: ul().getState().focusedId }));
              } catch (error) {
                Xn(j, "ui_pane_focus", error);
              }
            } else if (j.request.subtype === "ui_close") {
              let safeParse = SDKUiCloseUiCloseMessageSchema().safeParse(j.request);
              if (!safeParse.success) {
                yt(j, "ui_close: id must be 1-64 of letters, digits, _ or -");
                continue;
              }
              let Re = j,
                id = safeParse.data.id,
                we = () => hxe(ul().getState()).some((Je) => Je.id === id);
              if (!we()) {
                sendControlResponseSuccess(Re, { closed: !0 });
                continue;
              }
              Qn(async () => {
                try {
                  (await closePane(id, { kind: "person" }),
                    sendControlResponseSuccess(Re, { closed: !we() }));
                } catch (error) {
                  Xn(Re, "ui_close", error);
                }
              });
            } else if (j.request.subtype === "ui_scroll") {
              let safeParse = SDKUiScrollUiScrollMessageSchema().safeParse(j.request);
              if (!safeParse.success) {
                yt(
                  j,
                  'ui_scroll: component must be "Pane" or "AbovePrompt", instance_id a string of at most 256 characters, offset, body_rows and content_rows non-negative integers, by an integer, pointer (when given) integer column and row, keyed (when given) at most 512 of {plugin, key, top, bottom}, surface (when given) "desktop", "mobile" or "vscode"',
                );
                continue;
              }
              let Re = j,
                be = safeParse.data;
              Qn(async () => {
                try {
                  let we = await handlePaneScrollRequest({
                    clientId: be.client_id ?? ypt(be.surface),
                    component: be.component,
                    requestId: be.instance_id,
                    offset: be.offset,
                    by: be.by,
                    bodyRows: be.body_rows,
                    contentRows: be.content_rows,
                    ...(be.pointer !== void 0 && { pointer: be.pointer }),
                    ...(be.keyed !== void 0 && { keyed: be.keyed }),
                  });
                  sendControlResponseSuccess(Re, {
                    moved: we.result.deny === void 0,
                    offset: we.offset,
                    ...(we.result.deny !== void 0 && { deny: we.result.deny }),
                    ...(we.isFollowingEnd && { follow_end: !0 }),
                  });
                } catch (error) {
                  Xn(Re, "ui_scroll", error);
                }
              });
            } else if (j.request.subtype === "ui_focus") {
              let safeParse = SDKUiFocusUiFocusMessageSchema().safeParse(j.request);
              if (!safeParse.success) {
                yt(
                  j,
                  'ui_focus: component must be "Pane" or "AbovePrompt", instance_id a string of at most 256 characters, is_held a boolean, element (when given) null or {plugin, key} of at most 256 characters each, by (when given) "person" or "auto", surface (when given) "desktop", "mobile" or "vscode"',
                );
                continue;
              }
              let Re = j,
                be = safeParse.data;
              Qn(async () => {
                try {
                  let we = await handlePaneFocusRequest({
                    clientId: be.client_id ?? ypt(be.surface),
                    component: be.component,
                    requestId: be.instance_id,
                    isHeld: be.is_held,
                    ...(be.element !== void 0 && { element: be.element }),
                    by: be.by,
                  });
                  sendControlResponseSuccess(Re, {
                    moved: we.result.deny === void 0,
                    element: we.element,
                    ...(we.result.deny !== void 0 && { deny: we.result.deny }),
                  });
                } catch (error) {
                  Xn(Re, "ui_focus", error);
                }
              });
            } else if (j.request.subtype === "ui_client_module") {
              let safeParse = SDKUiClientModuleUiClientModuleMessageSchema().safeParse(j.request);
              if (!safeParse.success) {
                yt(j, "ui_client_module: plugin must be a string");
                continue;
              }
              try {
                let clientModule = render.clientModule(safeParse.data.plugin);
                if (clientModule === void 0)
                  yt(
                    j,
                    `ui_client_module: plugin ${sanitizeTelemetryString(safeParse.data.plugin)} is not loaded or its hooks module names no surface module`,
                  );
                else sendControlResponseSuccess(j, clientModule);
              } catch (error) {
                Xn(j, "ui_client_module", error);
              }
            } else if (j.request.subtype === "ui_client_press") {
              let safeParse = SDKUiClientPressUiClientPressMessageSchema().safeParse(j.request);
              if (!safeParse.success) {
                yt(
                  j,
                  'ui_client_press: plugin, instance_id, client, module and element must be strings, component a render site name, and event {type: "press"} | {type: "input", kind, value} | {type: "select", value}',
                );
                continue;
              }
              let Re = j,
                be = safeParse.data;
              Qn(async () => {
                try {
                  let clientPress = await render.clientPress({
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
                    clientPress === void 0
                      ? { handled: !1 }
                      : {
                          handled: !0,
                          ...(clientPress.reached !== void 0 && { reached: clientPress.reached }),
                        },
                  );
                } catch (error) {
                  Xn(Re, "ui_client_press", error);
                }
              });
            } else if (j.request.subtype === "ui_message") {
              let safeParse = SDKUiMessageUiMessageMessageSchema().safeParse(j.request);
              if (!safeParse.success) {
                yt(
                  j,
                  "ui_message: plugin, instance_id, client and module must be strings, component a render site name, and data present (plain JSON)",
                );
                continue;
              }
              let Re = j,
                be = safeParse.data;
              Qn(async () => {
                try {
                  let clientMessage = await render.clientMessage({
                    plugin: be.plugin,
                    component: be.component,
                    requestId: be.instance_id,
                    key: be.client,
                    module: be.module,
                    data: be.data,
                  });
                  sendControlResponseSuccess(
                    Re,
                    clientMessage === void 0
                      ? { handled: !1 }
                      : {
                          handled: !0,
                          ...(clientMessage.props !== void 0 && { props: clientMessage.props }),
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
                  let { buildWorkspaceDiffResponse: buildWorkspaceDiffResponse } =
                    await import("./chunk-wfz00gss.js");
                  sendControlResponseSuccess(
                    le,
                    await buildWorkspaceDiffResponse(e.host, w().toolPermissionContext),
                  );
                } catch (error) {
                  Xn(le, "get_workspace_diff", error);
                }
              });
            } else if (j.request.subtype === "get_plan")
              try {
                let {
                    peekPlanSlug: peekPlanSlug,
                    getPlanAsync: getPlanAsync,
                    getPlanFilePath: getPlanFilePath,
                    notePlanFileForgotten: notePlanFileForgotten,
                  } = await import("./chunk-p2nht1vg.js"),
                  Je = peekPlanSlug();
                if (Je !== void 0) notePlanFileForgotten(getPlanFilePath());
                let it = Je !== void 0 ? await getPlanAsync(void 0, x.storageV5) : null;
                sendControlResponseSuccess(
                  j,
                  it !== null
                    ? {
                        exists: !0,
                        content: it,
                        ...(isTransportBacked(e) ? {} : { path: getPlanFilePath() }),
                      }
                    : { exists: !1 },
                );
              } catch (error) {
                Xn(j, "get_plan", error);
              }
            else if (j.request.subtype === "stage_file") {
              let request = j.request,
                Re = x.homeSeed?.record.noteStagedRowRead(request);
              if (Re !== void 0)
                logEvent("tengu_home_seed_announcement_read", {
                  on_record: Re.onRecord,
                  epoch_gt1: Am(env.CLAUDE_CODE_WORKER_EPOCH),
                  ...(Re.onRecord && {
                    ordinal: Re.ordinal,
                    behind_ms: Re.behindMs,
                    turns_at_hold_before: Re.turnsAtHoldBefore,
                    turn_at_hold_meanwhile: Re.turnAtHoldMeanwhile,
                  }),
                });
              let be = request.filestore_path
                ? void 0
                : of_4.begin(By(request.mount_path), request.mount_path, request.resync === !0);
              Qn(async () => {
                let we,
                  Je = !0;
                try {
                  let { stageFile: stageFile, stageFileWireResult: stageFileWireResult } =
                      await import("./chunk-q02nzdea.js"),
                    { sameStandingFlag: sameStandingFlag } = await import("./chunk-wbmcdb36.js");
                  we = K1o(request.mount_path);
                  let { recordStagedOutputAsRead: recordStagedOutputAsRead } =
                      await import("./chunk-qqey4ng3.js"),
                    currentAppState = Oc(),
                    Et;
                  try {
                    if (
                      ((Et = await stageFile(
                        request,
                        void 0,
                        await waitForHomeFilesFlag(request.mount_path),
                        j.request_id,
                        sameStandingFlag(),
                      )),
                      (we = Et.ok ? void 0 : K1o(request.mount_path, Et.permanent)),
                      (Je = !Et.ok && (classifyStageWriteError(Et.error) ?? !0)),
                      Et.ok && Et.outputPath !== void 0)
                    ) {
                      let Wn = await recordStagedOutputAsRead(fs, Et.outputPath);
                      logForDiagnosticsNoPII("info", "stage_file_output_read_state", { outcome: Wn });
                    }
                  } finally {
                    currentAppState();
                  }
                  if (Et.ok) sendControlResponseSuccess(j, stageFileWireResult(Et));
                  else
                    (Ws("stage_file", Et.error),
                      yt(
                        j,
                        sanitizeMcpResourceError(Et.error) ??
                          pickForTransport(e, Et.error, "stage_file failed"),
                      ));
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
                let {
                    generateFileSuggestionsWithBase: generateFileSuggestionsWithBase,
                    globalFileIndexCache: globalFileIndexCache,
                  } = await import("./chunk-21emf7ab.js"),
                  { items: items, baseDir: baseDir } = await generateFileSuggestionsWithBase(
                    globalFileIndexCache,
                    j.request.query,
                    !0,
                    x.storageV5,
                  ),
                  Je = isTransportBacked(e) ? void 0 : baseDir;
                sendControlResponseSuccess(j, {
                  suggestions: items.map((it) => ({ path: it.displayText })),
                  ...(Je !== void 0 && { cwd: Je }),
                });
              } catch (error) {
                Xn(j, "file_suggestions", error);
              }
            else if (j.request.subtype === "seed_read_state") {
              try {
                let le = expandPath(j.request.path),
                  Re = NF(j.request.path, le, w().toolPermissionContext.trustedNetworkDirectories);
                if (!(
                  !Re.ok ||
                  Re.pathsToCheck.some(
                    (we) =>
                      !isPathAllowed(we, w().toolPermissionContext, "read").allowed ||
                      matchingRuleForInput(we, w().toolPermissionContext, "read", "deny") !== null ||
                      matchingRuleForInput(we, w().toolPermissionContext, "read", "ask") !== null,
                  )
                )) {
                  let {
                      REMOTE_READ_OPEN_FLAGS: REMOTE_READ_OPEN_FLAGS,
                      isCanonicalPathContained: isCanonicalPathContained,
                    } = await import("./chunk-kkqmctap.js"),
                    {
                      bindCanonicalPathToHandle: bindCanonicalPathToHandle,
                      readHandleBounded: readHandleBounded,
                    } = await import("./chunk-h8ch5r1x.js"),
                    Ft = await open(le, REMOTE_READ_OPEN_FLAGS);
                  try {
                    let stats = await Ft.stat({ bigint: !0 }),
                      floored = Math.floor(Number(stats.mtimeMs)),
                      Et = 10485760;
                    if (stats.isFile() && stats.size <= BigInt(10485760) && floored <= j.request.mtime) {
                      let Wn = await readHandleBounded(Ft, 10485760, stats.size),
                        hn = await realpath(le),
                        jt = await bindCanonicalPathToHandle(Ft, stats, hn),
                        $t = jt !== void 0 && (await isCanonicalPathContained(jt, w().toolPermissionContext));
                      if (!(
                        Wn.overLimit ||
                        jt === void 0 ||
                        !$t ||
                        cH(jt, w().toolPermissionContext.trustedNetworkDirectories) !== void 0 ||
                        !isPathAllowed(jt, w().toolPermissionContext, "read").allowed ||
                        matchingRuleForInput(jt, w().toolPermissionContext, "read", "deny") !== null ||
                        matchingRuleForInput(jt, w().toolPermissionContext, "read", "ask") !== null
                      )) {
                        let Ht = __(Wn.bytes.toString("utf-8"));
                        pendingSeeds.set(le, {
                          content: Ht,
                          timestamp: floored,
                          offset: void 0,
                          limit: void 0,
                          contentNotInModelContext: !0,
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
                Object.values(servers).some(
                  (gt) => gt === null || typeof gt !== "object" || Array.isArray(gt),
                )
              ) {
                yt(j, uCs);
                continue;
              }
              if (Sg !== null && j.request.hint === Sg) {
                if ((Sc?.sync("binding_changed"), Object.keys(j.request.servers).length === 0)) {
                  sendControlResponseSuccess(j, { added: [], removed: [], errors: {} });
                  continue;
                }
              }
              let startTime = performance.now(),
                mainThreadRequestedInProcess = e.requestJournal.mainThreadRequestedInProcess(),
                we = await Ew(
                  filterObject(j.request.servers, (gt, Ft) => !isPrototypeKey(Ft)),
                  { authoritative: !0, caller: "mcp_set_servers", dialOptions: { toolsListAhead: !0 } },
                ),
                { sdkServersChanged: sdkServersChanged } = we,
                it = {
                  ...we.response,
                  errors: {
                    ...Object.fromEntries(
                      Object.keys(j.request.servers)
                        .filter(isPrototypeKey)
                        .map((gt) => [gt, reservedServerNameMessage(gt)]),
                    ),
                    ...we.response.errors,
                  },
                };
              if (Object.keys(it.errors).length > 0) Ws("mcp_set_servers", jsonStringify(it.errors));
              if (
                (sendControlResponseSuccess(j, {
                  ...it,
                  errors: sanitizeMcpStatusMap(isTransportBacked(e), it.errors),
                }),
                recordInlineMcpSetServers(SU, {
                  startMs: startTime,
                  answeredMs: performance.now(),
                  mainThreadRequested: mainThreadRequestedInProcess,
                  relayMarked: relayMarked,
                  response: it,
                }),
                sdkServersChanged)
              )
                Ma();
            } else if (j.request.subtype === "reload_plugins") {
              let le;
              try {
                let Re = () =>
                  getActiveAgentsFromList(lo).map((Et) => ({
                    name: Et.agentType,
                    description: Et.whenToUse,
                    model: Et.model,
                  }));
                if (j.request.hold_on_cache_impact && !He && Xe === void 0)
                  Xe = await loadAllPluginsCacheOnly(x.storageV5, x.credentials);
                if (isNonEmptyValue(j.request.add_plugins)) {
                  let Et = await handleReloadPluginsAddPlugins({
                    addPlugins: j.request.add_plugins,
                    fromOffMachine: mayTransportPersist(e),
                  });
                  if (Et.kind === "refused") {
                    (logFeatureBad("sdk_reload_add_plugins", Et.code), yt(j, Et.message));
                    continue;
                  }
                  le = Et;
                }
                let be = T3n(e) ? ese() : void 0;
                ((Ba = be),
                  await Promise.all([
                    reconcileMarketplacesOnReload({
                      admission: x.pluginForwardingAdmission,
                      readFlag: isCloudPluginForwardingFlagOn,
                      flagWaitCapMs: PLUGIN_INSTALL_WAIT_MS,
                      install: (Et) =>
                        waitForRemoteManagedSettingsToLoad().then(() =>
                          installPluginsForHeadlessSerialized(Et, x.storageV5, x.credentials),
                        ),
                      installTimeoutMs: ese(),
                      onLateEnd: (Et) => {
                        (logLateInstallPass(Et), ra.noteLateForwardedInstall());
                      },
                      now: () => performance.now(),
                    }).then((Et) => {
                      if ((logMarketplaceReconcile(Et), !Et.ran && Et.reason === "flag_off")) pw("reload");
                    }),
                    be === void 0
                      ? void 0
                      : withDeadline(Promise.allSettled([rerunPluginsSync(e, x.credentials)]), be).then(
                          (Et) => {
                            sa = Et === void 0;
                          },
                        ),
                  ]),
                  or());
                let we;
                if (j.request.hold_on_cache_impact) {
                  let Et = await computePluginReloadImpact({
                    model: Ao() ?? getMainLoopModel(),
                    mcpClients: w().mcp.clients,
                    storageV5: x.storageV5,
                    credentials: x.credentials,
                  });
                  if (
                    (logReloadPluginsImpact(Et, { warned: Et.wouldInvalidateCache, forced: !1 }),
                    Et.wouldInvalidateCache)
                  ) {
                    if (le) (le.restore(), (le = void 0), logFeatureSad("sdk_reload_add_plugins", "held"));
                    getSyncedPluginReloadDebt().holdReload();
                    let Wn = He ? w().plugins : (Xe ?? { enabled: [], errors: [] });
                    sendControlResponseSuccess(j, {
                      commands: toSlashCommands(Ho()),
                      agents: Re(),
                      plugins: emptyIfTransport(e, Wn.enabled.map(toPluginInitInfo)),
                      mcpServers: statusesForTransport(e, describeMcpServerForStatus(bc.mcpConnections())),
                      error_count: Wn.errors.length,
                      held: !0,
                      cache_impact: {
                        mcp_servers_added: Et.mcpServersAdded,
                        mcp_servers_removed: Et.mcpServersRemoved,
                        lsp_tool_change: Et.lspToolChange,
                      },
                    });
                    continue;
                  }
                  we = !1;
                }
                retryUnloadedModules();
                let reloadsCompleted = getSyncedPluginReloadDebt().reloadsCompleted,
                  it = await refreshActivePlugins(over_2, x.storageV5, x.credentials);
                if (((He = !0), le)) ((le = void 0), logFeatureOk("sdk_reload_add_plugins"));
                buildAllTools(it.agentDefinitions.allAgents);
                let gt = [],
                  [Ft, en, yn] = await Promise.allSettled([
                    getCommands(cwd(), x.storageV5),
                    Bl(Jm(), "reload_plugins"),
                    loadAllPluginsCacheOnly(x.storageV5, x.credentials),
                  ]);
                if (Ft.status === "fulfilled") ((od = getNonInteractiveCommands(Ft.value)), Wl());
                else logError(Ft.reason);
                if (en.status === "rejected")
                  logForDebugging(`reload_plugins: applyPluginMcpDiff failed: ${errorMessage(en.reason)}`, {
                    level: "error",
                  });
                else ra.noteReloadedByHost(reloadsCompleted);
                if (yn.status === "fulfilled")
                  gt = emptyIfTransport(e, yn.value.enabled.map(toPluginInitInfo));
                else
                  logError(withTelemetryMessage(toError(yn.reason), "reload_plugins: loadAllPlugins failed"));
                (md(),
                  sendControlResponseSuccess(j, {
                    commands: toSlashCommands(Ho()),
                    agents: Re(),
                    plugins: gt,
                    mcpServers: statusesForTransport(e, describeMcpServerForStatus(bc.mcpConnections())),
                    error_count: it.error_count,
                    ...(we !== void 0 && { held: we }),
                  }));
              } catch (error) {
                if (le) (le.restore(), logFeatureBad("sdk_reload_add_plugins", "refresh_failed"));
                Xn(j, "reload_plugins", error);
              }
            } else if (j.request.subtype === "reload_skills")
              try {
                if (Zoe(e))
                  ((Ba = tDs()),
                    (sa =
                      (await Promise.race([
                        Promise.allSettled([reloadSyncedSkills(e, x.storageV5, x.credentials)]),
                        sleep(Ba),
                      ])) === void 0));
                (eN(),
                  await af(),
                  sendControlResponseSuccess(
                    j,
                    listSkillsForSdk(
                      await getSkillToolCommands(getOriginalCwd(), x.storageV5),
                      w().mcp.commands,
                      od,
                    ),
                  ));
              } catch (error) {
                Xn(j, "reload_skills", error);
              }
            else if (j.request.subtype === "mcp_call") {
              let { tool: tool, arguments: Re } = j.request;
              if (
                (handledOrphanedToolUseIds.get(j.request_id)?.abort(),
                handledOrphanedToolUseIds.delete(j.request_id),
                typeof tool !== "string")
              ) {
                yt(j, "mcp_call: tool must be a string");
                continue;
              }
              let we = mcpInfoFromString(tool),
                Je = we?.toolName ? mcpCallRefusalFor(we) : void 0;
              if (!we || !we.toolName)
                yt(j, `Not a fully-qualified MCP tool name: ${sanitizeTelemetryString(tool)}`);
              else if (Je !== void 0) yt(j, Je);
              else {
                let it =
                    j.request.input_files !== void 0 ||
                    j.request.output_files !== void 0 ||
                    j.request.expires_at !== void 0 ||
                    j.request.timeout_ms !== void 0,
                  gt = typeof j.request.expires_at === "string" ? j.request.expires_at : void 0,
                  toolName = we.toolName,
                  en = j.request.result_not_for_model === !0,
                  yn =
                    en &&
                    ejn({
                      redactsWhatItPersists: isTransportBacked(e),
                      isRemoteTransport: n.isRemoteTransport(),
                    });
                if (en && !yn) logFeatureSad("mcp_call_result_not_for_model", "ignored_on_lane");
                Io(async () => {
                  if (Wo.signal.aborted) return;
                  let Et = Oc(),
                    Wn = createChildAbortController(Wo);
                  handledOrphanedToolUseIds.set(j.request_id, Wn);
                  let hn = () => handledOrphanedToolUseIds.get(j.request_id) === Wn,
                    jt = () => Wo.signal.aborted || !hn();
                  try {
                    if (it && !getFeatureValue_CACHED_MAY_BE_STALE("tengu_ptc_enabled", !0)) {
                      (logFeatureBad("ccr_mcp_call_staged", "kill_switch"),
                        yt(j, "staged mcp_call is disabled"));
                      return;
                    }
                    let $t = await QU(we.serverName, gt, Wn.signal);
                    if (jt()) return;
                    if (!$t) {
                      if (Wn.signal.aborted) {
                        yt(j, `mcp_call cancelled by client: ${sanitizeTelemetryString(we.serverName)}`);
                        return;
                      }
                      if (it) logFeatureBad("ccr_mcp_call_staged", "not_connected");
                      yt(j, `MCP server not connected: ${sanitizeTelemetryString(we.serverName)}`);
                      return;
                    }
                    let un = remoteBrowserRefusal($t.name);
                    if (un !== void 0) {
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
                    let Ht =
                      [...w().mcp.tools, ...dynamicMcpState.tools].find((resolve) =>
                        toolMatchesName(resolve, tool),
                      )?.mcpInfo?.toolName ?? toolName;
                    if (it) {
                      let { runStagedMcpCall: runStagedMcpCall } = await import("./chunk-km6145cp.js"),
                        dr = !1,
                        { staging: staging, tool: tool } = await runStagedMcpCall(j.request, {
                          signal: Wn.signal,
                          call: async (Tr, co) => {
                            if (isMcpServerBlockedAtConnectTime($t.name, $t.config))
                              return {
                                isError: !0,
                                content: [
                                  {
                                    type: "text",
                                    text: `MCP server not connected: ${sanitizeTelemetryString(we.serverName)}`,
                                  },
                                ],
                              };
                            let Kr = remoteBrowserRefusal($t.name);
                            if (Kr !== void 0) return { isError: !0, content: [{ type: "text", text: Kr }] };
                            let ko;
                            try {
                              ko = await getMcpClientModule().callMCPToolWithUrlElicitationRetry({
                                client: $t,
                                clientConnection: $t,
                                callToolFn: (url) =>
                                  guardRemoteBrowserMcpCall(getMcpClientModule().callMCPTool, url),
                                tool: Ht,
                                args: Tr,
                                imageLimits: IMAGE_LIMITS,
                                signal: co,
                                requestDialog: void 0,
                                storageV5: x.storageV5,
                                credentials: x.credentials,
                                disallowTasks: !0,
                                resultNotForModel: yn,
                              });
                            } catch (error) {
                              if (error instanceof McpAuthError) over.markNeedsAuth(error.serverName);
                              if (error instanceof McpSessionExpiredError)
                                return (
                                  logFeatureBad("mcp_session_recovery", "session_expired_no_retry"),
                                  {
                                    isError: !0,
                                    content: [
                                      {
                                        type: "text",
                                        text: mcpConnectionClosedMessage({
                                          serverName: we.serverName,
                                          error: error,
                                          namesMcpCall: !1,
                                          detail: error.message,
                                        }),
                                      },
                                    ],
                                  }
                                );
                              throw error;
                            }
                            if (ko.urlElicitationDeclined !== void 0)
                              return {
                                isError: !0,
                                content: [
                                  {
                                    type: "text",
                                    text: `URL elicitation required (open URL, then retry): ${sanitizeRelayUrl(ko.urlElicitationDeclined.url) ?? "[elicitation URL too long to relay \u2014 re-run this call in the terminal]"}`,
                                  },
                                ],
                              };
                            if (yn && isMcpCallResultTooLarge(ko))
                              return ((dr = !0), { isError: !0, content: [{ type: "text", text: Kx }] });
                            return {
                              isError: ko.isError === !0,
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
                        staging: staging,
                      });
                      return;
                    }
                    let callMCPToolWithUrlElicitationRetry =
                      await getMcpClientModule().callMCPToolWithUrlElicitationRetry({
                        client: $t,
                        clientConnection: $t,
                        callToolFn: (submit) =>
                          guardRemoteBrowserMcpCall(getMcpClientModule().callMCPTool, submit),
                        tool: Ht,
                        args: Re ?? {},
                        imageLimits: IMAGE_LIMITS,
                        signal: Wn.signal,
                        requestDialog: void 0,
                        storageV5: x.storageV5,
                        credentials: x.credentials,
                        disallowTasks: !0,
                        resultNotForModel: yn,
                      });
                    if (jt()) return;
                    if (callMCPToolWithUrlElicitationRetry.urlElicitationDeclined)
                      yt(
                        j,
                        `URL elicitation required (open URL, then retry mcp_call): ${sanitizeRelayUrl(callMCPToolWithUrlElicitationRetry.urlElicitationDeclined.url) ?? "[elicitation URL too long to relay \u2014 re-run this call in the terminal]"}` +
                          (typeof callMCPToolWithUrlElicitationRetry.content === "string"
                            ? ` \u2014 ${pickForTransport(e, callMCPToolWithUrlElicitationRetry.content, "(detail withheld)")}`
                            : ""),
                      );
                    else if (callMCPToolWithUrlElicitationRetry.interrupted)
                      yt(j, `mcp_call cancelled by client: ${sanitizeTelemetryString(we.serverName)}`);
                    else if (yn && isMcpCallResultTooLarge(callMCPToolWithUrlElicitationRetry))
                      (logFeatureBad("mcp_call_result_not_for_model", "too_large"), yt(j, Kx));
                    else {
                      if (yn) logFeatureOk("mcp_call_result_not_for_model");
                      sendControlResponseSuccess(j, {
                        content: callMCPToolWithUrlElicitationRetry.content,
                        structuredContent: callMCPToolWithUrlElicitationRetry.structuredContent,
                        _meta: stripAnthropicMeta(callMCPToolWithUrlElicitationRetry._meta),
                      });
                    }
                  } catch (error) {
                    if (jt()) return;
                    if (it) logFeatureBad("ccr_mcp_call_staged", "dispatch_failed");
                    if (error instanceof McpAuthError) over.markNeedsAuth(error.serverName);
                    Ws("mcp_call", error instanceof Error ? error.message : String(error));
                    let un = pickForTransport(
                      e,
                      error instanceof Error ? error.message : String(error),
                      "(detail withheld)",
                    );
                    if (error instanceof McpAuthError)
                      ((un = `MCP server ${sanitizeTelemetryString(error.serverName)} requires authentication \u2014 send mcp_authenticate and retry mcp_call: ${sanitizeTelemetryString(un)}`),
                        yt(j, un.slice(0, 2000).replace(/[\uD800-\uDBFF]$/, "")));
                    else if (error instanceof McpSessionExpiredError)
                      (logFeatureBad("mcp_session_recovery", "session_expired_no_retry"),
                        (un = mcpConnectionClosedMessage({
                          serverName: we.serverName,
                          error: error,
                          namesMcpCall: !0,
                          detail: un,
                        })),
                        yt(j, un.slice(0, 2000).replace(/[\uD800-\uDBFF]$/, "")));
                    else if (error instanceof McpToolResultNotReadError) {
                      let prefix = sanitizeTelemetryString(we.serverName),
                        why = error.why,
                        Kn;
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
                          .map((prev) => prev.url),
                        replaced = un.slice(0, 2000).replace(/[\uD800-\uDBFF]$/, "");
                      ((un =
                        mapped.length > 0
                          ? `URL elicitation required (open URL, then retry mcp_call): ${formatElicitationUrls(mapped)} \u2014 ${replaced}`
                          : `URL elicitation required (no URL in error data): ${replaced}`),
                        yt(j, un));
                    } else yt(j, un.slice(0, 2000).replace(/[\uD800-\uDBFF]$/, ""));
                  } finally {
                    if ((Et(), hn())) handledOrphanedToolUseIds.delete(j.request_id);
                    else if (!Wo.signal.aborted) n.controlRequestEnded(j.request_id);
                  }
                });
              }
            } else if (j.request.subtype === "set_chrome_browser_hints") {
              if (!n.isRemoteTransport()) {
                yt(j, "set_chrome_browser_hints is only accepted in a remote-hosted session");
                continue;
              }
              let safeParse = SDKSetChromeBrowserHintsSetChromeBrowserHintsMessageSchema().safeParse(
                j.request,
              );
              if (!safeParse.success) {
                yt(
                  j,
                  `Invalid set_chrome_browser_hints: ${safeParse.error.issues[0]?.message ?? "malformed"}`,
                );
                continue;
              }
              try {
                let { setChromeBrowserHints: setChromeBrowserHints } = await import("./chunk-hzej0zw0.js");
                (setChromeBrowserHints({
                  preferredDeviceId: safeParse.data.preferredDeviceId ?? void 0,
                  localDeviceIds: safeParse.data.localDeviceIds,
                  hostPlatform: safeParse.data.hostPlatform,
                }),
                  sendControlResponseSuccess(j));
              } catch (error) {
                Xn(j, "set_chrome_browser_hints", error);
              }
            } else if (j.request.subtype === "set_prompt_suggestions_paused") {
              let safeParse =
                SDKSetPromptSuggestionsPausedSetPromptSuggestionsPausedMessageSchema().safeParse(j.request);
              if (!safeParse.success) {
                yt(
                  j,
                  `Invalid set_prompt_suggestions_paused: ${safeParse.error.issues[0]?.message ?? "malformed"}`,
                );
                continue;
              }
              (qo.setPaused(safeParse.data.paused), sendControlResponseSuccess(j));
            } else if (j.request.subtype === "channel_enable") {
              let le = w();
              handleChannelEnable(
                j.request_id,
                j.request.serverName,
                [...le.mcp.clients, ...Cn, ...dynamicMcpState.clients],
                output,
                messageQueue,
              );
            } else if (j.request.subtype === "mcp_authenticate") {
              let { serverName: serverName, redirectUri: redirectUri, liveReply: liveReply } = j.request,
                we = Pa(serverName) ?? Cn.find((Ft) => Ft.name === serverName)?.config ?? null,
                Je = we ? classifyMcpAuthTarget(serverName, we) : null,
                it = () => {
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
                },
                gt = it();
              if (!we || !Je) yt(j, `Server not found: ${sanitizeTelemetryString(serverName)}`);
              else if (gt !== null) yt(j, gt);
              else if (Je.kind === "claudeai-proxy") {
                let Ft = claudeAiConnectorAuthUrl(Je.config);
                if (!Ft) yt(j, "Unable to build claude.ai connector auth URL (missing org or server id)");
                else
                  (logEvent("tengu_claudeai_mcp_auth_started", {}),
                    sendControlResponseSuccess(j, {
                      authUrl: Ft,
                      requiresUserAction: !0,
                      callbackExpected: !1,
                    }));
              } else if (Je.kind === "unsupported-transport")
                yt(j, `Server type "${Je.transport}" does not support OAuth authentication`);
              else if (Je.kind === "anthropic-hosted") yt(j, sanitizeTelemetryString(Je.message));
              else
                Qn(async () => {
                  let Ft;
                  try {
                    let en = (xt) => {
                        let Tr,
                          promise = new Promise((Go) => {
                            Tr = Go;
                          }),
                          Kr,
                          ko,
                          Er = {
                            oauthPromise: void 0,
                            adopted: !1,
                            adopt: () => {
                              if (Er.adopted || !Er.oauthPromise) return;
                              ((Er.adopted = !0),
                                oauthManualCallbackUsed.set(serverName, Er.oauthPromise),
                                _r.delete(serverName),
                                getMcpAuthModule().setActiveOAuthPromise(serverName, Er.oauthPromise));
                            },
                          },
                          performMCPOAuthFlow = getMcpAuthModule().performMCPOAuthFlow(
                            serverName,
                            Je.config,
                            (Go) => Tr(Go),
                            void 0,
                            {
                              skipBrowserOpen: !0,
                              redirectUri: xt,
                              onWaitingForCallback: (Go, Eu, fr) => {
                                ((Kr = Eu), (ko = fr), Er.adopt());
                              },
                            },
                          );
                        return (
                          (Er.oauthPromise = performMCPOAuthFlow),
                          (Ft = performMCPOAuthFlow),
                          {
                            oauthPromise: performMCPOAuthFlow,
                            adopt: Er.adopt,
                            raced: Promise.race([promise, performMCPOAuthFlow.then(() => null)]).then(
                              (Go) => ({ authUrl: Go, callbackPort: Kr, state: ko }),
                            ),
                          }
                        );
                      },
                      yn = identityEpoch(),
                      Et =
                        Boolean(Je.config.oauth?.clientId) ||
                        (Boolean(redirectUri) && (await shouldSkipCustomRedirect(serverName, Je.config))),
                      Wn = () => {
                        let xt = it();
                        if (xt !== null) return (yt(j, xt), !0);
                        if (identityEpoch() !== yn)
                          return (
                            yt(
                              j,
                              `The Claude account changed while sign-in to MCP server ${sanitizeTelemetryString(serverName)} was starting. Try again.`,
                            ),
                            !0
                          );
                        return !1;
                      };
                    if (Wn()) return;
                    let hn = Et ? void 0 : redirectUri,
                      jt = "localhost",
                      $t = en(hn),
                      un;
                    if (hn)
                      try {
                        ((un = await $t.raced), (jt = "custom"));
                      } catch (error) {
                        if (
                          (logForDebugging(
                            `[mcp_authenticate] AS rejected custom redirectUri for ${serverName}; falling back to localhost: ${sanitizeErrorDetail(redactMcpErrorDetail(serverName, Je.config, errorMessage(error)))}`,
                          ),
                          oauthManualCallbackUsed.get(serverName) === $t.oauthPromise)
                        )
                          (oauthCallbackSubmitters.delete(serverName),
                            oauthManualCallbackUsed.delete(serverName));
                        if (Wn()) return;
                        (($t = en()), (un = await $t.raced));
                      }
                    else un = await $t.raced;
                    let oauthPromise = $t.oauthPromise,
                      { authUrl: authUrl, callbackPort: callbackPort, state: state } = un;
                    if (authUrl) {
                      let xt = {
                        authUrl: authUrl,
                        requiresUserAction: !0,
                        callbackExpected: !0,
                        redirectScheme: jt,
                        state: state,
                        ...(jt === "localhost" && { callbackPort: callbackPort }),
                      };
                      if (liveReply === !0) sendControlResponseError(j, xt);
                      else sendControlResponseSuccess(j, xt);
                    } else sendControlResponseSuccess(j, { requiresUserAction: !1, callbackExpected: !1 });
                    $t.adopt();
                    let qt = oauthPromise
                      .then(async () => {
                        if (identityEpoch() !== yn) {
                          logForDebugging(
                            `MCP server ${serverName}: OAuth completed after an identity change; discarding without reconnecting`,
                          );
                          return;
                        }
                        if ((deleteNeedsAuthCache(x.storageV5), isMcpServerDisabled(serverName))) return;
                        if (isMcpDialBlockedByPolicy(serverName, we)) {
                          logForDebugging(
                            `MCP server ${serverName} blocked by managed policy after OAuth \u2014 skipping reconnect`,
                            { level: "warn" },
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
                        let xt = await Ol(serverName, we, { distrust: !1 });
                        Kd(serverName, xt);
                      })
                      .catch((error) => {
                        logForDebugging(
                          `MCP OAuth failed for ${serverName}: ${sanitizeErrorDetail(redactMcpErrorDetail(serverName, Je.config, errorMessage(error)))}`,
                          { level: "error" },
                        );
                      })
                      .finally(() => {
                        if (oauthManualCallbackUsed.get(serverName) === oauthPromise)
                          (oauthCallbackSubmitters.delete(serverName),
                            oauthManualCallbackUsed.delete(serverName));
                      });
                  } catch (error) {
                    if (Ft && oauthManualCallbackUsed.get(serverName) === Ft)
                      (oauthCallbackSubmitters.delete(serverName),
                        oauthManualCallbackUsed.delete(serverName));
                    let yn = await isDcrRejection(error, serverName, Je.config).catch(
                      (Et) => (
                        logHandlerFailure(isTransportBacked(e), "mcp_authenticate: registration check", Et),
                        !1
                      ),
                    );
                    Xn(
                      j,
                      "mcp_authenticate",
                      Error(
                        normalizeMcpServerName(
                          redactMcpErrorDetail(serverName, Je.config, errorMessage(error)),
                        ),
                      ),
                      {},
                      yn ? "mcp_client_registration_unavailable" : void 0,
                    );
                  }
                });
            } else if (j.request.subtype === "mcp_oauth_callback_url") {
              let { serverName: serverName, callbackUrl: callbackUrl } = j.request,
                oAuthCallbackSubmitter = getMcpAuthModule().getOAuthCallbackSubmitter(serverName);
              if (oAuthCallbackSubmitter) {
                let we = !1;
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
                  if (Je)
                    (oauthAuthPromises.set(serverName, Je),
                      Qn(async () => {
                        try {
                          (await Je, sendControlResponseSuccess(j));
                        } catch (error) {
                          let gt = Pa(serverName) ?? Cn.find((en) => en.name === serverName)?.config ?? null,
                            Ft = gt
                              ? normalizeMcpServerName(
                                  redactMcpErrorDetail(serverName, gt, errorMessage(error)),
                                )
                              : "[error detail unavailable: server configuration could not be located]";
                          (Ws("mcp_oauth_callback_url", Ft),
                            yt(j, pickForTransport(e, Ft, "OAuth authentication failed")));
                        } finally {
                          if (oauthAuthPromises.get(serverName) === Je) oauthAuthPromises.delete(serverName);
                        }
                      }));
                  else sendControlResponseSuccess(j);
                }
              } else yt(j, `No active OAuth flow for server: ${sanitizeTelemetryString(serverName)}`);
            } else if (j.request.subtype === "claude_authenticate") {
              let { loginWithClaudeAi: loginWithClaudeAi } = j.request,
                Re = validateForceLoginMethod(loginWithClaudeAi ?? !0);
              if (!Re.valid) {
                (logFeatureBad("sdk_claude_authenticate", "force_login_method_refused"), yt(j, Re.message));
                continue;
              }
              let be = providerBlockedMessage("firstParty");
              if (be !== void 0) {
                (logFeatureBad("sdk_claude_authenticate", "provider_not_allowed"),
                  Ws("claude_authenticate policy", be),
                  yt(
                    j,
                    "Login blocked: this machine's managed settings do not permit signing in to the Anthropic API here (allowedProviders), or the policy could not be read. Run claude auth login from a terminal for details.",
                  ));
                continue;
              }
              let we = getSettings_DEPRECATED(),
                Je =
                  we.forceLoginMethod !== void 0 &&
                  (loginWithClaudeAi ?? !0) !== (we.forceLoginMethod === "claudeai"),
                it = typeof we.forceLoginOrgUUID === "string" && !Je ? we.forceLoginOrgUUID : void 0,
                gt = claudeOAuth;
              if (gt?.urls !== void 0 && canJoinOAuthFlow(gt, loginWithClaudeAi ?? !0, it, Date.now())) {
                (logEvent("tengu_oauth_flow_joined", { loginWithClaudeAi: loginWithClaudeAi ?? !0 }),
                  sendControlResponseSuccess(j, gt.urls));
                continue;
              }
              let Ft;
              (claudeOAuth?.service.cleanup(),
                logEvent("tengu_oauth_flow_start", { loginWithClaudeAi: loginWithClaudeAi ?? !0 }));
              let en = !1,
                service = new OAuthService(),
                Et,
                urlPromise = new Promise((resolve) => {
                  Et = resolve;
                }),
                flow = service
                  .startOAuthFlow(
                    async (manualUrl, automaticUrl) => {
                      Et({ manualUrl: manualUrl, automaticUrl: automaticUrl });
                    },
                    {
                      loginWithClaudeAi: loginWithClaudeAi ?? !0,
                      orgUUID: it,
                      skipBrowserOpen: !0,
                      settingsOnlyGrant: Ft,
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
                      ((en = !0), logFeatureBad("sdk_claude_authenticate", "org_pin_refused"));
                      let xt = await revokeRefusedSignInToken(err);
                      throw new WireSafeControlError(`${Bx} ${xt}`);
                    }
                    let un = await sdkClaudeAuthenticate(err);
                    if (un !== void 0) throw ((en = !0), new WireSafeControlError(un));
                    let Ht = new Set([...w().mcp.clients, ...rr.getDynamicMcpState().clients]),
                      cn = await saveLoginOrWarn(err, { storageV5: x.storageV5, credentials: x.credentials }),
                      Kn = err.tokenAccount
                        ? {
                            accountUuid: err.tokenAccount.uuid,
                            organizationUuid: err.tokenAccount.organizationUuid,
                          }
                        : err.profile?.account && err.profile.organization
                          ? {
                              accountUuid: err.profile.account.uuid,
                              organizationUuid: err.profile.organization.uuid,
                            }
                          : void 0;
                    (So.identityChanged(Kn),
                      zr?.loginChanged(Kn),
                      P((xt) =>
                        xt.ultrareviewOverageConfirmed ? { ...xt, ultrareviewOverageConfirmed: !1 } : xt,
                      ),
                      P(wqn));
                    let dr = await validateForceLoginOrg(
                      x.credentials,
                      $t.outcome === "permitted" ? $t.verified : void 0,
                    );
                    if (!dr.valid) {
                      ((en = !0),
                        logFeatureBad(
                          "sdk_claude_authenticate",
                          dr.reason === "provider_not_allowed" ? "provider_not_allowed" : "org_pin_refused",
                        ));
                      let xt = await rollbackRefusedSignIn(cn?.storage, {
                        storageV5: x.storageV5,
                        credentials: x.credentials,
                      }).catch(
                        (Tr) => (logRollbackFailure(Tr, "headless login"), { restored: !1, revoked: !1 }),
                      );
                      throw (
                        uzs(),
                        reconnectMcpOnIdentityChange({
                          ...rr,
                          storageV5: x.storageV5,
                          credentials: x.credentials,
                          getHostOwnedConfigs: Ca,
                          force: !0,
                          spareUnchangedFrom: Ht,
                        }),
                        So.identityChanged(void 0),
                        zr?.loginChanged(void 0),
                        new WireSafeControlError(xt.restored ? Bx : xt.revoked ? iz : az)
                      );
                    }
                    refreshAuthDependentSettings(x.storageV5, x.credentials);
                    let qt = reconnectMcpOnIdentityChange({
                      ...rr,
                      storageV5: x.storageV5,
                      credentials: x.credentials,
                      getHostOwnedConfigs: Ca,
                    });
                    if (
                      (logFeatureOk("sdk_claude_authenticate"),
                      logEvent("tengu_oauth_success", { loginWithClaudeAi: loginWithClaudeAi ?? !0 }),
                      qt)
                    )
                      await withDeadline(qt, PCs);
                    return;
                  })
                  .finally(() => {
                    if ((service.cleanup(), claudeOAuth?.service === service)) claudeOAuth = null;
                  });
              ((claudeOAuth = {
                service: service,
                flow: flow,
                loginWithClaudeAi: loginWithClaudeAi ?? !0,
                orgUUID: it,
                startedAt: Date.now(),
              }),
                flow.catch((jt) => {
                  if (
                    (logForDebugging(`claude_authenticate flow ended: ${jt}`, { level: "info" }),
                    jt instanceof OAuthCallbackError || en)
                  )
                    return;
                  logFeatureBad("sdk_claude_authenticate", "oauth_flow_failed");
                }));
              try {
                let { manualUrl: manualUrl, automaticUrl: automaticUrl } = await Promise.race([
                  urlPromise,
                  flow.then(() => {
                    throw Error("OAuth flow completed without producing auth URLs");
                  }),
                ]);
                if (claudeOAuth?.service === service)
                  claudeOAuth.urls = { manualUrl: manualUrl, automaticUrl: automaticUrl };
                sendControlResponseSuccess(j, { manualUrl: manualUrl, automaticUrl: automaticUrl });
              } catch (error) {
                Xn(j, "claude_authenticate", error);
              }
            } else if (
              j.request.subtype === "claude_oauth_callback" ||
              j.request.subtype === "claude_oauth_wait_for_completion"
            )
              if (!claudeOAuth) yt(j, "No active claude_authenticate flow");
              else {
                if (j.request.subtype === "claude_oauth_callback")
                  claudeOAuth.service.handleManualAuthCodeInput({
                    authorizationCode: j.request.authorizationCode,
                    state: j.request.state,
                  });
                let { flow: flow } = claudeOAuth;
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
                      (Ws("claude_oauth_callback", errorMessage(error)),
                        yt(
                          j,
                          error instanceof WireSafeControlError
                            ? sanitizeTelemetryString(errorMessage(error))
                            : pickForTransport(e, errorMessage(error), "claude_oauth_callback failed"),
                        ));
                    },
                  ),
                );
              }
            else if (j.request.subtype === "mcp_clear_auth") {
              let { serverName: serverName } = j.request,
                Re = Pa(serverName) ?? Cn.find((gt) => gt.name === serverName)?.config ?? null,
                be =
                  w().mcp.clients.find((client) => client.name === serverName)?.config ??
                  dynamicMcpState.clients.find((client) => client.name === serverName)?.config,
                we = Re ?? be ?? null,
                Je = (gt) =>
                  require("./chunk-7t2akjbm.js").revokeStoredMcpTokens(serverName, be ? [gt, be] : [gt]),
                it = (gt) => {
                  if (gt.cleared) sendControlResponseSuccess(j, {});
                  else
                    yt(j, signOutFailureMessage(sanitizeTelemetryString(serverName), gt.reason, "try again"));
                };
              if (!we) yt(j, `Server not found: ${sanitizeTelemetryString(serverName)}`);
              else if (we.type !== "sse" && we.type !== "http")
                yt(j, `Cannot clear auth for server type "${we.type}"`);
              else if (!Re || isMcpDialBlockedByPolicy(serverName, we) || isMcpServerDisabled(serverName)) {
                let gt = await Je(we),
                  Ft =
                    w().mcp.clients.find((client) => client.name === serverName) ??
                    dynamicMcpState.clients.find((client) => client.name === serverName);
                if (Ft && Ft.type !== "disabled") {
                  if ((await getMcpClientModule().clearServerCache(serverName, Ft.config), IM()))
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
                          ? { name: serverName, type: "disabled", config: Ft.config }
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
                let Ft = await Ol(serverName, we, { distrust: !0 });
                (Kd(serverName, Ft), it(gt));
              }
            } else if (j.request.subtype === "apply_flag_settings") {
              let le = mu(j.request_id),
                Re = validateApplyFlagSettings(j.request.settings);
              if (!Re.ok) {
                yt(j, Re.error);
                continue;
              }
              let settings = Re.settings,
                we = async (gt, Ft, en = "") => {
                  let yn = gt.fastMode === !0 && (getFlagSettingsInline()?.fastMode !== !0 || "model" in gt),
                    prefix = getActiveAgentsFromList(lo),
                    Wn = (prev) => {
                      let Qr =
                        prev.trim().toLowerCase() !== "default" &&
                        !isExemptDefaultResolvingPick(prev) &&
                        !(isModelAllowedUnderActiveEnforcement(prev) ?? isModelAllowed(prev));
                      return { blocked: Qr, stepDown: Qr ? stepDownRestrictedFamilyAliasPick(prev) : null };
                    },
                    hn,
                    jt,
                    $t = () => {
                      let fr = w();
                      return {
                        mainLoopModel: fr.mainLoopModel ?? userSpecifiedModel ?? getMainLoopModel(),
                        mainLoopModelForSession: fr.mainLoopModelForSession,
                        toolPermissionContext: fr.toolPermissionContext,
                      };
                    };
                  if (("model" in gt || "agent" in gt) && WZ(e)) {
                    let fr = [];
                    if ("model" in gt) {
                      let yo = gt.model == null ? null : String(gt.model),
                        fo = yo === null ? null : Wn(yo);
                      if (yo !== null && fo !== null) jt = { raw: yo, verdict: fo };
                      if (!(fo?.blocked && fo.stepDown === null))
                        fr.push(
                          yo === null || yo.trim().toLowerCase() === "default" ? null : (fo?.stepDown ?? yo),
                        );
                    }
                    if ("agent" in gt) {
                      let yo = resolveTurnAgent(gt.agent, prefix);
                      hn = new Set();
                      for (let fo of [yo.now, yo.later])
                        if (fo !== void 0) {
                          if ((hn.add(fo), !fr.includes(fo))) fr.push(fo);
                        }
                    }
                    let Qr;
                    for (let yo of fr) {
                      let fo;
                      try {
                        fo = await runPreModelSwitchHooks(e, $t, yo, "sdk");
                      } catch (error) {
                        (logError(toError(error)), (Qr = "apply_flag_settings failed"));
                        break;
                      }
                      if (fo.decision !== "proceed") {
                        (logFeatureSad("model_switch", "blocked_by_hook"),
                          (Qr = describeModelSwitchBlocked(fo)));
                        break;
                      }
                      for (let message of fo.messages) qd(Nf(message));
                    }
                    if (Qr !== void 0) return (yt(j, Qr + en), !1);
                  }
                  let un = gt,
                    Ht = null;
                  if (hasCloudPluginsKey(gt)) {
                    Ht = await splitCloudPluginsPatch({
                      settings: gt,
                      admission: x.pluginForwardingAdmission,
                      readFlag: isCloudPluginForwardingFlagOn,
                      flagWaitCapMs: PLUGIN_INSTALL_WAIT_MS,
                      now: () => performance.now(),
                    });
                    let { verdict: verdict, alone: alone, merge: merge } = Ht;
                    if (!verdict.apply) {
                      if (
                        (logForDiagnosticsNoPII("info", "plugin_forwarding_patch_refused", {
                          reason: verdict.reason,
                          alone: alone,
                        }),
                        verdict.reason === "flag_off")
                      )
                        pw("patch");
                      if (alone) return (yt(j, `${PLUGIN_FORWARDING_DISABLED}: ${verdict.reason}`), !1);
                    }
                    un = merge;
                  }
                  let cn = getMainLoopModel(),
                    Kn = userSpecifiedModel;
                  if ("agent" in un) {
                    let fr = resolveTurnAgent(un.agent, prefix),
                      now = fr.now,
                      yo = hn;
                    if (yo !== void 0 && [fr.now, fr.later].some((_d) => _d !== void 0 && !yo.has(_d)))
                      return (
                        yt(
                          j,
                          `agent switch not applied: the session's model changed while PreModelSwitch hooks ran; send the request again${en}`,
                        ),
                        !1
                      );
                    let fo = $t(),
                      Mi = applyRequestedAgent({
                        requestedAgent: un.agent,
                        agents: prefix,
                        systemPrompt: x.systemPrompt,
                        preAgentSystemPrompt: gw,
                      });
                    if (!Mi.ok) return (yt(j, Mi.error), !1);
                    if (now !== void 0) zE(e, fo, now, "sdk");
                    if (!x.systemPrompt) td = !1;
                    ((x.systemPrompt = Mi.systemPrompt),
                      (gw = Mi.preAgentSystemPrompt),
                      noteSystemPromptSectionInvalidation("agent_switch"));
                    let Lc = Mi.agentDefinition?.agentType;
                    P((_d) => (_d.agent === Lc ? _d : { ..._d, agent: Lc }));
                  }
                  if (
                    (applyFlagSettings(
                      un,
                      () =>
                        isFastModeEnabled() &&
                        Qwi({ settings: getInitialSettings_2(), fastMode: w().fastMode }),
                    ),
                    Ht !== null)
                  ) {
                    if (Ht.verdict.apply) fw.applied(Ht.verdict.settings);
                    if (!Ht.alone) logMixedCloudPluginsPatch(Ht);
                  }
                  let dr =
                      "model" in un && un.model != null
                        ? jt?.raw === String(un.model)
                          ? jt.verdict
                          : Wn(String(un.model))
                        : { blocked: !1, stepDown: null },
                    { blocked: blocked, stepDown: stepDown } = dr,
                    Tr = "model" in un && isDefaultModelRefusedByPolicy(un.model),
                    co = (blocked && stepDown === null) || Tr,
                    Kr =
                      "model" in un && un.model != null
                        ? (stepDown ??
                          (String(un.model).trim().toLowerCase() === "default"
                            ? getDefaultMainLoopModel()
                            : String(un.model)))
                        : null;
                  if ("model" in un && !co) {
                    (zE(
                      e,
                      $t(),
                      stepDown ??
                        (un.model == null || String(un.model).trim().toLowerCase() === "default"
                          ? null
                          : String(un.model)),
                      "sdk",
                    ),
                      setMainLoopModelOverride(Kr));
                    let fr = Kr ?? getMainLoopModel();
                    P((Qr) =>
                      Qr.mainLoopModelForSession === fr ? Qr : { ...Qr, mainLoopModelForSession: fr },
                    );
                  }
                  let ko = "model" in un && !co && un.model != null && Kr != null ? Kr : void 0,
                    prevModel = getMainLoopModel(),
                    ss = isWindowDivergentWrite({
                      writtenModel: ko,
                      prevModel: cn,
                      newModel: prevModel,
                      prevActive: Kn,
                    }),
                    Go = createModelSwitchBreadcrumbs(un, userSpecifiedModel, prevModel);
                  if (Go !== void 0) userSpecifiedModel = Go;
                  if (prevModel !== cn || ss) {
                    let fr = ko !== void 0 ? ko : prevModel,
                      Qr = ss && ko !== void 0 ? ko : prevModel;
                    ((userSpecifiedModel = Qr), P((fo) => ({ ...fo, mainLoopModelForSession: fr })));
                    let yo =
                      un.model && !co ? String(un.model) : "model" in un && !co ? "default" : prevModel;
                    if (
                      (n.sessionState.notifyMetadataChanged({ model: prevModel }),
                      modelChangeNeedsNewContext({
                        appliedModel: Qr,
                        previousModel: Kn ?? cn,
                        conversationModel: conversationModel(cn),
                      }))
                    )
                      injectModelSwitchBreadcrumbs(yo, prevModel);
                  }
                  if ("model" in un)
                    noticeFlagSettingsModel({
                      defaultPickRefused: Tr,
                      model: un.model == null ? null : String(un.model),
                      rejected: co,
                      stepDown: stepDown,
                      effectiveModel: () => Ao(),
                    });
                  if (
                    applyFlagSettingsSideEffects(un, {
                      getEngineState: w,
                      setEngineState: P,
                      reportEffortMetadata: (fr) =>
                        n.sessionState.notifyMetadataChanged({ effort_level: fr }),
                      model: getMainLoopModel(),
                    })
                  )
                    n.sessionState.notifyMetadataChanged({ effort_request_id: toBoundedLabel(j.request_id) });
                  if (yn && isMainModelFastRejected(getMainLoopModel())) clearFastRejectedFallbackModels();
                  if ((await mc(le), Ft)) sendControlResponseSuccess(j);
                  return !0;
                },
                Je = sN.of(e).pending > 0;
              if (!(
                (("model" in settings || "agent" in settings) && (WZ(e) || Je)) ||
                ("fastMode" in settings && Je)
              ))
                await we(settings, !0);
              else {
                if (
                  typeof settings.agent === "string" &&
                  settings.agent !== "" &&
                  !findAgentExcludingWebFetch(getActiveAgentsFromList(lo), settings.agent)
                ) {
                  yt(j, `Agent "${String(settings.agent)}" not found`);
                  continue;
                }
                let { model: model, agent: agent, fastMode: fastMode, ...yn } = settings,
                  Et =
                    "agent" in settings &&
                    ((Ht) => Ht.now !== void 0 || Ht.later !== void 0)(
                      resolveTurnAgent(agent, getActiveAgentsFromList(lo)),
                    ),
                  Wn = "fastMode" in settings && ("model" in settings || Et || Je),
                  hn = {
                    ...("model" in settings && { model: model }),
                    ...(Et && { agent: agent }),
                    ...(Wn && { fastMode: fastMode }),
                  },
                  jt = {
                    ...yn,
                    ...("agent" in settings && !Et && { agent: agent }),
                    ...("fastMode" in settings && !Wn && { fastMode: fastMode }),
                  },
                  keys = Object.keys(jt);
                if (keys.length > 0 && !(await we(jt, !1))) continue;
                if (Object.keys(hn).length === 0) {
                  sendControlResponseSuccess(j);
                  continue;
                }
                let un =
                  keys.length > 0
                    ? ` (the request's other settings were applied: ${keys.map(Nf).join(", ")})`
                    : "";
                Qn(() =>
                  serializeModelSwitch(e, async () => {
                    try {
                      await we(hn, !0, un);
                    } catch (error) {
                      (logError(toError(error)), yt(j, `apply_flag_settings failed${un}`));
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
                let Re = w(),
                  newModel = getMainLoopModel(),
                  we = modelSupportsEffort(newModel)
                    ? resolveEffortValue(newModel, resolveEffortLevel(Re))
                    : void 0,
                  Je = resolveEffortLevel(Re, void 0, { withHold: !1 }),
                  it = resolveEffortValue(newModel, Je, { carriedEffort: null }),
                  currentAppState = getEffortEnvOverride(),
                  model = getSettingsWithSources_2(),
                  mapped = getSettingsWithErrors_2()
                    .errors.filter((error) => error.severity !== "warning")
                    .map((Et) => ({ file: Et.file, path: Et.path, message: Et.message })),
                  yn = getRemoteControlPolicyLockReason();
                sendControlResponseSuccess(j, {
                  ...model,
                  remote_control_policy_lock_reason: yn ?? void 0,
                  applied: {
                    model: newModel,
                    effort: typeof we === "string" ? we : null,
                    ...(alwaysFalse() !== !1 && {
                      effortAuto:
                        modelSupportsEffort(newModel) &&
                        (currentAppState === null || (currentAppState === void 0 && Je === void 0)) &&
                        we === it,
                    }),
                    advisor: resolveAdvisorModel(Re.advisorModel, newModel) ?? null,
                    ultracode: isUltracodeActive(Re.ultracode, newModel),
                    ultracodeRequested: Re.ultracode === !0,
                    ultracodeAvailable: isUltracodeAvailable(newModel),
                    ultrathinkAvailable: isUltrathinkEffective(newModel, resolveEffortLevel(Re)),
                  },
                  errors: mapped.length > 0 ? mapped : void 0,
                });
              };
              if (
                getRemoteControlPolicyLockReason() !== null &&
                !isPolicyLimitsCacheLoaded() &&
                !isRemoteControlHardDisabled()
              )
                Qn(async () => {
                  (await Promise.race([ensurePolicyLimitsLoadedForDiagnostic(), waitForPolicyLimitsToLoad()]),
                    le());
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
              let source = j.request.source,
                Re = validateUpdateSettings(
                  n.isRemoteTransport(),
                  source === "userSettings"
                    ? isSettingSourceEnabled("userSettings")
                    : isSettingSourceEnabled("localSettings"),
                  source,
                  j.request.settings,
                  alwaysFalse() !== !1,
                );
              if (Re !== null) {
                yt(j, Re);
                continue;
              }
              if (source === "userSettings") {
                let we = String(j.request.settings.effortLevel),
                  Je = we === "auto" ? void 0 : parseEffortLevel(we);
                if (Je === void 0 && we !== "auto") {
                  yt(j, EFFORT_LEVEL_ERROR);
                  continue;
                }
                let it = await persistEffortSetting(Je, getMainLoopModel(), !0, x.storageV5);
                if (it) {
                  yt(j, it.message);
                  continue;
                }
                if (we === "auto")
                  logEvent("tengu_effort_command", {
                    effort: lit("auto"),
                    from_level: fromEnumOpt(
                      getEffortLevelIfSupported(getMainLoopModel(), resolveEffortLevel(w())),
                    ),
                    route: lit("slider"),
                    is_remote: !1,
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
              let { buildPermissionRulesWireState: buildPermissionRulesWireState } =
                await import("./chunk-eecdvv5g.js");
              sendControlResponseSuccess(j, {
                state: buildPermissionRulesWireState({
                  context: w().toolPermissionContext,
                  originalCwd: xo(e).originalCwd,
                  readSettingsWithSources: getSettingsWithSources_2,
                  readSettingsErrors: getSettingsWithErrors_2,
                }),
              });
            } else if (j.request.subtype === "submit_feedback") {
              let {
                description: description,
                surface: surface,
                draft_id: draft_id,
                type: type,
                title: title,
                area: area,
                attach_transcript: attach_transcript,
                save_locally: save_locally,
              } = j.request;
              Io(async () => {
                try {
                  if (draft_id == null && save_locally === !0) {
                    sendControlResponseSuccess(
                      j,
                      await submitHeadlessFeedback({
                        messages: Ct,
                        description: description,
                        surface: surface ?? "sdk",
                        storageV5: x.storageV5,
                        host: e.host,
                      }),
                    );
                    return;
                  }
                  let en = feedbackUnavailableReason();
                  if (en) {
                    sendControlResponseSuccess(j, { feedback_id: null, unavailable_reason: en });
                    return;
                  }
                  if (draft_id != null) {
                    let { submitDraftFromRequest: submitDraftFromRequest } =
                      await import("./chunk-4mbryacy.js");
                    sendControlResponseSuccess(
                      j,
                      await submitDraftFromRequest({
                        draftId: draft_id,
                        description: description,
                        type: type,
                        title: title,
                        area: area,
                        attachTranscript: attach_transcript,
                        surface: surface,
                        messages: Ct,
                        storageV5: x.storageV5,
                        host: e.host,
                        credentials: x.credentials,
                      }),
                    );
                    return;
                  }
                  let yn = await postFeedbackSubmission({
                    messages: Ct,
                    description: description,
                    surface: surface ?? "sdk",
                    storageV5: x.storageV5,
                    host: e.host,
                    credentials: x.credentials,
                  });
                  if (yn.success) {
                    let Et;
                    sendControlResponseSuccess(j, { feedback_id: yn.feedbackId, ccshare_url: Et });
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
              let { subtype: subtype, ...Re } = j.request;
              Io(async () => {
                try {
                  let { submitSurveyFeedbackForSdk: submitSurveyFeedbackForSdk } =
                    await import("./chunk-25hrjv6b.js");
                  sendControlResponseSuccess(
                    j,
                    await submitSurveyFeedbackForSdk({
                      request: Re,
                      messages: Ct,
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
                (logForDebugging(
                  `side_question: duplicate delivery joins the run in flight (request_id ${sanitizeTelemetryString(j.request_id)})`,
                ),
                  Qn(() => le.then(() => n.controlRequestEnded(j.request_id))));
                continue;
              }
              if (isShuttingDown()) {
                yt(j, "Session is shutting down");
                continue;
              }
              let { question: question, history: history } = j.request,
                we = createChildAbortController(ha);
              handledOrphanedToolUseIds.set(j.request_id, we);
              let withResolvers = Promise.withResolvers();
              Wi.set(j.request_id, withResolvers.promise);
              let it = !1;
              Qn(async () => {
                try {
                  let gt = runSideQuestionWithProgress({
                      question: question,
                      history: history,
                      parentController: we,
                      onProgress: (yn) => {
                        if (!it && !isTerminalShutdown()) bL(j, yn);
                      },
                      getLiveMessages: () => Ct,
                      isTurnInProgress: () => ze.running,
                      buildFallbackParams: () =>
                        buildSideQuestionFallbackParams({
                          session: e,
                          turnInProgress: ze.running,
                          messageQueue: messageQueue,
                          tools: Gd(w()),
                          toolCatalog: TOOL_CATALOG,
                          commands: Ho(),
                          mcpClients: [...w().mcp.clients, ...Cn, ...dynamicMcpState.clients],
                          messages: Ct,
                          readFileState: fs,
                          toolState: Po,
                          sessionHooks: ps,
                          getAppState: w,
                          setAppState: P,
                          customSystemPrompt: hg(),
                          appendSystemPrompt: x.appendSystemPrompt,
                          excludeDynamicSections: x.excludeDynamicSections,
                          thinkingConfig: hasEffort.current(),
                          agents: getActiveAgentsFromList(lo),
                          runQuery: query,
                          storageV5: x.storageV5,
                          credentials: x.credentials,
                        }),
                    }),
                    en = await withTimeout(
                      gt,
                      SIDE_QUESTION_TIMEOUT_MS,
                      SIDE_QUESTION_TIMEOUT_MESSAGE,
                    ).finally(() => (sigintHandler() ? heldUntilExit() : void 0));
                  if (en.cancelled)
                    (logEvent("tengu_sdk_side_question_cancelled", {}), yt(j, "Side question cancelled"));
                  else if (isTransportBacked(e)) {
                    if (en.response.synthetic && en.response.response)
                      Ws("side_question", en.response.response);
                    sendControlResponseSuccess(j, markSyntheticControlResponse(en.response));
                  } else sendControlResponseSuccess(j, en.response);
                } catch (error) {
                  if (errorMessage(error) === SIDE_QUESTION_TIMEOUT_MESSAGE)
                    (logForDebugging(
                      `side_question: no answer by the deadline, giving the run up (request_id ${sanitizeTelemetryString(j.request_id)})`,
                      { level: "error" },
                    ),
                      we.abort(userAbortReason("shutdown")),
                      yt(j, SIDE_QUESTION_TIMEOUT_MESSAGE));
                  else Xn(j, "side_question", error);
                } finally {
                  if (((it = !0), handledOrphanedToolUseIds.get(j.request_id) === we))
                    handledOrphanedToolUseIds.delete(j.request_id);
                  (Wi.delete(j.request_id), withResolvers.resolve());
                }
              });
            } else if (j.request.subtype === "ultrareview_launch") {
              let { args: args = "", confirm: confirm = !1 } = j.request;
              Io(async () => {
                try {
                  let { runUltrareviewHeadless: runUltrareviewHeadless } =
                      await import("./chunk-vvrhw27g.js"),
                    we = await runUltrareviewHeadless(args, {
                      confirm: confirm,
                      confirmsBeforeLaunch: !0,
                      overageConfirmed: w().ultrareviewOverageConfirmed,
                      markOverageConfirmed: () => KMr(P),
                      context: {
                        abortController: createAbortController(),
                        taskRegistry: createTaskFramework(w, P),
                        storageV5: x.storageV5,
                        credentials: x.credentials,
                      },
                    }),
                    Je = buildUltrareviewMessages(args, we);
                  Gs(Je);
                  for (let it of Je)
                    output.enqueue({
                      type: "user",
                      message: it.message,
                      session_id: getSessionId(),
                      parent_tool_use_id: null,
                      uuid: it.uuid,
                      timestamp: it.timestamp,
                      isReplay: !0,
                      isSynthetic: it.isMeta,
                    });
                  sendControlResponseSuccess(j, we);
                } catch (error) {
                  Xn(j, "ultrareview_launch", error);
                }
              });
            } else if (j.request.subtype === "message_rated") {
              let safeParse = SDKMessageRatedMessageRatedMessageSchema().safeParse(j.request);
              if (!safeParse.success) {
                yt(
                  j,
                  'message_rated: messageUuid must be a string, sentiment "positive" or "negative", surface "tool_use" or "assistant_text", and cleared a boolean',
                );
                continue;
              }
              if (isPolicyAllowed("allow_product_feedback")) {
                let {
                  messageUuid: messageUuid,
                  sentiment: sentiment,
                  surface: surface = "tool_use",
                  cleared: cleared = !1,
                } = safeParse.data;
                logEvent("tengu_message_rated", {
                  message_uuid: ye(messageUuid),
                  sentiment: fromEnum(sentiment),
                  surface: fromEnum(surface),
                  cleared: cleared,
                });
              }
              sendControlResponseSuccess(j, {});
            } else if (j.request.subtype === "remote_control") {
              let req = j.request,
                Re = Vi(async () => {
                  let be;
                  try {
                    if (req.enabled && n.isRemoteTransport())
                      yt(j, "Remote Control cannot be enabled from inside a remote session");
                    else if (req.enabled) {
                      if (vn && (ts || isTeleportedSession(vn.bridgeSessionId))) {
                        let we = vn;
                        (So.release(we, { keepRecord: !0 }),
                          n.setOnControlRequestSent(void 0),
                          n.setOnControlRequestResolved(void 0),
                          setSdkHostedBridgeHandle(null, x.storageV5),
                          setCurrentForKey(e, void 0),
                          registerLiveSuppressionProbe(void 0),
                          (vn = null),
                          (ts = !1),
                          (vu = void 0),
                          (bu = void 0),
                          setReplBridgeActive(!1));
                        try {
                          zr?.undo().catch(logError);
                        } catch (error) {
                          logError(error);
                        }
                        await we.teardown();
                      }
                      if (vn) sendControlResponseSuccess(j, Pl(vn, Ka));
                      else {
                        let we,
                          Je,
                          it,
                          gt = !1,
                          sliced = Ct.slice();
                        ((be = sliced.length > 0 ? sliced : void 0), (Ms = be));
                        let en = new Set(),
                          armForEnable = So.armForEnable(en);
                        if (typeof req.work_secret === "string" && req.work_secret && !zr) _s = null;
                        So.setLoginIdentity(
                          await readFreshOauthAccountFromDisk(x.storageV5).catch(() => {
                            return;
                          }),
                        );
                        let {
                            initReplBridge: initReplBridge,
                            HEADLESS_BRIDGE_WORKSPACE_DIFF_COMPUTE_BUDGET:
                              HEADLESS_BRIDGE_WORKSPACE_DIFF_COMPUTE_BUDGET,
                          } = await import("./chunk-cg2r2hy6.js"),
                          hn =
                            typeof req.work_secret === "string" && req.work_secret ? req.work_secret : void 0;
                        if (hn && !zr) {
                          let { createHeadlessWorkSecretSession: createHeadlessWorkSecretSession } =
                            await import("./chunk-h3xe040t.js");
                          if (
                            ((zr ??= createHeadlessWorkSecretSession({
                              stores: rr,
                              storageV5: x.storageV5,
                              credentials: x.credentials,
                              getAppendSystemPrompt: () => x.appendSystemPrompt,
                              setAppendSystemPrompt: (cn) => {
                                x.appendSystemPrompt = cn;
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
                                get: () => w().toolPermissionContext,
                                set: (cn) =>
                                  P((Kn) => ({ ...Kn, toolPermissionContext: cn(Kn.toolPermissionContext) })),
                              },
                              settleAutoModeAvailability: Ta,
                              applyModelPick: fu,
                              applyEffortSeed: _u,
                            })),
                            _s)
                          )
                            zr.noteModeChoice(_s);
                          _s = void 0;
                        }
                        let armedConversationRotated = So.armedConversationRotated();
                        if (armedConversationRotated)
                          we =
                            "The conversation was cleared while Remote Control was being enabled; send the request again";
                        let $t = armedConversationRotated
                          ? null
                          : await initReplBridge({
                              recordAtEnable: armForEnable,
                              recordWriterHonorsServerVouch: !0,
                              reportGateRefusalReason: !0,
                              onProjectsBindingHint: () => {
                                zr?.resyncProjectsReplyMount();
                              },
                              onDialogKindsDeclared(Ht, cn) {
                                logBridgeDialogKindsDeclared(en, Ht, cn, () => {
                                  if (vn) So.persist(vn);
                                });
                              },
                              tags: [REMOTE_CONTROL_SDK],
                              skipAutoTitle: isTerminalTitleSuppressed(),
                              remoteControlOrigin: "sdk",
                              getBackfillMessages: () =>
                                Ct.filter(
                                  (Ht) =>
                                    !(isCompactBoundaryOrSummary(Ht) && isCompactPairWithheldFromRemote()),
                                ),
                              getMessages: () => Ct,
                              isTurnActive: () => ze.running,
                              onGetContextUsage: vg,
                              enableSessionPersistence:
                                isPersistentRemoteSessionEnabled() || isRemoteControlInternalEventsEnabled(),
                              storageV5: x.storageV5,
                              credentials: x.credentials,
                              onTransportRebuilt: forwardRateLimitToBridge,
                              getTools: () => Gd(w()),
                              getToolPermissionContext: () => w().toolPermissionContext,
                              host: e.host,
                              workspaceDiffComputeBudget: HEADLESS_BRIDGE_WORKSPACE_DIFF_COMPUTE_BUDGET,
                              getInitializeState: () => ({
                                current_model: getMainLoopModel(),
                                current_permission_mode: toExternalPermissionMode(
                                  w().toolPermissionContext.mode,
                                ),
                              }),
                              getCommands: () => logBridgeInitializeCommands(cg()),
                              onClientInitialize: () => {
                                (na("client_initialize", { force: !0 }), Ga());
                              },
                              onQueuedNotification(Ht) {
                                acceptQueuedNotification(Ht, { getAppState: w, setAppState: P, session: e });
                              },
                              async onInboundMessage(Ht) {
                                let startTime = performance.now(),
                                  Kn = resolved,
                                  dr;
                                resolved = new Promise((qt) => {
                                  dr = qt;
                                });
                                try {
                                  let fields = extractInboundMetadata(Ht);
                                  if (!fields) return;
                                  let { uuid: uuid } = fields;
                                  recordRemoteSurfaceSeen(fields.clientPlatform, x.storageV5);
                                  let Tr =
                                      hn !== void 0 && nEn(fields.inboundOrigin)
                                        ? await classifyInboundLane(Ht, fields)
                                        : void 0,
                                    co = Tr
                                      ? Tr.ingressOrigin
                                      : classifyInboundOrigin(
                                          fields.content,
                                          fields.clientPlatform,
                                          fields.inboundOrigin,
                                          fields.receiverGroupingId,
                                          fields.slackOrigin,
                                          fields.activityObservation,
                                          fields.fromPlugin,
                                        ),
                                    Kr = refineInboundOrigin(co, fields.clientPlatform, fields.inboundOrigin);
                                  using beginInboundIngest = messageQueue.beginInboundIngest(
                                    isPeerOrSlackPing(co) ? void 0 : uuid,
                                  );
                                  (await Kn, await sN.of(e).tail);
                                  let Er = getInboundRefuseCause(co);
                                  if (Er !== void 0) {
                                    (logInboundRefused(
                                      "bridge:onInboundMessage: dropped before attachment materialization",
                                      Er,
                                    ),
                                      reportCommandRefused(n, uuid, "bridge"));
                                    return;
                                  }
                                  let ss = extractInboundAttachments(Ht),
                                    content = fields.content;
                                  content = escapePluginTags(content, fields.inboundOrigin);
                                  let Eu = resolveInboxWakeFor(
                                      content,
                                      fields.inboundOrigin,
                                      fields.wakeEnvelope,
                                    ),
                                    fr = promptOriginKind(fields.content);
                                  if (!isPeerOrSlackPing(co))
                                    content = buildExternalEventRecord(
                                      content,
                                      fields.pastedContent,
                                      fields.inlinePastes,
                                    );
                                  let Qr = await dispatchSessionReceiveHooks({
                                    origin: originFromBridgeMetadata(co ?? Kr),
                                    content: content,
                                    event: Eu,
                                  });
                                  if (Qr.consumed !== void 0) {
                                    reportCommandRefused(n, uuid, "bridge");
                                    return;
                                  }
                                  content = Qr.content;
                                  using queueing = Qr.queueing;
                                  let fo = Tr?.isSynthetic === !0 && !isProjectsRelay(Kr),
                                    Mi = await resolveAndPrepend(
                                      Ht,
                                      content,
                                      Tr
                                        ? !Tr.isSynthetic && co?.kind === "human"
                                        : qsr(co, fields.clientPlatform, fields.inboundOrigin),
                                      x.storageV5,
                                      x.credentials,
                                    ),
                                    {
                                      content: content_2,
                                      inlinedImagePaths: inlinedImagePaths,
                                      missingFiles: missingFiles,
                                    } = Mi,
                                    pb = GRn(uuid, {
                                      isCrossSession: isGatedInbound({
                                        ingressOrigin: co,
                                        inboundOrigin: fields.inboundOrigin,
                                        envelopePeer: hasTeammateMessageEnvelope(fields.content),
                                      }),
                                    }),
                                    LL = {
                                      value: content_2,
                                      ...(fr !== void 0 && { foreignWord: fr }),
                                      mode: "prompt",
                                      agentId: mainAgentId(),
                                      uuid: uuid,
                                      receivedAtMs: startTime,
                                      ...(pb && { turnAttributionKey: pb }),
                                      skipSlashCommands: !0,
                                      ...(inlinedImagePaths.length > 0 && {
                                        inlinedImagePaths: inlinedImagePaths,
                                      }),
                                      ...(ss.length > 0 && { fileAttachments: ss }),
                                      ...(co?.kind === "peer"
                                        ? {
                                            origin: SQ(co, content_2, fields.content),
                                            isMeta: !0,
                                            skipAttachments: !0,
                                            ...(den(messageQueue) && { priority: "later" }),
                                          }
                                        : {
                                            bridgeOrigin: !0,
                                            clientPlatform: fields.clientPlatform,
                                            ...(Kr && !fo && { origin: Kr }),
                                            ...textNotTypedFlags(Ht, Mi),
                                            ...(Kr !== void 0 &&
                                              !isHumanOrAutoContinuation(Kr) && { skipAttachments: !0 }),
                                            ...(Kr?.kind === "task-notification" &&
                                              adjustInboundPriority(void 0, fields.clientPlatform) ===
                                                "later" && { priority: "later" }),
                                            ...(awe(fields.clientPlatform, fields.inboundOrigin) && {
                                              priority: resolveQueuePriority(
                                                void 0,
                                                fields.content,
                                                $Lt(messageQueue),
                                              ),
                                              verifiedSlackHumanTurn: !0,
                                            }),
                                            ...(Tr && {
                                              ...Tr.stamps,
                                              ...(Tr.isSynthetic && { isMeta: !0, skipAttachments: !0 }),
                                              ...(Tr.isRelayHuman && {
                                                priority: resolveQueuePriority(
                                                  void 0,
                                                  fields.content,
                                                  $Lt(messageQueue),
                                                ),
                                              }),
                                              ...(shouldStampThreadState({
                                                carrier: {
                                                  origin: Kr,
                                                  hearthRelayRows: Tr.stamps.hearthRelayRows,
                                                },
                                                isPeer: !1,
                                              }) && { stampThreadState: !0 }),
                                            }),
                                          }),
                                    },
                                    mh = markOwnWord(LL, !0);
                                  of_3.mark(mh, "bridge");
                                  let gb = gateInboundByOrigin(co, mh);
                                  if (gb !== "accept") {
                                    if (gb === "refused") reportCommandRefused(n, uuid, "bridge");
                                    return;
                                  }
                                  if (beginInboundIngest.withdrawn()) {
                                    let gh = bridgeMessageUuid(uuid, "bridge");
                                    if (gh !== void 0) n.onCommandLifecycle?.(gh, "cancelled");
                                    return;
                                  }
                                  if ((messageQueue.enqueue(mh), Qs))
                                    Qs.sessionInboxPointers
                                      .of(e)
                                      .noteQueued({
                                        inboundOrigin: fields.inboundOrigin,
                                        wake: Eu,
                                        uuid: uuid,
                                      });
                                  queueing.queued();
                                  let ph = bridgeMessageUuid(uuid, "bridge");
                                  if (ph !== void 0) n.onCommandLifecycle?.(ph, "queued");
                                  if (
                                    (logBridgeAttachmentsMissing(ph, ss.length, missingFiles),
                                    !ze.inputClosed)
                                  )
                                    Os();
                                } catch (error) {
                                  logForDebugging(`[bridge:sdk] onInboundMessage failed: ${error}`, {
                                    level: "error",
                                  });
                                } finally {
                                  Kn.then(dr, dr);
                                }
                              },
                              onPermissionResponse(Ht) {
                                return n.injectRemoteControlResponse(Ht);
                              },
                              onInterrupt() {
                                if (!isTerminalShutdown())
                                  try {
                                    (ze.abortController?.abort(userAbortReason("remote-cancel")),
                                      MODEL_SWITCH_STATE(),
                                      teardownAutoReactAndRooms({
                                        taskRegistry: createTaskFramework(w, P),
                                        setAppState: P,
                                        storageV5: x.storageV5,
                                      }),
                                      wf());
                                  } catch (error) {
                                    (logError(error),
                                      logFeatureBad("per_task_stop_sparing", "bridge_interrupt_sweep_throw"));
                                  }
                              },
                              onStopTask: (request) =>
                                stopTaskByUser(request, {
                                  taskRegistry: createTaskFramework(w, P),
                                  setAppState: P,
                                  session: e,
                                  getAppState: w,
                                  source: "client",
                                  storageV5: x.storageV5,
                                }),
                              onBackgroundTasks(Ht) {
                                let cn = createTaskFramework(w, P);
                                if (Ht !== void 0) return backgroundTaskByToolUseId(Ht, cn);
                                return (backgroundAll(cn), !0);
                              },
                              onCancelAsyncMessage: (requestId) =>
                                cancelQueuedThreadMessage({
                                  targetUuid: requestId,
                                  sender: "remote_client",
                                  messageQueue: messageQueue,
                                  prewaitLatch: Ro,
                                  io: n,
                                }),
                              onSetModel: fu,
                              onSetMaxThinkingTokens: (Ht, cn) => applyThinkingBudget(hasEffort, Ht, cn),
                              onSetPermissionMode: (Ht) => {
                                let cn = setPermissionModeWithGuards(Ht, w().toolPermissionContext, (Kn) =>
                                  P((dr) => ({ ...dr, toolPermissionContext: Kn(dr.toolPermissionContext) })),
                                );
                                if (cn.ok) is(cn.mode);
                                return cn;
                              },
                              onApplyFlagSettings: (Ht, cn) => {
                                let Kn = getMainLoopModel(),
                                  dr = M_e(Kn, resolveEffortLevel(w())),
                                  qt = applyBridgeFlagSettings(Ht, {
                                    model: Kn,
                                    getAppState: w,
                                    setAppState: P,
                                  });
                                if (!qt.ok) return qt;
                                let xt = M_e(Kn, resolveEffortLevel(w()));
                                return (
                                  reportEffortForModel(Kn, w()),
                                  w6n(cn),
                                  na("state_change", { force: xt === dr }),
                                  { ok: !0 }
                                );
                              },
                              onStateChange(Ht, cn, Kn) {
                                if (Ht === "connected" && be !== void 0 && Ms === be) Ms = void 0;
                                if (Ht === "policy_disabled")
                                  ((we = cn), (Je = "remote_control_policy_disabled"));
                                else if (Ht === "failed") {
                                  if (
                                    ((we = cn),
                                    (Je =
                                      Kn === void 0 || policyDenyKind("allow_remote_control") === "cache_miss"
                                        ? void 0
                                        : remoteControlErrorCode(Kn)),
                                    vn)
                                  ) {
                                    ((ts = !0), setReplBridgeActive(!1));
                                    try {
                                      zr?.undo().catch(logError);
                                    } catch (err) {
                                      logError(err);
                                    }
                                  }
                                } else if (Ht === "connected" || Ht === "ready") {
                                  let dr = ts;
                                  if (((ts = !1), vn)) {
                                    if ((setReplBridgeActive(!0), Ht === "connected" && dr)) {
                                      if (
                                        (logBridgeRateLimitForward(vn),
                                        na("reconnected", { force: !0 }),
                                        Ga(),
                                        hn && zr)
                                      ) {
                                        let qt = vn;
                                        Promise.resolve()
                                          .then(() => {
                                            if (vn === qt && !ts) zr?.apply(hn, qt);
                                          })
                                          .catch(logError);
                                      }
                                    }
                                  }
                                  if (Ht === "connected" && gt) {
                                    if (((gt = !1), !ze.running)) vn?.sendResult();
                                  }
                                }
                                (logForDebugging(
                                  `[bridge:sdk] State change: ${Ht}${cn ? ` \u2014 ${cn}` : ""}`,
                                ),
                                  kw(Ht, cn, it, Kn));
                              },
                              initialMessages: be,
                              initialName: req.name,
                              reattachSessionId:
                                typeof req.reattach_session_id === "string"
                                  ? req.reattach_session_id
                                  : void 0,
                              neverArchive: req.keep_session_on_exit === !0,
                              workSecret: hn,
                              onWorkSecretRefresh: (Ht) => n.requestRemoteControlWorkSecret(Ht),
                            });
                        if (!$t && Ms === be) Ms = void 0;
                        let un = sliced.length;
                        if (!$t) {
                          if ((So.enableFailed(), we !== void 0)) Ws("remote_control", we);
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
                          ((vn = $t), (Si = new Set(sliced.map((cn) => cn.uuid))), (ts = !1), (it = ++Ka));
                          try {
                            if (hn && zr) zr.apply(hn, $t);
                            else zr?.undo().catch(logError);
                          } catch (error) {
                            logError(error);
                          }
                          (So.attached($t),
                            setReplBridgeActive(!0),
                            setSdkHostedBridgeHandle($t, x.storageV5),
                            setCurrentForKey(e, void 0),
                            registerLiveSuppressionProbe(
                              () => getSdkHostedBridgeHandle()?.noHistoryBackfill === !0,
                            ),
                            reportBridgePermissionMode(w().toolPermissionContext.mode),
                            setInboundAvailabilityPublisher(reportBridgeCrossSessionInbound));
                          let Ht = getMainLoopModel();
                          if (
                            (reportBridgeModel(Ht),
                            reportEffortForModel(Ht, w()),
                            buildBridgeInitializeCommands(Il),
                            aW(w().frameUrls),
                            sNn(),
                            (Ps = $t.noHistoryBackfill ? Math.max(un, Ps) : Math.min(un, Ps)),
                            Dd(),
                            Ct.length > un)
                          )
                            gt = !0;
                          n.setOnControlRequestSent((cn) => {
                            $t.sendControlRequest(cn);
                          });
                          for (let cn of [
                            ...n.getPendingPermissionRequests(),
                            ...n
                              .getPendingUserDialogRequests()
                              .filter(
                                ({ request: request }) =>
                                  request.subtype !== "request_user_dialog" ||
                                  request.dialog_kind !== ENUM_PROMPT,
                              ),
                          ])
                            $t.sendControlRequest(cn);
                          if (
                            (n.setOnControlRequestResolved((cn) => {
                              $t.sendControlCancelRequest(cn);
                            }),
                            emitBackgroundTasksChanged(w()),
                            logBridgeRateLimitForward($t),
                            na("attach", { force: !0 }),
                            Ga(),
                            sendControlResponseSuccess(j, Pl($t, it)),
                            !isLovelyUmbrellaOn())
                          )
                            vw();
                        }
                      }
                    } else (await Sw(), sendControlResponseSuccess(j));
                  } catch (error) {
                    if (Ms === be) Ms = void 0;
                    if (!vn) So.enableFailed();
                    Xn(j, "remote_control", error);
                  }
                });
              ((resolved_2 = Re), Qn(() => Re));
            } else if (
              j.request.subtype === "register_device_hooks" ||
              j.request.subtype === "upload_device_hook_template"
            ) {
              let le = x.deviceHooksAdmission ?? { admitted: !1, reason: "not_managed_cloud_worker" };
              if (!le.admitted)
                (logFeatureBad("device_hooks_register", le.reason),
                  yt(j, `hook_forwarding_disabled: ${le.reason}`));
              else {
                ah ??= import("./chunk-5ac1fnqf.js")
                  .then(async (Re) =>
                    Re.createDeviceHooksWorker(
                      await Re.productionDeviceHooksWorkerDeps({
                        projectRoot: getOriginalCwd,
                        cwd: getCwd,
                        workerEpoch: env.CLAUDE_CODE_WORKER_EPOCH,
                        sender: n,
                        toolAliases: () => x.toolAliases,
                      }),
                    ),
                  )
                  .catch((Re) => {
                    throw ((ah = void 0), Re);
                  });
                try {
                  let handle = await (await ah).handle(j);
                  if (handle.kind === "success") sendControlResponseSuccess(j, handle.response);
                  else yt(j, handle.error);
                } catch (error) {
                  (logForDiagnosticsNoPII("warn", "device_hooks_handler_failed", {}),
                    logError(error),
                    logFeatureBad("device_hooks_register", "internal_error"),
                    yt(j, "hook_forwarding_not_ready: internal_error; retry"));
                }
              }
            } else if (j.request.subtype === "remote_tools_announce")
              ((Qv ??= createRemoteToolsAnnounceHandler(
                x.remoteToolsAdmission ?? { admitted: !1, reason: "not_managed_cloud_worker" },
                {
                  workerEpoch: env.CLAUDE_CODE_WORKER_EPOCH,
                  toolState: Po,
                  sender: n,
                  mcpClients: () => w().mcp.clients,
                },
              )),
                await Qv(j.request, (le) => {
                  if (le.kind === "success") sendControlResponseSuccess(j, le.response);
                  else yt(j, le.error);
                }));
            else if (j.request.subtype === "turn_handoff") {
              let internalMsgs = pt(j);
              handleTurnHandoff(
                j.request,
                no,
                (Re) => sh(j, Re),
                rewindRequestAge(internalMsgs),
                serviceClockStoredAt(internalMsgs),
                dt.phasesBeforeRead(sessionStreamReceivedAtMs(j), startTime),
                uo,
                readDisallowedToolsMetadata(j),
              );
            } else yt(j, `${R7}: ${sanitizeTelemetryString(String(j.request.subtype))}`);
          } finally {
            if (uo && !To && j.request.subtype !== "mcp_tasks_changed")
              n.onCommandLifecycle?.(uo, "completed");
            let startTime_2 = performance.now(),
              rounded = Math.round(startTime_2 - startTime);
            if (
              (ze.turnStartClock.controlRequestEnded(startTime_2),
              dt.note("control", startTime, startTime_2),
              sa || rounded >= PRINT_TIMING_CONSTANTS)
            )
              logForDiagnosticsNoPII(sa ? "warn" : "info", "cli_control_request_handled", () => ({
                subtype: knownSubtypeOrUndefined(j.request.subtype),
                ms: rounded,
                detached: To,
                ...(Ba !== void 0 && { deadline_ms: Ba, timed_out: sa }),
              }));
          }
          continue;
        } else if (j.type === "control_response") {
          if (x.replayUserMessages) output.enqueue(j);
          continue;
        } else if (j.type === "control_cancel_request") {
          let Bn = handledOrphanedToolUseIds.get(j.request_id);
          (logEvent("tengu_sdk_control_cancel_request", { in_flight: Boolean(Bn) }),
            Bn?.abort(userAbortReason("remote-cancel")));
          continue;
        } else if (j.type === "keep_alive") continue;
        else if (j.type === "workflow_launch") {
          (Xo++,
            (async () => {
              let { handleWorkflowLaunchEvent: handleWorkflowLaunchEvent } =
                await import("./chunk-w9fbg439.js");
              await handleWorkflowLaunchEvent(j, await $v());
            })()
              .catch((Bn) => {
                logForDebugging(`[print.ts] workflow_launch handler failed: ${toError(Bn).message}`);
              })
              .finally(() => {
                if ((Xo--, !ze.running)) timeoutMs.start();
              }));
          continue;
        } else if (j.type === "update_environment_variables") continue;
        else if (j.type === "session_notice") {
          try {
            handleSessionNotice(j, {
              getAppState: w,
              setAppState: P,
              session: e,
              sessionHooks: ps,
              isRemoteTransport: () => n.isRemoteTransport(),
              ingressTail: kL,
              storageV5: x.storageV5,
              credentials: x.credentials,
            });
          } catch (error) {
            logError(error);
          }
          continue;
        } else if (j.type === "queued_notification") {
          if (!n.isRemoteTransport()) {
            (logForDebugging(
              "[queued-notifications] queued_notification on a non-remote transport \u2014 dropping without ack",
              { level: "warn" },
            ),
              logFeatureBad("ccr_queued_notifications", "not_remote_transport"));
            continue;
          }
          try {
            let turnUnderWay = ze.turnUnderWay,
              wr = acceptQueuedNotification(j, { getAppState: w, setAppState: P, session: e }),
              To = wr === void 0 ? null : parseTriggerWebhookPayload(wr.content, wr.origin);
            if (wr !== void 0 && To !== null) {
              let Eo = claudeDocCommentPrompt(To);
              if (Eo !== null) appendToPendingNotification(wr.notificationId, Eo, P);
              reportDurableCommentWake(To, {
                behindRunningTurn: turnUnderWay,
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
          if (j.type === "user" && typeof j.uuid === "string") n.onCommandLifecycle?.(j.uuid, "completed");
          continue;
        } else if (j.type === "assistant" || j.type === "system") {
          try {
            let Bn = toInternalMessages([j]);
            Ct.push(...Bn);
          } catch (error) {
            logForDebugging(`Dropping malformed ${j.type} replay frame: ${errorMessage(error)}`, {
              level: "error",
            });
            continue;
          }
          if (j.type === "assistant" && x.replayUserMessages) {
            let { api_error_origin: api_error_origin, ...wr } = j;
            output.enqueue(wr);
          }
          continue;
        }
        if (isUnclaimedSpare()) {
          if (
            (output.enqueue(
              emitLoadError(getSessionId(), [
                getSpareClaimState() === "failed"
                  ? "not_claimed: the claim of this spare failed; discard it and start the session normally"
                  : "not_claimed: this process was started with --await-claim and has not been claimed; send claim_session before the first message",
              ]),
            ),
            j.uuid)
          )
            n.onCommandLifecycle?.(j.uuid, "completed");
          if (n.isLocallyPrependedMessage(j)) Bs?.({ cannotQueue: "refused, the claim failed" });
          continue;
        }
        if (j.type === "bash_command") {
          handleRemoteBashCommand(
            j,
            {
              ...pt(j),
              serviceNowAtMost: n.sessionServiceNowAtMost(),
              joinedAt: n.sessionStreamJoinedAt(),
              startedBefore: sessionStreamStartedBefore(j),
            },
            {
              session: e,
              sessionId: getSessionId(),
              receivedMessageUuids: of_2,
              worker: {
                hosting: detectWorkerHosting(),
                sessionKind: env.CLAUDE_CODE_SESSION_KIND,
                readsSessionStream: n instanceof RemoteIO,
              },
              running: Do,
              abortController: Wo,
              emit: (Bn) => output.enqueue(Bn),
              started: (Bn) => n.onCommandLifecycle?.(Bn, "started"),
              completed: (Bn) => n.onCommandLifecycle?.(Bn, "completed"),
              acksConfirmed: () => n.flushDeliveryAcksConfirmed(),
              currentDirectory: getCwd,
              conversation: mL,
              run: async (Bn, wr, To) => {
                let { runHeadlessBashCommand: runHeadlessBashCommand } = await import("./chunk-9f02q1bz.js");
                return runHeadlessBashCommand({ command: Bn, cwd: wr, abortSignal: To, session: e });
              },
            },
          );
          continue;
        }
        if (j.type !== "user") continue;
        let startTime = performance.now(),
          now = Date.now(),
          Ci = {};
        if (Oo.dropMalformed(j)) continue;
        ke(!0);
        let jr = n instanceof RemoteIO,
          isLocallyPrependedMessage = n.isLocallyPrependedMessage(j),
          Mu = jr ? filesRefetchMode() : "off";
        if (j.uuid) {
          let sessionId = getSessionId(),
            wr;
          try {
            wr =
              Mu !== "off" &&
              !of_2.has(j.uuid) &&
              !ut.has(j.uuid) &&
              G?.kind === "interrupted_prompt" &&
              j.uuid === $r
                ? plannedFilePrompt(j, jr, isLocallyPrependedMessage, "cut_off_prompt")
                : void 0;
          } catch (error) {
            (logError(error), (wr = void 0));
          }
          let To = wr === void 0 ? void 0 : $a.hold(j.uuid),
            Eo = To !== void 0 && $n ? holdForFilesRefetch("cut_off_prompt") : void 0,
            startTime = performance.now(),
            skipDuplicate = Oo.skipDuplicate(
              j.uuid,
              () => {
                if (x.replayUserMessages) {
                  logForDebugging(`Sending acknowledgment for duplicate user message: ${j.uuid}`);
                  let Io = extractInboundAttachments(j);
                  output.enqueue({
                    type: "user",
                    message: { ...j.message, content: ZDs(j, jr, isLocallyPrependedMessage) },
                    session_id: sessionId,
                    parent_tool_use_id: null,
                    uuid: j.uuid,
                    timestamp: j.timestamp,
                    isReplay: !0,
                    ...(Io.length > 0 && { file_attachments: Io }),
                  });
                }
              },
              j,
            ),
            Qn;
          try {
            Qn = await skipDuplicate;
          } catch (error) {
            throw (Eo?.(), error);
          }
          if (((Ci.dedupMs = elapsedMs(startTime)), !Qn)) $n = !1;
          if (
            Qn &&
            Mu !== "off" &&
            j.uuid !== $r &&
            !ut.has(j.uuid) &&
            jn.heldBack.includes(j.uuid) &&
            !jn.waitingToRun.includes(j.uuid)
          ) {
            try {
              wr = plannedFilePrompt(j, jr, isLocallyPrependedMessage, "skipped_and_left_open");
            } catch (error) {
              (logError(error), (wr = void 0));
            }
            if (wr !== void 0) Eo = holdForFilesRefetch("skipped_and_left_open");
          }
          if (Qn && wr !== void 0)
            (ut.add(j.uuid),
              refetchUserMessageFiles({
                uuid: j.uuid,
                ...wr,
                storedPrompt: Yt,
                conversation: Ct,
                releasePlaceInLine: Eo,
                settleColdFlags:
                  Mu === "cold"
                    ? () =>
                        (Cd ??= awaitGrowthBookSettled({
                          uuid: matchRequestId(j.uuid),
                          for: "files_fetched_again",
                        }).finally(() => {
                          Cd = void 0;
                        }))
                    : void 0,
                stopping: Ks,
                storageV5: x.storageV5,
                credentials: x.credentials,
              })
                .then((Io) => {
                  if (Io) To?.();
                })
                .catch(logError));
          else (To?.(), Eo?.());
          if (Qn) continue;
        }
        cancelPendingUserDialogs(n, "new_user_message");
        let qs = ingressPromptContent(j, jr, isLocallyPrependedMessage),
          client_platform = j.client_platform,
          Ql;
        if (jr && (nEn(j.inbound_origin) || (!isLocallyPrependedMessage && e5s(j, qs)))) {
          let startTime = performance.now();
          ((Ql = await awaitGrowthBookSettled({ uuid: matchRequestId(j.uuid) })),
            (Ci.flagSettleMs = elapsedMs(startTime)));
        } else if (jr && !isLocallyPrependedMessage && sLs(j)) {
          let startTime = performance.now();
          (await gEo(() => awaitGrowthBookSettled({ uuid: matchRequestId(j.uuid) })),
            (Ci.flagSettleMs = elapsedMs(startTime)));
        }
        let ai = jr && !isLocallyPrependedMessage && checkEmailSenderTurn(j, qs, oUo({ kind: "bridge" })),
          {
            ingressOrigin: ingressOrigin,
            peerFrom: peerFrom,
            nonPeerOrigin: nonPeerOrigin,
            queuedOrigin: queuedOrigin,
          } = resolveIngressOrigins(j, qs, jr, isLocallyPrependedMessage, Ql, ai),
          bf = isUserTypedTurn(j, {
            isRemoteIO: jr,
            isLocallyPrepended: isLocallyPrependedMessage,
            peerFrom: peerFrom,
            projectsHumanEnabled: jr && isProjectsHumanOriginEnabled({ flagsSettled: Ql }),
            wasStartedBefore: j.uuid !== void 0 && n.userFrameStartedAtMs(j.uuid) !== void 0,
          });
        if (jr && bf && Die(client_platform)) runSafely(applyBridgeChildCliEntrypoint);
        if (
          (runSafely(() => cancelDialogsOnNewPrompt(n, e.userPresence, bf, client_platform, "read")),
          jr && bf && j.priority !== "now" && Ie.inheritedPromptHoldCapable())
        ) {
          let startTime = performance.now();
          if (
            (await awaitGrowthBookSettled({ uuid: matchRequestId(j.uuid) }),
            (Ci.flagSettleMs = (Ci.flagSettleMs ?? 0) + elapsedMs(startTime)),
            jSt())
          )
            logFeatureSad("ccr_input_held_behind_prompt", "flags_cold");
        }
        let { messageIds: messageIds, rows: rows, threadTs: threadTs } = relayMessageMeta(j, nonPeerOrigin);
        if (jr && j.inbound_origin === HEARTH_AGENT) logProjectsRelayAdmission(j, nonPeerOrigin, rows);
        let PL = isLocalDesktopPrompt({
            declared: j.seeded_summon,
            isRemoteIO: jr,
            isSynthetic: j.isSynthetic,
            peerDelivered: peerFrom !== void 0,
            inboundOrigin: j.inbound_origin,
            clientPlatform: client_platform,
          }),
          zv = jr ? void 0 : iLs(j),
          Au = ingressOrigin
            ? ost(j.inbound_origin, isProjectsHumanOriginEnabled({ flagsSettled: Ql }), ai)
            : awe(client_platform, j.inbound_origin),
          Yv = aLs(j, peerFrom);
        maybeTitleFromUserMessage(
          {
            content: qs,
            origin: nonPeerOrigin,
            queuedOrigin: queuedOrigin,
            dispatchesSlashCommands: !Yv,
            peerFrom: peerFrom,
            isSynthetic: j.isSynthetic,
            shouldQuery: j.shouldQuery,
          },
          Tg,
        );
        let dl = extractInboundAttachments(j),
          Jv = t8n(j, { isRelayHuman: Au }),
          lh = isGatedInbound({
            ingressOrigin: ingressOrigin,
            inboundOrigin: j.inbound_origin,
            envelopePeer: hasTeammateMessageEnvelope(qs),
          }),
          Xv = GRn(j.uuid, { isCrossSession: lh }),
          Zv = prepareCloudBrowserTurn(j, {
            deliveredByServer: jr && !isLocallyPrependedMessage && !Au && peerFrom === void 0 && !lh,
          }),
          uh;
        if (Zv !== void 0) {
          let { admitted: admitted, flagSettleMs: flagSettleMs } = await admitCloudBrowserTurnId({
            uuid: matchRequestId(j.uuid),
          });
          if (((uh = admitted ? Zv : void 0), flagSettleMs !== void 0))
            Ci.flagSettleMs = (Ci.flagSettleMs ?? 0) + flagSettleMs;
        }
        let eb = env.CLAUDE_CODE_REMOTE ? extractCcrTraceContext(j, { isCrossSession: lh }) : void 0,
          Cf = Jvt(j.priority),
          tb = peerFrom
            ? wdi(Cf, den(messageQueue))
            : nonPeerOrigin?.kind === "task-notification"
              ? adjustInboundPriority(Cf, client_platform, j.inbound_origin, Zqt(j))
              : Au
                ? resolveQueuePriority(Cf, qs, $Lt(messageQueue))
                : Cf,
          Pf = peerFrom !== void 0 && !jr,
          ML =
            Pf &&
            j.origin?.kind === "peer" &&
            (j.origin.fromMode === "bypass" || j.origin.fromMode === "prompting")
              ? j.origin.fromMode
              : void 0;
        if (
          dropBeforeAttachments({
            io: n,
            uuid: j.uuid,
            peerFrom: peerFrom,
            hostInjectedPeer: Pf,
            ingressOrigin: ingressOrigin,
          })
        )
          continue;
        let La = zPr(qs, jr, isLocallyPrependedMessage, j.inbound_origin),
          AL = peerFrom !== void 0 || (jr && !isLocallyPrependedMessage),
          nb = resolveInboxWakeFor(
            La,
            jr && peerFrom === void 0 ? j.inbound_origin : void 0,
            j.wake_envelope,
          ),
          Mf = parseTriggerWebhookPayload(
            La,
            jr && peerFrom === void 0 && !isLocallyPrependedMessage ? j.inbound_origin : void 0,
          ),
          rb = Mf === null ? null : claudeDocCommentPrompt(Mf);
        if (rb !== null && typeof La === "string")
          La = `${La}

${rb}`;
        let ob = promptOriginKind(qs);
        if (peerFrom === void 0 && !isPeerOrSlackPing(ingressOrigin))
          La = buildExternalEventRecord(
            La,
            "pasted_content" in j ? j.pasted_content : void 0,
            "inline_pastes" in j ? j.inline_pastes : void 0,
          );
        let sb;
        if (AL) {
          let startTime = performance.now(),
            wr = La,
            To = originFromBridgeMetadata(
              ingressOrigin ?? (peerFrom === void 0 ? queuedOrigin : { kind: "peer" }),
            ),
            Eo = () => dispatchSessionReceiveHooks({ origin: To, content: wr, event: nb }),
            Ba = hasModuleHookingSite("session.receive", { origin: To })
              ? await awaitPendingPermissionAnswers(Eo, {
                  loopInput: O,
                  io: n,
                  urgencyOf: (Qn) => {
                    if (Qn.type !== "control_request") return;
                    let { request: request } = Qn;
                    if (request.subtype === "end_session") return Yx(request.reason) ? void 0 : "end";
                    return request.subtype === "interrupt" && !Sat(request) ? "stop" : void 0;
                  },
                  onLate: (Qn) => Qn.queueing?.[Symbol.dispose](),
                })
              : { received: await Eo() };
          if (((Ci.receiveHookMs = elapsedMs(startTime)), Ba === "given-up")) {
            logForDebugging(
              `session.receive: hooks (${pluginsMatchingEvent("session.receive", { origin: To }).join("+")}) still held message ${j.uuid} ${Qh} ms after the session's end: left to the next worker, not queued`,
              { level: "warn" },
            );
            let Qn = bridgeMessageUuid(j.uuid, "stdin");
            if (Qn !== void 0) n.onCommandLifecycle?.(Qn, "discarded");
            continue;
          }
          let { received: received } = Ba;
          if (received.consumed !== void 0) {
            reportCommandRefused(n, j.uuid, "stdin");
            continue;
          }
          ((La = received.content), (sb = received.queueing));
        }
        using begin = nh.promptsFetchingFiles.begin({
          fileCount: dl.length,
          peerFrom: peerFrom,
          origin: queuedOrigin,
          shouldQuery: j.shouldQuery,
          reRun: j.uuid !== void 0 && Oo.isReRun(j.uuid),
        });
        let startTime_2 = performance.now(),
          EL = dl.length > 0 ? of_4.aroundDownload(startTime_2) : void 0,
          {
            resolving: resolving,
            queuedAheadOfFiles: queuedAheadOfFiles,
            frameAdmission: frameAdmission,
          } = fetchUserPromptFiles({
            aheadOfFiles: readAheadOfFiles(jr),
            attachments: dl,
            resolveArguments: [
              j,
              La,
              { ingressOrigin: ingressOrigin, isRemoteIO: jr, peerFrom: peerFrom },
              x.storageV5,
              x.credentials,
            ],
            sessionHooks: ps,
          }),
          Af = await resolving,
          { content: content, inlinedImagePaths: inlinedImagePaths, imageFileUuids: imageFileUuids } = Af;
        Ci.attachments = {
          ms: elapsedMs(startTime_2),
          count: dl.length,
          inlinedImages: inlinedImagePaths.length,
          ...(queuedAheadOfFiles && { aheadOfFiles: !0 }),
          stages: EL?.(),
        };
        let DL =
            jr &&
            j.shouldQuery !== !1 &&
            shouldStampThreadState({
              carrier: { origin: queuedOrigin, hearthRelayRows: rows },
              isPeer: peerFrom !== void 0,
            }),
          lb = {
            declared: j.seeded_summon,
            isSynthetic: j.isSynthetic,
            peerDelivered: peerFrom !== void 0,
            inboundOrigin: j.inbound_origin,
            value: content,
            shouldQuery: j.shouldQuery,
            hasAttachments: dl.length > 0 || inlinedImagePaths.length > 0,
          },
          ub = classifyArtifactThreadMessage(lb),
          cb = {
            mode: "prompt",
            agentId: mainAgentId(),
            value: content,
            ...(ob !== void 0 && { foreignWord: ob }),
            ...(DL && { stampThreadState: !0 }),
            ...(inlinedImagePaths.length > 0 && { inlinedImagePaths: inlinedImagePaths }),
            ...(imageFileUuids && { imageFileUuids: imageFileUuids }),
            ...(Af.writtenFiles && { savedFiles: Af.writtenFiles }),
            ...withdrawnFileUuidsOf(j, { ingressOrigin: ingressOrigin, isRemoteIO: jr, peerFrom: peerFrom }),
            uuid: j.uuid,
            ...(Xv && { turnAttributionKey: Xv }),
            ...(eb && { traceContext: eb }),
            priority: tb,
            shouldQuery: j.shouldQuery,
            ...(jr &&
              typeof j.inbound_origin === "string" &&
              j.inbound_origin !== "" && { inboundOrigin: j.inbound_origin }),
            ...(j.isSynthetic && { isMeta: !0 }),
            ...(dl.length > 0 && { fileAttachments: dl }),
            disallowedTools: peerFrom ? [] : readDisallowedToolsMetadata(j),
            ...(peerFrom === void 0 && !(jr && y3s(j.inbound_origin)) && { replacesDisallowedTools: !0 }),
            ...(peerFrom
              ? {
                  origin: SQ(
                    ingressOrigin?.kind === "peer"
                      ? ingressOrigin
                      : {
                          kind: "peer",
                          from: peerFrom,
                          ...peerMessageInfo(qs),
                          ...(Pf && { hostInjected: !0, fromMode: ML }),
                        },
                    content,
                    qs,
                  ),
                  isMeta: !0,
                  skipAttachments: !0,
                }
              : {
                  clientPlatform: client_platform,
                  ...(queuedOrigin && { origin: queuedOrigin }),
                  ...(PL && { seededSummon: !0 }),
                  ...(ub !== void 0 && { artifactCommentTurn: ub }),
                  ...(zv !== void 0 && { hostInitiator: zv }),
                  ...textNotTypedFlags(j, Af),
                  ...ingressSubmitFlags({
                    message: j,
                    isRemoteIO: jr,
                    isRelayHuman: Au,
                    queuedOrigin: queuedOrigin,
                    nonPeerOrigin: nonPeerOrigin,
                  }),
                  ...(ai && { skipAttachments: !0 }),
                  ...(messageIds && { hearthRelayMessageIds: messageIds }),
                  ...(rows && { hearthRelayRows: rows }),
                  ...(threadTs && { hearthRelayThreadTs: threadTs }),
                  ...isPeerOrigin({
                    isRelayHuman: Au,
                    isSynthetic: j.isSynthetic,
                    ccrTurnId: Jv,
                    isProjectsUser: Vsr(j.inbound_origin),
                    emailSenderTurn: ai ? tEn(j) : void 0,
                  }),
                  ...(uh !== void 0 && { ccrTurnId: uh, ccrTurnIdEndsWithTurn: !0 }),
                }),
            ...(Yv && { skipSlashCommands: !0 }),
          },
          $l = n.isPersonsOwnPrepend(j)
            ? withOwnWordStopKey(cb)
            : markOwnWord(cb, !isLocallyPrependedMessage),
          FL = async (Bn, wr) => {
            takeSeededSummon($l);
            let To = !1;
            try {
              To = await resumeArtifactThreadAgent(Bn, {
                exiting:
                  ze.endSessionRequested || isShuttingDown() || isTerminalShutdown() || uN(x.maxBudgetUsd),
                canUseTool: S,
                storageV5: x.storageV5,
                onLifecycle: (Eo) => {
                  if (j.uuid !== void 0) n.onCommandLifecycle?.(j.uuid, Eo);
                },
              });
            } catch (error) {
              logError(toError(error));
            }
            if (!To) return !0;
            if (x.replayUserMessages && j.uuid !== void 0)
              output.enqueue({
                type: "user",
                message: { role: "user", content: content },
                session_id: getSessionId(),
                parent_tool_use_id: null,
                uuid: j.uuid,
                timestamp: j.timestamp ?? new Date().toISOString(),
                isReplay: !0,
                isSynthetic: !1,
              });
            return (wr?.queued(), !1);
          },
          mb = isLocallyPrependedMessage && ze.dequeueCount === 0,
          xL = j.uuid === void 0 ? void 0 : n.userFrameReceivedAtMs(j.uuid),
          ch = j.uuid === void 0 ? void 0 : n.takeUserFrameReceivedWallMs(j.uuid),
          acceptUserFrame = Oo.acceptUserFrame({
            frame: j,
            parsedAtMs: startTime,
            waits: Ci,
            receivedWallMs: ch,
            receivedAtMs: xL,
            aheadOfRead: ch === void 0 ? void 0 : dt.split(startTime - (now - ch), startTime),
            command: $l,
            queueing: sb,
            ownFirstTurnMessage: mb,
            admit: (prev) => {
              if (
                !acceptStdinPeerMessage({
                  io: n,
                  hostIngressLanes: of_3,
                  command: $l,
                  uuid: j.uuid,
                  peerFrom: peerFrom,
                  hostInjectedPeer: Pf,
                  ingressOrigin: ingressOrigin,
                })
              )
                return (frameAdmission(!1), !1);
              let wr = readArtifactThreadHeader(lb);
              if (wr !== null) return FL(wr, prev);
              return (Ia.takeBeforeEnqueue($l), !0);
            },
            beforeEnqueue: (snapshot) => {
              let wr = Qa?.takeFrame(j.uuid, {
                reRun: j.uuid !== void 0 && Oo.isReRun(j.uuid),
                ownLine: isLocallyPrependedMessage,
                person: peerFrom === void 0 && isHumanOrigin(queuedOrigin) && j.shouldQuery !== !1,
              });
              if (wr !== void 0) snapshot.startedBy = wr;
            },
            afterEnqueue: () => {
              if (bf)
                runSafely(() => cancelDialogsOnNewPrompt(n, e.userPresence, !0, client_platform, "enqueue"));
              if (
                (Ia.press($l),
                runImmediateSlashCommand($l, {
                  drain: ze,
                  io: n,
                  commands: Ho,
                  closing: () =>
                    w().endedByModel === !0 ||
                    ze.endSessionRequested ||
                    isShuttingDown() ||
                    isTerminalShutdown() ||
                    uN(x.maxBudgetUsd),
                  queue: messageQueue,
                  sayRanAhead: (error) =>
                    output.enqueue({
                      type: "command_lifecycle",
                      command_uuid: error,
                      state: "queued",
                      ran_ahead: !0,
                      uuid: randomUUID_19(),
                      session_id: getSessionId(),
                    }),
                }),
                frameAdmission(!0),
                j.shouldQuery !== !1)
              )
                of_4.resetBegun();
              if (mb) Bs?.({ queued: j.message.content });
              if (Qs && jr)
                Qs.sessionInboxPointers
                  .of(e)
                  .noteQueued({ inboundOrigin: j.inbound_origin, wake: nb, uuid: j.uuid });
              let Bn = peerFrom ? null : parseArtifactFollowupAck(j, { isRelayHuman: Au });
              if (Bn !== null)
                codeliverArtifactFollowup({
                  stamp: Bn,
                  content: content,
                  hasAttachments: dl.length > 0 || inlinedImagePaths.length > 0,
                  exiting:
                    ze.endSessionRequested || isShuttingDown() || isTerminalShutdown() || uN(x.maxBudgetUsd),
                  toolUseContext: getLastCacheSafeParams()?.toolUseContext ?? null,
                  canUseTool: S,
                  agentNames: w().agentNameRegistry,
                  messageQueue: messageQueue,
                  priority: tb,
                  ccrTurnId: Jv,
                  copyUuid: typeof j.uuid === "string" ? j.uuid : void 0,
                });
              if ((consumeSeededSummon($l), Mf !== null))
                reportDurableCommentWake(Mf, {
                  behindRunningTurn: ze.turnUnderWay,
                  carrier: "user_message",
                  carrierId: j.uuid,
                  storageV5: x.storageV5,
                });
            },
            beforeKick: () => {},
          });
        if (acceptUserFrame) await acceptUserFrame;
        dt.note("user", startTime, performance.now());
      }
      ((ji = !0),
        Bs?.({ cannotQueue: "the input ended first" }),
        await Oo.closeInput(async () => {
          if ((markPrintInputClosed(), !ze.running && messageQueue.peek(im) === void 0))
            releaseStartupWork(e.host, "input_closed");
          if ((Wo.abort(), ze.running || Iv.pollActive())) return;
          if (
            (heldBackResult?.stop(),
            (heldBackResult = null),
            requestTeardownUnwind(),
            Ys(),
            (await Tv()) === "handed-off")
          )
            return;
          await Rv();
        }));
    })().catch(Lv),
    output
  );
}
/**
 * -p 是否需要等待显式 --mcp-config 服务器连接完成（有非 sdk 服务器时）。
 */
//@ chunk-tyg7f3ek.js:850597-850708 layout
function explicitMcpConfigRequestsWait(e, n, r) {
  if (n) return r > 0;
  return !startupCcrEnv.isBridgeCarrierChild && Object.values(e).some((s) => s.type !== "sdk");
}
/**
 * 中继模式下 MCP 等待剩余时间（不少于下限）。
 */
//@ chunk-tyg7f3ek.js:850708-850766 layout
function relayMcpWaitLeft(e, n, r) {
  return Math.max(Npe, Math.round(e + n - r));
}
/**
 * 包装 canUseTool：规则判定为 ask 时转给 --permission-prompt-tool 指定的 MCP 工具；工具不可用时拒绝并说明。
 */
//@ chunk-tyg7f3ek.js:850766-853865 fingerprint = createCanUseToolWithPermissionPrompt (0.384)
function createCanUseToolWithPermissionPrompt(e, n = () => !1) {
  let canUseTool = async (tool, input, toolUseContext, assistantMessage, toolUseId, forceDecision) => {
    let P =
      forceDecision ??
      (await hasPermissionsToUseTool(tool, input, toolUseContext, assistantMessage, toolUseId));
    if (P.behavior === "allow" || P.behavior === "deny") return P;
    let L = xLs(tool, P, input, toolUseContext, toolUseId);
    if (L !== void 0) return L;
    if (e === null || n())
      return {
        behavior: "deny",
        message:
          "The permission prompt tool is no longer available \u2014 its MCP server is not connected in this session.",
        decisionReason: CAN_USE_TOOL_PROMPT_TOOL_GONE_DENY_REASON,
      };
    let q = e.name,
      x = () => ({
        behavior: "deny",
        message: `${tool.name} was not run. The permission prompt tool ${q} is a tool of MCP server 'remote-browser', and in this session that server's tools can't answer permission requests, because nothing would check the call to it. To have these requests answered, set --permission-prompt-tool to a tool of another MCP server.`,
        decisionReason: CAN_USE_TOOL_PROMPT_TOOL_IS_CLOUD_BROWSER_DENY_REASON,
      });
    if (isRemoteBrowserToolUnderModeFloor(e)) return x();
    if (isHostWordedAsk(P))
      return forwardHostWordedAsk(
        tool.name,
        "the configured --permission-prompt-tool (a tool_name+input wire)",
        { hostWorded: P.hostDisplay !== void 0, forMcpSkill: P.metadata?.mcpSkill !== void 0 },
      );
    let G = P.updatedInput ?? input,
      { signal: combinedSignal, cleanup: cleanupAbortListener } = createCombinedAbortSignal(
        toolUseContext.abortController.signal,
      );
    if (combinedSignal.aborted)
      return (
        cleanupAbortListener(),
        {
          behavior: "deny",
          message: "Permission prompt was aborted.",
          decisionReason: CAN_USE_TOOL_ABORTED_DENY_REASON,
        }
      );
    let abortPromise = new Promise((resolve) => {
        combinedSignal.addEventListener("abort", () => resolve("aborted"), { once: !0 });
      }),
      Ue = !1,
      ce =
        toolUseContext.forRemoteExecution === !0 || P.personOnly === !0
          ? new Promise(() => {})
          : executePermissionRequestHooksForSDK(
              applyPermissionAnswerChanges,
              tool,
              toolUseId,
              G,
              toolUseContext,
              P.suggestions,
              P,
              () => Ue || combinedSignal.aborted,
            ).then(
              (Xe) => (Xe ? { hookOutcome: Xe } : new Promise(() => {})),
              (Xe) => {
                if (isAbortError(Xe)) logForDebugging("permission prompt tool hook race aborted");
                else logError(toError(Xe));
                return new Promise(() => {});
              },
            ),
      nt = new PromptScopedAbortController(toolUseContext.abortController),
      ie = e
        .call(
          { tool_name: tool.name, input: G, tool_use_id: toolUseId },
          { ...toolUseContext, abortController: nt, permissionRound: void 0 },
          canUseTool,
          assistantMessage,
        )
        .then((Xe) => ((Ue = !0), { toolResult: Xe }));
    ie.catch(() => {
      Ue = !0;
    });
    let raceResult = await Promise.race([ie, abortPromise, ce]);
    if ((cleanupAbortListener(), nt.abort(), raceResult === "aborted" || combinedSignal.aborted))
      return {
        behavior: "deny",
        message: "Permission prompt was aborted.",
        decisionReason: CAN_USE_TOOL_ABORTED_DENY_REASON,
      };
    if ("hookOutcome" in raceResult) {
      let { decision: decision, interrupt: interrupt } = raceResult.hookOutcome;
      if (interrupt)
        (logForDebugging(`Hook interrupt: tool=${tool.name} hookMessage=${decision.message}`),
          turnAbortControllerOf(toolUseContext.abortController).abort());
      return decision;
    }
    let toolResult = raceResult.toolResult;
    if (isRemoteBrowserToolUnderModeFloor(e)) return x();
    let permissionToolResultBlockParam = e.mapToolResultToToolResultBlockParam(toolResult.data, "1");
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
    let safeParse = permissionPromptResultSchemaRefusing().safeParse(
      safeParseJSON(permissionToolResultBlockParam.content[0].text),
    );
    if (!safeParse.success)
      return (
        logForDebugging(
          `Permission prompt tool returned a schema-invalid result for ${tool.name}: ${safeParse.error.message.slice(0, 2000)}`,
          { level: "error" },
        ),
        {
          behavior: "deny",
          message: `The permission prompt tool returned an invalid permission result. ${PERMISSION_PROMPT_RESULT_FORMAT_HINT}`,
          decisionReason: CAN_USE_TOOL_INVALID_RESULT_DENY_REASON,
        }
      );
    let He = safeParse.data;
    if (He.behavior === "allow" && requiresConnectorGrant(tool))
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
      e,
      G,
      toolUseContext,
      tool,
      P.suppressAlwaysAllowRule === !0,
      !1,
    );
  };
  return Fet("promptTool", canUseTool, () => e !== null && !n());
}
//@ chunk-tyg7f3ek.js:853865-853988 layout = countToolCallsSince (1)
function messageHasToolUseId(messages, sinceUuid) {
  let r = messages?.message?.content;
  if (!Array.isArray(r)) return !1;
  return r.some((block) => block.type === "tool_use" && block.id === sinceUuid);
}
/**
 * --permission-prompt-tool 找不到或不是 MCP 工具时的遥测消息模板（工具名脱敏）。
 */
//@ chunk-tyg7f3ek.js:853988-854298 layout
var PERMISSION_PROMPT_TOOL_NOT_FOUND_TELEMETRY_MESSAGE =
    "Error: MCP tool <redacted> (passed via --permission-prompt-tool) not found. Available MCP tools: <redacted>",
  PERMISSION_PROMPT_TOOL_NOT_FOUND_NO_MCP_TOOLS_TELEMETRY_MESSAGE =
    "Error: MCP tool <redacted> (passed via --permission-prompt-tool) not found. Available MCP tools: none",
  PERMISSION_PROMPT_TOOL_NOT_MCP_TELEMETRY_MESSAGE =
    "Error: tool <redacted> (passed via --permission-prompt-tool) must be an MCP tool";
/**
 * 根据输入格式与 --permission-prompts 选择 canUseTool：stdio 走 StructuredIO 请求宿主，none 自动拒绝，否则走权限提示工具。
 */
//@ chunk-tyg7f3ek.js:854298-855389 fingerprint = getCanUseToolFn (0.812)
function getCanUseToolFn(e, n, r, s, h, y) {
  let S = Z_e(y);
  if (!S && e === "stdio") {
    let canUseTool = n.createCanUseTool(applyPermissionAnswerChanges, s);
    return isVsCodeOrDesktop() ? v8n(canUseTool) : canUseTool;
  }
  if (S || !e)
    return async (tool, input, toolUseContext, assistantMessage, toolUseId, forceDecision) => {
      let re =
          forceDecision ??
          (await hasPermissionsToUseTool(tool, input, toolUseContext, assistantMessage, toolUseId)),
        Ae =
          re.behavior === "ask" && (S || !forceDecision)
            ? ((re.personOnly === !0
                ? null
                : await consultPermissionRequestHooksForUnpromptableAsk(
                    applyPermissionAnswerChanges,
                    tool,
                    input,
                    re,
                    toolUseId,
                    toolUseContext,
                    void 0,
                  )) ??
              (S
                ? buildNoApprovalSurfaceDenial(re)
                : (lIr(tool, re, toolUseContext, NO_PROMPT_SURFACE_REASON) ?? re)))
            : re;
      if (
        Ae.behavior !== "allow" &&
        messageHasToolUseId(assistantMessage, toolUseId) &&
        !isServerFallbackDiscard(toolUseContext.abortController.signal)
      )
        n.emitPermissionDenied(tool.name, toolUseId, toolUseContext.agentId, Ae);
      return Ae;
    };
  let resolved = null;
  return Fet(
    "promptTool",
    async (tool, input, toolUseContext, assistantMessage, toolUseId, forceDecision) => {
      let re = h?.isPromptToolServerSwept() === !0;
      if (!resolved && re) resolved = createCanUseToolWithPermissionPrompt(null);
      if (!resolved) {
        let mcpTools = r(),
          permissionPromptTool = mcpTools.find((ce) => toolMatchesName(ce, e));
        if (!permissionPromptTool) {
          let joined = mcpTools.map((ie) => ie.name).join(", "),
            error = `Error: MCP tool ${e} (passed via --permission-prompt-tool) not found. Available MCP tools: ${joined || "none"}`;
          throw (
            process.stderr.write(`${error}
`),
            gracefulShutdownSync(1),
            withTelemetryMessage(
              Error(error),
              joined
                ? PERMISSION_PROMPT_TOOL_NOT_FOUND_TELEMETRY_MESSAGE
                : PERMISSION_PROMPT_TOOL_NOT_FOUND_NO_MCP_TOOLS_TELEMETRY_MESSAGE,
            )
          );
        }
        if (!permissionPromptTool.inputJSONSchema) {
          let error = `Error: tool ${e} (passed via --permission-prompt-tool) must be an MCP tool`;
          throw (
            process.stderr.write(`${error}
`),
            gracefulShutdownSync(1),
            withTelemetryMessage(Error(error), PERMISSION_PROMPT_TOOL_NOT_MCP_TELEMETRY_MESSAGE)
          );
        }
        resolved = createCanUseToolWithPermissionPrompt(
          permissionPromptTool,
          () => h?.isPromptToolServerSwept() === !0,
        );
      }
      return resolved(tool, input, toolUseContext, assistantMessage, toolUseId, forceDecision);
    },
    () => h?.isPromptToolServerSwept() !== !0,
  );
}
//@ chunk-tyg7f3ek.js:855389-855453 file-local
function joinPromptValues(values) {
  return Array.isArray(values) && values.length === 1 && values[0] === "";
}
/**
 * 按 --agent 选定主线程代理：设置代理类型、采用其系统提示词与模型、可前置其 initialPrompt。
 */
//@ chunk-tyg7f3ek.js:855453-856133 layout
function seatMainThreadAgentFromPool(
  e,
  n,
  r,
  {
    deferInitialPrompt: deferInitialPrompt = !1,
    reapplySystemPromptIfSeated: reapplySystemPromptIfSeated = !1,
  } = {},
) {
  if (!n.agent) return { agent: void 0, seatedNow: !1, restrictedAgentModel: void 0 };
  let y = getMainThreadAgentType() === n.agent,
    S = findAgentExcludingWebFetch(e, n.agent);
  if (!S || y) {
    if (S && reapplySystemPromptIfSeated && !n.systemPrompt && !isBuiltInAgent(S)) {
      let systemPrompt = S.getSystemPrompt();
      if (systemPrompt) n.systemPrompt = systemPrompt;
    }
    return { agent: S, seatedNow: !1, restrictedAgentModel: void 0 };
  }
  let R;
  if ((setMainThreadAgentType(S.agentType), hookSourcesSummary(S), !n.systemPrompt && !isBuiltInAgent(S))) {
    let systemPrompt = S.getSystemPrompt();
    if (systemPrompt) n.systemPrompt = systemPrompt;
  }
  if (!n.userSpecifiedModel && S.model && S.model !== "inherit") {
    let w = parseUserSpecifiedModel(S.model);
    if (isExemptDefaultResolvingPick(w) || isModelAllowed(w)) setMainLoopModelOverride(w);
    else R = S.model;
  }
  if (S.initialPrompt && !deferInitialPrompt) r.prependUserMessage(S.initialPrompt, "person");
  return { agent: S, seatedNow: !0, restrictedAgentModel: R };
}
/**
 * 处理 initialize 控制请求：注册 SDK 钩子回调、提示建议、代理、MCP 服务器、输出样式等，回复 initialize 响应（命令、代理、模型、账户、pid、版本…）。
 */
//@ chunk-tyg7f3ek.js:856133-861179 fingerprint = handleInitializeRequest (0.344)
async function handleInitializeRequest(e, n, r, s, h, y, S, R, w, P, L, q, x, G, Z, re, Ae, Ue) {
  let ce;
  if (r) {
    let We = sdkHooksIfHostOwnsStdin(e, S),
      St = 0;
    if (We)
      ((St = S.retireSdkHostHookCallbacks(sdkHookReconnectFallback)),
        buildSdkHookRegistrations(We, (ze, Dr) => S.createHookCallback(ze, Dr), S));
    let alreadyResolved = e.promptSuggestions === !0,
      Lt = alreadyResolved && !w.promptSuggestions && isRemoteCowork();
    if (Lt) w.promptSuggestions = !0;
    (applyHostRendersChromeSetupOffer(e.rendersChromeSetupOffer, S),
      applyInitializeProactivity(e.proactivity, {
        reinitialize: !0,
        permissionModeSuppliedOnInvocation: w.permissionModeSuppliedOnInvocation !== !1,
        restartedWorker: Am(env.CLAUDE_CODE_WORKER_EPOCH),
        planModeRestoredAtBoot: w.planModeOnResume === "restored",
        getAppState: L,
        setAppState: q,
        sessionState: S.sessionState,
      }));
    let pn = Z();
    if (pn !== void 0) await pn;
    let _n = y(),
      Mn = await _buildInitializeResponsePayloadForTesting(
        h,
        getActiveAgentsFromList(P()),
        _n.models,
        _n.unavailable,
        L,
        x(),
        () => S.sessionState.getState(),
        e.hooks ? We !== void 0 : void 0,
        applyInitializePlugins(e.plugins),
        void 0,
        G,
        w.storageV5,
        () => ({
          redactsWhatItPersists: re,
          isRemoteTransport: S.isRemoteTransport(),
          sessionWriters: S.sessionWriters(),
        }),
        Ue,
      ),
      pendingPermissionRequests = S.getPendingPermissionRequests(),
      pendingUserDialogRequests = S.getPendingUserDialogRequests();
    return (
      logEvent("tengu_reinit_pending_redelivery", {
        n_pending_permissions: fromNumber(pendingPermissionRequests.length),
        n_pending_dialogs: fromNumber(pendingUserDialogRequests.length),
        host_hooks_resent: e.hooks !== void 0,
        host_hooks_applied: We !== void 0,
        n_settled_hook_callbacks: fromNumber(St),
        prompt_suggestions_requested: alreadyResolved,
        prompt_suggestions_opt_in_applied: Lt,
      }),
      s.enqueue({
        type: "control_response",
        response: {
          subtype: "success",
          request_id: n,
          response: withHostWordedAsks(Mn, S, w),
          pending_permission_requests: pendingPermissionRequests,
          pending_user_dialog_requests: pendingUserDialogRequests,
          pending_elicitation_requests: S.getPendingElicitationRequests(),
        },
      }),
      emitBackgroundTasksChanged(L()),
      { publishedCommands: Mn.commands }
    );
  }
  if (e.systemPrompt !== void 0) w.systemPrompt = joinPromptValues(e.systemPrompt) ? "" : e.systemPrompt;
  if (e.supportedDialogKinds !== void 0)
    declareSdkDialogKinds(e.supportedDialogKinds, Am(env.CLAUDE_CODE_WORKER_EPOCH), S.sessionState);
  if (e.perTaskStopAffordance === !0) setSdkPerTaskStopAffordance(!0);
  if ((applyHostRendersChromeSetupOffer(e.rendersChromeSetupOffer, S), e.rapidFollowupPreempt === !0))
    setSdkRapidFollowupPreempt(!0);
  if (e.forwardNestedSubagentToolCalls === !0) setSdkForwardNestedSubagentToolCalls(!0);
  if (e.appendSystemPrompt !== void 0) w.appendSystemPrompt = e.appendSystemPrompt;
  if (e.planModeInstructions !== void 0) w.planModeInstructions = e.planModeInstructions;
  if (typeof e.systemPromptSnapshot === "boolean") w.systemPromptSnapshot = e.systemPromptSnapshot;
  if (e.appendSubagentSystemPrompt !== void 0) w.appendSubagentSystemPrompt = e.appendSubagentSystemPrompt;
  if (e.toolAliases !== void 0) {
    w.toolAliases = e.toolAliases;
    let { toolAliases: toolAliases } = e;
    (q((St) => ({
      ...St,
      toolPermissionContext: withToolAliases(St.toolPermissionContext, toolAliases, Ae),
    })),
      VUi(e.toolAliases));
  }
  let nt =
    e.codeRunningMcpTools === void 0 ? void 0 : declareSdkHostCodeRunningMcpTools(e.codeRunningMcpTools);
  if (nt !== void 0)
    q((We) => {
      let agentModel = withRulesSetAsideAgain(We.toolPermissionContext);
      return agentModel === We.toolPermissionContext ? We : { ...We, toolPermissionContext: agentModel };
    });
  if (typeof e.excludeDynamicSections === "boolean")
    ((w.excludeDynamicSections = e.excludeDynamicSections), Pz(S.sessionState, e.excludeDynamicSections));
  if (e.promptSuggestions !== void 0) w.promptSuggestions = e.promptSuggestions;
  if (e.forwardSubagentText !== void 0) w.forwardSubagentText = e.forwardSubagentText;
  if (
    (applyInitializeProactivity(e.proactivity, {
      reinitialize: !1,
      permissionModeSuppliedOnInvocation: w.permissionModeSuppliedOnInvocation !== !1,
      restartedWorker: Am(env.CLAUDE_CODE_WORKER_EPOCH),
      planModeRestoredAtBoot: w.planModeOnResume === "restored",
      getAppState: L,
      setAppState: q,
      sessionState: S.sessionState,
    }),
    e.skills !== void 0)
  )
    setSessionSkillAllowlist(e.skills);
  let ie;
  if (e.agents) ie = parseAgentsFromJson(e.agents, "flagSettings");
  let Se = () => getActiveAgentsFromList(ie ? [...P(), ...ie] : P());
  if (w.agent) {
    let settings = isParkedSpare(),
      St = !settings && getSpareClaimState() !== "none",
      wt = seatMainThreadAgentFromPool(Se(), w, S, { deferInitialPrompt: settings });
    if (((ce = wt.restrictedAgentModel), !wt.seatedNow && wt.agent?.initialPrompt && !settings && !St))
      S.prependUserMessage(wt.agent.initialPrompt, "person");
  }
  if (e.hooks) buildSdkHookRegistrations(e.hooks, (We, St) => S.createHookCallback(We, St), S);
  if (e.jsonSchema) setInitJsonSchema(e.jsonSchema);
  if (isParkedSpare() && e.workspaceTrust !== void 0)
    logForDebugging(
      "initialize: workspaceTrust ignored on a parked spare (--await-claim) \u2014 send workspace_trust with claim_session",
      { level: "warn" },
    );
  let me = await applyWorkspaceTrust(S.hostOwnsStdinOrigin && !isParkedSpare() ? e.workspaceTrust : void 0, {
      cwd: getCwd(),
      trustedNetworkDirectories: L().toolPermissionContext.trustedNetworkDirectories,
      storageV5: w.storageV5,
    }),
    Me = Z();
  if (Me !== void 0) await Me;
  let accountInfo = y(),
    He = await _buildInitializeResponsePayloadForTesting(
      h,
      Se(),
      accountInfo.models,
      accountInfo.unavailable,
      L,
      x(),
      () => S.sessionState.getState(),
      e.hooks ? !0 : void 0,
      applyInitializePlugins(e.plugins),
      me,
      G,
      w.storageV5,
      () => ({
        redactsWhatItPersists: re,
        isRemoteTransport: S.isRemoteTransport(),
        sessionWriters: S.sessionWriters(),
      }),
      Ue,
    );
  s.enqueue({
    type: "control_response",
    response: {
      subtype: "success",
      request_id: n,
      response: withHostWordedAsks(
        { ...He, ...(nt !== void 0 && { code_running_mcp_tools_applied: nt }) },
        S,
        w,
      ),
      pending_permission_requests: S.getPendingPermissionRequests(),
      pending_user_dialog_requests: S.getPendingUserDialogRequests(),
      pending_elicitation_requests: S.getPendingElicitationRequests(),
    },
  });
  let mcp = L().mcp;
  if (
    (logEvent("tengu_sdk_init_handshake", {
      uptime_ms: Math.round(process.uptime() * 1000),
      mcp_client_count: mcp.clients.length,
      mcp_pending_count: count(mcp.clients, (matcher) => matcher.type === "pending"),
      mcpNonBlocking: getMcpConnectNonBlocking(),
      session_mirror: !!w.sessionMirror,
    }),
    R)
  ) {
    let status = AwsAuthStatusManager.getInstance().getStatus();
    if (status)
      s.enqueue({
        type: "auth_status",
        isAuthenticating: status.isAuthenticating,
        output: status.output,
        error: status.error,
        uuid: randomUUID_19(),
        session_id: getSessionId(),
      });
  }
  return { restrictedAgentModel: ce, mergedStdinAgents: ie, publishedCommands: He.commands };
}
/**
 * 构造 initialize 响应负载：commands、agents、output_style、models、account、pid、claude_code_version 等。
 */
//@ chunk-tyg7f3ek.js:861179-863492 layout
async function _buildInitializeResponsePayloadForTesting(e, n, r, s, h, y, S, R, w, P, L, q, x, G) {
  let re = getSettings_DEPRECATED()?.outputStyle || DEFAULT,
    Ae = await getAllOutputStylesCached(getCwd(), q),
    Ue = getAccountInformation(),
    mode = h().toolPermissionContext.mode,
    nt =
      isVsCodeTopSession() && isHarborWillowEnabled()
        ? shouldShowAutoDefaultNudge(h().toolPermissionContext, { requireOnboarding: !1 })
        : null,
    ie = {
      commands: toSlashCommands(e()),
      agents: n.map((He) => ({ name: He.agentType, description: He.whenToUse, model: He.model })),
      output_style: re,
      available_output_styles: Object.keys(Ae),
      user_output_styles_dir: H6s(),
      models: r,
      ...(s.length > 0 && { unavailable_models: s }),
      account: {
        email: Ue?.email,
        organization: Ue?.organization,
        subscriptionType: Ue?.subscription,
        tokenSource: Ue?.tokenSource,
        apiKeySource: Ue?.apiKeySource,
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
        vS() &&
        isBridgeInboundReadReceiptsEnabled() && { inbound_read_receipts: !0 }),
      hooks_applied: R,
      plugins_applied: w,
      workspace_trust_recorded: P,
      sdk_mcp_manifests_parked: L,
      ...(isVsCodeTopSession() && {
        permission_mode_from_default_fallback: isAutoModeFromFallback() && mode === "auto",
        ...(nt && { auto_default_nudge: toExternalPermissionMode(nt) }),
      }),
      feedback_survey_config: vscodeSurveyConfig(),
      survey_followup_box: feedbackSurveyCapabilities(),
      feedback_mode: headlessFeedbackMode(),
      analytics_disabled: isFirstPartyTelemetryBlocked(),
      proactivity: proactivityStateStub(h()),
      footer_indicator: getFooterIndicator(),
    },
    Se = getExplicitRemoteControlAtStartup(),
    me = !isRunningInRemoteEnvironment() && (Se ?? getCcrAutoConnectDefault());
  if (
    ((ie.remote_control_auto_enable = me),
    (ie.remote_control_auto_connect_default = !isRunningInRemoteEnvironment() && getCcrAutoConnectDefault()),
    (ie.remote_control_available = isRemoteControlDeploymentAvailable()),
    isVsCodeTopSession())
  )
    ie.claude_in_chrome_at_startup = await import("./chunk-e2839z0z.js").then(
      ({ claudeInChromeDefaultForHost: claudeInChromeDefaultForHost }) => claudeInChromeDefaultForHost(),
      (He) => (logError(He), !1),
    );
  if (env.CLAUDE_CODE_DISABLE_CFC_PROMPT === !0) ie.claude_in_chrome_prompt_disabled = !0;
  ((ie.remote_control_auto_on_by_default = me && Se === void 0),
    (ie.ide_rc_auto_enable_gate = getFeatureValue_CACHED_MAY_BE_STALE("tengu_ide_rc_auto_enable", !1)));
  let Me = h();
  ((ie.fast_mode_state = getFastModeState(y ?? null, Me.fastMode)),
    (ie.fast_mode_disabled_reason =
      getFastModeUnavailableReasonCode(y ?? null) ?? getFastRejectedReason(y ?? null, Me.fastMode) ?? void 0),
    (ie.session_state = S()));
  let Ee = [
    ...uiSurfaceCapabilities(x),
    ...uiHookedCapabilities(x),
    ...(ejn(x()) ? [MCP_CALL_RESULT_NOT_FOR_MODEL_V1] : []),
    ...(shouldOfferLinuxSandboxHint(G()) ? [START_SHELL_TASK_V1] : []),
  ];
  if (Ee.length > 0) ie.capabilities = Ee;
  return ie;
}
/**
 * 处理 rewind_files：检查文件历史检查点，dry-run 或回滚文件。
 */
//@ chunk-tyg7f3ek.js:863492-863977 fingerprint = handleRewindFiles (0.957)
async function handleRewindFiles(e, n, r) {
  if (!fileHistoryEnabled()) return { canRewind: !1, error: "File rewinding is not enabled." };
  if (!fileHistoryCanRestore(n.fileHistory, e))
    return { canRewind: !1, error: "No file checkpoint found for this message." };
  if (r) {
    let diffStats = await fileHistoryGetDiffStats(n.fileHistory, e);
    return {
      canRewind: !0,
      filesChanged: diffStats?.filesChanged,
      insertions: diffStats?.insertions,
      deletions: diffStats?.deletions,
    };
  }
  let s;
  try {
    s = await fileHistoryRewind(() => n.fileHistory, e);
  } catch (error) {
    return { canRewind: !1, error: `Failed to rewind: ${errorMessage(error)}` };
  }
  return { canRewind: !0, skippedLinks: s?.skippedLinks };
}
/**
 * 处理 channel_enable：为已连接的插件 MCP 服务器注册频道通知。
 */
//@ chunk-tyg7f3ek.js:863977-865145 fingerprint = handleChannelEnable (0.902)
function handleChannelEnable(e, n, r, s, h) {
  let respondError = (error) => s.enqueue(controlErrorResponse(e, error)),
    connection = r.find((Z) => Z.name === n && Z.type === "connected");
  if (!connection || connection.type !== "connected")
    return respondError(`server ${sanitizeTelemetryString(n)} is not connected`);
  let pluginSource = connection.config.pluginSource,
    parsed = pluginSource ? parsePluginIdentifier_2(pluginSource) : void 0;
  if (!parsed?.marketplace)
    return respondError(
      `server ${sanitizeTelemetryString(n)} is not plugin-sourced; channel_enable requires a marketplace plugin`,
    );
  let entry = { kind: "plugin", name: parsed.name, marketplace: parsed.marketplace },
    prior = getAllowedChannels(),
    already = prior.some(
      (Z) => Z.kind === "plugin" && Z.name === entry.name && Z.marketplace === entry.marketplace,
    );
  if (!already) setAllowedChannels([...prior, entry]);
  let x = gateChannelServer(n, connection.capabilities, pluginSource, connection.protocolEra);
  if (x.action === "skip") {
    if (!already) setAllowedChannels(prior);
    return respondError(x.reason);
  }
  let G = dpe(`${entry.name}@${entry.marketplace}`);
  (logMCPDebug(n, "Channel notifications registered"),
    logEvent("tengu_mcp_channel_enable", { plugin: G }),
    onMcpNotification(connection, ChannelMessageNotificationSchema(), async (notification) => {
      if (!isChannelsEnabled()) return;
      let { content: content, meta: meta } = notification.params;
      (logMCPDebug(n, `notifications/claude/channel: ${content.slice(0, 80)}`),
        logEvent("tengu_mcp_channel_message", {
          content_length: content.length,
          meta_key_count: Object.keys(meta ?? {}).length,
          entry_kind: lit("plugin"),
          is_dev: !1,
          plugin: G,
        }),
        h.enqueue({
          mode: "prompt",
          agentId: mainAgentId(),
          value: wrapChannelMessage(n, content, meta),
          priority: "next",
          isMeta: !0,
          origin: { kind: "channel", server: n },
          skipSlashCommands: !0,
          skipAttachments: !0,
        }));
    }),
    s.enqueue(controlSuccessResponse(e)));
}
//@ chunk-tyg7f3ek.js:865145-865881 fingerprint = reregisterChannelHandlerAfterReconnect (0.926)
function reregisterChannelHandlerAfterReconnect(e, n) {
  if (e.type !== "connected") return;
  if (gateChannelServer(e.name, e.capabilities, e.config.pluginSource, e.protocolEra).action !== "register")
    return;
  let entry = findChannelEntry(e.name, getAllowedChannels()),
    pluginId = entry?.kind === "plugin" ? dpe(`${entry.name}@${entry.marketplace}`) : void 0;
  (logMCPDebug(e.name, "Channel notifications re-registered after reconnect"),
    onMcpNotification(e, ChannelMessageNotificationSchema(), async (notification) => {
      if (!isChannelsEnabled()) return;
      let { content: content, meta: meta } = notification.params;
      (logMCPDebug(e.name, `notifications/claude/channel: ${content.slice(0, 80)}`),
        logEvent("tengu_mcp_channel_message", {
          content_length: content.length,
          meta_key_count: Object.keys(meta ?? {}).length,
          entry_kind: fromEnumOpt(entry?.kind),
          is_dev: entry?.dev ?? !1,
          plugin: pluginId,
        }),
        n.enqueue({
          mode: "prompt",
          agentId: mainAgentId(),
          value: wrapChannelMessage(e.name, content, meta),
          priority: "next",
          isMeta: !0,
          origin: { kind: "channel", server: e.name },
          skipSlashCommands: !0,
          skipAttachments: !0,
        }));
    }));
}
/**
 * 每轮开始前等待文件存储 worker 拉取同步（turn hold 参与者）。
 */
//@ chunk-tyg7f3ek.js:865881-866114 layout
function dirSyncPullParticipant(e, n, r, s = !1) {
  return {
    name: "file_store_worker",
    beforeTurn: async ({ signal: signal }) => {
      let y = await (s
        ? Promise.race([
            e,
            raceWithAbortSignal(e, signal, () => new AbortError()).catch(() => {
              return;
            }),
          ])
        : e);
      if (y === void 0) return TURN_GATE_READY;
      try {
        await y?.beforeTurn(signal);
      } finally {
      }
      return TURN_GATE_READY;
    },
  };
}
/**
 * 每轮开始前等待云端 home 设置种子写入完成（turn hold 参与者）。
 */
//@ chunk-tyg7f3ek.js:866114-866265 layout
function homeSeedHoldParticipant({ handle: handle, record: record }) {
  return {
    name: "home_settings_seed",
    beforeTurn: async ({ signal: signal }) => (
      record.markTurnAtHold(),
      await (await handle)?.beforeTurn(signal),
      TURN_GATE_READY
    ),
  };
}
//@ chunk-tyg7f3ek.js:866265-866738 layout
function startCloudHomeSeedParticipant({
  record: record,
  configHome: configHome,
  foreignFiles: foreignFiles,
  takes: takes,
  session: session,
  repoRoot: repoRoot,
  storageV5: storageV5,
  workerDirSync: workerDirSync,
}) {
  return {
    handle: import("./chunk-twq47pff.js")
      .then((P) => {
        let startCloudHomeSeed = P.startCloudHomeSeed({
          session: session,
          record: record,
          configHome: configHome,
          foreignFiles: foreignFiles,
          takes: takes,
          repoRoot: repoRoot,
          storageV5: storageV5,
        });
        return (
          workerDirSync
            ?.then((q) => {
              if (q === null)
                (logForDiagnosticsNoPII("warn", "home_seed_stopped_no_file_store_worker", {}),
                  startCloudHomeSeed.stop());
            })
            .catch(() => {}),
          startCloudHomeSeed
        );
      })
      .catch(
        (P) => (
          logForDiagnosticsNoPII("warn", "home_seed_worker_start_failed", { name: safeErrorName(P) }),
          null
        ),
      ),
    record: record,
  };
}
//@ chunk-tyg7f3ek.js:866738-866867 layout
function shortErrorText(e) {
  try {
    let trimEnd = Yn(getFirstLine(errorMessage(e))).trimEnd(),
      r = truncateToLength(trimEnd, 200);
    return r.length < trimEnd.length ? `${r}\u2026` : r;
  } catch {
    return "unknown error";
  }
}
//@ chunk-tyg7f3ek.js:866867-867186 layout
function logHeadlessFatalError(e, n) {
  (logError(e),
    logEvent("tengu_headless_fatal_error", {
      site: fromEnum(n.site),
      message_type: fromEnumOpt(n.message?.type),
      control_subtype: fromEnumOpt(
        n.message?.type === "control_request" ? n.message.request.subtype : void 0,
      ),
      drained_message_count: n.drainedMessageCount,
      outstanding_stdout_bytes: outstandingStdoutBytes(),
      stdout_destroyed: process.stdout.destroyed,
      ...errorTelemetryFields_2(e),
    }));
}
/**
 * headless 输出写入失败时结束会话：记录致命错误、尽量写最后一条错误、退出。
 */
//@ chunk-tyg7f3ek.js:867186-867842 layout
async function endHeadlessSessionOnOutputWriteFailure(e, n, r, s, h) {
  if (isTerminalShutdown()) {
    logForDebugging(`Headless output write failed during shutdown (${r.type})`);
    return;
  }
  let y = isBridgeOrTransport(e);
  transportStateByHost.of(e).setActive(void 0);
  try {
    logHeadlessFatalError(s, { site: "output_drain", message: r, drainedMessageCount: h });
  } catch {}
  try {
    let S = y ? "transport write failure" : shortErrorText(s),
      R = (P) =>
        `Could not write a message to the output stream (${P}); the session has ended.` +
        (isSessionPersistenceDisabled() ? "" : " You can resume this conversation.");
    if (
      (process.stderr.write(`Error: ${R(shortErrorText(s))}
`),
      y)
    )
      logForDebugging(`output write failure detail: ${shortErrorText(s)}`, { level: "error" });
    let w = R(S);
    try {
      (publishFailedSummary(n.sessionState, w), await n.write(emitLoadError(getSessionId(), [w])));
    } catch {}
    await Promise.race([n.flushSessionState(), sleep(5000, void 0, { unref: !0 })]);
  } catch {}
  gracefulShutdownSync(1);
}
/**
 * runHeadless 抛出未捕获错误时结束会话：停止保留流事件、写错误结果、退出 1。
 */
//@ chunk-tyg7f3ek.js:867842-868162 layout
function endHeadlessSessionOnEscapedError(e, n, r) {
  if (isTerminalShutdown()) {
    logForDebugging("runHeadless rejected during shutdown");
    return;
  }
  let of = transportStateByHost.of(e),
    h = of.active?.resultDelivery?.numbered ?? null;
  (of.active?.stopHoldingStreamEvents(), of.setActive(void 0));
  try {
    logHeadlessFatalError(n, { site: "run_headless" });
  } catch {}
  try {
    writeStartupFailure(`An internal error ended the session (${shortErrorText(n)}).`, r, { resultIndex: h });
  } catch {}
  gracefulShutdownSync(1);
}
/**
 * 写启动失败：stderr 输出；stream-json 时再输出一行 result 错误（带 startupFailureReason）。
 */
//@ chunk-tyg7f3ek.js:868162-868359 layout
function writeStartupFailure(
  e,
  n,
  { resultIndex: resultIndex = 0, startupFailureReason: startupFailureReason } = {},
) {
  if (
    (process.stderr.write(
      e +
        `
`,
    ),
    logForDebugging(e, { level: "error" }),
    n === "stream-json")
  )
    writeToStdout(
      ndjsonStringify(
        buildStartupFailureResult({
          sessionId: getSessionId(),
          message: e,
          reason: startupFailureReason,
          resultIndex: resultIndex,
        }),
      ) +
        `
`,
    );
}
//@ chunk-tyg7f3ek.js:868359-868497 layout
function exitIfEndedByModel(e, n) {
  if (e?.endedByModel)
    return (
      writeStartupFailure(
        withTaskSuffix("Claude ended this conversation. Start a new session to continue."),
        n,
      ),
      gracefulShutdownSync(1),
      !0
    );
  return !1;
}
//@ chunk-tyg7f3ek.js:868497-869738 layout
async function refuseUnsafeWorktreeResume(e, n, r, s) {
  let h = getOriginalCwd(),
    y = null;
  try {
    y = restoreWorktreeForResume(loe.of(e.host), n, void 0, { storageV5: r.storageV5 });
  } catch (error) {
    logError(error);
  }
  if (y && !y.poisoned)
    return (
      writeStartupFailure(worktreeResumeRefusalError(y).trimEnd(), s, {
        startupFailureReason: y.reason === "unverifiable" ? "worktree_unverified" : "worktree_resume_refused",
      }),
      gracefulShutdownSync(1),
      !0
    );
  let S = r.persist && !isTranscriptPersistenceDisabled();
  if (y && y.reason !== "worktree-gone" && !S)
    return (
      writeStartupFailure(worktreeResumeRefusalError(y, { bindingCleared: !1 }).trimEnd(), s, {
        startupFailureReason: "worktree_resume_refused",
      }),
      gracefulShutdownSync(1),
      !0
    );
  if (!y && getOriginalCwd() !== h && isToolSandboxActive()) {
    if (
      (await withDeadline(
        initializeGrowthBook().catch(() => null),
        kz,
      ),
      readFlagWithOverride(TENGU_ANCHORED_LANTERN, { safe: !0 }))
    ) {
      let R = !1;
      try {
        R = SandboxManager.refreshConfig();
      } catch (error) {
        reportSandboxErrorUnderStandIn(error, "configNotRebuilt");
      }
      if (!R)
        return (
          logFeatureBad("sandbox_resume_rebuild", "rebuild_failed"),
          writeStartupFailure(
            "Error: could not apply the sandbox's protections to this session's worktree, so the session was not resumed. Run the resume again. If it fails the same way, check the sandbox paths in your settings, or re-run with --fork-session to continue without the worktree.",
            s,
          ),
          gracefulShutdownSync(1),
          !0
        );
      logFeatureOk("sandbox_resume_rebuild");
    }
  }
  if (r.persist)
    if (isStorageV5Enabled() && r.storageV5 !== void 0) await adoptResumedSessionFileAsync(r.storageV5);
    else adoptResumedSessionFile();
  if (!y) return !1;
  if (y.reason === "worktree-gone")
    return (process.stderr.write(worktreeGoneHeadlessNotice(y, { bindingCleared: S })), !1);
  return (
    writeStartupFailure(worktreeResumeRefusalError(y, { bindingCleared: !0 }).trimEnd(), s, {
      startupFailureReason: "worktree_resume_refused",
    }),
    gracefulShutdownSync(1),
    !0
  );
}
/**
 * 声明本进程拥有费用账本并在退出时保存费用状态（diskless 时不做）。
 */
//@ chunk-tyg7f3ek.js:869738-869795 layout
function ownCostLedger() {
  if (isTranscriptPersistenceDisabled()) return () => {};
  return (claimCostLedgerForCurrentSession(), registerTranscriptExitReStamp(resetCostState));
}
//@ chunk-tyg7f3ek.js:869795-869960 layout
function queueMemoryNotices(e) {
  let n = restoredMemoryPauseNotice();
  if (n !== void 0) reportStartupModelNotice(n, { key: "memory-paused", outputFormat: e });
  let r = restoredAutoMemorySessionNotice();
  if (r !== void 0) reportStartupModelNotice(r, { key: "session-auto-memory-off", outputFormat: e });
}
/**
 * 加载 -p 模式的初始消息：--continue 取最近会话，--resume 按 ID/名称/文件恢复（含 --resume-session-at 截断、--fork-session），失败写启动失败结果。
 */
//@ chunk-tyg7f3ek.js:869960-882005 fingerprint = loadInitialMessages (0.315)
async function loadInitialMessages(e, n, r, s) {
  let persistSession = !isSessionPersistenceDisabled();
  if (s.continue)
    try {
      logEvent("tengu_continue_print", {});
      let { clearSessionCaches: clearSessionCaches } = await import("./chunk-e1mchg1t.js");
      clearSessionCaches(e, void 0, void 0, void 0, s.storageV5);
      let R,
        restoredWorkerState = await s.restoredWorkerState;
      restoreChromeSetupOfferState(restoredWorkerState);
      let P = pendingActionToolUseIds(restoredWorkerState, s.tools ?? []),
        L = await loadConversationForResume(void 0, void 0, {
          forkSession: !!s.forkSession,
          ...(s.sdkUrl && { acceptCustomIds: !0 }),
          storageV5: s.storageV5,
          credentials: s.credentials,
          ...precomputeResumeHooks(e.precompute, s.storageV5, { forkSession: !!s.forkSession }),
          onNewestRunningInBackground: (q) => {
            R = q;
          },
          ...(P.size > 0 && { hostAnswerableToolUseIds: P }),
          restoredCardToolUseId: singlePendingAction(await s.restoredWorkerState),
          restoredPromptWaits: hasPendingActions(await s.restoredWorkerState),
        });
      if (L) s.onFreshSessionStartRows?.(await appendSessionStartRows(L));
      if (exitIfEndedByModel(L, s.outputFormat)) return { messages: [] };
      if (!L && R !== void 0)
        return (
          await logEventAsync("tengu_continue", { success: !1, entrypoint: lit("print") }),
          writeStartupFailure(backgroundSessionMovedNotice(R), s.outputFormat, {
            startupFailureReason: "session_held_by_background",
          }),
          gracefulShutdownSync(1),
          { messages: [], aborted: !0 }
        );
      if (L) {
        let warning = bl.matchSessionMode(L.mode);
        if (warning) {
          process.stderr.write(
            warning +
              `
`,
          );
          let re = await reloadAgentDefinitionsForModeSwitch(getCwd(), s.cliAgents ?? [], s.storageV5);
          n((prev) => ({ ...prev, agentDefinitions: re }));
        }
        let { adoptedSessionId: adoptedSessionId, effectiveFork: effectiveFork } =
          resolveResumeSessionAdoption(L.sessionId, !!s.forkSession, { acceptCustomIds: !!s.sdkUrl });
        if (adoptedSessionId) {
          if (
            (switchSession(adoptedSessionId, "resume", L.fullPath ? dirname(L.fullPath) : null),
            persistSession)
          )
            await resetSessionFilePointer();
        }
        restoreSessionStateFromLog(L, n, r, { preserveLiveBudget: !1 });
        let Z = restorePlanModeFromTranscriptOnly(L.messages, s, n);
        if (effectiveFork) {
          if (
            (await adoptForkSessionMetadata(L, {
              stripWorktreeSession: !0,
              stripRelocatedCwd: !0,
              storageV5: s.storageV5,
            }),
            L.contentReplacements?.length)
          )
            await recordContentReplacement(L.contentReplacements, void 0, s.storageV5);
        } else
          (restoreSessionMetadata(L, { storageV5: s.storageV5 }),
            reclaimSessionNameAtStart(s).catch(logError));
        if ((queueMemoryNotices(s.outputFormat), setCostStateForRestore(L), !effectiveFork)) {
          let re = persistSession && !!adoptedSessionId;
          if (
            await refuseUnsafeWorktreeResume(
              e,
              L.worktreeSession,
              { persist: re, storageV5: s.storageV5 },
              s.outputFormat,
            )
          )
            return { messages: [], aborted: !0 };
        }
        return (
          saveMode(bl.isCoordinatorMode() ? "coordinator" : "normal"),
          {
            messages: L.messages,
            turnInterruptionState: L.turnInterruptionState,
            supersededToolUseIds: L.supersededToolUseIds,
            supersededToolNames: L.supersededToolNames,
            answeredToolUseIds: L.answeredToolUseIds,
            rescueSuppressed: L.rescueSuppressed,
            deferredToolUse: L.deferredToolUse,
            agentSetting: L.agentSetting,
            sessionProjectPath: L.projectPath,
            planModeOnResume: Z,
            resumedAsFork: effectiveFork,
          }
        );
      }
      logEvent("tengu_continue", { success: !1, entrypoint: lit("print") });
    } catch (error) {
      if (error instanceof ResumeRefusedError)
        return (
          await logEventAsync("tengu_continue", {
            success: !1,
            entrypoint: lit("print"),
            error_name: sanitizedErrorNameForTelemetry(error),
          }),
          writeStartupFailure(`${ym}: ${error.message}`, s.outputFormat),
          gracefulShutdownSync(1),
          { messages: [], aborted: !0 }
        );
      return (logError(error), gracefulShutdownSync(1), { messages: [] });
    }
  if (s.teleport)
    try {
      await waitForPolicyLimitsToLoad();
      let S = cloudSessionsUnavailableReason();
      if (S) throw (await logOrgPolicyDeniedAsync("allow_remote_sessions", "cloud_session"), Error(S));
      if ((logEvent("tengu_teleport_print", {}), typeof s.teleport !== "string"))
        throw Error("No session ID provided for teleport");
      let { clearSessionCaches: clearSessionCaches } = await import("./chunk-e1mchg1t.js");
      clearSessionCaches(e, void 0, void 0, void 0, s.storageV5);
      let {
        checkOutTeleportedSessionBranch: checkOutTeleportedSessionBranch,
        processMessagesForTeleportResume: processMessagesForTeleportResume,
        teleportResumeCodeSession: teleportResumeCodeSession,
        validateGitState: validateGitState,
      } = await import("./chunk-djvrn9k9.js");
      await validateGitState();
      let teleportResult = await teleportResumeCodeSession(s.teleport),
        { branchError: branchError } = await checkOutTeleportedSessionBranch(teleportResult.branch);
      return {
        messages: processMessagesForTeleportResume(
          teleportResult.log,
          branchError,
          teleportResult.environmentKind,
        ),
        messagesOrigin: "remote",
      };
    } catch (error) {
      return (
        logForDebugging(`Teleport in print mode failed: ${errorMessage(error)}`, { level: "error" }),
        gracefulShutdownSync(1),
        { messages: [] }
      );
    }
  if (s.resume) {
    let S = "load_error",
      startTime = performance.now(),
      w = s.sdkUrl ? startResumeLoadHold() : void 0;
    try {
      logEvent("tengu_resume_print", {});
      let P = typeof s.resume === "string" ? s.resume.trim() : "",
        parsedSessionId = parseSessionIdentifier(P);
      if (!parsedSessionId && P) {
        let Ee = await searchSessionsByCustomTitle(P, { exact: !0 }, s.storageV5);
        if (Ee.length === 1) {
          let He = getSessionIdFromLog(Ee[0]);
          if (He) parsedSessionId = parseSessionIdentifier(He);
        } else if (Ee.length > 1) {
          let joined = Ee.map(
            (Xe) => `  ${getSessionIdFromLog(Xe) ?? "(unknown)"}  (modified ${Xe.modified.toISOString()})`,
          ).join(`
`);
          return (
            logEvent("tengu_session_resumed", {
              entrypoint: lit("print"),
              success: !1,
              failure_reason: lit("not_found_explicit_id"),
            }),
            writeStartupFailure(
              `Error: --resume "${P}" matches ${Ee.length} sessions. Pass one of these session IDs to disambiguate:
${joined}`,
              s.outputFormat,
            ),
            gracefulShutdownSync(1),
            { messages: [] }
          );
        }
      }
      if (!parsedSessionId) {
        let Ee =
          "Error: --resume requires a valid session ID or session title when used with --print. Usage: claude -p --resume <session-id|title>";
        if (P) Ee += `. Provided value "${P}" is not a UUID and does not match any session title.`;
        return (
          logEvent("tengu_session_resumed", {
            entrypoint: lit("print"),
            success: !1,
            failure_reason: lit("not_found_explicit_id"),
          }),
          writeStartupFailure(Ee, s.outputFormat),
          gracefulShutdownSync(1),
          { messages: [] }
        );
      }
      let { clearSessionCaches: clearSessionCaches } = await import("./chunk-e1mchg1t.js");
      clearSessionCaches(e, void 0, void 0, void 0, s.storageV5);
      let x = null;
      if (s.sdkUrl) {
        let startTime = performance.now();
        s.restoredWorkerState.then(() =>
          Br("resume_worker_init_join_ms", performance.now() - startTime, startTime),
        );
        let [He, Xe] = await Promise.all([
          (s.hydratePrefetch ?? Promise.resolve(null)).then(async (St) => {
            (oyi(St, startTime), setTranscriptLocalGcEnabled(UDs()));
            try {
              return await hydrateFromCCRv2InternalEvents(
                parsedSessionId.sessionId,
                St,
                isCcrSubagentSkipOnDeltaGateOn(),
                s.storageV5,
                s.onDiskBehind,
                HPr(),
              );
            } finally {
              for (let wt of [St?.[0], St?.[1]]) if (wt) wt.events.length = 0;
            }
          }),
          s.restoredWorkerState,
          getSnapshotStore().restore(ap()),
        ]);
        Br("resume_hydrate_ms", performance.now() - startTime, startTime);
        let We = await reportCcrHistoryLoadFailure(He);
        if (We === "stopping") return { messages: [], aborted: !0 };
        if (We)
          return (
            logEvent("tengu_session_resumed", {
              entrypoint: lit("print"),
              success: !1,
              failure_reason: fromEnum(We.reason),
            }),
            writeStartupFailure(`${ym}: ${We.sentence}`, s.outputFormat),
            gracefulShutdownSync(1),
            { messages: [], aborted: !0 }
          );
        if (((x = Xe), Xe?.readFailed === !0 && mn())) {
          if (isShuttingDown()) return { messages: [], aborted: !0 };
          if (
            (await withDeadline(
              initializeGrowthBook().catch(() => null),
              fa,
            ),
            !readFlagWithOverride("tengu_ccr_unread_state_exit_killswitch", { safe: !1 }))
          )
            return (
              logEvent("tengu_session_resumed", {
                entrypoint: lit("print"),
                success: !1,
                failure_reason: lit("worker_state_unread"),
              }),
              writeStartupFailure(
                "Error: this worker could not read the session's stored state and will not start a turn without it (worker_state_unread)",
                s.outputFormat,
              ),
              gracefulShutdownSync(1),
              { messages: [], aborted: !0 }
            );
        }
        if (Xe?.external || Xe?.internal)
          (n(sessionMetadataToAppState(Xe)), applyModelSetting(Xe.external?.model, n));
      } else if (parsedSessionId.isUrl && parsedSessionId.ingressUrl && isEnvTruthy("true"))
        await hydrateRemoteSession(parsedSessionId.sessionId, parsedSessionId.ingressUrl, s.storageV5);
      if (!s.forkSession) {
        let startTime = performance.now(),
          result = await findBackgroundSessionHolder(parsedSessionId.sessionId, s.storageV5);
        if ((Br("resume_live_check_ms", performance.now() - startTime, startTime), result)) {
          let Xe =
            s.liveBackgroundHandoff !== void 0
              ? await s.liveBackgroundHandoff.open({
                  holder: result,
                  entrypoint: "print",
                  prompt: s.liveBackgroundHandoff.prompt,
                  storageV5: s.storageV5,
                })
              : void 0;
          return (
            writeStartupFailure(
              `Error: ${formatSessionRunningInBackground({ holder: result, canFork: !0, handoff: Xe })}`,
              isStartupFailureResultRequested() ? s.outputFormat : void 0,
              { startupFailureReason: "session_held_by_background" },
            ),
            gracefulShutdownSync(1),
            { messages: [], aborted: !0 }
          );
        }
      }
      let G = !parsedSessionId.jsonlFile ? await vAs(parsedSessionId.sessionId) : void 0,
        startTime_2 = performance.now(),
        re =
          (await s.remoteControlForkChild?.adoptSeed({
            sha256: x?.internal?.fork_seed_sha256 ?? void 0,
            unread: x === null || x.readFailed === !0,
          })) ?? null;
      restoreChromeSetupOfferState(x);
      let Ae = pendingActionToolUseIds(x, s.tools ?? []),
        Ue = env.CLAUDE_CODE_SESSION_BEGAN_AS_COPY === "1" || s.sessionBeganAsCopy === "1",
        ce = await loadConversationForResume(parsedSessionId.sessionId, parsedSessionId.jsonlFile || void 0, {
          forkSession: !!s.forkSession,
          ...(s.sdkUrl && { acceptCustomIds: !0 }),
          storageV5: s.storageV5,
          credentials: s.credentials,
          precedingRows: re ? { rows: re.rows, first: re.firstBoot } : void 0,
          ...(Ue && { copiedSessionOwnId: parsedSessionId.sessionId }),
          ...precomputeResumeHooks(e.precompute, s.storageV5, { forkSession: !!s.forkSession }),
          ...(Ae.size > 0 && { hostAnswerableToolUseIds: Ae }),
          restoredCardToolUseId: singlePendingAction(x),
          restoredPromptWaits: hasPendingActions(x),
        });
      if ((Br("resume_deserialize_ms", performance.now() - startTime_2, startTime_2), ce))
        s.onFreshSessionStartRows?.(
          await maybeWaitForSessionStartHooks(
            ce,
            s.sdkUrl && s.onOverdueSessionStartHooks
              ? { overdue: s.onOverdueSessionStartHooks, holdActivity: startResumeLoadHold }
              : void 0,
          ),
        );
      if (((S = "processing_error"), exitIfEndedByModel(ce, s.outputFormat))) return { messages: [] };
      if (!ce || (ce.messages.length === 0 && (parsedSessionId.isUrl || s.sdkUrl || !ce.sessionId)))
        if (parsedSessionId.isUrl || s.sdkUrl) {
          let Ee = [];
          if (isPersistentRemoteSessionEnabled()) {
            let CLAUDE_CODE_RESUME_FROM_SESSION = env.CLAUDE_CODE_RESUME_FROM_SESSION;
            if (CLAUDE_CODE_RESUME_FROM_SESSION)
              try {
                logForDebugging(
                  `[resume-from] Hydrating from source session ${CLAUDE_CODE_RESUME_FROM_SESSION}`,
                );
                let { prepareApiRequest: prepareApiRequest } = await import("./chunk-6phxatm7.js"),
                  {
                    teleportFromSessionsAPI: teleportFromSessionsAPI,
                    deserializeRemoteSessionLog: deserializeRemoteSessionLog,
                  } = await import("./chunk-djvrn9k9.js"),
                  {
                    accessToken: accessToken,
                    orgUUID: orgUUID,
                    profile: profile,
                  } = await prepareApiRequest(s.credentials),
                  { log: log } = await teleportFromSessionsAPI(
                    CLAUDE_CODE_RESUME_FROM_SESSION,
                    orgUUID,
                    accessToken,
                    profile,
                  );
                ((Ee = deserializeRemoteSessionLog(log)),
                  logForDebugging(
                    `[resume-from] Loaded ${Ee.length} messages from ${CLAUDE_CODE_RESUME_FROM_SESSION}`,
                  ));
              } catch (error) {
                logForDebugging(
                  `[resume-from] Failed to hydrate from ${CLAUDE_CODE_RESUME_FROM_SESSION}: ${errorMessage(error)}`,
                );
              }
          }
          let startTime = performance.now(),
            Xe = await (s.sessionStartHooksPromise ??
              runStartupHooks(e, {
                kind: "session-start",
                source: "startup",
                storageV5: s.storageV5,
                credentials: s.credentials,
              }));
          Br("hooks_init_ms", performance.now() - startTime, startTime);
          let We = dedupeSessionStartRows(Ee, Xe);
          s.onFreshSessionStartRows?.(We);
          let St = resolveResumeSessionAdoption(ce?.sessionId, !!s.forkSession, {
            acceptCustomIds: !!s.sdkUrl,
          });
          if (ce && St.adoptedSessionId)
            (switchSession(St.adoptedSessionId, "resume", ce.fullPath ? dirname(ce.fullPath) : null),
              restoreSessionMetadata(ce, { storageV5: s.storageV5 }));
          let wt = restorePlanModeOnResume(x, n, {
            lane: s.sdkUrl ? "sdk_url" : "print",
            forkSession: s.forkSession,
          });
          if (sc && s.sdkUrl) sc.noteTeleportBootUnreached("empty_hydration", s.relayAwaitsHandoff === !0);
          return {
            messages: [...Ee, ...We],
            ...(Ee.length > 0 && { messagesOrigin: "remote" }),
            planModeOnResume: wt,
            resumedAsFork: St.effectiveFork,
          };
        } else
          return (
            logEvent("tengu_session_resumed", {
              entrypoint: lit("print"),
              success: !1,
              failure_reason: lit("not_found_explicit_id"),
            }),
            writeStartupFailure(`${SESSION_NOT_FOUND_MESSAGE} ${parsedSessionId.sessionId}`, s.outputFormat),
            gracefulShutdownSync(1),
            { messages: [] }
          );
      if (s.resumeSessionAt) {
        let index = ce.messages.findIndex((message) => message.uuid === s.resumeSessionAt);
        if (index < 0)
          return (
            logEvent("tengu_session_resumed", {
              entrypoint: lit("print"),
              success: !1,
              failure_reason: lit("processing_error"),
            }),
            writeStartupFailure(
              `No message found with message.uuid of: ${s.resumeSessionAt}`,
              s.outputFormat,
            ),
            gracefulShutdownSync(1),
            { messages: [] }
          );
        let He = [];
        if (s.resumeDropsTurn !== void 0) {
          let St = findDeclaredTurnRange(ce.messages.slice(index + 1), s.resumeDropsTurn);
          if (!St.ok)
            return (
              logEvent("tengu_session_resumed", {
                entrypoint: lit("print"),
                success: !1,
                failure_reason: lit("drop_guard_refused"),
              }),
              writeStartupFailure(
                `${RESUME_DROPS_TURN_REJECTED_PREFIX} resuming at ${s.resumeSessionAt} would discard entries not attributable to turn ${s.resumeDropsTurn}: ${St.reason}`,
                s.outputFormat,
              ),
              gracefulShutdownSync(1),
              { messages: [] }
            );
          let { keep: keep } = St;
          He =
            keep && !re?.rows.some((Lt) => Lt.uuid === keep.uuid)
              ? [
                  createAttachmentMessage(keep.attachment, {
                    now: () => keep.timestamp,
                    uuid: () => randomUUID_19(),
                  }),
                ]
              : [];
        }
        let sliced = ce.messages.slice(0, index + 1),
          We = isAllInvisibleMeta(ce.messages.slice(index + 1)) ? null : threadAskMarkerFor(sliced);
        ce.messages = [...sliced, ...He, ...(We ? [createAttachmentMessage(We)] : [])];
      }
      let warning = bl.matchSessionMode(ce.mode);
      if (warning) {
        process.stderr.write(
          warning +
            `
`,
        );
        let Ee = await reloadAgentDefinitionsForModeSwitch(getCwd(), s.cliAgents ?? [], s.storageV5);
        n((He) => ({ ...He, agentDefinitions: Ee }));
      }
      let { adoptedSessionId: adoptedSessionId, effectiveFork: effectiveFork } = resolveResumeSessionAdoption(
        ce.sessionId,
        !!s.forkSession,
        { acceptCustomIds: !!s.sdkUrl },
      );
      if (adoptedSessionId) {
        if (
          (switchSession(adoptedSessionId, "resume", ce.fullPath ? dirname(ce.fullPath) : null),
          persistSession)
        )
          await resetSessionFilePointer();
      }
      restoreSessionStateFromLog(ce, n, r, { preserveLiveBudget: !1 });
      let me = re !== null ? new Set(re.rows.map((row) => row.uuid)) : void 0,
        Me = restorePlanModeOnResume(x, n, {
          lane: s.sdkUrl ? "sdk_url" : "print",
          forkSession: s.forkSession,
          transcript: {
            messages: ce.messages,
            sourceRows: me === void 0 ? ce.messages : ce.messages.filter((prev) => !me.has(prev.uuid)),
            sourceAllowed: isTranscriptPlanSourceAllowed(s),
          },
        });
      if (effectiveFork) {
        if (
          (await adoptForkSessionMetadata(ce, {
            stripWorktreeSession: !0,
            stripRelocatedCwd: !0,
            storageV5: s.storageV5,
          }),
          ce.contentReplacements?.length)
        )
          await recordContentReplacement(ce.contentReplacements, void 0, s.storageV5);
      } else
        (restoreSessionMetadata(ce, { storageV5: s.storageV5 }),
          reclaimSessionNameAtStart(s).catch(logError));
      if ((queueMemoryNotices(s.outputFormat), setCostStateForRestore(ce), !effectiveFork)) {
        let Ee = persistSession && !!adoptedSessionId;
        if (
          await refuseUnsafeWorktreeResume(
            e,
            ce.worktreeSession,
            { persist: Ee, storageV5: s.storageV5 },
            s.outputFormat,
          )
        )
          return { messages: [], aborted: !0 };
      }
      if (
        (saveMode(bl.isCoordinatorMode() ? "coordinator" : "normal"),
        logEvent("tengu_session_resumed", {
          entrypoint: lit("print"),
          success: !0,
          interruption_kind: fromEnum(ce.turnInterruptionState?.kind ?? "none"),
          resume_duration_ms: Math.round(performance.now() - startTime),
        }),
        sc && s.sdkUrl)
      ) {
        let startTime = performance.now();
        (await sc.bootTeleportFromTranscript(
          parsedSessionId.sessionId,
          ce.messages,
          s.storageV5,
          s.relayAwaitsHandoff === !0,
        ),
          Br("relay_marker_scan_ms", performance.now() - startTime, startTime));
      }
      return {
        messages: ce.messages,
        liveSourceRows: me,
        turnInterruptionState: ce.turnInterruptionState,
        supersededToolUseIds: ce.supersededToolUseIds,
        supersededToolNames: ce.supersededToolNames,
        answeredToolUseIds: ce.answeredToolUseIds,
        rescueSuppressed: ce.rescueSuppressed,
        deferredToolUse: ce.deferredToolUse,
        agentSetting: ce.agentSetting,
        sessionProjectPath: ce.projectPath,
        planModeOnResume: Me,
        transcriptAnchor: G,
        resumedAsFork: effectiveFork,
      };
    } catch (error) {
      let L = S;
      if (
        (logEvent("tengu_session_resumed", {
          entrypoint: lit("print"),
          success: !1,
          failure_reason: fromEnum(L),
          error_name: sanitizedErrorNameForTelemetry(toError(error)),
          error_code: sanitizedErrnoLowerForTelemetry(error),
        }),
        error instanceof ResumeRefusedError)
      );
      else if (L === "load_error" && (Qoe(error) || error instanceof ForkSeedUnverifiedError))
        logForDebugging(`--print resume load failed (${getErrnoCode(error)}): ${errorMessage(error)}`, {
          level: "error",
        });
      else logError(error);
      let q =
        error instanceof Error
          ? `${ym}: ${describeTranscriptLoadError(error, L)}`
          : `${ym} with --print mode`;
      return (
        writeStartupFailure(q, s.outputFormat),
        gracefulShutdownSync(1),
        error instanceof ResumeRefusedError ? { messages: [], aborted: !0 } : { messages: [] }
      );
    } finally {
      w?.();
    }
  }
  if (isParkedSpare()) return { messages: [] };
  let y = await (s.sessionStartHooksPromise ??
    runStartupHooks(e, {
      kind: "session-start",
      source: "startup",
      storageV5: s.storageV5,
      credentials: s.credentials,
    }));
  return (s.onFreshSessionStartRows?.(y), { messages: y });
}
/**
 * 会话恢复加载失败时给出人能看懂的原因：按存储错误码 ELOOP/ENXIO/EFBIG/EAGAIN 分别说明（符号链接、不是普通文件、超出大小限制、读取不一致），其他情况返回原始错误消息。
 */
//@ chunk-tyg7f3ek.js:882005-882991 sole-consumer
function describeTranscriptLoadError(error, phase) {
  if (phase !== "load_error") return error.message;
  let r = _et(error);
  if (r !== void 0) return r;
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
/**
 * 无头模式选输入输出通道：没有 sdkUrl 时用本地 StructuredIO；否则建 RemoteIO（会话入口认证头、worker epoch、turn_handoff 注册元数据、暂存文件回调），bridge 环境下登记受监管的桥接会话。
 */
//@ chunk-tyg7f3ek.js:882991-884037 sole-consumer
function createHeadlessIO(prompt, options, turnHandoff, carriedWrites, stageCallbacks) {
  let initialPromptLine =
      typeof prompt === "string" && prompt.trim() !== ""
        ? jsonStringify({
            type: "user",
            session_id: "",
            message: { role: "user", content: prompt },
            parent_tool_use_id: null,
          })
        : void 0,
    stdinLane = typeof prompt === "string" ? void 0 : prompt;
  if (!options.sdkUrl)
    return new StructuredIO(
      stdinLane ?? o4s(initialPromptLine === void 0 ? [] : [initialPromptLine]),
      options.replayUserMessages,
      options.sessionState,
    );
  let {
      environmentKind: environmentKind,
      workerEpoch: workerEpoch,
      hosting: hosting,
      reportParkAtInit: reportParkAtInit,
    } = options.earlyRemoteLink?.inputs ?? cliRemoteWorkerInputs(),
    rereadsIngressToken = environmentKind === null && !isReviewSession(),
    remoteIO = new RemoteIO({
      streamUrl: options.sdkUrl,
      initialPrompt: initialPromptLine,
      stdinLane: stdinLane,
      replayUserMessages: options.replayUserMessages,
      sessionState: options.sessionState,
      storageV5: options.storageV5,
      getAuthHeaders: getSessionIngressAuthHeaders,
      rereadMissingAuthHeaders: rereadsIngressToken ? rereadSessionIngressToken : void 0,
      sessionId: getSessionId(),
      workerEpoch: workerEpoch,
      environmentKind: environmentKind,
      isResume: hasResumeFlag(process.argv),
      earlyHydrateReads: options.earlyHydrateReads,
      earlyRemoteLink: options.earlyRemoteLink,
      reportParkAtInit: reportParkAtInit,
      hosting: hosting,
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
function u1(...e) {
  return [...mergeClients(...e), ...e.flat().filter(isCommsRoledServer)];
}
//@ chunk-j387qrdq.js:628-800 placement = finalContextTokensFromLastResponse (0.778)
function finalContextTokensFromLastResponse(messages) {
  if (messages == null || typeof messages.input_tokens !== "number") return;
  if (typeof messages.output_tokens === "number") return messages;
  return messages.output_tokens == null ? { ...messages, output_tokens: 0 } : void 0;
}
//@ chunk-j387qrdq.js:800-861 placement
function Sat(e) {
  return e.send_now === !0 && e.cancel_queued !== !0;
}
//@ chunk-j387qrdq.js:861-942 placement
function ers(e) {
  return typeof e === "string" && e.startsWith("late-bind-interrupt-");
}
//@ chunk-j387qrdq.js:942-950 placement
var u = 8;
/**
 * 解析"取消排队消息"控制请求的目标：给出 1 到上限个合法的用户消息 uuid 时，返回按 uuid（不区分大小写）匹配的判定函数。
 */
//@ chunk-j387qrdq.js:950-1212 placement
function parseCancelQueuedTarget(e) {
  let for_user_message_uuids = e.for_user_message_uuids;
  if (
    e.cancel_queued === !0 ||
    !Array.isArray(for_user_message_uuids) ||
    for_user_message_uuids.length === 0 ||
    for_user_message_uuids.length > u
  )
    return;
  let t = new Set();
  for (let r of for_user_message_uuids) {
    let o = Vt(r);
    if (o === null) return;
    t.add(o.toLowerCase());
  }
  return { names: (r) => r.some((o) => t.has(o.toLowerCase())) };
}
/**
 * 构造成功的 control_response 消息（request_id 与响应体）。
 */
//@ chunk-j387qrdq.js:1212-1314 placement
function controlSuccessResponse(e, n) {
  return { type: "control_response", response: { subtype: "success", request_id: e, response: n } };
}
/**
 * 构造错误的 control_response 消息（错误文本，可选错误码与模型）。
 */
//@ chunk-j387qrdq.js:1314-1470 placement
function controlErrorResponse(e, n, t, r) {
  return {
    type: "control_response",
    response: {
      subtype: "error",
      request_id: e,
      error: n,
      ...(t !== void 0 && { error_code: t }),
      ...(r !== void 0 && { model: r }),
    },
  };
}
/**
 * 构造加载失败时的 result 消息（subtype error_during_execution）。
 */
//@ chunk-j387qrdq.js:1470-1747 fingerprint = emitLoadError (0.898)
function emitLoadError(e, n, t) {
  return {
    type: "result",
    subtype: "error_during_execution",
    duration_ms: 0,
    duration_api_ms: 0,
    is_error: !0,
    num_turns: 0,
    stop_reason: null,
    session_id: e,
    total_cost_usd: 0,
    usage: EMPTY_USAGE,
    modelUsage: {},
    permission_denials: [],
    uuid: randomUUID(),
    errors: n,
    ...(t !== void 0 && { user_message_uuid: t }),
  };
}
/**
 * 排队的命令能否与前一条合并发送（同为普通 prompt 且来源允许）。
 */
//@ chunk-e6aww6q8.js:553953-554048 fingerprint = canBatchWith (0.667)
function canBatchWith(e) {
  return Ffe(e) && e.mode === "prompt" && e.shouldQuery !== !1 && !e.isMeta && A8t(e.origin);
}
/**
 * 为每条 assistant 生成“用户轮序号:message.id”键，其他消息为 undefined。
 */
//@ chunk-e6aww6q8.js:1818531-1818725 placement = isSystemLocalCommandMessage (1)
function assistantTurnKeys(message) {
  let n = 0;
  return message.map((r) => {
    if (r.type === "assistant") return `${n}:${String(r.message.id)}`;
    if (
      (r.type === "user" && !hasToolResultBlock(r)) ||
      (r.type === "system" && r.subtype === "local_command")
    )
      n += 1;
    return;
  });
}
/**
 * 从消息数组里删除被中断的消息及其后一条。
 */
//@ chunk-e6aww6q8.js:1830039-1830121 fingerprint = removeInterruptedMessage (1)
function removeInterruptedMessage(messages, interruptedUserMessage) {
  let idx = messages.findIndex((s) => s.uuid === interruptedUserMessage.uuid);
  if (idx !== -1) messages.splice(idx, 2);
}
/**
 * 把被中断的提示重新放回消息队列（interrupted_prompt）。
 */
//@ chunk-e6aww6q8.js:1830121-1830419 layout
function restoreInterruptedPrompt(e, n, r) {
  if (n?.kind !== "interrupted_prompt") return !1;
  let { message: message, tail: tail } = n,
    index = e.findIndex((G) => G.uuid === message.uuid);
  if (index === -1) return !1;
  let S = new Set(e.map((G) => G.uuid)),
    w = [];
  for (let G of r) if (!S.has(G.uuid)) (S.add(G.uuid), w.push(G));
  let L = tail !== void 0 && isPlainInterruptMarker(message);
  return (e.splice(L ? index : index + 1, 0, ...w), !0);
}
/**
 * 续写时删除哨兵后的 "(no content)" 占位 assistant，并在只剩系统消息时去掉 "Continue from where you left off." 提示（tengu_silly_waterfall 等开关）。
 */
//@ chunk-e6aww6q8.js:1830419-1831267 placement = isNotEmptyMessage (0.275)
function dropRedundantResumeMessages(e, n, r) {
  if (!n || n.kind === "none") return;
  let index = e.findIndex((w) => w.uuid === n.message.uuid),
    h =
      n.loaderSentinelUuid !== void 0
        ? e.findIndex((w) => w.uuid === n.loaderSentinelUuid)
        : index !== -1
          ? index + 1
          : -1,
    y = h !== -1 ? e[h] : void 0;
  if (
    y?.type === "assistant" &&
    Array.isArray(y.message.content) &&
    y.message.content.length === 1 &&
    y.message.content[0]?.type === "text" &&
    y.message.content[0].text === NO_RESPONSE_REQUESTED
  )
    (e.splice(h, 1), r(h));
  let sliced = e.slice(index + 1);
  if (
    index !== -1 &&
    wJo(e[index]) &&
    (isPrecededByToolResult(e, index) || getFeatureValue_CACHED_MAY_BE_STALE(TENGU_GOOFY_HARE, !1)) &&
    (sliced.every((w) => w.type === "system") ||
      (n.tail !== void 0 &&
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
              w.attachment.heldContent === void 0),
        ) &&
        getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WONDROUS_HAVEN, !1))) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_silly_waterfall", !1)
  )
    (e.splice(index, 1), r(index));
}
/**
 * 位置之前最近的 user/assistant 是工具结果消息。
 */
//@ chunk-e6aww6q8.js:1831267-1831380 placement
function isPrecededByToolResult(e, n) {
  let last = e.findLast((s, h) => h < n && (s.type === "user" || s.type === "assistant"));
  return last !== void 0 && isToolUseResultMessage(last);
}
/**
 * 从元数据读取禁用工具列表（最多 64 项，全部无效时返回 undefined）。
 */
//@ chunk-e6aww6q8.js:3260568-3260736 placement
function readDisallowedToolsMetadata(e) {
  let n = disallowedToolsSchema().safeParse(e).data?.disallowed_tools,
    r = n?.flatMap((s) => mcpToolNameSchema().safeParse(s).data ?? []).slice(0, 64);
  return r?.length === 0 && n?.length !== 0 ? void 0 : r;
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
var EMPTY_NAME_SET = new Set(),
  freeze = Object.freeze(Object.create(null));
//@ chunk-nkdv7dw8.js:8555-8742 sole-consumer
function carryConfiguredCommand(e, n) {
  return isStandardKeyActive() &&
    n?.configuredCommand !== void 0 &&
    "command" in e &&
    "command" in n &&
    e.command === n.command &&
    En(e.args ?? [], n.args ?? [])
    ? { ...e, configuredCommand: n.configuredCommand }
    : e;
}
/**
 * 处理 mcp_set_servers：按 SDK 给出的服务器集合增删改动态 MCP 服务器并重连。
 */
//@ chunk-nkdv7dw8.js:8742-12607 fingerprint = handleMcpSetServers (0.339)
async function handleMcpSetServers(e, n, o, s, r, u, S, y = !1, C = !1, E, D, x, h, L, q = EMPTY_NAME_SET) {
  if (C && Object.hasOwn(e, CLAUDE_CODE_REMOTE)) await awaitMcpPolicyColdStart({ hasDynamicMcpConfig: !0 });
  let B = !C
      ? e
      : xr(stripInternalMcpConfigFields(e), (O, R) => {
          if (env.CLAUDE_CODE_REMOTE) getServerUrl(R, O);
          return markCcrInjectedConfig(
            R,
            copyOwnServerMarks(e[R], carryConfiguredCommand(O, o.configs[R])),
            isLockedOutByOrgMcpPolicy,
          );
        }),
    F = new Set(
      (u?.()?.mcp.clients ?? [])
        .filter((O) => isBuiltinInProcessMcpServer(O.name) && !Object.hasOwn(o.configs, O.name))
        .map((O) => O.name),
    ),
    create = Object.create(null),
    create_2 = Object.create(null);
  for (let [O, R] of Object.entries(B)) {
    let j = R.type;
    if (F.has(O)) create[O] = BUILTIN_SERVER_IGNORED_REASON;
    else if (j === "sse-ide" || j === "ws-ide") create[O] = nt;
    else create_2[O] = R;
  }
  let z = new Set([...q].map(getPrefixServerKey)),
    create_3 = Object.create(null),
    create_4 = Object.create(null);
  for (let [O, R] of Object.entries(create_2))
    if (!Object.hasOwn(o.configs, O) && z.has(getPrefixServerKey(O)))
      create_3[O] = OPERATOR_SUPPLIED_IGNORED_TEXT;
    else create_4[O] = R;
  if (Object.values(create_4).some((O) => O.type !== "sdk"))
    await awaitMcpPolicyColdStart({ hasDynamicMcpConfig: !0 });
  let { allowed: allowedServers, blocked: blocked } = filterMcpServersByPolicy(create_4),
    create_5 = Object.create(null);
  for (let O of blocked) create_5[O] = zNn;
  let G =
      S === "plugin_install_diff" ||
      S === "plugins_sync" ||
      S === "reload_plugins" ||
      S === "set_cwd" ||
      S === "claim_session" ||
      S === "tool_register" ||
      S === "plugin_connect",
    oe = allowedServers,
    xe = new Set(),
    ae = G
      ? void 0
      : isHermeticRemoteSession()
        ? et
        : env.CLAUDE_CODE_REMOTE && doesEnterpriseMcpConfigExist()
          ? ze
          : env.CLAUDE_CODE_REMOTE && areSideloadFlagsDisabledByPolicy()
            ? Fe
            : startupCcrEnv.isBridgeCarrierChild
              ? tt
              : void 0;
  if (ae !== void 0) {
    let O = !startupCcrEnv.isBridgeCarrierChild && (ae === ze || ae === Fe),
      create = Object.create(null);
    for (let [j, H] of Object.entries(allowedServers))
      if (isAlwaysKeptServer(H, O, O && ae === Fe)) create[j] = H;
    oe = create;
    for (let j of Object.keys(allowedServers)) if (!Object.hasOwn(oe, j)) (xe.add(j), (create_5[j] = ae));
  }
  if ($e !== null) {
    let { kept: kept, dropped: dropped, error: error } = $e.withoutWithheldCcrArtifactsEntry(oe);
    oe = kept;
    for (let name of dropped) create_5[name] = error;
  }
  let create_6 = Object.create(null),
    create_7 = Object.create(null);
  for (let [O, R] of Object.entries(oe))
    if (R.type === "sdk") create_6[O] = R;
    else create_7[O] = R;
  let currentSdkNames = new Set(Object.keys(n.configs)),
    newSdkNames = new Set(Object.keys(create_6)),
    de = [],
    Q = [],
    _e = [],
    freeze_2 = Object.freeze(Object.assign(Object.create(null), n.configs)),
    merged = Object.assign(Object.create(null), freeze_2),
    he = [...n.clients],
    newSdkClients = [...n.tools],
    newSdkTools = [...n.commands],
    ke = () => freeze;
  if (C) {
    let O = env.CLAUDE_CODE_REMOTE && newSdkNames.size === 0;
    if (O && currentSdkNames.size > 0)
      logForDebugging(
        `mcp_set_servers: payload names no SDK server; keeping ${currentSdkNames.size} registered SDK server(s)`,
      );
    ke = O
      ? () => n.configs
      : () => {
          let configs = n.configs,
            merged_2 = Object.assign(Object.create(null), omitKeys(configs, Q));
          for (let name of de) {
            let Y = merged[name];
            if (Y !== void 0 && !Object.hasOwn(configs, name)) merged_2[name] = Y;
          }
          for (let H of _e) {
            let Y = merged[H];
            if (Y !== void 0 && Object.hasOwn(configs, H) && configs[H] === freeze_2[H]) merged_2[H] = Y;
          }
          return merged_2;
        };
    for (let R of O ? [] : currentSdkNames)
      if (!newSdkNames.has(R)) {
        let client = he.find((Y) => Y.name === R);
        (await Promise.all([
          client?.type === "connected" ? client.cleanup() : void 0,
          h?.closeReplacedSdkClients?.(R),
        ]),
          (he = he.filter((Y) => Y.name !== R)));
        let H = getMcpPrefix(R);
        ((newSdkClients = newSdkClients.filter((Y) => !isToolFromMcpServer(Y, R, H))),
          (newSdkTools = newSdkTools.filter((Y) => !commandBelongsToServer(Y, R))),
          delete merged[R],
          Q.push(R));
      }
    for (let [R, j] of Object.entries(create_6)) {
      let { tools: tools, connectorId: connectorId } = parseMcpServerSettings(j).settings,
        Re = inspectToolsList(j);
      if (Re) logForDebugging(`mcp_set_servers: SDK MCP server '${R}': ${describeToolsListIssues(Re)}`);
      if (!currentSdkNames.has(R)) {
        let { tools: tools_2, connectorId: connectorId_2, ...ye } = j,
          Te = {
            ...ye,
            ...(tools !== void 0 && { tools: tools }),
            ...(connectorId !== void 0 && { connectorId: connectorId }),
          };
        merged[R] = Te;
        let pendingClient = { type: "pending", name: R, config: { ...Te, scope: "dynamic" } };
        ((he = [...he, pendingClient]), de.push(R));
        continue;
      }
      let Me = merged[R];
      if (Me && !sameToolPolicies(Me.tools, tools)) {
        let { tools: tools_2, ...Ce } = Me;
        ((merged[R] = tools === void 0 ? Ce : { ...Ce, tools: tools }), _e.push(R));
      }
    }
  }
  let re = await reconcileMcpServersImpl(
      create_7,
      o,
      s,
      r,
      u,
      S,
      y,
      C,
      new Set(Object.keys(e).filter((O) => !xe.has(O))),
      E,
      D,
      x,
      h?.wantsDial,
      h?.signal,
      L,
      h?.getOwnedConfigs,
      h?.operatorToolPolicyConfigs,
      ke,
    ),
    be = (O) => `[${O.map(sanitizeTelemetryString).join(", ")}]`;
  return (
    logForDebugging(
      `[MCP] ${S ?? "unknown"} applied: ${Object.keys(e).length} servers requested; added=${be([...de, ...re.response.added])} removed=${be([...Q, ...re.response.removed])} ignored (operator-owned)=${be(Object.keys(create_3))} refused=${Object.keys(create).length + Object.keys(create_5).length}`,
    ),
    {
      response: {
        added: [...de, ...re.response.added],
        removed: [...Q, ...re.response.removed],
        errors: { ...create, ...create_3, ...create_5, ...re.response.errors },
      },
      newSdkState: { configs: merged, clients: he, tools: newSdkClients, commands: newSdkTools },
      newDynamicState: re.newState,
      sdkServersAdded: de,
      sdkServersRemoved: Q,
      sdkServersUpdated: _e,
      sdkConfigsAtSnapshot: freeze_2,
      sdkServersChanged: de.length > 0 || Q.length > 0,
      deferredSettle: re.deferredSettle,
    }
  );
}
/**
 * 把 SDK 动态 MCP 服务器集合应用到状态（是否权威、是否延迟连接）。
 */
//@ chunk-nkdv7dw8.js:12607-13624 layout
async function applyDynamicMcpServers(
  e,
  { payload: payload, desired: desired },
  { authoritative: authoritative, caller: caller, deferConnect: deferConnect, dialOptions: dialOptions },
) {
  let { stores: stores } = e,
    {
      getAppState: getAppState,
      setAppState: setAppState,
      getDynamicMcpState: getDynamicMcpState,
      setDynamicMcpState: setDynamicMcpState,
    } = stores,
    h = { ...getDynamicMcpState(), configs: { ...e.getOwnedConfigs(), ...getDynamicMcpState().configs } };
  if (authoritative) {
    let create = Object.create(null);
    for (let [F, I] of Object.entries(e.getOwnedConfigs())) if (Object.hasOwn(payload, F)) create[F] = I;
    e.setOwnedConfigs(create);
  }
  let sdkState = e.sdkState(),
    q = await handleMcpSetServers(
      desired,
      sdkState,
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
          .filter(([F]) => B.has(F) && !isPluginServerConfig(q.newDynamicState.configs[F]))
          .flatMap(([F, I]) => {
            let U = markCcrInjectedConfig(
              F,
              copyOwnServerMarks(payload[F], {
                ...carryConfiguredCommand(I, q.newDynamicState.configs[F]),
                scope: "dynamic",
              }),
              isLockedOutByOrgMcpPolicy,
            );
            return OPt(U) === OPt(q.newDynamicState.configs[F]) ? [[F, U]] : [];
          }),
      ),
    );
  }
  if (
    (setDynamicMcpState(
      reconcileMcpClients(fd() ? h : getDynamicMcpState(), getDynamicMcpState(), q.newDynamicState),
    ),
    q.deferredSettle)
  )
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
  S = !1,
  y = !1,
  C,
  E,
  D,
  x,
  h,
  L,
  q,
  B,
  F,
  I = () => freeze,
) {
  let U = new Set(Object.keys(n.configs)),
    z = new Set(Object.keys(e)),
    J = y ? [...U].filter((p) => !z.has(p) && !C?.has(p) && isPluginServerConfig(n.configs[p])) : [],
    Z = new Set(J.length > 0 ? Object.keys(filterMcpServersByPolicy(wS(n.configs, J)).allowed) : []),
    filtered = [...U].filter((p) => !z.has(p) && !Z.has(p)),
    filtered_2 = [...z].filter((p) => !U.has(p)),
    filtered_3 = [...U].filter((p) => z.has(p)),
    G = new Set(
      [...n.clients, ...(r?.().mcp.clients ?? [])]
        .filter((p) => p.type === "failed" && p.error === Xe)
        .map((p) => p.name),
    ),
    oe = (p) => {
      let M = B?.() ?? {},
        v = Object.hasOwn(M, p) ? M[p] : void 0,
        T = Object.hasOwn(e, p) ? e[p] : void 0;
      if (v === void 0 || T === void 0) return !1;
      let { scope: scope, ...ee } = v;
      return (
        supportsEnvExpansion(ee) &&
        X().areMcpConfigsEqual(toDynamicServerConfig(ee), toDynamicServerConfig(T))
      );
    },
    xe = new Set(
      y
        ? []
        : [...n.clients, ...(r?.().mcp.clients ?? [])]
            .filter((p) => !oe(p.name) && (p.type === "disabled") !== isMcpServerDisabled(p.name))
            .map((p) => p.name),
    ),
    filtered_4 = filtered_3.filter((p) => {
      let M = n.configs[p],
        v = e[p];
      if (!M || !v || G.has(p) || xe.has(p)) return !0;
      let T = toDynamicServerConfig(v);
      if (!X().areMcpConfigsEqual(M, T))
        return (logMCPDebug(p, `reconcileMcpServers: config changed, will replace (caller=${u})`), !0);
      return !1;
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
  let me = [],
    ge = [],
    create = Object.create(null),
    Se = [...n.clients],
    de = [...n.tools];
  for (let p of [...filtered, ...filtered_4]) {
    let M = Se.find((A) => A.name === p) ?? r?.().mcp.clients.find((A) => A.name === p),
      v = n.configs[p];
    if (v) {
      if (M?.type === "connected") {
        setMcpOnClose(M, void 0);
        try {
          await M.cleanup();
        } catch (error) {
          logForDebugging(`MCP client cleanup failed for ${p}: ${error}`, { level: "error" });
        }
      }
      await X().clearServerCache(p, v);
    }
    let T = getMcpPrefix(p);
    if (
      ((de = de.filter((A) => !isToolFromMcpServer(A, p, T))),
      (Se = Se.filter((A) => A.name !== p)),
      filtered.includes(p))
    )
      me.push(p);
  }
  let Q = [...filtered_2, ...filtered_4],
    _e = new Set(Q),
    any = [ListMcpResourcesTool, ReadMcpResourceTool].some(
      (p) =>
        de.some((M) => toolMatchesName(M, p.name)) ||
        (r?.().mcp.tools ?? []).some((M) => toolMatchesName(M, p.name)),
    ),
    fe = (p, M, v, T) => {
      if (T.type === "connected")
        X()
          .detachAndCloseConnection(T)
          .catch(() => {});
      let A = identityChangedFailure(p, M);
      return { name: p, client: A, tools: [], error: A.error, fetched: null, dialEpoch: v };
    },
    he = async (p) => {
      let M = e[p];
      if (!M) return null;
      let v = identityEpoch();
      if (M.type === "sdk")
        return { name: p, client: null, tools: [], error: null, fetched: null, dialEpoch: v };
      if (h !== void 0 && !h(p, M))
        return { name: p, client: null, tools: [], error: Xe, fetched: null, dialEpoch: v };
      let T = toDynamicServerConfig(M),
        A = () => !y && !oe(p) && isMcpServerDisabled(p),
        ee = {
          name: p,
          client: { name: p, type: "disabled", config: T },
          tools: [],
          error: null,
          fetched: null,
          dialEpoch: v,
        };
      if (A()) return ee;
      let ie = () => identityEpoch() !== v && isRemoteMcpTransport(T),
        pe = (ue) => fe(p, T, v, ue),
        Oe = (ue) => {
          let W = mcpGateError(ue, p, T);
          return {
            name: p,
            client: { name: p, type: "failed", config: T, ...W },
            tools: [],
            error: W.error,
            fetched: null,
            dialEpoch: v,
          };
        };
      try {
        let ue = mcpDialBlockCause(p, T);
        if (ue) return Oe(ue);
        let connectToServer = await X().connectToServer(p, T, void 0, E, D, void 0, q);
        if (ie()) return pe(connectToServer);
        let He = [],
          Ee = null;
        if (connectToServer.type === "connected") {
          He = await X().fetchToolsForClient(connectToServer, E);
          try {
            let [Be, Wt] = await Promise.all([
              X().fetchCommandsForClient(connectToServer),
              X().fetchResourcesForClient(connectToServer),
            ]);
            Ee = { name: p, cmds: Be, res: Wt };
          } catch (error) {
            logHandlerFailure(s, `${u}: mcp listing`, error);
          }
        }
        if (ie()) return pe(connectToServer);
        let qe = fd() || connectToServer.type === "failed" ? null : mcpDialBlockCause(p, T);
        if (qe || (!fd() && A())) {
          if (connectToServer.type === "connected")
            X()
              .detachAndCloseConnection(connectToServer)
              .catch(() => {});
          return qe ? Oe(qe) : ee;
        }
        if (
          connectToServer.type === "connected" &&
          connectToServer.capabilities?.resources &&
          !any &&
          !isMcpServerDisabled(p)
        )
          ((any = !0), (He = [...He, ListMcpResourcesTool, ReadMcpResourceTool, H5]));
        let Kt = connectToServer.type === "failed" ? connectToServer.error || "Connection failed" : null,
          je = applyMcpServerConfig(T, { client: connectToServer, tools: He, commands: Ee?.cmds });
        return {
          name: p,
          client: je.client,
          tools: je.tools,
          error: Kt,
          fetched: Ee !== null && je.commands !== void 0 ? { ...Ee, cmds: je.commands } : Ee,
          dialEpoch: v,
        };
      } catch (error) {
        let W = toError(error);
        return (
          logHandlerFailure(s, `${u}: mcp dial`, W),
          { name: p, client: null, tools: [], error: W.message, fetched: null, dialEpoch: v }
        );
      }
    },
    ve = (p) => {
      let M = e[p];
      return !M || X().isLocalMcpServer(toDynamicServerConfig(M));
    },
    fromEntries = Object.fromEntries(Q.map((p) => [p, toDynamicServerConfig(e[p])])),
    mapped = Q.map((p) => ({ type: "pending", name: p, config: fromEntries[p] }));
  Se.push(...mapped);
  let re = emptyServerMap();
  for (let p of z) {
    let M = e[p];
    if (M) {
      let v = toDynamicServerConfig(M),
        T = n.configs[p];
      if (y && T !== void 0 && isPluginServerConfig(T)) {
        if (((v.pluginSource = T.pluginSource), T.pluginPath !== void 0)) v.pluginPath = T.pluginPath;
        if (T.pluginOfficialSourceVouched !== void 0)
          v.pluginOfficialSourceVouched = T.pluginOfficialSourceVouched;
        if (filtered_4.includes(p)) v.pluginEndpointTemplated = !0;
        else if (T.pluginEndpointTemplated !== void 0) v.pluginEndpointTemplated = T.pluginEndpointTemplated;
      }
      re[p] = v;
    }
  }
  for (let p of Z) {
    let M = n.configs[p];
    if (M) re[p] = M;
  }
  let be = () => collectServerToolPolicies({ ...e, ...F }, I()),
    O = { clients: Se, tools: de, configs: re },
    R = new Set([...filtered, ...filtered_4, ...Q]),
    mapped_2 = [...R].map((p) => [p, getMcpPrefix(p)]);
  if (
    (o((p) => {
      let filtered = p.mcp.tools.filter(
          (tool) => !mapped_2.some(([pe, Oe]) => isToolFromMcpServer(tool, pe, Oe)),
        ),
        filtered_2 = p.mcp.clients.filter((client) => !R.has(client.name)),
        filtered_3 = p.mcp.commands.filter((command) => {
          for (let pe of R) if (commandBelongsToServer(command, pe)) return !1;
          return !0;
        }),
        toolPermissionContext = p.toolPermissionContext,
        ee = y ? mergeMcpServerPolicyRules(toolPermissionContext, be(), "replace") : toolPermissionContext;
      if (R.size === 0 && ee === toolPermissionContext) return p;
      return {
        ...p,
        mcp: {
          ...p.mcp,
          tools: filtered,
          clients: [...filtered_2, ...mapped],
          commands: filtered_3,
          resources: omitKeys(p.mcp.resources, [...R]),
          resourceTemplates: omitKeys(p.mcp.resourceTemplates, [...R]),
        },
        toolPermissionContext: ee,
      };
    }),
    Q.length === 0)
  )
    return { response: { added: ge, removed: me, errors: create }, newState: O };
  let H = () => {},
    promise = new Promise((p) => {
      H = p;
    }),
    Re = [],
    Me = [],
    create_2 = Object.create(null),
    create_3 = Object.create(null),
    ye = {
      signal: L,
      getClients: () => r?.().mcp.clients ?? [],
      getSuppressedPluginServers: () => r?.().mcp.suppressedPluginMcpServers ?? [],
      applyMcpUpdate: (p) =>
        o((M) => {
          let v = p(M.mcp);
          return v === M.mcp ? M : { ...M, mcp: v };
        }),
    },
    Te = async (p) => {
      let M = identityEpoch(),
        v = await he(p),
        T = fromEntries[p],
        A = v?.client ?? { type: "failed", name: p, config: T, error: v?.error ?? "Connection failed" },
        ee;
      try {
        ee = applyConnectionResult(ye, {
          client: A,
          tools: v?.tools ?? [],
          commands: v?.fetched?.cmds ?? [],
          attemptEpoch: v?.dialEpoch ?? M,
        });
      } catch (error) {
        if (A.type === "connected")
          X()
            .detachAndCloseConnection(A)
            .catch(() => {});
        throw error;
      }
      if (
        ((create_3[p] = {
          outcome: ee,
          client: A,
          refusedAs: ee === "refused" ? refusalStateFor(p, A) : void 0,
        }),
        v?.fetched)
      ) {
        let res = v.fetched.res;
        ye.applyMcpUpdate((pe) => {
          if (pe.clients.find((client) => client.name === p) !== A) return pe;
          return { ...pe, resources: { ...pe.resources, [p]: res } };
        });
      }
      if (ee === "superseded") return;
      (Re.push(A), Me.push(...(v?.tools ?? [])), (create_2[p] = v?.dialEpoch ?? M));
    },
    Ie = () => {
      Promise.all([
        pMap(Q.filter(ve), Te, { concurrency: X().getMcpServerConnectionBatchSize() }),
        pMap(
          Q.filter((p) => !ve(p)),
          Te,
          { concurrency: X().getRemoteMcpServerConnectionBatchSize() },
        ),
      ])
        .catch((p) => {
          logHandlerFailure(s, `${u}: mcp connect`, p);
          let M = errorMessage(p);
          for (let v of Q)
            create_3[v] ??= {
              outcome: "applied",
              client: { type: "failed", name: v, config: fromEntries[v], error: M },
            };
          ye.applyMcpUpdate((v) => ({
            ...v,
            clients: v.clients.map((client) =>
              client.type === "pending" &&
              _e.has(client.name) &&
              X().areMcpConfigsEqual(client.config, fromEntries[client.name])
                ? { type: "failed", name: client.name, config: client.config, error: M }
                : client,
            ),
          }));
        })
        .finally(() => {
          if (
            (H({ names: [..._e], clients: Re, tools: Me, dialEpochs: create_2 }),
            findReusableClients(fromEntries, ye).length > 0)
          )
            retryRemoteMcpServers(fromEntries, ye, E).catch((p) =>
              logHandlerFailure(s, `${u}: mcp retry`, p),
            );
        });
    };
  if (S)
    return (
      ge.push(...Q),
      setImmediate(Ie),
      { response: { added: ge, removed: me, errors: create }, newState: O, deferredSettle: promise }
    );
  if (x) {
    let dynamicMcpState = x.getDynamicMcpState(),
      M = {
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
    let M = create_3[p];
    if (!M) continue;
    if (M.outcome === "refused") {
      if (M.refusedAs) create[p] = Pe(M.refusedAs);
    } else if (M.outcome === "applied" && M.client.type === "failed") create[p] = Pe(M.client);
    else if (M.outcome === "superseded") {
      let v = r?.().mcp.clients.find((T) => T.name === p);
      if (
        v?.type === "failed" &&
        v.errorCode === "IDENTITY_CHANGED" &&
        X().areMcpConfigsEqual(v.config, fromEntries[p])
      )
        create[p] = Pe(v);
    }
  }
  return {
    response: { added: ge, removed: me, errors: create },
    newState: buildMcpStatusList(O, zt, r?.().mcp.clients),
  };
}
/**
 * reconcileMcpServers：比较期望与现有 MCP 配置，替换变化的连接。
 */
//@ chunk-nkdv7dw8.js:20914-21884 fingerprint = reconcileMcpServers (0.344)
async function reconcileMcpServers(e, n, o, s, r, u, S, y, C, E) {
  let create = Object.create(null),
    create_2 = Object.create(null);
  if (n !== void 0) {
    await awaitMcpPolicyColdStart({ hasDynamicMcpConfig: !0 });
    let create_3 = Object.create(null);
    if (((create_3[e] = n), Object.hasOwn(filterMcpServersByPolicy(create_3).allowed, e))) create[e] = n;
    else create_2[e] = zNn;
  }
  let h = getMcpPrefix(e),
    L = (I) => isToolFromMcpServer(I, e, h),
    q = (I) => {
      let U = emptyServerMap(),
        z = I.configs[e];
      if (Object.hasOwn(I.configs, e) && z !== void 0) U[e] = z;
      return {
        configs: U,
        clients: I.clients.filter((client) => client.name === e),
        tools: I.tools.filter(L),
      };
    },
    B = (I) => {
      let dynamicMcpState = s.getDynamicMcpState(),
        z = emptyServerMap();
      for (let [Z, ne] of Object.entries(dynamicMcpState.configs)) if (Z !== e) z[Z] = ne;
      let J = I.configs[e];
      if (Object.hasOwn(I.configs, e) && J !== void 0) z[e] = J;
      s.setDynamicMcpState({
        configs: z,
        clients: [...dynamicMcpState.clients.filter((prev) => prev.name !== e), ...I.clients],
        tools: [...dynamicMcpState.tools.filter((tool) => !L(tool)), ...I.tools],
      });
    },
    F = await reconcileMcpServersImpl(
      create,
      q(s.getDynamicMcpState()),
      r,
      S,
      u,
      o,
      !1,
      !1,
      void 0,
      y,
      C,
      { getDynamicMcpState: () => q(s.getDynamicMcpState()), setDynamicMcpState: B },
      void 0,
      void 0,
      void 0,
      E,
    );
  return (B(F.newState), { ...F.response, errors: { ...create_2, ...F.response.errors } });
}
//@ chunk-18hwfzwa.js:810094-810309 fingerprint = trackReceivedMessageUuid (0.591)
function trackReceivedMessageUuid(h, x) {
  let D = new Set();
  for (let { id: id, tokenCount: tokenCount } of x) {
    D.add(id);
    let ke = h.get(id);
    if (!ke) h.set(id, (ke = []));
    if ((ke.push(tokenCount), ke.length > XJe)) ke.splice(0, ke.length - XJe);
  }
  for (let L of h.keys()) if (!D.has(L)) h.delete(L);
}

export {
  removeInterruptedMessage,
  finalContextTokensFromLastResponse,
  trackReceivedMessageUuid,
  controlSuccessResponse,
  controlErrorResponse,
  Sat,
  emitLoadError,
  canBatchWith,
  assistantTurnKeys,
  getStructuredIO,
  handleOrphanedPermissionResponse,
};
