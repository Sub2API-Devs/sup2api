/**
 * utils/permissions/permissions.ts
 *
 * 工具调用权限判定主流程（hasPermissionsToUseTool、PermissionRequest 钩子、dontAsk/headless 转换、auto 分类器调用与拒绝超限回退）及 allow/deny/ask 规则的查找与匹配。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/permissions.ts
 * pieces: chunk-0e8j1zzj.js (1), chunk-0h4e7gnq.js (1), chunk-0wdgqhcf.js (1), chunk-18hwfzwa.js (1), chunk-38x90rmj.js (1), chunk-8wvtd8sr.js (3), chunk-ddkccdnb.js (1), chunk-dyjqn2aj.js (1), chunk-e6aww6q8.js (203), chunk-pc1rmcr2.js (1), chunk-sfy7bm1n.js (41), chunk-xde1fhwg.js (1), chunk-xr4xc2mq.js (1)
 * attribution: fingerprint 15, callgraph-witnessed 2, placement 208, shared-adjacent 1, layout 30, file-local 1
 */
import {
  permissionRuleValueFromString,
  toolNameVariants,
  hasWildcard,
  wildcardRuleRegex,
  aliasesFor,
  matchWildcard,
} from "./permissionRuleParser.js";
import { AGENT } from "../../tools/AgentTool/constants.js";
import {
  getAllowedChannels,
  getIsNonInteractiveSession,
  getPermissionPromptToolName,
  getSessionId,
  isSdkDialogHostActive,
  getServerClassifierFallbackChoice,
  isCcsTenant,
  isDiskless,
  isThirdPartyServerClassifierRefused,
  markThirdPartyServerClassifierRefused,
  noteNoServerCheck,
  noteNoServerCheckStoppedTurn,
  getTotalInputTokens,
  getTotalOutputTokens,
  getTotalCacheReadInputTokens,
  getTotalCacheCreationInputTokens,
} from "../../bootstrap/state.js";
import { hasPermissionPromptTool, getPermissionPromptPerson } from "./permissionPromptHost.js";
import {
  isSameAnswerInput,
  isUnchangedAnswerInput,
  denyChangedAnswerInput,
  applyAnswerPermissionUpdates,
  denyLostTightening,
  applyPermissionAnswerChanges,
} from "./permissionAnswer.js";
import { isLiveMemoryTool } from "../../services/mcp/memoryServerVerification.js";
import { ZIi } from "./gitCommandRules.js";
import { formatPermissionRule, ruleToolNameFromString } from "./disallowedToolsFlag.js";
import { DEVICE_BASH_TOOL, DEVICE_COMMIT_FILES_TOOL } from "../../services/mcp/firstPartyServerIds.js";
import {
  isAutoAllowedInMode,
  getMcpPermissionModeOverride,
  isSandboxAutoAllowOff,
} from "./browserToolNames.js";
import {
  isRemoteBrowserReadWithoutClassifier,
  buildMcpToolName,
  MCP_TOOL_PREFIX,
  getToolNameForPermissionCheck as getToolNameForPermissionCheck_2,
  mcpInfoFromString,
  getMcpToolAliasNames,
} from "../../services/mcp/mcpStringUtils.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { env, antEnv } from "../env.js";
import {
  isAutoClassifierActive,
  isAutoModePermissionSurface,
  isAutoModeActive,
  noteRefusedMcpSkip,
} from "./autoModeState.js";
import {
  getAutoModeClassifierRole,
  SERVER_CLASSIFIER_LABEL,
  isClassifierTargetToolUse,
  getPermissionModeAtRequestForArbiter,
  alwaysTrueFlag,
  isArbiterRole,
  serverClassifierOffReason,
  isServerClassifierActive,
  awaitServerVerdict,
  shouldFallBackToLocal,
  noVerdictReasonFor,
  isServerNotRequestedReason,
  classifyServerVerdict,
  isInputRewrittenWithFallbackOff,
  countToolCallsSince_6,
  getRewriteLostVerdictNote,
  SERVER_CALL_UNAVAILABLE_INPUT_TOO_LONG,
} from "./serverClassifier/arbiter.js";
import { WEBFETCH, ALLOW_WEB_FETCH } from "../../tools/WebFetchTool/prompt.js";
import { WEBSEARCH } from "../../tools/WebSearchTool/prompt.js";
import { isCoworkAny } from "../entrypointKinds.js";
import { getToolPermissionContext, getMainLoopModel as getMainLoopModel_2 } from "./toolPermissionContext.js";
import { wi, xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import {
  isClassifierRoutedCircuitBreaker,
  isAutoModeDenyCircuitBreaker,
  CLASSIFIER_SWITCHED_OFF_KIND,
  SANDBOX_AUTO_ALLOW_REASON,
  READ_ONLY_AUTO_ALLOW_REASON,
  POWERSHELL_READ_ONLY_ALLOW_REASON,
  POWERSHELL_COMPOUND_READ_ONLY_PART_REASON,
  HOOK_ALLOW_FLAGGED_HEADLESS_DENY_REASON,
  HOOK_REWRITE_HEADLESS_DENY_REASON,
  mustBeLeftToAPerson,
  refusedAskOf,
  toolMaySettleUnaskedQuestion,
  carriesPersonsAsk,
  isLocalProjectionOnlyCircuitBreaker,
  isSandboxOverrideUnderReadBlock,
  SERVER_HOLDS_SHELL_ALLOW_REASON,
  TOOL_HOST_ALLOW_IS_CLASSIFIED_REASON,
  CANCELLED_AT_CLASSIFIER_NOTICE_REASON,
  CLASSIFIER_UNAVAILABLE_REASON,
  classifierWrittenReason,
  CLASSIFIER_TRANSCRIPT_TOO_LONG_REASON,
  CLASSIFIER_TOO_LONG_COMPACTING_REASON,
  HOOK_REWROTE_INPUT_REVIEW_REASON,
  AUTO_MODE_UNAVAILABLE_STOP_REASON,
  NO_PROJECT_DIRECTORY_DENY_REASON,
  NO_CONFIG_HOME_DENY_REASON,
  isUnwaivableBypassImmuneCircuitBreaker,
  isBypassImmuneCircuitBreaker,
  OUTSIDE_READS_BLOCKED_DENY_REASON,
} from "../../types/permissions.js";
import {
  getDangerousRmTimeoutConfig,
  getUnansweredSafetyCheckCount,
} from "../../tools/BashTool/bashPermissionFlags.js";
import {
  ALL_AUTO_MODE_RULE_ID_SET_WITH_COWORK,
  UNTRUSTED_CONTENT_RULE_IDS,
  AUTO_MODE_RULE_IDS,
  COWORK_RULE_IDS,
  replacesDefaultRules,
  ALL_AUTO_MODE_RULE_ID_SET_WITH_UNTRUSTED,
  ruleIdFromBracketPrefix,
  ALL_AUTO_MODE_RULE_ID_SET,
} from "./autoModeRulesPrompt.js";
import {
  fromSanitizer_SANITIZER_OUTPUT_ONLY,
  fromEnum,
  lit as lit_2,
  fromEnumOpt,
} from "../../services/analytics/safeMetadata.js";
import { getPluginRegistry } from "../plugins/pluginLoadState.js";
import { isHookRegistrationPending, hasNonBuiltinPluginSurface } from "../plugins/loadPluginHooks.js";
import {
  areHooksEnabled,
  executePermissionRequestHooks,
  managedTierHooks,
  hasSettingsHookForEvent,
} from "../hooks.js";
import { logError } from "../log.js";
import {
  toError,
  errorMessage,
  isAbortError,
  AbortError as AbortError_2,
  sanitizeErrorName as sanitizeErrorName_2,
} from "../errors.js";
import { SessionRootSlot, isNoProjectDirectoryError } from "../../bootstrap/sessionSlices.js";
import { identity as identity_2 } from "../identity.js";
import { canonicalFingerprint } from "../../services/api/requestFingerprint.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { isBgSession, isUnattendedInteractiveSession } from "../concurrentSessions.js";
import { isTeammateContextReady } from "../swarm/permissionSync.js";
import {
  isSettingSourceEnabled,
  getSettingSourceDisplayNameLowercase,
  EDITABLE_SETTING_SOURCES,
  SETTING_SOURCES,
} from "../settings/constants.js";
import { getGlobalConfig, saveGlobalConfig } from "../config.js";
import { markReadBlockApplied, isReadBlockOn } from "./readBlock.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import {
  updateSettingsForSource,
  getAutoModeConfig,
  getPolicySettingsOrigin,
  isAdminPolicyOrigin,
} from "../settings/settings.js";
import { logForDebugging } from "../debug.js";
import { SandboxManager } from "../sandbox/sandbox-adapter.js";
import {
  getAutoModeConfigOrDefault,
  isDangerousClassifierPermission,
  classifyAllShellEnabled,
  requiresClassifierForHookAllow,
  warnMcpRuleMismatch,
} from "./permissionSetup.js";
import { mainModelOverrideKeys } from "../model/canonicalModelName.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { wasProactivityEverOn } from "../../Tool.js";
import { cycleAllTeammateModes, cycleTeammateMode } from "../../components/teams/TeamsDialog.js";
import {
  loadAllPermissionRulesFromDisk,
  settingsGrantsConfined,
  deletePermissionRuleFromSettings,
  shouldAllowManagedPermissionRulesOnly,
} from "./permissionsLoader.js";
import { PATH_RULE_CARVE_OUT_RE } from "../settings/permissionRuleCarveOut.js";
import { isModelDrivenSession } from "../teammate.js";
import {
  priorAssistantContextEnabled,
  raceChoiceWithAbort,
  hasOpusAccess,
  sdkSupportsFallbackDialog,
  resolveServerFallbackChoice,
  getGatewayNoticeInfo,
  showServerFallbackNotice,
  takeNoServerCheckNotice,
  isChromeClassifierFloorCall,
  isChromeClassifierFloorTool,
  isMcpReviewedOutsideAuto,
  enqueuePermissionCheckStatus,
  startClassifierKeepalive,
  gatewayDisplayName,
  NO_CHECK_FOR_SESSION_TITLE,
  NO_CHECK_FOR_ACTION_TITLE,
  UNREVIEWED_ACTION_NOTICE,
} from "./serverClassifier/fallbackNotice.js";
import { logEvent } from "../../services/analytics/index.js";
import { getAPIProviderForAnalytics } from "../model/providers.js";
import { turnAbortControllerOf } from "../abortController.js";
import {
  TIMED_FALLBACK_AUTO_DENY_MS,
  createDenialTrackingState,
  resetConsecutiveDenials,
  undoRewriteDenialIfRetried,
  recordRewriteDenial,
  fingerprintToolCall,
  incrementDenialCounts,
  shouldFallbackToPrompting,
  DENIAL_LIMITS,
} from "./denialTracking.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import {
  shouldUseSandbox,
  antDisabledListMatchesCommandText,
} from "../../tools/BashTool/shouldUseSandbox.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { MONITOR } from "../../tools/MonitorTool/constants.js";
import {
  getDestructiveTargetCategory,
  classifyDestructiveTargetScope,
  classifyGitDestructiveTarget,
} from "../../tools/BashTool/destructiveTargets.js";
import { getPowerShellDestructiveCategory } from "../../tools/PowerShellTool/destructiveCommandWarning.js";
import { getCwdOrNull } from "../cwd.js";
import {
  isReadOnlyBrowserCall,
  normalizeAutoModeValue,
  shouldRouteBrowserCallToClassifier,
  isBrowserToolAutoAllowed,
  shouldClassifyBrowserWrite,
  classifyBrowserAction,
  hasBrowserWriteAction,
  isAgentSpawningTool,
  getToolNameForPermissionCheck,
  getClassifiableBrowserAction,
  buildDesktopActionReviewAsk,
} from "./browserComputerUseTools.js";
import { isRemoteBrowserToolModeFloorActive, shouldRelyOnModeFloorForBrowser } from "./mcpRuleMatching.js";
import {
  isActionSummaryEnabled,
  getProjectsRoleTelemetry,
  measureActionSummaries,
  countBatchActionSummaries,
  getActionSummaryLength,
} from "./actionSummary.js";
import { hasRelaySourceForClients } from "../../services/projects/threadRows.js";
import {
  hasAutoModeDenyLists,
  resolveToolCheck,
  personOnlyAsk,
} from "../../plugins/functionHooks/toolCheckHooks.js";
import {
  createSystemMessage,
  buildClassifierUnavailableMessage,
  buildNoPromptAvailableDenial,
  AUTO_REJECT_MESSAGE,
  DONT_ASK_REJECT_MESSAGE,
  REJECT_MESSAGE,
  quoteToolInputForClassifierMessage,
  buildClassifierRefusedOrTransientGuidance,
  buildYoloRejectionMessage,
  buildDangerousRemovalDenial,
} from "../messages.js";
import { extractOutputRedirections } from "../bash/commands.js";
import { plural, trimEndChars } from "../stringUtils.js";
import { permissionModeTitle } from "./PermissionMode.js";
import { isPinnedOrWildcardRule, USERSETTINGS } from "./classifierApprovalRules.js";
import {
  dropBareAllowRulesForTools,
  getToolNameWithAliases,
  supportsPersistence as supportsPersistence_2,
  applyPermissionUpdates,
  persistPermissionUpdates,
  addAdditionalWorkingDirectories,
  isRemovalWaiverActive,
  applyValidatedPermissionUpdate,
  clearRemovalWaiverIfPathScoped,
} from "./PermissionUpdate.js";
import { isPolicyAllowed as isPolicyAllowed_3 } from "../../services/policyLimits/policyEvidence.js";
import { filterOfferedAgents } from "../../plugins/functionHooks/agentHooks.js";
import { requiresConnectorGrant_2 } from "../../services/mcp/claudeai.js";
import { isHookOrPluginSteered, getHookCaller, isUnattendedAgentContext } from "../agentContext.js";
import {
  guardAccountMemoryHookRewrite,
  validatePermissionRequestUpdatedInput,
  isUnrecognizedKeysIssue,
  deleteKeysAtPaths,
} from "../hooks/hookUpdatedInput.js";
import {
  getRegisteredCheck,
  CHECK_NO_DECISION,
  rememberPendingCheck,
  getCheckRunner,
} from "./checkRegistry.js";
import {
  notePendingPermissionAnswer,
  recordPipelineResult,
  permissionRecordModule,
  recordCheckedResult,
} from "./permissionRecord.js";
import {
  SERVER_CONTEXT_STALE,
  hasHeldServerVerdict,
  isServerClassifierUnsupported,
  isServerUnavailableReason,
  handleServerVerdictUnavailable,
  clearUnavailableStreak,
  sentExactMcpAllowRule,
  buildTurnEndedUnavailableMessage,
} from "./serverClassifier/results.js";
import { settingsProblemDenial } from "../settings/settingsProblems.js";
import { denyReservedArtifactKeys } from "../../tools/ArtifactTool/reservedKeys.js";
import { isChromeToolName, isBrowserPreviewToolName } from "../claudeInChrome/chromeToolNames.js";
import { sanitizeToolNameForAnalytics, builtinToolServedByMcp } from "../../services/analytics/metadata.js";
import { sanitizeMarkName } from "../startupMarks.js";
import { mcpToolLogFields } from "../../hooks/toolPermission/permissionLogging.js";
import {
  chromeGrantAllowlistWithoutClassifier,
  shouldClassifyAskUserQuestion,
  autoModeUnavailableNotes,
  describeAutoModeUnavailableCause,
  buildAutoDenyMarker,
} from "./autoModeUnavailable.js";
import {
  rememberCommandNetworkLists,
  areCommandNetworkListsOffered_2,
} from "../../tools/BashTool/sandboxNetwork.js";
import { appendAutoModeDecision } from "./autoModeDecisionLog.js";
import { isEvalBuild } from "../envUtils.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import {
  logStrictTierUnavailable,
  recordContextNavigation,
  prependInheritedVerifiedTurns,
  formatActionForClassifier,
  classifyYoloAction,
  collectToolUseIdSet,
} from "./yoloClassifier.js";
import {
  isLocalClassifierSwitchedOff,
  getServerClassifierFallbackMode,
  getUserServerClassifierSwitch,
  agentIdOrMain,
  getApiRouteKind,
  isBetasSwitchSetAside,
  isMerryPopcornOn,
  isCopperTrellisOn,
  TIMER_MARGIN_MS,
} from "./serverClassifier/flags.js";
import { isLinkedWorktreeFastPathEnabled, verifiedLinkedWorktreeDirectories } from "./filesystem.js";
import { APIUserAbortError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { REMOTE_BROWSER_SERVER_NAME } from "../../services/mcp/remoteBrowserServer.js";
import { keepResolvedHostPin } from "../../commands/mobile/mobile.js";
import {
  isWebToolRestrictedInRelay,
  isRestrictedNonSessionRule,
  isSkillPluginSurfaceEnabled,
} from "./permissionRulePayload.js";
import { isRemoteBrowserToolUnderModeFloor } from "./remoteBrowser.js";
import { CommitTurnSlot, enqueueClassifierRequest } from "./serverClassifier/context.js";
import { pinSessionId } from "../sessionStorage.js";
import {
  currentMcpClients,
  hasAccessToIDEExtensionDiffFeature as hasAccessToIDEExtensionDiffFeature_3,
} from "../../services/compact/idleToolResultClearing.js";
import { inputAsWrittenSymbol } from "../messageKinds.js";
import { fallbackUsageDelta } from "../../services/api/withRetry.js";
import { SAFETY_MONITOR_BLOCKED } from "../../services/api/errors.js";
import { telemetrySafeModelName } from "../model/telemetryModelName.js";
import { calculateCostFromTokenCounts } from "../modelCost.js";
import { EXITPLANMODE_2 } from "../../tools/ExitPlanModeTool/constants.js";
import { mergeClients as mergeClients_3 } from "../hostScoped.js";
import { STRUCTUREDOUTPUT } from "../../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { HOOK_AGENT_ID_PREFIX } from "../agentId.js";
import { powershellToolCheckExactMatchPermission } from "../../tools/PowerShellTool/powershellPermissions.js";
import { askClassifierForAllowedDomains } from "../../tools/BashTool/bashSecurity.js";
import { SKILL } from "../../tools/SkillTool/skillToolNames.js";
import { jsonStringify } from "../slowOperations.js";
import { dispatchClassicEvent } from "../../plugins/functionHooks/modAdmission.js";
import { registerAgent } from "../telemetry/perfettoTracing.js";
import { getSessionFeatureValues } from "../../bootstrap/sessionFeatureValues.js";
import {
  HEARTH_WRITE_TOOL_NAMES as HEARTH_WRITE_TOOL_NAMES_2,
  HEARTHBOT,
} from "../../services/mcp/ccrMetaMcp.js";
import {
  standardKeyRuleRow,
  ruleWithinServerPrefix,
  compileMcpRuleMatcher,
  getMcpServerRulePrefixes,
  ruleWithNormalizedServer,
  isServerIdentityActive,
  toInternalToolName,
  mcpRuleMatchesToolAlias,
} from "../../services/mcp/serverIdentity.js";
import { LISTMCPRESOURCESTOOL } from "../../tools/ListMcpResourcesTool/prompt.js";
import { READ_MCP_RESOURCE_DIR_TOOL_NAME } from "../../tools/ReadMcpResourceDirTool/prompt.js";
import { READMCPRESOURCETOOL } from "../../tools/ReadMcpResourceTool/prompt.js";
import { REFRESH_MCP_TOOLS_TOOL_NAME } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { DEVICE_2, HOST_TOOL_INPUT_FIELD, machineNameMatches } from "../../bridge/deviceRegistration.js";
import { normalizeNameForMCP, CLAUDE_AI_NAME_PREFIX, CLAUDE_AI } from "../../services/mcp/normalization.js";
import { toSyncedSkillAlias } from "../../skills/syncedSkills.js";
import { isTopHostSession } from "../sessionShape.js";
import {
  parseTypePrefixedValue,
  getUrlRulesForTool,
  matchesWildcardPattern,
} from "../../tools/ArtifactTool/permissions/urlRules.js";
import { typeNameWithoutQuotes } from "../../services/artifacts/artifactTypes.js";
import { FileEditTool } from "../../tools/FileEditTool/FileEditTool.js";
import { editAskClassifierRoutable } from "../../tools/ArtifactTool/publishEdits.js";
import { uniq } from "../collections.js";
import { isReplToolName } from "../../tools/REPLTool/constants.js";
import { toolsRunningCodeAsBash } from "./filterToolsByDenyRules.js";
import { toolMatchesAnyName } from "../../services/tools/permissionCheckGuard.js";
import { ARTIFACT_TOOL_NAME, standsInForBuiltInArtifact } from "../../tools/AgentTool/agentToolUtils.js";
import { dbRowKey } from "../../tools/ArtifactTool/permissions/dbWriteInputs.js";
import { CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL } from "../claudeInChrome/common.js";
import { isOfficialMarketplaceRef, hasSimilarMarketplaceName } from "../plugins/marketplaceNames.js";
import { hasMintedReentry } from "../../tools/SendMessageTool/isolationDispatchGate.js";

//@ chunk-e6aww6q8.js:49322-49345 placement
function isChainOnAllowActive() {
  return false;
}
//@ chunk-e6aww6q8.js:996568-996843 placement
/**
 * tools 列表含 "*" 时，从 Agent(type1,type2) 形式的条目收集 allowedAgentTypes；未定义返回 {}，不含 "*" 或出现非 Agent 条目返回 null。
 */
function parseWildcardAgentTypes(tools) {
  if (tools === undefined) return {};
  if (!tools.includes("*")) return null;
  let n;
  for (let r of tools) {
    if (r === "*") continue;
    let { toolName, ruleContent } = permissionRuleValueFromString(r);
    if (toolName !== AGENT || !ruleContent) return null;
    n ??= [];
    n.push(
      ...ruleContent
        .split(",")
        .map((y) => y.trim())
        .filter(Boolean),
    );
  }
  return n
    ? {
        allowedAgentTypes: n,
      }
    : {};
}
//@ chunk-e6aww6q8.js:996843-996928 placement
/**
 * canPromptUserForPermission：存在可交互提示通道（非交互时需显式提示工具）。
 */
function canPromptUserForPermission() {
  if (getAllowedChannels().length > 0 && getIsNonInteractiveSession()) return false;
  if (getIsNonInteractiveSession() && !hasPermissionPromptTool(getPermissionPromptToolName())) return false;
  return true;
}
//@ chunk-e6aww6q8.js:996928-997021 placement
/**
 * shouldReplaceMemoryInput：Live 记忆工具的输入被替换。
 */
function shouldReplaceMemoryInput(tool, n, updatedInput, s = false) {
  return (
    isLiveMemoryToolName(tool) &&
    updatedInput !== undefined &&
    !(s && Object.keys(updatedInput).length === 0) &&
    !isSameAnswerInput(updatedInput, n)
  );
}
//@ chunk-e6aww6q8.js:997021-997050 placement
/**
 * isLiveMemoryToolName：是否为 Live 记忆工具。
 */
function isLiveMemoryToolName(tool) {
  return isLiveMemoryTool(tool);
}
//@ chunk-e6aww6q8.js:1270876-1270900 placement
function EMPTY_RULE_ANNOTATIONS() {
  return {};
}
//@ chunk-e6aww6q8.js:1270900-1271167 placement
/**
 * 按决策原因里的规则（子命令结果递归）查注释表，命中返回带前导空格的说明后缀，否则空串。
 */
function getRuleAnnotationSuffix(decisionReason, n = EMPTY_RULE_ANNOTATIONS(), r = ZIi) {
  if (decisionReason?.type === "rule") {
    let { rule } = decisionReason;
    let h = formatPermissionRule(rule.ruleValue);
    let y = n[h] ?? (rule.source === "command" ? r[h] : undefined);
    return y ? ` ${y}` : "";
  }
  if (decisionReason?.type === "subcommandResults")
    for (let reason of decisionReason.reasons.values()) {
      let ruleAnnotationSuffix = getRuleAnnotationSuffix(reason.decisionReason, n, r);
      if (ruleAnnotationSuffix) return ruleAnnotationSuffix;
    }
  return "";
}
//@ chunk-e6aww6q8.js:1271167-1271286 placement
function appendRuleAnnotation(e) {
  let ruleAnnotationSuffix = getRuleAnnotationSuffix(e.decisionReason);
  if (ruleAnnotationSuffix === "" || e.message.endsWith(ruleAnnotationSuffix)) return e;
  return {
    ...e,
    message: e.message + ruleAnnotationSuffix,
  };
}
//@ chunk-e6aww6q8.js:1285727-1285804 placement
var TENGU_BUZZING_PELICAN = "tengu_buzzing_pelican";
var DEVICE_TOOLS_WITH_CLASSIFIER_ROLE = new Set([DEVICE_BASH_TOOL, DEVICE_COMMIT_FILES_TOOL]);
var TENGU_DEEP_DUSK = "tengu_deep_dusk";
//@ chunk-e6aww6q8.js:1285804-1285898 placement
/**
 * isClassifierRoutedMcpTool：该 MCP 工具交由分类器裁决。
 */
function isClassifierRoutedMcpTool(tool, toolPermissionContext) {
  if (tool.mcpInfo === undefined) return false;
  let r = isAutoAllowedInMode(tool, toolPermissionContext);
  return (
    isDeepDuskDeviceTool(getToolNameForPermissionCheck_2(tool), r, toolPermissionContext) ||
    isBuzzingPelicanRouted(r, toolPermissionContext)
  );
}
//@ chunk-e6aww6q8.js:1285898-1285965 placement
/**
 * isDeepDuskDeviceTool：设备工具在 deep_dusk 开关下走仲裁。
 */
function isDeepDuskDeviceTool(e, n, r) {
  return (
    DEVICE_TOOLS_WITH_CLASSIFIER_ROLE.has(e) &&
    isRemoteArbiterMode(n, r) &&
    readFlagWithOverride(TENGU_DEEP_DUSK, {
      safe: true,
    })
  );
}
//@ chunk-e6aww6q8.js:1285965-1286010 placement
/**
 * isBuzzingPelicanRouted：仲裁器下按 buzzing_pelican 开关放行。
 */
function isBuzzingPelicanRouted(e, n) {
  return isRemoteArbiterMode(e, n) && getFeatureValue_CACHED_MAY_BE_STALE(TENGU_BUZZING_PELICAN, false);
}
//@ chunk-e6aww6q8.js:1286010-1286105 placement
function isRemoteArbiterMode(e, n) {
  return (
    env.CLAUDE_CODE_REMOTE &&
    isAutoClassifierActive(e, n.servedCall === true) &&
    getAutoModeClassifierRole(n.mode) === "arbiter"
  );
}
//@ chunk-e6aww6q8.js:1286105-1286163 placement
var TENGU_JAUNTY_UMBRELLA = "tengu_jaunty_umbrella";
var TENGU_TOASTY_FIDDLE = "tengu_toasty_fiddle";
//@ chunk-e6aww6q8.js:1286163-1286201 placement
/**
 * isWebFetchOrSearch：是否为 WebFetch/WebSearch。
 */
function isWebFetchOrSearch(e) {
  return e === WEBFETCH || e === WEBSEARCH;
}
//@ chunk-e6aww6q8.js:1286201-1286280 placement
/**
 * isWebToolClassifierRouted：Web 工具是否交给 auto 分类器。
 */
function isWebToolClassifierRouted(tool, toolPermissionContext) {
  return (
    tool.mcpInfo === undefined &&
    isWebFetchOrSearch(tool.name) &&
    isWebToolClassifierRouted_2(
      tool.name,
      isAutoAllowedInMode(tool, toolPermissionContext),
      toolPermissionContext,
    )
  );
}
//@ chunk-e6aww6q8.js:1286280-1286566 placement
/**
 * 判断 WebFetch/WebSearch 是否交给 auto 分类器处理：调用方已声明、Cowork 且分类器启用时按分类器角色（arbiter 读 tengu_jaunty_umbrella，off/shadow 读 tengu_toasty_fiddle 列表）决定。
 */
function isWebToolClassifierRouted_2(e, mode, r) {
  if (r.callerClassifiesWebCalls?.includes(e)) return true;
  if (!isCoworkAny() || !isAutoClassifierActive(mode, r.servedCall === true)) return false;
  switch (getAutoModeClassifierRole(r.mode)) {
    case "arbiter":
      return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_JAUNTY_UMBRELLA, false);
    case "off":
    case "shadow": {
      let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_TOASTY_FIDDLE, []);
      return Array.isArray(featureValue_CACHED_MAY_BE_STALE) && featureValue_CACHED_MAY_BE_STALE.includes(e);
    }
    case "arbiterWithLocalFallback":
      return false;
  }
}
//@ chunk-e6aww6q8.js:1286566-1286691 placement
/**
 * 复制权限上下文并切换模式，同时记录由分类器裁决的 Web 工具（callerClassifiesWebCalls）。
 */
function withClassifiedWebCalls(e, mode) {
  let filtered = [WEBFETCH, WEBSEARCH].filter((s) => isWebToolClassifierRouted_2(s, e.mode, e));
  return {
    ...e,
    mode,
    ...(filtered.length > 0 && {
      callerClassifiesWebCalls: filtered,
    }),
  };
}
//@ chunk-e6aww6q8.js:1286691-1286737 placement
/**
 * isWebSearchClassifierRouted：WebSearch 是否交给分类器。
 */
function isWebSearchClassifierRouted(tool, toolPermissionContext) {
  return tool.name === WEBSEARCH && isWebToolClassifierRouted(tool, toolPermissionContext);
}
//@ chunk-e6aww6q8.js:1286737-1286768 placement
var TENGU_DAPPER_TRUFFLE = "tengu_dapper_truffle";
//@ chunk-e6aww6q8.js:1286768-1286891 placement
function shouldClassifyDestructiveMcpWrite(e, n, r, s) {
  return (
    isAutoClassifierActive(r, s) &&
    (e.isDestructive?.(n) ?? false) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_cowork_auto_mode_include_allowed_write_mcp", false)
  );
}
//@ chunk-e6aww6q8.js:1286891-1286991 placement
function shouldClassifyRemoteMcpWrite(e, n, r, s) {
  return (
    e.mcpInfo !== undefined &&
    env.CLAUDE_CODE_REMOTE &&
    shouldClassifyDestructiveMcpWrite(e, n, r, s.servedCall === true)
  );
}
//@ chunk-e6aww6q8.js:1286991-1287072 placement
function hasMcpServerPolicyAllow(e, n) {
  return getAllowRules(n).some((r) => r.source === "mcpServerPolicy" && toolMatchesWholeToolRule(e, r));
}
//@ chunk-e6aww6q8.js:1287072-1287202 placement
function getClassifierOverridableRuleSource(e, n, r, s, toolPermissionContext) {
  let { source } = e;
  return (source === "cliArg" || source === "command" || source === "session" || source === "mcpMount") &&
    shouldClassifyRemoteMcpWritePolicy(n, r, s, toolPermissionContext)
    ? source
    : undefined;
}
//@ chunk-e6aww6q8.js:1287202-1287254 placement
function shouldClassifyRemoteMcpWritePolicy(e, n, r, s) {
  return shouldClassifyRemoteMcpWrite(e, n, r, s) && hasMcpServerPolicyAllow(e, s);
}
//@ chunk-e6aww6q8.js:1287254-1287419 placement
function isShadowedServerPolicyRule(e, n, r, s, toolPermissionContext, y) {
  return (
    (e.source === "cliArg" || e.source === "session" || e.source === "mcpMount") &&
    shouldClassifyRemoteMcpWrite(n, r, s, toolPermissionContext) &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_DAPPER_TRUFFLE, "off") === "server" &&
    y() === "arbiter" &&
    hasMcpServerPolicyAllow(n, toolPermissionContext)
  );
}
//@ chunk-e6aww6q8.js:1287419-1287660 placement
/**
 * 判断一条规则命中的 MCP 调用该走哪条分类器路径：serverPolicy、remoteSession 或 shadowedServerPolicy；不适用返回 undefined。
 */
function getMcpRuleClassifierRoute(e, tool, r, s, h, y) {
  if (e === null) return;
  if (e.source === "mcpServerPolicy" && shouldClassifyDestructiveMcpWrite(tool, r, s, false))
    return "serverPolicy";
  if (tool.mcpInfo === undefined) return;
  let toolPermissionContext = getToolPermissionContext(h);
  if (isClassifierRoutedMcpTool(tool, toolPermissionContext)) return "remoteSession";
  return isShadowedServerPolicyRule(e, tool, r, s, toolPermissionContext, y)
    ? "shadowedServerPolicy"
    : undefined;
}
//@ chunk-e6aww6q8.js:1287660-1287703 placement
/**
 * classifierOnlyConfig：取工具的 classifierOnly 配置。
 */
function classifierOnlyConfig(e) {
  return e.classifierOnly?.();
}
//@ chunk-e6aww6q8.js:1287703-1287781 placement
var CLASSIFIER_DENY_SOURCES = new Set(["userSettings", "projectSettings", "localSettings", "session"]);
//@ chunk-e6aww6q8.js:1287781-1287974 placement
function isClassifierOnlyToolUnblocked(e, n, r) {
  let toolPermissionContext = getToolPermissionContext(r);
  if (classifierOnlyConfig(e)?.onBlock !== "flag" || !isAutoModePermissionSurface(toolPermissionContext))
    return false;
  let h = {
    ...toolPermissionContext,
    alwaysDenyRules: wi(toolPermissionContext.alwaysDenyRules, (y, S) => CLASSIFIER_DENY_SOURCES.has(S)),
  };
  return getDenyRuleForTool(h, e) === null && matchToolRule(h, e, n, "deny") === null;
}
//@ chunk-e6aww6q8.js:1287974-1288141 placement
function buildClassifierOnlyDenial(e, n) {
  return {
    behavior: "deny",
    message: `Only the auto-mode classifier can allow ${e.name}: ${n}`,
    decisionReason: {
      type: "other",
      reason: `classifierOnly: ${n}`,
    },
  };
}
//@ chunk-e6aww6q8.js:1288141-1288404 placement
function isUnclassifiableAskReason(decisionReason) {
  switch (decisionReason?.type) {
    case "safetyCheck":
      return (
        !decisionReason.classifierApprovable &&
        (!isClassifierRoutedCircuitBreaker(decisionReason) ||
          (isAutoModeDenyCircuitBreaker(decisionReason) && getDangerousRmTimeoutConfig().enabled))
      );
    case "rule":
      return decisionReason.rule.ruleBehavior === "ask";
    case "subcommandResults":
      return [...decisionReason.reasons.values()].some((reason) =>
        isUnclassifiableAskReason(reason.decisionReason),
      );
    default:
      return false;
  }
}
//@ chunk-e6aww6q8.js:1288404-1289119 placement
function requireAutoModeClassifierReview(e, n, r, s) {
  if (classifierOnlyConfig(e) === undefined || s?.behavior === "deny") return;
  if (!isAutoModePermissionSurface(getToolPermissionContext(r)))
    return buildClassifierOnlyDenial(e, "the session is not in auto mode");
  if (
    s?.behavior === "ask" &&
    (isUnclassifiableAskReason(s.decisionReason) || s.matchedAskRule?.ruleBehavior === "ask")
  )
    return buildClassifierOnlyDenial(
      e,
      "this call trips a check only a person may answer, and nobody is asked about this tool's calls",
    );
  return {
    behavior: "ask",
    message:
      s !== undefined && "message" in s ? s.message : `${e.name} requires auto-mode classifier review.`,
    updatedInput: s !== undefined && "updatedInput" in s ? (s.updatedInput ?? n) : n,
    suppressAlwaysAllowRule: true,
    decisionReason: {
      type: "safetyCheck",
      reason: `Every ${e.name} call is reviewed by the auto-mode classifier; saved allow rules and hook allows do not apply.`,
      classifierApprovable: true,
    },
  };
}
//@ chunk-e6aww6q8.js:1289119-1289307 placement
function describeNonClassifierAllow(decision) {
  let n = decision.decisionReason?.type;
  return n === undefined
    ? "an allow with no recorded source is not the classifier's verdict"
    : `an allow of type '${n}' is not the classifier's verdict`;
}
//@ chunk-e6aww6q8.js:1289307-1289390 placement
/**
 * isClassifierAllow：允许且原因类型为 classifier。
 */
