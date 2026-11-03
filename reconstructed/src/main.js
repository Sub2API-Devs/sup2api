/**
 * main.tsx
 *
 * 并入已有模块：非交互/SDK 会话启动主流程（选项、云会话、输入输出）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/main.tsx
 * pieces: chunk-151tygw9.js (1), chunk-2am86wgd.js (1), chunk-3wek6r2k.js (6), chunk-7dqf31r1.js (2), chunk-cjydagjy.js (14), chunk-e6aww6q8.js (1), chunk-qg4qg94n.js (8), chunk-shkzs7rp.js (37)
 * attribution: fingerprint 16, placement 31, layout 12, sole-consumer 3, callgraph-witnessed 1, affinity 1, facade-majority 5, callgraph-fingerprint 1
 */
import { randomUUID } from "crypto";
import { basename, isAbsolute } from "path";
import { realpath, opendir } from "fs/promises";
import { declaredEnvVarNames, env, antEnv, udsEnv, isSpawnedByServer } from "./utils/env.js";
import { tetherEnvAccessor } from "./utils/wireToolInputEcho.js";
import { toolServerEnvAccessor } from "./utils/subprocessEnvLoader.js";
import { envOverrideAccessor } from "./utils/env/envRegistry.js";
import {
  fromSanitizer_SANITIZER_OUTPUT_ONLY,
  fromEnum,
  fromEnumOpt,
  lit,
  fromEnumArr,
  agentTypeForAnalytics_GATE_EVALUATED,
} from "./services/analytics/safeMetadata.js";
import {
  isBridgeEnvironment,
  isByocEnvironment,
  hasRunnerDeclaredNestedRepoDiff,
} from "./utils/remoteEnvironment.js";
import { useLocalProjectsEntrypoint, applyEntrypointOnRequestsEnv } from "./constants/system.js";
import {
  logFeatureOk,
  logFeatureSad,
  logFeatureBadAsync,
  logFeatureBad,
} from "./services/analytics/featureTelemetry.js";
import { initializeWarningHandler } from "./utils/warningHandler.js";
import { installTimerDelayClamp } from "./utils/timerDelayClamp.js";
import { registerClientDataGetters } from "./services/api/bootstrap.js";
import {
  detectNonInteractiveLaunch,
  eagerParseCliFlag,
  eagerHasCliFlag,
  eagerFindCliArg,
  isConnectUrlArg,
  mayDispatchSubcommand,
  eagerFirstOperand,
} from "./utils/cliArgs.js";
import {
  stopCapturingEarlyInput,
  takeEarlyInputFieldText,
  hasEarlyInput,
  consumeEarlyInput,
} from "./utils/earlyInput.js";
import {
  setIsInteractive,
  setSessionStartType,
  setClientType,
  setQuestionPreviewFormat,
  setExtendedQuestionsEnabled,
  setQuestionOptionDescriptionsOptional,
  setSdkAgentProgressSummariesEnabled,
  getIsNonInteractiveSession,
  setGatewayServerProcess,
  getRootSession,
  getIsRemoteMode,
  setOnboardingShownThisSession,
  getUserMsgOptIn,
  setIsRemoteMode,
  switchSession,
  setOriginalCwd,
  setTeleportedSessionInfo,
  getOriginalCwd,
  setPrintOutputFormat,
  isParkedSpare,
  getSessionId,
  setSdkBetas,
  getMcpConnectNonBlocking,
  isDisklessProcess,
  setProjectConfigRoot,
  setInlinePlugins,
  setInlinePluginsNoMcp,
  setInlinePluginUrls,
  setAdditionalDirectoriesForClaudeMd,
  isRestrictedSession,
  setFlagSettingsExpectedContent,
  setFlagSettingsFilePinnedContent,
  setFlagSettingsPath,
  setParentManagedSettingsInvalid,
  setParentManagedSettings,
  setAllowedSettingSources,
  setFlagSettingsInline,
  getFlagSettingsInline,
  setRestrictedSession,
  getAllowedSettingSourcesAsConfigured,
  getExtendedQuestionsEnabled,
} from "./bootstrap/state.js";
import { hasResumeFlag } from "./main/resumeFlagScan.js";
import { setAiAgentEnv } from "./utils/http.js";
import {
  isEnvTruthy,
  isBareMode,
  hasNodeOption,
  isSafeMode,
  getClaudeConfigDir,
  isSupervisedMode,
  parsePositiveNumber,
  parseNumberWithSeparators,
  isEnvDefinedFalsy,
  isRestrictedMode,
  isEvalBuild,
} from "./utils/envUtils.js";
import {
  getOAuthTokenFromFileDescriptor,
  getGatewayTokenFromFileDescriptor,
  getApiKeyFromFileDescriptor,
  hasPossibleCredentialFromDescriptor,
} from "./utils/authFileDescriptor.js";
import { getSessionIngressAuthToken } from "./utils/sessionIngressAuth.js";
import { usesSessionAccessToken, isReviewSession } from "./utils/sessionAccessToken.js";
import { disableCoreDumps } from "./utils/processHardening.js";
import { profileCheckpoint, profileReport, getBootstrapEntry } from "./utils/startupProfiler.js";
import {
  isSettingSourceEnabled,
  parseSettingSourcesFlag,
  REPO_DIR_SETTING_SOURCES,
  HOST_FREE_FORM_SETTINGS_KEY,
} from "./utils/settings/constants.js";
import {
  BYPASS_CONSENT_MESSAGE,
  BG_UNCONSENTED_BYPASS_CAPABILITY_NOTICE,
  getAutoModeUnavailableNotification,
  getStartupModeTelemetry,
  getAutoSeedFactors,
  resolveRemoteSessionMode,
  resolveSeedPermissionMode,
  verifyAutoModeGateAccess,
  getAutoModeAvailabilityForAnalytics,
} from "./utils/permissions/permissionSetup.js";
import {
  logForDebugging,
  setHasFormattedOutput,
  initDefaultDebugLog,
  isDebugToStdErr,
} from "./utils/debug.js";
import { tildify } from "./utils/path.js";
import {
  getSettingsFilePathForSource,
  getAutoModeConfig,
  getInitialSettings_2,
  isForceRemoteSettingsRefreshConfigured,
  getEffectiveSettingSource_2,
  getSettingsForSource,
  getSettingsForSourceForUpkeep,
  getBasePolicySettings,
  getBasePolicySettingsOrigin,
  getPolicyHelperSourceLoadErrors,
  MAX_SETTINGS_JSON_BYTES,
  getManagedSettingsKeysForLogging,
} from "./utils/settings/settings.js";
import { isCleanupStarted, registerCleanup } from "./utils/cleanupRegistry.js";
import { waitForGate } from "./utils/api.js";
import { logError, getLogDisplayTitle } from "./utils/log.js";
import {
  toError,
  sanitizeErrorName,
  withTelemetryMessage,
  errorMessage,
  TeleportOperationError,
  sanitizedErrnoLowerForTelemetry,
  getErrnoCode,
  isENOENT,
  isEISDIR,
} from "./utils/errors.js";
import {
  resolveExplicitRemoteControlAtStartup,
  isAutoUpdaterDisabled,
  CONFIG_SOURCE_LABELS,
  checkHasTrustDialogAccepted,
  isWorkspacePersistedTrusted,
  saveGlobalConfig,
  getGlobalConfig,
  DEFAULT_GLOBAL_CONFIG,
  resetLocalSettingsGitTrackedCache,
} from "./utils/config.js";
import { resolveCcrAutoConnectDefault } from "./bridge/bridgeGates.js";
import { logEvent, logEventAsync } from "./services/analytics/index.js";
import {
  recordPhase,
  recordSpawnToExec,
  wasWarmSpareClaimed,
  logStartupTiming,
  markFlagFetchKick,
} from "./utils/startupTiming.js";
import { startMdmRawRead } from "./utils/settings/mdm/rawRead.js";
import {
  startKeychainPrefetch,
  ensureKeychainPrefetchCompleted,
} from "./utils/secureStorage/keychainPrefetch.js";
import { alwaysTrue, jsonStringify } from "./utils/slowOperations.js";
import { DEFAULTS_PLACEHOLDER } from "./utils/permissions/autoModeRulesPrompt.js";
import { count } from "./utils/collections.js";
import { isFirstPartyTelemetryBlocked } from "./utils/hostEnvironment.js";
import { getIsGit, getWorktreeCount, getBranch, getGitPresenceForAnalytics } from "./utils/git.js";
import { getGhAuthStatus } from "./utils/github/ghAuthStatus.js";
import {
  envVarsForTelemetry,
  nonDefaultGlobalConfigKeys,
  setUserSettingKeys,
} from "./cli/startup/startupTelemetry.js";
import { resolveSetting, USER_INTENT_SETTING_KEYS } from "./utils/settings/userIntentSettings.js";
import { SandboxManager } from "./utils/sandbox/sandbox-adapter.js";
import { configureZodForStartup } from "./utils/zodStartup.js";
import { registerToolHosts } from "./services/remoteTools/registerToolHosts.js";
import {
  latchFullscreenTrialFromEnv,
  getNoFlickerEnvOverride,
  getFullscreenDecision,
} from "./utils/fullscreen.js";
import { validateHandleUriArgs } from "./utils/deepLink/handleUri.js";
import { isStorageV5Enabled } from "./utils/hoverRest.js";
import {
  parseImportArgv,
  isImportEnabled,
  planImportRewrite,
  CONFIG_UNREADABLE_MESSAGE,
  IMPORT_UNAVAILABLE_MESSAGE,
} from "./commands/import/index.js";
import {
  cliError,
  printCliError,
  cliErrorAfterAnalyticsFlush,
  cliWarn,
  exitAfterAnalyticsFlush,
} from "./cli/exit.js";
import {
  gracefulShutdownSync,
  claimShutdown,
  flushAnalyticsSinks,
  emitExitMessage,
  gracefulShutdown,
  areShutdownHandlersInstalled,
  markStartupActionStarted,
} from "./utils/gracefulShutdown.js";
import { tryOpenLiveBackground } from "./commands/resume/openLiveBackground.js";
import { registerEditHookCommand } from "./cli/handlers/editHook.js";
import { registerPermissionsCommands } from "./cli/handlers/editSettingsCommands.js";
import { createHelpConfig } from "./cli/helpFormat.js";
import { Option, Command, InvalidArgumentError } from "../vendor/commander/esm.mjs";
import { registerPurgeCommands } from "./cli/handlers/purge.js";
import { getBaseRenderOptions } from "./utils/renderOptions.js";
import { addBackgroundVerbsToHelp } from "./cli/backgroundSessionVerbs.js";
import { getCliSuppliedOptions, mapped, parsePermissionModeOption } from "./migrations/migrationHelpers.js";
import {
  APPLY_PROJECT_SETTINGS,
  APPLY_PROJECT_SETTINGS_DESCRIPTION,
  isApplyProjectSettingsCommand,
} from "./cli/handlers/applyProjectSettings.js";
import { SHOW_CURSOR } from "./ink/termio/dec.js";
import { checkFullscreenBootGuard } from "./utils/fullscreenBootGuard.js";
import {
  shouldSuppressChromeOffer,
  isClaudeInChromeAllowed,
  setupClaudeInChrome,
  putChromePromptInSystemPrompt,
} from "./utils/claudeInChrome/setup.js";
import { awaitMcpPolicyColdStart } from "./services/mcp/mcpPolicyColdStart.js";
import { getClaudeCodeMcpConfigs } from "./services/mcp/config.js";
import { platformOrOther, filterObject } from "./services/analytics/metadata.js";
import { getPlatform } from "./utils/platform.js";
import { getCommands } from "./commands.js";
import { logOrgPolicyDenied, logOrgPolicyDeniedAsync } from "./services/policyLimits/orgPolicyDeniedEvent.js";
import {
  warnStartupIssues,
  markAutoModeAvailability,
  reportAutoModeAvailabilityChange,
} from "./cli/startup/startupMisc.js";
import { markRemoteControlUsed } from "./services/tips/remoteControlNudges.js";
import {
  validateForceRemoteSettingsRefresh,
  refreshRemoteManagedSettings,
  refreshRemoteManagedSettingsForStartup,
  declareNoHybridTokenRefresh,
  waitForRemoteManagedSettingsFetchToSettle,
  getRemoteManagedSettingsSignatureFacts,
  hostLaunchedGatewayRefusal,
  loadRemoteManagedSettings,
  hostLaunchedGatewayLoadRefusal,
  noteHostLaunchedGatewayWithoutPolicy,
} from "./services/remoteManagedSettings/loader.js";
import { machineForcedRefresh, configChangeBlocker } from "./utils/model/providerAttribution.js";
import {
  sendManagedSettingsRefusal,
  sendOrgValidationRefusal,
  recordManagedSettingsRefusal,
} from "./cli/managedConfigRefusal.js";
import { emitManagedConfigReadyAtExit, setDefaultCommandFlag } from "./services/policyLimits/startupGate.js";
import { getAPIProvider } from "./utils/model/providers.js";
import {
  gatewaySettingsFailure,
  redoAuthDependentStartup,
  redoStartupAfterLauncherLogin,
  asStringArray,
  runAllMigrations,
  needsPolicyHelperVerdict,
  exitWithStartupFailure,
  remoteSettingsFailureReason,
  continueSignedOutAfterGatewayEnd,
  parseNumberOption,
} from "./services/remoteManagedSettings/gatewaySettingsErrors.js";
import { hasPolicyDiverged } from "./utils/settings/policySnapshot.js";
import { resetProviderBoundCaches } from "./utils/model/resetProviderCaches.js";
import {
  applyConfigEnvironmentVariables,
  applySafeConfigEnvironmentVariables,
} from "./utils/managedEnvApply.js";
import { initializeTelemetryAfterTrust, init } from "./entrypoints/init.js";
import {
  refreshPolicyLimits,
  waitForPolicyLimitsToLoad,
  getPolicyLimitsSignatureFacts,
  shouldAwaitPolicyLimitsOnStartup,
  loadPolicyLimits,
} from "./services/policyLimits/PolicyLimitsClient.js";
import {
  resetUserData,
  refreshGrowthBookAfterAuthChange,
  getFeatureValue_CACHED_MAY_BE_STALE,
  hasFreshGrowthBookFeatures,
  initializeGrowthBook,
  onGrowthBookRefresh,
} from "./services/analytics/growthbook.js";
import {
  validateForceLoginOrg,
  getSubscriptionType,
  getStoredOauthAccountInfo,
  isHostManagedProviderAuth,
  isGatewayLoginForced,
  getClaudeAIOAuthTokenOriginAsync,
  getAuthTokenSource,
  isClaudeAISubscriber,
  rejudgeHostLaunchedGateway,
  getAnthropicApiKeyWithSourceSafe,
} from "./utils/auth.js";
import { buildDeepLinkBanner } from "./utils/deepLink/banner.js";
import { getCwd } from "./utils/cwd.js";
import { setPromptLaunchWarning } from "./state/promptInputStore.js";
import { telemetrySafeModelName } from "./utils/model/telemetryModelName.js";
import { isBuiltInAgent } from "./tools/AgentTool/loadAgentsDir.js";
import { getDeprecationNotice, getModelDeprecationWarning } from "./utils/model/deprecation.js";
import {
  loadAllPermissionRulesFromDisk,
  loadTrustedAdditionalDirectoriesFromDisk,
} from "./utils/permissions/permissionsLoader.js";
import {
  refreshPermissionContext,
  rebuildAdditionalDirectories,
} from "./utils/permissions/permissionContextRefresh.js";
import { syncPermissionRulesFromDisk } from "./utils/permissions/permissions.js";
import { createAutoModeGateNotification } from "./utils/permissions/bypassPermissionsKillswitch.js";
import { isAgentSwarmsEnabled } from "./utils/agentSwarmsEnabled.js";
import {
  getTeammateUtils,
  logSessionTelemetry,
  coordinatorModeModule,
  maybeActivateBrief,
  branchModeForTelemetry,
  startTurnInputPrefetches,
  startIdleStartupWork,
  judgeStartupGrowthBookKick,
  prepareSession,
} from "./cli/startup/prepareSession.js";
import { getDynamicTeamContext } from "./utils/teammate.js";
import { computeInitialTeamContext } from "./utils/swarm/reconnection.js";
import { UNLIMITED } from "./state/statusLineWidth.js";
import { EMPTY_PROJECTS_SELF_IDENTITY, getDefaultAppState_2 } from "./state/AppStateStore.js";
import { createEmptyAttributionState } from "./utils/commitAttribution.js";
import {
  shouldEnablePromptSuggestion,
  isPromptSuggestionSettingEnabled,
} from "./services/PromptSuggestion/promptSuggestion.js";
import { isAwaySummaryEnabled } from "./services/awaySummary.js";
import { createUserMessage, createSystemMessage } from "./utils/messages.js";
import {
  createSessionEffortState,
  isUltracodeEnabled,
  resolveEffortLevel,
  EFFORT_LEVELS,
  parseEffortFlag,
  parseEffortLevel,
} from "./utils/effort.js";
import { isFastModeSettingActive, isFastModeEnabled } from "./utils/fastMode.js";
import { isAdvisorToolEnabled } from "./utils/advisor.js";
import { addHistoryEntry } from "./history.js";
import { loadConversationForResume } from "./utils/conversationRecovery.js";
import { precomputeResumeHooks } from "./services/compact/precomputedCompact.js";
import { noopModelPinSubscriber, modelPinStorageKind, noopModelPinReset } from "./utils/sessionModelPin.js";
import { backgroundSessionMovedNotice } from "./utils/backgroundSessionResume.js";
import { processResumedConversation, startupModelWinsOverSessionRestore } from "./utils/sessionRestore.js";
import { applyAgentModelOverride } from "./utils/model/modelOverrideNotices.js";
import { launchSessionRepl } from "./replLauncher.js";
import { ResumeRefusedError } from "./utils/transcript/deserialize.js";
import { normalizeUuidOrNull, identityAgentId } from "./utils/agentId.js";
import { isTranscriptFileResumeArg } from "./utils/sessionStoragePortable.js";
import {
  searchSessionsByCustomTitle,
  getSessionIdFromLog,
  loadTranscriptFromFile,
  TranscriptFileFormatError,
  saveMode,
} from "./utils/sessionStorage.js";
import { cloudSessionsUnavailableReason } from "./services/cloudSessions/cloudSessionsPolicy.js";
import { extractRepoSlug, nullIfTruthy } from "./cli/eagerFlags.js";
import { toCompatSessionId, remoteRowId } from "./bridge/sessionIdCompat.js";
import { environmentFlagErrorPrefix } from "./cli/cloudSessionArgs.js";
import { permissionModeFromString } from "./utils/permissions/PermissionMode.js";
import { cloudPermissionModeFrom, CLOUD_SESSION_OPTION_KEYS } from "./cli/cloudSession/launchFlags.js";
import { sensitivePathGateEnabled, neverTrueAsync } from "./utils/permissions/sensitivePaths.js";
import { unavailableReason, shouldPrefetchUserContext } from "./cli/startup/sessionLaunchOptions.js";
import { logInteractiveInputFailure, noTtyMessage } from "./cli/startup/interactiveInputCheck.js";
import { sanitizeMarkName, setStartupMarkWriter } from "./utils/startupMarks.js";
import {
  ensureConsoleProfileCloudSessionsCredential,
  prepareApiRequest,
  sessionsApiAccessTokenNow,
  deviceBridgeAccessToken,
  fetchSession,
  recoverSessionsApiBearer,
  sendEventToRemoteSession,
} from "./utils/teleport/api.js";
import { isTerminalShutdown, heldUntilExit } from "./utils/terminalShutdown.js";
import { earlyArgsArgv } from "./services/daemon/relaunchArgs.js";
import { disallowedToolsTelemetry } from "./cli/cloudSession/hostedSessionRestrictions.js";
import { unclosedParenError } from "./utils/permissions/disallowedToolsFlag.js";
import {
  isViolinWoodEnabledCached,
  waitForOwnFlagFetch,
  isViolinWoodServedOn,
  isViolinWoodEnabled,
  isSettingsToCloudEnabled,
  canForwardHomeSettings,
  isDeviceIdentityEnabledCached,
} from "./services/analytics/violinGates.js";
import {
  isCloudClientToolServingAnsweredOn,
  getViolinWillowOwnAnswer,
} from "./services/analytics/violinWillowGate.js";
import { environmentUnresolvedOutcome } from "./utils/teleport/cloudEnvironments.js";
import { fetchEnvironments } from "./utils/teleport/environments.js";
import {
  cloudCreateRefusal,
  teleportToRemoteWithErrorHandling,
  checkOutTeleportedSessionBranch,
  processMessagesForTeleportResume,
  validateSessionRepository,
  formatRepoMismatchDisplay,
  handleTeleportPrerequisites,
  teleportToRemote,
} from "./utils/teleport.js";
import { alwaysFalsePlaceholder } from "./utils/background/remote/remoteSession.js";
import { sequential } from "./utils/sequential.js";
import { isContainerSyncEnvironment } from "./utils/teleport/containerSync.js";
import {
  resolveHostConsentMode,
  storedHomeSettingsMode,
  isLaunchConsentBlocked,
  shouldPromptHomeSettingsMode,
  noteHomeSettingsPrompt,
  shouldForwardHomeSettings,
} from "./utils/teleport/homeSettingsMode.js";
import { isScrubEnabled } from "./utils/subprocessEnv.js";
import {
  boolFromMaybe,
  isRestrictedModelAllowed,
  describeSelfHostedModeNotice,
  resolveStartupModel,
} from "./utils/model/startupModelResolution.js";
import { getMainLoopModel } from "./utils/model/model.js";
import { modelSupportsAutoMode } from "./utils/betas.js";
import { toCompatSessionId_2 } from "./bridge/bridgeHostState.js";
import { getRemoteSessionUrl } from "./constants/product.js";
import { reportSignerLoadFailure } from "./utils/telemetry/memorySummary.js";
import { tryReadFileForSync } from "./services/settingsSync/index.js";
import { isDeviceRevokedError } from "./bridge/deviceBinding.js";
import { isGithubDotCom } from "./utils/git/githubUrl.js";
import { getKnownPathsForRepo, filterExistingPaths } from "./utils/githubRepoPathMapping.js";
import {
  processChdir,
  safeResolvePath,
  getFsImplementation,
  vetRepoSettingsPath,
  isSymlinkToNetworkPathError,
  realpathExaminedSync,
} from "./utils/fsOperations.js";
import { setCwd } from "./utils/Shell.js";
import { getPlansDirectory, primePlanSlugCollisions } from "./utils/plans.js";
import { isAgentsFleetEnabled, isPastSessionsExperimentEnabled } from "./utils/fleetGates.js";
import { findBackgroundSessionHolder, formatSessionRunningInBackground } from "./utils/sessionAttach.js";
import { isTranscriptLoadError, win32EbadfHelp } from "./utils/transcript/transcriptFiles.js";
import { cliCarriesSessionConfig, foldRestricted } from "./utils/sessionConfigFlags.js";
import { getWorktreePaths } from "./utils/getWorktreePaths.js";
import { migrateAutoUpdatesToSettings } from "./migrations/migrateAutoUpdatesToSettings.js";
import { migrateBypassPermissionsAcceptedToSettings } from "./migrations/migrateBypassPermissionsAcceptedToSettings.js";
import { resetProToOpusDefault } from "./migrations/resetProToOpusDefault.js";
import { migrateSonnet1mToSonnet45 } from "./migrations/migrateSonnet1mToSonnet45.js";
import { migrateLegacyOpusToCurrent } from "./migrations/migrateLegacyOpusToCurrent.js";
import { migrateSonnet45ToSonnet46 } from "./migrations/migrateSonnet45ToSonnet46.js";
import { migrateOpusToOpus1m } from "./migrations/migrateOpusToOpus1m.js";
import { migrateModelAliases } from "./migrations/migrateModelAliases.js";
import { migrateFable5ToFableAlias } from "./migrations/migrateFable5ToFableAlias.js";
import { migrateReplBridgeEnabledToRemoteControlAtStartup } from "./migrations/migrateReplBridgeEnabledToRemoteControlAtStartup.js";
import { migrateUserIntentToSettings } from "./migrations/migrateUserIntentToSettings.js";
import { migrateNotificationDismissals } from "./migrations/migrateNotificationDismissals.js";
import { resetAutoModeOptInForDefaultOffer } from "./migrations/resetAutoModeOptInForDefaultOffer.js";
import { shouldShowClaudeMdExternalIncludesWarning } from "./utils/claudemd.js";
import {
  remoteClaudeMd,
  hasRemoteHelperState,
  retireIfShadowedByRemote,
  enableMidSessionArming,
} from "./utils/settings/policyHelper/helperRemote.js";
import {
  formatServeHelperStoppedError,
  isAttachServeMode,
  isStoredLoginPinned,
} from "./cli/headlessCloud/attachServe.js";
import { EXIT_CONFIG_ERROR } from "./utils/exitCodes.js";
import { createReplMessageQueue } from "./replSessionSeat.js";
import { flushDeferredProblems } from "./plugins/functionHooks/hooksModuleLoader.js";
import { releaseStartupWork, holdForStartupWork, waitForStartupWork } from "./cli/startup/startupWorkGate.js";
import { settingsChangeDetector } from "./utils/settings/changeDetector.js";
import { settleLauncherHostLogin, runStartupHooks } from "./cli/startup/launcherHostLogin.js";
import { credentialsStoreFor } from "./utils/secureStorage/credentialsFileStore.js";
import { shortHash } from "./utils/shortHash.js";
import { isSessionTracingEnabled } from "./utils/telemetry/sessionTracing.js";
import { writeStartupFailureResult } from "./cli/startupFailureResult.js";
import { getNonInteractiveCommands } from "./utils/commandPredicates.js";
import { SessionStateTracker } from "./utils/sessionState.js";
import { createStore } from "./state/store.js";
import { onAppStateChange } from "./state/onChangeAppState.js";
import { syncSessionPermissionMode } from "./services/api/sessionFlags.js";
import { hasPendingHandoff } from "./tasks/exitHandoff.js";
import { resetRefusalFallbackOnSwitch } from "./utils/model/refusalFallback.js";
import { EVENT_LOGGING_FLAG_WAIT_MS, didStartGrowthBookKick } from "./utils/startupFlagWait.js";
import { withDeadline } from "./utils/sleep.js";
import { isNonReservedStdioConfig } from "./services/mcp/utils.js";
import {
  MCP_CONNECT_PHASES,
  shouldJoinBeforeInput,
  connectMcpConfigServers,
} from "./services/mcp/connectionBatch.js";
import { installStartupMcpHeaders } from "./services/mcp/startupMcpHeaders.js";
import {
  isNoPromptHost,
  NONE,
  PERMISSION_PROMPT_HOST_KINDS,
} from "./utils/permissions/permissionPromptHost.js";
import { omitExcludedOrPluginDisabled, shouldAskLauncherHostLogin } from "./cli/launcherHostLogin.js";
import { getAddDirEnabledPlugins } from "./utils/plugins/addDirPluginSettings.js";
import {
  POLICY_HELPER_HOST,
  shouldWaitForRemotePolicy,
  POLICY_HELPER_HOST_2,
} from "./utils/settings/policyHelperGate.js";
import { writeOut, isStdinUnusableError, peekForStdinData } from "./utils/process.js";
import {
  startAwaitInitialize,
  readStreamJsonStdin,
  awaitInitializeResult,
  adoptStdinStream,
  STDIN_MESSAGES_MARKER,
  STDIN_LIMITS,
} from "./cli/startup/awaitInitialize.js";
import { ensureMdmLoaded } from "./utils/settings/managedPluginTiers.js";
import { isUntouchableSpelling } from "./utils/networkPaths.js";
import { loadClientDataForStartup, applyPendingClientDataBaseUrl } from "./services/clientDataUrl.js";
import { isBgSession, isUnattendedInteractiveSession } from "./utils/concurrentSessions.js";
import { trackError } from "./services/errorTracking/errorTracking.js";
import {
  mergePluginDirs,
  withoutPluginDirs,
  settlePluginDirsEnv,
  PLUGIN_DIRS_ENV_VAR,
  PLUGIN_DIRS_ENV_RECOVERY_HINT,
} from "./utils/plugins/pluginDirsEnv.js";
import { clearPluginCache, loadAllPluginsCacheOnly } from "./utils/plugins/pluginLoader.js";
import { registerOrgConfigGate } from "./services/policyLimits/orgConfigGate.js";
import {
  managedSettingsConsentRejected,
  declareNoConsentSurface,
  declareStopsWhenApprovalCannotBeAsked,
} from "./services/remoteManagedSettings/securityCheck.js";
import {
  runPolicyHelperPass,
  policyHelperExitReason,
  markStartsNoSession,
  refreshed,
} from "./utils/settings/policyHelper/policyHelper.js";
import { configureProxyAuthHelperFromSettings } from "./utils/auth/proxyAuthHelperConfig.js";
import { resetRemoteSettingsSyncCache } from "./services/cloudSessions/eligibility.js";
import { injectBridgeFault } from "./bridge/bridgeDebug.js";
import { markLoadCycleBegun } from "./services/remoteManagedSettings/remoteSettingsState.js";
import {
  isPluginMutationCommand,
  watchManagedMemoryPolicy,
  initBuiltinPlugins,
} from "./utils/plugins/pluginPolicyColdStart.js";
import {
  areSideloadFlagsDisabledByPolicy,
  sideloadFlagsBlockedMessage,
} from "./utils/plugins/marketplacePolicy.js";
import { checkCommandVersionBounds } from "./utils/versionBounds.js";
import { isBigQueryMetricsEnabled } from "./services/remoteManagedSettings/storedLoginSurface.js";
import { THINKING_DISPLAY_MODES } from "./entrypoints/sdk/coreSchemas.js";
import { getBuildRefSuffix } from "./cli/earlyArgs.js";
import { parseWindowArgument } from "./services/compact/autoCompactWindow.js";
import { PROACTIVITY_MODES } from "./utils/proactivityMode.js";
import { alwaysFalse as alwaysFalse_2 } from "./Tool.js";
import { DECLARES_DIFF_FINDS_NESTED_REPOSITORY } from "./services/selfHostedRunner/runnerDeclaration.js";
import { FIRST_ARG_NOT_FORWARDED_TEXT } from "./services/selfHostedRunner/changesPaneRefusals.js";
import { safeParseJSON } from "./utils/json.js";
import { generateTempFilePath } from "./utils/tempDir.js";
import { isInClaudeConfigHome } from "./utils/settings/settingsFileParsing.js";
import { readFileSync, isNotRegularFileError } from "./utils/fileRead.js";
import { invalidateCommandNames } from "./utils/settings/commandSyncNames.js";
import { isPlainObject } from "./utils/isPlainObject.js";
import { isModeDependentModelSetting, isOpusFableAdvisorSetting } from "./utils/model/planModeModel.js";
import { strip1mSuffix } from "./utils/model/modelIds.js";
import { getProjectFactsForStartup, PROJECT_FACTS_CACHE_TTL_MS } from "./utils/projectFacts.js";
import { mcpServerKindFlags } from "./services/mcp/mcpConfigProvenance.js";
import { cooAttributes } from "./utils/telemetry/cooAttributes.js";
import { screenReaderTelemetryFields } from "./utils/accessibility/screenReader.js";
import { configDirTelemetry } from "./utils/configDirPathShape.js";
import { emptyObjectFactory } from "./tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { suggestClosestName } from "./utils/settings/managedEnvKeys.js";
import { figures_default } from "../vendor/@inquirer/figures/dist/esm/index.js";
import { _S } from "../vendor/chart.js/dist/chart.js";
import { logForDiagnosticsNoPII } from "./utils/diagLogs.js";
import { prefetchGitStatus } from "./context.js";
import { refreshExampleCommands } from "./utils/exampleCommands.js";
import { sessionShape, isCoworkWithRemote, isTopHostSession } from "./utils/sessionShape.js";
import { HOST_SKILL_CATALOG_ENV, isHostSessionEntrypoint } from "./utils/entrypointKinds.js";

