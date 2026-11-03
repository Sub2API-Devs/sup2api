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
import { gl } from "../cwd.js";
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
import { cBo } from "../../tools/BashTool/certifiedCommands.js";
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
import { IYo, isCodeExecutionTool, toi } from "../../services/mcp/redactMcpErrors.js";
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
import { p1r } from "./actionSummary.js";
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
import { gn } from "../shortHash.js";
import { autoDefaultVerdictState } from "../../services/policyLimits/policyVerdicts.js";
import { hasComplianceTaint } from "../../services/policyLimits/complianceTaints.js";
import { isModelAllowed, getOrgModelDefaultUpdatedAt, getOrgModelDefault } from "../model/modelAllowlist.js";
import { parseUserSpecifiedModel } from "../model/modelDisplay.js";
import { getDefaultMainLoopModel } from "../model/modelFallback.js";
import { Vte } from "../model/modelCatalog/servedCatalog.js";
import {
  getOrgLockedDefaultModel,
  getBootstrapOrgDefaultEffect,
  stepDownRestrictedFamilyAliasPick,
} from "../model/planModeModel.js";
import { isWindowSilentDefaultPick } from "../model/defaultModel.js";
import { WRi } from "../settings/policyHelper/helperRemote.js";
import { getEligibilityMemo } from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { getRemoteManagedSettingsSyncFromCache } from "../../services/remoteManagedSettings/remoteSettingsCache.js";
import { isBgSession } from "../concurrentSessions.js";
import { strippedCanonicalName } from "../model/canonicalModelName.js";
import { logError } from "../log.js";
import { toError } from "../errors.js";
import { ge } from "../identity.js";
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
import { freeze, CLASSIFIER_FEATURE_DEFAULTS } from "./classifierModelConfig.js";

//@ chunk-zfbhezv9.js:2071-2094 placement
var ke = new HostScoped(() => createSignal());
//@ chunk-zfbhezv9.js:2094-2131 placement
function xe_zfbh() {
  return ke.of(getRootSession().host);
}
//@ chunk-zfbhezv9.js:2131-2145 placement
var aF = createLazySignal(xe_zfbh);
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
/**
 * 规则来源的显示名：settings 层显示文件路径（相对 cwd 更短时用相对路径），其他来源原样。
 */
//@ chunk-zfbhezv9.js:2347-2469 file-local
function formatPermissionSource(source) {
  if (SETTING_SOURCES.includes(source)) {
    let filePath = getSettingsFilePathForSource(source);
    if (filePath) {
      let o = gl(),
        r = o === null ? filePath : relative(o, filePath);
      return r.length < filePath.length ? r : filePath;
    }
  }
  return source;
}
/**
 * 找出会绕过 auto 分类器的危险 allow 规则（sme：Bash/PowerShell 整工具或解释器/网络前缀、MCP 等），含 --allowed-tools 的规则。
 */
//@ chunk-zfbhezv9.js:2469-3011 facade-exports = findDangerousClassifierPermissions (1)
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
/**
 * bypass 相关提示常量：后台会话未同意 bypass 能力的通知、--allow-dangerously-skip-permissions 被忽略的警告；ALL_DANGEROUS_COMMAND_PREFIXES 合并 Bash 危险前缀与其他两张表。
 */
//@ chunk-zfbhezv9.js:3011-3100 facade-exports
var BG_UNCONSENTED_BYPASS_CAPABILITY_NOTICE = `--allow-dangerously-skip-permissions ignored: ${BYPASS_CONSENT_MESSAGE}`,
  ALL_DANGEROUS_COMMAND_PREFIXES = [
    ...DANGEROUS_BASH_PATTERNS,
    ...NETWORK_COMMAND_PREFIXES,
    ...CLUSTER_COMMAND_PREFIXES,
  ];
//@ chunk-zfbhezv9.js:3100-3152 layout
function isBareOrStarContent(e) {
  return e === void 0 || /^[\s*]+$/.test(e);
}
//@ chunk-zfbhezv9.js:3152-3176 layout
function isAntOnlyDangerousContent(e) {
  return !1;
}
/**
 * 宽泛 shell 规则分类（遥测用）：powershell / bare / cluster / network / ace（任意代码执行）。
 */
//@ chunk-zfbhezv9.js:3176-3354 layout
function categorizeBroadShellRule(ruleValue) {
  if (ruleValue.toolName === POWERSHELL_TOOL_NAME) return "powershell";
  let ruleContent = ruleValue.ruleContent;
  if (ruleContent === void 0 || isBareOrStarContent(ruleContent)) return "bare";
  if (matchesDangerousCommandPrefix(ruleContent, CLUSTER_COMMAND_PREFIXES)) return "cluster";
  if (matchesDangerousCommandPrefix(ruleContent, NETWORK_COMMAND_PREFIXES)) return "network";
  return "ace";
}
//@ chunk-zfbhezv9.js:3354-3584 facade-exports
function isOverlyBroadBashAllowRule(e, s = !1) {
  {
    let { APPIFACT_REPL_TOOL_NAME: APPIFACT_REPL_TOOL_NAME } = require("./chunk-q973gz0n.js");
    if (e.toolName === APPIFACT_REPL_TOOL_NAME) return isBareOrStarContent(e.ruleContent);
  }
  if (e.toolName !== BASH_TOOL_NAME) return !1;
  let ruleContent = e.ruleContent;
  if (ruleContent === void 0 || isBareOrStarContent(ruleContent) || isAntOnlyDangerousContent(ruleContent))
    return !0;
  return s && matchesDangerousCommandPrefix(ruleContent, ALL_DANGEROUS_COMMAND_PREFIXES);
}
//@ chunk-zfbhezv9.js:3584-3646 layout
function isBareBashRule(e) {
  return e.toolName === BASH_TOOL_NAME && e.ruleContent === void 0;
}
//@ chunk-zfbhezv9.js:3646-3703 facade-exports = isOverlyBroadBashAllowRule (1)
function isOverlyBroadPowerShellAllowRule(ruleValue) {
  return ruleValue.toolName === POWERSHELL_TOOL_NAME && isBareOrStarContent(ruleValue.ruleContent);
}
//@ chunk-zfbhezv9.js:3703-3937 facade-exports
function isYoloEquivStripEnabledForEntrypoint() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_ant_yolo_equiv_strip_config", {});
  if (!e.enabled) return !1;
  let s = env.CLAUDE_CODE_ENTRYPOINT ?? "cli";
  if (e.includeEntrypoints) return e.includeEntrypoints.includes(s);
  return !(e.excludeEntrypoints ?? []).includes(s);
}
//@ chunk-zfbhezv9.js:3937-4423 facade-exports = findDangerousClassifierPermissions (1)
function findOverlyBroadBashPermissions(e, s, o = !1) {
  let dangerous = [];
  for (let rule of e)
    if (rule.ruleBehavior === "allow" && isOverlyBroadBashAllowRule(rule.ruleValue, o))
      dangerous.push({
        ruleValue: rule.ruleValue,
        source: rule.source,
        ruleDisplay: rule.ruleValue.ruleContent
          ? `${rule.ruleValue.toolName}(${rule.ruleValue.ruleContent})`
          : `${rule.ruleValue.toolName}(*)`,
        sourceDisplay: formatPermissionSource(rule.source),
      });
  for (let toolSpec of s) {
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
function isRemovableRuleSource(e) {
  return EDITABLE_SETTING_SOURCES.includes(e) || e === "session" || e === "cliArg";
}
/**
 * 按来源分组，用 removeRules 从上下文删掉给定的危险 allow 规则（默认只删可编辑层、session、cliArg）。
 */
//@ chunk-zfbhezv9.js:4839-5085 facade-exports = removeDangerousPermissions (1)
function removeDangerousPermissions(context, permissions, includeReadOnlySources = !1) {
  let rulesBySource = new Map();
  for (let perm of permissions) {
    if (!includeReadOnlySources && !isRemovableRuleSource(perm.source)) continue;
    let destination = perm.source,
      existing = rulesBySource.get(destination) || [];
    (existing.push(perm.ruleValue), rulesBySource.set(destination, existing));
  }
  let updatedContext = context;
  for (let [d, l] of rulesBySource)
    updatedContext = applyValidatedPermissionUpdate(updatedContext, {
      type: "removeRules",
      rules: l,
      behavior: "allow",
      destination: d,
    });
  return updatedContext;
}
/**
 * 进入 auto（或 plan+auto）时剥离危险 allow 规则，并把它们按来源存入 strippedDangerousRules 以便退出时恢复。
 */
//@ chunk-zfbhezv9.js:5085-5574 facade-exports = stripDangerousPermissionsForAutoMode (0.965)
function stripDangerousPermissionsForAutoMode(context) {
  let s = collectRulesFromSettings(context.alwaysAllowRules, "allow"),
    dangerousPermissions = findDangerousClassifierPermissions(s, []);
  if (dangerousPermissions.length === 0)
    return context.strippedDangerousRules !== void 0 ? context : { ...context, strippedDangerousRules: {} };
  for (let permission of dangerousPermissions)
    logForDebugging(
      `Ignoring dangerous permission ${permission.ruleDisplay} from ${permission.sourceDisplay} (bypasses classifier)`,
    );
  let stripped = {};
  for (let [n, d] of Object.entries(context.strippedDangerousRules ?? {})) if (d) stripped[n] = [...d];
  for (let perm of dangerousPermissions) {
    let d = formatPermissionRule(perm.ruleValue),
      l = (stripped[perm.source] ??= []);
    if (!l.includes(d)) l.push(d);
  }
  return {
    ...removeDangerousPermissions(context, dangerousPermissions, !0),
    strippedDangerousRules: stripped,
  };
}
/**
 * 给权限上下文设置 toolAliases：tengu_sorted_zebra 打开时，对映射到 MCP 工具的危险工具别名登记为“会运行代码的 MCP 工具”，无法登记时告警（该工具的 allow 规则将绕过分类器）；最后按需重新剥离危险规则。
 */
//@ chunk-zfbhezv9.js:5574-6415 facade-exports
function withToolAliases(e, s, o = []) {
  let r = { ...e, toolAliases: s };
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_sorted_zebra", !1)) return r;
  for (let [n, d] of Object.entries(s ?? {})) {
    if (n.startsWith("mcp__") || !isDangerousClassifierPermission(n, void 0)) continue;
    let l = typeof d === "string" ? mcpInfoFromString(d) : null;
    if (l?.toolName) {
      (aXr(l.serverName, [l.toolName]), logFeatureOk("auto_mode_tool_alias"));
      continue;
    }
    let u = env.CLAUDE_AGENT_SDK_MCP_NO_PREFIX && typeof d === "string" && d !== "" && l === null;
    if (u && o.length > 0) {
      for (let y of o) aXr(y, [d]);
      logFeatureOk("auto_mode_tool_alias");
      continue;
    }
    (logFeatureSad("auto_mode_tool_alias", u ? "no_sdk_server" : "target_not_mcp_tool"),
      logForDebugging(
        `Auto mode: toolAliases maps ${n} to ${typeof d === "string" ? d : `a value of type ${typeof d}`}, ${u ? "and no SDK MCP server is registered that could hold it" : "which is not of the form mcp__<server>__<tool>"}, so an allow rule for that tool still runs its calls without the classifier's check`,
        { level: "warn" },
      ));
  }
  return withRulesSetAsideAgain(r);
}
/**
 * 登记 SDK 宿主声明的会运行代码的 MCP 工具（codeRunningMcpTools：服务器名 → 工具名列表），畸形项计数并告警；返回规范化后的映射。
 */
//@ chunk-zfbhezv9.js:6415-7160 facade-exports
function declareSdkHostCodeRunningMcpTools(e) {
  let s = isPlainObject(e),
    o = new Map(),
    r = s ? 0 : 1;
  for (let [n, d] of s ? Object.entries(e) : []) {
    if (n === "" || n.startsWith("mcp__") || !Array.isArray(d)) {
      r++;
      continue;
    }
    for (let l of d)
      if (typeof l === "string" && l !== "" && !l.startsWith("mcp__")) {
        aXr(n, [l]);
        let u = o.get(n) ?? [];
        if (!u.includes(l)) u.push(l);
        o.set(n, u);
      } else r++;
  }
  if (o.size > 0) logFeatureOk("auto_mode_code_running_mcp_tools");
  if (r > 0)
    (logFeatureSad("auto_mode_code_running_mcp_tools", "malformed_entry"),
      logForDebugging(
        `Auto mode: ignored ${r} malformed ${r === 1 ? "part" : "parts"} of codeRunningMcpTools, which should map each MCP server name to a list of tool names, e.g. {"workspace": ["bash"]}. In auto mode, allow rules and hooks can still approve calls to the tools meant there without the classifier.`,
        { level: "warn" },
      ));
  return Object.fromEntries(o);
}
/**
 * 上下文已处于“剥离过危险规则”状态时，重新执行剥离（新规则加入后保持剥离）。
 */
//@ chunk-zfbhezv9.js:7160-7225 facade-exports = _temp3 (0.739)
function withRulesSetAsideAgain(state_1) {
  return state_1.strippedDangerousRules === void 0 ? state_1 : stripDangerousPermissionsForAutoMode(state_1);
}
/**
 * 退出 auto 时把 strippedDangerousRules 里的规则加回（command 来源过滤掉 cBo 命中的项），并清空暂存。
 */
//@ chunk-zfbhezv9.js:7225-7549 facade-exports = restoreDangerousPermissions (0.868)
function restoreDangerousPermissions(context) {
  let stash = context.strippedDangerousRules;
  if (!stash) return context;
  let result = context;
  for (let [r, n] of Object.entries(stash)) {
    if (!n || n.length === 0) continue;
    let d = r === "command" ? n.filter((l) => !cBo(l)) : [...n];
    if (d.length === 0) continue;
    result = applyValidatedPermissionUpdate(result, {
      type: "addRules",
      rules: d.map(permissionRuleValueFromString),
      behavior: "allow",
      destination: r,
    });
  }
  return { ...result, strippedDangerousRules: void 0 };
}
/**
 * 重建上下文时保留旧上下文的模式状态（mode、prePlanMode、startupModeDecidedByProactivityLevel），allow 规则与暂存的危险规则只保留新上下文中仍存在的项。
 */
//@ chunk-zfbhezv9.js:7549-7816 facade-exports
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
    (r, n) => {
      let d = s.strippedDangerousRules?.[n] ?? [],
        l = new Set([...(s.alwaysAllowRules[n] ?? []), ...(n === "command" ? d.filter((P) => !cBo(P)) : d)]),
        u = e[n] ?? [],
        filtered = u.filter((P) => l.has(P));
      return ((r.rules[n] = filtered), (r.dropped ||= filtered.length !== u.length), r);
    },
    { rules: {}, dropped: !1 },
  );
  return reduced.dropped ? reduced.rules : e;
}
/**
 * 模式切换的统一入口：记录切换事件；进入 plan 走 prepareContextForPlanMode；进入使用分类器的模式（auto）要求闸门开启并剥离危险规则，离开时恢复；离开 plan 时清掉 prePlanMode。
 */
