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
  eSr,
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
import { zue, zjt } from "./permissionPromptHost.js";
import {
  isSameAnswerInput,
  d0e,
  denyChangedAnswerInput,
  applyAnswerPermissionUpdates,
  denyLostTightening,
  applyPermissionAnswerChanges,
} from "./permissionAnswer.js";
import { isLiveMemoryTool } from "../../services/mcp/memoryServerVerification.js";
import { fromEntries } from "./gitCommandRules.js";
import { formatPermissionRule, Ngs } from "./disallowedToolsFlag.js";
import { DEVICE_BASH_TOOL, DEVICE_COMMIT_FILES_TOOL } from "../../services/mcp/firstPartyServerIds.js";
import {
  isAutoAllowedInMode,
  getMcpPermissionModeOverride,
  isSandboxAutoAllowOff,
} from "./browserToolNames.js";
import {
  getToolNameForPermissionCheck as getToolNameForPermissionCheck_4,
  isRemoteBrowserReadWithoutClassifier,
  buildMcpToolName,
  MCP_TOOL_PREFIX,
  getToolNameForPermissionCheck as getToolNameForPermissionCheck_2,
  mcpInfoFromString,
  getMcpToolAliasNames,
  getToolNameForPermissionCheck as getToolNameForPermissionCheck_3,
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
  K2e,
  isClassifierTargetToolUse,
  getPermissionModeAtRequestForArbiter,
  yse,
  sse,
  Qqt,
  isServerClassifierActive,
  awaitServerVerdict,
  shouldFallBackToLocal,
  qb,
  eze,
  classifyServerVerdict,
  aKt,
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
import { getDangerousRmTimeoutConfig, bqt } from "../../tools/BashTool/bashPermissionFlags.js";
import { zIn, Tio, AUTO_MODE_RULE_IDS, Qfs, nct, Hxi, Xfs, Aio } from "./autoModeRulesPrompt.js";
import {
  fromSanitizer_SANITIZER_OUTPUT_ONLY,
  fromEnum,
  lit as lit_2,
  fromEnumOpt,
} from "../../services/analytics/safeMetadata.js";
import { getPluginRegistry } from "../plugins/pluginLoadState.js";
import { isHookRegistrationPending, hasNonBuiltinPluginSurface } from "../plugins/loadPluginHooks.js";
import { oae, executePermissionRequestHooks, managedTierHooks, hasSettingsHookForEvent } from "../hooks.js";
import { logError } from "../log.js";
import {
  toError,
  errorMessage,
  isAbortError,
  AbortError as AbortError_2,
  sanitizeErrorName as sanitizeErrorName_2,
} from "../errors.js";
import { SessionRootSlot, cke } from "../../bootstrap/sessionSlices.js";
import { ge } from "../identity.js";
import { Xq } from "../../services/api/requestFingerprint.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { isBgSession, isUnattendedInteractiveSession } from "../concurrentSessions.js";
import { Yqe } from "../swarm/permissionSync.js";
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
  PPe,
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
  c_e,
  raceChoiceWithAbort,
  hasOpusAccess,
  Xjr,
  resolveServerFallbackChoice,
  getGatewayNoticeInfo,
  showServerFallbackNotice,
  qjr,
  S2e,
  isChromeClassifierFloorTool,
  isMcpReviewedOutsideAuto,
  enqueuePermissionCheckStatus,
  startClassifierKeepalive,
  ntt,
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
  XCe,
  classifyDestructiveTargetScope,
  classifyGitDestructiveTarget,
} from "../../tools/BashTool/destructiveTargets.js";
import { WSt } from "../../tools/PowerShellTool/destructiveCommandWarning.js";
import { gl } from "../cwd.js";
import {
  isReadOnlyBrowserCall,
  m6t,
  t2e,
  isBrowserToolAutoAllowed,
  Zqe,
  classifyBrowserAction,
  hasBrowserWriteAction,
  Qye,
  getToolNameForPermissionCheck,
  getClassifiableBrowserAction,
  buildDesktopActionReviewAsk,
} from "./browserComputerUseTools.js";
import { B1e, pUt } from "./mcpRuleMatching.js";
import {
  p1r,
  getProjectsRoleTelemetry,
  measureActionSummaries,
  countBatchActionSummaries,
  getActionSummaryLength,
} from "./actionSummary.js";
import { Qbe } from "../../services/projects/threadRows.js";
import { cyt, resolveToolCheck, personOnlyAsk } from "../../plugins/functionHooks/toolCheckHooks.js";
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
import { Vli, USERSETTINGS } from "./classifierApprovalRules.js";
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
import { requiresConnectorGrant } from "../../services/mcp/claudeai.js";
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
import { VJe, recordPipelineResult, gkn, recordCheckedResult } from "./permissionRecord.js";
import {
  SERVER_CONTEXT_STALE,
  hasHeldServerVerdict,
  isServerClassifierUnsupported,
  isServerUnavailableReason,
  handleServerVerdictUnavailable,
  eye,
  Gqt,
  buildTurnEndedUnavailableMessage,
} from "./serverClassifier/results.js";
import { settingsProblemDenial } from "../settings/settingsProblems.js";
import { denyReservedArtifactKeys } from "../../tools/ArtifactTool/reservedKeys.js";
import { isChromeToolName, E5t } from "../claudeInChrome/chromeToolNames.js";
import { sanitizeToolNameForAnalytics, builtinToolServedByMcp } from "../../services/analytics/metadata.js";
import { ye } from "../startupMarks.js";
import { mcpToolLogFields } from "../../hooks/toolPermission/permissionLogging.js";
import {
  D4t,
  shouldClassifyAskUserQuestion,
  jjr,
  describeAutoModeUnavailableCause,
  buildAutoDenyMarker,
} from "./autoModeUnavailable.js";
import {
  rememberCommandNetworkLists,
  areCommandNetworkListsOffered,
} from "../../tools/BashTool/sandboxNetwork.js";
import { BH } from "./autoModeDecisionLog.js";
import { isEvalBuild } from "../envUtils.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import {
  logStrictTierUnavailable,
  qSn,
  prependInheritedVerifiedTurns,
  formatActionForClassifier,
  classifyYoloAction,
  collectToolUseIdSet,
} from "./yoloClassifier.js";
import {
  isLocalClassifierSwitchedOff,
  getServerClassifierFallbackMode,
  getUserServerClassifierSwitch,
  jz,
  getApiRouteKind,
  isBetasSwitchSetAside,
  Pqt,
  Zhe,
  wR,
} from "./serverClassifier/flags.js";
import { isLinkedWorktreeFastPathEnabled, verifiedLinkedWorktreeDirectories } from "./filesystem.js";
import { Lf } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { REMOTE_BROWSER_SERVER_NAME } from "../../services/mcp/remoteBrowserServer.js";
import { vfi } from "../../commands/mobile/mobile.js";
import { isWebToolRestrictedInRelay, M, Dar } from "./permissionRulePayload.js";
import { isRemoteBrowserToolUnderModeFloor } from "./remoteBrowser.js";
import { CommitTurnSlot, o3n } from "./serverClassifier/context.js";
import { pinSessionId } from "../sessionStorage.js";
import {
  currentMcpClients,
  hasAccessToIDEExtensionDiffFeature as hasAccessToIDEExtensionDiffFeature_3,
} from "../../services/compact/idleToolResultClearing.js";
import { Xno } from "../messageKinds.js";
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
import { Ao } from "../../bootstrap/sessionFeatureValues.js";
import { HEARTH_WRITE_TOOL_NAMES, HEARTHBOT } from "../../services/mcp/ccrMetaMcp.js";
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
import { DEVICE_2, $r, machineNameMatches } from "../../bridge/deviceRegistration.js";
import { normalizeNameForMCP, yhe, CLAUDE_AI } from "../../services/mcp/normalization.js";
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
import { _O } from "../../tools/REPLTool/constants.js";
import { toolsRunningCodeAsBash } from "./filterToolsByDenyRules.js";
import { toolMatchesAnyName } from "../../services/tools/permissionCheckGuard.js";
import { ARTIFACT_TOOL_NAME, standsInForBuiltInArtifact } from "../../tools/AgentTool/agentToolUtils.js";
import { dbRowKey } from "../../tools/ArtifactTool/permissions/dbWriteInputs.js";
import { CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL } from "../claudeInChrome/common.js";
import { isOfficialMarketplaceRef, hasSimilarMarketplaceName } from "../plugins/marketplaceNames.js";
import { hasMintedReentry } from "../../tools/SendMessageTool/isolationDispatchGate.js";

//@ chunk-e6aww6q8.js:49322-49345 placement
function isChainOnAllowActive() {
  return !1;
}
/**
 * tools 列表含 "*" 时，从 Agent(type1,type2) 形式的条目收集 allowedAgentTypes；未定义返回 {}，不含 "*" 或出现非 Agent 条目返回 null。
 */
//@ chunk-e6aww6q8.js:996568-996843 placement
function parseWildcardAgentTypes(e) {
  if (e === void 0) return {};
  if (!e.includes("*")) return null;
  let n;
  for (let r of e) {
    if (r === "*") continue;
    let { toolName: toolName, ruleContent: ruleContent } = permissionRuleValueFromString(r);
    if (toolName !== AGENT || !ruleContent) return null;
    ((n ??= []),
      n.push(
        ...ruleContent
          .split(",")
          .map((y) => y.trim())
          .filter(Boolean),
      ));
  }
  return n ? { allowedAgentTypes: n } : {};
}
//@ chunk-e6aww6q8.js:996843-996928 placement
function ebe() {
  if (getAllowedChannels().length > 0 && getIsNonInteractiveSession()) return !1;
  if (getIsNonInteractiveSession() && !zue(getPermissionPromptToolName())) return !1;
  return !0;
}
//@ chunk-e6aww6q8.js:996928-997021 placement
function obe(e, n, r, s = !1) {
  return Q0(e) && r !== void 0 && !(s && Object.keys(r).length === 0) && !isSameAnswerInput(r, n);
}
//@ chunk-e6aww6q8.js:997021-997050 placement
function Q0(e) {
  return isLiveMemoryTool(e);
}
//@ chunk-e6aww6q8.js:1270876-1270900 placement
function gNo() {
  return {};
}
/**
 * 按决策原因里的规则（子命令结果递归）查注释表，命中返回带前导空格的说明后缀，否则空串。
 */
//@ chunk-e6aww6q8.js:1270900-1271167 placement
function getRuleAnnotationSuffix(e, n = gNo(), r = fromEntries) {
  if (e?.type === "rule") {
    let { rule: rule } = e,
      h = formatPermissionRule(rule.ruleValue),
      y = n[h] ?? (rule.source === "command" ? r[h] : void 0);
    return y ? ` ${y}` : "";
  }
  if (e?.type === "subcommandResults")
    for (let s of e.reasons.values()) {
      let h = getRuleAnnotationSuffix(s.decisionReason, n, r);
      if (h) return h;
    }
  return "";
}
//@ chunk-e6aww6q8.js:1271167-1271286 placement
function appendRuleAnnotation(e) {
  let n = getRuleAnnotationSuffix(e.decisionReason);
  if (n === "" || e.message.endsWith(n)) return e;
  return { ...e, message: e.message + n };
}
//@ chunk-e6aww6q8.js:1285727-1285804 placement
var TENGU_BUZZING_PELICAN = "tengu_buzzing_pelican",
  r$o = new Set([DEVICE_BASH_TOOL, DEVICE_COMMIT_FILES_TOOL]),
  TENGU_DEEP_DUSK = "tengu_deep_dusk";
//@ chunk-e6aww6q8.js:1285804-1285898 placement
function XH(e, n) {
  if (e.mcpInfo === void 0) return !1;
  let r = isAutoAllowedInMode(e, n);
  return P9n(getToolNameForPermissionCheck_4(e), r, n) || mBo(r, n);
}
//@ chunk-e6aww6q8.js:1285898-1285965 placement
function P9n(e, n, r) {
  return r$o.has(e) && g6t(n, r) && readFlagWithOverride(TENGU_DEEP_DUSK, { safe: !0 });
}
//@ chunk-e6aww6q8.js:1285965-1286010 placement
function mBo(e, n) {
  return g6t(e, n) && getFeatureValue_CACHED_MAY_BE_STALE(TENGU_BUZZING_PELICAN, !1);
}
//@ chunk-e6aww6q8.js:1286010-1286105 placement
function g6t(e, n) {
  return (
    env.CLAUDE_CODE_REMOTE &&
    isAutoClassifierActive(e, n.servedCall === !0) &&
    getAutoModeClassifierRole(n.mode) === "arbiter"
  );
}
//@ chunk-e6aww6q8.js:1286105-1286163 placement
var TENGU_JAUNTY_UMBRELLA = "tengu_jaunty_umbrella",
  TENGU_TOASTY_FIDDLE = "tengu_toasty_fiddle";
//@ chunk-e6aww6q8.js:1286163-1286201 placement
function I9n(e) {
  return e === WEBFETCH || e === WEBSEARCH;
}
//@ chunk-e6aww6q8.js:1286201-1286280 placement
function RL(e, n) {
  return (
    e.mcpInfo === void 0 && I9n(e.name) && isWebToolClassifierRouted(e.name, isAutoAllowedInMode(e, n), n)
  );
}
/**
 * 判断 WebFetch/WebSearch 是否交给 auto 分类器处理：调用方已声明、Cowork 且分类器启用时按分类器角色（arbiter 读 tengu_jaunty_umbrella，off/shadow 读 tengu_toasty_fiddle 列表）决定。
 */
//@ chunk-e6aww6q8.js:1286280-1286566 placement
function isWebToolClassifierRouted(e, n, r) {
  if (r.callerClassifiesWebCalls?.includes(e)) return !0;
  if (!isCoworkAny() || !isAutoClassifierActive(n, r.servedCall === !0)) return !1;
  switch (getAutoModeClassifierRole(r.mode)) {
    case "arbiter":
      return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_JAUNTY_UMBRELLA, !1);
    case "off":
    case "shadow": {
      let s = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_TOASTY_FIDDLE, []);
      return Array.isArray(s) && s.includes(e);
    }
    case "arbiterWithLocalFallback":
      return !1;
  }
}
/**
 * 复制权限上下文并切换模式，同时记录由分类器裁决的 Web 工具（callerClassifiesWebCalls）。
 */
//@ chunk-e6aww6q8.js:1286566-1286691 placement
function withClassifiedWebCalls(e, n) {
  let filtered = [WEBFETCH, WEBSEARCH].filter((s) => isWebToolClassifierRouted(s, e.mode, e));
  return { ...e, mode: n, ...(filtered.length > 0 && { callerClassifiesWebCalls: filtered }) };
}
//@ chunk-e6aww6q8.js:1286691-1286737 placement
function e_e(e, n) {
  return e.name === WEBSEARCH && RL(e, n);
}
//@ chunk-e6aww6q8.js:1286737-1286768 placement
var TENGU_DAPPER_TRUFFLE = "tengu_dapper_truffle";
//@ chunk-e6aww6q8.js:1286768-1286891 placement
function shouldClassifyDestructiveMcpWrite(e, n, r, s) {
  return (
    isAutoClassifierActive(r, s) &&
    (e.isDestructive?.(n) ?? !1) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_cowork_auto_mode_include_allowed_write_mcp", !1)
  );
}
//@ chunk-e6aww6q8.js:1286891-1286991 placement
function shouldClassifyRemoteMcpWrite(e, n, r, s) {
  return (
    e.mcpInfo !== void 0 &&
    env.CLAUDE_CODE_REMOTE &&
    shouldClassifyDestructiveMcpWrite(e, n, r, s.servedCall === !0)
  );
}
//@ chunk-e6aww6q8.js:1286991-1287072 placement
function t_e(e, n) {
  return getAllowRules(n).some((r) => r.source === "mcpServerPolicy" && toolMatchesWholeToolRule(e, r));
}
//@ chunk-e6aww6q8.js:1287072-1287202 placement
function getClassifierOverridableRuleSource(e, n, r, s, h) {
  let { source: source } = e;
  return (source === "cliArg" || source === "command" || source === "session" || source === "mcpMount") &&
    o2e(n, r, s, h)
    ? source
    : void 0;
}
//@ chunk-e6aww6q8.js:1287202-1287254 placement
function o2e(e, n, r, s) {
  return shouldClassifyRemoteMcpWrite(e, n, r, s) && t_e(e, s);
}
//@ chunk-e6aww6q8.js:1287254-1287419 placement
function isShadowedServerPolicyRule(e, n, r, s, h, y) {
  return (
    (e.source === "cliArg" || e.source === "session" || e.source === "mcpMount") &&
    shouldClassifyRemoteMcpWrite(n, r, s, h) &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_DAPPER_TRUFFLE, "off") === "server" &&
    y() === "arbiter" &&
    t_e(n, h)
  );
}
/**
 * 判断一条规则命中的 MCP 调用该走哪条分类器路径：serverPolicy、remoteSession 或 shadowedServerPolicy；不适用返回 undefined。
 */
//@ chunk-e6aww6q8.js:1287419-1287660 placement
function getMcpRuleClassifierRoute(e, n, r, s, h, y) {
  if (e === null) return;
  if (e.source === "mcpServerPolicy" && shouldClassifyDestructiveMcpWrite(n, r, s, !1)) return "serverPolicy";
  if (n.mcpInfo === void 0) return;
  let S = getToolPermissionContext(h);
  if (XH(n, S)) return "remoteSession";
  return isShadowedServerPolicyRule(e, n, r, s, S, y) ? "shadowedServerPolicy" : void 0;
}
//@ chunk-e6aww6q8.js:1287660-1287703 placement
function _M(e) {
  return e.classifierOnly?.();
}
//@ chunk-e6aww6q8.js:1287703-1287781 placement
var r0o = new Set(["userSettings", "projectSettings", "localSettings", "session"]);
//@ chunk-e6aww6q8.js:1287781-1287974 placement
function isClassifierOnlyToolUnblocked(e, n, r) {
  let s = getToolPermissionContext(r);
  if (_M(e)?.onBlock !== "flag" || !isAutoModePermissionSurface(s)) return !1;
  let h = { ...s, alwaysDenyRules: wi(s.alwaysDenyRules, (y, S) => r0o.has(S)) };
  return getDenyRuleForTool(h, e) === null && matchToolRule(h, e, n, "deny") === null;
}
//@ chunk-e6aww6q8.js:1287974-1288141 placement
function buildClassifierOnlyDenial(e, n) {
  return {
    behavior: "deny",
    message: `Only the auto-mode classifier can allow ${e.name}: ${n}`,
    decisionReason: { type: "other", reason: `classifierOnly: ${n}` },
  };
}
//@ chunk-e6aww6q8.js:1288141-1288404 placement
function isUnclassifiableAskReason(e) {
  switch (e?.type) {
    case "safetyCheck":
      return (
        !e.classifierApprovable &&
        (!isClassifierRoutedCircuitBreaker(e) ||
          (isAutoModeDenyCircuitBreaker(e) && getDangerousRmTimeoutConfig().enabled))
      );
    case "rule":
      return e.rule.ruleBehavior === "ask";
    case "subcommandResults":
      return [...e.reasons.values()].some((n) => isUnclassifiableAskReason(n.decisionReason));
    default:
      return !1;
  }
}
//@ chunk-e6aww6q8.js:1288404-1289119 placement
function requireAutoModeClassifierReview(e, n, r, s) {
  if (_M(e) === void 0 || s?.behavior === "deny") return;
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
    message: s !== void 0 && "message" in s ? s.message : `${e.name} requires auto-mode classifier review.`,
    updatedInput: s !== void 0 && "updatedInput" in s ? (s.updatedInput ?? n) : n,
    suppressAlwaysAllowRule: !0,
    decisionReason: {
      type: "safetyCheck",
      reason: `Every ${e.name} call is reviewed by the auto-mode classifier; saved allow rules and hook allows do not apply.`,
      classifierApprovable: !0,
    },
  };
}
//@ chunk-e6aww6q8.js:1289119-1289307 placement
function describeNonClassifierAllow(e) {
  let n = e.decisionReason?.type;
  return n === void 0
    ? "an allow with no recorded source is not the classifier's verdict"
    : `an allow of type '${n}' is not the classifier's verdict`;
}
//@ chunk-e6aww6q8.js:1289307-1289390 placement
function i2e(e) {
  return e.behavior === "allow" && e.decisionReason?.type === "classifier";
}
//@ chunk-e6aww6q8.js:1289390-1289639 placement
function enforceClassifierOnlyDecision(e, n) {
  if (_M(e) === void 0 || n.behavior === "deny" || i2e(n)) return n;
  return buildClassifierOnlyDenial(
    e,
    n.behavior === "ask"
      ? `no prompt is raised for it, and the classifier did not allow it${n.decisionReason?.type === "other" ? ` (${n.decisionReason.reason})` : ""}`
      : describeNonClassifierAllow(n),
  );
}
//@ chunk-e6aww6q8.js:1289639-1289655 placement
var r2e = new Map();
//@ chunk-e6aww6q8.js:1289655-1289686 placement
function s_e(e, n) {
  r2e.set(e, n);
}
//@ chunk-e6aww6q8.js:1289686-1289763 placement
function O9n(e) {
  if (e === void 0) return;
  let n = r2e.get(e);
  return (r2e.delete(e), n);
}
/**
 * 把分类器结果映射为阻断类型：安全护栏拒绝或分类器被关闭为 refused；不可用、转录过长、无法解析、出错为 unavailable（带模型、HTTP 状态、错误类型）。
 */
//@ chunk-e6aww6q8.js:1289763-1290149 placement
function getClassifierBlockOutcome(e) {
  if (!e.shouldBlock) return;
  if (e.refusedBySafeguard) return { kind: "refused" };
  if (e.errorKind === CLASSIFIER_SWITCHED_OFF_KIND) return { kind: "refused", switchedOff: !0 };
  if (e.unavailable || e.transcriptTooLong || e.failureMode === "unparseable" || e.errorKind !== void 0)
    return {
      kind: "unavailable",
      model: e.model,
      ...(e.httpStatus !== void 0 && { httpStatus: e.httpStatus }),
      ...(e.errorKind !== void 0 && { errorKind: e.errorKind }),
    };
  return;
}
//@ chunk-e6aww6q8.js:1290149-1290191 placement
var TOOLS_HELD_UNTIL_A_PERSON_TYPES = "tools_held_until_a_person_types";
//@ chunk-e6aww6q8.js:1290191-1290249 placement
function pKe(e) {
  return e?.toolsHeldUntilAPersonTypes === !0;
}
/**
 * 生成"工具调用已暂停，需用户亲自发新消息才能继续"的拒绝文本。
 */
//@ chunk-e6aww6q8.js:1290249-1290576 placement
function buildToolsPausedMessage(e) {
  return `${e} was not run. Tool calls are paused in this session until the user sends a new message themselves; a message that an app or an automation sends does not count. Do not retry or look for another way. Say where things stand, what you would do next, and that a new message from them will let you go on.`;
}
//@ chunk-e6aww6q8.js:1290576-1290609 placement
var s0o = new Set([...zIn, ...Tio]);
//@ chunk-e6aww6q8.js:1290609-1290668 placement
function dKe(e) {
  return e !== void 0 && s0o.has(e) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e) : void 0;
}
//@ chunk-e6aww6q8.js:1290668-1290708 placement
var i0o = new Set([...AUTO_MODE_RULE_IDS, ...Qfs, ...Tio]);
//@ chunk-e6aww6q8.js:1290708-1290766 placement
function AL(e) {
  return e !== void 0 && i0o.has(e) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e) : void 0;
}
/**
 * 把 setAppState 包装成只更新 classifierApprovals 子状态的 setter，值未变时不触发更新。
 */
//@ chunk-e6aww6q8.js:1290766-1290907 placement
function makeClassifierApprovalsSetter(e) {
  return (n) =>
    e((r) => {
      let s = n(r.classifierApprovals);
      if (s === r.classifierApprovals) return r;
      return { ...r, classifierApprovals: s };
    });
}
/**
 * 在分类器审批状态里写入某个 toolUseId 的审批结果，值相同不更新。
 */
//@ chunk-e6aww6q8.js:1290907-1291049 placement
function setClassifierApproval(e, n, r) {
  if (!e) return;
  e((s) => {
    if (s.approvals.get(n) === r) return s;
    let h = new Map(s.approvals);
    return (h.set(n, r), { ...s, approvals: h });
  });
}
//@ chunk-e6aww6q8.js:1291049-1291113 placement
function hUo(e, n) {
  return e.classifierApprovals.approvals.get(n);
}
//@ chunk-e6aww6q8.js:1291113-1291244 placement
function markClassifierChecking(e, n) {
  if (!e) return;
  e((r) => {
    if (r.checking.has(n)) return r;
    let s = new Set(r.checking);
    return (s.add(n), { ...r, checking: s });
  });
}
/**
 * 从分类器审批状态的 checking 集合中移除 toolUseId。
 */
//@ chunk-e6aww6q8.js:1291244-1291379 placement
function clearClassifierChecking(e, n) {
  if (!e) return;
  e((r) => {
    if (!r.checking.has(n)) return r;
    let s = new Set(r.checking);
    return (s.delete(n), { ...r, checking: s });
  });
}
/**
 * 删除某个 toolUseId 的分类器审批结果。
 */
//@ chunk-e6aww6q8.js:1291379-1291517 placement
function deleteClassifierApproval(e, n) {
  if (!e) return;
  e((r) => {
    if (!r.approvals.has(n)) return r;
    let s = new Map(r.approvals);
    return (s.delete(n), { ...r, approvals: s });
  });
}
//@ chunk-e6aww6q8.js:1291517-1291653 placement
function resetClassifierApprovals(e) {
  if (!e) return;
  e((n) => {
    if (n.approvals.size === 0 && n.checking.size === 0) return n;
    return { approvals: new Map(), checking: new Set() };
  });
}
//@ chunk-e6aww6q8.js:1291919-1292184 placement
function arePermissionHooksUnsettled() {
  try {
    let e = getPluginRegistry(),
      organizationAsk = e.organizationAsk,
      r =
        e.hookRegistrationsInFlight.size > 0 ||
        e.hookModulesAwaitTrust ||
        organizationAsk.isHeld ||
        organizationAsk.isCommandHeld ||
        organizationAsk.isMarketplaceHeld ||
        organizationAsk.heldReresolve !== null;
    return (
      isHookRegistrationPending() || e.hooksRespawns.size > 0 || (r && oae() && hasNonBuiltinPluginSurface())
    );
  } catch (error) {
    return (logError(toError(error)), !0);
  }
}
//@ chunk-e6aww6q8.js:1292184-1292250 placement
function Kjr(e, n) {
  return e || (n.behavior === "ask" && n.personOnly === !0);
}
//@ chunk-e6aww6q8.js:1292250-1292278 placement
var l2e = new SessionRootSlot(() => new Map());
//@ chunk-e6aww6q8.js:1292278-1292311 placement
function d2e(e) {
  return e ?? "main";
}
//@ chunk-e6aww6q8.js:1292311-1292345 placement
function w6t(e) {
  return e[0]?.uuid;
}
/**
 * 按（会话, agent）记录一次待处理的压缩请求：当前允许压缩且本 epoch 未用过时，新建或并入 pending（拒绝时追加工具名），返回 requested/joined。
 */
//@ chunk-e6aww6q8.js:1292345-1292730 placement
function requestDenialCompact(e, n, r) {
  let s = w6t(n);
  if (s === void 0) return;
  let of = l2e.of(e.session),
    y = d2e(e.agentId),
    S = of.get(y);
  if (S?.canCompact !== !0 || S.spentEpoch === s) return;
  let w = S.pending?.epoch === s ? S.pending : void 0,
    L = w ?? { epoch: s, mode: r.mode, toolName: r.toolName, deniedToolNames: [] };
  return (
    of.set(y, {
      ...S,
      pending: r.denied ? { ...L, deniedToolNames: [...L.deniedToolNames, r.toolName] } : L,
    }),
    w ? "joined" : "requested"
  );
}
//@ chunk-e6aww6q8.js:1292730-1293008 placement
function syncCompactEligibility(e, n, r, s) {
  let of = l2e.of(e.session),
    y = d2e(e.agentId),
    S = of.get(y);
  of.set(y, { canCompact: s, spentEpoch: S?.spentEpoch });
  let w = S?.pending;
  if (w === void 0) return {};
  if (w.epoch !== w6t(n)) return { pending: w, stale: "epoch" };
  if (w.mode !== r) return { pending: w, stale: "mode" };
  return { pending: w };
}
//@ chunk-e6aww6q8.js:1293008-1293124 placement
function markCompactRequestSpent(e, n) {
  let of = l2e.of(e.session),
    s = d2e(e.agentId);
  of.set(s, { ...of.get(s), pending: void 0, spentEpoch: n.epoch });
}
//@ chunk-e6aww6q8.js:1293124-1293158 placement
var NQ = ge(new Map(), (e) => e.clear());
//@ chunk-e6aww6q8.js:1293158-1293202 placement
function R6t(e) {
  return `${getSessionId()}:${e ?? "main"}`;
}
//@ chunk-e6aww6q8.js:1293202-1293397 placement
function recordPromptedToolCall({ agentId: agentId, tool: tool, input: input, message: message }) {
  let h;
  try {
    h = Xq(input);
  } catch {
    return;
  }
  let y = R6t(agentId),
    S = NQ.get(y) ?? [];
  (S.push({ tool: tool, inputJson: h, fromMessageId: message.message.id, fromUuid: message.uuid }),
    NQ.set(y, S));
}
/**
 * 在该 agent 记下的工具调用里查同一工具、同一输入、来自更早助手消息的记录并消费掉；同时清理已失效的记录。返回是否命中。
 */