//@ chunk-shkzs7rp.js:24455-25561 placement
var TELEMETRY_SAFE_ENV_VAR_NAMES = new Set([
  "ANTHROPIC_CUSTOM_MODEL_OPTION_SUPPORTED_CAPABILITIES",
  "ANTHROPIC_DEFAULT_FABLE_MODEL_SUPPORTED_CAPABILITIES",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES",
  "ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES",
  "ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES",
  "ANTHROPIC_IDENTITY_TOKEN",
  "ANTHROPIC_IDENTITY_TOKEN_FILE",
  "ANTHROPIC_SCOPE",
  "ANTHROPIC_SERVICE_ACCOUNT_ID",
  "CLAUDE_CODE_AGENT_VIEW_RELAUNCH",
  "CLAUDE_CODE_ALTGR_AS_TEXT",
  "CLAUDE_CODE_AUTO_BACKGROUND_TIMEOUT_MS",
  "CLAUDE_CODE_BS_AS_CTRL_BACKSPACE",
  "CLAUDE_CODE_CLOUD_SESSION_ID",
  "CLAUDE_CODE_CONNECT_TIMEOUT_MS",
  "CLAUDE_CODE_ENABLE_AUTO_MODE",
  "CLAUDE_CODE_ENABLE_OPUS_4_7_FAST_MODE",
  "CLAUDE_CODE_ENABLE_TELEMETRY",
  "CLAUDE_CODE_EXECPATH",
  "CLAUDE_CODE_GATEWAY_TOKEN",
  "CLAUDE_CODE_HTTPS_PROXY",
  "CLAUDE_CODE_HTTP_PROXY",
  "CLAUDE_CODE_INSTALLED_VIA_NPM_WRAPPER",
  "CLAUDE_CODE_INVOKED_SKILLS",
  "CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION",
  "CLAUDE_CODE_OPUS_4_6_FAST_MODE_OVERRIDE",
  "CLAUDE_CODE_PROCESS_WRAPPER",
  "CLAUDE_CODE_PROFILE_QUERY",
  "CLAUDE_CODE_REMOTE_SESSION_UUID",
  "CLAUDE_CODE_TEAMMATE_COMMAND",
  "CLAUDE_CODE_USE_CCR_V2",
]);
//@ chunk-shkzs7rp.js:25561-25723 placement
function summarizeSetEnvVarNames(n) {
  let e = new Set([
    ...declaredEnvVarNames(env),
    ...declaredEnvVarNames(antEnv),
    ...declaredEnvVarNames(udsEnv),
    ...declaredEnvVarNames(tetherEnvAccessor),
    ...declaredEnvVarNames(toolServerEnvAccessor),
    ...declaredEnvVarNames(envOverrideAccessor),
  ]);
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(
    n.map((S) => (e.has(S) || TELEMETRY_SAFE_ENV_VAR_NAMES.has(S) ? S : "other")).join(","),
  );
}
//@ chunk-shkzs7rp.js:25723-25969 placement
function consumeBridgeChildProjectsEntrypoint() {
  {
    let n = env.CLAUDE_CODE_BRIDGE_CHILD_PROJECTS_ENTRYPOINT === true;
    env.unset("CLAUDE_CODE_BRIDGE_CHILD_PROJECTS_ENTRYPOINT");
    if (n && isBridgeEnvironment())
      if (useLocalProjectsEntrypoint()) logFeatureOk("bridge_projects_entrypoint_name");
      else logFeatureSad("bridge_projects_entrypoint_name", "host_name_kept");
  }
}
//@ chunk-shkzs7rp.js:27853-27950 placement
var SDK_ENTRYPOINTS = new Set([
  "sdk-ts",
  "sdk-py",
  "sdk-cli",
  "local-agent",
  "claude-desktop",
  "claude-desktop-3p",
]);
//@ chunk-shkzs7rp.js:27950-27980 placement
/**
 * 进程级警告处理：initializeWarningHandler + 定时器夹紧 + 另一个进程钩子。
 */
function installProcessWarningHandlers() {
  initializeWarningHandler();
  installTimerDelayClamp();
  registerClientDataGetters();
}
//@ chunk-shkzs7rp.js:27980-30942 fingerprint = main (0.47)
/**
 * main() 的前半（旧版 main 的同名部分）：判定是否非交互（-p/--print、非 TTY 等）并 setIsInteractive、从环境写入 launchOptions、读取 fd 传入的 OAuth/API key/WebSocket 令牌（code review 环境下强制要求 fd 4/5）、推断 clientType（github-action/sdk-*\/claude-vscode/remote/cli…）、预读 --settings。
 */
function applyClientTypeAndEarlySettings({ interactivity }) {
  let rawCliArgs = process.argv.slice(2);
  let S = interactivity.kind === "non-interactive" || detectNonInteractiveLaunch(rawCliArgs);
  if (S) stopCapturingEarlyInput();
  setIsInteractive(!S);
  initializeLaunchOptionsFromEnv(S);
  consumeBridgeChildProjectsEntrypoint();
  applyEntrypointOnRequestsEnv();
  setSessionStartType(hasResumeFlag(rawCliArgs));
  setAiAgentEnv();
  if (!isEnvTruthy(env.CLAUDE_CODE_REMOTE)) {
    if (
      env.CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR ||
      (env.CLAUDE_BG_AUTH_SNAPSHOT_PATH && !isBareMode() && !env.CLAUDE_CODE_OAUTH_TOKEN)
    )
      getOAuthTokenFromFileDescriptor();
    if (env.CLAUDE_CODE_GATEWAY_TOKEN_FILE_DESCRIPTOR) getGatewayTokenFromFileDescriptor();
    if (env.CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR) getApiKeyFromFileDescriptor();
    if (env.CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR) getSessionIngressAuthToken();
  } else if (usesSessionAccessToken()) {
    let E;
    disableCoreDumps((arg) => {
      E = arg;
    });
    if (E !== undefined) {
      process.stderr
        .write(`[code review] Not starting: Claude Code could not make itself non-dumpable (${E}), so the review's commands could read its tokens from memory. Start it with the released claude binary (check --exec-path), and allow prctl(PR_SET_DUMPABLE) in any sandbox or seccomp profile around it.
`);
      process.exit(1);
    }
    let x =
      env.CLAUDE_CODE_OAUTH_TOKEN !== undefined ||
      (process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN ?? "") !== "";
    let X = Boolean(env.CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR);
    let oe = Boolean(env.CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR);
    if (
      (eagerParseCliFlag("--sdk-url") !== undefined || x || X || oe) &&
      (x || !X || !oe || !getOAuthTokenFromFileDescriptor() || !getSessionIngressAuthToken())
    ) {
      process.stderr
        .write(`[code review] Not starting: in a code review Claude Code must get its two tokens on file descriptors 4 and 5, announced by CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR and CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR, and have neither CLAUDE_CODE_SESSION_ACCESS_TOKEN nor CLAUDE_CODE_OAUTH_TOKEN in its environment. Either the self-hosted runner is older than this Claude Code (update the runner); or an --exec-path wrapper closed or reused descriptor 4 or 5, dropped an announcement or set a token variable; or one of the review's commands started Claude Code with --sdk-url or a token variable (use ANTHROPIC_API_KEY there). See "Code reviews" in the self-hosted runners guide.
`);
      process.exit(1);
    }
  }
  let clientType = (() => {
    if (isEnvTruthy(env.GITHUB_ACTIONS)) return "github-action";
    if (env.CLAUDE_CODE_ENTRYPOINT === "sdk-ts") return "sdk-typescript";
    if (env.CLAUDE_CODE_ENTRYPOINT === "sdk-py") return "sdk-python";
    if (env.CLAUDE_CODE_ENTRYPOINT === "sdk-cli") return "sdk-cli";
    if (env.CLAUDE_CODE_ENTRYPOINT === "claude-vscode") return "claude-vscode";
    if (env.CLAUDE_CODE_ENTRYPOINT === "local-agent") return "local-agent";
    if (env.CLAUDE_CODE_ENTRYPOINT === "claude-desktop") return "claude-desktop";
    let hasSessionIngressToken =
      env.CLAUDE_CODE_SESSION_ACCESS_TOKEN ||
      hasPossibleCredentialFromDescriptor("CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR") ||
      env.CLAUDE_SESSION_INGRESS_TOKEN_FILE ||
      (isEnvTruthy(env.CLAUDE_CODE_REMOTE) && (getSessionIngressAuthToken() || isReviewSession()));
    if (env.CLAUDE_CODE_ENTRYPOINT === "remote" || hasSessionIngressToken) return "remote";
    return "cli";
  })();
  setClientType(clientType);
  let previewFormat = env.CLAUDE_CODE_QUESTION_PREVIEW_FORMAT;
  if (previewFormat === "markdown" || previewFormat === "html") setQuestionPreviewFormat(previewFormat);
  else if (
    !clientType.startsWith("sdk-") &&
    clientType !== "claude-desktop" &&
    clientType !== "local-agent" &&
    clientType !== "remote" &&
    !(clientType === "claude-vscode" && S)
  )
    setQuestionPreviewFormat("markdown");
  let D = SDK_ENTRYPOINTS.has(env.CLAUDE_CODE_ENTRYPOINT ?? "") || clientType === "remote";
  if (D && env.CLAUDE_CODE_QUESTION_EXTENDED) setExtendedQuestionsEnabled(true);
  if (D && env.CLAUDE_CODE_QUESTION_OPTIONAL_DESCRIPTIONS) setQuestionOptionDescriptionsOptional(true);
  if (S && env.CLAUDE_CODE_AGENT_PROGRESS_SUMMARIES) setSdkAgentProgressSummariesEnabled(true);
  profileCheckpoint("main_client_type_determined");
  eagerLoadSettings();
}
//@ chunk-shkzs7rp.js:30942-31006 placement
var BYPASS_IGNORED_NOTICE = "Bypass permissions was requested at launch and ignored";
//@ chunk-shkzs7rp.js:31006-31164 placement
function bypassIgnoredHint(n) {
  return ` \xB7 if that was you, ${isSettingSourceEnabled("userSettings") ? "" : "relaunch with user settings on; "}${n} needs "skipDangerousModePermissionPrompt": true`;
}
//@ chunk-shkzs7rp.js:31164-31578 placement
function buildPermissionModeNotifications(permissionModeNotification) {
  if (!permissionModeNotification)
    return {
      queue: [],
      pinned: [],
    };
  if (
    permissionModeNotification !== BYPASS_CONSENT_MESSAGE &&
    permissionModeNotification !== BG_UNCONSENTED_BYPASS_CAPABILITY_NOTICE
  )
    return {
      queue: [
        {
          key: "permission-mode-notification",
          text: permissionModeNotification,
          priority: "high",
        },
      ],
      pinned: [],
    };
  if (permissionModeNotification === BYPASS_CONSENT_MESSAGE)
    logForDebugging(`[permissions] ${permissionModeNotification}`, {
      level: "warn",
    });
  let e = tildify(getSettingsFilePathForSource("userSettings") ?? "~/.claude/settings.json");
  return {
    queue: [],
    pinned: [
      {
        key: "background-bypass-unconsented",
        kind: "warning",
        priority: "high",
        pinned: true,
        wrap: true,
        segments: [
          {
            text: BYPASS_IGNORED_NOTICE,
          },
          {
            text: bypassIgnoredHint(e),
            dim: true,
          },
        ],
      },
    ],
  };
}
//@ chunk-shkzs7rp.js:31578-31754 placement
function startRemoteControlAutoConnect(n, e) {
  let deferred = Promise.withResolvers();
  if (isCleanupStarted()) deferred.resolve();
  let A = e(Promise.race([waitForGate(n), deferred.promise])).catch((error) => logError(toError(error)));
  let r = registerCleanup(async () => {
    deferred.resolve();
    await A;
  });
  A.then(r);
}
//@ chunk-shkzs7rp.js:31754-32337 placement
function resolveRemoteControlAtStartup({ remoteControlFlag, isRemoteThinClient }) {
  let CLAUDE_CODE_REMOTE = env.CLAUDE_CODE_REMOTE;
  let explicitRemoteControlAtStartup = resolveExplicitRemoteControlAtStartup();
  let r =
    !isRemoteThinClient &&
    !CLAUDE_CODE_REMOTE &&
    !remoteControlFlag &&
    explicitRemoteControlAtStartup.value === undefined
      ? resolveCcrAutoConnectDefault()
      : undefined;
  let s =
    !isRemoteThinClient &&
    !CLAUDE_CODE_REMOTE &&
    (remoteControlFlag || (explicitRemoteControlAtStartup.value ?? r?.value ?? false));
  let D = false;
  let E = Boolean(env.CLAUDE_BRIDGE_REATTACH_SESSION);
  let CLAUDE_BRIDGE_REATTACH_OUTBOUND_ONLY = env.CLAUDE_BRIDGE_REATTACH_OUTBOUND_ONLY;
  let X = s || D || (E && !CLAUDE_BRIDGE_REATTACH_OUTBOUND_ONLY);
  let oe = !s && (E ? CLAUDE_BRIDGE_REATTACH_OUTBOUND_ONLY : D);
  return {
    replBridgeEnabled: X,
    replBridgeAutoOnByDefault:
      s && !remoteControlFlag && !E && explicitRemoteControlAtStartup.value === undefined,
    replBridgeExplicit: remoteControlFlag || (E && !CLAUDE_BRIDGE_REATTACH_OUTBOUND_ONLY && !s),
    replBridgeOutboundOnly: oe,
    explicit: explicitRemoteControlAtStartup,
    autoConnectDefault: r,
    ccrMirrorEnabled: D,
    remoteControlFlag,
    envRemote: CLAUDE_CODE_REMOTE,
    isRemoteThinClient,
    reattach: E,
    result: !X ? "off" : oe ? "mirror" : "full",
  };
}
//@ chunk-shkzs7rp.js:32337-32775 placement
function logRemoteControlAutostartResolved(remoteControlAtStartup) {
  logEvent("tengu_rc_autostart_resolved", {
    explicit_setting: fromEnum(
      remoteControlAtStartup.explicit.value === undefined
        ? "unset"
        : remoteControlAtStartup.explicit.value
          ? "true"
          : "false",
    ),
    explicit_source: fromEnum(remoteControlAtStartup.explicit.source),
    default_value: remoteControlAtStartup.autoConnectDefault?.value,
    default_source: fromEnum(remoteControlAtStartup.autoConnectDefault?.source ?? "unevaluated"),
    mirror: remoteControlAtStartup.ccrMirrorEnabled,
    remote_control_flag: remoteControlAtStartup.remoteControlFlag,
    env_remote: remoteControlAtStartup.envRemote,
    thin_client: remoteControlAtStartup.isRemoteThinClient,
    reattach: remoteControlAtStartup.reattach,
    result: fromEnum(remoteControlAtStartup.result),
  });
}
//@ chunk-shkzs7rp.js:32775-32801 placement
function identity2(n, defaultedToCloud) {
  return n;
}
//@ chunk-shkzs7rp.js:32870-32921 placement
process.env.NoDefaultCurrentDirectoryInExePath = "1";
//@ chunk-shkzs7rp.js:32921-32942 fingerprint
profileCheckpoint("main_tsx_entry");
//@ chunk-shkzs7rp.js:32942-32985 layout
recordPhase("node_boot_ms", process.uptime() * 1000, 0);
//@ chunk-shkzs7rp.js:32985-32991 layout
recordSpawnToExec();
//@ chunk-shkzs7rp.js:32991-32997 layout
startMdmRawRead();
//@ chunk-shkzs7rp.js:32997-33003 layout
startKeychainPrefetch();
//@ chunk-shkzs7rp.js:33003-33083 layout
var dialogLaunchersModule = () => require("./chunk-kgh2tnx9.js");
var interactiveHelpersModule = () => require("./chunk-pz8vz2wa.js");
//@ chunk-shkzs7rp.js:33083-33122 layout
function lazyCall(n) {
  return (...e) => n()(...e);
}
//@ chunk-shkzs7rp.js:33122-33918 layout
/**
 * main.tsx 用到的懒加载函数表：每个都是 lazyCall(() => require(对话框/交互帮助模块).X)，避免启动时加载 Ink 组件。
 */
var launchProviderSetupWizard = lazyCall(() => dialogLaunchersModule().launchProviderSetupWizard);
var launchCloudCreateChecklist = lazyCall(() => dialogLaunchersModule().launchCloudCreateChecklist);
var launchInvalidSettingsDialog = lazyCall(() => dialogLaunchersModule().launchInvalidSettingsDialog);
var launchDeviceMcpConsentDialog = lazyCall(() => dialogLaunchersModule().launchDeviceMcpConsentDialog);
var launchDeviceMcpReconsentDialog = lazyCall(() => dialogLaunchersModule().launchDeviceMcpReconsentDialog);
var launchDeviceReenrollDialog = lazyCall(() => dialogLaunchersModule().launchDeviceReenrollDialog);
var launchRemoteFileModeDialog = lazyCall(() => dialogLaunchersModule().launchRemoteFileModeDialog);
var launchRemoteHomeSettingsDialog = lazyCall(() => dialogLaunchersModule().launchRemoteHomeSettingsDialog);
var launchUnattendedServingConsentDialog = lazyCall(
  () => dialogLaunchersModule().launchUnattendedServingConsentDialog,
);
var launchResumeChooser = lazyCall(() => dialogLaunchersModule().launchResumeChooser);
var launchSnapshotUpdateDialog = lazyCall(() => dialogLaunchersModule().launchSnapshotUpdateDialog);
var launchTeleportHostUnverifiedDialog = lazyCall(
  () => dialogLaunchersModule().launchTeleportHostUnverifiedDialog,
);
var launchTeleportRepoMismatchDialog = lazyCall(
  () => dialogLaunchersModule().launchTeleportRepoMismatchDialog,
);
var launchTeleportResumeWrapper = lazyCall(() => dialogLaunchersModule().launchTeleportResumeWrapper);
var exitWithError = lazyCall(() => interactiveHelpersModule().exitWithError);
var getRenderContext = lazyCall(() => interactiveHelpersModule().getRenderContext);
var renderAndRun = lazyCall(() => interactiveHelpersModule().renderAndRun);
var showSetupScreens = lazyCall(() => interactiveHelpersModule().showSetupScreens);
var showSettingsLoadHold = lazyCall(() => interactiveHelpersModule().showSettingsLoadHold);
//@ chunk-shkzs7rp.js:33918-33948 fingerprint
profileCheckpoint("main_tsx_imports_loaded");
//@ chunk-shkzs7rp.js:33948-34079 layout
var loadStandaloneSecurityDialog = () =>
  getIsNonInteractiveSession()
    ? Promise.resolve(undefined)
    : import("./chunk-cy51s3bt.js").then(
        (n) => n.showStandaloneSecurityDialog,
        (error) => {
          logError(error);
          return;
        },
      );
//@ chunk-shkzs7rp.js:34079-34371 fingerprint = isBeingDebugged (1)
/**
 * 检测是否处于调试器下（--inspect/--debug 参数、NODE_OPTIONS 或 inspector.url()）；模块顶层若为真则直接 process.exit(1)。
 */
function isBeingDebugged() {
  let isBun = alwaysTrue();
  let hasInspectArg = process.execArgv.some((arg) => {
    if (isBun) return /--inspect(-brk)?/.test(arg);
    else return /--inspect(-brk)?|--debug(-brk)?/.test(arg);
  });
  let hasInspectEnv = env.NODE_OPTIONS && /--inspect(-brk)?|--debug(-brk)?/.test(env.NODE_OPTIONS);
  try {
    return !!global.require("inspector").url() || hasInspectArg || hasInspectEnv;
  } catch {
    return hasInspectArg || hasInspectEnv;
  }
}
//@ chunk-shkzs7rp.js:34371-34395 callgraph-fingerprint
if (isBeingDebugged()) process.exit(1);
//@ chunk-shkzs7rp.js:34395-34856 layout
/**
 * 统计 autoMode 规则（allow/soft_deny/hard_deny/environment）条数与总词数，供启动遥测。
 */
function getAutoModeRuleCounts() {
  let autoModeConfig = getAutoModeConfig();
  let e = {
    allow: 0,
    soft_deny: 0,
    hard_deny: 0,
    environment: 0,
  };
  let autoModeRuleWordCount = 0;
  for (let A of ["allow", "soft_deny", "hard_deny", "environment"])
    for (let r of autoModeConfig?.[A] ?? []) {
      if (r === DEFAULTS_PLACEHOLDER) continue;
      e[A] += count(
        r.split(`
`),
        (s) => s.trim().length > 0,
      );
      autoModeRuleWordCount += count(r.split(/\s+/), Boolean);
    }
  return {
    auto_mode_allow_rule_count: e.allow,
    auto_mode_soft_deny_rule_count: e.soft_deny,
    auto_mode_hard_deny_rule_count: e.hard_deny,
    auto_mode_environment_rule_count: e.environment,
    auto_mode_rule_word_count: autoModeRuleWordCount,
  };
}
//@ chunk-shkzs7rp.js:34856-35158 fingerprint = getCertEnvVarTelemetry (0.905)
/**
 * 证书相关环境的遥测字段：NODE_EXTRA_CA_CERTS、CLAUDE_CODE_CLIENT_CERT、--use-system-ca/--use-openssl-ca、CLAUDE_CODE_CERT_STORE。
 */
function getCertEnvVarTelemetry() {
  let result = {};
  if (env.NODE_EXTRA_CA_CERTS) result.has_node_extra_ca_certs = true;
  if (env.CLAUDE_CODE_CLIENT_CERT) result.has_client_cert = true;
  if (hasNodeOption("--use-system-ca")) result.has_use_system_ca = true;
  if (hasNodeOption("--use-openssl-ca")) result.has_use_openssl_ca = true;
  if (env.CLAUDE_CODE_CERT_STORE) result.cert_store = env.CLAUDE_CODE_CERT_STORE;
  return result;
}
//@ chunk-shkzs7rp.js:35158-36092 fingerprint = logStartupTelemetry (0.616)
/**
 * 发送 tengu_startup_telemetry：git/worktree 数、gh 登录状态、沙箱开关、自动更新是否禁用、主题、设置过的环境变量名与非默认设置等。
 */
async function logStartupTelemetry(globalConfig, e) {
  if (isFirstPartyTelemetryBlocked()) return;
  let [isGit, worktreeCount, ghAuthStatus, s] = await Promise.all([
    getIsGit(),
    getWorktreeCount(),
    getGhAuthStatus({
      allowNetworkFallbackForOldGh: false,
    }),
    null,
  ]);
  let D = envVarsForTelemetry();
  let E = nonDefaultGlobalConfigKeys(globalConfig);
  let x = setUserSettingKeys(getInitialSettings_2());
  let X = resolveSetting("theme", "dark").value;
  let setting = resolveSetting("precomputeCompactionEnabled", true);
  logEvent("tengu_startup_telemetry", {
    is_git: isGit,
    worktree_count: worktreeCount,
    ...e,
    ...false,
    warm_spare_claimed: wasWarmSpareClaimed(),
    gh_auth_status: fromEnum(ghAuthStatus.status),
    sandbox_enabled: SandboxManager.isSandboxingEnabled(),
    are_unsandboxed_commands_allowed: SandboxManager.areUnsandboxedCommandsAllowed(),
    is_auto_bash_allowed_if_sandbox_enabled: SandboxManager.isAutoAllowBashIfSandboxedEnabled(),
    auto_updater_disabled: isAutoUpdaterDisabled(),
    prefers_reduced_motion: getInitialSettings_2().prefersReducedMotion ?? false,
    precompute_compaction_setting_enabled: setting.value,
    precompute_compaction_setting_source: fromEnum(setting.source),
    theme: fromEnumOpt(CONFIG_SOURCE_LABELS.find((ce) => ce === X)) ?? lit("custom"),
    set_env_var_count: D.length,
    set_env_vars: summarizeSetEnvVarNames(D),
    nondefault_setting_count: E.length,
    nondefault_settings: fromEnumArr(E),
    set_user_settings_count: x.length,
    set_user_settings: fromEnumArr(x),
    ...getCertEnvVarTelemetry(),
    ...getAutoModeRuleCounts(),
  });
}
//@ chunk-shkzs7rp.js:36092-37015 placement
/**
 * 主入口（cli.js 动态导入后调用）：初始化警告处理与定时器夹紧、注册退出时恢复光标；处理 --handle-uri 深链；必要时改写 argv（导入命令别名）；调用 applyClientTypeAndEarlySettings 后进入 run()。
 */
async function main(storageV5EnvPin) {
  profileCheckpoint("main_function_start");
  configureZodForStartup();
  registerToolHosts();
  installProcessWarningHandlers();
  latchFullscreenTrialFromEnv();
  process.on("exit", () => {
    restoreCursorOnExit();
  });
  profileCheckpoint("main_warning_handler_initialized");
  let index = process.argv.indexOf("--handle-uri");
  if (index !== -1 && process.argv[index + 1]) {
    let s = validateHandleUriArgs(process.argv);
    if (s) {
      console.error(s);
      process.exit(1);
    }
    let D = process.argv[index + 1];
    let { enableConfigs } = await import("./chunk-eesswvbz.js");
    await enableConfigs(isStorageV5Enabled() ? storageV5EnvPin?.backend : undefined);
    let { handleDeepLinkUri } = await import("./chunk-bh9w80kx.js");
    let X = await handleDeepLinkUri(D);
    process.exit(X);
  }
  let argsAsTyped = process.argv.slice(2);
  let A = undefined;
  let r = undefined;
  {
    let importArgv = parseImportArgv(process.argv.slice(2));
    if (importArgv !== null) {
      let { enableConfigs } = await import("./chunk-eesswvbz.js");
      let E;
      try {
        await enableConfigs(isStorageV5Enabled() ? storageV5EnvPin?.backend : undefined);
        E = isImportEnabled();
      } catch {
        E = undefined;
      }
      let x = planImportRewrite(importArgv, E);
      if (x.kind === "rewrite") process.argv = [process.argv[0], process.argv[1], ...x.argv];
      else
        return cliError(x.kind === "config-error" ? CONFIG_UNREADABLE_MESSAGE : IMPORT_UNAVAILABLE_MESSAGE);
    }
  }
  applyClientTypeAndEarlySettings({
    interactivity: {
      kind: "detect",
    },
  });
  profileCheckpoint("main_before_run");
  await run(A, r, storageV5EnvPin, argsAsTyped);
  profileCheckpoint("main_after_run");
}
//@ chunk-shkzs7rp.js:37015-48983 placement
/**
 * 调用 commander 构建器（runCommander/Lks）得到 program，注册全部子命令（gateway、mcp、plugin、auth、setup-token、agents、ultrareview、auto-mode、remote-control、doctor、sandbox、update、install、import…），然后 parseAsync(process.argv)。-p 或非 help 时跳过子命令注册以加快启动。
 */