function isClassifierAllow(e) {
  return e.behavior === "allow" && e.decisionReason?.type === "classifier";
}
//@ chunk-e6aww6q8.js:1289390-1289639 placement
function enforceClassifierOnlyDecision(tool, n) {
  if (classifierOnlyConfig(tool) === undefined || n.behavior === "deny" || isClassifierAllow(n)) return n;
  return buildClassifierOnlyDenial(
    tool,
    n.behavior === "ask"
      ? `no prompt is raised for it, and the classifier did not allow it${n.decisionReason?.type === "other" ? ` (${n.decisionReason.reason})` : ""}`
      : describeNonClassifierAllow(n),
  );
}
//@ chunk-e6aww6q8.js:1289639-1289655 placement
var classifierBlockReasons = new Map();
//@ chunk-e6aww6q8.js:1289655-1289686 placement
function rememberClassifierBlock(toolUseID, n) {
  classifierBlockReasons.set(toolUseID, n);
}
//@ chunk-e6aww6q8.js:1289686-1289763 placement
/**
 * takeClassifierBlock：取出并清除分类器阻断原因。
 */
function takeClassifierBlock(toolUseId) {
  if (toolUseId === undefined) return;
  let n = classifierBlockReasons.get(toolUseId);
  classifierBlockReasons.delete(toolUseId);
  return n;
}
//@ chunk-e6aww6q8.js:1289763-1290149 placement
/**
 * 把分类器结果映射为阻断类型：安全护栏拒绝或分类器被关闭为 refused；不可用、转录过长、无法解析、出错为 unavailable（带模型、HTTP 状态、错误类型）。
 */
function getClassifierBlockOutcome(e) {
  if (!e.shouldBlock) return;
  if (e.refusedBySafeguard)
    return {
      kind: "refused",
    };
  if (e.errorKind === CLASSIFIER_SWITCHED_OFF_KIND)
    return {
      kind: "refused",
      switchedOff: true,
    };
  if (e.unavailable || e.transcriptTooLong || e.failureMode === "unparseable" || e.errorKind !== undefined)
    return {
      kind: "unavailable",
      model: e.model,
      ...(e.httpStatus !== undefined && {
        httpStatus: e.httpStatus,
      }),
      ...(e.errorKind !== undefined && {
        errorKind: e.errorKind,
      }),
    };
  return;
}
//@ chunk-e6aww6q8.js:1290149-1290191 placement
var TOOLS_HELD_UNTIL_A_PERSON_TYPES = "tools_held_until_a_person_types";
//@ chunk-e6aww6q8.js:1290191-1290249 placement
/**
 * isPersonTypesHold：工具被暂停到用户亲自输入。
 */
function isPersonTypesHold(toolPermissionContext) {
  return toolPermissionContext?.toolsHeldUntilAPersonTypes === true;
}
//@ chunk-e6aww6q8.js:1290249-1290576 placement
/**
 * 生成"工具调用已暂停，需用户亲自发新消息才能继续"的拒绝文本。
 */
function buildToolsPausedMessage(name) {
  return `${name} was not run. Tool calls are paused in this session until the user sends a new message themselves; a message that an app or an automation sends does not count. Do not retry or look for another way. Say where things stand, what you would do next, and that a new message from them will let you go on.`;
}
//@ chunk-e6aww6q8.js:1290576-1290609 placement
var CLASSIFIER_ONLY_RULE_IDS = new Set([
  ...ALL_AUTO_MODE_RULE_ID_SET_WITH_COWORK,
  ...UNTRUSTED_CONTENT_RULE_IDS,
]);
//@ chunk-e6aww6q8.js:1290609-1290668 placement
/**
 * sanitizeRuleCategoryOrUndefined：规则类别白名单化。
 */
function sanitizeRuleCategoryOrUndefined(e) {
  return e !== undefined && CLASSIFIER_ONLY_RULE_IDS.has(e)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e)
    : undefined;
}
//@ chunk-e6aww6q8.js:1290668-1290708 placement
var SANITIZABLE_RULE_IDS = new Set([
  ...AUTO_MODE_RULE_IDS,
  ...COWORK_RULE_IDS,
  ...UNTRUSTED_CONTENT_RULE_IDS,
]);
//@ chunk-e6aww6q8.js:1290708-1290766 placement
/**
 * sanitizeRuleCategory：规则类别脱敏。
 */
function sanitizeRuleCategory(e) {
  return e !== undefined && SANITIZABLE_RULE_IDS.has(e) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e) : undefined;
}
//@ chunk-e6aww6q8.js:1290766-1290907 placement
/**
 * 把 setAppState 包装成只更新 classifierApprovals 子状态的 setter，值未变时不触发更新。
 */
function makeClassifierApprovalsSetter(e) {
  return (n) =>
    e((r) => {
      let s = n(r.classifierApprovals);
      if (s === r.classifierApprovals) return r;
      return {
        ...r,
        classifierApprovals: s,
      };
    });
}
//@ chunk-e6aww6q8.js:1290907-1291049 placement
/**
 * 在分类器审批状态里写入某个 toolUseId 的审批结果，值相同不更新。
 */
function setClassifierApproval(permissionUpdater, toolUseID, reason) {
  if (!permissionUpdater) return;
  permissionUpdater((s) => {
    if (s.approvals.get(toolUseID) === reason) return s;
    let h = new Map(s.approvals);
    h.set(toolUseID, reason);
    return {
      ...s,
      approvals: h,
    };
  });
}
//@ chunk-e6aww6q8.js:1291049-1291113 placement
/**
 * classifierApprovalFor：取分类器批准记录。
 */
function classifierApprovalFor(state, toolUseID) {
  return state.classifierApprovals.approvals.get(toolUseID);
}
//@ chunk-e6aww6q8.js:1291113-1291244 placement
function markClassifierChecking(e, n) {
  if (!e) return;
  e((r) => {
    if (r.checking.has(n)) return r;
    let s = new Set(r.checking);
    s.add(n);
    return {
      ...r,
      checking: s,
    };
  });
}
//@ chunk-e6aww6q8.js:1291244-1291379 placement
/**
 * 从分类器审批状态的 checking 集合中移除 toolUseId。
 */
function clearClassifierChecking(setClassifierApprovals, toolUseID) {
  if (!setClassifierApprovals) return;
  setClassifierApprovals((r) => {
    if (!r.checking.has(toolUseID)) return r;
    let s = new Set(r.checking);
    s.delete(toolUseID);
    return {
      ...r,
      checking: s,
    };
  });
}
//@ chunk-e6aww6q8.js:1291379-1291517 placement
/**
 * 删除某个 toolUseId 的分类器审批结果。
 */
function deleteClassifierApproval(classifierApprovalsSetter, toolUseID) {
  if (!classifierApprovalsSetter) return;
  classifierApprovalsSetter((r) => {
    if (!r.approvals.has(toolUseID)) return r;
    let s = new Map(r.approvals);
    s.delete(toolUseID);
    return {
      ...r,
      approvals: s,
    };
  });
}
//@ chunk-e6aww6q8.js:1291517-1291653 placement
function resetClassifierApprovals(e) {
  if (!e) return;
  e((n) => {
    if (n.approvals.size === 0 && n.checking.size === 0) return n;
    return {
      approvals: new Map(),
      checking: new Set(),
    };
  });
}
//@ chunk-e6aww6q8.js:1291919-1292184 placement
function arePermissionHooksUnsettled() {
  try {
    let pluginRegistry = getPluginRegistry();
    let organizationAsk = pluginRegistry.organizationAsk;
    let r =
      pluginRegistry.hookRegistrationsInFlight.size > 0 ||
      pluginRegistry.hookModulesAwaitTrust ||
      organizationAsk.isHeld ||
      organizationAsk.isCommandHeld ||
      organizationAsk.isMarketplaceHeld ||
      organizationAsk.heldReresolve !== null;
    return (
      isHookRegistrationPending() ||
      pluginRegistry.hooksRespawns.size > 0 ||
      (r && areHooksEnabled() && hasNonBuiltinPluginSurface())
    );
  } catch (error) {
    logError(toError(error));
    return true;
  }
}
//@ chunk-e6aww6q8.js:1292184-1292250 placement
/**
 * hasPersonOnlyAskFloor：钩子 ask 地板或仅人工 ask。
 */
function hasPersonOnlyAskFloor(e, n) {
  return e || (n.behavior === "ask" && n.personOnly === true);
}
//@ chunk-e6aww6q8.js:1292250-1292278 placement
var compactionRequestsSlot = new SessionRootSlot(() => new Map());
//@ chunk-e6aww6q8.js:1292278-1292311 placement
function agentKeyOrMain(agentId) {
  return agentId ?? "main";
}
//@ chunk-e6aww6q8.js:1292311-1292345 placement
function firstMessageUuid(e) {
  return e[0]?.uuid;
}
//@ chunk-e6aww6q8.js:1292345-1292730 placement
/**
 * 按（会话, agent）记录一次待处理的压缩请求：当前允许压缩且本 epoch 未用过时，新建或并入 pending（拒绝时追加工具名），返回 requested/joined。
 */
function requestDenialCompact(permissionContext, messages, r) {
  let s = firstMessageUuid(messages);
  if (s === undefined) return;
  let h = compactionRequestsSlot.of(permissionContext.session);
  let y = agentKeyOrMain(permissionContext.agentId);
  let S = h.get(y);
  if (S?.canCompact !== true || S.spentEpoch === s) return;
  let pending = S.pending?.epoch === s ? S.pending : undefined;
  let L = pending ?? {
    epoch: s,
    mode: r.mode,
    toolName: r.toolName,
    deniedToolNames: [],
  };
  h.set(y, {
    ...S,
    pending: r.denied
      ? {
          ...L,
          deniedToolNames: [...L.deniedToolNames, r.toolName],
        }
      : L,
  });
  return pending ? "joined" : "requested";
}
//@ chunk-e6aww6q8.js:1292730-1293008 placement
function syncCompactEligibility(e, n, mode, canCompact) {
  let h = compactionRequestsSlot.of(e.session);
  let y = agentKeyOrMain(e.agentId);
  let S = h.get(y);
  h.set(y, {
    canCompact,
    spentEpoch: S?.spentEpoch,
  });
  let pending = S?.pending;
  if (pending === undefined) return {};
  if (pending.epoch !== firstMessageUuid(n))
    return {
      pending,
      stale: "epoch",
    };
  if (pending.mode !== mode)
    return {
      pending,
      stale: "mode",
    };
  return {
    pending,
  };
}
//@ chunk-e6aww6q8.js:1293008-1293124 placement
function markCompactRequestSpent(e, n) {
  let r = compactionRequestsSlot.of(e.session);
  let s = agentKeyOrMain(e.agentId);
  r.set(s, {
    ...r.get(s),
    pending: undefined,
    spentEpoch: n.epoch,
  });
}
//@ chunk-e6aww6q8.js:1293124-1293158 placement
var seenToolCalls = identity_2(new Map(), (e) => e.clear());
//@ chunk-e6aww6q8.js:1293158-1293202 placement
function sessionAgentKey(agentId) {
  return `${getSessionId()}:${agentId ?? "main"}`;
}
//@ chunk-e6aww6q8.js:1293202-1293397 placement
function recordPromptedToolCall({ agentId, tool, input, message }) {
  let inputJson;
  try {
    inputJson = canonicalFingerprint(input);
  } catch {
    return;
  }
  let y = sessionAgentKey(agentId);
  let S = seenToolCalls.get(y) ?? [];
  S.push({
    tool,
    inputJson,
    fromMessageId: message.message.id,
    fromUuid: message.uuid,
  });
  seenToolCalls.set(y, S);
}
//@ chunk-e6aww6q8.js:1293397-1293939 placement
/**
 * 在该 agent 记下的工具调用里查同一工具、同一输入、来自更早助手消息的记录并消费掉；同时清理已失效的记录。返回是否命中。
 */
function consumeRepeatedToolCall({ agentId, tool, input, message, messages }) {
  let agentKey = sessionAgentKey(agentId);
  let entries = seenToolCalls.get(agentKey);
  if (entries === undefined || entries.length === 0) return false;
  let id = message.message.id;
  let filtered = entries.filter((entry) => {
    if (entry.fromMessageId === id) return true;
    let index = messages.findIndex((message) => message.uuid === entry.fromUuid);
    return (
      index !== -1 &&
      !messages
        .slice(index + 1)
        .some(
          (message) =>
            message.type === "assistant" &&
            message.message.id !== entry.fromMessageId &&
            message.message.id !== id,
        )
    );
  });
  let inputJson;
  try {
    inputJson = canonicalFingerprint(input);
  } catch {
    inputJson = undefined;
  }
  let index = filtered.findIndex(
    (Z) => Z.fromMessageId !== id && Z.tool === tool && Z.inputJson === inputJson,
  );
  if (index !== -1) filtered.splice(index, 1);
  if (filtered.length > 0) seenToolCalls.set(agentKey, filtered);
  else seenToolCalls.delete(agentKey);
  return index !== -1;
}
//@ chunk-e6aww6q8.js:1293939-1293977 placement
var DENIAL_LIMIT_FALLBACK_SYMBOL = Symbol("DenialLimitFallback");
//@ chunk-e6aww6q8.js:1293977-1294108 placement
function withPermissionDisclosure(disclosure, n) {
  return {
    [DENIAL_LIMIT_FALLBACK_SYMBOL]: true,
    disclosure,
    ...(n !== undefined && {
      autoDenyAfterMs: n.autoDenyAfterMs,
      autoDenyResolution: n.resolution,
    }),
  };
}
//@ chunk-e6aww6q8.js:1294108-1294157 placement
/**
 * withDenialDeadline：附加自动拒绝截止时间。
 */
function withDenialDeadline(denialLimitFallback, deadlineEpochMs) {
  return {
    ...denialLimitFallback,
    deadlineEpochMs,
  };
}
//@ chunk-e6aww6q8.js:1294157-1294268 placement
/**
 * 去掉权限请求里的截止时间与自动拒绝字段，保留披露标记。
 */
function stripAutoDenyFields(denialLimitFallback) {
  let { deadlineEpochMs, autoDenyAfterMs, autoDenyResolution, ...h } = denialLimitFallback;
  return {
    ...h,
    [DENIAL_LIMIT_FALLBACK_SYMBOL]: denialLimitFallback[DENIAL_LIMIT_FALLBACK_SYMBOL],
  };
}
//@ chunk-e6aww6q8.js:1294268-1294296 placement
var READ_TOOLS_WITH_EXTERNAL_NOTE = new Set([FILE_READ_TOOL_NAME, GREP_TOOL_NAME, GLOB_TOOL_NAME]);
//@ chunk-e6aww6q8.js:1294296-1294866 placement
/**
 * 判断工作目录外读取的 ask 是否应改为展示一次性的 auto 模式外部读取提示：auto 分类器启用、可交互、非后台/远程、未见过该提示等条件。
 */
function shouldShowOutsideReadPrompt(tool, input, decision, context) {
  if (
    decision.behavior !== "ask" ||
    decision.decisionReason?.type !== "workingDir" ||
    !READ_TOOLS_WITH_EXTERNAL_NOTE.has(tool.name) ||
    typeof tool.getPath !== "function" ||
    !tool.getPath(input)
  )
    return false;
  let permissionContext = getToolPermissionContext(context);
  if (
    !isAutoClassifierActive(permissionContext.mode) ||
    permissionContext.shouldAvoidPermissionPrompts ||
    permissionContext.blockReadsOutsideWorkingDirectories === true
  )
    return false;
  if (context.forRemoteExecution === true || permissionContext.servedCall === true) return false;
  if (context.options.isNonInteractiveSession) return false;
  if (isBgSession() || isTeammateContextReady()) return false;
  if (!isSettingSourceEnabled("userSettings")) return false;
  return (
    !context.session.outsideReadPrompt.isOpenElsewhere(context.toolUseId) &&
    !context.session.outsideReadPrompt.answered &&
    !getGlobalConfig().hasSeenAutoModeOutsideReadPrompt
  );
}
//@ chunk-e6aww6q8.js:1294866-1294983 placement
/**
 * 在全局配置中记下已看过 auto 模式外部读取提示。
 */
function markOutsideReadPromptSeen(toolUseContext) {
  saveGlobalConfig(
    (n) =>
      n.hasSeenAutoModeOutsideReadPrompt
        ? n
        : {
            ...n,
            hasSeenAutoModeOutsideReadPrompt: true,
          },
    toolUseContext.storageV5,
  );
}
//@ chunk-e6aww6q8.js:1294983-1295927 placement
async function persistBlockReadsOutsideWorkspace(toolUseContext) {
  toolUseContext.setSessionToolPermissionContext((s) => ({
    ...s,
    blockReadsOutsideWorkingDirectories: true,
  }));
  markReadBlockApplied();
  if (!isSettingSourceEnabled("userSettings")) {
    let error = Error("user settings are not a setting source of this session");
    logFeatureSad("permission_block_outside_reads", "user_settings_disabled");
    return {
      error,
      sandboxRefreshed: false,
    };
  }
  let { error } = await updateSettingsForSource(
    "userSettings",
    {
      permissions: {
        blockReadsOutsideWorkingDirectories: true,
      },
    },
    undefined,
    toolUseContext.storageV5,
  );
  if (error) {
    logForDebugging(`Failed to persist blockReadsOutsideWorkingDirectories: ${error.message}`, {
      level: "error",
    });
    logFeatureSad("permission_block_outside_reads", "settings_write_failed");
    return {
      error,
      sandboxRefreshed: false,
    };
  }
  let r;
  try {
    r = SandboxManager.refreshConfig();
  } catch (error) {
    logError(toError(error));
    logFeatureSad("permission_block_outside_reads", "sandbox_refresh_failed");
    return {
      error: null,
      sandboxRefreshed: false,
    };
  }
  if (!r) {
    logFeatureSad("permission_block_outside_reads", "sandbox_refresh_skipped");
    return {
      error: null,
      sandboxRefreshed: false,
    };
  }
  logFeatureOk("permission_block_outside_reads");
  return {
    error: null,
    sandboxRefreshed: true,
  };
}
//@ chunk-e6aww6q8.js:1295927-1295963 placement
/**
 * classifyEditsEnabled：编辑是否交分类器。
 */
function classifyEditsEnabled(mainLoopModel) {
  return resolveClassifyEditsFlag(mainLoopModel).value;
}
//@ chunk-e6aww6q8.js:1295963-1296079 placement
function resolveClassifyEditsFlag(e) {
  let CLAUDE_CODE_AUTO_MODE_CLASSIFY_EDITS = antEnv.CLAUDE_CODE_AUTO_MODE_CLASSIFY_EDITS;
  if (CLAUDE_CODE_AUTO_MODE_CLASSIFY_EDITS !== undefined)
    return {
      value: CLAUDE_CODE_AUTO_MODE_CLASSIFY_EDITS,
      src: "env",
    };
  return classifyEditsByModelList(e);
}
//@ chunk-e6aww6q8.js:1296079-1296179 placement
/**
 * auto 模式下文件编辑是否也交给分类器：环境变量 CLAUDE_CODE_AUTO_MODE_CLASSIFY_EDITS 为 true，或当前主模型在配置的 classifyEditsModels 列表中。
 */
function shouldClassifyEdits(e) {
  return (
    antEnv.CLAUDE_CODE_AUTO_MODE_CLASSIFY_EDITS === true ||
    classifyEditsByModelList(e, {
      overridesMap: {},
    }).value
  );
}
//@ chunk-e6aww6q8.js:1296179-1296233 placement
function runLoneHandedOverEditEnabled() {
  return getAutoModeConfigOrDefault().runLoneHandedOverEdit === true;
}
//@ chunk-e6aww6q8.js:1296233-1296462 placement
function classifyEditsByModelList(skillModel, currentModel) {
  let classifyEditsModels = getAutoModeConfigOrDefault()?.classifyEditsModels;
  let h = new Set(Array.isArray(classifyEditsModels) ? classifyEditsModels : []);
  let y = [];
  if (h.size === 0 && y.length === 0)
    return {
      value: false,
      src: "default",
    };
  return {
    value: mainModelOverrideKeys(skillModel, currentModel).some(
      (S) => h.has(S) || y.some((w) => S.startsWith(w)),
    ),
    src: "gb",
  };
}
//@ chunk-e6aww6q8.js:1296462-1296490 placement
var FILE_MUTATION_TOOLS = new Set([FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME, NOTEBOOK_EDIT_TOOL_NAME]);
//@ chunk-e6aww6q8.js:1296490-1296524 placement
/**
 * isFileMutationTool：是否文件修改工具。
 */
