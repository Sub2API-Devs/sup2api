/**
 * commands.ts
 *
 * 命令注册表：内建命令表（约 145 项）、运行时门控组、技能/插件/工作流/MCP 命令合并与保留名处理、availability 与启用过滤、远程与桥接安全集合、SDK 命令列表转换、缓存清理；并混入 findCommand/isCommandEnabled 等基础查找（chunk-s61vbvea）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands.ts
 * pieces: chunk-e6aww6q8.js (102), chunk-s61vbvea.js (25)
 * attribution: facade-exports 39, fingerprint 7, layout 47, affinity 2, callgraph-fingerprint 1, placement 30, file-local 1
 */
import {
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
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
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
} from "path";
import {
  getSkillOverrideState,
  isHiddenFromModel,
  isFallbackSkill,
  isSyncedOrManagedSkill,
  dropReservedAliases,
  getSyncedSkillUnqualifiedAlias,
  k2e,
  isUsableWithoutWorkspace,
  mergeClients,
  isQualifiedToolReference,
  checkCommandListable,
  addNonSyncedSpellings,
  admitSyncedSkills,
  cGe,
  isSyncedSkill,
  isKilledHostCatalogSkill,
  isHostCatalogSkill,
  hideDuplicateCatalogSkills,
  admitSyncedSkill,
  addNameAndAliases,
  V1t,
  supportsNonInteractive,
  getCommandId,
  hideShadowedCommands,
} from "./utils/commandPredicates.js";
import { getHostState, keyOrNull, getOrCreate } from "./utils/hostEnvironment.js";
import { isClaudeAISubscriber, isUsing3PServices, isWIFDispatchAuth } from "./utils/auth.js";
import { isFirstPartyAnthropicBaseUrl } from "./utils/model/providers.js";
import { getWIFAuthType } from "./utils/wifProfile.js";
import { logForDebugging } from "./utils/debug.js";
import {
  getDisableSlashCommands,
  getLastSyncedLaneLoad,
  getLastCompleteSyncedPluginList,
  getAdditionalDirectoriesForClaudeMd,
  isGatewayAuthPinned,
  getGatewayAuth,
  getIsNonInteractiveSession,
  getSkillsSyncVetoed,
} from "./bootstrap/state.js";
import { vZ, getReservedSkillNamespace } from "./skills/reservedSkillNames.js";
import { foldName as foldName_2, getAccountCacheKey } from "./utils/plugins/syncedItems.js";
import { withSyncedSkillPrefix, isSafeSkillName } from "./skills/syncedSkills.js";
import { B2, i3, Lar } from "./utils/permissions/permissionRulePayload.js";
import { ewe, I1r, hookedCommands } from "./plugins/functionHooks/commandHooks.js";
import { kZt } from "./utils/claudeAiSync/syncedSkillAccess.js";
import { isSkillAttributionEnabled } from "./utils/telemetry/skillAttribution.js";
import { uo } from "./services/api/deferredToolsState.js";
import { isPathWithin } from "./utils/fsJunctions.js";
import { markInPlaceWriteForced } from "./utils/plugins/safeCopy.js";
import { loginCommand_2 } from "./commands/login/index.js";
import { Uen, terminalSetupCommand } from "./commands/terminalSetup/index.js";
import { commitPushPrCommand } from "./commands/commit-push-pr.js";
import { qZt } from "./commands/ant-trace/index.js";
import { versionCommand, versionNonInteractiveCommand } from "./commands/version.js";
import { Oen, Men, scrollSpeedCommand } from "./commands/scroll-speed/index.js";
import { Crn, ENTERPRISE_UPSELL_COMMANDS } from "./commands/c4eUpsell.js";
import { isAgentsFleetEnabled, isDaemonWorkerRegistryEnabled } from "./utils/fleetGates.js";
import { isEnvTruthy } from "./utils/envUtils.js";
import { env } from "./utils/env.js";
import {
  forkToBackgroundCommand,
  subtaskCommand,
  forkSubagentCommand,
  agentsRemovedCommand,
} from "./commands/agents/index.js";
import { jF } from "./utils/plugins/pluginGates.js";
import {
  skillDoctorCommand,
  skillDoctorNonInteractiveCommand,
  usageCommand,
  usageNonInteractiveCommand,
} from "./commands/usage/index.js";
import { logoutCommand } from "./commands/logout/index.js";
import { addDirCommand, addDirNonInteractiveCommand } from "./commands/add-dir/index.js";
import { cloudPluginsCommand } from "./commands/cloud-plugins/index.js";
import { advisorCommand, advisorNonInteractiveCommand } from "./commands/advisor.js";
import {
  autoModeSetupCommand,
  autoModeSetupNonInteractiveCommand,
} from "./commands/auto-mode-setup/index.js";
import { autocompactCommand, autocompactNonInteractiveCommand } from "./commands/autocompact/index.js";
import { branchCommand } from "./commands/branch/index.js";
import { btwCommand } from "./commands/btw/index.js";
import { cdCommand } from "./commands/cd/index.js";
import { chromeCommand } from "./commands/chrome/index.js";
import { clearCommand } from "./commands/clear/index.js";
import { colorCommand, colorNonInteractiveCommand } from "./commands/color/index.js";
import { compactCommand } from "./commands/compact/index.js";
import { configCommand, configNonInteractiveCommand } from "./commands/config/index.js";
import {
  vimMovedToConfigCommand,
  outputStyleMovedToConfigCommand,
} from "./commands/createMovedToConfigCommand.js";
import { outputStyleCommand } from "./commands/output-style/index.js";
import { copyCommand } from "./commands/copy/index.js";
import { desktopCommand } from "./commands/desktop/index.js";
import { contextCommand, contextNonInteractiveCommand } from "./commands/context/index.js";
import { diffCommand } from "./commands/diff/index.js";
import { effortCommand, effortNonInteractiveCommand } from "./commands/effort/index.js";
import { wellbeingCommand } from "./commands/wellbeing/index.js";
import { exitCommand, exitNonInteractiveCommand } from "./commands/exit/index.js";
import { fastCommand, fastNonInteractiveCommand } from "./commands/fast/index.js";
import { focusCommand, focusNonInteractiveCommand } from "./commands/focus/index.js";
import { heapdumpCommand } from "./commands/heapdump/index.js";
import { helpCommand } from "./commands/help/index.js";
import { ideCommand } from "./commands/ide/index.js";
import { initCommand } from "./commands/init.js";
import { keybindingsCommand } from "./commands/keybindings/index.js";
import { installGithubAppCommand } from "./commands/install-github-app/index.js";
import { installSlackAppCommand } from "./commands/install-slack-app/index.js";
import { mcpCommand, mcpNonInteractiveCommand } from "./commands/mcp/index.js";
import { memoryCommand } from "./commands/memory/index.js";
import { importCommand, importNonInteractiveCommand } from "./commands/import/index.js";
import { mobileCommand } from "./commands/mobile/index.js";
import { pauseMemoryCommand } from "./commands/pause-memory/index.js";
import { modelCommand, modelNonInteractiveCommand } from "./commands/model/index.js";
import { remoteEnvCommand } from "./commands/remote-env/index.js";
import { remoteWorkflowCommand, workflowLaunchExecCommand } from "./commands/remote-workflow/index.js";
import { pluginCommand } from "./commands/plugin/index.js";
import { releaseNotesCommand } from "./commands/release-notes/index.js";
import { reloadPluginsCommand } from "./commands/reload-plugins/index.js";
import { reloadSkillsCommand } from "./commands/reload-skills/index.js";
import { renameCommand, renameNonInteractiveCommand } from "./commands/rename/index.js";
import { resumeCommand } from "./commands/resume/index.js";
import { setupBedrockCommand, setupVertexCommand } from "./commands/setup-vertex/index.js";
import { sessionCommand } from "./commands/session/index.js";
import { skillsCommand } from "./commands/skills/index.js";
import { statusCommand } from "./commands/status/index.js";
import { statuslineCommand } from "./commands/statusline.js";
import { stickersCommand } from "./commands/stickers/index.js";
import { themeCommand } from "./commands/theme/index.js";
import { tuiCommand } from "./commands/tui/index.js";
import { feedbackCommand, bugCommand } from "./commands/feedback/index.js";
import { ultrareviewCommand, ultrareviewNonInteractiveCommand } from "./commands/review.js";
import { ultraplanCommand } from "./commands/ultraplan.js";
import { rewindCommand } from "./commands/rewind/index.js";
import { securityReviewCommand } from "./commands/security-review.js";
import { restartCommand } from "./commands/restart/index.js";
import { upgradeCommand } from "./commands/upgrade/index.js";
import {
  usageCreditsCommand,
  usageCreditsNonInteractiveCommand,
  extraUsageCommand,
  extraUsageNonInteractiveCommand,
} from "./commands/extra-usage/index.js";
import { rateLimitOptionsCommand } from "./commands/rate-limit-options/index.js";
import { lowPriorityCommand } from "./commands/low-priority/index.js";
import { limitResetCommand } from "./commands/limit-reset/index.js";
import { claimCreditCommand } from "./commands/claim-credit/index.js";
import { proTrialExpiredCommand } from "./commands/pro-trial-expired/index.js";
import { voiceCommand } from "./commands/voice/index.js";
import { permissionsCommand } from "./commands/permissions/index.js";
import { planCommand } from "./commands/plan/index.js";
import { powerupCommand } from "./commands/powerup/index.js";
import { privacySettingsCommand } from "./commands/privacy-settings/index.js";
import { hooksCommand } from "./commands/hooks/index.js";
import { loopsCommand } from "./commands/loops/index.js";
import { exportCommand } from "./commands/export/index.js";
import { sandboxCommand } from "./commands/sandbox-toggle/index.js";
import {
  createDesignLoginCommand,
  designConsentCommand,
  designRevokeCommand,
} from "./commands/design/index.js";
import { passesCommand } from "./commands/passes/index.js";
import { tasksCommand } from "./commands/tasks/index.js";
import { autofixPrCommand } from "./commands/autofix-pr/index.js";
import { teleportCommand } from "./commands/teleport/index.js";
import { artifactsCommand } from "./commands/artifacts/index.js";
import { teamOnboardingCommand } from "./commands/team-onboarding/index.js";
import { radioCommand } from "./commands/radio/index.js";
import { CLAUDE_AI_SYNC_LABEL } from "./utils/settings/commandSyncNames.js";
import { getPluginDisplayName } from "./components/ManagedSettingsSecurityDialog/utils.js";
import { getSettingSourceName } from "./utils/settings/constants.js";
import { getRegisteredBundledSkillsIgnoringKillSwitch, getBundledSkills } from "./skills/bundledSkills.js";
import { builtinPluginSkillNames, epr } from "./utils/plugins/managedPlugins.js";
import { sYo } from "./utils/telemetry/skillLoadedEvent.js";
import {
  getSkillDirCommandsCached,
  getDynamicSkillStateKeyExport,
  refuseReservedSkillName,
  EVe,
  getDynamicSkills,
  $z,
  clearSkillCaches,
} from "./skills/loadSkillsDir.js";
import { isSyscallError, toError } from "./utils/errors.js";
import { logError } from "./utils/log.js";
import { loadPluginSkills, getPluginCommands } from "./utils/plugins/loadPluginCommands.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "./services/analytics/featureTelemetry.js";
import { ppr } from "./skills/bundledSkillsGate.js";
import { _8, getSyncedSkillCommands } from "./utils/claudeAiSync/skillsSync.js";
import { W1 } from "./plugins/functionHooks/sites/promptContextSites.js";
import { Br } from "./utils/startupTiming.js";
import { SS } from "../vendor/lodash-es/_inlinedHelpers.js";
import { groupPluginSourcesByName } from "./utils/telemetry/pluginTelemetry.js";
import { claimOnce } from "./services/api/verificationRequired.js";
import { Cei } from "./history.js";
import { realpathNativeAsync } from "./utils/windowsUncPaths.js";
import { hostSkillCatalog } from "./utils/sessionShape.js";
import { Mu } from "./utils/stringUtils.js";
import { reportRefusedSkillName } from "./skills/skillNameRules.js";
import { clearPluginCommands, oto } from "./utils/plugins/pluginLoadState.js";
import { getBuiltinPlugins } from "./plugins/builtinPlugins.js";
import { lit as lit_2 } from "./services/analytics/safeMetadata.js";
import { commandPolicyGateAllows } from "./services/policyLimits/policyVerdicts.js";
import { BTi, containsSecret } from "./utils/redactSecrets.js";
import { isSkillFromUserSource } from "./skills/skillSources.js";

//@ chunk-e6aww6q8.js:953787-953824 facade-exports
function isSkillOff(e) {
  return getSkillOverrideState(e) === "off";
}
/**
 * meetsAvailabilityRequirement：命令 availability 要求是否满足。宿主可通过 commandsOffHere 关闭；claude-ai 需 claude.ai 订阅登录；console 需一方 API 且非 claude.ai 订阅；console-profile 需 user_oauth 档案登录。
 */
