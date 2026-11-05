/**
 * utils/permissions/permissions.ts
 *
 * 工具调用权限判定主流程（hasPermissionsToUseTool、PermissionRequest 钩子、dontAsk/headless 转换、auto 分类器调用与拒绝超限回退）及 allow/deny/ask 规则的查找与匹配。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/permissions.ts
 * pieces: chunk-01b7fqej.js (1), chunk-1dbza2qv.js (1), chunk-5xgkngpb.js (207), chunk-70rvh5wm.js (1), chunk-7p76mrq7.js (2), chunk-9m8gfd36.js (1), chunk-bhrstd6k.js (1), chunk-czq1j3j2.js (1), chunk-frs14hy1.js (1), chunk-gg17c06d.js (45), chunk-nt9amew5.js (14), chunk-xzmy9dn4.js (1)
 * attribution: fingerprint 14, placement 208, layout 49, callgraph-witnessed 2, affinity 1, facade-majority 1, file-local 1
 */
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import {
  classifyAllShellEnabled,
  isDangerousClassifierPermission,
  warnMcpRuleMismatch,
  getAutoModeConfigOrDefault,
  getMcpPrefix as getMcpPrefix_5,
  requiresClassifierForHookAllow,
} from "./permissionSetup.js";
import { isChromeToolName, isBrowserPreviewToolName } from "../claudeInChrome/chromeToolNames.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { EDIT } from "../../tools/FileEditTool/constants.js";
import {
  HEARTH_WRITE_TOOL_NAMES as HEARTH_WRITE_TOOL_NAMES_2,
  HEARTHBOT,
} from "../../services/mcp/ccrMetaMcp.js";
import {
  buildMcpToolName,
  MCP_TOOL_PREFIX,
  getToolNameForPermissionCheck as getToolNameForPermissionCheck_2,
  mcpInfoFromString,
  getMcpToolAliasNames,
  isRemoteBrowserReadWithoutClassifier,
} from "../../services/mcp/mcpStringUtils.js";
import {
  SETTING_SOURCES,
  isSettingSourceEnabled,
  getSettingSourceDisplayNameLowercase,
  EDITABLE_SETTING_SOURCES,
} from "../settings/constants.js";
import {
  isAutoClassifierActive,
  isAutoModePermissionSurface,
  isAutoModeActive,
  noteRefusedMcpSkip,
} from "./autoModeState.js";
import { env, antEnv } from "../env.js";
import { normalizeRuleString } from "./legacyWildcardRules.js";
import {
  isRestrictedNonSessionRule,
  isSkillPluginSurfaceEnabled,
  isWebToolRestrictedInRelay,
} from "./permissionRulePayload.js";
import { liftedAsksInAcceptEdits, unGrantedNotice } from "./mcpPolicyAsks.js";
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
import {
  toolNameVariants,
  hasWildcard,
  wildcardRuleRegex,
  aliasesFor,
  matchWildcard,
  parseRuleString,
  permissionRuleValueFromString as permissionRuleValueFromString_2,
} from "./permissionRuleParser.js";
import { READ } from "../../tools/FileReadTool/constants.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { LISTMCPRESOURCESTOOL } from "../../tools/ListMcpResourcesTool/prompt.js";
import { READ_MCP_RESOURCE_DIR_TOOL_NAME } from "../../tools/ReadMcpResourceDirTool/prompt.js";
import { READMCPRESOURCETOOL } from "../../tools/ReadMcpResourceTool/prompt.js";
import {
  REFRESH_MCP_TOOLS_TOOL_NAME,
  hasBuiltInEvalTool,
} from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { DEVICE_2, HOST_TOOL_INPUT_FIELD, machineNameMatches } from "../../bridge/deviceRegistration.js";
import {
  CLAUDEAI_SERVER_PREFIX,
  CLAUDE_AI_NAME_PREFIX,
  CLAUDE_AI,
} from "../../services/mcp/normalization.js";
import { trimEndChars, plural } from "../stringUtils.js";
import { SKILL } from "../../tools/SkillTool/skillToolNames.js";
import { toSyncedSkillAlias } from "../../skills/syncedSkills.js";
import { isTopHostSession } from "../sessionShape.js";
import { permissionRuleValueFromString, SandboxManager } from "../sandbox/sandbox-adapter.js";
import {
  DEVICE_BASH_TOOL,
  DEVICE_COMMIT_FILES_TOOL,
  IDE_EXECUTE_CODE_TOOL,
} from "../../services/mcp/firstPartyServerIds.js";
import {
  isAutoAllowedInMode,
  getMcpPermissionModeOverride,
  isBypassAllowedInMode,
  isSandboxAutoAllowOff,
} from "./browserToolNames.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  getAutoModeClassifierRole,
  SERVER_CLASSIFIER_LABEL,
  isClassifierTargetToolUse,
  getPermissionModeAtRequestForArbiter,
  awaitServerVerdict,
  alwaysTrueFlag,
  isArbiterRole,
  serverClassifierOffReason,
  isServerClassifierActive,
  shouldFallBackToLocal,
  noVerdictReasonFor,
  isServerNotRequestedReason,
  classifyServerVerdict,
  isInputRewrittenWithFallbackOff,
  mentionsToolUseId,
  getRewriteLostVerdictNote,
  SERVER_CALL_UNAVAILABLE_INPUT_TOO_LONG,
  summarizeServerVerdict,
} from "./serverClassifier/arbiter.js";
import {
  isCcsTenant,
  getAllowedChannels,
  getIsNonInteractiveSession,
  getPermissionPromptToolName,
  getSessionId,
  isSdkDialogHostActive,
  getServerClassifierFallbackChoice,
  isDiskless,
  isThirdPartyServerClassifierRefused,
  markThirdPartyServerClassifierRefused,
  noteNoServerCheck,
  noteNoServerCheckStoppedTurn,
  getTotalInputTokens,
  getTotalOutputTokens,
  getTotalCacheReadInputTokens,
  getTotalCacheCreationInputTokens,
  isCcrSessionLimited,
} from "../../bootstrap/state.js";
import { isCcsCoworkSurface, isCoworkAny } from "../entrypointKinds.js";
import { getToolPermissionContext, getMainLoopModel as getMainLoopModel_2 } from "./toolPermissionContext.js";
import { AGENT } from "../../tools/AgentTool/constants.js";
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
import { hasCertifiedPrefix } from "../../tools/BashTool/certifiedCommands.js";
import { parseBashPermissionRule } from "../../tools/BashTool/bashPermissions.js";
import { ruleReasons } from "./gitCommandRules.js";
import { WEBFETCH, ALLOW_WEB_FETCH } from "../../tools/WebFetchTool/prompt.js";
import { WEBSEARCH } from "../../tools/WebSearchTool/prompt.js";
import { import_reject, import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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
  isUnansweredWindowExpired,
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
import { isBgSession, isUnattendedInteractiveSession } from "../concurrentSessions.js";
import { isTeammateContextReady } from "../swarm/permissionSync.js";
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
import { mainModelOverrideKeys } from "../model/canonicalModelName.js";
import { wasProactivityEverOn } from "../../Tool.js";
import { cycleAllTeammateModes } from "../../components/teams/TeamsDialog.js";
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
  enqueuePermissionCheckStatus,
  isMcpReviewedOutsideAuto,
  startClassifierKeepalive,
  gatewayDisplayName,
  NO_CHECK_FOR_SESSION_TITLE,
  NO_CHECK_FOR_ACTION_TITLE,
  UNREVIEWED_ACTION_NOTICE,
} from "./serverClassifier/fallbackNotice.js";
import { parseCommandRaw, PARSE_ABORTED } from "../bash/parser.js";
import { parseForSecurityFromAst } from "../bash/ast.js";
import { contextKeyAccepted, isStateOn } from "../codeMode/accepted.js";
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
import {
  shouldUseSandbox,
  antDisabledListMatchesCommandText,
} from "../../tools/BashTool/shouldUseSandbox.js";
import { MONITOR } from "../../tools/MonitorTool/constants.js";
import {
  getDestructiveTargetCategory,
  classifyDestructiveTargetScope,
  classifyGitDestructiveTarget,
} from "../../tools/BashTool/destructiveTargets.js";
import { getPowerShellDestructiveCategory } from "../../tools/PowerShellTool/destructiveCommandWarning.js";
import { getCwdOrNull } from "../cwd.js";
import { builtinToolServedByMcp, sanitizeToolNameForAnalytics } from "../../services/analytics/metadata.js";
import { classifyBashCommand } from "../../tools/BashTool/commandClassification.js";
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
  buildDesktopActionReviewAsk,
  getClassifiableBrowserAction,
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
  rewrittenAfterHookMessage,
  escapeRefusedMessage,
  sendMessageRefusedMessage,
  agentSpawnRefusedMessage,
  REJECT_MESSAGE,
  quoteToolInputForClassifierMessage,
  buildClassifierRefusedOrTransientGuidance,
  buildYoloRejectionMessage,
  codeModeNotRunReasonText,
  buildDangerousRemovalDenial,
  weakSet_5,
} from "../messages.js";
import { extractOutputRedirections } from "../bash/commands.js";
import { permissionModeTitle } from "./PermissionMode.js";
import { isPinnedOrWildcardRule, USERSETTINGS } from "./classifierApprovalRules.js";
import {
  dropBareAllowRulesForTools,
  getToolNameWithAliases,
  supportsPersistence as supportsPersistence_2,
  applyPermissionUpdates,
  persistPermissionUpdates,
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
  askClassifierForAllowedDomains,
} from "../../tools/BashTool/sandboxNetwork.js";
import { appendAutoModeDecision } from "./autoModeDecisionLog.js";
import { isEvalBuild } from "../envUtils.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import {
  logStrictTierUnavailable,
  recordContextNavigation,
  collectToolUseIdSet,
  formatActionForClassifier,
  prependInheritedVerifiedTurns,
  classifyYoloAction,
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
import {
  addAdditionalWorkingDirectories,
  isLinkedWorktreeFastPathEnabled,
  verifiedLinkedWorktreeDirectories,
  normalizeCaseForComparison_2,
} from "./filesystem.js";
import { APIUserAbortError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { REMOTE_BROWSER_SERVER_NAME } from "../../services/mcp/remoteBrowserServer.js";
import { keepResolvedHostPin } from "../../commands/mobile/mobile.js";
import { REPL_TOOL_NAME, isEvalToolName } from "../../tools/REPLTool/constants.js";
import { SENDMESSAGE } from "../../tools/SendMessageTool/constants.js";
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
import { isClassifiableForAutoAllow } from "./editPermissionRules.js";
import { needsDocsConnectorFixup } from "../../services/mcp/claudeDocsLinks.js";
import { EXITPLANMODE_2 } from "../../tools/ExitPlanModeTool/constants.js";
import { mergeClients as mergeClients_3 } from "../hostScoped.js";
import { STRUCTUREDOUTPUT } from "../../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { HOOK_AGENT_ID_PREFIX } from "../agentId.js";
import { isRemoteBrowserToolUnderModeFloor } from "./remoteBrowser.js";
import { jsonStringify } from "../slowOperations.js";
import { dispatchClassicEvent } from "../../plugins/functionHooks/modAdmission.js";
import { registerAgent } from "../telemetry/perfettoTracing.js";
import { getSessionFeatureValues } from "../../bootstrap/sessionFeatureValues.js";
import { ruleToolNameFromString } from "./disallowedToolsFlag.js";
import { toolsRunningCodeAsBash } from "./filterToolsByDenyRules.js";
import { toolMatchesAnyName } from "../../services/tools/permissionCheckGuard.js";
import { ARTIFACT_TOOL_NAME, standsInForBuiltInArtifact } from "../../tools/AgentTool/agentToolUtils.js";
import { dbRowKey } from "../../tools/ArtifactTool/permissions/dbWriteInputs.js";
import { FileEditTool } from "../../tools/FileEditTool/FileEditTool.js";
import { editAskClassifierRoutable } from "../../tools/ArtifactTool/publishEdits.js";
import { hasMintedReentry } from "../../tools/SendMessageTool/isolationDispatchGate.js";
import { CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL } from "../claudeInChrome/common.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-gg17c06d.js:12362-12483 placement
/**
 * 进入 auto 模式时把工具名映射为允许规则使用的名字：Bash/PowerShell 视开关保留、Chrome 与危险工具返回 undefined、写文件类映射为编辑工具。
 */
function toAllowRuleToolName(toolName) {
  if (toolName === BASH_TOOL_NAME || toolName === POWERSHELL_TOOL_NAME)
    return classifyAllShellEnabled() ? undefined : toolName;
  if (
    isChromeToolName(toolName) ||
    isDangerousClassifierPermission(toolName, undefined) ||
    isAllowRuleIgnoredInAutoMode(toolName)
  )
    return;
  return toolName === FILE_WRITE_TOOL_NAME || toolName === NOTEBOOK_EDIT_TOOL_NAME ? EDIT : toolName;
}
//@ chunk-gg17c06d.js:12483-12529 placement
var HEARTH_WRITE_TOOL_NAMES; // deferred: uses buildMcpToolName (../../services/mcp/mcpStringUtils.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-gg17c06d.js:12483", () => {
  HEARTH_WRITE_TOOL_NAMES = new Set(
    Array.from(HEARTH_WRITE_TOOL_NAMES_2, (toolName) => buildMcpToolName(HEARTHBOT, toolName)),
  );
});
//@ chunk-gg17c06d.js:12529-12562 placement
function isAllowRuleIgnoredInAutoMode(toolName) {
  return HEARTH_WRITE_TOOL_NAMES.has(toolName);
}
//@ chunk-gg17c06d.js:12562-12965 placement
/**
 * 规则来源按顺序：userSettings、projectSettings、localSettings、flagSettings、policySettings、cliArg、command、session、mcpMount、toolsNarrowing、mcpServerPolicy、hostCredential。
 */
var PERMISSION_RULE_SOURCES; // deferred: loads other modules while loading; runs once its import cycle is complete
var NARROWING_RULE_SOURCES;
var RULE_SOURCE_IS_SESSION_LIKE;
var CONVERSATION_END_TOOLS;
deferInit("chunk-gg17c06d.js:12562", () => {
  PERMISSION_RULE_SOURCES = [
    ...SETTING_SOURCES,
    "cliArg",
    "command",
    "session",
    "mcpMount",
    "toolsNarrowing",
    "mcpServerPolicy",
    "hostCredential",
  ];
  NARROWING_RULE_SOURCES = ["toolsNarrowing", "command"];
  RULE_SOURCE_IS_SESSION_LIKE = {
    userSettings: true,
    projectSettings: true,
    localSettings: true,
    flagSettings: true,
    policySettings: true,
    cliArg: true,
    session: true,
    command: false,
    toolsNarrowing: false,
    mcpServerPolicy: false,
    hostCredential: false,
    mcpMount: false,
  };
  CONVERSATION_END_TOOLS = new Set([
    require("../../tools/EndConversationTool/constants.js").END_CONVERSATION_TOOL_NAME,
  ]);
});
//@ chunk-gg17c06d.js:12965-13013 placement
function isConversationEndTool(tool) {
  return !tool.mcpInfo && CONVERSATION_END_TOOLS.has(tool.name);
}
//@ chunk-gg17c06d.js:13013-13748 fingerprint (2.1.88 match: getAllowRules, 0.514)
function getAllowRules(context, context2) {
  if (isAutoClassifierActive(context.mode, context.servedCall === true)) {
    let allowRuleTables = env.CLAUDE_CODE_EVAL_CONFINED
      ? {
          cliArg: context.alwaysAllowRules.cliArg,
        }
      : context.alwaysAllowRules;
    let ruleTables = [];
    for (let source of PERMISSION_RULE_SOURCES) {
      let rawRules = allowRuleTables[source];
      if (rawRules === undefined) continue;
      for (let rawRule of rawRules) {
        let ruleValue = normalizeRuleString(rawRule, "allow");
        if (isDangerousClassifierPermission(ruleValue.toolName, ruleValue.ruleContent)) continue;
        if (isAllowRuleIgnoredInAutoMode(ruleValue.toolName)) continue;
        if (isRestrictedNonSessionRule(source, ruleValue.toolName)) continue;
        ruleTables.push({
          source,
          ruleBehavior: "allow",
          ruleValue,
        });
      }
    }
    return ruleTables;
  }
  if (env.CLAUDE_CODE_EVAL_CONFINED)
    return hasBashPermission(
      {
        cliArg: context.alwaysAllowRules.cliArg,
      },
      "allow",
    );
  let policyKeys = liftedAsksInAcceptEdits(context, context2);
  let rules = hasBashPermission(
    policyKeys.size === 0
      ? context.alwaysAllowRules
      : {
          ...context.alwaysAllowRules,
          mcpServerPolicy: [...(context.alwaysAllowRules.mcpServerPolicy ?? []), ...policyKeys],
        },
    "allow",
  );
  let filtered;
  for (let [index, rule] of rules.entries())
    if (isRestrictedNonSessionRule(rule.source, rule.ruleValue.toolName)) filtered ??= rules.slice(0, index);
    else filtered?.push(rule);
  return filtered ?? rules;
}
//@ chunk-gg17c06d.js:13748-13903 layout (2.1.88 match: hasBashPermission, 1)
function hasBashPermission(ruleTables, behavior) {
  let rules = [];
  for (let source of PERMISSION_RULE_SOURCES) {
    let rawRules = ruleTables[source];
    if (rawRules === undefined) continue;
    for (let rawRule of rawRules)
      rules.push({
        source,
        ruleBehavior: behavior,
        ruleValue: normalizeRuleString(rawRule, behavior),
      });
  }
  return rules;
}
//@ chunk-gg17c06d.js:13903-13955 layout
function deniedBashRules(context) {
  return hasBashPermission(context.alwaysDenyRules, "deny");
}
//@ chunk-gg17c06d.js:13955-14128 layout
function askedBashRules(context, context2) {
  let policyKeys = liftedAsksInAcceptEdits(context, context2);
  return hasBashPermission(
    policyKeys.size === 0
      ? context.alwaysAskRules
      : {
          ...context.alwaysAskRules,
          mcpServerPolicy: context.alwaysAskRules.mcpServerPolicy?.filter((rules) => !policyKeys.has(rules)),
        },
    "ask",
  );
}
//@ chunk-gg17c06d.js:14128-14212 layout (2.1.88 match: getDenyRuleForAgent, 1)
/**
 * 工具是否命中整工具规则（规则无内容时按工具名匹配）。
 */
function toolMatchesWholeToolRule(context, agentToolName, agentType = {}) {
  if (agentToolName.ruleValue.ruleContent !== undefined) return false;
  return toolMatchesRuleName(context, agentToolName, agentType);
}
//@ chunk-gg17c06d.js:14212-14421 layout
function ruleMatcherForRules(rules) {
  let mapped = rules
    .filter((rule) => rule.ruleValue.ruleContent === undefined)
    .map((rule) => ({
      rule,
      ruleName: getRuleNameMatchers(rule),
    }));
  return (tool) => {
    let toolMatchInfo = getToolMatchInfo(tool, undefined);
    return mapped
      .filter(({ rule, ruleName }) => toolMatchesRuleName(tool, rule, {}, ruleName, toolMatchInfo))
      .map(({ rule }) => rule);
  };
}
//@ chunk-gg17c06d.js:14421-15318 layout
/**
 * 规则工具名是否匹配工具：同名、家族父工具、别名展开、glob 名、MCP 服务器级规则（mcp__server / mcp__server__*）。
 */
function toolMatchesRuleName(
  tool,
  rule,
  { proxyExpansion = false, globMatching = false, toolAliases } = {},
  nameMatchers = getRuleNameMatchers(rule),
  matchInfo = getToolMatchInfo(tool, toolAliases),
) {
  if (rule.ruleBehavior !== "allow" && tool.mcpInfo !== undefined) {
    let options = {
      proxyExpansion,
      globMatching,
      toolAliases,
    };
    if (
      matchInfo.otherDenyOrAskReads().some((aliasInfo) =>
        toolMatchesRuleName(
          {
            name: aliasInfo.name,
          },
          rule,
          options,
          nameMatchers,
          aliasInfo,
        ),
      )
    )
      return true;
    let standardRow = standardKeyRuleRow(rule.ruleValue.toolName, matchInfo.name);
    if (
      standardRow !== undefined &&
      toolMatchesRuleName(
        {
          name: standardRow.row,
        },
        withRuleToolName(standardRow.rule, rule),
        options,
      )
    )
      return true;
  }
  let ruleToolName = matchInfo.name;
  if (rule.ruleValue.toolName === ruleToolName) return true;
  let familyParentToolName = "familyParentToolName" in tool ? tool.familyParentToolName : undefined;
  if (
    familyParentToolName !== undefined &&
    tool.mcpInfo === undefined &&
    rule.ruleValue.toolName === familyParentToolName
  )
    return true;
  if (proxyExpansion && toolNameVariants(rule.ruleValue.toolName, toolAliases).includes(ruleToolName))
    return true;
  let { matchesGlob } = nameMatchers;
  if (
    globMatching &&
    matchesGlob !== undefined &&
    (matchesGlob(ruleToolName) || (proxyExpansion && matchInfo.aliasSources().some(matchesGlob)))
  )
    return true;
  let coversMcp = nameMatchers.coversMcpTool(matchInfo.mcpInfo());
  if (rule.ruleBehavior === "allow") {
    if (!coversMcp) return false;
    if (ruleWithinServerPrefix(rule.ruleValue.toolName, tool)) return true;
    warnMcpRuleMismatch(rule.ruleValue, tool);
    return false;
  }
  return (
    coversMcp ||
    (isUserMcpServerRule(rule) && matchInfo.mcpServerRuleNames().includes(rule.ruleValue.toolName))
  );
}
//@ chunk-gg17c06d.js:15318-15410 layout
function isUserMcpServerRule({ source, ruleValue }) {
  return source !== "mcpServerPolicy" && ruleValue.toolName.startsWith(MCP_TOOL_PREFIX);
}
//@ chunk-gg17c06d.js:15410-15544 layout
function getRuleNameMatchers({ ruleValue: { toolName } }) {
  let regex;
  let mcpMatcher;
  return {
    matchesGlob: hasWildcard(toolName)
      ? (candidateName) => (regex ??= wildcardRuleRegex(toolName))(candidateName)
      : undefined,
    coversMcpTool: (mcpInfo) => (mcpMatcher ??= compileMcpRuleMatcher(toolName))(mcpInfo),
  };
}
//@ chunk-gg17c06d.js:15544-15750 layout
/**
 * 构造工具匹配信息（惰性计算）：工具名、MCP 信息、别名来源、MCP 服务器规则名、其他 deny/ask 读取名。
 */
function getToolMatchInfo(tool, toolAliases) {
  let toolNameForPermissionCheck = getToolNameForPermissionCheck_2(tool);
  let aliasSourcesCache;
  let serverRuleNamesCache;
  let otherReadsCache;
  let mcpInfoCache;
  return {
    name: toolNameForPermissionCheck,
    mcpInfo: () =>
      mcpInfoCache === undefined
        ? (mcpInfoCache = mcpInfoFromString(toolNameForPermissionCheck))
        : mcpInfoCache,
    aliasSources: () => (aliasSourcesCache ??= aliasesFor(toolNameForPermissionCheck, toolAliases)),
    mcpServerRuleNames: () => (serverRuleNamesCache ??= getMcpServerRulePrefixes(tool)),
    otherDenyOrAskReads: () =>
      (otherReadsCache ??= getMcpToolAliasNames(tool).map((name) =>
        getToolMatchInfo(
          {
            name,
          },
          toolAliases,
        ),
      )),
  };
}
//@ chunk-gg17c06d.js:15750-15817 layout
function toolCheckPermissions(tool) {
  return tool.mcpInfo === undefined ? undefined : tool.checkPermissions;
}
//@ chunk-gg17c06d.js:15817-15879 file-local
function toolAlwaysAllowedRule(context, tool) {
  return (
    getAllowRules(context, toolCheckPermissions(tool)).find((rule) => toolMatchesWholeToolRule(tool, rule)) ||
    null
  );
}
//@ chunk-gg17c06d.js:15879-15951 layout
/**
 * 该规则是否允许别名展开：cliArg 与 toolsNarrowing 来源不展开。
 */
function allowsAliasExpansion(rule) {
  return rule.source !== "cliArg" && rule.source !== "toolsNarrowing";
}
//@ chunk-gg17c06d.js:15951-16355 layout
/**
 * 规则是否命中工具：按名字（含别名、glob）匹配，再检查 aliasSkillToolNames 与打包别名 skill 名。
 */
function toolMatchesRule(
  toolPermissionContext,
  tool,
  rule,
  nameMatchers = getRuleNameMatchers(rule),
  matchInfo,
  includePackagingAliases = false,
) {
  let options = {
    proxyExpansion: allowsAliasExpansion(rule),
    globMatching: true,
    toolAliases: toolPermissionContext.toolAliases,
  };
  if (toolMatchesRuleName(tool, rule, options, nameMatchers, matchInfo)) return true;
  if (
    ("aliasSkillToolNames" in tool ? tool.aliasSkillToolNames : undefined)?.some((name) =>
      toolMatchesRuleName(
        {
          name,
        },
        rule,
        options,
        nameMatchers,
      ),
    )
  )
    return true;
  let packagingAliasSkillToolNames =
    "packagingAliasSkillToolNames" in tool ? tool.packagingAliasSkillToolNames : undefined;
  if (
    packagingAliasSkillToolNames === undefined ||
    (hasWildcard(rule.ruleValue.toolName) && !isSkillPluginSurfaceEnabled(includePackagingAliases))
  )
    return false;
  return packagingAliasSkillToolNames.some((name) =>
    toolMatchesRuleName(
      {
        name,
      },
      rule,
      options,
      nameMatchers,
    ),
  );
}
//@ chunk-gg17c06d.js:16355-16481 layout
/**
 * 找命中该工具的 deny 规则（会话结束类工具除外），返回规则或 null。
 */
function getDenyRuleForTool(toolPermissionContext, tool, denyRules, includePackagingAliases = false) {
  if (isConversationEndTool(tool)) return null;
  let matchInfo;
  return (
    (denyRules ?? deniedBashRules(toolPermissionContext)).find((rule) =>
      toolMatchesRuleWithAliases(
        tool,
        rule,
        toolPermissionContext,
        undefined,
        (matchInfo ??= getToolMatchInfo(tool, toolPermissionContext.toolAliases)),
        includePackagingAliases,
      ),
    ) || null
  );
}
//@ chunk-gg17c06d.js:16481-16522 layout
function isWildcardOnlyContent(ruleContent) {
  return /^[\s*]+$/.test(ruleContent);
}
//@ chunk-gg17c06d.js:16522-16627 layout
function isRootWildcardPathContent(ruleContent) {
  return (
    ruleContent.startsWith("//") && /^\/(?:\*\*\/)?\*+(?:\/\*\*)?$/.test(ruleContent.replace(/\/{2,}/g, "/"))
  );
}
//@ chunk-gg17c06d.js:16627-16722 layout
var EDIT_FAMILY_TOOLS; // deferred: uses GREP_TOOL_NAME (../../tools/GrepTool/prompt.js) of its import cycle while loading; runs once the cycle is complete
var READ_FAMILY_TOOLS;
var BROAD_PATH_RULE_COVERAGE;
deferInit("chunk-gg17c06d.js:16627", () => {
  EDIT_FAMILY_TOOLS = [EDIT, FILE_WRITE_TOOL_NAME, NOTEBOOK_EDIT_TOOL_NAME];
  READ_FAMILY_TOOLS = [READ, GREP_TOOL_NAME, GLOB_TOOL_NAME];
  BROAD_PATH_RULE_COVERAGE = new Map([
    [
      READ,
      {
        deny: [...READ_FAMILY_TOOLS, EDIT, FILE_WRITE_TOOL_NAME],
        ask: READ_FAMILY_TOOLS,
      },
    ],
    [
      EDIT,
      {
        deny: EDIT_FAMILY_TOOLS,
        ask: EDIT_FAMILY_TOOLS,
      },
    ],
  ]);
});
//@ chunk-gg17c06d.js:16722-16895 layout (2.1.88 match: getRuleByContentsForToolName, 1)
function ruleCoversToolViaBroadContent({ ruleBehavior, ruleValue: { toolName, ruleContent } }, aliasName) {
  if (ruleContent === undefined || ruleBehavior === "allow") return false;
  return toolName === BASH_TOOL_NAME
    ? aliasName === BASH_TOOL_NAME && isWildcardOnlyContent(ruleContent)
    : isRootWildcardPathContent(ruleContent) &&
        (BROAD_PATH_RULE_COVERAGE.get(toolName)?.[ruleBehavior] ?? []).includes(aliasName);
}
//@ chunk-gg17c06d.js:16895-17123 layout
/**
 * 带别名的规则匹配：无内容规则走 toolMatchesRule；有内容规则检查别名来源上的宽泛内容是否覆盖该工具。
 */
function toolMatchesRuleWithAliases(
  toolPermissionContext,
  tool,
  rule,
  nameMatchers,
  toolMatchInfo,
  includePackagingAliases = false,
) {
  if (tool.ruleValue.ruleContent === undefined)
    return toolMatchesRule(
      rule,
      toolPermissionContext,
      tool,
      nameMatchers,
      toolMatchInfo,
      includePackagingAliases,
    );
  let { name: toolName, aliasSources } =
    toolMatchInfo ?? getToolMatchInfo(toolPermissionContext, rule.toolAliases);
  let isDirectMatch = tool.ruleValue.toolName === toolName;
  let expandsAliases = allowsAliasExpansion(tool);
  return aliasSources().some(
    (aliasName) =>
      aliasName !== toolName &&
      ((expandsAliases && ruleCoversToolViaBroadContent(tool, aliasName)) ||
        (isDirectMatch && ruleCoversToolViaBroadContent(withRuleToolName(aliasName, tool), aliasName))),
  );
}
//@ chunk-gg17c06d.js:17123-17190 layout
function withRuleToolName(toolName, rule) {
  return {
    ...rule,
    ruleValue: {
      ...rule.ruleValue,
      toolName,
    },
  };
}
//@ chunk-gg17c06d.js:17190-17273 layout
/**
 * 规则名是否为模式名（glob 名或只到 MCP 服务器一级的名字）。
 */
function isPatternRuleName(toolName) {
  if (hasWildcard(toolName)) return true;
  let mcpInfo = mcpInfoFromString(toolName);
  return mcpInfo !== null && mcpInfo.toolName === undefined;
}
//@ chunk-gg17c06d.js:17273-17726 layout
/**
 * 为一组 deny 规则建索引：整名集合、模式规则、MCP 服务器名、带内容但经别名覆盖的规则等，供批量过滤工具池。
 */
function buildDenyRuleIndex(toolPermissionContext, rules) {
  let names = new Set();
  let parentNames = new Set();
  let mcpServerNames = new Set();
  let patterns = [];
  let withContent = [];
  for (let rule of rules) {
    let { toolName, ruleContent } = rule.ruleValue;
    if (ruleContent !== undefined) {
      if (
        Object.entries(toolPermissionContext.toolAliases ?? {}).some(
          ([key, value]) =>
            ruleCoversToolViaBroadContent(rule, key) ||
            (value === toolName && ruleCoversToolViaBroadContent(withRuleToolName(key, rule), key)),
        )
      )
        withContent.push(rule);
      continue;
    }
    if (isPatternRuleName(toolName) || ruleWithNormalizedServer(toolName)) {
      patterns.push({
        rule,
        ruleName: getRuleNameMatchers(rule),
      });
      continue;
    }
    if (isUserMcpServerRule(rule)) mcpServerNames.add(toolName);
    parentNames.add(toolName);
    let variants = allowsAliasExpansion(rule)
      ? toolNameVariants(toolName, toolPermissionContext.toolAliases)
      : [toolName];
    for (let variant of variants) names.add(variant);
  }
  return {
    names,
    parentNames,
    mcpServerNames,
    patterns,
    withContent,
  };
}
//@ chunk-gg17c06d.js:17726-17785 layout
function getDenyRuleIndex(toolPermissionContext) {
  let rules = deniedBashRules(toolPermissionContext);
  return {
    rules,
    index: buildDenyRuleIndex(toolPermissionContext, rules),
  };
}
//@ chunk-gg17c06d.js:17785-18732 layout
/**
 * 用 deny 规则索引判断工具是否被拒绝：名字、其他读名、父工具名、别名 skill 名、MCP 服务器名、模式规则、带内容的覆盖规则依次检查。
 */
function isToolDeniedByIndex(toolPermissionContext, index, tool) {
  if (
    isConversationEndTool(tool) ||
    (index.names.size === 0 && index.patterns.length === 0 && index.withContent.length === 0)
  )
    return false;
  let toolMatchInfo = getToolMatchInfo(tool, toolPermissionContext.toolAliases);
  if (index.names.has(toolMatchInfo.name)) return true;
  if (
    toolMatchInfo
      .otherDenyOrAskReads()
      .some(
        (aliasInfo) =>
          index.names.has(aliasInfo.name) ||
          aliasInfo.mcpServerRuleNames().some((prefix) => index.mcpServerNames.has(prefix)),
      )
  )
    return true;
  let familyParentToolName = "familyParentToolName" in tool ? tool.familyParentToolName : undefined;
  if (
    familyParentToolName !== undefined &&
    tool.mcpInfo === undefined &&
    index.parentNames.has(familyParentToolName)
  )
    return true;
  let aliasSkillToolNames = "aliasSkillToolNames" in tool ? tool.aliasSkillToolNames : undefined;
  if (aliasSkillToolNames?.some((aliasSkillToolName) => index.names.has(aliasSkillToolName))) return true;
  let packagingAliasSkillToolNames =
    "packagingAliasSkillToolNames" in tool ? tool.packagingAliasSkillToolNames : undefined;
  if (
    packagingAliasSkillToolNames?.some((packagingAliasSkillToolName) =>
      index.names.has(packagingAliasSkillToolName),
    )
  )
    return true;
  if (
    index.mcpServerNames.size > 0 &&
    (toolMatchInfo.mcpServerRuleNames().some((prefix) => index.mcpServerNames.has(prefix)) ||
      [...(aliasSkillToolNames ?? []), ...(packagingAliasSkillToolNames ?? [])].some((name) =>
        getMcpServerRulePrefixes({
          name,
        }).some((prefix) => index.mcpServerNames.has(prefix)),
      ))
  )
    return true;
  return (
    index.patterns.some(({ rule, ruleName }) =>
      toolMatchesRuleWithAliases(tool, rule, toolPermissionContext, ruleName, toolMatchInfo),
    ) ||
    (toolMatchInfo.aliasSources().length > 0 &&
      index.withContent.some((rule) =>
        toolMatchesRuleWithAliases(tool, rule, toolPermissionContext, undefined, toolMatchInfo),
      ))
  );
}
//@ chunk-gg17c06d.js:18732-18927 layout
/**
 * 会话结束类工具是否被整工具 deny 拒绝（存在同名 allow 规则时不算）。
 */
function isConversationEndToolDenied(toolPermissionContext, tool) {
  if (!isConversationEndTool(tool)) return false;
  if (getAllowRules(toolPermissionContext).some((allowRule) => allowRule.ruleValue.toolName === tool.name))
    return false;
  return deniedBashRules(toolPermissionContext).some((denyRule) =>
    toolMatchesWholeToolRule(tool, denyRule, {
      proxyExpansion: allowsAliasExpansion(denyRule),
      globMatching: true,
      toolAliases: toolPermissionContext.toolAliases,
    }),
  );
}
//@ chunk-gg17c06d.js:18927-19030 layout (2.1.88 match: getDenyRuleForAgent, 1)
/**
 * 找 toolName 与 ruleContent 精确相等的 deny 规则（例如 Agent(type)）。
 */
