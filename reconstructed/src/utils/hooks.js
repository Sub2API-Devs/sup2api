/**
 * utils/hooks.ts
 *
 * 钩子执行主流程（按事件收集、匹配、运行、合并结果）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/hooks.ts
 * pieces: chunk-4nwcj4sh.js (2), chunk-7a5rgqvc.js (24), chunk-e6aww6q8.js (291), chunk-rxmpx0xj.js (1)
 * attribution: fingerprint 25, sole-consumer 36, placement 23, layout 150, affinity 6, facade-exports 78
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
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
  win32,
  win32 as win32_2,
  win32 as win32_3,
  win32 as win32_4,
  win32 as win32_5,
  win32 as win32_6,
  win32 as win32_7,
  win32 as win32_8,
} from "path";
import { spawn, spawn as spawn_2, spawn as spawn_3 } from "child_process";
import {
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
  homedir as homedir_6,
  homedir as homedir_7,
  homedir as homedir_8,
  homedir as homedir_9,
  homedir as homedir_10,
  homedir as homedir_11,
  homedir as homedir_12,
  tmpdir as tmpdir_2,
  tmpdir as tmpdir_3,
  tmpdir as tmpdir_4,
  tmpdir as tmpdir_5,
  tmpdir as tmpdir_6,
} from "os";
import {
  stat,
  stat as stat_2,
  stat as stat_3,
  stat as stat_4,
  stat as stat_5,
  stat as stat_6,
  stat as stat_7,
  stat as stat_8,
  stat as stat_9,
  stat as stat_10,
  stat as stat_11,
  stat as stat_12,
  stat as stat_13,
  stat as stat_14,
  stat as stat_15,
  stat as stat_16,
  stat as stat_17,
  stat as stat_18,
  stat as stat_19,
  stat as stat_20,
  stat as stat_21,
  stat as stat_22,
} from "fs/promises";
import {
  isDeepStrictEqual,
  isDeepStrictEqual as isDeepStrictEqual_2,
  isDeepStrictEqual as isDeepStrictEqual_3,
  isDeepStrictEqual as isDeepStrictEqual_4,
  isDeepStrictEqual as isDeepStrictEqual_5,
  isDeepStrictEqual as isDeepStrictEqual_6,
  isDeepStrictEqual as isDeepStrictEqual_7,
  isDeepStrictEqual as isDeepStrictEqual_8,
  isDeepStrictEqual as isDeepStrictEqual_9,
  isDeepStrictEqual as isDeepStrictEqual_10,
  isDeepStrictEqual as isDeepStrictEqual_11,
  isDeepStrictEqual as isDeepStrictEqual_12,
  isDeepStrictEqual as isDeepStrictEqual_13,
  isDeepStrictEqual as isDeepStrictEqual_14,
  isDeepStrictEqual as isDeepStrictEqual_15,
  isDeepStrictEqual as isDeepStrictEqual_16,
  isDeepStrictEqual as isDeepStrictEqual_17,
  isDeepStrictEqual as isDeepStrictEqual_18,
  isDeepStrictEqual as isDeepStrictEqual_19,
} from "util";
import { toolInputOf, m3t } from "../plugins/functionHooks/sites/toolSites.js";
import {
  MANAGED,
  firstWorktreePathOutput,
  runClassicEventThroughHooks,
  runOutsideReplHookChain,
} from "../plugins/functionHooks/classicHookBridge.js";
import { Rs } from "./hooks/hookSerialization.js";
import { createStepRecorder, ENGINE } from "../plugins/functionHooks/dispatch/chain.js";
import { CORE_ORIGIN } from "../plugins/functionHooks/eventPatterns.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { HooksError } from "../plugins/functionHooks/hooksErrors.js";
import { to } from "./valueSlot.js";
import { getPluginRegistry } from "./plugins/pluginLoadState.js";
import { isModuleAdmitted } from "./plugins/functionHooks/admission.js";
import { logError } from "./log.js";
import { IJ } from "./plugins/marketplaceNames.js";
import {
  managedModsPolicyKey,
  canSkipEmptyClassicDispatch,
  dispatchClassicEvent,
} from "../plugins/functionHooks/modAdmission.js";
import {
  shouldAllowManagedHooksOnly,
  shouldDisableAllHooksIncludingManaged,
  getHooksConfigFromSnapshot,
  getPolicyHooksFromSnapshot,
  withoutCheckoutSettingsHooks,
  getUserHooksFromSnapshot,
  shouldSkipSessionHooksByPolicy,
  shouldAllowManagedHooksOnlyByPolicy,
  Qmi,
  Jmi,
  getEffectiveStatusLine,
  areDeviceHooksStoodDown,
  areRepoHooksElsewhereStoodDown,
  shouldHoldDeviceHooksByPolicy,
  policySettingsUnreadable,
} from "./hooks/hooksConfigSnapshot.js";
import { isProMaxWithoutSettings } from "../services/remoteManagedSettings/seating.js";
import { withDeadline, sleep, Aa } from "./sleep.js";
import { K5r } from "./plugins/commandSource.js";
import {
  getMainThreadAgentHooks,
  getRegisteredHooks,
  isDiskless,
  getMcpClientsFromAccessor,
  getEnsureConnectedClient,
  getRootSession,
  getSessionCronTasks,
  getIsNonInteractiveSession,
  getMainThreadAgentType,
  getPromptId as getPromptId_2,
  getPluginHookRunner,
  getProjectConfigRoot,
  getHasStreamingInput,
  getBareMcpServerMatchersWarned,
  isCcsTenant,
  getOriginalCwdOrNull,
  getFlagSettingsInline,
  getAttestedOfficialPluginMarketplace,
  getFlagSettingsExpectedContent,
  getFlagSettingsFilePinnedContent,
  getSurfacedHookSpawnFailures,
  getStatsStore,
  takeSdkHostOutOfReachNote,
  isSyncedPluginDirUnused,
} from "../bootstrap/state.js";
import { GUARD_HOOK_EVENTS } from "../schemas/hookEntryValidation.js";
import { shouldLoadPermissionRules, settingsGrantsConfined } from "./permissions/permissionsLoader.js";
import { narrowerMode, isComputerUseTool, isAutoAllowedInMode } from "./permissions/browserToolNames.js";
import {
  createHookJsonReader,
  findSyncJsonAnswer,
  parseAsyncHookOutput,
  hasUnparsedJsonLine,
  createJsonParseBudget,
  validateHookJsonOutput,
  CAn,
  mnt,
  PAn,
} from "./hooks/hookOutputParsing.js";
import { logForDebugging, createAttachmentMessage_2 } from "./debug.js";
import { jsonStringify, jsonParse, slowLogging, jsonParseRaw } from "./slowOperations.js";
import {
  restrictHookOutputForMcpInbound,
  KBr,
  z1e,
  getToolNameField,
  W1e,
  F1e,
} from "./hooks/hookEventHelpers.js";
import {
  errorMessage,
  isAbortError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  withTelemetryMessage,
  getErrnoCode,
  StreamClosedAbortError,
} from "./errors.js";
import { finalizeHook, registerPendingAsyncHook } from "./hooks/AsyncHookRegistry.js";
import { env } from "./env.js";
import { S7r } from "../tools/AgentTool/backgroundGates.js";
import { wU, aO, pnt, runHooksWithConcurrencyLimit, SAn } from "./hooks/hookConcurrency.js";
import { endActivity, startSessionActivity } from "./sessionActivity.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import {
  isRunnerDynamicServer,
  sanitizeToolNameForAnalytics,
  isToolDetailsLoggingEnabled,
} from "../services/analytics/metadata.js";
import { Zl } from "../services/mcp/cliOwnedClients.js";
import {
  refusesRemoteBrowserCallOutsideChecks,
  isRemoteBrowserToolUnderModeFloor,
} from "./permissions/remoteBrowser.js";
import {
  TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  USER_PROMPT_SUBMIT_HOOK_TIMEOUT_MS,
  startHookProgressInterval,
  TOOL_HOOK_EVENTS,
  emitHookResponse_2,
} from "./hooks/hookEvents.js";
import { releaseMcpCgroupAtHookFire } from "./hooks/mcpToolHookCgroup.js";
import { HOOK_EVENT_NAMES, xvt } from "./hooks/hookEventSets.js";
import { getConnectionTimeoutMs } from "../services/mcp/client.js";
import { isConnectedOrCached } from "../skills/bundled/scheduleRemoteAgents.js";
import { createCombinedAbortSignal } from "./combinedAbortSignal.js";
import {
  isMemoryToolServer,
  MEMORY_CALLER_META_KEY,
  truncateMiddle as truncateMiddle_2,
} from "../memdir/memoryTool.js";
import { pVo, accountMemoryServerState } from "../services/accountMemory/accountMemoryServer.js";
import { WZn } from "../services/accountMemory/memoryContext.js";
import { callMcpTool } from "../services/mcp/mcpWireUtils.js";
import { stripPrefix, truncateToLength, truncateWithCount, getFirstLine, Mu, plural } from "./stringUtils.js";
import { uniq, count } from "./collections.js";
import { isDelegatedObservationContext, mainAgentContext, isSubagentContext } from "./agentContext.js";
import { SIt } from "../constants/outputLimits.js";
import {
  hq,
  enqueueHookTaskNotification,
  scrubHookOutputTags,
  TA,
  trackRunningHooks,
  hostNoResponseMessage,
  OUt,
} from "./hooks/hookMessages.js";
import { invalidateSessionEnvCache, getHookEnvFilePath } from "./sessionEnvironment.js";
import { pu } from "../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { LE, HOOK_AGENT_ID_PREFIX } from "./agentId.js";
import {
  getCurrentSessionTitle,
  getAgentTranscriptPath,
  getTranscriptPathForSession,
} from "./sessionStorage.js";
import { waitForTaskCompletion } from "../tools/TaskOutputTool/TaskOutputTool.js";
import { taskKindLabel } from "../tasks/taskKinds.js";
import { extractTextContent_2, getLastAssistantMessage, hookFeedbackText } from "./messages.js";
import { isWebFetchSubagentContext } from "../tools/WebFetchTool/harnessNotes.js";
import {
  awaitHooksRespawnUnlessSessionEnd,
  hookMembersFor,
  hookOriginFromStack,
} from "../plugins/functionHooks/hookDispatch.js";
import { Wrs } from "../plugins/functionHooks/sites/siteRules.js";
import {
  getToolPermissionContext,
  isSessionHoldFor,
  getEffortLayerOverride,
} from "./permissions/toolPermissionContext.js";
import {
  isBypassPermissionsInEffect,
  holdToolCallForHookPolicy,
  p$t,
  withHeldPermissionBehavior,
  maybeWaitForHookPolicy,
} from "./hooks/hookPolicyHold.js";
import { findToolByName, getRemoteHookRunner } from "../Tool.js";
import { registerAgent } from "./telemetry/perfettoTracing.js";
import { XAn } from "../plugins/functionHooks/sites/sessionSites.js";
import { hasModuleHookingSite } from "../plugins/hooksModules/loadedModuleFilters.js";
import { isPlainObject as isPlainObject_4 } from "./isPlainObject.js";
import { mcpServerIdentityForHooks } from "../services/mcp/fileReference/fileReferencePolicy.js";
import {
  hasWorktreeCreateHook,
  hasWorktreeRemoveHook as hasWorktreeRemoveHook_2,
} from "./hooks/worktreeHooks.js";
import { F3, Cht } from "../plugins/functionHooks/toolCallHooks.js";
import { getCwd, gl } from "./cwd.js";
import { xo, SessionRootSlot, cke } from "../bootstrap/sessionSlices.js";
import { IMe, Yg } from "../remote/remoteMode.js";
import {
  hasWorktreeRemoveHook,
  emitHookResponse,
  promptEndingFields,
  emitHookStarted,
  shouldRunSessionEndHook,
} from "../entrypoints/sdk/coreSchemas.js";
import { pathPresence, pathExists } from "./fsSafety/atomicWriteStaging.js";
import { printableLabel } from "./printableName.js";
import { AQ, RXt } from "./settings/managedSettingsFiles.js";
import {
  isSyncHookJSONOutput,
  hookJSONOutputSchema,
  isAsyncHookJSONOutput,
  isSyncHookJSONOutput_2,
} from "../types/hooks.js";
import {
  detectMissingHookScript,
  rememberBounded,
  YBr,
  describeNoBashFallback,
  pjt,
  INSTALL_GIT_FOR_WINDOWS,
  NO_BASH_FIX_HINT,
  expandHookPathVariables,
  _Ht,
  mergeHookEnv,
  resolveHookProgramOnPath,
  resolveOptions,
  realpathAllowMissing,
  resolveProgramOnPathInReach,
  resolveHookCommand,
  $2e,
} from "./hooks/hookCommandResolution.js";
import { isProjectScopeTrustAccepted, checkHasTrustDialogAccepted } from "./config.js";
import { resolveEffortLevel, modelSupportsEffort, getEffortLevelOrHigh } from "./effort.js";
import { isScratchpadEnabled, getScratchpadDir } from "./permissions/filesystem.js";
import { isHttpMcpServeInvocation } from "../entrypoints/mcpServeArgs.js";
import { HostScoped, mergeClients as mergeClients_3 } from "./hostScoped.js";
import { logEvent } from "../services/analytics/index.js";
import {
  fromEnum,
  lit as lit_2,
  pluginIdForAnalytics_GATE_EVALUATED,
  concatSafe,
} from "../services/analytics/safeMetadata.js";
import { renderTerminalSequences } from "./hooks/terminalSequence.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import {
  parseVersionCachePath,
  ensurePluginDataDir,
  pluginDataDirPath,
} from "./plugins/pluginDirectories.js";
import { projectPluginCacheDir } from "./plugins/pluginCachePaths.js";
import {
  blockingErrorResult,
  LHt,
  W0,
  DHt,
  I7,
  hookResolutionFaultMessage,
  Hge,
  describeKillSwitchedHook,
  unserializableInputBlockMessage,
  qWe,
  NBr,
} from "./hooks/hookPolicy.js";
import {
  logFeatureBad,
  hookFeature,
  logFeatureOk,
  logFeatureSad,
} from "../services/analytics/featureTelemetry.js";
import { getHookDisplayText, getHookStatusText, getHookProgressDisplay } from "./hooks/hooksSettings.js";
import { removeClaudeCodeHintLines } from "./claudeCodeHints.js";
import { Tv } from "./disklessSession.js";
import { getPlatform } from "./platform.js";
import { defaultShellKind } from "./shell/shellToolUtils.js";
import {
  loadPluginOptions,
  hasUserConfigVariables,
  substituteUserConfigVariables,
} from "./plugins/pluginOptionsStorage.js";
import { stripShellQuotes, prependDirToPathEnv } from "./path.js";
import { Fge, j0, IHt, zWe, applyRemoteHookInputRewrite } from "./hooks/hookInputRewrite.js";
import { subprocessEnv, hipaaWithholdsChildCredentials } from "./subprocessEnv.js";
import { hostOwnedEnvNames } from "./plugins/securityDefaultPlugin.js";
import { getGlobBaseDirectory } from "./shell/bashProvider.js";
import { claudeSubprocessEnv, claudeEnvContextFrom } from "./claudeSubprocessEnv.js";
import { checkPluginBunOptions } from "./permissions/protectedSettingsPaths.js";
import {
  SCRIPT_HOOK_ACK_ENV,
  expandScriptHookPathVars,
  anchorScriptHookPath,
  XVo,
} from "./hooks/scriptHooks.js";
import { shellQuoteArgs } from "./bash/bashPipeCommand.js";
import {
  findPowerShellForEnv,
  getWindowsEnvPaths,
  getCachedPowerShellPath,
} from "./shell/powershellDetection.js";
import { EHt, requiresScriptFile, H3n } from "./shell/powershellProvider.js";
import {
  mayBlockForMissingBash,
  T1e,
  R1e,
  VBt,
  E1e,
  XBt,
  isDenyDecisionOutput,
  b1e,
  Vge,
  summarizeHookFailures,
  applyBlockOnFailure,
} from "./hooks/hookFailures.js";
import { getGitBashPathCached } from "./windowsPaths.js";
import { TaskOutput } from "./task/TaskOutput.js";
import { wrapSpawn } from "./ShellCommand.js";
import {
  permissionRuleValueFromString,
  canonicalToolName,
  legacyToolNamesFor,
  toolNameVariants,
  aliasesFor,
} from "./permissions/permissionRuleParser.js";
import { Pz, getCommandAndDescription, PBr, J0t } from "./hooks/hookMatchers.js";
import { hookModelMatchKey, isRecognizedModelKey } from "./model/canonicalModelName.js";
import { qao } from "../services/mcp/serverIdentity.js";
import { checkHookMatcherForCloud, xpe } from "./hooks/matcherGrammar.js";
import { Yeo } from "./hooks/functionHookMatchers.js";
import { YWe, hookNotRunNotice, jBr } from "./hooks/servedHooks/notices.js";
import { normalizeCommandForPlatform, isAbsolutePlatformPath } from "./git.js";
import { SETTING_SOURCES, REPO_DIR_SETTING_SOURCES } from "./settings/constants.js";
import { getLatchedPreSettingsEnvSnapshot, settingsEnvForHookChild } from "./managedEnvApply.js";
import {
  getSettingsForSource,
  getSettingsFilePathForSource,
  getPolicySettingsLoadErrors,
  getSettings_DEPRECATED,
} from "./settings/settings.js";
import { m_ } from "./settings/stickyRoots.js";
import { PathSpace } from "./resultError.js";
import { p1e } from "./hooks/servedHooks/hostPaths.js";
import { getFsImplementation } from "./fsOperations.js";
import { analyzeHookCommand, POSIX_SEP } from "./hooks/hookCommandAnalysis.js";
import { getLaunchCommand } from "./deepLink/registerProtocol.js";
import { isPersonalConfigRestricted } from "./personalConfigRestriction.js";
import { parseHookJsonOutput } from "./hooks/hookSpecificOutput.js";
import { getProcessEnvForHttpHook, execHttpHook } from "./hooks/execHttpHook.js";
import { Ebr, hao } from "./settings/managedEnvKeys.js";
import { isOfficialMarketplaceName_3 } from "./plugins/pluginIdentifier.js";
import { SYNCED, recordPluginUsage, buildPluginEventFieldsFromId } from "./telemetry/pluginTelemetry.js";
import { usesSessionAccessToken } from "./sessionAccessToken.js";
import { isFirstPartyProvider } from "./model/providers.js";
import { isEssentialTrafficOnly } from "./privacyLevel.js";
import { isClaudeAISubscriber, getClaudeAIOAuthTokens, getAnthropicApiKey } from "./auth.js";
import { loginToHandOn } from "./auth/launcherHostLogin.js";
import { logOTelEvent } from "./telemetry/events.js";
import {
  getEligibilityMemo,
  getLastLoadStatus,
} from "../services/remoteManagedSettings/remoteSettingsState.js";
import { isCcsCoworkSurface, isCoworkAny } from "./entrypointKinds.js";
import { filterHooksByManagedHold } from "./hooks/managedHooksOnly.js";
import { groupBySource } from "../components/ContextVisualization.js";
import { isTerminalShutdown, heldUntilExit } from "./terminalShutdown.js";
import { isAttachServeMode } from "../cli/headlessCloud/attachServe.js";
import { isDeviceOwnedHook } from "./hooks/deviceHooks/templates.js";
import { gn } from "./shortHash.js";
import { resolveHookPermissionResult } from "./hooks/hookPermissionResult.js";
import { isWebToolRestrictedInRelay, Mar } from "./permissions/permissionRulePayload.js";
import { mcpInfoFromString } from "../services/mcp/mcpStringUtils.js";
import { mUt } from "./permissions/mcpRuleMatching.js";
import { Yui, requiresClassifierForHookAllow } from "./permissions/permissionSetup.js";
import { isAutoClassifierActive } from "./permissions/autoModeState.js";
import { countByPluginKey } from "../services/plugins/pluginOperations.js";
import { hashEntries } from "./model/modelCatalog/maskedIds.js";
import { persistLargeHookOutput, isPersistedHookOutputPath } from "./toolResultStorage.js";
import { isBetaTracingEnabled } from "./telemetry/betaSessionTracing.js";
import { isPerfettoTracingEnabled, startHookSpan, endHookSpan } from "./telemetry/sessionTracing.js";
import { isSafeMode } from "./envUtils.js";
import { recordPluginActivity } from "./pluginActivity.js";
import { pinHookCommand } from "./hooks/servedHooks/hookPins.js";
import { ec } from "./timerDelayClamp.js";
import { execPromptHook } from "./hooks/execPromptHook.js";
import { execAgentHook } from "./hooks/execAgentHook.js";
import { sequential } from "./sequential.js";
import { isFlagSettingsSyncHook } from "./hooks/hookSettingsSources.js";
import { n6e } from "./hooks/sessionHooks.js";
import { all } from "./generators.js";
import { q0 } from "./permissions/classifierHostContext.js";
import { KE } from "../components/fleet/sessionAttention.js";
import { isCustomizationDisabled } from "./settings/customizationDisabled.js";
import { BPe } from "./plugins/managedPlugins.js";
import { getPolicyAllowedSet } from "./plugins/pluginPolicy.js";

//@ chunk-e6aww6q8.js:743796-743834 sole-consumer
var PERMISSION_DECISION_RANK = { deny: 3, ask: 2, allow: 1, none: 0 };
//@ chunk-e6aww6q8.js:743834-744006 affinity
function keepAskAndContext(e) {
  let n = e.ask === void 0 ? {} : { ask: e.ask };
  if (e.updatedInput) n.updatedInput = e.updatedInput;
  if (e.additionalContext) n.additionalContext = e.additionalContext;
  return n;
}
//@ chunk-e6aww6q8.js:744006-744067 fingerprint = getPreToolHookBlockingMessage (1)
function getPreToolHookBlockingMessage(hookName, blockingError) {
  return `${hookName} hook error: ${blockingError.blockingError}`;
}
/**
 * 匹配「PreToolUse:<tool> hook error: [...]: 」前缀的正则，用于剥离嵌套错误前缀。
 */
//@ chunk-e6aww6q8.js:744067-744161 layout
var PRE_TOOL_HOOK_ERROR_PREFIX_RE =
  /^(PreToolUse:\S+ hook error: )\[(?:[^[\]]|\[[^[\]]*\])*\]: \s*(?=\S)(?![\s\S]*\]: )/;
//@ chunk-e6aww6q8.js:744161-744309 layout
function getCloudDeferUnsupportedMessage(e) {
  return `A PreToolUse hook (${e}) deferred this call; deferral is not supported for calls served to a cloud session, so nothing ran.`;
}
/**
 * 合并一串 PreToolUse 钩子结果：deny > ask > allow，blockingError 视为 deny，defer 和其他字段转交回调；返回 {deny|ask|allow, updatedInput, additionalContext}。
 */
//@ chunk-e6aww6q8.js:744309-745372 layout
async function aggregatePreToolHookResults(e, n, r) {
  let s = { kind: "none" },
    h,
    y;
  for await (let Z of e) {
    let {
      permissionBehavior: permissionBehavior,
      hookPermissionDecisionReason: hookPermissionDecisionReason,
      heldForServedCall: heldForServedCall,
      blockingError: blockingError,
      updatedInput: updatedInput,
      rewriterKind: rewriterKind,
      additionalContexts: additionalContexts,
      permissionDisplay: permissionDisplay,
      hookPluginId: hookPluginId,
      ...lt
    } = Z;
    if (blockingError && !(blockingError.hookDidNotFinish && s.kind === "deny"))
      s = { kind: "deny", reason: getPreToolHookBlockingMessage(`PreToolUse:${n}`, blockingError) };
    let Je = PERMISSION_DECISION_RANK[s.kind];
    switch (permissionBehavior) {
      case "deny":
        if (Je < PERMISSION_DECISION_RANK.deny)
          s = { kind: "deny", reason: hookPermissionDecisionReason ?? "denied" };
        break;
      case "ask":
        if (Je < PERMISSION_DECISION_RANK.ask)
          s = { kind: "ask", reason: hookPermissionDecisionReason ?? "", held: heldForServedCall === !0 };
        break;
      case "allow":
        if (Je < PERMISSION_DECISION_RANK.allow) s = { kind: "allow" };
        break;
      case "defer":
        r({ permissionBehavior: permissionBehavior, hookSource: lt.hookSource });
        break;
      case "passthrough":
      case void 0:
        break;
    }
    if (updatedInput) h = updatedInput;
    if (additionalContexts && additionalContexts.length > 0) y = (y ?? []).concat(additionalContexts);
    if (Object.keys(lt).some((pt) => pt !== "hookSource")) r(lt);
  }
  let S = s;
  if (S.kind === "ask" && S.held) r({ heldForServedCall: !0, hookPermissionDecisionReason: S.reason });
  let w = S.kind === "deny",
    L = S.kind === "ask",
    G = S.kind === "allow",
    q = w ? { deny: S.reason } : L ? { ask: S.reason } : G ? { allow: !0 } : {};
  if (h) q.updatedInput = h;
  if (y) q.additionalContext = y;
  return q;
}
/**
 * 跑一轮 PreToolUse 钩子并收集：合并结果、原样 yields、唯一的 ask、输入改写记录；钩子流抛错时把 deny 原因交给回调后再抛。
 */
//@ chunk-e6aww6q8.js:745372-745846 layout
async function collectPreToolHookPass(e, n, r) {
  let s = [],
    h = [],
    y = [],
    S = [],
    w = await aggregatePreToolHookResults(
      (async function* () {
        try {
          for await (let G of e) {
            if (G.permissionBehavior === "ask") h.push(G);
            if (G.updatedInput !== void 0) y.push({ kind: G.rewriterKind ?? "remote", source: G.hookSource });
            yield G;
          }
        } catch (error) {
          S.push(error);
        }
      })(),
      n,
      (G) => {
        s.push(G);
      },
    );
  if (S.length > 0) {
    if (typeof w.deny === "string") r?.({ thrown: S[0], deny: w.deny });
    throw S[0];
  }
  let L = h.length === 1 ? h[0] : void 0;
  return { result: w, yields: s, ...(L && { soleAsk: L }), ...(y.length > 0 && { rewrites: y }) };
}
//@ chunk-e6aww6q8.js:745846-746024 layout
var createCorePreToolStage = (e, n, r, s) => ({
  name: "core",
  isCore: !0,
  budgetMs: 0,
  async run(h) {
    let y = toolInputOf(h);
    s(void 0);
    let S = await collectPreToolHookPass(e(y, { managedHooksExcluded: n(y) }), h.tool, s);
    return (r.keep(y, S), S.result);
  },
});
//@ chunk-e6aww6q8.js:746024-746431 layout
function mergePreToolStageResults(e, n) {
  let r = typeof n.deny === "string",
    s = typeof n.ask === "string",
    h = r ? n.deny : e.deny,
    y = s ? n.ask : e.ask,
    S = typeof h === "string",
    w = typeof y === "string",
    L = e.allow === !0 || n.allow === !0,
    G = S ? { deny: h } : w ? { ask: y } : L ? { allow: !0 } : {},
    q = n.updatedInput ?? e.updatedInput;
  if (q) G.updatedInput = q;
  if (e.additionalContext || n.additionalContext)
    G.additionalContext = (e.additionalContext ?? []).concat(n.additionalContext ?? []);
  return G;
}
//@ chunk-e6aww6q8.js:746431-746794 layout
var createManagedPreToolStage = (e, n) => ({
  name: MANAGED,
  isManaged: !0,
  budgetMs: 0,
  async run(r, s) {
    let h = toolInputOf(r);
    n.pass ??= await collectPreToolHookPass(e(h, { managedHooksOnly: !0 }), r.tool);
    let y = n.pass.result;
    if (y.deny !== void 0) return y;
    let updatedInput = y.updatedInput;
    n.passedKey = Rs(updatedInput ?? h);
    let L = await s(updatedInput === void 0 ? r : m3t(r.tool, r.tool_use_id, updatedInput)),
      G = L.updatedInput !== void 0 && Rs(L.updatedInput) !== n.passedKey;
    return mergePreToolStageResults(G ? keepAskAndContext(y) : y, L);
  },
});
//@ chunk-e6aww6q8.js:746794-746939 layout
function createManagedStageController(e, n) {
  let r = { pass: n, passedKey: void 0 };
  return {
    managed: createManagedPreToolStage(e, r),
    pass: () => r.pass,
    covers: (s) => r.passedKey !== void 0 && Rs(s) === r.passedKey,
  };
}
//@ chunk-e6aww6q8.js:746939-747101 layout
function createCoreStageController(e, n) {
  let r = createStepRecorder(),
    s;
  return {
    core: createCorePreToolStage(e, n, r, (y) => {
      s = y;
    }),
    runs: r,
    deniedBefore: (y) =>
      s !== void 0 && typeof y === "object" && y !== null && s.thrown === y ? s.deny : void 0,
  };
}
//@ chunk-e6aww6q8.js:747101-747126 layout
var getPreToolStageOrder = () => [CORE_ORIGIN, MANAGED, ENGINE];
//@ chunk-e6aww6q8.js:747126-747137 layout
var FRESH_HERON_DEFAULT = !0;
/**
 * GrowthBook 开关 tengu_fresh_heron（默认开）。
 */
//@ chunk-e6aww6q8.js:747137-747181 layout
var isFreshHeronEnabled = () =>
  getFeatureValue_CACHED_MAY_BE_STALE("tengu_fresh_heron", FRESH_HERON_DEFAULT) !== !1;
//@ chunk-e6aww6q8.js:747181-747270 layout
class NotOrganizationPluginError extends HooksError {
  constructor(e, n) {
    super(`${e}: not the organization's plugin: ${n}`);
  }
}
//@ chunk-e6aww6q8.js:747270-747328 layout
class HookAdmissionError extends HooksError {
  constructor(e, n) {
    super(`${e}: ${n}`);
  }
}
//@ chunk-e6aww6q8.js:747328-747349 layout
class HookAdmissionRefusal extends HookAdmissionError {}
//@ chunk-e6aww6q8.js:747349-747488 layout
var RESTRICT_PERSONAL_CONFIG_REASON =
  "it carries your claude.ai uploads, and this session doesn't let them run in-process hooks (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG)";
//@ chunk-e6aww6q8.js:747488-747501 layout
var moduleUnadmittedListener = to();
//@ chunk-e6aww6q8.js:747501-747514 layout
var admissionChangedListener = to();
//@ chunk-e6aww6q8.js:747514-747808 layout
function applyAdmissionText(e) {
  let n = getPluginRegistry();
  if (n.admissionText === e) return !1;
  n.admissionText = e;
  let filtered = n.loadedModules.filter((loadedModule) => !isModuleAdmitted(loadedModule));
  for (let s of n.loadedModules.filter(isModuleAdmitted)) s.judgedUnder = e;
  for (let s of filtered)
    try {
      moduleUnadmittedListener.get()?.(s.name);
    } catch (error) {
      logError(error);
    }
  if (filtered.length === 0) return !0;
  try {
    admissionChangedListener.get()?.();
  } catch (error) {
    logError(error);
  }
  return !0;
}
//@ chunk-e6aww6q8.js:747808-747879 layout
function computeAdmissionText() {
  if (!IJ()) return null;
  return Rs([
    managedModsPolicyKey(),
    shouldAllowManagedHooksOnly(),
    shouldDisableAllHooksIncludingManaged(),
    isProMaxWithoutSettings(),
  ]);
}
//@ chunk-e6aww6q8.js:747879-747929 layout
function refreshModAdmission() {
  let e = computeAdmissionText();
  return e !== null && applyAdmissionText(e);
}
//@ chunk-e6aww6q8.js:747929-748177 layout
var HOOKS_SKIPPED_AT_START_MESSAGE =
  "Mods and hooks you set up didn't run at the start of this session: your organization's settings hadn't been read yet. They run from here on where your organization allows them; hooks that run when a session starts didn't run in this one.";
/**
 * 组织设置读不到时，PreToolUse 钩子无法运行的提示文案（调用不被单独放行）。
 */
//@ chunk-e6aww6q8.js:748177-748351 layout
var HOOK_CHECK_UNAVAILABLE_MESSAGE =
  "A hook you set up to check this tool call isn't running, because your organization's settings couldn't be read. Without the hook the call isn't allowed on its own.";
//@ chunk-e6aww6q8.js:748351-748666 layout
var HOOKS_PENDING_POLICY_MESSAGE =
  "Mods and hooks you set up aren't running in this session yet, and neither are any checks they make on tool calls. Your organization's settings couldn't be read, so it isn't known whether it allows them. They'll start once the settings are read; hooks that run when a session starts won't run in this one.";
//@ chunk-e6aww6q8.js:748666-748813 layout
var MODS_OFF_POLICY_CHANGED_MESSAGE =
  "Mods you installed are off for now. Your organization's policy on mods changed, and they stay off until they've been checked against it.";
//@ chunk-e6aww6q8.js:748813-749005 layout
var SESSION_START_HOOKS_SKIPPED_REASON =
  "hooks a person set up are not run for this session's start: your organization's managed settings were not read when their fetch settled; hooks on later events run once they are read";
//@ chunk-e6aww6q8.js:749005-749197 layout
var MODS_POLICY_UNKNOWN_REASON =
  "this session has not read your organization's managed settings, so whether mods you installed may run here is not known; they stay out until it has; built-in plugins load regardless";
//@ chunk-e6aww6q8.js:749197-749428 layout
var HOOKS_POLICY_UNREADABLE_MESSAGE =
  "Mods and hooks you set up aren't running in this session, and neither are any checks they make on tool calls. This session can't read your organization's settings, so it isn't known whether your organization allows them.";
//@ chunk-e6aww6q8.js:749428-749551 layout
function notifyModsRejudged(e) {
  let n = getPluginRegistry(),
    any = n.loadedModules.some((loadedModule) => !isModuleAdmitted(loadedModule)),
    s = any && !n.isJudgedAgainTold;
  if (((n.isJudgedAgainTold = any), s)) e(MODS_OFF_POLICY_CHANGED_MESSAGE);
}
/**
 * managed settings 指纹变化后重新判定已加载的 mods，超时等待后通知用户被关掉的 mods。
 */
//@ chunk-e6aww6q8.js:749551-749767 layout
function rejudgeLoadedMods(e, n, r) {
  let s = getPluginRegistry();
  if (s.admissionText === null) return null;
  if ((refreshModAdmission(), s.loadedModules.every(isModuleAdmitted)))
    return ((s.isJudgedAgainTold = !1), null);
  return withDeadline(Promise.resolve().then(e).catch(logError), K5r, r)
    .then(() => notifyModsRejudged(n))
    .catch(logError);
}
//@ chunk-e6aww6q8.js:749767-749899 layout
var hasConfiguredHooksForEvent = (e) =>
  (getHooksConfigFromSnapshot()?.[e]?.length ?? 0) > 0 ||
  (getMainThreadAgentHooks()?.[e]?.length ?? 0) > 0 ||
  (getRegisteredHooks()?.[e] ?? []).some((n) => "pluginRoot" in n || "deviceOwner" in n);
/**
 * 钩子子进程退出后等待 stdio 安静的窗口（500ms）与上限（10s），以及 PROMPT_GUARD_EVENTS（输出不可信时按阻断处理的事件集合）。
 */
//@ chunk-e6aww6q8.js:749899-750089 layout
var STDIO_QUIET_WINDOW_MS = 500,
  STDIO_SETTLE_CAP_MS = 1e4,
  PROMPT_GUARD_EVENTS = new Set([
    ...GUARD_HOOK_EVENTS,
    "PreModelSwitch",
    "UserPromptSubmit",
    "UserPromptExpansion",
    "ConfigChange",
    "Elicitation",
    "ElicitationResult",
    "PostToolBatch",
    "TaskCreated",
    "PreCompact",
  ]);
/**
 * 子进程退出后等 stdout/stderr 结束或安静 quietWindowMs，总时长不超过 capMs；有数据持续到达则继续等。
 */
//@ chunk-e6aww6q8.js:750089-750383 layout
async function waitForStdioQuiet({
  streamsSettled: streamsSettled,
  lastDataAt: lastDataAt,
  holdOpen: holdOpen,
  quietWindowMs: quietWindowMs = STDIO_QUIET_WINDOW_MS,
  capMs: capMs = STDIO_SETTLE_CAP_MS,
  arm: arm,
  now: now = Date.now,
}) {
  let w = now(),
    L = streamsSettled.then(() => !0);
  for (;;) {
    let G = lastDataAt();
    if ((await withDeadline(L, quietWindowMs, arm)) || now() - w >= capMs) return;
    if (lastDataAt() !== G) continue;
    if (holdOpen?.()) continue;
    if ((await new Promise((Z) => setImmediate(Z)), lastDataAt() === G)) return;
  }
}
//@ chunk-e6aww6q8.js:750383-750474 layout
function getRunnerJsonStdout(e) {
  let n = e.resultStdout?.trim();
  return n !== void 0 && n.startsWith("{") ? n : void 0;
}
/**
 * Elicitation/ElicitationResult 钩子以 0、2 以外的码退出。
 */
//@ chunk-e6aww6q8.js:750474-750558 layout
function isElicitationFailureExit(e, n) {
  return n !== 0 && n !== 2 && (e === "Elicitation" || e === "ElicitationResult");
}
/**
 * 判断钩子截获输出是否不可信；Elicitation 系事件非 0/2 退出时改用 stderr 再判一次。
 */
//@ chunk-e6aww6q8.js:750558-750683 layout
function getUntrustedCaptureReason(e, n, r, s, h) {
  return (
    checkIncompleteCapture(e, n, r, s) ??
    (isElicitationFailureExit(n, e.status)
      ? checkIncompleteCapture({ ...e, resultStdout: void 0 }, n, e.stderr, h(e.stderr))
      : void 0)
  );
}
/**
 * stdio 未正常结束（stdioIncomplete/closedWithoutEnd）时，若输出不是惰性 JSON，返回拒绝采信的原因字符串。
 */
//@ chunk-e6aww6q8.js:750683-751435 layout
function checkIncompleteCapture(e, n, r, s) {
  if (e.status === 2 || e.aborted === !0) return;
  if (e.stdioIncomplete !== !0 && e.stdioClosedWithoutEnd !== !0) return;
  if ((s !== void 0 && isInertHookOutput(s, n, e.status)) || getRunnerJsonStdout(e) !== void 0) return;
  if (e.stdioClosedWithoutEnd)
    return "hook stdio closed before end-of-stream, so part of its output may have been discarded; refusing to read the capture as a clean verdict";
  if (s !== void 0)
    return "hook output parsed as a document that grants, rewrites or injects, but its stdio went quiet before end-of-stream and a dropped later document could have changed it; refusing to honor the suspect capture";
  if (r.trim().startsWith("{"))
    return "hook output opens a JSON payload that never completed before its stdio went quiet; refusing to read the partial capture as a verdict";
  return;
}
//@ chunk-e6aww6q8.js:751435-751759 layout
var INERT_TOP_LEVEL_OUTPUT_KEYS = new Set([
    "continue",
    "suppressOutput",
    "stopReason",
    "decision",
    "systemMessage",
    "terminalSequence",
    "reason",
    "metrics",
    "rewakeSummary",
    "hookSpecificOutput",
  ]),
  INERT_SPECIFIC_OUTPUT_KEYS = new Set([
    "hookEventName",
    "permissionDecision",
    "permissionDecisionReason",
    "additionalContext",
    "decision",
    "action",
    "content",
    "suppressOriginalPrompt",
    "retry",
  ]);
/**
 * 为 UserPromptSubmit/UserPromptExpansion 构造 decision:block + suppressOriginalPrompt 的输出。
 */
//@ chunk-e6aww6q8.js:751759-751934 layout
function buildPromptBlockOutput(e, n) {
  if (e !== "UserPromptSubmit" && e !== "UserPromptExpansion") return;
  return {
    decision: "block",
    reason: n,
    hookSpecificOutput: { hookEventName: e, suppressOriginalPrompt: !0 },
  };
}
//@ chunk-e6aww6q8.js:751934-752144 layout
var CONTEXT_ON_SUCCESS_EVENTS = new Set([
    "UserPromptSubmit",
    "UserPromptExpansion",
    "SessionStart",
    "PostModelSwitch",
  ]),
  BLOCK_AS_FEEDBACK_EVENTS = new Set([
    "Stop",
    "SubagentStop",
    "StopFailure",
    "TaskCompleted",
    "TeammateIdle",
    "PostToolUse",
    "PostToolUseFailure",
  ]);
/**
 * exit 2 且 stdio 不完整时，丢弃非惰性的 JSON 答复。
 */
//@ chunk-e6aww6q8.js:752144-752284 layout
function dropSuspectCaptureJson(e, n, r) {
  if (
    e.status === 2 &&
    (e.stdioIncomplete === !0 || e.stdioClosedWithoutEnd === !0) &&
    r !== void 0 &&
    !isInertHookOutput(r, n, e.status)
  )
    return;
  return r;
}
/**
 * 判断钩子 JSON 输出是否惰性（不批准、不阻断反馈类事件、不 allow/defer、不 accept、不 retry、不注入上下文），惰性输出即使截获不完整也可采信。
 */
//@ chunk-e6aww6q8.js:752284-752904 layout
function isInertHookOutput(e, n, r) {
  if ("async" in e) return !0;
  if (e.decision === "approve") return !1;
  if (e.decision === "block" && BLOCK_AS_FEEDBACK_EVENTS.has(n)) return !1;
  for (let h of Object.keys(e)) if (!INERT_TOP_LEVEL_OUTPUT_KEYS.has(h)) return !1;
  let hookSpecificOutput = e.hookSpecificOutput;
  if (hookSpecificOutput === void 0) return !0;
  if (
    "permissionDecision" in hookSpecificOutput &&
    (hookSpecificOutput.permissionDecision === "allow" || hookSpecificOutput.permissionDecision === "defer")
  )
    return !1;
  if ("decision" in hookSpecificOutput && hookSpecificOutput.decision.behavior === "allow") return !1;
  if ("action" in hookSpecificOutput && hookSpecificOutput.action === "accept") return !1;
  if ("retry" in hookSpecificOutput && hookSpecificOutput.retry === !0) return !1;
  if (
    "additionalContext" in hookSpecificOutput &&
    hookSpecificOutput.additionalContext !== void 0 &&
    !(r === 0 && CONTEXT_ON_SUCCESS_EVENTS.has(n))
  )
    return !1;
  for (let h of Object.keys(hookSpecificOutput)) if (!INERT_SPECIFIC_OUTPUT_KEYS.has(h)) return !1;
  return !0;
}
/**
 * 守卫类与反馈类事件的并集（去掉 PreToolUse、StopFailure）。
 */
//@ chunk-e6aww6q8.js:752904-752985 layout
var GUARD_AND_FEEDBACK_EVENTS = new Set(
  [...PROMPT_GUARD_EVENTS, ...BLOCK_AS_FEEDBACK_EVENTS].filter(
    (e) => e !== "PreToolUse" && e !== "StopFailure",
  ),
);
/**
 * 按代理的 hooks/plugin 决定权限模式（有钩子时用 mj 调整）。旧版名 hasHookForEvent 存疑。
 */
//@ chunk-e6aww6q8.js:752985-753062 fingerprint = hasHookForEvent (0.459)
var hasHookForEvent_2 = (e, n) =>
  shouldLoadPermissionRules(e.hooks, e.plugin) ? narrowerMode(e.permissionMode, n) : e.permissionMode;
/**
 * 后台 async 钩子结束后读取 stdout：解析 {async:true} 之后的 JSON 答复，finalize 并返回附件数据；无输出且成功时返回 null。
 */
//@ chunk-e6aww6q8.js:942378-943416 fingerprint = executeInBackground (0.417)
async function executeInBackground(e) {
  let { shellCommand: shellCommand } = e,
    stdout = await shellCommand.taskOutput.getStdout(),
    stderr = shellCommand.taskOutput.getStderr(),
    { code: code } = await shellCommand.result,
    y = {},
    S = !0;
  try {
    let w = createHookJsonReader(),
      L = findSyncJsonAnswer(stdout, w);
    if (L !== void 0) {
      logForDebugging(`Hooks: Found sync response from ${e.processId}: ${jsonStringify(L)}`);
      let G = parseAsyncHookOutput(L, e.hookName);
      ((S = Object.keys(G).length === 0), (y = restrictHookOutputForMcpInbound(G)));
    } else if (hasUnparsedJsonLine(stdout, w))
      logForDebugging(
        `Hooks: async hook ${e.processId} (${e.hookName}) printed a stdout line that begins with { but no JSON answer could be read. After any {"async":true} line, print one JSON object and nothing else, or put the object on one line.`,
        { level: "error" },
      );
  } catch (error) {
    logForDebugging(
      `Hooks: Failed to read the JSON answer of ${e.processId} (${e.hookName}), so it is dropped: ${errorMessage(error)}`,
      { level: "error" },
    );
  }
  if ((await finalizeHook(e, code, code === 0 ? "success" : "error"), S && code === 0 && !stderr.trim()))
    return (
      logForDebugging(
        `Hooks: ${e.processId} (${e.hookName}) produced no response payload \u2014 skipping attachment`,
      ),
      null
    );
  return {
    processId: e.processId,
    response: y,
    hookName: e.hookName,
    hookEvent: e.hookEvent,
    toolName: e.toolName,
    pluginId: e.pluginId,
    command: e.command,
    stdout: stdout,
    stderr: stderr,
    exitCode: code,
  };
}
//@ chunk-e6aww6q8.js:3409333-3409474 sole-consumer
var HOOK_DISPATCH_HOLD = "hook-dispatch-hold",
  OMr = 60000,
  YAn = 1200000,
  AN = () => {},
  IMr = new Set(["MessageDisplay", "SessionEnd", "PermissionRequest", "Notification"]);
/**
 * 远程会话开启保活时，在钩子执行期间维持会话活动：按钩子超时与并发批次估算上限时长，返回结束函数。
 */
//@ chunk-e6aww6q8.js:3409474-3410091 sole-consumer
function startHookKeepalive(e, n, r) {
  let holdMs;
  try {
    if (IMr.has(e) || !env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES) return AN;
    if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_hook_keepalive_enabled", !1) && !S7r()) return AN;
    let maxTimeoutMs = 0,
      agentHookCount = 0;
    for (let { hook: hook } of n) {
      let Z =
        hook.type === "function"
          ? (hook.timeout ?? r)
          : wU(hook)
            ? aO(hook, r)
            : hook.timeout
              ? hook.timeout * 1000
              : r;
      if (((maxTimeoutMs = Math.max(maxTimeoutMs, Z)), wU(hook))) agentHookCount++;
    }
    let max = Math.max(1, Math.ceil(agentHookCount / pnt));
    holdMs = Math.min((maxTimeoutMs + (agentHookCount > 0 ? r : 0)) * max + OMr, YAn);
  } catch (error) {
    return (logError(error), AN);
  }
  let active = !1,
    timer,
    release = () => {
      if (!active) return;
      active = !1;
      try {
        (clearTimeout(timer), endActivity("hook_exec", HOOK_DISPATCH_HOLD));
      } catch (error) {
        logError(error);
      }
    };
  try {
    (startSessionActivity("hook_exec", HOOK_DISPATCH_HOLD), (active = !0));
    let w = Number.isFinite(holdMs) ? holdMs : YAn;
    return ((timer = setTimeout(DMr, w, release, w)), timer.unref(), release);
  } catch (error) {
    return (logError(error), release(), AN);
  }
}
//@ chunk-e6aww6q8.js:3410091-3410140 sole-consumer
async function* QAn(e, n) {
  try {
    yield* e;
  } finally {
    n();
  }
}
//@ chunk-e6aww6q8.js:3410140-3410220 sole-consumer
function DMr(e, n) {
  (logForDiagnosticsNoPII("warn", "session_activity_hook_hold_expired", { max_ms: n }), e());
}
//@ chunk-e6aww6q8.js:3410220-3410263 sole-consumer
var LMr = () => require("./chunk-d5fbj7hf.js");
//@ chunk-e6aww6q8.js:3410263-3410530 sole-consumer
function refuseArtifactsMcpHook(e, n) {
  return isRunnerDynamicServer(n) || (Zl(n) && LMr()?.isArtifactsMcpLaptopEntry(n) === !0)
    ? `Hooks can't call tools of MCP server '${e}' (the Artifacts MCP server), because a hook's call skips your permission rules. Remove this mcp_tool hook or point it at another server.`
    : null;
}
//@ chunk-e6aww6q8.js:3410530-3410777 sole-consumer
function refuseRemoteBrowserHook(e) {
  return refusesRemoteBrowserCallOutsideChecks(e)
    ? `Hooks can't call tools of MCP server '${e}' (the cloud browser) in this session, because a hook's call skips auto mode's safety check and your approval. Remove this mcp_tool hook or point it at another server.`
    : null;
}
/**
 * 把 mcp_tool 钩子参数中的 ${path} 占位按钩子输入取值替换（对象转 JSON），递归处理数组与对象。
 */
//@ chunk-e6aww6q8.js:3410777-3411230 sole-consumer
function interpolateHookInput(e, n) {
  let r = (h) => {
      let y = n;
      for (let S of h.split(".")) {
        if (y == null || typeof y !== "object") return;
        y = y[S];
      }
      return y;
    },
    s = (h) => {
      if (typeof h === "string")
        return h.replace(/\$\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/g, (y, S) => {
          let w = r(S);
          if (w === void 0 || w === null) return "";
          return typeof w === "object" ? jsonStringify(w) : String(w);
        });
      if (Array.isArray(h)) return h.map(s);
      if (h !== null && typeof h === "object") {
        let y = {};
        for (let [S, w] of Object.entries(h)) y[S] = s(w);
        return y;
      }
      return h;
    };
  return s(e);
}
/**
 * 执行 mcp_tool 类型钩子：无磁盘会话不运行；找不到客户端或服务器未连接时跳过（连接中可短暂等待）；Artifacts、云浏览器与受限账号记忆工具拒绝；插值参数后调用 MCP 工具并返回文本结果或错误。
 */
//@ chunk-e6aww6q8.js:3411230-3414118 sole-consumer
async function runMcpToolHook(
  hook,
  hookEvent,
  hookInput,
  mcpClients,
  signal,
  defaultTimeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  accountMemoryState,
) {
  if (isDiskless())
    return (
      logError(Error("an MCP tool hook got past keepWhileDiskless in a diskless session and was not called")),
      { ok: !1, body: "", withheld: !0, error: `MCP tool hook not run: ${CLOUD_HOOK_UNSUPPORTED_REASON}` }
    );
  releaseMcpCgroupAtHookFire(hook.server, hookEvent);
  let clients = mcpClients ?? getMcpClientsFromAccessor();
  if (clients === void 0) {
    let ensureConnected = `mcp_tool hooks are not available for the '${hookEvent}' hook event (no MCP client context)`;
    return (
      logForDebugging(`Hooks: mcp_tool hook skipped \u2014 ${ensureConnected}`, { level: "warn" }),
      { ok: !1, body: "", error: ensureConnected }
    );
  }
  let timeoutMs = hook.timeout ? hook.timeout * 1000 : defaultTimeoutMs,
    deadline = Date.now() + timeoutMs,
    found = clients.find((Ae) => Ae.name === hook.server);
  if (found === void 0 && mcpClients !== void 0)
    found = getMcpClientsFromAccessor()?.find((Ae) => Ae.name === hook.server);
  if (found?.type === "pending" && !HOOK_EVENT_NAMES.has(hookEvent)) {
    let min = Math.min(timeoutMs, getConnectionTimeoutMs());
    logForDebugging(
      `Hooks: mcp_tool hook for ${hookEvent} is waiting up to ${min}ms (less if the server is retrying) for MCP server '${hook.server}' to finish connecting`,
    );
    let connected = Date.now(),
      Me = await waitForMcpClientReady(hook.server, min, signal);
    if (signal?.aborted) return { ok: !1, body: "", aborted: !0 };
    let isMemoryServer = Date.now() - connected;
    if (Me)
      ((found = Me),
        logForDebugging(`Hooks: MCP server '${hook.server}' is now ${Me.type} after ${isMemoryServer}ms`));
    else
      logForDebugging(
        isMemoryServer < nxn
          ? `Hooks: no live MCP client list tracks '${hook.server}'; not waiting for it`
          : `Hooks: stopped waiting for MCP server '${hook.server}' after ${isMemoryServer}ms; it has not connected`,
        { level: "warn" },
      );
  }
  if (!found || !isConnectedOrCached(found)) {
    let Ae = `MCP server '${hook.server}' not connected`;
    return (
      logForDebugging(`Hooks: mcp_tool hook skipped \u2014 ${Ae}`, { level: "warn" }),
      { ok: !1, body: "", error: Ae }
    );
  }
  let Z = refuseArtifactsMcpHook(hook.server, found.config) ?? refuseRemoteBrowserHook(found.name);
  if (Z !== null)
    return (
      logForDebugging(`Hooks: mcp_tool hook refused \u2014 ${Z}`, { level: "warn" }),
      { ok: !1, body: "", error: Z, withheld: !0 }
    );
  let args = hook.input ? interpolateHookInput(hook.input, hookInput) : {},
    remainingMs = deadline - Date.now();
  if (remainingMs <= 0) return { ok: !1, body: "", aborted: !0 };
  let { signal: signal_2, cleanup: cleanup } = createCombinedAbortSignal(signal, { timeoutMs: remainingMs });
  try {
    logForDebugging(
      `Hooks: mcp_tool calling ${hook.server}/${hook.tool} with ${Object.keys(args).length} arg(s)`,
    );
    let Ae = getEnsureConnectedClient();
    if (!Ae) {
      cleanup();
      let Je = `MCP server '${hook.server}' not connected`;
      return (
        logForDebugging(`Hooks: mcp_tool hook skipped \u2014 ${Je}`, { level: "warn" }),
        { ok: !1, body: "", error: Je }
      );
    }
    let Ie = await Ae(found, {
        signal: signal,
        timeoutMs: Math.min(remainingMs, getConnectionTimeoutMs()),
        context: "mcp_tool hook",
      }),
      Me = refuseArtifactsMcpHook(hook.server, Ie.config) ?? refuseRemoteBrowserHook(Ie.name);
    if (Me !== null)
      return (
        cleanup(),
        logForDebugging(`Hooks: mcp_tool hook refused \u2014 ${Me}`, { level: "warn" }),
        { ok: !1, body: "", error: Me, withheld: !0 }
      );
    let We = isMemoryToolServer(Ie);
    if (
      We &&
      pVo(hook.tool, accountMemoryServerState([Ie], accountMemoryState ?? WZn(getRootSession().host)).mode)
    ) {
      cleanup();
      let Je = `The account memory server's ${hook.tool} is not available to a hook in this session`;
      return (
        logForDebugging(`Hooks: mcp_tool hook refused \u2014 ${Je}`, { level: "warn" }),
        { ok: !1, body: "", error: Je, withheld: !0 }
      );
    }
    let result = await callMcpTool(
      Ie,
      { name: hook.tool, arguments: args, ...(We && { _meta: { [MEMORY_CALLER_META_KEY]: "worker" } }) },
      { signal: signal_2, timeout: remainingMs },
    );
    cleanup();
    let text = Array.isArray(result.content)
      ? result.content.map((Je) => (Je.type === "text" ? Je.text : `[${Je.type}]`)).join(`
`)
      : "";
    if (result.isError) return { ok: !1, body: text, error: text || "MCP tool returned an error" };
    return { ok: !0, body: text };
  } catch (error) {
    if ((cleanup(), signal_2.aborted)) return { ok: !1, body: "", aborted: !0 };
    let Ie = errorMessage(error);
    return (
      logForDebugging(`Hooks: mcp_tool hook error: ${Ie}`, { level: "error" }),
      { ok: !1, body: "", error: Ie }
    );
  }
}
//@ chunk-e6aww6q8.js:3414118-3414138 sole-consumer
var nxn = 50,
  FMr = 5000;
//@ chunk-e6aww6q8.js:3414138-3414416 sole-consumer
async function waitForMcpClientReady(e, n, r) {
  let s = Date.now() + n,
    h = !1;
  for (;;) {
    let y = getMcpClientsFromAccessor()?.find((w) => w.name === e);
    if (y === void 0 || y.type !== "pending") return y;
    if (!h && y.reconnectAttempt !== void 0) ((s = Math.min(s, Date.now() + FMr)), (h = !0));
    let S = s - Date.now();
    if (S <= 0 || r?.aborted) return;
    await sleep(Math.min(nxn, S), r);
  }
}
//@ chunk-e6aww6q8.js:3414416-3414519 sole-consumer
var HOOK_OUTPUT_INVALID_PREFIX = "Hook JSON output validation failed \u2014 ",
  HOOK_OUTPUT_META_KEYS = new Set(["async", "hookEventName", "behavior"]);
//@ chunk-e6aww6q8.js:3414519-3414620 sole-consumer = isInvalidValueIssue (1)
function isInvalidValueIssue(issue) {
  let at = issue.path.at(-1);
  return issue.code === "invalid_value" && typeof at === "string" && HOOK_OUTPUT_META_KEYS.has(at);
}
/**
 * 把 zod 问题规整为 {path, message}：联合类型错误递归取第一个非 invalid_value 分支，或汇总可选值为 "expected one of ..."。
 */
//@ chunk-e6aww6q8.js:3414620-3415147 sole-consumer
function simplifyZodIssue(issue, pathPrefix) {
  let path = [...pathPrefix, ...issue.path];
  if (issue.code !== "invalid_union" || issue.errors.length === 0)
    return { path: path, message: stripPrefix(issue.message, "Invalid input: ") };
  let firstBranchIssue = issue.errors.find(
    (error) => error.length > 0 && !error.some(isInvalidValueIssue),
  )?.[0];
  if (firstBranchIssue) return simplifyZodIssue(firstBranchIssue, path);
  let flattened = issue.errors.flatMap((error) => error.filter(isInvalidValueIssue)),
    firstInvalidValue = flattened[0];
  if (firstInvalidValue?.code !== "invalid_value") return { path: path, message: issue.message };
  let allowedValues = uniq(
      flattened.flatMap((G) => (G.code === "invalid_value" ? G.values.map((q) => jsonStringify(q)) : [])),
    ),
    joined = allowedValues.slice(0, 6).join(" | ");
  return {
    path: [...path, ...firstInvalidValue.path],
    message: `expected one of ${joined}${allowedValues.length > 6 ? " | \u2026" : ""}`,
  };
}
//@ chunk-e6aww6q8.js:3415147-3415204 sole-consumer
function rxn(e) {
  return e.map(String).join(".") || "(root)";
}
//@ chunk-e6aww6q8.js:3415204-3415276 sole-consumer
function toe(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
/**
 * 生成钩子 JSON 输出校验失败的说明：首个问题加缺少 hookEventName、PermissionRequest decision 格式、旧版顶层 decision 用法等提示，列出其余问题并附原始输出。
 */
//@ chunk-e6aww6q8.js:3415276-3416415 sole-consumer
function formatHookOutputError(e, n) {
  let hookSpecificOutput = toe(e) ? e.hookSpecificOutput : void 0,
    mapped = n.issues.map((issue) => simplifyZodIssue(issue, [])),
    firstIssue = mapped[0],
    summary = firstIssue ? `${rxn(firstIssue.path)}: ${firstIssue.message}` : "unknown error";
  if (toe(hookSpecificOutput) && !("hookEventName" in hookSpecificOutput))
    summary = 'hookSpecificOutput is missing required field "hookEventName"';
  else if (
    toe(hookSpecificOutput) &&
    hookSpecificOutput.hookEventName === "PermissionRequest" &&
    !toe(hookSpecificOutput.decision) &&
    firstIssue?.path[0] === "hookSpecificOutput" &&
    firstIssue.path[1] === "decision"
  )
    summary +=
      ' (PermissionRequest decision must be {"behavior": "allow"} or {"behavior": "deny", "message": "..."})';
  else if (
    toe(e) &&
    firstIssue?.path.length === 1 &&
    firstIssue.path[0] === "decision" &&
    (e.decision === "allow" || e.decision === "deny" || e.decision === "ask")
  )
    summary +=
      e.decision === "ask"
        ? ' (top-level decision is the legacy approve|block field; for "ask" use hookSpecificOutput.permissionDecision in a PreToolUse hook)'
        : ` (top-level decision is the legacy approve|block field; for "${e.decision}" use hookSpecificOutput.permissionDecision in a PreToolUse hook, or hookSpecificOutput.decision: {"behavior": "${e.decision}"} in a PermissionRequest hook)`;
  let joined = mapped.slice(1).map((w) => `  - ${rxn(w.path)}: ${w.message}`).join(`
`);
  return `${HOOK_OUTPUT_INVALID_PREFIX}${summary}${
    joined
      ? `
` + joined
      : ""
  }

The hook's output was: ${jsonStringify(e, null, 2)}`;
}
/**
 * 返回钩子 JSON 输出的期望 schema 说明文本（continue/suppressOutput/stopReason/decision/reason/systemMessage/terminalSequence/hookSpecificOutput…），用于校验失败时提示。
 */
//@ chunk-e6aww6q8.js:3416415-3417708 fingerprint = parseHookOutput (0.607)
function parseHookOutput_2() {
  return jsonStringify(
    {
      continue: "boolean (optional)",
      suppressOutput: "boolean (optional)",
      stopReason: "string (optional)",
      decision: '"approve" | "block" (optional)',
      reason: "string (optional)",
      systemMessage: "string (optional)",
      terminalSequence: "string (optional)",
      hookSpecificOutput: {
        "for PreToolUse": {
          hookEventName: '"PreToolUse"',
          permissionDecision: '"allow" | "deny" | "ask" | "defer" (optional)',
          permissionDecisionReason: "string (optional)",
          updatedInput: "object (optional) - Modified tool input to use",
        },
        "for PermissionRequest": {
          hookEventName: '"PermissionRequest"',
          decision: {
            "to allow": {
              behavior: '"allow"',
              updatedInput: "object (optional) - Modified tool input to use",
              updatedPermissions: "array (optional) - Permission updates",
            },
            "to deny": { behavior: '"deny"', message: "string (optional)", interrupt: "boolean (optional)" },
          },
        },
        "for UserPromptSubmit": {
          hookEventName: '"UserPromptSubmit"',
          additionalContext: "string (optional)",
        },
        "for PostToolUse": { hookEventName: '"PostToolUse"', additionalContext: "string (optional)" },
        "for PostToolBatch": { hookEventName: '"PostToolBatch"', additionalContext: "string (optional)" },
        "for Stop / SubagentStop": {
          hookEventName: '"Stop" | "SubagentStop"',
          additionalContext:
            "string (optional) - Feedback for the model; the conversation continues so the model can act on it",
        },
      },
    },
    null,
    2,
  );
}
//@ chunk-e6aww6q8.js:3417708-3417928 layout
function formatHookFailureLine(e, n) {
  let r =
    n
      .split(
        `
`,
      )
      .map((s) => s.trim())
      .find((s) => s.length > 0) ?? "";
  if (r.startsWith(HOOK_OUTPUT_INVALID_PREFIX))
    return `${e} hook output invalid: ${r.slice(HOOK_OUTPUT_INVALID_PREFIX.length)}`;
  return r ? `${e} hook failed: ${r}` : `${e} hook failed to run`;
}
/**
 * 执行 PreCompact 钩子（matcher = manual/auto）：成功输出（超长截断）合并为 newCustomInstructions，失败与成功信息合成 userDisplayMessage，exit 2/block 的汇成 blockedBy 阻止压缩；子代理只返回 blockedBy。
 */
//@ chunk-e6aww6q8.js:3417928-3419240 facade-exports = executePreCompactHooks (0.724)
async function executePreCompactHooks(e, n, r, s, h = TOOL_HOOK_EXECUTION_TIMEOUT_MS) {
  if (r.options?.settingsHooksOff === !0) return {};
  let y = isDelegatedObservationContext(r.agentContext),
    hookInput = {
      ...createBaseHookInput(e, hookInputCwd()),
      hook_event_name: "PreCompact",
      trigger: n.trigger,
      custom_instructions: n.customInstructions,
    },
    results = await executeHooksOutsideREPL({
      session: e,
      hookInput: hookInput,
      matchQuery: n.trigger,
      signal: s,
      timeoutMs: h,
      agentId: r.agentId,
      storageV5: r.storageV5,
      credentials: r.credentials,
    });
  if (results.length === 0) return {};
  let L = [],
    G = [];
  for (let Se of results) {
    if (Se.cancelled) continue;
    let trimmed = Se.output.trim();
    if (Se.succeeded && !Se.blocked) {
      if (trimmed.length > SIt)
        (logForDebugging(
          `PreCompact [${Se.command}] output cut from ${trimmed.length} to ${SIt} characters`,
          { level: "warn" },
        ),
          (trimmed = `${truncateToLength(trimmed, SIt)}

[PreCompact hook [${Se.command}] output cut: ${trimmed.length} characters is over the ${SIt}-character limit]`));
      if (trimmed) (L.push(trimmed), G.push(`PreCompact [${Se.command}] completed successfully: ${trimmed}`));
      else G.push(`PreCompact [${Se.command}] completed successfully`);
    } else if (trimmed) G.push(`PreCompact [${Se.command}] failed: ${trimmed}`);
    else G.push(`PreCompact [${Se.command}] failed`);
  }
  let filtered = results.filter((result) => result.blocked),
    Z =
      filtered.length > 0
        ? filtered.map((result) => {
            let trimmed = result.output.trim();
            return `[${result.command}]${trimmed ? `: ${trimmed}` : ""}`;
          }).join(`
`)
        : void 0;
  if (y) return { ...(Z !== void 0 && { blockedBy: Z }) };
  return {
    newCustomInstructions:
      L.length > 0
        ? L.join(`

`)
        : void 0,
    userDisplayMessage:
      G.length > 0
        ? G.join(`
`)
        : void 0,
    ...(Z !== void 0 && { blockedBy: Z }),
  };
}
/**
 * executePostCompactHooks 的容错包装：非中止错误只上报，返回 {}。
 */
//@ chunk-e6aww6q8.js:3419240-3419338 facade-exports
function executePostCompactHooks(e, n, r, s, h) {
  return executePostCompactHooks_2(e, n, r, s, h).catch((y) => {
    if (s?.aborted) throw y;
    return (hq(y), {});
  });
}
/**
 * 执行 PostCompact 钩子（输入含 compact_summary），只生成给用户看的成功/失败信息；子代理或关闭钩子时跳过。
 */
//@ chunk-e6aww6q8.js:3419338-3420130 fingerprint = executePostCompactHooks (0.946)
async function executePostCompactHooks_2(e, n, r, s, h = TOOL_HOOK_EXECUTION_TIMEOUT_MS) {
  if (isDelegatedObservationContext(r.agentContext) || r.options?.settingsHooksOff === !0) return {};
  let hookInput = {
      ...createBaseHookInput(e, hookInputCwd()),
      hook_event_name: "PostCompact",
      trigger: n.trigger,
      compact_summary: n.compactSummary,
    },
    results = await executeHooksOutsideREPL({
      session: e,
      hookInput: hookInput,
      matchQuery: n.trigger,
      signal: s,
      timeoutMs: h,
      agentId: r.agentId,
      storageV5: r.storageV5,
      credentials: r.credentials,
    });
  if (results.length === 0) return {};
  let displayMessages = [];
  for (let result of results) {
    if (result.cancelled) continue;
    if (result.succeeded)
      if (result.output.trim())
        displayMessages.push(
          `PostCompact [${result.command}] completed successfully: ${result.output.trim()}`,
        );
      else displayMessages.push(`PostCompact [${result.command}] completed successfully`);
    else if (result.output.trim())
      displayMessages.push(`PostCompact [${result.command}] failed: ${result.output.trim()}`);
    else displayMessages.push(`PostCompact [${result.command}] failed`);
  }
  return {
    userDisplayMessage:
      displayMessages.length > 0
        ? displayMessages.join(`
`)
        : void 0,
  };
}
/**
 * 执行 ConfigChange 钩子（matcher = source，如 user_settings/skills），policy_settings 来源的结果强制不阻断。
 */
//@ chunk-e6aww6q8.js:3420130-3420436 fingerprint = executeConfigChangeHooks (1)
async function executeConfigChangeHooks(
  e,
  n,
  r,
  { timeoutMs: s = TOOL_HOOK_EXECUTION_TIMEOUT_MS, storageV5: h, credentials: y } = {},
) {
  let hookInput = {
      ...createBaseHookInput(e, hookInputCwd()),
      hook_event_name: "ConfigChange",
      source: n,
      file_path: r,
    },
    results = await executeHooksOutsideREPL({
      session: e,
      hookInput: hookInput,
      timeoutMs: s,
      matchQuery: n,
      storageV5: h,
      credentials: y,
    });
  if (n === "policy_settings") return results.map((L) => ({ ...L, blocked: !1 }));
  return results;
}
/**
 * 执行 DirectoryAdded 钩子（316 新增；/add-dir 或 register_repo_root 之后），返回结果与 systemMessage 列表。
 */
//@ chunk-e6aww6q8.js:3420436-3420753 facade-exports
async function executeDirectoryAddedHooks(
  e,
  n,
  r,
  { timeoutMs: s = TOOL_HOOK_EXECUTION_TIMEOUT_MS, storageV5: h, credentials: y } = {},
) {
  let S = {
      ...createBaseHookInput(e, hookInputCwd()),
      hook_event_name: "DirectoryAdded",
      directory: n,
      source: r,
    },
    w = await executeHooksOutsideREPL({
      session: e,
      hookInput: S,
      matchQuery: r,
      timeoutMs: s,
      storageV5: h,
      credentials: y,
    }),
    filtered = w.map((G) => G.systemMessage).filter((G) => !!G);
  return { results: w, systemMessages: filtered };
}
/**
 * 执行 Elicitation 钩子（matcher = MCP 服务器名），钩子可直接给出 accept/decline/cancel 及 content，decline 视为阻断。
 */
//@ chunk-e6aww6q8.js:3420753-3421267 facade-exports = executeElicitationHooks (1)
async function executeElicitationHooks({
  session: session,
  serverName: serverName,
  message: message,
  requestedSchema: requestedSchema,
  permissionMode: permissionMode,
  signal: signal,
  timeoutMs: timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  mode: mode,
  url: url,
  elicitationId: elicitationId,
}) {
  let hookInput = {
      ...createBaseHookInput(session, hookInputCwd(), permissionMode),
      hook_event_name: "Elicitation",
      mcp_server_name: serverName,
      message: message,
      mode: mode,
      url: url,
      elicitation_id: elicitationId,
      requested_schema: requestedSchema,
    },
    results = await executeHooksOutsideREPL({
      session: session,
      hookInput: hookInput,
      matchQuery: serverName,
      signal: signal,
      timeoutMs: timeoutMs,
    }),
    Se,
    ke;
  for (let result of results) {
    let parsed = parseElicitationHookOutput(result, "Elicitation");
    if (parsed.blockingError) ke = parsed.blockingError;
    if (parsed.response) Se = parsed.response;
  }
  return { elicitationResponse: Se, blockingError: ke };
}
/**
 * 执行 ElicitationResult 钩子，可改写用户对 elicitation 的回答；decline 视为阻断。
 */
//@ chunk-e6aww6q8.js:3421267-3421765 facade-exports = executeElicitationResultHooks (1)
async function executeElicitationResultHooks({
  session: session,
  serverName: serverName,
  action: action,
  content: content,
  permissionMode: permissionMode,
  signal: signal,
  timeoutMs: timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  mode: mode,
  elicitationId: elicitationId,
}) {
  let hookInput = {
      ...createBaseHookInput(session, hookInputCwd(), permissionMode),
      hook_event_name: "ElicitationResult",
      mcp_server_name: serverName,
      elicitation_id: elicitationId,
      mode: mode,
      action: action,
      content: content,
    },
    results = await executeHooksOutsideREPL({
      session: session,
      hookInput: hookInput,
      matchQuery: serverName,
      signal: signal,
      timeoutMs: timeoutMs,
    }),
    Z,
    Se;
  for (let result of results) {
    let parsed = parseElicitationHookOutput(result, "ElicitationResult");
    if (parsed.blockingError) Se = parsed.blockingError;
    if (parsed.response) Z = parsed.response;
  }
  return { elicitationResultResponse: Z, blockingError: Se };
}
/**
 * CwdChanged/FileChanged 共用：执行钩子后使会话 env 缓存失效，收集 watchPaths 与 systemMessage。
 */
//@ chunk-e6aww6q8.js:3421765-3422063 fingerprint = executeEnvHooks (1)
async function executeEnvHooks(
  e,
  n,
  { timeoutMs: timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS, storageV5: storageV5, credentials: credentials },
) {
  let results = await executeHooksOutsideREPL({
    session: e,
    hookInput: n,
    timeoutMs: timeoutMs,
    storageV5: storageV5,
    credentials: credentials,
  });
  if (results.length > 0) invalidateSessionEnvCache();
  let watchPaths = results.flatMap((L) => L.watchPaths ?? []),
    systemMessages = results.map((L) => L.systemMessage).filter((L) => !!L);
  return { results: results, watchPaths: watchPaths, systemMessages: systemMessages };
}
/**
 * 执行 CwdChanged 钩子（old_cwd/new_cwd），钩子可写 CLAUDE_ENV_FILE、返回 watchPaths。
 */
//@ chunk-e6aww6q8.js:3422063-3422177 facade-exports = executeCwdChangedHooks (1)
function executeCwdChangedHooks(e, n, r, s = {}) {
  let hookInput = {
    ...createBaseHookInput(e, hookInputCwd()),
    hook_event_name: "CwdChanged",
    old_cwd: n,
    new_cwd: r,
  };
  return executeEnvHooks(e, hookInput, s);
}
/**
 * 执行 FileChanged 钩子（file_path/event: change|add|unlink）。
 */
//@ chunk-e6aww6q8.js:3422177-3422292 facade-exports = executeFileChangedHooks (1)
function executeFileChangedHooks(e, n, r, s = {}) {
  let hookInput = {
    ...createBaseHookInput(e, hookInputCwd()),
    hook_event_name: "FileChanged",
    file_path: n,
    event: r,
  };
  return executeEnvHooks(e, hookInput, s);
}
/**
 * executeInstructionsLoadedHooks 的容错包装。
 */
//@ chunk-e6aww6q8.js:3422292-3422338 facade-exports
function executeInstructionsLoadedHooks(...e) {
  return executeInstructionsLoadedHooks_2(...e).catch(hq);
}
/**
 * 执行 InstructionsLoaded 钩子（CLAUDE.md/规则文件加载时，matcher = load_reason），只观察不阻断。
 */
//@ chunk-e6aww6q8.js:3422338-3422713 fingerprint = executeInstructionsLoadedHooks (0.958)
async function executeInstructionsLoadedHooks_2(e, n, r, s, h) {
  let {
      globs: globs,
      triggerFilePath: triggerFilePath,
      parentFilePath: parentFilePath,
      timeoutMs: timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
      storageV5: storageV5,
      credentials: credentials,
      agentInfo: agentInfo,
    } = h ?? {},
    hookInput = {
      ...createBaseHookInput(e, hookInputCwd(), void 0, agentInfo),
      hook_event_name: "InstructionsLoaded",
      file_path: n,
      memory_type: r,
      load_reason: s,
      globs: globs,
      trigger_file_path: triggerFilePath,
      parent_file_path: parentFilePath,
    };
  await executeHooksOutsideREPL({
    session: e,
    hookInput: hookInput,
    timeoutMs: timeoutMs,
    matchQuery: s,
    storageV5: storageV5,
    credentials: credentials,
  });
}
/**
 * 执行 Notification 钩子（matcher = notification_type）。
 */
//@ chunk-e6aww6q8.js:3428473-3428784 facade-exports = executeNotificationHooks (0.946)
async function executeNotificationHooks(
  e,
  n,
  { timeoutMs: r = TOOL_HOOK_EXECUTION_TIMEOUT_MS, storageV5: s, credentials: h, hookOrigin: y } = {},
) {
  let { message: message, title: title, notificationType: notificationType } = n,
    hookInput = {
      ...createBaseHookInput(e, hookInputCwd()),
      hook_event_name: "Notification",
      message: message,
      title: title,
      notification_type: notificationType,
    };
  await executeHooksOutsideREPL({
    session: e,
    hookInput: hookInput,
    timeoutMs: r,
    matchQuery: notificationType,
    hookOrigin: y,
    storageV5: s,
    credentials: h,
  });
}
//@ chunk-e6aww6q8.js:3428822-3428925 layout
function createSessionEndRaiser() {
  let e = pu();
  return { setSessionEndRaiser: e.set, raiseSessionEnd: (n) => e.get()?.(n) ?? n.end() };
}
//@ chunk-e6aww6q8.js:3428925-3428939 layout
var sessionEndRaiser = createSessionEndRaiser();
//@ chunk-e6aww6q8.js:3428939-3428967 layout
var raiseSessionEnd = sessionEndRaiser.raiseSessionEnd;
/**
 * 设置 SessionEnd 触发器（宿主可接管 SessionEnd 钩子的执行时机）。
 */
//@ chunk-e6aww6q8.js:3428967-3428999 layout
var setSessionEndRaiser = sessionEndRaiser.setSessionEndRaiser;
//@ chunk-e6aww6q8.js:3428999-3429027 layout
var STARTUP_HOOK_HOLD = "startup-hook-hold";
/**
 * 执行 SessionStart 钩子（source = startup/resume/clear/compact/fork，输入含 agent_type/model/session_title），期间持有 startup-hook-hold 活动；返回结果流。
 */
//@ chunk-e6aww6q8.js:3429027-3429383 facade-exports = executeSessionStartHooks (0.768)
function executeSessionStartHooks(
  e,
  n,
  r,
  s,
  h,
  y,
  S,
  w = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  L,
  G,
  q,
  Z,
  Se,
  ke,
) {
  let we = r !== void 0 ? { id: LE(r), project: e.project } : e,
    Ee = {
      ...createBaseHookInput(we, hookInputCwd()),
      hook_event_name: "SessionStart",
      source: n,
      agent_type: h,
      model: y,
      session_title: s ?? getCurrentSessionTitle(we.id),
      ...G,
    };
  return runStartupHooksWithHold({
    session: e,
    hookInput: Ee,
    matchQuery: n,
    signal: S,
    timeoutMs: w,
    forceSyncExecution: L,
    agentContext: q,
    selection: Z,
    storageV5: Se,
    credentials: ke,
  });
}
//@ chunk-e6aww6q8.js:3429383-3429739 layout
async function* runStartupHooksWithHold({
  session: session,
  hookInput: hookInput,
  matchQuery: matchQuery,
  signal: signal,
  timeoutMs: timeoutMs,
  forceSyncExecution: forceSyncExecution,
  storageV5: storageV5,
  credentials: credentials,
  agentContext: agentContext,
  selection: selection,
}) {
  startSessionActivity("hook_exec", STARTUP_HOOK_HOLD);
  try {
    yield* executeHooks({
      session: session,
      hookInput: hookInput,
      toolUseID: randomUUID_36(),
      matchQuery: matchQuery,
      signal: signal,
      timeoutMs: timeoutMs,
      forceSyncExecution: forceSyncExecution,
      agentContext: agentContext,
      ...selection,
      storageV5: storageV5,
      credentials: credentials,
    });
  } finally {
    endActivity("hook_exec", STARTUP_HOOK_HOLD);
  }
}
/**
 * 执行 Setup 钩子（trigger = init/maintenance），期间持有 startup-hook-hold。
 */
//@ chunk-e6aww6q8.js:3429739-3430016 facade-exports = executeSetupHooks (0.878)
async function* executeSetupHooks(e, n, r, s = TOOL_HOOK_EXECUTION_TIMEOUT_MS, h, y, S) {
  let hookInput = { ...createBaseHookInput(e, hookInputCwd()), hook_event_name: "Setup", trigger: n };
  startSessionActivity("hook_exec", STARTUP_HOOK_HOLD);
  try {
    yield* executeHooks({
      session: e,
      hookInput: hookInput,
      toolUseID: randomUUID_36(),
      matchQuery: n,
      signal: r,
      timeoutMs: s,
      forceSyncExecution: h,
      storageV5: y,
      credentials: S,
    });
  } finally {
    endActivity("hook_exec", STARTUP_HOOK_HOLD);
  }
}
/**
 * 执行 SubagentStart 钩子（agent_id/agent_type，matcher = agent_type）。
 */
//@ chunk-e6aww6q8.js:3430016-3430348 facade-exports = executeSubagentStartHooks (0.856)
async function* executeSubagentStartHooks(e, n, r, s, h = TOOL_HOOK_EXECUTION_TIMEOUT_MS, y, S, w) {
  let hookInput = {
    ...createBaseHookInput(e.session, hookInputCwd()),
    hook_event_name: "SubagentStart",
    agent_id: n,
    agent_type: r,
  };
  yield* executeHooks({
    session: e.session,
    hookInput: hookInput,
    toolUseID: randomUUID_36(),
    matchQuery: r,
    signal: s,
    timeoutMs: h,
    sessionHooks: y,
    agentContext: S,
    managedHooksOnly: w?.managedHooksOnly,
    storageV5: e.storageV5,
    credentials: e.credentials,
  });
}
/**
 * 执行 SessionEnd 钩子（matcher = reason），时间预算由 CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS 与钩子 timeout 推出，失败写 stderr，最后清空会话钩子。
 */
//@ chunk-e6aww6q8.js:3430348-3430847 facade-exports = executeSessionEndHooks (0.895)
async function executeSessionEndHooks(e, n, r) {
  let {
      sessionHooks: sessionHooks,
      getAppState: getAppState,
      signal: signal,
      storageV5: storageV5,
      credentials: credentials,
    } = r || {},
    hookInput = { ...createBaseHookInput(e, hookInputCwd()), hook_event_name: "SessionEnd", reason: n },
    G = [],
    q = async () => {
      G = await executeHooksOutsideREPL({
        session: e,
        sessionHooks: sessionHooks,
        getAppState: getAppState,
        hookInput: hookInput,
        matchQuery: n,
        signal: signal,
        timeoutMs: getSessionEndHookDefaultTimeoutMs(),
        storageV5: storageV5,
        credentials: credentials,
      });
    };
  await raiseSessionEnd({ reason: n, sessionId: e.id, boundMs: getSessionEndHookTimeoutMs(), end: q });
  for (let result of G)
    if (!result.succeeded && result.output && !isDiskless())
      process.stderr.write(`SessionEnd hook [${result.command}] failed: ${result.output}
`);
  sessionHooks?.clear(e.id);
}
//@ chunk-e6aww6q8.js:3430885-3430898 layout
var STOP_HOOK_FIELD_MAX_CHARS = 1000;
//@ chunk-e6aww6q8.js:3430898-3431521 layout
function summarizeBackgroundTasksForHook(e) {
  let n = [];
  for (let r of Object.values(e)) {
    if (!waitForTaskCompletion(r) || r.type === "post_turn_memory") continue;
    let s = {
      id: r.id,
      type: taskKindLabel(r.type),
      status: r.status,
      description: truncateWithCount(r.description, STOP_HOOK_FIELD_MAX_CHARS),
    };
    switch (r.type) {
      case "local_bash":
        s.command = truncateWithCount(r.command, STOP_HOOK_FIELD_MAX_CHARS);
        break;
      case "local_agent":
        s.agent_type = r.agentType;
        break;
      case "monitor_mcp":
        ((s.server = r.server), (s.tool = r.tool));
        break;
      case "mcp_task":
        ((s.server = r.serverName), (s.tool = r.toolName));
        break;
      case "local_workflow":
        s.name = r.workflowName;
        break;
      case "in_process_teammate":
      case "remote_agent":
      case "dream":
      case "monitor_ws":
      case "auto_mode_scan":
      case "local_memory_import":
        break;
      default:
    }
    n.push(s);
  }
  return n;
}
//@ chunk-e6aww6q8.js:3431521-3431639 layout
function summarizeSessionCronsForHook(e = getSessionCronTasks()) {
  return e.map((n) => ({
    id: n.id,
    schedule: n.cron,
    recurring: n.recurring ?? !1,
    prompt: truncateWithCount(n.prompt, STOP_HOOK_FIELD_MAX_CHARS),
  }));
}
/**
 * executeStopFailureHooks 的容错包装。
 */
//@ chunk-e6aww6q8.js:3431639-3431685 facade-exports
function executeStopFailureHooks(...e) {
  return executeStopFailureHooks_2(...e).catch(hq);
}
/**
 * API 错误结束回合时执行 StopFailure 钩子（matcher = error 类型），输出与退出码被忽略。
 */
//@ chunk-e6aww6q8.js:3431685-3432233 fingerprint = executeStopFailureHooks (0.843)
async function executeStopFailureHooks_2(
  lastMessage,
  toolUseContext,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
) {
  if (
    isDelegatedObservationContext(toolUseContext.agentContext) ||
    toolUseContext.options?.settingsHooksOff === !0
  )
    return;
  if (!hasHookToRun("StopFailure", toolUseContext.sessionHooksRegistry, toolUseContext.session.id)) return;
  let s =
      extractTextContent_2(
        lastMessage.message.content,
        `
`,
      ).trim() || void 0,
    h = lastMessage.error ?? "unknown",
    hookInput = {
      ...createBaseHookInput(toolUseContext.session, hookInputCwd(), void 0, toolUseContext),
      hook_event_name: "StopFailure",
      error: h,
      error_details: lastMessage.errorDetails,
      last_assistant_message: s,
    };
  await executeHooksOutsideREPL({
    session: toolUseContext.session,
    sessionHooks: toolUseContext.sessionHooksRegistry,
    getAppState: toolUseContext.getAppState,
    hookInput: hookInput,
    timeoutMs: timeoutMs,
    matchQuery: h,
    agentId: toolUseContext.agentId,
    storageV5: toolUseContext.storageV5,
    credentials: toolUseContext.credentials,
  });
}
/**
 * 执行 Stop/SubagentStop 钩子：输入含 stop_hook_active、last_assistant_message、background_tasks、session_crons，SubagentStop 另含 agent_id/agent_transcript_path/agent_type；turn_end_reactions 只跑会话 function 钩子。
 */
//@ chunk-e6aww6q8.js:3432233-3433269 facade-exports = executeStopHooks (0.605)
async function* executeStopHooks(
  permissionMode,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  stopHookActive = !1,
  subagentId,
  toolUseContext,
  messages,
  agentType,
  requestPrompt = "turn_end",
) {
  let G = subagentId ? "SubagentStop" : "Stop";
  if (
    isDelegatedObservationContext(toolUseContext.agentContext) ||
    toolUseContext.options.settingsHooksOff === !0
  )
    return;
  let q = isWebFetchSubagentContext(toolUseContext.agentContext),
    sessionId = toolUseContext.agentId ?? toolUseContext.session.id;
  if (!q && !hasHookToRun(G, toolUseContext.sessionHooksRegistry, sessionId)) return;
  if (
    requestPrompt === "turn_end_reactions" &&
    !toolUseContext.sessionHooksRegistry.getFunctionHooks(sessionId, G).get(G)?.length
  )
    return;
  let Se = messages ? getLastAssistantMessage(messages) : void 0,
    ke = Se
      ? extractTextContent_2(
          Se.message.content,
          `
`,
        ).trim() || void 0
      : void 0,
    we = {
      background_tasks: summarizeBackgroundTasksForHook(toolUseContext.taskRegistry.all()),
      session_crons: summarizeSessionCronsForHook(),
    },
    Ee = createBaseHookInput(toolUseContext.session, hookInputCwd(), permissionMode, toolUseContext),
    Ae = subagentId
      ? {
          ...Ee,
          hook_event_name: "SubagentStop",
          stop_hook_active: stopHookActive,
          agent_id: subagentId,
          agent_transcript_path: isDiskless() ? "" : getAgentTranscriptPath(subagentId),
          agent_type: agentType ?? Ee.agent_type ?? "",
          last_assistant_message: ke,
          ...we,
        }
      : {
          ...Ee,
          hook_event_name: "Stop",
          stop_hook_active: stopHookActive,
          last_assistant_message: ke,
          ...we,
        },
    Ie;
  yield* executeHooks({
    session: toolUseContext.session,
    hookInput: Ae,
    extendedHookInput: Ie,
    toolUseID: randomUUID_37(),
    signal: signal,
    timeoutMs: timeoutMs,
    toolUseContext: toolUseContext,
    messages: messages,
    managedHooksOnly: q,
    skipSessionFunctionHooks: requestPrompt !== "turn_end" && requestPrompt !== "turn_end_reactions",
    sessionFunctionHooksOnly: requestPrompt === "turn_end_reactions",
  });
}
/**
 * 执行 TeammateIdle 钩子（teammate_name/team_name），exit 2 让队友继续工作。
 */
//@ chunk-e6aww6q8.js:3433307-3433575 facade-exports = executeTeammateIdleHooks (0.913)
async function* executeTeammateIdleHooks(e, n, r, s, h = TOOL_HOOK_EXECUTION_TIMEOUT_MS, y) {
  let S = hookInputCwd(),
    hookInput = {
      ...createBaseHookInput(y.session, S, r, { agentId: y.agentId, agentType: y.agentType }),
      hook_event_name: "TeammateIdle",
      teammate_name: e,
      team_name: n,
    };
  yield* executeHooks({
    session: y.session,
    hookInput: hookInput,
    toolUseID: randomUUID_38(),
    signal: s,
    timeoutMs: h,
    toolUseContext: y,
  });
}
/**
 * 执行 TaskCreated 钩子（task_id/subject/description/teammate/team），exit 2 阻止创建。
 */
//@ chunk-e6aww6q8.js:3433575-3433892 facade-exports = executeTaskCreatedHooks (0.971)
async function* executeTaskCreatedHooks(
  taskId,
  taskSubject,
  taskDescription,
  teammateName,
  teamName,
  permissionMode,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  toolUseContext,
) {
  let G = hookInputCwd(),
    hookInput = {
      ...createBaseHookInput(toolUseContext.session, G, permissionMode, {
        agentId: toolUseContext.agentId,
        agentType: toolUseContext.agentType,
      }),
      hook_event_name: "TaskCreated",
      task_id: taskId,
      task_subject: taskSubject,
      task_description: taskDescription,
      teammate_name: teammateName,
      team_name: teamName,
    };
  yield* executeHooks({
    session: toolUseContext.session,
    hookInput: hookInput,
    toolUseID: randomUUID_38(),
    signal: signal,
    timeoutMs: timeoutMs,
    toolUseContext: toolUseContext,
  });
}
/**
 * 执行 TaskCompleted 钩子，exit 2 阻止标记完成。
 */
//@ chunk-e6aww6q8.js:3433892-3434211 facade-exports = executeTaskCompletedHooks (0.97)
async function* executeTaskCompletedHooks(
  taskId,
  taskSubject,
  taskDescription,
  teammateName,
  teamName,
  permissionMode,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  toolUseContext,
) {
  let G = hookInputCwd(),
    hookInput = {
      ...createBaseHookInput(toolUseContext.session, G, permissionMode, {
        agentId: toolUseContext.agentId,
        agentType: toolUseContext.agentType,
      }),
      hook_event_name: "TaskCompleted",
      task_id: taskId,
      task_subject: taskSubject,
      task_description: taskDescription,
      teammate_name: teammateName,
      team_name: teamName,
    };
  yield* executeHooks({
    session: toolUseContext.session,
    hookInput: hookInput,
    toolUseID: randomUUID_38(),
    signal: signal,
    timeoutMs: timeoutMs,
    toolUseContext: toolUseContext,
  });
}
//@ chunk-e6aww6q8.js:3434211-3434359 layout
var isHeldAskResult = (e, n) =>
  e.permissionBehavior === "ask" &&
  n.some(
    (r) => r.heldForServedCall === !0 && r.hookPermissionDecisionReason === e.hookPermissionDecisionReason,
  );
//@ chunk-e6aww6q8.js:3434359-3434731 layout
function toPermissionHookYield({
  deny: deny,
  ask: ask,
  allow: allow,
  updatedInput: updatedInput,
  additionalContext: additionalContext,
}) {
  let y = {};
  if (additionalContext && additionalContext.length > 0) y.additionalContexts = additionalContext;
  if (typeof deny === "string")
    return ((y.permissionBehavior = "deny"), (y.hookPermissionDecisionReason = deny), y);
  if (typeof ask === "string") ((y.permissionBehavior = "ask"), (y.hookPermissionDecisionReason = ask));
  else if (allow === !0) y.permissionBehavior = "allow";
  if (updatedInput) y.updatedInput = updatedInput;
  return y;
}
/**
 * 有 mods（function-hook 链）时的 PreToolUse 流程：managed 阶段 → mods 链 → core 阶段，合并 deny/ask/allow、改写来源（local_code/mod/mixed）与 permissionDisplay 后产出一个汇总结果。
 */
//@ chunk-e6aww6q8.js:3434731-3436728 layout
async function* runPreToolUseFunctionChain({
  hookInput: hookInput,
  toolInput: toolInput,
  signal: signal,
  runSettingsHooks: runSettingsHooks,
  origin: origin,
  managedPass: managedPass,
  failure: failure,
}) {
  let w = m3t(hookInput.tool_name, hookInput.tool_use_id, toolInput),
    L = awaitHooksRespawnUnlessSessionEnd({ event: "classic.PreToolUse", e: w, origin: origin }, signal);
  if (L !== void 0) {
    let qt = await L.then(
      () => {
        return;
      },
      (rn) => (isAbortError(rn) ? Promise.reject(rn) : rn),
    );
    yield* qt !== void 0
      ? [toPermissionHookYield({ deny: errorMessage(qt) })]
      : runPreToolUseFunctionChain({
          hookInput: hookInput,
          toolInput: toolInput,
          signal: signal,
          runSettingsHooks: runSettingsHooks,
          origin: origin,
          managedPass: managedPass,
          failure: failure,
        });
    return;
  }
  let {
      managed: managed,
      pass: pass,
      covers: covers,
    } = createManagedStageController(runSettingsHooks, managedPass),
    {
      core: core,
      runs: runs,
      deniedBefore: deniedBefore,
    } = createCoreStageController(runSettingsHooks, covers),
    Ee = await Wrs(w, [managed, ...hookMembersFor("classic.PreToolUse", origin), core], {
      signal: signal,
      origin: hookOriginFromStack(origin),
    }).catch((qt) => {
      if (failure !== void 0) failure.deniedBefore = deniedBefore(qt);
      throw qt;
    }),
    Ae = Rs(Ee.updatedInput ?? toolInput),
    last = runs.last(
      ({ input: input, made: made }) =>
        Rs(input) === Ae || (made.result.updatedInput !== void 0 && Rs(made.result.updatedInput) === Ae),
    ),
    Me = (last ?? runs.last())?.made,
    We = last?.made.soleAsk,
    ze =
      Ee.ask !== void 0 &&
      We !== void 0 &&
      pass()?.result.ask === void 0 &&
      last?.made.result.ask === Ee.ask &&
      Ee.ask === (We.hookPermissionDecisionReason ?? "")
        ? We
        : void 0,
    lt = ze !== void 0 && Ae === Rs(ze.updatedInput ?? last?.input) ? ze.permissionDisplay : void 0,
    Je =
      Ee.updatedInput === void 0 || (ze?.updatedInput !== void 0 && Rs(ze.updatedInput) === Ae) ? ze : void 0,
    combined = (pass()?.yields ?? []).concat(Me?.yields ?? []),
    pt = toPermissionHookYield(Ee),
    Et = [...(pass()?.rewrites ?? []), ...runs.all().flatMap(({ made: made }) => made.rewrites ?? [])],
    yt = pass()?.result.updatedInput ?? toolInput,
    gt = () =>
      Et.length > 0 &&
      runs.all().every(({ input: input }) => Rs(input) === Rs(yt)) &&
      Ae === Rs(runs.last()?.made.result.updatedInput ?? yt),
    At =
      pt.updatedInput === void 0
        ? void 0
        : (Et.find((qt) => qt.kind !== "local_code")?.kind ?? (gt() ? "local_code" : "mod")),
    It = new Set([
      ...Et.flatMap((qt) => (qt.source === void 0 ? [] : [qt.source])),
      ...(At === "mod" ? ["mod"] : []),
    ]),
    Yt = At === void 0 || It.size === 0 ? void 0 : It.size === 1 ? [...It][0] : "mixed";
  (yield* combined.filter((qt) => qt.heldForServedCall !== !0),
    yield {
      ...pt,
      ...(At !== void 0 && { rewriterKind: At }),
      ...(Yt !== void 0 && { rewriteSource: Yt }),
      ...(Je?.hookSource !== void 0 && { hookSource: Je.hookSource }),
      ...(Je?.hookPluginId !== void 0 && { hookPluginId: Je.hookPluginId }),
      ...(isHeldAskResult(pt, combined) && { heldForServedCall: !0 }),
      ...(lt && { permissionDisplay: lt }),
    });
}
/**
 * 执行 PreToolUse 钩子并在需要时补一个 held（为云端服务调用暂扣）结果。
 */
//@ chunk-e6aww6q8.js:3436728-3437216 facade-exports
async function* executePreToolHooks(e, n, r, s, h, y, S = TOOL_HOOK_EXECUTION_TIMEOUT_MS, w, L) {
  let G = () => {
      let ke = getToolPermissionContext(s);
      return isBypassPermissionsInEffect(findToolByName(s.options.tools, e), ke, ke.mode);
    },
    q = w?.managedHooksOnly
      ? void 0
      : await holdToolCallForHookPolicy(
          () =>
            hasToolHookMatching({
              hookEvent: "PreToolUse",
              toolName: e,
              toolInput: r,
              tools: s.options.tools,
              toolAliases: s.options.toolAliases,
              sessionHooks: s.sessionHooksRegistry,
              sessionId: registerAgent(s, "PreToolUse", s.session.id),
              held: "only",
            }),
          G,
          y,
        ),
    Z = [];
  for await (let ke of executePreToolHooks_2(e, n, r, s, h, y, S, w, L)) {
    if (q !== void 0) Z.push(ke);
    yield ke;
  }
  let Se = p$t(withHeldPermissionBehavior(q, G), Z);
  if (Se !== void 0) yield Se;
}
/**
 * 执行 PreToolUse 钩子（matcher = 工具名，输入含 tool_name/tool_input/tool_use_id/mcp_server）：复用 managed 预跑结果；有 mods 链时走 runPreToolUseFunctionChain，否则直接 executeHooks。
 */
//@ chunk-e6aww6q8.js:3437216-3438478 fingerprint = executePreToolHooks (0.581)
async function* executePreToolHooks_2(
  toolName,
  toolUseID,
  toolInput,
  toolUseContext,
  permissionMode,
  signal,
  timeoutMs,
  requestPrompt,
  toolInputSummary,
) {
  if (requestPrompt?.managedHooksOnly && managedTierHooks("PreToolUse") === "none") return;
  let managedPass = toolUseContext.managedPass,
    q =
      !requestPrompt?.managedHooksOnly &&
      managedPass?.toolUseId === toolUseID &&
      XAn(managedPass.input, toolInput, managedPass.inputKey)
        ? managedPass.pass
        : void 0,
    Z = hasModuleHookingSite("classic.PreToolUse"),
    Se =
      !requestPrompt?.managedHooksOnly && (q !== void 0 || Z) && isPlainObject_4(toolInput)
        ? toolInput
        : void 0,
    sessionId =
      !(signal ?? toolUseContext.abortController.signal).aborted && canSkipEmptyClassicDispatch("PreToolUse");
  if (
    (Se === void 0 ||
      ((!Z || sessionId) &&
        (q === void 0 || (q.yields.length === 0 && Object.keys(q.result).length === 0)))) &&
    !requestPrompt?.managedHooksOnly &&
    !hasHookToRun(
      "PreToolUse",
      toolUseContext.sessionHooksRegistry,
      registerAgent(toolUseContext, "PreToolUse", toolUseContext.session.id),
    )
  )
    return;
  logForDebugging(`executePreToolHooks called for tool: ${toolName}`, { level: "verbose" });
  let Ee = {
    ...createBaseHookInput(toolUseContext.session, hookInputCwd(), permissionMode, toolUseContext),
    hook_event_name: "PreToolUse",
    tool_name: toolName,
    tool_input: toolInput,
    tool_use_id: toolUseID,
    ...getMcpServerHookField(toolName, toolUseContext),
  };
  function Ae(Ie, Me) {
    return executeHooks({
      session: toolUseContext.session,
      hookInput: Ie === void 0 ? Ee : { ...Ee, tool_input: Ie },
      toolUseID: toolUseID,
      matchQuery: toolName,
      signal: signal,
      timeoutMs: timeoutMs,
      toolUseContext: toolUseContext,
      managedHooksOnly: Me?.managedHooksOnly ?? requestPrompt?.managedHooksOnly,
      managedHooksExcluded: Me?.managedHooksExcluded,
    });
  }
  if (Se !== void 0) {
    for await (let Ie of runPreToolUseFunctionChain({
      hookInput: Ee,
      toolInput: Se,
      signal: signal ?? toolUseContext.abortController.signal,
      runSettingsHooks: Ae,
      origin: toolUseContext.hookOrigin,
      managedPass: q,
      failure: toolInputSummary,
    }))
      yield* keptForObservationContext(
        { toolUseContext: toolUseContext, hookInput: Ee },
        stripConfinedHookApproval(Ie, "PreToolUse function-hook chain", Ee, toolUseContext),
      );
    return;
  }
  yield* Ae();
}
/**
 * 执行 PostToolUse 钩子（输入含 tool_response/duration_ms），可返回 additionalContext、updatedToolOutput、classifierContext。
 */
//@ chunk-e6aww6q8.js:3438478-3438969 facade-exports = executePostToolHooks (0.869)
async function* executePostToolHooks(e, n, r, s, h, y, S, w = TOOL_HOOK_EXECUTION_TIMEOUT_MS, L, G) {
  if (G?.managedHooksOnly && managedTierHooks("PostToolUse") === "none") return;
  if (!G?.managedHooksOnly && hasNoHookForToolCall("PostToolUse", e, r, h)) return;
  let q = {
    ...createBaseHookInput(h.session, hookInputCwd(), y, h),
    hook_event_name: "PostToolUse",
    tool_name: e,
    tool_input: r,
    tool_response: s,
    tool_use_id: n,
    duration_ms: L,
    ...getMcpServerHookField(e, h),
  };
  yield* executeHooks({
    session: h.session,
    hookInput: q,
    toolUseID: n,
    matchQuery: e,
    signal: S,
    timeoutMs: w,
    toolUseContext: h,
    managedHooksOnly: G?.managedHooksOnly,
    managedHooksExcluded: G?.managedHooksExcluded,
  });
}
/**
 * 执行 PostToolUseFailure 钩子（error/is_interrupt/duration_ms）。
 */
//@ chunk-e6aww6q8.js:3438969-3439376 facade-exports = executePostToolUseFailureHooks (0.888)
async function* executePostToolUseFailureHooks(
  e,
  n,
  r,
  s,
  h,
  y,
  S,
  w,
  L = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  G,
) {
  if (
    !hasHookToRun(
      "PostToolUseFailure",
      h.sessionHooksRegistry,
      registerAgent(h, "PostToolUseFailure", h.session.id),
    )
  )
    return;
  let q = {
    ...createBaseHookInput(h.session, hookInputCwd(), S, h),
    hook_event_name: "PostToolUseFailure",
    tool_name: e,
    tool_input: r,
    tool_use_id: n,
    error: s,
    is_interrupt: y,
    duration_ms: G,
    ...getMcpServerHookField(e, h),
  };
  yield* executeHooks({
    session: h.session,
    hookInput: q,
    toolUseID: n,
    matchQuery: e,
    signal: w,
    timeoutMs: L,
    toolUseContext: h,
  });
}
/**
 * 执行 PostToolBatch 钩子（316 新增）：一批工具调用全部完成、下一次请求前触发一次，输入 tool_calls 数组；附件上附 accountMemoryBatch 标记。
 */
//@ chunk-e6aww6q8.js:3439376-3439911 facade-exports
async function* executePostToolBatchHooks(e, n, r, s, h, y = TOOL_HOOK_EXECUTION_TIMEOUT_MS) {
  if (r.options.settingsHooksOff) return;
  if (!hasHookToRun("PostToolBatch", r.sessionHooksRegistry, registerAgent(r, "PostToolBatch", r.session.id)))
    return;
  let S = {
      ...createBaseHookInput(r.session, hookInputCwd(), s, r),
      hook_event_name: "PostToolBatch",
      tool_calls: e,
    },
    w = KBr(
      e.map((L) => L.tool_name),
      r.options.tools,
    );
  for await (let L of executeHooks({
    session: r.session,
    hookInput: S,
    toolUseID: n,
    signal: h,
    timeoutMs: y,
    toolUseContext: r,
  }))
    yield L.message?.type === "attachment"
      ? {
          ...L,
          message: {
            ...L.message,
            attachment: Object.assign({}, L.message.attachment, { accountMemoryBatch: w }),
          },
        }
      : L;
}
/**
 * 执行 PermissionDenied 钩子（auto 模式拒绝后），钩子可返回 retry:true 让模型重试。
 */
//@ chunk-e6aww6q8.js:3439911-3440280 facade-exports = executePermissionDeniedHooks (0.911)
async function* executePermissionDeniedHooks(
  toolName,
  toolUseID,
  toolInput,
  reason,
  toolUseContext,
  permissionMode,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
) {
  if (
    !hasHookToRun(
      "PermissionDenied",
      toolUseContext.sessionHooksRegistry,
      registerAgent(toolUseContext, "PermissionDenied", toolUseContext.session.id),
    )
  )
    return;
  let L = {
    ...createBaseHookInput(toolUseContext.session, hookInputCwd(), permissionMode, toolUseContext),
    hook_event_name: "PermissionDenied",
    tool_name: toolName,
    tool_input: toolInput,
    tool_use_id: toolUseID,
    reason: reason,
    ...getMcpServerHookField(toolName, toolUseContext),
  };
  yield* executeHooks({
    session: toolUseContext.session,
    hookInput: L,
    toolUseID: toolUseID,
    matchQuery: toolName,
    signal: signal,
    timeoutMs: timeoutMs,
    toolUseContext: toolUseContext,
  });
}
/**
 * 执行 PermissionRequest 钩子（权限对话框出现时，输入含 permission_suggestions），钩子可返回 allow（可带 updatedInput/updatedPermissions）或 deny。
 */
//@ chunk-e6aww6q8.js:3440280-3440613 facade-exports = executePermissionRequestHooks (1)
async function* executePermissionRequestHooks(e, n, r, s, h, y, S, w = TOOL_HOOK_EXECUTION_TIMEOUT_MS) {
  logForDebugging(`executePermissionRequestHooks called for tool: ${e}`);
  let L = {
    ...createBaseHookInput(s.session, hookInputCwd(), h, s),
    hook_event_name: "PermissionRequest",
    tool_name: e,
    tool_input: r,
    permission_suggestions: y,
    ...getMcpServerHookField(e, s),
  };
  yield* executeHooks({
    session: s.session,
    hookInput: L,
    toolUseID: n,
    matchQuery: e,
    signal: S,
    timeoutMs: w,
    toolUseContext: s,
  });
}
/**
 * 工具是 MCP 工具时给钩子输入加 mcp_server 字段。
 */
//@ chunk-e6aww6q8.js:3440613-3440700 affinity
function getMcpServerHookField(e, n) {
  let r = findToolByName(n.options.tools, e)?.mcpInfo;
  return r ? { mcp_server: mcpServerIdentityForHooks(r) } : {};
}
/**
 * 执行 UserPromptExpansion 钩子（316 新增；用户输入的斜杠命令展开成提示词时，matcher = command_name），exit 2 阻止展开。
 */
//@ chunk-e6aww6q8.js:3440738-3441128 affinity
async function* executeUserPromptExpansionHooks(e, n, r, s, h, y, S) {
  let w = S.agentId ?? S.session.id;
  if (!hasHookToRun("UserPromptExpansion", S.sessionHooksRegistry, w)) return;
  let L = {
    ...createBaseHookInput(S.session, hookInputCwd(), y),
    hook_event_name: "UserPromptExpansion",
    expansion_type: e,
    command_name: n,
    command_args: r,
    command_source: s,
    prompt: h,
  };
  yield* executeHooks({
    session: S.session,
    hookInput: L,
    toolUseID: randomUUID_39(),
    signal: S.abortController.signal,
    timeoutMs: TOOL_HOOK_EXECUTION_TIMEOUT_MS,
    toolUseContext: S,
  });
}
/**
 * 无 toolUseContext 时执行 UserPromptSubmit 钩子（只用会话钩子注册表），超时 30 秒。
 */
//@ chunk-e6aww6q8.js:3445264-3445551 placement
async function* executeUserPromptSubmitHooksForSession(e, n, r, s, h, y, S) {
  if (!hasHookToRun("UserPromptSubmit", n, e.id)) return;
  let w = {
    ...createBaseHookInput(e, hookInputCwd(), s),
    hook_event_name: "UserPromptSubmit",
    prompt: r,
    ...!1,
    session_title: getCurrentSessionTitle(e.id),
  };
  yield* executeHooks({
    session: e,
    hookInput: w,
    toolUseID: randomUUID_40(),
    signal: h,
    timeoutMs: USER_PROMPT_SUBMIT_HOOK_TIMEOUT_MS,
    sessionHooks: n,
    storageV5: y,
    credentials: S,
  });
}
/**
 * 执行 UserPromptSubmit 钩子：输入含 prompt 与 session_title，超时 30 秒；exit 2 阻止并抹去原提示词。
 */
//@ chunk-e6aww6q8.js:3445551-3445934 facade-exports = executeUserPromptSubmitHooks (0.764)
async function* executeUserPromptSubmitHooks(e, n, r, s, h = {}) {
  let sessionId = r.agentId ?? r.session.id;
  if (!h.managedHooksOnly && !hasHookToRun("UserPromptSubmit", r.sessionHooksRegistry, sessionId)) return;
  let S = {
    ...createBaseHookInput(r.session, hookInputCwd(), n),
    hook_event_name: "UserPromptSubmit",
    prompt: e,
    ...!1,
    session_title: getCurrentSessionTitle(r.session.id),
  };
  yield* executeHooks({
    session: r.session,
    hookInput: S,
    toolUseID: randomUUID_40(),
    signal: r.abortController.signal,
    timeoutMs: USER_PROMPT_SUBMIT_HOOK_TIMEOUT_MS,
    toolUseContext: r,
    ...h,
  });
}
/**
 * 是否配置了 WorktreeCreate 钩子。
 */
//@ chunk-e6aww6q8.js:3445985-3446035 facade-exports = hasWorktreeCreateHook (0.551)
function dispatchesWorktreeCreate() {
  return hasWorktreeCreateHook() || F3("WorktreeCreate");
}
//@ chunk-e6aww6q8.js:3446085-3446104 affinity
var HOOK_ERROR_LINE_HEAD = 60,
  HOOK_ERROR_LINE_TAIL = 100;
/**
 * 执行 WorktreeCreate 钩子：command 钩子 stdout 输出路径，http/callback 返回 hookSpecificOutput.worktreePath；配置了却没跑、无路径或失败都抛错；相对路径按项目根解析。
 */
//@ chunk-e6aww6q8.js:3446104-3447412 facade-exports = executeWorktreeCreateHook (0.659)
async function executeWorktreeCreateHook(e, n, { storageV5: r, credentials: s } = {}) {
  let hookInput = { ...createBaseHookInput(e, getCwd()), hook_event_name: "WorktreeCreate", name: n },
    results = await executeHooksOutsideREPL({
      session: e,
      hookInput: hookInput,
      timeoutMs: TOOL_HOOK_EXECUTION_TIMEOUT_MS,
      storageV5: r,
      credentials: s,
    }),
    S = firstWorktreePathOutput(results);
  if (S === void 0) {
    if (results.length === 0) {
      if (!hasWorktreeCreateHook()) return;
      throw Error(
        "WorktreeCreate hook failed: hook is configured but did not run (workspace not trusted or matcher mismatch)",
      );
    }
    let mapped = results
      .filter((G) => !G.succeeded)
      .map((G) => `${G.command}: ${truncateMiddle_2(G.output.trim()) || "no output"}`);
    if (mapped.length === 0 && results.some((G) => G.answerHeld))
      throw Error(
        "A WorktreeCreate hook from your own Claude Code files ran, but this session doesn't let your own hooks choose the worktree folder (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG), so Claude Code didn't use any folder the hook made (remove that folder if you don't need it). Remove that hook, or turn off the skill, agent or plugin that adds it, to create worktrees in this session.",
      );
    if (mapped.length === 0)
      throw Error(
        "WorktreeCreate hook failed: hook succeeded but returned no worktree path (command: echo the path to stdout; http/callback: return hookSpecificOutput.worktreePath)",
      );
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `WorktreeCreate hook failed: ${mapped.join("; ")}`,
      "WorktreeCreate hook failed (stderr redacted)",
    );
  }
  if (isAbsolute_45(S)) return { worktreePath: S };
  let w = xo(e);
  return { worktreePath: resolve_36(await safeHookCwd(IMe(hookInput.cwd, w.originalCwd), w), S) };
}
/**
 * 执行 WorktreeRemove 钩子：返回 not_configured/removed/failed；失败但目录已不存在时视为已删除。
 */
//@ chunk-e6aww6q8.js:3447412-3448547 facade-exports = executeWorktreeRemoveHook (0.427)
async function executeWorktreeRemoveHook(e, n, { storageV5: r, credentials: s } = {}) {
  if (!hasWorktreeRemoveHook()) return { kind: "not_configured" };
  let hookInput = {
      ...createBaseHookInput(e, getCwd()),
      hook_event_name: "WorktreeRemove",
      worktree_path: n,
    },
    results = await executeHooksOutsideREPL({
      session: e,
      hookInput: hookInput,
      timeoutMs: TOOL_HOOK_EXECUTION_TIMEOUT_MS,
      storageV5: r,
      credentials: s,
      personsHooksRunUntrusted: !0,
    });
  if (results.length === 0) {
    if (!hasWorktreeRemoveHook_2()) return { kind: "not_configured" };
    return {
      kind: "failed",
      summary: "is configured but did not run (workspace not trusted, or no matching hook entries)",
    };
  }
  let filtered = results.filter((Z) => !Z.succeeded);
  for (let result of filtered)
    logForDebugging(`WorktreeRemove hook failed [${result.command}]: ${result.output.trim()}`, {
      level: "error",
    });
  let [w] = filtered;
  if (w === void 0) {
    if (shouldSkipHookDueToTrust() && (await pathPresence(n)) !== "gone")
      return {
        kind: "failed",
        summary: "left the tree in place (workspace not trusted, so the folder's own hooks did not run)",
      };
    return { kind: "removed" };
  }
  let L = "";
  for (let Z of w.output.split(`
`))
    if (((L = printableLabel(Z, { head: HOOK_ERROR_LINE_HEAD, tail: HOOK_ERROR_LINE_TAIL })), L)) break;
  let G = L ? ` (${L})` : "",
    q = w.exitCode !== void 0 ? `exited ${w.exitCode}${G}` : `failed${G || " with no output"}`;
  if ((await pathPresence(n)) === "gone")
    return (
      logForDebugging(`WorktreeRemove hook ${q}, but nothing is left at ${n} \u2014 treating it as removed`, {
        level: "warn",
      }),
      { kind: "removed" }
    );
  return { kind: "failed", summary: q };
}
/**
 * SessionEnd 时间预算常量：最小 1.5s、钩子 timeout 上限 60s、env 覆盖上限 1h，以及按宿主保存的待唤醒 asyncRewake 任务集合。
 */
//@ chunk-e6aww6q8.js:3448547-3448606 facade-exports
var SESSION_END_HOOK_TIMEOUT_MS_DEFAULT = 1500,
  SESSION_END_HOOK_TIMEOUT_CAP_MS = 60000,
  SESSION_END_ENV_TIMEOUT_CAP_MS = 3600000,
  pendingRewakeHooksByHost = new SessionRootSlot(() => new Set());
//@ chunk-e6aww6q8.js:3448606-3448640 layout
function getPendingRewakeHooks() {
  return pendingRewakeHooksByHost.of(getRootSession());
}
//@ chunk-e6aww6q8.js:3448640-3448662 layout
var REWAKE_DRAIN_TIMEOUT_MS = 30000,
  REWAKE_SUMMARY_MAX_CHARS = 300;
//@ chunk-e6aww6q8.js:3448662-3448727 layout
function squashToSummaryLine(e) {
  return e.trim().replace(/\s+/g, " ").slice(0, REWAKE_SUMMARY_MAX_CHARS);
}
/**
 * 等待所有 asyncRewake 后台钩子完成，最多 30 秒。
 */
//@ chunk-e6aww6q8.js:3448727-3448863 facade-exports
async function flushPendingAsyncRewakeHooks() {
  let e = getPendingRewakeHooks();
  if (e.size === 0) return;
  let settled = Promise.allSettled([...e]);
  await Promise.race([settled, sleep(REWAKE_DRAIN_TIMEOUT_MS, void 0, { unref: !0 })]);
}
/**
 * SessionEnd 钩子总超时 = max(组织设定或 1.5s, env 覆盖)。
 */
//@ chunk-e6aww6q8.js:3448863-3448912 facade-exports
function getSessionEndHookDefaultTimeoutMs() {
  return Math.max(
    getManagedSessionEndTimeoutMs() ?? SESSION_END_HOOK_TIMEOUT_MS_DEFAULT,
    getSessionEndHookTimeoutMs_2(),
  );
}
//@ chunk-e6aww6q8.js:3448912-3449382 layout
function getManagedSessionEndTimeoutMs() {
  let e;
  try {
    let n = getPolicyHooksFromSnapshot();
    e =
      n === "unreadable" ||
      (n.SessionEnd ?? []).length > 0 ||
      getManagedHooksForEvent("SessionEnd").length > 0 ||
      getHooksForEvent("SessionEnd").some(
        (r) => "pluginId" in r && typeof r.pluginId === "string" && isManagedPluginId(r.pluginId),
      );
  } catch (error) {
    (logForDebugging(
      `Hooks: who defines a SessionEnd hook could not be told, so its time budget is read as the organization's hook reads it: ${errorMessage(error)}`,
      { level: "error" },
    ),
      (e = !0));
  }
  return e
    ? AQ(() => env.CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS)
    : env.CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS;
}
/**
 * 读取 CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS（上限 1 小时），与组织值相同时视为未覆盖。
 */
//@ chunk-e6aww6q8.js:3449382-3449492 fingerprint = getSessionEndHookTimeoutMs (0.793)
function getSessionEndHookTimeoutMs_2() {
  let raw = env.CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS;
  return raw !== void 0 && raw !== getManagedSessionEndTimeoutMs()
    ? Math.min(raw, SESSION_END_ENV_TIMEOUT_CAP_MS)
    : 0;
}
/**
 * SessionEnd 的结束时限：取各来源 SessionEnd 钩子 timeout 的最大值（上限 60s），不少于 1.5s。
 */
//@ chunk-e6aww6q8.js:3449492-3449820 facade-exports
function getSessionEndHookTimeoutMs() {
  let e = getSessionEndHookTimeoutMs_2(),
    n = getManagedSessionEndTimeoutMs();
  if (n !== void 0) return Math.max(n, e);
  let r = 0,
    s = shouldAllowManagedHooksOnly() ? [] : (getMainThreadAgentHooks()?.SessionEnd ?? []),
    h = getHooksConfigFromSnapshot()?.SessionEnd ?? [],
    y = [
      ...(shouldOmitCheckoutSessionEndHooks("SessionEnd")
        ? withoutCheckoutSettingsHooks(h, "SessionEnd")
        : h),
      ...s,
      ...getPluginSettingsHooks("SessionEnd"),
    ];
  for (let S of y)
    for (let hook of S.hooks) if (hook.timeout && hook.timeout * 1000 > r) r = hook.timeout * 1000;
  return Math.max(SESSION_END_HOOK_TIMEOUT_MS_DEFAULT, Math.min(r, SESSION_END_HOOK_TIMEOUT_CAP_MS), e);
}
//@ chunk-e6aww6q8.js:3449820-3449932 layout
var ACCOUNT_MEMORY_OUTPUT_WITHHELD =
  "(output withheld: this hook ran for an account memory tool, whose text stays out of the conversation)";
/**
 * 把 command 钩子转为后台：asyncRewake 时等进程结束，exit 2 用 rewakeMessage/rewakeSummary 包装 stderr 作为下一条提醒唤醒模型（缺失脚本只报告一次）；普通 async 登记到 AsyncHookRegistry 由后续轮询收集。
 */
//@ chunk-e6aww6q8.js:3449932-3452334 layout
function backgroundHookProcess({
  processId: processId,
  hookId: hookId,
  shellCommand: shellCommand,
  asyncResponse: asyncResponse,
  hookEvent: hookEvent,
  hookName: hookName,
  command: command,
  asyncRewake: asyncRewake,
  rewakeMessage: rewakeMessage,
  rewakeSummary: rewakeSummary,
  scriptPaths: scriptPaths,
  pluginId: pluginId,
  toolName: toolName,
  ranForAccountMemory: ranForAccountMemory = !1,
  missingScriptThere: missingScriptThere,
}) {
  if (asyncRewake) {
    let Ee = shellCommand.result.then(async (Ie) => {
        await new Promise((nt) => setImmediate(nt));
        let stdout = await shellCommand.taskOutput.getStdout(),
          stderr = shellCommand.taskOutput.getStderr();
        (shellCommand.cleanup(),
          emitHookResponse({
            hookId: hookId,
            hookName: hookName,
            hookEvent: hookEvent,
            output: stdout + stderr,
            stdout: stdout,
            stderr: stderr,
            exitCode: Ie.code,
            outcome: Ie.code === 0 ? "success" : "error",
          }));
        let ze;
        if (pluginId) {
          let nt = createJsonParseBudget();
          for (let pt of stdout.split(`
`)) {
            let trimmed = pt.trim();
            if (!trimmed.startsWith("{") || !nt(trimmed)) continue;
            try {
              let yt = jsonParse(trimmed);
              if ("async" in yt) continue;
              if (isSyncHookJSONOutput(yt)) {
                if (
                  (emitHookMetrics(yt.metrics, pluginId, hookEvent),
                  typeof yt.rewakeSummary === "string" &&
                    yt.rewakeSummary.trim() &&
                    isOfficialPluginId(pluginId))
                )
                  ze = squashToSummaryLine(yt.rewakeSummary);
              }
              break;
            } catch {}
          }
        }
        let lt = Ie.code === 2 && !ranForAccountMemory ? missingScriptThere?.() : void 0,
          Je =
            lt !== void 0
              ? { ...lt, output: stderr.trim() ? stderr : stdout }
              : Ie.code === 2
                ? await detectMissingHookScript({
                    stdout: stdout,
                    stderr: stderr,
                    scriptPaths: (scriptPaths ?? []).map((nt) => nt.path),
                  })
                : void 0;
        if (
          lt?.isRepeat ??
          rememberBounded(
            YBr.of(getRootSession().host),
            `${hookName}
${command}`,
            Je?.output,
          )
        ) {
          logForDebugging(
            `Hooks: asyncRewake hook "${hookName}" (${command}) exited 2 again because ${Je?.scriptPath} cannot be opened; already reported, not waking the model`,
            { level: "warn" },
          );
          return;
        }
        if (Ie.code === 2) {
          let nt, pt, Et;
          if (Je !== void 0) {
            let yt = lt?.cutFrom ?? scriptPaths?.find((At) => At.path === Je.scriptPath)?.cutFrom,
              gt = "";
            if (((pt = `${hookEvent} hook could not open ${basename_13(Je.scriptPath)}`), yt !== void 0))
              ((gt = ` (the hook's command passes ${yt} without quotes, so the shell split it at the space)`),
                (pt = `${hookEvent} hook needs quotes around a path with a space (${basename_13(yt)})`));
            ((nt = `${hookName} hook could not run: ${Je.scriptPath} cannot be opened${gt}, so its command exited with code 2 without doing any work. This is a broken hook installation, not feedback on your work; it is reported this once and identical repeats are dropped. Interpreter output:`),
              (Et = Je.output));
          } else if (ranForAccountMemory)
            ((nt = rewakeMessage ?? `Stop hook blocking error from command "${hookName}":`),
              (pt = rewakeSummary ?? "Stop hook feedback"),
              (Et = ACCOUNT_MEMORY_OUTPUT_WITHHELD));
          else
            ((nt = rewakeMessage ?? `Stop hook blocking error from command "${hookName}":`),
              (pt = ze ?? rewakeSummary ?? "Stop hook feedback"),
              (Et = stderr || stdout));
          enqueueHookTaskNotification({
            summary: scrubHookOutputTags(pt),
            body: scrubHookOutputTags(TA(`${nt} ${Et}`)),
            priority: "next",
            stopHookActive: !0,
            turnAttribution: "inherit",
          });
        }
      }),
      Ae = getPendingRewakeHooks();
    return (Ae.add(Ee), Ee.finally(() => Ae.delete(Ee)), !0);
  }
  if (!shellCommand.background(processId, { skipSpill: !0, atExit: "leave" })) return !1;
  return (
    registerPendingAsyncHook({
      processId: processId,
      hookId: hookId,
      asyncResponse: asyncResponse,
      hookEvent: hookEvent,
      hookName: hookName,
      command: command,
      shellCommand: shellCommand,
      toolName: toolName,
      pluginId: pluginId,
    }),
    !0
  );
}
/**
 * 工作区未被信任时返回 true（所有设置钩子跳过）。
 */
//@ chunk-e6aww6q8.js:3452334-3452360 facade-exports
function shouldSkipHookDueToTrust() {
  return !isProjectScopeTrustAccepted();
}
//@ chunk-e6aww6q8.js:3452360-3452596 layout
function shouldOmitCheckoutSessionEndHooks(e) {
  if (e !== "SessionEnd" || !getIsNonInteractiveSession()) return !1;
  try {
    if (checkHasTrustDialogAccepted()) return !1;
  } catch (error) {
    logForDebugging(`Hooks: workspace trust could not be read: ${errorMessage(error)}`, { level: "warn" });
  }
  return (logForDebugging(`Leaving out the checkout's ${e} hooks - workspace trust not accepted`), !0);
}
/**
 * 会话 id 的安全字符集正则。
 */
//@ chunk-e6aww6q8.js:3452596-3452641 facade-exports
var SAFE_CALLER_ID = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,255}$/;
/**
 * 钩子输入 cwd：无盘会话用 gl()，否则 getCwd()。
 */
//@ chunk-e6aww6q8.js:3452641-3452676 facade-exports
function hookInputCwd() {
  return isDiskless() ? gl() : getCwd();
}
//@ chunk-e6aww6q8.js:3452676-3452719 layout
function getHookProject(e) {
  return isDiskless() ? e.project : xo(e);
}
/**
 * 构造所有钩子输入的公共字段：session_id、transcript_path、cwd、scratchpad_dir、prompt_id、permission_mode、agent_id、agent_type、effort；云端服务调用时 session_id 为 served:<caller>、transcript_path 为空。
 */
//@ chunk-e6aww6q8.js:3452719-3453338 facade-exports
function createBaseHookInput(e, n, r, s) {
  let h = s?.agentType ?? getMainThreadAgentType(),
    y = s?.options?.mainLoopModel,
    S = resolveEffortLevel(s?.getAppState?.() ?? {}, y, { withHold: isSessionHoldFor(s ?? {}) }),
    w = getEffortLayerOverride(s?.permissionLayers),
    L = y && s?.getAppState && modelSupportsEffort(y) ? { level: getEffortLevelOrHigh(y, S, w) } : void 0,
    G = n ?? "",
    q = s?.remoteCall;
  if (q !== void 0)
    return {
      session_id: `served:${(SAFE_CALLER_ID.test(q.origin.callerSessionId ?? "") ? q.origin.callerSessionId : void 0) ?? "unknown"}`,
      transcript_path: "",
      cwd: G,
      permission_mode: r,
      agent_id: s?.agentId,
      effort: L,
    };
  return {
    session_id: e.id,
    transcript_path: isDiskless() ? "" : getTranscriptPathForSession(e.id),
    cwd: G,
    scratchpad_dir: isScratchpadEnabled() ? (getScratchpadDir(e.id) ?? void 0) : void 0,
    prompt_id: getPromptId_2() ?? void 0,
    permission_mode: r,
    agent_id: s?.agentId,
    agent_type: h,
    effort: L,
  };
}
//@ chunk-e6aww6q8.js:3453338-3453493 layout
function getHookRewriterKind(e, n) {
  switch (e.type) {
    case "command":
    case "script":
      return n ? "session_hook" : "local_code";
    case "callback":
      return "local_code";
    default:
      return "remote";
  }
}
//@ chunk-e6aww6q8.js:3453493-3453685 fingerprint = validateHookJson (0.727)
function validateHookJson(jsonString) {
  let parsed = jsonParse(jsonString),
    validation = hookJSONOutputSchema().safeParse(parsed);
  if (validation.success)
    return (
      logForDebugging("Successfully parsed and validated hook JSON output"),
      validateHookJsonOutput(parsed, validation.data),
      { json: validation.data }
    );
  return { validationError: formatHookOutputError(parsed, validation.error) };
}
/**
 * 解析钩子 stdout：不以 { 开头视为纯文本；{async:true} 识别为异步；JSON 按输出 schema 校验，失败时返回纯文本 + 带期望 schema 的 validationError；多个 JSON 文档视为纯文本。
 */
//@ chunk-e6aww6q8.js:3453685-3454517 facade-exports
function parseHookOutput(e) {
  let trimmed = e.trim();
  if (!trimmed.startsWith("{"))
    return (logForDebugging("Hook output does not start with {, treating as plain text"), { plainText: e });
  if (announcedAsync(e)) return { json: { async: !0 } };
  try {
    let r = validateHookJson(trimmed);
    if ("json" in r) return r;
    let s = `${r.validationError}

Expected schema:
${parseHookOutput_2()}`;
    return (logForDebugging(s), { plainText: e, validationError: s });
  } catch (error) {
    if (!trimmed.endsWith("}"))
      return (
        logForDebugging(
          `Hook output starts with { but is not a JSON object, treating as plain text: ${errorMessage(error)}`,
        ),
        { plainText: e }
      );
    if (isJsonLinesOutput(trimmed))
      return (
        logForDebugging("Hook output is several JSON documents, treating as plain text"),
        { plainText: e }
      );
    let s = `Hook output looks like a JSON object but is not valid JSON \u2014 ${errorMessage(error)}. Emit the payload with a JSON encoder (jq, ConvertTo-Json, json.dumps) rather than string concatenation so backslashes and quotes inside strings are escaped.`;
    return (logForDebugging(s), { plainText: e, validationError: s });
  }
}
//@ chunk-e6aww6q8.js:3454517-3454784 layout
function isJsonLinesOutput(e) {
  let filtered = e
    .split(
      `
`,
    )
    .filter((s) => s.trim() !== "");
  if (filtered.length < 2) return !1;
  using r = slowLogging`parseHookOutput: json lines (${filtered.length})`;
  return filtered.every((s) => {
    try {
      let safeParse = hookJSONOutputSchema().safeParse(jsonParseRaw(s.trim()));
      return !safeParse.success || Object.keys(safeParse.data).length === 0;
    } catch {
      return !1;
    }
  });
}
/**
 * 判断钩子 stdout 是否声明自己转为异步：去掉前后空白后是 JSON 对象且 `async === true`。
 */
//@ chunk-e6aww6q8.js:3454784-3454946 facade-exports = isSyncHookJSONOutput (1)
function announcedAsync(json) {
  let trimmed = getFirstLine(json).trim();
  if (!trimmed.startsWith("{")) return !1;
  try {
    let r = jsonParse(trimmed);
    return typeof r === "object" && r !== null && "async" in r && r.async === !0;
  } catch {
    return !1;
  }
}
/**
 * 非 0 退出且有 stderr 时把 stderr 附到校验错误后。
 */
//@ chunk-e6aww6q8.js:3454946-3455042 facade-exports
function withHookStderr(e, n, r) {
  let trimmed = r.trim();
  return n !== 0 && trimmed
    ? `${e}

Hook exited ${n} with stderr:
${trimmed}`
    : e;
}
//@ chunk-e6aww6q8.js:3455042-3455100 layout
function isWithheldGuardHttpHook(e, n) {
  return e.withheld === !0 && isHttpMcpServeInvocation() && PROMPT_GUARD_EVENTS.has(n);
}
//@ chunk-e6aww6q8.js:3455100-3455231 layout
function httpHookUnreachableMessage(e, n) {
  return `Refused, and a retry will be too: an HTTP hook is set on ${e} and could not be asked. ${n ?? ""}`.trimEnd();
}
/**
 * 解析 HTTP 钩子响应体：空体当 {}，必须是 JSON 对象并通过输出 schema。
 */
//@ chunk-e6aww6q8.js:3455231-3455743 facade-exports = parseHttpHookOutput (1)
function parseHttpHookOutput(body) {
  let trimmed = body.trim();
  if (trimmed === "") {
    let validation = hookJSONOutputSchema().safeParse({});
    if (validation.success)
      return (
        logForDebugging("HTTP hook returned empty body, treating as empty JSON object"),
        { json: validation.data }
      );
  }
  if (!trimmed.startsWith("{")) {
    let validationError = `HTTP hook must return JSON, but got non-JSON response body: ${trimmed.length > 200 ? trimmed.slice(0, 200) + "\u2026" : trimmed}`;
    return (logForDebugging(validationError), { validationError: validationError });
  }
  try {
    let result = validateHookJson(trimmed);
    if ("json" in result) return result;
    return (logForDebugging(result.validationError), result);
  } catch (error) {
    let validationError = `HTTP hook must return valid JSON, but parsing failed: ${error}`;
    return (logForDebugging(validationError), { validationError: validationError });
  }
}
//@ chunk-e6aww6q8.js:3455743-3455770 layout
var loggedMcpOutputProbes = new HostScoped(() => new Set());
//@ chunk-e6aww6q8.js:3455770-3455929 layout
function logUpdatedMcpToolOutputProbe(e) {
  let n = e ? "true" : "false",
    of = loggedMcpOutputProbes.of(getRootSession().host);
  if (of.has(n)) return;
  (of.add(n), logEvent("tengu_dead_probe_hook_updated_mcp_tool_output", { with_new_field: fromEnum(n) }));
}
/**
 * 把钩子 JSON 输出翻译成内部结果：continue:false → preventContinuation/stopReason；decision approve/block；systemMessage；terminalSequence（白名单 OSC）；按 hookSpecificOutput.hookEventName 处理 permissionDecision、updatedInput、additionalContext、sessionTitle、watchPaths、reloadSkills、updatedToolOutput、retry、PermissionRequest decision、elicitation action、displayContent 等；事件名不符抛错。
 */
//@ chunk-e6aww6q8.js:3455929-3462176 fingerprint = processHookJSONOutput (0.8)
function processHookJSONOutput({
  json: json,
  command: command,
  hookName: hookName,
  toolUseID: toolUseID,
  hookEvent: hookEvent,
  expectedHookEvent: expectedHookEvent,
  stdout: stdout,
  stderr: stderr,
  exitCode: exitCode,
  durationMs: durationMs,
}) {
  let result = {},
    syncJson = json;
  if (syncJson.continue === !1) {
    if (((result.preventContinuation = !0), syncJson.stopReason)) result.stopReason = syncJson.stopReason;
  }
  if (json.decision)
    switch (json.decision) {
      case "approve":
        result.permissionBehavior = "allow";
        break;
      case "block":
        ((result.permissionBehavior = "deny"),
          (result.blockingError = {
            blockingError: json.reason || "Blocked by hook",
            command: command,
            ...promptEndingFields(hookEvent, { reason: json.reason }),
          }));
        break;
      default:
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Unknown hook decision type: ${json.decision}. Valid types are: approve, block`,
          "hook output has an unknown decision type",
        );
    }
  if (json.systemMessage) result.systemMessage = json.systemMessage;
  if (json.terminalSequence) {
    let Se = renderTerminalSequences(json.terminalSequence);
    if (Se !== null) result.terminalSequence = Se;
    else
      logForDebugging(
        `Hook ${hookName} (${hookEvent}) returned a terminalSequence that was rejected by the allowlist (only OSC 0/1/2/9/99/777 and BEL are permitted, and OSC 9 bodies may not begin with a digit unless in the 9;4 progress form)`,
      );
  }
  if (json.hookSpecificOutput?.hookEventName === "PreToolUse" && json.hookSpecificOutput.permissionDecision)
    switch (json.hookSpecificOutput.permissionDecision) {
      case "allow":
        result.permissionBehavior = "allow";
        break;
      case "deny":
        ((result.permissionBehavior = "deny"),
          (result.blockingError = { blockingError: json.reason || "Blocked by hook", command: command }));
        break;
      case "ask":
        result.permissionBehavior = "ask";
        break;
      case "defer":
        result.permissionBehavior = "defer";
        break;
      default:
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Unknown hook permissionDecision type: ${json.hookSpecificOutput.permissionDecision}. Valid types are: allow, deny, ask, defer`,
          "hook output has an unknown permissionDecision type",
        );
    }
  if (result.permissionBehavior !== void 0 && json.reason !== void 0)
    result.hookPermissionDecisionReason = json.reason;
  if (json.hookSpecificOutput) {
    if (expectedHookEvent && json.hookSpecificOutput.hookEventName !== expectedHookEvent)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Hook returned incorrect event name: expected '${expectedHookEvent}' but got '${json.hookSpecificOutput.hookEventName}'. Full stdout: ${jsonStringify(json, null, 2)}`,
        "hook output names a different hook event than the one it ran for",
      );
    switch (json.hookSpecificOutput.hookEventName) {
      case "PreToolUse":
        if (json.hookSpecificOutput.permissionDecision)
          switch (json.hookSpecificOutput.permissionDecision) {
            case "allow":
              result.permissionBehavior = "allow";
              break;
            case "deny":
              ((result.permissionBehavior = "deny"),
                (result.blockingError = {
                  blockingError:
                    json.hookSpecificOutput.permissionDecisionReason || json.reason || "Blocked by hook",
                  command: command,
                }));
              break;
            case "ask":
              result.permissionBehavior = "ask";
              break;
            case "defer":
              result.permissionBehavior = "defer";
              break;
          }
        if (
          ((result.hookPermissionDecisionReason = json.hookSpecificOutput.permissionDecisionReason),
          json.hookSpecificOutput.updatedInput)
        )
          result.updatedInput = json.hookSpecificOutput.updatedInput;
        ((result.permissionDisplay = json.hookSpecificOutput.permissionDisplay),
          (result.additionalContext = json.hookSpecificOutput.additionalContext));
        break;
      case "UserPromptSubmit":
        ((result.additionalContext = json.hookSpecificOutput.additionalContext),
          (result.sessionTitle = json.hookSpecificOutput.sessionTitle),
          (result.suppressOriginalPrompt = json.hookSpecificOutput.suppressOriginalPrompt));
        break;
      case "UserPromptExpansion":
        ((result.additionalContext = json.hookSpecificOutput.additionalContext),
          (result.suppressOriginalPrompt = json.hookSpecificOutput.suppressOriginalPrompt));
        break;
      case "SessionStart":
        if (
          ((result.additionalContext = json.hookSpecificOutput.additionalContext),
          (result.initialUserMessage = json.hookSpecificOutput.initialUserMessage),
          (result.sessionTitle = json.hookSpecificOutput.sessionTitle),
          "watchPaths" in json.hookSpecificOutput && json.hookSpecificOutput.watchPaths)
        )
          result.watchPaths = json.hookSpecificOutput.watchPaths;
        result.reloadSkills = json.hookSpecificOutput.reloadSkills;
        break;
      case "Setup":
        result.additionalContext = json.hookSpecificOutput.additionalContext;
        break;
      case "PreModelSwitch":
        if (json.hookSpecificOutput.permissionDecision)
          switch (json.hookSpecificOutput.permissionDecision) {
            case "allow":
              result.permissionBehavior = "allow";
              break;
            case "deny":
              ((result.permissionBehavior = "deny"),
                (result.blockingError = {
                  blockingError:
                    json.hookSpecificOutput.permissionDecisionReason || json.reason || "Blocked by hook",
                  command: command,
                }));
              break;
            case "ask":
              result.permissionBehavior = "ask";
              break;
          }
        if (json.hookSpecificOutput.permissionDecisionReason !== void 0)
          result.hookPermissionDecisionReason = json.hookSpecificOutput.permissionDecisionReason;
        break;
      case "PostModelSwitch":
        result.additionalContext = json.hookSpecificOutput.additionalContext;
        break;
      case "SubagentStart":
        result.additionalContext = json.hookSpecificOutput.additionalContext;
        break;
      case "PostToolUse":
        if (
          ((result.additionalContext = json.hookSpecificOutput.additionalContext),
          (result.classifierContext = json.hookSpecificOutput.classifierContext),
          json.hookSpecificOutput.updatedToolOutput !== void 0)
        )
          result.updatedToolOutput = json.hookSpecificOutput.updatedToolOutput;
        if (json.hookSpecificOutput.updatedMCPToolOutput)
          (logUpdatedMcpToolOutputProbe(json.hookSpecificOutput.updatedToolOutput !== void 0),
            (result.updatedMCPToolOutput = json.hookSpecificOutput.updatedMCPToolOutput));
        else if (json.hookSpecificOutput.updatedMCPToolOutput !== void 0)
          result.legacyMcpRewriteSuppressed = !0;
        break;
      case "PostToolUseFailure":
        result.additionalContext = json.hookSpecificOutput.additionalContext;
        break;
      case "PostToolBatch":
        result.additionalContext = json.hookSpecificOutput.additionalContext;
        break;
      case "Stop":
      case "SubagentStop":
        result.additionalContext = json.hookSpecificOutput.additionalContext;
        break;
      case "PermissionDenied":
        result.retry = json.hookSpecificOutput.retry;
        break;
      case "PermissionRequest":
        if (json.hookSpecificOutput.decision) {
          if (
            ((result.permissionRequestResult = json.hookSpecificOutput.decision),
            (result.permissionBehavior =
              json.hookSpecificOutput.decision.behavior === "allow" ? "allow" : "deny"),
            json.hookSpecificOutput.decision.behavior === "allow" &&
              json.hookSpecificOutput.decision.updatedInput)
          )
            result.updatedInput = json.hookSpecificOutput.decision.updatedInput;
        }
        break;
      case "Elicitation":
        if (json.hookSpecificOutput.action) {
          if (
            ((result.elicitationResponse = {
              action: json.hookSpecificOutput.action,
              content: json.hookSpecificOutput.content,
            }),
            json.hookSpecificOutput.action === "decline")
          )
            result.blockingError = {
              blockingError: json.reason || "Elicitation denied by hook",
              command: command,
            };
        }
        break;
      case "ElicitationResult":
        if (json.hookSpecificOutput.action) {
          if (
            ((result.elicitationResultResponse = {
              action: json.hookSpecificOutput.action,
              content: json.hookSpecificOutput.content,
            }),
            json.hookSpecificOutput.action === "decline")
          )
            result.blockingError = {
              blockingError: json.reason || "Elicitation result blocked by hook",
              command: command,
            };
        }
        break;
      case "MessageDisplay":
        result.displayContent = json.hookSpecificOutput.displayContent;
        break;
    }
  }
  return {
    ...result,
    message: result.blockingError
      ? createAttachmentMessage_2({
          type: "hook_blocking_error",
          hookName: hookName,
          toolUseID: toolUseID,
          hookEvent: hookEvent,
          blockingError: result.blockingError,
        })
      : createAttachmentMessage_2({
          type: "hook_success",
          hookName: hookName,
          toolUseID: toolUseID,
          hookEvent: hookEvent,
          content: "",
          stdout: stdout,
          stderr: stderr,
          exitCode: exitCode,
          command: command,
          durationMs: durationMs,
        }),
  };
}
//@ chunk-e6aww6q8.js:3462176-3462542 sole-consumer
async function pluginRootExists(e, n) {
  if (isStorageV5Enabled() && e !== void 0) {
    let r = parseVersionCachePath(n, projectPluginCacheDir());
    if (r) {
      let scopeKind = await e.scopeKind(
        { namespace: "pluginCache", marketplace: r.marketplace, plugin: r.plugin, version: r.version },
        { resolveLink: !0 },
      );
      if (scopeKind.ok)
        switch (scopeKind.value.kind) {
          case "absent":
            return !1;
          case "directory":
          case "other":
            return !0;
          case "link":
            return scopeKind.value.linkResolves === !0;
          default:
            return scopeKind.value;
        }
    }
  }
  return pathExists(n);
}
//@ chunk-e6aww6q8.js:3462542-3462582 sole-consumer
function getHookStdoutForParsing(e) {
  return getRunnerJsonStdout(e) ?? e.stdout;
}
//@ chunk-e6aww6q8.js:3462582-3462732 sole-consumer
function replaceTrailingResult(e, n, r) {
  let s = r
    ? n
    : n +
      `
`;
  if (s === "") return e;
  let h = e.endsWith(s) ? e.slice(0, -s.length) : e;
  return h === ""
    ? n
    : `${h}${
        h.endsWith(`
`)
          ? ""
          : `
`
      }${n}`;
}
//@ chunk-e6aww6q8.js:3462732-3462840 sole-consumer
function exitedByContract(e) {
  return e.exitedNormally === !0 && !e.spawnFailed && e.status <= 128 && e.status !== 126 && e.status !== 127;
}
//@ chunk-e6aww6q8.js:3462840-3463039 sole-consumer
function didScriptHookRun(e) {
  if (e.backgrounded) return !0;
  if (e.runnerConflict && e.status !== 2) return !1;
  if (e.runnerExited === !0) return e.status <= 255;
  if (e.aborted || e.spawnFailed || e.exitedNormally !== !0) return !1;
  return !1;
}
//@ chunk-e6aww6q8.js:3463039-3463549 sole-consumer
function describeHookDidNotRun(e) {
  if (e.runnerConflict) return "no single verdict (re-runs disagreed, or a malformed result or exit line)";
  if (e.aborted) return "timed out";
  if (e.spawnFailed) return "could not start";
  if (e.exitedNormally !== !0 || e.runnerStarted) return "killed before it finished";
  if (e.stderr !== void 0 && e.stderr.trim() === "")
    return `nothing from the runner reached this process (exit ${e.status}) \u2014 a launcher that redirects the hook's stderr hides its verdict`;
  return `its launcher exited ${e.status} before the hook ran`;
}
//@ chunk-e6aww6q8.js:3463549-3463779 sole-consumer
function guardScriptHookBlock(e, n, r, s) {
  if (e.type !== "script" || !GUARD_HOOK_EVENTS.has(n)) return;
  let h = `[${r}]: did not run (${s}) \u2014 a ${n} guard that cannot run blocks`;
  return {
    blockingError: { blockingError: h, command: r },
    ...blockingErrorResult(n, r, h),
    outcome: "blocking",
    hook: e,
  };
}
//@ chunk-e6aww6q8.js:3463779-3463952 sole-consumer
function writeRemoteHookInput(e, n) {
  try {
    return e(n);
  } catch (error) {
    logError(
      withTelemetryMessage(
        Error("Failed to write hook input for another machine", { cause: error }),
        "Failed to write hook input for another machine",
      ),
    );
    return;
  }
}
//@ chunk-e6aww6q8.js:3463952-3463999 sole-consumer
function fPn(e, n) {
  return n.length > LHt() && W0(e);
}
//@ chunk-e6aww6q8.js:3463999-3464093 sole-consumer
function mPn(e, n) {
  (logError(Error("Failed to match hooks", { cause: n })),
    logFeatureBad(hookFeature(e), "hook_matching_failed"));
}
/**
 * 执行 command 钩子：云端设备转发、exec 形式（args）或 shell（bash/Git Bash/PowerShell）启动；注入 CLAUDE_PROJECT_DIR、CLAUDE_PLUGIN_ROOT/DATA、CLAUDE_PLUGIN_OPTION_*、CLAUDE_ENV_FILE 等环境变量；stdin 写入 JSON 输入；首行 {async:true} 或 async/asyncRewake 配置时转后台；返回 stdout/stderr/status 及 stdio 完整性标志。
 */
//@ chunk-e6aww6q8.js:3464175-3477576 fingerprint = execCommandHook (0.531)
async function execCommandHook(
  hook,
  hookEvent,
  hookName,
  jsonInput,
  remoteJsonInput,
  envContext,
  project,
  cwd,
  signal,
  hookId,
  hookIndex,
  pluginRoot,
  pluginId,
  settingsSource,
  skillRoot,
  forceSyncExecution,
  envExtra,
  servedEnv,
  toolInfo,
  envOwnerId,
  storageV5,
  credentials,
  wrapCommand,
) {
  let nt = getHookOriginLabel({ pluginId: pluginId, settingsSource: settingsSource }),
    pt = getPluginHookRunner();
  if (nt !== void 0 && pt !== void 0) {
    if (
      hookEvent === "StatusLine" ||
      hookEvent === "FileSuggestion" ||
      envExtra !== void 0 ||
      servedEnv !== void 0
    )
      return buildCannotRunElsewhereResult(hookEvent, "unsupported_in_cloud_session");
    if (remoteJsonInput === void 0) return buildCannotRunElsewhereResult(hookEvent, "remote_run_failed");
    let Vs = {
        ...nt,
        hook: hook,
        hookEvent: hookEvent,
        jsonInput: remoteJsonInput,
        hookIndex: hookIndex,
        toolUseID: toolInfo?.toolUseID,
      },
      _i = (Qr, fi) => {
        let Ri = { startedAt: Aa.monotonicNow() },
          Ja = hook.timeout ? hook.timeout * 1000 : TOOL_HOOK_EXECUTION_TIMEOUT_MS;
        return Promise.race([
          Promise.resolve().then(() => pt.run({ ...Vs, inBackground: fi, signal: Qr, limit: Ri })),
          new Promise((Di) => {
            let yr = () => {
              let Kr = !fi && Aa.monotonicNow() - Ri.startedAt >= Ja;
              Di({
                ...(blocksWhenItCannotRunElsewhere(hookEvent) &&
                settingsSource !== "projectSettings" &&
                (Kr || !EOr(hookEvent, hook, nt))
                  ? buildCannotRunElsewhereResult(hookEvent, "remote_run_timed_out")
                  : { stdout: "", stderr: "", output: "", status: 1, aborted: !0 }),
                ...(Kr && { stoppedAfterItsTimeout: !0 }),
              });
            };
            if (Qr.aborted) yr();
            else Qr.addEventListener("abort", yr, { once: !0 });
          }),
        ]);
      };
    if (isAsyncHookJSONOutput(hook, forceSyncExecution)) {
      let Qr = `async_hook_${randomUUID_11()}`,
        abortController = new AbortController(),
        Ri,
        Ja = createRemoteHookTask(
          Qr,
          _i(abortController.signal, !0).then((yr) => {
            let missingScript = yr.missingScript;
            return (
              (Ri =
                settingsSource === "projectSettings" && missingScript !== void 0
                  ? {
                      ...missingScript,
                      scriptPath: squashToSummaryLine(missingScript.scriptPath),
                      cutFrom: missingScript.cutFrom && squashToSummaryLine(missingScript.cutFrom),
                    }
                  : void 0),
              yr
            );
          }),
          abortController,
        ),
        Di = backgroundHookProcess({
          processId: Qr,
          hookId: hookId,
          shellCommand: Ja,
          asyncResponse: {
            async: !0,
            asyncTimeout: hook.timeout ? hook.timeout * 1000 : TOOL_HOOK_EXECUTION_TIMEOUT_MS,
          },
          hookEvent: hookEvent,
          hookName: hookName,
          command: getHookDisplayText(hook),
          asyncRewake: hook.asyncRewake,
          rewakeMessage: hook.rewakeMessage,
          rewakeSummary: hook.rewakeSummary,
          pluginId: pluginId,
          toolName: toolInfo?.toolName,
          ranForAccountMemory: toolInfo?.accountMemory === !0,
          missingScriptThere: () => Ri,
        });
      if (Di) return { stdout: "", stderr: "", output: "", status: 0, backgrounded: Di };
    }
    let jo = await _i(signal, !1).catch(
      (Qr) => (
        logForDebugging(`Hooks: a hook's run on another machine failed (${errorMessage(Qr)})`, {
          level: "error",
        }),
        Qr instanceof I7o ? "remote_run_timed_out" : "remote_run_failed"
      ),
    );
    if (typeof jo === "string") return buildCannotRunElsewhereResult(hookEvent, jo);
    return {
      ...jo,
      ranElsewhere: !0,
      stdout: removeClaudeCodeHintLines(jo.stdout),
      stderr: removeClaudeCodeHintLines(jo.stderr),
      output: removeClaudeCodeHintLines(jo.output),
      ...(jo.aborted !== !0 && jo.spawnFailed !== !0 && { exitedNormally: !0 }),
    };
  }
  if (Tv())
    return (
      logError(
        Error("a command or script hook got past keepWhileDiskless in a diskless session and was not run"),
      ),
      {
        ...buildCannotRunElsewhereResult(
          hookEvent,
          "unsupported_in_cloud_session",
          `${hookName} hook not run: ${CLOUD_HOOK_UNSUPPORTED_REASON}`,
        ),
        spawnFailed: !0,
        withheld: !0,
      }
    );
  if (project === null)
    return {
      ...buildCannotRunElsewhereResult(
        hookEvent,
        "unsupported_in_cloud_session",
        `${hookName} hook not run: ${CLOUD_HOOK_UNSUPPORTED_REASON}`,
      ),
      spawnFailed: !0,
      withheld: !0,
    };
  let isStartupEvent = hookEvent === "SessionStart" || hookEvent === "Setup" || hookEvent === "SessionEnd",
    diagStartMs = Date.now(),
    gt,
    At = !1,
    isWindows = getPlatform() === "windows",
    shellType = hook.shell ?? defaultShellKind(),
    isPowerShell = shellType === "powershell",
    isExecForm = hook.args !== void 0;
  if (isExecForm && /\s/.test(hook.command) && !/[\\/]/.test(hook.command))
    logForDebugging(
      `Hook command "${hook.command}" has both "args" and whitespace in "command". Exec form treats "command" as a single executable name; move the rest into "args". Example: { "command": "node", "args": ["script.js"] }.`,
      { level: "warn" },
    );
  let rn = isWindows && !isPowerShell && !isExecForm ? (Vs) => Vs.replaceAll("\\", "/") : (Vs) => Vs,
    pn = wrapCommand === void 0 && servedEnv?.startsOutsideProject !== !0 ? getProjectConfigRoot() : null,
    projectDir = pn ?? project.projectRoot,
    command = hook.command,
    userConfig;
  if (!isExecForm && isPowerShell) {
    if (hook.shell === void 0) describeNoBashFallback(hookEvent);
    if (((command = toPowerShellEnvRefs(command)), /\$CLAUDE_PROJECT_DIR\b/.test(command)))
      logForDebugging(
        `PowerShell hook command references $CLAUDE_PROJECT_DIR, which PowerShell reads as an undefined variable ($null). Use $env:CLAUDE_PROJECT_DIR or \${CLAUDE_PROJECT_DIR} instead. Command: ${command}`,
        { level: "warn" },
      );
  }
  for (let [Vs, _i] of [
    ["CLAUDE_PLUGIN_ROOT", pluginRoot || skillRoot],
    ["CLAUDE_PLUGIN_DATA", pluginRoot],
  ]) {
    if (_i) continue;
    let jo = "${" + Vs + "}";
    if (!hook.command.includes(jo) && !hook.args?.some((fi) => fi.includes(jo))) continue;
    let rootPath = getHookDisplayText(hook);
    throw Error(
      skillRoot
        ? `Hook command references \${${Vs}} but only \${CLAUDE_PLUGIN_ROOT} is available for skill hooks (\${CLAUDE_PLUGIN_DATA} is plugin-only). Command: ${rootPath}`
        : `Hook command references \${${Vs}} but the hook is not associated with a plugin. This variable is only available in hooks defined in a plugin's hooks/hooks.json file, not in settings.json. Command: ${rootPath}`,
    );
  }
  if (pluginRoot) {
    if (!(await pluginRootExists(storageV5, pluginRoot)))
      throw Error(
        `Plugin directory does not exist: ${pluginRoot}` +
          (pluginId ? ` (${pluginId} \u2014 run /plugin to reinstall)` : ""),
      );
    if (pluginId) userConfig = await loadPluginOptions(pluginId, credentials);
    if (!isExecForm && userConfig) {
      if (hasUserConfigVariables(command, userConfig))
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Hook from ${pluginId ? `plugin ${pluginId}` : "a plugin"} references \${user_config.*} in a shell-form command. The substituted value would be re-parsed by the shell. Use exec ` +
            'form instead \u2014 {"command": "<executable>", "args": ' +
            '["${user_config.KEY}", ...]} \u2014 or read ' +
            `$CLAUDE_PLUGIN_OPTION_<KEY> from the hook's environment. Command: ${getHookDisplayText(hook)}`,
          "plugin hook references ${user_config.*} in shell-form command",
        );
    }
  }
  let execArgv;
  if (hook.args !== void 0) {
    let Vs = pluginRoot ?? skillRoot,
      _i = pluginRoot && pluginId ? pluginId : void 0,
      jo = (Qr) => {
        if (!Qr.includes("${")) return Qr;
        if (((Qr = Qr.replaceAll("${CLAUDE_PROJECT_DIR}", () => projectDir)), Vs))
          Qr = Qr.replaceAll("${CLAUDE_PLUGIN_ROOT}", () => Vs);
        if (_i) Qr = Qr.replaceAll("${CLAUDE_PLUGIN_DATA}", () => ensurePluginDataDir(_i));
        if (userConfig) Qr = substituteUserConfigVariables(Qr, userConfig);
        return Qr;
      };
    execArgv = [jo(hook.command), hook.args.map(jo)];
  }
  let dataPath = getHookDisplayText(hook);
  if (isWindows && !isPowerShell && !isExecForm) command = stripShellQuotes(command);
  let Xn = servedEnv === void 0 && Fge(hook),
    fo = Xn
      ? AQ(() => ({ shellPrefix: env.CLAUDE_CODE_SHELL_PREFIX, inherited: { ...subprocessEnv() } }))
      : void 0,
    To = Xn ? hostOwnedEnvNames() : [];
  if (To.length > 0)
    logForDebugging(
      `Hooks: ${hookName} is the organization's and starts without a person's plugin's $.env.set of ${To.join(", ")}`,
    );
  let bo = Xn ? RXt() : [];
  if (bo.length > 0)
    logForDebugging(
      `Hooks: ${hookName} is the organization's and starts without the repository settings' env of ${bo.join(", ")}`,
    );
  let vn =
      servedEnv !== void 0
        ? servedEnv.shellPrefix
        : fo !== void 0
          ? fo.shellPrefix
          : env.CLAUDE_CODE_SHELL_PREFIX,
    finalCommand = !isPowerShell && !isExecForm && vn ? getGlobBaseDirectory(vn, command) : command,
    timeoutMs = hook.timeout ? hook.timeout * 1000 : TOOL_HOOK_EXECUTION_TIMEOUT_MS,
    childEnv = {
      ...(servedEnv !== void 0
        ? pjt({ base: servedEnv.base, omit: servedEnv.omit, extra: {} })
        : (fo?.inherited ?? { ...subprocessEnv() })),
      ...envExtra,
      ...claudeSubprocessEnv(envContext),
      CLAUDE_PROJECT_DIR: rn(projectDir),
    },
    { columns: columns, rows: rows } = process.stdout;
  if (columns) childEnv.COLUMNS = String(columns);
  if (rows) childEnv.LINES = String(rows);
  if (pluginRoot) {
    if (((childEnv.CLAUDE_PLUGIN_ROOT = rn(pluginRoot)), pluginId))
      childEnv.CLAUDE_PLUGIN_DATA = rn(ensurePluginDataDir(pluginId));
  }
  if ((Object.assign(childEnv, getPluginHookCredentialEnv(pluginId)), userConfig))
    for (let [Vs, _i] of Object.entries(userConfig)) {
      let envKey = Vs.replace(/[^A-Za-z0-9_]/g, "_").toUpperCase();
      childEnv[`CLAUDE_PLUGIN_OPTION_${envKey}`] = String(_i);
    }
  if (skillRoot) childEnv.CLAUDE_PLUGIN_ROOT = rn(skillRoot);
  if (
    (checkPluginBunOptions(envOwnerId ?? pluginId, childEnv, childEnv),
    !isPowerShell &&
      (hookEvent === "SessionStart" ||
        hookEvent === "Setup" ||
        hookEvent === "CwdChanged" ||
        hookEvent === "FileChanged") &&
      hookIndex !== void 0)
  )
    childEnv.CLAUDE_ENV_FILE = await getHookEnvFilePath(hookEvent, hookIndex, envContext.envFileSessionId);
  let yo = servedEnv?.spawnCwd === void 0 ? pn : null,
    Ho = servedEnv === void 0 && cwd !== project.projectRoot ? IMe(cwd, project.originalCwd) : cwd;
  if (yo === null && Ho !== cwd) {
    let of = nIr.of(getRootSession().host);
    if (!of.has(hookEvent))
      (of.add(hookEvent), logEvent("tengu_hook_started_in_launch_dir", { hook_event: fromEnum(hookEvent) }));
  }
  let spawnCwd =
    yo === null
      ? await safeHookCwd(Ho, project)
      : await safeHookCwd(yo, { originalCwd: yo, projectRoot: yo });
  if (servedEnv?.startsOutsideProject === !0 && spawnCwd !== cwd)
    return { stdout: "", stderr: "", output: "", status: 1, spawnFailed: !0 };
  let br = !isWindows,
    scriptHookAck = envExtra?.[SCRIPT_HOOK_ACK_ENV],
    hookCwd = CAn();
  using cs =
    wrapCommand === void 0
      ? void 0
      : await wrapCommand(execArgv ? shellQuoteArgs([execArgv[0], ...execArgv[1]]) : finalCommand);
  if (wrapCommand !== void 0 && cs === void 0)
    return { stdout: "", stderr: "", output: "", status: 1, spawnFailed: !0 };
  if (signal.aborted) return { stdout: "", stderr: "", output: "", status: 1, aborted: !0 };
  let child;
  if (cs !== void 0)
    child = spawn(cs.command, [], {
      env: childEnv,
      cwd: spawnCwd,
      shell: !0,
      detached: br,
      windowsHide: !0,
      ...xvt(hookEvent),
    });
  else if (execArgv)
    child = spawn(execArgv[0], execArgv[1], {
      env: childEnv,
      cwd: spawnCwd,
      detached: br,
      windowsHide: !0,
      ...xvt(hookEvent),
    });
  else if (shellType === "powershell") {
    let Vs = await (Xn ? findPowerShellForEnv(AQ(getWindowsEnvPaths)) : getCachedPowerShellPath());
    if (signal.aborted) return { stdout: "", stderr: "", output: "", status: 1, aborted: !0 };
    if (!Vs)
      throw Error(
        `Hook "${hook.command}" has shell: 'powershell' but no PowerShell executable (pwsh or powershell) was found on PATH. Install PowerShell, or remove "shell": "powershell" to use bash.`,
      );
    let _i =
        hookEvent === "PermissionRequest" || EHt(finalCommand)
          ? finalCommand
          : finalCommand +
            `
; if (-not $?) { if ($LASTEXITCODE -eq 2) { exit 2 } }`,
      jo =
        !requiresScriptFile(finalCommand) &&
        hook.shell === void 0 &&
        hookEvent !== "StatusLine" &&
        hookEvent !== "FileSuggestion" &&
        mayBlockForMissingBash(hook, hookEvent)
          ? _i +
            `
; if (-not $?) { exit 1 }
; $claudeNoVerdict = $false
; try { $claudeSeen = $false; $claudeOnlyStrings = $true; foreach ($claudeStatement in $MyInvocation.MyCommand.ScriptBlock.Ast.EndBlock.Statements) { if ($claudeStatement.Extent.StartOffset -lt ` +
            finalCommand.length +
            `) { $claudeSeen = $true; $claudeElements = 0; foreach ($claudeElement in $claudeStatement.PipelineElements) { $claudeElements++; if ($claudeElement.PSTypeNames -notcontains 'System.Management.Automation.Language.CommandExpressionAst') { $claudeOnlyStrings = $false } elseif ($claudeElement.Expression.PSTypeNames -contains 'System.Management.Automation.Language.ExpandableStringExpressionAst') { foreach ($claudeNested in $claudeElement.Expression.NestedExpressions) { if ($claudeNested.PSTypeNames -contains 'System.Management.Automation.Language.SubExpressionAst') { $claudeOnlyStrings = $false } } } elseif ($claudeElement.Expression.PSTypeNames -notcontains 'System.Management.Automation.Language.StringConstantExpressionAst') { $claudeOnlyStrings = $false } }; if ($claudeElements -ne 1) { $claudeOnlyStrings = $false } } }; $claudeNoVerdict = $claudeSeen -and $claudeOnlyStrings } catch { }
; if ($claudeNoVerdict) { exit ` +
            T1e +
            ` }
; $claudeNoVerdict = $false`
          : _i;
    child = spawn(Vs, H3n(jo), {
      env: childEnv,
      cwd: spawnCwd,
      detached: br,
      windowsHide: !0,
      ...xvt(hookEvent),
    });
  } else {
    let Vs = isWindows ? getGitBashPathCached() : null;
    if (isWindows && !Vs)
      throw Error(
        `Hook "${hook.command}" requires bash but Git Bash was not found. ${INSTALL_GIT_FOR_WINDOWS}, or ${NO_BASH_FIX_HINT}.`,
      );
    let _i = isWindows ? Vs : !0;
    if (isWindows && Vs) prependDirToPathEnv(childEnv, Vs);
    child = spawn(finalCommand, [], {
      env: childEnv,
      cwd: spawnCwd,
      shell: _i,
      detached: br,
      windowsHide: !0,
      ...xvt(hookEvent),
    });
  }
  let hookTaskOutput = new TaskOutput(`hook_${child.pid}`, null),
    shellCommand = wrapSpawn(child, signal, timeoutMs, hookTaskOutput),
    Oo = !1,
    jr = !1,
    Or = !getIsNonInteractiveSession() || getHasStreamingInput();
  if ((hook.async || (hook.asyncRewake && Or)) && !forceSyncExecution) {
    let processId = `async_hook_${child.pid}`;
    logForDebugging(`Hooks: Config-based async hook, backgrounding process ${processId}`);
    let _i = (Qr) => {
      logForDebugging(
        `Async hook stdin write failed (${getErrnoCode(Qr) ?? Qr}); hook command likely exited without reading stdin`,
      );
    };
    child.stdin.on("error", _i);
    try {
      (child.stdin.write(
        jsonInput +
          `
`,
        "utf8",
      ),
        child.stdin.end());
    } catch (error) {
      _i(error);
    }
    if (
      ((jr = !0),
      backgroundHookProcess({
        processId: processId,
        hookId: hookId,
        shellCommand: shellCommand,
        asyncResponse: { async: !0, asyncTimeout: timeoutMs },
        hookEvent: hookEvent,
        hookName: hookName,
        command: dataPath,
        toolName: toolInfo?.toolName,
        ranForAccountMemory: toolInfo?.accountMemory === !0,
        asyncRewake: hook.asyncRewake,
        rewakeMessage: hook.rewakeMessage,
        rewakeSummary: hook.rewakeSummary,
        scriptPaths: hook.asyncRewake
          ? expandHookPathVariables({
              command: hook.command,
              args: hook.args,
              pluginRoot: pluginRoot ?? skillRoot,
              projectDir: projectDir,
              homeDir: homedir_2(),
              windowsBash: isWindows && !isPowerShell && !isExecForm,
              posixShell: !isPowerShell && !isExecForm && !vn,
            })
          : void 0,
        pluginId: pluginId,
      }))
    )
      return { stdout: "", stderr: "", output: "", status: 0, backgrounded: !0 };
  }
  let stdout = "",
    stderr = "",
    output = "",
    Es = 0;
  (child.stdout.setEncoding("utf8"), child.stderr.setEncoding("utf8"));
  let Nr = !1,
    asyncResolve = null,
    childIsAsyncPromise = new Promise((resolve) => {
      asyncResolve = resolve;
    }),
    as = (Vs) => {
      if (((Es = Date.now()), (stderr += Vs), (output += Vs), scriptHookAck !== void 0))
        ((hookCwd.stderr = stderr),
          (hookCwd.stdout = stdout),
          (hookCwd.output = output),
          mnt(hookCwd, scriptHookAck),
          (stderr = hookCwd.stderr),
          (stdout = hookCwd.stdout),
          (output = hookCwd.output));
    },
    Vi = (data) => {
      if (((Es = Date.now()), (stdout += data), (output += data), scriptHookAck !== void 0))
        ((hookCwd.stderr = stderr),
          (hookCwd.stdout = stdout),
          (hookCwd.output = output),
          mnt(hookCwd, scriptHookAck),
          (stderr = hookCwd.stderr),
          (stdout = hookCwd.stdout),
          (output = hookCwd.output));
      if (!Nr) {
        let trimmed = getFirstLine(stdout).trim();
        if (!trimmed.includes("}")) return;
        ((Nr = !0), logForDebugging(`Hooks: Checking first line for async: ${trimmed}`));
        try {
          let parsed = jsonParse(trimmed);
          if (
            (logForDebugging(`Hooks: Parsed initial response: ${jsonStringify(parsed)}`),
            isSyncHookJSONOutput_2(parsed) && !forceSyncExecution)
          ) {
            let processId = `async_hook_${child.pid}`;
            if (
              (logForDebugging(`Hooks: Detected async hook, backgrounding process ${processId}`),
              backgroundHookProcess({
                processId: processId,
                hookId: hookId,
                shellCommand: shellCommand,
                asyncResponse: parsed,
                hookEvent: hookEvent,
                hookName: hookName,
                command: dataPath,
                pluginId: pluginId,
                toolName: toolInfo?.toolName,
              }))
            )
              ((Oo = !0),
                child.stdout.removeListener("data", Vi),
                child.stderr.removeListener("data", as),
                asyncResolve?.({
                  stdout: stdout,
                  stderr: stderr,
                  output: output,
                  status: 0,
                  backgrounded: !0,
                }));
          } else if (isSyncHookJSONOutput_2(parsed) && forceSyncExecution)
            logForDebugging(
              "Hooks: Detected async hook but forceSyncExecution is true, waiting for completion",
            );
          else logForDebugging("Hooks: Initial response is not async, continuing normal processing");
        } catch (error) {
          logForDebugging(`Hooks: Failed to parse initial response as JSON: ${error}`);
        }
      }
    };
  (child.stdout.on("data", Vi), child.stderr.on("data", as));
  let ji =
      cs !== void 0
        ? () => {}
        : startHookProgressInterval({
            hookId: hookId,
            hookName: hookName,
            hookEvent: hookEvent,
            getOutput: async () => ({ stdout: stdout, stderr: stderr, output: output }),
          }),
    Wi = !1,
    ii = !1,
    wa = !1,
    stdoutEndPromise = new Promise((resolve) => {
      (child.stdout.once("end", () => {
        ((Wi = !0), resolve());
      }),
        child.stdout.once("close", () => {
          if (!Wi) wa = !0;
          resolve();
        }));
    }),
    stderrEndPromise = new Promise((resolve) => {
      (child.stderr.once("end", () => {
        ((ii = !0), resolve());
      }),
        child.stderr.once("close", () => {
          if (!ii) wa = !0;
          resolve();
        }));
    }),
    Ha = jr
      ? Promise.resolve()
      : new Promise((resolve, reject) => {
          (child.stdin.on("error", (err) => {
            reject(err);
          }),
            child.stdin.write(
              jsonInput +
                `
`,
              "utf8",
            ),
            child.stdin.end(),
            resolve());
        }),
    childErrorPromise = new Promise((Vs, reject) => {
      child.on("error", reject);
    }),
    nr = !1;
  child.on("exit", () => {
    if (!signal.aborted) nr = !0;
  });
  let childClosePromise = new Promise((resolve) => {
    child.on("exit", (code) => {
      (async () => {
        (await waitForStdioQuiet({
          streamsSettled: Promise.all([stdoutEndPromise, stderrEndPromise]).then(() => {}),
          lastDataAt: () => Es,
          holdOpen: () => scriptHookAck !== void 0 && hookCwd.started && hookCwd.exitStatus === void 0,
        }),
          child.stdout.removeListener("data", Vi),
          child.stderr.removeListener("data", as),
          resolve({
            stdout: stdout,
            stderr: stderr,
            output: output,
            status: code ?? 1,
            aborted: signal.aborted && !nr,
            ...(code !== null && { exitedNormally: !0 }),
            ...(!(Wi && ii) && { stdioIncomplete: !0 }),
            ...(wa && { stdioClosedWithoutEnd: !0 }),
            ...(hookCwd.started && { runnerStarted: !0 }),
            ...(hookCwd.exitStatus !== void 0 && {
              status: PAn(code, hookCwd.exitStatus),
              exitedNormally: !0,
              runnerExited: !0,
              aborted: !1,
            }),
            ...(hookCwd.resultStdout !== void 0 && {
              stdout: replaceTrailingResult(stdout, hookCwd.resultStdout, hookCwd.resultWasString),
              resultStdout: hookCwd.resultStdout,
            }),
            ...(hookCwd.resultConflict && { runnerConflict: !0 }),
          }));
      })();
    });
  });
  try {
    if (isStartupEvent)
      logForDiagnosticsNoPII("info", "hook_spawn_started", { hook_event_name: hookEvent, index: hookIndex });
    await Promise.race([Ha, childErrorPromise]);
    let result = await Promise.race([childIsAsyncPromise, childClosePromise, childErrorPromise]);
    return (
      (gt = result.status),
      (At = result.aborted ?? !1),
      {
        ...result,
        stdout: removeClaudeCodeHintLines(result.stdout),
        stderr: removeClaudeCodeHintLines(result.stderr),
        output: removeClaudeCodeHintLines(result.output),
      }
    );
  } catch (error) {
    let code = getErrnoCode(error);
    if (((gt = 1), code === "EPIPE")) {
      logForDebugging("EPIPE error while writing to hook stdin (hook command likely closed early)");
      let errMsg = "Hook command closed stdin before hook input was fully written (EPIPE)";
      return { stdout: "", stderr: errMsg, output: errMsg, status: 1 };
    } else if (code === "ABORT_ERR")
      return (
        (At = !0),
        { stdout: "", stderr: "Hook cancelled", output: "Hook cancelled", status: 1, aborted: !0 }
      );
    else {
      let errorMsg = errorMessage(error);
      logForDebugging(`Hook command failed to spawn (${hookName}): ${errorMsg}`, { level: "error" });
      let errOutput = `Error occurred while executing hook command: ${errorMsg}`;
      return { stdout: "", stderr: errOutput, output: errOutput, status: 1, spawnFailed: !0 };
    }
  } finally {
    if (isStartupEvent)
      logForDiagnosticsNoPII("info", "hook_spawn_completed", {
        hook_event_name: hookEvent,
        index: hookIndex,
        duration_ms: Date.now() - diagStartMs,
        exit_code: gt,
        aborted: At,
      });
    if ((ji(), cs !== void 0 && shellCommand.status === "running")) shellCommand.kill();
    if (!Oo) shellCommand.cleanup();
  }
}
/**
 * 为云端会话在本机运行 command 钩子的入口（device 模式），返回精简结果。
 */
//@ chunk-e6aww6q8.js:3477576-3478127 facade-exports
async function execCommandHookForDevice({
  hook: hook,
  hookEvent: hookEvent,
  jsonInput: jsonInput,
  envContext: envContext,
  project: project,
  cwd: cwd,
  signal: signal,
  envExtra: envExtra,
  envOmit: envOmit,
  envBase: envBase,
  shellPrefix: shellPrefix,
  startsOutsideProject: startsOutsideProject,
}) {
  let {
    stdout: stdout,
    stderr: stderr,
    status: status,
    aborted: aborted,
    spawnFailed: spawnFailed,
    stdioIncomplete: stdioIncomplete,
    stdioClosedWithoutEnd: stdioClosedWithoutEnd,
  } = await execCommandHook(
    hook,
    hookEvent,
    `${hookEvent}:device`,
    jsonInput,
    void 0,
    envContext,
    project,
    cwd,
    signal,
    randomUUID_11(),
    void 0,
    void 0,
    void 0,
    void 0,
    void 0,
    !0,
    envExtra,
    { base: envBase, omit: envOmit, shellPrefix: shellPrefix, startsOutsideProject: startsOutsideProject },
  );
  return {
    stdout: stdout,
    stderr: stderr,
    status: status,
    ...(aborted && { aborted: aborted }),
    ...(spawnFailed && { spawnFailed: spawnFailed }),
    ...(stdioIncomplete && { stdioIncomplete: stdioIncomplete }),
    ...(stdioClosedWithoutEnd && { stdioClosedWithoutEnd: stdioClosedWithoutEnd }),
  };
}
//@ chunk-e6aww6q8.js:3478127-3478196 layout
var gPn = "This hook runs on another machine, which could not run it.";
//@ chunk-e6aww6q8.js:3478196-3478422 layout
function buildCannotRunElsewhereResult(e, n, r = gPn) {
  if (!blocksWhenItCannotRunElsewhere(e) || (n !== "unsupported_in_cloud_session" && !DHt()))
    return { stdout: "", stderr: r, output: r, status: 1, spawnFailed: !0 };
  let s = buildPromptBlockOutput(e, r);
  return { stdout: s !== void 0 ? jsonStringify(s) : "", stderr: r, output: r, status: 2, noVerdict: n };
}
/**
 * 判断某事件的钩子在"无法在别处运行"时是否应阻断：属于提示守护事件，但 PostToolBatch、TaskCreated、PreCompact 除外。
 */
//@ chunk-e6aww6q8.js:3478422-3478513 facade-exports
function blocksWhenItCannotRunElsewhere(e) {
  return PROMPT_GUARD_EVENTS.has(e) && e !== "PostToolBatch" && e !== "TaskCreated" && e !== "PreCompact";
}
//@ chunk-e6aww6q8.js:3478513-3478601 layout
function EOr(e, n, r) {
  return (
    e === "UserPromptSubmit" && !isAsyncHookJSONOutput(n) && getPluginHookRunner()?.isPersonsOwn?.(r) === !0
  );
}
/**
 * 为在另一台机器上运行的钩子构造后台任务对象：结果到达后写入输出并标记完成，失败时写入固定错误并以退出码 1 结束。
 */
//@ chunk-e6aww6q8.js:3478601-3479089 layout
function createRemoteHookTask(e, n, r) {
  let s = new TaskOutput(e, null),
    h = {
      status: "backgrounded",
      taskOutput: s,
      background: () => !0,
      kill: async () => r.abort(),
      cleanup: () => {},
      result: n.then(
        ({ stdout: stdout, stderr: stderr, status: status, aborted: aborted }) => (
          s.writeStdout(stdout),
          s.writeStderr(stderr),
          (h.status = "completed"),
          { stdout: stdout, stderr: stderr, code: status, interrupted: aborted === !0 }
        ),
        (y) => {
          logForDebugging(`Hooks: a hook's run on another machine failed (${errorMessage(y)})`, {
            level: "error",
          });
          let S = gPn;
          return (
            s.writeStderr(S),
            (h.status = "completed"),
            { stdout: "", stderr: S, code: 1, interrupted: !1 }
          );
        },
      ),
    };
  return h;
}
/**
 * 执行插件/托管/技能/仓库来源的 command 钩子并收口输出：组织钩子按需转换；进程启动失败视为 status 1；输出不可信（stdio 截断等）时提示守护事件转成阻断、其余带说明返回；exit 2 但 stdio 不完整时清理可疑 JSON，脚本缺失的情况特判保留阻断。
 */
//@ chunk-e6aww6q8.js:3479089-3480748 facade-exports
async function execPluginCommandHook({
  hook: hook,
  hookEvent: hookEvent,
  jsonInput: jsonInput,
  envContext: envContext,
  project: project,
  cwd: cwd,
  signal: signal,
  plugin: plugin,
  skillRoot: skillRoot,
  managed: managed,
  hookIndex: hookIndex,
  fitted: fitted,
  storageV5: storageV5,
  credentials: credentials,
}) {
  let we = await execCommandHook(
      isOrganizationHook(hook, hookEvent, plugin !== void 0, plugin?.id) ? j0({ ...hook }) : hook,
      hookEvent,
      `${hookEvent}:${plugin !== void 0 ? "plugin" : managed ? "managed" : skillRoot !== void 0 ? "skill" : "repo"}`,
      jsonInput,
      void 0,
      envContext,
      project,
      cwd,
      signal,
      randomUUID_11(),
      hookIndex,
      plugin?.root,
      plugin?.id,
      void 0,
      skillRoot,
      !0,
      void 0,
      void 0,
      void 0,
      void 0,
      storageV5,
      credentials,
    ).catch((pt) => {
      let Et = errorMessage(pt);
      return { stdout: "", stderr: Et, output: Et, status: 1, spawnFailed: !0 };
    }),
    {
      stdout: stdout,
      stderr: stderr,
      output: output,
      status: status,
      aborted: aborted,
      spawnFailed: spawnFailed,
      stdioIncomplete: stdioIncomplete,
      stdioClosedWithoutEnd: stdioClosedWithoutEnd,
    } = fitted(we),
    nt = getUntrustedCaptureReason(
      {
        status: status,
        aborted: aborted,
        stdioIncomplete: stdioIncomplete,
        stdioClosedWithoutEnd: stdioClosedWithoutEnd,
        stderr: stderr,
      },
      hookEvent,
      stdout,
      parseHookOutput(stdout).json,
      (pt) => parseHookOutput(pt).json,
    );
  if (nt !== void 0) {
    if (PROMPT_GUARD_EVENTS.has(hookEvent)) {
      let Et = buildPromptBlockOutput(hookEvent, nt);
      return { stdout: Et !== void 0 ? JSON.stringify(Et) : "", stderr: nt, output: nt, status: 2 };
    }
    let pt = withHookStderr(nt, status, stderr);
    return {
      stdout: "",
      stderr: pt,
      output: pt,
      status: status,
      ...(aborted && { aborted: aborted }),
      ...(stdioIncomplete && { stdioIncomplete: stdioIncomplete }),
      ...(stdioClosedWithoutEnd && { stdioClosedWithoutEnd: stdioClosedWithoutEnd }),
    };
  }
  if (status === 2 && (stdioIncomplete === !0 || stdioClosedWithoutEnd === !0)) {
    let json = parseHookOutput(stdout).json,
      Et =
        json !== void 0 &&
        dropSuspectCaptureJson(
          { status: status, stdioIncomplete: stdioIncomplete, stdioClosedWithoutEnd: stdioClosedWithoutEnd },
          hookEvent,
          json,
        ) === void 0
          ? ""
          : stdout,
      yt = exitTwoMeansMissingScript({
        hookEvent: hookEvent,
        stdout: Et,
        stderr: stderr,
        pluginId: plugin?.id,
      })
        ? "hook stdio was cut before end-of-stream on the hook runner; the exit-2 block stands"
        : stderr,
      gt = buildPromptBlockOutput(hookEvent, yt),
      At = gt !== void 0 ? JSON.stringify(gt) : Et;
    return {
      stdout: At,
      stderr: yt,
      output: At !== stdout || yt !== stderr ? At + yt : output,
      status: status,
      ...(aborted && { aborted: aborted }),
      ...(spawnFailed && { spawnFailed: spawnFailed }),
      ...(stdioIncomplete && { stdioIncomplete: stdioIncomplete }),
      ...(stdioClosedWithoutEnd && { stdioClosedWithoutEnd: stdioClosedWithoutEnd }),
    };
  }
  return {
    stdout: stdout,
    stderr: stderr,
    output: output,
    status: status,
    ...(aborted && { aborted: aborted }),
    ...(spawnFailed && { spawnFailed: spawnFailed }),
    ...(stdioIncomplete && { stdioIncomplete: stdioIncomplete }),
    ...(stdioClosedWithoutEnd && { stdioClosedWithoutEnd: stdioClosedWithoutEnd }),
  };
}
/**
 * 判断 exit 2 是否其实是"脚本不存在"：Stop/SubagentStop/TaskCompleted/TeammateIdle（或插件的 UserPromptSubmit）钩子、stdout 为空、stderr 含 no such file / can't open，且 stdio 完整。
 */
//@ chunk-e6aww6q8.js:3480748-3481037 facade-exports
function exitTwoMeansMissingScript({
  hookEvent: hookEvent,
  stdout: stdout,
  stderr: stderr,
  pluginId: pluginId,
  stdioIncomplete: stdioIncomplete,
  stdioClosedWithoutEnd: stdioClosedWithoutEnd,
}) {
  if (stdioIncomplete === !0 || stdioClosedWithoutEnd === !0) return !1;
  return (
    (hookEvent === "Stop" ||
      hookEvent === "SubagentStop" ||
      hookEvent === "TaskCompleted" ||
      hookEvent === "TeammateIdle" ||
      (Boolean(pluginId) && hookEvent === "UserPromptSubmit")) &&
    !stdout.trim() &&
    /no such file|can't open/i.test(stderr)
  );
}
/**
 * 计算钩子 `if` 条件（无法判定时视为不满足）。
 */
//@ chunk-e6aww6q8.js:3481037-3481082 facade-exports
function evaluateHookIfCondition(e, n, r, s) {
  return matchesHookIfCondition(e, n, r, s, !1);
}
/**
 * 计算钩子 `if` 模式（无法判定时返回 null 表示未知）。
 */
//@ chunk-e6aww6q8.js:3481082-3481129 facade-exports
function evaluateHookIfPattern(e, n, r, s) {
  return matchesHookIfCondition(e, n, r, s, null);
}
//@ chunk-e6aww6q8.js:3481129-3481404 layout
function matchesHookIfCondition(e, n, r, s, h) {
  return Yg(s, async () => {
    let y = await prepareIfConditionMatcher(n, r);
    if (y === void 0) return h;
    let S = permissionRuleValueFromString(e);
    if (!ruleNamesContainTool(y.names, e, S.toolName)) return h;
    if (!S.ruleContent) return !0;
    if (!y.judgeable) return null;
    if (y.patternMatcher === void 0) return h;
    return y.patternMatcher(S.ruleContent);
  });
}
/**
 * 判断 PreToolUse 的 matcher 是否覆盖某工具（空 matcher 覆盖全部）。
 */
//@ chunk-e6aww6q8.js:3481404-3481466 facade-exports
function preToolUseMatcherCoversTool(e, n) {
  return !e || matchesPattern(canonicalToolName(n), e, HOOK_EVENTS_WITH_MATCHER.has("PreToolUse"));
}
/**
 * 列出 PreToolUse matcher 明确列举的工具名（含别名展开）；空或 `*` 返回 undefined。
 */
//@ chunk-e6aww6q8.js:3481466-3481597 facade-exports
function preToolUseMatcherListedTools(e) {
  if (!e || e === "*") return;
  let n = parseMatcherToolNames(e, HOOK_EVENTS_WITH_MATCHER.has("PreToolUse"));
  return n === void 0 ? void 0 : uniq(n.flatMap((r) => [r, ...legacyToolNamesFor(r)]));
}
//@ chunk-e6aww6q8.js:3481597-3481783 layout
function parseMatcherToolNames(e, n, r, s = !1) {
  if (!(n ? /^[a-zA-Z0-9_|, -]+$/ : /^[a-zA-Z0-9_|]+$/).test(e)) return;
  return e
    .split(n ? /[|,]/ : "|")
    .map((y) => y.trim())
    .filter(Boolean)
    .flatMap((y) => (s ? [y] : toolNameVariants(canonicalToolName(y), r)));
}
/**
 * 判断钩子 matcher 是否匹配该事件输入：取事件的匹配字段（工具名、source、trigger 等），没有字段或没有 matcher 时为真；工具名不命中时再试 MCP 前缀变体。
 */
//@ chunk-e6aww6q8.js:3481783-3481901 facade-exports
function hookMatcherMatches(e, n, r) {
  let s = hookMatchQuery(e);
  if (s === void 0 || !n) return !0;
  let h = makeHookMatcher(e, n, r);
  return h(s) || getMcpPrefix(s, n, void 0).some(h) || !1;
}
//@ chunk-e6aww6q8.js:3481901-3482036 layout
function makeHookMatcher(e, n, r) {
  return (s) =>
    matchesPattern(
      s,
      stripModelContextSuffix(e.hook_event_name, n),
      HOOK_EVENTS_WITH_MATCHER.has(e.hook_event_name),
      r,
      void 0,
      "tool_input" in e ? e.tool_input : void 0,
    );
}
/**
 * 若 matcher 只在工具名的 MCP 前缀变体上命中，返回把 tool_name 改成命中变体的事件输入副本，否则原样返回；让钩子看到它所匹配的名字。
 */
//@ chunk-e6aww6q8.js:3482036-3482244 facade-exports = isToolReferenceWithName (1)
function forwardedUnderMatchingToolName(e, n, r) {
  let s = hookMatchQuery(e);
  if (s === void 0 || !n || !("tool_name" in e)) return e;
  let h = getHookToolInput(e),
    y = makeHookMatcher(e, n, r),
    S = y(s) ? void 0 : getMcpPrefix(s, n, h).find(y);
  if (S === void 0) return e;
  return (S === Pz(s, h) && withMatchedToolName(e)) || { ...e, tool_name: S };
}
//@ chunk-e6aww6q8.js:3482244-3482427 layout
function withMatchedToolName(e) {
  if (!("tool_name" in e) || !("tool_input" in e)) return;
  let n = Pz(e.tool_name, getHookToolInput(e)),
    r = getCommandAndDescription(e.tool_input);
  return n === void 0 || r === void 0 ? void 0 : { ...e, tool_name: n, tool_input: r };
}
//@ chunk-e6aww6q8.js:3482427-3482525 layout
function xN(e, n) {
  return e.throughFamilyOnly === !0 && e.matcherMetThroughOtherName === !0 ? withMatchedToolName(n) : void 0;
}
//@ chunk-e6aww6q8.js:3482525-3482675 layout
function stripModelContextSuffix(e, n) {
  if (e !== "PreModelSwitch" && e !== "PostModelSwitch") return n;
  let replaced = n.replace(/\[[12]m\](?=\s*(?:[|,]|$))/gi, "");
  return replaced.trim() === "" ? n : replaced;
}
/**
 * 取各钩子事件用于 matcher 匹配的字段：工具类事件用 tool_name，UserPromptExpansion 用 command_name，SessionStart/ConfigChange/DirectoryAdded 用 source，Setup/PreCompact/PostCompact 用 trigger，模型切换用目标模型，Notification 用 notification_type，SessionEnd 用 reason，Elicitation 用服务器名，FileChanged 用文件 basename 等；无匹配字段的事件返回 undefined。
 */
//@ chunk-e6aww6q8.js:3482675-3483665 facade-exports
function hookMatchQuery(e) {
  switch (e.hook_event_name) {
    case "PreToolUse":
    case "PostToolUse":
    case "PostToolUseFailure":
    case "PermissionRequest":
    case "PermissionDenied":
      return e.tool_name;
    case "UserPromptExpansion":
      return e.command_name;
    case "SessionStart":
      return e.source;
    case "Setup":
      return e.trigger;
    case "PreCompact":
    case "PostCompact":
      return e.trigger;
    case "PreModelSwitch": {
      let n = hookModelMatchKey(e.to_model);
      return isRecognizedModelKey(n) ? n : void 0;
    }
    case "PostModelSwitch": {
      let n = hookModelMatchKey(e.to_model);
      return isRecognizedModelKey(n) ? n : void 0;
    }
    case "Notification":
      return e.notification_type;
    case "SessionEnd":
      return e.reason;
    case "StopFailure":
      return e.error;
    case "SubagentStart":
      return e.agent_type;
    case "SubagentStop":
      return e.agent_type;
    case "TeammateIdle":
    case "TaskCreated":
    case "TaskCompleted":
      return;
    case "Elicitation":
      return e.mcp_server_name;
    case "ElicitationResult":
      return e.mcp_server_name;
    case "ConfigChange":
      return e.source;
    case "DirectoryAdded":
      return e.source;
    case "InstructionsLoaded":
      return e.load_reason;
    case "FileChanged":
      return basename_13(e.file_path);
    default:
      return;
  }
}
/**
 * 支持 matcher 字段的钩子事件名集合。
 */
//@ chunk-e6aww6q8.js:3483665-3484024 layout
var HOOK_EVENTS_WITH_MATCHER = new Set([
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "PermissionRequest",
  "PermissionDenied",
  "UserPromptExpansion",
  "SessionStart",
  "SessionEnd",
  "Setup",
  "PreCompact",
  "PostCompact",
  "PreModelSwitch",
  "PostModelSwitch",
  "Notification",
  "SubagentStart",
  "SubagentStop",
  "Elicitation",
  "ElicitationResult",
  "ConfigChange",
  "InstructionsLoaded",
  "DirectoryAdded",
]);
//@ chunk-e6aww6q8.js:3484024-3484186 layout = getMcpPrefix (1)
function isBareMcpServerMatcher(serverName) {
  if (!/^[a-zA-Z0-9_|, -]+$/.test(serverName)) return !1;
  return serverName
    .split(/[|,]/)
    .map((n) => n.trim())
    .some((n) => n.startsWith("mcp__") && !n.slice(5).includes("__"));
}
/**
 * warnBareMcpServerMatcher：hook matcher 写成 mcp__server（只比较完整工具名，永远不匹配）时提示改用 mcp__server__.*（CHANGELOG v2.1.195），每个 matcher 只提示一次。
 */
//@ chunk-e6aww6q8.js:3484186-3484558 layout
function warnBareMcpServerMatcher(e, n) {
  if (!n || !TOOL_HOOK_EVENTS.has(e)) return;
  let r = getBareMcpServerMatchersWarned();
  if (r.has(n) || !isBareMcpServerMatcher(n)) return;
  r.add(n);
  let s =
    n
      .split(/[|,]/)
      .map((h) => h.trim())
      .find((h) => h.startsWith("mcp__") && !h.slice(5).includes("__")) ?? n;
  logForDebugging(
    `Hook matcher \`${s}\` matches no tool (it is compared as an exact string). To match all tools from this server, use \`${s}__.*\`. See CHANGELOG v2.1.195.`,
    { level: "warn" },
  );
}
//@ chunk-e6aww6q8.js:3484558-3484692 layout
function getFamilyParentToolName(e, n) {
  let r = n === void 0 ? void 0 : findToolByName(n, e);
  if (r !== void 0) return r.mcpInfo === void 0 ? r.familyParentToolName : void 0;
  return PBr(e);
}
//@ chunk-e6aww6q8.js:3484692-3484778 layout
function isCliOwnedMcpTool(e) {
  return e?.mcpInfo?.cliOwned === !0 || e?.mcpInfo?.standsInForBuiltIn === !0;
}
/**
 * 计算 hook matcher 匹配用的工具族名（父工具名与 hookMatcherFamilyNames）。
 */
//@ chunk-e6aww6q8.js:3484778-3485017 layout
function getHookMatcherFamilyNames(e, n, r) {
  let s = [],
    h = getFamilyParentToolName(e, n);
  if (h !== void 0) s.push(h);
  let y = n === void 0 ? void 0 : findToolByName(n, e);
  if (y !== void 0) {
    if (y.mcpInfo === void 0 || isCliOwnedMcpTool(y)) s.push(...(y.hookMatcherFamilyNames?.(r) ?? []));
  } else {
    let S = J0t(e, r);
    if (S !== void 0) s.push(S);
  }
  return s;
}
//@ chunk-e6aww6q8.js:3485017-3485087 layout
function Knt(e, n) {
  let r = Pz(e, n),
    s = qao(e);
  return r === void 0 ? s : [...s, r];
}
//@ chunk-e6aww6q8.js:3485087-3485222 layout
function getHookToolInput(e) {
  return (e.hook_event_name === "PreToolUse" || e.hook_event_name === "PermissionRequest") &&
    "tool_input" in e
    ? e.tool_input
    : void 0;
}
//@ chunk-e6aww6q8.js:3485222-3485384 layout = getMcpPrefix (1)
function getMcpPrefix(e, n, r) {
  let s = Knt(e, r);
  return n === void 0 || !/\(\?<?!|\[\^/.test(n)
    ? s
    : s.filter((h) => n.includes(h.startsWith("mcp__") ? h.slice(0, h.indexOf("__", 5) + 2) : h));
}
/**
 * 判断 matcher 是否匹配：空或 * 全匹配；简单名单（A|B）精确匹配名字及别名；否则当正则匹配工具名、旧名和 MCP 名。
 */
//@ chunk-e6aww6q8.js:3485384-3485915 fingerprint = matchesPattern (1)
function matchesPattern(e, n, r, s, h, y) {
  if (!n || n === "*") return !0;
  let S = parseMatcherToolNames(n, r, s),
    w = getHookMatcherFamilyNames(e, h, y);
  if (S !== void 0) return S.includes(e) || !1 || w.some((L) => S.includes(L));
  try {
    let L = checkHookMatcherForCloud(n);
    if (L.test(e)) return !0;
    if (Yeo.test(n) && w.some((G) => L.test(G))) return !0;
    if (
      h !== void 0 &&
      isCliOwnedMcpTool(findToolByName(h, e)) &&
      (w.length > 2 ? w.some((G) => L.test(G)) : w.length > 0 && L.test(w.at(-1) ?? ""))
    )
      return !0;
    for (let G of legacyToolNamesFor(e)) if (L.test(G)) return !0;
    for (let legacyName of aliasesFor(e, s)) if (L.test(legacyName)) return !0;
    return !1;
  } catch (error) {
    if (error instanceof xpe) throw error;
    return (logForDebugging(`Invalid regex pattern in hook matcher: ${n}`), !1);
  }
}
//@ chunk-e6aww6q8.js:3485915-3485974 layout
function ruleNamesContainTool(e, n, r) {
  if (e.includes(canonicalToolName(r))) return !0;
  return !1;
}
//@ chunk-e6aww6q8.js:3485974-3486233 layout
async function createIfConditionMatcher(e, n, r = !1) {
  let s = await prepareIfConditionMatcher(e, n, r);
  if (s === void 0) return;
  let { names: names, patternMatcher: patternMatcher, judgesPatterns: judgesPatterns } = s;
  return (w, L) => {
    let G = permissionRuleValueFromString(w);
    if (!ruleNamesContainTool(names, w, G.toolName)) return !1;
    if (!G.ruleContent) return !0;
    if (L) return judgesPatterns;
    return patternMatcher !== void 0 && patternMatcher(G.ruleContent);
  };
}
/**
 * 为 if 条件准备匹配器：只对 PreToolUse/PostToolUse/PostToolUseFailure/PermissionRequest/PermissionDenied 生效，用工具的 preparePermissionMatcher 对输入求值。
 */
//@ chunk-e6aww6q8.js:3486233-3486825 fingerprint = prepareIfConditionMatcher (0.754)
async function prepareIfConditionMatcher(e, n, r = !1) {
  if (
    e.hook_event_name !== "PreToolUse" &&
    e.hook_event_name !== "PostToolUse" &&
    e.hook_event_name !== "PostToolUseFailure" &&
    e.hook_event_name !== "PermissionRequest" &&
    e.hook_event_name !== "PermissionDenied"
  )
    return;
  let s = void 0,
    tool = s ?? (n && findToolByName(n, e.tool_name)),
    y = s ? e.tool_name : canonicalToolName(e.tool_name),
    input = tool?.inputSchema.safeParse(e.tool_input),
    w =
      !r && input?.success && tool?.preparePermissionMatcher
        ? await tool.preparePermissionMatcher(input.data)
        : void 0;
  return {
    names: [y, ...getHookMatcherFamilyNames(y, n, e.tool_input), ...Knt(y, getHookToolInput(e))],
    patternMatcher: w,
    judgeable: input?.success === !0,
    judgesPatterns: tool?.preparePermissionMatcher !== void 0,
  };
}
//@ chunk-e6aww6q8.js:3486825-3486989 layout
function getRewriterKindForHook(e, n) {
  return n === void 0 ||
    isCcsTenant() ||
    n.deviceForwarded === !0 ||
    getHookOriginLabel(n) !== void 0 ||
    (n.sdkHost === !0 && n.hostOwnsStdin !== !0)
    ? "remote"
    : getHookRewriterKind(e, n.registeredInSession === !0);
}
//@ chunk-e6aww6q8.js:3486989-3487226 layout
function getHookIdentityKey(e) {
  if (e.hook.type === "callback" || e.hook.type === "function") return e.hook;
  let n =
    e.hook.type === "prompt" || e.hook.type === "agent"
      ? `${e.hook.type}\x00${e.hook.prompt}\x00${e.hook.if ?? ""}`
      : getHookDedupPayload(e.hook);
  return n === void 0 ? void 0 : hookDedupKey(e, n);
}
//@ chunk-e6aww6q8.js:3487226-3487324 layout
function canRunForServedCall(e) {
  return e.hook.type !== "callback" && e.hook.type !== "function" && e.deviceForwarded !== !0;
}
//@ chunk-e6aww6q8.js:3487324-3487678 layout
function holdModelHookForServedCall(e, n) {
  return (
    logForDebugging(`Hooks: ${e.type} hook not run for a call served to a cloud session (${n})`),
    logServedHookHeld(n, e.type, "model_hook"),
    n === "PreToolUse"
      ? {
          hook: e,
          outcome: "success",
          permissionBehavior: "ask",
          hookPermissionDecisionReason: YWe.model_hook,
          heldForServedCall: !0,
        }
      : {
          hook: e,
          outcome: "success",
          systemMessage: hookNotRunNotice(n, e.type, "model_hook"),
          heldForServedCall: !0,
        }
  );
}
//@ chunk-e6aww6q8.js:3487678-3487892 layout
function logServedHookHeld(e, n, r, s, h) {
  logEvent("tengu_remote_tool_serve_hook_held", {
    event: fromEnum(e),
    hook_type: fromEnum(n),
    reason: fromEnum(r),
    ...(s !== void 0 && { sub_reason: fromEnum(s) }),
    ...(h !== void 0 && { unavailable: fromEnum(h) }),
    outcome: fromEnum(e === "PreToolUse" ? "ask" : "skipped"),
  });
}
/**
 * 为云端服务调用（served call）准备钩子运行环境：可达根目录、自有设置来源、env、home、spawnCwd、shellPrefix、MCP 服务器配置查询。
 */
//@ chunk-e6aww6q8.js:3487892-3488998 layout
async function buildServedCallHookEnv(e, n, r) {
  let s = e.origin.launchDir ?? getCwd(),
    h = await e.reach.current(),
    y = getMcpClientsFromAccessor() ?? r?.mcp.clients ?? [],
    S = (We) => {
      let ze = y.find((Je) => Je.name === We)?.config;
      if (ze === void 0) return;
      let lt =
        (ze.type === void 0 || ze.type === "stdio") && "command" in ze && typeof ze.command === "string"
          ? { command: ze.command, ...(Array.isArray(ze.args) && { args: ze.args }) }
          : void 0;
      return { scope: ze.scope, ...(lt !== void 0 && { stdio: lt }) };
    },
    mapped = h.map(normalizeCommandForPlatform),
    L = await settingsSourcesInReach(mapped, n, e.reach.distrustedSources),
    filtered = SETTING_SOURCES.filter((We) => !L.has(We)),
    envAtAttach = e.reach.envAtAttach,
    Z = getLatchedPreSettingsEnvSnapshot(),
    Se = await _Ht(e.reach.legacyEnvAtAttach, mapped),
    merged = Object.assign(
      {},
      Se ?? {},
      ...filtered.map((We) => settingsEnvForHookChild(getSettingsForSource(We)?.env, We)),
    ),
    we = subprocessEnv(),
    Ee = mergeHookEnv({
      attached: envAtAttach,
      beforeSettings: Z,
      ownEnv: merged,
      childrenSee: (We) => Object.hasOwn(we, We),
    }),
    Ae = await resolveHookProgramOnPath(mapped, Ee, we);
  if (Ae.omit.length > 0) logForDebugging(`Hooks: a served call's hooks run without ${Ae.omit.join(", ")}`);
  let Ie = resolveOptions(Ee),
    Me = await resolveServedSpawnCwd(Ie, mapped, s, n);
  return {
    roots: mapped,
    ownSources: filtered,
    env: Ae,
    home: Ie,
    spawnCwd: Me,
    shellPrefix: Ae.base.CLAUDE_CODE_SHELL_PREFIX,
    mcpShellPrefix: env.CLAUDE_CODE_SHELL_PREFIX,
    mcpPath: subprocessEnv().PATH ?? "",
    launchDir: s,
    projectDir: e.reach.projectDir,
    mcpServer: S,
    ...(n !== void 0 && { storageV5: n }),
  };
}
//@ chunk-e6aww6q8.js:3488998-3489165 layout
async function resolveServedSpawnCwd(e, n, r, s) {
  if (!isAbsolute_10(e) || m_([e, await realpathOrSelf(e)].map(normalizeCommandForPlatform), n))
    return getFilesystemRoot(r);
  let h = await statPathKind(e, s, PathSpace.home);
  return h !== "absent" && h !== void 0 && h.directory ? e : getFilesystemRoot(r);
}
/**
 * 找出哪些设置来源文件可被（云端会话）写到，返回不可信来源集合。
 */
//@ chunk-e6aww6q8.js:3489165-3489571 facade-exports
async function settingsSourcesInReach(e, n, r = new Set()) {
  let s = async (y) => {
      if (REPO_DIR_SETTING_SOURCES.has(y)) return !0;
      let S = getSettingsFilePathForSource(y);
      if (S === void 0) return !1;
      if (m_([S, await realpathOrSelf(S)].map(normalizeCommandForPlatform), e)) return !0;
      if (y === "policySettings") return !1;
      let w = await statPathKind(S, y === "userSettings" ? void 0 : n, PathSpace.workspace);
      return w === "absent" ? !1 : w === void 0 || w.nlink > 1;
    },
    results = await Promise.all(SETTING_SOURCES.map(async (y) => (r.has(y) || (await s(y)) ? [y] : [])));
  for (let y of results.flat()) r.add(y);
  return new Set(r);
}
//@ chunk-e6aww6q8.js:3489571-3490043 layout
async function statPathKind(e, n, r) {
  if (isStorageV5Enabled() && n !== void 0) {
    let stats = await n.hostFiles.stat(r(isAbsolute_10(e) ? e : p1e(getFsImplementation().cwd(), e)));
    if (stats.ok)
      return stats.value.kind === "absent"
        ? "absent"
        : {
            file: stats.value.kind === "file",
            directory: stats.value.kind === "directory",
            nlink: stats.value.nlink,
          };
    return (stats.error.code === "Failed" ? stats.error.telemetryCode : void 0) === "ENOTDIR"
      ? "absent"
      : void 0;
  }
  return stat_8(e).then(
    (s) => ({ file: s.isFile(), directory: s.isDirectory(), nlink: s.nlink }),
    (s) => (s.code === "ENOENT" || s.code === "ENOTDIR" ? "absent" : void 0),
  );
}
//@ chunk-e6aww6q8.js:3490043-3490053 layout
var NOT_HELD = {};
/**
 * 判断一个钩子在服务调用中能否在本机运行：项目配置的、Windows 未解析的、脚本或程序位于可写范围内的、链接文件等都被扣住（held），返回原因。
 */
//@ chunk-e6aww6q8.js:3490053-3494919 layout
async function judgeHookForServedCall(e, n, r) {
  let { hook: hook } = e,
    { home: home } = r;
  if (hook.type !== "command" && hook.type !== "http" && hook.type !== "mcp_tool" && hook.type !== "script")
    return NOT_HELD;
  if (
    e.pluginRoot === void 0 &&
    e.skillRoot === void 0 &&
    isNotFromOwnSettings(hook, n, e.matcherTexts ?? [], r.ownSources)
  )
    return { held: "project_configured" };
  let y = getPlatform() === "windows";
  if (y && hook.type === "command") return { held: "windows_unparsed" };
  let S = async (q, Z = "script") => {
    let Se = await realpathAllowMissing(q);
    if (Se === "unreadable") return "unreadable";
    if (m_([q, ...(Se === "absent" ? [] : [Se])].map(normalizeCommandForPlatform), r.roots))
      return "in_reach";
    if (Z !== "directory" && Se !== "absent") {
      let ke = await statPathKind(Se, r.storageV5, PathSpace.workspace);
      if (ke === void 0) return "unreadable";
      if (ke !== "absent" && (!ke.file || (Z === "script" && ke.nlink > 1))) return "linked";
    }
    return;
  };
  if (
    y &&
    hook.type === "script" &&
    (!isAbsolutePlatformPath(r.spawnCwd) ||
      (await realpathAllowMissing(r.spawnCwd)) === "absent" ||
      (await S(r.spawnCwd, "directory")) !== void 0)
  )
    return { held: "start_directory" };
  let w = e.pluginRoot ?? e.skillRoot;
  if (w !== void 0) {
    let q = await S(w, "directory");
    if (q !== void 0) return q === "linked" ? { held: "unreadable", cause: "linked_file" } : { held: q };
  }
  if (hook.type === "mcp_tool") {
    let mcpServer = r.mcpServer(hook.server);
    if (mcpServer?.scope === "project") return { held: "in_reach" };
    if (
      mcpServer === void 0 ||
      !["user", "local", "enterprise", "managed", "claudeai"].includes(mcpServer.scope ?? "")
    )
      return { held: "unreadable" };
    if (mcpServer.stdio === void 0) return NOT_HELD;
    if (y) return { held: "windows_unparsed" };
    if (r.mcpShellPrefix || r.shellPrefix) return { held: "unreadable" };
    let Z = analyzeHookCommand(
      { command: mcpServer.stdio.command, args: mcpServer.stdio.args ?? [] },
      {
        home: home,
        projectDir: r.projectDir,
        hookCwd: r.launchDir,
        defaultShell: "bash",
        shellPrefix: void 0,
      },
    );
    if (Z.kind === "opaque") return { held: "unreadable" };
    let Se = r.env.base.PATH ?? "",
      ke = async (Ae) => resolveProgramOnPathInReach(mcpServer.stdio.command, Ae, r.roots),
      we = async (Ae) =>
        (await resolveHookCommand(Ae, Se, r.roots)) ??
        (r.mcpPath === Se ? void 0 : await resolveHookCommand(Ae, r.mcpPath, r.roots));
    if (Z.interpreter !== null) {
      if (
        (isAbsolute_10(mcpServer.stdio.command)
          ? await S(mcpServer.stdio.command, "program")
          : await Promise.all([ke(Se), ke(r.mcpPath)]).then(([Me, We]) =>
              Me === void 0 || Me === "in_reach" || We === void 0 || We === "in_reach" || Me !== We
                ? "in_reach"
                : void 0,
            )) !== void 0
      )
        return { held: "unreadable", cause: "program_in_reach" };
      let Ie = isAbsolute_10(mcpServer.stdio.command) ? await we(mcpServer.stdio.command) : void 0;
      if (Ie !== void 0)
        return Ie === "unreadable" ? { held: "unreadable" } : { held: "unreadable", cause: Ie };
    } else {
      let Ae = await we(Z.resolvedPath);
      if (Ae !== void 0)
        return Ae === "unreadable" ? { held: "unreadable" } : { held: "unreadable", cause: Ae };
    }
    let Ee = await S(Z.resolvedPath);
    return Ee === void 0
      ? NOT_HELD
      : Ee === "linked"
        ? { held: "unreadable", cause: "linked_file" }
        : { held: Ee };
  }
  if (hook.type === "script") {
    let q = getLaunchCommand({ pinToCurrentBinary: !0 });
    if (!isAbsolute_10(q.cmd)) return { held: "unreadable" };
    let Z = [];
    for (let prefixArg of q.prefixArgs) {
      let index = prefixArg.indexOf("="),
        Ie = prefixArg.startsWith("-") && index !== -1 ? prefixArg.slice(index + 1) : void 0;
      if (isAbsolute_10(prefixArg)) Z.push(prefixArg);
      else if (Ie !== void 0 && isAbsolute_10(Ie)) Z.push(Ie);
      else if (!/^(?:-[A-Za-z0-9]|--[A-Za-z][\w-]*)$/.test(prefixArg)) return { held: "unreadable" };
    }
    let Se = [[q.cmd, "program"], ...Z.map((Ee) => [Ee, "script"])];
    for (let [Ee, Ae] of Se) {
      let Ie = await S(Ee, Ae);
      if (Ie !== void 0)
        return { held: "unreadable", cause: Ie === "linked" ? "linked_file" : "program_in_reach" };
      let Me = await resolveHookCommand(Ee, r.env.extra.PATH ?? "", r.roots);
      if (Me !== void 0)
        return Me === "unreadable" ? { held: "unreadable" } : { held: "unreadable", cause: Me };
    }
    if (hook.file === void 0) return NOT_HELD;
    let ke;
    try {
      ke = expandScriptHookPathVars(anchorScriptHookPath(hook.file), {
        projectDir: r.projectDir,
        pluginRoot: w,
        pluginData: e.pluginRoot !== void 0 && e.pluginId !== void 0 ? pluginDataDirPath(e.pluginId) : void 0,
      });
    } catch {
      ke = void 0;
    }
    if (ke === void 0) return { held: "unreadable" };
    let we = await S(ke);
    if (we !== void 0) return we === "linked" ? { held: "unreadable", cause: "linked_file" } : { held: we };
    return NOT_HELD;
  }
  if (hook.type !== "command") return NOT_HELD;
  let L =
    w === void 0 ? { hook: hook, projectDir: r.projectDir } : rebasePluginRootForJudge(hook, w, r.projectDir);
  if (L === void 0) return { held: "unreadable" };
  let G;
  for (let q of [r.launchDir]) {
    let Z = analyzeHookCommand(L.hook, {
      home: home,
      projectDir: L.projectDir,
      hookCwd: q,
      defaultShell: "bash",
      shellPrefix: r.shellPrefix,
    });
    if (Z.kind === "opaque") return { held: "unreadable" };
    if (!isAnchoredCommandPath(Z.rawPath)) return { held: "in_reach" };
    let Se = await S(Z.resolvedPath);
    if (Se !== void 0) return Se === "linked" ? { held: "unreadable", cause: "linked_file" } : { held: Se };
    if (Z.interpreter === null) {
      let Ee = await resolveHookCommand(Z.resolvedPath, r.env.extra.PATH ?? "", r.roots, {
        childStartsInReach: !1,
      });
      if (Ee !== void 0)
        return Ee === "unreadable" ? { held: "unreadable" } : { held: "unreadable", cause: Ee };
      continue;
    }
    let ke = hook.args !== void 0 ? L.hook.command : L.hook.command.trim().split(/[ \t]+/, 1)[0];
    if (ke !== void 0 && isAbsolute_10(ke)) {
      let Ee = await S(ke, "program");
      if (Ee !== void 0)
        return {
          held: "unreadable",
          cause:
            Ee === "linked" ? "linked_file" : Ee === "in_reach" ? "program_in_reach" : "program_unresolved",
        };
      let Ae = await resolveHookCommand(ke, r.env.extra.PATH ?? "", r.roots, { childStartsInReach: !1 });
      if (Ae !== void 0)
        return Ae === "unreadable" ? { held: "unreadable" } : { held: "unreadable", cause: Ae };
      continue;
    }
    let we = await resolveProgramOnPathInReach(ke ?? Z.interpreter, r.env.extra.PATH ?? "", r.roots, {
      childStartsInReach: !1,
    });
    if (we === void 0) return { held: "unreadable", cause: "program_unresolved" };
    if (we === "in_reach") return { held: "unreadable", cause: "program_in_reach" };
    if (hook.args !== void 0 && !hook.command.includes("/")) G = we;
  }
  return G === void 0 ? NOT_HELD : { program: G };
}
//@ chunk-e6aww6q8.js:3494919-3495341 layout
function rebasePluginRootForJudge(e, n, r) {
  if (e.args !== void 0) {
    let s = (h) => h.replaceAll("${CLAUDE_PLUGIN_ROOT}", () => n);
    return { hook: { ...e, command: s(e.command), args: e.args.map(s) }, projectDir: r };
  }
  if (!/\$\{?CLAUDE_PLUGIN_ROOT\b/.test(e.command)) return { hook: e, projectDir: r };
  if (/\$\{?CLAUDE_PROJECT_DIR\b/.test(e.command)) return;
  return {
    hook: {
      ...e,
      command: e.command.replace(/\$(\{?)CLAUDE_PLUGIN_ROOT\b/g, (s, h) => `$${h}CLAUDE_PROJECT_DIR`),
    },
    projectDir: n,
  };
}
//@ chunk-e6aww6q8.js:3495341-3495726 layout
function getHookDedupPayload(e) {
  switch (e.type) {
    case "command":
      return `command\x00${e.shell ?? defaultShellKind()}\x00${e.command}\x00${jsonStringify(e.args ?? null)}\x00${e.if ?? ""}`;
    case "http":
      return `http\x00${e.url}\x00${e.if ?? ""}`;
    case "mcp_tool":
      return `mcp_tool\x00${e.server}\x00${e.tool}\x00${jsonStringify(e.input ?? {})}\x00${e.if ?? ""}`;
    case "script":
      return `script\x00${jsonStringify(e.script ?? null)}\x00${jsonStringify(e.file ?? null)}\x00${e.if ?? ""}`;
    default:
      return;
  }
}
//@ chunk-e6aww6q8.js:3495726-3495891 layout
function isSameHook(e, n) {
  if (e.type === "callback" || e.type === "function" || n.type === "callback" || n.type === "function")
    return e === n;
  let r = getHookDedupPayload(e);
  return r !== void 0 ? r === getHookDedupPayload(n) : isDeepStrictEqual_4(e, n);
}
//@ chunk-e6aww6q8.js:3495891-3496298 layout
function isPersonalRestrictedHook(e, n) {
  let { hook: hook } = e;
  if (
    !isPersonalConfigRestricted() ||
    (hook.type !== "command" && hook.type !== "http" && hook.type !== "mcp_tool" && hook.type !== "script")
  )
    return !1;
  if (e.personal === !0) return !0;
  if (hook.type === "command" && getHookOriginLabel(e) !== void 0) return !1;
  if (e.pluginRoot !== void 0 || e.deviceForwarded === !0 || e.sdkHost === !0) return !1;
  if (e.skillRoot !== void 0 || e.projectRoot !== void 0) return !1;
  let s = getHookDedupPayload(hook);
  return (getUserHooksFromSnapshot()[n] ?? []).some((h) =>
    h.hooks.some((hook) => getHookDedupPayload(hook) === s),
  );
}
//@ chunk-e6aww6q8.js:3496298-3496734 layout
function restrictPersonalHookAnswer(e, n) {
  if (isSyncHookJSONOutput_2(e)) return e;
  let { answer: answer, report: report } = parseHookJsonOutput(e, n.hook_event_name, {
    personal: !0,
    ...("tool_name" in n && { toolName: n.tool_name }),
    ...("tool_input" in n && { toolInput: jsonParse(jsonStringify(n.tool_input)) }),
    ...("tool_response" in n &&
      n.tool_response !== void 0 && { toolResponse: jsonParse(jsonStringify(n.tool_response)) }),
  });
  if (report.dropped.length > 0)
    logForDebugging(
      `${n.hook_event_name} hook from your own files: ignored ${report.dropped.join(", ")} (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG)`,
    );
  return answer;
}
//@ chunk-e6aww6q8.js:3496734-3496810 layout
function isSyncHookConfig(e) {
  return e.type !== "command" || (e.async !== !0 && e.asyncRewake !== !0);
}
//@ chunk-e6aww6q8.js:3496810-3497556 layout
function dedupeHooksPreferSettings(e, n, r) {
  let s = new Map(e);
  if (!isPersonalConfigRestricted()) return markContestedContinue(e, Array.from(s.values()));
  let flattened = (getUserHooksFromSnapshot()[n] ?? []).flatMap((L) => L.hooks),
    y = new Map();
  for (let [L, G] of e) {
    let q =
        r.settings.has(G.hook) &&
        G.pluginRoot === void 0 &&
        G.skillRoot === void 0 &&
        G.projectRoot === void 0 &&
        G.deviceForwarded !== !0 &&
        G.sdkHost !== !0 &&
        flattened.some((Se) => isDeepStrictEqual_4(Se, G.hook)),
      Z = y.get(L);
    if (q && (Z === void 0 || isSyncHookConfig(G.hook) || !isSyncHookConfig(Z.hook))) y.set(L, G);
  }
  if (y.size === 0) return markContestedContinue(e, Array.from(s.values()));
  let flattened_2 = ["flagSettings", "policySettings"].flatMap((L) =>
      (getSettingsForSource(L)?.hooks?.[n] ?? []).flatMap((G) => G.hooks),
    ),
    list = Array.from(s, ([L, G]) => {
      let q = y.get(L);
      if (
        q === void 0 ||
        (!isSyncHookConfig(q.hook) && isSyncHookConfig(G.hook)) ||
        flattened_2.some((Z) => isDeepStrictEqual_4(Z, G.hook))
      )
        return G;
      return r.settings.has(G.hook) || r.checkout.has(G.hook) || !isSyncHookConfig(G.hook) ? q : G;
    });
  return markContestedContinue(e, list);
}
//@ chunk-e6aww6q8.js:3497556-3497620 layout
function isOnFailureContinue(e) {
  return "onFailure" in e && e.onFailure === "continue";
}
//@ chunk-e6aww6q8.js:3497620-3497874 layout
function markContestedContinue(e, n) {
  if (!n.some((h) => isOnFailureContinue(h.hook))) return n;
  let r = new Map(e.map(([h, y]) => [y, h])),
    s = new Set(e.flatMap(([h, y]) => (isOnFailureContinue(y.hook) ? [] : [h])));
  return n.map((h) => {
    let y = r.get(h);
    return isOnFailureContinue(h.hook) && (y === void 0 || s.has(y)) ? { ...h, continueIsContested: !0 } : h;
  });
}
//@ chunk-e6aww6q8.js:3497874-3498149 layout
function findSettingsHookDefinition(e, n, r, s) {
  if (e.type === "callback" || e.type === "function") return;
  let h = getHookDedupPayload(e);
  if (h === void 0) return;
  for (let y of [...s].reverse())
    for (let S of getSettingsForSource(y)?.hooks?.[n] ?? []) {
      if (!r.includes(S.matcher ?? "")) continue;
      let found = S.hooks.find((hook) => getHookDedupPayload(hook) === h);
      if (found !== void 0) return found;
    }
  return;
}
//@ chunk-e6aww6q8.js:3498149-3498307 layout
function isNotFromOwnSettings(e, n, r, s) {
  let h = (y, S) =>
    y.some((w) =>
      (getSettingsForSource(w)?.hooks?.[n] ?? []).some(
        (L) => (L.matcher ?? "") === S && L.hooks.some((hook) => isDeepStrictEqual_4(hook, e)),
      ),
    );
  return !r.some((y) => h(s, y));
}
//@ chunk-e6aww6q8.js:3498307-3498478 layout
function isManagedSnapshotHook(e, n) {
  try {
    let r = getPolicyHooksFromSnapshot();
    if (r === "unreadable") return !0;
    let s = getHookDedupPayload(e);
    return (
      s !== void 0 &&
      (r[n] ?? []).some((h) =>
        h.hooks.some((hook) => getHookDedupPayload(hook) === s && httpHookHeadersEqual(hook, e)),
      )
    );
  } catch {
    return !0;
  }
}
//@ chunk-e6aww6q8.js:3498478-3498658 layout
function markHookOwnership(e, n, r) {
  for (let { hook: hook, pluginRoot: pluginRoot, pluginId: pluginId, skillRoot: skillRoot } of e) {
    if (skillRoot !== void 0 || hook.type === "function") continue;
    let w = pluginRoot !== void 0;
    if ((!w && r) || isOrganizationHook(hook, n, w, pluginId)) j0(hook);
    else IHt(hook);
  }
}
//@ chunk-e6aww6q8.js:3498658-3498853 layout
function isOrganizationHook(e, n, r, s) {
  try {
    return r ? s !== void 0 && isManagedPluginId(s) : isManagedSnapshotHook(e, n);
  } catch (error) {
    return (
      logForDebugging(
        `Hooks: whose a ${n} hook is could not be told, so it starts as the organization's: ${errorMessage(error)}`,
        { level: "error" },
      ),
      !0
    );
  }
}
//@ chunk-e6aww6q8.js:3498853-3498991 layout
function httpHookHeadersEqual(e, n) {
  return (
    e.type !== "http" ||
    n.type !== "http" ||
    (isDeepStrictEqual_4(e.headers ?? {}, n.headers ?? {}) &&
      isDeepStrictEqual_4(e.allowedEnvVars ?? [], n.allowedEnvVars ?? []))
  );
}
//@ chunk-e6aww6q8.js:3498991-3499273 layout
function getManagedHttpHookEnv(e) {
  if (!Fge(e)) return;
  try {
    return AQ(getProcessEnvForHttpHook);
  } catch (error) {
    return (
      logForDebugging(
        `Hooks: the environment an organization's http hook reads its header variables from could not be composed, so they read as unset: ${errorMessage(error)}`,
        { level: "error" },
      ),
      { env: {}, blankList: { plain: new Set(), remoteSink: new Set() } }
    );
  }
}
//@ chunk-e6aww6q8.js:3499273-3499361 layout
function resolveScriptHook(e, n) {
  if (!Fge(e)) return XVo(e, n);
  let r = AQ(() => XVo(e, n));
  return (j0(r.hook), r);
}
//@ chunk-e6aww6q8.js:3499361-3499641 layout
async function getServedSessionOwnSources(e) {
  if (isDiskless()) return POLICY_ONLY_SOURCES;
  try {
    let n = await R1e(),
      r = await settingsSourcesInReach(n, e);
    return { roots: n, ownSources: SETTING_SOURCES.filter((s) => !r.has(s)) };
  } catch (error) {
    return (
      logForDebugging(
        `Hooks: could not tell which settings files the served session can write (${errorMessage(error)}); only managed settings vouch for a hook`,
      ),
      POLICY_ONLY_SOURCES
    );
  }
}
//@ chunk-e6aww6q8.js:3499641-3499692 layout
var POLICY_ONLY_SOURCES = { roots: [POSIX_SEP], ownSources: ["policySettings"] };
//@ chunk-e6aww6q8.js:3499692-3500305 layout
async function getUntrustedFolderSources(e) {
  let n = {
      roots: [POSIX_SEP],
      ownSources: ["userSettings", "flagSettings", "policySettings"],
      untrustedFolder: !0,
    },
    r = getOriginalCwdOrNull(),
    s = resolveOptions(getLatchedPreSettingsEnvSnapshot() ?? subprocessEnv());
  if (getProjectConfigRoot() !== null) return { ...n, ownSources: [] };
  if (r !== null && (await realpathOrSelf(r)) === (await realpathOrSelf(s))) return n;
  let h = getFlagSettingsInline() === null && getSettingsFilePathForSource("flagSettings") !== void 0,
    y = [POSIX_SEP],
    S = h;
  try {
    if (!isDiskless()) {
      y = await R1e();
      let w = await settingsSourcesInReach(y, e);
      S = h && w.has("flagSettings");
    }
  } catch (error) {
    logForDebugging(
      `Hooks: could not tell what the launch folder holds (${errorMessage(error)}); with no workspace trust a --settings file does not vouch for a hook`,
      { level: "error" },
    );
  }
  return {
    ...n,
    ownSources: S ? [] : n.ownSources,
    untrustedStart: await resolveServedSpawnCwd(s, y, r ?? getCwd(), e),
  };
}
//@ chunk-e6aww6q8.js:3500305-3500991 layout
async function isWithheldFolderHook(
  e,
  n,
  { roots: roots, ownSources: ownSources, untrustedFolder: untrustedFolder },
) {
  let { hook: hook } = e;
  if (hook.type !== "command" && hook.type !== "http" && hook.type !== "mcp_tool" && hook.type !== "script")
    return !1;
  let S = e.pluginRoot ?? e.skillRoot,
    w =
      S === void 0
        ? isNotFromOwnSettings(hook, n, e.matcherTexts ?? [], ownSources)
        : m_([S, await realpathOrSelf(S)].map(normalizeCommandForPlatform), roots);
  if (w && untrustedFolder)
    logForDebugging(
      `Hooks: ${hook.type} hook not run for ${n}: the workspace is not trusted, and the person's own settings do not define it`,
    );
  else if (w) {
    if (
      (logForDebugging(
        `Hooks: ${hook.type} hook not run for ${n}: it comes from the launch folder's settings, and this process serves a cloud session with no terminal`,
      ),
      !Ebr().includes("hook"))
    )
      logFeatureOk("remote_served_folder_config_withheld", {
        arm: fromEnum("hook_dispatch"),
        event: fromEnum(n),
      });
    hao("hook");
  }
  return w;
}
//@ chunk-e6aww6q8.js:3500991-3501095 layout
async function filterWithheldFolderHooks(e, n, r) {
  let results = await Promise.all(e.map((h) => isWithheldFolderHook(h, n, r)));
  return e.filter((h, y) => !results[y]);
}
//@ chunk-e6aww6q8.js:3501095-3501152 layout
function isAnchoredCommandPath(e) {
  return /^(?:\/|~|\$\{?[A-Za-z_])/.test(e);
}
//@ chunk-e6aww6q8.js:3501152-3501213 layout
function getFilesystemRoot(e) {
  return getPlatform() === "windows" ? win32.parse(e).root : "/";
}
//@ chunk-e6aww6q8.js:3501213-3501296 layout
async function realpathOrSelf(e) {
  let n = await realpathAllowMissing(e);
  return n === "absent" || n === "unreadable" ? e : n;
}
//@ chunk-e6aww6q8.js:3501296-3501667 layout
function holdHookForServedCall(e, n, r, s, h) {
  return (
    logForDebugging(`Hooks: ${e.type} hook not run for a call served to a cloud session (${n}, ${s ?? r})`),
    logServedHookHeld(n, e.type, r, s, h),
    n === "PreToolUse"
      ? {
          hook: e,
          outcome: "success",
          permissionBehavior: "ask",
          hookPermissionDecisionReason: h === "person_read_rules" ? jBr : YWe[r],
          heldForServedCall: !0,
        }
      : { hook: e, outcome: "success", systemMessage: hookNotRunNotice(n, e.type, r), heldForServedCall: !0 }
  );
}
//@ chunk-e6aww6q8.js:3501667-3502078 layout
function redactServedBlockingError(e) {
  if (e.blockingError === void 0) return e;
  let n = `${e.hook.type} hook`,
    r = `[${e.blockingError.command}]:`,
    blockingError = e.blockingError.blockingError,
    permissionRequestResult = e.permissionRequestResult;
  return {
    ...e,
    blockingError: {
      blockingError: blockingError.startsWith(r) ? `[${n}]:${blockingError.slice(r.length)}` : blockingError,
      command: n,
    },
    ...(permissionRequestResult?.behavior === "deny" &&
      permissionRequestResult.message?.startsWith(r) === !0 && {
        permissionRequestResult: {
          ...permissionRequestResult,
          message: `[${n}]:${permissionRequestResult.message.slice(r.length)}`,
        },
      }),
  };
}
/**
 * PreToolUse 钩子超时或失败（未给结论）时改为阻断：onFailure:continue 且未被争议时放行；否则生成「the hook did not finish/failed, so this call was not run」。
 */
//@ chunk-e6aww6q8.js:3502078-3503312 layout
function refuseUnfinishedPreToolHook(e, n, r, s) {
  if (
    r !== void 0 &&
    "onFailure" in e.hook &&
    e.hook.onFailure === "continue" &&
    s?.continueIsContested !== !0
  )
    return e;
  let h =
    e.outcome === "cancelled" && n?.aborted !== !0
      ? "gave no verdict in time"
      : e.outcome === "non_blocking_error" && e.ranByContract !== !0 && (r === void 0 || r.failuresToo === !0)
        ? "gave no verdict"
        : void 0;
  if (h === void 0) return e;
  if (
    (logForDebugging(
      `Hooks: ${r === void 0 ? "served-call " : ""}PreToolUse ${e.hook.type} hook ${h}; refusing the call`,
      { level: "warn" },
    ),
    r !== void 0)
  ) {
    logEvent("tengu_pre_tool_use_refused_unfinished_hook", {
      hookType: fromEnum(e.hook.type),
      toolName:
        s?.tool === void 0
          ? lit_2("unknown")
          : s.tool.isMcp === !0 || s.tool.mcpInfo !== void 0
            ? lit_2("mcp_tool")
            : s.tool.uiTableKey !== void 0 || s.tool.name.includes("__")
              ? lit_2("dynamic_tool")
              : sanitizeToolNameForAnalytics(s.tool.name),
      gateIgnoresSwitch: r.gateIgnoresSwitch,
      inSubagent: s?.inSubagent === !0,
      ...(e.outcome !== "cancelled" && { hookFailed: !0 }),
    });
    let y = VBt(e.hook);
    return {
      ...e,
      message: void 0,
      blockingError: {
        blockingError: `[${y}]: the hook ${e.outcome === "cancelled" ? "did not finish" : "failed"}, so this call was not run.
${r.advice}`,
        command: y,
        hookDidNotFinish: !0,
      },
      outcome: "blocking",
    };
  }
  return {
    ...e,
    message: void 0,
    blockingError: {
      blockingError: `a PreToolUse ${e.hook.type} hook ${h}, so this call was not run`,
      command: getHookDisplayText(e.hook),
    },
    outcome: "blocking",
  };
}
/**
 * 钩子去重键：来源根（pluginRoot/skillRoot/settingsSource）+ 负载。
 */
//@ chunk-e6aww6q8.js:3503312-3503396 fingerprint = hookDedupKey (0.791)
function hookDedupKey(m, payload) {
  return `${m.pluginRoot ?? m.skillRoot ?? m.settingsSource ?? ""}\x00${payload}`;
}
//@ chunk-e6aww6q8.js:3503396-3503531 layout
function isOfficialPluginId(e) {
  let index = e.lastIndexOf("@");
  if (index <= 0) return !1;
  let sliced = e.slice(index + 1);
  if (isOfficialMarketplaceName_3(sliced)) return !0;
  if (sliced === SYNCED && isOfficialMarketplaceName_3(getAttestedOfficialPluginMarketplace(e))) return !0;
  return !1;
}
//@ chunk-e6aww6q8.js:3503531-3503704 layout
function countHooksByPlugin(e) {
  let filtered = e.filter((s) => s.pluginId);
  if (filtered.length === 0) return;
  let r = new Map();
  for (let s of filtered) {
    let h = pluginIdForAnalytics_GATE_EVALUATED(s.pluginId, isOfficialPluginId(s.pluginId));
    r.set(h, (r.get(h) ?? 0) + 1);
  }
  return r;
}
//@ chunk-e6aww6q8.js:3503704-3503840 layout
function shouldPassCredentialsToPluginHook(e) {
  if (!isOfficialPluginId(e)) return !1;
  let index = e.lastIndexOf("@"),
    sliced = e.slice(0, index);
  return (getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_lattice", {}).plugins ?? []).includes(sliced);
}
/**
 * 为白名单中的官方插件钩子提供凭据环境变量（订阅用户给 OAuth 访问令牌，否则给 API key）；serve、会话令牌、非第一方、仅必要流量或 HIPAA 等情况下不给。
 */
//@ chunk-e6aww6q8.js:3503840-3504133 layout
function getPluginHookCredentialEnv(e) {
  if (!e || !shouldPassCredentialsToPluginHook(e)) return {};
  if (isHttpMcpServeInvocation()) return {};
  if (usesSessionAccessToken()) return {};
  if (!isFirstPartyProvider()) return {};
  if (isEssentialTrafficOnly() || hipaaWithholdsChildCredentials()) return {};
  if (env.ANTHROPIC_UNIX_SOCKET) return {};
  try {
    if (isClaudeAISubscriber()) {
      let r = loginToHandOn(getClaudeAIOAuthTokens())?.accessToken;
      return r ? { ANTHROPIC_AUTH_TOKEN: r } : {};
    }
    let n = getAnthropicApiKey();
    return n ? { ANTHROPIC_API_KEY: n } : {};
  } catch {
    return {};
  }
}
/**
 * 上报插件钩子自报的指标：取输出对象前若干个布尔/数字字段，记 `tengu_hook_plugin_metrics` 并写 OTel 事件 hook_plugin_metrics。
 */
//@ chunk-e6aww6q8.js:3504133-3504464 facade-exports
function emitHookMetrics(e, n, r, s) {
  if (!e || !n) return;
  let h = isOfficialPluginId(n);
  if (!h) return;
  let filtered = Object.entries(e)
    .slice(0, z1e)
    .filter(([, S]) => typeof S === "boolean" || typeof S === "number");
  (logEvent("tengu_hook_plugin_metrics", {
    ...Object.fromEntries(filtered),
    pluginId: pluginIdForAnalytics_GATE_EVALUATED(n, h),
    hookEvent: fromEnum(r),
  }),
    logOTelEvent("hook_plugin_metrics", { ...Object.fromEntries(filtered), plugin_id: n, hook_event: r }, s));
}
//@ chunk-e6aww6q8.js:3504464-3504565 layout
function countHooksByType(e) {
  let n = new Map();
  for (let r of e) {
    let s = fromEnum(r.hook.type);
    n.set(s, (n.get(s) ?? 0) + 1);
  }
  return n;
}
//@ chunk-e6aww6q8.js:3504565-3504595 facade-exports
var MANAGED_HOOKS_TIER = { managedHooksOnly: !0 };
/**
 * 判断托管层（managed）钩子情况：有托管钩子返回 some；确认没有托管钩子且策略已读好返回 none；无法确定返回 unknown。
 */
//@ chunk-e6aww6q8.js:3504595-3504780 facade-exports
function managedTierHooks(e) {
  try {
    if (collectEventHooks(void 0, [], e, MANAGED_HOOKS_TIER).length > 0) return "some";
    let r = getEligibilityMemo(),
      s = isCcsCoworkSurface() || r === !1 || (r === !0 && getLastLoadStatus()?.state === "ok");
    return getPolicySettingsLoadErrors().length === 0 && s ? "none" : "unknown";
  } catch {
    return "unknown";
  }
}
//@ chunk-e6aww6q8.js:3504780-3504902 sole-consumer
function excludeManagedHooks(e, n) {
  let r = (h) => Rs({ ...h, settingsSource: void 0 }),
    s = new Set(getManagedHooksForEvent(n).map(r));
  return e.filter((h) => !s.has(r(h)));
}
//@ chunk-e6aww6q8.js:3504902-3505019 sole-consumer
function getManagedHooksForEvent(e) {
  return filterHooksForCloudSession([
    ...(getSettingsForSource("policySettings")?.hooks?.[e] ?? []),
    ...(getPluginHookRunner()?.settingsHooks("policySettings", e) ?? []),
  ]);
}
//@ chunk-e6aww6q8.js:3505019-3505039 sole-consumer
var weakSet_6 = new WeakSet();
/**
 * 收集某事件的钩子：仅托管时只取策略钩子；否则取设置钩子（可排除托管），加上会话钩子与函数钩子，最后按暂扣状态过滤。
 */
//@ chunk-e6aww6q8.js:3505039-3505549 sole-consumer
function collectEventHooks(e, n, r, s) {
  if (s?.managedHooksOnly) {
    if (getSettingsForSource("policySettings")?.disableAllHooks === !0) return [];
    return getManagedHooksForEvent(r);
  }
  let settingsHooks = getHooksForEvent(r, { withoutCheckoutHooks: shouldOmitCheckoutSessionEndHooks(r) }),
    hooks = s?.managedHooksExcluded ? excludeManagedHooks(settingsHooks, r) : [...settingsHooks],
    sessionIds = typeof n === "string" ? [n] : n;
  if (e === void 0) return filterHooksByManagedHold(hooks, r, s?.held);
  let skipSessionHooks = shouldSkipSessionHooksByPolicy();
  for (let G of sessionIds) {
    let q = e.get(G, r).get(r);
    if (q) {
      let Z = filterSessionHookMatchers(q, skipSessionHooks);
      for (let Se of Z) for (let hook of Se.hooks) weakSet_6.add(hook);
      hooks.push(...Z);
    }
  }
  let L = sessionIds[0];
  if (L !== void 0 && !skipSessionHooks) {
    let G = e.getFunctionHooks(L, r).get(r);
    if (G) hooks.push(...G);
  }
  return filterHooksByManagedHold(hooks, r, s?.held);
}
/**
 * 计算 UserPromptSubmit 钩子集合的指纹键（托管层与全部钩子序列化，函数按宿主分配稳定编号）；没有钩子返回空串。用于判断钩子是否变化。
 */
//@ chunk-e6aww6q8.js:3505608-3506011 facade-exports
function userPromptSubmitHooksKey(e) {
  let of = groupBySource.of(e.session.host);
  function r(S) {
    let w = of.tokens.get(S);
    if (w === void 0) ((of.next += 1), (w = of.next), of.tokens.set(S, w));
    return w;
  }
  let s = registerAgent(e, "UserPromptSubmit", e.session.id),
    h = collectEventHooks(e.sessionHooksRegistry, s, "UserPromptSubmit", MANAGED_HOOKS_TIER),
    y = collectEventHooks(e.sessionHooksRegistry, s, "UserPromptSubmit");
  return h.length + y.length === 0
    ? ""
    : JSON.stringify([h, y], (S, w) => (typeof w === "function" ? `function#${of.host}:${r(w)}` : w));
}
/**
 * 判断某事件是否有钩子：设置中有、存在函数钩子、或有待补跑（owed）的钩子。
 */
//@ chunk-e6aww6q8.js:3506011-3506082 facade-exports
function hasHookForEvent(e, n, r) {
  return hasSettingsHookForEvent(e, n, r) || F3(e) || getPluginHookRunner()?.owedList(e) !== void 0;
}
/**
 * 判断某事件是否有需要实际运行的钩子（有钩子且不全被跳过）。
 */
//@ chunk-e6aww6q8.js:3506082-3506132 facade-exports
function hasHookToRun(e, n, r) {
  return hasHookForEvent(e, n, r) && !RAe(e, n, r);
}
//@ chunk-e6aww6q8.js:3506132-3506178 layout
function RAe(e, n, r) {
  return canSkipEmptyDispatch(e) && !hasSettingsHookForEvent(e, n, r);
}
//@ chunk-e6aww6q8.js:3506178-3506301 layout
function canSkipEmptyDispatch(e, n = !1) {
  return (
    !isTerminalShutdown() &&
    (canSkipEmptyClassicDispatch(e) ||
      (n && !env.CLAUDE_CODE_DISABLE_EMPTY_CLASSIC_DISPATCH_SKIP && !F3(e))) &&
    managedTierHooks(e) === "none"
  );
}
/**
 * 判断某事件是否只有调用方自己的回调钩子要运行（无远程调用、无 owed 钩子、无项目设置钩子，且全部钩子都是本进程回调或来自 flag 设置）；判断出错时记错误并返回 false。用于走快速路径。
 */
//@ chunk-e6aww6q8.js:3506301-3506760 facade-exports
function hasOnlyOwnCallbacksToRun(e, n, r, s, h = !1) {
  try {
    let y;
    return (
      s?.remoteCall === void 0 &&
      !isAttachServeMode() &&
      getPluginHookRunner()?.owedList(e) === void 0 &&
      !getPluginHookRunner()?.settingsHooks("projectSettings", e).length &&
      canSkipEmptyDispatch(e, !0) &&
      collectEventHooks(n, r, e, { held: "included" }).every(
        (S) =>
          S.hooks.every((hook) => isInternalHook({ hook: hook })) ||
          (h &&
            (y ??= new Set(
              getFlagSettingsExpectedContent() === void 0 &&
                getFlagSettingsFilePinnedContent() !== void 0 &&
                getFlagSettingsInline()?.hooks === void 0
                ? getSettingsForSource("flagSettings")?.hooks?.[e]?.map((w) => Rs(w))
                : [],
            )).has(Rs(S))),
      )
    );
  } catch (error) {
    return (
      logForDebugging(`Could not tell whose hooks are on ${e}: ${errorMessage(error)}`, { level: "error" }),
      !1
    );
  }
}
/**
 * 判断一次工具调用对某事件是否没有任何要跑的钩子（只有自身回调且没有匹配该工具的钩子）；出错返回 false。
 */
//@ chunk-e6aww6q8.js:3506760-3507106 facade-exports
function hasNoHookForToolCall(e, n, r, s) {
  try {
    let sessionHooksRegistry = s.sessionHooksRegistry,
      y = registerAgent(s, e, s.session.id);
    return (
      hasOnlyOwnCallbacksToRun(e, sessionHooksRegistry, y, s) &&
      !hasToolHookMatching({
        hookEvent: e,
        toolName: n,
        toolInput: r,
        tools: s.options.tools,
        toolAliases: s.getAppState().toolPermissionContext.toolAliases,
        sessionHooks: sessionHooksRegistry,
        sessionId: y,
      })
    );
  } catch (error) {
    return (
      logForDebugging(`Could not tell whether a ${e} hook matches: ${errorMessage(error)}`, {
        level: "error",
      }),
      !1
    );
  }
}
//@ chunk-e6aww6q8.js:3507106-3507244 layout
function matcherMatchesInput(e, n, r, s, h) {
  let hook_event_name = s.hook_event_name;
  return (
    n === void 0 ||
    !e ||
    matchesPattern(
      n,
      stripModelContextSuffix(hook_event_name, e),
      HOOK_EVENTS_WITH_MATCHER.has(hook_event_name),
      h,
      r,
      "tool_input" in s ? s.tool_input : void 0,
    )
  );
}
//@ chunk-e6aww6q8.js:3507244-3507522 layout
function markOwnToolHooks(e) {
  let n = (s) => hookDedupKey(s, getHookDedupPayload(s.hook) ?? ""),
    groupBy = Map.groupBy(
      e.filter((s) => s.hook.type === "command"),
      n,
    );
  return e.map((s) => {
    let h = s.hook.type === "command" ? groupBy.get(n(s)) : void 0;
    return h?.some((y) => y.asOwnTool)
      ? { ...s, asOwnTool: !0, asStandIn: h.some((y) => y.asStandIn ?? !y.asOwnTool) }
      : s;
  });
}
/**
 * 插件自有工具调用时，把钩子输入中的工具名换成插件看到的名字（PostToolBatch 逐个替换），返回新输入与工具。
 */
//@ chunk-e6aww6q8.js:3507522-3507892 layout
function resolveOwnToolHookInput(e) {
  let n = getPluginHookRunner()?.ownTool;
  if (n === void 0) return;
  if (e.hook_event_name === "PostToolBatch")
    return {
      hookInput: {
        ...e,
        tool_calls: e.tool_calls.map((tool_call) => ({
          ...tool_call,
          tool_name: n(tool_call.tool_name)?.name ?? tool_call.tool_name,
        })),
      },
      tools: [],
    };
  let r = "tool_name" in e ? n(e.tool_name) : void 0;
  return r === void 0 || !("tool_name" in e)
    ? void 0
    : { hookInput: { ...e, tool_name: r.name, mcp_server: void 0 }, tools: [r] };
}
/**
 * 判断是否有匹配该工具调用的钩子；判定中遇到无法确定的特定错误时保守返回 true。
 */
//@ chunk-e6aww6q8.js:3507892-3507973 facade-exports
function hasToolHookMatching(e) {
  try {
    return hasMatchingToolHooks(e);
  } catch (error) {
    if (error instanceof xpe) return !0;
    throw error;
  }
}
/**
 * 判断是否有钩子匹配该工具调用：有经典调度或欠运行钩子时直接为真；否则按 matcher 匹配工具名、MCP 前缀变体或插件自有工具名，可排除仅内部回调的钩子。
 */
//@ chunk-e6aww6q8.js:3507973-3508547 layout
function hasMatchingToolHooks({
  hookEvent: hookEvent,
  toolName: toolName,
  toolInput: toolInput,
  tools: tools,
  toolAliases: toolAliases,
  sessionHooks: sessionHooks,
  sessionId: sessionId,
  exceptInternal: exceptInternal = !1,
  held: held = "included",
}) {
  if (
    held !== "only" &&
    (dispatchClassicEvent(hookEvent) || getPluginHookRunner()?.owedList(hookEvent, void 0, !0) !== void 0)
  )
    return !0;
  let hasMatcher = HOOK_EVENTS_WITH_MATCHER.has(hookEvent),
    pluginTool = getPluginHookRunner()?.ownTool(toolName);
  return collectEventHooks(sessionHooks, sessionId, hookEvent, { held: held }).some((entry) => {
    if (exceptInternal && !entry.hooks.some((hook) => !(hook.type === "callback" && hook.internal === !0)))
      return !1;
    if (!entry.matcher) return !0;
    let matcher = stripModelContextSuffix(hookEvent, entry.matcher);
    return (
      matchesPattern(toolName, matcher, hasMatcher, toolAliases, tools, toolInput) ||
      getMcpPrefix(
        toolName,
        matcher,
        hookEvent === "PreToolUse" || hookEvent === "PermissionRequest" ? toolInput : void 0,
      ).some((ke) => matchesPattern(ke, matcher, hasMatcher, toolAliases)) ||
      (pluginTool !== void 0 &&
        getHookOriginLabel(entry) !== void 0 &&
        matchesPattern(pluginTool.name, matcher, hasMatcher, toolAliases, [pluginTool], toolInput))
    );
  });
}
/**
 * 判断设置层面某事件是否配置了钩子：依次看合并后的设置钩子、（非受限时）另一来源钩子、策略钩子、插件/注册钩子、owed 钩子，最后看会话钩子注册表。
 */
//@ chunk-e6aww6q8.js:3508547-3508855 facade-exports
function hasSettingsHookForEvent(e, n, r, s = !0) {
  let h = getHooksConfigFromSnapshot()?.[e];
  if (h && h.length > 0) return !0;
  if (!shouldAllowManagedHooksOnly()) {
    let w = getMainThreadAgentHooks()?.[e];
    if (w && w.length > 0) return !0;
  }
  let y = getRegisteredHooks()?.[e];
  if (y && y.length > 0) return !0;
  if (
    getPluginSettingsHooks(e).length > 0 ||
    (s && getPluginHookRunner()?.owedList(e, void 0, !0) !== void 0)
  )
    return !0;
  if (n === void 0) return !1;
  return (typeof r === "string" ? [r] : r).some((w) => n.has(w, e));
}
//@ chunk-e6aww6q8.js:3508855-3509042 layout
function checkHookIfConditionSafely(e) {
  try {
    return e();
  } catch (error) {
    if (!isDiskless() || !cke(error)) throw error;
    return `A hook's "if" condition names a file path, which can't be checked because this session has no working directory.`;
  }
}
/**
 * 取某事件匹配的钩子：汇总快照/插件/会话/SDK 来源的 matcher，按 matcher 匹配 matchQuery（工具名、别名、MCP 名），附加来源信息，按类型去重（同命令只跑一次，settings 优先），再按 if 条件（权限规则语法）过滤；SessionStart/Setup 不支持 http 钩子。
 */
//@ chunk-e6aww6q8.js:3509042-3515613 fingerprint = getMatchingHooks (0.58)
async function getMatchingHooks(sessionHooks, sessionId, hookEvent, hookInput, tools, options) {
  let matcherCount = 0;
  try {
    let w = collectEventHooks(sessionHooks, sessionId, hookEvent, options);
    ((matcherCount = w.length), options?.onPluginMatchersRead?.(w.filter((un) => "pluginRoot" in un)));
    let matchQuery = hookMatchQuery(hookInput),
      settingsHookSets = {
        settings: new Set((getHooksConfigFromSnapshot()?.[hookEvent] ?? []).flatMap((un) => un.hooks)),
        checkout: new Set(w.flatMap((un) => ("checkout" in un && un.checkout === !0 ? un.hooks : []))),
      };
    for (let un of w) warnBareMcpServerMatcher(hookEvent, un.matcher);
    (logForDebugging(`Getting matching hook commands for ${hookEvent} with query: ${matchQuery}`, {
      level: "verbose",
    }),
      logForDebugging(`Found ${w.length} hook matchers in settings`, { level: "verbose" }));
    let toolAliases = options?.getToolAliases?.(),
      Z = resolveOwnToolHookInput(hookInput),
      untestableMatchers = new Map(),
      matcherMatches = (un, ao, $o) => {
        try {
          return matcherMatchesInput(un.matcher, ao, $o, hookInput, toolAliases);
        } catch (error) {
          if (!(error instanceof xpe)) throw error;
          if (getHookOriginLabel(un)?.settingsSource !== "projectSettings")
            untestableMatchers.set(un, error.message);
          return !0;
        }
      },
      we = new Set(
        Z === void 0
          ? []
          : w.filter(
              (un) =>
                getHookOriginLabel(un) !== void 0 && matcherMatches(un, hookMatchQuery(Z.hookInput), Z.tools),
            ),
      ),
      Ee = (un) => Z === void 0 || getHookOriginLabel(un)?.settingsSource !== "projectSettings",
      Ae = new Set(
        w.filter(
          (un) =>
            Ee(un) &&
            matchQuery !== void 0 &&
            getMcpPrefix(matchQuery, un.matcher, getHookToolInput(hookInput)).some((ao) =>
              matcherMatches(un, ao, void 0),
            ) &&
            !we.has(un) &&
            !matcherMatches(un, matchQuery, tools),
        ),
      ),
      filtered = w.filter(
        (un) => we.has(un) || Ae.has(un) || (Ee(un) && matcherMatches(un, matchQuery, tools)),
      ),
      Me = tools !== void 0 && matchQuery !== void 0 ? findToolByName(tools, matchQuery) : void 0,
      We = isCliOwnedMcpTool(Me) && Me?.hookMatcherFamilyNames !== void 0 ? Me : void 0,
      ze = new Set([
        ...Ae,
        ...(We !== void 0
          ? filtered.filter((matcher) => {
              try {
                return !matcherMatchesInput(matcher.matcher, matchQuery, void 0, hookInput, toolAliases);
              } catch (error) {
                if (!(error instanceof xpe)) throw error;
                return !0;
              }
            })
          : []),
      ]),
      lt = new Set((getMainThreadAgentHooks()?.[hookEvent] ?? []).flatMap((un) => un.hooks)),
      matchedHooks = filtered.flatMap((matcher) => {
        let ao = "pluginRoot" in matcher ? matcher.pluginRoot : void 0,
          $o = "pluginId" in matcher ? matcher.pluginId : void 0,
          yo = "pluginRoot" in matcher ? matcher.pluginName : void 0,
          Ho = "skillRoot" in matcher ? matcher.skillRoot : void 0,
          rr = "settingsSource" in matcher ? matcher.settingsSource : void 0,
          br =
            "projectRoot" in matcher &&
            typeof matcher.projectRoot === "string" &&
            !("pluginRoot" in matcher) &&
            !("skillRoot" in matcher) &&
            !("deviceOwner" in matcher) &&
            !("origin" in matcher)
              ? matcher.projectRoot
              : void 0,
          Hr = ao
            ? "pluginName" in matcher
              ? `plugin:${matcher.pluginName}`
              : "plugin"
            : Ho
              ? "skillName" in matcher
                ? `skill:${matcher.skillName}`
                : "skill"
              : "settings",
          Fr = !matcher.matcher || matcher.matcher === "*" || matcher.matcher === ".*",
          cs = isDeviceOwnedHook(matcher),
          _r = "origin" in matcher && matcher.origin === "sdkHost",
          Cr = "hostOwnsStdin" in matcher && matcher.hostOwnsStdin === !0,
          Vr = "personal" in matcher && matcher.personal === !0;
        return matcher.hooks.map((hook) => ({
          hook: hook,
          pluginRoot: ao,
          pluginId: $o,
          pluginName: yo,
          skillRoot: Ho,
          ...(rr !== void 0 && { settingsSource: rr }),
          ...(br !== void 0 && { projectRoot: br }),
          hookSource: Hr,
          ...((weakSet_6.has(hook) || lt.has(hook)) && { registeredInSession: !0 }),
          matcherIsMatchAll: Fr,
          ...(options?.recordMatchers && { matcherTexts: [matcher.matcher ?? ""] }),
          ...(cs && { deviceForwarded: cs }),
          ...(_r && { sdkHost: _r }),
          ...(Cr && { hostOwnsStdin: Cr }),
          ...(Vr && { personal: Vr }),
          ...(we.has(matcher) && {
            asOwnTool: !0,
            asStandIn:
              getHookOriginLabel(matcher)?.settingsSource !== "projectSettings" &&
              matcherMatches(matcher, matchQuery, tools),
          }),
          ...(untestableMatchers.has(matcher) && { notTested: untestableMatchers.get(matcher) }),
          ...(ze.has(matcher) && { throughFamilyOnly: !0 }),
          ...(Ae.has(matcher) && { matcherMetThroughOtherName: !0 }),
        }));
      }),
      nt = new Set(
        matchedHooks.flatMap((un) => {
          let ao = un.throughFamilyOnly === !0 ? void 0 : getHookIdentityKey(un);
          return ao === void 0 ? [] : [ao];
        }),
      ),
      pt =
        ze.size === 0
          ? matchedHooks
          : matchedHooks.map((un) => {
              let ao = un.throughFamilyOnly === !0 ? getHookIdentityKey(un) : void 0;
              return ao !== void 0 && nt.has(ao)
                ? { ...un, throughFamilyOnly: void 0, matcherMetThroughOtherName: void 0 }
                : un;
            }),
      Et = dropHooksInHttpServe(we.size === 0 ? pt : markOwnToolHooks(pt), hookEvent),
      yt = getPluginHookRunner()?.copyThatApplies,
      gt =
        yt === void 0
          ? Et
          : Et.flatMap((un) => {
              if (un.hook.type !== "command" || un.settingsSource !== "projectSettings") return [un];
              let ao = yt(un.hook, hookInput);
              return ao === void 0 ? [] : [{ ...un, hook: ao }];
            }),
      At = () => {
        let un = blocksWhenItCannotRunElsewhere(hookEvent) && I7(),
          getIfCondition = ({ hook: hook, notTested: notTested }) => {
            let Ho = !(hook.type === "command" && isAsyncHookJSONOutput(hook));
            if (notTested === void 0) return Ho ? 3 : 1;
            return un && Ho ? 2 : 0;
          };
        return gt.toSorted(($o, yo) => getIfCondition($o) - getIfCondition(yo));
      },
      orderedHooks = untestableMatchers.size === 0 ? gt : At();
    if (orderedHooks.every((hook) => hook.hook.type === "callback" || hook.hook.type === "function"))
      return orderedHooks;
    let Yt = (un) => un.if ?? "",
      qt = dedupeHooksPreferSettings(
        orderedHooks
          .filter((un) => un.hook.type === "command")
          .map((un) => [hookDedupKey(un, getHookDedupPayload(un.hook) ?? ""), un]),
        hookEvent,
        settingsHookSets,
      ),
      Zt = (un) => hookDedupKey(un, `${un.hook.prompt}\x00${Yt(un.hook)}`),
      rn = dedupeHooksPreferSettings(
        orderedHooks.filter((un) => un.hook.type === "prompt").map((un) => [Zt(un), un]),
        hookEvent,
        settingsHookSets,
      ),
      pn = dedupeHooksPreferSettings(
        orderedHooks.filter((un) => un.hook.type === "agent").map((un) => [Zt(un), un]),
        hookEvent,
        settingsHookSets,
      ),
      no = dedupeHooksPreferSettings(
        orderedHooks
          .filter((un) => un.hook.type === "http")
          .map((un) => [hookDedupKey(un, getHookDedupPayload(un.hook) ?? ""), un]),
        hookEvent,
        settingsHookSets,
      ),
      hn = dedupeHooksPreferSettings(
        orderedHooks
          .filter((un) => un.hook.type === "mcp_tool")
          .map((un) => [hookDedupKey(un, getHookDedupPayload(un.hook) ?? ""), un]),
        hookEvent,
        settingsHookSets,
      ),
      ho = dedupeHooksPreferSettings(
        orderedHooks
          .filter((un) => un.hook.type === "script")
          .map((un) => [hookDedupKey(un, getHookDedupPayload(un.hook) ?? ""), un]),
        hookEvent,
        settingsHookSets,
      ),
      callbackHooks = orderedHooks.filter((un) => un.hook.type === "callback"),
      functionHooks = orderedHooks.filter((un) => un.hook.type === "function"),
      Xn = (un) => {
        if (options?.recordMatchers !== !0) return un;
        try {
          let ao = uniq(
              orderedHooks
                .filter(
                  (yo) =>
                    yo.pluginRoot === un.pluginRoot &&
                    yo.skillRoot === un.skillRoot &&
                    isSameHook(yo.hook, un.hook),
                )
                .flatMap((yo) => yo.matcherTexts ?? []),
            ),
            $o =
              un.pluginRoot === void 0 && un.skillRoot === void 0
                ? findSettingsHookDefinition(un.hook, hookEvent, ao, options.ownSources ?? [])
                : void 0;
          return { ...un, matcherTexts: ao, hook: $o ?? un.hook };
        } catch (error) {
          return (
            logForDebugging(
              `Hooks: could not establish whose settings define a hook (${errorMessage(error)}); treating it as the project's`,
            ),
            { ...un, matcherTexts: [] }
          );
        }
      },
      dedupedHooks = [
        ...qt.map(Xn),
        ...rn,
        ...pn,
        ...no.map(Xn),
        ...hn.map(Xn),
        ...ho.map(Xn),
        ...callbackHooks,
        ...functionHooks,
      ],
      hasIfCondition = dedupedHooks.some(
        (un) =>
          (un.hook.type === "command" ||
            un.hook.type === "prompt" ||
            un.hook.type === "agent" ||
            un.hook.type === "http" ||
            un.hook.type === "mcp_tool" ||
            un.hook.type === "script") &&
          un.hook.if,
      ),
      bo = hasIfCondition ? await createIfConditionMatcher(hookInput, tools) : void 0,
      vn = hasIfCondition && Z ? await createIfConditionMatcher(Z.hookInput, Z.tools, !0) : void 0,
      flattened = dedupedHooks.flatMap((un) => {
        if (
          un.hook.type !== "command" &&
          un.hook.type !== "prompt" &&
          un.hook.type !== "agent" &&
          un.hook.type !== "http" &&
          un.hook.type !== "mcp_tool" &&
          un.hook.type !== "script"
        )
          return [un];
        let ifCondition = un.hook.if;
        if (!ifCondition) return [un];
        if (!bo)
          return (
            logForDebugging(
              `Hook if condition "${ifCondition}" cannot be evaluated for non-tool event ${hookInput.hook_event_name}`,
            ),
            []
          );
        let $o = un.hook.type === "command" && getHookOriginLabel(un) !== void 0;
        if (un.asOwnTool && vn?.(ifCondition, !0)) return [un];
        let yo = checkHookIfConditionSafely(
          () => (!un.asOwnTool || un.asStandIn === !0) && bo(ifCondition, $o),
        );
        if (typeof yo === "string") return [{ ...un, notTested: yo }];
        if (yo) {
          let Ho = un.asOwnTool ? { ...un, asOwnTool: !1 } : un,
            toolName = permissionRuleValueFromString(ifCondition).toolName;
          if (
            un.matcherMetThroughOtherName === !0 &&
            toolName === matchQuery &&
            Pz(matchQuery, getHookToolInput(hookInput)) !== void 0
          )
            return (
              logForDebugging(
                `Skipping hook: its if condition "${ifCondition}" names Monitor, and its matcher met the call only through Bash`,
              ),
              []
            );
          if (matchQuery !== void 0 && Knt(matchQuery, getHookToolInput(hookInput)).includes(toolName))
            return [{ ...Ho, throughFamilyOnly: !0 }];
          return [
            We === void 0
              ? Ho
              : toolName === matchQuery
                ? { ...Ho, throughFamilyOnly: void 0 }
                : { ...Ho, throughFamilyOnly: !0 },
          ];
        }
        return (logForDebugging(`Skipping hook due to if condition "${ifCondition}" not matching`), []);
      }),
      finalHooks =
        hookEvent === "SessionStart" || hookEvent === "Setup"
          ? flattened.filter((un) => {
              if (un.hook.type === "http")
                return (
                  logForDebugging(
                    `Skipping HTTP hook ${un.hook.url} \u2014 HTTP hooks are not supported for ${hookEvent}`,
                  ),
                  !1
                );
              return !0;
            })
          : flattened,
      ko = count(finalHooks, isInternalHook);
    return (
      logForDebugging(
        `Matched ${finalHooks.length - ko} unique hooks for query "${matchQuery ?? "no match query"}" (${orderedHooks.length - ko} before deduplication)`,
        { level: "verbose" },
      ),
      markHookOwnership(finalHooks, hookEvent, options?.managedHooksOnly === !0),
      finalHooks
    );
  } catch (error) {
    if (matcherCount > 0 || mergeClients_3(error)) throw error;
    if (
      (logForDebugging(`Failed to resolve matching hooks for ${hookEvent}: ${errorMessage(error)}`, {
        level: "error",
      }),
      !options?.suppressTelemetry)
    )
      logFeatureBad(hookFeature(hookEvent), "hook_match_failed");
    return [];
  }
}
/**
 * 生成 Stop 钩子阻断后发给模型的反馈消息。旧版名 getTeammateIdleHookMessage 与本函数对调了。
 */
//@ chunk-e6aww6q8.js:3515613-3515668 facade-exports = getTeammateIdleHookMessage (0.511)
function getStopHookMessage(blockingError) {
  return hookFeedbackText("Stop", TA(blockingError.blockingError));
}
/**
 * 生成 TeammateIdle 钩子阻断后发给队友的反馈消息。旧版名 getStopHookMessage 与本函数对调了。
 */
//@ chunk-e6aww6q8.js:3515668-3515731 facade-exports
function getTeammateIdleHookMessage(blockingError) {
  return hookFeedbackText("TeammateIdle", TA(blockingError.blockingError));
}
/**
 * 生成 TaskCreated 钩子阻断消息。
 */
//@ chunk-e6aww6q8.js:3515731-3515793 facade-exports = getTaskCreatedHookMessage (0.47)
function getTaskCreatedHookMessage(blockingError) {
  return hookFeedbackText("TaskCreated", TA(blockingError.blockingError));
}
/**
 * 生成 TaskCompleted 钩子阻断消息。
 */
//@ chunk-e6aww6q8.js:3515793-3515857 facade-exports = getTaskCompletedHookMessage (0.477)
function getTaskCompletedHookMessage(blockingError) {
  return hookFeedbackText("TaskCompleted", TA(blockingError.blockingError));
}
/**
 * 把阻断错误包装为 hook_non_blocking_error 附件消息（exit 2）。
 */
//@ chunk-e6aww6q8.js:3515857-3516023 facade-exports
function getNonBlockableHookErrorMessage(e, n, r = e) {
  return createAttachmentMessage_2({
    type: "hook_non_blocking_error",
    hookName: r,
    toolUseID: randomUUID_11(),
    hookEvent: e,
    stderr: n.blockingError,
    stdout: "",
    exitCode: 2,
    command: n.command,
  });
}
/**
 * UserPromptSubmit 阻断消息：「UserPromptSubmit operation blocked by hook: …」。
 */
//@ chunk-e6aww6q8.js:3516023-3516110 facade-exports = getUserPromptSubmitHookBlockingMessage (1)
function getUserPromptSubmitHookBlockingMessage(blockingError) {
  return `UserPromptSubmit operation blocked by hook:
${blockingError.blockingError}`;
}
//@ chunk-e6aww6q8.js:3516110-3516194 sole-consumer
function Jxn(e, n) {
  let r = getSurfacedHookSpawnFailures(),
    s = `${e}:${n}`;
  if (r.has(s)) return !1;
  return (r.add(s), !0);
}
//@ chunk-e6aww6q8.js:3516194-3516248 sole-consumer
function NPn(e, n) {
  return n ? concatSafe(fromEnum(e), lit_2(":"), gn(n)) : fromEnum(e);
}
//@ chunk-e6aww6q8.js:3516248-3516372 sole-consumer
var HOLD_UNTIL_EXIT_EVENTS = new Set([
  "PreToolUse",
  "PermissionRequest",
  "UserPromptSubmit",
  "UserPromptExpansion",
  "TaskCompleted",
  "TeammateIdle",
]);
/**
 * 钩子执行总入口（异步生成器）：先等待被"暂扣"的钩子来源就绪；非 PreToolUse 且可以批处理、且不只是自身回调时走批量路径，否则逐个执行匹配的钩子，逐条 yield 结果。
 */
//@ chunk-e6aww6q8.js:3516433-3517403 facade-exports
async function* executeHooks(e) {
  let { hookInput: hookInput } = e,
    r = e.managedHooksOnly
      ? void 0
      : maybeWaitForHookPolicy(
          hookInput.hook_event_name,
          () => {
            let s = e.toolUseContext?.sessionHooksRegistry ?? e.sessionHooks,
              h = registerAgent(e.toolUseContext, hookInput.hook_event_name, e.session.id);
            return "tool_name" in hookInput
              ? hasToolHookMatching({
                  hookEvent: hookInput.hook_event_name,
                  toolName: hookInput.tool_name,
                  toolInput: hookInput.tool_input,
                  tools: e.toolUseContext?.options.tools,
                  toolAliases: e.toolUseContext?.options.toolAliases,
                  sessionHooks: s,
                  sessionId: h,
                  held: "only",
                })
              : collectEventHooks(s, h, hookInput.hook_event_name, { held: "only" }).length > 0;
          },
          e.signal,
        );
  if (r !== void 0) await r;
  if (
    !e.classicChainMember &&
    !e.managedHooksOnly &&
    !e.sessionFunctionHooksOnly &&
    hookInput.hook_event_name !== "PreToolUse" &&
    Cht(hookInput.hook_event_name) &&
    !RAe(
      hookInput.hook_event_name,
      e.toolUseContext?.sessionHooksRegistry ?? e.sessionHooks,
      registerAgent(e.toolUseContext, hookInput.hook_event_name, e.session.id),
    ) &&
    !hasOnlyOwnCallbacksToRun(
      hookInput.hook_event_name,
      e.toolUseContext?.sessionHooksRegistry ?? e.sessionHooks,
      registerAgent(e.toolUseContext, hookInput.hook_event_name, e.session.id),
      e.toolUseContext,
    )
  ) {
    yield* runFunctionHookChain(e, hookInput);
    return;
  }
  yield* runClassicHooksHoldingExit(e);
}
/**
 * 经插件函数钩子链执行经典钩子：链中每环调用经典钩子执行（输入未变时沿用扩展输入），并对结果去掉受限审批、按观察上下文过滤。
 */
//@ chunk-e6aww6q8.js:3517403-3517915 layout
async function* runFunctionHookChain(options, hookInput) {
  let extendedKey = options.extendedHookInput === void 0 ? void 0 : Rs(hookInput),
    chainLabel = `classic.${hookInput.hook_event_name} function-hook chain`;
  for await (let event of runClassicEventThroughHooks({
    event: hookInput.hook_event_name,
    hookInput: { ...hookInput },
    managedRanAbove: options.managedHooksExcluded === !0,
    signal: options.signal ?? options.toolUseContext?.abortController.signal,
    origin: options.toolUseContext?.hookOrigin,
    runClassicHooks: (y, S) =>
      runClassicHooksHoldingExit({
        ...options,
        hookInput: y,
        extendedHookInput:
          extendedKey !== void 0 && Rs(y) === extendedKey ? options.extendedHookInput : void 0,
        ...S,
        classicChainMember: !0,
      }),
  }))
    yield* keptForObservationContext(
      options,
      stripConfinedHookApproval(event, chainLabel, hookInput, options.toolUseContext),
    );
}
//@ chunk-e6aww6q8.js:3517915-3518177 layout
async function* runClassicHooksHoldingExit(e) {
  let n = () => isTerminalShutdown() && !e.signal?.aborted;
  if (!HOLD_UNTIL_EXIT_EVENTS.has(e.hookInput.hook_event_name)) {
    if (n()) return;
    yield* runClassicHooks(e);
    return;
  }
  if (n()) await heldUntilExit();
  try {
    for await (let r of runClassicHooks(e)) {
      if (n()) await heldUntilExit();
      yield r;
    }
  } catch (error) {
    if (n()) await heldUntilExit();
    throw error;
  }
  if (n()) await heldUntilExit();
}
//@ chunk-e6aww6q8.js:3518177-3518386 layout
async function* runClassicHooks(e) {
  let { hookInput: hookInput, toolUseContext: toolUseContext } = e;
  for await (let s of executeHooks_2(e)) {
    if (toolUseContext?.remoteCall !== void 0 && hookInput.hook_event_name === "PreToolUse")
      resolveHookPermissionResult(toolUseContext.remoteCall, `PreToolUse:${hookInput.tool_name}`, s);
    yield* keptForObservationContext(e, s);
  }
}
/**
 * 在代理上下文中只保留钩子结果里影响控制流的字段（权限行为、更新输入、阻止继续、改写输出等，PreToolUse 才带 blockingError），其余（如附加上下文）丢弃；非代理上下文原样 yield。
 */
//@ chunk-e6aww6q8.js:3518386-3519367 facade-exports
function* keptForObservationContext(e, n) {
  if (
    !isDelegatedObservationContext(e.agentContext) &&
    !isDelegatedObservationContext(e.toolUseContext?.agentContext)
  ) {
    yield n;
    return;
  }
  let r = e.hookInput.hook_event_name === "PreToolUse",
    s = {
      ...(n.permissionBehavior !== void 0 && { permissionBehavior: n.permissionBehavior }),
      ...(n.hookPermissionDecisionReason !== void 0 && {
        hookPermissionDecisionReason: n.hookPermissionDecisionReason,
      }),
      ...(n.heldForServedCall && { heldForServedCall: !0 }),
      ...(n.updatedInput !== void 0 && { updatedInput: n.updatedInput }),
      ...(n.preventContinuation !== void 0 && { preventContinuation: n.preventContinuation }),
      ...(n.stopReason !== void 0 && { stopReason: n.stopReason }),
      ...(n.impossible !== void 0 && { impossible: n.impossible }),
      ...(n.hookSource !== void 0 && { hookSource: n.hookSource }),
      ...(n.hookPluginId !== void 0 && { hookPluginId: n.hookPluginId }),
      ...(n.updatedToolOutput !== void 0 && { updatedToolOutput: n.updatedToolOutput }),
      ...(n.updatedMCPToolOutput !== void 0 && { updatedMCPToolOutput: n.updatedMCPToolOutput }),
      ...(r && n.blockingError !== void 0 && { blockingError: n.blockingError }),
    };
  if (Object.keys(s).length > 0) yield s;
}
/**
 * 剥掉不允许的钩子批准：受限会话、Projects 会话里的 WebFetch/WebSearch、托管桌面工具、自动模式下的高风险工具、CCR 云端浏览器调用，钩子返回的 allow 一律作废并记日志；PermissionRequest 的 updatedPermissions 会被收紧，并在 Cowork 云会话等场景丢掉 setMode。
 */
//@ chunk-e6aww6q8.js:3519367-3521232 facade-exports
function stripConfinedHookApproval(e, n, r, s) {
  let h = getToolNameField(r),
    y = settingsGrantsConfined()
      ? "a confined session takes grants only from its command line"
      : h !== void 0 && isWebToolRestrictedInRelay(h)
        ? `hooks cannot approve ${h} in a Projects session`
        : isComputerUseTool(
              "mcp_server" in r && r.mcp_server
                ? { serverName: r.mcp_server.name }
                : mcpInfoFromString(h ?? ""),
            )
          ? "hooks cannot approve a hosted session's desktop tools"
          : void 0,
    permissionRequestResult = e.permissionRequestResult;
  if (permissionRequestResult?.behavior === "allow" && permissionRequestResult.updatedPermissions) {
    let w = Mar(permissionRequestResult.updatedPermissions, s && getToolPermissionContext(s));
    if (w !== permissionRequestResult.updatedPermissions)
      (logForDebugging(
        `${n} PermissionRequest allow: changed its updates so they cannot loosen WebFetch or WebSearch rules; hooks cannot grant those tools in a Projects session`,
      ),
        (permissionRequestResult.updatedPermissions = w));
    let L = mUt(permissionRequestResult.updatedPermissions, s && getToolPermissionContext(s));
    if (L !== permissionRequestResult.updatedPermissions)
      (logForDebugging(
        `${n} PermissionRequest allow: changed its updates so they cannot loosen the rules for CCR's cloud browser; hooks cannot grant its tools`,
      ),
        (permissionRequestResult.updatedPermissions = L));
    if (
      (isCoworkAny() || Yui()) &&
      permissionRequestResult.updatedPermissions.some(
        (updatedPermission) => updatedPermission.type === "setMode",
      )
    )
      (logEvent("tengu_permission_request_set_mode_ignored", {}),
        logForDebugging(
          `${n} PermissionRequest allow: dropped its setMode. A hook's answer cannot set the mode in a Cowork cloud session or where an MCP tool is declared as code-running.`,
        ),
        (permissionRequestResult.updatedPermissions = permissionRequestResult.updatedPermissions.filter(
          (updatedPermission) => updatedPermission.type !== "setMode",
        )));
  }
  if (y === void 0 && permissionRequestResult?.behavior === "allow" && h !== void 0) {
    let w = s && findToolByName(s.options.tools, h),
      L = s && getToolPermissionContext(s);
    if (
      requiresClassifierForHookAllow(w ?? { name: h }) &&
      (L === void 0 || isAutoClassifierActive(isAutoAllowedInMode(w, L)))
    )
      (logEvent("tengu_auto_mode_permission_request_allow_ignored", {}),
        (y = `while auto mode is on (also behind plan mode) a hook cannot approve ${h}`));
    else if (isRemoteBrowserToolUnderModeFloor(w ?? { name: h }))
      y = `a hook cannot approve ${h}, a call to CCR's cloud browser`;
  }
  if (y === void 0) return e;
  if (e.permissionBehavior === "allow")
    (logForDebugging(`${n} permissionDecision=allow ignored: ${y}`), (e.permissionBehavior = void 0));
  if (e.permissionRequestResult?.behavior === "allow")
    (logForDebugging(`${n} PermissionRequest allow ignored: ${y}`), (e.permissionRequestResult = void 0));
  return e;
}
/**
 * REPL 内钩子执行主体（异步生成器）：信任检查 → getMatchingHooks → 按类型分发（callback/function/prompt/agent/http/mcp_tool/command/script），并行执行（有槽位限制），逐个产出 message、blockingError、permissionBehavior、additionalContexts、updatedInput、updatedToolOutput 等；汇总 deny>defer>ask>allow，记 tengu_run_hook/tengu_repl_hook_finished 与 OTel。
 */
//@ chunk-e6aww6q8.js:3521232-3557798 fingerprint = executeHooks (0.484)
async function* executeHooks_2({
  session: session,
  hookInput: hookInput,
  extendedHookInput: extendedHookInput,
  toolUseID: toolUseID,
  matchQuery: matchQuery,
  signal: signal,
  timeoutMs: timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  toolUseContext: toolUseContext,
  sessionHooks: sessionHooks,
  messages: messages,
  forceSyncExecution: forceSyncExecution,
  suppressPerInvocationTelemetry: suppressPerInvocationTelemetry,
  managedHooksOnly: managedHooksOnly,
  skipSessionFunctionHooks: skipSessionFunctionHooks,
  sessionFunctionHooksOnly: sessionFunctionHooksOnly,
  managedHooksExcluded: managedHooksExcluded,
  newPluginsOnly: newPluginsOnly,
  onMatched: onMatched,
  envFileSessionId: envFileSessionId,
  launcherHookEnv: launcherHookEnv,
  storageV5: storageV5,
  credentials: credentials,
  agentContext: agentContext,
}) {
  let hookEvent = hookInput.hook_event_name,
    hookDisplayName = matchQuery ? `${hookEvent}:${matchQuery}` : hookEvent,
    effectiveStorageV5 = toolUseContext?.storageV5 ?? storageV5,
    effectiveCredentials = toolUseContext?.credentials ?? credentials;
  if (shouldSkipHookDueToTrust()) {
    logForDebugging(`Skipping ${hookDisplayName} hook execution - workspace trust not accepted`);
    return;
  }
  let gt = toolUseContext ? toolUseContext.sessionHooksRegistry : sessionHooks,
    boundRequestPrompt = toolUseContext?.getAppState(),
    isServedCall = toolUseContext?.remoteCall !== void 0,
    hooksSessionId = registerAgent(toolUseContext, hookEvent, session.id),
    servedHookEnv =
      toolUseContext?.remoteCall !== void 0 &&
      collectEventHooks(gt, hooksSessionId, hookEvent, { managedHooksOnly: managedHooksOnly }).length > 0
        ? await buildServedCallHookEnv(
            toolUseContext.remoteCall,
            toolUseContext.storageV5,
            boundRequestPrompt,
          )
        : void 0,
    servedOwnSources =
      isServedCall || !isAttachServeMode() ? void 0 : await getServedSessionOwnSources(effectiveStorageV5),
    rn = getPluginHookRunner()?.owedList(hookEvent, hookInput);
  if (rn !== void 0) await awaitWithHookTimeout(rn, hookEvent, signal, timeoutMs);
  let pn = managedHooksOnly ? void 0 : getPluginHookRunner()?.whichCopyAsk?.(hookEvent, hookInput);
  if (pn !== void 0) await awaitWithHookTimeout(pn, hookEvent, signal, timeoutMs);
  let no = [],
    matchedHooksFiltered,
    matchedHooksRaw;
  try {
    ((matchedHooksRaw = await getMatchingHooks(
      gt,
      hooksSessionId,
      hookEvent,
      hookInput,
      toolUseContext?.options?.tools,
      {
        managedHooksOnly: managedHooksOnly,
        managedHooksExcluded: managedHooksExcluded,
        getToolAliases: () => boundRequestPrompt?.toolPermissionContext.toolAliases,
        suppressTelemetry: suppressPerInvocationTelemetry,
        recordMatchers: isServedCall || servedOwnSources !== void 0,
        ...(servedHookEnv !== void 0 && { ownSources: servedHookEnv.ownSources }),
        ...(servedOwnSources !== void 0 && { ownSources: servedOwnSources.ownSources }),
        ...((onMatched || newPluginsOnly) && {
          onPluginMatchersRead: (hr) => {
            no = newPluginsOnly?.owed(hr) ?? hr;
          },
        }),
      },
    )),
      (matchedHooksFiltered =
        servedOwnSources === void 0
          ? matchedHooksRaw
          : await filterWithheldFolderHooks(matchedHooksRaw, hookEvent, servedOwnSources)));
  } catch (error) {
    if (!suppressPerInvocationTelemetry) mPn(hookEvent, error);
    let mi = blockingErrorResult(
      hookEvent,
      hookDisplayName,
      hookResolutionFaultMessage(hookEvent, isServedCall ? void 0 : error),
    );
    if (mi !== void 0) {
      yield mi;
      return;
    }
    if (matchedHooksRaw !== void 0) throw error;
    matchedHooksFiltered = [];
  }
  let filtered = matchedHooksFiltered.filter((hr) => {
      let mi = !isServedCall || canRunForServedCall(hr);
      if (!mi && (hr.hook.type === "agent" || hr.hook.type === "prompt"))
        logForDebugging(`Hooks: ${hr.hook.type} hook skipped for a call served to a cloud session`);
      return mi;
    }),
    Kn = sessionFunctionHooksOnly
      ? filtered.filter((hr) => hr.hook.type === "function")
      : skipSessionFunctionHooks
        ? filtered.filter((hr) => hr.hook.type !== "function")
        : filtered,
    isStartupOrResume =
      hookInput.hook_event_name === "SessionStart" &&
      (hookInput.source === "startup" || hookInput.source === "resume"),
    mapped = (
      newPluginsOnly
        ? Kn.filter((hr) =>
            newPluginsOnly.repoHooks
              ? hr.settingsSource === "projectSettings"
              : hr.pluginName !== void 0 && no.some((mi) => mi.pluginId === hr.pluginId),
          )
        : Kn
    ).map((hr) =>
      isStartupOrResume && hr.settingsSource === "projectSettings" && hr.hook.type === "command"
        ? { ...hr, hook: { ...hr.hook, async: !0, asyncRewake: !1 } }
        : hr,
    );
  if ((onMatched?.(no, mapped.length), mapped.length === 0)) return;
  if (signal?.aborted) return;
  let hookNameForTelemetry = NPn(hookEvent, matchQuery),
    userHooks = mapped.filter((hr) => !isInternalHook(hr) || hr.notTested !== void 0);
  if (userHooks.length > 0) {
    if (!suppressPerInvocationTelemetry) {
      let pluginHookCounts = countHooksByPlugin(userHooks),
        hookTypeCounts = countByPluginKey(userHooks),
        Ha = countHooksByType(userHooks),
        $a = count(userHooks, (nr) => nr.matcherIsMatchAll);
      logEvent("tengu_run_hook", {
        hookName: hookNameForTelemetry,
        numCommands: userHooks.length,
        numMatchAllMatchers: $a,
        numSpecificMatchers: userHooks.length - $a,
        hookTypeCounts: hashEntries(Ha),
        ...(pluginHookCounts && { pluginHookCounts: hashEntries(pluginHookCounts) }),
        ...(hookTypeCounts && { pluginHookCountsByHash: hookTypeCounts }),
      });
    }
  } else {
    let batchStartTime = Date.now(),
      mi = 0,
      Ha = toolUseContext
        ? {
            getAppState: toolUseContext.getAppState,
            applyAttributionOp: toolUseContext.applyAttributionOp,
            session: toolUseContext.session,
            storageV5: toolUseContext.storageV5,
          }
        : void 0;
    for (let [nr, Ti] of mapped.entries()) {
      let { hook: hook } = Ti;
      if (hook.type !== "callback") continue;
      let callback = await hook.callback(xN(Ti, hookInput) ?? hookInput, toolUseID, signal, nr, Ha);
      if (isSyncHookJSONOutput_2(callback) || Object.keys(callback).length === 0) continue;
      let jo = processHookJSONOutput({
        json: callback,
        command: "callback",
        hookName: `${hookEvent}:Callback`,
        toolUseID: toolUseID,
        hookEvent: hookEvent,
        expectedHookEvent: hookEvent,
        stdout: void 0,
        stderr: void 0,
        exitCode: void 0,
      });
      if (jo.permissionBehavior === "deny")
        (mi++,
          logForDebugging(
            `Hook ${hookEvent} (${getHookStatusText(hook)}) returned permissionDecision: deny${jo.hookPermissionDecisionReason ? ` (reason: ${jo.hookPermissionDecisionReason})` : ""}`,
          ),
          yield {
            permissionBehavior: "deny",
            hookPermissionDecisionReason: jo.hookPermissionDecisionReason,
            hookSource: Ti.hookSource,
          });
      if (jo.additionalContext)
        yield {
          additionalContexts: [
            await persistLargeHookOutput(jo.additionalContext, `${toolUseID}-${nr}`, "additionalContext", {
              storageV5: effectiveStorageV5,
            }),
          ],
        };
      if (jo.systemMessage)
        yield {
          message: createAttachmentMessage_2({
            type: "hook_system_message",
            content: await persistLargeHookOutput(jo.systemMessage, `${toolUseID}-${nr}`, "systemMessage", {
              storageV5: effectiveStorageV5,
            }),
            hookName: hookDisplayName,
            toolUseID: toolUseID,
            hookEvent: hookEvent,
          }),
        };
    }
    let $a = Date.now() - batchStartTime;
    (getStatsStore()?.observe("hook_duration_ms", $a),
      logEvent("tengu_repl_hook_finished", {
        hookName: hookNameForTelemetry,
        numCommands: mapped.length,
        numSuccess: mapped.length - mi,
        numBlocking: mi,
        numNonBlockingError: 0,
        numCancelled: 0,
        totalDurationMs: $a,
      }));
    return;
  }
  let vn = isBetaTracingEnabled() && isToolDetailsLoggingEnabled(),
    hookDefinitionsJson =
      vn || isPerfettoTracingEnabled() ? jsonStringify(getHookDefinitionsForTelemetry(mapped)) : "[]",
    So = getHookNameForTelemetry(hookEvent, matchQuery),
    ko = toolUseContext?.agentContext ?? agentContext ?? mainAgentContext();
  if (!suppressPerInvocationTelemetry)
    logOTelEvent(
      "hook_execution_start",
      {
        hook_event: hookEvent,
        hook_name: So,
        num_hooks: String(mapped.length),
        managed_only: String(shouldAllowManagedHooksOnlyByPolicy()),
        hook_source: shouldAllowManagedHooksOnlyByPolicy() ? "policySettings" : "merged",
        safe_mode: String(isSafeMode()),
        ...(vn && { hook_definitions: hookDefinitionsJson }),
      },
      ko,
    );
  let un = suppressPerInvocationTelemetry
      ? void 0
      : startHookSpan(hookEvent, So, mapped.length, hookDefinitionsJson, ko),
    ao = new Map(userHooks.map((hr, mi) => [hr.hook, mi]));
  using $o = suppressPerInvocationTelemetry
    ? void 0
    : trackRunningHooks({
        hookEvent: hookEvent,
        hooks: userHooks.map(({ hook: hook }) => getHookProgressDisplay(hook)),
        agentId: toolUseContext?.agentId,
        toolName: getToolNameField(hookInput),
      });
  for (let { hook: hook } of userHooks)
    yield {
      message: {
        type: "progress",
        data: {
          type: "hook_progress",
          hookEvent: hookEvent,
          hookName: hookDisplayName,
          command: getHookStatusText(hook),
          ...(hook.type === "prompt" && { promptText: Mu(hook.prompt) }),
          ...("statusMessage" in hook &&
            hook.statusMessage != null && { statusMessage: Mu(hook.statusMessage) }),
        },
        parentToolUseID: toolUseID,
        toolUseID: toolUseID,
        timestamp: new Date().toISOString(),
        uuid: randomUUID_11(),
      },
    };
  let batchStartTime = Date.now(),
    Ho = {},
    rr = {},
    inputFailureReason;
  function stringifyHookInputCached(hr, mi = !1, Ha, $a) {
    let nr = Ha === void 0 ? Ho : rr,
      Ti = $a !== void 0 ? "asBash" : mi ? "elsewhere" : "base",
      Vs = nr[Ti];
    if (Vs !== void 0) return Vs;
    let _i = !1,
      jo;
    try {
      let Qr = $a ?? ((mi && resolveOwnToolHookInput(hookInput)?.hookInput) || hookInput),
        fi = Ha && writeRemoteHookInput(Ha, Qr),
        Ri = fi ?? jsonStringify(Qr);
      if (((_i = fPn(hookEvent, Ri)), _i)) throw RangeError("Hook input is over the size limit");
      jo = { ok: !0, value: Ri, sent: fi };
    } catch (error) {
      ((inputFailureReason = _i ? "hook_input_too_large" : "hook_input_stringify_failed"),
        logError(
          withTelemetryMessage(
            Error(`Failed to stringify hook ${hookDisplayName} input`, { cause: error }),
            "Failed to stringify hook input",
          ),
        ),
        (jo = { ok: !1, error: error }));
    }
    return ((nr[Ti] = jo), jo);
  }
  function getHookInputJson(hr, mi) {
    if (isCcsTenant() && kmi(hr.hook)) return { ok: !0, value: "", sent: void 0 };
    let Ha = getHookOriginLabel(hr) !== void 0 && hr.hook.type === "prompt",
      $a = xN(hr, hookInput),
      nr = stringifyHookInputCached(
        hr.pluginId,
        hr.asOwnTool,
        mi || Ha ? getPluginHookRunner()?.stdin : void 0,
        $a,
      );
    if (Ha && nr.ok && nr.sent === void 0)
      return ((inputFailureReason = "hook_input_stringify_failed"), { ok: !1, error: Error("not written") });
    return nr;
  }
  let controlStreamClosedError,
    _r = new Set(),
    notRunHooks = new Set(),
    hadSchemaInvalidOutput = !1,
    hadSchemaInvalidBlock = !1,
    hookPromises = mapped.map((hr) => Hge(getHookOriginLabel(hr), hookEvent, hr.hook)),
    mapped_2 = mapped.map(async function* (
      {
        hook: hook,
        pluginRoot: pluginRoot,
        pluginId: pluginId,
        skillRoot: skillRoot,
        settingsSource: settingsSource,
        matcherTexts: matcherTexts,
        sdkHost: sdkHost,
        asOwnTool: asOwnTool,
        notTested: notTested,
      },
      hookIndex,
    ) {
      let fi = getHookOriginLabel({ pluginId: pluginId, settingsSource: settingsSource }),
        Ri = hookPromises[hookIndex] ?? Hge(fi, hookEvent, hook),
        Ja = Ri ?? notTested;
      if (Ja !== void 0) {
        (notRunHooks.add(hook),
          yield {
            ...describeKillSwitchedHook(
              hookEvent,
              hookDisplayName,
              Ja,
              pluginId,
              blocksWhenItCannotRunElsewhere(hookEvent) &&
                (Ri !== void 0 ||
                  !(
                    hook.type === "command" &&
                    isAsyncHookJSONOutput(hook, forceSyncExecution === !0 || isServedCall)
                  )),
            ),
            hook: hook,
          });
        return;
      }
      let Di = hookIndex + (newPluginsOnly?.envFileIndexBase ?? 0),
        yr = isPersonalRestrictedHook(mapped[hookIndex], hookEvent);
      if (pluginId) recordPluginActivity(pluginId, "hook", { kind: "hook", name: hookEvent });
      if (isServedCall && (hook.type === "agent" || hook.type === "prompt")) {
        yield holdModelHookForServedCall(hook, hookEvent);
        return;
      }
      let Kr;
      if (
        isServedCall &&
        (hook.type === "command" ||
          hook.type === "http" ||
          hook.type === "mcp_tool" ||
          hook.type === "script")
      ) {
        let ol = await judgeHookForServedCall(
          {
            hook: hook,
            pluginRoot: pluginRoot,
            pluginId: pluginId,
            skillRoot: skillRoot,
            matcherTexts: matcherTexts,
          },
          hookEvent,
          servedHookEnv,
        ).catch(
          (gd) => (
            logForDebugging(
              `Hooks: could not judge a hook for a served call (${errorMessage(gd)}); holding it`,
            ),
            { held: "unreadable" }
          ),
        );
        if (ol.held !== void 0) {
          let gd = toolUseContext?.remoteCall,
            Su;
          yield (hook.type === "command" && hookEvent === "PreToolUse" && gd !== void 0
            ? await pinHookCommand({
                hook: hook,
                held: ol.held,
                fromSettingsFile: pluginRoot === void 0 && skillRoot === void 0,
                matcherTexts: matcherTexts ?? [],
                reach: gd.reach,
                readableDirs: [
                  ...toolUseContext.getAppState().toolPermissionContext.additionalWorkingDirectories.keys(),
                ],
                readRules: toolUseContext.getAppState().toolPermissionContext,
                environment: servedHookEnv.env,
                home: servedHookEnv.home,
                shellPrefix: servedHookEnv.shellPrefix,
                signal: signal,
                onOutcome: gd.onProjectHook,
                onUnavailable: (Uc) => {
                  Su = Uc;
                },
                exec: async (Uc) => {
                  let Kc = stringifyHookInputCached(pluginId, !1, void 0, xN(mapped[hookIndex], hookInput));
                  if (!Kc.ok) throw Kc.error;
                  let _s = await execCommandHook(
                      Uc.hook,
                      hookEvent,
                      hookDisplayName,
                      Kc.value,
                      void 0,
                      claudeEnvContextFrom(hookInput),
                      xo(session),
                      Uc.cwd,
                      Uc.signal,
                      randomUUID_11(),
                      Di,
                      void 0,
                      void 0,
                      void 0,
                      void 0,
                      !0,
                      void 0,
                      { base: Uc.base, omit: [], shellPrefix: void 0 },
                      void 0,
                      void 0,
                      effectiveStorageV5,
                      effectiveCredentials,
                      Uc.wrap,
                    ),
                    Qm = parseHookOutput(_s.stdout),
                    wr = getUntrustedCaptureReason(
                      _s,
                      hookEvent,
                      _s.stdout,
                      Qm.json,
                      (zs) => parseHookOutput(zs).json,
                    );
                  return { ..._s, parsed: wr !== void 0 ? { validationError: wr } : Qm };
                },
              }).catch((Uc) => {
                logForDebugging(
                  `Hooks: could not run a project hook in the sandbox for a served call (${errorMessage(Uc)}); holding it`,
                );
                return;
              })
            : void 0) ?? holdHookForServedCall(hook, hookEvent, ol.held, ol.cause, Su);
          return;
        }
        if (
          ((Kr = ol.program),
          pluginRoot === void 0 &&
            skillRoot === void 0 &&
            !isNotFromOwnSettings(hook, hookEvent, matcherTexts ?? [], servedHookEnv.ownSources))
        )
          _r.add(hook);
      }
      if (hook.type === "callback") {
        let ol = hook.timeout ? hook.timeout * 1000 : timeoutMs,
          { signal: abortSignal, cleanup: cleanup } = createCombinedAbortSignal(signal, { timeoutMs: ol });
        try {
          yield await executeHookCallback({
            toolUseID: toolUseID,
            hook: hook,
            hookEvent: hookEvent,
            hookInput: xN(mapped[hookIndex], hookInput) ?? hookInput,
            signal: abortSignal,
            hookIndex: Di,
            toolUseContext: toolUseContext,
          }).finally(cleanup);
        } catch (error) {
          if (error instanceof StreamClosedAbortError) {
            ((controlStreamClosedError = error),
              logForDebugging(
                `${hookEvent} SDK callback hook cancelled (control stream closed); draining sibling hooks`,
              ),
              yield { outcome: "cancelled", hook: hook });
            return;
          }
          let Uc = abortSignal.aborted && !signal?.aborted;
          if (
            Uc &&
            sdkHost === !0 &&
            (hookEvent === "Stop" || hookEvent === "SubagentStop" || hookEvent === "SessionStart")
          ) {
            (logForDebugging(
              `SDK host ${hookEvent} callback hook timed out after ${ol}ms; continuing without its answer`,
            ),
              logEvent("tengu_sdk_hook_callback_timeout", { hookEvent: fromEnum(hookEvent) }));
            let Kc =
              hookEvent === "SubagentStop" ||
              [agentContext, toolUseContext?.agentContext].some(
                (_s) =>
                  _s !== void 0 &&
                  _s.agentType !== "main" &&
                  !(isSubagentContext(_s) && _s.isMainSession === !0),
              );
            yield {
              outcome: "cancelled",
              hook: hook,
              ...(!Kc &&
                takeSdkHostOutOfReachNote() && {
                  message: createAttachmentMessage_2({
                    type: "hook_system_message",
                    content: hostNoResponseMessage(hookEvent),
                    hookName: hookDisplayName,
                    toolUseID: toolUseID,
                    hookEvent: hookEvent,
                  }),
                }),
            };
            return;
          }
          if ((hookEvent !== "UserPromptSubmit" && hookEvent !== "UserPromptExpansion") || !Uc) throw error;
          (logForDebugging(
            `${hookDisplayName} callback hook timed out; swallowed rejection: ${errorMessage(error)}`,
          ),
            logEvent("tengu_sdk_hook_callback_timeout", { hookEvent: fromEnum(hookEvent) }),
            yield {
              blockingError: {
                blockingError: `${hookDisplayName} hook callback timed out after ${ol}ms`,
                command: getHookDisplayText(hook),
                ...promptEndingFields(hookEvent, { noVerdict: "callback_timed_out" }),
              },
              suppressOriginalPrompt: !0,
              outcome: "blocking",
              hook: hook,
            });
        }
        return;
      }
      if (hook.type === "function") {
        if (!messages) {
          yield {
            message: createAttachmentMessage_2({
              type: "hook_error_during_execution",
              hookName: hookDisplayName,
              toolUseID: toolUseID,
              hookEvent: hookEvent,
              content: "Messages not provided for function hook",
            }),
            outcome: "non_blocking_error",
            hook: hook,
          };
          return;
        }
        yield executeFunctionHook({
          hook: hook,
          messages: messages,
          hookName: hookDisplayName,
          toolUseID: toolUseID,
          hookEvent: hookEvent,
          timeoutMs: timeoutMs,
          signal: signal,
        });
        return;
      }
      let Li = getPluginHookRunner(),
        Qs = hook.type === "command" && fi !== void 0 && Li !== void 0;
      if (Qs)
        await Li.ready(
          hookEvent,
          signal,
          isAsyncHookJSONOutput(hook, forceSyncExecution === !0 || isServedCall),
        );
      let hookTimeoutMs = hook.timeout
          ? Math.min(wU(hook) ? aO(hook, timeoutMs) : hook.timeout * 1000, ec)
          : timeoutMs,
        Xa = Qs && !isAsyncHookJSONOutput(hook),
        { signal: abortSignal, cleanup: cleanup } = createCombinedAbortSignal(signal, {
          timeoutMs: Xa ? void 0 : hookTimeoutMs,
        });
      if (abortSignal.aborted && wU(hook)) {
        yield { outcome: "cancelled", hook: hook };
        return;
      }
      let hookId = randomUUID_11(),
        hookStartMs = Date.now(),
        hookCommand = getHookStatusText(hook),
        ga = pluginRoot ?? skillRoot,
        Hl = getHookDisplayText(hook),
        displayCommand =
          ga && (hook.type === "command" || (hook.type === "script" && hook.file !== void 0))
            ? Hl.replace(
                hook.type === "command" && hook.args === void 0
                  ? /\$\{CLAUDE_PLUGIN_ROOT\}|\$CLAUDE_PLUGIN_ROOT\b/g
                  : /\$\{CLAUDE_PLUGIN_ROOT\}/g,
                () => ga,
              )
            : Hl,
        pluginNote =
          pluginId && !isServedCall
            ? `
This hook comes from the ${pluginId} plugin.`
            : "",
        Ld = !1,
        vs = !1;
      try {
        let ol = getHookInputJson(mapped[hookIndex], Qs);
        if (!ol.ok) {
          cleanup();
          let al = isServedCall ? `${hook.type} hook` : displayCommand,
            mf = blockingErrorResult(
              hookEvent,
              al,
              `[${al}]: ${unserializableInputBlockMessage(isServedCall ? void 0 : ol.error)}${pluginNote}`,
            );
          yield mf !== void 0
            ? { ...mf, outcome: "blocking", hook: hook }
            : (guardScriptHookBlock(
                hook,
                hookEvent,
                isServedCall ? "script hook" : displayCommand,
                isServedCall ? "hook input could not be prepared" : `hook input: ${errorMessage(ol.error)}`,
              ) ?? {
                message: createAttachmentMessage_2({
                  type: "hook_error_during_execution",
                  hookName: hookDisplayName,
                  toolUseID: toolUseID,
                  hookEvent: hookEvent,
                  content: `Failed to prepare hook input: ${errorMessage(ol.error)}`,
                  command: hookCommand,
                  durationMs: Date.now() - hookStartMs,
                }),
                outcome: "non_blocking_error",
                hook: hook,
              });
          return;
        }
        let jsonInput = ol.value;
        if (hook.type === "prompt") {
          if (!toolUseContext)
            throw Error(
              `prompt-type hooks are not supported for ${hookEvent} events (no conversation context is available). Use a command-type hook instead.`,
            );
          if (toolUseContext.agentId?.startsWith(HOOK_AGENT_ID_PREFIX)) {
            (cleanup(),
              yield {
                message: createAttachmentMessage_2({
                  type: "hook_cancelled",
                  hookName: hookDisplayName,
                  toolUseID: toolUseID,
                  hookEvent: hookEvent,
                }),
                outcome: "cancelled",
                hook: hook,
              });
            return;
          }
          let al = await execPromptHook(
            hook,
            hookDisplayName,
            hookEvent,
            jsonInput,
            abortSignal,
            toolUseContext,
            messages,
            toolUseID,
            hookTimeoutMs,
          );
          if (al.message?.type === "attachment") {
            let attachment = al.message.attachment;
            if (attachment.type === "hook_success" || attachment.type === "hook_non_blocking_error")
              ((attachment.command = hookCommand), (attachment.durationMs = Date.now() - hookStartMs));
          }
          (yield al, cleanup?.());
          return;
        }
        if (hook.type === "agent") {
          if (hookEvent === "PermissionRequest")
            throw Error(
              "agent-type hooks are not supported for PermissionRequest events (an agent hook answers ok or not ok, and cannot return the allow / deny decision a permission request needs). Use a command- or http-type hook instead.",
            );
          if (!toolUseContext)
            throw Error(
              `agent-type hooks are not supported for ${hookEvent} events (no conversation context is available). Use a command-type hook instead.`,
            );
          if (toolUseContext.agentId?.startsWith(HOOK_AGENT_ID_PREFIX)) {
            (cleanup(),
              yield {
                message: createAttachmentMessage_2({
                  type: "hook_cancelled",
                  hookName: hookDisplayName,
                  toolUseID: toolUseID,
                  hookEvent: hookEvent,
                }),
                outcome: "cancelled",
                hook: hook,
              });
            return;
          }
          let promptResult = await execAgentHook(
            hook,
            hookDisplayName,
            hookEvent,
            jsonInput,
            abortSignal,
            toolUseContext,
            toolUseID,
            "agent_type" in hookInput ? hookInput.agent_type : void 0,
          );
          if (promptResult.message?.type === "attachment") {
            let att = promptResult.message.attachment;
            if (att.type === "hook_success" || att.type === "hook_non_blocking_error")
              ((att.command = hookCommand), (att.durationMs = Date.now() - hookStartMs));
          }
          (yield promptResult, cleanup?.());
          return;
        }
        if (hook.type === "http") {
          emitHookStarted(hookId, hookDisplayName, hookEvent);
          let al = await execHttpHook(
            hook,
            hookEvent,
            jsonInput,
            signal,
            timeoutMs,
            servedHookEnv && pjt(servedHookEnv.env),
            servedHookEnv ? void 0 : getManagedHttpHookEnv(hook),
          );
          if ((cleanup?.(), al.aborted)) {
            (emitHookResponse({
              hookId: hookId,
              hookName: hookDisplayName,
              hookEvent: hookEvent,
              output: "Hook cancelled",
              stdout: "",
              stderr: "",
              exitCode: void 0,
              outcome: "cancelled",
            }),
              yield {
                message: createAttachmentMessage_2({
                  type: "hook_cancelled",
                  hookName: hookDisplayName,
                  toolUseID: toolUseID,
                  hookEvent: hookEvent,
                  command: hookCommand,
                  timedOut: !signal?.aborted,
                  timeoutMs: hook.timeout ? hook.timeout * 1000 : timeoutMs,
                }),
                outcome: "cancelled",
                hook: hook,
              });
            return;
          }
          let mf = al.withheld === !0 && isDiskless();
          if (mf && hookEvent === "PermissionRequest") {
            (emitHookResponse({
              hookId: hookId,
              hookName: hookDisplayName,
              hookEvent: hookEvent,
              output: al.error ?? "",
              stdout: "",
              stderr: al.error ?? "",
              exitCode: void 0,
              outcome: "error",
            }),
              yield denyPermissionRequestHookInCloud(hook));
            return;
          }
          if (mf && hookEvent === "PreToolUse") {
            (emitHookResponse({
              hookId: hookId,
              hookName: hookDisplayName,
              hookEvent: hookEvent,
              output:
                "The PreToolUse HTTP hook can't run in this cloud session, so this tool call is refused.",
              stdout: "",
              stderr:
                al.error ??
                "The PreToolUse HTTP hook can't run in this cloud session, so this tool call is refused.",
              exitCode: 2,
              outcome: "error",
            }),
              yield {
                blockingError: {
                  blockingError:
                    "The PreToolUse HTTP hook can't run in this cloud session, so this tool call is refused.",
                  command: displayCommand,
                },
                outcome: "blocking",
                hook: hook,
              });
            return;
          }
          if (isWithheldGuardHttpHook(al, hookEvent)) {
            let Kf = httpHookUnreachableMessage(hookEvent, al.error);
            (emitHookResponse({
              hookId: hookId,
              hookName: hookDisplayName,
              hookEvent: hookEvent,
              output: Kf,
              stdout: "",
              stderr: Kf,
              exitCode: 2,
              outcome: "error",
            }),
              yield {
                blockingError: { blockingError: Kf, command: hook.url },
                suppressOriginalPrompt: !0,
                ...(hookEvent === "PermissionRequest" && {
                  permissionRequestResult: { behavior: "deny", message: Kf },
                }),
                outcome: "blocking",
                hook: hook,
              });
            return;
          }
          if (al.error || !al.ok) {
            let Kf = al.error || `HTTP ${al.statusCode} from ${hook.url}`;
            (emitHookResponse({
              hookId: hookId,
              hookName: hookDisplayName,
              hookEvent: hookEvent,
              output: Kf,
              stdout: "",
              stderr: Kf,
              exitCode: al.statusCode,
              outcome: "error",
            }),
              yield {
                message: createAttachmentMessage_2({
                  type: "hook_non_blocking_error",
                  hookName: hookDisplayName,
                  toolUseID: toolUseID,
                  hookEvent: hookEvent,
                  stderr: Kf,
                  stdout: "",
                  exitCode: al.statusCode ?? 0,
                }),
                outcome: "non_blocking_error",
                hook: hook,
              });
            return;
          }
          let { json: json, validationError: validationError } = parseHttpHookOutput(al.body);
          if (validationError) {
            ((hadSchemaInvalidOutput = !0),
              emitHookResponse({
                hookId: hookId,
                hookName: hookDisplayName,
                hookEvent: hookEvent,
                output: al.body,
                stdout: al.body,
                stderr: validationError,
                exitCode: al.statusCode,
                outcome: "error",
              }),
              yield {
                message: createAttachmentMessage_2({
                  type: "hook_non_blocking_error",
                  hookName: hookDisplayName,
                  toolUseID: toolUseID,
                  hookEvent: hookEvent,
                  stderr: validationError,
                  stdout: al.body,
                  exitCode: al.statusCode ?? 0,
                }),
                outcome: "non_blocking_error",
                hook: hook,
              });
            return;
          }
          if (json && isSyncHookJSONOutput_2(json)) {
            (emitHookResponse({
              hookId: hookId,
              hookName: hookDisplayName,
              hookEvent: hookEvent,
              output: al.body,
              stdout: al.body,
              stderr: "",
              exitCode: al.statusCode,
              outcome: "success",
            }),
              yield { outcome: "success", hook: hook });
            return;
          }
          if (json) {
            let Kf = processHookJSONOutput({
              json: yr
                ? restrictPersonalHookAnswer(json, xN(mapped[hookIndex], hookInput) ?? hookInput)
                : json,
              command: hook.url,
              hookName: hookDisplayName,
              toolUseID: toolUseID,
              hookEvent: hookEvent,
              expectedHookEvent: hookEvent,
              stdout: al.body,
              stderr: "",
              exitCode: al.statusCode,
            });
            (emitHookMetrics(json.metrics, pluginId, hookEvent, ko),
              emitHookResponse({
                hookId: hookId,
                hookName: hookDisplayName,
                hookEvent: hookEvent,
                output: al.body,
                stdout: al.body,
                stderr: "",
                exitCode: al.statusCode,
                outcome: "success",
              }),
              yield { ...Kf, outcome: "success", hook: hook });
            return;
          }
          return;
        }
        if (hook.type === "mcp_tool") {
          emitHookStarted(hookId, hookDisplayName, hookEvent);
          let al = await runMcpToolHook(
            hook,
            hookEvent,
            xN(mapped[hookIndex], hookInput) ?? hookInput,
            isServedCall ? void 0 : toolUseContext?.options.mcpClients,
            signal,
            timeoutMs,
            isServedCall || toolUseContext === void 0 ? void 0 : WZn(toolUseContext.session.host),
          );
          cleanup?.();
          let mf =
            isServedCall && hookEvent === "PreToolUse"
              ? al.aborted
                ? signal?.aborted
                  ? void 0
                  : "timed out"
                : al.error !== void 0 && al.body === ""
                  ? "could not be run"
                  : !al.ok
                    ? "returned an error"
                    : void 0
              : void 0;
          if (mf !== void 0) {
            let Kf = `a PreToolUse mcp_tool hook ${mf}, so this call was not run`;
            (logForDebugging(
              `Hooks: served-call mcp_tool gate (${hook.server}/${hook.tool}) refused (${mf})${al.error ? ` \u2014 ${al.error}` : ""}`,
              { level: "warn" },
            ),
              emitHookResponse({
                hookId: hookId,
                hookName: hookDisplayName,
                hookEvent: hookEvent,
                output: Kf,
                stdout: al.body,
                stderr: al.error || Kf,
                exitCode: 2,
                outcome: "error",
              }),
              yield {
                blockingError: { blockingError: Kf, command: displayCommand },
                outcome: "blocking",
                hook: hook,
              });
            return;
          }
          if (al.withheld && hookEvent === "PermissionRequest" && isDiskless()) {
            (emitHookResponse({
              hookId: hookId,
              hookName: hookDisplayName,
              hookEvent: hookEvent,
              output: al.error ?? "",
              stdout: "",
              stderr: al.error ?? "",
              exitCode: void 0,
              outcome: "error",
            }),
              yield denyPermissionRequestHookInCloud(hook));
            return;
          }
          if (al.withheld && hookEvent === "PreToolUse") {
            let Kf = `a PreToolUse mcp_tool hook could not run (${al.error}); refusing rather than skipping that gate`;
            (emitHookResponse({
              hookId: hookId,
              hookName: hookDisplayName,
              hookEvent: hookEvent,
              output: Kf,
              stdout: "",
              stderr: al.error ?? Kf,
              exitCode: 2,
              outcome: "error",
            }),
              yield {
                blockingError: { blockingError: Kf, command: displayCommand },
                outcome: "blocking",
                hook: hook,
              });
            return;
          }
          if (al.aborted) {
            (emitHookResponse({
              hookId: hookId,
              hookName: hookDisplayName,
              hookEvent: hookEvent,
              output: "Hook cancelled",
              stdout: "",
              stderr: "",
              exitCode: void 0,
              outcome: "cancelled",
            }),
              yield {
                message: createAttachmentMessage_2({
                  type: "hook_cancelled",
                  hookName: hookDisplayName,
                  toolUseID: toolUseID,
                  hookEvent: hookEvent,
                  command: hookCommand,
                  timedOut: !signal?.aborted,
                  timeoutMs: hook.timeout ? hook.timeout * 1000 : timeoutMs,
                }),
                outcome: "cancelled",
                hook: hook,
              });
            return;
          }
          if (al.error || !al.ok) {
            let Kf = al.error || "MCP tool returned an error";
            (emitHookResponse({
              hookId: hookId,
              hookName: hookDisplayName,
              hookEvent: hookEvent,
              output: Kf,
              stdout: al.body,
              stderr: Kf,
              exitCode: 1,
              outcome: "error",
            }),
              yield {
                message: createAttachmentMessage_2({
                  type: "hook_non_blocking_error",
                  hookName: hookDisplayName,
                  toolUseID: toolUseID,
                  hookEvent: hookEvent,
                  stderr: Kf,
                  stdout: al.body,
                  exitCode: 1,
                }),
                outcome: "non_blocking_error",
                hook: hook,
              });
            return;
          }
          let { json: httpJson, validationError: httpValidationError } = parseHookOutput(al.body);
          if (httpValidationError) {
            ((hadSchemaInvalidOutput = !0),
              emitHookResponse({
                hookId: hookId,
                hookName: hookDisplayName,
                hookEvent: hookEvent,
                output: al.body,
                stdout: al.body,
                stderr: httpValidationError,
                exitCode: 1,
                outcome: "error",
              }),
              yield {
                message: createAttachmentMessage_2({
                  type: "hook_non_blocking_error",
                  hookName: hookDisplayName,
                  toolUseID: toolUseID,
                  hookEvent: hookEvent,
                  stderr: httpValidationError,
                  stdout: al.body,
                  exitCode: 1,
                }),
                outcome: "non_blocking_error",
                hook: hook,
              });
            return;
          }
          if (
            (emitHookResponse({
              hookId: hookId,
              hookName: hookDisplayName,
              hookEvent: hookEvent,
              output: al.body,
              stdout: al.body,
              stderr: "",
              exitCode: 0,
              outcome: "success",
            }),
            httpJson && isSyncHookJSONOutput(httpJson))
          ) {
            let processed = processHookJSONOutput({
              json: yr
                ? restrictPersonalHookAnswer(httpJson, xN(mapped[hookIndex], hookInput) ?? hookInput)
                : httpJson,
              command: hookCommand,
              hookName: hookDisplayName,
              toolUseID: toolUseID,
              hookEvent: hookEvent,
              expectedHookEvent: hookEvent,
              stdout: al.body,
              stderr: "",
              exitCode: 0,
            });
            (emitHookMetrics(httpJson.metrics, pluginId, hookEvent, ko),
              yield { ...processed, outcome: "success", hook: hook });
            return;
          }
          yield {
            message: createAttachmentMessage_2({
              type: "hook_success",
              hookName: hookDisplayName,
              toolUseID: toolUseID,
              hookEvent: hookEvent,
              content: `${sequential.bold(hookDisplayName)} completed`,
              stdout: al.body,
              stderr: "",
              command: hookCommand,
              durationMs: Date.now() - hookStartMs,
            }),
            outcome: "success",
            hook: hook,
          };
          return;
        }
        let Su = servedHookEnv?.env,
          Eu = hook.type === "script" ? resolveScriptHook(hook, hookEvent) : { hook: hook, env: void 0 },
          Uc = Kr === void 0 ? Eu.hook : { ...Eu.hook, command: Kr },
          Kc =
            launcherHookEnv !== void 0 &&
            servedHookEnv === void 0 &&
            pluginRoot === void 0 &&
            skillRoot === void 0 &&
            isFlagSettingsSyncHook(hook, hookEvent);
        emitHookStarted(hookId, hookDisplayName, hookEvent);
        let _s = await execCommandHook(
            Xa ? zWe(Uc, { ...Uc, timeout: hookTimeoutMs / 1000 }) : Uc,
            hookEvent,
            hookDisplayName,
            jsonInput,
            ol.sent,
            { ...claudeEnvContextFrom(hookInput), envFileSessionId: envFileSessionId },
            getHookProject(session),
            servedHookEnv?.spawnCwd ??
              (hook.type === "script"
                ? (getHookProject(session)?.projectRoot ?? hookInput.cwd)
                : hookInput.cwd),
            abortSignal,
            hookId,
            Di,
            pluginRoot,
            pluginId,
            settingsSource,
            skillRoot,
            forceSyncExecution || isServedCall || hook.type === "script" || E1e(hook, hookEvent) || Kc,
            Kc ? launcherHookEnv : Eu.env === void 0 ? Su?.extra : { ...Su?.extra, ...Eu.env },
            servedHookEnv === void 0
              ? void 0
              : {
                  base: servedHookEnv.env.base,
                  omit: servedHookEnv.env.omit,
                  shellPrefix: servedHookEnv.shellPrefix,
                  spawnCwd: servedHookEnv.spawnCwd,
                },
            { ...W1e(hookInput, toolUseContext?.options.tools), toolUseID: toolUseID },
            n6e(hook),
            effectiveStorageV5,
            effectiveCredentials,
          ),
          Qm = signal?.aborted === !0 && _s.stoppedAfterItsTimeout !== !0;
        ((Ld = hook.type !== "script" || didScriptHookRun(_s) || (_s.aborted === !0 && Qm)),
          (vs = _s.status === 2 && !_s.backgrounded),
          cleanup?.());
        let wr = Date.now() - hookStartMs,
          zs = _s.aborted
            ? Qm
              ? "cancelled"
              : `timed out after ${hookTimeoutMs}ms`
            : _s.backgrounded
              ? "moved to the background"
              : _s.withheld
                ? "not run"
                : _s.spawnFailed
                  ? "failed to start"
                  : `finished with status ${_s.status}`;
        if (
          (logForDebugging(
            `Hooks: ${hookDisplayName} [${displayCommand}]${pluginId ? ` (plugin ${pluginId})` : ""} ${zs} (${wr}ms)`,
          ),
          _s.withheld === !0 && hookEvent === "PermissionRequest")
        ) {
          (emitHookResponse({
            hookId: hookId,
            hookName: hookDisplayName,
            hookEvent: hookEvent,
            output: _s.output,
            stdout: "",
            stderr: _s.stderr,
            exitCode: _s.status,
            outcome: "error",
          }),
            yield denyPermissionRequestHookInCloud(hook));
          return;
        }
        let li = Ld
          ? void 0
          : guardScriptHookBlock(
              hook,
              hookEvent,
              isServedCall ? "script hook" : displayCommand,
              isServedCall || _s.stderr.trim() === ""
                ? describeHookDidNotRun(_s)
                : `${describeHookDidNotRun(_s)}: ${_s.stderr.trim()}`,
            );
        if (li !== void 0) {
          (emitHookResponse({
            hookId: hookId,
            hookName: hookDisplayName,
            hookEvent: hookEvent,
            output: _s.output,
            stdout: _s.stdout,
            stderr: _s.stderr,
            exitCode: _s.status,
            outcome: "error",
          }),
            yield li);
          return;
        }
        if (!Ld && !_s.aborted) {
          (emitHookResponse({
            hookId: hookId,
            hookName: hookDisplayName,
            hookEvent: hookEvent,
            output: _s.output,
            stdout: _s.stdout,
            stderr: _s.stderr,
            exitCode: _s.status,
            outcome: "error",
          }),
            yield {
              message: createAttachmentMessage_2({
                type: "hook_non_blocking_error",
                hookName: hookDisplayName,
                toolUseID: toolUseID,
                hookEvent: hookEvent,
                stderr: `script hook did not run (${describeHookDidNotRun(_s)})${_s.stderr.trim() ? `: ${_s.stderr.trim()}` : ""}`,
                stdout: _s.stdout,
                exitCode: _s.status,
                command: hookCommand,
                durationMs: wr,
              }),
              outcome: "non_blocking_error",
              hook: hook,
            });
          return;
        }
        if (_s.backgrounded) {
          yield { outcome: "success", hook: hook };
          return;
        }
        if (_s.aborted) {
          (emitHookResponse({
            hookId: hookId,
            hookName: hookDisplayName,
            hookEvent: hookEvent,
            output: _s.output,
            stdout: _s.stdout,
            stderr: _s.stderr,
            exitCode: _s.status,
            outcome: "cancelled",
          }),
            yield {
              message: createAttachmentMessage_2({
                type: "hook_cancelled",
                hookName: hookDisplayName,
                toolUseID: toolUseID,
                hookEvent: hookEvent,
                command: hookCommand,
                durationMs: wr,
                timedOut: !Qm,
                timeoutMs: hookTimeoutMs,
              }),
              outcome: "cancelled",
              hook: hook,
              ...(_s.stoppedAfterItsTimeout && { stoppedAfterItsTimeout: !0 }),
            });
          return;
        }
        let nl = getHookStdoutForParsing(_s),
          { json: json, plainText: plainText, validationError: validationError } = parseHookOutput(nl),
          capturedJson = dropSuspectCaptureJson(_s, hookEvent, json),
          distrustReason = getUntrustedCaptureReason(
            _s,
            hookEvent,
            nl,
            capturedJson,
            (al) => parseHookOutput(al).json,
          );
        if (distrustReason !== void 0) {
          let al = withHookStderr(distrustReason, _s.status, _s.stderr);
          if (
            (emitHookResponse({
              hookId: hookId,
              hookName: hookDisplayName,
              hookEvent: hookEvent,
              output: _s.output,
              stdout: _s.stdout,
              stderr: al,
              exitCode: _s.status,
              outcome: "error",
            }),
            PROMPT_GUARD_EVENTS.has(hookEvent))
          ) {
            yield {
              blockingError: {
                blockingError: `[${isServedCall ? `${hook.type} hook` : displayCommand}]: ${distrustReason}`,
                command: displayCommand,
                ...promptEndingFields(hookEvent, { noVerdict: "output_distrusted" }),
              },
              suppressOriginalPrompt: !0,
              outcome: "blocking",
              hook: hook,
            };
            return;
          }
          yield {
            message: createAttachmentMessage_2({
              type: "hook_non_blocking_error",
              hookName: hookDisplayName,
              toolUseID: toolUseID,
              hookEvent: hookEvent,
              stderr: al,
              stdout: _s.stdout,
              exitCode: _s.status,
              command: hookCommand,
              durationMs: wr,
            }),
            outcome: "non_blocking_error",
            hook: hook,
          };
          return;
        }
        let tp =
            mapped[hookIndex].throughFamilyOnly === !0 &&
            "tool_name" in hookInput &&
            Pz(hookInput.tool_name, getHookToolInput(hookInput)) !== void 0,
          Yh =
            capturedJson !== void 0 && _s.ranElsewhere && !tp
              ? applyRemoteHookInputRewrite(capturedJson, hookInput, fi, _s)
              : capturedJson,
          Ef =
            Yh !== void 0 && yr
              ? restrictPersonalHookAnswer(Yh, xN(mapped[hookIndex], hookInput) ?? hookInput)
              : Yh,
          np =
            XBt(hook, hookEvent, yr) &&
            _s.status !== 0 &&
            _s.status !== 2 &&
            !(Ef !== void 0 && isDenyDecisionOutput(Ef, hookEvent)),
          finalJson = np ? void 0 : Ef,
          ap =
            np && Ef !== void 0 && isSyncHookJSONOutput(Ef) && Ef.continue === !1
              ? { preventContinuation: !0, ...(Ef.stopReason !== void 0 && { stopReason: Ef.stopReason }) }
              : void 0;
        if (validationError && _s.status === 2) {
          if (!hadSchemaInvalidBlock && !suppressPerInvocationTelemetry)
            logFeatureSad(hookFeature(hookEvent), "hook_output_schema_invalid_blocked");
          hadSchemaInvalidBlock = !0;
        } else if (validationError) {
          hadSchemaInvalidOutput = !0;
          let al = withHookStderr(validationError, _s.status, _s.stderr);
          (emitHookResponse({
            hookId: hookId,
            hookName: hookDisplayName,
            hookEvent: hookEvent,
            output: _s.output,
            stdout: _s.stdout,
            stderr: al,
            exitCode: _s.status,
            outcome: "error",
          }),
            yield {
              message: createAttachmentMessage_2({
                type: "hook_non_blocking_error",
                hookName: hookDisplayName,
                toolUseID: toolUseID,
                hookEvent: hookEvent,
                stderr: al,
                stdout: _s.stdout,
                exitCode: _s.status,
                command: hookCommand,
                durationMs: wr,
              }),
              outcome: "non_blocking_error",
              hook: hook,
            });
          return;
        }
        if (finalJson) {
          if (isSyncHookJSONOutput_2(finalJson)) {
            if (_s.status === 2) {
              (emitHookResponse({
                hookId: hookId,
                hookName: hookDisplayName,
                hookEvent: hookEvent,
                output: _s.output,
                stdout: _s.stdout,
                stderr: _s.stderr,
                exitCode: _s.status,
                outcome: "error",
              }),
                yield {
                  blockingError: {
                    blockingError: `[${isServedCall ? `${hook.type} hook` : displayCommand}]: ${_s.stderr || "No stderr output"}`,
                    command: displayCommand,
                    ...promptEndingFields(hookEvent, { reason: _s.stderr }),
                  },
                  ...((_s.stdioIncomplete === !0 || _s.stdioClosedWithoutEnd === !0) && {
                    suppressOriginalPrompt: !0,
                  }),
                  outcome: "blocking",
                  hook: hook,
                });
              return;
            }
            if (_s.status !== 0) {
              (emitHookResponse({
                hookId: hookId,
                hookName: hookDisplayName,
                hookEvent: hookEvent,
                output: _s.output,
                stdout: _s.stdout,
                stderr: _s.stderr,
                exitCode: _s.status,
                outcome: "error",
              }),
                yield {
                  message: createAttachmentMessage_2({
                    type: "hook_non_blocking_error",
                    hookName: hookDisplayName,
                    toolUseID: toolUseID,
                    hookEvent: hookEvent,
                    stderr: `Announced async, then failed with status code ${_s.status}: ${_s.stderr.trim() || "No stderr output"}`,
                    stdout: _s.stdout,
                    exitCode: _s.status,
                    command: hookCommand,
                    durationMs: wr,
                  }),
                  outcome: "non_blocking_error",
                  hook: hook,
                  ...(exitedByContract(_s) && { ranByContract: !0 }),
                });
              return;
            }
            (emitHookResponse({
              hookId: hookId,
              hookName: hookDisplayName,
              hookEvent: hookEvent,
              output: _s.output,
              stdout: _s.stdout,
              stderr: _s.stderr,
              exitCode: _s.status,
              outcome: "success",
            }),
              yield { outcome: "success", hook: hook });
            return;
          }
          let processed = processHookJSONOutput({
            json: finalJson,
            command: hookCommand,
            hookName: hookDisplayName,
            toolUseID: toolUseID,
            hookEvent: hookEvent,
            expectedHookEvent: hookEvent,
            stdout: _s.stdout,
            stderr: _s.stderr,
            exitCode: _s.status,
            durationMs: wr,
          });
          if (_s.noVerdict !== void 0 && processed.blockingError)
            processed.blockingError = {
              blockingError: processed.blockingError.blockingError,
              command: processed.blockingError.command,
              ...promptEndingFields(hookEvent, {
                noVerdict: _s.noVerdict === "remote_run_timed_out" && Qm ? "interrupted" : _s.noVerdict,
              }),
            };
          if (
            (emitHookMetrics(finalJson.metrics, pluginId, hookEvent, ko),
            isSyncHookJSONOutput(finalJson) && !finalJson.suppressOutput && plainText && _s.status === 0)
          ) {
            let content = `${sequential.bold(hookDisplayName)} completed`;
            (emitHookResponse({
              hookId: hookId,
              hookName: hookDisplayName,
              hookEvent: hookEvent,
              output: _s.output,
              stdout: _s.stdout,
              stderr: _s.stderr,
              exitCode: _s.status,
              outcome: "success",
            }),
              yield {
                ...processed,
                message:
                  processed.message ||
                  createAttachmentMessage_2({
                    type: "hook_success",
                    hookName: hookDisplayName,
                    toolUseID: toolUseID,
                    hookEvent: hookEvent,
                    content: content,
                    stdout: _s.stdout,
                    stderr: _s.stderr,
                    exitCode: _s.status,
                    command: hookCommand,
                    durationMs: wr,
                  }),
                outcome: "success",
                hook: hook,
              });
            return;
          }
          if (_s.status === 2 && !processed.blockingError)
            processed.blockingError = {
              blockingError: `[${isServedCall ? `${hook.type} hook` : displayCommand}]: ${_s.stderr || "No stderr output"}${pluginNote}`,
              command: displayCommand,
              ...promptEndingFields(hookEvent, { reason: _s.stderr }),
            };
          if (_s.status === 2 && (_s.stdioIncomplete === !0 || _s.stdioClosedWithoutEnd === !0))
            processed.suppressOriginalPrompt = !0;
          (emitHookResponse({
            hookId: hookId,
            hookName: hookDisplayName,
            hookEvent: hookEvent,
            output: _s.output,
            stdout: _s.stdout,
            stderr: _s.stderr,
            exitCode: _s.status,
            outcome: _s.status === 0 ? "success" : "error",
          }),
            yield {
              ...processed,
              outcome: processed.blockingError ? "blocking" : "success",
              notStarted: _s.notStarted,
              hook: hook,
            });
          return;
        }
        if (_s.status === 0) {
          emitHookResponse({
            hookId: hookId,
            hookName: hookDisplayName,
            hookEvent: hookEvent,
            output: _s.output,
            stdout: _s.stdout,
            stderr: _s.stderr,
            exitCode: _s.status,
            outcome: "success",
          });
          let al = await persistLargeHookOutput(_s.stdout.trim(), hookId, "stdout", {
            storageV5: effectiveStorageV5,
          });
          yield {
            message: createAttachmentMessage_2({
              type: "hook_success",
              hookName: hookDisplayName,
              toolUseID: toolUseID,
              hookEvent: hookEvent,
              content: al,
              stdout: _s.stdout,
              stderr: _s.stderr,
              exitCode: _s.status,
              command: hookCommand,
              durationMs: wr,
            }),
            outcome: "success",
            notStarted: _s.notStarted,
            hook: hook,
          };
          return;
        }
        if (
          _s.status === 2 &&
          hook.type !== "script" &&
          exitTwoMeansMissingScript({
            hookEvent: hookEvent,
            stdout: _s.stdout,
            stderr: _s.stderr,
            pluginId: pluginId,
            stdioIncomplete: _s.stdioIncomplete,
            stdioClosedWithoutEnd: _s.stdioClosedWithoutEnd,
          })
        ) {
          (emitHookResponse({
            hookId: hookId,
            hookName: hookDisplayName,
            hookEvent: hookEvent,
            output: _s.output,
            stdout: _s.stdout,
            stderr: _s.stderr,
            exitCode: _s.status,
            outcome: "error",
          }),
            yield {
              message: createAttachmentMessage_2({
                type: "hook_non_blocking_error",
                hookName: hookDisplayName,
                toolUseID: toolUseID,
                hookEvent: hookEvent,
                stderr:
                  `Hook script appears to be missing \u2014 "${displayCommand}" exited 2 with: ${_s.stderr.trim()}. ${b1e}` +
                  (pluginId
                    ? `Run \`/plugin\` to reinstall '${pluginId}' or remove it from settings.`
                    : "If this is a plugin hook, check the plugin install (run /plugin)."),
                stdout: _s.stdout,
                exitCode: _s.status,
                command: hookCommand,
                durationMs: wr,
              }),
              outcome: "non_blocking_error",
              hook: hook,
            });
          return;
        }
        if (_s.status === 2) {
          (emitHookResponse({
            hookId: hookId,
            hookName: hookDisplayName,
            hookEvent: hookEvent,
            output: _s.output,
            stdout: _s.stdout,
            stderr: _s.stderr,
            exitCode: _s.status,
            outcome: "error",
          }),
            yield {
              blockingError: {
                blockingError: `[${isServedCall ? `${hook.type} hook` : displayCommand}]: ${_s.stderr || "No stderr output"}${pluginNote}`,
                command: displayCommand,
                ...promptEndingFields(hookEvent, { reason: _s.stderr }),
              },
              ...((_s.stdioIncomplete === !0 || _s.stdioClosedWithoutEnd === !0) && {
                suppressOriginalPrompt: !0,
              }),
              outcome: "blocking",
              hook: hook,
            });
          return;
        }
        if (
          (emitHookResponse({
            hookId: hookId,
            hookName: hookDisplayName,
            hookEvent: hookEvent,
            output: _s.output,
            stdout: _s.stdout,
            stderr: _s.stderr,
            exitCode: _s.status,
            outcome: "error",
          }),
          _s.spawnFailed && !Jxn(hookEvent, displayCommand))
        ) {
          yield { outcome: "non_blocking_error", hook: hook };
          return;
        }
        yield {
          message: createAttachmentMessage_2({
            type: "hook_non_blocking_error",
            hookName: hookDisplayName,
            toolUseID: toolUseID,
            hookEvent: hookEvent,
            stderr: `${Vge}${_s.stderr.trim() || "No stderr output"}`,
            stdout: _s.stdout,
            exitCode: _s.status,
            command: hookCommand,
            durationMs: wr,
          }),
          ...ap,
          outcome: "non_blocking_error",
          hook: hook,
          ...(exitedByContract(_s) && { ranByContract: !0 }),
        };
        return;
      } catch (error) {
        cleanup?.();
        let gd = error instanceof Error ? error.message : String(error);
        if (
          (logForDebugging(`Hook failed to run (${hookDisplayName}): ${gd}`, { level: "error" }),
          emitHookResponse({
            hookId: hookId,
            hookName: hookDisplayName,
            hookEvent: hookEvent,
            output: `Failed to run: ${gd}`,
            stdout: "",
            stderr: `Failed to run: ${gd}`,
            exitCode: 1,
            outcome: "error",
          }),
          vs && GUARD_HOOK_EVENTS.has(hookEvent))
        ) {
          yield {
            blockingError: {
              blockingError: `[${isServedCall ? `${hook.type} hook` : displayCommand}]: blocked (exit 2); its output could not be processed`,
              command: displayCommand,
            },
            outcome: "blocking",
            hook: hook,
          };
          return;
        }
        let Su = Ld
          ? void 0
          : guardScriptHookBlock(
              hook,
              hookEvent,
              isServedCall ? "script hook" : displayCommand,
              isServedCall ? "setup failed" : gd,
            );
        if (Su !== void 0) {
          yield Su;
          return;
        }
        if (!Jxn(hookEvent, displayCommand)) {
          yield { outcome: "non_blocking_error", hook: hook };
          return;
        }
        yield {
          message: createAttachmentMessage_2({
            type: "hook_non_blocking_error",
            hookName: hookDisplayName,
            toolUseID: toolUseID,
            hookEvent: hookEvent,
            stderr: `Failed to run: ${gd}`,
            stdout: "",
            exitCode: 1,
            command: hookCommand,
            durationMs: Date.now() - hookStartMs,
          }),
          outcome: "non_blocking_error",
          hook: hook,
        };
        return;
      }
    }),
    outcomes = { success: 0, blocking: 0, non_blocking_error: 0, cancelled: 0 },
    injectedCharCounts = {
      additionalContextChars: 0,
      classifierContextChars: 0,
      systemMessageChars: 0,
      initialUserMessageChars: 0,
      hookSuccessStdoutChars: 0,
    },
    outputsPersistedCount = 0,
    pluginIdByHook = new Map(mapped.map((hr) => [hr.hook, hr.pluginId])),
    matchedByHook = new Map(mapped.map((hr) => [hr.hook, hr])),
    injectedCharsByPlugin = new Map();
  function fs(hr, mi, Ha) {
    let $a = pluginIdByHook.get(hr);
    if (!$a || Ha === 0) return;
    let nr = injectedCharsByPlugin.get($a);
    if (!nr)
      ((nr = {
        additionalContextChars: 0,
        classifierContextChars: 0,
        systemMessageChars: 0,
        initialUserMessageChars: 0,
        hookSuccessStdoutChars: 0,
      }),
        injectedCharsByPlugin.set($a, nr));
    nr[mi] += Ha;
  }
  let outcomesByPlugin = new Map(),
    Vi = 0,
    aggregatedPermission,
    hookResultStream =
      toolUseContext === void 0 || isServedCall
        ? all(mapped_2)
        : runHooksWithConcurrencyLimit(
            mapped_2,
            (hr) => {
              let mi = mapped[hr];
              return wU(mi.hook) &&
                hookPromises[hr] === void 0 &&
                mi.notTested === void 0 &&
                !(hookEvent === "PermissionRequest" && mi.hook.type === "agent") &&
                getHookInputJson(mi, !1).ok
                ? aO(mi.hook, timeoutMs)
                : void 0;
            },
            { slots: SAn.of(toolUseContext.session.host), signal: signal, limitMs: timeoutMs },
          ),
    ii = startHookKeepalive(hookEvent, mapped, timeoutMs);
  for await (let hr of ii === AN ? hookResultStream : QAn(hookResultStream, ii)) {
    let mi = matchedByHook.get(hr.hook),
      Ha = notRunHooks.has(hr.hook)
        ? hr
        : summarizeHookFailures(
            hr,
            hookEvent,
            signal,
            isServedCall,
            mi !== void 0 && isPersonalRestrictedHook(mi, hookEvent),
          ),
      $a =
        !isServedCall &&
        hookEvent === "PreToolUse" &&
        !notRunHooks.has(hr.hook) &&
        !(
          (hr.hook.type === "prompt" || hr.hook.type === "agent") &&
          toolUseContext?.agentId?.startsWith(HOOK_AGENT_ID_PREFIX) === !0
        )
          ? getRemoteHookRunner(toolUseContext)
          : void 0,
      nr = isServedCall
        ? redactServedBlockingError(hookEvent === "PreToolUse" ? refuseUnfinishedPreToolHook(Ha, signal) : Ha)
        : $a !== void 0
          ? refuseUnfinishedPreToolHook(Ha, signal, $a, {
              tool:
                matchQuery !== void 0 && toolUseContext !== void 0
                  ? findToolByName(toolUseContext.options.tools, matchQuery)
                  : void 0,
              inSubagent: toolUseContext?.agentId !== void 0,
              continueIsContested: mi === void 0 || mi.continueIsContested === !0,
            })
          : Ha;
    outcomes[nr.outcome]++;
    let Ti = ao.get(hr.hook);
    if (Ti !== void 0) $o?.settle(Ti);
    let Vs = pluginIdByHook.get(nr.hook);
    if (Vs) {
      let jo = outcomesByPlugin.get(Vs);
      if (!jo)
        ((jo = { success: 0, blocking: 0, non_blocking_error: 0, cancelled: 0 }),
          outcomesByPlugin.set(Vs, jo));
      jo[nr.outcome]++;
    }
    if (nr.message?.type === "attachment" && nr.message.attachment.type === "hook_success") {
      let { content: content, stdout: stdout } = nr.message.attachment,
        fi = stdout?.length ?? 0;
      if (
        ((injectedCharCounts.hookSuccessStdoutChars += fi),
        fs(nr.hook, "hookSuccessStdoutChars", fi),
        stdout !== void 0 && isPersistedHookOutputPath(stdout.trim(), content))
      )
        outputsPersistedCount++;
    }
    if (nr.updatedToolOutput !== void 0)
      (logForDebugging(`Hook ${hookEvent} (${getHookStatusText(nr.hook)}) replaced tool output`),
        yield { updatedToolOutput: nr.updatedToolOutput });
    if (nr.updatedMCPToolOutput !== void 0 && nr.updatedToolOutput === void 0)
      (logForDebugging(
        `Hook ${hookEvent} (${getHookStatusText(nr.hook)}) replaced tool output (updatedMCPToolOutput)`,
      ),
        yield { updatedMCPToolOutput: nr.updatedMCPToolOutput });
    if (nr.displayContent !== void 0) yield { displayContent: nr.displayContent };
    if (matchedByHook.get(nr.hook)?.throughFamilyOnly === !0) nr.classifierContext = void 0;
    if (nr.classifierContext) {
      let jo = truncateToLength(nr.classifierContext, q0);
      (logForDebugging(
        `Hook ${hookEvent} (${getHookStatusText(nr.hook)}) provided classifierContext (${jo.length} chars after cap)`,
      ),
        (injectedCharCounts.classifierContextChars += jo.length),
        fs(nr.hook, "classifierContextChars", jo.length),
        yield {
          pairedRewrite:
            nr.updatedToolOutput !== void 0
              ? "direct"
              : nr.updatedMCPToolOutput !== void 0
                ? "legacy_mcp"
                : nr.legacyMcpRewriteSuppressed
                  ? "suppressed"
                  : "none",
          classifierContexts: [
            {
              value: jo,
              hostPrincipal:
                nr.hook.type === "callback" &&
                pluginIdByHook.get(nr.hook) === void 0 &&
                (() => {
                  let Qr = matchedByHook.get(nr.hook);
                  return Qr !== void 0 && Qr.pluginRoot === void 0 && Qr.skillRoot === void 0;
                })(),
            },
          ],
        });
    }
    if (nr.preventContinuation)
      (logForDebugging(`Hook ${hookEvent} (${getHookStatusText(nr.hook)}) requested preventContinuation`),
        yield { preventContinuation: !0, stopReason: nr.stopReason });
    let _i =
      nr.hook?.type === "prompt"
        ? { hook: nr.hook, stopReason: nr.stopReason, impossible: nr.impossible }
        : {};
    if (nr.blockingError)
      (yield { blockingError: nr.blockingError, suppressOriginalPrompt: nr.suppressOriginalPrompt, ..._i },
        (aggregatedPermission = "deny"));
    if (nr.message) yield { message: nr.message, ..._i };
    if (
      (hookEvent === "PreToolUse" || hookEvent === "PermissionRequest") &&
      nr.outcome === "non_blocking_error" &&
      toolUseID
    )
      KE.noteHookFailure(
        toolUseID,
        formatHookFailureLine(
          hookEvent,
          nr.message?.type === "attachment" && nr.message.attachment.type === "hook_non_blocking_error"
            ? nr.message.attachment.stderr
            : "",
        ),
      );
    if (nr.timedOut && nr.hook.type === "prompt" && hookEvent === "Stop")
      yield { hook: nr.hook, timedOut: !0 };
    if ((Vi++, nr.systemMessage)) {
      ((injectedCharCounts.systemMessageChars += nr.systemMessage.length),
        fs(nr.hook, "systemMessageChars", nr.systemMessage.length));
      let jo = await persistLargeHookOutput(nr.systemMessage, `${toolUseID}-${Vi}`, "systemMessage", {
        storageV5: effectiveStorageV5,
      });
      if (isPersistedHookOutputPath(nr.systemMessage, jo)) outputsPersistedCount++;
      yield {
        message: createAttachmentMessage_2({
          type: "hook_system_message",
          content: jo,
          hookName: hookDisplayName,
          toolUseID: toolUseID,
          hookEvent: hookEvent,
          ...(nr.heldForServedCall && { heldForServedCall: !0 }),
        }),
      };
    }
    if (nr.terminalSequence) F1e(nr.terminalSequence);
    if (nr.additionalContext) {
      ((injectedCharCounts.additionalContextChars += nr.additionalContext.length),
        fs(nr.hook, "additionalContextChars", nr.additionalContext.length),
        logForDebugging(
          `Hook ${hookEvent} (${getHookStatusText(nr.hook)}) provided additionalContext (${nr.additionalContext.length} chars)`,
        ));
      let jo = await persistLargeHookOutput(nr.additionalContext, `${toolUseID}-${Vi}`, "additionalContext", {
        storageV5: effectiveStorageV5,
      });
      if (isPersistedHookOutputPath(nr.additionalContext, jo)) outputsPersistedCount++;
      yield { additionalContexts: [jo] };
    }
    if (nr.initialUserMessage) {
      ((injectedCharCounts.initialUserMessageChars += nr.initialUserMessage.length),
        fs(nr.hook, "initialUserMessageChars", nr.initialUserMessage.length),
        logForDebugging(
          `Hook ${hookEvent} (${getHookStatusText(nr.hook)}) provided initialUserMessage (${nr.initialUserMessage.length} chars)`,
        ));
      let jo = await persistLargeHookOutput(
        nr.initialUserMessage,
        `${toolUseID}-${Vi}`,
        "initialUserMessage",
        { storageV5: effectiveStorageV5 },
      );
      if (isPersistedHookOutputPath(nr.initialUserMessage, jo)) outputsPersistedCount++;
      yield { initialUserMessage: jo };
    }
    if (nr.watchPaths && nr.watchPaths.length > 0)
      (logForDebugging(
        `Hook ${hookEvent} (${getHookStatusText(nr.hook)}) provided ${nr.watchPaths.length} watchPaths`,
      ),
        yield { watchPaths: nr.watchPaths });
    if (nr.reloadSkills)
      (logForDebugging(`Hook ${hookEvent} (${getHookStatusText(nr.hook)}) requested reloadSkills`),
        yield { reloadSkills: !0 });
    if (nr.sessionTitle)
      (logForDebugging(
        `Hook ${hookEvent} (${getHookStatusText(nr.hook)}) provided sessionTitle (${[...nr.sessionTitle].length} chars)`,
      ),
        yield { sessionTitle: nr.sessionTitle });
    if (matchedByHook.get(nr.hook)?.throughFamilyOnly === !0) {
      if (((nr.updatedInput = void 0), nr.permissionBehavior === "allow"))
        (logForDebugging(
          `Hook ${hookEvent} (${getHookStatusText(nr.hook)}) permissionDecision=allow ignored: it matched this tool only through another of its names, which can deny or ask but not allow`,
        ),
          (nr.permissionBehavior = void 0));
      if (nr.permissionRequestResult?.behavior === "allow")
        (logForDebugging(
          `Hook ${hookEvent} (${getHookStatusText(nr.hook)}) PermissionRequest allow ignored: it matched this tool only through another of its names, which can deny or ask but not allow`,
        ),
          (nr.permissionRequestResult = void 0));
    }
    if (
      (stripConfinedHookApproval(
        nr,
        `Hook ${hookEvent} (${getHookStatusText(nr.hook)})`,
        hookInput,
        toolUseContext,
      ),
      nr.updatedInput !== void 0)
    )
      toolUseContext?.remoteCall?.hookRewrites.push({
        byOwnHook: _r.has(nr.hook),
        handed: "tool_input" in hookInput ? hookInput.tool_input : void 0,
        proposed: nr.updatedInput,
      });
    if (nr.permissionBehavior)
      switch (
        (logForDebugging(
          `Hook ${hookEvent} (${getHookStatusText(nr.hook)}) returned permissionDecision: ${nr.permissionBehavior}${nr.hookPermissionDecisionReason ? ` (reason: ${nr.hookPermissionDecisionReason})` : ""}`,
        ),
        nr.permissionBehavior)
      ) {
        case "deny":
          aggregatedPermission = "deny";
          break;
        case "defer":
          if (aggregatedPermission !== "deny") aggregatedPermission = "defer";
          break;
        case "ask":
          if (aggregatedPermission !== "deny" && aggregatedPermission !== "defer")
            aggregatedPermission = "ask";
          break;
        case "allow":
          if (!aggregatedPermission) aggregatedPermission = "allow";
          break;
        case "passthrough":
          break;
      }
    if (nr.permissionBehavior && aggregatedPermission === nr.permissionBehavior) {
      let jo =
        nr.updatedInput && (nr.permissionBehavior === "allow" || nr.permissionBehavior === "ask")
          ? nr.updatedInput
          : void 0;
      if (jo)
        logForDebugging(
          `Hook ${hookEvent} (${getHookStatusText(nr.hook)}) modified tool input keys: [${Object.keys(jo).join(", ")}]`,
        );
      let Qr =
          nr.permissionBehavior === "ask"
            ? OUt(nr.permissionDisplay, nr.hook, matchedByHook.get(nr.hook))
            : void 0,
        fi = matchedByHook.get(nr.hook);
      yield {
        permissionBehavior: aggregatedPermission,
        hookPermissionDecisionReason: nr.hookPermissionDecisionReason,
        ...(nr.heldForServedCall && { heldForServedCall: !0 }),
        hookSource: fi?.hookSource,
        ...(fi?.pluginId !== void 0 && fi.skillRoot === void 0 && { hookPluginId: fi.pluginId }),
        updatedInput: jo,
        ...(jo && { rewriterKind: getRewriterKindForHook(nr.hook, fi) }),
        ...(Qr && { permissionDisplay: Qr }),
      };
    }
    if (nr.updatedInput && nr.permissionBehavior === void 0) {
      logForDebugging(
        `Hook ${hookEvent} (${getHookStatusText(nr.hook)}) modified tool input keys: [${Object.keys(nr.updatedInput).join(", ")}]`,
      );
      let jo = matchedByHook.get(nr.hook);
      yield {
        hookSource: jo?.hookSource,
        updatedInput: nr.updatedInput,
        rewriterKind: getRewriterKindForHook(nr.hook, jo),
      };
    }
    if (nr.permissionRequestResult) yield { permissionRequestResult: nr.permissionRequestResult };
    if (nr.retry) yield { retry: nr.retry };
    if (nr.elicitationResponse) yield { elicitationResponse: nr.elicitationResponse };
    if (nr.elicitationResultResponse) yield { elicitationResultResponse: nr.elicitationResultResponse };
    if (gt && nr.hook.type !== "callback") {
      let jo = matchQuery ?? "",
        Qr = { skillRoot: mapped.find((Ri) => Ri.hook === nr.hook)?.skillRoot },
        fi =
          gt.getEntry(session.id, hookEvent, jo, nr.hook, Qr) ??
          gt.getEntry(session.id, hookEvent, getPluginHookRunner()?.ownTool(jo)?.name ?? jo, nr.hook, Qr);
      if (fi?.onHookSuccess && nr.outcome === "success" && !nr.notStarted)
        try {
          fi.onHookSuccess(nr.hook, nr);
        } catch (error) {
          logError(Error("Session hook success callback failed", { cause: error }));
        }
    }
  }
  let wa = Date.now() - batchStartTime;
  for (let hr of new Set(pluginIdByHook.values())) if (hr) recordPluginUsage(hr);
  if (!suppressPerInvocationTelemetry) {
    getStatsStore()?.observe("hook_duration_ms", wa);
    for (let [hr, mi] of injectedCharsByPlugin)
      logEvent("tengu_hook_plugin_injected", {
        hookName: hookNameForTelemetry,
        ...buildPluginEventFieldsFromId(hr),
        ...mi,
      });
    for (let [hr, mi] of outcomesByPlugin)
      logEvent("tengu_hook_plugin_finished", {
        hookEvent: fromEnum(hookEvent),
        ...buildPluginEventFieldsFromId(hr),
        numCommands: mi.success + mi.blocking + mi.non_blocking_error + mi.cancelled,
        numSuccess: mi.success,
        numBlocking: mi.blocking,
        numNonBlockingError: mi.non_blocking_error,
        numCancelled: mi.cancelled,
      });
    if (
      (logEvent("tengu_repl_hook_finished", {
        hookName: hookNameForTelemetry,
        numCommands: mapped.length,
        numSuccess: outcomes.success,
        numBlocking: outcomes.blocking,
        numNonBlockingError: outcomes.non_blocking_error,
        numCancelled: outcomes.cancelled,
        totalDurationMs: wa,
        ...injectedCharCounts,
      }),
      logOTelEvent(
        "hook_execution_complete",
        {
          hook_event: hookEvent,
          hook_name: So,
          num_hooks: String(mapped.length),
          num_success: String(outcomes.success),
          num_blocking: String(outcomes.blocking),
          num_non_blocking_error: String(outcomes.non_blocking_error),
          num_cancelled: String(outcomes.cancelled),
          total_duration_ms: String(wa),
          stdout_chars: String(injectedCharCounts.hookSuccessStdoutChars),
          additional_context_chars: String(injectedCharCounts.additionalContextChars),
          system_message_chars: String(injectedCharCounts.systemMessageChars),
          initial_user_message_chars: String(injectedCharCounts.initialUserMessageChars),
          num_outputs_persisted: String(outputsPersistedCount),
          managed_only: String(shouldAllowManagedHooksOnlyByPolicy()),
          hook_source: shouldAllowManagedHooksOnlyByPolicy() ? "policySettings" : "merged",
          safe_mode: String(isSafeMode()),
          ...(vn && { hook_definitions: hookDefinitionsJson }),
        },
        ko,
      ),
      un)
    )
      endHookSpan(un, {
        numSuccess: outcomes.success,
        numBlocking: outcomes.blocking,
        numNonBlockingError: outcomes.non_blocking_error,
        numCancelled: outcomes.cancelled,
      });
    if (inputFailureReason) logFeatureBad(hookFeature(hookEvent), inputFailureReason);
    else if (outcomes.non_blocking_error > 0)
      logFeatureBad(
        hookFeature(hookEvent),
        hadSchemaInvalidOutput ? "hook_output_schema_invalid" : "hook_non_blocking_error",
      );
    else if (outcomes.cancelled > 0 && !hadSchemaInvalidBlock)
      logFeatureSad(hookFeature(hookEvent), "hook_cancelled");
    else if (hadSchemaInvalidBlock);
    else
      logFeatureOk(hookFeature(hookEvent), {
        numBlocking: outcomes.blocking,
        ...((hookEvent === "Stop" || hookEvent === "SubagentStop") &&
          "stop_hook_active" in hookInput && { stop_hook_active: hookInput.stop_hook_active === !0 }),
      });
  }
  if (controlStreamClosedError) throw controlStreamClosedError;
}
/**
 * 确定钩子运行目录：目标目录存在就用；否则依次退回原始 cwd、项目根、家目录，最后是临时目录，并对每个失效目录只警告一次。
 */
//@ chunk-e6aww6q8.js:3557798-3558093 facade-exports
async function safeHookCwd(e, n) {
  if (await pathExists(e)) return e;
  let r = tmpdir_2();
  for (let h of [n.originalCwd, n.projectRoot, homedir_2()])
    if (h !== e && (await pathExists(h))) {
      r = h;
      break;
    }
  let of = tIr.of(getRootSession().host);
  if (!of.has(e))
    (of.add(e),
      logForDebugging(`Hooks: working directory ${e} no longer exists; running hooks from ${r} instead`, {
        level: "warn",
      }));
  return r;
}
//@ chunk-e6aww6q8.js:3558093-3558143 affinity
var tIr = new HostScoped(() => new Set()),
  nIr = new HostScoped(() => new Set());
/**
 * 判断钩子结果列表中是否有阻断结果。
 */
//@ chunk-e6aww6q8.js:3558460-3558506 facade-exports
function hasBlockingResult(e) {
  return e.some((n) => n.blocked);
}
//@ chunk-e6aww6q8.js:3558506-3558690 layout
function runOutsideReplFunctionChain(e, n) {
  return runOutsideReplHookChain({
    event: n.hook_event_name,
    hookInput: { ...n },
    signal: e.signal,
    origin: e.hookOrigin,
    runClassicHooks: (r, s) =>
      executeHooksOutsideREPL({ ...e, hookInput: r, tier: s, classicChainMember: !0 }),
  });
}
/**
 * REPL 外（无对话上下文）执行钩子，返回 [{command, succeeded, output, blocked, watchPaths, systemMessage}]；prompt/agent 钩子在这里不支持；工作区未信任时跳过（personsHooksRunUntrusted 除外）。SessionEnd/Notification/PreCompact/WorktreeCreate 等用它。
 */
//@ chunk-e6aww6q8.js:3558690-3568751 facade-exports = executeHooksOutsideREPL (0.59)
async function executeHooksOutsideREPL(e) {
  let {
      session: session,
      sessionHooks: sessionHooks,
      getAppState: getAppState,
      hookInput: hookInput,
      matchQuery: matchQuery,
      signal: signal,
      timeoutMs: timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
      storageV5: storageV5,
      credentials: credentials,
      tier: tier,
      agentId: agentId,
    } = e,
    hookEvent = hookInput.hook_event_name,
    ke = matchQuery ? `${hookEvent}:${matchQuery}` : hookEvent;
  if (shouldRunSessionEndHook(hookEvent, signal)) await heldUntilExit();
  let we = tier?.managedHooksOnly
    ? void 0
    : maybeWaitForHookPolicy(
        hookEvent,
        () => collectEventHooks(sessionHooks, session.id, hookEvent, { held: "only" }).length > 0,
        signal,
      );
  if (we !== void 0) await we;
  let Ee =
    !e.classicChainMember && hookInput.hook_event_name !== "PreToolUse" && Cht(hookInput.hook_event_name)
      ? hookInput
      : void 0;
  if (Ee !== void 0 && !RAe(hookEvent, sessionHooks, session.id)) return runOutsideReplFunctionChain(e, Ee);
  if (shouldDisableAllHooksIncludingManaged())
    logForDebugging(
      `Policy disableAllHooks: skipping configured hooks for ${ke} (SDK callback hooks still run)`,
    );
  let sessionId = shouldSkipHookDueToTrust();
  if (sessionId && e.personsHooksRunUntrusted !== !0)
    return (logForDebugging(`Skipping ${ke} hook execution - workspace trust not accepted`), []);
  let Ie = getAppState?.(),
    Me = sessionId
      ? await getUntrustedFolderSources(storageV5)
      : isAttachServeMode()
        ? await getServedSessionOwnSources(storageV5)
        : void 0,
    We = getPluginHookRunner()?.owedList(hookEvent);
  if (We !== void 0) await awaitWithHookTimeout(We, hookEvent, signal, timeoutMs);
  if (Me !== void 0 && Ee !== void 0 && !RAe(hookEvent, sessionHooks, session.id))
    return runOutsideReplFunctionChain(e, Ee);
  let ze = tier?.managedHooksOnly ? void 0 : getPluginHookRunner()?.whichCopyAsk?.(hookEvent, hookInput);
  if (ze !== void 0) await awaitWithHookTimeout(ze, hookEvent, signal, timeoutMs);
  let lt = await getMatchingHooks(sessionHooks, session.id, hookEvent, hookInput, void 0, {
    ...tier,
    getToolAliases: () => Ie?.toolPermissionContext.toolAliases,
    ...(Me !== void 0 && { recordMatchers: !0, ownSources: Me.ownSources }),
  })
    .catch((no) => {
      if ((mPn(hookEvent, no), W0(hookEvent))) throw no;
      return [];
    })
    .then((no) => (Me === void 0 ? no : filterWithheldFolderHooks(no, hookEvent, Me)));
  if (lt.length === 0) return [];
  if (signal?.aborted) return [];
  let userHooks = lt.filter((no) => !isInternalHook(no));
  if (userHooks.length > 0) {
    let pluginHookCounts = countHooksByPlugin(userHooks),
      hookTypeCounts = countByPluginKey(userHooks),
      ho = countHooksByType(userHooks),
      yn = count(userHooks, (Kn) => Kn.matcherIsMatchAll);
    logEvent("tengu_run_hook", {
      hookName: NPn(hookEvent, matchQuery),
      numCommands: userHooks.length,
      numMatchAllMatchers: yn,
      numSpecificMatchers: userHooks.length - yn,
      hookTypeCounts: hashEntries(ho),
      ...(pluginHookCounts && { pluginHookCounts: hashEntries(pluginHookCounts) }),
      ...(hookTypeCounts && { pluginHookCountsByHash: hookTypeCounts }),
    });
  }
  let nt = Me?.untrustedStart,
    pt,
    Et,
    yt = !1;
  try {
    if (
      ((pt = jsonStringify(nt === void 0 ? hookInput : { ...hookInput, cwd: nt })),
      (yt = fPn(hookEvent, pt)),
      yt)
    )
      throw RangeError("Hook input is over the size limit");
  } catch (error) {
    if (
      (logError(error),
      logFeatureBad(hookFeature(hookEvent), yt ? "hook_input_too_large" : "hook_input_stringify_failed"),
      W0(hookEvent))
    )
      throw error;
    return [];
  }
  let gt,
    At = !1,
    It = !1,
    Yt = userHooks.length > 0 ? startHookKeepalive(hookEvent, lt, timeoutMs) : AN,
    qt = new Set(lt.flatMap((no, hn) => (isPersonalRestrictedHook(no, hookEvent) ? [hn] : []))),
    Zt = new Set(),
    hookPromises = lt.map(
      async (
        {
          hook: hook,
          pluginRoot: pluginRoot,
          pluginId: pluginId,
          skillRoot: skillRoot,
          settingsSource: settingsSource,
          projectRoot: projectRoot,
          notTested: notTested,
        },
        hookIndex,
      ) => {
        let bo = getHookOriginLabel({ pluginId: pluginId, settingsSource: settingsSource }),
          vn = Hge(bo, hookEvent, hook),
          co = vn ?? notTested;
        if (co !== void 0) {
          ((gt ??= "hook_did_not_run"), Zt.add(hookIndex));
          let { blockingError: blockingError } = describeKillSwitchedHook(
            hookEvent,
            ke,
            co,
            pluginId,
            blocksWhenItCannotRunElsewhere(hookEvent) &&
              (vn !== void 0 || !(hook.type === "command" && isAsyncHookJSONOutput(hook))),
          );
          return {
            command: getHookDisplayText(hook),
            succeeded: !1,
            output: blockingError?.blockingError ?? co,
            blocked: blockingError !== void 0,
          };
        }
        let So = qt.has(hookIndex),
          ko;
        if (projectRoot !== void 0) {
          let cs = Qmi(projectRoot) ? projectRoot : Jmi();
          if (cs === null) {
            let _r = `not run: it came from ${projectRoot}, which is no longer a working copy this session can use, and the session's directory is not in one either`;
            return (
              logForDebugging(`Hooks: ${getHookDisplayText(hook)} for ${hookEvent} ${_r}`, { level: "warn" }),
              (gt ??= "hook_did_not_run"),
              { command: getHookDisplayText(hook), succeeded: !1, output: _r, blocked: !1 }
            );
          }
          ko = cs;
        }
        if (hook.type === "callback") {
          let cs = hook.timeout ? hook.timeout * 1000 : timeoutMs,
            { signal: abortSignal, cleanup: cleanup } = createCombinedAbortSignal(signal, { timeoutMs: cs });
          try {
            let toolUseID = randomUUID_11(),
              json = await hook.callback(hookInput, toolUseID, abortSignal, hookIndex);
            if ((cleanup?.(), isSyncHookJSONOutput_2(json)))
              return (
                logForDebugging(`${ke} [callback] returned async response, returning empty output`),
                { command: "callback", succeeded: !0, output: "", blocked: !1 }
              );
            let jr =
                hookEvent === "WorktreeCreate" &&
                isSyncHookJSONOutput(json) &&
                json.hookSpecificOutput?.hookEventName === "WorktreeCreate"
                  ? json.hookSpecificOutput.worktreePath
                  : json.systemMessage || "",
              Or = isSyncHookJSONOutput(json) && json.decision === "block";
            return (
              emitHookResponse_2(json, ke),
              logForDebugging(`${ke} [callback] completed successfully`),
              { command: "callback", succeeded: !0, output: jr, blocked: Or }
            );
          } catch (error) {
            if ((cleanup?.(), isAbortError(error))) {
              let jr = error instanceof StreamClosedAbortError || !!signal?.aborted;
              if (jr)
                (logForDebugging(
                  error instanceof StreamClosedAbortError
                    ? `${ke} [callback] cancelled (control stream closed)`
                    : `${ke} [callback] cancelled`,
                ),
                  (At = !0));
              else
                (logForDebugging(`${ke} [callback] timed out`, { level: "error" }),
                  (gt ??= "hook_callback_timeout"));
              return {
                command: "callback",
                succeeded: !1,
                output: "",
                blocked: !1,
                ...(jr && { cancelled: !0 }),
              };
            }
            let Oo = error instanceof Error ? error.message : String(error);
            return (
              logForDebugging(`${ke} [callback] failed to run: ${Oo}`, { level: "error" }),
              (gt ??= "hook_callback_failed"),
              { command: "callback", succeeded: !1, output: Oo, blocked: !1 }
            );
          }
        }
        if (hook.type === "prompt")
          return (
            (gt ??= "hook_type_unsupported"),
            {
              command: hook.prompt,
              succeeded: !1,
              output: "Prompt stop hooks are not yet supported outside REPL",
              blocked: !1,
            }
          );
        if (hook.type === "mcp_tool") {
          let cs = `${hook.server}/${hook.tool}`;
          try {
            let _r = await runMcpToolHook(
              hook,
              hookEvent,
              hookInput,
              getAppState?.().mcp.clients,
              signal,
              timeoutMs,
            );
            if (_r.aborted)
              return (
                (gt ??= "hook_cancelled"),
                {
                  command: cs,
                  succeeded: !1,
                  output: "Hook cancelled",
                  blocked: !1,
                  ...(signal?.aborted && { cancelled: !0 }),
                }
              );
            if (_r.error || !_r.ok)
              return (
                (gt ??= "hook_mcp_tool_failed"),
                { command: cs, succeeded: !1, output: _r.error || "MCP tool returned an error", blocked: !1 }
              );
            let { json: json, validationError: validationError } = parseHookOutput(_r.body);
            if (validationError) throw Error(validationError);
            let Oo = json && isSyncHookJSONOutput(json) ? json : void 0,
              jr = Oo && So ? restrictPersonalHookAnswer(Oo, hookInput) : Oo,
              Or = jr && isSyncHookJSONOutput(jr) ? jr : void 0,
              Io = Or?.decision === "block";
            if (Or) emitHookMetrics(Or.metrics, pluginId, hookEvent);
            return (
              emitHookResponse_2(jr ?? json, ke),
              {
                command: cs,
                succeeded: !0,
                output: Io ? Or?.reason || "" : _r.body,
                blocked: Io,
                watchPaths:
                  Or?.hookSpecificOutput && "watchPaths" in Or.hookSpecificOutput
                    ? Or.hookSpecificOutput.watchPaths
                    : void 0,
                systemMessage: Or?.systemMessage,
              }
            );
          } catch (error) {
            let Cr = error instanceof Error ? error.message : String(error);
            return (
              logForDebugging(`${ke} [${cs}] failed to run: ${Cr}`, { level: "error" }),
              (gt ??= "hook_mcp_exec_failed"),
              { command: cs, succeeded: !1, output: Cr, blocked: !1 }
            );
          }
        }
        if (hook.type === "agent")
          return (
            (gt ??= "hook_type_unsupported"),
            {
              command: hook.prompt,
              succeeded: !1,
              output: "Agent stop hooks are not yet supported outside REPL",
              blocked: !1,
            }
          );
        if (hook.type === "function")
          return (
            logError(
              Error(
                `Function hook reached executeHooksOutsideREPL for ${hookEvent}. Function hooks should only be used in REPL context (Stop hooks).`,
              ),
            ),
            (gt ??= "hook_type_unsupported"),
            {
              command: "function",
              succeeded: !1,
              output: "Internal error: function hook executed outside REPL context",
              blocked: !1,
            }
          );
        if (hook.type === "http")
          try {
            let cs = await execHttpHook(
              hook,
              hookEvent,
              pt,
              signal,
              timeoutMs,
              void 0,
              getManagedHttpHookEnv(hook),
            );
            if (cs.aborted)
              return (
                logForDebugging(`${ke} [${hook.url}] cancelled`),
                (gt ??= "hook_cancelled"),
                {
                  command: hook.url,
                  succeeded: !1,
                  output: "Hook cancelled",
                  blocked: !1,
                  ...(signal?.aborted && { cancelled: !0 }),
                }
              );
            if (isWithheldGuardHttpHook(cs, hookEvent)) {
              let Or = httpHookUnreachableMessage(hookEvent, cs.error);
              return (
                logForDebugging(`${ke} [${hook.url}] ${Or}`, { level: "error" }),
                (gt ??= "hook_http_request_failed"),
                { command: hook.url, succeeded: !1, output: Or, blocked: !0 }
              );
            }
            if (cs.error || !cs.ok) {
              let Or = cs.error || `HTTP ${cs.statusCode} from ${hook.url}`;
              return (
                logForDebugging(`${ke} [${hook.url}] failed: ${Or}`, { level: "error" }),
                (gt ??= "hook_http_request_failed"),
                { command: hook.url, succeeded: !1, output: Or, blocked: !1 }
              );
            }
            let { json: httpJson, validationError: httpValidationError } = parseHttpHookOutput(cs.body);
            if (httpValidationError) throw Error(httpValidationError);
            let Vr = httpJson && So ? restrictPersonalHookAnswer(httpJson, hookInput) : httpJson;
            if (Vr && !isSyncHookJSONOutput_2(Vr))
              logForDebugging(`Parsed JSON output from HTTP hook: ${jsonStringify(Vr)}`, {
                level: "verbose",
              });
            if (Vr && isSyncHookJSONOutput(Vr)) emitHookMetrics(Vr.metrics, pluginId, hookEvent);
            emitHookResponse_2(Vr, ke);
            let Oo = Vr && isSyncHookJSONOutput(Vr) && Vr.decision === "block",
              jr = Oo
                ? (Vr && isSyncHookJSONOutput(Vr) && Vr.reason) || ""
                : hookEvent === "WorktreeCreate"
                  ? Vr &&
                    isSyncHookJSONOutput(Vr) &&
                    Vr.hookSpecificOutput?.hookEventName === "WorktreeCreate"
                    ? Vr.hookSpecificOutput.worktreePath
                    : ""
                  : cs.body;
            return {
              command: hook.url,
              succeeded: !0,
              output: jr,
              blocked: !!Oo,
              systemMessage: Vr && isSyncHookJSONOutput(Vr) ? Vr.systemMessage : void 0,
            };
          } catch (error) {
            let _r = error instanceof Error ? error.message : String(error);
            return (
              logForDebugging(`${ke} [${hook.url}] failed to run: ${_r}`, { level: "error" }),
              (gt ??= "hook_http_exec_failed"),
              { command: hook.url, succeeded: !1, output: _r, blocked: !1 }
            );
          }
        let un = hook.timeout ? Math.min(hook.timeout * 1000, ec) : timeoutMs,
          ao = getHookDisplayText(hook),
          $o = getPluginHookRunner(),
          yo = hook.type === "command" && bo !== void 0 && $o !== void 0,
          Ho = yo && !isAsyncHookJSONOutput(hook),
          { signal: abortSignal, cleanup: cleanup } = createCombinedAbortSignal(signal, {
            timeoutMs: Ho ? void 0 : un,
          }),
          Hr = !1,
          Fr = !1;
        try {
          let cs = hook.type === "script" ? resolveScriptHook(hook, hookEvent) : { hook: hook, env: void 0 },
            _r = getHookProject(session),
            Cr =
              nt !== void 0
                ? { originalCwd: nt, projectRoot: $2e }
                : ko === void 0 || _r === null
                  ? _r
                  : { originalCwd: _r.originalCwd, projectRoot: ko };
          if (Et === void 0 && yo) Et = { sent: writeRemoteHookInput($o.stdin, hookInput) };
          let Vr = await execCommandHook(
              Ho ? zWe(cs.hook, { ...cs.hook, timeout: un / 1000 }) : cs.hook,
              hookEvent,
              ke,
              pt,
              Et?.sent,
              claudeEnvContextFrom(hookInput),
              Cr,
              nt ?? (hook.type === "script" ? (Cr?.projectRoot ?? hookInput.cwd) : hookInput.cwd),
              abortSignal,
              randomUUID_11(),
              hookIndex,
              pluginRoot,
              pluginId,
              settingsSource,
              skillRoot,
              hook.type === "script" || E1e(hook, hookEvent),
              cs.env,
              void 0,
              W1e(hookInput, void 0),
              n6e(hook),
              storageV5,
              credentials,
            ),
            Oo = signal?.aborted === !0 && Vr.stoppedAfterItsTimeout !== !0;
          ((Hr = hook.type !== "script" || didScriptHookRun(Vr) || (Vr.aborted === !0 && Oo)),
            (Fr = Vr.status === 2 && !Vr.backgrounded));
          let jr = !Hr && hook.type === "script" && GUARD_HOOK_EVENTS.has(hookEvent);
          if ((cleanup?.(), Vr.aborted))
            return (
              logForDebugging(`${ke} [${ao}] cancelled`),
              (gt ??= "hook_cancelled"),
              {
                command: ao,
                succeeded: !1,
                output: "Hook cancelled",
                blocked: jr,
                ...(Oo && { cancelled: !0 }),
              }
            );
          if ((logForDebugging(`${ke} [${ao}] completed with status ${Vr.status}`), !Hr))
            return (
              (gt ??= "hook_did_not_run"),
              {
                command: ao,
                succeeded: !1,
                output: `script hook did not run (${describeHookDidNotRun(Vr)})${Vr.stderr.trim() ? `: ${Vr.stderr.trim()}` : ""}`,
                blocked: jr,
              }
            );
          let Or = getHookStdoutForParsing(Vr),
            Io = parseHookOutput(Or),
            validationError = Io.validationError,
            rs = dropSuspectCaptureJson(Vr, hookEvent, Io.json),
            Es = getUntrustedCaptureReason(Vr, hookEvent, Or, rs, (Wi) => parseHookOutput(Wi).json);
          if (Es !== void 0)
            return (
              (gt ??= "hook_stdio_incomplete"),
              {
                command: ao,
                succeeded: !1,
                output: withHookStderr(Es, Vr.status, Vr.stderr),
                blocked: PROMPT_GUARD_EVENTS.has(hookEvent),
              }
            );
          let Nr = rs !== void 0 && So ? restrictPersonalHookAnswer(rs, hookInput) : rs;
          if (validationError && Vr.status === 2) It = !0;
          else if (validationError)
            throw (
              (gt ??= "hook_output_schema_invalid"),
              Error(withHookStderr(validationError, Vr.status, Vr.stderr))
            );
          if (Nr && !isSyncHookJSONOutput_2(Nr))
            logForDebugging(`Parsed JSON output from hook: ${jsonStringify(Nr)}`, { level: "verbose" });
          if (Nr && isSyncHookJSONOutput(Nr)) emitHookMetrics(Nr.metrics, pluginId, hookEvent);
          emitHookResponse_2(Nr, ke);
          let Is = Nr && isSyncHookJSONOutput(Nr) && Nr.decision === "block",
            fs = Vr.status === 2 || !!Is || jr,
            as = Is
              ? (Nr && isSyncHookJSONOutput(Nr) && Nr.reason) || Vr.stderr || ""
              : Vr.status === 0
                ? Vr.stdout || ""
                : Vr.stderr || "",
            Vi =
              Nr && isSyncHookJSONOutput(Nr) && Nr.hookSpecificOutput && "watchPaths" in Nr.hookSpecificOutput
                ? Nr.hookSpecificOutput.watchPaths
                : void 0,
            ji = Nr && isSyncHookJSONOutput(Nr) ? Nr.systemMessage : void 0;
          if (Vr.status !== 0 && !fs) gt ??= "hook_nonzero_exit";
          return {
            command: ao,
            succeeded: Vr.status === 0,
            output: as,
            blocked: fs,
            ...(Vr.exitedNormally && { exitCode: Vr.status }),
            watchPaths: Vi,
            systemMessage: ji,
          };
        } catch (error) {
          cleanup?.();
          let _r = error instanceof Error ? error.message : String(error);
          return (
            logForDebugging(`${ke} [${ao}] failed to run: ${_r}`, { level: "error" }),
            (gt ??= "hook_exec_failed"),
            {
              command: ao,
              succeeded: !1,
              output: _r,
              blocked: GUARD_HOOK_EVENTS.has(hookEvent) && (Fr || (!Hr && hook.type === "script")),
            }
          );
        }
      },
    ),
    pn;
  {
    let no = new Map(userHooks.map((yn, Kn) => [yn.hook, Kn]));
    using hn =
      userHooks.length === 0
        ? void 0
        : trackRunningHooks({
            hookEvent: hookEvent,
            hooks: userHooks.map(({ hook: hook }) => getHookProgressDisplay(hook)),
            agentId: agentId,
            toolName: getToolNameField(hookInput),
          });
    let results = Promise.all(
      lt.map(({ hook: hook }, Kn) =>
        hookPromises[Kn].then((Xn) => {
          let fo = { ...Xn, ...(qt.has(Kn) && { answerHeld: !0 }) };
          return Zt.has(Kn) ? fo : applyBlockOnFailure(hook, fo);
        }).finally(() => {
          let Xn = no.get(hook);
          if (Xn !== void 0) hn?.settle(Xn);
        }),
      ),
    );
    pn = await (Yt === AN ? results : results.finally(Yt));
  }
  if (shouldRunSessionEndHook(hookEvent, signal)) await heldUntilExit();
  if (gt) logFeatureBad(hookFeature(hookEvent), gt);
  else if (At) logFeatureSad(hookFeature(hookEvent), "hook_cancelled");
  else if (It) logFeatureSad(hookFeature(hookEvent), "hook_output_schema_invalid_blocked");
  else logFeatureOk(hookFeature(hookEvent));
  for (let no of new Set(lt.map((hn) => hn.pluginId))) if (no) recordPluginUsage(no);
  return pn;
}
/**
 * 是否存在 InstructionsLoaded 钩子（快照、主线程代理钩子、注册钩子、会话钩子、设备钩子）。
 */
//@ chunk-e6aww6q8.js:3568751-3569073 facade-exports = hasInstructionsLoadedHook (0.849)
function hasInstructionsLoadedHook() {
  let snapshotHooks = getHooksConfigFromSnapshot()?.InstructionsLoaded;
  if (snapshotHooks && snapshotHooks.length > 0) return !0;
  if (!shouldAllowManagedHooksOnly()) {
    let registeredHooks = getMainThreadAgentHooks()?.InstructionsLoaded;
    if (registeredHooks && registeredHooks.length > 0) return !0;
  }
  let n = getRegisteredHooks()?.InstructionsLoaded;
  if (n && n.length > 0) return !0;
  if (
    getPluginSettingsHooks("InstructionsLoaded").length > 0 ||
    getPluginHookRunner()?.owedList("InstructionsLoaded") !== void 0
  )
    return !0;
  return F3("InstructionsLoaded");
}
//@ chunk-e6aww6q8.js:3569073-3569228 layout
async function awaitWithHookTimeout(e, n, r, s) {
  if (r !== void 0 || blocksWhenItCannotRunElsewhere(n)) {
    await e(r);
    return;
  }
  let h = createCombinedAbortSignal(void 0, { timeoutMs: s, refTimer: !0 });
  try {
    await e(h.signal);
  } finally {
    h.cleanup();
  }
}
/**
 * 把 REPL 外钩子结果解析为 elicitation 响应：blocked 或 decision:block 视为阻断，hookSpecificOutput.action/content 作为回答。
 */
//@ chunk-e6aww6q8.js:3569228-3570004 facade-exports = parseElicitationHookOutput (0.9)
function parseElicitationHookOutput(result, expectedEventName) {
  if (result.blocked)
    return {
      blockingError: {
        blockingError: result.output || "Elicitation blocked by hook",
        command: result.command,
      },
    };
  if (!result.output.trim()) return {};
  let trimmed = result.output.trim();
  if (!trimmed.startsWith("{")) return {};
  try {
    let parsed = hookJSONOutputSchema().parse(jsonParse(trimmed)),
      h = result.answerHeld
        ? parseHookJsonOutput(parsed, expectedEventName, { personal: !0 }).answer
        : parsed;
    if (isSyncHookJSONOutput_2(h)) return {};
    if (!isSyncHookJSONOutput(h)) return {};
    if (h.decision === "block")
      return {
        blockingError: { blockingError: h.reason || "Elicitation blocked by hook", command: result.command },
      };
    let specific = h.hookSpecificOutput;
    if (!specific || specific.hookEventName !== expectedEventName) return {};
    if (!specific.action) return {};
    let out = { response: { action: specific.action, content: specific.content } };
    if (specific.action === "decline")
      out.blockingError = {
        blockingError:
          h.reason ||
          (expectedEventName === "Elicitation"
            ? "Elicitation denied by hook"
            : "Elicitation result blocked by hook"),
        command: result.command,
      };
    return out;
  } catch {
    return {};
  }
}
//@ chunk-e6aww6q8.js:3570004-3570039 layout
class StatusLineLogState {
  okLogged = !1;
  badLogged = !1;
}
//@ chunk-e6aww6q8.js:3570039-3570066 layout
var statusLineLogStateByHost = new HostScoped(() => new StatusLineLogState());
/**
 * 执行 statusLine 命令（复用 execCommandHook，事件名 StatusLine，stdin 为状态 JSON），返回非空输出行；禁用钩子或工作区未信任时不执行。
 */
//@ chunk-e6aww6q8.js:3570066-3571131 facade-exports = executeStatusLineCommand (0.656)
async function executeStatusLineCommand(statusLineInput, signal, timeoutMs, logResult = !1) {
  if (shouldDisableAllHooksIncludingManaged()) return;
  let of = statusLineLogStateByHost.of(statusLineInput.host);
  if (isCustomizationDisabled("statusLine")) return;
  if (shouldSkipHookDueToTrust()) {
    logForDebugging("Skipping StatusLine command execution - workspace trust not accepted");
    return;
  }
  let y = getEffectiveStatusLine(getSettings_DEPRECATED()?.statusLine);
  if (!y || y.type !== "command") return;
  try {
    let jsonInput = jsonStringify(signal),
      now = Date.now(),
      L = await execCommandHook(
        qWe("statusLine") ? j0({ ...y }) : y,
        "StatusLine",
        "statusLine",
        jsonInput,
        void 0,
        claudeEnvContextFrom(signal),
        xo(statusLineInput),
        signal.cwd,
        timeoutMs,
        randomUUID_11(),
      );
    if (L.aborted) return;
    let trimmed = L.stderr.trim();
    if (trimmed) logForDebugging(`StatusLine [${y.command}] stderr: ${trimmed}`);
    if (L.status === 0) {
      if (!of.okLogged) ((of.okLogged = !0), logFeatureOk("status_line_command"));
      let joined = L.stdout
        .trim()
        .split(
          `
`,
        )
        .flatMap((line) => line.trim() || []).join(`
`);
      if (joined) {
        if (logResult) logForDebugging(`StatusLine [${y.command}] completed with status ${L.status}`);
        return joined;
      }
    } else if (logResult)
      logForDebugging(`StatusLine [${y.command}] completed with status ${L.status}`, { level: "warn" });
    if (L.status !== 0 && !of.badLogged)
      ((of.badLogged = !0),
        logFeatureBad(
          "status_line_command",
          L.spawnFailed
            ? "spawn_failed"
            : Date.now() - now >= TOOL_HOOK_EXECUTION_TIMEOUT_MS
              ? "timeout"
              : "nonzero_exit",
        ));
    return;
  } catch (error) {
    if ((logForDebugging(`Status hook failed: ${error}`, { level: "error" }), !of.badLogged))
      ((of.badLogged = !0), logFeatureBad("status_line_command", "exec_error"));
    return;
  }
}
/**
 * 执行 fileSuggestion 命令（@ 文件补全），默认 5 秒超时，按行返回候选。
 */
//@ chunk-e6aww6q8.js:3571131-3571754 facade-exports = executeFileSuggestionCommand (0.843)
async function executeFileSuggestionCommand(e, n, r, s = 5000) {
  if (shouldDisableAllHooksIncludingManaged()) return [];
  if (isCustomizationDisabled("fileSuggestion")) return [];
  if (shouldSkipHookDueToTrust())
    return (logForDebugging("Skipping FileSuggestion command execution - workspace trust not accepted"), []);
  let h = NBr(getSettings_DEPRECATED()?.fileSuggestion);
  if (!h || h.type !== "command") return [];
  let abortSignal = r || AbortSignal.timeout(s);
  try {
    let jsonInput = jsonStringify(n),
      hook = { type: "command", command: h.command };
    if (qWe("fileSuggestion")) j0(hook);
    let L = await execCommandHook(
      hook,
      "FileSuggestion",
      "FileSuggestion",
      jsonInput,
      void 0,
      claudeEnvContextFrom(n),
      xo(e),
      n.cwd,
      abortSignal,
      randomUUID_11(),
    );
    if (L.aborted || L.status !== 0) return [];
    return L.stdout
      .split(
        `
`,
      )
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    return (logForDebugging(`File suggestion helper failed: ${error}`, { level: "error" }), []);
  }
}
/**
 * 执行会话 function 钩子（内存回调，参数为消息列表），返回 false 时以 errorMessage 阻断；默认 5 秒超时。
 */
//@ chunk-e6aww6q8.js:3571754-3572702 fingerprint = executeFunctionHook (1)
async function executeFunctionHook({
  hook: hook,
  messages: messages,
  hookName: hookName,
  toolUseID: toolUseID,
  hookEvent: hookEvent,
  timeoutMs: timeoutMs,
  signal: signal,
}) {
  let callbackTimeoutMs = hook.timeout ?? timeoutMs,
    { signal: abortSignal, cleanup: cleanup } = createCombinedAbortSignal(signal, {
      timeoutMs: callbackTimeoutMs,
    });
  try {
    if (abortSignal.aborted) return (cleanup(), { outcome: "cancelled", hook: hook });
    let passed = await new Promise((resolve, reject) => {
      let onAbort = () => reject(Error("Function hook cancelled"));
      (abortSignal.addEventListener("abort", onAbort),
        Promise.resolve(hook.callback(messages, abortSignal))
          .then((result) => {
            (abortSignal.removeEventListener("abort", onAbort), resolve(result));
          })
          .catch((error) => {
            (abortSignal.removeEventListener("abort", onAbort), reject(error));
          }));
    });
    if ((cleanup(), passed)) return { outcome: "success", hook: hook };
    return {
      blockingError: { blockingError: hook.errorMessage, command: "function" },
      outcome: "blocking",
      hook: hook,
    };
  } catch (error) {
    if (
      (cleanup(),
      error instanceof Error && (error.message === "Function hook cancelled" || error.name === "AbortError"))
    )
      return { outcome: "cancelled", hook: hook };
    return (
      logError(error),
      {
        message: createAttachmentMessage_2({
          type: "hook_error_during_execution",
          hookName: hookName,
          toolUseID: toolUseID,
          hookEvent: hookEvent,
          content: error instanceof Error ? error.message : "Function hook execution error",
        }),
        outcome: "non_blocking_error",
        hook: hook,
      }
    );
  }
}
/**
 * 执行 SDK callback 钩子（hook.callback），结果经 processHookJSONOutput 处理；internal 钩子不产生成功消息。
 */
//@ chunk-e6aww6q8.js:3572702-3573305 fingerprint = executeHookCallback (0.848)
async function executeHookCallback({
  toolUseID: toolUseID,
  hook: hook,
  hookEvent: hookEvent,
  hookInput: hookInput,
  signal: signal,
  hookIndex: hookIndex,
  toolUseContext: toolUseContext,
}) {
  let context = toolUseContext
      ? {
          getAppState: toolUseContext.getAppState,
          applyAttributionOp: toolUseContext.applyAttributionOp,
          session: toolUseContext.session,
          storageV5: toolUseContext.storageV5,
        }
      : void 0,
    json = await hook.callback(hookInput, toolUseID, signal, hookIndex, context);
  if (isSyncHookJSONOutput_2(json)) return { outcome: "success", hook: hook };
  let processed = processHookJSONOutput({
      json: json,
      command: "callback",
      hookName: `${hookEvent}:Callback`,
      toolUseID: toolUseID,
      hookEvent: hookEvent,
      expectedHookEvent: hookEvent,
      stdout: void 0,
      stderr: void 0,
      exitCode: void 0,
    }),
    { message: message, ...Z } = processed;
  return {
    ...Z,
    ...(!(
      hook.internal === !0 &&
      message?.type === "attachment" &&
      message.attachment.type === "hook_success"
    ) && { message: message }),
    outcome: "success",
    hook: hook,
  };
}
//@ chunk-e6aww6q8.js:3573305-3573644 layout
function getHookNameForTelemetry(e, n) {
  if (!n) return e;
  if (isToolDetailsLoggingEnabled()) return `${e}:${n}`;
  switch (e) {
    case "PreToolUse":
    case "PostToolUse":
    case "PostToolUseFailure":
    case "PermissionRequest":
    case "PermissionDenied":
      return `${e}:${sanitizeToolNameForAnalytics(n)}`;
    case "Elicitation":
    case "ElicitationResult":
      return `${e}:mcp_server`;
    case "SubagentStart":
    case "SubagentStop":
      return e;
    default:
      return `${e}:${n}`;
  }
}
/**
 * 把匹配的钩子定义转成遥测用的 {type, command|prompt|name}。
 */
//@ chunk-e6aww6q8.js:3573644-3574174 fingerprint = getHookDefinitionsForTelemetry (0.758)
function getHookDefinitionsForTelemetry(matchedHooks) {
  return matchedHooks.map(({ hook: hook }) => {
    if (hook.type === "command") return { type: "command", command: getHookDisplayText(hook) };
    else if (hook.type === "prompt") return { type: "prompt", prompt: hook.prompt };
    else if (hook.type === "http") return { type: "http", command: hook.url };
    else if (hook.type === "mcp_tool") return { type: "mcp_tool", command: `${hook.server}/${hook.tool}` };
    else if (hook.type === "script") return { type: "script", command: getHookDisplayText(hook) };
    else if (hook.type === "function") return { type: "function", name: "function" };
    else if (hook.type === "callback") return { type: "callback", name: "callback" };
    return { type: "unknown" };
  });
}
/**
 * PowerShell 钩子里把 ${CLAUDE_PROJECT_DIR} 等改写为 ${env:…}。
 */
//@ chunk-e6aww6q8.js:3574174-3574322 affinity
function toPowerShellEnvRefs(e) {
  for (let n of ["CLAUDE_PROJECT_DIR", "CLAUDE_PLUGIN_ROOT", "CLAUDE_PLUGIN_DATA"])
    e = e.replaceAll("${" + n + "}", () => "${env:" + n + "}");
  return e;
}
//@ chunk-7a5rgqvc.js:448-499 placement
class I7o extends Error {
  name = "NoAnswerInTimeError";
}
//@ chunk-7a5rgqvc.js:499-557 placement
var a = ["projectSettings", "flagSettings", "policySettings"];
/**
 * 取钩子来源标签：插件钩子运行器存在时，返回设置来源或由运行器持有的插件 id。
 */
//@ chunk-7a5rgqvc.js:557-813 placement
function getHookOriginLabel(o) {
  let n = getPluginHookRunner();
  if (n === void 0) return;
  let t = "settingsSource" in o ? a.find((e) => e === o.settingsSource) : void 0;
  if (t !== void 0) return { settingsSource: t };
  return "pluginId" in o && typeof o.pluginId === "string" && n.holds(o.pluginId)
    ? { pluginId: o.pluginId }
    : void 0;
}
/**
 * 钩子是否可预过滤：command 类型，或没有带内容 if 条件的 prompt 类型。
 */
//@ chunk-7a5rgqvc.js:813-922 placement
function isPrefilterableHook(o) {
  return (
    o.type === "command" ||
    (o.type === "prompt" && (o.if === void 0 || permissionRuleValueFromString(o.if).ruleContent === void 0))
  );
}
/**
 * 收集各设置来源中插件运行器提供的钩子，按停用状态跳过项目或设备级来源；全部钩子被禁用时返回空。
 */
//@ chunk-7a5rgqvc.js:922-1091 placement
function getPluginSettingsHooks(o) {
  let n = getPluginHookRunner();
  if (n === void 0 || shouldDisableAllHooksIncludingManaged()) return [];
  let t = areDeviceHooksStoodDown();
  return a.flatMap((e) =>
    (e === "projectSettings" ? areRepoHooksElsewhereStoodDown() : t && e !== "policySettings")
      ? []
      : n.settingsHooks(e, o),
  );
}
//@ chunk-7a5rgqvc.js:1091-1256 placement
var CLOUD_HOOK_UNSUPPORTED_REASON =
    "a cloud session does not run command, script, HTTP or MCP tool hooks from the shared server it runs on",
  c = new Set(["prompt", "agent", "callback", "function"]);
//@ chunk-7a5rgqvc.js:1256-1291 placement
function H(o) {
  return c.has(o.type);
}
/**
 * 云会话中只保留 prompt/agent/callback/function 钩子（及可信来源的 command）。
 */
//@ chunk-7a5rgqvc.js:1291-1460 placement
function filterHooksForCloudSession(o) {
  if (!isDiskless()) return o;
  return o.flatMap((n) => {
    let t = getHookOriginLabel(n) !== void 0,
      filtered = n.hooks.filter((hook) => H(hook) || (t && hook.type === "command"));
    return filtered.length > 0 ? [{ ...n, hooks: filtered }] : [];
  });
}
//@ chunk-7a5rgqvc.js:1460-1534 placement
var m = { command: "command", script: "script", http: "HTTP", mcp_tool: "MCP tool" };
//@ chunk-7a5rgqvc.js:1534-1755 placement
function denyPermissionRequestHookInCloud(o) {
  return {
    permissionRequestResult: {
      behavior: "deny",
      message: `The PermissionRequest ${m[o.type] ?? o.type} hook can't run in this cloud session, so this permission request is denied.`,
    },
    outcome: "blocking",
    hook: o,
  };
}
//@ chunk-7a5rgqvc.js:1755-1818 placement
function getHooksForEvent(o, n) {
  return filterHooksForCloudSession(getRegisteredEventHooks(o, n?.withoutCheckoutHooks === !0));
}
/**
 * 汇总某事件已注册的钩子：快照中的设置钩子、插件设置钩子、主线程代理钩子与注册钩子（按插件状态、托管独占、设备钩子停用与已同步插件是否使用过滤）。
 */
//@ chunk-7a5rgqvc.js:1818-2304 placement
function getRegisteredEventHooks(o, n) {
  if (isCustomizationDisabled("hooks")) return [];
  let filtered = (getRegisteredHooks()?.[o] ?? []).filter(
    (i) => !(o === "SessionEnd" && "pluginRoot" in i && isSyncedPluginDirUnused(i.pluginRoot)),
  );
  if (shouldDisableAllHooksIncludingManaged())
    return filtered.filter((i) => !("pluginRoot" in i) && !("deviceOwner" in i));
  let managedState = d(),
    { managedOnly: managedOnly, managedPluginIds: managedPluginIds } = managedState,
    deviceHooksStoodDown = areDeviceHooksStoodDown(),
    runner = getPluginHookRunner(),
    snapshotHooks = getHooksConfigFromSnapshot()?.[o] ?? [];
  return [
    ...(n ? withoutCheckoutSettingsHooks(snapshotHooks, o) : snapshotHooks),
    ...getPluginSettingsHooks(o),
    ...(managedOnly ? [] : (getMainThreadAgentHooks()?.[o] ?? [])),
    ...filtered.filter((i) =>
      isPluginMatcherAllX(i) && runner?.holds(i.pluginId) === !0
        ? !(shouldHoldDeviceHooksByPolicy() && !managedPluginIds?.has(i.pluginId))
        : (!("pluginRoot" in i) || u(i.pluginId, managedState)) &&
          !(deviceHooksStoodDown && "deviceOwner" in i),
    ),
  ];
}
//@ chunk-7a5rgqvc.js:2304-2322 placement
var weakMap = new WeakMap();
//@ chunk-7a5rgqvc.js:2322-2351 placement
function vmi(o, n) {
  weakMap.set(o, n);
}
//@ chunk-7a5rgqvc.js:2351-2392 placement
function O7o(o) {
  return weakMap.get(o)?.() === !0;
}
//@ chunk-7a5rgqvc.js:2392-2424 placement
function kmi(o) {
  return weakMap.has(o);
}
/**
 * 过滤会话钩子 matcher：插件持有的技能钩子只在全部为可预过滤类型且未停用时保留（标记 pluginId）；策略要求跳过时只保留特定提示钩子。
 */
//@ chunk-7a5rgqvc.js:2424-2745 placement
function filterSessionHookMatchers(o, n) {
  let t = getPluginHookRunner();
  return filterHooksForCloudSession(
    o.flatMap((e) => {
      if (e.skillRoot === void 0 || t?.holds(e.skillRoot) !== !0) {
        if (!n) return [e];
        let filtered = e.hooks.filter((hook) => hook.type === "prompt" && O7o(hook));
        return filtered.length > 0 ? [{ ...e, hooks: filtered }] : [];
      }
      return e.hooks.every(isPrefilterableHook) &&
        !t.standsDown(e.skillRoot) &&
        !shouldDisableAllHooksIncludingManaged() &&
        !shouldHoldDeviceHooksByPolicy()
        ? [{ ...e, pluginId: e.skillRoot }]
        : [];
    }),
  );
}
//@ chunk-7a5rgqvc.js:2745-2802 fingerprint = getHooksConfig (0.848)
function isPluginMatcherAllX(o) {
  return "pluginRoot" in o && o.hooks.every(isPrefilterableHook);
}
/**
 * 插件 id 是否为组织托管插件。
 */
//@ chunk-7a5rgqvc.js:2802-2832 layout
function isManagedPluginId(o) {
  return BPe(o);
}
//@ chunk-7a5rgqvc.js:2832-2909 placement
function d(o = shouldAllowManagedHooksOnly()) {
  return { managedOnly: o, managedPluginIds: o && !isSafeMode() ? getPolicyAllowedSet() : null };
}
//@ chunk-7a5rgqvc.js:2909-2983 placement
function u(o, { managedOnly: managedOnly, managedPluginIds: managedPluginIds }) {
  return !managedOnly || managedPluginIds?.has(o) === !0;
}
//@ chunk-7a5rgqvc.js:2983-3017 placement
function zlr(o) {
  return u(o, d(!0));
}
//@ chunk-7a5rgqvc.js:3017-3063 placement
function Klr(o) {
  return oae() && !policySettingsUnreadable() && u(o, d());
}
//@ chunk-7a5rgqvc.js:3063-3111 placement
function oae() {
  return !isCustomizationDisabled("hooks") && !shouldDisableAllHooksIncludingManaged() && !isSafeMode();
}
/**
 * 是否为内部 callback 钩子（hook.internal=true），内部钩子不计入用户钩子遥测。
 */
//@ chunk-4nwcj4sh.js:6631-6701 fingerprint = isInternalHook (1)
function isInternalHook(matched) {
  return matched.hook.type === "callback" && matched.hook.internal === !0;
}
/**
 * claude mcp serve --transport http 下只保留内部钩子，丢弃设置/插件钩子并记日志与事件。
 */
//@ chunk-4nwcj4sh.js:6701-6997 sole-consumer
function dropHooksInHttpServe(e, n) {
  if (isHttpMcpServeInvocation()) {
    let filtered = e.filter(isInternalHook),
      i = e.length - filtered.length;
    if (i > 0)
      (logForDebugging(
        `Hooks: ${i} ${n} ${plural(i, "hook")} from settings or plugins not run: claude mcp serve --transport http never runs them (intended)`,
        { level: "warn" },
      ),
        logFeatureSad(hookFeature(n), "not_run_in_tool_server_daemon", { num_dropped: i }));
    return filtered;
  }
  return e;
}
//@ chunk-rxmpx0xj.js:827-882 fingerprint = getHookTypeCounts (0.698)
function hasNonInternalHook(hooks) {
  return hooks.hooks.some((hook) => !isInternalHook({ hook: hook }));
}

export {
  oae,
  executePermissionRequestHooks,
  managedTierHooks,
  hasSettingsHookForEvent,
  evaluateHookIfPattern,
  execPluginCommandHook,
  GUARD_AND_FEEDBACK_EVENTS,
  HOOK_CHECK_UNAVAILABLE_MESSAGE,
  Klr,
  shouldSkipHookDueToTrust,
  hasHookForEvent_2,
  executeSubagentStartHooks,
  getNonBlockableHookErrorMessage,
  executeStopHooks,
  hasHookForEvent,
  setSessionEndRaiser,
  executeNotificationHooks,
  zlr,
  getSessionEndHookTimeoutMs,
  executeSessionEndHooks,
  createBaseHookInput,
  executeStatusLineCommand,
  flushPendingAsyncRewakeHooks,
  executeDirectoryAddedHooks,
  executeInBackground,
  executeFileSuggestionCommand,
  hasToolHookMatching,
  isFreshHeronEnabled,
  executePostToolBatchHooks,
  executeStopFailureHooks,
  MANAGED_HOOKS_TIER,
  executeUserPromptSubmitHooks,
  getUserPromptSubmitHookBlockingMessage,
  getStopHookMessage,
  executeUserPromptExpansionHooks,
  executeConfigChangeHooks,
  hasBlockingResult,
  hasInstructionsLoadedHook,
  executeInstructionsLoadedHooks,
  settingsSourcesInReach,
  userPromptSubmitHooksKey,
  isPrefilterableHook,
  getHooksForEvent,
  hookMatcherMatches,
  dispatchesWorktreeCreate,
  executeWorktreeCreateHook,
  executeWorktreeRemoveHook,
  executePostCompactHooks,
  executePreCompactHooks,
  PRE_TOOL_HOOK_ERROR_PREFIX_RE,
  preToolUseMatcherListedTools,
  preToolUseMatcherCoversTool,
  executeElicitationHooks,
  executeElicitationResultHooks,
  hasOnlyOwnCallbacksToRun,
  getCloudDeferUnsupportedMessage,
  executePermissionDeniedHooks,
  vmi,
  executePreToolHooks,
  emitHookMetrics,
  SAFE_CALLER_ID,
  isElicitationFailureExit,
  PROMPT_GUARD_EVENTS,
  blocksWhenItCannotRunElsewhere,
  parseHookOutput,
  refreshModAdmission,
  MODS_POLICY_UNKNOWN_REASON,
  notifyModsRejudged,
  HookAdmissionError,
  getPreToolStageOrder,
  NotOrganizationPluginError,
  admissionChangedListener,
  HookAdmissionRefusal,
  HOOKS_POLICY_UNREADABLE_MESSAGE,
  HOOKS_PENDING_POLICY_MESSAGE,
  HOOKS_SKIPPED_AT_START_MESSAGE,
  SESSION_START_HOOKS_SKIPPED_REASON,
  hasConfiguredHooksForEvent,
  RESTRICT_PERSONAL_CONFIG_REASON,
  getPreToolHookBlockingMessage,
  executeTaskCreatedHooks,
  getTaskCreatedHookMessage,
  executeFileChangedHooks,
  executeCwdChangedHooks,
  executeSessionStartHooks,
  executeSetupHooks,
  CLOUD_HOOK_UNSUPPORTED_REASON,
  hookInputCwd,
  executeHooks,
  collectPreToolHookPass,
  executePostToolHooks,
  executePostToolUseFailureHooks,
  moduleUnadmittedListener,
  executeTaskCompletedHooks,
  getTaskCompletedHookMessage,
  executeTeammateIdleHooks,
  getTeammateIdleHookMessage,
  forwardedUnderMatchingToolName,
  execCommandHookForDevice,
  buildPromptBlockOutput,
  parseHttpHookOutput,
  exitTwoMeansMissingScript,
  announcedAsync,
  dropSuspectCaptureJson,
  getUntrustedCaptureReason,
  withHookStderr,
  evaluateHookIfCondition,
  hasNonInternalHook,
  executeUserPromptSubmitHooksForSession,
  rejudgeLoadedMods,
  O7o,
  hookMatchQuery,
};