//@ chunk-zfbhezv9.js:8135-8678 facade-exports = transitionPermissionMode (0.699)
function transitionPermissionMode(fromMode, toMode, context, trigger) {
  if (fromMode === toMode) return context;
  if (context.startupModeDecidedByProactivityLevel !== void 0)
    context = { ...context, startupModeDecidedByProactivityLevel: void 0 };
  if (
    (setProvisionalStartupMode(void 0),
    logPermissionModeChanged({ from: fromMode, to: toMode, trigger: trigger }),
    handlePlanModeTransition(fromMode, toMode),
    handleAutoModeTransition(fromMode, toMode),
    fromMode === "plan" && toMode !== "plan")
  )
    setHasExitedPlanMode(!0);
  if (toMode === "plan" && fromMode !== "plan") return prepareContextForPlanMode(context);
  let fromUsesClassifier = fromMode === "auto" || (fromMode === "plan" && isAutoModeActive()),
    toUsesClassifier = toMode === "auto";
  if (toUsesClassifier && !fromUsesClassifier) {
    if (!isAutoModeGateEnabled()) throw Error("Cannot transition to auto mode: gate is not enabled");
    (setAutoModeActive(!0), (context = stripDangerousPermissionsForAutoMode(context)));
  } else if (fromUsesClassifier && !toUsesClassifier)
    (setAutoModeActive(!1),
      setNeedsAutoModeExitAttachment(!0),
      (context = restoreDangerousPermissions(context)));
  if (fromMode === "plan" && toMode !== "plan" && context.prePlanMode)
    return { ...context, prePlanMode: void 0 };
  return context;
}
//@ chunk-zfbhezv9.js:8678-8708 facade-exports
async function isBypassPermissionsDeniedOutsideSandbox() {
  return !1;
}
//@ chunk-zfbhezv9.js:8708-8851 layout
var AUTO_MODE_UNAVAILABLE_FEATURE_KEYS = {
  settings: "auto_mode_settings",
  "circuit-breaker": "auto_mode_circuit_breaker",
  "fast-mode": "auto_mode_fast_mode",
  model: "auto_mode_model",
};
/**
 * 设置权限模式前的守卫：模式名非法、bypass 在 --restricted 下、被设置禁用或会话未以 --dangerously-skip-permissions 启动、auto 不可用时返回 {ok:false, error, code}。
 */
//@ chunk-zfbhezv9.js:8851-9453 facade-exports = handleSetPermissionMode (0.455)
function guardPermissionModeChange(e, s) {
  let o = parsePermissionMode(e);
  if (o === void 0) return { ok: !1, error: UNRECOGNIZED_PERMISSION_MODE_ERROR, code: "invalid_mode" };
  if (o === "bypassPermissions") {
    if (s.restricted) return { ok: !1, error: IYo, code: "bypass_restricted" };
    if (isBypassPermissionsModeDisabled())
      return {
        ok: !1,
        error:
          "Cannot set permission mode to bypassPermissions because it is disabled by settings or configuration",
        code: "bypass_disabled",
      };
    if (!s.isBypassPermissionsModeAvailable)
      return {
        ok: !1,
        error:
          "Cannot set permission mode to bypassPermissions because the session was not launched with --dangerously-skip-permissions",
        code: "bypass_not_launched",
      };
  }
  if (o === "auto" && !isAutoModeGateEnabled()) return refuseAutoMode(getAutoModeUnavailableReason());
  return { ok: !0, mode: o };
}
/**
 * auto 不可用时的拒绝结果，错误文字与代码按不可用原因生成。
 */
//@ chunk-zfbhezv9.js:9453-9612 facade-exports
function refuseAutoMode(e) {
  return {
    ok: !1,
    error: e
      ? `Cannot set permission mode to auto: ${getAutoModeUnavailableNotification(e)}`
      : "Cannot set permission mode to auto",
    code: e ? AUTO_MODE_UNAVAILABLE_FEATURE_KEYS[e] : "auto_mode_unavailable",
  };
}
/**
 * 带守卫地设置权限模式：守卫通过后在 setter 内对最新上下文再守卫一次并调用 transitionPermissionMode，成功后异步发出模式变化事件。
 */
//@ chunk-zfbhezv9.js:9612-9871 facade-exports
function setPermissionModeWithGuards(e, s, o, r) {
  let n = guardPermissionModeChange(e, s);
  if (!n.ok) return n;
  let mode = n.mode,
    l;
  if (
    (o((u) => {
      if (u.mode === mode) return u;
      if (u !== s) {
        let P = guardPermissionModeChange(mode, u);
        if (!P.ok) return ((l = P), u);
      }
      return { ...transitionPermissionMode(u.mode, mode, u, r), mode: mode };
    }),
    l !== void 0)
  )
    return l;
  return (
    setImmediate(() => {
      aF.emit();
    }),
    { ok: !0, mode: mode }
  );
}
/**
 * 撤销到先前模式时的副作用：守卫通过则执行模式切换，按需同步 auto 激活状态，离开 auto 时恢复危险规则。
 */
//@ chunk-zfbhezv9.js:9871-10128 facade-exports
function applyPermissionModeRevertEffects(e, s) {
  let mode = s.context.mode;
  if (!guardPermissionModeChange(mode, e).ok) return s.context;
  transitionPermissionMode(e.mode, mode, e);
  let r =
    s.autoModeActive &&
    isAutoModeGateEnabled() &&
    (mode === "auto" || (mode === "plan" && shouldPlanUseAutoMode()));
  if (isAutoModeActive() !== r) (setAutoModeActive(r), setNeedsAutoModeExitAttachment(!r));
  return (
    setImmediate(() => {
      aF.emit();
    }),
    s.autoModeActive && !r ? restoreDangerousPermissions(s.context) : s.context
  );
}
//@ chunk-zfbhezv9.js:10128-10626 facade-exports
function splitToolExclusions(e) {
  let s = [],
    o = new Set(),
    r = !1,
    n = [],
    d = [],
    l = getFeatureValue_CACHED_MAY_BE_STALE("tengu_tools_exclusion_killswitch", !1);
  for (let u = 0; u < e.length; u++) {
    let y = e[u];
    if (y === void 0) continue;
    if (!y.startsWith(NEGATION_PREFIX)) {
      s.push(y);
      continue;
    }
    let sliced = y.slice(NEGATION_PREFIX.length);
    if (sliced === "") {
      let h = e[u + 1];
      if (h === void 0 || h.startsWith(NEGATION_PREFIX) || h.startsWith("(")) {
        r = !0;
        continue;
      }
      if ((u++, !l)) n.push(h);
      ((y = NEGATION_PREFIX + h), (sliced = h));
    }
    let index = sliced.indexOf("(");
    if (index === 0) {
      r = !0;
      continue;
    }
    if (index > 0) {
      if (((sliced = sliced.slice(0, index)), !l)) d.push(y);
    }
    if (!l) o.add(canonicalToolName(sliced));
  }
  return { kept: s, excluded: o, bare: r, detached: n, scoped: d };
}
//@ chunk-zfbhezv9.js:10626-10885 facade-exports
function parseBaseToolsFromCLI(e, s) {
  let trimmed = e.join(" ").trim();
  if (getBaseToolsPreset(trimmed)) return defaultPresetToolNames(s());
  let { kept: kept, excluded: excluded } = splitToolExclusions(splitRuleList(e)),
    l = kept.includes("preset:default")
      ? s()
          .map((u) => u.name)
          .concat(kept.filter((u) => u !== "preset:default"))
      : kept;
  if (excluded.size === 0) return l;
  return l.filter((u) => !excluded.has(canonicalToolName(u)));
}
//@ chunk-zfbhezv9.js:10885-10906 layout
var Ae = [BASH_TOOL_NAME, POWERSHELL_TOOL_NAME, GLOB_TOOL_NAME, GREP_TOOL_NAME];
//@ chunk-zfbhezv9.js:10906-12504 facade-exports
function literalToolsNarrowing({
  baseToolsCli: baseToolsCli,
  baseToolsIsPreset: baseToolsIsPreset,
  parsedBaseTools: parsedBaseTools,
  getAllBaseTools: getAllBaseTools,
}) {
  let n = [],
    d = [],
    l = parseBaseToolsFromCLI(baseToolsCli, getAllBaseTools),
    u = new Set(l.map(canonicalToolName)),
    y = getAllBaseTools(),
    P = baseToolsIsPreset ? null : y,
    E = P === null ? defaultPresetToolNames(y) : P.map((p) => p.name),
    { excluded: excluded } = parsedBaseTools;
  for (let p of P ?? getAllBaseTools())
    if (p.familyParentToolName !== void 0 && excluded.has(p.familyParentToolName)) u.delete(p.name);
  for (let p of y) if (p.familyParentToolName !== void 0 && u.has(p.familyParentToolName)) u.add(p.name);
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
    if ((filtered.push(p), Ae.includes(p))) continue;
    (n.push(
      `--tools entry "${NEGATION_PREFIX}${p}" matches no built-in tool \u2014 check for typos. An MCP tool with exactly that name is still withheld.`,
    ),
      d.push(`--tools "${NEGATION_PREFIX}${p}" matches no tool \xB7 check for typos`));
  }
  for (let p of parsedBaseTools.scoped)
    n.push(
      `--tools entry "${p}" names a rule, not a tool; the whole tool is withheld. Write "${NEGATION_PREFIX}${p.slice(NEGATION_PREFIX.length, p.indexOf("("))}" to say so.`,
    );
  for (let p of parsedBaseTools.detached)
    n.push(
      `--tools entry "${NEGATION_PREFIX} ${p}" was read as "${NEGATION_PREFIX}${p}" and ${p} is withheld; write it without the space.`,
    );
  if (parsedBaseTools.bare)
    (n.push(
      `--tools has a "${NEGATION_PREFIX}" with no tool name after it; write the name right after it, as in "${NEGATION_PREFIX}Bash".`,
    ),
      d.push(`--tools has a "${NEGATION_PREFIX}" with no tool name \xB7 write "${NEGATION_PREFIX}Bash"`));
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
    toolsKept: baseToolsIsPreset || parsedBaseTools.kept.includes("preset:default") ? void 0 : u,
    warnings: n,
    securityWarnings: d,
  };
}
//@ chunk-zfbhezv9.js:12504-12611 fingerprint = isSymlinkTo (1)
function isSymlinkTo({ processPwd: processPwd, originalCwd: originalCwd }) {
  let { resolvedPath: resolvedProcessPwd, isSymlink: isProcessPwdSymlink } = safeResolvePath(
    getFsImplementation(),
    processPwd,
  );
  return isProcessPwdSymlink ? resolvedProcessPwd === resolve(originalCwd) : !1;
}
/**
 * 启动时决定权限模式：CLAUDE_CODE_SUBPROCESS_ENV_SCRUB 时强制 default；否则汇总 CLI/env/settings/agent frontmatter/主动性档位交给 initialPermissionModeFromCLI，并在 GrowthBook 或策略未就绪时登记“临时启动模式”以便稍后重算。
 */
//@ chunk-zfbhezv9.js:12611-14232 facade-exports
function initialPermissionModeFromCLI({
  permissionModeCli: permissionModeCli,
  inheritPermissionModeCli: inheritPermissionModeCli,
  dangerouslySkipPermissions: dangerouslySkipPermissions,
  allowDangerouslySkipPermissions: allowDangerouslySkipPermissions,
  bypassPermissionsBlockedByHost: bypassPermissionsBlockedByHost,
  agentPermissionMode: agentPermissionMode,
  proactivityLevel: proactivityLevel,
}) {
  let u = normalizePermissionModeAlias(permissionModeCli),
    y = normalizePermissionModeAlias(inheritPermissionModeCli),
    P = takeRelaunchBaselineMode(Boolean(dangerouslySkipPermissions || allowDangerouslySkipPermissions)),
    E = takeProactivityDecided();
  if (isScrubEnabled()) {
    let w =
        dangerouslySkipPermissions ||
        (u && u !== "default") ||
        (y && y !== "default") ||
        (agentPermissionMode && agentPermissionMode !== "default"),
      A =
        "Permission mode forced to default \u2014 CLAUDE_CODE_SUBPROCESS_ENV_SCRUB is set " +
        "(allowed_non_write_users hardening). Declare allowedTools explicitly, or set CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=0 to opt out.";
    if (w)
      process.stderr.write(`\u26A0 ${A}
`);
    return { mode: "default", notification: w ? A : void 0, modeSuppliedOnInvocation: !0 };
  }
  let _ = {
      cli: {
        permissionMode:
          E === !0 &&
          proactivityLevel !== void 0 &&
          u !== void 0 &&
          getProactivityPolicyVerdict(proactivityLevel, u, void 0) !== void 0
            ? void 0
            : u,
        inheritPermissionMode: y,
        dangerouslySkipPermissions: dangerouslySkipPermissions,
        allowDangerouslySkipPermissions: allowDangerouslySkipPermissions,
        bypassPermissionsBlockedByHost: bypassPermissionsBlockedByHost,
        isNonInteractiveSession: getIsNonInteractiveSession(),
      },
      env: { ...process.env, CLAUDE_CODE_SUBPROCESS_ENV_SCRUB: void 0 },
      settings: getSettings_DEPRECATED() || {},
      agentFrontmatter: agentPermissionMode ? { permissionMode: agentPermissionMode } : void 0,
      proactivityLevel: E === !1 ? void 0 : proactivityLevel,
    },
    p = initialPermissionModeFromCLI_2(_);
  (setAutoModeFromFallback(p.fromAutoFallback),
    setAutoStartWithheldForHipaaTaint(p.autoStartWithheldForHipaaTaint));
  let R = !getIsNonInteractiveSession() && isGrowthBookCacheEmpty(),
    autoDefaultWithheldForPendingVerdict = p.autoDefaultWithheldForPendingVerdict;
  setProvisionalStartupMode(
    !p.modeSuppliedOnInvocation && (R || autoDefaultWithheldForPendingVerdict)
      ? {
          mode: p.mode,
          inputs: _,
          awaitsGrowthBook: R,
          awaitsPolicyVerdict: autoDefaultWithheldForPendingVerdict,
        }
      : void 0,
  );
  let M;
  {
    let w = p.decidedByProactivityLevel || (E === !0 && proactivityLevel !== void 0);
    M = {
      proactivityBaseline: { mode: P ?? p.baselineMode, fromRelaunchHandoff: P !== void 0 },
      startupModeDecidedByProactivityLevel: w ? proactivityLevel : void 0,
    };
  }
  if (p.mode === "auto") setAutoModeActive(!0);
  return {
    mode: p.mode,
    notification: p.notification,
    proactivity: M,
    modeSuppliedOnInvocation: p.modeSuppliedOnInvocation,
  };
}
//@ chunk-zfbhezv9.js:14232-14288 facade-exports
function addDirsAreLauncherNamed() {
  return env.CLAUDE_CODE_SESSION_KIND !== "bg";
}
//@ chunk-zfbhezv9.js:14288-14331 facade-exports
function cliArgMayMintTrustedRoots(e) {
  return e === "cliArg" && addDirsAreLauncherNamed();
}
/**
 * Chrome 分类器地板开关：env CLAUDE_CHROME_CLASSIFIER_FLOOR，否则远程会话读 tengu_cowork_chrome_automode_default 的安全值、本地读普通值。
 */
