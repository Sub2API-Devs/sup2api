/**
 * utils/permissions/permissionSetup.ts
 *
 * 权限上下文初始化（CLI 参数、settings 规则、额外目录、bypass/auto 可用性）、启动模式决策、模式切换（进出 plan/auto 时剥离与恢复危险规则）、auto 闸门校验与不可用原因、危险/宽泛规则检测。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/permissionSetup.ts
 * pieces: chunk-4p0ppc72.js (1), chunk-7kt7c7a3.js (1), chunk-9rkt9tdt.js (2), chunk-e6aww6q8.js (8), chunk-gz7b768t.js (1), chunk-kswt4qha.js (64), chunk-sfy7bm1n.js (20), chunk-tr0s0d0k.js (2), chunk-zfbhezv9.js (79)
 * attribution: fingerprint 9, facade-exports 64, layout 50, placement 47, callgraph-fingerprint 2, file-local 4, affinity 2
 */
import { createHash } from "crypto";
import { relative, resolve } from "path";
import { HostScoped } from "../hostScoped.js";
import { createSignal, createLazySignal } from "../signal.js";
import {
  getRootSession,
  handlePlanModeTransition,
  handleAutoModeTransition,
  setHasExitedPlanMode,
  setNeedsAutoModeExitAttachment,
  getIsNonInteractiveSession,
  setSearchToolsOptIn,
  setTodoToolsOptIn,
  setToolsOmittedByLaunchList,
  getOriginalCwdOrNull,
  getIsRemoteMode,
  getAllowedSettingSources,
  getParentManagedSettingsInvalid,
  getRefusalFallbackModelLatch,
  getMainLoopModelOverride,
  releaseRefusalFallbackCarriedEffort,
} from "../../bootstrap/state.js";
import {
  SETTING_SOURCES,
  EDITABLE_SETTING_SOURCES,
  getEnabledSettingSources,
  REPO_DIR_SETTING_SOURCES,
  isSettingSourceEnabled,
} from "../settings/constants.js";
import {
  getSettingsFilePathForSource,
  getSettings_DEPRECATED,
  getSettingsForSource,
  getPolicySettingsOrigin,
  getVouchedPolicyTierSettings,
  getUseAutoModeDuringPlan,
  isDisabledAboveWorkloadFiles,
  getEffectiveSettingSource_2,
  updateSettingsForSource,
  getFatalAdminPolicyLoadErrors,
  getPolicySettingsLoadErrors,
  parentManagedTierParticipates,
  getSettingsParseErrorsForSource,
  hasVouchedSkipDangerousModePermissionPrompt,
  isAutoModeClassifyAllShellEnabled,
} from "../settings/settings.js";
import { getCwdOrNull } from "../cwd.js";
import {
  permissionRuleValueFromString,
  canonicalToolName,
  hasWildcard,
  legacyToolNamesFor,
} from "./permissionRuleParser.js";
import {
  DANGEROUS_BASH_PATTERNS,
  NETWORK_COMMAND_PREFIXES,
  CLUSTER_COMMAND_PREFIXES,
  DANGEROUS_BASH_RULE_PREFIXES,
  SUBCOMMAND_CHECKED_COMMANDS,
  DANGEROUS_SUBCOMMANDS,
  CROSS_PLATFORM_CODE_EXEC,
} from "./dangerousPatterns.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  isGrowthBookCacheEmpty,
  getDynamicConfig_BLOCKS_ON_INIT,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
  PLUGIN_HOOKS_MODULES_GATE,
  isGrowthBookEnabled,
} from "../../services/analytics/growthbook.js";
import { env } from "../env.js";
import { applyValidatedPermissionUpdate } from "./PermissionUpdate.js";
import {
  collectRulesFromSettings,
  applyPermissionRulesToPermissionContext,
  getAllowRules,
  getDenyRules,
  getAskRules,
} from "./permissions.js";
import { logForDebugging } from "../debug.js";
import { formatPermissionRule, NEGATION_PREFIX, splitRuleList } from "./disallowedToolsFlag.js";
import {
  mcpInfoFromString,
  getMcpPrefix as getMcpPrefix_2,
  buildMcpToolName,
  getToolNameForPermissionCheck as getToolNameForPermissionCheck_2,
  MCP_TOOL_PREFIX,
} from "../../services/mcp/mcpStringUtils.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { isPlainObject } from "../isPlainObject.js";
import { isCertifiedCommandRule } from "../../tools/BashTool/certifiedCommands.js";
import {
  setProvisionalStartupMode,
  isAutoModeActive,
  setAutoModeActive,
  setAutoModeFromFallback,
  setAutoStartWithheldForHipaaTaint,
  getProvisionalStartupMode,
  isAutoModeCircuitBroken,
  setAutoModeCircuitBroken,
  setAutoModeFastModeBreakerReason,
  getAutoModeFlagCli,
  isAutoModeFromFallback,
  setPlanAutoModeOffAtLaunch,
  isPlanAutoModeOffAtLaunch,
  getAutoModeFastModeBreakerReason,
} from "./autoModeState.js";
import { logPermissionModeChanged } from "../telemetry/thirdPartyEventRecords.js";
import {
  parsePermissionMode,
  UNRECOGNIZED_PERMISSION_MODE_ERROR,
  normalizePermissionModeAlias,
} from "../../types/permissions.js";
import {
  RESTRICTED_BYPASS_NOTICE,
  isCodeExecutionTool,
  presetExclusions,
} from "../../services/mcp/redactMcpErrors.js";
import {
  defaultPresetToolNames,
  toolsRunningCodeAsBash,
  codeExecutionToolNames,
} from "./filterToolsByDenyRules.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { SHELL_TOOL_NAMES, isBashAvailable, isPowerShellToolEnabled } from "../shell/shellToolUtils.js";
import { GET_TASK_TOOL_TEXT } from "../../remote/tools/nativeToolErrors.js";
import { RETIRED_TOOL_NAMES } from "../../tools/retiredTools.js";
import { getPlatform } from "../platform.js";
import { safeResolvePath, getFsImplementation } from "../fsOperations.js";
import { takeRelaunchBaselineMode, takeProactivityDecided } from "../proactivityRelaunch.js";
import { isScrubEnabled } from "../subprocessEnv.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { uniq } from "../collections.js";
import { ENTER_WORKTREE_TOOL_NAME } from "../../tools/EnterWorktreeTool/constants.js";
import { EXIT_WORKTREE_TOOL_NAME } from "../../tools/ExitWorktreeTool/constants.js";
import { validateWildcardToolName, validatePermissionRule } from "../settings/permissionValidation.js";
import { TODO_TOOL_NAMES } from "../model/legacyModelNames.js";
import { logEvent } from "../../services/analytics/index.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import {
  workspacePersistedTrustThroughBackend,
  getGlobalConfig,
  saveGlobalConfig,
  getCachedClientDataStrict,
} from "../config.js";
import {
  loadAllPermissionRulesFromDisk,
  shouldAllowManagedPermissionRulesOnly,
  additionalDirectoryProvenance,
  loadTrustedAdditionalDirectoriesFromDisk,
} from "./permissionsLoader.js";
import { fromEnumArr, fromEnumOpt, lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { getEntrypointKind, isCoworkAny } from "../entrypointKinds.js";
import { readBlockExemptPathsInSettings, isReadBlockOn, isWriteBlockOn } from "./readBlock.js";
import { isActionSummaryEnabled } from "./actionSummary.js";
import { expandPath } from "../path.js";
import { validateDirectoryForWorkspace, addDirHelpMessage } from "../../commands/add-dir/validation.js";
import { mappedDriveSpellings } from "../remoteEnvironment.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { capitalize } from "../stringUtils.js";
import { getMainLoopModel, isUnservedModelSpelling, isAntInternalFastModelId } from "../model/model.js";
import { getAutoModeModelSupport, modelSupportsAutoMode } from "../betas.js";
import { isProactivityActive } from "../../Tool.js";
import { toExternalPermissionMode, permissionModeFromString } from "./PermissionMode.js";
import { permissionModeForProactivityLevel } from "./getNextPermissionMode.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { parseEffortValue, resolveEffortKeyword } from "../effort.js";
import { isEnvTruthy } from "../envUtils.js";
import { narrowerMode } from "./browserToolNames.js";
import { isVsCodeTopSession } from "../sessionShape.js";
import { shortHash } from "../shortHash.js";
import { autoDefaultVerdictState } from "../../services/policyLimits/policyVerdicts.js";
import { hasComplianceTaint } from "../../services/policyLimits/complianceTaints.js";
import { isModelAllowed, getOrgModelDefaultUpdatedAt, getOrgModelDefault } from "../model/modelAllowlist.js";
import { parseUserSpecifiedModel } from "../model/modelDisplay.js";
import { getDefaultMainLoopModel } from "../model/modelFallback.js";
import { isServedCatalogActive } from "../model/modelCatalog/servedCatalog.js";
import {
  getOrgLockedDefaultModel,
  getBootstrapOrgDefaultEffect,
  stepDownRestrictedFamilyAliasPick,
} from "../model/planModeModel.js";
import { isWindowSilentDefaultPick } from "../model/defaultModel.js";
import { remoteAppendSystemPrompt } from "../settings/policyHelper/helperRemote.js";
import { getEligibilityMemo } from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { getRemoteManagedSettingsSyncFromCache } from "../../services/remoteManagedSettings/remoteSettingsCache.js";
import { isBgSession } from "../concurrentSessions.js";
import { strippedCanonicalName } from "../model/canonicalModelName.js";
import { logError } from "../log.js";
import { toError } from "../errors.js";
import { identity } from "../identity.js";
import { mcpRuleMatchesToolAny } from "../../services/mcp/serverIdentity.js";
import { AGENT } from "../../tools/AgentTool/constants.js";
import { MONITOR } from "../../tools/MonitorTool/constants.js";
import { READMCPRESOURCETOOL } from "../../tools/ReadMcpResourceTool/prompt.js";
import { READ_MCP_RESOURCE_DIR_TOOL_NAME } from "../../tools/ReadMcpResourceDirTool/prompt.js";
import {
  readsCredentialStore,
  credentialCommandIn,
  HOST_CREDENTIAL_RULE_SOURCE,
  keychainCommands,
  bashPrefixRule,
} from "../../remote/tools/serve/credentialPathGuards.js";
import { commandReachesSettings } from "../../remote/tools/serve/servedPathJudgement.js";
import { HOOKS_MODULES_DEFAULT } from "../../services/analytics/growthbookCredentials.js";
import { f, CLASSIFIER_FEATURE_DEFAULTS } from "./classifierModelConfig.js";

//@ chunk-zfbhezv9.js:2071-2094 placement
var permissionModeSignalSlot = new HostScoped(() => createSignal());
//@ chunk-zfbhezv9.js:2094-2131 placement
function hostPermissionModeSignal() {
  return permissionModeSignalSlot.of(getRootSession().host);
}
//@ chunk-zfbhezv9.js:2131-2145 placement
/**
 * permissionModeSignal：权限模式变化的惰性信号。
 */
var permissionModeSignal = createLazySignal(hostPermissionModeSignal);
//@ chunk-zfbhezv9.js:2145-2164 layout
var BASE_TOOLS_PRESETS = ["default"];
//@ chunk-zfbhezv9.js:2164-2241 layout
function getBaseToolsPreset(value) {
  let lower = value.toLowerCase();
  if (!BASE_TOOLS_PRESETS.includes(lower)) return null;
  return lower;
}
//@ chunk-zfbhezv9.js:2278-2347 layout
function sha256OfLines(e) {
  return createHash("sha256")
    .update(
      e.join(`
`),
    )
    .digest("hex");
}
//@ chunk-zfbhezv9.js:2347-2469 file-local
/**
 * 规则来源的显示名：settings 层显示文件路径（相对 cwd 更短时用相对路径），其他来源原样。
 */
function formatPermissionSource(source) {
  if (SETTING_SOURCES.includes(source)) {
    let filePath = getSettingsFilePathForSource(source);
    if (filePath) {
      let cwdOrNull = getCwdOrNull();
      let r = cwdOrNull === null ? filePath : relative(cwdOrNull, filePath);
      return r.length < filePath.length ? r : filePath;
    }
  }
  return source;
}
//@ chunk-zfbhezv9.js:2469-3011 facade-exports = findDangerousClassifierPermissions (1)
/**
 * 找出会绕过 auto 分类器的危险 allow 规则（sme：Bash/PowerShell 整工具或解释器/网络前缀、MCP 等），含 --allowed-tools 的规则。
 */
function findDangerousClassifierPermissions(rules, cliAllowedTools) {
  let dangerous = [];
  for (let rule of rules)
    if (
      rule.ruleBehavior === "allow" &&
      isDangerousClassifierPermission(rule.ruleValue.toolName, rule.ruleValue.ruleContent)
    ) {
      let ruleString = rule.ruleValue.ruleContent
        ? `${rule.ruleValue.toolName}(${rule.ruleValue.ruleContent})`
        : `${rule.ruleValue.toolName}(*)`;
      dangerous.push({
        ruleValue: rule.ruleValue,
        source: rule.source,
        ruleDisplay: ruleString,
        sourceDisplay: formatPermissionSource(rule.source),
      });
    }
  for (let toolSpec of cliAllowedTools) {
    let n = permissionRuleValueFromString(toolSpec);
    if (isDangerousClassifierPermission(n.toolName, n.ruleContent))
      dangerous.push({
        ruleValue: n,
        source: "cliArg",
        ruleDisplay: n.ruleContent ? `${n.toolName}(${n.ruleContent})` : `${n.toolName}(*)`,
        sourceDisplay: "--allowed-tools",
      });
  }
  return dangerous;
}
//@ chunk-zfbhezv9.js:3011-3100 facade-exports
/**
 * bypass 相关提示常量：后台会话未同意 bypass 能力的通知、--allow-dangerously-skip-permissions 被忽略的警告；ALL_DANGEROUS_COMMAND_PREFIXES 合并 Bash 危险前缀与其他两张表。
 */
var BG_UNCONSENTED_BYPASS_CAPABILITY_NOTICE = `--allow-dangerously-skip-permissions ignored: ${BYPASS_CONSENT_MESSAGE_2}`;
var ALL_DANGEROUS_COMMAND_PREFIXES = [
  ...DANGEROUS_BASH_PATTERNS,
  ...NETWORK_COMMAND_PREFIXES,
  ...CLUSTER_COMMAND_PREFIXES,
];
//@ chunk-zfbhezv9.js:3100-3152 layout
function isBareOrStarContent(ruleContent) {
  return ruleContent === undefined || /^[\s*]+$/.test(ruleContent);
}
//@ chunk-zfbhezv9.js:3152-3176 layout
function isAntOnlyDangerousContent(ruleContent) {
  return false;
}
//@ chunk-zfbhezv9.js:3176-3354 layout
/**
 * 宽泛 shell 规则分类（遥测用）：powershell / bare / cluster / network / ace（任意代码执行）。
 */
function categorizeBroadShellRule(ruleValue) {
  if (ruleValue.toolName === POWERSHELL_TOOL_NAME) return "powershell";
  let ruleContent = ruleValue.ruleContent;
  if (ruleContent === undefined || isBareOrStarContent(ruleContent)) return "bare";
  if (matchesDangerousCommandPrefix(ruleContent, CLUSTER_COMMAND_PREFIXES)) return "cluster";
  if (matchesDangerousCommandPrefix(ruleContent, NETWORK_COMMAND_PREFIXES)) return "network";
  return "ace";
}
//@ chunk-zfbhezv9.js:3354-3584 facade-exports
function isOverlyBroadBashAllowRule(e, s = false) {
  {
    let { APPIFACT_REPL_TOOL_NAME } = require("./chunk-q973gz0n.js");
    if (e.toolName === APPIFACT_REPL_TOOL_NAME) return isBareOrStarContent(e.ruleContent);
  }
  if (e.toolName !== BASH_TOOL_NAME) return false;
  let ruleContent = e.ruleContent;
  if (ruleContent === undefined || isBareOrStarContent(ruleContent) || isAntOnlyDangerousContent(ruleContent))
    return true;
  return s && matchesDangerousCommandPrefix(ruleContent, ALL_DANGEROUS_COMMAND_PREFIXES);
}
//@ chunk-zfbhezv9.js:3584-3646 layout
function isBareBashRule(ruleValue) {
  return ruleValue.toolName === BASH_TOOL_NAME && ruleValue.ruleContent === undefined;
}
//@ chunk-zfbhezv9.js:3646-3703 facade-exports = isOverlyBroadBashAllowRule (1)
function isOverlyBroadPowerShellAllowRule(ruleValue) {
  return ruleValue.toolName === POWERSHELL_TOOL_NAME && isBareOrStarContent(ruleValue.ruleContent);
}
//@ chunk-zfbhezv9.js:3703-3937 facade-exports
function isYoloEquivStripEnabledForEntrypoint() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_ant_yolo_equiv_strip_config",
    {},
  );
  if (!featureValue_CACHED_MAY_BE_STALE.enabled) return false;
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT ?? "cli";
  if (featureValue_CACHED_MAY_BE_STALE.includeEntrypoints)
    return featureValue_CACHED_MAY_BE_STALE.includeEntrypoints.includes(CLAUDE_CODE_ENTRYPOINT);
  return !(featureValue_CACHED_MAY_BE_STALE.excludeEntrypoints ?? []).includes(CLAUDE_CODE_ENTRYPOINT);
}
//@ chunk-zfbhezv9.js:3937-4423 facade-exports = findDangerousClassifierPermissions (1)
function findOverlyBroadBashPermissions(rules, cliAllowedTools, o = false) {
  let dangerous = [];
  for (let rule of rules)
    if (rule.ruleBehavior === "allow" && isOverlyBroadBashAllowRule(rule.ruleValue, o))
      dangerous.push({
        ruleValue: rule.ruleValue,
        source: rule.source,
        ruleDisplay: rule.ruleValue.ruleContent
          ? `${rule.ruleValue.toolName}(${rule.ruleValue.ruleContent})`
          : `${rule.ruleValue.toolName}(*)`,
        sourceDisplay: formatPermissionSource(rule.source),
      });
  for (let toolSpec of cliAllowedTools) {
    let d = permissionRuleValueFromString(toolSpec);
    if (isOverlyBroadBashAllowRule(d, o))
      dangerous.push({
        ruleValue: d,
        source: "cliArg",
        ruleDisplay: d.ruleContent ? `${d.toolName}(${d.ruleContent})` : `${d.toolName}(*)`,
        sourceDisplay: "--allowed-tools",
      });
  }
  return dangerous;
}
//@ chunk-zfbhezv9.js:4423-4748 facade-exports = findOverlyBroadBashPermissions (1)
function findOverlyBroadPowerShellPermissions(rules, cliAllowedTools) {
  let overlyBroad = [];
  for (let rule of rules)
    if (rule.ruleBehavior === "allow" && isOverlyBroadPowerShellAllowRule(rule.ruleValue))
      overlyBroad.push({
        ruleValue: rule.ruleValue,
        source: rule.source,
        ruleDisplay: `${POWERSHELL_TOOL_NAME}(*)`,
        sourceDisplay: formatPermissionSource(rule.source),
      });
  for (let toolSpec of cliAllowedTools) {
    let parsed = permissionRuleValueFromString(toolSpec);
    if (isOverlyBroadPowerShellAllowRule(parsed))
      overlyBroad.push({
        ruleValue: parsed,
        source: "cliArg",
        ruleDisplay: `${POWERSHELL_TOOL_NAME}(*)`,
        sourceDisplay: "--allowed-tools",
      });
  }
  return overlyBroad;
}
//@ chunk-zfbhezv9.js:4748-4773 facade-exports
function overlyBroadShellAllowsStrippedByEverySession(e) {
  return [];
}
//@ chunk-zfbhezv9.js:4773-4839 layout
function isRemovableRuleSource(source) {
  return EDITABLE_SETTING_SOURCES.includes(source) || source === "session" || source === "cliArg";
}
//@ chunk-zfbhezv9.js:4839-5085 facade-exports = removeDangerousPermissions (1)
/**
 * 按来源分组，用 removeRules 从上下文删掉给定的危险 allow 规则（默认只删可编辑层、session、cliArg）。
 */
