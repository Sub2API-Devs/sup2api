/**
 * cli/startup/prepareSession.ts
 *
 * 2.1.316 新增：会话准备主流程（托管设置日志、回合输入预取、启动遥测、空闲启动工作）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ptrwbb7.js (1), chunk-3wek6r2k.js (20)
 * attribution: placement 21
 */
import { resolve } from "path";
import { readFile, stat, realpath } from "fs/promises";
import { getClientSurface_2, logStartupCommandTelemetry, logRegisteredHooks } from "./startupTelemetry.js";
import {
  fromSanitizer_SANITIZER_OUTPUT_ONLY,
  fromEnum,
  fromEnumOpt,
  lit,
  agentTypeForAnalyticsFromDefinition,
} from "../../services/analytics/safeMetadata.js";
import { logError } from "../../utils/log.js";
import {
  getSettingsForSource,
  getPolicyEnvCompositionForLogging,
  getShadowedMcpPolicySources,
  getManagedFileProtectionForLogging,
  getMcpPolicyCompositionForLogging,
  getShadowedPolicyHelperSources,
  logManagedDocumentLinks,
  getInitialSettings_2,
  getSettingsWithErrors_2,
  getSettingsAfterPluginLoad,
  hasSkipDangerousModePermissionPrompt,
} from "../../utils/settings/settings.js";
import {
  machineAdminPolicyState,
  warnStartupIssues,
  disableProactivitySelector,
  startProactivitySelectorGate,
  resolveStartupProactivity,
  startupProactivityLevel,
  startupPermissionModeForAsk,
  cleanWarningLine,
  setAutoMemoryToggleRecorder,
  shouldReplayUserMessages,
  initPluginsAtStartup,
} from "./startupMisc.js";
import {
  machineProviderEnv,
  configChangeBlocker,
  onSkillsSyncVetoChange,
  modelAttributionFields,
  RESUME_MODEL_ATTRIBUTION,
} from "../../utils/model/providerAttribution.js";
import { logEvent, logEventAsync } from "../../services/analytics/index.js";
import {
  logManagedSettings,
  prefetchSystemContextIfSafe,
  suggestUnknownSubcommand,
  extractTeammateOptions,
  getInputPrompt,
  logTenguInit,
} from "../../main.js";
import { logForDebugging } from "../../utils/debug.js";
import { MANAGED_SOURCE_NOTICE_LABELS } from "../../utils/settings/policySettings.js";
import {
  logFeatureSad,
  logFeatureOk,
  logFeatureSadAsync,
} from "../../services/analytics/featureTelemetry.js";
import { env, udsEnv } from "../../utils/env.js";
import {
  setUserMsgOptIn,
  isParkedSpare,
  getIsRemoteMode,
  getDisableSlashCommands,
  getIsNonInteractiveSession,
  getRootSession,
  getInitialMainLoopModel,
  getSdkBetas,
  setOriginalCwd,
  setProjectRoot,
  setRestrictedSession,
  setFlagAgentsFilePaths,
  setDisableSlashCommands,
  setTeammateAgentId,
  getSessionId,
  setSessionBypassPermissionsMode,
  setFlagMcpConfigFilePaths,
  setChromeFlagOverride,
  setStrictMcpConfig,
  setCliSessionConfigCarried,
  setForkRestrictedLaunchConfig,
  setForkReplayLaunchConfig,
  setPermissionPromptToolName,
  setReplConfigArgv,
  getInlinePlugins,
  getInlinePluginsNoMcp,
  setAdditionalDirectoriesForClaudeMd,
  setAllowedChannels,
  setSessionTrustAccepted,
  setIsRemoteMode,
  hasSyncedPluginLaneOpened,
  clearSyncedPluginDirs,
  setSessionPersistenceDisabled,
  markSpareParked,
  getSkillsSyncVetoed,
  getPluginsSyncVetoed,
  setMainThreadAgentType,
  getProjectRoot,
  setMainLoopModelOverride,
  getUserMsgOptIn,
  getFlagSettingsExpectedContent,
  getFlagSettingsPath,
  setThinkingDisplayExplicit,
} from "../../bootstrap/state.js";
import { useAfterFirstRender } from "../../hooks/useAfterFirstRender.js";
import {
  initCoreUserData,
  getFeatureValue_CACHED_MAY_BE_STALE,
  isGrowthBookEnabled,
  isGrowthBookCacheEmpty,
  initializeGrowthBook,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  hasFreshGrowthBookFeatures,
  isGrowthBookInitializeInFlight,
} from "../../services/analytics/growthbook.js";
import { getOrBuildUserContext, prefetchGitStatus, subscribeMemoryToggleRefresh } from "../../context.js";
import {
  prefetchAwsCredentialsAndBedRockInfoIfSafe,
  prefetchGcpCredentialsIfSafe,
  isClaudeAISubscriber,
  validateForceLoginOrg,
} from "../../utils/auth.js";
import { primeModelCapabilities } from "../../utils/model/modelCapabilities.js";
import { primeGatewayModels, discoverGatewayModels } from "../../services/gateway/gatewayDiscovery.js";
import {
  refreshServedModelCapabilities,
  startServedCatalog,
  startServedCatalogShadow,
  shouldFetchServedCatalog,
  ensureCatalogDecision,
} from "../../utils/model/servedModelCatalog.js";
import { noteReloadReason } from "../../plugins/functionHooks/pluginLifecycle.js";
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";
import { isBareMode, isSafeMode, getMaxTurnsFromEnv, parseIntLoose } from "../../utils/envUtils.js";
import { sharedSkillChangeDetector } from "../../utils/skills/skillChangeDetector.js";
import {
  withTelemetryMessage,
  toError,
  errorMessage,
  getErrnoCode,
  CliUserError,
} from "../../utils/errors.js";
import { countFilesRounded } from "../../utils/ripgrep.js";
import { getCwd } from "../../utils/cwd.js";
import { prefetchOfficialMcpUrls } from "../../services/routines/routinesApi.js";
import { hasEmbeddedSearchTools_2 } from "../../utils/embeddedTools.js";
import { installMemoryExitSummary } from "../../utils/telemetry/memorySummary.js";
import {
  getMemoryPeaks,
  markCcrInjectedConfig,
  filterObject,
  platformOrOther,
} from "../../services/analytics/metadata.js";
import { parseUserSpecifiedModel, bytesPerTokenForModel } from "../../utils/model/modelDisplay.js";
import { getDefaultMainLoopModel } from "../../utils/model/modelFallback.js";
import { getContextWindow } from "../../utils/model/configs.js";
import {
  loadAllPluginsCacheOnly,
  clearPluginCache,
  refillPluginLoadCacheOnly,
  shouldFillPluginLoadWithStore,
  shouldSyncPluginInstall,
} from "../../utils/plugins/pluginLoader.js";
import { policyEnabledPluginNameSet } from "../../utils/plugins/pluginPolicy.js";
import {
  buildPluginCommandTelemetryFields,
  logPluginLoadFailed,
  logPluginsEnabledForSession,
  sanitizedPluginIds,
} from "../../utils/telemetry/pluginTelemetry.js";
import { extractMcpServersFromPlugins } from "../../utils/plugins/mcpPluginIntegration.js";
import { loadPluginLspServers } from "../../utils/plugins/lspPluginIntegration.js";
import { getPluginSeedDirs } from "../../utils/plugins/pluginDirectories.js";
import { computeRemoteSettingsEligibility } from "../../services/cloudSessions/eligibility.js";
import {
  isRemoteManagedSettingsVerified,
  getLastLoadStatus,
  hasLoadCycleEnded,
} from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { hasManagedSettings } from "../../utils/settings/managedRestrictionKeys.js";
import {
  hasRepoSettingsEnv,
  armPendingSettingsEnvRule,
  releaseGrowthBookHold,
  armStartupWorkGate,
  hasHeldGrowthBook,
  GROWTHBOOK_HOLD_STAGES,
  canSkipGrowthBookHold,
  maybeStartLazyLoad,
  holdForStartupWork,
} from "./startupWorkGate.js";
import { hasHelperPassInFlight } from "../../utils/settings/policyHelper/helperRemote.js";
import {
  startupFlagWaitBudget,
  isRemoteNonInteractiveSession,
  startupGrowthBookKickOutcome,
  waitForInitialize,
  startupFlagWaitPoint,
  EVENT_LOGGING_FLAG_WAIT_MS,
} from "../../utils/startupFlagWait.js";
import { is1PEventLoggingEnabled } from "../../services/analytics/firstPartyEventLogger.js";
import { cliWarn, cliError, cliErrorAfterAnalyticsFlush, printCliError } from "../exit.js";
import { isPlainNonInteractive } from "../../utils/sessionShape.js";
import { enqueueTaskNotification } from "../../utils/task/taskNotifications.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { isStandaloneExecutable, jsonParse } from "../../utils/slowOperations.js";
import { profileCheckpoint, addStartupContext } from "../../utils/startupProfiler.js";
import {
  consumeBridgeMcpCarrierMarker,
  isBridgeCarrierPromptBound,
  verifyBridgeCarrierPrompt,
  getRepoMcpListsForAnalytics,
  parseMcpConfig,
  parseMcpConfigFromFilePath,
  areMcpConfigsAllSdkType,
  filterDynamicMcpServersByPolicy,
  doesEnterpriseMcpConfigExist,
  areMcpConfigsAllowedWithEnterpriseMcpConfig,
  ccrInjectedKeptDespiteAllowlist,
  ccrRepoToolsOnlyNote,
  getUnusableEnterpriseMcpConfigMessage,
  isMcpServerDenied,
  isClaudeInChromeBlockedByEnterpriseMcpConfig,
  gateDynamicMcpConfigForEnterpriseMcpConfig,
  headlessSyncsClaudeAiConnectors,
  filterMcpServersByPolicy,
  hasManagedMcpPolicy,
  isEnterpriseMcpConfigHeld,
  getClaudeCodeMcpConfigs,
  mcpConfigsAfterWaits,
  isMcpServerAllowedByPolicy,
} from "../../services/mcp/config.js";
import { registerHistoryExitFlush } from "../../history.js";
import { sanitizeDeepLinkQuery, validateDeepLinkCwd } from "../../utils/deepLink/parseDeepLink.js";
import { chdirAndSetCwd } from "../../utils/Shell.js";
import {
  clearProjectPathForConfigCache,
  resetTrustDialogAcceptedCache,
  checkHasTrustDialogAccepted,
  isWorkspacePersistedTrusted,
  getGlobalConfig,
  saveGlobalConfig,
  hasClientDataCacheSlot,
} from "../../utils/config.js";
import { clearMemoryFilesCacheForHost, setClaudeMdJudgedBy } from "../../utils/claudemd.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { resetSettingsCacheWithBackendRead } from "../../utils/settings/settingsPrime.js";
import { resetGitFileWatcher } from "../../utils/git/gitFilesystem.js";
import { updateHooksConfigSnapshot } from "../../utils/hooks/hooksConfigSnapshot.js";
import { getPlansDirectory, primePlanSlugCollisions } from "../../utils/plans.js";
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import { isFirstPartyTelemetryBlocked } from "../../utils/hostEnvironment.js";
import { seedEarlyInput } from "../../utils/earlyInput.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { looksLikeAgentsJson, AGENTS_FLAG_FILE_REQUIRES_PRINT, readAgentsFlagFile } from "../agentsArg.js";
import { uniq, count } from "../../utils/collections.js";
import {
  validateAgentsJson,
  getBuiltInAgents,
  getAgentDefinitionsWithOverrides,
  agentReadForTheSeat,
  isBuiltInAgent,
} from "../../tools/AgentTool/loadAgentsDir.js";
import { isFocusModeEnabled } from "../../utils/focusMode.js";
import { resolveSetting } from "../../utils/settings/userIntentSettings.js";
import { announceScreenReaderMode } from "../../utils/accessibility/screenReader.js";
import { resolveWindowArg, reportEnvWindow } from "../../services/compact/autoCompactWindow.js";
import { isWorktreeModeEnabled } from "../../utils/worktreeModeEnabled.js";
import { parsePRReference, isTmuxAvailable, getTmuxInstallInstructions } from "../../utils/worktree.js";
import { getPlatform } from "../../utils/platform.js";
import {
  setAllHookEventsEnabled,
  consumeUserPromptSubmitEventsEnv,
} from "../../utils/hooks/hookOutputParsing.js";
import {
  resolveCloudLaunchOptions,
  validateSessionIdFlag,
  oneMillionContextNotice,
  trackSessionSwitches,
  mcpConfigIgnoredOnCloud,
} from "../cloudSession/validateCloudFlags.js";
import { sensitivePathGateEnabled } from "../../utils/permissions/sensitivePaths.js";
import { isViolinWoodEnabled } from "../../services/analytics/violinGates.js";
import { isCloudBackendForced } from "../cloudSessionArgs.js";
import {
  awaitPolicyLimitsColdStart,
  waitForPolicyLimitsToLoad,
  shouldAwaitPolicyLimitsOnStartup,
  ensurePolicyLimitsLoadRequested,
  getPolicyLimitsColdStartWait,
  didPolicyLimitsColdStartTimeOut,
  POLICY_LIMITS_COLD_AWAIT_MS,
} from "../../services/policyLimits/PolicyLimitsClient.js";
import { isCloudSessionsDeniedByOrg } from "../../services/cloudSessions/cloudSessionsPolicy.js";
import { forgetLauncherHostLoginForCloud, joinPromptAppend, runStartupHooks } from "./launcherHostLogin.js";
import { alwaysFalse as alwaysFalse_2 } from "../../utils/stubs.js";
import { parseWatchArtifactArg, setPendingWatchArtifact } from "../watchArtifactArgs.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import {
  sessionIdExists,
  saveAutoMemorySessionSwitch,
  cacheSessionTitle,
  cacheAgentName,
  saveAgentSetting,
  titleCacheStillOn,
} from "../../utils/sessionStorage.js";
import { BG_EXIT_CAUSE_SESSION_IN_USE } from "../../utils/bgExitSidecars.js";
import { getSessionIngressAuthToken } from "../../utils/sessionIngressAuth.js";
import { parseFileSpecs, downloadSessionFiles } from "../../services/api/filesApi.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { readAppendPromptHead } from "./appendPromptHead.js";
import {
  readAppendSubagentPrompt,
  enableAppendSubagentPrompt,
  loadAgentsForSession,
  findSelectedAgent,
} from "./agentsFlag.js";
import {
  resolveSystemPromptOptions,
  initialPermissionModeFromCLI,
  isDefaultPermissionModeAuto,
  settleProvisionalStartupMode,
  levelAutoHeldForPendingVerdictNotice,
  abandonPendingPolicyVerdictResolution,
  readChromeClassifierFloor,
  resolveFallbackModels,
  splitCommaList,
  withCliArgAllowRules,
} from "../../utils/permissions/permissionSetup.js";
import { isRemoteSessionLaunch } from "../eagerFlags.js";
import {
  noteFlagFetchWait,
  recordPhase,
  markWarmCacheKickAsks,
  getFlagFetchKick,
} from "../../utils/startupTiming.js";
import { DEFAULT } from "../../utils/proactivityMode.js";
import { keybindingsState } from "../../keybindings/loadUserBindings.js";
import { alwaysFalse, logProactivityStartup } from "../../Tool.js";
import { isRelaunchProactivityEverOn } from "../../utils/proactivityRelaunch.js";
import { restrictedBypassNotice } from "../../services/mcp/redactMcpErrors.js";
import { applyInheritedPermissionModeFlag } from "../permissionModeFlags.js";
import { isAutoModeFromFallback, setAutoModeFlagCli } from "../../utils/permissions/autoModeState.js";
import { emitStartupMark } from "../../utils/startupMarks.js";
import { awaitMcpPolicyColdStart } from "../../services/mcp/mcpPolicyColdStart.js";
import {
  loadRemoteMcpConfig,
  mergeMcpConfigs,
  recordSkippedDynamicServers,
  applyMcpPolicyDrops,
  mcpConfigProvenanceNote,
} from "../../services/mcp/mcpConfigProvenance.js";
import { getServerUrl } from "../../utils/permissions/permissionRulePayload.js";
import { startupCcrEnv } from "../../tasks/RemoteAgentTask/remoteAgentKinds.js";
import { safeParseJSON } from "../../utils/json.js";
import { plural, sanitizeSessionTitle } from "../../utils/stringUtils.js";
import {
  areSideloadFlagsDisabledByPolicy,
  sideloadFlagsBlockedMessage,
} from "../../utils/plugins/marketplacePolicy.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isCliOwnedConfig, registerCliOwnedConfig } from "../../services/mcp/cliOwnedClients.js";
import { isLockedOutByOrgMcpPolicy } from "../../services/mcp/orgMcpPolicyLockout.js";
import {
  hasHostedClaudeInChromeServer,
  shouldEnableClaudeInChrome,
  isClaudeInChromeAllowed,
  shouldAutoEnableClaudeInChrome,
  putChromePromptInSystemPrompt,
  adoptHostedClaudeInChrome,
  setupClaudeInChrome,
  markClaudeInChromeUnwired,
} from "../../utils/claudeInChrome/setup.js";
import { policyDeniedReason } from "../../services/policyLimits/policyEvidence.js";
import {
  CLAUDE_IN_CHROME_MCP_SERVER_NAME,
  getClaudeInChromeStdioServerConfig,
} from "../../utils/claudeInChrome/common.js";
import {
  isBridgeChildMachineSettings,
  prefetchEligibilityIfNeeded,
} from "../../utils/nativeInstaller/installer.js";
import { getProviderState } from "../../utils/model/providerCaches.js";
import { cliCarriesSessionConfig, cliCarriesForkRestrictedConfig } from "../../utils/sessionConfigFlags.js";
import {
  isNoPromptHost,
  NONE,
  effectivePermissionPromptTool,
} from "../../utils/permissions/permissionPromptHost.js";
import { earlyArgsToArgv, resolveEarlyArgPaths } from "../earlyArgs.js";
import { appliedSettingSourcesFlagValue } from "../../utils/settings/constants.js";
import { isChannelAllowlisted } from "../../services/mcp/channelAllowlist.js";
import { splitRuleList } from "../../utils/permissions/disallowedToolsFlag.js";
import {
  applySessionLaunchOptions,
  enableTranscriptLocalGc,
  setToolResultCopyMode,
  cloudUnavailableReason,
  shouldPrefetchUserContext,
} from "./sessionLaunchOptions.js";
import { filterUnseenSecurityWarnings } from "../../utils/permissions/securityWarnings.js";
import { stripControlChars } from "../../utils/settings/writeQueues.js";
import { checkBypassPermissionsEnv } from "../../utils/permissions/PermissionUpdate.js";
import { enforceMinimumVersion } from "../../utils/autoUpdater.js";
import {
  fetchClaudeAiConfigsOnce,
  printClaudeAiConnectorNotice,
  markConnectorListUnavailable,
} from "../../services/mcp/claudeai.js";
import { isGateOOn } from "../../utils/settings/settingsSourceTrust.js";
import { validateSdkUrlFlag } from "../transports/sdkUrlValidation.js";
import { logOrgPolicyDeniedAsync } from "../../services/policyLimits/orgPolicyDeniedEvent.js";
import { REMOTE_CONTROL_DISABLED_BY_POLICY_MESSAGE } from "../../bridge/remoteControlPolicy.js";
import { setRemoteSdkUrlEnv } from "../../services/ccrAgentProxy/agentProxy.js";
import { isScrubEnabled } from "../../utils/subprocessEnv.js";
import { stdinOverrideCache } from "../../utils/renderOptions.js";
import { exitWithoutInteractiveInput } from "./interactiveInputCheck.js";
import {
  isNonInteractiveOrBgSession,
  createSyntheticOutputTool,
} from "../../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import {
  isBgSession,
  getSessionRegistryState,
  registerSession,
  envSessionKind,
  updateSessionName,
  getRegisteredSessionName,
  countConcurrentSessions,
} from "../../utils/concurrentSessions.js";
import { claudeTempDir } from "../../utils/tempDir.js";
import { writeStartupFailureResult } from "../startupFailureResult.js";
import { initBuiltinPlugins } from "../../plugins/builtinPlugins.js";
import { initBundledSkills } from "../../skills/bundled/index.js";
import {
  refuseOrgConfigEarlyAtStartup,
  enforceOrgConfigGateHeadless,
  enforceOrgConfigGateAtStartup,
} from "../../services/policyLimits/orgConfigStartup.js";
import {
  startEarlyPluginsSync,
  refreshAccountSkillsSyncFlag,
  primeSkillsListAskConversion,
  startFirstPluginsSync,
} from "../../utils/claudeAiSync/skillsSync.js";
import {
  startEarlySkillsSync,
  startSkillSyncAndResync,
  pruneSkillsSyncRoot,
} from "../../services/skillsSync/skillsSync.js";
import {
  refreshMemoryContextForCcr,
  refreshMemoryContext,
  maybeKickMemoryContextFetch,
} from "../../services/accountMemory/memoryContext.js";
import { isWorktreeCloudClaimEnabled } from "../../utils/shutdown/pendingWrites.js";
import { warmCommandSourceCaches, getCommands, isSkillToolCommand } from "../../commands.js";
import { applyConfigEnvironmentVariables } from "../../utils/managedEnvApply.js";
import { startKeptProjectDetail } from "../../services/projects/projectContext.js";
import { ensureModelStringsInitialized } from "../../utils/model/modelStrings.js";
import { clearSkillCaches } from "../../skills/loadSkillsDir.js";
import {
  enableAccountPluginsSync,
  isPluginsSyncFlagOn,
} from "../../services/plugins/accountSync/syncedPluginHooks.js";
import {
  isAppliedListCurrent,
  pruneSyncedPluginsForClosedGate,
  completeDeferredRemovals,
} from "../../utils/claudeAiSync/pluginsSync.js";
import { syncClaudeAiMarketplaces } from "../../utils/plugins/claudeAiMarketplacesSync.js";
import { isXtermJs } from "../../ink/terminal.js";
import { clampLevelForAttacher } from "../../ink/colorize.js";
import { CLAUDE_AGENT } from "../../tools/AgentTool/built-in/claudeAgent.js";
import { findAgentExcludingWebFetch } from "../../tools/WebFetchTool/harnessNotes.js";
import { isCoworkAny } from "../../utils/entrypointKinds.js";
import { withAgentDisallowedTools } from "../../tools/AgentTool/agentToolUtils.js";
import { checkSchemaSatisfiable } from "../../tools/SyntheticOutputTool/schemaCheck.js";
import { applyClientDataToSession, checkClientDataModelEntry } from "../../services/clientDataUrl.js";
import { collectModelOverrides, applyAgentModelOverride } from "../../utils/model/modelOverrideNotices.js";
import { managedDenyStartupRefusal } from "../../utils/model/modelAllowlist.js";
import { fetchDynamicModelConfig } from "../../utils/model/dynamicModelConfig.js";
import { setSessionFallbacks } from "../../utils/model/modelUnavailability.js";
import { setRemoteFallbackLatch } from "../../services/api/refusalFallback.js";
import { resolveEffortLevel, createSessionEffortState, getEffortCapWarning } from "../../utils/effort.js";
import {
  isAdvisorToolEnabled,
  baseModelSupportsAdvisor,
  canUseAsAdvisor,
  isAdvisorPendingConsent,
  getAdvisorCreditsNotice,
  getAdvisorModelSwitchCommand,
  canAdviseModel,
  getConfiguredAdvisorModel,
} from "../../utils/advisor.js";
import { stripAnyVersatileSuffix } from "../../utils/model/modelIds.js";
import { filterAllowedSdkBetas, isBetaHeaderAllowed } from "../../utils/betas.js";
import {
  startupModelWinsOverSessionRestore,
  maybeSwitchSessionForResume,
} from "../../utils/sessionRestore.js";
import {
  buildUnknownModelNotice,
  emitUnknownModelNotice,
} from "../../services/compact/unknownModelNotice.js";
import { initializeLspServerManager } from "../../services/lsp/manager.js";
import { isReportableDiagnostic } from "../../screens/Doctor.js";
import { logSkippedInvalidSetting } from "../../utils/settings/settingsErrorsHeadless.js";
import { setFetchesClientData, trackClientDataFetch } from "../../bridge/bridgeEnabled.js";
import { probeQuotaStatusAtStart } from "../../services/claudeAiLimits.js";
import { fetchBootstrapData, bootstrapFetchCanConvergeSlot } from "../../services/api/bootstrap.js";
import { prefetchFastModeStatus, initFastModeOrgStatusGuess } from "../../utils/fastMode.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { shouldWireHostedDesktopComputerUse } from "../../utils/computerUse/hostedDesktop.js";
import { getHostedDesktopComputerUseConfig } from "../../services/mcp/client.js";
import { isFirstPartyUploadScope } from "../../services/mcp/fileReference/fileReferencePolicy.js";
import { applyDynamicServerToolPolicies } from "../../services/mcp/mcpStringUtils.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
import { hookSourcesSummary } from "../../utils/hooks/hookSources.js";
import { startHookRun } from "../../utils/sessionStart.js";
import { isThinkingDisplayMode } from "../../entrypoints/sdk/coreSchemas.js";
import { resolveThinkingDisplay, suppressesThinkingDisplay } from "../../utils/thinking.js";
import { startWatchdogSafe } from "../../utils/resourceWatchdog.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { mergeSessionFlags, setSessionFlagReaders } from "../../services/api/sessionFlags.js";
import {
  isSandboxEgressRestricted,
  isSandboxHostAllowlistEnforced,
  SandboxManager,
  isToolSandboxActive,
} from "../../utils/sandbox/sandbox-adapter.js";
import { logContextMetrics, withTimeout as withTimeout_2 } from "../../utils/api.js";
import { getTools } from "../../tools.js";
import { logShellAllowRulesAtInit } from "../../utils/permissions/shellAllowRuleTelemetry.js";
import { noopAsync_3 } from "../../services/compact/compact.js";
import { createManagedSettingsReporter } from "../../services/remoteManagedSettings/managedSettingsTelemetry.js";
import { reclaimSessionNameOnResume, claimSessionNameAtStartup } from "../../utils/sessionNameUniqueness.js";
import { gracefulShutdownSync } from "../../utils/gracefulShutdown.js";