//@ chunk-zfbhezv9.js:14331-14508 facade-exports
function readChromeClassifierFloor() {
  return (
    env.CLAUDE_CHROME_CLASSIFIER_FLOOR ??
    (env.CLAUDE_CODE_REMOTE
      ? readFlagWithOverride("tengu_cowork_chrome_automode_default", { safe: !0 })
      : getFeatureValue_CACHED_MAY_BE_STALE("tengu_cowork_chrome_automode_default", !1))
  );
}
/**
 * 限制写入在工作目录内，并禁用 EnterWorktree/ExitWorktree 工具（toolsNarrowing deny）。
 */
//@ chunk-zfbhezv9.js:14508-14683 facade-exports
function withWriteBlockOn(e) {
  return {
    ...e,
    blockWritesOutsideWorkingDirectories: !0,
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
/**
 * 构建初始 ToolPermissionContext：解析 --allowedTools/--disallowedTools/--tools，加载 settings 规则（工作区信任门控），计算 bypass 可用性（disableBypassPermissionsMode、restricted），Windows 上禁 Bash 时联动 PowerShell，检测危险/宽泛规则，设置 auto 可用性与 Chrome 分类器开关，校验并加入 additionalDirectories（settings、会话、--add-dir）。
 */
//@ chunk-zfbhezv9.js:14683-19645 facade-exports = initializeToolPermissionContext (0.485)
async function initializeToolPermissionContext({
  allowedToolsCli: allowedToolsCli,
  disallowedToolsCli: disallowedToolsCli,
  baseToolsCli: baseToolsCli,
  getAllBaseTools: getAllBaseTools,
  restricted: restricted = !1,
  permissionMode: permissionMode,
  allowDangerouslySkipPermissions: allowDangerouslySkipPermissions,
  addDirs: addDirs,
  bgSessionPermissionRules: bgSessionPermissionRules,
  relaunchSessionAddDirs: relaunchSessionAddDirs,
  storageV5: storageV5,
}) {
  let h = [],
    _ = [],
    p = null,
    R = permissionMode === "bypassPermissions" || allowDangerouslySkipPermissions,
    filtered = splitRuleList(allowedToolsCli)
      .map((m) => formatPermissionRule(permissionRuleValueFromString(m)))
      .filter((rule) => {
        let parsedDisallowedToolsCli = validateWildcardToolName(permissionRuleValueFromString(rule).toolName);
        if (parsedDisallowedToolsCli)
          return (
            h.push(
              `Ignoring --allowedTools rule "${rule}": ${parsedDisallowedToolsCli.error}. ${parsedDisallowedToolsCli.suggestion}.`,
            ),
            !1
          );
        return !0;
      }),
    baseToolsResult = uniq([...splitRuleList(disallowedToolsCli), ...antBuiltinDenyRules()]),
    w =
      !!baseToolsCli && baseToolsCli.length > 0 && getBaseToolsPreset(baseToolsCli.join(" ").trim()) !== null,
    A =
      baseToolsCli && !w
        ? splitToolExclusions(splitRuleList(baseToolsCli))
        : { kept: [], excluded: new Set(), bare: !1, detached: [], scoped: [] },
    toolsToDisallow = A.kept.map(canonicalToolName).filter((tool) => !A.excluded.has(tool)),
    K = !!baseToolsCli?.length && !w && toolsToDisallow.length === 0,
    se = (m) =>
      toolsToDisallow.includes(m) || filtered.some((S) => permissionRuleValueFromString(S).toolName === m);
  (setSearchToolsOptIn([GLOB_TOOL_NAME, GREP_TOOL_NAME].some(se)),
    setTodoToolsOptIn(TODO_TOOL_NAMES.some(se)));
  let L = [],
    ie = [],
    q,
    additionalWorkingDirectories = new Set();
  if (baseToolsCli && baseToolsCli.length > 0) {
    let m = literalToolsNarrowing({
      baseToolsCli: baseToolsCli,
      baseToolsIsPreset: w,
      parsedBaseTools: A,
      getAllBaseTools: getAllBaseTools,
    });
    (h.push(...m.warnings),
      _.push(...m.securityWarnings.map((securityWarning) => ({ text: securityWarning }))),
      (L = m.toolsToDisallow),
      (ie = K ? [] : m.toolsToDisallow),
      (q = m.toolsKept));
  }
  if (restricted) {
    let m = isCodeExecutionTool(codeExecutionToolNames(getAllBaseTools()), toi(toolsToDisallow));
    for (let S of m) additionalWorkingDirectories.add(S);
    L = uniq([...L, ...m]);
  }
  setToolsOmittedByLaunchList(ie.filter((m) => !additionalWorkingDirectories.has(m)));
  let re = new Map(),
    processPwd = env.PWD,
    z = processPwd ? getOriginalCwdOrNull() : null;
  if (processPwd && z !== null && processPwd !== z && isSymlinkTo({ originalCwd: z, processPwd: processPwd }))
    re.set(processPwd, { path: processPwd, source: "session" });
  let ae = (getSettings_DEPRECATED() || {}).permissions?.disableBypassPermissionsMode === "disable",
    X =
      allowDangerouslySkipPermissions &&
      permissionMode !== "bypassPermissions" &&
      !ae &&
      !restricted &&
      isUnconsentedBgBypass("bypassPermissions");
  if (X)
    (logEvent("tengu_bg_allow_bypass_unconsented_ignored", {}),
      h.push(BG_UNCONSENTED_BYPASS_CAPABILITY_NOTICE));
  let Ce =
      (permissionMode === "bypassPermissions" || (allowDangerouslySkipPermissions && !X)) &&
      !ae &&
      !restricted &&
      !0,
    ue =
      isStorageV5Enabled() && storageV5 !== void 0 && storageV5.hostFiles.serving("workspace") === "host"
        ? { strictPersistedTrust: await workspacePersistedTrustThroughBackend(storageV5) }
        : {},
    k = loadAllPermissionRulesFromDisk(ue),
    mapped = [...baseToolsResult, ...L].map(permissionRuleValueFromString),
    any = mapped.some(isBareBashRule),
    we =
      mapped.some((m) => m.toolName === BASH_TOOL_NAME) ||
      k.some((m) => m.ruleBehavior === "deny" && m.ruleValue.toolName === BASH_TOOL_NAME),
    De =
      env.CLAUDE_CODE_USE_POWERSHELL_TOOL ||
      splitRuleList(baseToolsCli ?? [])
        .map(canonicalToolName)
        .includes(POWERSHELL_TOOL_NAME) ||
      filtered.some((m) => permissionRuleValueFromString(m).toolName === POWERSHELL_TOOL_NAME) ||
      mapped.some((m) => m.toolName === POWERSHELL_TOOL_NAME) ||
      k.some((m) => m.ruleValue.toolName === POWERSHELL_TOOL_NAME);
  if (getPlatform() === "windows" && isBashAvailable() && we && !De) {
    baseToolsResult = [...baseToolsResult, POWERSHELL_TOOL_NAME];
    let filtered = k.filter((S) => S.ruleBehavior === "deny" && isBareBashRule(S.ruleValue));
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
      ...findOverlyBroadBashPermissions(k, filtered, !0),
      ...findOverlyBroadPowerShellPermissions(k, filtered),
    ];
    if (m.length > 0) {
      let mapped = m.map((V) => categorizeBroadShellRule(V.ruleValue)),
        F = !1,
        ee = !1;
      logEvent("tengu_ant_overly_broad_bash_detected", {
        count: m.length,
        categories: fromEnumArr(uniq(mapped)),
        yoloEquivEnabled: F,
        willStrip: ce.length,
        entrypoint: fromEnumOpt(getEntrypointKind()) ?? lit("other"),
        ...!1,
      });
    }
  }
  let me = [];
  if (permissionMode === "auto") me = findDangerousClassifierPermissions(k, filtered);
  let Q = shouldAllowManagedPermissionRulesOnly(),
    pe = readBlockExemptPathsInSettings();
  if (Q && filtered.length > 0)
    h.push(
      `Ignoring --allowedTools ${filtered.join(", ")}: permission rules are restricted to managed settings (allowManagedPermissionRulesOnly).`,
    );
  let toolPermissionContext = applyPermissionRulesToPermissionContext(
    {
      mode: permissionMode,
      additionalWorkingDirectories: re,
      alwaysAllowRules: {
        cliArg: Q ? [] : filtered,
        ...(bgSessionPermissionRules && { session: Q ? [] : bgSessionPermissionRules.allow }),
      },
      alwaysDenyRules: {
        cliArg: baseToolsResult,
        ...(bgSessionPermissionRules && { session: bgSessionPermissionRules.deny }),
        ...(L.length > 0 && { toolsNarrowing: L }),
      },
      alwaysAskRules: {},
      mcpPermissionModeOverrides: {},
      ...(restricted && { restricted: restricted }),
      ...(K && { builtInToolsDisabled: K }),
      ...(q !== void 0 && { toolsKeptByLaunchList: Object.freeze([...q]) }),
      ...(isReadBlockOn() && { blockReadsOutsideWorkingDirectories: !0 }),
      ...(pe.length > 0 && { readBlockExemptPaths: pe }),
      isBypassPermissionsModeAvailable: Ce,
      ...((m) => ({
        isAutoModeAvailable: m,
        canAutoClassifierRun: m,
        chromeClassifierFloorEnabled: readChromeClassifierFloor(),
        chromeNavigationClassifierEnabled:
          getFeatureValue_CACHED_MAY_BE_STALE("tengu_auto_mode_config", {})?.chromeNavigation === !0,
        chromeClickClassifierEnabled:
          getFeatureValue_CACHED_MAY_BE_STALE("tengu_auto_mode_config", {})?.classifyChromeClicks === !0 ||
          p1r("browserClicks"),
        chromeHostToolAsksEnabled: getFeatureValue_CACHED_MAY_BE_STALE("tengu_cozy_eagle", !0) !== !1,
      }))(isAutoModeGateEnabled()),
      isRemoteMode: env.CLAUDE_CODE_REMOTE || getIsRemoteMode(),
    },
    k,
  );
  if (isWriteBlockOn()) toolPermissionContext = withWriteBlockOn(toolPermissionContext);
  for (let m of collectPermissionRuleAdvisories(
    [
      ...getAllowRules(toolPermissionContext),
      ...getDenyRules(toolPermissionContext),
      ...getAskRules(toolPermissionContext),
    ],
    getAllBaseTools,
  ))
    if ((h.push(m.line), m.securityWarning !== void 0)) _.push(m.securityWarning);
  let { repoOnly: repoOnly } = additionalDirectoryProvenance((m) => {
      try {
        return [resolve(expandPath(m))];
      } catch {
        return [];
      }
    }, storageV5),
    Be = [
      ...loadTrustedAdditionalDirectoriesFromDisk(ue).map((m) => ({ dir: m, destination: "localSettings" })),
      ...[...(bgSessionPermissionRules?.addDirs ?? []), ...(relaunchSessionAddDirs ?? [])].map((m) => ({
        dir: m,
        destination: "session",
      })),
      ...addDirs.map((m) => ({ dir: m, destination: "cliArg" })),
    ],
    validationResults = await Promise.all(
      Be.map(async ({ dir: dir, destination: destination }) => ({
        destination: destination,
        result: await validateDirectoryForWorkspace(dir, toolPermissionContext),
      })),
    ),
    J = new Map(),
    fe = [];
  for (let { result: m, destination: destination } of validationResults)
    if (m.resultType === "success") {
      if (destination === "session") fe.push(m.absolutePath);
      if (
        ((toolPermissionContext = applyValidatedPermissionUpdate(toolPermissionContext, {
          type: "addDirectories",
          directories: [m.absolutePath],
          destination:
            destination === "localSettings" && repoOnly.has(m.absolutePath) ? "projectSettings" : destination,
        })),
        cliArgMayMintTrustedRoots(destination))
      ) {
        let F = mappedDriveSpellings(m.absolutePath);
        if (F.length > 0) {
          J.set(m.absolutePath, F);
          let filtered = F.filter((dir) => dir !== m.absolutePath);
          if (filtered.length > 0)
            toolPermissionContext = applyValidatedPermissionUpdate(toolPermissionContext, {
              type: "addDirectories",
              directories: filtered,
              destination: destination,
            });
        }
      }
    } else if (m.resultType !== "alreadyInWorkingDirectory" && m.resultType !== "pathNotFound")
      h.push(addDirHelpMessage(m));
  if (J.size > 0) toolPermissionContext = { ...toolPermissionContext, trustedNetworkDirectories: J };
  return {
    toolPermissionContext: toolPermissionContext,
    warnings: h,
    securityWarnings: _,
    dangerousPermissions: me,
    overlyBroadBashPermissions: ce,
    ...(X && { bypassCapabilityNotification: BG_UNCONSENTED_BYPASS_CAPABILITY_NOTICE }),
    inheritedSessionDirectories: fe,
  };
}
/**
 * 规则自检告警：deny/ask 规则指向已移除或未知的工具、用 "field:" 原样匹配 command/path 字段（不会生效）；validatePermissionRule 报告的警告。
 */
//@ chunk-zfbhezv9.js:19645-21746 facade-exports = findOverlyBroadPowerShellPermissions (0.148)
function collectPermissionRuleAdvisories(rules, getAllBaseTools) {
  let warnings = [],
    r = getAllBaseTools(),
    n = new Set([...r.map((l) => l.name), ...Ae]),
    d = new Map([
      [BASH_TOOL_NAME, "command"],
      [POWERSHELL_TOOL_NAME, "command"],
      [GLOB_TOOL_NAME, "path"],
      [GREP_TOOL_NAME, "path"],
      ...r.filter((l) => l.ruleContentField).map((l) => [l.name, l.ruleContentField]),
    ]);
  for (let l of [...filterRulesByBehavior(rules, "deny"), ...filterRulesByBehavior(rules, "ask")]) {
    if (l.source === "toolsNarrowing" || l.source === "session") continue;
    let { toolName: toolName, ruleContent: ruleContent } = l.ruleValue;
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
      if (P && ruleContent !== void 0) {
        let index = ruleContent.indexOf(":");
        if (index > 0 && ruleContent.slice(0, index).trim() === P) {
          let h = `Permission ${l.ruleBehavior} rule "${formatPermissionRule(l.ruleValue)}" targets ${P} as a raw string and will not match`,
            _ =
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
    let { ruleContent: ruleContent } = l.ruleValue;
    if (ruleContent !== void 0) {
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
          y.securityNotice === void 0 ? void 0 : `${capitalize(l.ruleBehavior)} rule ${y.securityNotice}`,
        ),
      );
    }
  }
  return warnings;
}
//@ chunk-zfbhezv9.js:21746-21960 layout
function createRuleWarning(e, s, o) {
  if (o === void 0) return { line: s };
  let found = SETTING_SOURCES.find((d) => d === e.source && d !== "flagSettings"),
    n = found === void 0 ? void 0 : getSettingsFilePathForSource(found);
  return {
    line: s,
    securityWarning: n === void 0 ? { text: o } : { text: o, seenKey: sha256OfLines([e.source, n, o]) },
  };
}
//@ chunk-zfbhezv9.js:21960-22017 layout
function filterRulesByBehavior(e, s) {
  return e.filter((o) => o.ruleBehavior === s);
}
/**
 * 把 CLI 参数的 allow 规则追加到 cliArg 来源（受限情况下 yg() 为真时不加）。
 */
//@ chunk-zfbhezv9.js:22017-22153 facade-exports
function withCliArgAllowRules(e, s) {
  if (shouldAllowManagedPermissionRulesOnly()) return e;
  return {
    ...e,
    alwaysAllowRules: { ...e.alwaysAllowRules, cliArg: [...(e.alwaysAllowRules.cliArg ?? []), ...s] },
  };
}
/**
 * GrowthBook 缓存或策略结论到位后重算启动模式；若用户未手动切换过且结果不同，则通过 transitionPermissionMode 切换（trigger=startup_reresolve）。
 */
//@ chunk-zfbhezv9.js:22153-23082 facade-exports
function settleProvisionalStartupMode(e, s = {}) {
  let o = getProvisionalStartupMode();
  if (!o) return e;
  let r = o.awaitsGrowthBook && isGrowthBookCacheEmpty();
  if (r && !o.awaitsPolicyVerdict) return e;
  if (e.mode !== o.mode) return (setProvisionalStartupMode(void 0), e);
  let n = initialPermissionModeFromCLI_2(o.inputs);
  if (n.autoDefaultWithheldForPendingVerdict) return e;
  let d = r ? { mode: n.mode, inputs: o.inputs, awaitsGrowthBook: !0, awaitsPolicyVerdict: !1 } : void 0;
  if (
    (setProvisionalStartupMode(d),
    setAutoStartWithheldForHipaaTaint(n.autoStartWithheldForHipaaTaint),
    n.notification !== void 0)
  )
    s.onNotification?.(n.notification);
  if (
    n.mode === e.mode ||
    (n.mode === "bypassPermissions" && !e.isBypassPermissionsModeAvailable) ||
    (n.mode === "auto" && !isAutoModeGateEnabled())
  )
    return e;
  (logForDebugging(
    `[permission-mode] startup resolved ${e.mode} against ${o.awaitsPolicyVerdict ? "a pending policy verdict" : "an empty GrowthBook cache"}; re-resolved to ${n.mode}`,
  ),
    setAutoModeFromFallback(n.fromAutoFallback));
  let l = {
    ...transitionPermissionMode(e.mode, n.mode, e, "startup_reresolve"),
    mode: n.mode,
    ...(o.awaitsPolicyVerdict &&
      n.decidedByProactivityLevel && { startupModeDecidedByProactivityLevel: o.inputs.proactivityLevel }),
  };
  return (setProvisionalStartupMode(d), l);
}
/**
 * 主动性档位选择因等待策略结论被暂缓时，返回给用户的提示。
 */
//@ chunk-zfbhezv9.js:23082-23262 facade-exports
function levelAutoHeldForPendingVerdictNotice() {
  let e = getProvisionalStartupMode();
  if (!e?.awaitsPolicyVerdict || e.inputs.proactivityLevel === void 0) return;
  let levelPickHeldForPendingVerdict = initialPermissionModeFromCLI_2(
    e.inputs,
  ).levelPickHeldForPendingVerdict;
  return levelPickHeldForPendingVerdict === void 0
    ? void 0
    : orgPolicyNotLoadedNotice(levelPickHeldForPendingVerdict);
}
/**
 * 放弃等待策略结论：清除 awaitsPolicyVerdict（若仍在等 GrowthBook 则保留其余待定状态）。
 */
//@ chunk-zfbhezv9.js:23262-23390 facade-exports
function abandonPendingPolicyVerdictResolution() {
  let e = getProvisionalStartupMode();
  if (!e?.awaitsPolicyVerdict) return;
  setProvisionalStartupMode(
    e.awaitsGrowthBook && isGrowthBookCacheEmpty() ? { ...e, awaitsPolicyVerdict: !1 } : void 0,
  );
}
/**
 * 校验 auto 模式能否进入：读 tengu_auto_mode_config（enabled: enabled/disabled/opt-in、disableFastMode）、settings disableAutoMode、模型是否支持；可进入时返回刷新可用性的 updateContext，否则返回踢出 auto 的 updateContext 与原因通知（settings/circuit-breaker/fast-mode/model）。
 */
//@ chunk-zfbhezv9.js:23390-25368 facade-exports = verifyAutoModeGateAccess (0.8)
async function verifyAutoModeGateAccess(context, fastMode, isLaunchRun = !1) {
  let autoModeConfig = await getDynamicConfig_BLOCKS_ON_INIT("tengu_auto_mode_config", {}),
    enabledState = parseAutoModeEnabledState(autoModeConfig?.enabled),
    disabledBySettings = isAutoModeDisabledBySettingsNow();
  if (!isAutoModeCircuitBroken()) setAutoModeCircuitBroken(enabledState === "disabled");
  let mainModel = getMainLoopModel(),
    { supported: supported, disableFastModeBreakerFires: disableFastModeBreakerFires } =
      getAutoModeModelSupport({
        model: mainModel,
        fastMode: !!fastMode,
        disableFastMode: !!autoModeConfig?.disableFastMode,
      });
  setAutoModeFastModeBreakerReason(disableFastModeBreakerFires ? (fastMode ? "fast-mode" : "model") : null);
  let P = enabledState !== "disabled" && !disabledBySettings && supported,
    E = P,
    h = disabledBySettings && enabledState !== "disabled" && supported;
  logForDebugging(
    `[auto-mode] verifyAutoModeGateAccess: enabledState=${enabledState} disabledBySettings=${disabledBySettings} model=${mainModel} modelSupported=${supported} disableFastModeBreakerFires=${disableFastModeBreakerFires} carouselAvailable=${E} canEnterAuto=${P}`,
  );
  let _ = getAutoModeFlagCli();
  if (!P) setProvisionalStartupMode(void 0);
  let setAvailable = (ctx, available) => {
    if (ctx.isAutoModeAvailable !== available)
      logForDebugging(
        `[auto-mode] verifyAutoModeGateAccess setAvailable: ${ctx.isAutoModeAvailable} -> ${available}`,
      );
    return ctx.isAutoModeAvailable === available && ctx.canAutoClassifierRun === P
      ? ctx
      : { ...ctx, isAutoModeAvailable: available, canAutoClassifierRun: P };
  };
  if (P)
    return {
      canEnterAuto: P,
      refusedForSettingsAlone: h,
      updateContext: (ctx) => {
        if (
          (abandonPendingPolicyVerdictResolution(),
          (ctx = settleProvisionalStartupMode(ctx)),
          setProvisionalStartupMode(void 0),
          ctx.mode === "plan" && !ctx.prePlanMode)
        ) {
          let O = activatePlanAutoMode(ctx);
          if (O) return setAvailable({ ...O, prePlanMode: "default" }, E);
        }
        return setAvailable(ctx, E);
      },
    };
  let reason;
  if (disabledBySettings)
    ((reason = "settings"),
      logForDebugging("auto mode disabled: disableAutoMode in settings", { level: "warn" }));
  else if (enabledState === "disabled")
    ((reason = "circuit-breaker"),
      logForDebugging('auto mode disabled: tengu_auto_mode_config.enabled === "disabled" (circuit breaker)', {
        level: "warn",
      }));
  else if (fastMode && disableFastModeBreakerFires && modelSupportsAutoMode(mainModel))
    ((reason = "fast-mode"),
      logForDebugging("auto mode disabled: tengu_auto_mode_config.disableFastMode with the /fast toggle on", {
        level: "warn",
      }));
  else
    ((reason = "model"),
      logForDebugging(`auto mode disabled: model ${getMainLoopModel()} does not support auto mode`, {
        level: "warn",
      }));
  let notification = getAutoModeUnavailableNotification(reason),
    kickOutOfAutoIfNeeded = (ctx) => {
      if (
        (logForDebugging(
          `[auto-mode] kickOutOfAutoIfNeeded applying: ctx.mode=${ctx.mode} ctx.prePlanMode=${ctx.prePlanMode} reason=${reason}`,
        ),
        !isAutoModeInUse(ctx))
      )
        return setAvailable(ctx, !1);
      return createDisabledAutoModeContext(ctx);
    },
    w = isAutoModeInUse(context);
  if (!w && !_) return { updateContext: kickOutOfAutoIfNeeded, canEnterAuto: P, refusedForSettingsAlone: h };
  if (w) {
    let A = isLaunchRun && reason === "model" && isAutoModeFromFallback();
    return {
      updateContext: kickOutOfAutoIfNeeded,
      canEnterAuto: P,
      refusedForSettingsAlone: h,
      notification: A ? void 0 : notification,
    };
  }
  return {
    updateContext: kickOutOfAutoIfNeeded,
    canEnterAuto: P,
    refusedForSettingsAlone: h,
    notification: context.isAutoModeAvailable ? notification : void 0,
  };
}
//@ chunk-zfbhezv9.js:25368-25403 facade-exports
function autoModeRefusedHere() {
  return isAutoModeCircuitBroken() || isAutoModeDisabledBySettingsNow();
}
//@ chunk-zfbhezv9.js:25403-25459 layout
function qe() {
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
/**
 * 为遥测收集 auto 模式可用性：是否可用、不可用原因、禁用来源（含策略来源）、enabled 状态及其来源、熔断状态、settings 的 defaultMode、是否来自回退。
 */
//@ chunk-zfbhezv9.js:25514-25940 facade-exports
function getAutoModeAvailabilityForAnalytics() {
  let e = qe(),
    s = getAutoModeEnabledStateWithSource();
  return {
    autoModeAvailable: isAutoModeGateEnabled(),
    autoModeUnavailableReason: fromEnumOpt(getAutoModeUnavailableReason()),
    autoModeDisabledBySettingsSource: fromEnumOpt(e),
    autoModeDisabledByPolicyOrigin: e === "policySettings" ? fromEnumOpt(getPolicySettingsOrigin()) : void 0,
    autoModeDisabledByTrustedPolicy: isAutoModeDisabledByPolicySettings(),
    autoModeEnabledState: fromEnum(s.value),
    autoModeEnabledStateSource: fromEnum(s.src),
    autoModeCircuitBroken: isAutoModeCircuitBroken(),
    defaultModeSetting: fromEnumOpt((getSettings_DEPRECATED() || {}).permissions?.defaultMode),
    autoModeFromFallback: isAutoModeFromFallback(),
  };
}
/**
 * auto 模式是否被托管策略设置禁用（policySettings 与可信策略层均禁用）。
 */
//@ chunk-zfbhezv9.js:25940-26009 facade-exports = _temp7 (1)
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
  let s = getFeatureValue_CACHED_MAY_BE_STALE("tengu_auto_mode_config", {})?.enabled,
    o = parseAutoModeEnabledState(s);
  return { value: o, src: s === o ? "gb" : "default" };
}
/**
 * 禁用 bypass：当前为 bypass 时切回 default，并把 isBypassPermissionsModeAvailable 置为 false。
 */
//@ chunk-zfbhezv9.js:26251-26418 facade-exports = createDisabledBypassPermissionsContext (1)
function createDisabledBypassPermissionsContext(currentContext) {
  let updatedContext = currentContext;
  if (currentContext.mode === "bypassPermissions")
    updatedContext = applyValidatedPermissionUpdate(currentContext, {
      type: "setMode",
      mode: "default",
      destination: "session",
    });
  return { ...updatedContext, isBypassPermissionsModeAvailable: !1 };
}
/**
 * 当前处于 auto，或 plan 且进入前是 auto/已剥离危险规则。
 */
//@ chunk-zfbhezv9.js:26418-26528 facade-exports
function isAutoModeInUse(e) {
  return e.mode === "auto" || (e.mode === "plan" && (e.prePlanMode === "auto" || !!e.strippedDangerousRules));
}
/**
 * 闸门关闭时退出 auto：恢复危险规则，模式改回 default（或按主动性档位算出的模式），并标记 auto 不可用。
 */
//@ chunk-zfbhezv9.js:26528-27225 facade-exports
function createDisabledAutoModeContext(e) {
  let s = "default";
  {
    let startupModeDecidedByProactivityLevel = e.startupModeDecidedByProactivityLevel;
    if ((e.mode === "auto" || e.prePlanMode === "auto") && startupModeDecidedByProactivityLevel !== void 0) {
      if (isProactivityActive()) {
        let r = toExternalPermissionMode(
            permissionModeForProactivityLevel(
              startupModeDecidedByProactivityLevel,
              { isAutoModeAvailable: !1, isBypassPermissionsModeAvailable: !1 },
              e.proactivityBaseline?.mode,
            ),
          ),
          n =
            getProactivityPolicyVerdict(
              startupModeDecidedByProactivityLevel,
              r,
              e.proactivityBaseline?.mode,
            ) !== void 0;
        s = r === "plan" || n ? "default" : r;
      }
      e = { ...e, startupModeDecidedByProactivityLevel: void 0 };
    }
  }
  if ((setAutoModeActive(!1), setNeedsAutoModeExitAttachment(!0), e.mode === "auto"))
    return (
      logPermissionModeChanged({ from: "auto", to: s, trigger: "auto_gate_denied" }),
      {
        ...applyValidatedPermissionUpdate(restoreDangerousPermissions(e), {
          type: "setMode",
          mode: s,
          destination: "session",
        }),
        isAutoModeAvailable: !1,
        canAutoClassifierRun: !1,
      }
    );
  return {
    ...restoreDangerousPermissions(e),
    prePlanMode: e.prePlanMode === "auto" ? s : e.prePlanMode,
    isAutoModeAvailable: !1,
    canAutoClassifierRun: !1,
  };
}
/**
 * settings 的 permissions.defaultMode 是否为 auto。
 */
//@ chunk-zfbhezv9.js:27225-27291 facade-exports = isDefaultPermissionModeAuto (1)
function isDefaultPermissionModeAuto() {
  return (getSettings_DEPRECATED() || {}).permissions?.defaultMode === "auto";
}
//@ chunk-zfbhezv9.js:27291-27325 facade-exports
function shouldPlanUseAutoMode() {
  return isAutoModeGateEnabled() && getUseAutoModeDuringPlan();
}
//@ chunk-zfbhezv9.js:27325-27396 layout = _temp9 (1)
function Ee() {
  return (
    isAutoModeActive() &&
    isAutoModeSupportedNow() &&
    !isAutoModeDisabledByPolicySettings() &&
    !isAutoModeDisabledBySettings(getSettingsForSource("flagSettings") || {})
  );
}
//@ chunk-zfbhezv9.js:27396-27423 layout
function Te() {
  return shouldPlanUseAutoMode();
}
//@ chunk-zfbhezv9.js:27423-27469 facade-exports
function canPlanReturnToAutoMode(e) {
  return isAutoModeGateEnabled() || (e === "auto" && Ee());
}
//@ chunk-zfbhezv9.js:27469-27496 facade-exports
function latchPlanAutoModeAtLaunch() {
  setPlanAutoModeOffAtLaunch(!getUseAutoModeDuringPlan());
}
//@ chunk-zfbhezv9.js:27496-27535 facade-exports
function settlePlanAutoModeAtStart(e) {
  return (latchPlanAutoModeAtLaunch(), reconcilePlanAutoMode(e, shouldPlanUseAutoMode));
}
//@ chunk-zfbhezv9.js:27535-27616 layout
function Me() {
  return (
    (isAutoModeGateEnabled() || Ee()) &&
    (!isPlanAutoModeOffAtLaunch() || getUseAutoModeDuringPlan()) &&
    !isDisabledAboveWorkloadFiles("useAutoModeDuringPlan")
  );
}
//@ chunk-zfbhezv9.js:27616-27673 facade-exports
function activatePlanAutoMode(e) {
  if (!Te()) return null;
  return (setAutoModeActive(!0), stripDangerousPermissionsForAutoMode(e));
}
/**
 * 进入 plan：记录 prePlanMode；从 auto 进入时视 plan 是否沿用分类器决定是否恢复危险规则；从其他模式进入时若 plan 使用 auto 分类器则剥离危险规则。
 */
//@ chunk-zfbhezv9.js:27673-28016 facade-exports = prepareContextForPlanMode (0.927)
function prepareContextForPlanMode(context) {
  let currentMode = context.mode;
  if (currentMode === "plan") return context;
  if (currentMode === "auto") {
    if (Me()) return { ...context, prePlanMode: "auto" };
    return (
      setAutoModeActive(!1),
      setNeedsAutoModeExitAttachment(!0),
      { ...restoreDangerousPermissions(context), prePlanMode: "auto" }
    );
  }
  if (currentMode !== "bypassPermissions") {
    let o = activatePlanAutoMode(context);
    if (o) return { ...o, prePlanMode: currentMode };
  }
  return (
    logForDebugging(`[prepareContextForPlanMode] plain plan entry, prePlanMode=${currentMode}`, {
      level: "info",
    }),
    { ...context, prePlanMode: currentMode }
  );
}
/**
 * 把上下文规整为“已认领的启动模式”：清除主动性档位标记；未经 flag 允许时关闭 bypass 可用；plan 带 prePlanMode 时按 auto 是否激活处理 plan 的 auto 状态。
 */
//@ chunk-zfbhezv9.js:28016-28413 facade-exports = transitionPlanAutoMode (0.56)
function asClaimedStartModeContext(e, s) {
  let o = e;
  if (o.startupModeDecidedByProactivityLevel !== void 0)
    o = { ...o, startupModeDecidedByProactivityLevel: void 0 };
  if (o.mode !== "bypassPermissions" && o.isBypassPermissionsModeAvailable && !s.bypassAvailableByFlag)
    o = { ...o, isBypassPermissionsModeAvailable: !1 };
  if (o.mode === "plan" && o.prePlanMode !== void 0) {
    let r = transitionPlanAutoMode({ ...o, prePlanMode: "default" });
    o = isAutoModeActive() ? r : { ...r, prePlanMode: void 0 };
  }
  return o;
}
//@ chunk-zfbhezv9.js:28413-28445 facade-exports
function transitionPlanAutoMode(e) {
  return reconcilePlanAutoMode(e, Me);
}
//@ chunk-zfbhezv9.js:28445-28710 affinity
function reconcilePlanAutoMode(e, s) {
  if (e.mode === "auto") return stripDangerousPermissionsForAutoMode(e);
  if (e.mode !== "plan") return e;
  if (!e.prePlanMode || e.prePlanMode === "bypassPermissions") return e;
  let o = isAutoModeActive(),
    r = o ? s() : Te();
  if (r && o) return stripDangerousPermissionsForAutoMode(e);
  if (!r && !o) return e;
  if (r)
    return (
      setAutoModeActive(!0),
      setNeedsAutoModeExitAttachment(!1),
      stripDangerousPermissionsForAutoMode(e)
    );
  return (setAutoModeActive(!1), setNeedsAutoModeExitAttachment(!0), restoreDangerousPermissions(e));
}
//@ chunk-kswt4qha.js:1370-1403 placement
var me = new SessionRootSlot(() => ({ layers: [] }));
//@ chunk-kswt4qha.js:1403-1448 placement
function j() {
  return me.peek(getRootSession())?.layers ?? [];
}
/**
 * 读取自动压缩提议记录。
 */
//@ chunk-kswt4qha.js:1448-1872 placement
function readAutoCompactOffer(e, n, r) {
  let s = O(O(e.autoCompactOffer, n), r);
  if (typeof s !== "object" || s === null || typeof s.eligibleLoggedAt !== "number") return;
  let { escCount: escCount, resolved: resolved } = s,
    u = typeof resolved === "object" && resolved !== null,
    { choice: choice, tokens: tokens } = u ? resolved : {};
  return {
    eligibleLoggedAt: s.eligibleLoggedAt,
    isAnswered: u,
    ...(typeof escCount === "number" && Number.isInteger(escCount) && escCount > 0 && { escCount: escCount }),
    ...((choice === "accept" || choice === "keep") &&
      typeof tokens === "number" && { resolved: { choice: choice, tokens: tokens } }),
  };
}
/**
 * 在自动压缩提议状态里记下某（会话, 键）的 eligibleLoggedAt；已有记录时不改。
 */
//@ chunk-kswt4qha.js:1872-2056 placement
function markAutoCompactOfferEligibleLogged(e, n, r, s) {
  if (readAutoCompactOffer(e, n, r) !== void 0) return e;
  let f = O(e.autoCompactOffer, n);
  return {
    ...e,
    autoCompactOffer: { ...e.autoCompactOffer, [n]: { ...f, [r]: { ...O(f, r), eligibleLoggedAt: s } } },
  };
}
//@ chunk-kswt4qha.js:2056-2139 placement
function lhi(e, n, r) {
  let s = readAutoCompactOffer(e, n, r);
  return updateAutoCompactOffer(e, n, r, { escCount: (s?.escCount ?? 0) + 1 });
}
//@ chunk-kswt4qha.js:2139-2190 placement
function dhi(e, n, r, s) {
  return updateAutoCompactOffer(e, n, r, { resolved: s });
}
//@ chunk-kswt4qha.js:2190-2384 placement
function updateAutoCompactOffer(e, n, r, s) {
  let f = O(e.autoCompactOffer, n),
    d = O(f, r),
    u = readAutoCompactOffer(e, n, r);
  if (u === void 0 || u.isAnswered || !d) return e;
  return { ...e, autoCompactOffer: { ...e.autoCompactOffer, [n]: { ...f, [r]: { ...d, ...s } } } };
}
//@ chunk-kswt4qha.js:2384-2469 placement
function O(e, n) {
  return typeof e === "object" && e !== null && Object.hasOwn(e, n) ? e[n] : void 0;
}
//@ chunk-kswt4qha.js:2469-2557 placement
function q(e, n, r) {
  let s = readAutoCompactOffer(e, n, r);
  return s !== void 0 && (s.isAnswered || (s.escCount ?? 0) > 0);
}
//@ chunk-kswt4qha.js:2947-3029 placement
function W(e, n) {
  if (n === "auto" || (e === "proactive" && n === "acceptEdits")) return n;
  return;
}
//@ chunk-kswt4qha.js:3029-3066 placement
function oQr(e) {
  return parseEffortValue(e) ?? resolveEffortKeyword(e);
}
//@ chunk-kswt4qha.js:3066-3207 callgraph-fingerprint = getAutoModeEnabledStateIfCached (0.462)
function isAutoModeKillswitchServed() {
  let { value: e, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
    "tengu_auto_mode_config",
    {},
  );
  if (e?.enabled !== "disabled") return !1;
  return source === "override" || source === "payload";
}
/**
 * 纯函数决定启动模式：按 --dangerously-skip-permissions、--permission-mode、agent frontmatter、settings defaultMode（project/local 不能授予 bypass/auto，CCR 只允许 acceptEdits/plan/default/auto）、继承模式的顺序取第一个可用模式；都没有时满足条件可默认 auto；再按主动性档位覆盖。返回模式、通知、各种“等待策略结论”标志。
 */
//@ chunk-kswt4qha.js:3207-9146 fingerprint = initialPermissionModeFromCLI (0.311)
function initialPermissionModeFromCLI_2(e) {
  let { cli: cli, env: env, settings: settings, agentFrontmatter: agentFrontmatter } = e,
    d = normalizePermissionModeAlias(cli.permissionMode),
    u = normalizePermissionModeAlias(cli.inheritPermissionMode),
    dangerouslySkipPermissions = cli.dangerouslySkipPermissions,
    m = agentFrontmatter?.permissionMode,
    S = Boolean(dangerouslySkipPermissions || d || m);
  if (isEnvTruthy(env.CLAUDE_CODE_SUBPROCESS_ENV_SCRUB)) {
    let g =
        dangerouslySkipPermissions ||
        (d && d !== "default") ||
        (u && u !== "default") ||
        (m && m !== "default"),
      M =
        "Permission mode forced to default \u2014 CLAUDE_CODE_SUBPROCESS_ENV_SCRUB is set " +
        "(allowed_non_write_users hardening). Declare allowedTools explicitly, or set CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=0 to opt out.";
    return {
      mode: "default",
      notification: g ? M : void 0,
      fromAutoFallback: !1,
      baselineMode: "default",
      decidedByProactivityLevel: !1,
      modeSuppliedOnInvocation: !0,
      autoDefaultWithheldForPendingVerdict: !1,
      levelPickHeldForPendingVerdict: void 0,
      autoStartWithheldForHipaaTaint: !1,
    };
  }
  let h = settings.permissions?.disableBypassPermissionsMode === "disable",
    y = isAutoModeKillswitchServed(),
    x = !y && !isAutoModeDisabledBySettings_2(settings),
    orderedModes = [],
    _,
    D = u
      ? parseStartupPermissionMode(
          u,
          y,
          "inherited auto mode dropped \u2014 auto mode killswitch active (override- or payload-served)",
        )
      : void 0,
    P = u ? (D?.mode ?? permissionModeFromString(u)) : void 0;
  if (dangerouslySkipPermissions)
    if (isUnconsentedBgBypass("bypassPermissions")) ((_ = KCt), orderedModes.push("default"));
    else orderedModes.push("bypassPermissions");
  if (d) {
    let g = parseStartupPermissionMode(
      d,
      y,
      "auto mode killswitch active (override- or payload-served) \u2014 falling back to default",
    );
    if (g) {
      if (g.unconsented) _ = KCt;
      orderedModes.push(g.mode);
    }
  }
  if (m)
    if (m === "auto" && y)
      logForDebugging(
        "agent frontmatter requested auto mode but circuit breaker active \u2014 falling through",
        { level: "warn" },
      );
    else if (P && narrowerMode(m, P) === void 0)
      (logForDebugging(
        `agent frontmatter permissionMode "${m}" ignored \u2014 it would widen the agent view's inherited mode (effective "${P}"), and the dispatched agent name is repo-controllable (settings \`agent\`)`,
        { level: "warn" },
      ),
        logEvent("tengu_agent_frontmatter_mode_widening_carry_ignored", {}));
    else orderedModes.push(m);
  if (isVsCodeTopSession()) {
    let g = !isHarborWillowEnabled()
      ? void 0
      : J()
          .map((M) => normalizePermissionModeAlias(getSettingsForSource(M)?.permissions?.defaultMode))
          .find((M) => M != null);
    if (g != null && isEnvTruthy(env.CLAUDE_CODE_REMOTE) && !isRemoteSupportedMode(g)) {
      if (
        (logForDebugging(
          `settings defaultMode "${g}" is not supported in CLAUDE_CODE_REMOTE \u2014 only acceptEdits, plan, default, and auto are allowed`,
          { level: "warn" },
        ),
        orderedModes.length === 0)
      )
        (logEvent("tengu_ccr_unsupported_default_mode_ignored", { mode_hash: gn(g) }),
          orderedModes.push("default"));
    } else if (g === "bypassPermissions") {
      if (dangerouslySkipPermissions || cli.allowDangerouslySkipPermissions)
        if (isUnconsentedBgBypass("bypassPermissions")) {
          if (orderedModes.length === 0)
            ((_ = KCt),
              process.stderr.write(`\u26A0 ${_}
`));
          orderedModes.push("default");
        } else orderedModes.push(g);
      else if (orderedModes.length === 0)
        ((_ =
          'Permission mode bypassPermissions from settings was ignored \u2014 enable the "Claude Code: Allow Dangerously Skip Permissions" setting in VS Code to consent to it'),
          logForDebugging(
            'settings defaultMode "bypassPermissions" ignored for a VS Code-owned session without the allow-bypass setting',
            { level: "warn" },
          ),
          logEvent("tengu_settings_bypass_unconsented_noninteractive_ignored", {}),
          process.stderr.write(`\u26A0 ${_}
`),
          orderedModes.push("default"));
    } else if (g === "auto")
      if (!y) orderedModes.push(g);
      else
        logForDebugging(
          'settings defaultMode "auto" ignored for the IDE session \u2014 auto-mode circuit breaker is active',
          { level: "warn" },
        );
    else if (g != null) orderedModes.push(g);
  } else if (settings.permissions?.defaultMode) {
    let parsedMode = normalizePermissionModeAlias(settings.permissions.defaultMode);
    if (isEnvTruthy(env.CLAUDE_CODE_REMOTE) && !isRemoteSupportedMode(parsedMode))
      (logForDebugging(
        `settings defaultMode "${parsedMode}" is not supported in CLAUDE_CODE_REMOTE \u2014 only acceptEdits, plan, default, and auto are allowed`,
        { level: "warn" },
      ),
        logEvent("tengu_ccr_unsupported_default_mode_ignored", { mode_hash: gn(parsedMode) }));
    else if (parsedMode === "bypassPermissions")
      if (!isDefaultModeSetByTrustedSource("bypassPermissions")) {
        if (
          (logForDebugging(
            'settings defaultMode "bypassPermissions" ignored \u2014 only policy/user/flag settings may grant bypass mode (projectSettings and localSettings are repo-controllable)',
            { level: "warn" },
          ),
          logEvent("tengu_settings_bypass_mode_untrusted_source_ignored", {}),
          !u)
        )
          orderedModes.push("default");
      } else if (isUnconsentedBgBypass("bypassPermissions")) {
        if (orderedModes.length === 0) _ = KCt;
        orderedModes.push("default");
      } else orderedModes.push(parsedMode);
    else if (parsedMode !== "auto")
      if (P && !isDefaultModeSetByTrustedSource(parsedMode) && narrowerMode(parsedMode, P) === void 0)
        (logForDebugging(
          `settings defaultMode "${parsedMode}" ignored \u2014 it would widen the agent view's inherited mode (effective "${P}"), and only policy/user/flag settings may do that (projectSettings and localSettings are repo-controllable)`,
          { level: "warn" },
        ),
          logEvent("tengu_settings_mode_widening_carry_ignored", {}));
      else orderedModes.push(parsedMode);
    else if (!isDefaultModeSetByTrustedSource("auto"))
      (logForDebugging(
        'settings defaultMode "auto" ignored \u2014 only policy/user/flag settings may grant auto mode (projectSettings and localSettings are repo-controllable)',
        { level: "warn" },
      ),
        logEvent("tengu_settings_auto_mode_untrusted_source_ignored", {}));
    else if (y)
      logForDebugging(
        "auto mode killswitch active (override- or payload-served) \u2014 falling back to default",
        { level: "warn" },
      );
    else if (
      isEnvTruthy(env.CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT) &&
      isAutoModeDisabledBySettings_2(settings)
    )
      logForDebugging(
        'settings defaultMode "auto" ignored \u2014 disableAutoMode is set and this is an unattended Remote Control machine session',
        { level: "warn" },
      );
    else orderedModes.push("auto");
  }
  if (u) {
    let g = D;
    if (g) {
      if (g.unconsented && orderedModes.length === 0) _ = KCt;
      orderedModes.push(g.mode);
    }
  }
  let L;
  for (let mode of orderedModes) {
    if (mode === "bypassPermissions" && h) {
      (logForDebugging("bypassPermissions mode is disabled by settings", { level: "warn" }),
        (_ = "Bypass permissions mode was disabled by settings"));
      continue;
    }
    L = { mode: mode, notification: _ };
    break;
  }
  let C = !1,
    A = !1,
    I,
    T = !1;
  if (!L) {
    let g =
        x &&
        ((!isEnvTruthy(env.CLAUDE_CODE_REMOTE) &&
          isHarborWillowEnabled() &&
          (!cli.isNonInteractiveSession ||
            isVsCodeTopSession() ||
            getFeatureValue_CACHED_MAY_BE_STALE("tengu_moss_anchor", !1))) ||
          isEnvTruthy(env.CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT)),
      M = "default";
    if (g) {
      let w = getHipaaPolicyVerdict(),
        k = isEnvTruthy(env.CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT);
      if (w === void 0 || (w === "pending" && k)) ((M = "auto"), (C = !0));
      else if (w === "taint") ((_ ??= AUTO_NOT_ORG_DEFAULT_NOTICE), (T = !0));
      else if (w === "pending") A = !0;
    }
    L = { mode: M, notification: _ };
  }
  let mode = L.mode,
    X = !1;
  if (e.proactivityLevel && e.proactivityLevel !== "default" && !S) {
    let g = permissionModeForProactivityLevel(
        e.proactivityLevel,
        { isAutoModeAvailable: x, isBypassPermissionsModeAvailable: !1 },
        mode,
      ),
      M = W(e.proactivityLevel, g),
      w = getProactivityPolicyVerdict(e.proactivityLevel, g, mode),
      k = w === "pending" && isEnvTruthy(env.CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT) ? void 0 : w;
    if (M !== void 0 && k === "taint") ((L.notification ??= orgDefaultModeNotice(M)), (T = !0));
    else if (k === "pending") ((A = !0), (I = M));
    ((L = { mode: k === void 0 ? g : "default", notification: L.notification }), (C = !1), (X = !0));
  }
  return {
    mode: L.mode,
    notification: L.notification,
    fromAutoFallback: C,
    baselineMode: mode,
    decidedByProactivityLevel: X,
    modeSuppliedOnInvocation: S,
    autoDefaultWithheldForPendingVerdict: A,
    levelPickHeldForPendingVerdict: I,
    autoStartWithheldForHipaaTaint: T,
  };
}
//@ chunk-kswt4qha.js:9146-9213 layout
var ORG_DEFAULT_MODE_LABELS = { auto: "Auto mode", acceptEdits: "Accept edits" },
  AUTO_NOT_ORG_DEFAULT_NOTICE = orgDefaultModeNotice("auto");
//@ chunk-kswt4qha.js:9213-9310 layout
function orgDefaultModeNotice(e) {
  return `${ORG_DEFAULT_MODE_LABELS[e]} isn't the default for your organization \xB7 Shift+Tab to switch`;
}
//@ chunk-kswt4qha.js:9310-9423 layout
function orgPolicyNotLoadedNotice(e) {
  return `${ORG_DEFAULT_MODE_LABELS[e]} didn't start: your organization's policy hasn't loaded \xB7 Shift+Tab to switch`;
}
/**
 * 主动性档位对应模式与当前不同时，返回 HIPAA 策略结论（taint/pending），否则 undefined。
 */
//@ chunk-kswt4qha.js:9423-9497 layout
function getProactivityPolicyVerdict(e, n, r) {
  let s = W(e, n);
  if (s === void 0 || s === r) return;
  return getHipaaPolicyVerdict();
}
/**
 * HIPAA 策略结论：已知 HIPAA 或曾见到不可得的 HIPAA 状态时为 taint，策略待定时为 pending。
 */
//@ chunk-kswt4qha.js:9497-9622 layout
function getHipaaPolicyVerdict() {
  let e = autoDefaultVerdictState();
  if (hasComplianceTaint("hipaa") || e === "unobtainable_seen_hipaa") return "taint";
  return e === "pending" ? "pending" : void 0;
}
/**
 * 启动参数解析：取 CLI 或 settings 的 fallbackModel 列表并规范化（与权限无关，属模型/启动选项解析）。
 */
//@ chunk-kswt4qha.js:9622-9776 layout
function resolveFallbackModels(e) {
  let n =
    e.cli.fallbackModel ?? (Array.isArray(e.settings.fallbackModel) ? e.settings.fallbackModel : void 0);
  if (n === void 0) return;
  return parseToolListFromCLI(n, isModelAllowed);
}
/**
 * 把逗号分隔字符串拆成去空白的非空项列表。
 */
//@ chunk-kswt4qha.js:9776-9851 file-local
function splitCommaList(baseTools) {
  return baseTools
    .split(",")
    .map((n) => n.trim())
    .filter((n) => n !== "");
}
//@ chunk-kswt4qha.js:9851-10130 file-local
function parseToolListFromCLI(e, n) {
  let r = typeof e === "string" ? splitCommaList(e) : e,
    s = new Set(),
    result = [];
  for (let toolString of r) {
    let u = typeof toolString === "string" ? toolString.trim() : "";
    if (u === "") continue;
    let E = parseUserSpecifiedModel(u === "default" ? getDefaultMainLoopModel() : u);
    if (s.has(E)) continue;
    if (!n(E)) continue;
    if ((s.add(E), result.push(E), result.length === ye)) break;
  }
  return result.length > 0 ? result : void 0;
}
//@ chunk-kswt4qha.js:10130-10139 layout
var ye = 3;
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
      return !0;
    default:
      return !1;
  }
}
/**
 * 应用组织默认模型：组织锁定模式下记录已见更新时间并按来源决定是否保留模型；普通模式下组织默认更新且覆盖用户选择时清掉用户设置里的 model，并记下已见时间。
 */