function removeDangerousPermissions(context, permissions, includeReadOnlySources = false) {
  let rulesBySource = new Map();
  for (let perm of permissions) {
    if (!includeReadOnlySources && !isRemovableRuleSource(perm.source)) continue;
    let destination = perm.source;
    let existing = rulesBySource.get(destination) || [];
    existing.push(perm.ruleValue);
    rulesBySource.set(destination, existing);
  }
  let updatedContext = context;
  for (let [destination, rules] of rulesBySource)
    updatedContext = applyValidatedPermissionUpdate(updatedContext, {
      type: "removeRules",
      rules,
      behavior: "allow",
      destination,
    });
  return updatedContext;
}
//@ chunk-zfbhezv9.js:5085-5574 facade-exports = stripDangerousPermissionsForAutoMode (0.965)
/**
 * 进入 auto（或 plan+auto）时剥离危险 allow 规则，并把它们按来源存入 strippedDangerousRules 以便退出时恢复。
 */
function stripDangerousPermissionsForAutoMode(context) {
  let rules = collectRulesFromSettings(context.alwaysAllowRules, "allow");
  let dangerousPermissions = findDangerousClassifierPermissions(rules, []);
  if (dangerousPermissions.length === 0)
    return context.strippedDangerousRules !== undefined
      ? context
      : {
          ...context,
          strippedDangerousRules: {},
        };
  for (let permission of dangerousPermissions)
    logForDebugging(
      `Ignoring dangerous permission ${permission.ruleDisplay} from ${permission.sourceDisplay} (bypasses classifier)`,
    );
  let stripped = {};
  for (let [key, value] of Object.entries(context.strippedDangerousRules ?? {}))
    if (value) stripped[key] = [...value];
  for (let perm of dangerousPermissions) {
    let d = formatPermissionRule(perm.ruleValue);
    let l = (stripped[perm.source] ??= []);
    if (!l.includes(d)) l.push(d);
  }
  return {
    ...removeDangerousPermissions(context, dangerousPermissions, true),
    strippedDangerousRules: stripped,
  };
}
//@ chunk-zfbhezv9.js:5574-6415 facade-exports
/**
 * 给权限上下文设置 toolAliases：tengu_sorted_zebra 打开时，对映射到 MCP 工具的危险工具别名登记为“会运行代码的 MCP 工具”，无法登记时告警（该工具的 allow 规则将绕过分类器）；最后按需重新剥离危险规则。
 */
function withToolAliases(toolPermissionContext, toolAliases, o = []) {
  let r = {
    ...toolPermissionContext,
    toolAliases,
  };
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_sorted_zebra", false)) return r;
  for (let [key, value] of Object.entries(toolAliases ?? {})) {
    if (key.startsWith("mcp__") || !isDangerousClassifierPermission(key, undefined)) continue;
    let l = typeof value === "string" ? mcpInfoFromString(value) : null;
    if (l?.toolName) {
      addMcpToolAlias(l.serverName, [l.toolName]);
      logFeatureOk("auto_mode_tool_alias");
      continue;
    }
    let u = env.CLAUDE_AGENT_SDK_MCP_NO_PREFIX && typeof value === "string" && value !== "" && l === null;
    if (u && o.length > 0) {
      for (let y of o) addMcpToolAlias(y, [value]);
      logFeatureOk("auto_mode_tool_alias");
      continue;
    }
    logFeatureSad("auto_mode_tool_alias", u ? "no_sdk_server" : "target_not_mcp_tool");
    logForDebugging(
      `Auto mode: toolAliases maps ${key} to ${typeof value === "string" ? value : `a value of type ${typeof value}`}, ${u ? "and no SDK MCP server is registered that could hold it" : "which is not of the form mcp__<server>__<tool>"}, so an allow rule for that tool still runs its calls without the classifier's check`,
      {
        level: "warn",
      },
    );
  }
  return withRulesSetAsideAgain(r);
}
//@ chunk-zfbhezv9.js:6415-7160 facade-exports
/**
 * 登记 SDK 宿主声明的会运行代码的 MCP 工具（codeRunningMcpTools：服务器名 → 工具名列表），畸形项计数并告警；返回规范化后的映射。
 */
function declareSdkHostCodeRunningMcpTools(codeRunningMcpTools) {
  let s = isPlainObject(codeRunningMcpTools);
  let o = new Map();
  let r = s ? 0 : 1;
  for (let [n, d] of s ? Object.entries(codeRunningMcpTools) : []) {
    if (n === "" || n.startsWith("mcp__") || !Array.isArray(d)) {
      r++;
      continue;
    }
    for (let l of d)
      if (typeof l === "string" && l !== "" && !l.startsWith("mcp__")) {
        addMcpToolAlias(n, [l]);
        let u = o.get(n) ?? [];
        if (!u.includes(l)) u.push(l);
        o.set(n, u);
      } else r++;
  }
  if (o.size > 0) logFeatureOk("auto_mode_code_running_mcp_tools");
  if (r > 0) {
    logFeatureSad("auto_mode_code_running_mcp_tools", "malformed_entry");
    logForDebugging(
      `Auto mode: ignored ${r} malformed ${r === 1 ? "part" : "parts"} of codeRunningMcpTools, which should map each MCP server name to a list of tool names, e.g. {"workspace": ["bash"]}. In auto mode, allow rules and hooks can still approve calls to the tools meant there without the classifier.`,
      {
        level: "warn",
      },
    );
  }
  return Object.fromEntries(o);
}
//@ chunk-zfbhezv9.js:7160-7225 facade-exports = _temp3 (0.739)
/**
 * 上下文已处于“剥离过危险规则”状态时，重新执行剥离（新规则加入后保持剥离）。
 */
function withRulesSetAsideAgain(state_1) {
  return state_1.strippedDangerousRules === undefined
    ? state_1
    : stripDangerousPermissionsForAutoMode(state_1);
}
//@ chunk-zfbhezv9.js:7225-7549 facade-exports = restoreDangerousPermissions (0.868)
/**
 * 退出 auto 时把 strippedDangerousRules 里的规则加回（command 来源过滤掉 cBo 命中的项），并清空暂存。
 */
function restoreDangerousPermissions(context) {
  let stash = context.strippedDangerousRules;
  if (!stash) return context;
  let result = context;
  for (let [key, value] of Object.entries(stash)) {
    if (!value || value.length === 0) continue;
    let d = key === "command" ? value.filter((l) => !isCertifiedCommandRule(l)) : [...value];
    if (d.length === 0) continue;
    result = applyValidatedPermissionUpdate(result, {
      type: "addRules",
      rules: d.map(permissionRuleValueFromString),
      behavior: "allow",
      destination: key,
    });
  }
  return {
    ...result,
    strippedDangerousRules: undefined,
  };
}
//@ chunk-zfbhezv9.js:7549-7816 facade-exports
/**
 * 重建上下文时保留旧上下文的模式状态（mode、prePlanMode、startupModeDecidedByProactivityLevel），allow 规则与暂存的危险规则只保留新上下文中仍存在的项。
 */
function undonePermissionContext(previous, next) {
  return {
    ...next,
    mode: previous.mode,
    prePlanMode: previous.prePlanMode,
    startupModeDecidedByProactivityLevel: previous.startupModeDecidedByProactivityLevel,
    alwaysAllowRules: intersectWithCurrentRules(previous.alwaysAllowRules, next),
    strippedDangerousRules:
      previous.strippedDangerousRules && intersectWithCurrentRules(previous.strippedDangerousRules, next),
  };
}
//@ chunk-zfbhezv9.js:7816-8135 layout
function intersectWithCurrentRules(e, s) {
  let reduced = Object.keys(e).reduce(
    (acc, key) => {
      let d = s.strippedDangerousRules?.[key] ?? [];
      let l = new Set([
        ...(s.alwaysAllowRules[key] ?? []),
        ...(key === "command" ? d.filter((P) => !isCertifiedCommandRule(P)) : d),
      ]);
      let u = e[key] ?? [];
      let filtered = u.filter((P) => l.has(P));
      acc.rules[key] = filtered;
      acc.dropped ||= filtered.length !== u.length;
      return acc;
    },
    {
      rules: {},
      dropped: false,
    },
  );
  return reduced.dropped ? reduced.rules : e;
}
//@ chunk-zfbhezv9.js:8135-8678 facade-exports = transitionPermissionMode (0.699)
/**
 * 模式切换的统一入口：记录切换事件；进入 plan 走 prepareContextForPlanMode；进入使用分类器的模式（auto）要求闸门开启并剥离危险规则，离开时恢复；离开 plan 时清掉 prePlanMode。
 */
function transitionPermissionMode(fromMode, toMode, context, trigger) {
  if (fromMode === toMode) return context;
  if (context.startupModeDecidedByProactivityLevel !== undefined)
    context = {
      ...context,
      startupModeDecidedByProactivityLevel: undefined,
    };
  setProvisionalStartupMode(undefined);
  logPermissionModeChanged({
    from: fromMode,
    to: toMode,
    trigger,
  });
  handlePlanModeTransition(fromMode, toMode);
  handleAutoModeTransition(fromMode, toMode);
  if (fromMode === "plan" && toMode !== "plan") setHasExitedPlanMode(true);
  if (toMode === "plan" && fromMode !== "plan") return prepareContextForPlanMode(context);
  let fromUsesClassifier = fromMode === "auto" || (fromMode === "plan" && isAutoModeActive());
  let toUsesClassifier = toMode === "auto";
  if (toUsesClassifier && !fromUsesClassifier) {
    if (!isAutoModeGateEnabled()) throw Error("Cannot transition to auto mode: gate is not enabled");
    setAutoModeActive(true);
    context = stripDangerousPermissionsForAutoMode(context);
  } else if (fromUsesClassifier && !toUsesClassifier) {
    setAutoModeActive(false);
    setNeedsAutoModeExitAttachment(true);
    context = restoreDangerousPermissions(context);
  }
  if (fromMode === "plan" && toMode !== "plan" && context.prePlanMode)
    return {
      ...context,
      prePlanMode: undefined,
    };
  return context;
}
//@ chunk-zfbhezv9.js:8678-8708 facade-exports
async function isBypassPermissionsDeniedOutsideSandbox() {
  return false;
}
//@ chunk-zfbhezv9.js:8708-8851 layout
var AUTO_MODE_UNAVAILABLE_FEATURE_KEYS = {
  settings: "auto_mode_settings",
  "circuit-breaker": "auto_mode_circuit_breaker",
  "fast-mode": "auto_mode_fast_mode",
  model: "auto_mode_model",
};
//@ chunk-zfbhezv9.js:8851-9453 facade-exports = handleSetPermissionMode (0.455)
/**
 * 设置权限模式前的守卫：模式名非法、bypass 在 --restricted 下、被设置禁用或会话未以 --dangerously-skip-permissions 启动、auto 不可用时返回 {ok:false, error, code}。
 */
function guardPermissionModeChange(mode, toolPermissionContext) {
  let permissionMode = parsePermissionMode(mode);
  if (permissionMode === undefined)
    return {
      ok: false,
      error: UNRECOGNIZED_PERMISSION_MODE_ERROR,
      code: "invalid_mode",
    };
  if (permissionMode === "bypassPermissions") {
    if (toolPermissionContext.restricted)
      return {
        ok: false,
        error: RESTRICTED_BYPASS_NOTICE,
        code: "bypass_restricted",
      };
    if (isBypassPermissionsModeDisabled())
      return {
        ok: false,
        error:
          "Cannot set permission mode to bypassPermissions because it is disabled by settings or configuration",
        code: "bypass_disabled",
      };
    if (!toolPermissionContext.isBypassPermissionsModeAvailable)
      return {
        ok: false,
        error:
          "Cannot set permission mode to bypassPermissions because the session was not launched with --dangerously-skip-permissions",
        code: "bypass_not_launched",
      };
  }
  if (permissionMode === "auto" && !isAutoModeGateEnabled())
    return refuseAutoMode(getAutoModeUnavailableReason());
  return {
    ok: true,
    mode: permissionMode,
  };
}
//@ chunk-zfbhezv9.js:9453-9612 facade-exports
/**
 * auto 不可用时的拒绝结果，错误文字与代码按不可用原因生成。
 */
function refuseAutoMode(autoModeUnavailableReason) {
  return {
    ok: false,
    error: autoModeUnavailableReason
      ? `Cannot set permission mode to auto: ${getAutoModeUnavailableNotification(autoModeUnavailableReason)}`
      : "Cannot set permission mode to auto",
    code: autoModeUnavailableReason
      ? AUTO_MODE_UNAVAILABLE_FEATURE_KEYS[autoModeUnavailableReason]
      : "auto_mode_unavailable",
  };
}
//@ chunk-zfbhezv9.js:9612-9871 facade-exports
/**
 * 带守卫地设置权限模式：守卫通过后在 setter 内对最新上下文再守卫一次并调用 transitionPermissionMode，成功后异步发出模式变化事件。
 */
function setPermissionModeWithGuards(e, toolPermissionContext, o, r) {
  let n = guardPermissionModeChange(e, toolPermissionContext);
  if (!n.ok) return n;
  let mode = n.mode;
  let l;
  o((u) => {
    if (u.mode === mode) return u;
    if (u !== toolPermissionContext) {
      let P = guardPermissionModeChange(mode, u);
      if (!P.ok) {
        l = P;
        return u;
      }
    }
    return {
      ...transitionPermissionMode(u.mode, mode, u, r),
      mode,
    };
  });
  if (l !== undefined) return l;
  setImmediate(() => {
    permissionModeSignal.emit();
  });
  return {
    ok: true,
    mode,
  };
}
//@ chunk-zfbhezv9.js:9871-10128 facade-exports
/**
 * 撤销到先前模式时的副作用：守卫通过则执行模式切换，按需同步 auto 激活状态，离开 auto 时恢复危险规则。
 */
