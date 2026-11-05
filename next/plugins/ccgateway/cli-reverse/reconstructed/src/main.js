/**
 * main.tsx
 *
 * 并入已有模块：非交互/SDK 会话启动主流程（选项、云会话、输入输出）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/main.tsx
 * pieces: chunk-10j59z4a.js (1), chunk-405cd95w.js (1), chunk-5xgkngpb.js (1), chunk-80cq400a.js (8), chunk-9ys74nhz.js (2), chunk-h61dq9nz.js (17), chunk-hjswk319.js (5), chunk-nhaxap13.js (38)
 * attribution: placement 31, fingerprint 15, facade-majority 5, layout 15, sole-consumer 3, callgraph-witnessed 1, affinity 2, callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isAbsolute, basename } from "path";
import { realpath, opendir } from "fs/promises";
import { randomUUID } from "crypto";
import { sessionShape, isCoworkWithRemote, isTopHostSession } from "./utils/sessionShape.js";
import { env, isSpawnedByServer, declaredEnvVarNames, antEnv, udsEnv } from "./utils/env.js";
import { HOST_SKILL_CATALOG_ENV, isHostSessionEntrypoint } from "./utils/entrypointKinds.js";
import {
  isEnvTruthy,
  isRestrictedMode,
  isEvalBuild,
  isBareMode,
  isSafeMode,
  isSupervisedMode,
  parsePositiveNumber,
  parseNumberWithSeparators,
  isEnvDefinedFalsy,
  hasNodeOption,
} from "./utils/envUtils.js";
import {
  HOST_FREE_FORM_SETTINGS_KEY,
  parseSettingSourcesFlag,
  REPO_DIR_SETTING_SOURCES,
  EDITABLE_SETTING_SOURCES,
  isSettingSourceEnabled,
  getSettingSourceDisplayNameLowercase,
} from "./utils/settings/constants.js";
import { jsonStringify, alwaysTrue } from "./utils/slowOperations.js";
import { safeParseJSON } from "./utils/json.js";
import {
  cliError,
  cliWarn,
  exitAfterAnalyticsFlush,
  printCliError,
  cliErrorAfterAnalyticsFlush,
} from "./cli/exit.js";
import { generateTempFilePath } from "./utils/tempDir.js";
import {
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
  getIsNonInteractiveSession,
  setReplyGatePolicy,
  setLaunchReplyGatePolicyRefused,
  setPrintOutputFormat,
  getRootSession,
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
  setIsInteractive,
  setSessionStartType,
  setClientType,
  setQuestionPreviewFormat,
  setExtendedQuestionsEnabled,
  setQuestionOptionDescriptionsOptional,
  setSdkAgentProgressSummariesEnabled,
  setGatewayServerProcess,
  getIsRemoteMode,
  setOnboardingShownThisSession,
  getUserMsgOptIn,
  setIsRemoteMode,
  switchSession,
  setOriginalCwd,
  setTeleportedSessionInfo,
  getOriginalCwd,
} from "./bootstrap/state.js";
import { isInClaudeConfigHome } from "./utils/settings/settingsFileParsing.js";
import {
  safeResolvePath,
  getFsImplementation,
  vetRepoSettingsPath,
  isSymlinkToNetworkPathError,
  realpathExaminedSync,
  processChdir,
} from "./utils/fsOperations.js";
import { readFileSync, isNotRegularFileError } from "./utils/fileRead.js";
import {
  MAX_SETTINGS_JSON_BYTES,
  getManagedSettingsKeysForLogging,
  getInitialSettings,
  getSettingsForSourceForUpkeep,
  getSettingsForSource,
  getBasePolicySettings,
  getBasePolicySettingsOrigin,
  getPolicyHelperSourceLoadErrors,
  isForceRemoteSettingsRefreshConfigured,
  getSettingsFilePathForSource,
  getAutoModeConfig,
  getEffectiveSettingSource,
} from "./utils/settings/settings.js";
import {
  errorMessage,
  isENOENT,
  getErrnoCode,
  isEISDIR,
  toError,
  sanitizeErrorName,
  withTelemetryMessage,
  TeleportOperationError,
  sanitizedErrnoLowerForTelemetry,
} from "./utils/errors.js";
import { invalidateCommandNames } from "./utils/settings/commandSyncNames.js";
import {
  logForDebugging,
  isDebugToStdErr,
  setHasFormattedOutput,
  initDefaultDebugLog,
} from "./utils/debug.js";
import { isPlainObject } from "./utils/isPlainObject.js";
import { profileCheckpoint, getBootstrapEntry, profileReport } from "./utils/startupProfiler.js";
import {
  eagerParseCliFlag,
  eagerHasCliFlag,
  eagerFirstOperand,
  detectNonInteractiveLaunch,
  eagerFindCliArg,
  isConnectUrlArg,
  mayDispatchSubcommand,
} from "./utils/cliArgs.js";
import {
  recordPhase,
  markFlagFetchKick,
  recordSpawnToExec,
  wasWarmSpareClaimed,
  logStartupTiming,
} from "./utils/startupTiming.js";
import { usesSessionAccessToken, isReviewSession } from "./utils/sessionAccessToken.js";
import {
  isApplyProjectSettingsCommand,
  APPLY_PROJECT_SETTINGS,
  APPLY_PROJECT_SETTINGS_DESCRIPTION,
} from "./cli/handlers/applyProjectSettings.js";
import { isUntouchableSpelling } from "./utils/networkPaths.js";
import {
  adoptStdinStream,
  readStreamJsonStdin,
  STDIN_MESSAGES_MARKER,
  STDIN_LIMITS,
  startAwaitInitialize,
  awaitInitializeResult,
} from "./cli/startup/awaitInitialize.js";
import { isStdinUnusableError, peekForStdinData, writeOut } from "./utils/process.js";
import { logError, getLogDisplayTitle } from "./utils/log.js";
import {
  fromSanitizer_SANITIZER_OUTPUT_ONLY,
  lit,
  fromEnum,
  fromEnumOpt,
  fromEnumArr,
  agentTypeForAnalytics_GATE_EVALUATED,
} from "./services/analytics/safeMetadata.js";
import { waitForStartupWork, releaseStartupWork, holdForStartupWork } from "./cli/startup/startupWorkGate.js";
import {
  getNoFlickerEnvOverride,
  getFullscreenDecision,
  latchFullscreenTrialFromEnv,
} from "./utils/fullscreen.js";
import { getProjectFactsForStartup, PROJECT_FACTS_CACHE_TTL_MS } from "./utils/projectFacts.js";
import { getGitPresenceForAnalytics, getBranch, getIsGit, getWorktreeCount } from "./utils/git.js";
import { withDeadline } from "./utils/sleep.js";
import { mcpServerKindFlags } from "./services/mcp/mcpConfigProvenance.js";
import {
  getAutoModeAvailabilityForAnalytics,
  verifyAutoModeGateAccess,
  BYPASS_CONSENT_MESSAGE,
  BG_UNCONSENTED_BYPASS_CAPABILITY_NOTICE,
  getAutoModeUnavailableNotification,
  getStartupModeTelemetry,
  getAutoSeedFactors,
  resolveRemoteSessionMode,
  resolveSeedPermissionMode,
} from "./utils/permissions/permissionSetup.js";
import { cooAttributes } from "./utils/telemetry/cooAttributes.js";
import {
  getAnthropicApiKeyWithSourceSafe,
  isHostManagedProviderAuth,
  isGatewayLoginForced,
  getClaudeAIOAuthTokenOriginAsync,
  getAuthTokenSource,
  isClaudeAISubscriber,
  validateForceLoginOrg,
  rejudgeHostLaunchedGateway,
  getSubscriptionType,
  getStoredOauthAccountInfo,
} from "./utils/auth.js";
import { screenReaderTelemetryFields } from "./utils/accessibility/screenReader.js";
import { configDirTelemetry } from "./utils/configDirPathShape.js";
import {
  coordinatorModeModule,
  branchModeForTelemetry,
  startTurnInputPrefetches,
  startIdleStartupWork,
  logSessionTelemetry,
  judgeStartupGrowthBookKick,
  prepareSession,
  getTeammateUtils,
  maybeActivateBrief,
} from "./cli/startup/prepareSession.js";
import { codeModeTelemetryFields } from "./tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { logEvent, logEventAsync } from "./services/analytics/index.js";
import {
  markAutoModeAvailability,
  reportAutoModeAvailabilityChange,
  warnStartupIssues,
} from "./cli/startup/startupMisc.js";
import {
  onGrowthBookRefresh,
  initializeGrowthBook,
  resetUserData,
  refreshGrowthBookAfterAuthChange,
  getFeatureValue_CACHED_MAY_BE_STALE,
  hasFreshGrowthBookFeatures,
} from "./services/analytics/growthbook.js";
import { suggestClosestName } from "./utils/settings/managedEnvKeys.js";
import { sequential } from "./utils/sequential.js";
import { figures_default } from "../vendor/@inquirer/figures/dist/esm/index.js";
import { TREE_GLYPHS } from "../vendor/chart.js/dist/chart.js";
import { logForDiagnosticsNoPII } from "./utils/diagLogs.js";
import { prefetchGitStatus } from "./context.js";
import {
  checkHasTrustDialogAccepted,
  getGlobalConfig,
  DEFAULT_GLOBAL_CONFIG,
  saveGlobalConfig,
  resetLocalSettingsGitTrackedCache,
  resolveExplicitRemoteControlAtStartup,
  isAutoUpdaterDisabled,
  CONFIG_SOURCE_LABELS,
  isWorkspacePersistedTrusted,
} from "./utils/config.js";
import { refreshExampleCommands } from "./utils/exampleCommands.js";
import { USER_INTENT_SETTING_KEYS, resolveSetting } from "./utils/settings/userIntentSettings.js";
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
import {
  gracefulShutdown,
  flushAnalyticsSinks,
  areShutdownHandlersInstalled,
  markStartupActionStarted,
  gracefulShutdownSync,
  claimShutdown,
  emitExitMessage,
} from "./utils/gracefulShutdown.js";
import { EXIT_CONFIG_ERROR } from "./utils/exitCodes.js";
import { getAPIProvider } from "./utils/model/providers.js";
import {
  getPreSettingsEnvSnapshot,
  applyConfigEnvironmentVariables,
  applySafeConfigEnvironmentVariables,
} from "./utils/managedEnvApply.js";
import { parseReplyGatePolicy, replyGatePolicyIgnoredLine } from "./bridge/projectsReplyEvaluation.js";
import {
  logFeatureSad,
  logFeatureOk,
  logFeatureBadAsync,
  logFeatureBad,
} from "./services/analytics/featureTelemetry.js";
import { logReplyGatePolicy } from "./query/toolDrain.js";
import { createReplMessageQueue } from "./replSessionSeat.js";
import { flushDeferredProblems } from "./plugins/functionHooks/hooksModuleLoader.js";
import { warnIfSignInExpiring } from "./utils/auth/credentialExpiry.js";
import { settingsChangeDetector } from "./utils/settings/changeDetector.js";
import { initializeTelemetryAfterTrust, init } from "./entrypoints/init.js";
import {
  isViolinWoodEnabledCached,
  isDeviceIdentityEnabledCached,
  waitForOwnFlagFetch,
  isViolinWoodServedOn,
  isViolinWoodEnabled,
  isSettingsToCloudEnabled,
  canForwardHomeSettings,
} from "./services/analytics/violinGates.js";
import { configChangeBlocker, machineForcedRefresh } from "./utils/model/providerAttribution.js";
import { settleLauncherHostLogin, runStartupHooks } from "./cli/startup/launcherHostLogin.js";
import {
  sendOrgValidationRefusal,
  recordManagedSettingsRefusal,
  sendManagedSettingsRefusal,
} from "./cli/managedConfigRefusal.js";
import {
  waitForPolicyLimitsToLoad,
  getPolicyLimitsSignatureFacts,
  shouldAwaitPolicyLimitsOnStartup,
  loadPolicyLimits,
  refreshPolicyLimits,
} from "./services/policyLimits/PolicyLimitsClient.js";
import { cloudSessionsUnavailableReason } from "./services/cloudSessions/cloudSessionsPolicy.js";
import { logOrgPolicyDeniedAsync, logOrgPolicyDenied } from "./services/policyLimits/orgPolicyDeniedEvent.js";
import {
  fetchSession,
  sendEventToRemoteSession,
  ensureConsoleProfileCloudSessionsCredential,
  prepareApiRequest,
  sessionsApiAccessTokenNow,
  deviceBridgeAccessToken,
  recoverSessionsApiBearer,
} from "./utils/teleport/api.js";
import { reportSignerLoadFailure } from "./utils/telemetry/clientEventUploader.js";
import { getRemoteSessionUrl } from "./constants/product.js";
import { environmentFlagErrorPrefix } from "./cli/cloudSessionArgs.js";
import { disallowedToolsTelemetry } from "./cli/cloudSession/hostedSessionRestrictions.js";
import { unclosedParenError } from "./utils/permissions/disallowedToolsFlag.js";
import { cloudPermissionModeFrom, CLOUD_SESSION_OPTION_KEYS } from "./cli/cloudSession/launchFlags.js";
import {
  teleportToRemote,
  cloudCreateRefusal,
  teleportToRemoteWithErrorHandling,
  checkOutTeleportedSessionBranch,
  processMessagesForTeleportResume,
  validateSessionRepository,
  formatRepoMismatchDisplay,
  handleTeleportPrerequisites,
} from "./utils/teleport.js";
import { credentialsStoreFor } from "./utils/secureStorage/credentialsFileStore.js";
import { shortHash } from "./utils/shortHash.js";
import { toCompatSessionId_2 } from "./bridge/bridgeHostState.js";
import { isSessionTracingEnabled } from "./utils/telemetry/sessionTracing.js";
import { startupModelWinsOverSessionRestore, processResumedConversation } from "./utils/sessionRestore.js";
import { getModelDeprecationWarning, getDeprecationNotice } from "./utils/model/deprecation.js";
import { writeStartupFailureResult } from "./cli/startupFailureResult.js";
import { getNonInteractiveCommands } from "./utils/commandPredicates.js";
import { getDefaultAppState_2, EMPTY_PROJECTS_SELF_IDENTITY } from "./state/AppStateStore.js";
import {
  createSessionEffortState,
  isUltracodeEnabled,
  EFFORT_LEVELS,
  parseEffortFlag,
  resolveEffortLevel,
} from "./utils/effort.js";
import { isFastModeEnabled, isFastModeSettingActive } from "./utils/fastMode.js";
import { isAdvisorToolEnabled } from "./utils/advisor.js";
import {
  isPromptSuggestionSettingEnabled,
  shouldEnablePromptSuggestion,
} from "./services/PromptSuggestion/promptSuggestion.js";
import { SessionStateTracker } from "./utils/sessionState.js";
import { createStore } from "./state/store.js";
import { onAppStateChange } from "./state/onChangeAppState.js";
import { syncSessionPermissionMode } from "./services/api/sessionFlags.js";
import { registerCleanup, isCleanupStarted } from "./utils/cleanupRegistry.js";
import { hasPendingHandoff } from "./tasks/exitHandoff.js";
import { resetRefusalFallbackOnSwitch } from "./utils/model/refusalFallback.js";
import { EVENT_LOGGING_FLAG_WAIT_MS, didStartGrowthBookKick } from "./utils/startupFlagWait.js";
import { filterObject, platformOrOther } from "./services/analytics/metadata.js";
import { isNonReservedStdioConfig } from "./services/mcp/utils.js";
import {
  MCP_CONNECT_PHASES,
  shouldJoinBeforeInput,
  connectMcpConfigServers,
} from "./services/mcp/connectionBatch.js";
import { installStartupMcpHeaders } from "./services/mcp/startupMcpHeaders.js";
import { shouldPrefetchUserContext, unavailableReason } from "./cli/startup/sessionLaunchOptions.js";
import {
  isNoPromptHost,
  NONE,
  PERMISSION_PROMPT_HOST_KINDS,
} from "./utils/permissions/permissionPromptHost.js";
import { omitExcludedOrPluginDisabled, shouldAskLauncherHostLogin } from "./cli/launcherHostLogin.js";
import { getAddDirEnabledPlugins } from "./utils/plugins/addDirPluginSettings.js";
import {
  POLICY_HELPER_SUBCOMMANDS,
  shouldWaitForRemotePolicy,
  POLICY_HELPER_HOST,
} from "./utils/settings/policyHelperGate.js";
import { Command, Option, InvalidArgumentError } from "../vendor/commander/esm.mjs";
import { createHelpConfig } from "./cli/helpFormat.js";
import { setStartupMarkWriter, sanitizeMarkName } from "./utils/startupMarks.js";
import { ensureMdmLoaded } from "./utils/settings/mdm/mdmLoader.js";
import {
  ensureKeychainPrefetchCompleted,
  startKeychainPrefetch,
} from "./utils/secureStorage/keychainPrefetch.js";
import {
  declareNoHybridTokenRefresh,
  waitForRemoteManagedSettingsFetchToSettle,
  getRemoteManagedSettingsSignatureFacts,
  hostLaunchedGatewayRefusal,
  validateForceRemoteSettingsRefresh,
  loadRemoteManagedSettings,
  hostLaunchedGatewayLoadRefusal,
  noteHostLaunchedGatewayWithoutPolicy,
  refreshRemoteManagedSettings,
  refreshRemoteManagedSettingsForStartup,
} from "./services/remoteManagedSettings/loader.js";
import { loadClientDataForStartup, applyPendingClientDataBaseUrl } from "./services/clientDataUrl.js";
import { isBgSession, isUnattendedInteractiveSession } from "./utils/concurrentSessions.js";
import { trackError } from "./services/errorTracking/errorTracking.js";
import { isStorageV5Enabled } from "./utils/hoverRest.js";
import {
  redoAuthDependentStartup,
  redoStartupAfterLauncherLogin,
  asStringArray,
  runAllMigrations,
  needsPolicyHelperVerdict,
  exitWithStartupFailure,
  remoteSettingsFailureReason,
  gatewaySettingsFailure,
  continueSignedOutAfterGatewayEnd,
  parseNumberOption,
} from "./services/remoteManagedSettings/gatewaySettingsErrors.js";
import {
  mergePluginDirs,
  withoutPluginDirs,
  settlePluginDirsEnv,
  PLUGIN_DIRS_ENV_VAR,
  PLUGIN_DIRS_ENV_RECOVERY_HINT,
} from "./utils/plugins/pluginDirsEnv.js";
import { clearPluginCache, loadAllPluginsCacheOnly } from "./utils/plugins/pluginLoader.js";
import { setDefaultCommandFlag, emitManagedConfigReadyAtExit } from "./services/policyLimits/startupGate.js";
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
import { exitRefusingBridgeFailure } from "./bridge/bridgeDebug.js";
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
import { mapped, parsePermissionModeOption, getCliSuppliedOptions } from "./migrations/migrationHelpers.js";
import { foldRestricted, cliCarriesSessionConfig } from "./utils/sessionConfigFlags.js";
import { getBuildRefSuffix } from "./cli/earlyArgs.js";
import { parseWindowArgument } from "./services/compact/autoCompactWindow.js";
import { PROACTIVITY_MODES } from "./utils/proactivityMode.js";
import { alwaysFalse as alwaysFalse_2 } from "./Tool.js";
import {
  isByocEnvironment,
  hasRunnerDeclaredNestedRepoDiff,
  isBridgeEnvironment,
} from "./utils/remoteEnvironment.js";
import { DECLARES_DIFF_FINDS_NESTED_REPOSITORY } from "./services/selfHostedRunner/runnerDeclaration.js";
import { FIRST_ARG_NOT_FORWARDED_TEXT } from "./services/selfHostedRunner/changesPaneRefusals.js";
import { tetherEnvAccessor } from "./utils/wireToolInputEcho.js";
import { toolServerEnvAccessor } from "./utils/subprocessEnvLoader.js";
import { envOverrideAccessor } from "./utils/env/envRegistry.js";
import { useLocalProjectsEntrypoint, applyEntrypointOnRequestsEnv } from "./constants/system.js";
import { initializeWarningHandler } from "./utils/warningHandler.js";
import { installTimerDelayClamp } from "./utils/timerDelayClamp.js";
import { registerClientDataGetters } from "./services/api/bootstrap.js";
import {
  stopCapturingEarlyInput,
  takeEarlyInputFieldText,
  markEarlyInputLaunchWarning,
  hasEarlyInput,
  consumeEarlyInput,
} from "./utils/earlyInput.js";
import { hasResumeFlag } from "./main/resumeFlagScan.js";
import { setAiAgentEnv } from "./utils/http.js";
import {
  getOAuthTokenFromFileDescriptor,
  getGatewayTokenFromFileDescriptor,
  getApiKeyFromFileDescriptor,
  hasPossibleCredentialFromDescriptor,
} from "./utils/authFileDescriptor.js";
import { getSessionIngressAuthToken } from "./utils/sessionIngressAuth.js";
import { disableCoreDumps } from "./utils/processHardening.js";
import { tildify } from "./utils/path.js";
import { waitForGate } from "./utils/api.js";
import { resolveCcrAutoConnectDefault } from "./bridge/bridgeGates.js";
import { startMdmRawRead } from "./utils/settings/mdm/rawRead.js";
import { DEFAULTS_PLACEHOLDER } from "./utils/permissions/autoModeRulesPrompt.js";
import { countWhere } from "./utils/collections.js";
import { isFirstPartyTelemetryBlocked } from "./utils/hostEnvironment.js";
import { getGhAuthStatus } from "./utils/github/ghAuthStatus.js";
import {
  envVarsForTelemetry,
  nonDefaultGlobalConfigKeys,
  setUserSettingKeys,
} from "./cli/startup/startupTelemetry.js";
import { SandboxManager } from "./utils/sandbox/sandbox-adapter.js";
import { configureZodForStartup } from "./utils/zodStartup.js";
import { registerToolHosts } from "./services/remoteTools/registerToolHosts.js";
import { validateHandleUriArgs } from "./utils/deepLink/handleUri.js";
import {
  parseImportArgv,
  isImportEnabled,
  planImportRewrite,
  CONFIG_UNREADABLE_MESSAGE,
  IMPORT_UNAVAILABLE_MESSAGE,
} from "./commands/import/index.js";
import { tryOpenLiveBackground } from "./commands/resume/openLiveBackground.js";
import { registerEditHookCommand } from "./cli/handlers/editHook.js";
import { registerPermissionsCommands } from "./cli/handlers/editSettingsCommands.js";
import { registerPurgeCommands } from "./cli/handlers/purge.js";
import { getBaseRenderOptions } from "./utils/renderOptions.js";
import { addBackgroundVerbsToHelp } from "./cli/backgroundSessionVerbs.js";
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
import { getPlatform } from "./utils/platform.js";
import { getCommands } from "./commands.js";
import { markRemoteControlUsed } from "./services/tips/remoteControlNudges.js";
import { hasPolicyDiverged } from "./utils/settings/policySnapshot.js";
import { resetProviderBoundCaches } from "./utils/model/resetProviderCaches.js";
import { buildDeepLinkBanner } from "./utils/deepLink/banner.js";
import { getCwd } from "./utils/cwd.js";
import { setPromptLaunchWarning } from "./state/promptInputStore.js";
import { telemetrySafeModelName } from "./utils/model/telemetryModelName.js";
import { isBuiltInAgent } from "./tools/AgentTool/loadAgentsDir.js";
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
import { getDynamicTeamContext } from "./utils/teammate.js";
import { computeInitialTeamContext } from "./utils/swarm/reconnection.js";
import { UNLIMITED } from "./state/statusLineWidth.js";
import { createEmptyAttributionState } from "./utils/commitAttribution.js";
import { isAwaySummaryEnabled } from "./services/awaySummary.js";
import { createUserMessage, createSystemMessage } from "./utils/messages.js";
import { addHistoryEntry } from "./history.js";
import { loadConversationForResume } from "./utils/conversationRecovery.js";
import { precomputeResumeHooks } from "./services/compact/precomputedCompact.js";
import { noopModelPinSubscriber, noopModelPinReset } from "./utils/sessionModelPin.js";
import { backgroundSessionMovedNotice } from "./utils/backgroundSessionResume.js";
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
import { extractRepoSlug, nullIfTruthy } from "./cli/eagerFlags.js";
import { toCompatSessionId, remoteRowId } from "./bridge/sessionIdCompat.js";
import { permissionModeFromString } from "./utils/permissions/PermissionMode.js";
import { sensitivePathGateEnabled, neverTrueAsync } from "./utils/permissions/sensitivePaths.js";
import { logInteractiveInputFailure, noTtyMessage } from "./cli/startup/interactiveInputCheck.js";
import { isTerminalShutdown, heldUntilExit } from "./utils/terminalShutdown.js";
import { earlyArgsArgv } from "./services/daemon/relaunchArgs.js";
import { isCcpoolId, getEnvironmentSelectionInfo } from "./utils/teleport/environmentSelection.js";
import {
  isCloudClientToolServingAnsweredOn,
  getViolinWillowOwnAnswer,
} from "./services/analytics/violinWillowGate.js";
import { environmentUnresolvedOutcome } from "./utils/teleport/cloudEnvironments.js";
import { fetchEnvironments } from "./utils/teleport/environments.js";
import { isRemoteSessionDisabled } from "./utils/background/remote/remoteSession.js";
import { isContainerSyncEnvironment } from "./utils/teleport/containerSync.js";
import {
  resolveHostConsentMode,
  storedHomeSettingsMode,
  isLaunchConsentBlocked,
  shouldPromptHomeSettingsMode,
  noteHomeSettingsPrompt,
  shouldForwardHomeSettings,
} from "./utils/teleport/homeSettingsMode.js";
import { getClaudeConfigDir } from "./utils/markdownConfigLoader.js";
import { isScrubEnabled } from "./utils/subprocessEnv.js";
import {
  boolFromMaybe,
  isRestrictedModelAllowed,
  describeSelfHostedModeNotice,
  resolveStartupModel,
} from "./utils/model/startupModelResolution.js";
import { getMainLoopModel } from "./utils/model/model.js";
import { modelSupportsAutoMode } from "./utils/betas.js";
import { tryReadFileForSync } from "./services/settingsSync/index.js";
import { isDeviceRevokedError } from "./bridge/deviceBinding.js";
import { isGithubDotCom } from "./utils/git/githubUrl.js";
import { getKnownPathsForRepo, filterExistingPaths } from "./utils/githubRepoPathMapping.js";
import { setCwd } from "./utils/Shell.js";
import { getPlansDirectory, primePlanSlugCollisions } from "./utils/plans.js";
import { isAgentsFleetEnabled, isPastSessionsExperimentEnabled } from "./utils/fleetGates.js";
import { findBackgroundSessionHolder, formatSessionRunningInBackground } from "./utils/sessionAttach.js";
import { resumeSourceForPath } from "./utils/codeMode/sessionResumeHooks.js";
import { isTranscriptLoadError, win32EbadfHelp } from "./utils/transcript/transcriptFiles.js";
import { getWorktreePaths } from "./utils/getWorktreePaths.js";
import { deferInit } from "../runtime/deferred-init.js";

//@ chunk-9ys74nhz.js:8700-10170 sole-consumer
/**
 * initializeEntrypoint 之后把一批进程环境写入 launchOptions（交互性、entrypoint、子会话、远端会话/容器 ID、桌面技能/连接器、Chrome 标签组等），并从 process.env 删除只该被读一次的变量。
 */
