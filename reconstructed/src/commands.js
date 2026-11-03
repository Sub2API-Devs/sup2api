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
import { resolve as resolve_2, basename, dirname, relative, sep, isAbsolute } from "path";
import {
  getSkillOverrideState,
  isHiddenFromModel,
  isFallbackSkill,
  isSyncedOrManagedSkill,
  dropReservedAliases,
  getSyncedSkillUnqualifiedAlias,
  isShadowedSkillName,
  isUsableWithoutWorkspace,
  mergeClients,
  isQualifiedToolReference,
  checkCommandListable,
  addNonSyncedSpellings,
  admitSyncedSkills,
  admitAllAliases,
  isSyncedSkill,
  isKilledHostCatalogSkill,
  isHostCatalogSkill,
  hideDuplicateCatalogSkills,
  admitSyncedSkill,
  addNameAndAliases,
  isPlaidHarborOn,
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
import { usesReservedSkillNamespace, getReservedSkillNamespace } from "./skills/reservedSkillNames.js";
import { foldName as foldName_2, getAccountCacheKey } from "./utils/plugins/syncedItems.js";
import { withSyncedSkillPrefix, isSafeSkillName } from "./skills/syncedSkills.js";
import {
  areSkillsConvertedAsPlugins,
  isSyncedMarketplacePlugin,
  isTopHostSkillPluginSession,
} from "./utils/permissions/permissionRulePayload.js";
import {
  EMPTY_COMMAND_CACHE,
  isPluginLocalCommand_2,
  hookedCommands_2,
} from "./plugins/functionHooks/commandHooks.js";
import { isImmutableLadybugActive } from "./utils/claudeAiSync/syncedSkillAccess.js";
import { isSkillAttributionEnabled } from "./utils/telemetry/skillAttribution.js";
import { normalizeServerNameShort } from "./services/api/deferredToolsState.js";
import { isPathWithin as isPathWithin_2 } from "./utils/fsJunctions.js";
import { markInPlaceWriteForced } from "./utils/plugins/safeCopy.js";
import { loginCommand_2 } from "./commands/login/index.js";
import { stubTerminalSetupCommand, terminalSetupCommand } from "./commands/terminalSetup/index.js";
import { commitPushPrCommand } from "./commands/commit-push-pr.js";
import { stubAntTraceCommand } from "./commands/ant-trace/index.js";
import { versionCommand, versionNonInteractiveCommand } from "./commands/version.js";
import {
  stubScrollSpeedCommand_2,
  stubScrollSpeedCommand,
  scrollSpeedCommand,
} from "./commands/scroll-speed/index.js";
import { stubC4EUpsellCommand, ENTERPRISE_UPSELL_COMMANDS } from "./commands/c4eUpsell.js";
import { isAgentsFleetEnabled, isDaemonWorkerRegistryEnabled } from "./utils/fleetGates.js";
import { isEnvTruthy } from "./utils/envUtils.js";
import { env } from "./utils/env.js";
import {
  forkToBackgroundCommand,
  subtaskCommand,
  forkSubagentCommand,
  agentsRemovedCommand,
} from "./commands/agents/index.js";
import { lanternPrismEnabled } from "./utils/plugins/pluginGates.js";
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
import { builtinPluginSkillNames, availableBuiltinSkillCommands } from "./utils/plugins/managedPlugins.js";
import { parentCommandName } from "./utils/telemetry/skillLoadedEvent.js";
import {
  getSkillDirCommandsCached,
  getDynamicSkillStateKeyExport,
  refuseReservedSkillName,
  conditionalSkillEntries,
  getDynamicSkills,
  isSkillFilePathOrIdentifier,
  clearSkillCaches,
} from "./skills/loadSkillsDir.js";
import { isSyscallError, toError } from "./utils/errors.js";
import { logError } from "./utils/log.js";
import { loadPluginSkills, getPluginCommands } from "./utils/plugins/loadPluginCommands.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "./services/analytics/featureTelemetry.js";
import { bundledSkillsGateKey } from "./skills/bundledSkillsGate.js";
import { isSkillsSyncEnvOn, getSyncedSkillCommands } from "./utils/claudeAiSync/skillsSync.js";
import { managedFolderCondition } from "./plugins/functionHooks/sites/promptContextSites.js";
import { recordPhase } from "./utils/startupTiming.js";
import { SS } from "../vendor/lodash-es/_inlinedHelpers.js";
import { groupPluginSourcesByName } from "./utils/telemetry/pluginTelemetry.js";
import { claimOnce } from "./services/api/verificationRequired.js";
import { setHistoryStore } from "./history.js";
import { realpathNativeAsync } from "./utils/windowsUncPaths.js";
import { hostSkillCatalog } from "./utils/sessionShape.js";
import { escapeControlCharsForDisplay } from "./utils/stringUtils.js";
import { reportRefusedSkillName } from "./skills/skillNameRules.js";
import { clearPluginCommands, clearPluginSkillsCache } from "./utils/plugins/pluginLoadState.js";
import { getBuiltinPlugins } from "./plugins/builtinPlugins.js";
import { lit as lit_2 } from "./services/analytics/safeMetadata.js";
import { commandPolicyGateAllows } from "./services/policyLimits/policyVerdicts.js";
import { SECRET_REDACTION_PATTERNS, containsSecret } from "./utils/redactSecrets.js";
import { isSkillFromUserSource } from "./skills/skillSources.js";

//@ chunk-e6aww6q8.js:953787-953824 facade-exports
function isSkillOff(e) {
  return getSkillOverrideState(e) === "off";
}
//@ chunk-e6aww6q8.js:953824-954135 fingerprint = meetsAvailabilityRequirement (0.639)
/**
 * meetsAvailabilityRequirement：命令 availability 要求是否满足。宿主可通过 commandsOffHere 关闭；claude-ai 需 claude.ai 订阅登录；console 需一方 API 且非 claude.ai 订阅；console-profile 需 user_oauth 档案登录。
 */
function meetsAvailabilityRequirement(cmd) {
  if (getHostState().commandsOffHere?.(cmd)) return false;
  if (!cmd.availability) return true;
  for (let requirement of cmd.availability)
    switch (requirement) {
      case "claude-ai":
        if (isClaudeAISubscriber()) return true;
        break;
      case "console":
        if (!isClaudeAISubscriber() && !isUsing3PServices() && isFirstPartyAnthropicBaseUrl()) return true;
        break;
      case "console-profile":
        if (getWIFAuthType() === "user_oauth" && isWIFDispatchAuth()) return true;
        break;
      default: {
        let _exhaustive = requirement;
        break;
      }
    }
  return false;
}
//@ chunk-e6aww6q8.js:954135-954170 layout
/**
 * joinScopedName：返回 `${scope}:${name}`。
 */
function joinScopedName(scope, name) {
  return `${scope}:${name}`;
}
//@ chunk-e6aww6q8.js:954170-954267 layout
/**
 * matchesUnqualifiedName：prompt 且非 syncedSkills 且 unqualifiedName===n。
 */
function matchesUnqualifiedName(cmd, name) {
  return cmd.type === "prompt" && cmd.loadedFrom !== "syncedSkills" && cmd.unqualifiedName === name;
}
//@ chunk-e6aww6q8.js:954267-954357 layout
/**
 * getBareCommandName：prompt 有 unqualifiedName 时返回它，否则 name。
 */
function getBareCommandName(cmd) {
  return cmd.type === "prompt" && cmd.unqualifiedName != null ? cmd.unqualifiedName : cmd.name;
}
//@ chunk-e6aww6q8.js:954357-954479 layout
/**
 * getBareCommandNameUnlessSynced：同 EF，但 syncedSkills 不取 unqualifiedName。
 */
function getBareCommandNameUnlessSynced(cmd) {
  return cmd.type === "prompt" && cmd.unqualifiedName != null && cmd.loadedFrom !== "syncedSkills"
    ? cmd.unqualifiedName
    : cmd.name;
}
//@ chunk-e6aww6q8.js:954479-955011 fingerprint = getMcpSkillCommands (0.47)
/**
 * dropShadowedFallbackSkills：旧版名 getMcpSkillCommands 不符：316 里按 ":后缀" 收集插件/内置/MCP 技能名，丢弃同名 fallback 技能。
 */
function dropShadowedFallbackSkills(commands) {
  let suffixes = new Set();
  let sawMcp = false;
  for (let command of commands) {
    if (
      command.type !== "prompt" ||
      (command.loadedFrom !== "plugin" && command.loadedFrom !== "bundled" && command.loadedFrom !== "mcp")
    )
      continue;
    if (command.disableModelInvocation || isHiddenFromModel(command)) continue;
    if (command.loadedFrom === "mcp") sawMcp = true;
    let colon = command.name.lastIndexOf(":");
    if (colon > 0) suffixes.add(command.name.slice(colon + 1));
  }
  if (suffixes.size === 0) return commands;
  let telemetryLogged = getHostState().fallbackShadowTelemetryLogged;
  return commands.filter((cmd) => {
    if (!isFallbackSkill(cmd)) return true;
    if (!suffixes.has(cmd.name)) return true;
    logForDebugging(
      `Dropping fallback skill '${cmd.name}' \u2014 a plugin/MCP skill with the same suffix is loaded`,
    );
    return false;
  });
}
//@ chunk-e6aww6q8.js:955011-955309 layout
/**
 * dedupeBundledSkills：按名去重 source=bundled 的 prompt；结果缓存在 state.shadowedBundledSkills。
 */
function dedupeBundledSkills(commands) {
  let state = getHostState();
  if (state.shadowedBundledSkills?.input === commands) return state.shadowedBundledSkills.output;
  let seen = new Set();
  let hadDuplicates = false;
  let deduped = commands.filter((command) => {
    if (command.type === "prompt" && command.source === "bundled" && seen.has(command.name)) {
      hadDuplicates = true;
      return false;
    }
    seen.add(command.name);
    return true;
  });
  let result = hadDuplicates ? deduped : commands;
  state.shadowedBundledSkills = {
    input: commands,
    output: result,
  };
  return result;
}
//@ chunk-e6aww6q8.js:955309-955350 layout
function hiddenCommandsWhenSlashDisabled(e) {
  if (getDisableSlashCommands()) return [];
  return [];
}
//@ chunk-e6aww6q8.js:955350-955649 fingerprint = getSkillToolCommands (0.859)
/**
 * isSkillToolCommand：SkillTool 列表的单条谓词；门面把 getSkillToolCommands 给了 YI。
 */
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
//@ chunk-e6aww6q8.js:959638-959723 affinity
/**
 * addSpelling：规范化（Gy）后加入集合，跳过 claude.ai 同步技能保留名。
 */
function addSpelling(spellings, name, allowReserved = false) {
  if (typeof name !== "string") return;
  if (!allowReserved && usesReservedSkillNamespace(name)) return;
  spellings.add(foldName_2(name));
}
//@ chunk-e6aww6q8.js:959723-959841 callgraph-fingerprint = findCommand (1)
/**
 * addCommandSpellings：把 name、显示名、aliases 规范化后加入集合；旧版名 findCommand 配错（门面 findCommand=s61vbvea Zs）。
 */
function addCommandSpellings(spellings, cmd) {
  let allowReserved = isSyncedOrManagedSkill(cmd);
  addSpelling(spellings, cmd.name, allowReserved);
  let displayName = getCommandName(cmd);
  if (displayName !== cmd.name) addSpelling(spellings, displayName, allowReserved);
  for (let alias of cmd.aliases ?? []) addSpelling(spellings, alias, allowReserved);
}
//@ chunk-e6aww6q8.js:961188-961361 placement = buildTool (0.402)
/**
 * （旧版名 buildTool 是错配）过滤命令（Skill）的 aliases：保留谓词为真的别名；syncedSkills 来源的命令若规范名与 userFacingName 不一致，再改写 userFacingName。
 */
function filterCommandAliases(command, keepAlias) {
  let r = dropReservedAliases(command, keepAlias);
  if (r.loadedFrom !== "syncedSkills") return r;
  let commandName = getCommandName(r);
  if (withSyncedSkillPrefix(commandName) === commandName || getSyncedSkillUnqualifiedAlias(r) !== undefined)
    return r;
  let h = withSyncedSkillPrefix(commandName);
  return {
    ...r,
    userFacingName: () => h,
  };
}
//@ chunk-e6aww6q8.js:1661511-1661811 placement
/**
 * 根据上次同步的 lane 负载，返回"技能被插件接管"的插件表 pluginId → {pluginName, heldBack}；功能关闭或没有数据时返回共享空表。
 */
function getHeldBackSyncedPlugins() {
  if (!areSkillsConvertedAsPlugins()) return EMPTY_COMMAND_CACHE;
  let lastSyncedLaneLoad = getLastSyncedLaneLoad();
  if (lastSyncedLaneLoad === null) return EMPTY_COMMAND_CACHE;
  if (isImmutableLadybugActive()) return EMPTY_COMMAND_CACHE;
  let n = new Map();
  for (let { bucket, outcome, pluginName, pluginId } of lastSyncedLaneLoad)
    if (
      outcome !== "not_loaded" &&
      pluginId !== undefined &&
      isPluginDirMissingFromSyncedList(bucket, pluginId) &&
      n.get(pluginId)?.heldBack !== false
    )
      n.set(pluginId, {
        pluginName,
        heldBack: outcome === "held_back",
      });
  return n.size === 0 ? EMPTY_COMMAND_CACHE : n;
}
//@ chunk-e6aww6q8.js:1661811-1661890 placement
/**
 * 判断某插件目录是否尚未出现在最近一次完整同步的插件列表里（用于触发补充加载）。
 */
function isPluginDirMissingFromSyncedList(e, n) {
  let lastCompleteSyncedPluginList = getLastCompleteSyncedPluginList();
  return (
    lastCompleteSyncedPluginList === null ||
    lastCompleteSyncedPluginList.bucket !== e ||
    lastCompleteSyncedPluginList.dirsById.has(n)
  );
}
//@ chunk-e6aww6q8.js:1661890-1661969 placement
function hidePrefixForSkills(hiddenPlugins) {
  return hiddenPlugins.size === 0 ? "" : `hide=${[...hiddenPlugins.keys()].sort().join(",")}:`;
}
//@ chunk-e6aww6q8.js:1661969-1662547 placement
/**
 * 把被同名插件接管的同步技能标成隐藏（isHidden + hiddenBehindPlugin，可带替代技能名）；用户自有同名技能或带本地归属的技能不动。没有变化时返回原数组。
 */
function hideSkillsBehindPlugins(commands, heldBackPlugins, userCommands) {
  if (heldBackPlugins.size === 0) return commands;
  let s = new Set(userCommands.map((userCommand) => foldName_2(userCommand.name)));
  let h;
  let y = false;
  let mappedCommands = commands.map((command) => {
    let L =
      command.type === "prompt" &&
      command.loadedFrom === "syncedSkills" &&
      command.serverAttribution?.pluginId !== undefined
        ? heldBackPlugins.get(command.serverAttribution.pluginId)
        : undefined;
    if (
      L === undefined ||
      command.type !== "prompt" ||
      command.skillRoot === undefined ||
      s.has(foldName_2(command.name)) ||
      (h ??= isSkillAttributionEnabled())(command.skillRoot) !== undefined
    )
      return command;
    let G = L.heldBack ? undefined : findPluginReplacementSkill(commands, L.pluginName, command);
    if (!L.heldBack && G === undefined) return command;
    y = true;
    return {
      ...command,
      isHidden: true,
      hiddenBehindPlugin: {
        plugin: L.pluginName,
        heldBack: L.heldBack,
        ...(G !== undefined && {
          replacement: G,
        }),
      },
    };
  });
  return y ? mappedCommands : commands;
}
//@ chunk-e6aww6q8.js:1662547-1662736 placement
function findPluginReplacementSkill(commands, pluginName, command) {
  let s = foldName_2(command.unqualifiedName ?? command.name);
  return commands.find(
    (h) =>
      h.type === "prompt" &&
      h.pluginInfo?.repository === `${pluginName}@synced` &&
      !isShadowedSkillName(h) &&
      (h.aliases ?? []).some((y) => foldName_2(y) === s),
  )?.name;
}
//@ chunk-e6aww6q8.js:1662736-1663073 placement
/**
 * 为被插件接管而隐藏的技能生成提示："现在是插件技能 /X" 或 "属于已关闭的插件 X，去 /plugin 打开"。
 */
function describeSkillHiddenBehindPlugin(e) {
  if (e.type !== "prompt" || e.hiddenBehindPlugin === undefined) return;
  let n = (y) => normalizeServerNameShort(y, 200);
  let { plugin, replacement } = e.hiddenBehindPlugin;
  let h = n(e.name);
  if (replacement !== undefined)
    return `${h} is now the plugin skill ${n(replacement)}. Use /${n(replacement)}.`;
  return `${h} is now part of the plugin ${n(plugin)}, which is turned off. Check /plugin to turn it on and run it.`;
}
//@ chunk-e6aww6q8.js:1683563-1683709 placement
function findAdditionalDirRoot(e) {
  let n = resolve_2(e);
  let r = null;
  for (let s of getAdditionalDirectoriesForClaudeMd()) {
    let h = resolve_2(s);
    if (
      isPathWithin_2(h, n, {
        alreadyComparable: true,
      }) &&
      (r === null || h.length > r.length)
    )
      r = h;
  }
  return r;
}
//@ chunk-e6aww6q8.js:1683709-1683961 placement
function getAdditionalDirRelativeLabel(skillProjectRoot) {
  let additionalDirRoot = findAdditionalDirRoot(skillProjectRoot);
  if (additionalDirRoot === null) return null;
  let r = basename(additionalDirRoot);
  if (r === "") return null;
  let any = getAdditionalDirectoriesForClaudeMd().some((w) => {
    let L = resolve_2(w);
    return L !== additionalDirRoot && basename(L) === r;
  });
  let h = basename(dirname(additionalDirRoot));
  let y = any && h !== "" ? `${h}/${r}` : r;
  let S = relative(additionalDirRoot, resolve_2(skillProjectRoot));
  return S === "" ? y : [y, ...S.split(sep)].join("/");
}
//@ chunk-e6aww6q8.js:1732452-1732503 placement = default (1)
var stubCommand_1 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-e6aww6q8.js:1733123-1733174 placement = default (1)
var stubCommand_2 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-e6aww6q8.js:1750075-1750424 placement
/**
 * getCommandOriginKind：builtin/plugin/mcp/user。
 */
function getCommandOriginKind(e) {
  if (isPluginLocalCommand_2(e)) return "plugin";
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
var stubCommand_3 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-e6aww6q8.js:2033346-2033397 placement = default (1)
var stubCommand_4 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-e6aww6q8.js:2033397-2033417 placement
var stubCommand_4a = stubCommand_4;
var stubCommand_4b = stubCommand_4;
//@ chunk-e6aww6q8.js:2033417-2033468 placement = default (1)
var stubCommand_5 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-e6aww6q8.js:2033468-2033480 placement
var stubCommand_5a = stubCommand_5;
//@ chunk-e6aww6q8.js:2033480-2033531 placement = default (1)
var stubCommand_6 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-e6aww6q8.js:2033531-2033543 placement
var stubCommand_6a = stubCommand_6;
//@ chunk-e6aww6q8.js:2033543-2033594 placement = default (1)
var stubCommand_7 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-e6aww6q8.js:2033594-2033645 placement = default (1)
var stubCommand_8 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-e6aww6q8.js:2033645-2033696 placement = default (1)
var stubCommand_9 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-e6aww6q8.js:2033696-2033747 placement = default (1)
var stubCommand_10 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-e6aww6q8.js:2053003-2053054 placement = default (1)
var stubCommand_11 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-e6aww6q8.js:2053054-2053105 placement = default (1)
var stubCommand_12 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-e6aww6q8.js:2053105-2053156 placement = default (1)
var stubCommand_13 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-e6aww6q8.js:2053156-2053236 placement
/**
 * WORKER_ONLY_SKILL_NAMES：autopilot/bugfix/dashboard/deep-research/docs/investigate。
 */
var WORKER_ONLY_SKILL_NAMES = ["autopilot", "bugfix", "dashboard", "deep-research", "docs", "investigate"];
//@ chunk-e6aww6q8.js:2053236-2053280 placement
/**
 * 把名字匹配到仅 worker 可用的技能名（autopilot/bugfix/dashboard/deep-research/docs/investigate）。
 */
function workerOnlySkillName(e) {
  return WORKER_ONLY_SKILL_NAMES.find((n) => n === e);
}
//@ chunk-e6aww6q8.js:2053280-2053302 placement
/**
 * gatedInternalCommand：构建期为 null。
 */
var gatedInternalCommand = null;
var gatedInPlaceWriteCommand = null;
//@ chunk-e6aww6q8.js:2053302-2053315 placement
if (gatedInPlaceWriteCommand) markInPlaceWriteForced();
//@ chunk-e6aww6q8.js:2053315-2054702 fingerprint = usageReport (0.431)
/**
 * promoteMemoryCommands：构建期为 null；注册表里取 .promoteMemory/.promoteMemoryNonInteractive。
 */
var promoteMemoryCommands = null;
var accountMemoryCommands = null;
var gatedCommandSlot_1 = null;
var gatedCommandSlot_5 = null;
var gatedCommandSlot_2 = null;
var gatedCommandSlot_3 = null;
var gatedCommandSlot_4 = null;
var briefCommand = require("./chunk-gv7qjj2t.js").default;
var remoteControlCommand = require("./chunk-53mky9yr.js").default;
var daemonCommand = require("./chunk-0e9ty0k2.js").default;
var gatedCommandSlot_6 = null;
var gatedCommandSlot_7 = null;
var recapCommand = require("./chunk-66drwgm7.js").default;
var gatedCommandSlot_8 = null;
var gatedCommandSlot_9 = null;
var gatedCommandSlot_10 = null;
var gatedCommandSlot_11 = null;
var goalCommandModule = require("./chunk-nn4xbsmj.js");
var goalCommand = goalCommandModule.default;
var goalNonInteractive = goalCommandModule.goalNonInteractive;
var workflowsCommand = require("./chunk-g8tswn69.js").default;
var webSetupCommand = require("./chunk-yddv4we7.js").default;
var EMPTY_COMMAND_LIST = [];
var listAgentsCommand = require("./chunk-yxzqxbzv.js").default;
var gatedCommandSlot_12 = null;
var gatedCommandSlot_13 = null;
var gatedCommandSlot_14 = null;
var gatedCommandSlot_15 = null;
var backgroundCommand = require("./chunk-3m7t4vj8.js").default;
var stopCommandModule = require("./chunk-adzz9hc5.js");
var stopCommand = stopCommandModule?.default ?? null;
var stopNonInteractive = stopCommandModule?.stopNonInteractive ?? null;
var gatedCommandSlot_16 = null;
var loginCommand = loginCommand_2();
var usageReport = {
  type: "prompt",
  name: "insights",
  description: "Generate a report analyzing your Claude Code sessions",
  contentLength: 0,
  progressMessage: "analyzing your sessions",
  source: "builtin",
  disableModelInvocation: true,
  policyGate: {
    policy: "allow_insights",
  },
  requires: {
    workspace: true,
  },
  async getPromptForCommand(args, context) {
    let real = (await import("./chunk-yt6zn9vg.js")).default;
    if (real.type !== "prompt") throw Error("unreachable");
    return real.getPromptForCommand(args, context);
  },
};
var INTERNAL_ONLY_COMMANDS = [
  ...(gatedCommandSlot_2 ? [gatedCommandSlot_2] : []),
  ...(gatedCommandSlot_3 ? [gatedCommandSlot_3] : []),
  ...(gatedCommandSlot_1 ? [gatedCommandSlot_1] : []),
  stubCommand_1,
  stubTerminalSetupCommand,
  commitPushPrCommand,
  stubAntTraceCommand,
  ...(gatedCommandSlot_16 ? [gatedCommandSlot_16] : []),
  stubCommand_3,
  versionCommand,
  versionNonInteractiveCommand,
  stubCommand_4a,
  stubCommand_4b,
  stubCommand_8,
  stubCommand_5a,
  stubCommand_6a,
  stubCommand_2,
  stubScrollSpeedCommand_2,
  stubScrollSpeedCommand,
  stubCommand_7,
  stubCommand_9,
  stubCommand_10,
  stubC4EUpsellCommand,
  stubCommand_11,
  stubCommand_12,
  stubCommand_13,
  gatedInternalCommand,
  ...(gatedCommandSlot_13 ? [gatedCommandSlot_13] : []),
  ...(gatedCommandSlot_14 ? [gatedCommandSlot_14] : []),
].filter(Boolean);
var filtered = [
  gatedInPlaceWriteCommand,
  gatedCommandSlot_8,
  gatedCommandSlot_9,
  gatedCommandSlot_10,
  gatedCommandSlot_11,
  gatedCommandSlot_6,
  gatedCommandSlot_15,
  gatedCommandSlot_5,
  gatedCommandSlot_7,
].filter(Boolean);
//@ chunk-e6aww6q8.js:2054702-2055052 layout
/**
 * getRuntimeGatedCommandGroups：fleetFork/fleetBackground/daemon/skillDoctor/logout 五组 {open, whenOpen, whenClosed}。
 */
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
    daemon: {
      open: () => isDaemonWorkerRegistryEnabled(),
      whenOpen: [daemonCommand],
      whenClosed: [],
    },
    skillDoctor: {
      open: () => lanternPrismEnabled(),
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
//@ chunk-e6aww6q8.js:2055052-2055101 file-local
/**
 * compactCommandList：filter(Boolean)；旧版名 filterCommandsForRemoteMode 配错（门面把它给了 gjo）。
 */
function compactCommandList(commands) {
  return commands.filter((cmd) => Boolean(cmd));
}
//@ chunk-e6aww6q8.js:2055101-2055176 layout
/**
 * getRuntimeGatedGroup：按组 open() 取 whenOpen 或 whenClosed。
 */
function getRuntimeGatedGroup(groupName) {
  let group = getRuntimeGatedCommandGroups()[groupName];
  return compactCommandList(group.open() ? group.whenOpen : group.whenClosed);
}
//@ chunk-e6aww6q8.js:2055176-2055270 facade-exports
/**
 * getRuntimeGatedBuiltinCommands：五个运行时门控组（fleetFork、fleetBackground、daemon、skillDoctor、logout）的 whenOpen 与 whenClosed 全部成员。
 */
function getRuntimeGatedBuiltinCommands() {
  return Object.values(getRuntimeGatedCommandGroups()).flatMap((e) =>
    compactCommandList([...e.whenOpen, ...e.whenClosed]),
  );
}
//@ chunk-e6aww6q8.js:2055270-2056322 facade-exports
/**
 * buildBuiltinCommandTable：按固定顺序列出全部内建命令对象（约 145 项，含运行时门控组与构建期为 null 的占位），filter(Boolean) 后返回；结果由 getBuiltinCommandTable 缓存在 state.builtinCommandTable。
 */
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
    ...(gatedCommandSlot_4 ? [gatedCommandSlot_4] : []),
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
    ...(gatedCommandSlot_12 ? [gatedCommandSlot_12] : []),
    tasksCommand,
    autofixPrCommand,
    ...[],
    ...EMPTY_COMMAND_LIST,
    teleportCommand,
    workflowsCommand,
    artifactsCommand,
    teamOnboardingCommand,
    radioCommand,
    ...(gatedCommandSlot_8 ? [gatedCommandSlot_8] : []),
    ...(gatedCommandSlot_9 ? [gatedCommandSlot_9] : []),
    ...(gatedCommandSlot_10 ? [gatedCommandSlot_10] : []),
    ...(gatedCommandSlot_11 ? [gatedCommandSlot_11] : []),
    ...(gatedCommandSlot_6 ? [gatedCommandSlot_6] : []),
    ...(gatedCommandSlot_15 ? [gatedCommandSlot_15] : []),
    ...(gatedCommandSlot_7 ? [gatedCommandSlot_7] : []),
    ...ENTERPRISE_UPSELL_COMMANDS,
    ...(gatedInPlaceWriteCommand ? [gatedInPlaceWriteCommand] : []),
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
    ...(gatedCommandSlot_5 && !isEnvTruthy(env.IS_DEMO) ? [gatedCommandSlot_5] : []),
    ...[],
  ];
}
//@ chunk-e6aww6q8.js:2056322-2056969 facade-exports
/**
 * REMOTE_SAFE_COMMANDS：远程模式（--remote）下仍可在本地执行的命令集合。
 */
var REMOTE_SAFE_COMMANDS = new Set([
  sessionCommand,
  exitCommand,
  helpCommand,
  themeCommand,
  colorCommand,
  ...(gatedCommandSlot_15 ? [gatedCommandSlot_15] : []),
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
  ...(gatedCommandSlot_1 ? [gatedCommandSlot_1] : []),
  ...(gatedCommandSlot_5 ? [gatedCommandSlot_5] : []),
  powerupCommand,
  passesCommand,
  usageCreditsCommand,
  extraUsageCommand,
  upgradeCommand,
  loginCommand,
  rateLimitOptionsCommand,
  claimCreditCommand,
  ...(gatedInternalCommand ? [gatedInternalCommand] : []),
  ...(gatedCommandSlot_6 ? [gatedCommandSlot_6] : []),
  ...(gatedCommandSlot_7 ? [gatedCommandSlot_7] : []),
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
  ...(gatedCommandSlot_14 ? [gatedCommandSlot_14] : []),
  recapCommand,
  reloadSkillsCommand,
  pauseMemoryCommand,
  agentsRemovedCommand,
  reloadPluginsCommand,
  ...(gatedCommandSlot_16 ? [gatedCommandSlot_16] : []),
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
]);
var BRIDGE_SAFE_COMMANDS = new Set([
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
  ...(gatedCommandSlot_12 ? [gatedCommandSlot_12] : []),
  fastNonInteractiveCommand,
  focusNonInteractiveCommand,
  effortNonInteractiveCommand,
  advisorNonInteractiveCommand,
  modelNonInteractiveCommand,
  mcpNonInteractiveCommand,
  ...(gatedCommandSlot_14 ? [gatedCommandSlot_14] : []),
  ...(recapCommand ? [recapCommand] : []),
  skillDoctorNonInteractiveCommand,
  ...(listAgentsCommand ? [listAgentsCommand] : []),
  ...(gatedCommandSlot_8 ? [gatedCommandSlot_8] : []),
  reloadPluginsCommand,
  reloadSkillsCommand,
  restartCommand,
]);
//@ chunk-e6aww6q8.js:2056969-2057141 facade-exports = isBridgeSafeCommand (0.82)
/**
 * isBridgeSafeCommand：prompt 命令一律可桥接；local-jsx 不可；local 命令需在 BRIDGE_SAFE_COMMANDS 里。
 */
function isBridgeSafeCommand(cmd) {
  if (cmd.type === "local-jsx") return false;
  if (cmd.type === "prompt") return cmd.disableBridgeInvocation !== true;
  if (BRIDGE_SAFE_COMMANDS.has(cmd)) return cmd !== restartCommand || false;
  return isPluginLocalCommand(cmd) && findBridgeFallback(cmd) === undefined;
}
//@ chunk-e6aww6q8.js:2057141-2057229 facade-exports
/**
 * admitsBridgeAuthor：判断桥接端提交的斜杠命令是否允许执行（插件注册的 local 命令需要能找到桥接安全的孪生命令）。
 */
function admitsBridgeAuthor(cmd, submission) {
  if (!isPluginLocalCommand(cmd)) return true;
  return submission.origin?.kind === "human" && !submission.relayAuthored;
}
//@ chunk-e6aww6q8.js:2057229-2057252 layout
/**
 * BRIDGE_TWINS_FOR_PLUGIN_COMMANDS：new Set([contextNonInteractive])：插件同名 local 命令也可由这些桥接安全孪生代答。
 */
var BRIDGE_TWINS_FOR_PLUGIN_COMMANDS = new Set([contextNonInteractiveCommand]);
//@ chunk-e6aww6q8.js:2057252-2057408 facade-exports
/**
 * findBridgeFallback：为插件注册的同名 local 命令找到可代答的桥接安全内建孪生命令。
 */
function findBridgeFallback(cmd) {
  let isPluginLocal = isPluginLocalCommand(cmd);
  if (cmd.type !== "local-jsx" && !isPluginLocal) return;
  for (let twin of BRIDGE_SAFE_COMMANDS)
    if (twin.name === cmd.name && twin.type === "local")
      return isPluginLocal && !BRIDGE_TWINS_FOR_PLUGIN_COMMANDS.has(twin) ? undefined : twin;
  return;
}
//@ chunk-e6aww6q8.js:2057408-2057455 facade-exports
/**
 * isBridgeDispatchable：命令能否通过桥接派发（综合 isBridgeSafeCommand 与插件孪生回退）。
 */
function isBridgeDispatchable(e) {
  return isBridgeSafeCommand(e) || findBridgeFallback(e) !== undefined;
}
//@ chunk-e6aww6q8.js:2057455-2057577 facade-exports
/**
 * filterCommandsForRemoteMode：只保留 REMOTE_SAFE_COMMANDS 中的命令。
 */
function filterCommandsForRemoteMode(commands) {
  return commands.filter(
    (cmd) =>
      (cmd.type === "prompt" &&
        (cmd.source === "builtin" || cmd.source === "bundled") &&
        isUsableWithoutWorkspace(cmd)) ||
      REMOTE_SAFE_COMMANDS.has(cmd),
  );
}
//@ chunk-e6aww6q8.js:2057577-2057965 facade-exports = command (0.607)
/**
 * withWorkerOnlyCommands：在命令列表后补上 Worker 环境专有的技能名（不与一方命令重名时）。
 */
function withWorkerOnlyCommands(commands, workerCommandNames) {
  if (workerCommandNames === null) return commands;
  let isFirstParty = firstPartyCommandNameCheck();
  let taken = new Set(
    commands.flatMap((command) => [command.name, getCommandName(command), ...(command.aliases ?? [])]),
  );
  let extras = Array.from(workerCommandNames)
    .filter(
      (workerCommandName) =>
        !taken.has(workerCommandName) &&
        !isFirstParty(workerCommandName) &&
        workerOnlySkillName(foldName_2(workerCommandName)) === undefined &&
        !workerCommandName.startsWith("mcp__") &&
        workerCommandName.split(":").every(isSafeSkillName),
    )
    .map((name) => ({
      type: "prompt",
      name,
      description: "",
      progressMessage: "",
      contentLength: 0,
      source: "mcp",
      getPromptForCommand: async () => [],
    }));
  return extras.length > 0 ? [...commands, ...extras] : commands;
}
//@ chunk-e6aww6q8.js:2057965-2058072 facade-exports
/**
 * getHumanFacingDescription：取命令面向用户的描述（技能优先用 description，过长时截断）。
 */
function getHumanFacingDescription(cmd) {
  if (cmd.type !== "prompt" || !isBuiltinCommand(cmd)) return cmd.description;
  return cmd.menuDescription || cmd.description;
}
//@ chunk-e6aww6q8.js:2058072-2058536 facade-exports = formatDescriptionWithSource (0.774)
/**
 * formatDescriptionWithSource：描述后附加来源标注，例如 (plugin X)、(user)、(project)、(MCP)。
 */
function formatDescriptionWithSource(cmd, description = cmd.description) {
  if (cmd.type !== "prompt") return description;
  if (cmd.kind === "workflow") return `${description} (dynamic workflow)`;
  if (cmd.source === "plugin") {
    if (isSyncedMarketplacePlugin(cmd.pluginInfo?.repository))
      return `${description} (${CLAUDE_AI_SYNC_LABEL})`;
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
//@ chunk-e6aww6q8.js:2058536-2058596 facade-exports
/**
 * toSlashCommands：把命令列表转换为 SDK/控制协议用的 slash_commands 条目（name、description、argumentHint、aliases）。
 */
function toSlashCommands(e) {
  let isFolderAlias = folderNameAliasCheck();
  return mergeClients(e).map((r) => toSlashCommand(r, isFolderAlias));
}
//@ chunk-e6aww6q8.js:2058596-2058962 facade-exports
/**
 * toSlashCommand：单条转换；目录同名别名（named-folder alias）与内建命令的 aliases 会展开为额外拼写。
 */
function toSlashCommand(cmd, isFolderAlias) {
  let displayName = getCommandName(cmd);
  let isBuiltin = isBuiltinCommand(cmd);
  let qualifiedName =
    cmd.name !== displayName &&
    (cmd.name.includes(":") || (cmd.type === "prompt" && !cmd.isMcp && !isBuiltin && isFolderAlias(cmd.name)))
      ? cmd.name
      : undefined;
  let aliases = cmd.aliases?.filter((alias) => alias !== displayName);
  let allAliases =
    qualifiedName && !aliases?.includes(qualifiedName) ? [...(aliases ?? []), qualifiedName] : aliases;
  return {
    name: displayName,
    description: formatDescriptionWithSource(cmd),
    argumentHint: cmd.argumentHint || "",
    aliases: allAliases?.length ? allAliases : undefined,
    ...(isBuiltin && {
      builtin: true,
    }),
    ...(cmd.registeredBy !== undefined && {
      plugin: cmd.registeredBy,
    }),
  };
}
//@ chunk-e6aww6q8.js:2058962-2059003 facade-exports = BUILTIN_MARKETPLACE_NAME (1)
/**
 * 插件 ID 的市场部分是否为 builtin（内置插件）。
 */
function isBuiltinCommand(cmd) {
  return getCommandOriginKind(cmd) === "builtin";
}
//@ chunk-e6aww6q8.js:2059003-2059045 facade-exports
/**
 * bridgeAdvertisedCommands：向桥接端（claude.ai 远程会话）公布的命令列表，只含可桥接派发者。
 */
function bridgeAdvertisedCommands(commands) {
  return mergeClients(commands).filter(isBridgeDispatchable);
}
//@ chunk-e6aww6q8.js:2059045-2059523 facade-exports
/**
 * toBridgeSlashCommands：把可桥接命令转换为带来源和描述的公布条目。
 */
function toBridgeSlashCommands(commands) {
  let result = [];
  let isFolderAlias = folderNameAliasCheck();
  for (let cmd of bridgeAdvertisedCommands(commands)) {
    if (cmd.isHidden) continue;
    let displayName = getCommandName(cmd);
    let advertisedName;
    if (findCommand(displayName, commands) === cmd) advertisedName = displayName;
    else if (cmd.name !== displayName && findCommand(cmd.name, commands) === cmd) advertisedName = cmd.name;
    else continue;
    let source = findBridgeFallback(cmd) ?? cmd;
    let described =
      source.menuDescription != null && source.menuDescription !== ""
        ? {
            ...source,
            description: source.menuDescription,
          }
        : source;
    let entry = toSlashCommand(
      {
        ...described,
        userFacingName: () => advertisedName,
      },
      isFolderAlias,
    );
    if (isBuiltinCommand(cmd)) entry.builtin = true;
    else delete entry.builtin;
    let aliases = (source !== cmd ? (cmd.aliases ?? []) : (entry.aliases ?? [])).filter(
      (Z) => Z !== advertisedName && findCommand(Z, commands) === cmd,
    );
    entry.aliases = aliases.length ? aliases : undefined;
    result.push(entry);
  }
  return result;
}
//@ chunk-e6aww6q8.js:2059523-2059588 layout
/**
 * isPluginLocalCommand：type=local 且 loadedFrom=plugin（函数钩子插件注册的命令）。
 */
function isPluginLocalCommand(cmd) {
  return cmd.type === "local" && cmd.loadedFrom === "plugin";
}
//@ chunk-e6aww6q8.js:2059588-2059665 layout
/**
 * addShippedCommandSpellings：运行时门控内建、内建技能、内建插件技能名都加入集合。
 */
function addShippedCommandSpellings(e) {
  addRuntimeGatedCommandSpellings(e);
  for (let n of getRegisteredBundledSkillsIgnoringKillSwitch()) addCommandSpellings(e, n);
  for (let n of builtinPluginSkillNames()) addSpelling(e, n);
}
//@ chunk-e6aww6q8.js:2059665-2059708 layout
/**
 * addRuntimeGatedCommandSpellings：对 getRuntimeGatedBuiltinCommands() 逐个 addCommandSpellings。
 */
function addRuntimeGatedCommandSpellings(e) {
  for (let n of getRuntimeGatedBuiltinCommands()) addCommandSpellings(e, n);
}
//@ chunk-e6aww6q8.js:2059708-2059852 layout
/**
 * getReservedSpellingsFor：state.reservedSpellingsFor 缓存：命令列表占用的全部拼写。
 */
function getReservedSpellingsFor(allCommands) {
  return getHostState().reservedSpellingsFor(allCommands, () => {
    let n = new Set();
    for (let r of allCommands) if (r.loadedFrom !== "syncedSkills") addCommandSpellings(n, r);
    addShippedCommandSpellings(n);
    return n;
  });
}
//@ chunk-e6aww6q8.js:2059852-2059936 layout
/**
 * getBuiltinCommandTable：state.builtinCommandTable ??= buildBuiltinCommandTable()。
 */
function getBuiltinCommandTable() {
  let state = getHostState();
  state.builtinCommandTable ??= buildBuiltinCommandTable();
  return state.builtinCommandTable;
}
//@ chunk-e6aww6q8.js:2059936-2060068 facade-exports
/**
 * builtInCommandNames：内建命令占用的全部拼写（name、显示名、aliases，规范化后）的集合，用于技能/插件命名冲突检查。
 */
function builtInCommandNames() {
  let hostState = getHostState();
  hostState.builtinCommandNames ??= new Set(
    getBuiltinCommandTable().flatMap((n) => [n.name, ...(n.aliases ?? [])]),
  );
  return hostState.builtinCommandNames;
}
//@ chunk-e6aww6q8.js:2060068-2060223 facade-exports
/**
 * shippedCommandNames：内建表 + 运行时门控命令 + 发行内建技能/内建插件技能的全部拼写，用于遥测时判断命令名是否可原样上报。
 */
function shippedCommandNames() {
  let hostState = getHostState();
  hostState.shippedCommandNames ??= new Set([
    ...builtInCommandNames(),
    ...getBundledSkills().flatMap((n) => [n.name, ...(n.aliases ?? [])]),
    ...builtinPluginSkillNames(),
  ]);
  return hostState.shippedCommandNames;
}
//@ chunk-e6aww6q8.js:2060223-2060255 facade-exports
/**
 * isFirstPartyCommandName：名字是否属于一方命令拼写。
 */
function isFirstPartyCommandName(name) {
  return firstPartyCommandNameCheck()(name);
}
//@ chunk-e6aww6q8.js:2060255-2060306 facade-exports
/**
 * firstPartyCommandNameCheck：名字是否被一方（内建/发行技能）命令占用的检查器。
 */
function firstPartyCommandNameCheck() {
  let builtinCommandSpellings = collectBuiltinCommandSpellings();
  return (n) => builtinCommandSpellings.has(foldName_2(n));
}
//@ chunk-e6aww6q8.js:2060306-2060368 facade-exports
/**
 * folderNameAliasCheck：插件命名目录别名（named-folder）是否与已有命令冲突。
 */
function folderNameAliasCheck() {
  let e;
  return (n) =>
    isSafeSkillName(n) && !isQualifiedToolReference(foldName_2(n), (e ??= collectBuiltinCommandSpellings()));
}
//@ chunk-e6aww6q8.js:2060368-2060439 layout
/**
 * collectBuiltinCommandSpellings：内建表 + 发行内建技能的所有拼写。
 */
function collectBuiltinCommandSpellings() {
  let spellings = new Set();
  for (let n of getBuiltinCommandTable()) addCommandSpellings(spellings, n);
  addShippedCommandSpellings(spellings);
  return spellings;
}
//@ chunk-e6aww6q8.js:2060439-2060481 facade-exports
/**
 * shippedCommandNameForAnalytics：命令名属于发行内建拼写时原样返回，否则返回 "custom"，避免上报用户自定义命令名。
 */
function shippedCommandNameForAnalytics(e) {
  return parentCommandName(e, shippedCommandNames().has(e));
}
//@ chunk-e6aww6q8.js:2060481-2060507 facade-exports
/**
 * getBuiltinCommands：返回缓存的内建命令表（不含技能、插件、MCP）。
 */
function getBuiltinCommands() {
  return getBuiltinCommandTable();
}
//@ chunk-e6aww6q8.js:2060507-2061509 fingerprint = getSkills (0.755)
/**
 * getSkills：并发加载技能目录、插件技能、发行内建技能与内建插件技能；任一来源失败只记日志并返回空。
 */
async function getSkills(cwd, storage) {
  let failureReason = null;
  let skillDirFailed = false;
  let pluginSkillsFailed = false;
  try {
    let [skillDirCommands, pluginSkills] = await Promise.all([
      getSkillDirCommandsCached(cwd, storage).catch((err) => {
        if (isSyscallError(err))
          logForDebugging(`Skill directory commands failed to load (${err.code}), continuing without them`, {
            level: "error",
          });
        else {
          logError(toError(err));
          logForDebugging("Skill directory commands failed to load, continuing without them");
        }
        failureReason = "cmd_load_skill_dir_failed";
        skillDirFailed = true;
        return [];
      }),
      loadPluginSkills(storage).catch((err) => {
        logError(toError(err));
        failureReason = "cmd_load_plugin_skills_failed";
        pluginSkillsFailed = true;
        logForDebugging("Plugin skills failed to load, continuing without them");
        return [];
      }),
    ]);
    let bundledSkills = getBundledSkills();
    let builtinPluginSkills = availableBuiltinSkillCommands();
    logForDebugging(
      `getSkills returning: ${skillDirCommands.length} skill dir commands, ${pluginSkills.length} plugin skills, ${bundledSkills.length} bundled skills, ${builtinPluginSkills.length} builtin plugin skills`,
    );
    if (failureReason) logFeatureBad("cmd_load", failureReason);
    else logFeatureOk("cmd_load");
    return {
      skillDirCommands,
      pluginSkills,
      bundledSkills,
      builtinPluginSkills,
      trustedNamesFailedToLoad: skillDirFailed || pluginSkillsFailed,
    };
  } catch (err) {
    logError(toError(err));
    logFeatureSad("cmd_load", "cmd_load_skills_failed");
    logForDebugging("Unexpected error in getSkills, returning empty");
    return {
      skillDirCommands: [],
      pluginSkills: [],
      bundledSkills: [],
      builtinPluginSkills: [],
      trustedNamesFailedToLoad: true,
    };
  }
}
//@ chunk-e6aww6q8.js:2061509-2061615 fingerprint = getWorkflowCommands (0.344)
var { getWorkflowCommands, invalidateWorkflowCache, warmWorkflows } = require("./chunk-qzez70vf.js");
//@ chunk-e6aww6q8.js:2061615-2061737 facade-exports
/**
 * commandsMemoKey：命令缓存键，由 cwd、存储 v5 开关与隐藏插件列表组成。
 */
function commandsMemoKey(
  cwd,
  hiddenPlugins = getHeldBackSyncedPlugins(),
  storageV5 = isTopHostSkillPluginSession(),
) {
  return `${getDynamicSkillStateKeyExport()}:${bundledSkillsGateKey()}:${getIsNonInteractiveSession()}:${getSkillsSyncVetoed()}:${getAccountCacheKey()}:${isSkillsSyncEnvOn()}:${storageV5}:${hidePrefixForSkills(hiddenPlugins)}${managedFolderCondition()}${keyOrNull(cwd)}`;
}
//@ chunk-e6aww6q8.js:2061737-2061820 layout
/**
 * loadAllCommands：同旧版 loadAllCommands：按 commandsMemoKey 缓存 loadAllCommandsUncached。
 */
function loadAllCommands(cwd, storage, storageV5) {
  return getOrCreate(getHostState().loadedCommands, commandsMemoKey(cwd, undefined, storageV5), () =>
    loadAllCommandsUncached(cwd, storage, storageV5),
  );
}
//@ chunk-e6aww6q8.js:2061820-2062015 facade-exports
/**
 * warmCommandSourceCaches：启动时并发预热技能目录、插件命令/技能与内建技能的缓存，记录耗时。
 */
async function warmCommandSourceCaches(cwd, storage) {
  try {
    let startedAt = performance.now();
    await Promise.allSettled([
      Promise.allSettled([getSkillDirCommandsCached(cwd, storage), loadPluginSkills(storage)]).then(() =>
        recordPhase("skills_load_ms", performance.now() - startedAt, startedAt),
      ),
      getPluginCommands(storage),
      warmWorkflows(cwd, storage),
    ]);
  } catch {}
}
//@ chunk-e6aww6q8.js:2062015-2062187 layout
/**
 * markBareNameReserved：syncedSkills 命令加 bareNameReserved:true。
 */
function markBareNameReserved(cmd) {
  if (
    cmd.type !== "prompt" ||
    cmd.loadedFrom !== "syncedSkills" ||
    cmd.bareNameReserved ||
    cmd.unqualifiedName == null ||
    getSyncedSkillUnqualifiedAlias(cmd) !== undefined
  )
    return cmd;
  return {
    ...cmd,
    bareNameReserved: true,
  };
}
//@ chunk-e6aww6q8.js:2062187-2063538 layout
/**
 * loadAllCommandsUncached：合并技能目录、附加目录技能、工作流、插件命令、插件技能、内建技能、内建插件技能与内建表；校验名字、处理 claude.ai 同步技能与保留名、丢弃被遮蔽的 fallback 技能、剥离冲突别名，并上报冲突遥测。
 */
async function loadAllCommandsUncached(cwd, storage, storageV5) {
  let startedAt = performance.now();
  let [
    { skillDirCommands, pluginSkills, bundledSkills, builtinPluginSkills, trustedNamesFailedToLoad },
    pluginCommands,
    workflowCommands,
  ] = await Promise.all([
    getSkills(cwd, storage).then((skills) => {
      recordPhase("skills_load_ms", performance.now() - startedAt, startedAt);
      return skills;
    }),
    getPluginCommands(storage),
    getWorkflowCommands(cwd, storage),
  ]);
  let localSkillDirCommands = skillDirCommands.filter(
    (skillDirCommand) => skillDirCommand.loadedFrom !== "syncedSkills",
  );
  let listed = checkCommandListable(
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
      let ze = usesReservedSkillNamespace(We.name);
      refuseReservedSkillName({
        name: ze ? We.name : getCommandName(We),
        path: We.type === "prompt" ? We.skillRoot : undefined,
        change: We.kind === "workflow" ? "workflow-name" : ze ? "path" : "frontmatter-name",
      });
    },
  );
  let syncedSkills = skillDirCommands.filter(
    (skillDirCommand) => skillDirCommand.loadedFrom === "syncedSkills",
  );
  let reserved = new Set();
  if (syncedSkills.length > 0) {
    addNonSyncedSpellings(reserved, listed);
    addNonSyncedSpellings(reserved, conditionalSkillEntries());
    addShippedCommandSpellings(reserved);
  }
  if (trustedNamesFailedToLoad && syncedSkills.length > 0)
    logForDebugging(
      `[skills] local or plugin skills failed to load; ${syncedSkills.length} synced skill(s) answer only to anthropic-skills:<name> this session because their bare names cannot be checked for collisions`,
    );
  let acceptedSyncedSkills = admitSyncedSkills(
    trustedNamesFailedToLoad ? syncedSkills.map(admitAllAliases) : syncedSkills,
    reserved,
    (We) =>
      logForDebugging(
        `[skills] dropping synced skill '${We.name}' (display '${getCommandName(We)}'): its name is blank, or another command or an earlier synced skill already owns that namespaced name`,
      ),
  ).map(markBareNameReserved);
  let [reservedNameCommands, otherCommands] = SS(listed, (We) => isShadowedSkillName(We));
  let result = shedReservedAliases(
    dropShadowedFallbackSkills([...otherCommands, ...acceptedSyncedSkills, ...reservedNameCommands]),
    storageV5,
  );
  if (trustedNamesFailedToLoad) getHostState().markLoadedResultMissingTrustedNames(result);
  groupPluginSourcesByName(
    "command",
    result
      .map((We) => ({
        name: We.name,
        source: We.type === "prompt" ? We.source : "builtin",
      }))
      .reverse(),
    {
      resolves: true,
    },
  );
  logRefusedReservedSkillNames();
  return result;
}
//@ chunk-e6aww6q8.js:2063538-2063886 layout
/**
 * logRefusedReservedSkillNames：一次性上报 skill_reserved_namespace 遥测。
 */
function logRefusedReservedSkillNames() {
  let e = getHostState().refusedReservedSkillNames();
  if (e.length === 0 || !claimOnce().claim("skill_reserved_namespace_refused")) return;
  let n = {
    refused: e.length,
  };
  for (let { name: r, change } of e) {
    let y = [
      `ns_${(getReservedSkillNamespace(r) ?? "unknown").replaceAll("-", "_")}`,
      `kind_${change.replaceAll("-", "_")}`,
    ];
    for (let S of y) n[S] = (n[S] ?? 0) + 1;
  }
  logFeatureSad("skill_reserved_namespace", "names_refused", n);
}
//@ chunk-e6aww6q8.js:2063886-2063994 facade-exports
/**
 * getCommands：会话可用的全部斜杠命令。内部调用 assembleCommands（加载、可用性/启用过滤、动态技能插入），再经命令集钩子（插件 hookedCommands）与插件隐藏表处理；按 cwd+存储+隐藏插件做键缓存。
 */
async function getCommands(
  cwd,
  storage,
  hiddenPlugins = getHeldBackSyncedPlugins(),
  storageV5 = isTopHostSkillPluginSession(),
) {
  let commands = await hookedCommands_2(await assembleCommands(cwd, storage, storageV5));
  return hiddenPlugins.size === 0
    ? commands
    : hideSkillsBehindPlugins(commands, hiddenPlugins, getSyncedSkillCommands());
}
//@ chunk-e6aww6q8.js:2063994-2064129 facade-exports
/**
 * getHiddenSyncedSkills：被保留名挡住而未提供的 claude.ai 同步技能。
 */
async function getHiddenSyncedSkills(cwd, storage, hiddenPlugins) {
  if (hiddenPlugins.size === 0) return [];
  return (await getCommands(cwd, storage, hiddenPlugins)).filter(
    (s) => s.type === "prompt" && s.hiddenBehindPlugin !== undefined,
  );
}
//@ chunk-e6aww6q8.js:2064129-2067775 layout
/**
 * assembleCommands：getCommands 的主体。按 availability 与 isCommandEnabled 过滤；附加目录里的项目技能去重；处理条件技能、同步技能；嵌套 .claude/skills 的技能按目录加作用域前缀；把动态技能插入到第一个内建命令之前。
 */
async function assembleCommands(cwd, storage, storageV5) {
  setHistoryStore(getBuiltinCommands);
  let allCommands = await loadAllCommands(cwd, storage, storageV5);
  let shadowedProjectSkills = new Set();
  if (getAdditionalDirectoriesForClaudeMd().length > 0) {
    let hn = new Set();
    for (let command of allCommands) {
      let yn =
        command.type === "prompt" && command.loadedFrom === "skills" && command.source === "projectSettings"
          ? getSkillProjectRoot(command)
          : null;
      if (
        yn !== null &&
        hn.has(command.name) &&
        (cwd === null ||
          !isPathWithin_2(yn, cwd, {
            alreadyComparable: true,
          })) &&
        findAdditionalDirRoot(yn) !== null
      ) {
        shadowedProjectSkills.add(command);
        continue;
      }
      hn.add(command.name);
      for (let Kn of command.aliases ?? []) hn.add(Kn);
    }
  }
  let baseCommands =
    shadowedProjectSkills.size === 0
      ? allCommands
      : allCommands.filter((command) => !shadowedProjectSkills.has(command));
  let syncAllowed = !getSkillsSyncVetoed();
  let withTrustedNames = getHostState().loadedResultIsMissingTrustedNames(allCommands)
    ? (hn) => hn.map((ho) => (ho.loadedFrom === "syncedSkills" ? admitAllAliases(ho) : ho))
    : (hn) => hn;
  let dynamicSkills = getDynamicSkills();
  let realRootByCommand = getHostState().realSkillRootByCommand;
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
    dynamicSkills.flatMap((dynamicSkill) =>
      dynamicSkill.type === "prompt" && dynamicSkill.skillRoot
        ? [realRootByCommand.get(dynamicSkill) ?? resolve_2(dynamicSkill.skillRoot)]
        : [],
    ),
  );
  let dynamicAndShadowed = withTrustedNames([
    ...(syncAllowed ? dynamicSkills : dynamicSkills.filter((dynamicSkill) => !isSyncedSkill(dynamicSkill))),
    ...[...shadowedProjectSkills].filter(
      (shadowedProjectSkill) =>
        !(
          shadowedProjectSkill.type === "prompt" &&
          shadowedProjectSkill.skillRoot &&
          q.has(realRootByCommand.get(shadowedProjectSkill) ?? resolve_2(shadowedProjectSkill.skillRoot))
        ),
    ),
  ]);
  let hostCatalogSkills = syncAllowed
    ? SS(
        withTrustedNames(getSyncedSkillCommands()).filter((hn) => !isKilledHostCatalogSkill(hn)),
        (hn) => !isHostCatalogSkill(hn),
      ).flat()
    : [];
  let dropHostDuplicates =
    hostSkillCatalog() === undefined
      ? (hn) => hn
      : (hn) =>
          hideDuplicateCatalogSkills(hn, [...dynamicAndShadowed, ...hostCatalogSkills]).filter(
            (ho) => !isKilledHostCatalogSkill(ho),
          );
  let extraCommands = dropHostDuplicates(dynamicAndShadowed);
  let filteredBase = dropHostDuplicates(baseCommands).filter(
    (hn) => meetsAvailabilityRequirement(hn) && isCommandEnabled(hn),
  );
  if (extraCommands.length === 0 && hostCatalogSkills.length === 0) return filteredBase;
  let scopeCache = new Map();
  let scopeOf = (hn) => {
    let ho = scopeCache.get(hn);
    if (ho === undefined) {
      ho = getSkillScopeLabel(hn, cwd);
      scopeCache.set(hn, ho);
    }
    return ho;
  };
  let offeredExtras = dropAmbiguousScopedSkills(
    extraCommands.filter(
      (extraCommand) => meetsAvailabilityRequirement(extraCommand) && isCommandEnabled(extraCommand),
    ),
    scopeOf,
    filteredBase,
  );
  let needsReservedCheck =
    hostCatalogSkills.length > 0 ||
    offeredExtras.some((hn) => hn.loadedFrom === "syncedSkills") ||
    filteredBase.some((hn) => hn.loadedFrom === "syncedSkills");
  let reserved = new Set(needsReservedCheck ? getReservedSpellingsFor(allCommands) : []);
  if (needsReservedCheck) {
    addNonSyncedSpellings(reserved, offeredExtras);
    addNonSyncedSpellings(reserved, conditionalSkillEntries());
    for (let hn of offeredExtras) {
      if (hn.loadedFrom === "syncedSkills" || isFallbackSkill(hn)) continue;
      let ho = scopeOf(hn);
      if (ho) addSpelling(reserved, joinScopedName(ho, hn.name));
    }
  }
  let base = needsReservedCheck
    ? admitSyncedSkills(filteredBase, reserved).map(markBareNameReserved)
    : filteredBase;
  let baseNames = new Set();
  let baseSkillRoots = new Set();
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
  let Et = new Set();
  let yt = new Set();
  let gt = new Map();
  for (let hn of offeredExtras) {
    let ho = scopeOf(hn);
    let skillProjectRoot = getSkillProjectRoot(hn);
    if (ho === null || skillProjectRoot === null || hn.type !== "prompt" || !hn.skillRoot) continue;
    let Kn = joinScopedName(ho, hn.name);
    let Xn = cwd === null ? null : relative(cwd, skillProjectRoot);
    if (Xn !== null && !Xn.startsWith("..") && !isAbsolute(Xn)) {
      yt.add(Kn);
      continue;
    }
    Et.add(hn);
    let fo = gt.get(Kn) ?? new Set();
    fo.add(realRootByCommand.get(hn) ?? resolve_2(hn.skillRoot));
    gt.set(Kn, fo);
  }
  let inserted = [];
  let insertedNames = new Set();
  for (let hn of offeredExtras) {
    if (hn.type === "prompt" && hn.skillRoot && baseSkillRoots.has(hn.skillRoot)) continue;
    if (hn.loadedFrom === "syncedSkills") {
      let cmd = admitSyncedSkill(hn, reserved);
      if (cmd === null) continue;
      let bo = markBareNameReserved(cmd);
      inserted.push(bo);
      insertedNames.add(bo.name);
      addNameAndAliases(reserved, bo);
      continue;
    }
    let ho = scopeOf(hn);
    let yn =
      (ho !== null && isPlaidHarborOn() && usesReservedSkillNamespace(joinScopedName(ho, hn.name))) ||
      !canOfferUnscoped(hn, ho)
        ? null
        : ho;
    let Kn = baseNames.has(hn.name);
    if (isFallbackSkill(hn)) {
      if (Kn || (nameCounts.get(hn.name) ?? 0) > 0 || insertedNames.has(hn.name)) continue;
      inserted.push(yn ? withNestedSkillDescription(hn, yn) : hn);
      insertedNames.add(hn.name);
      continue;
    }
    if (!(Kn || (nameCounts.get(hn.name) ?? 0) > 1)) {
      inserted.push(yn ? withNestedSkillDescription(hn, yn) : hn);
      insertedNames.add(hn.name);
      continue;
    }
    if (!yn) {
      if (Kn || insertedNames.has(hn.name)) {
        if (ho !== null)
          refuseReservedSkillName({
            name: joinScopedName(ho, hn.name),
            path: hn.type === "prompt" ? hn.skillRoot : undefined,
            change: "path",
          });
        continue;
      }
      inserted.push(hn);
      insertedNames.add(hn.name);
      continue;
    }
    let fo = joinScopedName(yn, hn.name);
    if (baseNames.has(fo) || insertedNames.has(fo)) continue;
    if (Et.has(hn) && (yt.has(fo) || (gt.get(fo)?.size ?? 0) > 1)) {
      logForDebugging(
        `[skills] ${escapeControlCharsForDisplay(fo)} is not offered: another skill would share the name`,
      );
      continue;
    }
    inserted.push(toScopedSkillCommand(hn, yn, Kn || insertedNames.has(hn.name), cwd));
    insertedNames.add(fo);
  }
  if (hostCatalogSkills.length > 0) addNonSyncedSpellings(reserved, inserted);
  let filtered = admitSyncedSkills(hostCatalogSkills, reserved)
    .map(markBareNameReserved)
    .filter((hn) => meetsAvailabilityRequirement(hn) && isCommandEnabled(hn));
  let [qt, Zt] = SS(inserted, (hn) => isShadowedSkillName(hn));
  let rn = [...Zt, ...filtered];
  if (rn.length === 0 && qt.length === 0) return base;
  let builtinNames = new Set(getBuiltinCommandTable().map((hn) => hn.name));
  let insertIndex = base.findIndex((hn) => builtinNames.has(hn.name));
  if (insertIndex === -1) return dropShadowedFallbackSkills([...base, ...rn, ...qt]);
  return dropShadowedFallbackSkills([
    ...base.slice(0, insertIndex),
    ...rn,
    ...base.slice(insertIndex),
    ...qt,
  ]);
}
//@ chunk-e6aww6q8.js:2067775-2068260 layout
/**
 * dropAmbiguousScopedSkills：同名且无法加作用域前缀的嵌套技能不提供。
 */
function dropAmbiguousScopedSkills(e, scopeOf, filteredBase) {
  let filtered = e.filter((w) => !canOfferUnscoped(w, scopeOf(w)));
  if (filtered.length === 0) return e;
  let h = new Map();
  for (let w of [...filteredBase, ...e.filter((L) => !isFallbackSkill(L))]) {
    if (w.loadedFrom === "syncedSkills") continue;
    for (let L of [w.name, ...(w.aliases ?? [])]) h.set(L, (h.get(L) ?? 0) + 1);
  }
  let y = new Set(filteredBase.map((w) => (w.type === "prompt" ? w.skillRoot : undefined)));
  let S = new Set(
    filtered.filter((w) => (h.get(w.name) ?? 0) > 1 && !(w.type === "prompt" && y.has(w.skillRoot))),
  );
  for (let w of S) reportRefusedSkillName(joinScopedName(scopeOf(w) ?? "", w.name), "is not offered");
  return e.filter((w) => !S.has(w));
}
//@ chunk-e6aww6q8.js:2068260-2068343 layout
/**
 * canOfferUnscoped：无作用域、同步技能或作用域名被保留时返回 true。
 */
function canOfferUnscoped(e, n) {
  return (
    n === null || e.loadedFrom === "syncedSkills" || isSkillFilePathOrIdentifier(joinScopedName(n, e.name))
  );
}
//@ chunk-e6aww6q8.js:2068343-2068533 layout
/**
 * getSkillScopeLabel：技能所在项目相对 cwd 的路径（或目录名）作为作用域。
 */
function getSkillScopeLabel(e, cwd) {
  let skillProjectRoot = getSkillProjectRoot(e);
  if (skillProjectRoot === null) return null;
  let s = cwd === null ? null : relative(cwd, skillProjectRoot);
  if (s === "") return null;
  if (s === null || s.startsWith("..") || isAbsolute(s))
    return getAdditionalDirRelativeLabel(skillProjectRoot);
  return s.split(sep).join("/");
}
//@ chunk-e6aww6q8.js:2068533-2068691 layout
/**
 * getSkillProjectRoot：skillRoot 中 /.claude/ 之前的部分。
 */
function getSkillProjectRoot(e) {
  if (e.type !== "prompt" || !e.skillRoot) return null;
  let index = e.skillRoot.lastIndexOf(`${sep}.claude${sep}`);
  return index === -1 ? null : e.skillRoot.slice(0, index);
}
//@ chunk-e6aww6q8.js:2068691-2068859 layout
/**
 * withNestedSkillDescription：描述追加 "(from X/.claude/skills — applies when working on files under X/)"。
 */
function withNestedSkillDescription(e, n) {
  if (e.type !== "prompt") return e;
  return {
    ...e,
    description: `${e.description} (from ${n}/.claude/skills \u2014 applies when working on files under ${n}/)`,
  };
}
//@ chunk-e6aww6q8.js:2068859-2069423 layout
/**
 * toScopedSkillCommand：生成 "scope:name" 形式的嵌套技能命令。
 */
function toScopedSkillCommand(e, n, r, cwd) {
  if (e.type !== "prompt") return e;
  let h = joinScopedName(n, e.name);
  let y = r
    ? `scoped to ${n}/ \u2014 use this instead of the unscoped "${e.name}" skill when the files being changed are under ${n}/`
    : `from ${n}/.claude/skills \u2014 applies when working on files under ${n}/`;
  let skillProjectRoot = getSkillProjectRoot(e);
  let w = skillProjectRoot === null ? null : findAdditionalDirRoot(skillProjectRoot);
  let L =
    skillProjectRoot !== null &&
    w !== null &&
    (cwd === null ||
      !isPathWithin_2(cwd, skillProjectRoot, {
        alreadyComparable: true,
      }) ||
      (w !== cwd &&
        isPathWithin_2(cwd, w, {
          alreadyComparable: true,
        })));
  return {
    ...e,
    name: h,
    unqualifiedName: e.name,
    allowlistedByFullNameOnly: L ? true : undefined,
    aliases: undefined,
    userFacingName: () => h,
    description: `${e.description} (${y})`,
  };
}
//@ chunk-e6aww6q8.js:2069423-2069469 facade-exports
/**
 * clearCommandMemoizationCaches：清空 getCommands/loadAllCommands/技能列表等的记忆化缓存，但不清技能目录缓存。
 */
function clearCommandMemoizationCaches() {
  getHostState().invalidateCommands();
  invalidateWorkflowCache();
}
//@ chunk-e6aww6q8.js:2069469-2069505 facade-exports
/**
 * clearCommandsCache：清空命令相关的全部缓存（含技能目录、插件命令、插件技能）。
 */
function clearCommandsCache() {
  clearCommandMemoizationCaches();
  clearPluginCommands();
  clearPluginSkillsCache();
  clearSkillCaches();
}
//@ chunk-e6aww6q8.js:2069505-2069542 facade-exports = COMMON_HELP_ARGS (0.53)
/**
 * HEADLESS_YIELDABLE_NAMES：无头模式下内建命令可以让给插件/技能的名字（help、feedback）。
 */
var HEADLESS_YIELDABLE_NAMES = new Set(["help", "feedback"]);
//@ chunk-e6aww6q8.js:2069542-2071229 layout
/**
 * shedReservedAliases：插件/同步技能的别名若与内建/保留名冲突则移入 shedAliases；无头模式让出 help/feedback。
 */
function shedReservedAliases(commands, checkNamedFolders) {
  let isPluginOrSynced = (command) =>
    command.type === "prompt" && (command.source === "plugin" || command.loadedFrom === "syncedSkills");
  let nonInteractive = getIsNonInteractiveSession();
  let takenNames = new Set();
  for (let command of commands) {
    let Se = nonInteractive && !supportsNonInteractive(command);
    if (!Se || !HEADLESS_YIELDABLE_NAMES.has(command.name)) takenNames.add(command.name);
    if (!isPluginOrSynced(command)) {
      for (let ke of command.aliases ?? []) if (!Se || !HEADLESS_YIELDABLE_NAMES.has(ke)) takenNames.add(ke);
    }
  }
  let y;
  let S = (Z) => {
    let Se = foldName_2(Z);
    if (nonInteractive && HEADLESS_YIELDABLE_NAMES.has(Se)) return false;
    if (y === undefined) {
      y = new Set();
      for (let we of getBuiltinCommandTable()) addCommandSpellings(y, we);
      for (let we of getBundledSkills()) addCommandSpellings(y, we);
      addRuntimeGatedCommandSpellings(y);
      let mapped = getBuiltinPlugins().disabled.map((we) => we.name);
      for (let we of builtinPluginSkillNames(new Set(mapped))) addSpelling(y, we);
    }
    return isQualifiedToolReference(Se, y);
  };
  let isTaken = (Z) => takenNames.has(Z) || S(Z);
  let L;
  if (checkNamedFolders) {
    let Z = new Map();
    for (let command of commands) Z.set(command.name, (Z.get(command.name) ?? 0) + 1);
    let filtered = commands.filter(getCommandId);
    let ke = new Map();
    for (let we of filtered) {
      let sliced = we.name.slice(we.name.lastIndexOf(":") + 1);
      for (let Ae of new Set([...(we.aliases ?? []), sliced])) ke.set(Ae, (ke.get(Ae) ?? 0) + 1);
    }
    L = new Set(
      filtered.flatMap((we) =>
        Z.get(we.name) === 1 && !(we.type === "prompt" && we.userInvocable === false)
          ? (we.aliases ?? []).filter((Ee) => ke.get(Ee) === 1 && !isTaken(Ee))
          : [],
      ),
    );
  }
  let G = 0;
  let mapped = commands.map((command) => {
    if (!isPluginOrSynced(command) || command.type !== "prompt") return command;
    if (command.loadedFrom === "syncedSkills")
      return filterCommandAliases(command, (Ae) => takenNames.has(Ae));
    let ke =
      (L !== undefined && getCommandId(command)) || command.pluginInfo === undefined
        ? []
        : (command.aliases ?? []).filter((Ae) => !isTaken(Ae) && L?.has(Ae) === true);
    G += ke.length;
    let filtered = (command.aliases ?? []).filter((Ae) => isTaken(Ae) || ke.includes(Ae));
    if (filtered.length === 0) return command;
    let Ee = {
      ...filterCommandAliases(command, (Ae) => filtered.includes(Ae)),
      shedAliases: command.shedAliases ? [...command.shedAliases, ...filtered] : filtered,
    };
    return ke.length > 0 && Ee.pluginInfo !== undefined
      ? {
          ...Ee,
          pluginInfo: {
            ...Ee.pluginInfo,
            namedFolderYield: {
              yielded: ke,
              aliasesBefore: (command.aliases ?? []).filter((Ae) => !isTaken(Ae)),
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
//@ chunk-e6aww6q8.js:2071229-2071542 facade-exports
/**
 * withNamedFolderYieldsRestored：恢复插件命名目录让出的别名（用于展示完整命令列表）。
 */
function withNamedFolderYieldsRestored(commands) {
  return commands.map((n) => {
    if (n.type !== "prompt") return n;
    let namedFolderYield = n.pluginInfo?.namedFolderYield;
    if (namedFolderYield === undefined) return n;
    let { yielded, aliasesBefore } = namedFolderYield;
    let { shedAliases, ...S } = n;
    let w = [...(shedAliases ?? [])];
    for (let L of yielded) {
      let index = w.lastIndexOf(L);
      if (index !== -1) w.splice(index, 1);
    }
    return {
      ...S,
      aliases: aliasesBefore,
      ...(w.length > 0 && {
        shedAliases: w,
      }),
    };
  });
}
//@ chunk-e6aww6q8.js:2071542-2071642 facade-exports
/**
 * getSkillToolCommands：Skill 工具可调用的技能列表（prompt、非内建、模型可调用、有描述或 whenToUse）。
 */
function getSkillToolCommands(cwd, storage, hiddenPlugins = getHeldBackSyncedPlugins()) {
  let storageV5 = isTopHostSkillPluginSession();
  return getOrCreate(getHostState().skillToolCommands, commandsMemoKey(cwd, hiddenPlugins, storageV5), () =>
    getSkillToolCommandsUncached(cwd, storage, hiddenPlugins, storageV5),
  );
}
//@ chunk-e6aww6q8.js:2071642-2071739 layout
/**
 * getSkillToolCommandsUncached：getCommands 后用 isSkillToolCommand 过滤。
 */
async function getSkillToolCommandsUncached(cwd, storage, hiddenPlugins, storageV5) {
  if (getDisableSlashCommands()) return [];
  let commands = await getCommands(cwd, storage, hiddenPlugins, storageV5);
  return hideShadowedCommands(commands.filter(isSkillToolCommand), commands);
}
//@ chunk-e6aww6q8.js:2071739-2071840 facade-exports
/**
 * getSlashCommandToolSkills：系统提示里列出的技能清单（来自技能目录、插件、内建技能，按设置过滤）。
 */
function getSlashCommandToolSkills(cwd, storage) {
  let storageV5 = isTopHostSkillPluginSession();
  return getOrCreate(getHostState().slashCommandToolSkills, commandsMemoKey(cwd, undefined, storageV5), () =>
    getSlashCommandToolSkillsUncached(cwd, storage, storageV5),
  );
}
//@ chunk-e6aww6q8.js:2071840-2072348 fingerprint = getSlashCommandToolSkills (0.755)
/**
 * getSlashCommandToolSkillsUncached：旧版 getSlashCommandToolSkills 的过滤逻辑；门面名给了缓存层 G0e。
 */
async function getSlashCommandToolSkillsUncached(cwd, storage, options) {
  if (getDisableSlashCommands()) return [];
  try {
    let filtered = (await getCommands(cwd, storage, undefined, options)).filter(
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
    logFeatureOk("cmd_load");
    return filtered;
  } catch (error) {
    logError(toError(error));
    logFeatureSad("cmd_load", "cmd_load_slash_tool_skills_failed");
    logForDebugging("Returning empty skills array due to load failure");
    return [];
  }
}
//@ chunk-s61vbvea.js:17411-17462 facade-exports = getCommandName (1)
/**
 * getCommandName：命令显示名（userFacingName?.() ?? name）。
 */
function getCommandName(cmd) {
  return cmd.userFacingName?.() ?? cmd.name;
}
//@ chunk-s61vbvea.js:17462-17606 layout
/**
 * clearUserFacingName：把 userFacingName 挪进 shedAliases 后清空。
 */
function clearUserFacingName(e) {
  if (e.type === "prompt" && e.userFacingName !== undefined)
    e.shedAliases = [...(e.shedAliases ?? []), e.userFacingName()];
  e.userFacingName = undefined;
}
//@ chunk-s61vbvea.js:17606-17668 facade-exports
/**
 * isCommandEnabled：先检查 policyGate（commandPolicyGateAllows，getter 抛错按 false），再 isEnabled?.() ?? true。
 */
function isCommandEnabled(cmd) {
  if (!passesPolicyGate(cmd)) return false;
  return cmd.isEnabled?.() ?? true;
}
//@ chunk-s61vbvea.js:17668-17765 layout
/**
 * passesPolicyGate：policyGate.policy 由 commandPolicyGateAllows 判定。
 */
function passesPolicyGate(cmd) {
  let policyGate;
  try {
    policyGate = cmd.policyGate;
  } catch {
    return false;
  }
  if (policyGate == null) return true;
  return commandPolicyGateAllows(policyGate.policy);
}
//@ chunk-s61vbvea.js:17765-17984 layout
function inputStartsWithMatchingCommand(e, n) {
  let r = e.trimStart();
  if (!r.startsWith("/")) return false;
  let s = r.slice(1).match(/^[a-zA-Z0-9:_-]+/)?.[0];
  let h = r.slice(1).split(/\s/, 1)[0];
  if (s !== undefined && n(s)) return true;
  return h !== undefined && h !== s && h.length > 0 && n(h);
}
//@ chunk-s61vbvea.js:17984-18052 layout
/**
 * getCommandContextMode：getContext?.() ?? context ?? "inline"（inline/fork）。
 */
function getCommandContextMode(cmd, args, context) {
  return cmd.getContext?.(args, context) ?? cmd.context ?? "inline";
}
//@ chunk-s61vbvea.js:18052-18134 layout
/**
 * isImmediateCommand：immediate 可为布尔或 (args, presentation) 函数。
 */
function isImmediateCommand(cmd, args, presentation) {
  let immediate = cmd?.immediate;
  return typeof immediate === "function" ? immediate(args, presentation) : immediate === true;
}
//@ chunk-s61vbvea.js:18134-18287 layout
/**
 * splitSlashCommandInput："/name args" → {name, args}。
 */
function splitSlashCommandInput(input) {
  let body = input.startsWith("/") ? input.slice(1) : input;
  let spaceIndex = body.search(/\s/);
  if (spaceIndex === -1)
    return {
      name: body,
      args: "",
    };
  return {
    name: body.slice(0, spaceIndex),
    args: body.slice(spaceIndex + 1).trim(),
  };
}
//@ chunk-s61vbvea.js:18287-18483 layout
/**
 * looksLikeSlashInput：字符串或最后一个文本块以 / 开头。
 */
function looksLikeSlashInput(e) {
  if (typeof e === "string") return e.trim().startsWith("/");
  if (!Array.isArray(e)) return false;
  let last = e.at(-1);
  return last?.type === "text" && typeof last.text === "string" && last.text.trim().startsWith("/");
}
//@ chunk-s61vbvea.js:18483-18673 layout
/**
 * TEAM_SETUP_GUIDE_LABEL："✦ Team setup guide"。
 */
var TEAM_SETUP_GUIDE_LABEL = "\u2726 Team setup guide";
var PLACEHOLDER_LABELS_PATTERN = String.raw`Pasted text|Image|\.\.\.Truncated text|${"\u2726 Team setup guide"}`;
var regExp = new RegExp(String.raw`\[(${PLACEHOLDER_LABELS_PATTERN}) #(\d+)(?: \+\d+ lines)?(\.)*\]`, "g");
//@ chunk-s61vbvea.js:18673-18719 layout
function isImagePlaceholder(match) {
  return match.startsWith("[Image");
}
//@ chunk-s61vbvea.js:18719-18795 layout
/**
 * commandMatchesName：name、显示名或 aliases 命中。
 */
function commandMatchesName(cmd, name) {
  return cmd.name === name || getCommandName(cmd) === name || (cmd.aliases?.includes(name) ?? false);
}
//@ chunk-s61vbvea.js:18795-19014 facade-exports
/**
 * findCommand：先按 name 精确匹配，再按显示名或 aliases，最后按 directoryListingName。
 */
function findCommand(commandName, commands) {
  let aliasMatch;
  let directoryMatch;
  return (
    commands.find((cmd) => {
      if (cmd.name === commandName) return true;
      if (aliasMatch === undefined && commandMatchesName(cmd, commandName)) aliasMatch = cmd;
      if (directoryMatch !== null && cmd.type === "prompt" && cmd.directoryListingName === commandName)
        directoryMatch =
          directoryMatch === undefined || directoryMatch.name === cmd.name ? (directoryMatch ?? cmd) : null;
      return false;
    }) ??
    aliasMatch ??
    directoryMatch ??
    undefined
  );
}
//@ chunk-s61vbvea.js:19014-19178 layout
/**
 * buildCommandLookup：name/显示名/aliases → 命令 的 Map。
 */
function buildCommandLookup(commands) {
  let lookup = new Map();
  for (let command of commands) if (!lookup.has(command.name)) lookup.set(command.name, command);
  for (let command of commands)
    for (let s of [getCommandName(command), ...(command.aliases ?? [])])
      if (!lookup.has(s)) lookup.set(s, command);
  return lookup;
}
//@ chunk-s61vbvea.js:19178-19220 facade-exports
/**
 * hasCommand：findCommand 是否找到。
 */
function hasCommand(commandName, commands) {
  return findCommand(commandName, commands) !== undefined;
}
//@ chunk-s61vbvea.js:19220-19326 layout
/**
 * hasSensitiveArgs：isSensitive 为布尔或函数。
 */
function hasSensitiveArgs(cmd, args) {
  if (args.trim() === "") return false;
  let { isSensitive } = cmd;
  return typeof isSensitive === "function" ? isSensitive(args) : isSensitive === true;
}
//@ chunk-s61vbvea.js:19326-19440 layout
/**
 * buildCommandRunInfo：{command, args（敏感则 ***）, plugin}。
 */
function buildCommandRunInfo(cmd, args, plugin) {
  let registeredBy = plugin ?? cmd.registeredBy;
  return {
    command: getCommandName(cmd),
    args: hasSensitiveArgs(cmd, args) ? "***" : args,
    ...(registeredBy !== undefined && {
      plugin: registeredBy,
    }),
  };
}
//@ chunk-s61vbvea.js:19440-19582 layout
var regExp_2 = new RegExp(String.raw`\[(?:Pasted text|\.\.\.Truncated text|${TEAM_SETUP_GUIDE_LABEL}) #\d+`);
var regExp_3 = new RegExp(String.raw`^(\/[^\s[]+)\[(?=(?:${PLACEHOLDER_LABELS_PATTERN}) #\d+)`);
//@ chunk-s61vbvea.js:19582-19604 layout
/**
 * SECRET_SCAN_CHUNK：65536。
 */
var SECRET_SCAN_CHUNK = 65536;
var SECRET_SCAN_PATTERN_SPAN = 2 * SECRET_REDACTION_PATTERNS;
//@ chunk-s61vbvea.js:19604-19913 layout
/**
 * shouldRedactInput：粘贴内容或命令参数命中敏感模式时不写入历史。
 */
function shouldRedactInput(e, commands, { pastedTexts: r = [] } = {}) {
  if (r.some(containsSecretPattern)) return true;
  let trimmed = e.trim();
  if (trimmed.startsWith("!")) {
    trimmed = trimmed.slice(1).trimStart();
    if (containsSecretPattern(trimmed)) return true;
  }
  if (!trimmed.startsWith("/")) return false;
  let { name: h, args } = splitSlashCommandInput(trimmed.replace(regExp_3, "$1 ["));
  let command = findCommand(h, commands);
  if (!command?.isSensitive) return containsSecretPattern(trimmed.slice(1));
  return hasSensitiveArgs(command, args) || (r.length > 0 && regExp_2.test(args));
}
//@ chunk-s61vbvea.js:19913-20093 layout
function filterCommandsByAllowlist(commands, allowlist) {
  if (allowlist === undefined) return commands;
  return commands.filter((command) =>
    allowlist.some(
      (s) =>
        command.name === s ||
        (command.loadedFrom === "syncedSkills"
          ? (command.aliases?.includes(s) ?? false)
          : isProjectScopedCommand(command) && command.name.endsWith(`:${s}`)),
    ),
  );
}
//@ chunk-s61vbvea.js:20093-20225 layout
/**
 * 判断命令不是用户来源技能，也不是 memoryStore/mcp 来源或只允许按全名调用的提示词命令。
 */
function isProjectScopedCommand(e) {
  return (
    !isSkillFromUserSource(e) &&
    !(
      e.type === "prompt" &&
      (e.source === "memoryStore" || e.source === "mcp" || e.allowlistedByFullNameOnly === true)
    )
  );
}
//@ chunk-s61vbvea.js:20225-20540 layout
/**
 * resolveBarePluginSkillName：{kind: none|ambiguous|unique}。
 */
function resolveBarePluginSkillName(name, commands) {
  if (name === "" || name.includes(":"))
    return {
      kind: "none",
    };
  let suffix = `:${name}`;
  let matches = commands.filter(
    (command) =>
      command.type === "prompt" && command.loadedFrom !== "syncedSkills" && command.name.endsWith(suffix),
  );
  if (matches.length > 1)
    return {
      kind: "ambiguous",
      candidates: matches,
    };
  let match = matches[0];
  if (match === undefined || match.source !== "plugin")
    return {
      kind: "none",
    };
  return {
    kind: "unique",
    command: match,
  };
}
//@ chunk-s61vbvea.js:20540-20788 facade-exports = getCommand (1)
/**
 * getCommand：findCommand，找不到时抛出列出全部可用命令的 ReferenceError。
 */
function getCommand(commandName, commands) {
  let command = findCommand(commandName, commands);
  if (!command)
    throw ReferenceError(
      `Command ${commandName} not found. Available commands: ${commands
        .map((command) => {
          let name = getCommandName(command);
          return command.aliases ? `${name} (aliases: ${command.aliases.join(", ")})` : name;
        })
        .sort((s, h) => s.localeCompare(h))
        .join(", ")}`,
    );
  return command;
}
//@ chunk-s61vbvea.js:20788-20915 affinity
/**
 * containsSecretPattern：按 64KB 分段（带重叠）扫描。
 */
function containsSecretPattern(e) {
  if (e.length <= SECRET_SCAN_CHUNK) return containsSecret(e);
  let n = SECRET_SCAN_CHUNK - SECRET_SCAN_PATTERN_SPAN;
  for (let r = 0; r < e.length; r += n) if (containsSecret(e.slice(r, r + SECRET_SCAN_CHUNK))) return true;
  return false;
}
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
  WORKER_ONLY_SKILL_NAMES,
  firstPartyCommandNameCheck,
  dropShadowedFallbackSkills,
  passesPolicyGate,
  filterCommandsByAllowlist,
  isFirstPartyCommandName,
  resolveBarePluginSkillName,
  hiddenCommandsWhenSlashDisabled,
  isBridgeDispatchable,
  addCommandSpellings,
  filterCommandAliases,
  clearUserFacingName,
  buildCommandLookup,
  getCommandOriginKind,
  isPluginDirMissingFromSyncedList,
  folderNameAliasCheck,
  toSlashCommand,
  isBuiltinCommand,
  workerOnlySkillName,
};