function applyPermissionModeRevertEffects(toolPermissionContext, s) {
  let mode = s.context.mode;
  if (!guardPermissionModeChange(mode, toolPermissionContext).ok) return s.context;
  transitionPermissionMode(toolPermissionContext.mode, mode, toolPermissionContext);
  let r =
    s.autoModeActive &&
    isAutoModeGateEnabled() &&
    (mode === "auto" || (mode === "plan" && shouldPlanUseAutoMode()));
  if (isAutoModeActive() !== r) {
    setAutoModeActive(r);
    setNeedsAutoModeExitAttachment(!r);
  }
  setImmediate(() => {
    permissionModeSignal.emit();
  });
  return s.autoModeActive && !r ? restoreDangerousPermissions(s.context) : s.context;
}
//@ chunk-zfbhezv9.js:10128-10626 facade-exports
function splitToolExclusions(e) {
  let s = [];
  let o = new Set();
  let r = false;
  let n = [];
  let d = [];
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_tools_exclusion_killswitch",
    false,
  );
  for (let k = 0; k < e.length; k++) {
    let y = e[k];
    if (y === undefined) continue;
    if (!y.startsWith(NEGATION_PREFIX)) {
      s.push(y);
      continue;
    }
    let sliced = y.slice(NEGATION_PREFIX.length);
    if (sliced === "") {
      let h = e[k + 1];
      if (h === undefined || h.startsWith(NEGATION_PREFIX) || h.startsWith("(")) {
        r = true;
        continue;
      }
      k++;
      if (!featureValue_CACHED_MAY_BE_STALE) n.push(h);
      y = NEGATION_PREFIX + h;
      sliced = h;
    }
    let index = sliced.indexOf("(");
    if (index === 0) {
      r = true;
      continue;
    }
    if (index > 0) {
      sliced = sliced.slice(0, index);
      if (!featureValue_CACHED_MAY_BE_STALE) d.push(y);
    }
    if (!featureValue_CACHED_MAY_BE_STALE) o.add(canonicalToolName(sliced));
  }
  return {
    kept: s,
    excluded: o,
    bare: r,
    detached: n,
    scoped: d,
  };
}
//@ chunk-zfbhezv9.js:10626-10885 facade-exports
function parseBaseToolsFromCLI(baseToolsCli, getAllBaseTools) {
  let trimmed = baseToolsCli.join(" ").trim();
  if (getBaseToolsPreset(trimmed)) return defaultPresetToolNames(getAllBaseTools());
  let { kept, excluded } = splitToolExclusions(splitRuleList(baseToolsCli));
  let l = kept.includes("preset:default")
    ? getAllBaseTools()
        .map((u) => u.name)
        .concat(kept.filter((u) => u !== "preset:default"))
    : kept;
  if (excluded.size === 0) return l;
  return l.filter((u) => !excluded.has(canonicalToolName(u)));
}
//@ chunk-zfbhezv9.js:10885-10906 layout
var SOFTWARE_DEV_TOOL_NAMES = [BASH_TOOL_NAME, POWERSHELL_TOOL_NAME, GLOB_TOOL_NAME, GREP_TOOL_NAME];
//@ chunk-zfbhezv9.js:10906-12504 facade-exports
function literalToolsNarrowing({ baseToolsCli, baseToolsIsPreset, parsedBaseTools, getAllBaseTools }) {
  let n = [];
  let d = [];
  let baseToolsFromCLI = parseBaseToolsFromCLI(baseToolsCli, getAllBaseTools);
  let u = new Set(baseToolsFromCLI.map(canonicalToolName));
  let allBaseTools = getAllBaseTools();
  let P = baseToolsIsPreset ? null : allBaseTools;
  let E = P === null ? defaultPresetToolNames(allBaseTools) : P.map((p) => p.name);
  let { excluded } = parsedBaseTools;
  for (let p of P ?? getAllBaseTools())
    if (p.familyParentToolName !== undefined && excluded.has(p.familyParentToolName)) u.delete(p.name);
  for (let baseTool of allBaseTools)
    if (baseTool.familyParentToolName !== undefined && u.has(baseTool.familyParentToolName))
      u.add(baseTool.name);
  if (SHELL_TOOL_NAMES.some((p) => u.has(p))) u.add(GET_TASK_TOOL_TEXT);
  for (let p of excluded) u.delete(p);
  if (excluded.has(BASH_TOOL_NAME)) for (let p of toolsRunningCodeAsBash()) u.delete(p);
  let filtered = E.filter((p) => !u.has(p));
  for (let p of excluded) {
    if (E.includes(p)) continue;
    if (RETIRED_TOOL_NAMES.has(p)) {
      logForDebugging(`--tools exclusion names a removed tool: ${p}`);
      continue;
    }
    filtered.push(p);
    if (SOFTWARE_DEV_TOOL_NAMES.includes(p)) continue;
    n.push(
      `--tools entry "${NEGATION_PREFIX}${p}" matches no built-in tool \u2014 check for typos. An MCP tool with exactly that name is still withheld.`,
    );
    d.push(`--tools "${NEGATION_PREFIX}${p}" matches no tool \xB7 check for typos`);
  }
  for (let p of parsedBaseTools.scoped)
    n.push(
      `--tools entry "${p}" names a rule, not a tool; the whole tool is withheld. Write "${NEGATION_PREFIX}${p.slice(NEGATION_PREFIX.length, p.indexOf("("))}" to say so.`,
    );
  for (let p of parsedBaseTools.detached)
    n.push(
      `--tools entry "${NEGATION_PREFIX} ${p}" was read as "${NEGATION_PREFIX}${p}" and ${p} is withheld; write it without the space.`,
    );
  if (parsedBaseTools.bare) {
    n.push(
      `--tools has a "${NEGATION_PREFIX}" with no tool name after it; write the name right after it, as in "${NEGATION_PREFIX}Bash".`,
    );
    d.push(`--tools has a "${NEGATION_PREFIX}" with no tool name \xB7 write "${NEGATION_PREFIX}Bash"`);
  }
  if (!baseToolsIsPreset) {
    for (let p of [
      ...(getPlatform() === "windows" ? [POWERSHELL_TOOL_NAME] : []),
      GLOB_TOOL_NAME,
      GREP_TOOL_NAME,
    ])
      if (!u.has(p) && !filtered.includes(p)) filtered.push(p);
  }
  return {
    toolsToDisallow: filtered,
    toolsKept: baseToolsIsPreset || parsedBaseTools.kept.includes("preset:default") ? undefined : u,
    warnings: n,
    securityWarnings: d,
  };
}
//@ chunk-zfbhezv9.js:12504-12611 fingerprint = isSymlinkTo (1)
function isSymlinkTo({ processPwd, originalCwd }) {
  let { resolvedPath: resolvedProcessPwd, isSymlink: isProcessPwdSymlink } = safeResolvePath(
    getFsImplementation(),
    processPwd,
  );
  return isProcessPwdSymlink ? resolvedProcessPwd === resolve(originalCwd) : false;
}
//@ chunk-zfbhezv9.js:12611-14232 facade-exports
/**
 * 启动时决定权限模式：CLAUDE_CODE_SUBPROCESS_ENV_SCRUB 时强制 default；否则汇总 CLI/env/settings/agent frontmatter/主动性档位交给 initialPermissionModeFromCLI，并在 GrowthBook 或策略未就绪时登记“临时启动模式”以便稍后重算。
 */
function initialPermissionModeFromCLI({
  permissionModeCli,
  inheritPermissionModeCli,
  dangerouslySkipPermissions,
  allowDangerouslySkipPermissions,
  bypassPermissionsBlockedByHost,
  agentPermissionMode,
  proactivityLevel,
}) {
  let u = normalizePermissionModeAlias(permissionModeCli);
  let y = normalizePermissionModeAlias(inheritPermissionModeCli);
  let P = takeRelaunchBaselineMode(Boolean(dangerouslySkipPermissions || allowDangerouslySkipPermissions));
  let E = takeProactivityDecided();
  if (isScrubEnabled()) {
    let w =
      dangerouslySkipPermissions ||
      (u && u !== "default") ||
      (y && y !== "default") ||
      (agentPermissionMode && agentPermissionMode !== "default");
    let A =
      "Permission mode forced to default \u2014 CLAUDE_CODE_SUBPROCESS_ENV_SCRUB is set " +
      "(allowed_non_write_users hardening). Declare allowedTools explicitly, or set CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=0 to opt out.";
    if (w)
      process.stderr.write(`\u26A0 ${A}
`);
    return {
      mode: "default",
      notification: w ? A : undefined,
      modeSuppliedOnInvocation: true,
    };
  }
  let _ = {
    cli: {
      permissionMode:
        E === true &&
        proactivityLevel !== undefined &&
        u !== undefined &&
        getProactivityPolicyVerdict(proactivityLevel, u, undefined) !== undefined
          ? undefined
          : u,
      inheritPermissionMode: y,
      dangerouslySkipPermissions,
      allowDangerouslySkipPermissions,
      bypassPermissionsBlockedByHost,
      isNonInteractiveSession: getIsNonInteractiveSession(),
    },
    env: {
      ...process.env,
      CLAUDE_CODE_SUBPROCESS_ENV_SCRUB: undefined,
    },
    settings: getSettings_DEPRECATED() || {},
    agentFrontmatter: agentPermissionMode
      ? {
          permissionMode: agentPermissionMode,
        }
      : undefined,
    proactivityLevel: E === false ? undefined : proactivityLevel,
  };
  let p = initialPermissionModeFromCLI_2(_);
  setAutoModeFromFallback(p.fromAutoFallback);
  setAutoStartWithheldForHipaaTaint(p.autoStartWithheldForHipaaTaint);
  let R = !getIsNonInteractiveSession() && isGrowthBookCacheEmpty();
  let autoDefaultWithheldForPendingVerdict = p.autoDefaultWithheldForPendingVerdict;
  setProvisionalStartupMode(
    !p.modeSuppliedOnInvocation && (R || autoDefaultWithheldForPendingVerdict)
      ? {
          mode: p.mode,
          inputs: _,
          awaitsGrowthBook: R,
          awaitsPolicyVerdict: autoDefaultWithheldForPendingVerdict,
        }
      : undefined,
  );
  let proactivity;
  {
    let w = p.decidedByProactivityLevel || (E === true && proactivityLevel !== undefined);
    proactivity = {
      proactivityBaseline: {
        mode: P ?? p.baselineMode,
        fromRelaunchHandoff: P !== undefined,
      },
      startupModeDecidedByProactivityLevel: w ? proactivityLevel : undefined,
    };
  }
  if (p.mode === "auto") setAutoModeActive(true);
  return {
    mode: p.mode,
    notification: p.notification,
    proactivity,
    modeSuppliedOnInvocation: p.modeSuppliedOnInvocation,
  };
}
//@ chunk-zfbhezv9.js:14232-14288 facade-exports
function addDirsAreLauncherNamed() {
  return env.CLAUDE_CODE_SESSION_KIND !== "bg";
}
//@ chunk-zfbhezv9.js:14288-14331 facade-exports
function cliArgMayMintTrustedRoots(destination) {
  return destination === "cliArg" && addDirsAreLauncherNamed();
}
//@ chunk-zfbhezv9.js:14331-14508 facade-exports
/**
 * Chrome 分类器地板开关：env CLAUDE_CHROME_CLASSIFIER_FLOOR，否则远程会话读 tengu_cowork_chrome_automode_default 的安全值、本地读普通值。
 */
function readChromeClassifierFloor() {
  return (
    env.CLAUDE_CHROME_CLASSIFIER_FLOOR ??
    (env.CLAUDE_CODE_REMOTE
      ? readFlagWithOverride("tengu_cowork_chrome_automode_default", {
          safe: true,
        })
      : getFeatureValue_CACHED_MAY_BE_STALE("tengu_cowork_chrome_automode_default", false))
  );
}
//@ chunk-zfbhezv9.js:14508-14683 facade-exports
/**
 * 限制写入在工作目录内，并禁用 EnterWorktree/ExitWorktree 工具（toolsNarrowing deny）。
 */
function withWriteBlockOn(e) {
  return {
    ...e,
    blockWritesOutsideWorkingDirectories: true,
    alwaysDenyRules: {
      ...e.alwaysDenyRules,
      toolsNarrowing: uniq([
        ...(e.alwaysDenyRules.toolsNarrowing ?? []),
        ENTER_WORKTREE_TOOL_NAME,
        EXIT_WORKTREE_TOOL_NAME,
      ]),
    },
  };
}
//@ chunk-zfbhezv9.js:14683-19645 facade-exports = initializeToolPermissionContext (0.485)
/**
 * 构建初始 ToolPermissionContext：解析 --allowedTools/--disallowedTools/--tools，加载 settings 规则（工作区信任门控），计算 bypass 可用性（disableBypassPermissionsMode、restricted），Windows 上禁 Bash 时联动 PowerShell，检测危险/宽泛规则，设置 auto 可用性与 Chrome 分类器开关，校验并加入 additionalDirectories（settings、会话、--add-dir）。
 */
async function initializeToolPermissionContext({
  allowedToolsCli,
  disallowedToolsCli,
  baseToolsCli,
  getAllBaseTools,
  restricted = false,
  permissionMode,
  allowDangerouslySkipPermissions,
  addDirs,
  bgSessionPermissionRules,
  relaunchSessionAddDirs,
  storageV5,
}) {
  let h = [];
  let _ = [];
  let p = null;
  let R = permissionMode === "bypassPermissions" || allowDangerouslySkipPermissions;
  let cliAllowedTools = splitRuleList(allowedToolsCli)
    .map((m) => formatPermissionRule(permissionRuleValueFromString(m)))
    .filter((rule) => {
      let parsedDisallowedToolsCli = validateWildcardToolName(permissionRuleValueFromString(rule).toolName);
      if (parsedDisallowedToolsCli) {
        h.push(
          `Ignoring --allowedTools rule "${rule}": ${parsedDisallowedToolsCli.error}. ${parsedDisallowedToolsCli.suggestion}.`,
        );
        return false;
      }
      return true;
    });
  let baseToolsResult = uniq([...splitRuleList(disallowedToolsCli), ...antBuiltinDenyRules()]);
  let w =
    !!baseToolsCli && baseToolsCli.length > 0 && getBaseToolsPreset(baseToolsCli.join(" ").trim()) !== null;
  let A =
    baseToolsCli && !w
      ? splitToolExclusions(splitRuleList(baseToolsCli))
      : {
          kept: [],
          excluded: new Set(),
          bare: false,
          detached: [],
          scoped: [],
        };
  let toolsToDisallow = A.kept.map(canonicalToolName).filter((tool) => !A.excluded.has(tool));
  let K = !!baseToolsCli?.length && !w && toolsToDisallow.length === 0;
  let se = (m) =>
    toolsToDisallow.includes(m) ||
    cliAllowedTools.some((S) => permissionRuleValueFromString(S).toolName === m);
  setSearchToolsOptIn([GLOB_TOOL_NAME, GREP_TOOL_NAME].some(se));
  setTodoToolsOptIn(TODO_TOOL_NAMES.some(se));
  let L = [];
  let ie = [];
  let q;
  let additionalWorkingDirectories = new Set();
  if (baseToolsCli && baseToolsCli.length > 0) {
    let m = literalToolsNarrowing({
      baseToolsCli,
      baseToolsIsPreset: w,
      parsedBaseTools: A,
      getAllBaseTools,
    });
    h.push(...m.warnings);
    _.push(
      ...m.securityWarnings.map((text) => ({
        text,
      })),
    );
    L = m.toolsToDisallow;
    ie = K ? [] : m.toolsToDisallow;
    q = m.toolsKept;
  }
  if (restricted) {
    let m = isCodeExecutionTool(codeExecutionToolNames(getAllBaseTools()), presetExclusions(toolsToDisallow));
    for (let S of m) additionalWorkingDirectories.add(S);
    L = uniq([...L, ...m]);
  }
  setToolsOmittedByLaunchList(ie.filter((m) => !additionalWorkingDirectories.has(m)));
  let re = new Map();
  let processPwd = env.PWD;
  let z = processPwd ? getOriginalCwdOrNull() : null;
  if (
    processPwd &&
    z !== null &&
    processPwd !== z &&
    isSymlinkTo({
      originalCwd: z,
      processPwd,
    })
  )
    re.set(processPwd, {
      path: processPwd,
      source: "session",
    });
  let ae = (getSettings_DEPRECATED() || {}).permissions?.disableBypassPermissionsMode === "disable";
  let X =
    allowDangerouslySkipPermissions &&
    permissionMode !== "bypassPermissions" &&
    !ae &&
    !restricted &&
    isUnconsentedBgBypass("bypassPermissions");
  if (X) {
    logEvent("tengu_bg_allow_bypass_unconsented_ignored", {});
    h.push(BG_UNCONSENTED_BYPASS_CAPABILITY_NOTICE);
  }
  let isBypassPermissionsModeAvailable =
    (permissionMode === "bypassPermissions" || (allowDangerouslySkipPermissions && !X)) &&
    !ae &&
    !restricted &&
    true;
  let options =
    isStorageV5Enabled() && storageV5 !== undefined && storageV5.hostFiles.serving("workspace") === "host"
      ? {
          strictPersistedTrust: await workspacePersistedTrustThroughBackend(storageV5),
        }
      : {};
  let rules = loadAllPermissionRulesFromDisk(options);
  let mapped = [...baseToolsResult, ...L].map(permissionRuleValueFromString);
  let any = mapped.some(isBareBashRule);
  let we =
    mapped.some((m) => m.toolName === BASH_TOOL_NAME) ||
    rules.some((m) => m.ruleBehavior === "deny" && m.ruleValue.toolName === BASH_TOOL_NAME);
  let De =
    env.CLAUDE_CODE_USE_POWERSHELL_TOOL ||
    splitRuleList(baseToolsCli ?? [])
      .map(canonicalToolName)
      .includes(POWERSHELL_TOOL_NAME) ||
    cliAllowedTools.some((m) => permissionRuleValueFromString(m).toolName === POWERSHELL_TOOL_NAME) ||
    mapped.some((m) => m.toolName === POWERSHELL_TOOL_NAME) ||
    rules.some((m) => m.ruleValue.toolName === POWERSHELL_TOOL_NAME);
  if (getPlatform() === "windows" && isBashAvailable() && we && !De) {
    baseToolsResult = [...baseToolsResult, POWERSHELL_TOOL_NAME];
    let filtered = rules.filter((S) => S.ruleBehavior === "deny" && isBareBashRule(S.ruleValue));
    if (
      isPowerShellToolEnabled() &&
      (any || filtered.length > 0) &&
      !filtered.some((S) => S.source === "policySettings")
    )
      h.push(
        `Denying ${BASH_TOOL_NAME} also turns off the ${POWERSHELL_TOOL_NAME} tool, so Claude has neither. To use ${POWERSHELL_TOOL_NAME}, set CLAUDE_CODE_USE_POWERSHELL_TOOL=1.`,
      );
  }
  let ce = [];
  if (!env.CLAUDE_CODE_REMOTE && env.CLAUDE_CODE_ENTRYPOINT !== "local-agent") {
    let m = [
      ...findOverlyBroadBashPermissions(rules, cliAllowedTools, true),
      ...findOverlyBroadPowerShellPermissions(rules, cliAllowedTools),
    ];
    if (m.length > 0) {
      let mapped = m.map((V) => categorizeBroadShellRule(V.ruleValue));
      let yoloEquivEnabled = false;
      let ee = false;
      logEvent("tengu_ant_overly_broad_bash_detected", {
        count: m.length,
        categories: fromEnumArr(uniq(mapped)),
        yoloEquivEnabled,
        willStrip: ce.length,
        entrypoint: fromEnumOpt(getEntrypointKind()) ?? lit("other"),
        ...false,
      });
    }
  }
  let dangerousPermissions = [];
  if (permissionMode === "auto")
    dangerousPermissions = findDangerousClassifierPermissions(rules, cliAllowedTools);
  let Q = shouldAllowManagedPermissionRulesOnly();
  let blockExemptPathsInSettings = readBlockExemptPathsInSettings();
  if (Q && cliAllowedTools.length > 0)
    h.push(
      `Ignoring --allowedTools ${cliAllowedTools.join(", ")}: permission rules are restricted to managed settings (allowManagedPermissionRulesOnly).`,
    );
  let toolPermissionContext = applyPermissionRulesToPermissionContext(
    {
      mode: permissionMode,
      additionalWorkingDirectories: re,
      alwaysAllowRules: {
        cliArg: Q ? [] : cliAllowedTools,
        ...(bgSessionPermissionRules && {
          session: Q ? [] : bgSessionPermissionRules.allow,
        }),
      },
      alwaysDenyRules: {
        cliArg: baseToolsResult,
        ...(bgSessionPermissionRules && {
          session: bgSessionPermissionRules.deny,
        }),
        ...(L.length > 0 && {
          toolsNarrowing: L,
        }),
      },
      alwaysAskRules: {},
      mcpPermissionModeOverrides: {},
      ...(restricted && {
        restricted,
      }),
      ...(K && {
        builtInToolsDisabled: K,
      }),
      ...(q !== undefined && {
        toolsKeptByLaunchList: Object.freeze([...q]),
      }),
      ...(isReadBlockOn() && {
        blockReadsOutsideWorkingDirectories: true,
      }),
      ...(blockExemptPathsInSettings.length > 0 && {
        readBlockExemptPaths: blockExemptPathsInSettings,
      }),
      isBypassPermissionsModeAvailable,
      ...((m) => ({
        isAutoModeAvailable: m,
        canAutoClassifierRun: m,
        chromeClassifierFloorEnabled: readChromeClassifierFloor(),
        chromeNavigationClassifierEnabled:
          getFeatureValue_CACHED_MAY_BE_STALE("tengu_auto_mode_config", {})?.chromeNavigation === true,
        chromeClickClassifierEnabled:
          getFeatureValue_CACHED_MAY_BE_STALE("tengu_auto_mode_config", {})?.classifyChromeClicks === true ||
          isActionSummaryEnabled("browserClicks"),
        chromeHostToolAsksEnabled: getFeatureValue_CACHED_MAY_BE_STALE("tengu_cozy_eagle", true) !== false,
      }))(isAutoModeGateEnabled()),
      isRemoteMode: env.CLAUDE_CODE_REMOTE || getIsRemoteMode(),
    },
    rules,
  );
  if (isWriteBlockOn()) toolPermissionContext = withWriteBlockOn(toolPermissionContext);
  for (let m of collectPermissionRuleAdvisories(
    [
      ...getAllowRules(toolPermissionContext),
      ...getDenyRules(toolPermissionContext),
      ...getAskRules(toolPermissionContext),
    ],
    getAllBaseTools,
  )) {
    h.push(m.line);
    if (m.securityWarning !== undefined) _.push(m.securityWarning);
  }
  let { repoOnly } = additionalDirectoryProvenance((m) => {
    try {
      return [resolve(expandPath(m))];
    } catch {
      return [];
    }
  }, storageV5);
  let Be = [
    ...loadTrustedAdditionalDirectoriesFromDisk(options).map((dir) => ({
      dir,
      destination: "localSettings",
    })),
    ...[...(bgSessionPermissionRules?.addDirs ?? []), ...(relaunchSessionAddDirs ?? [])].map((dir) => ({
      dir,
      destination: "session",
    })),
    ...addDirs.map((dir) => ({
      dir,
      destination: "cliArg",
    })),
  ];
  let validationResults = await Promise.all(
    Be.map(async ({ dir, destination }) => ({
      destination,
      result: await validateDirectoryForWorkspace(dir, toolPermissionContext),
    })),
  );
  let J = new Map();
  let fe = [];
  for (let { result: m, destination } of validationResults)
    if (m.resultType === "success") {
      if (destination === "session") fe.push(m.absolutePath);
      toolPermissionContext = applyValidatedPermissionUpdate(toolPermissionContext, {
        type: "addDirectories",
        directories: [m.absolutePath],
        destination:
          destination === "localSettings" && repoOnly.has(m.absolutePath) ? "projectSettings" : destination,
      });
      if (cliArgMayMintTrustedRoots(destination)) {
        let F = mappedDriveSpellings(m.absolutePath);
        if (F.length > 0) {
          J.set(m.absolutePath, F);
          let filtered = F.filter((dir) => dir !== m.absolutePath);
          if (filtered.length > 0)
            toolPermissionContext = applyValidatedPermissionUpdate(toolPermissionContext, {
              type: "addDirectories",
              directories: filtered,
              destination,
            });
        }
      }
    } else if (m.resultType !== "alreadyInWorkingDirectory" && m.resultType !== "pathNotFound")
      h.push(addDirHelpMessage(m));
  if (J.size > 0)
    toolPermissionContext = {
      ...toolPermissionContext,
      trustedNetworkDirectories: J,
    };
  return {
    toolPermissionContext,
    warnings: h,
    securityWarnings: _,
    dangerousPermissions,
    overlyBroadBashPermissions: ce,
    ...(X && {
      bypassCapabilityNotification: BG_UNCONSENTED_BYPASS_CAPABILITY_NOTICE,
    }),
    inheritedSessionDirectories: fe,
  };
}
//@ chunk-zfbhezv9.js:19645-21746 facade-exports = findOverlyBroadPowerShellPermissions (0.148)
/**
 * 规则自检告警：deny/ask 规则指向已移除或未知的工具、用 "field:" 原样匹配 command/path 字段（不会生效）；validatePermissionRule 报告的警告。
 */
