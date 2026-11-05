/**
 * commands.ts
 *
 * 命令注册表：内建命令表（约 145 项）、运行时门控组、技能/插件/工作流/MCP 命令合并与保留名处理、availability 与启用过滤、远程与桥接安全集合、SDK 命令列表转换、缓存清理；并混入 findCommand/isCommandEnabled 等基础查找（chunk-s61vbvea）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands.ts
 * pieces: chunk-1z79zgep.js (2), chunk-5xgkngpb.js (101), chunk-7jxyna5q.js (23)
 * attribution: placement 32, facade-exports 39, fingerprint 6, layout 44, affinity 2, callgraph-fingerprint 1, sole-consumer 1, file-local 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { resolve as resolve_2, basename, dirname, relative, sep, isAbsolute } from "path";
import { commandPolicyGateAllows } from "./services/policyLimits/policyVerdicts.js";
import { SECRET_REDACTION_PATTERNS, containsSecret } from "./utils/redactSecrets.js";
import { isSkillFromUserSource } from "./skills/skillSources.js";
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
import { isAgentsFleetEnabled, isDaemonWorkerRegistryEnabled } from "./utils/fleetGates.js";
import { isEnvTruthy } from "./utils/envUtils.js";
import { env } from "./utils/env.js";
import {
  forkToBackgroundCommand,
  subtaskCommand,
  forkSubagentCommand,
  agentsRemovedCommand,
} from "./commands/agents/index.js";
import {
  backgroundCommand,
  stopCommand,
  desktopCmdModule,
  gatedCommandSlot_4,
  usageReport,
  webSetupCommand,
  briefCommand,
  remoteControlCommand,
  recapCommand,
  goalCommand,
  goalNonInteractive,
  loginCommand,
  listAgentsCommand,
  gatedCommandSlot_12,
  EMPTY_COMMAND_LIST,
  diffCmdModule,
  gatedCommandSlot_8,
  gatedCommandSlot_9,
  gatedCommandSlot_10,
  gatedCommandSlot_11,
  gatedCommandSlot_6,
  antGatedCmdA,
  antGatedCmdB,
  sandboxRuntimeConfig,
  gatedInPlaceWriteCommand,
  promoteMemoryCommands,
  accountMemoryCommands,
  gatedCommandSlot_5,
  gatedCommandSlot_1,
  gatedCommandSlot_14,
  internalGatedCmdB,
  stopNonInteractive,
} from "./utils/shell/bashProvider.js";
import { lanternPrismEnabled } from "./utils/plugins/pluginGates.js";
import { skillDoctorCommand, skillDoctorNonInteractiveCommand } from "./commands/skill-doctor/index.js";
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
import { clearCommandAlias } from "./commands/clear/index.js";
import { colorCommand, colorNonInteractiveCommand } from "./commands/color/index.js";
import { compactNonInteractiveCommand } from "./commands/compact/index.js";
import { configCommand, configNonInteractiveCommand } from "./commands/config/index.js";
import {
  vimMovedToConfigCommand,
  outputStyleMovedToConfigCommand,
} from "./commands/createMovedToConfigCommand.js";
import { outputStyleCommand } from "./commands/output-style/index.js";
import { copyCommand } from "./commands/copy/index.js";
import { desktopCommand } from "./commands/desktop/index.js";
import { contextCommandDefinition, contextNonInteractiveCommand } from "./commands/context/index.js";
import { diffCommandDefinition } from "./commands/diff/index.js";
import { effortNonInteractiveCommand2, effortNonInteractiveCommand } from "./commands/effort/index.js";
import { wellbeingCommand } from "./commands/wellbeing/index.js";
import { exitCommand, exitNonInteractiveCommand } from "./commands/exit/index.js";
import { versionCommand, fastNonInteractiveCommand } from "./commands/fast/index.js";
import { focusCommand, focusNonInteractiveCommand } from "./commands/focus/index.js";
import { heapdumpCommand } from "./commands/heapdump/index.js";
import { helpCommand } from "./commands/help/index.js";
import { ideCommand } from "./commands/ide/index.js";
import { initCommand } from "./commands/init.js";
import { keybindingsCommand } from "./commands/keybindings/index.js";
import { installGithubAppCommand } from "./commands/install-github-app/index.js";
import { installSlackAppCommand } from "./commands/install-slack-app/index.js";
import { mcpCommandTwin, mcpNonInteractiveCommand } from "./commands/mcp/index.js";
import { memoryCommandAlias } from "./commands/memory/index.js";
import { importCommand, importNonInteractiveCommand } from "./commands/import/index.js";
import { mobileCommand } from "./commands/mobile/index.js";
import { pauseMemoryCommand } from "./commands/pause-memory/index.js";
import { modelInteractiveCommand, modelNonInteractiveCommand } from "./commands/model/index.js";
import { remoteEnvCommand } from "./commands/remote-env/index.js";
import {
  remoteWorkflowCommand,
  workflowLaunchExecCommand,
  workflowLaunchExecCommandAlias,
} from "./commands/remote-workflow/index.js";
import { pluginCommandAlias } from "./commands/plugin/index.js";
import { projectCommandAlias } from "./commands/project/index.js";
import { releaseNotesCommandAlias } from "./commands/release-notes/index.js";
import { reloadPluginsCommandAlias } from "./commands/reload-plugins/index.js";
import { reloadSkillsCommandAlias } from "./commands/reload-skills/index.js";
import { resumeCommand, renameNonInteractiveCommand } from "./commands/rename/index.js";
import { resumeCommandAlias } from "./commands/resume/index.js";
import { setupBedrockCommand } from "./commands/setup-bedrock/index.js";
import { setupVertexCommand } from "./commands/setup-vertex/index.js";
import { sessionCommandAlias } from "./commands/session/index.js";
import { skillsCommandAlias } from "./commands/skills/index.js";
import { statusCommandAlias } from "./commands/status/index.js";
import { statuslineCommand } from "./commands/statusline.js";
import { tuiCommand } from "./commands/stickers/index.js";
import { themeCommandAlias } from "./commands/theme/index.js";
import { tuiCommandAlias } from "./commands/tui/index.js";
import { feedbackNonInteractiveCommand, bugNonInteractiveCommand } from "./commands/feedback/index.js";
import { ultrareviewCommand, ultrareviewNonInteractiveCommand } from "./commands/review.js";
import { ultraplanCommand } from "./commands/ultraplan.js";
import { rewindCommandAlias } from "./commands/rewind/index.js";
import { scrollSpeedCommand } from "./commands/security-review.js";
import { terminalSetupCommandAlias } from "./commands/terminalSetup/index.js";
import { scrollSpeedCommandAlias } from "./commands/scroll-speed/index.js";
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
import { usageCommand, usageNonInteractiveCommand } from "./commands/usage/index.js";
import { voiceCommand } from "./commands/voice/index.js";
import { permissionsCommandAlias } from "./commands/permissions/index.js";
import { planCommandAlias } from "./commands/plan/index.js";
import { powerupCommand } from "./commands/powerup/index.js";
import { privacySettingsCommand } from "./commands/privacy-settings/index.js";
import { hooksCommand } from "./commands/hooks/index.js";
import { loopsCommand } from "./commands/loops/index.js";
import { exportCommand } from "./commands/export/index.js";
import { sandboxCommandAlias } from "./commands/sandbox-toggle/index.js";
import {
  createDesignLoginCommand,
  designConsentCommand,
  designRevokeCommand,
} from "./commands/design/index.js";
import { passesCommand } from "./commands/passes/index.js";
import { tasksCommandAlias } from "./commands/tasks/index.js";
import { autofixPrCommand } from "./commands/autofix-pr/index.js";
import { teleportCommand } from "./commands/teleport/index.js";
import { artifactsCommand } from "./commands/artifacts/index.js";
import { teamOnboardingCommand } from "./commands/team-onboarding/index.js";
import { radioCommand } from "./commands/radio/index.js";
import { ENTERPRISE_UPSELL_COMMANDS } from "./commands/c4eUpsell.js";
import { internalCmdA, versionNonInteractiveCommand } from "./commands/version.js";
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
import { partitionAlias } from "../vendor/lodash-es/_inlinedHelpers.js";
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
import { deferInit } from "../runtime/deferred-init.js";

//@ chunk-1z79zgep.js:374-527 placement
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
//@ chunk-1z79zgep.js:527-723 placement
/**
 * looksLikeSlashInput：字符串或最后一个文本块以 / 开头。
 */
function looksLikeSlashInput(inputContent) {
  if (typeof inputContent === "string") return inputContent.trim().startsWith("/");
  if (!Array.isArray(inputContent)) return false;
  let last = inputContent.at(-1);
  return last?.type === "text" && typeof last.text === "string" && last.text.trim().startsWith("/");
}
//@ chunk-7jxyna5q.js:18335-18386 facade-exports (2.1.88 match: getCommandName, 1)
/**
 * getCommandName：命令显示名（userFacingName?.() ?? name）。
 */
function getCommandName(cmd) {
  return cmd.userFacingName?.() ?? cmd.name;
}
//@ chunk-7jxyna5q.js:18386-18530 layout
/**
 * clearUserFacingName：把 userFacingName 挪进 shedAliases 后清空。
 */
function clearUserFacingName(command) {
  if (command.type === "prompt" && command.userFacingName !== undefined)
    command.shedAliases = [...(command.shedAliases ?? []), command.userFacingName()];
  command.userFacingName = undefined;
}
//@ chunk-7jxyna5q.js:18530-18592 facade-exports
/**
 * isCommandEnabled：先检查 policyGate（commandPolicyGateAllows，getter 抛错按 false），再 isEnabled?.() ?? true。
 */