function findDenyRuleWithContent(context, agentToolName, agentType) {
  return (
    deniedBashRules(context).find(
      (rule) => rule.ruleValue.toolName === agentToolName && rule.ruleValue.ruleContent === agentType,
    ) || null
  );
}
//@ chunk-gg17c06d.js:19030-19134 layout (2.1.88 match: getDenyRuleForAgent, 1)
/**
 * 找 toolName 与 ruleContent 精确相等的 ask 规则。
 */
function findAskRuleWithContent(context, agentToolName, agentType) {
  return (
    askedBashRules(context).find(
      (rule) => rule.ruleValue.toolName === agentToolName && rule.ruleValue.ruleContent === agentType,
    ) || null
  );
}
//@ chunk-gg17c06d.js:19134-19322 fingerprint (2.1.88 match: filterDeniedAgents, 1)
/**
 * 按 Agent(type) deny 规则过滤代理列表。
 */
function filterDeniedAgents(agents, context, agentToolName) {
  let deniedAgentTypes = new Set();
  for (let rule of deniedBashRules(context))
    if (rule.ruleValue.toolName === agentToolName && rule.ruleValue.ruleContent !== undefined)
      deniedAgentTypes.add(rule.ruleValue.ruleContent);
  return agents.filter((agent) => !deniedAgentTypes.has(agent.agentType));
}
//@ chunk-gg17c06d.js:19322-19447 layout
function findAskRuleForTool(context, tool, askRules) {
  if (isConversationEndTool(tool)) return null;
  let matchInfo;
  return (
    (askRules ?? askedBashRules(context, toolCheckPermissions(tool))).find((rule) =>
      toolMatchesRuleWithAliases(
        tool,
        rule,
        context,
        undefined,
        (matchInfo ??= getToolMatchInfo(tool, context.toolAliases)),
      ),
    ) || null
  );
}
//@ chunk-gg17c06d.js:19447-19550 placement
function stringifyScalar(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object") return String(value);
  return null;
}
//@ chunk-gg17c06d.js:19550-19701 placement
function parseFieldRuleContent(content) {
  let index = content.indexOf(":");
  if (index <= 0) return null;
  let trimmed = content.slice(0, index).trim();
  let trimmed_2 = content.slice(index + 1).trim();
  return trimmed === "" || trimmed_2 === ""
    ? null
    : {
        key: trimmed,
        expected: trimmed_2,
      };
}
//@ chunk-gg17c06d.js:19701-19799 placement
function formatRuleDeniedMessage(name, rule) {
  return `Permission to use ${name} with ${rule.ruleValue.ruleContent} has been denied.`;
}
//@ chunk-gg17c06d.js:19799-19941 layout
function sanitizeExpectedPattern(expected) {
  let replaced = expected.replace(/[^a-zA-Z0-9_*-]/g, "_");
  return {
    pattern: replaced,
    collapsed: replaced.replace(/_+/g, "_").replace(/_$/, "").replace(/_?\*/g, "*"),
  };
}
//@ chunk-gg17c06d.js:19941-19971 placement
var MCP_RESOURCE_TOOLS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-gg17c06d.js:19941", () => {
  MCP_RESOURCE_TOOLS = new Set([
    LISTMCPRESOURCESTOOL,
    READ_MCP_RESOURCE_DIR_TOOL_NAME,
    READMCPRESOURCETOOL,
    REFRESH_MCP_TOOLS_TOOL_NAME,
  ]);
});
//@ chunk-gg17c06d.js:19971-21462 placement
/**
 * 匹配 "key: expected" 形式的字段规则：对工具（及其别名、家族、MCP 服务器）的同行为规则，取输入字段值做通配比较；MCP 资源工具的 server 字段与 skill 名特判。
 */
function matchToolRule(context, tool, input, behavior) {
  let toolNameForPermissionCheck = getToolNameForPermissionCheck_2(tool);
  let skillAliasNames = [
    ...("aliasSkillToolNames" in tool ? (tool.aliasSkillToolNames ?? []) : []),
    ...("packagingAliasSkillToolNames" in tool ? (tool.packagingAliasSkillToolNames ?? []) : []),
  ];
  let nameCandidates = [
    [toolNameForPermissionCheck, false],
    ...getMcpToolAliasNames(tool).map((aliasName) => [aliasName, false]),
    ...(tool.mcpInfo !== undefined && isServerIdentityActive()
      ? (behavior === "deny" ? deniedBashRules(context) : askedBashRules(context))
          .map((rule) => rule.ruleValue.toolName)
          .filter((ruleToolName) => {
            let row = standardKeyRuleRow(ruleToolName, toolNameForPermissionCheck);
            return row !== undefined && row.rule === row.row;
          })
          .map((serverRuleName) => [serverRuleName, false])
      : []),
    ...skillAliasNames.map((aliasName) => [aliasName, false]),
    ...aliasesFor(toolNameForPermissionCheck, context.toolAliases).map((alias) => [alias, true]),
  ];
  for (let [candidateName, isAlias] of nameCandidates) {
    let filtered = getContentRulesForToolName(context, candidateName, behavior).filter(
      (rule) => !isAlias || allowsAliasExpansion(rule),
    );
    for (let [ruleContent = "", rule] of new Map(
      filtered.map((contentRule) => [contentRule.ruleValue.ruleContent, contentRule]),
    )) {
      let fieldRuleContent = parseFieldRuleContent(ruleContent);
      if (fieldRuleContent === null) continue;
      let { key, expected } = fieldRuleContent;
      if (key === tool.ruleContentField) continue;
      let inputField =
        key === DEVICE_2 && !Object.hasOwn(input, key) && Object.hasOwn(input, HOST_TOOL_INPUT_FIELD)
          ? HOST_TOOL_INPUT_FIELD
          : key;
      if (!Object.hasOwn(input, inputField)) continue;
      let fieldValue = stringifyScalar(input[inputField]);
      if (fieldValue === null) continue;
      if (matchWildcard(expected, fieldValue.trim())) return rule;
      if (inputField === "server" && MCP_RESOURCE_TOOLS.has(candidateName)) {
        let { pattern, collapsed } = sanitizeExpectedPattern(expected);
        if (
          [fieldValue.trim(), fieldValue]
            .map(CLAUDEAI_SERVER_PREFIX)
            .flatMap((normalizedName) => [
              normalizedName,
              trimEndChars(normalizedName, "_").replace(/^_+/, ""),
            ])
            .some((candidateValue) =>
              expected.startsWith(CLAUDE_AI_NAME_PREFIX)
                ? matchWildcard(collapsed, candidateValue)
                : matchWildcard(pattern, candidateValue) ||
                  (expected.includes("*") &&
                    !pattern.startsWith("_") &&
                    `${candidateValue}_`.startsWith(CLAUDE_AI) &&
                    matchWildcard(collapsed, candidateValue)),
            )
        )
          return rule;
      }
      if (
        inputField === HOST_TOOL_INPUT_FIELD &&
        (expected.includes("*")
          ? matchWildcard(expected.toLowerCase(), fieldValue.trim())
          : machineNameMatches(expected, fieldValue.trim()))
      )
        return rule;
      if (toolNameForPermissionCheck === SKILL && inputField === "skill") {
        let name = fieldValue.trim();
        let syncedSkillAlias = toSyncedSkillAlias(name);
        if (syncedSkillAlias !== undefined) {
          if ((!expected.includes("*") || isTopHostSession()) && matchWildcard(expected, syncedSkillAlias))
            return rule;
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
//@ chunk-gg17c06d.js:21462-21503 placement
function getContentRulesMapForTool(context, tool, behavior) {
  return getContentRulesMapForToolName(context, getToolNameForPermissionCheck_2(tool), behavior);
}
//@ chunk-gg17c06d.js:21503-21638 placement (2.1.88 match: getDenyRuleForAgent, 1)
function getContentRulesMapForToolName(context, agentToolName, agentType) {
  let rulesByContent = new Map();
  for (let rule of getContentRulesForToolName(context, agentToolName, agentType))
    if (rule.ruleValue.ruleContent !== undefined) rulesByContent.set(rule.ruleValue.ruleContent, rule);
  return rulesByContent;
}
//@ chunk-gg17c06d.js:21638-21706 layout
function context(context, tool, behavior) {
  return getContentRulesForToolName(context, getToolNameForPermissionCheck_2(tool), behavior).filter(
    (rule) => RULE_SOURCE_IS_SESSION_LIKE[rule.source],
  );
}
//@ chunk-gg17c06d.js:21706-21978 placement (2.1.88 match: getRuleByContentsForToolName, 1)
function getContentRulesForToolName(context, toolName, behavior) {
  let allRules = [];
  switch (behavior) {
    case "allow":
      allRules = getAllowRules(context);
      break;
    case "deny":
      allRules = deniedBashRules(context);
      break;
    case "ask":
      allRules = askedBashRules(context);
      break;
  }
  let rules = [];
  for (let rule of allRules)
    if (
      rule.ruleValue.toolName === toolName &&
      rule.ruleValue.ruleContent !== undefined &&
      rule.ruleBehavior === behavior &&
      !(behavior === "allow" && permissionRuleValueFromString(rule.ruleValue))
    )
      rules.push(rule);
  return rules;
}
//@ chunk-nt9amew5.js:35384-35458 placement
var TENGU_BUZZING_PELICAN; // deferred: uses DEVICE_BASH_TOOL (../../services/mcp/firstPartyServerIds.js) of its import cycle while loading; runs once the cycle is complete
var DEVICE_TOOLS_WITH_CLASSIFIER_ROLE;
var TENGU_DEEP_DUSK;
deferInit("chunk-nt9amew5.js:35384", () => {
  TENGU_BUZZING_PELICAN = "tengu_buzzing_pelican";
  DEVICE_TOOLS_WITH_CLASSIFIER_ROLE = new Set([DEVICE_BASH_TOOL, DEVICE_COMMIT_FILES_TOOL]);
  TENGU_DEEP_DUSK = "tengu_deep_dusk";
});
//@ chunk-nt9amew5.js:35458-35553 placement
/**
 * isClassifierRoutedMcpTool：该 MCP 工具交由分类器裁决。
 */
function isClassifierRoutedMcpTool(tool, toolPermissionContext) {
  if (tool.mcpInfo === undefined) return false;
  let effectiveMode = isAutoAllowedInMode(tool, toolPermissionContext);
  return (
    isDeepDuskDeviceTool(getToolNameForPermissionCheck_2(tool), effectiveMode, toolPermissionContext) ||
    isBuzzingPelicanRouted(effectiveMode, toolPermissionContext)
  );
}
//@ chunk-nt9amew5.js:35553-35617 placement
/**
 * isDeepDuskDeviceTool：设备工具在 deep_dusk 开关下走仲裁。
 */
function isDeepDuskDeviceTool(toolName, mode, toolPermissionContext) {
  return (
    DEVICE_TOOLS_WITH_CLASSIFIER_ROLE.has(toolName) &&
    isRemoteArbiterMode(mode, toolPermissionContext) &&
    readFlagWithOverride(TENGU_DEEP_DUSK, {
      safe: true,
    })
  );
}
//@ chunk-nt9amew5.js:35617-35660 placement
/**
 * isBuzzingPelicanRouted：仲裁器下按 buzzing_pelican 开关放行。
 */
function isBuzzingPelicanRouted(mode, toolPermissionContext) {
  return (
    isRemoteArbiterMode(mode, toolPermissionContext) &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_BUZZING_PELICAN, false)
  );
}
//@ chunk-nt9amew5.js:35660-35754 placement
function isRemoteArbiterMode(mode, toolPermissionContext) {
  return (
    env.CLAUDE_CODE_REMOTE &&
    isAutoClassifierActive(mode, toolPermissionContext.servedCall === true) &&
    getAutoModeClassifierRole(toolPermissionContext.mode) === "arbiter"
  );
}
//@ chunk-nt9amew5.js:35754-35784 placement
var TENGU_DAPPER_TRUFFLE = "tengu_dapper_truffle";
//@ chunk-nt9amew5.js:35784-35908 placement
function shouldClassifyDestructiveMcpWrite(tool, input, mode, servedCall) {
  return (
    isAutoClassifierActive(mode, servedCall) &&
    (tool.isDestructive?.(input) ?? false) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_cowork_auto_mode_include_allowed_write_mcp", isCcsTenant())
  );
}
//@ chunk-nt9amew5.js:35908-35987 layout
function isCoworkAllowedWriteMcpIncluded() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cowork_auto_mode_include_allowed_write_mcp", false);
}
//@ chunk-nt9amew5.js:35987-36085 placement
function shouldClassifyRemoteMcpWrite(tool, input, mode, toolPermissionContext) {
  return (
    tool.mcpInfo !== undefined &&
    env.CLAUDE_CODE_REMOTE &&
    shouldClassifyDestructiveMcpWrite(tool, input, mode, toolPermissionContext.servedCall === true)
  );
}
//@ chunk-nt9amew5.js:36085-36166 placement
function hasMcpServerPolicyAllow(tool, toolPermissionContext) {
  return getAllowRules(toolPermissionContext).some(
    (rule) => rule.source === "mcpServerPolicy" && toolMatchesWholeToolRule(tool, rule),
  );
}
//@ chunk-nt9amew5.js:36166-36296 placement
function getClassifierOverridableRuleSource(rule, tool, mode, servedCall, toolPermissionContext) {
  let { source } = rule;
  return (source === "cliArg" || source === "command" || source === "session" || source === "mcpMount") &&
    shouldClassifyRemoteMcpWritePolicy(tool, mode, servedCall, toolPermissionContext)
    ? source
    : undefined;
}
//@ chunk-nt9amew5.js:36296-36347 placement
function shouldClassifyRemoteMcpWritePolicy(tool, mode, servedCall, toolPermissionContext) {
  return (
    shouldClassifyRemoteMcpWrite(tool, mode, servedCall, toolPermissionContext) &&
    hasMcpServerPolicyAllow(tool, toolPermissionContext)
  );
}
//@ chunk-nt9amew5.js:36347-36523 placement
function isShadowedServerPolicyRule(rule, tool, mode, servedCall, toolPermissionContext, getRole) {
  return (
    (rule.source === "cliArg" || rule.source === "session" || rule.source === "mcpMount") &&
    shouldClassifyRemoteMcpWrite(tool, mode, servedCall, toolPermissionContext) &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_DAPPER_TRUFFLE, isCcsCoworkSurface() ? "server" : "off") ===
      "server" &&
    getRole() === "arbiter" &&
    hasMcpServerPolicyAllow(tool, toolPermissionContext)
  );
}
//@ chunk-nt9amew5.js:36523-36763 placement
/**
 * 判断一条规则命中的 MCP 调用该走哪条分类器路径：serverPolicy、remoteSession 或 shadowedServerPolicy；不适用返回 undefined。
 */
function getMcpRuleClassifierRoute(rule, tool, mode, servedCall, toolUseContext, getRole) {
  if (rule === null) return;
  if (rule.source === "mcpServerPolicy" && shouldClassifyDestructiveMcpWrite(tool, mode, servedCall, false))
    return "serverPolicy";
  if (tool.mcpInfo === undefined) return;
  let toolPermissionContext = getToolPermissionContext(toolUseContext);
  if (isClassifierRoutedMcpTool(tool, toolPermissionContext)) return "remoteSession";
  return isShadowedServerPolicyRule(rule, tool, mode, servedCall, toolPermissionContext, getRole)
    ? "shadowedServerPolicy"
    : undefined;
}
//@ chunk-5xgkngpb.js:51739-51762 placement
function isChainOnAllowActive() {
  return false;
}
//@ chunk-5xgkngpb.js:1010334-1010609 placement
/**
 * tools 列表含 "*" 时，从 Agent(type1,type2) 形式的条目收集 allowedAgentTypes；未定义返回 {}，不含 "*" 或出现非 Agent 条目返回 null。
 */
function parseWildcardAgentTypes(tools) {
  if (tools === undefined) return {};
  if (!tools.includes("*")) return null;
  let agentTypes;
  for (let tool of tools) {
    if (tool === "*") continue;
    let { toolName, ruleContent } = parseRuleString(tool);
    if (toolName !== AGENT || !ruleContent) return null;
    agentTypes ??= [];
    agentTypes.push(
      ...ruleContent
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean),
    );
  }
  return agentTypes
    ? {
        allowedAgentTypes: agentTypes,
      }
    : {};
}
//@ chunk-5xgkngpb.js:1010609-1010693 placement
/**
 * canPromptUserForPermission：存在可交互提示通道（非交互时需显式提示工具）。
 */
function canPromptUserForPermission() {
  if (getAllowedChannels().length > 0 && getIsNonInteractiveSession()) return false;
  if (getIsNonInteractiveSession() && !hasPermissionPromptTool(getPermissionPromptToolName())) return false;
  return true;
}
//@ chunk-5xgkngpb.js:1010693-1010786 placement
/**
 * shouldReplaceMemoryInput：Live 记忆工具的输入被替换。
 */
function shouldReplaceMemoryInput(tool, originalInput, replacementInput, allowEmpty = false) {
  return (
    isLiveMemoryToolName(tool) &&
    replacementInput !== undefined &&
    !(allowEmpty && Object.keys(replacementInput).length === 0) &&
    !isSameAnswerInput(replacementInput, originalInput)
  );
}
//@ chunk-5xgkngpb.js:1010786-1010815 placement
/**
 * isLiveMemoryToolName：是否为 Live 记忆工具。
 */
function isLiveMemoryToolName(tool) {
  return isLiveMemoryTool(tool);
}
//@ chunk-5xgkngpb.js:1170822-1170917 fingerprint (2.1.88 match: getDenyRuleForAgent, 1)
function getDenyRuleForAgent(predicate, rules) {
  return rules.find(
    ({ ruleValue: { ruleContent } }) =>
      ruleContent !== undefined &&
      !hasCertifiedPrefix(ruleContent) &&
      predicate(parseBashPermissionRule(ruleContent)),
  );
}
//@ chunk-5xgkngpb.js:1268737-1268761 placement
function EMPTY_RULE_ANNOTATIONS() {
  return {};
}
//@ chunk-5xgkngpb.js:1268761-1269028 placement
/**
 * 按决策原因里的规则（子命令结果递归）查注释表，命中返回带前导空格的说明后缀，否则空串。
 */
function getRuleAnnotationSuffix(
  decisionReason,
  annotations = EMPTY_RULE_ANNOTATIONS(),
  commandAnnotations = ruleReasons,
) {
  if (decisionReason?.type === "rule") {
    let { rule } = decisionReason;
    let ruleText = permissionRuleValueFromString_2(rule.ruleValue);
    let annotation =
      annotations[ruleText] ?? (rule.source === "command" ? commandAnnotations[ruleText] : undefined);
    return annotation ? ` ${annotation}` : "";
  }
  if (decisionReason?.type === "subcommandResults")
    for (let reason of decisionReason.reasons.values()) {
      let ruleAnnotationSuffix = getRuleAnnotationSuffix(
        reason.decisionReason,
        annotations,
        commandAnnotations,
      );
      if (ruleAnnotationSuffix) return ruleAnnotationSuffix;
    }
  return "";
}
//@ chunk-5xgkngpb.js:1269028-1269147 placement
function appendRuleAnnotation(decision) {
  let ruleAnnotationSuffix = getRuleAnnotationSuffix(decision.decisionReason);
  if (ruleAnnotationSuffix === "" || decision.message.endsWith(ruleAnnotationSuffix)) return decision;
  return {
    ...decision,
    message: decision.message + ruleAnnotationSuffix,
  };
}
//@ chunk-5xgkngpb.js:1285731-1285789 placement
var TENGU_JAUNTY_UMBRELLA = "tengu_jaunty_umbrella";
var TENGU_TOASTY_FIDDLE = "tengu_toasty_fiddle";
//@ chunk-5xgkngpb.js:1285789-1285827 placement
/**
 * isWebFetchOrSearch：是否为 WebFetch/WebSearch。
 */
function isWebFetchOrSearch(toolName) {
  return toolName === WEBFETCH || toolName === WEBSEARCH;
}
//@ chunk-5xgkngpb.js:1285827-1285906 placement
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
//@ chunk-5xgkngpb.js:1285906-1286200 placement
/**
 * 判断 WebFetch/WebSearch 是否交给 auto 分类器处理：调用方已声明、Cowork 且分类器启用时按分类器角色（arbiter 读 tengu_jaunty_umbrella，off/shadow 读 tengu_toasty_fiddle 列表）决定。
 */
function isWebToolClassifierRouted_2(toolName, mode, toolPermissionContext) {
  if (toolPermissionContext.callerClassifiesWebCalls?.includes(toolName)) return true;
  if (!isCoworkAny() || !isAutoClassifierActive(mode, toolPermissionContext.servedCall === true))
    return false;
  switch (getAutoModeClassifierRole(toolPermissionContext.mode)) {
    case "arbiter":
      return readFlagWithOverride(TENGU_JAUNTY_UMBRELLA, {
        safe: true,
      });
    case "off":
    case "shadow": {
      let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_TOASTY_FIDDLE, []);
      return (
        Array.isArray(featureValue_CACHED_MAY_BE_STALE) && featureValue_CACHED_MAY_BE_STALE.includes(toolName)
      );
    }
    case "arbiterWithLocalFallback":
      return false;
  }
}
//@ chunk-5xgkngpb.js:1286200-1286409 placement
/**
 * 复制权限上下文并切换模式，同时记录由分类器裁决的 Web 工具（callerClassifiesWebCalls）。
 */
function withClassifiedWebCalls(toolPermissionContext, mode) {
  let filtered = [WEBFETCH, WEBSEARCH].filter((toolName) =>
    isWebToolClassifierRouted_2(toolName, toolPermissionContext.mode, toolPermissionContext),
  );
  return {
    ...toolPermissionContext,
    mode,
    mcpPolicyAsksLiftedInAcceptEdits: undefined,
    mcpPolicyFileAsksLiftedInAcceptEdits: undefined,
    ...(filtered.length > 0 && {
      callerClassifiesWebCalls: filtered,
    }),
  };
}
//@ chunk-5xgkngpb.js:1286409-1286455 placement
/**
 * isWebSearchClassifierRouted：WebSearch 是否交给分类器。
 */
function isWebSearchClassifierRouted(tool, toolPermissionContext) {
  return tool.name === WEBSEARCH && isWebToolClassifierRouted(tool, toolPermissionContext);
}
//@ chunk-5xgkngpb.js:1286455-1286498 placement
/**
 * classifierOnlyConfig：取工具的 classifierOnly 配置。
 */
function classifierOnlyConfig(tool) {
  return tool.classifierOnly?.();
}
//@ chunk-5xgkngpb.js:1286498-1286576 placement
var CLASSIFIER_DENY_SOURCES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1286498", () => {
  CLASSIFIER_DENY_SOURCES = new Set(["userSettings", "projectSettings", "localSettings", "session"]);
});
//@ chunk-5xgkngpb.js:1286576-1286777 placement
function isClassifierOnlyToolUnblocked(tool, input, toolUseContext, force = false) {
  let toolPermissionContext = getToolPermissionContext(toolUseContext);
  if (
    force ||
    classifierOnlyConfig(tool)?.onBlock !== "flag" ||
    !isAutoModePermissionSurface(toolPermissionContext)
  )
    return false;
  let contextWithoutClassifierDenies = {
    ...toolPermissionContext,
    alwaysDenyRules: import_reject(toolPermissionContext.alwaysDenyRules, (ruleList, source) =>
      CLASSIFIER_DENY_SOURCES.has(source),
    ),
  };
  return (
    getDenyRuleForTool(contextWithoutClassifierDenies, tool) === null &&
    matchToolRule(contextWithoutClassifierDenies, tool, input, "deny") === null
  );
}
//@ chunk-5xgkngpb.js:1286777-1286944 placement
function buildClassifierOnlyDenial(tool, reason) {
  return {
    behavior: "deny",
    message: `Only the auto-mode classifier can allow ${tool.name}: ${reason}`,
    decisionReason: {
      type: "other",
      reason: `classifierOnly: ${reason}`,
    },
  };
}
//@ chunk-5xgkngpb.js:1286944-1287207 placement
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
//@ chunk-5xgkngpb.js:1287207-1287922 placement
function requireAutoModeClassifierReview(tool, input, toolUseContext, decision) {
  if (classifierOnlyConfig(tool) === undefined || decision?.behavior === "deny") return;
  if (!isAutoModePermissionSurface(getToolPermissionContext(toolUseContext)))
    return buildClassifierOnlyDenial(tool, "the session is not in auto mode");
  if (
    decision?.behavior === "ask" &&
    (isUnclassifiableAskReason(decision.decisionReason) || decision.matchedAskRule?.ruleBehavior === "ask")
  )
    return buildClassifierOnlyDenial(
      tool,
      "this call trips a check only a person may answer, and nobody is asked about this tool's calls",
    );
  return {
    behavior: "ask",
    message:
      decision !== undefined && "message" in decision
        ? decision.message
        : `${tool.name} requires auto-mode classifier review.`,
    updatedInput:
      decision !== undefined && "updatedInput" in decision ? (decision.updatedInput ?? input) : input,
    suppressAlwaysAllowRule: true,
    decisionReason: {
      type: "safetyCheck",
      reason: `Every ${tool.name} call is reviewed by the auto-mode classifier; saved allow rules and hook allows do not apply.`,
      classifierApprovable: true,
    },
  };
}
//@ chunk-5xgkngpb.js:1287922-1288110 placement
function describeNonClassifierAllow(decision) {
  let reasonType = decision.decisionReason?.type;
  return reasonType === undefined
    ? "an allow with no recorded source is not the classifier's verdict"
    : `an allow of type '${reasonType}' is not the classifier's verdict`;
}
//@ chunk-5xgkngpb.js:1288110-1288193 placement (2.1.88 match: awaitClassifierAutoApproval, 0.351)
/**
 * isClassifierAllow：允许且原因类型为 classifier。
 */
function isClassifierAllow(decision) {
  return decision.behavior === "allow" && decision.decisionReason?.type === "classifier";
}
//@ chunk-5xgkngpb.js:1288193-1288472 placement
function enforceClassifierOnlyDecision(tool, decision, allowCounts = false) {
  if (
    classifierOnlyConfig(tool) === undefined ||
    decision.behavior === "deny" ||
    isClassifierAllow(decision) ||
    (allowCounts && decision.behavior === "allow")
  )
    return decision;
  return buildClassifierOnlyDenial(
    tool,
    decision.behavior === "ask"
      ? `no prompt is raised for it, and the classifier did not allow it${decision.decisionReason?.type === "other" ? ` (${decision.decisionReason.reason})` : ""}`
      : describeNonClassifierAllow(decision),
  );
}
//@ chunk-5xgkngpb.js:1288472-1288488 placement
var classifierBlockReasons; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1288472", () => {
  classifierBlockReasons = new Map();
});
//@ chunk-5xgkngpb.js:1288488-1288519 placement
function rememberClassifierBlock(toolUseID, reason) {
  classifierBlockReasons.set(toolUseID, reason);
}
//@ chunk-5xgkngpb.js:1288519-1288596 placement
/**
 * takeClassifierBlock：取出并清除分类器阻断原因。
 */
function takeClassifierBlock(toolUseId) {
  if (toolUseId === undefined) return;
  let reason = classifierBlockReasons.get(toolUseId);
  classifierBlockReasons.delete(toolUseId);
  return reason;
}
//@ chunk-5xgkngpb.js:1288596-1288982 placement
/**
 * 把分类器结果映射为阻断类型：安全护栏拒绝或分类器被关闭为 refused；不可用、转录过长、无法解析、出错为 unavailable（带模型、HTTP 状态、错误类型）。
 */
function getClassifierBlockOutcome(result) {
  if (!result.shouldBlock) return;
  if (result.refusedBySafeguard)
    return {
      kind: "refused",
    };
  if (result.errorKind === CLASSIFIER_SWITCHED_OFF_KIND)
    return {
      kind: "refused",
      switchedOff: true,
    };
  if (
    result.unavailable ||
    result.transcriptTooLong ||
    result.failureMode === "unparseable" ||
    result.errorKind !== undefined
  )
    return {
      kind: "unavailable",
      model: result.model,
      ...(result.httpStatus !== undefined && {
        httpStatus: result.httpStatus,
      }),
      ...(result.errorKind !== undefined && {
        errorKind: result.errorKind,
      }),
    };
  return;
}
//@ chunk-5xgkngpb.js:1288982-1289024 placement
var TOOLS_HELD_UNTIL_A_PERSON_TYPES = "tools_held_until_a_person_types";
//@ chunk-5xgkngpb.js:1289024-1289082 placement
/**
 * isPersonTypesHold：工具被暂停到用户亲自输入。
 */
function isPersonTypesHold(toolPermissionContext) {
  return toolPermissionContext?.toolsHeldUntilAPersonTypes === true;
}
//@ chunk-5xgkngpb.js:1289082-1289409 placement
/**
 * 生成"工具调用已暂停，需用户亲自发新消息才能继续"的拒绝文本。
 */
function buildToolsPausedMessage(name) {
  return `${name} was not run. Tool calls are paused in this session until the user sends a new message themselves; a message that an app or an automation sends does not count. Do not retry or look for another way. Say where things stand, what you would do next, and that a new message from them will let you go on.`;
}
//@ chunk-5xgkngpb.js:1289409-1289442 placement
var CLASSIFIER_ONLY_RULE_IDS; // deferred: uses EXTRA_AUTO_MODE_RULE_IDS (./autoModeRulesPrompt.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1289409", () => {
  CLASSIFIER_ONLY_RULE_IDS = new Set([
    ...ALL_AUTO_MODE_RULE_ID_SET_WITH_COWORK,
    ...UNTRUSTED_CONTENT_RULE_IDS,
  ]);
});
//@ chunk-5xgkngpb.js:1289442-1289501 placement
/**
 * sanitizeRuleCategoryOrUndefined：规则类别白名单化。
 */
function sanitizeRuleCategoryOrUndefined(category) {
  return category !== undefined && CLASSIFIER_ONLY_RULE_IDS.has(category)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(category)
    : undefined;
}
//@ chunk-5xgkngpb.js:1289501-1289541 placement
var SANITIZABLE_RULE_IDS; // deferred: uses AUTO_MODE_RULE_IDS (./autoModeRulesPrompt.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1289501", () => {
  SANITIZABLE_RULE_IDS = new Set([...AUTO_MODE_RULE_IDS, ...COWORK_RULE_IDS, ...UNTRUSTED_CONTENT_RULE_IDS]);
});
//@ chunk-5xgkngpb.js:1289541-1289599 placement
/**
 * sanitizeRuleCategory：规则类别脱敏。
 */
function sanitizeRuleCategory(category) {
  return category !== undefined && SANITIZABLE_RULE_IDS.has(category)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(category)
    : undefined;
}
//@ chunk-5xgkngpb.js:1289599-1289740 placement
/**
 * 把 setAppState 包装成只更新 classifierApprovals 子状态的 setter，值未变时不触发更新。
 */
function makeClassifierApprovalsSetter(setAppState) {
  return (updater) =>
    setAppState((state) => {
      let next = updater(state.classifierApprovals);
      if (next === state.classifierApprovals) return state;
      return {
        ...state,
        classifierApprovals: next,
      };
    });
}
//@ chunk-5xgkngpb.js:1289740-1289882 placement
/**
 * 在分类器审批状态里写入某个 toolUseId 的审批结果，值相同不更新。
 */
function setClassifierApproval(permissionUpdater, toolUseID, reason) {
  if (!permissionUpdater) return;
  permissionUpdater((approvals) => {
    if (approvals.approvals.get(toolUseID) === reason) return approvals;
    let next = new Map(approvals.approvals);
    next.set(toolUseID, reason);
    return {
      ...approvals,
      approvals: next,
    };
  });
}
//@ chunk-5xgkngpb.js:1289882-1289946 placement
/**
 * classifierApprovalFor：取分类器批准记录。
 */
function classifierApprovalFor(state, toolUseID) {
  return state.classifierApprovals.approvals.get(toolUseID);
}
//@ chunk-5xgkngpb.js:1289946-1290077 placement
function markClassifierChecking(setAppState, toolUseId) {
  if (!setAppState) return;
  setAppState((state) => {
    if (state.checking.has(toolUseId)) return state;
    let next = new Set(state.checking);
    next.add(toolUseId);
    return {
      ...state,
      checking: next,
    };
  });
}
//@ chunk-5xgkngpb.js:1290077-1290212 placement
/**
 * 从分类器审批状态的 checking 集合中移除 toolUseId。
 */
function clearClassifierChecking(setClassifierApprovals, toolUseID) {
  if (!setClassifierApprovals) return;
  setClassifierApprovals((state) => {
    if (!state.checking.has(toolUseID)) return state;
    let next = new Set(state.checking);
    next.delete(toolUseID);
    return {
      ...state,
      checking: next,
    };
  });
}
//@ chunk-5xgkngpb.js:1290212-1290350 placement
/**
 * 删除某个 toolUseId 的分类器审批结果。
 */
function deleteClassifierApproval(classifierApprovalsSetter, toolUseID) {
  if (!classifierApprovalsSetter) return;
  classifierApprovalsSetter((state) => {
    if (!state.approvals.has(toolUseID)) return state;
    let next = new Map(state.approvals);
    next.delete(toolUseID);
    return {
      ...state,
      approvals: next,
    };
  });
}
//@ chunk-5xgkngpb.js:1290350-1290486 placement
function resetClassifierApprovals(setAppState) {
  if (!setAppState) return;
  setAppState((state) => {
    if (state.approvals.size === 0 && state.checking.size === 0) return state;
    return {
      approvals: new Map(),
      checking: new Set(),
    };
  });
}
//@ chunk-5xgkngpb.js:1290752-1291017 placement
function arePermissionHooksUnsettled() {
  try {
    let pluginRegistry = getPluginRegistry();
    let organizationAsk = pluginRegistry.organizationAsk;
    let heldSurfaces =
      pluginRegistry.hookRegistrationsInFlight.size > 0 ||
      pluginRegistry.hookModulesAwaitTrust ||
      organizationAsk.isHeld ||
      organizationAsk.isCommandHeld ||
      organizationAsk.isMarketplaceHeld ||
      organizationAsk.heldReresolve !== null;
    return (
      isHookRegistrationPending() ||
      pluginRegistry.hooksRespawns.size > 0 ||
      (heldSurfaces && areHooksEnabled() && hasNonBuiltinPluginSurface())
    );
  } catch (error) {
    logError(toError(error));
    return true;
  }
}
//@ chunk-5xgkngpb.js:1291017-1291110 placement
/**
 * hasPersonOnlyAskFloor：钩子 ask 地板或仅人工 ask。
 */