function collectPermissionRuleAdvisories(rules, getAllBaseTools) {
  let warnings = [];
  let allBaseTools = getAllBaseTools();
  let n = new Set([...allBaseTools.map((baseTool) => baseTool.name), ...SOFTWARE_DEV_TOOL_NAMES]);
  let d = new Map([
    [BASH_TOOL_NAME, "command"],
    [POWERSHELL_TOOL_NAME, "command"],
    [GLOB_TOOL_NAME, "path"],
    [GREP_TOOL_NAME, "path"],
    ...allBaseTools
      .filter((baseTool) => baseTool.ruleContentField)
      .map((baseTool) => [baseTool.name, baseTool.ruleContentField]),
  ]);
  for (let l of [...filterRulesByBehavior(rules, "deny"), ...filterRulesByBehavior(rules, "ask")]) {
    if (l.source === "toolsNarrowing" || l.source === "session") continue;
    let { toolName, ruleContent } = l.ruleValue;
    if (RETIRED_TOOL_NAMES.has(toolName)) {
      logForDebugging(`Permission ${l.ruleBehavior} rule names a removed tool: ${toolName}`);
      continue;
    }
    if (
      hasWildcard(toolName) ||
      toolName.includes("_") ||
      legacyToolNamesFor(toolName).length > 0 ||
      n.has(toolName)
    ) {
      let P = d.get(toolName);
      if (P && ruleContent !== undefined) {
        let index = ruleContent.indexOf(":");
        if (index > 0 && ruleContent.slice(0, index).trim() === P) {
          let h = `Permission ${l.ruleBehavior} rule "${formatPermissionRule(l.ruleValue)}" targets ${P} as a raw string and will not match`;
          let _ =
            toolName === GREP_TOOL_NAME
              ? "."
              : toolName === GLOB_TOOL_NAME
                ? ` \u2014 use ${FILE_READ_TOOL_NAME}(${"\u2026"}) to match file-read paths.`
                : toolName === FILE_WRITE_TOOL_NAME || toolName === NOTEBOOK_EDIT_TOOL_NAME
                  ? ` \u2014 use ${FILE_EDIT_TOOL_NAME}(${"\u2026"}) to match file-write paths.`
                  : ` \u2014 use ${toolName}(${"\u2026"}) for ${toolName}'s own matcher.`;
          warnings.push(
            createRuleWarning(
              l,
              h + _,
              `${capitalize(l.ruleBehavior)} rule ${formatPermissionRule(l.ruleValue)} never matches${toolName === GREP_TOOL_NAME ? "" : ` \xB7 use ${toolName === GLOB_TOOL_NAME ? FILE_READ_TOOL_NAME : toolName === FILE_WRITE_TOOL_NAME || toolName === NOTEBOOK_EDIT_TOOL_NAME ? FILE_EDIT_TOOL_NAME : toolName}(${"\u2026"})`}`,
            ),
          );
        }
      }
      continue;
    }
    warnings.push(
      createRuleWarning(
        l,
        `Permission ${l.ruleBehavior} rule "${formatPermissionRule(l.ruleValue)}" matches no known tool \u2014 check for typos.`,
        `${capitalize(l.ruleBehavior)} rule ${formatPermissionRule(l.ruleValue)} matches no tool \xB7 check for typos`,
      ),
    );
  }
  for (let l of [
    ...filterRulesByBehavior(rules, "allow"),
    ...filterRulesByBehavior(rules, "deny"),
    ...filterRulesByBehavior(rules, "ask"),
  ]) {
    if (l.source === "session" || l.source === "toolsNarrowing") continue;
    if (l.source === "cliArg" && l.ruleBehavior === "allow" && l.ruleValue.toolName === GLOB_TOOL_NAME)
      continue;
    let { ruleContent } = l.ruleValue;
    if (ruleContent !== undefined) {
      let index = ruleContent.indexOf(":");
      if (
        index > 0 &&
        /^[A-Za-z_][A-Za-z0-9_]*$/.test(ruleContent.slice(0, index).trim()) &&
        !/^[A-Za-z]:[\\/]/.test(ruleContent.trim())
      )
        continue;
    }
    let y = validatePermissionRule(formatPermissionRule(l.ruleValue), l.ruleBehavior);
    if (y.valid && y.warning) {
      let P =
        l.source === "cliArg"
          ? l.ruleBehavior === "allow"
            ? "--allowed-tools"
            : "--disallowed-tools"
          : l.source === "flagSettings" && !getSettingsFilePathForSource("flagSettings")
            ? "--settings"
            : l.source === "policySettings"
              ? "managed policy settings"
              : formatPermissionSource(l.source);
      warnings.push(
        createRuleWarning(
          l,
          `Permission ${l.ruleBehavior} rule (${P}): ${y.warning}`,
          y.securityNotice === undefined
            ? undefined
            : `${capitalize(l.ruleBehavior)} rule ${y.securityNotice}`,
        ),
      );
    }
  }
  return warnings;
}
//@ chunk-zfbhezv9.js:21746-21960 layout
function createRuleWarning(e, line, o) {
  if (o === undefined)
    return {
      line,
    };
  let found = SETTING_SOURCES.find((d) => d === e.source && d !== "flagSettings");
  let n = found === undefined ? undefined : getSettingsFilePathForSource(found);
  return {
    line,
    securityWarning:
      n === undefined
        ? {
            text: o,
          }
        : {
            text: o,
            seenKey: sha256OfLines([e.source, n, o]),
          },
  };
}
//@ chunk-zfbhezv9.js:21960-22017 layout
function filterRulesByBehavior(rules, s) {
  return rules.filter((o) => o.ruleBehavior === s);
}
//@ chunk-zfbhezv9.js:22017-22153 facade-exports
/**
 * 把 CLI 参数的 allow 规则追加到 cliArg 来源（受限情况下 yg() 为真时不加）。
 */
function withCliArgAllowRules(toolPermissionContext, allowedTools) {
  if (shouldAllowManagedPermissionRulesOnly()) return toolPermissionContext;
  return {
    ...toolPermissionContext,
    alwaysAllowRules: {
      ...toolPermissionContext.alwaysAllowRules,
      cliArg: [...(toolPermissionContext.alwaysAllowRules.cliArg ?? []), ...allowedTools],
    },
  };
}
//@ chunk-zfbhezv9.js:22153-23082 facade-exports
/**
 * GrowthBook 缓存或策略结论到位后重算启动模式；若用户未手动切换过且结果不同，则通过 transitionPermissionMode 切换（trigger=startup_reresolve）。
 */
function settleProvisionalStartupMode(e, s = {}) {
  let provisionalStartupMode = getProvisionalStartupMode();
  if (!provisionalStartupMode) return e;
  let r = provisionalStartupMode.awaitsGrowthBook && isGrowthBookCacheEmpty();
  if (r && !provisionalStartupMode.awaitsPolicyVerdict) return e;
  if (e.mode !== provisionalStartupMode.mode) {
    setProvisionalStartupMode(undefined);
    return e;
  }
  let n = initialPermissionModeFromCLI_2(provisionalStartupMode.inputs);
  if (n.autoDefaultWithheldForPendingVerdict) return e;
  let d = r
    ? {
        mode: n.mode,
        inputs: provisionalStartupMode.inputs,
        awaitsGrowthBook: true,
        awaitsPolicyVerdict: false,
      }
    : undefined;
  setProvisionalStartupMode(d);
  setAutoStartWithheldForHipaaTaint(n.autoStartWithheldForHipaaTaint);
  if (n.notification !== undefined) s.onNotification?.(n.notification);
  if (
    n.mode === e.mode ||
    (n.mode === "bypassPermissions" && !e.isBypassPermissionsModeAvailable) ||
    (n.mode === "auto" && !isAutoModeGateEnabled())
  )
    return e;
  logForDebugging(
    `[permission-mode] startup resolved ${e.mode} against ${provisionalStartupMode.awaitsPolicyVerdict ? "a pending policy verdict" : "an empty GrowthBook cache"}; re-resolved to ${n.mode}`,
  );
  setAutoModeFromFallback(n.fromAutoFallback);
  let l = {
    ...transitionPermissionMode(e.mode, n.mode, e, "startup_reresolve"),
    mode: n.mode,
    ...(provisionalStartupMode.awaitsPolicyVerdict &&
      n.decidedByProactivityLevel && {
        startupModeDecidedByProactivityLevel: provisionalStartupMode.inputs.proactivityLevel,
      }),
  };
  setProvisionalStartupMode(d);
  return l;
}
//@ chunk-zfbhezv9.js:23082-23262 facade-exports
/**
 * 主动性档位选择因等待策略结论被暂缓时，返回给用户的提示。
 */
function levelAutoHeldForPendingVerdictNotice() {
  let provisionalStartupMode = getProvisionalStartupMode();
  if (
    !provisionalStartupMode?.awaitsPolicyVerdict ||
    provisionalStartupMode.inputs.proactivityLevel === undefined
  )
    return;
  let levelPickHeldForPendingVerdict = initialPermissionModeFromCLI_2(
    provisionalStartupMode.inputs,
  ).levelPickHeldForPendingVerdict;
  return levelPickHeldForPendingVerdict === undefined
    ? undefined
    : orgPolicyNotLoadedNotice(levelPickHeldForPendingVerdict);
}
//@ chunk-zfbhezv9.js:23262-23390 facade-exports
/**
 * 放弃等待策略结论：清除 awaitsPolicyVerdict（若仍在等 GrowthBook 则保留其余待定状态）。
 */
function abandonPendingPolicyVerdictResolution() {
  let provisionalStartupMode = getProvisionalStartupMode();
  if (!provisionalStartupMode?.awaitsPolicyVerdict) return;
  setProvisionalStartupMode(
    provisionalStartupMode.awaitsGrowthBook && isGrowthBookCacheEmpty()
      ? {
          ...provisionalStartupMode,
          awaitsPolicyVerdict: false,
        }
      : undefined,
  );
}
//@ chunk-zfbhezv9.js:23390-25368 facade-exports = verifyAutoModeGateAccess (0.8)
/**
 * 校验 auto 模式能否进入：读 tengu_auto_mode_config（enabled: enabled/disabled/opt-in、disableFastMode）、settings disableAutoMode、模型是否支持；可进入时返回刷新可用性的 updateContext，否则返回踢出 auto 的 updateContext 与原因通知（settings/circuit-breaker/fast-mode/model）。
 */
async function verifyAutoModeGateAccess(context, fastMode, isLaunchRun = false) {
  let autoModeConfig = await getDynamicConfig_BLOCKS_ON_INIT("tengu_auto_mode_config", {});
  let enabledState = parseAutoModeEnabledState(autoModeConfig?.enabled);
  let disabledBySettings = isAutoModeDisabledBySettingsNow();
  if (!isAutoModeCircuitBroken()) setAutoModeCircuitBroken(enabledState === "disabled");
  let mainModel = getMainLoopModel();
  let { supported: modelSupported, disableFastModeBreakerFires } = getAutoModeModelSupport({
    model: mainModel,
    fastMode: !!fastMode,
    disableFastMode: !!autoModeConfig?.disableFastMode,
  });
  setAutoModeFastModeBreakerReason(disableFastModeBreakerFires ? (fastMode ? "fast-mode" : "model") : null);
  let P = enabledState !== "disabled" && !disabledBySettings && modelSupported;
  let available = P;
  let refusedForSettingsAlone = disabledBySettings && enabledState !== "disabled" && modelSupported;
  logForDebugging(
    `[auto-mode] verifyAutoModeGateAccess: enabledState=${enabledState} disabledBySettings=${disabledBySettings} model=${mainModel} modelSupported=${modelSupported} disableFastModeBreakerFires=${disableFastModeBreakerFires} carouselAvailable=${available} canEnterAuto=${P}`,
  );
  let autoModeFlagCli = getAutoModeFlagCli();
  if (!P) setProvisionalStartupMode(undefined);
  let setAvailable = (ctx, available) => {
    if (ctx.isAutoModeAvailable !== available)
      logForDebugging(
        `[auto-mode] verifyAutoModeGateAccess setAvailable: ${ctx.isAutoModeAvailable} -> ${available}`,
      );
    return ctx.isAutoModeAvailable === available && ctx.canAutoClassifierRun === P
      ? ctx
      : {
          ...ctx,
          isAutoModeAvailable: available,
          canAutoClassifierRun: P,
        };
  };
  if (P)
    return {
      canEnterAuto: P,
      refusedForSettingsAlone,
      updateContext: (ctx) => {
        abandonPendingPolicyVerdictResolution();
        ctx = settleProvisionalStartupMode(ctx);
        setProvisionalStartupMode(undefined);
        if (ctx.mode === "plan" && !ctx.prePlanMode) {
          let O = activatePlanAutoMode(ctx);
          if (O)
            return setAvailable(
              {
                ...O,
                prePlanMode: "default",
              },
              available,
            );
        }
        return setAvailable(ctx, available);
      },
    };
  let reason;
  if (disabledBySettings) {
    reason = "settings";
    logForDebugging("auto mode disabled: disableAutoMode in settings", {
      level: "warn",
    });
  } else if (enabledState === "disabled") {
    reason = "circuit-breaker";
    logForDebugging('auto mode disabled: tengu_auto_mode_config.enabled === "disabled" (circuit breaker)', {
      level: "warn",
    });
  } else if (fastMode && disableFastModeBreakerFires && modelSupportsAutoMode(mainModel)) {
    reason = "fast-mode";
    logForDebugging("auto mode disabled: tengu_auto_mode_config.disableFastMode with the /fast toggle on", {
      level: "warn",
    });
  } else {
    reason = "model";
    logForDebugging(`auto mode disabled: model ${getMainLoopModel()} does not support auto mode`, {
      level: "warn",
    });
  }
  let notification = getAutoModeUnavailableNotification(reason);
  let kickOutOfAutoIfNeeded = (ctx) => {
    logForDebugging(
      `[auto-mode] kickOutOfAutoIfNeeded applying: ctx.mode=${ctx.mode} ctx.prePlanMode=${ctx.prePlanMode} reason=${reason}`,
    );
    if (!isAutoModeInUse(ctx)) return setAvailable(ctx, false);
    return createDisabledAutoModeContext(ctx);
  };
  let w = isAutoModeInUse(context);
  if (!w && !autoModeFlagCli)
    return {
      updateContext: kickOutOfAutoIfNeeded,
      canEnterAuto: P,
      refusedForSettingsAlone,
    };
  if (w) {
    let A = isLaunchRun && reason === "model" && isAutoModeFromFallback();
    return {
      updateContext: kickOutOfAutoIfNeeded,
      canEnterAuto: P,
      refusedForSettingsAlone,
      notification: A ? undefined : notification,
    };
  }
  return {
    updateContext: kickOutOfAutoIfNeeded,
    canEnterAuto: P,
    refusedForSettingsAlone,
    notification: context.isAutoModeAvailable ? notification : undefined,
  };
}
//@ chunk-zfbhezv9.js:25368-25403 facade-exports
function autoModeRefusedHere() {
  return isAutoModeCircuitBroken() || isAutoModeDisabledBySettingsNow();
}
//@ chunk-zfbhezv9.js:25403-25459 layout
function autoModeDisabledSource() {
  return getEnabledSettingSources().findLast((e) =>
    isAutoModeDisabledBySettings(getSettingsForSource(e) || {}),
  );
}
//@ chunk-zfbhezv9.js:25459-25514 facade-exports
function getDisableAutoModeSettingSources() {
  return getEnabledSettingSources().filter((e) =>
    isAutoModeDisabledBySettings(getSettingsForSource(e) || {}),
  );
}
//@ chunk-zfbhezv9.js:25514-25940 facade-exports
/**
 * 为遥测收集 auto 模式可用性：是否可用、不可用原因、禁用来源（含策略来源）、enabled 状态及其来源、熔断状态、settings 的 defaultMode、是否来自回退。
 */