//@ chunk-e6aww6q8.js:953824-954135 fingerprint = meetsAvailabilityRequirement (0.639)
function meetsAvailabilityRequirement(cmd) {
  if (getHostState().commandsOffHere?.(cmd)) return !1;
  if (!cmd.availability) return !0;
  for (let requirement of cmd.availability)
    switch (requirement) {
      case "claude-ai":
        if (isClaudeAISubscriber()) return !0;
        break;
      case "console":
        if (!isClaudeAISubscriber() && !isUsing3PServices() && isFirstPartyAnthropicBaseUrl()) return !0;
        break;
      case "console-profile":
        if (getWIFAuthType() === "user_oauth" && isWIFDispatchAuth()) return !0;
        break;
      default: {
        let r = requirement;
        break;
      }
    }
  return !1;
}
/**
 * joinScopedName：返回 `${scope}:${name}`。
 */
//@ chunk-e6aww6q8.js:954135-954170 layout
function joinScopedName(scope, name) {
  return `${scope}:${name}`;
}
/**
 * matchesUnqualifiedName：prompt 且非 syncedSkills 且 unqualifiedName===n。
 */
//@ chunk-e6aww6q8.js:954170-954267 layout
function matchesUnqualifiedName(cmd, name) {
  return cmd.type === "prompt" && cmd.loadedFrom !== "syncedSkills" && cmd.unqualifiedName === name;
}
/**
 * getBareCommandName：prompt 有 unqualifiedName 时返回它，否则 name。
 */
//@ chunk-e6aww6q8.js:954267-954357 layout
function getBareCommandName(cmd) {
  return cmd.type === "prompt" && cmd.unqualifiedName != null ? cmd.unqualifiedName : cmd.name;
}
/**
 * getBareCommandNameUnlessSynced：同 EF，但 syncedSkills 不取 unqualifiedName。
 */
//@ chunk-e6aww6q8.js:954357-954479 layout
function getBareCommandNameUnlessSynced(cmd) {
  return cmd.type === "prompt" && cmd.unqualifiedName != null && cmd.loadedFrom !== "syncedSkills"
    ? cmd.unqualifiedName
    : cmd.name;
}
/**
 * dropShadowedFallbackSkills：旧版名 getMcpSkillCommands 不符：316 里按 ":后缀" 收集插件/内置/MCP 技能名，丢弃同名 fallback 技能。
 */
//@ chunk-e6aww6q8.js:954479-955011 fingerprint = getMcpSkillCommands (0.47)
function dropShadowedFallbackSkills(commands) {
  let suffixes = new Set(),
    sawMcp = !1;
  for (let h of commands) {
    if (
      h.type !== "prompt" ||
      (h.loadedFrom !== "plugin" && h.loadedFrom !== "bundled" && h.loadedFrom !== "mcp")
    )
      continue;
    if (h.disableModelInvocation || isHiddenFromModel(h)) continue;
    if (h.loadedFrom === "mcp") sawMcp = !0;
    let colon = h.name.lastIndexOf(":");
    if (colon > 0) suffixes.add(h.name.slice(colon + 1));
  }
  if (suffixes.size === 0) return commands;
  let telemetryLogged = getHostState().fallbackShadowTelemetryLogged;
  return commands.filter((cmd) => {
    if (!isFallbackSkill(cmd)) return !0;
    if (!suffixes.has(cmd.name)) return !0;
    return (
      logForDebugging(
        `Dropping fallback skill '${cmd.name}' \u2014 a plugin/MCP skill with the same suffix is loaded`,
      ),
      !1
    );
  });
}
/**
 * dedupeBundledSkills：按名去重 source=bundled 的 prompt；结果缓存在 state.shadowedBundledSkills。
 */
//@ chunk-e6aww6q8.js:955011-955309 layout
function dedupeBundledSkills(commands) {
  let state = getHostState();
  if (state.shadowedBundledSkills?.input === commands) return state.shadowedBundledSkills.output;
  let seen = new Set(),
    hadDuplicates = !1,
    deduped = commands.filter((S) => {
      if (S.type === "prompt" && S.source === "bundled" && seen.has(S.name))
        return ((hadDuplicates = !0), !1);
      return (seen.add(S.name), !0);
    }),
    result = hadDuplicates ? deduped : commands;
  return ((state.shadowedBundledSkills = { input: commands, output: result }), result);
}
//@ chunk-e6aww6q8.js:955309-955350 layout
function F7(e) {
  if (getDisableSlashCommands()) return [];
  return [];
}
/**
 * isSkillToolCommand：SkillTool 列表的单条谓词；门面把 getSkillToolCommands 给了 YI。
 */
//@ chunk-e6aww6q8.js:955350-955649 fingerprint = getSkillToolCommands (0.859)
function isSkillToolCommand(cmd) {
  return (
    cmd.type === "prompt" &&
    !cmd.disableModelInvocation &&
    !isHiddenFromModel(cmd) &&
    (cmd.source === "builtin" ||
      cmd.loadedFrom === "bundled" ||
      cmd.loadedFrom === "skills" ||
      cmd.loadedFrom === "syncedSkills" ||
      cmd.loadedFrom === "attachedFolder" ||
      cmd.loadedFrom === "commands_DEPRECATED" ||
      cmd.hasUserSpecifiedDescription ||
      !!cmd.whenToUse)
  );
}
/**
 * addSpelling：规范化（Gy）后加入集合，跳过 claude.ai 同步技能保留名。
 */
//@ chunk-e6aww6q8.js:959638-959723 affinity
function addSpelling(spellings, name, allowReserved = !1) {
  if (typeof name !== "string") return;
  if (!allowReserved && vZ(name)) return;
  spellings.add(foldName_2(name));
}
/**
 * addCommandSpellings：把 name、显示名、aliases 规范化后加入集合；旧版名 findCommand 配错（门面 findCommand=s61vbvea Zs）。
 */
//@ chunk-e6aww6q8.js:959723-959841 callgraph-fingerprint = findCommand (1)
function addCommandSpellings(spellings, cmd) {
  let allowReserved = isSyncedOrManagedSkill(cmd);
  addSpelling(spellings, cmd.name, allowReserved);
  let displayName = getCommandName_2(cmd);
  if (displayName !== cmd.name) addSpelling(spellings, displayName, allowReserved);
  for (let alias of cmd.aliases ?? []) addSpelling(spellings, alias, allowReserved);
}
/**
 * （旧版名 buildTool 是错配）过滤命令（Skill）的 aliases：保留谓词为真的别名；syncedSkills 来源的命令若规范名与 userFacingName 不一致，再改写 userFacingName。
 */
//@ chunk-e6aww6q8.js:961188-961361 placement = buildTool (0.402)
function filterCommandAliases(command, keepAlias) {
  let r = dropReservedAliases(command, keepAlias);
  if (r.loadedFrom !== "syncedSkills") return r;
  let s = getCommandName_2(r);
  if (withSyncedSkillPrefix(s) === s || getSyncedSkillUnqualifiedAlias(r) !== void 0) return r;
  let h = withSyncedSkillPrefix(s);
  return { ...r, userFacingName: () => h };
}
/**
 * 根据上次同步的 lane 负载，返回"技能被插件接管"的插件表 pluginId → {pluginName, heldBack}；功能关闭或没有数据时返回共享空表。
 */
//@ chunk-e6aww6q8.js:1661511-1661811 placement
function getHeldBackSyncedPlugins() {
  if (!B2()) return ewe;
  let e = getLastSyncedLaneLoad();
  if (e === null) return ewe;
  if (kZt()) return ewe;
  let n = new Map();
  for (let { bucket: bucket, outcome: outcome, pluginName: pluginName, pluginId: pluginId } of e)
    if (
      outcome !== "not_loaded" &&
      pluginId !== void 0 &&
      LUo(bucket, pluginId) &&
      n.get(pluginId)?.heldBack !== !1
    )
      n.set(pluginId, { pluginName: pluginName, heldBack: outcome === "held_back" });
  return n.size === 0 ? ewe : n;
}
//@ chunk-e6aww6q8.js:1661811-1661890 placement
function LUo(e, n) {
  let r = getLastCompleteSyncedPluginList();
  return r === null || r.bucket !== e || r.dirsById.has(n);
}
//@ chunk-e6aww6q8.js:1661890-1661969 placement
function AZt(e) {
  return e.size === 0 ? "" : `hide=${[...e.keys()].sort().join(",")}:`;
}
/**
 * 把被同名插件接管的同步技能标成隐藏（isHidden + hiddenBehindPlugin，可带替代技能名）；用户自有同名技能或带本地归属的技能不动。没有变化时返回原数组。
 */
//@ chunk-e6aww6q8.js:1661969-1662547 placement
function hideSkillsBehindPlugins(commands, heldBackPlugins, userCommands) {
  if (heldBackPlugins.size === 0) return commands;
  let s = new Set(userCommands.map((w) => foldName_2(w.name))),
    h,
    y = !1,
    mappedCommands = commands.map((w) => {
      let L =
        w.type === "prompt" && w.loadedFrom === "syncedSkills" && w.serverAttribution?.pluginId !== void 0
          ? heldBackPlugins.get(w.serverAttribution.pluginId)
          : void 0;
      if (
        L === void 0 ||
        w.type !== "prompt" ||
        w.skillRoot === void 0 ||
        s.has(foldName_2(w.name)) ||
        (h ??= isSkillAttributionEnabled())(w.skillRoot) !== void 0
      )
        return w;
      let G = L.heldBack ? void 0 : findPluginReplacementSkill(commands, L.pluginName, w);
      if (!L.heldBack && G === void 0) return w;
      return (
        (y = !0),
        {
          ...w,
          isHidden: !0,
          hiddenBehindPlugin: {
            plugin: L.pluginName,
            heldBack: L.heldBack,
            ...(G !== void 0 && { replacement: G }),
          },
        }
      );
    });
  return y ? mappedCommands : commands;
}
//@ chunk-e6aww6q8.js:1662547-1662736 placement
function findPluginReplacementSkill(e, n, r) {
  let s = foldName_2(r.unqualifiedName ?? r.name);
  return e.find(
    (h) =>
      h.type === "prompt" &&
      h.pluginInfo?.repository === `${n}@synced` &&
      !k2e(h) &&
      (h.aliases ?? []).some((y) => foldName_2(y) === s),
  )?.name;
}
/**
 * 为被插件接管而隐藏的技能生成提示："现在是插件技能 /X" 或 "属于已关闭的插件 X，去 /plugin 打开"。
 */
//@ chunk-e6aww6q8.js:1662736-1663073 placement
function describeSkillHiddenBehindPlugin(e) {
  if (e.type !== "prompt" || e.hiddenBehindPlugin === void 0) return;
  let n = (y) => uo(y, 200),
    { plugin: plugin, replacement: replacement } = e.hiddenBehindPlugin,
    h = n(e.name);
  if (replacement !== void 0)
    return `${h} is now the plugin skill ${n(replacement)}. Use /${n(replacement)}.`;
  return `${h} is now part of the plugin ${n(plugin)}, which is turned off. Check /plugin to turn it on and run it.`;
}
//@ chunk-e6aww6q8.js:1683563-1683709 placement
function findAdditionalDirRoot(e) {
  let n = resolve_30(e),
    r = null;
  for (let s of getAdditionalDirectoriesForClaudeMd()) {
    let h = resolve_30(s);
    if (isPathWithin(h, n, { alreadyComparable: !0 }) && (r === null || h.length > r.length)) r = h;
  }
  return r;
}
//@ chunk-e6aww6q8.js:1683709-1683961 placement
function getAdditionalDirRelativeLabel(e) {
  let n = findAdditionalDirRoot(e);
  if (n === null) return null;
  let r = basename_37(n);
  if (r === "") return null;
  let any = getAdditionalDirectoriesForClaudeMd().some((w) => {
      let L = resolve_30(w);
      return L !== n && basename_37(L) === r;
    }),
    h = basename_37(dirname_41(n)),
    y = any && h !== "" ? `${h}/${r}` : r,
    S = relative_27(n, resolve_30(e));
  return S === "" ? y : [y, ...S.split(sep_42)].join("/");
}
//@ chunk-e6aww6q8.js:1732452-1732503 placement = default (1)
var wen = { isEnabled: () => !1, isHidden: !0, name: "stub" };
//@ chunk-e6aww6q8.js:1733123-1733174 placement = default (1)
var Ten = { isEnabled: () => !1, isHidden: !0, name: "stub" };
/**
 * getCommandOriginKind：builtin/plugin/mcp/user。
 */
