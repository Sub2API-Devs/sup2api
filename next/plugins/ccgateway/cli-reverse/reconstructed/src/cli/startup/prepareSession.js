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
import {
  isBgSession,
  getSessionRegistryState,
  registerSession,
  envSessionKind,
  updateSessionName,
  getRegisteredSessionName,
  countConcurrentSessions,
} from "../../utils/concurrentSessions.js";
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
import { import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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
import { uniqByExport } from "../../../vendor/lodash-es/uniqBy.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1ptrwbb7.js:335-362 placement
/**
 * 判断当前是否为交互会话（非后台会话）。
 */
function isInteractiveSession() {
  return !isBgSession();
}
//@ chunk-3wek6r2k.js:95105-95186 placement
function summarizeFlagSettingsForLogging(context, config) {
  let allKeys = getClientSurface_2(context, config);
  return {
    flag_count: allKeys.length,
    flags: fromSanitizer_SANITIZER_OUTPUT_ONLY(allKeys.join(",")),
  };
}
//@ chunk-3wek6r2k.js:95186-95378 placement
function prefetchAllMcpResourcesSafe(session, config, context) {
  try {
    let { prefetchAllMcpResources } =
      require("../../services/mcp/emitTripwireEvent.lazy.js").mcpClientModule();
    return prefetchAllMcpResources(session, config, context);
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
var getTeammateUtils; // deferred: loads other modules while loading; runs once its import cycle is complete
var teammatePromptAddendumModule;
var teammateModeSnapshotModule;
var coordinatorModeModule;
var routineStartupModule;
var artifactStartupModule;
var ccrArtifactsEntryModule;
deferInit("chunk-3wek6r2k.js:95378", () => {
  getTeammateUtils = () => require("../../utils/teammate.js");
  teammatePromptAddendumModule = () => require("../../utils/swarm/teammatePromptAddendum.js");
  teammateModeSnapshotModule = () => require("../../utils/swarm/backends/teammateModeSnapshot.js");
  coordinatorModeModule = require("../../coordinator/coordinatorMode.js");
  routineStartupModule = null;
  artifactStartupModule = require("../../services/artifacts/artifactToolGates.js");
  ccrArtifactsEntryModule = require("../../services/mcp/artifactMcpFilter.js");
});
//@ chunk-3wek6r2k.js:95608-95646 placement
var artifactsMcpLaptopModule; // deferred: loads other modules while loading; runs once its import cycle is complete
deferInit("chunk-3wek6r2k.js:95608", () => {
  artifactsMcpLaptopModule = require("../../services/artifacts/artifactsMcpLaptop.js");
});
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
  let { isBriefEntitled } = require("../../tools/BriefTool/BriefTool.js");
  let entitled = isBriefEntitled();
  if (entitled) setUserMsgOptIn(true);
  logEvent("tengu_brief_mode_enabled", {
    enabled: entitled,
    gated: !entitled,
    source: fromEnum(briefEnv ? "env" : "flag"),
  });
}
//@ chunk-3wek6r2k.js:101033-101113 placement
function startDeferredPrefetches(host, storageV5, credentials, { userContext = true } = {}) {
  startTurnInputPrefetches(host, storageV5, credentials, {
    userContext,
  });
  startIdleStartupWork(host, storageV5, credentials);
}
//@ chunk-3wek6r2k.js:101178-101818 placement = startDeferredPrefetches (0.413)
/**
 * 首屏渲染后的延迟预取：用户上下文、系统上下文、Bedrock/Vertex/Mantle 等云凭证、模型能力、文件变更检测器等。
 */
function startTurnInputPrefetches(host, config, credentials, { userContext = true } = {}) {
  if (useAfterFirstRender()) return;
  initCoreUserData();
  if (!isParkedSpare()) {
    if (userContext) getOrBuildUserContext(host, config, credentials);
    prefetchSystemContextIfSafe(host, config);
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
  primeModelCapabilities(config);
  primeGatewayModels(config);
  refreshServedModelCapabilities(config, credentials);
  discoverGatewayModels(config);
  startServedCatalog({
    allowNetwork: true,
  });
  startServedCatalogShadow({
    allowNetwork: shouldFetchServedCatalog(),
  });
  let blocker = configChangeBlocker(host, config, credentials);
  noteReloadReason(blocker);
  settingsChangeDetector.initialize(blocker, config);
  if (!isBareMode() && !getIsRemoteMode() && !getDisableSlashCommands())
    sharedSkillChangeDetector.initialize(blocker, config);
}
//@ chunk-3wek6r2k.js:101818-102267 placement
function startIdleStartupWork(host, storageV5, credentials) {
  if (useAfterFirstRender()) return;
  if (!getIsNonInteractiveSession())
    import("../../services/tips/MARKETPLACE_PLUGIN_TIP_ID_PREFIX.lazy.js")
      .then(({ getRelevantTips }) =>
        getRelevantTips({
          session: getRootSession(),
          theme: "dark",
          ...(storageV5 && {
            storageV5,
          }),
          ...(credentials && {
            credentials,
          }),
        }),
      )
      .catch((error) => logError(withTelemetryMessage(toError(error), "tip prewarm failed")));
  if (!env.CLAUDE_CODE_REMOTE && !isParkedSpare()) countFilesRounded(getCwd(), AbortSignal.timeout(3000), []);
  prefetchOfficialMcpUrls();
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_drift_lantern", false))
    import("../../utils/eventLoopStallDetector.js").then((mod) =>
      mod.startEventLoopStallDetector(host.host, {
        attributeSigcont: !getIsNonInteractiveSession(),
      }),
    );
  if (hasEmbeddedSearchTools_2()) installMemoryExitSummary(getMemoryPeaks);
}
//@ chunk-3wek6r2k.js:102267-102733 placement = extractLspServersFromPlugins (0.269)
/**
 * 会话启动时的插件遥测：cacheOnly 加载插件，预取 MCP/LSP 配置，记录启用插件与错误。名字配错，见 lead 建议。
 */
function logSessionTelemetry(host, storageV5, ready) {
  let userSpecifiedModel = parseUserSpecifiedModel(getInitialMainLoopModel() ?? getDefaultMainLoopModel());
  let args = [
    getCwd(),
    getContextWindow(userSpecifiedModel, getSdkBetas()),
    bytesPerTokenForModel(userSpecifiedModel),
    host,
    ready !== undefined,
  ];
  let readiness =
    ready === undefined
      ? logStartupCommandTelemetry(...args)
      : ready.then(() => logStartupCommandTelemetry(...args));
  return loadAllPluginsCacheOnly(host, storageV5)
    .then(async ({ enabled, errors }) => {
      let policyPluginNames = policyEnabledPluginNameSet();
      buildPluginCommandTelemetryFields(enabled, policyPluginNames);
      await Promise.all(
        enabled.map(async (plugin) => {
          await extractMcpServersFromPlugins(plugin, [], host);
          if (!plugin.lspServers) {
            let pluginLspServers = await loadPluginLspServers(plugin, [], host);
            if (pluginLspServers) plugin.lspServers = pluginLspServers;
          }
        }),
      );
      logPluginLoadFailed(errors, policyPluginNames, {
        cacheOnly: true,
      });
      logRegisteredHooks(enabled, policyPluginNames);
      let telemetry = await readiness;
      logPluginsEnabledForSession(enabled, policyPluginNames, getPluginSeedDirs(), telemetry, host);
    })
    .catch((error) => logError(withTelemetryMessage(toError(error), "plugin session telemetry load failed")))
    .then(async () => {
      await readiness;
    });
}
//@ chunk-3wek6r2k.js:102733-102792 placement
function branchModeForTelemetry(poolOnBranch, poolRef) {
  return fromEnum(poolOnBranch ? "on_branch" : poolRef ? "ref" : "default");
}
//@ chunk-3wek6r2k.js:102792-102852 placement
function pendingSettingsEnvBlocksEarlyGb(config) {
  if (computeRemoteSettingsEligibility() && !isRemoteManagedSettingsVerified() && !hasManagedSettings())
    return true;
  return hasRepoSettingsEnv(config);
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
function shouldKickGrowthBookOnWarmCache(remote) {
  return remote && getFeatureValue_CACHED_MAY_BE_STALE("tengu_sleepy_rabbit", false);
}
//@ chunk-3wek6r2k.js:103179-103441 placement
function judgeStartupGrowthBookKick(site, config) {
  let isNonInteractiveSession = getIsNonInteractiveSession();
  let remote = isNonInteractiveSession && isRemoteNonInteractiveSession();
  let budget = isNonInteractiveSession ? judgeGrowthBookKick(remote) : undefined;
  let cacheEmpty = budget !== undefined && isGrowthBookCacheEmpty();
  let warmKick =
    budget !== undefined &&
    !cacheEmpty &&
    ((remote && env.CLAUDE_CODE_GROWTHBOOK_KICK_ON_WARM_CACHE) || shouldKickGrowthBookOnWarmCache(remote));
  return startupGrowthBookKickOutcome({
    site,
    nonInteractive: isNonInteractiveSession,
    budgetMs: budget,
    settingsEnvPending: (cacheEmpty || warmKick) && pendingSettingsEnvBlocksEarlyGb(config),
    cacheEmpty,
    warmCacheKick: warmKick,
  });
}
//@ chunk-3wek6r2k.js:103441-103747 placement
function reportStartupModelNotice(message, { key, outputFormat, debugLine = message, onStderrToo = false }) {
  if (
    !getIsNonInteractiveSession() ||
    (outputFormat !== "json" && outputFormat !== "stream-json" && env.CLAUDE_CODE_SESSION_KIND !== "bg")
  ) {
    warnStartupIssues(message);
    return;
  }
  logForDebugging(debugLine, {
    level: "warn",
  });
  if (onStderrToo) cliWarn(message);
  if (outputFormat === "stream-json" && !isPlainNonInteractive())
    enqueueTaskNotification({
      type: "system",
      subtype: "notification",
      key,
      text: message,
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
async function prepareSession(
  typedName,
  options,
  program,
  shouldRefillPluginCache,
  pendingConnect,
  pendingSSH,
  args,
  storageV5,
  extraOptions,
) {
  profileCheckpoint("action_handler_start");
  consumeBridgeMcpCarrierMarker();
  registerHistoryExitFlush(storageV5);
  if (!getIsNonInteractiveSession()) {
    let previewBrowserModule = require("../../services/artifactPreview/browserDiscovery.js");
    previewBrowserModule.startPreviewBrowserDiscovery();
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
      let settingsReset;
      using resetScope = {
        [Symbol.dispose]: () => settingsReset?.(),
      };
      if (isStorageV5Enabled() && storageV5 !== undefined)
        settingsReset = await resetSettingsCacheWithBackendRead(storageV5);
      if (shouldRefillPluginCache()) refillPluginLoadCacheOnly(storageV5, "deeplink");
      resetGitFileWatcher();
      if (settingsReset !== undefined)
        updateHooksConfigSnapshot({
          userLayer: "retain",
        });
      else updateHooksConfigSnapshot();
      getPlansDirectory.cache.clear?.();
      primePlanSlugCollisions(storageV5);
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
  if (typedName === "code") {
    logEvent("tengu_code_prompt_ignored", {});
    warnStartupIssues("Tip: You can launch Claude Code with just `claude`");
    typedName = undefined;
  }
  if (typedName && typeof typedName === "string" && !/\s/.test(typedName) && typedName.length > 0) {
    logEvent("tengu_single_word_prompt", {
      length: typedName.length,
    });
    if (!options.print && !options.continue && !options.resume && /^[a-zA-Z][a-zA-Z-]*$/.test(typedName))
      await suggestUnknownSubcommand(typedName, program);
  }
  let sessionTeam;
  if (isAgentSwarmsEnabled() && !getIsNonInteractiveSession() && !options.agentId)
    try {
      let { initializeSessionTeam } =
        await import("../../tools/TeamCreateTool/initializeSessionTeam.lazy.js");
      sessionTeam = await initializeSessionTeam(undefined, storageV5);
    } catch (error) {
      logError(error);
    }
  if (!isFirstPartyTelemetryBlocked())
    logEvent(
      "tengu_cli_flags",
      summarizeFlagSettingsForLogging(options, (flagName) => program.getOptionValueSource(flagName)),
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
  let agentsFromFlag =
    typeof options.agents === "string" &&
    options.agents !== "" &&
    !isCustomizationDisabled("agents", {
      explicitlyRequested: true,
    });
  let freshSession = !options.resume && !options.continue && !env.CLAUDE_BG_POST_CLEAR_RESPAWN;
  let agentsFlagPath;
  if (agentsFromFlag && typeof options.agents === "string" && !looksLikeAgentsJson(options.agents)) {
    if (!options.print && !getIsNonInteractiveSession()) return cliError(AGENTS_FLAG_FILE_REQUIRES_PRINT);
    let agentsFlagFile = await readAgentsFlagFile(options.agents);
    if (!agentsFlagFile.ok) return cliError(agentsFlagFile.error);
    options.agents = agentsFlagFile.json;
    agentsFlagPath = agentsFlagFile.filePath;
    setFlagAgentsFilePaths(uniq([agentsFlagFile.filePath, agentsFlagFile.realPath]));
  }
  let agents = options.agents;
  if (agentsFromFlag && (freshSession || agentsFlagPath !== undefined) && typeof agents === "string") {
    let invalidAgents = validateAgentsJson(agents);
    if (invalidAgents)
      return cliError(`Error: Invalid --agents configuration:
${invalidAgents}${
        agentsFlagPath
          ? `
(read from ${agentsFlagPath})`
          : ""
      }`);
  }
  let agent = options.agent;
  if (agent) process.env.CLAUDE_CODE_AGENT = agent;
  let { outputFormat, inputFormat } = options;
  let viewMode = getInitialSettings_2().viewMode;
  let focusMode = isFocusModeEnabled();
  let verbose =
    options.verbose ??
    (viewMode ? viewMode === "verbose" : focusMode ? false : resolveSetting("verbose", false).value);
  let print = options.print;
  let init = options.init ?? false;
  let initOnly = options.initOnly ?? false;
  let maintenance = options.maintenance ?? false;
  announceScreenReaderMode(!print && process.stdout.isTTY === true, (message) => {
    console.log(message);
  });
  let disableSlashCommands = options.disableSlashCommands || false;
  setDisableSlashCommands(disableSlashCommands);
  let windowArg = resolveWindowArg(options.autocompact);
  let worktree = isWorktreeModeEnabled() ? options.worktree : undefined;
  let worktreeArg = typeof worktree === "string" ? worktree : undefined;
  let worktreeRequested = worktree !== undefined;
  let prReference;
  if (worktreeArg) {
    let prReference_2 = parsePRReference(worktreeArg);
    if (prReference_2 !== null) {
      prReference = prReference_2;
      worktreeArg = undefined;
    }
  }
  let useTmux = isWorktreeModeEnabled() && options.tmux === true;
  if (useTmux) {
    if (!worktreeRequested) return cliError("Error: --tmux requires --worktree");
    if (getPlatform() === "windows") return cliError("Error: --tmux is not supported on Windows");
    if (!(await isTmuxAvailable()))
      return cliError(`Error: tmux is not installed.
${getTmuxInstallInstructions()}`);
  }
  let teammateOptions = extractTeammateOptions(options);
  if (teammateOptions.parentSessionId)
    getTeammateUtils().setCliParentSessionId?.(teammateOptions.parentSessionId);
  setTeammateAgentId(teammateOptions.agentId);
  let teammateSetup;
  if (isAgentSwarmsEnabled()) {
    teammateSetup = teammateOptions;
    let partialTeammateId = teammateOptions.agentId || teammateOptions.agentName || teammateOptions.teamName;
    let teamName = teammateOptions.agentId && teammateOptions.agentName && teammateOptions.teamName;
    if (partialTeammateId && !teamName)
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
  let partialMessages = includePartialMessages || env.CLAUDE_CODE_INCLUDE_PARTIAL_MESSAGES;
  let forwardSubagent = forwardSubagentText || env.CLAUDE_CODE_FORWARD_SUBAGENT_TEXT;
  if (includeHookEvents || env.CLAUDE_CODE_REMOTE) setAllHookEventsEnabled(true);
  consumeUserPromptSubmitEventsEnv();
  if (sdkUrl) {
    if (!inputFormat) inputFormat = "stream-json";
    if (!outputFormat) outputFormat = "stream-json";
    if (options.verbose === undefined) verbose = true;
    if (!options.print) print = true;
  }
  let usedSettingSource = false;
  let cloudSessionsByDefault = false;
  let sandboxVmByDefault = false;
  let cloudLaunchOptions = await resolveCloudLaunchOptions(options, {
    prompt: typeof typedName === "string" ? typedName : undefined,
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
  let cloudDeclined = cloudLaunchOptions.value.cloudDefault === "declined";
  let neverTrue = alwaysFalse_2();
  if (cloudDeclined) logFeatureSad("cloud_session_default", "local_flag");
  let cloudNotAllowed = cloudLaunchOptions.value.cloudDefault === "not_allowed";
  if (cloudNotAllowed) logFeatureSad("cloud_session_default", "org_policy");
  let personalWithoutEffectNotification;
  let sandboxVmStayReason;
  let askCloudDefaultReason = false;
  let cloudApplied = cloudLaunchOptions.value.cloudDefault === "applied";
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
  let runsOnAnotherMachine =
    remote !== null ||
    cloudAttachId !== null ||
    poolId !== null ||
    poolPromotedRemote ||
    projectBrowse !== null ||
    Boolean(pendingConnect?.url) ||
    Boolean(pendingSSH?.host);
  if (restricted && runsOnAnotherMachine)
    return cliError(
      "Error: --restricted cannot be enforced in a cloud, remote-environment or ssh session, which runs its tools on another machine",
    );
  getRootSession().host.launchOptions.replaceMayForwardHomeSettings(forwardHomeSettings);
  getRootSession().host.launchOptions.replaceHomeSettingsHostConsent(homeSettingsConsent);
  let sdkNonInteractive =
    getIsNonInteractiveSession() &&
    (headlessCloud ||
      headlessCloudPrint ||
      cloudAttachId !== null ||
      projectBrowse !== null ||
      poolId !== null);
  let footer;
  let footerFlag = false;
  let watchArtifactOpt = options.watchArtifact ?? options.watchArtifactNoAutoreact;
  if (watchArtifactOpt !== undefined) {
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
    let watchArtifactArg = parseWatchArtifactArg(watchArtifactOpt);
    if ("error" in watchArtifactArg) return cliError(watchArtifactArg.error);
    let noAutoReact = typeof options.watchArtifactNoAutoreact === "string";
    setPendingWatchArtifact(
      noAutoReact
        ? {
            ...watchArtifactArg,
            autoReactDisarmed: true,
          }
        : watchArtifactArg,
    );
    footer = watchArtifactArg.slug;
    footerFlag = noAutoReact;
  }
  let sessionGroupingId = null;
  let remoteControlOpt = options.remoteControl ?? options.rc;
  let remoteControl = false;
  let remoteControlName =
    typeof remoteControlOpt === "string" && remoteControlOpt.length > 0 ? remoteControlOpt : undefined;
  let remoteControlSessionNamePrefix = options.remoteControlSessionNamePrefix;
  if (remoteControlSessionNamePrefix)
    process.env.CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX = remoteControlSessionNamePrefix;
  let sessionIdCheck = validateSessionIdFlag({
    sessionId,
    continue: options.continue,
    resume: options.resume,
    forkSession: options.forkSession,
    sdkUrl,
  });
  if (!sessionIdCheck.ok) return cliError(sessionIdCheck.error);
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
      let systemPromptFile = resolve(options.systemPromptFile);
      systemPrompt = joinPromptAppend(await readFile(systemPromptFile, "utf8"), options.systemPrompt);
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
      let appendPromptFile = resolve(options.appendSystemPromptFile);
      appendSystemPrompt = joinPromptAppend(
        verifyBridgeCarrierPrompt(await readFile(appendPromptFile)),
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
  if (
    isAgentSwarmsEnabled() &&
    teammateSetup?.agentId &&
    teammateSetup?.agentName &&
    teammateSetup?.teamName
  ) {
    let TEAMMATE_SYSTEM_PROMPT_ADDENDUM = teammatePromptAddendumModule().TEAMMATE_SYSTEM_PROMPT_ADDENDUM;
    appendSystemPrompt_2 = appendSystemPrompt_2
      ? `${appendSystemPrompt_2}

${TEAMMATE_SYSTEM_PROMPT_ADDENDUM}`
      : TEAMMATE_SYSTEM_PROMPT_ADDENDUM;
  }
  let permissionMode_2 = agent
    ? getBuiltInAgents().find((builtinAgent) => builtinAgent.agentType === agent)?.permissionMode
    : undefined;
  let isRemoteLaunch = isRemoteSessionLaunch({
    remote,
    isNonInteractiveSession,
    headlessCloud,
    headlessCloudPrint,
    isContinue: Boolean(options.continue),
    pendingAssistantChat: undefined,
    pendingConnectUrl: pendingConnect?.url,
    pendingSSHHost: pendingSSH?.host,
  });
  let resumed = false;
  let remoteNonInteractive = isRemoteNonInteractiveSession();
  let initResult;
  let initializeSession = async (session, options, budgetMs) => {
    profileCheckpoint(options.before);
    let startTime = performance.now();
    let initDone = await waitForInitialize({
      initialize: initializeGrowthBook,
      budgetMs,
    });
    noteFlagFetchWait(initDone.waitMs);
    recordPhase(session, performance.now() - startTime, startTime);
    logForDiagnosticsNoPII(initDone.timedOut ? "warn" : "info", "startup_flag_fetch_wait", {
      budget_ms: budgetMs,
      waited_ms: Math.round(initDone.waitMs),
      timed_out: initDone.timedOut,
      killswitch_recheck: session !== "growthbook_init_ms",
    });
    profileCheckpoint(options.after);
    return initDone;
  };
  let growthBookCold = false;
  let autoModeConfig = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_auto_mode_config", {});
  let autoModeDisabledByDisk =
    autoModeConfig.source === "disk" && autoModeConfig.value?.enabled === "disabled";
  let kickDecision = judgeGrowthBookKick(remoteNonInteractive);
  let shouldKick = kickDecision !== undefined && shouldKickGrowthBookOnWarmCache(remoteNonInteractive);
  if (
    startupFlagWaitPoint({
      nonInteractive: isNonInteractiveSession,
      budgetMs: kickDecision,
      settingsEnvPending:
        isNonInteractiveSession &&
        kickDecision !== undefined &&
        pendingSettingsEnvBlocksEarlyGb(worktreeRequested),
      cacheEmpty: isGrowthBookCacheEmpty(),
      relaunches: remoteNonInteractive,
      autoModeKillSwitchOnDisk: autoModeDisabledByDisk,
      warmWakeEarlyFetch: shouldKick,
    }) === "gb-before-mode" &&
    kickDecision !== undefined
  ) {
    growthBookCold = true;
    initResult = {
      site: "gb-before-mode",
      result: await initializeSession(
        "growthbook_init_ms",
        {
          before: "before_growthbook_init",
          after: "after_growthbook_init",
        },
        kickDecision,
      ),
    };
  }
  if (
    getIsNonInteractiveSession() &&
    initResult === undefined &&
    autoModeDisabledByDisk &&
    is1PEventLoggingEnabled() &&
    !pendingSettingsEnvBlocksEarlyGb(worktreeRequested)
  )
    await initializeSession(
      "growthbook_killswitch_recheck_ms",
      {
        before: "before_gb_killswitch_recheck",
        after: "after_gb_killswitch_recheck",
      },
      EVENT_LOGGING_FLAG_WAIT_MS,
    );
  let proactivityLevel = DEFAULT;
  let permissionCtx;
  let startupPermissionMode = permissionMode;
  let modeState;
  {
    disableProactivitySelector(keybindingsState, storageV5, undefined);
    if (proactivity !== undefined || (!alwaysFalse() && isRelaunchProactivityEverOn()))
      startProactivitySelectorGate();
    let startupProactivity = resolveStartupProactivity(proactivity);
    proactivityLevel = startupProactivity.level;
    permissionCtx = startupProactivityLevel({
      startupLevel: startupProactivity,
      startsAsRemoteThinClient: isRemoteLaunch,
    });
    let askMode = startupPermissionModeForAsk({
      cliLevel: proactivity,
      modeSuppliedOnInvocation:
        permissionMode !== undefined ||
        inheritPermissionMode !== undefined ||
        dangerouslySkipPermissions === true ||
        permissionMode_2 !== undefined,
    });
    if (askMode !== undefined) {
      startupPermissionMode = askMode;
      modeState = "--proactivity ask isn't available here \xB7 Started in manual mode";
    }
  }
  let bypassPermissionsBlockedByHost = false;
  let defaultMode;
  let inheritedDirs = [];
  let {
    mode,
    notification,
    proactivity: proactivity_2,
    modeSuppliedOnInvocation,
  } = initialPermissionModeFromCLI({
    permissionModeCli: startupPermissionMode,
    inheritPermissionModeCli: inheritPermissionMode,
    dangerouslySkipPermissions,
    allowDangerouslySkipPermissions,
    bypassPermissionsBlockedByHost,
    agentPermissionMode: permissionMode_2,
    proactivityLevel: permissionCtx?.level,
  });
  defaultMode = notification ?? modeState;
  let initialMode = mode;
  let bypassNotice = restrictedBypassNotice({
    restricted,
    permissionMode: initialMode,
    allowDangerouslySkipPermissions,
  });
  if (bypassNotice) return cliError(`Error: ${bypassNotice}`);
  applyInheritedPermissionModeFlag({
    inheritPermissionModeCli: inheritPermissionMode,
    resolvedMode: initialMode,
    storageV5,
  });
  setSessionBypassPermissionsMode(initialMode === "bypassPermissions");
  if (
    options.enableAutoMode ||
    startupPermissionMode === "auto" ||
    permissionMode_2 === "auto" ||
    (initialMode === "auto" && !isAutoModeFromFallback()) ||
    (!startupPermissionMode && isDefaultPermissionModeAuto())
  )
    setAutoModeFlagCli(true);
  emitStartupMark("action_before_mcp_policy_wait");
  await awaitMcpPolicyColdStart({
    hasDynamicMcpConfig: Boolean(mcpConfig && mcpConfig.length > 0) || ide,
    pluginStateReliable: shouldRefillPluginCache(),
    storageV5,
  });
  let config = {};
  let mcpAnalytics = {
    ...getRepoMcpListsForAnalytics(),
    mcpConfigBlockedCount: 0,
  };
  let ownedConfigs = {};
  let sdkConfigs = {};
  let bridgeSessionId = sdkUrl ? sessionId : undefined;
  let remoteMcpConfig = loadRemoteMcpConfig(bridgeSessionId, getServerUrl);
  let mergedMcp = mergeMcpConfigs([], [], remoteMcpConfig);
  if (mcpConfig && mcpConfig.length > 0) {
    let filtered = mcpConfig.map((entry) => entry.trim()).filter((text) => text.length > 0);
    let sdkServers = [];
    let warnings = [];
    let fileServers = [];
    let isBridgeCarrierChild = startupCcrEnv.isBridgeCarrierChild;
    let parsedConfigs = [];
    for (let entry of filtered) {
      let inlineConfig = null;
      let entryWarnings = [];
      let parsedJson = safeParseJSON(entry, false);
      if (parsedJson) {
        let mcpConfig = parseMcpConfig({
          configObject: parsedJson,
          filePath: "command line",
          expandVars: true,
          scope: "dynamic",
          bridgeSessionId,
        });
        if (mcpConfig.config) inlineConfig = mcpConfig.config.mcpServers;
        entryWarnings = mcpConfig.errors;
        sdkConfigs = {
          ...sdkConfigs,
          ...mcpConfig.asWrittenEntries,
        };
      } else {
        let filePath = resolve(entry);
        let mcpConfigFromFilePath = parseMcpConfigFromFilePath({
          filePath,
          expandVars: true,
          scope: "dynamic",
          bridgeSessionId,
        });
        if (mcpConfigFromFilePath.config) inlineConfig = mcpConfigFromFilePath.config.mcpServers;
        entryWarnings = mcpConfigFromFilePath.errors;
        sdkConfigs = {
          ...sdkConfigs,
          ...mcpConfigFromFilePath.asWrittenEntries,
        };
        let [fromFile, fromSdk] = await Promise.all([
          stat(filePath).catch(() => {
            return;
          }),
          realpath(filePath).catch(() => filePath),
        ]);
        if (fromFile === undefined || fromFile.isFile()) parsedConfigs.push(filePath, fromSdk);
      }
      if (inlineConfig) {
        sdkServers.push(inlineConfig);
        if (entryWarnings.length > 0) {
          logForDebugging(
            `--mcp-config: ${entryWarnings.length} entry warning(s): ${entryWarnings.map((warning) => `${warning.path ? warning.path + ": " : ""}${warning.message}`).join("; ")}`,
            {
              level: "warn",
            },
          );
          for (let warning of entryWarnings) {
            let mcpErrorMetadata = warning.mcpErrorMetadata;
            if (mcpErrorMetadata?.skipReason && mcpErrorMetadata.serverName != null)
              fileServers.push({
                name: mcpErrorMetadata.serverName,
                type: mcpErrorMetadata.skipReason,
                message: warning.message,
              });
          }
        }
      } else warnings.push(...entryWarnings);
    }
    setFlagMcpConfigFilePaths(uniq(parsedConfigs));
    if (warnings.length > 0) {
      let joined = warnings.map((warning) => `${warning.path ? warning.path + ": " : ""}${warning.message}`)
        .join(`
`);
      logForDebugging(`--mcp-config validation failed (${warnings.length} errors): ${joined}`, {
        level: "error",
      });
      return cliError(`Error: Invalid MCP configuration:
${joined}`);
    }
    mergedMcp = mergeMcpConfigs(
      sdkServers,
      fileServers.map((server) => server.name),
      remoteMcpConfig,
    );
    for (let refused of mergedMcp.refused)
      logForDebugging(`--mcp-config: ${refused.message}`, {
        level: "warn",
      });
    let servers = mergedMcp.servers;
    fileServers.unshift(...mergedMcp.refused);
    let byName = new Map();
    for (let server of fileServers) if (!Object.hasOwn(servers, server.name)) byName.set(server.name, server);
    if (byName.size > 0) {
      let list = Array.from(byName.values());
      recordSkippedDynamicServers(list);
      if (!getIsNonInteractiveSession() || process.stderr.isTTY)
        warnStartupIssues(
          `${list.length} ${plural(list.length, "MCP server")} skipped due to invalid config:`,
          {
            stderrPrefix: "Warning: ",
            items: list.map((warning) => warning.message),
          },
        );
    }
    if (Object.keys(servers).length > 0) {
      let isRemote = Boolean(env.CLAUDE_CODE_REMOTE) || isBridgeCarrierChild;
      let sideloadBlocked = areSideloadFlagsDisabledByPolicy() && !areMcpConfigsAllSdkType(servers);
      if (sideloadBlocked && !isRemote) return cliError(sideloadFlagsBlockedMessage(["--mcp-config"]));
      let kept = ccrArtifactsEntryModule?.withoutWithheldCcrArtifactsEntry(servers).kept ?? servers;
      let keptConfigs = import_mapValues(kept, (config, name) => {
        let dynamicConfig = {
          ...config,
          scope: "dynamic",
        };
        if (env.CLAUDE_CODE_REMOTE) getServerUrl(name, config);
        return isCliOwnedConfig(config)
          ? registerCliOwnedConfig(dynamicConfig)
          : markCcrInjectedConfig(name, dynamicConfig, isLockedOutByOrgMcpPolicy);
      });
      let { configs, blocked, held } = filterDynamicMcpServersByPolicy(keptConfigs);
      mcpAnalytics.mcpConfigBlockedCount = blocked.length;
      if (blocked.length > 0)
        warnStartupIssues(
          `MCP ${plural(blocked.length, "server")} blocked by enterprise policy: ${blocked.join(", ")}`,
          {
            stderrPrefix: "Warning: ",
          },
        );
      let heldNames = {
        ...configs,
        ...filterObject(keptConfigs, (config, name) => held.includes(name)),
      };
      let sdkOnly = filterObject(heldNames, (config) => config.type === "sdk");
      let dropForEnterpriseMcpConfig =
        doesEnterpriseMcpConfigExist() &&
        isRemote &&
        !options.strictMcpConfig &&
        areMcpConfigsAllowedWithEnterpriseMcpConfig(sdkOnly);
      let {
        servers: servers_2,
        dropped,
        keptNotes,
        reason,
      } = applyMcpPolicyDrops(heldNames, {
        dropForEnterpriseMcpConfig,
        dropForSideloadPolicy: sideloadBlocked && isRemote,
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
      let repoToolsNote = ccrRepoToolsOnlyNote(servers_2);
      if (repoToolsNote) {
        logForDebugging(repoToolsNote);
        cliWarn(repoToolsNote);
      }
      ownedConfigs = servers_2;
      config = {
        ...config,
        ...servers_2,
      };
    }
  }
  let ownership = mergedMcp.ownership;
  let provenanceNote = mcpConfigProvenanceNote(
    ownership?.hostOwnedNames,
    Object.keys(mergedMcp.servers).length,
  );
  if (provenanceNote)
    logForDebugging(provenanceNote.text, {
      level: provenanceNote.level,
    });
  let unusableEnterpriseMcpConfigMessage = getUnusableEnterpriseMcpConfigMessage();
  if (unusableEnterpriseMcpConfigMessage !== null && getIsNonInteractiveSession() && !sdkNonInteractive)
    if (process.stderr.isTTY) cliWarn(`Warning: ${unusableEnterpriseMcpConfigMessage}`);
    else
      logForDebugging(unusableEnterpriseMcpConfigMessage, {
        level: "warn",
      });
  let opts = options;
  setChromeFlagOverride(opts.chrome);
  let hostedChrome = hasHostedClaudeInChromeServer(config);
  let wantsChrome = !hostedChrome && shouldEnableClaudeInChrome(opts.chrome) && isClaudeAISubscriber();
  if (
    !hostedChrome &&
    opts.chrome !== false &&
    (opts.chrome === true || env.CLAUDE_CODE_ENABLE_CFC === true) &&
    !isClaudeInChromeAllowed()
  ) {
    let policyReason =
      policyDeniedReason("allow_claude_browser_extension", "Claude in Chrome", "is") ??
      "Claude in Chrome is disabled by your organization";
    if (isNonInteractiveSession)
      logForDebugging(`[Claude in Chrome] ${policyReason}`, {
        level: "warn",
      });
    else warnStartupIssues(policyReason);
  }
  let chromeDenied = isMcpServerDenied(
    CLAUDE_IN_CHROME_MCP_SERVER_NAME,
    getClaudeInChromeStdioServerConfig(),
  );
  let chromeBlocked = isClaudeInChromeBlockedByEnterpriseMcpConfig() || chromeDenied;
  let offerClaudeInChrome =
    !wantsChrome && !hostedChrome && !chromeBlocked && shouldAutoEnableClaudeInChrome(storageV5);
  let offerChrome =
    wantsChrome && opts.chrome !== true && env.CLAUDE_CODE_ENABLE_CFC !== true && chromeBlocked;
  let notChrome =
    wantsChrome &&
    opts.chrome !== true &&
    ((env.CLAUDE_CODE_ENABLE_CFC !== true && isSafeMode()) || restricted);
  if (hostedChrome && chromeDenied) {
    logForDebugging(
      "[Claude in Chrome] Served by the remote session host over --mcp-config, but a deniedMcpServers policy entry denies Claude in Chrome; dropping the entry and not starting the built-in server",
    );
    config = filterObject(config, (config, name) => name !== CLAUDE_IN_CHROME_MCP_SERVER_NAME);
  } else if (hostedChrome && !isClaudeInChromeAllowed())
    logForDebugging(
      "[Claude in Chrome] Served by the remote session host over --mcp-config, but the org policy denies the browser extension; not adopting it and not starting the built-in server",
    );
  else if (hostedChrome) {
    logForDebugging(
      "[Claude in Chrome] Served by the remote session host over --mcp-config; not starting the built-in server",
    );
    putChromePromptInSystemPrompt(adoptHostedClaudeInChrome().systemPrompt);
  } else if (offerChrome)
    logForDebugging(
      "[Claude in Chrome] Skipping chrome wiring: blocked by enterprise MCP config or managed deniedMcpServers policy",
    );
  else if (notChrome)
    logForDebugging("[Claude in Chrome] Skipping chrome wiring: --safe-mode or --restricted");
  else if (wantsChrome && (chromeDenied || unusableEnterpriseMcpConfigMessage !== null)) {
    if (isNonInteractiveSession)
      logForDebugging(
        `[Claude in Chrome] MCP server blocked by enterprise policy: ${CLAUDE_IN_CHROME_MCP_SERVER_NAME}`,
        {
          level: "warn",
        },
      );
    else warnStartupIssues(`MCP server blocked by enterprise policy: ${CLAUDE_IN_CHROME_MCP_SERVER_NAME}`);
  } else if (wantsChrome) {
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
  let mcpOpts = options;
  let strictMcpConfig = options.strictMcpConfig || false;
  setStrictMcpConfig(strictMcpConfig);
  let includeUnsupported = options.includeUnsupportedModels === true;
  getProviderState().includeUnsupportedModels = includeUnsupported;
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
    ...(agentsFlagPath === undefined &&
      typeof options.agent === "string" &&
      options.agent !== "" && {
        agent: options.agent,
      }),
    ...(agentsFlagPath === undefined &&
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
    ...(includeUnsupported ? ["--include-unsupported-models"] : []),
    ...(mcpOpts.channels ?? []).flatMap((channel) => ["--channels", channel]),
    ...(footer !== undefined
      ? [footerFlag ? "--watch-artifact-no-autoreact" : "--watch-artifact", footer]
      : []),
  ]);
  let gatedMcp = gateDynamicMcpConfigForEnterpriseMcpConfig({
    dynamicMcpConfig: config,
    strictMcpConfig,
  });
  if (gatedMcp.kind === "refuse") return cliError(gatedMcp.message);
  if (gatedMcp.dropped.length > 0) {
    let { servers, dropped } = gatedMcp;
    config = servers;
    ownedConfigs = filterObject(ownedConfigs, (config, name) => Object.hasOwn(servers, name));
    let enterpriseNote = `the enterprise MCP config (managed-mcp.json) keeps exclusive control over MCP servers; ignoring ${dropped.length} dynamically configured MCP ${plural(dropped.length, "server")}: ${dropped.join(", ")}`;
    logForDebugging(enterpriseNote, {
      level: "warn",
    });
    if (
      getIsNonInteractiveSession() &&
      (process.stderr.isTTY || env.CLAUDE_CODE_REMOTE) &&
      !sdkNonInteractive
    )
      warnStartupIssues(enterpriseNote, {
        stderrPrefix: "Warning: ",
      });
  }
  setAdditionalDirectoriesForClaudeMd(addDir);
  let header;
  let partition = (entries, pluginIds) => {
    let channelEntries = [];
    let pluginEntries = [];
    for (let entry of entries)
      if (entry.startsWith("plugin:")) {
        let sliced = entry.slice(7);
        let index = sliced.indexOf("@");
        if (index <= 0 || index === sliced.length - 1) pluginEntries.push(entry);
        else
          channelEntries.push({
            kind: "plugin",
            name: sliced.slice(0, index),
            marketplace: sliced.slice(index + 1),
          });
      } else if (entry.startsWith("server:") && entry.length > 7)
        channelEntries.push({
          kind: "server",
          name: entry.slice(7),
        });
      else pluginEntries.push(entry);
    if (pluginEntries.length > 0)
      cliError(
        `${pluginIds} entries must be tagged: ${pluginEntries.join(", ")}
` +
          `  plugin:<name>@<marketplace>  \u2014 plugin-provided channel (allowlist enforced)
` +
          "  server:<name>                \u2014 manually configured MCP server",
      );
    return channelEntries;
  };
  let { channels, dangerouslyLoadDevelopmentChannels } = mcpOpts;
  let channelArgs = [];
  if (channels && channels.length > 0) {
    channelArgs = partition(channels, "--channels");
    setAllowedChannels(channelArgs);
  }
  if (!isNonInteractiveSession) {
    if (dangerouslyLoadDevelopmentChannels && dangerouslyLoadDevelopmentChannels.length > 0)
      header = partition(dangerouslyLoadDevelopmentChannels, "--dangerously-load-development-channels");
  }
  if (channelArgs.length > 0 || (header?.length ?? 0) > 0) {
    let sanitizePluginIds = (entry) =>
      sanitizedPluginIds(
        entry.flatMap((id) => (id.kind === "plugin" ? [`${id.name}@${id.marketplace}`] : [])),
        isChannelAllowlisted,
      );
    logEvent("tengu_mcp_channel_flags", {
      channels_count: channelArgs.length,
      dev_count: header?.length ?? 0,
      plugins: sanitizePluginIds(channelArgs),
      dev_plugins: sanitizePluginIds(header ?? []),
    });
  }
  if (tools.length > 0) {
    let { shouldToolsListOptInToBrief } = require("../../tools/BriefTool/BriefTool.js");
    if (shouldToolsListOptInToBrief(splitRuleList(tools))) setUserMsgOptIn(true);
  }
  if (getIsNonInteractiveSession()) {
    let trusted = checkHasTrustDialogAccepted();
    setSessionTrustAccepted(true);
    if (!trusted)
      import("../../utils/detectRepository.js").then((loaderModule) => {
        loaderModule.primeCurrentRepository();
      });
  }
  emitStartupMark("action_before_permission_context");
  let startTime = performance.now();
  let launchOptions = await applySessionLaunchOptions({
    allowedTools,
    disallowedTools,
    baseTools: tools,
    restricted,
    permissionMode: initialMode,
    allowDangerouslySkipPermissions,
    addDirs: addDir,
    storageV5,
  });
  let toolPermissionContext = launchOptions.toolPermissionContext;
  if (proactivity_2)
    toolPermissionContext = {
      ...toolPermissionContext,
      ...proactivity_2,
    };
  let { warnings, overlyBroadBashPermissions } = launchOptions;
  defaultMode ??= launchOptions.bypassCapabilityNotification;
  recordPhase("permission_context_ms", performance.now() - startTime, startTime);
  if (
    !getIsNonInteractiveSession() ||
    (outputFormat !== "json" && outputFormat !== "stream-json" && env.CLAUDE_CODE_SESSION_KIND !== "bg")
  ) {
    warnings.forEach((warning) => warnStartupIssues(warning));
    inheritedDirs.push(
      ...filterUnseenSecurityWarnings(
        launchOptions.securityWarnings.map((securityWarning) => ({
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
  let bypassCheck = checkBypassPermissionsEnv(toolPermissionContext);
  if (bypassCheck !== undefined)
    reportStartupModelNotice(bypassCheck, {
      key: "bypass-removal-waiver",
      outputFormat,
      onStderrToo: true,
    });
  armPendingSettingsEnvRule(getRootSession(), hasRepoSettingsEnv, worktreeRequested);
  enforceMinimumVersion();
  let mcpReady =
    isNonInteractiveSession && !sdkNonInteractive && headlessSyncsClaudeAiConnectors()
      ? fetchClaudeAiConfigsOnce(extraOptions).then((claudeAiConfigs) => {
          printClaudeAiConnectorNotice();
          let { allowed, blocked } = filterMcpServersByPolicy(claudeAiConfigs ?? {});
          if (blocked.length > 0)
            cliWarn(
              `Warning: claude.ai MCP ${plural(blocked.length, "server")} blocked by enterprise policy: ${blocked.join(", ")}`,
            );
          return allowed;
        })
      : Promise.resolve({});
  if (isRemoteLaunch) {
    setIsRemoteMode(true);
    if (hasSyncedPluginLaneOpened()) {
      clearPluginCache("remote thin client: synced plugin lane closes");
      clearSyncedPluginDirs();
    }
  }
  logForDebugging("[STARTUP] Loading MCP configs...");
  let now = Date.now();
  let prefetchTiming = {
    value: undefined,
  };
  let enterpriseGate =
    isNonInteractiveSession && isGateOOn() && hasManagedMcpPolicy()
      ? mcpReady.catch(() => ({}))
      : Promise.resolve();
  let enterpriseHeld = !(strictMcpConfig || isBareMode() || getIsRemoteMode()) && isEnterpriseMcpConfigHeld();
  let mcpConfigsPromise = (
    strictMcpConfig || isBareMode() || getIsRemoteMode()
      ? Promise.resolve({
          servers: {},
        })
      : enterpriseGate.then(() =>
          getClaudeCodeMcpConfigs(config, {
            storageV5,
            credentials: extraOptions,
          }),
        )
  ).then((result) => {
    prefetchTiming.value = Date.now() - now;
    return result;
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
    let sdkUrlCheck = validateSdkUrlFlag(sdkUrl);
    if (sdkUrlCheck !== null) {
      await logEventAsync("tengu_sdk_url_host_rejected", {
        code: fromEnum(sdkUrlCheck.code),
      });
      return cliErrorAfterAnalyticsFlush(
        `Error: --sdk-url rejected: ${sdkUrlCheck.reason}. This flag is reserved for Remote Control worker processes connecting to Anthropic's backend.`,
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
      let remoteControlDenied = policyDeniedReason("allow_remote_control", "Remote Control", "is");
      if (remoteControlDenied) {
        await logOrgPolicyDeniedAsync("allow_remote_control", "startup");
        return cliErrorAfterAnalyticsFlush(remoteControlDenied);
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
  let hydrateOpts = {
    hydrate: env.CLAUDE_CODE_CCR_EARLY_HYDRATE_PREFETCH,
    connect: env.CLAUDE_CODE_CCR_EARLY_REMOTE_CONNECT,
  };
  let earlyHydrate =
    (hydrateOpts.hydrate || hydrateOpts.connect) && sdkUrl && options.resume
      ? import("../remoteIO.js").then((hydrateModule) =>
          hydrateModule.startEarlyRemoteWork(sdkUrl, storageV5, hydrateOpts),
        )
      : undefined;
  let earlyHydrateReads = earlyHydrate?.then((readHydrator) => readHydrator.hydrateReads);
  let earlyRemoteLink = earlyHydrate?.then((linkHydrator) => linkHydrator.link);
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
  if (partialMessages) {
    if (!isNonInteractiveSession || outputFormat !== "stream-json") {
      if (includePartialMessages)
        return cliError(
          "Error: --include-partial-messages requires --print and --output-format=stream-json.",
        );
      partialMessages = false;
    }
  }
  if (forwardSubagent) {
    if (!isNonInteractiveSession || outputFormat !== "stream-json") {
      if (forwardSubagentText)
        return cliError("Error: --forward-subagent-text requires --print and --output-format=stream-json.");
      forwardSubagent = false;
    }
  }
  if (options.planModeInstructions && !isNonInteractiveSession)
    return cliError("Error: --plan-mode-instructions can only be used with --print mode.");
  if (!isNonInteractiveSession) {
    let cloudReason = cloudUnavailableReason(stdinOverrideCache.get(), {
      explicitCloudLaunch: remote !== null && !cloudApplied,
    });
    if (cloudReason !== undefined) return exitWithoutInteractiveInput(cloudReason);
  }
  let inputPrompt = await getInputPrompt(typedName || "", inputFormat ?? "text");
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
  let { setup } = await import("../../isDesktopEntrypointExempted.lazy.js");
  recordPhase("setup_import_ms", performance.now() - startTime_2, startTime_2);
  let messagingSocketPath = options.messagingSocketPath;
  let cwd = getCwd();
  try {
    claudeTempDir();
  } catch (error) {
    logError(error);
    let message = errorMessage(error);
    printCliError(message);
    await writeStartupFailureResult({
      sessionId: getSessionId(),
      message,
      reason: "temp_dir_unusable",
    });
    return cliErrorAfterAnalyticsFlush();
  }
  initBuiltinPlugins();
  resumed = true;
  initBundledSkills();
  let hasSshHost = !!pendingSSH?.host;
  let remoteLink;
  let linkFailed = false;
  let establishLink = async () => {
    if (remoteLink !== undefined && !linkFailed) return;
    try {
      let { shouldRefreshArtifactRoster } = await import("../../services/artifacts/artifactToolGates.js");
      if (!shouldRefreshArtifactRoster()) return;
      let {
        artifactRosterFetchDeferred,
        artifactRosterFresh,
        artifactRosterIdentityKnown,
        refreshArtifactRoster,
      } = await import("../../services/artifacts/rosterWait.js");
      if (!artifactRosterIdentityKnown() || artifactRosterFresh() || artifactRosterFetchDeferred()) return;
      linkFailed = false;
      remoteLink = refreshArtifactRoster({
        credentials: extraOptions,
        storageV5,
        timeoutMs: 5000,
      });
      remoteLink.then((link) => {
        linkFailed = !link;
      });
    } catch (error) {
      logForDebugging(`Artifact roster kick failed: ${errorMessage(error)}`);
    }
  };
  if (isNonInteractiveSession && !pendingSettingsEnvBlocksEarlyGb(worktreeRequested)) await establishLink();
  if (!shouldAwaitPolicyLimitsOnStartup()) ensurePolicyLimitsLoadRequested();
  else if ((await awaitPolicyLimitsColdStart()) !== "skipped")
    profileCheckpoint("action_after_policy_limits_cold_await");
  let orgValidation;
  if (!getIsNonInteractiveSession())
    await refuseOrgConfigEarlyAtStartup({
      showBlockedScreen: args.showOrgConfigBlockedScreen,
    });
  {
    let settledMode = settleProvisionalStartupMode(toolPermissionContext, {
      onNotification: (notice) => {
        defaultMode ??= notice;
      },
    });
    if (settledMode !== toolPermissionContext) {
      toolPermissionContext = settledMode;
      initialMode = settledMode.mode;
    }
    if (getIsNonInteractiveSession()) {
      defaultMode ??= levelAutoHeldForPendingVerdictNotice();
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
    let coldStartTimedOut = didPolicyLimitsColdStartTimeOut();
    logForDiagnosticsNoPII(coldStartTimedOut ? "warn" : "info", "policy_limits_cold_await", {
      budget_ms: POLICY_LIMITS_COLD_AWAIT_MS,
      waited_ms: Math.round(policyLimitsColdStartWait.waitedMs),
      timed_out: coldStartTimedOut,
    });
  }
  if (
    startEarlyPluginsSync(
      getRootSession(),
      extraOptions,
      () => shouldHoldEarlyGrowthBook(worktreeRequested) || env.CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER,
    )
  )
    addStartupContext({
      early_plugins_sync: 1,
    });
  if (
    startEarlySkillsSync(
      getRootSession(),
      storageV5,
      extraOptions,
      () => shouldHoldEarlyGrowthBook(worktreeRequested) || env.CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER,
    )
  )
    addStartupContext({
      early_skills_sync: 1,
    });
  let setupResult =
    ((growthBookCold && hasFreshGrowthBookFeatures()) || shouldKick) &&
    !pendingSettingsEnvBlocksEarlyGb(worktreeRequested) &&
    !env.CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER &&
    refreshMemoryContextForCcr(getRootSession());
  setAutoMemoryToggleRecorder(saveAutoMemorySessionSwitch);
  let setupPromise = setup(
    cwd,
    hasSshHost ? "default" : initialMode,
    hasSshHost ? false : allowDangerouslySkipPermissions,
    worktreeRequested,
    worktreeArg,
    useTmux,
    sessionId ? normalizeUuidOrNull(sessionId) : undefined,
    prReference,
    messagingSocketPath,
    storageV5,
    extraOptions,
    worktreeRequested && (cloudAttachId !== null || resumeInCloud !== null) && isWorktreeCloudClaimEnabled(),
    !runsOnAnotherMachine,
  );
  if (shouldFillPluginLoadWithStore(extraOptions) && !worktreeRequested && !isBareMode() && !isSafeMode())
    loadAllPluginsCacheOnly(storageV5, extraOptions).catch(() => {});
  if (!worktreeRequested) warmCommandSourceCaches(cwd, storageV5);
  let agentDefs = worktreeRequested ? null : getAgentDefinitionsWithOverrides(cwd, storageV5);
  agentDefs?.catch(() => {});
  let startTime_3 = performance.now();
  try {
    await setupPromise;
  } catch (error) {
    if (error instanceof CliUserError) return cliError(error.message);
    throw error;
  }
  recordPhase("setup_ms", performance.now() - startTime_3, startTime_3);
  logForDebugging(`[STARTUP] setup() completed in ${Date.now() - now_2}ms`);
  profileCheckpoint("action_after_setup");
  if (sessionId && sessionTeam) {
    let { rekeySessionTeamAtStartup } =
      await import("../../tools/TeamCreateTool/initializeSessionTeam.lazy.js");
    sessionTeam = (await rekeySessionTeamAtStartup(storageV5)) ?? sessionTeam;
  }
  await establishLink();
  let rootSession = getRootSession();
  setClaudeMdJudgedBy(rootSession, toolPermissionContext);
  let replaysMessages = !!options.replayUserMessages;
  replaysMessages = shouldReplayUserMessages({
    replayUserMessagesFlag: replaysMessages,
    outputFormat,
    explicitSocketPath: messagingSocketPath,
    socketBound: udsEnv.CLAUDE_CODE_MESSAGING_SOCKET !== undefined,
  });
  if (getIsNonInteractiveSession()) {
    applyConfigEnvironmentVariables();
    releaseGrowthBookHold(rootSession.host);
    orgValidation = await enforceOrgConfigGateHeadless(() => validateForceLoginOrg(extraOptions));
    if (inputFormat === "stream-json") armStartupWorkGate(rootSession.host);
    if (remoteNonInteractive && !growthBookCold) {
      growthBookCold = true;
      let kickDecision = judgeGrowthBookKick(remoteNonInteractive);
      if (kickDecision !== undefined) {
        if (shouldKick && isGrowthBookInitializeInFlight()) {
          profileCheckpoint("before_idle_gc");
          try {
            (await import("bun:jsc")).edenGC();
          } catch {}
          profileCheckpoint("after_idle_gc");
        }
        initResult = {
          site: "gb-before-context",
          result: await initializeSession(
            "growthbook_init_ms",
            {
              before: "before_growthbook_init",
              after: "after_growthbook_init",
            },
            kickDecision,
          ),
        };
      }
    }
    if (!isParkedSpare())
      if (sdkNonInteractive) logForDiagnosticsNoPII("info", "git_status_skipped_headless_cloud_arm");
      else prefetchGitStatus(rootSession);
    if (!isParkedSpare())
      if (!shouldPrefetchUserContext(Boolean(options.continue || options.resume)))
        getOrBuildUserContext(rootSession, storageV5, extraOptions);
      else startKeptProjectDetail(extraOptions);
    ensureModelStringsInitialized();
  }
  let explicitName = options.name ? sanitizeSessionTitle(options.name) || undefined : undefined;
  if (explicitName) {
    cacheSessionTitle(explicitName);
    cacheAgentName(explicitName);
  }
  let model = options.model;
  let sessionCwd = worktreeRequested ? getCwd() : cwd;
  let kickOnWarm = !growthBookCold ? judgeGrowthBookKick(remoteNonInteractive) : undefined;
  if (kickOnWarm !== undefined)
    initResult = {
      site: "gb-before-tools",
      result: await initializeSession(
        "growthbook_init_ms",
        {
          before: "before_growthbook_init",
          after: "after_growthbook_init",
        },
        kickOnWarm,
      ),
    };
  if (remoteNonInteractive) {
    markWarmCacheKickAsks(shouldKick);
    logEvent("tengu_startup_flag_fetch_wait", {
      waited: initResult !== undefined,
      site: fromEnumOpt(initResult?.site),
      wait_ms: Math.round(initResult?.result.waitMs ?? 0),
      timed_out: initResult?.result.timedOut ?? false,
      fetched: hasFreshGrowthBookFeatures(),
      warm_wake_early_fetch: shouldKick,
      kick_from_init: env.CLAUDE_CODE_GROWTHBOOK_KICK_FROM_INIT,
      kick_on_warm_cache: env.CLAUDE_CODE_GROWTHBOOK_KICK_ON_WARM_CACHE,
      flag_fetch_kick: fromEnumOpt(getFlagFetchKick()),
    });
    toolPermissionContext = {
      ...toolPermissionContext,
      chromeClassifierFloorEnabled: readChromeClassifierFloor(),
    };
  }
  await establishLink();
  let skillsSyncFlag = refreshAccountSkillsSyncFlag();
  if (skillsSyncFlag) startSkillSyncAndResync(rootSession, storageV5, extraOptions);
  else if (getSkillsSyncVetoed()) {
    clearSkillCaches();
    pruneSkillsSyncRoot(storageV5).catch(logError);
  }
  onSkillsSyncVetoChange();
  let pluginsSyncEnabled = enableAccountPluginsSync();
  primeSkillsListAskConversion(rootSession, () => isAppliedListCurrent(extraOptions));
  if (pluginsSyncEnabled) {
    startFirstPluginsSync(rootSession, extraOptions);
    syncClaudeAiMarketplaces(rootSession, extraOptions, storageV5);
  } else if (getPluginsSyncVetoed()) pruneSyncedPluginsForClosedGate().catch(logError);
  else if (isPluginsSyncFlagOn()) completeDeferredRemovals().catch(logError);
  subscribeMemoryToggleRefresh(rootSession);
  if (setupResult)
    refreshMemoryContext(rootSession, {
      credentials: extraOptions,
      storageV5,
    });
  else
    maybeKickMemoryContextFetch(rootSession, {
      credentials: extraOptions,
      storageV5,
    });
  let commands = worktreeRequested ? null : getCommands(sessionCwd, storageV5);
  commands?.catch(() => {});
  if (isXtermJs() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_thicket", true))
    clampLevelForAttacher(true);
  logForDebugging("[STARTUP] Loading commands and agents...");
  let now_3 = Date.now();
  if (shouldFillPluginLoadWithStore(extraOptions) && worktreeRequested && !isBareMode() && !isSafeMode())
    loadAllPluginsCacheOnly(storageV5, extraOptions).catch(() => {});
  let startTime_4 = performance.now();
  using artifactTelemetryHold = artifactStartupModule?.holdArtifactStartupTelemetry();
  let agentsForSession = await loadAgentsForSession({
    cwd: sessionCwd,
    toolPermissionContext,
    applyCoordinatorFilter: true,
    agentsJson: agents,
    agentSetting: agent,
    commandsPromise: commands,
    agentDefsPromise: agentDefs && agentReadForTheSeat(agentDefs, cwd, storageV5),
    deferCommands: shouldSyncPluginInstall(isNonInteractiveSession),
    onToolsLoaded: () => profileCheckpoint("action_tools_loaded"),
    storageV5,
  });
  recordPhase("tools_commands_load_ms", performance.now() - startTime_4, startTime_4);
  let { tools: tools_2, mainThreadAgentDefinition, commands: commands_2 } = agentsForSession;
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
    skill_count: count(commands_2, isSkillToolCommand),
  });
  deferredCommandsPromise?.then(
    (agent) =>
      addStartupContext({
        skill_count: count(agent, isSkillToolCommand),
      }),
    () => {},
  );
  loadAllPluginsCacheOnly(storageV5, extraOptions).then(
    (allPluginsCacheOnly) =>
      addStartupContext({
        plugin_count: allPluginsCacheOnly.enabled.length,
      }),
    () => {},
  );
  if (
    !mainThreadAgentDefinition &&
    isAgentSwarmsEnabled() &&
    teammateSetup?.agentId &&
    teammateSetup?.agentName &&
    teammateSetup?.teamName &&
    teammateSetup?.agentType
  ) {
    let agentExcludingWebFetch = findAgentExcludingWebFetch(
      agentDefinitions.activeAgents,
      teammateSetup.agentType,
    );
    if (agentExcludingWebFetch) {
      mainThreadAgentDefinition = agentExcludingWebFetch;
      setMainThreadAgentType(agentExcludingWebFetch.agentType);
    } else
      logForDebugging(`[teammate] Custom agent ${teammateSetup.agentType} not found in available agents`);
  }
  let agentSetting = agent ?? (isCoworkAny() ? undefined : getSettingsAfterPluginLoad("agent"));
  if (!mainThreadAgentDefinition && !agent && agentSetting) {
    mainThreadAgentDefinition = findSelectedAgent(agentDefinitions.activeAgents, agentSetting);
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
        let originalCall = tool.call.bind(tool);
        tool = {
          ...tool,
          async call(args, context, options, onQueryEvent, extra) {
            let callResult = await originalCall(args, context, options, onQueryEvent, extra);
            let { stashBgStructuredResult } =
              await import("../../services/agentStatus/LINK_SCAN_MAX_BYTES.lazy.js");
            stashBgStructuredResult(args);
            return callResult;
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
  let continuesExisting = Boolean(
    options.continue || options.resume || (!isNonInteractiveSession && options.fromPr) || teleport,
  );
  let routineModel;
  let routineModelTransientlySkipped = false;
  if (routineStartupModule)
    try {
      let routineStartupModel = await routineStartupModule.getRoutineStartupModel({
        routineName: options.routine?.trim(),
        userSpecifiedModel: model,
        agentModel: mainThreadAgentDefinition?.model,
        isSessionRestore: continuesExisting,
        cwd: getProjectRoot(),
        storageV5,
      });
      if (routineStartupModel.status === "model") routineModel = routineStartupModel.model;
      else if (routineStartupModel.status === "transient_skip") routineModelTransientlySkipped = true;
    } catch (error) {
      logError(error);
    }
  let initialModel = routineModel ?? mainThreadAgentDefinition?.model;
  let startTime_5 = performance.now();
  await ensureCatalogDecision({
    headless: isPlainNonInteractive(),
  });
  recordPhase("model_catalog_decision_ms", performance.now() - startTime_5, startTime_5);
  let mantleOverride;
  if (
    getIsNonInteractiveSession() &&
    !env.CLAUDE_CODE_SKIP_BEDROCK_AUTH &&
    !env.CLAUDE_CODE_SKIP_VERTEX_AUTH &&
    !env.CLAUDE_CODE_SKIP_MANTLE_AUTH
  )
    try {
      let { apply3PDefaultFallbacks } = await import("../../utils/model/thirdPartyDefaultFallbacks.js");
      let { lines, mantleOverride: mantleOverride_2 } = await apply3PDefaultFallbacks({
        pendingUserModel: model != null ? model : initialModel === "inherit" ? undefined : initialModel,
      });
      mantleOverride = mantleOverride_2;
      for (let line of lines)
        process.stderr.write(`Warning: ${line}
`);
    } catch (error) {
      logError(error);
    }
  if (options.clientDataUrl) env.set("CLAUDE_CODE_CLIENT_DATA_URL", options.clientDataUrl);
  if (options.allowOtherModels) env.set("CLAUDE_CODE_ALLOW_OTHER_MODELS", true);
  let clientDataApplied = await applyClientDataToSession({
    runsOnAnotherMachine,
  });
  if (clientDataApplied !== undefined) return cliError(clientDataApplied);
  let {
    effectiveModel,
    initialMainLoopModel,
    resolvedInitialModel,
    rawModelRequest,
    restrictedModel,
    unservedModelSpelling,
  } = await collectModelOverrides({
    userSpecifiedModel: model,
    agentModel: initialModel,
    agentModelSource: routineModel !== undefined ? "routine" : "agent",
    routineModelTransientlySkipped,
    storageV5,
    credentials: extraOptions,
  });
  let modelDeny = managedDenyStartupRefusal(resolvedInitialModel);
  if (modelDeny !== null) {
    printCliError(modelDeny);
    await writeStartupFailureResult({
      sessionId: getSessionId(),
      message: modelDeny,
      reason: "managed_settings_invalid",
    });
    return cliErrorAfterAnalyticsFlush();
  }
  if (mantleOverride && (effectiveModel == null || options.model === "default"))
    setMainLoopModelOverride(mantleOverride);
  let clientDataModelEntry = checkClientDataModelEntry();
  if (clientDataModelEntry !== undefined) return cliError(clientDataModelEntry);
  fetchDynamicModelConfig(resolvedInitialModel, extraOptions, storageV5);
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
  let advisorState;
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
      let advisorModel = stripAnyVersatileSuffix(parseUserSpecifiedModel(advisor));
      if (!canUseAsAdvisor(advisorModel)) {
        let advisorPending = isAdvisorPendingConsent(advisorModel);
        let advisorNotice = advisorPending
          ? `${getAdvisorCreditsNotice(advisorModel)} Run ${getAdvisorModelSwitchCommand(advisorModel)}${isNonInteractiveSession ? " in an interactive session" : ""} to review and enable.`
          : `Error: The model "${advisor}" cannot be used as an advisor.`;
        if (env.CLAUDE_CODE_SESSION_KIND !== "bg") {
          if (advisorPending) {
            await logFeatureSadAsync(
              "advisor_fable_consent",
              isNonInteractiveSession ? "noninteractive_set_blocked" : "interactive_launch_blocked",
            );
            return cliErrorAfterAnalyticsFlush(advisorNotice);
          }
          return cliError(advisorNotice);
        }
        logForDebugging(`[AdvisorTool] ${advisorNotice}`, {
          level: "warn",
        });
      }
      if (!canAdviseModel(resolvedInitialModel, advisorModel)) {
        let advisorRefusal = `"${advisor}" cannot advise "${resolvedInitialModel}" (the advisor must be at least as capable as the main model). The advisor will not be used for the main model.`;
        if (!isNonInteractiveSession || env.CLAUDE_CODE_SESSION_KIND !== "bg")
          warnStartupIssues(advisorRefusal);
        else
          logForDebugging(`[AdvisorTool] ${advisorRefusal}`, {
            level: "warn",
          });
      }
    }
    advisorState = advisor ?? getConfiguredAdvisorModel();
    if (advisorState) logForDebugging(`[AdvisorTool] Advisor model: ${advisorState}`);
  }
  let allowedBetas = isNonInteractiveSession && !sdkNonInteractive ? filterAllowedSdkBetas(betas) : undefined;
  let cloudAttachCheck =
    cloudAttachId === null &&
    poolId === null &&
    remote === null &&
    !(continuesExisting && !startupModelWinsOverSessionRestore());
  let unknownModelWindow = null;
  if (cloudAttachCheck) {
    let unknownModelNotice = buildUnknownModelNotice(resolvedInitialModel, windowArg, allowedBetas);
    let contextWindowNotice = oneMillionContextNotice(resolvedInitialModel, windowArg, allowedBetas);
    if (unknownModelNotice !== null)
      unknownModelWindow = emitUnknownModelNotice(unknownModelNotice, {
        interactive: !isNonInteractiveSession && !runsOnAnotherMachine,
        headless: (headlessValue) =>
          reportStartupModelNotice(headlessValue, {
            key: "model-context-window",
            outputFormat,
          }),
      });
    else if (contextWindowNotice !== null)
      reportStartupModelNotice(contextWindowNotice, {
        key: "model-context-window",
        outputFormat,
        debugLine: `[autocompact] ${contextWindowNotice}`,
      });
  }
  if (!runsOnAnotherMachine)
    reportEnvWindow(env.CLAUDE_CODE_AUTO_COMPACT_WINDOW, {
      interactive: !isNonInteractiveSession,
      headless: (headlessValue) =>
        reportStartupModelNotice(headlessValue, {
          key: "auto-compact-window-env",
          outputFormat,
          debugLine: `[autocompact] ${headlessValue}`,
        }),
    });
  maybeActivateBrief(options);
  if (!getIsNonInteractiveSession() && !getUserMsgOptIn() && getInitialSettings_2().defaultView === "chat") {
    let { isBriefEntitled } = require("../../tools/BriefTool/BriefTool.js");
    if (isBriefEntitled()) setUserMsgOptIn(true);
  }
  let mcpApprovalState;
  let mcpApprovalSkipWarning = null;
  let skipDangerousModePromptSetPreDialog = hasSkipDangerousModePermissionPrompt();
  if (!isNonInteractiveSession) {
    let printHost =
      (await args.runOnboarding?.({
        session: rootSession,
        options,
        teleport,
        permissionMode: initialMode,
        toolPermissionContext,
        storedTeammateOpts: teammateSetup,
        isSSHPending: hasSshHost,
        allowDangerouslySkipPermissions,
        commands: commands_2,
        skippedChromeForAdminPolicy: offerChrome,
        enableClaudeInChrome: wantsChrome,
        chromeDeniedByPolicy: chromeDenied,
        devChannels: header,
        offerClaudeInChrome,
        askCloudDefaultReason,
        wasTrustedBeforeSetup,
        wasPersistedTrustedBeforeSetup,
        strictMcpConfig,
        mcpConfigPromise: mcpConfigsPromise,
        dynamicMcpConfig: config,
        currentCwd: sessionCwd,
        mcpConfigResolvedMs: prefetchTiming,
        providerSetupCommand,
        remoteControlOption: remoteControlOpt,
        remoteControl,
        projectForRemoteControl,
        mainThreadAgentDefinition,
        inputPrompt,
        prompt: typedName,
        storageV5,
        credentials: extraOptions,
      })) ?? cliError("Interactive session requires the runOnboarding capability");
    releaseGrowthBookHold(rootSession.host);
    let kickDecision = hasHeldGrowthBook(rootSession.host)
      ? judgeGrowthBookKick(remoteNonInteractive)
      : undefined;
    if (kickDecision !== undefined)
      await initializeSession("growthbook_init_ms", GROWTHBOOK_HOLD_STAGES, kickDecision);
    let endInkWithError = args.endInkWithError;
    await enforceOrgConfigGateAtStartup({
      showBlockedScreen: args.showOrgConfigBlockedScreen,
      ...(endInkWithError !== undefined && {
        printMessage: (message) => endInkWithError(printHost.root, message),
      }),
    });
    mcpApprovalState = {
      root: printHost.root,
      getFpsMetrics: printHost.getFpsMetrics,
      stats: printHost.stats,
    };
    mcpApprovalSkipWarning = printHost.mcpApprovalSkipWarning;
    config = printHost.dynamicMcpConfig;
    commands_2 = printHost.commands;
    remoteControl = printHost.remoteControl;
    inputPrompt = printHost.inputPrompt;
    typedName = printHost.prompt;
    mcpConfigsPromise = printHost.mcpConfigPromise;
    let settledMode = settleProvisionalStartupMode(toolPermissionContext, {
      onNotification: (notice) => {
        defaultMode ??= notice;
      },
    });
    if (settledMode !== toolPermissionContext) {
      toolPermissionContext = settledMode;
      initialMode = settledMode.mode;
    }
  }
  defaultMode ??= levelAutoHeldForPendingVerdictNotice();
  if (process.exitCode !== undefined) {
    logForDebugging("Graceful shutdown initiated, skipping further initialization");
    return {
      kind: "exited",
    };
  }
  if (canSkipGrowthBookHold(rootSession, skillsSyncFlag))
    maybeStartLazyLoad(rootSession, storageV5, extraOptions);
  initializeLspServerManager(rootSession, storageV5, extraOptions);
  if (mcpApprovalState) {
    let { errors } = getSettingsWithErrors_2();
    let reportable = isReportableDiagnostic(errors);
    if (reportable.length > 0 && (!isInteractiveSession() || !args.handleInvalidSettings))
      logSkippedInvalidSetting(reportable);
    else if (reportable.length > 0 && args.handleInvalidSettings) {
      if ((await args.handleInvalidSettings(mcpApprovalState.root, reportable)) === "fix") {
        let { buildSettingsFixPrompt } = await import("../../utils/settings/settingsFixPrompt.js");
        let settingsFixPrompt = buildSettingsFixPrompt(reportable, {
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
    let needsPrefetch =
      startupPrefetchedAt > 0
        ? ` last ran ${Math.round((Date.now() - startupPrefetchedAt) / 1000)}s ago`
        : "";
    logForDebugging(`Starting background startup prefetches${needsPrefetch}`);
    probeQuotaStatusAtStart(extraOptions, storageV5).catch((error) => logError(error));
    trackClientDataFetch(fetchBootstrapData(storageV5, extraOptions));
    prefetchEligibilityIfNeeded(extraOptions, storageV5);
    prefetchFastModeStatus(storageV5, extraOptions);
    if (featureValue_CACHED_MAY_BE_STALE > 0)
      saveGlobalConfig(
        (config) => ({
          ...config,
          startupPrefetchedAt: Date.now(),
        }),
        storageV5,
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
      trackClientDataFetch(fetchBootstrapData(storageV5, extraOptions));
    initFastModeOrgStatusGuess();
  }
  mcpConfigsPromise = mcpConfigsAfterWaits(mcpConfigsPromise, enterpriseHeld, () =>
    enterpriseGate.then(() =>
      getClaudeCodeMcpConfigs(config, {
        storageV5,
        credentials: extraOptions,
      }),
    ),
  );
  let { servers } = await mcpConfigsPromise;
  logForDebugging(
    `[STARTUP] MCP configs resolved in ${prefetchTiming.value}ms (awaited at +${Date.now() - now}ms)`,
  );
  config = applyAgentModelOverride(config, mainThreadAgentDefinition, {
    strictMcpConfig,
    onBlocked: (issues) =>
      warnStartupIssues(
        `agent frontmatter MCP ${plural(issues.length, "server")} blocked by enterprise policy: ${issues.join(", ")}`,
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
  let trustedBefore = false;
  if (Object.keys(config).length > 0 || trustedBefore)
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
    if (sdkNonInteractive || !headlessSyncsClaudeAiConnectors()) markConnectorListUnavailable();
    else if (filterDynamicMcpServersByPolicy(config).held.length > 0) await mcpReady.catch(() => ({}));
  }
  let { configs, blocked } = filterDynamicMcpServersByPolicy(config);
  let { allowed, blocked: blocked_2 } = filterMcpServersByPolicy(servers);
  let allBlocked = [...blocked, ...blocked_2];
  if (allBlocked.length > 0) {
    logForDebugging(
      `MCP ${plural(allBlocked.length, "server")} blocked by enterprise policy before prefetch: ${allBlocked.join(", ")}`,
      {
        level: "warn",
      },
    );
    if (allBlocked.includes(CLAUDE_IN_CHROME_MCP_SERVER_NAME)) {
      markClaudeInChromeUnwired();
      commands_2 = commands_2.filter(
        (command) =>
          !(
            command.name === CLAUDE_IN_CHROME_MCP_SERVER_NAME &&
            command.type === "prompt" &&
            command.source === "bundled"
          ),
      );
    }
  }
  let allConfigs = {
    ...allowed,
    ...configs,
  };
  let refusedNames = Object.create(null);
  let byName = {};
  for (let [key, value] of Object.entries(allConfigs)) {
    let optionValue = value;
    if (optionValue.type !== "sdk") byName[key] = optionValue;
    else if (isFirstPartyUploadScope(optionValue)) refusedNames[key] = optionValue;
    else
      logForDebugging(`MCP server "${key}" dropped: an sdk entry outside the SDK host's channel`, {
        level: "warn",
      });
  }
  if (env.CLAUDE_CODE_REMOTE && getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_startup_policy_seed", true))
    toolPermissionContext = applyDynamicServerToolPolicies(toolPermissionContext, configs);
  addStartupContext({
    mcp_server_count: Object.keys(allConfigs).length,
  });
  profileCheckpoint("action_mcp_configs_loaded");
  let switchTracker = trackSessionSwitches({
    permissionMode: initialMode,
    dangerouslySkipPermissionsPassed: dangerouslySkipPermissions ?? false,
    modeIsBypass: initialMode === "bypassPermissions",
    print: print ?? false,
  });
  maybeSwitchSessionForResume({
    resume: options.resume,
    forkSession: options.forkSession,
    hasSessionIdFlag: !!sessionId,
  });
  artifactTelemetryHold?.flush();
  let remoteDroppedMcpMessages = getIsRemoteMode()
    ? mcpConfigIgnoredOnCloud({
        mcpConfigFlagServers: ownedConfigs,
        agent: mainThreadAgentDefinition,
        chromeFlag: opts.chrome,
        dynamicMcpConfig: config,
      })
    : [];
  let resolved = Promise.resolve({
    clients: [],
    tools: [],
    commands: [],
  });
  let mcpClients = isNonInteractiveSession
    ? Promise.resolve({
        clients: [],
        tools: [],
        commands: [],
      })
    : mcpReady.then((prefetched) =>
        Object.keys(prefetched).length > 0
          ? prefetchAllMcpResourcesSafe(prefetched, storageV5, extraOptions)
          : {
              clients: [],
              tools: [],
              commands: [],
            },
      );
  let allReady = Promise.all([resolved, mcpClients]).then(([agents, mcp]) => ({
    clients: [...agents.clients, ...mcp.clients],
    tools: uniqByExport([...agents.tools, ...mcp.tools], "name"),
    commands: uniqByExport([...agents.commands, ...mcp.commands], "name"),
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
            storageV5,
            credentials: extraOptions,
          }),
        );
  allReady.catch(() => {});
  let mcpClients_2 = [];
  let mcpTools = [];
  let mcpCommands = [];
  let thinkingState;
  let adaptiveThinking = false;
  if (options.thinking === "adaptive" || options.thinking === "enabled") {
    thinkingState = {
      type: "adaptive",
    };
    adaptiveThinking = true;
  } else if (options.thinking === "disabled") {
    thinkingState = {
      type: "disabled",
    };
    adaptiveThinking = true;
  } else {
    let maxThinkingTokens = process.env.MAX_THINKING_TOKENS
      ? parseIntLoose(process.env.MAX_THINKING_TOKENS)
      : options.maxThinkingTokens;
    if (maxThinkingTokens !== undefined) {
      if (maxThinkingTokens > 0) {
        thinkingState = {
          type: "enabled",
          budgetTokens: maxThinkingTokens,
        };
        adaptiveThinking = true;
      } else if (maxThinkingTokens === 0) {
        thinkingState = {
          type: "disabled",
        };
        adaptiveThinking = true;
      }
    }
  }
  thinkingState ??= isBetaHeaderAllowed()
    ? {
        type: "adaptive",
      }
    : {
        type: "disabled",
      };
  let thinkingEnabled = thinkingState.type !== "disabled";
  let thinkingDisplay = isThinkingDisplayMode(options.thinkingDisplay) ? options.thinkingDisplay : undefined;
  if (thinkingState.type !== "disabled") {
    if (thinkingDisplay) setThinkingDisplayExplicit(true);
    let isNonInteractive = getIsNonInteractiveSession();
    let outputFormat_2 = outputFormat ?? "text";
    let thinkingDisplay_2 = resolveThinkingDisplay({
      explicitDisplay: thinkingDisplay,
      isNonInteractive,
      outputFormat: outputFormat_2,
      verbose,
    });
    if (thinkingDisplay_2) thinkingState.display = thinkingDisplay_2;
    if (
      thinkingDisplay_2 === "omitted" &&
      suppressesThinkingDisplay({
        isNonInteractive,
        outputFormat: outputFormat_2,
        verbose,
      })
    )
      thinkingState.displayExplicit = false;
  } else if (
    suppressesThinkingDisplay({
      isNonInteractive: getIsNonInteractiveSession(),
      outputFormat: outputFormat ?? "text",
      verbose,
    })
  ) {
    thinkingState.display = "omitted";
    thinkingState.displayExplicit = false;
  }
  logStartupStarted();
  startWatchdogSafe();
  registerCleanup(async () => {
    logForDiagnosticsNoPII("info", "exited");
  });
  mergeSessionFlags({
    permissionMode: initialMode,
    bypassPermissionsAvailable: toolPermissionContext.isBypassPermissionsModeAvailable,
  });
  setSessionFlagReaders({
    isEgressRestricted: isSandboxEgressRestricted,
    isHostAllowlistEnforced: isSandboxHostAllowlistEnforced,
    areUnsandboxedCommandsAllowed: () => SandboxManager.areUnsandboxedCommandsAllowed(),
    isToolSandboxActive,
  });
  if (permissionCtx)
    logProactivityStartup({
      ...permissionCtx,
      entryMode: initialMode,
      entryModeDecidedByLevel: proactivity_2?.startupModeDecidedByProactivityLevel !== undefined,
    });
  let attachCheck =
    cloudAttachId === null &&
    poolId === null &&
    remote === null &&
    !getIsRemoteMode() &&
    projectBrowse === null;
  let modelProvenance = !attachCheck
    ? undefined
    : cloudAttachCheck
      ? modelAttributionFields()
      : RESUME_MODEL_ATTRIBUTION;
  let focusedVerbose = !isNonInteractiveSession && !verbose && focusMode;
  logTenguInit({
    host: rootSession.host,
    storageV5,
    credentials: extraOptions,
    onAntSandboxDetection: switchTracker.updateContext,
    hasInitialPrompt: Boolean(typedName),
    hasStdin: Boolean(inputPrompt),
    verbose,
    focusView: focusedVerbose,
    debug,
    print: print ?? false,
    outputFormat: outputFormat ?? "text",
    inputFormat: inputFormat ?? "text",
    numAllowedTools: allowedTools.length,
    numDisallowedTools: disallowedTools.length,
    restricted,
    mcpClientCount: Object.keys(allConfigs).length,
    mcpListSizing: mcpAnalytics,
    mcpConfigs: getIsRemoteMode() ? null : Object.values(allConfigs),
    worktreeEnabled: worktreeRequested,
    skipWebFetchPreflight: getInitialSettings_2().skipWebFetchPreflight,
    githubActionInputs: env.GITHUB_ACTION_INPUTS,
    dangerouslySkipPermissionsPassed: dangerouslySkipPermissions ?? false,
    permissionMode: initialMode,
    proactivityLevel: permissionCtx?.level,
    modeIsBypass: initialMode === "bypassPermissions",
    allowDangerouslySkipPermissionsPassed: allowDangerouslySkipPermissions,
    skipDangerousModePromptSetPreDialog,
    systemPromptFlag: systemPrompt_2 ? (options.systemPromptFile ? "file" : "flag") : undefined,
    appendSystemPromptFlag: options.appendSystemPrompt
      ? "flag"
      : options.appendSystemPromptFile
        ? "file"
        : undefined,
    thinkingConfig: thinkingState,
    modelProvenance,
    runsLocalQueryLoop: attachCheck,
  });
  if (!getIsRemoteMode() && !isParkedSpare())
    logContextMetrics(rootSession, byName, toolPermissionContext, getTools, storageV5, extraOptions).catch(
      (error) => logError(withTelemetryMessage(toError(error), "context metrics failed")),
    );
  let parked = false;
  let registerName = async () => {
    if (parked) return;
    parked = true;
    logShellAllowRulesAtInit(toolPermissionContext.alwaysAllowRules);
    logManagedSettingsLoaded();
    await noopAsync_3(null, "initialization");
  };
  if (isNonInteractiveSession)
    holdForStartupWork(rootSession.host, "permission_context_log", () => {
      registerName().catch(logError);
    });
  else {
    withTimeout_2(rootSession).then(registerName).catch(logError);
    registerCleanup(() => registerName().catch(logError));
  }
  createManagedSettingsReporter();
  getSessionRegistryState().restoreSetAsideName = (uuid, name) => {
    reclaimSessionNameOnResume(uuid, storageV5, {
      autoOnly: name === "auto",
      source: name,
      yieldToLaterRestore: true,
    });
  };
  (isParkedSpare() ? Promise.resolve(false) : registerSession(storageV5)).then((session) => {
    if (!session) return;
    let sessionId = getSessionId();
    claimSessionNameAtStartup({
      sessionNameArg: explicitName,
      sessionNameArgSource: envSessionKind() === undefined ? "user" : "peer",
      interactive: envSessionKind() === undefined && !getIsNonInteractiveSession(),
      writeName: async (uuid, name) => {
        await updateSessionName(
          uuid,
          storageV5,
          name,
          name === "collision" ? getRegisteredSessionName()?.givenAtLaunch : true,
        );
      },
      onRenamed: (uuid, name) => {
        let title = sanitizeSessionTitle(uuid);
        if (getSessionId() !== sessionId) return;
        if (title && titleCacheStillOn(sessionId, name, title)) {
          cacheSessionTitle(title);
          cacheAgentName(title);
        }
      },
    });
    countConcurrentSessions(storageV5).then((count) => {
      if (count >= 2)
        logEvent("tengu_concurrent_sessions", {
          num_sessions: count,
        });
    });
  });
  if (isBareMode());
  else {
    holdForStartupWork(rootSession.host, "plugin_init", (result) => {
      if (result === "shutdown") return;
      initPluginsAtStartup({
        deferToCleanup: isNonInteractiveSession,
        storageV5,
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
      storageV5,
      credentials: extraOptions,
    });
    await runStartupHooks(rootSession, {
      kind: "session-start",
      source: "startup",
      forceSyncExecution: true,
      storageV5,
      credentials: extraOptions,
    });
    gracefulShutdownSync(0);
    return {
      kind: "exited",
    };
  }
  let limits = {
    allowedTools,
    appendSystemPrompt: appendSystemPrompt_2,
    appendSystemPromptCli: appendSystemPrompt,
    appendSystemPromptHead,
    asWrittenMcpEntries: sdkConfigs,
    claudeaiConfigPromise: mcpReady,
    cliAgents,
    credentials: extraOptions,
    currentCwd: sessionCwd,
    debug,
    jsonSchema,
    sdkUrl,
    sessionMirror,
    systemPrompt: systemPrompt_2,
    systemPromptCli: systemPrompt,
    thinkingConfig: thinkingState,
    thinkingConfigExplicit: adaptiveThinking,
    thinkingDisplayFlag: thinkingDisplay,
    thinkingEnabled,
    advisorModel: advisorState,
    agentCli: agent,
    agentDefinitions,
    agentSetting,
    autoCompactWindow: windowArg,
    cloudAttachId,
    commands: commands_2,
    correlationId,
    dangerouslySkipPermissions,
    deferredCommandsPromise,
    disableSlashCommands,
    dynamicMcpConfig: config,
    earlyHydrateReads,
    earlyRemoteLink,
    effectiveForwardSubagentText: forwardSubagent,
    effectiveIncludePartialMessages: partialMessages,
    effectiveModel,
    effectiveReplayUserMessages: replaysMessages,
    fileDownloadPromise,
    headlessCloud,
    headlessCloudPrint,
    ide,
    initialFocusView: focusedVerbose,
    initialMainLoopModel,
    inputPrompt,
    isNonInteractiveSession,
    mainThreadAgentDefinition,
    mcpApprovalSkipWarning,
    mcpClients: mcpClients_2,
    mcpCommands,
    mcpConfigFlagServers: ownedConfigs,
    mcpConfigOwnership: ownership,
    mcpTools,
    modelCli: model,
    modelProvenance,
    outputFormat,
    permissionModeCli: startupPermissionMode,
    permissionModeNotification: defaultMode,
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
    regularMcpConfigs: byName,
    relaunchFlagFetchSettled: shouldKick && initResult !== undefined && !initResult.result.timedOut,
    remote,
    remoteControl,
    remoteControlName,
    resumeInCloud,
    serveOnly,
    defaultedToCloud: cloudApplied,
    cloudDefaultNotAllowed: cloudNotAllowed,
    personalWithoutEffectNotification,
    cloudSessionsByDefault,
    sandboxVmStayReason,
    remoteDroppedMcpMessages,
    resolvedInitialModel,
    resolvedMaxTurns,
    restrictedModel,
    sdkBetas: allowedBetas,
    sdkMcpConfigs: refusedNames,
    session: rootSession,
    sessionGroupingId,
    sessionNameArg: explicitName,
    sessionStartHooks,
    sessionTeamContext: sessionTeam,
    setupTrigger,
    storageV5,
    strictMcpConfig,
    structuredOutputTool,
    teleport,
    toolPermissionContext,
    tools: tools_2,
    unknownModelWindow,
    securityWarnings: inheritedDirs,
    userSpecifiedFallbackModel: fallbackModels,
    verbose,
    wasPersistedTrustedBeforeSetup,
    wasTrustedBeforeSetup,
  };
  if (!mcpApprovalState)
    return {
      kind: "prepared-headless",
      ...limits,
      orgValidation,
    };
  return {
    kind: "prepared-interactive",
    ...limits,
    ...mcpApprovalState,
    terminalInput: stdinOverrideCache.get(),
  };
}
//@ chunk-3wek6r2k.js:148438-148567 placement
function readSizingReport(report) {
  try {
    return report();
  } catch (error) {
    logForDebugging(`Managed settings: a sizing report could not be read: ${errorMessage(error)}`, {
      level: "error",
    });
    return;
  }
}
export {
  coordinatorModeModule,
  branchModeForTelemetry,
  startTurnInputPrefetches,
  startIdleStartupWork,
  logSessionTelemetry,
  judgeStartupGrowthBookKick,
  prepareSession,
  getTeammateUtils,
  maybeActivateBrief,
  reportStartupModelNotice,
  startDeferredPrefetches,
  pendingSettingsEnvBlocksEarlyGb,
};