function getAutoModeAvailabilityForAnalytics() {
  let e = autoModeDisabledSource();
  let autoModeEnabledStateWithSource = getAutoModeEnabledStateWithSource();
  return {
    autoModeAvailable: isAutoModeGateEnabled(),
    autoModeUnavailableReason: fromEnumOpt(getAutoModeUnavailableReason()),
    autoModeDisabledBySettingsSource: fromEnumOpt(e),
    autoModeDisabledByPolicyOrigin:
      e === "policySettings" ? fromEnumOpt(getPolicySettingsOrigin()) : undefined,
    autoModeDisabledByTrustedPolicy: isAutoModeDisabledByPolicySettings(),
    autoModeEnabledState: fromEnum(autoModeEnabledStateWithSource.value),
    autoModeEnabledStateSource: fromEnum(autoModeEnabledStateWithSource.src),
    autoModeCircuitBroken: isAutoModeCircuitBroken(),
    defaultModeSetting: fromEnumOpt((getSettings_DEPRECATED() || {}).permissions?.defaultMode),
    autoModeFromFallback: isAutoModeFromFallback(),
  };
}
//@ chunk-zfbhezv9.js:25940-26009 facade-exports = _temp7 (1)
/**
 * auto 模式是否被托管策略设置禁用（policySettings 与可信策略层均禁用）。
 */
function isAutoModeDisabledByPolicySettings() {
  return (
    isAutoModeDisabledBySettings(getSettingsForSource("policySettings") || {}) &&
    getVouchedPolicyTierSettings().some(isAutoModeDisabledBySettings)
  );
}
//@ chunk-zfbhezv9.js:26009-26026 layout
var AUTO_MODE_ENABLED_FALLBACK = "enabled";
//@ chunk-zfbhezv9.js:26026-26107 fingerprint = parseAutoModeEnabledState (1)
function parseAutoModeEnabledState(value) {
  if (value === "enabled" || value === "disabled" || value === "opt-in") return value;
  return AUTO_MODE_ENABLED_FALLBACK;
}
//@ chunk-zfbhezv9.js:26107-26141 facade-exports
function getAutoModeEnabledState() {
  return getAutoModeEnabledStateWithSource().value;
}
//@ chunk-zfbhezv9.js:26141-26251 facade-exports = getAutoModeEnabledState (0.825)
function getAutoModeEnabledStateWithSource() {
  let enabled = getFeatureValue_CACHED_MAY_BE_STALE("tengu_auto_mode_config", {})?.enabled;
  let autoModeEnabledState = parseAutoModeEnabledState(enabled);
  return {
    value: autoModeEnabledState,
    src: enabled === autoModeEnabledState ? "gb" : "default",
  };
}
//@ chunk-zfbhezv9.js:26251-26418 facade-exports = createDisabledBypassPermissionsContext (1)
/**
 * 禁用 bypass：当前为 bypass 时切回 default，并把 isBypassPermissionsModeAvailable 置为 false。
 */
function createDisabledBypassPermissionsContext(currentContext) {
  let updatedContext = currentContext;
  if (currentContext.mode === "bypassPermissions")
    updatedContext = applyValidatedPermissionUpdate(currentContext, {
      type: "setMode",
      mode: "default",
      destination: "session",
    });
  return {
    ...updatedContext,
    isBypassPermissionsModeAvailable: false,
  };
}
//@ chunk-zfbhezv9.js:26418-26528 facade-exports
/**
 * 当前处于 auto，或 plan 且进入前是 auto/已剥离危险规则。
 */
function isAutoModeInUse(e) {
  return e.mode === "auto" || (e.mode === "plan" && (e.prePlanMode === "auto" || !!e.strippedDangerousRules));
}
//@ chunk-zfbhezv9.js:26528-27225 facade-exports
/**
 * 闸门关闭时退出 auto：恢复危险规则，模式改回 default（或按主动性档位算出的模式），并标记 auto 不可用。
 */
function createDisabledAutoModeContext(e) {
  let s = "default";
  {
    let startupModeDecidedByProactivityLevel = e.startupModeDecidedByProactivityLevel;
    if (
      (e.mode === "auto" || e.prePlanMode === "auto") &&
      startupModeDecidedByProactivityLevel !== undefined
    ) {
      if (isProactivityActive()) {
        let externalPermissionMode = toExternalPermissionMode(
          permissionModeForProactivityLevel(
            startupModeDecidedByProactivityLevel,
            {
              isAutoModeAvailable: false,
              isBypassPermissionsModeAvailable: false,
            },
            e.proactivityBaseline?.mode,
          ),
        );
        let n =
          getProactivityPolicyVerdict(
            startupModeDecidedByProactivityLevel,
            externalPermissionMode,
            e.proactivityBaseline?.mode,
          ) !== undefined;
        s = externalPermissionMode === "plan" || n ? "default" : externalPermissionMode;
      }
      e = {
        ...e,
        startupModeDecidedByProactivityLevel: undefined,
      };
    }
  }
  setAutoModeActive(false);
  setNeedsAutoModeExitAttachment(true);
  if (e.mode === "auto") {
    logPermissionModeChanged({
      from: "auto",
      to: s,
      trigger: "auto_gate_denied",
    });
    return {
      ...applyValidatedPermissionUpdate(restoreDangerousPermissions(e), {
        type: "setMode",
        mode: s,
        destination: "session",
      }),
      isAutoModeAvailable: false,
      canAutoClassifierRun: false,
    };
  }
  return {
    ...restoreDangerousPermissions(e),
    prePlanMode: e.prePlanMode === "auto" ? s : e.prePlanMode,
    isAutoModeAvailable: false,
    canAutoClassifierRun: false,
  };
}
//@ chunk-zfbhezv9.js:27225-27291 facade-exports = isDefaultPermissionModeAuto (1)
/**
 * settings 的 permissions.defaultMode 是否为 auto。
 */
function isDefaultPermissionModeAuto() {
  return (getSettings_DEPRECATED() || {}).permissions?.defaultMode === "auto";
}
//@ chunk-zfbhezv9.js:27291-27325 facade-exports
function shouldPlanUseAutoMode() {
  return isAutoModeGateEnabled() && getUseAutoModeDuringPlan();
}
//@ chunk-zfbhezv9.js:27325-27396 layout = _temp9 (1)
function isAutoModeAvailableNow() {
  return (
    isAutoModeActive() &&
    isAutoModeSupportedNow() &&
    !isAutoModeDisabledByPolicySettings() &&
    !isAutoModeDisabledBySettings(getSettingsForSource("flagSettings") || {})
  );
}
//@ chunk-zfbhezv9.js:27396-27423 layout
function planUsesAutoMode() {
  return shouldPlanUseAutoMode();
}
//@ chunk-zfbhezv9.js:27423-27469 facade-exports
function canPlanReturnToAutoMode(prePlanMode) {
  return isAutoModeGateEnabled() || (prePlanMode === "auto" && isAutoModeAvailableNow());
}
//@ chunk-zfbhezv9.js:27469-27496 facade-exports
function latchPlanAutoModeAtLaunch() {
  setPlanAutoModeOffAtLaunch(!getUseAutoModeDuringPlan());
}
//@ chunk-zfbhezv9.js:27496-27535 facade-exports
function settlePlanAutoModeAtStart(toolPermissionContext) {
  latchPlanAutoModeAtLaunch();
  return reconcilePlanAutoMode(toolPermissionContext, shouldPlanUseAutoMode);
}
//@ chunk-zfbhezv9.js:27535-27616 layout
function isPlanAutoModeAllowed() {
  return (
    (isAutoModeGateEnabled() || isAutoModeAvailableNow()) &&
    (!isPlanAutoModeOffAtLaunch() || getUseAutoModeDuringPlan()) &&
    !isDisabledAboveWorkloadFiles("useAutoModeDuringPlan")
  );
}
//@ chunk-zfbhezv9.js:27616-27673 facade-exports
function activatePlanAutoMode(e) {
  if (!planUsesAutoMode()) return null;
  setAutoModeActive(true);
  return stripDangerousPermissionsForAutoMode(e);
}
//@ chunk-zfbhezv9.js:27673-28016 facade-exports = prepareContextForPlanMode (0.927)
/**
 * 进入 plan：记录 prePlanMode；从 auto 进入时视 plan 是否沿用分类器决定是否恢复危险规则；从其他模式进入时若 plan 使用 auto 分类器则剥离危险规则。
 */
function prepareContextForPlanMode(context) {
  let currentMode = context.mode;
  if (currentMode === "plan") return context;
  if (currentMode === "auto") {
    if (isPlanAutoModeAllowed())
      return {
        ...context,
        prePlanMode: "auto",
      };
    setAutoModeActive(false);
    setNeedsAutoModeExitAttachment(true);
    return {
      ...restoreDangerousPermissions(context),
      prePlanMode: "auto",
    };
  }
  if (currentMode !== "bypassPermissions") {
    let o = activatePlanAutoMode(context);
    if (o)
      return {
        ...o,
        prePlanMode: currentMode,
      };
  }
  logForDebugging(`[prepareContextForPlanMode] plain plan entry, prePlanMode=${currentMode}`, {
    level: "info",
  });
  return {
    ...context,
    prePlanMode: currentMode,
  };
}
//@ chunk-zfbhezv9.js:28016-28413 facade-exports = transitionPlanAutoMode (0.56)
/**
 * 把上下文规整为“已认领的启动模式”：清除主动性档位标记；未经 flag 允许时关闭 bypass 可用；plan 带 prePlanMode 时按 auto 是否激活处理 plan 的 auto 状态。
 */
function asClaimedStartModeContext(context, s) {
  let o = context;
  if (o.startupModeDecidedByProactivityLevel !== undefined)
    o = {
      ...o,
      startupModeDecidedByProactivityLevel: undefined,
    };
  if (o.mode !== "bypassPermissions" && o.isBypassPermissionsModeAvailable && !s.bypassAvailableByFlag)
    o = {
      ...o,
      isBypassPermissionsModeAvailable: false,
    };
  if (o.mode === "plan" && o.prePlanMode !== undefined) {
    let r = transitionPlanAutoMode({
      ...o,
      prePlanMode: "default",
    });
    o = isAutoModeActive()
      ? r
      : {
          ...r,
          prePlanMode: undefined,
        };
  }
  return o;
}
//@ chunk-zfbhezv9.js:28413-28445 facade-exports
function transitionPlanAutoMode(toolPermissionContext) {
  return reconcilePlanAutoMode(toolPermissionContext, isPlanAutoModeAllowed);
}
//@ chunk-zfbhezv9.js:28445-28710 affinity
function reconcilePlanAutoMode(e, s) {
  if (e.mode === "auto") return stripDangerousPermissionsForAutoMode(e);
  if (e.mode !== "plan") return e;
  if (!e.prePlanMode || e.prePlanMode === "bypassPermissions") return e;
  let o = isAutoModeActive();
  let r = o ? s() : planUsesAutoMode();
  if (r && o) return stripDangerousPermissionsForAutoMode(e);
  if (!r && !o) return e;
  if (r) {
    setAutoModeActive(true);
    setNeedsAutoModeExitAttachment(false);
    return stripDangerousPermissionsForAutoMode(e);
  }
  setAutoModeActive(false);
  setNeedsAutoModeExitAttachment(true);
  return restoreDangerousPermissions(e);
}
//@ chunk-kswt4qha.js:1370-1403 placement
var approvalLayerSlot = new SessionRootSlot(() => ({
  layers: [],
}));
//@ chunk-kswt4qha.js:1403-1448 placement
/**
 * approvalLayers：当前会话的权限层。
 */
function approvalLayers() {
  return approvalLayerSlot.peek(getRootSession())?.layers ?? [];
}
//@ chunk-kswt4qha.js:1448-1872 placement
/**
 * 读取自动压缩提议记录。
 */
function readAutoCompactOffer(e, n, r) {
  let s = ownPropertyValue(ownPropertyValue(e.autoCompactOffer, n), r);
  if (typeof s !== "object" || s === null || typeof s.eligibleLoggedAt !== "number") return;
  let { escCount, resolved } = s;
  let u = typeof resolved === "object" && resolved !== null;
  let { choice, tokens } = u ? resolved : {};
  return {
    eligibleLoggedAt: s.eligibleLoggedAt,
    isAnswered: u,
    ...(typeof escCount === "number" &&
      Number.isInteger(escCount) &&
      escCount > 0 && {
        escCount,
      }),
    ...((choice === "accept" || choice === "keep") &&
      typeof tokens === "number" && {
        resolved: {
          choice,
          tokens,
        },
      }),
  };
}
//@ chunk-kswt4qha.js:1872-2056 placement
/**
 * 在自动压缩提议状态里记下某（会话, 键）的 eligibleLoggedAt；已有记录时不改。
 */
function markAutoCompactOfferEligibleLogged(e, accountUuid, modelKey, eligibleLoggedAt) {
  if (readAutoCompactOffer(e, accountUuid, modelKey) !== undefined) return e;
  let f = ownPropertyValue(e.autoCompactOffer, accountUuid);
  return {
    ...e,
    autoCompactOffer: {
      ...e.autoCompactOffer,
      [accountUuid]: {
        ...f,
        [modelKey]: {
          ...ownPropertyValue(f, modelKey),
          eligibleLoggedAt,
        },
      },
    },
  };
}
//@ chunk-kswt4qha.js:2056-2139 placement
/**
 * bumpAutoCompactOfferEsc：记录一次 Esc 计数。
 */
function bumpAutoCompactOfferEsc(e, accountUuid, modelKey) {
  let autoCompactOffer = readAutoCompactOffer(e, accountUuid, modelKey);
  return updateAutoCompactOffer(e, accountUuid, modelKey, {
    escCount: (autoCompactOffer?.escCount ?? 0) + 1,
  });
}
//@ chunk-kswt4qha.js:2139-2190 placement
/**
 * markAutoCompactOfferResolved：标记压缩提议已解决。
 */
function markAutoCompactOfferResolved(e, accountUuid, modelKey, resolved) {
  return updateAutoCompactOffer(e, accountUuid, modelKey, {
    resolved,
  });
}
//@ chunk-kswt4qha.js:2190-2384 placement
function updateAutoCompactOffer(e, n, r, s) {
  let f = ownPropertyValue(e.autoCompactOffer, n);
  let d = ownPropertyValue(f, r);
  let autoCompactOffer = readAutoCompactOffer(e, n, r);
  if (autoCompactOffer === undefined || autoCompactOffer.isAnswered || !d) return e;
  return {
    ...e,
    autoCompactOffer: {
      ...e.autoCompactOffer,
      [n]: {
        ...f,
        [r]: {
          ...d,
          ...s,
        },
      },
    },
  };
}
//@ chunk-kswt4qha.js:2384-2469 placement
function ownPropertyValue(autoCompactOffer, n) {
  return typeof autoCompactOffer === "object" &&
    autoCompactOffer !== null &&
    Object.hasOwn(autoCompactOffer, n)
    ? autoCompactOffer[n]
    : undefined;
}
//@ chunk-kswt4qha.js:2469-2557 placement
/**
 * isAutoCompactOfferAnswered：压缩提议已回答或被跳过。
 */
function isAutoCompactOfferAnswered(globalConfig, accountUuid, r) {
  let autoCompactOffer = readAutoCompactOffer(globalConfig, accountUuid, r);
  return (
    autoCompactOffer !== undefined && (autoCompactOffer.isAnswered || (autoCompactOffer.escCount ?? 0) > 0)
  );
}
//@ chunk-kswt4qha.js:2947-3029 placement
function proactivityModeFloor(e, n) {
  if (n === "auto" || (e === "proactive" && n === "acceptEdits")) return n;
  return;
}
//@ chunk-kswt4qha.js:3029-3066 placement
/**
 * parseEffortOrKeyword：解析 effort 值或关键字。
 */