//@ chunk-e6aww6q8.js:1750075-1750424 placement
function getCommandOriginKind(e) {
  if (I1r(e)) return "plugin";
  if (e.type !== "prompt") return e.loadedFrom === "mcp" ? "mcp" : "builtin";
  switch (e.source) {
    case "builtin":
    case "bundled":
      return "builtin";
    case "plugin":
      return "plugin";
    case "mcp":
      return "mcp";
    case "userSettings":
    case "projectSettings":
    case "localSettings":
    case "flagSettings":
    case "policySettings":
    case "memoryStore":
      return "user";
  }
}
//@ chunk-e6aww6q8.js:2031344-2031395 placement = default (1)
var frn = { isEnabled: () => !1, isHidden: !0, name: "stub" };
//@ chunk-e6aww6q8.js:2033346-2033397 placement = default (1)
var prn = { isEnabled: () => !1, isHidden: !0, name: "stub" };
//@ chunk-e6aww6q8.js:2033397-2033417 placement
var mrn = prn,
  grn = prn;
//@ chunk-e6aww6q8.js:2033417-2033468 placement = default (1)
var Oor = { isEnabled: () => !1, isHidden: !0, name: "stub" };
//@ chunk-e6aww6q8.js:2033468-2033480 placement
var hrn = Oor;
//@ chunk-e6aww6q8.js:2033480-2033531 placement = default (1)
var Nor = { isEnabled: () => !1, isHidden: !0, name: "stub" };
//@ chunk-e6aww6q8.js:2033531-2033543 placement
var yrn = Nor;
//@ chunk-e6aww6q8.js:2033543-2033594 placement = default (1)
var _rn = { isEnabled: () => !1, isHidden: !0, name: "stub" };
//@ chunk-e6aww6q8.js:2033594-2033645 placement = default (1)
var Srn = { isEnabled: () => !1, isHidden: !0, name: "stub" };
//@ chunk-e6aww6q8.js:2033645-2033696 placement = default (1)
var krn = { isEnabled: () => !1, isHidden: !0, name: "stub" };
//@ chunk-e6aww6q8.js:2033696-2033747 placement = default (1)
var brn = { isEnabled: () => !1, isHidden: !0, name: "stub" };
//@ chunk-e6aww6q8.js:2053003-2053054 placement = default (1)
var Grn = { isEnabled: () => !1, isHidden: !0, name: "stub" };
//@ chunk-e6aww6q8.js:2053054-2053105 placement = default (1)
var zrn = { isEnabled: () => !1, isHidden: !0, name: "stub" };
//@ chunk-e6aww6q8.js:2053105-2053156 placement = default (1)
var qrn = { isEnabled: () => !1, isHidden: !0, name: "stub" };
/**
 * WORKER_ONLY_SKILL_NAMES：autopilot/bugfix/dashboard/deep-research/docs/investigate。
 */
//@ chunk-e6aww6q8.js:2053156-2053236 placement
var mjo = ["autopilot", "bugfix", "dashboard", "deep-research", "docs", "investigate"];
//@ chunk-e6aww6q8.js:2053236-2053280 placement
function ezr(e) {
  return mjo.find((n) => n === e);
}
/**
 * gatedInternalCommand：构建期为 null。
 */
//@ chunk-e6aww6q8.js:2053280-2053302 placement
var c9e = null,
  bTe = null;
//@ chunk-e6aww6q8.js:2053302-2053315 placement
if (bTe) markInPlaceWriteForced();
/**
 * promoteMemoryCommands：构建期为 null；注册表里取 .promoteMemory/.promoteMemoryNonInteractive。
 */
//@ chunk-e6aww6q8.js:2053315-2054702 fingerprint = usageReport (0.431)
var promoteMemoryCommands = null,
  accountMemoryCommands = null,
  wTe = null,
  bZ = null,
  Krn = null,
  Vrn = null,
  Yrn = null,
  briefCommand = require("./chunk-gv7qjj2t.js").default,
  remoteControlCommand = require("./chunk-53mky9yr.js").default,
  daemonCommand = require("./chunk-0e9ty0k2.js").default,
  wZ = null,
  EZ = null,
  recapCommand = require("./chunk-66drwgm7.js").default,
  See = null,
  p9e = null,
  m9e = null,
  y9e = null,
  goalCommandModule = require("./chunk-nn4xbsmj.js"),
  goalCommand = goalCommandModule.default,
  goalNonInteractive = goalCommandModule.goalNonInteractive,
  workflowsCommand = require("./chunk-g8tswn69.js").default,
  webSetupCommand = require("./chunk-yddv4we7.js").default,
  Hrr = [],
  listAgentsCommand = require("./chunk-yxzqxbzv.js").default,
  vTe = null,
  Qrn = null,
  P2 = null,
  Tee = null,
  backgroundCommand = require("./chunk-3m7t4vj8.js").default,
  stopCommandModule = require("./chunk-adzz9hc5.js"),
  stopCommand = stopCommandModule?.default ?? null,
  stopNonInteractive = stopCommandModule?.stopNonInteractive ?? null,
  ETe = null,
  loginCommand = loginCommand_2(),
  usageReport = {
    type: "prompt",
    name: "insights",
    description: "Generate a report analyzing your Claude Code sessions",
    contentLength: 0,
    progressMessage: "analyzing your sessions",
    source: "builtin",
    disableModelInvocation: !0,
    policyGate: { policy: "allow_insights" },
    requires: { workspace: !0 },
    async getPromptForCommand(args, context) {
      let r = (await import("./chunk-yt6zn9vg.js")).default;
      if (r.type !== "prompt") throw Error("unreachable");
      return r.getPromptForCommand(args, context);
    },
  },
  INTERNAL_ONLY_COMMANDS = [
    ...(Krn ? [Krn] : []),
    ...(Vrn ? [Vrn] : []),
    ...(wTe ? [wTe] : []),
    wen,
    Uen,
    commitPushPrCommand,
    qZt,
    ...(ETe ? [ETe] : []),
    frn,
    versionCommand,
    versionNonInteractiveCommand,
    mrn,
    grn,
    Srn,
    hrn,
    yrn,
    Ten,
    Oen,
    Men,
    _rn,
    krn,
    brn,
    Crn,
    Grn,
    zrn,
    qrn,
    c9e,
    ...(Qrn ? [Qrn] : []),
    ...(P2 ? [P2] : []),
  ].filter(Boolean),
  filtered = [bTe, See, p9e, m9e, y9e, wZ, Tee, bZ, EZ].filter(Boolean);
/**
 * getRuntimeGatedCommandGroups：fleetFork/fleetBackground/daemon/skillDoctor/logout 五组 {open, whenOpen, whenClosed}。
 */
//@ chunk-e6aww6q8.js:2054702-2055052 layout
function getRuntimeGatedCommandGroups() {
  return {
    fleetFork: {
      open: () => isAgentsFleetEnabled() && !isEnvTruthy(env.IS_DEMO),
      whenOpen: [forkToBackgroundCommand, subtaskCommand, ...[]],
      whenClosed: [forkSubagentCommand],
    },
    fleetBackground: {
      open: () => isAgentsFleetEnabled(),
      whenOpen: [backgroundCommand, stopCommand],
      whenClosed: [],
    },
    daemon: { open: () => isDaemonWorkerRegistryEnabled(), whenOpen: [daemonCommand], whenClosed: [] },
    skillDoctor: {
      open: () => jF(),
      whenOpen: [skillDoctorCommand, skillDoctorNonInteractiveCommand],
      whenClosed: [],
    },
    logout: {
      open: () => !isUsing3PServices() || isGatewayAuthPinned(getGatewayAuth()),
      whenOpen: [logoutCommand],
      whenClosed: [],
    },
  };
}
/**
 * compactCommandList：filter(Boolean)；旧版名 filterCommandsForRemoteMode 配错（门面把它给了 gjo）。
 */
//@ chunk-e6aww6q8.js:2055052-2055101 file-local
function compactCommandList(commands) {
  return commands.filter((cmd) => Boolean(cmd));
}
/**
 * getRuntimeGatedGroup：按组 open() 取 whenOpen 或 whenClosed。
 */
//@ chunk-e6aww6q8.js:2055101-2055176 layout
function getRuntimeGatedGroup(groupName) {
  let group = getRuntimeGatedCommandGroups()[groupName];
  return compactCommandList(group.open() ? group.whenOpen : group.whenClosed);
}
/**
 * getRuntimeGatedBuiltinCommands：五个运行时门控组（fleetFork、fleetBackground、daemon、skillDoctor、logout）的 whenOpen 与 whenClosed 全部成员。
 */
//@ chunk-e6aww6q8.js:2055176-2055270 facade-exports
function getRuntimeGatedBuiltinCommands() {
  return Object.values(getRuntimeGatedCommandGroups()).flatMap((e) =>
    compactCommandList([...e.whenOpen, ...e.whenClosed]),
  );
}
/**
 * buildBuiltinCommandTable：按固定顺序列出全部内建命令对象（约 145 项，含运行时门控组与构建期为 null 的占位），filter(Boolean) 后返回；结果由 getBuiltinCommandTable 缓存在 state.builtinCommandTable。
 */
//@ chunk-e6aww6q8.js:2055270-2056322 facade-exports
function buildBuiltinCommandTable() {
  return [
    addDirCommand,
    addDirNonInteractiveCommand,
    cloudPluginsCommand,
    advisorCommand,
    advisorNonInteractiveCommand,
    agentsRemovedCommand,
    autoModeSetupCommand,
    autoModeSetupNonInteractiveCommand,
    autocompactCommand,
    autocompactNonInteractiveCommand,
    ...getRuntimeGatedGroup("fleetFork"),
    branchCommand,
    btwCommand,
    cdCommand,
    chromeCommand,
    clearCommand,
    colorCommand,
    colorNonInteractiveCommand,
    compactCommand,
    configCommand,
    configNonInteractiveCommand,
    vimMovedToConfigCommand,
    outputStyleMovedToConfigCommand,
    outputStyleCommand,
    copyCommand,
    desktopCommand,
    contextCommand,
    contextNonInteractiveCommand,
    diffCommand,
    ...getRuntimeGatedGroup("fleetBackground"),
    effortCommand,
    effortNonInteractiveCommand,
    wellbeingCommand,
    exitCommand,
    fastCommand,
    fastNonInteractiveCommand,
    focusCommand,
    focusNonInteractiveCommand,
    heapdumpCommand,
    helpCommand,
    ideCommand,
    initCommand,
    keybindingsCommand,
    installGithubAppCommand,
    installSlackAppCommand,
    mcpCommand,
    mcpNonInteractiveCommand,
    memoryCommand,
    importCommand,
    importNonInteractiveCommand,
    mobileCommand,
    pauseMemoryCommand,
    modelCommand,
    modelNonInteractiveCommand,
    remoteEnvCommand,
    remoteWorkflowCommand,
    workflowLaunchExecCommand,
    pluginCommand,
    releaseNotesCommand,
    reloadPluginsCommand,
    reloadSkillsCommand,
    renameCommand,
    renameNonInteractiveCommand,
    resumeCommand,
    setupBedrockCommand,
    setupVertexCommand,
    sessionCommand,
    skillsCommand,
    statusCommand,
    statuslineCommand,
    stickersCommand,
    themeCommand,
    tuiCommand,
    feedbackCommand,
    bugCommand,
    ultrareviewCommand,
    ultrareviewNonInteractiveCommand,
    ultraplanCommand,
    rewindCommand,
    securityReviewCommand,
    terminalSetupCommand,
    scrollSpeedCommand,
    restartCommand,
    ...(Yrn ? [Yrn] : []),
    upgradeCommand,
    usageCreditsCommand,
    usageCreditsNonInteractiveCommand,
    extraUsageCommand,
    extraUsageNonInteractiveCommand,
    rateLimitOptionsCommand,
    lowPriorityCommand,
    limitResetCommand,
    claimCreditCommand,
    proTrialExpiredCommand,
    usageCommand,
    usageNonInteractiveCommand,
    usageReport,
    webSetupCommand,
    briefCommand,
    ...(remoteControlCommand ? [remoteControlCommand] : []),
    ...getRuntimeGatedGroup("daemon"),
    voiceCommand,
    ...(recapCommand ? [recapCommand] : []),
    ...getRuntimeGatedGroup("skillDoctor"),
    permissionsCommand,
    planCommand,
    powerupCommand,
    privacySettingsCommand,
    goalCommand,
    goalNonInteractive,
    hooksCommand,
    loopsCommand,
    exportCommand,
    sandboxCommand,
    loginCommand,
    createDesignLoginCommand(),
    designConsentCommand,
    designRevokeCommand,
    ...getRuntimeGatedGroup("logout"),
    passesCommand,
    ...(listAgentsCommand ? [listAgentsCommand] : []),
    ...(vTe ? [vTe] : []),
    tasksCommand,
    autofixPrCommand,
    ...[],
    ...Hrr,
    teleportCommand,
    workflowsCommand,
    artifactsCommand,
    teamOnboardingCommand,
    radioCommand,
    ...(See ? [See] : []),
    ...(p9e ? [p9e] : []),
    ...(m9e ? [m9e] : []),
    ...(y9e ? [y9e] : []),
    ...(wZ ? [wZ] : []),
    ...(Tee ? [Tee] : []),
    ...(EZ ? [EZ] : []),
    ...ENTERPRISE_UPSELL_COMMANDS,
    ...(bTe ? [bTe] : []),
    ...(promoteMemoryCommands && !isEnvTruthy(env.IS_DEMO)
      ? [promoteMemoryCommands.promoteMemory, promoteMemoryCommands.promoteMemoryNonInteractive]
      : []),
    ...(accountMemoryCommands && !isEnvTruthy(env.IS_DEMO)
      ? [
          accountMemoryCommands.memoryAccount,
          accountMemoryCommands.memoryNotes,
          accountMemoryCommands.localMemoryToAccount,
        ]
      : []),
    ...(accountMemoryCommands ? [accountMemoryCommands.accountMemorySwitch] : []),
    ...(bZ && !isEnvTruthy(env.IS_DEMO) ? [bZ] : []),
    ...[],
  ];
}
/**
 * REMOTE_SAFE_COMMANDS：远程模式（--remote）下仍可在本地执行的命令集合。
 */