async function run(n, e, storageV5EnvPin, argsAsTyped) {
  profileCheckpoint("run_function_start");
  let { program, withStorageV5, withStartupHandles } = buildCliProgram({
    storageV5EnvPin,
    showSecurityDialog: loadStandaloneSecurityDialog,
    showInvalidConfigDialog: (y) => import("./chunk-zenpc8qn.js").then((h) => h.showInvalidConfigDialog(y)),
    showOrgConfigBlockedScreen: () =>
      import("./chunk-6bvzpeaf.js").then(
        (y) => y.showOrgConfigBlockedScreen,
        (error) => {
          logError(error);
          return;
        },
      ),
    endInkWithError: (y, h) => interactiveHelpersModule().endInkWithError(y, h),
    runOnboarding: (y) => runOnboardingAndSetupScreens(y),
    handleInvalidSettings: (y, settingsErrors) =>
      launchInvalidSettingsDialog(y, {
        settingsErrors,
        onExit: () => gracefulShutdownSync(1),
      }),
    runInteractiveSession: (y, h) => runInteractiveSession(y, h, n, e),
    pendingConnect: n,
    pendingSSH: e,
    argsAsTyped,
    openLiveBackgroundSessionForResume: tryOpenLiveBackground,
  });
  let command = process.argv.slice(2);
  let x = eagerHasCliFlag("-p", command) || eagerHasCliFlag("--print", command);
  let X = eagerFindCliArg(isConnectUrlArg, command) !== -1;
  if (x && !X) {
    profileCheckpoint("run_before_parse");
    await program.parseAsync(process.argv);
    profileCheckpoint("run_after_parse");
    return program;
  }
  if (!mayDispatchSubcommand(command) && !X) {
    profileCheckpoint("run_before_parse");
    await program.parseAsync(process.argv);
    profileCheckpoint("run_after_parse");
    profileCheckpoint("main_after_run");
    profileReport();
    return program;
  }
  {
    let y = program
      .command("gateway")
      .description("Run the enterprise auth/telemetry gateway")
      .requiredOption("--config <path>", "Path to gateway YAML config")
      .action(async ({ config }) => {
        try {
          let { startGateway } = await import("./chunk-1ny7cxrt.js");
          let { drainOnSignal } = await import("./chunk-c82nj8g9.js");
          drainOnSignal(await startGateway(config), claimShutdown);
        } catch (error) {
          process.stderr.write(`claude gateway: ${error instanceof Error ? error.message : String(error)}
`);
          process.exit(1);
        }
      });
    program.hook("preSubcommand", (h, O) => {
      if (O === y) setGatewayServerProcess(true);
    });
  }
  let { registerMcpCommands } = require("./chunk-4vq0yytw.js");
  let { registerPluginCommands } = require("./chunk-mgpyrzb5.js");
  registerMcpCommands(program, withStorageV5);
  registerEditHookCommand(program, withStorageV5);
  registerPermissionsCommands(program, withStorageV5);
  let Me = program.command("auth").description("Manage authentication").configureHelp(createHelpConfig());
  Me.command("login")
    .description("Sign in to your Anthropic account")
    .option("--email <email>", "Pre-populate email address on the login page")
    .option("--sso", "Force SSO login flow")
    .option("--console", "Use Anthropic Console (API usage billing) instead of Claude subscription")
    .option("--claudeai", "Use Claude subscription (default)")
    .addOption(
      new Option(
        "--gateway-json",
        "For a program that shows the Cloud gateway sign-in to a person: writes its questions as JSON lines and reads the answers from stdin",
      ).hideHelp(),
    )
    .action(
      withStartupHandles(async (y, h, { email, sso, console: W, claudeai, gatewayJson }) => {
        let { authLogin } = await import("./chunk-84jf153s.js");
        await authLogin(
          {
            email,
            sso,
            console: W,
            claudeai,
            gatewayJson,
          },
          y,
          h,
        );
      }),
    );
  Me.command("status")
    .description("Show authentication status")
    .option("--json", "Output as JSON (default)")
    .option("--text", "Output as human-readable text")
    .action(
      withStorageV5(async (y, h) => {
        let [{ authStatus: O }, { createSubcommandRoot: w }, { credentialsStoreFor: W }] = await Promise.all([
          import("./chunk-84jf153s.js"),
          import("./chunk-tt9rxcw9.js"),
          import("./chunk-y36z1q7c.js"),
        ]);
        await O(await w(), h, W(y));
      }),
    );
  Me.command("logout")
    .description("Log out from your Anthropic account")
    .action(
      withStartupHandles(async (y, h) => {
        let [{ authLogout: O }, { createSubcommandRoot: w }, { exitAfterAnalyticsFlush: W }] =
          await Promise.all([
            import("./chunk-84jf153s.js"),
            import("./chunk-tt9rxcw9.js"),
            import("./chunk-kahpc3cs.js"),
          ]);
        await O(await w(), y, h);
        await W(0);
      }),
    );
  let co = registerPurgeCommands(program, withStorageV5);
  registerPluginCommands(program, withStorageV5, withStartupHandles);
  program
    .command("setup-token")
    .description("Set up a long-lived authentication token (requires Claude subscription)")
    .allowExcessArguments(false)
    .action(async (y) => {
      let [{ setupTokenHandler: h }, { createRoot: O }] = await Promise.all([
        import("./chunk-tt9rxcw9.js"),
        import("./chunk-1m6xc21j.js"),
      ]);
      let w = await O(getBaseRenderOptions(false));
      await h(w, y);
    });
  let uo = program
    .command("agents")
    .description("Manage background agents")
    .allowExcessArguments(false)
    .option(
      "--setting-sources <sources>",
      "Comma-separated list of setting sources to load (user, project, local).",
    )
    .option("--cwd <path>", "Show only background sessions started under <path>")
    .option(
      "--add-dir <directory>",
      "Additional directory to allow tool access to in dispatched sessions (repeatable)",
    )
    .option(
      "--plugin-dir <path>",
      "Load plugins from specified directory for the agent view and dispatched sessions; a folder of plugins loads each child (repeatable)",
    )
    .addOption(
      new Option(
        "--plugin-dir-no-mcp <path>",
        "Like --plugin-dir but the engine will not read this plugin's .mcp.json",
      ).hideHelp(),
    )
    .option(
      "--settings <file-or-json>",
      "Settings file or JSON string to apply to the agent view and dispatched sessions",
    )
    .addOption(new Option("--managed-settings <json>").hideHelp())
    .option("--mcp-config <config>", "MCP server configuration to apply to dispatched sessions (repeatable)")
    .option("--strict-mcp-config", "Only use MCP servers from --mcp-config in dispatched sessions")
    .option("--restricted", "Start dispatched sessions in restricted mode")
    .option("--permission-mode <mode>", "Default permission mode for sessions dispatched from agent view")
    .addOption(new Option("--inherit-permission-mode <mode>").hideHelp())
    .option("--dangerously-skip-permissions", "Alias for --permission-mode bypassPermissions")
    .option(
      "--allow-dangerously-skip-permissions",
      "Make bypass-permissions mode available to dispatched sessions without defaulting to it",
    )
    .option("--model <model>", "Default model for sessions dispatched from agent view")
    .option("--effort <level>", "Default effort level for sessions dispatched from agent view")
    .option(
      "--agent <agent>",
      "Default agent for sessions dispatched from agent view. Overrides the 'agent' setting.",
    )
    .option(
      "--json",
      "Print active sessions (interactive and background) as a JSON array and exit (for scripting; does not require a TTY)",
    )
    .option("--all", "With --json: also include completed background sessions")
    .action(
      withStartupHandles(async (y, h, O, w) => {
        let { agentsCommandHandler } = await import("./chunk-xv2m2k8x.js");
        await agentsCommandHandler(O, w.optsWithGlobals(), y, h);
      }),
    );
  addBackgroundVerbsToHelp(program);
  program
    .command("ultrareview [target]")
    .usage("[target] [options]")
    .description(
      "Run a cloud-hosted multi-agent code review of the current branch (or a PR number / base branch) and print the findings",
    )
    .option("--json", "Print the raw bugs.json payload instead of formatted findings")
    .option("--timeout <minutes>", "Maximum minutes to wait for the review to finish (default: 45)")
    .option(
      "--post",
      "Post the finished review's findings to the PR as you (PR targets only; one plain comment, not a review)",
    )
    .option(
      "--no-post",
      "Do not post the findings to the PR (the default; accepted for parity with the /ultrareview and /code-review ultra flags)",
    )
    .option(
      "--trust-workspace",
      "Trust the current folder for this run only, without asking (for scripts and CI). Takes no value: put a PR number or base branch before it. Use it only on folders you trust: the folder's git configuration and Claude Code project settings can run programs",
    )
    .action(
      withStartupHandles(async (y, h, O, w) => {
        let { ultrareviewHandler } = await import("./chunk-jzm79q04.js");
        await ultrareviewHandler(O ?? "", w, y, h);
        process.exit(0);
      }),
    );
  {
    let y = program.command("auto-mode").description("Inspect or reset auto mode configuration");
    y.command("defaults")
      .description("Print the default auto mode environment, allow, soft_deny, and hard_deny rules as JSON")
      .option("--label <prefix>", "Show only rules whose label starts with this prefix (case-insensitive)")
      .action(async ({ label }) => {
        let [{ autoModeDefaultsHandler: O }, { createSubcommandRoot: w }, { exitAfterAnalyticsFlush: W }] =
          await Promise.all([
            import("./chunk-t2bgh7t8.js"),
            import("./chunk-tt9rxcw9.js"),
            import("./chunk-kahpc3cs.js"),
          ]);
        await O(await w(), label);
        await W(0);
      });
    y.command("config")
      .description(
        "Print the effective auto mode config as JSON: your settings where set, defaults otherwise",
      )
      .action(async () => {
        let [{ autoModeConfigHandler: h }, { createSubcommandRoot: O }, { exitAfterAnalyticsFlush: w }] =
          await Promise.all([
            import("./chunk-t2bgh7t8.js"),
            import("./chunk-tt9rxcw9.js"),
            import("./chunk-kahpc3cs.js"),
          ]);
        await h(await O());
        await w(0);
      });
    y.command("reset")
      .description(
        "Reset auto mode configuration to the shipped defaults by removing the autoMode section from your user settings file",
      )
      .option("-y, --yes", "Skip the confirmation prompt")
      .action(
        withStorageV5(async (h, O) => {
          let [{ autoModeResetHandler: w }, { exitAfterAnalyticsFlush: W }] = await Promise.all([
            import("./chunk-t2bgh7t8.js"),
            import("./chunk-kahpc3cs.js"),
          ]);
          await w(O, h);
          await W(0);
        }),
      );
    y.command("critique")
      .description("Get AI feedback on your custom auto mode rules")
      .option("--model <model>", "Override which model is used")
      .action(
        withStartupHandles(async (h, O, w) => {
          let [{ autoModeCritiqueHandler: W }, { createSubcommandRoot: Ne }, { exitAfterAnalyticsFlush: q }] =
            await Promise.all([
              import("./chunk-t2bgh7t8.js"),
              import("./chunk-tt9rxcw9.js"),
              import("./chunk-kahpc3cs.js"),
            ]);
          await W(await Ne(), w, O);
          await q(0);
        }),
      );
  }
  program
    .command("remote-control", {
      hidden: true,
    })
    .alias("rc")
    .description("Control local sessions from claude.ai/code or the Claude mobile app")
    .helpOption(false)
    .allowUnknownOption()
    .allowExcessArguments(true)
    .action(
      withStartupHandles(async (y, h, O, w) => {
        let { enterRemoteControl, rootOptionsRefusedMessage, rootOptionsRemoteControlRefuses } =
          await import("./chunk-4wmk8g5n.js");
        let me = rootOptionsRemoteControlRefuses(getCliSuppliedOptions(program));
        if (me.length > 0) return cliError(rootOptionsRefusedMessage(me));
        await enterRemoteControl(w.args, y, h);
      }),
    );
  program
    .command("doctor")
    .description(
      "Check the health of your Claude Code installation. Reads settings files in the current directory without a trust prompt. For a full checkup that can also fix issues, run /doctor in a session.",
    )
    .action(
      withStorageV5(async (y) => {
        let { doctorHandler } = await import("./chunk-tt9rxcw9.js");
        await doctorHandler(y);
      }),
    );
  program
    .command(APPLY_PROJECT_SETTINGS, {
      hidden: true,
    })
    .summary(APPLY_PROJECT_SETTINGS_DESCRIPTION)
    .description(
      "Review how your Claude Code settings (~/.claude/settings.json) and this folder's (.claude/settings.json, .claude/settings.local.json) differ from what you accepted for cloud sessions on this computer, and accept them. Needs a terminal.",
    )
    .allowExcessArguments(false)
    .action(
      withStartupHandles(async (y, h) => {
        let { applyProjectSettingsHandler } = await import("./chunk-61a1pjwa.js");
        await applyProjectSettingsHandler(getRootSession(), y, h);
      }),
    );
  let no = program.command("sandbox", {
    hidden: true,
  });
  no.command("install")
    .description(
      'Install the Windows sandbox user and network filters. Self-elevates (one UAC prompt). Prints a JSON {status, message} result and exits 0 only when status is "ok".',
    )
    .action(async () => {
      let { sandboxInstallHandler } = await import("./chunk-v21qppnj.js");
      await sandboxInstallHandler();
    });
  no.command("status")
    .description(
      "Print the effective sandbox posture (enabled, its source, strict mode, filesystem policy, Bash auto-allow) and the Windows install state as one JSON line.",
    )
    .action(async () => {
      let { sandboxStatusHandler } = await import("./chunk-v21qppnj.js");
      await sandboxStatusHandler();
    });
  no.command("uninstall")
    .description(
      "Remove the Windows sandbox account and network filters from this PC, then list what stays behind; Windows may ask for administrator approval",
    )
    .option("--json", "Print one JSON line: {status, message, leftBehind, filtersChecked}")
    .action(async (y) => {
      let { sandboxUninstallHandler } = await import("./chunk-v21qppnj.js");
      await sandboxUninstallHandler(y);
    });
  program
    .command("update")
    .alias("upgrade")
    .description(
      "Check for updates and install if available; package-manager installs update through the package manager",
    )
    .action(
      withStorageV5(async (y) => {
        let { update } = await import("./chunk-rkjj4sjx.js");
        await update(y);
      }),
    );
  program
    .command("install [target]")
    .description(
      "Install Claude Code native build. Use [target] to specify version (stable, latest, or specific version)",
    )
    .option("--force", "Force installation even if already installed")
    .action(
      withStorageV5(async (y, h, O) => {
        let { installHandler } = await import("./chunk-tt9rxcw9.js");
        await installHandler(h, O, y);
      }),
    );
  program
    .command("import")
    .argument("[source]", "Which agent to import from (codex, gemini, cursor)")
    .option("--dry-run", "Show what would be imported without writing anything")
    .option(
      "--yes",
      "Skip the interactive picker. On headless surfaces, pass --yes=<digest> from the `/import` preview.",
    )
    .description("Import config from another AI coding agent into Claude Code")
    .action(() => {
      if (!isImportEnabled()) return cliError(IMPORT_UNAVAILABLE_MESSAGE);
      cliError(`Usage: claude import [codex|gemini|cursor] [--dry-run] [--yes[=<digest>]]

Starts an interactive session and runs /import.`);
    });
  program
    .command("import-conversations <exportPath>", {
      hidden: true,
    })
    .option("--cwd <dir>", "Archive directory the imported sessions anchor to")
    .option("--dry-run", "Parse and verify manifest without writing files")
    .action(
      withStorageV5(async (y, h, O) => {
        let { importConversationsHandler } = await import("./chunk-sdzpqjn8.js");
        await importConversationsHandler(h, O, y);
      }),
    );
  profileCheckpoint("run_before_parse");
  await program.parseAsync(process.argv);
  profileCheckpoint("run_after_parse");
  profileCheckpoint("main_after_run");
  profileReport();
  return program;
}
//@ chunk-shkzs7rp.js:48983-49005 placement
async function noopAsync(n) {}
//@ chunk-shkzs7rp.js:49005-49111 placement
function restoreCursorOnExit() {
  (process.stderr.isTTY ? process.stderr : process.stdout.isTTY ? process.stdout : undefined)?.write(
    SHOW_CURSOR,
  );
}
//@ chunk-shkzs7rp.js:49111-53866 placement
/**
 * 交互模式的引导段：createRoot 建 Ink 根，执行 showSetupScreens（信任、onboarding、Chrome 提议等），信任后重新加载 MCP 配置、处理 --rc、刷新远程托管设置、启动受信遥测，最后校验 forceLoginOrg。
 */
