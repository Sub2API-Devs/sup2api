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
import { randomUUID } from "crypto";
import { isAbsolute, resolve as resolve_2, basename, win32 } from "path";
import { spawn } from "child_process";
import { homedir, tmpdir as tmpdir_2 } from "os";
import { stat } from "fs/promises";
import { isDeepStrictEqual } from "util";
import {
  getPluginHookRunner,
  isDiskless,
  getRegisteredHooks,
  isSyncedPluginDirUnused,
  getMainThreadAgentHooks,
  getMcpClientsFromAccessor,
  getEnsureConnectedClient,
  getRootSession,
  getSessionCronTasks,
  getIsNonInteractiveSession,
  getMainThreadAgentType,
  getPromptId as getPromptId_2,
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
} from "../bootstrap/state.js";
import {
  permissionRuleValueFromString,
  canonicalToolName,
  legacyToolNamesFor,
  toolNameVariants,
  aliasesFor,
} from "./permissions/permissionRuleParser.js";
import {
  shouldDisableAllHooksIncludingManaged,
  areDeviceHooksStoodDown,
  areRepoHooksElsewhereStoodDown,
  getHooksConfigFromSnapshot,
  withoutCheckoutSettingsHooks,
  shouldHoldDeviceHooksByPolicy,
  shouldAllowManagedHooksOnly,
  policySettingsUnreadable,
  getPolicyHooksFromSnapshot,
  getUserHooksFromSnapshot,
  shouldSkipSessionHooksByPolicy,
  shouldAllowManagedHooksOnlyByPolicy,
  neverSkipSessionHooks,
  noSnapshotOverride,
  getEffectiveStatusLine,
} from "./hooks/hooksConfigSnapshot.js";
import { isCustomizationDisabled } from "./settings/customizationDisabled.js";
import { isVouchedPolicyPluginId } from "./plugins/managedPlugins.js";
import { isSafeMode } from "./envUtils.js";
import { getPolicyAllowedSet } from "./plugins/pluginPolicy.js";
import { isHttpMcpServeInvocation } from "../entrypoints/mcpServeArgs.js";
import { logForDebugging, createAttachmentMessage_2 } from "./debug.js";
import {
  plural,
  stripPrefix,
  truncateToLength,
  truncateWithCount,
  getFirstLine,
  escapeControlCharsForDisplay,
} from "./stringUtils.js";
import {
  logFeatureSad,
  hookFeature,
  logFeatureBad,
  logFeatureOk,
} from "../services/analytics/featureTelemetry.js";
import { toolInputOf, toolCallEvent } from "../plugins/functionHooks/sites/toolSites.js";
import {
  MANAGED,
  firstWorktreePathOutput,
  runClassicEventThroughHooks,
  runOutsideReplHookChain,
} from "../plugins/functionHooks/classicHookBridge.js";
import { stableStringifySafe } from "./hooks/hookSerialization.js";
import { createStepRecorder, ENGINE } from "../plugins/functionHooks/dispatch/chain.js";
import { CORE_ORIGIN } from "../plugins/functionHooks/eventPatterns.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { HooksError } from "../plugins/functionHooks/hooksErrors.js";
import { createValueSlot } from "./valueSlot.js";
import { getPluginRegistry } from "./plugins/pluginLoadState.js";
import { isModuleAdmitted } from "./plugins/functionHooks/admission.js";
import { logError } from "./log.js";
import { managedMarketplaceAnswerFlag } from "./plugins/marketplaceNames.js";
import {
  managedModsPolicyKey,
  canSkipEmptyClassicDispatch,
  dispatchClassicEvent,
} from "../plugins/functionHooks/modAdmission.js";
import { isProMaxWithoutSettings } from "../services/remoteManagedSettings/seating.js";
import { withDeadline, sleep, systemClock } from "./sleep.js";
import { ORGANIZATION_ANSWER_POLL_MS } from "./plugins/commandSource.js";
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
  emptyHookOutputState,
  scanHookOutputMarkers,
  strongerExitStatus,
} from "./hooks/hookOutputParsing.js";
import { jsonStringify, jsonParse, slowLogging, jsonParseRaw } from "./slowOperations.js";
import {
  restrictHookOutputForMcpInbound,
  anyTrustedMemoryToolSafe,
  MAX_HOOK_METRIC_KEYS,
  getToolNameField,
  hookInputSummary,
  writeHistoryEntry,
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
import { hasBackgroundBashWork } from "../tools/AgentTool/backgroundGates.js";
import {
  isConsultHook,
  hookTimeoutMs,
  MAX_CONCURRENT_HOOKS,
  runHooksWithConcurrencyLimit,
  hookSlotsRegistry,
} from "./hooks/hookConcurrency.js";
import { endActivity, startSessionActivity } from "./sessionActivity.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import {
  isRunnerDynamicServer,
  sanitizeToolNameForAnalytics,
  isToolDetailsLoggingEnabled,
} from "../services/analytics/metadata.js";
import { isCliOwnedConfig } from "../services/mcp/cliOwnedClients.js";
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
import { HOOK_EVENT_NAMES, hooksSettingForEvent } from "./hooks/hookEventSets.js";
import { getConnectionTimeoutMs } from "../services/mcp/client.js";
import { isConnectedOrCached } from "../skills/bundled/scheduleRemoteAgents.js";
import { createCombinedAbortSignal } from "./combinedAbortSignal.js";
import {
  isMemoryToolServer_2,
  MEMORY_CALLER_META_KEY,
  truncateMiddle as truncateMiddle_2,
} from "../memdir/memoryTool.js";
import {
  isMemoryToolAllowed,
  accountMemoryServerState,
} from "../services/accountMemory/accountMemoryServer.js";
import { subagentMemoryMode } from "../services/accountMemory/memoryContext.js";
import { callMcpTool } from "../services/mcp/mcpWireUtils.js";
import { uniq, count } from "./collections.js";
import { isDelegatedObservationContext, mainAgentContext, isSubagentContext } from "./agentContext.js";
import { RESULT_LIMIT_COUNT } from "../constants/outputLimits.js";
import {
  logHookExecutionFailure,
  enqueueHookTaskNotification,
  scrubHookOutputTags_2,
  scrubHookOutputTags,
  trackRunningHooks,
  hostNoResponseMessage,
  sanitizeHostPermissionDisplay,
} from "./hooks/hookMessages.js";
import { invalidateSessionEnvCache, getHookEnvFilePath } from "./sessionEnvironment.js";
import { subscribe } from "../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { identityAgentId, HOOK_AGENT_ID_PREFIX } from "./agentId.js";
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
import { reportPreToolUseChainFailure } from "../plugins/functionHooks/sites/siteRules.js";
import {
  getToolPermissionContext,
  isSessionHoldFor,
  getEffortLayerOverride,
} from "./permissions/toolPermissionContext.js";
import {
  isBypassPermissionsInEffect,
  holdToolCallForHookPolicy,
  reconcileHeldHookResults,
  withHeldPermissionBehavior,
  maybeWaitForHookPolicy,
} from "./hooks/hookPolicyHold.js";
import { findToolByName, getRemoteHookRunner } from "../Tool.js";
import { registerAgent } from "./telemetry/perfettoTracing.js";
import { sameMessageOrShape } from "../plugins/functionHooks/sites/sessionSites.js";
import { hasModuleHookingSite } from "../plugins/hooksModules/loadedModuleFilters.js";
import { isPlainObject as isPlainObject_5 } from "./isPlainObject.js";
import { mcpServerIdentityForHooks } from "../services/mcp/fileReference/fileReferencePolicy.js";
import {
  hasWorktreeCreateHook,
  hasWorktreeRemoveHook as hasWorktreeRemoveHook_2,
} from "./hooks/worktreeHooks.js";
import { hasClassicHookSite, isClassicHooked } from "../plugins/functionHooks/toolCallHooks.js";
import { getCwd, getCwdOrNull } from "./cwd.js";
import { getSessionProject, SessionRootSlot, isNoProjectDirectoryError } from "../bootstrap/sessionSlices.js";
import { preferRemoteValue, runInRemoteCallFrameMain } from "../remote/remoteMode.js";
import {
  hasWorktreeRemoveHook,
  emitHookResponse,
  promptEndingFields,
  emitHookStarted,
  shouldRunSessionEndHook,
} from "../entrypoints/sdk/coreSchemas.js";
import { pathPresence, pathExists } from "./fsSafety/atomicWriteStaging.js";
import { printableLabel } from "./printableName.js";
import { withHostEnvRestored, hostWrittenEnvNames } from "./settings/hostEnvWrites.js";
import {
  isSyncHookJSONOutput,
  hookJSONOutputSchema,
  isAsyncHookJSONOutput,
  isSyncHookJSONOutput_2,
} from "../types/hooks.js";
import {
  detectMissingHookScript,
  rememberBounded,
  rememberedScriptsRegistry,
  describeNoBashFallback,
  mergeHookEnv,
  INSTALL_GIT_FOR_WINDOWS,
  NO_BASH_FIX_HINT,
  expandHookPathVariables,
  hookScriptInReach,
  mergeHookEnv_2,
  resolveHookProgramOnPath,
  resolveOptions,
  realpathAllowMissing,
  resolveProgramOnPathInReach,
  resolveHookCommand,
  EMPTY_PATH_DIR,
} from "./hooks/hookCommandResolution.js";
import { isProjectScopeTrustAccepted, checkHasTrustDialogAccepted } from "./config.js";
import { resolveEffortLevel, modelSupportsEffort, getEffortLevelOrHigh } from "./effort.js";
import { isScratchpadEnabled, getScratchpadDir } from "./permissions/filesystem.js";
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
  hookInputSizeLimit,
  isGuardedHookEvent,
  isVastPlatypusOn,
  isQuietHopcroftGateOn,
  hookResolutionFaultMessage,
  pluginHookRefusal,
  describeKillSwitchedHook,
  unserializableInputBlockMessage,
  hasPolicySetting,
  resolveFileSuggestionHook,
} from "./hooks/hookPolicy.js";
import { getHookDisplayText, getHookStatusText, getHookProgressDisplay } from "./hooks/hooksSettings.js";
import { removeClaudeCodeHintLines } from "./claudeCodeHints.js";
import { isDisklessSession as isDisklessSession_2 } from "./disklessSession.js";
import { getPlatform } from "./platform.js";
import { defaultShellKind } from "./shell/shellToolUtils.js";
import {
  loadPluginOptions,
  hasUserConfigVariables,
  substituteUserConfigVariables,
} from "./plugins/pluginOptionsStorage.js";
import { stripShellQuotes, prependDirToPathEnv } from "./path.js";
import {
  isRewrittenInput,
  markRewrittenInput,
  unmarkRewrittenInput,
  rewriteInputIfMarked,
  applyRemoteHookInputRewrite,
} from "./hooks/hookInputRewrite.js";
import { subprocessEnv, hipaaWithholdsChildCredentials } from "./subprocessEnv.js";
import { hostOwnedEnvNames } from "./plugins/securityDefaultPlugin.js";
import { getGlobBaseDirectory } from "./shell/bashProvider.js";
import { claudeSubprocessEnv, claudeEnvContextFrom } from "./claudeSubprocessEnv.js";
import { checkPluginBunOptions } from "./permissions/protectedSettingsPaths.js";
import {
  SCRIPT_HOOK_ACK_ENV,
  expandScriptHookPathVars,
  anchorScriptHookPath,
  runScriptHookUnsupported,
} from "./hooks/scriptHooks.js";
import { shellQuoteArgs } from "./bash/bashPipeCommand.js";
import {
  findPowerShellForEnv,
  getWindowsEnvPaths,
  getCachedPowerShellPath,
} from "./shell/powershellDetection.js";
import {
  requiresPowerShellScriptFile,
  requiresScriptFile,
  buildPowerShellCommandArgs,
} from "./shell/powershellProvider.js";
import {
  mayBlockForMissingBash,
  EXIT_CODE_COMMAND_NOT_FOUND,
  hookPathRoots,
  hookProgramLabelForReport,
  blocksWhenNonBlockingError,
  hasBlockingReason,
  isDenyDecisionOutput,
  TREATING_NON_BLOCKING_PREFIX,
  NON_BLOCKING_STATUS_PREFIX,
  summarizeHookFailures,
  applyBlockOnFailure,
} from "./hooks/hookFailures.js";
import { getGitBashPathCached } from "./windowsPaths.js";
import { TaskOutput } from "./task/TaskOutput.js";
import { wrapSpawn } from "./ShellCommand.js";
import {
  monitorCommandAsBash,
  getCommandAndDescription,
  splitToolParentOf,
  splitToolByAction,
} from "./hooks/hookMatchers.js";
import { hookModelMatchKey, isRecognizedModelKey } from "./model/canonicalModelName.js";
import { denyOrAskNamesFor } from "../services/mcp/serverIdentity.js";
import { checkHookMatcherForCloud, MatcherUnsupportableError } from "./hooks/matcherGrammar.js";
import { ANCHORED_ALTERNATION_RE } from "./hooks/functionHookMatchers.js";
import {
  HOOK_NOT_RUN_QUESTIONS,
  hookNotRunNotice,
  READ_LIMIT_BLOCKED_QUESTION,
} from "./hooks/servedHooks/notices.js";
import { normalizeCommandForPlatform, isAbsolutePlatformPath } from "./git.js";
import { SETTING_SOURCES, REPO_DIR_SETTING_SOURCES } from "./settings/constants.js";
import { getLatchedPreSettingsEnvSnapshot, settingsEnvForHookChild } from "./managedEnvApply.js";
import {
  getSettingsForSource,
  getSettingsFilePathForSource,
  getPolicySettingsLoadErrors,
  getSettings_DEPRECATED,
} from "./settings/settings.js";
import { anyPairMatches } from "./settings/stickyRoots.js";
import { PathSpace } from "./resultError.js";
import { joinKeepingTrailingSep } from "./hooks/servedHooks/hostPaths.js";
import { getFsImplementation } from "./fsOperations.js";
import { analyzeHookCommand, POSIX_SEP_2 } from "./hooks/hookCommandAnalysis.js";
import { getLaunchCommand } from "./deepLink/registerProtocol.js";
import { isPersonalConfigRestricted } from "./personalConfigRestriction.js";
import { parseHookJsonOutput } from "./hooks/hookSpecificOutput.js";
import { getProcessEnvForHttpHook, execHttpHook } from "./hooks/execHttpHook.js";
import { loadedManagedKeyGroupsList, markManagedKeyGroup } from "./settings/managedEnvKeys.js";
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
import { shortHash } from "./shortHash.js";
import { resolveHookPermissionResult } from "./hooks/hookPermissionResult.js";
import {
  isWebToolRestrictedInRelay,
  filterPermissionUpdatePayload,
} from "./permissions/permissionRulePayload.js";
import { mcpInfoFromString } from "../services/mcp/mcpStringUtils.js";
import { filterRemoteBrowserAllowUpdates } from "./permissions/mcpRuleMatching.js";
import { hasMcpToolAliases, requiresClassifierForHookAllow } from "./permissions/permissionSetup.js";
import { isAutoClassifierActive } from "./permissions/autoModeState.js";
import { countByPluginKey } from "../services/plugins/pluginOperations.js";
import { hashEntries } from "./model/modelCatalog/maskedIds.js";
import { persistLargeHookOutput, isPersistedHookOutputPath } from "./toolResultStorage.js";
import { isBetaTracingEnabled } from "./telemetry/betaSessionTracing.js";
import { isPerfettoTracingEnabled, startHookSpan, endHookSpan } from "./telemetry/sessionTracing.js";
import { recordPluginActivity } from "./pluginActivity.js";
import { pinHookCommand } from "./hooks/servedHooks/hookPins.js";
import { MAX_TIMER_DELAY_MS } from "./timerDelayClamp.js";
import { execPromptHook } from "./hooks/execPromptHook.js";
import { execAgentHook } from "./hooks/execAgentHook.js";
import { sequential } from "./sequential.js";
import { isFlagSettingsSyncHook } from "./hooks/hookSettingsSources.js";
import { hookSourceOf } from "./hooks/sessionHooks.js";
import { all } from "./generators.js";
import { HOST_CONTEXT_LINE_LIMIT } from "./permissions/classifierHostContext.js";
import { attentionRegistryStore } from "../components/fleet/sessionAttention.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-7a5rgqvc.js:448-499 placement
class NoAnswerInTimeError extends Error {
  name = "NoAnswerInTimeError";
}
//@ chunk-7a5rgqvc.js:499-557 placement
var MANAGED_PRIORITY_SOURCES = ["projectSettings", "flagSettings", "policySettings"];
//@ chunk-7a5rgqvc.js:557-813 placement
/**
 * 取钩子来源标签：插件钩子运行器存在时，返回设置来源或由运行器持有的插件 id。
 */
function getHookOriginLabel(hookGroup) {
  let pluginHookRunner = getPluginHookRunner();
  if (pluginHookRunner === undefined) return;
  let prioritySource =
    "settingsSource" in hookGroup
      ? MANAGED_PRIORITY_SOURCES.find((source) => source === hookGroup.settingsSource)
      : undefined;
  if (prioritySource !== undefined)
    return {
      settingsSource: prioritySource,
    };
  return "pluginId" in hookGroup &&
    typeof hookGroup.pluginId === "string" &&
    pluginHookRunner.holds(hookGroup.pluginId)
    ? {
        pluginId: hookGroup.pluginId,
      }
    : undefined;
}
//@ chunk-7a5rgqvc.js:813-922 placement
/**
 * 钩子是否可预过滤：command 类型，或没有带内容 if 条件的 prompt 类型。
 */
function isPrefilterableHook(hook) {
  return (
    hook.type === "command" ||
    (hook.type === "prompt" &&
      (hook.if === undefined || permissionRuleValueFromString(hook.if).ruleContent === undefined))
  );
}
//@ chunk-7a5rgqvc.js:922-1091 placement
/**
 * 收集各设置来源中插件运行器提供的钩子，按停用状态跳过项目或设备级来源；全部钩子被禁用时返回空。
 */
function getPluginSettingsHooks(event) {
  let pluginHookRunner = getPluginHookRunner();
  if (pluginHookRunner === undefined || shouldDisableAllHooksIncludingManaged()) return [];
  let deviceHooksStoodDown = areDeviceHooksStoodDown();
  return MANAGED_PRIORITY_SOURCES.flatMap((source) =>
    (
      source === "projectSettings"
        ? areRepoHooksElsewhereStoodDown()
        : deviceHooksStoodDown && source !== "policySettings"
    )
      ? []
      : pluginHookRunner.settingsHooks(source, event),
  );
}
//@ chunk-7a5rgqvc.js:1091-1256 placement
var CLOUD_HOOK_UNSUPPORTED_REASON; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CLOUD_SAFE_HOOK_TYPES;
deferInit("chunk-7a5rgqvc.js:1091", () => {
  CLOUD_HOOK_UNSUPPORTED_REASON =
    "a cloud session does not run command, script, HTTP or MCP tool hooks from the shared server it runs on";
  CLOUD_SAFE_HOOK_TYPES = new Set(["prompt", "agent", "callback", "function"]);
});
//@ chunk-7a5rgqvc.js:1256-1291 placement
function isCloudSafeHook(hook) {
  return CLOUD_SAFE_HOOK_TYPES.has(hook.type);
}
//@ chunk-7a5rgqvc.js:1291-1460 placement
/**
 * 云会话中只保留 prompt/agent/callback/function 钩子（及可信来源的 command）。
 */
function filterHooksForCloudSession(hookGroups) {
  if (!isDiskless()) return hookGroups;
  return hookGroups.flatMap((group) => {
    let isLabeled = getHookOriginLabel(group) !== undefined;
    let filtered = group.hooks.filter(
      (hook) => isCloudSafeHook(hook) || (isLabeled && hook.type === "command"),
    );
    return filtered.length > 0
      ? [
          {
            ...group,
            hooks: filtered,
          },
        ]
      : [];
  });
}
//@ chunk-7a5rgqvc.js:1460-1534 placement
var HOOK_TYPE_LABELS = {
  command: "command",
  script: "script",
  http: "HTTP",
  mcp_tool: "MCP tool",
};
//@ chunk-7a5rgqvc.js:1534-1755 placement
function denyPermissionRequestHookInCloud(hook) {
  return {
    permissionRequestResult: {
      behavior: "deny",
      message: `The PermissionRequest ${HOOK_TYPE_LABELS[hook.type] ?? hook.type} hook can't run in this cloud session, so this permission request is denied.`,
    },
    outcome: "blocking",
    hook,
  };
}
//@ chunk-7a5rgqvc.js:1755-1818 placement
function getHooksForEvent(event, options) {
  return filterHooksForCloudSession(getRegisteredEventHooks(event, options?.withoutCheckoutHooks === true));
}
//@ chunk-7a5rgqvc.js:1818-2304 placement
/**
 * 汇总某事件已注册的钩子：快照中的设置钩子、插件设置钩子、主线程代理钩子与注册钩子（按插件状态、托管独占、设备钩子停用与已同步插件是否使用过滤）。
 */
function getRegisteredEventHooks(event, skipCheckoutHooks) {
  if (isCustomizationDisabled("hooks")) return [];
  let filtered = (getRegisteredHooks()?.[event] ?? []).filter(
    (group) =>
      !(event === "SessionEnd" && "pluginRoot" in group && isSyncedPluginDirUnused(group.pluginRoot)),
  );
  if (shouldDisableAllHooksIncludingManaged())
    return filtered.filter((group) => !("pluginRoot" in group) && !("deviceOwner" in group));
  let managedState = managedHookState();
  let { managedOnly, managedPluginIds } = managedState;
  let deviceHooksStoodDown = areDeviceHooksStoodDown();
  let runner = getPluginHookRunner();
  let snapshotHooks = getHooksConfigFromSnapshot()?.[event] ?? [];
  return [
    ...(skipCheckoutHooks ? withoutCheckoutSettingsHooks(snapshotHooks, event) : snapshotHooks),
    ...getPluginSettingsHooks(event),
    ...(managedOnly ? [] : (getMainThreadAgentHooks()?.[event] ?? [])),
    ...filtered.filter((group) =>
      isPluginMatcherAllX(group) && runner?.holds(group.pluginId) === true
        ? !(shouldHoldDeviceHooksByPolicy() && !managedPluginIds?.has(group.pluginId))
        : (!("pluginRoot" in group) || isHookAllowedByPolicy(group.pluginId, managedState)) &&
          !(deviceHooksStoodDown && "deviceOwner" in group),
    ),
  ];
}
//@ chunk-7a5rgqvc.js:2304-2322 placement
var weakMap; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7a5rgqvc.js:2304", () => {
  weakMap = new WeakMap();
});
//@ chunk-7a5rgqvc.js:2322-2351 placement
/**
 * 为钩子登记"是否可运行"的判定函数。
 */
function registerHookEligibility(hook, check) {
  weakMap.set(hook, check);
}
//@ chunk-7a5rgqvc.js:2351-2392 placement
/**
 * 判断钩子的可运行判定是否返回真。
 */
function isHookEligible(hook) {
  return weakMap.get(hook)?.() === true;
}
//@ chunk-7a5rgqvc.js:2392-2424 placement
function hasHookEligibility(hook) {
  return weakMap.has(hook);
}
//@ chunk-7a5rgqvc.js:2424-2745 placement
/**
 * 过滤会话钩子 matcher：插件持有的技能钩子只在全部为可预过滤类型且未停用时保留（标记 pluginId）；策略要求跳过时只保留特定提示钩子。
 */
function filterSessionHookMatchers(groups, skipSessionHooks) {
  let pluginHookRunner = getPluginHookRunner();
  return filterHooksForCloudSession(
    groups.flatMap((group) => {
      if (group.skillRoot === undefined || pluginHookRunner?.holds(group.skillRoot) !== true) {
        if (!skipSessionHooks) return [group];
        let filtered = group.hooks.filter((hook) => hook.type === "prompt" && isHookEligible(hook));
        return filtered.length > 0
          ? [
              {
                ...group,
                hooks: filtered,
              },
            ]
          : [];
      }
      return group.hooks.every(isPrefilterableHook) &&
        !pluginHookRunner.standsDown(group.skillRoot) &&
        !shouldDisableAllHooksIncludingManaged() &&
        !shouldHoldDeviceHooksByPolicy()
        ? [
            {
              ...group,
              pluginId: group.skillRoot,
            },
          ]
        : [];
    }),
  );
}
//@ chunk-7a5rgqvc.js:2745-2802 fingerprint = getHooksConfig (0.848)
function isPluginMatcherAllX(group) {
  return "pluginRoot" in group && group.hooks.every(isPrefilterableHook);
}
//@ chunk-7a5rgqvc.js:2802-2832 layout
/**
 * 插件 id 是否为组织托管插件。
 */
function isManagedPluginId(pluginId) {
  return isVouchedPolicyPluginId(pluginId);
}
//@ chunk-7a5rgqvc.js:2832-2909 placement
function managedHookState(managedOnly = shouldAllowManagedHooksOnly()) {
  return {
    managedOnly,
    managedPluginIds: managedOnly && !isSafeMode() ? getPolicyAllowedSet() : null,
  };
}
//@ chunk-7a5rgqvc.js:2909-2983 placement
function isHookAllowedByPolicy(pluginId, { managedOnly, managedPluginIds }) {
  return !managedOnly || managedPluginIds?.has(pluginId) === true;
}
//@ chunk-7a5rgqvc.js:2983-3017 placement
/**
 * 判断插件钩子在"仅托管"策略下是否允许。
 */
function isManagedHookAllowed(pluginId) {
  return isHookAllowedByPolicy(pluginId, managedHookState(true));
}
//@ chunk-7a5rgqvc.js:3017-3063 placement
/**
 * 判断某来源的钩子当前是否允许运行（钩子总开关与策略）。
 */
function isHookSourceAllowed(pluginId) {
  return (
    areHooksEnabled() && !policySettingsUnreadable() && isHookAllowedByPolicy(pluginId, managedHookState())
  );
}
//@ chunk-7a5rgqvc.js:3063-3111 placement
/**
 * 判断钩子功能总体是否启用（未被设置/策略关闭）。
 */
function areHooksEnabled() {
  return !isCustomizationDisabled("hooks") && !shouldDisableAllHooksIncludingManaged() && !isSafeMode();
}
//@ chunk-4nwcj4sh.js:6631-6701 fingerprint = isInternalHook (1)
/**
 * 是否为内部 callback 钩子（hook.internal=true），内部钩子不计入用户钩子遥测。
 */
function isInternalHook(matched) {
  return matched.hook.type === "callback" && matched.hook.internal === true;
}
//@ chunk-4nwcj4sh.js:6701-6997 sole-consumer
/**
 * claude mcp serve --transport http 下只保留内部钩子，丢弃设置/插件钩子并记日志与事件。
 */
function dropHooksInHttpServe(hooks, hookEvent) {
  if (isHttpMcpServeInvocation()) {
    let filtered = hooks.filter(isInternalHook);
    let droppedCount = hooks.length - filtered.length;
    if (droppedCount > 0) {
      logForDebugging(
        `Hooks: ${droppedCount} ${hookEvent} ${plural(droppedCount, "hook")} from settings or plugins not run: claude mcp serve --transport http never runs them (intended)`,
        {
          level: "warn",
        },
      );
      logFeatureSad(hookFeature(hookEvent), "not_run_in_tool_server_daemon", {
        num_dropped: droppedCount,
      });
    }
    return filtered;
  }
  return hooks;
}
//@ chunk-rxmpx0xj.js:827-882 fingerprint = getHookTypeCounts (0.698)
function hasNonInternalHook(results) {
  return results.hooks.some(
    (hook) =>
      !isInternalHook({
        hook,
      }),
  );
}
//@ chunk-e6aww6q8.js:743796-743834 sole-consumer
var PERMISSION_DECISION_RANK = {
  deny: 3,
  ask: 2,
  allow: 1,
  none: 0,
};
//@ chunk-e6aww6q8.js:743834-744006 affinity
function keepAskAndContext(pass) {
  let kept =
    pass.ask === undefined
      ? {}
      : {
          ask: pass.ask,
        };
  if (pass.updatedInput) kept.updatedInput = pass.updatedInput;
  if (pass.additionalContext) kept.additionalContext = pass.additionalContext;
  return kept;
}
//@ chunk-e6aww6q8.js:744006-744067 fingerprint = getPreToolHookBlockingMessage (1)
function getPreToolHookBlockingMessage(hookName, blockingError) {
  return `${hookName} hook error: ${blockingError.blockingError}`;
}
//@ chunk-e6aww6q8.js:744067-744161 layout
/**
 * 匹配「PreToolUse:<tool> hook error: [...]: 」前缀的正则，用于剥离嵌套错误前缀。
 */
var PRE_TOOL_HOOK_ERROR_PREFIX_RE =
  /^(PreToolUse:\S+ hook error: )\[(?:[^[\]]|\[[^[\]]*\])*\]: \s*(?=\S)(?![\s\S]*\]: )/;
//@ chunk-e6aww6q8.js:744161-744309 layout
function getCloudDeferUnsupportedMessage(hookName) {
  return `A PreToolUse hook (${hookName}) deferred this call; deferral is not supported for calls served to a cloud session, so nothing ran.`;
}
//@ chunk-e6aww6q8.js:744309-745372 layout
/**
 * 合并一串 PreToolUse 钩子结果：deny > ask > allow，blockingError 视为 deny，defer 和其他字段转交回调；返回 {deny|ask|allow, updatedInput, additionalContext}。
 */
async function aggregatePreToolHookResults(results, toolName, onExtra) {
  let decision = {
    kind: "none",
  };
  let updatedInput;
  let contexts;
  for await (let item of results) {
    let {
      permissionBehavior,
      hookPermissionDecisionReason,
      heldForServedCall,
      blockingError,
      updatedInput: updatedInput_2,
      rewriterKind,
      additionalContexts,
      permissionDisplay,
      hookPluginId,
      ...extra
    } = item;
    if (blockingError && !(blockingError.hookDidNotFinish && decision.kind === "deny"))
      decision = {
        kind: "deny",
        reason: getPreToolHookBlockingMessage(`PreToolUse:${toolName}`, blockingError),
      };
    let currentRank = PERMISSION_DECISION_RANK[decision.kind];
    switch (permissionBehavior) {
      case "deny":
        if (currentRank < PERMISSION_DECISION_RANK.deny)
          decision = {
            kind: "deny",
            reason: hookPermissionDecisionReason ?? "denied",
          };
        break;
      case "ask":
        if (currentRank < PERMISSION_DECISION_RANK.ask)
          decision = {
            kind: "ask",
            reason: hookPermissionDecisionReason ?? "",
            held: heldForServedCall === true,
          };
        break;
      case "allow":
        if (currentRank < PERMISSION_DECISION_RANK.allow)
          decision = {
            kind: "allow",
          };
        break;
      case "defer":
        onExtra({
          permissionBehavior,
          hookSource: extra.hookSource,
        });
        break;
      case "passthrough":
      case undefined:
        break;
    }
    if (updatedInput_2) updatedInput = updatedInput_2;
    if (additionalContexts && additionalContexts.length > 0)
      contexts = (contexts ?? []).concat(additionalContexts);
    if (Object.keys(extra).some((key) => key !== "hookSource")) onExtra(extra);
  }
  let finalDecision = decision;
  if (finalDecision.kind === "ask" && finalDecision.held)
    onExtra({
      heldForServedCall: true,
      hookPermissionDecisionReason: finalDecision.reason,
    });
  let isDeny = finalDecision.kind === "deny";
  let isAsk = finalDecision.kind === "ask";
  let isAllow = finalDecision.kind === "allow";
  let out = isDeny
    ? {
        deny: finalDecision.reason,
      }
    : isAsk
      ? {
          ask: finalDecision.reason,
        }
      : isAllow
        ? {
            allow: true,
          }
        : {};
  if (updatedInput) out.updatedInput = updatedInput;
  if (contexts) out.additionalContext = contexts;
  return out;
}
//@ chunk-e6aww6q8.js:745372-745846 layout
/**
 * 跑一轮 PreToolUse 钩子并收集：合并结果、原样 yields、唯一的 ask、输入改写记录；钩子流抛错时把 deny 原因交给回调后再抛。
 */
async function collectPreToolHookPass(results, tool, onFailure) {
  let yields = [];
  let asks = [];
  let rewrites = [];
  let errors = [];
  let aggregated = await aggregatePreToolHookResults(
    (async function* () {
      try {
        for await (let result of results) {
          if (result.permissionBehavior === "ask") asks.push(result);
          if (result.updatedInput !== undefined)
            rewrites.push({
              kind: result.rewriterKind ?? "remote",
              source: result.hookSource,
            });
          yield result;
        }
      } catch (error) {
        errors.push(error);
      }
    })(),
    tool,
    (result) => {
      yields.push(result);
    },
  );
  if (errors.length > 0) {
    if (typeof aggregated.deny === "string")
      onFailure?.({
        thrown: errors[0],
        deny: aggregated.deny,
      });
    throw errors[0];
  }
  let soleAsk = asks.length === 1 ? asks[0] : undefined;
  return {
    result: aggregated,
    yields,
    ...(soleAsk && {
      soleAsk,
    }),
    ...(rewrites.length > 0 && {
      rewrites,
    }),
  };
}
//@ chunk-e6aww6q8.js:745846-746024 layout
var createCorePreToolStage = (runHooks, hooksExcluded, stepRecorder, onThrown) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  async run(call) {
    let input = toolInputOf(call);
    onThrown(undefined);
    let preToolHookPass = await collectPreToolHookPass(
      runHooks(input, {
        managedHooksExcluded: hooksExcluded(input),
      }),
      call.tool,
      onThrown,
    );
    stepRecorder.keep(input, preToolHookPass);
    return preToolHookPass.result;
  },
});
//@ chunk-e6aww6q8.js:746024-746431 layout
function mergePreToolStageResults(first, second) {
  let secondHasDeny = typeof second.deny === "string";
  let secondHasAsk = typeof second.ask === "string";
  let deny = secondHasDeny ? second.deny : first.deny;
  let ask = secondHasAsk ? second.ask : first.ask;
  let hasDeny = typeof deny === "string";
  let hasAsk = typeof ask === "string";
  let allowed = first.allow === true || second.allow === true;
  let out = hasDeny
    ? {
        deny,
      }
    : hasAsk
      ? {
          ask,
        }
      : allowed
        ? {
            allow: true,
          }
        : {};
  let updatedInput = second.updatedInput ?? first.updatedInput;
  if (updatedInput) out.updatedInput = updatedInput;
  if (first.additionalContext || second.additionalContext)
    out.additionalContext = (first.additionalContext ?? []).concat(second.additionalContext ?? []);
  return out;
}
//@ chunk-e6aww6q8.js:746431-746794 layout
var createManagedPreToolStage = (runHooks, managed) => ({
  name: MANAGED,
  isManaged: true,
  budgetMs: 0,
  async run(call, runStage) {
    let input = toolInputOf(call);
    managed.pass ??= await collectPreToolHookPass(
      runHooks(input, {
        managedHooksOnly: true,
      }),
      call.tool,
    );
    let decision = managed.pass.result;
    if (decision.deny !== undefined) return decision;
    let updatedInput = decision.updatedInput;
    managed.passedKey = stableStringifySafe(updatedInput ?? input);
    let stageResult = await runStage(
      updatedInput === undefined ? call : toolCallEvent(call.tool, call.tool_use_id, updatedInput),
    );
    let inputChanged =
      stageResult.updatedInput !== undefined &&
      stableStringifySafe(stageResult.updatedInput) !== managed.passedKey;
    return mergePreToolStageResults(inputChanged ? keepAskAndContext(decision) : decision, stageResult);
  },
});
//@ chunk-e6aww6q8.js:746794-746939 layout
function createManagedStageController(runHooks, pass) {
  let state = {
    pass,
    passedKey: undefined,
  };
  return {
    managed: createManagedPreToolStage(runHooks, state),
    pass: () => state.pass,
    covers: (input) => state.passedKey !== undefined && stableStringifySafe(input) === state.passedKey,
  };
}
//@ chunk-e6aww6q8.js:746939-747101 layout
function createCoreStageController(runHooks, hooksExcluded) {
  let stepRecorder = createStepRecorder();
  let lastFailure;
  return {
    core: createCorePreToolStage(runHooks, hooksExcluded, stepRecorder, (failure) => {
      lastFailure = failure;
    }),
    runs: stepRecorder,
    deniedBefore: (value) =>
      lastFailure !== undefined && typeof value === "object" && value !== null && lastFailure.thrown === value
        ? lastFailure.deny
        : undefined,
  };
}
//@ chunk-e6aww6q8.js:747101-747126 layout
var getPreToolStageOrder = () => [CORE_ORIGIN, MANAGED, ENGINE];
//@ chunk-e6aww6q8.js:747126-747137 layout
var FRESH_HERON_DEFAULT = true;
//@ chunk-e6aww6q8.js:747137-747181 layout
/**
 * GrowthBook 开关 tengu_fresh_heron（默认开）。
 */
var isFreshHeronEnabled = () =>
  getFeatureValue_CACHED_MAY_BE_STALE("tengu_fresh_heron", FRESH_HERON_DEFAULT) !== false;
//@ chunk-e6aww6q8.js:747181-747270 layout
let NotOrganizationPluginError; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:747181", () => {
  NotOrganizationPluginError = class NotOrganizationPluginError extends HooksError {
    constructor(pluginId, detail) {
      super(`${pluginId}: not the organization's plugin: ${detail}`);
    }
  };
});
//@ chunk-e6aww6q8.js:747270-747328 layout
let HookAdmissionError; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:747270", () => {
  HookAdmissionError = class HookAdmissionError extends HooksError {
    constructor(name, detail) {
      super(`${name}: ${detail}`);
    }
  };
});
//@ chunk-e6aww6q8.js:747328-747349 layout
let HookAdmissionRefusal; // deferred: uses HookAdmissionError of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:747328", () => {
  HookAdmissionRefusal = class HookAdmissionRefusal extends HookAdmissionError {};
});
//@ chunk-e6aww6q8.js:747349-747488 layout
var RESTRICT_PERSONAL_CONFIG_REASON =
  "it carries your claude.ai uploads, and this session doesn't let them run in-process hooks (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG)";
//@ chunk-e6aww6q8.js:747488-747501 layout
var moduleUnadmittedListener; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:747488", () => {
  moduleUnadmittedListener = createValueSlot();
});
//@ chunk-e6aww6q8.js:747501-747514 layout
var admissionChangedListener; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:747501", () => {
  admissionChangedListener = createValueSlot();
});
//@ chunk-e6aww6q8.js:747514-747808 layout
function applyAdmissionText(admissionText) {
  let pluginRegistry = getPluginRegistry();
  if (pluginRegistry.admissionText === admissionText) return false;
  pluginRegistry.admissionText = admissionText;
  let filtered = pluginRegistry.loadedModules.filter((loadedModule) => !isModuleAdmitted(loadedModule));
  for (let loadedModule of pluginRegistry.loadedModules.filter(isModuleAdmitted))
    loadedModule.judgedUnder = admissionText;
  for (let loadedModule of filtered)
    try {
      moduleUnadmittedListener.get()?.(loadedModule.name);
    } catch (error) {
      logError(error);
    }
  if (filtered.length === 0) return true;
  try {
    admissionChangedListener.get()?.();
  } catch (error) {
    logError(error);
  }
  return true;
}
//@ chunk-e6aww6q8.js:747808-747879 layout
function computeAdmissionText() {
  if (!managedMarketplaceAnswerFlag()) return null;
  return stableStringifySafe([
    managedModsPolicyKey(),
    shouldAllowManagedHooksOnly(),
    shouldDisableAllHooksIncludingManaged(),
    isProMaxWithoutSettings(),
  ]);
}
//@ chunk-e6aww6q8.js:747879-747929 layout
function refreshModAdmission() {
  let admissionText = computeAdmissionText();
  return admissionText !== null && applyAdmissionText(admissionText);
}
//@ chunk-e6aww6q8.js:747929-748177 layout
var HOOKS_SKIPPED_AT_START_MESSAGE =
  "Mods and hooks you set up didn't run at the start of this session: your organization's settings hadn't been read yet. They run from here on where your organization allows them; hooks that run when a session starts didn't run in this one.";
//@ chunk-e6aww6q8.js:748177-748351 layout
/**
 * 组织设置读不到时，PreToolUse 钩子无法运行的提示文案（调用不被单独放行）。
 */
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
function notifyModsRejudged(tell) {
  let pluginRegistry = getPluginRegistry();
  let any = pluginRegistry.loadedModules.some((loadedModule) => !isModuleAdmitted(loadedModule));
  let firstNotice = any && !pluginRegistry.isJudgedAgainTold;
  pluginRegistry.isJudgedAgainTold = any;
  if (firstNotice) tell(MODS_OFF_POLICY_CHANGED_MESSAGE);
}
//@ chunk-e6aww6q8.js:749551-749767 layout
/**
 * managed settings 指纹变化后重新判定已加载的 mods，超时等待后通知用户被关掉的 mods。
 */
function rejudgeLoadedMods(reload, tell, timeoutMessage) {
  let pluginRegistry = getPluginRegistry();
  if (pluginRegistry.admissionText === null) return null;
  refreshModAdmission();
  if (pluginRegistry.loadedModules.every(isModuleAdmitted)) {
    pluginRegistry.isJudgedAgainTold = false;
    return null;
  }
  return withDeadline(
    Promise.resolve().then(reload).catch(logError),
    ORGANIZATION_ANSWER_POLL_MS,
    timeoutMessage,
  )
    .then(() => notifyModsRejudged(tell))
    .catch(logError);
}
//@ chunk-e6aww6q8.js:749767-749899 layout
var hasConfiguredHooksForEvent = (event) =>
  (getHooksConfigFromSnapshot()?.[event]?.length ?? 0) > 0 ||
  (getMainThreadAgentHooks()?.[event]?.length ?? 0) > 0 ||
  (getRegisteredHooks()?.[event] ?? []).some((entry) => "pluginRoot" in entry || "deviceOwner" in entry);
//@ chunk-e6aww6q8.js:749899-750089 layout
/**
 * 钩子子进程退出后等待 stdio 安静的窗口（500ms）与上限（10s），以及 PROMPT_GUARD_EVENTS（输出不可信时按阻断处理的事件集合）。
 */
var STDIO_QUIET_WINDOW_MS; // deferred: uses GUARD_HOOK_EVENTS (../schemas/hookEntryValidation.js) of its import cycle while loading; runs once the cycle is complete
var STDIO_SETTLE_CAP_MS;
var PROMPT_GUARD_EVENTS;
deferInit("chunk-e6aww6q8.js:749899", () => {
  STDIO_QUIET_WINDOW_MS = 500;
  STDIO_SETTLE_CAP_MS = 1e4;
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
});
//@ chunk-e6aww6q8.js:750089-750383 layout
/**
 * 子进程退出后等 stdout/stderr 结束或安静 quietWindowMs，总时长不超过 capMs；有数据持续到达则继续等。
 */
async function waitForStdioQuiet({
  streamsSettled,
  lastDataAt,
  holdOpen,
  quietWindowMs = STDIO_QUIET_WINDOW_MS,
  capMs = STDIO_SETTLE_CAP_MS,
  arm,
  now = Date.now,
}) {
  let startedAt = now();
  let settled = streamsSettled.then(() => true);
  for (;;) {
    let seenLastData = lastDataAt();
    if ((await withDeadline(settled, quietWindowMs, arm)) || now() - startedAt >= capMs) return;
    if (lastDataAt() !== seenLastData) continue;
    if (holdOpen?.()) continue;
    await new Promise((resolve) => setImmediate(resolve));
    if (lastDataAt() === seenLastData) return;
  }
}
//@ chunk-e6aww6q8.js:750383-750474 layout
function getRunnerJsonStdout(result) {
  let trimmed = result.resultStdout?.trim();
  return trimmed !== undefined && trimmed.startsWith("{") ? trimmed : undefined;
}
//@ chunk-e6aww6q8.js:750474-750558 layout
/**
 * Elicitation/ElicitationResult 钩子以 0、2 以外的码退出。
 */
function isElicitationFailureExit(hookEvent, status) {
  return status !== 0 && status !== 2 && (hookEvent === "Elicitation" || hookEvent === "ElicitationResult");
}
//@ chunk-e6aww6q8.js:750558-750683 layout
/**
 * 判断钩子截获输出是否不可信；Elicitation 系事件非 0/2 退出时改用 stderr 再判一次。
 */
function getUntrustedCaptureReason(result, hookEvent, stdout, reason, reason_2) {
  return (
    checkIncompleteCapture(result, hookEvent, stdout, reason) ??
    (isElicitationFailureExit(hookEvent, result.status)
      ? checkIncompleteCapture(
          {
            ...result,
            resultStdout: undefined,
          },
          hookEvent,
          result.stderr,
          reason_2(result.stderr),
        )
      : undefined)
  );
}
//@ chunk-e6aww6q8.js:750683-751435 layout
/**
 * stdio 未正常结束（stdioIncomplete/closedWithoutEnd）时，若输出不是惰性 JSON，返回拒绝采信的原因字符串。
 */
function checkIncompleteCapture(result, hookEvent, stdout, parsed) {
  if (result.status === 2 || result.aborted === true) return;
  if (result.stdioIncomplete !== true && result.stdioClosedWithoutEnd !== true) return;
  if (
    (parsed !== undefined && isInertHookOutput(parsed, hookEvent, result.status)) ||
    getRunnerJsonStdout(result) !== undefined
  )
    return;
  if (result.stdioClosedWithoutEnd)
    return "hook stdio closed before end-of-stream, so part of its output may have been discarded; refusing to read the capture as a clean verdict";
  if (parsed !== undefined)
    return "hook output parsed as a document that grants, rewrites or injects, but its stdio went quiet before end-of-stream and a dropped later document could have changed it; refusing to honor the suspect capture";
  if (stdout.trim().startsWith("{"))
    return "hook output opens a JSON payload that never completed before its stdio went quiet; refusing to read the partial capture as a verdict";
  return;
}
//@ chunk-e6aww6q8.js:751435-751759 layout
var INERT_TOP_LEVEL_OUTPUT_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var INERT_SPECIFIC_OUTPUT_KEYS;
deferInit("chunk-e6aww6q8.js:751435", () => {
  INERT_TOP_LEVEL_OUTPUT_KEYS = new Set([
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
  ]);
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
});
//@ chunk-e6aww6q8.js:751759-751934 layout
/**
 * 为 UserPromptSubmit/UserPromptExpansion 构造 decision:block + suppressOriginalPrompt 的输出。
 */
function buildPromptBlockOutput(hookEvent, reason) {
  if (hookEvent !== "UserPromptSubmit" && hookEvent !== "UserPromptExpansion") return;
  return {
    decision: "block",
    reason,
    hookSpecificOutput: {
      hookEventName: hookEvent,
      suppressOriginalPrompt: true,
    },
  };
}
//@ chunk-e6aww6q8.js:751934-752144 layout
var CONTEXT_ON_SUCCESS_EVENTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BLOCK_AS_FEEDBACK_EVENTS;
deferInit("chunk-e6aww6q8.js:751934", () => {
  CONTEXT_ON_SUCCESS_EVENTS = new Set([
    "UserPromptSubmit",
    "UserPromptExpansion",
    "SessionStart",
    "PostModelSwitch",
  ]);
  BLOCK_AS_FEEDBACK_EVENTS = new Set([
    "Stop",
    "SubagentStop",
    "StopFailure",
    "TaskCompleted",
    "TeammateIdle",
    "PostToolUse",
    "PostToolUseFailure",
  ]);
});
//@ chunk-e6aww6q8.js:752144-752284 layout
/**
 * exit 2 且 stdio 不完整时，丢弃非惰性的 JSON 答复。
 */
function dropSuspectCaptureJson(result, hookEvent, json) {
  if (
    result.status === 2 &&
    (result.stdioIncomplete === true || result.stdioClosedWithoutEnd === true) &&
    json !== undefined &&
    !isInertHookOutput(json, hookEvent, result.status)
  )
    return;
  return json;
}
//@ chunk-e6aww6q8.js:752284-752904 layout
/**
 * 判断钩子 JSON 输出是否惰性（不批准、不阻断反馈类事件、不 allow/defer、不 accept、不 retry、不注入上下文），惰性输出即使截获不完整也可采信。
 */
function isInertHookOutput(output, hookEvent, status) {
  if ("async" in output) return true;
  if (output.decision === "approve") return false;
  if (output.decision === "block" && BLOCK_AS_FEEDBACK_EVENTS.has(hookEvent)) return false;
  for (let key of Object.keys(output)) if (!INERT_TOP_LEVEL_OUTPUT_KEYS.has(key)) return false;
  let hookSpecificOutput = output.hookSpecificOutput;
  if (hookSpecificOutput === undefined) return true;
  if (
    "permissionDecision" in hookSpecificOutput &&
    (hookSpecificOutput.permissionDecision === "allow" || hookSpecificOutput.permissionDecision === "defer")
  )
    return false;
  if ("decision" in hookSpecificOutput && hookSpecificOutput.decision.behavior === "allow") return false;
  if ("action" in hookSpecificOutput && hookSpecificOutput.action === "accept") return false;
  if ("retry" in hookSpecificOutput && hookSpecificOutput.retry === true) return false;
  if (
    "additionalContext" in hookSpecificOutput &&
    hookSpecificOutput.additionalContext !== undefined &&
    !(status === 0 && CONTEXT_ON_SUCCESS_EVENTS.has(hookEvent))
  )
    return false;
  for (let key of Object.keys(hookSpecificOutput)) if (!INERT_SPECIFIC_OUTPUT_KEYS.has(key)) return false;
  return true;
}
//@ chunk-e6aww6q8.js:752904-752985 layout
/**
 * 守卫类与反馈类事件的并集（去掉 PreToolUse、StopFailure）。
 */
var GUARD_AND_FEEDBACK_EVENTS; // deferred: uses STDIO_QUIET_WINDOW_MS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:752904", () => {
  GUARD_AND_FEEDBACK_EVENTS = new Set(
    [...PROMPT_GUARD_EVENTS, ...BLOCK_AS_FEEDBACK_EVENTS].filter(
      (event) => event !== "PreToolUse" && event !== "StopFailure",
    ),
  );
});
//@ chunk-e6aww6q8.js:752985-753062 fingerprint = hasHookForEvent (0.459)
/**
 * 按代理的 hooks/plugin 决定权限模式（有钩子时用 mj 调整）。旧版名 hasHookForEvent 存疑。
 */
var hasHookForEvent_2 = (agentDefinition, permissionMode) =>
  shouldLoadPermissionRules(agentDefinition.hooks, agentDefinition.plugin)
    ? narrowerMode(agentDefinition.permissionMode, permissionMode)
    : agentDefinition.permissionMode;
//@ chunk-e6aww6q8.js:942378-943416 fingerprint = executeInBackground (0.417)
/**
 * 后台 async 钩子结束后读取 stdout：解析 {async:true} 之后的 JSON 答复，finalize 并返回附件数据；无输出且成功时返回 null。
 */
async function executeInBackground(hook) {
  let { shellCommand } = hook;
  let stdout = await shellCommand.taskOutput.getStdout();
  let stderr = shellCommand.taskOutput.getStderr();
  let { code } = await shellCommand.result;
  let response = {};
  let emptyAnswer = true;
  try {
    let hookJsonReader = createHookJsonReader();
    let syncJsonAnswer = findSyncJsonAnswer(stdout, hookJsonReader);
    if (syncJsonAnswer !== undefined) {
      logForDebugging(`Hooks: Found sync response from ${hook.processId}: ${jsonStringify(syncJsonAnswer)}`);
      let asyncHookOutput = parseAsyncHookOutput(syncJsonAnswer, hook.hookName);
      emptyAnswer = Object.keys(asyncHookOutput).length === 0;
      response = restrictHookOutputForMcpInbound(asyncHookOutput);
    } else if (hasUnparsedJsonLine(stdout, hookJsonReader))
      logForDebugging(
        `Hooks: async hook ${hook.processId} (${hook.hookName}) printed a stdout line that begins with { but no JSON answer could be read. After any {"async":true} line, print one JSON object and nothing else, or put the object on one line.`,
        {
          level: "error",
        },
      );
  } catch (error) {
    logForDebugging(
      `Hooks: Failed to read the JSON answer of ${hook.processId} (${hook.hookName}), so it is dropped: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
  }
  await finalizeHook(hook, code, code === 0 ? "success" : "error");
  if (emptyAnswer && code === 0 && !stderr.trim()) {
    logForDebugging(
      `Hooks: ${hook.processId} (${hook.hookName}) produced no response payload \u2014 skipping attachment`,
    );
    return null;
  }
  return {
    processId: hook.processId,
    response,
    hookName: hook.hookName,
    hookEvent: hook.hookEvent,
    toolName: hook.toolName,
    pluginId: hook.pluginId,
    command: hook.command,
    stdout,
    stderr,
    exitCode: code,
  };
}
//@ chunk-e6aww6q8.js:3409333-3409474 sole-consumer
var HOOK_DISPATCH_HOLD; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var HOOK_KEEPALIVE_SLACK_MS;
var MAX_HOOK_KEEPALIVE_MS;
var noopRelease;
var NON_HOLDING_HOOK_EVENTS;
deferInit("chunk-e6aww6q8.js:3409333", () => {
  HOOK_DISPATCH_HOLD = "hook-dispatch-hold";
  HOOK_KEEPALIVE_SLACK_MS = 60000;
  MAX_HOOK_KEEPALIVE_MS = 1200000;
  noopRelease = () => {};
  NON_HOLDING_HOOK_EVENTS = new Set(["MessageDisplay", "SessionEnd", "PermissionRequest", "Notification"]);
});
//@ chunk-e6aww6q8.js:3409474-3410091 sole-consumer
/**
 * 远程会话开启保活时，在钩子执行期间维持会话活动：按钩子超时与并发批次估算上限时长，返回结束函数。
 */
function startHookKeepalive(hookEvent, hooks, timeoutMs) {
  let holdMs;
  try {
    if (NON_HOLDING_HOOK_EVENTS.has(hookEvent) || !env.CLAUDE_CODE_REMOTE_SEND_KEEPALIVES) return noopRelease;
    if (
      !getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_hook_keepalive_enabled", false) &&
      !hasBackgroundBashWork()
    )
      return noopRelease;
    let maxTimeoutMs = 0;
    let agentHookCount = 0;
    for (let { hook } of hooks) {
      let hookTimeoutMs_2 =
        hook.type === "function"
          ? (hook.timeout ?? timeoutMs)
          : isConsultHook(hook)
            ? hookTimeoutMs(hook, timeoutMs)
            : hook.timeout
              ? hook.timeout * 1000
              : timeoutMs;
      maxTimeoutMs = Math.max(maxTimeoutMs, hookTimeoutMs_2);
      if (isConsultHook(hook)) agentHookCount++;
    }
    let max = Math.max(1, Math.ceil(agentHookCount / MAX_CONCURRENT_HOOKS));
    holdMs = Math.min(
      (maxTimeoutMs + (agentHookCount > 0 ? timeoutMs : 0)) * max + HOOK_KEEPALIVE_SLACK_MS,
      MAX_HOOK_KEEPALIVE_MS,
    );
  } catch (error) {
    logError(error);
    return noopRelease;
  }
  let active = false;
  let timer;
  let release = () => {
    if (!active) return;
    active = false;
    try {
      clearTimeout(timer);
      endActivity("hook_exec", HOOK_DISPATCH_HOLD);
    } catch (error) {
      logError(error);
    }
  };
  try {
    startSessionActivity("hook_exec", HOOK_DISPATCH_HOLD);
    active = true;
    let holdMs_2 = Number.isFinite(holdMs) ? holdMs : MAX_HOOK_KEEPALIVE_MS;
    timer = setTimeout(logKeepaliveExpiry, holdMs_2, release, holdMs_2);
    timer.unref();
    return release;
  } catch (error) {
    logError(error);
    release();
    return noopRelease;
  }
}
//@ chunk-e6aww6q8.js:3410091-3410140 sole-consumer
async function* withFinally(hookResultStream, hookKeepalive) {
  try {
    yield* hookResultStream;
  } finally {
    hookKeepalive();
  }
}
//@ chunk-e6aww6q8.js:3410140-3410220 sole-consumer
function logKeepaliveExpiry(hookEvent, maxMs) {
  logForDiagnosticsNoPII("warn", "session_activity_hook_hold_expired", {
    max_ms: maxMs,
  });
  hookEvent();
}
//@ chunk-e6aww6q8.js:3410220-3410263 sole-consumer
var loadArtifactsMcpModule = () => require("../services/artifacts/artifactsMcpLaptop.js");
//@ chunk-e6aww6q8.js:3410263-3410530 sole-consumer
function refuseArtifactsMcpHook(server, config) {
  return isRunnerDynamicServer(config) ||
    (isCliOwnedConfig(config) && loadArtifactsMcpModule()?.isArtifactsMcpLaptopEntry(config) === true)
    ? `Hooks can't call tools of MCP server '${server}' (the Artifacts MCP server), because a hook's call skips your permission rules. Remove this mcp_tool hook or point it at another server.`
    : null;
}
//@ chunk-e6aww6q8.js:3410530-3410777 sole-consumer
function refuseRemoteBrowserHook(tool) {
  return refusesRemoteBrowserCallOutsideChecks(tool)
    ? `Hooks can't call tools of MCP server '${tool}' (the cloud browser) in this session, because a hook's call skips auto mode's safety check and your approval. Remove this mcp_tool hook or point it at another server.`
    : null;
}
//@ chunk-e6aww6q8.js:3410777-3411230 sole-consumer
/**
 * 把 mcp_tool 钩子参数中的 ${path} 占位按钩子输入取值替换（对象转 JSON），递归处理数组与对象。
 */
function interpolateHookInput(text, hookInput) {
  let readPath = (path) => {
    let cursor = hookInput;
    for (let segment of path.split(".")) {
      if (cursor == null || typeof cursor !== "object") return;
      cursor = cursor[segment];
    }
    return cursor;
  };
  let interpolate = (value) => {
    if (typeof value === "string")
      return value.replace(/\$\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/g, (placeholder, placeholder_2) => {
        let replacement = readPath(placeholder_2);
        if (replacement === undefined || replacement === null) return "";
        return typeof replacement === "object" ? jsonStringify(replacement) : String(replacement);
      });
    if (Array.isArray(value)) return value.map(interpolate);
    if (value !== null && typeof value === "object") {
      let out = {};
      for (let [key, value_2] of Object.entries(value)) out[key] = interpolate(value_2);
      return out;
    }
    return value;
  };
  return interpolate(text);
}
//@ chunk-e6aww6q8.js:3411230-3414118 sole-consumer
/**
 * 执行 mcp_tool 类型钩子：无磁盘会话不运行；找不到客户端或服务器未连接时跳过（连接中可短暂等待）；Artifacts、云浏览器与受限账号记忆工具拒绝；插值参数后调用 MCP 工具并返回文本结果或错误。
 */
async function runMcpToolHook(
  hook,
  hookEvent,
  hookInput,
  mcpClients,
  signal,
  defaultTimeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  accountMemoryState,
) {
  if (isDiskless()) {
    logError(Error("an MCP tool hook got past keepWhileDiskless in a diskless session and was not called"));
    return {
      ok: false,
      body: "",
      withheld: true,
      error: `MCP tool hook not run: ${CLOUD_HOOK_UNSUPPORTED_REASON}`,
    };
  }
  releaseMcpCgroupAtHookFire(hook.server, hookEvent);
  let clients = mcpClients ?? getMcpClientsFromAccessor();
  if (clients === undefined) {
    let ensureConnected = `mcp_tool hooks are not available for the '${hookEvent}' hook event (no MCP client context)`;
    logForDebugging(`Hooks: mcp_tool hook skipped \u2014 ${ensureConnected}`, {
      level: "warn",
    });
    return {
      ok: false,
      body: "",
      error: ensureConnected,
    };
  }
  let timeoutMs = hook.timeout ? hook.timeout * 1000 : defaultTimeoutMs;
  let deadline = Date.now() + timeoutMs;
  let found = clients.find((client) => client.name === hook.server);
  if (found === undefined && mcpClients !== undefined)
    found = getMcpClientsFromAccessor()?.find((client) => client.name === hook.server);
  if (found?.type === "pending" && !HOOK_EVENT_NAMES.has(hookEvent)) {
    let min = Math.min(timeoutMs, getConnectionTimeoutMs());
    logForDebugging(
      `Hooks: mcp_tool hook for ${hookEvent} is waiting up to ${min}ms (less if the server is retrying) for MCP server '${hook.server}' to finish connecting`,
    );
    let connected = Date.now();
    let readyClient = await waitForMcpClientReady(hook.server, min, signal);
    if (signal?.aborted)
      return {
        ok: false,
        body: "",
        aborted: true,
      };
    let isMemoryServer = Date.now() - connected;
    if (readyClient) {
      found = readyClient;
      logForDebugging(
        `Hooks: MCP server '${hook.server}' is now ${readyClient.type} after ${isMemoryServer}ms`,
      );
    } else
      logForDebugging(
        isMemoryServer < MEMORY_SERVER_MAX
          ? `Hooks: no live MCP client list tracks '${hook.server}'; not waiting for it`
          : `Hooks: stopped waiting for MCP server '${hook.server}' after ${isMemoryServer}ms; it has not connected`,
        {
          level: "warn",
        },
      );
  }
  if (!found || !isConnectedOrCached(found)) {
    let notConnectedMessage = `MCP server '${hook.server}' not connected`;
    logForDebugging(`Hooks: mcp_tool hook skipped \u2014 ${notConnectedMessage}`, {
      level: "warn",
    });
    return {
      ok: false,
      body: "",
      error: notConnectedMessage,
    };
  }
  let refusal = refuseArtifactsMcpHook(hook.server, found.config) ?? refuseRemoteBrowserHook(found.name);
  if (refusal !== null) {
    logForDebugging(`Hooks: mcp_tool hook refused \u2014 ${refusal}`, {
      level: "warn",
    });
    return {
      ok: false,
      body: "",
      error: refusal,
      withheld: true,
    };
  }
  let args = hook.input ? interpolateHookInput(hook.input, hookInput) : {};
  let remainingMs = deadline - Date.now();
  if (remainingMs <= 0)
    return {
      ok: false,
      body: "",
      aborted: true,
    };
  let { signal: signal_2, cleanup } = createCombinedAbortSignal(signal, {
    timeoutMs: remainingMs,
  });
  try {
    logForDebugging(
      `Hooks: mcp_tool calling ${hook.server}/${hook.tool} with ${Object.keys(args).length} arg(s)`,
    );
    let ensureConnectedClient = getEnsureConnectedClient();
    if (!ensureConnectedClient) {
      cleanup();
      let notConnectedMessage = `MCP server '${hook.server}' not connected`;
      logForDebugging(`Hooks: mcp_tool hook skipped \u2014 ${notConnectedMessage}`, {
        level: "warn",
      });
      return {
        ok: false,
        body: "",
        error: notConnectedMessage,
      };
    }
    let connectedClient = await ensureConnectedClient(found, {
      signal,
      timeoutMs: Math.min(remainingMs, getConnectionTimeoutMs()),
      context: "mcp_tool hook",
    });
    let refusal =
      refuseArtifactsMcpHook(hook.server, connectedClient.config) ??
      refuseRemoteBrowserHook(connectedClient.name);
    if (refusal !== null) {
      cleanup();
      logForDebugging(`Hooks: mcp_tool hook refused \u2014 ${refusal}`, {
        level: "warn",
      });
      return {
        ok: false,
        body: "",
        error: refusal,
        withheld: true,
      };
    }
    let isMemoryServer = isMemoryToolServer_2(connectedClient);
    if (
      isMemoryServer &&
      isMemoryToolAllowed(
        hook.tool,
        accountMemoryServerState(
          [connectedClient],
          accountMemoryState ?? subagentMemoryMode(getRootSession().host),
        ).mode,
      )
    ) {
      cleanup();
      let missingToolText = `The account memory server's ${hook.tool} is not available to a hook in this session`;
      logForDebugging(`Hooks: mcp_tool hook refused \u2014 ${missingToolText}`, {
        level: "warn",
      });
      return {
        ok: false,
        body: "",
        error: missingToolText,
        withheld: true,
      };
    }
    let result = await callMcpTool(
      connectedClient,
      {
        name: hook.tool,
        arguments: args,
        ...(isMemoryServer && {
          _meta: {
            [MEMORY_CALLER_META_KEY]: "worker",
          },
        }),
      },
      {
        signal: signal_2,
        timeout: remainingMs,
      },
    );
    cleanup();
    let text = Array.isArray(result.content)
      ? result.content.map((content) => (content.type === "text" ? content.text : `[${content.type}]`)).join(`
`)
      : "";
    if (result.isError)
      return {
        ok: false,
        body: text,
        error: text || "MCP tool returned an error",
      };
    return {
      ok: true,
      body: text,
    };
  } catch (error) {
    cleanup();
    if (signal_2.aborted)
      return {
        ok: false,
        body: "",
        aborted: true,
      };
    let errorText = errorMessage(error);
    logForDebugging(`Hooks: mcp_tool hook error: ${errorText}`, {
      level: "error",
    });
    return {
      ok: false,
      body: "",
      error: errorText,
    };
  }
}
//@ chunk-e6aww6q8.js:3414118-3414138 sole-consumer
var MEMORY_SERVER_MAX = 50;
var RECONNECT_BUDGET_MS = 5000;
//@ chunk-e6aww6q8.js:3414138-3414416 sole-consumer
async function waitForMcpClientReady(server, waitMs, signal) {
  let deadline = Date.now() + waitMs;
  let stalled = false;
  for (;;) {
    let found = getMcpClientsFromAccessor()?.find((client) => client.name === server);
    if (found === undefined || found.type !== "pending") return found;
    if (!stalled && found.reconnectAttempt !== undefined) {
      deadline = Math.min(deadline, Date.now() + RECONNECT_BUDGET_MS);
      stalled = true;
    }
    let remaining = deadline - Date.now();
    if (remaining <= 0 || signal?.aborted) return;
    await sleep(Math.min(MEMORY_SERVER_MAX, remaining), signal);
  }
}
//@ chunk-e6aww6q8.js:3414416-3414519 sole-consumer
var HOOK_OUTPUT_INVALID_PREFIX; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var HOOK_OUTPUT_META_KEYS;
deferInit("chunk-e6aww6q8.js:3414416", () => {
  HOOK_OUTPUT_INVALID_PREFIX = "Hook JSON output validation failed \u2014 ";
  HOOK_OUTPUT_META_KEYS = new Set(["async", "hookEventName", "behavior"]);
});
//@ chunk-e6aww6q8.js:3414519-3414620 sole-consumer = isInvalidValueIssue (1)
function isInvalidValueIssue(issue) {
  let last = issue.path.at(-1);
  return issue.code === "invalid_value" && typeof last === "string" && HOOK_OUTPUT_META_KEYS.has(last);
}
//@ chunk-e6aww6q8.js:3414620-3415147 sole-consumer
/**
 * 把 zod 问题规整为 {path, message}：联合类型错误递归取第一个非 invalid_value 分支，或汇总可选值为 "expected one of ..."。
 */
function simplifyZodIssue(issue, pathPrefix) {
  let path = [...pathPrefix, ...issue.path];
  if (issue.code !== "invalid_union" || issue.errors.length === 0)
    return {
      path,
      message: stripPrefix(issue.message, "Invalid input: "),
    };
  let firstBranchIssue = issue.errors.find(
    (error) => error.length > 0 && !error.some(isInvalidValueIssue),
  )?.[0];
  if (firstBranchIssue) return simplifyZodIssue(firstBranchIssue, path);
  let flattened = issue.errors.flatMap((error) => error.filter(isInvalidValueIssue));
  let firstInvalidValue = flattened[0];
  if (firstInvalidValue?.code !== "invalid_value")
    return {
      path,
      message: issue.message,
    };
  let allowedValues = uniq(
    flattened.flatMap((issue) =>
      issue.code === "invalid_value" ? issue.values.map((allowedValue) => jsonStringify(allowedValue)) : [],
    ),
  );
  let joined = allowedValues.slice(0, 6).join(" | ");
  return {
    path: [...path, ...firstInvalidValue.path],
    message: `expected one of ${joined}${allowedValues.length > 6 ? " | \u2026" : ""}`,
  };
}
//@ chunk-e6aww6q8.js:3415147-3415204 sole-consumer
function issuePathLabel(path) {
  return path.map(String).join(".") || "(root)";
}
//@ chunk-e6aww6q8.js:3415204-3415276 sole-consumer
function isPlainObject_2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
//@ chunk-e6aww6q8.js:3415276-3416415 sole-consumer
/**
 * 生成钩子 JSON 输出校验失败的说明：首个问题加缺少 hookEventName、PermissionRequest decision 格式、旧版顶层 decision 用法等提示，列出其余问题并附原始输出。
 */
function formatHookOutputError(parsed, error) {
  let hookSpecificOutput = isPlainObject_2(parsed) ? parsed.hookSpecificOutput : undefined;
  let mapped = error.issues.map((issue) => simplifyZodIssue(issue, []));
  let firstIssue = mapped[0];
  let summary = firstIssue ? `${issuePathLabel(firstIssue.path)}: ${firstIssue.message}` : "unknown error";
  if (isPlainObject_2(hookSpecificOutput) && !("hookEventName" in hookSpecificOutput))
    summary = 'hookSpecificOutput is missing required field "hookEventName"';
  else if (
    isPlainObject_2(hookSpecificOutput) &&
    hookSpecificOutput.hookEventName === "PermissionRequest" &&
    !isPlainObject_2(hookSpecificOutput.decision) &&
    firstIssue?.path[0] === "hookSpecificOutput" &&
    firstIssue.path[1] === "decision"
  )
    summary +=
      ' (PermissionRequest decision must be {"behavior": "allow"} or {"behavior": "deny", "message": "..."})';
  else if (
    isPlainObject_2(parsed) &&
    firstIssue?.path.length === 1 &&
    firstIssue.path[0] === "decision" &&
    (parsed.decision === "allow" || parsed.decision === "deny" || parsed.decision === "ask")
  )
    summary +=
      parsed.decision === "ask"
        ? ' (top-level decision is the legacy approve|block field; for "ask" use hookSpecificOutput.permissionDecision in a PreToolUse hook)'
        : ` (top-level decision is the legacy approve|block field; for "${parsed.decision}" use hookSpecificOutput.permissionDecision in a PreToolUse hook, or hookSpecificOutput.decision: {"behavior": "${parsed.decision}"} in a PermissionRequest hook)`;
  let joined = mapped.slice(1).map((issue) => `  - ${issuePathLabel(issue.path)}: ${issue.message}`).join(`
`);
  return `${HOOK_OUTPUT_INVALID_PREFIX}${summary}${
    joined
      ? `
` + joined
      : ""
  }

The hook's output was: ${jsonStringify(parsed, null, 2)}`;
}
//@ chunk-e6aww6q8.js:3416415-3417708 fingerprint = parseHookOutput (0.607)
/**
 * 返回钩子 JSON 输出的期望 schema 说明文本（continue/suppressOutput/stopReason/decision/reason/systemMessage/terminalSequence/hookSpecificOutput…），用于校验失败时提示。
 */
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
            "to deny": {
              behavior: '"deny"',
              message: "string (optional)",
              interrupt: "boolean (optional)",
            },
          },
        },
        "for UserPromptSubmit": {
          hookEventName: '"UserPromptSubmit"',
          additionalContext: "string (optional)",
        },
        "for PostToolUse": {
          hookEventName: '"PostToolUse"',
          additionalContext: "string (optional)",
        },
        "for PostToolBatch": {
          hookEventName: '"PostToolBatch"',
          additionalContext: "string (optional)",
        },
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
function formatHookFailureLine(hookEvent, detail) {
  let firstLine =
    detail
      .split(
        `
`,
      )
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? "";
  if (firstLine.startsWith(HOOK_OUTPUT_INVALID_PREFIX))
    return `${hookEvent} hook output invalid: ${firstLine.slice(HOOK_OUTPUT_INVALID_PREFIX.length)}`;
  return firstLine ? `${hookEvent} hook failed: ${firstLine}` : `${hookEvent} hook failed to run`;
}
//@ chunk-e6aww6q8.js:3417928-3419240 facade-exports = executePreCompactHooks (0.724)
/**
 * 执行 PreCompact 钩子（matcher = manual/auto）：成功输出（超长截断）合并为 newCustomInstructions，失败与成功信息合成 userDisplayMessage，exit 2/block 的汇成 blockedBy 阻止压缩；子代理只返回 blockedBy。
 */
async function executePreCompactHooks(
  session,
  notification,
  context,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
) {
  if (context.options?.settingsHooksOff === true) return {};
  let delegated = isDelegatedObservationContext(context.agentContext);
  let hookInput = {
    ...createBaseHookInput(session, hookInputCwd()),
    hook_event_name: "PreCompact",
    trigger: notification.trigger,
    custom_instructions: notification.customInstructions,
  };
  let results = await executeHooksOutsideREPL({
    session,
    hookInput,
    matchQuery: notification.trigger,
    signal,
    timeoutMs,
    agentId: context.agentId,
    storageV5: context.storageV5,
    credentials: context.credentials,
  });
  if (results.length === 0) return {};
  let successfulOutputs = [];
  let displayMessages = [];
  for (let result of results) {
    if (result.cancelled) continue;
    let trimmed = result.output.trim();
    if (result.succeeded && !result.blocked) {
      if (trimmed.length > RESULT_LIMIT_COUNT) {
        logForDebugging(
          `PreCompact [${result.command}] output cut from ${trimmed.length} to ${RESULT_LIMIT_COUNT} characters`,
          {
            level: "warn",
          },
        );
        trimmed = `${truncateToLength(trimmed, RESULT_LIMIT_COUNT)}

[PreCompact hook [${result.command}] output cut: ${trimmed.length} characters is over the ${RESULT_LIMIT_COUNT}-character limit]`;
      }
      if (trimmed) {
        successfulOutputs.push(trimmed);
        displayMessages.push(`PreCompact [${result.command}] completed successfully: ${trimmed}`);
      } else displayMessages.push(`PreCompact [${result.command}] completed successfully`);
    } else if (trimmed) displayMessages.push(`PreCompact [${result.command}] failed: ${trimmed}`);
    else displayMessages.push(`PreCompact [${result.command}] failed`);
  }
  let filtered = results.filter((result) => result.blocked);
  let extra =
    filtered.length > 0
      ? filtered.map((result) => {
          let trimmed = result.output.trim();
          return `[${result.command}]${trimmed ? `: ${trimmed}` : ""}`;
        }).join(`
`)
      : undefined;
  if (delegated)
    return {
      ...(extra !== undefined && {
        blockedBy: extra,
      }),
    };
  return {
    newCustomInstructions:
      successfulOutputs.length > 0
        ? successfulOutputs.join(`

`)
        : undefined,
    userDisplayMessage:
      displayMessages.length > 0
        ? displayMessages.join(`
`)
        : undefined,
    ...(extra !== undefined && {
      blockedBy: extra,
    }),
  };
}
//@ chunk-e6aww6q8.js:3419240-3419338 facade-exports
/**
 * executePostCompactHooks 的容错包装：非中止错误只上报，返回 {}。
 */
function executePostCompactHooks(session, session_2, trigger, signal, timeoutMs) {
  return executePostCompactHooks_2(session, session_2, trigger, signal, timeoutMs).catch((error) => {
    if (signal?.aborted) throw error;
    logHookExecutionFailure(error);
    return {};
  });
}
//@ chunk-e6aww6q8.js:3419338-3420130 fingerprint = executePostCompactHooks (0.946)
/**
 * 执行 PostCompact 钩子（输入含 compact_summary），只生成给用户看的成功/失败信息；子代理或关闭钩子时跳过。
 */
async function executePostCompactHooks_2(
  session,
  summary,
  context,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
) {
  if (isDelegatedObservationContext(context.agentContext) || context.options?.settingsHooksOff === true)
    return {};
  let hookInput = {
    ...createBaseHookInput(session, hookInputCwd()),
    hook_event_name: "PostCompact",
    trigger: summary.trigger,
    compact_summary: summary.compactSummary,
  };
  let results = await executeHooksOutsideREPL({
    session,
    hookInput,
    matchQuery: summary.trigger,
    signal,
    timeoutMs,
    agentId: context.agentId,
    storageV5: context.storageV5,
    credentials: context.credentials,
  });
  if (results.length === 0) return {};
  let displayMessages = [];
  for (let result of results) {
    if (result.cancelled) continue;
    if (result.succeeded) {
      if (result.output.trim())
        displayMessages.push(
          `PostCompact [${result.command}] completed successfully: ${result.output.trim()}`,
        );
      else displayMessages.push(`PostCompact [${result.command}] completed successfully`);
    } else if (result.output.trim())
      displayMessages.push(`PostCompact [${result.command}] failed: ${result.output.trim()}`);
    else displayMessages.push(`PostCompact [${result.command}] failed`);
  }
  return {
    userDisplayMessage:
      displayMessages.length > 0
        ? displayMessages.join(`
`)
        : undefined,
  };
}
//@ chunk-e6aww6q8.js:3420130-3420436 fingerprint = executeConfigChangeHooks (1)
/**
 * 执行 ConfigChange 钩子（matcher = source，如 user_settings/skills），policy_settings 来源的结果强制不阻断。
 */
async function executeConfigChangeHooks(
  session,
  source,
  filePath,
  { timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS, storageV5, credentials } = {},
) {
  let hookInput = {
    ...createBaseHookInput(session, hookInputCwd()),
    hook_event_name: "ConfigChange",
    source,
    file_path: filePath,
  };
  let results = await executeHooksOutsideREPL({
    session,
    hookInput,
    timeoutMs,
    matchQuery: source,
    storageV5,
    credentials,
  });
  if (source === "policy_settings")
    return results.map((result) => ({
      ...result,
      blocked: false,
    }));
  return results;
}
//@ chunk-e6aww6q8.js:3420436-3420753 facade-exports
/**
 * 执行 DirectoryAdded 钩子（316 新增；/add-dir 或 register_repo_root 之后），返回结果与 systemMessage 列表。
 */
async function executeDirectoryAddedHooks(
  session,
  directory,
  source,
  { timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS, storageV5, credentials } = {},
) {
  let hookInput = {
    ...createBaseHookInput(session, hookInputCwd()),
    hook_event_name: "DirectoryAdded",
    directory,
    source,
  };
  let results = await executeHooksOutsideREPL({
    session,
    hookInput,
    matchQuery: source,
    timeoutMs,
    storageV5,
    credentials,
  });
  let systemMessages = results.map((result) => result.systemMessage).filter((message) => !!message);
  return {
    results,
    systemMessages,
  };
}
//@ chunk-e6aww6q8.js:3420753-3421267 facade-exports = executeElicitationHooks (1)
/**
 * 执行 Elicitation 钩子（matcher = MCP 服务器名），钩子可直接给出 accept/decline/cancel 及 content，decline 视为阻断。
 */
async function executeElicitationHooks({
  session,
  serverName,
  message,
  requestedSchema,
  permissionMode,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  mode,
  url,
  elicitationId,
}) {
  let hookInput = {
    ...createBaseHookInput(session, hookInputCwd(), permissionMode),
    hook_event_name: "Elicitation",
    mcp_server_name: serverName,
    message,
    mode,
    url,
    elicitation_id: elicitationId,
    requested_schema: requestedSchema,
  };
  let results = await executeHooksOutsideREPL({
    session,
    hookInput,
    matchQuery: serverName,
    signal,
    timeoutMs,
  });
  let elicitationResponse;
  let blockingError;
  for (let result of results) {
    let parsed = parseElicitationHookOutput(result, "Elicitation");
    if (parsed.blockingError) blockingError = parsed.blockingError;
    if (parsed.response) elicitationResponse = parsed.response;
  }
  return {
    elicitationResponse,
    blockingError,
  };
}
//@ chunk-e6aww6q8.js:3421267-3421765 facade-exports = executeElicitationResultHooks (1)
/**
 * 执行 ElicitationResult 钩子，可改写用户对 elicitation 的回答；decline 视为阻断。
 */
async function executeElicitationResultHooks({
  session,
  serverName,
  action,
  content,
  permissionMode,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  mode,
  elicitationId,
}) {
  let hookInput = {
    ...createBaseHookInput(session, hookInputCwd(), permissionMode),
    hook_event_name: "ElicitationResult",
    mcp_server_name: serverName,
    elicitation_id: elicitationId,
    mode,
    action,
    content,
  };
  let results = await executeHooksOutsideREPL({
    session,
    hookInput,
    matchQuery: serverName,
    signal,
    timeoutMs,
  });
  let elicitationResultResponse;
  let blockingError;
  for (let result of results) {
    let parsed = parseElicitationHookOutput(result, "ElicitationResult");
    if (parsed.blockingError) blockingError = parsed.blockingError;
    if (parsed.response) elicitationResultResponse = parsed.response;
  }
  return {
    elicitationResultResponse,
    blockingError,
  };
}
//@ chunk-e6aww6q8.js:3421765-3422063 fingerprint = executeEnvHooks (1)
/**
 * CwdChanged/FileChanged 共用：执行钩子后使会话 env 缓存失效，收集 watchPaths 与 systemMessage。
 */
async function executeEnvHooks(
  session,
  hookInput,
  { timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS, storageV5, credentials },
) {
  let results = await executeHooksOutsideREPL({
    session,
    hookInput,
    timeoutMs,
    storageV5,
    credentials,
  });
  if (results.length > 0) invalidateSessionEnvCache();
  let watchPaths = results.flatMap((result) => result.watchPaths ?? []);
  let systemMessages = results.map((result) => result.systemMessage).filter((m) => !!m);
  return {
    results,
    watchPaths,
    systemMessages,
  };
}
//@ chunk-e6aww6q8.js:3422063-3422177 facade-exports = executeCwdChangedHooks (1)
/**
 * 执行 CwdChanged 钩子（old_cwd/new_cwd），钩子可写 CLAUDE_ENV_FILE、返回 watchPaths。
 */
function executeCwdChangedHooks(session, oldCwd, newCwd, timeoutMs = {}) {
  let hookInput = {
    ...createBaseHookInput(session, hookInputCwd()),
    hook_event_name: "CwdChanged",
    old_cwd: oldCwd,
    new_cwd: newCwd,
  };
  return executeEnvHooks(session, hookInput, timeoutMs);
}
//@ chunk-e6aww6q8.js:3422177-3422292 facade-exports = executeFileChangedHooks (1)
/**
 * 执行 FileChanged 钩子（file_path/event: change|add|unlink）。
 */
function executeFileChangedHooks(session, filePath, event, timeoutMs = {}) {
  let hookInput = {
    ...createBaseHookInput(session, hookInputCwd()),
    hook_event_name: "FileChanged",
    file_path: filePath,
    event,
  };
  return executeEnvHooks(session, hookInput, timeoutMs);
}
//@ chunk-e6aww6q8.js:3422292-3422338 facade-exports
/**
 * executeInstructionsLoadedHooks 的容错包装。
 */
function executeInstructionsLoadedHooks(...args) {
  return executeInstructionsLoadedHooks_2(...args).catch(logHookExecutionFailure);
}
//@ chunk-e6aww6q8.js:3422338-3422713 fingerprint = executeInstructionsLoadedHooks (0.958)
/**
 * 执行 InstructionsLoaded 钩子（CLAUDE.md/规则文件加载时，matcher = load_reason），只观察不阻断。
 */
async function executeInstructionsLoadedHooks_2(session, filePath, memoryType, filePath_2, extra) {
  let {
    globs,
    triggerFilePath,
    parentFilePath,
    timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
    storageV5,
    credentials,
    agentInfo,
  } = extra ?? {};
  let hookInput = {
    ...createBaseHookInput(session, hookInputCwd(), undefined, agentInfo),
    hook_event_name: "InstructionsLoaded",
    file_path: filePath,
    memory_type: memoryType,
    load_reason: filePath_2,
    globs,
    trigger_file_path: triggerFilePath,
    parent_file_path: parentFilePath,
  };
  await executeHooksOutsideREPL({
    session,
    hookInput,
    timeoutMs,
    matchQuery: filePath_2,
    storageV5,
    credentials,
  });
}
//@ chunk-e6aww6q8.js:3428473-3428784 facade-exports = executeNotificationHooks (0.946)
/**
 * 执行 Notification 钩子（matcher = notification_type）。
 */
async function executeNotificationHooks(
  sessionIdentity,
  session,
  { timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS, storageV5, credentials, hookOrigin } = {},
) {
  let { message, title, notificationType } = session;
  let hookInput = {
    ...createBaseHookInput(sessionIdentity, hookInputCwd()),
    hook_event_name: "Notification",
    message,
    title,
    notification_type: notificationType,
  };
  await executeHooksOutsideREPL({
    session: sessionIdentity,
    hookInput,
    timeoutMs,
    matchQuery: notificationType,
    hookOrigin,
    storageV5,
    credentials,
  });
}
//@ chunk-e6aww6q8.js:3428822-3428925 layout
function createSessionEndRaiser() {
  let sessionEndSignal = subscribe();
  return {
    setSessionEndRaiser: sessionEndSignal.set,
    raiseSessionEnd: (end) => sessionEndSignal.get()?.(end) ?? end.end(),
  };
}
//@ chunk-e6aww6q8.js:3428925-3428939 layout
var sessionEndRaiser; // deferred: uses createSessionEndRaiser of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:3428925", () => {
  sessionEndRaiser = createSessionEndRaiser();
});
//@ chunk-e6aww6q8.js:3428939-3428967 layout
var raiseSessionEnd; // deferred: uses sessionEndRaiser of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:3428939", () => {
  raiseSessionEnd = sessionEndRaiser.raiseSessionEnd;
});
//@ chunk-e6aww6q8.js:3428967-3428999 layout
/**
 * 设置 SessionEnd 触发器（宿主可接管 SessionEnd 钩子的执行时机）。
 */
var setSessionEndRaiser; // deferred: uses sessionEndRaiser of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:3428967", () => {
  setSessionEndRaiser = sessionEndRaiser.setSessionEndRaiser;
});
//@ chunk-e6aww6q8.js:3428999-3429027 layout
var STARTUP_HOOK_HOLD = "startup-hook-hold";
//@ chunk-e6aww6q8.js:3429027-3429383 facade-exports = executeSessionStartHooks (0.768)
/**
 * 执行 SessionStart 钩子（source = startup/resume/clear/compact/fork，输入含 agent_type/model/session_title），期间持有 startup-hook-hold 活动；返回结果流。
 */
function executeSessionStartHooks(
  session,
  source,
  agentContext,
  title,
  agentType,
  model,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  forceSyncExecution,
  input,
  agentContext_2,
  selection,
  storageV5,
  credentials,
) {
  let session_2 =
    agentContext !== undefined
      ? {
          id: identityAgentId(agentContext),
          project: session.project,
        }
      : session;
  let hookInput = {
    ...createBaseHookInput(session_2, hookInputCwd()),
    hook_event_name: "SessionStart",
    source,
    agent_type: agentType,
    model,
    session_title: title ?? getCurrentSessionTitle(session_2.id),
    ...input,
  };
  return runStartupHooksWithHold({
    session,
    hookInput,
    matchQuery: source,
    signal,
    timeoutMs,
    forceSyncExecution,
    agentContext: agentContext_2,
    selection,
    storageV5,
    credentials,
  });
}
//@ chunk-e6aww6q8.js:3429383-3429739 layout
async function* runStartupHooksWithHold({
  session,
  hookInput,
  matchQuery,
  signal,
  timeoutMs,
  forceSyncExecution,
  storageV5,
  credentials,
  agentContext,
  selection,
}) {
  startSessionActivity("hook_exec", STARTUP_HOOK_HOLD);
  try {
    yield* executeHooks({
      session,
      hookInput,
      toolUseID: randomUUID(),
      matchQuery,
      signal,
      timeoutMs,
      forceSyncExecution,
      agentContext,
      ...selection,
      storageV5,
      credentials,
    });
  } finally {
    endActivity("hook_exec", STARTUP_HOOK_HOLD);
  }
}
//@ chunk-e6aww6q8.js:3429739-3430016 facade-exports = executeSetupHooks (0.878)
/**
 * 执行 Setup 钩子（trigger = init/maintenance），期间持有 startup-hook-hold。
 */
async function* executeSetupHooks(
  trigger,
  trigger_2,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  forceSyncExecution,
  storageV5,
  credentials,
) {
  let hookInput = {
    ...createBaseHookInput(trigger, hookInputCwd()),
    hook_event_name: "Setup",
    trigger: trigger_2,
  };
  startSessionActivity("hook_exec", STARTUP_HOOK_HOLD);
  try {
    yield* executeHooks({
      session: trigger,
      hookInput,
      toolUseID: randomUUID(),
      matchQuery: trigger_2,
      signal,
      timeoutMs,
      forceSyncExecution,
      storageV5,
      credentials,
    });
  } finally {
    endActivity("hook_exec", STARTUP_HOOK_HOLD);
  }
}
//@ chunk-e6aww6q8.js:3430016-3430348 facade-exports = executeSubagentStartHooks (0.856)
/**
 * 执行 SubagentStart 钩子（agent_id/agent_type，matcher = agent_type）。
 */
async function* executeSubagentStartHooks(
  toolUseContext,
  agentId,
  agentType,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  sessionHooks,
  agentContext,
  options,
) {
  let hookInput = {
    ...createBaseHookInput(toolUseContext.session, hookInputCwd()),
    hook_event_name: "SubagentStart",
    agent_id: agentId,
    agent_type: agentType,
  };
  yield* executeHooks({
    session: toolUseContext.session,
    hookInput,
    toolUseID: randomUUID(),
    matchQuery: agentType,
    signal,
    timeoutMs,
    sessionHooks,
    agentContext,
    managedHooksOnly: options?.managedHooksOnly,
    storageV5: toolUseContext.storageV5,
    credentials: toolUseContext.credentials,
  });
}
//@ chunk-e6aww6q8.js:3430348-3430847 facade-exports = executeSessionEndHooks (0.895)
/**
 * 执行 SessionEnd 钩子（matcher = reason），时间预算由 CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS 与钩子 timeout 推出，失败写 stderr，最后清空会话钩子。
 */
async function executeSessionEndHooks(session, reason, options) {
  let { sessionHooks, getAppState, signal, storageV5, credentials } = options || {};
  let hookInput = {
    ...createBaseHookInput(session, hookInputCwd()),
    hook_event_name: "SessionEnd",
    reason,
  };
  let results = [];
  let end = async () => {
    results = await executeHooksOutsideREPL({
      session,
      sessionHooks,
      getAppState,
      hookInput,
      matchQuery: reason,
      signal,
      timeoutMs: getSessionEndHookDefaultTimeoutMs(),
      storageV5,
      credentials,
    });
  };
  await raiseSessionEnd({
    reason,
    sessionId: session.id,
    boundMs: getSessionEndHookTimeoutMs(),
    end,
  });
  for (let result of results)
    if (!result.succeeded && result.output && !isDiskless())
      process.stderr.write(`SessionEnd hook [${result.command}] failed: ${result.output}
`);
  sessionHooks?.clear(session.id);
}
//@ chunk-e6aww6q8.js:3430885-3430898 layout
var STOP_HOOK_FIELD_MAX_CHARS = 1000;
//@ chunk-e6aww6q8.js:3430898-3431521 layout
function summarizeBackgroundTasksForHook(tasks) {
  let list = [];
  for (let task of Object.values(tasks)) {
    if (!waitForTaskCompletion(task) || task.type === "post_turn_memory") continue;
    let entry = {
      id: task.id,
      type: taskKindLabel(task.type),
      status: task.status,
      description: truncateWithCount(task.description, STOP_HOOK_FIELD_MAX_CHARS),
    };
    switch (task.type) {
      case "local_bash":
        entry.command = truncateWithCount(task.command, STOP_HOOK_FIELD_MAX_CHARS);
        break;
      case "local_agent":
        entry.agent_type = task.agentType;
        break;
      case "monitor_mcp":
        entry.server = task.server;
        entry.tool = task.tool;
        break;
      case "mcp_task":
        entry.server = task.serverName;
        entry.tool = task.toolName;
        break;
      case "local_workflow":
        entry.name = task.workflowName;
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
    list.push(entry);
  }
  return list;
}
//@ chunk-e6aww6q8.js:3431521-3431639 layout
function summarizeSessionCronsForHook(crons = getSessionCronTasks()) {
  return crons.map((cron) => ({
    id: cron.id,
    schedule: cron.cron,
    recurring: cron.recurring ?? false,
    prompt: truncateWithCount(cron.prompt, STOP_HOOK_FIELD_MAX_CHARS),
  }));
}
//@ chunk-e6aww6q8.js:3431639-3431685 facade-exports
/**
 * executeStopFailureHooks 的容错包装。
 */
function executeStopFailureHooks(...args) {
  return executeStopFailureHooks_2(...args).catch(logHookExecutionFailure);
}
//@ chunk-e6aww6q8.js:3431685-3432233 fingerprint = executeStopFailureHooks (0.843)
/**
 * API 错误结束回合时执行 StopFailure 钩子（matcher = error 类型），输出与退出码被忽略。
 */
async function executeStopFailureHooks_2(
  lastMessage,
  toolUseContext,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
) {
  if (
    isDelegatedObservationContext(toolUseContext.agentContext) ||
    toolUseContext.options?.settingsHooksOff === true
  )
    return;
  if (!hasHookToRun("StopFailure", toolUseContext.sessionHooksRegistry, toolUseContext.session.id)) return;
  let lastAssistantText =
    extractTextContent_2(
      lastMessage.message.content,
      `
`,
    ).trim() || undefined;
  let error = lastMessage.error ?? "unknown";
  let hookInput = {
    ...createBaseHookInput(toolUseContext.session, hookInputCwd(), undefined, toolUseContext),
    hook_event_name: "StopFailure",
    error,
    error_details: lastMessage.errorDetails,
    last_assistant_message: lastAssistantText,
  };
  await executeHooksOutsideREPL({
    session: toolUseContext.session,
    sessionHooks: toolUseContext.sessionHooksRegistry,
    getAppState: toolUseContext.getAppState,
    hookInput,
    timeoutMs,
    matchQuery: error,
    agentId: toolUseContext.agentId,
    storageV5: toolUseContext.storageV5,
    credentials: toolUseContext.credentials,
  });
}
//@ chunk-e6aww6q8.js:3432233-3433269 facade-exports = executeStopHooks (0.605)
/**
 * 执行 Stop/SubagentStop 钩子：输入含 stop_hook_active、last_assistant_message、background_tasks、session_crons，SubagentStop 另含 agent_id/agent_transcript_path/agent_type；turn_end_reactions 只跑会话 function 钩子。
 */
async function* executeStopHooks(
  permissionMode,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  stopHookActive = false,
  subagentId,
  toolUseContext,
  messages,
  agentType,
  requestPrompt = "turn_end",
) {
  let eventName = subagentId ? "SubagentStop" : "Stop";
  if (
    isDelegatedObservationContext(toolUseContext.agentContext) ||
    toolUseContext.options.settingsHooksOff === true
  )
    return;
  let isWebFetchSubagent = isWebFetchSubagentContext(toolUseContext.agentContext);
  let sessionId = toolUseContext.agentId ?? toolUseContext.session.id;
  if (!isWebFetchSubagent && !hasHookToRun(eventName, toolUseContext.sessionHooksRegistry, sessionId)) return;
  if (
    requestPrompt === "turn_end_reactions" &&
    !toolUseContext.sessionHooksRegistry.getFunctionHooks(sessionId, eventName).get(eventName)?.length
  )
    return;
  let lastAssistantMessage = messages ? getLastAssistantMessage(messages) : undefined;
  let lastAssistantText = lastAssistantMessage
    ? extractTextContent_2(
        lastAssistantMessage.message.content,
        `
`,
      ).trim() || undefined
    : undefined;
  let input = {
    background_tasks: summarizeBackgroundTasksForHook(toolUseContext.taskRegistry.all()),
    session_crons: summarizeSessionCronsForHook(),
  };
  let baseHookInput = createBaseHookInput(
    toolUseContext.session,
    hookInputCwd(),
    permissionMode,
    toolUseContext,
  );
  let hookInput = subagentId
    ? {
        ...baseHookInput,
        hook_event_name: "SubagentStop",
        stop_hook_active: stopHookActive,
        agent_id: subagentId,
        agent_transcript_path: isDiskless() ? "" : getAgentTranscriptPath(subagentId),
        agent_type: agentType ?? baseHookInput.agent_type ?? "",
        last_assistant_message: lastAssistantText,
        ...input,
      }
    : {
        ...baseHookInput,
        hook_event_name: "Stop",
        stop_hook_active: stopHookActive,
        last_assistant_message: lastAssistantText,
        ...input,
      };
  let extendedHookInput;
  yield* executeHooks({
    session: toolUseContext.session,
    hookInput,
    extendedHookInput,
    toolUseID: randomUUID(),
    signal,
    timeoutMs,
    toolUseContext,
    messages,
    managedHooksOnly: isWebFetchSubagent,
    skipSessionFunctionHooks: requestPrompt !== "turn_end" && requestPrompt !== "turn_end_reactions",
    sessionFunctionHooksOnly: requestPrompt === "turn_end_reactions",
  });
}
//@ chunk-e6aww6q8.js:3433307-3433575 facade-exports = executeTeammateIdleHooks (0.913)
/**
 * 执行 TeammateIdle 钩子（teammate_name/team_name），exit 2 让队友继续工作。
 */
async function* executeTeammateIdleHooks(
  teammateName,
  teamName,
  mode,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  hook,
) {
  let cwd = hookInputCwd();
  let hookInput = {
    ...createBaseHookInput(hook.session, cwd, mode, {
      agentId: hook.agentId,
      agentType: hook.agentType,
    }),
    hook_event_name: "TeammateIdle",
    teammate_name: teammateName,
    team_name: teamName,
  };
  yield* executeHooks({
    session: hook.session,
    hookInput,
    toolUseID: randomUUID(),
    signal,
    timeoutMs,
    toolUseContext: hook,
  });
}
//@ chunk-e6aww6q8.js:3433575-3433892 facade-exports = executeTaskCreatedHooks (0.971)
/**
 * 执行 TaskCreated 钩子（task_id/subject/description/teammate/team），exit 2 阻止创建。
 */
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
  let cwd = hookInputCwd();
  let hookInput = {
    ...createBaseHookInput(toolUseContext.session, cwd, permissionMode, {
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
    hookInput,
    toolUseID: randomUUID(),
    signal,
    timeoutMs,
    toolUseContext,
  });
}
//@ chunk-e6aww6q8.js:3433892-3434211 facade-exports = executeTaskCompletedHooks (0.97)
/**
 * 执行 TaskCompleted 钩子，exit 2 阻止标记完成。
 */
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
  let cwd = hookInputCwd();
  let hookInput = {
    ...createBaseHookInput(toolUseContext.session, cwd, permissionMode, {
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
    hookInput,
    toolUseID: randomUUID(),
    signal,
    timeoutMs,
    toolUseContext,
  });
}
//@ chunk-e6aww6q8.js:3434211-3434359 layout
var isHeldAskResult = (permissionHookYield, expected) =>
  permissionHookYield.permissionBehavior === "ask" &&
  expected.some(
    (item) =>
      item.heldForServedCall === true &&
      item.hookPermissionDecisionReason === permissionHookYield.hookPermissionDecisionReason,
  );
//@ chunk-e6aww6q8.js:3434359-3434731 layout
function toPermissionHookYield({ deny, ask, allow, updatedInput, additionalContext }) {
  let out = {};
  if (additionalContext && additionalContext.length > 0) out.additionalContexts = additionalContext;
  if (typeof deny === "string") {
    out.permissionBehavior = "deny";
    out.hookPermissionDecisionReason = deny;
    return out;
  }
  if (typeof ask === "string") {
    out.permissionBehavior = "ask";
    out.hookPermissionDecisionReason = ask;
  } else if (allow === true) out.permissionBehavior = "allow";
  if (updatedInput) out.updatedInput = updatedInput;
  return out;
}
//@ chunk-e6aww6q8.js:3434731-3436728 layout
/**
 * 有 mods（function-hook 链）时的 PreToolUse 流程：managed 阶段 → mods 链 → core 阶段，合并 deny/ask/allow、改写来源（local_code/mod/mixed）与 permissionDisplay 后产出一个汇总结果。
 */
async function* runPreToolUseFunctionChain({
  hookInput,
  toolInput,
  signal,
  runSettingsHooks,
  origin,
  managedPass,
  failure,
}) {
  let event = toolCallEvent(hookInput.tool_name, hookInput.tool_use_id, toolInput);
  let heldResult = awaitHooksRespawnUnlessSessionEnd(
    {
      event: "classic.PreToolUse",
      e: event,
      origin,
    },
    signal,
  );
  if (heldResult !== undefined) {
    let held = await heldResult.then(
      () => {
        return;
      },
      (error) => (isAbortError(error) ? Promise.reject(error) : error),
    );
    yield* held !== undefined
      ? [
          toPermissionHookYield({
            deny: errorMessage(held),
          }),
        ]
      : runPreToolUseFunctionChain({
          hookInput,
          toolInput,
          signal,
          runSettingsHooks,
          origin,
          managedPass,
          failure,
        });
    return;
  }
  let { managed, pass, covers } = createManagedStageController(runSettingsHooks, managedPass);
  let { core, runs, deniedBefore } = createCoreStageController(runSettingsHooks, covers);
  let chainFailure = await reportPreToolUseChainFailure(
    event,
    [managed, ...hookMembersFor("classic.PreToolUse", origin), core],
    {
      signal,
      origin: hookOriginFromStack(origin),
    },
  ).catch((error) => {
    if (failure !== undefined) failure.deniedBefore = deniedBefore(error);
    throw error;
  });
  let passedKey = stableStringifySafe(chainFailure.updatedInput ?? toolInput);
  let lastRun = runs.last(
    ({ input, made }) =>
      stableStringifySafe(input) === passedKey ||
      (made.result.updatedInput !== undefined && stableStringifySafe(made.result.updatedInput) === passedKey),
  );
  let made = (lastRun ?? runs.last())?.made;
  let soleAsk = lastRun?.made.soleAsk;
  let previousKey =
    chainFailure.ask !== undefined &&
    soleAsk !== undefined &&
    pass()?.result.ask === undefined &&
    lastRun?.made.result.ask === chainFailure.ask &&
    chainFailure.ask === (soleAsk.hookPermissionDecisionReason ?? "")
      ? soleAsk
      : undefined;
  let permissionDisplay =
    previousKey !== undefined && passedKey === stableStringifySafe(previousKey.updatedInput ?? lastRun?.input)
      ? previousKey.permissionDisplay
      : undefined;
  let extra =
    chainFailure.updatedInput === undefined ||
    (previousKey?.updatedInput !== undefined && stableStringifySafe(previousKey.updatedInput) === passedKey)
      ? previousKey
      : undefined;
  let expected = (pass()?.yields ?? []).concat(made?.yields ?? []);
  let permissionHookYield = toPermissionHookYield(chainFailure);
  let sources = [...(pass()?.rewrites ?? []), ...runs.all().flatMap(({ made }) => made.rewrites ?? [])];
  let updatedInput = pass()?.result.updatedInput ?? toolInput;
  let rewriteSource = () =>
    sources.length > 0 &&
    runs.all().every(({ input }) => stableStringifySafe(input) === stableStringifySafe(updatedInput)) &&
    passedKey === stableStringifySafe(runs.last()?.made.result.updatedInput ?? updatedInput);
  let fromMod =
    permissionHookYield.updatedInput === undefined
      ? undefined
      : (sources.find((source) => source.kind !== "local_code")?.kind ??
        (rewriteSource() ? "local_code" : "mod"));
  let modSources = new Set([
    ...sources.flatMap((entry) => (entry.source === undefined ? [] : [entry.source])),
    ...(fromMod === "mod" ? ["mod"] : []),
  ]);
  let rewriteSource_2 =
    fromMod === undefined || modSources.size === 0
      ? undefined
      : modSources.size === 1
        ? [...modSources][0]
        : "mixed";
  yield* expected.filter((result) => result.heldForServedCall !== true);
  yield {
    ...permissionHookYield,
    ...(fromMod !== undefined && {
      rewriterKind: fromMod,
    }),
    ...(rewriteSource_2 !== undefined && {
      rewriteSource: rewriteSource_2,
    }),
    ...(extra?.hookSource !== undefined && {
      hookSource: extra.hookSource,
    }),
    ...(extra?.hookPluginId !== undefined && {
      hookPluginId: extra.hookPluginId,
    }),
    ...(isHeldAskResult(permissionHookYield, expected) && {
      heldForServedCall: true,
    }),
    ...(permissionDisplay && {
      permissionDisplay,
    }),
  };
}
//@ chunk-e6aww6q8.js:3436728-3437216 facade-exports
/**
 * 执行 PreToolUse 钩子并在需要时补一个 held（为云端服务调用暂扣）结果。
 */
async function* executePreToolHooks(
  toolName,
  toolUseID,
  toolInput,
  toolUseContext,
  mode,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  requestPrompt,
  toolInputSummary,
) {
  let flushHeld = () => {
    let toolPermissionContext = getToolPermissionContext(toolUseContext);
    return isBypassPermissionsInEffect(
      findToolByName(toolUseContext.options.tools, toolName),
      toolPermissionContext,
      toolPermissionContext.mode,
    );
  };
  let managedHooksOnly = requestPrompt?.managedHooksOnly
    ? undefined
    : await holdToolCallForHookPolicy(
        () =>
          hasToolHookMatching({
            hookEvent: "PreToolUse",
            toolName,
            toolInput,
            tools: toolUseContext.options.tools,
            toolAliases: toolUseContext.options.toolAliases,
            sessionHooks: toolUseContext.sessionHooksRegistry,
            sessionId: registerAgent(toolUseContext, "PreToolUse", toolUseContext.session.id),
            held: "only",
          }),
        flushHeld,
        signal,
      );
  let results = [];
  for await (let result of executePreToolHooks_2(
    toolName,
    toolUseID,
    toolInput,
    toolUseContext,
    mode,
    signal,
    timeoutMs,
    requestPrompt,
    toolInputSummary,
  )) {
    if (managedHooksOnly !== undefined) results.push(result);
    yield result;
  }
  let reconciled = reconcileHeldHookResults(withHeldPermissionBehavior(managedHooksOnly, flushHeld), results);
  if (reconciled !== undefined) yield reconciled;
}
//@ chunk-e6aww6q8.js:3437216-3438478 fingerprint = executePreToolHooks (0.581)
/**
 * 执行 PreToolUse 钩子（matcher = 工具名，输入含 tool_name/tool_input/tool_use_id/mcp_server）：复用 managed 预跑结果；有 mods 链时走 runPreToolUseFunctionChain，否则直接 executeHooks。
 */
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
  let managedPass = toolUseContext.managedPass;
  let pass =
    !requestPrompt?.managedHooksOnly &&
    managedPass?.toolUseId === toolUseID &&
    sameMessageOrShape(managedPass.input, toolInput, managedPass.inputKey)
      ? managedPass.pass
      : undefined;
  let hasModuleSite = hasModuleHookingSite("classic.PreToolUse");
  let passedKey =
    !requestPrompt?.managedHooksOnly && (pass !== undefined || hasModuleSite) && isPlainObject_5(toolInput)
      ? toolInput
      : undefined;
  let sessionId =
    !(signal ?? toolUseContext.abortController.signal).aborted && canSkipEmptyClassicDispatch("PreToolUse");
  if (
    (passedKey === undefined ||
      ((!hasModuleSite || sessionId) &&
        (pass === undefined || (pass.yields.length === 0 && Object.keys(pass.result).length === 0)))) &&
    !requestPrompt?.managedHooksOnly &&
    !hasHookToRun(
      "PreToolUse",
      toolUseContext.sessionHooksRegistry,
      registerAgent(toolUseContext, "PreToolUse", toolUseContext.session.id),
    )
  )
    return;
  logForDebugging(`executePreToolHooks called for tool: ${toolName}`, {
    level: "verbose",
  });
  let spec = {
    ...createBaseHookInput(toolUseContext.session, hookInputCwd(), permissionMode, toolUseContext),
    hook_event_name: "PreToolUse",
    tool_name: toolName,
    tool_input: toolInput,
    tool_use_id: toolUseID,
    ...getMcpServerHookField(toolName, toolUseContext),
  };
  function runFunctionSite(hookInput, managedHooksOnly) {
    return executeHooks({
      session: toolUseContext.session,
      hookInput:
        hookInput === undefined
          ? spec
          : {
              ...spec,
              tool_input: hookInput,
            },
      toolUseID,
      matchQuery: toolName,
      signal,
      timeoutMs,
      toolUseContext,
      managedHooksOnly: managedHooksOnly?.managedHooksOnly ?? requestPrompt?.managedHooksOnly,
      managedHooksExcluded: managedHooksOnly?.managedHooksExcluded,
    });
  }
  if (passedKey !== undefined) {
    for await (let result of runPreToolUseFunctionChain({
      hookInput: spec,
      toolInput: passedKey,
      signal: signal ?? toolUseContext.abortController.signal,
      runSettingsHooks: runFunctionSite,
      origin: toolUseContext.hookOrigin,
      managedPass: pass,
      failure: toolInputSummary,
    }))
      yield* keptForObservationContext(
        {
          toolUseContext,
          hookInput: spec,
        },
        stripConfinedHookApproval(result, "PreToolUse function-hook chain", spec, toolUseContext),
      );
    return;
  }
  yield* runFunctionSite();
}
//@ chunk-e6aww6q8.js:3438478-3438969 facade-exports = executePostToolHooks (0.869)
/**
 * 执行 PostToolUse 钩子（输入含 tool_response/duration_ms），可返回 additionalContext、updatedToolOutput、classifierContext。
 */
async function* executePostToolHooks(
  toolName,
  toolUseID,
  toolInput,
  toolResponse,
  toolUseContext,
  permissionMode,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  durationMs,
  options,
) {
  if (options?.managedHooksOnly && managedTierHooks("PostToolUse") === "none") return;
  if (!options?.managedHooksOnly && hasNoHookForToolCall("PostToolUse", toolName, toolInput, toolUseContext))
    return;
  let hookInput = {
    ...createBaseHookInput(toolUseContext.session, hookInputCwd(), permissionMode, toolUseContext),
    hook_event_name: "PostToolUse",
    tool_name: toolName,
    tool_input: toolInput,
    tool_response: toolResponse,
    tool_use_id: toolUseID,
    duration_ms: durationMs,
    ...getMcpServerHookField(toolName, toolUseContext),
  };
  yield* executeHooks({
    session: toolUseContext.session,
    hookInput,
    toolUseID,
    matchQuery: toolName,
    signal,
    timeoutMs,
    toolUseContext,
    managedHooksOnly: options?.managedHooksOnly,
    managedHooksExcluded: options?.managedHooksExcluded,
  });
}
//@ chunk-e6aww6q8.js:3438969-3439376 facade-exports = executePostToolUseFailureHooks (0.888)
/**
 * 执行 PostToolUseFailure 钩子（error/is_interrupt/duration_ms）。
 */
async function* executePostToolUseFailureHooks(
  toolName,
  toolUseID,
  toolInput,
  error,
  toolUseContext,
  isInterrupt,
  permissionMode,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  durationMs,
) {
  if (
    !hasHookToRun(
      "PostToolUseFailure",
      toolUseContext.sessionHooksRegistry,
      registerAgent(toolUseContext, "PostToolUseFailure", toolUseContext.session.id),
    )
  )
    return;
  let hookInput = {
    ...createBaseHookInput(toolUseContext.session, hookInputCwd(), permissionMode, toolUseContext),
    hook_event_name: "PostToolUseFailure",
    tool_name: toolName,
    tool_input: toolInput,
    tool_use_id: toolUseID,
    error,
    is_interrupt: isInterrupt,
    duration_ms: durationMs,
    ...getMcpServerHookField(toolName, toolUseContext),
  };
  yield* executeHooks({
    session: toolUseContext.session,
    hookInput,
    toolUseID,
    matchQuery: toolName,
    signal,
    timeoutMs,
    toolUseContext,
  });
}
//@ chunk-e6aww6q8.js:3439376-3439911 facade-exports
/**
 * 执行 PostToolBatch 钩子（316 新增）：一批工具调用全部完成、下一次请求前触发一次，输入 tool_calls 数组；附件上附 accountMemoryBatch 标记。
 */
async function* executePostToolBatchHooks(
  toolCalls,
  toolUseID,
  updatedToolUseContext,
  mode,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
) {
  if (updatedToolUseContext.options.settingsHooksOff) return;
  if (
    !hasHookToRun(
      "PostToolBatch",
      updatedToolUseContext.sessionHooksRegistry,
      registerAgent(updatedToolUseContext, "PostToolBatch", updatedToolUseContext.session.id),
    )
  )
    return;
  let hookInput = {
    ...createBaseHookInput(updatedToolUseContext.session, hookInputCwd(), mode, updatedToolUseContext),
    hook_event_name: "PostToolBatch",
    tool_calls: toolCalls,
  };
  let accountMemoryBatch = anyTrustedMemoryToolSafe(
    toolCalls.map((toolCall) => toolCall.tool_name),
    updatedToolUseContext.options.tools,
  );
  for await (let hookResult of executeHooks({
    session: updatedToolUseContext.session,
    hookInput,
    toolUseID,
    signal,
    timeoutMs,
    toolUseContext: updatedToolUseContext,
  }))
    yield hookResult.message?.type === "attachment"
      ? {
          ...hookResult,
          message: {
            ...hookResult.message,
            attachment: Object.assign({}, hookResult.message.attachment, {
              accountMemoryBatch,
            }),
          },
        }
      : hookResult;
}
//@ chunk-e6aww6q8.js:3439911-3440280 facade-exports = executePermissionDeniedHooks (0.911)
/**
 * 执行 PermissionDenied 钩子（auto 模式拒绝后），钩子可返回 retry:true 让模型重试。
 */
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
  let hookInput = {
    ...createBaseHookInput(toolUseContext.session, hookInputCwd(), permissionMode, toolUseContext),
    hook_event_name: "PermissionDenied",
    tool_name: toolName,
    tool_input: toolInput,
    tool_use_id: toolUseID,
    reason,
    ...getMcpServerHookField(toolName, toolUseContext),
  };
  yield* executeHooks({
    session: toolUseContext.session,
    hookInput,
    toolUseID,
    matchQuery: toolName,
    signal,
    timeoutMs,
    toolUseContext,
  });
}
//@ chunk-e6aww6q8.js:3440280-3440613 facade-exports = executePermissionRequestHooks (1)
/**
 * 执行 PermissionRequest 钩子（权限对话框出现时，输入含 permission_suggestions），钩子可返回 allow（可带 updatedInput/updatedPermissions）或 deny。
 */
async function* executePermissionRequestHooks(
  toolName,
  toolUseID,
  toolInput,
  toolUseContext,
  permissionMode,
  permissionSuggestions,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
) {
  logForDebugging(`executePermissionRequestHooks called for tool: ${toolName}`);
  let hookInput = {
    ...createBaseHookInput(toolUseContext.session, hookInputCwd(), permissionMode, toolUseContext),
    hook_event_name: "PermissionRequest",
    tool_name: toolName,
    tool_input: toolInput,
    permission_suggestions: permissionSuggestions,
    ...getMcpServerHookField(toolName, toolUseContext),
  };
  yield* executeHooks({
    session: toolUseContext.session,
    hookInput,
    toolUseID,
    matchQuery: toolName,
    signal,
    timeoutMs,
    toolUseContext,
  });
}
//@ chunk-e6aww6q8.js:3440613-3440700 affinity
/**
 * 工具是 MCP 工具时给钩子输入加 mcp_server 字段。
 */
function getMcpServerHookField(toolName, toolUseContext) {
  let mcpInfo = findToolByName(toolUseContext.options.tools, toolName)?.mcpInfo;
  return mcpInfo
    ? {
        mcp_server: mcpServerIdentityForHooks(mcpInfo),
      }
    : {};
}
//@ chunk-e6aww6q8.js:3440738-3441128 affinity
/**
 * 执行 UserPromptExpansion 钩子（316 新增；用户输入的斜杠命令展开成提示词时，matcher = command_name），exit 2 阻止展开。
 */
async function* executeUserPromptExpansionHooks(
  expansionType,
  commandName,
  commandArgs,
  commandSource,
  prompt,
  mode,
  context,
) {
  let sessionId = context.agentId ?? context.session.id;
  if (!hasHookToRun("UserPromptExpansion", context.sessionHooksRegistry, sessionId)) return;
  let hookInput = {
    ...createBaseHookInput(context.session, hookInputCwd(), mode),
    hook_event_name: "UserPromptExpansion",
    expansion_type: expansionType,
    command_name: commandName,
    command_args: commandArgs,
    command_source: commandSource,
    prompt,
  };
  yield* executeHooks({
    session: context.session,
    hookInput,
    toolUseID: randomUUID(),
    signal: context.abortController.signal,
    timeoutMs: TOOL_HOOK_EXECUTION_TIMEOUT_MS,
    toolUseContext: context,
  });
}
//@ chunk-e6aww6q8.js:3445264-3445551 placement
/**
 * 无 toolUseContext 时执行 UserPromptSubmit 钩子（只用会话钩子注册表），超时 30 秒。
 */
async function* executeUserPromptSubmitHooksForSession(
  session,
  sessionHooks,
  prompt,
  mode,
  signal,
  storageV5,
  credentials,
) {
  if (!hasHookToRun("UserPromptSubmit", sessionHooks, session.id)) return;
  let hookInput = {
    ...createBaseHookInput(session, hookInputCwd(), mode),
    hook_event_name: "UserPromptSubmit",
    prompt,
    ...false,
    session_title: getCurrentSessionTitle(session.id),
  };
  yield* executeHooks({
    session,
    hookInput,
    toolUseID: randomUUID(),
    signal,
    timeoutMs: USER_PROMPT_SUBMIT_HOOK_TIMEOUT_MS,
    sessionHooks,
    storageV5,
    credentials,
  });
}
//@ chunk-e6aww6q8.js:3445551-3445934 facade-exports = executeUserPromptSubmitHooks (0.764)
/**
 * 执行 UserPromptSubmit 钩子：输入含 prompt 与 session_title，超时 30 秒；exit 2 阻止并抹去原提示词。
 */
async function* executeUserPromptSubmitHooks(prompt, mode, context, requestPrompt, tiers = {}) {
  let sessionId = context.agentId ?? context.session.id;
  if (!tiers.managedHooksOnly && !hasHookToRun("UserPromptSubmit", context.sessionHooksRegistry, sessionId))
    return;
  let hookInput = {
    ...createBaseHookInput(context.session, hookInputCwd(), mode),
    hook_event_name: "UserPromptSubmit",
    prompt,
    ...false,
    session_title: getCurrentSessionTitle(context.session.id),
  };
  yield* executeHooks({
    session: context.session,
    hookInput,
    toolUseID: randomUUID(),
    signal: context.abortController.signal,
    timeoutMs: USER_PROMPT_SUBMIT_HOOK_TIMEOUT_MS,
    toolUseContext: context,
    ...tiers,
  });
}
//@ chunk-e6aww6q8.js:3445985-3446035 facade-exports = hasWorktreeCreateHook (0.551)
/**
 * 是否配置了 WorktreeCreate 钩子。
 */
function dispatchesWorktreeCreate() {
  return hasWorktreeCreateHook() || hasClassicHookSite("WorktreeCreate");
}
//@ chunk-e6aww6q8.js:3446085-3446104 affinity
var HOOK_ERROR_LINE_HEAD = 60;
var HOOK_ERROR_LINE_TAIL = 100;
//@ chunk-e6aww6q8.js:3446104-3447412 facade-exports = executeWorktreeCreateHook (0.659)
/**
 * 执行 WorktreeCreate 钩子：command 钩子 stdout 输出路径，http/callback 返回 hookSpecificOutput.worktreePath；配置了却没跑、无路径或失败都抛错；相对路径按项目根解析。
 */
async function executeWorktreeCreateHook(session, name, { storageV5, credentials } = {}) {
  let hookInput = {
    ...createBaseHookInput(session, getCwd()),
    hook_event_name: "WorktreeCreate",
    name,
  };
  let results = await executeHooksOutsideREPL({
    session,
    hookInput,
    timeoutMs: TOOL_HOOK_EXECUTION_TIMEOUT_MS,
    storageV5,
    credentials,
  });
  let worktreePath = firstWorktreePathOutput(results);
  if (worktreePath === undefined) {
    if (results.length === 0) {
      if (!hasWorktreeCreateHook()) return;
      throw Error(
        "WorktreeCreate hook failed: hook is configured but did not run (workspace not trusted or matcher mismatch)",
      );
    }
    let mapped = results
      .filter((result) => !result.succeeded)
      .map((result) => `${result.command}: ${truncateMiddle_2(result.output.trim()) || "no output"}`);
    if (mapped.length === 0 && results.some((result) => result.answerHeld))
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
  if (isAbsolute(worktreePath))
    return {
      worktreePath,
    };
  let project = getSessionProject(session);
  return {
    worktreePath: resolve_2(
      await safeHookCwd(preferRemoteValue(hookInput.cwd, project.originalCwd), project),
      worktreePath,
    ),
  };
}
//@ chunk-e6aww6q8.js:3447412-3448547 facade-exports = executeWorktreeRemoveHook (0.427)
/**
 * 执行 WorktreeRemove 钩子：返回 not_configured/removed/failed；失败但目录已不存在时视为已删除。
 */
async function executeWorktreeRemoveHook(session, worktreePath, { storageV5, credentials } = {}) {
  if (!hasWorktreeRemoveHook())
    return {
      kind: "not_configured",
    };
  let hookInput = {
    ...createBaseHookInput(session, getCwd()),
    hook_event_name: "WorktreeRemove",
    worktree_path: worktreePath,
  };
  let results = await executeHooksOutsideREPL({
    session,
    hookInput,
    timeoutMs: TOOL_HOOK_EXECUTION_TIMEOUT_MS,
    storageV5,
    credentials,
    personsHooksRunUntrusted: true,
  });
  if (results.length === 0) {
    if (!hasWorktreeRemoveHook_2())
      return {
        kind: "not_configured",
      };
    return {
      kind: "failed",
      summary: "is configured but did not run (workspace not trusted, or no matching hook entries)",
    };
  }
  let filtered = results.filter((result) => !result.succeeded);
  for (let result of filtered)
    logForDebugging(`WorktreeRemove hook failed [${result.command}]: ${result.output.trim()}`, {
      level: "error",
    });
  let [first] = filtered;
  if (first === undefined) {
    if (shouldSkipHookDueToTrust() && (await pathPresence(worktreePath)) !== "gone")
      return {
        kind: "failed",
        summary: "left the tree in place (workspace not trusted, so the folder's own hooks did not run)",
      };
    return {
      kind: "removed",
    };
  }
  let lineText = "";
  for (let line of first.output.split(`
`)) {
    lineText = printableLabel(line, {
      head: HOOK_ERROR_LINE_HEAD,
      tail: HOOK_ERROR_LINE_TAIL,
    });
    if (lineText) break;
  }
  let lineSuffix = lineText ? ` (${lineText})` : "";
  let stderr =
    first.exitCode !== undefined
      ? `exited ${first.exitCode}${lineSuffix}`
      : `failed${lineSuffix || " with no output"}`;
  if ((await pathPresence(worktreePath)) === "gone") {
    logForDebugging(
      `WorktreeRemove hook ${stderr}, but nothing is left at ${worktreePath} \u2014 treating it as removed`,
      {
        level: "warn",
      },
    );
    return {
      kind: "removed",
    };
  }
  return {
    kind: "failed",
    summary: stderr,
  };
}
//@ chunk-e6aww6q8.js:3448547-3448606 facade-exports
/**
 * SessionEnd 时间预算常量：最小 1.5s、钩子 timeout 上限 60s、env 覆盖上限 1h，以及按宿主保存的待唤醒 asyncRewake 任务集合。
 */
var SESSION_END_HOOK_TIMEOUT_MS_DEFAULT; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var SESSION_END_HOOK_TIMEOUT_CAP_MS;
var SESSION_END_ENV_TIMEOUT_CAP_MS;
var pendingRewakeHooksByHost;
deferInit("chunk-e6aww6q8.js:3448547", () => {
  SESSION_END_HOOK_TIMEOUT_MS_DEFAULT = 1500;
  SESSION_END_HOOK_TIMEOUT_CAP_MS = 60000;
  SESSION_END_ENV_TIMEOUT_CAP_MS = 3600000;
  pendingRewakeHooksByHost = new SessionRootSlot(() => new Set());
});
//@ chunk-e6aww6q8.js:3448606-3448640 layout
function getPendingRewakeHooks() {
  return pendingRewakeHooksByHost.of(getRootSession());
}
//@ chunk-e6aww6q8.js:3448640-3448662 layout
var REWAKE_DRAIN_TIMEOUT_MS = 30000;
var REWAKE_SUMMARY_MAX_CHARS = 300;
//@ chunk-e6aww6q8.js:3448662-3448727 layout
function squashToSummaryLine(text) {
  return text.trim().replace(/\s+/g, " ").slice(0, REWAKE_SUMMARY_MAX_CHARS);
}
//@ chunk-e6aww6q8.js:3448727-3448863 facade-exports
/**
 * 等待所有 asyncRewake 后台钩子完成，最多 30 秒。
 */
async function flushPendingAsyncRewakeHooks() {
  let pendingRewakeHooks = getPendingRewakeHooks();
  if (pendingRewakeHooks.size === 0) return;
  let settled = Promise.allSettled([...pendingRewakeHooks]);
  await Promise.race([
    settled,
    sleep(REWAKE_DRAIN_TIMEOUT_MS, undefined, {
      unref: true,
    }),
  ]);
}
//@ chunk-e6aww6q8.js:3448863-3448912 facade-exports
/**
 * SessionEnd 钩子总超时 = max(组织设定或 1.5s, env 覆盖)。
 */
function getSessionEndHookDefaultTimeoutMs() {
  return Math.max(
    getManagedSessionEndTimeoutMs() ?? SESSION_END_HOOK_TIMEOUT_MS_DEFAULT,
    getSessionEndHookTimeoutMs_2(),
  );
}
//@ chunk-e6aww6q8.js:3448912-3449382 layout
function getManagedSessionEndTimeoutMs() {
  let settled;
  try {
    let policyHooksFromSnapshot = getPolicyHooksFromSnapshot();
    settled =
      policyHooksFromSnapshot === "unreadable" ||
      (policyHooksFromSnapshot.SessionEnd ?? []).length > 0 ||
      getManagedHooksForEvent("SessionEnd").length > 0 ||
      getHooksForEvent("SessionEnd").some(
        (group) =>
          "pluginId" in group && typeof group.pluginId === "string" && isManagedPluginId(group.pluginId),
      );
  } catch (error) {
    logForDebugging(
      `Hooks: who defines a SessionEnd hook could not be told, so its time budget is read as the organization's hook reads it: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    settled = true;
  }
  return settled
    ? withHostEnvRestored(() => env.CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS)
    : env.CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS;
}
//@ chunk-e6aww6q8.js:3449382-3449492 fingerprint = getSessionEndHookTimeoutMs (0.793)
/**
 * 读取 CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS（上限 1 小时），与组织值相同时视为未覆盖。
 */
function getSessionEndHookTimeoutMs_2() {
  let raw = env.CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS;
  return raw !== undefined && raw !== getManagedSessionEndTimeoutMs()
    ? Math.min(raw, SESSION_END_ENV_TIMEOUT_CAP_MS)
    : 0;
}
//@ chunk-e6aww6q8.js:3449492-3449820 facade-exports
/**
 * SessionEnd 的结束时限：取各来源 SessionEnd 钩子 timeout 的最大值（上限 60s），不少于 1.5s。
 */
function getSessionEndHookTimeoutMs() {
  let sessionEndHookTimeoutMs = getSessionEndHookTimeoutMs_2();
  let managedSessionEndTimeoutMs = getManagedSessionEndTimeoutMs();
  if (managedSessionEndTimeoutMs !== undefined)
    return Math.max(managedSessionEndTimeoutMs, sessionEndHookTimeoutMs);
  let maxTimeoutMs = 0;
  let agentHooks = shouldAllowManagedHooksOnly() ? [] : (getMainThreadAgentHooks()?.SessionEnd ?? []);
  let SessionEnd = getHooksConfigFromSnapshot()?.SessionEnd ?? [];
  let hooks = [
    ...(shouldOmitCheckoutSessionEndHooks("SessionEnd")
      ? withoutCheckoutSettingsHooks(SessionEnd, "SessionEnd")
      : SessionEnd),
    ...agentHooks,
    ...getPluginSettingsHooks("SessionEnd"),
  ];
  for (let group of hooks)
    for (let hook of group.hooks)
      if (hook.timeout && hook.timeout * 1000 > maxTimeoutMs) maxTimeoutMs = hook.timeout * 1000;
  return Math.max(
    SESSION_END_HOOK_TIMEOUT_MS_DEFAULT,
    Math.min(maxTimeoutMs, SESSION_END_HOOK_TIMEOUT_CAP_MS),
    sessionEndHookTimeoutMs,
  );
}
//@ chunk-e6aww6q8.js:3449820-3449932 layout
var ACCOUNT_MEMORY_OUTPUT_WITHHELD =
  "(output withheld: this hook ran for an account memory tool, whose text stays out of the conversation)";
//@ chunk-e6aww6q8.js:3449932-3452334 layout
/**
 * 把 command 钩子转为后台：asyncRewake 时等进程结束，exit 2 用 rewakeMessage/rewakeSummary 包装 stderr 作为下一条提醒唤醒模型（缺失脚本只报告一次）；普通 async 登记到 AsyncHookRegistry 由后续轮询收集。
 */
function backgroundHookProcess({
  processId,
  hookId,
  shellCommand,
  asyncResponse,
  hookEvent,
  hookName,
  command,
  asyncRewake,
  rewakeMessage,
  rewakeSummary,
  scriptPaths,
  pluginId,
  toolName,
  ranForAccountMemory = false,
  missingScriptThere,
}) {
  if (asyncRewake) {
    let rewakeTask = shellCommand.result.then(async (settled) => {
      await new Promise((resolve) => setImmediate(resolve));
      let stdout = await shellCommand.taskOutput.getStdout();
      let stderr = shellCommand.taskOutput.getStderr();
      shellCommand.cleanup();
      emitHookResponse({
        hookId,
        hookName,
        hookEvent,
        output: stdout + stderr,
        stdout,
        stderr,
        exitCode: settled.code,
        outcome: settled.code === 0 ? "success" : "error",
      });
      let rewakeMessage_2;
      if (pluginId) {
        let jsonParseBudget = createJsonParseBudget();
        for (let line of stdout.split(`
`)) {
          let trimmed = line.trim();
          if (!trimmed.startsWith("{") || !jsonParseBudget(trimmed)) continue;
          try {
            let parsed = jsonParse(trimmed);
            if ("async" in parsed) continue;
            if (isSyncHookJSONOutput(parsed)) {
              emitHookMetrics(parsed.metrics, pluginId, hookEvent);
              if (
                typeof parsed.rewakeSummary === "string" &&
                parsed.rewakeSummary.trim() &&
                isOfficialPluginId(pluginId)
              )
                rewakeMessage_2 = squashToSummaryLine(parsed.rewakeSummary);
            }
            break;
          } catch {}
        }
      }
      let exitCode = settled.code === 2 && !ranForAccountMemory ? missingScriptThere?.() : undefined;
      let scriptInfo =
        exitCode !== undefined
          ? {
              ...exitCode,
              output: stderr.trim() ? stderr : stdout,
            }
          : settled.code === 2
            ? await detectMissingHookScript({
                stdout,
                stderr,
                scriptPaths: (scriptPaths ?? []).map((scriptPath) => scriptPath.path),
              })
            : undefined;
      if (
        exitCode?.isRepeat ??
        rememberBounded(
          rememberedScriptsRegistry.of(getRootSession().host),
          `${hookName}
${command}`,
          scriptInfo?.output,
        )
      ) {
        logForDebugging(
          `Hooks: asyncRewake hook "${hookName}" (${command}) exited 2 again because ${scriptInfo?.scriptPath} cannot be opened; already reported, not waking the model`,
          {
            level: "warn",
          },
        );
        return;
      }
      if (settled.code === 2) {
        let message;
        let detail;
        let blockingError;
        if (scriptInfo !== undefined) {
          let cutFrom =
            exitCode?.cutFrom ??
            scriptPaths?.find((scriptPath) => scriptPath.path === scriptInfo.scriptPath)?.cutFrom;
          let passNote = "";
          detail = `${hookEvent} hook could not open ${basename(scriptInfo.scriptPath)}`;
          if (cutFrom !== undefined) {
            passNote = ` (the hook's command passes ${cutFrom} without quotes, so the shell split it at the space)`;
            detail = `${hookEvent} hook needs quotes around a path with a space (${basename(cutFrom)})`;
          }
          message = `${hookName} hook could not run: ${scriptInfo.scriptPath} cannot be opened${passNote}, so its command exited with code 2 without doing any work. This is a broken hook installation, not feedback on your work; it is reported this once and identical repeats are dropped. Interpreter output:`;
          blockingError = scriptInfo.output;
        } else if (ranForAccountMemory) {
          message = rewakeMessage ?? `Stop hook blocking error from command "${hookName}":`;
          detail = rewakeSummary ?? "Stop hook feedback";
          blockingError = ACCOUNT_MEMORY_OUTPUT_WITHHELD;
        } else {
          message = rewakeMessage ?? `Stop hook blocking error from command "${hookName}":`;
          detail = rewakeMessage_2 ?? rewakeSummary ?? "Stop hook feedback";
          blockingError = stderr || stdout;
        }
        enqueueHookTaskNotification({
          summary: scrubHookOutputTags_2(detail),
          body: scrubHookOutputTags_2(scrubHookOutputTags(`${message} ${blockingError}`)),
          priority: "next",
          stopHookActive: true,
          turnAttribution: "inherit",
        });
      }
    });
    let pendingRewakeHooks = getPendingRewakeHooks();
    pendingRewakeHooks.add(rewakeTask);
    rewakeTask.finally(() => pendingRewakeHooks.delete(rewakeTask));
    return true;
  }
  if (
    !shellCommand.background(processId, {
      skipSpill: true,
      atExit: "leave",
    })
  )
    return false;
  registerPendingAsyncHook({
    processId,
    hookId,
    asyncResponse,
    hookEvent,
    hookName,
    command,
    shellCommand,
    toolName,
    pluginId,
  });
  return true;
}
//@ chunk-e6aww6q8.js:3452334-3452360 facade-exports
/**
 * 工作区未被信任时返回 true（所有设置钩子跳过）。
 */
function shouldSkipHookDueToTrust() {
  return !isProjectScopeTrustAccepted();
}
//@ chunk-e6aww6q8.js:3452360-3452596 layout
function shouldOmitCheckoutSessionEndHooks(session) {
  if (session !== "SessionEnd" || !getIsNonInteractiveSession()) return false;
  try {
    if (checkHasTrustDialogAccepted()) return false;
  } catch (error) {
    logForDebugging(`Hooks: workspace trust could not be read: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
  logForDebugging(`Leaving out the checkout's ${session} hooks - workspace trust not accepted`);
  return true;
}
//@ chunk-e6aww6q8.js:3452596-3452641 facade-exports
/**
 * 会话 id 的安全字符集正则。
 */
var SAFE_CALLER_ID = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,255}$/;
//@ chunk-e6aww6q8.js:3452641-3452676 facade-exports
/**
 * 钩子输入 cwd：无盘会话用 gl()，否则 getCwd()。
 */
function hookInputCwd() {
  return isDiskless() ? getCwdOrNull() : getCwd();
}
//@ chunk-e6aww6q8.js:3452676-3452719 layout
function getHookProject(session) {
  return isDiskless() ? session.project : getSessionProject(session);
}
//@ chunk-e6aww6q8.js:3452719-3453338 facade-exports
/**
 * 构造所有钩子输入的公共字段：session_id、transcript_path、cwd、scratchpad_dir、prompt_id、permission_mode、agent_id、agent_type、effort；云端服务调用时 session_id 为 served:<caller>、transcript_path 为空。
 */
function createBaseHookInput(session, cwd, permissionMode, toolUseContext) {
  let agentType = toolUseContext?.agentType ?? getMainThreadAgentType();
  let mainLoopModel = toolUseContext?.options?.mainLoopModel;
  let effortLevel = resolveEffortLevel(toolUseContext?.getAppState?.() ?? {}, mainLoopModel, {
    withHold: isSessionHoldFor(toolUseContext ?? {}),
  });
  let effortLayerOverride = getEffortLayerOverride(toolUseContext?.permissionLayers);
  let effort =
    mainLoopModel && toolUseContext?.getAppState && modelSupportsEffort(mainLoopModel)
      ? {
          level: getEffortLevelOrHigh(mainLoopModel, effortLevel, effortLayerOverride),
        }
      : undefined;
  let cwd_2 = cwd ?? "";
  let remoteCall = toolUseContext?.remoteCall;
  if (remoteCall !== undefined)
    return {
      session_id: `served:${(SAFE_CALLER_ID.test(remoteCall.origin.callerSessionId ?? "") ? remoteCall.origin.callerSessionId : undefined) ?? "unknown"}`,
      transcript_path: "",
      cwd: cwd_2,
      permission_mode: permissionMode,
      agent_id: toolUseContext?.agentId,
      effort,
    };
  return {
    session_id: session.id,
    transcript_path: isDiskless() ? "" : getTranscriptPathForSession(session.id),
    cwd: cwd_2,
    scratchpad_dir: isScratchpadEnabled() ? (getScratchpadDir(session.id) ?? undefined) : undefined,
    prompt_id: getPromptId_2() ?? undefined,
    permission_mode: permissionMode,
    agent_id: toolUseContext?.agentId,
    agent_type: agentType,
    effort,
  };
}
//@ chunk-e6aww6q8.js:3453338-3453493 layout
function getHookRewriterKind(returned, value) {
  switch (returned.type) {
    case "command":
    case "script":
      return value ? "session_hook" : "local_code";
    case "callback":
      return "local_code";
    default:
      return "remote";
  }
}
//@ chunk-e6aww6q8.js:3453493-3453685 fingerprint = validateHookJson (0.727)
function validateHookJson(jsonString) {
  let parsed = jsonParse(jsonString);
  let validation = hookJSONOutputSchema().safeParse(parsed);
  if (validation.success) {
    logForDebugging("Successfully parsed and validated hook JSON output");
    validateHookJsonOutput(parsed, validation.data);
    return {
      json: validation.data,
    };
  }
  return {
    validationError: formatHookOutputError(parsed, validation.error),
  };
}
//@ chunk-e6aww6q8.js:3453685-3454517 facade-exports
/**
 * 解析钩子 stdout：不以 { 开头视为纯文本；{async:true} 识别为异步；JSON 按输出 schema 校验，失败时返回纯文本 + 带期望 schema 的 validationError；多个 JSON 文档视为纯文本。
 */
function parseHookOutput(json) {
  let trimmed = json.trim();
  if (!trimmed.startsWith("{")) {
    logForDebugging("Hook output does not start with {, treating as plain text");
    return {
      plainText: json,
    };
  }
  if (announcedAsync(json))
    return {
      json: {
        async: true,
      },
    };
  try {
    let validation = validateHookJson(trimmed);
    if ("json" in validation) return validation;
    let message = `${validation.validationError}

Expected schema:
${parseHookOutput_2()}`;
    logForDebugging(message);
    return {
      plainText: json,
      validationError: message,
    };
  } catch (error) {
    if (!trimmed.endsWith("}")) {
      logForDebugging(
        `Hook output starts with { but is not a JSON object, treating as plain text: ${errorMessage(error)}`,
      );
      return {
        plainText: json,
      };
    }
    if (isJsonLinesOutput(trimmed)) {
      logForDebugging("Hook output is several JSON documents, treating as plain text");
      return {
        plainText: json,
      };
    }
    let message = `Hook output looks like a JSON object but is not valid JSON \u2014 ${errorMessage(error)}. Emit the payload with a JSON encoder (jq, ConvertTo-Json, json.dumps) rather than string concatenation so backslashes and quotes inside strings are escaped.`;
    logForDebugging(message);
    return {
      plainText: json,
      validationError: message,
    };
  }
}
//@ chunk-e6aww6q8.js:3454517-3454784 layout
function isJsonLinesOutput(stdout) {
  let filtered = stdout
    .split(
      `
`,
    )
    .filter((line) => line.trim() !== "");
  if (filtered.length < 2) return false;
  using span = slowLogging`parseHookOutput: json lines (${filtered.length})`;
  return filtered.every((line) => {
    try {
      let parsed = hookJSONOutputSchema().safeParse(jsonParseRaw(line.trim()));
      return !parsed.success || Object.keys(parsed.data).length === 0;
    } catch {
      return false;
    }
  });
}
//@ chunk-e6aww6q8.js:3454784-3454946 facade-exports = isSyncHookJSONOutput (1)
/**
 * 判断钩子 stdout 是否声明自己转为异步：去掉前后空白后是 JSON 对象且 `async === true`。
 */
function announcedAsync(json) {
  let trimmed = getFirstLine(json).trim();
  if (!trimmed.startsWith("{")) return false;
  try {
    let parsed = jsonParse(trimmed);
    return typeof parsed === "object" && parsed !== null && "async" in parsed && parsed.async === true;
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:3454946-3455042 facade-exports
/**
 * 非 0 退出且有 stderr 时把 stderr 附到校验错误后。
 */
function withHookStderr(validationError, status, stderr) {
  let trimmed = stderr.trim();
  return status !== 0 && trimmed
    ? `${validationError}

Hook exited ${status} with stderr:
${trimmed}`
    : validationError;
}
//@ chunk-e6aww6q8.js:3455042-3455100 layout
function isWithheldGuardHttpHook(hook, hookEvent) {
  return hook.withheld === true && isHttpMcpServeInvocation() && PROMPT_GUARD_EVENTS.has(hookEvent);
}
//@ chunk-e6aww6q8.js:3455100-3455231 layout
function httpHookUnreachableMessage(hookEvent, error) {
  return `Refused, and a retry will be too: an HTTP hook is set on ${hookEvent} and could not be asked. ${error ?? ""}`.trimEnd();
}
//@ chunk-e6aww6q8.js:3455231-3455743 facade-exports = parseHttpHookOutput (1)
/**
 * 解析 HTTP 钩子响应体：空体当 {}，必须是 JSON 对象并通过输出 schema。
 */
function parseHttpHookOutput(body) {
  let trimmed = body.trim();
  if (trimmed === "") {
    let validation = hookJSONOutputSchema().safeParse({});
    if (validation.success) {
      logForDebugging("HTTP hook returned empty body, treating as empty JSON object");
      return {
        json: validation.data,
      };
    }
  }
  if (!trimmed.startsWith("{")) {
    let validationError = `HTTP hook must return JSON, but got non-JSON response body: ${trimmed.length > 200 ? trimmed.slice(0, 200) + "\u2026" : trimmed}`;
    logForDebugging(validationError);
    return {
      validationError,
    };
  }
  try {
    let result = validateHookJson(trimmed);
    if ("json" in result) return result;
    logForDebugging(result.validationError);
    return result;
  } catch (e) {
    let validationError = `HTTP hook must return valid JSON, but parsing failed: ${e}`;
    logForDebugging(validationError);
    return {
      validationError,
    };
  }
}
//@ chunk-e6aww6q8.js:3455743-3455770 layout
var loggedMcpOutputProbes; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:3455743", () => {
  loggedMcpOutputProbes = new HostScoped(() => new Set());
});
//@ chunk-e6aww6q8.js:3455770-3455929 layout
function logUpdatedMcpToolOutputProbe(supported) {
  let label = supported ? "true" : "false";
  let logged = loggedMcpOutputProbes.of(getRootSession().host);
  if (logged.has(label)) return;
  logged.add(label);
  logEvent("tengu_dead_probe_hook_updated_mcp_tool_output", {
    with_new_field: fromEnum(label),
  });
}
//@ chunk-e6aww6q8.js:3455929-3462176 fingerprint = processHookJSONOutput (0.8)
/**
 * 把钩子 JSON 输出翻译成内部结果：continue:false → preventContinuation/stopReason；decision approve/block；systemMessage；terminalSequence（白名单 OSC）；按 hookSpecificOutput.hookEventName 处理 permissionDecision、updatedInput、additionalContext、sessionTitle、watchPaths、reloadSkills、updatedToolOutput、retry、PermissionRequest decision、elicitation action、displayContent 等；事件名不符抛错。
 */
function processHookJSONOutput({
  json,
  command,
  hookName,
  toolUseID,
  hookEvent,
  expectedHookEvent,
  stdout,
  stderr,
  exitCode,
  durationMs,
}) {
  let result = {};
  let syncJson = json;
  if (syncJson.continue === false) {
    result.preventContinuation = true;
    if (syncJson.stopReason) result.stopReason = syncJson.stopReason;
  }
  if (json.decision)
    switch (json.decision) {
      case "approve":
        result.permissionBehavior = "allow";
        break;
      case "block":
        result.permissionBehavior = "deny";
        result.blockingError = {
          blockingError: json.reason || "Blocked by hook",
          command,
          ...promptEndingFields(hookEvent, {
            reason: json.reason,
          }),
        };
        break;
      default:
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Unknown hook decision type: ${json.decision}. Valid types are: approve, block`,
          "hook output has an unknown decision type",
        );
    }
  if (json.systemMessage) result.systemMessage = json.systemMessage;
  if (json.terminalSequence) {
    let rendered = renderTerminalSequences(json.terminalSequence);
    if (rendered !== null) result.terminalSequence = rendered;
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
        result.permissionBehavior = "deny";
        result.blockingError = {
          blockingError: json.reason || "Blocked by hook",
          command,
        };
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
  if (result.permissionBehavior !== undefined && json.reason !== undefined)
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
              result.permissionBehavior = "deny";
              result.blockingError = {
                blockingError:
                  json.hookSpecificOutput.permissionDecisionReason || json.reason || "Blocked by hook",
                command,
              };
              break;
            case "ask":
              result.permissionBehavior = "ask";
              break;
            case "defer":
              result.permissionBehavior = "defer";
              break;
          }
        result.hookPermissionDecisionReason = json.hookSpecificOutput.permissionDecisionReason;
        if (json.hookSpecificOutput.updatedInput) result.updatedInput = json.hookSpecificOutput.updatedInput;
        result.permissionDisplay = json.hookSpecificOutput.permissionDisplay;
        result.additionalContext = json.hookSpecificOutput.additionalContext;
        break;
      case "UserPromptSubmit":
        result.additionalContext = json.hookSpecificOutput.additionalContext;
        result.sessionTitle = json.hookSpecificOutput.sessionTitle;
        result.suppressOriginalPrompt = json.hookSpecificOutput.suppressOriginalPrompt;
        break;
      case "UserPromptExpansion":
        result.additionalContext = json.hookSpecificOutput.additionalContext;
        result.suppressOriginalPrompt = json.hookSpecificOutput.suppressOriginalPrompt;
        break;
      case "SessionStart":
        result.additionalContext = json.hookSpecificOutput.additionalContext;
        result.initialUserMessage = json.hookSpecificOutput.initialUserMessage;
        result.sessionTitle = json.hookSpecificOutput.sessionTitle;
        if ("watchPaths" in json.hookSpecificOutput && json.hookSpecificOutput.watchPaths)
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
              result.permissionBehavior = "deny";
              result.blockingError = {
                blockingError:
                  json.hookSpecificOutput.permissionDecisionReason || json.reason || "Blocked by hook",
                command,
              };
              break;
            case "ask":
              result.permissionBehavior = "ask";
              break;
          }
        if (json.hookSpecificOutput.permissionDecisionReason !== undefined)
          result.hookPermissionDecisionReason = json.hookSpecificOutput.permissionDecisionReason;
        break;
      case "PostModelSwitch":
        result.additionalContext = json.hookSpecificOutput.additionalContext;
        break;
      case "SubagentStart":
        result.additionalContext = json.hookSpecificOutput.additionalContext;
        break;
      case "PostToolUse":
        result.additionalContext = json.hookSpecificOutput.additionalContext;
        result.classifierContext = json.hookSpecificOutput.classifierContext;
        if (json.hookSpecificOutput.updatedToolOutput !== undefined)
          result.updatedToolOutput = json.hookSpecificOutput.updatedToolOutput;
        if (json.hookSpecificOutput.updatedMCPToolOutput) {
          logUpdatedMcpToolOutputProbe(json.hookSpecificOutput.updatedToolOutput !== undefined);
          result.updatedMCPToolOutput = json.hookSpecificOutput.updatedMCPToolOutput;
        } else if (json.hookSpecificOutput.updatedMCPToolOutput !== undefined)
          result.legacyMcpRewriteSuppressed = true;
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
          result.permissionRequestResult = json.hookSpecificOutput.decision;
          result.permissionBehavior =
            json.hookSpecificOutput.decision.behavior === "allow" ? "allow" : "deny";
          if (
            json.hookSpecificOutput.decision.behavior === "allow" &&
            json.hookSpecificOutput.decision.updatedInput
          )
            result.updatedInput = json.hookSpecificOutput.decision.updatedInput;
        }
        break;
      case "Elicitation":
        if (json.hookSpecificOutput.action) {
          result.elicitationResponse = {
            action: json.hookSpecificOutput.action,
            content: json.hookSpecificOutput.content,
          };
          if (json.hookSpecificOutput.action === "decline")
            result.blockingError = {
              blockingError: json.reason || "Elicitation denied by hook",
              command,
            };
        }
        break;
      case "ElicitationResult":
        if (json.hookSpecificOutput.action) {
          result.elicitationResultResponse = {
            action: json.hookSpecificOutput.action,
            content: json.hookSpecificOutput.content,
          };
          if (json.hookSpecificOutput.action === "decline")
            result.blockingError = {
              blockingError: json.reason || "Elicitation result blocked by hook",
              command,
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
          hookName,
          toolUseID,
          hookEvent,
          blockingError: result.blockingError,
        })
      : createAttachmentMessage_2({
          type: "hook_success",
          hookName,
          toolUseID,
          hookEvent,
          content: "",
          stdout,
          stderr,
          exitCode,
          command,
          durationMs,
        }),
  };
}
//@ chunk-e6aww6q8.js:3462176-3462542 sole-consumer
async function pluginRootExists(storageV5, pluginRoot) {
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    let versionCachePath = parseVersionCachePath(pluginRoot, projectPluginCacheDir());
    if (versionCachePath) {
      let scopeKind = await storageV5.scopeKind(
        {
          namespace: "pluginCache",
          marketplace: versionCachePath.marketplace,
          plugin: versionCachePath.plugin,
          version: versionCachePath.version,
        },
        {
          resolveLink: true,
        },
      );
      if (scopeKind.ok)
        switch (scopeKind.value.kind) {
          case "absent":
            return false;
          case "directory":
          case "other":
            return true;
          case "link":
            return scopeKind.value.linkResolves === true;
          default:
            return scopeKind.value;
        }
    }
  }
  return pathExists(pluginRoot);
}
//@ chunk-e6aww6q8.js:3462542-3462582 sole-consumer
function getHookStdoutForParsing(result) {
  return getRunnerJsonStdout(result) ?? result.stdout;
}
//@ chunk-e6aww6q8.js:3462582-3462732 sole-consumer
function replaceTrailingResult(stdout, resultStdout, resultWasString) {
  let suffix = resultWasString
    ? resultStdout
    : resultStdout +
      `
`;
  if (suffix === "") return stdout;
  let stripped = stdout.endsWith(suffix) ? stdout.slice(0, -suffix.length) : stdout;
  return stripped === ""
    ? resultStdout
    : `${stripped}${
        stripped.endsWith(`
`)
          ? ""
          : `
`
      }${resultStdout}`;
}
//@ chunk-e6aww6q8.js:3462732-3462840 sole-consumer
function exitedByContract(hook) {
  return (
    hook.exitedNormally === true &&
    !hook.spawnFailed &&
    hook.status <= 128 &&
    hook.status !== 126 &&
    hook.status !== 127
  );
}
//@ chunk-e6aww6q8.js:3462840-3463039 sole-consumer
function didScriptHookRun(hook) {
  if (hook.backgrounded) return true;
  if (hook.runnerConflict && hook.status !== 2) return false;
  if (hook.runnerExited === true) return hook.status <= 255;
  if (hook.aborted || hook.spawnFailed || hook.exitedNormally !== true) return false;
  return false;
}
//@ chunk-e6aww6q8.js:3463039-3463549 sole-consumer
function describeHookDidNotRun(hook) {
  if (hook.runnerConflict) return "no single verdict (re-runs disagreed, or a malformed result or exit line)";
  if (hook.aborted) return "timed out";
  if (hook.spawnFailed) return "could not start";
  if (hook.exitedNormally !== true || hook.runnerStarted) return "killed before it finished";
  if (hook.stderr !== undefined && hook.stderr.trim() === "")
    return `nothing from the runner reached this process (exit ${hook.status}) \u2014 a launcher that redirects the hook's stderr hides its verdict`;
  return `its launcher exited ${hook.status} before the hook ran`;
}
//@ chunk-e6aww6q8.js:3463549-3463779 sole-consumer
function guardScriptHookBlock(hook, hookEvent, command, reason) {
  if (hook.type !== "script" || !GUARD_HOOK_EVENTS.has(hookEvent)) return;
  let message = `[${command}]: did not run (${reason}) \u2014 a ${hookEvent} guard that cannot run blocks`;
  return {
    blockingError: {
      blockingError: message,
      command,
    },
    ...blockingErrorResult(hookEvent, command, message),
    outcome: "blocking",
    hook,
  };
}
//@ chunk-e6aww6q8.js:3463779-3463952 sole-consumer
function writeRemoteHookInput(hooks, hookInput) {
  try {
    return hooks(hookInput);
  } catch (error) {
    logError(
      withTelemetryMessage(
        Error("Failed to write hook input for another machine", {
          cause: error,
        }),
        "Failed to write hook input for another machine",
      ),
    );
    return;
  }
}
//@ chunk-e6aww6q8.js:3463952-3463999 sole-consumer
function isOversizedHookInput(hookEvent, inputText) {
  return inputText.length > hookInputSizeLimit() && isGuardedHookEvent(hookEvent);
}
//@ chunk-e6aww6q8.js:3463999-3464093 sole-consumer
function logHookMatchingFailure(hookEvent, cause) {
  logError(
    Error("Failed to match hooks", {
      cause,
    }),
  );
  logFeatureBad(hookFeature(hookEvent), "hook_matching_failed");
}
//@ chunk-e6aww6q8.js:3464175-3477576 fingerprint = execCommandHook (0.531)
/**
 * 执行 command 钩子：云端设备转发、exec 形式（args）或 shell（bash/Git Bash/PowerShell）启动；注入 CLAUDE_PROJECT_DIR、CLAUDE_PLUGIN_ROOT/DATA、CLAUDE_PLUGIN_OPTION_*、CLAUDE_ENV_FILE 等环境变量；stdin 写入 JSON 输入；首行 {async:true} 或 async/asyncRewake 配置时转后台；返回 stdout/stderr/status 及 stdio 完整性标志。
 */
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
  let hookOriginLabel = getHookOriginLabel({
    pluginId,
    settingsSource,
  });
  let pluginHookRunner = getPluginHookRunner();
  if (hookOriginLabel !== undefined && pluginHookRunner !== undefined) {
    if (
      hookEvent === "StatusLine" ||
      hookEvent === "FileSuggestion" ||
      envExtra !== undefined ||
      servedEnv !== undefined
    )
      return buildCannotRunElsewhereResult(hookEvent, "unsupported_in_cloud_session");
    if (remoteJsonInput === undefined) return buildCannotRunElsewhereResult(hookEvent, "remote_run_failed");
    let options = {
      ...hookOriginLabel,
      hook,
      hookEvent,
      jsonInput: remoteJsonInput,
      hookIndex,
      toolUseID: toolInfo?.toolUseID,
    };
    let spawn = (signal, inBackground) => {
      let limit = {
        startedAt: systemClock.monotonicNow(),
      };
      let timeoutMs = hook.timeout ? hook.timeout * 1000 : TOOL_HOOK_EXECUTION_TIMEOUT_MS;
      return Promise.race([
        Promise.resolve().then(() =>
          pluginHookRunner.run({
            ...options,
            inBackground,
            signal,
            limit,
          }),
        ),
        new Promise((resolve) => {
          let onAborted = () => {
            let hookOwnsStdin = !inBackground && systemClock.monotonicNow() - limit.startedAt >= timeoutMs;
            resolve({
              ...(blocksWhenItCannotRunElsewhere(hookEvent) &&
              settingsSource !== "projectSettings" &&
              (hookOwnsStdin || !isOwnUserPromptHook(hookEvent, hook, hookOriginLabel))
                ? buildCannotRunElsewhereResult(hookEvent, "remote_run_timed_out")
                : {
                    stdout: "",
                    stderr: "",
                    output: "",
                    status: 1,
                    aborted: true,
                  }),
              ...(hookOwnsStdin && {
                stoppedAfterItsTimeout: true,
              }),
            });
          };
          if (signal.aborted) onAborted();
          else
            signal.addEventListener("abort", onAborted, {
              once: true,
            });
        }),
      ]);
    };
    if (isAsyncHookJSONOutput(hook, forceSyncExecution)) {
      let taskId = `async_hook_${randomUUID()}`;
      let abortController = new AbortController();
      let missingScript;
      let shellCommand = createRemoteHookTask(
        taskId,
        spawn(abortController.signal, true).then((backgroundTask) => {
          let missingScript_2 = backgroundTask.missingScript;
          missingScript =
            settingsSource === "projectSettings" && missingScript_2 !== undefined
              ? {
                  ...missingScript_2,
                  scriptPath: squashToSummaryLine(missingScript_2.scriptPath),
                  cutFrom: missingScript_2.cutFrom && squashToSummaryLine(missingScript_2.cutFrom),
                }
              : undefined;
          return backgroundTask;
        }),
        abortController,
      );
      let backgroundHandle = backgroundHookProcess({
        processId: taskId,
        hookId,
        shellCommand,
        asyncResponse: {
          async: true,
          asyncTimeout: hook.timeout ? hook.timeout * 1000 : TOOL_HOOK_EXECUTION_TIMEOUT_MS,
        },
        hookEvent,
        hookName,
        command: getHookDisplayText(hook),
        asyncRewake: hook.asyncRewake,
        rewakeMessage: hook.rewakeMessage,
        rewakeSummary: hook.rewakeSummary,
        pluginId,
        toolName: toolInfo?.toolName,
        ranForAccountMemory: toolInfo?.accountMemory === true,
        missingScriptThere: () => missingScript,
      });
      if (backgroundHandle)
        return {
          stdout: "",
          stderr: "",
          output: "",
          status: 0,
          backgrounded: backgroundHandle,
        };
    }
    let foregroundResult = await spawn(signal, false).catch((error) => {
      logForDebugging(`Hooks: a hook's run on another machine failed (${errorMessage(error)})`, {
        level: "error",
      });
      return error instanceof NoAnswerInTimeError ? "remote_run_timed_out" : "remote_run_failed";
    });
    if (typeof foregroundResult === "string")
      return buildCannotRunElsewhereResult(hookEvent, foregroundResult);
    return {
      ...foregroundResult,
      ranElsewhere: true,
      stdout: removeClaudeCodeHintLines(foregroundResult.stdout),
      stderr: removeClaudeCodeHintLines(foregroundResult.stderr),
      output: removeClaudeCodeHintLines(foregroundResult.output),
      ...(foregroundResult.aborted !== true &&
        foregroundResult.spawnFailed !== true && {
          exitedNormally: true,
        }),
    };
  }
  if (isDisklessSession_2()) {
    logError(
      Error("a command or script hook got past keepWhileDiskless in a diskless session and was not run"),
    );
    return {
      ...buildCannotRunElsewhereResult(
        hookEvent,
        "unsupported_in_cloud_session",
        `${hookName} hook not run: ${CLOUD_HOOK_UNSUPPORTED_REASON}`,
      ),
      spawnFailed: true,
      withheld: true,
    };
  }
  if (project === null)
    return {
      ...buildCannotRunElsewhereResult(
        hookEvent,
        "unsupported_in_cloud_session",
        `${hookName} hook not run: ${CLOUD_HOOK_UNSUPPORTED_REASON}`,
      ),
      spawnFailed: true,
      withheld: true,
    };
  let isStartupEvent = hookEvent === "SessionStart" || hookEvent === "Setup" || hookEvent === "SessionEnd";
  let diagStartMs = Date.now();
  let status;
  let diagAborted = false;
  let isWindows = getPlatform() === "windows";
  let shellType = hook.shell ?? defaultShellKind();
  let isPowerShell = shellType === "powershell";
  let isExecForm = hook.args !== undefined;
  if (isExecForm && /\s/.test(hook.command) && !/[\\/]/.test(hook.command))
    logForDebugging(
      `Hook command "${hook.command}" has both "args" and whitespace in "command". Exec form treats "command" as a single executable name; move the rest into "args". Example: { "command": "node", "args": ["script.js"] }.`,
      {
        level: "warn",
      },
    );
  let expandPath =
    isWindows && !isPowerShell && !isExecForm
      ? (pathArg) => pathArg.replaceAll("\\", "/")
      : (pathArg) => pathArg;
  let baseDir =
    wrapCommand === undefined && servedEnv?.startsOutsideProject !== true ? getProjectConfigRoot() : null;
  let projectDir = baseDir ?? project.projectRoot;
  let command = hook.command;
  let userConfig;
  if (!isExecForm && isPowerShell) {
    if (hook.shell === undefined) describeNoBashFallback(hookEvent);
    command = toPowerShellEnvRefs(command);
    if (/\$CLAUDE_PROJECT_DIR\b/.test(command))
      logForDebugging(
        `PowerShell hook command references $CLAUDE_PROJECT_DIR, which PowerShell reads as an undefined variable ($null). Use $env:CLAUDE_PROJECT_DIR or \${CLAUDE_PROJECT_DIR} instead. Command: ${command}`,
        {
          level: "warn",
        },
      );
  }
  for (let [name, value] of [
    ["CLAUDE_PLUGIN_ROOT", pluginRoot || skillRoot],
    ["CLAUDE_PLUGIN_DATA", pluginRoot],
  ]) {
    if (value) continue;
    let placeholder = "${" + name + "}";
    if (!hook.command.includes(placeholder) && !hook.args?.some((arg) => arg.includes(placeholder))) continue;
    let rootPath = getHookDisplayText(hook);
    throw Error(
      skillRoot
        ? `Hook command references \${${name}} but only \${CLAUDE_PLUGIN_ROOT} is available for skill hooks (\${CLAUDE_PLUGIN_DATA} is plugin-only). Command: ${rootPath}`
        : `Hook command references \${${name}} but the hook is not associated with a plugin. This variable is only available in hooks defined in a plugin's hooks/hooks.json file, not in settings.json. Command: ${rootPath}`,
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
  if (hook.args !== undefined) {
    let root = pluginRoot ?? skillRoot;
    let pluginId_2 = pluginRoot && pluginId ? pluginId : undefined;
    let expand = (command) => {
      if (!command.includes("${")) return command;
      command = command.replaceAll("${CLAUDE_PROJECT_DIR}", () => projectDir);
      if (root) command = command.replaceAll("${CLAUDE_PLUGIN_ROOT}", () => root);
      if (pluginId_2)
        command = command.replaceAll("${CLAUDE_PLUGIN_DATA}", () => ensurePluginDataDir(pluginId_2));
      if (userConfig) command = substituteUserConfigVariables(command, userConfig);
      return command;
    };
    execArgv = [expand(hook.command), hook.args.map(expand)];
  }
  let dataPath = getHookDisplayText(hook);
  if (isWindows && !isPowerShell && !isExecForm) command = stripShellQuotes(command);
  let servedRewrite = servedEnv === undefined && isRewrittenInput(hook);
  let envBase = servedRewrite
    ? withHostEnvRestored(() => ({
        shellPrefix: env.CLAUDE_CODE_SHELL_PREFIX,
        inherited: {
          ...subprocessEnv(),
        },
      }))
    : undefined;
  let hostOwnedNames = servedRewrite ? hostOwnedEnvNames() : [];
  if (hostOwnedNames.length > 0)
    logForDebugging(
      `Hooks: ${hookName} is the organization's and starts without a person's plugin's $.env.set of ${hostOwnedNames.join(", ")}`,
    );
  let hostWrittenNames = servedRewrite ? hostWrittenEnvNames() : [];
  if (hostWrittenNames.length > 0)
    logForDebugging(
      `Hooks: ${hookName} is the organization's and starts without the repository settings' env of ${hostWrittenNames.join(", ")}`,
    );
  let useShell =
    servedEnv !== undefined
      ? servedEnv.shellPrefix
      : envBase !== undefined
        ? envBase.shellPrefix
        : env.CLAUDE_CODE_SHELL_PREFIX;
  let finalCommand =
    !isPowerShell && !isExecForm && useShell ? getGlobBaseDirectory(useShell, command) : command;
  let timeoutMs = hook.timeout ? hook.timeout * 1000 : TOOL_HOOK_EXECUTION_TIMEOUT_MS;
  let childEnv = {
    ...(servedEnv !== undefined
      ? mergeHookEnv({
          base: servedEnv.base,
          omit: servedEnv.omit,
          extra: {},
        })
      : (envBase?.inherited ?? {
          ...subprocessEnv(),
        })),
    ...envExtra,
    ...claudeSubprocessEnv(envContext),
    CLAUDE_PROJECT_DIR: expandPath(projectDir),
  };
  let { columns, rows } = process.stdout;
  if (columns) childEnv.COLUMNS = String(columns);
  if (rows) childEnv.LINES = String(rows);
  if (pluginRoot) {
    childEnv.CLAUDE_PLUGIN_ROOT = expandPath(pluginRoot);
    if (pluginId) childEnv.CLAUDE_PLUGIN_DATA = expandPath(ensurePluginDataDir(pluginId));
  }
  Object.assign(childEnv, getPluginHookCredentialEnv(pluginId));
  if (userConfig)
    for (let [key, value] of Object.entries(userConfig)) {
      let envKey = key.replace(/[^A-Za-z0-9_]/g, "_").toUpperCase();
      childEnv[`CLAUDE_PLUGIN_OPTION_${envKey}`] = String(value);
    }
  if (skillRoot) childEnv.CLAUDE_PLUGIN_ROOT = expandPath(skillRoot);
  checkPluginBunOptions(envOwnerId ?? pluginId, childEnv, childEnv);
  if (
    !isPowerShell &&
    (hookEvent === "SessionStart" ||
      hookEvent === "Setup" ||
      hookEvent === "CwdChanged" ||
      hookEvent === "FileChanged") &&
    hookIndex !== undefined
  )
    childEnv.CLAUDE_ENV_FILE = await getHookEnvFilePath(hookEvent, hookIndex, envContext.envFileSessionId);
  let spawnCwd = servedEnv?.spawnCwd === undefined ? baseDir : null;
  let desiredCwd =
    servedEnv === undefined && cwd !== project.projectRoot
      ? preferRemoteValue(cwd, project.originalCwd)
      : cwd;
  if (spawnCwd === null && desiredCwd !== cwd) {
    let seenNames = hookNameSeenRegistry.of(getRootSession().host);
    if (!seenNames.has(hookEvent)) {
      seenNames.add(hookEvent);
      logEvent("tengu_hook_started_in_launch_dir", {
        hook_event: fromEnum(hookEvent),
      });
    }
  }
  let spawnCwd_2 =
    spawnCwd === null
      ? await safeHookCwd(desiredCwd, project)
      : await safeHookCwd(spawnCwd, {
          originalCwd: spawnCwd,
          projectRoot: spawnCwd,
        });
  if (servedEnv?.startsOutsideProject === true && spawnCwd_2 !== cwd)
    return {
      stdout: "",
      stderr: "",
      output: "",
      status: 1,
      spawnFailed: true,
    };
  let detached = !isWindows;
  let scriptHookAck = envExtra?.[SCRIPT_HOOK_ACK_ENV];
  let hookCwd = emptyHookOutputState();
  using wrapped =
    wrapCommand === undefined
      ? undefined
      : await wrapCommand(execArgv ? shellQuoteArgs([execArgv[0], ...execArgv[1]]) : finalCommand);
  if (wrapCommand !== undefined && wrapped === undefined)
    return {
      stdout: "",
      stderr: "",
      output: "",
      status: 1,
      spawnFailed: true,
    };
  if (signal.aborted)
    return {
      stdout: "",
      stderr: "",
      output: "",
      status: 1,
      aborted: true,
    };
  let child;
  if (wrapped !== undefined)
    child = spawn(wrapped.command, [], {
      env: childEnv,
      cwd: spawnCwd_2,
      shell: true,
      detached,
      windowsHide: true,
      ...hooksSettingForEvent(hookEvent),
    });
  else if (execArgv)
    child = spawn(execArgv[0], execArgv[1], {
      env: childEnv,
      cwd: spawnCwd_2,
      detached,
      windowsHide: true,
      ...hooksSettingForEvent(hookEvent),
    });
  else if (shellType === "powershell") {
    let canRunHere = await (servedRewrite
      ? findPowerShellForEnv(withHostEnvRestored(getWindowsEnvPaths))
      : getCachedPowerShellPath());
    if (signal.aborted)
      return {
        stdout: "",
        stderr: "",
        output: "",
        status: 1,
        aborted: true,
      };
    if (!canRunHere)
      throw Error(
        `Hook "${hook.command}" has shell: 'powershell' but no PowerShell executable (pwsh or powershell) was found on PATH. Install PowerShell, or remove "shell": "powershell" to use bash.`,
      );
    let execPath =
      hookEvent === "PermissionRequest" || requiresPowerShellScriptFile(finalCommand)
        ? finalCommand
        : finalCommand +
          `
; if (-not $?) { if ($LASTEXITCODE -eq 2) { exit 2 } }`;
    let cmd =
      !requiresScriptFile(finalCommand) &&
      hook.shell === undefined &&
      hookEvent !== "StatusLine" &&
      hookEvent !== "FileSuggestion" &&
      mayBlockForMissingBash(hook, hookEvent)
        ? execPath +
          `
; if (-not $?) { exit 1 }
; $claudeNoVerdict = $false
; try { $claudeSeen = $false; $claudeOnlyStrings = $true; foreach ($claudeStatement in $MyInvocation.MyCommand.ScriptBlock.Ast.EndBlock.Statements) { if ($claudeStatement.Extent.StartOffset -lt ` +
          finalCommand.length +
          `) { $claudeSeen = $true; $claudeElements = 0; foreach ($claudeElement in $claudeStatement.PipelineElements) { $claudeElements++; if ($claudeElement.PSTypeNames -notcontains 'System.Management.Automation.Language.CommandExpressionAst') { $claudeOnlyStrings = $false } elseif ($claudeElement.Expression.PSTypeNames -contains 'System.Management.Automation.Language.ExpandableStringExpressionAst') { foreach ($claudeNested in $claudeElement.Expression.NestedExpressions) { if ($claudeNested.PSTypeNames -contains 'System.Management.Automation.Language.SubExpressionAst') { $claudeOnlyStrings = $false } } } elseif ($claudeElement.Expression.PSTypeNames -notcontains 'System.Management.Automation.Language.StringConstantExpressionAst') { $claudeOnlyStrings = $false } }; if ($claudeElements -ne 1) { $claudeOnlyStrings = $false } } }; $claudeNoVerdict = $claudeSeen -and $claudeOnlyStrings } catch { }
; if ($claudeNoVerdict) { exit ` +
          EXIT_CODE_COMMAND_NOT_FOUND +
          ` }
; $claudeNoVerdict = $false`
        : execPath;
    child = spawn(canRunHere, buildPowerShellCommandArgs(cmd), {
      env: childEnv,
      cwd: spawnCwd_2,
      detached,
      windowsHide: true,
      ...hooksSettingForEvent(hookEvent),
    });
  } else {
    let gitBashPath = isWindows ? getGitBashPathCached() : null;
    if (isWindows && !gitBashPath)
      throw Error(
        `Hook "${hook.command}" requires bash but Git Bash was not found. ${INSTALL_GIT_FOR_WINDOWS}, or ${NO_BASH_FIX_HINT}.`,
      );
    let shell = isWindows ? gitBashPath : true;
    if (isWindows && gitBashPath) prependDirToPathEnv(childEnv, gitBashPath);
    child = spawn(finalCommand, [], {
      env: childEnv,
      cwd: spawnCwd_2,
      shell,
      detached,
      windowsHide: true,
      ...hooksSettingForEvent(hookEvent),
    });
  }
  let hookTaskOutput = new TaskOutput(`hook_${child.pid}`, null);
  let shellCommand = wrapSpawn(child, signal, timeoutMs, hookTaskOutput);
  let shellCommandTransferred = false;
  let stdinWriteFailed = false;
  let stdinOpen = !getIsNonInteractiveSession() || getHasStreamingInput();
  if ((hook.async || (hook.asyncRewake && stdinOpen)) && !forceSyncExecution) {
    let processId = `async_hook_${child.pid}`;
    logForDebugging(`Hooks: Config-based async hook, backgrounding process ${processId}`);
    let onStdinError = (error) => {
      logForDebugging(
        `Async hook stdin write failed (${getErrnoCode(error) ?? error}); hook command likely exited without reading stdin`,
      );
    };
    child.stdin.on("error", onStdinError);
    try {
      child.stdin.write(
        jsonInput +
          `
`,
        "utf8",
      );
      child.stdin.end();
    } catch (error) {
      onStdinError(error);
    }
    stdinWriteFailed = true;
    if (
      backgroundHookProcess({
        processId,
        hookId,
        shellCommand,
        asyncResponse: {
          async: true,
          asyncTimeout: timeoutMs,
        },
        hookEvent,
        hookName,
        command: dataPath,
        toolName: toolInfo?.toolName,
        ranForAccountMemory: toolInfo?.accountMemory === true,
        asyncRewake: hook.asyncRewake,
        rewakeMessage: hook.rewakeMessage,
        rewakeSummary: hook.rewakeSummary,
        scriptPaths: hook.asyncRewake
          ? expandHookPathVariables({
              command: hook.command,
              args: hook.args,
              pluginRoot: pluginRoot ?? skillRoot,
              projectDir,
              homeDir: homedir(),
              windowsBash: isWindows && !isPowerShell && !isExecForm,
              posixShell: !isPowerShell && !isExecForm && !useShell,
            })
          : undefined,
        pluginId,
      })
    )
      return {
        stdout: "",
        stderr: "",
        output: "",
        status: 0,
        backgrounded: true,
      };
  }
  let stdout = "";
  let stderr = "";
  let output = "";
  let startedAt = 0;
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  let initialResponseChecked = false;
  let asyncResolve = null;
  let childIsAsyncPromise = new Promise((resolve) => {
    asyncResolve = resolve;
  });
  let onStderr = (data) => {
    startedAt = Date.now();
    stderr += data;
    output += data;
    if (scriptHookAck !== undefined) {
      hookCwd.stderr = stderr;
      hookCwd.stdout = stdout;
      hookCwd.output = output;
      scanHookOutputMarkers(hookCwd, scriptHookAck);
      stderr = hookCwd.stderr;
      stdout = hookCwd.stdout;
      output = hookCwd.output;
    }
  };
  let onStdout = (data) => {
    startedAt = Date.now();
    stdout += data;
    output += data;
    if (scriptHookAck !== undefined) {
      hookCwd.stderr = stderr;
      hookCwd.stdout = stdout;
      hookCwd.output = output;
      scanHookOutputMarkers(hookCwd, scriptHookAck);
      stderr = hookCwd.stderr;
      stdout = hookCwd.stdout;
      output = hookCwd.output;
    }
    if (!initialResponseChecked) {
      let firstLine = getFirstLine(stdout).trim();
      if (!firstLine.includes("}")) return;
      initialResponseChecked = true;
      logForDebugging(`Hooks: Checking first line for async: ${firstLine}`);
      try {
        let parsed = jsonParse(firstLine);
        logForDebugging(`Hooks: Parsed initial response: ${jsonStringify(parsed)}`);
        if (isSyncHookJSONOutput_2(parsed) && !forceSyncExecution) {
          let processId = `async_hook_${child.pid}`;
          logForDebugging(`Hooks: Detected async hook, backgrounding process ${processId}`);
          if (
            backgroundHookProcess({
              processId,
              hookId,
              shellCommand,
              asyncResponse: parsed,
              hookEvent,
              hookName,
              command: dataPath,
              pluginId,
              toolName: toolInfo?.toolName,
            })
          ) {
            shellCommandTransferred = true;
            child.stdout.removeListener("data", onStdout);
            child.stderr.removeListener("data", onStderr);
            asyncResolve?.({
              stdout,
              stderr,
              output,
              status: 0,
              backgrounded: true,
            });
          }
        } else if (isSyncHookJSONOutput_2(parsed) && forceSyncExecution)
          logForDebugging(
            "Hooks: Detected async hook but forceSyncExecution is true, waiting for completion",
          );
        else logForDebugging("Hooks: Initial response is not async, continuing normal processing");
      } catch (e) {
        logForDebugging(`Hooks: Failed to parse initial response as JSON: ${e}`);
      }
    }
  };
  child.stdout.on("data", onStdout);
  child.stderr.on("data", onStderr);
  let closeStreams =
    wrapped !== undefined
      ? () => {}
      : startHookProgressInterval({
          hookId,
          hookName,
          hookEvent,
          getOutput: async () => ({
            stdout,
            stderr,
            output,
          }),
        });
  let stdoutDone = false;
  let stderrDone = false;
  let earlyClose = false;
  let stdoutEndPromise = new Promise((resolve) => {
    child.stdout.once("end", () => {
      stdoutDone = true;
      resolve();
    });
    child.stdout.once("close", () => {
      if (!stdoutDone) earlyClose = true;
      resolve();
    });
  });
  let stderrEndPromise = new Promise((resolve) => {
    child.stderr.once("end", () => {
      stderrDone = true;
      resolve();
    });
    child.stderr.once("close", () => {
      if (!stderrDone) earlyClose = true;
      resolve();
    });
  });
  let stdinWritePromise = stdinWriteFailed
    ? Promise.resolve()
    : new Promise((resolve, reject) => {
        child.stdin.on("error", (err) => {
          reject(err);
        });
        child.stdin.write(
          jsonInput +
            `
`,
          "utf8",
        );
        child.stdin.end();
        resolve();
      });
  let childErrorPromise = new Promise((resolve, reject) => {
    child.on("error", reject);
  });
  let sawAbort = false;
  child.on("exit", () => {
    if (!signal.aborted) sawAbort = true;
  });
  let childClosePromise = new Promise((resolve) => {
    child.on("exit", (code) => {
      (async () => {
        await waitForStdioQuiet({
          streamsSettled: Promise.all([stdoutEndPromise, stderrEndPromise]).then(() => {}),
          lastDataAt: () => startedAt,
          holdOpen: () => scriptHookAck !== undefined && hookCwd.started && hookCwd.exitStatus === undefined,
        });
        child.stdout.removeListener("data", onStdout);
        child.stderr.removeListener("data", onStderr);
        resolve({
          stdout,
          stderr,
          output,
          status: code ?? 1,
          aborted: signal.aborted && !sawAbort,
          ...(code !== null && {
            exitedNormally: true,
          }),
          ...(!(stdoutDone && stderrDone) && {
            stdioIncomplete: true,
          }),
          ...(earlyClose && {
            stdioClosedWithoutEnd: true,
          }),
          ...(hookCwd.started && {
            runnerStarted: true,
          }),
          ...(hookCwd.exitStatus !== undefined && {
            status: strongerExitStatus(code, hookCwd.exitStatus),
            exitedNormally: true,
            runnerExited: true,
            aborted: false,
          }),
          ...(hookCwd.resultStdout !== undefined && {
            stdout: replaceTrailingResult(stdout, hookCwd.resultStdout, hookCwd.resultWasString),
            resultStdout: hookCwd.resultStdout,
          }),
          ...(hookCwd.resultConflict && {
            runnerConflict: true,
          }),
        });
      })();
    });
  });
  try {
    if (isStartupEvent)
      logForDiagnosticsNoPII("info", "hook_spawn_started", {
        hook_event_name: hookEvent,
        index: hookIndex,
      });
    await Promise.race([stdinWritePromise, childErrorPromise]);
    let result = await Promise.race([childIsAsyncPromise, childClosePromise, childErrorPromise]);
    status = result.status;
    diagAborted = result.aborted ?? false;
    return {
      ...result,
      stdout: removeClaudeCodeHintLines(result.stdout),
      stderr: removeClaudeCodeHintLines(result.stderr),
      output: removeClaudeCodeHintLines(result.output),
    };
  } catch (error) {
    let code = getErrnoCode(error);
    status = 1;
    if (code === "EPIPE") {
      logForDebugging("EPIPE error while writing to hook stdin (hook command likely closed early)");
      let errMsg = "Hook command closed stdin before hook input was fully written (EPIPE)";
      return {
        stdout: "",
        stderr: errMsg,
        output: errMsg,
        status: 1,
      };
    } else if (code === "ABORT_ERR") {
      diagAborted = true;
      return {
        stdout: "",
        stderr: "Hook cancelled",
        output: "Hook cancelled",
        status: 1,
        aborted: true,
      };
    } else {
      let errorMsg = errorMessage(error);
      logForDebugging(`Hook command failed to spawn (${hookName}): ${errorMsg}`, {
        level: "error",
      });
      let errOutput = `Error occurred while executing hook command: ${errorMsg}`;
      return {
        stdout: "",
        stderr: errOutput,
        output: errOutput,
        status: 1,
        spawnFailed: true,
      };
    }
  } finally {
    if (isStartupEvent)
      logForDiagnosticsNoPII("info", "hook_spawn_completed", {
        hook_event_name: hookEvent,
        index: hookIndex,
        duration_ms: Date.now() - diagStartMs,
        exit_code: status,
        aborted: diagAborted,
      });
    closeStreams();
    if (wrapped !== undefined && shellCommand.status === "running") shellCommand.kill();
    if (!shellCommandTransferred) shellCommand.cleanup();
  }
}
//@ chunk-e6aww6q8.js:3477576-3478127 facade-exports
/**
 * 为云端会话在本机运行 command 钩子的入口（device 模式），返回精简结果。
 */
async function execCommandHookForDevice({
  hook,
  hookEvent,
  jsonInput,
  envContext,
  project,
  cwd,
  signal,
  envExtra,
  envOmit,
  envBase,
  shellPrefix,
  startsOutsideProject,
}) {
  let { stdout, stderr, status, aborted, spawnFailed, stdioIncomplete, stdioClosedWithoutEnd } =
    await execCommandHook(
      hook,
      hookEvent,
      `${hookEvent}:device`,
      jsonInput,
      undefined,
      envContext,
      project,
      cwd,
      signal,
      randomUUID(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      true,
      envExtra,
      {
        base: envBase,
        omit: envOmit,
        shellPrefix,
        startsOutsideProject,
      },
    );
  return {
    stdout,
    stderr,
    status,
    ...(aborted && {
      aborted,
    }),
    ...(spawnFailed && {
      spawnFailed,
    }),
    ...(stdioIncomplete && {
      stdioIncomplete,
    }),
    ...(stdioClosedWithoutEnd && {
      stdioClosedWithoutEnd,
    }),
  };
}
//@ chunk-e6aww6q8.js:3478127-3478196 layout
var CANNOT_RUN_ELSEWHERE_TEXT = "This hook runs on another machine, which could not run it.";
//@ chunk-e6aww6q8.js:3478196-3478422 layout
function buildCannotRunElsewhereResult(hookEvent, hookEvent_2, hook = CANNOT_RUN_ELSEWHERE_TEXT) {
  if (
    !blocksWhenItCannotRunElsewhere(hookEvent) ||
    (hookEvent_2 !== "unsupported_in_cloud_session" && !isVastPlatypusOn())
  )
    return {
      stdout: "",
      stderr: hook,
      output: hook,
      status: 1,
      spawnFailed: true,
    };
  let promptBlockOutput = buildPromptBlockOutput(hookEvent, hook);
  return {
    stdout: promptBlockOutput !== undefined ? jsonStringify(promptBlockOutput) : "",
    stderr: hook,
    output: hook,
    status: 2,
    noVerdict: hookEvent_2,
  };
}
//@ chunk-e6aww6q8.js:3478422-3478513 facade-exports
/**
 * 判断某事件的钩子在"无法在别处运行"时是否应阻断：属于提示守护事件，但 PostToolBatch、TaskCreated、PreCompact 除外。
 */
function blocksWhenItCannotRunElsewhere(hookEvent) {
  return (
    PROMPT_GUARD_EVENTS.has(hookEvent) &&
    hookEvent !== "PostToolBatch" &&
    hookEvent !== "TaskCreated" &&
    hookEvent !== "PreCompact"
  );
}
//@ chunk-e6aww6q8.js:3478513-3478601 layout
function isOwnUserPromptHook(hookEvent, hook, hookOriginLabel) {
  return (
    hookEvent === "UserPromptSubmit" &&
    !isAsyncHookJSONOutput(hook) &&
    getPluginHookRunner()?.isPersonsOwn?.(hookOriginLabel) === true
  );
}
//@ chunk-e6aww6q8.js:3478601-3479089 layout
/**
 * 为在另一台机器上运行的钩子构造后台任务对象：结果到达后写入输出并标记完成，失败时写入固定错误并以退出码 1 结束。
 */
function createRemoteHookTask(hook, abortController, abortController_2) {
  let taskOutput = new TaskOutput(hook, null);
  let result = {
    status: "backgrounded",
    taskOutput,
    background: () => true,
    kill: async () => abortController_2.abort(),
    cleanup: () => {},
    result: abortController.then(
      ({ stdout, stderr, status, aborted }) => {
        taskOutput.writeStdout(stdout);
        taskOutput.writeStderr(stderr);
        result.status = "completed";
        return {
          stdout,
          stderr,
          code: status,
          interrupted: aborted === true,
        };
      },
      (error) => {
        logForDebugging(`Hooks: a hook's run on another machine failed (${errorMessage(error)})`, {
          level: "error",
        });
        let text = CANNOT_RUN_ELSEWHERE_TEXT;
        taskOutput.writeStderr(text);
        result.status = "completed";
        return {
          stdout: "",
          stderr: text,
          code: 1,
          interrupted: false,
        };
      },
    ),
  };
  return result;
}
//@ chunk-e6aww6q8.js:3479089-3480748 facade-exports
/**
 * 执行插件/托管/技能/仓库来源的 command 钩子并收口输出：组织钩子按需转换；进程启动失败视为 status 1；输出不可信（stdio 截断等）时提示守护事件转成阻断、其余带说明返回；exit 2 但 stdio 不完整时清理可疑 JSON，脚本缺失的情况特判保留阻断。
 */
async function execPluginCommandHook({
  hook,
  hookEvent,
  jsonInput,
  envContext,
  project,
  cwd,
  signal,
  plugin,
  skillRoot,
  managed,
  hookIndex,
  fitted,
  storageV5,
  credentials,
}) {
  let execResult = await execCommandHook(
    isOrganizationHook(hook, hookEvent, plugin !== undefined, plugin?.id)
      ? markRewrittenInput({
          ...hook,
        })
      : hook,
    hookEvent,
    `${hookEvent}:${plugin !== undefined ? "plugin" : managed ? "managed" : skillRoot !== undefined ? "skill" : "repo"}`,
    jsonInput,
    undefined,
    envContext,
    project,
    cwd,
    signal,
    randomUUID(),
    hookIndex,
    plugin?.root,
    plugin?.id,
    undefined,
    skillRoot,
    true,
    undefined,
    undefined,
    undefined,
    undefined,
    storageV5,
    credentials,
  ).catch((error) => {
    let message = errorMessage(error);
    return {
      stdout: "",
      stderr: message,
      output: message,
      status: 1,
      spawnFailed: true,
    };
  });
  let { stdout, stderr, output, status, aborted, spawnFailed, stdioIncomplete, stdioClosedWithoutEnd } =
    fitted(execResult);
  let untrustedCaptureReason = getUntrustedCaptureReason(
    {
      status,
      aborted,
      stdioIncomplete,
      stdioClosedWithoutEnd,
      stderr,
    },
    hookEvent,
    stdout,
    parseHookOutput(stdout).json,
    (stdout) => parseHookOutput(stdout).json,
  );
  if (untrustedCaptureReason !== undefined) {
    if (PROMPT_GUARD_EVENTS.has(hookEvent)) {
      let promptBlockOutput = buildPromptBlockOutput(hookEvent, untrustedCaptureReason);
      return {
        stdout: promptBlockOutput !== undefined ? JSON.stringify(promptBlockOutput) : "",
        stderr: untrustedCaptureReason,
        output: untrustedCaptureReason,
        status: 2,
      };
    }
    let stderr_2 = withHookStderr(untrustedCaptureReason, status, stderr);
    return {
      stdout: "",
      stderr: stderr_2,
      output: stderr_2,
      status,
      ...(aborted && {
        aborted,
      }),
      ...(stdioIncomplete && {
        stdioIncomplete,
      }),
      ...(stdioClosedWithoutEnd && {
        stdioClosedWithoutEnd,
      }),
    };
  }
  if (status === 2 && (stdioIncomplete === true || stdioClosedWithoutEnd === true)) {
    let json = parseHookOutput(stdout).json;
    let stdout_2 =
      json !== undefined &&
      dropSuspectCaptureJson(
        {
          status,
          stdioIncomplete,
          stdioClosedWithoutEnd,
        },
        hookEvent,
        json,
      ) === undefined
        ? ""
        : stdout;
    let stderr_2 = exitTwoMeansMissingScript({
      hookEvent,
      stdout: stdout_2,
      stderr,
      pluginId: plugin?.id,
    })
      ? "hook stdio was cut before end-of-stream on the hook runner; the exit-2 block stands"
      : stderr;
    let promptBlockOutput = buildPromptBlockOutput(hookEvent, stderr_2);
    let stdoutText = promptBlockOutput !== undefined ? JSON.stringify(promptBlockOutput) : stdout_2;
    return {
      stdout: stdoutText,
      stderr: stderr_2,
      output: stdoutText !== stdout || stderr_2 !== stderr ? stdoutText + stderr_2 : output,
      status,
      ...(aborted && {
        aborted,
      }),
      ...(spawnFailed && {
        spawnFailed,
      }),
      ...(stdioIncomplete && {
        stdioIncomplete,
      }),
      ...(stdioClosedWithoutEnd && {
        stdioClosedWithoutEnd,
      }),
    };
  }
  return {
    stdout,
    stderr,
    output,
    status,
    ...(aborted && {
      aborted,
    }),
    ...(spawnFailed && {
      spawnFailed,
    }),
    ...(stdioIncomplete && {
      stdioIncomplete,
    }),
    ...(stdioClosedWithoutEnd && {
      stdioClosedWithoutEnd,
    }),
  };
}
//@ chunk-e6aww6q8.js:3480748-3481037 facade-exports
/**
 * 判断 exit 2 是否其实是"脚本不存在"：Stop/SubagentStop/TaskCompleted/TeammateIdle（或插件的 UserPromptSubmit）钩子、stdout 为空、stderr 含 no such file / can't open，且 stdio 完整。
 */
function exitTwoMeansMissingScript({
  hookEvent,
  stdout,
  stderr,
  pluginId,
  stdioIncomplete,
  stdioClosedWithoutEnd,
}) {
  if (stdioIncomplete === true || stdioClosedWithoutEnd === true) return false;
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
//@ chunk-e6aww6q8.js:3481037-3481082 facade-exports
/**
 * 计算钩子 `if` 条件（无法判定时视为不满足）。
 */
function evaluateHookIfCondition(condition, tools, hookInput, matches) {
  return matchesHookIfCondition(condition, tools, hookInput, matches, false);
}
//@ chunk-e6aww6q8.js:3481082-3481129 facade-exports
/**
 * 计算钩子 `if` 模式（无法判定时返回 null 表示未知）。
 */
function evaluateHookIfPattern(rule, toolInput, cwd, matches) {
  return matchesHookIfCondition(rule, toolInput, cwd, matches, null);
}
//@ chunk-e6aww6q8.js:3481129-3481404 layout
function matchesHookIfCondition(condition, hookInput, hookInput_2, matches, cwd) {
  return runInRemoteCallFrameMain(matches, async () => {
    let matcher = await prepareIfConditionMatcher(hookInput, hookInput_2);
    if (matcher === undefined) return cwd;
    let ruleValue = permissionRuleValueFromString(condition);
    if (!ruleNamesContainTool(matcher.names, condition, ruleValue.toolName)) return cwd;
    if (!ruleValue.ruleContent) return true;
    if (!matcher.judgeable) return null;
    if (matcher.patternMatcher === undefined) return cwd;
    return matcher.patternMatcher(ruleValue.ruleContent);
  });
}
//@ chunk-e6aww6q8.js:3481404-3481466 facade-exports
/**
 * 判断 PreToolUse 的 matcher 是否覆盖某工具（空 matcher 覆盖全部）。
 */
function preToolUseMatcherCoversTool(matcher, toolName) {
  return (
    !matcher ||
    matchesPattern(canonicalToolName(toolName), matcher, HOOK_EVENTS_WITH_MATCHER.has("PreToolUse"))
  );
}
//@ chunk-e6aww6q8.js:3481466-3481597 facade-exports
/**
 * 列出 PreToolUse matcher 明确列举的工具名（含别名展开）；空或 `*` 返回 undefined。
 */
function preToolUseMatcherListedTools(matcher) {
  if (!matcher || matcher === "*") return;
  let matcherToolNames = parseMatcherToolNames(matcher, HOOK_EVENTS_WITH_MATCHER.has("PreToolUse"));
  return matcherToolNames === undefined
    ? undefined
    : uniq(
        matcherToolNames.flatMap((matcherToolName) => [
          matcherToolName,
          ...legacyToolNamesFor(matcherToolName),
        ]),
      );
}
//@ chunk-e6aww6q8.js:3481597-3481783 layout
function parseMatcherToolNames(matcher, toolFilter, allTools, includeVariants = false) {
  if (!(toolFilter ? /^[a-zA-Z0-9_|, -]+$/ : /^[a-zA-Z0-9_|]+$/).test(matcher)) return;
  return matcher
    .split(toolFilter ? /[|,]/ : "|")
    .map((name) => name.trim())
    .filter(Boolean)
    .flatMap((name) => (includeVariants ? [name] : toolNameVariants(canonicalToolName(name), allTools)));
}
//@ chunk-e6aww6q8.js:3481783-3481901 facade-exports
/**
 * 判断钩子 matcher 是否匹配该事件输入：取事件的匹配字段（工具名、source、trigger 等），没有字段或没有 matcher 时为真；工具名不命中时再试 MCP 前缀变体。
 */
function hookMatcherMatches(toolName, matcher, matcher_2) {
  let matchQuery = hookMatchQuery(toolName);
  if (matchQuery === undefined || !matcher) return true;
  let hookMatcher = makeHookMatcher(toolName, matcher, matcher_2);
  return hookMatcher(matchQuery) || getMcpPrefix(matchQuery, matcher, undefined).some(hookMatcher) || false;
}
//@ chunk-e6aww6q8.js:3481901-3482036 layout
function makeHookMatcher(toolName, matcherAssembly, options) {
  return (hookInput) =>
    matchesPattern(
      hookInput,
      stripModelContextSuffix(toolName.hook_event_name, matcherAssembly),
      HOOK_EVENTS_WITH_MATCHER.has(toolName.hook_event_name),
      options,
      undefined,
      "tool_input" in toolName ? toolName.tool_input : undefined,
    );
}
//@ chunk-e6aww6q8.js:3482036-3482244 facade-exports = isToolReferenceWithName (1)
/**
 * 若 matcher 只在工具名的 MCP 前缀变体上命中，返回把 tool_name 改成命中变体的事件输入副本，否则原样返回；让钩子看到它所匹配的名字。
 */
function forwardedUnderMatchingToolName(toolName, matcherAssembly, matcher) {
  let matchQuery = hookMatchQuery(toolName);
  if (matchQuery === undefined || !matcherAssembly || !("tool_name" in toolName)) return toolName;
  let hookToolInput = getHookToolInput(toolName);
  let hookMatcher = makeHookMatcher(toolName, matcherAssembly, matcher);
  let hookMatcher_2 = hookMatcher(matchQuery)
    ? undefined
    : getMcpPrefix(matchQuery, matcherAssembly, hookToolInput).find(hookMatcher);
  if (hookMatcher_2 === undefined) return toolName;
  return (
    (hookMatcher_2 === monitorCommandAsBash(matchQuery, hookToolInput) && withMatchedToolName(toolName)) || {
      ...toolName,
      tool_name: hookMatcher_2,
    }
  );
}
//@ chunk-e6aww6q8.js:3482244-3482427 layout
function withMatchedToolName(input) {
  if (!("tool_name" in input) || !("tool_input" in input)) return;
  let monitored = monitorCommandAsBash(input.tool_name, getHookToolInput(input));
  let commandAndDescription = getCommandAndDescription(input.tool_input);
  return monitored === undefined || commandAndDescription === undefined
    ? undefined
    : {
        ...input,
        tool_name: monitored,
        tool_input: commandAndDescription,
      };
}
//@ chunk-e6aww6q8.js:3482427-3482525 layout
function matchedToolNameInput(matcher, hookInput) {
  return matcher.throughFamilyOnly === true && matcher.matcherMetThroughOtherName === true
    ? withMatchedToolName(hookInput)
    : undefined;
}
//@ chunk-e6aww6q8.js:3482525-3482675 layout
function stripModelContextSuffix(name, suffix) {
  if (name !== "PreModelSwitch" && name !== "PostModelSwitch") return suffix;
  let replaced = suffix.replace(/\[[12]m\](?=\s*(?:[|,]|$))/gi, "");
  return replaced.trim() === "" ? suffix : replaced;
}
//@ chunk-e6aww6q8.js:3482675-3483665 facade-exports
/**
 * 取各钩子事件用于 matcher 匹配的字段：工具类事件用 tool_name，UserPromptExpansion 用 command_name，SessionStart/ConfigChange/DirectoryAdded 用 source，Setup/PreCompact/PostCompact 用 trigger，模型切换用目标模型，Notification 用 notification_type，SessionEnd 用 reason，Elicitation 用服务器名，FileChanged 用文件 basename 等；无匹配字段的事件返回 undefined。
 */
function hookMatchQuery(hookInput) {
  switch (hookInput.hook_event_name) {
    case "PreToolUse":
    case "PostToolUse":
    case "PostToolUseFailure":
    case "PermissionRequest":
    case "PermissionDenied":
      return hookInput.tool_name;
    case "UserPromptExpansion":
      return hookInput.command_name;
    case "SessionStart":
      return hookInput.source;
    case "Setup":
      return hookInput.trigger;
    case "PreCompact":
    case "PostCompact":
      return hookInput.trigger;
    case "PreModelSwitch": {
      let modelKey = hookModelMatchKey(hookInput.to_model);
      return isRecognizedModelKey(modelKey) ? modelKey : undefined;
    }
    case "PostModelSwitch": {
      let modelKey = hookModelMatchKey(hookInput.to_model);
      return isRecognizedModelKey(modelKey) ? modelKey : undefined;
    }
    case "Notification":
      return hookInput.notification_type;
    case "SessionEnd":
      return hookInput.reason;
    case "StopFailure":
      return hookInput.error;
    case "SubagentStart":
      return hookInput.agent_type;
    case "SubagentStop":
      return hookInput.agent_type;
    case "TeammateIdle":
    case "TaskCreated":
    case "TaskCompleted":
      return;
    case "Elicitation":
      return hookInput.mcp_server_name;
    case "ElicitationResult":
      return hookInput.mcp_server_name;
    case "ConfigChange":
      return hookInput.source;
    case "DirectoryAdded":
      return hookInput.source;
    case "InstructionsLoaded":
      return hookInput.load_reason;
    case "FileChanged":
      return basename(hookInput.file_path);
    default:
      return;
  }
}
//@ chunk-e6aww6q8.js:3483665-3484024 layout
/**
 * 支持 matcher 字段的钩子事件名集合。
 */
var HOOK_EVENTS_WITH_MATCHER; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:3483665", () => {
  HOOK_EVENTS_WITH_MATCHER = new Set([
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
});
//@ chunk-e6aww6q8.js:3484024-3484186 layout = getMcpPrefix (1)
function isBareMcpServerMatcher(serverName) {
  if (!/^[a-zA-Z0-9_|, -]+$/.test(serverName)) return false;
  return serverName
    .split(/[|,]/)
    .map((part) => part.trim())
    .some((part) => part.startsWith("mcp__") && !part.slice(5).includes("__"));
}
//@ chunk-e6aww6q8.js:3484186-3484558 layout
/**
 * warnBareMcpServerMatcher：hook matcher 写成 mcp__server（只比较完整工具名，永远不匹配）时提示改用 mcp__server__.*（CHANGELOG v2.1.195），每个 matcher 只提示一次。
 */
function warnBareMcpServerMatcher(hookEvent, serverName) {
  if (!serverName || !TOOL_HOOK_EVENTS.has(hookEvent)) return;
  let bareMcpServerMatchersWarned = getBareMcpServerMatchersWarned();
  if (bareMcpServerMatchersWarned.has(serverName) || !isBareMcpServerMatcher(serverName)) return;
  bareMcpServerMatchersWarned.add(serverName);
  let matcherText =
    serverName
      .split(/[|,]/)
      .map((part) => part.trim())
      .find((part) => part.startsWith("mcp__") && !part.slice(5).includes("__")) ?? serverName;
  logForDebugging(
    `Hook matcher \`${matcherText}\` matches no tool (it is compared as an exact string). To match all tools from this server, use \`${matcherText}__.*\`. See CHANGELOG v2.1.195.`,
    {
      level: "warn",
    },
  );
}
//@ chunk-e6aww6q8.js:3484558-3484692 layout
function getFamilyParentToolName(toolName, tools) {
  let tool = tools === undefined ? undefined : findToolByName(tools, toolName);
  if (tool !== undefined) return tool.mcpInfo === undefined ? tool.familyParentToolName : undefined;
  return splitToolParentOf(toolName);
}
//@ chunk-e6aww6q8.js:3484692-3484778 layout
function isCliOwnedMcpTool(tool) {
  return tool?.mcpInfo?.cliOwned === true || tool?.mcpInfo?.standsInForBuiltIn === true;
}
//@ chunk-e6aww6q8.js:3484778-3485017 layout
/**
 * 计算 hook matcher 匹配用的工具族名（父工具名与 hookMatcherFamilyNames）。
 */
function getHookMatcherFamilyNames(matcher, tools, toolInput) {
  let names = [];
  let familyParentToolName = getFamilyParentToolName(matcher, tools);
  if (familyParentToolName !== undefined) names.push(familyParentToolName);
  let tool = tools === undefined ? undefined : findToolByName(tools, matcher);
  if (tool !== undefined) {
    if (tool.mcpInfo === undefined || isCliOwnedMcpTool(tool))
      names.push(...(tool.hookMatcherFamilyNames?.(toolInput) ?? []));
  } else {
    let actionName = splitToolByAction(matcher, toolInput);
    if (actionName !== undefined) names.push(actionName);
  }
  return names;
}
//@ chunk-e6aww6q8.js:3485017-3485087 layout
function hookMatchQueries(toolName, hookToolInput) {
  let monitoredQuery = monitorCommandAsBash(toolName, hookToolInput);
  let variants = denyOrAskNamesFor(toolName);
  return monitoredQuery === undefined ? variants : [...variants, monitoredQuery];
}
//@ chunk-e6aww6q8.js:3485087-3485222 layout
function getHookToolInput(hookInput) {
  return (hookInput.hook_event_name === "PreToolUse" || hookInput.hook_event_name === "PermissionRequest") &&
    "tool_input" in hookInput
    ? hookInput.tool_input
    : undefined;
}
//@ chunk-e6aww6q8.js:3485222-3485384 layout = getMcpPrefix (1)
function getMcpPrefix(toolName, matcher, hookToolInput) {
  let queries = hookMatchQueries(toolName, hookToolInput);
  return matcher === undefined || !/\(\?<?!|\[\^/.test(matcher)
    ? queries
    : queries.filter((query) =>
        matcher.includes(query.startsWith("mcp__") ? query.slice(0, query.indexOf("__", 5) + 2) : query),
      );
}
//@ chunk-e6aww6q8.js:3485384-3485915 fingerprint = matchesPattern (1)
/**
 * 判断 matcher 是否匹配：空或 * 全匹配；简单名单（A|B）精确匹配名字及别名；否则当正则匹配工具名、旧名和 MCP 名。
 */
function matchesPattern(toolName, matcher, hasMatcher, allTools, matcher_2, toolInput) {
  if (!matcher || matcher === "*") return true;
  let matcherToolNames = parseMatcherToolNames(matcher, hasMatcher, allTools);
  let hookMatcherFamilyNames = getHookMatcherFamilyNames(toolName, matcher_2, toolInput);
  if (matcherToolNames !== undefined)
    return (
      matcherToolNames.includes(toolName) ||
      false ||
      hookMatcherFamilyNames.some((hookMatcherFamilyName) => matcherToolNames.includes(hookMatcherFamilyName))
    );
  try {
    let cloudProblem = checkHookMatcherForCloud(matcher);
    if (cloudProblem.test(toolName)) return true;
    if (
      ANCHORED_ALTERNATION_RE.test(matcher) &&
      hookMatcherFamilyNames.some((hookMatcherFamilyName) => cloudProblem.test(hookMatcherFamilyName))
    )
      return true;
    if (
      matcher_2 !== undefined &&
      isCliOwnedMcpTool(findToolByName(matcher_2, toolName)) &&
      (hookMatcherFamilyNames.length > 2
        ? hookMatcherFamilyNames.some((hookMatcherFamilyName) => cloudProblem.test(hookMatcherFamilyName))
        : hookMatcherFamilyNames.length > 0 && cloudProblem.test(hookMatcherFamilyNames.at(-1) ?? ""))
    )
      return true;
    for (let legacyName of legacyToolNamesFor(toolName)) if (cloudProblem.test(legacyName)) return true;
    for (let legacyName of aliasesFor(toolName, allTools)) if (cloudProblem.test(legacyName)) return true;
    return false;
  } catch (error) {
    if (error instanceof MatcherUnsupportableError) throw error;
    logForDebugging(`Invalid regex pattern in hook matcher: ${matcher}`);
    return false;
  }
}
//@ chunk-e6aww6q8.js:3485915-3485974 layout
function ruleNamesContainTool(names, toolName, toolName_2) {
  if (names.includes(canonicalToolName(toolName_2))) return true;
  return false;
}
//@ chunk-e6aww6q8.js:3485974-3486233 layout
async function createIfConditionMatcher(hookInput, tools, hookInput_2 = false) {
  let matcher = await prepareIfConditionMatcher(hookInput, tools, hookInput_2);
  if (matcher === undefined) return;
  let { names, patternMatcher, judgesPatterns } = matcher;
  return (ifCondition, condition) => {
    let parsed = permissionRuleValueFromString(ifCondition);
    if (!ruleNamesContainTool(names, ifCondition, parsed.toolName)) return false;
    if (!parsed.ruleContent) return true;
    if (condition) return judgesPatterns;
    return patternMatcher !== undefined && patternMatcher(parsed.ruleContent);
  };
}
//@ chunk-e6aww6q8.js:3486233-3486825 fingerprint = prepareIfConditionMatcher (0.754)
/**
 * 为 if 条件准备匹配器：只对 PreToolUse/PostToolUse/PostToolUseFailure/PermissionRequest/PermissionDenied 生效，用工具的 preparePermissionMatcher 对输入求值。
 */
async function prepareIfConditionMatcher(hookInput, tools, cwd = false) {
  if (
    hookInput.hook_event_name !== "PreToolUse" &&
    hookInput.hook_event_name !== "PostToolUse" &&
    hookInput.hook_event_name !== "PostToolUseFailure" &&
    hookInput.hook_event_name !== "PermissionRequest" &&
    hookInput.hook_event_name !== "PermissionDenied"
  )
    return;
  let toolOverride = undefined;
  let tool = toolOverride ?? (tools && findToolByName(tools, hookInput.tool_name));
  let toolName = toolOverride ? hookInput.tool_name : canonicalToolName(hookInput.tool_name);
  let input = tool?.inputSchema.safeParse(hookInput.tool_input);
  let patternMatcher =
    !cwd && input?.success && tool?.preparePermissionMatcher
      ? await tool.preparePermissionMatcher(input.data)
      : undefined;
  return {
    names: [
      toolName,
      ...getHookMatcherFamilyNames(toolName, tools, hookInput.tool_input),
      ...hookMatchQueries(toolName, getHookToolInput(hookInput)),
    ],
    patternMatcher,
    judgeable: input?.success === true,
    judgesPatterns: tool?.preparePermissionMatcher !== undefined,
  };
}
//@ chunk-e6aww6q8.js:3486825-3486989 layout
function getRewriterKindForHook(returned, hook) {
  return hook === undefined ||
    isCcsTenant() ||
    hook.deviceForwarded === true ||
    getHookOriginLabel(hook) !== undefined ||
    (hook.sdkHost === true && hook.hostOwnsStdin !== true)
    ? "remote"
    : getHookRewriterKind(returned, hook.registeredInSession === true);
}
//@ chunk-e6aww6q8.js:3486989-3487226 layout
function getHookIdentityKey(matchedHook) {
  if (matchedHook.hook.type === "callback" || matchedHook.hook.type === "function") return matchedHook.hook;
  let dedupKey =
    matchedHook.hook.type === "prompt" || matchedHook.hook.type === "agent"
      ? `${matchedHook.hook.type}\x00${matchedHook.hook.prompt}\x00${matchedHook.hook.if ?? ""}`
      : getHookDedupPayload(matchedHook.hook);
  return dedupKey === undefined ? undefined : hookDedupKey(matchedHook, dedupKey);
}
//@ chunk-e6aww6q8.js:3487226-3487324 layout
function canRunForServedCall(matched) {
  return (
    matched.hook.type !== "callback" && matched.hook.type !== "function" && matched.deviceForwarded !== true
  );
}
//@ chunk-e6aww6q8.js:3487324-3487678 layout
function holdModelHookForServedCall(hook, hookEvent) {
  logForDebugging(`Hooks: ${hook.type} hook not run for a call served to a cloud session (${hookEvent})`);
  logServedHookHeld(hookEvent, hook.type, "model_hook");
  return hookEvent === "PreToolUse"
    ? {
        hook,
        outcome: "success",
        permissionBehavior: "ask",
        hookPermissionDecisionReason: HOOK_NOT_RUN_QUESTIONS.model_hook,
        heldForServedCall: true,
      }
    : {
        hook,
        outcome: "success",
        systemMessage: hookNotRunNotice(hookEvent, hook.type, "model_hook"),
        heldForServedCall: true,
      };
}
//@ chunk-e6aww6q8.js:3487678-3487892 layout
function logServedHookHeld(hook, type, type_2, command, reason) {
  logEvent("tengu_remote_tool_serve_hook_held", {
    event: fromEnum(hook),
    hook_type: fromEnum(type),
    reason: fromEnum(type_2),
    ...(command !== undefined && {
      sub_reason: fromEnum(command),
    }),
    ...(reason !== undefined && {
      unavailable: fromEnum(reason),
    }),
    outcome: fromEnum(hook === "PreToolUse" ? "ask" : "skipped"),
  });
}
//@ chunk-e6aww6q8.js:3487892-3488998 layout
/**
 * 为云端服务调用（served call）准备钩子运行环境：可达根目录、自有设置来源、env、home、spawnCwd、shellPrefix、MCP 服务器配置查询。
 */
async function buildServedCallHookEnv(remoteCall, servedHookEnv, boundRequestPrompt) {
  let spawnCwd = remoteCall.origin.launchDir ?? getCwd();
  let reach = await remoteCall.reach.current();
  let clients = getMcpClientsFromAccessor() ?? boundRequestPrompt?.mcp.clients ?? [];
  let mcpServer = (serverName) => {
    let config = clients.find((client) => client.name === serverName)?.config;
    if (config === undefined) return;
    let scope =
      (config.type === undefined || config.type === "stdio") &&
      "command" in config &&
      typeof config.command === "string"
        ? {
            command: config.command,
            ...(Array.isArray(config.args) && {
              args: config.args,
            }),
          }
        : undefined;
    return {
      scope: config.scope,
      ...(scope !== undefined && {
        stdio: scope,
      }),
    };
  };
  let mapped = reach.map(normalizeCommandForPlatform);
  let distrusted = await settingsSourcesInReach(mapped, servedHookEnv, remoteCall.reach.distrustedSources);
  let filtered = SETTING_SOURCES.filter((source) => !distrusted.has(source));
  let attached = remoteCall.reach.envAtAttach;
  let beforeSettings = getLatchedPreSettingsEnvSnapshot();
  let legacyEnv = await hookScriptInReach(remoteCall.reach.legacyEnvAtAttach, mapped);
  let ownEnv = Object.assign(
    {},
    legacyEnv ?? {},
    ...filtered.map((source) => settingsEnvForHookChild(getSettingsForSource(source)?.env, source)),
  );
  let operatorEnv = subprocessEnv();
  let childEnv = mergeHookEnv_2({
    attached,
    beforeSettings,
    ownEnv,
    childrenSee: (key) => Object.hasOwn(operatorEnv, key),
  });
  let hookProgramOnPath = await resolveHookProgramOnPath(mapped, childEnv, operatorEnv);
  if (hookProgramOnPath.omit.length > 0)
    logForDebugging(`Hooks: a served call's hooks run without ${hookProgramOnPath.omit.join(", ")}`);
  let options = resolveOptions(childEnv);
  let spawnCwd_2 = await resolveServedSpawnCwd(options, mapped, spawnCwd, servedHookEnv);
  return {
    roots: mapped,
    ownSources: filtered,
    env: hookProgramOnPath,
    home: options,
    spawnCwd: spawnCwd_2,
    shellPrefix: hookProgramOnPath.base.CLAUDE_CODE_SHELL_PREFIX,
    mcpShellPrefix: env.CLAUDE_CODE_SHELL_PREFIX,
    mcpPath: subprocessEnv().PATH ?? "",
    launchDir: spawnCwd,
    projectDir: remoteCall.reach.projectDir,
    mcpServer,
    ...(servedHookEnv !== undefined && {
      storageV5: servedHookEnv,
    }),
  };
}
//@ chunk-e6aww6q8.js:3488998-3489165 layout
async function resolveServedSpawnCwd(path, options, hook, servedHookEnv) {
  if (
    !isAbsolute(path) ||
    anyPairMatches([path, await realpathOrSelf_2(path)].map(normalizeCommandForPlatform), options)
  )
    return getFilesystemRoot(hook);
  let kind = await statPathKind(path, servedHookEnv, PathSpace.home);
  return kind !== "absent" && kind !== undefined && kind.directory ? path : getFilesystemRoot(hook);
}
//@ chunk-e6aww6q8.js:3489165-3489571 facade-exports
/**
 * 找出哪些设置来源文件可被（云端会话）写到，返回不可信来源集合。
 */
async function settingsSourcesInReach(roots, storageV5, distrustedSources = new Set()) {
  let checkSource = async (source) => {
    if (REPO_DIR_SETTING_SOURCES.has(source)) return true;
    let path = getSettingsFilePathForSource(source);
    if (path === undefined) return false;
    if (anyPairMatches([path, await realpathOrSelf_2(path)].map(normalizeCommandForPlatform), roots))
      return true;
    if (source === "policySettings") return false;
    let kind = await statPathKind(
      path,
      source === "userSettings" ? undefined : storageV5,
      PathSpace.workspace,
    );
    return kind === "absent" ? false : kind === undefined || kind.nlink > 1;
  };
  let results = await Promise.all(
    SETTING_SOURCES.map(async (source) =>
      distrustedSources.has(source) || (await checkSource(source)) ? [source] : [],
    ),
  );
  for (let source of results.flat()) distrustedSources.add(source);
  return new Set(distrustedSources);
}
//@ chunk-e6aww6q8.js:3489571-3490043 layout
async function statPathKind(path, storageV5, space) {
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    let stats = await storageV5.hostFiles.stat(
      space(isAbsolute(path) ? path : joinKeepingTrailingSep(getFsImplementation().cwd(), path)),
    );
    if (stats.ok)
      return stats.value.kind === "absent"
        ? "absent"
        : {
            file: stats.value.kind === "file",
            directory: stats.value.kind === "directory",
            nlink: stats.value.nlink,
          };
    return (stats.error.code === "Failed" ? stats.error.telemetryCode : undefined) === "ENOTDIR"
      ? "absent"
      : undefined;
  }
  return stat(path).then(
    (stats) => ({
      file: stats.isFile(),
      directory: stats.isDirectory(),
      nlink: stats.nlink,
    }),
    (error) => (error.code === "ENOENT" || error.code === "ENOTDIR" ? "absent" : undefined),
  );
}
//@ chunk-e6aww6q8.js:3490043-3490053 layout
var NOT_HELD = {};
//@ chunk-e6aww6q8.js:3490053-3494919 layout
/**
 * 判断一个钩子在服务调用中能否在本机运行：项目配置的、Windows 未解析的、脚本或程序位于可写范围内的、链接文件等都被扣住（held），返回原因。
 */
async function judgeHookForServedCall(hook, hook_2, servedHookEnv) {
  let { hook: hook_3 } = hook;
  let { home } = servedHookEnv;
  if (
    hook_3.type !== "command" &&
    hook_3.type !== "http" &&
    hook_3.type !== "mcp_tool" &&
    hook_3.type !== "script"
  )
    return NOT_HELD;
  if (
    hook.pluginRoot === undefined &&
    hook.skillRoot === undefined &&
    isNotFromOwnSettings(hook_3, hook_2, hook.matcherTexts ?? [], servedHookEnv.ownSources)
  )
    return {
      held: "project_configured",
    };
  let isWindows = getPlatform() === "windows";
  if (isWindows && hook_3.type === "command")
    return {
      held: "windows_unparsed",
    };
  let checkInReach = async (filePath, kind = "script") => {
    let real = await realpathAllowMissing(filePath);
    if (real === "unreadable") return "unreadable";
    if (
      anyPairMatches(
        [filePath, ...(real === "absent" ? [] : [real])].map(normalizeCommandForPlatform),
        servedHookEnv.roots,
      )
    )
      return "in_reach";
    if (kind !== "directory" && real !== "absent") {
      let pathKind = await statPathKind(real, servedHookEnv.storageV5, PathSpace.workspace);
      if (pathKind === undefined) return "unreadable";
      if (pathKind !== "absent" && (!pathKind.file || (kind === "script" && pathKind.nlink > 1)))
        return "linked";
    }
    return;
  };
  if (
    isWindows &&
    hook_3.type === "script" &&
    (!isAbsolutePlatformPath(servedHookEnv.spawnCwd) ||
      (await realpathAllowMissing(servedHookEnv.spawnCwd)) === "absent" ||
      (await checkInReach(servedHookEnv.spawnCwd, "directory")) !== undefined)
  )
    return {
      held: "start_directory",
    };
  let root = hook.pluginRoot ?? hook.skillRoot;
  if (root !== undefined) {
    let rootKind = await checkInReach(root, "directory");
    if (rootKind !== undefined)
      return rootKind === "linked"
        ? {
            held: "unreadable",
            cause: "linked_file",
          }
        : {
            held: rootKind,
          };
  }
  if (hook_3.type === "mcp_tool") {
    let server = servedHookEnv.mcpServer(hook_3.server);
    if (server?.scope === "project")
      return {
        held: "in_reach",
      };
    if (
      server === undefined ||
      !["user", "local", "enterprise", "managed", "claudeai"].includes(server.scope ?? "")
    )
      return {
        held: "unreadable",
      };
    if (server.stdio === undefined) return NOT_HELD;
    if (isWindows)
      return {
        held: "windows_unparsed",
      };
    if (servedHookEnv.mcpShellPrefix || servedHookEnv.shellPrefix)
      return {
        held: "unreadable",
      };
    let commandInfo = analyzeHookCommand(
      {
        command: server.stdio.command,
        args: server.stdio.args ?? [],
      },
      {
        home,
        projectDir: servedHookEnv.projectDir,
        hookCwd: servedHookEnv.launchDir,
        defaultShell: "bash",
        shellPrefix: undefined,
      },
    );
    if (commandInfo.kind === "opaque")
      return {
        held: "unreadable",
      };
    let PATH = servedHookEnv.env.base.PATH ?? "";
    let expandArgs = async (arg) =>
      resolveProgramOnPathInReach(server.stdio.command, arg, servedHookEnv.roots);
    let resolveCommand = async (command) =>
      (await resolveHookCommand(command, PATH, servedHookEnv.roots)) ??
      (servedHookEnv.mcpPath === PATH
        ? undefined
        : await resolveHookCommand(command, servedHookEnv.mcpPath, servedHookEnv.roots));
    if (commandInfo.interpreter !== null) {
      if (
        (isAbsolute(server.stdio.command)
          ? await checkInReach(server.stdio.command, "program")
          : await Promise.all([expandArgs(PATH), expandArgs(servedHookEnv.mcpPath)]).then(([me, we]) =>
              me === undefined || me === "in_reach" || we === undefined || we === "in_reach" || me !== we
                ? "in_reach"
                : undefined,
            )) !== undefined
      )
        return {
          held: "unreadable",
          cause: "program_in_reach",
        };
      let isAbsoluteCommand = isAbsolute(server.stdio.command)
        ? await resolveCommand(server.stdio.command)
        : undefined;
      if (isAbsoluteCommand !== undefined)
        return isAbsoluteCommand === "unreadable"
          ? {
              held: "unreadable",
            }
          : {
              held: "unreadable",
              cause: isAbsoluteCommand,
            };
    } else {
      let resolvedCommand = await resolveCommand(commandInfo.resolvedPath);
      if (resolvedCommand !== undefined)
        return resolvedCommand === "unreadable"
          ? {
              held: "unreadable",
            }
          : {
              held: "unreadable",
              cause: resolvedCommand,
            };
    }
    let kind = await checkInReach(commandInfo.resolvedPath);
    return kind === undefined
      ? NOT_HELD
      : kind === "linked"
        ? {
            held: "unreadable",
            cause: "linked_file",
          }
        : {
            held: kind,
          };
  }
  if (hook_3.type === "script") {
    let launchCommand = getLaunchCommand({
      pinToCurrentBinary: true,
    });
    if (!isAbsolute(launchCommand.cmd))
      return {
        held: "unreadable",
      };
    let paths = [];
    for (let prefixArg of launchCommand.prefixArgs) {
      let index = prefixArg.indexOf("=");
      let optionPath = prefixArg.startsWith("-") && index !== -1 ? prefixArg.slice(index + 1) : undefined;
      if (isAbsolute(prefixArg)) paths.push(prefixArg);
      else if (optionPath !== undefined && isAbsolute(optionPath)) paths.push(optionPath);
      else if (!/^(?:-[A-Za-z0-9]|--[A-Za-z][\w-]*)$/.test(prefixArg))
        return {
          held: "unreadable",
        };
    }
    let checks = [[launchCommand.cmd, "program"], ...paths.map((path) => [path, "script"])];
    for (let [path, kind] of checks) {
      let checkResult = await checkInReach(path, kind);
      if (checkResult !== undefined)
        return {
          held: "unreadable",
          cause: checkResult === "linked" ? "linked_file" : "program_in_reach",
        };
      let hookCommand = await resolveHookCommand(
        path,
        servedHookEnv.env.extra.PATH ?? "",
        servedHookEnv.roots,
      );
      if (hookCommand !== undefined)
        return hookCommand === "unreadable"
          ? {
              held: "unreadable",
            }
          : {
              held: "unreadable",
              cause: hookCommand,
            };
    }
    if (hook_3.file === undefined) return NOT_HELD;
    let expandedScript;
    try {
      expandedScript = expandScriptHookPathVars(anchorScriptHookPath(hook_3.file), {
        projectDir: servedHookEnv.projectDir,
        pluginRoot: root,
        pluginData:
          hook.pluginRoot !== undefined && hook.pluginId !== undefined
            ? pluginDataDirPath(hook.pluginId)
            : undefined,
      });
    } catch {
      expandedScript = undefined;
    }
    if (expandedScript === undefined)
      return {
        held: "unreadable",
      };
    let kind = await checkInReach(expandedScript);
    if (kind !== undefined)
      return kind === "linked"
        ? {
            held: "unreadable",
            cause: "linked_file",
          }
        : {
            held: kind,
          };
    return NOT_HELD;
  }
  if (hook_3.type !== "command") return NOT_HELD;
  let analyzed =
    root === undefined
      ? {
          hook: hook_3,
          projectDir: servedHookEnv.projectDir,
        }
      : rebasePluginRootForJudge(hook_3, root, servedHookEnv.projectDir);
  if (analyzed === undefined)
    return {
      held: "unreadable",
    };
  let withArgsCommand;
  for (let hookCwd of [servedHookEnv.launchDir]) {
    let resolvedInfo = analyzeHookCommand(analyzed.hook, {
      home,
      projectDir: analyzed.projectDir,
      hookCwd,
      defaultShell: "bash",
      shellPrefix: servedHookEnv.shellPrefix,
    });
    if (resolvedInfo.kind === "opaque")
      return {
        held: "unreadable",
      };
    if (!isAnchoredCommandPath(resolvedInfo.rawPath))
      return {
        held: "in_reach",
      };
    let kind = await checkInReach(resolvedInfo.resolvedPath);
    if (kind !== undefined)
      return kind === "linked"
        ? {
            held: "unreadable",
            cause: "linked_file",
          }
        : {
            held: kind,
          };
    if (resolvedInfo.interpreter === null) {
      let hookCommand = await resolveHookCommand(
        resolvedInfo.resolvedPath,
        servedHookEnv.env.extra.PATH ?? "",
        servedHookEnv.roots,
        {
          childStartsInReach: false,
        },
      );
      if (hookCommand !== undefined)
        return hookCommand === "unreadable"
          ? {
              held: "unreadable",
            }
          : {
              held: "unreadable",
              cause: hookCommand,
            };
      continue;
    }
    let programPath =
      hook_3.args !== undefined ? analyzed.hook.command : analyzed.hook.command.trim().split(/[ \t]+/, 1)[0];
    if (programPath !== undefined && isAbsolute(programPath)) {
      let kind = await checkInReach(programPath, "program");
      if (kind !== undefined)
        return {
          held: "unreadable",
          cause:
            kind === "linked"
              ? "linked_file"
              : kind === "in_reach"
                ? "program_in_reach"
                : "program_unresolved",
        };
      let hookCommand = await resolveHookCommand(
        programPath,
        servedHookEnv.env.extra.PATH ?? "",
        servedHookEnv.roots,
        {
          childStartsInReach: false,
        },
      );
      if (hookCommand !== undefined)
        return hookCommand === "unreadable"
          ? {
              held: "unreadable",
            }
          : {
              held: "unreadable",
              cause: hookCommand,
            };
      continue;
    }
    let programOnPathInReach = await resolveProgramOnPathInReach(
      programPath ?? resolvedInfo.interpreter,
      servedHookEnv.env.extra.PATH ?? "",
      servedHookEnv.roots,
      {
        childStartsInReach: false,
      },
    );
    if (programOnPathInReach === undefined)
      return {
        held: "unreadable",
        cause: "program_unresolved",
      };
    if (programOnPathInReach === "in_reach")
      return {
        held: "unreadable",
        cause: "program_in_reach",
      };
    if (hook_3.args !== undefined && !hook_3.command.includes("/")) withArgsCommand = programOnPathInReach;
  }
  return withArgsCommand === undefined
    ? NOT_HELD
    : {
        program: withArgsCommand,
      };
}
//@ chunk-e6aww6q8.js:3494919-3495341 layout
function rebasePluginRootForJudge(hook, pluginRoot, projectDir) {
  if (hook.args !== undefined) {
    let rebase = (command) => command.replaceAll("${CLAUDE_PLUGIN_ROOT}", () => pluginRoot);
    return {
      hook: {
        ...hook,
        command: rebase(hook.command),
        args: hook.args.map(rebase),
      },
      projectDir,
    };
  }
  if (!/\$\{?CLAUDE_PLUGIN_ROOT\b/.test(hook.command))
    return {
      hook,
      projectDir,
    };
  if (/\$\{?CLAUDE_PROJECT_DIR\b/.test(hook.command)) return;
  return {
    hook: {
      ...hook,
      command: hook.command.replace(
        /\$(\{?)CLAUDE_PLUGIN_ROOT\b/g,
        (whole, name) => `$${name}CLAUDE_PROJECT_DIR`,
      ),
    },
    projectDir: pluginRoot,
  };
}
//@ chunk-e6aww6q8.js:3495341-3495726 layout
function getHookDedupPayload(hook) {
  switch (hook.type) {
    case "command":
      return `command\x00${hook.shell ?? defaultShellKind()}\x00${hook.command}\x00${jsonStringify(hook.args ?? null)}\x00${hook.if ?? ""}`;
    case "http":
      return `http\x00${hook.url}\x00${hook.if ?? ""}`;
    case "mcp_tool":
      return `mcp_tool\x00${hook.server}\x00${hook.tool}\x00${jsonStringify(hook.input ?? {})}\x00${hook.if ?? ""}`;
    case "script":
      return `script\x00${jsonStringify(hook.script ?? null)}\x00${jsonStringify(hook.file ?? null)}\x00${hook.if ?? ""}`;
    default:
      return;
  }
}
//@ chunk-e6aww6q8.js:3495726-3495891 layout
function isSameHook(hook, hook_2) {
  if (
    hook.type === "callback" ||
    hook.type === "function" ||
    hook_2.type === "callback" ||
    hook_2.type === "function"
  )
    return hook === hook_2;
  let hookDedupPayload = getHookDedupPayload(hook);
  return hookDedupPayload !== undefined
    ? hookDedupPayload === getHookDedupPayload(hook_2)
    : isDeepStrictEqual(hook, hook_2);
}
//@ chunk-e6aww6q8.js:3495891-3496298 layout
function isPersonalRestrictedHook(hookEvent, hookEvent_2) {
  let { hook } = hookEvent;
  if (
    !isPersonalConfigRestricted() ||
    (hook.type !== "command" && hook.type !== "http" && hook.type !== "mcp_tool" && hook.type !== "script")
  )
    return false;
  if (hookEvent.personal === true) return true;
  if (hook.type === "command" && getHookOriginLabel(hookEvent) !== undefined) return false;
  if (hookEvent.pluginRoot !== undefined || hookEvent.deviceForwarded === true || hookEvent.sdkHost === true)
    return false;
  if (hookEvent.skillRoot !== undefined || hookEvent.projectRoot !== undefined) return false;
  let hookDedupPayload = getHookDedupPayload(hook);
  return (getUserHooksFromSnapshot()[hookEvent_2] ?? []).some((hook) =>
    hook.hooks.some((hook) => getHookDedupPayload(hook) === hookDedupPayload),
  );
}
//@ chunk-e6aww6q8.js:3496298-3496734 layout
function restrictPersonalHookAnswer(hookInput, hookInput_2) {
  if (isSyncHookJSONOutput_2(hookInput)) return hookInput;
  let { answer, report } = parseHookJsonOutput(hookInput, hookInput_2.hook_event_name, {
    personal: true,
    ...("tool_name" in hookInput_2 && {
      toolName: hookInput_2.tool_name,
    }),
    ...("tool_input" in hookInput_2 && {
      toolInput: jsonParse(jsonStringify(hookInput_2.tool_input)),
    }),
    ...("tool_response" in hookInput_2 &&
      hookInput_2.tool_response !== undefined && {
        toolResponse: jsonParse(jsonStringify(hookInput_2.tool_response)),
      }),
  });
  if (report.dropped.length > 0)
    logForDebugging(
      `${hookInput_2.hook_event_name} hook from your own files: ignored ${report.dropped.join(", ")} (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG)`,
    );
  return answer;
}
//@ chunk-e6aww6q8.js:3496734-3496810 layout
function isSyncHookConfig(hook) {
  return hook.type !== "command" || (hook.async !== true && hook.asyncRewake !== true);
}
//@ chunk-e6aww6q8.js:3496810-3497556 layout
function dedupeHooksPreferSettings(pairs, hookEvent, settingsHookSets) {
  let byKey = new Map(pairs);
  if (!isPersonalConfigRestricted()) return markContestedContinue(pairs, Array.from(byKey.values()));
  let flattened = (getUserHooksFromSnapshot()[hookEvent] ?? []).flatMap((hook) => hook.hooks);
  let settingsByKey = new Map();
  for (let [key, hook] of pairs) {
    let fromOwn =
      settingsHookSets.settings.has(hook.hook) &&
      hook.pluginRoot === undefined &&
      hook.skillRoot === undefined &&
      hook.projectRoot === undefined &&
      hook.deviceForwarded !== true &&
      hook.sdkHost !== true &&
      flattened.some((hook_2) => isDeepStrictEqual(hook_2, hook.hook));
    let found = settingsByKey.get(key);
    if (fromOwn && (found === undefined || isSyncHookConfig(hook.hook) || !isSyncHookConfig(found.hook)))
      settingsByKey.set(key, hook);
  }
  if (settingsByKey.size === 0) return markContestedContinue(pairs, Array.from(byKey.values()));
  let flattened_2 = ["flagSettings", "policySettings"].flatMap((source) =>
    (getSettingsForSource(source)?.hooks?.[hookEvent] ?? []).flatMap((hook) => hook.hooks),
  );
  let list = Array.from(byKey, ([key, hook]) => {
    let found = settingsByKey.get(key);
    if (
      found === undefined ||
      (!isSyncHookConfig(found.hook) && isSyncHookConfig(hook.hook)) ||
      flattened_2.some((hook_2) => isDeepStrictEqual(hook_2, hook.hook))
    )
      return hook;
    return settingsHookSets.settings.has(hook.hook) ||
      settingsHookSets.checkout.has(hook.hook) ||
      !isSyncHookConfig(hook.hook)
      ? found
      : hook;
  });
  return markContestedContinue(pairs, list);
}
//@ chunk-e6aww6q8.js:3497556-3497620 layout
function isOnFailureContinue(hook) {
  return "onFailure" in hook && hook.onFailure === "continue";
}
//@ chunk-e6aww6q8.js:3497620-3497874 layout
function markContestedContinue(pairs, policyHooks) {
  if (!policyHooks.some((hook) => isOnFailureContinue(hook.hook))) return policyHooks;
  let byKey = new Map(pairs.map(([key, hook]) => [hook, key]));
  let continued = new Set(pairs.flatMap(([key, hook]) => (isOnFailureContinue(hook.hook) ? [] : [key])));
  return policyHooks.map((hook) => {
    let policyHook = byKey.get(hook);
    return isOnFailureContinue(hook.hook) && (policyHook === undefined || continued.has(policyHook))
      ? {
          ...hook,
          continueIsContested: true,
        }
      : hook;
  });
}
//@ chunk-e6aww6q8.js:3497874-3498149 layout
function findSettingsHookDefinition(hook, hookEvent, hookEvent_2, sources) {
  if (hook.type === "callback" || hook.type === "function") return;
  let hookDedupPayload = getHookDedupPayload(hook);
  if (hookDedupPayload === undefined) return;
  for (let source of [...sources].reverse())
    for (let hook of getSettingsForSource(source)?.hooks?.[hookEvent] ?? []) {
      if (!hookEvent_2.includes(hook.matcher ?? "")) continue;
      let found = hook.hooks.find((hook) => getHookDedupPayload(hook) === hookDedupPayload);
      if (found !== undefined) return found;
    }
  return;
}
//@ chunk-e6aww6q8.js:3498149-3498307 layout
function isNotFromOwnSettings(hook, hook_2, globalHooks, ownSources) {
  let matchesAnyWhere = (sources, matcherText) =>
    sources.some((source) =>
      (getSettingsForSource(source)?.hooks?.[hook_2] ?? []).some(
        (hook_2) =>
          (hook_2.matcher ?? "") === matcherText &&
          hook_2.hooks.some((hook_2) => isDeepStrictEqual(hook_2, hook)),
      ),
    );
  return !globalHooks.some((source) => matchesAnyWhere(ownSources, source));
}
//@ chunk-e6aww6q8.js:3498307-3498478 layout
function isManagedSnapshotHook(hook, hookEvent) {
  try {
    let policyHooksFromSnapshot = getPolicyHooksFromSnapshot();
    if (policyHooksFromSnapshot === "unreadable") return true;
    let hookDedupPayload = getHookDedupPayload(hook);
    return (
      hookDedupPayload !== undefined &&
      (policyHooksFromSnapshot[hookEvent] ?? []).some((hook_2) =>
        hook_2.hooks.some(
          (hook_2) => getHookDedupPayload(hook_2) === hookDedupPayload && httpHookHeadersEqual(hook_2, hook),
        ),
      )
    );
  } catch {
    return true;
  }
}
//@ chunk-e6aww6q8.js:3498478-3498658 layout
function markHookOwnership(finalHooks, hook, finalHooks_2) {
  for (let { hook: hook_2, pluginRoot, pluginId, skillRoot } of finalHooks) {
    if (skillRoot !== undefined || hook_2.type === "function") continue;
    let hasPluginRoot = pluginRoot !== undefined;
    if ((!hasPluginRoot && finalHooks_2) || isOrganizationHook(hook_2, hook, hasPluginRoot, pluginId))
      markRewrittenInput(hook_2);
    else unmarkRewrittenInput(hook_2);
  }
}
//@ chunk-e6aww6q8.js:3498658-3498853 layout
function isOrganizationHook(hook, hook_2, hookEvent, managedState) {
  try {
    return hookEvent
      ? managedState !== undefined && isManagedPluginId(managedState)
      : isManagedSnapshotHook(hook, hook_2);
  } catch (error) {
    logForDebugging(
      `Hooks: whose a ${hook_2} hook is could not be told, so it starts as the organization's: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return true;
  }
}
//@ chunk-e6aww6q8.js:3498853-3498991 layout
function httpHookHeadersEqual(hook, hook_2) {
  return (
    hook.type !== "http" ||
    hook_2.type !== "http" ||
    (isDeepStrictEqual(hook.headers ?? {}, hook_2.headers ?? {}) &&
      isDeepStrictEqual(hook.allowedEnvVars ?? [], hook_2.allowedEnvVars ?? []))
  );
}
//@ chunk-e6aww6q8.js:3498991-3499273 layout
function getManagedHttpHookEnv(hook) {
  if (!isRewrittenInput(hook)) return;
  try {
    return withHostEnvRestored(getProcessEnvForHttpHook);
  } catch (error) {
    logForDebugging(
      `Hooks: the environment an organization's http hook reads its header variables from could not be composed, so they read as unset: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return {
      env: {},
      blankList: {
        plain: new Set(),
        remoteSink: new Set(),
      },
    };
  }
}
//@ chunk-e6aww6q8.js:3499273-3499361 layout
function resolveScriptHook(hook, options) {
  if (!isRewrittenInput(hook)) return runScriptHookUnsupported(hook, options);
  let withEnv = withHostEnvRestored(() => runScriptHookUnsupported(hook, options));
  markRewrittenInput(withEnv.hook);
  return withEnv;
}
//@ chunk-e6aww6q8.js:3499361-3499641 layout
async function getServedSessionOwnSources(storageV5) {
  if (isDiskless()) return POLICY_ONLY_SOURCES;
  try {
    let roots = await hookPathRoots();
    let distrusted = await settingsSourcesInReach(roots, storageV5);
    return {
      roots,
      ownSources: SETTING_SOURCES.filter((source) => !distrusted.has(source)),
    };
  } catch (error) {
    logForDebugging(
      `Hooks: could not tell which settings files the served session can write (${errorMessage(error)}); only managed settings vouch for a hook`,
    );
    return POLICY_ONLY_SOURCES;
  }
}
//@ chunk-e6aww6q8.js:3499641-3499692 layout
var POLICY_ONLY_SOURCES = {
  roots: [POSIX_SEP_2],
  ownSources: ["policySettings"],
};
//@ chunk-e6aww6q8.js:3499692-3500305 layout
async function getUntrustedFolderSources(servedHookEnv) {
  let base = {
    roots: [POSIX_SEP_2],
    ownSources: ["userSettings", "flagSettings", "policySettings"],
    untrustedFolder: true,
  };
  let originalCwdOrNull = getOriginalCwdOrNull();
  let options = resolveOptions(getLatchedPreSettingsEnvSnapshot() ?? subprocessEnv());
  if (getProjectConfigRoot() !== null)
    return {
      ...base,
      ownSources: [],
    };
  if (
    originalCwdOrNull !== null &&
    (await realpathOrSelf_2(originalCwdOrNull)) === (await realpathOrSelf_2(options))
  )
    return base;
  let flagUsable =
    getFlagSettingsInline() === null && getSettingsFilePathForSource("flagSettings") !== undefined;
  let roots = [POSIX_SEP_2];
  let ownSources = flagUsable;
  try {
    if (!isDiskless()) {
      roots = await hookPathRoots();
      let distrusted = await settingsSourcesInReach(roots, servedHookEnv);
      ownSources = flagUsable && distrusted.has("flagSettings");
    }
  } catch (error) {
    logForDebugging(
      `Hooks: could not tell what the launch folder holds (${errorMessage(error)}); with no workspace trust a --settings file does not vouch for a hook`,
      {
        level: "error",
      },
    );
  }
  return {
    ...base,
    ownSources: ownSources ? [] : base.ownSources,
    untrustedStart: await resolveServedSpawnCwd(options, roots, originalCwdOrNull ?? getCwd(), servedHookEnv),
  };
}
//@ chunk-e6aww6q8.js:3500305-3500991 layout
async function isWithheldFolderHook(hookGroup, toolInput, { roots, ownSources, untrustedFolder }) {
  let { hook } = hookGroup;
  if (hook.type !== "command" && hook.type !== "http" && hook.type !== "mcp_tool" && hook.type !== "script")
    return false;
  let hookRoot = hookGroup.pluginRoot ?? hookGroup.skillRoot;
  let withheld =
    hookRoot === undefined
      ? isNotFromOwnSettings(hook, toolInput, hookGroup.matcherTexts ?? [], ownSources)
      : anyPairMatches([hookRoot, await realpathOrSelf_2(hookRoot)].map(normalizeCommandForPlatform), roots);
  if (withheld && untrustedFolder)
    logForDebugging(
      `Hooks: ${hook.type} hook not run for ${toolInput}: the workspace is not trusted, and the person's own settings do not define it`,
    );
  else if (withheld) {
    logForDebugging(
      `Hooks: ${hook.type} hook not run for ${toolInput}: it comes from the launch folder's settings, and this process serves a cloud session with no terminal`,
    );
    if (!loadedManagedKeyGroupsList().includes("hook"))
      logFeatureOk("remote_served_folder_config_withheld", {
        arm: fromEnum("hook_dispatch"),
        event: fromEnum(toolInput),
      });
    markManagedKeyGroup("hook");
  }
  return withheld;
}
//@ chunk-e6aww6q8.js:3500991-3501095 layout
async function filterWithheldFolderHooks(hooks, toolInput, hookEvent) {
  let results = await Promise.all(hooks.map((hook) => isWithheldFolderHook(hook, toolInput, hookEvent)));
  return hooks.filter((hook, index) => !results[index]);
}
//@ chunk-e6aww6q8.js:3501095-3501152 layout
function isAnchoredCommandPath(rawPath) {
  return /^(?:\/|~|\$\{?[A-Za-z_])/.test(rawPath);
}
//@ chunk-e6aww6q8.js:3501152-3501213 layout
function getFilesystemRoot(path) {
  return getPlatform() === "windows" ? win32.parse(path).root : "/";
}
//@ chunk-e6aww6q8.js:3501213-3501296 layout
async function realpathOrSelf_2(path) {
  let real = await realpathAllowMissing(path);
  return real === "absent" || real === "unreadable" ? path : real;
}
//@ chunk-e6aww6q8.js:3501296-3501667 layout
function holdHookForServedCall(hook, hookEvent, held, command, hook_2) {
  logForDebugging(
    `Hooks: ${hook.type} hook not run for a call served to a cloud session (${hookEvent}, ${command ?? held})`,
  );
  logServedHookHeld(hookEvent, hook.type, held, command, hook_2);
  return hookEvent === "PreToolUse"
    ? {
        hook,
        outcome: "success",
        permissionBehavior: "ask",
        hookPermissionDecisionReason:
          hook_2 === "person_read_rules" ? READ_LIMIT_BLOCKED_QUESTION : HOOK_NOT_RUN_QUESTIONS[held],
        heldForServedCall: true,
      }
    : {
        hook,
        outcome: "success",
        systemMessage: hookNotRunNotice(hookEvent, hook.type, held),
        heldForServedCall: true,
      };
}
//@ chunk-e6aww6q8.js:3501667-3502078 layout
function redactServedBlockingError(hook) {
  if (hook.blockingError === undefined) return hook;
  let label = `${hook.hook.type} hook`;
  let prefix = `[${hook.blockingError.command}]:`;
  let blockingError = hook.blockingError.blockingError;
  let permissionRequestResult = hook.permissionRequestResult;
  return {
    ...hook,
    blockingError: {
      blockingError: blockingError.startsWith(prefix)
        ? `[${label}]:${blockingError.slice(prefix.length)}`
        : blockingError,
      command: label,
    },
    ...(permissionRequestResult?.behavior === "deny" &&
      permissionRequestResult.message?.startsWith(prefix) === true && {
        permissionRequestResult: {
          ...permissionRequestResult,
          message: `[${label}]:${permissionRequestResult.message.slice(prefix.length)}`,
        },
      }),
  };
}
//@ chunk-e6aww6q8.js:3502078-3503312 layout
/**
 * PreToolUse 钩子超时或失败（未给结论）时改为阻断：onFailure:continue 且未被争议时放行；否则生成「the hook did not finish/failed, so this call was not run」。
 */
function refuseUnfinishedPreToolHook(hook, signal, signal_2, results) {
  if (
    signal_2 !== undefined &&
    "onFailure" in hook.hook &&
    hook.hook.onFailure === "continue" &&
    results?.continueIsContested !== true
  )
    return hook;
  let message =
    hook.outcome === "cancelled" && signal?.aborted !== true
      ? "gave no verdict in time"
      : hook.outcome === "non_blocking_error" &&
          hook.ranByContract !== true &&
          (signal_2 === undefined || signal_2.failuresToo === true)
        ? "gave no verdict"
        : undefined;
  if (message === undefined) return hook;
  logForDebugging(
    `Hooks: ${signal_2 === undefined ? "served-call " : ""}PreToolUse ${hook.hook.type} hook ${message}; refusing the call`,
    {
      level: "warn",
    },
  );
  if (signal_2 !== undefined) {
    logEvent("tengu_pre_tool_use_refused_unfinished_hook", {
      hookType: fromEnum(hook.hook.type),
      toolName:
        results?.tool === undefined
          ? lit_2("unknown")
          : results.tool.isMcp === true || results.tool.mcpInfo !== undefined
            ? lit_2("mcp_tool")
            : results.tool.uiTableKey !== undefined || results.tool.name.includes("__")
              ? lit_2("dynamic_tool")
              : sanitizeToolNameForAnalytics(results.tool.name),
      gateIgnoresSwitch: signal_2.gateIgnoresSwitch,
      inSubagent: results?.inSubagent === true,
      ...(hook.outcome !== "cancelled" && {
        hookFailed: true,
      }),
    });
    let label = hookProgramLabelForReport(hook.hook);
    return {
      ...hook,
      message: undefined,
      blockingError: {
        blockingError: `[${label}]: the hook ${hook.outcome === "cancelled" ? "did not finish" : "failed"}, so this call was not run.
${signal_2.advice}`,
        command: label,
        hookDidNotFinish: true,
      },
      outcome: "blocking",
    };
  }
  return {
    ...hook,
    message: undefined,
    blockingError: {
      blockingError: `a PreToolUse ${hook.hook.type} hook ${message}, so this call was not run`,
      command: getHookDisplayText(hook.hook),
    },
    outcome: "blocking",
  };
}
//@ chunk-e6aww6q8.js:3503312-3503396 fingerprint = hookDedupKey (0.791)
/**
 * 钩子去重键：来源根（pluginRoot/skillRoot/settingsSource）+ 负载。
 */
function hookDedupKey(m, payload) {
  return `${m.pluginRoot ?? m.skillRoot ?? m.settingsSource ?? ""}\x00${payload}`;
}
//@ chunk-e6aww6q8.js:3503396-3503531 layout
function isOfficialPluginId(rowId) {
  let index = rowId.lastIndexOf("@");
  if (index <= 0) return false;
  let sliced = rowId.slice(index + 1);
  if (isOfficialMarketplaceName_3(sliced)) return true;
  if (sliced === SYNCED && isOfficialMarketplaceName_3(getAttestedOfficialPluginMarketplace(rowId)))
    return true;
  return false;
}
//@ chunk-e6aww6q8.js:3503531-3503704 layout
function countHooksByPlugin(userHooks) {
  let filtered = userHooks.filter((hook) => hook.pluginId);
  if (filtered.length === 0) return;
  let gatesByPlugin = new Map();
  for (let hook of filtered) {
    let pluginId = pluginIdForAnalytics_GATE_EVALUATED(hook.pluginId, isOfficialPluginId(hook.pluginId));
    gatesByPlugin.set(pluginId, (gatesByPlugin.get(pluginId) ?? 0) + 1);
  }
  return gatesByPlugin;
}
//@ chunk-e6aww6q8.js:3503704-3503840 layout
function shouldPassCredentialsToPluginHook(hook) {
  if (!isOfficialPluginId(hook)) return false;
  let index = hook.lastIndexOf("@");
  let sliced = hook.slice(0, index);
  return (getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_lattice", {}).plugins ?? []).includes(sliced);
}
//@ chunk-e6aww6q8.js:3503840-3504133 layout
/**
 * 为白名单中的官方插件钩子提供凭据环境变量（订阅用户给 OAuth 访问令牌，否则给 API key）；serve、会话令牌、非第一方、仅必要流量或 HIPAA 等情况下不给。
 */
function getPluginHookCredentialEnv(hook) {
  if (!hook || !shouldPassCredentialsToPluginHook(hook)) return {};
  if (isHttpMcpServeInvocation()) return {};
  if (usesSessionAccessToken()) return {};
  if (!isFirstPartyProvider()) return {};
  if (isEssentialTrafficOnly() || hipaaWithholdsChildCredentials()) return {};
  if (env.ANTHROPIC_UNIX_SOCKET) return {};
  try {
    if (isClaudeAISubscriber()) {
      let accessToken = loginToHandOn(getClaudeAIOAuthTokens())?.accessToken;
      return accessToken
        ? {
            ANTHROPIC_AUTH_TOKEN: accessToken,
          }
        : {};
    }
    let anthropicApiKey = getAnthropicApiKey();
    return anthropicApiKey
      ? {
          ANTHROPIC_API_KEY: anthropicApiKey,
        }
      : {};
  } catch {
    return {};
  }
}
//@ chunk-e6aww6q8.js:3504133-3504464 facade-exports
/**
 * 上报插件钩子自报的指标：取输出对象前若干个布尔/数字字段，记 `tengu_hook_plugin_metrics` 并写 OTel 事件 hook_plugin_metrics。
 */
function emitHookMetrics(metrics, pluginId, hookEvent, metrics_2) {
  if (!metrics || !pluginId) return;
  let official = isOfficialPluginId(pluginId);
  if (!official) return;
  let filtered = Object.entries(metrics)
    .slice(0, MAX_HOOK_METRIC_KEYS)
    .filter(([, value]) => typeof value === "boolean" || typeof value === "number");
  logEvent("tengu_hook_plugin_metrics", {
    ...Object.fromEntries(filtered),
    pluginId: pluginIdForAnalytics_GATE_EVALUATED(pluginId, official),
    hookEvent: fromEnum(hookEvent),
  });
  logOTelEvent(
    "hook_plugin_metrics",
    {
      ...Object.fromEntries(filtered),
      plugin_id: pluginId,
      hook_event: hookEvent,
    },
    metrics_2,
  );
}
//@ chunk-e6aww6q8.js:3504464-3504565 layout
function countHooksByType(userHooks) {
  let countsByType = new Map();
  for (let hook of userHooks) {
    let type = fromEnum(hook.hook.type);
    countsByType.set(type, (countsByType.get(type) ?? 0) + 1);
  }
  return countsByType;
}
//@ chunk-e6aww6q8.js:3504565-3504595 facade-exports
var MANAGED_HOOKS_TIER = {
  managedHooksOnly: true,
};
//@ chunk-e6aww6q8.js:3504595-3504780 facade-exports
/**
 * 判断托管层（managed）钩子情况：有托管钩子返回 some；确认没有托管钩子且策略已读好返回 none；无法确定返回 unknown。
 */
function managedTierHooks(hookEvent) {
  try {
    if (collectEventHooks(undefined, [], hookEvent, MANAGED_HOOKS_TIER).length > 0) return "some";
    let eligibilityMemo = getEligibilityMemo();
    let readable =
      isCcsCoworkSurface() ||
      eligibilityMemo === false ||
      (eligibilityMemo === true && getLastLoadStatus()?.state === "ok");
    return getPolicySettingsLoadErrors().length === 0 && readable ? "none" : "unknown";
  } catch {
    return "unknown";
  }
}
//@ chunk-e6aww6q8.js:3504780-3504902 sole-consumer
function excludeManagedHooks(settingsHooks, hookEvent) {
  let keyOf = (hook) =>
    stableStringifySafe({
      ...hook,
      settingsSource: undefined,
    });
  let managedKeys = new Set(getManagedHooksForEvent(hookEvent).map(keyOf));
  return settingsHooks.filter((hook) => !managedKeys.has(keyOf(hook)));
}
//@ chunk-e6aww6q8.js:3504902-3505019 sole-consumer
function getManagedHooksForEvent(hookEvent) {
  return filterHooksForCloudSession([
    ...(getSettingsForSource("policySettings")?.hooks?.[hookEvent] ?? []),
    ...(getPluginHookRunner()?.settingsHooks("policySettings", hookEvent) ?? []),
  ]);
}
//@ chunk-e6aww6q8.js:3505019-3505039 sole-consumer
var weakSet_6; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:3505019", () => {
  weakSet_6 = new WeakSet();
});
//@ chunk-e6aww6q8.js:3505039-3505549 sole-consumer
/**
 * 收集某事件的钩子：仅托管时只取策略钩子；否则取设置钩子（可排除托管），加上会话钩子与函数钩子，最后按暂扣状态过滤。
 */
function collectEventHooks(context, hookEvent, sessionIds, skipSessionHooks) {
  if (skipSessionHooks?.managedHooksOnly) {
    if (getSettingsForSource("policySettings")?.disableAllHooks === true) return [];
    return getManagedHooksForEvent(sessionIds);
  }
  let settingsHooks = getHooksForEvent(sessionIds, {
    withoutCheckoutHooks: shouldOmitCheckoutSessionEndHooks(sessionIds),
  });
  let hooks = skipSessionHooks?.managedHooksExcluded
    ? excludeManagedHooks(settingsHooks, sessionIds)
    : [...settingsHooks];
  let sessionIds_2 = typeof hookEvent === "string" ? [hookEvent] : hookEvent;
  if (context === undefined) return filterHooksByManagedHold(hooks, sessionIds, skipSessionHooks?.held);
  let skipSessionHooks_2 = shouldSkipSessionHooksByPolicy();
  for (let sessionId of sessionIds_2) {
    let groups = context.get(sessionId, sessionIds).get(sessionIds);
    if (groups) {
      let kept = filterSessionHookMatchers(groups, skipSessionHooks_2);
      for (let group of kept) for (let hook of group.hooks) weakSet_6.add(hook);
      hooks.push(...kept);
    }
  }
  let sessionId = sessionIds_2[0];
  if (sessionId !== undefined && !skipSessionHooks_2) {
    let functionHooks = context.getFunctionHooks(sessionId, sessionIds).get(sessionIds);
    if (functionHooks) hooks.push(...functionHooks);
  }
  return filterHooksByManagedHold(hooks, sessionIds, skipSessionHooks?.held);
}
//@ chunk-e6aww6q8.js:3505608-3506011 facade-exports
/**
 * 计算 UserPromptSubmit 钩子集合的指纹键（托管层与全部钩子序列化，函数按宿主分配稳定编号）；没有钩子返回空串。用于判断钩子是否变化。
 */
function userPromptSubmitHooksKey(context) {
  let grouped = groupBySource.of(context.session.host);
  function tokenOf(token) {
    let storedToken = grouped.tokens.get(token);
    if (storedToken === undefined) {
      grouped.next += 1;
      storedToken = grouped.next;
      grouped.tokens.set(token, storedToken);
    }
    return storedToken;
  }
  let registration = registerAgent(context, "UserPromptSubmit", context.session.id);
  let eventHooks = collectEventHooks(
    context.sessionHooksRegistry,
    registration,
    "UserPromptSubmit",
    MANAGED_HOOKS_TIER,
  );
  let eventHooks_2 = collectEventHooks(context.sessionHooksRegistry, registration, "UserPromptSubmit");
  return eventHooks.length + eventHooks_2.length === 0
    ? ""
    : JSON.stringify([eventHooks, eventHooks_2], (snapshot, key) =>
        typeof key === "function" ? `function#${grouped.host}:${tokenOf(key)}` : key,
      );
}
//@ chunk-e6aww6q8.js:3506011-3506082 facade-exports
/**
 * 判断某事件是否有钩子：设置中有、存在函数钩子、或有待补跑（owed）的钩子。
 */
function hasHookForEvent(sessionHooksRegistry, hookEvent, sessionIds) {
  return (
    hasSettingsHookForEvent(sessionHooksRegistry, hookEvent, sessionIds) ||
    hasClassicHookSite(sessionHooksRegistry) ||
    getPluginHookRunner()?.owedList(sessionHooksRegistry) !== undefined
  );
}
//@ chunk-e6aww6q8.js:3506082-3506132 facade-exports
/**
 * 判断某事件是否有需要实际运行的钩子（有钩子且不全被跳过）。
 */
function hasHookToRun(hookEvent, sessionHooksRegistry, sessionIds) {
  return (
    hasHookForEvent(hookEvent, sessionHooksRegistry, sessionIds) &&
    !skipsEmptyDispatch(hookEvent, sessionHooksRegistry, sessionIds)
  );
}
//@ chunk-e6aww6q8.js:3506132-3506178 layout
function skipsEmptyDispatch(sessionHooks, sessionHooks_2, sessionIds) {
  return (
    canSkipEmptyDispatch(sessionHooks) && !hasSettingsHookForEvent(sessionHooks, sessionHooks_2, sessionIds)
  );
}
//@ chunk-e6aww6q8.js:3506178-3506301 layout
function canSkipEmptyDispatch(hookEvent, mark = false) {
  return (
    !isTerminalShutdown() &&
    (canSkipEmptyClassicDispatch(hookEvent) ||
      (mark && !env.CLAUDE_CODE_DISABLE_EMPTY_CLASSIC_DISPATCH_SKIP && !hasClassicHookSite(hookEvent))) &&
    managedTierHooks(hookEvent) === "none"
  );
}
//@ chunk-e6aww6q8.js:3506301-3506760 facade-exports
/**
 * 判断某事件是否只有调用方自己的回调钩子要运行（无远程调用、无 owed 钩子、无项目设置钩子，且全部钩子都是本进程回调或来自 flag 设置）；判断出错时记错误并返回 false。用于走快速路径。
 */
function hasOnlyOwnCallbacksToRun(
  hookEvent,
  sessionHooksRegistry,
  sessionHooksRegistry_2,
  sessionIds,
  mark = false,
) {
  try {
    let pending;
    return (
      sessionIds?.remoteCall === undefined &&
      !isAttachServeMode() &&
      getPluginHookRunner()?.owedList(hookEvent) === undefined &&
      !getPluginHookRunner()?.settingsHooks("projectSettings", hookEvent).length &&
      canSkipEmptyDispatch(hookEvent, true) &&
      collectEventHooks(sessionHooksRegistry, sessionHooksRegistry_2, hookEvent, {
        held: "included",
      }).every(
        (group) =>
          group.hooks.every((hook) =>
            isInternalHook({
              hook,
            }),
          ) ||
          (mark &&
            (pending ??= new Set(
              getFlagSettingsExpectedContent() === undefined &&
                getFlagSettingsFilePinnedContent() !== undefined &&
                getFlagSettingsInline()?.hooks === undefined
                ? getSettingsForSource("flagSettings")?.hooks?.[hookEvent]?.map((hook) =>
                    stableStringifySafe(hook),
                  )
                : [],
            )).has(stableStringifySafe(group))),
      )
    );
  } catch (error) {
    logForDebugging(`Could not tell whose hooks are on ${hookEvent}: ${errorMessage(error)}`, {
      level: "error",
    });
    return false;
  }
}
//@ chunk-e6aww6q8.js:3506760-3507106 facade-exports
/**
 * 判断一次工具调用对某事件是否没有任何要跑的钩子（只有自身回调且没有匹配该工具的钩子）；出错返回 false。
 */
function hasNoHookForToolCall(hookEvent, toolName, toolInput, sessionIds) {
  try {
    let sessionHooksRegistry = sessionIds.sessionHooksRegistry;
    let registration = registerAgent(sessionIds, hookEvent, sessionIds.session.id);
    return (
      hasOnlyOwnCallbacksToRun(hookEvent, sessionHooksRegistry, registration, sessionIds) &&
      !hasToolHookMatching({
        hookEvent,
        toolName,
        toolInput,
        tools: sessionIds.options.tools,
        toolAliases: sessionIds.getAppState().toolPermissionContext.toolAliases,
        sessionHooks: sessionHooksRegistry,
        sessionId: registration,
      })
    );
  } catch (error) {
    logForDebugging(`Could not tell whether a ${hookEvent} hook matches: ${errorMessage(error)}`, {
      level: "error",
    });
    return false;
  }
}
//@ chunk-e6aww6q8.js:3507106-3507244 layout
function matcherMatchesInput(suffix, toolName, toolInput, hookInput, toolAliases) {
  let hookEventName = hookInput.hook_event_name;
  return (
    toolName === undefined ||
    !suffix ||
    matchesPattern(
      toolName,
      stripModelContextSuffix(hookEventName, suffix),
      HOOK_EVENTS_WITH_MATCHER.has(hookEventName),
      toolAliases,
      toolInput,
      "tool_input" in hookInput ? hookInput.tool_input : undefined,
    )
  );
}
//@ chunk-e6aww6q8.js:3507244-3507522 layout
function markOwnToolHooks(entries) {
  let keyOf = (entry) => hookDedupKey(entry, getHookDedupPayload(entry.hook) ?? "");
  let byKey = Map.groupBy(
    entries.filter((entry) => entry.hook.type === "command"),
    keyOf,
  );
  return entries.map((entry) => {
    let sameKey = entry.hook.type === "command" ? byKey.get(keyOf(entry)) : undefined;
    return sameKey?.some((other) => other.asOwnTool)
      ? {
          ...entry,
          asOwnTool: true,
          asStandIn: sameKey.some((other) => other.asStandIn ?? !other.asOwnTool),
        }
      : entry;
  });
}
//@ chunk-e6aww6q8.js:3507522-3507892 layout
/**
 * 插件自有工具调用时，把钩子输入中的工具名换成插件看到的名字（PostToolBatch 逐个替换），返回新输入与工具。
 */
function resolveOwnToolHookInput(hookInput) {
  let ownTool = getPluginHookRunner()?.ownTool;
  if (ownTool === undefined) return;
  if (hookInput.hook_event_name === "PostToolBatch")
    return {
      hookInput: {
        ...hookInput,
        tool_calls: hookInput.tool_calls.map((toolCall) => ({
          ...toolCall,
          tool_name: ownTool(toolCall.tool_name)?.name ?? toolCall.tool_name,
        })),
      },
      tools: [],
    };
  let tool = "tool_name" in hookInput ? ownTool(hookInput.tool_name) : undefined;
  return tool === undefined || !("tool_name" in hookInput)
    ? undefined
    : {
        hookInput: {
          ...hookInput,
          tool_name: tool.name,
          mcp_server: undefined,
        },
        tools: [tool],
      };
}
//@ chunk-e6aww6q8.js:3507892-3507973 facade-exports
/**
 * 判断是否有匹配该工具调用的钩子；判定中遇到无法确定的特定错误时保守返回 true。
 */
function hasToolHookMatching(toolName) {
  try {
    return hasMatchingToolHooks(toolName);
  } catch (error) {
    if (error instanceof MatcherUnsupportableError) return true;
    throw error;
  }
}
//@ chunk-e6aww6q8.js:3507973-3508547 layout
/**
 * 判断是否有钩子匹配该工具调用：有经典调度或欠运行钩子时直接为真；否则按 matcher 匹配工具名、MCP 前缀变体或插件自有工具名，可排除仅内部回调的钩子。
 */
function hasMatchingToolHooks({
  hookEvent,
  toolName,
  toolInput,
  tools,
  toolAliases,
  sessionHooks,
  sessionId,
  exceptInternal = false,
  held = "included",
}) {
  if (
    held !== "only" &&
    (dispatchClassicEvent(hookEvent) ||
      getPluginHookRunner()?.owedList(hookEvent, undefined, true) !== undefined)
  )
    return true;
  let hasMatcher = HOOK_EVENTS_WITH_MATCHER.has(hookEvent);
  let pluginTool = getPluginHookRunner()?.ownTool(toolName);
  return collectEventHooks(sessionHooks, sessionId, hookEvent, {
    held,
  }).some((entry) => {
    if (exceptInternal && !entry.hooks.some((hook) => !(hook.type === "callback" && hook.internal === true)))
      return false;
    if (!entry.matcher) return true;
    let matcher = stripModelContextSuffix(hookEvent, entry.matcher);
    return (
      matchesPattern(toolName, matcher, hasMatcher, toolAliases, tools, toolInput) ||
      getMcpPrefix(
        toolName,
        matcher,
        hookEvent === "PreToolUse" || hookEvent === "PermissionRequest" ? toolInput : undefined,
      ).some((name) => matchesPattern(name, matcher, hasMatcher, toolAliases)) ||
      (pluginTool !== undefined &&
        getHookOriginLabel(entry) !== undefined &&
        matchesPattern(pluginTool.name, matcher, hasMatcher, toolAliases, [pluginTool], toolInput))
    );
  });
}
//@ chunk-e6aww6q8.js:3508547-3508855 facade-exports
/**
 * 判断设置层面某事件是否配置了钩子：依次看合并后的设置钩子、（非受限时）另一来源钩子、策略钩子、插件/注册钩子、owed 钩子，最后看会话钩子注册表。
 */
function hasSettingsHookForEvent(hookEvent, sessionIds, sessionHooksRegistry, matcher = true) {
  let snapshotHooks = getHooksConfigFromSnapshot()?.[hookEvent];
  if (snapshotHooks && snapshotHooks.length > 0) return true;
  if (!shouldAllowManagedHooksOnly()) {
    let agentHooks = getMainThreadAgentHooks()?.[hookEvent];
    if (agentHooks && agentHooks.length > 0) return true;
  }
  let registeredHooks = getRegisteredHooks()?.[hookEvent];
  if (registeredHooks && registeredHooks.length > 0) return true;
  if (
    getPluginSettingsHooks(hookEvent).length > 0 ||
    (matcher && getPluginHookRunner()?.owedList(hookEvent, undefined, true) !== undefined)
  )
    return true;
  if (sessionIds === undefined) return false;
  return (typeof sessionHooksRegistry === "string" ? [sessionHooksRegistry] : sessionHooksRegistry).some(
    (group) => sessionIds.has(group, hookEvent),
  );
}
//@ chunk-e6aww6q8.js:3508855-3509042 layout
function checkHookIfConditionSafely(condition) {
  try {
    return condition();
  } catch (error) {
    if (!isDiskless() || !isNoProjectDirectoryError(error)) throw error;
    return `A hook's "if" condition names a file path, which can't be checked because this session has no working directory.`;
  }
}
//@ chunk-e6aww6q8.js:3509042-3515613 fingerprint = getMatchingHooks (0.58)
/**
 * 取某事件匹配的钩子：汇总快照/插件/会话/SDK 来源的 matcher，按 matcher 匹配 matchQuery（工具名、别名、MCP 名），附加来源信息，按类型去重（同命令只跑一次，settings 优先），再按 if 条件（权限规则语法）过滤；SessionStart/Setup 不支持 http 钩子。
 */
async function getMatchingHooks(sessionHooks, sessionId, hookEvent, hookInput, tools, options) {
  let matcherCount = 0;
  try {
    let eventHooks = collectEventHooks(sessionHooks, sessionId, hookEvent, options);
    matcherCount = eventHooks.length;
    options?.onPluginMatchersRead?.(eventHooks.filter((eventHook) => "pluginRoot" in eventHook));
    let matchQuery = hookMatchQuery(hookInput);
    let settingsHookSets = {
      settings: new Set((getHooksConfigFromSnapshot()?.[hookEvent] ?? []).flatMap((group) => group.hooks)),
      checkout: new Set(
        eventHooks.flatMap((eventHook) =>
          "checkout" in eventHook && eventHook.checkout === true ? eventHook.hooks : [],
        ),
      ),
    };
    for (let eventHook of eventHooks) warnBareMcpServerMatcher(hookEvent, eventHook.matcher);
    logForDebugging(`Getting matching hook commands for ${hookEvent} with query: ${matchQuery}`, {
      level: "verbose",
    });
    logForDebugging(`Found ${eventHooks.length} hook matchers in settings`, {
      level: "verbose",
    });
    let toolAliases = options?.getToolAliases?.();
    let ownToolHookInput = resolveOwnToolHookInput(hookInput);
    let untestableMatchers = new Map();
    let matcherMatches = (eventHook, toolName, tools) => {
      try {
        return matcherMatchesInput(eventHook.matcher, toolName, tools, hookInput, toolAliases);
      } catch (error) {
        if (!(error instanceof MatcherUnsupportableError)) throw error;
        if (getHookOriginLabel(eventHook)?.settingsSource !== "projectSettings")
          untestableMatchers.set(eventHook, error.message);
        return true;
      }
    };
    let seenEventHooks = new Set(
      ownToolHookInput === undefined
        ? []
        : eventHooks.filter(
            (eventHook) =>
              getHookOriginLabel(eventHook) !== undefined &&
              matcherMatches(eventHook, hookMatchQuery(ownToolHookInput.hookInput), ownToolHookInput.tools),
          ),
    );
    let isMarked = (eventHook) =>
      ownToolHookInput === undefined || getHookOriginLabel(eventHook)?.settingsSource !== "projectSettings";
    let seenMatchers = new Set(
      eventHooks.filter(
        (eventHook) =>
          isMarked(eventHook) &&
          matchQuery !== undefined &&
          getMcpPrefix(matchQuery, eventHook.matcher, getHookToolInput(hookInput)).some((eventHook_2) =>
            matcherMatches(eventHook, eventHook_2, undefined),
          ) &&
          !seenEventHooks.has(eventHook) &&
          !matcherMatches(eventHook, matchQuery, tools),
      ),
    );
    let filtered = eventHooks.filter(
      (eventHook) =>
        seenEventHooks.has(eventHook) ||
        seenMatchers.has(eventHook) ||
        (isMarked(eventHook) && matcherMatches(eventHook, matchQuery, tools)),
    );
    let tool =
      tools !== undefined && matchQuery !== undefined ? findToolByName(tools, matchQuery) : undefined;
    let familyOnly = isCliOwnedMcpTool(tool) && tool?.hookMatcherFamilyNames !== undefined ? tool : undefined;
    let seenMatchers_2 = new Set([
      ...seenMatchers,
      ...(familyOnly !== undefined
        ? filtered.filter((matcher) => {
            try {
              return !matcherMatchesInput(matcher.matcher, matchQuery, undefined, hookInput, toolAliases);
            } catch (error) {
              if (!(error instanceof MatcherUnsupportableError)) throw error;
              return true;
            }
          })
        : []),
    ]);
    let seenHooks = new Set((getMainThreadAgentHooks()?.[hookEvent] ?? []).flatMap((group) => group.hooks));
    let matchedHooks = filtered.flatMap((matcher) => {
      let pluginRoot = "pluginRoot" in matcher ? matcher.pluginRoot : undefined;
      let pluginId = "pluginId" in matcher ? matcher.pluginId : undefined;
      let pluginName = "pluginRoot" in matcher ? matcher.pluginName : undefined;
      let skillRoot = "skillRoot" in matcher ? matcher.skillRoot : undefined;
      let settingsSource = "settingsSource" in matcher ? matcher.settingsSource : undefined;
      let projectRoot =
        "projectRoot" in matcher &&
        typeof matcher.projectRoot === "string" &&
        !("pluginRoot" in matcher) &&
        !("skillRoot" in matcher) &&
        !("deviceOwner" in matcher) &&
        !("origin" in matcher)
          ? matcher.projectRoot
          : undefined;
      let hookSource = pluginRoot
        ? "pluginName" in matcher
          ? `plugin:${matcher.pluginName}`
          : "plugin"
        : skillRoot
          ? "skillName" in matcher
            ? `skill:${matcher.skillName}`
            : "skill"
          : "settings";
      let matcherIsMatchAll = !matcher.matcher || matcher.matcher === "*" || matcher.matcher === ".*";
      let deviceOwned = isDeviceOwnedHook(matcher);
      let sdkHost = "origin" in matcher && matcher.origin === "sdkHost";
      let hostOwnsStdin = "hostOwnsStdin" in matcher && matcher.hostOwnsStdin === true;
      let personal = "personal" in matcher && matcher.personal === true;
      return matcher.hooks.map((hook) => ({
        hook,
        pluginRoot,
        pluginId,
        pluginName,
        skillRoot,
        ...(settingsSource !== undefined && {
          settingsSource,
        }),
        ...(projectRoot !== undefined && {
          projectRoot,
        }),
        hookSource,
        ...((weakSet_6.has(hook) || seenHooks.has(hook)) && {
          registeredInSession: true,
        }),
        matcherIsMatchAll,
        ...(options?.recordMatchers && {
          matcherTexts: [matcher.matcher ?? ""],
        }),
        ...(deviceOwned && {
          deviceForwarded: deviceOwned,
        }),
        ...(sdkHost && {
          sdkHost,
        }),
        ...(hostOwnsStdin && {
          hostOwnsStdin,
        }),
        ...(personal && {
          personal,
        }),
        ...(seenEventHooks.has(matcher) && {
          asOwnTool: true,
          asStandIn:
            getHookOriginLabel(matcher)?.settingsSource !== "projectSettings" &&
            matcherMatches(matcher, matchQuery, tools),
        }),
        ...(untestableMatchers.has(matcher) && {
          notTested: untestableMatchers.get(matcher),
        }),
        ...(seenMatchers_2.has(matcher) && {
          throughFamilyOnly: true,
        }),
        ...(seenMatchers.has(matcher) && {
          matcherMetThroughOtherName: true,
        }),
      }));
    });
    let ownToolNames = new Set(
      matchedHooks.flatMap((matchedHook) => {
        let matchedTool =
          matchedHook.throughFamilyOnly === true ? undefined : getHookIdentityKey(matchedHook);
        return matchedTool === undefined ? [] : [matchedTool];
      }),
    );
    let ownToolHooks =
      seenMatchers_2.size === 0
        ? matchedHooks
        : matchedHooks.map((matchedHook) => {
            let matchedOwnTool =
              matchedHook.throughFamilyOnly === true ? getHookIdentityKey(matchedHook) : undefined;
            return matchedOwnTool !== undefined && ownToolNames.has(matchedOwnTool)
              ? {
                  ...matchedHook,
                  throughFamilyOnly: undefined,
                  matcherMetThroughOtherName: undefined,
                }
              : matchedHook;
          });
    let inHttpServe = dropHooksInHttpServe(
      seenEventHooks.size === 0 ? ownToolHooks : markOwnToolHooks(ownToolHooks),
      hookEvent,
    );
    let copyThatApplies = getPluginHookRunner()?.copyThatApplies;
    let untestableMatchers_2 =
      copyThatApplies === undefined
        ? inHttpServe
        : inHttpServe.flatMap((eventHook) => {
            if (eventHook.hook.type !== "command" || eventHook.settingsSource !== "projectSettings")
              return [eventHook];
            let copy = copyThatApplies(eventHook.hook, hookInput);
            return copy === undefined
              ? []
              : [
                  {
                    ...eventHook,
                    hook: copy,
                  },
                ];
          });
    let flushTestable = () => {
      let quietErrand = blocksWhenItCannotRunElsewhere(hookEvent) && isQuietHopcroftGateOn();
      let getIfCondition = ({ hook, notTested }) => {
        let dropIfCannotRun = !(hook.type === "command" && isAsyncHookJSONOutput(hook));
        if (notTested === undefined) return dropIfCannotRun ? 3 : 1;
        return quietErrand && dropIfCannotRun ? 2 : 0;
      };
      return untestableMatchers_2.toSorted((left, right) => getIfCondition(left) - getIfCondition(right));
    };
    let orderedHooks = untestableMatchers.size === 0 ? untestableMatchers_2 : flushTestable();
    if (orderedHooks.every((hook) => hook.hook.type === "callback" || hook.hook.type === "function"))
      return orderedHooks;
    let ifCondition = (hook) => hook.if ?? "";
    let snapshotHooks = dedupeHooksPreferSettings(
      orderedHooks
        .filter((orderedHook) => orderedHook.hook.type === "command")
        .map((orderedHook) => [
          hookDedupKey(orderedHook, getHookDedupPayload(orderedHook.hook) ?? ""),
          orderedHook,
        ]),
      hookEvent,
      settingsHookSets,
    );
    let dedupeKey = (orderedHook) =>
      hookDedupKey(orderedHook, `${orderedHook.hook.prompt}\x00${ifCondition(orderedHook.hook)}`);
    let pluginHooks = dedupeHooksPreferSettings(
      orderedHooks
        .filter((orderedHook) => orderedHook.hook.type === "prompt")
        .map((orderedHook) => [dedupeKey(orderedHook), orderedHook]),
      hookEvent,
      settingsHookSets,
    );
    let agentHooks = dedupeHooksPreferSettings(
      orderedHooks
        .filter((orderedHook) => orderedHook.hook.type === "agent")
        .map((orderedHook) => [dedupeKey(orderedHook), orderedHook]),
      hookEvent,
      settingsHookSets,
    );
    let registeredHooks = dedupeHooksPreferSettings(
      orderedHooks
        .filter((orderedHook) => orderedHook.hook.type === "http")
        .map((orderedHook) => [
          hookDedupKey(orderedHook, getHookDedupPayload(orderedHook.hook) ?? ""),
          orderedHook,
        ]),
      hookEvent,
      settingsHookSets,
    );
    let deviceHooks = dedupeHooksPreferSettings(
      orderedHooks
        .filter((orderedHook) => orderedHook.hook.type === "mcp_tool")
        .map((orderedHook) => [
          hookDedupKey(orderedHook, getHookDedupPayload(orderedHook.hook) ?? ""),
          orderedHook,
        ]),
      hookEvent,
      settingsHookSets,
    );
    let functionHooks = dedupeHooksPreferSettings(
      orderedHooks
        .filter((orderedHook) => orderedHook.hook.type === "script")
        .map((orderedHook) => [
          hookDedupKey(orderedHook, getHookDedupPayload(orderedHook.hook) ?? ""),
          orderedHook,
        ]),
      hookEvent,
      settingsHookSets,
    );
    let callbackHooks = orderedHooks.filter((orderedHook) => orderedHook.hook.type === "callback");
    let functionHooks_2 = orderedHooks.filter((orderedHook) => orderedHook.hook.type === "function");
    let recordMatcher = (entry) => {
      if (options?.recordMatchers !== true) return entry;
      try {
        let matcherTexts = uniq(
          orderedHooks
            .filter(
              (orderedHook) =>
                orderedHook.pluginRoot === entry.pluginRoot &&
                orderedHook.skillRoot === entry.skillRoot &&
                isSameHook(orderedHook.hook, entry.hook),
            )
            .flatMap((orderedHook) => orderedHook.matcherTexts ?? []),
        );
        let described =
          entry.pluginRoot === undefined && entry.skillRoot === undefined
            ? findSettingsHookDefinition(entry.hook, hookEvent, matcherTexts, options.ownSources ?? [])
            : undefined;
        return {
          ...entry,
          matcherTexts,
          hook: described ?? entry.hook,
        };
      } catch (error) {
        logForDebugging(
          `Hooks: could not establish whose settings define a hook (${errorMessage(error)}); treating it as the project's`,
        );
        return {
          ...entry,
          matcherTexts: [],
        };
      }
    };
    let dedupedHooks = [
      ...snapshotHooks.map(recordMatcher),
      ...pluginHooks,
      ...agentHooks,
      ...registeredHooks.map(recordMatcher),
      ...deviceHooks.map(recordMatcher),
      ...functionHooks.map(recordMatcher),
      ...callbackHooks,
      ...functionHooks_2,
    ];
    let hasIfCondition = dedupedHooks.some(
      (dedupedHook) =>
        (dedupedHook.hook.type === "command" ||
          dedupedHook.hook.type === "prompt" ||
          dedupedHook.hook.type === "agent" ||
          dedupedHook.hook.type === "http" ||
          dedupedHook.hook.type === "mcp_tool" ||
          dedupedHook.hook.type === "script") &&
        dedupedHook.hook.if,
    );
    let ifMatcher = hasIfCondition ? await createIfConditionMatcher(hookInput, tools) : undefined;
    let dedupeKey_2 =
      hasIfCondition && ownToolHookInput
        ? await createIfConditionMatcher(ownToolHookInput.hookInput, ownToolHookInput.tools, true)
        : undefined;
    let flattened = dedupedHooks.flatMap((dedupedHook) => {
      if (
        dedupedHook.hook.type !== "command" &&
        dedupedHook.hook.type !== "prompt" &&
        dedupedHook.hook.type !== "agent" &&
        dedupedHook.hook.type !== "http" &&
        dedupedHook.hook.type !== "mcp_tool" &&
        dedupedHook.hook.type !== "script"
      )
        return [dedupedHook];
      let ifCondition = dedupedHook.hook.if;
      if (!ifCondition) return [dedupedHook];
      if (!ifMatcher) {
        logForDebugging(
          `Hook if condition "${ifCondition}" cannot be evaluated for non-tool event ${hookInput.hook_event_name}`,
        );
        return [];
      }
      let hasOrigin = dedupedHook.hook.type === "command" && getHookOriginLabel(dedupedHook) !== undefined;
      if (dedupedHook.asOwnTool && dedupeKey_2?.(ifCondition, true)) return [dedupedHook];
      let testResult = checkHookIfConditionSafely(
        () => (!dedupedHook.asOwnTool || dedupedHook.asStandIn === true) && ifMatcher(ifCondition, hasOrigin),
      );
      if (typeof testResult === "string")
        return [
          {
            ...dedupedHook,
            notTested: testResult,
          },
        ];
      if (testResult) {
        let entry = dedupedHook.asOwnTool
          ? {
              ...dedupedHook,
              asOwnTool: false,
            }
          : dedupedHook;
        let toolName = permissionRuleValueFromString(ifCondition).toolName;
        if (
          dedupedHook.matcherMetThroughOtherName === true &&
          toolName === matchQuery &&
          monitorCommandAsBash(matchQuery, getHookToolInput(hookInput)) !== undefined
        ) {
          logForDebugging(
            `Skipping hook: its if condition "${ifCondition}" names Monitor, and its matcher met the call only through Bash`,
          );
          return [];
        }
        if (
          matchQuery !== undefined &&
          hookMatchQueries(matchQuery, getHookToolInput(hookInput)).includes(toolName)
        )
          return [
            {
              ...entry,
              throughFamilyOnly: true,
            },
          ];
        return [
          familyOnly === undefined
            ? entry
            : toolName === matchQuery
              ? {
                  ...entry,
                  throughFamilyOnly: undefined,
                }
              : {
                  ...entry,
                  throughFamilyOnly: true,
                },
        ];
      }
      logForDebugging(`Skipping hook due to if condition "${ifCondition}" not matching`);
      return [];
    });
    let finalHooks =
      hookEvent === "SessionStart" || hookEvent === "Setup"
        ? flattened.filter((hook) => {
            if (hook.hook.type === "http") {
              logForDebugging(
                `Skipping HTTP hook ${hook.hook.url} \u2014 HTTP hooks are not supported for ${hookEvent}`,
              );
              return false;
            }
            return true;
          })
        : flattened;
    let internalCount = count(finalHooks, isInternalHook);
    logForDebugging(
      `Matched ${finalHooks.length - internalCount} unique hooks for query "${matchQuery ?? "no match query"}" (${orderedHooks.length - internalCount} before deduplication)`,
      {
        level: "verbose",
      },
    );
    markHookOwnership(finalHooks, hookEvent, options?.managedHooksOnly === true);
    return finalHooks;
  } catch (error) {
    if (matcherCount > 0 || mergeClients_3(error)) throw error;
    logForDebugging(`Failed to resolve matching hooks for ${hookEvent}: ${errorMessage(error)}`, {
      level: "error",
    });
    if (!options?.suppressTelemetry) logFeatureBad(hookFeature(hookEvent), "hook_match_failed");
    return [];
  }
}
//@ chunk-e6aww6q8.js:3515613-3515668 facade-exports = getTeammateIdleHookMessage (0.511)
/**
 * 生成 Stop 钩子阻断后发给模型的反馈消息。旧版名 getTeammateIdleHookMessage 与本函数对调了。
 */
function getStopHookMessage(blockingError) {
  return hookFeedbackText("Stop", scrubHookOutputTags(blockingError.blockingError));
}
//@ chunk-e6aww6q8.js:3515668-3515731 facade-exports
/**
 * 生成 TeammateIdle 钩子阻断后发给队友的反馈消息。旧版名 getStopHookMessage 与本函数对调了。
 */
function getTeammateIdleHookMessage(blockingError) {
  return hookFeedbackText("TeammateIdle", scrubHookOutputTags(blockingError.blockingError));
}
//@ chunk-e6aww6q8.js:3515731-3515793 facade-exports = getTaskCreatedHookMessage (0.47)
/**
 * 生成 TaskCreated 钩子阻断消息。
 */
function getTaskCreatedHookMessage(blockingError) {
  return hookFeedbackText("TaskCreated", scrubHookOutputTags(blockingError.blockingError));
}
//@ chunk-e6aww6q8.js:3515793-3515857 facade-exports = getTaskCompletedHookMessage (0.477)
/**
 * 生成 TaskCompleted 钩子阻断消息。
 */
function getTaskCompletedHookMessage(blockingError) {
  return hookFeedbackText("TaskCompleted", scrubHookOutputTags(blockingError.blockingError));
}
//@ chunk-e6aww6q8.js:3515857-3516023 facade-exports
/**
 * 把阻断错误包装为 hook_non_blocking_error 附件消息（exit 2）。
 */
function getNonBlockableHookErrorMessage(hook, blockingError, hookName = hook) {
  return createAttachmentMessage_2({
    type: "hook_non_blocking_error",
    hookName,
    toolUseID: randomUUID(),
    hookEvent: hook,
    stderr: blockingError.blockingError,
    stdout: "",
    exitCode: 2,
    command: blockingError.command,
  });
}
//@ chunk-e6aww6q8.js:3516023-3516110 facade-exports = getUserPromptSubmitHookBlockingMessage (1)
/**
 * UserPromptSubmit 阻断消息：「UserPromptSubmit operation blocked by hook: …」。
 */
function getUserPromptSubmitHookBlockingMessage(blockingError) {
  return `UserPromptSubmit operation blocked by hook:
${blockingError.blockingError}`;
}
//@ chunk-e6aww6q8.js:3516110-3516194 sole-consumer
function firstSpawnFailureSurfaced(hookEvent, displayCommand) {
  let surfacedHookSpawnFailures = getSurfacedHookSpawnFailures();
  let key = `${hookEvent}:${displayCommand}`;
  if (surfacedHookSpawnFailures.has(key)) return false;
  surfacedHookSpawnFailures.add(key);
  return true;
}
//@ chunk-e6aww6q8.js:3516194-3516248 sole-consumer
function hookTelemetryName(hookEvent, matchQuery) {
  return matchQuery
    ? concatSafe(fromEnum(hookEvent), lit_2(":"), shortHash(matchQuery))
    : fromEnum(hookEvent);
}
//@ chunk-e6aww6q8.js:3516248-3516372 sole-consumer
var HOLD_UNTIL_EXIT_EVENTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:3516248", () => {
  HOLD_UNTIL_EXIT_EVENTS = new Set([
    "PreToolUse",
    "PermissionRequest",
    "UserPromptSubmit",
    "UserPromptExpansion",
    "TaskCompleted",
    "TeammateIdle",
  ]);
});
//@ chunk-e6aww6q8.js:3516433-3517403 facade-exports
/**
 * 钩子执行总入口（异步生成器）：先等待被"暂扣"的钩子来源就绪；非 PreToolUse 且可以批处理、且不只是自身回调时走批量路径，否则逐个执行匹配的钩子，逐条 yield 结果。
 */
async function* executeHooks(options) {
  let { hookInput } = options;
  let managedOnly = options.managedHooksOnly
    ? undefined
    : maybeWaitForHookPolicy(
        hookInput.hook_event_name,
        () => {
          let sessionHooksRegistry = options.toolUseContext?.sessionHooksRegistry ?? options.sessionHooks;
          let registration = registerAgent(
            options.toolUseContext,
            hookInput.hook_event_name,
            options.session.id,
          );
          return "tool_name" in hookInput
            ? hasToolHookMatching({
                hookEvent: hookInput.hook_event_name,
                toolName: hookInput.tool_name,
                toolInput: hookInput.tool_input,
                tools: options.toolUseContext?.options.tools,
                toolAliases: options.toolUseContext?.options.toolAliases,
                sessionHooks: sessionHooksRegistry,
                sessionId: registration,
                held: "only",
              })
            : collectEventHooks(sessionHooksRegistry, registration, hookInput.hook_event_name, {
                held: "only",
              }).length > 0;
        },
        options.signal,
      );
  if (managedOnly !== undefined) await managedOnly;
  if (
    !options.classicChainMember &&
    !options.managedHooksOnly &&
    !options.sessionFunctionHooksOnly &&
    hookInput.hook_event_name !== "PreToolUse" &&
    isClassicHooked(hookInput.hook_event_name) &&
    !skipsEmptyDispatch(
      hookInput.hook_event_name,
      options.toolUseContext?.sessionHooksRegistry ?? options.sessionHooks,
      registerAgent(options.toolUseContext, hookInput.hook_event_name, options.session.id),
    ) &&
    !hasOnlyOwnCallbacksToRun(
      hookInput.hook_event_name,
      options.toolUseContext?.sessionHooksRegistry ?? options.sessionHooks,
      registerAgent(options.toolUseContext, hookInput.hook_event_name, options.session.id),
      options.toolUseContext,
    )
  ) {
    yield* runFunctionHookChain(options, hookInput);
    return;
  }
  yield* runClassicHooksHoldingExit(options);
}
//@ chunk-e6aww6q8.js:3517403-3517915 layout
/**
 * 经插件函数钩子链执行经典钩子：链中每环调用经典钩子执行（输入未变时沿用扩展输入），并对结果去掉受限审批、按观察上下文过滤。
 */
async function* runFunctionHookChain(options, hookInput) {
  let extendedKey = options.extendedHookInput === undefined ? undefined : stableStringifySafe(hookInput);
  let chainLabel = `classic.${hookInput.hook_event_name} function-hook chain`;
  for await (let event of runClassicEventThroughHooks({
    event: hookInput.hook_event_name,
    hookInput: {
      ...hookInput,
    },
    managedRanAbove: options.managedHooksExcluded === true,
    signal: options.signal ?? options.toolUseContext?.abortController.signal,
    origin: options.toolUseContext?.hookOrigin,
    runClassicHooks: (hookInput, options_2) =>
      runClassicHooksHoldingExit({
        ...options,
        hookInput,
        extendedHookInput:
          extendedKey !== undefined && stableStringifySafe(hookInput) === extendedKey
            ? options.extendedHookInput
            : undefined,
        ...options_2,
        classicChainMember: true,
      }),
  }))
    yield* keptForObservationContext(
      options,
      stripConfinedHookApproval(event, chainLabel, hookInput, options.toolUseContext),
    );
}
//@ chunk-e6aww6q8.js:3517915-3518177 layout
async function* runClassicHooksHoldingExit(input) {
  let holding = () => isTerminalShutdown() && !input.signal?.aborted;
  if (!HOLD_UNTIL_EXIT_EVENTS.has(input.hookInput.hook_event_name)) {
    if (holding()) return;
    yield* runClassicHooks(input);
    return;
  }
  if (holding()) await heldUntilExit();
  try {
    for await (let result of runClassicHooks(input)) {
      if (holding()) await heldUntilExit();
      yield result;
    }
  } catch (error) {
    if (holding()) await heldUntilExit();
    throw error;
  }
  if (holding()) await heldUntilExit();
}
//@ chunk-e6aww6q8.js:3518177-3518386 layout
async function* runClassicHooks(call) {
  let { hookInput, toolUseContext } = call;
  for await (let result of executeHooks_2(call)) {
    if (toolUseContext?.remoteCall !== undefined && hookInput.hook_event_name === "PreToolUse")
      resolveHookPermissionResult(toolUseContext.remoteCall, `PreToolUse:${hookInput.tool_name}`, result);
    yield* keptForObservationContext(call, result);
  }
}
//@ chunk-e6aww6q8.js:3518386-3519367 facade-exports
/**
 * 在代理上下文中只保留钩子结果里影响控制流的字段（权限行为、更新输入、阻止继续、改写输出等，PreToolUse 才带 blockingError），其余（如附加上下文）丢弃；非代理上下文原样 yield。
 */
function* keptForObservationContext(call, result) {
  if (
    !isDelegatedObservationContext(call.agentContext) &&
    !isDelegatedObservationContext(call.toolUseContext?.agentContext)
  ) {
    yield result;
    return;
  }
  let isPreToolUse = call.hookInput.hook_event_name === "PreToolUse";
  let layer = {
    ...(result.permissionBehavior !== undefined && {
      permissionBehavior: result.permissionBehavior,
    }),
    ...(result.hookPermissionDecisionReason !== undefined && {
      hookPermissionDecisionReason: result.hookPermissionDecisionReason,
    }),
    ...(result.heldForServedCall && {
      heldForServedCall: true,
    }),
    ...(result.updatedInput !== undefined && {
      updatedInput: result.updatedInput,
    }),
    ...(result.preventContinuation !== undefined && {
      preventContinuation: result.preventContinuation,
    }),
    ...(result.stopReason !== undefined && {
      stopReason: result.stopReason,
    }),
    ...(result.impossible !== undefined && {
      impossible: result.impossible,
    }),
    ...(result.hookSource !== undefined && {
      hookSource: result.hookSource,
    }),
    ...(result.hookPluginId !== undefined && {
      hookPluginId: result.hookPluginId,
    }),
    ...(result.updatedToolOutput !== undefined && {
      updatedToolOutput: result.updatedToolOutput,
    }),
    ...(result.updatedMCPToolOutput !== undefined && {
      updatedMCPToolOutput: result.updatedMCPToolOutput,
    }),
    ...(isPreToolUse &&
      result.blockingError !== undefined && {
        blockingError: result.blockingError,
      }),
  };
  if (Object.keys(layer).length > 0) yield layer;
}
//@ chunk-e6aww6q8.js:3519367-3521232 facade-exports
/**
 * 剥掉不允许的钩子批准：受限会话、Projects 会话里的 WebFetch/WebSearch、托管桌面工具、自动模式下的高风险工具、CCR 云端浏览器调用，钩子返回的 allow 一律作废并记日志；PermissionRequest 的 updatedPermissions 会被收紧，并在 Cowork 云会话等场景丢掉 setMode。
 */
function stripConfinedHookApproval(result, permissionRequest, hookInput, toolUseContext) {
  let toolNameField = getToolNameField(hookInput);
  let confinedGranted = settingsGrantsConfined()
    ? "a confined session takes grants only from its command line"
    : toolNameField !== undefined && isWebToolRestrictedInRelay(toolNameField)
      ? `hooks cannot approve ${toolNameField} in a Projects session`
      : isComputerUseTool(
            "mcp_server" in hookInput && hookInput.mcp_server
              ? {
                  serverName: hookInput.mcp_server.name,
                }
              : mcpInfoFromString(toolNameField ?? ""),
          )
        ? "hooks cannot approve a hosted session's desktop tools"
        : undefined;
  let permissionRequestResult = result.permissionRequestResult;
  if (permissionRequestResult?.behavior === "allow" && permissionRequestResult.updatedPermissions) {
    let filtered = filterPermissionUpdatePayload(
      permissionRequestResult.updatedPermissions,
      toolUseContext && getToolPermissionContext(toolUseContext),
    );
    if (filtered !== permissionRequestResult.updatedPermissions) {
      logForDebugging(
        `${permissionRequest} PermissionRequest allow: changed its updates so they cannot loosen WebFetch or WebSearch rules; hooks cannot grant those tools in a Projects session`,
      );
      permissionRequestResult.updatedPermissions = filtered;
    }
    let filteredBrowser = filterRemoteBrowserAllowUpdates(
      permissionRequestResult.updatedPermissions,
      toolUseContext && getToolPermissionContext(toolUseContext),
    );
    if (filteredBrowser !== permissionRequestResult.updatedPermissions) {
      logForDebugging(
        `${permissionRequest} PermissionRequest allow: changed its updates so they cannot loosen the rules for CCR's cloud browser; hooks cannot grant its tools`,
      );
      permissionRequestResult.updatedPermissions = filteredBrowser;
    }
    if (
      (isCoworkAny() || hasMcpToolAliases()) &&
      permissionRequestResult.updatedPermissions.some(
        (updatedPermission) => updatedPermission.type === "setMode",
      )
    ) {
      logEvent("tengu_permission_request_set_mode_ignored", {});
      logForDebugging(
        `${permissionRequest} PermissionRequest allow: dropped its setMode. A hook's answer cannot set the mode in a Cowork cloud session or where an MCP tool is declared as code-running.`,
      );
      permissionRequestResult.updatedPermissions = permissionRequestResult.updatedPermissions.filter(
        (updatedPermission) => updatedPermission.type !== "setMode",
      );
    }
  }
  if (
    confinedGranted === undefined &&
    permissionRequestResult?.behavior === "allow" &&
    toolNameField !== undefined
  ) {
    let tool = toolUseContext && findToolByName(toolUseContext.options.tools, toolNameField);
    let permissionContext = toolUseContext && getToolPermissionContext(toolUseContext);
    if (
      requiresClassifierForHookAllow(
        tool ?? {
          name: toolNameField,
        },
      ) &&
      (permissionContext === undefined ||
        isAutoClassifierActive(isAutoAllowedInMode(tool, permissionContext)))
    ) {
      logEvent("tengu_auto_mode_permission_request_allow_ignored", {});
      confinedGranted = `while auto mode is on (also behind plan mode) a hook cannot approve ${toolNameField}`;
    } else if (
      isRemoteBrowserToolUnderModeFloor(
        tool ?? {
          name: toolNameField,
        },
      )
    )
      confinedGranted = `a hook cannot approve ${toolNameField}, a call to CCR's cloud browser`;
  }
  if (confinedGranted === undefined) return result;
  if (result.permissionBehavior === "allow") {
    logForDebugging(`${permissionRequest} permissionDecision=allow ignored: ${confinedGranted}`);
    result.permissionBehavior = undefined;
  }
  if (result.permissionRequestResult?.behavior === "allow") {
    logForDebugging(`${permissionRequest} PermissionRequest allow ignored: ${confinedGranted}`);
    result.permissionRequestResult = undefined;
  }
  return result;
}
//@ chunk-e6aww6q8.js:3521232-3557798 fingerprint = executeHooks (0.484)
/**
 * REPL 内钩子执行主体（异步生成器）：信任检查 → getMatchingHooks → 按类型分发（callback/function/prompt/agent/http/mcp_tool/command/script），并行执行（有槽位限制），逐个产出 message、blockingError、permissionBehavior、additionalContexts、updatedInput、updatedToolOutput 等；汇总 deny>defer>ask>allow，记 tengu_run_hook/tengu_repl_hook_finished 与 OTel。
 */
async function* executeHooks_2({
  session,
  hookInput,
  extendedHookInput,
  toolUseID,
  matchQuery,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  toolUseContext,
  sessionHooks,
  messages,
  forceSyncExecution,
  suppressPerInvocationTelemetry,
  managedHooksOnly,
  skipSessionFunctionHooks,
  sessionFunctionHooksOnly,
  managedHooksExcluded,
  newPluginsOnly,
  onMatched,
  envFileSessionId,
  launcherHookEnv,
  storageV5,
  credentials,
  agentContext,
}) {
  let hookEvent = hookInput.hook_event_name;
  let hookDisplayName = matchQuery ? `${hookEvent}:${matchQuery}` : hookEvent;
  let effectiveStorageV5 = toolUseContext?.storageV5 ?? storageV5;
  let effectiveCredentials = toolUseContext?.credentials ?? credentials;
  if (shouldSkipHookDueToTrust()) {
    logForDebugging(`Skipping ${hookDisplayName} hook execution - workspace trust not accepted`);
    return;
  }
  let sessionHooks_2 = toolUseContext ? toolUseContext.sessionHooksRegistry : sessionHooks;
  let boundRequestPrompt = toolUseContext?.getAppState();
  let isServedCall = toolUseContext?.remoteCall !== undefined;
  let hooksSessionId = registerAgent(toolUseContext, hookEvent, session.id);
  let servedHookEnv =
    toolUseContext?.remoteCall !== undefined &&
    collectEventHooks(sessionHooks_2, hooksSessionId, hookEvent, {
      managedHooksOnly,
    }).length > 0
      ? await buildServedCallHookEnv(toolUseContext.remoteCall, toolUseContext.storageV5, boundRequestPrompt)
      : undefined;
  let servedOwnSources =
    isServedCall || !isAttachServeMode() ? undefined : await getServedSessionOwnSources(effectiveStorageV5);
  let owed = getPluginHookRunner()?.owedList(hookEvent, hookInput);
  if (owed !== undefined) await awaitWithHookTimeout(owed, hookEvent, signal, timeoutMs);
  let copiedAsk = managedHooksOnly ? undefined : getPluginHookRunner()?.whichCopyAsk?.(hookEvent, hookInput);
  if (copiedAsk !== undefined) await awaitWithHookTimeout(copiedAsk, hookEvent, signal, timeoutMs);
  let newOwed = [];
  let matchedHooksFiltered;
  let matchedHooksRaw;
  try {
    matchedHooksRaw = await getMatchingHooks(
      sessionHooks_2,
      hooksSessionId,
      hookEvent,
      hookInput,
      toolUseContext?.options?.tools,
      {
        managedHooksOnly,
        managedHooksExcluded,
        getToolAliases: () => boundRequestPrompt?.toolPermissionContext.toolAliases,
        suppressTelemetry: suppressPerInvocationTelemetry,
        recordMatchers: isServedCall || servedOwnSources !== undefined,
        ...(servedHookEnv !== undefined && {
          ownSources: servedHookEnv.ownSources,
        }),
        ...(servedOwnSources !== undefined && {
          ownSources: servedOwnSources.ownSources,
        }),
        ...((onMatched || newPluginsOnly) && {
          onPluginMatchersRead: (matchers) => {
            newOwed = newPluginsOnly?.owed(matchers) ?? matchers;
          },
        }),
      },
    );
    matchedHooksFiltered =
      servedOwnSources === undefined
        ? matchedHooksRaw
        : await filterWithheldFolderHooks(matchedHooksRaw, hookEvent, servedOwnSources);
  } catch (error) {
    if (!suppressPerInvocationTelemetry) logHookMatchingFailure(hookEvent, error);
    let blockingResult = blockingErrorResult(
      hookEvent,
      hookDisplayName,
      hookResolutionFaultMessage(hookEvent, isServedCall ? undefined : error),
    );
    if (blockingResult !== undefined) {
      yield blockingResult;
      return;
    }
    if (matchedHooksRaw !== undefined) throw error;
    matchedHooksFiltered = [];
  }
  let filtered = matchedHooksFiltered.filter((hook) => {
    let canRun = !isServedCall || canRunForServedCall(hook);
    if (!canRun && (hook.hook.type === "agent" || hook.hook.type === "prompt"))
      logForDebugging(`Hooks: ${hook.hook.type} hook skipped for a call served to a cloud session`);
    return canRun;
  });
  let group = sessionFunctionHooksOnly
    ? filtered.filter((group) => group.hook.type === "function")
    : skipSessionFunctionHooks
      ? filtered.filter((group) => group.hook.type !== "function")
      : filtered;
  let isStartupOrResume =
    hookInput.hook_event_name === "SessionStart" &&
    (hookInput.source === "startup" || hookInput.source === "resume");
  let mapped = (
    newPluginsOnly
      ? group.filter((group) =>
          newPluginsOnly.repoHooks
            ? group.settingsSource === "projectSettings"
            : group.pluginName !== undefined && newOwed.some((item) => item.pluginId === group.pluginId),
        )
      : group
  ).map((group) =>
    isStartupOrResume && group.settingsSource === "projectSettings" && group.hook.type === "command"
      ? {
          ...group,
          hook: {
            ...group.hook,
            async: true,
            asyncRewake: false,
          },
        }
      : group,
  );
  onMatched?.(newOwed, mapped.length);
  if (mapped.length === 0) return;
  if (signal?.aborted) return;
  let hookNameForTelemetry = hookTelemetryName(hookEvent, matchQuery);
  let userHooks = mapped.filter((hook) => !isInternalHook(hook) || hook.notTested !== undefined);
  if (userHooks.length > 0) {
    if (!suppressPerInvocationTelemetry) {
      let pluginHookCounts = countHooksByPlugin(userHooks);
      let hookTypeCounts = countByPluginKey(userHooks);
      let byType = countHooksByType(userHooks);
      let internalCount = count(userHooks, (hook) => hook.matcherIsMatchAll);
      logEvent("tengu_run_hook", {
        hookName: hookNameForTelemetry,
        numCommands: userHooks.length,
        numMatchAllMatchers: internalCount,
        numSpecificMatchers: userHooks.length - internalCount,
        hookTypeCounts: hashEntries(byType),
        ...(pluginHookCounts && {
          pluginHookCounts: hashEntries(pluginHookCounts),
        }),
        ...(hookTypeCounts && {
          pluginHookCountsByHash: hookTypeCounts,
        }),
      });
    }
  } else {
    let batchStartTime = Date.now();
    let succeeded = 0;
    let toolUseContext_2 = toolUseContext
      ? {
          getAppState: toolUseContext.getAppState,
          applyAttributionOp: toolUseContext.applyAttributionOp,
          session: toolUseContext.session,
          storageV5: toolUseContext.storageV5,
        }
      : undefined;
    for (let [index, hook] of mapped.entries()) {
      let { hook: hook_2 } = hook;
      if (hook_2.type !== "callback") continue;
      let answer = await hook_2.callback(
        matchedToolNameInput(hook, hookInput) ?? hookInput,
        toolUseID,
        signal,
        index,
        toolUseContext_2,
      );
      if (isSyncHookJSONOutput_2(answer) || Object.keys(answer).length === 0) continue;
      let processed = processHookJSONOutput({
        json: answer,
        command: "callback",
        hookName: `${hookEvent}:Callback`,
        toolUseID,
        hookEvent,
        expectedHookEvent: hookEvent,
        stdout: undefined,
        stderr: undefined,
        exitCode: undefined,
      });
      if (processed.permissionBehavior === "deny") {
        succeeded++;
        logForDebugging(
          `Hook ${hookEvent} (${getHookStatusText(hook_2)}) returned permissionDecision: deny${processed.hookPermissionDecisionReason ? ` (reason: ${processed.hookPermissionDecisionReason})` : ""}`,
        );
        yield {
          permissionBehavior: "deny",
          hookPermissionDecisionReason: processed.hookPermissionDecisionReason,
          hookSource: hook.hookSource,
        };
      }
      if (processed.additionalContext)
        yield {
          additionalContexts: [
            await persistLargeHookOutput(
              processed.additionalContext,
              `${toolUseID}-${index}`,
              "additionalContext",
              {
                storageV5: effectiveStorageV5,
              },
            ),
          ],
        };
      if (processed.systemMessage)
        yield {
          message: createAttachmentMessage_2({
            type: "hook_system_message",
            content: await persistLargeHookOutput(
              processed.systemMessage,
              `${toolUseID}-${index}`,
              "systemMessage",
              {
                storageV5: effectiveStorageV5,
              },
            ),
            hookName: hookDisplayName,
            toolUseID,
            hookEvent,
          }),
        };
    }
    let totalDurationMs = Date.now() - batchStartTime;
    getStatsStore()?.observe("hook_duration_ms", totalDurationMs);
    logEvent("tengu_repl_hook_finished", {
      hookName: hookNameForTelemetry,
      numCommands: mapped.length,
      numSuccess: mapped.length - succeeded,
      numBlocking: succeeded,
      numNonBlockingError: 0,
      numCancelled: 0,
      totalDurationMs,
    });
    return;
  }
  let tracing = isBetaTracingEnabled() && isToolDetailsLoggingEnabled();
  let hookDefinitionsJson =
    tracing || isPerfettoTracingEnabled() ? jsonStringify(getHookDefinitionsForTelemetry(mapped)) : "[]";
  let hookNameForTelemetry_2 = getHookNameForTelemetry(hookEvent, matchQuery);
  let agentContext_2 = toolUseContext?.agentContext ?? agentContext ?? mainAgentContext();
  if (!suppressPerInvocationTelemetry)
    logOTelEvent(
      "hook_execution_start",
      {
        hook_event: hookEvent,
        hook_name: hookNameForTelemetry_2,
        num_hooks: String(mapped.length),
        managed_only: String(shouldAllowManagedHooksOnlyByPolicy()),
        hook_source: shouldAllowManagedHooksOnlyByPolicy() ? "policySettings" : "merged",
        safe_mode: String(isSafeMode()),
        ...(tracing && {
          hook_definitions: hookDefinitionsJson,
        }),
      },
      agentContext_2,
    );
  let span = suppressPerInvocationTelemetry
    ? undefined
    : startHookSpan(hookEvent, hookNameForTelemetry_2, mapped.length, hookDefinitionsJson, agentContext_2);
  let byPlugin = new Map(userHooks.map((userHook, hookIndex) => [userHook.hook, hookIndex]));
  using runningHooks = suppressPerInvocationTelemetry
    ? undefined
    : trackRunningHooks({
        hookEvent,
        hooks: userHooks.map(({ hook }) => getHookProgressDisplay(hook)),
        agentId: toolUseContext?.agentId,
        toolName: getToolNameField(hookInput),
      });
  for (let { hook } of userHooks)
    yield {
      message: {
        type: "progress",
        data: {
          type: "hook_progress",
          hookEvent,
          hookName: hookDisplayName,
          command: getHookStatusText(hook),
          ...(hook.type === "prompt" && {
            promptText: escapeControlCharsForDisplay(hook.prompt),
          }),
          ...("statusMessage" in hook &&
            hook.statusMessage != null && {
              statusMessage: escapeControlCharsForDisplay(hook.statusMessage),
            }),
        },
        parentToolUseID: toolUseID,
        toolUseID,
        timestamp: new Date().toISOString(),
        uuid: randomUUID(),
      },
    };
  let batchStartTime = Date.now();
  let cacheElsewhere = {};
  let cacheBase = {};
  let inputFailureReason;
  function stringifyHookInputCached(pluginId, asOwnTool = false, stdinWriter, inputOverride) {
    let cache = stdinWriter === undefined ? cacheElsewhere : cacheBase;
    let cacheKind = inputOverride !== undefined ? "asBash" : asOwnTool ? "elsewhere" : "base";
    let cached = cache[cacheKind];
    if (cached !== undefined) return cached;
    let oversized = false;
    let result;
    try {
      let value =
        inputOverride ?? ((asOwnTool && resolveOwnToolHookInput(hookInput)?.hookInput) || hookInput);
      let written = stdinWriter && writeRemoteHookInput(stdinWriter, value);
      let json = written ?? jsonStringify(value);
      oversized = isOversizedHookInput(hookEvent, json);
      if (oversized) throw RangeError("Hook input is over the size limit");
      result = {
        ok: true,
        value: json,
        sent: written,
      };
    } catch (error) {
      inputFailureReason = oversized ? "hook_input_too_large" : "hook_input_stringify_failed";
      logError(
        withTelemetryMessage(
          Error(`Failed to stringify hook ${hookDisplayName} input`, {
            cause: error,
          }),
          "Failed to stringify hook input",
        ),
      );
      result = {
        ok: false,
        error,
      };
    }
    cache[cacheKind] = result;
    return result;
  }
  function getHookInputJson(entry, useStdin) {
    if (isCcsTenant() && hasHookEligibility(entry.hook))
      return {
        ok: true,
        value: "",
        sent: undefined,
      };
    let isPromptOrigin = getHookOriginLabel(entry) !== undefined && entry.hook.type === "prompt";
    let input = matchedToolNameInput(entry, hookInput);
    let result = stringifyHookInputCached(
      entry.pluginId,
      entry.asOwnTool,
      useStdin || isPromptOrigin ? getPluginHookRunner()?.stdin : undefined,
      input,
    );
    if (isPromptOrigin && result.ok && result.sent === undefined) {
      inputFailureReason = "hook_input_stringify_failed";
      return {
        ok: false,
        error: Error("not written"),
      };
    }
    return result;
  }
  let controlStreamClosedError;
  let ownSettingsHooks = new Set();
  let notRunHooks = new Set();
  let hadSchemaInvalidOutput = false;
  let hadSchemaInvalidBlock = false;
  let hookPromises = mapped.map((entry) =>
    pluginHookRefusal(getHookOriginLabel(entry), hookEvent, entry.hook),
  );
  let runs = mapped.map(async function* (
    { hook, pluginRoot, pluginId, skillRoot, settingsSource, matcherTexts, sdkHost, asOwnTool, notTested },
    hookIndex,
  ) {
    let hookOriginLabel = getHookOriginLabel({
      pluginId,
      settingsSource,
    });
    let refusal = hookPromises[hookIndex] ?? pluginHookRefusal(hookOriginLabel, hookEvent, hook);
    let holdReason = refusal ?? notTested;
    if (holdReason !== undefined) {
      notRunHooks.add(hook);
      yield {
        ...describeKillSwitchedHook(
          hookEvent,
          hookDisplayName,
          holdReason,
          pluginId,
          blocksWhenItCannotRunElsewhere(hookEvent) &&
            (refusal !== undefined ||
              !(
                hook.type === "command" &&
                isAsyncHookJSONOutput(hook, forceSyncExecution === true || isServedCall)
              )),
        ),
        hook,
      };
      return;
    }
    let hookIndex_2 = hookIndex + (newPluginsOnly?.envFileIndexBase ?? 0);
    let isPersonalRestricted = isPersonalRestrictedHook(mapped[hookIndex], hookEvent);
    if (pluginId)
      recordPluginActivity(pluginId, "hook", {
        kind: "hook",
        name: hookEvent,
      });
    if (isServedCall && (hook.type === "agent" || hook.type === "prompt")) {
      yield holdModelHookForServedCall(hook, hookEvent);
      return;
    }
    let pinnedProgram;
    if (
      isServedCall &&
      (hook.type === "command" || hook.type === "http" || hook.type === "mcp_tool" || hook.type === "script")
    ) {
      let judgement = await judgeHookForServedCall(
        {
          hook,
          pluginRoot,
          pluginId,
          skillRoot,
          matcherTexts,
        },
        hookEvent,
        servedHookEnv,
      ).catch((error) => {
        logForDebugging(
          `Hooks: could not judge a hook for a served call (${errorMessage(error)}); holding it`,
        );
        return {
          held: "unreadable",
        };
      });
      if (judgement.held !== undefined) {
        let remoteCall = toolUseContext?.remoteCall;
        let unavailableNote;
        yield (hook.type === "command" && hookEvent === "PreToolUse" && remoteCall !== undefined
          ? await pinHookCommand({
              hook,
              held: judgement.held,
              fromSettingsFile: pluginRoot === undefined && skillRoot === undefined,
              matcherTexts: matcherTexts ?? [],
              reach: remoteCall.reach,
              readableDirs: [
                ...toolUseContext.getAppState().toolPermissionContext.additionalWorkingDirectories.keys(),
              ],
              readRules: toolUseContext.getAppState().toolPermissionContext,
              environment: servedHookEnv.env,
              home: servedHookEnv.home,
              shellPrefix: servedHookEnv.shellPrefix,
              signal,
              onOutcome: remoteCall.onProjectHook,
              onUnavailable: (note) => {
                unavailableNote = note;
              },
              exec: async (target) => {
                let inputResult = stringifyHookInputCached(
                  pluginId,
                  false,
                  undefined,
                  matchedToolNameInput(mapped[hookIndex], hookInput),
                );
                if (!inputResult.ok) throw inputResult.error;
                let result = await execCommandHook(
                  target.hook,
                  hookEvent,
                  hookDisplayName,
                  inputResult.value,
                  undefined,
                  claudeEnvContextFrom(hookInput),
                  getSessionProject(session),
                  target.cwd,
                  target.signal,
                  randomUUID(),
                  hookIndex_2,
                  undefined,
                  undefined,
                  undefined,
                  undefined,
                  true,
                  undefined,
                  {
                    base: target.base,
                    omit: [],
                    shellPrefix: undefined,
                  },
                  undefined,
                  undefined,
                  effectiveStorageV5,
                  effectiveCredentials,
                  target.wrap,
                );
                let hookOutput = parseHookOutput(result.stdout);
                let untrustedCaptureReason = getUntrustedCaptureReason(
                  result,
                  hookEvent,
                  result.stdout,
                  hookOutput.json,
                  (text) => parseHookOutput(text).json,
                );
                return {
                  ...result,
                  parsed:
                    untrustedCaptureReason !== undefined
                      ? {
                          validationError: untrustedCaptureReason,
                        }
                      : hookOutput,
                };
              },
            }).catch((error) => {
              logForDebugging(
                `Hooks: could not run a project hook in the sandbox for a served call (${errorMessage(error)}); holding it`,
              );
              return;
            })
          : undefined) ??
          holdHookForServedCall(hook, hookEvent, judgement.held, judgement.cause, unavailableNote);
        return;
      }
      pinnedProgram = judgement.program;
      if (
        pluginRoot === undefined &&
        skillRoot === undefined &&
        !isNotFromOwnSettings(hook, hookEvent, matcherTexts ?? [], servedHookEnv.ownSources)
      )
        ownSettingsHooks.add(hook);
    }
    if (hook.type === "callback") {
      let timeoutMs_2 = hook.timeout ? hook.timeout * 1000 : timeoutMs;
      let { signal: abortSignal, cleanup } = createCombinedAbortSignal(signal, {
        timeoutMs: timeoutMs_2,
      });
      try {
        yield await executeHookCallback({
          toolUseID,
          hook,
          hookEvent,
          hookInput: matchedToolNameInput(mapped[hookIndex], hookInput) ?? hookInput,
          signal: abortSignal,
          hookIndex: hookIndex_2,
          toolUseContext,
        }).finally(cleanup);
      } catch (error) {
        if (error instanceof StreamClosedAbortError) {
          controlStreamClosedError = error;
          logForDebugging(
            `${hookEvent} SDK callback hook cancelled (control stream closed); draining sibling hooks`,
          );
          yield {
            outcome: "cancelled",
            hook,
          };
          return;
        }
        let timedOut = abortSignal.aborted && !signal?.aborted;
        if (
          timedOut &&
          sdkHost === true &&
          (hookEvent === "Stop" || hookEvent === "SubagentStop" || hookEvent === "SessionStart")
        ) {
          logForDebugging(
            `SDK host ${hookEvent} callback hook timed out after ${timeoutMs_2}ms; continuing without its answer`,
          );
          logEvent("tengu_sdk_hook_callback_timeout", {
            hookEvent: fromEnum(hookEvent),
          });
          let inSubagent =
            hookEvent === "SubagentStop" ||
            [agentContext, toolUseContext?.agentContext].some(
              (context) =>
                context !== undefined &&
                context.agentType !== "main" &&
                !(isSubagentContext(context) && context.isMainSession === true),
            );
          yield {
            outcome: "cancelled",
            hook,
            ...(!inSubagent &&
              takeSdkHostOutOfReachNote() && {
                message: createAttachmentMessage_2({
                  type: "hook_system_message",
                  content: hostNoResponseMessage(hookEvent),
                  hookName: hookDisplayName,
                  toolUseID,
                  hookEvent,
                }),
              }),
          };
          return;
        }
        if ((hookEvent !== "UserPromptSubmit" && hookEvent !== "UserPromptExpansion") || !timedOut)
          throw error;
        logForDebugging(
          `${hookDisplayName} callback hook timed out; swallowed rejection: ${errorMessage(error)}`,
        );
        logEvent("tengu_sdk_hook_callback_timeout", {
          hookEvent: fromEnum(hookEvent),
        });
        yield {
          blockingError: {
            blockingError: `${hookDisplayName} hook callback timed out after ${timeoutMs_2}ms`,
            command: getHookDisplayText(hook),
            ...promptEndingFields(hookEvent, {
              noVerdict: "callback_timed_out",
            }),
          },
          suppressOriginalPrompt: true,
          outcome: "blocking",
          hook,
        };
      }
      return;
    }
    if (hook.type === "function") {
      if (!messages) {
        yield {
          message: createAttachmentMessage_2({
            type: "hook_error_during_execution",
            hookName: hookDisplayName,
            toolUseID,
            hookEvent,
            content: "Messages not provided for function hook",
          }),
          outcome: "non_blocking_error",
          hook,
        };
        return;
      }
      yield executeFunctionHook({
        hook,
        messages,
        hookName: hookDisplayName,
        toolUseID,
        hookEvent,
        timeoutMs,
        signal,
      });
      return;
    }
    let pluginHookRunner = getPluginHookRunner();
    let needsReady =
      hook.type === "command" && hookOriginLabel !== undefined && pluginHookRunner !== undefined;
    if (needsReady)
      await pluginHookRunner.ready(
        hookEvent,
        signal,
        isAsyncHookJSONOutput(hook, forceSyncExecution === true || isServedCall),
      );
    let hookTimeoutMs_2 = hook.timeout
      ? Math.min(
          isConsultHook(hook) ? hookTimeoutMs(hook, timeoutMs) : hook.timeout * 1000,
          MAX_TIMER_DELAY_MS,
        )
      : timeoutMs;
    let asyncPlugins = needsReady && !isAsyncHookJSONOutput(hook);
    let { signal: abortSignal, cleanup } = createCombinedAbortSignal(signal, {
      timeoutMs: asyncPlugins ? undefined : hookTimeoutMs_2,
    });
    if (abortSignal.aborted && isConsultHook(hook)) {
      yield {
        outcome: "cancelled",
        hook,
      };
      return;
    }
    let hookId = randomUUID();
    let hookStartMs = Date.now();
    let hookCommand = getHookStatusText(hook);
    let pluginBase = pluginRoot ?? skillRoot;
    let hookDisplayText = getHookDisplayText(hook);
    let displayCommand =
      pluginBase && (hook.type === "command" || (hook.type === "script" && hook.file !== undefined))
        ? hookDisplayText.replace(
            hook.type === "command" && hook.args === undefined
              ? /\$\{CLAUDE_PLUGIN_ROOT\}|\$CLAUDE_PLUGIN_ROOT\b/g
              : /\$\{CLAUDE_PLUGIN_ROOT\}/g,
            () => pluginBase,
          )
        : hookDisplayText;
    let pluginNote =
      pluginId && !isServedCall
        ? `
This hook comes from the ${pluginId} plugin.`
        : "";
    let ranScript = false;
    let exitedTwo = false;
    try {
      let hookInputJson = getHookInputJson(mapped[hookIndex], needsReady);
      if (!hookInputJson.ok) {
        cleanup();
        let command = isServedCall ? `${hook.type} hook` : displayCommand;
        let guardResult = blockingErrorResult(
          hookEvent,
          command,
          `[${command}]: ${unserializableInputBlockMessage(isServedCall ? undefined : hookInputJson.error)}${pluginNote}`,
        );
        yield guardResult !== undefined
          ? {
              ...guardResult,
              outcome: "blocking",
              hook,
            }
          : (guardScriptHookBlock(
              hook,
              hookEvent,
              isServedCall ? "script hook" : displayCommand,
              isServedCall
                ? "hook input could not be prepared"
                : `hook input: ${errorMessage(hookInputJson.error)}`,
            ) ?? {
              message: createAttachmentMessage_2({
                type: "hook_error_during_execution",
                hookName: hookDisplayName,
                toolUseID,
                hookEvent,
                content: `Failed to prepare hook input: ${errorMessage(hookInputJson.error)}`,
                command: hookCommand,
                durationMs: Date.now() - hookStartMs,
              }),
              outcome: "non_blocking_error",
              hook,
            });
        return;
      }
      let jsonInput = hookInputJson.value;
      if (hook.type === "prompt") {
        if (!toolUseContext)
          throw Error(
            `prompt-type hooks are not supported for ${hookEvent} events (no conversation context is available). Use a command-type hook instead.`,
          );
        if (toolUseContext.agentId?.startsWith(HOOK_AGENT_ID_PREFIX)) {
          cleanup();
          yield {
            message: createAttachmentMessage_2({
              type: "hook_cancelled",
              hookName: hookDisplayName,
              toolUseID,
              hookEvent,
            }),
            outcome: "cancelled",
            hook,
          };
          return;
        }
        let promptResult = await execPromptHook(
          hook,
          hookDisplayName,
          hookEvent,
          jsonInput,
          abortSignal,
          toolUseContext,
          messages,
          toolUseID,
          hookTimeoutMs_2,
        );
        if (promptResult.message?.type === "attachment") {
          let att = promptResult.message.attachment;
          if (att.type === "hook_success" || att.type === "hook_non_blocking_error") {
            att.command = hookCommand;
            att.durationMs = Date.now() - hookStartMs;
          }
        }
        yield promptResult;
        cleanup?.();
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
          cleanup();
          yield {
            message: createAttachmentMessage_2({
              type: "hook_cancelled",
              hookName: hookDisplayName,
              toolUseID,
              hookEvent,
            }),
            outcome: "cancelled",
            hook,
          };
          return;
        }
        let agentResult = await execAgentHook(
          hook,
          hookDisplayName,
          hookEvent,
          jsonInput,
          abortSignal,
          toolUseContext,
          toolUseID,
          "agent_type" in hookInput ? hookInput.agent_type : undefined,
        );
        if (agentResult.message?.type === "attachment") {
          let att = agentResult.message.attachment;
          if (att.type === "hook_success" || att.type === "hook_non_blocking_error") {
            att.command = hookCommand;
            att.durationMs = Date.now() - hookStartMs;
          }
        }
        yield agentResult;
        cleanup?.();
        return;
      }
      if (hook.type === "http") {
        emitHookStarted(hookId, hookDisplayName, hookEvent);
        let httpResult = await execHttpHook(
          hook,
          hookEvent,
          jsonInput,
          signal,
          timeoutMs,
          servedHookEnv && mergeHookEnv(servedHookEnv.env),
          servedHookEnv ? undefined : getManagedHttpHookEnv(hook),
        );
        cleanup?.();
        if (httpResult.aborted) {
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: "Hook cancelled",
            stdout: "",
            stderr: "",
            exitCode: undefined,
            outcome: "cancelled",
          });
          yield {
            message: createAttachmentMessage_2({
              type: "hook_cancelled",
              hookName: hookDisplayName,
              toolUseID,
              hookEvent,
              command: hookCommand,
              timedOut: !signal?.aborted,
              timeoutMs: hook.timeout ? hook.timeout * 1000 : timeoutMs,
            }),
            outcome: "cancelled",
            hook,
          };
          return;
        }
        let withheldDiskless = httpResult.withheld === true && isDiskless();
        if (withheldDiskless && hookEvent === "PermissionRequest") {
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: httpResult.error ?? "",
            stdout: "",
            stderr: httpResult.error ?? "",
            exitCode: undefined,
            outcome: "error",
          });
          yield denyPermissionRequestHookInCloud(hook);
          return;
        }
        if (withheldDiskless && hookEvent === "PreToolUse") {
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: "The PreToolUse HTTP hook can't run in this cloud session, so this tool call is refused.",
            stdout: "",
            stderr:
              httpResult.error ??
              "The PreToolUse HTTP hook can't run in this cloud session, so this tool call is refused.",
            exitCode: 2,
            outcome: "error",
          });
          yield {
            blockingError: {
              blockingError:
                "The PreToolUse HTTP hook can't run in this cloud session, so this tool call is refused.",
              command: displayCommand,
            },
            outcome: "blocking",
            hook,
          };
          return;
        }
        if (isWithheldGuardHttpHook(httpResult, hookEvent)) {
          let unreachableMessage = httpHookUnreachableMessage(hookEvent, httpResult.error);
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: unreachableMessage,
            stdout: "",
            stderr: unreachableMessage,
            exitCode: 2,
            outcome: "error",
          });
          yield {
            blockingError: {
              blockingError: unreachableMessage,
              command: hook.url,
            },
            suppressOriginalPrompt: true,
            ...(hookEvent === "PermissionRequest" && {
              permissionRequestResult: {
                behavior: "deny",
                message: unreachableMessage,
              },
            }),
            outcome: "blocking",
            hook,
          };
          return;
        }
        if (httpResult.error || !httpResult.ok) {
          let stderr = httpResult.error || `HTTP ${httpResult.statusCode} from ${hook.url}`;
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: stderr,
            stdout: "",
            stderr,
            exitCode: httpResult.statusCode,
            outcome: "error",
          });
          yield {
            message: createAttachmentMessage_2({
              type: "hook_non_blocking_error",
              hookName: hookDisplayName,
              toolUseID,
              hookEvent,
              stderr,
              stdout: "",
              exitCode: httpResult.statusCode ?? 0,
            }),
            outcome: "non_blocking_error",
            hook,
          };
          return;
        }
        let { json, validationError } = parseHttpHookOutput(httpResult.body);
        if (validationError) {
          hadSchemaInvalidOutput = true;
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: httpResult.body,
            stdout: httpResult.body,
            stderr: validationError,
            exitCode: httpResult.statusCode,
            outcome: "error",
          });
          yield {
            message: createAttachmentMessage_2({
              type: "hook_non_blocking_error",
              hookName: hookDisplayName,
              toolUseID,
              hookEvent,
              stderr: validationError,
              stdout: httpResult.body,
              exitCode: httpResult.statusCode ?? 0,
            }),
            outcome: "non_blocking_error",
            hook,
          };
          return;
        }
        if (json && isSyncHookJSONOutput_2(json)) {
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: httpResult.body,
            stdout: httpResult.body,
            stderr: "",
            exitCode: httpResult.statusCode,
            outcome: "success",
          });
          yield {
            outcome: "success",
            hook,
          };
          return;
        }
        if (json) {
          let processed = processHookJSONOutput({
            json: isPersonalRestricted
              ? restrictPersonalHookAnswer(
                  json,
                  matchedToolNameInput(mapped[hookIndex], hookInput) ?? hookInput,
                )
              : json,
            command: hook.url,
            hookName: hookDisplayName,
            toolUseID,
            hookEvent,
            expectedHookEvent: hookEvent,
            stdout: httpResult.body,
            stderr: "",
            exitCode: httpResult.statusCode,
          });
          emitHookMetrics(json.metrics, pluginId, hookEvent, agentContext_2);
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: httpResult.body,
            stdout: httpResult.body,
            stderr: "",
            exitCode: httpResult.statusCode,
            outcome: "success",
          });
          yield {
            ...processed,
            outcome: "success",
            hook,
          };
          return;
        }
        return;
      }
      if (hook.type === "mcp_tool") {
        emitHookStarted(hookId, hookDisplayName, hookEvent);
        let mcpResult = await runMcpToolHook(
          hook,
          hookEvent,
          matchedToolNameInput(mapped[hookIndex], hookInput) ?? hookInput,
          isServedCall ? undefined : toolUseContext?.options.mcpClients,
          signal,
          timeoutMs,
          isServedCall || toolUseContext === undefined
            ? undefined
            : subagentMemoryMode(toolUseContext.session.host),
        );
        cleanup?.();
        let servedRefusal =
          isServedCall && hookEvent === "PreToolUse"
            ? mcpResult.aborted
              ? signal?.aborted
                ? undefined
                : "timed out"
              : mcpResult.error !== undefined && mcpResult.body === ""
                ? "could not be run"
                : !mcpResult.ok
                  ? "returned an error"
                  : undefined
            : undefined;
        if (servedRefusal !== undefined) {
          let refusalText = `a PreToolUse mcp_tool hook ${servedRefusal}, so this call was not run`;
          logForDebugging(
            `Hooks: served-call mcp_tool gate (${hook.server}/${hook.tool}) refused (${servedRefusal})${mcpResult.error ? ` \u2014 ${mcpResult.error}` : ""}`,
            {
              level: "warn",
            },
          );
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: refusalText,
            stdout: mcpResult.body,
            stderr: mcpResult.error || refusalText,
            exitCode: 2,
            outcome: "error",
          });
          yield {
            blockingError: {
              blockingError: refusalText,
              command: displayCommand,
            },
            outcome: "blocking",
            hook,
          };
          return;
        }
        if (mcpResult.withheld && hookEvent === "PermissionRequest" && isDiskless()) {
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: mcpResult.error ?? "",
            stdout: "",
            stderr: mcpResult.error ?? "",
            exitCode: undefined,
            outcome: "error",
          });
          yield denyPermissionRequestHookInCloud(hook);
          return;
        }
        if (mcpResult.withheld && hookEvent === "PreToolUse") {
          let refusalText = `a PreToolUse mcp_tool hook could not run (${mcpResult.error}); refusing rather than skipping that gate`;
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: refusalText,
            stdout: "",
            stderr: mcpResult.error ?? refusalText,
            exitCode: 2,
            outcome: "error",
          });
          yield {
            blockingError: {
              blockingError: refusalText,
              command: displayCommand,
            },
            outcome: "blocking",
            hook,
          };
          return;
        }
        if (mcpResult.aborted) {
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: "Hook cancelled",
            stdout: "",
            stderr: "",
            exitCode: undefined,
            outcome: "cancelled",
          });
          yield {
            message: createAttachmentMessage_2({
              type: "hook_cancelled",
              hookName: hookDisplayName,
              toolUseID,
              hookEvent,
              command: hookCommand,
              timedOut: !signal?.aborted,
              timeoutMs: hook.timeout ? hook.timeout * 1000 : timeoutMs,
            }),
            outcome: "cancelled",
            hook,
          };
          return;
        }
        if (mcpResult.error || !mcpResult.ok) {
          let error = mcpResult.error || "MCP tool returned an error";
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: error,
            stdout: mcpResult.body,
            stderr: error,
            exitCode: 1,
            outcome: "error",
          });
          yield {
            message: createAttachmentMessage_2({
              type: "hook_non_blocking_error",
              hookName: hookDisplayName,
              toolUseID,
              hookEvent,
              stderr: error,
              stdout: mcpResult.body,
              exitCode: 1,
            }),
            outcome: "non_blocking_error",
            hook,
          };
          return;
        }
        let { json: httpJson, validationError: httpValidationError } = parseHookOutput(mcpResult.body);
        if (httpValidationError) {
          hadSchemaInvalidOutput = true;
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: mcpResult.body,
            stdout: mcpResult.body,
            stderr: httpValidationError,
            exitCode: 1,
            outcome: "error",
          });
          yield {
            message: createAttachmentMessage_2({
              type: "hook_non_blocking_error",
              hookName: hookDisplayName,
              toolUseID,
              hookEvent,
              stderr: httpValidationError,
              stdout: mcpResult.body,
              exitCode: 1,
            }),
            outcome: "non_blocking_error",
            hook,
          };
          return;
        }
        emitHookResponse({
          hookId,
          hookName: hookDisplayName,
          hookEvent,
          output: mcpResult.body,
          stdout: mcpResult.body,
          stderr: "",
          exitCode: 0,
          outcome: "success",
        });
        if (httpJson && isSyncHookJSONOutput(httpJson)) {
          let processed = processHookJSONOutput({
            json: isPersonalRestricted
              ? restrictPersonalHookAnswer(
                  httpJson,
                  matchedToolNameInput(mapped[hookIndex], hookInput) ?? hookInput,
                )
              : httpJson,
            command: hookCommand,
            hookName: hookDisplayName,
            toolUseID,
            hookEvent,
            expectedHookEvent: hookEvent,
            stdout: mcpResult.body,
            stderr: "",
            exitCode: 0,
          });
          emitHookMetrics(httpJson.metrics, pluginId, hookEvent, agentContext_2);
          yield {
            ...processed,
            outcome: "success",
            hook,
          };
          return;
        }
        yield {
          message: createAttachmentMessage_2({
            type: "hook_success",
            hookName: hookDisplayName,
            toolUseID,
            hookEvent,
            content: `${sequential.bold(hookDisplayName)} completed`,
            stdout: mcpResult.body,
            stderr: "",
            command: hookCommand,
            durationMs: Date.now() - hookStartMs,
          }),
          outcome: "success",
          hook,
        };
        return;
      }
      let env = servedHookEnv?.env;
      let scriptResolved =
        hook.type === "script"
          ? resolveScriptHook(hook, hookEvent)
          : {
              hook,
              env: undefined,
            };
      let hookToRun =
        pinnedProgram === undefined
          ? scriptResolved.hook
          : {
              ...scriptResolved.hook,
              command: pinnedProgram,
            };
      let launcherSync =
        launcherHookEnv !== undefined &&
        servedHookEnv === undefined &&
        pluginRoot === undefined &&
        skillRoot === undefined &&
        isFlagSettingsSyncHook(hook, hookEvent);
      emitHookStarted(hookId, hookDisplayName, hookEvent);
      let result = await execCommandHook(
        asyncPlugins
          ? rewriteInputIfMarked(hookToRun, {
              ...hookToRun,
              timeout: hookTimeoutMs_2 / 1000,
            })
          : hookToRun,
        hookEvent,
        hookDisplayName,
        jsonInput,
        hookInputJson.sent,
        {
          ...claudeEnvContextFrom(hookInput),
          envFileSessionId,
        },
        getHookProject(session),
        servedHookEnv?.spawnCwd ??
          (hook.type === "script" ? (getHookProject(session)?.projectRoot ?? hookInput.cwd) : hookInput.cwd),
        abortSignal,
        hookId,
        hookIndex_2,
        pluginRoot,
        pluginId,
        settingsSource,
        skillRoot,
        forceSyncExecution ||
          isServedCall ||
          hook.type === "script" ||
          blocksWhenNonBlockingError(hook, hookEvent) ||
          launcherSync,
        launcherSync
          ? launcherHookEnv
          : scriptResolved.env === undefined
            ? env?.extra
            : {
                ...env?.extra,
                ...scriptResolved.env,
              },
        servedHookEnv === undefined
          ? undefined
          : {
              base: servedHookEnv.env.base,
              omit: servedHookEnv.env.omit,
              shellPrefix: servedHookEnv.shellPrefix,
              spawnCwd: servedHookEnv.spawnCwd,
            },
        {
          ...hookInputSummary(hookInput, toolUseContext?.options.tools),
          toolUseID,
        },
        hookSourceOf(hook),
        effectiveStorageV5,
        effectiveCredentials,
      );
      let cancelledBySignal = signal?.aborted === true && result.stoppedAfterItsTimeout !== true;
      ranScript =
        hook.type !== "script" || didScriptHookRun(result) || (result.aborted === true && cancelledBySignal);
      exitedTwo = result.status === 2 && !result.backgrounded;
      cleanup?.();
      let durationMs = Date.now() - hookStartMs;
      let statusText = result.aborted
        ? cancelledBySignal
          ? "cancelled"
          : `timed out after ${hookTimeoutMs_2}ms`
        : result.backgrounded
          ? "moved to the background"
          : result.withheld
            ? "not run"
            : result.spawnFailed
              ? "failed to start"
              : `finished with status ${result.status}`;
      logForDebugging(
        `Hooks: ${hookDisplayName} [${displayCommand}]${pluginId ? ` (plugin ${pluginId})` : ""} ${statusText} (${durationMs}ms)`,
      );
      if (result.withheld === true && hookEvent === "PermissionRequest") {
        emitHookResponse({
          hookId,
          hookName: hookDisplayName,
          hookEvent,
          output: result.output,
          stdout: "",
          stderr: result.stderr,
          exitCode: result.status,
          outcome: "error",
        });
        yield denyPermissionRequestHookInCloud(hook);
        return;
      }
      let guardResult = ranScript
        ? undefined
        : guardScriptHookBlock(
            hook,
            hookEvent,
            isServedCall ? "script hook" : displayCommand,
            isServedCall || result.stderr.trim() === ""
              ? describeHookDidNotRun(result)
              : `${describeHookDidNotRun(result)}: ${result.stderr.trim()}`,
          );
      if (guardResult !== undefined) {
        emitHookResponse({
          hookId,
          hookName: hookDisplayName,
          hookEvent,
          output: result.output,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.status,
          outcome: "error",
        });
        yield guardResult;
        return;
      }
      if (!ranScript && !result.aborted) {
        emitHookResponse({
          hookId,
          hookName: hookDisplayName,
          hookEvent,
          output: result.output,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.status,
          outcome: "error",
        });
        yield {
          message: createAttachmentMessage_2({
            type: "hook_non_blocking_error",
            hookName: hookDisplayName,
            toolUseID,
            hookEvent,
            stderr: `script hook did not run (${describeHookDidNotRun(result)})${result.stderr.trim() ? `: ${result.stderr.trim()}` : ""}`,
            stdout: result.stdout,
            exitCode: result.status,
            command: hookCommand,
            durationMs,
          }),
          outcome: "non_blocking_error",
          hook,
        };
        return;
      }
      if (result.backgrounded) {
        yield {
          outcome: "success",
          hook,
        };
        return;
      }
      if (result.aborted) {
        emitHookResponse({
          hookId,
          hookName: hookDisplayName,
          hookEvent,
          output: result.output,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.status,
          outcome: "cancelled",
        });
        yield {
          message: createAttachmentMessage_2({
            type: "hook_cancelled",
            hookName: hookDisplayName,
            toolUseID,
            hookEvent,
            command: hookCommand,
            durationMs,
            timedOut: !cancelledBySignal,
            timeoutMs: hookTimeoutMs_2,
          }),
          outcome: "cancelled",
          hook,
          ...(result.stoppedAfterItsTimeout && {
            stoppedAfterItsTimeout: true,
          }),
        };
        return;
      }
      let hookStdoutForParsing = getHookStdoutForParsing(result);
      let { json, plainText, validationError } = parseHookOutput(hookStdoutForParsing);
      let capturedJson = dropSuspectCaptureJson(result, hookEvent, json);
      let distrustReason = getUntrustedCaptureReason(
        result,
        hookEvent,
        hookStdoutForParsing,
        capturedJson,
        (text) => parseHookOutput(text).json,
      );
      if (distrustReason !== undefined) {
        let stderr = withHookStderr(distrustReason, result.status, result.stderr);
        emitHookResponse({
          hookId,
          hookName: hookDisplayName,
          hookEvent,
          output: result.output,
          stdout: result.stdout,
          stderr,
          exitCode: result.status,
          outcome: "error",
        });
        if (PROMPT_GUARD_EVENTS.has(hookEvent)) {
          yield {
            blockingError: {
              blockingError: `[${isServedCall ? `${hook.type} hook` : displayCommand}]: ${distrustReason}`,
              command: displayCommand,
              ...promptEndingFields(hookEvent, {
                noVerdict: "output_distrusted",
              }),
            },
            suppressOriginalPrompt: true,
            outcome: "blocking",
            hook,
          };
          return;
        }
        yield {
          message: createAttachmentMessage_2({
            type: "hook_non_blocking_error",
            hookName: hookDisplayName,
            toolUseID,
            hookEvent,
            stderr,
            stdout: result.stdout,
            exitCode: result.status,
            command: hookCommand,
            durationMs,
          }),
          outcome: "non_blocking_error",
          hook,
        };
        return;
      }
      let familyOnlyBash =
        mapped[hookIndex].throughFamilyOnly === true &&
        "tool_name" in hookInput &&
        monitorCommandAsBash(hookInput.tool_name, getHookToolInput(hookInput)) !== undefined;
      let rewritten =
        capturedJson !== undefined && result.ranElsewhere && !familyOnlyBash
          ? applyRemoteHookInputRewrite(capturedJson, hookInput, hookOriginLabel, result)
          : capturedJson;
      let restricted =
        rewritten !== undefined && isPersonalRestricted
          ? restrictPersonalHookAnswer(
              rewritten,
              matchedToolNameInput(mapped[hookIndex], hookInput) ?? hookInput,
            )
          : rewritten;
      let blockedUnexpected =
        hasBlockingReason(hook, hookEvent, isPersonalRestricted) &&
        result.status !== 0 &&
        result.status !== 2 &&
        !(restricted !== undefined && isDenyDecisionOutput(restricted, hookEvent));
      let finalJson = blockedUnexpected ? undefined : restricted;
      let continuation =
        blockedUnexpected &&
        restricted !== undefined &&
        isSyncHookJSONOutput(restricted) &&
        restricted.continue === false
          ? {
              preventContinuation: true,
              ...(restricted.stopReason !== undefined && {
                stopReason: restricted.stopReason,
              }),
            }
          : undefined;
      if (validationError && result.status === 2) {
        if (!hadSchemaInvalidBlock && !suppressPerInvocationTelemetry)
          logFeatureSad(hookFeature(hookEvent), "hook_output_schema_invalid_blocked");
        hadSchemaInvalidBlock = true;
      } else if (validationError) {
        hadSchemaInvalidOutput = true;
        let stderr = withHookStderr(validationError, result.status, result.stderr);
        emitHookResponse({
          hookId,
          hookName: hookDisplayName,
          hookEvent,
          output: result.output,
          stdout: result.stdout,
          stderr,
          exitCode: result.status,
          outcome: "error",
        });
        yield {
          message: createAttachmentMessage_2({
            type: "hook_non_blocking_error",
            hookName: hookDisplayName,
            toolUseID,
            hookEvent,
            stderr,
            stdout: result.stdout,
            exitCode: result.status,
            command: hookCommand,
            durationMs,
          }),
          outcome: "non_blocking_error",
          hook,
        };
        return;
      }
      if (finalJson) {
        if (isSyncHookJSONOutput_2(finalJson)) {
          if (result.status === 2) {
            emitHookResponse({
              hookId,
              hookName: hookDisplayName,
              hookEvent,
              output: result.output,
              stdout: result.stdout,
              stderr: result.stderr,
              exitCode: result.status,
              outcome: "error",
            });
            yield {
              blockingError: {
                blockingError: `[${isServedCall ? `${hook.type} hook` : displayCommand}]: ${result.stderr || "No stderr output"}`,
                command: displayCommand,
                ...promptEndingFields(hookEvent, {
                  reason: result.stderr,
                }),
              },
              ...((result.stdioIncomplete === true || result.stdioClosedWithoutEnd === true) && {
                suppressOriginalPrompt: true,
              }),
              outcome: "blocking",
              hook,
            };
            return;
          }
          if (result.status !== 0) {
            emitHookResponse({
              hookId,
              hookName: hookDisplayName,
              hookEvent,
              output: result.output,
              stdout: result.stdout,
              stderr: result.stderr,
              exitCode: result.status,
              outcome: "error",
            });
            yield {
              message: createAttachmentMessage_2({
                type: "hook_non_blocking_error",
                hookName: hookDisplayName,
                toolUseID,
                hookEvent,
                stderr: `Announced async, then failed with status code ${result.status}: ${result.stderr.trim() || "No stderr output"}`,
                stdout: result.stdout,
                exitCode: result.status,
                command: hookCommand,
                durationMs,
              }),
              outcome: "non_blocking_error",
              hook,
              ...(exitedByContract(result) && {
                ranByContract: true,
              }),
            };
            return;
          }
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: result.output,
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.status,
            outcome: "success",
          });
          yield {
            outcome: "success",
            hook,
          };
          return;
        }
        let processed = processHookJSONOutput({
          json: finalJson,
          command: hookCommand,
          hookName: hookDisplayName,
          toolUseID,
          hookEvent,
          expectedHookEvent: hookEvent,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.status,
          durationMs,
        });
        if (result.noVerdict !== undefined && processed.blockingError)
          processed.blockingError = {
            blockingError: processed.blockingError.blockingError,
            command: processed.blockingError.command,
            ...promptEndingFields(hookEvent, {
              noVerdict:
                result.noVerdict === "remote_run_timed_out" && cancelledBySignal
                  ? "interrupted"
                  : result.noVerdict,
            }),
          };
        emitHookMetrics(finalJson.metrics, pluginId, hookEvent, agentContext_2);
        if (
          isSyncHookJSONOutput(finalJson) &&
          !finalJson.suppressOutput &&
          plainText &&
          result.status === 0
        ) {
          let content = `${sequential.bold(hookDisplayName)} completed`;
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: result.output,
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.status,
            outcome: "success",
          });
          yield {
            ...processed,
            message:
              processed.message ||
              createAttachmentMessage_2({
                type: "hook_success",
                hookName: hookDisplayName,
                toolUseID,
                hookEvent,
                content,
                stdout: result.stdout,
                stderr: result.stderr,
                exitCode: result.status,
                command: hookCommand,
                durationMs,
              }),
            outcome: "success",
            hook,
          };
          return;
        }
        if (result.status === 2 && !processed.blockingError)
          processed.blockingError = {
            blockingError: `[${isServedCall ? `${hook.type} hook` : displayCommand}]: ${result.stderr || "No stderr output"}${pluginNote}`,
            command: displayCommand,
            ...promptEndingFields(hookEvent, {
              reason: result.stderr,
            }),
          };
        if (result.status === 2 && (result.stdioIncomplete === true || result.stdioClosedWithoutEnd === true))
          processed.suppressOriginalPrompt = true;
        emitHookResponse({
          hookId,
          hookName: hookDisplayName,
          hookEvent,
          output: result.output,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.status,
          outcome: result.status === 0 ? "success" : "error",
        });
        yield {
          ...processed,
          outcome: processed.blockingError ? "blocking" : "success",
          notStarted: result.notStarted,
          hook,
        };
        return;
      }
      if (result.status === 0) {
        emitHookResponse({
          hookId,
          hookName: hookDisplayName,
          hookEvent,
          output: result.output,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.status,
          outcome: "success",
        });
        let content = await persistLargeHookOutput(result.stdout.trim(), hookId, "stdout", {
          storageV5: effectiveStorageV5,
        });
        yield {
          message: createAttachmentMessage_2({
            type: "hook_success",
            hookName: hookDisplayName,
            toolUseID,
            hookEvent,
            content,
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.status,
            command: hookCommand,
            durationMs,
          }),
          outcome: "success",
          notStarted: result.notStarted,
          hook,
        };
        return;
      }
      if (
        result.status === 2 &&
        hook.type !== "script" &&
        exitTwoMeansMissingScript({
          hookEvent,
          stdout: result.stdout,
          stderr: result.stderr,
          pluginId,
          stdioIncomplete: result.stdioIncomplete,
          stdioClosedWithoutEnd: result.stdioClosedWithoutEnd,
        })
      ) {
        emitHookResponse({
          hookId,
          hookName: hookDisplayName,
          hookEvent,
          output: result.output,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.status,
          outcome: "error",
        });
        yield {
          message: createAttachmentMessage_2({
            type: "hook_non_blocking_error",
            hookName: hookDisplayName,
            toolUseID,
            hookEvent,
            stderr:
              `Hook script appears to be missing \u2014 "${displayCommand}" exited 2 with: ${result.stderr.trim()}. ${TREATING_NON_BLOCKING_PREFIX}` +
              (pluginId
                ? `Run \`/plugin\` to reinstall '${pluginId}' or remove it from settings.`
                : "If this is a plugin hook, check the plugin install (run /plugin)."),
            stdout: result.stdout,
            exitCode: result.status,
            command: hookCommand,
            durationMs,
          }),
          outcome: "non_blocking_error",
          hook,
        };
        return;
      }
      if (result.status === 2) {
        emitHookResponse({
          hookId,
          hookName: hookDisplayName,
          hookEvent,
          output: result.output,
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.status,
          outcome: "error",
        });
        yield {
          blockingError: {
            blockingError: `[${isServedCall ? `${hook.type} hook` : displayCommand}]: ${result.stderr || "No stderr output"}${pluginNote}`,
            command: displayCommand,
            ...promptEndingFields(hookEvent, {
              reason: result.stderr,
            }),
          },
          ...((result.stdioIncomplete === true || result.stdioClosedWithoutEnd === true) && {
            suppressOriginalPrompt: true,
          }),
          outcome: "blocking",
          hook,
        };
        return;
      }
      emitHookResponse({
        hookId,
        hookName: hookDisplayName,
        hookEvent,
        output: result.output,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.status,
        outcome: "error",
      });
      if (result.spawnFailed && !firstSpawnFailureSurfaced(hookEvent, displayCommand)) {
        yield {
          outcome: "non_blocking_error",
          hook,
        };
        return;
      }
      yield {
        message: createAttachmentMessage_2({
          type: "hook_non_blocking_error",
          hookName: hookDisplayName,
          toolUseID,
          hookEvent,
          stderr: `${NON_BLOCKING_STATUS_PREFIX}${result.stderr.trim() || "No stderr output"}`,
          stdout: result.stdout,
          exitCode: result.status,
          command: hookCommand,
          durationMs,
        }),
        ...continuation,
        outcome: "non_blocking_error",
        hook,
        ...(exitedByContract(result) && {
          ranByContract: true,
        }),
      };
      return;
    } catch (error) {
      cleanup?.();
      let message = error instanceof Error ? error.message : String(error);
      logForDebugging(`Hook failed to run (${hookDisplayName}): ${message}`, {
        level: "error",
      });
      emitHookResponse({
        hookId,
        hookName: hookDisplayName,
        hookEvent,
        output: `Failed to run: ${message}`,
        stdout: "",
        stderr: `Failed to run: ${message}`,
        exitCode: 1,
        outcome: "error",
      });
      if (exitedTwo && GUARD_HOOK_EVENTS.has(hookEvent)) {
        yield {
          blockingError: {
            blockingError: `[${isServedCall ? `${hook.type} hook` : displayCommand}]: blocked (exit 2); its output could not be processed`,
            command: displayCommand,
          },
          outcome: "blocking",
          hook,
        };
        return;
      }
      let guardResult = ranScript
        ? undefined
        : guardScriptHookBlock(
            hook,
            hookEvent,
            isServedCall ? "script hook" : displayCommand,
            isServedCall ? "setup failed" : message,
          );
      if (guardResult !== undefined) {
        yield guardResult;
        return;
      }
      if (!firstSpawnFailureSurfaced(hookEvent, displayCommand)) {
        yield {
          outcome: "non_blocking_error",
          hook,
        };
        return;
      }
      yield {
        message: createAttachmentMessage_2({
          type: "hook_non_blocking_error",
          hookName: hookDisplayName,
          toolUseID,
          hookEvent,
          stderr: `Failed to run: ${message}`,
          stdout: "",
          exitCode: 1,
          command: hookCommand,
          durationMs: Date.now() - hookStartMs,
        }),
        outcome: "non_blocking_error",
        hook,
      };
      return;
    }
  });
  let outcomes = {
    success: 0,
    blocking: 0,
    non_blocking_error: 0,
    cancelled: 0,
  };
  let injectedCharCounts = {
    additionalContextChars: 0,
    classifierContextChars: 0,
    systemMessageChars: 0,
    initialUserMessageChars: 0,
    hookSuccessStdoutChars: 0,
  };
  let outputsPersistedCount = 0;
  let pluginIdByHook = new Map(mapped.map((entry) => [entry.hook, entry.pluginId]));
  let matchedByHook = new Map(mapped.map((entry) => [entry.hook, entry]));
  let injectedCharsByPlugin = new Map();
  function addChars(hook, field, charCount) {
    let pluginId = pluginIdByHook.get(hook);
    if (!pluginId || charCount === 0) return;
    let counts = injectedCharsByPlugin.get(pluginId);
    if (!counts) {
      counts = {
        additionalContextChars: 0,
        classifierContextChars: 0,
        systemMessageChars: 0,
        initialUserMessageChars: 0,
        hookSuccessStdoutChars: 0,
      };
      injectedCharsByPlugin.set(pluginId, counts);
    }
    counts[field] += charCount;
  }
  let outcomesByPlugin = new Map();
  let messageCount = 0;
  let aggregatedPermission;
  let hookResultStream =
    toolUseContext === undefined || isServedCall
      ? all(runs)
      : runHooksWithConcurrencyLimit(
          runs,
          (hookIndex) => {
            let hook = mapped[hookIndex];
            return isConsultHook(hook.hook) &&
              hookPromises[hookIndex] === undefined &&
              hook.notTested === undefined &&
              !(hookEvent === "PermissionRequest" && hook.hook.type === "agent") &&
              getHookInputJson(hook, false).ok
              ? hookTimeoutMs(hook.hook, timeoutMs)
              : undefined;
          },
          {
            slots: hookSlotsRegistry.of(toolUseContext.session.host),
            signal,
            limitMs: timeoutMs,
          },
        );
  let hookKeepalive = startHookKeepalive(hookEvent, mapped, timeoutMs);
  for await (let result of hookKeepalive === noopRelease
    ? hookResultStream
    : withFinally(hookResultStream, hookKeepalive)) {
    let entry = matchedByHook.get(result.hook);
    let summarized = notRunHooks.has(result.hook)
      ? result
      : summarizeHookFailures(
          result,
          hookEvent,
          signal,
          isServedCall,
          entry !== undefined && isPersonalRestrictedHook(entry, hookEvent),
        );
    let remoteRunner =
      !isServedCall &&
      hookEvent === "PreToolUse" &&
      !notRunHooks.has(result.hook) &&
      !(
        (result.hook.type === "prompt" || result.hook.type === "agent") &&
        toolUseContext?.agentId?.startsWith(HOOK_AGENT_ID_PREFIX) === true
      )
        ? getRemoteHookRunner(toolUseContext)
        : undefined;
    let final = isServedCall
      ? redactServedBlockingError(
          hookEvent === "PreToolUse" ? refuseUnfinishedPreToolHook(summarized, signal) : summarized,
        )
      : remoteRunner !== undefined
        ? refuseUnfinishedPreToolHook(summarized, signal, remoteRunner, {
            tool:
              matchQuery !== undefined && toolUseContext !== undefined
                ? findToolByName(toolUseContext.options.tools, matchQuery)
                : undefined,
            inSubagent: toolUseContext?.agentId !== undefined,
            continueIsContested: entry === undefined || entry.continueIsContested === true,
          })
        : summarized;
    outcomes[final.outcome]++;
    let hookIndex = byPlugin.get(result.hook);
    if (hookIndex !== undefined) runningHooks?.settle(hookIndex);
    let pluginId = pluginIdByHook.get(final.hook);
    if (pluginId) {
      let counts = outcomesByPlugin.get(pluginId);
      if (!counts) {
        counts = {
          success: 0,
          blocking: 0,
          non_blocking_error: 0,
          cancelled: 0,
        };
        outcomesByPlugin.set(pluginId, counts);
      }
      counts[final.outcome]++;
    }
    if (final.message?.type === "attachment" && final.message.attachment.type === "hook_success") {
      let { content, stdout } = final.message.attachment;
      let stdoutLength = stdout?.length ?? 0;
      injectedCharCounts.hookSuccessStdoutChars += stdoutLength;
      addChars(final.hook, "hookSuccessStdoutChars", stdoutLength);
      if (stdout !== undefined && isPersistedHookOutputPath(stdout.trim(), content)) outputsPersistedCount++;
    }
    if (final.updatedToolOutput !== undefined) {
      logForDebugging(`Hook ${hookEvent} (${getHookStatusText(final.hook)}) replaced tool output`);
      yield {
        updatedToolOutput: final.updatedToolOutput,
      };
    }
    if (final.updatedMCPToolOutput !== undefined && final.updatedToolOutput === undefined) {
      logForDebugging(
        `Hook ${hookEvent} (${getHookStatusText(final.hook)}) replaced tool output (updatedMCPToolOutput)`,
      );
      yield {
        updatedMCPToolOutput: final.updatedMCPToolOutput,
      };
    }
    if (final.displayContent !== undefined)
      yield {
        displayContent: final.displayContent,
      };
    if (matchedByHook.get(final.hook)?.throughFamilyOnly === true) final.classifierContext = undefined;
    if (final.classifierContext) {
      let context = truncateToLength(final.classifierContext, HOST_CONTEXT_LINE_LIMIT);
      logForDebugging(
        `Hook ${hookEvent} (${getHookStatusText(final.hook)}) provided classifierContext (${context.length} chars after cap)`,
      );
      injectedCharCounts.classifierContextChars += context.length;
      addChars(final.hook, "classifierContextChars", context.length);
      yield {
        pairedRewrite:
          final.updatedToolOutput !== undefined
            ? "direct"
            : final.updatedMCPToolOutput !== undefined
              ? "legacy_mcp"
              : final.legacyMcpRewriteSuppressed
                ? "suppressed"
                : "none",
        classifierContexts: [
          {
            value: context,
            hostPrincipal:
              final.hook.type === "callback" &&
              pluginIdByHook.get(final.hook) === undefined &&
              (() => {
                let entry = matchedByHook.get(final.hook);
                return entry !== undefined && entry.pluginRoot === undefined && entry.skillRoot === undefined;
              })(),
          },
        ],
      };
    }
    if (final.preventContinuation) {
      logForDebugging(`Hook ${hookEvent} (${getHookStatusText(final.hook)}) requested preventContinuation`);
      yield {
        preventContinuation: true,
        stopReason: final.stopReason,
      };
    }
    let promptExtra =
      final.hook?.type === "prompt"
        ? {
            hook: final.hook,
            stopReason: final.stopReason,
            impossible: final.impossible,
          }
        : {};
    if (final.blockingError) {
      yield {
        blockingError: final.blockingError,
        suppressOriginalPrompt: final.suppressOriginalPrompt,
        ...promptExtra,
      };
      aggregatedPermission = "deny";
    }
    if (final.message)
      yield {
        message: final.message,
        ...promptExtra,
      };
    if (
      (hookEvent === "PreToolUse" || hookEvent === "PermissionRequest") &&
      final.outcome === "non_blocking_error" &&
      toolUseID
    )
      attentionRegistryStore.noteHookFailure(
        toolUseID,
        formatHookFailureLine(
          hookEvent,
          final.message?.type === "attachment" && final.message.attachment.type === "hook_non_blocking_error"
            ? final.message.attachment.stderr
            : "",
        ),
      );
    if (final.timedOut && final.hook.type === "prompt" && hookEvent === "Stop")
      yield {
        hook: final.hook,
        timedOut: true,
      };
    messageCount++;
    if (final.systemMessage) {
      injectedCharCounts.systemMessageChars += final.systemMessage.length;
      addChars(final.hook, "systemMessageChars", final.systemMessage.length);
      let content = await persistLargeHookOutput(
        final.systemMessage,
        `${toolUseID}-${messageCount}`,
        "systemMessage",
        {
          storageV5: effectiveStorageV5,
        },
      );
      if (isPersistedHookOutputPath(final.systemMessage, content)) outputsPersistedCount++;
      yield {
        message: createAttachmentMessage_2({
          type: "hook_system_message",
          content,
          hookName: hookDisplayName,
          toolUseID,
          hookEvent,
          ...(final.heldForServedCall && {
            heldForServedCall: true,
          }),
        }),
      };
    }
    if (final.terminalSequence) writeHistoryEntry(final.terminalSequence);
    if (final.additionalContext) {
      injectedCharCounts.additionalContextChars += final.additionalContext.length;
      addChars(final.hook, "additionalContextChars", final.additionalContext.length);
      logForDebugging(
        `Hook ${hookEvent} (${getHookStatusText(final.hook)}) provided additionalContext (${final.additionalContext.length} chars)`,
      );
      let content = await persistLargeHookOutput(
        final.additionalContext,
        `${toolUseID}-${messageCount}`,
        "additionalContext",
        {
          storageV5: effectiveStorageV5,
        },
      );
      if (isPersistedHookOutputPath(final.additionalContext, content)) outputsPersistedCount++;
      yield {
        additionalContexts: [content],
      };
    }
    if (final.initialUserMessage) {
      injectedCharCounts.initialUserMessageChars += final.initialUserMessage.length;
      addChars(final.hook, "initialUserMessageChars", final.initialUserMessage.length);
      logForDebugging(
        `Hook ${hookEvent} (${getHookStatusText(final.hook)}) provided initialUserMessage (${final.initialUserMessage.length} chars)`,
      );
      let content = await persistLargeHookOutput(
        final.initialUserMessage,
        `${toolUseID}-${messageCount}`,
        "initialUserMessage",
        {
          storageV5: effectiveStorageV5,
        },
      );
      if (isPersistedHookOutputPath(final.initialUserMessage, content)) outputsPersistedCount++;
      yield {
        initialUserMessage: content,
      };
    }
    if (final.watchPaths && final.watchPaths.length > 0) {
      logForDebugging(
        `Hook ${hookEvent} (${getHookStatusText(final.hook)}) provided ${final.watchPaths.length} watchPaths`,
      );
      yield {
        watchPaths: final.watchPaths,
      };
    }
    if (final.reloadSkills) {
      logForDebugging(`Hook ${hookEvent} (${getHookStatusText(final.hook)}) requested reloadSkills`);
      yield {
        reloadSkills: true,
      };
    }
    if (final.sessionTitle) {
      logForDebugging(
        `Hook ${hookEvent} (${getHookStatusText(final.hook)}) provided sessionTitle (${[...final.sessionTitle].length} chars)`,
      );
      yield {
        sessionTitle: final.sessionTitle,
      };
    }
    if (matchedByHook.get(final.hook)?.throughFamilyOnly === true) {
      final.updatedInput = undefined;
      if (final.permissionBehavior === "allow") {
        logForDebugging(
          `Hook ${hookEvent} (${getHookStatusText(final.hook)}) permissionDecision=allow ignored: it matched this tool only through another of its names, which can deny or ask but not allow`,
        );
        final.permissionBehavior = undefined;
      }
      if (final.permissionRequestResult?.behavior === "allow") {
        logForDebugging(
          `Hook ${hookEvent} (${getHookStatusText(final.hook)}) PermissionRequest allow ignored: it matched this tool only through another of its names, which can deny or ask but not allow`,
        );
        final.permissionRequestResult = undefined;
      }
    }
    stripConfinedHookApproval(
      final,
      `Hook ${hookEvent} (${getHookStatusText(final.hook)})`,
      hookInput,
      toolUseContext,
    );
    if (final.updatedInput !== undefined)
      toolUseContext?.remoteCall?.hookRewrites.push({
        byOwnHook: ownSettingsHooks.has(final.hook),
        handed: "tool_input" in hookInput ? hookInput.tool_input : undefined,
        proposed: final.updatedInput,
      });
    if (final.permissionBehavior)
      switch (
        (logForDebugging(
          `Hook ${hookEvent} (${getHookStatusText(final.hook)}) returned permissionDecision: ${final.permissionBehavior}${final.hookPermissionDecisionReason ? ` (reason: ${final.hookPermissionDecisionReason})` : ""}`,
        ),
        final.permissionBehavior)
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
    if (final.permissionBehavior && aggregatedPermission === final.permissionBehavior) {
      let updatedInput =
        final.updatedInput && (final.permissionBehavior === "allow" || final.permissionBehavior === "ask")
          ? final.updatedInput
          : undefined;
      if (updatedInput)
        logForDebugging(
          `Hook ${hookEvent} (${getHookStatusText(final.hook)}) modified tool input keys: [${Object.keys(updatedInput).join(", ")}]`,
        );
      let permissionDisplay =
        final.permissionBehavior === "ask"
          ? sanitizeHostPermissionDisplay(final.permissionDisplay, final.hook, matchedByHook.get(final.hook))
          : undefined;
      let entry = matchedByHook.get(final.hook);
      yield {
        permissionBehavior: aggregatedPermission,
        hookPermissionDecisionReason: final.hookPermissionDecisionReason,
        ...(final.heldForServedCall && {
          heldForServedCall: true,
        }),
        hookSource: entry?.hookSource,
        ...(entry?.pluginId !== undefined &&
          entry.skillRoot === undefined && {
            hookPluginId: entry.pluginId,
          }),
        updatedInput,
        ...(updatedInput && {
          rewriterKind: getRewriterKindForHook(final.hook, entry),
        }),
        ...(permissionDisplay && {
          permissionDisplay,
        }),
      };
    }
    if (final.updatedInput && final.permissionBehavior === undefined) {
      logForDebugging(
        `Hook ${hookEvent} (${getHookStatusText(final.hook)}) modified tool input keys: [${Object.keys(final.updatedInput).join(", ")}]`,
      );
      let entry = matchedByHook.get(final.hook);
      yield {
        hookSource: entry?.hookSource,
        updatedInput: final.updatedInput,
        rewriterKind: getRewriterKindForHook(final.hook, entry),
      };
    }
    if (final.permissionRequestResult)
      yield {
        permissionRequestResult: final.permissionRequestResult,
      };
    if (final.retry)
      yield {
        retry: final.retry,
      };
    if (final.elicitationResponse)
      yield {
        elicitationResponse: final.elicitationResponse,
      };
    if (final.elicitationResultResponse)
      yield {
        elicitationResultResponse: final.elicitationResultResponse,
      };
    if (sessionHooks_2 && final.hook.type !== "callback") {
      let query = matchQuery ?? "";
      let options = {
        skillRoot: mapped.find((hook) => hook.hook === final.hook)?.skillRoot,
      };
      let sessionEntry =
        sessionHooks_2.getEntry(session.id, hookEvent, query, final.hook, options) ??
        sessionHooks_2.getEntry(
          session.id,
          hookEvent,
          getPluginHookRunner()?.ownTool(query)?.name ?? query,
          final.hook,
          options,
        );
      if (sessionEntry?.onHookSuccess && final.outcome === "success" && !final.notStarted)
        try {
          sessionEntry.onHookSuccess(final.hook, final);
        } catch (error) {
          logError(
            Error("Session hook success callback failed", {
              cause: error,
            }),
          );
        }
    }
  }
  let durationMs = Date.now() - batchStartTime;
  for (let pluginId of new Set(pluginIdByHook.values())) if (pluginId) recordPluginUsage(pluginId);
  if (!suppressPerInvocationTelemetry) {
    getStatsStore()?.observe("hook_duration_ms", durationMs);
    for (let [pluginId, counts] of injectedCharsByPlugin)
      logEvent("tengu_hook_plugin_injected", {
        hookName: hookNameForTelemetry,
        ...buildPluginEventFieldsFromId(pluginId),
        ...counts,
      });
    for (let [pluginId, counts] of outcomesByPlugin)
      logEvent("tengu_hook_plugin_finished", {
        hookEvent: fromEnum(hookEvent),
        ...buildPluginEventFieldsFromId(pluginId),
        numCommands: counts.success + counts.blocking + counts.non_blocking_error + counts.cancelled,
        numSuccess: counts.success,
        numBlocking: counts.blocking,
        numNonBlockingError: counts.non_blocking_error,
        numCancelled: counts.cancelled,
      });
    logEvent("tengu_repl_hook_finished", {
      hookName: hookNameForTelemetry,
      numCommands: mapped.length,
      numSuccess: outcomes.success,
      numBlocking: outcomes.blocking,
      numNonBlockingError: outcomes.non_blocking_error,
      numCancelled: outcomes.cancelled,
      totalDurationMs: durationMs,
      ...injectedCharCounts,
    });
    logOTelEvent(
      "hook_execution_complete",
      {
        hook_event: hookEvent,
        hook_name: hookNameForTelemetry_2,
        num_hooks: String(mapped.length),
        num_success: String(outcomes.success),
        num_blocking: String(outcomes.blocking),
        num_non_blocking_error: String(outcomes.non_blocking_error),
        num_cancelled: String(outcomes.cancelled),
        total_duration_ms: String(durationMs),
        stdout_chars: String(injectedCharCounts.hookSuccessStdoutChars),
        additional_context_chars: String(injectedCharCounts.additionalContextChars),
        system_message_chars: String(injectedCharCounts.systemMessageChars),
        initial_user_message_chars: String(injectedCharCounts.initialUserMessageChars),
        num_outputs_persisted: String(outputsPersistedCount),
        managed_only: String(shouldAllowManagedHooksOnlyByPolicy()),
        hook_source: shouldAllowManagedHooksOnlyByPolicy() ? "policySettings" : "merged",
        safe_mode: String(isSafeMode()),
        ...(tracing && {
          hook_definitions: hookDefinitionsJson,
        }),
      },
      agentContext_2,
    );
    if (span)
      endHookSpan(span, {
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
          "stop_hook_active" in hookInput && {
            stop_hook_active: hookInput.stop_hook_active === true,
          }),
      });
  }
  if (controlStreamClosedError) throw controlStreamClosedError;
}
//@ chunk-e6aww6q8.js:3557798-3558093 facade-exports
/**
 * 确定钩子运行目录：目标目录存在就用；否则依次退回原始 cwd、项目根、家目录，最后是临时目录，并对每个失效目录只警告一次。
 */
async function safeHookCwd(path, project) {
  if (await pathExists(path)) return path;
  let fallbackDir = tmpdir_2();
  for (let candidate of [project.originalCwd, project.projectRoot, homedir()])
    if (candidate !== path && (await pathExists(candidate))) {
      fallbackDir = candidate;
      break;
    }
  let warnedPaths = hookNameBlockedRegistry.of(getRootSession().host);
  if (!warnedPaths.has(path)) {
    warnedPaths.add(path);
    logForDebugging(
      `Hooks: working directory ${path} no longer exists; running hooks from ${fallbackDir} instead`,
      {
        level: "warn",
      },
    );
  }
  return fallbackDir;
}
//@ chunk-e6aww6q8.js:3558093-3558143 affinity
var hookNameBlockedRegistry; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var hookNameSeenRegistry;
deferInit("chunk-e6aww6q8.js:3558093", () => {
  hookNameBlockedRegistry = new HostScoped(() => new Set());
  hookNameSeenRegistry = new HostScoped(() => new Set());
});
//@ chunk-e6aww6q8.js:3558460-3558506 facade-exports
/**
 * 判断钩子结果列表中是否有阻断结果。
 */
function hasBlockingResult(results) {
  return results.some((result) => result.blocked);
}
//@ chunk-e6aww6q8.js:3558506-3558690 layout
function runOutsideReplFunctionChain(options, input) {
  return runOutsideReplHookChain({
    event: input.hook_event_name,
    hookInput: {
      ...input,
    },
    signal: options.signal,
    origin: options.hookOrigin,
    runClassicHooks: (hookInput, tier) =>
      executeHooksOutsideREPL({
        ...options,
        hookInput,
        tier,
        classicChainMember: true,
      }),
  });
}
//@ chunk-e6aww6q8.js:3558690-3568751 facade-exports = executeHooksOutsideREPL (0.59)
/**
 * REPL 外（无对话上下文）执行钩子，返回 [{command, succeeded, output, blocked, watchPaths, systemMessage}]；prompt/agent 钩子在这里不支持；工作区未信任时跳过（personsHooksRunUntrusted 除外）。SessionEnd/Notification/PreCompact/WorktreeCreate 等用它。
 */
async function executeHooksOutsideREPL(options) {
  let {
    session,
    sessionHooks,
    getAppState,
    hookInput,
    matchQuery,
    signal,
    timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
    storageV5,
    credentials,
    tier,
    agentId,
  } = options;
  let hookEvent = hookInput.hook_event_name;
  let name = matchQuery ? `${hookEvent}:${matchQuery}` : hookEvent;
  if (shouldRunSessionEndHook(hookEvent, signal)) await heldUntilExit();
  let policyWait = tier?.managedHooksOnly
    ? undefined
    : maybeWaitForHookPolicy(
        hookEvent,
        () =>
          collectEventHooks(sessionHooks, session.id, hookEvent, {
            held: "only",
          }).length > 0,
        signal,
      );
  if (policyWait !== undefined) await policyWait;
  let classicInput =
    !options.classicChainMember &&
    hookInput.hook_event_name !== "PreToolUse" &&
    isClassicHooked(hookInput.hook_event_name)
      ? hookInput
      : undefined;
  if (classicInput !== undefined && !skipsEmptyDispatch(hookEvent, sessionHooks, session.id))
    return runOutsideReplFunctionChain(options, classicInput);
  if (shouldDisableAllHooksIncludingManaged())
    logForDebugging(
      `Policy disableAllHooks: skipping configured hooks for ${name} (SDK callback hooks still run)`,
    );
  let sessionId = shouldSkipHookDueToTrust();
  if (sessionId && options.personsHooksRunUntrusted !== true) {
    logForDebugging(`Skipping ${name} hook execution - workspace trust not accepted`);
    return [];
  }
  let appState = getAppState?.();
  let ownSources = sessionId
    ? await getUntrustedFolderSources(storageV5)
    : isAttachServeMode()
      ? await getServedSessionOwnSources(storageV5)
      : undefined;
  let owed = getPluginHookRunner()?.owedList(hookEvent);
  if (owed !== undefined) await awaitWithHookTimeout(owed, hookEvent, signal, timeoutMs);
  if (
    ownSources !== undefined &&
    classicInput !== undefined &&
    !skipsEmptyDispatch(hookEvent, sessionHooks, session.id)
  )
    return runOutsideReplFunctionChain(options, classicInput);
  let copiedAsk = tier?.managedHooksOnly
    ? undefined
    : getPluginHookRunner()?.whichCopyAsk?.(hookEvent, hookInput);
  if (copiedAsk !== undefined) await awaitWithHookTimeout(copiedAsk, hookEvent, signal, timeoutMs);
  let matched = await getMatchingHooks(sessionHooks, session.id, hookEvent, hookInput, undefined, {
    ...tier,
    getToolAliases: () => appState?.toolPermissionContext.toolAliases,
    ...(ownSources !== undefined && {
      recordMatchers: true,
      ownSources: ownSources.ownSources,
    }),
  })
    .catch((error) => {
      logHookMatchingFailure(hookEvent, error);
      if (isGuardedHookEvent(hookEvent)) throw error;
      return [];
    })
    .then((matched) =>
      ownSources === undefined ? matched : filterWithheldFolderHooks(matched, hookEvent, ownSources),
    );
  if (matched.length === 0) return [];
  if (signal?.aborted) return [];
  let userHooks = matched.filter((hook) => !isInternalHook(hook));
  if (userHooks.length > 0) {
    let pluginHookCounts = countHooksByPlugin(userHooks);
    let hookTypeCounts = countByPluginKey(userHooks);
    let byType = countHooksByType(userHooks);
    let matchAllCount = count(userHooks, (hook) => hook.matcherIsMatchAll);
    logEvent("tengu_run_hook", {
      hookName: hookTelemetryName(hookEvent, matchQuery),
      numCommands: userHooks.length,
      numMatchAllMatchers: matchAllCount,
      numSpecificMatchers: userHooks.length - matchAllCount,
      hookTypeCounts: hashEntries(byType),
      ...(pluginHookCounts && {
        pluginHookCounts: hashEntries(pluginHookCounts),
      }),
      ...(hookTypeCounts && {
        pluginHookCountsByHash: hookTypeCounts,
      }),
    });
  }
  let untrustedStart = ownSources?.untrustedStart;
  let serializedInput;
  let writtenInput;
  let oversized = false;
  try {
    serializedInput = jsonStringify(
      untrustedStart === undefined
        ? hookInput
        : {
            ...hookInput,
            cwd: untrustedStart,
          },
    );
    oversized = isOversizedHookInput(hookEvent, serializedInput);
    if (oversized) throw RangeError("Hook input is over the size limit");
  } catch (error) {
    logError(error);
    logFeatureBad(hookFeature(hookEvent), oversized ? "hook_input_too_large" : "hook_input_stringify_failed");
    if (isGuardedHookEvent(hookEvent)) throw error;
    return [];
  }
  let failure;
  let cancelled = false;
  let invalidBlock = false;
  let keepalive = userHooks.length > 0 ? startHookKeepalive(hookEvent, matched, timeoutMs) : noopRelease;
  let restrictedIndexes = new Set(
    matched.flatMap((hook, hookIndex) => (isPersonalRestrictedHook(hook, hookEvent) ? [hookIndex] : [])),
  );
  let notRunIndexes = new Set();
  let hookPromises = matched.map(
    async ({ hook, pluginRoot, pluginId, skillRoot, settingsSource, projectRoot, notTested }, hookIndex) => {
      let hookOriginLabel = getHookOriginLabel({
        pluginId,
        settingsSource,
      });
      let refusal = pluginHookRefusal(hookOriginLabel, hookEvent, hook);
      let holdReason = refusal ?? notTested;
      if (holdReason !== undefined) {
        failure ??= "hook_did_not_run";
        notRunIndexes.add(hookIndex);
        let { blockingError } = describeKillSwitchedHook(
          hookEvent,
          name,
          holdReason,
          pluginId,
          blocksWhenItCannotRunElsewhere(hookEvent) &&
            (refusal !== undefined || !(hook.type === "command" && isAsyncHookJSONOutput(hook))),
        );
        return {
          command: getHookDisplayText(hook),
          succeeded: false,
          output: blockingError?.blockingError ?? holdReason,
          blocked: blockingError !== undefined,
        };
      }
      let isRestricted = restrictedIndexes.has(hookIndex);
      let snapshotRoot;
      if (projectRoot !== undefined) {
        let root = neverSkipSessionHooks(projectRoot) ? projectRoot : noSnapshotOverride();
        if (root === null) {
          let reason = `not run: it came from ${projectRoot}, which is no longer a working copy this session can use, and the session's directory is not in one either`;
          logForDebugging(`Hooks: ${getHookDisplayText(hook)} for ${hookEvent} ${reason}`, {
            level: "warn",
          });
          failure ??= "hook_did_not_run";
          return {
            command: getHookDisplayText(hook),
            succeeded: false,
            output: reason,
            blocked: false,
          };
        }
        snapshotRoot = root;
      }
      if (hook.type === "callback") {
        let callbackTimeoutMs = hook.timeout ? hook.timeout * 1000 : timeoutMs;
        let { signal: abortSignal, cleanup } = createCombinedAbortSignal(signal, {
          timeoutMs: callbackTimeoutMs,
        });
        try {
          let toolUseID = randomUUID();
          let json = await hook.callback(hookInput, toolUseID, abortSignal, hookIndex);
          cleanup?.();
          if (isSyncHookJSONOutput_2(json)) {
            logForDebugging(`${name} [callback] returned async response, returning empty output`);
            return {
              command: "callback",
              succeeded: true,
              output: "",
              blocked: false,
            };
          }
          let output =
            hookEvent === "WorktreeCreate" &&
            isSyncHookJSONOutput(json) &&
            json.hookSpecificOutput?.hookEventName === "WorktreeCreate"
              ? json.hookSpecificOutput.worktreePath
              : json.systemMessage || "";
          let blocked = isSyncHookJSONOutput(json) && json.decision === "block";
          emitHookResponse_2(json, name);
          logForDebugging(`${name} [callback] completed successfully`);
          return {
            command: "callback",
            succeeded: true,
            output,
            blocked,
          };
        } catch (error) {
          cleanup?.();
          if (isAbortError(error)) {
            let cancelled_2 = error instanceof StreamClosedAbortError || !!signal?.aborted;
            if (cancelled_2) {
              logForDebugging(
                error instanceof StreamClosedAbortError
                  ? `${name} [callback] cancelled (control stream closed)`
                  : `${name} [callback] cancelled`,
              );
              cancelled = true;
            } else {
              logForDebugging(`${name} [callback] timed out`, {
                level: "error",
              });
              failure ??= "hook_callback_timeout";
            }
            return {
              command: "callback",
              succeeded: false,
              output: "",
              blocked: false,
              ...(cancelled_2 && {
                cancelled: true,
              }),
            };
          }
          let message = error instanceof Error ? error.message : String(error);
          logForDebugging(`${name} [callback] failed to run: ${message}`, {
            level: "error",
          });
          failure ??= "hook_callback_failed";
          return {
            command: "callback",
            succeeded: false,
            output: message,
            blocked: false,
          };
        }
      }
      if (hook.type === "prompt") {
        failure ??= "hook_type_unsupported";
        return {
          command: hook.prompt,
          succeeded: false,
          output: "Prompt stop hooks are not yet supported outside REPL",
          blocked: false,
        };
      }
      if (hook.type === "mcp_tool") {
        let label = `${hook.server}/${hook.tool}`;
        try {
          let result = await runMcpToolHook(
            hook,
            hookEvent,
            hookInput,
            getAppState?.().mcp.clients,
            signal,
            timeoutMs,
          );
          if (result.aborted) {
            failure ??= "hook_cancelled";
            return {
              command: label,
              succeeded: false,
              output: "Hook cancelled",
              blocked: false,
              ...(signal?.aborted && {
                cancelled: true,
              }),
            };
          }
          if (result.error || !result.ok) {
            failure ??= "hook_mcp_tool_failed";
            return {
              command: label,
              succeeded: false,
              output: result.error || "MCP tool returned an error",
              blocked: false,
            };
          }
          let { json, validationError } = parseHookOutput(result.body);
          if (validationError) throw Error(validationError);
          let json_2 = json && isSyncHookJSONOutput(json) ? json : undefined;
          let restricted = json_2 && isRestricted ? restrictPersonalHookAnswer(json_2, hookInput) : json_2;
          let final = restricted && isSyncHookJSONOutput(restricted) ? restricted : undefined;
          let blocked = final?.decision === "block";
          if (final) emitHookMetrics(final.metrics, pluginId, hookEvent);
          emitHookResponse_2(restricted ?? json, name);
          return {
            command: label,
            succeeded: true,
            output: blocked ? final?.reason || "" : result.body,
            blocked,
            watchPaths:
              final?.hookSpecificOutput && "watchPaths" in final.hookSpecificOutput
                ? final.hookSpecificOutput.watchPaths
                : undefined,
            systemMessage: final?.systemMessage,
          };
        } catch (error) {
          let message = error instanceof Error ? error.message : String(error);
          logForDebugging(`${name} [${label}] failed to run: ${message}`, {
            level: "error",
          });
          failure ??= "hook_mcp_exec_failed";
          return {
            command: label,
            succeeded: false,
            output: message,
            blocked: false,
          };
        }
      }
      if (hook.type === "agent") {
        failure ??= "hook_type_unsupported";
        return {
          command: hook.prompt,
          succeeded: false,
          output: "Agent stop hooks are not yet supported outside REPL",
          blocked: false,
        };
      }
      if (hook.type === "function") {
        logError(
          Error(
            `Function hook reached executeHooksOutsideREPL for ${hookEvent}. Function hooks should only be used in REPL context (Stop hooks).`,
          ),
        );
        failure ??= "hook_type_unsupported";
        return {
          command: "function",
          succeeded: false,
          output: "Internal error: function hook executed outside REPL context",
          blocked: false,
        };
      }
      if (hook.type === "http")
        try {
          let httpResult = await execHttpHook(
            hook,
            hookEvent,
            serializedInput,
            signal,
            timeoutMs,
            undefined,
            getManagedHttpHookEnv(hook),
          );
          if (httpResult.aborted) {
            logForDebugging(`${name} [${hook.url}] cancelled`);
            failure ??= "hook_cancelled";
            return {
              command: hook.url,
              succeeded: false,
              output: "Hook cancelled",
              blocked: false,
              ...(signal?.aborted && {
                cancelled: true,
              }),
            };
          }
          if (isWithheldGuardHttpHook(httpResult, hookEvent)) {
            let message = httpHookUnreachableMessage(hookEvent, httpResult.error);
            logForDebugging(`${name} [${hook.url}] ${message}`, {
              level: "error",
            });
            failure ??= "hook_http_request_failed";
            return {
              command: hook.url,
              succeeded: false,
              output: message,
              blocked: true,
            };
          }
          if (httpResult.error || !httpResult.ok) {
            let errMsg = httpResult.error || `HTTP ${httpResult.statusCode} from ${hook.url}`;
            logForDebugging(`${name} [${hook.url}] failed: ${errMsg}`, {
              level: "error",
            });
            failure ??= "hook_http_request_failed";
            return {
              command: hook.url,
              succeeded: false,
              output: errMsg,
              blocked: false,
            };
          }
          let { json: httpJson, validationError: httpValidationError } = parseHttpHookOutput(httpResult.body);
          if (httpValidationError) throw Error(httpValidationError);
          let json = httpJson && isRestricted ? restrictPersonalHookAnswer(httpJson, hookInput) : httpJson;
          if (json && !isSyncHookJSONOutput_2(json))
            logForDebugging(`Parsed JSON output from HTTP hook: ${jsonStringify(json)}`, {
              level: "verbose",
            });
          if (json && isSyncHookJSONOutput(json)) emitHookMetrics(json.metrics, pluginId, hookEvent);
          emitHookResponse_2(json, name);
          let blocked = json && isSyncHookJSONOutput(json) && json.decision === "block";
          let output = blocked
            ? (json && isSyncHookJSONOutput(json) && json.reason) || ""
            : hookEvent === "WorktreeCreate"
              ? json &&
                isSyncHookJSONOutput(json) &&
                json.hookSpecificOutput?.hookEventName === "WorktreeCreate"
                ? json.hookSpecificOutput.worktreePath
                : ""
              : httpResult.body;
          return {
            command: hook.url,
            succeeded: true,
            output,
            blocked: !!blocked,
            systemMessage: json && isSyncHookJSONOutput(json) ? json.systemMessage : undefined,
          };
        } catch (error) {
          let errorMessage = error instanceof Error ? error.message : String(error);
          logForDebugging(`${name} [${hook.url}] failed to run: ${errorMessage}`, {
            level: "error",
          });
          failure ??= "hook_http_exec_failed";
          return {
            command: hook.url,
            succeeded: false,
            output: errorMessage,
            blocked: false,
          };
        }
      let timeoutMs_2 = hook.timeout ? Math.min(hook.timeout * 1000, MAX_TIMER_DELAY_MS) : timeoutMs;
      let hookDisplayText = getHookDisplayText(hook);
      let pluginHookRunner = getPluginHookRunner();
      let needsReady =
        hook.type === "command" && hookOriginLabel !== undefined && pluginHookRunner !== undefined;
      let asyncPlugins = needsReady && !isAsyncHookJSONOutput(hook);
      let { signal: abortSignal, cleanup } = createCombinedAbortSignal(signal, {
        timeoutMs: asyncPlugins ? undefined : timeoutMs_2,
      });
      let ranScript = false;
      let exitedTwo = false;
      try {
        let scriptResolved =
          hook.type === "script"
            ? resolveScriptHook(hook, hookEvent)
            : {
                hook,
                env: undefined,
              };
        let hookProject = getHookProject(session);
        let project =
          untrustedStart !== undefined
            ? {
                originalCwd: untrustedStart,
                projectRoot: EMPTY_PATH_DIR,
              }
            : snapshotRoot === undefined || hookProject === null
              ? hookProject
              : {
                  originalCwd: hookProject.originalCwd,
                  projectRoot: snapshotRoot,
                };
        if (writtenInput === undefined && needsReady)
          writtenInput = {
            sent: writeRemoteHookInput(pluginHookRunner.stdin, hookInput),
          };
        let result = await execCommandHook(
          asyncPlugins
            ? rewriteInputIfMarked(scriptResolved.hook, {
                ...scriptResolved.hook,
                timeout: timeoutMs_2 / 1000,
              })
            : scriptResolved.hook,
          hookEvent,
          name,
          serializedInput,
          writtenInput?.sent,
          claudeEnvContextFrom(hookInput),
          project,
          untrustedStart ??
            (hook.type === "script" ? (project?.projectRoot ?? hookInput.cwd) : hookInput.cwd),
          abortSignal,
          randomUUID(),
          hookIndex,
          pluginRoot,
          pluginId,
          settingsSource,
          skillRoot,
          hook.type === "script" || blocksWhenNonBlockingError(hook, hookEvent),
          scriptResolved.env,
          undefined,
          hookInputSummary(hookInput, undefined),
          hookSourceOf(hook),
          storageV5,
          credentials,
        );
        let cancelledBySignal = signal?.aborted === true && result.stoppedAfterItsTimeout !== true;
        ranScript =
          hook.type !== "script" ||
          didScriptHookRun(result) ||
          (result.aborted === true && cancelledBySignal);
        exitedTwo = result.status === 2 && !result.backgrounded;
        let guardBlock = !ranScript && hook.type === "script" && GUARD_HOOK_EVENTS.has(hookEvent);
        cleanup?.();
        if (result.aborted) {
          logForDebugging(`${name} [${hookDisplayText}] cancelled`);
          failure ??= "hook_cancelled";
          return {
            command: hookDisplayText,
            succeeded: false,
            output: "Hook cancelled",
            blocked: guardBlock,
            ...(cancelledBySignal && {
              cancelled: true,
            }),
          };
        }
        logForDebugging(`${name} [${hookDisplayText}] completed with status ${result.status}`);
        if (!ranScript) {
          failure ??= "hook_did_not_run";
          return {
            command: hookDisplayText,
            succeeded: false,
            output: `script hook did not run (${describeHookDidNotRun(result)})${result.stderr.trim() ? `: ${result.stderr.trim()}` : ""}`,
            blocked: guardBlock,
          };
        }
        let hookStdoutForParsing = getHookStdoutForParsing(result);
        let hookOutput = parseHookOutput(hookStdoutForParsing);
        let validationError = hookOutput.validationError;
        let capturedJson = dropSuspectCaptureJson(result, hookEvent, hookOutput.json);
        let untrustedCaptureReason = getUntrustedCaptureReason(
          result,
          hookEvent,
          hookStdoutForParsing,
          capturedJson,
          (text) => parseHookOutput(text).json,
        );
        if (untrustedCaptureReason !== undefined) {
          failure ??= "hook_stdio_incomplete";
          return {
            command: hookDisplayText,
            succeeded: false,
            output: withHookStderr(untrustedCaptureReason, result.status, result.stderr),
            blocked: PROMPT_GUARD_EVENTS.has(hookEvent),
          };
        }
        let json =
          capturedJson !== undefined && isRestricted
            ? restrictPersonalHookAnswer(capturedJson, hookInput)
            : capturedJson;
        if (validationError && result.status === 2) invalidBlock = true;
        else if (validationError) {
          failure ??= "hook_output_schema_invalid";
          throw Error(withHookStderr(validationError, result.status, result.stderr));
        }
        if (json && !isSyncHookJSONOutput_2(json))
          logForDebugging(`Parsed JSON output from hook: ${jsonStringify(json)}`, {
            level: "verbose",
          });
        if (json && isSyncHookJSONOutput(json)) emitHookMetrics(json.metrics, pluginId, hookEvent);
        emitHookResponse_2(json, name);
        let blockedBody = json && isSyncHookJSONOutput(json) && json.decision === "block";
        let blocked = result.status === 2 || !!blockedBody || guardBlock;
        let output = blockedBody
          ? (json && isSyncHookJSONOutput(json) && json.reason) || result.stderr || ""
          : result.status === 0
            ? result.stdout || ""
            : result.stderr || "";
        let watchPaths =
          json &&
          isSyncHookJSONOutput(json) &&
          json.hookSpecificOutput &&
          "watchPaths" in json.hookSpecificOutput
            ? json.hookSpecificOutput.watchPaths
            : undefined;
        let systemMessage = json && isSyncHookJSONOutput(json) ? json.systemMessage : undefined;
        if (result.status !== 0 && !blocked) failure ??= "hook_nonzero_exit";
        return {
          command: hookDisplayText,
          succeeded: result.status === 0,
          output,
          blocked,
          ...(result.exitedNormally && {
            exitCode: result.status,
          }),
          watchPaths,
          systemMessage,
        };
      } catch (error) {
        cleanup?.();
        let errorMessage = error instanceof Error ? error.message : String(error);
        logForDebugging(`${name} [${hookDisplayText}] failed to run: ${errorMessage}`, {
          level: "error",
        });
        failure ??= "hook_exec_failed";
        return {
          command: hookDisplayText,
          succeeded: false,
          output: errorMessage,
          blocked: GUARD_HOOK_EVENTS.has(hookEvent) && (exitedTwo || (!ranScript && hook.type === "script")),
        };
      }
    },
  );
  let outcomes;
  {
    let indexByHook = new Map(userHooks.map((userHook, hookIndex) => [userHook.hook, hookIndex]));
    using runningHooks =
      userHooks.length === 0
        ? undefined
        : trackRunningHooks({
            hookEvent,
            hooks: userHooks.map(({ hook }) => getHookProgressDisplay(hook)),
            agentId,
            toolName: getToolNameField(hookInput),
          });
    let results = Promise.all(
      matched.map(({ hook }, hookIndex) =>
        hookPromises[hookIndex]
          .then((result) => {
            let final = {
              ...result,
              ...(restrictedIndexes.has(hookIndex) && {
                answerHeld: true,
              }),
            };
            return notRunIndexes.has(hookIndex) ? final : applyBlockOnFailure(hook, final);
          })
          .finally(() => {
            let hookIndex = indexByHook.get(hook);
            if (hookIndex !== undefined) runningHooks?.settle(hookIndex);
          }),
      ),
    );
    outcomes = await (keepalive === noopRelease ? results : results.finally(keepalive));
  }
  if (shouldRunSessionEndHook(hookEvent, signal)) await heldUntilExit();
  if (failure) logFeatureBad(hookFeature(hookEvent), failure);
  else if (cancelled) logFeatureSad(hookFeature(hookEvent), "hook_cancelled");
  else if (invalidBlock) logFeatureSad(hookFeature(hookEvent), "hook_output_schema_invalid_blocked");
  else logFeatureOk(hookFeature(hookEvent));
  for (let pluginId of new Set(matched.map((entry) => entry.pluginId)))
    if (pluginId) recordPluginUsage(pluginId);
  return outcomes;
}
//@ chunk-e6aww6q8.js:3568751-3569073 facade-exports = hasInstructionsLoadedHook (0.849)
/**
 * 是否存在 InstructionsLoaded 钩子（快照、主线程代理钩子、注册钩子、会话钩子、设备钩子）。
 */
function hasInstructionsLoadedHook() {
  let snapshotHooks = getHooksConfigFromSnapshot()?.InstructionsLoaded;
  if (snapshotHooks && snapshotHooks.length > 0) return true;
  if (!shouldAllowManagedHooksOnly()) {
    let registeredHooks = getMainThreadAgentHooks()?.InstructionsLoaded;
    if (registeredHooks && registeredHooks.length > 0) return true;
  }
  let InstructionsLoaded = getRegisteredHooks()?.InstructionsLoaded;
  if (InstructionsLoaded && InstructionsLoaded.length > 0) return true;
  if (
    getPluginSettingsHooks("InstructionsLoaded").length > 0 ||
    getPluginHookRunner()?.owedList("InstructionsLoaded") !== undefined
  )
    return true;
  return hasClassicHookSite("InstructionsLoaded");
}
//@ chunk-e6aww6q8.js:3569073-3569228 layout
async function awaitWithHookTimeout(promise, hookEvent, signal, timeoutMs) {
  if (signal !== undefined || blocksWhenItCannotRunElsewhere(hookEvent)) {
    await promise(signal);
    return;
  }
  let combinedAbortSignal = createCombinedAbortSignal(undefined, {
    timeoutMs,
    refTimer: true,
  });
  try {
    await promise(combinedAbortSignal.signal);
  } finally {
    combinedAbortSignal.cleanup();
  }
}
//@ chunk-e6aww6q8.js:3569228-3570004 facade-exports = parseElicitationHookOutput (0.9)
/**
 * 把 REPL 外钩子结果解析为 elicitation 响应：blocked 或 decision:block 视为阻断，hookSpecificOutput.action/content 作为回答。
 */
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
    let parsed = hookJSONOutputSchema().parse(jsonParse(trimmed));
    let parsed_2 = result.answerHeld
      ? parseHookJsonOutput(parsed, expectedEventName, {
          personal: true,
        }).answer
      : parsed;
    if (isSyncHookJSONOutput_2(parsed_2)) return {};
    if (!isSyncHookJSONOutput(parsed_2)) return {};
    if (parsed_2.decision === "block")
      return {
        blockingError: {
          blockingError: parsed_2.reason || "Elicitation blocked by hook",
          command: result.command,
        },
      };
    let specific = parsed_2.hookSpecificOutput;
    if (!specific || specific.hookEventName !== expectedEventName) return {};
    if (!specific.action) return {};
    let out = {
      response: {
        action: specific.action,
        content: specific.content,
      },
    };
    if (specific.action === "decline")
      out.blockingError = {
        blockingError:
          parsed_2.reason ||
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
  okLogged = false;
  badLogged = false;
}
//@ chunk-e6aww6q8.js:3570039-3570066 layout
var statusLineLogStateByHost; // deferred: uses StatusLineLogState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:3570039", () => {
  statusLineLogStateByHost = new HostScoped(() => new StatusLineLogState());
});
//@ chunk-e6aww6q8.js:3570066-3571131 facade-exports = executeStatusLineCommand (0.656)
/**
 * 执行 statusLine 命令（复用 execCommandHook，事件名 StatusLine，stdin 为状态 JSON），返回非空输出行；禁用钩子或工作区未信任时不执行。
 */
async function executeStatusLineCommand(statusLineInput, signal, timeoutMs, logResult = false) {
  if (shouldDisableAllHooksIncludingManaged()) return;
  let logState = statusLineLogStateByHost.of(statusLineInput.host);
  if (isCustomizationDisabled("statusLine")) return;
  if (shouldSkipHookDueToTrust()) {
    logForDebugging("Skipping StatusLine command execution - workspace trust not accepted");
    return;
  }
  let statusLine = getEffectiveStatusLine(getSettings_DEPRECATED()?.statusLine);
  if (!statusLine || statusLine.type !== "command") return;
  try {
    let jsonInput = jsonStringify(signal);
    let now = Date.now();
    let result = await execCommandHook(
      hasPolicySetting("statusLine")
        ? markRewrittenInput({
            ...statusLine,
          })
        : statusLine,
      "StatusLine",
      "statusLine",
      jsonInput,
      undefined,
      claudeEnvContextFrom(signal),
      getSessionProject(statusLineInput),
      signal.cwd,
      timeoutMs,
      randomUUID(),
    );
    if (result.aborted) return;
    let trimmed = result.stderr.trim();
    if (trimmed) logForDebugging(`StatusLine [${statusLine.command}] stderr: ${trimmed}`);
    if (result.status === 0) {
      if (!logState.okLogged) {
        logState.okLogged = true;
        logFeatureOk("status_line_command");
      }
      let output = result.stdout
        .trim()
        .split(
          `
`,
        )
        .flatMap((line) => line.trim() || []).join(`
`);
      if (output) {
        if (logResult)
          logForDebugging(`StatusLine [${statusLine.command}] completed with status ${result.status}`);
        return output;
      }
    } else if (logResult)
      logForDebugging(`StatusLine [${statusLine.command}] completed with status ${result.status}`, {
        level: "warn",
      });
    if (result.status !== 0 && !logState.badLogged) {
      logState.badLogged = true;
      logFeatureBad(
        "status_line_command",
        result.spawnFailed
          ? "spawn_failed"
          : Date.now() - now >= TOOL_HOOK_EXECUTION_TIMEOUT_MS
            ? "timeout"
            : "nonzero_exit",
      );
    }
    return;
  } catch (error) {
    logForDebugging(`Status hook failed: ${error}`, {
      level: "error",
    });
    if (!logState.badLogged) {
      logState.badLogged = true;
      logFeatureBad("status_line_command", "exec_error");
    }
    return;
  }
}
//@ chunk-e6aww6q8.js:3571131-3571754 facade-exports = executeFileSuggestionCommand (0.843)
/**
 * 执行 fileSuggestion 命令（@ 文件补全），默认 5 秒超时，按行返回候选。
 */
async function executeFileSuggestionCommand(session, input, signal, timeoutMs = 5000) {
  if (shouldDisableAllHooksIncludingManaged()) return [];
  if (isCustomizationDisabled("fileSuggestion")) return [];
  if (shouldSkipHookDueToTrust()) {
    logForDebugging("Skipping FileSuggestion command execution - workspace trust not accepted");
    return [];
  }
  let fileSuggestion = resolveFileSuggestionHook(getSettings_DEPRECATED()?.fileSuggestion);
  if (!fileSuggestion || fileSuggestion.type !== "command") return [];
  let abortSignal = signal || AbortSignal.timeout(timeoutMs);
  try {
    let jsonInput = jsonStringify(input);
    let hook = {
      type: "command",
      command: fileSuggestion.command,
    };
    if (hasPolicySetting("fileSuggestion")) markRewrittenInput(hook);
    let result = await execCommandHook(
      hook,
      "FileSuggestion",
      "FileSuggestion",
      jsonInput,
      undefined,
      claudeEnvContextFrom(input),
      getSessionProject(session),
      input.cwd,
      abortSignal,
      randomUUID(),
    );
    if (result.aborted || result.status !== 0) return [];
    return result.stdout
      .split(
        `
`,
      )
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    logForDebugging(`File suggestion helper failed: ${error}`, {
      level: "error",
    });
    return [];
  }
}
//@ chunk-e6aww6q8.js:3571754-3572702 fingerprint = executeFunctionHook (1)
/**
 * 执行会话 function 钩子（内存回调，参数为消息列表），返回 false 时以 errorMessage 阻断；默认 5 秒超时。
 */
async function executeFunctionHook({ hook, messages, hookName, toolUseID, hookEvent, timeoutMs, signal }) {
  let callbackTimeoutMs = hook.timeout ?? timeoutMs;
  let { signal: abortSignal, cleanup } = createCombinedAbortSignal(signal, {
    timeoutMs: callbackTimeoutMs,
  });
  try {
    if (abortSignal.aborted) {
      cleanup();
      return {
        outcome: "cancelled",
        hook,
      };
    }
    let passed = await new Promise((resolve, reject) => {
      let onAbort = () => reject(Error("Function hook cancelled"));
      abortSignal.addEventListener("abort", onAbort);
      Promise.resolve(hook.callback(messages, abortSignal))
        .then((result) => {
          abortSignal.removeEventListener("abort", onAbort);
          resolve(result);
        })
        .catch((error) => {
          abortSignal.removeEventListener("abort", onAbort);
          reject(error);
        });
    });
    cleanup();
    if (passed)
      return {
        outcome: "success",
        hook,
      };
    return {
      blockingError: {
        blockingError: hook.errorMessage,
        command: "function",
      },
      outcome: "blocking",
      hook,
    };
  } catch (error) {
    cleanup();
    if (
      error instanceof Error &&
      (error.message === "Function hook cancelled" || error.name === "AbortError")
    )
      return {
        outcome: "cancelled",
        hook,
      };
    logError(error);
    return {
      message: createAttachmentMessage_2({
        type: "hook_error_during_execution",
        hookName,
        toolUseID,
        hookEvent,
        content: error instanceof Error ? error.message : "Function hook execution error",
      }),
      outcome: "non_blocking_error",
      hook,
    };
  }
}
//@ chunk-e6aww6q8.js:3572702-3573305 fingerprint = executeHookCallback (0.848)
/**
 * 执行 SDK callback 钩子（hook.callback），结果经 processHookJSONOutput 处理；internal 钩子不产生成功消息。
 */
async function executeHookCallback({
  toolUseID,
  hook,
  hookEvent,
  hookInput,
  signal,
  hookIndex,
  toolUseContext,
}) {
  let context = toolUseContext
    ? {
        getAppState: toolUseContext.getAppState,
        applyAttributionOp: toolUseContext.applyAttributionOp,
        session: toolUseContext.session,
        storageV5: toolUseContext.storageV5,
      }
    : undefined;
  let json = await hook.callback(hookInput, toolUseID, signal, hookIndex, context);
  if (isSyncHookJSONOutput_2(json))
    return {
      outcome: "success",
      hook,
    };
  let processed = processHookJSONOutput({
    json,
    command: "callback",
    hookName: `${hookEvent}:Callback`,
    toolUseID,
    hookEvent,
    expectedHookEvent: hookEvent,
    stdout: undefined,
    stderr: undefined,
    exitCode: undefined,
  });
  let { message, ...rest } = processed;
  return {
    ...rest,
    ...(!(
      hook.internal === true &&
      message?.type === "attachment" &&
      message.attachment.type === "hook_success"
    ) && {
      message,
    }),
    outcome: "success",
    hook,
  };
}
//@ chunk-e6aww6q8.js:3573305-3573644 layout
function getHookNameForTelemetry(hookEvent, matchQuery) {
  if (!matchQuery) return hookEvent;
  if (isToolDetailsLoggingEnabled()) return `${hookEvent}:${matchQuery}`;
  switch (hookEvent) {
    case "PreToolUse":
    case "PostToolUse":
    case "PostToolUseFailure":
    case "PermissionRequest":
    case "PermissionDenied":
      return `${hookEvent}:${sanitizeToolNameForAnalytics(matchQuery)}`;
    case "Elicitation":
    case "ElicitationResult":
      return `${hookEvent}:mcp_server`;
    case "SubagentStart":
    case "SubagentStop":
      return hookEvent;
    default:
      return `${hookEvent}:${matchQuery}`;
  }
}
//@ chunk-e6aww6q8.js:3573644-3574174 fingerprint = getHookDefinitionsForTelemetry (0.758)
/**
 * 把匹配的钩子定义转成遥测用的 {type, command|prompt|name}。
 */
function getHookDefinitionsForTelemetry(matchedHooks) {
  return matchedHooks.map(({ hook }) => {
    if (hook.type === "command")
      return {
        type: "command",
        command: getHookDisplayText(hook),
      };
    else if (hook.type === "prompt")
      return {
        type: "prompt",
        prompt: hook.prompt,
      };
    else if (hook.type === "http")
      return {
        type: "http",
        command: hook.url,
      };
    else if (hook.type === "mcp_tool")
      return {
        type: "mcp_tool",
        command: `${hook.server}/${hook.tool}`,
      };
    else if (hook.type === "script")
      return {
        type: "script",
        command: getHookDisplayText(hook),
      };
    else if (hook.type === "function")
      return {
        type: "function",
        name: "function",
      };
    else if (hook.type === "callback")
      return {
        type: "callback",
        name: "callback",
      };
    return {
      type: "unknown",
    };
  });
}
//@ chunk-e6aww6q8.js:3574174-3574322 affinity
/**
 * PowerShell 钩子里把 ${CLAUDE_PROJECT_DIR} 等改写为 ${env:…}。
 */
function toPowerShellEnvRefs(command) {
  for (let name of ["CLAUDE_PROJECT_DIR", "CLAUDE_PLUGIN_ROOT", "CLAUDE_PLUGIN_DATA"])
    command = command.replaceAll("${" + name + "}", () => "${env:" + name + "}");
  return command;
}
export {
  areHooksEnabled,
  executePermissionRequestHooks,
  managedTierHooks,
  hasSettingsHookForEvent,
  evaluateHookIfPattern,
  execPluginCommandHook,
  GUARD_AND_FEEDBACK_EVENTS,
  HOOK_CHECK_UNAVAILABLE_MESSAGE,
  isHookSourceAllowed,
  shouldSkipHookDueToTrust,
  hasHookForEvent_2,
  executeSubagentStartHooks,
  getNonBlockableHookErrorMessage,
  executeStopHooks,
  createBaseHookInput,
  hookInputCwd,
  executeHooks,
  hasHookForEvent,
  setSessionEndRaiser,
  executeNotificationHooks,
  isManagedHookAllowed,
  getSessionEndHookTimeoutMs,
  executeSessionEndHooks,
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
  registerHookEligibility,
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
  isHookEligible,
  hookMatchQuery,
  SESSION_END_HOOK_TIMEOUT_MS_DEFAULT,
  executeHooksOutsideREPL,
  getSessionEndHookDefaultTimeoutMs,
  hasHookToRun,
  hasNoHookForToolCall,
  keptForObservationContext,
  parseElicitationHookOutput,
  safeHookCwd,
  stripConfinedHookApproval,
};