//@ chunk-e6aww6q8.js:1293397-1293939 placement
function consumeRepeatedToolCall({
  agentId: agentId,
  tool: tool,
  input: input,
  message: message,
  messages: messages,
}) {
  let agentKey = R6t(agentId),
    entries = NQ.get(agentKey);
  if (entries === void 0 || entries.length === 0) return !1;
  let id = message.message.id,
    filtered = entries.filter((Z) => {
      if (Z.fromMessageId === id) return !0;
      let index = messages.findIndex((ke) => ke.uuid === Z.fromUuid);
      return (
        index !== -1 &&
        !messages
          .slice(index + 1)
          .some((ke) => ke.type === "assistant" && ke.message.id !== Z.fromMessageId && ke.message.id !== id)
      );
    }),
    inputJson;
  try {
    inputJson = Xq(input);
  } catch {
    inputJson = void 0;
  }
  let index = filtered.findIndex(
    (Z) => Z.fromMessageId !== id && Z.tool === tool && Z.inputJson === inputJson,
  );
  if (index !== -1) filtered.splice(index, 1);
  if (filtered.length > 0) NQ.set(agentKey, filtered);
  else NQ.delete(agentKey);
  return index !== -1;
}
//@ chunk-e6aww6q8.js:1293939-1293977 placement
var u2e = Symbol("DenialLimitFallback");
//@ chunk-e6aww6q8.js:1293977-1294108 placement
function withPermissionDisclosure(e, n) {
  return {
    [u2e]: !0,
    disclosure: e,
    ...(n !== void 0 && { autoDenyAfterMs: n.autoDenyAfterMs, autoDenyResolution: n.resolution }),
  };
}
//@ chunk-e6aww6q8.js:1294108-1294157 placement
function $5s(e, n) {
  return { ...e, deadlineEpochMs: n };
}
/**
 * 去掉权限请求里的截止时间与自动拒绝字段，保留披露标记。
 */
//@ chunk-e6aww6q8.js:1294157-1294268 placement
function stripAutoDenyFields(e) {
  let {
    deadlineEpochMs: deadlineEpochMs,
    autoDenyAfterMs: autoDenyAfterMs,
    autoDenyResolution: autoDenyResolution,
    ...h
  } = e;
  return { ...h, [u2e]: e[u2e] };
}
//@ chunk-e6aww6q8.js:1294268-1294296 placement
var l0o = new Set([FILE_READ_TOOL_NAME, GREP_TOOL_NAME, GLOB_TOOL_NAME]);
/**
 * 判断工作目录外读取的 ask 是否应改为展示一次性的 auto 模式外部读取提示：auto 分类器启用、可交互、非后台/远程、未见过该提示等条件。
 */
//@ chunk-e6aww6q8.js:1294296-1294866 placement
function shouldShowOutsideReadPrompt(tool, input, decision, context) {
  if (
    decision.behavior !== "ask" ||
    decision.decisionReason?.type !== "workingDir" ||
    !l0o.has(tool.name) ||
    typeof tool.getPath !== "function" ||
    !tool.getPath(input)
  )
    return !1;
  let permissionContext = getToolPermissionContext(context);
  if (
    !isAutoClassifierActive(permissionContext.mode) ||
    permissionContext.shouldAvoidPermissionPrompts ||
    permissionContext.blockReadsOutsideWorkingDirectories === !0
  )
    return !1;
  if (context.forRemoteExecution === !0 || permissionContext.servedCall === !0) return !1;
  if (context.options.isNonInteractiveSession) return !1;
  if (isBgSession() || Yqe()) return !1;
  if (!isSettingSourceEnabled("userSettings")) return !1;
  return (
    !context.session.outsideReadPrompt.isOpenElsewhere(context.toolUseId) &&
    !context.session.outsideReadPrompt.answered &&
    !getGlobalConfig().hasSeenAutoModeOutsideReadPrompt
  );
}
/**
 * 在全局配置中记下已看过 auto 模式外部读取提示。
 */
//@ chunk-e6aww6q8.js:1294866-1294983 placement
function markOutsideReadPromptSeen(e) {
  saveGlobalConfig(
    (n) => (n.hasSeenAutoModeOutsideReadPrompt ? n : { ...n, hasSeenAutoModeOutsideReadPrompt: !0 }),
    e.storageV5,
  );
}
//@ chunk-e6aww6q8.js:1294983-1295927 placement
async function persistBlockReadsOutsideWorkspace(e) {
  if (
    (e.setSessionToolPermissionContext((s) => ({ ...s, blockReadsOutsideWorkingDirectories: !0 })),
    markReadBlockApplied(),
    !isSettingSourceEnabled("userSettings"))
  ) {
    let s = Error("user settings are not a setting source of this session");
    return (
      logFeatureSad("permission_block_outside_reads", "user_settings_disabled"),
      { error: s, sandboxRefreshed: !1 }
    );
  }
  let { error: error } = await updateSettingsForSource(
    "userSettings",
    { permissions: { blockReadsOutsideWorkingDirectories: !0 } },
    void 0,
    e.storageV5,
  );
  if (error)
    return (
      logForDebugging(`Failed to persist blockReadsOutsideWorkingDirectories: ${error.message}`, {
        level: "error",
      }),
      logFeatureSad("permission_block_outside_reads", "settings_write_failed"),
      { error: error, sandboxRefreshed: !1 }
    );
  let r;
  try {
    r = SandboxManager.refreshConfig();
  } catch (error) {
    return (
      logError(toError(error)),
      logFeatureSad("permission_block_outside_reads", "sandbox_refresh_failed"),
      { error: null, sandboxRefreshed: !1 }
    );
  }
  if (!r)
    return (
      logFeatureSad("permission_block_outside_reads", "sandbox_refresh_skipped"),
      { error: null, sandboxRefreshed: !1 }
    );
  return (logFeatureOk("permission_block_outside_reads"), { error: null, sandboxRefreshed: !0 });
}
//@ chunk-e6aww6q8.js:1295927-1295963 placement
function AWt(e) {
  return resolveClassifyEditsFlag(e).value;
}
//@ chunk-e6aww6q8.js:1295963-1296079 placement
function resolveClassifyEditsFlag(e) {
  let CLAUDE_CODE_AUTO_MODE_CLASSIFY_EDITS = antEnv.CLAUDE_CODE_AUTO_MODE_CLASSIFY_EDITS;
  if (CLAUDE_CODE_AUTO_MODE_CLASSIFY_EDITS !== void 0)
    return { value: CLAUDE_CODE_AUTO_MODE_CLASSIFY_EDITS, src: "env" };
  return classifyEditsByModelList(e);
}
/**
 * auto 模式下文件编辑是否也交给分类器：环境变量 CLAUDE_CODE_AUTO_MODE_CLASSIFY_EDITS 为 true，或当前主模型在配置的 classifyEditsModels 列表中。
 */
