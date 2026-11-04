/**
 * utils/permissions/permissionSetup.ts
 *
 * 权限上下文初始化（CLI 参数、settings 规则、额外目录、bypass/auto 可用性）、启动模式决策、模式切换（进出 plan/auto 时剥离与恢复危险规则）、auto 闸门校验与不可用原因、危险/宽泛规则检测。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/permissionSetup.ts
 * pieces: chunk-4p0ppc72.js (1), chunk-7kt7c7a3.js (1), chunk-9rkt9tdt.js (2), chunk-e6aww6q8.js (8), chunk-gz7b768t.js (1), chunk-kswt4qha.js (51), chunk-sfy7bm1n.js (20), chunk-tr0s0d0k.js (2), chunk-zfbhezv9.js (79)
 * attribution: fingerprint 9, facade-exports 64, layout 50, placement 34, callgraph-fingerprint 2, file-local 4, affinity 2
 */
import { createHash } from "crypto";
import { relative, resolve } from "path";
import {
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  PLUGIN_HOOKS_MODULES_GATE,
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
  isGrowthBookEnabled,
  isGrowthBookCacheEmpty,
  getDynamicConfig_BLOCKS_ON_INIT,
} from "../../services/analytics/growthbook.js";
import { HOOKS_MODULES_DEFAULT } from "../../services/analytics/growthbookCredentials.js";
import { logError } from "../log.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import {
  getRootSession,
  getAllowedSettingSources,
  getParentManagedSettingsInvalid,
  getRefusalFallbackModelLatch,
  getMainLoopModelOverride,
  releaseRefusalFallbackCarriedEffort,
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
} from "../../bootstrap/state.js";
import {
  parseEffortValue,
  resolveEffortKeyword,
  isEffortCarryDisabled,
  carriedEffortForModel,
} from "../effort.js";
import {
  normalizePermissionModeAlias,
  parsePermissionMode,
  UNRECOGNIZED_PERMISSION_MODE_ERROR,
} from "../../types/permissions.js";
import { isEnvTruthy } from "../envUtils.js";
import { permissionModeFromString, toExternalPermissionMode } from "./PermissionMode.js";
import { logForDebugging } from "../debug.js";
import { narrowerMode } from "./browserToolNames.js";
import { logEvent } from "../../services/analytics/index.js";
import { isVsCodeTopSession } from "../sessionShape.js";
import {
  getSettingsForSource,
  getEffectiveSettingSource_2,
  updateSettingsForSource,
  getFatalAdminPolicyLoadErrors,
  getPolicySettingsLoadErrors,
  parentManagedTierParticipates,
  getSettingsParseErrorsForSource,
  hasVouchedSkipDangerousModePermissionPrompt,
  getSettings_DEPRECATED,
  isAutoModeClassifyAllShellEnabled,
  getSettingsFilePathForSource,
  getPolicySettingsOrigin,
  getVouchedPolicyTierSettings,
  getUseAutoModeDuringPlan,
  isDisabledAboveWorkloadFiles,
} from "../settings/settings.js";
import { shortHash } from "../shortHash.js";
import { permissionModeForProactivityLevel } from "./getNextPermissionMode.js";
import { autoDefaultVerdictState } from "../../services/policyLimits/policyVerdicts.js";
import { hasComplianceTaint } from "../../services/policyLimits/complianceTaints.js";
import { isModelAllowed, getOrgModelDefaultUpdatedAt, getOrgModelDefault } from "../model/modelAllowlist.js";
import { parseUserSpecifiedModel } from "../model/modelDisplay.js";
import { getDefaultMainLoopModel } from "../model/modelFallback.js";
import { isServedCatalogActive } from "../model/modelCatalog/servedCatalog.js";
import {
  getGlobalConfig,
  saveGlobalConfig,
  getCachedClientDataStrict,
  workspacePersistedTrustThroughBackend,
} from "../config.js";
import {
  getOrgLockedDefaultModel,
  getBootstrapOrgDefaultEffect,
  stepDownRestrictedFamilyAliasPick,
} from "../model/planModeModel.js";
import { isWindowSilentDefaultPick } from "../model/defaultModel.js";
import { isUnservedModelSpelling, getMainLoopModel, isAntInternalFastModelId } from "../model/model.js";
import { remoteAppendSystemPrompt } from "../settings/policyHelper/helperRemote.js";
import {
  SETTING_SOURCES,
  REPO_DIR_SETTING_SOURCES,
  isSettingSourceEnabled,
  EDITABLE_SETTING_SOURCES,
  getEnabledSettingSources,
} from "../settings/constants.js";
import { getEligibilityMemo } from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { getRemoteManagedSettingsSyncFromCache } from "../../services/remoteManagedSettings/remoteSettingsCache.js";
import { isBgSession } from "../concurrentSessions.js";
import { strippedCanonicalName } from "../model/canonicalModelName.js";
import { fromEnumOpt, fromEnumArr, lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { toError } from "../errors.js";
import { env } from "../env.js";
import { identity } from "../identity.js";
import {
  getMcpPrefix as getMcpPrefix_2,
  buildMcpToolName,
  getToolNameForPermissionCheck as getToolNameForPermissionCheck_2,
  MCP_TOOL_PREFIX,
  mcpInfoFromString,
} from "../../services/mcp/mcpStringUtils.js";
import { HostScoped } from "../hostScoped.js";
import { mcpRuleMatchesToolAny } from "../../services/mcp/serverIdentity.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import {
  DANGEROUS_BASH_RULE_PREFIXES,
  SUBCOMMAND_CHECKED_COMMANDS,
  DANGEROUS_SUBCOMMANDS,
  CROSS_PLATFORM_CODE_EXEC,
  DANGEROUS_BASH_PATTERNS,
  NETWORK_COMMAND_PREFIXES,
  CLUSTER_COMMAND_PREFIXES,
} from "./dangerousPatterns.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import {
  canonicalToolName,
  permissionRuleValueFromString,
  hasWildcard,
  legacyToolNamesFor,
} from "./permissionRuleParser.js";
import { AGENT } from "../../tools/AgentTool/constants.js";
import { MONITOR } from "../../tools/MonitorTool/constants.js";
import { isCoworkAny, getEntrypointKind } from "../entrypointKinds.js";
import { READMCPRESOURCETOOL } from "../../tools/ReadMcpResourceTool/prompt.js";
import { READ_MCP_RESOURCE_DIR_TOOL_NAME } from "../../tools/ReadMcpResourceDirTool/prompt.js";
import { defaultConfig, CLASSIFIER_FEATURE_DEFAULTS } from "./classifierModelConfig.js";
import { createSignal, createLazySignal } from "../signal.js";
import { getCwdOrNull } from "../cwd.js";
import { applyValidatedPermissionUpdate } from "./PermissionUpdate.js";
import {
  collectRulesFromSettings,
  applyPermissionRulesToPermissionContext,
  getAllowRules,
  getDenyRules,
  getAskRules,
} from "./permissions.js";
import { formatPermissionRule, NEGATION_PREFIX, splitRuleList } from "./disallowedToolsFlag.js";
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
import { isStorageV5Enabled } from "../hoverRest.js";
import {
  loadAllPermissionRulesFromDisk,
  shouldAllowManagedPermissionRulesOnly,
  additionalDirectoryProvenance,
  loadTrustedAdditionalDirectoriesFromDisk,
} from "./permissionsLoader.js";
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
import { getAutoModeModelSupport, modelSupportsAutoMode } from "../betas.js";
import { isProactivityActive } from "../../Tool.js";
import {
  readsCredentialStore,
  credentialCommandIn,
  HOST_CREDENTIAL_RULE_SOURCE,
  keychainCommands,
  bashPrefixRule,
} from "../../remote/tools/serve/credentialPathGuards.js";
import { commandReachesSettings } from "../../remote/tools/serve/servedPathJudgement.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7kt7c7a3.js:1223-1304 fingerprint (2.1.88 match: AUTO_MODE_ENABLED_DEFAULT, 1)
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
//@ chunk-kswt4qha.js:1370-1403 placement
var approvalLayerSlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-kswt4qha.js:1370", () => {
  approvalLayerSlot = new SessionRootSlot(() => ({
    layers: [],
  }));
});
//@ chunk-kswt4qha.js:1403-1448 placement
/**
 * approvalLayers：当前会话的权限层。
 */
function approvalLayers() {
  return approvalLayerSlot.peek(getRootSession())?.layers ?? [];
}
//@ chunk-kswt4qha.js:2947-3029 placement
function proactivityModeFloor(proactivityLevel, mode) {
  if (mode === "auto" || (proactivityLevel === "proactive" && mode === "acceptEdits")) return mode;
  return;
}
//@ chunk-kswt4qha.js:3029-3066 placement
/**
 * parseEffortOrKeyword：解析 effort 值或关键字。
 */