//@ chunk-kswt4qha.js:10642-11612 layout
function applyOrgModelDefault(model, isExplicitModel, storage) {
  if (Vte()) {
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
            : { ...c, lastSeenOrgDefaultUpdatedAt: orgUpdatedAt },
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
  let included = getAllowedSettingSources().includes("userSettings"),
    lastSeenOrgDefaultUpdatedAt = getGlobalConfig().lastSeenOrgDefaultUpdatedAt,
    isNewerOrgDefault =
      new Date(orgDefault.updated_at).getTime() > new Date(lastSeenOrgDefaultUpdatedAt ?? 0).getTime(),
    shouldMarkSeen = isNewerOrgDefault && !isExplicitModel && included,
    markSeen = () =>
      saveGlobalConfig(
        (y) =>
          y.lastSeenOrgDefaultUpdatedAt === orgDefault.updated_at
            ? y
            : { ...y, lastSeenOrgDefaultUpdatedAt: orgDefault.updated_at },
        storage,
      );
  if (orgDefault.override_user_selection) {
    if (shouldMarkSeen) markSeen();
    return;
  }
  if (isExplicitModel) return model;
  let userModel = included ? getSettingsForSource("userSettings")?.model : void 0;
  if (isNewerOrgDefault && userModel) {
    if (
      (updateSettingsForSource("userSettings", { model: void 0 }, void 0, storage).then((y) => {
        if (!y.error) markSeen();
      }),
      modelSource === "userSettings")
    )
      return;
  } else if (shouldMarkSeen) markSeen();
  return model;
}
/**
 * 启动时解析主模型：CLI --model（default 取默认模型）> agent frontmatter 的 model > env ANTHROPIC_MODEL > settings.model，并记录来源；随后校验模型可用性（与权限无关，属模型解析）。
 */
//@ chunk-kswt4qha.js:11612-12575 layout
function resolveStartupModel(e, n) {
  let { cli: cli, env: env, settings: settings, agentFrontmatter: agentFrontmatter } = e,
    u = cli.model === "default" ? getDefaultMainLoopModel() : cli.model,
    E = u,
    m = null;
  if (u) m = cli.model === "default" ? "cli_default" : "cli";
  let S = agentFrontmatter?.model,
    h;
  if (!u && S && S !== "inherit")
    ((h = S),
      (u = parseUserSpecifiedModel(S)),
      (E = S),
      (m = agentFrontmatter?.modelSource === "routine" ? "routine_frontmatter" : "agent_frontmatter"));
  let y = !1,
    x,
    c = u;
  if (c === void 0) {
    if (env.ANTHROPIC_MODEL) ((c = env.ANTHROPIC_MODEL), (m = "env"));
    else if (
      ((c = applyOrgModelDefault(settings.model || void 0, cli.isNonInteractiveSession === !0, n) || void 0),
      c !== void 0)
    )
      m = settingSourceToConfigChangeSource(getEffectiveSettingSource_2("model"));
    E = c;
  }
  let _;
  if (c && !isModelAllowed(c)) {
    let C = h !== void 0 && !y ? h : c,
      A = y ? null : stepDownRestrictedFamilyAliasPick(C);
    if (A !== null) {
      if (((_ = C), (c = A), u !== void 0)) u = A;
    } else {
      if (!(C.trim().toLowerCase() === "default" || isWindowSilentDefaultPick(C)) && !y) _ = C;
      ((c = void 0), (E = void 0), (m = null), (u = void 0));
    }
  }
  let D;
  if (c && isUnservedModelSpelling(c, isUserConfiguredSource(m) ? "persisted" : "explicit"))
    ((D = c), (c = void 0), (E = void 0), (m = null), (u = void 0));
  let P = c || null,
    L = parseUserSpecifiedModel(P ?? getDefaultMainLoopModel());
  return {
    effectiveModel: u,
    initialMainLoopModel: P,
    resolvedInitialModel: L,
    rawModelRequest: E || null,
    restrictedModel: _,
    unservedModelSpelling: D,
    settingLayer: m,
    modelWithoutStartupOverride: x,
  };
}
/**
 * 启动参数解析：取 CLI 的 systemPrompt 与 appendSystemPrompt，并把额外的附加系统提示拼到 append 之后。
 */
//@ chunk-kswt4qha.js:12575-12719 layout
function resolveSystemPromptOptions(e) {
  let systemPrompt = e.cli.systemPrompt,
    appendSystemPrompt = e.cli.appendSystemPrompt,
    s = WRi();
  if (s)
    appendSystemPrompt = appendSystemPrompt
      ? `${appendSystemPrompt}

${s}`
      : s;
  return { systemPrompt: systemPrompt, appendSystemPrompt: appendSystemPrompt };
}
/**
 * GrowthBook tengu_harbor_willow（默认开）或远端配置 meadow_lantern 为真时返回 true；用途是启动选项的一个特性闸门。
 */
//@ chunk-kswt4qha.js:12719-12797 layout
function isHarborWillowEnabled() {
  return (
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_harbor_willow", !0) ||
    getCachedClientDataStrict()?.meadow_lantern === !0
  );
}
//@ chunk-kswt4qha.js:12797-12887 layout
var toReversed = SETTING_SOURCES.filter((e) => !REPO_DIR_SETTING_SOURCES.has(e)).toReversed(),
  xe = ["acceptEdits", "plan", "default", "auto"];
//@ chunk-kswt4qha.js:12887-12923 layout
function isRemoteSupportedMode(e) {
  return xe.includes(e);
}
//@ chunk-kswt4qha.js:12923-12957 layout
function J() {
  return toReversed.filter(isSettingSourceEnabled);
}
//@ chunk-kswt4qha.js:12957-13029 layout
function isDefaultModeSetByTrustedSource(e) {
  return J().some((n) => getSettingsForSource(n)?.permissions?.defaultMode === e);
}
//@ chunk-kswt4qha.js:13029-13124 layout = isAutoModeDisabledBySettings (1)
function isAutoModeDisabledBySettings_2(e) {
  return e.permissions?.disableAutoMode === "disable" || e.disableAutoMode === "disable";
}
//@ chunk-kswt4qha.js:13124-13159 layout
function canSeedAutoMode(e) {
  return !isAutoModeDisabledBySettings_2(e) && !isAutoModeKillswitchServed();
}
//@ chunk-kswt4qha.js:13159-13300 layout
function isTrustedPlanDisplaced(e) {
  return (
    J()
      .map((r) => normalizePermissionModeAlias(getSettingsForSource(r)?.permissions?.defaultMode))
      .find((r) => r != null) === "plan" &&
    normalizePermissionModeAlias(e.permissions?.defaultMode) !== "plan"
  );
}
/**
 * 找出最后一个设置了 defaultMode 的设置层（auto 来自不可信层除外）；层不可读时返回 settings_unreadable，非 auto 默认返回 stored_default，否则 undefined。
 */
//@ chunk-kswt4qha.js:13300-13739 layout
function getStoredDefaultModeBar() {
  let last = SETTING_SOURCES.filter(isSettingSourceEnabled)
    .map((n) => ({
      source: n,
      mode: (
        n === "policySettings"
          ? getFatalAdminPolicyLoadErrors().length > 0 ||
            getPolicySettingsLoadErrors().some((r) => r.userWritable === !0 && r.path === "") ||
            (getParentManagedSettingsInvalid() && parentManagedTierParticipates()) ||
            (getEligibilityMemo() !== !1 && !getRemoteManagedSettingsSyncFromCache())
          : getSettingsParseErrorsForSource(n).some((r) => r.severity !== "warning")
      )
        ? "unreadable"
        : getSettingsForSource(n)?.permissions?.defaultMode,
    }))
    .findLast(
      ({ source: source, mode: mode }) =>
        mode !== void 0 && (mode !== "auto" || !REPO_DIR_SETTING_SOURCES.has(source)),
    );
  return last === void 0 || last.mode === "auto"
    ? void 0
    : last.mode === "unreadable"
      ? "settings_unreadable"
      : "stored_default";
}
/**
 * auto 能否作为启动模式“种入”的因素：可种入（设置允许且非 scrub）、存储的 defaultMode 阻挡、用户另选了档位或继承模式、继承 plan 保持、可信 plan 被替换。
 */
//@ chunk-kswt4qha.js:13739-13993 layout
function getAutoSeedFactors({
  settings: settings,
  scrubbed: scrubbed,
  typedLevel: typedLevel,
  carriedMode: carriedMode,
}) {
  let f = typedLevel !== void 0 && typedLevel !== "default";
  return {
    autoSeedable: canSeedAutoMode(settings) && !scrubbed,
    storedDefaultBar: getStoredDefaultModeBar(),
    otherChoiceTyped: f || (carriedMode !== void 0 && carriedMode !== "auto"),
    carriedPlanHolds: carriedMode === "plan" && !f,
    trustedPlanDisplaced: isTrustedPlanDisplaced(settings),
  };
}
//@ chunk-kswt4qha.js:13993-14132 fingerprint = isDefaultPermissionModeAuto (1)
function getSettingsDefaultMode(e) {
  let n = normalizePermissionModeAlias(e.permissions?.defaultMode);
  if (n == null || !isRemoteSupportedMode(n)) return;
  if (n !== "auto") return n;
  return isDefaultModeSetByTrustedSource("auto") && canSeedAutoMode(e) ? "auto" : void 0;
}
/**
 * 启动模式遥测：未显式指定模式/跳过权限/scrub 时记录 settings 的 defaultMode 与 effort。
 */
//@ chunk-kswt4qha.js:14132-14419 layout
function getStartupModeTelemetry({
  gateOn: gateOn,
  permissionModeTyped: permissionModeTyped,
  dangerouslySkipPermissions: dangerouslySkipPermissions,
  scrubbed: scrubbed,
  settings: settings,
  effort: effort,
}) {
  let u = !permissionModeTyped && !dangerouslySkipPermissions && !scrubbed,
    E = u ? getSettingsDefaultMode(settings) : void 0;
  return {
    considered: gateOn && u,
    settingsDefaultModePresent: settings.permissions?.defaultMode != null,
    settingsDefault: E,
    permissionMode: gateOn ? E : void 0,
    effort: gateOn ? effort : void 0,
  };
}
/**
 * 远程会话的模式：发来的模式为 auto 时返回 undefined（另行处理），有则用之；否则取仓库设置的 defaultMode（须为远程支持的非 auto 模式），缺省 default。
 */
//@ chunk-kswt4qha.js:14419-14596 layout
function resolveRemoteSessionMode({ sentMode: sentMode, repositorySettings: repositorySettings }) {
  if (sentMode === "auto") return;
  if (sentMode !== void 0) return sentMode;
  let r = Y(repositorySettings?.permissions?.defaultMode);
  return r !== void 0 && r !== "auto" && isRemoteSupportedMode(r) ? r : "default";
}
/**
 * 决定初始权限模式是否采用设置中的默认模式。
 */
//@ chunk-kswt4qha.js:14596-15121 placement
function resolveSeedPermissionMode({
  seed: seed,
  settingsMode: settingsMode,
  sentMode: sentMode,
  startsIn: startsIn,
}) {
  if (
    !seed.considered ||
    !seed.settingsDefaultModePresent ||
    seed.permissionMode !== void 0 ||
    settingsMode === void 0 ||
    (sentMode !== void 0 && Y(settingsMode) === sentMode)
  )
    return null;
  let f =
    Y(settingsMode) === "auto"
      ? "auto mode could not be requested from this machine (it is off here, or only the repository asked for it)"
      : "not a mode a cloud session can start in";
  return {
    text: `Settings kept on this machine: the default permission mode in your settings (${settingsMode}) \u2014 ${f}${startsIn !== void 0 ? `; the session starts in ${startsIn} mode` : ""}`,
    level: "info",
  };
}
//@ chunk-kswt4qha.js:15121-15166 placement
function Y(e) {
  return e === void 0 ? void 0 : parsePermissionMode(e);
}
/**
 * 后台工作者使用 bypass 需要同意的说明。
 */
//@ chunk-kswt4qha.js:15166-15655 placement
var BYPASS_CONSENT_MESSAGE =
    'bypass in a background worker needs consent recorded in your user settings \u2014 add "skipDangerousModePermissionPrompt": true to ~/.claude/settings.json (accepting the interactive disclaimer writes the same key, but that dialog is skipped while consent already exists in .claude/settings.local.json or via --settings, which does not count here). A launch with user settings off does not read that file: relaunch with them on',
  KCt = `Permission mode downgraded to default: ${BYPASS_CONSENT_MESSAGE}`;
/**
 * 后台会话以 bypassPermissions 启动但未接受过绕过模式确认时返回 true。
 */
//@ chunk-kswt4qha.js:15655-15775 placement
function isUnconsentedBgBypass(e) {
  if (!isBgSession()) return !1;
  if (e === "bypassPermissions")
    return !hasVouchedSkipDangerousModePermissionPrompt() && !getGlobalConfig().bypassPermissionsModeAccepted;
  return !1;
}
//@ chunk-kswt4qha.js:15775-15913 placement
function parseStartupPermissionMode(e, n, r) {
  let s = permissionModeFromString(e);
  if (isUnconsentedBgBypass(s)) return { mode: "default", unconsented: !0 };
  if (s === "auto" && n) {
    logForDebugging(r, { level: "warn" });
    return;
  }
  return { mode: s };
}
/**
 * tengu_virtual_pancake 开关。
 */
//@ chunk-kswt4qha.js:15913-15971 placement
function isVirtualPancakeEnabled() {
  return De() ?? getFeatureValue_SESSION_PINNED("tengu_virtual_pancake", !1);
}
//@ chunk-kswt4qha.js:15971-15992 placement
function De() {
  return;
}
/**
 * 两个 effort 是否相同。
 */
//@ chunk-kswt4qha.js:15992-16039 placement
function sameEffort(e, n) {
  return (
    strippedCanonicalName(parseUserSpecifiedModel(e)) === strippedCanonicalName(parseUserSpecifiedModel(n))
  );
}
//@ chunk-kswt4qha.js:16039-16069 placement
var TENGU_LOGGIA_PASSAGE = "tengu_loggia_passage";
//@ chunk-kswt4qha.js:16069-16098 placement
function U() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LOGGIA_PASSAGE, !1);
}
/**
 * 判断拒绝回退时是否把已发送的 effort 带到回退模型：没发送、来自钩子、来自轮次层或被开关关闭时不带并说明原因。
 */