function initializeLaunchOptionsFromEnv(isNonInteractive) {
  initializeEntrypoint(isNonInteractive);
  let sessionShape_2 = sessionShape();
  sessionShape_2.setInteractive(!isNonInteractive);
  sessionShape_2.setSpawnedByAttendedSession(env.CLAUDE_CODE_SESSION_ATTENDED);
  sessionShape_2.setEntrypoint(env.CLAUDE_CODE_ENTRYPOINT);
  sessionShape_2.setRemoteRelayMark(isSpawnedByServer());
  sessionShape_2.setChildSession(Boolean(env.CLAUDE_CODE_CHILD_SESSION));
  sessionShape_2.setHasRemoteSessionOrContainerId(
    Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID || env.CLAUDE_CODE_CONTAINER_ID),
  );
  sessionShape_2.setClaudecode(Boolean(env.CLAUDECODE));
  sessionShape_2.setHostManagedRunnerChild(
    env.CLAUDE_CODE_REMOTE === true &&
      env.CLAUDE_CODE_ENVIRONMENT_KIND === "byoc" &&
      env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE === "self_hosted" &&
      env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST &&
      env.ANTHROPIC_BASE_URL !== undefined,
  );
  sessionShape_2.setCoworkFrameArtifacts(env.CLAUDE_CODE_COWORK_FRAME_ARTIFACTS);
  sessionShape_2.setHostScheduledRun(env.CLAUDE_CODE_HOST_SCHEDULED_RUN);
  sessionShape_2.setDesktopSkillSwitches(env.CLAUDE_CODE_DESKTOP_SKILL_SWITCHES);
  sessionShape_2.setHostUnattendedGrant(env.CLAUDE_CODE_REMOTE_TOOLS_HOST_ALLOWS_UNATTENDED);
  env.unset("CLAUDE_CODE_REMOTE_TOOLS_HOST_ALLOWS_UNATTENDED");
  sessionShape_2.setChromeTabGroupKey(
    env.CLAUDE_CODE_REMOTE_SESSION_ID ? env.CLAUDE_CHROME_TAB_GROUP_KEY : undefined,
  );
  let isCoworkRemote = isCoworkWithRemote() && Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID);
  sessionShape_2.setHostSkillCatalog(isCoworkRemote ? env.CLAUDE_CODE_HOST_SKILL_CATALOG : undefined);
  env.unset("CLAUDE_CHROME_TAB_GROUP_KEY");
  if (isCoworkRemote) env.unset(HOST_SKILL_CATALOG_ENV);
  let isTopHost = isTopHostSession();
  sessionShape_2.setDesktopSkillsPluginDir(isTopHost ? env.CLAUDE_CODE_DESKTOP_SKILLS_PLUGIN_DIR : undefined);
  if (isTopHost) env.unset("CLAUDE_CODE_DESKTOP_SKILLS_PLUGIN_DIR");
  let isHostEntrypoint = isHostSessionEntrypoint();
  sessionShape_2.setDesktopConnectorNames(isHostEntrypoint && env.CLAUDE_CODE_DESKTOP_CONNECTOR_NAMES);
  if (isHostEntrypoint) env.unset("CLAUDE_CODE_DESKTOP_CONNECTOR_NAMES");
}
//@ chunk-9ys74nhz.js:10170-10658 fingerprint (2.1.88 match: initializeEntrypoint, 0.813)
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
//@ chunk-10j59z4a.js:228-383 placement
/**
 * 从层级记录中拆出组织字段
 */
function splitTierOrganization(sources) {
  if (!Object.hasOwn(sources, HOST_FREE_FORM_SETTINGS_KEY))
    return {
      tier: sources,
      organization: null,
      memberLost: false,
    };
  let { [HOST_FREE_FORM_SETTINGS_KEY]: freeForm, ...rest } = sources;
  return {
    tier: rest,
    organization: null,
    memberLost: false,
  };
}
//@ chunk-80cq400a.js:918-1044 facade-majority
function compactJsonForTypedTransport(value) {
  return jsonStringify(value).replace(
    /[\u007f-\u009f]/g,
    (char) => "\\u" + char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0"),
  );
}
//@ chunk-80cq400a.js:1044-1909 facade-majority (2.1.88 match: loadSettingsFromFlag, 0.517)
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
      let compactJson = compactJsonForTypedTransport(parsedJson);
      settingsPath = generateTempFilePath("claude-settings", ".json", {
        contentHash: compactJson,
      });
      setFlagSettingsExpectedContent(compactJson);
    } else {
      let resolvedPath = settingsFile;
      let canonicalPath = settingsFile;
      let settingsContent;
      try {
        if (isInClaudeConfigHome(settingsFile)) {
          resolvedPath = safeResolvePath(getFsImplementation(), settingsFile).resolvedPath;
          canonicalPath = resolvedPath;
        } else {
          let vetResult = vetRepoSettingsPath(getFsImplementation(), settingsFile);
          resolvedPath = vetResult.resolvedPath;
          canonicalPath = canonicalizePathCase(vetResult.linksResolvedPath ?? vetResult.resolvedPath);
        }
        settingsContent = readFileSync(resolvedPath, MAX_SETTINGS_JSON_BYTES);
      } catch (error) {
        if (isSymlinkToNetworkPathError(error))
          return cliError(`Error: Cannot use settings file ${settingsFile}: ${errorMessage(error)}`);
        if (isENOENT(error)) return cliError(`Error: Settings file not found: ${resolvedPath}`);
        if (getErrnoCode(error) === "ERR_FILE_TOO_LARGE")
          return cliError(
            `Error: Settings file exceeds the ${MAX_SETTINGS_JSON_BYTES / 1048576}MiB limit: ${resolvedPath}`,
          );
        if (isNotRegularFileError(error) || isEISDIR(error))
          return cliError(`Error: Cannot use settings file (${errorMessage(error)}): ${resolvedPath}`);
        throw error;
      }
      settingsPath = canonicalPath;
      setFlagSettingsFilePinnedContent(settingsContent);
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
//@ chunk-80cq400a.js:1909-2114 facade-majority
/**
 * 处理 --managed-settings（SDK 父进程传入的策略层 JSON）：解析 tier/organization，非法时只告警。
 */
function loadManagedSettingsFromFlag(settingSourcesArg) {
  let parsed = safeParseJSON(settingSourcesArg.trim(), false);
  if (!isPlainObject(parsed)) {
    logForDebugging("--managed-settings ignored: invalid JSON object", {
      level: "warn",
    });
    setParentManagedSettingsInvalid(true);
    return;
  }
  let { tier, organization, memberLost } = splitTierOrganization(parsed);
  if (memberLost) setParentManagedSettingsInvalid(true);
  setParentManagedSettings(tier, organization);
  invalidateCommandNames();
}
//@ chunk-80cq400a.js:2114-2307 fingerprint (2.1.88 match: loadSettingSourcesFromFlag, 0.541)
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
//@ chunk-80cq400a.js:2307-2537 facade-majority (2.1.88 match: eagerLoadSettings, 0.674)
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
//@ chunk-80cq400a.js:2537-2645 layout
function applyFastModeFlag() {
  let value = eagerParseCliFlag("--fast-mode");
  if (value !== "on" && value !== "off") return;
  setFlagSettingsInline({
    ...(getFlagSettingsInline() ?? {}),
    fastMode: value === "on",
  });
  invalidateCommandNames();
}
//@ chunk-80cq400a.js:2645-2815 facade-majority
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
      getAllowedSettingSourcesAsConfigured().filter((source) => !REPO_DIR_SETTING_SOURCES.has(source)),
    );
    invalidateCommandNames();
  }
}
//@ chunk-80cq400a.js:2815-2930 sole-consumer
function canonicalizePathCase(path) {
  if (isUntouchableSpelling(path)) return path;
  try {
    let realPath = realpathExaminedSync(getFsImplementation(), path);
    return realPath.toLowerCase() === path.toLowerCase() ? realPath : path;
  } catch {
    return path;
  }
}
//@ chunk-5xgkngpb.js:2095527-2095600 fingerprint (2.1.88 match: resetCursor, 0.689)
function resetCursor() {
  return Boolean(process.stdout.isTTY && process.stdin.isTTY);
}
//@ chunk-405cd95w.js:6027-7162 fingerprint (2.1.88 match: getInputPrompt, 0.451)
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
//@ chunk-hjswk319.js:94429-94504 fingerprint (2.1.88 match: logManagedSettings, 0.424)
function logManagedSettings(policySettings) {
  let allKeys = getManagedSettingsKeysForLogging(policySettings);
  return {
    keyCount: allKeys.length,
    keys: fromSanitizer_SANITIZER_OUTPUT_ONLY(allKeys.join(",")),
  };
}
//@ chunk-hjswk319.js:96215-98840 fingerprint (2.1.88 match: logTenguInit, 0.61)
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
  let startupWork = waitForStartupWork(host, "tengu_init");
  try {
    let cwd = getNoFlickerEnvOverride();
    let extraAttributes;
    let stateExtras;
    await startupWork;
    let cwdExtras = {};
    let projectFactsPromise = getProjectFactsForStartup().catch(() => null);
    let gitPresenceForAnalytics = await getGitPresenceForAnalytics();
    let projectFacts = (await withDeadline(projectFactsPromise, PROJECT_FACTS_CACHE_TTL_MS)) ?? null;
    let rp = mcpConfigs === null ? null : mcpServerKindFlags(mcpConfigs);
    let autoModeAvailability = null;
    if (runsLocalQueryLoop)
      try {
        autoModeAvailability = getAutoModeAvailabilityForAnalytics();
      } catch (error) {
        logError(error);
      }
    let eventFields = {
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
      ...extraAttributes,
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
      ...cwdExtras,
      is_simple: isBareMode() || undefined,
      is_safe_mode: isSafeMode() || undefined,
      extendedQuestions: getExtendedQuestionsEnabled() || undefined,
      is_coordinator: coordinatorModeModule.isCoordinatorMode() ? true : undefined,
      ...codeModeTelemetryFields(runsLocalQueryLoop),
      autoUpdatesChannel: fromEnum(getInitialSettings().autoUpdatesChannel ?? "latest"),
      ...modelProvenance,
      ...autoModeAvailability,
      ...(gitPresenceForAnalytics && {
        is_git: gitPresenceForAnalytics.is_git,
        has_remote: gitPresenceForAnalytics.has_remote,
        remote_host_class: fromEnum(gitPresenceForAnalytics.remote_host_class),
      }),
      ...(projectFacts && {
        has_dockerfile: projectFacts.has_dockerfile,
        has_compose: projectFacts.has_compose,
        has_devcontainer: projectFacts.has_devcontainer,
        has_nix: projectFacts.has_nix,
        has_bazel: projectFacts.has_bazel,
        lockfile_family: fromEnum(projectFacts.lockfile_family),
        has_env_file: projectFacts.has_env_file,
        has_ci_config: projectFacts.has_ci_config,
        has_private_registry: projectFacts.has_private_registry,
        private_registry_host_class: fromEnum(projectFacts.private_registry_host_class),
        has_secrets_manager_refs: projectFacts.has_secrets_manager_refs,
        has_xcode_project: projectFacts.has_xcode_project,
        has_ios_app_project: projectFacts.has_ios_app_project ?? undefined,
        has_android_project: projectFacts.has_android_project,
        has_android_app_project: projectFacts.has_android_app_project,
        os_locked_toolchain: fromEnum(projectFacts.os_locked_toolchain),
      }),
    };
    logEvent("tengu_init", eventFields);
    if (autoModeAvailability !== null) {
      markAutoModeAvailability(host, autoModeAvailability);
      onGrowthBookRefresh(() => reportAutoModeAvailabilityChange(host));
    }
  } catch (error) {
    logError(error);
  }
}
//@ chunk-hjswk319.js:99058-99672 fingerprint (2.1.88 match: extractTeammateOptions, 0.922)
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
//@ chunk-hjswk319.js:99672-100232 layout
/**
 * 首个位置参数像子命令名时（单词、无空格），按编辑距离提示“Did you mean claude X?”并退出 1。
 */
async function suggestUnknownSubcommand(typedName, program) {
  let flattened = program.commands
    .filter((command) => !("_hidden" in command && command._hidden))
    .flatMap((command) => [command.name(), ...command.aliases()]);
  let lower = typedName.toLowerCase();
  let suggestion =
    lower !== typedName && flattened.includes(lower)
      ? lower
      : suggestClosestName(
          lower,
          flattened.map((name) => ({
            name,
          })),
        );
  if (!suggestion) return;
  await logEventAsync("tengu_unknown_command_suggestion", {});
  process.stderr.write(
    [
      sequential.red(figures_default.cross) + ` unknown command "${typedName}"`,
      sequential.dim(`  ${TREE_GLYPHS.last} `) +
        "Did you mean " +
        sequential.bold(`claude ${suggestion}`) +
        "?",
      "",
      sequential.dim("Run ") +
        sequential.dim.bold("claude --help") +
        sequential.dim(" to list commands, or ") +
        sequential.dim.bold(`claude -p "${typedName}"`) +
        sequential.dim(" to send as a prompt."),
      "",
    ].join(`
`),
  );
  await exitAfterAnalyticsFlush(1);
}
//@ chunk-hjswk319.js:100232-100449 fingerprint (2.1.88 match: prefetchSystemContextIfSafe, 1)
/**
 * 非交互或已信任时预取系统上下文（git 状态等）；未信任时跳过（git 可能执行仓库里的钩子）。
 */
function prefetchSystemContextIfSafe(session, options) {
  if (getIsNonInteractiveSession()) {
    logForDiagnosticsNoPII("info", "prefetch_system_context_non_interactive");
    prefetchGitStatus(session);
    return;
  }
  if (checkHasTrustDialogAccepted()) {
    logForDiagnosticsNoPII("info", "prefetch_system_context_has_trust");
    prefetchGitStatus(session);
    refreshExampleCommands(options);
  } else logForDiagnosticsNoPII("info", "prefetch_system_context_skipped_no_trust");
}
//@ chunk-h61dq9nz.js:14250-14260 placement
var CURRENT_MIGRATION_VERSION = 14;
//@ chunk-h61dq9nz.js:14260-14558 placement (2.1.88 match: _temp, 0.315)
function isPristineUserConfig() {
  let globalConfig = getGlobalConfig();
  if (
    globalConfig.autoUpdates === false ||
    globalConfig.bypassPermissionsModeAccepted ||
    globalConfig.subscriptionNoticeCount !== undefined ||
    globalConfig.replBridgeEnabled !== undefined
  )
    return false;
  for (let key of USER_INTENT_SETTING_KEYS) {
    let value = globalConfig[key];
    if (value !== undefined && value !== DEFAULT_GLOBAL_CONFIG[key]) return false;
  }
  let settingsForSourceForUpkeep = getSettingsForSourceForUpkeep("userSettings");
  return (
    settingsForSourceForUpkeep?.model === undefined && !settingsForSourceForUpkeep?.skipAutoPermissionPrompt
  );
}
//@ chunk-h61dq9nz.js:14558-14631 layout
function shouldSkipFreshMigrations() {
  return env.CLAUDE_CODE_CCR_SKIP_FRESH_MIGRATIONS && isHostManagedProviderAuth() && isPristineUserConfig();
}
//@ chunk-h61dq9nz.js:14631-15314 callgraph-witnessed (2.1.88 match: runMigrations, 0.216)
/**
 * 运行同步配置迁移：migrationVersion 已等于 14 时跳过；CCR 新安装直接打标记；否则依次执行各迁移，任一写设置失败则不提升版本（下次启动重跑）。
 */
async function runMigrations(storageV5) {
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
      storageV5,
    );
    return;
  }
  let results = [];
  results.push(await migrateAutoUpdatesToSettings(storageV5));
  results.push(await migrateBypassPermissionsAcceptedToSettings(storageV5));
  resetProToOpusDefault(storageV5);
  results.push(await migrateSonnet1mToSonnet45(storageV5));
  results.push(await migrateLegacyOpusToCurrent(storageV5));
  results.push(await migrateSonnet45ToSonnet46(storageV5));
  results.push(await migrateOpusToOpus1m(storageV5));
  results.push(await migrateModelAliases(undefined, storageV5));
  results.push(await migrateFable5ToFableAlias(storageV5));
  migrateReplBridgeEnabledToRemoteControlAtStartup(storageV5);
  results.push(await migrateUserIntentToSettings(storageV5));
  migrateNotificationDismissals(storageV5);
  results.push(await resetAutoModeOptInForDefaultOffer(storageV5));
  if (!results.every(Boolean)) {
    logForDebugging(
      "Skipping migrationVersion bump: a settings-writing migration failed to persist; the set re-runs next startup.",
      {
        level: "error",
      },
    );
    return;
  }
  await saveGlobalConfig(
    (prev) =>
      prev.migrationVersion === CURRENT_MIGRATION_VERSION
        ? prev
        : {
            ...prev,
            migrationVersion: CURRENT_MIGRATION_VERSION,
          },
    storageV5,
  );
}
//@ chunk-h61dq9nz.js:15314-15536 placement
async function getPolicyMemoryFingerprint() {
  let settingsForSource = getSettingsForSource("policySettings");
  let includesWarning = shouldShowClaudeMdExternalIncludesWarning();
  return [
    JSON.stringify([
      settingsForSource?.claudeMd ?? null,
      remoteClaudeMd(),
      settingsForSource?.claudeMdExcludes ?? null,
      settingsForSource?.autoMemoryEnabled ?? null,
      settingsForSource?.env ?? null,
      await includesWarning,
    ]),
    JSON.stringify((await includesWarning).filter((entry) => entry[2])),
  ];
}
//@ chunk-h61dq9nz.js:17095-17157 placement
function isAuthSubcommand(flag) {
  if (flag.parent?.name() !== "auth") return false;
  return true;
}
//@ chunk-h61dq9nz.js:17157-17260 placement
function isGatewayJsonLogin(command) {
  return (
    command.parent?.name() === "auth" &&
    command.name() === "login" &&
    (command.opts().gatewayJson === true || isGatewayLoginForced())
  );
}
//@ chunk-h61dq9nz.js:21086-21194 placement
async function getServeHelperStopReason(credentials) {
  let serveHelperIneligibility = getServeHelperIneligibility();
  if (serveHelperIneligibility !== undefined) return serveHelperIneligibility;
  if ((await getClaudeAIOAuthTokenOriginAsync(credentials)) !== "store") return "token_origin";
  return;
}
//@ chunk-h61dq9nz.js:21194-21362 placement
async function stopIfServeHelperUnsupported(credentials, phase) {
  let stopReason;
  if (phase === "at_start") stopReason = await getServeHelperStopReason(credentials);
  else
    try {
      stopReason = getServeHelperIneligibility();
    } catch {
      stopReason = "token_source";
    }
  if (stopReason === undefined) return false;
  try {
    printCliError(formatServeHelperStoppedError(stopReason));
  } finally {
    await gracefulShutdown(EXIT_CONFIG_ERROR);
  }
  return true;
}
//@ chunk-h61dq9nz.js:21362-21480 placement
function getServeHelperIneligibility() {
  if (getAPIProvider() !== "firstParty") return "provider";
  if (getAuthTokenSource().source !== "claude.ai" || !isClaudeAISubscriber()) return "token_source";
  return;
}
//@ chunk-h61dq9nz.js:21480-21493 layout
var MAX_REPLY_GATE_POLICY_LENGTH = 32768;
//@ chunk-h61dq9nz.js:21493-21532 layout
var CLAUDE_CODE_REPLY_GATE_POLICY = "CLAUDE_CODE_REPLY_GATE_POLICY";
//@ chunk-h61dq9nz.js:21532-23069 layout
function applyLaunchReplyGatePolicy() {
  let policyText = getPreSettingsEnvSnapshot()[CLAUDE_CODE_REPLY_GATE_POLICY];
  env.unset(CLAUDE_CODE_REPLY_GATE_POLICY);
  if (policyText === undefined || policyText.trim() === "") return;
  let parsedPolicy =
    policyText.length > MAX_REPLY_GATE_POLICY_LENGTH
      ? {
          longerThan: MAX_REPLY_GATE_POLICY_LENGTH,
        }
      : parseReplyGatePolicy(policyText);
  let canWarn = process.stderr.isTTY || env.CLAUDE_CODE_REMOTE;
  if ("policy" in parsedPolicy) {
    let { policy, unreadBlocks } = parsedPolicy;
    setReplyGatePolicy(policy, "launchEnv");
    logForDebugging(
      `${CLAUDE_CODE_REPLY_GATE_POLICY} accepted: tools=${policy.terminalTools.length} person=${policy.maxAsksAfterPerson} own_task=${policy.maxAsksAfterOwnTask ?? policy.maxAsksAfterServerEvent} other=${policy.maxAsksAfterServerEvent} after_error=${policy.maxAsksAfterError ?? "none"} error_texts=${policy.askTextsAfterError?.size ?? 0} skip_while_worker_out=${policy.skipWhileWorkerOut === true} skip_retry_while_server_down=${policy.skipRetryWhileServerDown === true} status_nudge_seconds=${policy.statusNudge?.seconds ?? "none"} prompt_reminder=${policy.promptReminder !== undefined}`,
    );
    if (unreadBlocks.length > 0)
      logForDebugging(
        `${CLAUDE_CODE_REPLY_GATE_POLICY}: ignoring its ${unreadBlocks.join(" and ")}, which could not be read; the rest of the policy is kept`,
        {
          level: "warn",
        },
      );
    for (let unreadBlock of unreadBlocks)
      logFeatureSad("projects_reply_gate_policy", `${unreadBlock}_unreadable`, {
        from_launch_env: true,
      });
    let filtered = ["flagSettings", ...EDITABLE_SETTING_SOURCES].filter(
      (source) => isSettingSourceEnabled(source) && getSettingsForSource(source)?.disableReplyCheck === true,
    );
    if (filtered.length > 0) {
      let ignoredWarning = `disableReplyCheck is ignored in ${filtered.map(getSettingSourceDisplayNameLowercase).join(", ")}: only managed settings can turn the reply check off`;
      logForDebugging(ignoredWarning, {
        level: "warn",
      });
      if (canWarn) cliWarn(`Warning: ${ignoredWarning}.`);
    }
    return;
  }
  setLaunchReplyGatePolicyRefused();
  logReplyGatePolicy("longerThan" in parsedPolicy ? "too_long" : "unreadable", {
    from_launch_env: true,
  });
  let ignoredLine = replyGatePolicyIgnoredLine(CLAUDE_CODE_REPLY_GATE_POLICY, parsedPolicy);
  logForDebugging(ignoredLine, {
    level: "error",
  });
  if (!canWarn) return;
  cliWarn(
    `Warning: ${ignoredLine}. A self-hosted runner sets this variable from what Anthropic's service sends: update the runner and any Claude Code version that your start script pins, and contact Anthropic support if this continues.`,
  );
}
//@ chunk-h61dq9nz.js:23069-35098 placement
/**
 * 非交互/SDK 会话启动主流程（选项、云会话、输入输出）。
 */