function parseEffortOrKeyword(e) {
  return parseEffortValue(e) ?? resolveEffortKeyword(e);
}
//@ chunk-kswt4qha.js:3066-3207 callgraph-fingerprint = getAutoModeEnabledStateIfCached (0.462)
function isAutoModeKillswitchServed() {
  let { value: e, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_auto_mode_config", {});
  if (e?.enabled !== "disabled") return false;
  return source === "override" || source === "payload";
}
//@ chunk-kswt4qha.js:3207-9146 fingerprint = initialPermissionModeFromCLI (0.311)
/**
 * 纯函数决定启动模式：按 --dangerously-skip-permissions、--permission-mode、agent frontmatter、settings defaultMode（project/local 不能授予 bypass/auto，CCR 只允许 acceptEdits/plan/default/auto）、继承模式的顺序取第一个可用模式；都没有时满足条件可默认 auto；再按主动性档位覆盖。返回模式、通知、各种“等待策略结论”标志。
 */
function initialPermissionModeFromCLI_2(inputs) {
  let { cli, env, settings, agentFrontmatter } = inputs;
  let d = normalizePermissionModeAlias(cli.permissionMode);
  let u = normalizePermissionModeAlias(cli.inheritPermissionMode);
  let dangerouslySkipPermissions = cli.dangerouslySkipPermissions;
  let permissionMode = agentFrontmatter?.permissionMode;
  let S = Boolean(dangerouslySkipPermissions || d || permissionMode);
  if (isEnvTruthy(env.CLAUDE_CODE_SUBPROCESS_ENV_SCRUB)) {
    let g =
      dangerouslySkipPermissions ||
      (d && d !== "default") ||
      (u && u !== "default") ||
      (permissionMode && permissionMode !== "default");
    let M =
      "Permission mode forced to default \u2014 CLAUDE_CODE_SUBPROCESS_ENV_SCRUB is set " +
      "(allowed_non_write_users hardening). Declare allowedTools explicitly, or set CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=0 to opt out.";
    return {
      mode: "default",
      notification: g ? M : undefined,
      fromAutoFallback: false,
      baselineMode: "default",
      decidedByProactivityLevel: false,
      modeSuppliedOnInvocation: true,
      autoDefaultWithheldForPendingVerdict: false,
      levelPickHeldForPendingVerdict: undefined,
      autoStartWithheldForHipaaTaint: false,
    };
  }
  let h = settings.permissions?.disableBypassPermissionsMode === "disable";
  let y = isAutoModeKillswitchServed();
  let x = !y && !isAutoModeDisabledBySettings_2(settings);
  let orderedModes = [];
  let _;
  let D = u
    ? parseStartupPermissionMode(
        u,
        y,
        "inherited auto mode dropped \u2014 auto mode killswitch active (override- or payload-served)",
      )
    : undefined;
  let P = u ? (D?.mode ?? permissionModeFromString(u)) : undefined;
  if (dangerouslySkipPermissions)
    if (isUnconsentedBgBypass("bypassPermissions")) {
      _ = BYPASS_CONSENT_MESSAGE;
      orderedModes.push("default");
    } else orderedModes.push("bypassPermissions");
  if (d) {
    let startupPermissionMode = parseStartupPermissionMode(
      d,
      y,
      "auto mode killswitch active (override- or payload-served) \u2014 falling back to default",
    );
    if (startupPermissionMode) {
      if (startupPermissionMode.unconsented) _ = BYPASS_CONSENT_MESSAGE;
      orderedModes.push(startupPermissionMode.mode);
    }
  }
  if (permissionMode)
    if (permissionMode === "auto" && y)
      logForDebugging(
        "agent frontmatter requested auto mode but circuit breaker active \u2014 falling through",
        {
          level: "warn",
        },
      );
    else if (P && narrowerMode(permissionMode, P) === undefined) {
      logForDebugging(
        `agent frontmatter permissionMode "${permissionMode}" ignored \u2014 it would widen the agent view's inherited mode (effective "${P}"), and the dispatched agent name is repo-controllable (settings \`agent\`)`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_agent_frontmatter_mode_widening_carry_ignored", {});
    } else orderedModes.push(permissionMode);
  if (isVsCodeTopSession()) {
    let g = !isHarborWillowEnabled()
      ? undefined
      : enabledSettingSourcesReversed()
          .map((M) => normalizePermissionModeAlias(getSettingsForSource(M)?.permissions?.defaultMode))
          .find((M) => M != null);
    if (g != null && isEnvTruthy(env.CLAUDE_CODE_REMOTE) && !isRemoteSupportedMode(g)) {
      logForDebugging(
        `settings defaultMode "${g}" is not supported in CLAUDE_CODE_REMOTE \u2014 only acceptEdits, plan, default, and auto are allowed`,
        {
          level: "warn",
        },
      );
      if (orderedModes.length === 0) {
        logEvent("tengu_ccr_unsupported_default_mode_ignored", {
          mode_hash: shortHash(g),
        });
        orderedModes.push("default");
      }
    } else if (g === "bypassPermissions") {
      if (dangerouslySkipPermissions || cli.allowDangerouslySkipPermissions) {
        if (isUnconsentedBgBypass("bypassPermissions")) {
          if (orderedModes.length === 0) {
            _ = BYPASS_CONSENT_MESSAGE;
            process.stderr.write(`\u26A0 ${_}
`);
          }
          orderedModes.push("default");
        } else orderedModes.push(g);
      } else if (orderedModes.length === 0) {
        _ =
          'Permission mode bypassPermissions from settings was ignored \u2014 enable the "Claude Code: Allow Dangerously Skip Permissions" setting in VS Code to consent to it';
        logForDebugging(
          'settings defaultMode "bypassPermissions" ignored for a VS Code-owned session without the allow-bypass setting',
          {
            level: "warn",
          },
        );
        logEvent("tengu_settings_bypass_unconsented_noninteractive_ignored", {});
        process.stderr.write(`\u26A0 ${_}
`);
        orderedModes.push("default");
      }
    } else if (g === "auto") {
      if (!y) orderedModes.push(g);
      else
        logForDebugging(
          'settings defaultMode "auto" ignored for the IDE session \u2014 auto-mode circuit breaker is active',
          {
            level: "warn",
          },
        );
    } else if (g != null) orderedModes.push(g);
  } else if (settings.permissions?.defaultMode) {
    let parsedMode = normalizePermissionModeAlias(settings.permissions.defaultMode);
    if (isEnvTruthy(env.CLAUDE_CODE_REMOTE) && !isRemoteSupportedMode(parsedMode)) {
      logForDebugging(
        `settings defaultMode "${parsedMode}" is not supported in CLAUDE_CODE_REMOTE \u2014 only acceptEdits, plan, default, and auto are allowed`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_ccr_unsupported_default_mode_ignored", {
        mode_hash: shortHash(parsedMode),
      });
    } else if (parsedMode === "bypassPermissions") {
      if (!isDefaultModeSetByTrustedSource("bypassPermissions")) {
        logForDebugging(
          'settings defaultMode "bypassPermissions" ignored \u2014 only policy/user/flag settings may grant bypass mode (projectSettings and localSettings are repo-controllable)',
          {
            level: "warn",
          },
        );
        logEvent("tengu_settings_bypass_mode_untrusted_source_ignored", {});
        if (!u) orderedModes.push("default");
      } else if (isUnconsentedBgBypass("bypassPermissions")) {
        if (orderedModes.length === 0) _ = BYPASS_CONSENT_MESSAGE;
        orderedModes.push("default");
      } else orderedModes.push(parsedMode);
    } else if (parsedMode !== "auto") {
      if (P && !isDefaultModeSetByTrustedSource(parsedMode) && narrowerMode(parsedMode, P) === undefined) {
        logForDebugging(
          `settings defaultMode "${parsedMode}" ignored \u2014 it would widen the agent view's inherited mode (effective "${P}"), and only policy/user/flag settings may do that (projectSettings and localSettings are repo-controllable)`,
          {
            level: "warn",
          },
        );
        logEvent("tengu_settings_mode_widening_carry_ignored", {});
      } else orderedModes.push(parsedMode);
    } else if (!isDefaultModeSetByTrustedSource("auto")) {
      logForDebugging(
        'settings defaultMode "auto" ignored \u2014 only policy/user/flag settings may grant auto mode (projectSettings and localSettings are repo-controllable)',
        {
          level: "warn",
        },
      );
      logEvent("tengu_settings_auto_mode_untrusted_source_ignored", {});
    } else if (y)
      logForDebugging(
        "auto mode killswitch active (override- or payload-served) \u2014 falling back to default",
        {
          level: "warn",
        },
      );
    else if (
      isEnvTruthy(env.CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT) &&
      isAutoModeDisabledBySettings_2(settings)
    )
      logForDebugging(
        'settings defaultMode "auto" ignored \u2014 disableAutoMode is set and this is an unattended Remote Control machine session',
        {
          level: "warn",
        },
      );
    else orderedModes.push("auto");
  }
  if (u) {
    let g = D;
    if (g) {
      if (g.unconsented && orderedModes.length === 0) _ = BYPASS_CONSENT_MESSAGE;
      orderedModes.push(g.mode);
    }
  }
  let L;
  for (let mode of orderedModes) {
    if (mode === "bypassPermissions" && h) {
      logForDebugging("bypassPermissions mode is disabled by settings", {
        level: "warn",
      });
      _ = "Bypass permissions mode was disabled by settings";
      continue;
    }
    L = {
      mode,
      notification: _,
    };
    break;
  }
  let C = false;
  let A = false;
  let levelPickHeldForPendingVerdict;
  let T = false;
  if (!L) {
    let g =
      x &&
      ((!isEnvTruthy(env.CLAUDE_CODE_REMOTE) &&
        isHarborWillowEnabled() &&
        (!cli.isNonInteractiveSession ||
          isVsCodeTopSession() ||
          getFeatureValue_CACHED_MAY_BE_STALE("tengu_moss_anchor", false))) ||
        isEnvTruthy(env.CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT));
    let mode = "default";
    if (g) {
      let hipaaPolicyVerdict = getHipaaPolicyVerdict();
      let k = isEnvTruthy(env.CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT);
      if (hipaaPolicyVerdict === undefined || (hipaaPolicyVerdict === "pending" && k)) {
        mode = "auto";
        C = true;
      } else if (hipaaPolicyVerdict === "taint") {
        _ ??= AUTO_NOT_ORG_DEFAULT_NOTICE;
        T = true;
      } else if (hipaaPolicyVerdict === "pending") A = true;
    }
    L = {
      mode,
      notification: _,
    };
  }
  let mode = L.mode;
  let decidedByProactivityLevel = false;
  if (inputs.proactivityLevel && inputs.proactivityLevel !== "default" && !S) {
    let g = permissionModeForProactivityLevel(
      inputs.proactivityLevel,
      {
        isAutoModeAvailable: x,
        isBypassPermissionsModeAvailable: false,
      },
      mode,
    );
    let M = proactivityModeFloor(inputs.proactivityLevel, g);
    let proactivityPolicyVerdict = getProactivityPolicyVerdict(inputs.proactivityLevel, g, mode);
    let k =
      proactivityPolicyVerdict === "pending" && isEnvTruthy(env.CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT)
        ? undefined
        : proactivityPolicyVerdict;
    if (M !== undefined && k === "taint") {
      L.notification ??= orgDefaultModeNotice(M);
      T = true;
    } else if (k === "pending") {
      A = true;
      levelPickHeldForPendingVerdict = M;
    }
    L = {
      mode: k === undefined ? g : "default",
      notification: L.notification,
    };
    C = false;
    decidedByProactivityLevel = true;
  }
  return {
    mode: L.mode,
    notification: L.notification,
    fromAutoFallback: C,
    baselineMode: mode,
    decidedByProactivityLevel,
    modeSuppliedOnInvocation: S,
    autoDefaultWithheldForPendingVerdict: A,
    levelPickHeldForPendingVerdict,
    autoStartWithheldForHipaaTaint: T,
  };
}
//@ chunk-kswt4qha.js:9146-9213 layout
var ORG_DEFAULT_MODE_LABELS = {
  auto: "Auto mode",
  acceptEdits: "Accept edits",
};
var AUTO_NOT_ORG_DEFAULT_NOTICE = orgDefaultModeNotice("auto");
//@ chunk-kswt4qha.js:9213-9310 layout
function orgDefaultModeNotice(e) {
  return `${ORG_DEFAULT_MODE_LABELS[e]} isn't the default for your organization \xB7 Shift+Tab to switch`;
}
//@ chunk-kswt4qha.js:9310-9423 layout
function orgPolicyNotLoadedNotice(levelPickHeldForPendingVerdict) {
  return `${ORG_DEFAULT_MODE_LABELS[levelPickHeldForPendingVerdict]} didn't start: your organization's policy hasn't loaded \xB7 Shift+Tab to switch`;
}
//@ chunk-kswt4qha.js:9423-9497 layout
/**
 * 主动性档位对应模式与当前不同时，返回 HIPAA 策略结论（taint/pending），否则 undefined。
 */
function getProactivityPolicyVerdict(e, n, r) {
  let s = proactivityModeFloor(e, n);
  if (s === undefined || s === r) return;
  return getHipaaPolicyVerdict();
}
//@ chunk-kswt4qha.js:9497-9622 layout
/**
 * HIPAA 策略结论：已知 HIPAA 或曾见到不可得的 HIPAA 状态时为 taint，策略待定时为 pending。
 */
function getHipaaPolicyVerdict() {
  let e = autoDefaultVerdictState();
  if (hasComplianceTaint("hipaa") || e === "unobtainable_seen_hipaa") return "taint";
  return e === "pending" ? "pending" : undefined;
}
//@ chunk-kswt4qha.js:9622-9776 layout
/**
 * 启动参数解析：取 CLI 或 settings 的 fallbackModel 列表并规范化（与权限无关，属模型/启动选项解析）。
 */
function resolveFallbackModels(e) {
  let n =
    e.cli.fallbackModel ?? (Array.isArray(e.settings.fallbackModel) ? e.settings.fallbackModel : undefined);
  if (n === undefined) return;
  return parseToolListFromCLI(n, isModelAllowed);
}
//@ chunk-kswt4qha.js:9776-9851 file-local
/**
 * 把逗号分隔字符串拆成去空白的非空项列表。
 */
function splitCommaList(baseTools) {
  return baseTools
    .split(",")
    .map((n) => n.trim())
    .filter((n) => n !== "");
}
//@ chunk-kswt4qha.js:9851-10130 file-local
function parseToolListFromCLI(baseTools, isModelAllowed) {
  let r = typeof baseTools === "string" ? splitCommaList(baseTools) : baseTools;
  let s = new Set();
  let result = [];
  for (let toolString of r) {
    let u = typeof toolString === "string" ? toolString.trim() : "";
    if (u === "") continue;
    let userSpecifiedModel = parseUserSpecifiedModel(u === "default" ? getDefaultMainLoopModel() : u);
    if (s.has(userSpecifiedModel)) continue;
    if (!isModelAllowed(userSpecifiedModel)) continue;
    s.add(userSpecifiedModel);
    result.push(userSpecifiedModel);
    if (result.length === MAX_BODY_PARAM_STRINGS) break;
  }
  return result.length > 0 ? result : undefined;
}
//@ chunk-kswt4qha.js:10130-10139 layout
var MAX_BODY_PARAM_STRINGS = 3;
//@ chunk-kswt4qha.js:10139-10409 layout = settingSourceToConfigChangeSource (0.89)
function settingSourceToConfigChangeSource(source) {
  switch (source) {
    case "userSettings":
      return "user_settings";
    case "projectSettings":
      return "project_settings";
    case "localSettings":
      return "local_settings";
    case "flagSettings":
      return "flag_settings";
    case "policySettings":
      return "policy_settings";
    case null:
      return "settings";
  }
}
//@ chunk-kswt4qha.js:10409-10642 layout
function isUserConfiguredSource(e) {
  switch (e) {
    case "env":
    case "user_settings":
    case "project_settings":
    case "local_settings":
    case "flag_settings":
    case "policy_settings":
    case "settings":
    case "agent_frontmatter":
    case "routine_frontmatter":
      return true;
    default:
      return false;
  }
}
//@ chunk-kswt4qha.js:10642-11612 layout
/**
 * 应用组织默认模型：组织锁定模式下记录已见更新时间并按来源决定是否保留模型；普通模式下组织默认更新且覆盖用户选择时清掉用户设置里的 model，并记下已见时间。
 */
function applyOrgModelDefault(model, isExplicitModel, storage) {
  if (isServedCatalogActive()) {
    let orgUpdatedAt = getOrgModelDefaultUpdatedAt();
    if (
      orgUpdatedAt !== null &&
      !isExplicitModel &&
      getAllowedSettingSources().includes("userSettings") &&
      new Date(orgUpdatedAt).getTime() >
        new Date(getGlobalConfig().lastSeenOrgDefaultUpdatedAt ?? 0).getTime()
    )
      saveGlobalConfig(
        (c) =>
          c.lastSeenOrgDefaultUpdatedAt === orgUpdatedAt
            ? c
            : {
                ...c,
                lastSeenOrgDefaultUpdatedAt: orgUpdatedAt,
              },
        storage,
      );
    if (getOrgLockedDefaultModel() === null) return model;
    let modelSource = model ? getEffectiveSettingSource_2("model") : null;
    if (modelSource === "policySettings" || modelSource === "flagSettings") return model;
    return;
  }
  let orgDefault = getOrgModelDefault();
  if (!orgDefault || getBootstrapOrgDefaultEffect() === null) return model;
  let modelSource = model ? getEffectiveSettingSource_2("model") : null;
  if (modelSource === "policySettings" || modelSource === "flagSettings") return model;
  let included = getAllowedSettingSources().includes("userSettings");
  let lastSeenOrgDefaultUpdatedAt = getGlobalConfig().lastSeenOrgDefaultUpdatedAt;
  let isNewerOrgDefault =
    new Date(orgDefault.updated_at).getTime() > new Date(lastSeenOrgDefaultUpdatedAt ?? 0).getTime();
  let shouldMarkSeen = isNewerOrgDefault && !isExplicitModel && included;
  let markSeen = () =>
    saveGlobalConfig(
      (y) =>
        y.lastSeenOrgDefaultUpdatedAt === orgDefault.updated_at
          ? y
          : {
              ...y,
              lastSeenOrgDefaultUpdatedAt: orgDefault.updated_at,
            },
      storage,
    );
  if (orgDefault.override_user_selection) {
    if (shouldMarkSeen) markSeen();
    return;
  }
  if (isExplicitModel) return model;
  let userModel = included ? getSettingsForSource("userSettings")?.model : undefined;
  if (isNewerOrgDefault && userModel) {
    updateSettingsForSource(
      "userSettings",
      {
        model: undefined,
      },
      undefined,
      storage,
    ).then((y) => {
      if (!y.error) markSeen();
    });
    if (modelSource === "userSettings") return;
  } else if (shouldMarkSeen) markSeen();
  return model;
}
//@ chunk-kswt4qha.js:11612-12575 layout
/**
 * 启动时解析主模型：CLI --model（default 取默认模型）> agent frontmatter 的 model > env ANTHROPIC_MODEL > settings.model，并记录来源；随后校验模型可用性（与权限无关，属模型解析）。
 */
function resolveStartupModel(e, storage) {
  let { cli, env, settings, agentFrontmatter } = e;
  let u = cli.model === "default" ? getDefaultMainLoopModel() : cli.model;
  let E = u;
  let m = null;
  if (u) m = cli.model === "default" ? "cli_default" : "cli";
  let model = agentFrontmatter?.model;
  let h;
  if (!u && model && model !== "inherit") {
    h = model;
    u = parseUserSpecifiedModel(model);
    E = model;
    m = agentFrontmatter?.modelSource === "routine" ? "routine_frontmatter" : "agent_frontmatter";
  }
  let y = false;
  let modelWithoutStartupOverride;
  let c = u;
  if (c === undefined) {
    if (env.ANTHROPIC_MODEL) {
      c = env.ANTHROPIC_MODEL;
      m = "env";
    } else {
      c =
        applyOrgModelDefault(settings.model || undefined, cli.isNonInteractiveSession === true, storage) ||
        undefined;
      if (c !== undefined) m = settingSourceToConfigChangeSource(getEffectiveSettingSource_2("model"));
    }
    E = c;
  }
  let _;
  if (c && !isModelAllowed(c)) {
    let C = h !== undefined && !y ? h : c;
    let A = y ? null : stepDownRestrictedFamilyAliasPick(C);
    if (A !== null) {
      _ = C;
      c = A;
      if (u !== undefined) u = A;
    } else {
      if (!(C.trim().toLowerCase() === "default" || isWindowSilentDefaultPick(C)) && !y) _ = C;
      c = undefined;
      E = undefined;
      m = null;
      u = undefined;
    }
  }
  let unservedModelSpelling;
  if (c && isUnservedModelSpelling(c, isUserConfiguredSource(m) ? "persisted" : "explicit")) {
    unservedModelSpelling = c;
    c = undefined;
    E = undefined;
    m = null;
    u = undefined;
  }
  let P = c || null;
  let resolvedInitialModel = parseUserSpecifiedModel(P ?? getDefaultMainLoopModel());
  return {
    effectiveModel: u,
    initialMainLoopModel: P,
    resolvedInitialModel,
    rawModelRequest: E || null,
    restrictedModel: _,
    unservedModelSpelling,
    settingLayer: m,
    modelWithoutStartupOverride,
  };
}
//@ chunk-kswt4qha.js:12575-12719 layout
/**
 * 启动参数解析：取 CLI 的 systemPrompt 与 appendSystemPrompt，并把额外的附加系统提示拼到 append 之后。
 */
function resolveSystemPromptOptions(e) {
  let systemPrompt = e.cli.systemPrompt;
  let appendSystemPrompt = e.cli.appendSystemPrompt;
  let s = remoteAppendSystemPrompt();
  if (s)
    appendSystemPrompt = appendSystemPrompt
      ? `${appendSystemPrompt}

${s}`
      : s;
  return {
    systemPrompt,
    appendSystemPrompt,
  };
}
//@ chunk-kswt4qha.js:12719-12797 layout
/**
 * GrowthBook tengu_harbor_willow（默认开）或远端配置 meadow_lantern 为真时返回 true；用途是启动选项的一个特性闸门。
 */
function isHarborWillowEnabled() {
  return (
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_harbor_willow", true) ||
    getCachedClientDataStrict()?.meadow_lantern === true
  );
}
//@ chunk-kswt4qha.js:12797-12887 layout
var Ce = SETTING_SOURCES.filter((e) => !REPO_DIR_SETTING_SOURCES.has(e)).toReversed();
var REVERSED_SETTING_SOURCES = ["acceptEdits", "plan", "default", "auto"];
//@ chunk-kswt4qha.js:12887-12923 layout
function isRemoteSupportedMode(e) {
  return REVERSED_SETTING_SOURCES.includes(e);
}
//@ chunk-kswt4qha.js:12923-12957 layout
function enabledSettingSourcesReversed() {
  return Ce.filter(isSettingSourceEnabled);
}
//@ chunk-kswt4qha.js:12957-13029 layout
function isDefaultModeSetByTrustedSource(parsedMode) {
  return enabledSettingSourcesReversed().some(
    (n) => getSettingsForSource(n)?.permissions?.defaultMode === parsedMode,
  );
}
//@ chunk-kswt4qha.js:13029-13124 layout = isAutoModeDisabledBySettings (1)
function isAutoModeDisabledBySettings_2(settings) {
  return settings.permissions?.disableAutoMode === "disable" || settings.disableAutoMode === "disable";
}
//@ chunk-kswt4qha.js:13124-13159 layout
function canSeedAutoMode(settings) {
  return !isAutoModeDisabledBySettings_2(settings) && !isAutoModeKillswitchServed();
}
//@ chunk-kswt4qha.js:13159-13300 layout
function isTrustedPlanDisplaced(settings) {
  return (
    enabledSettingSourcesReversed()
      .map((r) => normalizePermissionModeAlias(getSettingsForSource(r)?.permissions?.defaultMode))
      .find((r) => r != null) === "plan" &&
    normalizePermissionModeAlias(settings.permissions?.defaultMode) !== "plan"
  );
}
//@ chunk-kswt4qha.js:13300-13739 layout
/**
 * 找出最后一个设置了 defaultMode 的设置层（auto 来自不可信层除外）；层不可读时返回 settings_unreadable，非 auto 默认返回 stored_default，否则 undefined。
 */
function getStoredDefaultModeBar() {
  let last = SETTING_SOURCES.filter(isSettingSourceEnabled)
    .map((n) => ({
      source: n,
      mode: (
        n === "policySettings"
          ? getFatalAdminPolicyLoadErrors().length > 0 ||
            getPolicySettingsLoadErrors().some((r) => r.userWritable === true && r.path === "") ||
            (getParentManagedSettingsInvalid() && parentManagedTierParticipates()) ||
            (getEligibilityMemo() !== false && !getRemoteManagedSettingsSyncFromCache())
          : getSettingsParseErrorsForSource(n).some((r) => r.severity !== "warning")
      )
        ? "unreadable"
        : getSettingsForSource(n)?.permissions?.defaultMode,
    }))
    .findLast(
      ({ source, mode }) => mode !== undefined && (mode !== "auto" || !REPO_DIR_SETTING_SOURCES.has(source)),
    );
  return last === undefined || last.mode === "auto"
    ? undefined
    : last.mode === "unreadable"
      ? "settings_unreadable"
      : "stored_default";
}
//@ chunk-kswt4qha.js:13739-13993 layout
/**
 * auto 能否作为启动模式“种入”的因素：可种入（设置允许且非 scrub）、存储的 defaultMode 阻挡、用户另选了档位或继承模式、继承 plan 保持、可信 plan 被替换。
 */
function getAutoSeedFactors({ settings, scrubbed, typedLevel, carriedMode }) {
  let f = typedLevel !== undefined && typedLevel !== "default";
  return {
    autoSeedable: canSeedAutoMode(settings) && !scrubbed,
    storedDefaultBar: getStoredDefaultModeBar(),
    otherChoiceTyped: f || (carriedMode !== undefined && carriedMode !== "auto"),
    carriedPlanHolds: carriedMode === "plan" && !f,
    trustedPlanDisplaced: isTrustedPlanDisplaced(settings),
  };
}
//@ chunk-kswt4qha.js:13993-14132 fingerprint = isDefaultPermissionModeAuto (1)
function getSettingsDefaultMode(settings) {
  let n = normalizePermissionModeAlias(settings.permissions?.defaultMode);
  if (n == null || !isRemoteSupportedMode(n)) return;
  if (n !== "auto") return n;
  return isDefaultModeSetByTrustedSource("auto") && canSeedAutoMode(settings) ? "auto" : undefined;
}
//@ chunk-kswt4qha.js:14132-14419 layout
/**
 * 启动模式遥测：未显式指定模式/跳过权限/scrub 时记录 settings 的 defaultMode 与 effort。
 */
function getStartupModeTelemetry({
  gateOn,
  permissionModeTyped,
  dangerouslySkipPermissions,
  scrubbed,
  settings,
  effort,
}) {
  let u = !permissionModeTyped && !dangerouslySkipPermissions && !scrubbed;
  let E = u ? getSettingsDefaultMode(settings) : undefined;
  return {
    considered: gateOn && u,
    settingsDefaultModePresent: settings.permissions?.defaultMode != null,
    settingsDefault: E,
    permissionMode: gateOn ? E : undefined,
    effort: gateOn ? effort : undefined,
  };
}
//@ chunk-kswt4qha.js:14419-14596 layout
/**
 * 远程会话的模式：发来的模式为 auto 时返回 undefined（另行处理），有则用之；否则取仓库设置的 defaultMode（须为远程支持的非 auto 模式），缺省 default。
 */
function resolveRemoteSessionMode({ sentMode, repositorySettings }) {
  if (sentMode === "auto") return;
  if (sentMode !== undefined) return sentMode;
  let modeOrUndefined = parseModeOrUndefined(repositorySettings?.permissions?.defaultMode);
  return modeOrUndefined !== undefined && modeOrUndefined !== "auto" && isRemoteSupportedMode(modeOrUndefined)
    ? modeOrUndefined
    : "default";
}
//@ chunk-kswt4qha.js:14596-15121 placement
/**
 * 决定初始权限模式是否采用设置中的默认模式。
 */
function resolveSeedPermissionMode({ seed, settingsMode, sentMode, startsIn }) {
  if (
    !seed.considered ||
    !seed.settingsDefaultModePresent ||
    seed.permissionMode !== undefined ||
    settingsMode === undefined ||
    (sentMode !== undefined && parseModeOrUndefined(settingsMode) === sentMode)
  )
    return null;
  let f =
    parseModeOrUndefined(settingsMode) === "auto"
      ? "auto mode could not be requested from this machine (it is off here, or only the repository asked for it)"
      : "not a mode a cloud session can start in";
  return {
    text: `Settings kept on this machine: the default permission mode in your settings (${settingsMode}) \u2014 ${f}${startsIn !== undefined ? `; the session starts in ${startsIn} mode` : ""}`,
    level: "info",
  };
}
//@ chunk-kswt4qha.js:15121-15166 placement
function parseModeOrUndefined(e) {
  return e === undefined ? undefined : parsePermissionMode(e);
}
//@ chunk-kswt4qha.js:15166-15655 placement
/**
 * 后台工作者使用 bypass 需要同意的说明。
 */
var BYPASS_CONSENT_MESSAGE_2 =
  'bypass in a background worker needs consent recorded in your user settings \u2014 add "skipDangerousModePermissionPrompt": true to ~/.claude/settings.json (accepting the interactive disclaimer writes the same key, but that dialog is skipped while consent already exists in .claude/settings.local.json or via --settings, which does not count here). A launch with user settings off does not read that file: relaunch with them on';
var BYPASS_CONSENT_MESSAGE = `Permission mode downgraded to default: ${BYPASS_CONSENT_MESSAGE_2}`;
//@ chunk-kswt4qha.js:15655-15775 placement
/**
 * 后台会话以 bypassPermissions 启动但未接受过绕过模式确认时返回 true。
 */
function isUnconsentedBgBypass(e) {
  if (!isBgSession()) return false;
  if (e === "bypassPermissions")
    return !hasVouchedSkipDangerousModePermissionPrompt() && !getGlobalConfig().bypassPermissionsModeAccepted;
  return false;
}
//@ chunk-kswt4qha.js:15775-15913 placement
function parseStartupPermissionMode(e, n, r) {
  let s = permissionModeFromString(e);
  if (isUnconsentedBgBypass(s))
    return {
      mode: "default",
      unconsented: true,
    };
  if (s === "auto" && n) {
    logForDebugging(r, {
      level: "warn",
    });
    return;
  }
  return {
    mode: s,
  };
}
//@ chunk-kswt4qha.js:15913-15971 placement
/**
 * tengu_virtual_pancake 开关。
 */
function isVirtualPancakeEnabled() {
  return noExtraBodyParams() ?? getFeatureValue_SESSION_PINNED("tengu_virtual_pancake", false);
}
//@ chunk-kswt4qha.js:15971-15992 placement
function noExtraBodyParams() {
  return;
}
//@ chunk-kswt4qha.js:15992-16039 placement
/**
 * 两个 effort 是否相同。
 */
function sameEffort(e, n) {
  return (
    strippedCanonicalName(parseUserSpecifiedModel(e)) === strippedCanonicalName(parseUserSpecifiedModel(n))
  );
}
//@ chunk-kswt4qha.js:16039-16069 placement
var TENGU_LOGGIA_PASSAGE = "tengu_loggia_passage";
//@ chunk-kswt4qha.js:16069-16098 placement
function isEffortCarryDisabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LOGGIA_PASSAGE, false);
}
//@ chunk-kswt4qha.js:16098-16362 placement
/**
 * 判断拒绝回退时是否把已发送的 effort 带到回退模型：没发送、来自钩子、来自轮次层或被开关关闭时不带并说明原因。
 */