async function runOnboardingAndSetupScreens(n) {
  let {
    session,
    options,
    teleport,
    permissionMode,
    toolPermissionContext,
    storedTeammateOpts,
    isSSHPending,
    allowDangerouslySkipPermissions,
    skippedChromeForAdminPolicy,
    enableClaudeInChrome,
    chromeDeniedByPolicy,
    devChannels,
    offerClaudeInChrome,
    askCloudDefaultReason,
    wasTrustedBeforeSetup,
    wasPersistedTrustedBeforeSetup,
    strictMcpConfig,
    currentCwd,
    providerSetupCommand,
    remoteControlOption,
    projectForRemoteControl,
    mainThreadAgentDefinition,
    storageV5,
    credentials,
  } = n;
  let { commands, mcpConfigPromise, dynamicMcpConfig, remoteControl, inputPrompt, prompt } = n;
  let pe = false;
  let go = false;
  let mcpApprovalSkipWarning = null;
  let renderContext = getRenderContext(false);
  let { getFpsMetrics, stats } = renderContext;
  checkFullscreenBootGuard({
    storageV5,
  });
  let { createRoot } = await import("./chunk-1m6xc21j.js");
  let root = await createRoot(renderContext.renderOptions, {
    storageV5,
  });
  logEvent("tengu_timer", {
    event: lit("startup"),
    durationMs: Math.round(process.uptime() * 1000),
    resumed: !!(options.resume || options.continue),
  });
  logForDebugging("[STARTUP] Running showSetupScreens()...");
  let now = Date.now();
  let Ve = false;
  let lt = shouldSuppressChromeOffer({
    isSSHPending,
    isRemoteMode: getIsRemoteMode(),
    hasTeleport: Boolean(teleport),
    isSafeMode: isSafeMode() || toolPermissionContext.restricted === true,
    permissionMode,
    isBypassPermissionsModeAvailable: toolPermissionContext.isBypassPermissionsModeAvailable,
    teammateAgentId: storedTeammateOpts?.agentId,
  });
  ({
    onboardingShown: pe,
    onboardingSkippedSignIn: go,
    mcpApprovalSkipWarning,
    claudeInChromeAccepted: Ve,
  } = await showSetupScreens(
    session,
    root,
    isSSHPending ? "default" : permissionMode,
    isSSHPending ? false : allowDangerouslySkipPermissions,
    commands,
    skippedChromeForAdminPolicy || (enableClaudeInChrome && chromeDeniedByPolicy)
      ? false
      : enableClaudeInChrome,
    devChannels,
    lt ? false : offerClaudeInChrome,
    storageV5,
    credentials,
    askCloudDefaultReason,
  ));
  setOnboardingShownThisSession(pe);
  logForDebugging(`[STARTUP] showSetupScreens() completed in ${Date.now() - now}ms`);
  if (
    ((!wasTrustedBeforeSetup && checkHasTrustDialogAccepted()) ||
      (!wasPersistedTrustedBeforeSetup && isWorkspacePersistedTrusted())) &&
    !strictMcpConfig &&
    !isBareMode() &&
    !getIsRemoteMode()
  ) {
    let now = Date.now();
    mcpConfigPromise = awaitMcpPolicyColdStart({
      hasDynamicMcpConfig: true,
    })
      .then(() =>
        getClaudeCodeMcpConfigs(dynamicMcpConfig, {
          storageV5,
          credentials,
        }),
      )
      .then((qe) => {
        n.mcpConfigResolvedMs.value = Date.now() - now;
        return qe;
      });
  }
  if (Ve && !isClaudeInChromeAllowed())
    logForDebugging(
      "[Claude in Chrome] Skipping accepted offer: denied by organization policy (allow_claude_browser_extension)",
    );
  else if (Ve) {
    try {
      logEvent("tengu_claude_in_chrome_setup", {
        platform: platformOrOther(getPlatform()),
      });
      let { mcpConfig, systemPrompt } = setupClaudeInChrome();
      dynamicMcpConfig = {
        ...dynamicMcpConfig,
        ...mcpConfig,
      };
      putChromePromptInSystemPrompt(systemPrompt);
    } catch (error) {
      logEvent("tengu_claude_in_chrome_setup_failed", {
        platform: platformOrOther(getPlatform()),
      });
      logError(error);
      logForDebugging(`[Claude in Chrome] Error (startup offer): ${error}`);
    }
    try {
      commands = await getCommands(currentCwd, storageV5);
    } catch (error) {
      logForDebugging(`[Claude in Chrome] command refresh after accept failed: ${error}`);
    }
  }
  if (remoteControlOption !== undefined) {
    let M;
    if (getIsRemoteMode()) M = "Remote Control is not available inside a cloud session.";
    else if (teleport)
      M = "--teleport sessions start without Remote Control. Use /remote-control to enable it.";
    else {
      let { getBridgeDisabledDiagnosis } = await import("./chunk-zke21f1q.js");
      let bridgeDisabledDiagnosis = await getBridgeDisabledDiagnosis();
      M = bridgeDisabledDiagnosis?.reason ?? null;
      if (bridgeDisabledDiagnosis?.orgPolicyDenied) logOrgPolicyDenied("allow_remote_control", "cli_flag");
    }
    remoteControl = M === null;
    if (M)
      warnStartupIssues(
        `${M} ${projectForRemoteControl ? "--rc and --project ignored." : "--rc flag ignored."}`,
      );
    else markRemoteControlUsed(storageV5);
  }
  if (pe && !go && prompt?.trim().toLowerCase() === "/login") prompt = "";
  if (pe) {
    if (isForceRemoteSettingsRefreshConfigured()) {
      let M = await validateForceRemoteSettingsRefresh(
        async () =>
          refreshRemoteManagedSettings(await loadStandaloneSecurityDialog(), storageV5, credentials, {
            startupAwaited: true,
          }),
        machineForcedRefresh,
      );
      if (!M.valid)
        return await exitWithError(root, M.message, () =>
          sendManagedSettingsRefusal("force_refresh_failed").then(emitManagedConfigReadyAtExit),
        );
    } else if (getAPIProvider() === "gateway") {
      if (
        !(await refreshRemoteManagedSettings(await loadStandaloneSecurityDialog(), storageV5, credentials, {
          startupAwaited: true,
        }))
      ) {
        let M = gatewaySettingsFailure();
        return await exitWithError(
          root,
          M.endedSession
            ? `Cloud gateway ${M.gatewayUrl} did not accept the new sign-in. Start \`claude\` to try /login again, or contact your administrator.`
            : M.exitMessage,
          () =>
            sendManagedSettingsRefusal(M.forbidden ? "gateway_rejected" : "_OTHER").then(
              emitManagedConfigReadyAtExit,
            ),
        );
      }
    } else
      switch (
        await refreshRemoteManagedSettingsForStartup(
          await loadStandaloneSecurityDialog(),
          storageV5,
          credentials,
        )
      ) {
        case "refreshed":
          break;
        case "consent_pending":
          logForDebugging(
            "Remote settings: fetched settings need consent \u2014 dialog opens once the REPL mounts; settings apply after approval",
          );
          break;
        case "timed_out":
          logForDebugging(
            "Remote settings: refresh still in flight at REPL mount \u2014 org settings (company announcements included) may apply later this session",
            {
              level: "warn",
            },
          );
          break;
        case "failed":
          logForDebugging(
            "Remote settings: post-onboarding refresh did not complete \u2014 org settings may be stale or absent this session",
            {
              level: "warn",
            },
          );
          break;
      }
    if (getAPIProvider() === "gateway") {
      if (hasPolicyDiverged()) {
        await saveGlobalConfig(
          (M) => ({
            ...M,
            hasCompletedOnboarding: true,
            lastOnboardingVersion: {
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
          }),
          storageV5,
        );
        root.unmount();
        return await import("./chunk-sv7j935w.js").then((M) => M.execRelaunch());
      }
      resetProviderBoundCaches("gateway");
      applyConfigEnvironmentVariables();
    }
    initializeTelemetryAfterTrust(storageV5);
    refreshPolicyLimits();
    resetUserData();
    refreshGrowthBookAfterAuthChange();
    import("./chunk-3kb57csj.js").then((M) => {
      M.clearTrustedDeviceToken();
      return M.enrollTrustedDevice({
        credentials,
      });
    });
  }
  let Ao = await validateForceLoginOrg(credentials);
  if (!Ao.valid)
    await exitWithError(root, Ao.message, () => sendOrgValidationRefusal(Ao).then(flushAnalyticsSinks));
  return {
    root,
    getFpsMetrics,
    stats,
    mcpApprovalSkipWarning,
    mcpConfigPromise,
    dynamicMcpConfig,
    commands,
    remoteControl,
    inputPrompt,
    prompt,
  };
}
//@ chunk-shkzs7rp.js:53866-54318 placement
function logDeepLinkLaunch(session, e) {
  if (e.deepLinkOrigin) {
    logEvent("tengu_deep_link_opened", {
      has_prefill: Boolean(e.prefill),
      has_repo: Boolean(e.deepLinkRepo),
    });
    logForDebugging(
      buildDeepLinkBanner({
        cwd: getCwd(),
        prefillLength: e.prefill?.length,
        repo: e.deepLinkRepo,
        lastFetch: e.deepLinkLastFetch !== undefined ? new Date(e.deepLinkLastFetch) : undefined,
      }),
      {
        level: "info",
      },
    );
    if (e.prefill)
      setPromptLaunchWarning(session, {
        type: "deep-link",
        prefillLength: e.prefill.length,
        text: e.prefill,
      });
  } else if (e.prefill)
    setPromptLaunchWarning(session, {
      type: "prefill",
      prefillLength: e.prefill.length,
    });
}
//@ chunk-shkzs7rp.js:54318-54548 placement
function printConsoleCloudSignInHint(n) {
  process.stdout
    .write(`Opening your browser to sign in for cloud sessions with your Console organization. If it doesn't open here, visit this address in a browser on any computer and paste the code it shows:
${n}
`);
}
//@ chunk-shkzs7rp.js:54548-86699 placement
/**
 * 交互会话主体：根据 --continue/--resume/--teleport/--cloud/--from-pr 等分支恢复或创建会话，最后调用 launchRepl（chunk-19arrzdw 的 aLt）渲染 App+REPL。
 */
async function runInteractiveSession(n, e, S, A) {
  let { mainThreadAgentDefinition, remote } = n;
  let {
    advisorModel,
    agentDefinitions,
    agentSetting,
    appendSystemPrompt,
    autoCompactWindow,
    cliAgents,
    cloudDefaultNotAllowed,
    personalWithoutEffectNotification,
    sandboxVmStayReason,
    commands,
    correlationId,
    currentCwd,
    dangerouslySkipPermissions,
    debug,
    defaultedToCloud,
    disableSlashCommands,
    dynamicMcpConfig,
    environmentQuery,
    fileDownloadPromise,
    forwardHomeSettings,
    homeSettingsConsent,
    getFpsMetrics,
    ide,
    initialFocusView,
    initialMainLoopModel,
    inputPrompt,
    mcpApprovalSkipWarning,
    mcpClients,
    mcpCommands,
    mcpTools,
    modelProvenance,
    monorepo,
    noMonorepo,
    noMonorepoAsksTheService,
    permissionModeCli,
    permissionModeNotification,
    persistentVolume,
    persistentVolumeFromSessionId,
    personal,
    poolId,
    poolOnBranch,
    poolPromotedRemote,
    poolRef,
    preDecorationInputPrompt,
    proactivityLevel,
    projectBrowse,
    projectForRemoteControl,
    rawModelRequest,
    remoteControl,
    remoteControlName,
    remoteDroppedMcpMessages,
    resolvedInitialModel,
    restrictedModel,
    resumeInCloud,
    root,
    session,
    sessionGroupingId,
    sessionNameArg,
    sessionStartHooks,
    sessionTeamContext,
    stats,
    storageV5,
    credentials,
    strictMcpConfig,
    structuredOutputTool,
    systemPrompt,
    teleport,
    terminalInput,
    thinkingConfig,
    thinkingConfigExplicit,
    thinkingDisplayFlag,
    thinkingEnabled,
    toolPermissionContext,
    unknownModelWindow,
    securityWarnings,
    userSpecifiedFallbackModel,
    verbose,
    wasPersistedTrustedBeforeSetup,
    wasTrustedBeforeSetup,
  } = n;
  logStartupTiming("interactive_prepared");
  logEvent("tengu_startup_manual_model_config", {
    cli_flag: telemetrySafeModelName(e.model),
    env_var: telemetrySafeModelName(process.env.ANTHROPIC_MODEL),
    default_env_var: telemetrySafeModelName(env.ANTHROPIC_DEFAULT_MODEL),
    settings_file: telemetrySafeModelName(getInitialSettings_2().model),
    settings_source: fromEnumOpt(getEffectiveSettingSource_2("model")),
    subscriptionType: fromEnumOpt(getSubscriptionType()),
    agent: agentSetting
      ? agentTypeForAnalytics_GATE_EVALUATED(
          agentSetting,
          agentDefinitions.activeAgents.some(
            (activeAgent) => isBuiltInAgent(activeAgent) && activeAgent.agentType === agentSetting,
          ),
        )
      : undefined,
  });
  let modelDeprecationWarning = getDeprecationNotice(rawModelRequest ?? resolvedInitialModel);
  let permissionModeNotifications = buildPermissionModeNotifications(permissionModeNotification);
  let Wo = [...permissionModeNotifications.queue];
  if (mcpApprovalSkipWarning)
    Wo.push({
      key: mcpApprovalSkipWarning.key,
      text: mcpApprovalSkipWarning.text,
      color: "warning",
      priority: "high",
    });
  if (personalWithoutEffectNotification !== undefined) Wo.push(personalWithoutEffectNotification);
  let St = toolPermissionContext;
  if (
    (!wasTrustedBeforeSetup && checkHasTrustDialogAccepted()) ||
    (!wasPersistedTrustedBeforeSetup && isWorkspacePersistedTrusted())
  ) {
    if (!wasTrustedBeforeSetup && checkHasTrustDialogAccepted())
      import("./chunk-zqrznfbt.js").then((V) => {
        V.primeCurrentRepository();
      });
    let rules = loadAllPermissionRulesFromDisk();
    let G = refreshPermissionContext(
      rebuildAdditionalDirectories(
        syncPermissionRulesFromDisk(toolPermissionContext, rules),
        [],
        loadTrustedAdditionalDirectoriesFromDisk(),
        undefined,
        false,
        undefined,
        storageV5,
      ),
      rules,
    );
    St = G.context;
    if (G.exitedAutoMode)
      Wo.push(createAutoModeGateNotification(getAutoModeUnavailableNotification("settings")));
  }
  let _t = {
    ...St,
    mode: isAgentSwarmsEnabled() && getTeammateUtils().isPlanModeRequired() ? "plan" : St.mode,
  };
  let isBriefOnly = getUserMsgOptIn();
  let remoteControlAtStartup = resolveRemoteControlAtStartup({
    remoteControlFlag: remoteControl,
    isRemoteThinClient: getIsRemoteMode() || Boolean(teleport),
  });
  logRemoteControlAutostartResolved(remoteControlAtStartup);
  let teamContext =
    sessionTeamContext?.teamContext ??
    (getDynamicTeamContext() ? await computeInitialTeamContext(storageV5) : undefined);
  let ke = {
    sessionNoticesPoll: {
      pendingDeliveryUuids: [],
    },
    settings: getInitialSettings_2(),
    tasks: {},
    attentionBudget: UNLIMITED,
    proactivityLevel,
    transcripts: {},
    taskDecorations: {},
    runningSubagents: 0,
    ...(sessionNameArg && {
      standaloneAgentContext: {
        name: sessionNameArg,
      },
    }),
    agentNameRegistry: new Map(),
    sendMessagePins: {},
    agentTypesInvokedThisSession: new Set(),
    verbose: verbose ?? resolveSetting("verbose", false).value,
    showMessageTimestamps: resolveSetting("showMessageTimestamps", false).value,
    mainLoopModel: initialMainLoopModel,
    mainLoopModelForSession: null,
    isBriefOnly,
    slackTagConnected: false,
    replTab: "convo",
    diffPanelVisible: false,
    paneHoldsToasts: false,
    panelFileView: null,
    briefTranscript: initialFocusView,
    expandedView: getGlobalConfig().showExpandedTodos ? "tasks" : "none",
    coordinatorTaskIndex: -1,
    workflowFooterIndex: 0,
    viewSelectionMode: "none",
    queueEditIndex: null,
    footerSelection: null,
    footerLinks: [],
    toolPermissionContext: _t,
    agent: mainThreadAgentDefinition?.agentType,
    agentDefinitions,
    mcp: {
      clients: [],
      tools: [],
      commands: [],
      resources: {},
      resourceTemplates: {},
      pluginReconnectKey: 0,
    },
    plugins: {
      enabled: [],
      disabled: [],
      commands: [],
      errors: [],
      warnings: [],
      installationStatus: {
        marketplaces: [],
        plugins: [],
      },
      needsRefresh: false,
    },
    setupIssues: {
      settingsErrorCount: 0,
      lspFailedCount: 0,
      marketplaceIssueCount: 0,
      chromeExtensionIssueCount: 0,
      sandboxIssueCount: 0,
      sandboxDeniesOnAnotherHostCount: 0,
      statuslineIssueCount: 0,
      flaggedPluginCount: 0,
      modelDeprecationWarning,
      modelRestrictedWarning: restrictedModel
        ? {
            requested: restrictedModel,
            effective: resolvedInitialModel,
          }
        : null,
      unknownModelWindowWarning: unknownModelWindow,
      securityWarnings,
      existingClaudeSubscription: null,
    },
    prStatus: null,
    prNeedsAuth: false,
    remoteSessionUrl: undefined,
    projectsSelfIdentity: EMPTY_PROJECTS_SELF_IDENTITY,
    remoteConnectionStatus: "connecting",
    remoteModeSessions: {},
    remoteBootstrap: null,
    remoteBackgroundTasks: [],
    remoteWorkflowRuns: [],
    remoteForegroundTask: "none",
    remoteWorkerReportedGone: false,
    workerInventory: null,
    hasRemoteReplyChannel: false,
    replBridgeEnabled: remoteControlAtStartup.replBridgeEnabled,
    replBridgeAutoOnByDefault: remoteControlAtStartup.replBridgeAutoOnByDefault,
    replBridgeExplicit: remoteControlAtStartup.replBridgeExplicit,
    replBridgeOutboundOnly: remoteControlAtStartup.replBridgeOutboundOnly,
    replBridgeConnected: false,
    replBridgeSessionActive: false,
    replBridgeSkipNextArchive: false,
    replBridgeReconnecting: false,
    replBridgeConnectUrl: undefined,
    replBridgeSessionUrl: undefined,
    replBridgeEnvironmentId: undefined,
    replBridgeSessionId: undefined,
    replBridgeError: undefined,
    replBridgeErrorKind: undefined,
    replBridgeInitialName: remoteControlName,
    replBridgeSessionGroupingId:
      remoteControl && projectForRemoteControl ? (sessionGroupingId ?? undefined) : undefined,
    notifications: {
      current: null,
      queue: Wo,
      pinned: permissionModeNotifications.pinned,
    },
    queuedRemoteNotifications: {
      pending: [],
      drainedIds: [],
      nudge: null,
      readsThisTurn: [],
      readsDroppedThisTurn: 0,
      unfinishedReads: [],
      nudgeHeldUntil: {
        request: 0,
        cut: 0,
      },
    },
    autoUpdaterResult: null,
    prResolvedThisSession: false,
    ultrareviewOverageConfirmed: false,
    frameUrls: {},
    todos: {},
    fileHistory: {
      snapshots: [],
      trackedFiles: new Set(),
      snapshotSequence: 0,
    },
    attribution: createEmptyAttributionState(),
    thinkingEnabled,
    promptSuggestionEnabled: shouldEnablePromptSuggestion(),
    awaySummaryEnabled: isAwaySummaryEnabled(),
    displayedMessageContent: {},
    inbox: {
      messages: [],
    },
    promptSuggestion: {
      status: "empty",
    },
    taskSummary: null,
    pendingMemoryUpdates: [],
    pendingWorkerRequest: null,
    pendingSandboxRequest: null,
    initialMessage: inputPrompt
      ? {
          message: createUserMessage({
            content: String(inputPrompt),
          }),
        }
      : e.replyOnResume
        ? {
            replay: true,
          }
        : null,
    ...createSessionEffortState(e.effort),
    ultracode: isUltracodeEnabled(e.effort),
    cacheMissAckedAtOutputTokens: -1,
    autoCompactWindow,
    activeOverlays: new Set(),
    fastMode: isFastModeSettingActive(resolvedInitialModel),
    ...(isAdvisorToolEnabled() &&
      advisorModel && {
        advisorModel,
      }),
    teamContext,
    teammateColors: sessionTeamContext?.teammateColors ?? {
      assignments: new Map(),
      index: 0,
    },
    storedImagePaths: new Map(),
    imageDescriptions: new Map(),
    classifierApprovals: {
      approvals: new Map(),
      checking: new Set(),
    },
    webBrowser: require("./chunk-dsvzp7sb.js").getDefaultWebBrowserState(),
  };
  if (inputPrompt && projectBrowse === null) addHistoryEntry(String(inputPrompt), storageV5);
  let initialTools = structuredOutputTool ? [...mcpTools, structuredOutputTool] : mcpTools;
  saveGlobalConfig(
    (j) => ({
      ...j,
      numStartups: (j.numStartups ?? 0) + 1,
    }),
    storageV5,
  );
  setImmediate(
    (j, G, V, ae) => {
      logStartupTelemetry(getGlobalConfig(), G);
      if (ae === null) {
        logSessionTelemetry(j, V);
        return;
      }
      startRemoteControlAutoConnect(ae, (xe) => logSessionTelemetry(j, V, xe));
    },
    n.storageV5,
    modelProvenance,
    n.credentials,
    null,
  );
  let Vo = null;
  let Zt = false;
  let en = Vo && !Zt ? Vo.then((j) => j.createSessionTurnUploader(session)).catch(() => null) : null;
  let on = Vo && Zt ? Vo.then((j) => j.createSessionTurnUploaderV2(session)).catch(() => null) : null;
  let $o = {
    debug,
    commands: [...commands, ...mcpCommands],
    initialTools,
    mcpClients,
    autoConnectIdeFlag: ide,
    mainThreadAgentDefinition,
    disableSlashCommands,
    dynamicMcpConfig,
    strictMcpConfig,
    systemPrompt,
    appendSystemPrompt,
    systemPromptSnapshot: e.systemPromptSnapshot,
    thinkingConfig,
    thinkingConfigExplicit,
    thinkingDisplayFlag,
    ...(userSpecifiedFallbackModel && {
      fallbackModel: userSpecifiedFallbackModel,
    }),
    ...(en && {
      onTurnComplete: (j) => {
        en.then((G) => G?.(j));
      },
    }),
    ...(on && {
      onCaptureSnapshot: (j, G) => {
        on.then((V) => V?.(j, G));
      },
    }),
  };
  let context = {
    session,
    modeApi: coordinatorModeModule,
    mainThreadAgentDefinition,
    agentDefinitions,
    currentCwd,
    cliAgents,
    initialState: ke,
    permissionModeCliSet: permissionModeCli !== undefined || Boolean(dangerouslySkipPermissions),
    permissionModeSuppliedOnInvocation: n.permissionModeSuppliedOnInvocation,
    storageV5,
    credentials,
  };
  if (e.continue) {
    let j = false;
    try {
      let startTime = performance.now();
      let { clearSessionCaches } = await import("./chunk-e1mchg1t.js");
      clearSessionCaches(session, undefined, undefined, undefined, storageV5);
      let state;
      let result = await loadConversationForResume(undefined, undefined, {
        forkSession: !!e.forkSession,
        replyOnResume: !!e.replyOnResume,
        storageV5,
        credentials,
        ...precomputeResumeHooks(session.precompute, storageV5, {
          forkSession: !!e.forkSession,
        }),
        onNewestRunningInBackground: (ro) => {
          state = ro;
        },
        beforeUse: noopModelPinSubscriber("store"),
      });
      if (!result) {
        await logEventAsync("tengu_continue", {
          success: false,
        });
        return await exitWithError(
          root,
          state === undefined ? "No conversation found to continue" : backgroundSessionMovedNotice(state),
        );
      }
      let re = await processResumedConversation(
        result,
        {
          forkSession: !!e.forkSession,
          includeAttribution: true,
          transcriptPath: result.fullPath,
          resumeSource: "store",
        },
        context,
      );
      if (re.restoredAgentDef) mainThreadAgentDefinition = re.restoredAgentDef;
      maybeActivateBrief(e);
      await noopAsync(e);
      logEvent("tengu_continue", {
        success: true,
        resume_duration_ms: Math.round(performance.now() - startTime),
      });
      j = true;
      let ze = applyAgentModelOverride(dynamicMcpConfig, re.restoredAgentDef ?? mainThreadAgentDefinition, {
        strictMcpConfig,
      });
      if (Object.keys(ze).length > 0)
        await awaitMcpPolicyColdStart({
          hasDynamicMcpConfig: true,
        });
      await launchSessionRepl(
        root,
        {
          getFpsMetrics,
          stats,
          initialState: re.initialState,
          sessionHooks: re.sessionHooks,
          session,
          storageV5,
          credentials,
        },
        {
          ...$o,
          mainThreadAgentDefinition: re.restoredAgentDef ?? mainThreadAgentDefinition,
          dynamicMcpConfig: ze,
          initialMessages: re.messages,
          pendingHookMessages: re.sessionStartHooks,
          initialFileHistorySnapshots: re.fileHistorySnapshots,
          initialContentReplacements: re.contentReplacements,
          initialAgentName: re.agentName,
          initialAgentColor: re.agentColor,
        },
        renderAndRun,
      );
    } catch (error) {
      if (!j)
        await logEventAsync("tengu_continue", {
          success: false,
          ...(error instanceof ResumeRefusedError && {
            error_name: sanitizeErrorName(error),
          }),
        });
      if (error instanceof ResumeRefusedError) return await exitWithError(root, error.message);
      logError(withTelemetryMessage(toError(error), "continue/resume launchRepl failed"));
      let message = toError(error).message;
      emitExitMessage(
        j
          ? `Claude Code exited: startup failed after restoring the previous session (${message}).`
          : `Claude Code exited: could not continue the previous session (${message}). Run claude --resume to pick a session, or start a new one.`,
      );
      await gracefulShutdown(1, "other");
      return;
    }
  } else if (e.resume || e.fromPr || teleport || remote !== null) {
    let { clearSessionCaches } = await import("./chunk-e1mchg1t.js");
    clearSessionCaches(session, undefined, undefined, undefined, storageV5);
    let G = null;
    let V = "local";
    let ae = undefined;
    let xe = normalizeUuidOrNull(e.resume);
    let initialSearchQuery = undefined;
    let ze = null;
    let ro = undefined;
    if (e.fromPr) {
      if (e.fromPr === true) ro = true;
      else if (typeof e.fromPr === "string") ro = e.fromPr;
    }
    if (e.resume && typeof e.resume === "string" && !xe && !isTranscriptFileResumeArg(e.resume)) {
      let trimmed = e.resume.trim();
      if (trimmed) {
        let R = await searchSessionsByCustomTitle(
          trimmed,
          {
            exact: true,
          },
          storageV5,
        );
        if (R.length === 1) {
          ze = R[0];
          xe = getSessionIdFromLog(ze) ?? null;
        } else initialSearchQuery = trimmed;
      }
    }
    let So = (P) =>
      exitWithError(
        root,
        identity2(P, defaultedToCloud),
        () => gracefulShutdown(1),
        takeEarlyInputFieldText(),
      );
    if (remote !== null || teleport) {
      await waitForPolicyLimitsToLoad();
      let P = cloudSessionsUnavailableReason();
      if (P) {
        await logOrgPolicyDeniedAsync("allow_remote_sessions", "cli_flag");
        if (defaultedToCloud) await logFeatureBadAsync("cloud_session_default", "remote_unavailable");
        return await So(`Error: ${P}`);
      }
    }
    if (remote !== null) {
      let repoSlug = extractRepoSlug(remote);
      let R = repoSlug !== null ? toCompatSessionId(repoSlug) : null;
      if (poolId !== null || (environmentQuery !== null && remote !== "")) {
        if (poolPromotedRemote) {
          if (typeof inputPrompt === "string" && inputPrompt.length > 0) remote = inputPrompt;
        } else if (preDecorationInputPrompt !== null && preDecorationInputPrompt.length > 0) {
          let { prefix, flag } = environmentFlagErrorPrefix(noMonorepo);
          return await exitWithError(
            root,
            `${prefix}${flag} with --cloud <description> cannot also take piped stdin. Pass the task as the description, or drop --cloud.`,
            () => gracefulShutdown(1),
          );
        }
      }
      let U = permissionModeCli ? permissionModeFromString(permissionModeCli) : undefined;
      let Q = cloudPermissionModeFrom(permissionModeCli);
      let K;
      let J = () => (K ??= sensitivePathGateEnabled());
      let ie =
        defaultedToCloud ||
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_remote_backend", false) ||
        false ||
        (await J());
      let _o = ie ? unavailableReason(terminalInput) : undefined;
      if (_o !== undefined) {
        await logInteractiveInputFailure(_o);
        return await exitWithError(
          root,
          `No cloud session was created or opened: it would open in this terminal and need the keyboard.
${noTtyMessage(_o)}`,
          () => gracefulShutdown(1),
        );
      }
      if ((R || resumeInCloud !== null) && !ie)
        return await exitWithError(
          root,
          "Error: Attaching to an existing cloud session is not enabled for your account.",
          () => gracefulShutdown(1),
        );
      if (environmentQuery !== null && !ie && remote === "" && typeof inputPrompt === "string")
        remote = inputPrompt;
      let le = !R && remote.length > 0;
      let Ze = le ? randomUUID() : undefined;
      if (!ie && !le && poolId === null)
        return await exitWithError(
          root,
          `Error: --cloud requires a description.
Usage: claude --cloud "your task description"`,
          () => gracefulShutdown(1),
        );
      let Fe;
      let tn = [];
      let Ct = [];
      let Qe;
      let wt;
      let Et;
      let vt;
      let Ot;
      let cr;
      let Rt;
      let yi;
      let Ci;
      let At;
      let ge;
      let je;
      let io;
      let qo;
      let Go = null;
      let Ce = false;
      let yo = false;
      async function ur(Se, we) {
        if (we === undefined) {
          logEvent("tengu_remote_attach_session", {
            session_id: sanitizeMarkName(Se),
          });
          logDeepLinkLaunch(session, e);
        }
        let [
          { attachRemote: Co },
          { createFleetViewHost: Do },
          { ensureFleetNudgeStore: Jo },
          { cloudSessionClosesOnLeave: Io },
        ] = await Promise.all([
          import("./chunk-edjpba11.js"),
          import("./chunk-sqs18vyt.js"),
          import("./chunk-q2y796v9.js"),
          import("./chunk-3k3se2kw.js"),
        ]);
        let ko = Do();
        let wo;
        if (we !== undefined && wo === undefined) return await we.run();
        let Xo = false;
        try {
          if (we === undefined)
            await ensureConsoleProfileCloudSessionsCredential(credentials, printConsoleCloudSignInHint);
          await Co(root, Se, session, {
            initialStateOverride: ke,
            autoConnectIdeFlag: ide,
            disableSlashCommands,
            storageV5,
            credentials,
            fleetNudgeStore: Jo(ko, storageV5),
            ...(wo && {
              endProcessOnExit: wo,
            }),
            startedHere: we && {
              ...we,
              run: async () => {
                try {
                  await we.run();
                } catch (error) {
                  Xo = true;
                  throw error;
                }
              },
            },
          });
        } catch (error) {
          if (Xo) throw error;
          if (!isTerminalShutdown())
            return await exitWithError(root, `Couldn't attach to cloud session: ${errorMessage(error)}`, () =>
              gracefulShutdown(1),
            );
          logForDebugging(`Couldn't attach to cloud session, while shutting down: ${errorMessage(error)}`, {
            level: "error",
          });
        }
        if (isTerminalShutdown()) return heldUntilExit();
        if (wo) return await gracefulShutdown(0);
        let [
          { mountFleetViewWithComposerBack: Po },
          { applyFleetViewHostWindowsEnv: Zo },
          { createRoot: Eo },
        ] = await Promise.all([
          import("./chunk-ygxzcsa5.js"),
          import("./chunk-7gry1hef.js"),
          import("./chunk-1m6xc21j.js"),
        ]);
        Zo();
        process.env.CLAUDE_AGENTS_SELECT = remoteRowId(Se);
        let Mt = await Eo(getBaseRenderOptions(false));
        await Po(Mt, {
          entryChannel: "remote_detach",
          storageV5,
          credentials,
          host: ko,
          dispatchExtraArgs: earlyArgsArgv(_t.additionalWorkingDirectories),
        });
        return await gracefulShutdown(0);
      }
      if (R) return await ur(R, undefined);
      else {
        Ce = await J();
        let connectedSessionGate = lit(Ce ? "on" : hasFreshGrowthBookFeatures() ? "off" : "unfetched");
        let Co = undefined;
        let rules = Co?.kind === "rules" ? Co.rules : undefined;
        let Jo = [];
        let Io = undefined;
        let builtinTools = Io?.kind === "send" ? Io.builtinTools : undefined;
        logEvent("tengu_remote_create_session", {
          defaulted: defaultedToCloud,
          has_initial_prompt: lit(le ? "true" : "false"),
          branch_mode: branchModeForTelemetry(poolOnBranch, poolRef),
          disallowed_tools_count: rules?.length ?? 0,
          ...disallowedToolsTelemetry(rules),
          builtin_tools_count: builtinTools?.length ?? 0,
          connected_session_gate: connectedSessionGate,
          has_environment_query: environmentQuery !== null,
        });
        if (Co?.kind === "unclosed") {
          if (defaultedToCloud) logFeatureBad("cloud_session_default", "deny_rule_unclosed");
          logEvent("tengu_remote_create_session_error", {
            defaulted: defaultedToCloud,
            error: lit("deny_rule_unclosed"),
            branch_mode: branchModeForTelemetry(poolOnBranch, poolRef),
          });
          return await So(unclosedParenError(Co.rule));
        }
        if (Io?.kind === "refuse") {
          logEvent("tengu_remote_create_session_error", {
            defaulted: defaultedToCloud,
            error: lit("rejected_tool_restriction"),
            branch_mode: branchModeForTelemetry(poolOnBranch, poolRef),
          });
          return So(Io.message);
        }
        try {
          if (!defaultedToCloud)
            await ensureConsoleProfileCloudSessionsCredential(credentials, printConsoleCloudSignInHint);
          Qe = await prepareApiRequest(credentials);
        } catch (error) {
          logForDebugging(`--remote auth setup failed: ${errorMessage(error)}`, {
            level: "error",
          });
          if (defaultedToCloud) await logFeatureBadAsync("cloud_session_default", "auth");
          let Ee = ie
            ? await import("./chunk-v4jnmstc.js")
                .then((We) =>
                  We.cloudLaunchSignInScreen({
                    error,
                    defaultedToCloud,
                    terminalInput,
                    disableSlashCommands,
                    session,
                    storageV5,
                  }),
                )
                .catch((error) => {
                  logForDebugging(
                    `Couldn't open the sign-in screen; showing the usual sign-in error: ${errorMessage(error)}`,
                    {
                      level: "error",
                    },
                  );
                  return null;
                })
            : null;
          if (Ee !== null) {
            await launchSessionRepl(
              root,
              {
                getFpsMetrics,
                stats,
                initialState: {
                  ...ke,
                  ...Ee.state,
                },
                session,
                storageV5,
                credentials,
              },
              {
                debug,
                commands,
                initialTools: [],
                mcpClients: [],
                thinkingConfig,
                thinkingConfigExplicit,
                thinkingDisplayFlag,
                ...Ee.props,
              },
              renderAndRun,
            );
            return;
          }
          return await So(`Error: ${errorMessage(error) || "Failed to authenticate"}`);
        }
        let wo = isViolinWoodEnabledCached();
        let ownFlagFetchWaitMs = Ce ? await waitForOwnFlagFetch() : 0;
        let Po = Ce ? isViolinWoodServedOn() : await isViolinWoodEnabled().catch(() => false);
        let Zo = Ce && isCloudClientToolServingAnsweredOn();
        if (Ce)
          logEvent("tengu_remote_create_tool_serving_gate", {
            own_answer: lit(Po ? "on" : "off"),
            violin_willow_gate: lit(getViolinWillowOwnAnswer() === true ? "on" : "off"),
            cached_before: lit(wo ? "on" : "off"),
            own_flags_loaded: hasFreshGrowthBookFeatures(),
            own_flag_fetch_wait_ms: ownFlagFetchWaitMs,
          });
        let Eo = Ce;
        yo = Ce && (await neverTrueAsync());
        let { accessToken } = Qe;
        let oo = () => {};
        let promise = new Promise((resolve) => {
          oo = resolve;
        });
        let Ei = null;
        let so =
          environmentQuery === null
            ? null
            : await environmentUnresolvedOutcome(
                environmentQuery,
                () => fetchEnvironments(accessToken, storageV5, credentials),
                cloudCreateRefusal(),
              );
        if (so?.ok === false) {
          logEvent("tengu_remote_create_session_error", {
            defaulted: defaultedToCloud,
            error: fromEnum(so.reason),
            branch_mode: branchModeForTelemetry(poolOnBranch, poolRef),
          });
          return await So(`Error: ${so.error}`);
        }
        let vi = {
          explicitRef: poolOnBranch
            ? {
                revision: poolOnBranch,
                flag: "--on-branch",
              }
            : poolRef
              ? {
                  revision: poolRef,
                  flag: "--ref",
                }
              : undefined,
          poolId: poolId ?? undefined,
          chosenEnvironmentKind: so?.environment.kind,
          monorepo,
        };
        let Oi = null;
        let Ri = null;
        let fn = false;
        let Ai = yo && alwaysFalsePlaceholder();
        let Ti = false;
        if (fn) yo = false;
        let fileSyncGate = fn ? lit("device_too_old") : lit(yo ? "on" : "off");
        let abortController = new AbortController();
        let lo = Ce
          ? launchCloudCreateChecklist(root, {
              session,
              onCancel: () => abortController.abort(),
              alsoAtExit: () => Rt,
            })
          : null;
        if (lo === null)
          process.stderr.write(
            sequential.dim("Creating remote session\u2026") +
              `
`,
          );
        let Di = null;
        let Ii;
        let bi = null;
        let ki = null;
        let moreFilesDecision;
        let Pi = null;
        let Mi = null;
        let gn = [];
        let Sn = undefined;
        let Cr = Sn !== undefined;
        let _n = Ce && Po && (await isSettingsToCloudEnabled().catch(() => false));
        let Ft = ie && (await isContainerSyncEnvironment(yo)) && !Cr;
        oo(Eo);
        let hostConsentMode = resolveHostConsentMode({
          hostConsent: homeSettingsConsent,
          areOwnFlagsOn: _n,
          stored: storedHomeSettingsMode(),
          isProjectSynced: Ft,
        });
        let No = _n || isLaunchConsentBlocked(hostConsentMode);
        if (
          canForwardHomeSettings(No) &&
          shouldPromptHomeSettingsMode({
            staysAttached: ie,
            launchMayForward: forwardHomeSettings,
            launchConsent: hostConsentMode,
          })
        )
          await launchRemoteHomeSettingsDialog(root, {
            configHome: getClaudeConfigDir(),
            storageV5,
          });
        let yn = false;
        if (Zo && Eo) {
          let [
            { isRemoteToolServingSwitchOn: H },
            { deviceMcpConsentOffer: Ee },
            { primeWindowsProfileDirs: We },
          ] = await Promise.all([
            import("./chunk-wcfcn49z.js"),
            import("./chunk-077pc1h8.js"),
            import("./chunk-w5rpngy7.js"),
          ]);
          await We();
          yn = H();
          let Le = yn
            ? await Ee(storageV5).catch((error) => {
                logForDebugging(`[deviceBridge] MCP consent question skipped: ${errorMessage(error)}`);
                return;
              })
            : undefined;
          if (Le !== undefined && Le.servers.length > 0)
            await launchDeviceMcpConsentDialog(root, {
              servers: Le.servers,
              storageV5,
            });
          else if (Le !== undefined && Object.keys(Le.withheld).length > 0)
            await launchDeviceMcpReconsentDialog(root, {
              withheld: Le.withheld,
              storageV5,
            });
        }
        let xi = gn.length;
        if (No || Ft)
          noteHomeSettingsPrompt({
            launchConsent: hostConsentMode,
            isProjectSynced: Ft,
            launchMayForward: forwardHomeSettings,
            surface: "terminal",
            trigger: "create",
          });
        let Cn = shouldForwardHomeSettings({
          settingsToCloudEnabled: No,
          launchMayForward: forwardHomeSettings,
          launchConsent: hostConsentMode,
        });
        let startupModeTelemetry = getStartupModeTelemetry({
          gateOn: Cn,
          permissionModeTyped: permissionModeCli !== undefined,
          dangerouslySkipPermissions: dangerouslySkipPermissions === true,
          scrubbed: isScrubEnabled(),
          settings: getInitialSettings_2(),
          effort: resolveEffortLevel(ke),
        });
        let et;
        if (boolFromMaybe(Ce)) {
          io = getMainLoopModel();
          let H = isRestrictedModelAllowed(io);
          et = describeSelfHostedModeNotice({
            model: io,
            internal: H,
            explicitMode: Q,
            droppedMode: (U !== undefined && !Q) || Boolean(dangerouslySkipPermissions),
            settingsMode: startupModeTelemetry.settingsDefault,
            settingsModeForwardable: Cn,
            ...getAutoSeedFactors({
              settings: getInitialSettings_2(),
              scrubbed: isScrubEnabled(),
              typedLevel: e.proactivity,
              carriedMode: e.inheritPermissionMode,
            }),
            repositoryModel: H
              ? resolveStartupModel({
                  model: io,
                  modelCli: e.model,
                  agent: mainThreadAgentDefinition,
                  agentSelectedByCli: n.agentCli !== undefined,
                  agents: agentDefinitions.allAgents,
                  effectiveModel: n.effectiveModel,
                  initialMainLoopModel,
                  restrictedModel,
                })
              : undefined,
          });
          ge = et.decision;
          if (ge.notice) logForDebugging(`[remote] ${ge.notice.text}`);
        }
        let vo = ge ? ge.permissionMode : Q;
        if (Zo && Eo && (vo === "auto" || vo === "bypassPermissions")) {
          let [
            { isRemoteToolServingSwitchOn: H },
            { isViolinFretEnabled: Ee },
            {
              managedSettingsForbidUnattendedServing: We,
              primeUnattendedServingConsent: Le,
              readUnattendedServingConsent: xo,
            },
          ] = await Promise.all([
            import("./chunk-wcfcn49z.js"),
            import("./chunk-fnmgwp2h.js"),
            import("./chunk-6dhh43sn.js"),
          ]);
          Le();
          if (H() && (await Ee()) && !We() && (await xo()) === "unset")
            await launchUnattendedServingConsentDialog(root);
        }
        let deviceBinding = Eo
          ? {
              orgUuid: Qe.orgUUID,
              accountUuid: getStoredOauthAccountInfo()?.accountUuid,
              ...{},
              onBound: (H) => {
                Ot = H;
              },
              onUnbound: (H) => {
                At = H;
              },
              confirmReenroll: async () => {
                await lo?.untilTypingRests(abortController.signal);
                if (abortController.signal.aborted) throw Error("the create was cancelled");
                try {
                  return (
                    (await launchDeviceReenrollDialog(root, {
                      onCancel: () => abortController.abort(),
                    })) === "register" && !abortController.signal.aborted
                  );
                } finally {
                  lo?.repaint();
                }
              },
            }
          : undefined;
        let Er = poolOnBranch ?? poolRef ?? (await getBranch());
        let [{ showTeleportErrorsImpl: Or }, Rr] = await Promise.all([
          import("./chunk-xcagebg7.js"),
          undefined,
        ]);
        let Ar = {};
        let Tr = {};
        let Dr = undefined;
        let Ir = undefined;
        let se = await teleportToRemoteWithErrorHandling(root, {
          showTeleportErrors: Or,
          firstUpload: Rr,
          ...Tr,
          staysAttached: ie,
          connectedSession: Ce,
          fileSync: yo,
          ...{},
          moreFilesDecision,
          moreFilesSeat: "terminal_create",
          deferInitialMessage: ie,
          personAskedForSession: !defaultedToCloud,
          description: le ? remote : null,
          descriptionUuid: Ze,
          forwardHomeSettings,
          homeSettingsConsent: hostConsentMode,
          signal: abortController.signal,
          source: "remote",
          branchName: Er || undefined,
          branchFromHead: (poolOnBranch ?? poolRef) == null,
          title: sessionNameArg || undefined,
          appendSystemPrompt:
            [null, null].filter((H) => H !== null).join(`

`) || undefined,
          reuseOutcomeBranch: poolOnBranch ?? undefined,
          explicitRef: poolOnBranch ?? poolRef ?? undefined,
          poolId: poolId ?? undefined,
          chosenEnvironment: so?.environment,
          effort: e.effort !== undefined ? resolveEffortLevel(ke) : startupModeTelemetry.effort,
          isEffortFromSettings: e.effort === undefined,
          correlationId: correlationId ?? undefined,
          persistentVolume,
          persistentVolumeFromSessionId: persistentVolumeFromSessionId ?? undefined,
          monorepo,
          noMonorepo,
          noMonorepoAsksTheService,
          personal,
          deviceBinding,
          ...Ar,
          ...Sn,
          ...Dr,
          ...Ir,
          hasApprovedCopy: cr?.peek() !== undefined,
          permissionMode: vo,
          isModeFromSettings: et?.isModeFromSettings,
          proactivityLevel: e.proactivity,
          onProgress: lo?.update,
          disallowedTools: rules,
          builtinTools,
          environmentVariables: undefined,
          model: io,
          storageV5,
          credentials,
        });
        if (!se.ok) {
          if (lo !== null && abortController.signal.aborted) {
            if (defaultedToCloud) logFeatureSad("cloud_session_default", "cancelled");
            return await lo.exitCancelled();
          }
          lo?.failed();
          if (defaultedToCloud) logFeatureBad("cloud_session_default", se.failReason);
          logEvent("tengu_remote_create_session_error", {
            defaulted: defaultedToCloud,
            error: fromEnum(se.failReason),
            branch_mode: branchModeForTelemetry(poolOnBranch, poolRef),
            settings_gate: lit(No ? "on" : "off"),
            connected_session_gate: connectedSessionGate,
            file_sync_gate: fileSyncGate,
            ...{},
            ...(se.failDetail?.endpoint && {
              create_endpoint: fromEnum(se.failDetail.endpoint),
            }),
            ...(se.failDetail?.serverReason && {
              server_reason: fromEnum(se.failDetail.serverReason),
            }),
            ...(se.failDetail?.messageHidden && {
              message_hidden: lit("true"),
            }),
            ...(se.failDetail?.preflightTransient !== undefined && {
              deny_transient: lit(se.failDetail.preflightTransient ? "true" : "false"),
            }),
            ...(se.failDetail?.sessionArchived !== undefined && {
              session_archived: lit(se.failDetail.sessionArchived ? "true" : "false"),
            }),
          });
          return await So(
            (se.failMessage ? `Error: ${se.failMessage}` : "Error: Unable to create cloud session") +
              (Rt === undefined
                ? ""
                : `
${Rt}`),
          );
        }
        let session_2 = se.session;
        let tt = session_2.settingsModeOnRunner === undefined ? vo : undefined;
        je = session_2.settingsModeOnRunner === undefined ? ge?.notice : et?.noticeOnRunner;
        if (session_2.settingsModeOnRunner !== undefined && je) logForDebugging(`[remote] ${je.text}`);
        if (Ce) {
          vt = tt && {
            mode: tt,
          };
          qo = resolveRemoteSessionMode({
            sentMode: tt,
            repositorySettings: getSettingsForSource("projectSettings"),
          });
          Go = resolveSeedPermissionMode({
            seed: startupModeTelemetry,
            settingsMode: getInitialSettings_2().permissions?.defaultMode,
            sentMode: tt,
            startsIn: qo,
          });
        }
        Ct = so?.notice && !session_2.chosenEnvironmentMoved ? [so.notice] : [];
        tn = [...gn, ...Jo, ...se.notices];
        if (defaultedToCloud) logFeatureOk("cloud_session_default");
        let Li = null;
        let Ui = null;
        logEvent("tengu_remote_create_session_success", {
          defaulted: defaultedToCloud,
          ...{},
          session_id: sanitizeMarkName(session_2.id),
          initial_prompt_withheld: session_2.withheldInitialMessage !== undefined,
          branch_mode: branchModeForTelemetry(poolOnBranch, poolRef),
          permission_mode_source: lit(
            Q
              ? "flag"
              : U
                ? "flag_withheld"
                : ge?.action === "auto_seeded"
                  ? startupModeTelemetry.permissionMode
                    ? "model_auto_over_settings"
                    : "model_auto"
                  : ge?.action === "auto_by_default"
                    ? "default_auto"
                    : startupModeTelemetry.permissionMode
                      ? session_2.settingsModeOnRunner === "not_sent"
                        ? "settings_withheld"
                        : "settings"
                      : startupModeTelemetry.considered && startupModeTelemetry.settingsDefaultModePresent
                        ? "settings_withheld"
                        : "none",
          ),
          permission_mode: fromEnumOpt(session_2.settingsModeOnRunner === "not_sent" ? undefined : vo),
          ...(session_2.settingsModeOnRunner !== undefined && {
            settings_mode_on_runner: fromEnum(session_2.settingsModeOnRunner),
            settings_mode_warned: je?.level === "warning",
          }),
          settings_gate: lit(No ? "on" : "off"),
          ...(session_2.settingsPackUnsent !== undefined && {
            settings_pack_unsent: fromEnum(session_2.settingsPackUnsent),
          }),
          connected_session_gate: connectedSessionGate,
          file_sync_gate: fileSyncGate,
          ...{},
          ...{},
        });
        if (ge && ge.action !== "none")
          logEvent("tengu_remote_model_gate_hint", {
            entry_point: lit("interactive"),
            session_id: sanitizeMarkName(session_2.id),
            permission_mode: fromEnumOpt(vo) ?? lit("unset"),
            requested_mode: fromEnumOpt(U) ?? lit("unset"),
            settings_mode: fromEnumOpt(startupModeTelemetry.permissionMode) ?? lit("unset"),
            skip_permissions: lit(dangerouslySkipPermissions ? "true" : "false"),
            action: fromEnum(ge.action),
            violin_wood_gate: lit(Po ? "on" : "off"),
            connected_session_gate: connectedSessionGate,
            file_sync_gate: fileSyncGate,
            ...(ge.repositoryModel && {
              repository_model: fromEnum(ge.repositoryModel),
            }),
            ...(ge.barredBy && {
              barred_by: fromEnum(ge.barredBy),
            }),
            ...(io !== undefined && {
              model_runs_auto: lit(modelSupportsAutoMode(io) ? "true" : "false"),
            }),
          });
        if (!ie) {
          process.stdout.write(`Created cloud session: ${session_2.title}
`);
          let compatSessionId = toCompatSessionId_2(session_2.id);
          if (poolId !== null)
            process.stdout.write(`Session ID: ${compatSessionId}
`);
          process.stdout.write(`View: ${getRemoteSessionUrl(session_2.id, undefined, {
            from: "cli",
            m: "0",
          })}
`);
          process.stdout.write(`Resume with: claude --teleport ${compatSessionId}
`);
          if (je)
            process.stdout.write(`${je.text}
`);
          for (let Ee of [...Ct, ...Jo, ...se.notices])
            process.stdout.write(`${Ee}
`);
          await gracefulShutdown(0);
          process.exit(0);
        }
        Fe = session_2.id;
        wt = session_2.homeSeed;
        Et = session_2.withheldInitialMessage;
      }
      setIsRemoteMode(true);
      switchSession(identityAgentId(Fe), "remote_attach");
      let Dt = () => sessionsApiAccessTokenNow(Qe.profile) ?? Qe.accessToken;
      let It = undefined;
      let [
        { startDeviceRegistration: pr },
        { deviceToolNoticesTo: nn },
        { deviceHooksProcessMemories: fr },
        { sessionRepositoryTrustReader: hr },
      ] = await Promise.all([
        import("./chunk-7xn1fddp.js"),
        import("./chunk-c5pexqvs.js"),
        import("./chunk-frrbnh1c.js"),
        import("./chunk-a6344dav.js"),
      ]);
      let eo = Ot;
      let zo =
        eo === undefined
          ? undefined
          : pr({
              sessionId: Fe,
              getAccessToken: () => deviceBridgeAccessToken(Qe),
              orgUuid: Qe.orgUUID,
              getDeviceId: () => eo,
              cloudClient: true,
              storageV5,
              dirSync: It !== undefined,
              onNotice: nn(session),
              servedSettingsChanged: fr.of(session.host).servedSettingsChanged,
            });
      let Qo = hr({
        sessionId: Fe,
        getAccessToken: Dt,
        fetchSession,
        createOrigin: It?.createFacts?.origin,
      });
      let rn =
        eo === undefined || zo === undefined
          ? undefined
          : (await import("./chunk-012rhzq5.js")).servedToolsAttachOptions({
              owner: () => ({
                owner: true,
                deviceId: eo,
              }),
              cloudClient: true,
              deviceBridge: zo,
              onNotice: nn(session),
              ...(Qo && {
                repositoryTrust: Qo,
              }),
              stillBound: async () =>
                (await import("./chunk-0yqdkcyd.js")).sessionStillBoundTo(eo, () =>
                  fetchSession(Fe, {
                    accessToken: Dt(),
                  }),
                ),
              plumbing: (await import("./chunk-2s19t0f2.js")).servedSessionPlumbing(Fe),
            });
      let remoteSessionConfig = {
        sessionId: Fe,
        getAccessToken: Dt,
        consoleProfileBearer: Qe.profile,
        orgUuid: Qe.orgUUID,
        onAuth401: (Se) => recoverSessionsApiBearer(Se, credentials, storageV5, Qe.profile),
        initialPromptUuid: Ze,
        hasExplicitTitle: Boolean(sessionNameArg),
        dirSync: It,
        ...(zo && {
          heldServedCall: zo.heldServedCall,
        }),
        ...(wt && {
          homeSeed: wt,
        }),
        ...(Et && {
          withheldInitialPrompt: Et,
        }),
        ...(vt && {
          createPermissionMode: vt,
        }),
        ...(rn && {
          servedTools: rn,
        }),
        ...(Qo && {
          repositoryTrust: Qo,
          boundHere: Promise.resolve(eo !== undefined),
        }),
        ...(eo !== undefined && {
          eventSigner: import("./chunk-pesgm5d3.js").then(
            ({ deviceEventSignerFor }) => deviceEventSignerFor(eo, credentials),
            reportSignerLoadFailure,
          ),
        }),
      };
      let remoteSessionUrl = getRemoteSessionUrl(Fe, undefined, {
        from: "cli",
        m: "0",
      });
      let an = tryReadFileForSync("create", remoteSessionUrl, Ce);
      let dn = [];
      let ln = Go ? [createSystemMessage(Go.text, Go.level)] : [];
      let mapped = tn.map((Se) => createSystemMessage(Se, "warning"));
      let mapped_2 = Ct.map((Se) => createSystemMessage(Se, "notice"));
      let pn = le
        ? createUserMessage({
            content: remote,
            uuid: Ze,
          })
        : null;
      let kt = R
        ? permissionModeCli
          ? "--permission-mode is ignored when attaching \u2014 the session keeps its current mode (shift+tab to change it)"
          : undefined
        : U && !Q
          ? `--permission-mode ${U} is not forwarded \u2014 the cloud session uses its default mode`
          : undefined;
      let Pt = At !== undefined && Ot === undefined ? isDeviceRevokedError(At) : undefined;
      let initialState = {
        ...ke,
        initialMessage: nullIfTruthy(le && poolId !== null && poolPromotedRemote, ke.initialMessage),
        remoteSessionUrl,
        ...(qo !== undefined && {
          toolPermissionContext: {
            ...ke.toolPermissionContext,
            mode: qo,
          },
        }),
        replTab: "convo",
        diffPanelVisible: false,
        replBridgeEnabled: false,
        replBridgeOutboundOnly: false,
        replBridgeExplicit: false,
        ...((kt || Pt || je) && {
          notifications: {
            ...ke.notifications,
            current: null,
            queue: [
              ...ke.notifications.queue,
              ...(kt
                ? [
                    {
                      key: "remote-permission-mode-not-applied",
                      text: kt,
                      color: "warning",
                      priority: "high",
                    },
                  ]
                : []),
              ...(Pt
                ? [
                    {
                      key: "remote-device-not-bound",
                      kind: "warning",
                      text: Pt,
                      color: "warning",
                      priority: "high",
                      timeoutMs: 30000,
                    },
                  ]
                : []),
              ...(je?.level === "warning"
                ? [
                    {
                      key: "remote-internal-model-mode",
                      kind: "warning",
                      text: je.short,
                      color: "warning",
                      priority: "high",
                      timeoutMs: 30000,
                    },
                  ]
                : je
                  ? [
                      {
                        key: "remote-internal-model-mode",
                        kind: "feedback",
                        text: je.short,
                        priority: "medium",
                        timeoutMs: 15000,
                      },
                    ]
                  : []),
            ],
          },
        }),
      };
      logDeepLinkLaunch(session, e);
      await launchSessionRepl(
        root,
        {
          getFpsMetrics,
          stats,
          initialState,
          session,
          storageV5,
          credentials,
        },
        {
          debug,
          commands,
          initialTools: [],
          initialMessages: pn
            ? [...remoteDroppedMcpMessages, an, ...dn, ...mapped_2, ...ln, ...mapped, pn]
            : [...remoteDroppedMcpMessages, an, ...dn, ...mapped_2, ...ln, ...mapped],
          mcpClients: [],
          autoConnectIdeFlag: ide,
          mainThreadAgentDefinition,
          disableSlashCommands,
          remoteSessionConfig,
          thinkingConfig,
          thinkingConfigExplicit,
          thinkingDisplayFlag,
        },
        renderAndRun,
      );
      return;
    } else if (teleport) {
      if (teleport === true || teleport === "") {
        logEvent("tengu_teleport_interactive_mode", {});
        logForDebugging("selectAndResumeTeleportTask: Starting teleport flow...");
        let P = await launchTeleportResumeWrapper(root);
        if (!P) {
          await gracefulShutdown(0);
          process.exit(0);
        }
        let { branchError } = await checkOutTeleportedSessionBranch(P.branch);
        G = processMessagesForTeleportResume(P.log, branchError, P.environmentKind);
        V = "remote";
      } else if (typeof teleport === "string") {
        logEvent("tengu_teleport_resume_session", {
          mode: lit("direct"),
        });
        try {
          let sessionData = await fetchSession(teleport, undefined, credentials);
          let R = await validateSessionRepository(sessionData);
          if (R.status === "host_unverified") {
            let sessionRepo =
              R.sessionHost && !isGithubDotCom(R.sessionHost)
                ? `${R.sessionHost}/${R.sessionRepo}`
                : (R.sessionRepo ?? "");
            if (
              !(await launchTeleportHostUnverifiedDialog(root, {
                sessionRepo,
                rawRemoteUrl: R.rawRemoteUrl ?? "",
              }))
            )
              await gracefulShutdown(0);
          }
          if (R.status === "mismatch" || R.status === "not_in_repo") {
            logEvent(
              R.status === "mismatch"
                ? "tengu_teleport_error_repo_mismatch_sessions_api"
                : "tengu_teleport_error_repo_not_in_git_dir_sessions_api",
              {
                sessionId: sanitizeMarkName(teleport),
                stage: lit("direct_arg_detect"),
              },
            );
            let sessionRepo = R.sessionRepo;
            if (sessionRepo) {
              let paths = getKnownPathsForRepo(sessionRepo);
              let _o = await filterExistingPaths(paths);
              if (_o.length > 0) {
                let le = await launchTeleportRepoMismatchDialog(root, {
                  targetRepo: sessionRepo,
                  initialPaths: _o,
                  storageV5,
                });
                if (le) {
                  processChdir(le);
                  setCwd(le);
                  setOriginalCwd(le);
                  getPlansDirectory.cache.clear?.();
                  primePlanSlugCollisions(storageV5);
                } else await gracefulShutdown(0);
              } else {
                let le = sessionRepo;
                let Ze = "";
                if (R.status === "mismatch") {
                  let Fe = formatRepoMismatchDisplay(R);
                  le = Fe.sessionDisplay ?? sessionRepo;
                  Ze = Fe.currentDisplay
                    ? `
This repo is ${Fe.currentDisplay}.`
                    : "";
                } else {
                  if (R.sessionHost && !isGithubDotCom(R.sessionHost)) le = `${R.sessionHost}/${sessionRepo}`;
                  if (R.rawRemoteUrl)
                    Ze = `
Couldn't parse your git remote: ${R.rawRemoteUrl}`;
                }
                throw new TeleportOperationError(
                  `You must run claude --teleport ${teleport} from a checkout of ${le}.${Ze}`,
                  sequential.red(`You must run claude --teleport ${teleport} from a checkout of ${sequential.bold(le)}.${Ze}
`),
                );
              }
            }
          } else if (R.status === "error")
            throw new TeleportOperationError(
              R.errorMessage || "Failed to validate session",
              sequential.red(`Error: ${R.errorMessage || "Failed to validate session"}
`),
            );
          let { showTeleportErrorsImpl } = await import("./chunk-xcagebg7.js");
          await handleTeleportPrerequisites(root, new Set(), showTeleportErrorsImpl);
          let { teleportWithProgress } = await import("./chunk-pfn09c5f.js");
          let K = await teleportWithProgress(root, teleport);
          setTeleportedSessionInfo({
            sessionId: teleport,
          });
          G = K.messages;
          V = "remote";
        } catch (error) {
          let R = error instanceof TeleportOperationError;
          if (!R) logError(withTelemetryMessage(toError(error), "teleport direct resume failed"));
          await exitWithError(root, R ? error.message : errorMessage(error), () => gracefulShutdown(1));
        }
      }
    }
    if (isAgentsFleetEnabled() || (typeof e.resume === "string" && isTranscriptFileResumeArg(e.resume))) {
      if (e.resume && typeof e.resume === "string" && !xe) {
        let ccshareId = null?.parseCcshareId(e.resume);
        if (isTranscriptFileResumeArg(e.resume)) {
          let U = normalizeUuidOrNull(basename(e.resume, ".jsonl"));
          if (U && !e.forkSession) {
            let backgroundSessionHolder = await findBackgroundSessionHolder(U, storageV5);
            if (backgroundSessionHolder) {
              let handoff = await tryOpenLiveBackground({
                holder: backgroundSessionHolder,
                entrypoint: "cli",
                prompt: preDecorationInputPrompt,
                storageV5,
              });
              return await exitWithError(
                root,
                formatSessionRunningInBackground({
                  holder: backgroundSessionHolder,
                  canFork: true,
                  handoff,
                }),
              );
            }
          }
          let Q = "load_error";
          try {
            let startTime = performance.now();
            let sessionRef = await loadTranscriptFromFile(e.resume, storageV5);
            let result = await loadConversationForResume(sessionRef, undefined, {
              forkSession: !!e.forkSession,
              replyOnResume: !!e.replyOnResume,
              storageV5,
              credentials,
              ...precomputeResumeHooks(session.precompute, storageV5, {
                forkSession: !!e.forkSession,
                expectedSessionId: U ?? undefined,
              }),
              beforeUse: noopModelPinSubscriber(modelPinStorageKind(e.resume)),
            });
            if (result) {
              Q = "processing_error";
              V = "local";
              ae = await processResumedConversation(
                result,
                {
                  forkSession: !!e.forkSession,
                  sessionIdOverride: U ?? undefined,
                  transcriptPath: result.fullPath,
                  resumeSource: modelPinStorageKind(e.resume),
                },
                context,
              );
              if (ae.restoredAgentDef) mainThreadAgentDefinition = ae.restoredAgentDef;
              logEvent("tengu_session_resumed", {
                entrypoint: lit("file"),
                success: true,
                resume_duration_ms: Math.round(performance.now() - startTime),
              });
            } else
              logEvent("tengu_session_resumed", {
                entrypoint: lit("file"),
                success: false,
                failure_reason: lit("not_found_explicit_id"),
              });
          } catch (error) {
            logEvent("tengu_session_resumed", {
              entrypoint: lit("file"),
              success: false,
              failure_reason: Q === "processing_error" ? lit("processing_error") : lit("load_error"),
              error_name: sanitizeErrorName(toError(error)),
              error_code:
                error instanceof TranscriptFileFormatError
                  ? fromEnum(error.code)
                  : sanitizedErrnoLowerForTelemetry(error),
            });
            if (error instanceof ResumeRefusedError) return await exitWithError(root, error.message);
            if (Q === "load_error" && isTranscriptLoadError(error))
              logForDebugging(`--resume file unreadable (${getErrnoCode(error)}): ${errorMessage(error)}`, {
                level: "error",
              });
            else logError(error);
            let J = Q === "load_error" ? win32EbadfHelp(error) : undefined;
            await exitWithError(
              root,
              `Unable to load transcript from file: ${e.resume}${J === undefined ? "" : `: ${J}`}`,
              () => gracefulShutdown(1),
            );
          }
        }
      }
    }
    if (xe) {
      let P = xe;
      if (!e.forkSession) {
        let backgroundSessionHolder = await findBackgroundSessionHolder(P, storageV5);
        if (backgroundSessionHolder) {
          let handoff = await tryOpenLiveBackground({
            holder: backgroundSessionHolder,
            entrypoint: "cli",
            prompt: preDecorationInputPrompt,
            storageV5,
          });
          return await exitWithError(
            root,
            formatSessionRunningInBackground({
              title: ze ? getLogDisplayTitle(ze) : undefined,
              holder: backgroundSessionHolder,
              canFork: true,
              handoff,
            }),
          );
        }
      }
      let R = "load_error";
      try {
        let startTime = performance.now();
        let result = await loadConversationForResume(ze ?? P, undefined, {
          forkSession: !!e.forkSession,
          replyOnResume: !!e.replyOnResume,
          storageV5,
          credentials,
          ...precomputeResumeHooks(session.precompute, storageV5, {
            forkSession: !!e.forkSession,
          }),
          beforeUse: noopModelPinSubscriber("store"),
        });
        if (!result) {
          logEvent("tengu_session_resumed", {
            entrypoint: lit("cli_flag"),
            success: false,
            failure_reason: lit("not_found_explicit_id"),
          });
          let J = `No conversation found with session ID: ${P}`;
          logForDebugging(J, {
            level: "error",
          });
          return await exitWithError(root, J, () => gracefulShutdown(1));
        }
        R = "processing_error";
        let transcriptPath = ze?.fullPath ?? result.fullPath;
        V = "local";
        ae = await processResumedConversation(
          result,
          {
            forkSession: !!e.forkSession,
            resumeSource: "store",
            sessionIdOverride: P,
            transcriptPath,
          },
          context,
        );
        if (ae.restoredAgentDef) mainThreadAgentDefinition = ae.restoredAgentDef;
        logEvent("tengu_session_resumed", {
          entrypoint: lit("cli_flag"),
          success: true,
          resume_duration_ms: Math.round(performance.now() - startTime),
        });
      } catch (error) {
        logEvent("tengu_session_resumed", {
          entrypoint: lit("cli_flag"),
          success: false,
          failure_reason: R === "processing_error" ? lit("processing_error") : lit("load_error"),
          error_name: sanitizeErrorName(toError(error)),
          error_code: sanitizedErrnoLowerForTelemetry(error),
        });
        if (error instanceof ResumeRefusedError) return await exitWithError(root, error.message);
        if (R === "load_error" && isTranscriptLoadError(error))
          logForDebugging(`--resume session load failed (${getErrnoCode(error)}): ${errorMessage(error)}`, {
            level: "error",
          });
        else logError(error);
        let Q = R === "load_error" ? win32EbadfHelp(error) : undefined;
        await exitWithError(root, `Failed to resume session ${P}${Q === undefined ? "" : `: ${Q}`}`);
      }
    }
    if (fileDownloadPromise)
      try {
        let P = await fileDownloadPromise;
        let R = count(P, (U) => !U.success);
        if (R > 0) warnStartupIssues(`${R}/${P.length} file(s) failed to download.`);
      } catch (error) {
        return await exitWithError(root, `Error downloading files: ${errorMessage(error)}`);
      }
    let Be =
      ae ??
      (Array.isArray(G)
        ? {
            messages: G,
            fileHistorySnapshots: undefined,
            agentName: undefined,
            agentColor: undefined,
            restoredAgentDef: mainThreadAgentDefinition,
            initialState: ke,
            contentReplacements: undefined,
            sessionHooks: undefined,
            sessionStartHooks: undefined,
          }
        : undefined);
    if (Be) {
      maybeActivateBrief(e);
      await noopAsync(e);
      if (!ae && V === "remote") noopModelPinReset(true);
      let P = applyAgentModelOverride(dynamicMcpConfig, Be.restoredAgentDef ?? mainThreadAgentDefinition, {
        strictMcpConfig,
      });
      if (Object.keys(P).length > 0)
        await awaitMcpPolicyColdStart({
          hasDynamicMcpConfig: true,
        });
      await launchSessionRepl(
        root,
        {
          getFpsMetrics,
          stats,
          initialState: Be.initialState,
          sessionHooks: Be.sessionHooks,
          session,
          storageV5,
          credentials,
        },
        {
          ...$o,
          mainThreadAgentDefinition: Be.restoredAgentDef ?? mainThreadAgentDefinition,
          dynamicMcpConfig: P,
          initialMessages: Be.messages,
          pendingHookMessages: Be.sessionStartHooks,
          initialMessagesOrigin: V,
          initialFileHistorySnapshots: Be.fileHistorySnapshots,
          initialContentReplacements: Be.contentReplacements,
          initialAgentName: Be.agentName,
          initialAgentColor: Be.agentColor,
        },
        renderAndRun,
      );
    } else if (
      e.resume === true &&
      !e.forkSession &&
      ro === undefined &&
      !inputPrompt &&
      !hasEarlyInput() &&
      e.name === undefined &&
      e.watchArtifact === undefined &&
      e.watchArtifactNoAutoreact === undefined &&
      !cliCarriesSessionConfig(e) &&
      isAgentsFleetEnabled() &&
      isPastSessionsExperimentEnabled()
    ) {
      logEvent("tengu_fleetview", {
        viaResume: true,
      });
      consumeEarlyInput();
      import("./chunk-5kp2513a.js").then((U) =>
        U.startBackgroundHousekeeping(getRootSession().host, storageV5),
      );
      let [{ mountFleetView: P }, { applyFleetViewHostWindowsEnv: R }] = await Promise.all([
        import("./chunk-jsc6qjj6.js"),
        import("./chunk-7gry1hef.js"),
      ]);
      R();
      await P(root, {
        entryChannel: "cli_resume",
        storageV5,
        credentials,
        dispatchExtraArgs: earlyArgsArgv(_t.additionalWorkingDirectories),
      });
      return await gracefulShutdown(0, "other", {
        suppressResumeHint: true,
      });
    } else
      await launchResumeChooser(
        root,
        {
          getFpsMetrics,
          stats,
          initialState: ke,
          session,
          storageV5,
          credentials,
        },
        getWorktreePaths(getOriginalCwd()),
        {
          ...$o,
          initialSearchQuery,
          forkSession: e.forkSession,
          permissionModeSuppliedOnInvocation: n.permissionModeSuppliedOnInvocation,
          filterByPr: ro,
          startsInCloudByDefault: false,
        },
      );
  } else {
    profileCheckpoint("action_after_hooks");
    maybeActivateBrief(e);
    await noopAsync(e);
    saveMode(coordinatorModeModule.isCoordinatorMode() ? "coordinator" : "normal");
    noopModelPinReset();
    logDeepLinkLaunch(session, e);
    await launchSessionRepl(
      root,
      {
        getFpsMetrics,
        stats,
        initialState: ke,
        session,
        storageV5,
        credentials,
      },
      {
        ...$o,
        pendingHookMessages: sessionStartHooks,
      },
      renderAndRun,
    );
  }
}
//@ chunk-cjydagjy.js:14073-14083 placement
var CURRENT_MIGRATION_VERSION = 14;
//@ chunk-cjydagjy.js:14083-14381 placement = _temp (0.315)
function isPristineUserConfig() {
  let globalConfig = getGlobalConfig();
  if (
    globalConfig.autoUpdates === false ||
    globalConfig.bypassPermissionsModeAccepted ||
    globalConfig.subscriptionNoticeCount !== undefined ||
    globalConfig.replBridgeEnabled !== undefined
  )
    return false;
  for (let n of USER_INTENT_SETTING_KEYS) {
    let s = globalConfig[n];
    if (s !== undefined && s !== DEFAULT_GLOBAL_CONFIG[n]) return false;
  }
  let settingsForSourceForUpkeep = getSettingsForSourceForUpkeep("userSettings");
  return (
    settingsForSourceForUpkeep?.model === undefined && !settingsForSourceForUpkeep?.skipAutoPermissionPrompt
  );
}
//@ chunk-cjydagjy.js:14381-14454 layout
function shouldSkipFreshMigrations() {
  return env.CLAUDE_CODE_CCR_SKIP_FRESH_MIGRATIONS && isHostManagedProviderAuth() && isPristineUserConfig();
}
//@ chunk-cjydagjy.js:14454-15137 callgraph-witnessed = runMigrations (0.216)
/**
 * 运行同步配置迁移：migrationVersion 已等于 14 时跳过；CCR 新安装直接打标记；否则依次执行各迁移，任一写设置失败则不提升版本（下次启动重跑）。
 */
async function runMigrations(e) {
  if (getGlobalConfig().migrationVersion === CURRENT_MIGRATION_VERSION) return;
  if (shouldSkipFreshMigrations()) {
    await saveGlobalConfig(
      (prev) => ({
        ...prev,
        migrationVersion: CURRENT_MIGRATION_VERSION,
        opusProMigrationComplete: true,
        sonnet1m45MigrationComplete: true,
        hasResetAutoModeOptInForDefaultOffer: true,
      }),
      e,
    );
    return;
  }
  let r = [];
  r.push(await migrateAutoUpdatesToSettings(e));
  r.push(await migrateBypassPermissionsAcceptedToSettings(e));
  resetProToOpusDefault(e);
  r.push(await migrateSonnet1mToSonnet45(e));
  r.push(await migrateLegacyOpusToCurrent(e));
  r.push(await migrateSonnet45ToSonnet46(e));
  r.push(await migrateOpusToOpus1m(e));
  r.push(await migrateModelAliases(undefined, e));
  r.push(await migrateFable5ToFableAlias(e));
  migrateReplBridgeEnabledToRemoteControlAtStartup(e);
  r.push(await migrateUserIntentToSettings(e));
  migrateNotificationDismissals(e);
  r.push(await resetAutoModeOptInForDefaultOffer(e));
  if (!r.every(Boolean)) {
    logForDebugging(
      "Skipping migrationVersion bump: a settings-writing migration failed to persist; the set re-runs next startup.",
      {
        level: "error",
      },
    );
    return;
  }
  await saveGlobalConfig(
    (n) =>
      n.migrationVersion === CURRENT_MIGRATION_VERSION
        ? n
        : {
            ...n,
            migrationVersion: CURRENT_MIGRATION_VERSION,
          },
    e,
  );
}
//@ chunk-cjydagjy.js:15137-15359 placement
async function getPolicyMemoryFingerprint() {
  let settingsForSource = getSettingsForSource("policySettings");
  let r = shouldShowClaudeMdExternalIncludesWarning();
  return [
    JSON.stringify([
      settingsForSource?.claudeMd ?? null,
      remoteClaudeMd(),
      settingsForSource?.claudeMdExcludes ?? null,
      settingsForSource?.autoMemoryEnabled ?? null,
      settingsForSource?.env ?? null,
      await r,
    ]),
    JSON.stringify((await r).filter((s) => s[2])),
  ];
}
//@ chunk-cjydagjy.js:16952-17014 placement
function isAuthSubcommand(flag) {
  if (flag.parent?.name() !== "auth") return false;
  return true;
}
//@ chunk-cjydagjy.js:17014-17117 placement
function isGatewayJsonLogin(e) {
  return (
    e.parent?.name() === "auth" &&
    e.name() === "login" &&
    (e.opts().gatewayJson === true || isGatewayLoginForced())
  );
}
//@ chunk-cjydagjy.js:20897-21005 placement
async function getServeHelperStopReason(e) {
  let serveHelperIneligibility = getServeHelperIneligibility();
  if (serveHelperIneligibility !== undefined) return serveHelperIneligibility;
  if ((await getClaudeAIOAuthTokenOriginAsync(e)) !== "store") return "token_origin";
  return;
}
//@ chunk-cjydagjy.js:21005-21173 placement
async function stopIfServeHelperUnsupported(credentials, r) {
  let n;
  if (r === "at_start") n = await getServeHelperStopReason(credentials);
  else
    try {
      n = getServeHelperIneligibility();
    } catch {
      n = "token_source";
    }
  if (n === undefined) return false;
  try {
    printCliError(formatServeHelperStoppedError(n));
  } finally {
    await gracefulShutdown(EXIT_CONFIG_ERROR);
  }
  return true;
}
//@ chunk-cjydagjy.js:21173-21291 placement
function getServeHelperIneligibility() {
  if (getAPIProvider() !== "firstParty") return "provider";
  if (getAuthTokenSource().source !== "claude.ai" || !isClaudeAISubscriber()) return "token_source";
  return;
}
//@ chunk-cjydagjy.js:21291-33261 placement
/**
 * 非交互/SDK 会话启动主流程（选项、云会话、输入输出）。
 */
async function runPreparedHeadless(session, r, openLiveBackgroundSessionForResume) {
  let messageQueue = createReplMessageQueue(session.storageV5);
  let {
    autoCompactWindow,
    claudeaiConfigPromise,
    jsonSchema,
    allowedTools,
    thinkingConfig,
    thinkingConfigExplicit,
    systemPrompt,
    appendSystemPrompt,
    appendSystemPromptHead,
    sdkUrl,
    sessionMirror,
    advisorModel,
    agentCli,
    agentDefinitions,
    cliAgents,
    cloudAttachId,
    commands,
    correlationId,
    deferredCommandsPromise,
    disableSlashCommands,
    effectiveForwardSubagentText,
    effectiveIncludePartialMessages,
    effectiveModel,
    effectiveReplayUserMessages,
    asWrittenMcpEntries,
    headlessCloud,
    initialMainLoopModel,
    inputPrompt,
    mcpClients,
    mcpCommands,
    mcpConfigFlagServers,
    mcpConfigOwnership,
    mcpTools,
    noMonorepo,
    outputFormat,
    permissionModeCli,
    personal,
    poolId,
    poolOnBranch,
    poolRef,
    rawModelRequest,
    regularMcpConfigs,
    resolvedInitialModel,
    resolvedMaxTurns,
    restrictedModel,
    sdkBetas,
    sdkMcpConfigs,
    session: session_2,
    sessionNameArg,
    sessionTeamContext,
    setupTrigger,
    strictMcpConfig,
    teleport,
    toolPermissionContext,
    tools,
    userSpecifiedFallbackModel,
    verbose,
  } = session;
  setPrintOutputFormat(outputFormat ?? "text");
  flushDeferredProblems();
  if (headlessCloud) {
    if (!isAttachServeMode())
      return cliError(
        "Error: this cloud session launch was admitted without being recognised as one at start-up, so it was stopped before it served anything. Please report this.",
      );
    releaseStartupWork(getRootSession().host, "not_applicable");
    setHasFormattedOutput(true);
    applyConfigEnvironmentVariables();
    if (session.serveOnly && isStoredLoginPinned()) {
      if (await stopIfServeHelperUnsupported(session.credentials, "at_start")) return;
      settingsChangeDetector.subscribe(() => {
        stopIfServeHelperUnsupported(session.credentials, "on_settings_change");
      });
    }
    initializeTelemetryAfterTrust(session.storageV5);
    if (isViolinWoodEnabledCached() && !isBareMode()) {
      settingsChangeDetector.subscribe(() => resetLocalSettingsGitTrackedCache());
      settingsChangeDetector.initialize(
        configChangeBlocker(session_2, session.storageV5, session.credentials),
        session.storageV5,
        {
          machineServesSession: true,
        },
      );
    }
    let { runHeadlessCloudAttach, runHeadlessCloudCreate } = await import("./chunk-da7dm5ea.js");
    return cloudAttachId === null
      ? runHeadlessCloudCreate(session, r, getRootSession().host)
      : runHeadlessCloudAttach(session, r, cloudAttachId, getRootSession().host, {
          serveOnly: session.serveOnly,
        });
  }
  if (session.headlessCloudPrint) {
    releaseStartupWork(getRootSession().host, "not_applicable");
    if (outputFormat === "json") setHasFormattedOutput(true);
    applyConfigEnvironmentVariables();
    initializeTelemetryAfterTrust(session.storageV5);
    let { runHeadlessCloudPrintArm } = await import("./chunk-tnrq30t1.js");
    return runHeadlessCloudPrintArm(session, r);
  }
  if (cloudAttachId !== null) {
    releaseStartupWork(getRootSession().host, "not_applicable");
    let O = settleLauncherHostLogin(
      session.orgValidation ?? (await validateForceLoginOrg(session.credentials)),
    );
    if (!O.valid) {
      await sendOrgValidationRefusal(O);
      return cliErrorAfterAnalyticsFlush(O.message);
    }
    await waitForPolicyLimitsToLoad();
    let I = cloudSessionsUnavailableReason();
    if (I) {
      await logOrgPolicyDeniedAsync("allow_remote_sessions", "cli_flag");
      return cliErrorAfterAnalyticsFlush(`Error: ${I}`);
    }
    if (outputFormat === "stream-json")
      return cliError("Error: --cloud <session_id> does not support --output-format stream-json");
    let ne = typeof inputPrompt === "string" && inputPrompt.trim() !== "" ? inputPrompt : null;
    if (ne === null)
      return cliError("Error: non-interactive --cloud <session_id> requires a prompt (positional or stdin).");
    logEvent("tengu_remote_send_headless", {
      entry_point: fromEnum("cloud_attach_headless"),
    });
    let ie = null;
    let ce;
    try {
      let session_2 = await fetchSession(cloudAttachId, undefined, session.credentials);
      if (session_2.session_status === "archived")
        ie = `cloud session ${cloudAttachId} is archived and cannot accept new messages`;
      ce = session_2.bound_device_uuid;
    } catch (error) {
      ie = errorMessage(error);
    }
    let Xe =
      ie === null && ce !== undefined && isDeviceIdentityEnabledCached()
        ? import("./chunk-pesgm5d3.js").then(
            ({ deviceEventSignerIfBoundHere }) => deviceEventSignerIfBoundHere(ce, session.credentials),
            reportSignerLoadFailure,
          )
        : undefined;
    let Se =
      ie !== null
        ? {
            ok: false,
            reason: ie,
          }
        : Xe === undefined
          ? await sendEventToRemoteSession(cloudAttachId, ne)
          : await sendEventToRemoteSession(cloudAttachId, ne, {
              eventSigner: Xe,
            });
    if (!Se.ok) {
      await logEventAsync("tengu_remote_send_headless_error", {
        entry_point: fromEnum("cloud_attach_headless"),
      });
      if (outputFormat === "json")
        process.stdout.write(
          jsonStringify({
            ok: false,
            session_id: cloudAttachId,
            error: Se.reason,
          }) +
            `
`,
        );
      return cliErrorAfterAnalyticsFlush(
        `Error: failed to send message to cloud session ${cloudAttachId}: ${Se.reason}`,
      );
    }
    await logEventAsync("tengu_remote_send_headless_success", {
      entry_point: fromEnum("cloud_attach_headless"),
    });
    let remoteSessionUrl = getRemoteSessionUrl(cloudAttachId, undefined, {
      from: "cli",
      m: "0",
    });
    if (outputFormat === "json")
      process.stdout.write(
        jsonStringify({
          ok: true,
          session_id: cloudAttachId,
          url: remoteSessionUrl,
        }) +
          `
`,
      );
    else {
      process.stdout.write(`Sent to cloud session.
`);
      process.stdout.write(`Session ID: ${cloudAttachId}
`);
      process.stdout.write(`View: ${remoteSessionUrl}
`);
    }
    await gracefulShutdown(0);
    return;
  }
  if (poolId !== null) {
    releaseStartupWork(getRootSession().host, "not_applicable");
    let O = settleLauncherHostLogin(
      session.orgValidation ?? (await validateForceLoginOrg(session.credentials)),
    );
    if (!O.valid) {
      await sendOrgValidationRefusal(O);
      return cliErrorAfterAnalyticsFlush(O.message);
    }
    await waitForPolicyLimitsToLoad();
    let I = cloudSessionsUnavailableReason();
    if (I) {
      await logOrgPolicyDeniedAsync("allow_remote_sessions", "cli_flag");
      return cliErrorAfterAnalyticsFlush(`Error: ${I}`);
    }
    let ne = typeof inputPrompt === "string" && inputPrompt.trim() !== "" ? inputPrompt : null;
    if (ne === null) {
      let { prefix, flag } = environmentFlagErrorPrefix(noMonorepo);
      return cliError(
        `${prefix}non-interactive ${flag} requires a prompt (positional or stdin). Run from a TTY for an interactive cloud session.`,
      );
    }
    let ie = undefined;
    let rules = ie?.kind === "rules" ? ie.rules : undefined;
    let Xe = undefined;
    let Se = undefined;
    let Me = undefined;
    logEvent("tengu_remote_create_session", {
      has_initial_prompt: lit("true"),
      entry_point: fromEnum("pool_headless"),
      branch_mode: branchModeForTelemetry(poolOnBranch, poolRef),
      disallowed_tools_count: rules?.length ?? 0,
      ...disallowedToolsTelemetry(rules),
      builtin_tools_count: Me?.length ?? 0,
      ...false,
    });
    if (ie?.kind === "unclosed") {
      await logEventAsync("tengu_remote_create_session_error", {
        error: lit("deny_rule_unclosed"),
        entry_point: fromEnum("pool_headless"),
        branch_mode: branchModeForTelemetry(poolOnBranch, poolRef),
      });
      return cliErrorAfterAnalyticsFlush(unclosedParenError(ie.rule));
    }
    let Z = [];
    let z = undefined;
    let permissionMode =
      z === undefined ? cloudPermissionModeFrom(permissionModeCli) : z.decision.permissionMode;
    let Mo = poolOnBranch ?? poolRef ?? (await getBranch());
    let Qe;
    let Et;
    let se;
    let Ze;
    let ye = await teleportToRemote({
      initialMessage: ne,
      signal: new AbortController().signal,
      source: "remote",
      branchName: Mo || undefined,
      branchFromHead: (poolOnBranch ?? poolRef) == null,
      reuseOutcomeBranch: poolOnBranch ?? undefined,
      explicitRef: poolOnBranch ?? poolRef ?? undefined,
      poolId,
      noMonorepo,
      personal,
      repositoryRequiredBy: Se === undefined ? undefined : `The agent "${Se}"`,
      onBundleNotice: (ae) => {},
      correlationId: correlationId ?? undefined,
      ...{
        title: sessionNameArg || undefined,
        model: z?.model,
        permissionMode,
        proactivityLevel: r.proactivity,
        disallowedTools: rules,
        builtinTools: Me,
      },
      onCreateFail: (ae, tt, Fo) => {
        Qe = ae;
        Et = tt;
        se = Fo;
        process.stderr.write(`Error: ${ae}
`);
      },
      storageV5: session.storageV5,
      credentials: credentialsStoreFor(session.storageV5),
    });
    if (!ye) {
      await logEventAsync("tengu_remote_create_session_error", {
        error: fromEnumOpt(Et),
        entry_point: fromEnum("pool_headless"),
        branch_mode: branchModeForTelemetry(poolOnBranch, poolRef),
        ...(se?.endpoint && {
          create_endpoint: fromEnum(se.endpoint),
        }),
        ...(se?.serverReason && {
          server_reason: fromEnum(se.serverReason),
        }),
        ...(se?.messageHidden && {
          message_hidden: lit("true"),
        }),
        ...(se?.preflightTransient !== undefined && {
          deny_transient: lit(se.preflightTransient ? "true" : "false"),
        }),
        ...(se?.sessionArchived !== undefined && {
          session_archived: lit(se.sessionArchived ? "true" : "false"),
        }),
      });
      if (outputFormat === "json")
        process.stdout.write(
          jsonStringify({
            ok: false,
            error: Qe ?? "Unable to create cloud session",
          }) +
            `
`,
        );
      return cliErrorAfterAnalyticsFlush(Qe ? undefined : "Error: Unable to create cloud session");
    }
    await logEventAsync("tengu_remote_create_session_success", {
      session_id: shortHash(ye.id),
      entry_point: fromEnum("pool_headless"),
      branch_mode: branchModeForTelemetry(poolOnBranch, poolRef),
    });
    if (z !== undefined && z.decision.action !== "none") {
      let { modelSupportsAutoMode } = await import("./chunk-mcvgnamj.js");
      await logEventAsync("tengu_remote_model_gate_hint", {
        entry_point: lit("pool_headless"),
        permission_mode: fromEnumOpt(z.explicitMode) ?? lit("unset"),
        action: fromEnum(z.decision.action),
        ...(z.decision.repositoryModel && {
          repository_model: fromEnum(z.decision.repositoryModel),
        }),
        ...(z.decision.barredBy && {
          barred_by: fromEnum(z.decision.barredBy),
        }),
        model_runs_auto: lit(modelSupportsAutoMode(z.model) ? "true" : "false"),
      });
    }
    let text = z?.decision.notice?.text;
    let remoteSessionUrl = getRemoteSessionUrl(ye.id, undefined, {
      from: "cli",
      m: "0",
    });
    let compatSessionId = toCompatSessionId_2(ye.id);
    if (outputFormat === "json")
      process.stdout.write(
        jsonStringify({
          ok: true,
          session_id: compatSessionId,
          title: ye.title,
          url: remoteSessionUrl,
          pool_id: poolId,
          notice: Ze,
          ...(Z.length > 0 && {
            not_applied: Z,
          }),
          ...(text !== undefined && {
            mode_notice: text,
          }),
        }) +
          `
`,
      );
    else {
      if (Ze !== undefined)
        process.stderr.write(`${Ze}
`);
      Z.forEach((ae) =>
        process.stderr.write(`${ae}
`),
      );
      if (text !== undefined)
        process.stderr.write(`${text}
`);
      process.stdout.write(`Created cloud session: ${ye.title}
`);
      process.stdout.write(`Session ID: ${compatSessionId}
`);
      process.stdout.write(`View: ${remoteSessionUrl}
`);
      process.stdout.write(`Resume with: claude --teleport ${compatSessionId}
`);
    }
    await gracefulShutdown(0);
    return;
  }
  if (outputFormat === "stream-json" || outputFormat === "json") setHasFormattedOutput(true);
  applyConfigEnvironmentVariables();
  if (isSessionTracingEnabled() || isEnvTruthy(process.env.CLAUDE_CODE_ENABLE_TELEMETRY))
    initializeTelemetryAfterTrust(session.storageV5);
  else
    holdForStartupWork(session_2.host, "telemetry_init", (O) => {
      if (O === "shutdown") return;
      initializeTelemetryAfterTrust(session.storageV5);
    });
  let pt =
    (r.continue || r.resume || teleport) && !startupModelWinsOverSessionRestore()
      ? null
      : getModelDeprecationWarning(rawModelRequest ?? resolvedInitialModel);
  if (pt && outputFormat !== "json" && outputFormat !== "stream-json") cliWarn(pt);
  let startTime = performance.now();
  let ct =
    r.continue || r.resume || teleport || setupTrigger || isParkedSpare()
      ? undefined
      : runStartupHooks(session_2, {
          kind: "session-start",
          source: "startup",
          storageV5: session.storageV5,
          credentials: session.credentials,
        }).then((O) => {
          recordPhase("hooks_init_ms", performance.now() - startTime, startTime);
          return O;
        });
  ct?.catch(() => {});
  profileCheckpoint("before_validateForceLoginOrg");
  let Re = settleLauncherHostLogin(
    session.orgValidation ?? (await validateForceLoginOrg(session.credentials)),
  );
  if (!Re.valid) {
    printCliError(Re.message);
    releaseStartupWork(session_2.host, "shutdown");
    await sendOrgValidationRefusal(Re);
    await writeStartupFailureResult({
      sessionId: getSessionId(),
      message: Re.message,
      reason: Re.reason,
    });
    await flushAnalyticsSinks();
    return cliError();
  }
  let Ke = disableSlashCommands
    ? []
    : deferredCommandsPromise
      ? deferredCommandsPromise.then(getNonInteractiveCommands)
      : getNonInteractiveCommands(commands);
  if (Ke instanceof Promise) Ke.catch(() => {});
  let defaultAppState = getDefaultAppState_2();
  let ht = {
    ...defaultAppState,
    mainLoopModel: initialMainLoopModel,
    mcp: {
      ...defaultAppState.mcp,
      clients: mcpClients,
      commands: mcpCommands,
      tools: mcpTools,
    },
    toolPermissionContext,
    proactivityLevel: session.proactivityLevel,
    ...createSessionEffortState(r.effort),
    ultracode: isUltracodeEnabled(r.effort),
    autoCompactWindow,
    ...(isFastModeEnabled() && {
      fastMode: isFastModeSettingActive(effectiveModel ?? null),
    }),
    ...(isAdvisorToolEnabled() &&
      advisorModel && {
        advisorModel,
      }),
    ...(r.promptSuggestions !== undefined && {
      promptSuggestionEnabled: r.promptSuggestions && isPromptSuggestionSettingEnabled(),
    }),
    ...(sessionTeamContext && {
      teamContext: sessionTeamContext.teamContext,
      teammateColors: sessionTeamContext.teammateColors,
    }),
  };
  let St = new SessionStateTracker();
  let store = createStore(ht, (O) =>
    onAppStateChange(O, session_2, St, session.storageV5, session.credentials),
  );
  session_2.engineStore.adopt(store);
  syncSessionPermissionMode(ht.toolPermissionContext.mode);
  registerCleanup(() => hasPendingHandoff(store.getState().tasks, session.storageV5));
  resetRefusalFallbackOnSwitch(store.setState);
  let _t = verifyAutoModeGateAccess(toolPermissionContext, store.getState().fastMode);
  _t.then(({ updateContext }) => {
    store.setState((I) => {
      let ne = updateContext(I.toolPermissionContext);
      if (ne === I.toolPermissionContext) return I;
      return {
        ...I,
        toolPermissionContext: ne,
      };
    });
  });
  if (session.relaunchFlagFetchSettled) {
    let O = EVENT_LOGGING_FLAG_WAIT_MS;
    await withDeadline(
      _t.catch(() => {}),
      O,
    );
  }
  setSdkBetas(sdkBetas);
  let state = {
    getClients: () => store.getState().mcp.clients,
    getSuppressedPluginServers: () => store.getState().mcp.suppressedPluginMcpServers ?? [],
    applyMcpUpdate: (O) =>
      store.setState((I) => ({
        ...I,
        mcp: O(I.mcp),
      })),
  };
  let Pt = isParkedSpare()
    ? filterObject(
        regularMcpConfigs,
        (O, I) => isNonReservedStdioConfig(I, O) && O.scope !== "project" && O.scope !== "local",
      )
    : {};
  let regularMcpConfigs_2 = isParkedSpare()
    ? filterObject(regularMcpConfigs, (O, I) => !isNonReservedStdioConfig(I, O))
    : regularMcpConfigs;
  let ze = {};
  let Po = MCP_CONNECT_PHASES({
    regularMcpConfigs: regularMcpConfigs_2,
    claudeaiConfigPromise,
    state,
    storageV5: session.storageV5,
    credentials: session.credentials,
    ...(shouldJoinBeforeInput(sdkUrl) && {
      leaveAlwaysLoadWaitTo: (join) => {
        ze.join = join;
      },
    }),
  });
  installStartupMcpHeaders(session_2, regularMcpConfigs, mcpConfigOwnership, asWrittenMcpEntries);
  profileCheckpoint("before_connectMcp");
  let startTime_2 = performance.now();
  await Po.connect();
  recordPhase("mcp_connect_ms", performance.now() - startTime_2, startTime_2);
  profileCheckpoint("after_connectMcp_claudeai");
  if (!isBareMode())
    startTurnInputPrefetches(session_2, session.storageV5, session.credentials, {
      userContext: !shouldPrefetchUserContext(Boolean(r.continue || r.resume)),
    });
  holdForStartupWork(session_2.host, "idle_startup_work", (O) => {
    if (!isBareMode() && O !== "shutdown") {
      startIdleStartupWork(session_2, session.storageV5, session.credentials);
      import("./chunk-5kp2513a.js").then((I) =>
        I.startBackgroundHousekeeping(getRootSession().host, session.storageV5),
      );
    }
    logSessionTelemetry(session.storageV5, session.credentials);
  });
  profileCheckpoint("before_print_import");
  let startTime_3 = performance.now();
  let { runHeadless, explicitMcpConfigRequestsWait, endHeadlessSessionOnEscapedError } =
    await import("./chunk-tyg7f3ek.js");
  recordPhase("print_import_ms", performance.now() - startTime_3, startTime_3);
  profileCheckpoint("after_print_import");
  let earlyRemoteLink = await session.earlyRemoteLink;
  runHeadless(
    session_2,
    inputPrompt,
    () => store.getState(),
    store.setState,
    store.subscribe,
    Ke,
    tools,
    sdkMcpConfigs,
    agentDefinitions.activeAgents,
    {
      continue: r.continue,
      resume: r.resume,
      verbose,
      outputFormat,
      jsonSchema,
      permissionPromptToolName: r.permissionPromptTool,
      permissionPrompts: isNoPromptHost(r.permissionPrompts) ? NONE : undefined,
      permissionModeSuppliedOnInvocation: session.permissionModeSuppliedOnInvocation,
      bypassAvailableByFlag: session.allowDangerouslySkipPermissions,
      storageV5: session.storageV5,
      earlyHydrateReads: session.earlyHydrateReads,
      earlyRemoteLink,
      liveBackgroundHandoff:
        openLiveBackgroundSessionForResume === undefined
          ? undefined
          : {
              open: openLiveBackgroundSessionForResume,
              prompt: session.preDecorationInputPrompt,
            },
      cliAgents,
      messageQueue,
      credentials: credentialsStoreFor(session.storageV5),
      allowedTools,
      thinkingConfig,
      thinkingConfigExplicit,
      maxTurns: resolvedMaxTurns,
      maxBudgetUsd: r.maxBudgetUsd,
      taskBudget: r.taskBudget
        ? {
            total: r.taskBudget,
          }
        : undefined,
      systemPrompt,
      appendSystemPrompt,
      appendSystemPromptHead,
      planModeInstructions: r.planModeInstructions,
      systemPromptSnapshot: r.systemPromptSnapshot,
      appendSubagentSystemPrompt: r.appendSubagentSystemPrompt,
      excludeDynamicSections: r.excludeDynamicSystemPromptSections || undefined,
      userSpecifiedModel: effectiveModel,
      restrictedStartupModel: restrictedModel,
      fallbackModel: userSpecifiedFallbackModel,
      teleport,
      sdkUrl,
      replayUserMessages: effectiveReplayUserMessages,
      includePartialMessages: effectiveIncludePartialMessages,
      forwardSubagentText: effectiveForwardSubagentText,
      sessionMirror,
      forkSession: r.forkSession || false,
      sessionBeganAsCopy: r.sessionBeganAsCopy,
      resumeSessionAt: r.resumeSessionAt || undefined,
      resumeDropsTurn: r.resumeDropsTurn,
      rewindFiles: r.rewindFiles,
      enableAuthStatus: r.enableAuthStatus,
      promptSuggestions: r.promptSuggestions,
      agent: agentCli,
      workload: r.workload,
      setupTrigger: setupTrigger ?? undefined,
      configuredMcpServerCount: Object.keys(regularMcpConfigs).length,
      mcpConnectKickedAtMs: startTime_2,
      ...(ze.join !== undefined && {
        joinAlwaysLoadMcp: ze.join,
      }),
      explicitMcpConfigFlag: explicitMcpConfigRequestsWait(
        mcpConfigFlagServers,
        strictMcpConfig,
        Object.keys(regularMcpConfigs).length,
      ),
      mcpConfigOwnership,
      sessionStartHooksPromise: ct,
      sessionState: St,
      startDeferredMcpServers:
        Object.keys(Pt).length > 0
          ? async (O) => {
              let I = omitExcludedOrPluginDisabled(Pt, O, {
                ...getAddDirEnabledPlugins(),
                ...(getInitialSettings_2().enabledPlugins ?? {}),
              });
              await connectMcpConfigServers({
                configs: I,
                label: "claim",
                nonBlocking: getMcpConnectNonBlocking(),
                state,
                storageV5: session.storageV5,
                credentials: session.credentials,
              });
              return Object.keys(I);
            }
          : undefined,
    },
  ).catch((error) => endHeadlessSessionOnEscapedError(session_2, error, outputFormat));
  return;
}
//@ chunk-cjydagjy.js:37242-37304 sole-consumer
function shouldPrefetchForCommand(flag, program) {
  return (flag.parent === program && POLICY_HELPER_HOST.has(flag.name())) || isGatewayJsonLogin(flag);
}
//@ chunk-cjydagjy.js:37304-37330 affinity
function alwaysFalse(flag, program) {
  return false;
}
//@ chunk-cjydagjy.js:37330-69366 fingerprint = run (0.359)
/**
 * commander 构建器（旧版 run() 的前半）：new Command 并挂 preAction 钩子（MDM/钥匙串等待、--project-config-root、init()、客户端数据 URL、启动钩子、插件目录、迁移、远程托管设置/安全对话框、版本下限检查），定义根命令全部选项与 action（→ prepareSession → runHeadless 或 runInteractiveSession）。
 */
function buildCliProgram(e) {
  let program = new Command().configureHelp(createHelpConfig()).enablePositionalOptions();
  profileCheckpoint("run_commander_initialized");
  let n = false;
  let s;
  let S;
  let withStorageV5 =
    (config) =>
    (...k) =>
      config(s, ...k);
  let withStartupHandles =
    (config) =>
    (...k) =>
      config(s, S, ...k);
  program.hook("preAction", async (raw, flag) => {
    profileCheckpoint("preAction_start");
    let startTime = performance.now();
    if (flag !== program && raw.getOptionValueSource("desktop") === "cli") {
      let w = [];
      for (let R = flag; R !== null && R !== program; R = R.parent) w.unshift(R.name());
      return cliError(`--desktop can't be combined with \`claude ${w.join(" ")}\`.`);
    }
    if (
      env.CLAUDE_CODE_SDK_READS_STARTUP_MARKS === true &&
      flag === program &&
      raw.getOptionValue("outputFormat") === "stream-json" &&
      raw.getOptionValue("sdkUrl") === undefined &&
      !isDisklessProcess()
    )
      setStartupMarkWriter((entries) => {
        writeOut(process.stdout, entries, () => {});
      });
    if (
      flag === program &&
      raw.getOptionValue("awaitInitialize") === true &&
      raw.getOptionValue("inputFormat") === "stream-json" &&
      raw.getOptionValue("sdkUrl") === undefined &&
      !process.stdin.isTTY
    )
      startAwaitInitialize(readStreamJsonStdin);
    await Promise.all([ensureMdmLoaded(), ensureKeychainPrefetchCompleted()]);
    recordPhase("pre_action_mdm_keychain_ms", performance.now() - startTime, startTime);
    profileCheckpoint("preAction_after_mdm");
    let optionValue = raw.getOptionValue("projectConfigRoot");
    if (typeof optionValue === "string") {
      if (!isAbsolute(optionValue) || isUntouchableSpelling(optionValue))
        return cliError("Error: --project-config-root must be an absolute local path");
      let w;
      try {
        w = await realpath(optionValue);
        await (await opendir(w)).close();
      } catch {
        return cliError("Error: --project-config-root is not an existing directory that this user can list");
      }
      if (isUntouchableSpelling(w))
        return cliError("Error: --project-config-root resolves to a network location, not a local directory");
      setProjectConfigRoot(w);
    }
    let q = false;
    function x(site) {
      q = true;
      let R =
        flag === program &&
        raw.getOptionValue("deepLinkOrigin") !== true &&
        !hasRemoteHelperState() &&
        getBasePolicySettings()?.policyHelpers == null &&
        getBasePolicySettings()?.policyHelper == null
          ? judgeStartupGrowthBookKick(site, raw.getOptionValue("worktree") !== undefined)
          : "launch_excluded";
      markFlagFetchKick(R);
      if (didStartGrowthBookKick(R)) initializeGrowthBook().catch(() => {});
    }
    let ee = flag === program && raw.getOptionValue("desktop") !== true;
    if (!ee) declareNoHybridTokenRefresh();
    let Ge = true;
    let at = true;
    let optionValue_2 = raw.getOptionValue("clientDataUrl");
    let startClientDataUrlFetch = ee
      ? () =>
          !hasRemoteHelperState() &&
          getBasePolicySettings()?.policyHelpers == null &&
          getBasePolicySettings()?.policyHelper == null &&
          loadClientDataForStartup({
            flagUrl: typeof optionValue_2 === "string" ? optionValue_2 : undefined,
            runsOnAnotherMachine: ["remote", "cloud"].some(
              (configs) => raw.getOptionValue(configs) !== undefined,
            ),
          })
      : undefined;
    let mcpConfigStart = performance.now();
    s = await init({
      showInvalidConfigDialog: e.showInvalidConfigDialog,
      storageV5EnvPin: e.storageV5EnvPin,
      preparesSession: ee,
      startupGrowthBookKick: env.CLAUDE_CODE_GROWTHBOOK_KICK_FROM_INIT ? () => x("init") : undefined,
      prefetchManagedConfig: true,
      startClientDataUrlFetch,
    }).catch(async (result) => {
      if (isBgSession() || isSupervisedMode()) throw result;
      if (!areShutdownHandlersInstalled())
        return cliError(`Claude Code could not start: ${errorMessage(result)}`);
      trackError(result, "unhandled_rejection");
      printCliError(`Claude Code could not start: ${errorMessage(result)}`);
      await gracefulShutdown(1, "other", {
        suppressResumeHint: true,
      });
      return cliError();
    });
    S = credentialsStoreFor(s);
    if (isStorageV5Enabled() && s !== undefined)
      initDefaultDebugLog({
        storageV5: s,
      });
    recordPhase("pre_action_init_ms", performance.now() - mcpConfigStart, mcpConfigStart);
    profileCheckpoint("preAction_after_init");
    let startTime_2 = performance.now();
    if (await applyPendingClientDataBaseUrl()) redoAuthDependentStartup();
    recordPhase("pre_action_client_data_url_ms", performance.now() - startTime_2, startTime_2);
    profileCheckpoint("preAction_after_client_data_url");
    let tools = shouldAskLauncherHostLogin({
      preparesSession: ee,
      inputFormat: raw.getOptionValue("inputFormat"),
      sdkUrl: raw.getOptionValue("sdkUrl"),
      awaitClaim: raw.getOptionValue("awaitClaim"),
      cloudSession: CLOUD_SESSION_OPTION_KEYS.some((w) => raw.getOptionValue(w) !== undefined),
      openStdin: readStreamJsonStdin,
    });
    if (tools !== null) {
      if (await tools) redoStartupAfterLauncherLogin(q);
      profileCheckpoint("preAction_after_launcher_sign_in");
    }
    if (!q) x("after_init");
    if (!env.CLAUDE_CODE_DISABLE_TERMINAL_TITLE) process.title = "claude";
    let { initSinks } = await import("./chunk-19b0wnnf.js");
    initSinks();
    profileCheckpoint("preAction_after_sinks");
    let setupStart = performance.now();
    let le = await awaitInitializeResult();
    if (le) recordPhase("await_initialize_ms", performance.now() - setupStart, setupStart);
    if (le?.kind === "violation") return cliError(le.message);
    let me = le?.kind === "applied" ? le : undefined;
    let ve = mergePluginDirs(asStringArray(raw.getOptionValue("pluginDir")), me?.pluginDirs ?? []);
    if (ve.length > 0) {
      setInlinePlugins(ve);
      clearPluginCache("preAction: --plugin-dir inline plugins");
    }
    let ke = mergePluginDirs(asStringArray(raw.getOptionValue("pluginDirNoMcp")), me?.pluginDirsNoMcp ?? []);
    if (ke.length > 0) {
      setInlinePluginsNoMcp(ke);
      clearPluginCache("preAction: --plugin-dir-no-mcp inline plugins");
    }
    let optionValue_3 = raw.getOptionValue("pluginUrl");
    if (
      Array.isArray(optionValue_3) &&
      optionValue_3.length > 0 &&
      optionValue_3.every((w) => typeof w === "string")
    ) {
      setInlinePluginUrls(optionValue_3);
      clearPluginCache("preAction: --plugin-url inline plugins");
    }
    let effectiveReplayUserMessages = false;
    if (!effectiveReplayUserMessages) {
      let startTime = performance.now();
      await runAllMigrations(s);
      recordPhase("pre_action_migrations_ms", performance.now() - startTime, startTime);
    }
    profileCheckpoint("preAction_after_migrations");
    let commandsStart = performance.now();
    let parsedAgents = isAuthSubcommand(flag);
    setDefaultCommandFlag(flag === program);
    registerOrgConfigGate({
      authRecoveryCommand: parsedAgents,
      settle: () =>
        Promise.all([
          waitForPolicyLimitsToLoad().catch(() => {}),
          waitForRemoteManagedSettingsFetchToSettle().catch(() => {}),
        ]).then(() => {}),
      readSignatureFacts: () => ({
        policy: getPolicyLimitsSignatureFacts(),
        settings: getRemoteManagedSettingsSignatureFacts(),
      }),
    });
    managedSettingsConsentRejected.subscribe(() => recordManagedSettingsRefusal("consent_rejected"));
    if (!parsedAgents && needsPolicyHelperVerdict()) {
      let w = hasRemoteHelperState();
      let R = await runPolicyHelperPass(
        getBasePolicySettings(),
        getBasePolicySettingsOrigin(),
        getPolicyHelperSourceLoadErrors(),
      );
      if (R) {
        await exitWithStartupFailure(policyHelperExitReason(getPolicyHelperSourceLoadErrors()), R);
        return cliError();
      }
      if (hasRemoteHelperState() && !w) {
        applySafeConfigEnvironmentVariables();
        configureProxyAuthHelperFromSettings();
        await rejudgeHostLaunchedGateway();
        resetRemoteSettingsSyncCache();
      }
    }
    let initialMainLoopModel = isForceRemoteSettingsRefreshConfigured();
    let Ae = parsedAgents ? undefined : hostLaunchedGatewayRefusal(initialMainLoopModel);
    if (Ae !== undefined)
      return injectBridgeFault(
        initialMainLoopModel ? "force_refresh_failed" : "_OTHER",
        Ae,
        "remote_settings_required_unavailable",
      );
    let lt = false;
    markLoadCycleBegun();
    if (initialMainLoopModel && !parsedAgents) {
      let w = await validateForceRemoteSettingsRefresh(
        async () =>
          loadRemoteManagedSettings(await e.showSecurityDialog?.(), s, {
            startupAwaited: true,
            credentials: S,
          }),
        machineForcedRefresh,
      );
      if (!w.valid)
        return injectBridgeFault(
          "force_refresh_failed",
          hostLaunchedGatewayLoadRefusal(false) ?? w.message,
          remoteSettingsFailureReason(),
        );
      noteHostLaunchedGatewayWithoutPolicy();
    } else if (getAPIProvider() === "gateway" && !parsedAgents) {
      let remoteManagedSettings = await loadRemoteManagedSettings(await e.showSecurityDialog?.(), s, {
        startupAwaited: true,
        credentials: S,
      });
      let normalizedAdvisorModel = hostLaunchedGatewayLoadRefusal(remoteManagedSettings);
      if (normalizedAdvisorModel !== undefined) {
        let D = gatewaySettingsFailure();
        return injectBridgeFault(
          D.forbidden ? "gateway_rejected" : "_OTHER",
          normalizedAdvisorModel,
          D.reason,
        );
      }
      if (!remoteManagedSettings) {
        let D = gatewaySettingsFailure();
        if (
          !D.endedSession ||
          flag !== program ||
          getIsNonInteractiveSession() ||
          isUnattendedInteractiveSession()
        )
          return injectBridgeFault(D.forbidden ? "gateway_rejected" : "_OTHER", D.exitMessage, D.reason);
        continueSignedOutAfterGatewayEnd();
      }
    } else if (shouldWaitForRemotePolicy() && !parsedAgents)
      await Promise.resolve(e.showSecurityDialog?.())
        .then((w) =>
          loadRemoteManagedSettings(w, s, {
            singleAttempt: true,
            startupAwaited: true,
            credentials: S,
          }),
        )
        .catch(logError);
    else
      Promise.resolve(e.showSecurityDialog?.())
        .then((w) =>
          loadRemoteManagedSettings(w, s, {
            credentials: S,
          }),
        )
        .catch(logError);
    if (shouldPrefetchForCommand(flag, program)) {
      declareNoConsentSurface();
      markStartsNoSession();
    } else if (alwaysFalse(flag, program)) declareNoConsentSurface();
    else if (isPluginMutationCommand(flag)) declareStopsWhenApprovalCannotBeAsked();
    let startupAwaited = ee && shouldAwaitPolicyLimitsOnStartup();
    loadPolicyLimits({
      startupAwaited,
    });
    {
      let thinkingEnabled = getBasePolicySettingsOrigin();
      retireIfShadowedByRemote(thinkingEnabled);
      let R = await runPolicyHelperPass(
        getBasePolicySettings(),
        thinkingEnabled,
        getPolicyHelperSourceLoadErrors(),
      );
      if (R) {
        await exitWithStartupFailure(policyHelperExitReason(getPolicyHelperSourceLoadErrors()), R);
        return cliError();
      }
      enableMidSessionArming(POLICY_HELPER_HOST_2);
      if (hasRemoteHelperState()) applySafeConfigEnvironmentVariables();
    }
    let j = watchManagedMemoryPolicy(getRootSession());
    refreshed.subscribe(j);
    let headlessStore = withoutPluginDirs(settlePluginDirsEnv(), ke);
    if (headlessStore.length > 0) {
      setInlinePlugins(mergePluginDirs(ve, headlessStore));
      clearPluginCache("preAction: CLAUDE_CODE_PLUGIN_DIRS inline plugins");
    }
    if (areSideloadFlagsDisabledByPolicy()) {
      let w = [];
      let R = (prev) => (Array.isArray(prev) ? prev.length > 0 : typeof prev === "string" && prev.length > 0);
      for (let [D, Be] of [
        ["pluginDir", "--plugin-dir"],
        ["pluginDirNoMcp", "--plugin-dir-no-mcp"],
        ["pluginUrl", "--plugin-url"],
        ["agents", "--agents"],
      ])
        if (R(raw.getOptionValue(D)) || R(flag.getOptionValue(D))) w.push(Be);
      if (me && me.pluginDirs.length + me.pluginDirsNoMcp.length > 0) w.push("plugins (initialize request)");
      if (headlessStore.length > 0) w.push(PLUGIN_DIRS_ENV_VAR);
      if (w.length > 0 && headlessStore.length > 0) {
        let nextCtx = sideloadFlagsBlockedMessage(w);
        return cliError(`${nextCtx} ${PLUGIN_DIRS_ENV_RECOVERY_HINT}`);
      }
      if (w.length > 0) return cliError(sideloadFlagsBlockedMessage(w));
    }
    let xe = checkCommandVersionBounds(flag);
    if (xe) {
      await exitWithStartupFailure("version_below_minimum", xe);
      return cliError();
    }
    settingsChangeDetector.subscribe((prev) => {
      if (prev === "policySettings") j();
    });
    recordPhase("pre_action_managed_settings_ms", performance.now() - commandsStart, commandsStart);
    profileCheckpoint("preAction_after_remote_settings");
    if (effectiveReplayUserMessages && !isBigQueryMetricsEnabled()) {
      let startTime = performance.now();
      await runAllMigrations(s);
      recordPhase("pre_action_migrations_ms", performance.now() - startTime, startTime);
    }
    if (ee && raw.getOptionValue("worktree") === undefined && !env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL) {
      let optionValue = raw.getOptionValue("addDir");
      if (Array.isArray(optionValue) && optionValue.every((prev) => typeof prev === "string"))
        setAdditionalDirectoriesForClaudeMd(optionValue);
      initBuiltinPlugins();
      loadAllPluginsCacheOnly(s, S).catch(() => {});
      n = true;
      profileCheckpoint("preAction_after_plugin_early_kick");
    }
    recordPhase("pre_action_ms", performance.now() - startTime, startTime);
    markStartupActionStarted(ee);
  });
  let E = program
    .name("claude")
    .description(
      "Claude Code - starts an interactive session by default, use -p/--print for non-interactive output",
    )
    .argument("[prompt]", "Your prompt", String)
    .helpOption("-h, --help", "Display help for command")
    .option(
      "-d, --debug [filter]",
      "Enable debug mode with optional category filtering (e.g., --debug=hooks,mcp or --debug='!hooks,!mcp')",
      (h) => true,
    )
    .addOption(
      new Option("-d2e, --debug-to-stderr", "(deprecated) Enable debug mode (to stderr)")
        .argParser(Boolean)
        .hideHelp()
        .implies({
          debug: true,
        }),
    )
    .option(
      "--debug-file <path>",
      "Write debug logs to a specific file path (implicitly enables debug mode)",
      () => true,
    )
    .option("--verbose", "Override verbose mode setting from config", () => true)
    .option(
      "-p, --print",
      "Print response and exit (useful for pipes). Note: The workspace trust dialog is skipped when Claude is run in non-interactive mode (via -p, or when stdout is not a TTY, e.g. piped or redirected output). Only use this in directories you trust. Settings files that fail validation are silently ignored in this mode (no error dialog is shown).",
      () => true,
    )
    .option(
      "--bare",
      "Minimal mode: skip hooks (those defined in settings and by installed plugins; features built into Claude Code are unaffected), LSP, plugin sync, attribution, auto-memory, background prefetches, keychain reads, and CLAUDE.md auto-discovery. Sets CLAUDE_CODE_SIMPLE=1. Anthropic auth is strictly ANTHROPIC_API_KEY or apiKeyHelper via --settings (OAuth and keychain are never read). 3P providers (Bedrock/Vertex/Foundry) use their own credentials. Skills still resolve via /skill-name. Explicitly provide context via: --system-prompt[-file], --append-system-prompt[-file], --add-dir (CLAUDE.md dirs), --mcp-config, --settings, --agents, --plugin-dir.",
      () => true,
    )
    .option(
      "--safe-mode",
      "Start with all customizations (CLAUDE.md, skills, installed plugins, hooks, MCP servers, custom commands and agents, output styles, workflows, custom themes, keybindings, and more) disabled " +
        "\u2014 useful for troubleshooting a broken configuration. " +
        "Admin-managed (policy) settings still apply. Auth, model selection, built-in tools and plugins, and permissions work normally. Sets CLAUDE_CODE_SAFE_MODE=1.",
      () => true,
    )
    .addOption(new Option("--init", "Run Setup hooks with init trigger, then continue").hideHelp())
    .addOption(new Option("--init-only", "Run Setup and SessionStart:startup hooks, then exit").hideHelp())
    .addOption(
      new Option("--maintenance", "Run Setup hooks with maintenance trigger, then continue").hideHelp(),
    )
    .addOption(
      new Option(
        "--output-format <format>",
        'Output format (only works with --print): "text" (default), "json" (single result), or "stream-json" (realtime streaming)',
      ).choices(["text", "json", "stream-json"]),
    )
    .addOption(
      new Option(
        "--json-schema <schema>",
        'JSON Schema for structured output validation (only works with --print). Example: {"type":"object","properties":{"name":{"type":"string"}},"required":["name"]}',
      ).argParser(String),
    )
    .option(
      "--include-hook-events",
      "Include all hook lifecycle events in the output stream (only works with --output-format=stream-json)",
      () => true,
    )
    .option(
      "--include-partial-messages",
      "Include partial message chunks as they arrive (only works with --print and --output-format=stream-json)",
      () => true,
    )
    .option(
      "--forward-subagent-text",
      "Forward subagent text and thinking blocks as assistant/user messages with parent_tool_use_id set (only works with --print and --output-format=stream-json)",
      () => true,
    )
    .addOption(
      new Option(
        "--session-mirror",
        "Emit transcript_mirror frames on stdout (SDK-internal; set by ProcessTransport when sessionStore is configured)",
      ).hideHelp(),
    )
    .addOption(
      new Option(
        "--await-claim",
        "Start as a pre-warmed spare for an SDK host: boot with host-level options in a neutral directory, skip session-scoped start-up work, and wait for a claim_session control request that binds the process to its session (SDK-internal; requires --print with stream-json input and output)",
      ).hideHelp(),
    )
    .addOption(
      new Option(
        "--input-format <format>",
        'Input format (only works with --print): "text" (default), or "stream-json" (realtime streaming input)',
      ).choices(["text", "stream-json"]),
    )
    .addOption(
      new Option(
        "--await-initialize",
        "Read the initialize control request from stdin during startup so its launch-scoped fields (plugins) apply exactly like their command-line flags. Pass it only from the process that writes that request as the first stdin line at spawn (only works with --input-format=stream-json)",
      ).hideHelp(),
    )
    .option(
      "--dangerously-skip-permissions",
      "Bypass all permission checks. Recommended only for sandboxes with no internet access.",
      () => true,
    )
    .option(
      "--allow-dangerously-skip-permissions",
      "Enable bypassing all permission checks as an option, without it being enabled by default. Recommended only for sandboxes with no internet access.",
      () => true,
    )
    .addOption(
      new Option("--thinking <mode>", "Thinking mode: enabled (equivalent to adaptive), disabled")
        .choices(["enabled", "adaptive", "disabled"])
        .hideHelp(),
    )
    .addOption(
      new Option("--thinking-display <display>", "How thinking content appears in the response")
        .choices(THINKING_DISPLAY_MODES)
        .hideHelp(),
    )
    .addOption(
      new Option(
        "--max-thinking-tokens <tokens>",
        "[DEPRECATED. Use --thinking instead for newer models] Maximum number of thinking tokens (only works with --print)",
      )
        .argParser(parseNumberOption)
        .hideHelp(),
    )
    .addOption(
      new Option(
        "--max-turns <turns>",
        "Maximum number of agentic turns in non-interactive mode. This will early exit the conversation after the specified number of turns. (only works with --print)",
      )
        .argParser(parseNumberOption)
        .hideHelp(),
    )
    .addOption(
      new Option(
        "--max-budget-usd <amount>",
        "Maximum dollar amount to spend on API calls (only works with --print)",
      ).argParser((value) => {
        let amount = parsePositiveNumber(value);
        if (amount === undefined)
          throw new InvalidArgumentError("--max-budget-usd must be a positive number greater than 0");
        return amount;
      }),
    )
    .addOption(
      new Option("--task-budget <tokens>", "API-side task budget in tokens (output_config.task_budget)")
        .argParser((value) => {
          let tokens = parseNumberWithSeparators(value);
          if (isNaN(tokens) || tokens <= 0 || !Number.isInteger(tokens))
            throw new InvalidArgumentError("--task-budget must be a positive integer");
          return tokens;
        })
        .hideHelp(),
    )
    .option(
      "--replay-user-messages",
      "Re-emit user messages from stdin back on stdout for acknowledgment (only works with --input-format=stream-json and --output-format=stream-json)",
      () => true,
    )
    .addOption(
      new Option(
        "--prompt-suggestions [value]",
        "Enable prompt suggestions. In print/SDK mode, emits a prompt_suggestion message after each turn with a predicted next user prompt",
      )
        .choices(["true", "false", "1", "0", "yes", "no", "on", "off"])
        .preset("true")
        .argParser((h) => {
          if (!isEnvTruthy(h) && !isEnvDefinedFalsy(h))
            throw new InvalidArgumentError("Allowed choices are true, false, 1, 0, yes, no, on, off.");
          return !isEnvDefinedFalsy(h);
        }),
    )
    .addOption(
      new Option("--enable-auth-status", "Enable auth status messages in SDK mode").default(false).hideHelp(),
    )
    .option(
      "--allowedTools, --allowed-tools <tools...>",
      'Comma or space-separated list of tool names to allow (e.g. "Bash(git *) Edit")',
    )
    .option(
      "--tools <tools...>",
      'Specify the list of available tools from the built-in set. Use "" to disable all tools, "default" to use the default set, or specify tool names (e.g. "Bash,Edit,Read").',
    )
    .option(
      "--restricted",
      "Restricted mode: removes the built-in tools that run commands or code (Bash, PowerShell and the other code-running tools) and WebFetch unless --tools names them, and ignores user, project and local settings files (managed settings and --settings still apply; add --strict-mcp-config to skip MCP servers too). Also confines the file tools to the working directories (--add-dir included), refuses bypassPermissions, and lets only a person or the configured permission handler approve writes to settings, git and tool-configuration files.",
    )
    .option(
      "--disallowedTools, --disallowed-tools <tools...>",
      'Comma or space-separated list of tool names to deny (e.g. "Bash(git *) Edit")',
    )
    .option("--mcp-config <configs...>", "Load MCP servers from JSON files or strings (space-separated)")
    .addOption(
      new Option(
        "--permission-prompt-tool <tool>",
        "MCP tool to use for permission prompts (only works with --print)",
      )
        .argParser(String)
        .hideHelp(),
    )
    .addOption(
      new Option(
        "--permission-prompts <target>",
        'Who answers permission prompts with --print: "host" (the SDK host or --permission-prompt-tool) or "none" (nobody: anything that would prompt is denied automatically; the permission mode still decides everything else)',
      )
        .choices(PERMISSION_PROMPT_HOST_KINDS)
        .default("host"),
    )
    .addOption(
      new Option("--system-prompt <prompt>", "System prompt to use for the session").argParser(String),
    )
    .addOption(
      new Option("--system-prompt-file <file>", "Read system prompt from a file")
        .argParser(String)
        .hideHelp(),
    )
    .addOption(
      new Option(
        "--append-system-prompt <prompt>",
        "Append a system prompt to the default system prompt",
      ).argParser(String),
    )
    .addOption(
      new Option(
        "--append-system-prompt-file <file>",
        "Read system prompt from a file and append to the default system prompt",
      )
        .argParser(String)
        .hideHelp(),
    )
    .addOption(
      new Option(
        "--system-prompt-snapshot <on|off>",
        "Record the system prompt once per conversation and reuse it verbatim on every request and resume. on (the default, except under --bare outside cloud and background sessions): the prompt is rendered on the conversation's first request \u2014 a --system-prompt or --append-system-prompt included \u2014 sent, and recorded; every later request and resume sends the record as-is, even when a later launch passes different text, until the conversation is compacted. off: never record; the prompt is rendered fresh every request (for iterating on prompt text).",
      )
        .choices(["on", "off"])
        .argParser((h) => {
          if (h !== "on" && h !== "off") throw new InvalidArgumentError("Allowed choices are on, off.");
          return h === "on";
        }),
    )
    .addOption(
      new Option(
        "--append-subagent-system-prompt <prompt>",
        "Append a system prompt to every Task-tool subagent's system prompt, propagated to nested subagents (only works with --print). Implies CLAUDE_CODE_ENABLE_APPEND_SUBAGENT_PROMPT=1.",
      )
        .argParser(String)
        .hideHelp(),
    )
    .addOption(
      new Option(
        "--append-subagent-system-prompt-file <file>",
        "Read a system prompt from a file and append it to every Task-tool subagent's system prompt (only works with --print)",
      )
        .argParser(String)
        .hideHelp(),
    )
    .addOption(
      new Option(
        "--plan-mode-instructions <instructions>",
        "Custom workflow body for plan mode. Replaces the default code-implementation phases in the plan-mode system reminder; the read-only enforcement preamble and ExitPlanMode protocol footer are always kept.",
      )
        .argParser(String)
        .hideHelp(),
    )
    .addOption(
      new Option(
        "--exclude-dynamic-system-prompt-sections",
        "Move per-machine sections (cwd, env info, memory paths, git status) from the system prompt into the first user message. Improves cross-user prompt-cache reuse. Only applies with the default system prompt (ignored with --system-prompt).",
      ).default(false),
    )
    .addOption(
      new Option("--permission-mode <mode>", "Permission mode to use for the session")
        .choices(mapped)
        .argParser(parsePermissionModeOption),
    )
    .addOption(
      new Option(
        "--inherit-permission-mode <mode>",
        "Permission mode carried from a parent session, used only when nothing else configures one",
      )
        .argParser(parsePermissionModeOption)
        .hideHelp(),
    )
    .option("-c, --continue", "Continue the most recent conversation in the current directory", () => true)
    .option(
      "-r, --resume [value]",
      "Resume a conversation by session ID or name, or open interactive picker with optional search term",
      (current) => current || true,
    )
    .option(
      "--fork-session",
      "When resuming, create a new session ID instead of reusing the original (use with --resume or --continue)",
      () => true,
    )
    .addOption(
      new Option(
        "--watch-artifact <artifact>",
        "Watch a Claude artifact (id or URL) in this session and hear about new versions and comments",
      ).hideHelp(),
    )
    .addOption(new Option("--watch-artifact-no-autoreact <artifact>").hideHelp())
    .addOption(
      new Option("--prefill <text>", "Pre-fill the prompt input with text without submitting it").hideHelp(),
    )
    .addOption(
      new Option("--deep-link-origin", "Signal that this session was launched from a deep link").hideHelp(),
    )
    .addOption(
      new Option(
        "--deep-link-repo <slug>",
        "Repo slug the deep link ?repo= parameter resolved to the current cwd",
      ).hideHelp(),
    )
    .addOption(
      new Option(
        "--deep-link-last-fetch <ms>",
        "FETCH_HEAD mtime in epoch ms, precomputed by the deep link trampoline",
      )
        .argParser((mod) => {
          let remoteCommands = Number(mod);
          return Number.isFinite(remoteCommands) ? remoteCommands : undefined;
        })
        .hideHelp(),
    )
    .addOption(
      new Option(
        "--prefill-b64 <b64>",
        "Base64url-encoded --prefill value (deep-link shell-safe launch paths)",
      )
        .argParser((h) => Buffer.from(h, "base64url").toString("utf8"))
        .hideHelp(),
    )
    .addOption(
      new Option(
        "--deep-link-cwd-b64 <b64>",
        "Base64url-encoded working directory (deep-link shell-safe launch paths)",
      )
        .argParser((value) => Buffer.from(value, "base64url").toString("utf8"))
        .hideHelp(),
    )
    .option(
      "--from-pr [value]",
      "Resume a session linked to a PR by PR number/URL, or open interactive picker with optional search term",
      (value) => value || true,
    )
    .option(
      "--no-session-persistence",
      "Disable session persistence - sessions will not be saved to disk and cannot be resumed (only works with --print)",
    )
    .addOption(
      new Option(
        "--resume-session-at <message id>",
        "When resuming, only messages up to and including the chain entry with <message.id> \u2014 any chain-entry UUID, typically the kept turn's last entry (use with --resume in print mode)",
      )
        .argParser(String)
        .hideHelp(),
    )
    .addOption(
      new Option(
        "--resume-drops-turn <message id>",
        "With --resume-session-at in print mode: declare the prompt uuid of the turn the truncating resume intends to discard; the resume is refused if the discarded range contains anything not attributable to that turn (absorbed queued messages, task notifications, content from other turns). Ignored outside print mode, like --resume-session-at.",
      )
        .argParser(String)
        .hideHelp(),
    )
    .addOption(
      new Option(
        "--reply-on-resume",
        "When resuming, immediately query if the loaded transcript ends in a user-role message (set by /background mid-turn so the fork continues the in-flight turn).",
      ).hideHelp(),
    )
    .addOption(
      new Option(
        "--rewind-files <user-message-id>",
        "Restore files to state at the specified user message and exit (requires --resume)",
      ).hideHelp(),
    )
    .option(
      "--model <model>",
      "Model for the current session. Provide an alias for the latest model (e.g. 'fable', 'opus', or 'sonnet') or a model's full name.",
    )
    .addOption(
      new Option(
        "--include-unsupported-models",
        "Offer models your account can use that this version of Claude Code does not know",
      ).hideHelp(),
    )
    .addOption(
      new Option(
        "--effort <level>",
        `Effort level for the current session (${EFFORT_LEVELS.join(", ")})`,
      ).argParser((h) => {
        let { level, warning } = parseEffortFlag(h);
        if (warning !== undefined)
          warnStartupIssues(warning, {
            stderrPrefix: "Warning: ",
          });
        return level;
      }),
    )
    .addOption(
      new Option("--fast-mode <on|off>")
        .argParser((name) => (name === "on" || name === "off" ? name : undefined))
        .hideHelp(),
    )
    .option("--agent <agent>", "Agent for the current session. Overrides the 'agent' setting.")
    .option("--betas <betas...>", "Beta headers to include in API requests (API key users only)")
    .option(
      "--fallback-model <model>",
      "Enable automatic fallback to specified model(s) when the default model is overloaded or not available. Accepts a comma-separated list to try each in order. Re-tries the primary at the start of each user turn.",
    )
    .addOption(
      new Option(
        "--workload <tag>",
        "Workload tag for billing-header attribution (cc_workload). Process-scoped; set by SDK daemon callers that spawn subprocesses for cron work. (only works with --print)",
      ).hideHelp(),
    )
    .option(
      "--settings <file-or-json>",
      "Path to a settings JSON file or a JSON string to load additional settings from",
    )
    .addOption(
      new Option(
        "--client-data-url <url>",
        "URL for a signed configuration document. Claude Code exits if it cannot load it, or if it has no entry for the selected model and --allow-other-models is not set. Setting CLAUDE_CODE_CLIENT_DATA_URL instead keeps the URL out of the process list",
      ).hideHelp(),
    )
    .addOption(
      new Option(
        "--allow-other-models",
        "With --client-data-url: start on a model the document has no entry for, applying none of its per-model client data, instead of exiting. CLAUDE_CODE_ALLOW_OTHER_MODELS=1 does the same",
      ).hideHelp(),
    )
    .addOption(
      new Option(
        "--managed-settings <json>",
        "Policy-tier settings JSON from a spawning parent process (SDK use only)",
      ).hideHelp(),
    )
    .addOption(
      new Option(
        "--host-auth-is-org-sign-in",
        "The ANTHROPIC_AUTH_TOKEN this host manages is an Anthropic organization sign-in that it obtained itself (desktop hosts only)",
      ).hideHelp(),
    )
    .option("--add-dir <directories...>", "Additional directories to allow tool access to")
    .addOption(
      new Option(
        "--project-config-root <dir>",
        "Read project settings, .mcp.json and the .claude config trees (commands, agents, skills, workflows, routines, output-styles; --routine is refused with this flag) from this directory rather than the working directory (for a session a host starts in a worktree of it)",
      ).hideHelp(),
    )
    .option(
      "--ide",
      "Automatically connect to IDE on startup if exactly one valid IDE is available",
      () => true,
    )
    .option(
      "--desktop",
      "Open in the Claude Desktop app instead of the terminal (with --continue or --resume <id> to pick the session)",
      () => true,
    )
    .option(
      "--strict-mcp-config",
      "Only use MCP servers from --mcp-config, ignoring all other MCP configurations",
      () => true,
    )
    .option("--session-id <uuid>", "Use a specific session ID for the conversation (must be a valid UUID)")
    .option(
      "-n, --name <name>",
      "Set a display name for this session (shown in the prompt box, /resume picker, and terminal title)",
    )
    .option(
      "--agents <json-or-file>",
      `JSON object defining custom agents, or with --print the path to a file that holds one (e.g. '{"reviewer": {"description": "Reviews code", "prompt": "You are a code reviewer"}}')`,
    )
    .option(
      "--setting-sources <sources>",
      "Comma-separated list of setting sources to load (user, project, local).",
    )
    .option(
      "--plugin-dir <path>",
      "Load a plugin from a directory or .zip for this session only; a folder of plugins loads each child (repeatable: --plugin-dir A --plugin-dir B.zip)",
      (ccUrl, opts) => [...opts, ccUrl],
      [],
    )
    .addOption(
      new Option(
        "--plugin-dir-no-mcp <path>",
        "Like --plugin-dir but the engine will not read this plugin's .mcp.json (caller owns its MCP connections)",
      )
        .argParser((manifestPath, options) => [...options, manifestPath])
        .default([])
        .hideHelp(),
    )
    .option(
      "--plugin-url <url>",
      "Fetch a plugin .zip from a URL for this session only (repeatable: --plugin-url A --plugin-url B)",
      (source, options) => [...options, ...source.split(/\s+/).filter(Boolean)],
      [],
    )
    .option("--disable-slash-commands", "Disable all skills and commands", () => true)
    .option("--chrome", "Enable Claude in Chrome integration")
    .option("--no-chrome", "Disable Claude in Chrome integration")
    .option(
      "--file <specs...>",
      "File resources to download at startup. Format: file_id:relative_path (e.g., --file file_abc:doc.txt file_def:img.png)",
    );
  let A = () => n;
  E.action(async (name, options) => {
    let L = foldRestricted(options, isRestrictedSession());
    if (L.desktop) {
      let { launchDesktopFromCli } = await import("./chunk-wgcp7px2.js");
      return exitAfterAnalyticsFlush(
        await launchDesktopFromCli({
          continue: !!L.continue,
          resume: L.resume,
          nonInteractive: getIsNonInteractiveSession(),
          suppliedOptions: getCliSuppliedOptions(program),
          prompt: name,
          pipedStdin: !process.stdin.isTTY,
          pendingConnect: Boolean(e.pendingConnect?.url),
          pendingSsh: Boolean(e.pendingSSH?.host),
          storageV5: s,
        }),
      );
    }
    let session = await prepareSession(name, L, program, A, e.pendingConnect, e.pendingSSH, e, s, S);
    if (session.kind === "exited") return;
    if (session.kind === "prepared-headless")
      return runPreparedHeadless(session, L, e.openLiveBackgroundSessionForResume);
    if (!e.runInteractiveSession)
      return cliError("Interactive session requires the runInteractiveSession capability");
    return e.runInteractiveSession(session, L);
  }).version(
    `${
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
      }.VERSION
    } (Claude Code)${getBuildRefSuffix()}`,
    "-v, --version",
    "Output the version number",
  );
  program.option(
    "-w, --worktree [name]",
    "Create a new git worktree for this session (optionally specify a name)",
  );
  program.option(
    "--tmux",
    "Create a tmux session for the worktree (requires --worktree). Uses iTerm2 native panes when available; use --tmux=classic for traditional tmux.",
  );
  program.addOption(
    new Option(
      "--advisor <model>",
      "Enable the server-side advisor tool with the specified model (alias or full ID).",
    ).hideHelp(),
  );
  program.addOption(
    new Option(
      "--autocompact <auto|tokens>",
      "Auto-compact window size (auto, or 100k\u20131M tokens)",
    ).argParser((options) => {
      let maybeSessionId = parseWindowArgument(options);
      if (maybeSessionId === undefined)
        throw new InvalidArgumentError(
          "It must be 'auto', or between 100k and 1M (e.g. 500k, 200000, or 200 as shorthand)",
        );
      return maybeSessionId;
    }),
  );
  program.addOption(new Option("--enable-auto-mode", "(deprecated) Opt in to auto mode").hideHelp());
  {
    let h = new Option("--proactivity <level>", undefined).choices(PROACTIVITY_MODES);
    program.addOption(alwaysFalse_2() ? h : h.hideHelp());
  }
  program.addOption(new Option("--agents-view-if-allowed").hideHelp());
  program.addOption(
    new Option(
      "--bg, --background",
      "Start the session in the background and return immediately. Prints the id that `claude attach`, `logs`, `stop` and `rm` take; `claude agents` lists them. With --resume <session-id>, continues that session in the background under the same ID, or starts a copy and says so when the session is already running",
    ),
  );
  {
    let h = new Option(
      "--messaging-socket-path <path>",
      "Cross-session messaging server path: a Unix domain socket on Mac/Linux, a \\\\.\\pipe\\ name on Windows (defaults to an auto-generated path)",
    );
    h.hideHelp();
    program.addOption(h);
  }
  program.addOption(new Option("--brief", "Enable SendUserMessage tool for agent-to-user communication"));
  program.addOption(
    new Option(
      "--ax-screen-reader",
      "Render screen-reader friendly output (flat text, no decorative borders or animations).",
    ),
  );
  program.addOption(
    new Option(
      "--channels <servers...>",
      "MCP servers whose channel notifications (inbound push) should register this session. Space-separated server names.",
    ).hideHelp(),
  );
  program.addOption(
    new Option(
      "--dangerously-load-development-channels <servers...>",
      "Load channel servers not on the approved allowlist. For local channel development only. Shows a confirmation dialog at startup.",
    ).hideHelp(),
  );
  program.addOption(new Option("--agent-id <id>", "Teammate agent ID").hideHelp());
  program.addOption(new Option("--agent-name <name>", "Teammate display name").hideHelp());
  program.addOption(new Option("--team-name <name>", "Team name for teammate coordination").hideHelp());
  program.addOption(new Option("--agent-color <color>", "Teammate UI color").hideHelp());
  program.addOption(new Option("--plan-mode-required", "Require plan mode before implementation").hideHelp());
  program.addOption(
    new Option("--parent-session-id <id>", "Parent session ID for analytics correlation").hideHelp(),
  );
  program.addOption(
    new Option("--teammate-mode <mode>", 'How to spawn teammates: "tmux", "iterm2", "in-process", or "auto"')
      .choices(["auto", "tmux", "iterm2", "in-process"])
      .hideHelp(),
  );
  program.addOption(new Option("--agent-type <type>", "Custom agent type for this teammate").hideHelp());
  program.addOption(
    new Option(
      "--sdk-url <url>",
      "Use remote WebSocket endpoint for SDK I/O streaming (only with -p and stream-json format)",
    ).hideHelp(),
  );
  let M = false;
  program.addOption(
    new Option("--runner-declares <names>").hideHelp().argParser((logId) => {
      if (
        !M &&
        isByocEnvironment() &&
        !hasRunnerDeclaredNestedRepoDiff() &&
        logId.split(",").includes(DECLARES_DIFF_FINDS_NESTED_REPOSITORY)
      ) {
        M = true;
        process.stderr.write(`${FIRST_ARG_NOT_FORWARDED_TEXT}
`);
      }
      return logId;
    }),
  );
  program.addOption(
    new Option(
      "--session-began-as-copy <value>",
      "Sent by the server. 1 means that the session began as a copy of another, so --resume in print mode does not continue the last turn of the session it was copied from, and does not run a tool call that a hook deferred in it; any other value is ignored. Means the same as CLAUDE_CODE_SESSION_BEGAN_AS_COPY=1; either one is enough.",
    ).hideHelp(),
  );
  program.addOption(
    new Option("--teleport [session]", "Resume a teleport session, optionally specify session ID"),
  );
  program.addOption(
    new Option(
      "--cloud [description|session_id|url]",
      "Create a cloud session with the given description, or attach to an existing one by session ID or claude.ai/code URL",
    ),
  );
  program.addOption(
    new Option(
      "--forward-home-settings <true|false>",
      "Whether this launch sends this machine's settings (CLAUDE.md, rules, output styles, preferences, portable permission rules) into the cloud session it creates or attaches to: false = not this launch; true = yes for this launch, standing in for the machine's stored choice (not saved). Requires --cloud or --environment.",
    )
      .choices(["true", "false", "1", "0"])
      .hideHelp(),
  );
  program.addOption(
    new Option("--remote [description|session_id|url]", "Deprecated alias for --cloud").hideHelp(),
  );
  program.addOption(
    new Option(
      "--attach-serve <session_id>",
      "Attach a serve-only helper to a bound cloud session (spawned by the desktop app; not for interactive use).",
    ).hideHelp(),
  );
  program.addOption(
    new Option(
      "--environment <environment_id>",
      "Create a new cloud session that runs on the given self-hosted environment (ccpool_...).",
    ),
  );
  program.addOption(new Option("--pool <pool_id>", "Deprecated alias for --environment").hideHelp());
  program.addOption(
    new Option(
      "--correlation-id <id>",
      "Opaque id echoed back to the environment orchestrator on the work order (requires --environment).",
    ).hideHelp(),
  );
  program.addOption(
    new Option(
      "--ref <ref>",
      "Branch, tag, or SHA to check out in the remote session; defaults to local current branch. Requires --cloud or --environment.",
    ).hideHelp(),
  );
  program.addOption(
    new Option(
      "--on-branch <branch>",
      "Work directly on <branch> in the remote session (checkout and push to it). On self-hosted environments this includes pushing to the default branch when it is not protected \u2014 use GitHub branch protection to restrict. Mutually exclusive with --ref. Requires --cloud or --environment.",
    ).hideHelp(),
  );
  program.addOption(
    new Option(
      "--remote-control [name]",
      "Start an interactive session with Remote Control enabled (optionally named)",
    ).argParser((number) => number || true),
  );
  program.addOption(
    new Option("--rc [name]", "Alias for --remote-control").argParser((opts) => opts || true).hideHelp(),
  );
  program.option(
    "--remote-control-session-name-prefix <prefix>",
    "Prefix for auto-generated Remote Control session names (default: hostname)",
  );
  profileCheckpoint("run_main_options_built");
  return {
    program,
    rootCommand: E,
    withStorageV5,
    withStartupHandles,
  };
}
//@ chunk-qg4qg94n.js:918-1044 facade-majority
function compactJsonForTypedTransport(e) {
  return jsonStringify(e).replace(
    /[\u007f-\u009f]/g,
    (r) => "\\u" + r.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0"),
  );
}
//@ chunk-qg4qg94n.js:1044-1909 facade-majority = loadSettingsFromFlag (0.517)
/**
 * 处理 --settings：JSON 字符串写入按内容哈希命名的临时文件，否则解析路径；记录为 flagSettings 来源。
 */
function loadSettingsFromFlag(settingsFile) {
  try {
    let trimmedSettings = settingsFile.trim();
    let looksLikeJson = trimmedSettings.startsWith("{") && trimmedSettings.endsWith("}");
    let settingsPath;
    if (looksLikeJson) {
      let parsedJson = safeParseJSON(trimmedSettings);
      if (!parsedJson) return cliError("Error: Invalid JSON provided to --settings");
      let s = compactJsonForTypedTransport(parsedJson);
      settingsPath = generateTempFilePath("claude-settings", ".json", {
        contentHash: s,
      });
      setFlagSettingsExpectedContent(s);
    } else {
      let o = settingsFile;
      let s = settingsFile;
      let f;
      try {
        if (isInClaudeConfigHome(settingsFile)) {
          o = safeResolvePath(getFsImplementation(), settingsFile).resolvedPath;
          s = o;
        } else {
          let n = vetRepoSettingsPath(getFsImplementation(), settingsFile);
          o = n.resolvedPath;
          s = canonicalizePathCase(n.linksResolvedPath ?? n.resolvedPath);
        }
        f = readFileSync(o, MAX_SETTINGS_JSON_BYTES);
      } catch (error) {
        if (isSymlinkToNetworkPathError(error))
          return cliError(`Error: Cannot use settings file ${settingsFile}: ${errorMessage(error)}`);
        if (isENOENT(error)) return cliError(`Error: Settings file not found: ${o}`);
        if (getErrnoCode(error) === "ERR_FILE_TOO_LARGE")
          return cliError(
            `Error: Settings file exceeds the ${MAX_SETTINGS_JSON_BYTES / 1048576}MiB limit: ${o}`,
          );
        if (isNotRegularFileError(error) || isEISDIR(error))
          return cliError(`Error: Cannot use settings file (${errorMessage(error)}): ${o}`);
        throw error;
      }
      settingsPath = s;
      setFlagSettingsFilePinnedContent(f);
    }
    setFlagSettingsPath(settingsPath);
    invalidateCommandNames();
  } catch (error) {
    if (error instanceof Error)
      logForDebugging(`Error processing --settings: ${errorMessage(error)}`, {
        level: "error",
      });
    return cliError(`Error processing settings: ${errorMessage(error)}`);
  }
}
//@ chunk-qg4qg94n.js:1909-2114 facade-majority
/**
 * 处理 --managed-settings（SDK 父进程传入的策略层 JSON）：解析 tier/organization，非法时只告警。
 */
function loadManagedSettingsFromFlag(settingSourcesArg) {
  let r = safeParseJSON(settingSourcesArg.trim(), false);
  if (!isPlainObject(r)) {
    logForDebugging("--managed-settings ignored: invalid JSON object", {
      level: "warn",
    });
    setParentManagedSettingsInvalid(true);
    return;
  }
  let { tier, organization, memberLost } = splitTierOrganization(r);
  if (memberLost) setParentManagedSettingsInvalid(true);
  setParentManagedSettings(tier, organization);
  invalidateCommandNames();
}
//@ chunk-qg4qg94n.js:2114-2307 fingerprint = loadSettingSourcesFromFlag (0.541)
/**
 * 处理 --setting-sources（user,project,local）并重置设置缓存；非法值退出。
 */
function loadSettingSourcesFromFlag(settingSourcesArg) {
  try {
    let sources = parseSettingSourcesFlag(settingSourcesArg);
    setAllowedSettingSources(sources);
    invalidateCommandNames();
  } catch (error) {
    if (error instanceof Error)
      logForDebugging(`Invalid --setting-sources flag: ${errorMessage(error)}`, {
        level: "error",
      });
    return cliError(`Error processing --setting-sources: ${errorMessage(error)}`);
  }
}
//@ chunk-qg4qg94n.js:2307-2537 facade-majority = eagerLoadSettings (0.675)
/**
 * 在 commander 解析前预读 --settings、--managed-settings 与 --setting-sources，记录 settings_load_ms。
 */
function eagerLoadSettings() {
  let startTime = performance.now();
  profileCheckpoint("eagerLoadSettings_start");
  let settingsFile = eagerParseCliFlag("--settings");
  if (settingsFile) loadSettingsFromFlag(settingsFile);
  let settingSourcesArg = eagerParseCliFlag("--managed-settings");
  if (settingSourcesArg) loadManagedSettingsFromFlag(settingSourcesArg);
  applySettingSourcesFlagFromArgv();
  applyFastModeFlag();
  profileCheckpoint("eagerLoadSettings_end");
  recordPhase("settings_load_ms", performance.now() - startTime, startTime);
}
//@ chunk-qg4qg94n.js:2537-2645 layout
function applyFastModeFlag() {
  let e = eagerParseCliFlag("--fast-mode");
  if (e !== "on" && e !== "off") return;
  setFlagSettingsInline({
    ...(getFlagSettingsInline() ?? {}),
    fastMode: e === "on",
  });
  invalidateCommandNames();
}
//@ chunk-qg4qg94n.js:2645-2815 facade-majority
function applySettingSourcesFlagFromArgv() {
  let settingSourcesArg = eagerParseCliFlag("--setting-sources");
  if (settingSourcesArg !== undefined) loadSettingSourcesFromFlag(settingSourcesArg);
  if (eagerHasCliFlag("--restricted") || isRestrictedMode()) {
    loadSettingSourcesFromFlag("");
    setRestrictedSession(true);
  }
  if (usesSessionAccessToken()) loadSettingSourcesFromFlag("");
  if (isApplyProjectSettingsCommand()) {
    setAllowedSettingSources(
      getAllowedSettingSourcesAsConfigured().filter((r) => !REPO_DIR_SETTING_SOURCES.has(r)),
    );
    invalidateCommandNames();
  }
}
//@ chunk-qg4qg94n.js:2815-2930 sole-consumer
function canonicalizePathCase(e) {
  if (isUntouchableSpelling(e)) return e;
  try {
    let r = realpathExaminedSync(getFsImplementation(), e);
    return r.toLowerCase() === e.toLowerCase() ? r : e;
  } catch {
    return e;
  }
}
//@ chunk-3wek6r2k.js:49686-49945 fingerprint = _pendingSSH (0.347)
function _pendingSSH(e) {
  let { model, effort, permissionMode } = e;
  return {
    ...e,
    model:
      typeof model === "string" &&
      !isModeDependentModelSetting(strip1mSuffix(model.trim().toLowerCase())) &&
      !isOpusFableAdvisorSetting(model)
        ? undefined
        : model,
    effort: typeof effort === "string" && parseEffortLevel(effort) !== undefined ? undefined : effort,
    permissionMode:
      typeof permissionMode === "string" && cloudPermissionModeFrom(permissionMode) !== undefined
        ? undefined
        : permissionMode,
  };
}
//@ chunk-3wek6r2k.js:95030-95105 fingerprint = logManagedSettings (0.424)
function logManagedSettings(policySettings) {
  let allKeys = getManagedSettingsKeysForLogging(policySettings);
  return {
    keyCount: allKeys.length,
    keys: fromSanitizer_SANITIZER_OUTPUT_ONLY(allKeys.join(",")),
  };
}
//@ chunk-3wek6r2k.js:96816-99424 fingerprint = logTenguInit (0.611)
/**
 * 发送 tengu_init 事件：入口、启动方式、-p/格式、工具白黑名单数、MCP 数、权限模式、思考配置、模型来源，以及仓库特征（Dockerfile、lockfile、CI 配置等）。
 */
async function logTenguInit({
  host,
  storageV5,
  credentials,
  onAntSandboxDetection,
  hasInitialPrompt,
  hasStdin,
  verbose,
  focusView,
  debug,
  print,
  outputFormat,
  inputFormat,
  numAllowedTools,
  numDisallowedTools,
  restricted,
  mcpClientCount,
  mcpListSizing,
  mcpConfigs,
  worktreeEnabled,
  skipWebFetchPreflight,
  githubActionInputs,
  dangerouslySkipPermissionsPassed,
  permissionMode,
  proactivityLevel,
  modeIsBypass,
  allowDangerouslySkipPermissionsPassed,
  skipDangerousModePromptSetPreDialog,
  systemPromptFlag,
  appendSystemPromptFlag,
  thinkingConfig,
  modelProvenance,
  runsLocalQueryLoop,
}) {
  let jt = waitForStartupWork(host, "tengu_init");
  try {
    let cwd = getNoFlickerEnvOverride();
    let Ve;
    let At;
    await jt;
    let we = {};
    let z = getProjectFactsForStartup().catch(() => null);
    let gitPresenceForAnalytics = await getGitPresenceForAnalytics();
    let x = (await withDeadline(z, PROJECT_FACTS_CACHE_TTL_MS)) ?? null;
    let rp = mcpConfigs === null ? null : mcpServerKindFlags(mcpConfigs);
    let Ee = null;
    if (runsLocalQueryLoop)
      try {
        Ee = getAutoModeAvailabilityForAnalytics();
      } catch (error) {
        logError(error);
      }
    let De = {
      entrypoint: lit("claude"),
      bootstrap_entry: fromEnum(getBootstrapEntry()),
      hasInitialPrompt,
      hasStdin,
      verbose,
      focusView,
      debug,
      debugToStderr: isDebugToStdErr(),
      print,
      outputFormat: fromEnum(outputFormat),
      inputFormat: fromEnum(inputFormat),
      numAllowedTools,
      numDisallowedTools,
      restricted,
      mcpClientCount,
      ...(runsLocalQueryLoop && mcpListSizing),
      ...(rp && {
        ...rp,
      }),
      worktree: worktreeEnabled,
      skipWebFetchPreflight,
      githubActionInputsPresent: githubActionInputs !== undefined,
      githubActionInputsLength: githubActionInputs?.length,
      dangerouslySkipPermissionsPassed,
      permissionMode: fromEnum(permissionMode),
      proactivityLevel: fromEnumOpt(proactivityLevel),
      modeIsBypass,
      inProtectedNamespace: isEvalBuild(),
      ...cooAttributes(),
      ...Ve,
      apiKeySource: fromEnum(
        getAnthropicApiKeyWithSourceSafe({
          skipRetrievingKeyFromApiKeyHelper: true,
        }).source,
      ),
      allowDangerouslySkipPermissionsPassed,
      thinkingType: fromEnum(thinkingConfig.type),
      ...(systemPromptFlag && {
        systemPromptFlag: fromEnum(systemPromptFlag),
      }),
      ...(appendSystemPromptFlag && {
        appendSystemPromptFlag: fromEnum(appendSystemPromptFlag),
      }),
      ...(cwd && {
        noFlickerEnvVar: fromEnum(cwd),
      }),
      rendererEntryPath: fromEnum(getFullscreenDecision()),
      ...screenReaderTelemetryFields(),
      ...configDirTelemetry(),
      ...we,
      is_simple: isBareMode() || undefined,
      is_safe_mode: isSafeMode() || undefined,
      extendedQuestions: getExtendedQuestionsEnabled() || undefined,
      is_coordinator: coordinatorModeModule.isCoordinatorMode() ? true : undefined,
      ...emptyObjectFactory(runsLocalQueryLoop),
      autoUpdatesChannel: fromEnum(getInitialSettings_2().autoUpdatesChannel ?? "latest"),
      ...modelProvenance,
      ...Ee,
      ...(gitPresenceForAnalytics && {
        is_git: gitPresenceForAnalytics.is_git,
        has_remote: gitPresenceForAnalytics.has_remote,
        remote_host_class: fromEnum(gitPresenceForAnalytics.remote_host_class),
      }),
      ...(x && {
        has_dockerfile: x.has_dockerfile,
        has_compose: x.has_compose,
        has_devcontainer: x.has_devcontainer,
        has_nix: x.has_nix,
        has_bazel: x.has_bazel,
        lockfile_family: fromEnum(x.lockfile_family),
        has_env_file: x.has_env_file,
        has_ci_config: x.has_ci_config,
        has_private_registry: x.has_private_registry,
        private_registry_host_class: fromEnum(x.private_registry_host_class),
        has_secrets_manager_refs: x.has_secrets_manager_refs,
        has_xcode_project: x.has_xcode_project,
        has_ios_app_project: x.has_ios_app_project ?? undefined,
        has_android_project: x.has_android_project,
        has_android_app_project: x.has_android_app_project,
        os_locked_toolchain: fromEnum(x.os_locked_toolchain),
      }),
    };
    logEvent("tengu_init", De);
    if (Ee !== null) {
      markAutoModeAvailability(host, Ee);
      onGrowthBookRefresh(() => reportAutoModeAvailabilityChange(host));
    }
  } catch (error) {
    logError(error);
  }
}
//@ chunk-3wek6r2k.js:99642-100256 fingerprint = extractTeammateOptions (0.922)
/**
 * 从 commander 选项中取出 teammate 相关隐藏参数（--agent-id/--agent-name/--team-name/--agent-color/--plan-mode-required/--parent-session-id/--teammate-mode/--agent-type）。
 */
function extractTeammateOptions(options) {
  if (typeof options !== "object" || options === null) return {};
  let opts = options;
  let teammateMode = opts.teammateMode;
  return {
    agentId: typeof opts.agentId === "string" ? opts.agentId : undefined,
    agentName: typeof opts.agentName === "string" ? opts.agentName : undefined,
    teamName: typeof opts.teamName === "string" ? opts.teamName : undefined,
    agentColor: typeof opts.agentColor === "string" ? opts.agentColor : undefined,
    planModeRequired: typeof opts.planModeRequired === "boolean" ? opts.planModeRequired : undefined,
    parentSessionId: typeof opts.parentSessionId === "string" ? opts.parentSessionId : undefined,
    teammateMode:
      teammateMode === "auto" ||
      teammateMode === "tmux" ||
      teammateMode === "iterm2" ||
      teammateMode === "in-process"
        ? teammateMode
        : undefined,
    agentType: typeof opts.agentType === "string" ? opts.agentType : undefined,
  };
}
//@ chunk-3wek6r2k.js:100256-100816 layout
/**
 * 首个位置参数像子命令名时（单词、无空格），按编辑距离提示“Did you mean claude X?”并退出 1。
 */
async function suggestUnknownSubcommand(e, o) {
  let flattened = o.commands
    .filter((command) => !("_hidden" in command && command._hidden))
    .flatMap((command) => [command.name(), ...command.aliases()]);
  let lower = e.toLowerCase();
  let u =
    lower !== e && flattened.includes(lower)
      ? lower
      : suggestClosestName(
          lower,
          flattened.map((name) => ({
            name,
          })),
        );
  if (!u) return;
  await logEventAsync("tengu_unknown_command_suggestion", {});
  process.stderr.write(
    [
      sequential.red(figures_default.cross) + ` unknown command "${e}"`,
      sequential.dim(`  ${_S.last} `) + "Did you mean " + sequential.bold(`claude ${u}`) + "?",
      "",
      sequential.dim("Run ") +
        sequential.dim.bold("claude --help") +
        sequential.dim(" to list commands, or ") +
        sequential.dim.bold(`claude -p "${e}"`) +
        sequential.dim(" to send as a prompt."),
      "",
    ].join(`
`),
  );
  await exitAfterAnalyticsFlush(1);
}
//@ chunk-3wek6r2k.js:100816-101033 fingerprint = prefetchSystemContextIfSafe (1)
/**
 * 非交互或已信任时预取系统上下文（git 状态等）；未信任时跳过（git 可能执行仓库里的钩子）。
 */
function prefetchSystemContextIfSafe(e, o) {
  if (getIsNonInteractiveSession()) {
    logForDiagnosticsNoPII("info", "prefetch_system_context_non_interactive");
    prefetchGitStatus(e);
    return;
  }
  if (checkHasTrustDialogAccepted()) {
    logForDiagnosticsNoPII("info", "prefetch_system_context_has_trust");
    prefetchGitStatus(e);
    refreshExampleCommands(o);
  } else logForDiagnosticsNoPII("info", "prefetch_system_context_skipped_no_trust");
}
//@ chunk-7dqf31r1.js:8456-9704 sole-consumer
/**
 * initializeEntrypoint 之后把一批进程环境写入 launchOptions（交互性、entrypoint、子会话、远端会话/容器 ID、桌面技能/连接器、Chrome 标签组等），并从 process.env 删除只该被读一次的变量。
 */
function initializeLaunchOptionsFromEnv(isNonInteractive) {
  initializeEntrypoint(isNonInteractive);
  let t = sessionShape();
  t.setInteractive(!isNonInteractive);
  t.setSpawnedByAttendedSession(env.CLAUDE_CODE_SESSION_ATTENDED);
  t.setEntrypoint(env.CLAUDE_CODE_ENTRYPOINT);
  t.setRemoteRelayMark(isSpawnedByServer());
  t.setChildSession(Boolean(env.CLAUDE_CODE_CHILD_SESSION));
  t.setHasRemoteSessionOrContainerId(
    Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID || env.CLAUDE_CODE_CONTAINER_ID),
  );
  t.setClaudecode(Boolean(env.CLAUDECODE));
  t.setCoworkFrameArtifacts(env.CLAUDE_CODE_COWORK_FRAME_ARTIFACTS);
  t.setHostScheduledRun(env.CLAUDE_CODE_HOST_SCHEDULED_RUN);
  t.setDesktopSkillSwitches(env.CLAUDE_CODE_DESKTOP_SKILL_SWITCHES);
  t.setHostUnattendedGrant(env.CLAUDE_CODE_REMOTE_TOOLS_HOST_ALLOWS_UNATTENDED);
  env.unset("CLAUDE_CODE_REMOTE_TOOLS_HOST_ALLOWS_UNATTENDED");
  t.setChromeTabGroupKey(env.CLAUDE_CODE_REMOTE_SESSION_ID ? env.CLAUDE_CHROME_TAB_GROUP_KEY : undefined);
  let o = isCoworkWithRemote() && Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID);
  t.setHostSkillCatalog(o ? env.CLAUDE_CODE_HOST_SKILL_CATALOG : undefined);
  env.unset("CLAUDE_CHROME_TAB_GROUP_KEY");
  if (o) env.unset(HOST_SKILL_CATALOG_ENV);
  let a = isTopHostSession();
  t.setDesktopSkillsPluginDir(a ? env.CLAUDE_CODE_DESKTOP_SKILLS_PLUGIN_DIR : undefined);
  if (a) env.unset("CLAUDE_CODE_DESKTOP_SKILLS_PLUGIN_DIR");
  let d = isHostSessionEntrypoint();
  t.setDesktopConnectorNames(d && env.CLAUDE_CODE_DESKTOP_CONNECTOR_NAMES);
  if (d) env.unset("CLAUDE_CODE_DESKTOP_CONNECTOR_NAMES");
}
//@ chunk-7dqf31r1.js:9704-10192 fingerprint = initializeEntrypoint (0.814)
/**
 * 推断 CLAUDE_CODE_ENTRYPOINT：已设置时规范化（local_agent→local-agent，非交互的 cli→sdk-cli）；mcp serve → mcp；CLAUDE_CODE_ACTION → claude-code-github-action；否则 cli 或 sdk-cli。
 */