//@ chunk-e6aww6q8.js:2056322-2056969 facade-exports
var REMOTE_SAFE_COMMANDS = new Set([
    sessionCommand,
    exitCommand,
    helpCommand,
    themeCommand,
    colorCommand,
    ...(Tee ? [Tee] : []),
    usageCommand,
    copyCommand,
    feedbackCommand,
    bugCommand,
    mobileCommand,
    releaseNotesCommand,
    exportCommand,
    terminalSetupCommand,
    privacySettingsCommand,
    focusCommand,
    wellbeingCommand,
    cloudPluginsCommand,
    hooksCommand,
    configCommand,
    statusCommand,
    vimMovedToConfigCommand,
    keybindingsCommand,
    ...(wTe ? [wTe] : []),
    ...(bZ ? [bZ] : []),
    powerupCommand,
    passesCommand,
    usageCreditsCommand,
    extraUsageCommand,
    upgradeCommand,
    loginCommand,
    rateLimitOptionsCommand,
    claimCreditCommand,
    ...(c9e ? [c9e] : []),
    ...(wZ ? [wZ] : []),
    ...(EZ ? [EZ] : []),
    ...[],
    ...(daemonCommand ? [daemonCommand] : []),
    renameCommand,
    btwCommand,
    contextCommand,
    diffCommand,
    planCommand,
    advisorCommand,
    effortCommand,
    fastCommand,
    modelCommand,
    versionCommand,
    clearCommand,
    compactCommand,
    autocompactNonInteractiveCommand,
    goalNonInteractive,
    ...(P2 ? [P2] : []),
    recapCommand,
    reloadSkillsCommand,
    pauseMemoryCommand,
    agentsRemovedCommand,
    reloadPluginsCommand,
    ...(ETe ? [ETe] : []),
    skillDoctorCommand,
    skillDoctorNonInteractiveCommand,
    mcpCommand,
    mcpNonInteractiveCommand,
    addDirCommand,
    addDirNonInteractiveCommand,
    permissionsCommand,
    sandboxCommand,
    tasksCommand,
    workflowsCommand,
    rewindCommand,
    memoryCommand,
    ...(accountMemoryCommands ? [accountMemoryCommands.memoryNotes] : []),
    skillsCommand,
    pluginCommand,
  ]),
  BRIDGE_SAFE_COMMANDS = new Set([
    autoModeSetupNonInteractiveCommand,
    compactCommand,
    autocompactNonInteractiveCommand,
    clearCommand,
    usageNonInteractiveCommand,
    contextNonInteractiveCommand,
    configNonInteractiveCommand,
    outputStyleCommand,
    goalNonInteractive,
    exitNonInteractiveCommand,
    ...(stopNonInteractive ? [stopNonInteractive] : []),
    versionNonInteractiveCommand,
    usageCreditsNonInteractiveCommand,
    extraUsageNonInteractiveCommand,
    renameNonInteractiveCommand,
    colorNonInteractiveCommand,
    ...(vTe ? [vTe] : []),
    fastNonInteractiveCommand,
    focusNonInteractiveCommand,
    effortNonInteractiveCommand,
    advisorNonInteractiveCommand,
    modelNonInteractiveCommand,
    mcpNonInteractiveCommand,
    ...(P2 ? [P2] : []),
    ...(recapCommand ? [recapCommand] : []),
    skillDoctorNonInteractiveCommand,
    ...(listAgentsCommand ? [listAgentsCommand] : []),
    ...(See ? [See] : []),
    reloadPluginsCommand,
    reloadSkillsCommand,
    restartCommand,
  ]);
/**
 * isBridgeSafeCommand：prompt 命令一律可桥接；local-jsx 不可；local 命令需在 BRIDGE_SAFE_COMMANDS 里。
 */
//@ chunk-e6aww6q8.js:2056969-2057141 facade-exports = isBridgeSafeCommand (0.82)
function isBridgeSafeCommand(cmd) {
  if (cmd.type === "local-jsx") return !1;
  if (cmd.type === "prompt") return cmd.disableBridgeInvocation !== !0;
  if (BRIDGE_SAFE_COMMANDS.has(cmd)) return cmd !== restartCommand || !1;
  return isPluginLocalCommand(cmd) && findBridgeFallback(cmd) === void 0;
}
/**
 * admitsBridgeAuthor：判断桥接端提交的斜杠命令是否允许执行（插件注册的 local 命令需要能找到桥接安全的孪生命令）。
 */
//@ chunk-e6aww6q8.js:2057141-2057229 facade-exports
function admitsBridgeAuthor(cmd, submission) {
  if (!isPluginLocalCommand(cmd)) return !0;
  return submission.origin?.kind === "human" && !submission.relayAuthored;
}
/**
 * BRIDGE_TWINS_FOR_PLUGIN_COMMANDS：new Set([contextNonInteractive])：插件同名 local 命令也可由这些桥接安全孪生代答。
 */
//@ chunk-e6aww6q8.js:2057229-2057252 layout
var BRIDGE_TWINS_FOR_PLUGIN_COMMANDS = new Set([contextNonInteractiveCommand]);
/**
 * findBridgeFallback：为插件注册的同名 local 命令找到可代答的桥接安全内建孪生命令。
 */
//@ chunk-e6aww6q8.js:2057252-2057408 facade-exports
function findBridgeFallback(cmd) {
  let isPluginLocal = isPluginLocalCommand(cmd);
  if (cmd.type !== "local-jsx" && !isPluginLocal) return;
  for (let twin of BRIDGE_SAFE_COMMANDS)
    if (twin.name === cmd.name && twin.type === "local")
      return isPluginLocal && !BRIDGE_TWINS_FOR_PLUGIN_COMMANDS.has(twin) ? void 0 : twin;
  return;
}
/**
 * isBridgeDispatchable：命令能否通过桥接派发（综合 isBridgeSafeCommand 与插件孪生回退）。
 */
//@ chunk-e6aww6q8.js:2057408-2057455 facade-exports
function isBridgeDispatchable(e) {
  return isBridgeSafeCommand(e) || findBridgeFallback(e) !== void 0;
}
/**
 * filterCommandsForRemoteMode：只保留 REMOTE_SAFE_COMMANDS 中的命令。
 */
//@ chunk-e6aww6q8.js:2057455-2057577 facade-exports
function filterCommandsForRemoteMode(commands) {
  return commands.filter(
    (cmd) =>
      (cmd.type === "prompt" &&
        (cmd.source === "builtin" || cmd.source === "bundled") &&
        isUsableWithoutWorkspace(cmd)) ||
      REMOTE_SAFE_COMMANDS.has(cmd),
  );
}
/**
 * withWorkerOnlyCommands：在命令列表后补上 Worker 环境专有的技能名（不与一方命令重名时）。
 */
//@ chunk-e6aww6q8.js:2057577-2057965 facade-exports = command (0.607)
function withWorkerOnlyCommands(commands, workerCommandNames) {
  if (workerCommandNames === null) return commands;
  let isFirstParty = firstPartyCommandNameCheck(),
    taken = new Set(commands.flatMap((y) => [y.name, getCommandName_2(y), ...(y.aliases ?? [])])),
    extras = Array.from(workerCommandNames)
      .filter(
        (y) =>
          !taken.has(y) &&
          !isFirstParty(y) &&
          ezr(foldName_2(y)) === void 0 &&
          !y.startsWith("mcp__") &&
          y.split(":").every(isSafeSkillName),
      )
      .map((y) => ({
        type: "prompt",
        name: y,
        description: "",
        progressMessage: "",
        contentLength: 0,
        source: "mcp",
        getPromptForCommand: async () => [],
      }));
  return extras.length > 0 ? [...commands, ...extras] : commands;
}
/**
 * getHumanFacingDescription：取命令面向用户的描述（技能优先用 description，过长时截断）。
 */
//@ chunk-e6aww6q8.js:2057965-2058072 facade-exports
function getHumanFacingDescription(cmd) {
  if (cmd.type !== "prompt" || !isBuiltinCommand(cmd)) return cmd.description;
  return cmd.menuDescription || cmd.description;
}
/**
 * formatDescriptionWithSource：描述后附加来源标注，例如 (plugin X)、(user)、(project)、(MCP)。
 */
//@ chunk-e6aww6q8.js:2058072-2058536 facade-exports = formatDescriptionWithSource (0.774)
function formatDescriptionWithSource(cmd, description = cmd.description) {
  if (cmd.type !== "prompt") return description;
  if (cmd.kind === "workflow") return `${description} (dynamic workflow)`;
  if (cmd.source === "plugin") {
    if (i3(cmd.pluginInfo?.repository)) return `${description} (${CLAUDE_AI_SYNC_LABEL})`;
    let pluginManifest = cmd.pluginInfo?.pluginManifest;
    if (pluginManifest) return `(${getPluginDisplayName(pluginManifest)}) ${description}`;
    return `${description} (plugin)`;
  }
  if (
    cmd.source === "builtin" ||
    cmd.source === "mcp" ||
    cmd.source === "memoryStore" ||
    cmd.source === "bundled"
  )
    return description;
  if (cmd.loadedFrom === "syncedSkills") return `${description} (${CLAUDE_AI_SYNC_LABEL})`;
  return `${description} (${getSettingSourceName(cmd.source)})`;
}
/**
 * toSlashCommands：把命令列表转换为 SDK/控制协议用的 slash_commands 条目（name、description、argumentHint、aliases）。
 */
//@ chunk-e6aww6q8.js:2058536-2058596 facade-exports
function toSlashCommands(e) {
  let n = folderNameAliasCheck();
  return mergeClients(e).map((r) => toSlashCommand(r, n));
}
/**
 * toSlashCommand：单条转换；目录同名别名（named-folder alias）与内建命令的 aliases 会展开为额外拼写。
 */
//@ chunk-e6aww6q8.js:2058596-2058962 facade-exports
function toSlashCommand(cmd, isFolderAlias) {
  let displayName = getCommandName_2(cmd),
    isBuiltin = isBuiltinCommand(cmd),
    qualifiedName =
      cmd.name !== displayName &&
      (cmd.name.includes(":") ||
        (cmd.type === "prompt" && !cmd.isMcp && !isBuiltin && isFolderAlias(cmd.name)))
        ? cmd.name
        : void 0,
    aliases = cmd.aliases?.filter((w) => w !== displayName),
    allAliases =
      qualifiedName && !aliases?.includes(qualifiedName) ? [...(aliases ?? []), qualifiedName] : aliases;
  return {
    name: displayName,
    description: formatDescriptionWithSource(cmd),
    argumentHint: cmd.argumentHint || "",
    aliases: allAliases?.length ? allAliases : void 0,
    ...(isBuiltin && { builtin: !0 }),
    ...(cmd.registeredBy !== void 0 && { plugin: cmd.registeredBy }),
  };
}
/**
 * 插件 ID 的市场部分是否为 builtin（内置插件）。
 */
//@ chunk-e6aww6q8.js:2058962-2059003 facade-exports = BUILTIN_MARKETPLACE_NAME (1)
function isBuiltinCommand(e) {
  return getCommandOriginKind(e) === "builtin";
}
/**
 * bridgeAdvertisedCommands：向桥接端（claude.ai 远程会话）公布的命令列表，只含可桥接派发者。
 */
//@ chunk-e6aww6q8.js:2059003-2059045 facade-exports
function bridgeAdvertisedCommands(e) {
  return mergeClients(e).filter(isBridgeDispatchable);
}
/**
 * toBridgeSlashCommands：把可桥接命令转换为带来源和描述的公布条目。
 */
