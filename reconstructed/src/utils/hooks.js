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
import {
  shouldAllowManagedHooksOnly,
  shouldDisableAllHooksIncludingManaged,
  getHooksConfigFromSnapshot,
  getPolicyHooksFromSnapshot,
  withoutCheckoutSettingsHooks,
  getUserHooksFromSnapshot,
  shouldSkipSessionHooksByPolicy,
  shouldAllowManagedHooksOnlyByPolicy,
  neverSkipSessionHooks,
  noSnapshotOverride,
  getEffectiveStatusLine,
  areDeviceHooksStoodDown,
  areRepoHooksElsewhereStoodDown,
  shouldHoldDeviceHooksByPolicy,
  policySettingsUnreadable,
} from "./hooks/hooksConfigSnapshot.js";
import { isProMaxWithoutSettings } from "../services/remoteManagedSettings/seating.js";
import { withDeadline, sleep, systemClock } from "./sleep.js";
import { ORGANIZATION_ANSWER_POLL_MS } from "./plugins/commandSource.js";
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
  emptyHookOutputState,
  scanHookOutputMarkers,
  strongerExitStatus,
} from "./hooks/hookOutputParsing.js";
import { logForDebugging, createAttachmentMessage_2 } from "./debug.js";
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
import {
  stripPrefix,
  truncateToLength,
  truncateWithCount,
  getFirstLine,
  escapeControlCharsForDisplay,
  plural,
} from "./stringUtils.js";
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
import { pu } from "../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
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
import { withHostEnvRestored, hostWrittenEnvNames } from "./settings/managedSettingsFiles.js";
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
import {
  logFeatureBad,
  hookFeature,
  logFeatureOk,
  logFeatureSad,
} from "../services/analytics/featureTelemetry.js";
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
  permissionRuleValueFromString,
  canonicalToolName,
  legacyToolNamesFor,
  toolNameVariants,
  aliasesFor,
} from "./permissions/permissionRuleParser.js";
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
import { isSafeMode } from "./envUtils.js";
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
import { isCustomizationDisabled } from "./settings/customizationDisabled.js";
import { isVouchedPolicyPluginId } from "./plugins/managedPlugins.js";
import { getPolicyAllowedSet } from "./plugins/pluginPolicy.js";