//@ chunk-kswt4qha.js:16098-16362 placement
function getRefusedEffortCarry({ sent: sent, turnEffort: turnEffort, hookEffortValue: hookEffortValue }) {
  if (sent === void 0) return { carry: null, withheld: "none_sent" };
  if (hookEffortValue !== void 0) return { carry: null, withheld: "hook" };
  if (turnEffort !== void 0) return { carry: null, withheld: "turn_layer" };
  return U() ? { carry: null, withheld: "killed" } : { carry: sent };
}
/**
 * 把 effort 携带结果转成遥测字段。
 */
//@ chunk-kswt4qha.js:16362-16480 placement
function refusedEffortTelemetryFields(e) {
  return {
    refused_effort_level: fromEnumOpt(e.carry),
    refused_effort_withheld: fromEnumOpt(e.carry === null ? e.withheld : void 0),
  };
}
/**
 * 计算拒绝回退后的 effort：会话持有时只锁定携带值；否则取携带值或循环覆盖值，作为回退模型的循环 effort。
 */
//@ chunk-kswt4qha.js:16480-16729 placement
function resolveRefusalFallbackEffort({
  refusedEffort: refusedEffort,
  fallbackModel: fallbackModel,
  heldBySession: heldBySession,
  loopOverride: loopOverride,
  loopEffort: loopEffort,
}) {
  if (heldBySession) return { latchEffort: refusedEffort.carry ?? void 0, loopEffort: void 0 };
  let d = refusedEffort.carry ?? VZo(loopOverride, loopEffort);
  return { latchEffort: void 0, loopEffort: d === void 0 ? void 0 : { model: fallbackModel, level: d } };
}
//@ chunk-kswt4qha.js:16729-16793 placement
function VZo(e, n) {
  return n !== void 0 && n.model === e ? n.level : void 0;
}
//@ chunk-kswt4qha.js:16793-16843 placement
function re() {
  return getRefusalFallbackModelLatch()?.carriedEffort !== void 0;
}
//@ chunk-kswt4qha.js:16843-17031 placement
function getCarriedRefusalEffort(e) {
  let n = getRefusalFallbackModelLatch(),
    r = getMainLoopModelOverride();
  if (n?.carriedEffort === void 0 || r == null || U()) return;
  try {
    return sameEffort(r, n.fallbackModel) && sameEffort(e, n.fallbackModel) ? n.carriedEffort : void 0;
  } catch (error) {
    logError(toError(error));
    return;
  }
}
/**
 * 取本轮循环的 effort：有显式值时用（被开关关闭则 null）；延续主会话时取携带的拒绝回退 effort。
 */