function isFileMutationTool(name) {
  return FILE_MUTATION_TOOLS.has(name);
}
//@ chunk-e6aww6q8.js:1296524-1296625 placement
class ToolUseIdSet {
  #e;
  constructor(e) {
    this.#e = new Set(e);
  }
  toolUseIDs() {
    return new Set(this.#e);
  }
  toJSON() {
    return;
  }
}
//@ chunk-e6aww6q8.js:1296625-1296659 placement
/**
 * toToolUseIdSet：构造工具调用 id 集合。
 */
function toToolUseIdSet(toolUseIds) {
  return new ToolUseIdSet(toolUseIds);
}
//@ chunk-e6aww6q8.js:1296659-1296721 placement
/**
 * handedOffIds：交接的活工具调用 id。
 */
function handedOffIds(handedOffLive) {
  return handedOffLive instanceof ToolUseIdSet ? handedOffLive.toolUseIDs() : undefined;
}
//@ chunk-e6aww6q8.js:1296721-1296770 placement
/**
 * isAskOnMutationTool：修改类工具的 ask 且曾开启主动性。
 */
function isAskOnMutationTool(name, proactivityLevel) {
  return proactivityLevel === "ask" && isFileMutationTool(name) && wasProactivityEverOn();
}
//@ chunk-e6aww6q8.js:1296770-1296816 placement
/**
 * isProactivityModeChange：ask 与非 ask 之间的模式变化。
 */
function isProactivityModeChange(from, n) {
  return from === "ask" && n !== "ask";
}
//@ chunk-e6aww6q8.js:1297111-1297265 placement
/**
 * 启动模式由主动性等级决定，且当前模式（plan 取进入前的模式）已不同于基线模式。
 */
function hasLeftProactivityBaseline(toolPermissionContext) {
  let n =
    toolPermissionContext.mode === "plan"
      ? (toolPermissionContext.prePlanMode ?? "plan")
      : toolPermissionContext.mode;
  return (
    toolPermissionContext.startupModeDecidedByProactivityLevel !== undefined &&
    toolPermissionContext.proactivityBaseline?.mode !== n
  );
}
//@ chunk-e6aww6q8.js:1297265-1297367 placement
/**
 * 按当前模式、主动性等级和是否偏离基线，算出 Shift+Tab 的模式循环。
 */
function getPermissionModeCycle(e) {
  return cycleAllTeammateModes(
    e.toolPermissionContext.mode,
    e.proactivityLevel,
    hasLeftProactivityBaseline(e.toolPermissionContext),
  );
}
//@ chunk-e6aww6q8.js:1329439-1330061 fingerprint = getDenyRules (0.493)
/**
 * 把磁盘上（严格信任）各来源新出现的 deny 规则并入上下文（y$ 匹配的排前面），并按需开启 blockReadsOutsideWorkingDirectories。
 */
var mergePersistedDenyRules = (context) => {
  let n = new Map();
  for (let { ruleBehavior, ruleValue, source } of loadAllPermissionRulesFromDisk({
    strictPersistedTrust: true,
  })) {
    if (ruleBehavior !== "deny") continue;
    let S = formatPermissionRule(ruleValue);
    let w = n.get(source) ?? {
      holds: new Set(context.alwaysDenyRules[source]),
      gained: [],
    };
    n.set(source, w);
    if (!w.holds.has(S)) {
      w.holds.add(S);
      w.gained.push(S);
    }
  }
  let flattened = Array.from(n).flatMap(([s, { gained: h }]) => {
    if (h.length === 0) return [];
    let y = context.alwaysDenyRules[s] ?? [];
    if (y.length === 0) return [[s, h]];
    return [
      [
        s,
        [
          ...h.filter((source) => PATH_RULE_CARVE_OUT_RE.test(source)),
          ...y,
          ...h.filter((ruleString) => !PATH_RULE_CARVE_OUT_RE.test(ruleString)),
        ],
      ],
    ];
  });
  return {
    ...context,
    ...(isReadBlockOn() && {
      blockReadsOutsideWorkingDirectories: true,
    }),
    ...(flattened.length > 0 && {
      alwaysDenyRules: {
        ...context.alwaysDenyRules,
        ...Object.fromEntries(flattened),
      },
    }),
  };
};
//@ chunk-e6aww6q8.js:2952237-2952273 placement
function isAutoModeConsentFlowEnabled(agentId) {
  return !isModelDrivenSession(agentId) && priorAssistantContextEnabled();
}
//@ chunk-e6aww6q8.js:2952273-2952296 placement
function autoModeBlockedHelp(agentId) {
  return;
}
//@ chunk-e6aww6q8.js:2952296-2952321 placement
function alwaysFullClassifierRole(permissionContext) {
  return false;
}
//@ chunk-e6aww6q8.js:2952321-2952398 placement
/**
 * 服务端分类器角色的按调用修正：本次 tool_use 是客户端指定的 clientRequestedToolUseId 时返回 "off"（不交服务端分类器），否则原样返回角色。
 */
function resolveServerClassifierRoleForCall(autoModeClassifierRole, n, r, s) {
  if (s.clientRequestedToolUseId === r) return "off";
  return autoModeClassifierRole;
}
//@ chunk-e6aww6q8.js:2952398-2952534 placement
function isTicklishWhisperEnabled() {
  if (antEnv.CLAUDE_CODE_TICKLISH_WHISPER !== undefined) return antEnv.CLAUDE_CODE_TICKLISH_WHISPER;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ticklish_whisper", false);
}
//@ chunk-e6aww6q8.js:2952534-2952572 placement
function canShowServerFallbackNotice(e) {
  return isTicklishWhisperEnabled() && e && !isSdkDialogHostActive();
}
//@ chunk-e6aww6q8.js:2952572-2953294 placement
/**
 * auto 模式退回按量计费的分类器请求时的提示：已中止返回 interrupt；有缓存的选择直接用；无 Opus 权限或没有对话框表面时记日志并 continue；否则弹一次计费提示对话框（上报 tengu_auto_mode_server_fallback_notice），返回用户的选择。
 */
function awaitClassifierBillingFallbackNotice(permissionContext) {
  let requestDialog = permissionContext.requestDialog;
  if (permissionContext.abortController.signal.aborted) return Promise.resolve("interrupt");
  let serverClassifierFallbackChoice = getServerClassifierFallbackChoice();
  if (serverClassifierFallbackChoice !== undefined)
    return raceChoiceWithAbort(serverClassifierFallbackChoice, permissionContext.abortController.signal);
  if (!hasOpusAccess()) return Promise.resolve("continue");
  if (
    requestDialog === undefined ||
    (isSdkDialogHostActive() ? !sdkSupportsFallbackDialog() : isUnattendedInteractiveSession())
  ) {
    logForDebugging(
      "[server-classifier] auto mode fell back to billed classifier requests; no dialog surface to warn on, continuing in auto mode",
    );
    return Promise.resolve("continue");
  }
  let serverFallbackChoice = resolveServerFallbackChoice(() => {
    let gatewayNoticeInfo = getGatewayNoticeInfo();
    logEvent("tengu_auto_mode_server_fallback_notice", {
      gatewayDetected: gatewayNoticeInfo.gatewayHost !== undefined,
      provider: getAPIProviderForAnalytics(),
      interactive: true,
      sdkHost: isSdkDialogHostActive(),
    });
    return showServerFallbackNotice(requestDialog, gatewayNoticeInfo, {
      storageV5: permissionContext.storageV5,
      signal:
        permissionContext.isBackgroundAgent === true
          ? undefined
          : turnAbortControllerOf(permissionContext.abortController).signal,
    });
  });
  return raceChoiceWithAbort(serverFallbackChoice, permissionContext.abortController.signal);
}
//@ chunk-e6aww6q8.js:2953294-2953600 placement
/**
 * 分类器的两种固定拦截结果：YJe 为用户在计费提示处取消（"Cancelled at the classifier billing notice"），XJe 为本会话不运行分类器；rkn 是子代理报告未经审查时附加的警告文字。
 */
var CLASSIFIER_BILLING_CANCELLED_RESULT = {
  model: "auto mode",
  durationMs: 0,
  shouldBlock: true,
  unavailable: true,
  reason: "Cancelled at the classifier billing notice",
};
var NO_CLASSIFIER_FOR_SESSION_RESULT = {
  model: "auto mode",
  durationMs: 0,
  shouldBlock: true,
  unavailable: true,
  reason: "No classifier runs for this session",
};
var UNREVIEWED_SUBAGENT_REPORT_WARNING = "Delivered with a warning: nothing reviewed the subagent's report";
//@ chunk-e6aww6q8.js:2953600-2953670 placement
/**
 * 超限回退时“限时自动拒绝”窗口长度：env CLAUDE_CODE_TICKLISH_WHISPER_TIMEOUT_MS，缺省用 TIMED_FALLBACK_AUTO_DENY_MS。
 */
function getTimedFallbackAutoDenyMs() {
  return antEnv.CLAUDE_CODE_TICKLISH_WHISPER_TIMEOUT_MS ?? TIMED_FALLBACK_AUTO_DENY_MS;
}
//@ chunk-e6aww6q8.js:2953670-2953960 placement
/**
 * 判断脚本是否“请求在沙箱外运行”：dangerouslyDisableSandbox 为 true，且该命令带此标志时不走沙箱、不带时会走沙箱（即标志确实改变了沙箱决定）。PowerShell 工具按 powershell shellType 判断。
 */
function scriptAsksToRunUnsandboxed(tool, n) {
  let dangerouslyDisableSandbox = n.dangerouslyDisableSandbox;
  if (dangerouslyDisableSandbox !== true && dangerouslyDisableSandbox !== "true") return false;
  let command = typeof n.command === "string" ? n.command : undefined;
  let shellType = tool.name === POWERSHELL_TOOL_NAME ? "powershell" : undefined;
  return (
    !shouldUseSandbox({
      command,
      dangerouslyDisableSandbox: true,
      shellType,
    }) &&
    shouldUseSandbox({
      command,
      dangerouslyDisableSandbox: false,
      shellType,
    })
  );
}
//@ chunk-e6aww6q8.js:2953960-2954253 placement = persistDenialState (0.894)
/**
 * 用更新函数修改拒绝跟踪状态：子代理写本地 localDenialTracking，主线程写 AppState.denialTracking；返回新状态。
 */
function updateDenialTrackingState(context, update) {
  if (context.localDenialTracking) {
    let s = update(context.localDenialTracking);
    Object.assign(context.localDenialTracking, s);
    return s;
  }
  let r;
  context.setAppState((prev) => {
    r = update(prev.denialTracking ?? createDenialTrackingState());
    if (prev.denialTracking === r) return prev;
    return {
      ...prev,
      denialTracking: r,
    };
  });
  return r ?? update(context.getAppState().denialTracking ?? createDenialTrackingState());
}
//@ chunk-e6aww6q8.js:2954253-2954278 placement
function resetDenialStreakAfterUserApproval(toolUseContext) {
  updateDenialTrackingState(toolUseContext, resetConsecutiveDenials);
}
//@ chunk-e6aww6q8.js:2954278-2954392 placement
var ORG_REQUIRES_APPROVAL_MESSAGE = "Your organization requires approval for this tool";
var CLI_ALWAYS_ASKS_MESSAGE = "Claude Code asks before every use of this tool.";
//@ chunk-e6aww6q8.js:2954392-2954448 placement
function askCeilingReason(e) {
  return e.mcpInfo?.cliOwned === true ? CLI_ALWAYS_ASKS_MESSAGE : ORG_REQUIRES_APPROVAL_MESSAGE;
}
//@ chunk-e6aww6q8.js:2954448-2954477 placement
function permissionRuleSourceDisplayString(source) {
  return getSettingSourceDisplayNameLowercase(source);
}
//@ chunk-e6aww6q8.js:2954477-2954880 placement
/**
 * Bash/Monitor/PowerShell 的 allow 若来自沙箱自动放行或只读判定，返回 "sandbox"/"readOnly"（用于交给服务端分类器复核）。
 */
function serverHeldShellAllowSource(tool, result) {
  if (
    result.behavior !== "allow" ||
    (tool.name !== BASH_TOOL_NAME && tool.name !== MONITOR && tool.name !== POWERSHELL_TOOL_NAME)
  )
    return;
  let r = (decisionReason) => {
    if (decisionReason?.type === "other")
      return decisionReason.reason === SANDBOX_AUTO_ALLOW_REASON
        ? "sandbox"
        : decisionReason.reason === READ_ONLY_AUTO_ALLOW_REASON ||
            decisionReason.reason === POWERSHELL_READ_ONLY_ALLOW_REASON ||
            decisionReason.reason === POWERSHELL_COMPOUND_READ_ONLY_PART_REASON
          ? "readOnly"
          : undefined;
    if (decisionReason?.type !== "subcommandResults") return;
    for (let reason of decisionReason.reasons.values()) {
      let y = reason.behavior === "allow" ? r(reason.decisionReason) : undefined;
      if (y !== undefined) return y;
    }
    return;
  };
  return r(result.decisionReason);
}
//@ chunk-e6aww6q8.js:2954880-2955190 placement
/**
 * 为 Bash/PowerShell 调用生成破坏性命令分析字段（destructive_category、destructive_target_scope、git_destructive_target），用于权限决定的遥测；其他工具返回 undefined。
 */
function getDestructiveCommandAnalytics(name, n) {
  let r = name === BASH_TOOL_NAME;
  if (!r && name !== POWERSHELL_TOOL_NAME) return;
  if (n === null || typeof n !== "object" || !("command" in n) || typeof n.command !== "string") return;
  let s = r ? getDestructiveTargetCategory(n.command) : getPowerShellDestructiveCategory(n.command);
  return {
    destructive_category: fromEnum(s ?? "none"),
    destructive_target_scope: fromEnum(classifyDestructiveTargetScope(n.command, getCwdOrNull(), s)),
    git_destructive_target: fromEnum(classifyGitDestructiveTarget(n.command, s)),
  };
}
//@ chunk-e6aww6q8.js:2955190-2955549 placement
/**
 * 模式切换后，之前的放行是否仍成立：auto 恒真；plan 下仅在 auto 激活且工具输入只读（或属于 plan 允许的只读类）时成立；其余模式返回调用方给定的原结果。
 */
function isStillAllowedAfterModeChange(e, n, tool, s, permissionContext) {
  switch (e) {
    case "auto":
      return true;
    case "plan": {
      if (!isAutoModeActive()) return false;
      let y = tool.inputSchema.safeParse(s);
      return (
        (y.success === true &&
          tool.isReadOnly(y.data, permissionContext) &&
          !(tool.ignoresWholeToolAllowRule?.(y.data) ?? false)) ||
        isReadOnlyBrowserCall(getToolNameForPermissionCheck_2(tool), y.success ? y.data : s)
      );
    }
    case "default":
    case "dontAsk":
    case "acceptEdits":
    case "bypassPermissions":
    case "bubble":
      return n;
    default: {
      let y = e;
      return false;
    }
  }
}
//@ chunk-e6aww6q8.js:2955549-2955625 placement
/**
 * Cowork 云会话的 Web 工具放行覆盖：存在授权且工具是 Cowork Web 工具时，按 RL（Cowork Web 判定）返回是否覆盖。
 */
function isCoworkWebAllowOverride(e, tool, r, s) {
  if (e === null || !isWebFetchOrSearch(tool.name)) return false;
  return isWebToolClassifierRouted(tool, getToolPermissionContext(s));
}
//@ chunk-e6aww6q8.js:2955625-2955872 placement
/**
 * MCP 工具在 auto 模式下被“破坏性 MCP allow 规则”直接放行（跳过分类器复核）时上报 tengu_auto_mode_destructive_mcp_rule_allow，带规则来源与服务端分类器角色。
 */
function countMcpPolicyRecheckSkipped(e, tool, r, s, h, toolUseID) {
  if (tool.mcpInfo === undefined) return;
  let toolPermissionContext = getToolPermissionContext(s);
  if (
    isAutoAllowedInMode(tool, toolPermissionContext) !== "auto" ||
    !shouldClassifyRemoteMcpWritePolicy(tool, r, "auto", toolPermissionContext)
  )
    return;
  let autoModeClassifierRole = getAutoModeClassifierRole(toolPermissionContext.mode);
  logEvent("tengu_auto_mode_destructive_mcp_rule_allow", {
    ruleSource: fromEnum(e),
    serverClassifierRole: fromEnum(
      h === undefined
        ? autoModeClassifierRole
        : resolveServerClassifierRoleForCall(autoModeClassifierRole, h, toolUseID, s),
    ),
  });
}
//@ chunk-e6aww6q8.js:2955872-2956091 placement
/**
 * MCP 的 ask 是否否决已有的整工具授权：远程会话 MCP、Cowork Web、或开启服务端策略且该 MCP 工具受策略 ask 约束并命中会话级 allow 时为真；为真时 hasPermissionsToUseTool 给结果加 suppressAlwaysAllowRule。
 */
function mcpAskVetoesStandingGrant(tool, n, r, assistantMessage, toolUseID) {
  let toolPermissionContext = getToolPermissionContext(r);
  return (
    isClassifierRoutedMcpTool(tool, toolPermissionContext) ||
    isRemoteBrowserToolModeFloorActive(tool, toolPermissionContext) ||
    (isCcsTenant() &&
      tool.mcpInfo !== undefined &&
      hasMcpServerPolicyAllow(tool, toolPermissionContext) &&
      getMcpRuleClassifierRoute(
        {
          source: "session",
          ruleBehavior: "allow",
          ruleValue: {
            toolName: getToolNameForPermissionCheck_2(tool),
          },
        },
        tool,
        n,
        isAutoAllowedInMode(tool, toolPermissionContext),
        r,
        () =>
          resolveServerClassifierRoleForCall(
            getAutoModeClassifierRole(toolPermissionContext.mode),
            assistantMessage,
            toolUseID,
            r,
          ),
      ) !== undefined)
  );
}
//@ chunk-e6aww6q8.js:2956091-2956176 placement
/**
 * 破坏性 MCP 调用在 auto/分类器模式下是否应改为 ask：有授权、模式走分类器、工具 isDestructive(input) 为真，且远程破坏性 MCP 开关或 tengu_modular_mochi 打开。
 */
function isDestructiveMcpAskOverride(e, tool, r, s, permissionContext) {
  return (
    e &&
    isAutoClassifierActive(s) &&
    (tool.isDestructive?.(r) ?? false) &&
    (includesRemoteDestructiveMcp() || isModularMochiEnabled(permissionContext))
  );
}
//@ chunk-e6aww6q8.js:2956176-2956259 placement
function includesRemoteDestructiveMcp() {
  return (
    isCoworkAny() &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_remote_auto_mode_include_destructive_mcp", false)
  );
}
//@ chunk-e6aww6q8.js:2956259-2956361 placement
/**
 * Computer Use 检查开关：GrowthBook tengu_quirky_shore 为 on 或设置 computerUseChecks 打开时返回 "on"。
 */
function getComputerUseChecksSetting() {
  return normalizeAutoModeValue(getFeatureValue_CACHED_MAY_BE_STALE("tengu_quirky_shore", "off")) === "on" ||
    isActionSummaryEnabled("computerUseChecks")
    ? "on"
    : undefined;
}
//@ chunk-e6aww6q8.js:2956361-2956450 placement
function isModularMochiEnabled(e) {
  return (
    hasRelaySourceForClients(isDiskless() ? e.options.mcpClients : undefined) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_modular_mochi", false)
  );
}
//@ chunk-e6aww6q8.js:2956450-2956478 placement
function hasAutoModeClassifierDenyRules() {
  return hasAutoModeDenyLists();
}
//@ chunk-e6aww6q8.js:2956478-2956548 placement
/**
 * settings.autoMode 是否配置了自定义 soft_deny 或 hard_deny 规则。
 */
function hasCustomAutoModeDenyRules() {
  let autoModeConfig = getAutoModeConfig();
  return replacesDefaultRules(autoModeConfig?.soft_deny) || replacesDefaultRules(autoModeConfig?.hard_deny);
}
//@ chunk-e6aww6q8.js:2956548-2956707 placement
/**
 * 向会话追加 auto 模式警告系统消息（非 SDK、有 appendSystemMessage，且子代理只在显式要求时追加）。
 */
function appendAutoModeWarning(permissionContext, asks, heldByDenyRules) {
  if (
    getIsNonInteractiveSession() ||
    permissionContext.appendSystemMessage === undefined ||
    (!asks && permissionContext.agentId !== undefined)
  )
    return;
  let s = takeNoServerCheckNotice(asks, heldByDenyRules);
  if (s !== undefined) permissionContext.appendSystemMessage(createSystemMessage(s, "warning"));
}
//@ chunk-e6aww6q8.js:2956707-2958079 placement = createPermissionRequestMessage (1)
/**
 * 按 decisionReason 生成请求确认的说明文字（classifier/hook/rule/subcommandResults/permissionPromptTool/sandboxOverride/workingDir/safetyCheck/mode/asyncAgent），默认 "Claude requested permissions to use X…"。
 */
function createPermissionRequestMessage(toolName, decisionReason) {
  if (decisionReason) {
    if (decisionReason.type === "classifier")
      return `Classifier '${decisionReason.classifier}' requires approval for this ${toolName} command: ${decisionReason.reason}`;
    switch (decisionReason.type) {
      case "hook":
        return decisionReason.reason
          ? `Hook '${decisionReason.hookName}' blocked this action: ${decisionReason.reason}`
          : `Hook '${decisionReason.hookName}' requires approval for this ${toolName} command`;
      case "rule": {
        let ruleString = formatPermissionRule(decisionReason.rule.ruleValue);
        let sourceString = permissionRuleSourceDisplayString(decisionReason.rule.source);
        return `Permission rule '${ruleString}' from ${sourceString} requires approval for this ${toolName} command`;
      }
      case "subcommandResults": {
        let needsApproval = [];
        for (let [cmd, result] of decisionReason.reasons)
          if (result.behavior === "ask" || result.behavior === "passthrough")
            if (toolName === "Bash") {
              let { commandWithoutRedirections, redirections } = extractOutputRedirections(cmd);
              let displayCmd = redirections.length > 0 ? commandWithoutRedirections : cmd;
              needsApproval.push(displayCmd);
            } else needsApproval.push(cmd);
        if (needsApproval.length > 0) {
          let n = needsApproval.length;
          return `This ${toolName} command contains multiple operations. The following ${plural(n, "part")} ${plural(n, "requires", "require")} approval: ${needsApproval.join(", ")}`;
        }
        return `This ${toolName} command contains multiple operations that require approval`;
      }
      case "permissionPromptTool":
        return `Tool '${decisionReason.permissionPromptToolName}' requires approval for this ${toolName} command`;
      case "sandboxOverride":
        return "Run outside of the sandbox";
      case "workingDir":
        return decisionReason.reason;
      case "safetyCheck":
      case "other":
        return decisionReason.reason;
      case "mode":
        return `Current permission mode (${permissionModeTitle(decisionReason.mode)}) requires approval for this ${toolName} command`;
      case "asyncAgent":
        return decisionReason.reason;
    }
  }
  return `Claude requested permissions to use ${toolName}, but you haven't granted it yet.`;
}
//@ chunk-e6aww6q8.js:2958079-2958214 placement
function hasAllowRuleInSource(e, n, r) {
  let s = formatPermissionRule(n);
  let h = (y) => (y?.[r] ?? []).some((w) => formatPermissionRule(permissionRuleValueFromString(w)) === s);
  return h(e.alwaysAllowRules) || h(e.strippedDangerousRules);
}
//@ chunk-e6aww6q8.js:2958214-2958535 placement
/**
 * 从 addRules/replaceRules 的 allow 更新中剔除“加载 MCP skill 形式”的新规则（除非来源允许），用于 MCP skill 加载 ask 的回答。
 */
function withoutNewRulesOfMcpSkillLoadForm(toolNameWithAliases, n, r) {
  return n.flatMap((s) => {
    if ((s.type !== "addRules" && s.type !== "replaceRules") || s.behavior !== "allow") return [s];
    let filtered = s.rules.filter((rule) => {
      let S = permissionRuleValueFromString(formatPermissionRule(rule));
      return (
        !toolNameWithAliases.has(S.toolName) ||
        !isPinnedOrWildcardRule(S.ruleContent ?? "") ||
        hasAllowRuleInSource(r, S, s.destination)
      );
    });
    if (filtered.length === s.rules.length) return [s];
    return filtered.length > 0
      ? [
          {
            ...s,
            rules: filtered,
          },
        ]
      : [];
  });
}
//@ chunk-e6aww6q8.js:2958535-2958619 placement
function isWholeToolAllowRule(e, ruleValue) {
  return toolMatchesWholeToolRule(e, {
    source: "session",
    ruleBehavior: "allow",
    ruleValue,
  });
}
//@ chunk-e6aww6q8.js:2958619-2958819 placement
/**
 * 选择要展示的决定原因：结果里有带熔断器的 safetyCheck，或结果标记 localDisplayOnly 时用结果自己的原因，否则用调用方给的原因。
 */
function pickDisplayedDecisionReason(checkResult, n) {
  if (
    checkResult.decisionReason !== undefined &&
    findSafetyCheckReason(checkResult.decisionReason, (r) => r.circuitBreaker !== undefined) !== undefined
  )
    return checkResult.decisionReason;
  return checkResult.localDisplayOnly === true && checkResult.decisionReason ? checkResult.decisionReason : n;
}
//@ chunk-e6aww6q8.js:2958819-2958893 placement
/**
 * 为 ask 去掉整工具授权：在工具名及其别名集合上移除整工具 allow 规则（按来源过滤），返回新的权限上下文。
 */
function stripWholeToolGrantsForAsk(updates, tool, toolPermissionContext) {
  return dropBareAllowRulesForTools(
    updates,
    getToolNameWithAliases(tool, toolPermissionContext),
    (s, h) => hasAllowRuleInSource(toolPermissionContext, s, h),
    (ruleValue) => isWholeToolAllowRule(tool, ruleValue),
  );
}
//@ chunk-e6aww6q8.js:2958893-2959133 placement = permissionUpdateSchema (0.725)
/**
 * 只保留“收紧”方向的权限更新：非 allow 的 addRules、移除 allow 的 removeRules、removeDirectories；replaceRules/setMode/addDirectories 一律丢弃。
 */
function withoutGrantsForRemoteScope(updates) {
  return updates.filter((update) => {
    switch (update.type) {
      case "addRules":
        return update.behavior !== "allow";
      case "removeRules":
        return update.behavior === "allow";
      case "removeDirectories":
        return true;
      case "replaceRules":
      case "setMode":
      case "addDirectories":
        return false;
    }
  });
}
//@ chunk-e6aww6q8.js:2959133-2959282 placement
/**
 * 由一组 PermissionUpdate 推出授权范围：去掉远程作用域不允许的授权后，若有持久化目的地返回 "always"，有其他更新返回 "session"，否则 "once"。
 */
function permissionGrantScope(e) {
  let n = new Set(withoutGrantsForRemoteScope(e));
  let filtered = e.filter((s) => !n.has(s));
  if (filtered.some((s) => supportsPersistence_2(s.destination))) return "always";
  return filtered.length > 0 ? "session" : "once";
}
//@ chunk-e6aww6q8.js:2959282-2959596 placement = buildPermissionUpdates (0.851)
/**
 * 回答 MCP skill 加载 ask 时可应用的更新：普通更新经远程作用域过滤；allow addRules 只保留与本次 skill 规则完全一致、目的地为 session 或允许目的地的那条。
 */
function answerUpdatesForMcpSkillAsk(mode, allowedPrompts) {
  return mode.flatMap((r) => {
    let s = withoutGrantsForRemoteScope([r]);
    if (s.length > 0 || allowedPrompts === undefined || r.type !== "addRules" || r.behavior !== "allow")
      return s;
    if (r.destination !== USERSETTINGS && r.destination !== "session") return [];
    let filtered = r.rules.filter(
      (rule) => rule.toolName === allowedPrompts.toolName && rule.ruleContent === allowedPrompts.ruleContent,
    );
    return filtered.length > 0
      ? [
          {
            ...r,
            rules: filtered,
          },
        ]
      : [];
  });
}
//@ chunk-e6aww6q8.js:2959596-2959849 placement = _temp1 (1)
function filterBuiltInAgentsByDeniedTools(e, n) {
  let r;
  return e.filter((s) => {
    if (
      s.source !== "built-in" ||
      !s.tools ||
      s.tools.length === 0 ||
      parseWildcardAgentTypes(s.tools) !== null
    )
      return true;
    return s.tools.some((tool) => {
      if (tool === "*") return false;
      let toolName = permissionRuleValueFromString(tool).toolName;
      r ??= getDenyRuleIndex(n);
      return (
        !isToolDeniedByIndex(n, r.index, {
          name: toolName,
        }) && isWebFetchPolicyAllowed(toolName)
      );
    });
  });
}
//@ chunk-e6aww6q8.js:2959849-2959896 placement
function isAgentToolPoolDenied(e, n) {
  return filterBuiltInAgentsByDeniedTools([e], n).length === 0;
}
//@ chunk-e6aww6q8.js:2959896-2960029 placement
/**
 * 代理类型因其所有可用工具都被权限设置拒绝而不可用时的提示文字。
 */
function agentToolPoolDeniedMessage(agentType) {
  return `Agent type '${agentType}' is unavailable because every tool it may use is denied by the current permission settings.`;
}
//@ chunk-e6aww6q8.js:2960029-2960102 placement
function isWebFetchPolicyAllowed(toolName) {
  return toolName !== WEBFETCH || (!env.CLAUDE_CODE_DISABLE_WEB_FETCH && isPolicyAllowed_3(ALLOW_WEB_FETCH));
}
//@ chunk-e6aww6q8.js:2960102-2960191 placement
/**
 * 过滤可派发的代理：去掉 isEnabled 为假的、被 Agent(type) deny 规则拒绝的、工具池全被拒绝的代理。
 */
function filterDispatchableAgents(e, context, agentToolName, s) {
  return filterOfferedAgents(
    filterBuiltInAgentsByDeniedTools(
      filterDeniedAgents(
        e.filter((h) => h.isEnabled?.(s) !== false),
        context,
        agentToolName,
      ),
      context,
    ),
    s,
  );
}
//@ chunk-e6aww6q8.js:2960191-2960275 placement
/**
 * 取可派发代理列表：先按允许的 agentType 名单筛选，再走 filterDispatchableAgents。
 */
function getDispatchableAgents(activeAgents, allowedAgentTypes, r, toolUseContext) {
  return filterDispatchableAgents(
    allowedAgentTypes ? activeAgents.filter((h) => allowedAgentTypes.includes(h.agentType)) : activeAgents,
    r,
    AGENT,
    toolUseContext,
  );
}
//@ chunk-e6aww6q8.js:2960275-2960466 placement
/**
 * PermissionRequest 钩子带 updatedInput 放行时的守卫：如果对改写后输入的规则检查结果是 deny/ask，记日志并返回该结果（规则优先于钩子）；否则返回 null。
 */
function guardHookUpdatedInput(e, name) {
  if (e?.behavior === "deny" || e?.behavior === "ask") {
    logForDebugging(
      `PermissionRequest hook allowed ${name} with updatedInput, but ${e.behavior} rule overrides: ${e.message}`,
    );
    return e;
  }
  return null;
}
//@ chunk-e6aww6q8.js:2960466-2962059 placement
/**
 * PermissionRequest 钩子返回 allow 后的落地：strict 模式下校验输入未被改写、对需要用户交互的工具复核规则、应用权限更新（丢失收紧则拒绝）；其他模式下校验改写后的输入、再走规则复核，launcher 模式持久化权限更新，最后返回 allow。
 */
async function applyHookPermissionAllow(
  hookMode,
  tool,
  input,
  hookResult,
  toolUseId,
  context,
  stripWholeToolGrants,
  isVetoed,
) {
  if (hookMode.kind === "strict") {
    if (!isUnchangedAnswerInput(hookResult.updatedInput, input))
      return denyChangedAnswerInput(tool.name, toolUseId);
    if (tool.requiresUserInteraction?.() || requiresConnectorGrant_2(tool)) {
      let Se = guardHookUpdatedInput(
        await checkRuleBasedPermissions(
          tool,
          input,
          {
            ...context,
            toolUseId,
          },
          {
            hookUpdatedInput: undefined,
          },
        ),
        tool.name,
      );
      if (Se)
        return Se.behavior === "ask"
          ? {
              behavior: "deny",
              message: Se.message,
              decisionReason: Se.decisionReason ?? HOOK_ALLOW_FLAGGED_HEADLESS_DENY_REASON,
            }
          : Se;
    }
    let { lostTightenings } = applyAnswerPermissionUpdates(hookMode, hookResult.updatedPermissions, {
      vetoed: isVetoed,
      strip: (Se) =>
        isHookOrPluginSteered(context)
          ? []
          : tool.suppressesAllPermissionUpdates?.(input) === true
            ? withoutGrantsForRemoteScope(Se)
            : tool.suppressesAlwaysAllowRule?.(input) === true || stripWholeToolGrants
              ? stripWholeToolGrantsForAsk(Se, tool, getToolPermissionContext(context))
              : Se,
      toolName: getToolNameForPermissionCheck_2(tool),
      input,
      setContext: context.setSessionToolPermissionContext,
    });
    if (lostTightenings > 0) return denyLostTightening(tool.name, toolUseId);
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: {
        type: "hook",
        hookName: "PermissionRequest",
      },
    };
  }
  if (shouldReplaceMemoryInput(tool, input, hookResult.updatedInput, true))
    return guardAccountMemoryHookRewrite(tool, "PermissionRequest");
  let validated = await validatePermissionRequestUpdatedInput(tool, hookResult.updatedInput, input, (Z) =>
    tool.validateInput?.(Z, {
      ...context,
      toolUseId,
    }),
  );
  if (validated.deny !== undefined) return validated.deny;
  let input_2 = validated.input;
  let effectiveInput = input_2 ?? input;
  if (input_2 || tool.requiresUserInteraction?.() || requiresConnectorGrant_2(tool)) {
    let Z = guardHookUpdatedInput(
      await checkRuleBasedPermissions(
        tool,
        effectiveInput,
        {
          ...context,
          toolUseId,
          permissionRound: undefined,
        },
        {
          hookUpdatedInput: input_2,
        },
      ),
      tool.name,
    );
    if (Z)
      return Z.behavior === "ask"
        ? {
            behavior: "deny",
            message: Z.message,
            decisionReason:
              Z.decisionReason ??
              (input_2 ? HOOK_REWRITE_HEADLESS_DENY_REASON : HOOK_ALLOW_FLAGGED_HEADLESS_DENY_REASON),
          }
        : Z;
  }
  switch (hookMode.kind) {
    case "launcher": {
      let Z =
        tool.suppressesAllPermissionUpdates?.(input) === true
          ? withoutGrantsForRemoteScope(hookResult.updatedPermissions ?? [])
          : tool.suppressesAlwaysAllowRule?.(input) === true || stripWholeToolGrants
            ? stripWholeToolGrantsForAsk(
                hookResult.updatedPermissions ?? [],
                tool,
                getToolPermissionContext(context),
              )
            : (hookResult.updatedPermissions ?? []);
      if (Z.length && !isVetoed() && !isHookOrPluginSteered(context)) {
        context.setSessionToolPermissionContext((Se) => applyPermissionUpdates(Se, Z));
        persistPermissionUpdates(Z, context.storageV5).catch(logError);
      }
      break;
    }
  }
  return {
    behavior: "allow",
    updatedInput: effectiveInput,
    decisionReason: {
      type: "hook",
      hookName: "PermissionRequest",
    },
  };
}
//@ chunk-e6aww6q8.js:2962059-2962890 fingerprint = runPermissionRequestHooksForHeadlessAgent (0.704)
/**
 * 运行 PermissionRequest 钩子：allow（仅在允许由钩子放行时）经 Lkn 生效；deny 直接拒绝（interrupt 时中止）；远程执行跳过；异常记日志返回 null。
 */
async function runPermissionRequestHooks(
  answers,
  tool,
  input,
  toolUseID,
  context,
  mode,
  suggestions,
  suppressAlwaysAllow,
  isAborted,
  hooksMayAllow,
  onAllowIgnored,
) {
  if (context.forRemoteExecution === true) return null;
  try {
    for await (let hookResult of executePermissionRequestHooks(
      tool.name,
      toolUseID,
      input,
      context,
      mode,
      suggestions,
      context.abortController.signal,
    )) {
      if (!hookResult.permissionRequestResult) continue;
      let decision = hookResult.permissionRequestResult;
      if (decision.behavior === "allow") {
        if (!hooksMayAllow) {
          logForDebugging(
            `Ignored a PermissionRequest hook's allow for ${tool.name}: only a person can approve this call, and no prompt can be shown here.`,
          );
          onAllowIgnored?.();
          continue;
        }
        return await applyHookPermissionAllow(
          answers,
          tool,
          input,
          decision,
          toolUseID,
          context,
          suppressAlwaysAllow,
          isAborted,
        );
      }
      if (decision.behavior === "deny") {
        if (decision.interrupt) {
          logForDebugging(`Hook interrupt: tool=${tool.name} hookMessage=${decision.message}`);
          turnAbortControllerOf(context.abortController).abort();
        }
        return {
          behavior: "deny",
          message: decision.message || "Permission denied by hook",
          decisionReason: {
            type: "hook",
            hookName: "PermissionRequest",
            reason: decision.message,
          },
        };
      }
    }
  } catch (error) {
    logForDebugging(`PermissionRequest hook failed for headless agent: ${toError(error).message}`, {
      level: "error",
    });
  }
  return null;
}
//@ chunk-e6aww6q8.js:2962890-2963285 placement
/**
 * 无法弹窗的 ask 交给 PermissionRequest 钩子裁决：远程执行、宿主显示的 ask、仅限人工且属 MCP skill 或工具宿主的 ask 不咨询钩子（返回 null）；否则运行钩子，带建议与“总是允许”抑制标志。
 */
async function consultPermissionRequestHooksForUnpromptableAsk(
  answers,
  tool,
  input,
  result,
  toolUseID,
  context,
  onAllowIgnored,
) {
  if (
    context.forRemoteExecution === true ||
    result.hostDisplay !== undefined ||
    (result.personOnly === true &&
      (result.metadata?.mcpSkill !== undefined ||
        getRegisteredCheck(context.session, tool.name) !== undefined))
  )
    return null;
  return runPermissionRequestHooks(
    answers,
    tool,
    result.updatedInput ?? input,
    toolUseID,
    context,
    isAutoAllowedInMode(tool, getToolPermissionContext(context)),
    result.suggestions,
    result.suppressAlwaysAllowRule === true,
    () => context.abortController.signal.aborted,
    !(
      result.personOnly === true &&
      tool.settleUnaskedQuestion !== undefined &&
      result.hooksMayRefuse !== true
    ),
    onAllowIgnored,
  );
}
//@ chunk-e6aww6q8.js:2963285-2964256 placement
/**
 * ask 结果且 hooksMayRefuse 时先跑 PermissionRequest 钩子：deny 立即拒绝；allow 只在 hooksMayAllow 且改写后输入合法时经 Lkn 采用。
 */