async function runPreparedHeadless(session, options, openLiveBackgroundSessionForResume) {
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
  applyLaunchReplyGatePolicy();
  if (outputFormat !== "json" && outputFormat !== "stream-json") warnIfSignInExpiring();
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
    let { runHeadlessCloudAttach, runHeadlessCloudCreate } =
      await import("./cli/headlessCloud/openBareCloudSession.js");
    return cloudAttachId === null
      ? runHeadlessCloudCreate(session, options, getRootSession().host)
      : runHeadlessCloudAttach(session, options, cloudAttachId, getRootSession().host, {
          serveOnly: session.serveOnly,
        });
  }
  if (session.headlessCloudPrint) {
    releaseStartupWork(getRootSession().host, "not_applicable");
    if (outputFormat === "json") setHasFormattedOutput(true);
    applyConfigEnvironmentVariables();
    initializeTelemetryAfterTrust(session.storageV5);
    let { runHeadlessCloudPrintArm } = await import("./cli/handlers/runHeadlessCloudPrintArm.lazy.js");
    return runHeadlessCloudPrintArm(session, options);
  }
  if (cloudAttachId !== null) {
    releaseStartupWork(getRootSession().host, "not_applicable");
    let orgValidation = settleLauncherHostLogin(
      session.orgValidation ?? (await validateForceLoginOrg(session.credentials)),
    );
    if (!orgValidation.valid) {
      await sendOrgValidationRefusal(orgValidation);
      return cliErrorAfterAnalyticsFlush(orgValidation.message);
    }
    await waitForPolicyLimitsToLoad();
    let unavailableReason = cloudSessionsUnavailableReason();
    if (unavailableReason) {
      await logOrgPolicyDeniedAsync("allow_remote_sessions", "cli_flag");
      return cliErrorAfterAnalyticsFlush(`Error: ${unavailableReason}`);
    }
    if (outputFormat === "stream-json")
      return cliError("Error: --cloud <session_id> does not support --output-format stream-json");
    let prompt = typeof inputPrompt === "string" && inputPrompt.trim() !== "" ? inputPrompt : null;
    if (prompt === null)
      return cliError("Error: non-interactive --cloud <session_id> requires a prompt (positional or stdin).");
    logEvent("tengu_remote_send_headless", {
      entry_point: fromEnum("cloud_attach_headless"),
    });
    let attachError = null;
    let boundDeviceId;
    try {
      let session_2 = await fetchSession(cloudAttachId, undefined, session.credentials);
      if (session_2.session_status === "archived")
        attachError = `cloud session ${cloudAttachId} is archived and cannot accept new messages`;
      boundDeviceId = session_2.bound_device_uuid;
    } catch (error) {
      attachError = errorMessage(error);
    }
    let eventSigner =
      attachError === null && boundDeviceId !== undefined && isDeviceIdentityEnabledCached()
        ? import("./bridge/clientEventSigner.js").then(
            ({ deviceEventSignerIfBoundHere }) =>
              deviceEventSignerIfBoundHere(boundDeviceId, session.credentials),
            reportSignerLoadFailure,
          )
        : undefined;
    let sendResult =
      attachError !== null
        ? {
            ok: false,
            reason: attachError,
          }
        : eventSigner === undefined
          ? await sendEventToRemoteSession(cloudAttachId, prompt)
          : await sendEventToRemoteSession(cloudAttachId, prompt, {
              eventSigner,
            });
    if (!sendResult.ok) {
      await logEventAsync("tengu_remote_send_headless_error", {
        entry_point: fromEnum("cloud_attach_headless"),
      });
      if (outputFormat === "json")
        process.stdout.write(
          jsonStringify({
            ok: false,
            session_id: cloudAttachId,
            error: sendResult.reason,
          }) +
            `
`,
        );
      return cliErrorAfterAnalyticsFlush(
        `Error: failed to send message to cloud session ${cloudAttachId}: ${sendResult.reason}`,
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
    let orgValidation = settleLauncherHostLogin(
      session.orgValidation ?? (await validateForceLoginOrg(session.credentials)),
    );
    if (!orgValidation.valid) {
      await sendOrgValidationRefusal(orgValidation);
      return cliErrorAfterAnalyticsFlush(orgValidation.message);
    }
    await waitForPolicyLimitsToLoad();
    let unavailableReason = cloudSessionsUnavailableReason();
    if (unavailableReason) {
      await logOrgPolicyDeniedAsync("allow_remote_sessions", "cli_flag");
      return cliErrorAfterAnalyticsFlush(`Error: ${unavailableReason}`);
    }
    let prompt = typeof inputPrompt === "string" && inputPrompt.trim() !== "" ? inputPrompt : null;
    if (prompt === null) {
      let { prefix, flag } = environmentFlagErrorPrefix(noMonorepo);
      return cliError(
        `${prefix}non-interactive ${flag} requires a prompt (positional or stdin). Run from a TTY for an interactive cloud session.`,
      );
    }
    let parenScan = undefined;
    let rules = parenScan?.kind === "rules" ? parenScan.rules : undefined;
    let repositoryRequiredBy = undefined;
    let requiredAgent = undefined;
    let builtinTools = undefined;
    logEvent("tengu_remote_create_session", {
      has_initial_prompt: lit("true"),
      entry_point: fromEnum("pool_headless"),
      branch_mode: branchModeForTelemetry(poolOnBranch, poolRef),
      disallowed_tools_count: rules?.length ?? 0,
      ...disallowedToolsTelemetry(rules),
      builtin_tools_count: builtinTools?.length ?? 0,
      ...false,
    });
    if (parenScan?.kind === "unclosed") {
      await logEventAsync("tengu_remote_create_session_error", {
        error: lit("deny_rule_unclosed"),
        entry_point: fromEnum("pool_headless"),
        branch_mode: branchModeForTelemetry(poolOnBranch, poolRef),
      });
      return cliErrorAfterAnalyticsFlush(unclosedParenError(parenScan.rule));
    }
    let cleanups = [];
    let branchMode = undefined;
    let permissionMode =
      branchMode === undefined
        ? cloudPermissionModeFrom(permissionModeCli)
        : branchMode.decision.permissionMode;
    let branch = poolOnBranch ?? poolRef ?? (await getBranch());
    let createError;
    let errorKind;
    let failureDetails;
    let notice;
    let teleportResult = await teleportToRemote({
      initialMessage: prompt,
      signal: new AbortController().signal,
      source: "remote",
      branchName: branch || undefined,
      branchFromHead: (poolOnBranch ?? poolRef) == null,
      reuseOutcomeBranch: poolOnBranch ?? undefined,
      explicitRef: poolOnBranch ?? poolRef ?? undefined,
      poolId,
      noMonorepo,
      personal,
      repositoryRequiredBy: requiredAgent === undefined ? undefined : `The agent "${requiredAgent}"`,
      onBundleNotice: (bundleNotice) => {},
      correlationId: correlationId ?? undefined,
      ...{
        title: sessionNameArg || undefined,
        model: branchMode?.model,
        permissionMode,
        proactivityLevel: options.proactivity,
        disallowedTools: rules,
        builtinTools,
      },
      onCreateFail: (message, kind, details) => {
        createError = message;
        errorKind = kind;
        failureDetails = details;
        process.stderr.write(`Error: ${message}
`);
      },
      storageV5: session.storageV5,
      credentials: credentialsStoreFor(session.storageV5),
    });
    if (!teleportResult) {
      await logEventAsync("tengu_remote_create_session_error", {
        error: fromEnumOpt(errorKind),
        entry_point: fromEnum("pool_headless"),
        branch_mode: branchModeForTelemetry(poolOnBranch, poolRef),
        ...(failureDetails?.endpoint && {
          create_endpoint: fromEnum(failureDetails.endpoint),
        }),
        ...(failureDetails?.serverReason && {
          server_reason: fromEnum(failureDetails.serverReason),
        }),
        ...(failureDetails?.messageHidden && {
          message_hidden: lit("true"),
        }),
        ...(failureDetails?.preflightTransient !== undefined && {
          deny_transient: lit(failureDetails.preflightTransient ? "true" : "false"),
        }),
        ...(failureDetails?.sessionArchived !== undefined && {
          session_archived: lit(failureDetails.sessionArchived ? "true" : "false"),
        }),
      });
      if (outputFormat === "json")
        process.stdout.write(
          jsonStringify({
            ok: false,
            error: createError ?? "Unable to create cloud session",
          }) +
            `
`,
        );
      return cliErrorAfterAnalyticsFlush(createError ? undefined : "Error: Unable to create cloud session");
    }
    await logEventAsync("tengu_remote_create_session_success", {
      session_id: shortHash(teleportResult.id),
      entry_point: fromEnum("pool_headless"),
      branch_mode: branchModeForTelemetry(poolOnBranch, poolRef),
    });
    if (branchMode !== undefined && branchMode.decision.action !== "none") {
      let { modelSupportsAutoMode } = await import("./utils/betas.js");
      await logEventAsync("tengu_remote_model_gate_hint", {
        entry_point: lit("pool_headless"),
        permission_mode: fromEnumOpt(branchMode.explicitMode) ?? lit("unset"),
        action: fromEnum(branchMode.decision.action),
        ...(branchMode.decision.repositoryModel && {
          repository_model: fromEnum(branchMode.decision.repositoryModel),
        }),
        ...(branchMode.decision.barredBy && {
          barred_by: fromEnum(branchMode.decision.barredBy),
        }),
        model_runs_auto: lit(modelSupportsAutoMode(branchMode.model) ? "true" : "false"),
      });
    }
    let text = branchMode?.decision.notice?.text;
    let remoteSessionUrl = getRemoteSessionUrl(teleportResult.id, undefined, {
      from: "cli",
      m: "0",
    });
    let compatSessionId = toCompatSessionId_2(teleportResult.id);
    let notice_2 = notice ?? undefined;
    if (outputFormat === "json")
      process.stdout.write(
        jsonStringify({
          ok: true,
          session_id: compatSessionId,
          title: teleportResult.title,
          url: remoteSessionUrl,
          pool_id: poolId,
          notice: notice_2,
          ...(cleanups.length > 0 && {
            not_applied: cleanups,
          }),
          ...(text !== undefined && {
            mode_notice: text,
          }),
        }) +
          `
`,
      );
    else {
      if (notice_2 !== undefined)
        process.stderr.write(`${notice_2}
`);
      cleanups.forEach((cleanup) =>
        process.stderr.write(`${cleanup}
`),
      );
      if (text !== undefined)
        process.stderr.write(`${text}
`);
      process.stdout.write(`Created cloud session: ${teleportResult.title}
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
    holdForStartupWork(session_2.host, "telemetry_init", (release) => {
      if (release === "shutdown") return;
      initializeTelemetryAfterTrust(session.storageV5);
    });
  let sessionPromise =
    (options.continue || options.resume || teleport) && !startupModelWinsOverSessionRestore()
      ? null
      : getModelDeprecationWarning(rawModelRequest ?? resolvedInitialModel);
  if (sessionPromise && outputFormat !== "json" && outputFormat !== "stream-json") cliWarn(sessionPromise);
  let startTime = performance.now();
  let hooksInitPromise =
    options.continue || options.resume || teleport || setupTrigger || isParkedSpare()
      ? undefined
      : runStartupHooks(session_2, {
          kind: "session-start",
          source: "startup",
          storageV5: session.storageV5,
          credentials: session.credentials,
        }).then((hookResult) => {
          recordPhase("hooks_init_ms", performance.now() - startTime, startTime);
          return hookResult;
        });
  hooksInitPromise?.catch(() => {});
  profileCheckpoint("before_validateForceLoginOrg");
  let orgValidation = settleLauncherHostLogin(
    session.orgValidation ?? (await validateForceLoginOrg(session.credentials)),
  );
  if (!orgValidation.valid) {
    printCliError(orgValidation.message);
    releaseStartupWork(session_2.host, "shutdown");
    await sendOrgValidationRefusal(orgValidation);
    await writeStartupFailureResult({
      sessionId: getSessionId(),
      message: orgValidation.message,
      reason: orgValidation.reason,
    });
    await flushAnalyticsSinks();
    return cliError();
  }
  let slashCommandsDisabled = disableSlashCommands
    ? []
    : deferredCommandsPromise
      ? deferredCommandsPromise.then(getNonInteractiveCommands)
      : getNonInteractiveCommands(commands);
  if (slashCommandsDisabled instanceof Promise) slashCommandsDisabled.catch(() => {});
  let defaultAppState = getDefaultAppState_2();
  let initialState = {
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
    ...createSessionEffortState(options.effort),
    ultracode: isUltracodeEnabled(options.effort),
    autoCompactWindow,
    ...(isFastModeEnabled() && {
      fastMode: isFastModeSettingActive(effectiveModel ?? null),
    }),
    ...(isAdvisorToolEnabled() &&
      advisorModel && {
        advisorModel,
      }),
    ...(options.promptSuggestions !== undefined && {
      promptSuggestionEnabled: options.promptSuggestions && isPromptSuggestionSettingEnabled(),
    }),
    ...(sessionTeamContext && {
      teamContext: sessionTeamContext.teamContext,
      teammateColors: sessionTeamContext.teammateColors,
    }),
  };
  let sessionStateTracker = new SessionStateTracker();
  let store = createStore(initialState, (prev) =>
    onAppStateChange(prev, session_2, sessionStateTracker, session.storageV5, session.credentials),
  );
  session_2.engineStore.adopt(store);
  syncSessionPermissionMode(initialState.toolPermissionContext.mode);
  registerCleanup(() => hasPendingHandoff(store.getState().tasks, session.storageV5));
  resetRefusalFallbackOnSwitch(store.setState);
  let autoModeGate = verifyAutoModeGateAccess(toolPermissionContext, store.getState().fastMode);
  autoModeGate.then(({ updateContext }) => {
    store.setState((prev) => {
      let nextContext = updateContext(prev.toolPermissionContext);
      if (nextContext === prev.toolPermissionContext) return prev;
      return {
        ...prev,
        toolPermissionContext: nextContext,
      };
    });
  });
  if (session.relaunchFlagFetchSettled) {
    let eventLogWaitMs = EVENT_LOGGING_FLAG_WAIT_MS;
    await withDeadline(
      autoModeGate.catch(() => {}),
      eventLogWaitMs,
    );
  }
  setSdkBetas(sdkBetas);
  let state = {
    getClients: () => store.getState().mcp.clients,
    getSuppressedPluginServers: () => store.getState().mcp.suppressedPluginMcpServers ?? [],
    applyMcpUpdate: (updater) =>
      store.setState((prev) => ({
        ...prev,
        mcp: updater(prev.mcp),
      })),
  };
  let isParked = isParkedSpare()
    ? filterObject(
        regularMcpConfigs,
        (key, config) =>
          isNonReservedStdioConfig(config, key) && key.scope !== "project" && key.scope !== "local",
      )
    : {};
  let regularMcpConfigs_2 = isParkedSpare()
    ? filterObject(regularMcpConfigs, (name, config) => !isNonReservedStdioConfig(config, name))
    : regularMcpConfigs;
  let mcpStatus = {};
  let mcpPhases = MCP_CONNECT_PHASES({
    regularMcpConfigs: regularMcpConfigs_2,
    claudeaiConfigPromise,
    state,
    storageV5: session.storageV5,
    credentials: session.credentials,
    ...(shouldJoinBeforeInput(sdkUrl) && {
      leaveAlwaysLoadWaitTo: (join) => {
        mcpStatus.join = join;
      },
    }),
  });
  installStartupMcpHeaders(session_2, regularMcpConfigs, mcpConfigOwnership, asWrittenMcpEntries);
  profileCheckpoint("before_connectMcp");
  let startTime_2 = performance.now();
  await mcpPhases.connect();
  recordPhase("mcp_connect_ms", performance.now() - startTime_2, startTime_2);
  profileCheckpoint("after_connectMcp_claudeai");
  if (!isBareMode())
    startTurnInputPrefetches(session_2, session.storageV5, session.credentials, {
      userContext: !shouldPrefetchUserContext(Boolean(options.continue || options.resume)),
    });
  holdForStartupWork(session_2.host, "idle_startup_work", (release) => {
    if (!isBareMode() && release !== "shutdown") {
      startIdleStartupWork(session_2, session.storageV5, session.credentials);
      import("./utils/backgroundHousekeeping.js").then((mod) =>
        mod.startBackgroundHousekeeping(getRootSession().host, session.storageV5),
      );
    }
    logSessionTelemetry(session.storageV5, session.credentials);
  });
  profileCheckpoint("before_print_import");
  let startTime_3 = performance.now();
  let { runHeadless, explicitMcpConfigRequestsWait, endHeadlessSessionOnEscapedError } =
    await import("./bridge/MAX_DECLARED_DIALOG_KINDS.lazy.js");
  recordPhase("print_import_ms", performance.now() - startTime_3, startTime_3);
  profileCheckpoint("after_print_import");
  let earlyRemoteLink = await session.earlyRemoteLink;
  runHeadless(
    session_2,
    inputPrompt,
    () => store.getState(),
    store.setState,
    store.subscribe,
    slashCommandsDisabled,
    tools,
    sdkMcpConfigs,
    agentDefinitions.activeAgents,
    {
      continue: options.continue,
      resume: options.resume,
      verbose,
      outputFormat,
      jsonSchema,
      permissionPromptToolName: options.permissionPromptTool,
      permissionPrompts: isNoPromptHost(options.permissionPrompts) ? NONE : undefined,
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
      maxBudgetUsd: options.maxBudgetUsd,
      taskBudget: options.taskBudget
        ? {
            total: options.taskBudget,
          }
        : undefined,
      systemPrompt,
      appendSystemPrompt,
      appendSystemPromptHead,
      planModeInstructions: options.planModeInstructions,
      systemPromptSnapshot: options.systemPromptSnapshot,
      appendSubagentSystemPrompt: options.appendSubagentSystemPrompt,
      excludeDynamicSections: options.excludeDynamicSystemPromptSections || undefined,
      userSpecifiedModel: effectiveModel,
      restrictedStartupModel: restrictedModel,
      fallbackModel: userSpecifiedFallbackModel,
      teleport,
      sdkUrl,
      replayUserMessages: effectiveReplayUserMessages,
      includePartialMessages: effectiveIncludePartialMessages,
      forwardSubagentText: effectiveForwardSubagentText,
      sessionMirror,
      forkSession: options.forkSession || false,
      sessionBeganAsCopy: options.sessionBeganAsCopy,
      resumeSessionAt: options.resumeSessionAt || undefined,
      resumeDropsTurn: options.resumeDropsTurn,
      rewindFiles: options.rewindFiles,
      enableAuthStatus: options.enableAuthStatus,
      promptSuggestions: options.promptSuggestions,
      agent: agentCli,
      workload: options.workload,
      setupTrigger: setupTrigger ?? undefined,
      configuredMcpServerCount: Object.keys(regularMcpConfigs).length,
      mcpConnectKickedAtMs: startTime_2,
      ...(mcpStatus.join !== undefined && {
        joinAlwaysLoadMcp: mcpStatus.join,
      }),
      explicitMcpConfigFlag: explicitMcpConfigRequestsWait(
        mcpConfigFlagServers,
        strictMcpConfig,
        Object.keys(regularMcpConfigs).length,
      ),
      mcpConfigOwnership,
      sessionStartHooksPromise: hooksInitPromise,
      sessionState: sessionStateTracker,
      startDeferredMcpServers:
        Object.keys(isParked).length > 0
          ? async (config) => {
              let filteredConfig = omitExcludedOrPluginDisabled(isParked, config, {
                ...getAddDirEnabledPlugins(),
                ...(getInitialSettings().enabledPlugins ?? {}),
              });
              await connectMcpConfigServers({
                configs: filteredConfig,
                label: "claim",
                nonBlocking: getMcpConnectNonBlocking(),
                state,
                storageV5: session.storageV5,
                credentials: session.credentials,
              });
              return Object.keys(filteredConfig);
            }
          : undefined,
    },
  ).catch((error) => endHeadlessSessionOnEscapedError(session_2, error, outputFormat));
  return;
}
//@ chunk-h61dq9nz.js:39079-39141 sole-consumer
function shouldPrefetchForCommand(command, program) {
  return (
    (command.parent === program && POLICY_HELPER_SUBCOMMANDS.has(command.name())) ||
    isGatewayJsonLogin(command)
  );
}
//@ chunk-h61dq9nz.js:39141-39167 affinity
function alwaysFalse(flag, program) {
  return false;
}
//@ chunk-h61dq9nz.js:39167-71312 fingerprint (2.1.88 match: run, 0.358)
/**
 * commander 构建器（旧版 run() 的前半）：new Command 并挂 preAction 钩子（MDM/钥匙串等待、--project-config-root、init()、客户端数据 URL、启动钩子、插件目录、迁移、远程托管设置/安全对话框、版本下限检查），定义根命令全部选项与 action（→ prepareSession → runHeadless 或 runInteractiveSession）。
 */
function buildCliProgram(hooks) {
  let program = new Command().configureHelp(createHelpConfig()).enablePositionalOptions();
  profileCheckpoint("run_commander_initialized");
  let earlyPluginKickDone = false;
  let storageV5;
  let credentials;
  let withStorageV5 =
    (config) =>
    (...args) =>
      config(storageV5, ...args);
  let withStartupHandles =
    (config) =>
    (...args) =>
      config(storageV5, credentials, ...args);
  program.hook("preAction", async (raw, flag) => {
    profileCheckpoint("preAction_start");
    let startTime = performance.now();
    if (flag !== program && raw.getOptionValueSource("desktop") === "cli") {
      let commandPath = [];
      for (let current = flag; current !== null && current !== program; current = current.parent)
        commandPath.unshift(current.name());
      return cliError(`--desktop can't be combined with \`claude ${commandPath.join(" ")}\`.`);
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
      let realRoot;
      try {
        realRoot = await realpath(optionValue);
        await (await opendir(realRoot)).close();
      } catch {
        return cliError("Error: --project-config-root is not an existing directory that this user can list");
      }
      if (isUntouchableSpelling(realRoot))
        return cliError("Error: --project-config-root resolves to a network location, not a local directory");
      setProjectConfigRoot(realRoot);
    }
    let kickStarted = false;
    function kickGrowthBook(site) {
      kickStarted = true;
      let kickDecision =
        flag === program &&
        raw.getOptionValue("deepLinkOrigin") !== true &&
        !hasRemoteHelperState() &&
        getBasePolicySettings()?.policyHelpers == null &&
        getBasePolicySettings()?.policyHelper == null
          ? judgeStartupGrowthBookKick(site, raw.getOptionValue("worktree") !== undefined)
          : "launch_excluded";
      markFlagFetchKick(kickDecision);
      if (didStartGrowthBookKick(kickDecision)) initializeGrowthBook().catch(() => {});
    }
    let isMainCommand = flag === program && raw.getOptionValue("desktop") !== true;
    if (!isMainCommand) declareNoHybridTokenRefresh();
    let flagA = true;
    let flagB = true;
    let optionValue_2 = raw.getOptionValue("clientDataUrl");
    let startClientDataUrlFetch = isMainCommand
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
    storageV5 = await init({
      showInvalidConfigDialog: hooks.showInvalidConfigDialog,
      storageV5EnvPin: hooks.storageV5EnvPin,
      preparesSession: isMainCommand,
      startupGrowthBookKick: env.CLAUDE_CODE_GROWTHBOOK_KICK_FROM_INIT
        ? () => kickGrowthBook("init")
        : undefined,
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
    credentials = credentialsStoreFor(storageV5);
    if (isStorageV5Enabled() && storageV5 !== undefined)
      initDefaultDebugLog({
        storageV5,
      });
    recordPhase("pre_action_init_ms", performance.now() - mcpConfigStart, mcpConfigStart);
    profileCheckpoint("preAction_after_init");
    let startTime_2 = performance.now();
    if (await applyPendingClientDataBaseUrl()) redoAuthDependentStartup();
    recordPhase("pre_action_client_data_url_ms", performance.now() - startTime_2, startTime_2);
    profileCheckpoint("preAction_after_client_data_url");
    let tools = shouldAskLauncherHostLogin({
      preparesSession: isMainCommand,
      inputFormat: raw.getOptionValue("inputFormat"),
      sdkUrl: raw.getOptionValue("sdkUrl"),
      awaitClaim: raw.getOptionValue("awaitClaim"),
      cloudSession: CLOUD_SESSION_OPTION_KEYS.some((key) => raw.getOptionValue(key) !== undefined),
      openStdin: readStreamJsonStdin,
    });
    if (tools !== null) {
      if (await tools) redoStartupAfterLauncherLogin(kickStarted);
      profileCheckpoint("preAction_after_launcher_sign_in");
    }
    if (!kickStarted) kickGrowthBook("after_init");
    if (!env.CLAUDE_CODE_DISABLE_TERMINAL_TITLE) process.title = "claude";
    let { initSinks } = await import("./utils/sinks.js");
    initSinks();
    profileCheckpoint("preAction_after_sinks");
    let setupStart = performance.now();
    let awaitResult = await awaitInitializeResult();
    if (awaitResult) recordPhase("await_initialize_ms", performance.now() - setupStart, setupStart);
    if (awaitResult?.kind === "violation") {
      printCliError(awaitResult.message);
      if (awaitResult.cause === "first_line")
        await writeStartupFailureResult({
          sessionId: getSessionId(),
          message: awaitResult.message,
          reason: "initialize_not_first",
        });
      return cliError();
    }
    let appliedAwaitResult = awaitResult?.kind === "applied" ? awaitResult : undefined;
    let pluginDirs = mergePluginDirs(
      asStringArray(raw.getOptionValue("pluginDir")),
      appliedAwaitResult?.pluginDirs ?? [],
    );
    if (pluginDirs.length > 0) {
      setInlinePlugins(pluginDirs);
      clearPluginCache("preAction: --plugin-dir inline plugins");
    }
    let pluginDirsNoMcp = mergePluginDirs(
      asStringArray(raw.getOptionValue("pluginDirNoMcp")),
      appliedAwaitResult?.pluginDirsNoMcp ?? [],
    );
    if (pluginDirsNoMcp.length > 0) {
      setInlinePluginsNoMcp(pluginDirsNoMcp);
      clearPluginCache("preAction: --plugin-dir-no-mcp inline plugins");
    }
    let urls = raw.getOptionValue("pluginUrl");
    if (Array.isArray(urls) && urls.length > 0 && urls.every((value) => typeof value === "string")) {
      setInlinePluginUrls(urls);
      clearPluginCache("preAction: --plugin-url inline plugins");
    }
    let effectiveReplayUserMessages = false;
    if (!effectiveReplayUserMessages) {
      let startTime = performance.now();
      await runAllMigrations(storageV5);
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
      let hasHelperState = hasRemoteHelperState();
      let helperResult = await runPolicyHelperPass(
        getBasePolicySettings(),
        getBasePolicySettingsOrigin(),
        getPolicyHelperSourceLoadErrors(),
      );
      if (helperResult) {
        await exitWithStartupFailure(policyHelperExitReason(getPolicyHelperSourceLoadErrors()), helperResult);
        return cliError();
      }
      if (hasRemoteHelperState() && !hasHelperState) {
        applySafeConfigEnvironmentVariables();
        configureProxyAuthHelperFromSettings();
        await rejudgeHostLaunchedGateway();
        resetRemoteSettingsSyncCache();
      }
    }
    let initialMainLoopModel = isForceRemoteSettingsRefreshConfigured();
    let gatewayRefusal = parsedAgents ? undefined : hostLaunchedGatewayRefusal(initialMainLoopModel);
    if (gatewayRefusal !== undefined)
      return exitRefusingBridgeFailure(
        initialMainLoopModel ? "force_refresh_failed" : "_OTHER",
        gatewayRefusal,
        "remote_settings_required_unavailable",
      );
    let flagC = false;
    markLoadCycleBegun();
    if (initialMainLoopModel && !parsedAgents) {
      let refreshResult = await validateForceRemoteSettingsRefresh(
        async () =>
          loadRemoteManagedSettings(await hooks.showSecurityDialog?.(), storageV5, {
            startupAwaited: true,
            credentials,
          }),
        machineForcedRefresh,
      );
      if (!refreshResult.valid)
        return exitRefusingBridgeFailure(
          "force_refresh_failed",
          hostLaunchedGatewayLoadRefusal(false) ?? refreshResult.message,
          remoteSettingsFailureReason(),
        );
      noteHostLaunchedGatewayWithoutPolicy();
    } else if (getAPIProvider() === "gateway" && !parsedAgents) {
      let remoteManagedSettings = await loadRemoteManagedSettings(
        await hooks.showSecurityDialog?.(),
        storageV5,
        {
          startupAwaited: true,
          credentials,
        },
      );
      let normalizedAdvisorModel = hostLaunchedGatewayLoadRefusal(remoteManagedSettings);
      if (normalizedAdvisorModel !== undefined) {
        let gatewayFailure = gatewaySettingsFailure();
        return exitRefusingBridgeFailure(
          gatewayFailure.forbidden ? "gateway_rejected" : "_OTHER",
          normalizedAdvisorModel,
          gatewayFailure.reason,
        );
      }
      if (!remoteManagedSettings) {
        let gatewaySignInFailure = gatewaySettingsFailure();
        if (
          !gatewaySignInFailure.endedSession ||
          flag !== program ||
          getIsNonInteractiveSession() ||
          isUnattendedInteractiveSession()
        )
          return exitRefusingBridgeFailure(
            gatewaySignInFailure.forbidden ? "gateway_rejected" : "_OTHER",
            gatewaySignInFailure.exitMessage,
            gatewaySignInFailure.reason,
          );
        continueSignedOutAfterGatewayEnd();
      }
    } else if (shouldWaitForRemotePolicy() && !parsedAgents)
      await Promise.resolve(hooks.showSecurityDialog?.())
        .then((settings) =>
          loadRemoteManagedSettings(settings, storageV5, {
            singleAttempt: true,
            startupAwaited: true,
            credentials,
          }),
        )
        .catch(logError);
    else
      Promise.resolve(hooks.showSecurityDialog?.())
        .then((managedSettings) =>
          loadRemoteManagedSettings(managedSettings, storageV5, {
            credentials,
          }),
        )
        .catch(logError);
    if (shouldPrefetchForCommand(flag, program)) {
      declareNoConsentSurface();
      markStartsNoSession();
    } else if (alwaysFalse(flag, program)) declareNoConsentSurface();
    else if (isPluginMutationCommand(flag)) declareStopsWhenApprovalCannotBeAsked();
    let startupAwaited = isMainCommand && shouldAwaitPolicyLimitsOnStartup();
    loadPolicyLimits({
      startupAwaited,
    });
    {
      let thinkingEnabled = getBasePolicySettingsOrigin();
      retireIfShadowedByRemote(thinkingEnabled);
      let policyHelperResult = await runPolicyHelperPass(
        getBasePolicySettings(),
        thinkingEnabled,
        getPolicyHelperSourceLoadErrors(),
      );
      if (policyHelperResult) {
        await exitWithStartupFailure(
          policyHelperExitReason(getPolicyHelperSourceLoadErrors()),
          policyHelperResult,
        );
        return cliError();
      }
      enableMidSessionArming(POLICY_HELPER_HOST);
      if (hasRemoteHelperState()) applySafeConfigEnvironmentVariables();
    }
    let stopWatchingMemoryPolicy = watchManagedMemoryPolicy(getRootSession());
    refreshed.subscribe(stopWatchingMemoryPolicy);
    let headlessStore = withoutPluginDirs(settlePluginDirsEnv(), pluginDirsNoMcp);
    if (headlessStore.length > 0) {
      setInlinePlugins(mergePluginDirs(pluginDirs, headlessStore));
      clearPluginCache("preAction: CLAUDE_CODE_PLUGIN_DIRS inline plugins");
    }
    if (areSideloadFlagsDisabledByPolicy()) {
      let pairs = [];
      let pairUpdater = (prev) =>
        Array.isArray(prev) ? prev.length > 0 : typeof prev === "string" && prev.length > 0;
      for (let [key, value] of [
        ["pluginDir", "--plugin-dir"],
        ["pluginDirNoMcp", "--plugin-dir-no-mcp"],
        ["pluginUrl", "--plugin-url"],
        ["agents", "--agents"],
      ])
        if (pairUpdater(raw.getOptionValue(key)) || pairUpdater(flag.getOptionValue(key))) pairs.push(value);
      if (
        appliedAwaitResult &&
        appliedAwaitResult.pluginDirs.length + appliedAwaitResult.pluginDirsNoMcp.length > 0
      )
        pairs.push("plugins (initialize request)");
      if (headlessStore.length > 0) pairs.push(PLUGIN_DIRS_ENV_VAR);
      if (pairs.length > 0 && headlessStore.length > 0) {
        let nextCtx = sideloadFlagsBlockedMessage(pairs);
        return cliError(`${nextCtx} ${PLUGIN_DIRS_ENV_RECOVERY_HINT}`);
      }
      if (pairs.length > 0) return cliError(sideloadFlagsBlockedMessage(pairs));
    }
    let versionBounds = checkCommandVersionBounds(flag);
    if (versionBounds) {
      await exitWithStartupFailure("version_below_minimum", versionBounds);
      return cliError();
    }
    settingsChangeDetector.subscribe((prev) => {
      if (prev === "policySettings") stopWatchingMemoryPolicy();
    });
    recordPhase("pre_action_managed_settings_ms", performance.now() - commandsStart, commandsStart);
    profileCheckpoint("preAction_after_remote_settings");
    if (effectiveReplayUserMessages && !isBigQueryMetricsEnabled()) {
      let startTime = performance.now();
      await runAllMigrations(storageV5);
      recordPhase("pre_action_migrations_ms", performance.now() - startTime, startTime);
    }
    if (
      isMainCommand &&
      raw.getOptionValue("worktree") === undefined &&
      !env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL
    ) {
      let dirs = raw.getOptionValue("addDir");
      if (Array.isArray(dirs) && dirs.every((prev) => typeof prev === "string"))
        setAdditionalDirectoriesForClaudeMd(dirs);
      initBuiltinPlugins();
      loadAllPluginsCacheOnly(storageV5, credentials).catch(() => {});
      earlyPluginKickDone = true;
      profileCheckpoint("preAction_after_plugin_early_kick");
    }
    recordPhase("pre_action_ms", performance.now() - startTime, startTime);
    markStartupActionStarted(isMainCommand);
  });
  let rootCommand = program
    .name("claude")
    .description(
      "Claude Code - starts an interactive session by default, use -p/--print for non-interactive output",
    )
    .argument("[prompt]", "Your prompt", String)
    .helpOption("-h, --help", "Display help for command")
    .option(
      "-d, --debug [filter]",
      "Enable debug mode with optional category filtering (e.g., --debug=hooks,mcp or --debug='!hooks,!mcp')",
      (value) => true,
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
        .argParser((value) => {
          if (!isEnvTruthy(value) && !isEnvDefinedFalsy(value))
            throw new InvalidArgumentError("Allowed choices are true, false, 1, 0, yes, no, on, off.");
          return !isEnvDefinedFalsy(value);
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
        .argParser((value) => {
          if (value !== "on" && value !== "off")
            throw new InvalidArgumentError("Allowed choices are on, off.");
          return value === "on";
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
        .argParser((decoded) => Buffer.from(decoded, "base64url").toString("utf8"))
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
      ).argParser((value) => {
        let { level, warning } = parseEffortFlag(value);
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
  let getEarlyPluginKickDone = () => earlyPluginKickDone;
  rootCommand
    .action(async (name, options) => {
      let normalizedOptions = foldRestricted(options, isRestrictedSession());
      if (normalizedOptions.desktop) {
        let { launchDesktopFromCli } = await import("./cli/handlers/launchDesktopFromCli.lazy.js");
        return exitAfterAnalyticsFlush(
          await launchDesktopFromCli({
            continue: !!normalizedOptions.continue,
            resume: normalizedOptions.resume,
            nonInteractive: getIsNonInteractiveSession(),
            suppliedOptions: getCliSuppliedOptions(program),
            prompt: name,
            pipedStdin: !process.stdin.isTTY,
            pendingConnect: Boolean(hooks.pendingConnect?.url),
            pendingSsh: Boolean(hooks.pendingSSH?.host),
            storageV5,
          }),
        );
      }
      let session = await prepareSession(
        name,
        normalizedOptions,
        program,
        getEarlyPluginKickDone,
        hooks.pendingConnect,
        hooks.pendingSSH,
        hooks,
        storageV5,
        credentials,
      );
      if (session.kind === "exited") return;
      if (session.kind === "prepared-headless")
        return runPreparedHeadless(session, normalizedOptions, hooks.openLiveBackgroundSessionForResume);
      if (!hooks.runInteractiveSession)
        return cliError("Interactive session requires the runInteractiveSession capability");
      return hooks.runInteractiveSession(session, normalizedOptions);
    })
    .version(
      `${
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
    let proactivityOption = new Option("--proactivity <level>", undefined).choices(PROACTIVITY_MODES);
    program.addOption(alwaysFalse_2() ? proactivityOption : proactivityOption.hideHelp());
  }
  program.addOption(new Option("--agents-view-if-allowed").hideHelp());
  program.addOption(
    new Option(
      "--bg, --background",
      "Start the session in the background and return immediately. Prints the id that `claude attach`, `logs`, `stop` and `rm` take; `claude agents` lists them. With --resume <session-id>, continues that session in the background under the same ID, or starts a copy and says so when the session is already running",
    ),
  );
  {
    let messagingSocketOption = new Option(
      "--messaging-socket-path <path>",
      "Cross-session messaging server path: a Unix domain socket on Mac/Linux, a \\\\.\\pipe\\ name on Windows (defaults to an auto-generated path)",
    );
    messagingSocketOption.hideHelp();
    program.addOption(messagingSocketOption);
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
  let warnedFirstArg = false;
  program.addOption(
    new Option("--runner-declares <names>").hideHelp().argParser((logId) => {
      if (
        !warnedFirstArg &&
        isByocEnvironment() &&
        !hasRunnerDeclaredNestedRepoDiff() &&
        logId.split(",").includes(DECLARES_DIFF_FINDS_NESTED_REPOSITORY)
      ) {
        warnedFirstArg = true;
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
    rootCommand,
    withStorageV5,
    withStartupHandles,
  };
}
//@ chunk-nhaxap13.js:25936-27042 placement
var TELEMETRY_SAFE_ENV_VAR_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-nhaxap13.js:25936", () => {
  TELEMETRY_SAFE_ENV_VAR_NAMES = new Set([
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
});
//@ chunk-nhaxap13.js:27042-27204 placement
function summarizeSetEnvVarNames(envVarNames) {
  let declaredNames = new Set([
    ...declaredEnvVarNames(env),
    ...declaredEnvVarNames(antEnv),
    ...declaredEnvVarNames(udsEnv),
    ...declaredEnvVarNames(tetherEnvAccessor),
    ...declaredEnvVarNames(toolServerEnvAccessor),
    ...declaredEnvVarNames(envOverrideAccessor),
  ]);
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(
    envVarNames
      .map((envVarName) =>
        declaredNames.has(envVarName) || TELEMETRY_SAFE_ENV_VAR_NAMES.has(envVarName) ? envVarName : "other",
      )
      .join(","),
  );
}
//@ chunk-nhaxap13.js:27204-27450 placement
function consumeBridgeChildProjectsEntrypoint() {
  {
    let isBridgeEntrypoint = env.CLAUDE_CODE_BRIDGE_CHILD_PROJECTS_ENTRYPOINT === true;
    env.unset("CLAUDE_CODE_BRIDGE_CHILD_PROJECTS_ENTRYPOINT");
    if (isBridgeEntrypoint && isBridgeEnvironment())
      if (useLocalProjectsEntrypoint()) logFeatureOk("bridge_projects_entrypoint_name");
      else logFeatureSad("bridge_projects_entrypoint_name", "host_name_kept");
  }
}
//@ chunk-nhaxap13.js:29337-29434 placement
var SDK_ENTRYPOINTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-nhaxap13.js:29337", () => {
  SDK_ENTRYPOINTS = new Set([
    "sdk-ts",
    "sdk-py",
    "sdk-cli",
    "local-agent",
    "claude-desktop",
    "claude-desktop-3p",
  ]);
});
//@ chunk-nhaxap13.js:29434-29464 placement
/**
 * 进程级警告处理：initializeWarningHandler + 定时器夹紧 + 另一个进程钩子。
 */
function installProcessWarningHandlers() {
  initializeWarningHandler();
  installTimerDelayClamp();
  registerClientDataGetters();
}
//@ chunk-nhaxap13.js:29464-32429 fingerprint (2.1.88 match: main, 0.469)
/**
 * main() 的前半（旧版 main 的同名部分）：判定是否非交互（-p/--print、非 TTY 等）并 setIsInteractive、从环境写入 launchOptions、读取 fd 传入的 OAuth/API key/WebSocket 令牌（code review 环境下强制要求 fd 4/5）、推断 clientType（github-action/sdk-*\/claude-vscode/remote/cli…）、预读 --settings。
 */
function applyClientTypeAndEarlySettings({ interactivity }) {
  let rawCliArgs = process.argv.slice(2);
  let isNonInteractive = interactivity.kind === "non-interactive" || detectNonInteractiveLaunch(rawCliArgs);
  if (isNonInteractive) stopCapturingEarlyInput();
  setIsInteractive(!isNonInteractive);
  initializeLaunchOptionsFromEnv(isNonInteractive);
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
    let dumpableError;
    disableCoreDumps((arg) => {
      dumpableError = arg;
    });
    if (dumpableError !== undefined) {
      process.stderr
        .write(`[code review] Not starting: Claude Code could not make itself non-dumpable (${dumpableError}), so the review's commands could read its tokens from memory. Start it with the released claude binary (check --exec-path), and allow prctl(PR_SET_DUMPABLE) in any sandbox or seccomp profile around it.
`);
      process.exit(1);
    }
    let hasEnvToken =
      env.CLAUDE_CODE_OAUTH_TOKEN !== undefined ||
      (process.env.CLAUDE_CODE_SESSION_ACCESS_TOKEN ?? "") !== "";
    let hasOauthFd = Boolean(env.CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR);
    let hasIngressFd = Boolean(env.CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR);
    if (
      (eagerParseCliFlag("--sdk-url") !== undefined || hasEnvToken || hasOauthFd || hasIngressFd) &&
      (hasEnvToken ||
        !hasOauthFd ||
        !hasIngressFd ||
        !getOAuthTokenFromFileDescriptor() ||
        !getSessionIngressAuthToken())
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
    !(clientType === "claude-vscode" && isNonInteractive)
  )
    setQuestionPreviewFormat("markdown");
  let isSdkEntrypoint = SDK_ENTRYPOINTS.has(env.CLAUDE_CODE_ENTRYPOINT ?? "") || clientType === "remote";
  if (isSdkEntrypoint && env.CLAUDE_CODE_QUESTION_EXTENDED) setExtendedQuestionsEnabled(true);
  if (isSdkEntrypoint && env.CLAUDE_CODE_QUESTION_OPTIONAL_DESCRIPTIONS)
    setQuestionOptionDescriptionsOptional(true);
  if (isNonInteractive && env.CLAUDE_CODE_AGENT_PROGRESS_SUMMARIES) setSdkAgentProgressSummariesEnabled(true);
  profileCheckpoint("main_client_type_determined");
  eagerLoadSettings();
}
//@ chunk-nhaxap13.js:32429-32493 placement
var BYPASS_IGNORED_NOTICE = "Bypass permissions was requested at launch and ignored";
//@ chunk-nhaxap13.js:32493-32651 placement
function bypassIgnoredHint(settingsPath) {
  return ` \xB7 if that was you, ${isSettingSourceEnabled("userSettings") ? "" : "relaunch with user settings on; "}${settingsPath} needs "skipDangerousModePermissionPrompt": true`;
}
//@ chunk-nhaxap13.js:32651-33065 placement
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
  let settingsPath = tildify(getSettingsFilePathForSource("userSettings") ?? "~/.claude/settings.json");
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
            text: bypassIgnoredHint(settingsPath),
            dim: true,
          },
        ],
      },
    ],
  };
}
//@ chunk-nhaxap13.js:33065-33241 placement
function startRemoteControlAutoConnect(gate, autoconnect) {
  let deferred = Promise.withResolvers();
  if (isCleanupStarted()) deferred.resolve();
  let runPromise = autoconnect(Promise.race([waitForGate(gate), deferred.promise])).catch((error) =>
    logError(toError(error)),
  );
  let unregister = registerCleanup(async () => {
    deferred.resolve();
    await runPromise;
  });
  runPromise.then(unregister);
}
//@ chunk-nhaxap13.js:33241-33827 placement
function resolveRemoteControlAtStartup({ remoteControlFlag, isRemoteThinClient }) {
  let CLAUDE_CODE_REMOTE = env.CLAUDE_CODE_REMOTE;
  let explicitRemoteControlAtStartup = resolveExplicitRemoteControlAtStartup();
  let autoConnectDefault =
    !isRemoteThinClient &&
    !CLAUDE_CODE_REMOTE &&
    !remoteControlFlag &&
    explicitRemoteControlAtStartup.value === undefined
      ? resolveCcrAutoConnectDefault()
      : undefined;
  let shouldEnable =
    !isRemoteThinClient &&
    !CLAUDE_CODE_REMOTE &&
    (remoteControlFlag || (explicitRemoteControlAtStartup.value ?? autoConnectDefault?.value ?? false));
  let ccrMirror = false;
  let reattach = Boolean(env.CLAUDE_BRIDGE_REATTACH_SESSION);
  let CLAUDE_BRIDGE_REATTACH_OUTBOUND_ONLY = env.CLAUDE_BRIDGE_REATTACH_OUTBOUND_ONLY;
  let bridgeEnabled = shouldEnable || ccrMirror || (reattach && !CLAUDE_BRIDGE_REATTACH_OUTBOUND_ONLY);
  let outboundOnly = !shouldEnable && (reattach ? CLAUDE_BRIDGE_REATTACH_OUTBOUND_ONLY : ccrMirror);
  return {
    replBridgeEnabled: bridgeEnabled,
    replBridgeAutoOnByDefault:
      shouldEnable && !remoteControlFlag && !reattach && explicitRemoteControlAtStartup.value === undefined,
    replBridgeExplicit:
      remoteControlFlag || (reattach && !CLAUDE_BRIDGE_REATTACH_OUTBOUND_ONLY && !shouldEnable),
    replBridgeOutboundOnly: outboundOnly,
    explicit: explicitRemoteControlAtStartup,
    autoConnectDefault,
    ccrMirrorEnabled: ccrMirror,
    remoteControlFlag,
    envRemote: CLAUDE_CODE_REMOTE,
    isRemoteThinClient,
    reattach,
    result: !bridgeEnabled ? "off" : outboundOnly ? "mirror" : "full",
  };
}
//@ chunk-nhaxap13.js:33827-34265 placement
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
//@ chunk-nhaxap13.js:34265-34291 placement
function identity2(value, defaultedToCloud) {
  return value;
}
//@ chunk-nhaxap13.js:34291-34515 affinity
function hasWarningNotice(messages, { current, queue, pinned }) {
  return (
    messages.some(
      (message) =>
        message.type === "system" && message.subtype === "informational" && message.level === "warning",
    ) ||
    [current, ...queue, ...pinned].some(
      (queued) =>
        queued?.kind === "warning" || (queued !== null && "color" in queued && queued.color === "warning"),
    )
  );
}
//@ chunk-nhaxap13.js:34584-34635 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-nhaxap13.js:34584", () => {
  process.env.NoDefaultCurrentDirectoryInExePath = "1";
});
//@ chunk-nhaxap13.js:34635-34656 fingerprint
// deferred: uses profileCheckpoint (./utils/startupProfiler.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-nhaxap13.js:34635", () => {
  profileCheckpoint("main_tsx_entry");
});
//@ chunk-nhaxap13.js:34656-34699 layout
// deferred: uses recordPhase (./utils/startupTiming.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-nhaxap13.js:34656", () => {
  recordPhase("node_boot_ms", process.uptime() * 1000, 0);
});
//@ chunk-nhaxap13.js:34699-34705 layout
// deferred: uses recordSpawnToExec (./utils/startupTiming.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-nhaxap13.js:34699", () => {
  recordSpawnToExec();
});
//@ chunk-nhaxap13.js:34705-34711 layout
// deferred: uses startMdmRawRead (./utils/settings/mdm/rawRead.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-nhaxap13.js:34705", () => {
  startMdmRawRead();
});
//@ chunk-nhaxap13.js:34711-34717 layout
// deferred: uses startKeychainPrefetch (./utils/secureStorage/keychainPrefetch.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-nhaxap13.js:34711", () => {
  startKeychainPrefetch();
});
//@ chunk-nhaxap13.js:34717-34797 layout
var dialogLaunchersModule = () => require("./launchCloudCreateChecklist.lazy.js");
var interactiveHelpersModule = () => require("./interactiveHelpers.js");
//@ chunk-nhaxap13.js:34797-34836 layout
function lazyCall(getFn) {
  return (...args) => getFn()(...args);
}
//@ chunk-nhaxap13.js:34836-35632 layout
/**
 * main.tsx 用到的懒加载函数表：每个都是 lazyCall(() => require(对话框/交互帮助模块).X)，避免启动时加载 Ink 组件。
 */
var launchProviderSetupWizard; // deferred: uses lazyCall of its import cycle while loading; runs once the cycle is complete
var launchCloudCreateChecklist;
var launchInvalidSettingsDialog;
var launchDeviceMcpConsentDialog;
var launchDeviceMcpReconsentDialog;
var launchDeviceReenrollDialog;
var launchRemoteFileModeDialog;
var launchRemoteHomeSettingsDialog;
var launchUnattendedServingConsentDialog;
var launchResumeChooser;
var launchSnapshotUpdateDialog;
var launchTeleportHostUnverifiedDialog;
var launchTeleportRepoMismatchDialog;
var launchTeleportResumeWrapper;
var exitWithError;
var getRenderContext;
var renderAndRun;
var showSetupScreens;
var showSettingsLoadHold;
deferInit("chunk-nhaxap13.js:34836", () => {
  launchProviderSetupWizard = lazyCall(() => dialogLaunchersModule().launchProviderSetupWizard);
  launchCloudCreateChecklist = lazyCall(() => dialogLaunchersModule().launchCloudCreateChecklist);
  launchInvalidSettingsDialog = lazyCall(() => dialogLaunchersModule().launchInvalidSettingsDialog);
  launchDeviceMcpConsentDialog = lazyCall(() => dialogLaunchersModule().launchDeviceMcpConsentDialog);
  launchDeviceMcpReconsentDialog = lazyCall(() => dialogLaunchersModule().launchDeviceMcpReconsentDialog);
  launchDeviceReenrollDialog = lazyCall(() => dialogLaunchersModule().launchDeviceReenrollDialog);
  launchRemoteFileModeDialog = lazyCall(() => dialogLaunchersModule().launchRemoteFileModeDialog);
  launchRemoteHomeSettingsDialog = lazyCall(() => dialogLaunchersModule().launchRemoteHomeSettingsDialog);
  launchUnattendedServingConsentDialog = lazyCall(
    () => dialogLaunchersModule().launchUnattendedServingConsentDialog,
  );
  launchResumeChooser = lazyCall(() => dialogLaunchersModule().launchResumeChooser);
  launchSnapshotUpdateDialog = lazyCall(() => dialogLaunchersModule().launchSnapshotUpdateDialog);
  launchTeleportHostUnverifiedDialog = lazyCall(
    () => dialogLaunchersModule().launchTeleportHostUnverifiedDialog,
  );
  launchTeleportRepoMismatchDialog = lazyCall(() => dialogLaunchersModule().launchTeleportRepoMismatchDialog);
  launchTeleportResumeWrapper = lazyCall(() => dialogLaunchersModule().launchTeleportResumeWrapper);
  exitWithError = lazyCall(() => interactiveHelpersModule().exitWithError);
  getRenderContext = lazyCall(() => interactiveHelpersModule().getRenderContext);
  renderAndRun = lazyCall(() => interactiveHelpersModule().renderAndRun);
  showSetupScreens = lazyCall(() => interactiveHelpersModule().showSetupScreens);
  showSettingsLoadHold = lazyCall(() => interactiveHelpersModule().showSettingsLoadHold);
});
//@ chunk-nhaxap13.js:35632-35662 fingerprint
// deferred: uses profileCheckpoint (./utils/startupProfiler.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-nhaxap13.js:35632", () => {
  profileCheckpoint("main_tsx_imports_loaded");
});
//@ chunk-nhaxap13.js:35662-35793 layout
var loadStandaloneSecurityDialog = () =>
  getIsNonInteractiveSession()
    ? Promise.resolve(undefined)
    : import("./components/ManagedSettingsSecurityDialog/showStandaloneSecurityDialog.js").then(
        (mod) => mod.showStandaloneSecurityDialog,
        (error) => {
          logError(error);
          return;
        },
      );
//@ chunk-nhaxap13.js:35793-36085 fingerprint (2.1.88 match: isBeingDebugged, 1)
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
//@ chunk-nhaxap13.js:36085-36109 callgraph-fingerprint
// deferred: uses isBeingDebugged of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-nhaxap13.js:36085", () => {
  if (isBeingDebugged()) process.exit(1);
});
//@ chunk-nhaxap13.js:36109-36570 layout
/**
 * 统计 autoMode 规则（allow/soft_deny/hard_deny/environment）条数与总词数，供启动遥测。
 */
function getAutoModeRuleCounts() {
  let autoModeConfig = getAutoModeConfig();
  let counts = {
    allow: 0,
    soft_deny: 0,
    hard_deny: 0,
    environment: 0,
  };
  let autoModeRuleWordCount = 0;
  for (let category of ["allow", "soft_deny", "hard_deny", "environment"])
    for (let rule of autoModeConfig?.[category] ?? []) {
      if (rule === DEFAULTS_PLACEHOLDER) continue;
      counts[category] += countWhere(
        rule.split(`
`),
        (line) => line.trim().length > 0,
      );
      autoModeRuleWordCount += countWhere(rule.split(/\s+/), Boolean);
    }
  return {
    auto_mode_allow_rule_count: counts.allow,
    auto_mode_soft_deny_rule_count: counts.soft_deny,
    auto_mode_hard_deny_rule_count: counts.hard_deny,
    auto_mode_environment_rule_count: counts.environment,
    auto_mode_rule_word_count: autoModeRuleWordCount,
  };
}
//@ chunk-nhaxap13.js:36570-36872 fingerprint (2.1.88 match: getCertEnvVarTelemetry, 0.905)
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
//@ chunk-nhaxap13.js:36872-37808 fingerprint (2.1.88 match: logStartupTelemetry, 0.616)
/**
 * 发送 tengu_startup_telemetry：git/worktree 数、gh 登录状态、沙箱开关、自动更新是否禁用、主题、设置过的环境变量名与非默认设置等。
 */
async function logStartupTelemetry(globals, extraFields) {
  if (isFirstPartyTelemetryBlocked()) return;
  let [isGit, worktreeCount, ghAuthStatus, placeholder] = await Promise.all([
    getIsGit(),
    getWorktreeCount(),
    getGhAuthStatus({
      allowNetworkFallbackForOldGh: false,
    }),
    null,
  ]);
  let setEnvVars = envVarsForTelemetry();
  let nonDefaultKeys = nonDefaultGlobalConfigKeys(globals);
  let userSettingKeys = setUserSettingKeys(getInitialSettings());
  let themeValue = resolveSetting("theme", "dark").value;
  let setting = resolveSetting("precomputeCompactionEnabled", true);
  logEvent("tengu_startup_telemetry", {
    is_git: isGit,
    worktree_count: worktreeCount,
    ...extraFields,
    ...false,
    warm_spare_claimed: wasWarmSpareClaimed(),
    gh_auth_status: fromEnum(ghAuthStatus.status),
    sandbox_enabled: SandboxManager.isSandboxingEnabled(),
    are_unsandboxed_commands_allowed: SandboxManager.areUnsandboxedCommandsAllowed(),
    is_auto_bash_allowed_if_sandbox_enabled: SandboxManager.isAutoAllowBashIfSandboxedEnabled(),
    auto_updater_disabled: isAutoUpdaterDisabled(),
    prefers_reduced_motion: getInitialSettings().prefersReducedMotion ?? false,
    precompute_compaction_setting_enabled: setting.value,
    precompute_compaction_setting_source: fromEnum(setting.source),
    theme: fromEnumOpt(CONFIG_SOURCE_LABELS.find((label) => label === themeValue)) ?? lit("custom"),
    set_env_var_count: setEnvVars.length,
    set_env_vars: summarizeSetEnvVarNames(setEnvVars),
    nondefault_setting_count: nonDefaultKeys.length,
    nondefault_settings: fromEnumArr(nonDefaultKeys),
    set_user_settings_count: userSettingKeys.length,
    set_user_settings: fromEnumArr(userSettingKeys),
    ...getCertEnvVarTelemetry(),
    ...getAutoModeRuleCounts(),
  });
}
//@ chunk-nhaxap13.js:37808-38733 placement
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
    let uriError = validateHandleUriArgs(process.argv);
    if (uriError) {
      console.error(uriError);
      process.exit(1);
    }
    let uri = process.argv[index + 1];
    let { enableConfigs } = await import("./utils/config.js");
    await enableConfigs(isStorageV5Enabled() ? storageV5EnvPin?.backend : undefined);
    let { handleDeepLinkUri } = await import("./utils/deepLink/protocolHandler.js");
    let exitCode = await handleDeepLinkUri(uri);
    process.exit(exitCode);
  }
  let argsAsTyped = process.argv.slice(2);
  let pendingConnect = undefined;
  let pendingSSH = undefined;
  {
    let importArgv = parseImportArgv(process.argv.slice(2));
    if (importArgv !== null) {
      let { enableConfigs } = await import("./utils/config.js");
      let importEnabled;
      try {
        await enableConfigs(isStorageV5Enabled() ? storageV5EnvPin?.backend : undefined);
        importEnabled = isImportEnabled();
      } catch {
        importEnabled = undefined;
      }
      let rewrite = planImportRewrite(importArgv, importEnabled);
      if (rewrite.kind === "rewrite") process.argv = [process.argv[0], process.argv[1], ...rewrite.argv];
      else
        return cliError(
          rewrite.kind === "config-error" ? CONFIG_UNREADABLE_MESSAGE : IMPORT_UNAVAILABLE_MESSAGE,
        );
    }
  }
  applyClientTypeAndEarlySettings({
    interactivity: {
      kind: "detect",
    },
  });
  profileCheckpoint("main_before_run");
  await run(pendingConnect, pendingSSH, storageV5EnvPin, argsAsTyped);
  profileCheckpoint("main_after_run");
}
//@ chunk-nhaxap13.js:38733-50952 placement
/**
 * 调用 commander 构建器（runCommander/Lks）得到 program，注册全部子命令（gateway、mcp、plugin、auth、setup-token、agents、ultrareview、auto-mode、remote-control、doctor、sandbox、update、install、import…），然后 parseAsync(process.argv)。-p 或非 help 时跳过子命令注册以加快启动。
 */
async function run(pendingConnect, pendingSSH, storageV5EnvPin, argsAsTyped) {
  profileCheckpoint("run_function_start");
  let { program, withStorageV5, withStartupHandles } = buildCliProgram({
    storageV5EnvPin,
    showSecurityDialog: loadStandaloneSecurityDialog,
    showInvalidConfigDialog: (errors) =>
      import("./components/InvalidConfigDialog.js").then((mod) => mod.showInvalidConfigDialog(errors)),
    showOrgConfigBlockedScreen: () =>
      import("./components/OrgConfigBlockedScreen.js").then(
        (mod) => mod.showOrgConfigBlockedScreen,
        (error) => {
          logError(error);
          return;
        },
      ),
    endInkWithError: (error, options) => interactiveHelpersModule().endInkWithError(error, options),
    runOnboarding: (options) => runOnboardingAndSetupScreens(options),
    handleInvalidSettings: (options, settingsErrors) =>
      launchInvalidSettingsDialog(options, {
        settingsErrors,
        onExit: () => gracefulShutdownSync(1),
      }),
    runInteractiveSession: (options, extra) =>
      runInteractiveSession(options, extra, pendingConnect, pendingSSH),
    pendingConnect,
    pendingSSH,
    argsAsTyped,
    openLiveBackgroundSessionForResume: tryOpenLiveBackground,
  });
  let command = process.argv.slice(2);
  let isPrintMode = eagerHasCliFlag("-p", command) || eagerHasCliFlag("--print", command);
  let isConnectUrl = eagerFindCliArg(isConnectUrlArg, command) !== -1;
  if (isPrintMode && !isConnectUrl) {
    profileCheckpoint("run_before_parse");
    await program.parseAsync(process.argv);
    profileCheckpoint("run_after_parse");
    return program;
  }
  if (!mayDispatchSubcommand(command) && !isConnectUrl) {
    profileCheckpoint("run_before_parse");
    await program.parseAsync(process.argv);
    profileCheckpoint("run_after_parse");
    profileCheckpoint("main_after_run");
    profileReport();
    return program;
  }
  {
    let gatewayCommand = program
      .command("gateway")
      .description("Run the enterprise auth/telemetry gateway")
      .requiredOption("--config <path>", "Path to gateway YAML config")
      .action(async ({ config }) => {
        try {
          let { startGateway } = await import("./services/claudeGateway/startGateway.lazy.js");
          let { drainOnSignal } = await import("./cli/handlers/drainOnSignal.lazy.js");
          drainOnSignal(await startGateway(config), claimShutdown);
        } catch (error) {
          process.stderr.write(`claude gateway: ${error instanceof Error ? error.message : String(error)}
`);
          process.exit(1);
        }
      });
    program.hook("preSubcommand", (subcommand, thisCommand) => {
      if (thisCommand === gatewayCommand) setGatewayServerProcess(true);
    });
  }
  let { registerMcpCommands } = require("./commands/mcp/registerMcpCommands.js");
  let { registerPluginCommands } = require("./cli/handlers/pluginCommands.js");
  registerMcpCommands(program, withStorageV5);
  registerEditHookCommand(program, withStorageV5);
  registerPermissionsCommands(program, withStorageV5);
  let authCommand = program
    .command("auth")
    .description("Manage authentication")
    .configureHelp(createHelpConfig());
  authCommand
    .command("login")
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
      withStartupHandles(
        async (options, extra, { email, sso, console: consoleLogin, claudeai, gatewayJson }) => {
          let { authLogin } = await import("./cli/handlers/auth.js");
          await authLogin(
            {
              email,
              sso,
              console: consoleLogin,
              claudeai,
              gatewayJson,
            },
            options,
            extra,
          );
        },
      ),
    );
  authCommand
    .command("status")
    .description("Show authentication status")
    .option("--json", "Output as JSON (default)")
    .option("--text", "Output as human-readable text")
    .action(
      withStorageV5(async (options, extra) => {
        let [{ authStatus }, { createSubcommandRoot }, { credentialsStoreFor }] = await Promise.all([
          import("./cli/handlers/auth.js"),
          import("./cli/handlers/util.js"),
          import("./utils/secureStorage/credentialsFileStore.js"),
        ]);
        await authStatus(await createSubcommandRoot(), extra, credentialsStoreFor(options));
      }),
    );
  authCommand
    .command("logout")
    .description("Log out from your Anthropic account")
    .action(
      withStartupHandles(async (options, extra) => {
        let [{ authLogout }, { createSubcommandRoot }, { exitAfterAnalyticsFlush }] = await Promise.all([
          import("./cli/handlers/auth.js"),
          import("./cli/handlers/util.js"),
          import("./cli/exit.js"),
        ]);
        await authLogout(await createSubcommandRoot(), options, extra);
        await exitAfterAnalyticsFlush(0);
      }),
    );
  let purgeCommands = registerPurgeCommands(program, withStorageV5);
  registerPluginCommands(program, withStorageV5, withStartupHandles);
  program
    .command("setup-token")
    .description("Set up a long-lived authentication token (requires Claude subscription)")
    .allowExcessArguments(false)
    .action(async (options) => {
      let [{ setupTokenHandler }, { createRoot }] = await Promise.all([
        import("./cli/handlers/util.js"),
        import("./ink/components/Ansi.lazy.js"),
      ]);
      let root = await createRoot(getBaseRenderOptions(false));
      await setupTokenHandler(root, options);
    });
  let agentsCommand = program
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
      withStartupHandles(async (options, extra, positional, command) => {
        let { agentsCommandHandler } = await import("./cli/handlers/agents.js");
        await agentsCommandHandler(positional, command.optsWithGlobals(), options, extra);
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
    .addOption(new Option("--list <file>").hideHelp())
    .addOption(new Option("--output <file>").hideHelp())
    .addOption(new Option("--max-cost <dollars>").hideHelp())
    .action(
      withStartupHandles(async (target, options, arg, command, handles) => {
        let { ultrareviewEvalHandler } =
          await import("./commands/ultrareview/ultrareviewEvalHandler.lazy.js");
        await ultrareviewEvalHandler(arg, handles.args.slice(1), command, options);
        let { ultrareviewHandler } = await import("./commands/ultrareview/ultrareviewHandler.lazy.js");
        await ultrareviewHandler(arg ?? "", command, target, options);
        process.exit(0);
      }),
    );
  {
    let autoModeCommand = program
      .command("auto-mode")
      .description("Inspect or reset auto mode configuration");
    autoModeCommand
      .command("defaults")
      .description("Print the default auto mode environment, allow, soft_deny, and hard_deny rules as JSON")
      .option("--label <prefix>", "Show only rules whose label starts with this prefix (case-insensitive)")
      .action(async ({ label }) => {
        let [{ autoModeDefaultsHandler }, { createSubcommandRoot }, { exitAfterAnalyticsFlush }] =
          await Promise.all([
            import("./cli/handlers/autoModeConfigHandler.lazy.js"),
            import("./cli/handlers/util.js"),
            import("./cli/exit.js"),
          ]);
        await autoModeDefaultsHandler(await createSubcommandRoot(), label);
        await exitAfterAnalyticsFlush(0);
      });
    autoModeCommand
      .command("config")
      .description(
        "Print the effective auto mode config as JSON: your settings where set, defaults otherwise",
      )
      .action(async () => {
        let [{ autoModeConfigHandler }, { createSubcommandRoot }, { exitAfterAnalyticsFlush }] =
          await Promise.all([
            import("./cli/handlers/autoModeConfigHandler.lazy.js"),
            import("./cli/handlers/util.js"),
            import("./cli/exit.js"),
          ]);
        await autoModeConfigHandler(await createSubcommandRoot());
        await exitAfterAnalyticsFlush(0);
      });
    autoModeCommand
      .command("reset")
      .description(
        "Reset auto mode configuration to the shipped defaults by removing the autoMode section from your user settings file",
      )
      .option("-y, --yes", "Skip the confirmation prompt")
      .action(
        withStorageV5(async (options, command) => {
          let [{ autoModeResetHandler }, { exitAfterAnalyticsFlush }] = await Promise.all([
            import("./cli/handlers/autoModeConfigHandler.lazy.js"),
            import("./cli/exit.js"),
          ]);
          await autoModeResetHandler(command, options);
          await exitAfterAnalyticsFlush(0);
        }),
      );
    autoModeCommand
      .command("critique")
      .description("Get AI feedback on your custom auto mode rules")
      .option("--model <model>", "Override which model is used")
      .action(
        withStartupHandles(async (options, command, arg) => {
          let [{ autoModeCritiqueHandler }, { createSubcommandRoot }, { exitAfterAnalyticsFlush }] =
            await Promise.all([
              import("./cli/handlers/autoModeConfigHandler.lazy.js"),
              import("./cli/handlers/util.js"),
              import("./cli/exit.js"),
            ]);
          await autoModeCritiqueHandler(await createSubcommandRoot(), arg, command);
          await exitAfterAnalyticsFlush(0);
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
      withStartupHandles(async (options, extra, arg, command) => {
        let { enterRemoteControl, rootOptionsRefusedMessage, rootOptionsRemoteControlRefuses } =
          await import("./bridge/enterRemoteControl.lazy.js");
        let refusedOptions = rootOptionsRemoteControlRefuses(getCliSuppliedOptions(program));
        if (refusedOptions.length > 0) return cliError(rootOptionsRefusedMessage(refusedOptions));
        await enterRemoteControl(command.args, options, extra);
      }),
    );
  program
    .command("doctor")
    .description(
      "Check the health of your Claude Code installation. Reads settings files in the current directory without a trust prompt. For a full checkup that can also fix issues, run /doctor in a session.",
    )
    .action(
      withStorageV5(async (options) => {
        let { doctorHandler } = await import("./cli/handlers/util.js");
        await doctorHandler(options);
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
      withStartupHandles(async (options, extra) => {
        let { applyProjectSettingsHandler } =
          await import("./components/settings/applyProjectSettingsHandler.lazy.js");
        await applyProjectSettingsHandler(getRootSession(), options, extra);
      }),
    );
  let sandboxCommand = program.command("sandbox", {
    hidden: true,
  });
  sandboxCommand
    .command("install")
    .description(
      'Install the Windows sandbox user and network filters. Self-elevates (one UAC prompt). Prints a JSON {status, message} result and exits 0 only when status is "ok".',
    )
    .action(async () => {
      let { sandboxInstallHandler } = await import("./commands/sandbox/sandboxInstallHandler.lazy.js");
      await sandboxInstallHandler();
    });
  sandboxCommand
    .command("status")
    .description(
      "Print the effective sandbox posture (enabled, its source, strict mode, filesystem policy, Bash auto-allow) and the Windows install state as one JSON line.",
    )
    .action(async () => {
      let { sandboxStatusHandler } = await import("./commands/sandbox/sandboxInstallHandler.lazy.js");
      await sandboxStatusHandler();
    });
  sandboxCommand
    .command("uninstall")
    .description(
      "Remove the Windows sandbox account and network filters from this PC, then list what stays behind; Windows may ask for administrator approval",
    )
    .option("--json", "Print one JSON line: {status, message, leftBehind, filtersChecked}")
    .action(async (options) => {
      let { sandboxUninstallHandler } = await import("./commands/sandbox/sandboxInstallHandler.lazy.js");
      await sandboxUninstallHandler(options);
    });
  program
    .command("update")
    .alias("upgrade")
    .description(
      "Check for updates and install if available; package-manager installs update through the package manager",
    )
    .action(
      withStorageV5(async (options) => {
        let { update } = await import("./cli/update.js");
        await update(options);
      }),
    );
  program
    .command("install [target]")
    .description(
      "Install Claude Code native build. Use [target] to specify version (stable, latest, or specific version)",
    )
    .option("--force", "Force installation even if already installed")
    .action(
      withStorageV5(async (options, target, command) => {
        let { installHandler } = await import("./cli/handlers/util.js");
        await installHandler(target, command, options);
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
      withStorageV5(async (options, exportPath, command) => {
        let { importConversationsHandler } =
          await import("./services/conversationImport/importConversationsHandler.lazy.js");
        await importConversationsHandler(exportPath, command, options);
      }),
    );
  profileCheckpoint("run_before_parse");
  await program.parseAsync(process.argv);
  profileCheckpoint("run_after_parse");
  profileCheckpoint("main_after_run");
  profileReport();
  return program;
}
//@ chunk-nhaxap13.js:50952-50974 placement
async function noopAsync(unusedOptions) {}
//@ chunk-nhaxap13.js:50974-51080 placement
function restoreCursorOnExit() {
  (process.stderr.isTTY ? process.stderr : process.stdout.isTTY ? process.stdout : undefined)?.write(
    SHOW_CURSOR,
  );
}
//@ chunk-nhaxap13.js:51080-55839 placement
/**
 * 交互模式的引导段：createRoot 建 Ink 根，执行 showSetupScreens（信任、onboarding、Chrome 提议等），信任后重新加载 MCP 配置、处理 --rc、刷新远程托管设置、启动受信遥测，最后校验 forceLoginOrg。
 */
async function runOnboardingAndSetupScreens(prepared) {
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
  } = prepared;
  let { commands, mcpConfigPromise, dynamicMcpConfig, remoteControl, inputPrompt, prompt } = prepared;
  let onboardingShown = false;
  let onboardingSkippedSignIn = false;
  let mcpApprovalSkipWarning = null;
  let renderContext = getRenderContext(false);
  let { getFpsMetrics, stats } = renderContext;
  checkFullscreenBootGuard({
    storageV5,
  });
  let { createRoot } = await import("./ink/components/Ansi.lazy.js");
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
  let claudeInChromeAccepted = false;
  let suppressChromeOffer = shouldSuppressChromeOffer({
    isSSHPending,
    isRemoteMode: getIsRemoteMode(),
    hasTeleport: Boolean(teleport),
    isSafeMode: isSafeMode() || toolPermissionContext.restricted === true,
    permissionMode,
    isBypassPermissionsModeAvailable: toolPermissionContext.isBypassPermissionsModeAvailable,
    teammateAgentId: storedTeammateOpts?.agentId,
  });
  ({ onboardingShown, onboardingSkippedSignIn, mcpApprovalSkipWarning, claudeInChromeAccepted } =
    await showSetupScreens(
      session,
      root,
      isSSHPending ? "default" : permissionMode,
      isSSHPending ? false : allowDangerouslySkipPermissions,
      commands,
      skippedChromeForAdminPolicy || (enableClaudeInChrome && chromeDeniedByPolicy)
        ? false
        : enableClaudeInChrome,
      devChannels,
      suppressChromeOffer ? false : offerClaudeInChrome,
      storageV5,
      credentials,
      askCloudDefaultReason,
    ));
  setOnboardingShownThisSession(onboardingShown);
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
      .then((resolvedMcpConfigs) => {
        prepared.mcpConfigResolvedMs.value = Date.now() - now;
        return resolvedMcpConfigs;
      });
  }
  if (claudeInChromeAccepted && !isClaudeInChromeAllowed())
    logForDebugging(
      "[Claude in Chrome] Skipping accepted offer: denied by organization policy (allow_claude_browser_extension)",
    );
  else if (claudeInChromeAccepted) {
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
    let remoteControlBlockedReason;
    if (getIsRemoteMode())
      remoteControlBlockedReason = "Remote Control is not available inside a cloud session.";
    else if (teleport)
      remoteControlBlockedReason =
        "--teleport sessions start without Remote Control. Use /remote-control to enable it.";
    else {
      let { getBridgeDisabledDiagnosis } = await import("./bridge/applyRemoteControlToAppState.lazy.js");
      let bridgeDisabledDiagnosis = await getBridgeDisabledDiagnosis();
      remoteControlBlockedReason = bridgeDisabledDiagnosis?.reason ?? null;
      if (bridgeDisabledDiagnosis?.orgPolicyDenied) logOrgPolicyDenied("allow_remote_control", "cli_flag");
    }
    remoteControl = remoteControlBlockedReason === null;
    if (remoteControlBlockedReason)
      warnStartupIssues(
        `${remoteControlBlockedReason} ${projectForRemoteControl ? "--rc and --project ignored." : "--rc flag ignored."}`,
      );
    else markRemoteControlUsed(storageV5);
  }
  if (onboardingShown && !onboardingSkippedSignIn && prompt?.trim().toLowerCase() === "/login") prompt = "";
  if (onboardingShown) {
    if (isForceRemoteSettingsRefreshConfigured()) {
      let forcedRefreshValidation = await validateForceRemoteSettingsRefresh(
        async () =>
          refreshRemoteManagedSettings(await loadStandaloneSecurityDialog(), storageV5, credentials, {
            startupAwaited: true,
          }),
        machineForcedRefresh,
      );
      if (!forcedRefreshValidation.valid)
        return await exitWithError(root, forcedRefreshValidation.message, () =>
          sendManagedSettingsRefusal("force_refresh_failed").then(emitManagedConfigReadyAtExit),
        );
    } else if (getAPIProvider() === "gateway") {
      if (
        !(await refreshRemoteManagedSettings(await loadStandaloneSecurityDialog(), storageV5, credentials, {
          startupAwaited: true,
        }))
      ) {
        let gatewaySignInFailure = gatewaySettingsFailure();
        return await exitWithError(
          root,
          gatewaySignInFailure.endedSession
            ? `Cloud gateway ${gatewaySignInFailure.gatewayUrl} did not accept the new sign-in. Start \`claude\` to try /login again, or contact your administrator.`
            : gatewaySignInFailure.exitMessage,
          () =>
            sendManagedSettingsRefusal(gatewaySignInFailure.forbidden ? "gateway_rejected" : "_OTHER").then(
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
          (globalConfig) => ({
            ...globalConfig,
            hasCompletedOnboarding: true,
            lastOnboardingVersion: {
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
          }),
          storageV5,
        );
        root.unmount();
        return await import("./utils/relaunch.js").then((relaunchModule) => relaunchModule.execRelaunch());
      }
      resetProviderBoundCaches("gateway");
      applyConfigEnvironmentVariables();
    }
    initializeTelemetryAfterTrust(storageV5);
    refreshPolicyLimits();
    resetUserData();
    refreshGrowthBookAfterAuthChange();
    import("./bridge/trustedDevice.js").then((trustedDeviceModule) => {
      trustedDeviceModule.clearTrustedDeviceToken();
      return trustedDeviceModule.enrollTrustedDevice({
        credentials,
      });
    });
  }
  let orgValidation = await validateForceLoginOrg(credentials);
  if (!orgValidation.valid)
    await exitWithError(root, orgValidation.message, () =>
      sendOrgValidationRefusal(orgValidation).then(flushAnalyticsSinks),
    );
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
//@ chunk-nhaxap13.js:55839-56291 placement
function logDeepLinkLaunch(session, launchOptions) {
  if (launchOptions.deepLinkOrigin) {
    logEvent("tengu_deep_link_opened", {
      has_prefill: Boolean(launchOptions.prefill),
      has_repo: Boolean(launchOptions.deepLinkRepo),
    });
    logForDebugging(
      buildDeepLinkBanner({
        cwd: getCwd(),
        prefillLength: launchOptions.prefill?.length,
        repo: launchOptions.deepLinkRepo,
        lastFetch:
          launchOptions.deepLinkLastFetch !== undefined
            ? new Date(launchOptions.deepLinkLastFetch)
            : undefined,
      }),
      {
        level: "info",
      },
    );
    if (launchOptions.prefill)
      setPromptLaunchWarning(session, {
        type: "deep-link",
        prefillLength: launchOptions.prefill.length,
        text: launchOptions.prefill,
      });
  } else if (launchOptions.prefill)
    setPromptLaunchWarning(session, {
      type: "prefill",
      prefillLength: launchOptions.prefill.length,
    });
}
//@ chunk-nhaxap13.js:56291-56521 placement
function printConsoleCloudSignInHint(hintText) {
  process.stdout
    .write(`Opening your browser to sign in for cloud sessions with your Console organization. If it doesn't open here, visit this address in a browser on any computer and paste the code it shows:
${hintText}
`);
}
//@ chunk-nhaxap13.js:56521-92152 placement
/**
 * 交互会话主体：根据 --continue/--resume/--teleport/--cloud/--from-pr 等分支恢复或创建会话，最后调用 launchRepl（chunk-19arrzdw 的 aLt）渲染 App+REPL。
 */
async function runInteractiveSession(session, options, pendingConnect, pendingSSH) {
  let { mainThreadAgentDefinition, remote } = session;
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
    session: session_2,
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
    localSessionMove,
  } = session;
  logStartupTiming("interactive_prepared");
  logEvent("tengu_startup_manual_model_config", {
    cli_flag: telemetrySafeModelName(options.model),
    env_var: telemetrySafeModelName(process.env.ANTHROPIC_MODEL),
    default_env_var: telemetrySafeModelName(env.ANTHROPIC_DEFAULT_MODEL),
    settings_file: telemetrySafeModelName(getInitialSettings().model),
    settings_source: fromEnumOpt(getEffectiveSettingSource("model")),
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
  let permissionNotices = [...permissionModeNotifications.queue];
  if (mcpApprovalSkipWarning)
    permissionNotices.push({
      key: mcpApprovalSkipWarning.key,
      text: mcpApprovalSkipWarning.text,
      color: "warning",
      priority: "high",
    });
  if (personalWithoutEffectNotification !== undefined)
    permissionNotices.push(personalWithoutEffectNotification);
  let verbatimPermissionContext = toolPermissionContext;
  if (
    (!wasTrustedBeforeSetup && checkHasTrustDialogAccepted()) ||
    (!wasPersistedTrustedBeforeSetup && isWorkspacePersistedTrusted())
  ) {
    if (!wasTrustedBeforeSetup && checkHasTrustDialogAccepted())
      import("./utils/detectRepository.js").then((mod) => {
        mod.primeCurrentRepository();
      });
    let allPermissionRulesFromDisk = loadAllPermissionRulesFromDisk();
    let refreshContext = refreshPermissionContext(
      rebuildAdditionalDirectories(
        syncPermissionRulesFromDisk(toolPermissionContext, allPermissionRulesFromDisk),
        [],
        loadTrustedAdditionalDirectoriesFromDisk(),
        undefined,
        false,
        undefined,
        storageV5,
      ),
      allPermissionRulesFromDisk,
    );
    verbatimPermissionContext = refreshContext.context;
    if (refreshContext.exitedAutoMode)
      permissionNotices.push(createAutoModeGateNotification(getAutoModeUnavailableNotification("settings")));
  }
  let retryState = {
    ...verbatimPermissionContext,
    mode:
      isAgentSwarmsEnabled() && getTeammateUtils().isPlanModeRequired()
        ? "plan"
        : verbatimPermissionContext.mode,
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
  let initialSessionState = {
    sessionNoticesPoll: {
      pendingDeliveryUuids: [],
    },
    settings: getInitialSettings(),
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
    toolPermissionContext: retryState,
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
      queue: permissionNotices,
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
      : options.replyOnResume
        ? {
            replay: true,
          }
        : null,
    ...createSessionEffortState(options.effort),
    ultracode: isUltracodeEnabled(options.effort),
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
    webBrowser: require("./state/webBrowserSlice.js").getDefaultWebBrowserState(),
  };
  if (inputPrompt && projectBrowse === null) addHistoryEntry(String(inputPrompt), storageV5);
  let initialTools = structuredOutputTool ? [...mcpTools, structuredOutputTool] : mcpTools;
  saveGlobalConfig(
    (config) => ({
      ...config,
      numStartups: (config.numStartups ?? 0) + 1,
    }),
    storageV5,
  );
  setImmediate(
    (onTurnHook, turn, sessionArg, autoconnectGate) => {
      logStartupTelemetry(getGlobalConfig(), turn);
      if (autoconnectGate === null) {
        logSessionTelemetry(onTurnHook, sessionArg);
        return;
      }
      startRemoteControlAutoConnect(autoconnectGate, (autoconnectRun) =>
        logSessionTelemetry(onTurnHook, sessionArg, autoconnectRun),
      );
    },
    session.storageV5,
    modelProvenance,
    session.credentials,
    null,
  );
  let turnUploaderModule = null;
  let flagD = false;
  let turnUploader =
    turnUploaderModule && !flagD
      ? turnUploaderModule.then((mod) => mod.createSessionTurnUploader(session_2)).catch(() => null)
      : null;
  let turnUploaderV2 =
    turnUploaderModule && flagD
      ? turnUploaderModule.then((mod) => mod.createSessionTurnUploaderV2(session_2)).catch(() => null)
      : null;
  let uploadOptions = {
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
    systemPromptSnapshot: options.systemPromptSnapshot,
    thinkingConfig,
    thinkingConfigExplicit,
    thinkingDisplayFlag,
    ...(userSpecifiedFallbackModel && {
      fallbackModel: userSpecifiedFallbackModel,
    }),
    ...(turnUploader && {
      onTurnComplete: (turnResult) => {
        turnUploader.then((uploader) => uploader?.(turnResult));
      },
    }),
    ...(turnUploaderV2 && {
      onCaptureSnapshot: (snapshot, meta) => {
        turnUploaderV2.then((uploaderV2) => uploaderV2?.(snapshot, meta));
      },
    }),
  };
  let context = {
    session: session_2,
    modeApi: coordinatorModeModule,
    mainThreadAgentDefinition,
    agentDefinitions,
    currentCwd,
    cliAgents,
    initialState: initialSessionState,
    permissionModeCliSet: permissionModeCli !== undefined || Boolean(dangerouslySkipPermissions),
    permissionModeSuppliedOnInvocation: session.permissionModeSuppliedOnInvocation,
    storageV5,
    credentials,
  };
  if (options.continue) {
    let isResuming = false;
    try {
      let startTime = performance.now();
      let { clearSessionCaches } = await import("./commands/clear/caches.js");
      clearSessionCaches(session_2, undefined, undefined, undefined, storageV5);
      let state;
      let result = await loadConversationForResume(undefined, undefined, {
        forkSession: !!options.forkSession,
        replyOnResume: !!options.replyOnResume,
        storageV5,
        credentials,
        ...precomputeResumeHooks(session_2.precompute, storageV5, {
          forkSession: !!options.forkSession,
        }),
        onNewestRunningInBackground: (backgroundTask) => {
          state = backgroundTask;
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
      let resumeResult = await processResumedConversation(
        result,
        {
          forkSession: !!options.forkSession,
          includeAttribution: true,
          transcriptPath: result.fullPath,
          resumeSource: "store",
        },
        context,
      );
      if (resumeResult.restoredAgentDef) mainThreadAgentDefinition = resumeResult.restoredAgentDef;
      maybeActivateBrief(options);
      await noopAsync(options);
      logEvent("tengu_continue", {
        success: true,
        resume_duration_ms: Math.round(performance.now() - startTime),
      });
      isResuming = true;
      let agentModelOverride = applyAgentModelOverride(
        dynamicMcpConfig,
        resumeResult.restoredAgentDef ?? mainThreadAgentDefinition,
        {
          strictMcpConfig,
        },
      );
      if (Object.keys(agentModelOverride).length > 0)
        await awaitMcpPolicyColdStart({
          hasDynamicMcpConfig: true,
        });
      await launchSessionRepl(
        root,
        {
          getFpsMetrics,
          stats,
          initialState: resumeResult.initialState,
          sessionHooks: resumeResult.sessionHooks,
          session: session_2,
          storageV5,
          credentials,
        },
        {
          ...uploadOptions,
          mainThreadAgentDefinition: resumeResult.restoredAgentDef ?? mainThreadAgentDefinition,
          dynamicMcpConfig: agentModelOverride,
          initialMessages: resumeResult.messages,
          pendingHookMessages: resumeResult.sessionStartHooks,
          initialFileHistorySnapshots: resumeResult.fileHistorySnapshots,
          initialContentReplacements: resumeResult.contentReplacements,
          initialAgentName: resumeResult.agentName,
          initialAgentColor: resumeResult.agentColor,
        },
        renderAndRun,
      );
    } catch (error) {
      if (!isResuming)
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
        isResuming
          ? `Claude Code exited: startup failed after restoring the previous session (${message}).`
          : `Claude Code exited: could not continue the previous session (${message}). Run claude --resume to pick a session, or start a new one.`,
      );
      await gracefulShutdown(1, "other");
      return;
    }
  } else if (options.resume || options.fromPr || teleport || remote !== null) {
    let { clearSessionCaches } = await import("./commands/clear/caches.js");
    clearSessionCaches(session_2, undefined, undefined, undefined, storageV5);
    let fleetHost = null;
    let fleetOrigin = "local";
    let fromPrValue = undefined;
    let resumeUuid = normalizeUuidOrNull(options.resume);
    let initialSearchQuery = undefined;
    let repoSlug = null;
    let fromPr = undefined;
    if (options.fromPr) {
      if (options.fromPr === true) fromPr = true;
      else if (typeof options.fromPr === "string") fromPr = options.fromPr;
    }
    if (
      options.resume &&
      typeof options.resume === "string" &&
      !resumeUuid &&
      !isTranscriptFileResumeArg(options.resume)
    ) {
      let trimmed = options.resume.trim();
      if (trimmed) {
        let titleMatches = await searchSessionsByCustomTitle(
          trimmed,
          {
            exact: true,
          },
          storageV5,
        );
        if (titleMatches.length === 1) {
          repoSlug = titleMatches[0];
          resumeUuid = getSessionIdFromLog(repoSlug) ?? null;
        } else initialSearchQuery = trimmed;
      }
    }
    let waitForGate = (resolve) =>
      exitWithError(
        root,
        identity2(resolve, defaultedToCloud),
        () => gracefulShutdown(1),
        takeEarlyInputFieldText(),
      );
    if (remote !== null || teleport) {
      await waitForPolicyLimitsToLoad();
      let unavailableReason = cloudSessionsUnavailableReason();
      if (unavailableReason) {
        await logOrgPolicyDeniedAsync("allow_remote_sessions", "cli_flag");
        if (defaultedToCloud) await logFeatureBadAsync("cloud_session_default", "remote_unavailable");
        return await waitForGate(`Error: ${unavailableReason}`);
      }
    }
    if (remote !== null) {
      let repoSlug = extractRepoSlug(remote);
      let compatRepoId = repoSlug !== null ? toCompatSessionId(repoSlug) : null;
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
      let parsedPermissionMode = permissionModeCli ? permissionModeFromString(permissionModeCli) : undefined;
      let cloudPermissionMode = cloudPermissionModeFrom(permissionModeCli);
      let cachedSensitivePathGate;
      let isSensitivePathGateEnabled = () => (cachedSensitivePathGate ??= sensitivePathGateEnabled());
      let terminalInput_2 =
        localSessionMove === undefined &&
        (defaultedToCloud ||
          getFeatureValue_CACHED_MAY_BE_STALE("tengu_remote_backend", false) ||
          false ||
          (await isSensitivePathGateEnabled()));
      let inputUnavailableReason = terminalInput_2 ? unavailableReason(terminalInput) : undefined;
      if (inputUnavailableReason !== undefined) {
        await logInteractiveInputFailure(inputUnavailableReason);
        return await exitWithError(
          root,
          `No cloud session was created or opened: it would open in this terminal and need the keyboard.
${noTtyMessage(inputUnavailableReason)}`,
          () => gracefulShutdown(1),
        );
      }
      if ((compatRepoId || resumeInCloud !== null) && !terminalInput_2)
        return await exitWithError(
          root,
          "Error: Attaching to an existing cloud session is not enabled for your account.",
          () => gracefulShutdown(1),
        );
      if (environmentQuery !== null && !terminalInput_2 && remote === "" && typeof inputPrompt === "string")
        remote = inputPrompt;
      let hasRemote = !compatRepoId && remote.length > 0;
      let attachId = hasRemote || localSessionMove !== undefined ? randomUUID() : undefined;
      if (!terminalInput_2 && !hasRemote && poolId === null && localSessionMove === undefined)
        return await exitWithError(
          root,
          `Error: --cloud requires a description.
Usage: claude --cloud "your task description"`,
          () => gracefulShutdown(1),
        );
      let attachId_2;
      let startupHandles = [];
      let pendingDialogs = [];
      let moveNotices = [];
      let sessionTitle;
      let moveAsk;
      let moveResult;
      let fleetNudgeStore;
      let fleetMountHandle;
      let fleetViewHost;
      let remoteAttach;
      let cloudCloseOnLeave;
      let saveFailedState;
      let resumeState;
      let headlessCloud;
      let cloudCreateState;
      let applyPromises;
      let shutdownCoordinator;
      let fleetMountResult;
      let fleetNudgePromise;
      let deviceMcpOffer;
      let pendingResumeState = null;
      let isAttachMode = false;
      let hostConsentMode = false;
      async function runStartupSteps(root_2, appProps) {
        if (appProps === undefined) {
          logEvent("tengu_remote_attach_session", {
            session_id: sanitizeMarkName(root_2),
          });
          logDeepLinkLaunch(session_2, options);
        }
        let [
          { attachRemote },
          { createFleetViewHost },
          { ensureFleetNudgeStore },
          { cloudSessionClosesOnLeave },
        ] = await Promise.all([
          import("./cli/handlers/attachRemote.lazy.js"),
          import("./components/fleet/useAttachFleetOwners.js"),
          import("./components/fleet/FleetNudgeStore.js"),
          import("./components/pluginUi/chunk-p51vwbvf.lazy.js"),
        ]);
        let fleetViewHost = createFleetViewHost();
        let fleetMounted;
        if (appProps !== undefined && fleetMounted === undefined) return await appProps.run();
        let hasMountedFleet = false;
        try {
          if (appProps === undefined)
            await ensureConsoleProfileCloudSessionsCredential(credentials, printConsoleCloudSignInHint);
          await attachRemote(root, root_2, session_2, {
            initialStateOverride: initialSessionState,
            autoConnectIdeFlag: ide,
            disableSlashCommands,
            storageV5,
            credentials,
            fleetNudgeStore: ensureFleetNudgeStore(fleetViewHost, storageV5),
            ...(fleetMounted && {
              endProcessOnExit: fleetMounted,
            }),
            startedHere: appProps && {
              ...appProps,
              run: async () => {
                try {
                  await appProps.run();
                } catch (error) {
                  hasMountedFleet = true;
                  throw error;
                }
              },
            },
          });
        } catch (error) {
          if (hasMountedFleet) throw error;
          if (!isTerminalShutdown())
            return await exitWithError(root, `Couldn't attach to cloud session: ${errorMessage(error)}`, () =>
              gracefulShutdown(1),
            );
          logForDebugging(`Couldn't attach to cloud session, while shutting down: ${errorMessage(error)}`, {
            level: "error",
          });
        }
        if (isTerminalShutdown()) return heldUntilExit();
        if (fleetMounted) return await gracefulShutdown(0);
        let [{ mountFleetViewWithComposerBack }, { applyFleetViewHostWindowsEnv }, { createRoot }] =
          await Promise.all([
            import("./components/fleet/mountFleetView.js"),
            import("./screens/FleetView/FleetViewScreen.js"),
            import("./ink/components/Ansi.lazy.js"),
          ]);
        applyFleetViewHostWindowsEnv();
        process.env.CLAUDE_AGENTS_SELECT = remoteRowId(root_2);
        let root_3 = await createRoot(getBaseRenderOptions(false));
        await mountFleetViewWithComposerBack(root_3, {
          entryChannel: "remote_detach",
          storageV5,
          credentials,
          host: fleetViewHost,
          dispatchExtraArgs: earlyArgsArgv(retryState.additionalWorkingDirectories),
        });
        return await gracefulShutdown(0);
      }
      if (compatRepoId) return await runStartupSteps(compatRepoId, undefined);
      else {
        if (!(localSessionMove !== undefined && !terminalInput_2))
          isAttachMode = await isSensitivePathGateEnabled();
        let connectedSessionGate = lit(
          isAttachMode ? "on" : hasFreshGrowthBookFeatures() ? "off" : "unfetched",
        );
        let attachIdValue = undefined;
        let rules = attachIdValue?.kind === "rules" ? attachIdValue.rules : undefined;
        let startupHandles_2 = [];
        let fleetHandle = undefined;
        let builtinTools = fleetHandle?.kind === "send" ? fleetHandle.builtinTools : undefined;
        logEvent("tengu_remote_create_session", {
          defaulted: defaultedToCloud,
          has_initial_prompt: lit(hasRemote ? "true" : "false"),
          branch_mode: branchModeForTelemetry(poolOnBranch, poolRef),
          disallowed_tools_count: rules?.length ?? 0,
          ...disallowedToolsTelemetry(rules),
          builtin_tools_count: builtinTools?.length ?? 0,
          connected_session_gate: connectedSessionGate,
          has_environment_query: environmentQuery !== null,
        });
        if (attachIdValue?.kind === "unclosed") {
          if (defaultedToCloud) logFeatureBad("cloud_session_default", "deny_rule_unclosed");
          logEvent("tengu_remote_create_session_error", {
            defaulted: defaultedToCloud,
            error: lit("deny_rule_unclosed"),
            branch_mode: branchModeForTelemetry(poolOnBranch, poolRef),
          });
          return await waitForGate(unclosedParenError(attachIdValue.rule));
        }
        if (fleetHandle?.kind === "refuse") {
          logEvent("tengu_remote_create_session_error", {
            defaulted: defaultedToCloud,
            error: lit("rejected_tool_restriction"),
            branch_mode: branchModeForTelemetry(poolOnBranch, poolRef),
          });
          return waitForGate(fleetHandle.message);
        }
        if (localSessionMove !== undefined) await waitForOwnFlagFetch();
        let askMove = async (hasBeenChecked) =>
          localSessionMove !== undefined
            ? await require("./utils/teleport/HISTORY_HELD_BACK.lazy.js")
                .checkLocalSessionMove(
                  localSessionMove,
                  {
                    bare: false,
                    selfHostedDefault: isCcpoolId(getEnvironmentSelectionInfo().id),
                    monorepoAsked: monorepo === true,
                    hasBeenChecked,
                  },
                  {
                    account: {
                      accountUuid: getStoredOauthAccountInfo()?.accountUuid ?? "",
                      organizationUuid: getStoredOauthAccountInfo()?.organizationUuid ?? "",
                    },
                    storageV5,
                    credentials,
                    host: session_2.host,
                    activeAgents: agentDefinitions.activeAgents,
                  },
                )
                .catch(async (error) => {
                  await logFeatureBadAsync("cloud_local_session_move", "check_threw");
                  return {
                    refusal: require("./utils/teleport/HISTORY_HELD_BACK.lazy.js").moveCheckThrewWords(
                      localSessionMove,
                      error,
                    ),
                    destination: undefined,
                    conversation: undefined,
                  };
                })
            : undefined;
        let handleRefusal = async (refusal) => {
          logEvent("tengu_remote_create_session_error", {
            defaulted: defaultedToCloud,
            error: lit("local_session_move_refused"),
            branch_mode: branchModeForTelemetry(poolOnBranch, poolRef),
          });
          return await waitForGate(
            refusal +
              (resumeState === undefined
                ? ""
                : `
${resumeState}`),
          );
        };
        let askedMove = await askMove(false);
        if (askedMove?.refusal !== undefined) return await handleRefusal(askedMove.refusal);
        let destination = askedMove?.destination;
        let monorepo_2 =
          monorepo === true ||
          require("./utils/teleport/HISTORY_HELD_BACK.lazy.js").goesToMonorepoPool(destination);
        try {
          if (!defaultedToCloud)
            await ensureConsoleProfileCloudSessionsCredential(credentials, printConsoleCloudSignInHint);
          fleetNudgeStore = await prepareApiRequest(credentials);
        } catch (error) {
          logForDebugging(`--remote auth setup failed: ${errorMessage(error)}`, {
            level: "error",
          });
          if (defaultedToCloud) await logFeatureBadAsync("cloud_session_default", "auth");
          let inputBlocker = terminalInput_2
            ? await import("./components/cloud/CloudLaunchSignInScreen.js")
                .then((blockedInput) =>
                  blockedInput.cloudLaunchSignInScreen({
                    error,
                    defaultedToCloud,
                    terminalInput,
                    disableSlashCommands,
                    session: session_2,
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
          if (inputBlocker !== null) {
            await launchSessionRepl(
              root,
              {
                getFpsMetrics,
                stats,
                initialState: {
                  ...initialSessionState,
                  ...inputBlocker.state,
                },
                session: session_2,
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
                ...inputBlocker.props,
              },
              renderAndRun,
            );
            return;
          }
          return await waitForGate(`Error: ${errorMessage(error) || "Failed to authenticate"}`);
        }
        let violinWoodCached = isViolinWoodEnabledCached();
        let ownFlagFetchWaitMs = isAttachMode ? await waitForOwnFlagFetch() : 0;
        let isViolinWoodServed = isAttachMode
          ? isViolinWoodServedOn()
          : await isViolinWoodEnabled().catch(() => false);
        let ignoresSavedDefault = false;
        let attachNeedsAnswer = isAttachMode && isCloudClientToolServingAnsweredOn();
        if (isAttachMode)
          logEvent("tengu_remote_create_tool_serving_gate", {
            own_answer: lit(isViolinWoodServed ? "on" : "off"),
            violin_willow_gate: lit(getViolinWillowOwnAnswer() === true ? "on" : "off"),
            cached_before: lit(violinWoodCached ? "on" : "off"),
            own_flags_loaded: hasFreshGrowthBookFeatures(),
            own_flag_fetch_wait_ms: ownFlagFetchWaitMs,
          });
        let attachMode = isAttachMode;
        hostConsentMode = isAttachMode && (await neverTrueAsync());
        let { accessToken } = fleetNudgeStore;
        let noopDisposer = () => {};
        let promise = new Promise((resolve) => {
          noopDisposer = resolve;
        });
        let pendingConnectError = null;
        let startupBlock =
          environmentQuery === null
            ? null
            : await environmentUnresolvedOutcome(
                environmentQuery,
                () => fetchEnvironments(accessToken, storageV5, credentials),
                cloudCreateRefusal(),
              );
        if (startupBlock?.ok === false) {
          logEvent("tengu_remote_create_session_error", {
            defaulted: defaultedToCloud,
            error: fromEnum(startupBlock.reason),
            branch_mode: branchModeForTelemetry(poolOnBranch, poolRef),
          });
          return await waitForGate(`Error: ${startupBlock.error}`);
        }
        let telemetryProps = {
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
          chosenEnvironmentKind: startupBlock?.environment.kind,
          ignoresSavedDefault,
          monorepo: monorepo_2,
        };
        let fleetError = null;
        let resumeError = null;
        let hasAnyError = false;
        let hostModeGate = hostConsentMode && isRemoteSessionDisabled();
        let isBlocked = false;
        if (hasAnyError) hostConsentMode = false;
        let fileSyncGate = hasAnyError ? lit("device_too_old") : lit(hostConsentMode ? "on" : "off");
        if (localSessionMove !== undefined && terminalInput_2) {
          moveAsk = await require("./components/projects/askMoveFirstMessage.lazy.js").askMoveFirstMessage(
            root,
          );
          let unused = undefined;
          if (unused !== undefined)
            return await handleRefusal(`${unused.notice}
Session ${localSessionMove} wasn't moved. To continue it here, run \`claude --resume ${localSessionMove}\`.`);
          if (moveAsk === undefined) {
            logFeatureSad("cloud_local_session_move", "cancelled");
            return await interactiveHelpersModule().exitWithMessage(
              root,
              `Not moved. To continue it here, run \`claude --resume ${localSessionMove}\`.`,
              {
                beforeExit: () => gracefulShutdown(1),
              },
            );
          }
        }
        let abortController = new AbortController();
        let attachStart = isAttachMode
          ? launchCloudCreateChecklist(root, {
              session: session_2,
              onCancel: () => abortController.abort(),
              alsoAtExit: () => resumeState,
            })
          : null;
        if (attachStart === null)
          process.stderr.write(
            sequential.dim("Creating remote session\u2026") +
              `
`,
          );
        let startupScreenError = null;
        let startupScreenRoot;
        let consentResult = null;
        let remoteToolsAnswer = null;
        let moreFilesDecision;
        let deviceMcpResult = null;
        let windowsPrimeResult = null;
        let startupPromises = [];
        let resumeTarget = undefined;
        let hasResumeTarget = resumeTarget !== undefined;
        let settingsToCloudEnabled =
          isAttachMode && isViolinWoodServed && (await isSettingsToCloudEnabled().catch(() => false));
        let needsContainerSync =
          terminalInput_2 && (await isContainerSyncEnvironment(hostConsentMode)) && !hasResumeTarget;
        let isAttachModeValue = attachMode;
        noopDisposer(isAttachModeValue);
        let hostConsentMode_2 = resolveHostConsentMode({
          hostConsent: homeSettingsConsent,
          areOwnFlagsOn: settingsToCloudEnabled,
          stored: storedHomeSettingsMode(),
          isProjectSynced: needsContainerSync,
        });
        let launchBlocked = settingsToCloudEnabled || isLaunchConsentBlocked(hostConsentMode_2);
        if (
          canForwardHomeSettings(launchBlocked) &&
          shouldPromptHomeSettingsMode({
            staysAttached: terminalInput_2,
            launchMayForward: forwardHomeSettings,
            launchConsent: hostConsentMode_2,
          })
        )
          await launchRemoteHomeSettingsDialog(root, {
            configHome: getClaudeConfigDir(),
            storageV5,
          });
        let didMountScreen = false;
        if (attachNeedsAnswer && isAttachModeValue) {
          let [{ isRemoteToolServingSwitchOn }, { deviceMcpConsentOffer }, { primeWindowsProfileDirs }] =
            await Promise.all([
              import("./services/remoteTools/servingGates.js"),
              import("./services/mcp/deviceMcpConsentOffer.lazy.js"),
              import("./services/remoteTools/windowsProfileDirs.js"),
            ]);
          await primeWindowsProfileDirs();
          didMountScreen = isRemoteToolServingSwitchOn();
          let deviceMcpConsent = didMountScreen
            ? await deviceMcpConsentOffer(storageV5).catch((error) => {
                logForDebugging(`[deviceBridge] MCP consent question skipped: ${errorMessage(error)}`);
                return;
              })
            : undefined;
          if (deviceMcpConsent !== undefined && deviceMcpConsent.servers.length > 0)
            await launchDeviceMcpConsentDialog(root, {
              servers: deviceMcpConsent.servers,
              storageV5,
            });
          else if (deviceMcpConsent !== undefined && Object.keys(deviceMcpConsent.withheld).length > 0)
            await launchDeviceMcpReconsentDialog(root, {
              withheld: deviceMcpConsent.withheld,
              storageV5,
            });
        }
        let startupPromiseCount = startupPromises.length;
        if (launchBlocked || needsContainerSync)
          noteHomeSettingsPrompt({
            launchConsent: hostConsentMode_2,
            isProjectSynced: needsContainerSync,
            launchMayForward: forwardHomeSettings,
            surface: "terminal",
            trigger: "create",
          });
        let homeSettingsGate = shouldForwardHomeSettings({
          settingsToCloudEnabled: launchBlocked,
          launchMayForward: forwardHomeSettings,
          launchConsent: hostConsentMode_2,
        });
        let startupModeTelemetry = getStartupModeTelemetry({
          gateOn: homeSettingsGate,
          permissionModeTyped: permissionModeCli !== undefined,
          dangerouslySkipPermissions: dangerouslySkipPermissions === true,
          scrubbed: isScrubEnabled(),
          settings: getInitialSettings(),
          effort: resolveEffortLevel(initialSessionState),
        });
        let selfHostedModeNotice;
        if (boolFromMaybe(isAttachMode)) {
          fleetNudgePromise = getMainLoopModel();
          let restrictedModelAllowed = isRestrictedModelAllowed(fleetNudgePromise);
          selfHostedModeNotice = describeSelfHostedModeNotice({
            model: fleetNudgePromise,
            internal: restrictedModelAllowed,
            explicitMode: cloudPermissionMode,
            droppedMode:
              (parsedPermissionMode !== undefined && !cloudPermissionMode) ||
              Boolean(dangerouslySkipPermissions),
            settingsMode: startupModeTelemetry.settingsDefault,
            settingsModeForwardable: homeSettingsGate,
            ...getAutoSeedFactors({
              settings: getInitialSettings(),
              scrubbed: isScrubEnabled(),
              typedLevel: options.proactivity,
              carriedMode: options.inheritPermissionMode,
            }),
            repositoryModel: restrictedModelAllowed
              ? resolveStartupModel({
                  model: fleetNudgePromise,
                  modelCli: options.model,
                  agent: mainThreadAgentDefinition,
                  agentSelectedByCli: session.agentCli !== undefined,
                  agents: agentDefinitions.allAgents,
                  effectiveModel: session.effectiveModel,
                  initialMainLoopModel,
                  restrictedModel,
                })
              : undefined,
          });
          shutdownCoordinator = selfHostedModeNotice.decision;
          if (shutdownCoordinator.notice) logForDebugging(`[remote] ${shutdownCoordinator.notice.text}`);
        }
        let effectivePermissionMode = shutdownCoordinator
          ? shutdownCoordinator.permissionMode
          : cloudPermissionMode;
        if (
          attachNeedsAnswer &&
          isAttachModeValue &&
          (effectivePermissionMode === "auto" || effectivePermissionMode === "bypassPermissions")
        ) {
          let [
            { isRemoteToolServingSwitchOn: remoteToolServingSwitchOn },
            { isViolinFretEnabled },
            {
              managedSettingsForbidUnattendedServing,
              primeUnattendedServingConsent,
              readUnattendedServingConsent,
            },
          ] = await Promise.all([
            import("./services/remoteTools/servingGates.js"),
            import("./services/analytics/violinFretGate.js"),
            import("./services/remoteTools/unattendedConsentStore.js"),
          ]);
          primeUnattendedServingConsent();
          if (
            remoteToolServingSwitchOn() &&
            (await isViolinFretEnabled()) &&
            !managedSettingsForbidUnattendedServing() &&
            (await readUnattendedServingConsent()) === "unset"
          )
            await launchUnattendedServingConsentDialog(root);
        }
        let deviceBinding = attachMode
          ? {
              orgUuid: fleetNudgeStore.orgUUID,
              accountUuid: getStoredOauthAccountInfo()?.accountUuid,
              ...{},
              onBound: (boundDeviceId) => {
                cloudCloseOnLeave = boundDeviceId;
              },
              onUnbound: (unboundApplyPromise) => {
                applyPromises = unboundApplyPromise;
              },
              confirmReenroll: async () => {
                await attachStart?.untilTypingRests(abortController.signal);
                if (abortController.signal.aborted) throw Error("the create was cancelled");
                try {
                  return (
                    (await launchDeviceReenrollDialog(root, {
                      onCancel: () => abortController.abort(),
                    })) === "register" && !abortController.signal.aborted
                  );
                } finally {
                  attachStart?.repaint();
                }
              },
            }
          : undefined;
        let chosenBranchName = poolOnBranch ?? poolRef ?? (await getBranch());
        let [{ showTeleportErrorsImpl }, firstUploadPromise] = await Promise.all([
          import("./components/TeleportError.js"),
          undefined,
        ]);
        let extraCreateOptions = {};
        let extraTeleportOptions = {};
        let unusedResumeOverrides = undefined;
        let unusedSessionOverrides = undefined;
        let secondAsk = await askMove(true);
        if (secondAsk?.refusal !== undefined) return await handleRefusal(secondAsk.refusal);
        let createSessionResult = await teleportToRemoteWithErrorHandling(root, {
          showTeleportErrors: showTeleportErrorsImpl,
          firstUpload: firstUploadPromise,
          ...extraTeleportOptions,
          staysAttached: terminalInput_2,
          connectedSession: isAttachMode,
          fileSync: hostConsentMode,
          ...{},
          moreFilesDecision,
          moreFilesSeat: "terminal_create",
          deferInitialMessage: terminalInput_2,
          personAskedForSession: !defaultedToCloud,
          description: hasRemote ? remote : null,
          descriptionUuid: attachId,
          forwardHomeSettings,
          homeSettingsConsent: hostConsentMode_2,
          signal: abortController.signal,
          source: "remote",
          branchName: chosenBranchName || undefined,
          branchFromHead: (poolOnBranch ?? poolRef) == null,
          title:
            sessionNameArg ||
            (localSessionMove !== undefined
              ? require("./utils/teleport/HISTORY_HELD_BACK.lazy.js").MOVED_SESSION_TITLE
              : undefined),
          isMove: localSessionMove !== undefined,
          appendSystemPrompt:
            [
              null,
              null,
              require("./utils/teleport/HISTORY_HELD_BACK.lazy.js").monorepoMoveNoteForClaude(destination) ??
                null,
            ].filter((promptPart) => promptPart !== null).join(`

`) || undefined,
          reuseOutcomeBranch: poolOnBranch ?? undefined,
          explicitRef: poolOnBranch ?? poolRef ?? undefined,
          poolId: poolId ?? undefined,
          chosenEnvironment: startupBlock?.environment,
          effort:
            options.effort !== undefined
              ? resolveEffortLevel(initialSessionState)
              : startupModeTelemetry.effort,
          isEffortFromSettings: options.effort === undefined,
          correlationId: correlationId ?? undefined,
          persistentVolume,
          persistentVolumeFromSessionId: persistentVolumeFromSessionId ?? undefined,
          monorepo: monorepo_2,
          monorepoNotice: require("./utils/teleport/HISTORY_HELD_BACK.lazy.js").monorepoMoveNotice(
            destination,
          ),
          noMonorepo,
          noMonorepoAsksTheService,
          personal,
          deviceBinding,
          ...extraCreateOptions,
          ...resumeTarget,
          ...unusedResumeOverrides,
          ...unusedSessionOverrides,
          hasApprovedCopy: saveFailedState?.peek() !== undefined,
          permissionMode: effectivePermissionMode,
          isModeFromSettings: selfHostedModeNotice?.isModeFromSettings,
          proactivityLevel: options.proactivity,
          onProgress: attachStart?.update,
          disallowedTools: rules,
          builtinTools,
          environmentVariables: undefined,
          model: fleetNudgePromise,
          storageV5,
          credentials,
        });
        if (!createSessionResult.ok) {
          if (attachStart !== null && abortController.signal.aborted) {
            if (defaultedToCloud) logFeatureSad("cloud_session_default", "cancelled");
            if (localSessionMove !== undefined) logFeatureSad("cloud_local_session_move", "cancelled");
            return await attachStart.exitCancelled();
          }
          if (defaultedToCloud) logFeatureBad("cloud_session_default", createSessionResult.failReason);
          logEvent("tengu_remote_create_session_error", {
            defaulted: defaultedToCloud,
            error: fromEnum(createSessionResult.failReason),
            branch_mode: branchModeForTelemetry(poolOnBranch, poolRef),
            settings_gate: lit(launchBlocked ? "on" : "off"),
            connected_session_gate: connectedSessionGate,
            file_sync_gate: fileSyncGate,
            ...{},
            ...(createSessionResult.failDetail?.endpoint && {
              create_endpoint: fromEnum(createSessionResult.failDetail.endpoint),
            }),
            ...(createSessionResult.failDetail?.serverReason && {
              server_reason: fromEnum(createSessionResult.failDetail.serverReason),
            }),
            ...(createSessionResult.failDetail?.messageHidden && {
              message_hidden: lit("true"),
            }),
            ...(createSessionResult.failDetail?.preflightTransient !== undefined && {
              deny_transient: lit(createSessionResult.failDetail.preflightTransient ? "true" : "false"),
            }),
            ...(createSessionResult.failDetail?.sessionArchived !== undefined && {
              session_archived: lit(createSessionResult.failDetail.sessionArchived ? "true" : "false"),
            }),
          });
          let unstoredHint = "";
          let attachFailure =
            localSessionMove !== undefined
              ? require("./utils/teleport/HISTORY_HELD_BACK.lazy.js").moveCreateRefusal(
                  localSessionMove,
                  {
                    failReason: createSessionResult.failReason,
                    serverReason: createSessionResult.failDetail?.serverReason,
                    failMessage: createSessionResult.failMessage,
                  },
                  destination,
                )
              : undefined;
          attachStart?.failed(attachFailure !== undefined);
          if (attachFailure !== undefined)
            logFeatureSad(
              "cloud_local_session_move",
              attachFailure.code,
              require("./utils/teleport/HISTORY_HELD_BACK.lazy.js").moveEventFields(destination),
            );
          else if (localSessionMove !== undefined)
            logFeatureBad("cloud_local_session_move", createSessionResult.failReason);
          return await waitForGate(
            (attachFailure?.words ??
              (createSessionResult.failMessage
                ? `Error: ${createSessionResult.failMessage}${unstoredHint}`
                : "Error: Unable to create cloud session")) +
              (resumeState === undefined
                ? ""
                : `
${resumeState}`) +
              (localSessionMove !== undefined && attachFailure === undefined
                ? `
To continue it here, run \`claude --resume ${localSessionMove}\`.`
                : ""),
          );
        }
        let session_3 = createSessionResult.session;
        if (localSessionMove !== undefined && secondAsk?.conversation !== undefined) {
          stopCapturingEarlyInput();
          if (!terminalInput_2 && process.stdin.isTTY) process.stdin.setRawMode(false);
          let localMoveModule = require("./utils/teleport/HISTORY_HELD_BACK.lazy.js");
          let settledMove = await localMoveModule.settleMovedSession(
            {
              id: localSessionMove,
              destination,
              conversation: secondAsk.conversation,
              typed: moveAsk,
            },
            session_3,
            {
              storageV5,
              credentials,
              cancelled: abortController.signal,
              named: Boolean(sessionNameArg),
              asked: {
                fileSync: needsContainerSync,
                thisComputer: isAttachModeValue,
              },
              checkAgain: () => askMove(true),
            },
          );
          if (!settledMove.ok) {
            logEvent("tengu_remote_create_session_error", {
              defaulted: defaultedToCloud,
              error: lit("local_session_move_stopped"),
              branch_mode: branchModeForTelemetry(poolOnBranch, poolRef),
            });
            return await waitForGate(
              settledMove.error +
                (resumeState === undefined
                  ? ""
                  : `
${resumeState}`),
            );
          }
          moveResult = settledMove;
          moveNotices = [
            settledMove.notice,
            ...localMoveModule.moveModeNotices(shutdownCoordinator?.action),
            ...localMoveModule.noMonorepoMoveNotices(destination, cloudCloseOnLeave !== undefined),
            ...localMoveModule.poolChosenNotices(destination, isCcpoolId(getEnvironmentSelectionInfo().id)),
          ];
          sessionTitle = settledMove.title;
        }
        let sentSettingsMode =
          session_3.settingsModeOnRunner === undefined ? effectivePermissionMode : undefined;
        fleetMountResult =
          session_3.settingsModeOnRunner === undefined
            ? shutdownCoordinator?.notice
            : selfHostedModeNotice?.noticeOnRunner;
        if (session_3.settingsModeOnRunner !== undefined && fleetMountResult)
          logForDebugging(`[remote] ${fleetMountResult.text}`);
        if (isAttachMode) {
          remoteAttach = sentSettingsMode && {
            mode: sentSettingsMode,
          };
          deviceMcpOffer = resolveRemoteSessionMode({
            sentMode: sentSettingsMode,
            repositorySettings: getSettingsForSource("projectSettings"),
          });
          pendingResumeState = resolveSeedPermissionMode({
            seed: startupModeTelemetry,
            settingsMode: getInitialSettings().permissions?.defaultMode,
            sentMode: sentSettingsMode,
            startsIn: deviceMcpOffer,
          });
        }
        pendingDialogs =
          startupBlock?.notice && !session_3.chosenEnvironmentMoved ? [startupBlock.notice] : [];
        startupHandles = [...startupPromises, ...startupHandles_2, ...createSessionResult.notices];
        startupHandles = [...moveNotices, ...startupHandles];
        if (defaultedToCloud) logFeatureOk("cloud_session_default");
        let unusedServedToolsHolder = null;
        let unusedRepositoryTrustHolder = null;
        logEvent("tengu_remote_create_session_success", {
          defaulted: defaultedToCloud,
          ...{},
          session_id: sanitizeMarkName(session_3.id),
          initial_prompt_withheld: session_3.withheldInitialMessage !== undefined,
          branch_mode: branchModeForTelemetry(poolOnBranch, poolRef),
          permission_mode_source: lit(
            cloudPermissionMode
              ? "flag"
              : parsedPermissionMode
                ? "flag_withheld"
                : shutdownCoordinator?.action === "auto_seeded"
                  ? startupModeTelemetry.permissionMode
                    ? "model_auto_over_settings"
                    : "model_auto"
                  : shutdownCoordinator?.action === "auto_by_default"
                    ? "default_auto"
                    : startupModeTelemetry.permissionMode
                      ? session_3.settingsModeOnRunner === "not_sent"
                        ? "settings_withheld"
                        : "settings"
                      : startupModeTelemetry.considered && startupModeTelemetry.settingsDefaultModePresent
                        ? "settings_withheld"
                        : "none",
          ),
          permission_mode: fromEnumOpt(
            session_3.settingsModeOnRunner === "not_sent" ? undefined : effectivePermissionMode,
          ),
          ...(session_3.settingsModeOnRunner !== undefined && {
            settings_mode_on_runner: fromEnum(session_3.settingsModeOnRunner),
            settings_mode_warned: fleetMountResult?.level === "warning",
          }),
          settings_gate: lit(launchBlocked ? "on" : "off"),
          ...(session_3.settingsPackUnsent !== undefined && {
            settings_pack_unsent: fromEnum(session_3.settingsPackUnsent),
          }),
          connected_session_gate: connectedSessionGate,
          file_sync_gate: fileSyncGate,
          ...{},
          ...{},
        });
        if (shutdownCoordinator && shutdownCoordinator.action !== "none")
          logEvent("tengu_remote_model_gate_hint", {
            entry_point: lit("interactive"),
            session_id: sanitizeMarkName(session_3.id),
            permission_mode: fromEnumOpt(effectivePermissionMode) ?? lit("unset"),
            requested_mode: fromEnumOpt(parsedPermissionMode) ?? lit("unset"),
            settings_mode: fromEnumOpt(startupModeTelemetry.permissionMode) ?? lit("unset"),
            skip_permissions: lit(dangerouslySkipPermissions ? "true" : "false"),
            action: fromEnum(shutdownCoordinator.action),
            violin_wood_gate: lit(isViolinWoodServed ? "on" : "off"),
            connected_session_gate: connectedSessionGate,
            file_sync_gate: fileSyncGate,
            ...(shutdownCoordinator.repositoryModel && {
              repository_model: fromEnum(shutdownCoordinator.repositoryModel),
            }),
            ...(shutdownCoordinator.barredBy && {
              barred_by: fromEnum(shutdownCoordinator.barredBy),
            }),
            ...(fleetNudgePromise !== undefined && {
              model_runs_auto: lit(modelSupportsAutoMode(fleetNudgePromise) ? "true" : "false"),
            }),
          });
        if (!terminalInput_2) {
          if (localSessionMove !== undefined && moveResult !== undefined) {
            let resolve =
              await require("./utils/teleport/HISTORY_HELD_BACK.lazy.js").sendFirstMessageAndLeave(
                {
                  id: localSessionMove,
                  sessionId: session_3.id,
                  destination,
                },
                moveResult,
              );
            if (resolve !== undefined) return await waitForGate(resolve);
          }
          process.stdout.write(`Created cloud session: ${sessionTitle ?? session_3.title}
`);
          let compatSessionId = toCompatSessionId_2(session_3.id);
          if (poolId !== null)
            process.stdout.write(`Session ID: ${compatSessionId}
`);
          process.stdout.write(`View: ${getRemoteSessionUrl(session_3.id, undefined, {
            from: "cli",
            m: "0",
          })}
`);
          for (let line of localSessionMove === undefined
            ? [`Resume with: claude --teleport ${compatSessionId}`]
            : moveNotices)
            process.stdout.write(`${line}
`);
          if (fleetMountResult)
            process.stdout.write(`${fleetMountResult.text}
`);
          for (let noticeText of [...pendingDialogs, ...startupHandles_2, ...createSessionResult.notices])
            process.stdout.write(`${noticeText}
`);
          await gracefulShutdown(0);
          process.exit(0);
        }
        attachId_2 = session_3.id;
        fleetMountHandle = session_3.homeSeed;
        fleetViewHost =
          moveResult !== undefined && attachId !== undefined
            ? {
                content: moveResult.firstTurnText,
                handoff: moveResult.handoff,
                uuid: attachId,
                fileAttachments: moveResult.fileAttachments,
                followsPermissionMode: cloudCloseOnLeave !== undefined,
                wordsIfLost: moveResult.wordsIfLost,
              }
            : session_3.withheldInitialMessage;
        if (moveResult !== undefined) {
          moveResult.letSessionStay();
          logFeatureOk(
            "cloud_local_session_move",
            require("./utils/teleport/HISTORY_HELD_BACK.lazy.js").moveEventFields(destination),
          );
        }
      }
      setIsRemoteMode(true);
      switchSession(identityAgentId(attachId_2), "remote_attach");
      let getAccessToken = () =>
        sessionsApiAccessTokenNow(fleetNudgeStore.profile) ?? fleetNudgeStore.accessToken;
      let dirSyncState = undefined;
      let [
        { startDeviceRegistration },
        { deviceToolNoticesTo },
        { deviceHooksProcessMemories },
        { sessionRepositoryTrustReader },
      ] = await Promise.all([
        import("./services/deviceBridge/deviceRegistrationSocket.js"),
        import("./services/deviceMcp/deviceToolNotices.js"),
        import("./utils/hooks/deviceHooks/cloudRegistration.js"),
        import("./remote/tools/sessionRepositoryTrust.js"),
      ]);
      let deviceId = cloudCloseOnLeave;
      let deviceRegistration =
        deviceId === undefined
          ? undefined
          : startDeviceRegistration({
              sessionId: attachId_2,
              getAccessToken: () => deviceBridgeAccessToken(fleetNudgeStore),
              orgUuid: fleetNudgeStore.orgUUID,
              getDeviceId: () => deviceId,
              cloudClient: true,
              storageV5,
              dirSync: dirSyncState !== undefined,
              onNotice: deviceToolNoticesTo(session_2),
              servedSettingsChanged: deviceHooksProcessMemories.of(session_2.host).servedSettingsChanged,
            });
      let repositoryTrust = sessionRepositoryTrustReader({
        sessionId: attachId_2,
        getAccessToken,
        fetchSession,
        createOrigin: dirSyncState?.createFacts?.origin,
      });
      let servedToolsOptions =
        deviceId === undefined || deviceRegistration === undefined
          ? undefined
          : (await import("./remote/tools/servedToolsAttachOptions.lazy.js")).servedToolsAttachOptions({
              owner: () => ({
                owner: true,
                deviceId,
              }),
              cloudClient: true,
              deviceBridge: deviceRegistration,
              onNotice: deviceToolNoticesTo(session_2),
              ...(repositoryTrust && {
                repositoryTrust,
              }),
              stillBound: async () =>
                (await import("./cli/headlessCloud/attachDeviceBinding.js")).sessionStillBoundTo(
                  deviceId,
                  () =>
                    fetchSession(attachId_2, {
                      accessToken: getAccessToken(),
                    }),
                ),
              plumbing: (
                await import("./services/remoteTools/servedSessionPlumbing.lazy.js")
              ).servedSessionPlumbing(attachId_2),
            });
      let remoteSessionConfig = {
        sessionId: attachId_2,
        getAccessToken,
        consoleProfileBearer: fleetNudgeStore.profile,
        orgUuid: fleetNudgeStore.orgUUID,
        onAuth401: (authError) =>
          recoverSessionsApiBearer(authError, credentials, storageV5, fleetNudgeStore.profile),
        initialPromptUuid: attachId,
        hasExplicitTitle: Boolean(sessionNameArg),
        dirSync: dirSyncState,
        ...(deviceRegistration && {
          heldServedCall: deviceRegistration.heldServedCall,
        }),
        ...(fleetMountHandle && {
          homeSeed: fleetMountHandle,
        }),
        ...(fleetViewHost && {
          withheldInitialPrompt: fleetViewHost,
        }),
        ...(remoteAttach && {
          createPermissionMode: remoteAttach,
        }),
        ...(servedToolsOptions && {
          servedTools: servedToolsOptions,
        }),
        ...(repositoryTrust && {
          repositoryTrust,
          boundHere: Promise.resolve(deviceId !== undefined),
        }),
        ...(deviceId !== undefined && {
          eventSigner: import("./bridge/clientEventSigner.js").then(
            ({ deviceEventSignerFor }) => deviceEventSignerFor(deviceId, credentials),
            reportSignerLoadFailure,
          ),
        }),
      };
      let remoteSessionUrl = getRemoteSessionUrl(attachId_2, undefined, {
        from: "cli",
        m: "0",
      });
      let targetFileContent = tryReadFileForSync(
        localSessionMove === undefined ? "create" : "moved",
        remoteSessionUrl,
        isAttachMode,
      );
      let droppedMcpMessages = [];
      let pendingResumeMessages = pendingResumeState
        ? [createSystemMessage(pendingResumeState.text, pendingResumeState.level)]
        : [];
      let mapped = startupHandles.map((startupHandle) => createSystemMessage(startupHandle, "warning"));
      let mapped_2 = pendingDialogs.map((pendingDialog) => createSystemMessage(pendingDialog, "notice"));
      let remotePromptMessage = hasRemote
        ? createUserMessage({
            content: remote,
            uuid: attachId,
          })
        : moveAsk !== undefined
          ? createUserMessage({
              content: moveAsk,
              uuid: attachId,
            })
          : null;
      let permissionModeWarning = compatRepoId
        ? permissionModeCli
          ? "--permission-mode is ignored when attaching \u2014 the session keeps its current mode (shift+tab to change it)"
          : undefined
        : parsedPermissionMode && !cloudPermissionMode
          ? `--permission-mode ${parsedPermissionMode} is not forwarded \u2014 the cloud session uses its default mode`
          : undefined;
      let deviceNotBoundWarning =
        applyPromises !== undefined && cloudCloseOnLeave === undefined
          ? isDeviceRevokedError(applyPromises)
          : undefined;
      let baseInitialSessionState = {
        ...initialSessionState,
        initialMessage:
          localSessionMove === undefined
            ? nullIfTruthy(
                hasRemote && poolId !== null && poolPromotedRemote,
                initialSessionState.initialMessage,
              )
            : null,
        remoteSessionUrl,
        ...(deviceMcpOffer !== undefined && {
          toolPermissionContext: {
            ...initialSessionState.toolPermissionContext,
            mode: deviceMcpOffer,
          },
        }),
        replTab: "convo",
        diffPanelVisible: false,
        replBridgeEnabled: false,
        replBridgeOutboundOnly: false,
        replBridgeExplicit: false,
        ...((permissionModeWarning || deviceNotBoundWarning || fleetMountResult) && {
          notifications: {
            ...initialSessionState.notifications,
            current: null,
            queue: [
              ...initialSessionState.notifications.queue,
              ...(permissionModeWarning
                ? [
                    {
                      key: "remote-permission-mode-not-applied",
                      text: permissionModeWarning,
                      color: "warning",
                      priority: "high",
                    },
                  ]
                : []),
              ...(deviceNotBoundWarning
                ? [
                    {
                      key: "remote-device-not-bound",
                      kind: "warning",
                      text: deviceNotBoundWarning,
                      color: "warning",
                      priority: "high",
                      timeoutMs: 30000,
                    },
                  ]
                : []),
              ...(fleetMountResult?.level === "warning"
                ? [
                    {
                      key: "remote-internal-model-mode",
                      kind: "warning",
                      text: fleetMountResult.short,
                      color: "warning",
                      priority: "high",
                      timeoutMs: 30000,
                    },
                  ]
                : fleetMountResult
                  ? [
                      {
                        key: "remote-internal-model-mode",
                        kind: "feedback",
                        text: fleetMountResult.short,
                        priority: "medium",
                        timeoutMs: 15000,
                      },
                    ]
                  : []),
            ],
          },
        }),
      };
      let initialMessages = [
        ...remoteDroppedMcpMessages,
        targetFileContent,
        ...droppedMcpMessages,
        ...mapped_2,
        ...pendingResumeMessages,
        ...mapped,
      ];
      if (hasWarningNotice(initialMessages, baseInitialSessionState.notifications))
        markEarlyInputLaunchWarning();
      logDeepLinkLaunch(session_2, options);
      await launchSessionRepl(
        root,
        {
          getFpsMetrics,
          stats,
          initialState: baseInitialSessionState,
          session: session_2,
          storageV5,
          credentials,
        },
        {
          debug,
          commands,
          initialTools: [],
          initialMessages: remotePromptMessage ? [...initialMessages, remotePromptMessage] : initialMessages,
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
        let teleportResumeResult = await launchTeleportResumeWrapper(root);
        if (!teleportResumeResult) {
          await gracefulShutdown(0);
          process.exit(0);
        }
        let { branchError } = await checkOutTeleportedSessionBranch(teleportResumeResult.branch);
        fleetHost = processMessagesForTeleportResume(
          teleportResumeResult.log,
          branchError,
          teleportResumeResult.environmentKind,
        );
        fleetOrigin = "remote";
      } else if (typeof teleport === "string") {
        logEvent("tengu_teleport_resume_session", {
          mode: lit("direct"),
        });
        try {
          let sessionData = await fetchSession(teleport, undefined, credentials);
          let repositoryValidation = await validateSessionRepository(sessionData);
          if (repositoryValidation.status === "host_unverified") {
            let sessionRepo =
              repositoryValidation.sessionHost && !isGithubDotCom(repositoryValidation.sessionHost)
                ? `${repositoryValidation.sessionHost}/${repositoryValidation.sessionRepo}`
                : (repositoryValidation.sessionRepo ?? "");
            if (
              !(await launchTeleportHostUnverifiedDialog(root, {
                sessionRepo,
                rawRemoteUrl: repositoryValidation.rawRemoteUrl ?? "",
              }))
            )
              await gracefulShutdown(0);
          }
          if (repositoryValidation.status === "mismatch" || repositoryValidation.status === "not_in_repo") {
            logEvent(
              repositoryValidation.status === "mismatch"
                ? "tengu_teleport_error_repo_mismatch_sessions_api"
                : "tengu_teleport_error_repo_not_in_git_dir_sessions_api",
              {
                sessionId: sanitizeMarkName(teleport),
                stage: lit("direct_arg_detect"),
              },
            );
            let sessionRepo = repositoryValidation.sessionRepo;
            if (sessionRepo) {
              let paths = getKnownPathsForRepo(sessionRepo);
              let existingRepoPaths = await filterExistingPaths(paths);
              if (existingRepoPaths.length > 0) {
                let chosenRepoPath = await launchTeleportRepoMismatchDialog(root, {
                  targetRepo: sessionRepo,
                  initialPaths: existingRepoPaths,
                  storageV5,
                });
                if (chosenRepoPath) {
                  processChdir(chosenRepoPath);
                  setCwd(chosenRepoPath);
                  setOriginalCwd(chosenRepoPath);
                  getPlansDirectory.cache.clear?.();
                  primePlanSlugCollisions(storageV5);
                } else await gracefulShutdown(0);
              } else {
                let expectedRepoDisplay = sessionRepo;
                let repoHintSuffix = "";
                if (repositoryValidation.status === "mismatch") {
                  let repoMismatchDisplay = formatRepoMismatchDisplay(repositoryValidation);
                  expectedRepoDisplay = repoMismatchDisplay.sessionDisplay ?? sessionRepo;
                  repoHintSuffix = repoMismatchDisplay.currentDisplay
                    ? `
This repo is ${repoMismatchDisplay.currentDisplay}.`
                    : "";
                } else {
                  if (repositoryValidation.sessionHost && !isGithubDotCom(repositoryValidation.sessionHost))
                    expectedRepoDisplay = `${repositoryValidation.sessionHost}/${sessionRepo}`;
                  if (repositoryValidation.rawRemoteUrl)
                    repoHintSuffix = `
Couldn't parse your git remote: ${repositoryValidation.rawRemoteUrl}`;
                }
                throw new TeleportOperationError(
                  `You must run claude --teleport ${teleport} from a checkout of ${expectedRepoDisplay}.${repoHintSuffix}`,
                  sequential.red(`You must run claude --teleport ${teleport} from a checkout of ${sequential.bold(expectedRepoDisplay)}.${repoHintSuffix}
`),
                );
              }
            }
          } else if (repositoryValidation.status === "error")
            throw new TeleportOperationError(
              repositoryValidation.errorMessage || "Failed to validate session",
              sequential.red(`Error: ${repositoryValidation.errorMessage || "Failed to validate session"}
`),
            );
          let { showTeleportErrorsImpl } = await import("./components/TeleportError.js");
          await handleTeleportPrerequisites(root, new Set(), showTeleportErrorsImpl);
          let { teleportWithProgress } = await import("./components/TeleportProgress.js");
          let teleportResult = await teleportWithProgress(root, teleport);
          setTeleportedSessionInfo({
            sessionId: teleport,
          });
          fleetHost = teleportResult.messages;
          fleetOrigin = "remote";
        } catch (error) {
          let isTeleportOperationError = error instanceof TeleportOperationError;
          if (!isTeleportOperationError)
            logError(withTelemetryMessage(toError(error), "teleport direct resume failed"));
          await exitWithError(root, isTeleportOperationError ? error.message : errorMessage(error), () =>
            gracefulShutdown(1),
          );
        }
      }
    }
    if (
      isAgentsFleetEnabled() ||
      (typeof options.resume === "string" && isTranscriptFileResumeArg(options.resume))
    ) {
      if (options.resume && typeof options.resume === "string" && !resumeUuid) {
        let ccshareId = null?.parseCcshareId(options.resume);
        if (isTranscriptFileResumeArg(options.resume)) {
          let transcriptSessionId = normalizeUuidOrNull(basename(options.resume, ".jsonl"));
          if (transcriptSessionId && !options.forkSession) {
            let backgroundSessionHolder = await findBackgroundSessionHolder(transcriptSessionId, storageV5);
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
          let transcriptFileFailureStage = "load_error";
          try {
            let startTime = performance.now();
            let sessionRef = await loadTranscriptFromFile(options.resume, storageV5);
            let result = await loadConversationForResume(sessionRef, undefined, {
              forkSession: !!options.forkSession,
              replyOnResume: !!options.replyOnResume,
              storageV5,
              credentials,
              ...precomputeResumeHooks(session_2.precompute, storageV5, {
                forkSession: !!options.forkSession,
                expectedSessionId: transcriptSessionId ?? undefined,
              }),
              beforeUse: noopModelPinSubscriber(resumeSourceForPath(options.resume)),
            });
            if (result) {
              transcriptFileFailureStage = "processing_error";
              fleetOrigin = "local";
              fromPrValue = await processResumedConversation(
                result,
                {
                  forkSession: !!options.forkSession,
                  sessionIdOverride: transcriptSessionId ?? undefined,
                  transcriptPath: result.fullPath,
                  resumeSource: resumeSourceForPath(options.resume),
                },
                context,
              );
              if (fromPrValue.restoredAgentDef) mainThreadAgentDefinition = fromPrValue.restoredAgentDef;
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
              failure_reason:
                transcriptFileFailureStage === "processing_error"
                  ? lit("processing_error")
                  : lit("load_error"),
              error_name: sanitizeErrorName(toError(error)),
              error_code:
                error instanceof TranscriptFileFormatError
                  ? fromEnum(error.code)
                  : sanitizedErrnoLowerForTelemetry(error),
            });
            if (error instanceof ResumeRefusedError) return await exitWithError(root, error.message);
            if (transcriptFileFailureStage === "load_error" && isTranscriptLoadError(error))
              logForDebugging(`--resume file unreadable (${getErrnoCode(error)}): ${errorMessage(error)}`, {
                level: "error",
              });
            else logError(error);
            let transcriptLoadHelpText =
              transcriptFileFailureStage === "load_error" ? win32EbadfHelp(error) : undefined;
            await exitWithError(
              root,
              `Unable to load transcript from file: ${options.resume}${transcriptLoadHelpText === undefined ? "" : `: ${transcriptLoadHelpText}`}`,
              () => gracefulShutdown(1),
            );
          }
        }
      }
    }
    if (resumeUuid) {
      let resumeSessionId = resumeUuid;
      if (!options.forkSession) {
        let backgroundSessionHolder = await findBackgroundSessionHolder(resumeSessionId, storageV5);
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
              title: repoSlug ? getLogDisplayTitle(repoSlug) : undefined,
              holder: backgroundSessionHolder,
              canFork: true,
              handoff,
            }),
          );
        }
      }
      let resumeFailureStage = "load_error";
      try {
        let startTime = performance.now();
        let result = await loadConversationForResume(repoSlug ?? resumeSessionId, undefined, {
          forkSession: !!options.forkSession,
          replyOnResume: !!options.replyOnResume,
          storageV5,
          credentials,
          ...precomputeResumeHooks(session_2.precompute, storageV5, {
            forkSession: !!options.forkSession,
          }),
          beforeUse: noopModelPinSubscriber("store"),
        });
        if (!result) {
          logEvent("tengu_session_resumed", {
            entrypoint: lit("cli_flag"),
            success: false,
            failure_reason: lit("not_found_explicit_id"),
          });
          let notFoundMessage = `No conversation found with session ID: ${resumeSessionId}`;
          logForDebugging(notFoundMessage, {
            level: "error",
          });
          return await exitWithError(root, notFoundMessage, () => gracefulShutdown(1));
        }
        resumeFailureStage = "processing_error";
        let transcriptPath = repoSlug?.fullPath ?? result.fullPath;
        fleetOrigin = "local";
        fromPrValue = await processResumedConversation(
          result,
          {
            forkSession: !!options.forkSession,
            resumeSource: "store",
            sessionIdOverride: resumeSessionId,
            transcriptPath,
          },
          context,
        );
        if (fromPrValue.restoredAgentDef) mainThreadAgentDefinition = fromPrValue.restoredAgentDef;
        logEvent("tengu_session_resumed", {
          entrypoint: lit("cli_flag"),
          success: true,
          resume_duration_ms: Math.round(performance.now() - startTime),
        });
      } catch (error) {
        logEvent("tengu_session_resumed", {
          entrypoint: lit("cli_flag"),
          success: false,
          failure_reason:
            resumeFailureStage === "processing_error" ? lit("processing_error") : lit("load_error"),
          error_name: sanitizeErrorName(toError(error)),
          error_code: sanitizedErrnoLowerForTelemetry(error),
        });
        if (error instanceof ResumeRefusedError) return await exitWithError(root, error.message);
        if (resumeFailureStage === "load_error" && isTranscriptLoadError(error))
          logForDebugging(`--resume session load failed (${getErrnoCode(error)}): ${errorMessage(error)}`, {
            level: "error",
          });
        else logError(error);
        let resumeLoadHelpText = resumeFailureStage === "load_error" ? win32EbadfHelp(error) : undefined;
        await exitWithError(
          root,
          `Failed to resume session ${resumeSessionId}${resumeLoadHelpText === undefined ? "" : `: ${resumeLoadHelpText}`}`,
        );
      }
    }
    if (fileDownloadPromise)
      try {
        let downloadResults = await fileDownloadPromise;
        let failedDownloadCount = countWhere(downloadResults, (downloadResult) => !downloadResult.success);
        if (failedDownloadCount > 0)
          warnStartupIssues(`${failedDownloadCount}/${downloadResults.length} file(s) failed to download.`);
      } catch (error) {
        return await exitWithError(root, `Error downloading files: ${errorMessage(error)}`);
      }
    let resumePayload =
      fromPrValue ??
      (Array.isArray(fleetHost)
        ? {
            messages: fleetHost,
            fileHistorySnapshots: undefined,
            agentName: undefined,
            agentColor: undefined,
            restoredAgentDef: mainThreadAgentDefinition,
            initialState: initialSessionState,
            contentReplacements: undefined,
            sessionHooks: undefined,
            sessionStartHooks: undefined,
          }
        : undefined);
    if (resumePayload) {
      maybeActivateBrief(options);
      await noopAsync(options);
      if (!fromPrValue && fleetOrigin === "remote") noopModelPinReset(true);
      let effectiveDynamicMcpConfig = applyAgentModelOverride(
        dynamicMcpConfig,
        resumePayload.restoredAgentDef ?? mainThreadAgentDefinition,
        {
          strictMcpConfig,
        },
      );
      if (Object.keys(effectiveDynamicMcpConfig).length > 0)
        await awaitMcpPolicyColdStart({
          hasDynamicMcpConfig: true,
        });
      await launchSessionRepl(
        root,
        {
          getFpsMetrics,
          stats,
          initialState: resumePayload.initialState,
          sessionHooks: resumePayload.sessionHooks,
          session: session_2,
          storageV5,
          credentials,
        },
        {
          ...uploadOptions,
          mainThreadAgentDefinition: resumePayload.restoredAgentDef ?? mainThreadAgentDefinition,
          dynamicMcpConfig: effectiveDynamicMcpConfig,
          initialMessages: resumePayload.messages,
          pendingHookMessages: resumePayload.sessionStartHooks,
          initialMessagesOrigin: fleetOrigin,
          initialFileHistorySnapshots: resumePayload.fileHistorySnapshots,
          initialContentReplacements: resumePayload.contentReplacements,
          initialAgentName: resumePayload.agentName,
          initialAgentColor: resumePayload.agentColor,
        },
        renderAndRun,
      );
    } else if (
      options.resume === true &&
      !options.forkSession &&
      fromPr === undefined &&
      !inputPrompt &&
      !hasEarlyInput() &&
      options.name === undefined &&
      options.watchArtifact === undefined &&
      options.watchArtifactNoAutoreact === undefined &&
      !cliCarriesSessionConfig(options) &&
      isAgentsFleetEnabled() &&
      isPastSessionsExperimentEnabled()
    ) {
      logEvent("tengu_fleetview", {
        viaResume: true,
      });
      consumeEarlyInput();
      import("./utils/backgroundHousekeeping.js").then((housekeepingModule) =>
        housekeepingModule.startBackgroundHousekeeping(getRootSession().host, storageV5),
      );
      let [{ mountFleetView }, { applyFleetViewHostWindowsEnv }] = await Promise.all([
        import("./components/fleet/FleetView.js"),
        import("./screens/FleetView/FleetViewScreen.js"),
      ]);
      applyFleetViewHostWindowsEnv();
      await mountFleetView(root, {
        entryChannel: "cli_resume",
        storageV5,
        credentials,
        dispatchExtraArgs: earlyArgsArgv(retryState.additionalWorkingDirectories),
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
          initialState: initialSessionState,
          session: session_2,
          storageV5,
          credentials,
        },
        getWorktreePaths(getOriginalCwd()),
        {
          ...uploadOptions,
          initialSearchQuery,
          forkSession: options.forkSession,
          permissionModeSuppliedOnInvocation: session.permissionModeSuppliedOnInvocation,
          filterByPr: fromPr,
          startsInCloudByDefault: false,
        },
      );
  } else {
    profileCheckpoint("action_after_hooks");
    maybeActivateBrief(options);
    await noopAsync(options);
    saveMode(coordinatorModeModule.isCoordinatorMode() ? "coordinator" : "normal");
    noopModelPinReset();
    logDeepLinkLaunch(session_2, options);
    await launchSessionRepl(
      root,
      {
        getFpsMetrics,
        stats,
        initialState: initialSessionState,
        session: session_2,
        storageV5,
        credentials,
      },
      {
        ...uploadOptions,
        pendingHookMessages: sessionStartHooks,
      },
      renderAndRun,
    );
  }
}
export {
  compactJsonForTypedTransport,
  resetCursor,
  getPolicyMemoryFingerprint,
  logManagedSettings,
  prefetchSystemContextIfSafe,
  suggestUnknownSubcommand,
  extractTeammateOptions,
  getInputPrompt,
  logTenguInit,
  runMigrations,
  applySettingSourcesFlagFromArgv,
  main,
  eagerLoadSettings,
  loadManagedSettingsFromFlag,
  loadSettingsFromFlag,
};