function initializeEntrypoint(isNonInteractive) {
  if (env.CLAUDE_CODE_ENTRYPOINT) {
    if (env.CLAUDE_CODE_ENTRYPOINT === "local_agent") env.set("CLAUDE_CODE_ENTRYPOINT", "local-agent");
    if (env.CLAUDE_CODE_ENTRYPOINT === "cli" && isNonInteractive)
      env.set("CLAUDE_CODE_ENTRYPOINT", "sdk-cli");
    return;
  }
  let cliArgs = process.argv.slice(2);
  let mcpIndex = cliArgs.indexOf("mcp");
  if (mcpIndex !== -1 && cliArgs[mcpIndex + 1] === "serve") {
    env.set("CLAUDE_CODE_ENTRYPOINT", "mcp");
    return;
  }
  if (isEnvTruthy(env.CLAUDE_CODE_ACTION)) {
    env.set("CLAUDE_CODE_ENTRYPOINT", "claude-code-github-action");
    return;
  }
  env.set("CLAUDE_CODE_ENTRYPOINT", isNonInteractive ? "sdk-cli" : "cli");
}
//@ chunk-151tygw9.js:5908-7043 fingerprint = getInputPrompt (0.453)
/**
 * 读取初始提示：stdin 非 TTY 时读完 stdin（stream-json 输入返回流；超过上限报错退出），与位置参数拼接。
 */