async function personAskAfterHooks(result, { tool, input, context, toolUseID, answers }) {
  let toolPermissionContext = getToolPermissionContext(context);
  if (
    result.behavior !== "ask" ||
    result.hooksMayRefuse !== true ||
    context.forRemoteExecution === true ||
    toolPermissionContext.servedCall === true
  )
    return result;
  let updatedInput = result.updatedInput ?? input;
  let hookResult;
  try {
    for await (let { permissionRequestResult } of executePermissionRequestHooks(
      tool.name,
      toolUseID,
      updatedInput,
      context,
      isAutoAllowedInMode(tool, toolPermissionContext),
      result.suggestions,
      context.abortController.signal,
    )) {
      if (
        permissionRequestResult?.behavior === "allow" &&
        result.hooksMayAllow === true &&
        !isInteractionStillOwed(tool, permissionRequestResult.updatedInput) &&
        !(result.refusal === undefined && mustBeLeftToAPerson(result, tool, input, context, toolUseID)) &&
        isUnchangedAnswerInput(permissionRequestResult.updatedInput, updatedInput)
      )
        hookResult ??= permissionRequestResult;
      if (permissionRequestResult?.behavior === "deny") {
        if (permissionRequestResult.interrupt === true)
          turnAbortControllerOf(context.abortController).abort();
        return {
          behavior: "deny",
          message: permissionRequestResult.message || "Permission denied by hook",
          decisionReason: {
            type: "hook",
            hookName: "PermissionRequest",
            reason: permissionRequestResult.message,
          },
        };
      }
    }
    if (hookResult !== undefined && answers !== undefined) {
      let G = await applyHookPermissionAllow(
        answers,
        tool,
        updatedInput,
        hookResult,
        toolUseID,
        context,
        result.suppressAlwaysAllowRule === true,
        () => context.abortController.signal.aborted,
      );
      if (G.behavior === "allow") notePendingPermissionAnswer(context, toolUseID, result, tool.name);
      return G;
    }
  } catch (error) {
    logForDebugging(
      `PermissionRequest hook failed before a hook's ask for ${tool.name}: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
  }
  return result;
}
//@ chunk-e6aww6q8.js:2964256-2965014 placement
/**
 * 无法弹窗（shouldAvoidPermissionPrompts）或带 refusal 时，用 PermissionRequest 钩子代替人工；钩子无结论则拒绝（asyncAgent："Permission prompts are not available in this context"）。
 */
async function resolveAskWithoutPrompt(answers, tool, input, result, toolUseID, context) {
  if (getToolPermissionContext(context).shouldAvoidPermissionPrompts || result.refusal !== undefined) {
    if (result.refusal !== undefined && result.hooksMayAllow === false) {
      let q = await personAskAfterHooks(result, {
        tool,
        input,
        context,
        toolUseID,
      });
      return q.behavior === "ask" ? result.refusal : q;
    }
    let w = suppressAlwaysAllowForSafetyCheck(result);
    let L = {
      ignoredAllow: false,
    };
    let G = await consultPermissionRequestHooksForUnpromptableAsk(
      answers,
      tool,
      input,
      w.behavior === "ask" ? w : result,
      toolUseID,
      context,
      () => {
        L.ignoredAllow = true;
      },
    );
    if (G) {
      if (G.behavior === "allow") notePendingPermissionAnswer(context, toolUseID, result, tool.name);
      return G;
    }
    if (result.refusal !== undefined) return result.refusal;
    return {
      behavior: "deny",
      decisionReason: {
        type: "asyncAgent",
        reason: "Permission prompts are not available in this context",
        ask: refusedAskOf(result),
        ...(L.ignoredAllow && {
          hookAllowIgnored: true,
        }),
      },
      message: isRequestedModeAuto(context)
        ? buildClassifierUnavailableMessage(
            tool.name,
            SERVER_CLASSIFIER_LABEL,
            undefined,
            "server_not_requested",
            undefined,
            false,
            undefined,
            false,
            alwaysFullClassifierRole(context),
          )
        : result.metadata?.mcpSkill !== undefined
          ? buildNoPromptAvailableDenial(result.message)
          : AUTO_REJECT_MESSAGE(tool.name),
    };
  }
  return result;
}
//@ chunk-e6aww6q8.js:2965014-2965229 placement
/**
 * 无法弹窗时的拒绝结果：decisionReason.type 为 asyncAgent，原因“需要交互批准但当前上下文没有权限提示”，附原 ask 的摘要（refusedAskOf）。
 */
function denyPromptUnavailable(checkResult, message = buildNoPromptAvailableDenial(checkResult.message)) {
  return {
    behavior: "deny",
    message,
    decisionReason: {
      type: "asyncAgent",
      reason: "Action requires interactive approval and permission prompts are not available in this context",
      ask: refusedAskOf(checkResult),
    },
  };
}
//@ chunk-e6aww6q8.js:2965229-2965771 placement
/**
 * 插件评测（plugin eval）授权检查：把上下文改成 dontAsk 并把 cliArg allow 规则（含被剥离的危险规则）加回，用 checkDeclarativePermission 经插件裁决层判定是否 allow。
 */
async function isAllowedByEvalGrants(tool, n, permissionContext, toolUseID, id) {
  let y = {
    ...permissionContext,
    permissionRound: undefined,
    permissionLayers: [
      ...(permissionContext.permissionLayers ?? []),
      {
        kind: "permission_mode",
        mode: "dontAsk",
      },
    ],
    getAppState: () => {
      let appState = permissionContext.getAppState();
      let toolPermissionContext = appState.toolPermissionContext;
      return {
        ...appState,
        toolPermissionContext: {
          ...toolPermissionContext,
          alwaysAllowRules: {
            ...toolPermissionContext.alwaysAllowRules,
            cliArg: [
              ...(toolPermissionContext.alwaysAllowRules.cliArg ?? []),
              ...(toolPermissionContext.strippedDangerousRules?.cliArg ?? []),
            ],
          },
        },
      };
    },
  };
  if (getToolPermissionContext(y).mode !== "dontAsk") return false;
  return (
    (
      await decideWithToolCheckHooks(
        {
          tool,
          input: n,
          context: y,
          toolUseID,
          evaluate: () =>
            checkDeclarativePermission(tool, n, y, {
              crashIsObjection: true,
            }),
        },
        id,
      )
    ).behavior === "allow"
  );
}
//@ chunk-e6aww6q8.js:2965771-2965819 placement
function isServerContextStaleCheckEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_humble_wand", true);
}
//@ chunk-e6aww6q8.js:2965819-2965934 placement
/**
 * 请求时模式是否为 auto：上下文带 permissionModeAtRequest 且去掉它后的有效模式为 auto。
 */
function isRequestedModeAuto(e) {
  return (
    e.permissionModeAtRequest !== undefined &&
    getToolPermissionContext({
      ...e,
      permissionModeAtRequest: undefined,
    }).mode === "auto"
  );
}
//@ chunk-e6aww6q8.js:2965934-2965986 placement
function getStaleContextErrorKind(e) {
  return e.errorKind === SERVER_CONTEXT_STALE ? SERVER_CONTEXT_STALE : undefined;
}
//@ chunk-e6aww6q8.js:2965986-2966061 placement
/**
 * 对外的权限检查入口（canUseTool 的核心）：已给定结果时直接返回，否则走 resolveToolPermission。
 */
var hasPermissionsToUseTool = async (tool, input, context, assistantMessage, toolUseID, forcedResult) => {
  if (forcedResult) return forcedResult;
  return hasPermissionsToUseToolWithSink(
    tool,
    input,
    context,
    assistantMessage,
    toolUseID,
    applyPermissionAnswerChanges,
    undefined,
  );
};
//@ chunk-e6aww6q8.js:2966061-2966131 placement
/**
 * 以 asksNoHost 标志调用 hasPermissionsToUseTool，用于没有宿主可询问的评估。
 */
function evaluateAskingNoHost(...[e, n, r, ...s]) {
  return hasPermissionsToUseTool(
    e,
    n,
    {
      ...r,
      asksNoHost: true,
    },
    ...s,
  );
}
//@ chunk-e6aww6q8.js:2966131-2966576 placement
/**
 * 完整判定：hasPermissionsToUseTool → refusal 时无提示解决 → PermissionRequest 钩子预处理 → 安全检查结果抑制“总是允许” → 放行后撤销重写拒绝计数 → 记录决定。
 */
var hasPermissionsToUseToolWithSink = async (
  tool,
  input,
  context,
  assistantMessage,
  toolUseID,
  answers,
  S,
  w,
) => {
  let L = enforceClassifierOnlyDecision(
    tool,
    settingsProblemDenial() ??
      denyReservedArtifactKeys(tool, input) ??
      (await hasPermissionsToUseToolInner(tool, input, context, assistantMessage, toolUseID, answers, S, w)),
  );
  let result =
    L.behavior === "ask" && L.refusal !== undefined
      ? await resolveAskWithoutPrompt(answers, tool, input, L, toolUseID, context)
      : L;
  let q = await personAskAfterHooks(result, {
    tool,
    input,
    context,
    toolUseID,
    answers,
  });
  let Z =
    q.behavior === "deny"
      ? appendRuleAnnotation({
          ...q,
          decideLocation: "pre-ask",
        })
      : suppressAlwaysAllowForSafetyCheck(q);
  if (
    Z.behavior === "allow" &&
    getDenialTrackingState(context).lastRewriteFingerprint !== undefined &&
    isClassifierTargetToolUse(assistantMessage, toolUseID, context.clientRequestedToolUseId)
  )
    updateDenialTrackingState(context, (state) => undoRewriteDenialIfRetried(state, tool.name, input));
  recordPipelineResult(context, toolUseID, input, Z, tool.name);
  return Z;
};
//@ chunk-e6aww6q8.js:2966576-2966786 placement
function suppressAlwaysAllowForSafetyCheck(e) {
  if (
    e.behavior === "ask" &&
    e.suppressAlwaysAllowRule !== true &&
    e.metadata?.mcpSkill === undefined &&
    findSafetyCheckReason(e.decisionReason, (n) => !n.classifierApprovable) !== undefined
  )
    return {
      ...e,
      suppressAlwaysAllowRule: true,
    };
  return e;
}
//@ chunk-e6aww6q8.js:2966786-2967060 placement
/**
 * 找到能放行该工具的整工具 allow 规则（排除忽略整工具规则的工具、Chrome 地板、MCP 限制、computer-use 例外等）。
 */
function findApplicableAllowRule(tool, input, context, mode, h) {
  let y = toolAlwaysAllowedRule(getToolPermissionContext(context), tool);
  if (
    y &&
    tool.ignoresWholeToolAllowRule?.(input) !== true &&
    !shouldRelyOnModeFloorForBrowser(tool, getToolPermissionContext(context)) &&
    !(
      isChromeToolName(getToolNameForPermissionCheck_2(tool)) &&
      (isBrowserPreviewToolName(getToolNameForPermissionCheck_2(tool)) ||
        getToolPermissionContext(context).chromeClassifierFloorEnabled === true)
    ) &&
    getMcpRuleClassifierRoute(y, tool, input, mode, context, () =>
      h(getToolPermissionContext(context).mode),
    ) === undefined &&
    !isCoworkWebAllowOverride(y, tool, input, context) &&
    !shouldRouteBrowserCallToClassifier(
      getComputerUseChecksSetting(),
      getToolPermissionContext(context),
      tool,
      input,
      mode,
    )
  )
    return y;
  return null;
}
//@ chunk-e6aww6q8.js:2967060-3008254 callgraph-witnessed = hasPermissionsToUseTool (0.269)
/**
 * 主判定：先跑规则/工具检查（abn，经插件 tool.check 裁决 aWr）；allow 直接返回（清零连续拒绝）；ask 时按模式处理——dontAsk 转拒绝；auto 依次走安全检查/ask 规则回退、acceptEdits 模拟快路径、安全白名单、插件/合成调用跳过、分类器（本地或服务端），拦截时计拒绝并在超限时回退人工；bypassPermissions 对安全检查弹窗限时处理；最后无法弹窗时用钩子或拒绝。
 */
var hasPermissionsToUseToolInner = async (
  tool,
  input,
  context,
  assistantMessage,
  toolUseID,
  answers,
  S,
  w,
) => {
  let permissionContext = {
    ...context,
    toolUseId: toolUseID,
    permissionModeAtRequest: getPermissionModeAtRequestForArbiter(assistantMessage, toolUseID, context),
  };
  if (isRequestedModeAuto(permissionContext))
    logEvent("tengu_auto_mode_decided_as_requested_mode", {
      toolName: sanitizeToolNameForAnalytics(tool.name),
      isMcp: tool.isMcp ?? false,
      requestedMode: fromEnum(permissionContext.permissionModeAtRequest.mode),
      toolUseId: sanitizeMarkName(toolUseID),
      agentMsgId: sanitizeMarkName(assistantMessage.message.id),
    });
  let G;
  let q = () => (G ??= mcpToolLogFields(tool, permissionContext.options.mcpClients));
  let Z;
  let Se = () => (Z ??= getProjectsRoleTelemetry(permissionContext));
  let ke = (Ae) =>
    resolveServerClassifierRoleForCall(
      getAutoModeClassifierRole(Ae),
      assistantMessage,
      toolUseID,
      permissionContext,
    );
  let we = await decideWithToolCheckHooks(
    {
      tool,
      input,
      context: permissionContext,
      toolUseID,
      evaluate: () => {
        let evaluateHere = () => checkToolAndRulePermissions(tool, input, permissionContext, S, ke);
        let registeredCheck = getRegisteredCheck(permissionContext.session, tool.name);
        return registeredCheck === undefined
          ? evaluateHere()
          : invokeToolHostAdjudicator(
              registeredCheck,
              tool,
              input,
              permissionContext,
              assistantMessage,
              toolUseID,
              evaluateHere,
            ).then((Me) => {
              if (Me !== CHECK_NO_DECISION) return Me;
              rememberPendingCheck(permissionContext.session, toolUseID);
              return evaluateHere();
            });
      },
    },
    assistantMessage.message.id,
  );
  let checkResult =
    we.behavior === "ask" &&
    (mcpAskVetoesStandingGrant(tool, input, permissionContext, assistantMessage, toolUseID) ||
      isWebSearchClassifierRouted(tool, getToolPermissionContext(permissionContext)))
      ? {
          ...we,
          suppressAlwaysAllowRule: true,
          ...(isRemoteBrowserToolModeFloorActive(tool, getToolPermissionContext(permissionContext)) && {
            suggestions: undefined,
          }),
        }
      : we;
  if (
    checkResult.behavior !== "deny" &&
    settingsGrantsConfined() &&
    isAutoAllowedInMode(tool, getToolPermissionContext(permissionContext)) !== "dontAsk" &&
    !(await isAllowedByEvalGrants(tool, input, permissionContext, toolUseID, assistantMessage.message.id))
  )
    return {
      behavior: "deny",
      decisionReason: {
        type: "other",
        reason:
          "Plugin eval: the run's grants do not allow this call (allowed_tools in the case, --allow-tools on the command line)",
      },
      message: AUTO_REJECT_MESSAGE(tool.name),
    };
  if (checkResult.behavior === "allow") {
    let appState = permissionContext.getAppState();
    let state = permissionContext.localDenialTracking ?? appState.denialTracking;
    if (
      !canShowServerFallbackNotice(permissionContext.requestDialog !== undefined) &&
      isAutoAllowedInMode(tool, getToolPermissionContext(permissionContext)) === "auto" &&
      state &&
      state.consecutiveDenials > 0
    ) {
      let newDenialState = resetConsecutiveDenials(state);
      persistDenialState(permissionContext, newDenialState);
    }
    return checkResult;
  }
  if (checkResult.behavior === "ask") {
    let appState = permissionContext.getAppState();
    let toolPermissionContext = getToolPermissionContext(permissionContext);
    let mode = isAutoAllowedInMode(tool, toolPermissionContext);
    let We = hasPersonOnlyAskFloor(permissionContext.hookAskFloor === true, checkResult);
    let toolNameForPermissionCheck = getToolNameForPermissionCheck_2(tool);
    let lt = isChromeToolName(toolNameForPermissionCheck);
    let chrome = checkResult.metadata?.command?.chrome;
    let nt =
      isChromeClassifierFloorCall(tool, toolPermissionContext) &&
      (chrome?.domainAllowed === true ||
        chrome?.hostHandlesOriginConsent === true ||
        toolAlwaysAllowedRule(toolPermissionContext, tool) !== null);
    let pt =
      isChromeClassifierFloorTool(tool, toolPermissionContext) &&
      toolPermissionContext.canAutoClassifierRun === false &&
      !isAutoClassifierActive(mode, toolPermissionContext.servedCall === true) &&
      chrome?.domainAllowed === true &&
      chrome.grantRule !== undefined &&
      chrome.navigation === undefined &&
      chromeGrantAllowlistWithoutClassifier() &&
      toolPermissionContext.mode !== "plan" &&
      !We &&
      !carriesAskRuleIntent(checkResult) &&
      findSafetyCheckReason(checkResult.decisionReason) === undefined &&
      tool.mcpInfo?.effectiveMaxPermission !== "ask" &&
      isBrowserToolAutoAllowed(tool, input) &&
      !shouldClassifyBrowserWrite(toolPermissionContext, toolNameForPermissionCheck, input);
    if (mode === "dontAsk" && !nt) {
      let yt = false;
      if (toolMaySettleUnaskedQuestion(tool, checkResult, permissionContext))
        try {
          yt =
            tool.requiresUserInteraction?.() !== true &&
            findApplicableAllowRule(tool, input, permissionContext, mode, ke) !== null;
        } catch (error) {
          if (!isAbortError(error)) logError(error);
        }
      return {
        behavior: "deny",
        decisionReason: {
          type: "mode",
          mode: "dontAsk",
          ...(yt && {
            ask: refusedAskOf(checkResult),
          }),
        },
        message: DONT_ASK_REJECT_MESSAGE(tool.name),
      };
    }
    if (isAutoClassifierActive(mode, toolPermissionContext.servedCall === true) || nt || pt) {
      if (isAskOnMutationTool(tool.name, appState.proactivityLevel)) {
        if (toolPermissionContext.shouldAvoidPermissionPrompts) return denyPromptUnavailable(checkResult);
        return checkResult;
      }
      let yt = {
        mode,
        autoActive: isAutoModeActive(),
      };
      let gt = isChainOnAllowActive();
      let At = classifierOnlyConfig(tool);
      if (At?.onBlock === "refuse" && (We || gt))
        return buildClassifierOnlyDenial(
          tool,
          We
            ? "a hook asked for a prompt, and none is raised"
            : "the host re-asks every allow, and no prompt is raised",
        );
      if (
        We &&
        !gt &&
        checkResult.refusal === undefined &&
        toolPermissionContext.shouldAvoidPermissionPrompts &&
        At?.onBlock !== "flag"
      )
        return denyPromptUnavailable(checkResult);
      let It = (Ks) => {
        if (Ks.decisionReason.type === "classifier" && Or)
          rememberCommandNetworkLists(toolUseID, tool, input);
        let { classifierRan, ...Yd } = Ks;
        let xc =
          Yd.decisionReason.type === "classifier" &&
          Yd.decisionReason.noVerdict !== true &&
          classifierRan !== false
            ? {
                ...Yd,
                decisionReason: {
                  ...Yd.decisionReason,
                  classifierAllowed: true,
                },
              }
            : Yd;
        if (At?.onBlock === "flag")
          return {
            behavior: "allow",
            ...xc,
          };
        if (gt)
          return {
            ...checkResult,
            ...Yd,
            decisionReason: pickDisplayedDecisionReason(checkResult, Yd.decisionReason),
          };
        if (We) {
          if (mode === "dontAsk")
            return {
              behavior: "deny",
              decisionReason: {
                type: "mode",
                mode: "dontAsk",
              },
              message: DONT_ASK_REJECT_MESSAGE(tool.name),
            };
          return {
            ...checkResult,
            updatedInput: Ks.updatedInput,
          };
        }
        return {
          behavior: "allow",
          ...xc,
        };
      };
      let Yt = (Ks, kl) => {
        if (!isAskOnMutationTool(tool.name, permissionContext.getAppState().proactivityLevel)) return;
        logEvent("tengu_auto_mode_fallback_to_ask", {
          ...kl,
          reason: fromEnum(Ks),
          toolName: sanitizeToolNameForAnalytics(tool.name),
          toolUseId: sanitizeMarkName(toolUseID),
          isMcp: tool.isMcp ?? false,
          ...q(),
        });
        if (getToolPermissionContext(permissionContext).shouldAvoidPermissionPrompts)
          return denyPromptUnavailable(checkResult);
        return checkResult;
      };
      let safetyCheckReason = findSafetyCheckReason(
        checkResult.decisionReason,
        (Ks) =>
          !Ks.classifierApprovable &&
          !(
            isClassifierRoutedCircuitBreaker(Ks) &&
            !carriesPersonsAsk(Ks) &&
            isAutoModePermissionSurface(toolPermissionContext)
          ),
      );
      let Zt =
        findSafetyCheckReason(checkResult.decisionReason, isLocalProjectionOnlyCircuitBreaker) !== undefined;
      let rn = checkResult.decisionReason?.type === "sandboxOverride";
      let pn = isSandboxOverrideUnderReadBlock(checkResult.decisionReason, toolPermissionContext);
      let no = carriesAskRuleIntent(checkResult);
      let hn =
        isServerPolicyAskReason(checkResult.decisionReason) ||
        checkResult.matchedAskRule?.source === "mcpServerPolicy";
      let ho = isDestructiveMcpAskOverride(hn, tool, input, mode, permissionContext);
      let yn = no && !gt && !(hn && (!(tool.isDestructive?.(input) ?? false) || ho));
      let Kn = tool.mcpInfo?.effectiveMaxPermission === "ask";
      let Xn =
        (isPlanModeFloorReason(checkResult.decisionReason) &&
          !isReadOnlyBrowserCall(getToolNameForPermissionCheck_2(tool), input)) ||
        (!gt &&
          !We &&
          isServerPolicyAskUnderPlanFloor(checkResult.decisionReason, tool, input, permissionContext));
      let safetyCheckReason_2 = findSafetyCheckReason(
        checkResult.decisionReason,
        isAutoModeDenyCircuitBreaker,
      );
      let To =
        safetyCheckReason_2 !== undefined && isAutoModePermissionSurface(toolPermissionContext) && !no
          ? getDangerousRmTimeoutConfig()
          : undefined;
      if (safetyCheckReason_2 !== undefined && To?.enabled) {
        let Ks = applySafetyCheckDialogPolicy(checkResult, safetyCheckReason_2, permissionContext, To);
        if (Ks.behavior === "ask") {
          logEvent("tengu_auto_mode_fallback_to_ask", {
            reason: lit_2("safety_check"),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            toolUseId: sanitizeMarkName(toolUseID),
            isMcp: tool.isMcp ?? false,
            ...q(),
          });
          return Ks;
        }
        appendAutoModeDecision(permissionContext.session, {
          tool: tool.name,
          allowlisted: false,
          decision: "blocked",
          fastPath: "hardcodedDeny",
          durationMs: 0,
          originalDecisionReasonType: "safetyCheck",
        });
        logEvent("tengu_auto_mode_decision", {
          decision: lit_2("blocked"),
          toolName: sanitizeToolNameForAnalytics(tool.name),
          toolUseId: sanitizeMarkName(toolUseID),
          isMcp: tool.isMcp ?? false,
          ...q(),
          inProtectedNamespace: isEvalBuild(),
          ...Se(),
          chromeAutomode: lt,
          mcpServerAskOverride: ho,
          agentMsgId: sanitizeMarkName(assistantMessage.message.id),
          fromTurnHandoff: assistantMessage.handedOff === true,
          fastPath: lit_2("hardcodedDeny"),
          originalDecisionReasonType: lit_2("safetyCheck"),
          circuitBreaker: fromEnumOpt(safetyCheckReason_2.circuitBreaker),
          hookAllowVouch: permissionContext.hookAllowVouched === true,
          ...getDestructiveCommandAnalytics(tool.name, input),
        });
        return Ks;
      }
      if (safetyCheckReason || rn || yn || Kn || Xn) {
        if (toolPermissionContext.shouldAvoidPermissionPrompts) return denyPromptUnavailable(checkResult);
        if (safetyCheckReason || pn || yn || Kn || Xn) {
          logEvent("tengu_auto_mode_fallback_to_ask", {
            reason: lit_2(
              safetyCheckReason || pn
                ? "safety_check"
                : yn
                  ? "ask_rule"
                  : Xn
                    ? "plan_mode_floor"
                    : "org_ask_ceiling",
            ),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            toolUseId: sanitizeMarkName(toolUseID),
            isMcp: tool.isMcp ?? false,
            ...q(),
          });
          return checkResult;
        }
      }
      let bo =
        tool.name === ASKUSERQUESTION &&
        checkResult.behavior === "ask" &&
        !alwaysTrueFlag() &&
        shouldClassifyAskUserQuestion();
      if (!bo && tool.requiresUserInteraction?.() && checkResult.behavior === "ask") {
        logEvent("tengu_auto_mode_fallback_to_ask", {
          reason: lit_2("requires_user_interaction"),
          toolName: sanitizeToolNameForAnalytics(tool.name),
          toolUseId: sanitizeMarkName(toolUseID),
          isMcp: tool.isMcp ?? false,
          ...q(),
        });
        return checkResult;
      }
      if (permissionRecordModule.workflowNeedsUsageConsentPrompt(tool.name, permissionContext)) {
        logEvent("tengu_auto_mode_fallback_to_ask", {
          reason: lit_2("workflow_usage_consent"),
          toolName: sanitizeToolNameForAnalytics(tool.name),
          toolUseId: sanitizeMarkName(toolUseID),
          isMcp: tool.isMcp ?? false,
          ...q(),
        });
        return checkResult;
      }
      if (shouldShowOutsideReadPrompt(tool, input, checkResult, permissionContext)) {
        permissionContext.session.outsideReadPrompt.open(toolUseID);
        logEvent("tengu_auto_mode_fallback_to_ask", {
          reason: lit_2("outside_read_first_prompt"),
          toolName: sanitizeToolNameForAnalytics(tool.name),
          toolUseId: sanitizeMarkName(toolUseID),
          isMcp: tool.isMcp ?? false,
          ...q(),
        });
        return {
          ...checkResult,
          offersBlockOutsideReads: true,
        };
      }
      let state =
        permissionContext.localDenialTracking ?? appState.denialTracking ?? createDenialTrackingState();
      let autoModeClassifierRole = getAutoModeClassifierRole(toolPermissionContext.mode);
      let So = isAutoClassifierActive(toolPermissionContext.mode);
      let ko =
        autoModeClassifierRole === "off" &&
        !Zt &&
        hasHeldServerVerdict(assistantMessage, toolUseID) &&
        isMcpReviewedOutsideAuto(tool, toolPermissionContext);
      let serverClassifierRoleForCall = resolveServerClassifierRoleForCall(
        ko ? "arbiter" : autoModeClassifierRole,
        assistantMessage,
        toolUseID,
        permissionContext,
      );
      let ao = isArbiterRole(serverClassifierRoleForCall);
      let $o = permissionContext.clientRequestedToolUseId === toolUseID;
      let yo = ao
        ? undefined
        : isArbiterRole(autoModeClassifierRole)
          ? $o
            ? "client_call"
            : "script_call"
          : serverClassifierOffReason(toolPermissionContext.mode);
      let Ho = toolPermissionContext.servedCall === true;
      let rr = isAutoClassifierActive(toolPermissionContext.mode, Ho)
        ? undefined
        : !isAutoClassifierActive(yt.mode, Ho)
          ? nt
            ? "chrome_rule_allowed"
            : undefined
          : typeof getMcpPermissionModeOverride(tool, toolPermissionContext) === "string"
            ? "mcp_mode_override"
            : "floor";
      if (ao) logStrictTierUnavailable("server_arbiter");
      let br = At?.onBlock === "flag";
      let Hr = isServerClassifierActive(toolPermissionContext.mode, autoModeClassifierRole, {
        handoffReview: br,
      });
      let Fr = br ? isServerClassifierActive(toolPermissionContext.mode, autoModeClassifierRole) : Hr;
      let cs = isLocalClassifierSwitchedOff({
        handoffReview: br,
      });
      let _r = br ? isLocalClassifierSwitchedOff() : cs;
      let decisionReason =
        checkResult.decisionReason?.type === "other" &&
        checkResult.decisionReason.reason === SERVER_HOLDS_SHELL_ALLOW_REASON
          ? checkResult.decisionReason
          : undefined;
      let Vr = decisionReason !== undefined;
      let Oo =
        checkResult.decisionReason?.type === "other" &&
        checkResult.decisionReason.reason === TOOL_HOST_ALLOW_IS_CLASSIFIED_REASON;
      let reroutedFrom = decisionReason?.reroutedFrom;
      let Or = areCommandNetworkListsOffered_2();
      let Io;
      let zo =
        assistantMessage.serverClassifierInputRewrite?.keptVerdict === true &&
        (involvesSafetyCheck(checkResult.decisionReason) ||
          (isFileMutationTool(tool.name) &&
            (classifyEditsEnabled(getMainLoopModel_2(permissionContext)) ||
              shouldClassifyEdits(getMainLoopModel_2(permissionContext)) ||
              shouldClassifyEdits(assistantMessage.message.model))));
      let rs = new enqueuePermissionCheckStatus(toolUseID, permissionContext.agentId);
      let Es;
      let Nr;
      let Is = () => {
        if (Io === undefined) {
          let now = Date.now();
          Io = awaitServerVerdict(assistantMessage, toolUseID, !zo).then((kl) => {
            Es = Date.now() - now;
            Nr = kl;
            return kl;
          });
        }
        return Io;
      };
      let fs = () => {
        let Ks = Is();
        if (Es === undefined) {
          let kl = rs.hold();
          Ks.then(kl, kl);
        }
        return Ks;
      };
      let as = (Ks) => {
        let kl = shouldFallBackToLocal(serverClassifierRoleForCall, Ks, toolUseID, {
          outsideAutoMode: ko,
        });
        if (
          kl &&
          serverClassifierRoleForCall === "arbiter" &&
          !ko &&
          !Fr &&
          !isThirdPartyServerClassifierRefused()
        ) {
          markThirdPartyServerClassifierRefused();
          logEvent("tengu_server_classifier_no_result_latched", {
            isSubagent: permissionContext.agentId !== undefined,
            reason: fromEnum(Ks.kind === "none" ? Ks.why : "other"),
          });
          logForDebugging(
            Ks.kind === "none" && Ks.why === "server_unsupported"
              ? "[server-classifier] the API answered that it does not run the server-side classifier for this session (unsupported), so auto mode classifies locally for the rest of this session"
              : "[server-classifier] a completed response carried no classification result (no safeguard_results); assuming something on the path to the API dropped it, so auto mode classifies locally for the rest of this session",
            {
              level: "warn",
            },
          );
        }
        if (!kl || !Hr) return kl;
        if (isServerClassifierUnsupported(Ks) || isThirdPartyServerClassifierRefused()) return true;
        let Yd = noVerdictReasonFor(Ks, toolUseID);
        return Yd !== "server_input_rewritten" && !isServerUnavailableReason(Yd, Ks.kind === "per_call");
      };
      let Vi =
        !ao &&
        true &&
        isFileMutationTool(tool.name) &&
        classifyEditsEnabled(getMainLoopModel_2(permissionContext));
      let ji = async () => {
        if (!ao || !(isFileMutationTool(tool.name) || Vr)) return false;
        let Ks = await fs();
        let kl = noVerdictReasonFor(Ks, toolUseID);
        if (kl === "server_input_rewritten") return true;
        if (as(Ks)) return !Vr && classifyEditsEnabled(getMainLoopModel_2(permissionContext));
        if (Vr && isServerNotRequestedReason(kl)) return false;
        let Yd = handedOffIds(assistantMessage.handedOffLive);
        if (
          kl === "server_not_requested" &&
          Yd?.size === 1 &&
          Yd.has(toolUseID) &&
          runLoneHandedOverEditEnabled()
        )
          return (
            classifyEditsEnabled(getMainLoopModel_2(permissionContext)) ||
            shouldClassifyEdits(assistantMessage.message.model)
          );
        return kl !== "server_call_skipped";
      };
      let Wi = toolAlwaysAllowedRule(toolPermissionContext, tool);
      let mcpRuleClassifierRoute = getMcpRuleClassifierRoute(
        Wi,
        tool,
        input,
        mode,
        permissionContext,
        () => serverClassifierRoleForCall,
      );
      let mcpAlwaysAllowOverride =
        mcpRuleClassifierRoute === "serverPolicy" || mcpRuleClassifierRoute === "shadowedServerPolicy";
      let mcpAlwaysAllowShadowedBy =
        mcpRuleClassifierRoute === "shadowedServerPolicy" ? fromEnumOpt(Wi?.source) : undefined;
      let mcpRemoteSessionAllowOverride = mcpRuleClassifierRoute === "remoteSession";
      let coworkWebAllowOverride = isCoworkWebAllowOverride(Wi, tool, input, permissionContext);
      let $a =
        Wi !== null &&
        shouldRouteBrowserCallToClassifier(
          getComputerUseChecksSetting(),
          toolPermissionContext,
          tool,
          input,
          mode,
        );
      let nr = classifyBrowserAction(toolNameForPermissionCheck, input);
      let computerUseRouted =
        $a && checkResult.decisionReason === undefined && mcpRuleClassifierRoute === undefined;
      let Vs =
        nr === undefined
          ? undefined
          : measureActionSummaries(toolNameForPermissionCheck, tool.inputJSONSchema, input);
      let _i =
        nr === undefined
          ? {}
          : {
              computerUseTool: true,
              computerUseActionKind: fromEnum(nr),
              computerUseRouted,
              computerUseActionSummaryLength: Vs !== undefined && "length" in Vs ? Vs.length : undefined,
              computerUseActionSummaryExpectedItems:
                Vs !== undefined && "filledItems" in Vs ? Vs.expectedItems : undefined,
              computerUseActionSummaryFilledItems:
                Vs !== undefined && "filledItems" in Vs ? Vs.filledItems : undefined,
            };
      let jo = mode === "plan" && !Vr;
      let Qr = [];
      let fi = false;
      let navigation = lt ? chrome?.navigation : undefined;
      if (navigation) recordContextNavigation(toolUseID, navigation.from, navigation.to);
      let chromePointerPress = lt && hasBrowserWriteAction(toolNameForPermissionCheck, input);
      let Di = lt
        ? countBatchActionSummaries(toolNameForPermissionCheck, tool.inputJSONSchema, input)
        : undefined;
      let yr = {
        chromeActionSummaryLength: lt
          ? getActionSummaryLength(toolNameForPermissionCheck, tool.inputJSONSchema, input)
          : undefined,
        chromeActionSummaryExpectedItems: Di?.expectedItems,
        chromeActionSummaryFilledItems: Di?.filledItems,
      };
      let Kr = lt && shouldClassifyBrowserWrite(toolPermissionContext, toolNameForPermissionCheck, input);
      let Li = navigation !== undefined || Kr;
      let Qs = findSafetyCheckReason(checkResult.decisionReason) !== undefined;
      if (
        !Li &&
        !$a &&
        !pt &&
        !isAgentSpawningTool(tool.name) &&
        At === undefined &&
        !Zt &&
        tool.sandboxNetworkLists?.(input) === undefined &&
        !rn &&
        !Vi &&
        !Qs &&
        !jo &&
        !(lt && getFeatureValue_CACHED_MAY_BE_STALE("tengu_radiant_hare", false))
      )
        try {
          let parsedInput = tool.inputSchema.parse(input);
          let kl = (oc) => {
            let hp = permissionRuleValueFromString(oc);
            return !isDangerousClassifierPermission(hp.toolName, hp.ruleContent);
          };
          let alwaysAllowRules = xr(toolPermissionContext.alwaysAllowRules, (oc) => (oc ?? []).filter(kl));
          let permissionLayers = permissionContext.permissionLayers?.map((permissionLayer) =>
            permissionLayer.kind === "allowed_tools"
              ? {
                  ...permissionLayer,
                  allowedTools: permissionLayer.allowedTools.filter(kl),
                }
              : permissionLayer,
          );
          let Ip = (directories) =>
            tool.checkPermissions(parsedInput, {
              ...permissionContext,
              toolUseId: undefined,
              permissionLayers,
              getAppState: () => {
                let state = permissionContext.getAppState();
                let context = {
                  ...state.toolPermissionContext,
                  mode: "acceptEdits",
                  modeBeforeRewrite: toolPermissionContext.modeBeforeRewrite ?? toolPermissionContext.mode,
                  alwaysAllowRules,
                };
                return {
                  ...state,
                  toolPermissionContext: directories.length
                    ? addAdditionalWorkingDirectories(context, directories, "session")
                    : context,
                };
              },
            });
          let Gc =
            ao &&
            reroutedFrom === "readOnly" &&
            getRegisteredCheck(permissionContext.session, tool.name) !== undefined &&
            noVerdictReasonFor(await fs(), toolUseID) === "server_call_skipped"
              ? {
                  behavior: "allow",
                }
              : await Ip([]);
          if (
            Gc.behavior === "ask" &&
            Gc.decisionReason?.type === "workingDir" &&
            isLinkedWorktreeFastPathEnabled() &&
            !isBrowserToolAutoAllowed(tool, input)
          ) {
            Qr = await verifiedLinkedWorktreeDirectories(
              permissionContext.getAppState().toolPermissionContext,
            );
            if (Qr.length > 0) Gc = await Ip(Qr);
          }
          fi = Gc.behavior === "allow" && (await ji());
          if (Gc.behavior === "allow" && !fi) {
            let oc = ao ? await fs() : undefined;
            if (ao) {
              let Sc = isAutoAllowedInMode(tool, getToolPermissionContext(permissionContext));
              if (
                !(Sc === yt.mode && isAutoModeActive() === yt.autoActive) &&
                !isStillAllowedAfterModeChange(Sc, nt, tool, input, permissionContext)
              ) {
                logEvent("tengu_auto_mode_fallback_to_ask", {
                  reason: lit_2("mode_changed_while_queued"),
                  toolName: sanitizeToolNameForAnalytics(tool.name),
                  toolUseId: sanitizeMarkName(toolUseID),
                  isMcp: tool.isMcp ?? false,
                  ...q(),
                });
                if (Sc === "dontAsk")
                  return {
                    behavior: "deny",
                    decisionReason: {
                      type: "mode",
                      mode: "dontAsk",
                    },
                    message: DONT_ASK_REJECT_MESSAGE(tool.name),
                  };
                if (getToolPermissionContext(permissionContext).shouldAvoidPermissionPrompts)
                  return denyPromptUnavailable(checkResult);
                return checkResult;
              }
            }
            let hp = Yt("ask_level_during_accept_edits_sim");
            if (hp) return hp;
            if (!canShowServerFallbackNotice(permissionContext.requestDialog !== undefined))
              updateDenialTrackingState(permissionContext, resetConsecutiveDenials);
            logForDebugging(
              Vr
                ? `Server classifier skipped ${tool.name} or left it to this CLI: the tool's own allow stands`
                : `Skipping auto mode classifier for ${tool.name}: would be allowed in acceptEdits mode`,
            );
            let Pg = Vr
              ? "serverHeldShellAllow"
              : Qr.length > 0
                ? "acceptEditsLinkedWorktree"
                : "acceptEdits";
            logEvent("tengu_auto_mode_decision", {
              decision: lit_2("allowed"),
              toolName: sanitizeToolNameForAnalytics(tool.name),
              toolUseId: sanitizeMarkName(toolUseID),
              isMcp: tool.isMcp ?? false,
              ...q(),
              inProtectedNamespace: isEvalBuild(),
              ...Se(),
              chromeAutomode: lt,
              mcpAlwaysAllowOverride,
              mcpAlwaysAllowShadowedBy,
              mcpRemoteSessionAllowOverride,
              coworkWebAllowOverride,
              ..._i,
              mcpServerAskOverride: ho,
              agentMsgId: sanitizeMarkName(assistantMessage.message.id),
              fromTurnHandoff: assistantMessage.handedOff === true,
              confidence: lit_2("high"),
              fastPath: fromEnum(Pg),
              chromePointerPress,
              ...yr,
              serverHeldShellAllowFrom: fromEnumOpt(reroutedFrom),
              hookAllowVouch: permissionContext.hookAllowVouched === true,
              ...getDestructiveCommandAnalytics(tool.name, input),
              ...(oc !== undefined && {
                classifierSource: lit_2("server"),
                serverClassifierNoVerdict: fromEnumOpt(noVerdictReasonFor(oc, toolUseID)),
                classifierTotalWaitMs: Es,
              }),
            });
            if (oc !== undefined)
              appendAutoModeDecision(permissionContext.session, {
                tool: tool.name,
                allowlisted: false,
                decision: "allowed",
                fastPath: Pg,
                serverHeldShellAllowFrom: reroutedFrom,
                durationMs: 0,
                totalWaitMs: Es,
                classifierSource: "server",
                serverClassifierNoVerdict: noVerdictReasonFor(oc, toolUseID),
              });
            return It({
              updatedInput: (decisionReason ? checkResult.updatedInput : Gc.updatedInput) ?? input,
              decisionReason: decisionReason?.replaces ?? {
                type: "mode",
                mode: "auto",
              },
            });
          }
        } catch (error) {
          if (error instanceof AbortError_2 || error instanceof APIUserAbortError) throw error;
          if (!isAbortError(error)) logError(error);
          logEvent("tengu_auto_mode_decision", {
            decision: lit_2("fastpath_error"),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            toolUseId: sanitizeMarkName(toolUseID),
            isMcp: tool.isMcp ?? false,
            ...q(),
            inProtectedNamespace: isEvalBuild(),
            ...Se(),
            chromeAutomode: lt,
            mcpAlwaysAllowOverride,
            mcpAlwaysAllowShadowedBy,
            mcpRemoteSessionAllowOverride,
            coworkWebAllowOverride,
            ..._i,
            mcpServerAskOverride: ho,
            agentMsgId: sanitizeMarkName(assistantMessage.message.id),
            fromTurnHandoff: assistantMessage.handedOff === true,
            fastPath: Qr.length > 0 ? lit_2("acceptEditsLinkedWorktree") : lit_2("acceptEdits"),
            hookAllowVouch: permissionContext.hookAllowVouched === true,
            error: sanitizeErrorName_2(error) ?? lit_2("unknown"),
            ...getDestructiveCommandAnalytics(tool.name, input),
          });
        }
      let Hi =
        At === undefined &&
        !Zt &&
        (isBrowserToolAutoAllowed(tool, input) ||
          (tool.mcpInfo?.serverName === REMOTE_BROWSER_SERVER_NAME &&
            !no &&
            !hasAutoModeClassifierDenyRules() &&
            isRemoteBrowserReadWithoutClassifier(tool, input, toolPermissionContext, mode)));
      let Xa = Kr && navigation === undefined && Hi;
      if (Xa) keepResolvedHostPin(toolUseID);
      if (!Li && !$a && Hi) {
        if (!canShowServerFallbackNotice(permissionContext.requestDialog !== undefined))
          updateDenialTrackingState(permissionContext, resetConsecutiveDenials);
        logForDebugging(`Skipping auto mode classifier for ${tool.name}: tool is on the safe allowlist`);
        appendAutoModeDecision(permissionContext.session, {
          tool: tool.name,
          allowlisted: true,
          decision: "allowed",
          durationMs: 0,
          ...(pt && {
            chromeGrantNoClassifier: true,
          }),
        });
        logEvent("tengu_auto_mode_decision", {
          decision: lit_2("allowed"),
          toolName: sanitizeToolNameForAnalytics(tool.name),
          toolUseId: sanitizeMarkName(toolUseID),
          isMcp: tool.isMcp ?? false,
          ...q(),
          inProtectedNamespace: isEvalBuild(),
          ...Se(),
          chromeAutomode: lt,
          mcpAlwaysAllowOverride,
          mcpAlwaysAllowShadowedBy,
          mcpRemoteSessionAllowOverride,
          coworkWebAllowOverride,
          ..._i,
          mcpServerAskOverride: ho,
          agentMsgId: sanitizeMarkName(assistantMessage.message.id),
          fromTurnHandoff: assistantMessage.handedOff === true,
          confidence: lit_2("high"),
          fastPath: lit_2("allowlist"),
          chromePointerPress,
          ...(pt && {
            chromeGrantNoClassifier: true,
          }),
          ...yr,
          hookAllowVouch: permissionContext.hookAllowVouched === true,
          ...getDestructiveCommandAnalytics(tool.name, input),
        });
        return It({
          updatedInput: checkResult.updatedInput ?? input,
          decisionReason:
            pt && !gt && chrome?.grantRule !== undefined
              ? {
                  type: "rule",
                  rule: chrome.grantRule,
                }
              : {
                  type: "mode",
                  mode: "auto",
                },
        });
      }
      if (pt) {
        logEvent("tengu_auto_mode_fallback_to_ask", {
          reason: lit_2("chrome_grant_no_classifier"),
          toolName: sanitizeToolNameForAnalytics(tool.name),
          toolUseId: sanitizeMarkName(toolUseID),
          isMcp: tool.isMcp ?? false,
          ...q(),
        });
        return resolveAskWithoutPrompt(answers, tool, input, checkResult, toolUseID, permissionContext);
      }
      let ta = () =>
        isAutoClassifierActive(toolPermissionContext.mode) &&
        isAutoClassifierActive(mode) &&
        checkResult.checkIncomplete !== true &&
        navigation === undefined &&
        tool.requiresUserInteraction?.() !== true &&
        At === undefined &&
        !Zt &&
        !getToolNameForPermissionCheck(tool, input);
      let Bs = false;
      let Ca = false;
      if (
        permissionContext.desktopForwardToolUseId !== undefined &&
        permissionContext.desktopForwardToolUseId === toolUseID &&
        ta() &&
        findSafetyCheckReason(checkResult.decisionReason) === undefined &&
        !rn &&
        !scriptAsksToRunUnsandboxed(tool, input) &&
        checkResult.decisionReason?.type !== "workingDir" &&
        !(checkResult.blockedPath !== undefined && checkResult.bashAllowRuleOverridable !== true) &&
        !isAgentSpawningTool(tool.name) &&
        true
      ) {
        let Ks = Yt("ask_level_during_accept_edits_sim");
        if (Ks) return Ks;
        let kl = isAutoAllowedInMode(tool, getToolPermissionContext(permissionContext));
        if (kl !== yt.mode || isAutoModeActive() !== yt.autoActive) {
          logEvent("tengu_auto_mode_fallback_to_ask", {
            reason: lit_2("mode_changed_while_queued"),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            toolUseId: sanitizeMarkName(toolUseID),
            isMcp: tool.isMcp ?? false,
            ...q(),
          });
          if (kl === "dontAsk")
            return {
              behavior: "deny",
              decisionReason: {
                type: "mode",
                mode: "dontAsk",
              },
              message: DONT_ASK_REJECT_MESSAGE(tool.name),
            };
          if (getToolPermissionContext(permissionContext).shouldAvoidPermissionPrompts)
            return denyPromptUnavailable(checkResult);
          return checkResult;
        }
        if (!canShowServerFallbackNotice(permissionContext.requestDialog !== undefined))
          updateDenialTrackingState(permissionContext, resetConsecutiveDenials);
        let Yd = "desktop_forward";
        logForDebugging(
          `Skipping auto mode classifier for ${tool.name}: this is SendMessage's forward to Claude Desktop, and the classifier already allowed that SendMessage`,
        );
        appendAutoModeDecision(permissionContext.session, {
          tool: tool.name,
          allowlisted: false,
          decision: "allowed",
          fastPath: Yd,
          durationMs: 0,
        });
        logEvent("tengu_auto_mode_decision", {
          decision: lit_2("allowed"),
          toolName: sanitizeToolNameForAnalytics(tool.name),
          toolUseId: sanitizeMarkName(toolUseID),
          isMcp: tool.isMcp ?? false,
          ...q(),
          inProtectedNamespace: isEvalBuild(),
          ...Se(),
          chromeAutomode: lt,
          mcpAlwaysAllowOverride,
          mcpAlwaysAllowShadowedBy,
          mcpRemoteSessionAllowOverride,
          coworkWebAllowOverride,
          ..._i,
          mcpServerAskOverride: ho,
          agentMsgId: sanitizeMarkName(assistantMessage.message.id),
          fromTurnHandoff: assistantMessage.handedOff === true,
          confidence: lit_2("high"),
          fastPath: fromEnum(Yd),
          chromePointerPress,
          ...yr,
          hookAllowVouch: permissionContext.hookAllowVouched === true,
          ...getDestructiveCommandAnalytics(tool.name, input),
        });
        return It({
          updatedInput: checkResult.updatedInput ?? input,
          decisionReason: {
            type: "mode",
            mode: "auto",
          },
        });
      }
      let tu = (Ks, reason) => {
        appendAutoModeDecision(permissionContext.session, {
          tool: tool.name,
          allowlisted: false,
          decision: "allowed",
          fastPath: Ks,
          durationMs: 0,
        });
        logEvent("tengu_auto_mode_decision", {
          decision: lit_2("allowed"),
          toolName: sanitizeToolNameForAnalytics(tool.name),
          toolUseId: sanitizeMarkName(toolUseID),
          isMcp: tool.isMcp ?? false,
          inProtectedNamespace: isEvalBuild(),
          ...Se(),
          chromeAutomode: lt,
          mcpAlwaysAllowOverride,
          mcpAlwaysAllowShadowedBy,
          mcpRemoteSessionAllowOverride,
          coworkWebAllowOverride,
          ..._i,
          mcpServerAskOverride: ho,
          agentMsgId: sanitizeMarkName(assistantMessage.message.id),
          fromTurnHandoff: assistantMessage.handedOff === true,
          fastPath: fromEnum(Ks),
          chromePointerPress,
          ...yr,
          hookAllowVouch: permissionContext.hookAllowVouched === true,
          ...getDestructiveCommandAnalytics(tool.name, input),
        });
        return It({
          updatedInput: checkResult.updatedInput ?? input,
          decisionReason: {
            type: "other",
            reason,
          },
        });
      };
      let newDenialState = getHookCaller(permissionContext);
      if (
        newDenialState !== undefined &&
        isAutoClassifierActive(toolPermissionContext.mode) &&
        isAutoClassifierActive(mode) &&
        At === undefined &&
        navigation === undefined &&
        !hasAutoModeClassifierDenyRules() &&
        findSafetyCheckReason(checkResult.decisionReason, isClassifierRoutedCircuitBreaker) === undefined &&
        !Zt &&
        !getToolNameForPermissionCheck(tool, input) &&
        !isWebToolRestrictedInRelay(tool.name) &&
        !isWebToolClassifierRouted(tool, toolPermissionContext) &&
        !isRemoteBrowserToolUnderModeFloor(tool) &&
        !isDeepDuskDeviceTool(toolNameForPermissionCheck, mode, toolPermissionContext)
      ) {
        logForDebugging(`Skipping auto mode classifier for ${tool.name}: called by plugin ${newDenialState}`);
        if (bo) return checkResult;
        if (Or) rememberCommandNetworkLists(toolUseID, tool, input);
        return tu("pluginOrigin", `plugin-origin: ${newDenialState}`);
      }
      if (
        permissionContext.synthesizedBy !== undefined &&
        tool.name === AGENT &&
        isAutoClassifierActive(toolPermissionContext.mode) &&
        isAutoClassifierActive(mode) &&
        At === undefined &&
        !Li &&
        !Zt &&
        findSafetyCheckReason(checkResult.decisionReason, isClassifierRoutedCircuitBreaker) === undefined
      ) {
        logForDebugging(
          `Skipping auto mode classifier for ${tool.name}: synthesized by ${permissionContext.synthesizedBy}`,
        );
        return tu("harnessSynthesized", `harness-synthesized: ${permissionContext.synthesizedBy}`);
      }
      let sameTurnToolUses = permissionContext.sameTurnToolUses ?? [];
      let newDenialState_2 = isModelDrivenSession(permissionContext.agentId);
      let { messages, inheritedPrefix } = prependInheritedVerifiedTurns(
        permissionContext.messages,
        permissionContext.inheritedVerifiedHumanTurns,
        newDenialState_2,
      );
      let messages_2 = formatActionForClassifier(tool.name, input, toolUseID);
      markClassifierChecking(w, toolUseID);
      let classifierResult;
      let ol = false;
      let gd = false;
      let Su = false;
      let Eu;
      let Uc;
      let Kc;
      using _s = new CommitTurnSlot();
      let classifierKeepalive = startClassifierKeepalive();
      let wr = rs.hold();
      try {
        let Ks = sameTurnToolUses.length > 0 ? [...messages, ...sameTurnToolUses] : messages;
        let sessionId = pinSessionId(getSessionId());
        let Yd = (queueProgress) =>
          classifyYoloAction(
            Ks,
            messages_2,
            permissionContext.options.tools,
            getToolPermissionContext(permissionContext),
            permissionContext.abortController.signal,
            {
              localClassifierSite: "gate",
              judgesHandback: br,
              isSubagentLoop: newDenialState_2,
              inheritedPrefix,
              recordPresumed: permissionContext.agentId === undefined,
              severityEligible: true,
              artifactConsentArm: "enroll",
              storageV5: permissionContext.storageV5,
              credentials: permissionContext.credentials,
              mcpClients: currentMcpClients(permissionContext),
              agentId: permissionContext.agentId,
              sessionId,
              queueProgress,
            },
          );
        let xc = async () => {
          let Sc = classifyServerVerdict(await fs(), toolUseID, () =>
            collectToolUseIdSet(messages_2, permissionContext.options.tools),
          );
          if (!Sc.shouldBlock && isServerContextStaleCheckEnabled()) {
            let Hu = tool.staleServerClassifierContext?.(
              input,
              assistantMessage.serverClassifierResults?.sentArtifacts,
              permissionContext,
            );
            if (Hu !== undefined) {
              Uc = Hu;
              logForDebugging(
                `[server-classifier] ${tool.name}: what the request told the server of the artifact's ${Hu.phrase} was missing or no longer holds (${Hu.cause.kind}); the server's allow is void`,
              );
              logEvent("tengu_auto_mode_server_context_stale", {
                toolName: sanitizeToolNameForAnalytics(tool.name),
                staleOwnership: Hu.facts.includes("ownership"),
                staleAudience: Hu.facts.includes("audience"),
                staleSharedLive: Hu.facts.includes("shared-live"),
                staleCowritten: Hu.facts.includes("co-written"),
                staleAttested: Hu.facts.includes("attested"),
                staleTypeDeclaration: Hu.facts.includes("type-declaration"),
                staleWatch: Hu.facts.includes("watch"),
                staleConnectors: Hu.facts.includes("connectors"),
                staleFirstTouch: Hu.firstTouch,
              });
              return {
                model: Sc.model,
                durationMs: 0,
                shouldBlock: true,
                unavailable: true,
                errorKind: SERVER_CONTEXT_STALE,
                reason: "Classifier verdict out of date - blocking for a retry",
              };
            }
          }
          return Sc;
        };
        let Ip = async (Sc) => {
          let Hu = await xc();
          if (
            Hu.shouldBlock &&
            isInputRewrittenWithFallbackOff(Hu.errorKind) &&
            countToolCallsSince_6(assistantMessage, toolUseID)
          ) {
            gd = true;
            logForDebugging(
              `[server-classifier] ${tool.name}: after the server reviewed the response a hook rewrote this call's input, or that of a call before it; the local classifier judges this one call`,
            );
            let dy = await Yd(Sc);
            if (dy.errorKind === CLASSIFIER_SWITCHED_OFF_KIND) {
              Su = true;
              if (At?.onBlock === "flag") return dy;
            }
            return isClassifierVerdictUsable(dy)
              ? dy
              : {
                  ...Hu,
                  shouldBlock: true,
                  unavailable: true,
                };
          }
          if (!Hr && Hu.errorKind === "server_not_requested" && getToolNameForPermissionCheck(tool, input)) {
            Eu = "hosted_desktop_not_requested";
            return Yd(Sc);
          }
          if (
            !Zt ||
            (Hu.shouldBlock &&
              (!isServerNotRequestedReason(Hu.errorKind) ||
                (Hu.errorKind === "server_input_rewritten" && getServerClassifierFallbackMode() !== "off")))
          )
            return Hu;
          Eu = "projection_only";
          return Yd(Sc);
        };
        let Gc = async () => {
          if (!isThirdPartyServerClassifierRefused()) return false;
          if ((await awaitClassifierBillingFallbackNotice(permissionContext)) === "interrupt") {
            if (!permissionContext.abortController.signal.aborted)
              turnAbortControllerOf(permissionContext.abortController).abort();
            return true;
          }
          return false;
        };
        let oc = ao
          ? async (Sc) => {
              let Hu = await fs();
              let dy = false;
              if (as(Hu)) {
                ol = true;
                logForDebugging(
                  `[server-classifier] ${tool.name}: no server verdict for this call (${noVerdictReasonFor(Hu, toolUseID)}); the local classifier decides it`,
                );
                return (await Gc()) ? CLASSIFIER_BILLING_CANCELLED_RESULT : Yd(Sc);
              }
              return Ip(Sc);
            }
          : Yd;
        let hp = async (Sc) => ((await Gc()) ? CLASSIFIER_BILLING_CANCELLED_RESULT : oc(Sc));
        let Pg = async (Sc) => {
          let Hu = ao ? await fs() : undefined;
          if (Hu !== undefined && !as(Hu)) return Ip(Sc);
          return (
            collectToolUseIdSet(messages_2, permissionContext.options.tools) ??
            NO_CLASSIFIER_FOR_SESSION_RESULT
          );
        };
        classifierResult = await enqueueClassifierRequest(
          permissionContext.agentId ?? "main",
          Hr ? Pg : hp,
          (Sc) => {
            Kc = Sc;
            classifierKeepalive.restartDeadline();
          },
          {
            commitTurn: _s,
          },
        );
      } finally {
        classifierKeepalive();
        wr();
        clearClassifierChecking(w, toolUseID);
      }
      if (classifierResult === CLASSIFIER_BILLING_CANCELLED_RESULT)
        return {
          behavior: "deny",
          message: REJECT_MESSAGE,
          decisionReason: {
            type: "other",
            reason: CANCELLED_AT_CLASSIFIER_NOTICE_REASON,
          },
        };
      if (classifierResult === NO_CLASSIFIER_FOR_SESSION_RESULT && $o)
        return {
          behavior: "deny",
          decisionReason: {
            type: "classifier",
            classifier: "auto-mode",
            reason: CLASSIFIER_UNAVAILABLE_REASON,
          },
          message: `${tool.name} was not run: auto mode's safety check cannot judge a call that a client asked for in this session. This is not a judgment that it is unsafe. Another permission mode can run it.`,
        };
      if (classifierResult === NO_CLASSIFIER_FOR_SESSION_RESULT) {
        let Ks = ao ? await fs() : undefined;
        let kl = cs && yo === "script_call";
        let Yd = kl
          ? "server_not_requested"
          : Ks === undefined || isServerClassifierUnsupported(Ks) || isThirdPartyServerClassifierRefused()
            ? undefined
            : noVerdictReasonFor(Ks, toolUseID);
        let xc = Ks === undefined ? yo : isServerClassifierUnsupported(Ks) ? Ks.why : "refused_latch";
        let Ip =
          xc === "user_switch_off" ||
          (xc === "third_party_switch_off" && getUserServerClassifierSwitch() === false);
        let newDenialState = getToolPermissionContext(permissionContext);
        let oc =
          !permissionContext.options.isNonInteractiveSession &&
          !gt &&
          !newDenialState.shouldAvoidPermissionPrompts &&
          !isUnattendedInteractiveSession();
        let hp = oc && hasCustomAutoModeDenyRules();
        let Pg = oc && !hp;
        if (
          Yd === undefined &&
          noteNoServerCheck(
            Ip
              ? "own_switch_off"
              : xc === "betas_disabled" || xc === "third_party_switch_off"
                ? "betas_off"
                : xc === "kill_switch"
                  ? "switched_off"
                  : xc === "code_mode" || xc === "batch_file_tools"
                    ? "feature_not_covered"
                    : "not_served",
          )
        )
          logFeatureSad("auto_mode_no_server_check", xc ?? "unknown", {
            gatewayConfigured: gatewayDisplayName() !== undefined,
            interactive: oc,
            heldByDenyRules: hp,
            ...(cs && {
              localClassifierSwitchedOff: true,
            }),
          });
        if (Yd === undefined) appendAutoModeWarning(permissionContext, Pg, hp);
        logForDebugging(
          Yd === undefined
            ? `[server-classifier] ${tool.name}: the server-side classifier does not run for this session (${xc ?? "unknown"}) and there is no local one to fall back to`
            : `[server-classifier] ${tool.name}: no server verdict for this call (${Yd}) and there is no local classifier to fall back to`,
          {
            level: "warn",
          },
        );
        if (At?.onBlock === "flag") {
          rememberClassifierBlock(
            toolUseID,
            cs
              ? {
                  kind: "refused",
                  switchedOff: true,
                }
              : {
                  kind: "unavailable",
                  model: "",
                },
          );
          return {
            behavior: "allow",
            updatedInput: checkResult.updatedInput ?? input,
            decisionReason: {
              type: "classifier",
              classifier: "auto-mode",
              reason: cs
                ? UNREVIEWED_SUBAGENT_REPORT_WARNING
                : "Delivered with a note: the classifier could not review it",
              noVerdict: true,
            },
          };
        }
        if (isAutoAllowedInMode(tool, newDenialState) === "dontAsk")
          return {
            behavior: "deny",
            decisionReason: {
              type: "mode",
              mode: "dontAsk",
            },
            message: DONT_ASK_REJECT_MESSAGE(tool.name),
          };
        if (bo) {
          logEvent("tengu_auto_mode_fallback_to_ask", {
            reason: lit_2("requires_user_interaction"),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            toolUseId: sanitizeMarkName(toolUseID),
            isMcp: tool.isMcp ?? false,
            ...q(),
          });
          return checkResult;
        }
        if (Pg && At === undefined) {
          logEvent("tengu_auto_mode_fallback_to_ask", {
            reason: lit_2(Yd === undefined ? "no_classifier_for_session" : "no_classifier_for_call"),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            toolUseId: sanitizeMarkName(toolUseID),
            isMcp: tool.isMcp ?? false,
            ...q(),
          });
          return {
            ...checkResult,
            personOnly: true,
            hooksMayAllow: false,
            defaultToNo: true,
            suppressAlwaysAllowRule: true,
            inPlaceOfClassifier: true,
            localDisplayOnly: true,
            suggestions: undefined,
            decisionReason: pickDisplayedDecisionReason(checkResult, {
              type: "other",
              reason: Yd === undefined ? NO_CHECK_FOR_SESSION_TITLE : NO_CHECK_FOR_ACTION_TITLE,
            }),
          };
        }
        let Sc = await handleServerVerdictUnavailable(
          assistantMessage.serverClassifierRequest ?? assistantMessage.message.id,
          {
            runKey: agentIdOrMain(permissionContext.agentId),
            turn: permissionContext.queryTracking?.chainId,
            signal: permissionContext.abortController.signal,
            scheduleTimeout: (dy) => {
              dy();
              return () => {};
            },
          },
        );
        if (Sc.kind === "stop") {
          if (
            Yd !== undefined &&
            (kl || noteNoServerCheck(Yd === "server_not_requested" ? "not_requested" : "not_served"))
          )
            logFeatureSad(
              "auto_mode_no_server_check",
              kl
                ? "script_calls"
                : Yd === "server_not_requested"
                  ? "not_requested"
                  : Yd === "server_results_not_held"
                    ? "results_not_held"
                    : "calls_not_named",
              {
                gatewayConfigured: gatewayDisplayName() !== undefined,
                interactive: oc,
                heldByDenyRules: hp,
                ...(cs && {
                  localClassifierSwitchedOff: true,
                }),
              },
            );
          appendAutoModeWarning(permissionContext, Pg, hp);
          let dy = Yd === undefined ? "no_classifier_for_session" : "no_classifier_for_call";
          if (permissionContext.agentId === undefined) noteNoServerCheckStoppedTurn();
          else {
            let Hx = autoModeUnavailableNotes.of(permissionContext.session.host);
            if (Hx.has(permissionContext.agentId)) Hx.set(permissionContext.agentId, dy);
          }
          return {
            ...stopTurnForMissingVerdict(tool, permissionContext, Sc.recorded, dy),
            message: `Auto mode is unavailable: ${describeAutoModeUnavailableCause(dy)}, so ${tool.name} was not run and this turn has ended. Wait for the user's next message before doing anything further.`,
          };
        }
        if (Sc.interrupted) throw new AbortError_2();
        let Hu = kl
          ? "Auto mode's safety check never sees a call made from a script, so this call is refused every time a script makes it: continue with work that doesn't need it,"
          : "Issue it again once, as-is. If it is denied the same way, don't issue it again: continue with work that doesn't need it,";
        return {
          behavior: "deny",
          decisionReason: {
            type: "classifier",
            classifier: "auto-mode",
            reason: CLASSIFIER_UNAVAILABLE_REASON,
          },
          message:
            At !== undefined
              ? `${tool.name} was not run: only auto mode's safety check can allow it, and that check gave no result. No permission prompt is raised for this tool. This is not a judgment that the action is unsafe. Continue with work that doesn't need it, then tell the user that it was not run and why.`
              : hp
                ? `${tool.name} was not run: auto mode's safety check ${Yd === undefined ? "does not run for this session" : "gave no result"}, and nobody is asked to approve it in its place, because the settings hold auto mode deny rules, which only the automatic check applies. This is not a judgment that the action is unsafe. ${Yd === undefined ? "Other actions that need the check will be denied too, and retrying won't help. Finish what you can without them, then tell the user what is blocked and why." : `${Hu} then tell the user that it was not run and why.`}`
                : Yd === undefined
                  ? `Auto mode is unavailable: its safety check does not run for this session, so ${tool.name} was not run. Other actions that need the check will be denied too, and retrying won't help. Finish what you can without them, then tell the user what is blocked and that they can switch to another permission mode.`
                  : `${tool.name} was not run: auto mode has no safety result for this call, and nobody can be asked to approve it here. This is not a judgment that it is unsafe. ${Hu} then tell the user that auto mode has no safety result for it and that they can approve it themselves in another permission mode.`,
        };
      }
      classifierResult = {
        ...classifierResult,
        reason: classifierWrittenReason(classifierResult.reason),
      };
      let li = ao && !ol && !gd && Eu === undefined ? "server" : "local";
      let nl = Su || classifierResult.errorKind === CLASSIFIER_SWITCHED_OFF_KIND;
      let Tl = {
        serverClassifierRole: fromEnum(serverClassifierRoleForCall),
        serverClassifierOffReason: fromEnumOpt(yo),
        classifiedOutsideAutoMode: fromEnumOpt(rr),
        classifierSite:
          li === "local" && classifierResult.classifierRan !== false && !nl ? lit_2("gate") : undefined,
        localUnderArbiterReason: fromEnumOpt(gd ? "input_rewritten" : ol ? "left_to_local" : Eu),
        serverClassifierConnection: fromEnumOpt(getApiRouteKind()),
        betasSwitchSetAside:
          isBetasSwitchSetAside({
            peek: true,
          }) || undefined,
      };
      if (
        ol &&
        !classifierResult.unavailable &&
        !classifierResult.transcriptTooLong &&
        !classifierResult.refusedBySafeguard
      )
        clearUnavailableStreak(agentIdOrMain(permissionContext.agentId));
      let kd;
      let na =
        classifierResult.unavailable === true &&
        classifierResult.errorKind === "server_input_rewritten" &&
        countToolCallsSince_6(assistantMessage, toolUseID) &&
        getServerClassifierFallbackMode() !== "off";
      let Ac =
        na &&
        (assistantMessage.serverClassifierOwnInputRewritten === true ||
          assistantMessage.serverClassifierInputRewrite !== undefined)
          ? quoteToolInputForClassifierMessage(tool, input, assistantMessage[inputAsWrittenSymbol])
          : undefined;
      let tp = assistantMessage.serverClassifierInputRewrite?.cause === "turn_step";
      let countTotal = Ac !== undefined && Ac.kind !== "quoted" && !tp;
      let Ef = isCountedClassifierBlock(classifierResult) || na ? _s.reached() : undefined;
      if (Ef !== undefined) {
        let now = Date.now();
        await Ef;
        kd = Date.now() - now;
      }
      {
        mode = isAutoAllowedInMode(tool, getToolPermissionContext(permissionContext));
        if (
          !(mode === yt.mode && isAutoModeActive() === yt.autoActive) &&
          !isStillAllowedAfterModeChange(mode, nt, tool, input, permissionContext)
        ) {
          logEvent("tengu_auto_mode_fallback_to_ask", {
            reason: lit_2("mode_changed_while_queued"),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            toolUseId: sanitizeMarkName(toolUseID),
            isMcp: tool.isMcp ?? false,
            ...q(),
            ...Tl,
          });
          if (mode === "dontAsk")
            return {
              behavior: "deny",
              decisionReason: {
                type: "mode",
                mode: "dontAsk",
              },
              message: DONT_ASK_REJECT_MESSAGE(tool.name),
            };
          if (getToolPermissionContext(permissionContext).shouldAvoidPermissionPrompts)
            return denyPromptUnavailable(checkResult);
          return checkResult;
        }
        let kl = Yt("ask_level_while_queued", Tl);
        if (kl) return kl;
      }
      let np = classifierResult.unavailable
        ? "unavailable"
        : classifierResult.refusedBySafeguard
          ? "refused"
          : classifierResult.shouldBlock
            ? "blocked"
            : "allowed";
      let newDenialState_3 = fallbackUsageDelta(classifierResult);
      let ap = (Es ?? 0) + (Kc?.queueWaitMs ?? 0) + (classifierResult.durationMs ?? 0) + (kd ?? 0);
      let al =
        classifierResult.errorKind === "server_call_skipped" &&
        sentExactMcpAllowRule(assistantMessage.serverClassifierResults, tool.name);
      let mf =
        ao && Nr !== undefined
          ? getRewriteLostVerdictNote(assistantMessage, noVerdictReasonFor(Nr, toolUseID))
          : undefined;
      appendAutoModeDecision(permissionContext.session, {
        tool: tool.name,
        allowlisted: false,
        decision: np,
        classifierModel: classifierResult.model,
        inputTokens: classifierResult.usage?.inputTokens,
        outputTokens: classifierResult.usage?.outputTokens,
        cacheReadInputTokens: classifierResult.usage?.cacheReadInputTokens,
        cacheCreationInputTokens: classifierResult.usage?.cacheCreationInputTokens,
        durationMs: classifierResult.durationMs,
        costUSD: newDenialState_3,
        stage: classifierResult.stage,
        category: classifierResult.category,
        stage1Severity: classifierResult.stage1Severity,
        stage2Severity: classifierResult.stage2Severity,
        originalDecisionReasonType: checkResult.decisionReason?.type,
        editClassificationGated: Vi,
        serverVerdictOverrodeFastPath: fi,
        serverHeldShellAllowFrom: reroutedFrom,
        classifierSource: li,
        ...Tl,
        serverClassifierNoVerdict: ao
          ? (noVerdictReasonFor(await fs(), toolUseID) ?? getStaleContextErrorKind(classifierResult))
          : undefined,
        totalWaitMs: ap,
      });
      let rg =
        At?.onBlock === "flag"
          ? getClassifierBlockOutcome(
              _r && classifierResult.errorKind === "server_input_rewritten"
                ? {
                    ...classifierResult,
                    errorKind: CLASSIFIER_SWITCHED_OFF_KIND,
                  }
                : classifierResult,
            )
          : undefined;
      let uh = (classifierResult) =>
        shouldPromptAfterChromeFloorBlock({
          siteGrantRouted: nt && chrome?.domainAllowed === true,
          mode,
          liveContext: getToolPermissionContext(permissionContext),
          chainOnAllow: gt,
          classifierResult,
        });
      let Kf =
        (classifierResult.shouldBlock &&
          !classifierResult.unavailable &&
          classifierResult.errorKind !== SAFETY_MONITOR_BLOCKED &&
          !classifierResult.transcriptTooLong &&
          !classifierResult.refusedBySafeguard &&
          rg === undefined &&
          !uh(classifierResult)) ||
        (na && rg === undefined && !bo && state.lastRewriteMessageId !== assistantMessage.message.id);
      let ch =
        classifierResult.shouldBlock &&
        !na &&
        isClassifierTargetToolUse(assistantMessage, toolUseID, permissionContext.clientRequestedToolUseId);
      let uS =
        ch && Kf
          ? state.consecutiveDenials - undoRewriteDenialIfRetried(state, tool.name, input).consecutiveDenials
          : 0;
      logEvent("tengu_auto_mode_decision", {
        decision: fromEnum(np),
        toolName: sanitizeToolNameForAnalytics(tool.name),
        toolUseId: sanitizeMarkName(toolUseID),
        ...false,
        isMcp: tool.isMcp ?? false,
        ...q(),
        inProtectedNamespace: isEvalBuild(),
        ...Se(),
        chromeAutomode: lt,
        chromeNavigationForced: navigation !== undefined,
        chromePointerPress,
        chromeClickRouted: Xa,
        ...yr,
        hookAllowVouch: permissionContext.hookAllowVouched === true,
        mcpAlwaysAllowOverride,
        mcpAlwaysAllowShadowedBy,
        mcpRemoteSessionAllowOverride,
        coworkWebAllowOverride,
        ..._i,
        mcpServerAskOverride: ho,
        ...getDestructiveCommandAnalytics(tool.name, input),
        stripAllBashFlag: classifyAllShellEnabled(),
        originalDecisionReasonType: fromEnumOpt(checkResult.decisionReason?.type),
        circuitBreaker: fromEnumOpt(
          findSafetyCheckReason(checkResult.decisionReason, (Ks) => Ks.circuitBreaker !== undefined)
            ?.circuitBreaker,
        ),
        editClassificationGated: Vi,
        serverVerdictOverrodeFastPath: fi,
        serverHeldShellAllowFrom: fromEnumOpt(reroutedFrom),
        agentMsgId: sanitizeMarkName(assistantMessage.message.id),
        fromTurnHandoff: assistantMessage.handedOff === true,
        sameTurnSiblings: sameTurnToolUses.length,
        inheritedVerifiedTurns: inheritedPrefix,
        classifierQueueDepth: Kc?.queueDepth,
        classifierQueueWaitMs: Kc?.queueWaitMs,
        ...(Kc?.overlap !== undefined && {
          classifierQueueOverlapEnabled: true,
          classifierQueueInFlightAtStart: Kc.overlap.inFlightAtStart,
          classifierQueueOverlapped: Kc.overlap.overlapped,
          classifierQueueReleasedByEscalation: Kc.overlap.releasedByEscalation,
          classifierQueueCommitWaitMs: kd,
        }),
        classifierSource: fromEnum(li),
        ...Tl,
        ...(isCcsTenant() && {
          sessionAutoClassifierActive: So,
        }),
        serverClassifierNoVerdict: ao
          ? fromEnumOpt(
              noVerdictReasonFor(await fs(), toolUseID) ?? getStaleContextErrorKind(classifierResult),
            )
          : undefined,
        serverRewriteCause: fromEnumOpt(
          mf && (assistantMessage.serverClassifierInputRewrite?.cause ?? mf.cause),
        ),
        serverRewriteLostVerdict: fromEnumOpt(mf?.lostVerdict),
        skippedOnAllowRule: al,
        serverRewriteSource: fromEnumOpt(assistantMessage.serverClassifierInputRewrite?.source),
        serverRewriteByLocalCode: assistantMessage.serverClassifierInputRewrite?.byLocalCode,
        serverRewriteShape: fromEnumOpt(assistantMessage.serverClassifierInputRewrite?.shape),
        serverRewriteKeptVerdict:
          assistantMessage.serverClassifierInputRewrite === undefined
            ? undefined
            : assistantMessage.serverClassifierInputRewrite.keptVerdict && !na,
        serverRewriteUnquoted: Ac === undefined || Ac.kind === "quoted" ? undefined : fromEnum(Ac.kind),
        classifierTotalWaitMs: ap,
        classifierModel: telemetrySafeModelName(classifierResult.model),
        classifierCategory: sanitizeRuleCategoryOrUndefined(classifierResult.category),
        classifierStage1Severity: classifierResult.stage1Severity,
        classifierStage2Severity: classifierResult.stage2Severity,
        ...(classifierResult.remoteBrowserRule !== undefined && {
          classifierRemoteBrowserRule: true,
        }),
        consecutiveDenials: classifierResult.shouldBlock ? state.consecutiveDenials - uS + (Kf ? 1 : 0) : 0,
        totalDenials: state.totalDenials + ((Kf && !na) || countTotal ? 1 : 0),
        classifierInputTokens: classifierResult.usage?.inputTokens,
        classifierOutputTokens: classifierResult.usage?.outputTokens,
        classifierCacheReadInputTokens: classifierResult.usage?.cacheReadInputTokens,
        classifierCacheCreationInputTokens: classifierResult.usage?.cacheCreationInputTokens,
        classifierDurationMs: classifierResult.durationMs,
        classifierSystemPromptLength: classifierResult.promptLengths?.systemPrompt,
        classifierToolCallsLength: classifierResult.promptLengths?.toolCalls,
        classifierUserPromptsLength: classifierResult.promptLengths?.userPrompts,
        sessionInputTokens: getTotalInputTokens(),
        sessionOutputTokens: getTotalOutputTokens(),
        sessionCacheReadInputTokens: getTotalCacheReadInputTokens(),
        sessionCacheCreationInputTokens: getTotalCacheCreationInputTokens(),
        classifierCostUSD: newDenialState_3,
        classifierStage: fromEnumOpt(classifierResult.stage),
        classifierFailureMode: fromEnumOpt(classifierResult.failureMode),
        classifierStage1InputTokens: classifierResult.stage1Usage?.inputTokens,
        classifierStage1OutputTokens: classifierResult.stage1Usage?.outputTokens,
        classifierStage1CacheReadInputTokens: classifierResult.stage1Usage?.cacheReadInputTokens,
        classifierStage1CacheCreationInputTokens: classifierResult.stage1Usage?.cacheCreationInputTokens,
        classifierStage1DurationMs: classifierResult.stage1DurationMs,
        classifierStage1RequestId: sanitizeMarkName(classifierResult.stage1RequestId),
        classifierStage1MsgId: sanitizeMarkName(classifierResult.stage1MsgId),
        classifierStage1CostUSD:
          classifierResult.stage1Usage && classifierResult.model
            ? calculateCostFromTokenCounts(classifierResult.model, classifierResult.stage1Usage)
            : undefined,
        classifierStage2InputTokens: classifierResult.stage2Usage?.inputTokens,
        classifierStage2OutputTokens: classifierResult.stage2Usage?.outputTokens,
        classifierStage2CacheReadInputTokens: classifierResult.stage2Usage?.cacheReadInputTokens,
        classifierStage2CacheCreationInputTokens: classifierResult.stage2Usage?.cacheCreationInputTokens,
        classifierStage2DurationMs: classifierResult.stage2DurationMs,
        classifierStage2RequestId: sanitizeMarkName(classifierResult.stage2RequestId),
        classifierStage2MsgId: sanitizeMarkName(classifierResult.stage2MsgId),
        classifierStage2CostUSD:
          classifierResult.stage2Usage && classifierResult.model
            ? calculateCostFromTokenCounts(classifierResult.model, classifierResult.stage2Usage)
            : undefined,
      });
      if (ko) {
        let Ks = noVerdictReasonFor(await fs(), toolUseID) ?? getStaleContextErrorKind(classifierResult);
        if (Ks === undefined) logFeatureOk("auto_mode_floor_server_check");
        else logFeatureSad("auto_mode_floor_server_check", Ks);
      }
      if (At !== undefined && classifierResult.classifierRan === false) {
        logForDebugging(
          `${tool.name} declares classifierOnly() but serialized to an empty classifier action; denying`,
          {
            level: "error",
          },
        );
        return {
          behavior: "deny",
          decisionReason: {
            type: "classifier",
            classifier: "auto-mode",
            reason: classifierResult.reason,
            noVerdict: true,
          },
          message: `${tool.name} was not reviewed: it gave the auto mode classifier nothing to judge (its toAutoClassifierInput is empty), and only the classifier can allow it. This is a tool bug, not a judgment on the action.`,
        };
      }
      if (rg !== undefined) {
        rememberClassifierBlock(toolUseID, rg);
        logForDebugging(
          `Auto mode classifier gave no verdict for ${tool.name} (${rg.kind}); delivering flagged`,
          {
            level: "warn",
          },
        );
        return {
          behavior: "allow",
          updatedInput: checkResult.updatedInput ?? input,
          decisionReason: {
            type: "classifier",
            classifier: "auto-mode",
            reason:
              rg.kind === "refused"
                ? rg.switchedOff
                  ? UNREVIEWED_SUBAGENT_REPORT_WARNING
                  : "Delivered with a warning: the classifier request was refused by the safety safeguard"
                : "Delivered with a note: the classifier could not review it",
            noVerdict: true,
          },
        };
      }
      if (classifierResult.shouldBlock) {
        if (classifierResult.transcriptTooLong) {
          let Gc = classifierResult.errorKind === SERVER_CALL_UNAVAILABLE_INPUT_TOO_LONG;
          let oc = At !== undefined && !toolPermissionContext.shouldAvoidPermissionPrompts;
          let hp = !Gc && !We && !tool.mcpInfo && ((tool.name === AGENT && true) || false);
          let Pg = oc ? "classifier_only_deny" : hp ? "allow" : bo ? "question_dialog" : "deny";
          let Sc = isMerryPopcornOn()
            ? requestDenialCompact(permissionContext, permissionContext.messages, {
                toolName: tool.name,
                denied:
                  (Pg === "deny" || Pg === "classifier_only_deny") &&
                  permissionContext.permissionRound !== undefined,
                mode: toolPermissionContext.mode,
              })
            : undefined;
          let Hu = Sc !== undefined;
          if (Sc === "requested")
            logEvent("tengu_auto_mode_classifier_overflow_compact", {
              stage: lit_2("requested"),
              arm: fromEnum(Pg),
              toolName: sanitizeToolNameForAnalytics(tool.name),
              isMcp: tool.isMcp ?? false,
              isSubagent: permissionContext.agentId !== undefined,
              headless: toolPermissionContext.shouldAvoidPermissionPrompts === true,
              serverPath: ao && !ol,
              serverInputTooLong: Gc,
            });
          if (!Gc || Hu) {
            if (oc) {
              logForDebugging(
                `Auto mode classifier transcript too long for ${tool.name}, denying (classifierOnly: no prompt fallback)`,
                {
                  level: "warn",
                },
              );
              return {
                behavior: "deny",
                decisionReason: {
                  type: "classifier",
                  classifier: "auto-mode",
                  reason: CLASSIFIER_TRANSCRIPT_TOO_LONG_REASON,
                  noVerdict: true,
                },
                message: Hu
                  ? `${tool.name} was not reviewed and did not run: the conversation is too long for auto mode's classifier, and no permission prompt is raised for this tool. This is not a judgment that the action is unsafe. Claude Code will try to compact the conversation before the next request; if this action is still needed after that, issue it again.`
                  : `${tool.name} was not reviewed: the auto mode classifier transcript exceeded its context window, and no permission prompt is raised for this tool. This is not a judgment that the action is unsafe; the same call will hit the same limit until the conversation is shorter.`,
              };
            }
            if (hp)
              return {
                behavior: "allow",
                updatedInput: input,
                decisionReason: {
                  type: "mode",
                  mode: "auto",
                },
              };
            if (bo) {
              logForDebugging(
                "Auto mode classifier transcript too long for AskUserQuestion, falling back to the question dialog",
                {
                  level: "warn",
                },
              );
              logEvent("tengu_auto_mode_fallback_to_ask", {
                reason: lit_2("requires_user_interaction"),
                toolName: sanitizeToolNameForAnalytics(tool.name),
                toolUseId: sanitizeMarkName(toolUseID),
                isMcp: tool.isMcp ?? false,
                ...q(),
              });
              return checkResult;
            }
            if (Hu) {
              logForDebugging(
                `Auto mode classifier transcript too long for ${tool.name}, denying and compacting before the next request`,
                {
                  level: "warn",
                },
              );
              return {
                behavior: "deny",
                decisionReason: {
                  type: "classifier",
                  classifier: "auto-mode",
                  reason: CLASSIFIER_TOO_LONG_COMPACTING_REASON,
                  noVerdict: true,
                },
                message: `${tool.name} was not reviewed and did not run: the conversation is too long for auto mode's classifier. Claude Code will try to compact the conversation before the next request; if this action is still needed after that, issue it again and it will be reviewed normally.`,
              };
            }
            if (toolPermissionContext.shouldAvoidPermissionPrompts)
              throw new AbortError_2(
                "Agent aborted: auto mode classifier transcript exceeded context window in headless mode",
              );
            logForDebugging(
              "Auto mode classifier transcript too long, falling back to normal permission handling",
              {
                level: "warn",
              },
            );
            logEvent("tengu_auto_mode_fallback_to_ask", {
              reason: lit_2("transcript_too_long"),
              toolName: sanitizeToolNameForAnalytics(tool.name),
              toolUseId: sanitizeMarkName(toolUseID),
              isMcp: tool.isMcp ?? false,
              ...q(),
            });
            if (mode === "dontAsk")
              return {
                behavior: "deny",
                decisionReason: {
                  type: "mode",
                  mode: "dontAsk",
                },
                message: DONT_ASK_REJECT_MESSAGE(tool.name),
              };
            return {
              ...checkResult,
              decisionReason: pickDisplayedDecisionReason(checkResult, {
                type: "other",
                reason: CLASSIFIER_TRANSCRIPT_TOO_LONG_REASON,
              }),
            };
          }
        }
        let Ks =
          classifierResult.errorKind === SAFETY_MONITOR_BLOCKED && !classifierResult.refusedBySafeguard;
        if (classifierResult.unavailable || Ks) {
          if (bo && !Ks) {
            logForDebugging(
              "Auto mode classifier unavailable for AskUserQuestion, falling back to the question dialog",
              {
                level: "warn",
              },
            );
            logEvent("tengu_auto_mode_fallback_to_ask", {
              reason: lit_2("requires_user_interaction"),
              toolName: sanitizeToolNameForAnalytics(tool.name),
              toolUseId: sanitizeMarkName(toolUseID),
              isMcp: tool.isMcp ?? false,
              ...q(),
            });
            return checkResult;
          }
          if (na) {
            let oc = {
              behavior: "deny",
              decisionReason: {
                type: "classifier",
                classifier: "auto-mode",
                reason: CLASSIFIER_UNAVAILABLE_REASON,
              },
              message: buildClassifierUnavailableMessage(
                tool.name,
                classifierResult.model,
                classifierResult.httpStatus,
                classifierResult.errorKind,
                classifierResult.retryAfterMs,
                assistantMessage.handedOff === true,
                undefined,
                false,
                alwaysFullClassifierRole(permissionContext),
                {
                  quote: Ac,
                  recorded: tp,
                },
              ),
            };
            let state = updateDenialTrackingState(permissionContext, (state) =>
              recordRewriteDenial(
                state,
                assistantMessage.message.id,
                Ac?.kind === "quoted" || state.lastRewriteMessageId !== assistantMessage.message.id
                  ? fingerprintToolCall(tool.name, Ac?.kind === "quoted" ? Ac.input : input)
                  : state.lastRewriteFingerprint,
                countTotal,
              ),
            );
            let Pg =
              At !== undefined && !toolPermissionContext.shouldAvoidPermissionPrompts
                ? null
                : handleDenialLimitExceeded(
                    state,
                    HOOK_REWROTE_INPUT_REVIEW_REASON,
                    assistantMessage,
                    toolUseID,
                    tool,
                    checkResult,
                    permissionContext,
                    isAutoClassifierActive(mode),
                    {
                      ...oc,
                      decideLocation: "pre-ask",
                    },
                  );
            if (Pg) {
              if (mode === "dontAsk")
                return {
                  behavior: "deny",
                  decisionReason: {
                    type: "mode",
                    mode: "dontAsk",
                  },
                  message: DONT_ASK_REJECT_MESSAGE(tool.name),
                };
              return Pg;
            }
            if (Ac?.kind === "quoted")
              recordPromptedToolCall({
                agentId: permissionContext.agentId,
                tool: tool.name,
                input: Ac.input,
                message: assistantMessage,
              });
            return oc;
          }
          if (
            (ko || (!So && classifierResult.errorKind === CLASSIFIER_SWITCHED_OFF_KIND)) &&
            (!ol || classifierResult.errorKind === CLASSIFIER_SWITCHED_OFF_KIND) &&
            !gd &&
            !Ks
          ) {
            if (al) noteRefusedMcpSkip(tool.name);
            let oc =
              mode === "dontAsk"
                ? "the permission mode is don't ask"
                : At !== undefined
                  ? "no prompt can approve this tool"
                  : hasCustomAutoModeDenyRules()
                    ? "the settings hold auto mode deny rules, which only the automatic check applies"
                    : getIsNonInteractiveSession() || gt
                      ? "an app or a script runs this session, so a program might answer the prompt"
                      : permissionContext.options.isNonInteractiveSession
                        ? "a background agent or a teammate made the call, so the prompt might not be seen"
                        : getToolPermissionContext(permissionContext).shouldAvoidPermissionPrompts
                          ? "this session shows no prompts"
                          : isUnattendedInteractiveSession()
                            ? "Remote Control is connected, or the session runs in the background or in a teammate's pane, so the prompt might not be seen"
                            : undefined;
            if (oc !== undefined) {
              logForDebugging(
                `[server-classifier] ${tool.name}: no server verdict for this call outside auto mode (${classifierResult.errorKind ?? "unknown kind"}); nobody is asked here, denying`,
                {
                  level: "warn",
                },
              );
              return denyPromptUnavailable(
                checkResult,
                `${tool.name} did not run. The automatic safety check gave no verdict on this call, and Claude Code doesn't ask for approval in its place here: ${oc}. This is not a judgment that the action is unsafe, and a later call may get a verdict. Don't retry it now. Continue with work that doesn't need it, and tell the user that ${tool.name} could not be approved here.`,
              );
            }
            logForDebugging(
              `[server-classifier] ${tool.name}: no server verdict for this call outside auto mode (${classifierResult.errorKind ?? "unknown kind"}); asking the person`,
              {
                level: "warn",
              },
            );
            logEvent("tengu_auto_mode_fallback_to_ask", {
              reason:
                classifierResult.errorKind === CLASSIFIER_SWITCHED_OFF_KIND
                  ? lit_2("floor_local_classifier_switched_off")
                  : lit_2("floor_no_server_verdict"),
              toolName: sanitizeToolNameForAnalytics(tool.name),
              toolUseId: sanitizeMarkName(toolUseID),
              isMcp: tool.isMcp ?? false,
              ...q(),
            });
            return {
              ...checkResult,
              personOnly: true,
              hooksMayAllow: false,
              defaultToNo: true,
              suppressAlwaysAllowRule: true,
              inPlaceOfClassifier: true,
              suggestions: undefined,
              localDisplayOnly: true,
              decisionReason: pickDisplayedDecisionReason(checkResult, {
                type: "other",
                reason: UNREVIEWED_ACTION_NOTICE,
              }),
            };
          }
          let serverClassifierRequest = assistantMessage.serverClassifierRequest;
          if (
            ao &&
            !ko &&
            !ol &&
            !Ks &&
            serverClassifierRequest !== undefined &&
            isServerUnavailableReason(classifierResult.errorKind, (await fs()).kind === "per_call")
          ) {
            let oc = await waitForServerClassifierRetry(
              serverClassifierRequest,
              permissionContext,
              w,
              toolUseID,
              rs,
            );
            if (oc.kind === "stop")
              return stopTurnForMissingVerdict(tool, permissionContext, oc.recorded, "no_verdict");
            if (oc.interrupted) throw new AbortError_2();
          }
          logForDebugging(
            classifierResult.retryAfterMs === undefined
              ? "Auto mode classifier unavailable, denying with retry guidance (fail closed)"
              : "Auto mode classifier told to wait by the API, denying (fail closed)",
            {
              level: "warn",
            },
          );
          if (al) noteRefusedMcpSkip(tool.name);
          return {
            behavior: "deny",
            decisionReason: {
              type: "classifier",
              classifier: "auto-mode",
              reason: CLASSIFIER_UNAVAILABLE_REASON,
              ...false,
            },
            message: buildClassifierUnavailableMessage(
              tool.name,
              classifierResult.model,
              classifierResult.httpStatus,
              classifierResult.errorKind,
              classifierResult.retryAfterMs,
              assistantMessage.handedOff === true,
              Uc,
              al,
              alwaysFullClassifierRole(permissionContext),
            ),
          };
        }
        if (classifierResult.refusedBySafeguard) {
          if (toolPermissionContext.shouldAvoidPermissionPrompts)
            throw new AbortError_2(
              "Agent aborted: auto mode classifier request refused by the safety safeguard in headless mode",
            );
          logForDebugging(
            "Auto mode classifier request refused by the safety safeguard, denying (exempt from the denial counter)",
            {
              level: "warn",
            },
          );
          return {
            behavior: "deny",
            decisionReason: {
              type: "classifier",
              classifier: "auto-mode",
              reason: classifierResult.reason,
              noVerdict: true,
            },
            message: buildClassifierRefusedOrTransientGuidance(classifierResult.reason, {
              refused: true,
              callerHasReadTools: alwaysFullClassifierRole(permissionContext),
            }),
          };
        }
        if (uh(classifierResult)) {
          logEvent("tengu_auto_mode_fallback_to_ask", {
            reason: lit_2("chrome_floor_block"),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            toolUseId: sanitizeMarkName(toolUseID),
            isMcp: tool.isMcp ?? false,
            ...q(),
          });
          logFeatureOk("permission_chrome_block_prompt");
          return {
            ...checkResult,
            personOnly: true,
            hooksMayAllow: false,
            defaultToNo: true,
            suppressAlwaysAllowRule: true,
            decisionReason: pickDisplayedDecisionReason(checkResult, {
              type: "classifier",
              classifier: "auto-mode",
              reason: classifierResult.reason,
            }),
          };
        }
        let state = updateDenialTrackingState(permissionContext, (state) =>
          incrementDenialCounts(ch ? undoRewriteDenialIfRetried(state, tool.name, input) : state),
        );
        logForDebugging(`Auto mode classifier blocked action: ${classifierResult.reason}`, {
          level: "warn",
        });
        if (At?.onBlock === "flag") {
          rememberClassifierBlock(toolUseID, {
            kind: "blocked",
            reason: classifierResult.reason,
          });
          return {
            behavior: "allow",
            updatedInput: checkResult.updatedInput ?? input,
            decisionReason: {
              type: "classifier",
              classifier: "auto-mode",
              reason: `Flagged by the classifier, delivered with its warning: ${classifierResult.reason}`,
            },
          };
        }
        let classifierDenyResult = buildClassifierDenyResult(
          classifierResult,
          permissionContext,
          tool,
          input,
          checkResult,
        );
        let Ip =
          bo || (At !== undefined && !toolPermissionContext.shouldAvoidPermissionPrompts)
            ? null
            : handleDenialLimitExceeded(
                state,
                classifierResult.reason,
                assistantMessage,
                toolUseID,
                tool,
                checkResult,
                permissionContext,
                isAutoClassifierActive(mode),
                {
                  ...classifierDenyResult,
                  decideLocation: "pre-ask",
                },
              );
        if (Ip) {
          if (mode === "dontAsk")
            return {
              behavior: "deny",
              decisionReason: {
                type: "mode",
                mode: "dontAsk",
              },
              message: DONT_ASK_REJECT_MESSAGE(tool.name),
            };
          return Ip;
        }
        return classifierDenyResult;
      }
      if (
        (!bo && !Vr && !Oo && !Xa) ||
        !canShowServerFallbackNotice(permissionContext.requestDialog !== undefined)
      )
        _s.runInTurn(() => updateDenialTrackingState(permissionContext, resetConsecutiveDenials));
      if (bo) {
        logEvent("tengu_auto_mode_fallback_to_ask", {
          reason: lit_2("requires_user_interaction"),
          toolName: sanitizeToolNameForAnalytics(tool.name),
          toolUseId: sanitizeMarkName(toolUseID),
          isMcp: tool.isMcp ?? false,
          ...q(),
        });
        return checkResult;
      }
      return It({
        updatedInput: checkResult.updatedInput ?? input,
        decisionReason: {
          type: "classifier",
          classifier: "auto-mode",
          reason: classifierResult.reason,
        },
        classifierRan: classifierResult.classifierRan,
      });
    }
    let Et =
      isSdkDialogHostActive() &&
      getPermissionPromptPerson() !== null &&
      permissionContext.requestDialog !== undefined &&
      permissionContext.asksNoHost !== true &&
      !toolPermissionContext.shouldAvoidPermissionPrompts &&
      toolPermissionContext.servedCall !== true;
    if (
      mode === "bypassPermissions" &&
      !carriesAskRuleIntent(checkResult) &&
      (canShowSafetyCheckDialog(permissionContext) || Et)
    ) {
      let safetyCheckReason = findSafetyCheckReason(checkResult.decisionReason, isAutoModeDenyCircuitBreaker);
      let gt = safetyCheckReason !== undefined ? getDangerousRmTimeoutConfig() : undefined;
      if (safetyCheckReason !== undefined && gt?.enabled && (gt.denyOnHostCard || !Et)) {
        let At = applySafetyCheckDialogPolicy(checkResult, safetyCheckReason, permissionContext, gt);
        return Et && At.behavior === "deny"
          ? resolveAskWithoutPrompt(
              answers,
              tool,
              input,
              {
                ...checkResult,
                refusal: At,
              },
              toolUseID,
              permissionContext,
            )
          : At;
      }
    }
    return resolveAskWithoutPrompt(answers, tool, input, checkResult, toolUseID, permissionContext);
  }
  return checkResult;
};
//@ chunk-e6aww6q8.js:3008254-3008352 placement
/**
 * 分类器拦截是否计入拒绝次数：shouldBlock 且不是不可用、转录过长或被安全拦截。
 */