function isCommandEnabled(cmd) {
  if (!passesPolicyGate(cmd)) return false;
  return cmd.isEnabled?.() ?? true;
}
//@ chunk-7jxyna5q.js:18592-18689 layout
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
//@ chunk-7jxyna5q.js:18689-18908 layout
function inputStartsWithMatchingCommand(input, command) {
  let trimmed = input.trimStart();
  if (!trimmed.startsWith("/")) return false;
  let name = trimmed.slice(1).match(/^[a-zA-Z0-9:_-]+/)?.[0];
  let word = trimmed.slice(1).split(/\s/, 1)[0];
  if (name !== undefined && command(name)) return true;
  return word !== undefined && word !== name && word.length > 0 && command(word);
}
//@ chunk-7jxyna5q.js:18908-18976 layout
/**
 * getCommandContextMode：getContext?.() ?? context ?? "inline"（inline/fork）。
 */
function getCommandContextMode(cmd, args, context) {
  return cmd.getContext?.(args, context) ?? cmd.context ?? "inline";
}
//@ chunk-7jxyna5q.js:18976-19058 layout
/**
 * isImmediateCommand：immediate 可为布尔或 (args, presentation) 函数。
 */
function isImmediateCommand(cmd, args, presentation) {
  let immediate = cmd?.immediate;
  return typeof immediate === "function" ? immediate(args, presentation) : immediate === true;
}
//@ chunk-7jxyna5q.js:19058-19248 layout
/**
 * TEAM_SETUP_GUIDE_LABEL："✦ Team setup guide"。
 */
var TEAM_SETUP_GUIDE_LABEL; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PLACEHOLDER_LABELS_PATTERN;
var regExp;
deferInit("chunk-7jxyna5q.js:19058", () => {
  TEAM_SETUP_GUIDE_LABEL = "\u2726 Team setup guide";
  PLACEHOLDER_LABELS_PATTERN = String.raw`Pasted text|Image|\.\.\.Truncated text|${"\u2726 Team setup guide"}`;
  regExp = new RegExp(String.raw`\[(${PLACEHOLDER_LABELS_PATTERN}) #(\d+)(?: \+\d+ lines)?(\.)*\]`, "g");
});
//@ chunk-7jxyna5q.js:19248-19294 layout
function isImagePlaceholder(match) {
  return match.startsWith("[Image");
}
//@ chunk-7jxyna5q.js:19294-19370 layout
/**
 * commandMatchesName：name、显示名或 aliases 命中。
 */
function commandMatchesName(cmd, name) {
  return cmd.name === name || getCommandName(cmd) === name || (cmd.aliases?.includes(name) ?? false);
}
//@ chunk-7jxyna5q.js:19370-19589 facade-exports
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
//@ chunk-7jxyna5q.js:19589-19753 layout
/**
 * buildCommandLookup：name/显示名/aliases → 命令 的 Map。
 */
function buildCommandLookup(commands) {
  let lookup = new Map();
  for (let command of commands) if (!lookup.has(command.name)) lookup.set(command.name, command);
  for (let command of commands)
    for (let name of [getCommandName(command), ...(command.aliases ?? [])])
      if (!lookup.has(name)) lookup.set(name, command);
  return lookup;
}
//@ chunk-7jxyna5q.js:19753-19795 facade-exports
/**
 * hasCommand：findCommand 是否找到。
 */
function hasCommand(commandName, commands) {
  return findCommand(commandName, commands) !== undefined;
}
//@ chunk-7jxyna5q.js:19795-19901 layout
/**
 * hasSensitiveArgs：isSensitive 为布尔或函数。
 */
function hasSensitiveArgs(cmd, args) {
  if (args.trim() === "") return false;
  let { isSensitive } = cmd;
  return typeof isSensitive === "function" ? isSensitive(args) : isSensitive === true;
}
//@ chunk-7jxyna5q.js:19901-20015 layout
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
//@ chunk-7jxyna5q.js:20015-20157 layout
var regExp_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var regExp_3;
deferInit("chunk-7jxyna5q.js:20015", () => {
  regExp_2 = new RegExp(String.raw`\[(?:Pasted text|\.\.\.Truncated text|${TEAM_SETUP_GUIDE_LABEL}) #\d+`);
  regExp_3 = new RegExp(String.raw`^(\/[^\s[]+)\[(?=(?:${PLACEHOLDER_LABELS_PATTERN}) #\d+)`);
});
//@ chunk-7jxyna5q.js:20157-20179 layout
/**
 * SECRET_SCAN_CHUNK：65536。
 */
var SECRET_SCAN_CHUNK = 65536;
var SECRET_SCAN_PATTERN_SPAN = 2 * SECRET_REDACTION_PATTERNS;
//@ chunk-7jxyna5q.js:20179-20488 layout
/**
 * shouldRedactInput：粘贴内容或命令参数命中敏感模式时不写入历史。
 */
function shouldRedactInput(value, commands, { pastedTexts = [] } = {}) {
  if (pastedTexts.some(containsSecretPattern)) return true;
  let text = value.trim();
  if (text.startsWith("!")) {
    text = text.slice(1).trimStart();
    if (containsSecretPattern(text)) return true;
  }
  if (!text.startsWith("/")) return false;
  let { name, args } = splitSlashCommandInput(text.replace(regExp_3, "$1 ["));
  let command = findCommand(name, commands);
  if (!command?.isSensitive) return containsSecretPattern(text.slice(1));
  return hasSensitiveArgs(command, args) || (pastedTexts.length > 0 && regExp_2.test(args));
}
//@ chunk-7jxyna5q.js:20488-20668 layout
function filterCommandsByAllowlist(commands, allowlist) {
  if (allowlist === undefined) return commands;
  return commands.filter((command) =>
    allowlist.some(
      (name) =>
        command.name === name ||
        (command.loadedFrom === "syncedSkills"
          ? (command.aliases?.includes(name) ?? false)
          : isProjectScopedCommand(command) && command.name.endsWith(`:${name}`)),
    ),
  );
}
//@ chunk-7jxyna5q.js:20668-20800 layout
/**
 * 判断命令不是用户来源技能，也不是 memoryStore/mcp 来源或只允许按全名调用的提示词命令。
 */