//@ chunk-3wek6r2k.js:95105-95186 placement
function summarizeFlagSettingsForLogging(e, o) {
  let allKeys = getClientSurface_2(e, o);
  return {
    flag_count: allKeys.length,
    flags: fromSanitizer_SANITIZER_OUTPUT_ONLY(allKeys.join(",")),
  };
}
//@ chunk-3wek6r2k.js:95186-95378 placement
function prefetchAllMcpResourcesSafe(e, o, n) {
  try {
    let { prefetchAllMcpResources } = require("./chunk-asne9cp8.js").mcpClientModule();
    return prefetchAllMcpResources(e, o, n);
  } catch (error) {
    logError(error);
    return Promise.resolve({
      clients: [],
      tools: [],
      commands: [],
    });
  }
}
//@ chunk-3wek6r2k.js:95378-95608 placement
/**
 * main.tsx 的懒加载模块句柄：teammate 工具、teammate 提示补充、teammate 模式快照、协调者模式、制品启动等。
 */
var getTeammateUtils = () => require("./chunk-7tqwkdxc.js");
var teammatePromptAddendumModule = () => require("./chunk-8b9d5hx8.js");
var teammateModeSnapshotModule = () => require("./chunk-s90rfvdh.js");
var coordinatorModeModule = require("./chunk-yxywkh50.js");
var routineStartupModule = null;
var artifactStartupModule = require("./chunk-tbts81qj.js");
var ccrArtifactsEntryModule = require("./chunk-vtyyqz9q.js");
//@ chunk-3wek6r2k.js:95608-95646 placement
var artifactsMcpLaptopModule = require("./chunk-d5fbj7hf.js");
//@ chunk-3wek6r2k.js:95646-96816 placement
/**
 * 托管设置（policySettings）存在时上报 tengu_managed_settings_loaded，并对未生效的 MCP 策略键、被忽略的 policyHelper 打警告。
 */
function logManagedSettingsLoaded() {
  try {
    let policySettings = getSettingsForSource("policySettings");
    if (policySettings) {
      let policyEnvCompositionForLogging = getPolicyEnvCompositionForLogging();
      let shadowedMcpPolicySources = getShadowedMcpPolicySources();
      let sizingReport = readSizingReport(getManagedFileProtectionForLogging);
      let sizingReport_2 = readSizingReport(machineAdminPolicyState);
      let sizingReport_3 = readSizingReport(machineProviderEnv);
      logEvent("tengu_managed_settings_loaded", {
        ...logManagedSettings(policySettings),
        ...(sizingReport && {
          managedFileProtection: fromEnum(sizingReport.protection),
          managedFileSetsOrgPin: sizingReport.setsOrgPin,
        }),
        ...(sizingReport_2 && {
          machineDocumentUnread: fromEnum(sizingReport_2.cause),
          machineSetsSignInPin: sizingReport_2.machineSetsSignInPin,
        }),
        ...(sizingReport_3 && {
          remoteIneligibilityAuthor: fromEnum(sizingReport_3.author),
          forcedRefreshFromMachine: sizingReport_3.forcedRefreshFromMachine,
        }),
        ...(policyEnvCompositionForLogging && {
          envUnionOptedOut: policyEnvCompositionForLogging.unionOptedOut,
          envUnionChanged: policyEnvCompositionForLogging.unionChangedEnv,
          remoteTierPresent: policyEnvCompositionForLogging.remoteTierPresent,
          mdmTierPresent: policyEnvCompositionForLogging.mdmTierPresent,
          fileTierPresent: policyEnvCompositionForLogging.fileTierPresent,
          adminTierCount: policyEnvCompositionForLogging.adminTierCount,
          tiersWithEnv: policyEnvCompositionForLogging.tiersWithEnv,
        }),
        ...getMcpPolicyCompositionForLogging(shadowedMcpPolicySources),
      });
      if (shadowedMcpPolicySources.length > 0)
        logForDebugging(
          `managed settings: MCP policy keys in ${shadowedMcpPolicySources
            .map(({ source }) => MANAGED_SOURCE_NOTICE_LABELS[source])
            .join(
              ", ",
            )} not applied: not the managed settings source that applies for them (/status names the keys)`,
          {
            level: "warn",
          },
        );
      let shadowedPolicyHelperSources = getShadowedPolicyHelperSources();
      if (shadowedPolicyHelperSources.length > 0) {
        logForDebugging(
          `policyHelper: helper configuration in ${shadowedPolicyHelperSources.map((shadowedPolicyHelperSource) => MANAGED_SOURCE_NOTICE_LABELS[shadowedPolicyHelperSource]).join(", ")} ignored under managedSourcesBehavior "merge"; helpers are read from the highest managed settings source only`,
          {
            level: "warn",
          },
        );
        logFeatureSad("settings_policy_helpers_per_os", "lower_source_helper_shadowed");
      }
    }
    logManagedDocumentLinks();
  } catch {}
}
//@ chunk-3wek6r2k.js:99424-99642 placement = maybeActivateBrief (0.909)
/**
 * --brief 或 CLAUDE_CODE_BRIEF：有权限时启用 SendUserMessage（brief 模式），上报 tengu_brief_mode_enabled。
 */
function maybeActivateBrief(options) {
  let briefFlag = options.brief;
  let briefEnv = env.CLAUDE_CODE_BRIEF;
  if (!briefFlag && !briefEnv) return;
  let { isBriefEntitled } = require("./chunk-cv3kgbt2.js");
  let entitled = isBriefEntitled();
  if (entitled) setUserMsgOptIn(true);
  logEvent("tengu_brief_mode_enabled", {
    enabled: entitled,
    gated: !entitled,
    source: fromEnum(briefEnv ? "env" : "flag"),
  });
}
//@ chunk-3wek6r2k.js:101033-101113 placement
function startDeferredPrefetches(e, o, n, { userContext: r = true } = {}) {
  startTurnInputPrefetches(e, o, n, {
    userContext: r,
  });
  startIdleStartupWork(e, o, n);
}
//@ chunk-3wek6r2k.js:101178-101818 placement = startDeferredPrefetches (0.413)
/**
 * 首屏渲染后的延迟预取：用户上下文、系统上下文、Bedrock/Vertex/Mantle 等云凭证、模型能力、文件变更检测器等。
 */
function startTurnInputPrefetches(e, o, credentials, { userContext = true } = {}) {
  if (useAfterFirstRender()) return;
  initCoreUserData();
  if (!isParkedSpare()) {
    if (userContext) getOrBuildUserContext(e, o, credentials);
    prefetchSystemContextIfSafe(e, o);
  }
  if (env.CLAUDE_CODE_USE_BEDROCK && !env.CLAUDE_CODE_SKIP_BEDROCK_AUTH)
    prefetchAwsCredentialsAndBedRockInfoIfSafe();
  if (env.CLAUDE_CODE_USE_ANTHROPIC_AWS && !env.CLAUDE_CODE_SKIP_ANTHROPIC_AWS_AUTH)
    prefetchAwsCredentialsAndBedRockInfoIfSafe();
  if (env.CLAUDE_CODE_USE_MANTLE && !env.CLAUDE_CODE_SKIP_MANTLE_AUTH)
    prefetchAwsCredentialsAndBedRockInfoIfSafe();
  if (env.CLAUDE_CODE_USE_VERTEX && !env.CLAUDE_CODE_SKIP_VERTEX_AUTH) prefetchGcpCredentialsIfSafe();
  if (env.CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD && !env.CLAUDE_CODE_SKIP_ANTHROPIC_GOOGLE_CLOUD_AUTH)
    prefetchGcpCredentialsIfSafe();
  primeModelCapabilities(o);
  primeGatewayModels(o);
  refreshServedModelCapabilities(o, credentials);
  discoverGatewayModels(o);
  startServedCatalog({
    allowNetwork: true,
  });
  startServedCatalogShadow({
    allowNetwork: shouldFetchServedCatalog(),
  });
  let p = configChangeBlocker(e, o, credentials);
  noteReloadReason(p);
  settingsChangeDetector.initialize(p, o);
  if (!isBareMode() && !getIsRemoteMode() && !getDisableSlashCommands())
    sharedSkillChangeDetector.initialize(p, o);
}
//@ chunk-3wek6r2k.js:101818-102267 placement
function startIdleStartupWork(e, o, n) {
  if (useAfterFirstRender()) return;
  if (!getIsNonInteractiveSession())
    import("./chunk-4t8fx0s8.js")
      .then(({ getRelevantTips }) =>
        getRelevantTips({
          session: getRootSession(),
          theme: "dark",
          ...(o && {
            storageV5: o,
          }),
          ...(n && {
            credentials: n,
          }),
        }),
      )
      .catch((error) => logError(withTelemetryMessage(toError(error), "tip prewarm failed")));
  if (!env.CLAUDE_CODE_REMOTE && !isParkedSpare()) countFilesRounded(getCwd(), AbortSignal.timeout(3000), []);
  prefetchOfficialMcpUrls();
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_drift_lantern", false))
    import("./chunk-d33z3ny7.js").then((r) =>
      r.startEventLoopStallDetector(e.host, {
        attributeSigcont: !getIsNonInteractiveSession(),
      }),
    );
  if (hasEmbeddedSearchTools_2()) installMemoryExitSummary(getMemoryPeaks);
}
//@ chunk-3wek6r2k.js:102267-102733 placement = extractLspServersFromPlugins (0.269)
/**
 * 会话启动时的插件遥测：cacheOnly 加载插件，预取 MCP/LSP 配置，记录启用插件与错误。名字配错，见 lead 建议。
 */