function isCountedClassifierBlock(e) {
  return e.shouldBlock && !e.unavailable && !e.transcriptTooLong && !e.refusedBySafeguard;
}
//@ chunk-e6aww6q8.js:3008352-3008503 placement
/**
 * 分类器结论是否可用：分类器确实运行、非不可用/转录过长/被安全拦截，且没有 failureMode 与 errorKind。
 */
function isClassifierVerdictUsable(e) {
  return (
    e.classifierRan !== false &&
    !e.unavailable &&
    !e.transcriptTooLong &&
    !e.refusedBySafeguard &&
    e.failureMode === undefined &&
    e.errorKind === undefined
  );
}
//@ chunk-e6aww6q8.js:3008503-3008876 placement
/**
 * Chrome 地板拦截后是否改为弹窗：站点授权路由、模式为 default/acceptEdits 且未变、SDK stdio 宿主、无链式 allow、可弹窗、分类器结论可用且类别命中 Chrome 地板集合，并且不是远程会话、chromeFloorBlockPrompts 未关闭。
 */
function shouldPromptAfterChromeFloorBlock({
  siteGrantRouted,
  mode,
  liveContext,
  chainOnAllow,
  classifierResult,
}) {
  let policySettingsOrigin = getPolicySettingsOrigin();
  return (
    siteGrantRouted &&
    (mode === "default" || mode === "acceptEdits") &&
    liveContext.mode === mode &&
    isSdkDialogHostActive() &&
    getPermissionPromptToolName() === "stdio" &&
    !chainOnAllow &&
    !liveContext.shouldAvoidPermissionPrompts &&
    isClassifierVerdictUsable(classifierResult) &&
    (classifierResult.model === SERVER_CLASSIFIER_LABEL
      ? isCopperTrellisOn() &&
        ALL_AUTO_MODE_RULE_ID_SET_WITH_UNTRUSTED.has(ruleIdFromBracketPrefix(classifierResult.reason) ?? "")
      : classifierResult.category !== undefined &&
        ALL_AUTO_MODE_RULE_ID_SET.has(classifierResult.category)) &&
    !isAdminPolicyOrigin(policySettingsOrigin) &&
    policySettingsOrigin !== "remote" &&
    getAutoModeConfigOrDefault().chromeFloorBlockPrompts !== false
  );
}
//@ chunk-e6aww6q8.js:3008876-3008928 placement
function recordAutoModeDenial(toolUseContext) {
  let n = incrementDenialCounts(getDenialTrackingState(toolUseContext));
  persistDenialState(toolUseContext, n);
  return n;
}
//@ chunk-e6aww6q8.js:3008928-3009537 placement
/**
 * auto 拒绝超限处理：未超限返回 false；超限上报 tengu_auto_mode_denial_limit_exceeded；headless 直接抛 AbortError；累计超限时清零计数；返回 true 表示回退人工。
 */