//@ chunk-e6aww6q8.js:743796-743834 sole-consumer
var PERMISSION_DECISION_RANK = {
  deny: 3,
  ask: 2,
  allow: 1,
  none: 0,
};
//@ chunk-e6aww6q8.js:743834-744006 affinity
function keepAskAndContext(e) {
  let n =
    e.ask === undefined
      ? {}
      : {
          ask: e.ask,
        };
  if (e.updatedInput) n.updatedInput = e.updatedInput;
  if (e.additionalContext) n.additionalContext = e.additionalContext;
  return n;
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
async function aggregatePreToolHookResults(e, n, r) {
  let s = {
    kind: "none",
  };
  let h;
  let y;
  for await (let Z of e) {
    let {
      permissionBehavior,
      hookPermissionDecisionReason,
      heldForServedCall,
      blockingError,
      updatedInput,
      rewriterKind,
      additionalContexts,
      permissionDisplay,
      hookPluginId,
      ...lt
    } = Z;
    if (blockingError && !(blockingError.hookDidNotFinish && s.kind === "deny"))
      s = {
        kind: "deny",
        reason: getPreToolHookBlockingMessage(`PreToolUse:${n}`, blockingError),
      };
    let Je = PERMISSION_DECISION_RANK[s.kind];
    switch (permissionBehavior) {
      case "deny":
        if (Je < PERMISSION_DECISION_RANK.deny)
          s = {
            kind: "deny",
            reason: hookPermissionDecisionReason ?? "denied",
          };
        break;
      case "ask":
        if (Je < PERMISSION_DECISION_RANK.ask)
          s = {
            kind: "ask",
            reason: hookPermissionDecisionReason ?? "",
            held: heldForServedCall === true,
          };
        break;
      case "allow":
        if (Je < PERMISSION_DECISION_RANK.allow)
          s = {
            kind: "allow",
          };
        break;
      case "defer":
        r({
          permissionBehavior,
          hookSource: lt.hookSource,
        });
        break;
      case "passthrough":
      case undefined:
        break;
    }
    if (updatedInput) h = updatedInput;
    if (additionalContexts && additionalContexts.length > 0) y = (y ?? []).concat(additionalContexts);
    if (Object.keys(lt).some((key) => key !== "hookSource")) r(lt);
  }
  let S = s;
  if (S.kind === "ask" && S.held)
    r({
      heldForServedCall: true,
      hookPermissionDecisionReason: S.reason,
    });
  let w = S.kind === "deny";
  let L = S.kind === "ask";
  let G = S.kind === "allow";
  let q = w
    ? {
        deny: S.reason,
      }
    : L
      ? {
          ask: S.reason,
        }
      : G
        ? {
            allow: true,
          }
        : {};
  if (h) q.updatedInput = h;
  if (y) q.additionalContext = y;
  return q;
}
//@ chunk-e6aww6q8.js:745372-745846 layout
/**
 * 跑一轮 PreToolUse 钩子并收集：合并结果、原样 yields、唯一的 ask、输入改写记录；钩子流抛错时把 deny 原因交给回调后再抛。
 */
async function collectPreToolHookPass(e, tool, r) {
  let s = [];
  let h = [];
  let y = [];
  let S = [];
  let w = await aggregatePreToolHookResults(
    (async function* () {
      try {
        for await (let G of e) {
          if (G.permissionBehavior === "ask") h.push(G);
          if (G.updatedInput !== undefined)
            y.push({
              kind: G.rewriterKind ?? "remote",
              source: G.hookSource,
            });
          yield G;
        }
      } catch (error) {
        S.push(error);
      }
    })(),
    tool,
    (G) => {
      s.push(G);
    },
  );
  if (S.length > 0) {
    if (typeof w.deny === "string")
      r?.({
        thrown: S[0],
        deny: w.deny,
      });
    throw S[0];
  }
  let L = h.length === 1 ? h[0] : undefined;
  return {
    result: w,
    yields: s,
    ...(L && {
      soleAsk: L,
    }),
    ...(y.length > 0 && {
      rewrites: y,
    }),
  };
}
//@ chunk-e6aww6q8.js:745846-746024 layout
var createCorePreToolStage = (e, n, stepRecorder, s) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  async run(h) {
    let y = toolInputOf(h);
    s(undefined);
    let preToolHookPass = await collectPreToolHookPass(
      e(y, {
        managedHooksExcluded: n(y),
      }),
      h.tool,
      s,
    );
    stepRecorder.keep(y, preToolHookPass);
    return preToolHookPass.result;
  },
});
//@ chunk-e6aww6q8.js:746024-746431 layout
function mergePreToolStageResults(e, n) {
  let r = typeof n.deny === "string";
  let s = typeof n.ask === "string";
  let deny = r ? n.deny : e.deny;
  let ask = s ? n.ask : e.ask;
  let S = typeof deny === "string";
  let w = typeof ask === "string";
  let L = e.allow === true || n.allow === true;
  let G = S
    ? {
        deny,
      }
    : w
      ? {
          ask,
        }
      : L
        ? {
            allow: true,
          }
        : {};
  let updatedInput = n.updatedInput ?? e.updatedInput;
  if (updatedInput) G.updatedInput = updatedInput;
  if (e.additionalContext || n.additionalContext)
    G.additionalContext = (e.additionalContext ?? []).concat(n.additionalContext ?? []);
  return G;
}
//@ chunk-e6aww6q8.js:746431-746794 layout
var createManagedPreToolStage = (e, n) => ({
  name: MANAGED,
  isManaged: true,
  budgetMs: 0,
  async run(r, s) {
    let h = toolInputOf(r);
    n.pass ??= await collectPreToolHookPass(
      e(h, {
        managedHooksOnly: true,
      }),
      r.tool,
    );
    let y = n.pass.result;
    if (y.deny !== undefined) return y;
    let updatedInput = y.updatedInput;
    n.passedKey = stableStringifySafe(updatedInput ?? h);
    let L = await s(updatedInput === undefined ? r : toolCallEvent(r.tool, r.tool_use_id, updatedInput));
    let G = L.updatedInput !== undefined && stableStringifySafe(L.updatedInput) !== n.passedKey;
    return mergePreToolStageResults(G ? keepAskAndContext(y) : y, L);
  },
});
//@ chunk-e6aww6q8.js:746794-746939 layout
function createManagedStageController(runSettingsHooks, pass) {
  let r = {
    pass,
    passedKey: undefined,
  };
  return {
    managed: createManagedPreToolStage(runSettingsHooks, r),
    pass: () => r.pass,
    covers: (s) => r.passedKey !== undefined && stableStringifySafe(s) === r.passedKey,
  };
}
//@ chunk-e6aww6q8.js:746939-747101 layout
function createCoreStageController(runSettingsHooks, covers) {
  let stepRecorder = createStepRecorder();
  let s;
  return {
    core: createCorePreToolStage(runSettingsHooks, covers, stepRecorder, (y) => {
      s = y;
    }),
    runs: stepRecorder,
    deniedBefore: (y) =>
      s !== undefined && typeof y === "object" && y !== null && s.thrown === y ? s.deny : undefined,
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
var moduleUnadmittedListener = createValueSlot();
//@ chunk-e6aww6q8.js:747501-747514 layout
var admissionChangedListener = createValueSlot();
//@ chunk-e6aww6q8.js:747514-747808 layout
function applyAdmissionText(admissionText) {
  let pluginRegistry = getPluginRegistry();
  if (pluginRegistry.admissionText === admissionText) return false;
  pluginRegistry.admissionText = admissionText;
  let filtered = pluginRegistry.loadedModules.filter((loadedModule) => !isModuleAdmitted(loadedModule));
  for (let loadedModule of pluginRegistry.loadedModules.filter(isModuleAdmitted))
    loadedModule.judgedUnder = admissionText;
  for (let s of filtered)
    try {
      moduleUnadmittedListener.get()?.(s.name);
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
function notifyModsRejudged(e) {
  let pluginRegistry = getPluginRegistry();
  let any = pluginRegistry.loadedModules.some((loadedModule) => !isModuleAdmitted(loadedModule));
  let s = any && !pluginRegistry.isJudgedAgainTold;
  pluginRegistry.isJudgedAgainTold = any;
  if (s) e(MODS_OFF_POLICY_CHANGED_MESSAGE);
}
//@ chunk-e6aww6q8.js:749551-749767 layout
/**
 * managed settings 指纹变化后重新判定已加载的 mods，超时等待后通知用户被关掉的 mods。
 */
function rejudgeLoadedMods(reload, tell, r) {
  let pluginRegistry = getPluginRegistry();
  if (pluginRegistry.admissionText === null) return null;
  refreshModAdmission();
  if (pluginRegistry.loadedModules.every(isModuleAdmitted)) {
    pluginRegistry.isJudgedAgainTold = false;
    return null;
  }
  return withDeadline(Promise.resolve().then(reload).catch(logError), ORGANIZATION_ANSWER_POLL_MS, r)
    .then(() => notifyModsRejudged(tell))
    .catch(logError);
}
//@ chunk-e6aww6q8.js:749767-749899 layout
var hasConfiguredHooksForEvent = (e) =>
  (getHooksConfigFromSnapshot()?.[e]?.length ?? 0) > 0 ||
  (getMainThreadAgentHooks()?.[e]?.length ?? 0) > 0 ||
  (getRegisteredHooks()?.[e] ?? []).some((n) => "pluginRoot" in n || "deviceOwner" in n);
//@ chunk-e6aww6q8.js:749899-750089 layout
/**
 * 钩子子进程退出后等待 stdio 安静的窗口（500ms）与上限（10s），以及 PROMPT_GUARD_EVENTS（输出不可信时按阻断处理的事件集合）。
 */
var STDIO_QUIET_WINDOW_MS = 500;
var STDIO_SETTLE_CAP_MS = 1e4;
var PROMPT_GUARD_EVENTS = new Set([
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
  let w = now();
  let L = streamsSettled.then(() => true);
  for (;;) {
    let G = lastDataAt();
    if ((await withDeadline(L, quietWindowMs, arm)) || now() - w >= capMs) return;
    if (lastDataAt() !== G) continue;
    if (holdOpen?.()) continue;
    await new Promise((resolve) => setImmediate(resolve));
    if (lastDataAt() === G) return;
  }
}
//@ chunk-e6aww6q8.js:750383-750474 layout
function getRunnerJsonStdout(e) {
  let trimmed = e.resultStdout?.trim();
  return trimmed !== undefined && trimmed.startsWith("{") ? trimmed : undefined;
}
//@ chunk-e6aww6q8.js:750474-750558 layout
/**
 * Elicitation/ElicitationResult 钩子以 0、2 以外的码退出。
 */
function isElicitationFailureExit(e, status) {
  return status !== 0 && status !== 2 && (e === "Elicitation" || e === "ElicitationResult");
}
//@ chunk-e6aww6q8.js:750558-750683 layout
/**
 * 判断钩子截获输出是否不可信；Elicitation 系事件非 0/2 退出时改用 stderr 再判一次。
 */
function getUntrustedCaptureReason(e, hookEvent, stdout, s, h) {
  return (
    checkIncompleteCapture(e, hookEvent, stdout, s) ??
    (isElicitationFailureExit(hookEvent, e.status)
      ? checkIncompleteCapture(
          {
            ...e,
            resultStdout: undefined,
          },
          hookEvent,
          e.stderr,
          h(e.stderr),
        )
      : undefined)
  );
}
//@ chunk-e6aww6q8.js:750683-751435 layout
/**
 * stdio 未正常结束（stdioIncomplete/closedWithoutEnd）时，若输出不是惰性 JSON，返回拒绝采信的原因字符串。
 */
function checkIncompleteCapture(e, n, r, s) {
  if (e.status === 2 || e.aborted === true) return;
  if (e.stdioIncomplete !== true && e.stdioClosedWithoutEnd !== true) return;
  if ((s !== undefined && isInertHookOutput(s, n, e.status)) || getRunnerJsonStdout(e) !== undefined) return;
  if (e.stdioClosedWithoutEnd)
    return "hook stdio closed before end-of-stream, so part of its output may have been discarded; refusing to read the capture as a clean verdict";
  if (s !== undefined)
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
]);
var INERT_SPECIFIC_OUTPUT_KEYS = new Set([
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
//@ chunk-e6aww6q8.js:751759-751934 layout
/**
 * 为 UserPromptSubmit/UserPromptExpansion 构造 decision:block + suppressOriginalPrompt 的输出。
 */
function buildPromptBlockOutput(e, reason) {
  if (e !== "UserPromptSubmit" && e !== "UserPromptExpansion") return;
  return {
    decision: "block",
    reason,
    hookSpecificOutput: {
      hookEventName: e,
      suppressOriginalPrompt: true,
    },
  };
}
//@ chunk-e6aww6q8.js:751934-752144 layout
var CONTEXT_ON_SUCCESS_EVENTS = new Set([
  "UserPromptSubmit",
  "UserPromptExpansion",
  "SessionStart",
  "PostModelSwitch",
]);
var BLOCK_AS_FEEDBACK_EVENTS = new Set([
  "Stop",
  "SubagentStop",
  "StopFailure",
  "TaskCompleted",
  "TeammateIdle",
  "PostToolUse",
  "PostToolUseFailure",
]);
//@ chunk-e6aww6q8.js:752144-752284 layout
/**
 * exit 2 且 stdio 不完整时，丢弃非惰性的 JSON 答复。
 */
function dropSuspectCaptureJson(e, hookEvent, json) {
  if (
    e.status === 2 &&
    (e.stdioIncomplete === true || e.stdioClosedWithoutEnd === true) &&
    json !== undefined &&
    !isInertHookOutput(json, hookEvent, e.status)
  )
    return;
  return json;
}
//@ chunk-e6aww6q8.js:752284-752904 layout
/**
 * 判断钩子 JSON 输出是否惰性（不批准、不阻断反馈类事件、不 allow/defer、不 accept、不 retry、不注入上下文），惰性输出即使截获不完整也可采信。
 */
function isInertHookOutput(e, n, status) {
  if ("async" in e) return true;
  if (e.decision === "approve") return false;
  if (e.decision === "block" && BLOCK_AS_FEEDBACK_EVENTS.has(n)) return false;
  for (let key of Object.keys(e)) if (!INERT_TOP_LEVEL_OUTPUT_KEYS.has(key)) return false;
  let hookSpecificOutput = e.hookSpecificOutput;
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
    !(status === 0 && CONTEXT_ON_SUCCESS_EVENTS.has(n))
  )
    return false;
  for (let key of Object.keys(hookSpecificOutput)) if (!INERT_SPECIFIC_OUTPUT_KEYS.has(key)) return false;
  return true;
}
//@ chunk-e6aww6q8.js:752904-752985 layout
/**
 * 守卫类与反馈类事件的并集（去掉 PreToolUse、StopFailure）。
 */
var GUARD_AND_FEEDBACK_EVENTS = new Set(
  [...PROMPT_GUARD_EVENTS, ...BLOCK_AS_FEEDBACK_EVENTS].filter(
    (e) => e !== "PreToolUse" && e !== "StopFailure",
  ),
);
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
  let S = true;
  try {
    let hookJsonReader = createHookJsonReader();
    let syncJsonAnswer = findSyncJsonAnswer(stdout, hookJsonReader);
    if (syncJsonAnswer !== undefined) {
      logForDebugging(`Hooks: Found sync response from ${hook.processId}: ${jsonStringify(syncJsonAnswer)}`);
      let asyncHookOutput = parseAsyncHookOutput(syncJsonAnswer, hook.hookName);
      S = Object.keys(asyncHookOutput).length === 0;
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
  if (S && code === 0 && !stderr.trim()) {
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
var HOOK_DISPATCH_HOLD = "hook-dispatch-hold";
var HOOK_KEEPALIVE_SLACK_MS = 60000;
var MAX_HOOK_KEEPALIVE_MS = 1200000;
var noopRelease = () => {};
var NON_HOLDING_HOOK_EVENTS = new Set(["MessageDisplay", "SessionEnd", "PermissionRequest", "Notification"]);
//@ chunk-e6aww6q8.js:3409474-3410091 sole-consumer
/**
 * 远程会话开启保活时，在钩子执行期间维持会话活动：按钩子超时与并发批次估算上限时长，返回结束函数。
 */
function startHookKeepalive(hookEvent, n, timeoutMs) {
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
    for (let { hook } of n) {
      let Z =
        hook.type === "function"
          ? (hook.timeout ?? timeoutMs)
          : isConsultHook(hook)
            ? hookTimeoutMs(hook, timeoutMs)
            : hook.timeout
              ? hook.timeout * 1000
              : timeoutMs;
      maxTimeoutMs = Math.max(maxTimeoutMs, Z);
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
    let w = Number.isFinite(holdMs) ? holdMs : MAX_HOOK_KEEPALIVE_MS;
    timer = setTimeout(logKeepaliveExpiry, w, release, w);
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
function logKeepaliveExpiry(e, maxMs) {
  logForDiagnosticsNoPII("warn", "session_activity_hook_hold_expired", {
    max_ms: maxMs,
  });
  e();
}
//@ chunk-e6aww6q8.js:3410220-3410263 sole-consumer
var loadArtifactsMcpModule = () => require("./chunk-d5fbj7hf.js");
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
function interpolateHookInput(e, hookInput) {
  let r = (h) => {
    let y = hookInput;
    for (let S of h.split(".")) {
      if (y == null || typeof y !== "object") return;
      y = y[S];
    }
    return y;
  };
  let s = (h) => {
    if (typeof h === "string")
      return h.replace(/\$\{([a-zA-Z_][a-zA-Z0-9_.]*)\}/g, (y, S) => {
        let w = r(S);
        if (w === undefined || w === null) return "";
        return typeof w === "object" ? jsonStringify(w) : String(w);
      });
    if (Array.isArray(h)) return h.map(s);
    if (h !== null && typeof h === "object") {
      let y = {};
      for (let [key, value] of Object.entries(h)) y[key] = s(value);
      return y;
    }
    return h;
  };
  return s(e);
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
    found = getMcpClientsFromAccessor()?.find((Ae) => Ae.name === hook.server);
  if (found?.type === "pending" && !HOOK_EVENT_NAMES.has(hookEvent)) {
    let min = Math.min(timeoutMs, getConnectionTimeoutMs());
    logForDebugging(
      `Hooks: mcp_tool hook for ${hookEvent} is waiting up to ${min}ms (less if the server is retrying) for MCP server '${hook.server}' to finish connecting`,
    );
    let connected = Date.now();
    let Me = await waitForMcpClientReady(hook.server, min, signal);
    if (signal?.aborted)
      return {
        ok: false,
        body: "",
        aborted: true,
      };
    let isMemoryServer = Date.now() - connected;
    if (Me) {
      found = Me;
      logForDebugging(`Hooks: MCP server '${hook.server}' is now ${Me.type} after ${isMemoryServer}ms`);
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
    let Ae = `MCP server '${hook.server}' not connected`;
    logForDebugging(`Hooks: mcp_tool hook skipped \u2014 ${Ae}`, {
      level: "warn",
    });
    return {
      ok: false,
      body: "",
      error: Ae,
    };
  }
  let Z = refuseArtifactsMcpHook(hook.server, found.config) ?? refuseRemoteBrowserHook(found.name);
  if (Z !== null) {
    logForDebugging(`Hooks: mcp_tool hook refused \u2014 ${Z}`, {
      level: "warn",
    });
    return {
      ok: false,
      body: "",
      error: Z,
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
      let Je = `MCP server '${hook.server}' not connected`;
      logForDebugging(`Hooks: mcp_tool hook skipped \u2014 ${Je}`, {
        level: "warn",
      });
      return {
        ok: false,
        body: "",
        error: Je,
      };
    }
    let connectedClient = await ensureConnectedClient(found, {
      signal,
      timeoutMs: Math.min(remainingMs, getConnectionTimeoutMs()),
      context: "mcp_tool hook",
    });
    let Me =
      refuseArtifactsMcpHook(hook.server, connectedClient.config) ??
      refuseRemoteBrowserHook(connectedClient.name);
    if (Me !== null) {
      cleanup();
      logForDebugging(`Hooks: mcp_tool hook refused \u2014 ${Me}`, {
        level: "warn",
      });
      return {
        ok: false,
        body: "",
        error: Me,
        withheld: true,
      };
    }
    let We = isMemoryToolServer_2(connectedClient);
    if (
      We &&
      isMemoryToolAllowed(
        hook.tool,
        accountMemoryServerState(
          [connectedClient],
          accountMemoryState ?? subagentMemoryMode(getRootSession().host),
        ).mode,
      )
    ) {
      cleanup();
      let Je = `The account memory server's ${hook.tool} is not available to a hook in this session`;
      logForDebugging(`Hooks: mcp_tool hook refused \u2014 ${Je}`, {
        level: "warn",
      });
      return {
        ok: false,
        body: "",
        error: Je,
        withheld: true,
      };
    }
    let result = await callMcpTool(
      connectedClient,
      {
        name: hook.tool,
        arguments: args,
        ...(We && {
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
      ? result.content.map((Je) => (Je.type === "text" ? Je.text : `[${Je.type}]`)).join(`
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
    let Ie = errorMessage(error);
    logForDebugging(`Hooks: mcp_tool hook error: ${Ie}`, {
      level: "error",
    });
    return {
      ok: false,
      body: "",
      error: Ie,
    };
  }
}
//@ chunk-e6aww6q8.js:3414118-3414138 sole-consumer
var MEMORY_SERVER_MAX = 50;
var RECONNECT_BUDGET_MS = 5000;
//@ chunk-e6aww6q8.js:3414138-3414416 sole-consumer
async function waitForMcpClientReady(server, n, signal) {
  let s = Date.now() + n;
  let h = false;
  for (;;) {
    let found = getMcpClientsFromAccessor()?.find((w) => w.name === server);
    if (found === undefined || found.type !== "pending") return found;
    if (!h && found.reconnectAttempt !== undefined) {
      s = Math.min(s, Date.now() + RECONNECT_BUDGET_MS);
      h = true;
    }
    let S = s - Date.now();
    if (S <= 0 || signal?.aborted) return;
    await sleep(Math.min(MEMORY_SERVER_MAX, S), signal);
  }
}
//@ chunk-e6aww6q8.js:3414416-3414519 sole-consumer
var HOOK_OUTPUT_INVALID_PREFIX = "Hook JSON output validation failed \u2014 ";
var HOOK_OUTPUT_META_KEYS = new Set(["async", "hookEventName", "behavior"]);
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
    flattened.flatMap((G) => (G.code === "invalid_value" ? G.values.map((q) => jsonStringify(q)) : [])),
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
function isPlainObject_2(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
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
  let joined = mapped.slice(1).map((w) => `  - ${issuePathLabel(w.path)}: ${w.message}`).join(`
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
function formatHookFailureLine(hookEvent, n) {
  let r =
    n
      .split(
        `
`,
      )
      .map((line) => line.trim())
      .find((s) => s.length > 0) ?? "";
  if (r.startsWith(HOOK_OUTPUT_INVALID_PREFIX))
    return `${hookEvent} hook output invalid: ${r.slice(HOOK_OUTPUT_INVALID_PREFIX.length)}`;
  return r ? `${hookEvent} hook failed: ${r}` : `${hookEvent} hook failed to run`;
}
//@ chunk-e6aww6q8.js:3417928-3419240 facade-exports = executePreCompactHooks (0.724)
/**
 * 执行 PreCompact 钩子（matcher = manual/auto）：成功输出（超长截断）合并为 newCustomInstructions，失败与成功信息合成 userDisplayMessage，exit 2/block 的汇成 blockedBy 阻止压缩；子代理只返回 blockedBy。
 */
async function executePreCompactHooks(session, n, r, signal, timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS) {
  if (r.options?.settingsHooksOff === true) return {};
  let y = isDelegatedObservationContext(r.agentContext);
  let hookInput = {
    ...createBaseHookInput(session, hookInputCwd()),
    hook_event_name: "PreCompact",
    trigger: n.trigger,
    custom_instructions: n.customInstructions,
  };
  let results = await executeHooksOutsideREPL({
    session,
    hookInput,
    matchQuery: n.trigger,
    signal,
    timeoutMs,
    agentId: r.agentId,
    storageV5: r.storageV5,
    credentials: r.credentials,
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
  let Z =
    filtered.length > 0
      ? filtered.map((result) => {
          let trimmed = result.output.trim();
          return `[${result.command}]${trimmed ? `: ${trimmed}` : ""}`;
        }).join(`
`)
      : undefined;
  if (y)
    return {
      ...(Z !== undefined && {
        blockedBy: Z,
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
    ...(Z !== undefined && {
      blockedBy: Z,
    }),
  };
}
//@ chunk-e6aww6q8.js:3419240-3419338 facade-exports
/**
 * executePostCompactHooks 的容错包装：非中止错误只上报，返回 {}。
 */
function executePostCompactHooks(session, n, r, signal, timeoutMs) {
  return executePostCompactHooks_2(session, n, r, signal, timeoutMs).catch((error) => {
    if (signal?.aborted) throw error;
    logHookExecutionFailure(error);
    return {};
  });
}
//@ chunk-e6aww6q8.js:3419338-3420130 fingerprint = executePostCompactHooks (0.946)
/**
 * 执行 PostCompact 钩子（输入含 compact_summary），只生成给用户看的成功/失败信息；子代理或关闭钩子时跳过。
 */
async function executePostCompactHooks_2(e, n, r, signal, timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS) {
  if (isDelegatedObservationContext(r.agentContext) || r.options?.settingsHooksOff === true) return {};
  let hookInput = {
    ...createBaseHookInput(e, hookInputCwd()),
    hook_event_name: "PostCompact",
    trigger: n.trigger,
    compact_summary: n.compactSummary,
  };
  let results = await executeHooksOutsideREPL({
    session: e,
    hookInput,
    matchQuery: n.trigger,
    signal,
    timeoutMs,
    agentId: r.agentId,
    storageV5: r.storageV5,
    credentials: r.credentials,
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
  e,
  n,
  filePath,
  { timeoutMs: s = TOOL_HOOK_EXECUTION_TIMEOUT_MS, storageV5: h, credentials: y } = {},
) {
  let hookInput = {
    ...createBaseHookInput(e, hookInputCwd()),
    hook_event_name: "ConfigChange",
    source: n,
    file_path: filePath,
  };
  let results = await executeHooksOutsideREPL({
    session: e,
    hookInput,
    timeoutMs: s,
    matchQuery: n,
    storageV5: h,
    credentials: y,
  });
  if (n === "policy_settings")
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
  e,
  directory,
  r,
  { timeoutMs: s = TOOL_HOOK_EXECUTION_TIMEOUT_MS, storageV5: h, credentials: y } = {},
) {
  let hookInput = {
    ...createBaseHookInput(e, hookInputCwd()),
    hook_event_name: "DirectoryAdded",
    directory,
    source: r,
  };
  let w = await executeHooksOutsideREPL({
    session: e,
    hookInput,
    matchQuery: r,
    timeoutMs: s,
    storageV5: h,
    credentials: y,
  });
  let systemMessages = w.map((G) => G.systemMessage).filter((G) => !!G);
  return {
    results: w,
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
function executeCwdChangedHooks(session, oldCwd, newCwd, s = {}) {
  let hookInput = {
    ...createBaseHookInput(session, hookInputCwd()),
    hook_event_name: "CwdChanged",
    old_cwd: oldCwd,
    new_cwd: newCwd,
  };
  return executeEnvHooks(session, hookInput, s);
}
//@ chunk-e6aww6q8.js:3422177-3422292 facade-exports = executeFileChangedHooks (1)
/**
 * 执行 FileChanged 钩子（file_path/event: change|add|unlink）。
 */
function executeFileChangedHooks(session, filePath, event, s = {}) {
  let hookInput = {
    ...createBaseHookInput(session, hookInputCwd()),
    hook_event_name: "FileChanged",
    file_path: filePath,
    event,
  };
  return executeEnvHooks(session, hookInput, s);
}
//@ chunk-e6aww6q8.js:3422292-3422338 facade-exports
/**
 * executeInstructionsLoadedHooks 的容错包装。
 */
function executeInstructionsLoadedHooks(...e) {
  return executeInstructionsLoadedHooks_2(...e).catch(logHookExecutionFailure);
}
//@ chunk-e6aww6q8.js:3422338-3422713 fingerprint = executeInstructionsLoadedHooks (0.958)
/**
 * 执行 InstructionsLoaded 钩子（CLAUDE.md/规则文件加载时，matcher = load_reason），只观察不阻断。
 */
async function executeInstructionsLoadedHooks_2(e, filePath, memoryType, s, h) {
  let {
    globs,
    triggerFilePath,
    parentFilePath,
    timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
    storageV5,
    credentials,
    agentInfo,
  } = h ?? {};
  let hookInput = {
    ...createBaseHookInput(e, hookInputCwd(), undefined, agentInfo),
    hook_event_name: "InstructionsLoaded",
    file_path: filePath,
    memory_type: memoryType,
    load_reason: s,
    globs,
    trigger_file_path: triggerFilePath,
    parent_file_path: parentFilePath,
  };
  await executeHooksOutsideREPL({
    session: e,
    hookInput,
    timeoutMs,
    matchQuery: s,
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
  n,
  { timeoutMs: r = TOOL_HOOK_EXECUTION_TIMEOUT_MS, storageV5: s, credentials: h, hookOrigin: y } = {},
) {
  let { message, title, notificationType } = n;
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
  return {
    setSessionEndRaiser: e.set,
    raiseSessionEnd: (n) => e.get()?.(n) ?? n.end(),
  };
}
//@ chunk-e6aww6q8.js:3428925-3428939 layout
var sessionEndRaiser = createSessionEndRaiser();
//@ chunk-e6aww6q8.js:3428939-3428967 layout
var raiseSessionEnd = sessionEndRaiser.raiseSessionEnd;
//@ chunk-e6aww6q8.js:3428967-3428999 layout
/**
 * 设置 SessionEnd 触发器（宿主可接管 SessionEnd 钩子的执行时机）。
 */
var setSessionEndRaiser = sessionEndRaiser.setSessionEndRaiser;
//@ chunk-e6aww6q8.js:3428999-3429027 layout
var STARTUP_HOOK_HOLD = "startup-hook-hold";
//@ chunk-e6aww6q8.js:3429027-3429383 facade-exports = executeSessionStartHooks (0.768)
/**
 * 执行 SessionStart 钩子（source = startup/resume/clear/compact/fork，输入含 agent_type/model/session_title），期间持有 startup-hook-hold 活动；返回结果流。
 */
function executeSessionStartHooks(
  e,
  n,
  r,
  s,
  agentType,
  model,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  forceSyncExecution,
  G,
  agentContext,
  selection,
  storageV5,
  credentials,
) {
  let we =
    r !== undefined
      ? {
          id: identityAgentId(r),
          project: e.project,
        }
      : e;
  let hookInput = {
    ...createBaseHookInput(we, hookInputCwd()),
    hook_event_name: "SessionStart",
    source: n,
    agent_type: agentType,
    model,
    session_title: s ?? getCurrentSessionTitle(we.id),
    ...G,
  };
  return runStartupHooksWithHold({
    session: e,
    hookInput,
    matchQuery: n,
    signal,
    timeoutMs,
    forceSyncExecution,
    agentContext,
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
  n,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  forceSyncExecution,
  storageV5,
  credentials,
) {
  let hookInput = {
    ...createBaseHookInput(trigger, hookInputCwd()),
    hook_event_name: "Setup",
    trigger: n,
  };
  startSessionActivity("hook_exec", STARTUP_HOOK_HOLD);
  try {
    yield* executeHooks({
      session: trigger,
      hookInput,
      toolUseID: randomUUID(),
      matchQuery: n,
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
  w,
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
    managedHooksOnly: w?.managedHooksOnly,
    storageV5: toolUseContext.storageV5,
    credentials: toolUseContext.credentials,
  });
}
//@ chunk-e6aww6q8.js:3430348-3430847 facade-exports = executeSessionEndHooks (0.895)
/**
 * 执行 SessionEnd 钩子（matcher = reason），时间预算由 CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS 与钩子 timeout 推出，失败写 stderr，最后清空会话钩子。
 */
async function executeSessionEndHooks(session, n, r) {
  let { sessionHooks, getAppState, signal, storageV5, credentials } = r || {};
  let hookInput = {
    ...createBaseHookInput(session, hookInputCwd()),
    hook_event_name: "SessionEnd",
    reason: n,
  };
  let results = [];
  let end = async () => {
    results = await executeHooksOutsideREPL({
      session,
      sessionHooks,
      getAppState,
      hookInput,
      matchQuery: n,
      signal,
      timeoutMs: getSessionEndHookDefaultTimeoutMs(),
      storageV5,
      credentials,
    });
  };
  await raiseSessionEnd({
    reason: n,
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
        s.server = r.server;
        s.tool = r.tool;
        break;
      case "mcp_task":
        s.server = r.serverName;
        s.tool = r.toolName;
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
    recurring: n.recurring ?? false,
    prompt: truncateWithCount(n.prompt, STOP_HOOK_FIELD_MAX_CHARS),
  }));
}
//@ chunk-e6aww6q8.js:3431639-3431685 facade-exports
/**
 * executeStopFailureHooks 的容错包装。
 */
function executeStopFailureHooks(...e) {
  return executeStopFailureHooks_2(...e).catch(logHookExecutionFailure);
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
  let G = subagentId ? "SubagentStop" : "Stop";
  if (
    isDelegatedObservationContext(toolUseContext.agentContext) ||
    toolUseContext.options.settingsHooksOff === true
  )
    return;
  let q = isWebFetchSubagentContext(toolUseContext.agentContext);
  let sessionId = toolUseContext.agentId ?? toolUseContext.session.id;
  if (!q && !hasHookToRun(G, toolUseContext.sessionHooksRegistry, sessionId)) return;
  if (
    requestPrompt === "turn_end_reactions" &&
    !toolUseContext.sessionHooksRegistry.getFunctionHooks(sessionId, G).get(G)?.length
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
  let we = {
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
        ...we,
      }
    : {
        ...baseHookInput,
        hook_event_name: "Stop",
        stop_hook_active: stopHookActive,
        last_assistant_message: lastAssistantText,
        ...we,
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
    managedHooksOnly: q,
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
  y,
) {
  let S = hookInputCwd();
  let hookInput = {
    ...createBaseHookInput(y.session, S, mode, {
      agentId: y.agentId,
      agentType: y.agentType,
    }),
    hook_event_name: "TeammateIdle",
    teammate_name: teammateName,
    team_name: teamName,
  };
  yield* executeHooks({
    session: y.session,
    hookInput,
    toolUseID: randomUUID(),
    signal,
    timeoutMs,
    toolUseContext: y,
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
  let G = hookInputCwd();
  let hookInput = {
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
  let G = hookInputCwd();
  let hookInput = {
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
    hookInput,
    toolUseID: randomUUID(),
    signal,
    timeoutMs,
    toolUseContext,
  });
}
//@ chunk-e6aww6q8.js:3434211-3434359 layout
var isHeldAskResult = (permissionHookYield, n) =>
  permissionHookYield.permissionBehavior === "ask" &&
  n.some(
    (r) =>
      r.heldForServedCall === true &&
      r.hookPermissionDecisionReason === permissionHookYield.hookPermissionDecisionReason,
  );
//@ chunk-e6aww6q8.js:3434359-3434731 layout
function toPermissionHookYield({ deny, ask, allow, updatedInput, additionalContext }) {
  let y = {};
  if (additionalContext && additionalContext.length > 0) y.additionalContexts = additionalContext;
  if (typeof deny === "string") {
    y.permissionBehavior = "deny";
    y.hookPermissionDecisionReason = deny;
    return y;
  }
  if (typeof ask === "string") {
    y.permissionBehavior = "ask";
    y.hookPermissionDecisionReason = ask;
  } else if (allow === true) y.permissionBehavior = "allow";
  if (updatedInput) y.updatedInput = updatedInput;
  return y;
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
  let w = toolCallEvent(hookInput.tool_name, hookInput.tool_use_id, toolInput);
  let L = awaitHooksRespawnUnlessSessionEnd(
    {
      event: "classic.PreToolUse",
      e: w,
      origin,
    },
    signal,
  );
  if (L !== undefined) {
    let qt = await L.then(
      () => {
        return;
      },
      (error) => (isAbortError(error) ? Promise.reject(error) : error),
    );
    yield* qt !== undefined
      ? [
          toPermissionHookYield({
            deny: errorMessage(qt),
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
  let Ee = await reportPreToolUseChainFailure(
    w,
    [managed, ...hookMembersFor("classic.PreToolUse", origin), core],
    {
      signal,
      origin: hookOriginFromStack(origin),
    },
  ).catch((error) => {
    if (failure !== undefined) failure.deniedBefore = deniedBefore(error);
    throw error;
  });
  let Ae = stableStringifySafe(Ee.updatedInput ?? toolInput);
  let Ie = runs.last(
    ({ input, made }) =>
      stableStringifySafe(input) === Ae ||
      (made.result.updatedInput !== undefined && stableStringifySafe(made.result.updatedInput) === Ae),
  );
  let made = (Ie ?? runs.last())?.made;
  let soleAsk = Ie?.made.soleAsk;
  let ze =
    Ee.ask !== undefined &&
    soleAsk !== undefined &&
    pass()?.result.ask === undefined &&
    Ie?.made.result.ask === Ee.ask &&
    Ee.ask === (soleAsk.hookPermissionDecisionReason ?? "")
      ? soleAsk
      : undefined;
  let permissionDisplay =
    ze !== undefined && Ae === stableStringifySafe(ze.updatedInput ?? Ie?.input)
      ? ze.permissionDisplay
      : undefined;
  let Je =
    Ee.updatedInput === undefined ||
    (ze?.updatedInput !== undefined && stableStringifySafe(ze.updatedInput) === Ae)
      ? ze
      : undefined;
  let combined = (pass()?.yields ?? []).concat(made?.yields ?? []);
  let permissionHookYield = toPermissionHookYield(Ee);
  let Et = [...(pass()?.rewrites ?? []), ...runs.all().flatMap(({ made }) => made.rewrites ?? [])];
  let updatedInput = pass()?.result.updatedInput ?? toolInput;
  let gt = () =>
    Et.length > 0 &&
    runs.all().every(({ input }) => stableStringifySafe(input) === stableStringifySafe(updatedInput)) &&
    Ae === stableStringifySafe(runs.last()?.made.result.updatedInput ?? updatedInput);
  let At =
    permissionHookYield.updatedInput === undefined
      ? undefined
      : (Et.find((qt) => qt.kind !== "local_code")?.kind ?? (gt() ? "local_code" : "mod"));
  let It = new Set([
    ...Et.flatMap((qt) => (qt.source === undefined ? [] : [qt.source])),
    ...(At === "mod" ? ["mod"] : []),
  ]);
  let Yt = At === undefined || It.size === 0 ? undefined : It.size === 1 ? [...It][0] : "mixed";
  yield* combined.filter((qt) => qt.heldForServedCall !== true);
  yield {
    ...permissionHookYield,
    ...(At !== undefined && {
      rewriterKind: At,
    }),
    ...(Yt !== undefined && {
      rewriteSource: Yt,
    }),
    ...(Je?.hookSource !== undefined && {
      hookSource: Je.hookSource,
    }),
    ...(Je?.hookPluginId !== undefined && {
      hookPluginId: Je.hookPluginId,
    }),
    ...(isHeldAskResult(permissionHookYield, combined) && {
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
  let G = () => {
    let toolPermissionContext = getToolPermissionContext(toolUseContext);
    return isBypassPermissionsInEffect(
      findToolByName(toolUseContext.options.tools, toolName),
      toolPermissionContext,
      toolPermissionContext.mode,
    );
  };
  let q = requestPrompt?.managedHooksOnly
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
        G,
        signal,
      );
  let results = [];
  for await (let ke of executePreToolHooks_2(
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
    if (q !== undefined) results.push(ke);
    yield ke;
  }
  let Se = reconcileHeldHookResults(withHeldPermissionBehavior(q, G), results);
  if (Se !== undefined) yield Se;
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
  let Z = hasModuleHookingSite("classic.PreToolUse");
  let Se =
    !requestPrompt?.managedHooksOnly && (pass !== undefined || Z) && isPlainObject_5(toolInput)
      ? toolInput
      : undefined;
  let sessionId =
    !(signal ?? toolUseContext.abortController.signal).aborted && canSkipEmptyClassicDispatch("PreToolUse");
  if (
    (Se === undefined ||
      ((!Z || sessionId) &&
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
      hookInput:
        Ie === undefined
          ? Ee
          : {
              ...Ee,
              tool_input: Ie,
            },
      toolUseID,
      matchQuery: toolName,
      signal,
      timeoutMs,
      toolUseContext,
      managedHooksOnly: Me?.managedHooksOnly ?? requestPrompt?.managedHooksOnly,
      managedHooksExcluded: Me?.managedHooksExcluded,
    });
  }
  if (Se !== undefined) {
    for await (let Ie of runPreToolUseFunctionChain({
      hookInput: Ee,
      toolInput: Se,
      signal: signal ?? toolUseContext.abortController.signal,
      runSettingsHooks: Ae,
      origin: toolUseContext.hookOrigin,
      managedPass: pass,
      failure: toolInputSummary,
    }))
      yield* keptForObservationContext(
        {
          toolUseContext,
          hookInput: Ee,
        },
        stripConfinedHookApproval(Ie, "PreToolUse function-hook chain", Ee, toolUseContext),
      );
    return;
  }
  yield* Ae();
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
  G,
) {
  if (G?.managedHooksOnly && managedTierHooks("PostToolUse") === "none") return;
  if (!G?.managedHooksOnly && hasNoHookForToolCall("PostToolUse", toolName, toolInput, toolUseContext))
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
    managedHooksOnly: G?.managedHooksOnly,
    managedHooksExcluded: G?.managedHooksExcluded,
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
  e,
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
    tool_calls: e,
  };
  let accountMemoryBatch = anyTrustedMemoryToolSafe(
    e.map((L) => L.tool_name),
    updatedToolUseContext.options.tools,
  );
  for await (let L of executeHooks({
    session: updatedToolUseContext.session,
    hookInput,
    toolUseID,
    signal,
    timeoutMs,
    toolUseContext: updatedToolUseContext,
  }))
    yield L.message?.type === "attachment"
      ? {
          ...L,
          message: {
            ...L.message,
            attachment: Object.assign({}, L.message.attachment, {
              accountMemoryBatch,
            }),
          },
        }
      : L;
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
  S,
) {
  let sessionId = S.agentId ?? S.session.id;
  if (!hasHookToRun("UserPromptExpansion", S.sessionHooksRegistry, sessionId)) return;
  let hookInput = {
    ...createBaseHookInput(S.session, hookInputCwd(), mode),
    hook_event_name: "UserPromptExpansion",
    expansion_type: expansionType,
    command_name: commandName,
    command_args: commandArgs,
    command_source: commandSource,
    prompt,
  };
  yield* executeHooks({
    session: S.session,
    hookInput,
    toolUseID: randomUUID(),
    signal: S.abortController.signal,
    timeoutMs: TOOL_HOOK_EXECUTION_TIMEOUT_MS,
    toolUseContext: S,
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
async function executeWorktreeCreateHook(e, name, { storageV5: r, credentials: s } = {}) {
  let hookInput = {
    ...createBaseHookInput(e, getCwd()),
    hook_event_name: "WorktreeCreate",
    name,
  };
  let results = await executeHooksOutsideREPL({
    session: e,
    hookInput,
    timeoutMs: TOOL_HOOK_EXECUTION_TIMEOUT_MS,
    storageV5: r,
    credentials: s,
  });
  let S = firstWorktreePathOutput(results);
  if (S === undefined) {
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
  if (isAbsolute(S))
    return {
      worktreePath: S,
    };
  let sessionProject = getSessionProject(e);
  return {
    worktreePath: resolve_2(
      await safeHookCwd(preferRemoteValue(hookInput.cwd, sessionProject.originalCwd), sessionProject),
      S,
    ),
  };
}
//@ chunk-e6aww6q8.js:3447412-3448547 facade-exports = executeWorktreeRemoveHook (0.427)
/**
 * 执行 WorktreeRemove 钩子：返回 not_configured/removed/failed；失败但目录已不存在时视为已删除。
 */
async function executeWorktreeRemoveHook(e, n, { storageV5: r, credentials: s } = {}) {
  if (!hasWorktreeRemoveHook())
    return {
      kind: "not_configured",
    };
  let hookInput = {
    ...createBaseHookInput(e, getCwd()),
    hook_event_name: "WorktreeRemove",
    worktree_path: n,
  };
  let results = await executeHooksOutsideREPL({
    session: e,
    hookInput,
    timeoutMs: TOOL_HOOK_EXECUTION_TIMEOUT_MS,
    storageV5: r,
    credentials: s,
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
  let [w] = filtered;
  if (w === undefined) {
    if (shouldSkipHookDueToTrust() && (await pathPresence(n)) !== "gone")
      return {
        kind: "failed",
        summary: "left the tree in place (workspace not trusted, so the folder's own hooks did not run)",
      };
    return {
      kind: "removed",
    };
  }
  let L = "";
  for (let line of w.output.split(`
`)) {
    L = printableLabel(line, {
      head: HOOK_ERROR_LINE_HEAD,
      tail: HOOK_ERROR_LINE_TAIL,
    });
    if (L) break;
  }
  let G = L ? ` (${L})` : "";
  let q = w.exitCode !== undefined ? `exited ${w.exitCode}${G}` : `failed${G || " with no output"}`;
  if ((await pathPresence(n)) === "gone") {
    logForDebugging(`WorktreeRemove hook ${q}, but nothing is left at ${n} \u2014 treating it as removed`, {
      level: "warn",
    });
    return {
      kind: "removed",
    };
  }
  return {
    kind: "failed",
    summary: q,
  };
}
//@ chunk-e6aww6q8.js:3448547-3448606 facade-exports
/**
 * SessionEnd 时间预算常量：最小 1.5s、钩子 timeout 上限 60s、env 覆盖上限 1h，以及按宿主保存的待唤醒 asyncRewake 任务集合。
 */
var SESSION_END_HOOK_TIMEOUT_MS_DEFAULT = 1500;
var SESSION_END_HOOK_TIMEOUT_CAP_MS = 60000;
var SESSION_END_ENV_TIMEOUT_CAP_MS = 3600000;
var pendingRewakeHooksByHost = new SessionRootSlot(() => new Set());
//@ chunk-e6aww6q8.js:3448606-3448640 layout
function getPendingRewakeHooks() {
  return pendingRewakeHooksByHost.of(getRootSession());
}
//@ chunk-e6aww6q8.js:3448640-3448662 layout
var REWAKE_DRAIN_TIMEOUT_MS = 30000;
var REWAKE_SUMMARY_MAX_CHARS = 300;
//@ chunk-e6aww6q8.js:3448662-3448727 layout
function squashToSummaryLine(e) {
  return e.trim().replace(/\s+/g, " ").slice(0, REWAKE_SUMMARY_MAX_CHARS);
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
  let e;
  try {
    let policyHooksFromSnapshot = getPolicyHooksFromSnapshot();
    e =
      policyHooksFromSnapshot === "unreadable" ||
      (policyHooksFromSnapshot.SessionEnd ?? []).length > 0 ||
      getManagedHooksForEvent("SessionEnd").length > 0 ||
      getHooksForEvent("SessionEnd").some(
        (r) => "pluginId" in r && typeof r.pluginId === "string" && isManagedPluginId(r.pluginId),
      );
  } catch (error) {
    logForDebugging(
      `Hooks: who defines a SessionEnd hook could not be told, so its time budget is read as the organization's hook reads it: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    e = true;
  }
  return e
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
  let r = 0;
  let s = shouldAllowManagedHooksOnly() ? [] : (getMainThreadAgentHooks()?.SessionEnd ?? []);
  let SessionEnd = getHooksConfigFromSnapshot()?.SessionEnd ?? [];
  let y = [
    ...(shouldOmitCheckoutSessionEndHooks("SessionEnd")
      ? withoutCheckoutSettingsHooks(SessionEnd, "SessionEnd")
      : SessionEnd),
    ...s,
    ...getPluginSettingsHooks("SessionEnd"),
  ];
  for (let S of y)
    for (let hook of S.hooks) if (hook.timeout && hook.timeout * 1000 > r) r = hook.timeout * 1000;
  return Math.max(
    SESSION_END_HOOK_TIMEOUT_MS_DEFAULT,
    Math.min(r, SESSION_END_HOOK_TIMEOUT_CAP_MS),
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
    let Ee = shellCommand.result.then(async (Ie) => {
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
        exitCode: Ie.code,
        outcome: Ie.code === 0 ? "success" : "error",
      });
      let ze;
      if (pluginId) {
        let jsonParseBudget = createJsonParseBudget();
        for (let line of stdout.split(`
`)) {
          let trimmed = line.trim();
          if (!trimmed.startsWith("{") || !jsonParseBudget(trimmed)) continue;
          try {
            let yt = jsonParse(trimmed);
            if ("async" in yt) continue;
            if (isSyncHookJSONOutput(yt)) {
              emitHookMetrics(yt.metrics, pluginId, hookEvent);
              if (
                typeof yt.rewakeSummary === "string" &&
                yt.rewakeSummary.trim() &&
                isOfficialPluginId(pluginId)
              )
                ze = squashToSummaryLine(yt.rewakeSummary);
            }
            break;
          } catch {}
        }
      }
      let lt = Ie.code === 2 && !ranForAccountMemory ? missingScriptThere?.() : undefined;
      let Je =
        lt !== undefined
          ? {
              ...lt,
              output: stderr.trim() ? stderr : stdout,
            }
          : Ie.code === 2
            ? await detectMissingHookScript({
                stdout,
                stderr,
                scriptPaths: (scriptPaths ?? []).map((nt) => nt.path),
              })
            : undefined;
      if (
        lt?.isRepeat ??
        rememberBounded(
          rememberedScriptsRegistry.of(getRootSession().host),
          `${hookName}
${command}`,
          Je?.output,
        )
      ) {
        logForDebugging(
          `Hooks: asyncRewake hook "${hookName}" (${command}) exited 2 again because ${Je?.scriptPath} cannot be opened; already reported, not waking the model`,
          {
            level: "warn",
          },
        );
        return;
      }
      if (Ie.code === 2) {
        let nt;
        let pt;
        let Et;
        if (Je !== undefined) {
          let cutFrom =
            lt?.cutFrom ?? scriptPaths?.find((scriptPath) => scriptPath.path === Je.scriptPath)?.cutFrom;
          let gt = "";
          pt = `${hookEvent} hook could not open ${basename(Je.scriptPath)}`;
          if (cutFrom !== undefined) {
            gt = ` (the hook's command passes ${cutFrom} without quotes, so the shell split it at the space)`;
            pt = `${hookEvent} hook needs quotes around a path with a space (${basename(cutFrom)})`;
          }
          nt = `${hookName} hook could not run: ${Je.scriptPath} cannot be opened${gt}, so its command exited with code 2 without doing any work. This is a broken hook installation, not feedback on your work; it is reported this once and identical repeats are dropped. Interpreter output:`;
          Et = Je.output;
        } else if (ranForAccountMemory) {
          nt = rewakeMessage ?? `Stop hook blocking error from command "${hookName}":`;
          pt = rewakeSummary ?? "Stop hook feedback";
          Et = ACCOUNT_MEMORY_OUTPUT_WITHHELD;
        } else {
          nt = rewakeMessage ?? `Stop hook blocking error from command "${hookName}":`;
          pt = ze ?? rewakeSummary ?? "Stop hook feedback";
          Et = stderr || stdout;
        }
        enqueueHookTaskNotification({
          summary: scrubHookOutputTags_2(pt),
          body: scrubHookOutputTags_2(scrubHookOutputTags(`${nt} ${Et}`)),
          priority: "next",
          stopHookActive: true,
          turnAttribution: "inherit",
        });
      }
    });
    let pendingRewakeHooks = getPendingRewakeHooks();
    pendingRewakeHooks.add(Ee);
    Ee.finally(() => pendingRewakeHooks.delete(Ee));
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
function shouldOmitCheckoutSessionEndHooks(e) {
  if (e !== "SessionEnd" || !getIsNonInteractiveSession()) return false;
  try {
    if (checkHasTrustDialogAccepted()) return false;
  } catch (error) {
    logForDebugging(`Hooks: workspace trust could not be read: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
  logForDebugging(`Leaving out the checkout's ${e} hooks - workspace trust not accepted`);
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
function createBaseHookInput(e, n, permissionMode, toolUseContext) {
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
  let cwd = n ?? "";
  let remoteCall = toolUseContext?.remoteCall;
  if (remoteCall !== undefined)
    return {
      session_id: `served:${(SAFE_CALLER_ID.test(remoteCall.origin.callerSessionId ?? "") ? remoteCall.origin.callerSessionId : undefined) ?? "unknown"}`,
      transcript_path: "",
      cwd,
      permission_mode: permissionMode,
      agent_id: toolUseContext?.agentId,
      effort,
    };
  return {
    session_id: e.id,
    transcript_path: isDiskless() ? "" : getTranscriptPathForSession(e.id),
    cwd,
    scratchpad_dir: isScratchpadEnabled() ? (getScratchpadDir(e.id) ?? undefined) : undefined,
    prompt_id: getPromptId_2() ?? undefined,
    permission_mode: permissionMode,
    agent_id: toolUseContext?.agentId,
    agent_type: agentType,
    effort,
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
  let jsonString = json.trim();
  if (!jsonString.startsWith("{")) {
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
    let r = validateHookJson(jsonString);
    if ("json" in r) return r;
    let s = `${r.validationError}

Expected schema:
${parseHookOutput_2()}`;
    logForDebugging(s);
    return {
      plainText: json,
      validationError: s,
    };
  } catch (error) {
    if (!jsonString.endsWith("}")) {
      logForDebugging(
        `Hook output starts with { but is not a JSON object, treating as plain text: ${errorMessage(error)}`,
      );
      return {
        plainText: json,
      };
    }
    if (isJsonLinesOutput(jsonString)) {
      logForDebugging("Hook output is several JSON documents, treating as plain text");
      return {
        plainText: json,
      };
    }
    let s = `Hook output looks like a JSON object but is not valid JSON \u2014 ${errorMessage(error)}. Emit the payload with a JSON encoder (jq, ConvertTo-Json, json.dumps) rather than string concatenation so backslashes and quotes inside strings are escaped.`;
    logForDebugging(s);
    return {
      plainText: json,
      validationError: s,
    };
  }
}
//@ chunk-e6aww6q8.js:3454517-3454784 layout
function isJsonLinesOutput(e) {
  let filtered = e
    .split(
      `
`,
    )
    .filter((line) => line.trim() !== "");
  if (filtered.length < 2) return false;
  using r = slowLogging`parseHookOutput: json lines (${filtered.length})`;
  return filtered.every((s) => {
    try {
      let h = hookJSONOutputSchema().safeParse(jsonParseRaw(s.trim()));
      return !h.success || Object.keys(h.data).length === 0;
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
    let r = jsonParse(trimmed);
    return typeof r === "object" && r !== null && "async" in r && r.async === true;
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
function isWithheldGuardHttpHook(e, hookEvent) {
  return e.withheld === true && isHttpMcpServeInvocation() && PROMPT_GUARD_EVENTS.has(hookEvent);
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
var loggedMcpOutputProbes = new HostScoped(() => new Set());
//@ chunk-e6aww6q8.js:3455770-3455929 layout
function logUpdatedMcpToolOutputProbe(e) {
  let n = e ? "true" : "false";
  let r = loggedMcpOutputProbes.of(getRootSession().host);
  if (r.has(n)) return;
  r.add(n);
  logEvent("tengu_dead_probe_hook_updated_mcp_tool_output", {
    with_new_field: fromEnum(n),
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
      let s = await storageV5.scopeKind(
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
      if (s.ok)
        switch (s.value.kind) {
          case "absent":
            return false;
          case "directory":
          case "other":
            return true;
          case "link":
            return s.value.linkResolves === true;
          default:
            return s.value;
        }
    }
  }
  return pathExists(pluginRoot);
}
//@ chunk-e6aww6q8.js:3462542-3462582 sole-consumer
function getHookStdoutForParsing(e) {
  return getRunnerJsonStdout(e) ?? e.stdout;
}
//@ chunk-e6aww6q8.js:3462582-3462732 sole-consumer
function replaceTrailingResult(stdout, resultStdout, resultWasString) {
  let s = resultWasString
    ? resultStdout
    : resultStdout +
      `
`;
  if (s === "") return stdout;
  let h = stdout.endsWith(s) ? stdout.slice(0, -s.length) : stdout;
  return h === ""
    ? resultStdout
    : `${h}${
        h.endsWith(`
`)
          ? ""
          : `
`
      }${resultStdout}`;
}
//@ chunk-e6aww6q8.js:3462732-3462840 sole-consumer
function exitedByContract(e) {
  return (
    e.exitedNormally === true && !e.spawnFailed && e.status <= 128 && e.status !== 126 && e.status !== 127
  );
}
//@ chunk-e6aww6q8.js:3462840-3463039 sole-consumer
function didScriptHookRun(e) {
  if (e.backgrounded) return true;
  if (e.runnerConflict && e.status !== 2) return false;
  if (e.runnerExited === true) return e.status <= 255;
  if (e.aborted || e.spawnFailed || e.exitedNormally !== true) return false;
  return false;
}
//@ chunk-e6aww6q8.js:3463039-3463549 sole-consumer
function describeHookDidNotRun(e) {
  if (e.runnerConflict) return "no single verdict (re-runs disagreed, or a malformed result or exit line)";
  if (e.aborted) return "timed out";
  if (e.spawnFailed) return "could not start";
  if (e.exitedNormally !== true || e.runnerStarted) return "killed before it finished";
  if (e.stderr !== undefined && e.stderr.trim() === "")
    return `nothing from the runner reached this process (exit ${e.status}) \u2014 a launcher that redirects the hook's stderr hides its verdict`;
  return `its launcher exited ${e.status} before the hook ran`;
}
//@ chunk-e6aww6q8.js:3463549-3463779 sole-consumer
function guardScriptHookBlock(hook, hookEvent, command, s) {
  if (hook.type !== "script" || !GUARD_HOOK_EVENTS.has(hookEvent)) return;
  let h = `[${command}]: did not run (${s}) \u2014 a ${hookEvent} guard that cannot run blocks`;
  return {
    blockingError: {
      blockingError: h,
      command,
    },
    ...blockingErrorResult(hookEvent, command, h),
    outcome: "blocking",
    hook,
  };
}
//@ chunk-e6aww6q8.js:3463779-3463952 sole-consumer
function writeRemoteHookInput(e, n) {
  try {
    return e(n);
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
function isOversizedHookInput(hookEvent, n) {
  return n.length > hookInputSizeLimit() && isGuardedHookEvent(hookEvent);
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
    let Vs = {
      ...hookOriginLabel,
      hook,
      hookEvent,
      jsonInput: remoteJsonInput,
      hookIndex,
      toolUseID: toolInfo?.toolUseID,
    };
    let _i = (signal, fi) => {
      let Ri = {
        startedAt: systemClock.monotonicNow(),
      };
      let Ja = hook.timeout ? hook.timeout * 1000 : TOOL_HOOK_EXECUTION_TIMEOUT_MS;
      return Promise.race([
        Promise.resolve().then(() =>
          pluginHookRunner.run({
            ...Vs,
            inBackground: fi,
            signal,
            limit: Ri,
          }),
        ),
        new Promise((resolve) => {
          let yr = () => {
            let Kr = !fi && systemClock.monotonicNow() - Ri.startedAt >= Ja;
            resolve({
              ...(blocksWhenItCannotRunElsewhere(hookEvent) &&
              settingsSource !== "projectSettings" &&
              (Kr || !isOwnUserPromptHook(hookEvent, hook, hookOriginLabel))
                ? buildCannotRunElsewhereResult(hookEvent, "remote_run_timed_out")
                : {
                    stdout: "",
                    stderr: "",
                    output: "",
                    status: 1,
                    aborted: true,
                  }),
              ...(Kr && {
                stoppedAfterItsTimeout: true,
              }),
            });
          };
          if (signal.aborted) yr();
          else
            signal.addEventListener("abort", yr, {
              once: true,
            });
        }),
      ]);
    };
    if (isAsyncHookJSONOutput(hook, forceSyncExecution)) {
      let Qr = `async_hook_${randomUUID()}`;
      let abortController = new AbortController();
      let Ri;
      let shellCommand = createRemoteHookTask(
        Qr,
        _i(abortController.signal, true).then((yr) => {
          let missingScript = yr.missingScript;
          Ri =
            settingsSource === "projectSettings" && missingScript !== undefined
              ? {
                  ...missingScript,
                  scriptPath: squashToSummaryLine(missingScript.scriptPath),
                  cutFrom: missingScript.cutFrom && squashToSummaryLine(missingScript.cutFrom),
                }
              : undefined;
          return yr;
        }),
        abortController,
      );
      let Di = backgroundHookProcess({
        processId: Qr,
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
        missingScriptThere: () => Ri,
      });
      if (Di)
        return {
          stdout: "",
          stderr: "",
          output: "",
          status: 0,
          backgrounded: Di,
        };
    }
    let jo = await _i(signal, false).catch((error) => {
      logForDebugging(`Hooks: a hook's run on another machine failed (${errorMessage(error)})`, {
        level: "error",
      });
      return error instanceof NoAnswerInTimeError ? "remote_run_timed_out" : "remote_run_failed";
    });
    if (typeof jo === "string") return buildCannotRunElsewhereResult(hookEvent, jo);
    return {
      ...jo,
      ranElsewhere: true,
      stdout: removeClaudeCodeHintLines(jo.stdout),
      stderr: removeClaudeCodeHintLines(jo.stderr),
      output: removeClaudeCodeHintLines(jo.output),
      ...(jo.aborted !== true &&
        jo.spawnFailed !== true && {
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
  let gt;
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
  let rn = isWindows && !isPowerShell && !isExecForm ? (Vs) => Vs.replaceAll("\\", "/") : (Vs) => Vs;
  let pn =
    wrapCommand === undefined && servedEnv?.startsOutsideProject !== true ? getProjectConfigRoot() : null;
  let projectDir = pn ?? project.projectRoot;
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
  for (let [Vs, _i] of [
    ["CLAUDE_PLUGIN_ROOT", pluginRoot || skillRoot],
    ["CLAUDE_PLUGIN_DATA", pluginRoot],
  ]) {
    if (_i) continue;
    let jo = "${" + Vs + "}";
    if (!hook.command.includes(jo) && !hook.args?.some((arg) => arg.includes(jo))) continue;
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
  if (hook.args !== undefined) {
    let Vs = pluginRoot ?? skillRoot;
    let _i = pluginRoot && pluginId ? pluginId : undefined;
    let jo = (command) => {
      if (!command.includes("${")) return command;
      command = command.replaceAll("${CLAUDE_PROJECT_DIR}", () => projectDir);
      if (Vs) command = command.replaceAll("${CLAUDE_PLUGIN_ROOT}", () => Vs);
      if (_i) command = command.replaceAll("${CLAUDE_PLUGIN_DATA}", () => ensurePluginDataDir(_i));
      if (userConfig) command = substituteUserConfigVariables(command, userConfig);
      return command;
    };
    execArgv = [jo(hook.command), hook.args.map(jo)];
  }
  let dataPath = getHookDisplayText(hook);
  if (isWindows && !isPowerShell && !isExecForm) command = stripShellQuotes(command);
  let Xn = servedEnv === undefined && isRewrittenInput(hook);
  let fo = Xn
    ? withHostEnvRestored(() => ({
        shellPrefix: env.CLAUDE_CODE_SHELL_PREFIX,
        inherited: {
          ...subprocessEnv(),
        },
      }))
    : undefined;
  let To = Xn ? hostOwnedEnvNames() : [];
  if (To.length > 0)
    logForDebugging(
      `Hooks: ${hookName} is the organization's and starts without a person's plugin's $.env.set of ${To.join(", ")}`,
    );
  let bo = Xn ? hostWrittenEnvNames() : [];
  if (bo.length > 0)
    logForDebugging(
      `Hooks: ${hookName} is the organization's and starts without the repository settings' env of ${bo.join(", ")}`,
    );
  let vn =
    servedEnv !== undefined
      ? servedEnv.shellPrefix
      : fo !== undefined
        ? fo.shellPrefix
        : env.CLAUDE_CODE_SHELL_PREFIX;
  let finalCommand = !isPowerShell && !isExecForm && vn ? getGlobBaseDirectory(vn, command) : command;
  let timeoutMs = hook.timeout ? hook.timeout * 1000 : TOOL_HOOK_EXECUTION_TIMEOUT_MS;
  let childEnv = {
    ...(servedEnv !== undefined
      ? mergeHookEnv({
          base: servedEnv.base,
          omit: servedEnv.omit,
          extra: {},
        })
      : (fo?.inherited ?? {
          ...subprocessEnv(),
        })),
    ...envExtra,
    ...claudeSubprocessEnv(envContext),
    CLAUDE_PROJECT_DIR: rn(projectDir),
  };
  let { columns, rows } = process.stdout;
  if (columns) childEnv.COLUMNS = String(columns);
  if (rows) childEnv.LINES = String(rows);
  if (pluginRoot) {
    childEnv.CLAUDE_PLUGIN_ROOT = rn(pluginRoot);
    if (pluginId) childEnv.CLAUDE_PLUGIN_DATA = rn(ensurePluginDataDir(pluginId));
  }
  Object.assign(childEnv, getPluginHookCredentialEnv(pluginId));
  if (userConfig)
    for (let [key, value] of Object.entries(userConfig)) {
      let envKey = key.replace(/[^A-Za-z0-9_]/g, "_").toUpperCase();
      childEnv[`CLAUDE_PLUGIN_OPTION_${envKey}`] = String(value);
    }
  if (skillRoot) childEnv.CLAUDE_PLUGIN_ROOT = rn(skillRoot);
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
  let yo = servedEnv?.spawnCwd === undefined ? pn : null;
  let Ho =
    servedEnv === undefined && cwd !== project.projectRoot
      ? preferRemoteValue(cwd, project.originalCwd)
      : cwd;
  if (yo === null && Ho !== cwd) {
    let Vs = hookNameSeenRegistry.of(getRootSession().host);
    if (!Vs.has(hookEvent)) {
      Vs.add(hookEvent);
      logEvent("tengu_hook_started_in_launch_dir", {
        hook_event: fromEnum(hookEvent),
      });
    }
  }
  let spawnCwd =
    yo === null
      ? await safeHookCwd(Ho, project)
      : await safeHookCwd(yo, {
          originalCwd: yo,
          projectRoot: yo,
        });
  if (servedEnv?.startsOutsideProject === true && spawnCwd !== cwd)
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
  using cs =
    wrapCommand === undefined
      ? undefined
      : await wrapCommand(execArgv ? shellQuoteArgs([execArgv[0], ...execArgv[1]]) : finalCommand);
  if (wrapCommand !== undefined && cs === undefined)
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
  if (cs !== undefined)
    child = spawn(cs.command, [], {
      env: childEnv,
      cwd: spawnCwd,
      shell: true,
      detached,
      windowsHide: true,
      ...hooksSettingForEvent(hookEvent),
    });
  else if (execArgv)
    child = spawn(execArgv[0], execArgv[1], {
      env: childEnv,
      cwd: spawnCwd,
      detached,
      windowsHide: true,
      ...hooksSettingForEvent(hookEvent),
    });
  else if (shellType === "powershell") {
    let Vs = await (Xn
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
    if (!Vs)
      throw Error(
        `Hook "${hook.command}" has shell: 'powershell' but no PowerShell executable (pwsh or powershell) was found on PATH. Install PowerShell, or remove "shell": "powershell" to use bash.`,
      );
    let _i =
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
        ? _i +
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
        : _i;
    child = spawn(Vs, buildPowerShellCommandArgs(cmd), {
      env: childEnv,
      cwd: spawnCwd,
      detached,
      windowsHide: true,
      ...hooksSettingForEvent(hookEvent),
    });
  } else {
    let Vs = isWindows ? getGitBashPathCached() : null;
    if (isWindows && !Vs)
      throw Error(
        `Hook "${hook.command}" requires bash but Git Bash was not found. ${INSTALL_GIT_FOR_WINDOWS}, or ${NO_BASH_FIX_HINT}.`,
      );
    let shell = isWindows ? Vs : true;
    if (isWindows && Vs) prependDirToPathEnv(childEnv, Vs);
    child = spawn(finalCommand, [], {
      env: childEnv,
      cwd: spawnCwd,
      shell,
      detached,
      windowsHide: true,
      ...hooksSettingForEvent(hookEvent),
    });
  }
  let hookTaskOutput = new TaskOutput(`hook_${child.pid}`, null);
  let shellCommand = wrapSpawn(child, signal, timeoutMs, hookTaskOutput);
  let shellCommandTransferred = false;
  let jr = false;
  let Or = !getIsNonInteractiveSession() || getHasStreamingInput();
  if ((hook.async || (hook.asyncRewake && Or)) && !forceSyncExecution) {
    let processId = `async_hook_${child.pid}`;
    logForDebugging(`Hooks: Config-based async hook, backgrounding process ${processId}`);
    let _i = (error) => {
      logForDebugging(
        `Async hook stdin write failed (${getErrnoCode(error) ?? error}); hook command likely exited without reading stdin`,
      );
    };
    child.stdin.on("error", _i);
    try {
      child.stdin.write(
        jsonInput +
          `
`,
        "utf8",
      );
      child.stdin.end();
    } catch (error) {
      _i(error);
    }
    jr = true;
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
              posixShell: !isPowerShell && !isExecForm && !vn,
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
  let Es = 0;
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  let initialResponseChecked = false;
  let asyncResolve = null;
  let childIsAsyncPromise = new Promise((resolve) => {
    asyncResolve = resolve;
  });
  let as = (Vs) => {
    Es = Date.now();
    stderr += Vs;
    output += Vs;
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
  let Vi = (data) => {
    Es = Date.now();
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
            child.stdout.removeListener("data", Vi);
            child.stderr.removeListener("data", as);
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
  child.stdout.on("data", Vi);
  child.stderr.on("data", as);
  let ji =
    cs !== undefined
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
  let Wi = false;
  let ii = false;
  let wa = false;
  let stdoutEndPromise = new Promise((resolve) => {
    child.stdout.once("end", () => {
      Wi = true;
      resolve();
    });
    child.stdout.once("close", () => {
      if (!Wi) wa = true;
      resolve();
    });
  });
  let stderrEndPromise = new Promise((resolve) => {
    child.stderr.once("end", () => {
      ii = true;
      resolve();
    });
    child.stderr.once("close", () => {
      if (!ii) wa = true;
      resolve();
    });
  });
  let stdinWritePromise = jr
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
  let nr = false;
  child.on("exit", () => {
    if (!signal.aborted) nr = true;
  });
  let childClosePromise = new Promise((resolve) => {
    child.on("exit", (code) => {
      (async () => {
        await waitForStdioQuiet({
          streamsSettled: Promise.all([stdoutEndPromise, stderrEndPromise]).then(() => {}),
          lastDataAt: () => Es,
          holdOpen: () => scriptHookAck !== undefined && hookCwd.started && hookCwd.exitStatus === undefined,
        });
        child.stdout.removeListener("data", Vi);
        child.stderr.removeListener("data", as);
        resolve({
          stdout,
          stderr,
          output,
          status: code ?? 1,
          aborted: signal.aborted && !nr,
          ...(code !== null && {
            exitedNormally: true,
          }),
          ...(!(Wi && ii) && {
            stdioIncomplete: true,
          }),
          ...(wa && {
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
    gt = result.status;
    diagAborted = result.aborted ?? false;
    return {
      ...result,
      stdout: removeClaudeCodeHintLines(result.stdout),
      stderr: removeClaudeCodeHintLines(result.stderr),
      output: removeClaudeCodeHintLines(result.output),
    };
  } catch (error) {
    let code = getErrnoCode(error);
    gt = 1;
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
        exit_code: gt,
        aborted: diagAborted,
      });
    ji();
    if (cs !== undefined && shellCommand.status === "running") shellCommand.kill();
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
function buildCannotRunElsewhereResult(hookEvent, n, r = CANNOT_RUN_ELSEWHERE_TEXT) {
  if (
    !blocksWhenItCannotRunElsewhere(hookEvent) ||
    (n !== "unsupported_in_cloud_session" && !isVastPlatypusOn())
  )
    return {
      stdout: "",
      stderr: r,
      output: r,
      status: 1,
      spawnFailed: true,
    };
  let promptBlockOutput = buildPromptBlockOutput(hookEvent, r);
  return {
    stdout: promptBlockOutput !== undefined ? jsonStringify(promptBlockOutput) : "",
    stderr: r,
    output: r,
    status: 2,
    noVerdict: n,
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
function createRemoteHookTask(e, n, abortController) {
  let s = new TaskOutput(e, null);
  let h = {
    status: "backgrounded",
    taskOutput: s,
    background: () => true,
    kill: async () => abortController.abort(),
    cleanup: () => {},
    result: n.then(
      ({ stdout, stderr, status, aborted }) => {
        s.writeStdout(stdout);
        s.writeStderr(stderr);
        h.status = "completed";
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
        let S = CANNOT_RUN_ELSEWHERE_TEXT;
        s.writeStderr(S);
        h.status = "completed";
        return {
          stdout: "",
          stderr: S,
          code: 1,
          interrupted: false,
        };
      },
    ),
  };
  return h;
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
  let we = await execCommandHook(
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
    let Et = errorMessage(error);
    return {
      stdout: "",
      stderr: Et,
      output: Et,
      status: 1,
      spawnFailed: true,
    };
  });
  let { stdout, stderr, output, status, aborted, spawnFailed, stdioIncomplete, stdioClosedWithoutEnd } =
    fitted(we);
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
    (pt) => parseHookOutput(pt).json,
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
    let pt = withHookStderr(untrustedCaptureReason, status, stderr);
    return {
      stdout: "",
      stderr: pt,
      output: pt,
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
    let Et =
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
    let yt = exitTwoMeansMissingScript({
      hookEvent,
      stdout: Et,
      stderr,
      pluginId: plugin?.id,
    })
      ? "hook stdio was cut before end-of-stream on the hook runner; the exit-2 block stands"
      : stderr;
    let promptBlockOutput = buildPromptBlockOutput(hookEvent, yt);
    let At = promptBlockOutput !== undefined ? JSON.stringify(promptBlockOutput) : Et;
    return {
      stdout: At,
      stderr: yt,
      output: At !== stdout || yt !== stderr ? At + yt : output,
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
function evaluateHookIfCondition(e, n, tools, cwd) {
  return matchesHookIfCondition(e, n, tools, cwd, false);
}
//@ chunk-e6aww6q8.js:3481082-3481129 facade-exports
/**
 * 计算钩子 `if` 模式（无法判定时返回 null 表示未知）。
 */
function evaluateHookIfPattern(e, n, r, cwd) {
  return matchesHookIfCondition(e, n, r, cwd, null);
}
//@ chunk-e6aww6q8.js:3481129-3481404 layout
function matchesHookIfCondition(e, hookInput, r, s, h) {
  return runInRemoteCallFrameMain(s, async () => {
    let y = await prepareIfConditionMatcher(hookInput, r);
    if (y === undefined) return h;
    let S = permissionRuleValueFromString(e);
    if (!ruleNamesContainTool(y.names, e, S.toolName)) return h;
    if (!S.ruleContent) return true;
    if (!y.judgeable) return null;
    if (y.patternMatcher === undefined) return h;
    return y.patternMatcher(S.ruleContent);
  });
}
//@ chunk-e6aww6q8.js:3481404-3481466 facade-exports
/**
 * 判断 PreToolUse 的 matcher 是否覆盖某工具（空 matcher 覆盖全部）。
 */
function preToolUseMatcherCoversTool(matcher, n) {
  return (
    !matcher || matchesPattern(canonicalToolName(n), matcher, HOOK_EVENTS_WITH_MATCHER.has("PreToolUse"))
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
function parseMatcherToolNames(e, n, r, s = false) {
  if (!(n ? /^[a-zA-Z0-9_|, -]+$/ : /^[a-zA-Z0-9_|]+$/).test(e)) return;
  return e
    .split(n ? /[|,]/ : "|")
    .map((y) => y.trim())
    .filter(Boolean)
    .flatMap((y) => (s ? [y] : toolNameVariants(canonicalToolName(y), r)));
}
//@ chunk-e6aww6q8.js:3481783-3481901 facade-exports
/**
 * 判断钩子 matcher 是否匹配该事件输入：取事件的匹配字段（工具名、source、trigger 等），没有字段或没有 matcher 时为真；工具名不命中时再试 MCP 前缀变体。
 */
function hookMatcherMatches(e, matcher, r) {
  let s = hookMatchQuery(e);
  if (s === undefined || !matcher) return true;
  let hookMatcher = makeHookMatcher(e, matcher, r);
  return hookMatcher(s) || getMcpPrefix(s, matcher, undefined).some(hookMatcher) || false;
}
//@ chunk-e6aww6q8.js:3481901-3482036 layout
function makeHookMatcher(e, n, r) {
  return (s) =>
    matchesPattern(
      s,
      stripModelContextSuffix(e.hook_event_name, n),
      HOOK_EVENTS_WITH_MATCHER.has(e.hook_event_name),
      r,
      undefined,
      "tool_input" in e ? e.tool_input : undefined,
    );
}
//@ chunk-e6aww6q8.js:3482036-3482244 facade-exports = isToolReferenceWithName (1)
/**
 * 若 matcher 只在工具名的 MCP 前缀变体上命中，返回把 tool_name 改成命中变体的事件输入副本，否则原样返回；让钩子看到它所匹配的名字。
 */
function forwardedUnderMatchingToolName(e, matcher, r) {
  let s = hookMatchQuery(e);
  if (s === undefined || !matcher || !("tool_name" in e)) return e;
  let hookToolInput = getHookToolInput(e);
  let hookMatcher = makeHookMatcher(e, matcher, r);
  let S = hookMatcher(s) ? undefined : getMcpPrefix(s, matcher, hookToolInput).find(hookMatcher);
  if (S === undefined) return e;
  return (
    (S === monitorCommandAsBash(s, hookToolInput) && withMatchedToolName(e)) || {
      ...e,
      tool_name: S,
    }
  );
}
//@ chunk-e6aww6q8.js:3482244-3482427 layout
function withMatchedToolName(e) {
  if (!("tool_name" in e) || !("tool_input" in e)) return;
  let n = monitorCommandAsBash(e.tool_name, getHookToolInput(e));
  let commandAndDescription = getCommandAndDescription(e.tool_input);
  return n === undefined || commandAndDescription === undefined
    ? undefined
    : {
        ...e,
        tool_name: n,
        tool_input: commandAndDescription,
      };
}
//@ chunk-e6aww6q8.js:3482427-3482525 layout
function matchedToolNameInput(e, hookInput) {
  return e.throughFamilyOnly === true && e.matcherMetThroughOtherName === true
    ? withMatchedToolName(hookInput)
    : undefined;
}
//@ chunk-e6aww6q8.js:3482525-3482675 layout
function stripModelContextSuffix(e, n) {
  if (e !== "PreModelSwitch" && e !== "PostModelSwitch") return n;
  let replaced = n.replace(/\[[12]m\](?=\s*(?:[|,]|$))/gi, "");
  return replaced.trim() === "" ? n : replaced;
}
//@ chunk-e6aww6q8.js:3482675-3483665 facade-exports
/**
 * 取各钩子事件用于 matcher 匹配的字段：工具类事件用 tool_name，UserPromptExpansion 用 command_name，SessionStart/ConfigChange/DirectoryAdded 用 source，Setup/PreCompact/PostCompact 用 trigger，模型切换用目标模型，Notification 用 notification_type，SessionEnd 用 reason，Elicitation 用服务器名，FileChanged 用文件 basename 等；无匹配字段的事件返回 undefined。
 */
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
      return isRecognizedModelKey(n) ? n : undefined;
    }
    case "PostModelSwitch": {
      let n = hookModelMatchKey(e.to_model);
      return isRecognizedModelKey(n) ? n : undefined;
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
      return basename(e.file_path);
    default:
      return;
  }
}
//@ chunk-e6aww6q8.js:3483665-3484024 layout
/**
 * 支持 matcher 字段的钩子事件名集合。
 */
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
  if (!/^[a-zA-Z0-9_|, -]+$/.test(serverName)) return false;
  return serverName
    .split(/[|,]/)
    .map((n) => n.trim())
    .some((n) => n.startsWith("mcp__") && !n.slice(5).includes("__"));
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
  let s =
    serverName
      .split(/[|,]/)
      .map((h) => h.trim())
      .find((h) => h.startsWith("mcp__") && !h.slice(5).includes("__")) ?? serverName;
  logForDebugging(
    `Hook matcher \`${s}\` matches no tool (it is compared as an exact string). To match all tools from this server, use \`${s}__.*\`. See CHANGELOG v2.1.195.`,
    {
      level: "warn",
    },
  );
}
//@ chunk-e6aww6q8.js:3484558-3484692 layout
function getFamilyParentToolName(e, n) {
  let r = n === undefined ? undefined : findToolByName(n, e);
  if (r !== undefined) return r.mcpInfo === undefined ? r.familyParentToolName : undefined;
  return splitToolParentOf(e);
}
//@ chunk-e6aww6q8.js:3484692-3484778 layout
function isCliOwnedMcpTool(e) {
  return e?.mcpInfo?.cliOwned === true || e?.mcpInfo?.standsInForBuiltIn === true;
}
//@ chunk-e6aww6q8.js:3484778-3485017 layout
/**
 * 计算 hook matcher 匹配用的工具族名（父工具名与 hookMatcherFamilyNames）。
 */
function getHookMatcherFamilyNames(e, n, r) {
  let s = [];
  let familyParentToolName = getFamilyParentToolName(e, n);
  if (familyParentToolName !== undefined) s.push(familyParentToolName);
  let y = n === undefined ? undefined : findToolByName(n, e);
  if (y !== undefined) {
    if (y.mcpInfo === undefined || isCliOwnedMcpTool(y)) s.push(...(y.hookMatcherFamilyNames?.(r) ?? []));
  } else {
    let S = splitToolByAction(e, r);
    if (S !== undefined) s.push(S);
  }
  return s;
}
//@ chunk-e6aww6q8.js:3485017-3485087 layout
function hookMatchQueries(e, hookToolInput) {
  let r = monitorCommandAsBash(e, hookToolInput);
  let s = denyOrAskNamesFor(e);
  return r === undefined ? s : [...s, r];
}
//@ chunk-e6aww6q8.js:3485087-3485222 layout
function getHookToolInput(hookInput) {
  return (hookInput.hook_event_name === "PreToolUse" || hookInput.hook_event_name === "PermissionRequest") &&
    "tool_input" in hookInput
    ? hookInput.tool_input
    : undefined;
}
//@ chunk-e6aww6q8.js:3485222-3485384 layout = getMcpPrefix (1)
function getMcpPrefix(e, matcher, hookToolInput) {
  let s = hookMatchQueries(e, hookToolInput);
  return matcher === undefined || !/\(\?<?!|\[\^/.test(matcher)
    ? s
    : s.filter((h) => matcher.includes(h.startsWith("mcp__") ? h.slice(0, h.indexOf("__", 5) + 2) : h));
}
//@ chunk-e6aww6q8.js:3485384-3485915 fingerprint = matchesPattern (1)
/**
 * 判断 matcher 是否匹配：空或 * 全匹配；简单名单（A|B）精确匹配名字及别名；否则当正则匹配工具名、旧名和 MCP 名。
 */
function matchesPattern(e, matcher, hasMatcher, toolAliases, h, toolInput) {
  if (!matcher || matcher === "*") return true;
  let matcherToolNames = parseMatcherToolNames(matcher, hasMatcher, toolAliases);
  let hookMatcherFamilyNames = getHookMatcherFamilyNames(e, h, toolInput);
  if (matcherToolNames !== undefined)
    return (
      matcherToolNames.includes(e) ||
      false ||
      hookMatcherFamilyNames.some((hookMatcherFamilyName) => matcherToolNames.includes(hookMatcherFamilyName))
    );
  try {
    let L = checkHookMatcherForCloud(matcher);
    if (L.test(e)) return true;
    if (
      ANCHORED_ALTERNATION_RE.test(matcher) &&
      hookMatcherFamilyNames.some((hookMatcherFamilyName) => L.test(hookMatcherFamilyName))
    )
      return true;
    if (
      h !== undefined &&
      isCliOwnedMcpTool(findToolByName(h, e)) &&
      (hookMatcherFamilyNames.length > 2
        ? hookMatcherFamilyNames.some((hookMatcherFamilyName) => L.test(hookMatcherFamilyName))
        : hookMatcherFamilyNames.length > 0 && L.test(hookMatcherFamilyNames.at(-1) ?? ""))
    )
      return true;
    for (let G of legacyToolNamesFor(e)) if (L.test(G)) return true;
    for (let legacyName of aliasesFor(e, toolAliases)) if (L.test(legacyName)) return true;
    return false;
  } catch (error) {
    if (error instanceof MatcherUnsupportableError) throw error;
    logForDebugging(`Invalid regex pattern in hook matcher: ${matcher}`);
    return false;
  }
}
//@ chunk-e6aww6q8.js:3485915-3485974 layout
function ruleNamesContainTool(names, n, toolName) {
  if (names.includes(canonicalToolName(toolName))) return true;
  return false;
}
//@ chunk-e6aww6q8.js:3485974-3486233 layout
async function createIfConditionMatcher(hookInput, tools, r = false) {
  let s = await prepareIfConditionMatcher(hookInput, tools, r);
  if (s === undefined) return;
  let { names, patternMatcher, judgesPatterns } = s;
  return (ifCondition, L) => {
    let parsed = permissionRuleValueFromString(ifCondition);
    if (!ruleNamesContainTool(names, ifCondition, parsed.toolName)) return false;
    if (!parsed.ruleContent) return true;
    if (L) return judgesPatterns;
    return patternMatcher !== undefined && patternMatcher(parsed.ruleContent);
  };
}
//@ chunk-e6aww6q8.js:3486233-3486825 fingerprint = prepareIfConditionMatcher (0.754)
/**
 * 为 if 条件准备匹配器：只对 PreToolUse/PostToolUse/PostToolUseFailure/PermissionRequest/PermissionDenied 生效，用工具的 preparePermissionMatcher 对输入求值。
 */
async function prepareIfConditionMatcher(hookInput, n, r = false) {
  if (
    hookInput.hook_event_name !== "PreToolUse" &&
    hookInput.hook_event_name !== "PostToolUse" &&
    hookInput.hook_event_name !== "PostToolUseFailure" &&
    hookInput.hook_event_name !== "PermissionRequest" &&
    hookInput.hook_event_name !== "PermissionDenied"
  )
    return;
  let s = undefined;
  let tool = s ?? (n && findToolByName(n, hookInput.tool_name));
  let y = s ? hookInput.tool_name : canonicalToolName(hookInput.tool_name);
  let input = tool?.inputSchema.safeParse(hookInput.tool_input);
  let patternMatcher =
    !r && input?.success && tool?.preparePermissionMatcher
      ? await tool.preparePermissionMatcher(input.data)
      : undefined;
  return {
    names: [
      y,
      ...getHookMatcherFamilyNames(y, n, hookInput.tool_input),
      ...hookMatchQueries(y, getHookToolInput(hookInput)),
    ],
    patternMatcher,
    judgeable: input?.success === true,
    judgesPatterns: tool?.preparePermissionMatcher !== undefined,
  };
}
//@ chunk-e6aww6q8.js:3486825-3486989 layout
function getRewriterKindForHook(hook, n) {
  return n === undefined ||
    isCcsTenant() ||
    n.deviceForwarded === true ||
    getHookOriginLabel(n) !== undefined ||
    (n.sdkHost === true && n.hostOwnsStdin !== true)
    ? "remote"
    : getHookRewriterKind(hook, n.registeredInSession === true);
}
//@ chunk-e6aww6q8.js:3486989-3487226 layout
function getHookIdentityKey(matchedHook) {
  if (matchedHook.hook.type === "callback" || matchedHook.hook.type === "function") return matchedHook.hook;
  let n =
    matchedHook.hook.type === "prompt" || matchedHook.hook.type === "agent"
      ? `${matchedHook.hook.type}\x00${matchedHook.hook.prompt}\x00${matchedHook.hook.if ?? ""}`
      : getHookDedupPayload(matchedHook.hook);
  return n === undefined ? undefined : hookDedupKey(matchedHook, n);
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
function logServedHookHeld(e, type, r, s, h) {
  logEvent("tengu_remote_tool_serve_hook_held", {
    event: fromEnum(e),
    hook_type: fromEnum(type),
    reason: fromEnum(r),
    ...(s !== undefined && {
      sub_reason: fromEnum(s),
    }),
    ...(h !== undefined && {
      unavailable: fromEnum(h),
    }),
    outcome: fromEnum(e === "PreToolUse" ? "ask" : "skipped"),
  });
}
//@ chunk-e6aww6q8.js:3487892-3488998 layout
/**
 * 为云端服务调用（served call）准备钩子运行环境：可达根目录、自有设置来源、env、home、spawnCwd、shellPrefix、MCP 服务器配置查询。
 */
async function buildServedCallHookEnv(remoteCall, storageV5, boundRequestPrompt) {
  let s = remoteCall.origin.launchDir ?? getCwd();
  let h = await remoteCall.reach.current();
  let y = getMcpClientsFromAccessor() ?? boundRequestPrompt?.mcp.clients ?? [];
  let mcpServer = (We) => {
    let config = y.find((Je) => Je.name === We)?.config;
    if (config === undefined) return;
    let lt =
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
      ...(lt !== undefined && {
        stdio: lt,
      }),
    };
  };
  let mapped = h.map(normalizeCommandForPlatform);
  let L = await settingsSourcesInReach(mapped, storageV5, remoteCall.reach.distrustedSources);
  let filtered = SETTING_SOURCES.filter((We) => !L.has(We));
  let attached = remoteCall.reach.envAtAttach;
  let beforeSettings = getLatchedPreSettingsEnvSnapshot();
  let Se = await hookScriptInReach(remoteCall.reach.legacyEnvAtAttach, mapped);
  let ownEnv = Object.assign(
    {},
    Se ?? {},
    ...filtered.map((We) => settingsEnvForHookChild(getSettingsForSource(We)?.env, We)),
  );
  let we = subprocessEnv();
  let Ee = mergeHookEnv_2({
    attached,
    beforeSettings,
    ownEnv,
    childrenSee: (We) => Object.hasOwn(we, We),
  });
  let hookProgramOnPath = await resolveHookProgramOnPath(mapped, Ee, we);
  if (hookProgramOnPath.omit.length > 0)
    logForDebugging(`Hooks: a served call's hooks run without ${hookProgramOnPath.omit.join(", ")}`);
  let options = resolveOptions(Ee);
  let spawnCwd = await resolveServedSpawnCwd(options, mapped, s, storageV5);
  return {
    roots: mapped,
    ownSources: filtered,
    env: hookProgramOnPath,
    home: options,
    spawnCwd,
    shellPrefix: hookProgramOnPath.base.CLAUDE_CODE_SHELL_PREFIX,
    mcpShellPrefix: env.CLAUDE_CODE_SHELL_PREFIX,
    mcpPath: subprocessEnv().PATH ?? "",
    launchDir: s,
    projectDir: remoteCall.reach.projectDir,
    mcpServer,
    ...(storageV5 !== undefined && {
      storageV5,
    }),
  };
}
//@ chunk-e6aww6q8.js:3488998-3489165 layout
async function resolveServedSpawnCwd(options, n, r, s) {
  if (
    !isAbsolute(options) ||
    anyPairMatches([options, await realpathOrSelf_2(options)].map(normalizeCommandForPlatform), n)
  )
    return getFilesystemRoot(r);
  let h = await statPathKind(options, s, PathSpace.home);
  return h !== "absent" && h !== undefined && h.directory ? options : getFilesystemRoot(r);
}
//@ chunk-e6aww6q8.js:3489165-3489571 facade-exports
/**
 * 找出哪些设置来源文件可被（云端会话）写到，返回不可信来源集合。
 */
async function settingsSourcesInReach(e, n, distrustedSources = new Set()) {
  let s = async (y) => {
    if (REPO_DIR_SETTING_SOURCES.has(y)) return true;
    let settingsFilePathForSource = getSettingsFilePathForSource(y);
    if (settingsFilePathForSource === undefined) return false;
    if (
      anyPairMatches(
        [settingsFilePathForSource, await realpathOrSelf_2(settingsFilePathForSource)].map(
          normalizeCommandForPlatform,
        ),
        e,
      )
    )
      return true;
    if (y === "policySettings") return false;
    let w = await statPathKind(
      settingsFilePathForSource,
      y === "userSettings" ? undefined : n,
      PathSpace.workspace,
    );
    return w === "absent" ? false : w === undefined || w.nlink > 1;
  };
  let results = await Promise.all(
    SETTING_SOURCES.map(async (y) => (distrustedSources.has(y) || (await s(y)) ? [y] : [])),
  );
  for (let y of results.flat()) distrustedSources.add(y);
  return new Set(distrustedSources);
}
//@ chunk-e6aww6q8.js:3489571-3490043 layout
async function statPathKind(e, n, r) {
  if (isStorageV5Enabled() && n !== undefined) {
    let stats = await n.hostFiles.stat(
      r(isAbsolute(e) ? e : joinKeepingTrailingSep(getFsImplementation().cwd(), e)),
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
  return stat(e).then(
    (s) => ({
      file: s.isFile(),
      directory: s.isDirectory(),
      nlink: s.nlink,
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
async function judgeHookForServedCall(e, hookEvent, servedHookEnv) {
  let { hook } = e;
  let { home } = servedHookEnv;
  if (hook.type !== "command" && hook.type !== "http" && hook.type !== "mcp_tool" && hook.type !== "script")
    return NOT_HELD;
  if (
    e.pluginRoot === undefined &&
    e.skillRoot === undefined &&
    isNotFromOwnSettings(hook, hookEvent, e.matcherTexts ?? [], servedHookEnv.ownSources)
  )
    return {
      held: "project_configured",
    };
  let y = getPlatform() === "windows";
  if (y && hook.type === "command")
    return {
      held: "windows_unparsed",
    };
  let S = async (q, Z = "script") => {
    let Se = await realpathAllowMissing(q);
    if (Se === "unreadable") return "unreadable";
    if (
      anyPairMatches(
        [q, ...(Se === "absent" ? [] : [Se])].map(normalizeCommandForPlatform),
        servedHookEnv.roots,
      )
    )
      return "in_reach";
    if (Z !== "directory" && Se !== "absent") {
      let ke = await statPathKind(Se, servedHookEnv.storageV5, PathSpace.workspace);
      if (ke === undefined) return "unreadable";
      if (ke !== "absent" && (!ke.file || (Z === "script" && ke.nlink > 1))) return "linked";
    }
    return;
  };
  if (
    y &&
    hook.type === "script" &&
    (!isAbsolutePlatformPath(servedHookEnv.spawnCwd) ||
      (await realpathAllowMissing(servedHookEnv.spawnCwd)) === "absent" ||
      (await S(servedHookEnv.spawnCwd, "directory")) !== undefined)
  )
    return {
      held: "start_directory",
    };
  let w = e.pluginRoot ?? e.skillRoot;
  if (w !== undefined) {
    let q = await S(w, "directory");
    if (q !== undefined)
      return q === "linked"
        ? {
            held: "unreadable",
            cause: "linked_file",
          }
        : {
            held: q,
          };
  }
  if (hook.type === "mcp_tool") {
    let q = servedHookEnv.mcpServer(hook.server);
    if (q?.scope === "project")
      return {
        held: "in_reach",
      };
    if (q === undefined || !["user", "local", "enterprise", "managed", "claudeai"].includes(q.scope ?? ""))
      return {
        held: "unreadable",
      };
    if (q.stdio === undefined) return NOT_HELD;
    if (y)
      return {
        held: "windows_unparsed",
      };
    if (servedHookEnv.mcpShellPrefix || servedHookEnv.shellPrefix)
      return {
        held: "unreadable",
      };
    let Z = analyzeHookCommand(
      {
        command: q.stdio.command,
        args: q.stdio.args ?? [],
      },
      {
        home,
        projectDir: servedHookEnv.projectDir,
        hookCwd: servedHookEnv.launchDir,
        defaultShell: "bash",
        shellPrefix: undefined,
      },
    );
    if (Z.kind === "opaque")
      return {
        held: "unreadable",
      };
    let PATH = servedHookEnv.env.base.PATH ?? "";
    let ke = async (Ae) => resolveProgramOnPathInReach(q.stdio.command, Ae, servedHookEnv.roots);
    let we = async (Ae) =>
      (await resolveHookCommand(Ae, PATH, servedHookEnv.roots)) ??
      (servedHookEnv.mcpPath === PATH
        ? undefined
        : await resolveHookCommand(Ae, servedHookEnv.mcpPath, servedHookEnv.roots));
    if (Z.interpreter !== null) {
      if (
        (isAbsolute(q.stdio.command)
          ? await S(q.stdio.command, "program")
          : await Promise.all([ke(PATH), ke(servedHookEnv.mcpPath)]).then(([Me, We]) =>
              Me === undefined || Me === "in_reach" || We === undefined || We === "in_reach" || Me !== We
                ? "in_reach"
                : undefined,
            )) !== undefined
      )
        return {
          held: "unreadable",
          cause: "program_in_reach",
        };
      let Ie = isAbsolute(q.stdio.command) ? await we(q.stdio.command) : undefined;
      if (Ie !== undefined)
        return Ie === "unreadable"
          ? {
              held: "unreadable",
            }
          : {
              held: "unreadable",
              cause: Ie,
            };
    } else {
      let Ae = await we(Z.resolvedPath);
      if (Ae !== undefined)
        return Ae === "unreadable"
          ? {
              held: "unreadable",
            }
          : {
              held: "unreadable",
              cause: Ae,
            };
    }
    let Ee = await S(Z.resolvedPath);
    return Ee === undefined
      ? NOT_HELD
      : Ee === "linked"
        ? {
            held: "unreadable",
            cause: "linked_file",
          }
        : {
            held: Ee,
          };
  }
  if (hook.type === "script") {
    let launchCommand = getLaunchCommand({
      pinToCurrentBinary: true,
    });
    if (!isAbsolute(launchCommand.cmd))
      return {
        held: "unreadable",
      };
    let Z = [];
    for (let prefixArg of launchCommand.prefixArgs) {
      let index = prefixArg.indexOf("=");
      let Ie = prefixArg.startsWith("-") && index !== -1 ? prefixArg.slice(index + 1) : undefined;
      if (isAbsolute(prefixArg)) Z.push(prefixArg);
      else if (Ie !== undefined && isAbsolute(Ie)) Z.push(Ie);
      else if (!/^(?:-[A-Za-z0-9]|--[A-Za-z][\w-]*)$/.test(prefixArg))
        return {
          held: "unreadable",
        };
    }
    let Se = [[launchCommand.cmd, "program"], ...Z.map((Ee) => [Ee, "script"])];
    for (let [Ee, Ae] of Se) {
      let Ie = await S(Ee, Ae);
      if (Ie !== undefined)
        return {
          held: "unreadable",
          cause: Ie === "linked" ? "linked_file" : "program_in_reach",
        };
      let hookCommand = await resolveHookCommand(Ee, servedHookEnv.env.extra.PATH ?? "", servedHookEnv.roots);
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
    if (hook.file === undefined) return NOT_HELD;
    let ke;
    try {
      ke = expandScriptHookPathVars(anchorScriptHookPath(hook.file), {
        projectDir: servedHookEnv.projectDir,
        pluginRoot: w,
        pluginData:
          e.pluginRoot !== undefined && e.pluginId !== undefined ? pluginDataDirPath(e.pluginId) : undefined,
      });
    } catch {
      ke = undefined;
    }
    if (ke === undefined)
      return {
        held: "unreadable",
      };
    let we = await S(ke);
    if (we !== undefined)
      return we === "linked"
        ? {
            held: "unreadable",
            cause: "linked_file",
          }
        : {
            held: we,
          };
    return NOT_HELD;
  }
  if (hook.type !== "command") return NOT_HELD;
  let L =
    w === undefined
      ? {
          hook,
          projectDir: servedHookEnv.projectDir,
        }
      : rebasePluginRootForJudge(hook, w, servedHookEnv.projectDir);
  if (L === undefined)
    return {
      held: "unreadable",
    };
  let G;
  for (let hookCwd of [servedHookEnv.launchDir]) {
    let Z = analyzeHookCommand(L.hook, {
      home,
      projectDir: L.projectDir,
      hookCwd,
      defaultShell: "bash",
      shellPrefix: servedHookEnv.shellPrefix,
    });
    if (Z.kind === "opaque")
      return {
        held: "unreadable",
      };
    if (!isAnchoredCommandPath(Z.rawPath))
      return {
        held: "in_reach",
      };
    let Se = await S(Z.resolvedPath);
    if (Se !== undefined)
      return Se === "linked"
        ? {
            held: "unreadable",
            cause: "linked_file",
          }
        : {
            held: Se,
          };
    if (Z.interpreter === null) {
      let hookCommand = await resolveHookCommand(
        Z.resolvedPath,
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
    let ke = hook.args !== undefined ? L.hook.command : L.hook.command.trim().split(/[ \t]+/, 1)[0];
    if (ke !== undefined && isAbsolute(ke)) {
      let Ee = await S(ke, "program");
      if (Ee !== undefined)
        return {
          held: "unreadable",
          cause:
            Ee === "linked" ? "linked_file" : Ee === "in_reach" ? "program_in_reach" : "program_unresolved",
        };
      let hookCommand = await resolveHookCommand(
        ke,
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
      ke ?? Z.interpreter,
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
    if (hook.args !== undefined && !hook.command.includes("/")) G = programOnPathInReach;
  }
  return G === undefined
    ? NOT_HELD
    : {
        program: G,
      };
}
//@ chunk-e6aww6q8.js:3494919-3495341 layout
function rebasePluginRootForJudge(hook, n, projectDir) {
  if (hook.args !== undefined) {
    let s = (command) => command.replaceAll("${CLAUDE_PLUGIN_ROOT}", () => n);
    return {
      hook: {
        ...hook,
        command: s(hook.command),
        args: hook.args.map(s),
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
      command: hook.command.replace(/\$(\{?)CLAUDE_PLUGIN_ROOT\b/g, (s, h) => `$${h}CLAUDE_PROJECT_DIR`),
    },
    projectDir: n,
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
function isPersonalRestrictedHook(e, hookEvent) {
  let { hook } = e;
  if (
    !isPersonalConfigRestricted() ||
    (hook.type !== "command" && hook.type !== "http" && hook.type !== "mcp_tool" && hook.type !== "script")
  )
    return false;
  if (e.personal === true) return true;
  if (hook.type === "command" && getHookOriginLabel(e) !== undefined) return false;
  if (e.pluginRoot !== undefined || e.deviceForwarded === true || e.sdkHost === true) return false;
  if (e.skillRoot !== undefined || e.projectRoot !== undefined) return false;
  let hookDedupPayload = getHookDedupPayload(hook);
  return (getUserHooksFromSnapshot()[hookEvent] ?? []).some((h) =>
    h.hooks.some((hook) => getHookDedupPayload(hook) === hookDedupPayload),
  );
}
//@ chunk-e6aww6q8.js:3496298-3496734 layout
function restrictPersonalHookAnswer(e, hookInput) {
  if (isSyncHookJSONOutput_2(e)) return e;
  let { answer, report } = parseHookJsonOutput(e, hookInput.hook_event_name, {
    personal: true,
    ...("tool_name" in hookInput && {
      toolName: hookInput.tool_name,
    }),
    ...("tool_input" in hookInput && {
      toolInput: jsonParse(jsonStringify(hookInput.tool_input)),
    }),
    ...("tool_response" in hookInput &&
      hookInput.tool_response !== undefined && {
        toolResponse: jsonParse(jsonStringify(hookInput.tool_response)),
      }),
  });
  if (report.dropped.length > 0)
    logForDebugging(
      `${hookInput.hook_event_name} hook from your own files: ignored ${report.dropped.join(", ")} (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG)`,
    );
  return answer;
}
//@ chunk-e6aww6q8.js:3496734-3496810 layout
function isSyncHookConfig(hook) {
  return hook.type !== "command" || (hook.async !== true && hook.asyncRewake !== true);
}
//@ chunk-e6aww6q8.js:3496810-3497556 layout
function dedupeHooksPreferSettings(e, hookEvent, settingsHookSets) {
  let s = new Map(e);
  if (!isPersonalConfigRestricted()) return markContestedContinue(e, Array.from(s.values()));
  let flattened = (getUserHooksFromSnapshot()[hookEvent] ?? []).flatMap((L) => L.hooks);
  let y = new Map();
  for (let [L, G] of e) {
    let q =
      settingsHookSets.settings.has(G.hook) &&
      G.pluginRoot === undefined &&
      G.skillRoot === undefined &&
      G.projectRoot === undefined &&
      G.deviceForwarded !== true &&
      G.sdkHost !== true &&
      flattened.some((Se) => isDeepStrictEqual(Se, G.hook));
    let Z = y.get(L);
    if (q && (Z === undefined || isSyncHookConfig(G.hook) || !isSyncHookConfig(Z.hook))) y.set(L, G);
  }
  if (y.size === 0) return markContestedContinue(e, Array.from(s.values()));
  let flattened_2 = ["flagSettings", "policySettings"].flatMap((L) =>
    (getSettingsForSource(L)?.hooks?.[hookEvent] ?? []).flatMap((G) => G.hooks),
  );
  let list = Array.from(s, ([L, G]) => {
    let q = y.get(L);
    if (
      q === undefined ||
      (!isSyncHookConfig(q.hook) && isSyncHookConfig(G.hook)) ||
      flattened_2.some((Z) => isDeepStrictEqual(Z, G.hook))
    )
      return G;
    return settingsHookSets.settings.has(G.hook) ||
      settingsHookSets.checkout.has(G.hook) ||
      !isSyncHookConfig(G.hook)
      ? q
      : G;
  });
  return markContestedContinue(e, list);
}
//@ chunk-e6aww6q8.js:3497556-3497620 layout
function isOnFailureContinue(hook) {
  return "onFailure" in hook && hook.onFailure === "continue";
}
//@ chunk-e6aww6q8.js:3497620-3497874 layout
function markContestedContinue(e, n) {
  if (!n.some((h) => isOnFailureContinue(h.hook))) return n;
  let r = new Map(e.map(([h, y]) => [y, h]));
  let s = new Set(e.flatMap(([h, y]) => (isOnFailureContinue(y.hook) ? [] : [h])));
  return n.map((h) => {
    let y = r.get(h);
    return isOnFailureContinue(h.hook) && (y === undefined || s.has(y))
      ? {
          ...h,
          continueIsContested: true,
        }
      : h;
  });
}
//@ chunk-e6aww6q8.js:3497874-3498149 layout
function findSettingsHookDefinition(hook, hookEvent, r, s) {
  if (hook.type === "callback" || hook.type === "function") return;
  let hookDedupPayload = getHookDedupPayload(hook);
  if (hookDedupPayload === undefined) return;
  for (let y of [...s].reverse())
    for (let S of getSettingsForSource(y)?.hooks?.[hookEvent] ?? []) {
      if (!r.includes(S.matcher ?? "")) continue;
      let found = S.hooks.find((hook) => getHookDedupPayload(hook) === hookDedupPayload);
      if (found !== undefined) return found;
    }
  return;
}
//@ chunk-e6aww6q8.js:3498149-3498307 layout
function isNotFromOwnSettings(hook, n, r, ownSources) {
  let h = (y, S) =>
    y.some((w) =>
      (getSettingsForSource(w)?.hooks?.[n] ?? []).some(
        (L) => (L.matcher ?? "") === S && L.hooks.some((hook_2) => isDeepStrictEqual(hook_2, hook)),
      ),
    );
  return !r.some((y) => h(ownSources, y));
}
//@ chunk-e6aww6q8.js:3498307-3498478 layout
function isManagedSnapshotHook(e, n) {
  try {
    let policyHooksFromSnapshot = getPolicyHooksFromSnapshot();
    if (policyHooksFromSnapshot === "unreadable") return true;
    let hookDedupPayload = getHookDedupPayload(e);
    return (
      hookDedupPayload !== undefined &&
      (policyHooksFromSnapshot[n] ?? []).some((h) =>
        h.hooks.some(
          (hook) => getHookDedupPayload(hook) === hookDedupPayload && httpHookHeadersEqual(hook, e),
        ),
      )
    );
  } catch {
    return true;
  }
}
//@ chunk-e6aww6q8.js:3498478-3498658 layout
function markHookOwnership(finalHooks, hookEvent, r) {
  for (let { hook, pluginRoot, pluginId, skillRoot } of finalHooks) {
    if (skillRoot !== undefined || hook.type === "function") continue;
    let w = pluginRoot !== undefined;
    if ((!w && r) || isOrganizationHook(hook, hookEvent, w, pluginId)) markRewrittenInput(hook);
    else unmarkRewrittenInput(hook);
  }
}
//@ chunk-e6aww6q8.js:3498658-3498853 layout
function isOrganizationHook(hook, n, r, s) {
  try {
    return r ? s !== undefined && isManagedPluginId(s) : isManagedSnapshotHook(hook, n);
  } catch (error) {
    logForDebugging(
      `Hooks: whose a ${n} hook is could not be told, so it starts as the organization's: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return true;
  }
}
//@ chunk-e6aww6q8.js:3498853-3498991 layout
function httpHookHeadersEqual(hook, n) {
  return (
    hook.type !== "http" ||
    n.type !== "http" ||
    (isDeepStrictEqual(hook.headers ?? {}, n.headers ?? {}) &&
      isDeepStrictEqual(hook.allowedEnvVars ?? [], n.allowedEnvVars ?? []))
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
function resolveScriptHook(hook, hookEvent) {
  if (!isRewrittenInput(hook)) return runScriptHookUnsupported(hook, hookEvent);
  let r = withHostEnvRestored(() => runScriptHookUnsupported(hook, hookEvent));
  markRewrittenInput(r.hook);
  return r;
}
//@ chunk-e6aww6q8.js:3499361-3499641 layout
async function getServedSessionOwnSources(e) {
  if (isDiskless()) return POLICY_ONLY_SOURCES;
  try {
    let n = await hookPathRoots();
    let r = await settingsSourcesInReach(n, e);
    return {
      roots: n,
      ownSources: SETTING_SOURCES.filter((s) => !r.has(s)),
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
async function getUntrustedFolderSources(storageV5) {
  let n = {
    roots: [POSIX_SEP_2],
    ownSources: ["userSettings", "flagSettings", "policySettings"],
    untrustedFolder: true,
  };
  let originalCwdOrNull = getOriginalCwdOrNull();
  let options = resolveOptions(getLatchedPreSettingsEnvSnapshot() ?? subprocessEnv());
  if (getProjectConfigRoot() !== null)
    return {
      ...n,
      ownSources: [],
    };
  if (
    originalCwdOrNull !== null &&
    (await realpathOrSelf_2(originalCwdOrNull)) === (await realpathOrSelf_2(options))
  )
    return n;
  let h = getFlagSettingsInline() === null && getSettingsFilePathForSource("flagSettings") !== undefined;
  let y = [POSIX_SEP_2];
  let S = h;
  try {
    if (!isDiskless()) {
      y = await hookPathRoots();
      let w = await settingsSourcesInReach(y, storageV5);
      S = h && w.has("flagSettings");
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
    ...n,
    ownSources: S ? [] : n.ownSources,
    untrustedStart: await resolveServedSpawnCwd(options, y, originalCwdOrNull ?? getCwd(), storageV5),
  };
}
//@ chunk-e6aww6q8.js:3500305-3500991 layout
async function isWithheldFolderHook(e, n, { roots, ownSources, untrustedFolder }) {
  let { hook } = e;
  if (hook.type !== "command" && hook.type !== "http" && hook.type !== "mcp_tool" && hook.type !== "script")
    return false;
  let S = e.pluginRoot ?? e.skillRoot;
  let w =
    S === undefined
      ? isNotFromOwnSettings(hook, n, e.matcherTexts ?? [], ownSources)
      : anyPairMatches([S, await realpathOrSelf_2(S)].map(normalizeCommandForPlatform), roots);
  if (w && untrustedFolder)
    logForDebugging(
      `Hooks: ${hook.type} hook not run for ${n}: the workspace is not trusted, and the person's own settings do not define it`,
    );
  else if (w) {
    logForDebugging(
      `Hooks: ${hook.type} hook not run for ${n}: it comes from the launch folder's settings, and this process serves a cloud session with no terminal`,
    );
    if (!loadedManagedKeyGroupsList().includes("hook"))
      logFeatureOk("remote_served_folder_config_withheld", {
        arm: fromEnum("hook_dispatch"),
        event: fromEnum(n),
      });
    markManagedKeyGroup("hook");
  }
  return w;
}
//@ chunk-e6aww6q8.js:3500991-3501095 layout
async function filterWithheldFolderHooks(e, hookEvent, r) {
  let results = await Promise.all(e.map((h) => isWithheldFolderHook(h, hookEvent, r)));
  return e.filter((h, y) => !results[y]);
}
//@ chunk-e6aww6q8.js:3501095-3501152 layout
function isAnchoredCommandPath(rawPath) {
  return /^(?:\/|~|\$\{?[A-Za-z_])/.test(rawPath);
}
//@ chunk-e6aww6q8.js:3501152-3501213 layout
function getFilesystemRoot(e) {
  return getPlatform() === "windows" ? win32.parse(e).root : "/";
}
//@ chunk-e6aww6q8.js:3501213-3501296 layout
async function realpathOrSelf_2(e) {
  let n = await realpathAllowMissing(e);
  return n === "absent" || n === "unreadable" ? e : n;
}
//@ chunk-e6aww6q8.js:3501296-3501667 layout
function holdHookForServedCall(hook, hookEvent, held, cause, h) {
  logForDebugging(
    `Hooks: ${hook.type} hook not run for a call served to a cloud session (${hookEvent}, ${cause ?? held})`,
  );
  logServedHookHeld(hookEvent, hook.type, held, cause, h);
  return hookEvent === "PreToolUse"
    ? {
        hook,
        outcome: "success",
        permissionBehavior: "ask",
        hookPermissionDecisionReason:
          h === "person_read_rules" ? READ_LIMIT_BLOCKED_QUESTION : HOOK_NOT_RUN_QUESTIONS[held],
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
function redactServedBlockingError(e) {
  if (e.blockingError === undefined) return e;
  let n = `${e.hook.type} hook`;
  let r = `[${e.blockingError.command}]:`;
  let blockingError = e.blockingError.blockingError;
  let permissionRequestResult = e.permissionRequestResult;
  return {
    ...e,
    blockingError: {
      blockingError: blockingError.startsWith(r) ? `[${n}]:${blockingError.slice(r.length)}` : blockingError,
      command: n,
    },
    ...(permissionRequestResult?.behavior === "deny" &&
      permissionRequestResult.message?.startsWith(r) === true && {
        permissionRequestResult: {
          ...permissionRequestResult,
          message: `[${n}]:${permissionRequestResult.message.slice(r.length)}`,
        },
      }),
  };
}
//@ chunk-e6aww6q8.js:3502078-3503312 layout
/**
 * PreToolUse 钩子超时或失败（未给结论）时改为阻断：onFailure:continue 且未被争议时放行；否则生成「the hook did not finish/failed, so this call was not run」。
 */
function refuseUnfinishedPreToolHook(e, signal, r, s) {
  if (
    r !== undefined &&
    "onFailure" in e.hook &&
    e.hook.onFailure === "continue" &&
    s?.continueIsContested !== true
  )
    return e;
  let h =
    e.outcome === "cancelled" && signal?.aborted !== true
      ? "gave no verdict in time"
      : e.outcome === "non_blocking_error" &&
          e.ranByContract !== true &&
          (r === undefined || r.failuresToo === true)
        ? "gave no verdict"
        : undefined;
  if (h === undefined) return e;
  logForDebugging(
    `Hooks: ${r === undefined ? "served-call " : ""}PreToolUse ${e.hook.type} hook ${h}; refusing the call`,
    {
      level: "warn",
    },
  );
  if (r !== undefined) {
    logEvent("tengu_pre_tool_use_refused_unfinished_hook", {
      hookType: fromEnum(e.hook.type),
      toolName:
        s?.tool === undefined
          ? lit_2("unknown")
          : s.tool.isMcp === true || s.tool.mcpInfo !== undefined
            ? lit_2("mcp_tool")
            : s.tool.uiTableKey !== undefined || s.tool.name.includes("__")
              ? lit_2("dynamic_tool")
              : sanitizeToolNameForAnalytics(s.tool.name),
      gateIgnoresSwitch: r.gateIgnoresSwitch,
      inSubagent: s?.inSubagent === true,
      ...(e.outcome !== "cancelled" && {
        hookFailed: true,
      }),
    });
    let y = hookProgramLabelForReport(e.hook);
    return {
      ...e,
      message: undefined,
      blockingError: {
        blockingError: `[${y}]: the hook ${e.outcome === "cancelled" ? "did not finish" : "failed"}, so this call was not run.
${r.advice}`,
        command: y,
        hookDidNotFinish: true,
      },
      outcome: "blocking",
    };
  }
  return {
    ...e,
    message: undefined,
    blockingError: {
      blockingError: `a PreToolUse ${e.hook.type} hook ${h}, so this call was not run`,
      command: getHookDisplayText(e.hook),
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
function isOfficialPluginId(pluginId) {
  let index = pluginId.lastIndexOf("@");
  if (index <= 0) return false;
  let sliced = pluginId.slice(index + 1);
  if (isOfficialMarketplaceName_3(sliced)) return true;
  if (sliced === SYNCED && isOfficialMarketplaceName_3(getAttestedOfficialPluginMarketplace(pluginId)))
    return true;
  return false;
}
//@ chunk-e6aww6q8.js:3503531-3503704 layout
function countHooksByPlugin(userHooks) {
  let filtered = userHooks.filter((s) => s.pluginId);
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
  if (!isOfficialPluginId(e)) return false;
  let index = e.lastIndexOf("@");
  let sliced = e.slice(0, index);
  return (getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_lattice", {}).plugins ?? []).includes(sliced);
}
//@ chunk-e6aww6q8.js:3503840-3504133 layout
/**
 * 为白名单中的官方插件钩子提供凭据环境变量（订阅用户给 OAuth 访问令牌，否则给 API key）；serve、会话令牌、非第一方、仅必要流量或 HIPAA 等情况下不给。
 */
function getPluginHookCredentialEnv(pluginId) {
  if (!pluginId || !shouldPassCredentialsToPluginHook(pluginId)) return {};
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
function emitHookMetrics(metrics, pluginId, hookEvent, s) {
  if (!metrics || !pluginId) return;
  let h = isOfficialPluginId(pluginId);
  if (!h) return;
  let filtered = Object.entries(metrics)
    .slice(0, MAX_HOOK_METRIC_KEYS)
    .filter(([, value]) => typeof value === "boolean" || typeof value === "number");
  logEvent("tengu_hook_plugin_metrics", {
    ...Object.fromEntries(filtered),
    pluginId: pluginIdForAnalytics_GATE_EVALUATED(pluginId, h),
    hookEvent: fromEnum(hookEvent),
  });
  logOTelEvent(
    "hook_plugin_metrics",
    {
      ...Object.fromEntries(filtered),
      plugin_id: pluginId,
      hook_event: hookEvent,
    },
    s,
  );
}
//@ chunk-e6aww6q8.js:3504464-3504565 layout
function countHooksByType(userHooks) {
  let n = new Map();
  for (let r of userHooks) {
    let s = fromEnum(r.hook.type);
    n.set(s, (n.get(s) ?? 0) + 1);
  }
  return n;
}
//@ chunk-e6aww6q8.js:3504565-3504595 facade-exports
var MANAGED_HOOKS_TIER = {
  managedHooksOnly: true,
};
//@ chunk-e6aww6q8.js:3504595-3504780 facade-exports
/**
 * 判断托管层（managed）钩子情况：有托管钩子返回 some；确认没有托管钩子且策略已读好返回 none；无法确定返回 unknown。
 */
function managedTierHooks(e) {
  try {
    if (collectEventHooks(undefined, [], e, MANAGED_HOOKS_TIER).length > 0) return "some";
    let eligibilityMemo = getEligibilityMemo();
    let s =
      isCcsCoworkSurface() ||
      eligibilityMemo === false ||
      (eligibilityMemo === true && getLastLoadStatus()?.state === "ok");
    return getPolicySettingsLoadErrors().length === 0 && s ? "none" : "unknown";
  } catch {
    return "unknown";
  }
}
//@ chunk-e6aww6q8.js:3504780-3504902 sole-consumer
function excludeManagedHooks(settingsHooks, n) {
  let r = (h) =>
    stableStringifySafe({
      ...h,
      settingsSource: undefined,
    });
  let s = new Set(getManagedHooksForEvent(n).map(r));
  return settingsHooks.filter((h) => !s.has(r(h)));
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
//@ chunk-e6aww6q8.js:3505039-3505549 sole-consumer
/**
 * 收集某事件的钩子：仅托管时只取策略钩子；否则取设置钩子（可排除托管），加上会话钩子与函数钩子，最后按暂扣状态过滤。
 */
function collectEventHooks(e, n, r, s) {
  if (s?.managedHooksOnly) {
    if (getSettingsForSource("policySettings")?.disableAllHooks === true) return [];
    return getManagedHooksForEvent(r);
  }
  let settingsHooks = getHooksForEvent(r, {
    withoutCheckoutHooks: shouldOmitCheckoutSessionEndHooks(r),
  });
  let hooks = s?.managedHooksExcluded ? excludeManagedHooks(settingsHooks, r) : [...settingsHooks];
  let sessionIds = typeof n === "string" ? [n] : n;
  if (e === undefined) return filterHooksByManagedHold(hooks, r, s?.held);
  let skipSessionHooks = shouldSkipSessionHooksByPolicy();
  for (let sessionId of sessionIds) {
    let q = e.get(sessionId, r).get(r);
    if (q) {
      let Z = filterSessionHookMatchers(q, skipSessionHooks);
      for (let Se of Z) for (let hook of Se.hooks) weakSet_6.add(hook);
      hooks.push(...Z);
    }
  }
  let L = sessionIds[0];
  if (L !== undefined && !skipSessionHooks) {
    let G = e.getFunctionHooks(L, r).get(r);
    if (G) hooks.push(...G);
  }
  return filterHooksByManagedHold(hooks, r, s?.held);
}
//@ chunk-e6aww6q8.js:3505608-3506011 facade-exports
/**
 * 计算 UserPromptSubmit 钩子集合的指纹键（托管层与全部钩子序列化，函数按宿主分配稳定编号）；没有钩子返回空串。用于判断钩子是否变化。
 */
function userPromptSubmitHooksKey(e) {
  let n = groupBySource.of(e.session.host);
  function r(S) {
    let w = n.tokens.get(S);
    if (w === undefined) {
      n.next += 1;
      w = n.next;
      n.tokens.set(S, w);
    }
    return w;
  }
  let s = registerAgent(e, "UserPromptSubmit", e.session.id);
  let eventHooks = collectEventHooks(e.sessionHooksRegistry, s, "UserPromptSubmit", MANAGED_HOOKS_TIER);
  let eventHooks_2 = collectEventHooks(e.sessionHooksRegistry, s, "UserPromptSubmit");
  return eventHooks.length + eventHooks_2.length === 0
    ? ""
    : JSON.stringify([eventHooks, eventHooks_2], (S, w) =>
        typeof w === "function" ? `function#${n.host}:${r(w)}` : w,
      );
}
//@ chunk-e6aww6q8.js:3506011-3506082 facade-exports
/**
 * 判断某事件是否有钩子：设置中有、存在函数钩子、或有待补跑（owed）的钩子。
 */
function hasHookForEvent(e, n, r) {
  return (
    hasSettingsHookForEvent(e, n, r) ||
    hasClassicHookSite(e) ||
    getPluginHookRunner()?.owedList(e) !== undefined
  );
}
//@ chunk-e6aww6q8.js:3506082-3506132 facade-exports
/**
 * 判断某事件是否有需要实际运行的钩子（有钩子且不全被跳过）。
 */
function hasHookToRun(e, sessionHooksRegistry, r) {
  return hasHookForEvent(e, sessionHooksRegistry, r) && !skipsEmptyDispatch(e, sessionHooksRegistry, r);
}
//@ chunk-e6aww6q8.js:3506132-3506178 layout
function skipsEmptyDispatch(e, sessionHooks, id) {
  return canSkipEmptyDispatch(e) && !hasSettingsHookForEvent(e, sessionHooks, id);
}
//@ chunk-e6aww6q8.js:3506178-3506301 layout
function canSkipEmptyDispatch(e, n = false) {
  return (
    !isTerminalShutdown() &&
    (canSkipEmptyClassicDispatch(e) ||
      (n && !env.CLAUDE_CODE_DISABLE_EMPTY_CLASSIC_DISPATCH_SKIP && !hasClassicHookSite(e))) &&
    managedTierHooks(e) === "none"
  );
}
//@ chunk-e6aww6q8.js:3506301-3506760 facade-exports
/**
 * 判断某事件是否只有调用方自己的回调钩子要运行（无远程调用、无 owed 钩子、无项目设置钩子，且全部钩子都是本进程回调或来自 flag 设置）；判断出错时记错误并返回 false。用于走快速路径。
 */
function hasOnlyOwnCallbacksToRun(e, sessionHooksRegistry, r, s, h = false) {
  try {
    let y;
    return (
      s?.remoteCall === undefined &&
      !isAttachServeMode() &&
      getPluginHookRunner()?.owedList(e) === undefined &&
      !getPluginHookRunner()?.settingsHooks("projectSettings", e).length &&
      canSkipEmptyDispatch(e, true) &&
      collectEventHooks(sessionHooksRegistry, r, e, {
        held: "included",
      }).every(
        (S) =>
          S.hooks.every((hook) =>
            isInternalHook({
              hook,
            }),
          ) ||
          (h &&
            (y ??= new Set(
              getFlagSettingsExpectedContent() === undefined &&
                getFlagSettingsFilePinnedContent() !== undefined &&
                getFlagSettingsInline()?.hooks === undefined
                ? getSettingsForSource("flagSettings")?.hooks?.[e]?.map((w) => stableStringifySafe(w))
                : [],
            )).has(stableStringifySafe(S))),
      )
    );
  } catch (error) {
    logForDebugging(`Could not tell whose hooks are on ${e}: ${errorMessage(error)}`, {
      level: "error",
    });
    return false;
  }
}
//@ chunk-e6aww6q8.js:3506760-3507106 facade-exports
/**
 * 判断一次工具调用对某事件是否没有任何要跑的钩子（只有自身回调且没有匹配该工具的钩子）；出错返回 false。
 */
function hasNoHookForToolCall(e, toolName, toolInput, toolUseContext) {
  try {
    let sessionHooksRegistry = toolUseContext.sessionHooksRegistry;
    let y = registerAgent(toolUseContext, e, toolUseContext.session.id);
    return (
      hasOnlyOwnCallbacksToRun(e, sessionHooksRegistry, y, toolUseContext) &&
      !hasToolHookMatching({
        hookEvent: e,
        toolName,
        toolInput,
        tools: toolUseContext.options.tools,
        toolAliases: toolUseContext.getAppState().toolPermissionContext.toolAliases,
        sessionHooks: sessionHooksRegistry,
        sessionId: y,
      })
    );
  } catch (error) {
    logForDebugging(`Could not tell whether a ${e} hook matches: ${errorMessage(error)}`, {
      level: "error",
    });
    return false;
  }
}
//@ chunk-e6aww6q8.js:3507106-3507244 layout
function matcherMatchesInput(matcher, n, r, hookInput, toolAliases) {
  let hookEventName = hookInput.hook_event_name;
  return (
    n === undefined ||
    !matcher ||
    matchesPattern(
      n,
      stripModelContextSuffix(hookEventName, matcher),
      HOOK_EVENTS_WITH_MATCHER.has(hookEventName),
      toolAliases,
      r,
      "tool_input" in hookInput ? hookInput.tool_input : undefined,
    )
  );
}
//@ chunk-e6aww6q8.js:3507244-3507522 layout
function markOwnToolHooks(e) {
  let n = (s) => hookDedupKey(s, getHookDedupPayload(s.hook) ?? "");
  let r = Map.groupBy(
    e.filter((s) => s.hook.type === "command"),
    n,
  );
  return e.map((s) => {
    let h = s.hook.type === "command" ? r.get(n(s)) : undefined;
    return h?.some((y) => y.asOwnTool)
      ? {
          ...s,
          asOwnTool: true,
          asStandIn: h.some((y) => y.asStandIn ?? !y.asOwnTool),
        }
      : s;
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
  let r = "tool_name" in hookInput ? ownTool(hookInput.tool_name) : undefined;
  return r === undefined || !("tool_name" in hookInput)
    ? undefined
    : {
        hookInput: {
          ...hookInput,
          tool_name: r.name,
          mcp_server: undefined,
        },
        tools: [r],
      };
}
//@ chunk-e6aww6q8.js:3507892-3507973 facade-exports
/**
 * 判断是否有匹配该工具调用的钩子；判定中遇到无法确定的特定错误时保守返回 true。
 */
function hasToolHookMatching(e) {
  try {
    return hasMatchingToolHooks(e);
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
      ).some((ke) => matchesPattern(ke, matcher, hasMatcher, toolAliases)) ||
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
function hasSettingsHookForEvent(e, sessionHooksRegistry, r, s = true) {
  let h = getHooksConfigFromSnapshot()?.[e];
  if (h && h.length > 0) return true;
  if (!shouldAllowManagedHooksOnly()) {
    let w = getMainThreadAgentHooks()?.[e];
    if (w && w.length > 0) return true;
  }
  let y = getRegisteredHooks()?.[e];
  if (y && y.length > 0) return true;
  if (
    getPluginSettingsHooks(e).length > 0 ||
    (s && getPluginHookRunner()?.owedList(e, undefined, true) !== undefined)
  )
    return true;
  if (sessionHooksRegistry === undefined) return false;
  return (typeof r === "string" ? [r] : r).some((w) => sessionHooksRegistry.has(w, e));
}
//@ chunk-e6aww6q8.js:3508855-3509042 layout
function checkHookIfConditionSafely(e) {
  try {
    return e();
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
      settings: new Set((getHooksConfigFromSnapshot()?.[hookEvent] ?? []).flatMap((un) => un.hooks)),
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
    let matcherMatches = (eventHook, matchQuery, tools) => {
      try {
        return matcherMatchesInput(eventHook.matcher, matchQuery, tools, hookInput, toolAliases);
      } catch (error) {
        if (!(error instanceof MatcherUnsupportableError)) throw error;
        if (getHookOriginLabel(eventHook)?.settingsSource !== "projectSettings")
          untestableMatchers.set(eventHook, error.message);
        return true;
      }
    };
    let we = new Set(
      ownToolHookInput === undefined
        ? []
        : eventHooks.filter(
            (eventHook) =>
              getHookOriginLabel(eventHook) !== undefined &&
              matcherMatches(eventHook, hookMatchQuery(ownToolHookInput.hookInput), ownToolHookInput.tools),
          ),
    );
    let Ee = (eventHook) =>
      ownToolHookInput === undefined || getHookOriginLabel(eventHook)?.settingsSource !== "projectSettings";
    let Ae = new Set(
      eventHooks.filter(
        (eventHook) =>
          Ee(eventHook) &&
          matchQuery !== undefined &&
          getMcpPrefix(matchQuery, eventHook.matcher, getHookToolInput(hookInput)).some((ao) =>
            matcherMatches(eventHook, ao, undefined),
          ) &&
          !we.has(eventHook) &&
          !matcherMatches(eventHook, matchQuery, tools),
      ),
    );
    let filtered = eventHooks.filter(
      (eventHook) =>
        we.has(eventHook) ||
        Ae.has(eventHook) ||
        (Ee(eventHook) && matcherMatches(eventHook, matchQuery, tools)),
    );
    let Me = tools !== undefined && matchQuery !== undefined ? findToolByName(tools, matchQuery) : undefined;
    let We = isCliOwnedMcpTool(Me) && Me?.hookMatcherFamilyNames !== undefined ? Me : undefined;
    let ze = new Set([
      ...Ae,
      ...(We !== undefined
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
    let lt = new Set((getMainThreadAgentHooks()?.[hookEvent] ?? []).flatMap((un) => un.hooks));
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
      let cs = isDeviceOwnedHook(matcher);
      let _r = "origin" in matcher && matcher.origin === "sdkHost";
      let Cr = "hostOwnsStdin" in matcher && matcher.hostOwnsStdin === true;
      let Vr = "personal" in matcher && matcher.personal === true;
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
        ...((weakSet_6.has(hook) || lt.has(hook)) && {
          registeredInSession: true,
        }),
        matcherIsMatchAll,
        ...(options?.recordMatchers && {
          matcherTexts: [matcher.matcher ?? ""],
        }),
        ...(cs && {
          deviceForwarded: cs,
        }),
        ...(_r && {
          sdkHost: _r,
        }),
        ...(Cr && {
          hostOwnsStdin: Cr,
        }),
        ...(Vr && {
          personal: Vr,
        }),
        ...(we.has(matcher) && {
          asOwnTool: true,
          asStandIn:
            getHookOriginLabel(matcher)?.settingsSource !== "projectSettings" &&
            matcherMatches(matcher, matchQuery, tools),
        }),
        ...(untestableMatchers.has(matcher) && {
          notTested: untestableMatchers.get(matcher),
        }),
        ...(ze.has(matcher) && {
          throughFamilyOnly: true,
        }),
        ...(Ae.has(matcher) && {
          matcherMetThroughOtherName: true,
        }),
      }));
    });
    let nt = new Set(
      matchedHooks.flatMap((matchedHook) => {
        let ao = matchedHook.throughFamilyOnly === true ? undefined : getHookIdentityKey(matchedHook);
        return ao === undefined ? [] : [ao];
      }),
    );
    let pt =
      ze.size === 0
        ? matchedHooks
        : matchedHooks.map((matchedHook) => {
            let ao = matchedHook.throughFamilyOnly === true ? getHookIdentityKey(matchedHook) : undefined;
            return ao !== undefined && nt.has(ao)
              ? {
                  ...matchedHook,
                  throughFamilyOnly: undefined,
                  matcherMetThroughOtherName: undefined,
                }
              : matchedHook;
          });
    let Et = dropHooksInHttpServe(we.size === 0 ? pt : markOwnToolHooks(pt), hookEvent);
    let copyThatApplies = getPluginHookRunner()?.copyThatApplies;
    let gt =
      copyThatApplies === undefined
        ? Et
        : Et.flatMap((un) => {
            if (un.hook.type !== "command" || un.settingsSource !== "projectSettings") return [un];
            let ao = copyThatApplies(un.hook, hookInput);
            return ao === undefined
              ? []
              : [
                  {
                    ...un,
                    hook: ao,
                  },
                ];
          });
    let At = () => {
      let un = blocksWhenItCannotRunElsewhere(hookEvent) && isQuietHopcroftGateOn();
      let getIfCondition = ({ hook, notTested }) => {
        let Ho = !(hook.type === "command" && isAsyncHookJSONOutput(hook));
        if (notTested === undefined) return Ho ? 3 : 1;
        return un && Ho ? 2 : 0;
      };
      return gt.toSorted(($o, yo) => getIfCondition($o) - getIfCondition(yo));
    };
    let orderedHooks = untestableMatchers.size === 0 ? gt : At();
    if (orderedHooks.every((hook) => hook.hook.type === "callback" || hook.hook.type === "function"))
      return orderedHooks;
    let Yt = (hook) => hook.if ?? "";
    let qt = dedupeHooksPreferSettings(
      orderedHooks
        .filter((orderedHook) => orderedHook.hook.type === "command")
        .map((orderedHook) => [
          hookDedupKey(orderedHook, getHookDedupPayload(orderedHook.hook) ?? ""),
          orderedHook,
        ]),
      hookEvent,
      settingsHookSets,
    );
    let Zt = (orderedHook) =>
      hookDedupKey(orderedHook, `${orderedHook.hook.prompt}\x00${Yt(orderedHook.hook)}`);
    let rn = dedupeHooksPreferSettings(
      orderedHooks
        .filter((orderedHook) => orderedHook.hook.type === "prompt")
        .map((orderedHook) => [Zt(orderedHook), orderedHook]),
      hookEvent,
      settingsHookSets,
    );
    let pn = dedupeHooksPreferSettings(
      orderedHooks
        .filter((orderedHook) => orderedHook.hook.type === "agent")
        .map((orderedHook) => [Zt(orderedHook), orderedHook]),
      hookEvent,
      settingsHookSets,
    );
    let no = dedupeHooksPreferSettings(
      orderedHooks
        .filter((orderedHook) => orderedHook.hook.type === "http")
        .map((orderedHook) => [
          hookDedupKey(orderedHook, getHookDedupPayload(orderedHook.hook) ?? ""),
          orderedHook,
        ]),
      hookEvent,
      settingsHookSets,
    );
    let hn = dedupeHooksPreferSettings(
      orderedHooks
        .filter((orderedHook) => orderedHook.hook.type === "mcp_tool")
        .map((orderedHook) => [
          hookDedupKey(orderedHook, getHookDedupPayload(orderedHook.hook) ?? ""),
          orderedHook,
        ]),
      hookEvent,
      settingsHookSets,
    );
    let ho = dedupeHooksPreferSettings(
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
    let functionHooks = orderedHooks.filter((orderedHook) => orderedHook.hook.type === "function");
    let Xn = (un) => {
      if (options?.recordMatchers !== true) return un;
      try {
        let ao = uniq(
          orderedHooks
            .filter(
              (orderedHook) =>
                orderedHook.pluginRoot === un.pluginRoot &&
                orderedHook.skillRoot === un.skillRoot &&
                isSameHook(orderedHook.hook, un.hook),
            )
            .flatMap((orderedHook) => orderedHook.matcherTexts ?? []),
        );
        let $o =
          un.pluginRoot === undefined && un.skillRoot === undefined
            ? findSettingsHookDefinition(un.hook, hookEvent, ao, options.ownSources ?? [])
            : undefined;
        return {
          ...un,
          matcherTexts: ao,
          hook: $o ?? un.hook,
        };
      } catch (error) {
        logForDebugging(
          `Hooks: could not establish whose settings define a hook (${errorMessage(error)}); treating it as the project's`,
        );
        return {
          ...un,
          matcherTexts: [],
        };
      }
    };
    let dedupedHooks = [
      ...qt.map(Xn),
      ...rn,
      ...pn,
      ...no.map(Xn),
      ...hn.map(Xn),
      ...ho.map(Xn),
      ...callbackHooks,
      ...functionHooks,
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
    let bo = hasIfCondition ? await createIfConditionMatcher(hookInput, tools) : undefined;
    let vn =
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
      if (!bo) {
        logForDebugging(
          `Hook if condition "${ifCondition}" cannot be evaluated for non-tool event ${hookInput.hook_event_name}`,
        );
        return [];
      }
      let $o = dedupedHook.hook.type === "command" && getHookOriginLabel(dedupedHook) !== undefined;
      if (dedupedHook.asOwnTool && vn?.(ifCondition, true)) return [dedupedHook];
      let yo = checkHookIfConditionSafely(
        () => (!dedupedHook.asOwnTool || dedupedHook.asStandIn === true) && bo(ifCondition, $o),
      );
      if (typeof yo === "string")
        return [
          {
            ...dedupedHook,
            notTested: yo,
          },
        ];
      if (yo) {
        let Ho = dedupedHook.asOwnTool
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
              ...Ho,
              throughFamilyOnly: true,
            },
          ];
        return [
          We === undefined
            ? Ho
            : toolName === matchQuery
              ? {
                  ...Ho,
                  throughFamilyOnly: undefined,
                }
              : {
                  ...Ho,
                  throughFamilyOnly: true,
                },
        ];
      }
      logForDebugging(`Skipping hook due to if condition "${ifCondition}" not matching`);
      return [];
    });
    let finalHooks =
      hookEvent === "SessionStart" || hookEvent === "Setup"
        ? flattened.filter((un) => {
            if (un.hook.type === "http") {
              logForDebugging(
                `Skipping HTTP hook ${un.hook.url} \u2014 HTTP hooks are not supported for ${hookEvent}`,
              );
              return false;
            }
            return true;
          })
        : flattened;
    let ko = count(finalHooks, isInternalHook);
    logForDebugging(
      `Matched ${finalHooks.length - ko} unique hooks for query "${matchQuery ?? "no match query"}" (${orderedHooks.length - ko} before deduplication)`,
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
function getNonBlockableHookErrorMessage(e, blockingError, hookName = e) {
  return createAttachmentMessage_2({
    type: "hook_non_blocking_error",
    hookName,
    toolUseID: randomUUID(),
    hookEvent: e,
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
  let s = `${hookEvent}:${displayCommand}`;
  if (surfacedHookSpawnFailures.has(s)) return false;
  surfacedHookSpawnFailures.add(s);
  return true;
}
//@ chunk-e6aww6q8.js:3516194-3516248 sole-consumer
function hookTelemetryName(hookEvent, matchQuery) {
  return matchQuery
    ? concatSafe(fromEnum(hookEvent), lit_2(":"), shortHash(matchQuery))
    : fromEnum(hookEvent);
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
//@ chunk-e6aww6q8.js:3516433-3517403 facade-exports
/**
 * 钩子执行总入口（异步生成器）：先等待被"暂扣"的钩子来源就绪；非 PreToolUse 且可以批处理、且不只是自身回调时走批量路径，否则逐个执行匹配的钩子，逐条 yield 结果。
 */
async function* executeHooks(options) {
  let { hookInput } = options;
  let r = options.managedHooksOnly
    ? undefined
    : maybeWaitForHookPolicy(
        hookInput.hook_event_name,
        () => {
          let s = options.toolUseContext?.sessionHooksRegistry ?? options.sessionHooks;
          let h = registerAgent(options.toolUseContext, hookInput.hook_event_name, options.session.id);
          return "tool_name" in hookInput
            ? hasToolHookMatching({
                hookEvent: hookInput.hook_event_name,
                toolName: hookInput.tool_name,
                toolInput: hookInput.tool_input,
                tools: options.toolUseContext?.options.tools,
                toolAliases: options.toolUseContext?.options.toolAliases,
                sessionHooks: s,
                sessionId: h,
                held: "only",
              })
            : collectEventHooks(s, h, hookInput.hook_event_name, {
                held: "only",
              }).length > 0;
        },
        options.signal,
      );
  if (r !== undefined) await r;
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
    runClassicHooks: (y, S) =>
      runClassicHooksHoldingExit({
        ...options,
        hookInput: y,
        extendedHookInput:
          extendedKey !== undefined && stableStringifySafe(y) === extendedKey
            ? options.extendedHookInput
            : undefined,
        ...S,
        classicChainMember: true,
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
  let { hookInput, toolUseContext } = e;
  for await (let s of executeHooks_2(e)) {
    if (toolUseContext?.remoteCall !== undefined && hookInput.hook_event_name === "PreToolUse")
      resolveHookPermissionResult(toolUseContext.remoteCall, `PreToolUse:${hookInput.tool_name}`, s);
    yield* keptForObservationContext(e, s);
  }
}
//@ chunk-e6aww6q8.js:3518386-3519367 facade-exports
/**
 * 在代理上下文中只保留钩子结果里影响控制流的字段（权限行为、更新输入、阻止继续、改写输出等，PreToolUse 才带 blockingError），其余（如附加上下文）丢弃；非代理上下文原样 yield。
 */
function* keptForObservationContext(e, n) {
  if (
    !isDelegatedObservationContext(e.agentContext) &&
    !isDelegatedObservationContext(e.toolUseContext?.agentContext)
  ) {
    yield n;
    return;
  }
  let r = e.hookInput.hook_event_name === "PreToolUse";
  let s = {
    ...(n.permissionBehavior !== undefined && {
      permissionBehavior: n.permissionBehavior,
    }),
    ...(n.hookPermissionDecisionReason !== undefined && {
      hookPermissionDecisionReason: n.hookPermissionDecisionReason,
    }),
    ...(n.heldForServedCall && {
      heldForServedCall: true,
    }),
    ...(n.updatedInput !== undefined && {
      updatedInput: n.updatedInput,
    }),
    ...(n.preventContinuation !== undefined && {
      preventContinuation: n.preventContinuation,
    }),
    ...(n.stopReason !== undefined && {
      stopReason: n.stopReason,
    }),
    ...(n.impossible !== undefined && {
      impossible: n.impossible,
    }),
    ...(n.hookSource !== undefined && {
      hookSource: n.hookSource,
    }),
    ...(n.hookPluginId !== undefined && {
      hookPluginId: n.hookPluginId,
    }),
    ...(n.updatedToolOutput !== undefined && {
      updatedToolOutput: n.updatedToolOutput,
    }),
    ...(n.updatedMCPToolOutput !== undefined && {
      updatedMCPToolOutput: n.updatedMCPToolOutput,
    }),
    ...(r &&
      n.blockingError !== undefined && {
        blockingError: n.blockingError,
      }),
  };
  if (Object.keys(s).length > 0) yield s;
}
//@ chunk-e6aww6q8.js:3519367-3521232 facade-exports
/**
 * 剥掉不允许的钩子批准：受限会话、Projects 会话里的 WebFetch/WebSearch、托管桌面工具、自动模式下的高风险工具、CCR 云端浏览器调用，钩子返回的 allow 一律作废并记日志；PermissionRequest 的 updatedPermissions 会被收紧，并在 Cowork 云会话等场景丢掉 setMode。
 */
function stripConfinedHookApproval(e, n, hookInput, toolUseContext) {
  let toolNameField = getToolNameField(hookInput);
  let y = settingsGrantsConfined()
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
  let permissionRequestResult = e.permissionRequestResult;
  if (permissionRequestResult?.behavior === "allow" && permissionRequestResult.updatedPermissions) {
    let w = filterPermissionUpdatePayload(
      permissionRequestResult.updatedPermissions,
      toolUseContext && getToolPermissionContext(toolUseContext),
    );
    if (w !== permissionRequestResult.updatedPermissions) {
      logForDebugging(
        `${n} PermissionRequest allow: changed its updates so they cannot loosen WebFetch or WebSearch rules; hooks cannot grant those tools in a Projects session`,
      );
      permissionRequestResult.updatedPermissions = w;
    }
    let L = filterRemoteBrowserAllowUpdates(
      permissionRequestResult.updatedPermissions,
      toolUseContext && getToolPermissionContext(toolUseContext),
    );
    if (L !== permissionRequestResult.updatedPermissions) {
      logForDebugging(
        `${n} PermissionRequest allow: changed its updates so they cannot loosen the rules for CCR's cloud browser; hooks cannot grant its tools`,
      );
      permissionRequestResult.updatedPermissions = L;
    }
    if (
      (isCoworkAny() || hasMcpToolAliases()) &&
      permissionRequestResult.updatedPermissions.some(
        (updatedPermission) => updatedPermission.type === "setMode",
      )
    ) {
      logEvent("tengu_permission_request_set_mode_ignored", {});
      logForDebugging(
        `${n} PermissionRequest allow: dropped its setMode. A hook's answer cannot set the mode in a Cowork cloud session or where an MCP tool is declared as code-running.`,
      );
      permissionRequestResult.updatedPermissions = permissionRequestResult.updatedPermissions.filter(
        (updatedPermission) => updatedPermission.type !== "setMode",
      );
    }
  }
  if (y === undefined && permissionRequestResult?.behavior === "allow" && toolNameField !== undefined) {
    let w = toolUseContext && findToolByName(toolUseContext.options.tools, toolNameField);
    let L = toolUseContext && getToolPermissionContext(toolUseContext);
    if (
      requiresClassifierForHookAllow(
        w ?? {
          name: toolNameField,
        },
      ) &&
      (L === undefined || isAutoClassifierActive(isAutoAllowedInMode(w, L)))
    ) {
      logEvent("tengu_auto_mode_permission_request_allow_ignored", {});
      y = `while auto mode is on (also behind plan mode) a hook cannot approve ${toolNameField}`;
    } else if (
      isRemoteBrowserToolUnderModeFloor(
        w ?? {
          name: toolNameField,
        },
      )
    )
      y = `a hook cannot approve ${toolNameField}, a call to CCR's cloud browser`;
  }
  if (y === undefined) return e;
  if (e.permissionBehavior === "allow") {
    logForDebugging(`${n} permissionDecision=allow ignored: ${y}`);
    e.permissionBehavior = undefined;
  }
  if (e.permissionRequestResult?.behavior === "allow") {
    logForDebugging(`${n} PermissionRequest allow ignored: ${y}`);
    e.permissionRequestResult = undefined;
  }
  return e;
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
  let rn = getPluginHookRunner()?.owedList(hookEvent, hookInput);
  if (rn !== undefined) await awaitWithHookTimeout(rn, hookEvent, signal, timeoutMs);
  let pn = managedHooksOnly ? undefined : getPluginHookRunner()?.whichCopyAsk?.(hookEvent, hookInput);
  if (pn !== undefined) await awaitWithHookTimeout(pn, hookEvent, signal, timeoutMs);
  let no = [];
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
          onPluginMatchersRead: (hr) => {
            no = newPluginsOnly?.owed(hr) ?? hr;
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
    let mi = blockingErrorResult(
      hookEvent,
      hookDisplayName,
      hookResolutionFaultMessage(hookEvent, isServedCall ? undefined : error),
    );
    if (mi !== undefined) {
      yield mi;
      return;
    }
    if (matchedHooksRaw !== undefined) throw error;
    matchedHooksFiltered = [];
  }
  let filtered = matchedHooksFiltered.filter((hr) => {
    let mi = !isServedCall || canRunForServedCall(hr);
    if (!mi && (hr.hook.type === "agent" || hr.hook.type === "prompt"))
      logForDebugging(`Hooks: ${hr.hook.type} hook skipped for a call served to a cloud session`);
    return mi;
  });
  let Kn = sessionFunctionHooksOnly
    ? filtered.filter((hr) => hr.hook.type === "function")
    : skipSessionFunctionHooks
      ? filtered.filter((hr) => hr.hook.type !== "function")
      : filtered;
  let isStartupOrResume =
    hookInput.hook_event_name === "SessionStart" &&
    (hookInput.source === "startup" || hookInput.source === "resume");
  let matchedHooks = (
    newPluginsOnly
      ? Kn.filter((hr) =>
          newPluginsOnly.repoHooks
            ? hr.settingsSource === "projectSettings"
            : hr.pluginName !== undefined && no.some((mi) => mi.pluginId === hr.pluginId),
        )
      : Kn
  ).map((hr) =>
    isStartupOrResume && hr.settingsSource === "projectSettings" && hr.hook.type === "command"
      ? {
          ...hr,
          hook: {
            ...hr.hook,
            async: true,
            asyncRewake: false,
          },
        }
      : hr,
  );
  onMatched?.(no, matchedHooks.length);
  if (matchedHooks.length === 0) return;
  if (signal?.aborted) return;
  let hookNameForTelemetry = hookTelemetryName(hookEvent, matchQuery);
  let userHooks = matchedHooks.filter((hr) => !isInternalHook(hr) || hr.notTested !== undefined);
  if (userHooks.length > 0) {
    if (!suppressPerInvocationTelemetry) {
      let pluginHookCounts = countHooksByPlugin(userHooks);
      let hookTypeCounts = countByPluginKey(userHooks);
      let Ha = countHooksByType(userHooks);
      let $a = count(userHooks, (nr) => nr.matcherIsMatchAll);
      logEvent("tengu_run_hook", {
        hookName: hookNameForTelemetry,
        numCommands: userHooks.length,
        numMatchAllMatchers: $a,
        numSpecificMatchers: userHooks.length - $a,
        hookTypeCounts: hashEntries(Ha),
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
    let mi = 0;
    let Ha = toolUseContext
      ? {
          getAppState: toolUseContext.getAppState,
          applyAttributionOp: toolUseContext.applyAttributionOp,
          session: toolUseContext.session,
          storageV5: toolUseContext.storageV5,
        }
      : undefined;
    for (let [nr, Ti] of matchedHooks.entries()) {
      let { hook } = Ti;
      if (hook.type !== "callback") continue;
      let _i = await hook.callback(
        matchedToolNameInput(Ti, hookInput) ?? hookInput,
        toolUseID,
        signal,
        nr,
        Ha,
      );
      if (isSyncHookJSONOutput_2(_i) || Object.keys(_i).length === 0) continue;
      let jo = processHookJSONOutput({
        json: _i,
        command: "callback",
        hookName: `${hookEvent}:Callback`,
        toolUseID,
        hookEvent,
        expectedHookEvent: hookEvent,
        stdout: undefined,
        stderr: undefined,
        exitCode: undefined,
      });
      if (jo.permissionBehavior === "deny") {
        mi++;
        logForDebugging(
          `Hook ${hookEvent} (${getHookStatusText(hook)}) returned permissionDecision: deny${jo.hookPermissionDecisionReason ? ` (reason: ${jo.hookPermissionDecisionReason})` : ""}`,
        );
        yield {
          permissionBehavior: "deny",
          hookPermissionDecisionReason: jo.hookPermissionDecisionReason,
          hookSource: Ti.hookSource,
        };
      }
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
            toolUseID,
            hookEvent,
          }),
        };
    }
    let totalDurationMs = Date.now() - batchStartTime;
    getStatsStore()?.observe("hook_duration_ms", totalDurationMs);
    logEvent("tengu_repl_hook_finished", {
      hookName: hookNameForTelemetry,
      numCommands: matchedHooks.length,
      numSuccess: matchedHooks.length - mi,
      numBlocking: mi,
      numNonBlockingError: 0,
      numCancelled: 0,
      totalDurationMs,
    });
    return;
  }
  let vn = isBetaTracingEnabled() && isToolDetailsLoggingEnabled();
  let hookDefinitionsJson =
    vn || isPerfettoTracingEnabled() ? jsonStringify(getHookDefinitionsForTelemetry(matchedHooks)) : "[]";
  let hookNameForTelemetry_2 = getHookNameForTelemetry(hookEvent, matchQuery);
  let ko = toolUseContext?.agentContext ?? agentContext ?? mainAgentContext();
  if (!suppressPerInvocationTelemetry)
    logOTelEvent(
      "hook_execution_start",
      {
        hook_event: hookEvent,
        hook_name: hookNameForTelemetry_2,
        num_hooks: String(matchedHooks.length),
        managed_only: String(shouldAllowManagedHooksOnlyByPolicy()),
        hook_source: shouldAllowManagedHooksOnlyByPolicy() ? "policySettings" : "merged",
        safe_mode: String(isSafeMode()),
        ...(vn && {
          hook_definitions: hookDefinitionsJson,
        }),
      },
      ko,
    );
  let span = suppressPerInvocationTelemetry
    ? undefined
    : startHookSpan(hookEvent, hookNameForTelemetry_2, matchedHooks.length, hookDefinitionsJson, ko);
  let ao = new Map(userHooks.map((userHook, mi) => [userHook.hook, mi]));
  using $o = suppressPerInvocationTelemetry
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
  let Ho = {};
  let rr = {};
  let inputFailureReason;
  function stringifyHookInputCached(pluginId, mi = false, Ha, $a) {
    let nr = Ha === undefined ? Ho : rr;
    let Ti = $a !== undefined ? "asBash" : mi ? "elsewhere" : "base";
    let Vs = nr[Ti];
    if (Vs !== undefined) return Vs;
    let _i = false;
    let jo;
    try {
      let Qr = $a ?? ((mi && resolveOwnToolHookInput(hookInput)?.hookInput) || hookInput);
      let fi = Ha && writeRemoteHookInput(Ha, Qr);
      let Ri = fi ?? jsonStringify(Qr);
      _i = isOversizedHookInput(hookEvent, Ri);
      if (_i) throw RangeError("Hook input is over the size limit");
      jo = {
        ok: true,
        value: Ri,
        sent: fi,
      };
    } catch (error) {
      inputFailureReason = _i ? "hook_input_too_large" : "hook_input_stringify_failed";
      logError(
        withTelemetryMessage(
          Error(`Failed to stringify hook ${hookDisplayName} input`, {
            cause: error,
          }),
          "Failed to stringify hook input",
        ),
      );
      jo = {
        ok: false,
        error,
      };
    }
    nr[Ti] = jo;
    return jo;
  }
  function getHookInputJson(hr, mi) {
    if (isCcsTenant() && hasHookEligibility(hr.hook))
      return {
        ok: true,
        value: "",
        sent: undefined,
      };
    let Ha = getHookOriginLabel(hr) !== undefined && hr.hook.type === "prompt";
    let $a = matchedToolNameInput(hr, hookInput);
    let nr = stringifyHookInputCached(
      hr.pluginId,
      hr.asOwnTool,
      mi || Ha ? getPluginHookRunner()?.stdin : undefined,
      $a,
    );
    if (Ha && nr.ok && nr.sent === undefined) {
      inputFailureReason = "hook_input_stringify_failed";
      return {
        ok: false,
        error: Error("not written"),
      };
    }
    return nr;
  }
  let controlStreamClosedError;
  let _r = new Set();
  let notRunHooks = new Set();
  let hadSchemaInvalidOutput = false;
  let hadSchemaInvalidBlock = false;
  let hookPromises = matchedHooks.map((hr) => pluginHookRefusal(getHookOriginLabel(hr), hookEvent, hr.hook));
  let mapped = matchedHooks.map(async function* (
    { hook, pluginRoot, pluginId, skillRoot, settingsSource, matcherTexts, sdkHost, asOwnTool, notTested },
    hookIndex,
  ) {
    let hookOriginLabel = getHookOriginLabel({
      pluginId,
      settingsSource,
    });
    let Ri = hookPromises[hookIndex] ?? pluginHookRefusal(hookOriginLabel, hookEvent, hook);
    let Ja = Ri ?? notTested;
    if (Ja !== undefined) {
      notRunHooks.add(hook);
      yield {
        ...describeKillSwitchedHook(
          hookEvent,
          hookDisplayName,
          Ja,
          pluginId,
          blocksWhenItCannotRunElsewhere(hookEvent) &&
            (Ri !== undefined ||
              !(
                hook.type === "command" &&
                isAsyncHookJSONOutput(hook, forceSyncExecution === true || isServedCall)
              )),
        ),
        hook,
      };
      return;
    }
    let Di = hookIndex + (newPluginsOnly?.envFileIndexBase ?? 0);
    let yr = isPersonalRestrictedHook(matchedHooks[hookIndex], hookEvent);
    if (pluginId)
      recordPluginActivity(pluginId, "hook", {
        kind: "hook",
        name: hookEvent,
      });
    if (isServedCall && (hook.type === "agent" || hook.type === "prompt")) {
      yield holdModelHookForServedCall(hook, hookEvent);
      return;
    }
    let Kr;
    if (
      isServedCall &&
      (hook.type === "command" || hook.type === "http" || hook.type === "mcp_tool" || hook.type === "script")
    ) {
      let ol = await judgeHookForServedCall(
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
      if (ol.held !== undefined) {
        let remoteCall = toolUseContext?.remoteCall;
        let Su;
        yield (hook.type === "command" && hookEvent === "PreToolUse" && remoteCall !== undefined
          ? await pinHookCommand({
              hook,
              held: ol.held,
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
              onUnavailable: (Uc) => {
                Su = Uc;
              },
              exec: async (Uc) => {
                let Kc = stringifyHookInputCached(
                  pluginId,
                  false,
                  undefined,
                  matchedToolNameInput(matchedHooks[hookIndex], hookInput),
                );
                if (!Kc.ok) throw Kc.error;
                let _s = await execCommandHook(
                  Uc.hook,
                  hookEvent,
                  hookDisplayName,
                  Kc.value,
                  undefined,
                  claudeEnvContextFrom(hookInput),
                  getSessionProject(session),
                  Uc.cwd,
                  Uc.signal,
                  randomUUID(),
                  Di,
                  undefined,
                  undefined,
                  undefined,
                  undefined,
                  true,
                  undefined,
                  {
                    base: Uc.base,
                    omit: [],
                    shellPrefix: undefined,
                  },
                  undefined,
                  undefined,
                  effectiveStorageV5,
                  effectiveCredentials,
                  Uc.wrap,
                );
                let hookOutput = parseHookOutput(_s.stdout);
                let untrustedCaptureReason = getUntrustedCaptureReason(
                  _s,
                  hookEvent,
                  _s.stdout,
                  hookOutput.json,
                  (zs) => parseHookOutput(zs).json,
                );
                return {
                  ..._s,
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
          : undefined) ?? holdHookForServedCall(hook, hookEvent, ol.held, ol.cause, Su);
        return;
      }
      Kr = ol.program;
      if (
        pluginRoot === undefined &&
        skillRoot === undefined &&
        !isNotFromOwnSettings(hook, hookEvent, matcherTexts ?? [], servedHookEnv.ownSources)
      )
        _r.add(hook);
    }
    if (hook.type === "callback") {
      let ol = hook.timeout ? hook.timeout * 1000 : timeoutMs;
      let { signal: abortSignal, cleanup } = createCombinedAbortSignal(signal, {
        timeoutMs: ol,
      });
      try {
        yield await executeHookCallback({
          toolUseID,
          hook,
          hookEvent,
          hookInput: matchedToolNameInput(matchedHooks[hookIndex], hookInput) ?? hookInput,
          signal: abortSignal,
          hookIndex: Di,
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
        let Uc = abortSignal.aborted && !signal?.aborted;
        if (
          Uc &&
          sdkHost === true &&
          (hookEvent === "Stop" || hookEvent === "SubagentStop" || hookEvent === "SessionStart")
        ) {
          logForDebugging(
            `SDK host ${hookEvent} callback hook timed out after ${ol}ms; continuing without its answer`,
          );
          logEvent("tengu_sdk_hook_callback_timeout", {
            hookEvent: fromEnum(hookEvent),
          });
          let Kc =
            hookEvent === "SubagentStop" ||
            [agentContext, toolUseContext?.agentContext].some(
              (_s) =>
                _s !== undefined &&
                _s.agentType !== "main" &&
                !(isSubagentContext(_s) && _s.isMainSession === true),
            );
          yield {
            outcome: "cancelled",
            hook,
            ...(!Kc &&
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
        if ((hookEvent !== "UserPromptSubmit" && hookEvent !== "UserPromptExpansion") || !Uc) throw error;
        logForDebugging(
          `${hookDisplayName} callback hook timed out; swallowed rejection: ${errorMessage(error)}`,
        );
        logEvent("tengu_sdk_hook_callback_timeout", {
          hookEvent: fromEnum(hookEvent),
        });
        yield {
          blockingError: {
            blockingError: `${hookDisplayName} hook callback timed out after ${ol}ms`,
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
    let Qs = hook.type === "command" && hookOriginLabel !== undefined && pluginHookRunner !== undefined;
    if (Qs)
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
    let Xa = Qs && !isAsyncHookJSONOutput(hook);
    let { signal: abortSignal, cleanup } = createCombinedAbortSignal(signal, {
      timeoutMs: Xa ? undefined : hookTimeoutMs_2,
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
    let ga = pluginRoot ?? skillRoot;
    let hookDisplayText = getHookDisplayText(hook);
    let displayCommand =
      ga && (hook.type === "command" || (hook.type === "script" && hook.file !== undefined))
        ? hookDisplayText.replace(
            hook.type === "command" && hook.args === undefined
              ? /\$\{CLAUDE_PLUGIN_ROOT\}|\$CLAUDE_PLUGIN_ROOT\b/g
              : /\$\{CLAUDE_PLUGIN_ROOT\}/g,
            () => ga,
          )
        : hookDisplayText;
    let pluginNote =
      pluginId && !isServedCall
        ? `
This hook comes from the ${pluginId} plugin.`
        : "";
    let Ld = false;
    let vs = false;
    try {
      let hookInputJson = getHookInputJson(matchedHooks[hookIndex], Qs);
      if (!hookInputJson.ok) {
        cleanup();
        let command = isServedCall ? `${hook.type} hook` : displayCommand;
        let mf = blockingErrorResult(
          hookEvent,
          command,
          `[${command}]: ${unserializableInputBlockMessage(isServedCall ? undefined : hookInputJson.error)}${pluginNote}`,
        );
        yield mf !== undefined
          ? {
              ...mf,
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
        let al = await execHttpHook(
          hook,
          hookEvent,
          jsonInput,
          signal,
          timeoutMs,
          servedHookEnv && mergeHookEnv(servedHookEnv.env),
          servedHookEnv ? undefined : getManagedHttpHookEnv(hook),
        );
        cleanup?.();
        if (al.aborted) {
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
        let mf = al.withheld === true && isDiskless();
        if (mf && hookEvent === "PermissionRequest") {
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: al.error ?? "",
            stdout: "",
            stderr: al.error ?? "",
            exitCode: undefined,
            outcome: "error",
          });
          yield denyPermissionRequestHookInCloud(hook);
          return;
        }
        if (mf && hookEvent === "PreToolUse") {
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: "The PreToolUse HTTP hook can't run in this cloud session, so this tool call is refused.",
            stdout: "",
            stderr:
              al.error ??
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
        if (isWithheldGuardHttpHook(al, hookEvent)) {
          let Kf = httpHookUnreachableMessage(hookEvent, al.error);
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: Kf,
            stdout: "",
            stderr: Kf,
            exitCode: 2,
            outcome: "error",
          });
          yield {
            blockingError: {
              blockingError: Kf,
              command: hook.url,
            },
            suppressOriginalPrompt: true,
            ...(hookEvent === "PermissionRequest" && {
              permissionRequestResult: {
                behavior: "deny",
                message: Kf,
              },
            }),
            outcome: "blocking",
            hook,
          };
          return;
        }
        if (al.error || !al.ok) {
          let stderr = al.error || `HTTP ${al.statusCode} from ${hook.url}`;
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: stderr,
            stdout: "",
            stderr,
            exitCode: al.statusCode,
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
              exitCode: al.statusCode ?? 0,
            }),
            outcome: "non_blocking_error",
            hook,
          };
          return;
        }
        let { json, validationError } = parseHttpHookOutput(al.body);
        if (validationError) {
          hadSchemaInvalidOutput = true;
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: al.body,
            stdout: al.body,
            stderr: validationError,
            exitCode: al.statusCode,
            outcome: "error",
          });
          yield {
            message: createAttachmentMessage_2({
              type: "hook_non_blocking_error",
              hookName: hookDisplayName,
              toolUseID,
              hookEvent,
              stderr: validationError,
              stdout: al.body,
              exitCode: al.statusCode ?? 0,
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
            output: al.body,
            stdout: al.body,
            stderr: "",
            exitCode: al.statusCode,
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
            json: yr
              ? restrictPersonalHookAnswer(
                  json,
                  matchedToolNameInput(matchedHooks[hookIndex], hookInput) ?? hookInput,
                )
              : json,
            command: hook.url,
            hookName: hookDisplayName,
            toolUseID,
            hookEvent,
            expectedHookEvent: hookEvent,
            stdout: al.body,
            stderr: "",
            exitCode: al.statusCode,
          });
          emitHookMetrics(json.metrics, pluginId, hookEvent, ko);
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: al.body,
            stdout: al.body,
            stderr: "",
            exitCode: al.statusCode,
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
        let al = await runMcpToolHook(
          hook,
          hookEvent,
          matchedToolNameInput(matchedHooks[hookIndex], hookInput) ?? hookInput,
          isServedCall ? undefined : toolUseContext?.options.mcpClients,
          signal,
          timeoutMs,
          isServedCall || toolUseContext === undefined
            ? undefined
            : subagentMemoryMode(toolUseContext.session.host),
        );
        cleanup?.();
        let mf =
          isServedCall && hookEvent === "PreToolUse"
            ? al.aborted
              ? signal?.aborted
                ? undefined
                : "timed out"
              : al.error !== undefined && al.body === ""
                ? "could not be run"
                : !al.ok
                  ? "returned an error"
                  : undefined
            : undefined;
        if (mf !== undefined) {
          let Kf = `a PreToolUse mcp_tool hook ${mf}, so this call was not run`;
          logForDebugging(
            `Hooks: served-call mcp_tool gate (${hook.server}/${hook.tool}) refused (${mf})${al.error ? ` \u2014 ${al.error}` : ""}`,
            {
              level: "warn",
            },
          );
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: Kf,
            stdout: al.body,
            stderr: al.error || Kf,
            exitCode: 2,
            outcome: "error",
          });
          yield {
            blockingError: {
              blockingError: Kf,
              command: displayCommand,
            },
            outcome: "blocking",
            hook,
          };
          return;
        }
        if (al.withheld && hookEvent === "PermissionRequest" && isDiskless()) {
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: al.error ?? "",
            stdout: "",
            stderr: al.error ?? "",
            exitCode: undefined,
            outcome: "error",
          });
          yield denyPermissionRequestHookInCloud(hook);
          return;
        }
        if (al.withheld && hookEvent === "PreToolUse") {
          let Kf = `a PreToolUse mcp_tool hook could not run (${al.error}); refusing rather than skipping that gate`;
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: Kf,
            stdout: "",
            stderr: al.error ?? Kf,
            exitCode: 2,
            outcome: "error",
          });
          yield {
            blockingError: {
              blockingError: Kf,
              command: displayCommand,
            },
            outcome: "blocking",
            hook,
          };
          return;
        }
        if (al.aborted) {
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
        if (al.error || !al.ok) {
          let error = al.error || "MCP tool returned an error";
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: error,
            stdout: al.body,
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
              stdout: al.body,
              exitCode: 1,
            }),
            outcome: "non_blocking_error",
            hook,
          };
          return;
        }
        let { json: httpJson, validationError: httpValidationError } = parseHookOutput(al.body);
        if (httpValidationError) {
          hadSchemaInvalidOutput = true;
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: al.body,
            stdout: al.body,
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
              stdout: al.body,
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
          output: al.body,
          stdout: al.body,
          stderr: "",
          exitCode: 0,
          outcome: "success",
        });
        if (httpJson && isSyncHookJSONOutput(httpJson)) {
          let processed = processHookJSONOutput({
            json: yr
              ? restrictPersonalHookAnswer(
                  httpJson,
                  matchedToolNameInput(matchedHooks[hookIndex], hookInput) ?? hookInput,
                )
              : httpJson,
            command: hookCommand,
            hookName: hookDisplayName,
            toolUseID,
            hookEvent,
            expectedHookEvent: hookEvent,
            stdout: al.body,
            stderr: "",
            exitCode: 0,
          });
          emitHookMetrics(httpJson.metrics, pluginId, hookEvent, ko);
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
            stdout: al.body,
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
      let Eu =
        hook.type === "script"
          ? resolveScriptHook(hook, hookEvent)
          : {
              hook,
              env: undefined,
            };
      let Uc =
        Kr === undefined
          ? Eu.hook
          : {
              ...Eu.hook,
              command: Kr,
            };
      let Kc =
        launcherHookEnv !== undefined &&
        servedHookEnv === undefined &&
        pluginRoot === undefined &&
        skillRoot === undefined &&
        isFlagSettingsSyncHook(hook, hookEvent);
      emitHookStarted(hookId, hookDisplayName, hookEvent);
      let _s = await execCommandHook(
        Xa
          ? rewriteInputIfMarked(Uc, {
              ...Uc,
              timeout: hookTimeoutMs_2 / 1000,
            })
          : Uc,
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
        Di,
        pluginRoot,
        pluginId,
        settingsSource,
        skillRoot,
        forceSyncExecution ||
          isServedCall ||
          hook.type === "script" ||
          blocksWhenNonBlockingError(hook, hookEvent) ||
          Kc,
        Kc
          ? launcherHookEnv
          : Eu.env === undefined
            ? env?.extra
            : {
                ...env?.extra,
                ...Eu.env,
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
      let Qm = signal?.aborted === true && _s.stoppedAfterItsTimeout !== true;
      Ld = hook.type !== "script" || didScriptHookRun(_s) || (_s.aborted === true && Qm);
      vs = _s.status === 2 && !_s.backgrounded;
      cleanup?.();
      let wr = Date.now() - hookStartMs;
      let zs = _s.aborted
        ? Qm
          ? "cancelled"
          : `timed out after ${hookTimeoutMs_2}ms`
        : _s.backgrounded
          ? "moved to the background"
          : _s.withheld
            ? "not run"
            : _s.spawnFailed
              ? "failed to start"
              : `finished with status ${_s.status}`;
      logForDebugging(
        `Hooks: ${hookDisplayName} [${displayCommand}]${pluginId ? ` (plugin ${pluginId})` : ""} ${zs} (${wr}ms)`,
      );
      if (_s.withheld === true && hookEvent === "PermissionRequest") {
        emitHookResponse({
          hookId,
          hookName: hookDisplayName,
          hookEvent,
          output: _s.output,
          stdout: "",
          stderr: _s.stderr,
          exitCode: _s.status,
          outcome: "error",
        });
        yield denyPermissionRequestHookInCloud(hook);
        return;
      }
      let li = Ld
        ? undefined
        : guardScriptHookBlock(
            hook,
            hookEvent,
            isServedCall ? "script hook" : displayCommand,
            isServedCall || _s.stderr.trim() === ""
              ? describeHookDidNotRun(_s)
              : `${describeHookDidNotRun(_s)}: ${_s.stderr.trim()}`,
          );
      if (li !== undefined) {
        emitHookResponse({
          hookId,
          hookName: hookDisplayName,
          hookEvent,
          output: _s.output,
          stdout: _s.stdout,
          stderr: _s.stderr,
          exitCode: _s.status,
          outcome: "error",
        });
        yield li;
        return;
      }
      if (!Ld && !_s.aborted) {
        emitHookResponse({
          hookId,
          hookName: hookDisplayName,
          hookEvent,
          output: _s.output,
          stdout: _s.stdout,
          stderr: _s.stderr,
          exitCode: _s.status,
          outcome: "error",
        });
        yield {
          message: createAttachmentMessage_2({
            type: "hook_non_blocking_error",
            hookName: hookDisplayName,
            toolUseID,
            hookEvent,
            stderr: `script hook did not run (${describeHookDidNotRun(_s)})${_s.stderr.trim() ? `: ${_s.stderr.trim()}` : ""}`,
            stdout: _s.stdout,
            exitCode: _s.status,
            command: hookCommand,
            durationMs: wr,
          }),
          outcome: "non_blocking_error",
          hook,
        };
        return;
      }
      if (_s.backgrounded) {
        yield {
          outcome: "success",
          hook,
        };
        return;
      }
      if (_s.aborted) {
        emitHookResponse({
          hookId,
          hookName: hookDisplayName,
          hookEvent,
          output: _s.output,
          stdout: _s.stdout,
          stderr: _s.stderr,
          exitCode: _s.status,
          outcome: "cancelled",
        });
        yield {
          message: createAttachmentMessage_2({
            type: "hook_cancelled",
            hookName: hookDisplayName,
            toolUseID,
            hookEvent,
            command: hookCommand,
            durationMs: wr,
            timedOut: !Qm,
            timeoutMs: hookTimeoutMs_2,
          }),
          outcome: "cancelled",
          hook,
          ...(_s.stoppedAfterItsTimeout && {
            stoppedAfterItsTimeout: true,
          }),
        };
        return;
      }
      let hookStdoutForParsing = getHookStdoutForParsing(_s);
      let { json, plainText, validationError } = parseHookOutput(hookStdoutForParsing);
      let capturedJson = dropSuspectCaptureJson(_s, hookEvent, json);
      let distrustReason = getUntrustedCaptureReason(
        _s,
        hookEvent,
        hookStdoutForParsing,
        capturedJson,
        (al) => parseHookOutput(al).json,
      );
      if (distrustReason !== undefined) {
        let stderr = withHookStderr(distrustReason, _s.status, _s.stderr);
        emitHookResponse({
          hookId,
          hookName: hookDisplayName,
          hookEvent,
          output: _s.output,
          stdout: _s.stdout,
          stderr,
          exitCode: _s.status,
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
            stdout: _s.stdout,
            exitCode: _s.status,
            command: hookCommand,
            durationMs: wr,
          }),
          outcome: "non_blocking_error",
          hook,
        };
        return;
      }
      let tp =
        matchedHooks[hookIndex].throughFamilyOnly === true &&
        "tool_name" in hookInput &&
        monitorCommandAsBash(hookInput.tool_name, getHookToolInput(hookInput)) !== undefined;
      let Yh =
        capturedJson !== undefined && _s.ranElsewhere && !tp
          ? applyRemoteHookInputRewrite(capturedJson, hookInput, hookOriginLabel, _s)
          : capturedJson;
      let Ef =
        Yh !== undefined && yr
          ? restrictPersonalHookAnswer(
              Yh,
              matchedToolNameInput(matchedHooks[hookIndex], hookInput) ?? hookInput,
            )
          : Yh;
      let np =
        hasBlockingReason(hook, hookEvent, yr) &&
        _s.status !== 0 &&
        _s.status !== 2 &&
        !(Ef !== undefined && isDenyDecisionOutput(Ef, hookEvent));
      let finalJson = np ? undefined : Ef;
      let ap =
        np && Ef !== undefined && isSyncHookJSONOutput(Ef) && Ef.continue === false
          ? {
              preventContinuation: true,
              ...(Ef.stopReason !== undefined && {
                stopReason: Ef.stopReason,
              }),
            }
          : undefined;
      if (validationError && _s.status === 2) {
        if (!hadSchemaInvalidBlock && !suppressPerInvocationTelemetry)
          logFeatureSad(hookFeature(hookEvent), "hook_output_schema_invalid_blocked");
        hadSchemaInvalidBlock = true;
      } else if (validationError) {
        hadSchemaInvalidOutput = true;
        let stderr = withHookStderr(validationError, _s.status, _s.stderr);
        emitHookResponse({
          hookId,
          hookName: hookDisplayName,
          hookEvent,
          output: _s.output,
          stdout: _s.stdout,
          stderr,
          exitCode: _s.status,
          outcome: "error",
        });
        yield {
          message: createAttachmentMessage_2({
            type: "hook_non_blocking_error",
            hookName: hookDisplayName,
            toolUseID,
            hookEvent,
            stderr,
            stdout: _s.stdout,
            exitCode: _s.status,
            command: hookCommand,
            durationMs: wr,
          }),
          outcome: "non_blocking_error",
          hook,
        };
        return;
      }
      if (finalJson) {
        if (isSyncHookJSONOutput_2(finalJson)) {
          if (_s.status === 2) {
            emitHookResponse({
              hookId,
              hookName: hookDisplayName,
              hookEvent,
              output: _s.output,
              stdout: _s.stdout,
              stderr: _s.stderr,
              exitCode: _s.status,
              outcome: "error",
            });
            yield {
              blockingError: {
                blockingError: `[${isServedCall ? `${hook.type} hook` : displayCommand}]: ${_s.stderr || "No stderr output"}`,
                command: displayCommand,
                ...promptEndingFields(hookEvent, {
                  reason: _s.stderr,
                }),
              },
              ...((_s.stdioIncomplete === true || _s.stdioClosedWithoutEnd === true) && {
                suppressOriginalPrompt: true,
              }),
              outcome: "blocking",
              hook,
            };
            return;
          }
          if (_s.status !== 0) {
            emitHookResponse({
              hookId,
              hookName: hookDisplayName,
              hookEvent,
              output: _s.output,
              stdout: _s.stdout,
              stderr: _s.stderr,
              exitCode: _s.status,
              outcome: "error",
            });
            yield {
              message: createAttachmentMessage_2({
                type: "hook_non_blocking_error",
                hookName: hookDisplayName,
                toolUseID,
                hookEvent,
                stderr: `Announced async, then failed with status code ${_s.status}: ${_s.stderr.trim() || "No stderr output"}`,
                stdout: _s.stdout,
                exitCode: _s.status,
                command: hookCommand,
                durationMs: wr,
              }),
              outcome: "non_blocking_error",
              hook,
              ...(exitedByContract(_s) && {
                ranByContract: true,
              }),
            };
            return;
          }
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: _s.output,
            stdout: _s.stdout,
            stderr: _s.stderr,
            exitCode: _s.status,
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
          stdout: _s.stdout,
          stderr: _s.stderr,
          exitCode: _s.status,
          durationMs: wr,
        });
        if (_s.noVerdict !== undefined && processed.blockingError)
          processed.blockingError = {
            blockingError: processed.blockingError.blockingError,
            command: processed.blockingError.command,
            ...promptEndingFields(hookEvent, {
              noVerdict: _s.noVerdict === "remote_run_timed_out" && Qm ? "interrupted" : _s.noVerdict,
            }),
          };
        emitHookMetrics(finalJson.metrics, pluginId, hookEvent, ko);
        if (isSyncHookJSONOutput(finalJson) && !finalJson.suppressOutput && plainText && _s.status === 0) {
          let content = `${sequential.bold(hookDisplayName)} completed`;
          emitHookResponse({
            hookId,
            hookName: hookDisplayName,
            hookEvent,
            output: _s.output,
            stdout: _s.stdout,
            stderr: _s.stderr,
            exitCode: _s.status,
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
                stdout: _s.stdout,
                stderr: _s.stderr,
                exitCode: _s.status,
                command: hookCommand,
                durationMs: wr,
              }),
            outcome: "success",
            hook,
          };
          return;
        }
        if (_s.status === 2 && !processed.blockingError)
          processed.blockingError = {
            blockingError: `[${isServedCall ? `${hook.type} hook` : displayCommand}]: ${_s.stderr || "No stderr output"}${pluginNote}`,
            command: displayCommand,
            ...promptEndingFields(hookEvent, {
              reason: _s.stderr,
            }),
          };
        if (_s.status === 2 && (_s.stdioIncomplete === true || _s.stdioClosedWithoutEnd === true))
          processed.suppressOriginalPrompt = true;
        emitHookResponse({
          hookId,
          hookName: hookDisplayName,
          hookEvent,
          output: _s.output,
          stdout: _s.stdout,
          stderr: _s.stderr,
          exitCode: _s.status,
          outcome: _s.status === 0 ? "success" : "error",
        });
        yield {
          ...processed,
          outcome: processed.blockingError ? "blocking" : "success",
          notStarted: _s.notStarted,
          hook,
        };
        return;
      }
      if (_s.status === 0) {
        emitHookResponse({
          hookId,
          hookName: hookDisplayName,
          hookEvent,
          output: _s.output,
          stdout: _s.stdout,
          stderr: _s.stderr,
          exitCode: _s.status,
          outcome: "success",
        });
        let content = await persistLargeHookOutput(_s.stdout.trim(), hookId, "stdout", {
          storageV5: effectiveStorageV5,
        });
        yield {
          message: createAttachmentMessage_2({
            type: "hook_success",
            hookName: hookDisplayName,
            toolUseID,
            hookEvent,
            content,
            stdout: _s.stdout,
            stderr: _s.stderr,
            exitCode: _s.status,
            command: hookCommand,
            durationMs: wr,
          }),
          outcome: "success",
          notStarted: _s.notStarted,
          hook,
        };
        return;
      }
      if (
        _s.status === 2 &&
        hook.type !== "script" &&
        exitTwoMeansMissingScript({
          hookEvent,
          stdout: _s.stdout,
          stderr: _s.stderr,
          pluginId,
          stdioIncomplete: _s.stdioIncomplete,
          stdioClosedWithoutEnd: _s.stdioClosedWithoutEnd,
        })
      ) {
        emitHookResponse({
          hookId,
          hookName: hookDisplayName,
          hookEvent,
          output: _s.output,
          stdout: _s.stdout,
          stderr: _s.stderr,
          exitCode: _s.status,
          outcome: "error",
        });
        yield {
          message: createAttachmentMessage_2({
            type: "hook_non_blocking_error",
            hookName: hookDisplayName,
            toolUseID,
            hookEvent,
            stderr:
              `Hook script appears to be missing \u2014 "${displayCommand}" exited 2 with: ${_s.stderr.trim()}. ${TREATING_NON_BLOCKING_PREFIX}` +
              (pluginId
                ? `Run \`/plugin\` to reinstall '${pluginId}' or remove it from settings.`
                : "If this is a plugin hook, check the plugin install (run /plugin)."),
            stdout: _s.stdout,
            exitCode: _s.status,
            command: hookCommand,
            durationMs: wr,
          }),
          outcome: "non_blocking_error",
          hook,
        };
        return;
      }
      if (_s.status === 2) {
        emitHookResponse({
          hookId,
          hookName: hookDisplayName,
          hookEvent,
          output: _s.output,
          stdout: _s.stdout,
          stderr: _s.stderr,
          exitCode: _s.status,
          outcome: "error",
        });
        yield {
          blockingError: {
            blockingError: `[${isServedCall ? `${hook.type} hook` : displayCommand}]: ${_s.stderr || "No stderr output"}${pluginNote}`,
            command: displayCommand,
            ...promptEndingFields(hookEvent, {
              reason: _s.stderr,
            }),
          },
          ...((_s.stdioIncomplete === true || _s.stdioClosedWithoutEnd === true) && {
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
        output: _s.output,
        stdout: _s.stdout,
        stderr: _s.stderr,
        exitCode: _s.status,
        outcome: "error",
      });
      if (_s.spawnFailed && !firstSpawnFailureSurfaced(hookEvent, displayCommand)) {
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
          stderr: `${NON_BLOCKING_STATUS_PREFIX}${_s.stderr.trim() || "No stderr output"}`,
          stdout: _s.stdout,
          exitCode: _s.status,
          command: hookCommand,
          durationMs: wr,
        }),
        ...ap,
        outcome: "non_blocking_error",
        hook,
        ...(exitedByContract(_s) && {
          ranByContract: true,
        }),
      };
      return;
    } catch (error) {
      cleanup?.();
      let gd = error instanceof Error ? error.message : String(error);
      logForDebugging(`Hook failed to run (${hookDisplayName}): ${gd}`, {
        level: "error",
      });
      emitHookResponse({
        hookId,
        hookName: hookDisplayName,
        hookEvent,
        output: `Failed to run: ${gd}`,
        stdout: "",
        stderr: `Failed to run: ${gd}`,
        exitCode: 1,
        outcome: "error",
      });
      if (vs && GUARD_HOOK_EVENTS.has(hookEvent)) {
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
      let Su = Ld
        ? undefined
        : guardScriptHookBlock(
            hook,
            hookEvent,
            isServedCall ? "script hook" : displayCommand,
            isServedCall ? "setup failed" : gd,
          );
      if (Su !== undefined) {
        yield Su;
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
          stderr: `Failed to run: ${gd}`,
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
  let pluginIdByHook = new Map(matchedHooks.map((hr) => [hr.hook, hr.pluginId]));
  let matchedByHook = new Map(matchedHooks.map((hr) => [hr.hook, hr]));
  let injectedCharsByPlugin = new Map();
  function fs(hook, mi, Ha) {
    let $a = pluginIdByHook.get(hook);
    if (!$a || Ha === 0) return;
    let nr = injectedCharsByPlugin.get($a);
    if (!nr) {
      nr = {
        additionalContextChars: 0,
        classifierContextChars: 0,
        systemMessageChars: 0,
        initialUserMessageChars: 0,
        hookSuccessStdoutChars: 0,
      };
      injectedCharsByPlugin.set($a, nr);
    }
    nr[mi] += Ha;
  }
  let outcomesByPlugin = new Map();
  let Vi = 0;
  let aggregatedPermission;
  let hookResultStream =
    toolUseContext === undefined || isServedCall
      ? all(mapped)
      : runHooksWithConcurrencyLimit(
          mapped,
          (hr) => {
            let mi = matchedHooks[hr];
            return isConsultHook(mi.hook) &&
              hookPromises[hr] === undefined &&
              mi.notTested === undefined &&
              !(hookEvent === "PermissionRequest" && mi.hook.type === "agent") &&
              getHookInputJson(mi, false).ok
              ? hookTimeoutMs(mi.hook, timeoutMs)
              : undefined;
          },
          {
            slots: hookSlotsRegistry.of(toolUseContext.session.host),
            signal,
            limitMs: timeoutMs,
          },
        );
  let hookKeepalive = startHookKeepalive(hookEvent, matchedHooks, timeoutMs);
  for await (let hr of hookKeepalive === noopRelease
    ? hookResultStream
    : withFinally(hookResultStream, hookKeepalive)) {
    let mi = matchedByHook.get(hr.hook);
    let Ha = notRunHooks.has(hr.hook)
      ? hr
      : summarizeHookFailures(
          hr,
          hookEvent,
          signal,
          isServedCall,
          mi !== undefined && isPersonalRestrictedHook(mi, hookEvent),
        );
    let $a =
      !isServedCall &&
      hookEvent === "PreToolUse" &&
      !notRunHooks.has(hr.hook) &&
      !(
        (hr.hook.type === "prompt" || hr.hook.type === "agent") &&
        toolUseContext?.agentId?.startsWith(HOOK_AGENT_ID_PREFIX) === true
      )
        ? getRemoteHookRunner(toolUseContext)
        : undefined;
    let nr = isServedCall
      ? redactServedBlockingError(hookEvent === "PreToolUse" ? refuseUnfinishedPreToolHook(Ha, signal) : Ha)
      : $a !== undefined
        ? refuseUnfinishedPreToolHook(Ha, signal, $a, {
            tool:
              matchQuery !== undefined && toolUseContext !== undefined
                ? findToolByName(toolUseContext.options.tools, matchQuery)
                : undefined,
            inSubagent: toolUseContext?.agentId !== undefined,
            continueIsContested: mi === undefined || mi.continueIsContested === true,
          })
        : Ha;
    outcomes[nr.outcome]++;
    let Ti = ao.get(hr.hook);
    if (Ti !== undefined) $o?.settle(Ti);
    let Vs = pluginIdByHook.get(nr.hook);
    if (Vs) {
      let jo = outcomesByPlugin.get(Vs);
      if (!jo) {
        jo = {
          success: 0,
          blocking: 0,
          non_blocking_error: 0,
          cancelled: 0,
        };
        outcomesByPlugin.set(Vs, jo);
      }
      jo[nr.outcome]++;
    }
    if (nr.message?.type === "attachment" && nr.message.attachment.type === "hook_success") {
      let { content, stdout } = nr.message.attachment;
      let fi = stdout?.length ?? 0;
      injectedCharCounts.hookSuccessStdoutChars += fi;
      fs(nr.hook, "hookSuccessStdoutChars", fi);
      if (stdout !== undefined && isPersistedHookOutputPath(stdout.trim(), content)) outputsPersistedCount++;
    }
    if (nr.updatedToolOutput !== undefined) {
      logForDebugging(`Hook ${hookEvent} (${getHookStatusText(nr.hook)}) replaced tool output`);
      yield {
        updatedToolOutput: nr.updatedToolOutput,
      };
    }
    if (nr.updatedMCPToolOutput !== undefined && nr.updatedToolOutput === undefined) {
      logForDebugging(
        `Hook ${hookEvent} (${getHookStatusText(nr.hook)}) replaced tool output (updatedMCPToolOutput)`,
      );
      yield {
        updatedMCPToolOutput: nr.updatedMCPToolOutput,
      };
    }
    if (nr.displayContent !== undefined)
      yield {
        displayContent: nr.displayContent,
      };
    if (matchedByHook.get(nr.hook)?.throughFamilyOnly === true) nr.classifierContext = undefined;
    if (nr.classifierContext) {
      let jo = truncateToLength(nr.classifierContext, HOST_CONTEXT_LINE_LIMIT);
      logForDebugging(
        `Hook ${hookEvent} (${getHookStatusText(nr.hook)}) provided classifierContext (${jo.length} chars after cap)`,
      );
      injectedCharCounts.classifierContextChars += jo.length;
      fs(nr.hook, "classifierContextChars", jo.length);
      yield {
        pairedRewrite:
          nr.updatedToolOutput !== undefined
            ? "direct"
            : nr.updatedMCPToolOutput !== undefined
              ? "legacy_mcp"
              : nr.legacyMcpRewriteSuppressed
                ? "suppressed"
                : "none",
        classifierContexts: [
          {
            value: jo,
            hostPrincipal:
              nr.hook.type === "callback" &&
              pluginIdByHook.get(nr.hook) === undefined &&
              (() => {
                let Qr = matchedByHook.get(nr.hook);
                return Qr !== undefined && Qr.pluginRoot === undefined && Qr.skillRoot === undefined;
              })(),
          },
        ],
      };
    }
    if (nr.preventContinuation) {
      logForDebugging(`Hook ${hookEvent} (${getHookStatusText(nr.hook)}) requested preventContinuation`);
      yield {
        preventContinuation: true,
        stopReason: nr.stopReason,
      };
    }
    let _i =
      nr.hook?.type === "prompt"
        ? {
            hook: nr.hook,
            stopReason: nr.stopReason,
            impossible: nr.impossible,
          }
        : {};
    if (nr.blockingError) {
      yield {
        blockingError: nr.blockingError,
        suppressOriginalPrompt: nr.suppressOriginalPrompt,
        ..._i,
      };
      aggregatedPermission = "deny";
    }
    if (nr.message)
      yield {
        message: nr.message,
        ..._i,
      };
    if (
      (hookEvent === "PreToolUse" || hookEvent === "PermissionRequest") &&
      nr.outcome === "non_blocking_error" &&
      toolUseID
    )
      attentionRegistryStore.noteHookFailure(
        toolUseID,
        formatHookFailureLine(
          hookEvent,
          nr.message?.type === "attachment" && nr.message.attachment.type === "hook_non_blocking_error"
            ? nr.message.attachment.stderr
            : "",
        ),
      );
    if (nr.timedOut && nr.hook.type === "prompt" && hookEvent === "Stop")
      yield {
        hook: nr.hook,
        timedOut: true,
      };
    Vi++;
    if (nr.systemMessage) {
      injectedCharCounts.systemMessageChars += nr.systemMessage.length;
      fs(nr.hook, "systemMessageChars", nr.systemMessage.length);
      let jo = await persistLargeHookOutput(nr.systemMessage, `${toolUseID}-${Vi}`, "systemMessage", {
        storageV5: effectiveStorageV5,
      });
      if (isPersistedHookOutputPath(nr.systemMessage, jo)) outputsPersistedCount++;
      yield {
        message: createAttachmentMessage_2({
          type: "hook_system_message",
          content: jo,
          hookName: hookDisplayName,
          toolUseID,
          hookEvent,
          ...(nr.heldForServedCall && {
            heldForServedCall: true,
          }),
        }),
      };
    }
    if (nr.terminalSequence) writeHistoryEntry(nr.terminalSequence);
    if (nr.additionalContext) {
      injectedCharCounts.additionalContextChars += nr.additionalContext.length;
      fs(nr.hook, "additionalContextChars", nr.additionalContext.length);
      logForDebugging(
        `Hook ${hookEvent} (${getHookStatusText(nr.hook)}) provided additionalContext (${nr.additionalContext.length} chars)`,
      );
      let jo = await persistLargeHookOutput(nr.additionalContext, `${toolUseID}-${Vi}`, "additionalContext", {
        storageV5: effectiveStorageV5,
      });
      if (isPersistedHookOutputPath(nr.additionalContext, jo)) outputsPersistedCount++;
      yield {
        additionalContexts: [jo],
      };
    }
    if (nr.initialUserMessage) {
      injectedCharCounts.initialUserMessageChars += nr.initialUserMessage.length;
      fs(nr.hook, "initialUserMessageChars", nr.initialUserMessage.length);
      logForDebugging(
        `Hook ${hookEvent} (${getHookStatusText(nr.hook)}) provided initialUserMessage (${nr.initialUserMessage.length} chars)`,
      );
      let jo = await persistLargeHookOutput(
        nr.initialUserMessage,
        `${toolUseID}-${Vi}`,
        "initialUserMessage",
        {
          storageV5: effectiveStorageV5,
        },
      );
      if (isPersistedHookOutputPath(nr.initialUserMessage, jo)) outputsPersistedCount++;
      yield {
        initialUserMessage: jo,
      };
    }
    if (nr.watchPaths && nr.watchPaths.length > 0) {
      logForDebugging(
        `Hook ${hookEvent} (${getHookStatusText(nr.hook)}) provided ${nr.watchPaths.length} watchPaths`,
      );
      yield {
        watchPaths: nr.watchPaths,
      };
    }
    if (nr.reloadSkills) {
      logForDebugging(`Hook ${hookEvent} (${getHookStatusText(nr.hook)}) requested reloadSkills`);
      yield {
        reloadSkills: true,
      };
    }
    if (nr.sessionTitle) {
      logForDebugging(
        `Hook ${hookEvent} (${getHookStatusText(nr.hook)}) provided sessionTitle (${[...nr.sessionTitle].length} chars)`,
      );
      yield {
        sessionTitle: nr.sessionTitle,
      };
    }
    if (matchedByHook.get(nr.hook)?.throughFamilyOnly === true) {
      nr.updatedInput = undefined;
      if (nr.permissionBehavior === "allow") {
        logForDebugging(
          `Hook ${hookEvent} (${getHookStatusText(nr.hook)}) permissionDecision=allow ignored: it matched this tool only through another of its names, which can deny or ask but not allow`,
        );
        nr.permissionBehavior = undefined;
      }
      if (nr.permissionRequestResult?.behavior === "allow") {
        logForDebugging(
          `Hook ${hookEvent} (${getHookStatusText(nr.hook)}) PermissionRequest allow ignored: it matched this tool only through another of its names, which can deny or ask but not allow`,
        );
        nr.permissionRequestResult = undefined;
      }
    }
    stripConfinedHookApproval(
      nr,
      `Hook ${hookEvent} (${getHookStatusText(nr.hook)})`,
      hookInput,
      toolUseContext,
    );
    if (nr.updatedInput !== undefined)
      toolUseContext?.remoteCall?.hookRewrites.push({
        byOwnHook: _r.has(nr.hook),
        handed: "tool_input" in hookInput ? hookInput.tool_input : undefined,
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
      let updatedInput =
        nr.updatedInput && (nr.permissionBehavior === "allow" || nr.permissionBehavior === "ask")
          ? nr.updatedInput
          : undefined;
      if (updatedInput)
        logForDebugging(
          `Hook ${hookEvent} (${getHookStatusText(nr.hook)}) modified tool input keys: [${Object.keys(updatedInput).join(", ")}]`,
        );
      let Qr =
        nr.permissionBehavior === "ask"
          ? sanitizeHostPermissionDisplay(nr.permissionDisplay, nr.hook, matchedByHook.get(nr.hook))
          : undefined;
      let fi = matchedByHook.get(nr.hook);
      yield {
        permissionBehavior: aggregatedPermission,
        hookPermissionDecisionReason: nr.hookPermissionDecisionReason,
        ...(nr.heldForServedCall && {
          heldForServedCall: true,
        }),
        hookSource: fi?.hookSource,
        ...(fi?.pluginId !== undefined &&
          fi.skillRoot === undefined && {
            hookPluginId: fi.pluginId,
          }),
        updatedInput,
        ...(updatedInput && {
          rewriterKind: getRewriterKindForHook(nr.hook, fi),
        }),
        ...(Qr && {
          permissionDisplay: Qr,
        }),
      };
    }
    if (nr.updatedInput && nr.permissionBehavior === undefined) {
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
    if (nr.permissionRequestResult)
      yield {
        permissionRequestResult: nr.permissionRequestResult,
      };
    if (nr.retry)
      yield {
        retry: nr.retry,
      };
    if (nr.elicitationResponse)
      yield {
        elicitationResponse: nr.elicitationResponse,
      };
    if (nr.elicitationResultResponse)
      yield {
        elicitationResultResponse: nr.elicitationResultResponse,
      };
    if (sessionHooks_2 && nr.hook.type !== "callback") {
      let jo = matchQuery ?? "";
      let Qr = {
        skillRoot: matchedHooks.find((Ri) => Ri.hook === nr.hook)?.skillRoot,
      };
      let fi =
        sessionHooks_2.getEntry(session.id, hookEvent, jo, nr.hook, Qr) ??
        sessionHooks_2.getEntry(
          session.id,
          hookEvent,
          getPluginHookRunner()?.ownTool(jo)?.name ?? jo,
          nr.hook,
          Qr,
        );
      if (fi?.onHookSuccess && nr.outcome === "success" && !nr.notStarted)
        try {
          fi.onHookSuccess(nr.hook, nr);
        } catch (error) {
          logError(
            Error("Session hook success callback failed", {
              cause: error,
            }),
          );
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
    logEvent("tengu_repl_hook_finished", {
      hookName: hookNameForTelemetry,
      numCommands: matchedHooks.length,
      numSuccess: outcomes.success,
      numBlocking: outcomes.blocking,
      numNonBlockingError: outcomes.non_blocking_error,
      numCancelled: outcomes.cancelled,
      totalDurationMs: wa,
      ...injectedCharCounts,
    });
    logOTelEvent(
      "hook_execution_complete",
      {
        hook_event: hookEvent,
        hook_name: hookNameForTelemetry_2,
        num_hooks: String(matchedHooks.length),
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
        ...(vn && {
          hook_definitions: hookDefinitionsJson,
        }),
      },
      ko,
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
async function safeHookCwd(e, n) {
  if (await pathExists(e)) return e;
  let r = tmpdir_2();
  for (let h of [n.originalCwd, n.projectRoot, homedir()])
    if (h !== e && (await pathExists(h))) {
      r = h;
      break;
    }
  let s = hookNameBlockedRegistry.of(getRootSession().host);
  if (!s.has(e)) {
    s.add(e);
    logForDebugging(`Hooks: working directory ${e} no longer exists; running hooks from ${r} instead`, {
      level: "warn",
    });
  }
  return r;
}
//@ chunk-e6aww6q8.js:3558093-3558143 affinity
var hookNameBlockedRegistry = new HostScoped(() => new Set());
var hookNameSeenRegistry = new HostScoped(() => new Set());
//@ chunk-e6aww6q8.js:3558460-3558506 facade-exports
/**
 * 判断钩子结果列表中是否有阻断结果。
 */
function hasBlockingResult(e) {
  return e.some((n) => n.blocked);
}
//@ chunk-e6aww6q8.js:3558506-3558690 layout
function runOutsideReplFunctionChain(e, n) {
  return runOutsideReplHookChain({
    event: n.hook_event_name,
    hookInput: {
      ...n,
    },
    signal: e.signal,
    origin: e.hookOrigin,
    runClassicHooks: (hookInput, tier) =>
      executeHooksOutsideREPL({
        ...e,
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
async function executeHooksOutsideREPL(e) {
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
  } = e;
  let hookEvent = hookInput.hook_event_name;
  let ke = matchQuery ? `${hookEvent}:${matchQuery}` : hookEvent;
  if (shouldRunSessionEndHook(hookEvent, signal)) await heldUntilExit();
  let we = tier?.managedHooksOnly
    ? undefined
    : maybeWaitForHookPolicy(
        hookEvent,
        () =>
          collectEventHooks(sessionHooks, session.id, hookEvent, {
            held: "only",
          }).length > 0,
        signal,
      );
  if (we !== undefined) await we;
  let Ee =
    !e.classicChainMember &&
    hookInput.hook_event_name !== "PreToolUse" &&
    isClassicHooked(hookInput.hook_event_name)
      ? hookInput
      : undefined;
  if (Ee !== undefined && !skipsEmptyDispatch(hookEvent, sessionHooks, session.id))
    return runOutsideReplFunctionChain(e, Ee);
  if (shouldDisableAllHooksIncludingManaged())
    logForDebugging(
      `Policy disableAllHooks: skipping configured hooks for ${ke} (SDK callback hooks still run)`,
    );
  let sessionId = shouldSkipHookDueToTrust();
  if (sessionId && e.personsHooksRunUntrusted !== true) {
    logForDebugging(`Skipping ${ke} hook execution - workspace trust not accepted`);
    return [];
  }
  let Ie = getAppState?.();
  let Me = sessionId
    ? await getUntrustedFolderSources(storageV5)
    : isAttachServeMode()
      ? await getServedSessionOwnSources(storageV5)
      : undefined;
  let We = getPluginHookRunner()?.owedList(hookEvent);
  if (We !== undefined) await awaitWithHookTimeout(We, hookEvent, signal, timeoutMs);
  if (Me !== undefined && Ee !== undefined && !skipsEmptyDispatch(hookEvent, sessionHooks, session.id))
    return runOutsideReplFunctionChain(e, Ee);
  let ze = tier?.managedHooksOnly ? undefined : getPluginHookRunner()?.whichCopyAsk?.(hookEvent, hookInput);
  if (ze !== undefined) await awaitWithHookTimeout(ze, hookEvent, signal, timeoutMs);
  let lt = await getMatchingHooks(sessionHooks, session.id, hookEvent, hookInput, undefined, {
    ...tier,
    getToolAliases: () => Ie?.toolPermissionContext.toolAliases,
    ...(Me !== undefined && {
      recordMatchers: true,
      ownSources: Me.ownSources,
    }),
  })
    .catch((error) => {
      logHookMatchingFailure(hookEvent, error);
      if (isGuardedHookEvent(hookEvent)) throw error;
      return [];
    })
    .then((no) => (Me === undefined ? no : filterWithheldFolderHooks(no, hookEvent, Me)));
  if (lt.length === 0) return [];
  if (signal?.aborted) return [];
  let userHooks = lt.filter((no) => !isInternalHook(no));
  if (userHooks.length > 0) {
    let pluginHookCounts = countHooksByPlugin(userHooks);
    let hookTypeCounts = countByPluginKey(userHooks);
    let ho = countHooksByType(userHooks);
    let yn = count(userHooks, (Kn) => Kn.matcherIsMatchAll);
    logEvent("tengu_run_hook", {
      hookName: hookTelemetryName(hookEvent, matchQuery),
      numCommands: userHooks.length,
      numMatchAllMatchers: yn,
      numSpecificMatchers: userHooks.length - yn,
      hookTypeCounts: hashEntries(ho),
      ...(pluginHookCounts && {
        pluginHookCounts: hashEntries(pluginHookCounts),
      }),
      ...(hookTypeCounts && {
        pluginHookCountsByHash: hookTypeCounts,
      }),
    });
  }
  let untrustedStart = Me?.untrustedStart;
  let jsonInput;
  let Et;
  let yt = false;
  try {
    jsonInput = jsonStringify(
      untrustedStart === undefined
        ? hookInput
        : {
            ...hookInput,
            cwd: untrustedStart,
          },
    );
    yt = isOversizedHookInput(hookEvent, jsonInput);
    if (yt) throw RangeError("Hook input is over the size limit");
  } catch (error) {
    logError(error);
    logFeatureBad(hookFeature(hookEvent), yt ? "hook_input_too_large" : "hook_input_stringify_failed");
    if (isGuardedHookEvent(hookEvent)) throw error;
    return [];
  }
  let gt;
  let At = false;
  let It = false;
  let Yt = userHooks.length > 0 ? startHookKeepalive(hookEvent, lt, timeoutMs) : noopRelease;
  let qt = new Set(lt.flatMap((no, hn) => (isPersonalRestrictedHook(no, hookEvent) ? [hn] : [])));
  let Zt = new Set();
  let hookPromises = lt.map(
    async ({ hook, pluginRoot, pluginId, skillRoot, settingsSource, projectRoot, notTested }, hookIndex) => {
      let hookOriginLabel = getHookOriginLabel({
        pluginId,
        settingsSource,
      });
      let vn = pluginHookRefusal(hookOriginLabel, hookEvent, hook);
      let co = vn ?? notTested;
      if (co !== undefined) {
        gt ??= "hook_did_not_run";
        Zt.add(hookIndex);
        let { blockingError } = describeKillSwitchedHook(
          hookEvent,
          ke,
          co,
          pluginId,
          blocksWhenItCannotRunElsewhere(hookEvent) &&
            (vn !== undefined || !(hook.type === "command" && isAsyncHookJSONOutput(hook))),
        );
        return {
          command: getHookDisplayText(hook),
          succeeded: false,
          output: blockingError?.blockingError ?? co,
          blocked: blockingError !== undefined,
        };
      }
      let So = qt.has(hookIndex);
      let ko;
      if (projectRoot !== undefined) {
        let cs = neverSkipSessionHooks(projectRoot) ? projectRoot : noSnapshotOverride();
        if (cs === null) {
          let _r = `not run: it came from ${projectRoot}, which is no longer a working copy this session can use, and the session's directory is not in one either`;
          logForDebugging(`Hooks: ${getHookDisplayText(hook)} for ${hookEvent} ${_r}`, {
            level: "warn",
          });
          gt ??= "hook_did_not_run";
          return {
            command: getHookDisplayText(hook),
            succeeded: false,
            output: _r,
            blocked: false,
          };
        }
        ko = cs;
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
            logForDebugging(`${ke} [callback] returned async response, returning empty output`);
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
          emitHookResponse_2(json, ke);
          logForDebugging(`${ke} [callback] completed successfully`);
          return {
            command: "callback",
            succeeded: true,
            output,
            blocked,
          };
        } catch (error) {
          cleanup?.();
          if (isAbortError(error)) {
            let jr = error instanceof StreamClosedAbortError || !!signal?.aborted;
            if (jr) {
              logForDebugging(
                error instanceof StreamClosedAbortError
                  ? `${ke} [callback] cancelled (control stream closed)`
                  : `${ke} [callback] cancelled`,
              );
              At = true;
            } else {
              logForDebugging(`${ke} [callback] timed out`, {
                level: "error",
              });
              gt ??= "hook_callback_timeout";
            }
            return {
              command: "callback",
              succeeded: false,
              output: "",
              blocked: false,
              ...(jr && {
                cancelled: true,
              }),
            };
          }
          let Oo = error instanceof Error ? error.message : String(error);
          logForDebugging(`${ke} [callback] failed to run: ${Oo}`, {
            level: "error",
          });
          gt ??= "hook_callback_failed";
          return {
            command: "callback",
            succeeded: false,
            output: Oo,
            blocked: false,
          };
        }
      }
      if (hook.type === "prompt") {
        gt ??= "hook_type_unsupported";
        return {
          command: hook.prompt,
          succeeded: false,
          output: "Prompt stop hooks are not yet supported outside REPL",
          blocked: false,
        };
      }
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
          if (_r.aborted) {
            gt ??= "hook_cancelled";
            return {
              command: cs,
              succeeded: false,
              output: "Hook cancelled",
              blocked: false,
              ...(signal?.aborted && {
                cancelled: true,
              }),
            };
          }
          if (_r.error || !_r.ok) {
            gt ??= "hook_mcp_tool_failed";
            return {
              command: cs,
              succeeded: false,
              output: _r.error || "MCP tool returned an error",
              blocked: false,
            };
          }
          let { json, validationError } = parseHookOutput(_r.body);
          if (validationError) throw Error(validationError);
          let Oo = json && isSyncHookJSONOutput(json) ? json : undefined;
          let jr = Oo && So ? restrictPersonalHookAnswer(Oo, hookInput) : Oo;
          let Or = jr && isSyncHookJSONOutput(jr) ? jr : undefined;
          let Io = Or?.decision === "block";
          if (Or) emitHookMetrics(Or.metrics, pluginId, hookEvent);
          emitHookResponse_2(jr ?? json, ke);
          return {
            command: cs,
            succeeded: true,
            output: Io ? Or?.reason || "" : _r.body,
            blocked: Io,
            watchPaths:
              Or?.hookSpecificOutput && "watchPaths" in Or.hookSpecificOutput
                ? Or.hookSpecificOutput.watchPaths
                : undefined,
            systemMessage: Or?.systemMessage,
          };
        } catch (error) {
          let Cr = error instanceof Error ? error.message : String(error);
          logForDebugging(`${ke} [${cs}] failed to run: ${Cr}`, {
            level: "error",
          });
          gt ??= "hook_mcp_exec_failed";
          return {
            command: cs,
            succeeded: false,
            output: Cr,
            blocked: false,
          };
        }
      }
      if (hook.type === "agent") {
        gt ??= "hook_type_unsupported";
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
        gt ??= "hook_type_unsupported";
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
            jsonInput,
            signal,
            timeoutMs,
            undefined,
            getManagedHttpHookEnv(hook),
          );
          if (httpResult.aborted) {
            logForDebugging(`${ke} [${hook.url}] cancelled`);
            gt ??= "hook_cancelled";
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
            let Or = httpHookUnreachableMessage(hookEvent, httpResult.error);
            logForDebugging(`${ke} [${hook.url}] ${Or}`, {
              level: "error",
            });
            gt ??= "hook_http_request_failed";
            return {
              command: hook.url,
              succeeded: false,
              output: Or,
              blocked: true,
            };
          }
          if (httpResult.error || !httpResult.ok) {
            let errMsg = httpResult.error || `HTTP ${httpResult.statusCode} from ${hook.url}`;
            logForDebugging(`${ke} [${hook.url}] failed: ${errMsg}`, {
              level: "error",
            });
            gt ??= "hook_http_request_failed";
            return {
              command: hook.url,
              succeeded: false,
              output: errMsg,
              blocked: false,
            };
          }
          let { json: httpJson, validationError: httpValidationError } = parseHttpHookOutput(httpResult.body);
          if (httpValidationError) throw Error(httpValidationError);
          let Vr = httpJson && So ? restrictPersonalHookAnswer(httpJson, hookInput) : httpJson;
          if (Vr && !isSyncHookJSONOutput_2(Vr))
            logForDebugging(`Parsed JSON output from HTTP hook: ${jsonStringify(Vr)}`, {
              level: "verbose",
            });
          if (Vr && isSyncHookJSONOutput(Vr)) emitHookMetrics(Vr.metrics, pluginId, hookEvent);
          emitHookResponse_2(Vr, ke);
          let Oo = Vr && isSyncHookJSONOutput(Vr) && Vr.decision === "block";
          let output = Oo
            ? (Vr && isSyncHookJSONOutput(Vr) && Vr.reason) || ""
            : hookEvent === "WorktreeCreate"
              ? Vr && isSyncHookJSONOutput(Vr) && Vr.hookSpecificOutput?.hookEventName === "WorktreeCreate"
                ? Vr.hookSpecificOutput.worktreePath
                : ""
              : httpResult.body;
          return {
            command: hook.url,
            succeeded: true,
            output,
            blocked: !!Oo,
            systemMessage: Vr && isSyncHookJSONOutput(Vr) ? Vr.systemMessage : undefined,
          };
        } catch (error) {
          let errorMessage = error instanceof Error ? error.message : String(error);
          logForDebugging(`${ke} [${hook.url}] failed to run: ${errorMessage}`, {
            level: "error",
          });
          gt ??= "hook_http_exec_failed";
          return {
            command: hook.url,
            succeeded: false,
            output: errorMessage,
            blocked: false,
          };
        }
      let un = hook.timeout ? Math.min(hook.timeout * 1000, MAX_TIMER_DELAY_MS) : timeoutMs;
      let hookDisplayText = getHookDisplayText(hook);
      let pluginHookRunner = getPluginHookRunner();
      let yo = hook.type === "command" && hookOriginLabel !== undefined && pluginHookRunner !== undefined;
      let Ho = yo && !isAsyncHookJSONOutput(hook);
      let { signal: abortSignal, cleanup } = createCombinedAbortSignal(signal, {
        timeoutMs: Ho ? undefined : un,
      });
      let Hr = false;
      let Fr = false;
      try {
        let cs =
          hook.type === "script"
            ? resolveScriptHook(hook, hookEvent)
            : {
                hook,
                env: undefined,
              };
        let hookProject = getHookProject(session);
        let Cr =
          untrustedStart !== undefined
            ? {
                originalCwd: untrustedStart,
                projectRoot: EMPTY_PATH_DIR,
              }
            : ko === undefined || hookProject === null
              ? hookProject
              : {
                  originalCwd: hookProject.originalCwd,
                  projectRoot: ko,
                };
        if (Et === undefined && yo)
          Et = {
            sent: writeRemoteHookInput(pluginHookRunner.stdin, hookInput),
          };
        let Vr = await execCommandHook(
          Ho
            ? rewriteInputIfMarked(cs.hook, {
                ...cs.hook,
                timeout: un / 1000,
              })
            : cs.hook,
          hookEvent,
          ke,
          jsonInput,
          Et?.sent,
          claudeEnvContextFrom(hookInput),
          Cr,
          untrustedStart ?? (hook.type === "script" ? (Cr?.projectRoot ?? hookInput.cwd) : hookInput.cwd),
          abortSignal,
          randomUUID(),
          hookIndex,
          pluginRoot,
          pluginId,
          settingsSource,
          skillRoot,
          hook.type === "script" || blocksWhenNonBlockingError(hook, hookEvent),
          cs.env,
          undefined,
          hookInputSummary(hookInput, undefined),
          hookSourceOf(hook),
          storageV5,
          credentials,
        );
        let Oo = signal?.aborted === true && Vr.stoppedAfterItsTimeout !== true;
        Hr = hook.type !== "script" || didScriptHookRun(Vr) || (Vr.aborted === true && Oo);
        Fr = Vr.status === 2 && !Vr.backgrounded;
        let jr = !Hr && hook.type === "script" && GUARD_HOOK_EVENTS.has(hookEvent);
        cleanup?.();
        if (Vr.aborted) {
          logForDebugging(`${ke} [${hookDisplayText}] cancelled`);
          gt ??= "hook_cancelled";
          return {
            command: hookDisplayText,
            succeeded: false,
            output: "Hook cancelled",
            blocked: jr,
            ...(Oo && {
              cancelled: true,
            }),
          };
        }
        logForDebugging(`${ke} [${hookDisplayText}] completed with status ${Vr.status}`);
        if (!Hr) {
          gt ??= "hook_did_not_run";
          return {
            command: hookDisplayText,
            succeeded: false,
            output: `script hook did not run (${describeHookDidNotRun(Vr)})${Vr.stderr.trim() ? `: ${Vr.stderr.trim()}` : ""}`,
            blocked: jr,
          };
        }
        let hookStdoutForParsing = getHookStdoutForParsing(Vr);
        let hookOutput = parseHookOutput(hookStdoutForParsing);
        let validationError = hookOutput.validationError;
        let rs = dropSuspectCaptureJson(Vr, hookEvent, hookOutput.json);
        let untrustedCaptureReason = getUntrustedCaptureReason(
          Vr,
          hookEvent,
          hookStdoutForParsing,
          rs,
          (Wi) => parseHookOutput(Wi).json,
        );
        if (untrustedCaptureReason !== undefined) {
          gt ??= "hook_stdio_incomplete";
          return {
            command: hookDisplayText,
            succeeded: false,
            output: withHookStderr(untrustedCaptureReason, Vr.status, Vr.stderr),
            blocked: PROMPT_GUARD_EVENTS.has(hookEvent),
          };
        }
        let json = rs !== undefined && So ? restrictPersonalHookAnswer(rs, hookInput) : rs;
        if (validationError && Vr.status === 2) It = true;
        else if (validationError) {
          gt ??= "hook_output_schema_invalid";
          throw Error(withHookStderr(validationError, Vr.status, Vr.stderr));
        }
        if (json && !isSyncHookJSONOutput_2(json))
          logForDebugging(`Parsed JSON output from hook: ${jsonStringify(json)}`, {
            level: "verbose",
          });
        if (json && isSyncHookJSONOutput(json)) emitHookMetrics(json.metrics, pluginId, hookEvent);
        emitHookResponse_2(json, ke);
        let Is = json && isSyncHookJSONOutput(json) && json.decision === "block";
        let fs = Vr.status === 2 || !!Is || jr;
        let output = Is
          ? (json && isSyncHookJSONOutput(json) && json.reason) || Vr.stderr || ""
          : Vr.status === 0
            ? Vr.stdout || ""
            : Vr.stderr || "";
        let watchPaths =
          json &&
          isSyncHookJSONOutput(json) &&
          json.hookSpecificOutput &&
          "watchPaths" in json.hookSpecificOutput
            ? json.hookSpecificOutput.watchPaths
            : undefined;
        let systemMessage = json && isSyncHookJSONOutput(json) ? json.systemMessage : undefined;
        if (Vr.status !== 0 && !fs) gt ??= "hook_nonzero_exit";
        return {
          command: hookDisplayText,
          succeeded: Vr.status === 0,
          output,
          blocked: fs,
          ...(Vr.exitedNormally && {
            exitCode: Vr.status,
          }),
          watchPaths,
          systemMessage,
        };
      } catch (error) {
        cleanup?.();
        let errorMessage = error instanceof Error ? error.message : String(error);
        logForDebugging(`${ke} [${hookDisplayText}] failed to run: ${errorMessage}`, {
          level: "error",
        });
        gt ??= "hook_exec_failed";
        return {
          command: hookDisplayText,
          succeeded: false,
          output: errorMessage,
          blocked: GUARD_HOOK_EVENTS.has(hookEvent) && (Fr || (!Hr && hook.type === "script")),
        };
      }
    },
  );
  let pn;
  {
    let no = new Map(userHooks.map((userHook, Kn) => [userHook.hook, Kn]));
    using hn =
      userHooks.length === 0
        ? undefined
        : trackRunningHooks({
            hookEvent,
            hooks: userHooks.map(({ hook }) => getHookProgressDisplay(hook)),
            agentId,
            toolName: getToolNameField(hookInput),
          });
    let results = Promise.all(
      lt.map(({ hook }, Kn) =>
        hookPromises[Kn].then((Xn) => {
          let fo = {
            ...Xn,
            ...(qt.has(Kn) && {
              answerHeld: true,
            }),
          };
          return Zt.has(Kn) ? fo : applyBlockOnFailure(hook, fo);
        }).finally(() => {
          let Xn = no.get(hook);
          if (Xn !== undefined) hn?.settle(Xn);
        }),
      ),
    );
    pn = await (Yt === noopRelease ? results : results.finally(Yt));
  }
  if (shouldRunSessionEndHook(hookEvent, signal)) await heldUntilExit();
  if (gt) logFeatureBad(hookFeature(hookEvent), gt);
  else if (At) logFeatureSad(hookFeature(hookEvent), "hook_cancelled");
  else if (It) logFeatureSad(hookFeature(hookEvent), "hook_output_schema_invalid_blocked");
  else logFeatureOk(hookFeature(hookEvent));
  for (let no of new Set(lt.map((hn) => hn.pluginId))) if (no) recordPluginUsage(no);
  return pn;
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
async function awaitWithHookTimeout(e, hookEvent, signal, timeoutMs) {
  if (signal !== undefined || blocksWhenItCannotRunElsewhere(hookEvent)) {
    await e(signal);
    return;
  }
  let combinedAbortSignal = createCombinedAbortSignal(undefined, {
    timeoutMs,
    refTimer: true,
  });
  try {
    await e(combinedAbortSignal.signal);
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
var statusLineLogStateByHost = new HostScoped(() => new StatusLineLogState());
//@ chunk-e6aww6q8.js:3570066-3571131 facade-exports = executeStatusLineCommand (0.656)
/**
 * 执行 statusLine 命令（复用 execCommandHook，事件名 StatusLine，stdin 为状态 JSON），返回非空输出行；禁用钩子或工作区未信任时不执行。
 */
async function executeStatusLineCommand(statusLineInput, signal, timeoutMs, logResult = false) {
  if (shouldDisableAllHooksIncludingManaged()) return;
  let h = statusLineLogStateByHost.of(statusLineInput.host);
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
      if (!h.okLogged) {
        h.okLogged = true;
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
    if (result.status !== 0 && !h.badLogged) {
      h.badLogged = true;
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
    if (!h.badLogged) {
      h.badLogged = true;
      logFeatureBad("status_line_command", "exec_error");
    }
    return;
  }
}
//@ chunk-e6aww6q8.js:3571131-3571754 facade-exports = executeFileSuggestionCommand (0.843)
/**
 * 执行 fileSuggestion 命令（@ 文件补全），默认 5 秒超时，按行返回候选。
 */
async function executeFileSuggestionCommand(e, n, r, s = 5000) {
  if (shouldDisableAllHooksIncludingManaged()) return [];
  if (isCustomizationDisabled("fileSuggestion")) return [];
  if (shouldSkipHookDueToTrust()) {
    logForDebugging("Skipping FileSuggestion command execution - workspace trust not accepted");
    return [];
  }
  let fileSuggestion = resolveFileSuggestionHook(getSettings_DEPRECATED()?.fileSuggestion);
  if (!fileSuggestion || fileSuggestion.type !== "command") return [];
  let abortSignal = r || AbortSignal.timeout(s);
  try {
    let jsonInput = jsonStringify(n);
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
      claudeEnvContextFrom(n),
      getSessionProject(e),
      n.cwd,
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
  let { message, ...Z } = processed;
  return {
    ...Z,
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
  for (let n of ["CLAUDE_PROJECT_DIR", "CLAUDE_PLUGIN_ROOT", "CLAUDE_PLUGIN_DATA"])
    command = command.replaceAll("${" + n + "}", () => "${env:" + n + "}");
  return command;
}
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
function getHookOriginLabel(o) {
  let pluginHookRunner = getPluginHookRunner();
  if (pluginHookRunner === undefined) return;
  let t = "settingsSource" in o ? MANAGED_PRIORITY_SOURCES.find((e) => e === o.settingsSource) : undefined;
  if (t !== undefined)
    return {
      settingsSource: t,
    };
  return "pluginId" in o && typeof o.pluginId === "string" && pluginHookRunner.holds(o.pluginId)
    ? {
        pluginId: o.pluginId,
      }
    : undefined;
}
//@ chunk-7a5rgqvc.js:813-922 placement
/**
 * 钩子是否可预过滤：command 类型，或没有带内容 if 条件的 prompt 类型。
 */
function isPrefilterableHook(o) {
  return (
    o.type === "command" ||
    (o.type === "prompt" &&
      (o.if === undefined || permissionRuleValueFromString(o.if).ruleContent === undefined))
  );
}
//@ chunk-7a5rgqvc.js:922-1091 placement
/**
 * 收集各设置来源中插件运行器提供的钩子，按停用状态跳过项目或设备级来源；全部钩子被禁用时返回空。
 */
function getPluginSettingsHooks(o) {
  let pluginHookRunner = getPluginHookRunner();
  if (pluginHookRunner === undefined || shouldDisableAllHooksIncludingManaged()) return [];
  let t = areDeviceHooksStoodDown();
  return MANAGED_PRIORITY_SOURCES.flatMap((e) =>
    (e === "projectSettings" ? areRepoHooksElsewhereStoodDown() : t && e !== "policySettings")
      ? []
      : pluginHookRunner.settingsHooks(e, o),
  );
}
//@ chunk-7a5rgqvc.js:1091-1256 placement
var CLOUD_HOOK_UNSUPPORTED_REASON =
  "a cloud session does not run command, script, HTTP or MCP tool hooks from the shared server it runs on";
var CLOUD_SAFE_HOOK_TYPES = new Set(["prompt", "agent", "callback", "function"]);
//@ chunk-7a5rgqvc.js:1256-1291 placement
function isCloudSafeHook(hook) {
  return CLOUD_SAFE_HOOK_TYPES.has(hook.type);
}
//@ chunk-7a5rgqvc.js:1291-1460 placement
/**
 * 云会话中只保留 prompt/agent/callback/function 钩子（及可信来源的 command）。
 */
function filterHooksForCloudSession(o) {
  if (!isDiskless()) return o;
  return o.flatMap((n) => {
    let t = getHookOriginLabel(n) !== undefined;
    let filtered = n.hooks.filter((hook) => isCloudSafeHook(hook) || (t && hook.type === "command"));
    return filtered.length > 0
      ? [
          {
            ...n,
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
function getHooksForEvent(o, n) {
  return filterHooksForCloudSession(getRegisteredEventHooks(o, n?.withoutCheckoutHooks === true));
}
//@ chunk-7a5rgqvc.js:1818-2304 placement
/**
 * 汇总某事件已注册的钩子：快照中的设置钩子、插件设置钩子、主线程代理钩子与注册钩子（按插件状态、托管独占、设备钩子停用与已同步插件是否使用过滤）。
 */
function getRegisteredEventHooks(o, n) {
  if (isCustomizationDisabled("hooks")) return [];
  let filtered = (getRegisteredHooks()?.[o] ?? []).filter(
    (i) => !(o === "SessionEnd" && "pluginRoot" in i && isSyncedPluginDirUnused(i.pluginRoot)),
  );
  if (shouldDisableAllHooksIncludingManaged())
    return filtered.filter((i) => !("pluginRoot" in i) && !("deviceOwner" in i));
  let managedState = managedHookState();
  let { managedOnly, managedPluginIds } = managedState;
  let deviceHooksStoodDown = areDeviceHooksStoodDown();
  let runner = getPluginHookRunner();
  let snapshotHooks = getHooksConfigFromSnapshot()?.[o] ?? [];
  return [
    ...(n ? withoutCheckoutSettingsHooks(snapshotHooks, o) : snapshotHooks),
    ...getPluginSettingsHooks(o),
    ...(managedOnly ? [] : (getMainThreadAgentHooks()?.[o] ?? [])),
    ...filtered.filter((i) =>
      isPluginMatcherAllX(i) && runner?.holds(i.pluginId) === true
        ? !(shouldHoldDeviceHooksByPolicy() && !managedPluginIds?.has(i.pluginId))
        : (!("pluginRoot" in i) || isHookAllowedByPolicy(i.pluginId, managedState)) &&
          !(deviceHooksStoodDown && "deviceOwner" in i),
    ),
  ];
}
//@ chunk-7a5rgqvc.js:2304-2322 placement
var weakMap = new WeakMap();
//@ chunk-7a5rgqvc.js:2322-2351 placement
/**
 * 为钩子登记"是否可运行"的判定函数。
 */
function registerHookEligibility(o, n) {
  weakMap.set(o, n);
}
//@ chunk-7a5rgqvc.js:2351-2392 placement
/**
 * 判断钩子的可运行判定是否返回真。
 */
function isHookEligible(o) {
  return weakMap.get(o)?.() === true;
}
//@ chunk-7a5rgqvc.js:2392-2424 placement
function hasHookEligibility(hook) {
  return weakMap.has(hook);
}
//@ chunk-7a5rgqvc.js:2424-2745 placement
/**
 * 过滤会话钩子 matcher：插件持有的技能钩子只在全部为可预过滤类型且未停用时保留（标记 pluginId）；策略要求跳过时只保留特定提示钩子。
 */
function filterSessionHookMatchers(o, skipSessionHooks) {
  let pluginHookRunner = getPluginHookRunner();
  return filterHooksForCloudSession(
    o.flatMap((e) => {
      if (e.skillRoot === undefined || pluginHookRunner?.holds(e.skillRoot) !== true) {
        if (!skipSessionHooks) return [e];
        let filtered = e.hooks.filter((hook) => hook.type === "prompt" && isHookEligible(hook));
        return filtered.length > 0
          ? [
              {
                ...e,
                hooks: filtered,
              },
            ]
          : [];
      }
      return e.hooks.every(isPrefilterableHook) &&
        !pluginHookRunner.standsDown(e.skillRoot) &&
        !shouldDisableAllHooksIncludingManaged() &&
        !shouldHoldDeviceHooksByPolicy()
        ? [
            {
              ...e,
              pluginId: e.skillRoot,
            },
          ]
        : [];
    }),
  );
}
//@ chunk-7a5rgqvc.js:2745-2802 fingerprint = getHooksConfig (0.848)
function isPluginMatcherAllX(o) {
  return "pluginRoot" in o && o.hooks.every(isPrefilterableHook);
}
//@ chunk-7a5rgqvc.js:2802-2832 layout
/**
 * 插件 id 是否为组织托管插件。
 */
function isManagedPluginId(o) {
  return isVouchedPolicyPluginId(o);
}
//@ chunk-7a5rgqvc.js:2832-2909 placement
function managedHookState(o = shouldAllowManagedHooksOnly()) {
  return {
    managedOnly: o,
    managedPluginIds: o && !isSafeMode() ? getPolicyAllowedSet() : null,
  };
}
//@ chunk-7a5rgqvc.js:2909-2983 placement
function isHookAllowedByPolicy(o, { managedOnly, managedPluginIds }) {
  return !managedOnly || managedPluginIds?.has(o) === true;
}
//@ chunk-7a5rgqvc.js:2983-3017 placement
/**
 * 判断插件钩子在"仅托管"策略下是否允许。
 */
function isManagedHookAllowed(o) {
  return isHookAllowedByPolicy(o, managedHookState(true));
}
//@ chunk-7a5rgqvc.js:3017-3063 placement
/**
 * 判断某来源的钩子当前是否允许运行（钩子总开关与策略）。
 */
function isHookSourceAllowed(o) {
  return areHooksEnabled() && !policySettingsUnreadable() && isHookAllowedByPolicy(o, managedHookState());
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
function dropHooksInHttpServe(e, hookEvent) {
  if (isHttpMcpServeInvocation()) {
    let filtered = e.filter(isInternalHook);
    let i = e.length - filtered.length;
    if (i > 0) {
      logForDebugging(
        `Hooks: ${i} ${hookEvent} ${plural(i, "hook")} from settings or plugins not run: claude mcp serve --transport http never runs them (intended)`,
        {
          level: "warn",
        },
      );
      logFeatureSad(hookFeature(hookEvent), "not_run_in_tool_server_daemon", {
        num_dropped: i,
      });
    }
    return filtered;
  }
  return e;
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
  hasHookForEvent,
  createBaseHookInput,
  hookInputCwd,
  executeHooks,
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
};