//@ chunk-e6aww6q8.js:2059045-2059523 facade-exports
function toBridgeSlashCommands(commands) {
  let result = [],
    isFolderAlias = folderNameAliasCheck();
  for (let cmd of bridgeAdvertisedCommands(commands)) {
    if (cmd.isHidden) continue;
    let displayName = getCommandName_2(cmd),
      advertisedName;
    if (findCommand(displayName, commands) === cmd) advertisedName = displayName;
    else if (cmd.name !== displayName && findCommand(cmd.name, commands) === cmd) advertisedName = cmd.name;
    else continue;
    let source = findBridgeFallback(cmd) ?? cmd,
      described =
        source.menuDescription != null && source.menuDescription !== ""
          ? { ...source, description: source.menuDescription }
          : source,
      entry = toSlashCommand({ ...described, userFacingName: () => advertisedName }, isFolderAlias);
    if (isBuiltinCommand(cmd)) entry.builtin = !0;
    else delete entry.builtin;
    let aliases = (source !== cmd ? (cmd.aliases ?? []) : (entry.aliases ?? [])).filter(
      (Z) => Z !== advertisedName && findCommand(Z, commands) === cmd,
    );
    ((entry.aliases = aliases.length ? aliases : void 0), result.push(entry));
  }
  return result;
}
/**
 * isPluginLocalCommand：type=local 且 loadedFrom=plugin（函数钩子插件注册的命令）。
 */
//@ chunk-e6aww6q8.js:2059523-2059588 layout
function isPluginLocalCommand(e) {
  return e.type === "local" && e.loadedFrom === "plugin";
}
/**
 * addShippedCommandSpellings：运行时门控内建、内建技能、内建插件技能名都加入集合。
 */
//@ chunk-e6aww6q8.js:2059588-2059665 layout
function addShippedCommandSpellings(e) {
  addRuntimeGatedCommandSpellings(e);
  for (let n of getRegisteredBundledSkillsIgnoringKillSwitch()) addCommandSpellings(e, n);
  for (let n of builtinPluginSkillNames()) addSpelling(e, n);
}
/**
 * addRuntimeGatedCommandSpellings：对 getRuntimeGatedBuiltinCommands() 逐个 addCommandSpellings。
 */
//@ chunk-e6aww6q8.js:2059665-2059708 layout
function addRuntimeGatedCommandSpellings(e) {
  for (let n of getRuntimeGatedBuiltinCommands()) addCommandSpellings(e, n);
}
/**
 * getReservedSpellingsFor：state.reservedSpellingsFor 缓存：命令列表占用的全部拼写。
 */
//@ chunk-e6aww6q8.js:2059708-2059852 layout
function getReservedSpellingsFor(e) {
  return getHostState().reservedSpellingsFor(e, () => {
    let n = new Set();
    for (let r of e) if (r.loadedFrom !== "syncedSkills") addCommandSpellings(n, r);
    return (addShippedCommandSpellings(n), n);
  });
}
/**
 * getBuiltinCommandTable：state.builtinCommandTable ??= buildBuiltinCommandTable()。
 */
//@ chunk-e6aww6q8.js:2059852-2059936 layout
function getBuiltinCommandTable() {
  let state = getHostState();
  return ((state.builtinCommandTable ??= buildBuiltinCommandTable()), state.builtinCommandTable);
}
/**
 * builtInCommandNames：内建命令占用的全部拼写（name、显示名、aliases，规范化后）的集合，用于技能/插件命名冲突检查。
 */
//@ chunk-e6aww6q8.js:2059936-2060068 facade-exports
function builtInCommandNames() {
  let e = getHostState();
  return (
    (e.builtinCommandNames ??= new Set(
      getBuiltinCommandTable().flatMap((n) => [n.name, ...(n.aliases ?? [])]),
    )),
    e.builtinCommandNames
  );
}
/**
 * shippedCommandNames：内建表 + 运行时门控命令 + 发行内建技能/内建插件技能的全部拼写，用于遥测时判断命令名是否可原样上报。
 */
//@ chunk-e6aww6q8.js:2060068-2060223 facade-exports
function shippedCommandNames() {
  let e = getHostState();
  return (
    (e.shippedCommandNames ??= new Set([
      ...builtInCommandNames(),
      ...getBundledSkills().flatMap((n) => [n.name, ...(n.aliases ?? [])]),
      ...builtinPluginSkillNames(),
    ])),
    e.shippedCommandNames
  );
}
/**
 * isFirstPartyCommandName：名字是否属于一方命令拼写。
 */
//@ chunk-e6aww6q8.js:2060223-2060255 facade-exports
function isFirstPartyCommandName(e) {
  return firstPartyCommandNameCheck()(e);
}
/**
 * firstPartyCommandNameCheck：名字是否被一方（内建/发行技能）命令占用的检查器。
 */
//@ chunk-e6aww6q8.js:2060255-2060306 facade-exports
function firstPartyCommandNameCheck() {
  let e = collectBuiltinCommandSpellings();
  return (n) => e.has(foldName_2(n));
}
/**
 * folderNameAliasCheck：插件命名目录别名（named-folder）是否与已有命令冲突。
 */
//@ chunk-e6aww6q8.js:2060306-2060368 facade-exports
function folderNameAliasCheck() {
  let e;
  return (n) =>
    isSafeSkillName(n) && !isQualifiedToolReference(foldName_2(n), (e ??= collectBuiltinCommandSpellings()));
}
/**
 * collectBuiltinCommandSpellings：内建表 + 发行内建技能的所有拼写。
 */
//@ chunk-e6aww6q8.js:2060368-2060439 layout
function collectBuiltinCommandSpellings() {
  let spellings = new Set();
  for (let n of getBuiltinCommandTable()) addCommandSpellings(spellings, n);
  return (addShippedCommandSpellings(spellings), spellings);
}
/**
 * shippedCommandNameForAnalytics：命令名属于发行内建拼写时原样返回，否则返回 "custom"，避免上报用户自定义命令名。
 */
//@ chunk-e6aww6q8.js:2060439-2060481 facade-exports
function shippedCommandNameForAnalytics(e) {
  return sYo(e, shippedCommandNames().has(e));
}
/**
 * getBuiltinCommands：返回缓存的内建命令表（不含技能、插件、MCP）。
 */
//@ chunk-e6aww6q8.js:2060481-2060507 facade-exports
function getBuiltinCommands() {
  return getBuiltinCommandTable();
}
/**
 * getSkills：并发加载技能目录、插件技能、发行内建技能与内建插件技能；任一来源失败只记日志并返回空。
 */
//@ chunk-e6aww6q8.js:2060507-2061509 fingerprint = getSkills (0.755)
async function getSkills(cwd, storage) {
  let failureReason = null,
    skillDirFailed = !1,
    pluginSkillsFailed = !1;
  try {
    let [y, pluginSkills] = await Promise.all([
        getSkillDirCommandsCached(cwd, storage).catch((err) => {
          if (isSyscallError(err))
            logForDebugging(
              `Skill directory commands failed to load (${err.code}), continuing without them`,
              { level: "error" },
            );
          else
            (logError(toError(err)),
              logForDebugging("Skill directory commands failed to load, continuing without them"));
          return ((failureReason = "cmd_load_skill_dir_failed"), (skillDirFailed = !0), []);
        }),
        loadPluginSkills(storage).catch(
          (err) => (
            logError(toError(err)),
            (failureReason = "cmd_load_plugin_skills_failed"),
            (pluginSkillsFailed = !0),
            logForDebugging("Plugin skills failed to load, continuing without them"),
            []
          ),
        ),
      ]),
      bundledSkills = getBundledSkills(),
      builtinPluginSkills = epr();
    if (
      (logForDebugging(
        `getSkills returning: ${y.length} skill dir commands, ${pluginSkills.length} plugin skills, ${bundledSkills.length} bundled skills, ${builtinPluginSkills.length} builtin plugin skills`,
      ),
      failureReason)
    )
      logFeatureBad("cmd_load", failureReason);
    else logFeatureOk("cmd_load");
    return {
      skillDirCommands: y,
      pluginSkills: pluginSkills,
      bundledSkills: bundledSkills,
      builtinPluginSkills: builtinPluginSkills,
      trustedNamesFailedToLoad: skillDirFailed || pluginSkillsFailed,
    };
  } catch (err) {
    return (
      logError(toError(err)),
      logFeatureSad("cmd_load", "cmd_load_skills_failed"),
      logForDebugging("Unexpected error in getSkills, returning empty"),
      {
        skillDirCommands: [],
        pluginSkills: [],
        bundledSkills: [],
        builtinPluginSkills: [],
        trustedNamesFailedToLoad: !0,
      }
    );
  }
}
//@ chunk-e6aww6q8.js:2061509-2061615 fingerprint = getWorkflowCommands (0.344)
var {
  getWorkflowCommands: getWorkflowCommands,
  invalidateWorkflowCache: invalidateWorkflowCache,
  warmWorkflows: warmWorkflows,
} = require("./chunk-qzez70vf.js");
/**
 * commandsMemoKey：命令缓存键，由 cwd、存储 v5 开关与隐藏插件列表组成。
 */
//@ chunk-e6aww6q8.js:2061615-2061737 facade-exports
function commandsMemoKey(cwd, hiddenPlugins = getHeldBackSyncedPlugins(), storageV5 = Lar()) {
  return `${getDynamicSkillStateKeyExport()}:${ppr()}:${getIsNonInteractiveSession()}:${getSkillsSyncVetoed()}:${getAccountCacheKey()}:${_8()}:${storageV5}:${AZt(hiddenPlugins)}${W1()}${keyOrNull(cwd)}`;
}
/**
 * loadAllCommands：同旧版 loadAllCommands：按 commandsMemoKey 缓存 loadAllCommandsUncached。
 */
//@ chunk-e6aww6q8.js:2061737-2061820 layout
function loadAllCommands(cwd, storage, storageV5) {
  return getOrCreate(getHostState().loadedCommands, commandsMemoKey(cwd, void 0, storageV5), () =>
    loadAllCommandsUncached(cwd, storage, storageV5),
  );
}
/**
 * warmCommandSourceCaches：启动时并发预热技能目录、插件命令/技能与内建技能的缓存，记录耗时。
 */
//@ chunk-e6aww6q8.js:2061820-2062015 facade-exports
async function warmCommandSourceCaches(cwd, storage) {
  try {
    let startedAt = performance.now();
    await Promise.allSettled([
      Promise.allSettled([getSkillDirCommandsCached(cwd, storage), loadPluginSkills(storage)]).then(() =>
        Br("skills_load_ms", performance.now() - startedAt, startedAt),
      ),
      getPluginCommands(storage),
      warmWorkflows(cwd, storage),
    ]);
  } catch {}
}
/**
 * markBareNameReserved：syncedSkills 命令加 bareNameReserved:true。
 */
//@ chunk-e6aww6q8.js:2062015-2062187 layout
function markBareNameReserved(cmd) {
  if (
    cmd.type !== "prompt" ||
    cmd.loadedFrom !== "syncedSkills" ||
    cmd.bareNameReserved ||
    cmd.unqualifiedName == null ||
    getSyncedSkillUnqualifiedAlias(cmd) !== void 0
  )
    return cmd;
  return { ...cmd, bareNameReserved: !0 };
}
/**
 * loadAllCommandsUncached：合并技能目录、附加目录技能、工作流、插件命令、插件技能、内建技能、内建插件技能与内建表；校验名字、处理 claude.ai 同步技能与保留名、丢弃被遮蔽的 fallback 技能、剥离冲突别名，并上报冲突遥测。
 */
//@ chunk-e6aww6q8.js:2062187-2063538 layout
async function loadAllCommandsUncached(cwd, storage, storageV5) {
  let startedAt = performance.now(),
    [
      {
        skillDirCommands: skillDirCommands,
        pluginSkills: pluginSkills,
        bundledSkills: bundledSkills,
        builtinPluginSkills: builtinPluginSkills,
        trustedNamesFailedToLoad: trustedNamesFailedToLoad,
      },
      pluginCommands,
      workflowCommands,
    ] = await Promise.all([
      getSkills(cwd, storage).then(
        (We) => (Br("skills_load_ms", performance.now() - startedAt, startedAt), We),
      ),
      getPluginCommands(storage),
      getWorkflowCommands(cwd, storage),
    ]),
    localSkillDirCommands = skillDirCommands.filter((We) => We.loadedFrom !== "syncedSkills"),
    listed = checkCommandListable(
      [
        ...localSkillDirCommands,
        ...(getHostState().attachedFolderSkills?.() ?? []),
        ...workflowCommands,
        ...pluginCommands,
        ...pluginSkills,
        ...bundledSkills,
        ...builtinPluginSkills,
        ...getBuiltinCommandTable(),
      ],
      (We) => {
        let ze = vZ(We.name);
        refuseReservedSkillName({
          name: ze ? We.name : getCommandName_2(We),
          path: We.type === "prompt" ? We.skillRoot : void 0,
          change: We.kind === "workflow" ? "workflow-name" : ze ? "path" : "frontmatter-name",
        });
      },
    ),
    syncedSkills = skillDirCommands.filter((We) => We.loadedFrom === "syncedSkills"),
    reserved = new Set();
  if (syncedSkills.length > 0)
    (addNonSyncedSpellings(reserved, listed),
      addNonSyncedSpellings(reserved, EVe()),
      addShippedCommandSpellings(reserved));
  if (trustedNamesFailedToLoad && syncedSkills.length > 0)
    logForDebugging(
      `[skills] local or plugin skills failed to load; ${syncedSkills.length} synced skill(s) answer only to anthropic-skills:<name> this session because their bare names cannot be checked for collisions`,
    );
  let acceptedSyncedSkills = admitSyncedSkills(
      trustedNamesFailedToLoad ? syncedSkills.map(cGe) : syncedSkills,
      reserved,
      (We) =>
        logForDebugging(
          `[skills] dropping synced skill '${We.name}' (display '${getCommandName_2(We)}'): its name is blank, or another command or an earlier synced skill already owns that namespaced name`,
        ),
    ).map(markBareNameReserved),
    [reservedNameCommands, otherCommands] = SS(listed, (We) => k2e(We)),
    result = shedReservedAliases(
      dropShadowedFallbackSkills([...otherCommands, ...acceptedSyncedSkills, ...reservedNameCommands]),
      storageV5,
    );
  if (trustedNamesFailedToLoad) getHostState().markLoadedResultMissingTrustedNames(result);
  return (
    groupPluginSourcesByName(
      "command",
      result.map((We) => ({ name: We.name, source: We.type === "prompt" ? We.source : "builtin" })).reverse(),
      { resolves: !0 },
    ),
    logRefusedReservedSkillNames(),
    result
  );
}
/**
 * logRefusedReservedSkillNames：一次性上报 skill_reserved_namespace 遥测。
 */