function enforceAutoModeDenialLimits(toolUseContext, state, tool, messageId, toolUseId) {
  if (!shouldFallbackToPrompting(state)) return false;
  let y = state.totalDenials >= DENIAL_LIMITS.maxTotal;
  let shouldAvoidPermissionPrompts = getToolPermissionContext(toolUseContext).shouldAvoidPermissionPrompts;
  logEvent("tengu_auto_mode_denial_limit_exceeded", {
    limit: lit_2(y ? "total" : "consecutive"),
    mode: lit_2(shouldAvoidPermissionPrompts ? "headless" : "cli"),
    messageID: sanitizeMarkName(messageId),
    consecutiveDenials: state.consecutiveDenials,
    totalDenials: state.totalDenials,
    toolName: sanitizeToolNameForAnalytics(tool.name),
    toolUseId: sanitizeMarkName(toolUseId),
    isMcp: tool.isMcp ?? false,
  });
  if (shouldAvoidPermissionPrompts)
    throw new AbortError_2("Agent aborted: too many classifier denials in headless mode");
  if (y)
    persistDenialState(toolUseContext, {
      ...state,
      totalDenials: 0,
      consecutiveDenials: 0,
      timedFallbackShown: undefined,
      lastRewriteMessageId: undefined,
      lastRewriteFingerprint: undefined,
      rewriteDenials: undefined,
    });
  return true;
}
//@ chunk-e6aww6q8.js:3009537-3009605 placement = recordSuccess (1)
/**
 * 工具调用放行后，若有连续拒绝则在上下文/AppState 中清零。
 */
function recordAutoModeSuccess(context) {
  let state = getDenialTrackingState(context);
  if (state.consecutiveDenials > 0) persistDenialState(context, resetConsecutiveDenials(state));
}
//@ chunk-e6aww6q8.js:3009605-3009689 placement = persistDenialState (0.756)
function getDenialTrackingState(context) {
  return context.localDenialTracking ?? context.getAppState().denialTracking ?? createDenialTrackingState();
}
//@ chunk-e6aww6q8.js:3009689-3009861 fingerprint = persistDenialState (1)
/**
 * 写入拒绝跟踪状态（子代理写 localDenialTracking，否则写 AppState）。
 */
function persistDenialState(context, newState) {
  if (context.localDenialTracking) Object.assign(context.localDenialTracking, newState);
  else
    context.setAppState((prev) => {
      if (prev.denialTracking === newState) return prev;
      return {
        ...prev,
        denialTracking: newState,
      };
    });
}
//@ chunk-e6aww6q8.js:3009861-3010723 layout
function buildClassifierDenyResult(e, permissionContext, tool, s, checkResult) {
  let y = e.failureMode !== undefined;
  let S = sanitizeRuleCategory(
    e.model === SERVER_CLASSIFIER_LABEL && !y ? ruleIdFromBracketPrefix(e.reason) : e.category,
  );
  let w =
    checkResult !== undefined &&
    !carriesAskRuleIntent(checkResult) &&
    checkResult.decisionReason?.type !== "hook" &&
    checkResult.decisionReason?.type !== "sandboxOverride" &&
    findSafetyCheckReason(checkResult.decisionReason) === undefined &&
    tool.requiresUserInteraction?.() !== true &&
    checkResult.suppressAlwaysAllowRule !== true &&
    tool.suppressesAlwaysAllowRule?.(s) !== true &&
    tool.suppressesAllPermissionUpdates?.(s) !== true &&
    permissionContext.forRemoteExecution !== true &&
    !isHookOrPluginSteered(permissionContext) &&
    !isWebToolRestrictedInRelay(tool.name) &&
    !isWebToolClassifierRouted(tool, getToolPermissionContext(permissionContext)) &&
    !isRemoteBrowserToolUnderModeFloor(tool) &&
    tool.ignoresWholeToolAllowRule?.(s) !== true &&
    getClassifiableBrowserAction(
      tool,
      s,
      isAutoAllowedInMode(tool, getToolPermissionContext(permissionContext)),
    ) === undefined &&
    !isAgentSpawningTool(tool.name);
  return {
    behavior: "deny",
    decisionReason: {
      type: "classifier",
      classifier: "auto-mode",
      reason: e.reason,
      ...(y && {
        noVerdict: y,
      }),
      ...(S !== undefined && {
        category: S,
      }),
    },
    message: y
      ? buildClassifierRefusedOrTransientGuidance(e.reason, {
          refused: false,
          callerHasReadTools: alwaysFullClassifierRole(permissionContext),
        })
      : buildYoloRejectionMessage(e.reason, {
          autoModeConsentFlow: isAutoModeConsentFlowEnabled(permissionContext.agentId),
          blockedHelp: autoModeBlockedHelp(permissionContext.agentId),
          allowRuleToolName: w ? toAllowRuleToolName(getToolNameForPermissionCheck_2(tool)) : undefined,
        }),
  };
}
//@ chunk-e6aww6q8.js:3010723-3010815 layout
function canShowPermissionDialog(e) {
  return (
    e.requestDialog !== undefined &&
    !isSdkDialogHostActive() &&
    !getToolPermissionContext(e).shouldAvoidPermissionPrompts
  );
}
//@ chunk-e6aww6q8.js:3010815-3010854 layout
function canShowSafetyCheckDialog(toolUseContext) {
  return canShowPermissionDialog(toolUseContext) && !isUnattendedAgentContext(toolUseContext);
}
//@ chunk-e6aww6q8.js:3010854-3011046 placement
/**
 * 从 subcommandResults 中取出原因与给定原因相同的那个子命令 ask 的消息，否则用结果自身消息。
 */
function flaggedPartMessage(e, n) {
  if (e.decisionReason?.type === "subcommandResults") {
    for (let reason of e.decisionReason.reasons.values())
      if (reason.behavior === "ask" && reason.decisionReason === n) return reason.message;
  }
  return e.message;
}
//@ chunk-e6aww6q8.js:3011046-3011546 layout
function applySafetyCheckDialogPolicy(checkResult, safetyCheckReason, permissionContext, s) {
  let h = (unansweredSafetyCheckCount) => ({
    behavior: "deny",
    message: buildDangerousRemovalDenial(
      flaggedPartMessage(checkResult, safetyCheckReason),
      unansweredSafetyCheckCount,
    ),
    decisionReason: safetyCheckReason,
    decideLocation: "pre-ask",
  });
  if (!s.showDialog || !canShowSafetyCheckDialog(permissionContext)) return h();
  let unansweredSafetyCheckCount = getUnansweredSafetyCheckCount();
  if (s.maxDialogTimeouts > 0 && unansweredSafetyCheckCount >= s.maxDialogTimeouts) {
    logEvent("tengu_safety_check_dialog_capped", {
      permissionMode: fromEnum(getToolPermissionContext(permissionContext).mode),
      circuitBreaker: fromEnumOpt(
        safetyCheckReason.type === "safetyCheck" ? safetyCheckReason.circuitBreaker : undefined,
      ),
      unansweredPrompts: unansweredSafetyCheckCount,
      maxDialogTimeouts: s.maxDialogTimeouts,
    });
    return h(unansweredSafetyCheckCount);
  }
  return {
    ...checkResult,
    autoDenyWindow: buildAutoDenyMarker({
      autoDenyAfterMs: s.timeoutMs,
      resolution: h(),
    }),
  };
}
//@ chunk-e6aww6q8.js:3011546-3012163 layout
async function waitForServerClassifierRetry(toolUseId, permissionContext, r, toolUseID, h) {
  markClassifierChecking(r, toolUseID);
  let y = h.hold();
  try {
    return await handleServerVerdictUnavailable(toolUseId, {
      runKey: agentIdOrMain(permissionContext.agentId),
      turnNow: permissionContext.queryTracking?.chainId,
      signal: permissionContext.abortController.signal,
      scheduleTimeout: permissionContext.scheduleTimeout,
      onWait: (S) => {
        if (S === null) {
          permissionContext.onRetryStatus?.(null);
          return;
        }
        logForDebugging(
          `[server-classifier] no usable verdict for ${S.position} response(s) in a row; holding this response's denials ${S.delayMs}ms before the model may retry (${S.position}/${S.limit})`,
          {
            level: "warn",
          },
        );
        permissionContext.onRetryStatus?.({
          kind: "auto_mode_unavailable",
          attempt: S.position,
          maxRetries: S.limit,
          retryInMs: S.delayMs,
          deadline: Date.now() + S.delayMs,
        });
      },
    });
  } finally {
    y();
    clearClassifierChecking(r, toolUseID);
  }
}
//@ chunk-e6aww6q8.js:3012163-3012579 layout
function stopTurnForMissingVerdict(tool, permissionContext, recorded, s) {
  if (recorded) {
    let h = permissionContext.agentId !== undefined;
    logEvent("tengu_auto_mode_unavailable_stop", {
      reason: fromEnum(s),
      isSubagent: h,
      gatewayConfigured: gatewayDisplayName() !== undefined,
    });
    logForDebugging(
      `[server-classifier] no usable verdict for ${TIMER_MARGIN_MS} responses in a row; stopping the ${h ? "agent's run" : "turn"}`,
      {
        level: "warn",
      },
    );
  }
  return {
    behavior: "deny",
    decisionReason: {
      type: "classifier",
      classifier: "auto-mode",
      reason: AUTO_MODE_UNAVAILABLE_STOP_REASON,
      noVerdict: true,
    },
    message: buildTurnEndedUnavailableMessage(tool.name),
    endsTurn: true,
  };
}
//@ chunk-e6aww6q8.js:3012579-3014177 fingerprint = handleDenialLimitExceeded (0.771)
/**
 * 拒绝超限（连续 3/累计 20）：headless 直接抛 AbortError；否则记日志，累计超限时清零计数，返回带 denialLimitFallback（可限时自动拒绝）的 ask 结果让人工审阅。
 */
function handleDenialLimitExceeded(
  state,
  latestReason,
  assistantMessage,
  toolUseID,
  tool,
  askResult,
  context,
  isAutoMode,
  classifierResult,
) {
  if (!shouldFallbackToPrompting(state)) return null;
  let hitTotalLimit = state.totalDenials >= DENIAL_LIMITS.maxTotal;
  let isHeadless = getToolPermissionContext(context).shouldAvoidPermissionPrompts;
  let { totalDenials, consecutiveDenials } = state;
  let ke = canShowServerFallbackNotice(context.requestDialog !== undefined);
  let we = context.requestDialog !== undefined && !isSdkDialogHostActive();
  let Ee =
    ke &&
    !hitTotalLimit &&
    isAutoMode &&
    we &&
    !isUnattendedAgentContext(context) &&
    hasAccessToIDEExtensionDiffFeature_3(currentMcpClients(context)) === undefined &&
    consecutiveDenials >= DENIAL_LIMITS.maxConsecutive &&
    (state.timedFallbackShown !== true || false);
  let warning = hitTotalLimit
    ? `${totalDenials} actions were blocked this session. Please review the transcript before continuing.`
    : `${consecutiveDenials} consecutive actions were blocked. Please review the transcript before continuing.`;
  logEvent("tengu_auto_mode_denial_limit_exceeded", {
    limit: lit_2(hitTotalLimit ? "total" : "consecutive"),
    fallbackShape: lit_2(Ee ? "timed" : ke && we ? "blocking" : "legacy"),
    mode: lit_2(isHeadless ? "headless" : "cli"),
    messageID: sanitizeMarkName(assistantMessage.message.id),
    consecutiveDenials,
    totalDenials,
    toolName: sanitizeToolNameForAnalytics(tool.name),
    toolUseId: sanitizeMarkName(toolUseID),
    isMcp: tool.isMcp ?? false,
  });
  if (isHeadless) throw new AbortError_2("Agent aborted: too many classifier denials in headless mode");
  logForDebugging(`Classifier denial limit exceeded, falling back to prompting: ${warning}`, {
    level: "warn",
  });
  if (hitTotalLimit)
    persistDenialState(context, {
      ...state,
      totalDenials: 0,
      consecutiveDenials: 0,
      timedFallbackShown: undefined,
      lastRewriteMessageId: undefined,
      lastRewriteFingerprint: undefined,
      rewriteDenials: undefined,
    });
  let originalClassifier =
    askResult.decisionReason?.type === "classifier" ? askResult.decisionReason.classifier : "auto-mode";
  if (ke && !hitTotalLimit && we && isAutoMode)
    updateDenialTrackingState(context, (lt) => ({
      ...lt,
      timedFallbackShown: true,
    }));
  let category =
    classifierResult.decisionReason?.type === "classifier"
      ? classifierResult.decisionReason.category
      : undefined;
  let disclosure = {
    type: "classifier",
    classifier: originalClassifier,
    reason: `${warning}

Latest blocked action: ${latestReason}`,
    ...(category !== undefined && {
      category,
    }),
  };
  let decisionReason = pickDisplayedDecisionReason(askResult, disclosure);
  return {
    ...askResult,
    ...(ke &&
      !hitTotalLimit &&
      we && {
        denialLimitFallback: withPermissionDisclosure(
          disclosure,
          Ee
            ? {
                autoDenyAfterMs: getTimedFallbackAutoDenyMs(),
                resolution: classifierResult,
              }
            : undefined,
        ),
      }),
    decisionReason,
  };
}
//@ chunk-e6aww6q8.js:3014177-3014380 placement
/**
 * 决定原因是否由 ask 规则驱动（rule 且 ruleBehavior 为 ask，或 subcommandResults 里任一 ask 子项如此）。
 */