//@ chunk-kswt4qha.js:17031-17150 placement
function resolveLoopEffort(
  { loopEffort: loopEffort, continuesMainConversation: continuesMainConversation },
  r,
) {
  if (loopEffort !== void 0) return U() ? null : loopEffort;
  return (continuesMainConversation ? getCarriedRefusalEffort(r) : void 0) ?? null;
}
/**
 * 比较携带 effort 带与不带的结果，得出 moot/no_effect/clamped/applied_over_saved/applied。
 */
//@ chunk-kswt4qha.js:17150-17321 placement
function classifyEffortCarryEffect({
  carried: carried,
  withIt: withIt,
  withoutIt: withoutIt,
  isSavedSetAside: isSavedSetAside,
}) {
  if (withIt === withoutIt) return withIt === carried ? "moot" : "no_effect";
  if (withIt !== carried) return "clamped";
  return isSavedSetAside ? "applied_over_saved" : "applied";
}
//@ chunk-kswt4qha.js:17321-17357 placement
function scr() {
  releaseRefusalFallbackCarriedEffort("effort_change");
}
//@ chunk-kswt4qha.js:17357-17443 placement
function yhi(e) {
  let n = getRefusalFallbackModelLatch();
  if (n !== void 0 && !sameEffort(e, n.fallbackModel)) releaseRefusalFallbackCarriedEffort("model_change");
}
/**
 * 开关关闭或主模型已不是回退模型时释放携带的拒绝回退 effort。
 */