function logSessionTelemetry(e, o, n) {
  let userSpecifiedModel = parseUserSpecifiedModel(getInitialMainLoopModel() ?? getDefaultMainLoopModel());
  let u = [
    getCwd(),
    getContextWindow(userSpecifiedModel, getSdkBetas()),
    bytesPerTokenForModel(userSpecifiedModel),
    e,
    n !== undefined,
  ];
  let p = n === undefined ? logStartupCommandTelemetry(...u) : n.then(() => logStartupCommandTelemetry(...u));
  return loadAllPluginsCacheOnly(e, o)
    .then(async ({ enabled, errors }) => {
      let managedNames = policyEnabledPluginNameSet();
      buildPluginCommandTelemetryFields(enabled, managedNames);
      await Promise.all(
        enabled.map(async (E) => {
          await extractMcpServersFromPlugins(E, [], e);
          if (!E.lspServers) {
            let pluginLspServers = await loadPluginLspServers(E, [], e);
            if (pluginLspServers) E.lspServers = pluginLspServers;
          }
        }),
      );
      logPluginLoadFailed(errors, managedNames, {
        cacheOnly: true,
      });
      logRegisteredHooks(enabled, managedNames);
      let M = await p;
      logPluginsEnabledForSession(enabled, managedNames, getPluginSeedDirs(), M, e);
    })
    .catch((error) => logError(withTelemetryMessage(toError(error), "plugin session telemetry load failed")))
    .then(async () => {
      await p;
    });
}
//@ chunk-3wek6r2k.js:102733-102792 placement
function branchModeForTelemetry(poolOnBranch, poolRef) {
  return fromEnum(poolOnBranch ? "on_branch" : poolRef ? "ref" : "default");
}
//@ chunk-3wek6r2k.js:102792-102852 placement
function pendingSettingsEnvBlocksEarlyGb(e) {
  if (computeRemoteSettingsEligibility() && !isRemoteManagedSettingsVerified() && !hasManagedSettings())
    return true;
  return hasRepoSettingsEnv(e);
}
//@ chunk-3wek6r2k.js:102852-103020 placement
function shouldHoldEarlyGrowthBook(env_2) {
  let lastLoadStatus = getLastLoadStatus();
  return env.CLAUDE_CODE_CCR_EARLY_SYNC_AFTER_SETTINGS_REFUSAL &&
    hasLoadCycleEnded() &&
    lastLoadStatus?.state === "failed" &&
    lastLoadStatus.failure.errorKind === "http_403" &&
    !hasHelperPassInFlight()
    ? hasRepoSettingsEnv(env_2)
    : pendingSettingsEnvBlocksEarlyGb(env_2);
}
//@ chunk-3wek6r2k.js:103020-103126 placement
function judgeGrowthBookKick(relaunches) {
  return startupFlagWaitBudget({
    eventLoggingEnabled: is1PEventLoggingEnabled(),
    growthBookEnabled: isGrowthBookEnabled(),
    cacheEmpty: isGrowthBookCacheEmpty(),
    relaunches,
  });
}
//@ chunk-3wek6r2k.js:103126-103179 placement
function shouldKickGrowthBookOnWarmCache(e) {
  return e && getFeatureValue_CACHED_MAY_BE_STALE("tengu_sleepy_rabbit", false);
}
//@ chunk-3wek6r2k.js:103179-103441 placement
function judgeStartupGrowthBookKick(site, o) {
  let isNonInteractiveSession = getIsNonInteractiveSession();
  let r = isNonInteractiveSession && isRemoteNonInteractiveSession();
  let u = isNonInteractiveSession ? judgeGrowthBookKick(r) : undefined;
  let p = u !== undefined && isGrowthBookCacheEmpty();
  let h =
    u !== undefined &&
    !p &&
    ((r && env.CLAUDE_CODE_GROWTHBOOK_KICK_ON_WARM_CACHE) || shouldKickGrowthBookOnWarmCache(r));
  return startupGrowthBookKickOutcome({
    site,
    nonInteractive: isNonInteractiveSession,
    budgetMs: u,
    settingsEnvPending: (p || h) && pendingSettingsEnvBlocksEarlyGb(o),
    cacheEmpty: p,
    warmCacheKick: h,
  });
}
//@ chunk-3wek6r2k.js:103441-103747 placement
function reportStartupModelNotice(e, { key, outputFormat, debugLine = e, onStderrToo = false }) {
  if (
    !getIsNonInteractiveSession() ||
    (outputFormat !== "json" && outputFormat !== "stream-json" && env.CLAUDE_CODE_SESSION_KIND !== "bg")
  ) {
    warnStartupIssues(e);
    return;
  }
  logForDebugging(debugLine, {
    level: "warn",
  });
  if (onStderrToo) cliWarn(e);
  if (outputFormat === "stream-json" && !isPlainNonInteractive())
    enqueueTaskNotification({
      type: "system",
      subtype: "notification",
      key,
      text: e,
      priority: "high",
      color: "warning",
    });
}
//@ chunk-3wek6r2k.js:103747-104371 placement
function logStartupStarted() {
  logForDiagnosticsNoPII("info", "started", {
    version: {
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
    is_native_binary: isStandaloneExecutable(),
    incremental_request_body_env: env.CLAUDE_CODE_INCREMENTAL_REQUEST_BODY ?? 0,
  });
}
//@ chunk-3wek6r2k.js:104371-148438 placement
/**
 * 根命令的 action 主体（prepareSession）：处理深链、--bare/--safe-mode、单词提示、权限与工具参数、读 stdin 提示（getInputPrompt），调用 setup()，加载命令/工具/MCP/插件与 SessionStart 钩子，返回 prepared-headless（-p）或 prepared-interactive。
 */
async function prepareSession(name, options, program, r, pendingConnect, pendingSSH, h, storage, y) {
  profileCheckpoint("action_handler_start");
  consumeBridgeMcpCarrierMarker();
  registerHistoryExitFlush(storage);
  if (!getIsNonInteractiveSession()) {
    let s = require("./chunk-pky8b2sx.js");
    s.startPreviewBrowserDiscovery();
  }
  if (options.deepLinkOrigin && options.prefillB64 !== undefined && options.prefill === undefined)
    try {
      options.prefill = sanitizeDeepLinkQuery(options.prefillB64);
    } catch (error) {
      logForDebugging(`Ignoring invalid --prefill-b64: ${error instanceof Error ? error.message : error}`, {
        level: "error",
      });
    }
  if (options.deepLinkOrigin && options.deepLinkCwdB64 !== undefined)
    try {
      validateDeepLinkCwd(options.deepLinkCwdB64);
      chdirAndSetCwd(options.deepLinkCwdB64);
      setOriginalCwd(getCwd());
      setProjectRoot(getCwd());
      clearProjectPathForConfigCache();
      resetTrustDialogAcceptedCache();
      clearMemoryFilesCacheForHost();
      invalidateCommandNames();
      clearPluginCache("deeplink: originalCwd changed");
      let s;
      using C = {
        [Symbol.dispose]: () => s?.(),
      };
      if (isStorageV5Enabled() && storage !== undefined) s = await resetSettingsCacheWithBackendRead(storage);
      if (r()) refillPluginLoadCacheOnly(storage, "deeplink");
      resetGitFileWatcher();
      if (s !== undefined)
        updateHooksConfigSnapshot({
          userLayer: "retain",
        });
      else updateHooksConfigSnapshot();
      getPlansDirectory.cache.clear?.();
      primePlanSlugCollisions(storage);
    } catch (error) {
      logForDebugging(
        `Ignoring invalid --deep-link-cwd-b64: ${error instanceof Error ? error.message : error}`,
        {
          level: "error",
        },
      );
    }
  if (options.bare) process.env.CLAUDE_CODE_SIMPLE = "1";
  if (isSafeMode()) {
    process.env.CLAUDE_CODE_SAFE_MODE = "1";
    process.env.CLAUDE_CODE_DISABLE_CLAUDE_MDS = "1";
    logFeatureOk("startup_safe_mode");
  }
  let resolvedMaxTurns;
  try {
    resolvedMaxTurns = getMaxTurnsFromEnv(options.maxTurns);
  } catch (error) {
    return cliError(errorMessage(error));
  }
  if (name === "code") {
    logEvent("tengu_code_prompt_ignored", {});
    warnStartupIssues("Tip: You can launch Claude Code with just `claude`");
    name = undefined;
  }
  if (name && typeof name === "string" && !/\s/.test(name) && name.length > 0) {
    logEvent("tengu_single_word_prompt", {
      length: name.length,
    });
    if (!options.print && !options.continue && !options.resume && /^[a-zA-Z][a-zA-Z-]*$/.test(name))
      await suggestUnknownSubcommand(name, program);
  }
  let E;
  if (isAgentSwarmsEnabled() && !getIsNonInteractiveSession() && !options.agentId)
    try {
      let { initializeSessionTeam } = await import("./chunk-6cc2zqkz.js");
      E = await initializeSessionTeam(undefined, storage);
    } catch (error) {
      logError(error);
    }
  if (!isFirstPartyTelemetryBlocked())
    logEvent(
      "tengu_cli_flags",
      summarizeFlagSettingsForLogging(options, (s) => program.getOptionValueSource(s)),
    );
  let {
    debug = false,
    dangerouslySkipPermissions,
    allowDangerouslySkipPermissions = false,
    tools = [],
    restricted = false,
    allowedTools = [],
    disallowedTools = [],
    mcpConfig = [],
    permissionMode,
    inheritPermissionMode,
    proactivity,
    addDir = [],
    fallbackModel,
    betas = [],
    ide = false,
    sessionId,
    includeHookEvents,
    includePartialMessages,
    forwardSubagentText,
    sessionMirror,
  } = options;
  setRestrictedSession(restricted);
  if (options.prefill) seedEarlyInput(options.prefill);
  let fileDownloadPromise;
  let jt =
    typeof options.agents === "string" &&
    options.agents !== "" &&
    !isCustomizationDisabled("agents", {
      explicitlyRequested: true,
    });
  let yt = !options.resume && !options.continue && !env.CLAUDE_BG_POST_CLEAR_RESPAWN;
  let Ve;
  if (jt && typeof options.agents === "string" && !looksLikeAgentsJson(options.agents)) {
    if (!options.print && !getIsNonInteractiveSession()) return cliError(AGENTS_FLAG_FILE_REQUIRES_PRINT);
    let agentsFlagFile = await readAgentsFlagFile(options.agents);
    if (!agentsFlagFile.ok) return cliError(agentsFlagFile.error);
    options.agents = agentsFlagFile.json;
    Ve = agentsFlagFile.filePath;
    setFlagAgentsFilePaths(uniq([agentsFlagFile.filePath, agentsFlagFile.realPath]));
  }
  let agents = options.agents;
  if (jt && (yt || Ve !== undefined) && typeof agents === "string") {
    let s = validateAgentsJson(agents);
    if (s)
      return cliError(`Error: Invalid --agents configuration:
${s}${
        Ve
          ? `
(read from ${Ve})`
          : ""
      }`);
  }
  let agent = options.agent;
  if (agent) process.env.CLAUDE_CODE_AGENT = agent;
  let { outputFormat, inputFormat } = options;
  let viewMode = getInitialSettings_2().viewMode;
  let Ie = isFocusModeEnabled();
  let Ee =
    options.verbose ??
    (viewMode ? viewMode === "verbose" : Ie ? false : resolveSetting("verbose", false).value);
  let print = options.print;
  let init = options.init ?? false;
  let initOnly = options.initOnly ?? false;
  let maintenance = options.maintenance ?? false;
  announceScreenReaderMode(!print && process.stdout.isTTY === true, (s) => {
    console.log(s);
  });
  let disableSlashCommands = options.disableSlashCommands || false;
  setDisableSlashCommands(disableSlashCommands);
  let windowArg = resolveWindowArg(options.autocompact);
  let worktree = isWorktreeModeEnabled() ? options.worktree : undefined;
  let eo = typeof worktree === "string" ? worktree : undefined;
  let env_2 = worktree !== undefined;
  let kn;
  if (eo) {
    let prReference = parsePRReference(eo);
    if (prReference !== null) {
      kn = prReference;
      eo = undefined;
    }
  }
  let An = isWorktreeModeEnabled() && options.tmux === true;
  if (An) {
    if (!env_2) return cliError("Error: --tmux requires --worktree");
    if (getPlatform() === "windows") return cliError("Error: --tmux is not supported on Windows");
    if (!(await isTmuxAvailable()))
      return cliError(`Error: tmux is not installed.
${getTmuxInstallInstructions()}`);
  }
  let teammateOptions = extractTeammateOptions(options);
  if (teammateOptions.parentSessionId)
    getTeammateUtils().setCliParentSessionId?.(teammateOptions.parentSessionId);
  setTeammateAgentId(teammateOptions.agentId);
  let ze;
  if (isAgentSwarmsEnabled()) {
    ze = teammateOptions;
    let s = teammateOptions.agentId || teammateOptions.agentName || teammateOptions.teamName;
    let teamName = teammateOptions.agentId && teammateOptions.agentName && teammateOptions.teamName;
    if (s && !teamName)
      return cliError("Error: --agent-id, --agent-name, and --team-name must all be provided together");
    if (teammateOptions.agentId && teammateOptions.agentName && teammateOptions.teamName)
      getTeammateUtils().setDynamicTeamContext?.({
        agentId: teammateOptions.agentId,
        agentName: teammateOptions.agentName,
        teamName: teammateOptions.teamName,
        color: teammateOptions.agentColor,
        planModeRequired: teammateOptions.planModeRequired ?? false,
        parentSessionId: teammateOptions.parentSessionId,
      });
    if (teammateOptions.teammateMode)
      teammateModeSnapshotModule().setCliTeammateModeOverride?.(teammateOptions.teammateMode);
  }
  let sdkUrl = options.sdkUrl ?? undefined;
  let Tn = includePartialMessages || env.CLAUDE_CODE_INCLUDE_PARTIAL_MESSAGES;
  let Pn = forwardSubagentText || env.CLAUDE_CODE_FORWARD_SUBAGENT_TEXT;
  if (includeHookEvents || env.CLAUDE_CODE_REMOTE) setAllHookEventsEnabled(true);
  consumeUserPromptSubmitEventsEnv();
  if (sdkUrl) {
    if (!inputFormat) inputFormat = "stream-json";
    if (!outputFormat) outputFormat = "stream-json";
    if (options.verbose === undefined) Ee = true;
    if (!options.print) print = true;
  }
  let Np = false;
  let cloudSessionsByDefault = false;
  let sandboxVmByDefault = false;
  let cloudLaunchOptions = await resolveCloudLaunchOptions(options, {
    prompt: typeof name === "string" ? name : undefined,
    sessionId,
    outputFormat,
    inputFormat,
    hasSdkUrl: Boolean(sdkUrl),
    nonInteractive: getIsNonInteractiveSession(),
    isConnectedSessionsEnabled: sensitivePathGateEnabled,
    isViolinWoodEnabled,
    cloudPrintEnabled: isCloudBackendForced(),
    hasConnect: Boolean(pendingConnect?.url),
    hasSSH: Boolean(pendingSSH?.host),
    rcProjectGateEnabled: false,
    cloudSessionsByDefault,
    sandboxVmByDefault,
    cloudSessionsDeniedByOrgPolicy: async () => {
      await awaitPolicyLimitsColdStart();
      profileCheckpoint("action_after_cloud_default_policy_wait");
      return isCloudSessionsDeniedByOrg();
    },
    launchFolderMonorepoVerdict: () => "undetermined",
    noMonorepoAsksTheService: async () => false,
  });
  if (!cloudLaunchOptions.ok)
    return cloudLaunchOptions.flushAnalytics
      ? cliErrorAfterAnalyticsFlush(cloudLaunchOptions.error)
      : cliError(cloudLaunchOptions.error);
  forgetLauncherHostLoginForCloud(cloudLaunchOptions.value);
  if (cloudLaunchOptions.value.resumeInCloud !== null) options.resume = undefined;
  let yl = cloudLaunchOptions.value.cloudDefault === "declined";
  let jp = alwaysFalse_2();
  if (yl) logFeatureSad("cloud_session_default", "local_flag");
  let ts = cloudLaunchOptions.value.cloudDefault === "not_allowed";
  if (ts) logFeatureSad("cloud_session_default", "org_policy");
  let personalWithoutEffectNotification;
  let sandboxVmStayReason;
  let askCloudDefaultReason = false;
  let os = cloudLaunchOptions.value.cloudDefault === "applied";
  let {
    teleport,
    cloudAttachId,
    resumeInCloud,
    poolId,
    environmentQuery,
    poolPromotedRemote,
    poolRef,
    poolOnBranch,
    forwardHomeSettings,
    homeSettingsConsent,
    projectFlag,
    projectBrowse,
    projectForRemoteControl,
    correlationId,
    headlessCloud,
    headlessCloudPrint,
    serveOnly,
    persistentVolume,
    persistentVolumeFromSessionId,
    monorepo,
    noMonorepo,
    noMonorepoAsksTheService,
    personal,
  } = cloudLaunchOptions.value;
  let { remote } = cloudLaunchOptions.value;
  let oo =
    remote !== null ||
    cloudAttachId !== null ||
    poolId !== null ||
    poolPromotedRemote ||
    projectBrowse !== null ||
    Boolean(pendingConnect?.url) ||
    Boolean(pendingSSH?.host);
  if (restricted && oo)
    return cliError(
      "Error: --restricted cannot be enforced in a cloud, remote-environment or ssh session, which runs its tools on another machine",
    );
  getRootSession().host.launchOptions.replaceMayForwardHomeSettings(forwardHomeSettings);
  getRootSession().host.launchOptions.replaceHomeSettingsHostConsent(homeSettingsConsent);
  let $t =
    getIsNonInteractiveSession() &&
    (headlessCloud ||
      headlessCloudPrint ||
      cloudAttachId !== null ||
      projectBrowse !== null ||
      poolId !== null);
  let Ln;
  let ls = false;
  let ds = options.watchArtifact ?? options.watchArtifactNoAutoreact;
  if (ds !== undefined) {
    if (env.CLAUDE_CODE_REMOTE)
      return cliError(
        "Error: --watch-artifact isn't supported yet from remote sessions \u2014 run it in Claude Code on your own machine",
      );
    if (getIsNonInteractiveSession())
      return cliError(
        "Error: --watch-artifact requires an interactive session (not print mode, --sdk-url, --init-only, or redirected output)",
      );
    if (
      cloudAttachId !== null ||
      remote !== null ||
      poolPromotedRemote ||
      Boolean(pendingConnect?.url) ||
      Boolean(pendingSSH?.host)
    )
      return cliError(
        "Error: --watch-artifact is not available in sessions attached to a remote environment \u2014 run it in a plain local session",
      );
    let watchArtifactArg = parseWatchArtifactArg(ds);
    if ("error" in watchArtifactArg) return cliError(watchArtifactArg.error);
    let C = typeof options.watchArtifactNoAutoreact === "string";
    setPendingWatchArtifact(
      C
        ? {
            ...watchArtifactArg,
            autoReactDisarmed: true,
          }
        : watchArtifactArg,
    );
    Ln = watchArtifactArg.slug;
    ls = C;
  }
  let sessionGroupingId = null;
  let Fo = options.remoteControl ?? options.rc;
  let remoteControl = false;
  let remoteControlName = typeof Fo === "string" && Fo.length > 0 ? Fo : undefined;
  let remoteControlSessionNamePrefix = options.remoteControlSessionNamePrefix;
  if (remoteControlSessionNamePrefix)
    process.env.CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX = remoteControlSessionNamePrefix;
  let ps = validateSessionIdFlag({
    sessionId,
    continue: options.continue,
    resume: options.resume,
    forkSession: options.forkSession,
    sdkUrl,
  });
  if (!ps.ok) return cliError(ps.error);
  if (sessionId) {
    if (!sdkUrl) {
      let sessionId_2 = normalizeUuidOrNull(sessionId);
      if (!sessionId_2) return cliError("Error: Invalid session ID. Must be a valid UUID.");
      if (!(options.forkSession && options.resume === sessionId_2) && sessionIdExists(sessionId_2))
        return cliError(`Error: Session ID ${sessionId_2} is already in use.`, BG_EXIT_CAUSE_SESSION_IN_USE);
    }
  }
  let file = options.file;
  if (file && file.length > 0) {
    let sessionIngressAuthToken = getSessionIngressAuthToken();
    if (!sessionIngressAuthToken)
      return cliError(
        "Error: Session token required for file downloads. CLAUDE_CODE_SESSION_ACCESS_TOKEN must be set.",
      );
    let sessionId = process.env.CLAUDE_CODE_REMOTE_SESSION_ID || getSessionId();
    let files = parseFileSpecs(file);
    if (files.length > 0) {
      let config = {
        baseUrl: process.env.ANTHROPIC_BASE_URL || getOauthConfig().BASE_API_URL,
        oauthToken: sessionIngressAuthToken,
        sessionId,
      };
      fileDownloadPromise = downloadSessionFiles(files, config);
    }
  }
  let isNonInteractiveSession = getIsNonInteractiveSession();
  let baseTools = fallbackModel === options.model ? undefined : fallbackModel;
  let systemPrompt = options.systemPrompt;
  if (options.systemPromptFile)
    try {
      let s = resolve(options.systemPromptFile);
      systemPrompt = joinPromptAppend(await readFile(s, "utf8"), options.systemPrompt);
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT")
        return cliError(`Error: System prompt file not found: ${resolve(options.systemPromptFile)}`);
      return cliError(`Error reading system prompt file: ${errorMessage(error)}`);
    }
  let appendSystemPrompt = options.appendSystemPrompt;
  if (options.appendSystemPromptFile) {
    if (options.appendSystemPrompt && isBridgeCarrierPromptBound())
      return cliError(
        "Error: --append-system-prompt cannot be given with --append-system-prompt-file in a Remote Control session. Remove --append-system-prompt.",
      );
    try {
      let s = resolve(options.appendSystemPromptFile);
      appendSystemPrompt = joinPromptAppend(
        verifyBridgeCarrierPrompt(await readFile(s)),
        options.appendSystemPrompt,
      );
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT")
        return cliError(
          `Error: Append system prompt file not found: ${resolve(options.appendSystemPromptFile)}`,
        );
      return cliError(`Error reading append system prompt file: ${errorMessage(error)}`);
    }
  }
  let appendSystemPromptHead = readAppendPromptHead(appendSystemPrompt);
  let appendSubagentPrompt = await readAppendSubagentPrompt(options);
  if (!appendSubagentPrompt.ok) return cliError(appendSubagentPrompt.error);
  options.appendSubagentSystemPrompt = appendSubagentPrompt.prompt;
  enableAppendSubagentPrompt(options.appendSubagentSystemPrompt);
  let { systemPrompt: systemPrompt_2, appendSystemPrompt: appendSystemPrompt_2 } = resolveSystemPromptOptions(
    {
      cli: {
        systemPrompt,
        appendSystemPrompt,
      },
      env: process.env,
      settings: getInitialSettings_2(),
    },
  );
  if (isAgentSwarmsEnabled() && ze?.agentId && ze?.agentName && ze?.teamName) {
    let TEAMMATE_SYSTEM_PROMPT_ADDENDUM = teammatePromptAddendumModule().TEAMMATE_SYSTEM_PROMPT_ADDENDUM;
    appendSystemPrompt_2 = appendSystemPrompt_2
      ? `${appendSystemPrompt_2}

${TEAMMATE_SYSTEM_PROMPT_ADDENDUM}`
      : TEAMMATE_SYSTEM_PROMPT_ADDENDUM;
  }
  let permissionMode_2 = agent
    ? getBuiltInAgents().find((s) => s.agentType === agent)?.permissionMode
    : undefined;
  let ms = isRemoteSessionLaunch({
    remote,
    isNonInteractiveSession,
    headlessCloud,
    headlessCloudPrint,
    isContinue: Boolean(options.continue),
    pendingAssistantChat: undefined,
    pendingConnectUrl: pendingConnect?.url,
    pendingSSHHost: pendingSSH?.host,
  });
  let jl = false;
  let Ct = isRemoteNonInteractiveSession();
  let rt;
  let ro = async (s, C, T) => {
    profileCheckpoint(C.before);
    let startTime = performance.now();
    let L = await waitForInitialize({
      initialize: initializeGrowthBook,
      budgetMs: T,
    });
    noteFlagFetchWait(L.waitMs);
    recordPhase(s, performance.now() - startTime, startTime);
    logForDiagnosticsNoPII(L.timedOut ? "warn" : "info", "startup_flag_fetch_wait", {
      budget_ms: T,
      waited_ms: Math.round(L.waitMs),
      timed_out: L.timedOut,
      killswitch_recheck: s !== "growthbook_init_ms",
    });
    profileCheckpoint(C.after);
    return L;
  };
  let so = false;
  let fs = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_auto_mode_config", {});
  let gs = fs.source === "disk" && fs.value?.enabled === "disabled";
  let io = judgeGrowthBookKick(Ct);
  let Wt = io !== undefined && shouldKickGrowthBookOnWarmCache(Ct);
  if (
    startupFlagWaitPoint({
      nonInteractive: isNonInteractiveSession,
      budgetMs: io,
      settingsEnvPending:
        isNonInteractiveSession && io !== undefined && pendingSettingsEnvBlocksEarlyGb(env_2),
      cacheEmpty: isGrowthBookCacheEmpty(),
      relaunches: Ct,
      autoModeKillSwitchOnDisk: gs,
      warmWakeEarlyFetch: Wt,
    }) === "gb-before-mode" &&
    io !== undefined
  ) {
    so = true;
    rt = {
      site: "gb-before-mode",
      result: await ro(
        "growthbook_init_ms",
        {
          before: "before_growthbook_init",
          after: "after_growthbook_init",
        },
        io,
      ),
    };
  }
  if (
    getIsNonInteractiveSession() &&
    rt === undefined &&
    gs &&
    is1PEventLoggingEnabled() &&
    !pendingSettingsEnvBlocksEarlyGb(env_2)
  )
    await ro(
      "growthbook_killswitch_recheck_ms",
      {
        before: "before_gb_killswitch_recheck",
        after: "after_gb_killswitch_recheck",
      },
      EVENT_LOGGING_FLAG_WAIT_MS,
    );
  let proactivityLevel = DEFAULT;
  let ao;
  let lo = permissionMode;
  let Ss;
  {
    disableProactivitySelector(keybindingsState, storage, undefined);
    if (proactivity !== undefined || (!alwaysFalse() && isRelaunchProactivityEverOn()))
      startProactivitySelectorGate();
    let startupProactivity = resolveStartupProactivity(proactivity);
    proactivityLevel = startupProactivity.level;
    ao = startupProactivityLevel({
      startupLevel: startupProactivity,
      startsAsRemoteThinClient: ms,
    });
    let T = startupPermissionModeForAsk({
      cliLevel: proactivity,
      modeSuppliedOnInvocation:
        permissionMode !== undefined ||
        inheritPermissionMode !== undefined ||
        dangerouslySkipPermissions === true ||
        permissionMode_2 !== undefined,
    });
    if (T !== undefined) {
      lo = T;
      Ss = "--proactivity ask isn't available here \xB7 Started in manual mode";
    }
  }
  let bypassPermissionsBlockedByHost = false;
  let It;
  let _s = [];
  let {
    mode,
    notification,
    proactivity: proactivity_2,
    modeSuppliedOnInvocation,
  } = initialPermissionModeFromCLI({
    permissionModeCli: lo,
    inheritPermissionModeCli: inheritPermissionMode,
    dangerouslySkipPermissions,
    allowDangerouslySkipPermissions,
    bypassPermissionsBlockedByHost,
    agentPermissionMode: permissionMode_2,
    proactivityLevel: ao?.level,
  });
  It = notification ?? Ss;
  let xe = mode;
  let ys = restrictedBypassNotice({
    restricted,
    permissionMode: xe,
    allowDangerouslySkipPermissions,
  });
  if (ys) return cliError(`Error: ${ys}`);
  applyInheritedPermissionModeFlag({
    inheritPermissionModeCli: inheritPermissionMode,
    resolvedMode: xe,
    storageV5: storage,
  });
  setSessionBypassPermissionsMode(xe === "bypassPermissions");
  if (
    options.enableAutoMode ||
    lo === "auto" ||
    permissionMode_2 === "auto" ||
    (xe === "auto" && !isAutoModeFromFallback()) ||
    (!lo && isDefaultPermissionModeAuto())
  )
    setAutoModeFlagCli(true);
  emitStartupMark("action_before_mcp_policy_wait");
  await awaitMcpPolicyColdStart({
    hasDynamicMcpConfig: Boolean(mcpConfig && mcpConfig.length > 0) || ide,
    pluginStateReliable: r(),
    storageV5: storage,
  });
  let config = {};
  let vs = {
    ...getRepoMcpListsForAnalytics(),
    mcpConfigBlockedCount: 0,
  };
  let co = {};
  let uo = {};
  let bridgeSessionId = sdkUrl ? sessionId : undefined;
  let remoteMcpConfig = loadRemoteMcpConfig(bridgeSessionId, getServerUrl);
  let Gt = mergeMcpConfigs([], [], remoteMcpConfig);
  if (mcpConfig && mcpConfig.length > 0) {
    let filtered = mcpConfig.map((U) => U.trim()).filter((U) => U.length > 0);
    let C = [];
    let T = [];
    let R = [];
    let isBridgeCarrierChild = startupCcrEnv.isBridgeCarrierChild;
    let Be = [];
    for (let U of filtered) {
      let Fe = null;
      let lt = [];
      let Eo = safeParseJSON(U, false);
      if (Eo) {
        let mcpConfig = parseMcpConfig({
          configObject: Eo,
          filePath: "command line",
          expandVars: true,
          scope: "dynamic",
          bridgeSessionId,
        });
        if (mcpConfig.config) Fe = mcpConfig.config.mcpServers;
        lt = mcpConfig.errors;
        uo = {
          ...uo,
          ...mcpConfig.asWrittenEntries,
        };
      } else {
        let me = resolve(U);
        let mcpConfigFromFilePath = parseMcpConfigFromFilePath({
          filePath: me,
          expandVars: true,
          scope: "dynamic",
          bridgeSessionId,
        });
        if (mcpConfigFromFilePath.config) Fe = mcpConfigFromFilePath.config.mcpServers;
        lt = mcpConfigFromFilePath.errors;
        uo = {
          ...uo,
          ...mcpConfigFromFilePath.asWrittenEntries,
        };
        let [tn, on] = await Promise.all([
          stat(me).catch(() => {
            return;
          }),
          realpath(me).catch(() => me),
        ]);
        if (tn === undefined || tn.isFile()) Be.push(me, on);
      }
      if (Fe) {
        C.push(Fe);
        if (lt.length > 0) {
          logForDebugging(
            `--mcp-config: ${lt.length} entry warning(s): ${lt.map((me) => `${me.path ? me.path + ": " : ""}${me.message}`).join("; ")}`,
            {
              level: "warn",
            },
          );
          for (let me of lt) {
            let mcpErrorMetadata = me.mcpErrorMetadata;
            if (mcpErrorMetadata?.skipReason && mcpErrorMetadata.serverName != null)
              R.push({
                name: mcpErrorMetadata.serverName,
                type: mcpErrorMetadata.skipReason,
                message: me.message,
              });
          }
        }
      } else T.push(...lt);
    }
    setFlagMcpConfigFilePaths(uniq(Be));
    if (T.length > 0) {
      let joined = T.map((Fe) => `${Fe.path ? Fe.path + ": " : ""}${Fe.message}`).join(`
`);
      logForDebugging(`--mcp-config validation failed (${T.length} errors): ${joined}`, {
        level: "error",
      });
      return cliError(`Error: Invalid MCP configuration:
${joined}`);
    }
    Gt = mergeMcpConfigs(
      C,
      R.map((U) => U.name),
      remoteMcpConfig,
    );
    for (let U of Gt.refused)
      logForDebugging(`--mcp-config: ${U.message}`, {
        level: "warn",
      });
    let servers = Gt.servers;
    R.unshift(...Gt.refused);
    let Co = new Map();
    for (let U of R) if (!Object.hasOwn(servers, U.name)) Co.set(U.name, U);
    if (Co.size > 0) {
      let list = Array.from(Co.values());
      recordSkippedDynamicServers(list);
      if (!getIsNonInteractiveSession() || process.stderr.isTTY)
        warnStartupIssues(
          `${list.length} ${plural(list.length, "MCP server")} skipped due to invalid config:`,
          {
            stderrPrefix: "Warning: ",
            items: list.map((Fe) => Fe.message),
          },
        );
    }
    if (Object.keys(servers).length > 0) {
      let U = Boolean(env.CLAUDE_CODE_REMOTE) || isBridgeCarrierChild;
      let Fe = areSideloadFlagsDisabledByPolicy() && !areMcpConfigsAllSdkType(servers);
      if (Fe && !U) return cliError(sideloadFlagsBlockedMessage(["--mcp-config"]));
      let kept = ccrArtifactsEntryModule?.withoutWithheldCcrArtifactsEntry(servers).kept ?? servers;
      let Eo = xr(kept, (ut, rn) => {
        let Si = {
          ...ut,
          scope: "dynamic",
        };
        if (env.CLAUDE_CODE_REMOTE) getServerUrl(rn, ut);
        return isCliOwnedConfig(ut)
          ? registerCliOwnedConfig(Si)
          : markCcrInjectedConfig(rn, Si, isLockedOutByOrgMcpPolicy);
      });
      let { configs, blocked, held } = filterDynamicMcpServersByPolicy(Eo);
      vs.mcpConfigBlockedCount = blocked.length;
      if (blocked.length > 0)
        warnStartupIssues(
          `MCP ${plural(blocked.length, "server")} blocked by enterprise policy: ${blocked.join(", ")}`,
          {
            stderrPrefix: "Warning: ",
          },
        );
      let on = {
        ...configs,
        ...filterObject(Eo, (ut, rn) => held.includes(rn)),
      };
      let Id = filterObject(on, (ut) => ut.type === "sdk");
      let dropForEnterpriseMcpConfig =
        doesEnterpriseMcpConfigExist() &&
        U &&
        !options.strictMcpConfig &&
        areMcpConfigsAllowedWithEnterpriseMcpConfig(Id);
      let {
        servers: servers_2,
        dropped,
        keptNotes,
        reason,
      } = applyMcpPolicyDrops(on, {
        dropForEnterpriseMcpConfig,
        dropForSideloadPolicy: Fe && U,
        keptDespiteAllowlist: ccrInjectedKeptDespiteAllowlist(configs),
      });
      if (dropped.length > 0) {
        logForDebugging(
          `--mcp-config: ${plural(dropped.length, "server")} ignored (${reason}): ${dropped.join(", ")}`,
          {
            level: "warn",
          },
        );
        if (reason === "enterprise MCP config")
          warnStartupIssues(
            `an enterprise MCP config (managed-mcp.json) is present and has exclusive control over MCP servers; ignoring ${dropped.length} MCP ${plural(dropped.length, "server")} supplied via --mcp-config: ${dropped.join(", ")}`,
            {
              stderrPrefix: "Warning: ",
            },
          );
        else if (reason === "disableSideloadFlags policy")
          warnStartupIssues(
            `managed setting disableSideloadFlags forbids --mcp-config on this machine; ignoring ${dropped.length} server-delivered MCP ${plural(dropped.length, "server")}: ${dropped.join(", ")}`,
            {
              stderrPrefix: "Warning: ",
            },
          );
      }
      for (let keptNote of keptNotes) {
        logForDebugging(keptNote);
        if (startupCcrEnv.isSelfHostedRunnerChild) cliWarn(keptNote);
      }
      let Cr = ccrRepoToolsOnlyNote(servers_2);
      if (Cr) {
        logForDebugging(Cr);
        cliWarn(Cr);
      }
      co = servers_2;
      config = {
        ...config,
        ...servers_2,
      };
    }
  }
  let ownership = Gt.ownership;
  let Yn = mcpConfigProvenanceNote(ownership?.hostOwnedNames, Object.keys(Gt.servers).length);
  if (Yn)
    logForDebugging(Yn.text, {
      level: Yn.level,
    });
  let unusableEnterpriseMcpConfigMessage = getUnusableEnterpriseMcpConfigMessage();
  if (unusableEnterpriseMcpConfigMessage !== null && getIsNonInteractiveSession() && !$t)
    if (process.stderr.isTTY) cliWarn(`Warning: ${unusableEnterpriseMcpConfigMessage}`);
    else
      logForDebugging(unusableEnterpriseMcpConfigMessage, {
        level: "warn",
      });
  let Dt = options;
  setChromeFlagOverride(Dt.chrome);
  let Yt = hasHostedClaudeInChromeServer(config);
  let qt = !Yt && shouldEnableClaudeInChrome(Dt.chrome) && isClaudeAISubscriber();
  if (
    !Yt &&
    Dt.chrome !== false &&
    (Dt.chrome === true || env.CLAUDE_CODE_ENABLE_CFC === true) &&
    !isClaudeInChromeAllowed()
  ) {
    let s =
      policyDeniedReason("allow_claude_browser_extension", "Claude in Chrome", "is") ??
      "Claude in Chrome is disabled by your organization";
    if (isNonInteractiveSession)
      logForDebugging(`[Claude in Chrome] ${s}`, {
        level: "warn",
      });
    else warnStartupIssues(s);
  }
  let Bo = isMcpServerDenied(CLAUDE_IN_CHROME_MCP_SERVER_NAME, getClaudeInChromeStdioServerConfig());
  let Es = isClaudeInChromeBlockedByEnterpriseMcpConfig() || Bo;
  let offerClaudeInChrome = !qt && !Yt && !Es && shouldAutoEnableClaudeInChrome(storage);
  let ks = qt && Dt.chrome !== true && env.CLAUDE_CODE_ENABLE_CFC !== true && Es;
  let Vl = qt && Dt.chrome !== true && ((env.CLAUDE_CODE_ENABLE_CFC !== true && isSafeMode()) || restricted);
  if (Yt && Bo) {
    logForDebugging(
      "[Claude in Chrome] Served by the remote session host over --mcp-config, but a deniedMcpServers policy entry denies Claude in Chrome; dropping the entry and not starting the built-in server",
    );
    config = filterObject(config, (s, C) => C !== CLAUDE_IN_CHROME_MCP_SERVER_NAME);
  } else if (Yt && !isClaudeInChromeAllowed())
    logForDebugging(
      "[Claude in Chrome] Served by the remote session host over --mcp-config, but the org policy denies the browser extension; not adopting it and not starting the built-in server",
    );
  else if (Yt) {
    logForDebugging(
      "[Claude in Chrome] Served by the remote session host over --mcp-config; not starting the built-in server",
    );
    putChromePromptInSystemPrompt(adoptHostedClaudeInChrome().systemPrompt);
  } else if (ks)
    logForDebugging(
      "[Claude in Chrome] Skipping chrome wiring: blocked by enterprise MCP config or managed deniedMcpServers policy",
    );
  else if (Vl) logForDebugging("[Claude in Chrome] Skipping chrome wiring: --safe-mode or --restricted");
  else if (qt && (Bo || unusableEnterpriseMcpConfigMessage !== null)) {
    if (isNonInteractiveSession)
      logForDebugging(
        `[Claude in Chrome] MCP server blocked by enterprise policy: ${CLAUDE_IN_CHROME_MCP_SERVER_NAME}`,
        {
          level: "warn",
        },
      );
    else warnStartupIssues(`MCP server blocked by enterprise policy: ${CLAUDE_IN_CHROME_MCP_SERVER_NAME}`);
  } else if (qt) {
    let platform = getPlatform();
    try {
      logEvent("tengu_claude_in_chrome_setup", {
        platform: platformOrOther(platform),
      });
      let {
        mcpConfig,
        allowedTools: allowedTools_2,
        systemPrompt,
      } = setupClaudeInChrome({
        skipReconnectAutoOpen: isBridgeChildMachineSettings(),
      });
      config = {
        ...config,
        ...mcpConfig,
      };
      allowedTools.push(...allowedTools_2);
      putChromePromptInSystemPrompt(systemPrompt);
    } catch (error) {
      logEvent("tengu_claude_in_chrome_setup_failed", {
        platform: platformOrOther(platform),
      });
      logForDebugging(`[Claude in Chrome] Error: ${error}`);
      logError(error);
      return cliError("Error: Failed to run with Claude in Chrome.");
    }
  }
  let Kn = options;
  let strictMcpConfig = options.strictMcpConfig || false;
  setStrictMcpConfig(strictMcpConfig);
  let ws = options.includeUnsupportedModels === true;
  getProviderState().includeUnsupportedModels = ws;
  setCliSessionConfigCarried(cliCarriesSessionConfig(options));
  setForkRestrictedLaunchConfig(cliCarriesForkRestrictedConfig(options));
  setForkReplayLaunchConfig({
    ...(typeof options.appendSystemPrompt === "string" &&
      options.appendSystemPrompt !== "" && {
        appendSystemPrompt: options.appendSystemPrompt,
      }),
    ...(options.systemPromptSnapshot !== undefined && {
      systemPromptSnapshot: options.systemPromptSnapshot,
    }),
    ...(Ve === undefined &&
      typeof options.agent === "string" &&
      options.agent !== "" && {
        agent: options.agent,
      }),
    ...(Ve === undefined &&
      typeof options.agents === "string" &&
      options.agents !== "" && {
        agents: options.agents,
      }),
  });
  setPermissionPromptToolName(
    isNoPromptHost(options.permissionPrompts)
      ? NONE
      : effectivePermissionPromptTool({
          permissionPromptTool: options.permissionPromptTool,
          sdkUrl,
        }),
  );
  setReplConfigArgv([
    ...earlyArgsToArgv(
      resolveEarlyArgPaths(
        {
          settings: typeof options.settings === "string" ? options.settings : undefined,
          managedSettings: typeof options.managedSettings === "string" ? options.managedSettings : undefined,
          pluginDir: getInlinePlugins(),
          pluginDirNoMcp: getInlinePluginsNoMcp(),
          addDir,
          mcpConfig,
          strictMcpConfig,
          restricted,
          settingSources: appliedSettingSourcesFlagValue(),
        },
        resolve,
      ),
    ),
    ...(baseTools ? ["--fallback-model", baseTools] : []),
    ...(allowDangerouslySkipPermissions ? ["--allow-dangerously-skip-permissions"] : []),
    ...(disableSlashCommands ? ["--disable-slash-commands"] : []),
    ...(ws ? ["--include-unsupported-models"] : []),
    ...(Kn.channels ?? []).flatMap((s) => ["--channels", s]),
    ...(Ln !== undefined ? [ls ? "--watch-artifact-no-autoreact" : "--watch-artifact", Ln] : []),
  ]);
  let $o = gateDynamicMcpConfigForEnterpriseMcpConfig({
    dynamicMcpConfig: config,
    strictMcpConfig,
  });
  if ($o.kind === "refuse") return cliError($o.message);
  if ($o.dropped.length > 0) {
    let { servers, dropped } = $o;
    config = servers;
    co = filterObject(co, (R, L) => Object.hasOwn(servers, L));
    let T = `the enterprise MCP config (managed-mcp.json) keeps exclusive control over MCP servers; ignoring ${dropped.length} dynamically configured MCP ${plural(dropped.length, "server")}: ${dropped.join(", ")}`;
    logForDebugging(T, {
      level: "warn",
    });
    if (getIsNonInteractiveSession() && (process.stderr.isTTY || env.CLAUDE_CODE_REMOTE) && !$t)
      warnStartupIssues(T, {
        stderrPrefix: "Warning: ",
      });
  }
  setAdditionalDirectoriesForClaudeMd(addDir);
  let po;
  let As = (s, C) => {
    let T = [];
    let R = [];
    for (let L of s)
      if (L.startsWith("plugin:")) {
        let sliced = L.slice(7);
        let index = sliced.indexOf("@");
        if (index <= 0 || index === sliced.length - 1) R.push(L);
        else
          T.push({
            kind: "plugin",
            name: sliced.slice(0, index),
            marketplace: sliced.slice(index + 1),
          });
      } else if (L.startsWith("server:") && L.length > 7)
        T.push({
          kind: "server",
          name: L.slice(7),
        });
      else R.push(L);
    if (R.length > 0)
      cliError(
        `${C} entries must be tagged: ${R.join(", ")}
` +
          `  plugin:<name>@<marketplace>  \u2014 plugin-provided channel (allowlist enforced)
` +
          "  server:<name>                \u2014 manually configured MCP server",
      );
    return T;
  };
  let { channels, dangerouslyLoadDevelopmentChannels } = Kn;
  let mo = [];
  if (channels && channels.length > 0) {
    mo = As(channels, "--channels");
    setAllowedChannels(mo);
  }
  if (!isNonInteractiveSession) {
    if (dangerouslyLoadDevelopmentChannels && dangerouslyLoadDevelopmentChannels.length > 0)
      po = As(dangerouslyLoadDevelopmentChannels, "--dangerously-load-development-channels");
  }
  if (mo.length > 0 || (po?.length ?? 0) > 0) {
    let s = (C) =>
      sanitizedPluginIds(
        C.flatMap((T) => (T.kind === "plugin" ? [`${T.name}@${T.marketplace}`] : [])),
        isChannelAllowlisted,
      );
    logEvent("tengu_mcp_channel_flags", {
      channels_count: mo.length,
      dev_count: po?.length ?? 0,
      plugins: s(mo),
      dev_plugins: s(po ?? []),
    });
  }
  if (tools.length > 0) {
    let { shouldToolsListOptInToBrief } = require("./chunk-cv3kgbt2.js");
    if (shouldToolsListOptInToBrief(splitRuleList(tools))) setUserMsgOptIn(true);
  }
  if (getIsNonInteractiveSession()) {
    let s = checkHasTrustDialogAccepted();
    setSessionTrustAccepted(true);
    if (!s)
      import("./chunk-zqrznfbt.js").then((C) => {
        C.primeCurrentRepository();
      });
  }
  emitStartupMark("action_before_permission_context");
  let startTime = performance.now();
  let Wo = await applySessionLaunchOptions({
    allowedTools,
    disallowedTools,
    baseTools: tools,
    restricted,
    permissionMode: xe,
    allowDangerouslySkipPermissions,
    addDirs: addDir,
    storageV5: storage,
  });
  let toolPermissionContext = Wo.toolPermissionContext;
  if (proactivity_2)
    toolPermissionContext = {
      ...toolPermissionContext,
      ...proactivity_2,
    };
  let { warnings, overlyBroadBashPermissions } = Wo;
  It ??= Wo.bypassCapabilityNotification;
  recordPhase("permission_context_ms", performance.now() - startTime, startTime);
  if (
    !getIsNonInteractiveSession() ||
    (outputFormat !== "json" && outputFormat !== "stream-json" && env.CLAUDE_CODE_SESSION_KIND !== "bg")
  ) {
    warnings.forEach((warning) => warnStartupIssues(warning));
    _s.push(
      ...filterUnseenSecurityWarnings(
        Wo.securityWarnings.map((securityWarning) => ({
          ...securityWarning,
          text: cleanWarningLine(securityWarning.text),
        })),
      ),
    );
  } else
    warnings.forEach((warning) =>
      logForDebugging(`[permissions] ${stripControlChars(warning)}`, {
        level: "warn",
      }),
    );
  let Os = checkBypassPermissionsEnv(toolPermissionContext);
  if (Os !== undefined)
    reportStartupModelNotice(Os, {
      key: "bypass-removal-waiver",
      outputFormat,
      onStderrToo: true,
    });
  armPendingSettingsEnvRule(getRootSession(), hasRepoSettingsEnv, env_2);
  enforceMinimumVersion();
  let Go =
    isNonInteractiveSession && !$t && headlessSyncsClaudeAiConnectors()
      ? fetchClaudeAiConfigsOnce(y).then((claudeAiConfigs) => {
          printClaudeAiConnectorNotice();
          let { allowed, blocked } = filterMcpServersByPolicy(claudeAiConfigs ?? {});
          if (blocked.length > 0)
            cliWarn(
              `Warning: claude.ai MCP ${plural(blocked.length, "server")} blocked by enterprise policy: ${blocked.join(", ")}`,
            );
          return allowed;
        })
      : Promise.resolve({});
  if (ms) {
    setIsRemoteMode(true);
    if (hasSyncedPluginLaneOpened()) {
      clearPluginCache("remote thin client: synced plugin lane closes");
      clearSyncedPluginDirs();
    }
  }
  logForDebugging("[STARTUP] Loading MCP configs...");
  let now = Date.now();
  let Jn = {
    value: undefined,
  };
  let Ds =
    isNonInteractiveSession && isGateOOn() && hasManagedMcpPolicy()
      ? Go.catch(() => ({}))
      : Promise.resolve();
  let Yl = !(strictMcpConfig || isBareMode() || getIsRemoteMode()) && isEnterpriseMcpConfigHeld();
  let fo = (
    strictMcpConfig || isBareMode() || getIsRemoteMode()
      ? Promise.resolve({
          servers: {},
        })
      : Ds.then(() =>
          getClaudeCodeMcpConfigs(config, {
            storageV5: storage,
            credentials: y,
          }),
        )
  ).then((s) => {
    Jn.value = Date.now() - now;
    return s;
  });
  let wasTrustedBeforeSetup = checkHasTrustDialogAccepted();
  let wasPersistedTrustedBeforeSetup = isWorkspacePersistedTrusted();
  if (inputFormat && inputFormat !== "text" && inputFormat !== "stream-json")
    return cliError(`Error: Invalid input format "${inputFormat}".`);
  if (inputFormat === "stream-json" && outputFormat !== "stream-json")
    return cliError("Error: --input-format=stream-json requires output-format=stream-json.");
  if (inputFormat === "stream-json" && !getIsNonInteractiveSession())
    return cliError("Error: --input-format=stream-json requires --print.");
  {
    let s = validateSdkUrlFlag(sdkUrl);
    if (s !== null) {
      await logEventAsync("tengu_sdk_url_host_rejected", {
        code: fromEnum(s.code),
      });
      return cliErrorAfterAnalyticsFlush(
        `Error: --sdk-url rejected: ${s.reason}. This flag is reserved for Remote Control worker processes connecting to Anthropic's backend.`,
      );
    }
  }
  if (sdkUrl) {
    if (inputFormat !== "stream-json" || outputFormat !== "stream-json")
      return cliError(
        "Error: --sdk-url requires both --input-format=stream-json and --output-format=stream-json.",
      );
    if (!env.CLAUDE_CODE_REMOTE) {
      await waitForPolicyLimitsToLoad();
      let s = policyDeniedReason("allow_remote_control", "Remote Control", "is");
      if (s) {
        await logOrgPolicyDeniedAsync("allow_remote_control", "startup");
        return cliErrorAfterAnalyticsFlush(s);
      }
      if (getSettingsWithErrors_2().settings.disableRemoteControl === true)
        return cliError(`Error: ${REMOTE_CONTROL_DISABLED_BY_POLICY_MESSAGE}`);
    }
    setRemoteSdkUrlEnv(sdkUrl);
  }
  if (options.sessionPersistence === false) {
    if (!isNonInteractiveSession)
      return cliError("Error: --no-session-persistence can only be used with --print mode.");
    setSessionPersistenceDisabled(true);
  }
  enableTranscriptLocalGc({
    sdkUrl,
    isNonInteractiveSession,
  });
  setToolResultCopyMode({
    sdkUrl,
    isNonInteractiveSession,
  });
  let Qn = {
    hydrate: env.CLAUDE_CODE_CCR_EARLY_HYDRATE_PREFETCH,
    connect: env.CLAUDE_CODE_CCR_EARLY_REMOTE_CONNECT,
  };
  let Ls =
    (Qn.hydrate || Qn.connect) && sdkUrl && options.resume
      ? import("./chunk-yvf1bnw9.js").then((s) => s.startEarlyRemoteWork(sdkUrl, storage, Qn))
      : undefined;
  let earlyHydrateReads = Ls?.then((s) => s.hydrateReads);
  let earlyRemoteLink = Ls?.then((s) => s.link);
  if (options.awaitInitialize) {
    if (inputFormat !== "stream-json")
      return cliError("Error: --await-initialize requires --input-format=stream-json.");
    if (sdkUrl) return cliError("Error: --await-initialize cannot be used with --sdk-url.");
  }
  if (options.awaitClaim) {
    if (inputFormat !== "stream-json" || outputFormat !== "stream-json")
      return cliError(
        "Error: --await-claim requires --print with --input-format=stream-json and --output-format=stream-json.",
      );
    if (options.continue || options.resume || options.forkSession)
      return cliError("Error: --await-claim cannot be combined with --continue, --resume or --fork-session.");
    if (sdkUrl) return cliError("Error: --await-claim cannot be used with --sdk-url.");
    if (isScrubEnabled())
      return cliError(
        "Error: --await-claim cannot be used with CLAUDE_CODE_SUBPROCESS_ENV_SCRUB: the subprocess sandbox pins its protected paths to the launch directory at start-up.",
      );
    markSpareParked();
  }
  if (options.replayUserMessages) {
    if (inputFormat !== "stream-json" || outputFormat !== "stream-json")
      return cliError(
        "Error: --replay-user-messages requires both --input-format=stream-json and --output-format=stream-json.",
      );
  }
  if (options.promptSuggestions && (!isNonInteractiveSession || outputFormat !== "stream-json"))
    return cliError(
      "Error: --prompt-suggestions requires --print and --output-format=stream-json (prompt_suggestion messages are only surfaced in stream-json output).",
    );
  if (Tn) {
    if (!isNonInteractiveSession || outputFormat !== "stream-json") {
      if (includePartialMessages)
        return cliError(
          "Error: --include-partial-messages requires --print and --output-format=stream-json.",
        );
      Tn = false;
    }
  }
  if (Pn) {
    if (!isNonInteractiveSession || outputFormat !== "stream-json") {
      if (forwardSubagentText)
        return cliError("Error: --forward-subagent-text requires --print and --output-format=stream-json.");
      Pn = false;
    }
  }
  if (options.planModeInstructions && !isNonInteractiveSession)
    return cliError("Error: --plan-mode-instructions can only be used with --print mode.");
  if (!isNonInteractiveSession) {
    let s = cloudUnavailableReason(stdinOverrideCache.get(), {
      explicitCloudLaunch: remote !== null && !os,
    });
    if (s !== undefined) return exitWithoutInteractiveInput(s);
  }
  let inputPrompt = await getInputPrompt(name || "", inputFormat ?? "text");
  let preDecorationInputPrompt = typeof inputPrompt === "string" ? inputPrompt : null;
  profileCheckpoint("action_after_input_prompt");
  let jsonSchema;
  if (
    isNonInteractiveOrBgSession({
      isNonInteractiveSession,
      isBgSession: isBgSession(),
    }) &&
    options.jsonSchema
  ) {
    try {
      jsonSchema = jsonParse(options.jsonSchema);
    } catch (error) {
      return cliError(`Error: --json-schema is not valid JSON: ${errorMessage(error)}`);
    }
    if (typeof jsonSchema !== "object" || jsonSchema === null || Array.isArray(jsonSchema))
      return cliError("Error: --json-schema must be a JSON object");
  }
  profileCheckpoint("action_before_setup");
  logForDebugging("[STARTUP] Running setup()...");
  let now_2 = Date.now();
  let startTime_2 = performance.now();
  let { setup } = await import("./chunk-fhdzwff4.js");
  recordPhase("setup_import_ms", performance.now() - startTime_2, startTime_2);
  let messagingSocketPath = options.messagingSocketPath;
  let cwd = getCwd();
  try {
    claudeTempDir();
  } catch (error) {
    logError(error);
    let C = errorMessage(error);
    printCliError(C);
    await writeStartupFailureResult({
      sessionId: getSessionId(),
      message: C,
      reason: "temp_dir_unusable",
    });
    return cliErrorAfterAnalyticsFlush();
  }
  initBuiltinPlugins();
  jl = true;
  initBundledSkills();
  let Zn = !!pendingSSH?.host;
  let er;
  let tr = false;
  let nr = async () => {
    if (er !== undefined && !tr) return;
    try {
      let { shouldRefreshArtifactRoster } = await import("./chunk-tbts81qj.js");
      if (!shouldRefreshArtifactRoster()) return;
      let {
        artifactRosterFetchDeferred,
        artifactRosterFresh,
        artifactRosterIdentityKnown,
        refreshArtifactRoster,
      } = await import("./chunk-rdzbcgex.js");
      if (!artifactRosterIdentityKnown() || artifactRosterFresh() || artifactRosterFetchDeferred()) return;
      tr = false;
      er = refreshArtifactRoster({
        credentials: y,
        storageV5: storage,
        timeoutMs: 5000,
      });
      er.then((Be) => {
        tr = !Be;
      });
    } catch (error) {
      logForDebugging(`Artifact roster kick failed: ${errorMessage(error)}`);
    }
  };
  if (isNonInteractiveSession && !pendingSettingsEnvBlocksEarlyGb(env_2)) await nr();
  if (!shouldAwaitPolicyLimitsOnStartup()) ensurePolicyLimitsLoadRequested();
  else if ((await awaitPolicyLimitsColdStart()) !== "skipped")
    profileCheckpoint("action_after_policy_limits_cold_await");
  let orgValidation;
  if (!getIsNonInteractiveSession())
    await refuseOrgConfigEarlyAtStartup({
      showBlockedScreen: h.showOrgConfigBlockedScreen,
    });
  {
    let s = settleProvisionalStartupMode(toolPermissionContext, {
      onNotification: (C) => {
        It ??= C;
      },
    });
    if (s !== toolPermissionContext) {
      toolPermissionContext = s;
      xe = s.mode;
    }
    if (getIsNonInteractiveSession()) {
      It ??= levelAutoHeldForPendingVerdictNotice();
      abandonPendingPolicyVerdictResolution();
    }
  }
  let policyLimitsColdStartWait = getPolicyLimitsColdStartWait();
  if (policyLimitsColdStartWait) {
    recordPhase(
      "policy_limits_await_ms",
      policyLimitsColdStartWait.waitedMs,
      policyLimitsColdStartWait.firstAtMs,
    );
    let s = didPolicyLimitsColdStartTimeOut();
    logForDiagnosticsNoPII(s ? "warn" : "info", "policy_limits_cold_await", {
      budget_ms: POLICY_LIMITS_COLD_AWAIT_MS,
      waited_ms: Math.round(policyLimitsColdStartWait.waitedMs),
      timed_out: s,
    });
  }
  if (
    startEarlyPluginsSync(
      getRootSession(),
      y,
      () => shouldHoldEarlyGrowthBook(env_2) || env.CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER,
    )
  )
    addStartupContext({
      early_plugins_sync: 1,
    });
  if (
    startEarlySkillsSync(
      getRootSession(),
      storage,
      y,
      () => shouldHoldEarlyGrowthBook(env_2) || env.CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER,
    )
  )
    addStartupContext({
      early_skills_sync: 1,
    });
  let od =
    ((so && hasFreshGrowthBookFeatures()) || Wt) &&
    !pendingSettingsEnvBlocksEarlyGb(env_2) &&
    !env.CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER &&
    refreshMemoryContextForCcr(getRootSession());
  setAutoMemoryToggleRecorder(saveAutoMemorySessionSwitch);
  let nd = setup(
    cwd,
    Zn ? "default" : xe,
    Zn ? false : allowDangerouslySkipPermissions,
    env_2,
    eo,
    An,
    sessionId ? normalizeUuidOrNull(sessionId) : undefined,
    kn,
    messagingSocketPath,
    storage,
    y,
    env_2 && (cloudAttachId !== null || resumeInCloud !== null) && isWorktreeCloudClaimEnabled(),
    !oo,
  );
  if (shouldFillPluginLoadWithStore(y) && !env_2 && !isBareMode() && !isSafeMode())
    loadAllPluginsCacheOnly(storage, y).catch(() => {});
  if (!env_2) warmCommandSourceCaches(cwd, storage);
  let rr = env_2 ? null : getAgentDefinitionsWithOverrides(cwd, storage);
  rr?.catch(() => {});
  let startTime_3 = performance.now();
  try {
    await nd;
  } catch (error) {
    if (error instanceof CliUserError) return cliError(error.message);
    throw error;
  }
  recordPhase("setup_ms", performance.now() - startTime_3, startTime_3);
  logForDebugging(`[STARTUP] setup() completed in ${Date.now() - now_2}ms`);
  profileCheckpoint("action_after_setup");
  if (sessionId && E) {
    let { rekeySessionTeamAtStartup } = await import("./chunk-6cc2zqkz.js");
    E = (await rekeySessionTeamAtStartup(storage)) ?? E;
  }
  await nr();
  let rootSession = getRootSession();
  setClaudeMdJudgedBy(rootSession, toolPermissionContext);
  let sr = !!options.replayUserMessages;
  sr = shouldReplayUserMessages({
    replayUserMessagesFlag: sr,
    outputFormat,
    explicitSocketPath: messagingSocketPath,
    socketBound: udsEnv.CLAUDE_CODE_MESSAGING_SOCKET !== undefined,
  });
  if (getIsNonInteractiveSession()) {
    applyConfigEnvironmentVariables();
    releaseGrowthBookHold(rootSession.host);
    orgValidation = await enforceOrgConfigGateHeadless(() => validateForceLoginOrg(y));
    if (inputFormat === "stream-json") armStartupWorkGate(rootSession.host);
    if (Ct && !so) {
      so = true;
      let s = judgeGrowthBookKick(Ct);
      if (s !== undefined) {
        if (Wt && isGrowthBookInitializeInFlight()) {
          profileCheckpoint("before_idle_gc");
          try {
            (await import("bun:jsc")).edenGC();
          } catch {}
          profileCheckpoint("after_idle_gc");
        }
        rt = {
          site: "gb-before-context",
          result: await ro(
            "growthbook_init_ms",
            {
              before: "before_growthbook_init",
              after: "after_growthbook_init",
            },
            s,
          ),
        };
      }
    }
    if (!isParkedSpare())
      if ($t) logForDiagnosticsNoPII("info", "git_status_skipped_headless_cloud_arm");
      else prefetchGitStatus(rootSession);
    if (!isParkedSpare())
      if (!shouldPrefetchUserContext(Boolean(options.continue || options.resume)))
        getOrBuildUserContext(rootSession, storage, y);
      else startKeptProjectDetail(y);
    ensureModelStringsInitialized();
  }
  let So = options.name ? sanitizeSessionTitle(options.name) || undefined : undefined;
  if (So) {
    cacheSessionTitle(So);
    cacheAgentName(So);
  }
  let model = options.model;
  let Yo = env_2 ? getCwd() : cwd;
  let Hs = !so ? judgeGrowthBookKick(Ct) : undefined;
  if (Hs !== undefined)
    rt = {
      site: "gb-before-tools",
      result: await ro(
        "growthbook_init_ms",
        {
          before: "before_growthbook_init",
          after: "after_growthbook_init",
        },
        Hs,
      ),
    };
  if (Ct) {
    markWarmCacheKickAsks(Wt);
    logEvent("tengu_startup_flag_fetch_wait", {
      waited: rt !== undefined,
      site: fromEnumOpt(rt?.site),
      wait_ms: Math.round(rt?.result.waitMs ?? 0),
      timed_out: rt?.result.timedOut ?? false,
      fetched: hasFreshGrowthBookFeatures(),
      warm_wake_early_fetch: Wt,
      kick_from_init: env.CLAUDE_CODE_GROWTHBOOK_KICK_FROM_INIT,
      kick_on_warm_cache: env.CLAUDE_CODE_GROWTHBOOK_KICK_ON_WARM_CACHE,
      flag_fetch_kick: fromEnumOpt(getFlagFetchKick()),
    });
    toolPermissionContext = {
      ...toolPermissionContext,
      chromeClassifierFloorEnabled: readChromeClassifierFloor(),
    };
  }
  await nr();
  let $s = refreshAccountSkillsSyncFlag();
  if ($s) startSkillSyncAndResync(rootSession, storage, y);
  else if (getSkillsSyncVetoed()) {
    clearSkillCaches();
    pruneSkillsSyncRoot(storage).catch(logError);
  }
  onSkillsSyncVetoChange();
  let rd = enableAccountPluginsSync();
  primeSkillsListAskConversion(rootSession, () => isAppliedListCurrent(y));
  if (rd) {
    startFirstPluginsSync(rootSession, y);
    syncClaudeAiMarketplaces(rootSession, y, storage);
  } else if (getPluginsSyncVetoed()) pruneSyncedPluginsForClosedGate().catch(logError);
  else if (isPluginsSyncFlagOn()) completeDeferredRemovals().catch(logError);
  subscribeMemoryToggleRefresh(rootSession);
  if (od)
    refreshMemoryContext(rootSession, {
      credentials: y,
      storageV5: storage,
    });
  else
    maybeKickMemoryContextFetch(rootSession, {
      credentials: y,
      storageV5: storage,
    });
  let Ws = env_2 ? null : getCommands(Yo, storage);
  Ws?.catch(() => {});
  if (isXtermJs() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_thicket", true))
    clampLevelForAttacher(true);
  logForDebugging("[STARTUP] Loading commands and agents...");
  let now_3 = Date.now();
  if (shouldFillPluginLoadWithStore(y) && env_2 && !isBareMode() && !isSafeMode())
    loadAllPluginsCacheOnly(storage, y).catch(() => {});
  let startTime_4 = performance.now();
  using id = artifactStartupModule?.holdArtifactStartupTelemetry();
  let agentsForSession = await loadAgentsForSession({
    cwd: Yo,
    toolPermissionContext,
    applyCoordinatorFilter: true,
    agentsJson: agents,
    agentSetting: agent,
    commandsPromise: Ws,
    agentDefsPromise: rr && agentReadForTheSeat(rr, cwd, storage),
    deferCommands: shouldSyncPluginInstall(isNonInteractiveSession),
    onToolsLoaded: () => profileCheckpoint("action_tools_loaded"),
    storageV5: storage,
  });
  recordPhase("tools_commands_load_ms", performance.now() - startTime_4, startTime_4);
  let { tools: tools_2, mainThreadAgentDefinition, commands } = agentsForSession;
  let { agentDefinitions, cliAgents, deferredCommandsPromise } = agentsForSession;
  if (
    agent &&
    !mainThreadAgentDefinition &&
    inputFormat !== "stream-json" &&
    agent !== CLAUDE_AGENT.agentType &&
    !options.resume &&
    !options.continue &&
    !env.CLAUDE_BG_POST_CLEAR_RESPAWN
  ) {
    let joined = agentDefinitions.activeAgents.map((activeAgent) => activeAgent.agentType).join(", ");
    return cliError(`--agent '${agent}' not found. Available agents: ${joined || "(none)"}`);
  }
  addStartupContext({
    tool_count: tools_2.length,
    skill_count: count(commands, isSkillToolCommand),
  });
  deferredCommandsPromise?.then(
    (s) =>
      addStartupContext({
        skill_count: count(s, isSkillToolCommand),
      }),
    () => {},
  );
  loadAllPluginsCacheOnly(storage, y).then(
    (allPluginsCacheOnly) =>
      addStartupContext({
        plugin_count: allPluginsCacheOnly.enabled.length,
      }),
    () => {},
  );
  if (
    !mainThreadAgentDefinition &&
    isAgentSwarmsEnabled() &&
    ze?.agentId &&
    ze?.agentName &&
    ze?.teamName &&
    ze?.agentType
  ) {
    let agentExcludingWebFetch = findAgentExcludingWebFetch(agentDefinitions.activeAgents, ze.agentType);
    if (agentExcludingWebFetch) {
      mainThreadAgentDefinition = agentExcludingWebFetch;
      setMainThreadAgentType(agentExcludingWebFetch.agentType);
    } else logForDebugging(`[teammate] Custom agent ${ze.agentType} not found in available agents`);
  }
  let ir = agent ?? (isCoworkAny() ? undefined : getSettingsAfterPluginLoad("agent"));
  if (!mainThreadAgentDefinition && !agent && ir) {
    mainThreadAgentDefinition = findSelectedAgent(agentDefinitions.activeAgents, ir);
    setMainThreadAgentType(mainThreadAgentDefinition?.agentType);
  }
  toolPermissionContext = withAgentDisallowedTools(
    toolPermissionContext,
    mainThreadAgentDefinition,
    "cliArg",
  );
  logForDebugging(`[STARTUP] Commands and agents loaded in ${Date.now() - now_3}ms`);
  profileCheckpoint("action_commands_loaded");
  let structuredOutputTool;
  if (jsonSchema) {
    let syntheticOutputTool = createSyntheticOutputTool(jsonSchema);
    if ("tool" in syntheticOutputTool) {
      if (syntheticOutputTool.unsatisfiable)
        logForDebugging(
          `--json-schema: ${checkSchemaSatisfiable(syntheticOutputTool.unsatisfiable)}: ${syntheticOutputTool.unsatisfiable.message}`,
          {
            level: "warn",
          },
        );
      let tool = syntheticOutputTool.tool;
      if (isBgSession()) {
        let T = tool.call.bind(tool);
        tool = {
          ...tool,
          async call(R, L, Be, We, Co) {
            let U = await T(R, L, Be, We, Co);
            let { stashBgStructuredResult } = await import("./chunk-wd9kxbpn.js");
            stashBgStructuredResult(R);
            return U;
          },
        };
      }
      structuredOutputTool = tool;
      tools_2 = [...tools_2, tool];
      logEvent("tengu_structured_output_enabled", {
        schema_property_count: Object.keys(jsonSchema.properties || {}).length,
        has_required_fields: Boolean(jsonSchema.required),
      });
    } else {
      await logEventAsync("tengu_structured_output_failure", {
        error: lit("Invalid JSON schema"),
      });
      return cliErrorAfterAnalyticsFlush(
        `Error: --json-schema is not a valid JSON Schema: ${syntheticOutputTool.error}`,
      );
    }
  }
  if (mainThreadAgentDefinition)
    logEvent("tengu_agent_flag", {
      agentType: agentTypeForAnalyticsFromDefinition(mainThreadAgentDefinition),
      ...(agent && {
        source: lit("cli"),
      }),
    });
  if (mainThreadAgentDefinition?.agentType) saveAgentSetting(mainThreadAgentDefinition.agentType);
  if (isNonInteractiveSession && mainThreadAgentDefinition && !isBuiltInAgent(mainThreadAgentDefinition)) {
    let systemPrompt = mainThreadAgentDefinition.getSystemPrompt();
    if (systemPrompt) {
      if (mainThreadAgentDefinition.appendSystemPrompt)
        appendSystemPrompt_2 = appendSystemPrompt_2
          ? `${systemPrompt}

${appendSystemPrompt_2}`
          : systemPrompt;
      else if (!systemPrompt_2) systemPrompt_2 = systemPrompt;
    }
  }
  if (mainThreadAgentDefinition?.initialPrompt) {
    let initialPrompt = mainThreadAgentDefinition.initialPrompt;
    if (typeof inputPrompt === "string")
      inputPrompt = initialPrompt.includes("{{intent}}")
        ? initialPrompt.split("{{intent}}").join(inputPrompt)
        : inputPrompt
          ? `${initialPrompt}

${inputPrompt}`
          : initialPrompt;
    else if (!inputPrompt) inputPrompt = initialPrompt;
  }
  let providerSetupCommand;
  let Ks = Boolean(
    options.continue || options.resume || (!isNonInteractiveSession && options.fromPr) || teleport,
  );
  let lr;
  let routineModelTransientlySkipped = false;
  if (routineStartupModule)
    try {
      let routineStartupModel = await routineStartupModule.getRoutineStartupModel({
        routineName: options.routine?.trim(),
        userSpecifiedModel: model,
        agentModel: mainThreadAgentDefinition?.model,
        isSessionRestore: Ks,
        cwd: getProjectRoot(),
        storageV5: storage,
      });
      if (routineStartupModel.status === "model") lr = routineStartupModel.model;
      else if (routineStartupModel.status === "transient_skip") routineModelTransientlySkipped = true;
    } catch (error) {
      logError(error);
    }
  let dr = lr ?? mainThreadAgentDefinition?.model;
  let startTime_5 = performance.now();
  await ensureCatalogDecision({
    headless: isPlainNonInteractive(),
  });
  recordPhase("model_catalog_decision_ms", performance.now() - startTime_5, startTime_5);
  let cr;
  if (
    getIsNonInteractiveSession() &&
    !env.CLAUDE_CODE_SKIP_BEDROCK_AUTH &&
    !env.CLAUDE_CODE_SKIP_VERTEX_AUTH &&
    !env.CLAUDE_CODE_SKIP_MANTLE_AUTH
  )
    try {
      let { apply3PDefaultFallbacks } = await import("./chunk-kva132ev.js");
      let { lines, mantleOverride } = await apply3PDefaultFallbacks({
        pendingUserModel: model != null ? model : dr === "inherit" ? undefined : dr,
      });
      cr = mantleOverride;
      for (let line of lines)
        process.stderr.write(`Warning: ${line}
`);
    } catch (error) {
      logError(error);
    }
  if (options.clientDataUrl) env.set("CLAUDE_CODE_CLIENT_DATA_URL", options.clientDataUrl);
  if (options.allowOtherModels) env.set("CLAUDE_CODE_ALLOW_OTHER_MODELS", true);
  let Xs = await applyClientDataToSession({
    runsOnAnotherMachine: oo,
  });
  if (Xs !== undefined) return cliError(Xs);
  let {
    effectiveModel,
    initialMainLoopModel,
    resolvedInitialModel,
    rawModelRequest,
    restrictedModel,
    unservedModelSpelling,
  } = await collectModelOverrides({
    userSpecifiedModel: model,
    agentModel: dr,
    agentModelSource: lr !== undefined ? "routine" : "agent",
    routineModelTransientlySkipped,
    storageV5: storage,
    credentials: y,
  });
  let pr = managedDenyStartupRefusal(resolvedInitialModel);
  if (pr !== null) {
    printCliError(pr);
    await writeStartupFailureResult({
      sessionId: getSessionId(),
      message: pr,
      reason: "managed_settings_invalid",
    });
    return cliErrorAfterAnalyticsFlush();
  }
  if (cr && (effectiveModel == null || options.model === "default")) setMainLoopModelOverride(cr);
  let Qs = checkClientDataModelEntry();
  if (Qs !== undefined) return cliError(Qs);
  fetchDynamicModelConfig(resolvedInitialModel, y, storage);
  let fallbackModels = resolveFallbackModels({
    cli: {
      fallbackModel: baseTools,
    },
    env: process.env,
    settings: getInitialSettings_2(),
  });
  setSessionFallbacks(fallbackModels ?? []);
  setRemoteFallbackLatch(baseTools !== undefined ? splitCommaList(baseTools) : undefined);
  {
    let effortLevel = resolveEffortLevel({
      ...createSessionEffortState(options.effort),
      mainLoopModel: resolvedInitialModel,
    });
    let effortCapWarning = getEffortCapWarning(effortLevel, resolvedInitialModel);
    if (effortCapWarning !== null)
      reportStartupModelNotice(effortCapWarning, {
        key: "model-effort-cap",
        outputFormat,
        debugLine: `[effort] ${effortCapWarning}`,
      });
  }
  let Jo;
  if (isAdvisorToolEnabled()) {
    let advisor = options.advisor;
    if (advisor) {
      logForDebugging(`[AdvisorTool] --advisor ${advisor}`);
      if (!baseModelSupportsAdvisor(resolvedInitialModel)) {
        if (env.CLAUDE_CODE_SESSION_KIND !== "bg")
          return cliError(`Error: The model "${resolvedInitialModel}" does not support the advisor tool.`);
        logForDebugging(
          `[AdvisorTool] The model "${resolvedInitialModel}" does not support the advisor tool.`,
          {
            level: "warn",
          },
        );
      }
      let C = stripAnyVersatileSuffix(parseUserSpecifiedModel(advisor));
      if (!canUseAsAdvisor(C)) {
        let T = isAdvisorPendingConsent(C);
        let R = T
          ? `${getAdvisorCreditsNotice(C)} Run ${getAdvisorModelSwitchCommand(C)}${isNonInteractiveSession ? " in an interactive session" : ""} to review and enable.`
          : `Error: The model "${advisor}" cannot be used as an advisor.`;
        if (env.CLAUDE_CODE_SESSION_KIND !== "bg") {
          if (T) {
            await logFeatureSadAsync(
              "advisor_fable_consent",
              isNonInteractiveSession ? "noninteractive_set_blocked" : "interactive_launch_blocked",
            );
            return cliErrorAfterAnalyticsFlush(R);
          }
          return cliError(R);
        }
        logForDebugging(`[AdvisorTool] ${R}`, {
          level: "warn",
        });
      }
      if (!canAdviseModel(resolvedInitialModel, C)) {
        let T = `"${advisor}" cannot advise "${resolvedInitialModel}" (the advisor must be at least as capable as the main model). The advisor will not be used for the main model.`;
        if (!isNonInteractiveSession || env.CLAUDE_CODE_SESSION_KIND !== "bg") warnStartupIssues(T);
        else
          logForDebugging(`[AdvisorTool] ${T}`, {
            level: "warn",
          });
      }
    }
    Jo = advisor ?? getConfiguredAdvisorModel();
    if (Jo) logForDebugging(`[AdvisorTool] Advisor model: ${Jo}`);
  }
  let mr = isNonInteractiveSession && !$t ? filterAllowedSdkBetas(betas) : undefined;
  let oi =
    cloudAttachId === null &&
    poolId === null &&
    remote === null &&
    !(Ks && !startupModelWinsOverSessionRestore());
  let unknownModelWindow = null;
  if (oi) {
    let unknownModelNotice = buildUnknownModelNotice(resolvedInitialModel, windowArg, mr);
    let C = oneMillionContextNotice(resolvedInitialModel, windowArg, mr);
    if (unknownModelNotice !== null)
      unknownModelWindow = emitUnknownModelNotice(unknownModelNotice, {
        interactive: !isNonInteractiveSession && !oo,
        headless: (T) =>
          reportStartupModelNotice(T, {
            key: "model-context-window",
            outputFormat,
          }),
      });
    else if (C !== null)
      reportStartupModelNotice(C, {
        key: "model-context-window",
        outputFormat,
        debugLine: `[autocompact] ${C}`,
      });
  }
  if (!oo)
    reportEnvWindow(env.CLAUDE_CODE_AUTO_COMPACT_WINDOW, {
      interactive: !isNonInteractiveSession,
      headless: (s) =>
        reportStartupModelNotice(s, {
          key: "auto-compact-window-env",
          outputFormat,
          debugLine: `[autocompact] ${s}`,
        }),
    });
  maybeActivateBrief(options);
  if (!getIsNonInteractiveSession() && !getUserMsgOptIn() && getInitialSettings_2().defaultView === "chat") {
    let { isBriefEntitled } = require("./chunk-cv3kgbt2.js");
    if (isBriefEntitled()) setUserMsgOptIn(true);
  }
  let yo;
  let mcpApprovalSkipWarning = null;
  let skipDangerousModePromptSetPreDialog = hasSkipDangerousModePermissionPrompt();
  if (!isNonInteractiveSession) {
    let s =
      (await h.runOnboarding?.({
        session: rootSession,
        options,
        teleport,
        permissionMode: xe,
        toolPermissionContext,
        storedTeammateOpts: ze,
        isSSHPending: Zn,
        allowDangerouslySkipPermissions,
        commands,
        skippedChromeForAdminPolicy: ks,
        enableClaudeInChrome: qt,
        chromeDeniedByPolicy: Bo,
        devChannels: po,
        offerClaudeInChrome,
        askCloudDefaultReason,
        wasTrustedBeforeSetup,
        wasPersistedTrustedBeforeSetup,
        strictMcpConfig,
        mcpConfigPromise: fo,
        dynamicMcpConfig: config,
        currentCwd: Yo,
        mcpConfigResolvedMs: Jn,
        providerSetupCommand,
        remoteControlOption: Fo,
        remoteControl,
        projectForRemoteControl,
        mainThreadAgentDefinition,
        inputPrompt,
        prompt: name,
        storageV5: storage,
        credentials: y,
      })) ?? cliError("Interactive session requires the runOnboarding capability");
    releaseGrowthBookHold(rootSession.host);
    let C = hasHeldGrowthBook(rootSession.host) ? judgeGrowthBookKick(Ct) : undefined;
    if (C !== undefined) await ro("growthbook_init_ms", GROWTHBOOK_HOLD_STAGES, C);
    let endInkWithError = h.endInkWithError;
    await enforceOrgConfigGateAtStartup({
      showBlockedScreen: h.showOrgConfigBlockedScreen,
      ...(endInkWithError !== undefined && {
        printMessage: (L) => endInkWithError(s.root, L),
      }),
    });
    yo = {
      root: s.root,
      getFpsMetrics: s.getFpsMetrics,
      stats: s.stats,
    };
    mcpApprovalSkipWarning = s.mcpApprovalSkipWarning;
    config = s.dynamicMcpConfig;
    commands = s.commands;
    remoteControl = s.remoteControl;
    inputPrompt = s.inputPrompt;
    name = s.prompt;
    fo = s.mcpConfigPromise;
    let R = settleProvisionalStartupMode(toolPermissionContext, {
      onNotification: (L) => {
        It ??= L;
      },
    });
    if (R !== toolPermissionContext) {
      toolPermissionContext = R;
      xe = R.mode;
    }
  }
  It ??= levelAutoHeldForPendingVerdictNotice();
  if (process.exitCode !== undefined) {
    logForDebugging("Graceful shutdown initiated, skipping further initialization");
    return {
      kind: "exited",
    };
  }
  if (canSkipGrowthBookHold(rootSession, $s)) maybeStartLazyLoad(rootSession, storage, y);
  initializeLspServerManager(rootSession, storage, y);
  if (yo) {
    let { errors } = getSettingsWithErrors_2();
    let C = isReportableDiagnostic(errors);
    if (C.length > 0 && (!isInteractiveSession() || !h.handleInvalidSettings)) logSkippedInvalidSetting(C);
    else if (C.length > 0 && h.handleInvalidSettings) {
      if ((await h.handleInvalidSettings(yo.root, C)) === "fix") {
        let { buildSettingsFixPrompt } = await import("./chunk-n37wdxq8.js");
        let settingsFixPrompt = buildSettingsFixPrompt(C, {
          flagSettingsPath:
            getFlagSettingsExpectedContent() === undefined ? getFlagSettingsPath() : undefined,
        });
        if (settingsFixPrompt)
          inputPrompt = inputPrompt
            ? `${settingsFixPrompt}

${inputPrompt}`
            : settingsFixPrompt;
      }
    }
  }
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_cicada_nap_ms", 0);
  setFetchesClientData(!isBareMode());
  let startupPrefetchedAt = getGlobalConfig().startupPrefetchedAt ?? 0;
  if (!(
    isBareMode() ||
    (featureValue_CACHED_MAY_BE_STALE > 0 &&
      Date.now() - startupPrefetchedAt < featureValue_CACHED_MAY_BE_STALE)
  )) {
    let s =
      startupPrefetchedAt > 0
        ? ` last ran ${Math.round((Date.now() - startupPrefetchedAt) / 1000)}s ago`
        : "";
    logForDebugging(`Starting background startup prefetches${s}`);
    probeQuotaStatusAtStart(y, storage).catch((error) => logError(error));
    trackClientDataFetch(fetchBootstrapData(storage, y));
    prefetchEligibilityIfNeeded(y, storage);
    prefetchFastModeStatus(storage, y);
    if (featureValue_CACHED_MAY_BE_STALE > 0)
      saveGlobalConfig(
        (C) => ({
          ...C,
          startupPrefetchedAt: Date.now(),
        }),
        storage,
      ).catch(logError);
  } else {
    logForDebugging(
      `Skipping startup prefetches, last ran ${Math.round((Date.now() - startupPrefetchedAt) / 1000)}s ago`,
    );
    if (
      !isBareMode() &&
      getAPIProvider() === "firstParty" &&
      bootstrapFetchCanConvergeSlot() &&
      !hasClientDataCacheSlot()
    )
      trackClientDataFetch(fetchBootstrapData(storage, y));
    initFastModeOrgStatusGuess();
  }
  fo = mcpConfigsAfterWaits(fo, Yl, () =>
    Ds.then(() =>
      getClaudeCodeMcpConfigs(config, {
        storageV5: storage,
        credentials: y,
      }),
    ),
  );
  let { servers } = await fo;
  logForDebugging(`[STARTUP] MCP configs resolved in ${Jn.value}ms (awaited at +${Date.now() - now}ms)`);
  config = applyAgentModelOverride(config, mainThreadAgentDefinition, {
    strictMcpConfig,
    onBlocked: (s) =>
      warnStartupIssues(
        `agent frontmatter MCP ${plural(s.length, "server")} blocked by enterprise policy: ${s.join(", ")}`,
        {
          stderrPrefix: "Warning: ",
        },
      ),
  });
  if (!restricted && !isBareMode() && shouldWireHostedDesktopComputerUse()) {
    let { mcpConfig, allowedTools } = getHostedDesktopComputerUseConfig();
    config = {
      ...config,
      ...mcpConfig,
    };
    toolPermissionContext = withCliArgAllowRules(toolPermissionContext, allowedTools);
  }
  let gd = false;
  if (Object.keys(config).length > 0 || gd)
    await awaitMcpPolicyColdStart({
      hasDynamicMcpConfig: true,
    });
  if (artifactsMcpLaptopModule !== null) {
    let artifactsMcpLaptopEntry = artifactsMcpLaptopModule.buildArtifactsMcpLaptopEntry({
      toolPermissionContext,
      configuredNames: new Set([...Object.keys(config), ...Object.keys(servers)]),
      fixedServerSet: strictMcpConfig
        ? "strict_mcp_config"
        : doesEnterpriseMcpConfigExist()
          ? "managed_mcp_config"
          : null,
      allowedByPolicy: isMcpServerAllowedByPolicy,
    });
    if (artifactsMcpLaptopEntry !== null)
      config = {
        ...config,
        [artifactsMcpLaptopEntry.name]: artifactsMcpLaptopEntry.config,
      };
  }
  if (isNonInteractiveSession) {
    if ($t || !headlessSyncsClaudeAiConnectors()) markConnectorListUnavailable();
    else if (filterDynamicMcpServersByPolicy(config).held.length > 0) await Go.catch(() => ({}));
  }
  let { configs, blocked } = filterDynamicMcpServersByPolicy(config);
  let { allowed, blocked: blocked_2 } = filterMcpServersByPolicy(servers);
  let Zo = [...blocked, ...blocked_2];
  if (Zo.length > 0) {
    logForDebugging(
      `MCP ${plural(Zo.length, "server")} blocked by enterprise policy before prefetch: ${Zo.join(", ")}`,
      {
        level: "warn",
      },
    );
    if (Zo.includes(CLAUDE_IN_CHROME_MCP_SERVER_NAME)) {
      markClaudeInChromeUnwired();
      commands = commands.filter(
        (command) =>
          !(
            command.name === CLAUDE_IN_CHROME_MCP_SERVER_NAME &&
            command.type === "prompt" &&
            command.source === "bundled"
          ),
      );
    }
  }
  let en = {
    ...allowed,
    ...configs,
  };
  let di = Object.create(null);
  let gr = {};
  for (let [key, value] of Object.entries(en)) {
    let T = value;
    if (T.type !== "sdk") gr[key] = T;
    else if (isFirstPartyUploadScope(T)) di[key] = T;
    else
      logForDebugging(`MCP server "${key}" dropped: an sdk entry outside the SDK host's channel`, {
        level: "warn",
      });
  }
  if (env.CLAUDE_CODE_REMOTE && getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_startup_policy_seed", true))
    toolPermissionContext = applyDynamicServerToolPolicies(toolPermissionContext, configs);
  addStartupContext({
    mcp_server_count: Object.keys(en).length,
  });
  profileCheckpoint("action_mcp_configs_loaded");
  let yd = trackSessionSwitches({
    permissionMode: xe,
    dangerouslySkipPermissionsPassed: dangerouslySkipPermissions ?? false,
    modeIsBypass: xe === "bypassPermissions",
    print: print ?? false,
  });
  maybeSwitchSessionForResume({
    resume: options.resume,
    forkSession: options.forkSession,
    hasSessionIdFlag: !!sessionId,
  });
  id?.flush();
  let remoteDroppedMcpMessages = getIsRemoteMode()
    ? mcpConfigIgnoredOnCloud({
        mcpConfigFlagServers: co,
        agent: mainThreadAgentDefinition,
        chromeFlag: Dt.chrome,
        dynamicMcpConfig: config,
      })
    : [];
  let resolved = Promise.resolve({
    clients: [],
    tools: [],
    commands: [],
  });
  let bd = isNonInteractiveSession
    ? Promise.resolve({
        clients: [],
        tools: [],
        commands: [],
      })
    : Go.then((s) =>
        Object.keys(s).length > 0
          ? prefetchAllMcpResourcesSafe(s, storage, y)
          : {
              clients: [],
              tools: [],
              commands: [],
            },
      );
  let Ed = Promise.all([resolved, bd]).then(([s, C]) => ({
    clients: [...s.clients, ...C.clients],
    tools: Ji([...s.tools, ...C.tools], "name"),
    commands: Ji([...s.commands, ...C.commands], "name"),
  }));
  hookSourcesSummary(mainThreadAgentDefinition);
  let sessionStartHooks =
    initOnly || init || maintenance || isNonInteractiveSession || options.continue || options.resume
      ? undefined
      : startHookRun("head", (orphaned) =>
          runStartupHooks(rootSession, {
            kind: "session-start",
            source: "startup",
            agentType: mainThreadAgentDefinition?.agentType,
            model: resolvedInitialModel,
            orphaned,
            storageV5: storage,
            credentials: y,
          }),
        );
  Ed.catch(() => {});
  let mcpClients = [];
  let mcpTools = [];
  let mcpCommands = [];
  let Ue;
  let vo = false;
  if (options.thinking === "adaptive" || options.thinking === "enabled") {
    Ue = {
      type: "adaptive",
    };
    vo = true;
  } else if (options.thinking === "disabled") {
    Ue = {
      type: "disabled",
    };
    vo = true;
  } else {
    let s = process.env.MAX_THINKING_TOKENS
      ? parseIntLoose(process.env.MAX_THINKING_TOKENS)
      : options.maxThinkingTokens;
    if (s !== undefined) {
      if (s > 0) {
        Ue = {
          type: "enabled",
          budgetTokens: s,
        };
        vo = true;
      } else if (s === 0) {
        Ue = {
          type: "disabled",
        };
        vo = true;
      }
    }
  }
  Ue ??= isBetaHeaderAllowed()
    ? {
        type: "adaptive",
      }
    : {
        type: "disabled",
      };
  let thinkingEnabled = Ue.type !== "disabled";
  let thinkingDisplay = isThinkingDisplayMode(options.thinkingDisplay) ? options.thinkingDisplay : undefined;
  if (Ue.type !== "disabled") {
    if (thinkingDisplay) setThinkingDisplayExplicit(true);
    let isNonInteractive = getIsNonInteractiveSession();
    let outputFormat_2 = outputFormat ?? "text";
    let thinkingDisplay_2 = resolveThinkingDisplay({
      explicitDisplay: thinkingDisplay,
      isNonInteractive,
      outputFormat: outputFormat_2,
      verbose: Ee,
    });
    if (thinkingDisplay_2) Ue.display = thinkingDisplay_2;
    if (
      thinkingDisplay_2 === "omitted" &&
      suppressesThinkingDisplay({
        isNonInteractive,
        outputFormat: outputFormat_2,
        verbose: Ee,
      })
    )
      Ue.displayExplicit = false;
  } else if (
    suppressesThinkingDisplay({
      isNonInteractive: getIsNonInteractiveSession(),
      outputFormat: outputFormat ?? "text",
      verbose: Ee,
    })
  ) {
    Ue.display = "omitted";
    Ue.displayExplicit = false;
  }
  logStartupStarted();
  startWatchdogSafe();
  registerCleanup(async () => {
    logForDiagnosticsNoPII("info", "exited");
  });
  mergeSessionFlags({
    permissionMode: xe,
    bypassPermissionsAvailable: toolPermissionContext.isBypassPermissionsModeAvailable,
  });
  setSessionFlagReaders({
    isEgressRestricted: isSandboxEgressRestricted,
    isHostAllowlistEnforced: isSandboxHostAllowlistEnforced,
    areUnsandboxedCommandsAllowed: () => SandboxManager.areUnsandboxedCommandsAllowed(),
    isToolSandboxActive,
  });
  if (ao)
    logProactivityStartup({
      ...ao,
      entryMode: xe,
      entryModeDecidedByLevel: proactivity_2?.startupModeDecidedByProactivityLevel !== undefined,
    });
  let ci =
    cloudAttachId === null &&
    poolId === null &&
    remote === null &&
    !getIsRemoteMode() &&
    projectBrowse === null;
  let modelProvenance = !ci ? undefined : oi ? modelAttributionFields() : RESUME_MODEL_ATTRIBUTION;
  let pi = !isNonInteractiveSession && !Ee && Ie;
  logTenguInit({
    host: rootSession.host,
    storageV5: storage,
    credentials: y,
    onAntSandboxDetection: yd.updateContext,
    hasInitialPrompt: Boolean(name),
    hasStdin: Boolean(inputPrompt),
    verbose: Ee,
    focusView: pi,
    debug,
    print: print ?? false,
    outputFormat: outputFormat ?? "text",
    inputFormat: inputFormat ?? "text",
    numAllowedTools: allowedTools.length,
    numDisallowedTools: disallowedTools.length,
    restricted,
    mcpClientCount: Object.keys(en).length,
    mcpListSizing: vs,
    mcpConfigs: getIsRemoteMode() ? null : Object.values(en),
    worktreeEnabled: env_2,
    skipWebFetchPreflight: getInitialSettings_2().skipWebFetchPreflight,
    githubActionInputs: env.GITHUB_ACTION_INPUTS,
    dangerouslySkipPermissionsPassed: dangerouslySkipPermissions ?? false,
    permissionMode: xe,
    proactivityLevel: ao?.level,
    modeIsBypass: xe === "bypassPermissions",
    allowDangerouslySkipPermissionsPassed: allowDangerouslySkipPermissions,
    skipDangerousModePromptSetPreDialog,
    systemPromptFlag: systemPrompt_2 ? (options.systemPromptFile ? "file" : "flag") : undefined,
    appendSystemPromptFlag: options.appendSystemPrompt
      ? "flag"
      : options.appendSystemPromptFile
        ? "file"
        : undefined,
    thinkingConfig: Ue,
    modelProvenance,
    runsLocalQueryLoop: ci,
  });
  if (!getIsRemoteMode() && !isParkedSpare())
    logContextMetrics(rootSession, gr, toolPermissionContext, getTools, storage, y).catch((error) =>
      logError(withTelemetryMessage(toError(error), "context metrics failed")),
    );
  let mi = false;
  let Sr = async () => {
    if (mi) return;
    mi = true;
    logShellAllowRulesAtInit(toolPermissionContext.alwaysAllowRules);
    logManagedSettingsLoaded();
    await noopAsync_3(null, "initialization");
  };
  if (isNonInteractiveSession)
    holdForStartupWork(rootSession.host, "permission_context_log", () => {
      Sr().catch(logError);
    });
  else {
    withTimeout_2(rootSession).then(Sr).catch(logError);
    registerCleanup(() => Sr().catch(logError));
  }
  createManagedSettingsReporter();
  getSessionRegistryState().restoreSetAsideName = (s, C) => {
    reclaimSessionNameOnResume(s, storage, {
      autoOnly: C === "auto",
      source: C,
      yieldToLaterRestore: true,
    });
  };
  (isParkedSpare() ? Promise.resolve(false) : registerSession(storage)).then((s) => {
    if (!s) return;
    let sessionId = getSessionId();
    claimSessionNameAtStartup({
      sessionNameArg: So,
      sessionNameArgSource: envSessionKind() === undefined ? "user" : "peer",
      interactive: envSessionKind() === undefined && !getIsNonInteractiveSession(),
      writeName: async (T, R) => {
        await updateSessionName(
          T,
          storage,
          R,
          R === "collision" ? getRegisteredSessionName()?.givenAtLaunch : true,
        );
      },
      onRenamed: (T, R) => {
        let L = sanitizeSessionTitle(T);
        if (getSessionId() !== sessionId) return;
        if (L && titleCacheStillOn(sessionId, R, L)) {
          cacheSessionTitle(L);
          cacheAgentName(L);
        }
      },
    });
    countConcurrentSessions(storage).then((T) => {
      if (T >= 2)
        logEvent("tengu_concurrent_sessions", {
          num_sessions: T,
        });
    });
  });
  if (isBareMode());
  else {
    holdForStartupWork(rootSession.host, "plugin_init", (s) => {
      if (s === "shutdown") return;
      initPluginsAtStartup({
        deferToCleanup: isNonInteractiveSession,
        storageV5: storage,
      });
    });
    profileCheckpoint("action_after_plugins_init");
  }
  let setupTrigger = initOnly || init ? "init" : maintenance ? "maintenance" : null;
  if (initOnly) {
    applyConfigEnvironmentVariables();
    await runStartupHooks(rootSession, {
      kind: "setup",
      trigger: "init",
      forceSyncExecution: true,
      storageV5: storage,
      credentials: y,
    });
    await runStartupHooks(rootSession, {
      kind: "session-start",
      source: "startup",
      forceSyncExecution: true,
      storageV5: storage,
      credentials: y,
    });
    gracefulShutdownSync(0);
    return {
      kind: "exited",
    };
  }
  let fi = {
    allowedTools,
    appendSystemPrompt: appendSystemPrompt_2,
    appendSystemPromptCli: appendSystemPrompt,
    appendSystemPromptHead,
    asWrittenMcpEntries: uo,
    claudeaiConfigPromise: Go,
    cliAgents,
    credentials: y,
    currentCwd: Yo,
    debug,
    jsonSchema,
    sdkUrl,
    sessionMirror,
    systemPrompt: systemPrompt_2,
    systemPromptCli: systemPrompt,
    thinkingConfig: Ue,
    thinkingConfigExplicit: vo,
    thinkingDisplayFlag: thinkingDisplay,
    thinkingEnabled,
    advisorModel: Jo,
    agentCli: agent,
    agentDefinitions,
    agentSetting: ir,
    autoCompactWindow: windowArg,
    cloudAttachId,
    commands,
    correlationId,
    dangerouslySkipPermissions,
    deferredCommandsPromise,
    disableSlashCommands,
    dynamicMcpConfig: config,
    earlyHydrateReads,
    earlyRemoteLink,
    effectiveForwardSubagentText: Pn,
    effectiveIncludePartialMessages: Tn,
    effectiveModel,
    effectiveReplayUserMessages: sr,
    fileDownloadPromise,
    headlessCloud,
    headlessCloudPrint,
    ide,
    initialFocusView: pi,
    initialMainLoopModel,
    inputPrompt,
    isNonInteractiveSession,
    mainThreadAgentDefinition,
    mcpApprovalSkipWarning,
    mcpClients,
    mcpCommands,
    mcpConfigFlagServers: co,
    mcpConfigOwnership: ownership,
    mcpTools,
    modelCli: model,
    modelProvenance,
    outputFormat,
    permissionModeCli: lo,
    permissionModeNotification: It,
    permissionModeSuppliedOnInvocation: modeSuppliedOnInvocation,
    allowDangerouslySkipPermissions,
    persistentVolume,
    persistentVolumeFromSessionId,
    monorepo,
    noMonorepo,
    noMonorepoAsksTheService,
    personal,
    poolId,
    environmentQuery,
    poolOnBranch,
    forwardHomeSettings,
    homeSettingsConsent,
    poolPromotedRemote,
    poolRef,
    preDecorationInputPrompt,
    proactivityLevel,
    projectBrowse,
    projectForRemoteControl,
    rawModelRequest,
    regularMcpConfigs: gr,
    relaunchFlagFetchSettled: Wt && rt !== undefined && !rt.result.timedOut,
    remote,
    remoteControl,
    remoteControlName,
    resumeInCloud,
    serveOnly,
    defaultedToCloud: os,
    cloudDefaultNotAllowed: ts,
    personalWithoutEffectNotification,
    cloudSessionsByDefault,
    sandboxVmStayReason,
    remoteDroppedMcpMessages,
    resolvedInitialModel,
    resolvedMaxTurns,
    restrictedModel,
    sdkBetas: mr,
    sdkMcpConfigs: di,
    session: rootSession,
    sessionGroupingId,
    sessionNameArg: So,
    sessionStartHooks,
    sessionTeamContext: E,
    setupTrigger,
    storageV5: storage,
    strictMcpConfig,
    structuredOutputTool,
    teleport,
    toolPermissionContext,
    tools: tools_2,
    unknownModelWindow,
    securityWarnings: _s,
    userSpecifiedFallbackModel: fallbackModels,
    verbose: Ee,
    wasPersistedTrustedBeforeSetup,
    wasTrustedBeforeSetup,
  };
  if (!yo)
    return {
      kind: "prepared-headless",
      ...fi,
      orgValidation,
    };
  return {
    kind: "prepared-interactive",
    ...fi,
    ...yo,
    terminalInput: stdinOverrideCache.get(),
  };
}
//@ chunk-3wek6r2k.js:148438-148567 placement
function readSizingReport(e) {
  try {
    return e();
  } catch (error) {
    logForDebugging(`Managed settings: a sizing report could not be read: ${errorMessage(error)}`, {
      level: "error",
    });
    return;
  }
}
//@ chunk-1ptrwbb7.js:335-362 placement
/**
 * 判断当前是否为交互会话（非后台会话）。
 */
function isInteractiveSession() {
  return !isBgSession();
}
export {
  getTeammateUtils,
  logSessionTelemetry,
  coordinatorModeModule,
  maybeActivateBrief,
  branchModeForTelemetry,
  startTurnInputPrefetches,
  startIdleStartupWork,
  judgeStartupGrowthBookKick,
  prepareSession,
  reportStartupModelNotice,
  startDeferredPrefetches,
};