function parseEffortOrKeyword(value) {
  return parseEffortValue(value) ?? resolveEffortKeyword(value);
}
//@ chunk-kswt4qha.js:3066-3207 callgraph-fingerprint (2.1.88 match: getAutoModeEnabledStateIfCached, 0.462)
function isAutoModeKillswitchServed() {
  let { value: config, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_auto_mode_config", {});
  if (config?.enabled !== "disabled") return false;
  return source === "override" || source === "payload";
}
//@ chunk-kswt4qha.js:3207-9146 fingerprint (2.1.88 match: initialPermissionModeFromCLI, 0.311)
/**
 * 纯函数决定启动模式：按 --dangerously-skip-permissions、--permission-mode、agent frontmatter、settings defaultMode（project/local 不能授予 bypass/auto，CCR 只允许 acceptEdits/plan/default/auto）、继承模式的顺序取第一个可用模式；都没有时满足条件可默认 auto；再按主动性档位覆盖。返回模式、通知、各种“等待策略结论”标志。
 */
function initialPermissionModeFromCLI_2(inputs) {
  let { cli, env, settings, agentFrontmatter } = inputs;
  let cliMode = normalizePermissionModeAlias(cli.permissionMode);
  let inheritMode = normalizePermissionModeAlias(cli.inheritPermissionMode);
  let dangerouslySkipPermissions = cli.dangerouslySkipPermissions;
  let permissionMode = agentFrontmatter?.permissionMode;
  let modeSuppliedOnInvocation = Boolean(dangerouslySkipPermissions || cliMode || permissionMode);
  if (isEnvTruthy(env.CLAUDE_CODE_SUBPROCESS_ENV_SCRUB)) {
    let hadRequestedMode =
      dangerouslySkipPermissions ||
      (cliMode && cliMode !== "default") ||
      (inheritMode && inheritMode !== "default") ||
      (permissionMode && permissionMode !== "default");
    let scrubNotice =
      "Permission mode forced to default \u2014 CLAUDE_CODE_SUBPROCESS_ENV_SCRUB is set " +
      "(allowed_non_write_users hardening). Declare allowedTools explicitly, or set CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=0 to opt out.";
    return {
      mode: "default",
      notification: hadRequestedMode ? scrubNotice : undefined,
      fromAutoFallback: false,
      baselineMode: "default",
      decidedByProactivityLevel: false,
      modeSuppliedOnInvocation: true,
      autoDefaultWithheldForPendingVerdict: false,
      levelPickHeldForPendingVerdict: undefined,
      autoStartWithheldForHipaaTaint: false,
    };
  }
  let bypassDisabledBySettings = settings.permissions?.disableBypassPermissionsMode === "disable";
  let killswitchActive = isAutoModeKillswitchServed();
  let autoAvailable = !killswitchActive && !isAutoModeDisabledBySettings_2(settings);
  let orderedModes = [];
  let notification;
  let inheritedStartup = inheritMode
    ? parseStartupPermissionMode(
        inheritMode,
        killswitchActive,
        "inherited auto mode dropped \u2014 auto mode killswitch active (override- or payload-served)",
      )
    : undefined;
  let inheritedMode = inheritMode
    ? (inheritedStartup?.mode ?? permissionModeFromString(inheritMode))
    : undefined;
  if (dangerouslySkipPermissions)
    if (isUnconsentedBgBypass("bypassPermissions")) {
      notification = BYPASS_CONSENT_MESSAGE;
      orderedModes.push("default");
    } else orderedModes.push("bypassPermissions");
  if (cliMode) {
    let startupPermissionMode = parseStartupPermissionMode(
      cliMode,
      killswitchActive,
      "auto mode killswitch active (override- or payload-served) \u2014 falling back to default",
    );
    if (startupPermissionMode) {
      if (startupPermissionMode.unconsented) notification = BYPASS_CONSENT_MESSAGE;
      orderedModes.push(startupPermissionMode.mode);
    }
  }
  if (permissionMode)
    if (permissionMode === "auto" && killswitchActive)
      logForDebugging(
        "agent frontmatter requested auto mode but circuit breaker active \u2014 falling through",
        {
          level: "warn",
        },
      );
    else if (inheritedMode && narrowerMode(permissionMode, inheritedMode) === undefined) {
      logForDebugging(
        `agent frontmatter permissionMode "${permissionMode}" ignored \u2014 it would widen the agent view's inherited mode (effective "${inheritedMode}"), and the dispatched agent name is repo-controllable (settings \`agent\`)`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_agent_frontmatter_mode_widening_carry_ignored", {});
    } else orderedModes.push(permissionMode);
  if (isVsCodeTopSession()) {
    let settingsDefaultMode = !isHarborWillowEnabled()
      ? undefined
      : enabledSettingSourcesReversed()
          .map((source) =>
            normalizePermissionModeAlias(getSettingsForSource(source)?.permissions?.defaultMode),
          )
          .find((mode) => mode != null);
    if (
      settingsDefaultMode != null &&
      isEnvTruthy(env.CLAUDE_CODE_REMOTE) &&
      !isRemoteSupportedMode(settingsDefaultMode)
    ) {
      logForDebugging(
        `settings defaultMode "${settingsDefaultMode}" is not supported in CLAUDE_CODE_REMOTE \u2014 only acceptEdits, plan, default, and auto are allowed`,
        {
          level: "warn",
        },
      );
      if (orderedModes.length === 0) {
        logEvent("tengu_ccr_unsupported_default_mode_ignored", {
          mode_hash: shortHash(settingsDefaultMode),
        });
        orderedModes.push("default");
      }
    } else if (settingsDefaultMode === "bypassPermissions") {
      if (dangerouslySkipPermissions || cli.allowDangerouslySkipPermissions) {
        if (isUnconsentedBgBypass("bypassPermissions")) {
          if (orderedModes.length === 0) {
            notification = BYPASS_CONSENT_MESSAGE;
            process.stderr.write(`\u26A0 ${notification}
`);
          }
          orderedModes.push("default");
        } else orderedModes.push(settingsDefaultMode);
      } else if (orderedModes.length === 0) {
        notification =
          'Permission mode bypassPermissions from settings was ignored \u2014 enable the "Claude Code: Allow Dangerously Skip Permissions" setting in VS Code to consent to it';
        logForDebugging(
          'settings defaultMode "bypassPermissions" ignored for a VS Code-owned session without the allow-bypass setting',
          {
            level: "warn",
          },
        );
        logEvent("tengu_settings_bypass_unconsented_noninteractive_ignored", {});
        process.stderr.write(`\u26A0 ${notification}
`);
        orderedModes.push("default");
      }
    } else if (settingsDefaultMode === "auto") {
      if (!killswitchActive) orderedModes.push(settingsDefaultMode);
      else
        logForDebugging(
          'settings defaultMode "auto" ignored for the IDE session \u2014 auto-mode circuit breaker is active',
          {
            level: "warn",
          },
        );
    } else if (settingsDefaultMode != null) orderedModes.push(settingsDefaultMode);
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
        if (!inheritMode) orderedModes.push("default");
      } else if (isUnconsentedBgBypass("bypassPermissions")) {
        if (orderedModes.length === 0) notification = BYPASS_CONSENT_MESSAGE;
        orderedModes.push("default");
      } else orderedModes.push(parsedMode);
    } else if (parsedMode !== "auto") {
      if (
        inheritedMode &&
        !isDefaultModeSetByTrustedSource(parsedMode) &&
        narrowerMode(parsedMode, inheritedMode) === undefined
      ) {
        logForDebugging(
          `settings defaultMode "${parsedMode}" ignored \u2014 it would widen the agent view's inherited mode (effective "${inheritedMode}"), and only policy/user/flag settings may do that (projectSettings and localSettings are repo-controllable)`,
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
    } else if (killswitchActive)
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
  if (inheritMode) {
    let startup = inheritedStartup;
    if (startup) {
      if (startup.unconsented && orderedModes.length === 0) notification = BYPASS_CONSENT_MESSAGE;
      orderedModes.push(startup.mode);
    }
  }
  let chosen;
  for (let mode of orderedModes) {
    if (mode === "bypassPermissions" && bypassDisabledBySettings) {
      logForDebugging("bypassPermissions mode is disabled by settings", {
        level: "warn",
      });
      notification = "Bypass permissions mode was disabled by settings";
      continue;
    }
    chosen = {
      mode,
      notification,
    };
    break;
  }
  let fromAutoFallback = false;
  let autoDefaultWithheld = false;
  let levelPickHeldForPendingVerdict;
  let hipaaTaintWithheld = false;
  if (!chosen) {
    let mayConsiderAuto =
      autoAvailable &&
      ((!isEnvTruthy(env.CLAUDE_CODE_REMOTE) &&
        isHarborWillowEnabled() &&
        (!cli.isNonInteractiveSession ||
          isVsCodeTopSession() ||
          getFeatureValue_CACHED_MAY_BE_STALE("tengu_moss_anchor", false))) ||
        isEnvTruthy(env.CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT));
    let mode = "default";
    if (mayConsiderAuto) {
      let hipaaPolicyVerdict = getHipaaPolicyVerdict();
      let isBridgeChildAuto = isEnvTruthy(env.CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT);
      if (hipaaPolicyVerdict === undefined || (hipaaPolicyVerdict === "pending" && isBridgeChildAuto)) {
        mode = "auto";
        fromAutoFallback = true;
      } else if (hipaaPolicyVerdict === "taint") {
        notification ??= AUTO_NOT_ORG_DEFAULT_NOTICE;
        hipaaTaintWithheld = true;
      } else if (hipaaPolicyVerdict === "pending") autoDefaultWithheld = true;
    }
    chosen = {
      mode,
      notification,
    };
  }
  let mode = chosen.mode;
  let decidedByProactivityLevel = false;
  if (inputs.proactivityLevel && inputs.proactivityLevel !== "default" && !modeSuppliedOnInvocation) {
    let levelMode = permissionModeForProactivityLevel(
      inputs.proactivityLevel,
      {
        isAutoModeAvailable: autoAvailable,
        isBypassPermissionsModeAvailable: false,
      },
      mode,
    );
    let levelFloor = proactivityModeFloor(inputs.proactivityLevel, levelMode);
    let proactivityPolicyVerdict = getProactivityPolicyVerdict(inputs.proactivityLevel, levelMode, mode);
    let policyVerdict =
      proactivityPolicyVerdict === "pending" && isEnvTruthy(env.CLAUDE_CODE_BRIDGE_CHILD_AUTO_DEFAULT)
        ? undefined
        : proactivityPolicyVerdict;
    if (levelFloor !== undefined && policyVerdict === "taint") {
      chosen.notification ??= orgDefaultModeNotice(levelFloor);
      hipaaTaintWithheld = true;
    } else if (policyVerdict === "pending") {
      autoDefaultWithheld = true;
      levelPickHeldForPendingVerdict = levelFloor;
    }
    chosen = {
      mode: policyVerdict === undefined ? levelMode : "default",
      notification: chosen.notification,
    };
    fromAutoFallback = false;
    decidedByProactivityLevel = true;
  }
  return {
    mode: chosen.mode,
    notification: chosen.notification,
    fromAutoFallback,
    baselineMode: mode,
    decidedByProactivityLevel,
    modeSuppliedOnInvocation,
    autoDefaultWithheldForPendingVerdict: autoDefaultWithheld,
    levelPickHeldForPendingVerdict,
    autoStartWithheldForHipaaTaint: hipaaTaintWithheld,
  };
}
//@ chunk-kswt4qha.js:9146-9213 layout
var ORG_DEFAULT_MODE_LABELS; // deferred: uses orgDefaultModeNotice of its import cycle while loading; runs once the cycle is complete
var AUTO_NOT_ORG_DEFAULT_NOTICE;
deferInit("chunk-kswt4qha.js:9146", () => {
  ORG_DEFAULT_MODE_LABELS = {
    auto: "Auto mode",
    acceptEdits: "Accept edits",
  };
  AUTO_NOT_ORG_DEFAULT_NOTICE = orgDefaultModeNotice("auto");
});
//@ chunk-kswt4qha.js:9213-9310 layout
function orgDefaultModeNotice(mode) {
  return `${ORG_DEFAULT_MODE_LABELS[mode]} isn't the default for your organization \xB7 Shift+Tab to switch`;
}
//@ chunk-kswt4qha.js:9310-9423 layout
function orgPolicyNotLoadedNotice(levelPickHeldForPendingVerdict) {
  return `${ORG_DEFAULT_MODE_LABELS[levelPickHeldForPendingVerdict]} didn't start: your organization's policy hasn't loaded \xB7 Shift+Tab to switch`;
}
//@ chunk-kswt4qha.js:9423-9497 layout
/**
 * 主动性档位对应模式与当前不同时，返回 HIPAA 策略结论（taint/pending），否则 undefined。
 */
function getProactivityPolicyVerdict(proactivityLevel, mode, baselineMode) {
  let floor = proactivityModeFloor(proactivityLevel, mode);
  if (floor === undefined || floor === baselineMode) return;
  return getHipaaPolicyVerdict();
}
//@ chunk-kswt4qha.js:9497-9622 layout
/**
 * HIPAA 策略结论：已知 HIPAA 或曾见到不可得的 HIPAA 状态时为 taint，策略待定时为 pending。
 */
function getHipaaPolicyVerdict() {
  let verdict = autoDefaultVerdictState();
  if (hasComplianceTaint("hipaa") || verdict === "unobtainable_seen_hipaa") return "taint";
  return verdict === "pending" ? "pending" : undefined;
}
//@ chunk-kswt4qha.js:9622-9776 layout
/**
 * 启动参数解析：取 CLI 或 settings 的 fallbackModel 列表并规范化（与权限无关，属模型/启动选项解析）。
 */
function resolveFallbackModels(inputs) {
  let rawFallbacks =
    inputs.cli.fallbackModel ??
    (Array.isArray(inputs.settings.fallbackModel) ? inputs.settings.fallbackModel : undefined);
  if (rawFallbacks === undefined) return;
  return parseToolListFromCLI(rawFallbacks, isModelAllowed);
}
//@ chunk-kswt4qha.js:9776-9851 file-local
/**
 * 把逗号分隔字符串拆成去空白的非空项列表。
 */
function splitCommaList(baseTools) {
  return baseTools
    .split(",")
    .map((entry) => entry.trim())
    .filter((trimmed) => trimmed !== "");
}
//@ chunk-kswt4qha.js:9851-10130 file-local
function parseToolListFromCLI(baseTools, isModelAllowed) {
  let entries = typeof baseTools === "string" ? splitCommaList(baseTools) : baseTools;
  let seen = new Set();
  let result = [];
  for (let toolString of entries) {
    let rawEntry = typeof toolString === "string" ? toolString.trim() : "";
    if (rawEntry === "") continue;
    let userSpecifiedModel = parseUserSpecifiedModel(
      rawEntry === "default" ? getDefaultMainLoopModel() : rawEntry,
    );
    if (seen.has(userSpecifiedModel)) continue;
    if (!isModelAllowed(userSpecifiedModel)) continue;
    seen.add(userSpecifiedModel);
    result.push(userSpecifiedModel);
    if (result.length === MAX_BODY_PARAM_STRINGS) break;
  }
  return result.length > 0 ? result : undefined;
}
//@ chunk-kswt4qha.js:10130-10139 layout
var MAX_BODY_PARAM_STRINGS = 3;
//@ chunk-kswt4qha.js:10139-10409 layout (2.1.88 match: settingSourceToConfigChangeSource, 0.89)
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
function isUserConfiguredSource(source) {
  switch (source) {
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
        (config) =>
          config.lastSeenOrgDefaultUpdatedAt === orgUpdatedAt
            ? config
            : {
                ...config,
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
      (config) =>
        config.lastSeenOrgDefaultUpdatedAt === orgDefault.updated_at
          ? config
          : {
              ...config,
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
    ).then((writeResult) => {
      if (!writeResult.error) markSeen();
    });
    if (modelSource === "userSettings") return;
  } else if (shouldMarkSeen) markSeen();
  return model;
}
//@ chunk-kswt4qha.js:11612-12575 layout
/**
 * 启动时解析主模型：CLI --model（default 取默认模型）> agent frontmatter 的 model > env ANTHROPIC_MODEL > settings.model，并记录来源；随后校验模型可用性（与权限无关，属模型解析）。
 */
function resolveStartupModel(inputs, storage) {
  let { cli, env, settings, agentFrontmatter } = inputs;
  let parsedCliModel = cli.model === "default" ? getDefaultMainLoopModel() : cli.model;
  let rawModelRequest = parsedCliModel;
  let settingLayer = null;
  if (parsedCliModel) settingLayer = cli.model === "default" ? "cli_default" : "cli";
  let model = agentFrontmatter?.model;
  let agentModelLiteral;
  if (!parsedCliModel && model && model !== "inherit") {
    agentModelLiteral = model;
    parsedCliModel = parseUserSpecifiedModel(model);
    rawModelRequest = model;
    settingLayer = agentFrontmatter?.modelSource === "routine" ? "routine_frontmatter" : "agent_frontmatter";
  }
  let isRestrictedPath = false;
  let modelWithoutStartupOverride;
  let candidateModel = parsedCliModel;
  if (candidateModel === undefined) {
    if (env.ANTHROPIC_MODEL) {
      candidateModel = env.ANTHROPIC_MODEL;
      settingLayer = "env";
    } else {
      candidateModel =
        applyOrgModelDefault(settings.model || undefined, cli.isNonInteractiveSession === true, storage) ||
        undefined;
      if (candidateModel !== undefined)
        settingLayer = settingSourceToConfigChangeSource(getEffectiveSettingSource_2("model"));
    }
    rawModelRequest = candidateModel;
  }
  let restrictedModel;
  if (candidateModel && !isModelAllowed(candidateModel)) {
    let requestedLiteral =
      agentModelLiteral !== undefined && !isRestrictedPath ? agentModelLiteral : candidateModel;
    let steppedDownModel = isRestrictedPath ? null : stepDownRestrictedFamilyAliasPick(requestedLiteral);
    if (steppedDownModel !== null) {
      restrictedModel = requestedLiteral;
      candidateModel = steppedDownModel;
      if (parsedCliModel !== undefined) parsedCliModel = steppedDownModel;
    } else {
      if (
        !(
          requestedLiteral.trim().toLowerCase() === "default" || isWindowSilentDefaultPick(requestedLiteral)
        ) &&
        !isRestrictedPath
      )
        restrictedModel = requestedLiteral;
      candidateModel = undefined;
      rawModelRequest = undefined;
      settingLayer = null;
      parsedCliModel = undefined;
    }
  }
  let unservedModelSpelling;
  if (
    candidateModel &&
    isUnservedModelSpelling(candidateModel, isUserConfiguredSource(settingLayer) ? "persisted" : "explicit")
  ) {
    unservedModelSpelling = candidateModel;
    candidateModel = undefined;
    rawModelRequest = undefined;
    settingLayer = null;
    parsedCliModel = undefined;
  }
  let initialModel = candidateModel || null;
  let resolvedInitialModel = parseUserSpecifiedModel(initialModel ?? getDefaultMainLoopModel());
  return {
    effectiveModel: parsedCliModel,
    initialMainLoopModel: initialModel,
    resolvedInitialModel,
    rawModelRequest: rawModelRequest || null,
    restrictedModel,
    unservedModelSpelling,
    settingLayer,
    modelWithoutStartupOverride,
  };
}
//@ chunk-kswt4qha.js:12575-12719 layout
/**
 * 启动参数解析：取 CLI 的 systemPrompt 与 appendSystemPrompt，并把额外的附加系统提示拼到 append 之后。
 */
function resolveSystemPromptOptions(inputs) {
  let systemPrompt = inputs.cli.systemPrompt;
  let appendSystemPrompt = inputs.cli.appendSystemPrompt;
  let remoteAppend = remoteAppendSystemPrompt();
  if (remoteAppend)
    appendSystemPrompt = appendSystemPrompt
      ? `${appendSystemPrompt}

${remoteAppend}`
      : remoteAppend;
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
var orderedSettingSources; // deferred: uses SETTING_SOURCES (../settings/constants.js) of its import cycle while loading; runs once the cycle is complete
var REVERSED_SETTING_SOURCES;
deferInit("chunk-kswt4qha.js:12797", () => {
  orderedSettingSources = SETTING_SOURCES.filter(
    (source) => !REPO_DIR_SETTING_SOURCES.has(source),
  ).toReversed();
  REVERSED_SETTING_SOURCES = ["acceptEdits", "plan", "default", "auto"];
});
//@ chunk-kswt4qha.js:12887-12923 layout
function isRemoteSupportedMode(mode) {
  return REVERSED_SETTING_SOURCES.includes(mode);
}
//@ chunk-kswt4qha.js:12923-12957 layout
function enabledSettingSourcesReversed() {
  return orderedSettingSources.filter(isSettingSourceEnabled);
}
//@ chunk-kswt4qha.js:12957-13029 layout
function isDefaultModeSetByTrustedSource(parsedMode) {
  return enabledSettingSourcesReversed().some(
    (source) => getSettingsForSource(source)?.permissions?.defaultMode === parsedMode,
  );
}
//@ chunk-kswt4qha.js:13029-13124 layout (2.1.88 match: isAutoModeDisabledBySettings, 1)
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
      .map((source) => normalizePermissionModeAlias(getSettingsForSource(source)?.permissions?.defaultMode))
      .find((mode) => mode != null) === "plan" &&
    normalizePermissionModeAlias(settings.permissions?.defaultMode) !== "plan"
  );
}
//@ chunk-kswt4qha.js:13300-13739 layout
/**
 * 找出最后一个设置了 defaultMode 的设置层（auto 来自不可信层除外）；层不可读时返回 settings_unreadable，非 auto 默认返回 stored_default，否则 undefined。
 */
function getStoredDefaultModeBar() {
  let last = SETTING_SOURCES.filter(isSettingSourceEnabled)
    .map((source) => ({
      source,
      mode: (
        source === "policySettings"
          ? getFatalAdminPolicyLoadErrors().length > 0 ||
            getPolicySettingsLoadErrors().some((error) => error.userWritable === true && error.path === "") ||
            (getParentManagedSettingsInvalid() && parentManagedTierParticipates()) ||
            (getEligibilityMemo() !== false && !getRemoteManagedSettingsSyncFromCache())
          : getSettingsParseErrorsForSource(source).some((error) => error.severity !== "warning")
      )
        ? "unreadable"
        : getSettingsForSource(source)?.permissions?.defaultMode,
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
  let hasTypedLevel = typedLevel !== undefined && typedLevel !== "default";
  return {
    autoSeedable: canSeedAutoMode(settings) && !scrubbed,
    storedDefaultBar: getStoredDefaultModeBar(),
    otherChoiceTyped: hasTypedLevel || (carriedMode !== undefined && carriedMode !== "auto"),
    carriedPlanHolds: carriedMode === "plan" && !hasTypedLevel,
    trustedPlanDisplaced: isTrustedPlanDisplaced(settings),
  };
}
//@ chunk-kswt4qha.js:13993-14132 fingerprint (2.1.88 match: isDefaultPermissionModeAuto, 1)
function getSettingsDefaultMode(settings) {
  let mode = normalizePermissionModeAlias(settings.permissions?.defaultMode);
  if (mode == null || !isRemoteSupportedMode(mode)) return;
  if (mode !== "auto") return mode;
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
  let untyped = !permissionModeTyped && !dangerouslySkipPermissions && !scrubbed;
  let settingsDefault = untyped ? getSettingsDefaultMode(settings) : undefined;
  return {
    considered: gateOn && untyped,
    settingsDefaultModePresent: settings.permissions?.defaultMode != null,
    settingsDefault,
    permissionMode: gateOn ? settingsDefault : undefined,
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
  let why =
    parseModeOrUndefined(settingsMode) === "auto"
      ? "auto mode could not be requested from this machine (it is off here, or only the repository asked for it)"
      : "not a mode a cloud session can start in";
  return {
    text: `Settings kept on this machine: the default permission mode in your settings (${settingsMode}) \u2014 ${why}${startsIn !== undefined ? `; the session starts in ${startsIn} mode` : ""}`,
    level: "info",
  };
}
//@ chunk-kswt4qha.js:15121-15166 placement
function parseModeOrUndefined(mode) {
  return mode === undefined ? undefined : parsePermissionMode(mode);
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
function isUnconsentedBgBypass(mode) {
  if (!isBgSession()) return false;
  if (mode === "bypassPermissions")
    return !hasVouchedSkipDangerousModePermissionPrompt() && !getGlobalConfig().bypassPermissionsModeAccepted;
  return false;
}
//@ chunk-kswt4qha.js:15775-15913 placement
function parseStartupPermissionMode(mode, killswitchActive, message) {
  let parsedMode = permissionModeFromString(mode);
  if (isUnconsentedBgBypass(parsedMode))
    return {
      mode: "default",
      unconsented: true,
    };
  if (parsedMode === "auto" && killswitchActive) {
    logForDebugging(message, {
      level: "warn",
    });
    return;
  }
  return {
    mode: parsedMode,
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
function sameEffort(modelA, modelB) {
  return (
    strippedCanonicalName(parseUserSpecifiedModel(modelA)) ===
    strippedCanonicalName(parseUserSpecifiedModel(modelB))
  );
}
//@ chunk-kswt4qha.js:16039-16069 placement
var TENGU_LOGGIA_PASSAGE = "tengu_loggia_passage";
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
  let effortLevel = refusedEffort.carry ?? carriedEffortForModel(loopOverride, loopEffort);
  return {
    latchEffort: undefined,
    loopEffort:
      effortLevel === undefined
        ? undefined
        : {
            model: fallbackModel,
            level: effortLevel,
          },
  };
}
//@ chunk-kswt4qha.js:16843-17031 placement
function getCarriedRefusalEffort(model) {
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
      sameEffort(model, refusalFallbackModelLatch.fallbackModel)
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
function resolveLoopEffort({ loopEffort, continuesMainConversation }, model) {
  if (loopEffort !== undefined) return isEffortCarryDisabled() ? null : loopEffort;
  return (continuesMainConversation ? getCarriedRefusalEffort(model) : undefined) ?? null;
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
//@ chunk-kswt4qha.js:17711-17736 placement
/**
 * 恒为 false（构建时裁掉的特殊 effort 关键字检查）。
 */
function isReservedEffortKeyword(keyword) {
  return false;
}
//@ chunk-9rkt9tdt.js:227-374 fingerprint (2.1.88 match: isBypassPermissionsModeDisabled, 0.752)
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
//@ chunk-sfy7bm1n.js:6520-6553 placement
var clearedSeenSet; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-sfy7bm1n.js:6520", () => {
  clearedSeenSet = identity(new Set(), (seen) => seen.clear());
});
//@ chunk-sfy7bm1n.js:6553-6971 placement
function warnMcpRuleMismatch(ruleValue, tool) {
  let toolName = ruleValue.toolName;
  if (clearedSeenSet.has(toolName)) return;
  clearedSeenSet.add(toolName);
  logForDebugging(
    tool.mcpInfo
      ? `Allow rule "${toolName}" does not allow the tools named "${getMcpPrefix_2(tool.mcpInfo.serverName)}<tool>": they belong to another MCP server than the rule names. To allow them, use "${getMcpPrefix_2(tool.mcpInfo.serverName)}*".`
      : `Allow rule "${toolName}" does not allow "${tool.name}": the name reads as more than one MCP server's. To allow it, use the tool's full name.`,
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
var mcpToolAliasSetSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-sfy7bm1n.js:7035", () => {
  mcpToolAliasSetSlot = new HostScoped(() => new Set());
});
//@ chunk-sfy7bm1n.js:7061-7111 placement
function addMcpToolAlias(serverName, toolNames) {
  for (let toolName of toolNames) mcpToolAliasSet().add(buildMcpToolName(serverName, toolName));
}
//@ chunk-sfy7bm1n.js:7111-7221 placement (2.1.88 match: getMcpPrefix, 1)
function getMcpPrefix(serverName) {
  if (!serverName.startsWith("mcp__")) return false;
  for (let alias of mcpToolAliasSet())
    if (
      serverName === alias ||
      mcpRuleMatchesToolAny(serverName, {
        name: alias,
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
function isDangerousBashPermission(toolName, ruleContent) {
  if (toolName !== BASH_TOOL_NAME) return false;
  if (ruleContent === undefined || ruleContent === "") return true;
  if (/^[\s*]+$/.test(ruleContent)) return true;
  return matchesDangerousCommandPrefix(ruleContent, DANGEROUS_BASH_RULE_PREFIXES);
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
        let subcommands = DANGEROUS_SUBCOMMANDS[lower_2];
        if (subcommands === "all") return true;
        let filtered = sliced
          .replace(/[\s:*]+$/, "")
          .split(/\s+/)
          .filter(Boolean);
        let wordIndex = 0;
        for (; wordIndex < filtered.length; wordIndex++) {
          let word = filtered[wordIndex];
          if (!word.startsWith("-")) break;
          if (
            !word.includes("=") &&
            wordIndex + 1 < filtered.length &&
            !filtered[wordIndex + 1].startsWith("-")
          )
            wordIndex++;
        }
        let subcommand = filtered[wordIndex];
        if (subcommand === undefined) {
          if ((lower_2 === "curl" || lower_2 === "wget") && filtered.some((word) => word.includes("://")))
            continue;
          return true;
        }
        if (subcommands?.has(subcommand)) return true;
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
//@ chunk-sfy7bm1n.js:8705-9626 facade-exports (2.1.88 match: isDangerousPowerShellPermission, 0.906)
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
function isDangerousTaskPermission(toolName, ruleContent) {
  return canonicalToolName(toolName) === AGENT;
}
//@ chunk-sfy7bm1n.js:9662-9691 layout
function isMonitorTool(toolName) {
  return toolName === MONITOR;
}
//@ chunk-sfy7bm1n.js:9691-9822 layout
class DangerVerdictCache {
  verdicts = new Map();
  lookup(key) {
    return this.verdicts.get(key);
  }
  remember(key, verdict) {
    this.verdicts.set(key, verdict);
  }
  reset() {
    this.verdicts.clear();
  }
}
//@ chunk-sfy7bm1n.js:9822-9834 layout
var dangerVerdictCache; // deferred: uses DangerVerdictCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-sfy7bm1n.js:9822", () => {
  dangerVerdictCache = new DangerVerdictCache();
});
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
  let cacheKey = `${toolName}\x00${ruleContent ?? ""}`;
  let cached = dangerVerdictCache.lookup(cacheKey);
  if (cached !== undefined) return cached;
  let isDangerous =
    isDangerousBashPermission(toolName, ruleContent) ||
    isDangerousPowerShellPermission(toolName, ruleContent) ||
    isDangerousTaskPermission(toolName, ruleContent) ||
    isMonitorTool(toolName) ||
    toolName === require("../../tools/AppifactReplTool/prompt.js").APPIFACT_REPL_TOOL_NAME;
  dangerVerdictCache.remember(cacheKey, isDangerous);
  return isDangerous;
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
//@ chunk-gz7b768t.js:1257-1346 fingerprint (2.1.88 match: getAutoModeEnabledState, 1)
/**
 * 读取 GrowthBook tengu_auto_mode_config，缺省返回冻结的空配置。
 */
function getAutoModeConfigOrDefault() {
  let config = getFeatureValue_CACHED_MAY_BE_STALE("tengu_auto_mode_config", defaultConfig) ?? defaultConfig;
  if (config !== defaultConfig) return config;
  return isGrowthBookEnabled() ? defaultConfig : CLASSIFIER_FEATURE_DEFAULTS;
}
//@ chunk-zfbhezv9.js:2071-2094 placement
var permissionModeSignalSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-zfbhezv9.js:2071", () => {
  permissionModeSignalSlot = new HostScoped(() => createSignal());
});
//@ chunk-zfbhezv9.js:2094-2131 placement
function hostPermissionModeSignal() {
  return permissionModeSignalSlot.of(getRootSession().host);
}
//@ chunk-zfbhezv9.js:2131-2145 placement
/**
 * permissionModeSignal：权限模式变化的惰性信号。
 */
var permissionModeSignal; // deferred: uses hostPermissionModeSignal of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-zfbhezv9.js:2131", () => {
  permissionModeSignal = createLazySignal(hostPermissionModeSignal);
});
//@ chunk-zfbhezv9.js:2145-2164 layout
var BASE_TOOLS_PRESETS = ["default"];
//@ chunk-zfbhezv9.js:2164-2241 layout
function getBaseToolsPreset(value) {
  let lower = value.toLowerCase();
  if (!BASE_TOOLS_PRESETS.includes(lower)) return null;
  return lower;
}
//@ chunk-zfbhezv9.js:2278-2347 layout
function sha256OfLines(lines) {
  return createHash("sha256")
    .update(
      lines.join(`
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
      let relativePath = cwdOrNull === null ? filePath : relative(cwdOrNull, filePath);
      return relativePath.length < filePath.length ? relativePath : filePath;
    }
  }
  return source;
}
//@ chunk-zfbhezv9.js:2469-3011 facade-exports (2.1.88 match: findDangerousClassifierPermissions, 1)
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
    let ruleValue = permissionRuleValueFromString(toolSpec);
    if (isDangerousClassifierPermission(ruleValue.toolName, ruleValue.ruleContent))
      dangerous.push({
        ruleValue,
        source: "cliArg",
        ruleDisplay: ruleValue.ruleContent
          ? `${ruleValue.toolName}(${ruleValue.ruleContent})`
          : `${ruleValue.toolName}(*)`,
        sourceDisplay: "--allowed-tools",
      });
  }
  return dangerous;
}
//@ chunk-zfbhezv9.js:3011-3100 facade-exports
/**
 * bypass 相关提示常量：后台会话未同意 bypass 能力的通知、--allow-dangerously-skip-permissions 被忽略的警告；ALL_DANGEROUS_COMMAND_PREFIXES 合并 Bash 危险前缀与其他两张表。
 */
var BG_UNCONSENTED_BYPASS_CAPABILITY_NOTICE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ALL_DANGEROUS_COMMAND_PREFIXES;
deferInit("chunk-zfbhezv9.js:3011", () => {
  BG_UNCONSENTED_BYPASS_CAPABILITY_NOTICE = `--allow-dangerously-skip-permissions ignored: ${BYPASS_CONSENT_MESSAGE_2}`;
  ALL_DANGEROUS_COMMAND_PREFIXES = [
    ...DANGEROUS_BASH_PATTERNS,
    ...NETWORK_COMMAND_PREFIXES,
    ...CLUSTER_COMMAND_PREFIXES,
  ];
});
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
function isOverlyBroadBashAllowRule(ruleValue, matchDangerousPrefix = false) {
  {
    let { APPIFACT_REPL_TOOL_NAME } = require("../../tools/AppifactReplTool/prompt.js");
    if (ruleValue.toolName === APPIFACT_REPL_TOOL_NAME) return isBareOrStarContent(ruleValue.ruleContent);
  }
  if (ruleValue.toolName !== BASH_TOOL_NAME) return false;
  let ruleContent = ruleValue.ruleContent;
  if (ruleContent === undefined || isBareOrStarContent(ruleContent) || isAntOnlyDangerousContent(ruleContent))
    return true;
  return matchDangerousPrefix && matchesDangerousCommandPrefix(ruleContent, ALL_DANGEROUS_COMMAND_PREFIXES);
}
//@ chunk-zfbhezv9.js:3584-3646 layout
function isBareBashRule(ruleValue) {
  return ruleValue.toolName === BASH_TOOL_NAME && ruleValue.ruleContent === undefined;
}
//@ chunk-zfbhezv9.js:3646-3703 facade-exports (2.1.88 match: isOverlyBroadBashAllowRule, 1)
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
//@ chunk-zfbhezv9.js:3937-4423 facade-exports (2.1.88 match: findDangerousClassifierPermissions, 1)
function findOverlyBroadBashPermissions(rules, cliAllowedTools, matchDangerousPrefix = false) {
  let dangerous = [];
  for (let rule of rules)
    if (rule.ruleBehavior === "allow" && isOverlyBroadBashAllowRule(rule.ruleValue, matchDangerousPrefix))
      dangerous.push({
        ruleValue: rule.ruleValue,
        source: rule.source,
        ruleDisplay: rule.ruleValue.ruleContent
          ? `${rule.ruleValue.toolName}(${rule.ruleValue.ruleContent})`
          : `${rule.ruleValue.toolName}(*)`,
        sourceDisplay: formatPermissionSource(rule.source),
      });
  for (let toolSpec of cliAllowedTools) {
    let ruleValue = permissionRuleValueFromString(toolSpec);
    if (isOverlyBroadBashAllowRule(ruleValue, matchDangerousPrefix))
      dangerous.push({
        ruleValue,
        source: "cliArg",
        ruleDisplay: ruleValue.ruleContent
          ? `${ruleValue.toolName}(${ruleValue.ruleContent})`
          : `${ruleValue.toolName}(*)`,
        sourceDisplay: "--allowed-tools",
      });
  }
  return dangerous;
}
//@ chunk-zfbhezv9.js:4423-4748 facade-exports (2.1.88 match: findOverlyBroadBashPermissions, 1)
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
function overlyBroadShellAllowsStrippedByEverySession(context) {
  return [];
}
//@ chunk-zfbhezv9.js:4773-4839 layout
function isRemovableRuleSource(source) {
  return EDITABLE_SETTING_SOURCES.includes(source) || source === "session" || source === "cliArg";
}
//@ chunk-zfbhezv9.js:4839-5085 facade-exports (2.1.88 match: removeDangerousPermissions, 1)
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
//@ chunk-zfbhezv9.js:5085-5574 facade-exports (2.1.88 match: stripDangerousPermissionsForAutoMode, 0.965)
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
    let ruleString = formatPermissionRule(perm.ruleValue);
    let strippedForSource = (stripped[perm.source] ??= []);
    if (!strippedForSource.includes(ruleString)) strippedForSource.push(ruleString);
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
function withToolAliases(toolPermissionContext, toolAliases, sdkServerNames = []) {
  let nextContext = {
    ...toolPermissionContext,
    toolAliases,
  };
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_sorted_zebra", false)) return nextContext;
  for (let [key, value] of Object.entries(toolAliases ?? {})) {
    if (key.startsWith("mcp__") || !isDangerousClassifierPermission(key, undefined)) continue;
    let mcpInfo = typeof value === "string" ? mcpInfoFromString(value) : null;
    if (mcpInfo?.toolName) {
      addMcpToolAlias(mcpInfo.serverName, [mcpInfo.toolName]);
      logFeatureOk("auto_mode_tool_alias");
      continue;
    }
    let isSdkAlias =
      env.CLAUDE_AGENT_SDK_MCP_NO_PREFIX && typeof value === "string" && value !== "" && mcpInfo === null;
    if (isSdkAlias && sdkServerNames.length > 0) {
      for (let serverName of sdkServerNames) addMcpToolAlias(serverName, [value]);
      logFeatureOk("auto_mode_tool_alias");
      continue;
    }
    logFeatureSad("auto_mode_tool_alias", isSdkAlias ? "no_sdk_server" : "target_not_mcp_tool");
    logForDebugging(
      `Auto mode: toolAliases maps ${key} to ${typeof value === "string" ? value : `a value of type ${typeof value}`}, ${isSdkAlias ? "and no SDK MCP server is registered that could hold it" : "which is not of the form mcp__<server>__<tool>"}, so an allow rule for that tool still runs its calls without the classifier's check`,
      {
        level: "warn",
      },
    );
  }
  return withRulesSetAsideAgain(nextContext);
}
//@ chunk-zfbhezv9.js:6415-7160 facade-exports
/**
 * 登记 SDK 宿主声明的会运行代码的 MCP 工具（codeRunningMcpTools：服务器名 → 工具名列表），畸形项计数并告警；返回规范化后的映射。
 */
function declareSdkHostCodeRunningMcpTools(codeRunningMcpTools) {
  let declaration = isPlainObject(codeRunningMcpTools);
  let toolsByServer = new Map();
  let malformedCount = declaration ? 0 : 1;
  for (let [serverName, toolNames] of declaration ? Object.entries(codeRunningMcpTools) : []) {
    if (serverName === "" || serverName.startsWith("mcp__") || !Array.isArray(toolNames)) {
      malformedCount++;
      continue;
    }
    for (let toolName of toolNames)
      if (typeof toolName === "string" && toolName !== "" && !toolName.startsWith("mcp__")) {
        addMcpToolAlias(serverName, [toolName]);
        let names = toolsByServer.get(serverName) ?? [];
        if (!names.includes(toolName)) names.push(toolName);
        toolsByServer.set(serverName, names);
      } else malformedCount++;
  }
  if (toolsByServer.size > 0) logFeatureOk("auto_mode_code_running_mcp_tools");
  if (malformedCount > 0) {
    logFeatureSad("auto_mode_code_running_mcp_tools", "malformed_entry");
    logForDebugging(
      `Auto mode: ignored ${malformedCount} malformed ${malformedCount === 1 ? "part" : "parts"} of codeRunningMcpTools, which should map each MCP server name to a list of tool names, e.g. {"workspace": ["bash"]}. In auto mode, allow rules and hooks can still approve calls to the tools meant there without the classifier.`,
      {
        level: "warn",
      },
    );
  }
  return Object.fromEntries(toolsByServer);
}
//@ chunk-zfbhezv9.js:7160-7225 facade-exports (2.1.88 match: _temp3, 0.739)
/**
 * 上下文已处于“剥离过危险规则”状态时，重新执行剥离（新规则加入后保持剥离）。
 */
function withRulesSetAsideAgain(state_1) {
  return state_1.strippedDangerousRules === undefined
    ? state_1
    : stripDangerousPermissionsForAutoMode(state_1);
}
//@ chunk-zfbhezv9.js:7225-7549 facade-exports (2.1.88 match: restoreDangerousPermissions, 0.868)
/**
 * 退出 auto 时把 strippedDangerousRules 里的规则加回（command 来源过滤掉 cBo 命中的项），并清空暂存。
 */
function restoreDangerousPermissions(context) {
  let stash = context.strippedDangerousRules;
  if (!stash) return context;
  let result = context;
  for (let [key, value] of Object.entries(stash)) {
    if (!value || value.length === 0) continue;
    let rules =
      key === "command" ? value.filter((ruleString) => !isCertifiedCommandRule(ruleString)) : [...value];
    if (rules.length === 0) continue;
    result = applyValidatedPermissionUpdate(result, {
      type: "addRules",
      rules: rules.map(permissionRuleValueFromString),
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
function intersectWithCurrentRules(stripped, toolPermissionContext) {
  let reduced = Object.keys(stripped).reduce(
    (acc, key) => {
      let stashRules = toolPermissionContext.strippedDangerousRules?.[key] ?? [];
      let current = new Set([
        ...(toolPermissionContext.alwaysAllowRules[key] ?? []),
        ...(key === "command"
          ? stashRules.filter((ruleString) => !isCertifiedCommandRule(ruleString))
          : stashRules),
      ]);
      let rules = stripped[key] ?? [];
      let filtered = rules.filter((ruleString) => current.has(ruleString));
      acc.rules[key] = filtered;
      acc.dropped ||= filtered.length !== rules.length;
      return acc;
    },
    {
      rules: {},
      dropped: false,
    },
  );
  return reduced.dropped ? reduced.rules : stripped;
}
//@ chunk-zfbhezv9.js:8135-8678 facade-exports (2.1.88 match: transitionPermissionMode, 0.699)
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
//@ chunk-zfbhezv9.js:8851-9453 facade-exports (2.1.88 match: handleSetPermissionMode, 0.455)
/**
 * 设置权限模式前的守卫：模式名非法、bypass 在 --restricted 下、被设置禁用或会话未以 --dangerously-skip-permissions 启动、auto 不可用时返回 {ok:false, error, code}。
 */
function guardPermissionModeChange(modeValue, toolPermissionContext) {
  let permissionMode = parsePermissionMode(modeValue);
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
function setPermissionModeWithGuards(requestedMode, toolPermissionContext, setAppState, options) {
  let guard = guardPermissionModeChange(requestedMode, toolPermissionContext);
  if (!guard.ok) return guard;
  let mode = guard.mode;
  let rejection;
  setAppState((state) => {
    if (state.mode === mode) return state;
    if (state !== toolPermissionContext) {
      let innerGuard = guardPermissionModeChange(mode, state);
      if (!innerGuard.ok) {
        rejection = innerGuard;
        return state;
      }
    }
    return {
      ...transitionPermissionMode(state.mode, mode, state, options),
      mode,
    };
  });
  if (rejection !== undefined) return rejection;
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
function applyPermissionModeRevertEffects(toolPermissionContext, snapshot) {
  let mode = snapshot.context.mode;
  if (!guardPermissionModeChange(mode, toolPermissionContext).ok) return snapshot.context;
  transitionPermissionMode(toolPermissionContext.mode, mode, toolPermissionContext);
  let shouldRunAuto =
    snapshot.autoModeActive &&
    isAutoModeGateEnabled() &&
    (mode === "auto" || (mode === "plan" && shouldPlanUseAutoMode()));
  if (isAutoModeActive() !== shouldRunAuto) {
    setAutoModeActive(shouldRunAuto);
    setNeedsAutoModeExitAttachment(!shouldRunAuto);
  }
  setImmediate(() => {
    permissionModeSignal.emit();
  });
  return snapshot.autoModeActive && !shouldRunAuto
    ? restoreDangerousPermissions(snapshot.context)
    : snapshot.context;
}
//@ chunk-zfbhezv9.js:10128-10626 facade-exports
function splitToolExclusions(entries) {
  let kept = [];
  let excluded = new Set();
  let bare = false;
  let detached = [];
  let scoped = [];
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_tools_exclusion_killswitch",
    false,
  );
  for (let k = 0; k < entries.length; k++) {
    let entry = entries[k];
    if (entry === undefined) continue;
    if (!entry.startsWith(NEGATION_PREFIX)) {
      kept.push(entry);
      continue;
    }
    let sliced = entry.slice(NEGATION_PREFIX.length);
    if (sliced === "") {
      let nextEntry = entries[k + 1];
      if (nextEntry === undefined || nextEntry.startsWith(NEGATION_PREFIX) || nextEntry.startsWith("(")) {
        bare = true;
        continue;
      }
      k++;
      if (!featureValue_CACHED_MAY_BE_STALE) detached.push(nextEntry);
      entry = NEGATION_PREFIX + nextEntry;
      sliced = nextEntry;
    }
    let index = sliced.indexOf("(");
    if (index === 0) {
      bare = true;
      continue;
    }
    if (index > 0) {
      sliced = sliced.slice(0, index);
      if (!featureValue_CACHED_MAY_BE_STALE) scoped.push(entry);
    }
    if (!featureValue_CACHED_MAY_BE_STALE) excluded.add(canonicalToolName(sliced));
  }
  return {
    kept,
    excluded,
    bare,
    detached,
    scoped,
  };
}
//@ chunk-zfbhezv9.js:10626-10885 facade-exports
function parseBaseToolsFromCLI(baseToolsCli, getAllBaseTools) {
  let trimmed = baseToolsCli.join(" ").trim();
  if (getBaseToolsPreset(trimmed)) return defaultPresetToolNames(getAllBaseTools());
  let { kept, excluded } = splitToolExclusions(splitRuleList(baseToolsCli));
  let names = kept.includes("preset:default")
    ? getAllBaseTools()
        .map((tool) => tool.name)
        .concat(kept.filter((name) => name !== "preset:default"))
    : kept;
  if (excluded.size === 0) return names;
  return names.filter((name) => !excluded.has(canonicalToolName(name)));
}
//@ chunk-zfbhezv9.js:10885-10906 layout
var SOFTWARE_DEV_TOOL_NAMES; // deferred: uses GREP_TOOL_NAME (../../tools/GrepTool/prompt.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-zfbhezv9.js:10885", () => {
  SOFTWARE_DEV_TOOL_NAMES = [BASH_TOOL_NAME, POWERSHELL_TOOL_NAME, GLOB_TOOL_NAME, GREP_TOOL_NAME];
});
//@ chunk-zfbhezv9.js:10906-12504 facade-exports
function literalToolsNarrowing({ baseToolsCli, baseToolsIsPreset, parsedBaseTools, getAllBaseTools }) {
  let warnings = [];
  let securityWarningLines = [];
  let baseToolsFromCLI = parseBaseToolsFromCLI(baseToolsCli, getAllBaseTools);
  let keptNames = new Set(baseToolsFromCLI.map(canonicalToolName));
  let tools = getAllBaseTools();
  let presetTools = baseToolsIsPreset ? null : tools;
  let presetNames =
    presetTools === null ? defaultPresetToolNames(tools) : presetTools.map((tool) => tool.name);
  let { excluded } = parsedBaseTools;
  for (let tool of presetTools ?? getAllBaseTools())
    if (tool.familyParentToolName !== undefined && excluded.has(tool.familyParentToolName))
      keptNames.delete(tool.name);
  for (let tool of tools)
    if (tool.familyParentToolName !== undefined && keptNames.has(tool.familyParentToolName))
      keptNames.add(tool.name);
  if (SHELL_TOOL_NAMES.some((shellToolName) => keptNames.has(shellToolName)))
    keptNames.add(GET_TASK_TOOL_TEXT);
  for (let excludedName of excluded) keptNames.delete(excludedName);
  if (excluded.has(BASH_TOOL_NAME))
    for (let helmToolName of toolsRunningCodeAsBash()) keptNames.delete(helmToolName);
  let filtered = presetNames.filter((presetName) => !keptNames.has(presetName));
  for (let excludedName of excluded) {
    if (presetNames.includes(excludedName)) continue;
    if (RETIRED_TOOL_NAMES.has(excludedName)) {
      logForDebugging(`--tools exclusion names a removed tool: ${excludedName}`);
      continue;
    }
    filtered.push(excludedName);
    if (SOFTWARE_DEV_TOOL_NAMES.includes(excludedName)) continue;
    warnings.push(
      `--tools entry "${NEGATION_PREFIX}${excludedName}" matches no built-in tool \u2014 check for typos. An MCP tool with exactly that name is still withheld.`,
    );
    securityWarningLines.push(
      `--tools "${NEGATION_PREFIX}${excludedName}" matches no tool \xB7 check for typos`,
    );
  }
  for (let scopedEntry of parsedBaseTools.scoped)
    warnings.push(
      `--tools entry "${scopedEntry}" names a rule, not a tool; the whole tool is withheld. Write "${NEGATION_PREFIX}${scopedEntry.slice(NEGATION_PREFIX.length, scopedEntry.indexOf("("))}" to say so.`,
    );
  for (let detachedName of parsedBaseTools.detached)
    warnings.push(
      `--tools entry "${NEGATION_PREFIX} ${detachedName}" was read as "${NEGATION_PREFIX}${detachedName}" and ${detachedName} is withheld; write it without the space.`,
    );
  if (parsedBaseTools.bare) {
    warnings.push(
      `--tools has a "${NEGATION_PREFIX}" with no tool name after it; write the name right after it, as in "${NEGATION_PREFIX}Bash".`,
    );
    securityWarningLines.push(
      `--tools has a "${NEGATION_PREFIX}" with no tool name \xB7 write "${NEGATION_PREFIX}Bash"`,
    );
  }
  if (!baseToolsIsPreset) {
    for (let toolName of [
      ...(getPlatform() === "windows" ? [POWERSHELL_TOOL_NAME] : []),
      GLOB_TOOL_NAME,
      GREP_TOOL_NAME,
    ])
      if (!keptNames.has(toolName) && !filtered.includes(toolName)) filtered.push(toolName);
  }
  return {
    toolsToDisallow: filtered,
    toolsKept: baseToolsIsPreset || parsedBaseTools.kept.includes("preset:default") ? undefined : keptNames,
    warnings,
    securityWarnings: securityWarningLines,
  };
}
//@ chunk-zfbhezv9.js:12504-12611 fingerprint (2.1.88 match: isSymlinkTo, 1)
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
  let cliMode = normalizePermissionModeAlias(permissionModeCli);
  let inheritMode = normalizePermissionModeAlias(inheritPermissionModeCli);
  let relaunchBaselineMode = takeRelaunchBaselineMode(
    Boolean(dangerouslySkipPermissions || allowDangerouslySkipPermissions),
  );
  let proactivityDecided = takeProactivityDecided();
  if (isScrubEnabled()) {
    let hadRequestedMode =
      dangerouslySkipPermissions ||
      (cliMode && cliMode !== "default") ||
      (inheritMode && inheritMode !== "default") ||
      (agentPermissionMode && agentPermissionMode !== "default");
    let scrubNotice =
      "Permission mode forced to default \u2014 CLAUDE_CODE_SUBPROCESS_ENV_SCRUB is set " +
      "(allowed_non_write_users hardening). Declare allowedTools explicitly, or set CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=0 to opt out.";
    if (hadRequestedMode)
      process.stderr.write(`\u26A0 ${scrubNotice}
`);
    return {
      mode: "default",
      notification: hadRequestedMode ? scrubNotice : undefined,
      modeSuppliedOnInvocation: true,
    };
  }
  let inputs = {
    cli: {
      permissionMode:
        proactivityDecided === true &&
        proactivityLevel !== undefined &&
        cliMode !== undefined &&
        getProactivityPolicyVerdict(proactivityLevel, cliMode, undefined) !== undefined
          ? undefined
          : cliMode,
      inheritPermissionMode: inheritMode,
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
    proactivityLevel: proactivityDecided === false ? undefined : proactivityLevel,
  };
  let resolved = initialPermissionModeFromCLI_2(inputs);
  setAutoModeFromFallback(resolved.fromAutoFallback);
  setAutoStartWithheldForHipaaTaint(resolved.autoStartWithheldForHipaaTaint);
  let awaitsGrowthBook = !getIsNonInteractiveSession() && isGrowthBookCacheEmpty();
  let autoDefaultWithheldForPendingVerdict = resolved.autoDefaultWithheldForPendingVerdict;
  setProvisionalStartupMode(
    !resolved.modeSuppliedOnInvocation && (awaitsGrowthBook || autoDefaultWithheldForPendingVerdict)
      ? {
          mode: resolved.mode,
          inputs,
          awaitsGrowthBook,
          awaitsPolicyVerdict: autoDefaultWithheldForPendingVerdict,
        }
      : undefined,
  );
  let proactivity;
  {
    let decidedByLevel =
      resolved.decidedByProactivityLevel || (proactivityDecided === true && proactivityLevel !== undefined);
    proactivity = {
      proactivityBaseline: {
        mode: relaunchBaselineMode ?? resolved.baselineMode,
        fromRelaunchHandoff: relaunchBaselineMode !== undefined,
      },
      startupModeDecidedByProactivityLevel: decidedByLevel ? proactivityLevel : undefined,
    };
  }
  if (resolved.mode === "auto") setAutoModeActive(true);
  return {
    mode: resolved.mode,
    notification: resolved.notification,
    proactivity,
    modeSuppliedOnInvocation: resolved.modeSuppliedOnInvocation,
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
function withWriteBlockOn(context) {
  return {
    ...context,
    blockWritesOutsideWorkingDirectories: true,
    alwaysDenyRules: {
      ...context.alwaysDenyRules,
      toolsNarrowing: uniq([
        ...(context.alwaysDenyRules.toolsNarrowing ?? []),
        ENTER_WORKTREE_TOOL_NAME,
        EXIT_WORKTREE_TOOL_NAME,
      ]),
    },
  };
}
//@ chunk-zfbhezv9.js:14683-19645 facade-exports (2.1.88 match: initializeToolPermissionContext, 0.485)
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
  let warnings = [];
  let securityWarnings = [];
  let unusedNull = null;
  let wantsBypass = permissionMode === "bypassPermissions" || allowDangerouslySkipPermissions;
  let cliAllowedTools = splitRuleList(allowedToolsCli)
    .map((ruleString) => formatPermissionRule(permissionRuleValueFromString(ruleString)))
    .filter((rule) => {
      let parsedDisallowedToolsCli = validateWildcardToolName(permissionRuleValueFromString(rule).toolName);
      if (parsedDisallowedToolsCli) {
        warnings.push(
          `Ignoring --allowedTools rule "${rule}": ${parsedDisallowedToolsCli.error}. ${parsedDisallowedToolsCli.suggestion}.`,
        );
        return false;
      }
      return true;
    });
  let baseToolsResult = uniq([...splitRuleList(disallowedToolsCli), ...antBuiltinDenyRules()]);
  let isBaseToolsPreset =
    !!baseToolsCli && baseToolsCli.length > 0 && getBaseToolsPreset(baseToolsCli.join(" ").trim()) !== null;
  let parsedBaseTools =
    baseToolsCli && !isBaseToolsPreset
      ? splitToolExclusions(splitRuleList(baseToolsCli))
      : {
          kept: [],
          excluded: new Set(),
          bare: false,
          detached: [],
          scoped: [],
        };
  let toolsToDisallow = parsedBaseTools.kept
    .map(canonicalToolName)
    .filter((tool) => !parsedBaseTools.excluded.has(tool));
  let disablesAllBuiltins = !!baseToolsCli?.length && !isBaseToolsPreset && toolsToDisallow.length === 0;
  let isToolNamed = (toolName) =>
    toolsToDisallow.includes(toolName) ||
    cliAllowedTools.some((ruleString) => permissionRuleValueFromString(ruleString).toolName === toolName);
  setSearchToolsOptIn([GLOB_TOOL_NAME, GREP_TOOL_NAME].some(isToolNamed));
  setTodoToolsOptIn(TODO_TOOL_NAMES.some(isToolNamed));
  let launchDisallowedTools = [];
  let toolsOmittedByLaunchList = [];
  let toolsKeptByLaunchList;
  let additionalWorkingDirectories = new Set();
  if (baseToolsCli && baseToolsCli.length > 0) {
    let narrowing = literalToolsNarrowing({
      baseToolsCli,
      baseToolsIsPreset: isBaseToolsPreset,
      parsedBaseTools,
      getAllBaseTools,
    });
    warnings.push(...narrowing.warnings);
    securityWarnings.push(
      ...narrowing.securityWarnings.map((text) => ({
        text,
      })),
    );
    launchDisallowedTools = narrowing.toolsToDisallow;
    toolsOmittedByLaunchList = disablesAllBuiltins ? [] : narrowing.toolsToDisallow;
    toolsKeptByLaunchList = narrowing.toolsKept;
  }
  if (restricted) {
    let codeExecutionTools = isCodeExecutionTool(
      codeExecutionToolNames(getAllBaseTools()),
      presetExclusions(toolsToDisallow),
    );
    for (let toolName of codeExecutionTools) additionalWorkingDirectories.add(toolName);
    launchDisallowedTools = uniq([...launchDisallowedTools, ...codeExecutionTools]);
  }
  setToolsOmittedByLaunchList(
    toolsOmittedByLaunchList.filter((toolName) => !additionalWorkingDirectories.has(toolName)),
  );
  let dirs = new Map();
  let processPwd = env.PWD;
  let originalCwd = processPwd ? getOriginalCwdOrNull() : null;
  if (
    processPwd &&
    originalCwd !== null &&
    processPwd !== originalCwd &&
    isSymlinkTo({
      originalCwd,
      processPwd,
    })
  )
    dirs.set(processPwd, {
      path: processPwd,
      source: "session",
    });
  let bypassDisabledBySettings =
    (getSettings_DEPRECATED() || {}).permissions?.disableBypassPermissionsMode === "disable";
  let bgBypassUnconsented =
    allowDangerouslySkipPermissions &&
    permissionMode !== "bypassPermissions" &&
    !bypassDisabledBySettings &&
    !restricted &&
    isUnconsentedBgBypass("bypassPermissions");
  if (bgBypassUnconsented) {
    logEvent("tengu_bg_allow_bypass_unconsented_ignored", {});
    warnings.push(BG_UNCONSENTED_BYPASS_CAPABILITY_NOTICE);
  }
  let isBypassPermissionsModeAvailable =
    (permissionMode === "bypassPermissions" || (allowDangerouslySkipPermissions && !bgBypassUnconsented)) &&
    !bypassDisabledBySettings &&
    !restricted &&
    true;
  let options =
    isStorageV5Enabled() && storageV5 !== undefined && storageV5.hostFiles.serving("workspace") === "host"
      ? {
          strictPersistedTrust: await workspacePersistedTrustThroughBackend(storageV5),
        }
      : {};
  let rules = loadAllPermissionRulesFromDisk(options);
  let mapped = [...baseToolsResult, ...launchDisallowedTools].map(permissionRuleValueFromString);
  let any = mapped.some(isBareBashRule);
  let mentionsBash =
    mapped.some((ruleValue) => ruleValue.toolName === BASH_TOOL_NAME) ||
    rules.some((rule) => rule.ruleBehavior === "deny" && rule.ruleValue.toolName === BASH_TOOL_NAME);
  let mentionsPowerShell =
    env.CLAUDE_CODE_USE_POWERSHELL_TOOL ||
    splitRuleList(baseToolsCli ?? [])
      .map(canonicalToolName)
      .includes(POWERSHELL_TOOL_NAME) ||
    cliAllowedTools.some(
      (ruleString) => permissionRuleValueFromString(ruleString).toolName === POWERSHELL_TOOL_NAME,
    ) ||
    mapped.some((ruleValue) => ruleValue.toolName === POWERSHELL_TOOL_NAME) ||
    rules.some((rule) => rule.ruleValue.toolName === POWERSHELL_TOOL_NAME);
  if (getPlatform() === "windows" && isBashAvailable() && mentionsBash && !mentionsPowerShell) {
    baseToolsResult = [...baseToolsResult, POWERSHELL_TOOL_NAME];
    let filtered = rules.filter((rule) => rule.ruleBehavior === "deny" && isBareBashRule(rule.ruleValue));
    if (
      isPowerShellToolEnabled() &&
      (any || filtered.length > 0) &&
      !filtered.some((denyRule) => denyRule.source === "policySettings")
    )
      warnings.push(
        `Denying ${BASH_TOOL_NAME} also turns off the ${POWERSHELL_TOOL_NAME} tool, so Claude has neither. To use ${POWERSHELL_TOOL_NAME}, set CLAUDE_CODE_USE_POWERSHELL_TOOL=1.`,
      );
  }
  let overlyBroadBashPermissions = [];
  if (!env.CLAUDE_CODE_REMOTE && env.CLAUDE_CODE_ENTRYPOINT !== "local-agent") {
    let broadRules = [
      ...findOverlyBroadBashPermissions(rules, cliAllowedTools, true),
      ...findOverlyBroadPowerShellPermissions(rules, cliAllowedTools),
    ];
    if (broadRules.length > 0) {
      let mapped = broadRules.map((broadRule) => categorizeBroadShellRule(broadRule.ruleValue));
      let yoloEquivEnabled = false;
      let unusedFlag = false;
      logEvent("tengu_ant_overly_broad_bash_detected", {
        count: broadRules.length,
        categories: fromEnumArr(uniq(mapped)),
        yoloEquivEnabled,
        willStrip: overlyBroadBashPermissions.length,
        entrypoint: fromEnumOpt(getEntrypointKind()) ?? lit("other"),
        ...false,
      });
    }
  }
  let dangerousPermissions = [];
  if (permissionMode === "auto")
    dangerousPermissions = findDangerousClassifierPermissions(rules, cliAllowedTools);
  let managedOnly = shouldAllowManagedPermissionRulesOnly();
  let blockExemptPathsInSettings = readBlockExemptPathsInSettings();
  if (managedOnly && cliAllowedTools.length > 0)
    warnings.push(
      `Ignoring --allowedTools ${cliAllowedTools.join(", ")}: permission rules are restricted to managed settings (allowManagedPermissionRulesOnly).`,
    );
  let toolPermissionContext = applyPermissionRulesToPermissionContext(
    {
      mode: permissionMode,
      additionalWorkingDirectories: dirs,
      alwaysAllowRules: {
        cliArg: managedOnly ? [] : cliAllowedTools,
        ...(bgSessionPermissionRules && {
          session: managedOnly ? [] : bgSessionPermissionRules.allow,
        }),
      },
      alwaysDenyRules: {
        cliArg: baseToolsResult,
        ...(bgSessionPermissionRules && {
          session: bgSessionPermissionRules.deny,
        }),
        ...(launchDisallowedTools.length > 0 && {
          toolsNarrowing: launchDisallowedTools,
        }),
      },
      alwaysAskRules: {},
      mcpPermissionModeOverrides: {},
      ...(restricted && {
        restricted,
      }),
      ...(disablesAllBuiltins && {
        builtInToolsDisabled: disablesAllBuiltins,
      }),
      ...(toolsKeptByLaunchList !== undefined && {
        toolsKeptByLaunchList: Object.freeze([...toolsKeptByLaunchList]),
      }),
      ...(isReadBlockOn() && {
        blockReadsOutsideWorkingDirectories: true,
      }),
      ...(blockExemptPathsInSettings.length > 0 && {
        readBlockExemptPaths: blockExemptPathsInSettings,
      }),
      isBypassPermissionsModeAvailable,
      ...((autoGateOn) => ({
        isAutoModeAvailable: autoGateOn,
        canAutoClassifierRun: autoGateOn,
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
  for (let advisory of collectPermissionRuleAdvisories(
    [
      ...getAllowRules(toolPermissionContext),
      ...getDenyRules(toolPermissionContext),
      ...getAskRules(toolPermissionContext),
    ],
    getAllBaseTools,
  )) {
    warnings.push(advisory.line);
    if (advisory.securityWarning !== undefined) securityWarnings.push(advisory.securityWarning);
  }
  let { repoOnly } = additionalDirectoryProvenance((directory) => {
    try {
      return [resolve(expandPath(directory))];
    } catch {
      return [];
    }
  }, storageV5);
  let directoryRequests = [
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
    directoryRequests.map(async ({ dir, destination }) => ({
      destination,
      result: await validateDirectoryForWorkspace(dir, toolPermissionContext),
    })),
  );
  let trustedNetworkDirectories = new Map();
  let inheritedSessionDirectories = [];
  for (let { result, destination } of validationResults)
    if (result.resultType === "success") {
      if (destination === "session") inheritedSessionDirectories.push(result.absolutePath);
      toolPermissionContext = applyValidatedPermissionUpdate(toolPermissionContext, {
        type: "addDirectories",
        directories: [result.absolutePath],
        destination:
          destination === "localSettings" && repoOnly.has(result.absolutePath)
            ? "projectSettings"
            : destination,
      });
      if (cliArgMayMintTrustedRoots(destination)) {
        let spellings = mappedDriveSpellings(result.absolutePath);
        if (spellings.length > 0) {
          trustedNetworkDirectories.set(result.absolutePath, spellings);
          let filtered = spellings.filter((dir) => dir !== result.absolutePath);
          if (filtered.length > 0)
            toolPermissionContext = applyValidatedPermissionUpdate(toolPermissionContext, {
              type: "addDirectories",
              directories: filtered,
              destination,
            });
        }
      }
    } else if (result.resultType !== "alreadyInWorkingDirectory" && result.resultType !== "pathNotFound")
      warnings.push(addDirHelpMessage(result));
  if (trustedNetworkDirectories.size > 0)
    toolPermissionContext = {
      ...toolPermissionContext,
      trustedNetworkDirectories,
    };
  return {
    toolPermissionContext,
    warnings,
    securityWarnings,
    dangerousPermissions,
    overlyBroadBashPermissions,
    ...(bgBypassUnconsented && {
      bypassCapabilityNotification: BG_UNCONSENTED_BYPASS_CAPABILITY_NOTICE,
    }),
    inheritedSessionDirectories,
  };
}
//@ chunk-zfbhezv9.js:19645-21746 facade-exports (2.1.88 match: findOverlyBroadPowerShellPermissions, 0.148)
/**
 * 规则自检告警：deny/ask 规则指向已移除或未知的工具、用 "field:" 原样匹配 command/path 字段（不会生效）；validatePermissionRule 报告的警告。
 */
function collectPermissionRuleAdvisories(rules, getAllBaseTools) {
  let warnings = [];
  let allBaseTools = getAllBaseTools();
  let knownToolNames = new Set([
    ...allBaseTools.map((baseTool) => baseTool.name),
    ...SOFTWARE_DEV_TOOL_NAMES,
  ]);
  let ruleContentFieldByTool = new Map([
    [BASH_TOOL_NAME, "command"],
    [POWERSHELL_TOOL_NAME, "command"],
    [GLOB_TOOL_NAME, "path"],
    [GREP_TOOL_NAME, "path"],
    ...allBaseTools
      .filter((baseTool) => baseTool.ruleContentField)
      .map((baseTool) => [baseTool.name, baseTool.ruleContentField]),
  ]);
  for (let rule of [...filterRulesByBehavior(rules, "deny"), ...filterRulesByBehavior(rules, "ask")]) {
    if (rule.source === "toolsNarrowing" || rule.source === "session") continue;
    let { toolName, ruleContent } = rule.ruleValue;
    if (RETIRED_TOOL_NAMES.has(toolName)) {
      logForDebugging(`Permission ${rule.ruleBehavior} rule names a removed tool: ${toolName}`);
      continue;
    }
    if (
      hasWildcard(toolName) ||
      toolName.includes("_") ||
      legacyToolNamesFor(toolName).length > 0 ||
      knownToolNames.has(toolName)
    ) {
      let ruleContentField = ruleContentFieldByTool.get(toolName);
      if (ruleContentField && ruleContent !== undefined) {
        let index = ruleContent.indexOf(":");
        if (index > 0 && ruleContent.slice(0, index).trim() === ruleContentField) {
          let message = `Permission ${rule.ruleBehavior} rule "${formatPermissionRule(rule.ruleValue)}" targets ${ruleContentField} as a raw string and will not match`;
          let hint =
            toolName === GREP_TOOL_NAME
              ? "."
              : toolName === GLOB_TOOL_NAME
                ? ` \u2014 use ${FILE_READ_TOOL_NAME}(${"\u2026"}) to match file-read paths.`
                : toolName === FILE_WRITE_TOOL_NAME || toolName === NOTEBOOK_EDIT_TOOL_NAME
                  ? ` \u2014 use ${FILE_EDIT_TOOL_NAME}(${"\u2026"}) to match file-write paths.`
                  : ` \u2014 use ${toolName}(${"\u2026"}) for ${toolName}'s own matcher.`;
          warnings.push(
            createRuleWarning(
              rule,
              message + hint,
              `${capitalize(rule.ruleBehavior)} rule ${formatPermissionRule(rule.ruleValue)} never matches${toolName === GREP_TOOL_NAME ? "" : ` \xB7 use ${toolName === GLOB_TOOL_NAME ? FILE_READ_TOOL_NAME : toolName === FILE_WRITE_TOOL_NAME || toolName === NOTEBOOK_EDIT_TOOL_NAME ? FILE_EDIT_TOOL_NAME : toolName}(${"\u2026"})`}`,
            ),
          );
        }
      }
      continue;
    }
    warnings.push(
      createRuleWarning(
        rule,
        `Permission ${rule.ruleBehavior} rule "${formatPermissionRule(rule.ruleValue)}" matches no known tool \u2014 check for typos.`,
        `${capitalize(rule.ruleBehavior)} rule ${formatPermissionRule(rule.ruleValue)} matches no tool \xB7 check for typos`,
      ),
    );
  }
  for (let rule of [
    ...filterRulesByBehavior(rules, "allow"),
    ...filterRulesByBehavior(rules, "deny"),
    ...filterRulesByBehavior(rules, "ask"),
  ]) {
    if (rule.source === "session" || rule.source === "toolsNarrowing") continue;
    if (
      rule.source === "cliArg" &&
      rule.ruleBehavior === "allow" &&
      rule.ruleValue.toolName === GLOB_TOOL_NAME
    )
      continue;
    let { ruleContent } = rule.ruleValue;
    if (ruleContent !== undefined) {
      let index = ruleContent.indexOf(":");
      if (
        index > 0 &&
        /^[A-Za-z_][A-Za-z0-9_]*$/.test(ruleContent.slice(0, index).trim()) &&
        !/^[A-Za-z]:[\\/]/.test(ruleContent.trim())
      )
        continue;
    }
    let validation = validatePermissionRule(formatPermissionRule(rule.ruleValue), rule.ruleBehavior);
    if (validation.valid && validation.warning) {
      let sourceLabel =
        rule.source === "cliArg"
          ? rule.ruleBehavior === "allow"
            ? "--allowed-tools"
            : "--disallowed-tools"
          : rule.source === "flagSettings" && !getSettingsFilePathForSource("flagSettings")
            ? "--settings"
            : rule.source === "policySettings"
              ? "managed policy settings"
              : formatPermissionSource(rule.source);
      warnings.push(
        createRuleWarning(
          rule,
          `Permission ${rule.ruleBehavior} rule (${sourceLabel}): ${validation.warning}`,
          validation.securityNotice === undefined
            ? undefined
            : `${capitalize(rule.ruleBehavior)} rule ${validation.securityNotice}`,
        ),
      );
    }
  }
  return warnings;
}
//@ chunk-zfbhezv9.js:21746-21960 layout
function createRuleWarning(rule, line, securityNotice) {
  if (securityNotice === undefined)
    return {
      line,
    };
  let found = SETTING_SOURCES.find((source) => source === rule.source && source !== "flagSettings");
  let settingsPath = found === undefined ? undefined : getSettingsFilePathForSource(found);
  return {
    line,
    securityWarning:
      settingsPath === undefined
        ? {
            text: securityNotice,
          }
        : {
            text: securityNotice,
            seenKey: sha256OfLines([rule.source, settingsPath, securityNotice]),
          },
  };
}
//@ chunk-zfbhezv9.js:21960-22017 layout
function filterRulesByBehavior(rules, behavior) {
  return rules.filter((rule) => rule.ruleBehavior === behavior);
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
function settleProvisionalStartupMode(toolPermissionContext, options = {}) {
  let provisionalStartupMode = getProvisionalStartupMode();
  if (!provisionalStartupMode) return toolPermissionContext;
  let waitingForGrowthBook = provisionalStartupMode.awaitsGrowthBook && isGrowthBookCacheEmpty();
  if (waitingForGrowthBook && !provisionalStartupMode.awaitsPolicyVerdict) return toolPermissionContext;
  if (toolPermissionContext.mode !== provisionalStartupMode.mode) {
    setProvisionalStartupMode(undefined);
    return toolPermissionContext;
  }
  let resolved = initialPermissionModeFromCLI_2(provisionalStartupMode.inputs);
  if (resolved.autoDefaultWithheldForPendingVerdict) return toolPermissionContext;
  let nextProvisional = waitingForGrowthBook
    ? {
        mode: resolved.mode,
        inputs: provisionalStartupMode.inputs,
        awaitsGrowthBook: true,
        awaitsPolicyVerdict: false,
      }
    : undefined;
  setProvisionalStartupMode(nextProvisional);
  setAutoStartWithheldForHipaaTaint(resolved.autoStartWithheldForHipaaTaint);
  if (resolved.notification !== undefined) options.onNotification?.(resolved.notification);
  if (
    resolved.mode === toolPermissionContext.mode ||
    (resolved.mode === "bypassPermissions" && !toolPermissionContext.isBypassPermissionsModeAvailable) ||
    (resolved.mode === "auto" && !isAutoModeGateEnabled())
  )
    return toolPermissionContext;
  logForDebugging(
    `[permission-mode] startup resolved ${toolPermissionContext.mode} against ${provisionalStartupMode.awaitsPolicyVerdict ? "a pending policy verdict" : "an empty GrowthBook cache"}; re-resolved to ${resolved.mode}`,
  );
  setAutoModeFromFallback(resolved.fromAutoFallback);
  let nextContext = {
    ...transitionPermissionMode(
      toolPermissionContext.mode,
      resolved.mode,
      toolPermissionContext,
      "startup_reresolve",
    ),
    mode: resolved.mode,
    ...(provisionalStartupMode.awaitsPolicyVerdict &&
      resolved.decidedByProactivityLevel && {
        startupModeDecidedByProactivityLevel: provisionalStartupMode.inputs.proactivityLevel,
      }),
  };
  setProvisionalStartupMode(nextProvisional);
  return nextContext;
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
//@ chunk-zfbhezv9.js:23390-25368 facade-exports (2.1.88 match: verifyAutoModeGateAccess, 0.8)
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
  let canEnterAuto = enabledState !== "disabled" && !disabledBySettings && modelSupported;
  let available = canEnterAuto;
  let refusedForSettingsAlone = disabledBySettings && enabledState !== "disabled" && modelSupported;
  logForDebugging(
    `[auto-mode] verifyAutoModeGateAccess: enabledState=${enabledState} disabledBySettings=${disabledBySettings} model=${mainModel} modelSupported=${modelSupported} disableFastModeBreakerFires=${disableFastModeBreakerFires} carouselAvailable=${available} canEnterAuto=${canEnterAuto}`,
  );
  let autoModeFlagCli = getAutoModeFlagCli();
  if (!canEnterAuto) setProvisionalStartupMode(undefined);
  let setAvailable = (ctx, available) => {
    if (ctx.isAutoModeAvailable !== available)
      logForDebugging(
        `[auto-mode] verifyAutoModeGateAccess setAvailable: ${ctx.isAutoModeAvailable} -> ${available}`,
      );
    return ctx.isAutoModeAvailable === available && ctx.canAutoClassifierRun === canEnterAuto
      ? ctx
      : {
          ...ctx,
          isAutoModeAvailable: available,
          canAutoClassifierRun: canEnterAuto,
        };
  };
  if (canEnterAuto)
    return {
      canEnterAuto,
      refusedForSettingsAlone,
      updateContext: (ctx) => {
        abandonPendingPolicyVerdictResolution();
        ctx = settleProvisionalStartupMode(ctx);
        setProvisionalStartupMode(undefined);
        if (ctx.mode === "plan" && !ctx.prePlanMode) {
          let planActivation = activatePlanAutoMode(ctx);
          if (planActivation)
            return setAvailable(
              {
                ...planActivation,
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
  let inAutoMode = isAutoModeInUse(context);
  if (!inAutoMode && !autoModeFlagCli)
    return {
      updateContext: kickOutOfAutoIfNeeded,
      canEnterAuto,
      refusedForSettingsAlone,
    };
  if (inAutoMode) {
    let cliFlagValue = isLaunchRun && reason === "model" && isAutoModeFromFallback();
    return {
      updateContext: kickOutOfAutoIfNeeded,
      canEnterAuto,
      refusedForSettingsAlone,
      notification: cliFlagValue ? undefined : notification,
    };
  }
  return {
    updateContext: kickOutOfAutoIfNeeded,
    canEnterAuto,
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
  return getEnabledSettingSources().findLast((sourceName) =>
    isAutoModeDisabledBySettings(getSettingsForSource(sourceName) || {}),
  );
}
//@ chunk-zfbhezv9.js:25459-25514 facade-exports
function getDisableAutoModeSettingSources() {
  return getEnabledSettingSources().filter((sourceName) =>
    isAutoModeDisabledBySettings(getSettingsForSource(sourceName) || {}),
  );
}
//@ chunk-zfbhezv9.js:25514-25940 facade-exports
/**
 * 为遥测收集 auto 模式可用性：是否可用、不可用原因、禁用来源（含策略来源）、enabled 状态及其来源、熔断状态、settings 的 defaultMode、是否来自回退。
 */
function getAutoModeAvailabilityForAnalytics() {
  let disabledSource = autoModeDisabledSource();
  let autoModeEnabledStateWithSource = getAutoModeEnabledStateWithSource();
  return {
    autoModeAvailable: isAutoModeGateEnabled(),
    autoModeUnavailableReason: fromEnumOpt(getAutoModeUnavailableReason()),
    autoModeDisabledBySettingsSource: fromEnumOpt(disabledSource),
    autoModeDisabledByPolicyOrigin:
      disabledSource === "policySettings" ? fromEnumOpt(getPolicySettingsOrigin()) : undefined,
    autoModeDisabledByTrustedPolicy: isAutoModeDisabledByPolicySettings(),
    autoModeEnabledState: fromEnum(autoModeEnabledStateWithSource.value),
    autoModeEnabledStateSource: fromEnum(autoModeEnabledStateWithSource.src),
    autoModeCircuitBroken: isAutoModeCircuitBroken(),
    defaultModeSetting: fromEnumOpt((getSettings_DEPRECATED() || {}).permissions?.defaultMode),
    autoModeFromFallback: isAutoModeFromFallback(),
  };
}
//@ chunk-zfbhezv9.js:25940-26009 facade-exports (2.1.88 match: _temp7, 1)
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
//@ chunk-zfbhezv9.js:26026-26107 fingerprint (2.1.88 match: parseAutoModeEnabledState, 1)
function parseAutoModeEnabledState(value) {
  if (value === "enabled" || value === "disabled" || value === "opt-in") return value;
  return AUTO_MODE_ENABLED_FALLBACK;
}
//@ chunk-zfbhezv9.js:26107-26141 facade-exports
function getAutoModeEnabledState() {
  return getAutoModeEnabledStateWithSource().value;
}
//@ chunk-zfbhezv9.js:26141-26251 facade-exports (2.1.88 match: getAutoModeEnabledState, 0.825)
function getAutoModeEnabledStateWithSource() {
  let enabled = getFeatureValue_CACHED_MAY_BE_STALE("tengu_auto_mode_config", {})?.enabled;
  let autoModeEnabledState = parseAutoModeEnabledState(enabled);
  return {
    value: autoModeEnabledState,
    src: enabled === autoModeEnabledState ? "gb" : "default",
  };
}
//@ chunk-zfbhezv9.js:26251-26418 facade-exports (2.1.88 match: createDisabledBypassPermissionsContext, 1)
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
function isAutoModeInUse(context) {
  return (
    context.mode === "auto" ||
    (context.mode === "plan" && (context.prePlanMode === "auto" || !!context.strippedDangerousRules))
  );
}
//@ chunk-zfbhezv9.js:26528-27225 facade-exports
/**
 * 闸门关闭时退出 auto：恢复危险规则，模式改回 default（或按主动性档位算出的模式），并标记 auto 不可用。
 */
function createDisabledAutoModeContext(context) {
  let targetMode = "default";
  {
    let startupModeDecidedByProactivityLevel = context.startupModeDecidedByProactivityLevel;
    if (
      (context.mode === "auto" || context.prePlanMode === "auto") &&
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
            context.proactivityBaseline?.mode,
          ),
        );
        let policyOverridesMode =
          getProactivityPolicyVerdict(
            startupModeDecidedByProactivityLevel,
            externalPermissionMode,
            context.proactivityBaseline?.mode,
          ) !== undefined;
        targetMode =
          externalPermissionMode === "plan" || policyOverridesMode ? "default" : externalPermissionMode;
      }
      context = {
        ...context,
        startupModeDecidedByProactivityLevel: undefined,
      };
    }
  }
  setAutoModeActive(false);
  setNeedsAutoModeExitAttachment(true);
  if (context.mode === "auto") {
    logPermissionModeChanged({
      from: "auto",
      to: targetMode,
      trigger: "auto_gate_denied",
    });
    return {
      ...applyValidatedPermissionUpdate(restoreDangerousPermissions(context), {
        type: "setMode",
        mode: targetMode,
        destination: "session",
      }),
      isAutoModeAvailable: false,
      canAutoClassifierRun: false,
    };
  }
  return {
    ...restoreDangerousPermissions(context),
    prePlanMode: context.prePlanMode === "auto" ? targetMode : context.prePlanMode,
    isAutoModeAvailable: false,
    canAutoClassifierRun: false,
  };
}
//@ chunk-zfbhezv9.js:27225-27291 facade-exports (2.1.88 match: isDefaultPermissionModeAuto, 1)
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
//@ chunk-zfbhezv9.js:27325-27396 layout (2.1.88 match: _temp9, 1)
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
function settlePlanAutoModeAtStart(context) {
  latchPlanAutoModeAtLaunch();
  return reconcilePlanAutoMode(context, shouldPlanUseAutoMode);
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
function activatePlanAutoMode(context) {
  if (!planUsesAutoMode()) return null;
  setAutoModeActive(true);
  return stripDangerousPermissionsForAutoMode(context);
}
//@ chunk-zfbhezv9.js:27673-28016 facade-exports (2.1.88 match: prepareContextForPlanMode, 0.927)
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
    let strippedContext = activatePlanAutoMode(context);
    if (strippedContext)
      return {
        ...strippedContext,
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
//@ chunk-zfbhezv9.js:28016-28413 facade-exports (2.1.88 match: transitionPlanAutoMode, 0.56)
/**
 * 把上下文规整为“已认领的启动模式”：清除主动性档位标记；未经 flag 允许时关闭 bypass 可用；plan 带 prePlanMode 时按 auto 是否激活处理 plan 的 auto 状态。
 */
function asClaimedStartModeContext(context, availability) {
  let nextContext = context;
  if (nextContext.startupModeDecidedByProactivityLevel !== undefined)
    nextContext = {
      ...nextContext,
      startupModeDecidedByProactivityLevel: undefined,
    };
  if (
    nextContext.mode !== "bypassPermissions" &&
    nextContext.isBypassPermissionsModeAvailable &&
    !availability.bypassAvailableByFlag
  )
    nextContext = {
      ...nextContext,
      isBypassPermissionsModeAvailable: false,
    };
  if (nextContext.mode === "plan" && nextContext.prePlanMode !== undefined) {
    let transitioned = transitionPlanAutoMode({
      ...nextContext,
      prePlanMode: "default",
    });
    nextContext = isAutoModeActive()
      ? transitioned
      : {
          ...transitioned,
          prePlanMode: undefined,
        };
  }
  return nextContext;
}
//@ chunk-zfbhezv9.js:28413-28445 facade-exports
function transitionPlanAutoMode(context) {
  return reconcilePlanAutoMode(context, isPlanAutoModeAllowed);
}
//@ chunk-zfbhezv9.js:28445-28710 affinity
function reconcilePlanAutoMode(context, shouldPlanUseAuto) {
  if (context.mode === "auto") return stripDangerousPermissionsForAutoMode(context);
  if (context.mode !== "plan") return context;
  if (!context.prePlanMode || context.prePlanMode === "bypassPermissions") return context;
  let autoActive = isAutoModeActive();
  let wantAuto = autoActive ? shouldPlanUseAuto() : planUsesAutoMode();
  if (wantAuto && autoActive) return stripDangerousPermissionsForAutoMode(context);
  if (!wantAuto && !autoActive) return context;
  if (wantAuto) {
    setAutoModeActive(true);
    setNeedsAutoModeExitAttachment(false);
    return stripDangerousPermissionsForAutoMode(context);
  }
  setAutoModeActive(false);
  setNeedsAutoModeExitAttachment(true);
  return restoreDangerousPermissions(context);
}
//@ chunk-e6aww6q8.js:1270853-1270876 facade-exports
function antBuiltinDenyRules() {
  return [];
}
//@ chunk-e6aww6q8.js:3261661-3261758 fingerprint (2.1.88 match: isAutoModeDisabledBySettings, 1)
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
//@ chunk-e6aww6q8.js:3261867-3262027 facade-exports (2.1.88 match: getAutoModeUnavailableReason, 1)
/**
 * auto 不可用的原因：settings / circuit-breaker / model，或 Els() 给出的其他原因。
 */
function getAutoModeUnavailableReason(model = getMainLoopModel()) {
  if (isAutoModeDisabledBySettingsNow()) return "settings";
  if (isAutoModeCircuitBroken()) return "circuit-breaker";
  if (!modelSupportsAutoMode(model)) return "model";
  let autoModeFastModeBreakerReason = getAutoModeFastModeBreakerReason();
  if (autoModeFastModeBreakerReason === "model" && !isAntInternalFastModelId(model)) return null;
  return autoModeFastModeBreakerReason;
}
//@ chunk-e6aww6q8.js:3262027-3262342 facade-exports (2.1.88 match: getAutoModeUnavailableNotification, 0.763)
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
//@ chunk-4p0ppc72.js:377-468 fingerprint (2.1.88 match: isPermissionUpdateDestination, 0.909)
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
//@ chunk-tr0s0d0k.js:23784-23793 affinity
var HOST_CREDENTIAL_SCAN_DEPTH = 4;
//@ chunk-tr0s0d0k.js:23793-24209 callgraph-fingerprint (2.1.88 match: isOverlyBroadPowerShellAllowRule, 0.244)
/**
 * 若 Shell 命令会读取宿主凭证（Windows 按 token 检查，其他平台按 wt 扫描），返回 hostCredential 来源的 deny 规则。
 */
async function getHostCredentialDenyRule(tool, input) {
  let { command } = input;
  if (typeof command !== "string") return;
  if (getPlatform() === "windows") {
    if (tool.name !== BASH_TOOL_NAME && tool.name !== POWERSHELL_TOOL_NAME) return;
    let firstHit;
    for (let segment of readsCredentialStore(command, tool.name === BASH_TOOL_NAME ? "bash" : "powershell"))
      firstHit ??= credentialCommandIn(segment);
    if (firstHit !== undefined)
      return {
        source: HOST_CREDENTIAL_RULE_SOURCE,
        ruleBehavior: "deny",
        ruleValue: {
          toolName: tool.name,
          ruleContent: `*${firstHit}*`,
        },
      };
    return;
  }
  let [keychainCommand] = keychainCommands();
  return keychainCommand !== undefined &&
    tool.name === BASH_TOOL_NAME &&
    (await commandReachesSettings(command, HOST_CREDENTIAL_SCAN_DEPTH))
    ? {
        source: HOST_CREDENTIAL_RULE_SOURCE,
        ruleBehavior: "deny",
        ruleValue: bashPrefixRule(keychainCommand),
      }
    : undefined;
}
export {
  isVirtualPancakeEnabled,
  transitionPermissionMode,
  sameEffort,
  setPermissionModeWithGuards,
  getAutoModeUnavailableText,
  classifyAllShellEnabled,
  isDangerousClassifierPermission,
  warnMcpRuleMismatch,
  getAutoModeConfigOrDefault,
  requiresClassifierForHookAllow,
  resolveLoopEffort,
  isBypassPermissionsModeDisabled,
  canSeedAutoMode,
  getAutoModeUnavailableReason,
  getAutoModeAvailabilityForAnalytics,
  verifyAutoModeGateAccess,
  BYPASS_CONSENT_MESSAGE,
  BG_UNCONSENTED_BYPASS_CAPABILITY_NOTICE,
  getAutoModeUnavailableNotification,
  getStartupModeTelemetry,
  getAutoSeedFactors,
  resolveRemoteSessionMode,
  resolveSeedPermissionMode,
  getProactivityPolicyVerdict,
  guardPermissionModeChange,
  undonePermissionContext,
  applyPermissionModeRevertEffects,
  permissionModeSignal,
  isAutoModeGateEnabled,
  isMaxEffortReminderEnabled,
  TENGU_LOGGIA_PASSAGE,
  approvalLayers,
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
  refusedEffortTelemetryFields,
  resolveRefusalFallbackEffort,
  initializeToolPermissionContext,
  antBuiltinDenyRules,
  latchPlanAutoModeAtLaunch,
  activatePlanAutoMode,
  resolveStartupModel,
  hasMcpToolAliases,
  isDangerousBashPermission,
  isDangerousPowerShellPermission,
  PERMISSION_UPDATE_DESTINATIONS,
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
  cliArgMayMintTrustedRoots,
  collectPermissionRuleAdvisories,
  findDangerousClassifierPermissions,
  findOverlyBroadBashPermissions,
  findOverlyBroadPowerShellPermissions,
  getAutoModeEnabledStateWithSource,
  isDangerousTaskPermission,
  isOverlyBroadBashAllowRule,
  isOverlyBroadPowerShellAllowRule,
  isYoloEquivStripEnabledForEntrypoint,
  literalToolsNarrowing,
  parseBaseToolsFromCLI,
  removeDangerousPermissions,
  shouldPlanUseAutoMode,
  splitToolExclusions,
};