function hasPersonOnlyAskFloor(alreadyPersonOnly, decision) {
  return (
    alreadyPersonOnly ||
    (decision.behavior === "ask" && decision.personOnly === true && decision.classifierMayAllow !== true)
  );
}
//@ chunk-5xgkngpb.js:1291110-1291138 placement
var compactionRequestsSlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1291110", () => {
  compactionRequestsSlot = new SessionRootSlot(() => new Map());
});
//@ chunk-5xgkngpb.js:1291138-1291171 placement
function agentKeyOrMain(agentId) {
  return agentId ?? "main";
}
//@ chunk-5xgkngpb.js:1291171-1291205 placement
function firstMessageUuid(messages) {
  return messages[0]?.uuid;
}
//@ chunk-5xgkngpb.js:1291205-1291590 placement
/**
 * 按（会话, agent）记录一次待处理的压缩请求：当前允许压缩且本 epoch 未用过时，新建或并入 pending（拒绝时追加工具名），返回 requested/joined。
 */
function requestDenialCompact(permissionContext, messages, request) {
  let epoch = firstMessageUuid(messages);
  if (epoch === undefined) return;
  let slots = compactionRequestsSlot.of(permissionContext.session);
  let agentKey = agentKeyOrMain(permissionContext.agentId);
  let slot = slots.get(agentKey);
  if (slot?.canCompact !== true || slot.spentEpoch === epoch) return;
  let pending = slot.pending?.epoch === epoch ? slot.pending : undefined;
  let pendingRequest = pending ?? {
    epoch,
    mode: request.mode,
    toolName: request.toolName,
    deniedToolNames: [],
  };
  slots.set(agentKey, {
    ...slot,
    pending: request.denied
      ? {
          ...pendingRequest,
          deniedToolNames: [...pendingRequest.deniedToolNames, request.toolName],
        }
      : pendingRequest,
  });
  return pending ? "joined" : "requested";
}
//@ chunk-5xgkngpb.js:1291590-1291868 placement
function syncCompactEligibility(permissionContext, messages, mode, canCompact) {
  let slots = compactionRequestsSlot.of(permissionContext.session);
  let agentKey = agentKeyOrMain(permissionContext.agentId);
  let previous = slots.get(agentKey);
  slots.set(agentKey, {
    canCompact,
    spentEpoch: previous?.spentEpoch,
  });
  let pending = previous?.pending;
  if (pending === undefined) return {};
  if (pending.epoch !== firstMessageUuid(messages))
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
//@ chunk-5xgkngpb.js:1291868-1291984 placement
function markCompactRequestSpent(permissionContext, pending) {
  let slots = compactionRequestsSlot.of(permissionContext.session);
  let agentKey = agentKeyOrMain(permissionContext.agentId);
  slots.set(agentKey, {
    ...slots.get(agentKey),
    pending: undefined,
    spentEpoch: pending.epoch,
  });
}
//@ chunk-5xgkngpb.js:1291984-1292018 placement
var seenToolCalls; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1291984", () => {
  seenToolCalls = identity_2(new Map(), (map) => map.clear());
});
//@ chunk-5xgkngpb.js:1292018-1292062 placement
function sessionAgentKey(agentId) {
  return `${getSessionId()}:${agentId ?? "main"}`;
}
//@ chunk-5xgkngpb.js:1292062-1292257 placement
function recordPromptedToolCall({ agentId, tool, input, message }) {
  let inputJson;
  try {
    inputJson = canonicalFingerprint(input);
  } catch {
    return;
  }
  let agentKey = sessionAgentKey(agentId);
  let entries = seenToolCalls.get(agentKey) ?? [];
  entries.push({
    tool,
    inputJson,
    fromMessageId: message.message.id,
    fromUuid: message.uuid,
  });
  seenToolCalls.set(agentKey, entries);
}
//@ chunk-5xgkngpb.js:1292257-1292807 placement
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
    (entry) => entry.fromMessageId !== id && entry.tool === tool && entry.inputJson === inputJson,
  );
  if (index !== -1) filtered.splice(index, 1);
  if (filtered.length > 0) seenToolCalls.set(agentKey, filtered);
  else seenToolCalls.delete(agentKey);
  return index !== -1;
}
//@ chunk-5xgkngpb.js:1292807-1292845 placement
var DENIAL_LIMIT_FALLBACK_SYMBOL; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1292807", () => {
  DENIAL_LIMIT_FALLBACK_SYMBOL = Symbol("DenialLimitFallback");
});
//@ chunk-5xgkngpb.js:1292845-1292976 placement
function withPermissionDisclosure(disclosure, deadline) {
  return {
    [DENIAL_LIMIT_FALLBACK_SYMBOL]: true,
    disclosure,
    ...(deadline !== undefined && {
      autoDenyAfterMs: deadline.autoDenyAfterMs,
      autoDenyResolution: deadline.resolution,
    }),
  };
}
//@ chunk-5xgkngpb.js:1292976-1293025 placement
/**
 * withDenialDeadline：附加自动拒绝截止时间。
 */
function withDenialDeadline(denialLimitFallback, deadlineEpochMs) {
  return {
    ...denialLimitFallback,
    deadlineEpochMs,
  };
}
//@ chunk-5xgkngpb.js:1293025-1293136 placement
/**
 * 去掉权限请求里的截止时间与自动拒绝字段，保留披露标记。
 */
function stripAutoDenyFields(denialLimitFallback) {
  let { deadlineEpochMs, autoDenyAfterMs, autoDenyResolution, ...rest } = denialLimitFallback;
  return {
    ...rest,
    [DENIAL_LIMIT_FALLBACK_SYMBOL]: denialLimitFallback[DENIAL_LIMIT_FALLBACK_SYMBOL],
  };
}
//@ chunk-5xgkngpb.js:1293136-1293164 placement
var READ_TOOLS_WITH_EXTERNAL_NOTE; // deferred: uses GREP_TOOL_NAME (../../tools/GrepTool/prompt.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1293136", () => {
  READ_TOOLS_WITH_EXTERNAL_NOTE = new Set([READ, GREP_TOOL_NAME, GLOB_TOOL_NAME]);
});
//@ chunk-5xgkngpb.js:1293164-1293734 placement
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
//@ chunk-5xgkngpb.js:1293734-1293851 placement
/**
 * 在全局配置中记下已看过 auto 模式外部读取提示。
 */