//@ chunk-kswt4qha.js:17443-17603 placement
function releaseStaleRefusalEffortCarry() {
  let e = getRefusalFallbackModelLatch();
  if (e?.carriedEffort === void 0) return;
  let n = getMainLoopModelOverride();
  if (U()) releaseRefusalFallbackCarriedEffort("kill_switch");
  else if (n == null || !sameEffort(n, e.fallbackModel)) releaseRefusalFallbackCarriedEffort("model_change");
}
/**
 * 是否启用最大 effort 提醒。
 */
//@ chunk-kswt4qha.js:17603-17687 placement
function isMaxEffortReminderEnabled() {
  return env.CLAUDE_CODE_MAX_EFFORT_REMINDER ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_proud_clover", !1);
}
//@ chunk-kswt4qha.js:17687-17711 placement
function icr() {
  return !1;
}
/**
 * 恒为 false（构建时裁掉的特殊 effort 关键字检查）。
 */
//@ chunk-kswt4qha.js:17711-17736 placement
function isReservedEffortKeyword(e) {
  return !1;
}
//@ chunk-sfy7bm1n.js:6520-6553 placement
var V = ge(new Set(), (e) => e.clear());
//@ chunk-sfy7bm1n.js:6553-6971 placement
function warnMcpRuleMismatch(e, r) {
  let toolName = e.toolName;
  if (V.has(toolName)) return;
  (V.add(toolName),
    logForDebugging(
      r.mcpInfo
        ? `Allow rule "${toolName}" does not allow the tools named "${getMcpPrefix_2(r.mcpInfo.serverName)}<tool>": they belong to another MCP server than the rule names. To allow them, use "${getMcpPrefix_2(r.mcpInfo.serverName)}*".`
        : `Allow rule "${toolName}" does not allow "${r.name}": the name reads as more than one MCP server's. To allow it, use the tool's full name.`,
      { level: "warn" },
    ));
}
//@ chunk-sfy7bm1n.js:6971-6999 placement
var TENGU_GREEDY_SHORE = "tengu_greedy_shore";
//@ chunk-sfy7bm1n.js:6999-7035 placement
function SFe() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_GREEDY_SHORE, !1) === !0;
}
//@ chunk-sfy7bm1n.js:7035-7061 placement
var re_sfy7 = new HostScoped(() => new Set());
//@ chunk-sfy7bm1n.js:7061-7111 placement
function aXr(e, r) {
  for (let o of r) b().add(buildMcpToolName(e, o));
}
//@ chunk-sfy7bm1n.js:7111-7221 placement = getMcpPrefix (1)
function getMcpPrefix(serverName) {
  if (!serverName.startsWith("mcp__")) return !1;
  for (let r of b()) if (serverName === r || mcpRuleMatchesToolAny(serverName, { name: r })) return !0;
  return !1;
}
//@ chunk-sfy7bm1n.js:7221-7254 placement
function Yui() {
  return b().size > 0;
}
//@ chunk-sfy7bm1n.js:7254-7290 placement
function b() {
  return re_sfy7.of(getRootSession().host);
}
/**
 * Bash 规则是否危险：整工具、空内容或全是空白/星号，或命中危险命令前缀表。
 */