//@ chunk-e6aww6q8.js:2063538-2063886 layout
function logRefusedReservedSkillNames() {
  let refusedReservedSkillNames = getHostState().refusedReservedSkillNames();
  if (refusedReservedSkillNames.length === 0 || !claimOnce().claim("skill_reserved_namespace_refused"))
    return;
  let n = { refused: refusedReservedSkillNames.length };
  for (let { name: r, change: change } of refusedReservedSkillNames) {
    let y = [
      `ns_${(getReservedSkillNamespace(r) ?? "unknown").replaceAll("-", "_")}`,
      `kind_${change.replaceAll("-", "_")}`,
    ];
    for (let S of y) n[S] = (n[S] ?? 0) + 1;
  }
  logFeatureSad("skill_reserved_namespace", "names_refused", n);
}
/**
 * getCommands：会话可用的全部斜杠命令。内部调用 assembleCommands（加载、可用性/启用过滤、动态技能插入），再经命令集钩子（插件 hookedCommands）与插件隐藏表处理；按 cwd+存储+隐藏插件做键缓存。
 */
//@ chunk-e6aww6q8.js:2063886-2063994 facade-exports
async function getCommands(cwd, storage, hiddenPlugins = getHeldBackSyncedPlugins(), storageV5 = Lar()) {
  let commands = await hookedCommands(await assembleCommands(cwd, storage, storageV5));
  return hiddenPlugins.size === 0
    ? commands
    : hideSkillsBehindPlugins(commands, hiddenPlugins, getSyncedSkillCommands());
}
/**
 * getHiddenSyncedSkills：被保留名挡住而未提供的 claude.ai 同步技能。
 */
//@ chunk-e6aww6q8.js:2063994-2064129 facade-exports
async function getHiddenSyncedSkills(cwd, storage, hiddenPlugins) {
  if (hiddenPlugins.size === 0) return [];
  return (await getCommands(cwd, storage, hiddenPlugins)).filter(
    (s) => s.type === "prompt" && s.hiddenBehindPlugin !== void 0,
  );
}
/**
 * assembleCommands：getCommands 的主体。按 availability 与 isCommandEnabled 过滤；附加目录里的项目技能去重；处理条件技能、同步技能；嵌套 .claude/skills 的技能按目录加作用域前缀；把动态技能插入到第一个内建命令之前。
 */
//@ chunk-e6aww6q8.js:2064129-2067775 layout
async function assembleCommands(cwd, storage, storageV5) {
  Cei(getBuiltinCommands);
  let allCommands = await loadAllCommands(cwd, storage, storageV5),
    shadowedProjectSkills = new Set();
  if (getAdditionalDirectoriesForClaudeMd().length > 0) {
    let hn = new Set();
    for (let ho of allCommands) {
      let yn =
        ho.type === "prompt" && ho.loadedFrom === "skills" && ho.source === "projectSettings"
          ? getSkillProjectRoot(ho)
          : null;
      if (
        yn !== null &&
        hn.has(ho.name) &&
        (cwd === null || !isPathWithin(yn, cwd, { alreadyComparable: !0 })) &&
        findAdditionalDirRoot(yn) !== null
      ) {
        shadowedProjectSkills.add(ho);
        continue;
      }
      hn.add(ho.name);
      for (let Kn of ho.aliases ?? []) hn.add(Kn);
    }
  }
  let baseCommands =
      shadowedProjectSkills.size === 0
        ? allCommands
        : allCommands.filter((hn) => !shadowedProjectSkills.has(hn)),
    syncAllowed = !getSkillsSyncVetoed(),
    withTrustedNames = getHostState().loadedResultIsMissingTrustedNames(allCommands)
      ? (hn) => hn.map((ho) => (ho.loadedFrom === "syncedSkills" ? cGe(ho) : ho))
      : (hn) => hn,
    dynamicSkills = getDynamicSkills(),
    realRootByCommand = getHostState().realSkillRootByCommand;
  if (shadowedProjectSkills.size > 0) {
    let hn = [];
    for (let ho of [...dynamicSkills, ...shadowedProjectSkills]) {
      if (ho.type !== "prompt" || !ho.skillRoot || realRootByCommand.has(ho)) continue;
      hn.push(
        realpathNativeAsync(ho.skillRoot).then((yn) => {
          if (yn !== null) realRootByCommand.set(ho, yn);
        }),
      );
    }
    await Promise.all(hn);
  }
  let q = new Set(
      dynamicSkills.flatMap((hn) =>
        hn.type === "prompt" && hn.skillRoot ? [realRootByCommand.get(hn) ?? resolve_29(hn.skillRoot)] : [],
      ),
    ),
    dynamicAndShadowed = withTrustedNames([
      ...(syncAllowed ? dynamicSkills : dynamicSkills.filter((hn) => !isSyncedSkill(hn))),
      ...[...shadowedProjectSkills].filter(
        (hn) =>
          !(
            hn.type === "prompt" &&
            hn.skillRoot &&
            q.has(realRootByCommand.get(hn) ?? resolve_29(hn.skillRoot))
          ),
      ),
    ]),
    hostCatalogSkills = syncAllowed
      ? SS(
          withTrustedNames(getSyncedSkillCommands()).filter((hn) => !isKilledHostCatalogSkill(hn)),
          (hn) => !isHostCatalogSkill(hn),
        ).flat()
      : [],
    dropHostDuplicates =
      hostSkillCatalog() === void 0
        ? (hn) => hn
        : (hn) =>
            hideDuplicateCatalogSkills(hn, [...dynamicAndShadowed, ...hostCatalogSkills]).filter(
              (ho) => !isKilledHostCatalogSkill(ho),
            ),
    extraCommands = dropHostDuplicates(dynamicAndShadowed),
    filteredBase = dropHostDuplicates(baseCommands).filter(
      (hn) => meetsAvailabilityRequirement(hn) && isCommandEnabled(hn),
    );
  if (extraCommands.length === 0 && hostCatalogSkills.length === 0) return filteredBase;
  let scopeCache = new Map(),
    scopeOf = (hn) => {
      let ho = scopeCache.get(hn);
      if (ho === void 0) ((ho = getSkillScopeLabel(hn, cwd)), scopeCache.set(hn, ho));
      return ho;
    },
    offeredExtras = dropAmbiguousScopedSkills(
      extraCommands.filter((hn) => meetsAvailabilityRequirement(hn) && isCommandEnabled(hn)),
      scopeOf,
      filteredBase,
    ),
    needsReservedCheck =
      hostCatalogSkills.length > 0 ||
      offeredExtras.some((hn) => hn.loadedFrom === "syncedSkills") ||
      filteredBase.some((hn) => hn.loadedFrom === "syncedSkills"),
    reserved = new Set(needsReservedCheck ? getReservedSpellingsFor(allCommands) : []);
  if (needsReservedCheck) {
    (addNonSyncedSpellings(reserved, offeredExtras), addNonSyncedSpellings(reserved, EVe()));
    for (let hn of offeredExtras) {
      if (hn.loadedFrom === "syncedSkills" || isFallbackSkill(hn)) continue;
      let ho = scopeOf(hn);
      if (ho) addSpelling(reserved, joinScopedName(ho, hn.name));
    }
  }
  let base = needsReservedCheck
      ? admitSyncedSkills(filteredBase, reserved).map(markBareNameReserved)
      : filteredBase,
    baseNames = new Set(),
    baseSkillRoots = new Set();
  for (let hn of base) {
    baseNames.add(hn.name);
    for (let ho of hn.aliases ?? []) baseNames.add(ho);
    if (hn.type === "prompt" && hn.skillRoot) baseSkillRoots.add(hn.skillRoot);
  }
  let nameCounts = new Map();
  for (let hn of offeredExtras) {
    if (isFallbackSkill(hn) || hn.loadedFrom === "syncedSkills") continue;
    nameCounts.set(hn.name, (nameCounts.get(hn.name) ?? 0) + 1);
  }
  let Et = new Set(),
    yt = new Set(),
    gt = new Map();
  for (let hn of offeredExtras) {
    let ho = scopeOf(hn),
      yn = getSkillProjectRoot(hn);
    if (ho === null || yn === null || hn.type !== "prompt" || !hn.skillRoot) continue;
    let Kn = joinScopedName(ho, hn.name),
      Xn = cwd === null ? null : relative_26(cwd, yn);
    if (Xn !== null && !Xn.startsWith("..") && !isAbsolute_34(Xn)) {
      yt.add(Kn);
      continue;
    }
    Et.add(hn);
    let fo = gt.get(Kn) ?? new Set();
    (fo.add(realRootByCommand.get(hn) ?? resolve_29(hn.skillRoot)), gt.set(Kn, fo));
  }
  let inserted = [],
    insertedNames = new Set();
  for (let hn of offeredExtras) {
    if (hn.type === "prompt" && hn.skillRoot && baseSkillRoots.has(hn.skillRoot)) continue;
    if (hn.loadedFrom === "syncedSkills") {
      let To = admitSyncedSkill(hn, reserved);
      if (To === null) continue;
      let bo = markBareNameReserved(To);
      (inserted.push(bo), insertedNames.add(bo.name), addNameAndAliases(reserved, bo));
      continue;
    }
    let ho = scopeOf(hn),
      yn = (ho !== null && V1t() && vZ(joinScopedName(ho, hn.name))) || !canOfferUnscoped(hn, ho) ? null : ho,
      Kn = baseNames.has(hn.name);
    if (isFallbackSkill(hn)) {
      if (Kn || (nameCounts.get(hn.name) ?? 0) > 0 || insertedNames.has(hn.name)) continue;
      (inserted.push(yn ? withNestedSkillDescription(hn, yn) : hn), insertedNames.add(hn.name));
      continue;
    }
    if (!(Kn || (nameCounts.get(hn.name) ?? 0) > 1)) {
      (inserted.push(yn ? withNestedSkillDescription(hn, yn) : hn), insertedNames.add(hn.name));
      continue;
    }
    if (!yn) {
      if (Kn || insertedNames.has(hn.name)) {
        if (ho !== null)
          refuseReservedSkillName({
            name: joinScopedName(ho, hn.name),
            path: hn.type === "prompt" ? hn.skillRoot : void 0,
            change: "path",
          });
        continue;
      }
      (inserted.push(hn), insertedNames.add(hn.name));
      continue;
    }
    let fo = joinScopedName(yn, hn.name);
    if (baseNames.has(fo) || insertedNames.has(fo)) continue;
    if (Et.has(hn) && (yt.has(fo) || (gt.get(fo)?.size ?? 0) > 1)) {
      logForDebugging(`[skills] ${Mu(fo)} is not offered: another skill would share the name`);
      continue;
    }
    (inserted.push(toScopedSkillCommand(hn, yn, Kn || insertedNames.has(hn.name), cwd)),
      insertedNames.add(fo));
  }
  if (hostCatalogSkills.length > 0) addNonSyncedSpellings(reserved, inserted);
  let filtered = admitSyncedSkills(hostCatalogSkills, reserved)
      .map(markBareNameReserved)
      .filter((hn) => meetsAvailabilityRequirement(hn) && isCommandEnabled(hn)),
    [qt, Zt] = SS(inserted, (hn) => k2e(hn)),
    rn = [...Zt, ...filtered];
  if (rn.length === 0 && qt.length === 0) return base;
  let builtinNames = new Set(getBuiltinCommandTable().map((hn) => hn.name)),
    insertIndex = base.findIndex((hn) => builtinNames.has(hn.name));
  if (insertIndex === -1) return dropShadowedFallbackSkills([...base, ...rn, ...qt]);
  return dropShadowedFallbackSkills([
    ...base.slice(0, insertIndex),
    ...rn,
    ...base.slice(insertIndex),
    ...qt,
  ]);
}
/**
 * dropAmbiguousScopedSkills：同名且无法加作用域前缀的嵌套技能不提供。
 */