function markOutsideReadPromptSeen(toolUseContext) {
  saveGlobalConfig(
    (config) =>
      config.hasSeenAutoModeOutsideReadPrompt
        ? config
        : {
            ...config,
            hasSeenAutoModeOutsideReadPrompt: true,
          },
    toolUseContext.storageV5,
  );
}
//@ chunk-5xgkngpb.js:1293851-1294795 placement
async function persistBlockReadsOutsideWorkspace(toolUseContext) {
  toolUseContext.setSessionToolPermissionContext((context) => ({
    ...context,
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
  let refreshed;
  try {
    refreshed = SandboxManager.refreshConfig();
  } catch (error) {
    logError(toError(error));
    logFeatureSad("permission_block_outside_reads", "sandbox_refresh_failed");
    return {
      error: null,
      sandboxRefreshed: false,
    };
  }
  if (!refreshed) {
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
//@ chunk-5xgkngpb.js:1294795-1294831 placement
/**
 * classifyEditsEnabled：编辑是否交分类器。
 */
function classifyEditsEnabled(mainLoopModel) {
  return resolveClassifyEditsFlag(mainLoopModel).value;
}
//@ chunk-5xgkngpb.js:1294831-1294947 placement
function resolveClassifyEditsFlag(currentModel) {
  let CLAUDE_CODE_AUTO_MODE_CLASSIFY_EDITS = antEnv.CLAUDE_CODE_AUTO_MODE_CLASSIFY_EDITS;
  if (CLAUDE_CODE_AUTO_MODE_CLASSIFY_EDITS !== undefined)
    return {
      value: CLAUDE_CODE_AUTO_MODE_CLASSIFY_EDITS,
      src: "env",
    };
  return classifyEditsByModelList(currentModel);
}
//@ chunk-5xgkngpb.js:1294947-1295047 placement
/**
 * auto 模式下文件编辑是否也交给分类器：环境变量 CLAUDE_CODE_AUTO_MODE_CLASSIFY_EDITS 为 true，或当前主模型在配置的 classifyEditsModels 列表中。
 */
function shouldClassifyEdits(currentModel) {
  return (
    antEnv.CLAUDE_CODE_AUTO_MODE_CLASSIFY_EDITS === true ||
    classifyEditsByModelList(currentModel, {
      overridesMap: {},
    }).value
  );
}
//@ chunk-5xgkngpb.js:1295047-1295101 placement
function runLoneHandedOverEditEnabled() {
  return getAutoModeConfigOrDefault().runLoneHandedOverEdit === true;
}
//@ chunk-5xgkngpb.js:1295101-1295330 placement
function classifyEditsByModelList(skillModel, currentModel) {
  let classifyEditsModels = getAutoModeConfigOrDefault()?.classifyEditsModels;
  let allowedModels = new Set(Array.isArray(classifyEditsModels) ? classifyEditsModels : []);
  let allowedPrefixes = [];
  if (allowedModels.size === 0 && allowedPrefixes.length === 0)
    return {
      value: false,
      src: "default",
    };
  return {
    value: mainModelOverrideKeys(skillModel, currentModel).some(
      (key) => allowedModels.has(key) || allowedPrefixes.some((prefix) => key.startsWith(prefix)),
    ),
    src: "gb",
  };
}
//@ chunk-5xgkngpb.js:1295330-1295358 placement
var FILE_MUTATION_TOOLS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1295330", () => {
  FILE_MUTATION_TOOLS = new Set([EDIT, FILE_WRITE_TOOL_NAME, NOTEBOOK_EDIT_TOOL_NAME]);
});
//@ chunk-5xgkngpb.js:1295358-1295392 placement
/**
 * isFileMutationTool：是否文件修改工具。
 */
function isFileMutationTool(name) {
  return FILE_MUTATION_TOOLS.has(name);
}
//@ chunk-5xgkngpb.js:1295392-1295493 placement
class ToolUseIdSet {
  #e;
  constructor(ids) {
    this.#e = new Set(ids);
  }
  toolUseIDs() {
    return new Set(this.#e);
  }
  toJSON() {
    return;
  }
}
//@ chunk-5xgkngpb.js:1295493-1295527 placement
/**
 * toToolUseIdSet：构造工具调用 id 集合。
 */
function toToolUseIdSet(toolUseIds) {
  return new ToolUseIdSet(toolUseIds);
}
//@ chunk-5xgkngpb.js:1295527-1295589 placement
/**
 * handedOffIds：交接的活工具调用 id。
 */
function handedOffIds(handedOffLive) {
  return handedOffLive instanceof ToolUseIdSet ? handedOffLive.toolUseIDs() : undefined;
}
//@ chunk-5xgkngpb.js:1295589-1295639 placement
/**
 * isAskOnMutationTool：修改类工具的 ask 且曾开启主动性。
 */
function isAskOnMutationTool(name, proactivityLevel) {
  return proactivityLevel === "ask" && isFileMutationTool(name) && wasProactivityEverOn();
}
//@ chunk-5xgkngpb.js:1295639-1295685 placement
/**
 * isProactivityModeChange：ask 与非 ask 之间的模式变化。
 */
function isProactivityModeChange(from, to) {
  return from === "ask" && to !== "ask";
}
//@ chunk-5xgkngpb.js:1295983-1296137 placement
/**
 * 启动模式由主动性等级决定，且当前模式（plan 取进入前的模式）已不同于基线模式。
 */
function hasLeftProactivityBaseline(toolPermissionContext) {
  let effectiveMode =
    toolPermissionContext.mode === "plan"
      ? (toolPermissionContext.prePlanMode ?? "plan")
      : toolPermissionContext.mode;
  return (
    toolPermissionContext.startupModeDecidedByProactivityLevel !== undefined &&
    toolPermissionContext.proactivityBaseline?.mode !== effectiveMode
  );
}
//@ chunk-5xgkngpb.js:1296137-1296241 placement
/**
 * 按当前模式、主动性等级和是否偏离基线，算出 Shift+Tab 的模式循环。
 */
function getPermissionModeCycle(appState) {
  return cycleAllTeammateModes(
    appState.toolPermissionContext.mode,
    appState.proactivityLevel,
    hasLeftProactivityBaseline(appState.toolPermissionContext),
  );
}
//@ chunk-5xgkngpb.js:1297500-1297550 placement
function hasUnicodeEscape(text) {
  return /\\u[0-9a-fA-F]{4}/.test(text);
}
//@ chunk-5xgkngpb.js:1328591-1329213 fingerprint (2.1.88 match: getDenyRules, 0.492)
/**
 * 把磁盘上（严格信任）各来源新出现的 deny 规则并入上下文（y$ 匹配的排前面），并按需开启 blockReadsOutsideWorkingDirectories。
 */
var mergePersistedDenyRules = (context) => {
  let gainedBySource = new Map();
  for (let { ruleBehavior, ruleValue, source } of loadAllPermissionRulesFromDisk({
    strictPersistedTrust: true,
  })) {
    if (ruleBehavior !== "deny") continue;
    let ruleText = permissionRuleValueFromString_2(ruleValue);
    let entry = gainedBySource.get(source) ?? {
      holds: new Set(context.alwaysDenyRules[source]),
      gained: [],
    };
    gainedBySource.set(source, entry);
    if (!entry.holds.has(ruleText)) {
      entry.holds.add(ruleText);
      entry.gained.push(ruleText);
    }
  }
  let flattened = Array.from(gainedBySource).flatMap(([source, { gained }]) => {
    if (gained.length === 0) return [];
    let existing = context.alwaysDenyRules[source] ?? [];
    if (existing.length === 0) return [[source, gained]];
    return [
      [
        source,
        [
          ...gained.filter((source) => PATH_RULE_CARVE_OUT_RE.test(source)),
          ...existing,
          ...gained.filter((ruleString) => !PATH_RULE_CARVE_OUT_RE.test(ruleString)),
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
//@ chunk-5xgkngpb.js:3021844-3021884 placement
function isAutoModeConsentFlowEnabled(agentId) {
  return !isModelDrivenSession(agentId) && priorAssistantContextEnabled() && true;
}
//@ chunk-5xgkngpb.js:3021884-3021907 placement
function autoModeBlockedHelp(agentId) {
  return;
}
//@ chunk-5xgkngpb.js:3021907-3022267 layout
function isClassifierOnlyMiss(decisionReason) {
  if (decisionReason?.type === "other") return decisionReason.bashMissKind === "no-rule-match";
  if (decisionReason?.type !== "subcommandResults" || decisionReason.reasons.size === 0) return false;
  for (let reason of decisionReason.reasons.values()) {
    if (reason.behavior === "allow") continue;
    if (
      reason.behavior === "deny" ||
      reason.blockedPath !== undefined ||
      (reason.behavior === "ask" && reason.decisionReason?.type !== "subcommandResults") ||
      !isClassifierOnlyMiss(reason.decisionReason)
    )
      return false;
  }
  return true;
}
//@ chunk-5xgkngpb.js:3022267-3022506 layout
async function isCommandSafeToAutoAllow(command) {
  if (typeof command !== "string") return true;
  let node = await parseCommandRaw(command);
  if (node === null || node === PARSE_ABORTED || node.type === "ERROR") return true;
  let parsed = parseForSecurityFromAst(command, node);
  if (
    parsed.kind !== "simple" ||
    parsed.laterLoopPassesDiffer === true ||
    parsed.declarationPrefixes !== undefined
  )
    return true;
  return hasUnsafeNode(node);
}
//@ chunk-5xgkngpb.js:3022506-3022605 layout
var NON_SAFE_REDIRECT_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3022506", () => {
  NON_SAFE_REDIRECT_TYPES = new Set([
    "file_redirect",
    "heredoc_redirect",
    "herestring_redirect",
    "process_substitution",
  ]);
});
//@ chunk-5xgkngpb.js:3022605-3022742 layout
function isStderrToStdoutRedirect(child) {
  let [fdNode, operatorNode, targetNode, ...rest] = child.children;
  return (
    rest.length === 0 &&
    fdNode?.type === "file_descriptor" &&
    fdNode.text === "2" &&
    operatorNode?.type === ">&" &&
    targetNode?.text === "1"
  );
}
//@ chunk-5xgkngpb.js:3022742-3023014 layout
function hasUnsafeNode(node) {
  for (let child of node.children) {
    if (!child) continue;
    if (child.type === "ERROR") return true;
    if (child.type === "&") {
      if (node.type !== "binary_expression") return true;
      continue;
    }
    if (NON_SAFE_REDIRECT_TYPES.has(child.type) && !isStderrToStdoutRedirect(child)) return true;
    if (child.type === "command_name" && child.text === "coproc") return true;
    if (hasUnsafeNode(child)) return true;
  }
  return false;
}
//@ chunk-5xgkngpb.js:3023014-3023335 layout
async function isCheaplyAutoAllowableInScript(tool, input, decisionReason, permissionContext) {
  if (tool.mcpInfo !== undefined)
    return (
      tool.isReadOnly(input) &&
      tool.openWorldHint === false &&
      !(tool.isDestructive?.(input) ?? false) &&
      tool.name !== IDE_EXECUTE_CODE_TOOL &&
      !getMcpPrefix_5(getToolNameForPermissionCheck_2(tool))
    );
  if (tool.name === BASH_TOOL_NAME)
    return (
      permissionContext.replScriptSpelledOutCommand !== undefined &&
      permissionContext.replScriptSpelledOutCommand === input.command &&
      isClassifierOnlyMiss(decisionReason) &&
      input.run_in_background !== true &&
      !(await isCommandSafeToAutoAllow(input.command))
    );
  return false;
}
//@ chunk-5xgkngpb.js:3023335-3023386 layout
function isReplScriptCall(permissionContext) {
  return contextKeyAccepted() && permissionContext.replScriptCall === true;
}
//@ chunk-5xgkngpb.js:3023386-3023437 placement
function alwaysFullClassifierRole(permissionContext) {
  return contextKeyAccepted() && !hasBuiltInEvalTool(permissionContext.options.tools);
}
//@ chunk-5xgkngpb.js:3023437-3023522 placement
/**
 * 服务端分类器角色的按调用修正：本次 tool_use 是客户端指定的 clientRequestedToolUseId 时返回 "off"（不交服务端分类器），否则原样返回角色。
 */
function resolveServerClassifierRoleForCall(
  autoModeClassifierRole,
  assistantMessage,
  toolUseId,
  toolUseContext,
) {
  if (toolUseContext.clientRequestedToolUseId === toolUseId || isReplScriptCall(toolUseContext)) return "off";
  return autoModeClassifierRole;
}
//@ chunk-5xgkngpb.js:3023522-3023658 placement
function isTicklishWhisperEnabled() {
  if (antEnv.CLAUDE_CODE_TICKLISH_WHISPER !== undefined) return antEnv.CLAUDE_CODE_TICKLISH_WHISPER;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ticklish_whisper", false);
}
//@ chunk-5xgkngpb.js:3023658-3023696 placement
function canShowServerFallbackNotice(hasFallback) {
  return isTicklishWhisperEnabled() && hasFallback && !isSdkDialogHostActive();
}
//@ chunk-5xgkngpb.js:3023696-3024418 placement
/**
 * auto 模式退回按量计费的分类器请求时的提示：已中止返回 interrupt；有缓存的选择直接用；无 Opus 权限或没有对话框表面时记日志并 continue；否则弹一次计费提示对话框（上报 tengu_auto_mode_server_fallback_notice），返回用户的选择。
 */
function awaitClassifierBillingFallbackNotice(permissionContext) {
  let requestDialog = permissionContext.requestDialog;
  if (permissionContext.abortController.signal.aborted) return Promise.resolve("interrupt");
  let choice = getServerClassifierFallbackChoice();
  if (choice !== undefined) return raceChoiceWithAbort(choice, permissionContext.abortController.signal);
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
  let choice_2 = resolveServerFallbackChoice(() => {
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
  return raceChoiceWithAbort(choice_2, permissionContext.abortController.signal);
}
//@ chunk-5xgkngpb.js:3024418-3024724 placement
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
//@ chunk-5xgkngpb.js:3024724-3024794 placement
/**
 * 超限回退时“限时自动拒绝”窗口长度：env CLAUDE_CODE_TICKLISH_WHISPER_TIMEOUT_MS，缺省用 TIMED_FALLBACK_AUTO_DENY_MS。
 */
function denialDialogAutoDenyMs() {
  return antEnv.CLAUDE_CODE_TICKLISH_WHISPER_TIMEOUT_MS ?? TIMED_FALLBACK_AUTO_DENY_MS;
}
//@ chunk-5xgkngpb.js:3024794-3025084 placement
/**
 * 判断脚本是否“请求在沙箱外运行”：dangerouslyDisableSandbox 为 true，且该命令带此标志时不走沙箱、不带时会走沙箱（即标志确实改变了沙箱决定）。PowerShell 工具按 powershell shellType 判断。
 */
function scriptAsksToRunUnsandboxed(tool, input) {
  let dangerouslyDisableSandbox = input.dangerouslyDisableSandbox;
  if (dangerouslyDisableSandbox !== true && dangerouslyDisableSandbox !== "true") return false;
  let command = typeof input.command === "string" ? input.command : undefined;
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
//@ chunk-5xgkngpb.js:3025084-3025377 placement (2.1.88 match: persistDenialState, 0.894)
/**
 * 用更新函数修改拒绝跟踪状态：子代理写本地 localDenialTracking，主线程写 AppState.denialTracking；返回新状态。
 */
function updateDenialTrackingState(context, update) {
  if (context.localDenialTracking) {
    let next = update(context.localDenialTracking);
    Object.assign(context.localDenialTracking, next);
    return next;
  }
  let result;
  context.setAppState((prev) => {
    result = update(prev.denialTracking ?? createDenialTrackingState());
    if (prev.denialTracking === result) return prev;
    return {
      ...prev,
      denialTracking: result,
    };
  });
  return result ?? update(context.getAppState().denialTracking ?? createDenialTrackingState());
}
//@ chunk-5xgkngpb.js:3025377-3025402 placement
function resetDenialStreakAfterUserApproval(toolUseContext) {
  updateDenialTrackingState(toolUseContext, resetConsecutiveDenials);
}
//@ chunk-5xgkngpb.js:3025402-3025516 placement
var ORG_REQUIRES_APPROVAL_MESSAGE = "Your organization requires approval for this tool";
var CLI_ALWAYS_ASKS_MESSAGE = "Claude Code asks before every use of this tool.";
//@ chunk-5xgkngpb.js:3025516-3025572 placement
function askCeilingReason(tool) {
  return tool.mcpInfo?.cliOwned === true ? CLI_ALWAYS_ASKS_MESSAGE : ORG_REQUIRES_APPROVAL_MESSAGE;
}
//@ chunk-5xgkngpb.js:3025572-3025601 placement
function permissionRuleSourceDisplayString(source) {
  return getSettingSourceDisplayNameLowercase(source);
}
//@ chunk-5xgkngpb.js:3025601-3026004 placement
/**
 * Bash/Monitor/PowerShell 的 allow 若来自沙箱自动放行或只读判定，返回 "sandbox"/"readOnly"（用于交给服务端分类器复核）。
 */
function serverHeldShellAllowSource(tool, result) {
  if (
    result.behavior !== "allow" ||
    (tool.name !== BASH_TOOL_NAME && tool.name !== MONITOR && tool.name !== POWERSHELL_TOOL_NAME)
  )
    return;
  let sourceForReason = (decisionReason) => {
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
      let nested = reason.behavior === "allow" ? sourceForReason(reason.decisionReason) : undefined;
      if (nested !== undefined) return nested;
    }
    return;
  };
  return sourceForReason(result.decisionReason);
}
//@ chunk-5xgkngpb.js:3026004-3026314 placement
/**
 * 为 Bash/PowerShell 调用生成破坏性命令分析字段（destructive_category、destructive_target_scope、git_destructive_target），用于权限决定的遥测；其他工具返回 undefined。
 */
function getDestructiveCommandAnalytics(name, input) {
  let isBash = name === BASH_TOOL_NAME;
  if (!isBash && name !== POWERSHELL_TOOL_NAME) return;
  if (
    input === null ||
    typeof input !== "object" ||
    !("command" in input) ||
    typeof input.command !== "string"
  )
    return;
  let category = isBash
    ? getDestructiveTargetCategory(input.command)
    : getPowerShellDestructiveCategory(input.command);
  return {
    destructive_category: fromEnum(category ?? "none"),
    destructive_target_scope: fromEnum(
      classifyDestructiveTargetScope(input.command, getCwdOrNull(), category),
    ),
    git_destructive_target: fromEnum(classifyGitDestructiveTarget(input.command, category)),
  };
}
//@ chunk-5xgkngpb.js:3026314-3026646 layout
function bashProgramsField(tool, input) {
  if ((builtinToolServedByMcp(tool) ?? tool.name) !== BASH_TOOL_NAME || typeof input.command !== "string")
    return;
  try {
    return {
      bash_programs: classifyBashCommand(input.command).bash_programs,
    };
  } catch {
    logError(
      Error(
        "Auto-mode telemetry: could not list the programs in a blocked Bash command, so its tengu_auto_mode_decision event has no bash_programs field. The command was still blocked.",
      ),
    );
    return;
  }
}
//@ chunk-5xgkngpb.js:3026646-3027005 placement
/**
 * 模式切换后，之前的放行是否仍成立：auto 恒真；plan 下仅在 auto 激活且工具输入只读（或属于 plan 允许的只读类）时成立；其余模式返回调用方给定的原结果。
 */
function isStillAllowedAfterModeChange(fromMode, wasAllowed, tool, input, permissionContext) {
  switch (fromMode) {
    case "auto":
      return true;
    case "plan": {
      if (!isAutoModeActive()) return false;
      let parsed = tool.inputSchema.safeParse(input);
      return (
        (parsed.success === true &&
          tool.isReadOnly(parsed.data, permissionContext) &&
          !(tool.ignoresWholeToolAllowRule?.(parsed.data) ?? false)) ||
        isReadOnlyBrowserCall(getToolNameForPermissionCheck_2(tool), parsed.success ? parsed.data : input)
      );
    }
    case "default":
    case "dontAsk":
    case "acceptEdits":
    case "bypassPermissions":
    case "bubble":
      return wasAllowed;
    default: {
      let otherMode = fromMode;
      return false;
    }
  }
}
//@ chunk-5xgkngpb.js:3027005-3027081 placement
/**
 * Cowork 云会话的 Web 工具放行覆盖：存在授权且工具是 Cowork Web 工具时，按 RL（Cowork Web 判定）返回是否覆盖。
 */
function isCoworkWebAllowOverride(rule, tool, toolInput, toolUseContext) {
  if (rule === null || !isWebFetchOrSearch(tool.name)) return false;
  return isWebToolClassifierRouted(tool, getToolPermissionContext(toolUseContext));
}
//@ chunk-5xgkngpb.js:3027081-3027328 placement
/**
 * MCP 工具在 auto 模式下被“破坏性 MCP allow 规则”直接放行（跳过分类器复核）时上报 tengu_auto_mode_destructive_mcp_rule_allow，带规则来源与服务端分类器角色。
 */
function countMcpPolicyRecheckSkipped(ruleSource, tool, mode, toolUseContext, assistantMessage, toolUseID) {
  if (tool.mcpInfo === undefined) return;
  let toolPermissionContext = getToolPermissionContext(toolUseContext);
  if (
    isAutoAllowedInMode(tool, toolPermissionContext) !== "auto" ||
    !shouldClassifyRemoteMcpWritePolicy(tool, mode, "auto", toolPermissionContext)
  )
    return;
  let autoModeClassifierRole = getAutoModeClassifierRole(toolPermissionContext.mode);
  logEvent("tengu_auto_mode_destructive_mcp_rule_allow", {
    ruleSource: fromEnum(ruleSource),
    serverClassifierRole: fromEnum(
      assistantMessage === undefined
        ? autoModeClassifierRole
        : resolveServerClassifierRoleForCall(
            autoModeClassifierRole,
            assistantMessage,
            toolUseID,
            toolUseContext,
          ),
    ),
  });
}
//@ chunk-5xgkngpb.js:3027328-3027548 placement
/**
 * MCP 的 ask 是否否决已有的整工具授权：远程会话 MCP、Cowork Web、或开启服务端策略且该 MCP 工具受策略 ask 约束并命中会话级 allow 时为真；为真时 hasPermissionsToUseTool 给结果加 suppressAlwaysAllowRule。
 */
function mcpAskVetoesStandingGrant(tool, mode, toolUseContext, assistantMessage, toolUseID) {
  let toolPermissionContext = getToolPermissionContext(toolUseContext);
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
        mode,
        isAutoAllowedInMode(tool, toolPermissionContext),
        toolUseContext,
        () =>
          resolveServerClassifierRoleForCall(
            getAutoModeClassifierRole(toolPermissionContext.mode),
            assistantMessage,
            toolUseID,
            toolUseContext,
          ),
      ) !== undefined)
  );
}
//@ chunk-5xgkngpb.js:3027548-3027673 placement
/**
 * 破坏性 MCP 调用在 auto/分类器模式下是否应改为 ask：有授权、模式走分类器、工具 isDestructive(input) 为真，且远程破坏性 MCP 开关或 tengu_modular_mochi 打开。
 */
async function isDestructiveMcpAskOverride(
  isAsk,
  decisionReason,
  tool,
  input,
  effectiveMode,
  permissionContext,
  assistantMessage,
  toolUseID,
  awaitVerdict,
) {
  return (
    isAsk &&
    isAutoClassifierActive(effectiveMode) &&
    (tool.isDestructive?.(input) ?? false) &&
    (includesRemoteDestructiveMcp() ||
      isModularMochiEnabled(permissionContext) ||
      (await awaitClassifierVerdict(
        decisionReason,
        tool,
        input,
        permissionContext,
        assistantMessage,
        toolUseID,
        awaitVerdict,
      )))
  );
}
//@ chunk-5xgkngpb.js:3027673-3027756 placement
function includesRemoteDestructiveMcp() {
  return (
    isCoworkAny() &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_remote_auto_mode_include_destructive_mcp", false)
  );
}
//@ chunk-5xgkngpb.js:3027756-3027858 placement
/**
 * Computer Use 检查开关：GrowthBook tengu_quirky_shore 为 on 或设置 computerUseChecks 打开时返回 "on"。
 */
function getComputerUseChecksSetting() {
  return normalizeAutoModeValue(getFeatureValue_CACHED_MAY_BE_STALE("tengu_quirky_shore", "off")) === "on" ||
    isActionSummaryEnabled("computerUseChecks")
    ? "on"
    : undefined;
}
//@ chunk-5xgkngpb.js:3027858-3027947 placement
function isModularMochiEnabled(permissionContext) {
  return (
    hasRelaySourceForClients(isDiskless() ? permissionContext.options.mcpClients : undefined) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_modular_mochi", false)
  );
}
//@ chunk-5xgkngpb.js:3027947-3027990 layout
async function awaitClassifierVerdict(
  decisionReason,
  tool,
  input,
  permissionContext,
  assistantMessage,
  toolUseID,
  awaitVerdict,
) {
  return false;
}
//@ chunk-5xgkngpb.js:3027990-3028018 placement
function hasAutoModeClassifierDenyRules() {
  return hasAutoModeDenyLists();
}
//@ chunk-5xgkngpb.js:3028018-3028088 placement
/**
 * settings.autoMode 是否配置了自定义 soft_deny 或 hard_deny 规则。
 */
function hasCustomAutoModeDenyRules() {
  let autoModeConfig = getAutoModeConfig();
  return replacesDefaultRules(autoModeConfig?.soft_deny) || replacesDefaultRules(autoModeConfig?.hard_deny);
}
//@ chunk-5xgkngpb.js:3028088-3028247 placement
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
  let notice = takeNoServerCheckNotice(asks, heldByDenyRules);
  if (notice !== undefined) permissionContext.appendSystemMessage(createSystemMessage(notice, "warning"));
}
//@ chunk-5xgkngpb.js:3028247-3029550 placement (2.1.88 match: createPermissionRequestMessage, 0.971)
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
        let ruleString = permissionRuleValueFromString_2(decisionReason.rule.ruleValue);
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
  return unGrantedNotice(toolName);
}
//@ chunk-5xgkngpb.js:3029550-3029693 placement
function hasAllowRuleInSource(toolPermissionContext, rule, source) {
  let ruleText = permissionRuleValueFromString_2(rule);
  let sourceHasRule = (rulesBySource) =>
    (rulesBySource?.[source] ?? []).some(
      (rawRule) => permissionRuleValueFromString_2(normalizeRuleString(rawRule, "allow")) === ruleText,
    );
  return (
    sourceHasRule(toolPermissionContext.alwaysAllowRules) ||
    sourceHasRule(toolPermissionContext.strippedDangerousRules)
  );
}
//@ chunk-5xgkngpb.js:3029693-3030014 placement
/**
 * 从 addRules/replaceRules 的 allow 更新中剔除“加载 MCP skill 形式”的新规则（除非来源允许），用于 MCP skill 加载 ask 的回答。
 */
function withoutNewRulesOfMcpSkillLoadForm(toolNameWithAliases, updates, toolPermissionContext) {
  return updates.flatMap((update) => {
    if ((update.type !== "addRules" && update.type !== "replaceRules") || update.behavior !== "allow")
      return [update];
    let filtered = update.rules.filter((rule) => {
      let ruleValue = parseRuleString(permissionRuleValueFromString_2(rule));
      return (
        !toolNameWithAliases.has(ruleValue.toolName) ||
        !isPinnedOrWildcardRule(ruleValue.ruleContent ?? "") ||
        hasAllowRuleInSource(toolPermissionContext, ruleValue, update.destination)
      );
    });
    if (filtered.length === update.rules.length) return [update];
    return filtered.length > 0
      ? [
          {
            ...update,
            rules: filtered,
          },
        ]
      : [];
  });
}
//@ chunk-5xgkngpb.js:3030014-3030098 placement
function isWholeToolAllowRule(tool, ruleValue) {
  return toolMatchesWholeToolRule(tool, {
    source: "session",
    ruleBehavior: "allow",
    ruleValue,
  });
}
//@ chunk-5xgkngpb.js:3030098-3030298 placement
/**
 * 选择要展示的决定原因：结果里有带熔断器的 safetyCheck，或结果标记 localDisplayOnly 时用结果自己的原因，否则用调用方给的原因。
 */
function pickDisplayedDecisionReason(checkResult, fallback) {
  if (
    checkResult.decisionReason !== undefined &&
    findSafetyCheckReason(
      checkResult.decisionReason,
      (safetyReason) => safetyReason.circuitBreaker !== undefined,
    ) !== undefined
  )
    return checkResult.decisionReason;
  return checkResult.localDisplayOnly === true && checkResult.decisionReason
    ? checkResult.decisionReason
    : fallback;
}
//@ chunk-5xgkngpb.js:3030298-3030372 placement
/**
 * 为 ask 去掉整工具授权：在工具名及其别名集合上移除整工具 allow 规则（按来源过滤），返回新的权限上下文。
 */
function stripWholeToolGrantsForAsk(updates, tool, toolPermissionContext) {
  return dropBareAllowRulesForTools(
    updates,
    getToolNameWithAliases(tool, toolPermissionContext),
    (ruleValue, destination) => hasAllowRuleInSource(toolPermissionContext, ruleValue, destination),
    (ruleValue) => isWholeToolAllowRule(tool, ruleValue),
  );
}
//@ chunk-5xgkngpb.js:3030372-3030612 placement (2.1.88 match: permissionUpdateSchema, 0.726)
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
//@ chunk-5xgkngpb.js:3030612-3030761 placement
/**
 * 由一组 PermissionUpdate 推出授权范围：去掉远程作用域不允许的授权后，若有持久化目的地返回 "always"，有其他更新返回 "session"，否则 "once"。
 */
function permissionGrantScope(updates) {
  let withheld = new Set(withoutGrantsForRemoteScope(updates));
  let filtered = updates.filter((update) => !withheld.has(update));
  if (filtered.some((update) => supportsPersistence_2(update.destination))) return "always";
  return filtered.length > 0 ? "session" : "once";
}
//@ chunk-5xgkngpb.js:3030761-3031075 placement (2.1.88 match: buildPermissionUpdates, 0.85)
/**
 * 回答 MCP skill 加载 ask 时可应用的更新：普通更新经远程作用域过滤；allow addRules 只保留与本次 skill 规则完全一致、目的地为 session 或允许目的地的那条。
 */
function answerUpdatesForMcpSkillAsk(mode, allowedPrompts) {
  return mode.flatMap((update) => {
    let remoteScoped = withoutGrantsForRemoteScope([update]);
    if (
      remoteScoped.length > 0 ||
      allowedPrompts === undefined ||
      update.type !== "addRules" ||
      update.behavior !== "allow"
    )
      return remoteScoped;
    if (update.destination !== USERSETTINGS && update.destination !== "session") return [];
    let filtered = update.rules.filter(
      (rule) => rule.toolName === allowedPrompts.toolName && rule.ruleContent === allowedPrompts.ruleContent,
    );
    return filtered.length > 0
      ? [
          {
            ...update,
            rules: filtered,
          },
        ]
      : [];
  });
}
//@ chunk-5xgkngpb.js:3031075-3031328 placement (2.1.88 match: _temp1, 1)
function filterBuiltInAgentsByDeniedTools(agents, toolPermissionContext) {
  let denyIndex;
  return agents.filter((agent) => {
    if (
      agent.source !== "built-in" ||
      !agent.tools ||
      agent.tools.length === 0 ||
      parseWildcardAgentTypes(agent.tools) !== null
    )
      return true;
    return agent.tools.some((tool) => {
      if (tool === "*") return false;
      let toolName = parseRuleString(tool).toolName;
      denyIndex ??= getDenyRuleIndex(toolPermissionContext);
      return (
        !isToolDeniedByIndex(toolPermissionContext, denyIndex.index, {
          name: toolName,
        }) && isWebFetchPolicyAllowed(toolName)
      );
    });
  });
}
//@ chunk-5xgkngpb.js:3031328-3031375 placement
function isAgentToolPoolDenied(agent, toolPermissionContext) {
  return filterBuiltInAgentsByDeniedTools([agent], toolPermissionContext).length === 0;
}
//@ chunk-5xgkngpb.js:3031375-3031508 placement
/**
 * 代理类型因其所有可用工具都被权限设置拒绝而不可用时的提示文字。
 */
function agentToolPoolDeniedMessage(agentType) {
  return `Agent type '${agentType}' is unavailable because every tool it may use is denied by the current permission settings.`;
}
//@ chunk-5xgkngpb.js:3031508-3031581 placement
function isWebFetchPolicyAllowed(toolName) {
  return toolName !== WEBFETCH || (!env.CLAUDE_CODE_DISABLE_WEB_FETCH && isPolicyAllowed_3(ALLOW_WEB_FETCH));
}
//@ chunk-5xgkngpb.js:3031581-3031670 placement
/**
 * 过滤可派发的代理：去掉 isEnabled 为假的、被 Agent(type) deny 规则拒绝的、工具池全被拒绝的代理。
 */
function filterDispatchableAgents(agents, toolPermissionContext, agentToolName, toolUseContext) {
  return filterOfferedAgents(
    filterBuiltInAgentsByDeniedTools(
      filterDeniedAgents(
        agents.filter((agent) => agent.isEnabled?.(toolUseContext) !== false),
        toolPermissionContext,
        agentToolName,
      ),
      toolPermissionContext,
    ),
    toolUseContext,
  );
}
//@ chunk-5xgkngpb.js:3031670-3031754 placement
/**
 * 取可派发代理列表：先按允许的 agentType 名单筛选，再走 filterDispatchableAgents。
 */
function getDispatchableAgents(activeAgents, allowedAgentTypes, toolPermissionContext, toolUseContext) {
  return filterDispatchableAgents(
    allowedAgentTypes
      ? activeAgents.filter((agent) => allowedAgentTypes.includes(agent.agentType))
      : activeAgents,
    toolPermissionContext,
    AGENT,
    toolUseContext,
  );
}
//@ chunk-5xgkngpb.js:3031754-3031945 placement
/**
 * PermissionRequest 钩子带 updatedInput 放行时的守卫：如果对改写后输入的规则检查结果是 deny/ask，记日志并返回该结果（规则优先于钩子）；否则返回 null。
 */
function guardHookUpdatedInput(permissionResult, name) {
  if (permissionResult?.behavior === "deny" || permissionResult?.behavior === "ask") {
    logForDebugging(
      `PermissionRequest hook allowed ${name} with updatedInput, but ${permissionResult.behavior} rule overrides: ${permissionResult.message}`,
    );
    return permissionResult;
  }
  return null;
}
//@ chunk-5xgkngpb.js:3031945-3033552 placement
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
      let flagged = guardHookUpdatedInput(
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
      if (flagged)
        return flagged.behavior === "ask"
          ? {
              behavior: "deny",
              message: flagged.message,
              decisionReason: flagged.decisionReason ?? HOOK_ALLOW_FLAGGED_HEADLESS_DENY_REASON,
            }
          : flagged;
    }
    let { lostTightenings } = applyAnswerPermissionUpdates(hookMode, hookResult.updatedPermissions, {
      vetoed: isVetoed,
      strip: (updates) =>
        isHookOrPluginSteered(context)
          ? []
          : tool.suppressesAllPermissionUpdates?.(input) === true
            ? withoutGrantsForRemoteScope(updates)
            : tool.suppressesAlwaysAllowRule?.(input) === true || stripWholeToolGrants
              ? stripWholeToolGrantsForAsk(updates, tool, getToolPermissionContext(context))
              : updates,
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
  let validated = await validatePermissionRequestUpdatedInput(
    tool,
    hookResult.updatedInput,
    input,
    (candidate) =>
      tool.validateInput?.(candidate, {
        ...context,
        toolUseId,
      }),
  );
  if (validated.deny !== undefined) return validated.deny;
  let input_2 = validated.input;
  let effectiveInput = input_2 ?? input;
  if (input_2 || tool.requiresUserInteraction?.() || requiresConnectorGrant_2(tool)) {
    let flagged = guardHookUpdatedInput(
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
    if (flagged)
      return flagged.behavior === "ask"
        ? {
            behavior: "deny",
            message: flagged.message,
            decisionReason:
              flagged.decisionReason ??
              (input_2 ? HOOK_REWRITE_HEADLESS_DENY_REASON : HOOK_ALLOW_FLAGGED_HEADLESS_DENY_REASON),
          }
        : flagged;
  }
  switch (hookMode.kind) {
    case "launcher": {
      let updates =
        tool.suppressesAllPermissionUpdates?.(input) === true
          ? withoutGrantsForRemoteScope(hookResult.updatedPermissions ?? [])
          : tool.suppressesAlwaysAllowRule?.(input) === true || stripWholeToolGrants
            ? stripWholeToolGrantsForAsk(
                hookResult.updatedPermissions ?? [],
                tool,
                getToolPermissionContext(context),
              )
            : (hookResult.updatedPermissions ?? []);
      if (updates.length && !isVetoed() && !isHookOrPluginSteered(context)) {
        context.setSessionToolPermissionContext((context) => applyPermissionUpdates(context, updates));
        persistPermissionUpdates(updates, context.storageV5).catch(logError);
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
//@ chunk-5xgkngpb.js:3033552-3034388 fingerprint (2.1.88 match: runPermissionRequestHooksForHeadlessAgent, 0.683)
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
//@ chunk-5xgkngpb.js:3034388-3034783 placement
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
//@ chunk-5xgkngpb.js:3034783-3035754 placement
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
      let hookDecision = await applyHookPermissionAllow(
        answers,
        tool,
        updatedInput,
        hookResult,
        toolUseID,
        context,
        result.suppressAlwaysAllowRule === true,
        () => context.abortController.signal.aborted,
      );
      if (hookDecision.behavior === "allow")
        notePendingPermissionAnswer(context, toolUseID, result, tool.name);
      return hookDecision;
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
//@ chunk-5xgkngpb.js:3035754-3036512 placement
/**
 * 无法弹窗（shouldAvoidPermissionPrompts）或带 refusal 时，用 PermissionRequest 钩子代替人工；钩子无结论则拒绝（asyncAgent："Permission prompts are not available in this context"）。
 */
async function resolveAskWithoutPrompt(answers, tool, input, result, toolUseID, context) {
  if (getToolPermissionContext(context).shouldAvoidPermissionPrompts || result.refusal !== undefined) {
    if (result.refusal !== undefined && result.hooksMayAllow === false) {
      let hookDecision = await personAskAfterHooks(result, {
        tool,
        input,
        context,
        toolUseID,
      });
      return hookDecision.behavior === "ask" ? result.refusal : hookDecision;
    }
    let safetyResult = suppressAlwaysAllowForSafetyCheck(result);
    let flags = {
      ignoredAllow: false,
    };
    let hookResult = await consultPermissionRequestHooksForUnpromptableAsk(
      answers,
      tool,
      input,
      safetyResult.behavior === "ask" ? safetyResult : result,
      toolUseID,
      context,
      () => {
        flags.ignoredAllow = true;
      },
    );
    if (hookResult) {
      if (hookResult.behavior === "allow") notePendingPermissionAnswer(context, toolUseID, result, tool.name);
      return hookResult;
    }
    if (result.refusal !== undefined) return result.refusal;
    return {
      behavior: "deny",
      decisionReason: {
        type: "asyncAgent",
        reason: "Permission prompts are not available in this context",
        ask: refusedAskOf(result),
        ...(flags.ignoredAllow && {
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
//@ chunk-5xgkngpb.js:3036512-3036727 placement
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
//@ chunk-5xgkngpb.js:3036727-3037269 placement
/**
 * 插件评测（plugin eval）授权检查：把上下文改成 dontAsk 并把 cliArg allow 规则（含被剥离的危险规则）加回，用 checkDeclarativePermission 经插件裁决层判定是否 allow。
 */
async function isAllowedByEvalGrants(tool, input, permissionContext, toolUseID, id) {
  let grantContext = {
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
  if (getToolPermissionContext(grantContext).mode !== "dontAsk") return false;
  return (
    (
      await decideWithToolCheckHooks(
        {
          tool,
          input,
          context: grantContext,
          toolUseID,
          evaluate: () =>
            checkDeclarativePermission(tool, input, grantContext, {
              crashIsObjection: true,
            }),
        },
        id,
      )
    ).behavior === "allow"
  );
}
//@ chunk-5xgkngpb.js:3037269-3037317 placement
function isServerContextStaleCheckEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_humble_wand", true);
}
//@ chunk-5xgkngpb.js:3037317-3037432 placement
/**
 * 请求时模式是否为 auto：上下文带 permissionModeAtRequest 且去掉它后的有效模式为 auto。
 */
function isRequestedModeAuto(context) {
  return (
    context.permissionModeAtRequest !== undefined &&
    getToolPermissionContext({
      ...context,
      permissionModeAtRequest: undefined,
    }).mode === "auto"
  );
}
//@ chunk-5xgkngpb.js:3037432-3037484 placement
function getStaleContextErrorKind(result) {
  return result.errorKind === SERVER_CONTEXT_STALE ? SERVER_CONTEXT_STALE : undefined;
}
//@ chunk-5xgkngpb.js:3037484-3037559 placement
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
//@ chunk-5xgkngpb.js:3037559-3037629 placement
/**
 * 以 asksNoHost 标志调用 hasPermissionsToUseTool，用于没有宿主可询问的评估。
 */
function evaluateAskingNoHost(...[tool, input, context, ...rest]) {
  return hasPermissionsToUseTool(
    tool,
    input,
    {
      ...context,
      asksNoHost: true,
    },
    ...rest,
  );
}
//@ chunk-5xgkngpb.js:3037629-3038094 placement
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
  toolSuggestions,
  classifierApprovalsSetter,
) => {
  let decision = enforceClassifierOnlyDecision(
    tool,
    settingsProblemDenial() ??
      denyReservedArtifactKeys(tool, input) ??
      (await hasPermissionsToUseToolInner(
        tool,
        input,
        context,
        assistantMessage,
        toolUseID,
        answers,
        toolSuggestions,
        classifierApprovalsSetter,
      )),
    getHookCaller(context) !== undefined,
  );
  let result =
    decision.behavior === "ask" && decision.refusal !== undefined
      ? await resolveAskWithoutPrompt(answers, tool, input, decision, toolUseID, context)
      : decision;
  let afterHooks = await personAskAfterHooks(result, {
    tool,
    input,
    context,
    toolUseID,
    answers,
  });
  let finalDecision =
    afterHooks.behavior === "deny"
      ? appendRuleAnnotation({
          ...afterHooks,
          decideLocation: "pre-ask",
        })
      : suppressAlwaysAllowForSafetyCheck(afterHooks);
  if (
    finalDecision.behavior === "allow" &&
    getDenialTrackingState(context).lastRewriteFingerprint !== undefined &&
    isClassifierTargetToolUse(assistantMessage, toolUseID, context.clientRequestedToolUseId)
  )
    updateDenialTrackingState(context, (state) => undoRewriteDenialIfRetried(state, tool.name, input));
  recordPipelineResult(context, toolUseID, input, finalDecision, tool.name);
  return finalDecision;
};
//@ chunk-5xgkngpb.js:3038094-3038304 placement
function suppressAlwaysAllowForSafetyCheck(decision) {
  if (
    decision.behavior === "ask" &&
    decision.suppressAlwaysAllowRule !== true &&
    decision.metadata?.mcpSkill === undefined &&
    findSafetyCheckReason(decision.decisionReason, (reason) => !reason.classifierApprovable) !== undefined
  )
    return {
      ...decision,
      suppressAlwaysAllowRule: true,
    };
  return decision;
}
//@ chunk-5xgkngpb.js:3038304-3038578 placement
/**
 * 找到能放行该工具的整工具 allow 规则（排除忽略整工具规则的工具、Chrome 地板、MCP 限制、computer-use 例外等）。
 */
function findApplicableAllowRule(tool, input, context, mode, getMode) {
  let allowRule = toolAlwaysAllowedRule(getToolPermissionContext(context), tool);
  if (
    allowRule &&
    tool.ignoresWholeToolAllowRule?.(input) !== true &&
    !shouldRelyOnModeFloorForBrowser(tool, getToolPermissionContext(context)) &&
    !(
      isChromeToolName(getToolNameForPermissionCheck_2(tool)) &&
      (isBrowserPreviewToolName(getToolNameForPermissionCheck_2(tool)) ||
        getToolPermissionContext(context).chromeClassifierFloorEnabled === true)
    ) &&
    getMcpRuleClassifierRoute(allowRule, tool, input, mode, context, () =>
      getMode(getToolPermissionContext(context).mode),
    ) === undefined &&
    !isCoworkWebAllowOverride(allowRule, tool, input, context) &&
    !shouldRouteBrowserCallToClassifier(
      getComputerUseChecksSetting(),
      getToolPermissionContext(context),
      tool,
      input,
      mode,
    )
  )
    return allowRule;
  return null;
}
//@ chunk-5xgkngpb.js:3038578-3082470 callgraph-witnessed (2.1.88 match: hasPermissionsToUseTool, 0.256)
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
  toolSuggestions,
  classifierApprovalsSetter,
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
  let mcpFieldsCache;
  let mcpFields = () => (mcpFieldsCache ??= mcpToolLogFields(tool, permissionContext.options.mcpClients));
  let projectsRoleCache;
  let projectsRoleFields = () => (projectsRoleCache ??= getProjectsRoleTelemetry(permissionContext));
  let resolveRole = (requestedMode) =>
    resolveServerClassifierRoleForCall(
      getAutoModeClassifierRole(requestedMode),
      assistantMessage,
      toolUseID,
      permissionContext,
    );
  let hookDecision = await decideWithToolCheckHooks(
    {
      tool,
      input,
      context: permissionContext,
      toolUseID,
      evaluate: () => {
        let evaluateHere = () =>
          checkToolAndRulePermissions(tool, input, permissionContext, toolSuggestions, resolveRole);
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
            ).then((adjudicated) => {
              if (adjudicated !== CHECK_NO_DECISION) return adjudicated;
              rememberPendingCheck(permissionContext.session, toolUseID);
              return evaluateHere();
            });
      },
    },
    assistantMessage.message.id,
  );
  let checkResult =
    hookDecision.behavior === "ask" &&
    (mcpAskVetoesStandingGrant(tool, input, permissionContext, assistantMessage, toolUseID) ||
      isWebSearchClassifierRouted(tool, getToolPermissionContext(permissionContext)))
      ? {
          ...hookDecision,
          suppressAlwaysAllowRule: true,
          ...(isRemoteBrowserToolModeFloorActive(tool, getToolPermissionContext(permissionContext)) && {
            suggestions: undefined,
          }),
        }
      : hookDecision;
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
    let effectiveMode = isAutoAllowedInMode(tool, toolPermissionContext);
    let hasPersonOnlyFloor = hasPersonOnlyAskFloor(permissionContext.hookAskFloor === true, checkResult);
    let toolName = getToolNameForPermissionCheck_2(tool);
    let isChromeTool = isChromeToolName(toolName);
    let chrome = checkResult.metadata?.command?.chrome;
    let chromeRuleRouted =
      isChromeClassifierFloorCall(tool, toolPermissionContext) &&
      (chrome?.domainAllowed === true ||
        chrome?.hostHandlesOriginConsent === true ||
        toolAlwaysAllowedRule(toolPermissionContext, tool) !== null);
    let chromeGrantRouted =
      isChromeClassifierFloorTool(tool, toolPermissionContext) &&
      toolPermissionContext.canAutoClassifierRun === false &&
      !isAutoClassifierActive(effectiveMode, toolPermissionContext.servedCall === true) &&
      chrome?.domainAllowed === true &&
      chrome.grantRule !== undefined &&
      chrome.navigation === undefined &&
      chromeGrantAllowlistWithoutClassifier() &&
      toolPermissionContext.mode !== "plan" &&
      !hasPersonOnlyFloor &&
      !carriesAskRuleIntent(checkResult) &&
      findSafetyCheckReason(checkResult.decisionReason) === undefined &&
      tool.mcpInfo?.effectiveMaxPermission !== "ask" &&
      isBrowserToolAutoAllowed(tool, input) &&
      !shouldClassifyBrowserWrite(toolPermissionContext, toolName, input);
    if (effectiveMode === "dontAsk" && !chromeRuleRouted) {
      let hasApplicableAllowRule = false;
      if (toolMaySettleUnaskedQuestion(tool, checkResult, permissionContext))
        try {
          hasApplicableAllowRule =
            tool.requiresUserInteraction?.() !== true &&
            findApplicableAllowRule(tool, input, permissionContext, effectiveMode, resolveRole) !== null;
        } catch (error) {
          if (!isAbortError(error)) logError(error);
        }
      return {
        behavior: "deny",
        decisionReason: {
          type: "mode",
          mode: "dontAsk",
          ...(hasApplicableAllowRule && {
            ask: refusedAskOf(checkResult),
          }),
        },
        message: DONT_ASK_REJECT_MESSAGE(tool.name),
      };
    }
    if (
      isAutoClassifierActive(effectiveMode, toolPermissionContext.servedCall === true) ||
      chromeRuleRouted ||
      chromeGrantRouted
    ) {
      if (isAskOnMutationTool(tool.name, appState.proactivityLevel)) {
        if (toolPermissionContext.shouldAvoidPermissionPrompts) return denyPromptUnavailable(checkResult);
        return checkResult;
      }
      let modeSnapshot = {
        mode: effectiveMode,
        autoActive: isAutoModeActive(),
      };
      let chainOnAllow = isChainOnAllowActive();
      let classifierOnly = classifierOnlyConfig(tool);
      if (classifierOnly?.onBlock === "refuse" && (hasPersonOnlyFloor || chainOnAllow))
        return buildClassifierOnlyDenial(
          tool,
          hasPersonOnlyFloor
            ? "a hook asked for a prompt, and none is raised"
            : "the host re-asks every allow, and no prompt is raised",
        );
      if (
        hasPersonOnlyFloor &&
        !chainOnAllow &&
        checkResult.refusal === undefined &&
        toolPermissionContext.shouldAvoidPermissionPrompts &&
        classifierOnly?.onBlock !== "flag"
      )
        return denyPromptUnavailable(checkResult);
      let finishClassifierAllow = (allowedByClassifier) => {
        if (allowedByClassifier.decisionReason.type === "classifier" && commandNetworkListsOffered)
          rememberCommandNetworkLists(toolUseID, tool, input);
        let { classifierRan, serverCleared, ...restDecision } = allowedByClassifier;
        let withClassifierFlag =
          restDecision.decisionReason.type === "classifier" &&
          restDecision.decisionReason.noVerdict !== true &&
          classifierRan !== false
            ? {
                ...restDecision,
                decisionReason: {
                  ...restDecision.decisionReason,
                  classifierAllowed: true,
                  ...(serverCleared === true && {
                    serverCleared,
                  }),
                },
              }
            : restDecision;
        if (classifierOnly?.onBlock === "flag")
          return {
            behavior: "allow",
            ...withClassifierFlag,
          };
        if (chainOnAllow)
          return {
            ...checkResult,
            ...restDecision,
            decisionReason: pickDisplayedDecisionReason(checkResult, restDecision.decisionReason),
          };
        if (hasPersonOnlyFloor) {
          if (effectiveMode === "dontAsk")
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
            updatedInput: allowedByClassifier.updatedInput,
          };
        }
        return {
          behavior: "allow",
          ...withClassifierFlag,
        };
      };
      let fallBackToAsk = (reason, extraFields) => {
        if (!isAskOnMutationTool(tool.name, permissionContext.getAppState().proactivityLevel)) return;
        logEvent("tengu_auto_mode_fallback_to_ask", {
          ...extraFields,
          reason: fromEnum(reason),
          toolName: sanitizeToolNameForAnalytics(tool.name),
          toolUseId: sanitizeMarkName(toolUseID),
          isMcp: tool.isMcp ?? false,
          ...mcpFields(),
        });
        if (getToolPermissionContext(permissionContext).shouldAvoidPermissionPrompts)
          return denyPromptUnavailable(checkResult);
        return checkResult;
      };
      let safetyCheckReason =
        checkResult.behavior === "ask" && checkResult.classifierMayAllow === true && effectiveMode === "auto"
          ? undefined
          : findSafetyCheckReason(
              checkResult.decisionReason,
              (safetyReason) =>
                !safetyReason.classifierApprovable &&
                !(
                  isClassifierRoutedCircuitBreaker(safetyReason) &&
                  !carriesPersonsAsk(safetyReason) &&
                  isAutoModePermissionSurface(toolPermissionContext)
                ),
            );
      let projectionOnly =
        findSafetyCheckReason(checkResult.decisionReason, isLocalProjectionOnlyCircuitBreaker) !== undefined;
      let classifierMayAllowAsk = checkResult.behavior === "ask" && checkResult.classifierMayAllow === true;
      let isSandboxOverride = checkResult.decisionReason?.type === "sandboxOverride";
      let sandboxOverrideUnderReadBlock = isSandboxOverrideUnderReadBlock(
        checkResult.decisionReason,
        toolPermissionContext,
      );
      let carriesAskIntent = carriesAskRuleIntent(checkResult);
      let isAsk =
        isServerPolicyAskReason(checkResult.decisionReason) ||
        checkResult.matchedAskRule?.source === "mcpServerPolicy";
      let serverVerdictPromise;
      let keptVerdictWithClassification =
        assistantMessage.serverClassifierInputRewrite?.keptVerdict === true &&
        (involvesSafetyCheck(checkResult.decisionReason) ||
          (isFileMutationTool(tool.name) &&
            (classifyEditsEnabled(getMainLoopModel_2(permissionContext)) ||
              shouldClassifyEdits(getMainLoopModel_2(permissionContext)) ||
              shouldClassifyEdits(assistantMessage.message.model))));
      let checkStatus = new enqueuePermissionCheckStatus(toolUseID, permissionContext.agentId);
      let serverWaitMs;
      let serverVerdict;
      let startServerVerdict = () => {
        if (serverVerdictPromise === undefined) {
          let now = Date.now();
          serverVerdictPromise = awaitServerVerdict(
            assistantMessage,
            toolUseID,
            !keptVerdictWithClassification,
          ).then((verdict) => {
            serverWaitMs = Date.now() - now;
            serverVerdict = verdict;
            return verdict;
          });
        }
        return serverVerdictPromise;
      };
      let awaitVerdictHolding = () => {
        let verdictPromise = startServerVerdict();
        if (serverWaitMs === undefined) {
          let releaseHold = checkStatus.hold();
          verdictPromise.then(releaseHold, releaseHold);
        }
        return verdictPromise;
      };
      let destructiveAskOverride =
        (await isDestructiveMcpAskOverride(
          isAsk,
          checkResult.decisionReason,
          tool,
          input,
          effectiveMode,
          permissionContext,
          assistantMessage,
          toolUseID,
          awaitVerdictHolding,
        )) &&
        isAutoAllowedInMode(tool, getToolPermissionContext(permissionContext)) === modeSnapshot.mode &&
        isAutoModeActive() === modeSnapshot.autoActive &&
        (serverVerdictPromise === undefined || resolveRole(toolPermissionContext.mode) === "arbiter");
      if (
        serverVerdictPromise !== undefined &&
        !chromeRuleRouted &&
        isAutoAllowedInMode(tool, getToolPermissionContext(permissionContext)) === "dontAsk"
      )
        return {
          behavior: "deny",
          decisionReason: {
            type: "mode",
            mode: "dontAsk",
          },
          message: DONT_ASK_REJECT_MESSAGE(tool.name),
        };
      let isAskRuleFloor =
        carriesAskIntent &&
        !chainOnAllow &&
        !(isAsk && (!(tool.isDestructive?.(input) ?? false) || destructiveAskOverride));
      let askCeiling = tool.mcpInfo?.effectiveMaxPermission === "ask";
      let isPlanOrPolicyFloor =
        (isPlanModeFloorReason(checkResult.decisionReason) &&
          !isReadOnlyBrowserCall(getToolNameForPermissionCheck_2(tool), input)) ||
        (!chainOnAllow &&
          !hasPersonOnlyFloor &&
          isServerPolicyAskUnderPlanFloor(checkResult.decisionReason, tool, input, permissionContext));
      let safetyCheckReason_2 = findSafetyCheckReason(
        checkResult.decisionReason,
        isAutoModeDenyCircuitBreaker,
      );
      let rmTimeoutConfig =
        safetyCheckReason_2 !== undefined &&
        isAutoModePermissionSurface(toolPermissionContext) &&
        !carriesAskIntent
          ? getDangerousRmTimeoutConfig()
          : undefined;
      if (safetyCheckReason_2 !== undefined && rmTimeoutConfig?.enabled) {
        let safetyDecision = applySafetyCheckDialogPolicy(
          checkResult,
          safetyCheckReason_2,
          permissionContext,
          rmTimeoutConfig,
        );
        if (safetyDecision.behavior === "ask") {
          logEvent("tengu_auto_mode_fallback_to_ask", {
            reason: lit_2("safety_check"),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            toolUseId: sanitizeMarkName(toolUseID),
            isMcp: tool.isMcp ?? false,
            ...mcpFields(),
          });
          return safetyDecision;
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
          ...mcpFields(),
          inProtectedNamespace: isEvalBuild(),
          ...projectsRoleFields(),
          chromeAutomode: isChromeTool,
          mcpServerAskOverride: destructiveAskOverride,
          agentMsgId: sanitizeMarkName(assistantMessage.message.id),
          fromTurnHandoff: assistantMessage.handedOff === true,
          fastPath: lit_2("hardcodedDeny"),
          originalDecisionReasonType: lit_2("safetyCheck"),
          circuitBreaker: fromEnumOpt(safetyCheckReason_2.circuitBreaker),
          hookAllowVouch: permissionContext.hookAllowVouched === true,
          ...getDestructiveCommandAnalytics(tool.name, input),
        });
        return safetyDecision;
      }
      if (safetyCheckReason || isSandboxOverride || isAskRuleFloor || askCeiling || isPlanOrPolicyFloor) {
        if (toolPermissionContext.shouldAvoidPermissionPrompts) return denyPromptUnavailable(checkResult);
        if (
          safetyCheckReason ||
          sandboxOverrideUnderReadBlock ||
          isAskRuleFloor ||
          askCeiling ||
          isPlanOrPolicyFloor
        ) {
          logEvent("tengu_auto_mode_fallback_to_ask", {
            reason: lit_2(
              safetyCheckReason || sandboxOverrideUnderReadBlock
                ? "safety_check"
                : isAskRuleFloor
                  ? "ask_rule"
                  : isPlanOrPolicyFloor
                    ? "plan_mode_floor"
                    : "org_ask_ceiling",
            ),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            toolUseId: sanitizeMarkName(toolUseID),
            isMcp: tool.isMcp ?? false,
            ...mcpFields(),
          });
          return checkResult;
        }
      }
      let askUserQuestionClassifiable =
        tool.name === ASKUSERQUESTION &&
        checkResult.behavior === "ask" &&
        !alwaysTrueFlag() &&
        shouldClassifyAskUserQuestion();
      if (
        !askUserQuestionClassifiable &&
        tool.requiresUserInteraction?.() &&
        checkResult.behavior === "ask"
      ) {
        logEvent("tengu_auto_mode_fallback_to_ask", {
          reason: lit_2("requires_user_interaction"),
          toolName: sanitizeToolNameForAnalytics(tool.name),
          toolUseId: sanitizeMarkName(toolUseID),
          isMcp: tool.isMcp ?? false,
          ...mcpFields(),
        });
        return checkResult;
      }
      if (permissionRecordModule.workflowNeedsUsageConsentPrompt(tool.name, permissionContext)) {
        logEvent("tengu_auto_mode_fallback_to_ask", {
          reason: lit_2("workflow_usage_consent"),
          toolName: sanitizeToolNameForAnalytics(tool.name),
          toolUseId: sanitizeMarkName(toolUseID),
          isMcp: tool.isMcp ?? false,
          ...mcpFields(),
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
          ...mcpFields(),
        });
        return {
          ...checkResult,
          offersBlockOutsideReads: true,
        };
      }
      let state =
        permissionContext.localDenialTracking ?? appState.denialTracking ?? createDenialTrackingState();
      let autoModeClassifierRole = getAutoModeClassifierRole(toolPermissionContext.mode);
      let autoClassifierActive = isAutoClassifierActive(toolPermissionContext.mode);
      let mcpHeldOutsideAuto =
        autoModeClassifierRole === "off" &&
        !projectionOnly &&
        hasHeldServerVerdict(assistantMessage, toolUseID) &&
        isMcpReviewedOutsideAuto(tool, toolPermissionContext);
      let serverClassifierRoleForCall = resolveServerClassifierRoleForCall(
        mcpHeldOutsideAuto ? "arbiter" : autoModeClassifierRole,
        assistantMessage,
        toolUseID,
        permissionContext,
      );
      let callRole = isArbiterRole(serverClassifierRoleForCall);
      let isClientRequested = permissionContext.clientRequestedToolUseId === toolUseID;
      let roleOffReason = callRole
        ? undefined
        : isArbiterRole(autoModeClassifierRole)
          ? isClientRequested
            ? "client_call"
            : "script_call"
          : serverClassifierOffReason(toolPermissionContext.mode);
      let servedCall = toolPermissionContext.servedCall === true;
      let outsideAutoReason = isAutoClassifierActive(toolPermissionContext.mode, servedCall)
        ? undefined
        : !isAutoClassifierActive(modeSnapshot.mode, servedCall)
          ? chromeRuleRouted
            ? "chrome_rule_allowed"
            : undefined
          : typeof getMcpPermissionModeOverride(tool, toolPermissionContext) === "string"
            ? "mcp_mode_override"
            : "floor";
      if (callRole) logStrictTierUnavailable("server_arbiter");
      let isFlagOnBlock = classifierOnly?.onBlock === "flag";
      let serverClassifierActive = isServerClassifierActive(
        toolPermissionContext.mode,
        autoModeClassifierRole,
        {
          handoffReview: isFlagOnBlock,
        },
      );
      let serverClassifierActiveNoReview = isFlagOnBlock
        ? isServerClassifierActive(toolPermissionContext.mode, autoModeClassifierRole)
        : serverClassifierActive;
      let localSwitchedOff = isLocalClassifierSwitchedOff({
        handoffReview: isFlagOnBlock,
      });
      let localSwitchedOffNoReview = isFlagOnBlock ? isLocalClassifierSwitchedOff() : localSwitchedOff;
      let decisionReason =
        checkResult.decisionReason?.type === "other" &&
        checkResult.decisionReason.reason === SERVER_HOLDS_SHELL_ALLOW_REASON
          ? checkResult.decisionReason
          : undefined;
      let shellAllowHeld = decisionReason !== undefined;
      let toolHostAllowClassified =
        checkResult.decisionReason?.type === "other" &&
        checkResult.decisionReason.reason === TOOL_HOST_ALLOW_IS_CLASSIFIED_REASON;
      let reroutedFrom = decisionReason?.reroutedFrom;
      let commandNetworkListsOffered = areCommandNetworkListsOffered_2();
      let shouldFallBack = (verdict) => {
        let fallBack = shouldFallBackToLocal(serverClassifierRoleForCall, verdict, toolUseID, {
          outsideAutoMode: mcpHeldOutsideAuto,
        });
        if (
          fallBack &&
          serverClassifierRoleForCall === "arbiter" &&
          !mcpHeldOutsideAuto &&
          !serverClassifierActiveNoReview &&
          !isThirdPartyServerClassifierRefused()
        ) {
          markThirdPartyServerClassifierRefused();
          logEvent("tengu_server_classifier_no_result_latched", {
            isSubagent: permissionContext.agentId !== undefined,
            reason: fromEnum(verdict.kind === "none" ? verdict.why : "other"),
          });
          logForDebugging(
            verdict.kind === "none" && verdict.why === "server_unsupported"
              ? "[server-classifier] the API answered that it does not run the server-side classifier for this session (unsupported), so auto mode classifies locally for the rest of this session"
              : "[server-classifier] a completed response carried no classification result (no safeguard_results); assuming something on the path to the API dropped it, so auto mode classifies locally for the rest of this session",
            {
              level: "warn",
            },
          );
        }
        if (!fallBack || !serverClassifierActive) return fallBack;
        if (isServerClassifierUnsupported(verdict) || isThirdPartyServerClassifierRefused()) return true;
        let noVerdictReason = noVerdictReasonFor(verdict, toolUseID);
        return (
          noVerdictReason !== "server_input_rewritten" &&
          !isServerUnavailableReason(noVerdictReason, verdict.kind === "per_call")
        );
      };
      let editClassificationGated =
        !callRole &&
        !(
          isReplScriptCall(permissionContext) &&
          permissionContext.replScriptInner === true &&
          isArbiterRole(autoModeClassifierRole)
        ) &&
        isFileMutationTool(tool.name) &&
        classifyEditsEnabled(getMainLoopModel_2(permissionContext));
      let serverWouldAllow = async () => {
        if (!callRole || !(isFileMutationTool(tool.name) || shellAllowHeld)) return false;
        let verdict = await awaitVerdictHolding();
        let reason = noVerdictReasonFor(verdict, toolUseID);
        if (reason === "server_input_rewritten") return true;
        if (shouldFallBack(verdict))
          return !shellAllowHeld && classifyEditsEnabled(getMainLoopModel_2(permissionContext));
        if (shellAllowHeld && isServerNotRequestedReason(reason)) return false;
        let handedOffSet = handedOffIds(assistantMessage.handedOffLive);
        if (
          reason === "server_not_requested" &&
          handedOffSet?.size === 1 &&
          handedOffSet.has(toolUseID) &&
          runLoneHandedOverEditEnabled()
        )
          return (
            classifyEditsEnabled(getMainLoopModel_2(permissionContext)) ||
            shouldClassifyEdits(assistantMessage.message.model)
          );
        return reason !== "server_call_skipped";
      };
      let alwaysAllowRule = toolAlwaysAllowedRule(toolPermissionContext, tool);
      let mcpRuleClassifierRoute = getMcpRuleClassifierRoute(
        alwaysAllowRule,
        tool,
        input,
        effectiveMode,
        permissionContext,
        () => serverClassifierRoleForCall,
      );
      let mcpAlwaysAllowOverride =
        mcpRuleClassifierRoute === "serverPolicy" || mcpRuleClassifierRoute === "shadowedServerPolicy";
      let mcpAlwaysAllowShadowedBy =
        mcpRuleClassifierRoute === "shadowedServerPolicy" ? fromEnumOpt(alwaysAllowRule?.source) : undefined;
      let mcpRemoteSessionAllowOverride = mcpRuleClassifierRoute === "remoteSession";
      let coworkWebAllowOverride = isCoworkWebAllowOverride(alwaysAllowRule, tool, input, permissionContext);
      let browserRouted =
        alwaysAllowRule !== null &&
        shouldRouteBrowserCallToClassifier(
          getComputerUseChecksSetting(),
          toolPermissionContext,
          tool,
          input,
          effectiveMode,
        );
      let browserActionKind = classifyBrowserAction(toolName, input);
      let computerUseRouted =
        browserRouted && checkResult.decisionReason === undefined && mcpRuleClassifierRoute === undefined;
      let actionSummaryMeasure =
        browserActionKind === undefined
          ? undefined
          : measureActionSummaries(toolName, tool.inputJSONSchema, input);
      let computerUseFields =
        browserActionKind === undefined
          ? {}
          : {
              computerUseTool: true,
              computerUseActionKind: fromEnum(browserActionKind),
              computerUseRouted,
              computerUseActionSummaryLength:
                actionSummaryMeasure !== undefined && "length" in actionSummaryMeasure
                  ? actionSummaryMeasure.length
                  : undefined,
              computerUseActionSummaryExpectedItems:
                actionSummaryMeasure !== undefined && "filledItems" in actionSummaryMeasure
                  ? actionSummaryMeasure.expectedItems
                  : undefined,
              computerUseActionSummaryFilledItems:
                actionSummaryMeasure !== undefined && "filledItems" in actionSummaryMeasure
                  ? actionSummaryMeasure.filledItems
                  : undefined,
            };
      let inPlanMode = effectiveMode === "plan" && !shellAllowHeld;
      let worktreeDirectories = [];
      let serverOverrodeFastPath = false;
      let navigation = isChromeTool ? chrome?.navigation : undefined;
      if (navigation) recordContextNavigation(toolUseID, navigation.from, navigation.to);
      let chromePointerPress = isChromeTool && hasBrowserWriteAction(toolName, input);
      let batchSummaryCounts = isChromeTool
        ? countBatchActionSummaries(toolName, tool.inputJSONSchema, input)
        : undefined;
      let chromeSummaryFields = {
        chromeActionSummaryLength: isChromeTool
          ? getActionSummaryLength(toolName, tool.inputJSONSchema, input)
          : undefined,
        chromeActionSummaryExpectedItems: batchSummaryCounts?.expectedItems,
        chromeActionSummaryFilledItems: batchSummaryCounts?.filledItems,
      };
      let chromeWriteRouted =
        isChromeTool && shouldClassifyBrowserWrite(toolPermissionContext, toolName, input);
      let needsClassifier = navigation !== undefined || chromeWriteRouted;
      let hasSafetyCheck = findSafetyCheckReason(checkResult.decisionReason) !== undefined;
      if (
        !needsClassifier &&
        !browserRouted &&
        !chromeGrantRouted &&
        !isAgentSpawningTool(tool.name) &&
        classifierOnly === undefined &&
        !projectionOnly &&
        tool.sandboxNetworkLists?.(input) === undefined &&
        !isSandboxOverride &&
        !editClassificationGated &&
        !hasSafetyCheck &&
        !inPlanMode &&
        !(isChromeTool && getFeatureValue_CACHED_MAY_BE_STALE("tengu_radiant_hare", false))
      )
        try {
          let parsedInput = tool.inputSchema.parse(input);
          let schemaInput = (ruleString) => {
            let ruleValue = parseRuleString(ruleString);
            return !isDangerousClassifierPermission(ruleValue.toolName, ruleValue.ruleContent);
          };
          let alwaysAllowRules = import_mapValues(toolPermissionContext.alwaysAllowRules, (ruleList) =>
            (ruleList ?? []).filter(schemaInput),
          );
          let permissionLayers = permissionContext.permissionLayers?.map((permissionLayer) =>
            permissionLayer.kind === "allowed_tools"
              ? {
                  ...permissionLayer,
                  allowedTools: permissionLayer.allowedTools.filter(schemaInput),
                }
              : permissionLayer,
          );
          let checkInAcceptEdits = (directories) =>
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
          let acceptEditsDecision =
            callRole &&
            reroutedFrom === "readOnly" &&
            getRegisteredCheck(permissionContext.session, tool.name) !== undefined &&
            noVerdictReasonFor(await awaitVerdictHolding(), toolUseID) === "server_call_skipped"
              ? {
                  behavior: "allow",
                }
              : await checkInAcceptEdits([]);
          if (
            acceptEditsDecision.behavior === "ask" &&
            acceptEditsDecision.decisionReason?.type === "workingDir" &&
            isLinkedWorktreeFastPathEnabled() &&
            !isBrowserToolAutoAllowed(tool, input)
          ) {
            worktreeDirectories = await verifiedLinkedWorktreeDirectories(
              permissionContext.getAppState().toolPermissionContext,
            );
            if (worktreeDirectories.length > 0)
              acceptEditsDecision = await checkInAcceptEdits(worktreeDirectories);
          }
          serverOverrodeFastPath = acceptEditsDecision.behavior === "allow" && (await serverWouldAllow());
          if (acceptEditsDecision.behavior === "allow" && !serverOverrodeFastPath) {
            let serverVerdict = callRole ? await awaitVerdictHolding() : undefined;
            if (callRole) {
              let liveMode = isAutoAllowedInMode(tool, getToolPermissionContext(permissionContext));
              if (
                !(liveMode === modeSnapshot.mode && isAutoModeActive() === modeSnapshot.autoActive) &&
                !isStillAllowedAfterModeChange(liveMode, chromeRuleRouted, tool, input, permissionContext)
              ) {
                logEvent("tengu_auto_mode_fallback_to_ask", {
                  reason: lit_2("mode_changed_while_queued"),
                  toolName: sanitizeToolNameForAnalytics(tool.name),
                  toolUseId: sanitizeMarkName(toolUseID),
                  isMcp: tool.isMcp ?? false,
                  ...mcpFields(),
                });
                if (liveMode === "dontAsk")
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
            let askFallback = fallBackToAsk("ask_level_during_accept_edits_sim");
            if (askFallback) return askFallback;
            if (!canShowServerFallbackNotice(permissionContext.requestDialog !== undefined))
              updateDenialTrackingState(permissionContext, resetConsecutiveDenials);
            logForDebugging(
              shellAllowHeld
                ? `Server classifier skipped ${tool.name} or left it to this CLI: the tool's own allow stands`
                : `Skipping auto mode classifier for ${tool.name}: would be allowed in acceptEdits mode`,
            );
            let fastPath = shellAllowHeld
              ? "serverHeldShellAllow"
              : worktreeDirectories.length > 0
                ? "acceptEditsLinkedWorktree"
                : "acceptEdits";
            logEvent("tengu_auto_mode_decision", {
              decision: lit_2("allowed"),
              toolName: sanitizeToolNameForAnalytics(tool.name),
              toolUseId: sanitizeMarkName(toolUseID),
              isMcp: tool.isMcp ?? false,
              ...mcpFields(),
              inProtectedNamespace: isEvalBuild(),
              ...projectsRoleFields(),
              chromeAutomode: isChromeTool,
              mcpAlwaysAllowOverride,
              mcpAlwaysAllowShadowedBy,
              mcpRemoteSessionAllowOverride,
              coworkWebAllowOverride,
              ...computerUseFields,
              mcpServerAskOverride: destructiveAskOverride,
              agentMsgId: sanitizeMarkName(assistantMessage.message.id),
              fromTurnHandoff: assistantMessage.handedOff === true,
              confidence: lit_2("high"),
              fastPath: fromEnum(fastPath),
              chromePointerPress,
              ...chromeSummaryFields,
              serverHeldShellAllowFrom: fromEnumOpt(reroutedFrom),
              hookAllowVouch: permissionContext.hookAllowVouched === true,
              ...getDestructiveCommandAnalytics(tool.name, input),
              ...(serverVerdict !== undefined && {
                classifierSource: lit_2("server"),
                serverClassifierNoVerdict: fromEnumOpt(noVerdictReasonFor(serverVerdict, toolUseID)),
                classifierTotalWaitMs: serverWaitMs,
              }),
            });
            if (serverVerdict !== undefined)
              appendAutoModeDecision(permissionContext.session, {
                tool: tool.name,
                allowlisted: false,
                decision: "allowed",
                fastPath,
                serverHeldShellAllowFrom: reroutedFrom,
                durationMs: 0,
                totalWaitMs: serverWaitMs,
                classifierSource: "server",
                serverClassifierNoVerdict: noVerdictReasonFor(serverVerdict, toolUseID),
              });
            return finishClassifierAllow({
              updatedInput:
                (decisionReason ? checkResult.updatedInput : acceptEditsDecision.updatedInput) ?? input,
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
            ...mcpFields(),
            inProtectedNamespace: isEvalBuild(),
            ...projectsRoleFields(),
            chromeAutomode: isChromeTool,
            mcpAlwaysAllowOverride,
            mcpAlwaysAllowShadowedBy,
            mcpRemoteSessionAllowOverride,
            coworkWebAllowOverride,
            ...computerUseFields,
            mcpServerAskOverride: destructiveAskOverride,
            agentMsgId: sanitizeMarkName(assistantMessage.message.id),
            fromTurnHandoff: assistantMessage.handedOff === true,
            fastPath:
              worktreeDirectories.length > 0 ? lit_2("acceptEditsLinkedWorktree") : lit_2("acceptEdits"),
            hookAllowVouch: permissionContext.hookAllowVouched === true,
            error: sanitizeErrorName_2(error) ?? lit_2("unknown"),
            ...getDestructiveCommandAnalytics(tool.name, input),
          });
        }
      let onSafeAllowlist =
        classifierOnly === undefined &&
        !projectionOnly &&
        (isBrowserToolAutoAllowed(tool, input) ||
          (tool.mcpInfo?.serverName === REMOTE_BROWSER_SERVER_NAME &&
            !carriesAskIntent &&
            !hasAutoModeClassifierDenyRules() &&
            isRemoteBrowserReadWithoutClassifier(tool, input, toolPermissionContext, effectiveMode)));
      let chromeClickRouted = chromeWriteRouted && navigation === undefined && onSafeAllowlist;
      if (chromeClickRouted) keepResolvedHostPin(toolUseID);
      if (!needsClassifier && !browserRouted && onSafeAllowlist) {
        if (!canShowServerFallbackNotice(permissionContext.requestDialog !== undefined))
          updateDenialTrackingState(permissionContext, resetConsecutiveDenials);
        logForDebugging(`Skipping auto mode classifier for ${tool.name}: tool is on the safe allowlist`);
        appendAutoModeDecision(permissionContext.session, {
          tool: tool.name,
          allowlisted: true,
          decision: "allowed",
          durationMs: 0,
          ...(chromeGrantRouted && {
            chromeGrantNoClassifier: true,
          }),
        });
        logEvent("tengu_auto_mode_decision", {
          decision: lit_2("allowed"),
          toolName: sanitizeToolNameForAnalytics(tool.name),
          toolUseId: sanitizeMarkName(toolUseID),
          isMcp: tool.isMcp ?? false,
          ...mcpFields(),
          inProtectedNamespace: isEvalBuild(),
          ...projectsRoleFields(),
          chromeAutomode: isChromeTool,
          mcpAlwaysAllowOverride,
          mcpAlwaysAllowShadowedBy,
          mcpRemoteSessionAllowOverride,
          coworkWebAllowOverride,
          ...computerUseFields,
          mcpServerAskOverride: destructiveAskOverride,
          agentMsgId: sanitizeMarkName(assistantMessage.message.id),
          fromTurnHandoff: assistantMessage.handedOff === true,
          confidence: lit_2("high"),
          fastPath: lit_2("allowlist"),
          chromePointerPress,
          ...(chromeGrantRouted && {
            chromeGrantNoClassifier: true,
          }),
          ...chromeSummaryFields,
          hookAllowVouch: permissionContext.hookAllowVouched === true,
          ...getDestructiveCommandAnalytics(tool.name, input),
        });
        return finishClassifierAllow({
          updatedInput: checkResult.updatedInput ?? input,
          decisionReason:
            chromeGrantRouted && !chainOnAllow && chrome?.grantRule !== undefined
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
      if (chromeGrantRouted) {
        logEvent("tengu_auto_mode_fallback_to_ask", {
          reason: lit_2("chrome_grant_no_classifier"),
          toolName: sanitizeToolNameForAnalytics(tool.name),
          toolUseId: sanitizeMarkName(toolUseID),
          isMcp: tool.isMcp ?? false,
          ...mcpFields(),
        });
        return resolveAskWithoutPrompt(answers, tool, input, checkResult, toolUseID, permissionContext);
      }
      let desktopForwardEligible = () =>
        isAutoClassifierActive(toolPermissionContext.mode) &&
        isAutoClassifierActive(effectiveMode) &&
        checkResult.checkIncomplete !== true &&
        navigation === undefined &&
        tool.requiresUserInteraction?.() !== true &&
        classifierOnly === undefined &&
        !projectionOnly &&
        !getToolNameForPermissionCheck(tool, input) &&
        safetyCheckReason_2 === undefined;
      let unusedA = isStateOn() && permissionContext.replScriptInner === true;
      let unusedB =
        unusedA && contextKeyAccepted() && getToolPermissionContext(permissionContext).mode === "auto"
          ? await isCheaplyAutoAllowableInScript(tool, input, checkResult.decisionReason, permissionContext)
          : false;
      if (
        (unusedA ||
          (permissionContext.desktopForwardToolUseId !== undefined &&
            permissionContext.desktopForwardToolUseId === toolUseID)) &&
        desktopForwardEligible() &&
        ((unusedA && !contextKeyAccepted()) ||
          (findSafetyCheckReason(checkResult.decisionReason) === undefined &&
            !isSandboxOverride &&
            !scriptAsksToRunUnsandboxed(tool, input) &&
            checkResult.decisionReason?.type !== "workingDir" &&
            !(checkResult.blockedPath !== undefined && checkResult.bashAllowRuleOverridable !== true) &&
            !isAgentSpawningTool(tool.name) &&
            (unusedA ? unusedB : true)))
      ) {
        let askFallback = fallBackToAsk("ask_level_during_accept_edits_sim");
        if (askFallback) return askFallback;
        let liveMode = isAutoAllowedInMode(tool, getToolPermissionContext(permissionContext));
        if (liveMode !== modeSnapshot.mode || isAutoModeActive() !== modeSnapshot.autoActive) {
          logEvent("tengu_auto_mode_fallback_to_ask", {
            reason: lit_2("mode_changed_while_queued"),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            toolUseId: sanitizeMarkName(toolUseID),
            isMcp: tool.isMcp ?? false,
            ...mcpFields(),
          });
          if (liveMode === "dontAsk")
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
        let fastPath = unusedA ? "repl_inner" : "desktop_forward";
        logForDebugging(
          unusedA
            ? `Skipping auto mode classifier for ${tool.name}: inner call of a classified REPL script`
            : `Skipping auto mode classifier for ${tool.name}: this is SendMessage's forward to Claude Desktop, and the classifier already allowed that SendMessage`,
        );
        appendAutoModeDecision(permissionContext.session, {
          tool: tool.name,
          allowlisted: false,
          decision: "allowed",
          fastPath,
          durationMs: 0,
        });
        logEvent("tengu_auto_mode_decision", {
          decision: lit_2("allowed"),
          toolName: sanitizeToolNameForAnalytics(tool.name),
          toolUseId: sanitizeMarkName(toolUseID),
          isMcp: tool.isMcp ?? false,
          ...mcpFields(),
          inProtectedNamespace: isEvalBuild(),
          ...projectsRoleFields(),
          chromeAutomode: isChromeTool,
          mcpAlwaysAllowOverride,
          mcpAlwaysAllowShadowedBy,
          mcpRemoteSessionAllowOverride,
          coworkWebAllowOverride,
          ...computerUseFields,
          mcpServerAskOverride: destructiveAskOverride,
          agentMsgId: sanitizeMarkName(assistantMessage.message.id),
          fromTurnHandoff: assistantMessage.handedOff === true,
          confidence: lit_2("high"),
          fastPath: fromEnum(fastPath),
          chromePointerPress,
          ...chromeSummaryFields,
          hookAllowVouch: permissionContext.hookAllowVouched === true,
          ...getDestructiveCommandAnalytics(tool.name, input),
        });
        return finishClassifierAllow({
          updatedInput: checkResult.updatedInput ?? input,
          decisionReason: {
            type: "mode",
            mode: "auto",
          },
        });
      }
      let allowWithoutClassifier = (fastPath, reason) => {
        appendAutoModeDecision(permissionContext.session, {
          tool: tool.name,
          allowlisted: false,
          decision: "allowed",
          fastPath,
          durationMs: 0,
        });
        logEvent("tengu_auto_mode_decision", {
          decision: lit_2("allowed"),
          toolName: sanitizeToolNameForAnalytics(tool.name),
          toolUseId: sanitizeMarkName(toolUseID),
          isMcp: tool.isMcp ?? false,
          inProtectedNamespace: isEvalBuild(),
          ...projectsRoleFields(),
          chromeAutomode: isChromeTool,
          mcpAlwaysAllowOverride,
          mcpAlwaysAllowShadowedBy,
          mcpRemoteSessionAllowOverride,
          coworkWebAllowOverride,
          ...computerUseFields,
          mcpServerAskOverride: destructiveAskOverride,
          agentMsgId: sanitizeMarkName(assistantMessage.message.id),
          fromTurnHandoff: assistantMessage.handedOff === true,
          fastPath: fromEnum(fastPath),
          chromePointerPress,
          ...chromeSummaryFields,
          hookAllowVouch: permissionContext.hookAllowVouched === true,
          ...getDestructiveCommandAnalytics(tool.name, input),
        });
        return finishClassifierAllow({
          updatedInput: checkResult.updatedInput ?? input,
          decisionReason: {
            type: "other",
            reason,
          },
        });
      };
      let newDenialState = getHookCaller(permissionContext);
      if (newDenialState !== undefined) {
        logForDebugging(`Skipping auto mode classifier for ${tool.name}: called by plugin ${newDenialState}`);
        if (askUserQuestionClassifiable) return checkResult;
        if (commandNetworkListsOffered) rememberCommandNetworkLists(toolUseID, tool, input);
        return allowWithoutClassifier("pluginOrigin", `plugin-origin: ${newDenialState}`);
      }
      if (
        permissionContext.synthesizedBy !== undefined &&
        tool.name === AGENT &&
        isAutoClassifierActive(toolPermissionContext.mode) &&
        isAutoClassifierActive(effectiveMode) &&
        classifierOnly === undefined &&
        !needsClassifier &&
        !projectionOnly &&
        findSafetyCheckReason(checkResult.decisionReason, isClassifierRoutedCircuitBreaker) === undefined
      ) {
        logForDebugging(
          `Skipping auto mode classifier for ${tool.name}: synthesized by ${permissionContext.synthesizedBy}`,
        );
        return allowWithoutClassifier(
          "harnessSynthesized",
          `harness-synthesized: ${permissionContext.synthesizedBy}`,
        );
      }
      if (
        contextKeyAccepted() &&
        tool.name === REPL_TOOL_NAME &&
        !tool.mcpInfo &&
        (permissionContext.inputChangedByHook === true ||
          assistantMessage.serverClassifierInputRewritten === true)
      ) {
        logEvent("tengu_repl_script_rewrite_refused", {
          replToolUseID: sanitizeMarkName(toolUseID),
          isSubagent: permissionContext.agentId !== undefined,
          serverClassifierRole: fromEnum(serverClassifierRoleForCall),
        });
        return {
          behavior: "deny",
          message: rewrittenAfterHookMessage(),
          decisionReason: {
            type: "other",
            reason:
              "Auto mode does not run code after a hook changed it, or changed an earlier tool call in the same response. Turn the hook off, or leave auto mode, where you are asked about each of the code's tool calls that needs approval.",
          },
        };
      }
      if (
        contextKeyAccepted() &&
        callRole &&
        tool.name === REPL_TOOL_NAME &&
        !tool.mcpInfo &&
        [input.code, checkResult.updatedInput?.code].some(
          (codeText) => typeof codeText === "string" && hasUnicodeEscape(codeText),
        )
      ) {
        logEvent("tengu_repl_script_escape_refused", {
          replToolUseID: sanitizeMarkName(toolUseID),
          isSubagent: permissionContext.agentId !== undefined,
        });
        return {
          behavior: "deny",
          message: escapeRefusedMessage(),
          decisionReason: {
            type: "other",
            reason: "Auto mode cannot check code that contains a \\uXXXX escape",
          },
        };
      }
      if (
        isReplScriptCall(permissionContext) &&
        isArbiterRole(autoModeClassifierRole) &&
        (tool.name === AGENT || tool.name === SENDMESSAGE) &&
        !tool.mcpInfo
      ) {
        let isSendMessage = tool.name === SENDMESSAGE;
        if (permissionContext.permissionRound !== undefined)
          logEvent("tengu_repl_script_spawn_refused", {
            ...permissionContext.replScriptCallLabels,
            toolName: fromEnum(isSendMessage ? SENDMESSAGE : AGENT),
            isSubagent: permissionContext.agentId !== undefined,
          });
        return {
          behavior: "deny",
          message: isSendMessage ? sendMessageRefusedMessage() : agentSpawnRefusedMessage(),
          decisionReason: {
            type: "other",
            reason: isSendMessage
              ? "Claude's code cannot send messages to agents in auto mode in this session"
              : "Claude's code cannot start sub-agents in auto mode in this session",
          },
        };
      }
      if (
        isReplScriptCall(permissionContext) &&
        isArbiterRole(autoModeClassifierRole) &&
        (classifierOnly !== undefined ||
          collectToolUseIdSet(
            formatActionForClassifier(tool.name, input, toolUseID),
            permissionContext.options.tools,
          ) === undefined)
      ) {
        if (askUserQuestionClassifiable) return checkResult;
        return decideWithoutClassifier(checkResult, tool, permissionContext, classifierOnly !== undefined);
      }
      let sameTurnToolUses = permissionContext.sameTurnToolUses ?? [];
      let newDenialState_2 = isModelDrivenSession(permissionContext.agentId);
      let { messages, inheritedPrefix } = prependInheritedVerifiedTurns(
        permissionContext.messages,
        permissionContext.inheritedVerifiedHumanTurns,
        newDenialState_2,
      );
      let classifierAction = formatActionForClassifier(tool.name, input, toolUseID);
      markClassifierChecking(classifierApprovalsSetter, toolUseID);
      let classifierVerdict;
      let leftToLocal = false;
      let inputRewritten = false;
      let classifierSwitchedOff = false;
      let localUnderArbiterReason;
      let staleContext;
      let queueInfo;
      using turnSlot = new CommitTurnSlot();
      let classifierKeepalive = startClassifierKeepalive();
      let releaseHold = checkStatus.hold();
      try {
        let classifierMessages = sameTurnToolUses.length > 0 ? [...messages, ...sameTurnToolUses] : messages;
        let sessionId = pinSessionId(getSessionId());
        let runLocalClassifier = (queueProgress) =>
          classifyYoloAction(
            classifierMessages,
            classifierAction,
            permissionContext.options.tools,
            getToolPermissionContext(permissionContext),
            permissionContext.abortController.signal,
            {
              localClassifierSite: "gate",
              judgesHandback: isFlagOnBlock,
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
        let runServerClassifier = async () => {
          let serverResult = classifyServerVerdict(await awaitVerdictHolding(), toolUseID, () =>
            collectToolUseIdSet(classifierAction, permissionContext.options.tools),
          );
          if (!serverResult.shouldBlock && isServerContextStaleCheckEnabled()) {
            let staleInfo = tool.staleServerClassifierContext?.(
              input,
              assistantMessage.serverClassifierResults?.sentArtifacts,
              permissionContext,
            );
            if (staleInfo !== undefined) {
              staleContext = staleInfo;
              logForDebugging(
                `[server-classifier] ${tool.name}: what the request told the server of the artifact's ${staleInfo.phrase} was missing or no longer holds (${staleInfo.cause.kind}); the server's allow is void`,
              );
              logEvent("tengu_auto_mode_server_context_stale", {
                toolName: sanitizeToolNameForAnalytics(tool.name),
                staleOwnership: staleInfo.facts.includes("ownership"),
                staleAudience: staleInfo.facts.includes("audience"),
                staleSharedLive: staleInfo.facts.includes("shared-live"),
                staleCowritten: staleInfo.facts.includes("co-written"),
                staleAttested: staleInfo.facts.includes("attested"),
                staleTypeDeclaration: staleInfo.facts.includes("type-declaration"),
                staleWatch: staleInfo.facts.includes("watch"),
                staleConnectors: staleInfo.facts.includes("connectors"),
                staleFirstTouch: staleInfo.firstTouch,
              });
              return {
                model: serverResult.model,
                durationMs: 0,
                shouldBlock: true,
                unavailable: true,
                errorKind: SERVER_CONTEXT_STALE,
                reason: "Classifier verdict out of date - blocking for a retry",
              };
            }
          }
          return serverResult;
        };
        let withLocalFallback = async (queueProgress) => {
          let serverVerdict = await runServerClassifier();
          if (
            contextKeyAccepted() &&
            tool.name === REPL_TOOL_NAME &&
            !tool.mcpInfo &&
            serverVerdict.shouldBlock &&
            serverVerdict.errorKind === "server_input_rewritten"
          )
            return {
              ...serverVerdict,
              shouldBlock: true,
              unavailable: true,
            };
          if (
            serverVerdict.shouldBlock &&
            isInputRewrittenWithFallbackOff(serverVerdict.errorKind) &&
            mentionsToolUseId(assistantMessage, toolUseID)
          ) {
            inputRewritten = true;
            logForDebugging(
              `[server-classifier] ${tool.name}: after the server reviewed the response a hook rewrote this call's input, or that of a call before it; the local classifier judges this one call`,
            );
            let localResult = await runLocalClassifier(queueProgress);
            if (localResult.errorKind === CLASSIFIER_SWITCHED_OFF_KIND) {
              classifierSwitchedOff = true;
              if (classifierOnly?.onBlock === "flag") return localResult;
            }
            return isClassifierVerdictUsable(localResult)
              ? localResult
              : {
                  ...serverVerdict,
                  shouldBlock: true,
                  unavailable: true,
                };
          }
          if (
            !serverClassifierActive &&
            serverVerdict.errorKind === "server_not_requested" &&
            getToolNameForPermissionCheck(tool, input)
          ) {
            localUnderArbiterReason = "hosted_desktop_not_requested";
            return runLocalClassifier(queueProgress);
          }
          if (
            !projectionOnly ||
            (serverVerdict.shouldBlock &&
              (!isServerNotRequestedReason(serverVerdict.errorKind) ||
                (serverVerdict.errorKind === "server_input_rewritten" &&
                  getServerClassifierFallbackMode() !== "off")))
          )
            return serverVerdict;
          localUnderArbiterReason = "projection_only";
          return runLocalClassifier(queueProgress);
        };
        let handleBillingNotice = async () => {
          if (!isThirdPartyServerClassifierRefused()) return false;
          if ((await awaitClassifierBillingFallbackNotice(permissionContext)) === "interrupt") {
            if (!permissionContext.abortController.signal.aborted)
              turnAbortControllerOf(permissionContext.abortController).abort();
            return true;
          }
          return false;
        };
        let runClassifierByRole = callRole
          ? async (queueProgress) => {
              let serverVerdict = await awaitVerdictHolding();
              let unused =
                contextKeyAccepted() &&
                tool.name === REPL_TOOL_NAME &&
                !tool.mcpInfo &&
                noVerdictReasonFor(serverVerdict, toolUseID) === "server_input_rewritten";
              if (shouldFallBack(serverVerdict) && !unused) {
                leftToLocal = true;
                logForDebugging(
                  `[server-classifier] ${tool.name}: no server verdict for this call (${noVerdictReasonFor(serverVerdict, toolUseID)}); the local classifier decides it`,
                );
                return (await handleBillingNotice())
                  ? CLASSIFIER_BILLING_CANCELLED_RESULT
                  : runLocalClassifier(queueProgress);
              }
              return withLocalFallback(queueProgress);
            }
          : runLocalClassifier;
        let runWithBillingGuard = async (queueProgress) =>
          (await handleBillingNotice())
            ? CLASSIFIER_BILLING_CANCELLED_RESULT
            : runClassifierByRole(queueProgress);
        let runServerAware = async (queueProgress) => {
          let serverVerdict = callRole ? await awaitVerdictHolding() : undefined;
          if (serverVerdict !== undefined && !shouldFallBack(serverVerdict))
            return withLocalFallback(queueProgress);
          return (
            collectToolUseIdSet(classifierAction, permissionContext.options.tools) ??
            NO_CLASSIFIER_FOR_SESSION_RESULT
          );
        };
        classifierVerdict = await enqueueClassifierRequest(
          permissionContext.agentId ?? "main",
          serverClassifierActive ? runServerAware : runWithBillingGuard,
          (progress) => {
            queueInfo = progress;
            classifierKeepalive.restartDeadline();
          },
          {
            commitTurn: turnSlot,
          },
        );
      } finally {
        classifierKeepalive();
        releaseHold();
        clearClassifierChecking(classifierApprovalsSetter, toolUseID);
      }
      if (classifierVerdict === CLASSIFIER_BILLING_CANCELLED_RESULT)
        return {
          behavior: "deny",
          message: REJECT_MESSAGE,
          decisionReason: {
            type: "other",
            reason: CANCELLED_AT_CLASSIFIER_NOTICE_REASON,
          },
        };
      if (classifierVerdict === NO_CLASSIFIER_FOR_SESSION_RESULT && isClientRequested)
        return {
          behavior: "deny",
          decisionReason: {
            type: "classifier",
            classifier: "auto-mode",
            reason: CLASSIFIER_UNAVAILABLE_REASON,
          },
          message: `${tool.name} was not run: auto mode's safety check cannot judge a call that a client asked for in this session. This is not a judgment that it is unsafe. Another permission mode can run it.`,
        };
      if (classifierVerdict === NO_CLASSIFIER_FOR_SESSION_RESULT) {
        let serverVerdict = callRole ? await awaitVerdictHolding() : undefined;
        let isScriptCall = localSwitchedOff && roleOffReason === "script_call";
        let noVerdictReason = isScriptCall
          ? "server_not_requested"
          : serverVerdict === undefined ||
              isServerClassifierUnsupported(serverVerdict) ||
              isThirdPartyServerClassifierRefused()
            ? undefined
            : noVerdictReasonFor(serverVerdict, toolUseID);
        let serverUnavailableReason =
          serverVerdict === undefined
            ? roleOffReason
            : isServerClassifierUnsupported(serverVerdict)
              ? serverVerdict.why
              : "refused_latch";
        let isOwnSwitchOff =
          serverUnavailableReason === "user_switch_off" ||
          (serverUnavailableReason === "third_party_switch_off" && getUserServerClassifierSwitch() === false);
        let newDenialState = getToolPermissionContext(permissionContext);
        let canAskUser =
          !permissionContext.options.isNonInteractiveSession &&
          !chainOnAllow &&
          !newDenialState.shouldAvoidPermissionPrompts &&
          !isUnattendedInteractiveSession();
        let heldByDenyRules = canAskUser && hasCustomAutoModeDenyRules();
        let canOfferPrompt = canAskUser && !heldByDenyRules;
        if (
          noVerdictReason === undefined &&
          noteNoServerCheck(
            isOwnSwitchOff
              ? "own_switch_off"
              : serverUnavailableReason === "betas_disabled" ||
                  serverUnavailableReason === "third_party_switch_off"
                ? "betas_off"
                : serverUnavailableReason === "kill_switch"
                  ? "switched_off"
                  : serverUnavailableReason === "code_mode" || serverUnavailableReason === "batch_file_tools"
                    ? "feature_not_covered"
                    : "not_served",
          )
        )
          logFeatureSad("auto_mode_no_server_check", serverUnavailableReason ?? "unknown", {
            gatewayConfigured: gatewayDisplayName() !== undefined,
            interactive: canAskUser,
            heldByDenyRules,
            ...(localSwitchedOff && {
              localClassifierSwitchedOff: true,
            }),
          });
        if (noVerdictReason === undefined)
          appendAutoModeWarning(permissionContext, canOfferPrompt, heldByDenyRules);
        logForDebugging(
          noVerdictReason === undefined
            ? `[server-classifier] ${tool.name}: the server-side classifier does not run for this session (${serverUnavailableReason ?? "unknown"}) and there is no local one to fall back to`
            : `[server-classifier] ${tool.name}: no server verdict for this call (${noVerdictReason}) and there is no local classifier to fall back to`,
          {
            level: "warn",
          },
        );
        if (classifierOnly?.onBlock === "flag") {
          rememberClassifierBlock(
            toolUseID,
            localSwitchedOff
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
              reason: localSwitchedOff
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
        if (
          askUserQuestionClassifiable ||
          (classifierMayAllowAsk && !toolPermissionContext.shouldAvoidPermissionPrompts)
        ) {
          logEvent("tengu_auto_mode_fallback_to_ask", {
            reason: lit_2("requires_user_interaction"),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            toolUseId: sanitizeMarkName(toolUseID),
            isMcp: tool.isMcp ?? false,
            ...mcpFields(),
          });
          return checkResult;
        }
        if (canOfferPrompt && classifierOnly === undefined) {
          logEvent("tengu_auto_mode_fallback_to_ask", {
            reason: lit_2(
              noVerdictReason === undefined ? "no_classifier_for_session" : "no_classifier_for_call",
            ),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            toolUseId: sanitizeMarkName(toolUseID),
            isMcp: tool.isMcp ?? false,
            ...mcpFields(),
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
              reason: noVerdictReason === undefined ? NO_CHECK_FOR_SESSION_TITLE : NO_CHECK_FOR_ACTION_TITLE,
            }),
          };
        }
        let stopOrRetry = await handleServerVerdictUnavailable(
          assistantMessage.serverClassifierRequest ?? assistantMessage.message.id,
          {
            runKey: agentIdOrMain(permissionContext.agentId),
            turn: permissionContext.queryTracking?.chainId,
            signal: permissionContext.abortController.signal,
            scheduleTimeout: (schedule) => {
              schedule();
              return () => {};
            },
          },
        );
        if (stopOrRetry.kind === "stop") {
          if (
            noVerdictReason !== undefined &&
            (isScriptCall ||
              noteNoServerCheck(noVerdictReason === "server_not_requested" ? "not_requested" : "not_served"))
          )
            logFeatureSad(
              "auto_mode_no_server_check",
              isScriptCall
                ? "script_calls"
                : noVerdictReason === "server_not_requested"
                  ? "not_requested"
                  : noVerdictReason === "server_results_not_held"
                    ? "results_not_held"
                    : "calls_not_named",
              {
                gatewayConfigured: gatewayDisplayName() !== undefined,
                interactive: canAskUser,
                heldByDenyRules,
                ...(localSwitchedOff && {
                  localClassifierSwitchedOff: true,
                }),
              },
            );
          appendAutoModeWarning(permissionContext, canOfferPrompt, heldByDenyRules);
          let unavailableReason =
            noVerdictReason === undefined ? "no_classifier_for_session" : "no_classifier_for_call";
          if (permissionContext.agentId === undefined) noteNoServerCheckStoppedTurn();
          else {
            let notesByAgent = autoModeUnavailableNotes.of(permissionContext.session.host);
            if (notesByAgent.has(permissionContext.agentId))
              notesByAgent.set(permissionContext.agentId, unavailableReason);
          }
          return {
            ...stopTurnForMissingVerdict(tool, permissionContext, stopOrRetry.recorded, unavailableReason),
            message: `Auto mode is unavailable: ${describeAutoModeUnavailableCause(unavailableReason)}, so ${tool.name} was not run and this turn has ended. Wait for the user's next message before doing anything further.`,
          };
        }
        if (stopOrRetry.interrupted) throw new AbortError_2();
        let retryAdvice = isScriptCall
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
            classifierOnly !== undefined
              ? `${tool.name} was not run: only auto mode's safety check can allow it, and that check gave no result. No permission prompt is raised for this tool. This is not a judgment that the action is unsafe. Continue with work that doesn't need it, then tell the user that it was not run and why.`
              : heldByDenyRules
                ? `${tool.name} was not run: auto mode's safety check ${noVerdictReason === undefined ? "does not run for this session" : "gave no result"}, and nobody is asked to approve it in its place, because the settings hold auto mode deny rules, which only the automatic check applies. This is not a judgment that the action is unsafe. ${noVerdictReason === undefined ? "Other actions that need the check will be denied too, and retrying won't help. Finish what you can without them, then tell the user what is blocked and why." : `${retryAdvice} then tell the user that it was not run and why.`}`
                : noVerdictReason === undefined
                  ? `Auto mode is unavailable: its safety check does not run for this session, so ${tool.name} was not run. Other actions that need the check will be denied too, and retrying won't help. Finish what you can without them, then tell the user what is blocked and that they can switch to another permission mode.`
                  : `${tool.name} was not run: auto mode has no safety result for this call, and nobody can be asked to approve it here. This is not a judgment that it is unsafe. ${retryAdvice} then tell the user that auto mode has no safety result for it and that they can approve it themselves in another permission mode.`,
        };
      }
      classifierVerdict = {
        ...classifierVerdict,
        reason: classifierWrittenReason(classifierVerdict.reason),
      };
      let classifierSource =
        callRole && !leftToLocal && !inputRewritten && localUnderArbiterReason === undefined
          ? "server"
          : "local";
      let switchedOffOrRefused =
        classifierSwitchedOff || classifierVerdict.errorKind === CLASSIFIER_SWITCHED_OFF_KIND;
      let roleFields = {
        serverClassifierRole: fromEnum(serverClassifierRoleForCall),
        serverClassifierOffReason: fromEnumOpt(roleOffReason),
        classifiedOutsideAutoMode: fromEnumOpt(outsideAutoReason),
        classifierSite:
          classifierSource === "local" && classifierVerdict.classifierRan !== false && !switchedOffOrRefused
            ? lit_2("gate")
            : undefined,
        localUnderArbiterReason: fromEnumOpt(
          inputRewritten ? "input_rewritten" : leftToLocal ? "left_to_local" : localUnderArbiterReason,
        ),
        serverClassifierConnection: fromEnumOpt(getApiRouteKind()),
        betasSwitchSetAside:
          isBetasSwitchSetAside({
            peek: true,
          }) || undefined,
      };
      if (
        leftToLocal &&
        !classifierVerdict.unavailable &&
        !classifierVerdict.transcriptTooLong &&
        !classifierVerdict.refusedBySafeguard
      )
        clearUnavailableStreak(agentIdOrMain(permissionContext.agentId));
      let commitWaitMs;
      let inputRewriteFallback =
        classifierVerdict.unavailable === true &&
        classifierVerdict.errorKind === "server_input_rewritten" &&
        mentionsToolUseId(assistantMessage, toolUseID) &&
        getServerClassifierFallbackMode() !== "off";
      let quotedInput =
        inputRewriteFallback &&
        (assistantMessage.serverClassifierOwnInputRewritten === true ||
          assistantMessage.serverClassifierInputRewrite !== undefined)
          ? quoteToolInputForClassifierMessage(tool, input, assistantMessage[inputAsWrittenSymbol])
          : undefined;
      let isTurnStepRewrite = assistantMessage.serverClassifierInputRewrite?.cause === "turn_step";
      let countTotal = quotedInput !== undefined && quotedInput.kind !== "quoted" && !isTurnStepRewrite;
      let commitReached =
        isCountedClassifierBlock(classifierVerdict) || inputRewriteFallback ? turnSlot.reached() : undefined;
      if (commitReached !== undefined) {
        let now = Date.now();
        await commitReached;
        commitWaitMs = Date.now() - now;
      }
      {
        effectiveMode = isAutoAllowedInMode(tool, getToolPermissionContext(permissionContext));
        if (
          !(effectiveMode === modeSnapshot.mode && isAutoModeActive() === modeSnapshot.autoActive) &&
          !isStillAllowedAfterModeChange(effectiveMode, chromeRuleRouted, tool, input, permissionContext)
        ) {
          logEvent("tengu_auto_mode_fallback_to_ask", {
            reason: lit_2("mode_changed_while_queued"),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            toolUseId: sanitizeMarkName(toolUseID),
            isMcp: tool.isMcp ?? false,
            ...mcpFields(),
            ...roleFields,
          });
          if (effectiveMode === "dontAsk")
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
        let askFallback = fallBackToAsk("ask_level_while_queued", roleFields);
        if (askFallback) return askFallback;
      }
      let decisionOutcome = classifierVerdict.unavailable
        ? "unavailable"
        : classifierVerdict.refusedBySafeguard
          ? "refused"
          : classifierVerdict.shouldBlock
            ? "blocked"
            : "allowed";
      let newDenialState_3 = fallbackUsageDelta(classifierVerdict);
      let totalWaitMs =
        (serverWaitMs ?? 0) +
        (queueInfo?.queueWaitMs ?? 0) +
        (classifierVerdict.durationMs ?? 0) +
        (commitWaitMs ?? 0);
      let skippedOnExactMcpRule =
        classifierVerdict.errorKind === "server_call_skipped" &&
        sentExactMcpAllowRule(assistantMessage.serverClassifierResults, tool.name);
      let lostVerdictNote =
        callRole && serverVerdict !== undefined
          ? getRewriteLostVerdictNote(assistantMessage, noVerdictReasonFor(serverVerdict, toolUseID))
          : undefined;
      appendAutoModeDecision(permissionContext.session, {
        tool: tool.name,
        allowlisted: false,
        decision: decisionOutcome,
        classifierModel: classifierVerdict.model,
        inputTokens: classifierVerdict.usage?.inputTokens,
        outputTokens: classifierVerdict.usage?.outputTokens,
        cacheReadInputTokens: classifierVerdict.usage?.cacheReadInputTokens,
        cacheCreationInputTokens: classifierVerdict.usage?.cacheCreationInputTokens,
        durationMs: classifierVerdict.durationMs,
        costUSD: newDenialState_3,
        stage: classifierVerdict.stage,
        category: classifierVerdict.category,
        stage1Severity: classifierVerdict.stage1Severity,
        stage2Severity: classifierVerdict.stage2Severity,
        originalDecisionReasonType: checkResult.decisionReason?.type,
        editClassificationGated,
        serverVerdictOverrodeFastPath: serverOverrodeFastPath,
        serverHeldShellAllowFrom: reroutedFrom,
        classifierSource,
        ...roleFields,
        serverClassifierNoVerdict: callRole
          ? (noVerdictReasonFor(await awaitVerdictHolding(), toolUseID) ??
            getStaleContextErrorKind(classifierVerdict))
          : undefined,
        totalWaitMs,
      });
      let blockOutcome =
        classifierOnly?.onBlock === "flag"
          ? getClassifierBlockOutcome(
              localSwitchedOffNoReview && classifierVerdict.errorKind === "server_input_rewritten"
                ? {
                    ...classifierVerdict,
                    errorKind: CLASSIFIER_SWITCHED_OFF_KIND,
                  }
                : classifierVerdict,
            )
          : undefined;
      let promptAfterChromeFloor = (classifierResult) =>
        shouldPromptAfterChromeFloorBlock({
          siteGrantRouted: chromeRuleRouted && chrome?.domainAllowed === true,
          mode: effectiveMode,
          liveContext: getToolPermissionContext(permissionContext),
          chainOnAllow,
          classifierResult,
        });
      let countsAsBlock =
        (classifierVerdict.shouldBlock &&
          !classifierVerdict.unavailable &&
          classifierVerdict.errorKind !== SAFETY_MONITOR_BLOCKED &&
          !classifierVerdict.transcriptTooLong &&
          !classifierVerdict.refusedBySafeguard &&
          blockOutcome === undefined &&
          !promptAfterChromeFloor(classifierVerdict)) ||
        (inputRewriteFallback &&
          blockOutcome === undefined &&
          !askUserQuestionClassifiable &&
          state.lastRewriteMessageId !== assistantMessage.message.id);
      let targetsThisCall =
        classifierVerdict.shouldBlock &&
        !inputRewriteFallback &&
        isClassifierTargetToolUse(assistantMessage, toolUseID, permissionContext.clientRequestedToolUseId);
      let undoneDenials =
        targetsThisCall && countsAsBlock
          ? state.consecutiveDenials - undoRewriteDenialIfRetried(state, tool.name, input).consecutiveDenials
          : 0;
      logEvent("tengu_auto_mode_decision", {
        decision: fromEnum(decisionOutcome),
        toolName: sanitizeToolNameForAnalytics(tool.name),
        toolUseId: sanitizeMarkName(toolUseID),
        ...false,
        isMcp: tool.isMcp ?? false,
        ...mcpFields(),
        inProtectedNamespace: isEvalBuild(),
        ...projectsRoleFields(),
        chromeAutomode: isChromeTool,
        chromeNavigationForced: navigation !== undefined,
        chromePointerPress,
        chromeClickRouted,
        ...chromeSummaryFields,
        hookAllowVouch: permissionContext.hookAllowVouched === true,
        mcpAlwaysAllowOverride,
        mcpAlwaysAllowShadowedBy,
        mcpRemoteSessionAllowOverride,
        coworkWebAllowOverride,
        ...computerUseFields,
        mcpServerAskOverride: destructiveAskOverride,
        ...getDestructiveCommandAnalytics(tool.name, input),
        ...(decisionOutcome === "blocked" && bashProgramsField(tool, input)),
        stripAllBashFlag: classifyAllShellEnabled(),
        originalDecisionReasonType: fromEnumOpt(checkResult.decisionReason?.type),
        circuitBreaker: fromEnumOpt(
          findSafetyCheckReason(checkResult.decisionReason, (reason) => reason.circuitBreaker !== undefined)
            ?.circuitBreaker,
        ),
        editClassificationGated,
        serverVerdictOverrodeFastPath: serverOverrodeFastPath,
        serverHeldShellAllowFrom: fromEnumOpt(reroutedFrom),
        agentMsgId: sanitizeMarkName(assistantMessage.message.id),
        fromTurnHandoff: assistantMessage.handedOff === true,
        sameTurnSiblings: sameTurnToolUses.length,
        inheritedVerifiedTurns: inheritedPrefix,
        classifierQueueDepth: queueInfo?.queueDepth,
        classifierQueueWaitMs: queueInfo?.queueWaitMs,
        ...(queueInfo?.overlap !== undefined && {
          classifierQueueOverlapEnabled: true,
          classifierQueueInFlightAtStart: queueInfo.overlap.inFlightAtStart,
          classifierQueueOverlapped: queueInfo.overlap.overlapped,
          classifierQueueReleasedByEscalation: queueInfo.overlap.releasedByEscalation,
          classifierQueueCommitWaitMs: commitWaitMs,
        }),
        classifierSource: fromEnum(classifierSource),
        ...roleFields,
        ...(isCcsTenant() && {
          sessionAutoClassifierActive: autoClassifierActive,
        }),
        serverClassifierNoVerdict: callRole
          ? fromEnumOpt(
              noVerdictReasonFor(await awaitVerdictHolding(), toolUseID) ??
                getStaleContextErrorKind(classifierVerdict),
            )
          : undefined,
        serverRewriteCause: fromEnumOpt(
          lostVerdictNote && (assistantMessage.serverClassifierInputRewrite?.cause ?? lostVerdictNote.cause),
        ),
        serverRewriteLostVerdict: fromEnumOpt(lostVerdictNote?.lostVerdict),
        skippedOnAllowRule: skippedOnExactMcpRule,
        serverRewriteSource: fromEnumOpt(assistantMessage.serverClassifierInputRewrite?.source),
        serverRewriteByLocalCode: assistantMessage.serverClassifierInputRewrite?.byLocalCode,
        serverRewriteShape: fromEnumOpt(assistantMessage.serverClassifierInputRewrite?.shape),
        serverRewriteKeptVerdict:
          assistantMessage.serverClassifierInputRewrite === undefined
            ? undefined
            : assistantMessage.serverClassifierInputRewrite.keptVerdict && !inputRewriteFallback,
        serverRewriteUnquoted:
          quotedInput === undefined || quotedInput.kind === "quoted" ? undefined : fromEnum(quotedInput.kind),
        classifierTotalWaitMs: totalWaitMs,
        classifierModel: telemetrySafeModelName(classifierVerdict.model),
        classifierCategory: (isDiskless() ? sanitizeRuleCategory : sanitizeRuleCategoryOrUndefined)(
          decisionOutcome === "blocked"
            ? classifierReasonLabel(classifierVerdict)
            : classifierVerdict.category,
        ),
        classifierStage1Severity: classifierVerdict.stage1Severity,
        classifierStage2Severity: classifierVerdict.stage2Severity,
        ...(classifierVerdict.remoteBrowserRule !== undefined && {
          classifierRemoteBrowserRule: true,
        }),
        consecutiveDenials: classifierVerdict.shouldBlock
          ? state.consecutiveDenials - undoneDenials + (countsAsBlock ? 1 : 0)
          : 0,
        totalDenials: state.totalDenials + ((countsAsBlock && !inputRewriteFallback) || countTotal ? 1 : 0),
        classifierInputTokens: classifierVerdict.usage?.inputTokens,
        classifierOutputTokens: classifierVerdict.usage?.outputTokens,
        classifierCacheReadInputTokens: classifierVerdict.usage?.cacheReadInputTokens,
        classifierCacheCreationInputTokens: classifierVerdict.usage?.cacheCreationInputTokens,
        classifierDurationMs: classifierVerdict.durationMs,
        classifierSystemPromptLength: classifierVerdict.promptLengths?.systemPrompt,
        classifierToolCallsLength: classifierVerdict.promptLengths?.toolCalls,
        classifierUserPromptsLength: classifierVerdict.promptLengths?.userPrompts,
        sessionInputTokens: getTotalInputTokens(),
        sessionOutputTokens: getTotalOutputTokens(),
        sessionCacheReadInputTokens: getTotalCacheReadInputTokens(),
        sessionCacheCreationInputTokens: getTotalCacheCreationInputTokens(),
        classifierCostUSD: newDenialState_3,
        classifierStage: fromEnumOpt(classifierVerdict.stage),
        classifierFailureMode: fromEnumOpt(classifierVerdict.failureMode),
        classifierStage1InputTokens: classifierVerdict.stage1Usage?.inputTokens,
        classifierStage1OutputTokens: classifierVerdict.stage1Usage?.outputTokens,
        classifierStage1CacheReadInputTokens: classifierVerdict.stage1Usage?.cacheReadInputTokens,
        classifierStage1CacheCreationInputTokens: classifierVerdict.stage1Usage?.cacheCreationInputTokens,
        classifierStage1DurationMs: classifierVerdict.stage1DurationMs,
        classifierStage1RequestId: sanitizeMarkName(classifierVerdict.stage1RequestId),
        classifierStage1MsgId: sanitizeMarkName(classifierVerdict.stage1MsgId),
        classifierStage1CostUSD:
          classifierVerdict.stage1Usage && classifierVerdict.model
            ? calculateCostFromTokenCounts(classifierVerdict.model, classifierVerdict.stage1Usage)
            : undefined,
        classifierStage2InputTokens: classifierVerdict.stage2Usage?.inputTokens,
        classifierStage2OutputTokens: classifierVerdict.stage2Usage?.outputTokens,
        classifierStage2CacheReadInputTokens: classifierVerdict.stage2Usage?.cacheReadInputTokens,
        classifierStage2CacheCreationInputTokens: classifierVerdict.stage2Usage?.cacheCreationInputTokens,
        classifierStage2DurationMs: classifierVerdict.stage2DurationMs,
        classifierStage2RequestId: sanitizeMarkName(classifierVerdict.stage2RequestId),
        classifierStage2MsgId: sanitizeMarkName(classifierVerdict.stage2MsgId),
        classifierStage2CostUSD:
          classifierVerdict.stage2Usage && classifierVerdict.model
            ? calculateCostFromTokenCounts(classifierVerdict.model, classifierVerdict.stage2Usage)
            : undefined,
      });
      if (mcpHeldOutsideAuto) {
        let noVerdictReason =
          noVerdictReasonFor(await awaitVerdictHolding(), toolUseID) ??
          getStaleContextErrorKind(classifierVerdict);
        if (noVerdictReason === undefined) logFeatureOk("auto_mode_floor_server_check");
        else logFeatureSad("auto_mode_floor_server_check", noVerdictReason);
      }
      if (classifierOnly !== undefined && classifierVerdict.classifierRan === false) {
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
            reason: classifierVerdict.reason,
            noVerdict: true,
          },
          message: `${tool.name} was not reviewed: it gave the auto mode classifier nothing to judge (its toAutoClassifierInput is empty), and only the classifier can allow it. This is a tool bug, not a judgment on the action.`,
        };
      }
      if (blockOutcome !== undefined) {
        rememberClassifierBlock(toolUseID, blockOutcome);
        logForDebugging(
          `Auto mode classifier gave no verdict for ${tool.name} (${blockOutcome.kind}); delivering flagged`,
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
              blockOutcome.kind === "refused"
                ? blockOutcome.switchedOff
                  ? UNREVIEWED_SUBAGENT_REPORT_WARNING
                  : "Delivered with a warning: the classifier request was refused by the safety safeguard"
                : "Delivered with a note: the classifier could not review it",
            noVerdict: true,
          },
        };
      }
      if (classifierVerdict.shouldBlock) {
        if (classifierVerdict.transcriptTooLong) {
          let serverInputTooLong = classifierVerdict.errorKind === SERVER_CALL_UNAVAILABLE_INPUT_TOO_LONG;
          let classifierOnlyDeny =
            classifierOnly !== undefined && !toolPermissionContext.shouldAvoidPermissionPrompts;
          let agentMayProceed =
            !serverInputTooLong &&
            !hasPersonOnlyFloor &&
            !tool.mcpInfo &&
            ((tool.name === AGENT && !isReplScriptCall(permissionContext)) || false);
          let tooLongArm = classifierOnlyDeny
            ? "classifier_only_deny"
            : agentMayProceed
              ? "allow"
              : askUserQuestionClassifiable
                ? "question_dialog"
                : "deny";
          let compactRequest = isMerryPopcornOn()
            ? requestDenialCompact(permissionContext, permissionContext.messages, {
                toolName: tool.name,
                denied:
                  (tooLongArm === "deny" || tooLongArm === "classifier_only_deny") &&
                  permissionContext.permissionRound !== undefined,
                mode: toolPermissionContext.mode,
              })
            : undefined;
          let hasCompactRequest = compactRequest !== undefined;
          if (compactRequest === "requested")
            logEvent("tengu_auto_mode_classifier_overflow_compact", {
              stage: lit_2("requested"),
              arm: fromEnum(tooLongArm),
              toolName: sanitizeToolNameForAnalytics(tool.name),
              isMcp: tool.isMcp ?? false,
              isSubagent: permissionContext.agentId !== undefined,
              headless: toolPermissionContext.shouldAvoidPermissionPrompts === true,
              serverPath: callRole && !leftToLocal,
              serverInputTooLong,
            });
          if (!serverInputTooLong || hasCompactRequest) {
            if (classifierOnlyDeny) {
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
                ...(hasCompactRequest && {
                  selfMending: true,
                }),
                message: hasCompactRequest
                  ? `${tool.name} was not reviewed and did not run: the conversation is too long for auto mode's classifier, and no permission prompt is raised for this tool. This is not a judgment that the action is unsafe. Claude Code will try to compact the conversation before the next request; if this action is still needed after that, issue it again.`
                  : `${tool.name} was not reviewed: the auto mode classifier transcript exceeded its context window, and no permission prompt is raised for this tool. This is not a judgment that the action is unsafe; the same call will hit the same limit until the conversation is shorter.`,
              };
            }
            if (agentMayProceed)
              return {
                behavior: "allow",
                updatedInput: input,
                decisionReason: {
                  type: "mode",
                  mode: "auto",
                },
              };
            if (askUserQuestionClassifiable) {
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
                ...mcpFields(),
              });
              return checkResult;
            }
            if (hasCompactRequest) {
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
                selfMending: true,
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
              ...mcpFields(),
            });
            if (effectiveMode === "dontAsk")
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
        let safetyMonitorBlocked =
          classifierVerdict.errorKind === SAFETY_MONITOR_BLOCKED && !classifierVerdict.refusedBySafeguard;
        if (classifierVerdict.unavailable || safetyMonitorBlocked) {
          if (
            (askUserQuestionClassifiable ||
              (classifierMayAllowAsk && !toolPermissionContext.shouldAvoidPermissionPrompts)) &&
            !safetyMonitorBlocked
          ) {
            if (skippedOnExactMcpRule) noteRefusedMcpSkip(tool.name);
            logForDebugging("Auto mode classifier unavailable, falling back to the question dialog", {
              level: "warn",
            });
            logEvent("tengu_auto_mode_fallback_to_ask", {
              reason: lit_2("requires_user_interaction"),
              toolName: sanitizeToolNameForAnalytics(tool.name),
              toolUseId: sanitizeMarkName(toolUseID),
              isMcp: tool.isMcp ?? false,
              ...mcpFields(),
            });
            return checkResult;
          }
          if (inputRewriteFallback) {
            let unavailableDenial = {
              behavior: "deny",
              decisionReason: {
                type: "classifier",
                classifier: "auto-mode",
                reason: CLASSIFIER_UNAVAILABLE_REASON,
              },
              ...(!countTotal && {
                selfMending: true,
              }),
              message: buildClassifierUnavailableMessage(
                tool.name,
                classifierVerdict.model,
                classifierVerdict.httpStatus,
                classifierVerdict.errorKind,
                classifierVerdict.retryAfterMs,
                assistantMessage.handedOff === true,
                undefined,
                false,
                alwaysFullClassifierRole(permissionContext),
                {
                  quote: quotedInput,
                  recorded: isTurnStepRewrite,
                },
              ),
            };
            let state = updateDenialTrackingState(permissionContext, (state) =>
              recordRewriteDenial(
                state,
                assistantMessage.message.id,
                quotedInput?.kind === "quoted" || state.lastRewriteMessageId !== assistantMessage.message.id
                  ? fingerprintToolCall(tool.name, quotedInput?.kind === "quoted" ? quotedInput.input : input)
                  : state.lastRewriteFingerprint,
                countTotal,
              ),
            );
            let denialLimitResult =
              classifierOnly !== undefined && !toolPermissionContext.shouldAvoidPermissionPrompts
                ? null
                : handleDenialLimitExceeded(
                    state,
                    HOOK_REWROTE_INPUT_REVIEW_REASON,
                    assistantMessage,
                    toolUseID,
                    tool,
                    checkResult,
                    permissionContext,
                    isAutoClassifierActive(effectiveMode),
                    {
                      ...unavailableDenial,
                      decideLocation: "pre-ask",
                    },
                  );
            if (denialLimitResult) {
              if (effectiveMode === "dontAsk")
                return {
                  behavior: "deny",
                  decisionReason: {
                    type: "mode",
                    mode: "dontAsk",
                  },
                  message: DONT_ASK_REJECT_MESSAGE(tool.name),
                };
              return denialLimitResult;
            }
            if (quotedInput?.kind === "quoted")
              recordPromptedToolCall({
                agentId: permissionContext.agentId,
                tool: tool.name,
                input: quotedInput.input,
                message: assistantMessage,
              });
            return unavailableDenial;
          }
          if (
            (mcpHeldOutsideAuto ||
              (!autoClassifierActive && classifierVerdict.errorKind === CLASSIFIER_SWITCHED_OFF_KIND)) &&
            (!leftToLocal || classifierVerdict.errorKind === CLASSIFIER_SWITCHED_OFF_KIND) &&
            !inputRewritten &&
            !safetyMonitorBlocked
          ) {
            if (skippedOnExactMcpRule) noteRefusedMcpSkip(tool.name);
            let whyNoPrompt =
              effectiveMode === "dontAsk"
                ? "the permission mode is don't ask"
                : classifierOnly !== undefined
                  ? "no prompt can approve this tool"
                  : hasCustomAutoModeDenyRules()
                    ? "the settings hold auto mode deny rules, which only the automatic check applies"
                    : getIsNonInteractiveSession() || chainOnAllow
                      ? "an app or a script runs this session, so a program might answer the prompt"
                      : permissionContext.options.isNonInteractiveSession
                        ? "a background agent or a teammate made the call, so the prompt might not be seen"
                        : getToolPermissionContext(permissionContext).shouldAvoidPermissionPrompts
                          ? "this session shows no prompts"
                          : isUnattendedInteractiveSession()
                            ? "Remote Control is connected, or the session runs in the background or in a teammate's pane, so the prompt might not be seen"
                            : undefined;
            if (whyNoPrompt !== undefined) {
              logForDebugging(
                `[server-classifier] ${tool.name}: no server verdict for this call outside auto mode (${classifierVerdict.errorKind ?? "unknown kind"}); nobody is asked here, denying`,
                {
                  level: "warn",
                },
              );
              return denyPromptUnavailable(
                checkResult,
                `${tool.name} did not run. The automatic safety check gave no verdict on this call, and Claude Code doesn't ask for approval in its place here: ${whyNoPrompt}. This is not a judgment that the action is unsafe, and a later call may get a verdict. Don't retry it now. Continue with work that doesn't need it, and tell the user that ${tool.name} could not be approved here.`,
              );
            }
            logForDebugging(
              `[server-classifier] ${tool.name}: no server verdict for this call outside auto mode (${classifierVerdict.errorKind ?? "unknown kind"}); asking the person`,
              {
                level: "warn",
              },
            );
            logEvent("tengu_auto_mode_fallback_to_ask", {
              reason:
                classifierVerdict.errorKind === CLASSIFIER_SWITCHED_OFF_KIND
                  ? lit_2("floor_local_classifier_switched_off")
                  : lit_2("floor_no_server_verdict"),
              toolName: sanitizeToolNameForAnalytics(tool.name),
              toolUseId: sanitizeMarkName(toolUseID),
              isMcp: tool.isMcp ?? false,
              ...mcpFields(),
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
            callRole &&
            !mcpHeldOutsideAuto &&
            !leftToLocal &&
            !safetyMonitorBlocked &&
            serverClassifierRequest !== undefined &&
            isServerUnavailableReason(
              classifierVerdict.errorKind,
              (await awaitVerdictHolding()).kind === "per_call",
            )
          ) {
            let retryOutcome = await waitForServerClassifierRetry(
              serverClassifierRequest,
              permissionContext,
              classifierApprovalsSetter,
              toolUseID,
              checkStatus,
            );
            if (retryOutcome.kind === "stop")
              return stopTurnForMissingVerdict(tool, permissionContext, retryOutcome.recorded, "no_verdict");
            if (retryOutcome.interrupted) throw new AbortError_2();
          }
          logForDebugging(
            classifierVerdict.retryAfterMs === undefined
              ? "Auto mode classifier unavailable, denying with retry guidance (fail closed)"
              : "Auto mode classifier told to wait by the API, denying (fail closed)",
            {
              level: "warn",
            },
          );
          if (skippedOnExactMcpRule) noteRefusedMcpSkip(tool.name);
          let selfMending =
            classifierVerdict.errorKind === "server_results_not_held" ||
            classifierVerdict.errorKind === "server_call_unavailable_truncated" ||
            classifierVerdict.errorKind === SERVER_CONTEXT_STALE ||
            skippedOnExactMcpRule;
          return {
            behavior: "deny",
            decisionReason: {
              type: "classifier",
              classifier: "auto-mode",
              reason: CLASSIFIER_UNAVAILABLE_REASON,
              ...false,
            },
            ...(selfMending && {
              selfMending: true,
            }),
            message: buildClassifierUnavailableMessage(
              tool.name,
              classifierVerdict.model,
              classifierVerdict.httpStatus,
              classifierVerdict.errorKind,
              classifierVerdict.retryAfterMs,
              assistantMessage.handedOff === true,
              staleContext,
              skippedOnExactMcpRule,
              alwaysFullClassifierRole(permissionContext),
            ),
          };
        }
        if (classifierVerdict.refusedBySafeguard) {
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
              reason: classifierVerdict.reason,
              noVerdict: true,
            },
            message: buildClassifierRefusedOrTransientGuidance(classifierVerdict.reason, {
              refused: true,
              callerHasReadTools: alwaysFullClassifierRole(permissionContext),
            }),
          };
        }
        if (promptAfterChromeFloor(classifierVerdict)) {
          logEvent("tengu_auto_mode_fallback_to_ask", {
            reason: lit_2("chrome_floor_block"),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            toolUseId: sanitizeMarkName(toolUseID),
            isMcp: tool.isMcp ?? false,
            ...mcpFields(),
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
              reason: classifierVerdict.reason,
            }),
          };
        }
        let state = updateDenialTrackingState(permissionContext, (state) =>
          incrementDenialCounts(
            targetsThisCall ? undoRewriteDenialIfRetried(state, tool.name, input) : state,
          ),
        );
        logForDebugging(`Auto mode classifier blocked action: ${classifierVerdict.reason}`, {
          level: "warn",
        });
        if (classifierOnly?.onBlock === "flag") {
          rememberClassifierBlock(toolUseID, {
            kind: "blocked",
            reason: classifierVerdict.reason,
          });
          return {
            behavior: "allow",
            updatedInput: checkResult.updatedInput ?? input,
            decisionReason: {
              type: "classifier",
              classifier: "auto-mode",
              reason: `Flagged by the classifier, delivered with its warning: ${classifierVerdict.reason}`,
            },
          };
        }
        let classifierDenyResult = buildClassifierDenyResult(
          classifierVerdict,
          permissionContext,
          tool,
          input,
          checkResult,
        );
        let denialLimitResult =
          askUserQuestionClassifiable ||
          (classifierOnly !== undefined && !toolPermissionContext.shouldAvoidPermissionPrompts)
            ? null
            : handleDenialLimitExceeded(
                state,
                classifierVerdict.reason,
                assistantMessage,
                toolUseID,
                tool,
                checkResult,
                permissionContext,
                isAutoClassifierActive(effectiveMode),
                {
                  ...classifierDenyResult,
                  decideLocation: "pre-ask",
                },
              );
        if (denialLimitResult) {
          if (effectiveMode === "dontAsk")
            return {
              behavior: "deny",
              decisionReason: {
                type: "mode",
                mode: "dontAsk",
              },
              message: DONT_ASK_REJECT_MESSAGE(tool.name),
            };
          return denialLimitResult;
        }
        return classifierDenyResult;
      }
      let serverSummary =
        classifierSource === "server" && assistantMessage.handedOff !== true
          ? summarizeServerVerdict(await startServerVerdict(), toolUseID)
          : undefined;
      let serverCleared = serverSummary?.kind === "verdict" && serverSummary.outcome === "not_flagged";
      if (
        (!askUserQuestionClassifiable && !shellAllowHeld && !toolHostAllowClassified && !chromeClickRouted) ||
        !canShowServerFallbackNotice(permissionContext.requestDialog !== undefined)
      )
        turnSlot.runInTurn(() => updateDenialTrackingState(permissionContext, resetConsecutiveDenials));
      if (askUserQuestionClassifiable) {
        logEvent("tengu_auto_mode_fallback_to_ask", {
          reason: lit_2("requires_user_interaction"),
          toolName: sanitizeToolNameForAnalytics(tool.name),
          toolUseId: sanitizeMarkName(toolUseID),
          isMcp: tool.isMcp ?? false,
          ...mcpFields(),
        });
        return checkResult;
      }
      return finishClassifierAllow({
        updatedInput: checkResult.updatedInput ?? input,
        decisionReason: {
          type: "classifier",
          classifier: "auto-mode",
          reason: classifierVerdict.reason,
        },
        classifierRan: classifierVerdict.classifierRan,
        serverCleared,
      });
    }
    let canAskHostCard =
      isSdkDialogHostActive() &&
      getPermissionPromptPerson() !== null &&
      permissionContext.requestDialog !== undefined &&
      permissionContext.asksNoHost !== true &&
      !toolPermissionContext.shouldAvoidPermissionPrompts &&
      toolPermissionContext.servedCall !== true;
    if (
      effectiveMode === "bypassPermissions" &&
      !carriesAskRuleIntent(checkResult) &&
      (canShowSafetyCheckDialog(permissionContext) || canAskHostCard)
    ) {
      let safetyCheckReason = findSafetyCheckReason(checkResult.decisionReason, isAutoModeDenyCircuitBreaker);
      let rmTimeoutConfig = safetyCheckReason !== undefined ? getDangerousRmTimeoutConfig() : undefined;
      if (
        safetyCheckReason !== undefined &&
        rmTimeoutConfig?.enabled &&
        (rmTimeoutConfig.denyOnHostCard || !canAskHostCard)
      ) {
        let safetyDecision = applySafetyCheckDialogPolicy(
          checkResult,
          safetyCheckReason,
          permissionContext,
          rmTimeoutConfig,
        );
        return canAskHostCard && safetyDecision.behavior === "deny"
          ? resolveAskWithoutPrompt(
              answers,
              tool,
              input,
              {
                ...checkResult,
                refusal: safetyDecision,
              },
              toolUseID,
              permissionContext,
            )
          : safetyDecision;
      }
    }
    return resolveAskWithoutPrompt(answers, tool, input, checkResult, toolUseID, permissionContext);
  }
  return checkResult;
};
//@ chunk-5xgkngpb.js:3082470-3082568 placement
/**
 * 分类器拦截是否计入拒绝次数：shouldBlock 且不是不可用、转录过长或被安全拦截。
 */
function isCountedClassifierBlock(result) {
  return result.shouldBlock && !result.unavailable && !result.transcriptTooLong && !result.refusedBySafeguard;
}
//@ chunk-5xgkngpb.js:3082568-3082719 placement
/**
 * 分类器结论是否可用：分类器确实运行、非不可用/转录过长/被安全拦截，且没有 failureMode 与 errorKind。
 */
function isClassifierVerdictUsable(result) {
  return (
    result.classifierRan !== false &&
    !result.unavailable &&
    !result.transcriptTooLong &&
    !result.refusedBySafeguard &&
    result.failureMode === undefined &&
    result.errorKind === undefined
  );
}
//@ chunk-5xgkngpb.js:3082719-3083092 placement
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
//@ chunk-5xgkngpb.js:3083092-3083144 placement
function recordAutoModeDenial(toolUseContext) {
  let state = incrementDenialCounts(getDenialTrackingState(toolUseContext));
  persistDenialState(toolUseContext, state);
  return state;
}
//@ chunk-5xgkngpb.js:3083144-3083753 placement
/**
 * auto 拒绝超限处理：未超限返回 false；超限上报 tengu_auto_mode_denial_limit_exceeded；headless 直接抛 AbortError；累计超限时清零计数；返回 true 表示回退人工。
 */
function enforceAutoModeDenialLimits(toolUseContext, state, tool, messageId, toolUseId) {
  if (!shouldFallbackToPrompting(state)) return false;
  let hitTotalLimit = state.totalDenials >= DENIAL_LIMITS.maxTotal;
  let shouldAvoidPermissionPrompts = getToolPermissionContext(toolUseContext).shouldAvoidPermissionPrompts;
  logEvent("tengu_auto_mode_denial_limit_exceeded", {
    limit: lit_2(hitTotalLimit ? "total" : "consecutive"),
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
  if (hitTotalLimit)
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
//@ chunk-5xgkngpb.js:3083753-3083821 placement (2.1.88 match: recordSuccess, 1)
/**
 * 工具调用放行后，若有连续拒绝则在上下文/AppState 中清零。
 */
function recordAutoModeSuccess(context) {
  let state = getDenialTrackingState(context);
  if (state.consecutiveDenials > 0) persistDenialState(context, resetConsecutiveDenials(state));
}
//@ chunk-5xgkngpb.js:3083821-3083905 placement (2.1.88 match: persistDenialState, 0.755)
function getDenialTrackingState(context) {
  return context.localDenialTracking ?? context.getAppState().denialTracking ?? createDenialTrackingState();
}
//@ chunk-5xgkngpb.js:3083905-3084077 fingerprint (2.1.88 match: persistDenialState, 1)
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
//@ chunk-5xgkngpb.js:3084077-3084163 layout
function classifierReasonLabel(classifierResult) {
  return classifierResult.model === SERVER_CLASSIFIER_LABEL && classifierResult.failureMode === undefined
    ? ruleIdFromBracketPrefix(classifierResult.reason)
    : classifierResult.category;
}
//@ chunk-5xgkngpb.js:3084163-3084810 layout
function buildClassifierDenyResult(classifierResult, permissionContext, tool, roleContext, checkResult) {
  let hasNoVerdict = classifierResult.failureMode !== undefined;
  let category = sanitizeRuleCategory(classifierReasonLabel(classifierResult));
  let allowRuleEligible =
    checkResult !== undefined &&
    !carriesAskRuleIntent(checkResult) &&
    checkResult.decisionReason?.type !== "hook" &&
    checkResult.decisionReason?.type !== "sandboxOverride" &&
    findSafetyCheckReason(checkResult.decisionReason) === undefined &&
    checkResult.suppressAlwaysAllowRule !== true &&
    permissionContext.forRemoteExecution !== true &&
    !isHookOrPluginSteered(permissionContext) &&
    !isWebToolClassifierRouted(tool, getToolPermissionContext(permissionContext)) &&
    isClassifiableForAutoAllow(
      tool,
      roleContext,
      isAutoAllowedInMode(tool, getToolPermissionContext(permissionContext)),
    );
  return {
    behavior: "deny",
    decisionReason: {
      type: "classifier",
      classifier: "auto-mode",
      reason: classifierResult.reason,
      ...(hasNoVerdict && {
        noVerdict: hasNoVerdict,
      }),
      ...(category !== undefined && {
        category,
      }),
    },
    message: hasNoVerdict
      ? buildClassifierRefusedOrTransientGuidance(classifierResult.reason, {
          refused: false,
          callerHasReadTools: alwaysFullClassifierRole(permissionContext),
        })
      : buildYoloRejectionMessage(classifierResult.reason, {
          autoModeConsentFlow: isAutoModeConsentFlowEnabled(permissionContext.agentId),
          blockedHelp: autoModeBlockedHelp(permissionContext.agentId),
          ccrSessionLimited: isCcrSessionLimited(),
          allowRuleToolName: allowRuleEligible
            ? toAllowRuleToolName(getToolNameForPermissionCheck_2(tool))
            : undefined,
        }),
  };
}
//@ chunk-5xgkngpb.js:3084810-3084902 layout
function canShowPermissionDialog(permissionContext) {
  return (
    permissionContext.requestDialog !== undefined &&
    !isSdkDialogHostActive() &&
    !getToolPermissionContext(permissionContext).shouldAvoidPermissionPrompts
  );
}
//@ chunk-5xgkngpb.js:3084902-3084941 layout
function canShowSafetyCheckDialog(toolUseContext) {
  return canShowPermissionDialog(toolUseContext) && !isUnattendedAgentContext(toolUseContext);
}
//@ chunk-5xgkngpb.js:3084941-3086104 layout
function decideWithoutClassifier(checkResult, tool, permissionContext, classifierOnly) {
  {
    let why = classifierOnly
      ? "classifier_only"
      : permissionContext.replScriptBuiltCommand === true &&
          getToolPermissionContext(permissionContext).mode === "auto"
        ? "built_as_it_ran"
        : !canShowPermissionDialog(permissionContext)
          ? "no_dialog"
          : isUnansweredWindowExpired()
            ? "not_shown"
            : "asked";
    let detail = permissionContext.replScriptInner === true;
    if (permissionContext.permissionRound !== undefined)
      logEvent("tengu_repl_script_call_without_classifier", {
        ...permissionContext.replScriptCallLabels,
        outcome: fromEnum(why),
        scriptVerdictStands: detail,
        lane: fromEnum(permissionContext.replAsyncAsk === true ? "async" : "classic"),
      });
    let name = (reason) => ({
      behavior: "deny",
      message: codeModeNotRunReasonText(tool.name, reason, detail),
      decisionReason: {
        type: "other",
        reason:
          reason === "unanswered"
            ? "No one answered the permission prompt for this call, so it was refused"
            : reason === "not_shown"
              ? "Refused without asking, because an earlier permission prompt for Claude's code went unanswered"
              : reason === "built_as_it_ran"
                ? "Refused: Claude's code put this command together as it ran, so auto mode's check didn't read it. Claude can send it again written out in full"
                : "Refused: auto mode's check of Claude's code doesn't cover this call",
      },
      decideLocation: "pre-ask",
    });
    if (why !== "asked") return name(why);
    return {
      ...checkResult,
      suggestions: undefined,
      suppressAlwaysAllowRule: true,
      oneTimeAnswersOnly: true,
      ...(hasAccessToIDEExtensionDiffFeature_3(currentMcpClients(permissionContext)) === undefined && {
        autoDenyWindow: buildAutoDenyMarker({
          autoDenyAfterMs: denialDialogAutoDenyMs(),
          resolution: name("unanswered"),
          notASafetyCheck: true,
        }),
      }),
    };
  }
  return checkResult;
}
//@ chunk-5xgkngpb.js:3086104-3086296 placement
/**
 * 从 subcommandResults 中取出原因与给定原因相同的那个子命令 ask 的消息，否则用结果自身消息。
 */
function flaggedPartMessage(result, safetyReason) {
  if (result.decisionReason?.type === "subcommandResults") {
    for (let reason of result.decisionReason.reasons.values())
      if (reason.behavior === "ask" && reason.decisionReason === safetyReason) return reason.message;
  }
  return result.message;
}
//@ chunk-5xgkngpb.js:3086296-3086796 layout
function applySafetyCheckDialogPolicy(result, safetyReason, toolUseContext, dialogPolicy) {
  let deny = (unansweredCount) => ({
    behavior: "deny",
    message: buildDangerousRemovalDenial(flaggedPartMessage(result, safetyReason), unansweredCount),
    decisionReason: safetyReason,
    decideLocation: "pre-ask",
  });
  if (!dialogPolicy.showDialog || !canShowSafetyCheckDialog(toolUseContext)) return deny();
  let unansweredSafetyCheckCount = getUnansweredSafetyCheckCount();
  if (dialogPolicy.maxDialogTimeouts > 0 && unansweredSafetyCheckCount >= dialogPolicy.maxDialogTimeouts) {
    logEvent("tengu_safety_check_dialog_capped", {
      permissionMode: fromEnum(getToolPermissionContext(toolUseContext).mode),
      circuitBreaker: fromEnumOpt(
        safetyReason.type === "safetyCheck" ? safetyReason.circuitBreaker : undefined,
      ),
      unansweredPrompts: unansweredSafetyCheckCount,
      maxDialogTimeouts: dialogPolicy.maxDialogTimeouts,
    });
    return deny(unansweredSafetyCheckCount);
  }
  return {
    ...result,
    autoDenyWindow: buildAutoDenyMarker({
      autoDenyAfterMs: dialogPolicy.timeoutMs,
      resolution: deny(),
    }),
  };
}
//@ chunk-5xgkngpb.js:3086796-3087414 layout
async function waitForServerClassifierRetry(
  toolUseId,
  permissionContext,
  setClassifierApprovals,
  toolUseId_2,
  hold,
) {
  markClassifierChecking(setClassifierApprovals, toolUseId_2);
  let release = hold.hold();
  try {
    return await handleServerVerdictUnavailable(toolUseId, {
      runKey: agentIdOrMain(permissionContext.agentId),
      turnNow: permissionContext.queryTracking?.chainId,
      signal: permissionContext.abortController.signal,
      scheduleTimeout: permissionContext.scheduleTimeout,
      onWait: (status) => {
        if (status === null) {
          permissionContext.onRetryStatus?.(null);
          return;
        }
        logForDebugging(
          `[server-classifier] no usable verdict for ${status.position} response(s) in a row; holding this response's denials ${status.delayMs}ms before the model may retry (${status.position}/${status.limit})`,
          {
            level: "warn",
          },
        );
        permissionContext.onRetryStatus?.({
          kind: "auto_mode_unavailable",
          attempt: status.position,
          maxRetries: status.limit,
          retryInMs: status.delayMs,
          deadline: Date.now() + status.delayMs,
        });
      },
    });
  } finally {
    release();
    clearClassifierChecking(setClassifierApprovals, toolUseId_2);
  }
}
//@ chunk-5xgkngpb.js:3087414-3087831 layout
function stopTurnForMissingVerdict(tool, permissionContext, recorded, reason) {
  if (recorded) {
    let isSubagent = permissionContext.agentId !== undefined;
    logEvent("tengu_auto_mode_unavailable_stop", {
      reason: fromEnum(reason),
      isSubagent,
      gatewayConfigured: gatewayDisplayName() !== undefined,
    });
    logForDebugging(
      `[server-classifier] no usable verdict for ${TIMER_MARGIN_MS} responses in a row; stopping the ${isSubagent ? "agent's run" : "turn"}`,
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
//@ chunk-5xgkngpb.js:3087831-3089456 fingerprint (2.1.88 match: handleDenialLimitExceeded, 0.763)
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
  let canShowFallback = canShowServerFallbackNotice(context.requestDialog !== undefined);
  let hasDialogHost = context.requestDialog !== undefined && !isSdkDialogHostActive();
  let useTimedFallback =
    canShowFallback &&
    !hitTotalLimit &&
    isAutoMode &&
    hasDialogHost &&
    !isUnattendedAgentContext(context) &&
    hasAccessToIDEExtensionDiffFeature_3(currentMcpClients(context)) === undefined &&
    consecutiveDenials >= DENIAL_LIMITS.maxConsecutive &&
    (state.timedFallbackShown !== true || (isStateOn() && context.replAsyncAsk === true));
  let warning = hitTotalLimit
    ? `${totalDenials} actions were blocked this session. Please review the transcript before continuing.`
    : `${consecutiveDenials} consecutive actions were blocked. Please review the transcript before continuing.`;
  logEvent("tengu_auto_mode_denial_limit_exceeded", {
    limit: lit_2(hitTotalLimit ? "total" : "consecutive"),
    fallbackShape: lit_2(
      useTimedFallback ? "timed" : canShowFallback && hasDialogHost ? "blocking" : "legacy",
    ),
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
  if (canShowFallback && !hitTotalLimit && hasDialogHost && isAutoMode)
    updateDenialTrackingState(context, (tracking) => ({
      ...tracking,
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
    ...(canShowFallback &&
      !hitTotalLimit &&
      hasDialogHost && {
        denialLimitFallback: withPermissionDisclosure(
          disclosure,
          useTimedFallback
            ? {
                autoDenyAfterMs: denialDialogAutoDenyMs(),
                resolution: classifierResult,
              }
            : undefined,
        ),
      }),
    decisionReason,
  };
}
//@ chunk-5xgkngpb.js:3089456-3089659 placement
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
//@ chunk-5xgkngpb.js:3089659-3089743 placement
/**
 * 结果是否带 ask 规则意图：原因由 ask 规则驱动，或 matchedAskRule 为 ask。auto 下这类 ask 回退人工而不交分类器。
 */
function carriesAskRuleIntent(result) {
  return isAskRuleDrivenReason(result.decisionReason) || result.matchedAskRule?.ruleBehavior === "ask";
}
//@ chunk-5xgkngpb.js:3089743-3089847 placement
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
//@ chunk-5xgkngpb.js:3089847-3089969 placement
/**
 * 沙箱/只读放行是否改标为 sandboxOverride 交复核：无 ask 规则意图、无安全检查原因、尚非 sandboxOverride，且 tengu_curried_squirrel 打开。
 */
function shouldRetagAskAsSandboxOverride(result) {
  if (
    carriesAskRuleIntent(result) ||
    findSafetyCheckReason(result.decisionReason) !== undefined ||
    result.decisionReason?.type === "sandboxOverride"
  )
    return false;
  return sandboxOverrideAskGuardsOn();
}
//@ chunk-5xgkngpb.js:3089969-3090030 placement
/**
 * 沙箱覆盖 ask 守卫开关（GrowthBook tengu_curried_squirrel，安全默认）。
 */
function sandboxOverrideAskGuardsOn() {
  return readFlagWithOverride("tengu_curried_squirrel", {
    safe: true,
  });
}
//@ chunk-5xgkngpb.js:3090030-3090087 placement
function isPlanModeFloorReason(decisionReason) {
  return decisionReason?.type === "mode" && decisionReason.mode === "plan";
}
//@ chunk-5xgkngpb.js:3090087-3090195 layout
function isBypassAllowableHere(toolPermissionContext, settings, toolPermissionContext_2, suggestedRules) {
  return (
    isBypassAllowedInMode(
      toolPermissionContext,
      suggestedRules,
      toolPermissionContext_2.isBypassPermissionsModeAvailable,
      settings.forRemoteExecution,
    ) && !isWebToolRestrictedInRelay(toolPermissionContext.name)
  );
}
//@ chunk-5xgkngpb.js:3090195-3090348 placement
function usesToolCheckRunner(tool, context) {
  if (tool.mcpInfo) return true;
  if (getCheckRunner(context.session, tool.name) === undefined) return false;
  return !(
    (tool.name === BASH_TOOL_NAME || tool.name === POWERSHELL_TOOL_NAME) &&
    isAutoClassifierActive("plan", getToolPermissionContext(context).servedCall === true)
  );
}
//@ chunk-5xgkngpb.js:3090348-3090452 placement
function isPlanModeWriteCall(tool, parsedInput, context) {
  return (
    getToolPermissionContext(context).mode === "plan" &&
    usesToolCheckRunner(tool, context) &&
    !tool.isReadOnly(parsedInput, context) &&
    !isReadOnlyBrowserCall(getToolNameForPermissionCheck_2(tool), parsedInput) &&
    !needsDocsConnectorFixup(tool, parsedInput, context)
  );
}
//@ chunk-5xgkngpb.js:3090452-3090624 placement
function isPlanModeBlockedWrite(tool, input, context) {
  if (getToolPermissionContext(context).mode !== "plan") return false;
  try {
    let { parsedInput } = parseToolInputForPermission(tool, input, context);
    return (
      !tool.isReadOnly(parsedInput, context) &&
      !isReadOnlyBrowserCall(getToolNameForPermissionCheck_2(tool), parsedInput) &&
      !needsDocsConnectorFixup(tool, parsedInput, context)
    );
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return true;
  }
}
//@ chunk-5xgkngpb.js:3090624-3090756 placement
function buildPlanModeAsk(tool) {
  return {
    behavior: "ask",
    message: `Cannot call ${tool.name} while in plan mode.`,
    decisionReason: {
      type: "mode",
      mode: "plan",
    },
  };
}
//@ chunk-5xgkngpb.js:3090756-3090838 placement
function defaultToNoFields(decision) {
  return decision.behavior === "ask" && decision.defaultToNo === true
    ? {
        defaultToNo: true,
      }
    : {};
}
//@ chunk-5xgkngpb.js:3090838-3091012 placement
function isPersonOnlySafetyAsk(decision) {
  return (
    decision?.behavior === "ask" &&
    decision.personOnly === true &&
    decision.suppressAlwaysAllowRule === true &&
    decision.decisionReason?.type === "safetyCheck" &&
    !decision.decisionReason.classifierApprovable
  );
}
//@ chunk-5xgkngpb.js:3091012-3091140 placement
/**
 * mcpServerPolicy 的 ask 是否落在 plan 写地板之下：解析输入后判断该调用在 plan 下是否属于需要阻挡的写；解析失败时以当前是否 plan 模式为准。
 */
function isServerPolicyAskUnderPlanFloor(decisionReason, tool, input, context) {
  if (!isServerPolicyAskReason(decisionReason)) return false;
  try {
    let { parsedInput } = parseToolInputForPermission(tool, input, context);
    return isPlanModeWriteCall(tool, parsedInput, context);
  } catch {
    return getToolPermissionContext(context).mode === "plan";
  }
}
//@ chunk-5xgkngpb.js:3091140-3091165 placement
var FORCED_INTERACTION_TOOLS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3091140", () => {
  FORCED_INTERACTION_TOOLS = new Set([EXITPLANMODE_2, ASKUSERQUESTION]);
});
//@ chunk-5xgkngpb.js:3091165-3091238 placement
function isExemptFromUserInteraction(tool, hookUpdatedInput) {
  return (
    hookUpdatedInput !== undefined && tool.mcpInfo === undefined && FORCED_INTERACTION_TOOLS.has(tool.name)
  );
}
//@ chunk-5xgkngpb.js:3091238-3091320 placement
/**
 * 是否仍欠一次人工交互：工具属于强制人工类，或 requiresUserInteraction 为真且未被豁免。
 */
function isInteractionStillOwed(tool, hookUpdatedInput) {
  return (
    requiresConnectorGrant_2(tool) ||
    (Boolean(tool.requiresUserInteraction?.()) && !isExemptFromUserInteraction(tool, hookUpdatedInput))
  );
}
//@ chunk-5xgkngpb.js:3091320-3091570 placement
/**
 * 解析工具输入：先严格 parse；失败且仅因未知键、tengu_tidy_eclipse 打开、且未知键无需询问时，去掉这些键重试，并返回 keysSetAside:true。
 */
function parseToolInputForPermission(tool, input, toolUseContext) {
  try {
    return {
      parsedInput: tool.inputSchema.parse(input),
      keysSetAside: false,
    };
  } catch (error) {
    let extraKeyPaths = isUnrecognizedKeysIssue(error?.issues);
    if (
      extraKeyPaths.length === 0 ||
      !getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_eclipse", true) ||
      isSettledPermissionResult(runFailClosedDecision(tool, input, toolUseContext))
    )
      throw error;
    return {
      parsedInput: tool.inputSchema.parse(deleteKeysAtPaths(input, extraKeyPaths)),
      keysSetAside: true,
    };
  }
}
//@ chunk-5xgkngpb.js:3091570-3091651 placement
/**
 * 结果是否“已确定”：有结果且不是 checkIncomplete 的 ask。
 */
function isSettledPermissionResult(result) {
  return result !== undefined && !(result.behavior === "ask" && result.checkIncomplete === true);
}
//@ chunk-5xgkngpb.js:3091651-3092043 placement
/**
 * 工具声明了 permissionCheckFailureDecision 时调用它决定权限检查失败的处理；该函数本身抛错时记日志并直接拒绝。
 */
function runFailClosedDecision(tool, input, toolUseContext) {
  if (tool.permissionCheckFailureDecision === undefined) return;
  try {
    return tool.permissionCheckFailureDecision(input, toolUseContext);
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return {
      behavior: "deny",
      message: `The ${tool.name} permission check failed and its fail-closed posture could not be determined. The call is denied.`,
      decisionReason: {
        type: "other",
        reason: "permission check crashed; tool declares a fail-closed posture",
      },
    };
  }
}
//@ chunk-5xgkngpb.js:3092043-3092676 placement
function describePermissionCheckFault(error, tool, input, toolUseContext) {
  if (error instanceof AbortError_2 || error instanceof APIUserAbortError) throw error;
  if (isAbortError(error) && toolUseContext.abortController.signal.aborted) throw new AbortError_2();
  if (isNoProjectDirectoryError(error))
    return {
      behavior: "deny",
      message: `The ${tool.name} permission check needs a working directory, and this session has none, so the call is denied. A retry is denied the same way.`,
      decisionReason: {
        type: "other",
        reason: NO_PROJECT_DIRECTORY_DENY_REASON,
      },
    };
  if (!isAbortError(error)) logError(error);
  if (mergeClients_3(error))
    return {
      behavior: "deny",
      message: `The ${tool.name} permission check failed because of a fault in Claude Code, so the call is denied. Nothing in this session can fix it, and a retry is denied the same way.`,
      decisionReason: {
        type: "other",
        reason: NO_CONFIG_HOME_DENY_REASON,
      },
    };
  return runFailClosedDecision(tool, input, toolUseContext);
}
//@ chunk-5xgkngpb.js:3092696-3093386 affinity
/**
 * 命中 ask 规则时仍运行工具自己的 checkPermissions：deny 优先，ask 时带上 matchedAskRule；检查崩溃时按 crashIsObjection 决定是否以"检查崩溃"询问。
 */
async function askByRule(tool, input, callOptions, rule, settings) {
  let decisionReason = {
    type: "rule",
    rule,
  };
  let askFromRule = {
    behavior: "ask",
    decisionReason,
    message: createPermissionRequestMessage(tool.name),
  };
  try {
    let { parsedInput } = parseToolInputForPermission(tool, input, callOptions);
    let result = await tool.checkPermissions(parsedInput, callOptions);
    recordCheckedResult(callOptions, parsedInput, result, tool.name);
    if (result?.behavior === "deny") return result;
    if (settings?.inItsPlace?.behavior === "deny") return settings.inItsPlace;
    if (result?.behavior === "ask") {
      let { suggestions, ...resultWithoutSuggestions } = result;
      return {
        ...resultWithoutSuggestions,
        matchedAskRule: rule,
      };
    }
    weakSet_5.add(decisionReason);
  } catch (error) {
    let faultDecision = describePermissionCheckFault(error, tool, input, callOptions);
    if (faultDecision !== undefined && faultDecision.behavior === "deny") return faultDecision;
    if (!isSettledPermissionResult(faultDecision) && settings?.crashIsObjection === true) {
      let crashReason = {
        type: "other",
        reason: PERMISSION_CHECK_CRASHED_REASON,
      };
      return {
        behavior: "ask",
        message: createPermissionRequestMessage(tool.name, crashReason),
        decisionReason: crashReason,
      };
    }
  }
  let inItsPlace = settings?.inItsPlace;
  return inItsPlace?.behavior === "ask" && inItsPlace.decisionReason?.type !== "rule"
    ? {
        ...inItsPlace,
        matchedAskRule: rule,
      }
    : (inItsPlace ?? askFromRule);
}
//@ chunk-5xgkngpb.js:3093386-3093420 placement
var PERMISSION_CHECK_CRASHED_REASON = "permission_check_crashed";
//@ chunk-5xgkngpb.js:3093420-3093822 placement
/**
 * 规则检查前的早期拒绝：会话处于"工具暂停待用户"状态时拒绝（结束工具和钩子代理的 StructuredOutput 除外）；否则查整工具 deny 规则，classifierOnly 工具可绕过。
 */
function getEarlyDenial(tool, input, toolUseContext, fromHook = false) {
  let toolPermissionContext = getToolPermissionContext(toolUseContext);
  if (
    isPersonTypesHold(toolPermissionContext) &&
    !isConversationEndTool(tool) &&
    !(
      tool.name === STRUCTUREDOUTPUT &&
      !("mcpInfo" in tool && tool.mcpInfo) &&
      toolUseContext.agentId?.startsWith(HOOK_AGENT_ID_PREFIX) === true
    )
  )
    return {
      behavior: "deny",
      decisionReason: {
        type: "other",
        reason: TOOLS_HELD_UNTIL_A_PERSON_TYPES,
      },
      message: buildToolsPausedMessage(tool.name),
    };
  let denyRuleForTool = getDenyRuleForTool(toolPermissionContext, tool);
  return denyRuleForTool === null ||
    ("classifierOnly" in tool && isClassifierOnlyToolUnblocked(tool, input, toolUseContext, fromHook))
    ? undefined
    : {
        behavior: "deny",
        decisionReason: {
          type: "rule",
          rule: denyRuleForTool,
        },
        message: `Permission to use ${tool.name} has been denied.`,
      };
}
//@ chunk-5xgkngpb.js:3093822-3093957 layout
function findAskRuleForTool_2(toolPermissionContext, tool, input, toolUseContext) {
  let askRule = findAskRuleForTool(toolPermissionContext, tool);
  return askRule !== null
    ? {
        rule: askRule,
      }
    : isDiskless()
      ? require("../../services/mcp/applyArtifactFileCard.lazy.js").askBackWhereLiftedByName(
          toolPermissionContext,
          tool,
          input,
          toolUseContext,
        )
      : null;
}
//@ chunk-5xgkngpb.js:3093957-3096440 placement (2.1.88 match: PermissionDecisionDebugInfo, 0.157)
/**
 * 只查规则与工具自检的权限检查（给 PreToolUse 钩子 allow/ask 后复核用）：提前裁决、deny 规则、整工具 ask 规则（沙箱自动放行例外）、tool.checkPermissions；hook allow 时施加 plan 写地板；检查崩溃且 crashIsObjection 时返回 ask；只返回 deny/ask，放行时返回 null。
 */
async function checkRuleBasedPermissions(tool, input, toolUseContext, options) {
  let toolPermissionContext = getToolPermissionContext(toolUseContext);
  let fromHook = getHookCaller(toolUseContext) !== undefined;
  let earlyDenial = getEarlyDenial(tool, input, toolUseContext, fromHook);
  if (earlyDenial !== undefined) return earlyDenial;
  let denyRule = matchToolRule(toolPermissionContext, tool, input, "deny");
  if (denyRule && !isClassifierOnlyToolUnblocked(tool, input, toolUseContext, fromHook))
    return {
      behavior: "deny",
      decisionReason: {
        type: "rule",
        rule: denyRule,
      },
      message: formatRuleDeniedMessage(tool.name, denyRule),
    };
  let askMatch = findAskRuleForTool_2(toolPermissionContext, tool, input, toolUseContext);
  let rule = askMatch?.rule;
  if (rule) {
    let sandboxCoversAsk =
      tool.name === BASH_TOOL_NAME &&
      toolUseContext.forRemoteExecution !== true &&
      getCheckRunner(toolUseContext.session, tool.name) === undefined &&
      SandboxManager.isSandboxingEnabled() &&
      SandboxManager.isAutoAllowBashIfSandboxedEnabled() &&
      shouldUseSandbox(input) &&
      !(typeof input.command === "string" && antDisabledListMatchesCommandText(input.command));
    let sandboxAutoAllowOff =
      sandboxCoversAsk &&
      isSandboxAutoAllowOff(
        isStateOn() && toolUseContext.replScriptInner === true
          ? {
              ...toolPermissionContext,
              sandboxAutoAllowSuspended: undefined,
            }
          : toolPermissionContext,
      );
    if (!(sandboxCoversAsk && !sandboxAutoAllowOff))
      return askByRule(tool, input, toolUseContext, rule, {
        ...options,
        inItsPlace: askMatch.inItsPlace,
      });
  }
  let decision = {
    behavior: "passthrough",
    message: createPermissionRequestMessage(tool.name),
  };
  try {
    let { parsedInput } = parseToolInputForPermission(tool, input, toolUseContext);
    decision = await tool.checkPermissions(parsedInput, toolUseContext);
    recordCheckedResult(toolUseContext, parsedInput, decision, tool.name);
    if (
      options?.planModeWriteFloor === true &&
      getRegisteredCheck(toolUseContext.session, tool.name) === undefined &&
      decision.behavior === "passthrough" &&
      isPlanModeWriteCall(tool, parsedInput, toolUseContext)
    )
      return buildPlanModeAsk(tool);
  } catch (error) {
    let faultDecision = describePermissionCheckFault(error, tool, input, toolUseContext);
    if (faultDecision !== undefined && isSettledPermissionResult(faultDecision)) decision = faultDecision;
    else if (options?.crashIsObjection === true && classifierOnlyConfig(tool) === undefined) {
      let crashReason = {
        type: "other",
        reason: PERMISSION_CHECK_CRASHED_REASON,
      };
      return {
        behavior: "ask",
        message: createPermissionRequestMessage(tool.name, crashReason),
        decisionReason: crashReason,
      };
    }
    if (
      options?.planModeWriteFloor === true &&
      getRegisteredCheck(toolUseContext.session, tool.name) === undefined &&
      decision.behavior === "passthrough" &&
      isPlanModeBlockedWrite(tool, input, toolUseContext)
    )
      return buildPlanModeAsk(tool);
  }
  decision = requireAutoModeClassifierReview(tool, input, toolUseContext, decision) ?? decision;
  decision = askClassifierForAllowedDomains(tool, input, toolUseContext, decision) ?? decision;
  decision = buildDesktopActionReviewAsk(tool, input, decision) ?? decision;
  if (decision?.behavior === "deny") return decision;
  let askRule = matchToolRule(toolPermissionContext, tool, input, "ask");
  if (askRule)
    return decision?.behavior === "ask"
      ? {
          ...decision,
          matchedAskRule: askRule,
        }
      : {
          behavior: "ask",
          decisionReason: {
            type: "rule",
            rule: askRule,
          },
          message: createPermissionRequestMessage(tool.name),
        };
  if (
    isInteractionStillOwed(tool, options?.hookUpdatedInput) &&
    !(options?.hookAsked === true && !tool.requiresUserInteraction?.())
  )
    return decision?.behavior === "ask"
      ? decision
      : {
          behavior: "ask",
          message: createPermissionRequestMessage(tool.name),
          decisionReason: {
            type: "other",
            reason: "requiresUserInteraction",
          },
        };
  if (decision?.behavior === "ask" && carriesAskRuleIntent(decision)) return decision;
  if (tool.mcpInfo?.effectiveMaxPermission === "ask") {
    if (isPersonOnlySafetyAsk(decision)) return decision;
    let ceilingReason = {
      type: "other",
      reason: askCeilingReason(tool),
    };
    return {
      behavior: "ask",
      message: createPermissionRequestMessage(tool.name, ceilingReason),
      decisionReason: ceilingReason,
      ...defaultToNoFields(decision),
    };
  }
  let toolPermissionContext_2 = getToolPermissionContext(toolUseContext);
  if (
    decision?.behavior === "ask" &&
    (findSafetyCheckReason(decision.decisionReason) ||
      decision.decisionReason?.type === "sandboxOverride" ||
      (options?.planModeWriteFloor === true &&
        isPlanModeFloorReason(decision.decisionReason) &&
        !isBypassAllowableHere(
          tool,
          toolUseContext,
          toolPermissionContext_2,
          isAutoAllowedInMode(tool, toolPermissionContext_2),
        )))
  )
    return decision;
  if (
    options?.planModeWriteFloor === true &&
    getRegisteredCheck(toolUseContext.session, tool.name) === undefined &&
    !tool.requiresUserInteraction?.() &&
    !isBypassAllowableHere(
      tool,
      toolUseContext,
      toolPermissionContext_2,
      isAutoAllowedInMode(tool, toolPermissionContext_2),
    ) &&
    isPlanModeBlockedWrite(tool, input, toolUseContext)
  )
    return decision?.behavior === "ask"
      ? decision
      : {
          behavior: "ask",
          message: createPermissionRequestMessage(tool.name),
        };
  if (
    tool.mcpInfo !== undefined &&
    liftedAsksInAcceptEdits(toolPermissionContext, tool.checkPermissions).has(
      getToolNameForPermissionCheck_2(tool),
    )
  ) {
    let all = findAskRuleForTool(getToolPermissionContext(toolUseContext), tool);
    if (all) {
      if (decision.behavior === "ask") {
        let { suggestions, ...resultWithoutSuggestions } = decision;
        return {
          ...resultWithoutSuggestions,
          matchedAskRule: all,
        };
      }
      return {
        behavior: "ask",
        decisionReason: {
          type: "rule",
          rule: all,
        },
        message: createPermissionRequestMessage(tool.name),
      };
    }
  }
  return null;
}
//@ chunk-5xgkngpb.js:3096440-3096941 placement
/**
 * 工具宿主（ToolHost）上的规则检查：会话为该工具注册了宿主裁决时调用它；返回 deny，或带 ask 规则意图/安全检查/仅限人工的 ask，否则 null。
 */
async function checkRuleBasedPermissionsOnToolHost(tool, mode, context, assistantMessage, toolUseID) {
  let registeredCheck = getRegisteredCheck(context.session, tool.name);
  if (registeredCheck === undefined) return null;
  let adjudicationContext = {
    ...context,
    toolUseId: toolUseID,
    permissionModeAtRequest: getPermissionModeAtRequestForArbiter(assistantMessage, toolUseID, context),
  };
  let decision = await invokeToolHostAdjudicator(
    registeredCheck,
    tool,
    mode,
    adjudicationContext,
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
  if (decision === CHECK_NO_DECISION) {
    rememberPendingCheck(context.session, toolUseID);
    return null;
  }
  return decision.behavior === "deny" ||
    (decision.behavior === "ask" &&
      (carriesAskRuleIntent(decision) ||
        findSafetyCheckReason(decision.decisionReason) !== undefined ||
        decision.personOnly === true))
    ? decision
    : null;
}
//@ chunk-5xgkngpb.js:3096941-3097087 placement
/**
 * 调用工具宿主的裁决函数，传入服务端分类器是否裁决（serverClassifierDecides）与本地评估回调 evaluateHere。
 */
function invokeToolHostAdjudicator(
  registeredCheck,
  tool,
  input,
  toolUseContext,
  assistantMessage,
  toolUseID,
  evaluateHere,
) {
  return registeredCheck({
    tool,
    input,
    context: toolUseContext,
    toolUseID,
    serverClassifierDecides: isArbiterRole(
      resolveServerClassifierRoleForCall(
        getAutoModeClassifierRole(getToolPermissionContext(toolUseContext).mode),
        assistantMessage,
        toolUseID,
        toolUseContext,
      ),
    ),
    evaluateHere,
  });
}
//@ chunk-5xgkngpb.js:3097087-3097139 placement
function checkDeclarativePermission(tool, input, context, options) {
  return checkToolAndRulePermissions(tool, input, context, undefined, getAutoModeClassifierRole, options);
}
//@ chunk-5xgkngpb.js:3097139-3097429 placement
/**
 * checkDeclarativePermission 的变体：去掉 mcpServerPolicy 来源的 ask 规则后再检查，检查崩溃视为异议。
 */
function checkDeclarativePermissionLessServerPolicyAsks(tool, effectiveInput, toolUseContext) {
  return checkDeclarativePermission(
    tool,
    effectiveInput,
    {
      ...toolUseContext,
      toolUseId: undefined,
      permissionRound: undefined,
      getAppState: () => {
        let appState = toolUseContext.getAppState();
        let { mcpServerPolicy, ...remainingAskRules } = appState.toolPermissionContext.alwaysAskRules;
        return {
          ...appState,
          toolPermissionContext: {
            ...appState.toolPermissionContext,
            alwaysAskRules: remainingAskRules,
          },
        };
      },
    },
    {
      crashIsObjection: true,
    },
  );
}
//@ chunk-5xgkngpb.js:3097429-3097460 placement
var VERDICT_RANK = {
  deny: 0,
  ask: 1,
  allow: 2,
};
//@ chunk-5xgkngpb.js:3097460-3099619 placement
/**
 * 插件 tool.check 裁决层：先运行插件检查（resolveToolCheck）包住 evaluate；deny 或与本地评估一致且无 refusal/hooksMayAllow 时直接返回；否则按一系列闸门（远程 MCP、Cowork Web、auto 下钩子 allow 不能放行的工具、云浏览器、需人工交互、等待人写入、MCP skill ask、plan 写地板）限制插件只能收紧不能放宽。
 */
async function decideWithToolCheckHooks(request, id) {
  let coreDecision;
  let runCore = async () => (coreDecision = await request.evaluate());
  let toolCheck = await resolveToolCheck({
    ...request,
    evaluate: runCore,
  });
  let refusal = toolCheck.behavior === "ask" ? toolCheck.refusal : undefined;
  let settledInCore = toolCheck.behavior === "deny" || toolCheck.behavior === coreDecision?.behavior;
  let hookMayAllow = toolCheck.behavior === "ask" && toolCheck.hooksMayAllow === true;
  if (settledInCore && refusal === undefined && !hookMayAllow) return toolCheck;
  let { tool, context, toolUseID } = request;
  let veto = isClassifierRoutedMcpTool(tool, getToolPermissionContext(context))
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
    veto === undefined &&
    isAutoClassifierActive(isAutoAllowedInMode(tool, getToolPermissionContext(context))) &&
    requiresClassifierForHookAllow(tool)
  )
    veto = {
      gate: lit_2("hookAllowClassified"),
      why: "in auto mode, or plan mode with auto mode on, a plugin can only tighten a call that a hook's allow cannot approve",
    };
  if (veto === undefined && isRemoteBrowserToolUnderModeFloor(tool))
    veto = {
      gate: lit_2("remoteBrowserModeFloor"),
      why: "a plugin can only tighten a call to CCR's cloud browser",
    };
  if (veto === undefined && isInteractionStillOwed(tool, undefined))
    veto = {
      gate: lit_2("requiresUserInteraction"),
      why: "the tool requires the person",
    };
  if (veto === undefined && isPersonTypesHold(getToolPermissionContext(context)))
    veto = {
      gate: lit_2("toolsHeldUntilAPersonTypes"),
      why: "tool calls are held until a person writes",
    };
  let coreRan = coreDecision !== undefined;
  if (veto === undefined && tool.name === SKILL) {
    let decision = coreDecision ?? (await runCore());
    if (decision.behavior === "ask" && decision.metadata?.mcpSkill !== undefined)
      veto = {
        gate: lit_2("mcpSkillAsk"),
        why: "only a person answers the ask before an MCP skill loads",
      };
  }
  if (
    veto === undefined &&
    getToolPermissionContext(context).mode === "plan" &&
    ((coreDecision?.behavior === "ask" && isPlanModeFloorReason(coreDecision.decisionReason)) ||
      isPlanModeBlockedWrite(tool, request.input, context)) &&
    (coreDecision ?? (await runCore())).behavior !== "allow"
  )
    veto = {
      gate: lit_2("planModeWriteFloor"),
      why: "plan mode holds the call",
    };
  if (refusal !== undefined)
    return veto === undefined &&
      context.asksNoHost !== true &&
      isAutoAllowedInMode(tool, getToolPermissionContext(context)) !== "dontAsk"
      ? toolCheck
      : refusal;
  if (veto === undefined) {
    if (toolCheck.behavior === "allow")
      countMcpPolicyRecheckSkipped("toolCheck", tool, request.input, context, undefined, toolUseID);
    return toolCheck;
  }
  if (settledInCore && toolCheck.behavior === "ask")
    return {
      ...toolCheck,
      hooksMayAllow: false,
    };
  let coreVerdict = coreDecision ?? (await runCore());
  if (VERDICT_RANK[toolCheck.behavior] < VERDICT_RANK[coreVerdict.behavior]) return toolCheck;
  if (coreVerdict.behavior === "ask" && toolCheck.behavior === "ask" && toolCheck.personOnly === true)
    return {
      ...personOnlyAsk(coreVerdict),
      hooksMayAllow: false,
    };
  logForDebugging(
    `tool.check ${tool.name} ${toolUseID}: ${veto.why}, so the plugins' ${toolCheck.behavior} is ignored; continuing with the engine's own decision (${coreVerdict.behavior})`,
  );
  logEvent("tengu_auto_mode_tool_check_verdict_held", {
    toolName: sanitizeToolNameForAnalytics(tool.name),
    isMcp: tool.isMcp ?? false,
    gate: veto.gate,
    hookDecision: fromEnum(toolCheck.behavior),
    coreDecision: fromEnum(coreVerdict.behavior),
    coreRan,
    agentMsgId: sanitizeMarkName(id),
    toolUseId: sanitizeMarkName(toolUseID),
  });
  return coreVerdict;
}
//@ chunk-5xgkngpb.js:3099619-3103627 placement
/**
 * 规则与工具自检阶段：已中止则抛错；deny 规则命中即拒绝；整工具 ask 规则返回 ask（Bash 在沙箱自动放行且启用 autoAllowBashIfSandboxed 时例外，mcpServerPolicy 在远程 bypass 下可豁免）；随后调用 tool.checkPermissions、安全修正、字段级 ask 规则、requiresUserInteraction、bypassPermissions 放行、allow 规则，最后把 passthrough 转为 ask。
 */
async function checkToolAndRulePermissions(
  tool,
  input,
  permissionContext,
  toolSuggestions,
  getClassifierRole = getAutoModeClassifierRole,
  hookOptions,
) {
  if (permissionContext.abortController.signal.aborted) throw new AbortError_2();
  let toolPermissionContext = getToolPermissionContext(permissionContext);
  let fromHook = getHookCaller(permissionContext) !== undefined;
  let earlyDenial = getEarlyDenial(tool, input, permissionContext, fromHook);
  if (earlyDenial !== undefined) return earlyDenial;
  let denyRule = matchToolRule(toolPermissionContext, tool, input, "deny");
  if (denyRule && !isClassifierOnlyToolUnblocked(tool, input, permissionContext, fromHook))
    return {
      behavior: "deny",
      decisionReason: {
        type: "rule",
        rule: denyRule,
      },
      message: formatRuleDeniedMessage(tool.name, denyRule),
    };
  let askMatch = findAskRuleForTool_2(toolPermissionContext, tool, input, permissionContext);
  let rule = askMatch?.rule;
  if (rule) {
    let sandboxCouldCover =
      tool.name === BASH_TOOL_NAME &&
      permissionContext.forRemoteExecution !== true &&
      getCheckRunner(permissionContext.session, tool.name) === undefined &&
      SandboxManager.isSandboxingEnabled() &&
      SandboxManager.isAutoAllowBashIfSandboxedEnabled() &&
      shouldUseSandbox(input) &&
      !(typeof input.command === "string" && antDisabledListMatchesCommandText(input.command));
    let sandboxAllowOff =
      sandboxCouldCover &&
      isSandboxAutoAllowOff(
        isStateOn() && permissionContext.replScriptInner === true
          ? {
              ...toolPermissionContext,
              sandboxAutoAllowSuspended: undefined,
            }
          : toolPermissionContext,
      );
    let sandboxCoversAsk = sandboxCouldCover && !sandboxAllowOff;
    let policyBypassExempt =
      rule.source === "mcpServerPolicy" &&
      env.CLAUDE_CODE_REMOTE &&
      isAutoAllowedInMode(tool, toolPermissionContext) === "bypassPermissions" &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_server_policy_bypass_exempt", true);
    if (!sandboxCoversAsk && !policyBypassExempt)
      return askByRule(tool, input, permissionContext, rule, {
        ...hookOptions,
        inItsPlace: askMatch.inItsPlace,
      });
  }
  let result = {
    behavior: "passthrough",
    message: createPermissionRequestMessage(tool.name),
  };
  let checkRan = false;
  try {
    let { parsedInput, keysSetAside } = parseToolInputForPermission(tool, input, permissionContext);
    result = await tool.checkPermissions(parsedInput, permissionContext);
    if (keysSetAside && result.behavior !== "deny")
      result =
        result.behavior === "allow"
          ? {
              behavior: "passthrough",
              message: createPermissionRequestMessage(tool.name),
              checkIncomplete: true,
            }
          : {
              ...result,
              checkIncomplete: true,
            };
    checkRan = true;
    recordCheckedResult(permissionContext, parsedInput, result, tool.name);
    if (isPlanModeWriteCall(tool, parsedInput, permissionContext) && result.behavior === "passthrough")
      result = buildPlanModeAsk(tool);
  } catch (error) {
    let faultDecision = describePermissionCheckFault(error, tool, input, permissionContext);
    if (faultDecision !== undefined && isSettledPermissionResult(faultDecision)) result = faultDecision;
    else if (
      hookOptions?.crashIsObjection === true &&
      !checkRan &&
      classifierOnlyConfig(tool) === undefined
    ) {
      let crashReason = {
        type: "other",
        reason: PERMISSION_CHECK_CRASHED_REASON,
      };
      return {
        behavior: "ask",
        message: createPermissionRequestMessage(tool.name, crashReason),
        decisionReason: crashReason,
      };
    } else if (faultDecision !== undefined && !checkRan) result = faultDecision;
    else if (!checkRan)
      result = {
        behavior: "passthrough",
        message: createPermissionRequestMessage(tool.name),
        checkIncomplete: true,
      };
    if (result.behavior === "passthrough" && isPlanModeBlockedWrite(tool, input, permissionContext))
      result =
        result.checkIncomplete === true
          ? {
              ...buildPlanModeAsk(tool),
              checkIncomplete: true,
            }
          : buildPlanModeAsk(tool);
  }
  result = requireAutoModeClassifierReview(tool, input, permissionContext, result) ?? result;
  result = askClassifierForAllowedDomains(tool, input, permissionContext, result) ?? result;
  result = buildDesktopActionReviewAsk(tool, input, result) ?? result;
  if (result?.behavior === "deny") return result;
  let askRule = matchToolRule(toolPermissionContext, tool, input, "ask");
  if (askRule)
    return result?.behavior === "ask"
      ? {
          ...result,
          matchedAskRule: askRule,
        }
      : {
          behavior: "ask",
          decisionReason: {
            type: "rule",
            rule: askRule,
          },
          message: createPermissionRequestMessage(tool.name),
        };
  if (tool.requiresUserInteraction?.())
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
  let heldShellAllowFrom = serverHeldShellAllowSource(tool, result);
  if (
    result.behavior === "allow" &&
    heldShellAllowFrom !== undefined &&
    toolPermissionContext.servedCall !== true &&
    isArbiterRole(getClassifierRole(toolPermissionContext.mode))
  )
    result = {
      behavior: "ask",
      message: createPermissionRequestMessage(tool.name),
      updatedInput: result.updatedInput,
      decisionReason: {
        type: "other",
        reason: SERVER_HOLDS_SHELL_ALLOW_REASON,
        reroutedFrom: heldShellAllowFrom,
        replaces: result.decisionReason,
      },
    };
  if (result?.behavior === "ask" && carriesAskRuleIntent(result)) return result;
  if (tool.mcpInfo?.effectiveMaxPermission === "ask") {
    if (isPersonOnlySafetyAsk(result)) return result;
    let ceilingReason = {
      type: "other",
      reason: askCeilingReason(tool),
    };
    return {
      behavior: "ask",
      message: createPermissionRequestMessage(tool.name, ceilingReason),
      decisionReason: ceilingReason,
      ...defaultToNoFields(result),
    };
  }
  let context = getToolPermissionContext(permissionContext);
  let effectiveMode = isAutoAllowedInMode(tool, context);
  let isBypassMode = isBypassAllowableHere(tool, permissionContext, context, effectiveMode);
  holdRemovalWaiverOnAskAdjudicator(permissionContext);
  let waiverEligible =
    isBypassMode &&
    result?.behavior === "ask" &&
    effectiveMode === "bypassPermissions" &&
    permissionContext.hookAskFloor !== true &&
    isRemovalWaiverActive(context) &&
    !arePermissionHooksUnsettled() &&
    managedTierHooks("PermissionRequest") === "none";
  let bypassImmuneReason =
    isBypassMode && result?.behavior === "ask"
      ? findSafetyCheckReason(
          result.decisionReason,
          waiverEligible ? isUnwaivableBypassImmuneCircuitBreaker : isBypassImmuneCircuitBreaker,
        )
      : undefined;
  let sandboxOverrideAsk =
    result?.behavior === "ask" &&
    isSandboxOverrideUnderReadBlock(result.decisionReason, toolPermissionContext);
  let unsandboxedAsk =
    isBypassMode &&
    permissionContext.hookAskFloor === true &&
    result?.behavior === "ask" &&
    (result.decisionReason?.type === "sandboxOverride" ||
      ((tool.name === BASH_TOOL_NAME || tool.name === POWERSHELL_TOOL_NAME) &&
        scriptAsksToRunUnsandboxed(tool, input))) &&
    sandboxOverrideAskGuardsOn();
  let standsInUnderHook =
    isBypassMode &&
    permissionContext.hookAskFloor === true &&
    result?.behavior === "ask" &&
    result.standsInUnderHookAsk === true;
  if (
    result?.behavior === "ask" &&
    (bypassImmuneReason ||
      sandboxOverrideAsk ||
      unsandboxedAsk ||
      standsInUnderHook ||
      (!isBypassMode &&
        (findSafetyCheckReason(result.decisionReason) ||
          result.decisionReason?.type === "sandboxOverride" ||
          isPlanModeFloorReason(result.decisionReason))))
  )
    return result;
  if (isBypassMode) {
    if (
      waiverEligible &&
      findSafetyCheckReason(result.decisionReason, isBypassImmuneCircuitBreaker) !== undefined
    )
      logFeatureOk("permission_bypass_removal_prompt_waived");
    return {
      behavior: "allow",
      updatedInput: getUpdatedInputOrFallback(result, input),
      decisionReason: {
        type: "mode",
        mode: effectiveMode,
      },
    };
  }
  let allowRule =
    !checkRan && result.behavior === "passthrough"
      ? null
      : findApplicableAllowRule(tool, input, permissionContext, effectiveMode, getClassifierRole);
  if (allowRule) {
    let browserActionKind =
      getToolPermissionContext(permissionContext).servedCall !== true
        ? getClassifiableBrowserAction(tool, input, effectiveMode)
        : undefined;
    if (browserActionKind !== undefined)
      logEvent("tengu_auto_mode_computer_use_rule_allow", {
        computerUseActionKind: fromEnum(browserActionKind),
        ruleSource: fromEnum(allowRule.source),
      });
    let toolPermissionContext = getToolPermissionContext(permissionContext);
    let classifierOverridableRuleSource = getClassifierOverridableRuleSource(
      allowRule,
      tool,
      input,
      effectiveMode,
      toolPermissionContext,
    );
    if (classifierOverridableRuleSource !== undefined) {
      if (true)
        logEvent("tengu_auto_mode_destructive_mcp_rule_allow", {
          ruleSource: fromEnum(classifierOverridableRuleSource),
          serverClassifierRole: fromEnum(getClassifierRole(toolPermissionContext.mode)),
        });
    }
    return {
      behavior: "allow",
      updatedInput: getUpdatedInputOrFallback(result, input),
      decisionReason: {
        type: "rule",
        rule: allowRule,
      },
    };
  }
  let resolvedResult =
    result.behavior === "passthrough"
      ? {
          ...result,
          behavior: "ask",
          message: createPermissionRequestMessage(tool.name, result.decisionReason),
        }
      : result;
  if (resolvedResult.behavior === "ask" && resolvedResult.suggestions)
    logForDebugging(
      `Permission suggestions for ${tool.name}: ${jsonStringify(resolvedResult.suggestions, null, 2)}`,
    );
  return resolvedResult;
}
//@ chunk-5xgkngpb.js:3103627-3103706 facade-majority (2.1.88 match: getEnabledSettingSources, 0.807)
function isReadOnlyPermissionRuleSource(source) {
  return source === "policySettings" || source === "flagSettings" || source === "command";
}
//@ chunk-5xgkngpb.js:3103706-3104114 placement (2.1.88 match: deletePermissionRule, 0.9)
/**
 * 删除一条规则：policySettings/flagSettings/command 只读；可编辑层同时改文件；cliArg/session 只改内存。
 */
async function deletePermissionRule({ rule, initialContext, setToolPermissionContext, storageV5 }) {
  if (isReadOnlyPermissionRuleSource(rule.source))
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
//@ chunk-5xgkngpb.js:3104114-3104360 fingerprint (2.1.88 match: convertRulesToUpdates, 1)
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
    let [source, behavior] = key.split(":");
    updates.push({
      type: updateType,
      rules: ruleValues,
      behavior,
      destination: source,
    });
  }
  return updates;
}
//@ chunk-5xgkngpb.js:3104360-3104420 placement (2.1.88 match: applyPermissionRulesToPermissionContext, 1)
/**
 * 把规则列表作为 addRules 更新应用到上下文。
 */
function applyPermissionRulesToPermissionContext(context, rules, updates) {
  let updates_2 = convertRulesToUpdates(rules, "addRules");
  return applyPermissionUpdates(context, updates_2, updates);
}
//@ chunk-5xgkngpb.js:3104420-3104907 placement (2.1.88 match: syncPermissionRulesFromDisk, 0.681)
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
  let nextContext = applyPermissionUpdates(context, updates);
  clearRemovalWaiverIfPathScoped(nextContext);
  holdRemovalWaiverOnAskAdjudicator(undefined);
  return nextContext;
}
//@ chunk-5xgkngpb.js:3104907-3105185 placement
/**
 * 设置 CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS 且存在 PermissionRequest 钩子（SDK、托管层或设置中）时，把 removalWaiverRulesClear 置为 false，即危险删除豁免交给钩子裁决。
 */
function holdRemovalWaiverOnAskAdjudicator(toolUseContext) {
  if (
    env.CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS &&
    (hasPermissionPromptTool(getPermissionPromptToolName()) ||
      dispatchClassicEvent("PermissionRequest") ||
      managedTierHooks("PermissionRequest") === "some" ||
      hasSettingsHookForEvent(
        "PermissionRequest",
        toolUseContext?.sessionHooksRegistry,
        toolUseContext === undefined
          ? []
          : registerAgent(toolUseContext, "PermissionRequest", toolUseContext.session.id),
      ))
  )
    getSessionFeatureValues().removalWaiverRulesClear = false;
}
//@ chunk-5xgkngpb.js:3105185-3105255 fingerprint (2.1.88 match: getUpdatedInputOrFallback, 1)
/**
 * 取结果中的 updatedInput，没有则用回退输入。
 */
function getUpdatedInputOrFallback(permissionResult, fallback) {
  return ("updatedInput" in permissionResult ? permissionResult.updatedInput : undefined) ?? fallback;
}
//@ chunk-5xgkngpb.js:3105255-3105454 placement
/**
 * 在决定原因（含 subcommandResults 递归）中找第一个满足谓词的 safetyCheck 原因。
 */
function findSafetyCheckReason(decisionReason, predicate = () => true) {
  if (!decisionReason) return;
  if (decisionReason.type === "safetyCheck") return predicate(decisionReason) ? decisionReason : undefined;
  if (decisionReason.type === "subcommandResults")
    for (let reason of decisionReason.reasons.values()) {
      let safetyCheckReason = findSafetyCheckReason(reason.decisionReason, predicate);
      if (safetyCheckReason) return safetyCheckReason;
    }
  return;
}
//@ chunk-5xgkngpb.js:3105454-3105686 placement
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
//@ chunk-70rvh5wm.js:15479-15759 fingerprint (2.1.88 match: checkRuleBasedPermissions, 0.362)
/**
 * 原因（含子命令递归）是否为非 allow 的规则原因，或读阻挡相关原因；第二参数选择检查哪一类。
 */
function isRuleOrReadBlockReason(decisionReason, kind) {
  if (decisionReason?.type === "subcommandResults")
    return [...decisionReason.reasons.values()].some((reason) =>
      isRuleOrReadBlockReason(reason.decisionReason, kind),
    );
  return kind === "rule"
    ? decisionReason?.type === "rule" && decisionReason.rule.ruleBehavior !== "allow"
    : (decisionReason?.type === "safetyCheck" && decisionReason.circuitBreaker === "outsideReadsBlocked") ||
        (decisionReason?.type === "other" && decisionReason.reason === OUTSIDE_READS_BLOCKED_DENY_REASON);
}
//@ chunk-01b7fqej.js:3920-3984 fingerprint (2.1.88 match: PERMISSION_RULE_SOURCES, 1)
/**
 * 规则来源是否为会话级（cliArg、command、session）。
 */
function isSessionScopedRuleSource(source) {
  return source === "cliArg" || source === "command" || source === "session";
}
//@ chunk-frs14hy1.js:147062-147960 callgraph-witnessed (2.1.88 match: toolMatchesRule, 0.204)
/**
 * 由 disallowedTools 规则串构建过滤器：工具名集合、裸名集合、MCP 服务器级禁用，isToolDisallowed(tool) 综合判断（Bash 被禁时一并禁用 Monitor 等等价工具）。
 */
function buildDisallowedToolsFilter(disallowedTools) {
  let flattened = disallowedTools?.flatMap((entry) =>
    normalizeCaseForComparison_2([entry, toInternalToolName(entry)]),
  );
  let disallowedToolSet = new Set();
  let bareDisallowedToolSet = new Set();
  let disallowedServerNames = new Set();
  let allServersDisallowed = false;
  for (let entry of flattened ?? []) {
    let { toolName, ruleContent } = parseRuleString(entry);
    let nameForRuleMatch = ruleToolNameFromString(entry);
    for (let name of new Set(isEvalToolName(nameForRuleMatch) ? [toolName, nameForRuleMatch] : [toolName])) {
      disallowedToolSet.add(name);
      if (!ruleContent) bareDisallowedToolSet.add(name);
    }
    if (toolName === BASH_TOOL_NAME)
      for (let name of toolsRunningCodeAsBash()) {
        disallowedToolSet.add(name);
        bareDisallowedToolSet.add(name);
      }
    let ruleInfo = mcpInfoFromString(toolName);
    if (ruleInfo !== null && (ruleInfo.toolName === undefined || ruleInfo.toolName === "*"))
      if (ruleInfo.serverName === "*") allServersDisallowed = true;
      else disallowedServerNames.add(ruleInfo.serverName);
  }
  let isServerLevelDisallowed = (toolInfo) => {
    if (!allServersDisallowed && disallowedServerNames.size === 0) return false;
    let serverName = mcpInfoFromString(toolInfo)?.serverName;
    return serverName !== undefined && (allServersDisallowed || disallowedServerNames.has(serverName));
  };
  return {
    disallowedToolSet,
    bareDisallowedToolSet,
    isServerLevelDisallowed,
    isToolDisallowed: (tool) => {
      let toolInfo = getToolNameForPermissionCheck_2(tool);
      let servedViaMcp = builtinToolServedByMcp(tool);
      return (
        toolMatchesAnyName(tool, disallowedToolSet) ||
        disallowedToolSet.has(toolInfo) ||
        (servedViaMcp !== undefined && disallowedToolSet.has(servedViaMcp)) ||
        isServerLevelDisallowed(toolInfo) ||
        (tool.mcpInfo !== undefined &&
          [...disallowedToolSet].some((disallowedName) => mcpRuleMatchesToolAlias(disallowedName, tool))) ||
        getMcpServerRulePrefixes(tool).some(
          (prefix) => disallowedToolSet.has(prefix) || disallowedToolSet.has(`${prefix}__*`),
        ) ||
        (tool.aliasSkillToolNames?.some((aliasSkillToolName) => disallowedToolSet.has(aliasSkillToolName)) ??
          false) ||
        (tool.packagingAliasSkillToolNames?.some((packagingAliasSkillToolName) =>
          disallowedToolSet.has(packagingAliasSkillToolName),
        ) ??
          false) ||
        (ARTIFACT_TOOL_NAME !== null &&
          disallowedToolSet.has(ARTIFACT_TOOL_NAME) &&
          (standsInForBuiltInArtifact?.(tool) ?? false))
      );
    },
  };
}
//@ chunk-1dbza2qv.js:55182-55306 fingerprint (2.1.88 match: getAskRules, 0.545)
/**
 * 按键集合从 alwaysAskRules 中删除 ask 规则。
 */
function removeAskRulesByKey(toolPermissionContext, keys) {
  return keys.size === 0
    ? toolPermissionContext
    : {
        ...toolPermissionContext,
        alwaysAskRules: import_mapValues(toolPermissionContext.alwaysAskRules, (rulesBySource, source) =>
          rulesBySource?.filter((source_2) => !keys.has(dbRowKey(source, parseRuleString(source_2)))),
        ),
      };
}
//@ chunk-xzmy9dn4.js:357199-357708 fingerprint (2.1.88 match: hasPermissionsToUseToolInner, 0.438)
/**
 * 文件编辑权限结论（供编辑类 UI/预检用）：Edit 级 ask 规则或规则原因 → ask；mode 原因在 plan 下为带 plan 地板的 ask；allow 或 bypass/有 allow 规则且非安全检查 → allow；特定情况为 unseen。
 */
function getFileEditPermissionOutcome(tool, input, context) {
  let denyRule = findAskRuleForTool(input, FileEditTool);
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
  let isAutoAllowed =
    tool.behavior === "allow" ||
    (decisionReason?.type !== "safetyCheck" &&
      (input.mode === "bypassPermissions" || toolAlwaysAllowedRule(input, FileEditTool) !== null));
  if (editAskClassifierRoutable(isAutoAllowed ? undefined : decisionReason, input, context))
    return {
      kind: "unseen",
    };
  if (isAutoAllowed)
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
//@ chunk-9m8gfd36.js:191-476 placement
/**
 * 有命中的 ask 规则时把决策改为 ask（已是 ask 则补 matchedAskRule），保留改写过的输入；deny 不变。
 */
async function applyAskRuleOverride(decision, askRule, getAskMessage) {
  if (askRule === null || decision.behavior === "deny") return decision;
  return decision.behavior === "ask"
    ? {
        ...decision,
        matchedAskRule: decision.matchedAskRule ?? askRule,
      }
    : {
        behavior: "ask",
        message: await getAskMessage(),
        decisionReason: {
          type: "rule",
          rule: askRule,
        },
        ...("updatedInput" in decision &&
          decision.updatedInput !== undefined && {
            updatedInput: decision.updatedInput,
          }),
      };
}
//@ chunk-7p76mrq7.js:338-588 placement
/**
 * 判定一条权限判定是否由 suppressesAlwaysAllowRule 抑制（开关 tengu_valiant_crayon 关闭时不抑制）。
 */
function shouldSuppressAlwaysAllow(tool, input, toolUseContext, suppressAlwaysAllowRule, suggestions) {
  return (
    suppressAlwaysAllowRule ||
    isHookOrPluginSteered(toolUseContext) ||
    (tool.suppressesAlwaysAllowRule?.(
      input,
      !getFeatureValue_CACHED_MAY_BE_STALE("tengu_valiant_crayon", false),
    ) === true &&
      !(suggestions ?? []).some(
        (suggestion) =>
          (suggestion.type === "addRules" || suggestion.type === "replaceRules") &&
          suggestion.behavior === "allow" &&
          suggestion.rules.some((rule) => rule.ruleContent !== undefined),
      )) ||
    undefined
  );
}
//@ chunk-7p76mrq7.js:588-751 placement
/**
 * 决策不能被绕过模式放行：含绕过免疫的安全检查或已签发重入、工具要求用户交互、调用方强制或仅限本人。
 */
function isBypassImmuneDecision(decision, tool, toolUseContext) {
  if (
    findSafetyCheckReason(decision.decisionReason, isBypassImmuneCircuitBreaker) !== undefined ||
    hasMintedReentry(toolUseContext)
  )
    return true;
  if (tool.requiresUserInteraction?.()) return true;
  return decision.forcedByCaller === true || decision.personOnly === true;
}
//@ chunk-czq1j3j2.js:64417-64483 placement (2.1.88 match: createGetAppStateWithAllowedTools, 1)
/**
 * 取权限上下文里的 alwaysAllowRules。
 */
function getAlwaysAllowRules(appState) {
  return appState.toolPermissionContext.alwaysAllowRules;
}
//@ chunk-bhrstd6k.js:8883-8975 fingerprint (2.1.88 match: getRuleByContentsForToolName, 1)
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
export {
  syncPermissionRulesFromDisk,
  isSessionScopedRuleSource,
  getDenyRuleIndex,
  deniedBashRules,
  buildDenyRuleIndex,
  isConversationEndTool,
  isToolDeniedByIndex,
  getDenyRuleForTool,
  askedBashRules,
  isWildcardOnlyContent,
  getPermissionModeCycle,
  hasPermissionsToUseTool,
  consultPermissionRequestHooksForUnpromptableAsk,
  findAskRuleForTool,
  toolAlwaysAllowedRule,
  answerUpdatesForMcpSkillAsk,
  withoutGrantsForRemoteScope,
  stripWholeToolGrantsForAsk,
  matchToolRule,
  permissionGrantScope,
  isBypassImmuneDecision,
  isServerPolicyAskReason,
  isServerPolicyAskUnderPlanFloor,
  checkDeclarativePermissionLessServerPolicyAsks,
  hasPermissionsToUseToolWithSink,
  findSafetyCheckReason,
  askCeilingReason,
  shouldSuppressAlwaysAllow,
  shouldReplaceMemoryInput,
  guardHookUpdatedInput,
  checkRuleBasedPermissions,
  isInteractionStillOwed,
  createPermissionRequestMessage,
  findDenyRuleWithContent,
  findAskRuleWithContent,
  evaluateAskingNoHost,
  toolMatchesRule,
  removeAskRulesByKey,
  toToolUseIdSet,
  getContentRulesForToolName,
  NARROWING_RULE_SOURCES,
  hasBashPermission,
  applyPermissionRulesToPermissionContext,
  getAllowRules,
  isAutoModeConsentFlowEnabled,
  getDispatchableAgents,
  mergePersistedDenyRules,
  hasPersonOnlyAskFloor,
  isChainOnAllowActive,
  hasLeftProactivityBaseline,
  resetDenialStreakAfterUserApproval,
  markOutsideReadPromptSeen,
  persistBlockReadsOutsideWorkspace,
  withDenialDeadline,
  stripAutoDenyFields,
  makeClassifierApprovalsSetter,
  getContentRulesMapForToolName,
  applyAskRuleOverride,
  TOOLS_HELD_UNTIL_A_PERSON_TYPES,
  checkDeclarativePermission,
  parseWildcardAgentTypes,
  buildDisallowedToolsFilter,
  sanitizeRuleCategoryOrUndefined,
  sanitizeRuleCategory,
  toolMatchesWholeToolRule,
  carriesAskRuleIntent,
  sandboxOverrideAskGuardsOn,
  getContentRulesMapForTool,
  scriptAsksToRunUnsandboxed,
  shouldRetagAskAsSandboxOverride,
  context,
  getDenyRuleForAgent,
  toAllowRuleToolName,
  syncCompactEligibility,
  markCompactRequestSpent,
  canPromptUserForPermission,
  resetClassifierApprovals,
  handedOffIds,
  withoutNewRulesOfMcpSkillLoadForm,
  withClassifiedWebCalls,
  consumeRepeatedToolCall,
  arePermissionHooksUnsettled,
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
  isAgentToolPoolDenied,
  agentToolPoolDeniedMessage,
  isAllowRuleIgnoredInAutoMode,
  PERMISSION_CHECK_CRASHED_REASON,
  isFileMutationTool,
  shouldClassifyEdits,
  isConversationEndToolDenied,
  isCoworkAllowedWriteMcpIncluded,
  hasMcpServerPolicyAllow,
  getMcpRuleClassifierRoute,
  classifierApprovalFor,
  deleteClassifierApproval,
  isRuleOrReadBlockReason,
  isPersonTypesHold,
  flaggedPartMessage,
  isProactivityModeChange,
  isPlanModeFloorReason,
  createChromeDomainAllowRule,
  hasAutoModeClassifierDenyRules,
  getAlwaysAllowRules,
  PERMISSION_RULE_SOURCES,
  denialDialogAutoDenyMs,
  isAskRuleDrivenReason,
  setClassifierApproval,
  clearClassifierChecking,
  serverHeldShellAllowSource,
  buildToolsPausedMessage,
  permissionRuleSourceDisplayString,
  isReadOnlyPermissionRuleSource,
  deletePermissionRule,
  holdRemovalWaiverOnAskAdjudicator,
  takeClassifierBlock,
  filterDispatchableAgents,
  getFileEditPermissionOutcome,
  classifyEditsEnabled,
  isWebToolClassifierRouted_2,
  allowsAliasExpansion,
  isBuzzingPelicanRouted,
  isPatternRuleName,
  ruleMatcherForRules,
  isDeepDuskDeviceTool,
  isWebFetchOrSearch,
  formatRuleDeniedMessage,
  parseFieldRuleContent,
  isAskOnMutationTool,
  isCountedClassifierBlock,
  recordAutoModeSuccess,
  enforceAutoModeDenialLimits,
  recordAutoModeDenial,
  autoModeBlockedHelp,
};