function isProjectScopedCommand(command) {
  return (
    !isSkillFromUserSource(command) &&
    !(
      command.type === "prompt" &&
      (command.source === "memoryStore" ||
        command.source === "mcp" ||
        command.allowlistedByFullNameOnly === true)
    )
  );
}
//@ chunk-7jxyna5q.js:20800-21115 layout
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
//@ chunk-7jxyna5q.js:21115-21363 facade-exports (2.1.88 match: getCommand, 1)
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
        .sort((a, b) => a.localeCompare(b))
        .join(", ")}`,
    );
  return command;
}
//@ chunk-7jxyna5q.js:21363-21490 affinity
/**
 * containsSecretPattern：按 64KB 分段（带重叠）扫描。
 */
function containsSecretPattern(text) {
  if (text.length <= SECRET_SCAN_CHUNK) return containsSecret(text);
  let step = SECRET_SCAN_CHUNK - SECRET_SCAN_PATTERN_SPAN;
  for (let index = 0; index < text.length; index += step)
    if (containsSecret(text.slice(index, index + SECRET_SCAN_CHUNK))) return true;
  return false;
}
//@ chunk-5xgkngpb.js:965569-965606 facade-exports
function isSkillOff(name) {
  return getSkillOverrideState(name) === "off";
}
//@ chunk-5xgkngpb.js:965606-965917 fingerprint (2.1.88 match: meetsAvailabilityRequirement, 0.638)
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
//@ chunk-5xgkngpb.js:965917-965952 layout
/**
 * joinScopedName：返回 `${scope}:${name}`。
 */
function joinScopedName(scope, name) {
  return `${scope}:${name}`;
}
//@ chunk-5xgkngpb.js:965952-966049 layout
/**
 * matchesUnqualifiedName：prompt 且非 syncedSkills 且 unqualifiedName===n。
 */
function matchesUnqualifiedName(cmd, name) {
  return cmd.type === "prompt" && cmd.loadedFrom !== "syncedSkills" && cmd.unqualifiedName === name;
}
//@ chunk-5xgkngpb.js:966049-966139 layout
/**
 * getBareCommandName：prompt 有 unqualifiedName 时返回它，否则 name。
 */
function getBareCommandName(cmd) {
  return cmd.type === "prompt" && cmd.unqualifiedName != null ? cmd.unqualifiedName : cmd.name;
}
//@ chunk-5xgkngpb.js:966139-966261 layout
/**
 * getBareCommandNameUnlessSynced：同 EF，但 syncedSkills 不取 unqualifiedName。
 */
function getBareCommandNameUnlessSynced(cmd) {
  return cmd.type === "prompt" && cmd.unqualifiedName != null && cmd.loadedFrom !== "syncedSkills"
    ? cmd.unqualifiedName
    : cmd.name;
}
//@ chunk-5xgkngpb.js:966261-966793 fingerprint (2.1.88 match: getMcpSkillCommands, 0.469)
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
//@ chunk-5xgkngpb.js:966793-967091 layout
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
//@ chunk-5xgkngpb.js:967091-967132 layout
function hiddenCommandsWhenSlashDisabled(x) {
  if (getDisableSlashCommands()) return [];
  return [];
}
//@ chunk-5xgkngpb.js:967132-967431 fingerprint (2.1.88 match: getSkillToolCommands, 0.859)
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
//@ chunk-5xgkngpb.js:971424-971510 affinity
/**
 * addSpelling：规范化（Gy）后加入集合，跳过 claude.ai 同步技能保留名。
 */
function addSpelling(spellings, name, allowReserved = false) {
  if (typeof name !== "string") return;
  if (!allowReserved && usesReservedSkillNamespace(name)) return;
  spellings.add(foldName_2(name));
}
//@ chunk-5xgkngpb.js:971510-971628 callgraph-fingerprint (2.1.88 match: findCommand, 1)
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
//@ chunk-5xgkngpb.js:972976-973149 placement (2.1.88 match: buildTool, 0.401)
/**
 * （旧版名 buildTool 是错配）过滤命令（Skill）的 aliases：保留谓词为真的别名；syncedSkills 来源的命令若规范名与 userFacingName 不一致，再改写 userFacingName。
 */
function filterCommandAliases(command, keepAlias) {
  let filteredCommand = dropReservedAliases(command, keepAlias);
  if (filteredCommand.loadedFrom !== "syncedSkills") return filteredCommand;
  let commandName = getCommandName(filteredCommand);
  if (
    withSyncedSkillPrefix(commandName) === commandName ||
    getSyncedSkillUnqualifiedAlias(filteredCommand) !== undefined
  )
    return filteredCommand;
  let prefixed = withSyncedSkillPrefix(commandName);
  return {
    ...filteredCommand,
    userFacingName: () => prefixed,
  };
}
//@ chunk-5xgkngpb.js:1735832-1736132 placement
/**
 * 根据上次同步的 lane 负载，返回"技能被插件接管"的插件表 pluginId → {pluginName, heldBack}；功能关闭或没有数据时返回共享空表。
 */
function getHeldBackSyncedPlugins() {
  if (!areSkillsConvertedAsPlugins()) return EMPTY_COMMAND_CACHE;
  let lastSyncedLaneLoad = getLastSyncedLaneLoad();
  if (lastSyncedLaneLoad === null) return EMPTY_COMMAND_CACHE;
  if (isImmutableLadybugActive()) return EMPTY_COMMAND_CACHE;
  let held = new Map();
  for (let { bucket, outcome, pluginName, pluginId } of lastSyncedLaneLoad)
    if (
      outcome !== "not_loaded" &&
      pluginId !== undefined &&
      isPluginDirMissingFromSyncedList(bucket, pluginId) &&
      held.get(pluginId)?.heldBack !== false
    )
      held.set(pluginId, {
        pluginName,
        heldBack: outcome === "held_back",
      });
  return held.size === 0 ? EMPTY_COMMAND_CACHE : held;
}
//@ chunk-5xgkngpb.js:1736132-1736211 placement
/**
 * 判断某插件目录是否尚未出现在最近一次完整同步的插件列表里（用于触发补充加载）。
 */
function isPluginDirMissingFromSyncedList(bucket, pluginId) {
  let lastCompleteSyncedPluginList = getLastCompleteSyncedPluginList();
  return (
    lastCompleteSyncedPluginList === null ||
    lastCompleteSyncedPluginList.bucket !== bucket ||
    lastCompleteSyncedPluginList.dirsById.has(pluginId)
  );
}
//@ chunk-5xgkngpb.js:1736211-1736290 placement
function hidePrefixForSkills(hiddenPlugins) {
  return hiddenPlugins.size === 0 ? "" : `hide=${[...hiddenPlugins.keys()].sort().join(",")}:`;
}
//@ chunk-5xgkngpb.js:1736290-1736868 placement
/**
 * 把被同名插件接管的同步技能标成隐藏（isHidden + hiddenBehindPlugin，可带替代技能名）；用户自有同名技能或带本地归属的技能不动。没有变化时返回原数组。
 */
function hideSkillsBehindPlugins(commands, heldBackPlugins, userCommands) {
  if (heldBackPlugins.size === 0) return commands;
  let userNames = new Set(userCommands.map((userCommand) => foldName_2(userCommand.name)));
  let isAttributionEnabled;
  let changed = false;
  let mappedCommands = commands.map((command) => {
    let heldBack =
      command.type === "prompt" &&
      command.loadedFrom === "syncedSkills" &&
      command.serverAttribution?.pluginId !== undefined
        ? heldBackPlugins.get(command.serverAttribution.pluginId)
        : undefined;
    if (
      heldBack === undefined ||
      command.type !== "prompt" ||
      command.skillRoot === undefined ||
      userNames.has(foldName_2(command.name)) ||
      (isAttributionEnabled ??= isSkillAttributionEnabled())(command.skillRoot) !== undefined
    )
      return command;
    let replacement = heldBack.heldBack
      ? undefined
      : findPluginReplacementSkill(commands, heldBack.pluginName, command);
    if (!heldBack.heldBack && replacement === undefined) return command;
    changed = true;
    return {
      ...command,
      isHidden: true,
      hiddenBehindPlugin: {
        plugin: heldBack.pluginName,
        heldBack: heldBack.heldBack,
        ...(replacement !== undefined && {
          replacement,
        }),
      },
    };
  });
  return changed ? mappedCommands : commands;
}
//@ chunk-5xgkngpb.js:1736868-1737057 placement
function findPluginReplacementSkill(commands, pluginName, command) {
  let name = foldName_2(command.unqualifiedName ?? command.name);
  return commands.find(
    (command) =>
      command.type === "prompt" &&
      command.pluginInfo?.repository === `${pluginName}@synced` &&
      !isShadowedSkillName(command) &&
      (command.aliases ?? []).some((alias) => foldName_2(alias) === name),
  )?.name;
}
//@ chunk-5xgkngpb.js:1737057-1737394 placement
/**
 * 为被插件接管而隐藏的技能生成提示："现在是插件技能 /X" 或 "属于已关闭的插件 X，去 /plugin 打开"。
 */
function describeSkillHiddenBehindPlugin(command) {
  if (command.type !== "prompt" || command.hiddenBehindPlugin === undefined) return;
  let safe = (name) => normalizeServerNameShort(name, 200);
  let { plugin, replacement } = command.hiddenBehindPlugin;
  let name = safe(command.name);
  if (replacement !== undefined)
    return `${name} is now the plugin skill ${safe(replacement)}. Use /${safe(replacement)}.`;
  return `${name} is now part of the plugin ${safe(plugin)}, which is turned off. Check /plugin to turn it on and run it.`;
}
//@ chunk-5xgkngpb.js:1758455-1758601 placement
function findAdditionalDirRoot(path) {
  let resolved = resolve_2(path);
  let best = null;
  for (let dir of getAdditionalDirectoriesForClaudeMd()) {
    let resolvedDir = resolve_2(dir);
    if (
      isPathWithin_2(resolvedDir, resolved, {
        alreadyComparable: true,
      }) &&
      (best === null || resolvedDir.length > best.length)
    )
      best = resolvedDir;
  }
  return best;
}
//@ chunk-5xgkngpb.js:1758601-1758853 placement
function getAdditionalDirRelativeLabel(path) {
  let additionalDirRoot = findAdditionalDirRoot(path);
  if (additionalDirRoot === null) return null;
  let base = basename(additionalDirRoot);
  if (base === "") return null;
  let any = getAdditionalDirectoriesForClaudeMd().some((dir) => {
    let resolved = resolve_2(dir);
    return resolved !== additionalDirRoot && basename(resolved) === base;
  });
  let parent = basename(dirname(additionalDirRoot));
  let label = any && parent !== "" ? `${parent}/${base}` : base;
  let rest = relative(additionalDirRoot, resolve_2(path));
  return rest === "" ? label : [label, ...rest.split(sep)].join("/");
}
//@ chunk-5xgkngpb.js:1807904-1807955 placement (2.1.88 match: default, 1)
var stubCommand_1 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-5xgkngpb.js:1808575-1808626 placement (2.1.88 match: default, 1)
var stubCommand_2 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-5xgkngpb.js:1826764-1827114 placement
/**
 * getCommandOriginKind：builtin/plugin/mcp/user。
 */
function getCommandOriginKind(command) {
  if (isPluginLocalCommand_2(command)) return "plugin";
  if (command.type !== "prompt") return command.loadedFrom === "mcp" ? "mcp" : "builtin";
  switch (command.source) {
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
//@ chunk-5xgkngpb.js:2087161-2087212 placement (2.1.88 match: default, 1)
var stubCommand_3 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-5xgkngpb.js:2089163-2089214 placement (2.1.88 match: default, 1)
var stubCommand_4 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-5xgkngpb.js:2089214-2089234 placement
var stubCommand_4a = stubCommand_4;
var stubCommand_4b = stubCommand_4;
//@ chunk-5xgkngpb.js:2089234-2089285 placement (2.1.88 match: default, 1)
var stubCommand_5 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-5xgkngpb.js:2089285-2089297 placement
var stubCommand_5a = stubCommand_5;
//@ chunk-5xgkngpb.js:2089297-2089348 placement (2.1.88 match: default, 1)
var stubCommand_6 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-5xgkngpb.js:2089348-2089360 placement
var stubCommand_6a = stubCommand_6;
//@ chunk-5xgkngpb.js:2089360-2089411 placement (2.1.88 match: default, 1)
var stubCommand_7 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-5xgkngpb.js:2089411-2089462 placement (2.1.88 match: default, 1)
var stubCommand_8 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-5xgkngpb.js:2089462-2089513 placement (2.1.88 match: default, 1)
var stubCommand_9 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-5xgkngpb.js:2089513-2089564 placement (2.1.88 match: default, 1)
var stubCommand_10 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-5xgkngpb.js:2109145-2109196 placement (2.1.88 match: default, 1)
var stubCommand_11 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-5xgkngpb.js:2109196-2109247 placement (2.1.88 match: default, 1)
var stubCommand_12 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-5xgkngpb.js:2109247-2109298 placement (2.1.88 match: default, 1)
var stubCommand_13 = {
  isEnabled: () => false,
  isHidden: true,
  name: "stub",
};
//@ chunk-5xgkngpb.js:2109298-2109378 placement
/**
 * WORKER_ONLY_SKILL_NAMES：autopilot/bugfix/dashboard/deep-research/docs/investigate。
 */
var WORKER_ONLY_SKILL_NAMES = ["autopilot", "bugfix", "dashboard", "deep-research", "docs", "investigate"];
//@ chunk-5xgkngpb.js:2109378-2109422 placement
/**
 * 把名字匹配到仅 worker 可用的技能名（autopilot/bugfix/dashboard/deep-research/docs/investigate）。
 */
function workerOnlySkillName(name) {
  return WORKER_ONLY_SKILL_NAMES.find((candidate) => candidate === name);
}
//@ chunk-5xgkngpb.js:2109422-2109444 placement
/**
 * gatedInternalCommand：构建期为 null。
 */
var gatedInternalCommand = null;
var gatedCommandSlot_2 = null;
//@ chunk-5xgkngpb.js:2109444-2109457 placement
// deferred: uses markInPlaceWriteForced (./utils/plugins/safeCopy.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:2109444", () => {
  if (gatedCommandSlot_2) markInPlaceWriteForced();
});
//@ chunk-5xgkngpb.js:2110899-2111249 sole-consumer
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
      whenOpen: [desktopCmdModule],
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
//@ chunk-5xgkngpb.js:2111249-2111298 file-local
/**
 * compactCommandList：filter(Boolean)；旧版名 filterCommandsForRemoteMode 配错（门面把它给了 gjo）。
 */
function compactCommandList(commands) {
  return commands.filter((cmd) => Boolean(cmd));
}
//@ chunk-5xgkngpb.js:2111298-2111374 layout
/**
 * getRuntimeGatedGroup：按组 open() 取 whenOpen 或 whenClosed。
 */
function getRuntimeGatedGroup(groupName) {
  let group = getRuntimeGatedCommandGroups()[groupName];
  return compactCommandList(group.open() ? group.whenOpen : group.whenClosed);
}
//@ chunk-5xgkngpb.js:2111374-2111468 facade-exports
/**
 * getRuntimeGatedBuiltinCommands：五个运行时门控组（fleetFork、fleetBackground、daemon、skillDoctor、logout）的 whenOpen 与 whenClosed 全部成员。
 */
function getRuntimeGatedBuiltinCommands() {
  return Object.values(getRuntimeGatedCommandGroups()).flatMap((group) =>
    compactCommandList([...group.whenOpen, ...group.whenClosed]),
  );
}
//@ chunk-5xgkngpb.js:2111468-2112570 facade-exports
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
    clearCommandAlias,
    colorCommand,
    colorNonInteractiveCommand,
    compactNonInteractiveCommand,
    configCommand,
    configNonInteractiveCommand,
    vimMovedToConfigCommand,
    outputStyleMovedToConfigCommand,
    outputStyleCommand,
    copyCommand,
    desktopCommand,
    contextCommandDefinition,
    contextNonInteractiveCommand,
    diffCommandDefinition,
    ...getRuntimeGatedGroup("fleetBackground"),
    effortNonInteractiveCommand2,
    effortNonInteractiveCommand,
    wellbeingCommand,
    exitCommand,
    versionCommand,
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
    mcpCommandTwin,
    mcpNonInteractiveCommand,
    memoryCommandAlias,
    importCommand,
    importNonInteractiveCommand,
    mobileCommand,
    pauseMemoryCommand,
    modelInteractiveCommand,
    modelNonInteractiveCommand,
    remoteEnvCommand,
    remoteWorkflowCommand,
    workflowLaunchExecCommand,
    workflowLaunchExecCommandAlias,
    pluginCommandAlias,
    projectCommandAlias,
    releaseNotesCommandAlias,
    reloadPluginsCommandAlias,
    reloadSkillsCommandAlias,
    resumeCommand,
    renameNonInteractiveCommand,
    resumeCommandAlias,
    setupBedrockCommand,
    setupVertexCommand,
    sessionCommandAlias,
    skillsCommandAlias,
    statusCommandAlias,
    statuslineCommand,
    tuiCommand,
    themeCommandAlias,
    tuiCommandAlias,
    feedbackNonInteractiveCommand,
    bugNonInteractiveCommand,
    ultrareviewCommand,
    ultrareviewNonInteractiveCommand,
    ultraplanCommand,
    rewindCommandAlias,
    scrollSpeedCommand,
    terminalSetupCommandAlias,
    scrollSpeedCommandAlias,
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
    permissionsCommandAlias,
    planCommandAlias,
    powerupCommand,
    privacySettingsCommand,
    goalCommand,
    goalNonInteractive,
    hooksCommand,
    loopsCommand,
    exportCommand,
    sandboxCommandAlias,
    loginCommand,
    createDesignLoginCommand(),
    designConsentCommand,
    designRevokeCommand,
    ...getRuntimeGatedGroup("logout"),
    passesCommand,
    ...(listAgentsCommand ? [listAgentsCommand] : []),
    ...(gatedCommandSlot_12 ? [gatedCommandSlot_12] : []),
    tasksCommandAlias,
    autofixPrCommand,
    ...[],
    ...EMPTY_COMMAND_LIST,
    teleportCommand,
    diffCmdModule,
    artifactsCommand,
    teamOnboardingCommand,
    radioCommand,
    ...(gatedCommandSlot_8 ? [gatedCommandSlot_8] : []),
    ...(gatedCommandSlot_9 ? [gatedCommandSlot_9] : []),
    ...(gatedCommandSlot_10 ? [gatedCommandSlot_10] : []),
    ...(gatedCommandSlot_11 ? [gatedCommandSlot_11] : []),
    ...(gatedCommandSlot_6 ? [gatedCommandSlot_6] : []),
    ...(antGatedCmdA ? [antGatedCmdA] : []),
    ...(antGatedCmdB ? [antGatedCmdB] : []),
    ...(sandboxRuntimeConfig ? [sandboxRuntimeConfig] : []),
    ...(gatedInPlaceWriteCommand ? [gatedInPlaceWriteCommand] : []),
    ...ENTERPRISE_UPSELL_COMMANDS,
    ...(gatedCommandSlot_2 ? [gatedCommandSlot_2] : []),
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
//@ chunk-5xgkngpb.js:2112570-2113268 facade-exports
/**
 * REMOTE_SAFE_COMMANDS：远程模式（--remote）下仍可在本地执行的命令集合。
 */
var REMOTE_SAFE_COMMANDS; // deferred: uses colorCommandDefinition (./commands/color/index.js) of its import cycle while loading; runs once the cycle is complete
var BRIDGE_SAFE_COMMANDS;
deferInit("chunk-5xgkngpb.js:2112570", () => {
  REMOTE_SAFE_COMMANDS = new Set([
    sessionCommandAlias,
    exitCommand,
    helpCommand,
    themeCommandAlias,
    colorCommand,
    ...(antGatedCmdB ? [antGatedCmdB] : []),
    usageCommand,
    copyCommand,
    feedbackNonInteractiveCommand,
    bugNonInteractiveCommand,
    mobileCommand,
    releaseNotesCommandAlias,
    exportCommand,
    terminalSetupCommandAlias,
    privacySettingsCommand,
    focusCommand,
    wellbeingCommand,
    cloudPluginsCommand,
    hooksCommand,
    configCommand,
    statusCommandAlias,
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
    ...(antGatedCmdA ? [antGatedCmdA] : []),
    ...(sandboxRuntimeConfig ? [sandboxRuntimeConfig] : []),
    ...(gatedInPlaceWriteCommand ? [gatedInPlaceWriteCommand] : []),
    ...[],
    ...(desktopCmdModule ? [desktopCmdModule] : []),
    resumeCommand,
    btwCommand,
    contextCommandDefinition,
    diffCommandDefinition,
    planCommandAlias,
    advisorCommand,
    effortNonInteractiveCommand2,
    versionCommand,
    modelInteractiveCommand,
    internalCmdA,
    clearCommandAlias,
    compactNonInteractiveCommand,
    autocompactNonInteractiveCommand,
    goalNonInteractive,
    ...(gatedCommandSlot_14 ? [gatedCommandSlot_14] : []),
    recapCommand,
    reloadSkillsCommandAlias,
    pauseMemoryCommand,
    agentsRemovedCommand,
    reloadPluginsCommandAlias,
    ...(gatedCommandSlot_8 ? [gatedCommandSlot_8] : []),
    ...(internalGatedCmdB ? [internalGatedCmdB] : []),
    skillDoctorCommand,
    skillDoctorNonInteractiveCommand,
    mcpCommandTwin,
    mcpNonInteractiveCommand,
    addDirCommand,
    addDirNonInteractiveCommand,
    permissionsCommandAlias,
    sandboxCommandAlias,
    tasksCommandAlias,
    diffCmdModule,
    rewindCommandAlias,
    memoryCommandAlias,
    ...(accountMemoryCommands ? [accountMemoryCommands.memoryNotes] : []),
    skillsCommandAlias,
    pluginCommandAlias,
  ]);
  BRIDGE_SAFE_COMMANDS = new Set([
    autoModeSetupNonInteractiveCommand,
    compactNonInteractiveCommand,
    autocompactNonInteractiveCommand,
    clearCommandAlias,
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
    reloadPluginsCommandAlias,
    reloadSkillsCommandAlias,
    restartCommand,
  ]);
});
//@ chunk-5xgkngpb.js:2113268-2113440 facade-exports (2.1.88 match: isBridgeSafeCommand, 0.82)
/**
 * isBridgeSafeCommand：prompt 命令一律可桥接；local-jsx 不可；local 命令需在 BRIDGE_SAFE_COMMANDS 里。
 */
function isBridgeSafeCommand(cmd) {
  if (cmd.type === "local-jsx") return false;
  if (cmd.type === "prompt") return cmd.disableBridgeInvocation !== true;
  if (BRIDGE_SAFE_COMMANDS.has(cmd)) return cmd !== restartCommand || false;
  return isPluginLocalCommand(cmd) && findBridgeFallback(cmd) === undefined;
}
//@ chunk-5xgkngpb.js:2113440-2113528 facade-exports
/**
 * admitsBridgeAuthor：判断桥接端提交的斜杠命令是否允许执行（插件注册的 local 命令需要能找到桥接安全的孪生命令）。
 */
function admitsBridgeAuthor(cmd, submission) {
  if (!isPluginLocalCommand(cmd)) return true;
  return submission.origin?.kind === "human" && !submission.relayAuthored;
}
//@ chunk-5xgkngpb.js:2113528-2113551 layout
/**
 * BRIDGE_TWINS_FOR_PLUGIN_COMMANDS：new Set([contextNonInteractive])：插件同名 local 命令也可由这些桥接安全孪生代答。
 */
var BRIDGE_TWINS_FOR_PLUGIN_COMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:2113528", () => {
  BRIDGE_TWINS_FOR_PLUGIN_COMMANDS = new Set([contextNonInteractiveCommand]);
});
//@ chunk-5xgkngpb.js:2113551-2113707 facade-exports
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
//@ chunk-5xgkngpb.js:2113707-2113754 facade-exports
/**
 * isBridgeDispatchable：命令能否通过桥接派发（综合 isBridgeSafeCommand 与插件孪生回退）。
 */
function isBridgeDispatchable(command) {
  return isBridgeSafeCommand(command) || findBridgeFallback(command) !== undefined;
}
//@ chunk-5xgkngpb.js:2113754-2113876 facade-exports
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
//@ chunk-5xgkngpb.js:2113876-2114264 facade-exports (2.1.88 match: command, 0.607)
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
//@ chunk-5xgkngpb.js:2114264-2114371 facade-exports
/**
 * getHumanFacingDescription：取命令面向用户的描述（技能优先用 description，过长时截断）。
 */
function getHumanFacingDescription(cmd) {
  if (cmd.type !== "prompt" || !isBuiltinCommand(cmd)) return cmd.description;
  return cmd.menuDescription || cmd.description;
}
//@ chunk-5xgkngpb.js:2114371-2114835 facade-exports (2.1.88 match: formatDescriptionWithSource, 0.774)
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
//@ chunk-5xgkngpb.js:2114835-2114896 facade-exports
/**
 * toSlashCommands：把命令列表转换为 SDK/控制协议用的 slash_commands 条目（name、description、argumentHint、aliases）。
 */
function toSlashCommands(clients) {
  let isFolderAlias = folderNameAliasCheck();
  return mergeClients(clients).map((client) => toSlashCommand(client, isFolderAlias));
}
//@ chunk-5xgkngpb.js:2114896-2115262 facade-exports
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
//@ chunk-5xgkngpb.js:2115262-2115304 facade-exports (2.1.88 match: BUILTIN_MARKETPLACE_NAME, 1)
/**
 * 插件 ID 的市场部分是否为 builtin（内置插件）。
 */
function isBuiltinCommand(command) {
  return getCommandOriginKind(command) === "builtin";
}
//@ chunk-5xgkngpb.js:2115304-2115346 facade-exports
/**
 * bridgeAdvertisedCommands：向桥接端（claude.ai 远程会话）公布的命令列表，只含可桥接派发者。
 */
function bridgeAdvertisedCommands(commands) {
  return mergeClients(commands).filter(isBridgeDispatchable);
}
//@ chunk-5xgkngpb.js:2115346-2115827 facade-exports
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
      (alias) => alias !== advertisedName && findCommand(alias, commands) === cmd,
    );
    entry.aliases = aliases.length ? aliases : undefined;
    result.push(entry);
  }
  return result;
}
//@ chunk-5xgkngpb.js:2115827-2115892 layout
/**
 * isPluginLocalCommand：type=local 且 loadedFrom=plugin（函数钩子插件注册的命令）。
 */
function isPluginLocalCommand(cmd) {
  return cmd.type === "local" && cmd.loadedFrom === "plugin";
}
//@ chunk-5xgkngpb.js:2115892-2115969 layout
/**
 * addShippedCommandSpellings：运行时门控内建、内建技能、内建插件技能名都加入集合。
 */
function addShippedCommandSpellings(spellings) {
  addRuntimeGatedCommandSpellings(spellings);
  for (let skill of getRegisteredBundledSkillsIgnoringKillSwitch()) addCommandSpellings(spellings, skill);
  for (let name of builtinPluginSkillNames()) addSpelling(spellings, name);
}
//@ chunk-5xgkngpb.js:2115969-2116012 layout
/**
 * addRuntimeGatedCommandSpellings：对 getRuntimeGatedBuiltinCommands() 逐个 addCommandSpellings。
 */
function addRuntimeGatedCommandSpellings(spellings) {
  for (let command of getRuntimeGatedBuiltinCommands()) addCommandSpellings(spellings, command);
}
//@ chunk-5xgkngpb.js:2116012-2116156 layout
/**
 * getReservedSpellingsFor：state.reservedSpellingsFor 缓存：命令列表占用的全部拼写。
 */
function getReservedSpellingsFor(allCommands) {
  return getHostState().reservedSpellingsFor(allCommands, () => {
    let names = new Set();
    for (let command of allCommands)
      if (command.loadedFrom !== "syncedSkills") addCommandSpellings(names, command);
    addShippedCommandSpellings(names);
    return names;
  });
}
//@ chunk-5xgkngpb.js:2116156-2116240 layout
/**
 * getBuiltinCommandTable：state.builtinCommandTable ??= buildBuiltinCommandTable()。
 */
function getBuiltinCommandTable() {
  let state = getHostState();
  state.builtinCommandTable ??= buildBuiltinCommandTable();
  return state.builtinCommandTable;
}
//@ chunk-5xgkngpb.js:2116240-2116372 facade-exports
/**
 * builtInCommandNames：内建命令占用的全部拼写（name、显示名、aliases，规范化后）的集合，用于技能/插件命名冲突检查。
 */
function builtInCommandNames() {
  let hostState = getHostState();
  hostState.builtinCommandNames ??= new Set(
    getBuiltinCommandTable().flatMap((command) => [command.name, ...(command.aliases ?? [])]),
  );
  return hostState.builtinCommandNames;
}
//@ chunk-5xgkngpb.js:2116372-2116527 facade-exports
/**
 * shippedCommandNames：内建表 + 运行时门控命令 + 发行内建技能/内建插件技能的全部拼写，用于遥测时判断命令名是否可原样上报。
 */
function shippedCommandNames() {
  let hostState = getHostState();
  hostState.shippedCommandNames ??= new Set([
    ...builtInCommandNames(),
    ...getBundledSkills().flatMap((skill) => [skill.name, ...(skill.aliases ?? [])]),
    ...builtinPluginSkillNames(),
  ]);
  return hostState.shippedCommandNames;
}
//@ chunk-5xgkngpb.js:2116527-2116559 facade-exports
/**
 * isFirstPartyCommandName：名字是否属于一方命令拼写。
 */
function isFirstPartyCommandName(name) {
  return firstPartyCommandNameCheck()(name);
}
//@ chunk-5xgkngpb.js:2116559-2116610 facade-exports
/**
 * firstPartyCommandNameCheck：名字是否被一方（内建/发行技能）命令占用的检查器。
 */
function firstPartyCommandNameCheck() {
  let builtinCommandSpellings = collectBuiltinCommandSpellings();
  return (name) => builtinCommandSpellings.has(foldName_2(name));
}
//@ chunk-5xgkngpb.js:2116610-2116672 facade-exports
/**
 * folderNameAliasCheck：插件命名目录别名（named-folder）是否与已有命令冲突。
 */
function folderNameAliasCheck() {
  let spellings;
  return (name) =>
    isSafeSkillName(name) &&
    !isQualifiedToolReference(foldName_2(name), (spellings ??= collectBuiltinCommandSpellings()));
}
//@ chunk-5xgkngpb.js:2116672-2116743 layout
/**
 * collectBuiltinCommandSpellings：内建表 + 发行内建技能的所有拼写。
 */
function collectBuiltinCommandSpellings() {
  let spellings = new Set();
  for (let command of getBuiltinCommandTable()) addCommandSpellings(spellings, command);
  addShippedCommandSpellings(spellings);
  return spellings;
}
//@ chunk-5xgkngpb.js:2116743-2116785 facade-exports
/**
 * shippedCommandNameForAnalytics：命令名属于发行内建拼写时原样返回，否则返回 "custom"，避免上报用户自定义命令名。
 */
function shippedCommandNameForAnalytics(name) {
  return parentCommandName(name, shippedCommandNames().has(name));
}
//@ chunk-5xgkngpb.js:2116785-2116811 facade-exports
/**
 * getBuiltinCommands：返回缓存的内建命令表（不含技能、插件、MCP）。
 */
function getBuiltinCommands() {
  return getBuiltinCommandTable();
}
//@ chunk-5xgkngpb.js:2116811-2117813 fingerprint (2.1.88 match: getSkills, 0.755)
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
//@ chunk-5xgkngpb.js:2117813-2117919 fingerprint (2.1.88 match: getWorkflowCommands, 0.344)
var getWorkflowCommands; // deferred: loads other modules while loading; runs once its import cycle is complete
var invalidateWorkflowCache;
var warmWorkflows;
deferInit("chunk-5xgkngpb.js:2117813", () => {
  ({
    getWorkflowCommands,
    invalidateWorkflowCache,
    warmWorkflows,
  } = require("./commands/workflows/getWorkflowCommands.lazy.js"));
});
//@ chunk-5xgkngpb.js:2117919-2118041 facade-exports
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
//@ chunk-5xgkngpb.js:2118041-2118124 layout
/**
 * loadAllCommands：同旧版 loadAllCommands：按 commandsMemoKey 缓存 loadAllCommandsUncached。
 */
function loadAllCommands(cwd, storage, storageV5) {
  return getOrCreate(getHostState().loadedCommands, commandsMemoKey(cwd, undefined, storageV5), () =>
    loadAllCommandsUncached(cwd, storage, storageV5),
  );
}
//@ chunk-5xgkngpb.js:2118124-2118319 facade-exports
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
//@ chunk-5xgkngpb.js:2118319-2118491 layout
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
//@ chunk-5xgkngpb.js:2118491-2119845 layout
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
    (command) => {
      let reserved = usesReservedSkillNamespace(command.name);
      refuseReservedSkillName({
        name: reserved ? command.name : getCommandName(command),
        path: command.type === "prompt" ? command.skillRoot : undefined,
        change: command.kind === "workflow" ? "workflow-name" : reserved ? "path" : "frontmatter-name",
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
    (command) =>
      logForDebugging(
        `[skills] dropping synced skill '${command.name}' (display '${getCommandName(command)}'): its name is blank, or another command or an earlier synced skill already owns that namespaced name`,
      ),
  ).map(markBareNameReserved);
  let [reservedNameCommands, otherCommands] = partitionAlias(listed, (command) =>
    isShadowedSkillName(command),
  );
  let result = shedReservedAliases(
    dropShadowedFallbackSkills([...otherCommands, ...acceptedSyncedSkills, ...reservedNameCommands]),
    storageV5,
  );
  if (trustedNamesFailedToLoad) getHostState().markLoadedResultMissingTrustedNames(result);
  groupPluginSourcesByName(
    "command",
    result
      .map((command) => ({
        name: command.name,
        source: command.type === "prompt" ? command.source : "builtin",
      }))
      .reverse(),
    {
      resolves: true,
    },
  );
  logRefusedReservedSkillNames();
  return result;
}
//@ chunk-5xgkngpb.js:2119845-2120193 layout
/**
 * logRefusedReservedSkillNames：一次性上报 skill_reserved_namespace 遥测。
 */
function logRefusedReservedSkillNames() {
  let refusals = getHostState().refusedReservedSkillNames();
  if (refusals.length === 0 || !claimOnce().claim("skill_reserved_namespace_refused")) return;
  let counts = {
    refused: refusals.length,
  };
  for (let { name, change } of refusals) {
    let keys = [
      `ns_${(getReservedSkillNamespace(name) ?? "unknown").replaceAll("-", "_")}`,
      `kind_${change.replaceAll("-", "_")}`,
    ];
    for (let key of keys) counts[key] = (counts[key] ?? 0) + 1;
  }
  logFeatureSad("skill_reserved_namespace", "names_refused", counts);
}
//@ chunk-5xgkngpb.js:2120193-2120301 facade-exports
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
//@ chunk-5xgkngpb.js:2120301-2120436 facade-exports
/**
 * getHiddenSyncedSkills：被保留名挡住而未提供的 claude.ai 同步技能。
 */
async function getHiddenSyncedSkills(cwd, storage, hiddenPlugins) {
  if (hiddenPlugins.size === 0) return [];
  return (await getCommands(cwd, storage, hiddenPlugins)).filter(
    (command) => command.type === "prompt" && command.hiddenBehindPlugin !== undefined,
  );
}
//@ chunk-5xgkngpb.js:2120436-2124086 layout
/**
 * assembleCommands：getCommands 的主体。按 availability 与 isCommandEnabled 过滤；附加目录里的项目技能去重；处理条件技能、同步技能；嵌套 .claude/skills 的技能按目录加作用域前缀；把动态技能插入到第一个内建命令之前。
 */
async function assembleCommands(cwd, storage, storageV5) {
  setHistoryStore(getBuiltinCommands);
  let allCommands = await loadAllCommands(cwd, storage, storageV5);
  let shadowedProjectSkills = new Set();
  if (getAdditionalDirectoriesForClaudeMd().length > 0) {
    let aliasNames = new Set();
    for (let command of allCommands) {
      let isProjectSkill =
        command.type === "prompt" && command.loadedFrom === "skills" && command.source === "projectSettings"
          ? getSkillProjectRoot(command)
          : null;
      if (
        isProjectSkill !== null &&
        aliasNames.has(command.name) &&
        (cwd === null ||
          !isPathWithin_2(isProjectSkill, cwd, {
            alreadyComparable: true,
          })) &&
        findAdditionalDirRoot(isProjectSkill) !== null
      ) {
        shadowedProjectSkills.add(command);
        continue;
      }
      aliasNames.add(command.name);
      for (let alias of command.aliases ?? []) aliasNames.add(alias);
    }
  }
  let baseCommands =
    shadowedProjectSkills.size === 0
      ? allCommands
      : allCommands.filter((command) => !shadowedProjectSkills.has(command));
  let syncAllowed = !getSkillsSyncVetoed();
  let withTrustedNames = getHostState().loadedResultIsMissingTrustedNames(allCommands)
    ? (commands) =>
        commands.map((command) =>
          command.loadedFrom === "syncedSkills" ? admitAllAliases(command) : command,
        )
    : (command) => command;
  let dynamicSkills = getDynamicSkills();
  let realRootByCommand = getHostState().realSkillRootByCommand;
  if (shadowedProjectSkills.size > 0) {
    let out = [];
    for (let skill of [...dynamicSkills, ...shadowedProjectSkills]) {
      if (skill.type !== "prompt" || !skill.skillRoot || realRootByCommand.has(skill)) continue;
      out.push(
        realpathNativeAsync(skill.skillRoot).then((realRoot) => {
          if (realRoot !== null) realRootByCommand.set(skill, realRoot);
        }),
      );
    }
    await Promise.all(out);
  }
  let hostSkillNames = new Set(
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
          hostSkillNames.has(
            realRootByCommand.get(shadowedProjectSkill) ?? resolve_2(shadowedProjectSkill.skillRoot),
          )
        ),
    ),
  ]);
  let hostCatalogSkills = syncAllowed
    ? partitionAlias(
        withTrustedNames(getSyncedSkillCommands()).filter((name) => !isKilledHostCatalogSkill(name)),
        (name) => !isHostCatalogSkill(name),
      ).flat()
    : [];
  let dropHostDuplicates =
    hostSkillCatalog() === undefined
      ? (skill) => skill
      : (skill) =>
          hideDuplicateCatalogSkills(skill, [...dynamicAndShadowed, ...hostCatalogSkills]).filter(
            (name) => !isKilledHostCatalogSkill(name),
          );
  let extraCommands = dropHostDuplicates(dynamicAndShadowed);
  let filteredBase = dropHostDuplicates(baseCommands).filter(
    (skill) => meetsAvailabilityRequirement(skill) && isCommandEnabled(skill),
  );
  if (extraCommands.length === 0 && hostCatalogSkills.length === 0) return filteredBase;
  let scopeCache = new Map();
  let scopeOf = (skill) => {
    let scope = scopeCache.get(skill);
    if (scope === undefined) {
      scope = getSkillScopeLabel(skill, cwd);
      scopeCache.set(skill, scope);
    }
    return scope;
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
    offeredExtras.some((skill) => skill.loadedFrom === "syncedSkills") ||
    filteredBase.some((skill) => skill.loadedFrom === "syncedSkills");
  let reserved = new Set(needsReservedCheck ? getReservedSpellingsFor(allCommands) : []);
  if (needsReservedCheck) {
    addNonSyncedSpellings(reserved, offeredExtras);
    addNonSyncedSpellings(reserved, conditionalSkillEntries());
    for (let skill of offeredExtras) {
      if (skill.loadedFrom === "syncedSkills" || isFallbackSkill(skill)) continue;
      let skillScope = scopeOf(skill);
      if (skillScope) addSpelling(reserved, joinScopedName(skillScope, skill.name));
    }
  }
  let base = needsReservedCheck
    ? admitSyncedSkills(filteredBase, reserved).map(markBareNameReserved)
    : filteredBase;
  let baseNames = new Set();
  let baseSkillRoots = new Set();
  for (let command of base) {
    baseNames.add(command.name);
    for (let alias of command.aliases ?? []) baseNames.add(alias);
    if (command.type === "prompt" && command.skillRoot) baseSkillRoots.add(command.skillRoot);
  }
  let nameCounts = new Map();
  for (let skill of offeredExtras) {
    if (isFallbackSkill(skill) || skill.loadedFrom === "syncedSkills") continue;
    nameCounts.set(skill.name, (nameCounts.get(skill.name) ?? 0) + 1);
  }
  let scopedNames = new Set();
  let seenNames = new Set();
  let namesByScope = new Map();
  for (let skill of offeredExtras) {
    let skillScope = scopeOf(skill);
    let skillProjectRoot = getSkillProjectRoot(skill);
    if (skillScope === null || skillProjectRoot === null || skill.type !== "prompt" || !skill.skillRoot)
      continue;
    let scopedName = joinScopedName(skillScope, skill.name);
    let relativeRoot = cwd === null ? null : relative(cwd, skillProjectRoot);
    if (relativeRoot !== null && !relativeRoot.startsWith("..") && !isAbsolute(relativeRoot)) {
      seenNames.add(scopedName);
      continue;
    }
    scopedNames.add(skill);
    let names = namesByScope.get(scopedName) ?? new Set();
    names.add(realRootByCommand.get(skill) ?? resolve_2(skill.skillRoot));
    namesByScope.set(scopedName, names);
  }
  let inserted = [];
  let insertedNames = new Set();
  for (let skill of offeredExtras) {
    if (skill.type === "prompt" && skill.skillRoot && baseSkillRoots.has(skill.skillRoot)) continue;
    if (skill.loadedFrom === "syncedSkills") {
      let cmd = admitSyncedSkill(skill, reserved);
      if (cmd === null) continue;
      let reservedSet = markBareNameReserved(cmd);
      inserted.push(reservedSet);
      insertedNames.add(reservedSet.name);
      addNameAndAliases(reserved, reservedSet);
      continue;
    }
    let skillScope = scopeOf(skill);
    let scopePrefix =
      (skillScope !== null &&
        isPlaidHarborOn() &&
        usesReservedSkillNamespace(joinScopedName(skillScope, skill.name))) ||
      !canOfferUnscoped(skill, skillScope)
        ? null
        : skillScope;
    let isBare = baseNames.has(skill.name);
    if (isFallbackSkill(skill)) {
      if (isBare || (nameCounts.get(skill.name) ?? 0) > 0 || insertedNames.has(skill.name)) continue;
      inserted.push(scopePrefix ? withNestedSkillDescription(skill, scopePrefix) : skill);
      insertedNames.add(skill.name);
      continue;
    }
    if (!(isBare || (nameCounts.get(skill.name) ?? 0) > 1)) {
      inserted.push(scopePrefix ? withNestedSkillDescription(skill, scopePrefix) : skill);
      insertedNames.add(skill.name);
      continue;
    }
    if (!scopePrefix) {
      if (isBare || insertedNames.has(skill.name)) {
        if (skillScope !== null)
          refuseReservedSkillName({
            name: joinScopedName(skillScope, skill.name),
            path: skill.type === "prompt" ? skill.skillRoot : undefined,
            change: "path",
          });
        continue;
      }
      inserted.push(skill);
      insertedNames.add(skill.name);
      continue;
    }
    let scopedName = joinScopedName(scopePrefix, skill.name);
    if (baseNames.has(scopedName) || insertedNames.has(scopedName)) continue;
    if (
      scopedNames.has(skill) &&
      (seenNames.has(scopedName) || (namesByScope.get(scopedName)?.size ?? 0) > 1)
    ) {
      logForDebugging(
        `[skills] ${escapeControlCharsForDisplay(scopedName)} is not offered: another skill would share the name`,
      );
      continue;
    }
    inserted.push(toScopedSkillCommand(skill, scopePrefix, isBare || insertedNames.has(skill.name), cwd));
    insertedNames.add(scopedName);
  }
  if (hostCatalogSkills.length > 0) addNonSyncedSpellings(reserved, inserted);
  let filtered = admitSyncedSkills(hostCatalogSkills, reserved)
    .map(markBareNameReserved)
    .filter((skill) => meetsAvailabilityRequirement(skill) && isCommandEnabled(skill));
  let [unshadowed, shadowed] = partitionAlias(inserted, (name) => isShadowedSkillName(name));
  let merged = [...shadowed, ...filtered];
  if (merged.length === 0 && unshadowed.length === 0) return base;
  let builtinNames = new Set(getBuiltinCommandTable().map((command) => command.name));
  let insertIndex = base.findIndex((command) => builtinNames.has(command.name));
  if (insertIndex === -1) return dropShadowedFallbackSkills([...base, ...merged, ...unshadowed]);
  return dropShadowedFallbackSkills([
    ...base.slice(0, insertIndex),
    ...merged,
    ...base.slice(insertIndex),
    ...unshadowed,
  ]);
}
//@ chunk-5xgkngpb.js:2124086-2124571 layout
/**
 * dropAmbiguousScopedSkills：同名且无法加作用域前缀的嵌套技能不提供。
 */
function dropAmbiguousScopedSkills(skills, scopeOf, filteredBase) {
  let filtered = skills.filter((skill) => !canOfferUnscoped(skill, scopeOf(skill)));
  if (filtered.length === 0) return skills;
  let namesBySkill = new Map();
  for (let skill of [...filteredBase, ...skills.filter((skill) => !isFallbackSkill(skill))]) {
    if (skill.loadedFrom === "syncedSkills") continue;
    for (let name of [skill.name, ...(skill.aliases ?? [])])
      namesBySkill.set(name, (namesBySkill.get(name) ?? 0) + 1);
  }
  let skillRoots = new Set(filteredBase.map((base) => (base.type === "prompt" ? base.skillRoot : undefined)));
  let ambiguous = new Set(
    filtered.filter(
      (skill) =>
        (namesBySkill.get(skill.name) ?? 0) > 1 &&
        !(skill.type === "prompt" && skillRoots.has(skill.skillRoot)),
    ),
  );
  for (let skill of ambiguous)
    reportRefusedSkillName(joinScopedName(scopeOf(skill) ?? "", skill.name), "is not offered");
  return skills.filter((skill) => !ambiguous.has(skill));
}
//@ chunk-5xgkngpb.js:2124571-2124654 layout
/**
 * canOfferUnscoped：无作用域、同步技能或作用域名被保留时返回 true。
 */
function canOfferUnscoped(skill, scope) {
  return (
    scope === null ||
    skill.loadedFrom === "syncedSkills" ||
    isSkillFilePathOrIdentifier(joinScopedName(scope, skill.name))
  );
}
//@ chunk-5xgkngpb.js:2124654-2124844 layout
/**
 * getSkillScopeLabel：技能所在项目相对 cwd 的路径（或目录名）作为作用域。
 */
function getSkillScopeLabel(skill, cwd) {
  let skillProjectRoot = getSkillProjectRoot(skill);
  if (skillProjectRoot === null) return null;
  let relativeRoot = cwd === null ? null : relative(cwd, skillProjectRoot);
  if (relativeRoot === "") return null;
  if (relativeRoot === null || relativeRoot.startsWith("..") || isAbsolute(relativeRoot))
    return getAdditionalDirRelativeLabel(skillProjectRoot);
  return relativeRoot.split(sep).join("/");
}
//@ chunk-5xgkngpb.js:2124844-2125002 layout
/**
 * getSkillProjectRoot：skillRoot 中 /.claude/ 之前的部分。
 */
function getSkillProjectRoot(skill) {
  if (skill.type !== "prompt" || !skill.skillRoot) return null;
  let index = skill.skillRoot.lastIndexOf(`${sep}.claude${sep}`);
  return index === -1 ? null : skill.skillRoot.slice(0, index);
}
//@ chunk-5xgkngpb.js:2125002-2125170 layout
/**
 * withNestedSkillDescription：描述追加 "(from X/.claude/skills — applies when working on files under X/)"。
 */
function withNestedSkillDescription(description, nested) {
  if (description.type !== "prompt") return description;
  return {
    ...description,
    description: `${description.description} (from ${nested}/.claude/skills \u2014 applies when working on files under ${nested}/)`,
  };
}
//@ chunk-5xgkngpb.js:2125170-2125734 layout
/**
 * toScopedSkillCommand：生成 "scope:name" 形式的嵌套技能命令。
 */
function toScopedSkillCommand(skill, scope, base, cwd) {
  if (skill.type !== "prompt") return skill;
  let scopedName = joinScopedName(scope, skill.name);
  let sourceLabel = base
    ? `scoped to ${scope}/ \u2014 use this instead of the unscoped "${skill.name}" skill when the files being changed are under ${scope}/`
    : `from ${scope}/.claude/skills \u2014 applies when working on files under ${scope}/`;
  let path = getSkillProjectRoot(skill);
  let root = path === null ? null : findAdditionalDirRoot(path);
  let isScoped =
    path !== null &&
    root !== null &&
    (cwd === null ||
      !isPathWithin_2(cwd, path, {
        alreadyComparable: true,
      }) ||
      (root !== cwd &&
        isPathWithin_2(cwd, root, {
          alreadyComparable: true,
        })));
  return {
    ...skill,
    name: scopedName,
    unqualifiedName: skill.name,
    allowlistedByFullNameOnly: isScoped ? true : undefined,
    aliases: undefined,
    userFacingName: () => scopedName,
    description: `${skill.description} (${sourceLabel})`,
  };
}
//@ chunk-5xgkngpb.js:2125734-2125780 facade-exports
/**
 * clearCommandMemoizationCaches：清空 getCommands/loadAllCommands/技能列表等的记忆化缓存，但不清技能目录缓存。
 */
function clearCommandMemoizationCaches() {
  getHostState().invalidateCommands();
  invalidateWorkflowCache();
}
//@ chunk-5xgkngpb.js:2125780-2125816 facade-exports
/**
 * clearCommandsCache：清空命令相关的全部缓存（含技能目录、插件命令、插件技能）。
 */
function clearCommandsCache() {
  clearCommandMemoizationCaches();
  clearPluginCommands();
  clearPluginSkillsCache();
  clearSkillCaches();
}
//@ chunk-5xgkngpb.js:2125816-2125853 facade-exports (2.1.88 match: COMMON_HELP_ARGS, 0.53)
/**
 * HEADLESS_YIELDABLE_NAMES：无头模式下内建命令可以让给插件/技能的名字（help、feedback）。
 */
var HEADLESS_YIELDABLE_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:2125816", () => {
  HEADLESS_YIELDABLE_NAMES = new Set(["help", "feedback"]);
});
//@ chunk-5xgkngpb.js:2125853-2127574 layout
/**
 * shedReservedAliases：插件/同步技能的别名若与内建/保留名冲突则移入 shedAliases；无头模式让出 help/feedback。
 */
function shedReservedAliases(commands, checkNamedFolders) {
  let isPluginOrSynced = (command) =>
    command.type === "prompt" && (command.source === "plugin" || command.loadedFrom === "syncedSkills");
  let nonInteractive = getIsNonInteractiveSession();
  let takenNames = new Set();
  for (let command of commands) {
    let needsNonInteractive = nonInteractive && !supportsNonInteractive(command);
    if (!needsNonInteractive || !HEADLESS_YIELDABLE_NAMES.has(command.name)) takenNames.add(command.name);
    if (!isPluginOrSynced(command)) {
      for (let alias of command.aliases ?? [])
        if (!needsNonInteractive || !HEADLESS_YIELDABLE_NAMES.has(alias)) takenNames.add(alias);
    }
  }
  let spellings;
  let isBuiltinName = (name) => {
    let folded = foldName_2(name);
    if (nonInteractive && HEADLESS_YIELDABLE_NAMES.has(folded)) return false;
    if (spellings === undefined) {
      spellings = new Set();
      for (let command of getBuiltinCommandTable()) addCommandSpellings(spellings, command);
      for (let skill of getBundledSkills()) addCommandSpellings(spellings, skill);
      addRuntimeGatedCommandSpellings(spellings);
      let mapped = getBuiltinPlugins().disabled.map((plugin) => plugin.name);
      for (let name of builtinPluginSkillNames(new Set(mapped))) addSpelling(spellings, name);
    }
    return isQualifiedToolReference(folded, spellings);
  };
  let isTaken = (name) => takenNames.has(name) || isBuiltinName(name);
  let finalNames;
  if (checkNamedFolders) {
    let nameCounts = new Map();
    for (let command of commands) nameCounts.set(command.name, (nameCounts.get(command.name) ?? 0) + 1);
    let filtered = commands.filter(getCommandId);
    let aliasCounts = new Map();
    for (let command of filtered) {
      let sliced = command.name.slice(command.name.lastIndexOf(":") + 1);
      for (let name of new Set([...(command.aliases ?? []), sliced]))
        aliasCounts.set(name, (aliasCounts.get(name) ?? 0) + 1);
    }
    finalNames = new Set(
      filtered.flatMap((command) =>
        nameCounts.get(command.name) === 1 && !(command.type === "prompt" && command.userInvocable === false)
          ? (command.aliases ?? []).filter((name) => aliasCounts.get(name) === 1 && !isTaken(name))
          : [],
      ),
    );
  }
  let keptCount = 0;
  let mapped = commands.map((command) => {
    if (!isPluginOrSynced(command) || command.type !== "prompt") return command;
    if (command.loadedFrom === "syncedSkills")
      return filterCommandAliases(command, (alias) => takenNames.has(alias));
    let isAliasFree =
      (finalNames !== undefined && getCommandId(command)) || command.pluginInfo === undefined
        ? []
        : (command.aliases ?? []).filter((alias) => !isTaken(alias) && finalNames?.has(alias) === true);
    keptCount += isAliasFree.length;
    let filtered = (command.aliases ?? []).filter((alias) => isTaken(alias) || isAliasFree.includes(alias));
    if (filtered.length === 0) return command;
    let entry = {
      ...filterCommandAliases(command, (alias) => filtered.includes(alias)),
      shedAliases: command.shedAliases ? [...command.shedAliases, ...filtered] : filtered,
    };
    return isAliasFree.length > 0 && entry.pluginInfo !== undefined
      ? {
          ...entry,
          pluginInfo: {
            ...entry.pluginInfo,
            namedFolderYield: {
              yielded: isAliasFree,
              aliasesBefore: (command.aliases ?? []).filter((alias) => !isTaken(alias)),
            },
          },
        }
      : entry;
  });
  if (keptCount > 0 && claimOnce().claim("skill_reserved_namespace_named_folder"))
    logFeatureOk("skill_reserved_namespace", {
      check: lit_2("desktop_skills_folder_took_short_names"),
      plugin_aliases_dropped: keptCount,
    });
  return mapped;
}
//@ chunk-5xgkngpb.js:2127574-2127887 facade-exports
/**
 * withNamedFolderYieldsRestored：恢复插件命名目录让出的别名（用于展示完整命令列表）。
 */
function withNamedFolderYieldsRestored(commands) {
  return commands.map((command) => {
    if (command.type !== "prompt") return command;
    let namedFolderYield = command.pluginInfo?.namedFolderYield;
    if (namedFolderYield === undefined) return command;
    let { yielded, aliasesBefore } = namedFolderYield;
    let { shedAliases, ...rest } = command;
    let shed = [...(shedAliases ?? [])];
    for (let name of yielded) {
      let index = shed.lastIndexOf(name);
      if (index !== -1) shed.splice(index, 1);
    }
    return {
      ...rest,
      aliases: aliasesBefore,
      ...(shed.length > 0 && {
        shedAliases: shed,
      }),
    };
  });
}
//@ chunk-5xgkngpb.js:2127887-2127987 facade-exports
/**
 * getSkillToolCommands：Skill 工具可调用的技能列表（prompt、非内建、模型可调用、有描述或 whenToUse）。
 */
function getSkillToolCommands(cwd, storage, hiddenPlugins = getHeldBackSyncedPlugins()) {
  let storageV5 = isTopHostSkillPluginSession();
  return getOrCreate(getHostState().skillToolCommands, commandsMemoKey(cwd, hiddenPlugins, storageV5), () =>
    getSkillToolCommandsUncached(cwd, storage, hiddenPlugins, storageV5),
  );
}
//@ chunk-5xgkngpb.js:2127987-2128084 layout
/**
 * getSkillToolCommandsUncached：getCommands 后用 isSkillToolCommand 过滤。
 */
async function getSkillToolCommandsUncached(cwd, storage, hiddenPlugins, storageV5) {
  if (getDisableSlashCommands()) return [];
  let commands = await getCommands(cwd, storage, hiddenPlugins, storageV5);
  return hideShadowedCommands(commands.filter(isSkillToolCommand), commands);
}
//@ chunk-5xgkngpb.js:2128084-2128185 facade-exports
/**
 * getSlashCommandToolSkills：系统提示里列出的技能清单（来自技能目录、插件、内建技能，按设置过滤）。
 */
function getSlashCommandToolSkills(cwd, storage) {
  let storageV5 = isTopHostSkillPluginSession();
  return getOrCreate(getHostState().slashCommandToolSkills, commandsMemoKey(cwd, undefined, storageV5), () =>
    getSlashCommandToolSkillsUncached(cwd, storage, storageV5),
  );
}
//@ chunk-5xgkngpb.js:2128185-2128693 fingerprint (2.1.88 match: getSlashCommandToolSkills, 0.755)
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
export {
  getSkillToolCommands,
  clearCommandMemoizationCaches,
  bridgeAdvertisedCommands,
  getSlashCommandToolSkills,
  getCommands,
  toSlashCommands,
  clearCommandsCache,
  WORKER_ONLY_SKILL_NAMES,
  firstPartyCommandNameCheck,
  looksLikeSlashInput,
  inputStartsWithMatchingCommand,
  hasCommand,
  splitSlashCommandInput,
  shouldRedactInput,
  findCommand,
  isCommandEnabled,
  isSkillOff,
  shippedCommandNameForAnalytics,
  isImmediateCommand,
  admitsBridgeAuthor,
  getCommandName,
  folderNameAliasCheck,
  buildCommandLookup,
  toSlashCommand,
  isBuiltinCommand,
  formatDescriptionWithSource,
  getHumanFacingDescription,
  dedupeBundledSkills,
  getCommand,
  regExp,
  TEAM_SETUP_GUIDE_LABEL,
  withNamedFolderYieldsRestored,
  filterCommandsByAllowlist,
  hiddenCommandsWhenSlashDisabled,
  dropShadowedFallbackSkills,
  stubCommand_1,
  stubCommand_3,
  stubCommand_4a,
  stubCommand_4b,
  stubCommand_8,
  stubCommand_5a,
  stubCommand_6a,
  stubCommand_2,
  stubCommand_7,
  stubCommand_9,
  stubCommand_10,
  stubCommand_11,
  stubCommand_12,
  stubCommand_13,
  gatedInternalCommand,
  gatedCommandSlot_2,
  addCommandSpellings,
  filterCommandAliases,
  clearUserFacingName,
  meetsAvailabilityRequirement,
  getBareCommandNameUnlessSynced,
  isSkillToolCommand,
  isFirstPartyCommandName,
  matchesUnqualifiedName,
  resolveBarePluginSkillName,
  getBareCommandName,
  builtInCommandNames,
  shippedCommandNames,
  getCommandContextMode,
  isProjectScopedCommand,
  describeSkillHiddenBehindPlugin,
  getCommandOriginKind,
  getBuiltinCommands,
  hasSensitiveArgs,
  buildCommandRunInfo,
  isBridgeSafeCommand,
  findBridgeFallback,
  isImagePlaceholder,
  isBridgeDispatchable,
  toBridgeSlashCommands,
  warmCommandSourceCaches,
  passesPolicyGate,
  REMOTE_SAFE_COMMANDS,
  filterCommandsForRemoteMode,
  withWorkerOnlyCommands,
  BRIDGE_SAFE_COMMANDS,
  isPluginDirMissingFromSyncedList,
  getHeldBackSyncedPlugins,
  getHiddenSyncedSkills,
  workerOnlySkillName,
  HEADLESS_YIELDABLE_NAMES,
  commandsMemoKey,
  buildBuiltinCommandTable,
  getRuntimeGatedBuiltinCommands,
};