//@ chunk-e6aww6q8.js:2067775-2068260 layout
function dropAmbiguousScopedSkills(e, n, r) {
  let filtered = e.filter((w) => !canOfferUnscoped(w, n(w)));
  if (filtered.length === 0) return e;
  let h = new Map();
  for (let w of [...r, ...e.filter((L) => !isFallbackSkill(L))]) {
    if (w.loadedFrom === "syncedSkills") continue;
    for (let L of [w.name, ...(w.aliases ?? [])]) h.set(L, (h.get(L) ?? 0) + 1);
  }
  let y = new Set(r.map((w) => (w.type === "prompt" ? w.skillRoot : void 0))),
    S = new Set(
      filtered.filter((w) => (h.get(w.name) ?? 0) > 1 && !(w.type === "prompt" && y.has(w.skillRoot))),
    );
  for (let w of S) reportRefusedSkillName(joinScopedName(n(w) ?? "", w.name), "is not offered");
  return e.filter((w) => !S.has(w));
}
/**
 * canOfferUnscoped：无作用域、同步技能或作用域名被保留时返回 true。
 */
//@ chunk-e6aww6q8.js:2068260-2068343 layout
function canOfferUnscoped(e, n) {
  return n === null || e.loadedFrom === "syncedSkills" || $z(joinScopedName(n, e.name));
}
/**
 * getSkillScopeLabel：技能所在项目相对 cwd 的路径（或目录名）作为作用域。
 */
//@ chunk-e6aww6q8.js:2068343-2068533 layout
function getSkillScopeLabel(e, n) {
  let r = getSkillProjectRoot(e);
  if (r === null) return null;
  let s = n === null ? null : relative_26(n, r);
  if (s === "") return null;
  if (s === null || s.startsWith("..") || isAbsolute_34(s)) return getAdditionalDirRelativeLabel(r);
  return s.split(sep_41).join("/");
}
/**
 * getSkillProjectRoot：skillRoot 中 /.claude/ 之前的部分。
 */
//@ chunk-e6aww6q8.js:2068533-2068691 layout
function getSkillProjectRoot(e) {
  if (e.type !== "prompt" || !e.skillRoot) return null;
  let index = e.skillRoot.lastIndexOf(`${sep_41}.claude${sep_41}`);
  return index === -1 ? null : e.skillRoot.slice(0, index);
}
/**
 * withNestedSkillDescription：描述追加 "(from X/.claude/skills — applies when working on files under X/)"。
 */
//@ chunk-e6aww6q8.js:2068691-2068859 layout
function withNestedSkillDescription(e, n) {
  if (e.type !== "prompt") return e;
  return {
    ...e,
    description: `${e.description} (from ${n}/.claude/skills \u2014 applies when working on files under ${n}/)`,
  };
}
/**
 * toScopedSkillCommand：生成 "scope:name" 形式的嵌套技能命令。
 */
//@ chunk-e6aww6q8.js:2068859-2069423 layout
function toScopedSkillCommand(e, n, r, s) {
  if (e.type !== "prompt") return e;
  let h = joinScopedName(n, e.name),
    y = r
      ? `scoped to ${n}/ \u2014 use this instead of the unscoped "${e.name}" skill when the files being changed are under ${n}/`
      : `from ${n}/.claude/skills \u2014 applies when working on files under ${n}/`,
    S = getSkillProjectRoot(e),
    w = S === null ? null : findAdditionalDirRoot(S),
    L =
      S !== null &&
      w !== null &&
      (s === null ||
        !isPathWithin(s, S, { alreadyComparable: !0 }) ||
        (w !== s && isPathWithin(s, w, { alreadyComparable: !0 })));
  return {
    ...e,
    name: h,
    unqualifiedName: e.name,
    allowlistedByFullNameOnly: L ? !0 : void 0,
    aliases: void 0,
    userFacingName: () => h,
    description: `${e.description} (${y})`,
  };
}
/**
 * clearCommandMemoizationCaches：清空 getCommands/loadAllCommands/技能列表等的记忆化缓存，但不清技能目录缓存。
 */
//@ chunk-e6aww6q8.js:2069423-2069469 facade-exports
function clearCommandMemoizationCaches() {
  (getHostState().invalidateCommands(), invalidateWorkflowCache());
}
/**
 * clearCommandsCache：清空命令相关的全部缓存（含技能目录、插件命令、插件技能）。
 */
//@ chunk-e6aww6q8.js:2069469-2069505 facade-exports
function clearCommandsCache() {
  (clearCommandMemoizationCaches(), clearPluginCommands(), oto(), clearSkillCaches());
}
/**
 * HEADLESS_YIELDABLE_NAMES：无头模式下内建命令可以让给插件/技能的名字（help、feedback）。
 */
//@ chunk-e6aww6q8.js:2069505-2069542 facade-exports = COMMON_HELP_ARGS (0.53)
var HEADLESS_YIELDABLE_NAMES = new Set(["help", "feedback"]);
/**
 * shedReservedAliases：插件/同步技能的别名若与内建/保留名冲突则移入 shedAliases；无头模式让出 help/feedback。
 */
//@ chunk-e6aww6q8.js:2069542-2071229 layout
function shedReservedAliases(commands, checkNamedFolders) {
  let isPluginOrSynced = (Z) =>
      Z.type === "prompt" && (Z.source === "plugin" || Z.loadedFrom === "syncedSkills"),
    nonInteractive = getIsNonInteractiveSession(),
    takenNames = new Set();
  for (let Z of commands) {
    let Se = nonInteractive && !supportsNonInteractive(Z);
    if (!Se || !HEADLESS_YIELDABLE_NAMES.has(Z.name)) takenNames.add(Z.name);
    if (!isPluginOrSynced(Z)) {
      for (let ke of Z.aliases ?? []) if (!Se || !HEADLESS_YIELDABLE_NAMES.has(ke)) takenNames.add(ke);
    }
  }
  let y,
    S = (Z) => {
      let Se = foldName_2(Z);
      if (nonInteractive && HEADLESS_YIELDABLE_NAMES.has(Se)) return !1;
      if (y === void 0) {
        y = new Set();
        for (let we of getBuiltinCommandTable()) addCommandSpellings(y, we);
        for (let we of getBundledSkills()) addCommandSpellings(y, we);
        addRuntimeGatedCommandSpellings(y);
        let mapped = getBuiltinPlugins().disabled.map((we) => we.name);
        for (let we of builtinPluginSkillNames(new Set(mapped))) addSpelling(y, we);
      }
      return isQualifiedToolReference(Se, y);
    },
    isTaken = (Z) => takenNames.has(Z) || S(Z),
    L;
  if (checkNamedFolders) {
    let Z = new Map();
    for (let we of commands) Z.set(we.name, (Z.get(we.name) ?? 0) + 1);
    let filtered = commands.filter(getCommandId),
      ke = new Map();
    for (let we of filtered) {
      let sliced = we.name.slice(we.name.lastIndexOf(":") + 1);
      for (let Ae of new Set([...(we.aliases ?? []), sliced])) ke.set(Ae, (ke.get(Ae) ?? 0) + 1);
    }
    L = new Set(
      filtered.flatMap((we) =>
        Z.get(we.name) === 1 && !(we.type === "prompt" && we.userInvocable === !1)
          ? (we.aliases ?? []).filter((Ee) => ke.get(Ee) === 1 && !isTaken(Ee))
          : [],
      ),
    );
  }
  let G = 0,
    mapped = commands.map((Z) => {
      if (!isPluginOrSynced(Z) || Z.type !== "prompt") return Z;
      if (Z.loadedFrom === "syncedSkills") return filterCommandAliases(Z, (Ae) => takenNames.has(Ae));
      let ke =
        (L !== void 0 && getCommandId(Z)) || Z.pluginInfo === void 0
          ? []
          : (Z.aliases ?? []).filter((Ae) => !isTaken(Ae) && L?.has(Ae) === !0);
      G += ke.length;
      let filtered = (Z.aliases ?? []).filter((Ae) => isTaken(Ae) || ke.includes(Ae));
      if (filtered.length === 0) return Z;
      let Ee = {
        ...filterCommandAliases(Z, (Ae) => filtered.includes(Ae)),
        shedAliases: Z.shedAliases ? [...Z.shedAliases, ...filtered] : filtered,
      };
      return ke.length > 0 && Ee.pluginInfo !== void 0
        ? {
            ...Ee,
            pluginInfo: {
              ...Ee.pluginInfo,
              namedFolderYield: {
                yielded: ke,
                aliasesBefore: (Z.aliases ?? []).filter((Ae) => !isTaken(Ae)),
              },
            },
          }
        : Ee;
    });
  if (G > 0 && claimOnce().claim("skill_reserved_namespace_named_folder"))
    logFeatureOk("skill_reserved_namespace", {
      check: lit_2("desktop_skills_folder_took_short_names"),
      plugin_aliases_dropped: G,
    });
  return mapped;
}
/**
 * withNamedFolderYieldsRestored：恢复插件命名目录让出的别名（用于展示完整命令列表）。
 */
//@ chunk-e6aww6q8.js:2071229-2071542 facade-exports
function withNamedFolderYieldsRestored(e) {
  return e.map((n) => {
    if (n.type !== "prompt") return n;
    let r = n.pluginInfo?.namedFolderYield;
    if (r === void 0) return n;
    let { yielded: yielded, aliasesBefore: aliasesBefore } = r,
      { shedAliases: shedAliases, ...S } = n,
      w = [...(shedAliases ?? [])];
    for (let L of yielded) {
      let index = w.lastIndexOf(L);
      if (index !== -1) w.splice(index, 1);
    }
    return { ...S, aliases: aliasesBefore, ...(w.length > 0 && { shedAliases: w }) };
  });
}
/**
 * getSkillToolCommands：Skill 工具可调用的技能列表（prompt、非内建、模型可调用、有描述或 whenToUse）。
 */
//@ chunk-e6aww6q8.js:2071542-2071642 facade-exports
function getSkillToolCommands(cwd, storage, hiddenPlugins = getHeldBackSyncedPlugins()) {
  let storageV5 = Lar();
  return getOrCreate(getHostState().skillToolCommands, commandsMemoKey(cwd, hiddenPlugins, storageV5), () =>
    getSkillToolCommandsUncached(cwd, storage, hiddenPlugins, storageV5),
  );
}
/**
 * getSkillToolCommandsUncached：getCommands 后用 isSkillToolCommand 过滤。
 */
//@ chunk-e6aww6q8.js:2071642-2071739 layout
async function getSkillToolCommandsUncached(cwd, storage, hiddenPlugins, storageV5) {
  if (getDisableSlashCommands()) return [];
  let commands = await getCommands(cwd, storage, hiddenPlugins, storageV5);
  return hideShadowedCommands(commands.filter(isSkillToolCommand), commands);
}
/**
 * getSlashCommandToolSkills：系统提示里列出的技能清单（来自技能目录、插件、内建技能，按设置过滤）。
 */
//@ chunk-e6aww6q8.js:2071739-2071840 facade-exports
function getSlashCommandToolSkills(cwd, storage) {
  let storageV5 = Lar();
  return getOrCreate(getHostState().slashCommandToolSkills, commandsMemoKey(cwd, void 0, storageV5), () =>
    getSlashCommandToolSkillsUncached(cwd, storage, storageV5),
  );
}
/**
 * getSlashCommandToolSkillsUncached：旧版 getSlashCommandToolSkills 的过滤逻辑；门面名给了缓存层 G0e。
 */
//@ chunk-e6aww6q8.js:2071840-2072348 fingerprint = getSlashCommandToolSkills (0.755)
async function getSlashCommandToolSkillsUncached(cwd, storage, options) {
  if (getDisableSlashCommands()) return [];
  try {
    let filtered = (await getCommands(cwd, storage, void 0, options)).filter(
      (cmd) =>
        cmd.type === "prompt" &&
        cmd.source !== "builtin" &&
        !isSkillOff(cmd) &&
        (cmd.hasUserSpecifiedDescription || cmd.whenToUse) &&
        (cmd.loadedFrom === "skills" ||
          cmd.loadedFrom === "syncedSkills" ||
          cmd.loadedFrom === "attachedFolder" ||
          cmd.loadedFrom === "plugin" ||
          cmd.loadedFrom === "bundled" ||
          cmd.disableModelInvocation),
    );
    return (logFeatureOk("cmd_load"), filtered);
  } catch (error) {
    return (
      logError(toError(error)),
      logFeatureSad("cmd_load", "cmd_load_slash_tool_skills_failed"),
      logForDebugging("Returning empty skills array due to load failure"),
      []
    );
  }
}
/**
 * getCommandName：命令显示名（userFacingName?.() ?? name）。
 */