async function getInputPrompt(prompt, inputFormat) {
  if (!process.stdin.isTTY && eagerFirstOperand() !== "mcp") {
    if (inputFormat === "stream-json")
      return Object.defineProperty(adoptStdinStream() ?? readStreamJsonStdin(), STDIN_MESSAGES_MARKER, {
        value: true,
      });
    let data = "";
    let onData = (chunk) => {
      if (data.length + chunk.length > STDIN_LIMITS) {
        process.stdin.off("data", onData);
        return cliError(
          `Error: piped stdin input exceeds ${STDIN_LIMITS / 1024 / 1024}MB. Pass large content as a file path in your prompt instead.`,
        );
      }
      data += chunk;
    };
    try {
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", onData);
    } catch (error) {
      process.stdin.off("data", onData);
      if (!isStdinUnusableError(error)) throw error;
      logForDebugging(`getInputPrompt: piped stdin unreadable: ${errorMessage(error)}`, {
        level: "error",
      });
      logError(
        Object.assign(Error("getInputPrompt: piped stdin unreadable"), {
          code: getErrnoCode(error),
        }),
      );
      cliWarn(
        `Warning: stdin is unreadable (${getErrnoCode(error)}), proceeding without piped input. ` +
          "If you piped input, it was not received \u2014 pass it as a prompt argument, or check that the process launching Claude Code wires stdin to a pipe or /dev/null.",
      );
      return prompt;
    }
    let timedOut = await peekForStdinData(process.stdin, 3000);
    process.stdin.off("data", onData);
    if (timedOut)
      cliWarn(
        "Warning: no stdin data received in 3s, proceeding without it. If piping from a slow command, redirect stdin explicitly: < /dev/null to skip, or wait longer.",
      );
    return [prompt, data].filter(Boolean).join(`
`);
  }
  return prompt;
}
//@ chunk-2am86wgd.js:228-383 placement
/**
 * 从层级记录中拆出组织字段
 */
function splitTierOrganization(e) {
  if (!Object.hasOwn(e, HOST_FREE_FORM_SETTINGS_KEY))
    return {
      tier: e,
      organization: null,
      memberLost: false,
    };
  let { [HOST_FREE_FORM_SETTINGS_KEY]: t, ...r } = e;
  return {
    tier: r,
    organization: null,
    memberLost: false,
  };
}
//@ chunk-e6aww6q8.js:2039698-2039771 fingerprint = resetCursor (0.689)
function resetCursor() {
  return Boolean(process.stdout.isTTY && process.stdin.isTTY);
}
export {
  logManagedSettings,
  prefetchSystemContextIfSafe,
  suggestUnknownSubcommand,
  extractTeammateOptions,
  getInputPrompt,
  logTenguInit,
  applySettingSourcesFlagFromArgv,
  _pendingSSH,
  compactJsonForTypedTransport,
  getPolicyMemoryFingerprint,
  runMigrations,
  resetCursor,
};