function isAskRuleDrivenReason(decisionReason) {
  if (decisionReason?.type === "rule" && decisionReason.rule.ruleBehavior === "ask") return true;
  if (decisionReason?.type === "subcommandResults") {
    for (let reason of decisionReason.reasons.values())
      if (reason.behavior === "ask" && isAskRuleDrivenReason(reason.decisionReason)) return true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:3014380-3014464 placement
/**
 * 结果是否带 ask 规则意图：原因由 ask 规则驱动，或 matchedAskRule 为 ask。auto 下这类 ask 回退人工而不交分类器。
 */
function carriesAskRuleIntent(e) {
  return isAskRuleDrivenReason(e.decisionReason) || e.matchedAskRule?.ruleBehavior === "ask";
}
//@ chunk-e6aww6q8.js:3014464-3014568 placement
/**
 * 原因是否为 mcpServerPolicy 来源的 ask 规则。
 */
function isServerPolicyAskReason(decisionReason) {
  return (
    decisionReason?.type === "rule" &&
    decisionReason.rule.ruleBehavior === "ask" &&
    decisionReason.rule.source === "mcpServerPolicy"
  );
}
//@ chunk-e6aww6q8.js:3014568-3014690 placement
/**
 * 沙箱/只读放行是否改标为 sandboxOverride 交复核：无 ask 规则意图、无安全检查原因、尚非 sandboxOverride，且 tengu_curried_squirrel 打开。
 */
function shouldRetagAskAsSandboxOverride(e) {
  if (
    carriesAskRuleIntent(e) ||
    findSafetyCheckReason(e.decisionReason) !== undefined ||
    e.decisionReason?.type === "sandboxOverride"
  )
    return false;
  return sandboxOverrideAskGuardsOn();
}
//@ chunk-e6aww6q8.js:3014690-3014751 placement
/**
 * 沙箱覆盖 ask 守卫开关（GrowthBook tengu_curried_squirrel，安全默认）。
 */
function sandboxOverrideAskGuardsOn() {
  return readFlagWithOverride("tengu_curried_squirrel", {
    safe: true,
  });
}
//@ chunk-e6aww6q8.js:3014751-3014808 placement
function isPlanModeFloorReason(decisionReason) {
  return decisionReason?.type === "mode" && decisionReason.mode === "plan";
}
//@ chunk-e6aww6q8.js:3014916-3015069 placement
function usesToolCheckRunner(e, n) {
  if (e.mcpInfo) return true;
  if (getCheckRunner(n.session, e.name) === undefined) return false;
  return !(
    (e.name === BASH_TOOL_NAME || e.name === POWERSHELL_TOOL_NAME) &&
    isAutoClassifierActive("plan", getToolPermissionContext(n).servedCall === true)
  );
}
//@ chunk-e6aww6q8.js:3015069-3015160 placement
function isPlanModeWriteCall(e, parsedInput, r) {
  return (
    getToolPermissionContext(r).mode === "plan" &&
    usesToolCheckRunner(e, r) &&
    !e.isReadOnly(parsedInput, r) &&
    !isReadOnlyBrowserCall(getToolNameForPermissionCheck_2(e), parsedInput)
  );
}
//@ chunk-e6aww6q8.js:3015160-3015319 placement
function isPlanModeBlockedWrite(e, n, r) {
  if (getToolPermissionContext(r).mode !== "plan") return false;
  try {
    let { parsedInput } = parseToolInputForPermission(e, n, r);
    return (
      !e.isReadOnly(parsedInput, r) && !isReadOnlyBrowserCall(getToolNameForPermissionCheck_2(e), parsedInput)
    );
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return true;
  }
}
//@ chunk-e6aww6q8.js:3015319-3015451 placement
function buildPlanModeAsk(e) {
  return {
    behavior: "ask",
    message: `Cannot call ${e.name} while in plan mode.`,
    decisionReason: {
      type: "mode",
      mode: "plan",
    },
  };
}
//@ chunk-e6aww6q8.js:3015451-3015533 placement
function defaultToNoFields(e) {
  return e.behavior === "ask" && e.defaultToNo === true
    ? {
        defaultToNo: true,
      }
    : {};
}
//@ chunk-e6aww6q8.js:3015533-3015707 placement
function isPersonOnlySafetyAsk(e) {
  return (
    e?.behavior === "ask" &&
    e.personOnly === true &&
    e.suppressAlwaysAllowRule === true &&
    e.decisionReason?.type === "safetyCheck" &&
    !e.decisionReason.classifierApprovable
  );
}
//@ chunk-e6aww6q8.js:3015707-3015835 placement
/**
 * mcpServerPolicy 的 ask 是否落在 plan 写地板之下：解析输入后判断该调用在 plan 下是否属于需要阻挡的写；解析失败时以当前是否 plan 模式为准。
 */
function isServerPolicyAskUnderPlanFloor(decisionReason, tool, r, s) {
  if (!isServerPolicyAskReason(decisionReason)) return false;
  try {
    let { parsedInput } = parseToolInputForPermission(tool, r, s);
    return isPlanModeWriteCall(tool, parsedInput, s);
  } catch {
    return getToolPermissionContext(s).mode === "plan";
  }
}
//@ chunk-e6aww6q8.js:3015835-3015860 placement
var FORCED_INTERACTION_TOOLS = new Set([EXITPLANMODE_2, ASKUSERQUESTION]);
//@ chunk-e6aww6q8.js:3015860-3015933 placement
function isExemptFromUserInteraction(e, n) {
  return n !== undefined && e.mcpInfo === undefined && FORCED_INTERACTION_TOOLS.has(e.name);
}
//@ chunk-e6aww6q8.js:3015933-3016015 placement
/**
 * 是否仍欠一次人工交互：工具属于强制人工类，或 requiresUserInteraction 为真且未被豁免。
 */
function isInteractionStillOwed(tool, n) {
  return (
    requiresConnectorGrant_2(tool) ||
    (Boolean(tool.requiresUserInteraction?.()) && !isExemptFromUserInteraction(tool, n))
  );
}
//@ chunk-e6aww6q8.js:3016015-3016265 placement
/**
 * 解析工具输入：先严格 parse；失败且仅因未知键、tengu_tidy_eclipse 打开、且未知键无需询问时，去掉这些键重试，并返回 keysSetAside:true。
 */
function parseToolInputForPermission(e, n, r) {
  try {
    return {
      parsedInput: e.inputSchema.parse(n),
      keysSetAside: false,
    };
  } catch (error) {
    let h = isUnrecognizedKeysIssue(error?.issues);
    if (
      h.length === 0 ||
      !getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_eclipse", true) ||
      isSettledPermissionResult(runFailClosedDecision(e, n, r))
    )
      throw error;
    return {
      parsedInput: e.inputSchema.parse(deleteKeysAtPaths(n, h)),
      keysSetAside: true,
    };
  }
}
//@ chunk-e6aww6q8.js:3016265-3016346 placement
/**
 * 结果是否“已确定”：有结果且不是 checkIncomplete 的 ask。
 */
function isSettledPermissionResult(e) {
  return e !== undefined && !(e.behavior === "ask" && e.checkIncomplete === true);
}
//@ chunk-e6aww6q8.js:3016346-3016738 placement
/**
 * 工具声明了 permissionCheckFailureDecision 时调用它决定权限检查失败的处理；该函数本身抛错时记日志并直接拒绝。
 */
function runFailClosedDecision(e, n, r) {
  if (e.permissionCheckFailureDecision === undefined) return;
  try {
    return e.permissionCheckFailureDecision(n, r);
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return {
      behavior: "deny",
      message: `The ${e.name} permission check failed and its fail-closed posture could not be determined. The call is denied.`,
      decisionReason: {
        type: "other",
        reason: "permission check crashed; tool declares a fail-closed posture",
      },
    };
  }
}
//@ chunk-e6aww6q8.js:3016738-3017371 placement
function describePermissionCheckFault(error, n, r, s) {
  if (error instanceof AbortError_2 || error instanceof APIUserAbortError) throw error;
  if (isAbortError(error) && s.abortController.signal.aborted) throw new AbortError_2();
  if (isNoProjectDirectoryError(error))
    return {
      behavior: "deny",
      message: `The ${n.name} permission check needs a working directory, and this session has none, so the call is denied. A retry is denied the same way.`,
      decisionReason: {
        type: "other",
        reason: NO_PROJECT_DIRECTORY_DENY_REASON,
      },
    };
  if (!isAbortError(error)) logError(error);
  if (mergeClients_3(error))
    return {
      behavior: "deny",
      message: `The ${n.name} permission check failed because of a fault in Claude Code, so the call is denied. Nothing in this session can fix it, and a retry is denied the same way.`,
      decisionReason: {
        type: "other",
        reason: NO_CONFIG_HOME_DENY_REASON,
      },
    };
  return runFailClosedDecision(n, r, s);
}
//@ chunk-e6aww6q8.js:3017889-3017923 placement
var PERMISSION_CHECK_CRASHED_REASON = "permission_check_crashed";
//@ chunk-e6aww6q8.js:3017923-3018318 placement
/**
 * 规则检查前的早期拒绝：会话处于"工具暂停待用户"状态时拒绝（结束工具和钩子代理的 StructuredOutput 除外）；否则查整工具 deny 规则，classifierOnly 工具可绕过。
 */
function getEarlyDenial(e, n, r) {
  let toolPermissionContext = getToolPermissionContext(r);
  if (
    isPersonTypesHold(toolPermissionContext) &&
    !isConversationEndTool(e) &&
    !(
      e.name === STRUCTUREDOUTPUT &&
      !("mcpInfo" in e && e.mcpInfo) &&
      r.agentId?.startsWith(HOOK_AGENT_ID_PREFIX) === true
    )
  )
    return {
      behavior: "deny",
      decisionReason: {
        type: "other",
        reason: TOOLS_HELD_UNTIL_A_PERSON_TYPES,
      },
      message: buildToolsPausedMessage(e.name),
    };
  let denyRuleForTool = getDenyRuleForTool(toolPermissionContext, e);
  return denyRuleForTool === null || ("classifierOnly" in e && isClassifierOnlyToolUnblocked(e, n, r))
    ? undefined
    : {
        behavior: "deny",
        decisionReason: {
          type: "rule",
          rule: denyRuleForTool,
        },
        message: `Permission to use ${e.name} has been denied.`,
      };
}
//@ chunk-e6aww6q8.js:3018318-3020395 placement = PermissionDecisionDebugInfo (0.162)
/**
 * 只查规则与工具自检的权限检查（给 PreToolUse 钩子 allow/ask 后复核用）：提前裁决、deny 规则、整工具 ask 规则（沙箱自动放行例外）、tool.checkPermissions；hook allow 时施加 plan 写地板；检查崩溃且 crashIsObjection 时返回 ask；只返回 deny/ask，放行时返回 null。
 */
async function checkRuleBasedPermissions(tool, n, r, s) {
  let toolPermissionContext = getToolPermissionContext(r);
  let earlyDenial = getEarlyDenial(tool, n, r);
  if (earlyDenial !== undefined) return earlyDenial;
  let S = matchToolRule(toolPermissionContext, tool, n, "deny");
  if (S && !isClassifierOnlyToolUnblocked(tool, n, r))
    return {
      behavior: "deny",
      decisionReason: {
        type: "rule",
        rule: S,
      },
      message: formatRuleDeniedMessage(tool.name, S),
    };
  let askRuleForTool = getAskRuleForTool(toolPermissionContext, tool);
  if (askRuleForTool) {
    let Z =
      tool.name === BASH_TOOL_NAME &&
      r.forRemoteExecution !== true &&
      getCheckRunner(r.session, tool.name) === undefined &&
      SandboxManager.isSandboxingEnabled() &&
      SandboxManager.isAutoAllowBashIfSandboxedEnabled() &&
      shouldUseSandbox(n) &&
      !(typeof n.command === "string" && antDisabledListMatchesCommandText(n.command));
    let Se = Z && isSandboxAutoAllowOff(toolPermissionContext);
    if (!(Z && !Se)) return powershellToolCheckExactMatchPermission(tool, n, r, askRuleForTool, s);
  }
  let result = {
    behavior: "passthrough",
    message: createPermissionRequestMessage(tool.name),
  };
  try {
    let { parsedInput } = parseToolInputForPermission(tool, n, r);
    result = await tool.checkPermissions(parsedInput, r);
    recordCheckedResult(r, parsedInput, result, tool.name);
    if (
      s?.planModeWriteFloor === true &&
      getRegisteredCheck(r.session, tool.name) === undefined &&
      result.behavior === "passthrough" &&
      isPlanModeWriteCall(tool, parsedInput, r)
    )
      return buildPlanModeAsk(tool);
  } catch (error) {
    let Se = describePermissionCheckFault(error, tool, n, r);
    if (Se !== undefined && isSettledPermissionResult(Se)) result = Se;
    else if (s?.crashIsObjection === true && classifierOnlyConfig(tool) === undefined) {
      let ke = {
        type: "other",
        reason: PERMISSION_CHECK_CRASHED_REASON,
      };
      return {
        behavior: "ask",
        message: createPermissionRequestMessage(tool.name, ke),
        decisionReason: ke,
      };
    }
    if (
      s?.planModeWriteFloor === true &&
      getRegisteredCheck(r.session, tool.name) === undefined &&
      result.behavior === "passthrough" &&
      isPlanModeBlockedWrite(tool, n, r)
    )
      return buildPlanModeAsk(tool);
  }
  result = requireAutoModeClassifierReview(tool, n, r, result) ?? result;
  result = askClassifierForAllowedDomains(tool, n, r, result) ?? result;
  result = buildDesktopActionReviewAsk(tool, n, result) ?? result;
  if (result?.behavior === "deny") return result;
  let G = matchToolRule(toolPermissionContext, tool, n, "ask");
  if (G)
    return result?.behavior === "ask"
      ? {
          ...result,
          matchedAskRule: G,
        }
      : {
          behavior: "ask",
          decisionReason: {
            type: "rule",
            rule: G,
          },
          message: createPermissionRequestMessage(tool.name),
        };
  if (
    isInteractionStillOwed(tool, s?.hookUpdatedInput) &&
    !(s?.hookAsked === true && !tool.requiresUserInteraction?.())
  )
    return result?.behavior === "ask"
      ? result
      : {
          behavior: "ask",
          message: createPermissionRequestMessage(tool.name),
          decisionReason: {
            type: "other",
            reason: "requiresUserInteraction",
          },
        };
  if (result?.behavior === "ask" && carriesAskRuleIntent(result)) return result;
  if (tool.mcpInfo?.effectiveMaxPermission === "ask") {
    if (isPersonOnlySafetyAsk(result)) return result;
    let Z = {
      type: "other",
      reason: askCeilingReason(tool),
    };
    return {
      behavior: "ask",
      message: createPermissionRequestMessage(tool.name, Z),
      decisionReason: Z,
      ...defaultToNoFields(result),
    };
  }
  let suggestedRules = getToolPermissionContext(r);
  if (
    result?.behavior === "ask" &&
    (findSafetyCheckReason(result.decisionReason) ||
      result.decisionReason?.type === "sandboxOverride" ||
      (s?.planModeWriteFloor === true &&
        isPlanModeFloorReason(result.decisionReason) &&
        !cycleTeammateMode(tool, r, suggestedRules, isAutoAllowedInMode(tool, suggestedRules))))
  )
    return result;
  if (
    s?.planModeWriteFloor === true &&
    getRegisteredCheck(r.session, tool.name) === undefined &&
    !tool.requiresUserInteraction?.() &&
    !cycleTeammateMode(tool, r, suggestedRules, isAutoAllowedInMode(tool, suggestedRules)) &&
    isPlanModeBlockedWrite(tool, n, r)
  )
    return result?.behavior === "ask"
      ? result
      : {
          behavior: "ask",
          message: createPermissionRequestMessage(tool.name),
        };
  return null;
}
//@ chunk-e6aww6q8.js:3020395-3020896 placement
/**
 * 工具宿主（ToolHost）上的规则检查：会话为该工具注册了宿主裁决时调用它；返回 deny，或带 ask 规则意图/安全检查/仅限人工的 ask，否则 null。
 */
async function checkRuleBasedPermissionsOnToolHost(
  tool,
  hookUpdatedInput,
  toolUseContext,
  assistantMessage,
  toolUseID,
) {
  let registeredCheck = getRegisteredCheck(toolUseContext.session, tool.name);
  if (registeredCheck === undefined) return null;
  let S = {
    ...toolUseContext,
    toolUseId: toolUseID,
    permissionModeAtRequest: getPermissionModeAtRequestForArbiter(
      assistantMessage,
      toolUseID,
      toolUseContext,
    ),
  };
  let w = await invokeToolHostAdjudicator(
    registeredCheck,
    tool,
    hookUpdatedInput,
    S,
    assistantMessage,
    toolUseID,
    () =>
      Promise.resolve({
        behavior: "deny",
        message: `${tool.name} was not run: its permission check could not be completed.`,
        decisionReason: {
          type: "other",
          reason: "permission check failed",
        },
      }),
  );
  if (w === CHECK_NO_DECISION) {
    rememberPendingCheck(toolUseContext.session, toolUseID);
    return null;
  }
  return w.behavior === "deny" ||
    (w.behavior === "ask" &&
      (carriesAskRuleIntent(w) ||
        findSafetyCheckReason(w.decisionReason) !== undefined ||
        w.personOnly === true))
    ? w
    : null;
}
//@ chunk-e6aww6q8.js:3020896-3021043 placement
/**
 * 调用工具宿主的裁决函数，传入服务端分类器是否裁决（serverClassifierDecides）与本地评估回调 evaluateHere。
 */
function invokeToolHostAdjudicator(registeredCheck, tool, input, s, h, y, evaluateHere) {
  return registeredCheck({
    tool,
    input,
    context: s,
    toolUseID: y,
    serverClassifierDecides: isArbiterRole(
      resolveServerClassifierRoleForCall(
        getAutoModeClassifierRole(getToolPermissionContext(s).mode),
        h,
        y,
        s,
      ),
    ),
    evaluateHere,
  });
}
//@ chunk-e6aww6q8.js:3021043-3021095 placement
function checkDeclarativePermission(e, n, r, s) {
  return checkToolAndRulePermissions(e, n, r, undefined, getAutoModeClassifierRole, s);
}
//@ chunk-e6aww6q8.js:3021095-3021385 placement
/**
 * checkDeclarativePermission 的变体：去掉 mcpServerPolicy 来源的 ask 规则后再检查，检查崩溃视为异议。
 */
function checkDeclarativePermissionLessServerPolicyAsks(e, effectiveInput, toolUseContext) {
  return checkDeclarativePermission(
    e,
    effectiveInput,
    {
      ...toolUseContext,
      toolUseId: undefined,
      permissionRound: undefined,
      getAppState: () => {
        let appState = toolUseContext.getAppState();
        let { mcpServerPolicy, ...y } = appState.toolPermissionContext.alwaysAskRules;
        return {
          ...appState,
          toolPermissionContext: {
            ...appState.toolPermissionContext,
            alwaysAskRules: y,
          },
        };
      },
    },
    {
      crashIsObjection: true,
    },
  );
}
//@ chunk-e6aww6q8.js:3021385-3021416 placement
var VERDICT_RANK = {
  deny: 0,
  ask: 1,
  allow: 2,
};
//@ chunk-e6aww6q8.js:3021416-3023557 placement
/**
 * 插件 tool.check 裁决层：先运行插件检查（resolveToolCheck）包住 evaluate；deny 或与本地评估一致且无 refusal/hooksMayAllow 时直接返回；否则按一系列闸门（远程 MCP、Cowork Web、auto 下钩子 allow 不能放行的工具、云浏览器、需人工交互、等待人写入、MCP skill ask、plan 写地板）限制插件只能收紧不能放宽。
 */
async function decideWithToolCheckHooks(e, id) {
  let r;
  let s = async () => (r = await e.evaluate());
  let toolCheck = await resolveToolCheck({
    ...e,
    evaluate: s,
  });
  let refusal = toolCheck.behavior === "ask" ? toolCheck.refusal : undefined;
  let S = toolCheck.behavior === "deny" || toolCheck.behavior === r?.behavior;
  let w = toolCheck.behavior === "ask" && toolCheck.hooksMayAllow === true;
  if (S && refusal === undefined && !w) return toolCheck;
  let { tool, context, toolUseID } = e;
  let Z = isClassifierRoutedMcpTool(tool, getToolPermissionContext(context))
    ? {
        gate: lit_2("remoteSessionMcp"),
        why: "a remote session's MCP call",
      }
    : isWebToolClassifierRouted(tool, getToolPermissionContext(context))
      ? {
          gate: lit_2("coworkWeb"),
          why: "a plugin can only tighten a Cowork cloud session's web call",
        }
      : undefined;
  if (
    Z === undefined &&
    isAutoClassifierActive(isAutoAllowedInMode(tool, getToolPermissionContext(context))) &&
    requiresClassifierForHookAllow(tool)
  )
    Z = {
      gate: lit_2("hookAllowClassified"),
      why: "in auto mode, or plan mode with auto mode on, a plugin can only tighten a call that a hook's allow cannot approve",
    };
  if (Z === undefined && isRemoteBrowserToolUnderModeFloor(tool))
    Z = {
      gate: lit_2("remoteBrowserModeFloor"),
      why: "a plugin can only tighten a call to CCR's cloud browser",
    };
  if (Z === undefined && isInteractionStillOwed(tool, undefined))
    Z = {
      gate: lit_2("requiresUserInteraction"),
      why: "the tool requires the person",
    };
  if (Z === undefined && isPersonTypesHold(getToolPermissionContext(context)))
    Z = {
      gate: lit_2("toolsHeldUntilAPersonTypes"),
      why: "tool calls are held until a person writes",
    };
  let coreRan = r !== undefined;
  if (Z === undefined && tool.name === SKILL) {
    let we = r ?? (await s());
    if (we.behavior === "ask" && we.metadata?.mcpSkill !== undefined)
      Z = {
        gate: lit_2("mcpSkillAsk"),
        why: "only a person answers the ask before an MCP skill loads",
      };
  }
  if (
    Z === undefined &&
    getToolPermissionContext(context).mode === "plan" &&
    ((r?.behavior === "ask" && isPlanModeFloorReason(r.decisionReason)) ||
      isPlanModeBlockedWrite(tool, e.input, context)) &&
    (r ?? (await s())).behavior !== "allow"
  )
    Z = {
      gate: lit_2("planModeWriteFloor"),
      why: "plan mode holds the call",
    };
  if (refusal !== undefined)
    return Z === undefined &&
      context.asksNoHost !== true &&
      isAutoAllowedInMode(tool, getToolPermissionContext(context)) !== "dontAsk"
      ? toolCheck
      : refusal;
  if (Z === undefined) {
    if (toolCheck.behavior === "allow")
      countMcpPolicyRecheckSkipped("toolCheck", tool, e.input, context, undefined, toolUseID);
    return toolCheck;
  }
  if (S && toolCheck.behavior === "ask")
    return {
      ...toolCheck,
      hooksMayAllow: false,
    };
  let ke = r ?? (await s());
  if (VERDICT_RANK[toolCheck.behavior] < VERDICT_RANK[ke.behavior]) return toolCheck;
  if (ke.behavior === "ask" && toolCheck.behavior === "ask" && toolCheck.personOnly === true)
    return {
      ...personOnlyAsk(ke),
      hooksMayAllow: false,
    };
  logForDebugging(
    `tool.check ${tool.name} ${toolUseID}: ${Z.why}, so the plugins' ${toolCheck.behavior} is ignored; continuing with the engine's own decision (${ke.behavior})`,
  );
  logEvent("tengu_auto_mode_tool_check_verdict_held", {
    toolName: sanitizeToolNameForAnalytics(tool.name),
    isMcp: tool.isMcp ?? false,
    gate: Z.gate,
    hookDecision: fromEnum(toolCheck.behavior),
    coreDecision: fromEnum(ke.behavior),
    coreRan,
    agentMsgId: sanitizeMarkName(id),
    toolUseId: sanitizeMarkName(toolUseID),
  });
  return ke;
}
//@ chunk-e6aww6q8.js:3023557-3027359 placement
/**
 * 规则与工具自检阶段：已中止则抛错；deny 规则命中即拒绝；整工具 ask 规则返回 ask（Bash 在沙箱自动放行且启用 autoAllowBashIfSandboxed 时例外，mcpServerPolicy 在远程 bypass 下可豁免）；随后调用 tool.checkPermissions、安全修正、字段级 ask 规则、requiresUserInteraction、bypassPermissions 放行、allow 规则，最后把 passthrough 转为 ask。
 */
async function checkToolAndRulePermissions(tool, fallback, context, s, h = getAutoModeClassifierRole, y) {
  if (context.abortController.signal.aborted) throw new AbortError_2();
  let toolPermissionContext = getToolPermissionContext(context);
  let earlyDenial = getEarlyDenial(tool, fallback, context);
  if (earlyDenial !== undefined) return earlyDenial;
  let L = matchToolRule(toolPermissionContext, tool, fallback, "deny");
  if (L && !isClassifierOnlyToolUnblocked(tool, fallback, context))
    return {
      behavior: "deny",
      decisionReason: {
        type: "rule",
        rule: L,
      },
      message: formatRuleDeniedMessage(tool.name, L),
    };
  let askRuleForTool = getAskRuleForTool(toolPermissionContext, tool);
  if (askRuleForTool) {
    let pt =
      tool.name === BASH_TOOL_NAME &&
      context.forRemoteExecution !== true &&
      getCheckRunner(context.session, tool.name) === undefined &&
      SandboxManager.isSandboxingEnabled() &&
      SandboxManager.isAutoAllowBashIfSandboxedEnabled() &&
      shouldUseSandbox(fallback) &&
      !(typeof fallback.command === "string" && antDisabledListMatchesCommandText(fallback.command));
    let Et = pt && isSandboxAutoAllowOff(toolPermissionContext);
    let yt = pt && !Et;
    let gt =
      askRuleForTool.source === "mcpServerPolicy" &&
      env.CLAUDE_CODE_REMOTE &&
      isAutoAllowedInMode(tool, toolPermissionContext) === "bypassPermissions" &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_server_policy_bypass_exempt", true);
    if (!yt && !gt)
      return powershellToolCheckExactMatchPermission(tool, fallback, context, askRuleForTool, y);
  }
  let q = {
    behavior: "passthrough",
    message: createPermissionRequestMessage(tool.name),
  };
  let Z = false;
  try {
    let { parsedInput, keysSetAside } = parseToolInputForPermission(tool, fallback, context);
    q = await tool.checkPermissions(parsedInput, context);
    if (keysSetAside && q.behavior !== "deny")
      q =
        q.behavior === "allow"
          ? {
              behavior: "passthrough",
              message: createPermissionRequestMessage(tool.name),
              checkIncomplete: true,
            }
          : {
              ...q,
              checkIncomplete: true,
            };
    Z = true;
    recordCheckedResult(context, parsedInput, q, tool.name);
    if (isPlanModeWriteCall(tool, parsedInput, context) && q.behavior === "passthrough")
      q = buildPlanModeAsk(tool);
  } catch (error) {
    let Et = describePermissionCheckFault(error, tool, fallback, context);
    if (Et !== undefined && isSettledPermissionResult(Et)) q = Et;
    else if (y?.crashIsObjection === true && !Z && classifierOnlyConfig(tool) === undefined) {
      let yt = {
        type: "other",
        reason: PERMISSION_CHECK_CRASHED_REASON,
      };
      return {
        behavior: "ask",
        message: createPermissionRequestMessage(tool.name, yt),
        decisionReason: yt,
      };
    } else if (Et !== undefined && !Z) q = Et;
    else if (!Z)
      q = {
        behavior: "passthrough",
        message: createPermissionRequestMessage(tool.name),
        checkIncomplete: true,
      };
    if (q.behavior === "passthrough" && isPlanModeBlockedWrite(tool, fallback, context))
      q =
        q.checkIncomplete === true
          ? {
              ...buildPlanModeAsk(tool),
              checkIncomplete: true,
            }
          : buildPlanModeAsk(tool);
  }
  q = requireAutoModeClassifierReview(tool, fallback, context, q) ?? q;
  q = askClassifierForAllowedDomains(tool, fallback, context, q) ?? q;
  q = buildDesktopActionReviewAsk(tool, fallback, q) ?? q;
  if (q?.behavior === "deny") return q;
  let Se = matchToolRule(toolPermissionContext, tool, fallback, "ask");
  if (Se)
    return q?.behavior === "ask"
      ? {
          ...q,
          matchedAskRule: Se,
        }
      : {
          behavior: "ask",
          decisionReason: {
            type: "rule",
            rule: Se,
          },
          message: createPermissionRequestMessage(tool.name),
        };
  if (tool.requiresUserInteraction?.())
    return q?.behavior === "ask"
      ? q
      : {
          behavior: "ask",
          message: createPermissionRequestMessage(tool.name),
          decisionReason: {
            type: "other",
            reason: "requiresUserInteraction",
          },
        };
  let ke = serverHeldShellAllowSource(tool, q);
  if (
    q.behavior === "allow" &&
    ke !== undefined &&
    toolPermissionContext.servedCall !== true &&
    isArbiterRole(h(toolPermissionContext.mode))
  )
    q = {
      behavior: "ask",
      message: createPermissionRequestMessage(tool.name),
      updatedInput: q.updatedInput,
      decisionReason: {
        type: "other",
        reason: SERVER_HOLDS_SHELL_ALLOW_REASON,
        reroutedFrom: ke,
        replaces: q.decisionReason,
      },
    };
  if (q?.behavior === "ask" && carriesAskRuleIntent(q)) return q;
  if (tool.mcpInfo?.effectiveMaxPermission === "ask") {
    if (isPersonOnlySafetyAsk(q)) return q;
    let pt = {
      type: "other",
      reason: askCeilingReason(tool),
    };
    return {
      behavior: "ask",
      message: createPermissionRequestMessage(tool.name, pt),
      decisionReason: pt,
      ...defaultToNoFields(q),
    };
  }
  let toolPermissionContext_2 = getToolPermissionContext(context);
  let mode = isAutoAllowedInMode(tool, toolPermissionContext_2);
  let Ae = cycleTeammateMode(tool, context, toolPermissionContext_2, mode);
  holdRemovalWaiverOnAskAdjudicator(context);
  let Ie =
    Ae &&
    q?.behavior === "ask" &&
    mode === "bypassPermissions" &&
    context.hookAskFloor !== true &&
    isRemovalWaiverActive(toolPermissionContext_2) &&
    !arePermissionHooksUnsettled() &&
    managedTierHooks("PermissionRequest") === "none";
  let Me =
    Ae && q?.behavior === "ask"
      ? findSafetyCheckReason(
          q.decisionReason,
          Ie ? isUnwaivableBypassImmuneCircuitBreaker : isBypassImmuneCircuitBreaker,
        )
      : undefined;
  let We = q?.behavior === "ask" && isSandboxOverrideUnderReadBlock(q.decisionReason, toolPermissionContext);
  let ze =
    Ae &&
    context.hookAskFloor === true &&
    q?.behavior === "ask" &&
    (q.decisionReason?.type === "sandboxOverride" ||
      ((tool.name === BASH_TOOL_NAME || tool.name === POWERSHELL_TOOL_NAME) &&
        scriptAsksToRunUnsandboxed(tool, fallback))) &&
    sandboxOverrideAskGuardsOn();
  let lt = Ae && context.hookAskFloor === true && q?.behavior === "ask" && q.standsInUnderHookAsk === true;
  if (
    q?.behavior === "ask" &&
    (Me ||
      We ||
      ze ||
      lt ||
      (!Ae &&
        (findSafetyCheckReason(q.decisionReason) ||
          q.decisionReason?.type === "sandboxOverride" ||
          isPlanModeFloorReason(q.decisionReason))))
  )
    return q;
  if (Ae) {
    if (Ie && findSafetyCheckReason(q.decisionReason, isBypassImmuneCircuitBreaker) !== undefined)
      logFeatureOk("permission_bypass_removal_prompt_waived");
    return {
      behavior: "allow",
      updatedInput: getUpdatedInputOrFallback(q, fallback),
      decisionReason: {
        type: "mode",
        mode,
      },
    };
  }
  let Je =
    !Z && q.behavior === "passthrough" ? null : findApplicableAllowRule(tool, fallback, context, mode, h);
  if (Je) {
    let pt =
      getToolPermissionContext(context).servedCall !== true
        ? getClassifiableBrowserAction(tool, fallback, mode)
        : undefined;
    if (pt !== undefined)
      logEvent("tengu_auto_mode_computer_use_rule_allow", {
        computerUseActionKind: fromEnum(pt),
        ruleSource: fromEnum(Je.source),
      });
    let toolPermissionContext = getToolPermissionContext(context);
    let classifierOverridableRuleSource = getClassifierOverridableRuleSource(
      Je,
      tool,
      fallback,
      mode,
      toolPermissionContext,
    );
    if (classifierOverridableRuleSource !== undefined) {
      if (true)
        logEvent("tengu_auto_mode_destructive_mcp_rule_allow", {
          ruleSource: fromEnum(classifierOverridableRuleSource),
          serverClassifierRole: fromEnum(h(toolPermissionContext.mode)),
        });
    }
    return {
      behavior: "allow",
      updatedInput: getUpdatedInputOrFallback(q, fallback),
      decisionReason: {
        type: "rule",
        rule: Je,
      },
    };
  }
  let nt =
    q.behavior === "passthrough"
      ? {
          ...q,
          behavior: "ask",
          message: createPermissionRequestMessage(tool.name, q.decisionReason),
        }
      : q;
  if (nt.behavior === "ask" && nt.suggestions)
    logForDebugging(`Permission suggestions for ${tool.name}: ${jsonStringify(nt.suggestions, null, 2)}`);
  return nt;
}
//@ chunk-e6aww6q8.js:3027359-3027830 placement = deletePermissionRule (1)
/**
 * 删除一条规则：policySettings/flagSettings/command 只读；可编辑层同时改文件；cliArg/session 只改内存。
 */
async function deletePermissionRule({ rule, initialContext, setToolPermissionContext, storageV5 }) {
  if (rule.source === "policySettings" || rule.source === "flagSettings" || rule.source === "command")
    throw Error("Cannot delete permission rules from read-only settings");
  let updatedContext = applyValidatedPermissionUpdate(initialContext, {
    type: "removeRules",
    rules: [rule.ruleValue],
    behavior: rule.ruleBehavior,
    destination: rule.source,
  });
  switch (rule.source) {
    case "localSettings":
    case "userSettings":
    case "projectSettings": {
      await deletePermissionRuleFromSettings(rule, storageV5);
      break;
    }
    case "cliArg":
    case "session":
      break;
  }
  setToolPermissionContext(updatedContext);
}
//@ chunk-e6aww6q8.js:3027830-3028076 fingerprint = convertRulesToUpdates (1)
/**
 * 把规则列表按 来源:行为 分组，转换成 PermissionUpdate 列表（type 由调用方给定，destination 即来源）。
 */
function convertRulesToUpdates(rules, updateType) {
  let grouped = new Map();
  for (let rule of rules) {
    let key = `${rule.source}:${rule.ruleBehavior}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(rule.ruleValue);
  }
  let updates = [];
  for (let [key, ruleValues] of grouped) {
    let [S, w] = key.split(":");
    updates.push({
      type: updateType,
      rules: ruleValues,
      behavior: w,
      destination: S,
    });
  }
  return updates;
}
//@ chunk-e6aww6q8.js:3028076-3028136 placement = applyPermissionRulesToPermissionContext (1)
/**
 * 把规则列表作为 addRules 更新应用到上下文。
 */
function applyPermissionRulesToPermissionContext(e, rules, r) {
  let updates = convertRulesToUpdates(rules, "addRules");
  return applyPermissionUpdates(e, updates, r);
}
//@ chunk-e6aww6q8.js:3028136-3028623 placement = syncPermissionRulesFromDisk (0.68)
/**
 * 从磁盘重载规则：先清空各 settings 层（托管独占时还清空 cliArg/session 与 mcpMount allow），再按 replaceRules 写入。
 */
function syncPermissionRulesFromDisk(toolPermissionContext, rules) {
  let context = toolPermissionContext;
  if (shouldAllowManagedPermissionRulesOnly()) {
    context = {
      ...context,
      alwaysAllowRules: {
        ...context.alwaysAllowRules,
        mcpMount: [],
      },
    };
    let sourcesToClear = [...EDITABLE_SETTING_SOURCES, "cliArg", "session"];
    let behaviors = ["allow", "deny", "ask"];
    for (let source of sourcesToClear)
      for (let behavior of behaviors) {
        if ((source === "cliArg" || source === "session") && behavior !== "allow") continue;
        context = applyValidatedPermissionUpdate(context, {
          type: "replaceRules",
          rules: [],
          behavior,
          destination: source,
        });
      }
  }
  for (let diskSource of SETTING_SOURCES)
    for (let behavior of ["allow", "deny", "ask"])
      context = applyValidatedPermissionUpdate(context, {
        type: "replaceRules",
        rules: [],
        behavior,
        destination: diskSource,
      });
  let updates = convertRulesToUpdates(rules, "replaceRules");
  let h = applyPermissionUpdates(context, updates);
  clearRemovalWaiverIfPathScoped(h);
  holdRemovalWaiverOnAskAdjudicator(undefined);
  return h;
}
//@ chunk-e6aww6q8.js:3028623-3028902 placement
/**
 * 设置 CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS 且存在 PermissionRequest 钩子（SDK、托管层或设置中）时，把 removalWaiverRulesClear 置为 false，即危险删除豁免交给钩子裁决。
 */
function holdRemovalWaiverOnAskAdjudicator(e) {
  if (
    env.CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS &&
    (hasPermissionPromptTool(getPermissionPromptToolName()) ||
      dispatchClassicEvent("PermissionRequest") ||
      managedTierHooks("PermissionRequest") === "some" ||
      hasSettingsHookForEvent(
        "PermissionRequest",
        e?.sessionHooksRegistry,
        e === undefined ? [] : registerAgent(e, "PermissionRequest", e.session.id),
      ))
  )
    getSessionFeatureValues().removalWaiverRulesClear = false;
}
//@ chunk-e6aww6q8.js:3028902-3028972 fingerprint = getUpdatedInputOrFallback (1)
/**
 * 取结果中的 updatedInput，没有则用回退输入。
 */
function getUpdatedInputOrFallback(permissionResult, fallback) {
  return ("updatedInput" in permissionResult ? permissionResult.updatedInput : undefined) ?? fallback;
}
//@ chunk-e6aww6q8.js:3028972-3029171 placement
/**
 * 在决定原因（含 subcommandResults 递归）中找第一个满足谓词的 safetyCheck 原因。
 */
function findSafetyCheckReason(decisionReason, n = () => true) {
  if (!decisionReason) return;
  if (decisionReason.type === "safetyCheck") return n(decisionReason) ? decisionReason : undefined;
  if (decisionReason.type === "subcommandResults")
    for (let reason of decisionReason.reasons.values()) {
      let safetyCheckReason = findSafetyCheckReason(reason.decisionReason, n);
      if (safetyCheckReason) return safetyCheckReason;
    }
  return;
}
//@ chunk-e6aww6q8.js:3029171-3029403 placement
function involvesSafetyCheck(decisionReason) {
  switch (decisionReason?.type) {
    case undefined:
    case "hook":
      return false;
    case "other":
      return decisionReason.wasSafetyCheck === true;
    case "subcommandResults":
      return [...decisionReason.reasons.values()].some(
        (reason) => reason.behavior !== "allow" && involvesSafetyCheck(reason.decisionReason),
      );
    default:
      return true;
  }
}
//@ chunk-sfy7bm1n.js:10287-10409 placement
/**
 * 进入 auto 模式时把工具名映射为允许规则使用的名字：Bash/PowerShell 视开关保留、Chrome 与危险工具返回 undefined、写文件类映射为编辑工具。
 */
function toAllowRuleToolName(toolNameForPermissionCheck) {
  if (toolNameForPermissionCheck === BASH_TOOL_NAME || toolNameForPermissionCheck === POWERSHELL_TOOL_NAME)
    return classifyAllShellEnabled() ? undefined : toolNameForPermissionCheck;
  if (
    isChromeToolName(toolNameForPermissionCheck) ||
    isDangerousClassifierPermission(toolNameForPermissionCheck, undefined) ||
    isAllowRuleIgnoredInAutoMode(toolNameForPermissionCheck)
  )
    return;
  return toolNameForPermissionCheck === FILE_WRITE_TOOL_NAME ||
    toolNameForPermissionCheck === NOTEBOOK_EDIT_TOOL_NAME
    ? FILE_EDIT_TOOL_NAME
    : toolNameForPermissionCheck;
}
//@ chunk-sfy7bm1n.js:10409-10455 placement
var HEARTH_WRITE_TOOL_NAMES = new Set(
  Array.from(HEARTH_WRITE_TOOL_NAMES_2, (e) => buildMcpToolName(HEARTHBOT, e)),
);
//@ chunk-sfy7bm1n.js:10455-10488 placement
function isAllowRuleIgnoredInAutoMode(toolName) {
  return HEARTH_WRITE_TOOL_NAMES.has(toolName);
}
//@ chunk-sfy7bm1n.js:10488-10701 placement
/**
 * 规则来源按顺序：userSettings、projectSettings、localSettings、flagSettings、policySettings、cliArg、command、session、mcpMount、toolsNarrowing、mcpServerPolicy、hostCredential。
 */
var PERMISSION_RULE_SOURCES = [
  ...SETTING_SOURCES,
  "cliArg",
  "command",
  "session",
  "mcpMount",
  "toolsNarrowing",
  "mcpServerPolicy",
  "hostCredential",
];
var NARROWING_RULE_SOURCES = ["toolsNarrowing", "command"];
var CONVERSATION_END_TOOLS = new Set([require("./chunk-jbpmz76b.js").END_CONVERSATION_TOOL_NAME]);
//@ chunk-sfy7bm1n.js:10701-10749 placement
function isConversationEndTool(e) {
  return !e.mcpInfo && CONVERSATION_END_TOOLS.has(e.name);
}
//@ chunk-sfy7bm1n.js:10749-11364 fingerprint = getAllowRules (0.577)
/**
 * 收集 allow 规则；auto 模式下跳过危险规则（sme）与特定工具；CLAUDE_CODE_EVAL_CONFINED 时只用 cliArg；M() 判为被托管限制的来源之后的规则被截断。
 */
function getAllowRules(context) {
  if (isAutoClassifierActive(context.mode, context.servedCall === true)) {
    let n = env.CLAUDE_CODE_EVAL_CONFINED
      ? {
          cliArg: context.alwaysAllowRules.cliArg,
        }
      : context.alwaysAllowRules;
    let s = [];
    for (let l of PERMISSION_RULE_SOURCES) {
      let m = n[l];
      if (m === undefined) continue;
      for (let u of m) {
        let a = permissionRuleValueFromString(u);
        if (isDangerousClassifierPermission(a.toolName, a.ruleContent)) continue;
        if (isAllowRuleIgnoredInAutoMode(a.toolName)) continue;
        if (isRestrictedNonSessionRule(l, a.toolName)) continue;
        s.push({
          source: l,
          ruleBehavior: "allow",
          ruleValue: a,
        });
      }
    }
    return s;
  }
  if (env.CLAUDE_CODE_EVAL_CONFINED)
    return collectRulesFromSettings(
      {
        cliArg: context.alwaysAllowRules.cliArg,
      },
      "allow",
    );
  let rulesFromSettings = collectRulesFromSettings(context.alwaysAllowRules, "allow");
  let o;
  for (let [n, s] of rulesFromSettings.entries())
    if (isRestrictedNonSessionRule(s.source, s.ruleValue.toolName)) o ??= rulesFromSettings.slice(0, n);
    else o?.push(s);
  return o ?? rulesFromSettings;
}
//@ chunk-sfy7bm1n.js:11364-11517 layout = hasBashPermission (1)
/**
 * 把某行为（allow/deny/ask）的各来源规则字符串展开成规则对象列表 {source, ruleBehavior, ruleValue}。
 */
function collectRulesFromSettings(e, ruleBehavior) {
  let o = [];
  for (let n of PERMISSION_RULE_SOURCES) {
    let s = e[n];
    if (s === undefined) continue;
    for (let l of s)
      o.push({
        source: n,
        ruleBehavior,
        ruleValue: permissionRuleValueFromString(l),
      });
  }
  return o;
}
//@ chunk-sfy7bm1n.js:11517-11569 layout
function getDenyRules(e) {
  return collectRulesFromSettings(e.alwaysDenyRules, "deny");
}
//@ chunk-sfy7bm1n.js:11569-11619 layout
function getAskRules(e) {
  return collectRulesFromSettings(e.alwaysAskRules, "ask");
}
//@ chunk-sfy7bm1n.js:11619-11703 layout = getDenyRuleForAgent (1)
/**
 * 工具是否命中整工具规则（规则无内容时按工具名匹配）。
 */
function toolMatchesWholeToolRule(context, agentToolName, agentType = {}) {
  if (agentToolName.ruleValue.ruleContent !== undefined) return false;
  return toolMatchesRuleName(context, agentToolName, agentType);
}
//@ chunk-sfy7bm1n.js:11703-12599 layout
/**
 * 规则工具名是否匹配工具：同名、家族父工具、别名展开、glob 名、MCP 服务器级规则（mcp__server / mcp__server__*）。
 */
function toolMatchesRuleName(
  e,
  r,
  { proxyExpansion: o = false, globMatching: n = false, toolAliases: s } = {},
  l = getRuleNameMatchers(r),
  m = getToolMatchInfo(e, s),
) {
  if (r.ruleBehavior !== "allow" && e.mcpInfo !== undefined) {
    let d = {
      proxyExpansion: o,
      globMatching: n,
      toolAliases: s,
    };
    if (
      m.otherDenyOrAskReads().some((T) =>
        toolMatchesRuleName(
          {
            name: T.name,
          },
          r,
          d,
          l,
          T,
        ),
      )
    )
      return true;
    let p = standardKeyRuleRow(r.ruleValue.toolName, m.name);
    if (
      p !== undefined &&
      toolMatchesRuleName(
        {
          name: p.row,
        },
        withRuleToolName(p.rule, r),
        d,
      )
    )
      return true;
  }
  let u = m.name;
  if (r.ruleValue.toolName === u) return true;
  let familyParentToolName = "familyParentToolName" in e ? e.familyParentToolName : undefined;
  if (
    familyParentToolName !== undefined &&
    e.mcpInfo === undefined &&
    r.ruleValue.toolName === familyParentToolName
  )
    return true;
  if (o && toolNameVariants(r.ruleValue.toolName, s).includes(u)) return true;
  let { matchesGlob } = l;
  if (n && matchesGlob !== undefined && (matchesGlob(u) || (o && m.aliasSources().some(matchesGlob))))
    return true;
  let c = l.coversMcpTool(m.mcpInfo());
  if (r.ruleBehavior === "allow") {
    if (!c) return false;
    if (ruleWithinServerPrefix(r.ruleValue.toolName, e)) return true;
    warnMcpRuleMismatch(r.ruleValue, e);
    return false;
  }
  return c || (isUserMcpServerRule(r) && m.mcpServerRuleNames().includes(r.ruleValue.toolName));
}
//@ chunk-sfy7bm1n.js:12599-12690 layout
function isUserMcpServerRule({ source, ruleValue }) {
  return source !== "mcpServerPolicy" && ruleValue.toolName.startsWith(MCP_TOOL_PREFIX);
}
//@ chunk-sfy7bm1n.js:12690-12824 layout
function getRuleNameMatchers({ ruleValue: { toolName } }) {
  let r;
  let o;
  return {
    matchesGlob: hasWildcard(toolName) ? (n) => (r ??= wildcardRuleRegex(toolName))(n) : undefined,
    coversMcpTool: (n) => (o ??= compileMcpRuleMatcher(toolName))(n),
  };
}
//@ chunk-sfy7bm1n.js:12824-13030 layout
/**
 * 构造工具匹配信息（惰性计算）：工具名、MCP 信息、别名来源、MCP 服务器规则名、其他 deny/ask 读取名。
 */
function getToolMatchInfo(e, toolAliases) {
  let toolNameForPermissionCheck = getToolNameForPermissionCheck_2(e);
  let n;
  let s;
  let l;
  let m;
  return {
    name: toolNameForPermissionCheck,
    mcpInfo: () => (m === undefined ? (m = mcpInfoFromString(toolNameForPermissionCheck)) : m),
    aliasSources: () => (n ??= aliasesFor(toolNameForPermissionCheck, toolAliases)),
    mcpServerRuleNames: () => (s ??= getMcpServerRulePrefixes(e)),
    otherDenyOrAskReads: () =>
      (l ??= getMcpToolAliasNames(e).map((name) =>
        getToolMatchInfo(
          {
            name,
          },
          toolAliases,
        ),
      )),
  };
}
//@ chunk-sfy7bm1n.js:13030-13086 file-local
function toolAlwaysAllowedRule(context, tool) {
  return getAllowRules(context).find((rule) => toolMatchesWholeToolRule(tool, rule)) || null;
}
//@ chunk-sfy7bm1n.js:13086-13158 layout
/**
 * 该规则是否允许别名展开：cliArg 与 toolsNarrowing 来源不展开。
 */
function allowsAliasExpansion(e) {
  return e.source !== "cliArg" && e.source !== "toolsNarrowing";
}
//@ chunk-sfy7bm1n.js:13158-13562 layout
/**
 * 规则是否命中工具：按名字（含别名、glob）匹配，再检查 aliasSkillToolNames 与打包别名 skill 名。
 */
function toolMatchesRule(e, r, o, n = getRuleNameMatchers(o), s, l = false) {
  let m = {
    proxyExpansion: allowsAliasExpansion(o),
    globMatching: true,
    toolAliases: e.toolAliases,
  };
  if (toolMatchesRuleName(r, o, m, n, s)) return true;
  if (
    ("aliasSkillToolNames" in r ? r.aliasSkillToolNames : undefined)?.some((name) =>
      toolMatchesRuleName(
        {
          name,
        },
        o,
        m,
        n,
      ),
    )
  )
    return true;
  let packagingAliasSkillToolNames =
    "packagingAliasSkillToolNames" in r ? r.packagingAliasSkillToolNames : undefined;
  if (
    packagingAliasSkillToolNames === undefined ||
    (hasWildcard(o.ruleValue.toolName) && !isSkillPluginSurfaceEnabled(l))
  )
    return false;
  return packagingAliasSkillToolNames.some((name) =>
    toolMatchesRuleName(
      {
        name,
      },
      o,
      m,
      n,
    ),
  );
}
//@ chunk-sfy7bm1n.js:13562-13688 layout
/**
 * 找命中该工具的 deny 规则（会话结束类工具除外），返回规则或 null。
 */
function getDenyRuleForTool(e, r, o, n = false) {
  if (isConversationEndTool(r)) return null;
  let s;
  return (
    (o ?? getDenyRules(e)).find((l) =>
      toolMatchesRuleWithAliases(r, l, e, undefined, (s ??= getToolMatchInfo(r, e.toolAliases)), n),
    ) || null
  );
}
//@ chunk-sfy7bm1n.js:13688-13729 layout
function isWildcardOnlyContent(ruleContent) {
  return /^[\s*]+$/.test(ruleContent);
}
//@ chunk-sfy7bm1n.js:13729-13834 layout
function isRootWildcardPathContent(ruleContent) {
  return (
    ruleContent.startsWith("//") && /^\/(?:\*\*\/)?\*+(?:\/\*\*)?$/.test(ruleContent.replace(/\/{2,}/g, "/"))
  );
}
//@ chunk-sfy7bm1n.js:13834-13929 layout
var EDIT_FAMILY_TOOLS = [FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME, NOTEBOOK_EDIT_TOOL_NAME];
var READ_FAMILY_TOOLS = [FILE_READ_TOOL_NAME, GREP_TOOL_NAME, GLOB_TOOL_NAME];
var BROAD_PATH_RULE_COVERAGE = new Map([
  [
    FILE_READ_TOOL_NAME,
    {
      deny: [...READ_FAMILY_TOOLS, FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME],
      ask: READ_FAMILY_TOOLS,
    },
  ],
  [
    FILE_EDIT_TOOL_NAME,
    {
      deny: EDIT_FAMILY_TOOLS,
      ask: EDIT_FAMILY_TOOLS,
    },
  ],
]);
//@ chunk-sfy7bm1n.js:13929-14102 layout = getRuleByContentsForToolName (1)
function ruleCoversToolViaBroadContent({ ruleBehavior, ruleValue: { toolName, ruleContent } }, n) {
  if (ruleContent === undefined || ruleBehavior === "allow") return false;
  return toolName === BASH_TOOL_NAME
    ? n === BASH_TOOL_NAME && isWildcardOnlyContent(ruleContent)
    : isRootWildcardPathContent(ruleContent) &&
        (BROAD_PATH_RULE_COVERAGE.get(toolName)?.[ruleBehavior] ?? []).includes(n);
}
//@ chunk-sfy7bm1n.js:14102-14330 layout
/**
 * 带别名的规则匹配：无内容规则走 toolMatchesRule；有内容规则检查别名来源上的宽泛内容是否覆盖该工具。
 */
function toolMatchesRuleWithAliases(e, r, o, n, toolMatchInfo, l = false) {
  if (r.ruleValue.ruleContent === undefined) return toolMatchesRule(o, e, r, n, toolMatchInfo, l);
  let { name: m, aliasSources } = toolMatchInfo ?? getToolMatchInfo(e, o.toolAliases);
  let a = r.ruleValue.toolName === m;
  let f = allowsAliasExpansion(r);
  return aliasSources().some(
    (c) =>
      c !== m &&
      ((f && ruleCoversToolViaBroadContent(r, c)) ||
        (a && ruleCoversToolViaBroadContent(withRuleToolName(c, r), c))),
  );
}
//@ chunk-sfy7bm1n.js:14330-14397 layout
function withRuleToolName(toolName, r) {
  return {
    ...r,
    ruleValue: {
      ...r.ruleValue,
      toolName,
    },
  };
}
//@ chunk-sfy7bm1n.js:14397-14480 layout
/**
 * 规则名是否为模式名（glob 名或只到 MCP 服务器一级的名字）。
 */
function isPatternRuleName(toolName) {
  if (hasWildcard(toolName)) return true;
  let r = mcpInfoFromString(toolName);
  return r !== null && r.toolName === undefined;
}
//@ chunk-sfy7bm1n.js:14480-14932 layout
/**
 * 为一组 deny 规则建索引：整名集合、模式规则、MCP 服务器名、带内容但经别名覆盖的规则等，供批量过滤工具池。
 */
function buildDenyRuleIndex(e, r) {
  let o = new Set();
  let n = new Set();
  let s = new Set();
  let l = [];
  let m = [];
  for (let u of r) {
    let { toolName, ruleContent } = u.ruleValue;
    if (ruleContent !== undefined) {
      if (
        Object.entries(e.toolAliases ?? {}).some(
          ([key, value]) =>
            ruleCoversToolViaBroadContent(u, key) ||
            (value === toolName && ruleCoversToolViaBroadContent(withRuleToolName(key, u), key)),
        )
      )
        m.push(u);
      continue;
    }
    if (isPatternRuleName(toolName) || ruleWithNormalizedServer(toolName)) {
      l.push({
        rule: u,
        ruleName: getRuleNameMatchers(u),
      });
      continue;
    }
    if (isUserMcpServerRule(u)) s.add(toolName);
    n.add(toolName);
    let c = allowsAliasExpansion(u) ? toolNameVariants(toolName, e.toolAliases) : [toolName];
    for (let d of c) o.add(d);
  }
  return {
    names: o,
    parentNames: n,
    mcpServerNames: s,
    patterns: l,
    withContent: m,
  };
}
//@ chunk-sfy7bm1n.js:14932-14991 layout
function getDenyRuleIndex(e) {
  let denyRules = getDenyRules(e);
  return {
    rules: denyRules,
    index: buildDenyRuleIndex(e, denyRules),
  };
}
//@ chunk-sfy7bm1n.js:14991-15938 layout
/**
 * 用 deny 规则索引判断工具是否被拒绝：名字、其他读名、父工具名、别名 skill 名、MCP 服务器名、模式规则、带内容的覆盖规则依次检查。
 */
function isToolDeniedByIndex(e, index, o) {
  if (
    isConversationEndTool(o) ||
    (index.names.size === 0 && index.patterns.length === 0 && index.withContent.length === 0)
  )
    return false;
  let toolMatchInfo = getToolMatchInfo(o, e.toolAliases);
  if (index.names.has(toolMatchInfo.name)) return true;
  if (
    toolMatchInfo
      .otherDenyOrAskReads()
      .some((u) => index.names.has(u.name) || u.mcpServerRuleNames().some((a) => index.mcpServerNames.has(a)))
  )
    return true;
  let familyParentToolName = "familyParentToolName" in o ? o.familyParentToolName : undefined;
  if (
    familyParentToolName !== undefined &&
    o.mcpInfo === undefined &&
    index.parentNames.has(familyParentToolName)
  )
    return true;
  let aliasSkillToolNames = "aliasSkillToolNames" in o ? o.aliasSkillToolNames : undefined;
  if (aliasSkillToolNames?.some((aliasSkillToolName) => index.names.has(aliasSkillToolName))) return true;
  let packagingAliasSkillToolNames =
    "packagingAliasSkillToolNames" in o ? o.packagingAliasSkillToolNames : undefined;
  if (
    packagingAliasSkillToolNames?.some((packagingAliasSkillToolName) =>
      index.names.has(packagingAliasSkillToolName),
    )
  )
    return true;
  if (
    index.mcpServerNames.size > 0 &&
    (toolMatchInfo.mcpServerRuleNames().some((u) => index.mcpServerNames.has(u)) ||
      [...(aliasSkillToolNames ?? []), ...(packagingAliasSkillToolNames ?? [])].some((name) =>
        getMcpServerRulePrefixes({
          name,
        }).some((a) => index.mcpServerNames.has(a)),
      ))
  )
    return true;
  return (
    index.patterns.some(({ rule, ruleName }) =>
      toolMatchesRuleWithAliases(o, rule, e, ruleName, toolMatchInfo),
    ) ||
    (toolMatchInfo.aliasSources().length > 0 &&
      index.withContent.some((u) => toolMatchesRuleWithAliases(o, u, e, undefined, toolMatchInfo)))
  );
}
//@ chunk-sfy7bm1n.js:15938-16133 layout
/**
 * 会话结束类工具是否被整工具 deny 拒绝（存在同名 allow 规则时不算）。
 */
function isConversationEndToolDenied(e, r) {
  if (!isConversationEndTool(r)) return false;
  if (getAllowRules(e).some((n) => n.ruleValue.toolName === r.name)) return false;
  return getDenyRules(e).some((n) =>
    toolMatchesWholeToolRule(r, n, {
      proxyExpansion: allowsAliasExpansion(n),
      globMatching: true,
      toolAliases: e.toolAliases,
    }),
  );
}
//@ chunk-sfy7bm1n.js:16133-16236 layout = getDenyRuleForAgent (1)
/**
 * 找 toolName 与 ruleContent 精确相等的 deny 规则（例如 Agent(type)）。
 */
function findDenyRuleWithContent(context, agentToolName, agentType) {
  return (
    getDenyRules(context).find(
      (rule) => rule.ruleValue.toolName === agentToolName && rule.ruleValue.ruleContent === agentType,
    ) || null
  );
}
//@ chunk-sfy7bm1n.js:16236-16340 layout = getDenyRuleForAgent (1)
/**
 * 找 toolName 与 ruleContent 精确相等的 ask 规则。
 */
function findAskRuleWithContent(context, agentToolName, agentType) {
  return (
    getAskRules(context).find(
      (rule) => rule.ruleValue.toolName === agentToolName && rule.ruleValue.ruleContent === agentType,
    ) || null
  );
}
//@ chunk-sfy7bm1n.js:16340-16528 fingerprint = filterDeniedAgents (1)
/**
 * 按 Agent(type) deny 规则过滤代理列表。
 */
function filterDeniedAgents(agents, context, agentToolName) {
  let deniedAgentTypes = new Set();
  for (let rule of getDenyRules(context))
    if (rule.ruleValue.toolName === agentToolName && rule.ruleValue.ruleContent !== undefined)
      deniedAgentTypes.add(rule.ruleValue.ruleContent);
  return agents.filter((agent) => !deniedAgentTypes.has(agent.agentType));
}
//@ chunk-sfy7bm1n.js:16528-16647 placement
function getAskRuleForTool(e, r, o) {
  if (isConversationEndTool(r)) return null;
  let n;
  return (
    (o ?? getAskRules(e)).find((s) =>
      toolMatchesRuleWithAliases(r, s, e, undefined, (n ??= getToolMatchInfo(r, e.toolAliases))),
    ) || null
  );
}
//@ chunk-sfy7bm1n.js:16647-16750 placement
function stringifyScalar(e) {
  if (e === undefined || e === null) return null;
  if (typeof e !== "object") return String(e);
  return null;
}
//@ chunk-sfy7bm1n.js:16750-16901 placement
function parseFieldRuleContent(e) {
  let index = e.indexOf(":");
  if (index <= 0) return null;
  let trimmed = e.slice(0, index).trim();
  let trimmed_2 = e.slice(index + 1).trim();
  return trimmed === "" || trimmed_2 === ""
    ? null
    : {
        key: trimmed,
        expected: trimmed_2,
      };
}
//@ chunk-sfy7bm1n.js:16901-16999 placement
function formatRuleDeniedMessage(name, r) {
  return `Permission to use ${name} with ${r.ruleValue.ruleContent} has been denied.`;
}
//@ chunk-sfy7bm1n.js:16999-17029 placement
var MCP_RESOURCE_TOOLS = new Set([
  LISTMCPRESOURCESTOOL,
  READ_MCP_RESOURCE_DIR_TOOL_NAME,
  READMCPRESOURCETOOL,
  REFRESH_MCP_TOOLS_TOOL_NAME,
]);
//@ chunk-sfy7bm1n.js:17029-18589 placement
/**
 * 匹配 "key: expected" 形式的字段规则：对工具（及其别名、家族、MCP 服务器）的同行为规则，取输入字段值做通配比较；MCP 资源工具的 server 字段与 skill 名特判。
 */
function matchToolRule(context, tool, input, behavior) {
  let toolNameForPermissionCheck = getToolNameForPermissionCheck_2(tool);
  let l = [
    ...("aliasSkillToolNames" in tool ? (tool.aliasSkillToolNames ?? []) : []),
    ...("packagingAliasSkillToolNames" in tool ? (tool.packagingAliasSkillToolNames ?? []) : []),
  ];
  let m = [
    [toolNameForPermissionCheck, false],
    ...getMcpToolAliasNames(tool).map((a) => [a, false]),
    ...(tool.mcpInfo !== undefined && isServerIdentityActive()
      ? (behavior === "deny" ? getDenyRules(context) : getAskRules(context))
          .map((a) => a.ruleValue.toolName)
          .filter((a) => {
            let f = standardKeyRuleRow(a, toolNameForPermissionCheck);
            return f !== undefined && f.rule === f.row;
          })
          .map((a) => [a, false])
      : []),
    ...l.map((a) => [a, false]),
    ...aliasesFor(toolNameForPermissionCheck, context.toolAliases).map((a) => [a, true]),
  ];
  for (let [a, f] of m) {
    let filtered = getContentRulesForToolName(context, a, behavior).filter(
      (d) => !f || allowsAliasExpansion(d),
    );
    for (let [d = "", p] of new Map(filtered.map((T) => [T.ruleValue.ruleContent, T]))) {
      let fieldRuleContent = parseFieldRuleContent(d);
      if (fieldRuleContent === null) continue;
      let { key, expected } = fieldRuleContent;
      if (key === tool.ruleContentField) continue;
      let E =
        key === DEVICE_2 && !Object.hasOwn(input, key) && Object.hasOwn(input, HOST_TOOL_INPUT_FIELD)
          ? HOST_TOOL_INPUT_FIELD
          : key;
      if (!Object.hasOwn(input, E)) continue;
      let g = stringifyScalar(input[E]);
      if (g === null) continue;
      if (matchWildcard(expected, g.trim())) return p;
      if (E === "server" && MCP_RESOURCE_TOOLS.has(a)) {
        let replaced = expected.replace(/[^a-zA-Z0-9_*-]/g, "_");
        let replaced_2 = replaced.replace(/_+/g, "_").replace(/_$/, "").replace(/_?\*/g, "*");
        if (
          [g.trim(), g]
            .map(normalizeNameForMCP)
            .flatMap((P) => [P, trimEndChars(P, "_").replace(/^_+/, "")])
            .some((P) =>
              expected.startsWith(CLAUDE_AI_NAME_PREFIX)
                ? matchWildcard(replaced_2, P)
                : matchWildcard(replaced, P) ||
                  (expected.includes("*") &&
                    !replaced.startsWith("_") &&
                    `${P}_`.startsWith(CLAUDE_AI) &&
                    matchWildcard(replaced_2, P)),
            )
        )
          return p;
      }
      if (
        E === HOST_TOOL_INPUT_FIELD &&
        (expected.includes("*")
          ? matchWildcard(expected.toLowerCase(), g.trim())
          : machineNameMatches(expected, g.trim()))
      )
        return p;
      if (toolNameForPermissionCheck === SKILL && E === "skill") {
        let trimmed = g.trim();
        let syncedSkillAlias = toSyncedSkillAlias(trimmed);
        if (syncedSkillAlias !== undefined) {
          if ((!expected.includes("*") || isTopHostSession()) && matchWildcard(expected, syncedSkillAlias))
            return p;
        }
      }
    }
  }
  let familyParentToolName = "familyParentToolName" in tool ? tool.familyParentToolName : undefined;
  if (
    familyParentToolName !== undefined &&
    tool.mcpInfo === undefined &&
    tool.toFamilyParentInput !== undefined
  )
    return matchToolRule(
      context,
      {
        name: familyParentToolName,
        ruleContentField: tool.ruleContentField,
      },
      tool.toFamilyParentInput(input),
      behavior,
    );
  return null;
}
//@ chunk-sfy7bm1n.js:18589-18630 placement
function getContentRulesMapForTool(context, tool, behavior) {
  return getContentRulesMapForToolName(context, getToolNameForPermissionCheck_2(tool), behavior);
}
//@ chunk-sfy7bm1n.js:18630-18765 placement = getDenyRuleForAgent (1)
function getContentRulesMapForToolName(context, agentToolName, agentType) {
  let n = new Map();
  for (let s of getContentRulesForToolName(context, agentToolName, agentType))
    if (s.ruleValue.ruleContent !== undefined) n.set(s.ruleValue.ruleContent, s);
  return n;
}
//@ chunk-sfy7bm1n.js:18765-19004 placement = getRuleByContentsForToolName (1)
function getContentRulesForToolName(context, toolName, behavior) {
  let n = [];
  switch (behavior) {
    case "allow":
      n = getAllowRules(context);
      break;
    case "deny":
      n = getDenyRules(context);
      break;
    case "ask":
      n = getAskRules(context);
      break;
  }
  let s = [];
  for (let rule of n)
    if (
      rule.ruleValue.toolName === toolName &&
      rule.ruleValue.ruleContent !== undefined &&
      rule.ruleBehavior === behavior
    )
      s.push(rule);
  return s;
}
//@ chunk-8wvtd8sr.js:94302-94434 fingerprint = getDenyRuleForAgent (1)
/**
 * URL 类规则的精确域名：解析带类型前缀的规则内容，取出不含通配的域名；属于 WebFetch/浏览器类工具的规则族，误归入本模块。
 */
function getRuleExactDomain(askTypeRule) {
  let typePrefixedValue = parseTypePrefixedValue(askTypeRule.ruleValue.ruleContent ?? "");
  let s = typePrefixedValue === undefined ? undefined : typeNameWithoutQuotes(typePrefixedValue);
  return s === undefined || s === "" || s.includes("*") ? undefined : s;
}
//@ chunk-8wvtd8sr.js:94434-94519 shared-adjacent = getDenyRuleForAgent (1)
/**
 * 取该工具的 URL 规则中与给定 URL 匹配的那些；属于 WebFetch/浏览器类工具的规则族。
 */
function filterRulesMatchingUrls(context, agentToolName, agentType, agentType_2) {
  return getUrlRulesForTool(context, agentToolName, agentType_2).filter((rule) =>
    matchesWildcardPattern(rule.ruleValue.ruleContent ?? "", agentType),
  );
}
//@ chunk-8wvtd8sr.js:354927-355436 fingerprint = hasPermissionsToUseToolInner (0.45)
/**
 * 文件编辑权限结论（供编辑类 UI/预检用）：Edit 级 ask 规则或规则原因 → ask；mode 原因在 plan 下为带 plan 地板的 ask；allow 或 bypass/有 allow 规则且非安全检查 → allow；特定情况为 unseen。
 */
function getFileEditPermissionOutcome(tool, input, context) {
  let denyRule = getAskRuleForTool(input, FileEditTool);
  if (denyRule !== null)
    return {
      kind: "ask",
      reason: {
        type: "rule",
        rule: denyRule,
      },
    };
  let decisionReason = tool.behavior === "ask" ? tool.decisionReason : undefined;
  if (decisionReason?.type === "rule")
    return {
      kind: "ask",
      reason: decisionReason,
    };
  if (decisionReason?.type === "mode")
    return decisionReason.mode === "plan"
      ? {
          kind: "ask",
          planFloor: true,
        }
      : {
          kind: "ask",
        };
  let y =
    tool.behavior === "allow" ||
    (decisionReason?.type !== "safetyCheck" &&
      (input.mode === "bypassPermissions" || toolAlwaysAllowedRule(input, FileEditTool) !== null));
  if (editAskClassifierRoutable(y ? undefined : decisionReason, input, context))
    return {
      kind: "unseen",
    };
  if (y)
    return {
      kind: "allow",
    };
  return decisionReason?.type === "safetyCheck"
    ? {
        kind: "ask",
        reason: decisionReason,
      }
    : {
        kind: "ask",
      };
}
//@ chunk-0e8j1zzj.js:44090-44119 fingerprint = applyPermissionRulesToPermissionContext (1)
var RULE_ADDING_UPDATE_TYPES = new Set(["addRules"]);
//@ chunk-0h4e7gnq.js:136066-136964 callgraph-witnessed = toolMatchesRule (0.205)
/**
 * 由 disallowedTools 规则串构建过滤器：工具名集合、裸名集合、MCP 服务器级禁用，isToolDisallowed(tool) 综合判断（Bash 被禁时一并禁用 Monitor 等等价工具）。
 */
function buildDisallowedToolsFilter(disallowedTools) {
  let flattened = disallowedTools?.flatMap((w) => uniq([w, toInternalToolName(w)]));
  let s = new Set();
  let y = new Set();
  let r = new Set();
  let S = false;
  for (let w of flattened ?? []) {
    let { toolName, ruleContent } = permissionRuleValueFromString(w);
    let nameForRuleMatch = ruleToolNameFromString(w);
    for (let ee of new Set(isReplToolName(nameForRuleMatch) ? [toolName, nameForRuleMatch] : [toolName])) {
      s.add(ee);
      if (!ruleContent) y.add(ee);
    }
    if (toolName === BASH_TOOL_NAME)
      for (let ee of toolsRunningCodeAsBash()) {
        s.add(ee);
        y.add(ee);
      }
    let ruleInfo = mcpInfoFromString(toolName);
    if (ruleInfo !== null && (ruleInfo.toolName === undefined || ruleInfo.toolName === "*"))
      if (ruleInfo.serverName === "*") S = true;
      else r.add(ruleInfo.serverName);
  }
  let h = (toolInfo) => {
    if (!S && r.size === 0) return false;
    let serverName = mcpInfoFromString(toolInfo)?.serverName;
    return serverName !== undefined && (S || r.has(serverName));
  };
  return {
    disallowedToolSet: s,
    bareDisallowedToolSet: y,
    isServerLevelDisallowed: h,
    isToolDisallowed: (w) => {
      let toolInfo = getToolNameForPermissionCheck_2(w);
      let L = builtinToolServedByMcp(w);
      return (
        toolMatchesAnyName(w, s) ||
        s.has(toolInfo) ||
        (L !== undefined && s.has(L)) ||
        h(toolInfo) ||
        (w.mcpInfo !== undefined && [...s].some((I) => mcpRuleMatchesToolAlias(I, w))) ||
        getMcpServerRulePrefixes(w).some((I) => s.has(I) || s.has(`${I}__*`)) ||
        (w.aliasSkillToolNames?.some((aliasSkillToolName) => s.has(aliasSkillToolName)) ?? false) ||
        (w.packagingAliasSkillToolNames?.some((packagingAliasSkillToolName) =>
          s.has(packagingAliasSkillToolName),
        ) ??
          false) ||
        (ARTIFACT_TOOL_NAME !== null &&
          s.has(ARTIFACT_TOOL_NAME) &&
          (standsInForBuiltInArtifact?.(w) ?? false))
      );
    },
  };
}
//@ chunk-0wdgqhcf.js:53327-53451 fingerprint = getAskRules (0.546)
/**
 * 按键集合从 alwaysAskRules 中删除 ask 规则。
 */
function removeAskRulesByKey(e, t) {
  return t.size === 0
    ? e
    : {
        ...e,
        alwaysAskRules: xr(e.alwaysAskRules, (n, r) =>
          n?.filter((source) => !t.has(dbRowKey(r, permissionRuleValueFromString(source)))),
        ),
      };
}
//@ chunk-18hwfzwa.js:63873-63939 placement = createGetAppStateWithAllowedTools (1)
/**
 * 取权限上下文里的 alwaysAllowRules。
 */
function getAlwaysAllowRules(appState) {
  return appState.toolPermissionContext.alwaysAllowRules;
}
//@ chunk-38x90rmj.js:8730-8822 fingerprint = getRuleByContentsForToolName (1)
/**
 * 构造 Chrome 工具的域名 allow 规则对象。
 */
function createChromeDomainAllowRule(ruleContent, source) {
  return {
    source,
    ruleBehavior: "allow",
    ruleValue: {
      toolName: CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL,
      ruleContent,
    },
  };
}
//@ chunk-ddkccdnb.js:231-264 placement
/**
 * copsSimilar：非官方且不相似的插件 id（占位）。
 */
var copsSimilar = (pluginStorageId, r) =>
  !isOfficialMarketplaceRef(pluginStorageId) && !hasSimilarMarketplaceName(pluginStorageId, r);
//@ chunk-dyjqn2aj.js:191-476 placement
/**
 * 有命中的 ask 规则时把决策改为 ask（已是 ask 则补 matchedAskRule），保留改写过的输入；deny 不变。
 */
async function applyAskRuleOverride(e, i, n) {
  if (i === null || e.behavior === "deny") return e;
  return e.behavior === "ask"
    ? {
        ...e,
        matchedAskRule: e.matchedAskRule ?? i,
      }
    : {
        behavior: "ask",
        message: await n(),
        decisionReason: {
          type: "rule",
          rule: i,
        },
        ...("updatedInput" in e &&
          e.updatedInput !== undefined && {
            updatedInput: e.updatedInput,
          }),
      };
}
//@ chunk-pc1rmcr2.js:3877-3941 fingerprint = PERMISSION_RULE_SOURCES (1)
/**
 * 规则来源是否为会话级（cliArg、command、session）。
 */
function isSessionScopedRuleSource(source) {
  return source === "cliArg" || source === "command" || source === "session";
}
//@ chunk-xde1fhwg.js:300-463 placement
/**
 * 决策不能被绕过模式放行：含绕过免疫的安全检查或已签发重入、工具要求用户交互、调用方强制或仅限本人。
 */
function isBypassImmuneDecision(e, tool, toolUseContext) {
  if (
    findSafetyCheckReason(e.decisionReason, isBypassImmuneCircuitBreaker) !== undefined ||
    hasMintedReentry(toolUseContext)
  )
    return true;
  if (tool.requiresUserInteraction?.()) return true;
  return e.forcedByCaller === true || e.personOnly === true;
}
//@ chunk-xr4xc2mq.js:14991-15271 fingerprint = checkRuleBasedPermissions (0.395)
/**
 * 原因（含子命令递归）是否为非 allow 的规则原因，或读阻挡相关原因；第二参数选择检查哪一类。
 */
function isRuleOrReadBlockReason(decisionReason, r) {
  if (decisionReason?.type === "subcommandResults")
    return [...decisionReason.reasons.values()].some((reason) =>
      isRuleOrReadBlockReason(reason.decisionReason, r),
    );
  return r === "rule"
    ? decisionReason?.type === "rule" && decisionReason.rule.ruleBehavior !== "allow"
    : (decisionReason?.type === "safetyCheck" && decisionReason.circuitBreaker === "outsideReadsBlocked") ||
        (decisionReason?.type === "other" && decisionReason.reason === OUTSIDE_READS_BLOCKED_DENY_REASON);
}
export {
  getDenyRuleForTool,
  createPermissionRequestMessage,
  RULE_ADDING_UPDATE_TYPES,
  findSafetyCheckReason,
  withoutGrantsForRemoteScope,
  stripWholeToolGrantsForAsk,
  withoutNewRulesOfMcpSkillLoadForm,
  buildDisallowedToolsFilter,
  parseWildcardAgentTypes,
  sanitizeRuleCategoryOrUndefined,
  findDenyRuleWithContent,
  isPersonTypesHold,
  isConversationEndTool,
  buildToolsPausedMessage,
  TOOLS_HELD_UNTIL_A_PERSON_TYPES,
  withClassifiedWebCalls,
  takeClassifierBlock,
  isAgentToolPoolDenied,
  agentToolPoolDeniedMessage,
  isConversationEndToolDenied,
  checkRuleBasedPermissions,
  hasAutoModeClassifierDenyRules,
  isChainOnAllowActive,
  isWebToolClassifierRouted_2,
  getDispatchableAgents,
  hasLeftProactivityBaseline,
  getAskRuleForTool,
  getAskRules,
  toolMatchesRule,
  removeAskRulesByKey,
  syncPermissionRulesFromDisk,
  getContentRulesForToolName,
  getDenyRules,
  NARROWING_RULE_SOURCES,
  getPermissionModeCycle,
  getAlwaysAllowRules,
  PERMISSION_RULE_SOURCES,
  hasPermissionsToUseTool,
  consultPermissionRequestHooksForUnpromptableAsk,
  isAskRuleDrivenReason,
  makeClassifierApprovalsSetter,
  hasPermissionsToUseToolWithSink,
  setClassifierApproval,
  clearClassifierChecking,
  getAllowRules,
  permissionRuleSourceDisplayString,
  createChromeDomainAllowRule,
  evaluateAskingNoHost,
  holdRemovalWaiverOnAskAdjudicator,
  mergePersistedDenyRules,
  filterDispatchableAgents,
  collectRulesFromSettings,
  applyPermissionRulesToPermissionContext,
  shouldRetagAskAsSandboxOverride,
  getContentRulesMapForTool,
  carriesAskRuleIntent,
  sandboxOverrideAskGuardsOn,
  scriptAsksToRunUnsandboxed,
  isRuleOrReadBlockReason,
  answerUpdatesForMcpSkillAsk,
  matchToolRule,
  permissionGrantScope,
  isBypassImmuneDecision,
  isServerPolicyAskReason,
  isServerPolicyAskUnderPlanFloor,
  checkDeclarativePermissionLessServerPolicyAsks,
  askCeilingReason,
  shouldReplaceMemoryInput,
  guardHookUpdatedInput,
  isInteractionStillOwed,
  getContentRulesMapForToolName,
  applyAskRuleOverride,
  toolAlwaysAllowedRule,
  filterRulesMatchingUrls,
  getRuleExactDomain,
  canPromptUserForPermission,
  getFileEditPermissionOutcome,
  classifyEditsEnabled,
  shouldClassifyEdits,
  hasPersonOnlyAskFloor,
  syncCompactEligibility,
  markCompactRequestSpent,
  PERMISSION_CHECK_CRASHED_REASON,
  handedOffIds,
  getDenyRuleIndex,
  buildDenyRuleIndex,
  isToolDeniedByIndex,
  isWildcardOnlyContent,
  classifierApprovalFor,
  deleteClassifierApproval,
  sanitizeRuleCategory,
  consumeRepeatedToolCall,
  arePermissionHooksUnsettled,
  isAutoModeConsentFlowEnabled,
  parseToolInputForPermission,
  describePermissionCheckFault,
  isSettledPermissionResult,
  formatRuleDeniedMessage,
  parseFieldRuleContent,
  isAskOnMutationTool,
  isCountedClassifierBlock,
  recordAutoModeSuccess,
  enforceAutoModeDenialLimits,
  recordAutoModeDenial,
  autoModeBlockedHelp,
  isPlanModeFloorReason,
  checkDeclarativePermission,
  serverHeldShellAllowSource,
  flaggedPartMessage,
  copsSimilar,
  toolMatchesWholeToolRule,
  resetClassifierApprovals,
  isLiveMemoryToolName,
  classifierOnlyConfig,
  isClassifierAllow,
  describeNonClassifierAllow,
  buildClassifierOnlyDenial,
  checkRuleBasedPermissionsOnToolHost,
  appendRuleAnnotation,
  isClassifierRoutedMcpTool,
  isWebToolClassifierRouted,
  countMcpPolicyRecheckSkipped,
  decideWithToolCheckHooks,
  personAskAfterHooks,
  enforceClassifierOnlyDecision,
  mcpAskVetoesStandingGrant,
  isWebSearchClassifierRouted,
  isProactivityModeChange,
  allowsAliasExpansion,
  isBuzzingPelicanRouted,
  isPatternRuleName,
  getMcpRuleClassifierRoute,
  isDeepDuskDeviceTool,
  isWebFetchOrSearch,
  findAskRuleWithContent,
  deletePermissionRule,
  isSessionScopedRuleSource,
  resetDenialStreakAfterUserApproval,
  markOutsideReadPromptSeen,
  persistBlockReadsOutsideWorkspace,
  withDenialDeadline,
  stripAutoDenyFields,
  isAllowRuleIgnoredInAutoMode,
  isFileMutationTool,
  toToolUseIdSet,
};