//@ chunk-s61vbvea.js:17411-17462 facade-exports = getCommandName (1)
function getCommandName(cmd) {
  return cmd.userFacingName?.() ?? cmd.name;
}
/**
 * clearUserFacingName：把 userFacingName 挪进 shedAliases 后清空。
 */
//@ chunk-s61vbvea.js:17462-17606 layout
function clearUserFacingName(e) {
  if (e.type === "prompt" && e.userFacingName !== void 0)
    e.shedAliases = [...(e.shedAliases ?? []), e.userFacingName()];
  e.userFacingName = void 0;
}
/**
 * isCommandEnabled：先检查 policyGate（commandPolicyGateAllows，getter 抛错按 false），再 isEnabled?.() ?? true。
 */
//@ chunk-s61vbvea.js:17606-17668 facade-exports
function isCommandEnabled(cmd) {
  if (!passesPolicyGate(cmd)) return !1;
  return cmd.isEnabled?.() ?? !0;
}
/**
 * passesPolicyGate：policyGate.policy 由 commandPolicyGateAllows 判定。
 */
//@ chunk-s61vbvea.js:17668-17765 layout
function passesPolicyGate(cmd) {
  let policyGate;
  try {
    policyGate = cmd.policyGate;
  } catch {
    return !1;
  }
  if (policyGate == null) return !0;
  return commandPolicyGateAllows(policyGate.policy);
}
//@ chunk-s61vbvea.js:17765-17984 layout
function inputStartsWithMatchingCommand(e, n) {
  let trimStart = e.trimStart();
  if (!trimStart.startsWith("/")) return !1;
  let s = trimStart.slice(1).match(/^[a-zA-Z0-9:_-]+/)?.[0],
    h = trimStart.slice(1).split(/\s/, 1)[0];
  if (s !== void 0 && n(s)) return !0;
  return h !== void 0 && h !== s && h.length > 0 && n(h);
}
/**
 * getCommandContextMode：getContext?.() ?? context ?? "inline"（inline/fork）。
 */
//@ chunk-s61vbvea.js:17984-18052 layout
function getCommandContextMode(cmd, args, context) {
  return cmd.getContext?.(args, context) ?? cmd.context ?? "inline";
}
/**
 * isImmediateCommand：immediate 可为布尔或 (args, presentation) 函数。
 */
//@ chunk-s61vbvea.js:18052-18134 layout
function isImmediateCommand(cmd, args, presentation) {
  let immediate = cmd?.immediate;
  return typeof immediate === "function" ? immediate(args, presentation) : immediate === !0;
}
/**
 * splitSlashCommandInput："/name args" → {name, args}。
 */
//@ chunk-s61vbvea.js:18134-18287 layout
function splitSlashCommandInput(input) {
  let body = input.startsWith("/") ? input.slice(1) : input,
    spaceIndex = body.search(/\s/);
  if (spaceIndex === -1) return { name: body, args: "" };
  return { name: body.slice(0, spaceIndex), args: body.slice(spaceIndex + 1).trim() };
}
/**
 * looksLikeSlashInput：字符串或最后一个文本块以 / 开头。
 */
//@ chunk-s61vbvea.js:18287-18483 layout
function looksLikeSlashInput(e) {
  if (typeof e === "string") return e.trim().startsWith("/");
  if (!Array.isArray(e)) return !1;
  let at = e.at(-1);
  return at?.type === "text" && typeof at.text === "string" && at.text.trim().startsWith("/");
}
/**
 * TEAM_SETUP_GUIDE_LABEL："✦ Team setup guide"。
 */
//@ chunk-s61vbvea.js:18483-18673 layout
var TEAM_SETUP_GUIDE_LABEL = "\u2726 Team setup guide",
  PLACEHOLDER_LABELS_PATTERN = String.raw`Pasted text|Image|\.\.\.Truncated text|${"\u2726 Team setup guide"}`,
  regExp = new RegExp(String.raw`\[(${PLACEHOLDER_LABELS_PATTERN}) #(\d+)(?: \+\d+ lines)?(\.)*\]`, "g");
//@ chunk-s61vbvea.js:18673-18719 layout
function isImagePlaceholder(e) {
  return e.startsWith("[Image");
}
/**
 * commandMatchesName：name、显示名或 aliases 命中。
 */
//@ chunk-s61vbvea.js:18719-18795 layout
function commandMatchesName(cmd, name) {
  return cmd.name === name || getCommandName(cmd) === name || (cmd.aliases?.includes(name) ?? !1);
}
/**
 * findCommand：先按 name 精确匹配，再按显示名或 aliases，最后按 directoryListingName。
 */
//@ chunk-s61vbvea.js:18795-19014 facade-exports
function findCommand(commandName, commands) {
  let aliasMatch, directoryMatch;
  return (
    commands.find((cmd) => {
      if (cmd.name === commandName) return !0;
      if (aliasMatch === void 0 && commandMatchesName(cmd, commandName)) aliasMatch = cmd;
      if (directoryMatch !== null && cmd.type === "prompt" && cmd.directoryListingName === commandName)
        directoryMatch =
          directoryMatch === void 0 || directoryMatch.name === cmd.name ? (directoryMatch ?? cmd) : null;
      return !1;
    }) ??
    aliasMatch ??
    directoryMatch ??
    void 0
  );
}
/**
 * buildCommandLookup：name/显示名/aliases → 命令 的 Map。
 */
//@ chunk-s61vbvea.js:19014-19178 layout
function buildCommandLookup(commands) {
  let lookup = new Map();
  for (let r of commands) if (!lookup.has(r.name)) lookup.set(r.name, r);
  for (let r of commands)
    for (let s of [getCommandName(r), ...(r.aliases ?? [])]) if (!lookup.has(s)) lookup.set(s, r);
  return lookup;
}
/**
 * hasCommand：findCommand 是否找到。
 */
//@ chunk-s61vbvea.js:19178-19220 facade-exports
function hasCommand(e, n) {
  return findCommand(e, n) !== void 0;
}
/**
 * hasSensitiveArgs：isSensitive 为布尔或函数。
 */
//@ chunk-s61vbvea.js:19220-19326 layout
function hasSensitiveArgs(cmd, args) {
  if (args.trim() === "") return !1;
  let { isSensitive: isSensitive } = cmd;
  return typeof isSensitive === "function" ? isSensitive(args) : isSensitive === !0;
}
/**
 * buildCommandRunInfo：{command, args（敏感则 ***）, plugin}。
 */
//@ chunk-s61vbvea.js:19326-19440 layout
function buildCommandRunInfo(cmd, args, plugin) {
  let registeredBy = plugin ?? cmd.registeredBy;
  return {
    command: getCommandName(cmd),
    args: hasSensitiveArgs(cmd, args) ? "***" : args,
    ...(registeredBy !== void 0 && { plugin: registeredBy }),
  };
}
//@ chunk-s61vbvea.js:19440-19582 layout
var regExp_2 = new RegExp(String.raw`\[(?:Pasted text|\.\.\.Truncated text|${TEAM_SETUP_GUIDE_LABEL}) #\d+`),
  regExp_3 = new RegExp(String.raw`^(\/[^\s[]+)\[(?=(?:${PLACEHOLDER_LABELS_PATTERN}) #\d+)`);
/**
 * SECRET_SCAN_CHUNK：65536。
 */
//@ chunk-s61vbvea.js:19582-19604 layout
var na = 65536,
  Rx = 2 * BTi;
/**
 * shouldRedactInput：粘贴内容或命令参数命中敏感模式时不写入历史。
 */
//@ chunk-s61vbvea.js:19604-19913 layout
function shouldRedactInput(e, n, { pastedTexts: r = [] } = {}) {
  if (r.some(containsSecretPattern)) return !0;
  let trimmed = e.trim();
  if (trimmed.startsWith("!")) {
    if (((trimmed = trimmed.slice(1).trimStart()), containsSecretPattern(trimmed))) return !0;
  }
  if (!trimmed.startsWith("/")) return !1;
  let { name: h, args: args } = splitSlashCommandInput(trimmed.replace(regExp_3, "$1 [")),
    S = findCommand(h, n);
  if (!S?.isSensitive) return containsSecretPattern(trimmed.slice(1));
  return hasSensitiveArgs(S, args) || (r.length > 0 && regExp_2.test(args));
}
//@ chunk-s61vbvea.js:19913-20093 layout
function filterCommandsByAllowlist(commands, allowlist) {
  if (allowlist === void 0) return commands;
  return commands.filter((r) =>
    allowlist.some(
      (s) =>
        r.name === s ||
        (r.loadedFrom === "syncedSkills"
          ? (r.aliases?.includes(s) ?? !1)
          : isProjectScopedCommand(r) && r.name.endsWith(`:${s}`)),
    ),
  );
}
/**
 * 判断命令不是用户来源技能，也不是 memoryStore/mcp 来源或只允许按全名调用的提示词命令。
 */
//@ chunk-s61vbvea.js:20093-20225 layout
function isProjectScopedCommand(e) {
  return (
    !isSkillFromUserSource(e) &&
    !(
      e.type === "prompt" &&
      (e.source === "memoryStore" || e.source === "mcp" || e.allowlistedByFullNameOnly === !0)
    )
  );
}
/**
 * resolveBarePluginSkillName：{kind: none|ambiguous|unique}。
 */
//@ chunk-s61vbvea.js:20225-20540 layout
function resolveBarePluginSkillName(name, commands) {
  if (name === "" || name.includes(":")) return { kind: "none" };
  let suffix = `:${name}`,
    matches = commands.filter(
      (y) => y.type === "prompt" && y.loadedFrom !== "syncedSkills" && y.name.endsWith(suffix),
    );
  if (matches.length > 1) return { kind: "ambiguous", candidates: matches };
  let match = matches[0];
  if (match === void 0 || match.source !== "plugin") return { kind: "none" };
  return { kind: "unique", command: match };
}
/**
 * getCommand：findCommand，找不到时抛出列出全部可用命令的 ReferenceError。
 */
//@ chunk-s61vbvea.js:20540-20788 facade-exports = getCommand (1)
function getCommand(commandName, commands) {
  let command = findCommand(commandName, commands);
  if (!command)
    throw ReferenceError(
      `Command ${commandName} not found. Available commands: ${commands
        .map((s) => {
          let name = getCommandName(s);
          return s.aliases ? `${name} (aliases: ${s.aliases.join(", ")})` : name;
        })
        .sort((s, h) => s.localeCompare(h))
        .join(", ")}`,
    );
  return command;
}
/**
 * containsSecretPattern：按 64KB 分段（带重叠）扫描。
 */
//@ chunk-s61vbvea.js:20788-20915 affinity
function containsSecretPattern(e) {
  if (e.length <= na) return containsSecret(e);
  let n = na - Rx;
  for (let r = 0; r < e.length; r += n) if (containsSecret(e.slice(r, r + na))) return !0;
  return !1;
}
const getCommandName_2 = getCommandName; //@ cross-chunk alias

export {
  getSkillToolCommands,
  clearCommandMemoizationCaches,
  looksLikeSlashInput,
  inputStartsWithMatchingCommand,
  hasCommand,
  splitSlashCommandInput,
  shouldRedactInput,
  findCommand,
  isCommandEnabled,
  isSkillOff,
  regExp,
  TEAM_SETUP_GUIDE_LABEL,
  matchesUnqualifiedName,
  isSkillToolCommand,
  getBareCommandName,
  getCommands,
  getHeldBackSyncedPlugins,
  withNamedFolderYieldsRestored,
  getHiddenSyncedSkills,
  builtInCommandNames,
  isProjectScopedCommand,
  describeSkillHiddenBehindPlugin,
  getBareCommandNameUnlessSynced,
  toBridgeSlashCommands,
  getCommandName,
  bridgeAdvertisedCommands,
  isImagePlaceholder,
  REMOTE_SAFE_COMMANDS,
  filterCommandsForRemoteMode,
  withWorkerOnlyCommands,
  clearCommandsCache,
  toSlashCommands,
  shippedCommandNames,
  buildCommandRunInfo,
  formatDescriptionWithSource,
  getHumanFacingDescription,
  dedupeBundledSkills,
  getCommand,
  getSlashCommandToolSkills,
  isImmediateCommand,
  shippedCommandNameForAnalytics,
  isBridgeSafeCommand,
  admitsBridgeAuthor,
  findBridgeFallback,
  BRIDGE_SAFE_COMMANDS,
  warmCommandSourceCaches,
  getBuiltinCommands,
  meetsAvailabilityRequirement,
  hasSensitiveArgs,
  getCommandContextMode,
  mjo,
  firstPartyCommandNameCheck,
  dropShadowedFallbackSkills,
  passesPolicyGate,
  filterCommandsByAllowlist,
  isFirstPartyCommandName,
  resolveBarePluginSkillName,
  F7,
  isBridgeDispatchable,
  addCommandSpellings,
  filterCommandAliases,
  clearUserFacingName,
  buildCommandLookup,
  getCommandOriginKind,
  LUo,
  folderNameAliasCheck,
  toSlashCommand,
  isBuiltinCommand,
  ezr,
};