function getRefusedEffortCarry({ sent, turnEffort, hookEffortValue }) {
  if (sent === undefined)
    return {
      carry: null,
      withheld: "none_sent",
    };
  if (hookEffortValue !== undefined)
    return {
      carry: null,
      withheld: "hook",
    };
  if (turnEffort !== undefined)
    return {
      carry: null,
      withheld: "turn_layer",
    };
  return isEffortCarryDisabled()
    ? {
        carry: null,
        withheld: "killed",
      }
    : {
        carry: sent,
      };
}
//@ chunk-kswt4qha.js:16362-16480 placement
/**
 * 把 effort 携带结果转成遥测字段。
 */
function refusedEffortTelemetryFields(refusedEffort) {
  return {
    refused_effort_level: fromEnumOpt(refusedEffort.carry),
    refused_effort_withheld: fromEnumOpt(refusedEffort.carry === null ? refusedEffort.withheld : undefined),
  };
}
//@ chunk-kswt4qha.js:16480-16729 placement
/**
 * 计算拒绝回退后的 effort：会话持有时只锁定携带值；否则取携带值或循环覆盖值，作为回退模型的循环 effort。
 */
function resolveRefusalFallbackEffort({
  refusedEffort,
  fallbackModel,
  heldBySession,
  loopOverride,
  loopEffort,
}) {
  if (heldBySession)
    return {
      latchEffort: refusedEffort.carry ?? undefined,
      loopEffort: undefined,
    };
  let d = refusedEffort.carry ?? carriedEffortForModel(loopOverride, loopEffort);
  return {
    latchEffort: undefined,
    loopEffort:
      d === undefined
        ? undefined
        : {
            model: fallbackModel,
            level: d,
          },
  };
}
//@ chunk-kswt4qha.js:16729-16793 placement
/**
 * carriedEffortForModel：该模型可沿用的 effort。
 */
function carriedEffortForModel(e, loopEffort) {
  return loopEffort !== undefined && loopEffort.model === e ? loopEffort.level : undefined;
}
//@ chunk-kswt4qha.js:16793-16843 placement
/**
 * hasCarriedRefusalEffort：回退锁存里带了 effort。
 */
function hasCarriedRefusalEffort() {
  return getRefusalFallbackModelLatch()?.carriedEffort !== undefined;
}
//@ chunk-kswt4qha.js:16843-17031 placement
function getCarriedRefusalEffort(e) {
  let refusalFallbackModelLatch = getRefusalFallbackModelLatch();
  let mainLoopModelOverride = getMainLoopModelOverride();
  if (
    refusalFallbackModelLatch?.carriedEffort === undefined ||
    mainLoopModelOverride == null ||
    isEffortCarryDisabled()
  )
    return;
  try {
    return sameEffort(mainLoopModelOverride, refusalFallbackModelLatch.fallbackModel) &&
      sameEffort(e, refusalFallbackModelLatch.fallbackModel)
      ? refusalFallbackModelLatch.carriedEffort
      : undefined;
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-kswt4qha.js:17031-17150 placement
/**
 * 取本轮循环的 effort：有显式值时用（被开关关闭则 null）；延续主会话时取携带的拒绝回退 effort。
 */
function resolveLoopEffort({ loopEffort, continuesMainConversation }, r) {
  if (loopEffort !== undefined) return isEffortCarryDisabled() ? null : loopEffort;
  return (continuesMainConversation ? getCarriedRefusalEffort(r) : undefined) ?? null;
}
//@ chunk-kswt4qha.js:17150-17321 placement
/**
 * 比较携带 effort 带与不带的结果，得出 moot/no_effect/clamped/applied_over_saved/applied。
 */
function classifyEffortCarryEffect({ carried, withIt, withoutIt, isSavedSetAside }) {
  if (withIt === withoutIt) return withIt === carried ? "moot" : "no_effect";
  if (withIt !== carried) return "clamped";
  return isSavedSetAside ? "applied_over_saved" : "applied";
}
//@ chunk-kswt4qha.js:17321-17357 placement
/**
 * releaseCarriedEffortForEffortChange：effort 改变时释放携带值。
 */
function releaseCarriedEffortForEffortChange() {
  releaseRefusalFallbackCarriedEffort("effort_change");
}
//@ chunk-kswt4qha.js:17357-17443 placement
/**
 * releaseCarriedEffortIfModelChanged：模型不再是回退模型时释放。
 */
function releaseCarriedEffortIfModelChanged(e) {
  let refusalFallbackModelLatch = getRefusalFallbackModelLatch();
  if (refusalFallbackModelLatch !== undefined && !sameEffort(e, refusalFallbackModelLatch.fallbackModel))
    releaseRefusalFallbackCarriedEffort("model_change");
}
//@ chunk-kswt4qha.js:17443-17603 placement
/**
 * 开关关闭或主模型已不是回退模型时释放携带的拒绝回退 effort。
 */
function releaseStaleRefusalEffortCarry() {
  let refusalFallbackModelLatch = getRefusalFallbackModelLatch();
  if (refusalFallbackModelLatch?.carriedEffort === undefined) return;
  let mainLoopModelOverride = getMainLoopModelOverride();
  if (isEffortCarryDisabled()) releaseRefusalFallbackCarriedEffort("kill_switch");
  else if (
    mainLoopModelOverride == null ||
    !sameEffort(mainLoopModelOverride, refusalFallbackModelLatch.fallbackModel)
  )
    releaseRefusalFallbackCarriedEffort("model_change");
}
//@ chunk-kswt4qha.js:17603-17687 placement
/**
 * 是否启用最大 effort 提醒。
 */
function isMaxEffortReminderEnabled() {
  return (
    env.CLAUDE_CODE_MAX_EFFORT_REMINDER ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_proud_clover", false)
  );
}
//@ chunk-kswt4qha.js:17687-17711 placement
/**
 * isSpecialEffortKeywordDisabled：恒 false（构建时裁掉的关键字检查）。
 */
function isSpecialEffortKeywordDisabled() {
  return false;
}
//@ chunk-kswt4qha.js:17711-17736 placement
/**
 * 恒为 false（构建时裁掉的特殊 effort 关键字检查）。
 */
function isReservedEffortKeyword(e) {
  return false;
}
//@ chunk-sfy7bm1n.js:6520-6553 placement
var clearedSeenSet = identity(new Set(), (e) => e.clear());
//@ chunk-sfy7bm1n.js:6553-6971 placement
function warnMcpRuleMismatch(e, r) {
  let toolName = e.toolName;
  if (clearedSeenSet.has(toolName)) return;
  clearedSeenSet.add(toolName);
  logForDebugging(
    r.mcpInfo
      ? `Allow rule "${toolName}" does not allow the tools named "${getMcpPrefix_2(r.mcpInfo.serverName)}<tool>": they belong to another MCP server than the rule names. To allow them, use "${getMcpPrefix_2(r.mcpInfo.serverName)}*".`
      : `Allow rule "${toolName}" does not allow "${r.name}": the name reads as more than one MCP server's. To allow it, use the tool's full name.`,
    {
      level: "warn",
    },
  );
}
//@ chunk-sfy7bm1n.js:6971-6999 placement
var TENGU_GREEDY_SHORE = "tengu_greedy_shore";
//@ chunk-sfy7bm1n.js:6999-7035 placement
/**
 * greedyShoreEnabled：tengu_greedy_shore 开关。
 */
function greedyShoreEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_GREEDY_SHORE, false) === true;
}
//@ chunk-sfy7bm1n.js:7035-7061 placement
/**
 * mcpToolAliasSetSlot：按宿主保存的 MCP 工具别名集合。
 */
