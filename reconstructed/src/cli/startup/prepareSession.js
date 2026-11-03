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
import { resolve, resolve as resolve_2, resolve as resolve_3, resolve as resolve_4 } from "path";
import { readFile, readFile as readFile_2, stat, realpath } from "fs/promises";
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
  sro,
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
import { _Ys } from "../../plugins/functionHooks/pluginLifecycle.js";
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";
import { isBareMode, isSafeMode, getMaxTurnsFromEnv, parseIntLoose } from "../../utils/envUtils.js";
import { fue } from "../../utils/skills/skillChangeDetector.js";
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
import { Hki } from "../../utils/telemetry/memorySummary.js";
import {
  getMemoryPeaks,
  markCcrInjectedConfig,
  filterObject,
  X4,
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
import { af } from "../../utils/plugins/pluginPolicy.js";
import {
  buildPluginCommandTelemetryFields,
  logPluginLoadFailed,
  logPluginsEnabledForSession,
  lri,
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
import { oOt } from "../../utils/settings/policyHelper/helperRemote.js";
import {
  startupFlagWaitBudget,
  uie,
  startupGrowthBookKickOutcome,
  waitForInitialize,
  startupFlagWaitPoint,
  qM,
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
import { Aei } from "../../history.js";
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
import { clearMemoryFilesCacheForHost, VGt } from "../../utils/claudemd.js";
import { or } from "../../utils/settings/commandSyncNames.js";
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
import { dFe } from "../../utils/focusMode.js";
import { resolveSetting } from "../../utils/settings/userIntentSettings.js";
import { announceScreenReaderMode } from "../../utils/accessibility/screenReader.js";
import { MYs, reportEnvWindow } from "../../services/compact/autoCompactWindow.js";
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
import { lTt } from "../../utils/permissions/sensitivePaths.js";
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
import { unr } from "../../services/cloudSessions/cloudSessionsPolicy.js";
import { forgetLauncherHostLoginForCloud, joinPromptAppend, runStartupHooks } from "./launcherHostLogin.js";
import { IFs } from "../../utils/stubs.js";
import { parseWatchArtifactArg, setPendingWatchArtifact } from "../watchArtifactArgs.js";
import { Vt } from "../../utils/agentId.js";
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
import { eyi, Br, Jhi, Xhi } from "../../utils/startupTiming.js";
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
import { Zl, registerCliOwnedConfig } from "../../services/mcp/cliOwnedClients.js";
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
import { Jqr, qti } from "../../utils/nativeInstaller/installer.js";
import { getProviderState } from "../../utils/model/providerCaches.js";
import { cliCarriesSessionConfig, cliCarriesForkRestrictedConfig } from "../../utils/sessionConfigFlags.js";
import { Z_e, NONE, i8n } from "../../utils/permissions/permissionPromptHost.js";
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
import { jwi } from "../../services/ccrAgentProxy/agentProxy.js";
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
  j1t,
  primeSkillsListAskConversion,
  bet,
} from "../../utils/claudeAiSync/skillsSync.js";
import { startEarlySkillsSync, lLe, pruneSkillsSyncRoot } from "../../services/skillsSync/skillsSync.js";
import { lZs, refreshMemoryContext, yVo } from "../../services/accountMemory/memoryContext.js";
import { oRe } from "../../utils/shutdown/pendingWrites.js";
import { warmCommandSourceCaches, getCommands, isSkillToolCommand } from "../../commands.js";
import { applyConfigEnvironmentVariables } from "../../utils/managedEnvApply.js";
import { startKeptProjectDetail } from "../../services/projects/projectContext.js";
import { ensureModelStringsInitialized } from "../../utils/model/modelStrings.js";
import { clearSkillCaches } from "../../skills/loadSkillsDir.js";
import { _rr, hii } from "../../services/plugins/accountSync/syncedPluginHooks.js";
import {
  isAppliedListCurrent,
  pruneSyncedPluginsForClosedGate,
  completeDeferredRemovals,
} from "../../utils/claudeAiSync/pluginsSync.js";
import { syncClaudeAiMarketplaces } from "../../utils/plugins/claudeAiMarketplacesSync.js";
import { isXtermJs } from "../../ink/terminal.js";
import { cAi } from "../../ink/colorize.js";
import { CLAUDE_AGENT } from "../../tools/AgentTool/built-in/claudeAgent.js";
import { findAgentExcludingWebFetch } from "../../tools/WebFetchTool/harnessNotes.js";
import { isCoworkAny } from "../../utils/entrypointKinds.js";
import { withAgentDisallowedTools } from "../../tools/AgentTool/agentToolUtils.js";
import { checkSchemaSatisfiable } from "../../tools/SyntheticOutputTool/schemaCheck.js";
import { applyClientDataToSession, checkClientDataModelEntry } from "../../services/clientDataUrl.js";
import { collectModelOverrides, applyAgentModelOverride } from "../../utils/model/modelOverrideNotices.js";
import { managedDenyStartupRefusal } from "../../utils/model/modelAllowlist.js";
import { b8s } from "../../utils/model/dynamicModelConfig.js";
import { JEi } from "../../utils/model/modelUnavailability.js";
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
import { Bn } from "../../utils/model/modelIds.js";
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
import { Lgt } from "../../screens/Doctor.js";
import { logSkippedInvalidSetting } from "../../utils/settings/settingsErrorsHeadless.js";
import { Tdi, trackClientDataFetch } from "../../bridge/bridgeEnabled.js";
import { probeQuotaStatusAtStart } from "../../services/claudeAiLimits.js";
import { fetchBootstrapData, bootstrapFetchCanConvergeSlot } from "../../services/api/bootstrap.js";
import { prefetchFastModeStatus, initFastModeOrgStatusGuess } from "../../utils/fastMode.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { shouldWireHostedDesktopComputerUse } from "../../utils/computerUse/hostedDesktop.js";
import { getHostedDesktopComputerUseConfig } from "../../services/mcp/client.js";
import { qkt } from "../../services/mcp/fileReference/fileReferencePolicy.js";
import { applyDynamicServerToolPolicies } from "../../services/mcp/mcpStringUtils.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
import { hookSourcesSummary } from "../../utils/hooks/hookSources.js";
import { startHookRun } from "../../utils/sessionStart.js";
import { isThinkingDisplayMode } from "../../entrypoints/sdk/coreSchemas.js";
import { resolveThinkingDisplay, fno } from "../../utils/thinking.js";
import { j8s } from "../../utils/resourceWatchdog.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { mergeSessionFlags, Lci } from "../../services/api/sessionFlags.js";
import {
  isSandboxEgressRestricted,
  isSandboxHostAllowlistEnforced,
  SandboxManager,
  isToolSandboxActive,
} from "../../utils/sandbox/sandbox-adapter.js";
import { logContextMetrics, withTimeout as withTimeout_2 } from "../../utils/api.js";
import { getTools } from "../../tools.js";
import { D0s } from "../../utils/permissions/shellAllowRuleTelemetry.js";
import { Omn } from "../../services/compact/compact.js";
import { createManagedSettingsReporter } from "../../services/remoteManagedSettings/managedSettingsTelemetry.js";
import { reclaimSessionNameOnResume, claimSessionNameAtStartup } from "../../utils/sessionNameUniqueness.js";
import { gracefulShutdownSync } from "../../utils/gracefulShutdown.js";

//@ chunk-3wek6r2k.js:95105-95186 placement
function summarizeFlagSettingsForLogging(e, o) {
  let n = getClientSurface_2(e, o);
  return { flag_count: n.length, flags: fromSanitizer_SANITIZER_OUTPUT_ONLY(n.join(",")) };
}
//@ chunk-3wek6r2k.js:95186-95378 placement
function prefetchAllMcpResourcesSafe(e, o, n) {
  try {
    let { prefetchAllMcpResources: prefetchAllMcpResources } =
      require("./chunk-asne9cp8.js").mcpClientModule();
    return prefetchAllMcpResources(e, o, n);
  } catch (error) {
    return (logError(error), Promise.resolve({ clients: [], tools: [], commands: [] }));
  }
}
/**
 * main.tsx 的懒加载模块句柄：teammate 工具、teammate 提示补充、teammate 模式快照、协调者模式、制品启动等。
 */
//@ chunk-3wek6r2k.js:95378-95608 placement
var getTeammateUtils = () => require("./chunk-7tqwkdxc.js"),
  teammatePromptAddendumModule = () => require("./chunk-8b9d5hx8.js"),
  teammateModeSnapshotModule = () => require("./chunk-s90rfvdh.js"),
  coordinatorModeModule = require("./chunk-yxywkh50.js"),
  routineStartupModule = null,
  artifactStartupModule = require("./chunk-tbts81qj.js"),
  ccrArtifactsEntryModule = require("./chunk-vtyyqz9q.js");
//@ chunk-3wek6r2k.js:95608-95646 placement
var artifactsMcpLaptopModule = require("./chunk-d5fbj7hf.js");
/**
 * 托管设置（policySettings）存在时上报 tengu_managed_settings_loaded，并对未生效的 MCP 策略键、被忽略的 policyHelper 打警告。
 */
//@ chunk-3wek6r2k.js:95646-96816 placement
function logManagedSettingsLoaded() {
  try {
    let e = getSettingsForSource("policySettings");
    if (e) {
      let o = getPolicyEnvCompositionForLogging(),
        n = getShadowedMcpPolicySources(),
        r = readSizingReport(getManagedFileProtectionForLogging),
        u = readSizingReport(machineAdminPolicyState),
        p = readSizingReport(machineProviderEnv);
      if (
        (logEvent("tengu_managed_settings_loaded", {
          ...logManagedSettings(e),
          ...(r && { managedFileProtection: fromEnum(r.protection), managedFileSetsOrgPin: r.setsOrgPin }),
          ...(u && {
            machineDocumentUnread: fromEnum(u.cause),
            machineSetsSignInPin: u.machineSetsSignInPin,
          }),
          ...(p && {
            remoteIneligibilityAuthor: fromEnum(p.author),
            forcedRefreshFromMachine: p.forcedRefreshFromMachine,
          }),
          ...(o && {
            envUnionOptedOut: o.unionOptedOut,
            envUnionChanged: o.unionChangedEnv,
            remoteTierPresent: o.remoteTierPresent,
            mdmTierPresent: o.mdmTierPresent,
            fileTierPresent: o.fileTierPresent,
            adminTierCount: o.adminTierCount,
            tiersWithEnv: o.tiersWithEnv,
          }),
          ...getMcpPolicyCompositionForLogging(n),
        }),
        n.length > 0)
      )
        logForDebugging(
          `managed settings: MCP policy keys in ${n.map(({ source: source }) => MANAGED_SOURCE_NOTICE_LABELS[source]).join(", ")} not applied: not the managed settings source that applies for them (/status names the keys)`,
          { level: "warn" },
        );
      let h = getShadowedPolicyHelperSources();
      if (h.length > 0)
        (logForDebugging(
          `policyHelper: helper configuration in ${h.map((S) => MANAGED_SOURCE_NOTICE_LABELS[S]).join(", ")} ignored under managedSourcesBehavior "merge"; helpers are read from the highest managed settings source only`,
          { level: "warn" },
        ),
          logFeatureSad("settings_policy_helpers_per_os", "lower_source_helper_shadowed"));
    }
    logManagedDocumentLinks();
  } catch {}
}
/**
 * --brief 或 CLAUDE_CODE_BRIEF：有权限时启用 SendUserMessage（brief 模式），上报 tengu_brief_mode_enabled。
 */
//@ chunk-3wek6r2k.js:99424-99642 placement = maybeActivateBrief (0.909)
function maybeActivateBrief(options) {
  let briefFlag = options.brief,
    CLAUDE_CODE_BRIEF = env.CLAUDE_CODE_BRIEF;
  if (!briefFlag && !CLAUDE_CODE_BRIEF) return;
  let { isBriefEntitled: isBriefEntitled } = require("./chunk-cv3kgbt2.js"),
    entitled = isBriefEntitled();
  if (entitled) setUserMsgOptIn(!0);
  logEvent("tengu_brief_mode_enabled", {
    enabled: entitled,
    gated: !entitled,
    source: fromEnum(CLAUDE_CODE_BRIEF ? "env" : "flag"),
  });
}
//@ chunk-3wek6r2k.js:101033-101113 placement
function startDeferredPrefetches(e, o, n, { userContext: r = !0 } = {}) {
  (startTurnInputPrefetches(e, o, n, { userContext: r }), startIdleStartupWork(e, o, n));
}
/**
 * 首屏渲染后的延迟预取：用户上下文、系统上下文、Bedrock/Vertex/Mantle 等云凭证、模型能力、文件变更检测器等。
 */
//@ chunk-3wek6r2k.js:101178-101818 placement = startDeferredPrefetches (0.413)
function startTurnInputPrefetches(e, o, n, { userContext: userContext = !0 } = {}) {
  if (useAfterFirstRender()) return;
  if ((sro(), !isParkedSpare())) {
    if (userContext) getOrBuildUserContext(e, o, n);
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
  (primeModelCapabilities(o),
    primeGatewayModels(o),
    refreshServedModelCapabilities(o, n),
    discoverGatewayModels(o),
    startServedCatalog({ allowNetwork: !0 }),
    startServedCatalogShadow({ allowNetwork: shouldFetchServedCatalog() }));
  let p = configChangeBlocker(e, o, n);
  if (
    (_Ys(p),
    settingsChangeDetector.initialize(p, o),
    !isBareMode() && !getIsRemoteMode() && !getDisableSlashCommands())
  )
    fue.initialize(p, o);
}
//@ chunk-3wek6r2k.js:101818-102267 placement
function startIdleStartupWork(e, o, n) {
  if (useAfterFirstRender()) return;
  if (!getIsNonInteractiveSession())
    import("./chunk-4t8fx0s8.js")
      .then(({ getRelevantTips: getRelevantTips }) =>
        getRelevantTips({
          session: getRootSession(),
          theme: "dark",
          ...(o && { storageV5: o }),
          ...(n && { credentials: n }),
        }),
      )
      .catch((r) => logError(withTelemetryMessage(toError(r), "tip prewarm failed")));
  if (!env.CLAUDE_CODE_REMOTE && !isParkedSpare()) countFilesRounded(getCwd(), AbortSignal.timeout(3000), []);
  if ((prefetchOfficialMcpUrls(), getFeatureValue_CACHED_MAY_BE_STALE("tengu_drift_lantern", !1)))
    import("./chunk-d33z3ny7.js").then((r) =>
      r.startEventLoopStallDetector(e.host, { attributeSigcont: !getIsNonInteractiveSession() }),
    );
  if (hasEmbeddedSearchTools_2()) Hki(getMemoryPeaks);
}
/**
 * 会话启动时的插件遥测：cacheOnly 加载插件，预取 MCP/LSP 配置，记录启用插件与错误。名字配错，见 lead 建议。
 */
//@ chunk-3wek6r2k.js:102267-102733 placement = extractLspServersFromPlugins (0.269)
function logSessionTelemetry(e, o, n) {
  let r = parseUserSpecifiedModel(getInitialMainLoopModel() ?? getDefaultMainLoopModel()),
    u = [getCwd(), getContextWindow(r, getSdkBetas()), bytesPerTokenForModel(r), e, n !== void 0],
    p = n === void 0 ? logStartupCommandTelemetry(...u) : n.then(() => logStartupCommandTelemetry(...u));
  return loadAllPluginsCacheOnly(e, o)
    .then(async ({ enabled: enabled, errors: errors }) => {
      let y = af();
      (buildPluginCommandTelemetryFields(enabled, y),
        await Promise.all(
          enabled.map(async (E) => {
            if ((await extractMcpServersFromPlugins(E, [], e), !E.lspServers)) {
              let w = await loadPluginLspServers(E, [], e);
              if (w) E.lspServers = w;
            }
          }),
        ),
        logPluginLoadFailed(errors, y, { cacheOnly: !0 }),
        logRegisteredHooks(enabled, y));
      let M = await p;
      logPluginsEnabledForSession(enabled, y, getPluginSeedDirs(), M, e);
    })
    .catch((h) => logError(withTelemetryMessage(toError(h), "plugin session telemetry load failed")))
    .then(async () => {
      await p;
    });
}
//@ chunk-3wek6r2k.js:102733-102792 placement
function branchModeForTelemetry(e, o) {
  return fromEnum(e ? "on_branch" : o ? "ref" : "default");
}
//@ chunk-3wek6r2k.js:102792-102852 placement
function pendingSettingsEnvBlocksEarlyGb(e) {
  if (computeRemoteSettingsEligibility() && !isRemoteManagedSettingsVerified() && !hasManagedSettings())
    return !0;
  return hasRepoSettingsEnv(e);
}
//@ chunk-3wek6r2k.js:102852-103020 placement
function shouldHoldEarlyGrowthBook(env_2) {
  let o = getLastLoadStatus();
  return env.CLAUDE_CODE_CCR_EARLY_SYNC_AFTER_SETTINGS_REFUSAL &&
    hasLoadCycleEnded() &&
    o?.state === "failed" &&
    o.failure.errorKind === "http_403" &&
    !oOt()
    ? hasRepoSettingsEnv(env_2)
    : pendingSettingsEnvBlocksEarlyGb(env_2);
}
//@ chunk-3wek6r2k.js:103020-103126 placement
function judgeGrowthBookKick(e) {
  return startupFlagWaitBudget({
    eventLoggingEnabled: is1PEventLoggingEnabled(),
    growthBookEnabled: isGrowthBookEnabled(),
    cacheEmpty: isGrowthBookCacheEmpty(),
    relaunches: e,
  });
}
//@ chunk-3wek6r2k.js:103126-103179 placement
function Sl(e) {
  return e && getFeatureValue_CACHED_MAY_BE_STALE("tengu_sleepy_rabbit", !1);
}
//@ chunk-3wek6r2k.js:103179-103441 placement
function judgeStartupGrowthBookKick(e, o) {
  let n = getIsNonInteractiveSession(),
    r = n && uie(),
    u = n ? judgeGrowthBookKick(r) : void 0,
    p = u !== void 0 && isGrowthBookCacheEmpty(),
    h = u !== void 0 && !p && ((r && env.CLAUDE_CODE_GROWTHBOOK_KICK_ON_WARM_CACHE) || Sl(r));
  return startupGrowthBookKickOutcome({
    site: e,
    nonInteractive: n,
    budgetMs: u,
    settingsEnvPending: (p || h) && pendingSettingsEnvBlocksEarlyGb(o),
    cacheEmpty: p,
    warmCacheKick: h,
  });
}
//@ chunk-3wek6r2k.js:103441-103747 placement
function reportStartupModelNotice(
  e,
  { key: key, outputFormat: outputFormat, debugLine: debugLine = e, onStderrToo: onStderrToo = !1 },
) {
  if (
    !getIsNonInteractiveSession() ||
    (outputFormat !== "json" && outputFormat !== "stream-json" && env.CLAUDE_CODE_SESSION_KIND !== "bg")
  ) {
    warnStartupIssues(e);
    return;
  }
  if ((logForDebugging(debugLine, { level: "warn" }), onStderrToo)) cliWarn(e);
  if (outputFormat === "stream-json" && !isPlainNonInteractive())
    enqueueTaskNotification({
      type: "system",
      subtype: "notification",
      key: key,
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
/**
 * 根命令的 action 主体（prepareSession）：处理深链、--bare/--safe-mode、单词提示、权限与工具参数、读 stdin 提示（getInputPrompt），调用 setup()，加载命令/工具/MCP/插件与 SessionStart 钩子，返回 prepared-headless（-p）或 prepared-interactive。
 */
//@ chunk-3wek6r2k.js:104371-148438 placement
async function prepareSession(e, o, n, r, u, p, h, S, y) {
  if (
    (profileCheckpoint("action_handler_start"),
    consumeBridgeMcpCarrierMarker(),
    Aei(S),
    !getIsNonInteractiveSession())
  ) {
    let s = require("./chunk-pky8b2sx.js");
    s.startPreviewBrowserDiscovery();
  }
  if (o.deepLinkOrigin && o.prefillB64 !== void 0 && o.prefill === void 0)
    try {
      o.prefill = sanitizeDeepLinkQuery(o.prefillB64);
    } catch (error) {
      logForDebugging(`Ignoring invalid --prefill-b64: ${error instanceof Error ? error.message : error}`, {
        level: "error",
      });
    }
  if (o.deepLinkOrigin && o.deepLinkCwdB64 !== void 0)
    try {
      (validateDeepLinkCwd(o.deepLinkCwdB64),
        chdirAndSetCwd(o.deepLinkCwdB64),
        setOriginalCwd(getCwd()),
        setProjectRoot(getCwd()),
        clearProjectPathForConfigCache(),
        resetTrustDialogAcceptedCache(),
        clearMemoryFilesCacheForHost(),
        or(),
        clearPluginCache("deeplink: originalCwd changed"));
      let s;
      using C = { [Symbol.dispose]: () => s?.() };
      if (isStorageV5Enabled() && S !== void 0) s = await resetSettingsCacheWithBackendRead(S);
      if (r()) refillPluginLoadCacheOnly(S, "deeplink");
      if ((resetGitFileWatcher(), s !== void 0)) updateHooksConfigSnapshot({ userLayer: "retain" });
      else updateHooksConfigSnapshot();
      (getPlansDirectory.cache.clear?.(), primePlanSlugCollisions(S));
    } catch (error) {
      logForDebugging(
        `Ignoring invalid --deep-link-cwd-b64: ${error instanceof Error ? error.message : error}`,
        { level: "error" },
      );
    }
  if (o.bare) process.env.CLAUDE_CODE_SIMPLE = "1";
  if (isSafeMode())
    ((process.env.CLAUDE_CODE_SAFE_MODE = "1"),
      (process.env.CLAUDE_CODE_DISABLE_CLAUDE_MDS = "1"),
      logFeatureOk("startup_safe_mode"));
  let M;
  try {
    M = getMaxTurnsFromEnv(o.maxTurns);
  } catch (error) {
    return cliError(errorMessage(error));
  }
  if (e === "code")
    (logEvent("tengu_code_prompt_ignored", {}),
      warnStartupIssues("Tip: You can launch Claude Code with just `claude`"),
      (e = void 0));
  if (e && typeof e === "string" && !/\s/.test(e) && e.length > 0) {
    if (
      (logEvent("tengu_single_word_prompt", { length: e.length }),
      !o.print && !o.continue && !o.resume && /^[a-zA-Z][a-zA-Z-]*$/.test(e))
    )
      await suggestUnknownSubcommand(e, n);
  }
  let E;
  if (isAgentSwarmsEnabled() && !getIsNonInteractiveSession() && !o.agentId)
    try {
      let { initializeSessionTeam: initializeSessionTeam } = await import("./chunk-6cc2zqkz.js");
      E = await initializeSessionTeam(void 0, S);
    } catch (error) {
      logError(error);
    }
  if (!isFirstPartyTelemetryBlocked())
    logEvent(
      "tengu_cli_flags",
      summarizeFlagSettingsForLogging(o, (s) => n.getOptionValueSource(s)),
    );
  let {
    debug: debug = !1,
    dangerouslySkipPermissions: dangerouslySkipPermissions,
    allowDangerouslySkipPermissions: allowDangerouslySkipPermissions = !1,
    tools: tools = [],
    restricted: restricted = !1,
    allowedTools: allowedTools = [],
    disallowedTools: disallowedTools = [],
    mcpConfig: mcpConfig = [],
    permissionMode: permissionMode,
    inheritPermissionMode: inheritPermissionMode,
    proactivity: proactivity,
    addDir: addDir = [],
    fallbackModel: fallbackModel,
    betas: betas = [],
    ide: ide = !1,
    sessionId: sessionId,
    includeHookEvents: includeHookEvents,
    includePartialMessages: includePartialMessages,
    forwardSubagentText: forwardSubagentText,
    sessionMirror: sessionMirror,
  } = o;
  if ((setRestrictedSession(restricted), o.prefill)) seedEarlyInput(o.prefill);
  let gt,
    jt =
      typeof o.agents === "string" &&
      o.agents !== "" &&
      !isCustomizationDisabled("agents", { explicitlyRequested: !0 }),
    yt = !o.resume && !o.continue && !env.CLAUDE_BG_POST_CLEAR_RESPAWN,
    Ve;
  if (jt && typeof o.agents === "string" && !looksLikeAgentsJson(o.agents)) {
    if (!o.print && !getIsNonInteractiveSession()) return cliError(AGENTS_FLAG_FILE_REQUIRES_PRINT);
    let s = await readAgentsFlagFile(o.agents);
    if (!s.ok) return cliError(s.error);
    ((o.agents = s.json), (Ve = s.filePath), setFlagAgentsFilePaths(uniq([s.filePath, s.realPath])));
  }
  let agents = o.agents;
  if (jt && (yt || Ve !== void 0) && typeof agents === "string") {
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
  let agent = o.agent;
  if (agent) process.env.CLAUDE_CODE_AGENT = agent;
  let { outputFormat: outputFormat, inputFormat: inputFormat } = o,
    viewMode = getInitialSettings_2().viewMode,
    Ie = dFe(),
    Ee = o.verbose ?? (viewMode ? viewMode === "verbose" : Ie ? !1 : resolveSetting("verbose", !1).value),
    print = o.print,
    qe = o.init ?? !1,
    Ht = o.initOnly ?? !1,
    To = o.maintenance ?? !1;
  announceScreenReaderMode(!print && process.stdout.isTTY === !0, (s) => {
    console.log(s);
  });
  let Ro = o.disableSlashCommands || !1;
  setDisableSlashCommands(Ro);
  let Oo = MYs(o.autocompact),
    Io = isWorktreeModeEnabled() ? o.worktree : void 0,
    eo = typeof Io === "string" ? Io : void 0,
    ke = Io !== void 0,
    kn;
  if (eo) {
    let s = parsePRReference(eo);
    if (s !== null) ((kn = s), (eo = void 0));
  }
  let An = isWorktreeModeEnabled() && o.tmux === !0;
  if (An) {
    if (!ke) return cliError("Error: --tmux requires --worktree");
    if (getPlatform() === "windows") return cliError("Error: --tmux is not supported on Windows");
    if (!(await isTmuxAvailable()))
      return cliError(`Error: tmux is not installed.
${getTmuxInstallInstructions()}`);
  }
  let ae = extractTeammateOptions(o);
  if (ae.parentSessionId) getTeammateUtils().setCliParentSessionId?.(ae.parentSessionId);
  setTeammateAgentId(ae.agentId);
  let ze;
  if (isAgentSwarmsEnabled()) {
    ze = ae;
    let s = ae.agentId || ae.agentName || ae.teamName,
      C = ae.agentId && ae.agentName && ae.teamName;
    if (s && !C)
      return cliError("Error: --agent-id, --agent-name, and --team-name must all be provided together");
    if (ae.agentId && ae.agentName && ae.teamName)
      getTeammateUtils().setDynamicTeamContext?.({
        agentId: ae.agentId,
        agentName: ae.agentName,
        teamName: ae.teamName,
        color: ae.agentColor,
        planModeRequired: ae.planModeRequired ?? !1,
        parentSessionId: ae.parentSessionId,
      });
    if (ae.teammateMode) teammateModeSnapshotModule().setCliTeammateModeOverride?.(ae.teammateMode);
  }
  let Me = o.sdkUrl ?? void 0,
    Tn = includePartialMessages || env.CLAUDE_CODE_INCLUDE_PARTIAL_MESSAGES,
    Pn = forwardSubagentText || env.CLAUDE_CODE_FORWARD_SUBAGENT_TEXT;
  if (includeHookEvents || env.CLAUDE_CODE_REMOTE) setAllHookEventsEnabled(!0);
  if ((consumeUserPromptSubmitEventsEnv(), Me)) {
    if (!inputFormat) inputFormat = "stream-json";
    if (!outputFormat) outputFormat = "stream-json";
    if (o.verbose === void 0) Ee = !0;
    if (!o.print) print = !0;
  }
  let Np = !1,
    es = !1,
    _l = !1,
    Je = await resolveCloudLaunchOptions(o, {
      prompt: typeof e === "string" ? e : void 0,
      sessionId: sessionId,
      outputFormat: outputFormat,
      inputFormat: inputFormat,
      hasSdkUrl: Boolean(Me),
      nonInteractive: getIsNonInteractiveSession(),
      isConnectedSessionsEnabled: lTt,
      isViolinWoodEnabled: isViolinWoodEnabled,
      cloudPrintEnabled: isCloudBackendForced(),
      hasConnect: Boolean(u?.url),
      hasSSH: Boolean(p?.host),
      rcProjectGateEnabled: !1,
      cloudSessionsByDefault: es,
      sandboxVmByDefault: _l,
      cloudSessionsDeniedByOrgPolicy: async () => (
        await awaitPolicyLimitsColdStart(),
        profileCheckpoint("action_after_cloud_default_policy_wait"),
        unr()
      ),
      launchFolderMonorepoVerdict: () => "undetermined",
      noMonorepoAsksTheService: async () => !1,
    });
  if (!Je.ok) return Je.flushAnalytics ? cliErrorAfterAnalyticsFlush(Je.error) : cliError(Je.error);
  if ((forgetLauncherHostLoginForCloud(Je.value), Je.value.resumeInCloud !== null)) o.resume = void 0;
  let yl = Je.value.cloudDefault === "declined",
    jp = IFs();
  if (yl) logFeatureSad("cloud_session_default", "local_flag");
  let ts = Je.value.cloudDefault === "not_allowed";
  if (ts) logFeatureSad("cloud_session_default", "org_policy");
  let vl,
    bl,
    El = !1,
    os = Je.value.cloudDefault === "applied",
    {
      teleport: teleport,
      cloudAttachId: cloudAttachId,
      resumeInCloud: resumeInCloud,
      poolId: poolId,
      environmentQuery: environmentQuery,
      poolPromotedRemote: poolPromotedRemote,
      poolRef: poolRef,
      poolOnBranch: poolOnBranch,
      forwardHomeSettings: forwardHomeSettings,
      homeSettingsConsent: homeSettingsConsent,
      projectFlag: projectFlag,
      projectBrowse: projectBrowse,
      projectForRemoteControl: projectForRemoteControl,
      correlationId: correlationId,
      headlessCloud: headlessCloud,
      headlessCloudPrint: headlessCloudPrint,
      serveOnly: serveOnly,
      persistentVolume: persistentVolume,
      persistentVolumeFromSessionId: persistentVolumeFromSessionId,
      monorepo: monorepo,
      noMonorepo: noMonorepo,
      noMonorepoAsksTheService: noMonorepoAsksTheService,
      personal: personal,
    } = Je.value,
    { remote: remote } = Je.value,
    oo =
      remote !== null ||
      cloudAttachId !== null ||
      poolId !== null ||
      poolPromotedRemote ||
      projectBrowse !== null ||
      Boolean(u?.url) ||
      Boolean(p?.host);
  if (restricted && oo)
    return cliError(
      "Error: --restricted cannot be enforced in a cloud, remote-environment or ssh session, which runs its tools on another machine",
    );
  (getRootSession().host.launchOptions.replaceMayForwardHomeSettings(forwardHomeSettings),
    getRootSession().host.launchOptions.replaceHomeSettingsHostConsent(homeSettingsConsent));
  let $t =
      getIsNonInteractiveSession() &&
      (headlessCloud ||
        headlessCloudPrint ||
        cloudAttachId !== null ||
        projectBrowse !== null ||
        poolId !== null),
    Ln,
    ls = !1,
    ds = o.watchArtifact ?? o.watchArtifactNoAutoreact;
  if (ds !== void 0) {
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
      Boolean(u?.url) ||
      Boolean(p?.host)
    )
      return cliError(
        "Error: --watch-artifact is not available in sessions attached to a remote environment \u2014 run it in a plain local session",
      );
    let s = parseWatchArtifactArg(ds);
    if ("error" in s) return cliError(s.error);
    let C = typeof o.watchArtifactNoAutoreact === "string";
    (setPendingWatchArtifact(C ? { ...s, autoReactDisarmed: !0 } : s), (Ln = s.slug), (ls = C));
  }
  let Fl = null,
    Fo = o.remoteControl ?? o.rc,
    Nn = !1,
    Ll = typeof Fo === "string" && Fo.length > 0 ? Fo : void 0,
    remoteControlSessionNamePrefix = o.remoteControlSessionNamePrefix;
  if (remoteControlSessionNamePrefix)
    process.env.CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX = remoteControlSessionNamePrefix;
  let ps = validateSessionIdFlag({
    sessionId: sessionId,
    continue: o.continue,
    resume: o.resume,
    forkSession: o.forkSession,
    sdkUrl: Me,
  });
  if (!ps.ok) return cliError(ps.error);
  if (sessionId) {
    if (!Me) {
      let s = Vt(sessionId);
      if (!s) return cliError("Error: Invalid session ID. Must be a valid UUID.");
      if (!(o.forkSession && o.resume === s) && sessionIdExists(s))
        return cliError(`Error: Session ID ${s} is already in use.`, BG_EXIT_CAUSE_SESSION_IN_USE);
    }
  }
  let file = o.file;
  if (file && file.length > 0) {
    let s = getSessionIngressAuthToken();
    if (!s)
      return cliError(
        "Error: Session token required for file downloads. CLAUDE_CODE_SESSION_ACCESS_TOKEN must be set.",
      );
    let C = process.env.CLAUDE_CODE_REMOTE_SESSION_ID || getSessionId(),
      T = parseFileSpecs(file);
    if (T.length > 0) {
      let R = {
        baseUrl: process.env.ANTHROPIC_BASE_URL || getOauthConfig().BASE_API_URL,
        oauthToken: s,
        sessionId: C,
      };
      gt = downloadSessionFiles(T, R);
    }
  }
  let j = getIsNonInteractiveSession(),
    no = fallbackModel === o.model ? void 0 : fallbackModel,
    systemPrompt = o.systemPrompt;
  if (o.systemPromptFile)
    try {
      let s = resolve_3(o.systemPromptFile);
      systemPrompt = joinPromptAppend(await readFile_2(s, "utf8"), o.systemPrompt);
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT")
        return cliError(`Error: System prompt file not found: ${resolve_3(o.systemPromptFile)}`);
      return cliError(`Error reading system prompt file: ${errorMessage(error)}`);
    }
  let appendSystemPrompt = o.appendSystemPrompt;
  if (o.appendSystemPromptFile) {
    if (o.appendSystemPrompt && isBridgeCarrierPromptBound())
      return cliError(
        "Error: --append-system-prompt cannot be given with --append-system-prompt-file in a Remote Control session. Remove --append-system-prompt.",
      );
    try {
      let s = resolve_3(o.appendSystemPromptFile);
      appendSystemPrompt = joinPromptAppend(
        verifyBridgeCarrierPrompt(await readFile_2(s)),
        o.appendSystemPrompt,
      );
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT")
        return cliError(`Error: Append system prompt file not found: ${resolve_3(o.appendSystemPromptFile)}`);
      return cliError(`Error reading append system prompt file: ${errorMessage(error)}`);
    }
  }
  let Nl = readAppendPromptHead(appendSystemPrompt),
    Hn = await readAppendSubagentPrompt(o);
  if (!Hn.ok) return cliError(Hn.error);
  ((o.appendSubagentSystemPrompt = Hn.prompt), enableAppendSubagentPrompt(o.appendSubagentSystemPrompt));
  let { systemPrompt: systemPrompt_2, appendSystemPrompt: appendSystemPrompt_2 } = resolveSystemPromptOptions(
    {
      cli: { systemPrompt: systemPrompt, appendSystemPrompt: appendSystemPrompt },
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
  let $n = agent ? getBuiltInAgents().find((s) => s.agentType === agent)?.permissionMode : void 0,
    ms = isRemoteSessionLaunch({
      remote: remote,
      isNonInteractiveSession: j,
      headlessCloud: headlessCloud,
      headlessCloudPrint: headlessCloudPrint,
      isContinue: Boolean(o.continue),
      pendingAssistantChat: void 0,
      pendingConnectUrl: u?.url,
      pendingSSHHost: p?.host,
    }),
    jl = !1,
    Ct = uie(),
    rt,
    ro = async (s, C, T) => {
      profileCheckpoint(C.before);
      let startTime = performance.now(),
        L = await waitForInitialize({ initialize: initializeGrowthBook, budgetMs: T });
      return (
        eyi(L.waitMs),
        Br(s, performance.now() - startTime, startTime),
        logForDiagnosticsNoPII(L.timedOut ? "warn" : "info", "startup_flag_fetch_wait", {
          budget_ms: T,
          waited_ms: Math.round(L.waitMs),
          timed_out: L.timedOut,
          killswitch_recheck: s !== "growthbook_init_ms",
        }),
        profileCheckpoint(C.after),
        L
      );
    },
    so = !1,
    fs = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_auto_mode_config", {}),
    gs = fs.source === "disk" && fs.value?.enabled === "disabled",
    io = judgeGrowthBookKick(Ct),
    Wt = io !== void 0 && Sl(Ct);
  if (
    startupFlagWaitPoint({
      nonInteractive: j,
      budgetMs: io,
      settingsEnvPending: j && io !== void 0 && pendingSettingsEnvBlocksEarlyGb(ke),
      cacheEmpty: isGrowthBookCacheEmpty(),
      relaunches: Ct,
      autoModeKillSwitchOnDisk: gs,
      warmWakeEarlyFetch: Wt,
    }) === "gb-before-mode" &&
    io !== void 0
  )
    ((so = !0),
      (rt = {
        site: "gb-before-mode",
        result: await ro(
          "growthbook_init_ms",
          { before: "before_growthbook_init", after: "after_growthbook_init" },
          io,
        ),
      }));
  if (
    getIsNonInteractiveSession() &&
    rt === void 0 &&
    gs &&
    is1PEventLoggingEnabled() &&
    !pendingSettingsEnvBlocksEarlyGb(ke)
  )
    await ro(
      "growthbook_killswitch_recheck_ms",
      { before: "before_gb_killswitch_recheck", after: "after_gb_killswitch_recheck" },
      qM,
    );
  let hs = DEFAULT,
    ao,
    lo = permissionMode,
    Ss;
  {
    if (
      (disableProactivitySelector(keybindingsState, S, void 0),
      proactivity !== void 0 || (!alwaysFalse() && isRelaunchProactivityEverOn()))
    )
      startProactivitySelectorGate();
    let C = resolveStartupProactivity(proactivity);
    ((hs = C.level), (ao = startupProactivityLevel({ startupLevel: C, startsAsRemoteThinClient: ms })));
    let T = startupPermissionModeForAsk({
      cliLevel: proactivity,
      modeSuppliedOnInvocation:
        permissionMode !== void 0 ||
        inheritPermissionMode !== void 0 ||
        dangerouslySkipPermissions === !0 ||
        $n !== void 0,
    });
    if (T !== void 0) ((lo = T), (Ss = "--proactivity ask isn't available here \xB7 Started in manual mode"));
  }
  let Ul = !1,
    It,
    _s = [],
    {
      mode: mode,
      notification: notification,
      proactivity: proactivity_2,
      modeSuppliedOnInvocation: modeSuppliedOnInvocation,
    } = initialPermissionModeFromCLI({
      permissionModeCli: lo,
      inheritPermissionModeCli: inheritPermissionMode,
      dangerouslySkipPermissions: dangerouslySkipPermissions,
      allowDangerouslySkipPermissions: allowDangerouslySkipPermissions,
      bypassPermissionsBlockedByHost: Ul,
      agentPermissionMode: $n,
      proactivityLevel: ao?.level,
    });
  It = notification ?? Ss;
  let xe = mode,
    ys = restrictedBypassNotice({
      restricted: restricted,
      permissionMode: xe,
      allowDangerouslySkipPermissions: allowDangerouslySkipPermissions,
    });
  if (ys) return cliError(`Error: ${ys}`);
  if (
    (applyInheritedPermissionModeFlag({
      inheritPermissionModeCli: inheritPermissionMode,
      resolvedMode: xe,
      storageV5: S,
    }),
    setSessionBypassPermissionsMode(xe === "bypassPermissions"),
    o.enableAutoMode ||
      lo === "auto" ||
      $n === "auto" ||
      (xe === "auto" && !isAutoModeFromFallback()) ||
      (!lo && isDefaultPermissionModeAuto()))
  )
    setAutoModeFlagCli(!0);
  (emitStartupMark("action_before_mcp_policy_wait"),
    await awaitMcpPolicyColdStart({
      hasDynamicMcpConfig: Boolean(mcpConfig && mcpConfig.length > 0) || ide,
      pluginStateReliable: r(),
      storageV5: S,
    }));
  let Z = {},
    vs = { ...getRepoMcpListsForAnalytics(), mcpConfigBlockedCount: 0 },
    co = {},
    uo = {},
    Vn = Me ? sessionId : void 0,
    Cs = loadRemoteMcpConfig(Vn, getServerUrl),
    Gt = mergeMcpConfigs([], [], Cs);
  if (mcpConfig && mcpConfig.length > 0) {
    let filtered = mcpConfig.map((U) => U.trim()).filter((U) => U.length > 0),
      C = [],
      T = [],
      R = [],
      isBridgeCarrierChild = startupCcrEnv.isBridgeCarrierChild,
      Be = [];
    for (let U of filtered) {
      let Fe = null,
        lt = [],
        Eo = safeParseJSON(U, !1);
      if (Eo) {
        let me = parseMcpConfig({
          configObject: Eo,
          filePath: "command line",
          expandVars: !0,
          scope: "dynamic",
          bridgeSessionId: Vn,
        });
        if (me.config) Fe = me.config.mcpServers;
        ((lt = me.errors), (uo = { ...uo, ...me.asWrittenEntries }));
      } else {
        let me = resolve_3(U),
          Ne = parseMcpConfigFromFilePath({
            filePath: me,
            expandVars: !0,
            scope: "dynamic",
            bridgeSessionId: Vn,
          });
        if (Ne.config) Fe = Ne.config.mcpServers;
        ((lt = Ne.errors), (uo = { ...uo, ...Ne.asWrittenEntries }));
        let [tn, on] = await Promise.all([
          stat(me).catch(() => {
            return;
          }),
          realpath(me).catch(() => me),
        ]);
        if (tn === void 0 || tn.isFile()) Be.push(me, on);
      }
      if (Fe) {
        if ((C.push(Fe), lt.length > 0)) {
          logForDebugging(
            `--mcp-config: ${lt.length} entry warning(s): ${lt.map((me) => `${me.path ? me.path + ": " : ""}${me.message}`).join("; ")}`,
            { level: "warn" },
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
    if ((setFlagMcpConfigFilePaths(uniq(Be)), T.length > 0)) {
      let joined = T.map((Fe) => `${Fe.path ? Fe.path + ": " : ""}${Fe.message}`).join(`
`);
      return (
        logForDebugging(`--mcp-config validation failed (${T.length} errors): ${joined}`, { level: "error" }),
        cliError(`Error: Invalid MCP configuration:
${joined}`)
      );
    }
    Gt = mergeMcpConfigs(
      C,
      R.map((U) => U.name),
      Cs,
    );
    for (let U of Gt.refused) logForDebugging(`--mcp-config: ${U.message}`, { level: "warn" });
    let servers = Gt.servers;
    R.unshift(...Gt.refused);
    let Co = new Map();
    for (let U of R) if (!Object.hasOwn(servers, U.name)) Co.set(U.name, U);
    if (Co.size > 0) {
      let list = Array.from(Co.values());
      if ((recordSkippedDynamicServers(list), !getIsNonInteractiveSession() || process.stderr.isTTY))
        warnStartupIssues(
          `${list.length} ${plural(list.length, "MCP server")} skipped due to invalid config:`,
          { stderrPrefix: "Warning: ", items: list.map((Fe) => Fe.message) },
        );
    }
    if (Object.keys(servers).length > 0) {
      let U = Boolean(env.CLAUDE_CODE_REMOTE) || isBridgeCarrierChild,
        Fe = areSideloadFlagsDisabledByPolicy() && !areMcpConfigsAllSdkType(servers);
      if (Fe && !U) return cliError(sideloadFlagsBlockedMessage(["--mcp-config"]));
      let lt = ccrArtifactsEntryModule?.withoutWithheldCcrArtifactsEntry(servers).kept ?? servers,
        Eo = xr(lt, (ut, rn) => {
          let Si = { ...ut, scope: "dynamic" };
          if (env.CLAUDE_CODE_REMOTE) getServerUrl(rn, ut);
          return Zl(ut)
            ? registerCliOwnedConfig(Si)
            : markCcrInjectedConfig(rn, Si, isLockedOutByOrgMcpPolicy);
        }),
        { configs: configs, blocked: blocked, held: held } = filterDynamicMcpServersByPolicy(Eo);
      if (((vs.mcpConfigBlockedCount = blocked.length), blocked.length > 0))
        warnStartupIssues(
          `MCP ${plural(blocked.length, "server")} blocked by enterprise policy: ${blocked.join(", ")}`,
          { stderrPrefix: "Warning: " },
        );
      let on = { ...configs, ...filterObject(Eo, (ut, rn) => held.includes(rn)) },
        Id = filterObject(on, (ut) => ut.type === "sdk"),
        Dd =
          doesEnterpriseMcpConfigExist() &&
          U &&
          !o.strictMcpConfig &&
          areMcpConfigsAllowedWithEnterpriseMcpConfig(Id),
        {
          servers: servers_2,
          dropped: dropped,
          keptNotes: keptNotes,
          reason: reason,
        } = applyMcpPolicyDrops(on, {
          dropForEnterpriseMcpConfig: Dd,
          dropForSideloadPolicy: Fe && U,
          keptDespiteAllowlist: ccrInjectedKeptDespiteAllowlist(configs),
        });
      if (dropped.length > 0) {
        if (
          (logForDebugging(
            `--mcp-config: ${plural(dropped.length, "server")} ignored (${reason}): ${dropped.join(", ")}`,
            { level: "warn" },
          ),
          reason === "enterprise MCP config")
        )
          warnStartupIssues(
            `an enterprise MCP config (managed-mcp.json) is present and has exclusive control over MCP servers; ignoring ${dropped.length} MCP ${plural(dropped.length, "server")} supplied via --mcp-config: ${dropped.join(", ")}`,
            { stderrPrefix: "Warning: " },
          );
        else if (reason === "disableSideloadFlags policy")
          warnStartupIssues(
            `managed setting disableSideloadFlags forbids --mcp-config on this machine; ignoring ${dropped.length} server-delivered MCP ${plural(dropped.length, "server")}: ${dropped.join(", ")}`,
            { stderrPrefix: "Warning: " },
          );
      }
      for (let ut of keptNotes) if ((logForDebugging(ut), startupCcrEnv.isSelfHostedRunnerChild)) cliWarn(ut);
      let Cr = ccrRepoToolsOnlyNote(servers_2);
      if (Cr) (logForDebugging(Cr), cliWarn(Cr));
      ((co = servers_2), (Z = { ...Z, ...servers_2 }));
    }
  }
  let ownership = Gt.ownership,
    Yn = mcpConfigProvenanceNote(ownership?.hostOwnedNames, Object.keys(Gt.servers).length);
  if (Yn) logForDebugging(Yn.text, { level: Yn.level });
  let jo = getUnusableEnterpriseMcpConfigMessage();
  if (jo !== null && getIsNonInteractiveSession() && !$t)
    if (process.stderr.isTTY) cliWarn(`Warning: ${jo}`);
    else logForDebugging(jo, { level: "warn" });
  let Dt = o;
  setChromeFlagOverride(Dt.chrome);
  let Yt = hasHostedClaudeInChromeServer(Z),
    qt = !Yt && shouldEnableClaudeInChrome(Dt.chrome) && isClaudeAISubscriber();
  if (
    !Yt &&
    Dt.chrome !== !1 &&
    (Dt.chrome === !0 || env.CLAUDE_CODE_ENABLE_CFC === !0) &&
    !isClaudeInChromeAllowed()
  ) {
    let s =
      policyDeniedReason("allow_claude_browser_extension", "Claude in Chrome", "is") ??
      "Claude in Chrome is disabled by your organization";
    if (j) logForDebugging(`[Claude in Chrome] ${s}`, { level: "warn" });
    else warnStartupIssues(s);
  }
  let Bo = isMcpServerDenied(CLAUDE_IN_CHROME_MCP_SERVER_NAME, getClaudeInChromeStdioServerConfig()),
    Es = isClaudeInChromeBlockedByEnterpriseMcpConfig() || Bo,
    Gl = !qt && !Yt && !Es && shouldAutoEnableClaudeInChrome(S),
    ks = qt && Dt.chrome !== !0 && env.CLAUDE_CODE_ENABLE_CFC !== !0 && Es,
    Vl = qt && Dt.chrome !== !0 && ((env.CLAUDE_CODE_ENABLE_CFC !== !0 && isSafeMode()) || restricted);
  if (Yt && Bo)
    (logForDebugging(
      "[Claude in Chrome] Served by the remote session host over --mcp-config, but a deniedMcpServers policy entry denies Claude in Chrome; dropping the entry and not starting the built-in server",
    ),
      (Z = filterObject(Z, (s, C) => C !== CLAUDE_IN_CHROME_MCP_SERVER_NAME)));
  else if (Yt && !isClaudeInChromeAllowed())
    logForDebugging(
      "[Claude in Chrome] Served by the remote session host over --mcp-config, but the org policy denies the browser extension; not adopting it and not starting the built-in server",
    );
  else if (Yt)
    (logForDebugging(
      "[Claude in Chrome] Served by the remote session host over --mcp-config; not starting the built-in server",
    ),
      putChromePromptInSystemPrompt(adoptHostedClaudeInChrome().systemPrompt));
  else if (ks)
    logForDebugging(
      "[Claude in Chrome] Skipping chrome wiring: blocked by enterprise MCP config or managed deniedMcpServers policy",
    );
  else if (Vl) logForDebugging("[Claude in Chrome] Skipping chrome wiring: --safe-mode or --restricted");
  else if (qt && (Bo || jo !== null))
    if (j)
      logForDebugging(
        `[Claude in Chrome] MCP server blocked by enterprise policy: ${CLAUDE_IN_CHROME_MCP_SERVER_NAME}`,
        { level: "warn" },
      );
    else warnStartupIssues(`MCP server blocked by enterprise policy: ${CLAUDE_IN_CHROME_MCP_SERVER_NAME}`);
  else if (qt) {
    let s = getPlatform();
    try {
      logEvent("tengu_claude_in_chrome_setup", { platform: X4(s) });
      let {
        mcpConfig: mcpConfig,
        allowedTools: allowedTools_2,
        systemPrompt: systemPrompt,
      } = setupClaudeInChrome({ skipReconnectAutoOpen: Jqr() });
      ((Z = { ...Z, ...mcpConfig }),
        allowedTools.push(...allowedTools_2),
        putChromePromptInSystemPrompt(systemPrompt));
    } catch (error) {
      return (
        logEvent("tengu_claude_in_chrome_setup_failed", { platform: X4(s) }),
        logForDebugging(`[Claude in Chrome] Error: ${error}`),
        logError(error),
        cliError("Error: Failed to run with Claude in Chrome.")
      );
    }
  }
  let Kn = o,
    it = o.strictMcpConfig || !1;
  setStrictMcpConfig(it);
  let ws = o.includeUnsupportedModels === !0;
  ((getProviderState().includeUnsupportedModels = ws),
    setCliSessionConfigCarried(cliCarriesSessionConfig(o)),
    setForkRestrictedLaunchConfig(cliCarriesForkRestrictedConfig(o)),
    setForkReplayLaunchConfig({
      ...(typeof o.appendSystemPrompt === "string" &&
        o.appendSystemPrompt !== "" && { appendSystemPrompt: o.appendSystemPrompt }),
      ...(o.systemPromptSnapshot !== void 0 && { systemPromptSnapshot: o.systemPromptSnapshot }),
      ...(Ve === void 0 && typeof o.agent === "string" && o.agent !== "" && { agent: o.agent }),
      ...(Ve === void 0 && typeof o.agents === "string" && o.agents !== "" && { agents: o.agents }),
    }),
    setPermissionPromptToolName(
      Z_e(o.permissionPrompts) ? NONE : i8n({ permissionPromptTool: o.permissionPromptTool, sdkUrl: Me }),
    ),
    setReplConfigArgv([
      ...earlyArgsToArgv(
        resolveEarlyArgPaths(
          {
            settings: typeof o.settings === "string" ? o.settings : void 0,
            managedSettings: typeof o.managedSettings === "string" ? o.managedSettings : void 0,
            pluginDir: getInlinePlugins(),
            pluginDirNoMcp: getInlinePluginsNoMcp(),
            addDir: addDir,
            mcpConfig: mcpConfig,
            strictMcpConfig: it,
            restricted: restricted,
            settingSources: appliedSettingSourcesFlagValue(),
          },
          resolve_3,
        ),
      ),
      ...(no ? ["--fallback-model", no] : []),
      ...(allowDangerouslySkipPermissions ? ["--allow-dangerously-skip-permissions"] : []),
      ...(Ro ? ["--disable-slash-commands"] : []),
      ...(ws ? ["--include-unsupported-models"] : []),
      ...(Kn.channels ?? []).flatMap((s) => ["--channels", s]),
      ...(Ln !== void 0 ? [ls ? "--watch-artifact-no-autoreact" : "--watch-artifact", Ln] : []),
    ]));
  let $o = gateDynamicMcpConfigForEnterpriseMcpConfig({ dynamicMcpConfig: Z, strictMcpConfig: it });
  if ($o.kind === "refuse") return cliError($o.message);
  if ($o.dropped.length > 0) {
    let { servers: servers, dropped: dropped } = $o;
    ((Z = servers), (co = filterObject(co, (R, L) => Object.hasOwn(servers, L))));
    let T = `the enterprise MCP config (managed-mcp.json) keeps exclusive control over MCP servers; ignoring ${dropped.length} dynamically configured MCP ${plural(dropped.length, "server")}: ${dropped.join(", ")}`;
    if (
      (logForDebugging(T, { level: "warn" }),
      getIsNonInteractiveSession() && (process.stderr.isTTY || env.CLAUDE_CODE_REMOTE) && !$t)
    )
      warnStartupIssues(T, { stderrPrefix: "Warning: " });
  }
  setAdditionalDirectoriesForClaudeMd(addDir);
  let po,
    As = (s, C) => {
      let T = [],
        R = [];
      for (let L of s)
        if (L.startsWith("plugin:")) {
          let sliced = L.slice(7),
            index = sliced.indexOf("@");
          if (index <= 0 || index === sliced.length - 1) R.push(L);
          else T.push({ kind: "plugin", name: sliced.slice(0, index), marketplace: sliced.slice(index + 1) });
        } else if (L.startsWith("server:") && L.length > 7) T.push({ kind: "server", name: L.slice(7) });
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
    },
    { channels: channels, dangerouslyLoadDevelopmentChannels: dangerouslyLoadDevelopmentChannels } = Kn,
    mo = [];
  if (channels && channels.length > 0) ((mo = As(channels, "--channels")), setAllowedChannels(mo));
  if (!j) {
    if (dangerouslyLoadDevelopmentChannels && dangerouslyLoadDevelopmentChannels.length > 0)
      po = As(dangerouslyLoadDevelopmentChannels, "--dangerously-load-development-channels");
  }
  if (mo.length > 0 || (po?.length ?? 0) > 0) {
    let s = (C) =>
      lri(
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
    let { shouldToolsListOptInToBrief: shouldToolsListOptInToBrief } = require("./chunk-cv3kgbt2.js");
    if (shouldToolsListOptInToBrief(splitRuleList(tools))) setUserMsgOptIn(!0);
  }
  if (getIsNonInteractiveSession()) {
    let s = checkHasTrustDialogAccepted();
    if ((setSessionTrustAccepted(!0), !s))
      import("./chunk-zqrznfbt.js").then((C) => {
        C.primeCurrentRepository();
      });
  }
  emitStartupMark("action_before_permission_context");
  let startTime = performance.now(),
    Wo = await applySessionLaunchOptions({
      allowedTools: allowedTools,
      disallowedTools: disallowedTools,
      baseTools: tools,
      restricted: restricted,
      permissionMode: xe,
      allowDangerouslySkipPermissions: allowDangerouslySkipPermissions,
      addDirs: addDir,
      storageV5: S,
    }),
    toolPermissionContext = Wo.toolPermissionContext;
  if (proactivity_2) toolPermissionContext = { ...toolPermissionContext, ...proactivity_2 };
  let { warnings: warnings, overlyBroadBashPermissions: overlyBroadBashPermissions } = Wo;
  if (
    ((It ??= Wo.bypassCapabilityNotification),
    Br("permission_context_ms", performance.now() - startTime, startTime),
    !getIsNonInteractiveSession() ||
      (outputFormat !== "json" && outputFormat !== "stream-json" && env.CLAUDE_CODE_SESSION_KIND !== "bg"))
  )
    (warnings.forEach((s) => warnStartupIssues(s)),
      _s.push(
        ...filterUnseenSecurityWarnings(
          Wo.securityWarnings.map((securityWarning) => ({
            ...securityWarning,
            text: cleanWarningLine(securityWarning.text),
          })),
        ),
      ));
  else warnings.forEach((s) => logForDebugging(`[permissions] ${stripControlChars(s)}`, { level: "warn" }));
  let Os = checkBypassPermissionsEnv(toolPermissionContext);
  if (Os !== void 0)
    reportStartupModelNotice(Os, {
      key: "bypass-removal-waiver",
      outputFormat: outputFormat,
      onStderrToo: !0,
    });
  (armPendingSettingsEnvRule(getRootSession(), hasRepoSettingsEnv, ke), enforceMinimumVersion());
  let Go =
    j && !$t && headlessSyncsClaudeAiConnectors()
      ? fetchClaudeAiConfigsOnce(y).then((s) => {
          printClaudeAiConnectorNotice();
          let { allowed: allowed, blocked: blocked } = filterMcpServersByPolicy(s ?? {});
          if (blocked.length > 0)
            cliWarn(
              `Warning: claude.ai MCP ${plural(blocked.length, "server")} blocked by enterprise policy: ${blocked.join(", ")}`,
            );
          return allowed;
        })
      : Promise.resolve({});
  if (ms) {
    if ((setIsRemoteMode(!0), hasSyncedPluginLaneOpened()))
      (clearPluginCache("remote thin client: synced plugin lane closes"), clearSyncedPluginDirs());
  }
  logForDebugging("[STARTUP] Loading MCP configs...");
  let now = Date.now(),
    Jn = { value: void 0 },
    Ds = j && isGateOOn() && hasManagedMcpPolicy() ? Go.catch(() => ({})) : Promise.resolve(),
    Yl = !(it || isBareMode() || getIsRemoteMode()) && isEnterpriseMcpConfigHeld(),
    fo = (
      it || isBareMode() || getIsRemoteMode()
        ? Promise.resolve({ servers: {} })
        : Ds.then(() => getClaudeCodeMcpConfigs(Z, { storageV5: S, credentials: y }))
    ).then((s) => ((Jn.value = Date.now() - now), s)),
    xs = checkHasTrustDialogAccepted(),
    Fs = isWorkspacePersistedTrusted();
  if (inputFormat && inputFormat !== "text" && inputFormat !== "stream-json")
    return cliError(`Error: Invalid input format "${inputFormat}".`);
  if (inputFormat === "stream-json" && outputFormat !== "stream-json")
    return cliError("Error: --input-format=stream-json requires output-format=stream-json.");
  if (inputFormat === "stream-json" && !getIsNonInteractiveSession())
    return cliError("Error: --input-format=stream-json requires --print.");
  {
    let s = validateSdkUrlFlag(Me);
    if (s !== null)
      return (
        await logEventAsync("tengu_sdk_url_host_rejected", { code: fromEnum(s.code) }),
        cliErrorAfterAnalyticsFlush(
          `Error: --sdk-url rejected: ${s.reason}. This flag is reserved for Remote Control worker processes connecting to Anthropic's backend.`,
        )
      );
  }
  if (Me) {
    if (inputFormat !== "stream-json" || outputFormat !== "stream-json")
      return cliError(
        "Error: --sdk-url requires both --input-format=stream-json and --output-format=stream-json.",
      );
    if (!env.CLAUDE_CODE_REMOTE) {
      await waitForPolicyLimitsToLoad();
      let s = policyDeniedReason("allow_remote_control", "Remote Control", "is");
      if (s)
        return (
          await logOrgPolicyDeniedAsync("allow_remote_control", "startup"),
          cliErrorAfterAnalyticsFlush(s)
        );
      if (getSettingsWithErrors_2().settings.disableRemoteControl === !0)
        return cliError(`Error: ${REMOTE_CONTROL_DISABLED_BY_POLICY_MESSAGE}`);
    }
    jwi(Me);
  }
  if (o.sessionPersistence === !1) {
    if (!j) return cliError("Error: --no-session-persistence can only be used with --print mode.");
    setSessionPersistenceDisabled(!0);
  }
  (enableTranscriptLocalGc({ sdkUrl: Me, isNonInteractiveSession: j }),
    setToolResultCopyMode({ sdkUrl: Me, isNonInteractiveSession: j }));
  let Qn = {
      hydrate: env.CLAUDE_CODE_CCR_EARLY_HYDRATE_PREFETCH,
      connect: env.CLAUDE_CODE_CCR_EARLY_REMOTE_CONNECT,
    },
    Ls =
      (Qn.hydrate || Qn.connect) && Me && o.resume
        ? import("./chunk-yvf1bnw9.js").then((s) => s.startEarlyRemoteWork(Me, S, Qn))
        : void 0,
    Kl = Ls?.then((s) => s.hydrateReads),
    ql = Ls?.then((s) => s.link);
  if (o.awaitInitialize) {
    if (inputFormat !== "stream-json")
      return cliError("Error: --await-initialize requires --input-format=stream-json.");
    if (Me) return cliError("Error: --await-initialize cannot be used with --sdk-url.");
  }
  if (o.awaitClaim) {
    if (inputFormat !== "stream-json" || outputFormat !== "stream-json")
      return cliError(
        "Error: --await-claim requires --print with --input-format=stream-json and --output-format=stream-json.",
      );
    if (o.continue || o.resume || o.forkSession)
      return cliError("Error: --await-claim cannot be combined with --continue, --resume or --fork-session.");
    if (Me) return cliError("Error: --await-claim cannot be used with --sdk-url.");
    if (isScrubEnabled())
      return cliError(
        "Error: --await-claim cannot be used with CLAUDE_CODE_SUBPROCESS_ENV_SCRUB: the subprocess sandbox pins its protected paths to the launch directory at start-up.",
      );
    markSpareParked();
  }
  if (o.replayUserMessages) {
    if (inputFormat !== "stream-json" || outputFormat !== "stream-json")
      return cliError(
        "Error: --replay-user-messages requires both --input-format=stream-json and --output-format=stream-json.",
      );
  }
  if (o.promptSuggestions && (!j || outputFormat !== "stream-json"))
    return cliError(
      "Error: --prompt-suggestions requires --print and --output-format=stream-json (prompt_suggestion messages are only surfaced in stream-json output).",
    );
  if (Tn) {
    if (!j || outputFormat !== "stream-json") {
      if (includePartialMessages)
        return cliError(
          "Error: --include-partial-messages requires --print and --output-format=stream-json.",
        );
      Tn = !1;
    }
  }
  if (Pn) {
    if (!j || outputFormat !== "stream-json") {
      if (forwardSubagentText)
        return cliError("Error: --forward-subagent-text requires --print and --output-format=stream-json.");
      Pn = !1;
    }
  }
  if (o.planModeInstructions && !j)
    return cliError("Error: --plan-mode-instructions can only be used with --print mode.");
  if (!j) {
    let s = cloudUnavailableReason(stdinOverrideCache.get(), { explicitCloudLaunch: remote !== null && !os });
    if (s !== void 0) return exitWithoutInteractiveInput(s);
  }
  let Ae = await getInputPrompt(e || "", inputFormat ?? "text"),
    zl = typeof Ae === "string" ? Ae : null;
  profileCheckpoint("action_after_input_prompt");
  let at;
  if (
    isNonInteractiveOrBgSession({ isNonInteractiveSession: j, isBgSession: isBgSession() }) &&
    o.jsonSchema
  ) {
    try {
      at = jsonParse(o.jsonSchema);
    } catch (error) {
      return cliError(`Error: --json-schema is not valid JSON: ${errorMessage(error)}`);
    }
    if (typeof at !== "object" || at === null || Array.isArray(at))
      return cliError("Error: --json-schema must be a JSON object");
  }
  (profileCheckpoint("action_before_setup"), logForDebugging("[STARTUP] Running setup()..."));
  let now_2 = Date.now(),
    startTime_2 = performance.now(),
    { setup: setup } = await import("./chunk-fhdzwff4.js");
  Br("setup_import_ms", performance.now() - startTime_2, startTime_2);
  let messagingSocketPath = o.messagingSocketPath,
    ho = getCwd();
  try {
    claudeTempDir();
  } catch (error) {
    logError(error);
    let C = errorMessage(error);
    return (
      printCliError(C),
      await writeStartupFailureResult({ sessionId: getSessionId(), message: C, reason: "temp_dir_unusable" }),
      cliErrorAfterAnalyticsFlush()
    );
  }
  (initBuiltinPlugins(), (jl = !0), initBundledSkills());
  let Zn = !!p?.host,
    er,
    tr = !1,
    nr = async () => {
      if (er !== void 0 && !tr) return;
      try {
        let { shouldRefreshArtifactRoster: shouldRefreshArtifactRoster } =
          await import("./chunk-tbts81qj.js");
        if (!shouldRefreshArtifactRoster()) return;
        let {
          artifactRosterFetchDeferred: artifactRosterFetchDeferred,
          artifactRosterFresh: artifactRosterFresh,
          artifactRosterIdentityKnown: artifactRosterIdentityKnown,
          refreshArtifactRoster: refreshArtifactRoster,
        } = await import("./chunk-rdzbcgex.js");
        if (!artifactRosterIdentityKnown() || artifactRosterFresh() || artifactRosterFetchDeferred()) return;
        ((tr = !1),
          (er = refreshArtifactRoster({ credentials: y, storageV5: S, timeoutMs: 5000 })),
          er.then((Be) => {
            tr = !Be;
          }));
      } catch (error) {
        logForDebugging(`Artifact roster kick failed: ${errorMessage(error)}`);
      }
    };
  if (j && !pendingSettingsEnvBlocksEarlyGb(ke)) await nr();
  if (!shouldAwaitPolicyLimitsOnStartup()) ensurePolicyLimitsLoadRequested();
  else if ((await awaitPolicyLimitsColdStart()) !== "skipped")
    profileCheckpoint("action_after_policy_limits_cold_await");
  let Us;
  if (!getIsNonInteractiveSession())
    await refuseOrgConfigEarlyAtStartup({ showBlockedScreen: h.showOrgConfigBlockedScreen });
  {
    let s = settleProvisionalStartupMode(toolPermissionContext, {
      onNotification: (C) => {
        It ??= C;
      },
    });
    if (s !== toolPermissionContext) ((toolPermissionContext = s), (xe = s.mode));
    if (getIsNonInteractiveSession())
      ((It ??= levelAutoHeldForPendingVerdictNotice()), abandonPendingPolicyVerdictResolution());
  }
  let Vo = getPolicyLimitsColdStartWait();
  if (Vo) {
    Br("policy_limits_await_ms", Vo.waitedMs, Vo.firstAtMs);
    let s = didPolicyLimitsColdStartTimeOut();
    logForDiagnosticsNoPII(s ? "warn" : "info", "policy_limits_cold_await", {
      budget_ms: POLICY_LIMITS_COLD_AWAIT_MS,
      waited_ms: Math.round(Vo.waitedMs),
      timed_out: s,
    });
  }
  if (
    startEarlyPluginsSync(
      getRootSession(),
      y,
      () => shouldHoldEarlyGrowthBook(ke) || env.CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER,
    )
  )
    addStartupContext({ early_plugins_sync: 1 });
  if (
    startEarlySkillsSync(
      getRootSession(),
      S,
      y,
      () => shouldHoldEarlyGrowthBook(ke) || env.CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER,
    )
  )
    addStartupContext({ early_skills_sync: 1 });
  let od =
    ((so && hasFreshGrowthBookFeatures()) || Wt) &&
    !pendingSettingsEnvBlocksEarlyGb(ke) &&
    !env.CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER &&
    lZs(getRootSession());
  setAutoMemoryToggleRecorder(saveAutoMemorySessionSwitch);
  let nd = setup(
    ho,
    Zn ? "default" : xe,
    Zn ? !1 : allowDangerouslySkipPermissions,
    ke,
    eo,
    An,
    sessionId ? Vt(sessionId) : void 0,
    kn,
    messagingSocketPath,
    S,
    y,
    ke && (cloudAttachId !== null || resumeInCloud !== null) && oRe(),
    !oo,
  );
  if (shouldFillPluginLoadWithStore(y) && !ke && !isBareMode() && !isSafeMode())
    loadAllPluginsCacheOnly(S, y).catch(() => {});
  if (!ke) warmCommandSourceCaches(ho, S);
  let rr = ke ? null : getAgentDefinitionsWithOverrides(ho, S);
  rr?.catch(() => {});
  let startTime_3 = performance.now();
  try {
    await nd;
  } catch (error) {
    if (error instanceof CliUserError) return cliError(error.message);
    throw error;
  }
  if (
    (Br("setup_ms", performance.now() - startTime_3, startTime_3),
    logForDebugging(`[STARTUP] setup() completed in ${Date.now() - now_2}ms`),
    profileCheckpoint("action_after_setup"),
    sessionId && E)
  ) {
    let { rekeySessionTeamAtStartup: rekeySessionTeamAtStartup } = await import("./chunk-6cc2zqkz.js");
    E = (await rekeySessionTeamAtStartup(S)) ?? E;
  }
  await nr();
  let J = getRootSession();
  VGt(J, toolPermissionContext);
  let sr = !!o.replayUserMessages;
  if (
    ((sr = shouldReplayUserMessages({
      replayUserMessagesFlag: sr,
      outputFormat: outputFormat,
      explicitSocketPath: messagingSocketPath,
      socketBound: udsEnv.CLAUDE_CODE_MESSAGING_SOCKET !== void 0,
    })),
    getIsNonInteractiveSession())
  ) {
    if (
      (applyConfigEnvironmentVariables(),
      releaseGrowthBookHold(J.host),
      (Us = await enforceOrgConfigGateHeadless(() => validateForceLoginOrg(y))),
      inputFormat === "stream-json")
    )
      armStartupWorkGate(J.host);
    if (Ct && !so) {
      so = !0;
      let s = judgeGrowthBookKick(Ct);
      if (s !== void 0) {
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
            { before: "before_growthbook_init", after: "after_growthbook_init" },
            s,
          ),
        };
      }
    }
    if (!isParkedSpare())
      if ($t) logForDiagnosticsNoPII("info", "git_status_skipped_headless_cloud_arm");
      else prefetchGitStatus(J);
    if (!isParkedSpare())
      if (!shouldPrefetchUserContext(Boolean(o.continue || o.resume))) getOrBuildUserContext(J, S, y);
      else startKeptProjectDetail(y);
    ensureModelStringsInitialized();
  }
  let So = o.name ? sanitizeSessionTitle(o.name) || void 0 : void 0;
  if (So) (cacheSessionTitle(So), cacheAgentName(So));
  let model = o.model,
    Yo = ke ? getCwd() : ho,
    Hs = !so ? judgeGrowthBookKick(Ct) : void 0;
  if (Hs !== void 0)
    rt = {
      site: "gb-before-tools",
      result: await ro(
        "growthbook_init_ms",
        { before: "before_growthbook_init", after: "after_growthbook_init" },
        Hs,
      ),
    };
  if (Ct)
    (Jhi(Wt),
      logEvent("tengu_startup_flag_fetch_wait", {
        waited: rt !== void 0,
        site: fromEnumOpt(rt?.site),
        wait_ms: Math.round(rt?.result.waitMs ?? 0),
        timed_out: rt?.result.timedOut ?? !1,
        fetched: hasFreshGrowthBookFeatures(),
        warm_wake_early_fetch: Wt,
        kick_from_init: env.CLAUDE_CODE_GROWTHBOOK_KICK_FROM_INIT,
        kick_on_warm_cache: env.CLAUDE_CODE_GROWTHBOOK_KICK_ON_WARM_CACHE,
        flag_fetch_kick: fromEnumOpt(Xhi()),
      }),
      (toolPermissionContext = {
        ...toolPermissionContext,
        chromeClassifierFloorEnabled: readChromeClassifierFloor(),
      }));
  await nr();
  let $s = j1t();
  if ($s) lLe(J, S, y);
  else if (getSkillsSyncVetoed()) (clearSkillCaches(), pruneSkillsSyncRoot(S).catch(logError));
  onSkillsSyncVetoChange();
  let rd = _rr();
  if ((primeSkillsListAskConversion(J, () => isAppliedListCurrent(y)), rd))
    (bet(J, y), syncClaudeAiMarketplaces(J, y, S));
  else if (getPluginsSyncVetoed()) pruneSyncedPluginsForClosedGate().catch(logError);
  else if (hii()) completeDeferredRemovals().catch(logError);
  if ((subscribeMemoryToggleRefresh(J), od)) refreshMemoryContext(J, { credentials: y, storageV5: S });
  else yVo(J, { credentials: y, storageV5: S });
  let Ws = ke ? null : getCommands(Yo, S);
  if ((Ws?.catch(() => {}), isXtermJs() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_thicket", !0)))
    cAi(!0);
  logForDebugging("[STARTUP] Loading commands and agents...");
  let now_3 = Date.now();
  if (shouldFillPluginLoadWithStore(y) && ke && !isBareMode() && !isSafeMode())
    loadAllPluginsCacheOnly(S, y).catch(() => {});
  let startTime_4 = performance.now();
  using id = artifactStartupModule?.holdArtifactStartupTelemetry();
  let qo = await loadAgentsForSession({
    cwd: Yo,
    toolPermissionContext: toolPermissionContext,
    applyCoordinatorFilter: !0,
    agentsJson: agents,
    agentSetting: agent,
    commandsPromise: Ws,
    agentDefsPromise: rr && agentReadForTheSeat(rr, ho, S),
    deferCommands: shouldSyncPluginInstall(j),
    onToolsLoaded: () => profileCheckpoint("action_tools_loaded"),
    storageV5: S,
  });
  Br("tools_commands_load_ms", performance.now() - startTime_4, startTime_4);
  let { tools: tools_2, mainThreadAgentDefinition: mainThreadAgentDefinition, commands: commands } = qo,
    {
      agentDefinitions: agentDefinitions,
      cliAgents: cliAgents,
      deferredCommandsPromise: deferredCommandsPromise,
    } = qo;
  if (
    agent &&
    !mainThreadAgentDefinition &&
    inputFormat !== "stream-json" &&
    agent !== CLAUDE_AGENT.agentType &&
    !o.resume &&
    !o.continue &&
    !env.CLAUDE_BG_POST_CLEAR_RESPAWN
  ) {
    let joined = agentDefinitions.activeAgents.map((activeAgent) => activeAgent.agentType).join(", ");
    return cliError(`--agent '${agent}' not found. Available agents: ${joined || "(none)"}`);
  }
  if (
    (addStartupContext({ tool_count: tools_2.length, skill_count: count(commands, isSkillToolCommand) }),
    deferredCommandsPromise?.then(
      (s) => addStartupContext({ skill_count: count(s, isSkillToolCommand) }),
      () => {},
    ),
    loadAllPluginsCacheOnly(S, y).then(
      (s) => addStartupContext({ plugin_count: s.enabled.length }),
      () => {},
    ),
    !mainThreadAgentDefinition &&
      isAgentSwarmsEnabled() &&
      ze?.agentId &&
      ze?.agentName &&
      ze?.teamName &&
      ze?.agentType)
  ) {
    let s = findAgentExcludingWebFetch(agentDefinitions.activeAgents, ze.agentType);
    if (s) ((mainThreadAgentDefinition = s), setMainThreadAgentType(s.agentType));
    else logForDebugging(`[teammate] Custom agent ${ze.agentType} not found in available agents`);
  }
  let ir = agent ?? (isCoworkAny() ? void 0 : getSettingsAfterPluginLoad("agent"));
  if (!mainThreadAgentDefinition && !agent && ir)
    ((mainThreadAgentDefinition = findSelectedAgent(agentDefinitions.activeAgents, ir)),
      setMainThreadAgentType(mainThreadAgentDefinition?.agentType));
  ((toolPermissionContext = withAgentDisallowedTools(
    toolPermissionContext,
    mainThreadAgentDefinition,
    "cliArg",
  )),
    logForDebugging(`[STARTUP] Commands and agents loaded in ${Date.now() - now_3}ms`),
    profileCheckpoint("action_commands_loaded"));
  let Ys;
  if (at) {
    let s = createSyntheticOutputTool(at);
    if ("tool" in s) {
      if (s.unsatisfiable)
        logForDebugging(
          `--json-schema: ${checkSchemaSatisfiable(s.unsatisfiable)}: ${s.unsatisfiable.message}`,
          { level: "warn" },
        );
      let tool = s.tool;
      if (isBgSession()) {
        let T = tool.call.bind(tool);
        tool = {
          ...tool,
          async call(R, L, Be, We, Co) {
            let U = await T(R, L, Be, We, Co),
              { stashBgStructuredResult: stashBgStructuredResult } = await import("./chunk-wd9kxbpn.js");
            return (stashBgStructuredResult(R), U);
          },
        };
      }
      ((Ys = tool),
        (tools_2 = [...tools_2, tool]),
        logEvent("tengu_structured_output_enabled", {
          schema_property_count: Object.keys(at.properties || {}).length,
          has_required_fields: Boolean(at.required),
        }));
    } else
      return (
        await logEventAsync("tengu_structured_output_failure", { error: lit("Invalid JSON schema") }),
        cliErrorAfterAnalyticsFlush(`Error: --json-schema is not a valid JSON Schema: ${s.error}`)
      );
  }
  if (mainThreadAgentDefinition)
    logEvent("tengu_agent_flag", {
      agentType: agentTypeForAnalyticsFromDefinition(mainThreadAgentDefinition),
      ...(agent && { source: lit("cli") }),
    });
  if (mainThreadAgentDefinition?.agentType) saveAgentSetting(mainThreadAgentDefinition.agentType);
  if (j && mainThreadAgentDefinition && !isBuiltInAgent(mainThreadAgentDefinition)) {
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
    if (typeof Ae === "string")
      Ae = initialPrompt.includes("{{intent}}")
        ? initialPrompt.split("{{intent}}").join(Ae)
        : Ae
          ? `${initialPrompt}

${Ae}`
          : initialPrompt;
    else if (!Ae) Ae = initialPrompt;
  }
  let cd,
    Ks = Boolean(o.continue || o.resume || (!j && o.fromPr) || teleport),
    lr,
    qs = !1;
  if (routineStartupModule)
    try {
      let routineStartupModel = await routineStartupModule.getRoutineStartupModel({
        routineName: o.routine?.trim(),
        userSpecifiedModel: model,
        agentModel: mainThreadAgentDefinition?.model,
        isSessionRestore: Ks,
        cwd: getProjectRoot(),
        storageV5: S,
      });
      if (routineStartupModel.status === "model") lr = routineStartupModel.model;
      else if (routineStartupModel.status === "transient_skip") qs = !0;
    } catch (error) {
      logError(error);
    }
  let dr = lr ?? mainThreadAgentDefinition?.model,
    startTime_5 = performance.now();
  (await ensureCatalogDecision({ headless: isPlainNonInteractive() }),
    Br("model_catalog_decision_ms", performance.now() - startTime_5, startTime_5));
  let cr;
  if (
    getIsNonInteractiveSession() &&
    !env.CLAUDE_CODE_SKIP_BEDROCK_AUTH &&
    !env.CLAUDE_CODE_SKIP_VERTEX_AUTH &&
    !env.CLAUDE_CODE_SKIP_MANTLE_AUTH
  )
    try {
      let { apply3PDefaultFallbacks: apply3PDefaultFallbacks } = await import("./chunk-kva132ev.js"),
        { lines: lines, mantleOverride: mantleOverride } = await apply3PDefaultFallbacks({
          pendingUserModel: model != null ? model : dr === "inherit" ? void 0 : dr,
        });
      cr = mantleOverride;
      for (let R of lines)
        process.stderr.write(`Warning: ${R}
`);
    } catch (error) {
      logError(error);
    }
  if (o.clientDataUrl) env.set("CLAUDE_CODE_CLIENT_DATA_URL", o.clientDataUrl);
  if (o.allowOtherModels) env.set("CLAUDE_CODE_ALLOW_OTHER_MODELS", !0);
  let Xs = await applyClientDataToSession({ runsOnAnotherMachine: oo });
  if (Xs !== void 0) return cliError(Xs);
  let {
      effectiveModel: effectiveModel,
      initialMainLoopModel: initialMainLoopModel,
      resolvedInitialModel: resolvedInitialModel,
      rawModelRequest: rawModelRequest,
      restrictedModel: restrictedModel,
      unservedModelSpelling: unservedModelSpelling,
    } = await collectModelOverrides({
      userSpecifiedModel: model,
      agentModel: dr,
      agentModelSource: lr !== void 0 ? "routine" : "agent",
      routineModelTransientlySkipped: qs,
      storageV5: S,
      credentials: y,
    }),
    pr = managedDenyStartupRefusal(resolvedInitialModel);
  if (pr !== null)
    return (
      printCliError(pr),
      await writeStartupFailureResult({
        sessionId: getSessionId(),
        message: pr,
        reason: "managed_settings_invalid",
      }),
      cliErrorAfterAnalyticsFlush()
    );
  if (cr && (effectiveModel == null || o.model === "default")) setMainLoopModelOverride(cr);
  let Qs = checkClientDataModelEntry();
  if (Qs !== void 0) return cliError(Qs);
  b8s(resolvedInitialModel, y, S);
  let Zs = resolveFallbackModels({
    cli: { fallbackModel: no },
    env: process.env,
    settings: getInitialSettings_2(),
  });
  (JEi(Zs ?? []), setRemoteFallbackLatch(no !== void 0 ? splitCommaList(no) : void 0));
  {
    let s = resolveEffortLevel({
        ...createSessionEffortState(o.effort),
        mainLoopModel: resolvedInitialModel,
      }),
      C = getEffortCapWarning(s, resolvedInitialModel);
    if (C !== null)
      reportStartupModelNotice(C, {
        key: "model-effort-cap",
        outputFormat: outputFormat,
        debugLine: `[effort] ${C}`,
      });
  }
  let Jo;
  if (isAdvisorToolEnabled()) {
    let advisor = o.advisor;
    if (advisor) {
      if (
        (logForDebugging(`[AdvisorTool] --advisor ${advisor}`),
        !baseModelSupportsAdvisor(resolvedInitialModel))
      ) {
        if (env.CLAUDE_CODE_SESSION_KIND !== "bg")
          return cliError(`Error: The model "${resolvedInitialModel}" does not support the advisor tool.`);
        logForDebugging(
          `[AdvisorTool] The model "${resolvedInitialModel}" does not support the advisor tool.`,
          { level: "warn" },
        );
      }
      let C = Bn(parseUserSpecifiedModel(advisor));
      if (!canUseAsAdvisor(C)) {
        let T = isAdvisorPendingConsent(C),
          R = T
            ? `${getAdvisorCreditsNotice(C)} Run ${getAdvisorModelSwitchCommand(C)}${j ? " in an interactive session" : ""} to review and enable.`
            : `Error: The model "${advisor}" cannot be used as an advisor.`;
        if (env.CLAUDE_CODE_SESSION_KIND !== "bg") {
          if (T)
            return (
              await logFeatureSadAsync(
                "advisor_fable_consent",
                j ? "noninteractive_set_blocked" : "interactive_launch_blocked",
              ),
              cliErrorAfterAnalyticsFlush(R)
            );
          return cliError(R);
        }
        logForDebugging(`[AdvisorTool] ${R}`, { level: "warn" });
      }
      if (!canAdviseModel(resolvedInitialModel, C)) {
        let T = `"${advisor}" cannot advise "${resolvedInitialModel}" (the advisor must be at least as capable as the main model). The advisor will not be used for the main model.`;
        if (!j || env.CLAUDE_CODE_SESSION_KIND !== "bg") warnStartupIssues(T);
        else logForDebugging(`[AdvisorTool] ${T}`, { level: "warn" });
      }
    }
    if (((Jo = advisor ?? getConfiguredAdvisorModel()), Jo))
      logForDebugging(`[AdvisorTool] Advisor model: ${Jo}`);
  }
  let mr = j && !$t ? filterAllowedSdkBetas(betas) : void 0,
    oi =
      cloudAttachId === null &&
      poolId === null &&
      remote === null &&
      !(Ks && !startupModelWinsOverSessionRestore()),
    ni = null;
  if (oi) {
    let s = buildUnknownModelNotice(resolvedInitialModel, Oo, mr),
      C = oneMillionContextNotice(resolvedInitialModel, Oo, mr);
    if (s !== null)
      ni = emitUnknownModelNotice(s, {
        interactive: !j && !oo,
        headless: (T) =>
          reportStartupModelNotice(T, { key: "model-context-window", outputFormat: outputFormat }),
      });
    else if (C !== null)
      reportStartupModelNotice(C, {
        key: "model-context-window",
        outputFormat: outputFormat,
        debugLine: `[autocompact] ${C}`,
      });
  }
  if (!oo)
    reportEnvWindow(env.CLAUDE_CODE_AUTO_COMPACT_WINDOW, {
      interactive: !j,
      headless: (s) =>
        reportStartupModelNotice(s, {
          key: "auto-compact-window-env",
          outputFormat: outputFormat,
          debugLine: `[autocompact] ${s}`,
        }),
    });
  if (
    (maybeActivateBrief(o),
    !getIsNonInteractiveSession() && !getUserMsgOptIn() && getInitialSettings_2().defaultView === "chat")
  ) {
    let { isBriefEntitled: isBriefEntitled } = require("./chunk-cv3kgbt2.js");
    if (isBriefEntitled()) setUserMsgOptIn(!0);
  }
  let yo,
    si = null,
    fd = hasSkipDangerousModePermissionPrompt();
  if (!j) {
    let s =
      (await h.runOnboarding?.({
        session: J,
        options: o,
        teleport: teleport,
        permissionMode: xe,
        toolPermissionContext: toolPermissionContext,
        storedTeammateOpts: ze,
        isSSHPending: Zn,
        allowDangerouslySkipPermissions: allowDangerouslySkipPermissions,
        commands: commands,
        skippedChromeForAdminPolicy: ks,
        enableClaudeInChrome: qt,
        chromeDeniedByPolicy: Bo,
        devChannels: po,
        offerClaudeInChrome: Gl,
        askCloudDefaultReason: El,
        wasTrustedBeforeSetup: xs,
        wasPersistedTrustedBeforeSetup: Fs,
        strictMcpConfig: it,
        mcpConfigPromise: fo,
        dynamicMcpConfig: Z,
        currentCwd: Yo,
        mcpConfigResolvedMs: Jn,
        providerSetupCommand: cd,
        remoteControlOption: Fo,
        remoteControl: Nn,
        projectForRemoteControl: projectForRemoteControl,
        mainThreadAgentDefinition: mainThreadAgentDefinition,
        inputPrompt: Ae,
        prompt: e,
        storageV5: S,
        credentials: y,
      })) ?? cliError("Interactive session requires the runOnboarding capability");
    releaseGrowthBookHold(J.host);
    let C = hasHeldGrowthBook(J.host) ? judgeGrowthBookKick(Ct) : void 0;
    if (C !== void 0) await ro("growthbook_init_ms", GROWTHBOOK_HOLD_STAGES, C);
    let endInkWithError = h.endInkWithError;
    (await enforceOrgConfigGateAtStartup({
      showBlockedScreen: h.showOrgConfigBlockedScreen,
      ...(endInkWithError !== void 0 && { printMessage: (L) => endInkWithError(s.root, L) }),
    }),
      (yo = { root: s.root, getFpsMetrics: s.getFpsMetrics, stats: s.stats }),
      (si = s.mcpApprovalSkipWarning),
      (Z = s.dynamicMcpConfig),
      (commands = s.commands),
      (Nn = s.remoteControl),
      (Ae = s.inputPrompt),
      (e = s.prompt),
      (fo = s.mcpConfigPromise));
    let R = settleProvisionalStartupMode(toolPermissionContext, {
      onNotification: (L) => {
        It ??= L;
      },
    });
    if (R !== toolPermissionContext) ((toolPermissionContext = R), (xe = R.mode));
  }
  if (((It ??= levelAutoHeldForPendingVerdictNotice()), process.exitCode !== void 0))
    return (
      logForDebugging("Graceful shutdown initiated, skipping further initialization"),
      { kind: "exited" }
    );
  if (canSkipGrowthBookHold(J, $s)) maybeStartLazyLoad(J, S, y);
  if ((initializeLspServerManager(J, S, y), yo)) {
    let { errors: errors } = getSettingsWithErrors_2(),
      C = Lgt(errors);
    if (C.length > 0 && (!_Ds() || !h.handleInvalidSettings)) logSkippedInvalidSetting(C);
    else if (C.length > 0 && h.handleInvalidSettings) {
      if ((await h.handleInvalidSettings(yo.root, C)) === "fix") {
        let { buildSettingsFixPrompt: buildSettingsFixPrompt } = await import("./chunk-n37wdxq8.js"),
          L = buildSettingsFixPrompt(C, {
            flagSettingsPath: getFlagSettingsExpectedContent() === void 0 ? getFlagSettingsPath() : void 0,
          });
        if (L)
          Ae = Ae
            ? `${L}

${Ae}`
            : L;
      }
    }
  }
  let fr = getFeatureValue_CACHED_MAY_BE_STALE("tengu_cicada_nap_ms", 0);
  Tdi(!isBareMode());
  let Qo = getGlobalConfig().startupPrefetchedAt ?? 0;
  if (!(isBareMode() || (fr > 0 && Date.now() - Qo < fr))) {
    let s = Qo > 0 ? ` last ran ${Math.round((Date.now() - Qo) / 1000)}s ago` : "";
    if (
      (logForDebugging(`Starting background startup prefetches${s}`),
      probeQuotaStatusAtStart(y, S).catch((C) => logError(C)),
      trackClientDataFetch(fetchBootstrapData(S, y)),
      qti(y, S),
      prefetchFastModeStatus(S, y),
      fr > 0)
    )
      saveGlobalConfig((C) => ({ ...C, startupPrefetchedAt: Date.now() }), S).catch(logError);
  } else {
    if (
      (logForDebugging(`Skipping startup prefetches, last ran ${Math.round((Date.now() - Qo) / 1000)}s ago`),
      !isBareMode() &&
        getAPIProvider() === "firstParty" &&
        bootstrapFetchCanConvergeSlot() &&
        !hasClientDataCacheSlot())
    )
      trackClientDataFetch(fetchBootstrapData(S, y));
    initFastModeOrgStatusGuess();
  }
  fo = mcpConfigsAfterWaits(fo, Yl, () =>
    Ds.then(() => getClaudeCodeMcpConfigs(Z, { storageV5: S, credentials: y })),
  );
  let { servers: servers } = await fo;
  if (
    (logForDebugging(`[STARTUP] MCP configs resolved in ${Jn.value}ms (awaited at +${Date.now() - now}ms)`),
    (Z = applyAgentModelOverride(Z, mainThreadAgentDefinition, {
      strictMcpConfig: it,
      onBlocked: (s) =>
        warnStartupIssues(
          `agent frontmatter MCP ${plural(s.length, "server")} blocked by enterprise policy: ${s.join(", ")}`,
          { stderrPrefix: "Warning: " },
        ),
    })),
    !restricted && !isBareMode() && shouldWireHostedDesktopComputerUse())
  ) {
    let { mcpConfig: mcpConfig, allowedTools: allowedTools } = getHostedDesktopComputerUseConfig();
    ((Z = { ...Z, ...mcpConfig }),
      (toolPermissionContext = withCliArgAllowRules(toolPermissionContext, allowedTools)));
  }
  let gd = !1;
  if (Object.keys(Z).length > 0 || gd) await awaitMcpPolicyColdStart({ hasDynamicMcpConfig: !0 });
  if (artifactsMcpLaptopModule !== null) {
    let artifactsMcpLaptopEntry = artifactsMcpLaptopModule.buildArtifactsMcpLaptopEntry({
      toolPermissionContext: toolPermissionContext,
      configuredNames: new Set([...Object.keys(Z), ...Object.keys(servers)]),
      fixedServerSet: it ? "strict_mcp_config" : doesEnterpriseMcpConfigExist() ? "managed_mcp_config" : null,
      allowedByPolicy: isMcpServerAllowedByPolicy,
    });
    if (artifactsMcpLaptopEntry !== null)
      Z = { ...Z, [artifactsMcpLaptopEntry.name]: artifactsMcpLaptopEntry.config };
  }
  if (j) {
    if ($t || !headlessSyncsClaudeAiConnectors()) markConnectorListUnavailable();
    else if (filterDynamicMcpServersByPolicy(Z).held.length > 0) await Go.catch(() => ({}));
  }
  let { configs: configs, blocked: blocked } = filterDynamicMcpServersByPolicy(Z),
    { allowed: allowed, blocked: blocked_2 } = filterMcpServersByPolicy(servers),
    Zo = [...blocked, ...blocked_2];
  if (Zo.length > 0) {
    if (
      (logForDebugging(
        `MCP ${plural(Zo.length, "server")} blocked by enterprise policy before prefetch: ${Zo.join(", ")}`,
        { level: "warn" },
      ),
      Zo.includes(CLAUDE_IN_CHROME_MCP_SERVER_NAME))
    )
      (markClaudeInChromeUnwired(),
        (commands = commands.filter(
          (s) =>
            !(s.name === CLAUDE_IN_CHROME_MCP_SERVER_NAME && s.type === "prompt" && s.source === "bundled"),
        )));
  }
  let en = { ...allowed, ...configs },
    create = Object.create(null),
    gr = {};
  for (let [s, C] of Object.entries(en)) {
    let T = C;
    if (T.type !== "sdk") gr[s] = T;
    else if (qkt(T)) create[s] = T;
    else
      logForDebugging(`MCP server "${s}" dropped: an sdk entry outside the SDK host's channel`, {
        level: "warn",
      });
  }
  if (env.CLAUDE_CODE_REMOTE && getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_startup_policy_seed", !0))
    toolPermissionContext = applyDynamicServerToolPolicies(toolPermissionContext, configs);
  (addStartupContext({ mcp_server_count: Object.keys(en).length }),
    profileCheckpoint("action_mcp_configs_loaded"));
  let yd = trackSessionSwitches({
    permissionMode: xe,
    dangerouslySkipPermissionsPassed: dangerouslySkipPermissions ?? !1,
    modeIsBypass: xe === "bypassPermissions",
    print: print ?? !1,
  });
  (maybeSwitchSessionForResume({
    resume: o.resume,
    forkSession: o.forkSession,
    hasSessionIdFlag: !!sessionId,
  }),
    id?.flush());
  let vd = getIsRemoteMode()
      ? mcpConfigIgnoredOnCloud({
          mcpConfigFlagServers: co,
          agent: mainThreadAgentDefinition,
          chromeFlag: Dt.chrome,
          dynamicMcpConfig: Z,
        })
      : [],
    resolved = Promise.resolve({ clients: [], tools: [], commands: [] }),
    bd = j
      ? Promise.resolve({ clients: [], tools: [], commands: [] })
      : Go.then((s) =>
          Object.keys(s).length > 0
            ? prefetchAllMcpResourcesSafe(s, S, y)
            : { clients: [], tools: [], commands: [] },
        ),
    Ed = Promise.all([resolved, bd]).then(([s, C]) => ({
      clients: [...s.clients, ...C.clients],
      tools: Ji([...s.tools, ...C.tools], "name"),
      commands: Ji([...s.commands, ...C.commands], "name"),
    }));
  hookSourcesSummary(mainThreadAgentDefinition);
  let kd =
    Ht || qe || To || j || o.continue || o.resume
      ? void 0
      : startHookRun("head", (s) =>
          runStartupHooks(J, {
            kind: "session-start",
            source: "startup",
            agentType: mainThreadAgentDefinition?.agentType,
            model: resolvedInitialModel,
            orphaned: s,
            storageV5: S,
            credentials: y,
          }),
        );
  Ed.catch(() => {});
  let wd = [],
    Ad = [],
    Td = [],
    Ue,
    vo = !1;
  if (o.thinking === "adaptive" || o.thinking === "enabled") ((Ue = { type: "adaptive" }), (vo = !0));
  else if (o.thinking === "disabled") ((Ue = { type: "disabled" }), (vo = !0));
  else {
    let s = process.env.MAX_THINKING_TOKENS
      ? parseIntLoose(process.env.MAX_THINKING_TOKENS)
      : o.maxThinkingTokens;
    if (s !== void 0) {
      if (s > 0) ((Ue = { type: "enabled", budgetTokens: s }), (vo = !0));
      else if (s === 0) ((Ue = { type: "disabled" }), (vo = !0));
    }
  }
  Ue ??= isBetaHeaderAllowed() ? { type: "adaptive" } : { type: "disabled" };
  let Rd = Ue.type !== "disabled",
    hr = isThinkingDisplayMode(o.thinkingDisplay) ? o.thinkingDisplay : void 0;
  if (Ue.type !== "disabled") {
    if (hr) setThinkingDisplayExplicit(!0);
    let s = getIsNonInteractiveSession(),
      C = outputFormat ?? "text",
      T = resolveThinkingDisplay({ explicitDisplay: hr, isNonInteractive: s, outputFormat: C, verbose: Ee });
    if (T) Ue.display = T;
    if (T === "omitted" && fno({ isNonInteractive: s, outputFormat: C, verbose: Ee }))
      Ue.displayExplicit = !1;
  } else if (
    fno({ isNonInteractive: getIsNonInteractiveSession(), outputFormat: outputFormat ?? "text", verbose: Ee })
  )
    ((Ue.display = "omitted"), (Ue.displayExplicit = !1));
  if (
    (logStartupStarted(),
    j8s(),
    registerCleanup(async () => {
      logForDiagnosticsNoPII("info", "exited");
    }),
    mergeSessionFlags({
      permissionMode: xe,
      bypassPermissionsAvailable: toolPermissionContext.isBypassPermissionsModeAvailable,
    }),
    Lci({
      isEgressRestricted: isSandboxEgressRestricted,
      isHostAllowlistEnforced: isSandboxHostAllowlistEnforced,
      areUnsandboxedCommandsAllowed: () => SandboxManager.areUnsandboxedCommandsAllowed(),
      isToolSandboxActive: isToolSandboxActive,
    }),
    ao)
  )
    logProactivityStartup({
      ...ao,
      entryMode: xe,
      entryModeDecidedByLevel: proactivity_2?.startupModeDecidedByProactivityLevel !== void 0,
    });
  let ci =
      cloudAttachId === null &&
      poolId === null &&
      remote === null &&
      !getIsRemoteMode() &&
      projectBrowse === null,
    ui = !ci ? void 0 : oi ? modelAttributionFields() : RESUME_MODEL_ATTRIBUTION,
    pi = !j && !Ee && Ie;
  if (
    (logTenguInit({
      host: J.host,
      storageV5: S,
      credentials: y,
      onAntSandboxDetection: yd.updateContext,
      hasInitialPrompt: Boolean(e),
      hasStdin: Boolean(Ae),
      verbose: Ee,
      focusView: pi,
      debug: debug,
      print: print ?? !1,
      outputFormat: outputFormat ?? "text",
      inputFormat: inputFormat ?? "text",
      numAllowedTools: allowedTools.length,
      numDisallowedTools: disallowedTools.length,
      restricted: restricted,
      mcpClientCount: Object.keys(en).length,
      mcpListSizing: vs,
      mcpConfigs: getIsRemoteMode() ? null : Object.values(en),
      worktreeEnabled: ke,
      skipWebFetchPreflight: getInitialSettings_2().skipWebFetchPreflight,
      githubActionInputs: env.GITHUB_ACTION_INPUTS,
      dangerouslySkipPermissionsPassed: dangerouslySkipPermissions ?? !1,
      permissionMode: xe,
      proactivityLevel: ao?.level,
      modeIsBypass: xe === "bypassPermissions",
      allowDangerouslySkipPermissionsPassed: allowDangerouslySkipPermissions,
      skipDangerousModePromptSetPreDialog: fd,
      systemPromptFlag: systemPrompt_2 ? (o.systemPromptFile ? "file" : "flag") : void 0,
      appendSystemPromptFlag: o.appendSystemPrompt ? "flag" : o.appendSystemPromptFile ? "file" : void 0,
      thinkingConfig: Ue,
      modelProvenance: ui,
      runsLocalQueryLoop: ci,
    }),
    !getIsRemoteMode() && !isParkedSpare())
  )
    logContextMetrics(J, gr, toolPermissionContext, getTools, S, y).catch((s) =>
      logError(withTelemetryMessage(toError(s), "context metrics failed")),
    );
  let mi = !1,
    Sr = async () => {
      if (mi) return;
      ((mi = !0),
        D0s(toolPermissionContext.alwaysAllowRules),
        logManagedSettingsLoaded(),
        await Omn(null, "initialization"));
    };
  if (j)
    holdForStartupWork(J.host, "permission_context_log", () => {
      Sr().catch(logError);
    });
  else (withTimeout_2(J).then(Sr).catch(logError), registerCleanup(() => Sr().catch(logError)));
  if (
    (createManagedSettingsReporter(),
    (getSessionRegistryState().restoreSetAsideName = (s, C) => {
      reclaimSessionNameOnResume(s, S, { autoOnly: C === "auto", source: C, yieldToLaterRestore: !0 });
    }),
    (isParkedSpare() ? Promise.resolve(!1) : registerSession(S)).then((s) => {
      if (!s) return;
      let C = getSessionId();
      (claimSessionNameAtStartup({
        sessionNameArg: So,
        sessionNameArgSource: envSessionKind() === void 0 ? "user" : "peer",
        interactive: envSessionKind() === void 0 && !getIsNonInteractiveSession(),
        writeName: async (T, R) => {
          await updateSessionName(
            T,
            S,
            R,
            R === "collision" ? getRegisteredSessionName()?.givenAtLaunch : !0,
          );
        },
        onRenamed: (T, R) => {
          let L = sanitizeSessionTitle(T);
          if (getSessionId() !== C) return;
          if (L && titleCacheStillOn(C, R, L)) (cacheSessionTitle(L), cacheAgentName(L));
        },
      }),
        countConcurrentSessions(S).then((T) => {
          if (T >= 2) logEvent("tengu_concurrent_sessions", { num_sessions: T });
        }));
    }),
    isBareMode())
  );
  else
    (holdForStartupWork(J.host, "plugin_init", (s) => {
      if (s === "shutdown") return;
      initPluginsAtStartup({ deferToCleanup: j, storageV5: S });
    }),
      profileCheckpoint("action_after_plugins_init"));
  let Od = Ht || qe ? "init" : To ? "maintenance" : null;
  if (Ht)
    return (
      applyConfigEnvironmentVariables(),
      await runStartupHooks(J, {
        kind: "setup",
        trigger: "init",
        forceSyncExecution: !0,
        storageV5: S,
        credentials: y,
      }),
      await runStartupHooks(J, {
        kind: "session-start",
        source: "startup",
        forceSyncExecution: !0,
        storageV5: S,
        credentials: y,
      }),
      gracefulShutdownSync(0),
      { kind: "exited" }
    );
  let fi = {
    allowedTools: allowedTools,
    appendSystemPrompt: appendSystemPrompt_2,
    appendSystemPromptCli: appendSystemPrompt,
    appendSystemPromptHead: Nl,
    asWrittenMcpEntries: uo,
    claudeaiConfigPromise: Go,
    cliAgents: cliAgents,
    credentials: y,
    currentCwd: Yo,
    debug: debug,
    jsonSchema: at,
    sdkUrl: Me,
    sessionMirror: sessionMirror,
    systemPrompt: systemPrompt_2,
    systemPromptCli: systemPrompt,
    thinkingConfig: Ue,
    thinkingConfigExplicit: vo,
    thinkingDisplayFlag: hr,
    thinkingEnabled: Rd,
    advisorModel: Jo,
    agentCli: agent,
    agentDefinitions: agentDefinitions,
    agentSetting: ir,
    autoCompactWindow: Oo,
    cloudAttachId: cloudAttachId,
    commands: commands,
    correlationId: correlationId,
    dangerouslySkipPermissions: dangerouslySkipPermissions,
    deferredCommandsPromise: deferredCommandsPromise,
    disableSlashCommands: Ro,
    dynamicMcpConfig: Z,
    earlyHydrateReads: Kl,
    earlyRemoteLink: ql,
    effectiveForwardSubagentText: Pn,
    effectiveIncludePartialMessages: Tn,
    effectiveModel: effectiveModel,
    effectiveReplayUserMessages: sr,
    fileDownloadPromise: gt,
    headlessCloud: headlessCloud,
    headlessCloudPrint: headlessCloudPrint,
    ide: ide,
    initialFocusView: pi,
    initialMainLoopModel: initialMainLoopModel,
    inputPrompt: Ae,
    isNonInteractiveSession: j,
    mainThreadAgentDefinition: mainThreadAgentDefinition,
    mcpApprovalSkipWarning: si,
    mcpClients: wd,
    mcpCommands: Td,
    mcpConfigFlagServers: co,
    mcpConfigOwnership: ownership,
    mcpTools: Ad,
    modelCli: model,
    modelProvenance: ui,
    outputFormat: outputFormat,
    permissionModeCli: lo,
    permissionModeNotification: It,
    permissionModeSuppliedOnInvocation: modeSuppliedOnInvocation,
    allowDangerouslySkipPermissions: allowDangerouslySkipPermissions,
    persistentVolume: persistentVolume,
    persistentVolumeFromSessionId: persistentVolumeFromSessionId,
    monorepo: monorepo,
    noMonorepo: noMonorepo,
    noMonorepoAsksTheService: noMonorepoAsksTheService,
    personal: personal,
    poolId: poolId,
    environmentQuery: environmentQuery,
    poolOnBranch: poolOnBranch,
    forwardHomeSettings: forwardHomeSettings,
    homeSettingsConsent: homeSettingsConsent,
    poolPromotedRemote: poolPromotedRemote,
    poolRef: poolRef,
    preDecorationInputPrompt: zl,
    proactivityLevel: hs,
    projectBrowse: projectBrowse,
    projectForRemoteControl: projectForRemoteControl,
    rawModelRequest: rawModelRequest,
    regularMcpConfigs: gr,
    relaunchFlagFetchSettled: Wt && rt !== void 0 && !rt.result.timedOut,
    remote: remote,
    remoteControl: Nn,
    remoteControlName: Ll,
    resumeInCloud: resumeInCloud,
    serveOnly: serveOnly,
    defaultedToCloud: os,
    cloudDefaultNotAllowed: ts,
    personalWithoutEffectNotification: vl,
    cloudSessionsByDefault: es,
    sandboxVmStayReason: bl,
    remoteDroppedMcpMessages: vd,
    resolvedInitialModel: resolvedInitialModel,
    resolvedMaxTurns: M,
    restrictedModel: restrictedModel,
    sdkBetas: mr,
    sdkMcpConfigs: create,
    session: J,
    sessionGroupingId: Fl,
    sessionNameArg: So,
    sessionStartHooks: kd,
    sessionTeamContext: E,
    setupTrigger: Od,
    storageV5: S,
    strictMcpConfig: it,
    structuredOutputTool: Ys,
    teleport: teleport,
    toolPermissionContext: toolPermissionContext,
    tools: tools_2,
    unknownModelWindow: ni,
    securityWarnings: _s,
    userSpecifiedFallbackModel: Zs,
    verbose: Ee,
    wasPersistedTrustedBeforeSetup: Fs,
    wasTrustedBeforeSetup: xs,
  };
  if (!yo) return { kind: "prepared-headless", ...fi, orgValidation: Us };
  return { kind: "prepared-interactive", ...fi, ...yo, terminalInput: stdinOverrideCache.get() };
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
function _Ds() {
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