//@ chunk-sfy7bm1n.js:7807-7922 facade-exports
function isDangerousBashPermission(e, r) {
  if (e !== BASH_TOOL_NAME) return !1;
  if (r === void 0 || r === "") return !0;
  if (/^[\s*]+$/.test(r)) return !0;
  return matchesDangerousCommandPrefix(r, DANGEROUS_BASH_RULE_PREFIXES);
}
/**
 * Bash 规则内容是否等价于“任意执行某危险前缀”：*、前缀本身、"前缀:*"/"前缀 *"/"前缀*"，或以前缀开头并以 * 结尾；网络/云命令只在子命令危险或含 $/` 时算；python -m 包名例外。
 */
//@ chunk-sfy7bm1n.js:7922-8705 layout
function matchesDangerousCommandPrefix(ruleContent, prefixes) {
  let lower = ruleContent.trim().toLowerCase();
  if (lower === "*") return !0;
  for (let n of prefixes) {
    let lower_2 = n.toLowerCase();
    if (lower === lower_2) return !0;
    if (lower === `${lower_2}:*` || lower === `${lower_2} *`) return !0;
    if (lower === `${lower_2}*`) return !0;
    if (lower.startsWith(`${lower_2} `) && lower.endsWith("*")) {
      let sliced = lower.slice(lower_2.length + 1);
      if (SUBCOMMAND_CHECKED_COMMANDS.has(lower_2)) {
        if (/[$`]/.test(sliced)) return !0;
        let m = DANGEROUS_SUBCOMMANDS[lower_2];
        if (m === "all") return !0;
        let filtered = sliced
            .replace(/[\s:*]+$/, "")
            .split(/\s+/)
            .filter(Boolean),
          a = 0;
        for (; a < filtered.length; a++) {
          let c = filtered[a];
          if (!c.startsWith("-")) break;
          if (!c.includes("=") && a + 1 < filtered.length && !filtered[a + 1].startsWith("-")) a++;
        }
        let f = filtered[a];
        if (f === void 0) {
          if ((lower_2 === "curl" || lower_2 === "wget") && filtered.some((c) => c.includes("://"))) continue;
          return !0;
        }
        if (m?.has(f)) return !0;
        continue;
      }
      if (sliced.startsWith("-")) {
        let sliced_2 = sliced.slice(0, -1);
        if (!(/^python[\d.]*$/.test(lower_2) && /^-m\s+\w+\.[\w.]+(\s*:|\s+)$/.test(sliced_2))) return !0;
      }
    }
  }
  return !1;
}
/**
 * PowerShell 规则是否危险：空/通配，或匹配 pwsh/cmd/iex/Invoke-Command/Start-Process/Add-Type/New-Object 等（含 .exe 形式）的前缀/通配形式。
 */
//@ chunk-sfy7bm1n.js:8705-9626 facade-exports = isDangerousPowerShellPermission (0.906)
function isDangerousPowerShellPermission(toolName, ruleContent) {
  if (toolName !== POWERSHELL_TOOL_NAME) return !1;
  if (ruleContent === void 0 || ruleContent === "") return !0;
  if (/^[\s*]+$/.test(ruleContent)) return !0;
  let content = ruleContent.trim().toLowerCase();
  if (content === "*") return !0;
  let n = [
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
  for (let pattern of n) {
    if (content === pattern) return !0;
    if (content === `${pattern}:*`) return !0;
    if (content === `${pattern}*`) return !0;
    if (content === `${pattern} *`) return !0;
    if (content.startsWith(`${pattern} -`) && content.endsWith("*")) return !0;
    let sp = pattern.indexOf(" "),
      exe = sp === -1 ? `${pattern}.exe` : `${pattern.slice(0, sp)}.exe${pattern.slice(sp)}`;
    if (content === exe) return !0;
    if (content === `${exe}:*`) return !0;
    if (content === `${exe}*`) return !0;
    if (content === `${exe} *`) return !0;
    if (content.startsWith(`${exe} -`) && content.endsWith("*")) return !0;
  }
  return !1;
}
//@ chunk-sfy7bm1n.js:9626-9662 facade-exports
function isDangerousTaskPermission(e, r) {
  return canonicalToolName(e) === AGENT;
}
//@ chunk-sfy7bm1n.js:9662-9691 layout
function ne(e) {
  return e === MONITOR;
}
//@ chunk-sfy7bm1n.js:9691-9822 layout
class Y_sfy7 {
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
var K = new Y_sfy7();
//@ chunk-sfy7bm1n.js:9834-9868 layout
function PPe() {
  return isCoworkAny() || isAutoModeClassifyAllShellEnabled();
}
/**
 * 规则是否危险（带缓存）：Bash、PowerShell、Task 危险规则，或代码执行类工具、Artifact REPL 工具。
 */
//@ chunk-sfy7bm1n.js:9868-10075 layout
function isDangerousPermissionRule(e, r) {
  let o = `${e}\x00${r ?? ""}`,
    lookup = K.lookup(o);
  if (lookup !== void 0) return lookup;
  let s =
    isDangerousBashPermission(e, r) ||
    isDangerousPowerShellPermission(e, r) ||
    isDangerousTaskPermission(e, r) ||
    ne(e) ||
    e === require("./chunk-q973gz0n.js").APPIFACT_REPL_TOOL_NAME;
  return (K.remember(o, s), s);
}
/**
 * 工具是否属于“auto 下钩子 allow 也必须经分类器”的类别：MCP 工具，或在相关开关下的特定前缀工具、MCP 资源读取工具、危险工具。
 */
//@ chunk-sfy7bm1n.js:10075-10200 file-local
function requiresClassifierForHookAllow(e) {
  let r = getToolNameForPermissionCheck_2(e);
  return (
    getMcpPrefix(r) ||
    !1 ||
    (isCoworkAny() &&
      (r.startsWith(MCP_TOOL_PREFIX) ||
        ((e.name === READMCPRESOURCETOOL || e.name === READ_MCP_RESOURCE_DIR_TOOL_NAME) && SFe()) ||
        isDangerousPermissionRule(e.name, void 0)))
  );
}
/**
 * 对分类器而言规则是否危险：在特定开关下 Bash/PowerShell 一律危险，MCP 工具一律危险，否则走 wYt。进入 auto 时据此剥离 allow 规则。
 */
//@ chunk-sfy7bm1n.js:10200-10287 facade-exports
function isDangerousClassifierPermission(e, r) {
  if ((e === BASH_TOOL_NAME || e === POWERSHELL_TOOL_NAME) && PPe()) return !0;
  if (getMcpPrefix(e)) return !0;
  return isDangerousPermissionRule(e, r);
}
//@ chunk-e6aww6q8.js:1270853-1270876 facade-exports
function antBuiltinDenyRules() {
  return [];
}
//@ chunk-e6aww6q8.js:3261661-3261758 fingerprint = isAutoModeDisabledBySettings (1)
function isAutoModeDisabledBySettings(e) {
  return e.disableAutoMode === "disable" || e.permissions?.disableAutoMode === "disable";
}
//@ chunk-e6aww6q8.js:3261758-3261794 layout
function isAutoModeDisabledBySettingsNow() {
  return isAutoModeDisabledBySettings(getSettings_DEPRECATED() || {});
}
//@ chunk-e6aww6q8.js:3261794-3261832 layout
function isAutoModeSupportedNow() {
  return !isAutoModeCircuitBroken() && modelSupportsAutoMode(getMainLoopModel());
}
/**
 * auto 闸门实时值：未被熔断（Pge）、当前主模型支持 auto、且 settings 未 disableAutoMode。
 */
//@ chunk-e6aww6q8.js:3261832-3261867 facade-exports
function isAutoModeGateEnabled() {
  return isAutoModeSupportedNow() && !isAutoModeDisabledBySettingsNow();
}
/**
 * auto 不可用的原因：settings / circuit-breaker / model，或 Els() 给出的其他原因。
 */
//@ chunk-e6aww6q8.js:3261867-3262027 facade-exports = getAutoModeUnavailableReason (1)
function getAutoModeUnavailableReason(e = getMainLoopModel()) {
  if (isAutoModeDisabledBySettingsNow()) return "settings";
  if (isAutoModeCircuitBroken()) return "circuit-breaker";
  if (!modelSupportsAutoMode(e)) return "model";
  let n = getAutoModeFastModeBreakerReason();
  if (n === "model" && !isAntInternalFastModelId(e)) return null;
  return n;
}
/**
 * auto 不可用原因到提示文字：settings、circuit-breaker、fast-mode、model 四种。
 */
//@ chunk-e6aww6q8.js:3262027-3262342 facade-exports = getAutoModeUnavailableNotification (0.763)
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
/**
 * 当前 auto 不可用时的提示文字，无具体原因时用通用文字。
 */
//@ chunk-e6aww6q8.js:3262342-3262427 facade-exports
function getAutoModeUnavailableText() {
  let e = getAutoModeUnavailableReason();
  return e !== null ? getAutoModeUnavailableNotification(e) : "auto mode is unavailable right now";
}
/**
 * settings.permissions.disableBypassPermissionsMode="disable" 时返回原因文字。
 */
//@ chunk-9rkt9tdt.js:227-374 fingerprint = isBypassPermissionsModeDisabled (0.752)
function getBypassDisabledReason() {
  if ((getSettings_DEPRECATED() || {}).permissions?.disableBypassPermissionsMode === "disable")
    return "Bypass permissions mode was disabled by settings";
  return;
}
//@ chunk-9rkt9tdt.js:374-410 facade-exports
function isBypassPermissionsModeDisabled() {
  return getBypassDisabledReason() !== void 0;
}
//@ chunk-tr0s0d0k.js:23784-23793 affinity
var HOST_CREDENTIAL_SCAN_DEPTH = 4;
/**
 * 若 Shell 命令会读取宿主凭证（Windows 按 token 检查，其他平台按 wt 扫描），返回 hostCredential 来源的 deny 规则。
 */
//@ chunk-tr0s0d0k.js:23793-24209 callgraph-fingerprint = isOverlyBroadPowerShellAllowRule (0.244)
async function getHostCredentialDenyRule(tool, input) {
  let { command: command } = input;
  if (typeof command !== "string") return;
  if (getPlatform() === "windows") {
    if (tool.name !== BASH_TOOL_NAME && tool.name !== POWERSHELL_TOOL_NAME) return;
    let s;
    for (let d of readsCredentialStore(command, tool.name === BASH_TOOL_NAME ? "bash" : "powershell"))
      s ??= credentialCommandIn(d);
    if (s !== void 0)
      return {
        source: HOST_CREDENTIAL_RULE_SOURCE,
        ruleBehavior: "deny",
        ruleValue: { toolName: tool.name, ruleContent: `*${s}*` },
      };
    return;
  }
  let [r] = keychainCommands();
  return r !== void 0 &&
    tool.name === BASH_TOOL_NAME &&
    (await commandReachesSettings(command, HOST_CREDENTIAL_SCAN_DEPTH))
    ? { source: HOST_CREDENTIAL_RULE_SOURCE, ruleBehavior: "deny", ruleValue: bashPrefixRule(r) }
    : void 0;
}
/**
 * PermissionUpdate 可用的目的地列表：userSettings、projectSettings、localSettings、flagSettings、cliArg、session。
 */
//@ chunk-4p0ppc72.js:377-468 fingerprint = isPermissionUpdateDestination (0.909)
var PERMISSION_UPDATE_DESTINATIONS = [
  "userSettings",
  "projectSettings",
  "localSettings",
  "flagSettings",
  "cliArg",
  "session",
];
/**
 * auto 模式 enabled 状态的来源是否为 disabled（读取失败记错误并返回 false）。
 */
//@ chunk-7kt7c7a3.js:1223-1304 fingerprint = AUTO_MODE_ENABLED_DEFAULT (1)
function AUTO_MODE_ENABLED_DEFAULT() {
  try {
    return (
      getFeatureValueWithSource_CACHED_MAY_BE_STALE(PLUGIN_HOOKS_MODULES_GATE, HOOKS_MODULES_DEFAULT)
        .source === "disabled"
    );
  } catch (error) {
    return (logError(error), !1);
  }
}
/**
 * 读取 GrowthBook tengu_auto_mode_config，缺省返回冻结的空配置。
 */
//@ chunk-gz7b768t.js:1257-1346 fingerprint = getAutoModeEnabledState (1)
function getAutoModeConfigOrDefault() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_auto_mode_config", freeze) ?? freeze;
  if (e !== freeze) return e;
  return isGrowthBookEnabled() ? freeze : CLASSIFIER_FEATURE_DEFAULTS;
}

export {
  isVirtualPancakeEnabled,
  transitionPermissionMode,
  sameEffort,
  setPermissionModeWithGuards,
  getAutoModeUnavailableText,
  getAutoModeConfigOrDefault,
  isDangerousClassifierPermission,
  PPe,
  requiresClassifierForHookAllow,
  warnMcpRuleMismatch,
  resolveLoopEffort,
  isBypassPermissionsModeDisabled,
  canSeedAutoMode,
  getAutoModeUnavailableReason,
  KCt,
  BG_UNCONSENTED_BYPASS_CAPABILITY_NOTICE,
  getAutoModeUnavailableNotification,
  getStartupModeTelemetry,
  getAutoSeedFactors,
  resolveRemoteSessionMode,
  resolveSeedPermissionMode,
  verifyAutoModeGateAccess,
  getAutoModeAvailabilityForAnalytics,
  guardPermissionModeChange,
  undonePermissionContext,
  applyPermissionModeRevertEffects,
  aF,
  isAutoModeGateEnabled,
  isMaxEffortReminderEnabled,
  j,
  q,
  re,
  getCarriedRefusalEffort,
  oQr,
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
  lhi,
  dhi,
  readAutoCompactOffer,
  canPlanReturnToAutoMode,
  restoreDangerousPermissions,
  stripDangerousPermissionsForAutoMode,
  getProactivityPolicyVerdict,
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
  VZo,
  refusedEffortTelemetryFields,
  resolveRefusalFallbackEffort,
  icr,
  scr,
  initializeToolPermissionContext,
  antBuiltinDenyRules,
  latchPlanAutoModeAtLaunch,
  activatePlanAutoMode,
  resolveStartupModel,
  Yui,
  isDangerousBashPermission,
  isDangerousPowerShellPermission,
  PERMISSION_UPDATE_DESTINATIONS,
  yhi,
  AUTO_MODE_ENABLED_DEFAULT,
  SFe,
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