var mcpToolAliasSetSlot = new HostScoped(() => new Set());
//@ chunk-sfy7bm1n.js:7061-7111 placement
function addMcpToolAlias(e, r) {
  for (let o of r) mcpToolAliasSet().add(buildMcpToolName(e, o));
}
//@ chunk-sfy7bm1n.js:7111-7221 placement = getMcpPrefix (1)
function getMcpPrefix(serverName) {
  if (!serverName.startsWith("mcp__")) return false;
  for (let r of mcpToolAliasSet())
    if (
      serverName === r ||
      mcpRuleMatchesToolAny(serverName, {
        name: r,
      })
    )
      return true;
  return false;
}
//@ chunk-sfy7bm1n.js:7221-7254 placement
/**
 * hasMcpToolAliases：是否存在 MCP 工具别名。
 */
function hasMcpToolAliases() {
  return mcpToolAliasSet().size > 0;
}
//@ chunk-sfy7bm1n.js:7254-7290 placement
function mcpToolAliasSet() {
  return mcpToolAliasSetSlot.of(getRootSession().host);
}
//@ chunk-sfy7bm1n.js:7807-7922 facade-exports
/**
 * Bash 规则是否危险：整工具、空内容或全是空白/星号，或命中危险命令前缀表。
 */
function isDangerousBashPermission(e, r) {
  if (e !== BASH_TOOL_NAME) return false;
  if (r === undefined || r === "") return true;
  if (/^[\s*]+$/.test(r)) return true;
  return matchesDangerousCommandPrefix(r, DANGEROUS_BASH_RULE_PREFIXES);
}
//@ chunk-sfy7bm1n.js:7922-8705 layout
/**
 * Bash 规则内容是否等价于“任意执行某危险前缀”：*、前缀本身、"前缀:*"/"前缀 *"/"前缀*"，或以前缀开头并以 * 结尾；网络/云命令只在子命令危险或含 $/` 时算；python -m 包名例外。
 */
function matchesDangerousCommandPrefix(ruleContent, prefixes) {
  let lower = ruleContent.trim().toLowerCase();
  if (lower === "*") return true;
  for (let prefix of prefixes) {
    let lower_2 = prefix.toLowerCase();
    if (lower === lower_2) return true;
    if (lower === `${lower_2}:*` || lower === `${lower_2} *`) return true;
    if (lower === `${lower_2}*`) return true;
    if (lower.startsWith(`${lower_2} `) && lower.endsWith("*")) {
      let sliced = lower.slice(lower_2.length + 1);
      if (SUBCOMMAND_CHECKED_COMMANDS.has(lower_2)) {
        if (/[$`]/.test(sliced)) return true;
        let m = DANGEROUS_SUBCOMMANDS[lower_2];
        if (m === "all") return true;
        let filtered = sliced
          .replace(/[\s:*]+$/, "")
          .split(/\s+/)
          .filter(Boolean);
        let a = 0;
        for (; a < filtered.length; a++) {
          let c = filtered[a];
          if (!c.startsWith("-")) break;
          if (!c.includes("=") && a + 1 < filtered.length && !filtered[a + 1].startsWith("-")) a++;
        }
        let f = filtered[a];
        if (f === undefined) {
          if ((lower_2 === "curl" || lower_2 === "wget") && filtered.some((c) => c.includes("://"))) continue;
          return true;
        }
        if (m?.has(f)) return true;
        continue;
      }
      if (sliced.startsWith("-")) {
        let sliced_2 = sliced.slice(0, -1);
        if (!(/^python[\d.]*$/.test(lower_2) && /^-m\s+\w+\.[\w.]+(\s*:|\s+)$/.test(sliced_2))) return true;
      }
    }
  }
  return false;
}
//@ chunk-sfy7bm1n.js:8705-9626 facade-exports = isDangerousPowerShellPermission (0.906)
/**
 * PowerShell 规则是否危险：空/通配，或匹配 pwsh/cmd/iex/Invoke-Command/Start-Process/Add-Type/New-Object 等（含 .exe 形式）的前缀/通配形式。
 */
function isDangerousPowerShellPermission(toolName, ruleContent) {
  if (toolName !== POWERSHELL_TOOL_NAME) return false;
  if (ruleContent === undefined || ruleContent === "") return true;
  if (/^[\s*]+$/.test(ruleContent)) return true;
  let content = ruleContent.trim().toLowerCase();
  if (content === "*") return true;
  let patterns = [
    ...CROSS_PLATFORM_CODE_EXEC,
    "pwsh",
    "powershell",
    "cmd",
    "wsl",
    "iex",
    "invoke-expression",
    "icm",
    "invoke-command",
    "start-process",
    "saps",
    "start",
    "start-job",
    "sajb",
    "start-threadjob",
    "invoke-wmimethod",
    "iwmi",
    "invoke-cimmethod",
    "icim",
    "wmic",
    "register-objectevent",
    "register-engineevent",
    "register-wmievent",
    "register-scheduledjob",
    "new-pssession",
    "nsn",
    "enter-pssession",
    "etsn",
    "add-type",
    "new-object",
  ];
  for (let pattern of patterns) {
    if (content === pattern) return true;
    if (content === `${pattern}:*`) return true;
    if (content === `${pattern}*`) return true;
    if (content === `${pattern} *`) return true;
    if (content.startsWith(`${pattern} -`) && content.endsWith("*")) return true;
    let sp = pattern.indexOf(" ");
    let exe = sp === -1 ? `${pattern}.exe` : `${pattern.slice(0, sp)}.exe${pattern.slice(sp)}`;
    if (content === exe) return true;
    if (content === `${exe}:*`) return true;
    if (content === `${exe}*`) return true;
    if (content === `${exe} *`) return true;
    if (content.startsWith(`${exe} -`) && content.endsWith("*")) return true;
  }
  return false;
}
//@ chunk-sfy7bm1n.js:9626-9662 facade-exports
function isDangerousTaskPermission(e, r) {
  return canonicalToolName(e) === AGENT;
}
//@ chunk-sfy7bm1n.js:9662-9691 layout
function isMonitorTool(e) {
  return e === MONITOR;
}
//@ chunk-sfy7bm1n.js:9691-9822 layout
class DangerVerdictCache {
  verdicts = new Map();
  lookup(e) {
    return this.verdicts.get(e);
  }
  remember(e, r) {
    this.verdicts.set(e, r);
  }
  reset() {
    this.verdicts.clear();
  }
}
//@ chunk-sfy7bm1n.js:9822-9834 layout
var dangerVerdictCache = new DangerVerdictCache();
//@ chunk-sfy7bm1n.js:9834-9868 layout
/**
 * classifyAllShellEnabled：Cowork 或全部 shell 交分类器。
 */
function classifyAllShellEnabled() {
  return isCoworkAny() || isAutoModeClassifyAllShellEnabled();
}
//@ chunk-sfy7bm1n.js:9868-10075 layout
/**
 * 规则是否危险（带缓存）：Bash、PowerShell、Task 危险规则，或代码执行类工具、Artifact REPL 工具。
 */
function isDangerousPermissionRule(toolName, ruleContent) {
  let o = `${toolName}\x00${ruleContent ?? ""}`;
  let n = dangerVerdictCache.lookup(o);
  if (n !== undefined) return n;
  let s =
    isDangerousBashPermission(toolName, ruleContent) ||
    isDangerousPowerShellPermission(toolName, ruleContent) ||
    isDangerousTaskPermission(toolName, ruleContent) ||
    isMonitorTool(toolName) ||
    toolName === require("./chunk-q973gz0n.js").APPIFACT_REPL_TOOL_NAME;
  dangerVerdictCache.remember(o, s);
  return s;
}
//@ chunk-sfy7bm1n.js:10075-10200 file-local
/**
 * 工具是否属于“auto 下钩子 allow 也必须经分类器”的类别：MCP 工具，或在相关开关下的特定前缀工具、MCP 资源读取工具、危险工具。
 */
function requiresClassifierForHookAllow(tool) {
  let serverName = getToolNameForPermissionCheck_2(tool);
  return (
    getMcpPrefix(serverName) ||
    false ||
    (isCoworkAny() &&
      (serverName.startsWith(MCP_TOOL_PREFIX) ||
        ((tool.name === READMCPRESOURCETOOL || tool.name === READ_MCP_RESOURCE_DIR_TOOL_NAME) &&
          greedyShoreEnabled()) ||
        isDangerousPermissionRule(tool.name, undefined)))
  );
}
//@ chunk-sfy7bm1n.js:10200-10287 facade-exports
/**
 * 对分类器而言规则是否危险：在特定开关下 Bash/PowerShell 一律危险，MCP 工具一律危险，否则走 wYt。进入 auto 时据此剥离 allow 规则。
 */
function isDangerousClassifierPermission(toolName, ruleContent) {
  if ((toolName === BASH_TOOL_NAME || toolName === POWERSHELL_TOOL_NAME) && classifyAllShellEnabled())
    return true;
  if (getMcpPrefix(toolName)) return true;
  return isDangerousPermissionRule(toolName, ruleContent);
}
//@ chunk-e6aww6q8.js:1270853-1270876 facade-exports
function antBuiltinDenyRules() {
  return [];
}
//@ chunk-e6aww6q8.js:3261661-3261758 fingerprint = isAutoModeDisabledBySettings (1)
function isAutoModeDisabledBySettings(settings) {
  return settings.disableAutoMode === "disable" || settings.permissions?.disableAutoMode === "disable";
}
//@ chunk-e6aww6q8.js:3261758-3261794 layout
function isAutoModeDisabledBySettingsNow() {
  return isAutoModeDisabledBySettings(getSettings_DEPRECATED() || {});
}
//@ chunk-e6aww6q8.js:3261794-3261832 layout
function isAutoModeSupportedNow() {
  return !isAutoModeCircuitBroken() && modelSupportsAutoMode(getMainLoopModel());
}
//@ chunk-e6aww6q8.js:3261832-3261867 facade-exports
/**
 * auto 闸门实时值：未被熔断（Pge）、当前主模型支持 auto、且 settings 未 disableAutoMode。
 */
function isAutoModeGateEnabled() {
  return isAutoModeSupportedNow() && !isAutoModeDisabledBySettingsNow();
}
//@ chunk-e6aww6q8.js:3261867-3262027 facade-exports = getAutoModeUnavailableReason (1)
/**
 * auto 不可用的原因：settings / circuit-breaker / model，或 Els() 给出的其他原因。
 */
function getAutoModeUnavailableReason(e = getMainLoopModel()) {
  if (isAutoModeDisabledBySettingsNow()) return "settings";
  if (isAutoModeCircuitBroken()) return "circuit-breaker";
  if (!modelSupportsAutoMode(e)) return "model";
  let autoModeFastModeBreakerReason = getAutoModeFastModeBreakerReason();
  if (autoModeFastModeBreakerReason === "model" && !isAntInternalFastModelId(e)) return null;
  return autoModeFastModeBreakerReason;
}
//@ chunk-e6aww6q8.js:3262027-3262342 facade-exports = getAutoModeUnavailableNotification (0.763)
/**
 * auto 不可用原因到提示文字：settings、circuit-breaker、fast-mode、model 四种。
 */
function getAutoModeUnavailableNotification(reason) {
  let base;
  switch (reason) {
    case "settings":
      base = "auto mode disabled by settings";
      break;
    case "circuit-breaker":
      base = "auto mode is unavailable for your plan";
      break;
    case "fast-mode":
      base = "auto mode unavailable while fast mode is on \xB7 run /fast off";
      break;
    case "model":
      base = "auto mode unavailable for this model";
      break;
  }
  return base;
}
//@ chunk-e6aww6q8.js:3262342-3262427 facade-exports
/**
 * 当前 auto 不可用时的提示文字，无具体原因时用通用文字。
 */
function getAutoModeUnavailableText() {
  let autoModeUnavailableReason = getAutoModeUnavailableReason();
  return autoModeUnavailableReason !== null
    ? getAutoModeUnavailableNotification(autoModeUnavailableReason)
    : "auto mode is unavailable right now";
}
//@ chunk-9rkt9tdt.js:227-374 fingerprint = isBypassPermissionsModeDisabled (0.752)
/**
 * settings.permissions.disableBypassPermissionsMode="disable" 时返回原因文字。
 */
function getBypassDisabledReason() {
  if ((getSettings_DEPRECATED() || {}).permissions?.disableBypassPermissionsMode === "disable")
    return "Bypass permissions mode was disabled by settings";
  return;
}
//@ chunk-9rkt9tdt.js:374-410 facade-exports
function isBypassPermissionsModeDisabled() {
  return getBypassDisabledReason() !== undefined;
}
//@ chunk-tr0s0d0k.js:23784-23793 affinity
var HOST_CREDENTIAL_SCAN_DEPTH = 4;
//@ chunk-tr0s0d0k.js:23793-24209 callgraph-fingerprint = isOverlyBroadPowerShellAllowRule (0.244)
/**
 * 若 Shell 命令会读取宿主凭证（Windows 按 token 检查，其他平台按 wt 扫描），返回 hostCredential 来源的 deny 规则。
 */
async function getHostCredentialDenyRule(tool, input) {
  let { command } = input;
  if (typeof command !== "string") return;
  if (getPlatform() === "windows") {
    if (tool.name !== BASH_TOOL_NAME && tool.name !== POWERSHELL_TOOL_NAME) return;
    let s;
    for (let d of readsCredentialStore(command, tool.name === BASH_TOOL_NAME ? "bash" : "powershell"))
      s ??= credentialCommandIn(d);
    if (s !== undefined)
      return {
        source: HOST_CREDENTIAL_RULE_SOURCE,
        ruleBehavior: "deny",
        ruleValue: {
          toolName: tool.name,
          ruleContent: `*${s}*`,
        },
      };
    return;
  }
  let [r] = keychainCommands();
  return r !== undefined &&
    tool.name === BASH_TOOL_NAME &&
    (await commandReachesSettings(command, HOST_CREDENTIAL_SCAN_DEPTH))
    ? {
        source: HOST_CREDENTIAL_RULE_SOURCE,
        ruleBehavior: "deny",
        ruleValue: bashPrefixRule(r),
      }
    : undefined;
}
//@ chunk-4p0ppc72.js:377-468 fingerprint = isPermissionUpdateDestination (0.909)
/**
 * PermissionUpdate 可用的目的地列表：userSettings、projectSettings、localSettings、flagSettings、cliArg、session。
 */
var PERMISSION_UPDATE_DESTINATIONS = [
  "userSettings",
  "projectSettings",
  "localSettings",
  "flagSettings",
  "cliArg",
  "session",
];
//@ chunk-7kt7c7a3.js:1223-1304 fingerprint = AUTO_MODE_ENABLED_DEFAULT (1)
/**
 * auto 模式 enabled 状态的来源是否为 disabled（读取失败记错误并返回 false）。
 */
function AUTO_MODE_ENABLED_DEFAULT() {
  try {
    return (
      getFeatureValueWithSource_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT)
        .source === "disabled"
    );
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-gz7b768t.js:1257-1346 fingerprint = getAutoModeEnabledState (1)
/**
 * 读取 GrowthBook tengu_auto_mode_config，缺省返回冻结的空配置。
 */
function getAutoModeConfigOrDefault() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_auto_mode_config", f) ?? f;
  if (e !== f) return e;
  return isGrowthBookEnabled() ? f : CLASSIFIER_FEATURE_DEFAULTS;
}
export {
  isVirtualPancakeEnabled,
  transitionPermissionMode,
  sameEffort,
  setPermissionModeWithGuards,
  getAutoModeUnavailableText,
  getAutoModeConfigOrDefault,
  isDangerousClassifierPermission,
  classifyAllShellEnabled,
  requiresClassifierForHookAllow,
  warnMcpRuleMismatch,
  resolveLoopEffort,
  isBypassPermissionsModeDisabled,
  canSeedAutoMode,
  getAutoModeUnavailableReason,
  BYPASS_CONSENT_MESSAGE,
  BG_UNCONSENTED_BYPASS_CAPABILITY_NOTICE,
  getAutoModeUnavailableNotification,
  getStartupModeTelemetry,
  getAutoSeedFactors,
  resolveRemoteSessionMode,
  resolveSeedPermissionMode,
  verifyAutoModeGateAccess,
  getAutoModeAvailabilityForAnalytics,
  getProactivityPolicyVerdict,
  guardPermissionModeChange,
  undonePermissionContext,
  applyPermissionModeRevertEffects,
  permissionModeSignal,
  isAutoModeGateEnabled,
  isMaxEffortReminderEnabled,
  approvalLayers,
  isAutoCompactOfferAnswered,
  hasCarriedRefusalEffort,
  getCarriedRefusalEffort,
  parseEffortOrKeyword,
  isReservedEffortKeyword,
  transitionPlanAutoMode,
  isHarborWillowEnabled,
  settlePlanAutoModeAtStart,
  isBypassPermissionsDeniedOutsideSandbox,
  asClaimedStartModeContext,
  withToolAliases,
  declareSdkHostCodeRunningMcpTools,
  withRulesSetAsideAgain,
  markAutoCompactOfferEligibleLogged,
  bumpAutoCompactOfferEsc,
  markAutoCompactOfferResolved,
  readAutoCompactOffer,
  canPlanReturnToAutoMode,
  restoreDangerousPermissions,
  stripDangerousPermissionsForAutoMode,
  classifyEffortCarryEffect,
  getRefusedEffortCarry,
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
  isDangerousPermissionRule,
  releaseStaleRefusalEffortCarry,
  carriedEffortForModel,
  refusedEffortTelemetryFields,
  resolveRefusalFallbackEffort,
  isSpecialEffortKeywordDisabled,
  releaseCarriedEffortForEffortChange,
  initializeToolPermissionContext,
  antBuiltinDenyRules,
  latchPlanAutoModeAtLaunch,
  activatePlanAutoMode,
  resolveStartupModel,
  hasMcpToolAliases,
  isDangerousBashPermission,
  isDangerousPowerShellPermission,
  PERMISSION_UPDATE_DESTINATIONS,
  releaseCarriedEffortIfModelChanged,
  AUTO_MODE_ENABLED_DEFAULT,
  greedyShoreEnabled,
  prepareContextForPlanMode,
  getAutoModeEnabledState,
  getHipaaPolicyVerdict,
  getBypassDisabledReason,
  getStoredDefaultModeBar,
  withWriteBlockOn,
  createDisabledBypassPermissionsContext,
  isAutoModeInUse,
  isAutoModeDisabledByPolicySettings,
  createDisabledAutoModeContext,
  addDirsAreLauncherNamed,
  refuseAutoMode,
  getDisableAutoModeSettingSources,
  autoModeRefusedHere,
  overlyBroadShellAllowsStrippedByEverySession,
  getHostCredentialDenyRule,
};