//@ chunk-e6aww6q8.js:1296079-1296179 placement
function shouldClassifyEdits(e) {
  return (
    antEnv.CLAUDE_CODE_AUTO_MODE_CLASSIFY_EDITS === !0 ||
    classifyEditsByModelList(e, { overridesMap: {} }).value
  );
}
//@ chunk-e6aww6q8.js:1296179-1296233 placement
function M6t() {
  return getAutoModeConfigOrDefault().runLoneHandedOverEdit === !0;
}
//@ chunk-e6aww6q8.js:1296233-1296462 placement
function classifyEditsByModelList(e, n) {
  let s = getAutoModeConfigOrDefault()?.classifyEditsModels,
    h = new Set(Array.isArray(s) ? s : []),
    y = [];
  if (h.size === 0 && y.length === 0) return { value: !1, src: "default" };
  return {
    value: mainModelOverrideKeys(e, n).some((S) => h.has(S) || y.some((w) => S.startsWith(w))),
    src: "gb",
  };
}
//@ chunk-e6aww6q8.js:1296462-1296490 placement
var u0o = new Set([FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME, NOTEBOOK_EDIT_TOOL_NAME]);
//@ chunk-e6aww6q8.js:1296490-1296524 placement
function swt(e) {
  return u0o.has(e);
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
function j5s(e) {
  return new ToolUseIdSet(e);
}
//@ chunk-e6aww6q8.js:1296659-1296721 placement
function Vjr(e) {
  return e instanceof ToolUseIdSet ? e.toolUseIDs() : void 0;
}
//@ chunk-e6aww6q8.js:1296721-1296770 placement
function iwt(e, n) {
  return n === "ask" && swt(e) && wasProactivityEverOn();
}
//@ chunk-e6aww6q8.js:1296770-1296816 placement
function W5s(e, n) {
  return e === "ask" && n !== "ask";
}
/**
 * 启动模式由主动性等级决定，且当前模式（plan 取进入前的模式）已不同于基线模式。
 */
//@ chunk-e6aww6q8.js:1297111-1297265 placement
function hasLeftProactivityBaseline(e) {
  let n = e.mode === "plan" ? (e.prePlanMode ?? "plan") : e.mode;
  return e.startupModeDecidedByProactivityLevel !== void 0 && e.proactivityBaseline?.mode !== n;
}
/**
 * 按当前模式、主动性等级和是否偏离基线，算出 Shift+Tab 的模式循环。
 */
//@ chunk-e6aww6q8.js:1297265-1297367 placement
function getPermissionModeCycle(e) {
  return cycleAllTeammateModes(
    e.toolPermissionContext.mode,
    e.proactivityLevel,
    hasLeftProactivityBaseline(e.toolPermissionContext),
  );
}
/**
 * 把磁盘上（严格信任）各来源新出现的 deny 规则并入上下文（y$ 匹配的排前面），并按需开启 blockReadsOutsideWorkingDirectories。
 */
//@ chunk-e6aww6q8.js:1329439-1330061 fingerprint = getDenyRules (0.493)
var mergePersistedDenyRules = (context) => {
  let n = new Map();
  for (let {
    ruleBehavior: ruleBehavior,
    ruleValue: ruleValue,
    source: source,
  } of loadAllPermissionRulesFromDisk({ strictPersistedTrust: !0 })) {
    if (ruleBehavior !== "deny") continue;
    let S = formatPermissionRule(ruleValue),
      w = n.get(source) ?? { holds: new Set(context.alwaysDenyRules[source]), gained: [] };
    if ((n.set(source, w), !w.holds.has(S))) (w.holds.add(S), w.gained.push(S));
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
    ...(isReadBlockOn() && { blockReadsOutsideWorkingDirectories: !0 }),
    ...(flattened.length > 0 && {
      alwaysDenyRules: { ...context.alwaysDenyRules, ...Object.fromEntries(flattened) },
    }),
  };
};
//@ chunk-e6aww6q8.js:2952237-2952273 placement
function isAutoModeConsentFlowEnabled(e) {
  return !isModelDrivenSession(e) && c_e();
}
//@ chunk-e6aww6q8.js:2952273-2952296 placement
function autoModeBlockedHelp(e) {
  return;
}
//@ chunk-e6aww6q8.js:2952296-2952321 placement
function nne(e) {
  return !1;
}
/**
 * 服务端分类器角色的按调用修正：本次 tool_use 是客户端指定的 clientRequestedToolUseId 时返回 "off"（不交服务端分类器），否则原样返回角色。
 */
//@ chunk-e6aww6q8.js:2952321-2952398 placement
function resolveServerClassifierRoleForCall(e, n, r, s) {
  if (s.clientRequestedToolUseId === r) return "off";
  return e;
}
//@ chunk-e6aww6q8.js:2952398-2952534 placement
function isTicklishWhisperEnabled() {
  if (antEnv.CLAUDE_CODE_TICKLISH_WHISPER !== void 0) return antEnv.CLAUDE_CODE_TICKLISH_WHISPER;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ticklish_whisper", !1);
}
//@ chunk-e6aww6q8.js:2952534-2952572 placement
function OV(e) {
  return isTicklishWhisperEnabled() && e && !isSdkDialogHostActive();
}
/**
 * auto 模式退回按量计费的分类器请求时的提示：已中止返回 interrupt；有缓存的选择直接用；无 Opus 权限或没有对话框表面时记日志并 continue；否则弹一次计费提示对话框（上报 tengu_auto_mode_server_fallback_notice），返回用户的选择。
 */
//@ chunk-e6aww6q8.js:2952572-2953294 placement
function awaitClassifierBillingFallbackNotice(e) {
  let requestDialog = e.requestDialog;
  if (e.abortController.signal.aborted) return Promise.resolve("interrupt");
  let r = getServerClassifierFallbackChoice();
  if (r !== void 0) return raceChoiceWithAbort(r, e.abortController.signal);
  if (!hasOpusAccess()) return Promise.resolve("continue");
  if (requestDialog === void 0 || (isSdkDialogHostActive() ? !Xjr() : isUnattendedInteractiveSession()))
    return (
      logForDebugging(
        "[server-classifier] auto mode fell back to billed classifier requests; no dialog surface to warn on, continuing in auto mode",
      ),
      Promise.resolve("continue")
    );
  let s = resolveServerFallbackChoice(() => {
    let h = getGatewayNoticeInfo();
    return (
      logEvent("tengu_auto_mode_server_fallback_notice", {
        gatewayDetected: h.gatewayHost !== void 0,
        provider: getAPIProviderForAnalytics(),
        interactive: !0,
        sdkHost: isSdkDialogHostActive(),
      }),
      showServerFallbackNotice(requestDialog, h, {
        storageV5: e.storageV5,
        signal: e.isBackgroundAgent === !0 ? void 0 : turnAbortControllerOf(e.abortController).signal,
      })
    );
  });
  return raceChoiceWithAbort(s, e.abortController.signal);
}
/**
 * 分类器的两种固定拦截结果：YJe 为用户在计费提示处取消（"Cancelled at the classifier billing notice"），XJe 为本会话不运行分类器；rkn 是子代理报告未经审查时附加的警告文字。
 */
//@ chunk-e6aww6q8.js:2953294-2953600 placement
var CLASSIFIER_BILLING_CANCELLED_RESULT = {
    model: "auto mode",
    durationMs: 0,
    shouldBlock: !0,
    unavailable: !0,
    reason: "Cancelled at the classifier billing notice",
  },
  NO_CLASSIFIER_FOR_SESSION_RESULT = {
    model: "auto mode",
    durationMs: 0,
    shouldBlock: !0,
    unavailable: !0,
    reason: "No classifier runs for this session",
  },
  UNREVIEWED_SUBAGENT_REPORT_WARNING = "Delivered with a warning: nothing reviewed the subagent's report";
/**
 * 超限回退时“限时自动拒绝”窗口长度：env CLAUDE_CODE_TICKLISH_WHISPER_TIMEOUT_MS，缺省用 TIMED_FALLBACK_AUTO_DENY_MS。
 */
//@ chunk-e6aww6q8.js:2953600-2953670 placement
function getTimedFallbackAutoDenyMs() {
  return antEnv.CLAUDE_CODE_TICKLISH_WHISPER_TIMEOUT_MS ?? TIMED_FALLBACK_AUTO_DENY_MS;
}
/**
 * 判断脚本是否“请求在沙箱外运行”：dangerouslyDisableSandbox 为 true，且该命令带此标志时不走沙箱、不带时会走沙箱（即标志确实改变了沙箱决定）。PowerShell 工具按 powershell shellType 判断。
 */
//@ chunk-e6aww6q8.js:2953670-2953960 placement
function scriptAsksToRunUnsandboxed(e, n) {
  let dangerouslyDisableSandbox = n.dangerouslyDisableSandbox;
  if (dangerouslyDisableSandbox !== !0 && dangerouslyDisableSandbox !== "true") return !1;
  let s = typeof n.command === "string" ? n.command : void 0,
    h = e.name === POWERSHELL_TOOL_NAME ? "powershell" : void 0;
  return (
    !shouldUseSandbox({ command: s, dangerouslyDisableSandbox: !0, shellType: h }) &&
    shouldUseSandbox({ command: s, dangerouslyDisableSandbox: !1, shellType: h })
  );
}
/**
 * 用更新函数修改拒绝跟踪状态：子代理写本地 localDenialTracking，主线程写 AppState.denialTracking；返回新状态。
 */
//@ chunk-e6aww6q8.js:2953960-2954253 placement = persistDenialState (0.894)
function updateDenialTrackingState(context, update) {
  if (context.localDenialTracking) {
    let s = update(context.localDenialTracking);
    return (Object.assign(context.localDenialTracking, s), s);
  }
  let r;
  return (
    context.setAppState((prev) => {
      if (((r = update(prev.denialTracking ?? createDenialTrackingState())), prev.denialTracking === r))
        return prev;
      return { ...prev, denialTracking: r };
    }),
    r ?? update(context.getAppState().denialTracking ?? createDenialTrackingState())
  );
}
//@ chunk-e6aww6q8.js:2954253-2954278 placement
function resetDenialStreakAfterUserApproval(e) {
  updateDenialTrackingState(e, resetConsecutiveDenials);
}
//@ chunk-e6aww6q8.js:2954278-2954392 placement
var ORG_REQUIRES_APPROVAL_MESSAGE = "Your organization requires approval for this tool",
  CLI_ALWAYS_ASKS_MESSAGE = "Claude Code asks before every use of this tool.";
//@ chunk-e6aww6q8.js:2954392-2954448 placement
function askCeilingReason(e) {
  return e.mcpInfo?.cliOwned === !0 ? CLI_ALWAYS_ASKS_MESSAGE : ORG_REQUIRES_APPROVAL_MESSAGE;
}
//@ chunk-e6aww6q8.js:2954448-2954477 placement
function permissionRuleSourceDisplayString(e) {
  return getSettingSourceDisplayNameLowercase(e);
}
/**
 * Bash/Monitor/PowerShell 的 allow 若来自沙箱自动放行或只读判定，返回 "sandbox"/"readOnly"（用于交给服务端分类器复核）。
 */
//@ chunk-e6aww6q8.js:2954477-2954880 placement
function serverHeldShellAllowSource(tool, result) {
  if (
    result.behavior !== "allow" ||
    (tool.name !== BASH_TOOL_NAME && tool.name !== MONITOR && tool.name !== POWERSHELL_TOOL_NAME)
  )
    return;
  let r = (s) => {
    if (s?.type === "other")
      return s.reason === SANDBOX_AUTO_ALLOW_REASON
        ? "sandbox"
        : s.reason === READ_ONLY_AUTO_ALLOW_REASON ||
            s.reason === POWERSHELL_READ_ONLY_ALLOW_REASON ||
            s.reason === POWERSHELL_COMPOUND_READ_ONLY_PART_REASON
          ? "readOnly"
          : void 0;
    if (s?.type !== "subcommandResults") return;
    for (let h of s.reasons.values()) {
      let y = h.behavior === "allow" ? r(h.decisionReason) : void 0;
      if (y !== void 0) return y;
    }
    return;
  };
  return r(result.decisionReason);
}
/**
 * 为 Bash/PowerShell 调用生成破坏性命令分析字段（destructive_category、destructive_target_scope、git_destructive_target），用于权限决定的遥测；其他工具返回 undefined。
 */
//@ chunk-e6aww6q8.js:2954880-2955190 placement
function getDestructiveCommandAnalytics(e, n) {
  let r = e === BASH_TOOL_NAME;
  if (!r && e !== POWERSHELL_TOOL_NAME) return;
  if (n === null || typeof n !== "object" || !("command" in n) || typeof n.command !== "string") return;
  let s = r ? XCe(n.command) : WSt(n.command);
  return {
    destructive_category: fromEnum(s ?? "none"),
    destructive_target_scope: fromEnum(classifyDestructiveTargetScope(n.command, gl(), s)),
    git_destructive_target: fromEnum(classifyGitDestructiveTarget(n.command, s)),
  };
}
/**
 * 模式切换后，之前的放行是否仍成立：auto 恒真；plan 下仅在 auto 激活且工具输入只读（或属于 plan 允许的只读类）时成立；其余模式返回调用方给定的原结果。
 */
//@ chunk-e6aww6q8.js:2955190-2955549 placement
function isStillAllowedAfterModeChange(e, n, r, s, h) {
  switch (e) {
    case "auto":
      return !0;
    case "plan": {
      if (!isAutoModeActive()) return !1;
      let safeParse = r.inputSchema.safeParse(s);
      return (
        (safeParse.success === !0 &&
          r.isReadOnly(safeParse.data, h) &&
          !(r.ignoresWholeToolAllowRule?.(safeParse.data) ?? !1)) ||
        isReadOnlyBrowserCall(getToolNameForPermissionCheck_4(r), safeParse.success ? safeParse.data : s)
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
      return !1;
    }
  }
}
/**
 * Cowork 云会话的 Web 工具放行覆盖：存在授权且工具是 Cowork Web 工具时，按 RL（Cowork Web 判定）返回是否覆盖。
 */
//@ chunk-e6aww6q8.js:2955549-2955625 placement
function isCoworkWebAllowOverride(e, n, r, s) {
  if (e === null || !I9n(n.name)) return !1;
  return RL(n, getToolPermissionContext(s));
}
/**
 * MCP 工具在 auto 模式下被“破坏性 MCP allow 规则”直接放行（跳过分类器复核）时上报 tengu_auto_mode_destructive_mcp_rule_allow，带规则来源与服务端分类器角色。
 */
//@ chunk-e6aww6q8.js:2955625-2955872 placement
function countMcpPolicyRecheckSkipped(e, n, r, s, h, y) {
  if (n.mcpInfo === void 0) return;
  let S = getToolPermissionContext(s);
  if (isAutoAllowedInMode(n, S) !== "auto" || !o2e(n, r, "auto", S)) return;
  let w = getAutoModeClassifierRole(S.mode);
  logEvent("tengu_auto_mode_destructive_mcp_rule_allow", {
    ruleSource: fromEnum(e),
    serverClassifierRole: fromEnum(h === void 0 ? w : resolveServerClassifierRoleForCall(w, h, y, s)),
  });
}
/**
 * MCP 的 ask 是否否决已有的整工具授权：远程会话 MCP、Cowork Web、或开启服务端策略且该 MCP 工具受策略 ask 约束并命中会话级 allow 时为真；为真时 hasPermissionsToUseTool 给结果加 suppressAlwaysAllowRule。
 */
//@ chunk-e6aww6q8.js:2955872-2956091 placement
function mcpAskVetoesStandingGrant(e, n, r, s, h) {
  let y = getToolPermissionContext(r);
  return (
    XH(e, y) ||
    B1e(e, y) ||
    (isCcsTenant() &&
      e.mcpInfo !== void 0 &&
      t_e(e, y) &&
      getMcpRuleClassifierRoute(
        {
          source: "session",
          ruleBehavior: "allow",
          ruleValue: { toolName: getToolNameForPermissionCheck_4(e) },
        },
        e,
        n,
        isAutoAllowedInMode(e, y),
        r,
        () => resolveServerClassifierRoleForCall(getAutoModeClassifierRole(y.mode), s, h, r),
      ) !== void 0)
  );
}
/**
 * 破坏性 MCP 调用在 auto/分类器模式下是否应改为 ask：有授权、模式走分类器、工具 isDestructive(input) 为真，且远程破坏性 MCP 开关或 tengu_modular_mochi 打开。
 */
//@ chunk-e6aww6q8.js:2956091-2956176 placement
function isDestructiveMcpAskOverride(e, n, r, s, h) {
  return (
    e &&
    isAutoClassifierActive(s) &&
    (n.isDestructive?.(r) ?? !1) &&
    (includesRemoteDestructiveMcp() || isModularMochiEnabled(h))
  );
}
//@ chunk-e6aww6q8.js:2956176-2956259 placement
function includesRemoteDestructiveMcp() {
  return (
    isCoworkAny() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_remote_auto_mode_include_destructive_mcp", !1)
  );
}
/**
 * Computer Use 检查开关：GrowthBook tengu_quirky_shore 为 on 或设置 computerUseChecks 打开时返回 "on"。
 */
//@ chunk-e6aww6q8.js:2956259-2956361 placement
function getComputerUseChecksSetting() {
  return m6t(getFeatureValue_CACHED_MAY_BE_STALE("tengu_quirky_shore", "off")) === "on" ||
    p1r("computerUseChecks")
    ? "on"
    : void 0;
}
//@ chunk-e6aww6q8.js:2956361-2956450 placement
function isModularMochiEnabled(e) {
  return (
    Qbe(isDiskless() ? e.options.mcpClients : void 0) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_modular_mochi", !1)
  );
}
//@ chunk-e6aww6q8.js:2956450-2956478 placement
function hasAutoModeClassifierDenyRules() {
  return cyt();
}
/**
 * settings.autoMode 是否配置了自定义 soft_deny 或 hard_deny 规则。
 */
//@ chunk-e6aww6q8.js:2956478-2956548 placement
function hasCustomAutoModeDenyRules() {
  let e = getAutoModeConfig();
  return nct(e?.soft_deny) || nct(e?.hard_deny);
}
/**
 * 向会话追加 auto 模式警告系统消息（非 SDK、有 appendSystemMessage，且子代理只在显式要求时追加）。
 */
//@ chunk-e6aww6q8.js:2956548-2956707 placement
function appendAutoModeWarning(e, n, r) {
  if (getIsNonInteractiveSession() || e.appendSystemMessage === void 0 || (!n && e.agentId !== void 0))
    return;
  let s = qjr(n, r);
  if (s !== void 0) e.appendSystemMessage(createSystemMessage(s, "warning"));
}
/**
 * 按 decisionReason 生成请求确认的说明文字（classifier/hook/rule/subcommandResults/permissionPromptTool/sandboxOverride/workingDir/safetyCheck/mode/asyncAgent），默认 "Claude requested permissions to use X…"。
 */
//@ chunk-e6aww6q8.js:2956707-2958079 placement = createPermissionRequestMessage (1)
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
        let ruleString = formatPermissionRule(decisionReason.rule.ruleValue),
          sourceString = permissionRuleSourceDisplayString(decisionReason.rule.source);
        return `Permission rule '${ruleString}' from ${sourceString} requires approval for this ${toolName} command`;
      }
      case "subcommandResults": {
        let needsApproval = [];
        for (let [h, y] of decisionReason.reasons)
          if (y.behavior === "ask" || y.behavior === "passthrough")
            if (toolName === "Bash") {
              let { commandWithoutRedirections: commandWithoutRedirections, redirections: redirections } =
                  extractOutputRedirections(h),
                L = redirections.length > 0 ? commandWithoutRedirections : h;
              needsApproval.push(L);
            } else needsApproval.push(h);
        if (needsApproval.length > 0) {
          let h = needsApproval.length;
          return `This ${toolName} command contains multiple operations. The following ${plural(h, "part")} ${plural(h, "requires", "require")} approval: ${needsApproval.join(", ")}`;
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
  let s = formatPermissionRule(n),
    h = (y) => (y?.[r] ?? []).some((w) => formatPermissionRule(permissionRuleValueFromString(w)) === s);
  return h(e.alwaysAllowRules) || h(e.strippedDangerousRules);
}
/**
 * 从 addRules/replaceRules 的 allow 更新中剔除“加载 MCP skill 形式”的新规则（除非来源允许），用于 MCP skill 加载 ask 的回答。
 */
//@ chunk-e6aww6q8.js:2958214-2958535 placement
function withoutNewRulesOfMcpSkillLoadForm(e, n, r) {
  return n.flatMap((s) => {
    if ((s.type !== "addRules" && s.type !== "replaceRules") || s.behavior !== "allow") return [s];
    let filtered = s.rules.filter((rule) => {
      let S = permissionRuleValueFromString(formatPermissionRule(rule));
      return !e.has(S.toolName) || !Vli(S.ruleContent ?? "") || hasAllowRuleInSource(r, S, s.destination);
    });
    if (filtered.length === s.rules.length) return [s];
    return filtered.length > 0 ? [{ ...s, rules: filtered }] : [];
  });
}
//@ chunk-e6aww6q8.js:2958535-2958619 placement
function rTr(e, n) {
  return toolMatchesWholeToolRule(e, { source: "session", ruleBehavior: "allow", ruleValue: n });
}
/**
 * 选择要展示的决定原因：结果里有带熔断器的 safetyCheck，或结果标记 localDisplayOnly 时用结果自己的原因，否则用调用方给的原因。
 */
//@ chunk-e6aww6q8.js:2958619-2958819 placement
function pickDisplayedDecisionReason(e, n) {
  if (
    e.decisionReason !== void 0 &&
    findSafetyCheckReason(e.decisionReason, (r) => r.circuitBreaker !== void 0) !== void 0
  )
    return e.decisionReason;
  return e.localDisplayOnly === !0 && e.decisionReason ? e.decisionReason : n;
}
/**
 * 为 ask 去掉整工具授权：在工具名及其别名集合上移除整工具 allow 规则（按来源过滤），返回新的权限上下文。
 */
//@ chunk-e6aww6q8.js:2958819-2958893 placement
function stripWholeToolGrantsForAsk(e, n, r) {
  return dropBareAllowRulesForTools(
    e,
    getToolNameWithAliases(n, r),
    (s, h) => hasAllowRuleInSource(r, s, h),
    (s) => rTr(n, s),
  );
}
/**
 * 只保留“收紧”方向的权限更新：非 allow 的 addRules、移除 allow 的 removeRules、removeDirectories；replaceRules/setMode/addDirectories 一律丢弃。
 */
//@ chunk-e6aww6q8.js:2958893-2959133 placement = permissionUpdateSchema (0.725)
function withoutGrantsForRemoteScope(updates) {
  return updates.filter((n) => {
    switch (n.type) {
      case "addRules":
        return n.behavior !== "allow";
      case "removeRules":
        return n.behavior === "allow";
      case "removeDirectories":
        return !0;
      case "replaceRules":
      case "setMode":
      case "addDirectories":
        return !1;
    }
  });
}
/**
 * 由一组 PermissionUpdate 推出授权范围：去掉远程作用域不允许的授权后，若有持久化目的地返回 "always"，有其他更新返回 "session"，否则 "once"。
 */
//@ chunk-e6aww6q8.js:2959133-2959282 placement
function permissionGrantScope(e) {
  let n = new Set(withoutGrantsForRemoteScope(e)),
    filtered = e.filter((s) => !n.has(s));
  if (filtered.some((s) => supportsPersistence_2(s.destination))) return "always";
  return filtered.length > 0 ? "session" : "once";
}
/**
 * 回答 MCP skill 加载 ask 时可应用的更新：普通更新经远程作用域过滤；allow addRules 只保留与本次 skill 规则完全一致、目的地为 session 或允许目的地的那条。
 */
//@ chunk-e6aww6q8.js:2959282-2959596 placement = buildPermissionUpdates (0.851)
function answerUpdatesForMcpSkillAsk(mode, allowedPrompts) {
  return mode.flatMap((r) => {
    let s = withoutGrantsForRemoteScope([r]);
    if (s.length > 0 || allowedPrompts === void 0 || r.type !== "addRules" || r.behavior !== "allow")
      return s;
    if (r.destination !== USERSETTINGS && r.destination !== "session") return [];
    let filtered = r.rules.filter(
      (rule) => rule.toolName === allowedPrompts.toolName && rule.ruleContent === allowedPrompts.ruleContent,
    );
    return filtered.length > 0 ? [{ ...r, rules: filtered }] : [];
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
      return !0;
    return s.tools.some((tool) => {
      if (tool === "*") return !1;
      let toolName = permissionRuleValueFromString(tool).toolName;
      return (
        (r ??= getDenyRuleIndex(n)),
        !isToolDeniedByIndex(n, r.index, { name: toolName }) && sTr(toolName)
      );
    });
  });
}
//@ chunk-e6aww6q8.js:2959849-2959896 placement
function isAgentToolPoolDenied(e, n) {
  return filterBuiltInAgentsByDeniedTools([e], n).length === 0;
}
/**
 * 代理类型因其所有可用工具都被权限设置拒绝而不可用时的提示文字。
 */
//@ chunk-e6aww6q8.js:2959896-2960029 placement
function agentToolPoolDeniedMessage(e) {
  return `Agent type '${e}' is unavailable because every tool it may use is denied by the current permission settings.`;
}
//@ chunk-e6aww6q8.js:2960029-2960102 placement
function sTr(e) {
  return e !== WEBFETCH || (!env.CLAUDE_CODE_DISABLE_WEB_FETCH && isPolicyAllowed_3(ALLOW_WEB_FETCH));
}
/**
 * 过滤可派发的代理：去掉 isEnabled 为假的、被 Agent(type) deny 规则拒绝的、工具池全被拒绝的代理。
 */
//@ chunk-e6aww6q8.js:2960102-2960191 placement
function filterDispatchableAgents(e, n, r, s) {
  return filterOfferedAgents(
    filterBuiltInAgentsByDeniedTools(
      filterDeniedAgents(
        e.filter((h) => h.isEnabled?.(s) !== !1),
        n,
        r,
      ),
      n,
    ),
    s,
  );
}
/**
 * 取可派发代理列表：先按允许的 agentType 名单筛选，再走 filterDispatchableAgents。
 */
//@ chunk-e6aww6q8.js:2960191-2960275 placement
function getDispatchableAgents(e, n, r, s) {
  return filterDispatchableAgents(n ? e.filter((h) => n.includes(h.agentType)) : e, r, AGENT, s);
}
/**
 * PermissionRequest 钩子带 updatedInput 放行时的守卫：如果对改写后输入的规则检查结果是 deny/ask，记日志并返回该结果（规则优先于钩子）；否则返回 null。
 */
//@ chunk-e6aww6q8.js:2960275-2960466 placement
function guardHookUpdatedInput(e, n) {
  if (e?.behavior === "deny" || e?.behavior === "ask")
    return (
      logForDebugging(
        `PermissionRequest hook allowed ${n} with updatedInput, but ${e.behavior} rule overrides: ${e.message}`,
      ),
      e
    );
  return null;
}
/**
 * PermissionRequest 钩子返回 allow 后的落地：strict 模式下校验输入未被改写、对需要用户交互的工具复核规则、应用权限更新（丢失收紧则拒绝）；其他模式下校验改写后的输入、再走规则复核，launcher 模式持久化权限更新，最后返回 allow。
 */
//@ chunk-e6aww6q8.js:2960466-2962059 placement
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
    if (!d0e(hookResult.updatedInput, input)) return denyChangedAnswerInput(tool.name, toolUseId);
    if (tool.requiresUserInteraction?.() || requiresConnectorGrant(tool)) {
      let Se = guardHookUpdatedInput(
        await checkRuleBasedPermissions(
          tool,
          input,
          { ...context, toolUseId: toolUseId },
          { hookUpdatedInput: void 0 },
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
    let { lostTightenings: lostTightenings } = applyAnswerPermissionUpdates(
      hookMode,
      hookResult.updatedPermissions,
      {
        vetoed: isVetoed,
        strip: (Se) =>
          isHookOrPluginSteered(context)
            ? []
            : tool.suppressesAllPermissionUpdates?.(input) === !0
              ? withoutGrantsForRemoteScope(Se)
              : tool.suppressesAlwaysAllowRule?.(input) === !0 || stripWholeToolGrants
                ? stripWholeToolGrantsForAsk(Se, tool, getToolPermissionContext(context))
                : Se,
        toolName: getToolNameForPermissionCheck_4(tool),
        input: input,
        setContext: context.setSessionToolPermissionContext,
      },
    );
    if (lostTightenings > 0) return denyLostTightening(tool.name, toolUseId);
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: { type: "hook", hookName: "PermissionRequest" },
    };
  }
  if (obe(tool, input, hookResult.updatedInput, !0))
    return guardAccountMemoryHookRewrite(tool, "PermissionRequest");
  let validated = await validatePermissionRequestUpdatedInput(tool, hookResult.updatedInput, input, (Z) =>
    tool.validateInput?.(Z, { ...context, toolUseId: toolUseId }),
  );
  if (validated.deny !== void 0) return validated.deny;
  let input_2 = validated.input,
    effectiveInput = input_2 ?? input;
  if (input_2 || tool.requiresUserInteraction?.() || requiresConnectorGrant(tool)) {
    let Z = guardHookUpdatedInput(
      await checkRuleBasedPermissions(
        tool,
        effectiveInput,
        { ...context, toolUseId: toolUseId, permissionRound: void 0 },
        { hookUpdatedInput: input_2 },
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
        tool.suppressesAllPermissionUpdates?.(input) === !0
          ? withoutGrantsForRemoteScope(hookResult.updatedPermissions ?? [])
          : tool.suppressesAlwaysAllowRule?.(input) === !0 || stripWholeToolGrants
            ? stripWholeToolGrantsForAsk(
                hookResult.updatedPermissions ?? [],
                tool,
                getToolPermissionContext(context),
              )
            : (hookResult.updatedPermissions ?? []);
      if (Z.length && !isVetoed() && !isHookOrPluginSteered(context))
        (context.setSessionToolPermissionContext((Se) => applyPermissionUpdates(Se, Z)),
          persistPermissionUpdates(Z, context.storageV5).catch(logError));
      break;
    }
  }
  return {
    behavior: "allow",
    updatedInput: effectiveInput,
    decisionReason: { type: "hook", hookName: "PermissionRequest" },
  };
}
/**
 * 运行 PermissionRequest 钩子：allow（仅在允许由钩子放行时）经 Lkn 生效；deny 直接拒绝（interrupt 时中止）；远程执行跳过；异常记日志返回 null。
 */
//@ chunk-e6aww6q8.js:2962059-2962890 fingerprint = runPermissionRequestHooksForHeadlessAgent (0.704)
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
  if (context.forRemoteExecution === !0) return null;
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
          (logForDebugging(
            `Ignored a PermissionRequest hook's allow for ${tool.name}: only a person can approve this call, and no prompt can be shown here.`,
          ),
            onAllowIgnored?.());
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
        if (decision.interrupt)
          (logForDebugging(`Hook interrupt: tool=${tool.name} hookMessage=${decision.message}`),
            turnAbortControllerOf(context.abortController).abort());
        return {
          behavior: "deny",
          message: decision.message || "Permission denied by hook",
          decisionReason: { type: "hook", hookName: "PermissionRequest", reason: decision.message },
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
/**
 * 无法弹窗的 ask 交给 PermissionRequest 钩子裁决：远程执行、宿主显示的 ask、仅限人工且属 MCP skill 或工具宿主的 ask 不咨询钩子（返回 null）；否则运行钩子，带建议与“总是允许”抑制标志。
 */
//@ chunk-e6aww6q8.js:2962890-2963285 placement
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
    context.forRemoteExecution === !0 ||
    result.hostDisplay !== void 0 ||
    (result.personOnly === !0 &&
      (result.metadata?.mcpSkill !== void 0 || getRegisteredCheck(context.session, tool.name) !== void 0))
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
    result.suppressAlwaysAllowRule === !0,
    () => context.abortController.signal.aborted,
    !(result.personOnly === !0 && tool.settleUnaskedQuestion !== void 0 && result.hooksMayRefuse !== !0),
    onAllowIgnored,
  );
}
/**
 * ask 结果且 hooksMayRefuse 时先跑 PermissionRequest 钩子：deny 立即拒绝；allow 只在 hooksMayAllow 且改写后输入合法时经 Lkn 采用。
 */
//@ chunk-e6aww6q8.js:2963285-2964256 placement
async function personAskAfterHooks(
  result,
  { tool: tool, input: input, context: context, toolUseID: toolUseID, answers: answers },
) {
  let S = getToolPermissionContext(context);
  if (
    result.behavior !== "ask" ||
    result.hooksMayRefuse !== !0 ||
    context.forRemoteExecution === !0 ||
    S.servedCall === !0
  )
    return result;
  let w = result.updatedInput ?? input,
    L;
  try {
    for await (let { permissionRequestResult: permissionRequestResult } of executePermissionRequestHooks(
      tool.name,
      toolUseID,
      w,
      context,
      isAutoAllowedInMode(tool, S),
      result.suggestions,
      context.abortController.signal,
    )) {
      if (
        permissionRequestResult?.behavior === "allow" &&
        result.hooksMayAllow === !0 &&
        !isInteractionStillOwed(tool, permissionRequestResult.updatedInput) &&
        !(result.refusal === void 0 && mustBeLeftToAPerson(result, tool, input, context, toolUseID)) &&
        d0e(permissionRequestResult.updatedInput, w)
      )
        L ??= permissionRequestResult;
      if (permissionRequestResult?.behavior === "deny") {
        if (permissionRequestResult.interrupt === !0) turnAbortControllerOf(context.abortController).abort();
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
    if (L !== void 0 && answers !== void 0) {
      let G = await applyHookPermissionAllow(
        answers,
        tool,
        w,
        L,
        toolUseID,
        context,
        result.suppressAlwaysAllowRule === !0,
        () => context.abortController.signal.aborted,
      );
      if (G.behavior === "allow") VJe(context, toolUseID, result, tool.name);
      return G;
    }
  } catch (error) {
    logForDebugging(
      `PermissionRequest hook failed before a hook's ask for ${tool.name}: ${errorMessage(error)}`,
      { level: "error" },
    );
  }
  return result;
}
/**
 * 无法弹窗（shouldAvoidPermissionPrompts）或带 refusal 时，用 PermissionRequest 钩子代替人工；钩子无结论则拒绝（asyncAgent："Permission prompts are not available in this context"）。
 */
//@ chunk-e6aww6q8.js:2964256-2965014 placement
async function resolveAskWithoutPrompt(answers, tool, input, result, toolUseID, context) {
  if (getToolPermissionContext(context).shouldAvoidPermissionPrompts || result.refusal !== void 0) {
    if (result.refusal !== void 0 && result.hooksMayAllow === !1) {
      let q = await personAskAfterHooks(result, {
        tool: tool,
        input: input,
        context: context,
        toolUseID: toolUseID,
      });
      return q.behavior === "ask" ? result.refusal : q;
    }
    let w = suppressAlwaysAllowForSafetyCheck(result),
      L = { ignoredAllow: !1 },
      G = await consultPermissionRequestHooksForUnpromptableAsk(
        answers,
        tool,
        input,
        w.behavior === "ask" ? w : result,
        toolUseID,
        context,
        () => {
          L.ignoredAllow = !0;
        },
      );
    if (G) {
      if (G.behavior === "allow") VJe(context, toolUseID, result, tool.name);
      return G;
    }
    if (result.refusal !== void 0) return result.refusal;
    return {
      behavior: "deny",
      decisionReason: {
        type: "asyncAgent",
        reason: "Permission prompts are not available in this context",
        ask: refusedAskOf(result),
        ...(L.ignoredAllow && { hookAllowIgnored: !0 }),
      },
      message: isRequestedModeAuto(context)
        ? buildClassifierUnavailableMessage(
            tool.name,
            K2e,
            void 0,
            "server_not_requested",
            void 0,
            !1,
            void 0,
            !1,
            nne(context),
          )
        : result.metadata?.mcpSkill !== void 0
          ? buildNoPromptAvailableDenial(result.message)
          : AUTO_REJECT_MESSAGE(tool.name),
    };
  }
  return result;
}
/**
 * 无法弹窗时的拒绝结果：decisionReason.type 为 asyncAgent，原因“需要交互批准但当前上下文没有权限提示”，附原 ask 的摘要（refusedAskOf）。
 */
//@ chunk-e6aww6q8.js:2965014-2965229 placement
function denyPromptUnavailable(e, n = buildNoPromptAvailableDenial(e.message)) {
  return {
    behavior: "deny",
    message: n,
    decisionReason: {
      type: "asyncAgent",
      reason: "Action requires interactive approval and permission prompts are not available in this context",
      ask: refusedAskOf(e),
    },
  };
}
/**
 * 插件评测（plugin eval）授权检查：把上下文改成 dontAsk 并把 cliArg allow 规则（含被剥离的危险规则）加回，用 checkDeclarativePermission 经插件裁决层判定是否 allow。
 */
//@ chunk-e6aww6q8.js:2965229-2965771 placement
async function isAllowedByEvalGrants(e, n, r, s, h) {
  let y = {
    ...r,
    permissionRound: void 0,
    permissionLayers: [...(r.permissionLayers ?? []), { kind: "permission_mode", mode: "dontAsk" }],
    getAppState: () => {
      let appState = r.getAppState(),
        toolPermissionContext = appState.toolPermissionContext;
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
  if (getToolPermissionContext(y).mode !== "dontAsk") return !1;
  return (
    (
      await decideWithToolCheckHooks(
        {
          tool: e,
          input: n,
          context: y,
          toolUseID: s,
          evaluate: () => checkDeclarativePermission(e, n, y, { crashIsObjection: !0 }),
        },
        h,
      )
    ).behavior === "allow"
  );
}
//@ chunk-e6aww6q8.js:2965771-2965819 placement
function isServerContextStaleCheckEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_humble_wand", !0);
}
/**
 * 请求时模式是否为 auto：上下文带 permissionModeAtRequest 且去掉它后的有效模式为 auto。
 */
//@ chunk-e6aww6q8.js:2965819-2965934 placement
function isRequestedModeAuto(e) {
  return (
    e.permissionModeAtRequest !== void 0 &&
    getToolPermissionContext({ ...e, permissionModeAtRequest: void 0 }).mode === "auto"
  );
}
//@ chunk-e6aww6q8.js:2965934-2965986 placement
function getStaleContextErrorKind(e) {
  return e.errorKind === SERVER_CONTEXT_STALE ? SERVER_CONTEXT_STALE : void 0;
}
/**
 * 对外的权限检查入口（canUseTool 的核心）：已给定结果时直接返回，否则走 resolveToolPermission。
 */
//@ chunk-e6aww6q8.js:2965986-2966061 placement
var hasPermissionsToUseTool = async (tool, input, context, assistantMessage, toolUseID, forcedResult) => {
  if (forcedResult) return forcedResult;
  return hasPermissionsToUseToolWithSink(
    tool,
    input,
    context,
    assistantMessage,
    toolUseID,
    applyPermissionAnswerChanges,
    void 0,
  );
};
/**
 * 以 asksNoHost 标志调用 hasPermissionsToUseTool，用于没有宿主可询问的评估。
 */
//@ chunk-e6aww6q8.js:2966061-2966131 placement
function evaluateAskingNoHost(...[e, n, r, ...s]) {
  return hasPermissionsToUseTool(e, n, { ...r, asksNoHost: !0 }, ...s);
}
/**
 * 完整判定：hasPermissionsToUseTool → refusal 时无提示解决 → PermissionRequest 钩子预处理 → 安全检查结果抑制“总是允许” → 放行后撤销重写拒绝计数 → 记录决定。
 */
//@ chunk-e6aww6q8.js:2966131-2966576 placement
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
        (await hasPermissionsToUseToolInner(
          tool,
          input,
          context,
          assistantMessage,
          toolUseID,
          answers,
          S,
          w,
        )),
    ),
    G =
      L.behavior === "ask" && L.refusal !== void 0
        ? await resolveAskWithoutPrompt(answers, tool, input, L, toolUseID, context)
        : L,
    q = await personAskAfterHooks(G, {
      tool: tool,
      input: input,
      context: context,
      toolUseID: toolUseID,
      answers: answers,
    }),
    Z =
      q.behavior === "deny"
        ? appendRuleAnnotation({ ...q, decideLocation: "pre-ask" })
        : suppressAlwaysAllowForSafetyCheck(q);
  if (
    Z.behavior === "allow" &&
    getDenialTrackingState(context).lastRewriteFingerprint !== void 0 &&
    isClassifierTargetToolUse(assistantMessage, toolUseID, context.clientRequestedToolUseId)
  )
    updateDenialTrackingState(context, (Se) => undoRewriteDenialIfRetried(Se, tool.name, input));
  return (recordPipelineResult(context, toolUseID, input, Z, tool.name), Z);
};
//@ chunk-e6aww6q8.js:2966576-2966786 placement
function suppressAlwaysAllowForSafetyCheck(e) {
  if (
    e.behavior === "ask" &&
    e.suppressAlwaysAllowRule !== !0 &&
    e.metadata?.mcpSkill === void 0 &&
    findSafetyCheckReason(e.decisionReason, (n) => !n.classifierApprovable) !== void 0
  )
    return { ...e, suppressAlwaysAllowRule: !0 };
  return e;
}
/**
 * 找到能放行该工具的整工具 allow 规则（排除忽略整工具规则的工具、Chrome 地板、MCP 限制、computer-use 例外等）。
 */
//@ chunk-e6aww6q8.js:2966786-2967060 placement
function findApplicableAllowRule(tool, input, context, mode, h) {
  let y = toolAlwaysAllowedRule(getToolPermissionContext(context), tool);
  if (
    y &&
    tool.ignoresWholeToolAllowRule?.(input) !== !0 &&
    !pUt(tool, getToolPermissionContext(context)) &&
    !(
      isChromeToolName(getToolNameForPermissionCheck_4(tool)) &&
      (E5t(getToolNameForPermissionCheck_4(tool)) ||
        getToolPermissionContext(context).chromeClassifierFloorEnabled === !0)
    ) &&
    getMcpRuleClassifierRoute(y, tool, input, mode, context, () =>
      h(getToolPermissionContext(context).mode),
    ) === void 0 &&
    !isCoworkWebAllowOverride(y, tool, input, context) &&
    !t2e(getComputerUseChecksSetting(), getToolPermissionContext(context), tool, input, mode)
  )
    return y;
  return null;
}
/**
 * 主判定：先跑规则/工具检查（abn，经插件 tool.check 裁决 aWr）；allow 直接返回（清零连续拒绝）；ask 时按模式处理——dontAsk 转拒绝；auto 依次走安全检查/ask 规则回退、acceptEdits 模拟快路径、安全白名单、插件/合成调用跳过、分类器（本地或服务端），拦截时计拒绝并在超限时回退人工；bypassPermissions 对安全检查弹窗限时处理；最后无法弹窗时用钩子或拒绝。
 */
//@ chunk-e6aww6q8.js:2967060-3008254 callgraph-witnessed = hasPermissionsToUseTool (0.269)
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
      isMcp: tool.isMcp ?? !1,
      requestedMode: fromEnum(permissionContext.permissionModeAtRequest.mode),
      toolUseId: ye(toolUseID),
      agentMsgId: ye(assistantMessage.message.id),
    });
  let G,
    q = () => (G ??= mcpToolLogFields(tool, permissionContext.options.mcpClients)),
    Z,
    Se = () => (Z ??= getProjectsRoleTelemetry(permissionContext)),
    ke = (Ae) =>
      resolveServerClassifierRoleForCall(
        getAutoModeClassifierRole(Ae),
        assistantMessage,
        toolUseID,
        permissionContext,
      ),
    we = await decideWithToolCheckHooks(
      {
        tool: tool,
        input: input,
        context: permissionContext,
        toolUseID: toolUseID,
        evaluate: () => {
          let Ae = () => checkToolAndRulePermissions(tool, input, permissionContext, S, ke),
            Ie = getRegisteredCheck(permissionContext.session, tool.name);
          return Ie === void 0
            ? Ae()
            : invokeToolHostAdjudicator(
                Ie,
                tool,
                input,
                permissionContext,
                assistantMessage,
                toolUseID,
                Ae,
              ).then((Me) => {
                if (Me !== CHECK_NO_DECISION) return Me;
                return (rememberPendingCheck(permissionContext.session, toolUseID), Ae());
              });
        },
      },
      assistantMessage.message.id,
    ),
    checkResult =
      we.behavior === "ask" &&
      (mcpAskVetoesStandingGrant(tool, input, permissionContext, assistantMessage, toolUseID) ||
        e_e(tool, getToolPermissionContext(permissionContext)))
        ? {
            ...we,
            suppressAlwaysAllowRule: !0,
            ...(B1e(tool, getToolPermissionContext(permissionContext)) && { suggestions: void 0 }),
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
    let appState = permissionContext.getAppState(),
      Ie = permissionContext.localDenialTracking ?? appState.denialTracking;
    if (
      !OV(permissionContext.requestDialog !== void 0) &&
      isAutoAllowedInMode(tool, getToolPermissionContext(permissionContext)) === "auto" &&
      Ie &&
      Ie.consecutiveDenials > 0
    ) {
      let newDenialState = resetConsecutiveDenials(Ie);
      persistDenialState(permissionContext, newDenialState);
    }
    return checkResult;
  }
  if (checkResult.behavior === "ask") {
    let appState = permissionContext.getAppState(),
      Ie = getToolPermissionContext(permissionContext),
      Me = isAutoAllowedInMode(tool, Ie),
      We = Kjr(permissionContext.hookAskFloor === !0, checkResult),
      ze = getToolNameForPermissionCheck_4(tool),
      lt = isChromeToolName(ze),
      Je = checkResult.metadata?.command?.chrome,
      nt =
        S2e(tool, Ie) &&
        (Je?.domainAllowed === !0 ||
          Je?.hostHandlesOriginConsent === !0 ||
          toolAlwaysAllowedRule(Ie, tool) !== null),
      pt =
        isChromeClassifierFloorTool(tool, Ie) &&
        Ie.canAutoClassifierRun === !1 &&
        !isAutoClassifierActive(Me, Ie.servedCall === !0) &&
        Je?.domainAllowed === !0 &&
        Je.grantRule !== void 0 &&
        Je.navigation === void 0 &&
        D4t() &&
        Ie.mode !== "plan" &&
        !We &&
        !carriesAskRuleIntent(checkResult) &&
        findSafetyCheckReason(checkResult.decisionReason) === void 0 &&
        tool.mcpInfo?.effectiveMaxPermission !== "ask" &&
        isBrowserToolAutoAllowed(tool, input) &&
        !Zqe(Ie, ze, input);
    if (Me === "dontAsk" && !nt) {
      let yt = !1;
      if (toolMaySettleUnaskedQuestion(tool, checkResult, permissionContext))
        try {
          yt =
            tool.requiresUserInteraction?.() !== !0 &&
            findApplicableAllowRule(tool, input, permissionContext, Me, ke) !== null;
        } catch (error) {
          if (!isAbortError(error)) logError(error);
        }
      return {
        behavior: "deny",
        decisionReason: { type: "mode", mode: "dontAsk", ...(yt && { ask: refusedAskOf(checkResult) }) },
        message: DONT_ASK_REJECT_MESSAGE(tool.name),
      };
    }
    if (isAutoClassifierActive(Me, Ie.servedCall === !0) || nt || pt) {
      if (iwt(tool.name, appState.proactivityLevel)) {
        if (Ie.shouldAvoidPermissionPrompts) return denyPromptUnavailable(checkResult);
        return checkResult;
      }
      let yt = { mode: Me, autoActive: isAutoModeActive() },
        gt = isChainOnAllowActive(),
        At = _M(tool);
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
        checkResult.refusal === void 0 &&
        Ie.shouldAvoidPermissionPrompts &&
        At?.onBlock !== "flag"
      )
        return denyPromptUnavailable(checkResult);
      let It = (Ks) => {
          if (Ks.decisionReason.type === "classifier" && Or)
            rememberCommandNetworkLists(toolUseID, tool, input);
          let { classifierRan: classifierRan, ...Yd } = Ks,
            xc =
              Yd.decisionReason.type === "classifier" &&
              Yd.decisionReason.noVerdict !== !0 &&
              classifierRan !== !1
                ? { ...Yd, decisionReason: { ...Yd.decisionReason, classifierAllowed: !0 } }
                : Yd;
          if (At?.onBlock === "flag") return { behavior: "allow", ...xc };
          if (gt)
            return {
              ...checkResult,
              ...Yd,
              decisionReason: pickDisplayedDecisionReason(checkResult, Yd.decisionReason),
            };
          if (We) {
            if (Me === "dontAsk")
              return {
                behavior: "deny",
                decisionReason: { type: "mode", mode: "dontAsk" },
                message: DONT_ASK_REJECT_MESSAGE(tool.name),
              };
            return { ...checkResult, updatedInput: Ks.updatedInput };
          }
          return { behavior: "allow", ...xc };
        },
        Yt = (Ks, kl) => {
          if (!iwt(tool.name, permissionContext.getAppState().proactivityLevel)) return;
          if (
            (logEvent("tengu_auto_mode_fallback_to_ask", {
              ...kl,
              reason: fromEnum(Ks),
              toolName: sanitizeToolNameForAnalytics(tool.name),
              toolUseId: ye(toolUseID),
              isMcp: tool.isMcp ?? !1,
              ...q(),
            }),
            getToolPermissionContext(permissionContext).shouldAvoidPermissionPrompts)
          )
            return denyPromptUnavailable(checkResult);
          return checkResult;
        },
        qt = findSafetyCheckReason(
          checkResult.decisionReason,
          (Ks) =>
            !Ks.classifierApprovable &&
            !(
              isClassifierRoutedCircuitBreaker(Ks) &&
              !carriesPersonsAsk(Ks) &&
              isAutoModePermissionSurface(Ie)
            ),
        ),
        Zt =
          findSafetyCheckReason(checkResult.decisionReason, isLocalProjectionOnlyCircuitBreaker) !== void 0,
        rn = checkResult.decisionReason?.type === "sandboxOverride",
        pn = isSandboxOverrideUnderReadBlock(checkResult.decisionReason, Ie),
        no = carriesAskRuleIntent(checkResult),
        hn =
          isServerPolicyAskReason(checkResult.decisionReason) ||
          checkResult.matchedAskRule?.source === "mcpServerPolicy",
        ho = isDestructiveMcpAskOverride(hn, tool, input, Me, permissionContext),
        yn = no && !gt && !(hn && (!(tool.isDestructive?.(input) ?? !1) || ho)),
        Kn = tool.mcpInfo?.effectiveMaxPermission === "ask",
        Xn =
          (isPlanModeFloorReason(checkResult.decisionReason) &&
            !isReadOnlyBrowserCall(getToolNameForPermissionCheck_4(tool), input)) ||
          (!gt &&
            !We &&
            isServerPolicyAskUnderPlanFloor(checkResult.decisionReason, tool, input, permissionContext)),
        fo = findSafetyCheckReason(checkResult.decisionReason, isAutoModeDenyCircuitBreaker),
        To = fo !== void 0 && isAutoModePermissionSurface(Ie) && !no ? getDangerousRmTimeoutConfig() : void 0;
      if (fo !== void 0 && To?.enabled) {
        let Ks = applySafetyCheckDialogPolicy(checkResult, fo, permissionContext, To);
        if (Ks.behavior === "ask")
          return (
            logEvent("tengu_auto_mode_fallback_to_ask", {
              reason: lit_2("safety_check"),
              toolName: sanitizeToolNameForAnalytics(tool.name),
              toolUseId: ye(toolUseID),
              isMcp: tool.isMcp ?? !1,
              ...q(),
            }),
            Ks
          );
        return (
          BH(permissionContext.session, {
            tool: tool.name,
            allowlisted: !1,
            decision: "blocked",
            fastPath: "hardcodedDeny",
            durationMs: 0,
            originalDecisionReasonType: "safetyCheck",
          }),
          logEvent("tengu_auto_mode_decision", {
            decision: lit_2("blocked"),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            toolUseId: ye(toolUseID),
            isMcp: tool.isMcp ?? !1,
            ...q(),
            inProtectedNamespace: isEvalBuild(),
            ...Se(),
            chromeAutomode: lt,
            mcpServerAskOverride: ho,
            agentMsgId: ye(assistantMessage.message.id),
            fromTurnHandoff: assistantMessage.handedOff === !0,
            fastPath: lit_2("hardcodedDeny"),
            originalDecisionReasonType: lit_2("safetyCheck"),
            circuitBreaker: fromEnumOpt(fo.circuitBreaker),
            hookAllowVouch: permissionContext.hookAllowVouched === !0,
            ...getDestructiveCommandAnalytics(tool.name, input),
          }),
          Ks
        );
      }
      if (qt || rn || yn || Kn || Xn) {
        if (Ie.shouldAvoidPermissionPrompts) return denyPromptUnavailable(checkResult);
        if (qt || pn || yn || Kn || Xn)
          return (
            logEvent("tengu_auto_mode_fallback_to_ask", {
              reason: lit_2(
                qt || pn ? "safety_check" : yn ? "ask_rule" : Xn ? "plan_mode_floor" : "org_ask_ceiling",
              ),
              toolName: sanitizeToolNameForAnalytics(tool.name),
              toolUseId: ye(toolUseID),
              isMcp: tool.isMcp ?? !1,
              ...q(),
            }),
            checkResult
          );
      }
      let bo =
        tool.name === ASKUSERQUESTION &&
        checkResult.behavior === "ask" &&
        !yse() &&
        shouldClassifyAskUserQuestion();
      if (!bo && tool.requiresUserInteraction?.() && checkResult.behavior === "ask")
        return (
          logEvent("tengu_auto_mode_fallback_to_ask", {
            reason: lit_2("requires_user_interaction"),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            toolUseId: ye(toolUseID),
            isMcp: tool.isMcp ?? !1,
            ...q(),
          }),
          checkResult
        );
      if (gkn.workflowNeedsUsageConsentPrompt(tool.name, permissionContext))
        return (
          logEvent("tengu_auto_mode_fallback_to_ask", {
            reason: lit_2("workflow_usage_consent"),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            toolUseId: ye(toolUseID),
            isMcp: tool.isMcp ?? !1,
            ...q(),
          }),
          checkResult
        );
      if (shouldShowOutsideReadPrompt(tool, input, checkResult, permissionContext))
        return (
          permissionContext.session.outsideReadPrompt.open(toolUseID),
          logEvent("tengu_auto_mode_fallback_to_ask", {
            reason: lit_2("outside_read_first_prompt"),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            toolUseId: ye(toolUseID),
            isMcp: tool.isMcp ?? !1,
            ...q(),
          }),
          { ...checkResult, offersBlockOutsideReads: !0 }
        );
      let vn =
          permissionContext.localDenialTracking ?? appState.denialTracking ?? createDenialTrackingState(),
        co = getAutoModeClassifierRole(Ie.mode),
        So = isAutoClassifierActive(Ie.mode),
        ko =
          co === "off" &&
          !Zt &&
          hasHeldServerVerdict(assistantMessage, toolUseID) &&
          isMcpReviewedOutsideAuto(tool, Ie),
        un = resolveServerClassifierRoleForCall(
          ko ? "arbiter" : co,
          assistantMessage,
          toolUseID,
          permissionContext,
        ),
        ao = sse(un),
        $o = permissionContext.clientRequestedToolUseId === toolUseID,
        yo = ao ? void 0 : sse(co) ? ($o ? "client_call" : "script_call") : Qqt(Ie.mode),
        Ho = Ie.servedCall === !0,
        rr = isAutoClassifierActive(Ie.mode, Ho)
          ? void 0
          : !isAutoClassifierActive(yt.mode, Ho)
            ? nt
              ? "chrome_rule_allowed"
              : void 0
            : typeof getMcpPermissionModeOverride(tool, Ie) === "string"
              ? "mcp_mode_override"
              : "floor";
      if (ao) logStrictTierUnavailable("server_arbiter");
      let br = At?.onBlock === "flag",
        Hr = isServerClassifierActive(Ie.mode, co, { handoffReview: br }),
        Fr = br ? isServerClassifierActive(Ie.mode, co) : Hr,
        cs = isLocalClassifierSwitchedOff({ handoffReview: br }),
        _r = br ? isLocalClassifierSwitchedOff() : cs,
        Cr =
          checkResult.decisionReason?.type === "other" &&
          checkResult.decisionReason.reason === SERVER_HOLDS_SHELL_ALLOW_REASON
            ? checkResult.decisionReason
            : void 0,
        Vr = Cr !== void 0,
        Oo =
          checkResult.decisionReason?.type === "other" &&
          checkResult.decisionReason.reason === TOOL_HOST_ALLOW_IS_CLASSIFIED_REASON,
        jr = Cr?.reroutedFrom,
        Or = areCommandNetworkListsOffered(),
        Io,
        zo =
          assistantMessage.serverClassifierInputRewrite?.keptVerdict === !0 &&
          (involvesSafetyCheck(checkResult.decisionReason) ||
            (swt(tool.name) &&
              (AWt(getMainLoopModel_2(permissionContext)) ||
                shouldClassifyEdits(getMainLoopModel_2(permissionContext)) ||
                shouldClassifyEdits(assistantMessage.message.model)))),
        rs = new enqueuePermissionCheckStatus(toolUseID, permissionContext.agentId),
        Es,
        Nr,
        Is = () => {
          if (Io === void 0) {
            let now = Date.now();
            Io = awaitServerVerdict(assistantMessage, toolUseID, !zo).then(
              (kl) => ((Es = Date.now() - now), (Nr = kl), kl),
            );
          }
          return Io;
        },
        fs = () => {
          let Ks = Is();
          if (Es === void 0) {
            let hold = rs.hold();
            Ks.then(hold, hold);
          }
          return Ks;
        },
        as = (Ks) => {
          let kl = shouldFallBackToLocal(un, Ks, toolUseID, { outsideAutoMode: ko });
          if (kl && un === "arbiter" && !ko && !Fr && !isThirdPartyServerClassifierRefused())
            (markThirdPartyServerClassifierRefused(),
              logEvent("tengu_server_classifier_no_result_latched", {
                isSubagent: permissionContext.agentId !== void 0,
                reason: fromEnum(Ks.kind === "none" ? Ks.why : "other"),
              }),
              logForDebugging(
                Ks.kind === "none" && Ks.why === "server_unsupported"
                  ? "[server-classifier] the API answered that it does not run the server-side classifier for this session (unsupported), so auto mode classifies locally for the rest of this session"
                  : "[server-classifier] a completed response carried no classification result (no safeguard_results); assuming something on the path to the API dropped it, so auto mode classifies locally for the rest of this session",
                { level: "warn" },
              ));
          if (!kl || !Hr) return kl;
          if (isServerClassifierUnsupported(Ks) || isThirdPartyServerClassifierRefused()) return !0;
          let Yd = qb(Ks, toolUseID);
          return Yd !== "server_input_rewritten" && !isServerUnavailableReason(Yd, Ks.kind === "per_call");
        },
        Vi = !ao && !0 && swt(tool.name) && AWt(getMainLoopModel_2(permissionContext)),
        ji = async () => {
          if (!ao || !(swt(tool.name) || Vr)) return !1;
          let Ks = await fs(),
            kl = qb(Ks, toolUseID);
          if (kl === "server_input_rewritten") return !0;
          if (as(Ks)) return !Vr && AWt(getMainLoopModel_2(permissionContext));
          if (Vr && eze(kl)) return !1;
          let Yd = Vjr(assistantMessage.handedOffLive);
          if (kl === "server_not_requested" && Yd?.size === 1 && Yd.has(toolUseID) && M6t())
            return (
              AWt(getMainLoopModel_2(permissionContext)) ||
              shouldClassifyEdits(assistantMessage.message.model)
            );
          return kl !== "server_call_skipped";
        },
        Wi = toolAlwaysAllowedRule(Ie, tool),
        ii = getMcpRuleClassifierRoute(Wi, tool, input, Me, permissionContext, () => un),
        wa = ii === "serverPolicy" || ii === "shadowedServerPolicy",
        hr = ii === "shadowedServerPolicy" ? fromEnumOpt(Wi?.source) : void 0,
        mi = ii === "remoteSession",
        Ha = isCoworkWebAllowOverride(Wi, tool, input, permissionContext),
        $a = Wi !== null && t2e(getComputerUseChecksSetting(), Ie, tool, input, Me),
        nr = classifyBrowserAction(ze, input),
        Ti = $a && checkResult.decisionReason === void 0 && ii === void 0,
        Vs = nr === void 0 ? void 0 : measureActionSummaries(ze, tool.inputJSONSchema, input),
        _i =
          nr === void 0
            ? {}
            : {
                computerUseTool: !0,
                computerUseActionKind: fromEnum(nr),
                computerUseRouted: Ti,
                computerUseActionSummaryLength: Vs !== void 0 && "length" in Vs ? Vs.length : void 0,
                computerUseActionSummaryExpectedItems:
                  Vs !== void 0 && "filledItems" in Vs ? Vs.expectedItems : void 0,
                computerUseActionSummaryFilledItems:
                  Vs !== void 0 && "filledItems" in Vs ? Vs.filledItems : void 0,
              },
        jo = Me === "plan" && !Vr,
        Qr = [],
        fi = !1,
        Ri = lt ? Je?.navigation : void 0;
      if (Ri) qSn(toolUseID, Ri.from, Ri.to);
      let Ja = lt && hasBrowserWriteAction(ze, input),
        Di = lt ? countBatchActionSummaries(ze, tool.inputJSONSchema, input) : void 0,
        yr = {
          chromeActionSummaryLength: lt ? getActionSummaryLength(ze, tool.inputJSONSchema, input) : void 0,
          chromeActionSummaryExpectedItems: Di?.expectedItems,
          chromeActionSummaryFilledItems: Di?.filledItems,
        },
        Kr = lt && Zqe(Ie, ze, input),
        Li = Ri !== void 0 || Kr,
        Qs = findSafetyCheckReason(checkResult.decisionReason) !== void 0;
      if (
        !Li &&
        !$a &&
        !pt &&
        !Qye(tool.name) &&
        At === void 0 &&
        !Zt &&
        tool.sandboxNetworkLists?.(input) === void 0 &&
        !rn &&
        !Vi &&
        !Qs &&
        !jo &&
        !(lt && getFeatureValue_CACHED_MAY_BE_STALE("tengu_radiant_hare", !1))
      )
        try {
          let parsedInput = tool.inputSchema.parse(input),
            kl = (oc) => {
              let hp = permissionRuleValueFromString(oc);
              return !isDangerousClassifierPermission(hp.toolName, hp.ruleContent);
            },
            Yd = xr(Ie.alwaysAllowRules, (oc) => (oc ?? []).filter(kl)),
            xc = permissionContext.permissionLayers?.map((oc) =>
              oc.kind === "allowed_tools" ? { ...oc, allowedTools: oc.allowedTools.filter(kl) } : oc,
            ),
            Ip = (oc) =>
              tool.checkPermissions(parsedInput, {
                ...permissionContext,
                toolUseId: void 0,
                permissionLayers: xc,
                getAppState: () => {
                  let state = permissionContext.getAppState(),
                    Pg = {
                      ...state.toolPermissionContext,
                      mode: "acceptEdits",
                      modeBeforeRewrite: Ie.modeBeforeRewrite ?? Ie.mode,
                      alwaysAllowRules: Yd,
                    };
                  return {
                    ...state,
                    toolPermissionContext: oc.length
                      ? addAdditionalWorkingDirectories(Pg, oc, "session")
                      : Pg,
                  };
                },
              }),
            Gc =
              ao &&
              jr === "readOnly" &&
              getRegisteredCheck(permissionContext.session, tool.name) !== void 0 &&
              qb(await fs(), toolUseID) === "server_call_skipped"
                ? { behavior: "allow" }
                : await Ip([]);
          if (
            Gc.behavior === "ask" &&
            Gc.decisionReason?.type === "workingDir" &&
            isLinkedWorktreeFastPathEnabled() &&
            !isBrowserToolAutoAllowed(tool, input)
          ) {
            if (
              ((Qr = await verifiedLinkedWorktreeDirectories(
                permissionContext.getAppState().toolPermissionContext,
              )),
              Qr.length > 0)
            )
              Gc = await Ip(Qr);
          }
          if (((fi = Gc.behavior === "allow" && (await ji())), Gc.behavior === "allow" && !fi)) {
            let oc = ao ? await fs() : void 0;
            if (ao) {
              let Sc = isAutoAllowedInMode(tool, getToolPermissionContext(permissionContext));
              if (
                !(Sc === yt.mode && isAutoModeActive() === yt.autoActive) &&
                !isStillAllowedAfterModeChange(Sc, nt, tool, input, permissionContext)
              ) {
                if (
                  (logEvent("tengu_auto_mode_fallback_to_ask", {
                    reason: lit_2("mode_changed_while_queued"),
                    toolName: sanitizeToolNameForAnalytics(tool.name),
                    toolUseId: ye(toolUseID),
                    isMcp: tool.isMcp ?? !1,
                    ...q(),
                  }),
                  Sc === "dontAsk")
                )
                  return {
                    behavior: "deny",
                    decisionReason: { type: "mode", mode: "dontAsk" },
                    message: DONT_ASK_REJECT_MESSAGE(tool.name),
                  };
                if (getToolPermissionContext(permissionContext).shouldAvoidPermissionPrompts)
                  return denyPromptUnavailable(checkResult);
                return checkResult;
              }
            }
            let hp = Yt("ask_level_during_accept_edits_sim");
            if (hp) return hp;
            if (!OV(permissionContext.requestDialog !== void 0))
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
            if (
              (logEvent("tengu_auto_mode_decision", {
                decision: lit_2("allowed"),
                toolName: sanitizeToolNameForAnalytics(tool.name),
                toolUseId: ye(toolUseID),
                isMcp: tool.isMcp ?? !1,
                ...q(),
                inProtectedNamespace: isEvalBuild(),
                ...Se(),
                chromeAutomode: lt,
                mcpAlwaysAllowOverride: wa,
                mcpAlwaysAllowShadowedBy: hr,
                mcpRemoteSessionAllowOverride: mi,
                coworkWebAllowOverride: Ha,
                ..._i,
                mcpServerAskOverride: ho,
                agentMsgId: ye(assistantMessage.message.id),
                fromTurnHandoff: assistantMessage.handedOff === !0,
                confidence: lit_2("high"),
                fastPath: fromEnum(Pg),
                chromePointerPress: Ja,
                ...yr,
                serverHeldShellAllowFrom: fromEnumOpt(jr),
                hookAllowVouch: permissionContext.hookAllowVouched === !0,
                ...getDestructiveCommandAnalytics(tool.name, input),
                ...(oc !== void 0 && {
                  classifierSource: lit_2("server"),
                  serverClassifierNoVerdict: fromEnumOpt(qb(oc, toolUseID)),
                  classifierTotalWaitMs: Es,
                }),
              }),
              oc !== void 0)
            )
              BH(permissionContext.session, {
                tool: tool.name,
                allowlisted: !1,
                decision: "allowed",
                fastPath: Pg,
                serverHeldShellAllowFrom: jr,
                durationMs: 0,
                totalWaitMs: Es,
                classifierSource: "server",
                serverClassifierNoVerdict: qb(oc, toolUseID),
              });
            return It({
              updatedInput: (Cr ? checkResult.updatedInput : Gc.updatedInput) ?? input,
              decisionReason: Cr?.replaces ?? { type: "mode", mode: "auto" },
            });
          }
        } catch (error) {
          if (error instanceof AbortError_2 || error instanceof Lf) throw error;
          if (!isAbortError(error)) logError(error);
          logEvent("tengu_auto_mode_decision", {
            decision: lit_2("fastpath_error"),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            toolUseId: ye(toolUseID),
            isMcp: tool.isMcp ?? !1,
            ...q(),
            inProtectedNamespace: isEvalBuild(),
            ...Se(),
            chromeAutomode: lt,
            mcpAlwaysAllowOverride: wa,
            mcpAlwaysAllowShadowedBy: hr,
            mcpRemoteSessionAllowOverride: mi,
            coworkWebAllowOverride: Ha,
            ..._i,
            mcpServerAskOverride: ho,
            agentMsgId: ye(assistantMessage.message.id),
            fromTurnHandoff: assistantMessage.handedOff === !0,
            fastPath: Qr.length > 0 ? lit_2("acceptEditsLinkedWorktree") : lit_2("acceptEdits"),
            hookAllowVouch: permissionContext.hookAllowVouched === !0,
            error: sanitizeErrorName_2(error) ?? lit_2("unknown"),
            ...getDestructiveCommandAnalytics(tool.name, input),
          });
        }
      let Hi =
          At === void 0 &&
          !Zt &&
          (isBrowserToolAutoAllowed(tool, input) ||
            (tool.mcpInfo?.serverName === REMOTE_BROWSER_SERVER_NAME &&
              !no &&
              !hasAutoModeClassifierDenyRules() &&
              isRemoteBrowserReadWithoutClassifier(tool, input, Ie, Me))),
        Xa = Kr && Ri === void 0 && Hi;
      if (Xa) vfi(toolUseID);
      if (!Li && !$a && Hi) {
        if (!OV(permissionContext.requestDialog !== void 0))
          updateDenialTrackingState(permissionContext, resetConsecutiveDenials);
        return (
          logForDebugging(`Skipping auto mode classifier for ${tool.name}: tool is on the safe allowlist`),
          BH(permissionContext.session, {
            tool: tool.name,
            allowlisted: !0,
            decision: "allowed",
            durationMs: 0,
            ...(pt && { chromeGrantNoClassifier: !0 }),
          }),
          logEvent("tengu_auto_mode_decision", {
            decision: lit_2("allowed"),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            toolUseId: ye(toolUseID),
            isMcp: tool.isMcp ?? !1,
            ...q(),
            inProtectedNamespace: isEvalBuild(),
            ...Se(),
            chromeAutomode: lt,
            mcpAlwaysAllowOverride: wa,
            mcpAlwaysAllowShadowedBy: hr,
            mcpRemoteSessionAllowOverride: mi,
            coworkWebAllowOverride: Ha,
            ..._i,
            mcpServerAskOverride: ho,
            agentMsgId: ye(assistantMessage.message.id),
            fromTurnHandoff: assistantMessage.handedOff === !0,
            confidence: lit_2("high"),
            fastPath: lit_2("allowlist"),
            chromePointerPress: Ja,
            ...(pt && { chromeGrantNoClassifier: !0 }),
            ...yr,
            hookAllowVouch: permissionContext.hookAllowVouched === !0,
            ...getDestructiveCommandAnalytics(tool.name, input),
          }),
          It({
            updatedInput: checkResult.updatedInput ?? input,
            decisionReason:
              pt && !gt && Je?.grantRule !== void 0
                ? { type: "rule", rule: Je.grantRule }
                : { type: "mode", mode: "auto" },
          })
        );
      }
      if (pt)
        return (
          logEvent("tengu_auto_mode_fallback_to_ask", {
            reason: lit_2("chrome_grant_no_classifier"),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            toolUseId: ye(toolUseID),
            isMcp: tool.isMcp ?? !1,
            ...q(),
          }),
          resolveAskWithoutPrompt(answers, tool, input, checkResult, toolUseID, permissionContext)
        );
      let ta = () =>
          isAutoClassifierActive(Ie.mode) &&
          isAutoClassifierActive(Me) &&
          checkResult.checkIncomplete !== !0 &&
          Ri === void 0 &&
          tool.requiresUserInteraction?.() !== !0 &&
          At === void 0 &&
          !Zt &&
          !getToolNameForPermissionCheck(tool, input),
        Bs = !1,
        Ca = !1;
      if (
        permissionContext.desktopForwardToolUseId !== void 0 &&
        permissionContext.desktopForwardToolUseId === toolUseID &&
        ta() &&
        findSafetyCheckReason(checkResult.decisionReason) === void 0 &&
        !rn &&
        !scriptAsksToRunUnsandboxed(tool, input) &&
        checkResult.decisionReason?.type !== "workingDir" &&
        !(checkResult.blockedPath !== void 0 && checkResult.bashAllowRuleOverridable !== !0) &&
        !Qye(tool.name) &&
        !0
      ) {
        let Ks = Yt("ask_level_during_accept_edits_sim");
        if (Ks) return Ks;
        let kl = isAutoAllowedInMode(tool, getToolPermissionContext(permissionContext));
        if (kl !== yt.mode || isAutoModeActive() !== yt.autoActive) {
          if (
            (logEvent("tengu_auto_mode_fallback_to_ask", {
              reason: lit_2("mode_changed_while_queued"),
              toolName: sanitizeToolNameForAnalytics(tool.name),
              toolUseId: ye(toolUseID),
              isMcp: tool.isMcp ?? !1,
              ...q(),
            }),
            kl === "dontAsk")
          )
            return {
              behavior: "deny",
              decisionReason: { type: "mode", mode: "dontAsk" },
              message: DONT_ASK_REJECT_MESSAGE(tool.name),
            };
          if (getToolPermissionContext(permissionContext).shouldAvoidPermissionPrompts)
            return denyPromptUnavailable(checkResult);
          return checkResult;
        }
        if (!OV(permissionContext.requestDialog !== void 0))
          updateDenialTrackingState(permissionContext, resetConsecutiveDenials);
        let Yd = "desktop_forward";
        return (
          logForDebugging(
            `Skipping auto mode classifier for ${tool.name}: this is SendMessage's forward to Claude Desktop, and the classifier already allowed that SendMessage`,
          ),
          BH(permissionContext.session, {
            tool: tool.name,
            allowlisted: !1,
            decision: "allowed",
            fastPath: Yd,
            durationMs: 0,
          }),
          logEvent("tengu_auto_mode_decision", {
            decision: lit_2("allowed"),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            toolUseId: ye(toolUseID),
            isMcp: tool.isMcp ?? !1,
            ...q(),
            inProtectedNamespace: isEvalBuild(),
            ...Se(),
            chromeAutomode: lt,
            mcpAlwaysAllowOverride: wa,
            mcpAlwaysAllowShadowedBy: hr,
            mcpRemoteSessionAllowOverride: mi,
            coworkWebAllowOverride: Ha,
            ..._i,
            mcpServerAskOverride: ho,
            agentMsgId: ye(assistantMessage.message.id),
            fromTurnHandoff: assistantMessage.handedOff === !0,
            confidence: lit_2("high"),
            fastPath: fromEnum(Yd),
            chromePointerPress: Ja,
            ...yr,
            hookAllowVouch: permissionContext.hookAllowVouched === !0,
            ...getDestructiveCommandAnalytics(tool.name, input),
          }),
          It({
            updatedInput: checkResult.updatedInput ?? input,
            decisionReason: { type: "mode", mode: "auto" },
          })
        );
      }
      let tu = (Ks, kl) => (
          BH(permissionContext.session, {
            tool: tool.name,
            allowlisted: !1,
            decision: "allowed",
            fastPath: Ks,
            durationMs: 0,
          }),
          logEvent("tengu_auto_mode_decision", {
            decision: lit_2("allowed"),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            toolUseId: ye(toolUseID),
            isMcp: tool.isMcp ?? !1,
            inProtectedNamespace: isEvalBuild(),
            ...Se(),
            chromeAutomode: lt,
            mcpAlwaysAllowOverride: wa,
            mcpAlwaysAllowShadowedBy: hr,
            mcpRemoteSessionAllowOverride: mi,
            coworkWebAllowOverride: Ha,
            ..._i,
            mcpServerAskOverride: ho,
            agentMsgId: ye(assistantMessage.message.id),
            fromTurnHandoff: assistantMessage.handedOff === !0,
            fastPath: fromEnum(Ks),
            chromePointerPress: Ja,
            ...yr,
            hookAllowVouch: permissionContext.hookAllowVouched === !0,
            ...getDestructiveCommandAnalytics(tool.name, input),
          }),
          It({
            updatedInput: checkResult.updatedInput ?? input,
            decisionReason: { type: "other", reason: kl },
          })
        ),
        newDenialState = getHookCaller(permissionContext);
      if (
        newDenialState !== void 0 &&
        isAutoClassifierActive(Ie.mode) &&
        isAutoClassifierActive(Me) &&
        At === void 0 &&
        Ri === void 0 &&
        !hasAutoModeClassifierDenyRules() &&
        findSafetyCheckReason(checkResult.decisionReason, isClassifierRoutedCircuitBreaker) === void 0 &&
        !Zt &&
        !getToolNameForPermissionCheck(tool, input) &&
        !isWebToolRestrictedInRelay(tool.name) &&
        !RL(tool, Ie) &&
        !isRemoteBrowserToolUnderModeFloor(tool) &&
        !P9n(ze, Me, Ie)
      ) {
        if (
          (logForDebugging(
            `Skipping auto mode classifier for ${tool.name}: called by plugin ${newDenialState}`,
          ),
          bo)
        )
          return checkResult;
        if (Or) rememberCommandNetworkLists(toolUseID, tool, input);
        return tu("pluginOrigin", `plugin-origin: ${newDenialState}`);
      }
      if (
        permissionContext.synthesizedBy !== void 0 &&
        tool.name === AGENT &&
        isAutoClassifierActive(Ie.mode) &&
        isAutoClassifierActive(Me) &&
        At === void 0 &&
        !Li &&
        !Zt &&
        findSafetyCheckReason(checkResult.decisionReason, isClassifierRoutedCircuitBreaker) === void 0
      )
        return (
          logForDebugging(
            `Skipping auto mode classifier for ${tool.name}: synthesized by ${permissionContext.synthesizedBy}`,
          ),
          tu("harnessSynthesized", `harness-synthesized: ${permissionContext.synthesizedBy}`)
        );
      let ga = permissionContext.sameTurnToolUses ?? [],
        newDenialState_2 = isModelDrivenSession(permissionContext.agentId),
        { messages: messages, inheritedPrefix: inheritedPrefix } = prependInheritedVerifiedTurns(
          permissionContext.messages,
          permissionContext.inheritedVerifiedHumanTurns,
          newDenialState_2,
        ),
        Ld = formatActionForClassifier(tool.name, input, toolUseID);
      markClassifierChecking(w, toolUseID);
      let vs,
        ol = !1,
        gd = !1,
        Su = !1,
        Eu,
        Uc,
        Kc;
      using _s = new CommitTurnSlot();
      let Qm = startClassifierKeepalive(),
        hold = rs.hold();
      try {
        let Ks = ga.length > 0 ? [...messages, ...ga] : messages,
          kl = pinSessionId(getSessionId()),
          Yd = (Sc) =>
            classifyYoloAction(
              Ks,
              Ld,
              permissionContext.options.tools,
              getToolPermissionContext(permissionContext),
              permissionContext.abortController.signal,
              {
                localClassifierSite: "gate",
                judgesHandback: br,
                isSubagentLoop: newDenialState_2,
                inheritedPrefix: inheritedPrefix,
                recordPresumed: permissionContext.agentId === void 0,
                severityEligible: !0,
                artifactConsentArm: "enroll",
                storageV5: permissionContext.storageV5,
                credentials: permissionContext.credentials,
                mcpClients: currentMcpClients(permissionContext),
                agentId: permissionContext.agentId,
                sessionId: kl,
                queueProgress: Sc,
              },
            ),
          xc = async () => {
            let Sc = classifyServerVerdict(await fs(), toolUseID, () =>
              collectToolUseIdSet(Ld, permissionContext.options.tools),
            );
            if (!Sc.shouldBlock && isServerContextStaleCheckEnabled()) {
              let Hu = tool.staleServerClassifierContext?.(
                input,
                assistantMessage.serverClassifierResults?.sentArtifacts,
                permissionContext,
              );
              if (Hu !== void 0)
                return (
                  (Uc = Hu),
                  logForDebugging(
                    `[server-classifier] ${tool.name}: what the request told the server of the artifact's ${Hu.phrase} was missing or no longer holds (${Hu.cause.kind}); the server's allow is void`,
                  ),
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
                  }),
                  {
                    model: Sc.model,
                    durationMs: 0,
                    shouldBlock: !0,
                    unavailable: !0,
                    errorKind: SERVER_CONTEXT_STALE,
                    reason: "Classifier verdict out of date - blocking for a retry",
                  }
                );
            }
            return Sc;
          },
          Ip = async (Sc) => {
            let Hu = await xc();
            if (Hu.shouldBlock && aKt(Hu.errorKind) && countToolCallsSince_6(assistantMessage, toolUseID)) {
              ((gd = !0),
                logForDebugging(
                  `[server-classifier] ${tool.name}: after the server reviewed the response a hook rewrote this call's input, or that of a call before it; the local classifier judges this one call`,
                ));
              let dy = await Yd(Sc);
              if (dy.errorKind === CLASSIFIER_SWITCHED_OFF_KIND) {
                if (((Su = !0), At?.onBlock === "flag")) return dy;
              }
              return isClassifierVerdictUsable(dy) ? dy : { ...Hu, shouldBlock: !0, unavailable: !0 };
            }
            if (!Hr && Hu.errorKind === "server_not_requested" && getToolNameForPermissionCheck(tool, input))
              return ((Eu = "hosted_desktop_not_requested"), Yd(Sc));
            if (
              !Zt ||
              (Hu.shouldBlock &&
                (!eze(Hu.errorKind) ||
                  (Hu.errorKind === "server_input_rewritten" && getServerClassifierFallbackMode() !== "off")))
            )
              return Hu;
            return ((Eu = "projection_only"), Yd(Sc));
          },
          Gc = async () => {
            if (!isThirdPartyServerClassifierRefused()) return !1;
            if ((await awaitClassifierBillingFallbackNotice(permissionContext)) === "interrupt") {
              if (!permissionContext.abortController.signal.aborted)
                turnAbortControllerOf(permissionContext.abortController).abort();
              return !0;
            }
            return !1;
          },
          oc = ao
            ? async (Sc) => {
                let Hu = await fs(),
                  dy = !1;
                if (as(Hu))
                  return (
                    (ol = !0),
                    logForDebugging(
                      `[server-classifier] ${tool.name}: no server verdict for this call (${qb(Hu, toolUseID)}); the local classifier decides it`,
                    ),
                    (await Gc()) ? CLASSIFIER_BILLING_CANCELLED_RESULT : Yd(Sc)
                  );
                return Ip(Sc);
              }
            : Yd,
          hp = async (Sc) => ((await Gc()) ? CLASSIFIER_BILLING_CANCELLED_RESULT : oc(Sc)),
          Pg = async (Sc) => {
            let Hu = ao ? await fs() : void 0;
            if (Hu !== void 0 && !as(Hu)) return Ip(Sc);
            return (
              collectToolUseIdSet(Ld, permissionContext.options.tools) ?? NO_CLASSIFIER_FOR_SESSION_RESULT
            );
          };
        vs = await o3n(
          permissionContext.agentId ?? "main",
          Hr ? Pg : hp,
          (Sc) => {
            ((Kc = Sc), Qm.restartDeadline());
          },
          { commitTurn: _s },
        );
      } finally {
        (Qm(), hold(), clearClassifierChecking(w, toolUseID));
      }
      if (vs === CLASSIFIER_BILLING_CANCELLED_RESULT)
        return {
          behavior: "deny",
          message: REJECT_MESSAGE,
          decisionReason: { type: "other", reason: CANCELLED_AT_CLASSIFIER_NOTICE_REASON },
        };
      if (vs === NO_CLASSIFIER_FOR_SESSION_RESULT && $o)
        return {
          behavior: "deny",
          decisionReason: {
            type: "classifier",
            classifier: "auto-mode",
            reason: CLASSIFIER_UNAVAILABLE_REASON,
          },
          message: `${tool.name} was not run: auto mode's safety check cannot judge a call that a client asked for in this session. This is not a judgment that it is unsafe. Another permission mode can run it.`,
        };
      if (vs === NO_CLASSIFIER_FOR_SESSION_RESULT) {
        let Ks = ao ? await fs() : void 0,
          kl = cs && yo === "script_call",
          Yd = kl
            ? "server_not_requested"
            : Ks === void 0 || isServerClassifierUnsupported(Ks) || isThirdPartyServerClassifierRefused()
              ? void 0
              : qb(Ks, toolUseID),
          xc = Ks === void 0 ? yo : isServerClassifierUnsupported(Ks) ? Ks.why : "refused_latch",
          Ip =
            xc === "user_switch_off" ||
            (xc === "third_party_switch_off" && getUserServerClassifierSwitch() === !1),
          newDenialState = getToolPermissionContext(permissionContext),
          oc =
            !permissionContext.options.isNonInteractiveSession &&
            !gt &&
            !newDenialState.shouldAvoidPermissionPrompts &&
            !isUnattendedInteractiveSession(),
          hp = oc && hasCustomAutoModeDenyRules(),
          Pg = oc && !hp;
        if (
          Yd === void 0 &&
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
            gatewayConfigured: ntt() !== void 0,
            interactive: oc,
            heldByDenyRules: hp,
            ...(cs && { localClassifierSwitchedOff: !0 }),
          });
        if (Yd === void 0) appendAutoModeWarning(permissionContext, Pg, hp);
        if (
          (logForDebugging(
            Yd === void 0
              ? `[server-classifier] ${tool.name}: the server-side classifier does not run for this session (${xc ?? "unknown"}) and there is no local one to fall back to`
              : `[server-classifier] ${tool.name}: no server verdict for this call (${Yd}) and there is no local classifier to fall back to`,
            { level: "warn" },
          ),
          At?.onBlock === "flag")
        )
          return (
            s_e(toolUseID, cs ? { kind: "refused", switchedOff: !0 } : { kind: "unavailable", model: "" }),
            {
              behavior: "allow",
              updatedInput: checkResult.updatedInput ?? input,
              decisionReason: {
                type: "classifier",
                classifier: "auto-mode",
                reason: cs
                  ? UNREVIEWED_SUBAGENT_REPORT_WARNING
                  : "Delivered with a note: the classifier could not review it",
                noVerdict: !0,
              },
            }
          );
        if (isAutoAllowedInMode(tool, newDenialState) === "dontAsk")
          return {
            behavior: "deny",
            decisionReason: { type: "mode", mode: "dontAsk" },
            message: DONT_ASK_REJECT_MESSAGE(tool.name),
          };
        if (bo)
          return (
            logEvent("tengu_auto_mode_fallback_to_ask", {
              reason: lit_2("requires_user_interaction"),
              toolName: sanitizeToolNameForAnalytics(tool.name),
              toolUseId: ye(toolUseID),
              isMcp: tool.isMcp ?? !1,
              ...q(),
            }),
            checkResult
          );
        if (Pg && At === void 0)
          return (
            logEvent("tengu_auto_mode_fallback_to_ask", {
              reason: lit_2(Yd === void 0 ? "no_classifier_for_session" : "no_classifier_for_call"),
              toolName: sanitizeToolNameForAnalytics(tool.name),
              toolUseId: ye(toolUseID),
              isMcp: tool.isMcp ?? !1,
              ...q(),
            }),
            {
              ...checkResult,
              personOnly: !0,
              hooksMayAllow: !1,
              defaultToNo: !0,
              suppressAlwaysAllowRule: !0,
              inPlaceOfClassifier: !0,
              localDisplayOnly: !0,
              suggestions: void 0,
              decisionReason: pickDisplayedDecisionReason(checkResult, {
                type: "other",
                reason: Yd === void 0 ? NO_CHECK_FOR_SESSION_TITLE : NO_CHECK_FOR_ACTION_TITLE,
              }),
            }
          );
        let Sc = await handleServerVerdictUnavailable(
          assistantMessage.serverClassifierRequest ?? assistantMessage.message.id,
          {
            runKey: jz(permissionContext.agentId),
            turn: permissionContext.queryTracking?.chainId,
            signal: permissionContext.abortController.signal,
            scheduleTimeout: (dy) => (dy(), () => {}),
          },
        );
        if (Sc.kind === "stop") {
          if (
            Yd !== void 0 &&
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
                gatewayConfigured: ntt() !== void 0,
                interactive: oc,
                heldByDenyRules: hp,
                ...(cs && { localClassifierSwitchedOff: !0 }),
              },
            );
          appendAutoModeWarning(permissionContext, Pg, hp);
          let dy = Yd === void 0 ? "no_classifier_for_session" : "no_classifier_for_call";
          if (permissionContext.agentId === void 0) noteNoServerCheckStoppedTurn();
          else {
            let of = jjr.of(permissionContext.session.host);
            if (of.has(permissionContext.agentId)) of.set(permissionContext.agentId, dy);
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
            At !== void 0
              ? `${tool.name} was not run: only auto mode's safety check can allow it, and that check gave no result. No permission prompt is raised for this tool. This is not a judgment that the action is unsafe. Continue with work that doesn't need it, then tell the user that it was not run and why.`
              : hp
                ? `${tool.name} was not run: auto mode's safety check ${Yd === void 0 ? "does not run for this session" : "gave no result"}, and nobody is asked to approve it in its place, because the settings hold auto mode deny rules, which only the automatic check applies. This is not a judgment that the action is unsafe. ${Yd === void 0 ? "Other actions that need the check will be denied too, and retrying won't help. Finish what you can without them, then tell the user what is blocked and why." : `${Hu} then tell the user that it was not run and why.`}`
                : Yd === void 0
                  ? `Auto mode is unavailable: its safety check does not run for this session, so ${tool.name} was not run. Other actions that need the check will be denied too, and retrying won't help. Finish what you can without them, then tell the user what is blocked and that they can switch to another permission mode.`
                  : `${tool.name} was not run: auto mode has no safety result for this call, and nobody can be asked to approve it here. This is not a judgment that it is unsafe. ${Hu} then tell the user that auto mode has no safety result for it and that they can approve it themselves in another permission mode.`,
        };
      }
      vs = { ...vs, reason: classifierWrittenReason(vs.reason) };
      let li = ao && !ol && !gd && Eu === void 0 ? "server" : "local",
        nl = Su || vs.errorKind === CLASSIFIER_SWITCHED_OFF_KIND,
        Tl = {
          serverClassifierRole: fromEnum(un),
          serverClassifierOffReason: fromEnumOpt(yo),
          classifiedOutsideAutoMode: fromEnumOpt(rr),
          classifierSite: li === "local" && vs.classifierRan !== !1 && !nl ? lit_2("gate") : void 0,
          localUnderArbiterReason: fromEnumOpt(gd ? "input_rewritten" : ol ? "left_to_local" : Eu),
          serverClassifierConnection: fromEnumOpt(getApiRouteKind()),
          betasSwitchSetAside: isBetasSwitchSetAside({ peek: !0 }) || void 0,
        };
      if (ol && !vs.unavailable && !vs.transcriptTooLong && !vs.refusedBySafeguard)
        eye(jz(permissionContext.agentId));
      let kd,
        na =
          vs.unavailable === !0 &&
          vs.errorKind === "server_input_rewritten" &&
          countToolCallsSince_6(assistantMessage, toolUseID) &&
          getServerClassifierFallbackMode() !== "off",
        Ac =
          na &&
          (assistantMessage.serverClassifierOwnInputRewritten === !0 ||
            assistantMessage.serverClassifierInputRewrite !== void 0)
            ? quoteToolInputForClassifierMessage(tool, input, assistantMessage[Xno])
            : void 0,
        tp = assistantMessage.serverClassifierInputRewrite?.cause === "turn_step",
        Yh = Ac !== void 0 && Ac.kind !== "quoted" && !tp,
        Ef = isCountedClassifierBlock(vs) || na ? _s.reached() : void 0;
      if (Ef !== void 0) {
        let now = Date.now();
        (await Ef, (kd = Date.now() - now));
      }
      {
        if (
          ((Me = isAutoAllowedInMode(tool, getToolPermissionContext(permissionContext))),
          !(Me === yt.mode && isAutoModeActive() === yt.autoActive) &&
            !isStillAllowedAfterModeChange(Me, nt, tool, input, permissionContext))
        ) {
          if (
            (logEvent("tengu_auto_mode_fallback_to_ask", {
              reason: lit_2("mode_changed_while_queued"),
              toolName: sanitizeToolNameForAnalytics(tool.name),
              toolUseId: ye(toolUseID),
              isMcp: tool.isMcp ?? !1,
              ...q(),
              ...Tl,
            }),
            Me === "dontAsk")
          )
            return {
              behavior: "deny",
              decisionReason: { type: "mode", mode: "dontAsk" },
              message: DONT_ASK_REJECT_MESSAGE(tool.name),
            };
          if (getToolPermissionContext(permissionContext).shouldAvoidPermissionPrompts)
            return denyPromptUnavailable(checkResult);
          return checkResult;
        }
        let kl = Yt("ask_level_while_queued", Tl);
        if (kl) return kl;
      }
      let np = vs.unavailable
          ? "unavailable"
          : vs.refusedBySafeguard
            ? "refused"
            : vs.shouldBlock
              ? "blocked"
              : "allowed",
        newDenialState_3 = fallbackUsageDelta(vs),
        ap = (Es ?? 0) + (Kc?.queueWaitMs ?? 0) + (vs.durationMs ?? 0) + (kd ?? 0),
        al =
          vs.errorKind === "server_call_skipped" && Gqt(assistantMessage.serverClassifierResults, tool.name),
        mf = ao && Nr !== void 0 ? getRewriteLostVerdictNote(assistantMessage, qb(Nr, toolUseID)) : void 0;
      BH(permissionContext.session, {
        tool: tool.name,
        allowlisted: !1,
        decision: np,
        classifierModel: vs.model,
        inputTokens: vs.usage?.inputTokens,
        outputTokens: vs.usage?.outputTokens,
        cacheReadInputTokens: vs.usage?.cacheReadInputTokens,
        cacheCreationInputTokens: vs.usage?.cacheCreationInputTokens,
        durationMs: vs.durationMs,
        costUSD: newDenialState_3,
        stage: vs.stage,
        category: vs.category,
        stage1Severity: vs.stage1Severity,
        stage2Severity: vs.stage2Severity,
        originalDecisionReasonType: checkResult.decisionReason?.type,
        editClassificationGated: Vi,
        serverVerdictOverrodeFastPath: fi,
        serverHeldShellAllowFrom: jr,
        classifierSource: li,
        ...Tl,
        serverClassifierNoVerdict: ao ? (qb(await fs(), toolUseID) ?? getStaleContextErrorKind(vs)) : void 0,
        totalWaitMs: ap,
      });
      let rg =
          At?.onBlock === "flag"
            ? getClassifierBlockOutcome(
                _r && vs.errorKind === "server_input_rewritten"
                  ? { ...vs, errorKind: CLASSIFIER_SWITCHED_OFF_KIND }
                  : vs,
              )
            : void 0,
        uh = (Ks) =>
          shouldPromptAfterChromeFloorBlock({
            siteGrantRouted: nt && Je?.domainAllowed === !0,
            mode: Me,
            liveContext: getToolPermissionContext(permissionContext),
            chainOnAllow: gt,
            classifierResult: Ks,
          }),
        Kf =
          (vs.shouldBlock &&
            !vs.unavailable &&
            vs.errorKind !== SAFETY_MONITOR_BLOCKED &&
            !vs.transcriptTooLong &&
            !vs.refusedBySafeguard &&
            rg === void 0 &&
            !uh(vs)) ||
          (na && rg === void 0 && !bo && vn.lastRewriteMessageId !== assistantMessage.message.id),
        ch =
          vs.shouldBlock &&
          !na &&
          isClassifierTargetToolUse(assistantMessage, toolUseID, permissionContext.clientRequestedToolUseId),
        uS =
          ch && Kf
            ? vn.consecutiveDenials - undoRewriteDenialIfRetried(vn, tool.name, input).consecutiveDenials
            : 0;
      if (
        (logEvent("tengu_auto_mode_decision", {
          decision: fromEnum(np),
          toolName: sanitizeToolNameForAnalytics(tool.name),
          toolUseId: ye(toolUseID),
          ...!1,
          isMcp: tool.isMcp ?? !1,
          ...q(),
          inProtectedNamespace: isEvalBuild(),
          ...Se(),
          chromeAutomode: lt,
          chromeNavigationForced: Ri !== void 0,
          chromePointerPress: Ja,
          chromeClickRouted: Xa,
          ...yr,
          hookAllowVouch: permissionContext.hookAllowVouched === !0,
          mcpAlwaysAllowOverride: wa,
          mcpAlwaysAllowShadowedBy: hr,
          mcpRemoteSessionAllowOverride: mi,
          coworkWebAllowOverride: Ha,
          ..._i,
          mcpServerAskOverride: ho,
          ...getDestructiveCommandAnalytics(tool.name, input),
          stripAllBashFlag: PPe(),
          originalDecisionReasonType: fromEnumOpt(checkResult.decisionReason?.type),
          circuitBreaker: fromEnumOpt(
            findSafetyCheckReason(checkResult.decisionReason, (Ks) => Ks.circuitBreaker !== void 0)
              ?.circuitBreaker,
          ),
          editClassificationGated: Vi,
          serverVerdictOverrodeFastPath: fi,
          serverHeldShellAllowFrom: fromEnumOpt(jr),
          agentMsgId: ye(assistantMessage.message.id),
          fromTurnHandoff: assistantMessage.handedOff === !0,
          sameTurnSiblings: ga.length,
          inheritedVerifiedTurns: inheritedPrefix,
          classifierQueueDepth: Kc?.queueDepth,
          classifierQueueWaitMs: Kc?.queueWaitMs,
          ...(Kc?.overlap !== void 0 && {
            classifierQueueOverlapEnabled: !0,
            classifierQueueInFlightAtStart: Kc.overlap.inFlightAtStart,
            classifierQueueOverlapped: Kc.overlap.overlapped,
            classifierQueueReleasedByEscalation: Kc.overlap.releasedByEscalation,
            classifierQueueCommitWaitMs: kd,
          }),
          classifierSource: fromEnum(li),
          ...Tl,
          ...(isCcsTenant() && { sessionAutoClassifierActive: So }),
          serverClassifierNoVerdict: ao
            ? fromEnumOpt(qb(await fs(), toolUseID) ?? getStaleContextErrorKind(vs))
            : void 0,
          serverRewriteCause: fromEnumOpt(
            mf && (assistantMessage.serverClassifierInputRewrite?.cause ?? mf.cause),
          ),
          serverRewriteLostVerdict: fromEnumOpt(mf?.lostVerdict),
          skippedOnAllowRule: al,
          serverRewriteSource: fromEnumOpt(assistantMessage.serverClassifierInputRewrite?.source),
          serverRewriteByLocalCode: assistantMessage.serverClassifierInputRewrite?.byLocalCode,
          serverRewriteShape: fromEnumOpt(assistantMessage.serverClassifierInputRewrite?.shape),
          serverRewriteKeptVerdict:
            assistantMessage.serverClassifierInputRewrite === void 0
              ? void 0
              : assistantMessage.serverClassifierInputRewrite.keptVerdict && !na,
          serverRewriteUnquoted: Ac === void 0 || Ac.kind === "quoted" ? void 0 : fromEnum(Ac.kind),
          classifierTotalWaitMs: ap,
          classifierModel: telemetrySafeModelName(vs.model),
          classifierCategory: dKe(vs.category),
          classifierStage1Severity: vs.stage1Severity,
          classifierStage2Severity: vs.stage2Severity,
          ...(vs.remoteBrowserRule !== void 0 && { classifierRemoteBrowserRule: !0 }),
          consecutiveDenials: vs.shouldBlock ? vn.consecutiveDenials - uS + (Kf ? 1 : 0) : 0,
          totalDenials: vn.totalDenials + ((Kf && !na) || Yh ? 1 : 0),
          classifierInputTokens: vs.usage?.inputTokens,
          classifierOutputTokens: vs.usage?.outputTokens,
          classifierCacheReadInputTokens: vs.usage?.cacheReadInputTokens,
          classifierCacheCreationInputTokens: vs.usage?.cacheCreationInputTokens,
          classifierDurationMs: vs.durationMs,
          classifierSystemPromptLength: vs.promptLengths?.systemPrompt,
          classifierToolCallsLength: vs.promptLengths?.toolCalls,
          classifierUserPromptsLength: vs.promptLengths?.userPrompts,
          sessionInputTokens: getTotalInputTokens(),
          sessionOutputTokens: getTotalOutputTokens(),
          sessionCacheReadInputTokens: getTotalCacheReadInputTokens(),
          sessionCacheCreationInputTokens: getTotalCacheCreationInputTokens(),
          classifierCostUSD: newDenialState_3,
          classifierStage: fromEnumOpt(vs.stage),
          classifierFailureMode: fromEnumOpt(vs.failureMode),
          classifierStage1InputTokens: vs.stage1Usage?.inputTokens,
          classifierStage1OutputTokens: vs.stage1Usage?.outputTokens,
          classifierStage1CacheReadInputTokens: vs.stage1Usage?.cacheReadInputTokens,
          classifierStage1CacheCreationInputTokens: vs.stage1Usage?.cacheCreationInputTokens,
          classifierStage1DurationMs: vs.stage1DurationMs,
          classifierStage1RequestId: ye(vs.stage1RequestId),
          classifierStage1MsgId: ye(vs.stage1MsgId),
          classifierStage1CostUSD:
            vs.stage1Usage && vs.model ? calculateCostFromTokenCounts(vs.model, vs.stage1Usage) : void 0,
          classifierStage2InputTokens: vs.stage2Usage?.inputTokens,
          classifierStage2OutputTokens: vs.stage2Usage?.outputTokens,
          classifierStage2CacheReadInputTokens: vs.stage2Usage?.cacheReadInputTokens,
          classifierStage2CacheCreationInputTokens: vs.stage2Usage?.cacheCreationInputTokens,
          classifierStage2DurationMs: vs.stage2DurationMs,
          classifierStage2RequestId: ye(vs.stage2RequestId),
          classifierStage2MsgId: ye(vs.stage2MsgId),
          classifierStage2CostUSD:
            vs.stage2Usage && vs.model ? calculateCostFromTokenCounts(vs.model, vs.stage2Usage) : void 0,
        }),
        ko)
      ) {
        let Ks = qb(await fs(), toolUseID) ?? getStaleContextErrorKind(vs);
        if (Ks === void 0) logFeatureOk("auto_mode_floor_server_check");
        else logFeatureSad("auto_mode_floor_server_check", Ks);
      }
      if (At !== void 0 && vs.classifierRan === !1)
        return (
          logForDebugging(
            `${tool.name} declares classifierOnly() but serialized to an empty classifier action; denying`,
            { level: "error" },
          ),
          {
            behavior: "deny",
            decisionReason: { type: "classifier", classifier: "auto-mode", reason: vs.reason, noVerdict: !0 },
            message: `${tool.name} was not reviewed: it gave the auto mode classifier nothing to judge (its toAutoClassifierInput is empty), and only the classifier can allow it. This is a tool bug, not a judgment on the action.`,
          }
        );
      if (rg !== void 0)
        return (
          s_e(toolUseID, rg),
          logForDebugging(
            `Auto mode classifier gave no verdict for ${tool.name} (${rg.kind}); delivering flagged`,
            { level: "warn" },
          ),
          {
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
              noVerdict: !0,
            },
          }
        );
      if (vs.shouldBlock) {
        if (vs.transcriptTooLong) {
          let Gc = vs.errorKind === SERVER_CALL_UNAVAILABLE_INPUT_TOO_LONG,
            oc = At !== void 0 && !Ie.shouldAvoidPermissionPrompts,
            hp = !Gc && !We && !tool.mcpInfo && ((tool.name === AGENT && !0) || !1),
            Pg = oc ? "classifier_only_deny" : hp ? "allow" : bo ? "question_dialog" : "deny",
            Sc = Pqt()
              ? requestDenialCompact(permissionContext, permissionContext.messages, {
                  toolName: tool.name,
                  denied:
                    (Pg === "deny" || Pg === "classifier_only_deny") &&
                    permissionContext.permissionRound !== void 0,
                  mode: Ie.mode,
                })
              : void 0,
            Hu = Sc !== void 0;
          if (Sc === "requested")
            logEvent("tengu_auto_mode_classifier_overflow_compact", {
              stage: lit_2("requested"),
              arm: fromEnum(Pg),
              toolName: sanitizeToolNameForAnalytics(tool.name),
              isMcp: tool.isMcp ?? !1,
              isSubagent: permissionContext.agentId !== void 0,
              headless: Ie.shouldAvoidPermissionPrompts === !0,
              serverPath: ao && !ol,
              serverInputTooLong: Gc,
            });
          if (!Gc || Hu) {
            if (oc)
              return (
                logForDebugging(
                  `Auto mode classifier transcript too long for ${tool.name}, denying (classifierOnly: no prompt fallback)`,
                  { level: "warn" },
                ),
                {
                  behavior: "deny",
                  decisionReason: {
                    type: "classifier",
                    classifier: "auto-mode",
                    reason: CLASSIFIER_TRANSCRIPT_TOO_LONG_REASON,
                    noVerdict: !0,
                  },
                  message: Hu
                    ? `${tool.name} was not reviewed and did not run: the conversation is too long for auto mode's classifier, and no permission prompt is raised for this tool. This is not a judgment that the action is unsafe. Claude Code will try to compact the conversation before the next request; if this action is still needed after that, issue it again.`
                    : `${tool.name} was not reviewed: the auto mode classifier transcript exceeded its context window, and no permission prompt is raised for this tool. This is not a judgment that the action is unsafe; the same call will hit the same limit until the conversation is shorter.`,
                }
              );
            if (hp)
              return {
                behavior: "allow",
                updatedInput: input,
                decisionReason: { type: "mode", mode: "auto" },
              };
            if (bo)
              return (
                logForDebugging(
                  "Auto mode classifier transcript too long for AskUserQuestion, falling back to the question dialog",
                  { level: "warn" },
                ),
                logEvent("tengu_auto_mode_fallback_to_ask", {
                  reason: lit_2("requires_user_interaction"),
                  toolName: sanitizeToolNameForAnalytics(tool.name),
                  toolUseId: ye(toolUseID),
                  isMcp: tool.isMcp ?? !1,
                  ...q(),
                }),
                checkResult
              );
            if (Hu)
              return (
                logForDebugging(
                  `Auto mode classifier transcript too long for ${tool.name}, denying and compacting before the next request`,
                  { level: "warn" },
                ),
                {
                  behavior: "deny",
                  decisionReason: {
                    type: "classifier",
                    classifier: "auto-mode",
                    reason: CLASSIFIER_TOO_LONG_COMPACTING_REASON,
                    noVerdict: !0,
                  },
                  message: `${tool.name} was not reviewed and did not run: the conversation is too long for auto mode's classifier. Claude Code will try to compact the conversation before the next request; if this action is still needed after that, issue it again and it will be reviewed normally.`,
                }
              );
            if (Ie.shouldAvoidPermissionPrompts)
              throw new AbortError_2(
                "Agent aborted: auto mode classifier transcript exceeded context window in headless mode",
              );
            if (
              (logForDebugging(
                "Auto mode classifier transcript too long, falling back to normal permission handling",
                { level: "warn" },
              ),
              logEvent("tengu_auto_mode_fallback_to_ask", {
                reason: lit_2("transcript_too_long"),
                toolName: sanitizeToolNameForAnalytics(tool.name),
                toolUseId: ye(toolUseID),
                isMcp: tool.isMcp ?? !1,
                ...q(),
              }),
              Me === "dontAsk")
            )
              return {
                behavior: "deny",
                decisionReason: { type: "mode", mode: "dontAsk" },
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
        let Ks = vs.errorKind === SAFETY_MONITOR_BLOCKED && !vs.refusedBySafeguard;
        if (vs.unavailable || Ks) {
          if (bo && !Ks)
            return (
              logForDebugging(
                "Auto mode classifier unavailable for AskUserQuestion, falling back to the question dialog",
                { level: "warn" },
              ),
              logEvent("tengu_auto_mode_fallback_to_ask", {
                reason: lit_2("requires_user_interaction"),
                toolName: sanitizeToolNameForAnalytics(tool.name),
                toolUseId: ye(toolUseID),
                isMcp: tool.isMcp ?? !1,
                ...q(),
              }),
              checkResult
            );
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
                  vs.model,
                  vs.httpStatus,
                  vs.errorKind,
                  vs.retryAfterMs,
                  assistantMessage.handedOff === !0,
                  void 0,
                  !1,
                  nne(permissionContext),
                  { quote: Ac, recorded: tp },
                ),
              },
              hp = updateDenialTrackingState(permissionContext, (Sc) =>
                recordRewriteDenial(
                  Sc,
                  assistantMessage.message.id,
                  Ac?.kind === "quoted" || Sc.lastRewriteMessageId !== assistantMessage.message.id
                    ? fingerprintToolCall(tool.name, Ac?.kind === "quoted" ? Ac.input : input)
                    : Sc.lastRewriteFingerprint,
                  Yh,
                ),
              ),
              Pg =
                At !== void 0 && !Ie.shouldAvoidPermissionPrompts
                  ? null
                  : handleDenialLimitExceeded(
                      hp,
                      HOOK_REWROTE_INPUT_REVIEW_REASON,
                      assistantMessage,
                      toolUseID,
                      tool,
                      checkResult,
                      permissionContext,
                      isAutoClassifierActive(Me),
                      { ...oc, decideLocation: "pre-ask" },
                    );
            if (Pg) {
              if (Me === "dontAsk")
                return {
                  behavior: "deny",
                  decisionReason: { type: "mode", mode: "dontAsk" },
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
            (ko || (!So && vs.errorKind === CLASSIFIER_SWITCHED_OFF_KIND)) &&
            (!ol || vs.errorKind === CLASSIFIER_SWITCHED_OFF_KIND) &&
            !gd &&
            !Ks
          ) {
            if (al) noteRefusedMcpSkip(tool.name);
            let oc =
              Me === "dontAsk"
                ? "the permission mode is don't ask"
                : At !== void 0
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
                            : void 0;
            if (oc !== void 0)
              return (
                logForDebugging(
                  `[server-classifier] ${tool.name}: no server verdict for this call outside auto mode (${vs.errorKind ?? "unknown kind"}); nobody is asked here, denying`,
                  { level: "warn" },
                ),
                denyPromptUnavailable(
                  checkResult,
                  `${tool.name} did not run. The automatic safety check gave no verdict on this call, and Claude Code doesn't ask for approval in its place here: ${oc}. This is not a judgment that the action is unsafe, and a later call may get a verdict. Don't retry it now. Continue with work that doesn't need it, and tell the user that ${tool.name} could not be approved here.`,
                )
              );
            return (
              logForDebugging(
                `[server-classifier] ${tool.name}: no server verdict for this call outside auto mode (${vs.errorKind ?? "unknown kind"}); asking the person`,
                { level: "warn" },
              ),
              logEvent("tengu_auto_mode_fallback_to_ask", {
                reason:
                  vs.errorKind === CLASSIFIER_SWITCHED_OFF_KIND
                    ? lit_2("floor_local_classifier_switched_off")
                    : lit_2("floor_no_server_verdict"),
                toolName: sanitizeToolNameForAnalytics(tool.name),
                toolUseId: ye(toolUseID),
                isMcp: tool.isMcp ?? !1,
                ...q(),
              }),
              {
                ...checkResult,
                personOnly: !0,
                hooksMayAllow: !1,
                defaultToNo: !0,
                suppressAlwaysAllowRule: !0,
                inPlaceOfClassifier: !0,
                suggestions: void 0,
                localDisplayOnly: !0,
                decisionReason: pickDisplayedDecisionReason(checkResult, {
                  type: "other",
                  reason: UNREVIEWED_ACTION_NOTICE,
                }),
              }
            );
          }
          let serverClassifierRequest = assistantMessage.serverClassifierRequest;
          if (
            ao &&
            !ko &&
            !ol &&
            !Ks &&
            serverClassifierRequest !== void 0 &&
            isServerUnavailableReason(vs.errorKind, (await fs()).kind === "per_call")
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
          if (
            (logForDebugging(
              vs.retryAfterMs === void 0
                ? "Auto mode classifier unavailable, denying with retry guidance (fail closed)"
                : "Auto mode classifier told to wait by the API, denying (fail closed)",
              { level: "warn" },
            ),
            al)
          )
            noteRefusedMcpSkip(tool.name);
          return {
            behavior: "deny",
            decisionReason: {
              type: "classifier",
              classifier: "auto-mode",
              reason: CLASSIFIER_UNAVAILABLE_REASON,
              ...!1,
            },
            message: buildClassifierUnavailableMessage(
              tool.name,
              vs.model,
              vs.httpStatus,
              vs.errorKind,
              vs.retryAfterMs,
              assistantMessage.handedOff === !0,
              Uc,
              al,
              nne(permissionContext),
            ),
          };
        }
        if (vs.refusedBySafeguard) {
          if (Ie.shouldAvoidPermissionPrompts)
            throw new AbortError_2(
              "Agent aborted: auto mode classifier request refused by the safety safeguard in headless mode",
            );
          return (
            logForDebugging(
              "Auto mode classifier request refused by the safety safeguard, denying (exempt from the denial counter)",
              { level: "warn" },
            ),
            {
              behavior: "deny",
              decisionReason: {
                type: "classifier",
                classifier: "auto-mode",
                reason: vs.reason,
                noVerdict: !0,
              },
              message: buildClassifierRefusedOrTransientGuidance(vs.reason, {
                refused: !0,
                callerHasReadTools: nne(permissionContext),
              }),
            }
          );
        }
        if (uh(vs))
          return (
            logEvent("tengu_auto_mode_fallback_to_ask", {
              reason: lit_2("chrome_floor_block"),
              toolName: sanitizeToolNameForAnalytics(tool.name),
              toolUseId: ye(toolUseID),
              isMcp: tool.isMcp ?? !1,
              ...q(),
            }),
            logFeatureOk("permission_chrome_block_prompt"),
            {
              ...checkResult,
              personOnly: !0,
              hooksMayAllow: !1,
              defaultToNo: !0,
              suppressAlwaysAllowRule: !0,
              decisionReason: pickDisplayedDecisionReason(checkResult, {
                type: "classifier",
                classifier: "auto-mode",
                reason: vs.reason,
              }),
            }
          );
        let kl = updateDenialTrackingState(permissionContext, (Gc) =>
          incrementDenialCounts(ch ? undoRewriteDenialIfRetried(Gc, tool.name, input) : Gc),
        );
        if (
          (logForDebugging(`Auto mode classifier blocked action: ${vs.reason}`, { level: "warn" }),
          At?.onBlock === "flag")
        )
          return (
            s_e(toolUseID, { kind: "blocked", reason: vs.reason }),
            {
              behavior: "allow",
              updatedInput: checkResult.updatedInput ?? input,
              decisionReason: {
                type: "classifier",
                classifier: "auto-mode",
                reason: `Flagged by the classifier, delivered with its warning: ${vs.reason}`,
              },
            }
          );
        let Yd = buildClassifierDenyResult(vs, permissionContext, tool, input, checkResult),
          Ip =
            bo || (At !== void 0 && !Ie.shouldAvoidPermissionPrompts)
              ? null
              : handleDenialLimitExceeded(
                  kl,
                  vs.reason,
                  assistantMessage,
                  toolUseID,
                  tool,
                  checkResult,
                  permissionContext,
                  isAutoClassifierActive(Me),
                  { ...Yd, decideLocation: "pre-ask" },
                );
        if (Ip) {
          if (Me === "dontAsk")
            return {
              behavior: "deny",
              decisionReason: { type: "mode", mode: "dontAsk" },
              message: DONT_ASK_REJECT_MESSAGE(tool.name),
            };
          return Ip;
        }
        return Yd;
      }
      if ((!bo && !Vr && !Oo && !Xa) || !OV(permissionContext.requestDialog !== void 0))
        _s.runInTurn(() => updateDenialTrackingState(permissionContext, resetConsecutiveDenials));
      if (bo)
        return (
          logEvent("tengu_auto_mode_fallback_to_ask", {
            reason: lit_2("requires_user_interaction"),
            toolName: sanitizeToolNameForAnalytics(tool.name),
            toolUseId: ye(toolUseID),
            isMcp: tool.isMcp ?? !1,
            ...q(),
          }),
          checkResult
        );
      return It({
        updatedInput: checkResult.updatedInput ?? input,
        decisionReason: { type: "classifier", classifier: "auto-mode", reason: vs.reason },
        classifierRan: vs.classifierRan,
      });
    }
    let Et =
      isSdkDialogHostActive() &&
      zjt() !== null &&
      permissionContext.requestDialog !== void 0 &&
      permissionContext.asksNoHost !== !0 &&
      !Ie.shouldAvoidPermissionPrompts &&
      Ie.servedCall !== !0;
    if (
      Me === "bypassPermissions" &&
      !carriesAskRuleIntent(checkResult) &&
      (canShowSafetyCheckDialog(permissionContext) || Et)
    ) {
      let yt = findSafetyCheckReason(checkResult.decisionReason, isAutoModeDenyCircuitBreaker),
        gt = yt !== void 0 ? getDangerousRmTimeoutConfig() : void 0;
      if (yt !== void 0 && gt?.enabled && (gt.denyOnHostCard || !Et)) {
        let At = applySafetyCheckDialogPolicy(checkResult, yt, permissionContext, gt);
        return Et && At.behavior === "deny"
          ? resolveAskWithoutPrompt(
              answers,
              tool,
              input,
              { ...checkResult, refusal: At },
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
/**
 * 分类器拦截是否计入拒绝次数：shouldBlock 且不是不可用、转录过长或被安全拦截。
 */
//@ chunk-e6aww6q8.js:3008254-3008352 placement
function isCountedClassifierBlock(e) {
  return e.shouldBlock && !e.unavailable && !e.transcriptTooLong && !e.refusedBySafeguard;
}
/**
 * 分类器结论是否可用：分类器确实运行、非不可用/转录过长/被安全拦截，且没有 failureMode 与 errorKind。
 */
//@ chunk-e6aww6q8.js:3008352-3008503 placement
function isClassifierVerdictUsable(e) {
  return (
    e.classifierRan !== !1 &&
    !e.unavailable &&
    !e.transcriptTooLong &&
    !e.refusedBySafeguard &&
    e.failureMode === void 0 &&
    e.errorKind === void 0
  );
}
/**
 * Chrome 地板拦截后是否改为弹窗：站点授权路由、模式为 default/acceptEdits 且未变、SDK stdio 宿主、无链式 allow、可弹窗、分类器结论可用且类别命中 Chrome 地板集合，并且不是远程会话、chromeFloorBlockPrompts 未关闭。
 */
//@ chunk-e6aww6q8.js:3008503-3008876 placement
function shouldPromptAfterChromeFloorBlock({
  siteGrantRouted: siteGrantRouted,
  mode: mode,
  liveContext: liveContext,
  chainOnAllow: chainOnAllow,
  classifierResult: classifierResult,
}) {
  let y = getPolicySettingsOrigin();
  return (
    siteGrantRouted &&
    (mode === "default" || mode === "acceptEdits") &&
    liveContext.mode === mode &&
    isSdkDialogHostActive() &&
    getPermissionPromptToolName() === "stdio" &&
    !chainOnAllow &&
    !liveContext.shouldAvoidPermissionPrompts &&
    isClassifierVerdictUsable(classifierResult) &&
    (classifierResult.model === K2e
      ? Zhe() && Hxi.has(Xfs(classifierResult.reason) ?? "")
      : classifierResult.category !== void 0 && Aio.has(classifierResult.category)) &&
    !isAdminPolicyOrigin(y) &&
    y !== "remote" &&
    getAutoModeConfigOrDefault().chromeFloorBlockPrompts !== !1
  );
}
//@ chunk-e6aww6q8.js:3008876-3008928 placement
function recordAutoModeDenial(e) {
  let n = incrementDenialCounts(getDenialTrackingState(e));
  return (persistDenialState(e, n), n);
}
/**
 * auto 拒绝超限处理：未超限返回 false；超限上报 tengu_auto_mode_denial_limit_exceeded；headless 直接抛 AbortError；累计超限时清零计数；返回 true 表示回退人工。
 */
//@ chunk-e6aww6q8.js:3008928-3009537 placement
function enforceAutoModeDenialLimits(e, n, r, s, h) {
  if (!shouldFallbackToPrompting(n)) return !1;
  let y = n.totalDenials >= DENIAL_LIMITS.maxTotal,
    shouldAvoidPermissionPrompts = getToolPermissionContext(e).shouldAvoidPermissionPrompts;
  if (
    (logEvent("tengu_auto_mode_denial_limit_exceeded", {
      limit: lit_2(y ? "total" : "consecutive"),
      mode: lit_2(shouldAvoidPermissionPrompts ? "headless" : "cli"),
      messageID: ye(s),
      consecutiveDenials: n.consecutiveDenials,
      totalDenials: n.totalDenials,
      toolName: sanitizeToolNameForAnalytics(r.name),
      toolUseId: ye(h),
      isMcp: r.isMcp ?? !1,
    }),
    shouldAvoidPermissionPrompts)
  )
    throw new AbortError_2("Agent aborted: too many classifier denials in headless mode");
  if (y)
    persistDenialState(e, {
      ...n,
      totalDenials: 0,
      consecutiveDenials: 0,
      timedFallbackShown: void 0,
      lastRewriteMessageId: void 0,
      lastRewriteFingerprint: void 0,
      rewriteDenials: void 0,
    });
  return !0;
}
/**
 * 工具调用放行后，若有连续拒绝则在上下文/AppState 中清零。
 */
//@ chunk-e6aww6q8.js:3009537-3009605 placement = recordSuccess (1)
function recordAutoModeSuccess(context) {
  let state = getDenialTrackingState(context);
  if (state.consecutiveDenials > 0) persistDenialState(context, resetConsecutiveDenials(state));
}
//@ chunk-e6aww6q8.js:3009605-3009689 placement = persistDenialState (0.756)
function getDenialTrackingState(e) {
  return e.localDenialTracking ?? e.getAppState().denialTracking ?? createDenialTrackingState();
}
/**
 * 写入拒绝跟踪状态（子代理写 localDenialTracking，否则写 AppState）。
 */
//@ chunk-e6aww6q8.js:3009689-3009861 fingerprint = persistDenialState (1)
function persistDenialState(context, newState) {
  if (context.localDenialTracking) Object.assign(context.localDenialTracking, newState);
  else
    context.setAppState((prev) => {
      if (prev.denialTracking === newState) return prev;
      return { ...prev, denialTracking: newState };
    });
}
//@ chunk-e6aww6q8.js:3009861-3010723 layout
function buildClassifierDenyResult(e, n, r, s, h) {
  let y = e.failureMode !== void 0,
    S = AL(e.model === K2e && !y ? Xfs(e.reason) : e.category),
    w =
      h !== void 0 &&
      !carriesAskRuleIntent(h) &&
      h.decisionReason?.type !== "hook" &&
      h.decisionReason?.type !== "sandboxOverride" &&
      findSafetyCheckReason(h.decisionReason) === void 0 &&
      r.requiresUserInteraction?.() !== !0 &&
      h.suppressAlwaysAllowRule !== !0 &&
      r.suppressesAlwaysAllowRule?.(s) !== !0 &&
      r.suppressesAllPermissionUpdates?.(s) !== !0 &&
      n.forRemoteExecution !== !0 &&
      !isHookOrPluginSteered(n) &&
      !isWebToolRestrictedInRelay(r.name) &&
      !RL(r, getToolPermissionContext(n)) &&
      !isRemoteBrowserToolUnderModeFloor(r) &&
      r.ignoresWholeToolAllowRule?.(s) !== !0 &&
      getClassifiableBrowserAction(r, s, isAutoAllowedInMode(r, getToolPermissionContext(n))) === void 0 &&
      !Qye(r.name);
  return {
    behavior: "deny",
    decisionReason: {
      type: "classifier",
      classifier: "auto-mode",
      reason: e.reason,
      ...(y && { noVerdict: y }),
      ...(S !== void 0 && { category: S }),
    },
    message: y
      ? buildClassifierRefusedOrTransientGuidance(e.reason, { refused: !1, callerHasReadTools: nne(n) })
      : buildYoloRejectionMessage(e.reason, {
          autoModeConsentFlow: isAutoModeConsentFlowEnabled(n.agentId),
          blockedHelp: autoModeBlockedHelp(n.agentId),
          allowRuleToolName: w ? toAllowRuleToolName(getToolNameForPermissionCheck_4(r)) : void 0,
        }),
  };
}
//@ chunk-e6aww6q8.js:3010723-3010815 layout
function canShowPermissionDialog(e) {
  return (
    e.requestDialog !== void 0 &&
    !isSdkDialogHostActive() &&
    !getToolPermissionContext(e).shouldAvoidPermissionPrompts
  );
}
//@ chunk-e6aww6q8.js:3010815-3010854 layout
function canShowSafetyCheckDialog(e) {
  return canShowPermissionDialog(e) && !isUnattendedAgentContext(e);
}
/**
 * 从 subcommandResults 中取出原因与给定原因相同的那个子命令 ask 的消息，否则用结果自身消息。
 */
//@ chunk-e6aww6q8.js:3010854-3011046 placement
function flaggedPartMessage(e, n) {
  if (e.decisionReason?.type === "subcommandResults") {
    for (let r of e.decisionReason.reasons.values())
      if (r.behavior === "ask" && r.decisionReason === n) return r.message;
  }
  return e.message;
}
//@ chunk-e6aww6q8.js:3011046-3011546 layout
function applySafetyCheckDialogPolicy(e, n, r, s) {
  let h = (S) => ({
    behavior: "deny",
    message: buildDangerousRemovalDenial(flaggedPartMessage(e, n), S),
    decisionReason: n,
    decideLocation: "pre-ask",
  });
  if (!s.showDialog || !canShowSafetyCheckDialog(r)) return h();
  let y = bqt();
  if (s.maxDialogTimeouts > 0 && y >= s.maxDialogTimeouts)
    return (
      logEvent("tengu_safety_check_dialog_capped", {
        permissionMode: fromEnum(getToolPermissionContext(r).mode),
        circuitBreaker: fromEnumOpt(n.type === "safetyCheck" ? n.circuitBreaker : void 0),
        unansweredPrompts: y,
        maxDialogTimeouts: s.maxDialogTimeouts,
      }),
      h(y)
    );
  return { ...e, autoDenyWindow: buildAutoDenyMarker({ autoDenyAfterMs: s.timeoutMs, resolution: h() }) };
}
//@ chunk-e6aww6q8.js:3011546-3012163 layout
async function waitForServerClassifierRetry(e, n, r, s, h) {
  markClassifierChecking(r, s);
  let hold = h.hold();
  try {
    return await handleServerVerdictUnavailable(e, {
      runKey: jz(n.agentId),
      turnNow: n.queryTracking?.chainId,
      signal: n.abortController.signal,
      scheduleTimeout: n.scheduleTimeout,
      onWait: (S) => {
        if (S === null) {
          n.onRetryStatus?.(null);
          return;
        }
        (logForDebugging(
          `[server-classifier] no usable verdict for ${S.position} response(s) in a row; holding this response's denials ${S.delayMs}ms before the model may retry (${S.position}/${S.limit})`,
          { level: "warn" },
        ),
          n.onRetryStatus?.({
            kind: "auto_mode_unavailable",
            attempt: S.position,
            maxRetries: S.limit,
            retryInMs: S.delayMs,
            deadline: Date.now() + S.delayMs,
          }));
      },
    });
  } finally {
    (hold(), clearClassifierChecking(r, s));
  }
}
//@ chunk-e6aww6q8.js:3012163-3012579 layout
function stopTurnForMissingVerdict(e, n, r, s) {
  if (r) {
    let h = n.agentId !== void 0;
    (logEvent("tengu_auto_mode_unavailable_stop", {
      reason: fromEnum(s),
      isSubagent: h,
      gatewayConfigured: ntt() !== void 0,
    }),
      logForDebugging(
        `[server-classifier] no usable verdict for ${wR} responses in a row; stopping the ${h ? "agent's run" : "turn"}`,
        { level: "warn" },
      ));
  }
  return {
    behavior: "deny",
    decisionReason: {
      type: "classifier",
      classifier: "auto-mode",
      reason: AUTO_MODE_UNAVAILABLE_STOP_REASON,
      noVerdict: !0,
    },
    message: buildTurnEndedUnavailableMessage(e.name),
    endsTurn: !0,
  };
}
/**
 * 拒绝超限（连续 3/累计 20）：headless 直接抛 AbortError；否则记日志，累计超限时清零计数，返回带 denialLimitFallback（可限时自动拒绝）的 ask 结果让人工审阅。
 */
//@ chunk-e6aww6q8.js:3012579-3014177 fingerprint = handleDenialLimitExceeded (0.771)
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
  let hitTotalLimit = state.totalDenials >= DENIAL_LIMITS.maxTotal,
    isHeadless = getToolPermissionContext(context).shouldAvoidPermissionPrompts,
    { totalDenials: totalDenials, consecutiveDenials: consecutiveDenials } = state,
    ke = OV(context.requestDialog !== void 0),
    we = context.requestDialog !== void 0 && !isSdkDialogHostActive(),
    Ee =
      ke &&
      !hitTotalLimit &&
      isAutoMode &&
      we &&
      !isUnattendedAgentContext(context) &&
      hasAccessToIDEExtensionDiffFeature_3(currentMcpClients(context)) === void 0 &&
      consecutiveDenials >= DENIAL_LIMITS.maxConsecutive &&
      (state.timedFallbackShown !== !0 || !1),
    Ae = hitTotalLimit
      ? `${totalDenials} actions were blocked this session. Please review the transcript before continuing.`
      : `${consecutiveDenials} consecutive actions were blocked. Please review the transcript before continuing.`;
  if (
    (logEvent("tengu_auto_mode_denial_limit_exceeded", {
      limit: lit_2(hitTotalLimit ? "total" : "consecutive"),
      fallbackShape: lit_2(Ee ? "timed" : ke && we ? "blocking" : "legacy"),
      mode: lit_2(isHeadless ? "headless" : "cli"),
      messageID: ye(assistantMessage.message.id),
      consecutiveDenials: consecutiveDenials,
      totalDenials: totalDenials,
      toolName: sanitizeToolNameForAnalytics(tool.name),
      toolUseId: ye(toolUseID),
      isMcp: tool.isMcp ?? !1,
    }),
    isHeadless)
  )
    throw new AbortError_2("Agent aborted: too many classifier denials in headless mode");
  if (
    (logForDebugging(`Classifier denial limit exceeded, falling back to prompting: ${Ae}`, { level: "warn" }),
    hitTotalLimit)
  )
    persistDenialState(context, {
      ...state,
      totalDenials: 0,
      consecutiveDenials: 0,
      timedFallbackShown: void 0,
      lastRewriteMessageId: void 0,
      lastRewriteFingerprint: void 0,
      rewriteDenials: void 0,
    });
  let Ie =
    askResult.decisionReason?.type === "classifier" ? askResult.decisionReason.classifier : "auto-mode";
  if (ke && !hitTotalLimit && we && isAutoMode)
    updateDenialTrackingState(context, (lt) => ({ ...lt, timedFallbackShown: !0 }));
  let Me =
      classifierResult.decisionReason?.type === "classifier"
        ? classifierResult.decisionReason.category
        : void 0,
    We = {
      type: "classifier",
      classifier: Ie,
      reason: `${Ae}

Latest blocked action: ${latestReason}`,
      ...(Me !== void 0 && { category: Me }),
    },
    ze = pickDisplayedDecisionReason(askResult, We);
  return {
    ...askResult,
    ...(ke &&
      !hitTotalLimit &&
      we && {
        denialLimitFallback: withPermissionDisclosure(
          We,
          Ee ? { autoDenyAfterMs: getTimedFallbackAutoDenyMs(), resolution: classifierResult } : void 0,
        ),
      }),
    decisionReason: ze,
  };
}
/**
 * 决定原因是否由 ask 规则驱动（rule 且 ruleBehavior 为 ask，或 subcommandResults 里任一 ask 子项如此）。
 */
//@ chunk-e6aww6q8.js:3014177-3014380 placement
function isAskRuleDrivenReason(e) {
  if (e?.type === "rule" && e.rule.ruleBehavior === "ask") return !0;
  if (e?.type === "subcommandResults") {
    for (let n of e.reasons.values())
      if (n.behavior === "ask" && isAskRuleDrivenReason(n.decisionReason)) return !0;
  }
  return !1;
}
/**
 * 结果是否带 ask 规则意图：原因由 ask 规则驱动，或 matchedAskRule 为 ask。auto 下这类 ask 回退人工而不交分类器。
 */
//@ chunk-e6aww6q8.js:3014380-3014464 placement
function carriesAskRuleIntent(e) {
  return isAskRuleDrivenReason(e.decisionReason) || e.matchedAskRule?.ruleBehavior === "ask";
}
/**
 * 原因是否为 mcpServerPolicy 来源的 ask 规则。
 */
//@ chunk-e6aww6q8.js:3014464-3014568 placement
function isServerPolicyAskReason(e) {
  return e?.type === "rule" && e.rule.ruleBehavior === "ask" && e.rule.source === "mcpServerPolicy";
}
/**
 * 沙箱/只读放行是否改标为 sandboxOverride 交复核：无 ask 规则意图、无安全检查原因、尚非 sandboxOverride，且 tengu_curried_squirrel 打开。
 */
//@ chunk-e6aww6q8.js:3014568-3014690 placement
function shouldRetagAskAsSandboxOverride(e) {
  if (
    carriesAskRuleIntent(e) ||
    findSafetyCheckReason(e.decisionReason) !== void 0 ||
    e.decisionReason?.type === "sandboxOverride"
  )
    return !1;
  return sandboxOverrideAskGuardsOn();
}
/**
 * 沙箱覆盖 ask 守卫开关（GrowthBook tengu_curried_squirrel，安全默认）。
 */
//@ chunk-e6aww6q8.js:3014690-3014751 placement
function sandboxOverrideAskGuardsOn() {
  return readFlagWithOverride("tengu_curried_squirrel", { safe: !0 });
}
//@ chunk-e6aww6q8.js:3014751-3014808 placement
function isPlanModeFloorReason(e) {
  return e?.type === "mode" && e.mode === "plan";
}
//@ chunk-e6aww6q8.js:3014916-3015069 placement
function usesToolCheckRunner(e, n) {
  if (e.mcpInfo) return !0;
  if (getCheckRunner(n.session, e.name) === void 0) return !1;
  return !(
    (e.name === BASH_TOOL_NAME || e.name === POWERSHELL_TOOL_NAME) &&
    isAutoClassifierActive("plan", getToolPermissionContext(n).servedCall === !0)
  );
}
//@ chunk-e6aww6q8.js:3015069-3015160 placement
function eZe(e, n, r) {
  return (
    getToolPermissionContext(r).mode === "plan" &&
    usesToolCheckRunner(e, r) &&
    !e.isReadOnly(n, r) &&
    !isReadOnlyBrowserCall(getToolNameForPermissionCheck_4(e), n)
  );
}
//@ chunk-e6aww6q8.js:3015160-3015319 placement
function isPlanModeBlockedWrite(e, n, r) {
  if (getToolPermissionContext(r).mode !== "plan") return !1;
  try {
    let { parsedInput: parsedInput } = parseToolInputForPermission(e, n, r);
    return (
      !e.isReadOnly(parsedInput, r) && !isReadOnlyBrowserCall(getToolNameForPermissionCheck_4(e), parsedInput)
    );
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return !0;
  }
}
//@ chunk-e6aww6q8.js:3015319-3015451 placement
function buildPlanModeAsk(e) {
  return {
    behavior: "ask",
    message: `Cannot call ${e.name} while in plan mode.`,
    decisionReason: { type: "mode", mode: "plan" },
  };
}
//@ chunk-e6aww6q8.js:3015451-3015533 placement
function ebn(e) {
  return e.behavior === "ask" && e.defaultToNo === !0 ? { defaultToNo: !0 } : {};
}
//@ chunk-e6aww6q8.js:3015533-3015707 placement
function isPersonOnlySafetyAsk(e) {
  return (
    e?.behavior === "ask" &&
    e.personOnly === !0 &&
    e.suppressAlwaysAllowRule === !0 &&
    e.decisionReason?.type === "safetyCheck" &&
    !e.decisionReason.classifierApprovable
  );
}
/**
 * mcpServerPolicy 的 ask 是否落在 plan 写地板之下：解析输入后判断该调用在 plan 下是否属于需要阻挡的写；解析失败时以当前是否 plan 模式为准。
 */
//@ chunk-e6aww6q8.js:3015707-3015835 placement
function isServerPolicyAskUnderPlanFloor(e, n, r, s) {
  if (!isServerPolicyAskReason(e)) return !1;
  try {
    let { parsedInput: parsedInput } = parseToolInputForPermission(n, r, s);
    return eZe(n, parsedInput, s);
  } catch {
    return getToolPermissionContext(s).mode === "plan";
  }
}
//@ chunk-e6aww6q8.js:3015835-3015860 placement
var gTr = new Set([EXITPLANMODE_2, ASKUSERQUESTION]);
//@ chunk-e6aww6q8.js:3015860-3015933 placement
function hTr(e, n) {
  return n !== void 0 && e.mcpInfo === void 0 && gTr.has(e.name);
}
/**
 * 是否仍欠一次人工交互：工具属于强制人工类，或 requiresUserInteraction 为真且未被豁免。
 */
//@ chunk-e6aww6q8.js:3015933-3016015 placement
function isInteractionStillOwed(e, n) {
  return requiresConnectorGrant(e) || (Boolean(e.requiresUserInteraction?.()) && !hTr(e, n));
}
/**
 * 解析工具输入：先严格 parse；失败且仅因未知键、tengu_tidy_eclipse 打开、且未知键无需询问时，去掉这些键重试，并返回 keysSetAside:true。
 */
//@ chunk-e6aww6q8.js:3016015-3016265 placement
function parseToolInputForPermission(e, n, r) {
  try {
    return { parsedInput: e.inputSchema.parse(n), keysSetAside: !1 };
  } catch (error) {
    let h = isUnrecognizedKeysIssue(error?.issues);
    if (
      h.length === 0 ||
      !getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_eclipse", !0) ||
      isSettledPermissionResult(runFailClosedDecision(e, n, r))
    )
      throw error;
    return { parsedInput: e.inputSchema.parse(deleteKeysAtPaths(n, h)), keysSetAside: !0 };
  }
}
/**
 * 结果是否“已确定”：有结果且不是 checkIncomplete 的 ask。
 */
//@ chunk-e6aww6q8.js:3016265-3016346 placement
function isSettledPermissionResult(e) {
  return e !== void 0 && !(e.behavior === "ask" && e.checkIncomplete === !0);
}
/**
 * 工具声明了 permissionCheckFailureDecision 时调用它决定权限检查失败的处理；该函数本身抛错时记日志并直接拒绝。
 */
//@ chunk-e6aww6q8.js:3016346-3016738 placement
function runFailClosedDecision(e, n, r) {
  if (e.permissionCheckFailureDecision === void 0) return;
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
function describePermissionCheckFault(e, n, r, s) {
  if (e instanceof AbortError_2 || e instanceof Lf) throw e;
  if (isAbortError(e) && s.abortController.signal.aborted) throw new AbortError_2();
  if (cke(e))
    return {
      behavior: "deny",
      message: `The ${n.name} permission check needs a working directory, and this session has none, so the call is denied. A retry is denied the same way.`,
      decisionReason: { type: "other", reason: NO_PROJECT_DIRECTORY_DENY_REASON },
    };
  if (!isAbortError(e)) logError(e);
  if (mergeClients_3(e))
    return {
      behavior: "deny",
      message: `The ${n.name} permission check failed because of a fault in Claude Code, so the call is denied. Nothing in this session can fix it, and a retry is denied the same way.`,
      decisionReason: { type: "other", reason: NO_CONFIG_HOME_DENY_REASON },
    };
  return runFailClosedDecision(n, r, s);
}
//@ chunk-e6aww6q8.js:3017889-3017923 placement
var PERMISSION_CHECK_CRASHED_REASON = "permission_check_crashed";
/**
 * 规则检查前的早期拒绝：会话处于"工具暂停待用户"状态时拒绝（结束工具和钩子代理的 StructuredOutput 除外）；否则查整工具 deny 规则，classifierOnly 工具可绕过。
 */
//@ chunk-e6aww6q8.js:3017923-3018318 placement
function getEarlyDenial(e, n, r) {
  let s = getToolPermissionContext(r);
  if (
    pKe(s) &&
    !isConversationEndTool(e) &&
    !(
      e.name === STRUCTUREDOUTPUT &&
      !("mcpInfo" in e && e.mcpInfo) &&
      r.agentId?.startsWith(HOOK_AGENT_ID_PREFIX) === !0
    )
  )
    return {
      behavior: "deny",
      decisionReason: { type: "other", reason: TOOLS_HELD_UNTIL_A_PERSON_TYPES },
      message: buildToolsPausedMessage(e.name),
    };
  let h = getDenyRuleForTool(s, e);
  return h === null || ("classifierOnly" in e && isClassifierOnlyToolUnblocked(e, n, r))
    ? void 0
    : {
        behavior: "deny",
        decisionReason: { type: "rule", rule: h },
        message: `Permission to use ${e.name} has been denied.`,
      };
}
/**
 * 只查规则与工具自检的权限检查（给 PreToolUse 钩子 allow/ask 后复核用）：提前裁决、deny 规则、整工具 ask 规则（沙箱自动放行例外）、tool.checkPermissions；hook allow 时施加 plan 写地板；检查崩溃且 crashIsObjection 时返回 ask；只返回 deny/ask，放行时返回 null。
 */
//@ chunk-e6aww6q8.js:3018318-3020395 placement = PermissionDecisionDebugInfo (0.162)
async function checkRuleBasedPermissions(e, n, r, s) {
  let h = getToolPermissionContext(r),
    y = getEarlyDenial(e, n, r);
  if (y !== void 0) return y;
  let S = matchToolRule(h, e, n, "deny");
  if (S && !isClassifierOnlyToolUnblocked(e, n, r))
    return {
      behavior: "deny",
      decisionReason: { type: "rule", rule: S },
      message: formatRuleDeniedMessage(e.name, S),
    };
  let w = getAskRuleForTool(h, e);
  if (w) {
    let Z =
        e.name === BASH_TOOL_NAME &&
        r.forRemoteExecution !== !0 &&
        getCheckRunner(r.session, e.name) === void 0 &&
        SandboxManager.isSandboxingEnabled() &&
        SandboxManager.isAutoAllowBashIfSandboxedEnabled() &&
        shouldUseSandbox(n) &&
        !(typeof n.command === "string" && antDisabledListMatchesCommandText(n.command)),
      Se = Z && isSandboxAutoAllowOff(h);
    if (!(Z && !Se)) return powershellToolCheckExactMatchPermission(e, n, r, w, s);
  }
  let L = { behavior: "passthrough", message: createPermissionRequestMessage(e.name) };
  try {
    let { parsedInput: parsedInput } = parseToolInputForPermission(e, n, r);
    if (
      ((L = await e.checkPermissions(parsedInput, r)),
      recordCheckedResult(r, parsedInput, L, e.name),
      s?.planModeWriteFloor === !0 &&
        getRegisteredCheck(r.session, e.name) === void 0 &&
        L.behavior === "passthrough" &&
        eZe(e, parsedInput, r))
    )
      return buildPlanModeAsk(e);
  } catch (error) {
    let Se = describePermissionCheckFault(error, e, n, r);
    if (Se !== void 0 && isSettledPermissionResult(Se)) L = Se;
    else if (s?.crashIsObjection === !0 && _M(e) === void 0) {
      let ke = { type: "other", reason: PERMISSION_CHECK_CRASHED_REASON };
      return { behavior: "ask", message: createPermissionRequestMessage(e.name, ke), decisionReason: ke };
    }
    if (
      s?.planModeWriteFloor === !0 &&
      getRegisteredCheck(r.session, e.name) === void 0 &&
      L.behavior === "passthrough" &&
      isPlanModeBlockedWrite(e, n, r)
    )
      return buildPlanModeAsk(e);
  }
  if (
    ((L = requireAutoModeClassifierReview(e, n, r, L) ?? L),
    (L = askClassifierForAllowedDomains(e, n, r, L) ?? L),
    (L = buildDesktopActionReviewAsk(e, n, L) ?? L),
    L?.behavior === "deny")
  )
    return L;
  let G = matchToolRule(h, e, n, "ask");
  if (G)
    return L?.behavior === "ask"
      ? { ...L, matchedAskRule: G }
      : {
          behavior: "ask",
          decisionReason: { type: "rule", rule: G },
          message: createPermissionRequestMessage(e.name),
        };
  if (
    isInteractionStillOwed(e, s?.hookUpdatedInput) &&
    !(s?.hookAsked === !0 && !e.requiresUserInteraction?.())
  )
    return L?.behavior === "ask"
      ? L
      : {
          behavior: "ask",
          message: createPermissionRequestMessage(e.name),
          decisionReason: { type: "other", reason: "requiresUserInteraction" },
        };
  if (L?.behavior === "ask" && carriesAskRuleIntent(L)) return L;
  if (e.mcpInfo?.effectiveMaxPermission === "ask") {
    if (isPersonOnlySafetyAsk(L)) return L;
    let Z = { type: "other", reason: askCeilingReason(e) };
    return {
      behavior: "ask",
      message: createPermissionRequestMessage(e.name, Z),
      decisionReason: Z,
      ...ebn(L),
    };
  }
  let suggestedRules = getToolPermissionContext(r);
  if (
    L?.behavior === "ask" &&
    (findSafetyCheckReason(L.decisionReason) ||
      L.decisionReason?.type === "sandboxOverride" ||
      (s?.planModeWriteFloor === !0 &&
        isPlanModeFloorReason(L.decisionReason) &&
        !cycleTeammateMode(e, r, suggestedRules, isAutoAllowedInMode(e, suggestedRules))))
  )
    return L;
  if (
    s?.planModeWriteFloor === !0 &&
    getRegisteredCheck(r.session, e.name) === void 0 &&
    !e.requiresUserInteraction?.() &&
    !cycleTeammateMode(e, r, suggestedRules, isAutoAllowedInMode(e, suggestedRules)) &&
    isPlanModeBlockedWrite(e, n, r)
  )
    return L?.behavior === "ask" ? L : { behavior: "ask", message: createPermissionRequestMessage(e.name) };
  return null;
}
/**
 * 工具宿主（ToolHost）上的规则检查：会话为该工具注册了宿主裁决时调用它；返回 deny，或带 ask 规则意图/安全检查/仅限人工的 ask，否则 null。
 */
//@ chunk-e6aww6q8.js:3020395-3020896 placement
async function checkRuleBasedPermissionsOnToolHost(e, n, r, s, h) {
  let y = getRegisteredCheck(r.session, e.name);
  if (y === void 0) return null;
  let S = { ...r, toolUseId: h, permissionModeAtRequest: getPermissionModeAtRequestForArbiter(s, h, r) },
    w = await invokeToolHostAdjudicator(y, e, n, S, s, h, () =>
      Promise.resolve({
        behavior: "deny",
        message: `${e.name} was not run: its permission check could not be completed.`,
        decisionReason: { type: "other", reason: "permission check failed" },
      }),
    );
  if (w === CHECK_NO_DECISION) return (rememberPendingCheck(r.session, h), null);
  return w.behavior === "deny" ||
    (w.behavior === "ask" &&
      (carriesAskRuleIntent(w) || findSafetyCheckReason(w.decisionReason) !== void 0 || w.personOnly === !0))
    ? w
    : null;
}
/**
 * 调用工具宿主的裁决函数，传入服务端分类器是否裁决（serverClassifierDecides）与本地评估回调 evaluateHere。
 */
//@ chunk-e6aww6q8.js:3020896-3021043 placement
function invokeToolHostAdjudicator(e, n, r, s, h, y, S) {
  return e({
    tool: n,
    input: r,
    context: s,
    toolUseID: y,
    serverClassifierDecides: sse(
      resolveServerClassifierRoleForCall(
        getAutoModeClassifierRole(getToolPermissionContext(s).mode),
        h,
        y,
        s,
      ),
    ),
    evaluateHere: S,
  });
}
//@ chunk-e6aww6q8.js:3021043-3021095 placement
function checkDeclarativePermission(e, n, r, s) {
  return checkToolAndRulePermissions(e, n, r, void 0, getAutoModeClassifierRole, s);
}
/**
 * checkDeclarativePermission 的变体：去掉 mcpServerPolicy 来源的 ask 规则后再检查，检查崩溃视为异议。
 */
//@ chunk-e6aww6q8.js:3021095-3021385 placement
function checkDeclarativePermissionLessServerPolicyAsks(e, n, r) {
  return checkDeclarativePermission(
    e,
    n,
    {
      ...r,
      toolUseId: void 0,
      permissionRound: void 0,
      getAppState: () => {
        let appState = r.getAppState(),
          { mcpServerPolicy: mcpServerPolicy, ...y } = appState.toolPermissionContext.alwaysAskRules;
        return {
          ...appState,
          toolPermissionContext: { ...appState.toolPermissionContext, alwaysAskRules: y },
        };
      },
    },
    { crashIsObjection: !0 },
  );
}
//@ chunk-e6aww6q8.js:3021385-3021416 placement
var pkn = { deny: 0, ask: 1, allow: 2 };
/**
 * 插件 tool.check 裁决层：先运行插件检查（resolveToolCheck）包住 evaluate；deny 或与本地评估一致且无 refusal/hooksMayAllow 时直接返回；否则按一系列闸门（远程 MCP、Cowork Web、auto 下钩子 allow 不能放行的工具、云浏览器、需人工交互、等待人写入、MCP skill ask、plan 写地板）限制插件只能收紧不能放宽。
 */
//@ chunk-e6aww6q8.js:3021416-3023557 placement
async function decideWithToolCheckHooks(e, n) {
  let r,
    s = async () => (r = await e.evaluate()),
    h = await resolveToolCheck({ ...e, evaluate: s }),
    y = h.behavior === "ask" ? h.refusal : void 0,
    S = h.behavior === "deny" || h.behavior === r?.behavior,
    w = h.behavior === "ask" && h.hooksMayAllow === !0;
  if (S && y === void 0 && !w) return h;
  let { tool: tool, context: context, toolUseID: toolUseID } = e,
    Z = XH(tool, getToolPermissionContext(context))
      ? { gate: lit_2("remoteSessionMcp"), why: "a remote session's MCP call" }
      : RL(tool, getToolPermissionContext(context))
        ? { gate: lit_2("coworkWeb"), why: "a plugin can only tighten a Cowork cloud session's web call" }
        : void 0;
  if (
    Z === void 0 &&
    isAutoClassifierActive(isAutoAllowedInMode(tool, getToolPermissionContext(context))) &&
    requiresClassifierForHookAllow(tool)
  )
    Z = {
      gate: lit_2("hookAllowClassified"),
      why: "in auto mode, or plan mode with auto mode on, a plugin can only tighten a call that a hook's allow cannot approve",
    };
  if (Z === void 0 && isRemoteBrowserToolUnderModeFloor(tool))
    Z = {
      gate: lit_2("remoteBrowserModeFloor"),
      why: "a plugin can only tighten a call to CCR's cloud browser",
    };
  if (Z === void 0 && isInteractionStillOwed(tool, void 0))
    Z = { gate: lit_2("requiresUserInteraction"), why: "the tool requires the person" };
  if (Z === void 0 && pKe(getToolPermissionContext(context)))
    Z = { gate: lit_2("toolsHeldUntilAPersonTypes"), why: "tool calls are held until a person writes" };
  let Se = r !== void 0;
  if (Z === void 0 && tool.name === SKILL) {
    let we = r ?? (await s());
    if (we.behavior === "ask" && we.metadata?.mcpSkill !== void 0)
      Z = { gate: lit_2("mcpSkillAsk"), why: "only a person answers the ask before an MCP skill loads" };
  }
  if (
    Z === void 0 &&
    getToolPermissionContext(context).mode === "plan" &&
    ((r?.behavior === "ask" && isPlanModeFloorReason(r.decisionReason)) ||
      isPlanModeBlockedWrite(tool, e.input, context)) &&
    (r ?? (await s())).behavior !== "allow"
  )
    Z = { gate: lit_2("planModeWriteFloor"), why: "plan mode holds the call" };
  if (y !== void 0)
    return Z === void 0 &&
      context.asksNoHost !== !0 &&
      isAutoAllowedInMode(tool, getToolPermissionContext(context)) !== "dontAsk"
      ? h
      : y;
  if (Z === void 0) {
    if (h.behavior === "allow")
      countMcpPolicyRecheckSkipped("toolCheck", tool, e.input, context, void 0, toolUseID);
    return h;
  }
  if (S && h.behavior === "ask") return { ...h, hooksMayAllow: !1 };
  let ke = r ?? (await s());
  if (pkn[h.behavior] < pkn[ke.behavior]) return h;
  if (ke.behavior === "ask" && h.behavior === "ask" && h.personOnly === !0)
    return { ...personOnlyAsk(ke), hooksMayAllow: !1 };
  return (
    logForDebugging(
      `tool.check ${tool.name} ${toolUseID}: ${Z.why}, so the plugins' ${h.behavior} is ignored; continuing with the engine's own decision (${ke.behavior})`,
    ),
    logEvent("tengu_auto_mode_tool_check_verdict_held", {
      toolName: sanitizeToolNameForAnalytics(tool.name),
      isMcp: tool.isMcp ?? !1,
      gate: Z.gate,
      hookDecision: fromEnum(h.behavior),
      coreDecision: fromEnum(ke.behavior),
      coreRan: Se,
      agentMsgId: ye(n),
      toolUseId: ye(toolUseID),
    }),
    ke
  );
}
/**
 * 规则与工具自检阶段：已中止则抛错；deny 规则命中即拒绝；整工具 ask 规则返回 ask（Bash 在沙箱自动放行且启用 autoAllowBashIfSandboxed 时例外，mcpServerPolicy 在远程 bypass 下可豁免）；随后调用 tool.checkPermissions、安全修正、字段级 ask 规则、requiresUserInteraction、bypassPermissions 放行、allow 规则，最后把 passthrough 转为 ask。
 */
//@ chunk-e6aww6q8.js:3023557-3027359 placement
async function checkToolAndRulePermissions(e, n, r, s, h = getAutoModeClassifierRole, y) {
  if (r.abortController.signal.aborted) throw new AbortError_2();
  let S = getToolPermissionContext(r),
    w = getEarlyDenial(e, n, r);
  if (w !== void 0) return w;
  let L = matchToolRule(S, e, n, "deny");
  if (L && !isClassifierOnlyToolUnblocked(e, n, r))
    return {
      behavior: "deny",
      decisionReason: { type: "rule", rule: L },
      message: formatRuleDeniedMessage(e.name, L),
    };
  let G = getAskRuleForTool(S, e);
  if (G) {
    let pt =
        e.name === BASH_TOOL_NAME &&
        r.forRemoteExecution !== !0 &&
        getCheckRunner(r.session, e.name) === void 0 &&
        SandboxManager.isSandboxingEnabled() &&
        SandboxManager.isAutoAllowBashIfSandboxedEnabled() &&
        shouldUseSandbox(n) &&
        !(typeof n.command === "string" && antDisabledListMatchesCommandText(n.command)),
      Et = pt && isSandboxAutoAllowOff(S),
      yt = pt && !Et,
      gt =
        G.source === "mcpServerPolicy" &&
        env.CLAUDE_CODE_REMOTE &&
        isAutoAllowedInMode(e, S) === "bypassPermissions" &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_mcp_server_policy_bypass_exempt", !0);
    if (!yt && !gt) return powershellToolCheckExactMatchPermission(e, n, r, G, y);
  }
  let q = { behavior: "passthrough", message: createPermissionRequestMessage(e.name) },
    Z = !1;
  try {
    let { parsedInput: parsedInput, keysSetAside: keysSetAside } = parseToolInputForPermission(e, n, r);
    if (((q = await e.checkPermissions(parsedInput, r)), keysSetAside && q.behavior !== "deny"))
      q =
        q.behavior === "allow"
          ? { behavior: "passthrough", message: createPermissionRequestMessage(e.name), checkIncomplete: !0 }
          : { ...q, checkIncomplete: !0 };
    if (
      ((Z = !0),
      recordCheckedResult(r, parsedInput, q, e.name),
      eZe(e, parsedInput, r) && q.behavior === "passthrough")
    )
      q = buildPlanModeAsk(e);
  } catch (error) {
    let Et = describePermissionCheckFault(error, e, n, r);
    if (Et !== void 0 && isSettledPermissionResult(Et)) q = Et;
    else if (y?.crashIsObjection === !0 && !Z && _M(e) === void 0) {
      let yt = { type: "other", reason: PERMISSION_CHECK_CRASHED_REASON };
      return { behavior: "ask", message: createPermissionRequestMessage(e.name, yt), decisionReason: yt };
    } else if (Et !== void 0 && !Z) q = Et;
    else if (!Z)
      q = { behavior: "passthrough", message: createPermissionRequestMessage(e.name), checkIncomplete: !0 };
    if (q.behavior === "passthrough" && isPlanModeBlockedWrite(e, n, r))
      q = q.checkIncomplete === !0 ? { ...buildPlanModeAsk(e), checkIncomplete: !0 } : buildPlanModeAsk(e);
  }
  if (
    ((q = requireAutoModeClassifierReview(e, n, r, q) ?? q),
    (q = askClassifierForAllowedDomains(e, n, r, q) ?? q),
    (q = buildDesktopActionReviewAsk(e, n, q) ?? q),
    q?.behavior === "deny")
  )
    return q;
  let Se = matchToolRule(S, e, n, "ask");
  if (Se)
    return q?.behavior === "ask"
      ? { ...q, matchedAskRule: Se }
      : {
          behavior: "ask",
          decisionReason: { type: "rule", rule: Se },
          message: createPermissionRequestMessage(e.name),
        };
  if (e.requiresUserInteraction?.())
    return q?.behavior === "ask"
      ? q
      : {
          behavior: "ask",
          message: createPermissionRequestMessage(e.name),
          decisionReason: { type: "other", reason: "requiresUserInteraction" },
        };
  let ke = serverHeldShellAllowSource(e, q);
  if (q.behavior === "allow" && ke !== void 0 && S.servedCall !== !0 && sse(h(S.mode)))
    q = {
      behavior: "ask",
      message: createPermissionRequestMessage(e.name),
      updatedInput: q.updatedInput,
      decisionReason: {
        type: "other",
        reason: SERVER_HOLDS_SHELL_ALLOW_REASON,
        reroutedFrom: ke,
        replaces: q.decisionReason,
      },
    };
  if (q?.behavior === "ask" && carriesAskRuleIntent(q)) return q;
  if (e.mcpInfo?.effectiveMaxPermission === "ask") {
    if (isPersonOnlySafetyAsk(q)) return q;
    let pt = { type: "other", reason: askCeilingReason(e) };
    return {
      behavior: "ask",
      message: createPermissionRequestMessage(e.name, pt),
      decisionReason: pt,
      ...ebn(q),
    };
  }
  let we = getToolPermissionContext(r),
    Ee = isAutoAllowedInMode(e, we),
    Ae = cycleTeammateMode(e, r, we, Ee);
  holdRemovalWaiverOnAskAdjudicator(r);
  let Ie =
      Ae &&
      q?.behavior === "ask" &&
      Ee === "bypassPermissions" &&
      r.hookAskFloor !== !0 &&
      isRemovalWaiverActive(we) &&
      !arePermissionHooksUnsettled() &&
      managedTierHooks("PermissionRequest") === "none",
    Me =
      Ae && q?.behavior === "ask"
        ? findSafetyCheckReason(
            q.decisionReason,
            Ie ? isUnwaivableBypassImmuneCircuitBreaker : isBypassImmuneCircuitBreaker,
          )
        : void 0,
    We = q?.behavior === "ask" && isSandboxOverrideUnderReadBlock(q.decisionReason, S),
    ze =
      Ae &&
      r.hookAskFloor === !0 &&
      q?.behavior === "ask" &&
      (q.decisionReason?.type === "sandboxOverride" ||
        ((e.name === BASH_TOOL_NAME || e.name === POWERSHELL_TOOL_NAME) &&
          scriptAsksToRunUnsandboxed(e, n))) &&
      sandboxOverrideAskGuardsOn(),
    lt = Ae && r.hookAskFloor === !0 && q?.behavior === "ask" && q.standsInUnderHookAsk === !0;
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
    if (Ie && findSafetyCheckReason(q.decisionReason, isBypassImmuneCircuitBreaker) !== void 0)
      logFeatureOk("permission_bypass_removal_prompt_waived");
    return {
      behavior: "allow",
      updatedInput: getUpdatedInputOrFallback(q, n),
      decisionReason: { type: "mode", mode: Ee },
    };
  }
  let Je = !Z && q.behavior === "passthrough" ? null : findApplicableAllowRule(e, n, r, Ee, h);
  if (Je) {
    let pt = getToolPermissionContext(r).servedCall !== !0 ? getClassifiableBrowserAction(e, n, Ee) : void 0;
    if (pt !== void 0)
      logEvent("tengu_auto_mode_computer_use_rule_allow", {
        computerUseActionKind: fromEnum(pt),
        ruleSource: fromEnum(Je.source),
      });
    let Et = getToolPermissionContext(r),
      yt = getClassifierOverridableRuleSource(Je, e, n, Ee, Et);
    if (yt !== void 0) {
      if (!0)
        logEvent("tengu_auto_mode_destructive_mcp_rule_allow", {
          ruleSource: fromEnum(yt),
          serverClassifierRole: fromEnum(h(Et.mode)),
        });
    }
    return {
      behavior: "allow",
      updatedInput: getUpdatedInputOrFallback(q, n),
      decisionReason: { type: "rule", rule: Je },
    };
  }
  let nt =
    q.behavior === "passthrough"
      ? { ...q, behavior: "ask", message: createPermissionRequestMessage(e.name, q.decisionReason) }
      : q;
  if (nt.behavior === "ask" && nt.suggestions)
    logForDebugging(`Permission suggestions for ${e.name}: ${jsonStringify(nt.suggestions, null, 2)}`);
  return nt;
}
/**
 * 删除一条规则：policySettings/flagSettings/command 只读；可编辑层同时改文件；cliArg/session 只改内存。
 */
//@ chunk-e6aww6q8.js:3027359-3027830 placement = deletePermissionRule (1)
async function deletePermissionRule({
  rule: rule,
  initialContext: initialContext,
  setToolPermissionContext: setToolPermissionContext,
  storageV5: storageV5,
}) {
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
/**
 * 把规则列表按 来源:行为 分组，转换成 PermissionUpdate 列表（type 由调用方给定，destination 即来源）。
 */
//@ chunk-e6aww6q8.js:3027830-3028076 fingerprint = convertRulesToUpdates (1)
function convertRulesToUpdates(rules, updateType) {
  let grouped = new Map();
  for (let rule of rules) {
    let key = `${rule.source}:${rule.ruleBehavior}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(rule.ruleValue);
  }
  let updates = [];
  for (let [h, y] of grouped) {
    let [S, w] = h.split(":");
    updates.push({ type: updateType, rules: y, behavior: w, destination: S });
  }
  return updates;
}
/**
 * 把规则列表作为 addRules 更新应用到上下文。
 */
//@ chunk-e6aww6q8.js:3028076-3028136 placement = applyPermissionRulesToPermissionContext (1)
function applyPermissionRulesToPermissionContext(e, n, r) {
  let updates = convertRulesToUpdates(n, "addRules");
  return applyPermissionUpdates(e, updates, r);
}
/**
 * 从磁盘重载规则：先清空各 settings 层（托管独占时还清空 cliArg/session 与 mcpMount allow），再按 replaceRules 写入。
 */
//@ chunk-e6aww6q8.js:3028136-3028623 placement = syncPermissionRulesFromDisk (0.68)
function syncPermissionRulesFromDisk(toolPermissionContext, rules) {
  let context = toolPermissionContext;
  if (shouldAllowManagedPermissionRulesOnly()) {
    context = { ...context, alwaysAllowRules: { ...context.alwaysAllowRules, mcpMount: [] } };
    let y = [...EDITABLE_SETTING_SOURCES, "cliArg", "session"],
      behaviors = ["allow", "deny", "ask"];
    for (let source of y)
      for (let behavior of behaviors) {
        if ((source === "cliArg" || source === "session") && behavior !== "allow") continue;
        context = applyValidatedPermissionUpdate(context, {
          type: "replaceRules",
          rules: [],
          behavior: behavior,
          destination: source,
        });
      }
  }
  for (let diskSource of SETTING_SOURCES)
    for (let S of ["allow", "deny", "ask"])
      context = applyValidatedPermissionUpdate(context, {
        type: "replaceRules",
        rules: [],
        behavior: S,
        destination: diskSource,
      });
  let updates = convertRulesToUpdates(rules, "replaceRules"),
    h = applyPermissionUpdates(context, updates);
  return (clearRemovalWaiverIfPathScoped(h), holdRemovalWaiverOnAskAdjudicator(void 0), h);
}
/**
 * 设置 CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS 且存在 PermissionRequest 钩子（SDK、托管层或设置中）时，把 removalWaiverRulesClear 置为 false，即危险删除豁免交给钩子裁决。
 */
//@ chunk-e6aww6q8.js:3028623-3028902 placement
function holdRemovalWaiverOnAskAdjudicator(e) {
  if (
    env.CLAUDE_CODE_EVEN_MORE_DANGEROUSLY_SKIP_PERMISSIONS &&
    (zue(getPermissionPromptToolName()) ||
      dispatchClassicEvent("PermissionRequest") ||
      managedTierHooks("PermissionRequest") === "some" ||
      hasSettingsHookForEvent(
        "PermissionRequest",
        e?.sessionHooksRegistry,
        e === void 0 ? [] : registerAgent(e, "PermissionRequest", e.session.id),
      ))
  )
    Ao().removalWaiverRulesClear = !1;
}
/**
 * 取结果中的 updatedInput，没有则用回退输入。
 */
//@ chunk-e6aww6q8.js:3028902-3028972 fingerprint = getUpdatedInputOrFallback (1)
function getUpdatedInputOrFallback(permissionResult, fallback) {
  return ("updatedInput" in permissionResult ? permissionResult.updatedInput : void 0) ?? fallback;
}
/**
 * 在决定原因（含 subcommandResults 递归）中找第一个满足谓词的 safetyCheck 原因。
 */
//@ chunk-e6aww6q8.js:3028972-3029171 placement
function findSafetyCheckReason(e, n = () => !0) {
  if (!e) return;
  if (e.type === "safetyCheck") return n(e) ? e : void 0;
  if (e.type === "subcommandResults")
    for (let r of e.reasons.values()) {
      let s = findSafetyCheckReason(r.decisionReason, n);
      if (s) return s;
    }
  return;
}
//@ chunk-e6aww6q8.js:3029171-3029403 placement
function involvesSafetyCheck(e) {
  switch (e?.type) {
    case void 0:
    case "hook":
      return !1;
    case "other":
      return e.wasSafetyCheck === !0;
    case "subcommandResults":
      return [...e.reasons.values()].some(
        (n) => n.behavior !== "allow" && involvesSafetyCheck(n.decisionReason),
      );
    default:
      return !0;
  }
}
/**
 * 进入 auto 模式时把工具名映射为允许规则使用的名字：Bash/PowerShell 视开关保留、Chrome 与危险工具返回 undefined、写文件类映射为编辑工具。
 */
//@ chunk-sfy7bm1n.js:10287-10409 placement
function toAllowRuleToolName(e) {
  if (e === BASH_TOOL_NAME || e === POWERSHELL_TOOL_NAME) return PPe() ? void 0 : e;
  if (isChromeToolName(e) || isDangerousClassifierPermission(e, void 0) || isAllowRuleIgnoredInAutoMode(e))
    return;
  return e === FILE_WRITE_TOOL_NAME || e === NOTEBOOK_EDIT_TOOL_NAME ? FILE_EDIT_TOOL_NAME : e;
}
//@ chunk-sfy7bm1n.js:10409-10455 placement
var te = new Set(Array.from(HEARTH_WRITE_TOOL_NAMES, (e) => buildMcpToolName(HEARTHBOT, e)));
//@ chunk-sfy7bm1n.js:10455-10488 placement
function isAllowRuleIgnoredInAutoMode(e) {
  return te.has(e);
}
/**
 * 规则来源按顺序：userSettings、projectSettings、localSettings、flagSettings、policySettings、cliArg、command、session、mcpMount、toolsNarrowing、mcpServerPolicy、hostCredential。
 */
//@ chunk-sfy7bm1n.js:10488-10701 placement
var PERMISSION_RULE_SOURCES = [
    ...SETTING_SOURCES,
    "cliArg",
    "command",
    "session",
    "mcpMount",
    "toolsNarrowing",
    "mcpServerPolicy",
    "hostCredential",
  ],
  NARROWING_RULE_SOURCES = ["toolsNarrowing", "command"],
  CONVERSATION_END_TOOLS = new Set([require("./chunk-jbpmz76b.js").END_CONVERSATION_TOOL_NAME]);
//@ chunk-sfy7bm1n.js:10701-10749 placement
function isConversationEndTool(e) {
  return !e.mcpInfo && CONVERSATION_END_TOOLS.has(e.name);
}
/**
 * 收集 allow 规则；auto 模式下跳过危险规则（sme）与特定工具；CLAUDE_CODE_EVAL_CONFINED 时只用 cliArg；M() 判为被托管限制的来源之后的规则被截断。
 */
//@ chunk-sfy7bm1n.js:10749-11364 fingerprint = getAllowRules (0.577)
function getAllowRules(context) {
  if (isAutoClassifierActive(context.mode, context.servedCall === !0)) {
    let n = env.CLAUDE_CODE_EVAL_CONFINED
        ? { cliArg: context.alwaysAllowRules.cliArg }
        : context.alwaysAllowRules,
      s = [];
    for (let l of PERMISSION_RULE_SOURCES) {
      let m = n[l];
      if (m === void 0) continue;
      for (let u of m) {
        let a = permissionRuleValueFromString(u);
        if (isDangerousClassifierPermission(a.toolName, a.ruleContent)) continue;
        if (isAllowRuleIgnoredInAutoMode(a.toolName)) continue;
        if (M(l, a.toolName)) continue;
        s.push({ source: l, ruleBehavior: "allow", ruleValue: a });
      }
    }
    return s;
  }
  if (env.CLAUDE_CODE_EVAL_CONFINED)
    return collectRulesFromSettings({ cliArg: context.alwaysAllowRules.cliArg }, "allow");
  let r = collectRulesFromSettings(context.alwaysAllowRules, "allow"),
    o;
  for (let [n, s] of r.entries())
    if (M(s.source, s.ruleValue.toolName)) o ??= r.slice(0, n);
    else o?.push(s);
  return o ?? r;
}
/**
 * 把某行为（allow/deny/ask）的各来源规则字符串展开成规则对象列表 {source, ruleBehavior, ruleValue}。
 */
//@ chunk-sfy7bm1n.js:11364-11517 layout = hasBashPermission (1)
function collectRulesFromSettings(e, r) {
  let o = [];
  for (let n of PERMISSION_RULE_SOURCES) {
    let s = e[n];
    if (s === void 0) continue;
    for (let l of s) o.push({ source: n, ruleBehavior: r, ruleValue: permissionRuleValueFromString(l) });
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
/**
 * 工具是否命中整工具规则（规则无内容时按工具名匹配）。
 */
//@ chunk-sfy7bm1n.js:11619-11703 layout = getDenyRuleForAgent (1)
function toolMatchesWholeToolRule(context, agentToolName, agentType = {}) {
  if (agentToolName.ruleValue.ruleContent !== void 0) return !1;
  return toolMatchesRuleName(context, agentToolName, agentType);
}
/**
 * 规则工具名是否匹配工具：同名、家族父工具、别名展开、glob 名、MCP 服务器级规则（mcp__server / mcp__server__*）。
 */
//@ chunk-sfy7bm1n.js:11703-12599 layout
function toolMatchesRuleName(
  e,
  r,
  { proxyExpansion: o = !1, globMatching: n = !1, toolAliases: s } = {},
  l = getRuleNameMatchers(r),
  m = getToolMatchInfo(e, s),
) {
  if (r.ruleBehavior !== "allow" && e.mcpInfo !== void 0) {
    let d = { proxyExpansion: o, globMatching: n, toolAliases: s };
    if (m.otherDenyOrAskReads().some((T) => toolMatchesRuleName({ name: T.name }, r, d, l, T))) return !0;
    let p = standardKeyRuleRow(r.ruleValue.toolName, m.name);
    if (p !== void 0 && toolMatchesRuleName({ name: p.row }, withRuleToolName(p.rule, r), d)) return !0;
  }
  let u = m.name;
  if (r.ruleValue.toolName === u) return !0;
  let a = "familyParentToolName" in e ? e.familyParentToolName : void 0;
  if (a !== void 0 && e.mcpInfo === void 0 && r.ruleValue.toolName === a) return !0;
  if (o && toolNameVariants(r.ruleValue.toolName, s).includes(u)) return !0;
  let { matchesGlob: matchesGlob } = l;
  if (n && matchesGlob !== void 0 && (matchesGlob(u) || (o && m.aliasSources().some(matchesGlob)))) return !0;
  let coversMcpTool = l.coversMcpTool(m.mcpInfo());
  if (r.ruleBehavior === "allow") {
    if (!coversMcpTool) return !1;
    if (ruleWithinServerPrefix(r.ruleValue.toolName, e)) return !0;
    return (warnMcpRuleMismatch(r.ruleValue, e), !1);
  }
  return coversMcpTool || (isUserMcpServerRule(r) && m.mcpServerRuleNames().includes(r.ruleValue.toolName));
}
//@ chunk-sfy7bm1n.js:12599-12690 layout
function isUserMcpServerRule({ source: source, ruleValue: ruleValue }) {
  return source !== "mcpServerPolicy" && ruleValue.toolName.startsWith(MCP_TOOL_PREFIX);
}
//@ chunk-sfy7bm1n.js:12690-12824 layout
function getRuleNameMatchers({ ruleValue: { toolName: e } }) {
  let r, o;
  return {
    matchesGlob: hasWildcard(e) ? (n) => (r ??= eSr(e))(n) : void 0,
    coversMcpTool: (n) => (o ??= compileMcpRuleMatcher(e))(n),
  };
}
/**
 * 构造工具匹配信息（惰性计算）：工具名、MCP 信息、别名来源、MCP 服务器规则名、其他 deny/ask 读取名。
 */
//@ chunk-sfy7bm1n.js:12824-13030 layout
function getToolMatchInfo(e, r) {
  let o = getToolNameForPermissionCheck_2(e),
    n,
    s,
    l,
    m;
  return {
    name: o,
    mcpInfo: () => (m === void 0 ? (m = mcpInfoFromString(o)) : m),
    aliasSources: () => (n ??= aliasesFor(o, r)),
    mcpServerRuleNames: () => (s ??= getMcpServerRulePrefixes(e)),
    otherDenyOrAskReads: () => (l ??= getMcpToolAliasNames(e).map((u) => getToolMatchInfo({ name: u }, r))),
  };
}
//@ chunk-sfy7bm1n.js:13030-13086 file-local
function toolAlwaysAllowedRule(context, tool) {
  return getAllowRules(context).find((rule) => toolMatchesWholeToolRule(tool, rule)) || null;
}
/**
 * 该规则是否允许别名展开：cliArg 与 toolsNarrowing 来源不展开。
 */
//@ chunk-sfy7bm1n.js:13086-13158 layout
function allowsAliasExpansion(e) {
  return e.source !== "cliArg" && e.source !== "toolsNarrowing";
}
/**
 * 规则是否命中工具：按名字（含别名、glob）匹配，再检查 aliasSkillToolNames 与打包别名 skill 名。
 */
//@ chunk-sfy7bm1n.js:13158-13562 layout
function toolMatchesRule(e, r, o, n = getRuleNameMatchers(o), s, l = !1) {
  let m = { proxyExpansion: allowsAliasExpansion(o), globMatching: !0, toolAliases: e.toolAliases };
  if (toolMatchesRuleName(r, o, m, n, s)) return !0;
  if (
    ("aliasSkillToolNames" in r ? r.aliasSkillToolNames : void 0)?.some((f) =>
      toolMatchesRuleName({ name: f }, o, m, n),
    )
  )
    return !0;
  let a = "packagingAliasSkillToolNames" in r ? r.packagingAliasSkillToolNames : void 0;
  if (a === void 0 || (hasWildcard(o.ruleValue.toolName) && !Dar(l))) return !1;
  return a.some((f) => toolMatchesRuleName({ name: f }, o, m, n));
}
/**
 * 找命中该工具的 deny 规则（会话结束类工具除外），返回规则或 null。
 */
//@ chunk-sfy7bm1n.js:13562-13688 layout
function getDenyRuleForTool(e, r, o, n = !1) {
  if (isConversationEndTool(r)) return null;
  let s;
  return (
    (o ?? getDenyRules(e)).find((l) =>
      toolMatchesRuleWithAliases(r, l, e, void 0, (s ??= getToolMatchInfo(r, e.toolAliases)), n),
    ) || null
  );
}
//@ chunk-sfy7bm1n.js:13688-13729 layout
function isWildcardOnlyContent(e) {
  return /^[\s*]+$/.test(e);
}
//@ chunk-sfy7bm1n.js:13729-13834 layout
function isRootWildcardPathContent(e) {
  return e.startsWith("//") && /^\/(?:\*\*\/)?\*+(?:\/\*\*)?$/.test(e.replace(/\/{2,}/g, "/"));
}
//@ chunk-sfy7bm1n.js:13834-13929 layout
var EDIT_FAMILY_TOOLS = [FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME, NOTEBOOK_EDIT_TOOL_NAME],
  READ_FAMILY_TOOLS = [FILE_READ_TOOL_NAME, GREP_TOOL_NAME, GLOB_TOOL_NAME],
  BROAD_PATH_RULE_COVERAGE = new Map([
    [
      FILE_READ_TOOL_NAME,
      { deny: [...READ_FAMILY_TOOLS, FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME], ask: READ_FAMILY_TOOLS },
    ],
    [FILE_EDIT_TOOL_NAME, { deny: EDIT_FAMILY_TOOLS, ask: EDIT_FAMILY_TOOLS }],
  ]);
//@ chunk-sfy7bm1n.js:13929-14102 layout = getRuleByContentsForToolName (1)
function ruleCoversToolViaBroadContent(
  { ruleBehavior: ruleBehavior, ruleValue: { toolName: r, ruleContent: o } },
  n,
) {
  if (o === void 0 || ruleBehavior === "allow") return !1;
  return r === BASH_TOOL_NAME
    ? n === BASH_TOOL_NAME && isWildcardOnlyContent(o)
    : isRootWildcardPathContent(o) && (BROAD_PATH_RULE_COVERAGE.get(r)?.[ruleBehavior] ?? []).includes(n);
}
/**
 * 带别名的规则匹配：无内容规则走 toolMatchesRule；有内容规则检查别名来源上的宽泛内容是否覆盖该工具。
 */
//@ chunk-sfy7bm1n.js:14102-14330 layout
function toolMatchesRuleWithAliases(e, r, o, n, s, l = !1) {
  if (r.ruleValue.ruleContent === void 0) return toolMatchesRule(o, e, r, n, s, l);
  let { name: m, aliasSources: aliasSources } = s ?? getToolMatchInfo(e, o.toolAliases),
    a = r.ruleValue.toolName === m,
    f = allowsAliasExpansion(r);
  return aliasSources().some(
    (c) =>
      c !== m &&
      ((f && ruleCoversToolViaBroadContent(r, c)) ||
        (a && ruleCoversToolViaBroadContent(withRuleToolName(c, r), c))),
  );
}
//@ chunk-sfy7bm1n.js:14330-14397 layout
function withRuleToolName(e, r) {
  return { ...r, ruleValue: { ...r.ruleValue, toolName: e } };
}
/**
 * 规则名是否为模式名（glob 名或只到 MCP 服务器一级的名字）。
 */
//@ chunk-sfy7bm1n.js:14397-14480 layout
function isPatternRuleName(e) {
  if (hasWildcard(e)) return !0;
  let r = mcpInfoFromString(e);
  return r !== null && r.toolName === void 0;
}
/**
 * 为一组 deny 规则建索引：整名集合、模式规则、MCP 服务器名、带内容但经别名覆盖的规则等，供批量过滤工具池。
 */
//@ chunk-sfy7bm1n.js:14480-14932 layout
function buildDenyRuleIndex(e, r) {
  let o = new Set(),
    n = new Set(),
    s = new Set(),
    l = [],
    m = [];
  for (let u of r) {
    let { toolName: toolName, ruleContent: ruleContent } = u.ruleValue;
    if (ruleContent !== void 0) {
      if (
        Object.entries(e.toolAliases ?? {}).some(
          ([d, p]) =>
            ruleCoversToolViaBroadContent(u, d) ||
            (p === toolName && ruleCoversToolViaBroadContent(withRuleToolName(d, u), d)),
        )
      )
        m.push(u);
      continue;
    }
    if (isPatternRuleName(toolName) || ruleWithNormalizedServer(toolName)) {
      l.push({ rule: u, ruleName: getRuleNameMatchers(u) });
      continue;
    }
    if (isUserMcpServerRule(u)) s.add(toolName);
    n.add(toolName);
    let c = allowsAliasExpansion(u) ? toolNameVariants(toolName, e.toolAliases) : [toolName];
    for (let d of c) o.add(d);
  }
  return { names: o, parentNames: n, mcpServerNames: s, patterns: l, withContent: m };
}
//@ chunk-sfy7bm1n.js:14932-14991 layout
function getDenyRuleIndex(e) {
  let r = getDenyRules(e);
  return { rules: r, index: buildDenyRuleIndex(e, r) };
}
/**
 * 用 deny 规则索引判断工具是否被拒绝：名字、其他读名、父工具名、别名 skill 名、MCP 服务器名、模式规则、带内容的覆盖规则依次检查。
 */
//@ chunk-sfy7bm1n.js:14991-15938 layout
function isToolDeniedByIndex(e, r, o) {
  if (
    isConversationEndTool(o) ||
    (r.names.size === 0 && r.patterns.length === 0 && r.withContent.length === 0)
  )
    return !1;
  let n = getToolMatchInfo(o, e.toolAliases);
  if (r.names.has(n.name)) return !0;
  if (
    n
      .otherDenyOrAskReads()
      .some((u) => r.names.has(u.name) || u.mcpServerRuleNames().some((a) => r.mcpServerNames.has(a)))
  )
    return !0;
  let s = "familyParentToolName" in o ? o.familyParentToolName : void 0;
  if (s !== void 0 && o.mcpInfo === void 0 && r.parentNames.has(s)) return !0;
  let l = "aliasSkillToolNames" in o ? o.aliasSkillToolNames : void 0;
  if (l?.some((u) => r.names.has(u))) return !0;
  let m = "packagingAliasSkillToolNames" in o ? o.packagingAliasSkillToolNames : void 0;
  if (m?.some((u) => r.names.has(u))) return !0;
  if (
    r.mcpServerNames.size > 0 &&
    (n.mcpServerRuleNames().some((u) => r.mcpServerNames.has(u)) ||
      [...(l ?? []), ...(m ?? [])].some((u) =>
        getMcpServerRulePrefixes({ name: u }).some((a) => r.mcpServerNames.has(a)),
      ))
  )
    return !0;
  return (
    r.patterns.some(({ rule: rule, ruleName: ruleName }) =>
      toolMatchesRuleWithAliases(o, rule, e, ruleName, n),
    ) ||
    (n.aliasSources().length > 0 && r.withContent.some((u) => toolMatchesRuleWithAliases(o, u, e, void 0, n)))
  );
}
/**
 * 会话结束类工具是否被整工具 deny 拒绝（存在同名 allow 规则时不算）。
 */
//@ chunk-sfy7bm1n.js:15938-16133 layout
function isConversationEndToolDenied(e, r) {
  if (!isConversationEndTool(r)) return !1;
  if (getAllowRules(e).some((n) => n.ruleValue.toolName === r.name)) return !1;
  return getDenyRules(e).some((n) =>
    toolMatchesWholeToolRule(r, n, {
      proxyExpansion: allowsAliasExpansion(n),
      globMatching: !0,
      toolAliases: e.toolAliases,
    }),
  );
}
/**
 * 找 toolName 与 ruleContent 精确相等的 deny 规则（例如 Agent(type)）。
 */
//@ chunk-sfy7bm1n.js:16133-16236 layout = getDenyRuleForAgent (1)
function findDenyRuleWithContent(context, agentToolName, agentType) {
  return (
    getDenyRules(context).find(
      (rule) => rule.ruleValue.toolName === agentToolName && rule.ruleValue.ruleContent === agentType,
    ) || null
  );
}
/**
 * 找 toolName 与 ruleContent 精确相等的 ask 规则。
 */
//@ chunk-sfy7bm1n.js:16236-16340 layout = getDenyRuleForAgent (1)
function findAskRuleWithContent(context, agentToolName, agentType) {
  return (
    getAskRules(context).find(
      (rule) => rule.ruleValue.toolName === agentToolName && rule.ruleValue.ruleContent === agentType,
    ) || null
  );
}
/**
 * 按 Agent(type) deny 规则过滤代理列表。
 */
//@ chunk-sfy7bm1n.js:16340-16528 fingerprint = filterDeniedAgents (1)
function filterDeniedAgents(agents, context, agentToolName) {
  let deniedAgentTypes = new Set();
  for (let rule of getDenyRules(context))
    if (rule.ruleValue.toolName === agentToolName && rule.ruleValue.ruleContent !== void 0)
      deniedAgentTypes.add(rule.ruleValue.ruleContent);
  return agents.filter((agent) => !deniedAgentTypes.has(agent.agentType));
}
//@ chunk-sfy7bm1n.js:16528-16647 placement
function getAskRuleForTool(e, r, o) {
  if (isConversationEndTool(r)) return null;
  let n;
  return (
    (o ?? getAskRules(e)).find((s) =>
      toolMatchesRuleWithAliases(r, s, e, void 0, (n ??= getToolMatchInfo(r, e.toolAliases))),
    ) || null
  );
}
//@ chunk-sfy7bm1n.js:16647-16750 placement
function stringifyScalar(e) {
  if (e === void 0 || e === null) return null;
  if (typeof e !== "object") return String(e);
  return null;
}
//@ chunk-sfy7bm1n.js:16750-16901 placement
function parseFieldRuleContent(e) {
  let index = e.indexOf(":");
  if (index <= 0) return null;
  let trimmed = e.slice(0, index).trim(),
    trimmed_2 = e.slice(index + 1).trim();
  return trimmed === "" || trimmed_2 === "" ? null : { key: trimmed, expected: trimmed_2 };
}
//@ chunk-sfy7bm1n.js:16901-16999 placement
function formatRuleDeniedMessage(e, r) {
  return `Permission to use ${e} with ${r.ruleValue.ruleContent} has been denied.`;
}
//@ chunk-sfy7bm1n.js:16999-17029 placement
var MCP_RESOURCE_TOOLS = new Set([
  LISTMCPRESOURCESTOOL,
  READ_MCP_RESOURCE_DIR_TOOL_NAME,
  READMCPRESOURCETOOL,
  REFRESH_MCP_TOOLS_TOOL_NAME,
]);
/**
 * 匹配 "key: expected" 形式的字段规则：对工具（及其别名、家族、MCP 服务器）的同行为规则，取输入字段值做通配比较；MCP 资源工具的 server 字段与 skill 名特判。
 */
//@ chunk-sfy7bm1n.js:17029-18589 placement
function matchToolRule(context, tool, input, behavior) {
  let s = getToolNameForPermissionCheck_2(tool),
    l = [
      ...("aliasSkillToolNames" in tool ? (tool.aliasSkillToolNames ?? []) : []),
      ...("packagingAliasSkillToolNames" in tool ? (tool.packagingAliasSkillToolNames ?? []) : []),
    ],
    m = [
      [s, !1],
      ...getMcpToolAliasNames(tool).map((a) => [a, !1]),
      ...(tool.mcpInfo !== void 0 && isServerIdentityActive()
        ? (behavior === "deny" ? getDenyRules(context) : getAskRules(context))
            .map((a) => a.ruleValue.toolName)
            .filter((a) => {
              let f = standardKeyRuleRow(a, s);
              return f !== void 0 && f.rule === f.row;
            })
            .map((a) => [a, !1])
        : []),
      ...l.map((a) => [a, !1]),
      ...aliasesFor(s, context.toolAliases).map((a) => [a, !0]),
    ];
  for (let [a, f] of m) {
    let filtered = getContentRulesForToolName(context, a, behavior).filter(
      (d) => !f || allowsAliasExpansion(d),
    );
    for (let [d = "", p] of new Map(filtered.map((T) => [T.ruleValue.ruleContent, T]))) {
      let T = parseFieldRuleContent(d);
      if (T === null) continue;
      let { key: key, expected: expected } = T;
      if (key === tool.ruleContentField) continue;
      let E = key === DEVICE_2 && !Object.hasOwn(input, key) && Object.hasOwn(input, $r) ? $r : key;
      if (!Object.hasOwn(input, E)) continue;
      let g = stringifyScalar(input[E]);
      if (g === null) continue;
      if (matchWildcard(expected, g.trim())) return p;
      if (E === "server" && MCP_RESOURCE_TOOLS.has(a)) {
        let replaced = expected.replace(/[^a-zA-Z0-9_*-]/g, "_"),
          replaced_2 = replaced.replace(/_+/g, "_").replace(/_$/, "").replace(/_?\*/g, "*");
        if (
          [g.trim(), g]
            .map(normalizeNameForMCP)
            .flatMap((P) => [P, trimEndChars(P, "_").replace(/^_+/, "")])
            .some((P) =>
              expected.startsWith(yhe)
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
        E === $r &&
        (expected.includes("*")
          ? matchWildcard(expected.toLowerCase(), g.trim())
          : machineNameMatches(expected, g.trim()))
      )
        return p;
      if (s === SKILL && E === "skill") {
        let trimmed = g.trim(),
          h = toSyncedSkillAlias(trimmed);
        if (h !== void 0) {
          if ((!expected.includes("*") || isTopHostSession()) && matchWildcard(expected, h)) return p;
        }
      }
    }
  }
  let u = "familyParentToolName" in tool ? tool.familyParentToolName : void 0;
  if (u !== void 0 && tool.mcpInfo === void 0 && tool.toFamilyParentInput !== void 0)
    return matchToolRule(
      context,
      { name: u, ruleContentField: tool.ruleContentField },
      tool.toFamilyParentInput(input),
      behavior,
    );
  return null;
}
//@ chunk-sfy7bm1n.js:18589-18630 placement
function getContentRulesMapForTool(e, r, o) {
  return getContentRulesMapForToolName(e, getToolNameForPermissionCheck_2(r), o);
}
//@ chunk-sfy7bm1n.js:18630-18765 placement = getDenyRuleForAgent (1)
function getContentRulesMapForToolName(context, agentToolName, agentType) {
  let n = new Map();
  for (let s of getContentRulesForToolName(context, agentToolName, agentType))
    if (s.ruleValue.ruleContent !== void 0) n.set(s.ruleValue.ruleContent, s);
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
      rule.ruleValue.ruleContent !== void 0 &&
      rule.ruleBehavior === behavior
    )
      s.push(rule);
  return s;
}
/**
 * URL 类规则的精确域名：解析带类型前缀的规则内容，取出不含通配的域名；属于 WebFetch/浏览器类工具的规则族，误归入本模块。
 */
//@ chunk-8wvtd8sr.js:94302-94434 fingerprint = getDenyRuleForAgent (1)
function getRuleExactDomain(e) {
  let n = parseTypePrefixedValue(e.ruleValue.ruleContent ?? ""),
    s = n === void 0 ? void 0 : typeNameWithoutQuotes(n);
  return s === void 0 || s === "" || s.includes("*") ? void 0 : s;
}
/**
 * 取该工具的 URL 规则中与给定 URL 匹配的那些；属于 WebFetch/浏览器类工具的规则族。
 */
//@ chunk-8wvtd8sr.js:94434-94519 shared-adjacent = getDenyRuleForAgent (1)
function filterRulesMatchingUrls(e, n, s, r) {
  return getUrlRulesForTool(e, n, r).filter((rule) =>
    matchesWildcardPattern(rule.ruleValue.ruleContent ?? "", s),
  );
}
/**
 * 文件编辑权限结论（供编辑类 UI/预检用）：Edit 级 ask 规则或规则原因 → ask；mode 原因在 plan 下为带 plan 地板的 ask；allow 或 bypass/有 allow 规则且非安全检查 → allow；特定情况为 unseen。
 */
//@ chunk-8wvtd8sr.js:354927-355436 fingerprint = hasPermissionsToUseToolInner (0.45)
function getFileEditPermissionOutcome(tool, input, context) {
  let denyRule = getAskRuleForTool(input, FileEditTool);
  if (denyRule !== null) return { kind: "ask", reason: { type: "rule", rule: denyRule } };
  let h = tool.behavior === "ask" ? tool.decisionReason : void 0;
  if (h?.type === "rule") return { kind: "ask", reason: h };
  if (h?.type === "mode") return h.mode === "plan" ? { kind: "ask", planFloor: !0 } : { kind: "ask" };
  let y =
    tool.behavior === "allow" ||
    (h?.type !== "safetyCheck" &&
      (input.mode === "bypassPermissions" || toolAlwaysAllowedRule(input, FileEditTool) !== null));
  if (editAskClassifierRoutable(y ? void 0 : h, input, context)) return { kind: "unseen" };
  if (y) return { kind: "allow" };
  return h?.type === "safetyCheck" ? { kind: "ask", reason: h } : { kind: "ask" };
}
//@ chunk-0e8j1zzj.js:44090-44119 fingerprint = applyPermissionRulesToPermissionContext (1)
var RULE_ADDING_UPDATE_TYPES = new Set(["addRules"]);
/**
 * 由 disallowedTools 规则串构建过滤器：工具名集合、裸名集合、MCP 服务器级禁用，isToolDisallowed(tool) 综合判断（Bash 被禁时一并禁用 Monitor 等等价工具）。
 */
//@ chunk-0h4e7gnq.js:136066-136964 callgraph-witnessed = toolMatchesRule (0.205)
function buildDisallowedToolsFilter(e) {
  let n = e?.flatMap((w) => uniq([w, toInternalToolName(w)])),
    s = new Set(),
    y = new Set(),
    r = new Set(),
    S = !1;
  for (let w of n ?? []) {
    let { toolName: toolName, ruleContent: ruleContent } = permissionRuleValueFromString(w),
      nameForRuleMatch = Ngs(w);
    for (let ee of new Set(_O(nameForRuleMatch) ? [toolName, nameForRuleMatch] : [toolName]))
      if ((s.add(ee), !ruleContent)) y.add(ee);
    if (toolName === BASH_TOOL_NAME) for (let ee of toolsRunningCodeAsBash()) (s.add(ee), y.add(ee));
    let ruleInfo = mcpInfoFromString(toolName);
    if (ruleInfo !== null && (ruleInfo.toolName === void 0 || ruleInfo.toolName === "*"))
      if (ruleInfo.serverName === "*") S = !0;
      else r.add(ruleInfo.serverName);
  }
  let h = (w) => {
    if (!S && r.size === 0) return !1;
    let x = mcpInfoFromString(w)?.serverName;
    return x !== void 0 && (S || r.has(x));
  };
  return {
    disallowedToolSet: s,
    bareDisallowedToolSet: y,
    isServerLevelDisallowed: h,
    isToolDisallowed: (w) => {
      let toolInfo = getToolNameForPermissionCheck_3(w),
        L = builtinToolServedByMcp(w);
      return (
        toolMatchesAnyName(w, s) ||
        s.has(toolInfo) ||
        (L !== void 0 && s.has(L)) ||
        h(toolInfo) ||
        (w.mcpInfo !== void 0 && [...s].some((I) => mcpRuleMatchesToolAlias(I, w))) ||
        getMcpServerRulePrefixes(w).some((I) => s.has(I) || s.has(`${I}__*`)) ||
        (w.aliasSkillToolNames?.some((I) => s.has(I)) ?? !1) ||
        (w.packagingAliasSkillToolNames?.some((I) => s.has(I)) ?? !1) ||
        (ARTIFACT_TOOL_NAME !== null && s.has(ARTIFACT_TOOL_NAME) && (standsInForBuiltInArtifact?.(w) ?? !1))
      );
    },
  };
}
/**
 * 按键集合从 alwaysAskRules 中删除 ask 规则。
 */
//@ chunk-0wdgqhcf.js:53327-53451 fingerprint = getAskRules (0.546)
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
/**
 * 取权限上下文里的 alwaysAllowRules。
 */
//@ chunk-18hwfzwa.js:63873-63939 placement = createGetAppStateWithAllowedTools (1)
function getAlwaysAllowRules(appState) {
  return appState.toolPermissionContext.alwaysAllowRules;
}
/**
 * 构造 Chrome 工具的域名 allow 规则对象。
 */
//@ chunk-38x90rmj.js:8730-8822 fingerprint = getRuleByContentsForToolName (1)
function createChromeDomainAllowRule(e, o) {
  return {
    source: o,
    ruleBehavior: "allow",
    ruleValue: { toolName: CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL, ruleContent: e },
  };
}
//@ chunk-ddkccdnb.js:231-264 placement
var cpr = (o, r) => !isOfficialMarketplaceRef(o) && !hasSimilarMarketplaceName(o, r);
/**
 * 有命中的 ask 规则时把决策改为 ask（已是 ask 则补 matchedAskRule），保留改写过的输入；deny 不变。
 */
//@ chunk-dyjqn2aj.js:191-476 placement
async function applyAskRuleOverride(e, i, n) {
  if (i === null || e.behavior === "deny") return e;
  return e.behavior === "ask"
    ? { ...e, matchedAskRule: e.matchedAskRule ?? i }
    : {
        behavior: "ask",
        message: await n(),
        decisionReason: { type: "rule", rule: i },
        ...("updatedInput" in e && e.updatedInput !== void 0 && { updatedInput: e.updatedInput }),
      };
}
/**
 * 规则来源是否为会话级（cliArg、command、session）。
 */
//@ chunk-pc1rmcr2.js:3877-3941 fingerprint = PERMISSION_RULE_SOURCES (1)
function isSessionScopedRuleSource(e) {
  return e === "cliArg" || e === "command" || e === "session";
}
/**
 * 决策不能被绕过模式放行：含绕过免疫的安全检查或已签发重入、工具要求用户交互、调用方强制或仅限本人。
 */
//@ chunk-xde1fhwg.js:300-463 placement
function isBypassImmuneDecision(e, o, r) {
  if (findSafetyCheckReason(e.decisionReason, isBypassImmuneCircuitBreaker) !== void 0 || hasMintedReentry(r))
    return !0;
  if (o.requiresUserInteraction?.()) return !0;
  return e.forcedByCaller === !0 || e.personOnly === !0;
}
/**
 * 原因（含子命令递归）是否为非 allow 的规则原因，或读阻挡相关原因；第二参数选择检查哪一类。
 */
//@ chunk-xr4xc2mq.js:14991-15271 fingerprint = checkRuleBasedPermissions (0.395)
function isRuleOrReadBlockReason(e, r) {
  if (e?.type === "subcommandResults")
    return [...e.reasons.values()].some((n) => isRuleOrReadBlockReason(n.decisionReason, r));
  return r === "rule"
    ? e?.type === "rule" && e.rule.ruleBehavior !== "allow"
    : (e?.type === "safetyCheck" && e.circuitBreaker === "outsideReadsBlocked") ||
        (e?.type === "other" && e.reason === OUTSIDE_READS_BLOCKED_DENY_REASON);
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
  dKe,
  findDenyRuleWithContent,
  pKe,
  isConversationEndTool,
  buildToolsPausedMessage,
  TOOLS_HELD_UNTIL_A_PERSON_TYPES,
  withClassifiedWebCalls,
  O9n,
  isAgentToolPoolDenied,
  agentToolPoolDeniedMessage,
  isConversationEndToolDenied,
  checkRuleBasedPermissions,
  hasAutoModeClassifierDenyRules,
  isChainOnAllowActive,
  isWebToolClassifierRouted,
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
  answerUpdatesForMcpSkillAsk,
  matchToolRule,
  permissionGrantScope,
  isBypassImmuneDecision,
  isServerPolicyAskReason,
  isServerPolicyAskUnderPlanFloor,
  checkDeclarativePermissionLessServerPolicyAsks,
  askCeilingReason,
  obe,
  guardHookUpdatedInput,
  isInteractionStillOwed,
  getContentRulesMapForToolName,
  applyAskRuleOverride,
  toolAlwaysAllowedRule,
  filterRulesMatchingUrls,
  getRuleExactDomain,
  ebe,
  getFileEditPermissionOutcome,
  AWt,
  shouldClassifyEdits,
  Kjr,
  syncCompactEligibility,
  markCompactRequestSpent,
  PERMISSION_CHECK_CRASHED_REASON,
  Vjr,
  getDenyRuleIndex,
  buildDenyRuleIndex,
  isToolDeniedByIndex,
  isWildcardOnlyContent,
  hUo,
  deleteClassifierApproval,
  AL,
  consumeRepeatedToolCall,
  arePermissionHooksUnsettled,
  isAutoModeConsentFlowEnabled,
  parseToolInputForPermission,
  describePermissionCheckFault,
  isSettledPermissionResult,
  formatRuleDeniedMessage,
  parseFieldRuleContent,
  iwt,
  isCountedClassifierBlock,
  recordAutoModeSuccess,
  enforceAutoModeDenialLimits,
  recordAutoModeDenial,
  autoModeBlockedHelp,
  isPlanModeFloorReason,
  checkDeclarativePermission,
  serverHeldShellAllowSource,
  flaggedPartMessage,
  cpr,
  toolMatchesWholeToolRule,
  resetClassifierApprovals,
  Q0,
  _M,
  i2e,
  describeNonClassifierAllow,
  buildClassifierOnlyDenial,
  checkRuleBasedPermissionsOnToolHost,
  appendRuleAnnotation,
  XH,
  RL,
  countMcpPolicyRecheckSkipped,
  decideWithToolCheckHooks,
  personAskAfterHooks,
  enforceClassifierOnlyDecision,
  mcpAskVetoesStandingGrant,
  e_e,
  W5s,
  allowsAliasExpansion,
  mBo,
  isPatternRuleName,
  getMcpRuleClassifierRoute,
  P9n,
  I9n,
  findAskRuleWithContent,
  deletePermissionRule,
  isSessionScopedRuleSource,
  resetDenialStreakAfterUserApproval,
  markOutsideReadPromptSeen,
  persistBlockReadsOutsideWorkspace,
  $5s,
  stripAutoDenyFields,
  isAllowRuleIgnoredInAutoMode,
  swt,
  isRuleOrReadBlockReason,
  j5s,
};
