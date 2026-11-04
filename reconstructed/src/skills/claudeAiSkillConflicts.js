/**
 * skills/claudeAiSkillConflicts.ts
 *
 * 2.1.316 新增：claude.ai 技能冲突处理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ygke3hz8.js (12)
 * attribution: placement 12
 */
import {
  skillOverrideWithSource,
  getSkillOverrideState,
  isNotProtoKey,
  qualifiedOverrideNames,
  strongestOverride_2,
  ownLookup,
  bareSkillName,
  syncedSkillUnqualifiedAlias,
  getSyncedSkillUnqualifiedAlias,
} from "../utils/commandPredicates.js";
import { isSettingSourceEnabled, getSettingSourceName } from "../utils/settings/constants.js";
import { getSettingsForSource } from "../utils/settings/settings.js";
import { isSyncedMarketplacePlugin } from "../utils/permissions/permissionRulePayload.js";
import { CLAUDE_AI_SYNC_LABEL, isBuiltinCommandSource } from "../utils/settings/commandSyncNames.js";
import { getCommandName, findCommand } from "../commands.js";
import { printableText } from "../utils/stringUtils.js";
import { foldName } from "../utils/plugins/syncedItems.js";
import { tildify } from "../utils/path.js";
import { isSkillCommand } from "../components/skills/SkillsMenu.js";
import { estimateSkillListingTokens } from "./loadSkillsDir.js";

//@ chunk-ygke3hz8.js:796-1212 placement
/**
 * 判断技能覆盖状态是否被锁定及来源：策略/flag 设置、保留名（不可调用模型）、作者声明仅用户可调用、插件；无锁定返回 undefined。
 */
function getLockedSkillOverride(skill) {
  let override = skillOverrideWithSource(skill);
  if (override) {
    let value = skill.source === "plugin" ? getSkillOverrideState(skill) : override.value;
    return {
      value,
      source: value !== override.value ? "plugin" : override.source === "policySettings" ? "policy" : "flag",
    };
  }
  if (!isNotProtoKey(skill.name))
    return {
      value: skill.disableModelInvocation ? "user-invocable-only" : "on",
      source: "reserved-name",
    };
  if (skill.disableModelInvocation)
    return {
      value: "user-invocable-only",
      source: "author",
    };
  if (skill.source === "plugin")
    return {
      value: getSkillOverrideState(skill),
      source: "plugin",
    };
  return;
}
//@ chunk-ygke3hz8.js:1212-1645 placement
/**
 * 从项目/用户（MCP 技能还看别名；同步技能还看本地设置的裸名）设置的 skillOverrides 里读取某技能的覆盖值。
 */
function getLowerTierSkillOverride(command, { skipLocalBareKey = false } = {}) {
  if (command.loadedFrom === "mcp") {
    let names = [command.name, ...qualifiedOverrideNames(command)];
    for (let source of ["projectSettings", "userSettings"]) {
      if (!isSettingSourceEnabled(source)) continue;
      let override = strongestOverride_2(getSettingsForSource(source)?.skillOverrides, names);
      if (override !== undefined) return override;
    }
    return;
  }
  let overridesFor = (source) =>
    isSettingSourceEnabled(source) ? getSettingsForSource(source)?.skillOverrides : undefined;
  let lookupTiers = (name) =>
    ownLookup(overridesFor("projectSettings"), name) ?? ownLookup(overridesFor("userSettings"), name);
  let bareName = bareSkillName(command);
  let localOverride = skipLocalBareKey
    ? undefined
    : ownLookup(getSettingsForSource("localSettings")?.skillOverrides, bareName);
  return (
    lookupTiers(command.name) ?? (bareName != null ? (localOverride ?? lookupTiers(bareName)) : undefined)
  );
}
//@ chunk-ygke3hz8.js:1645-1728 placement = filterMcpPromptsByServer (0.787)
function commandBelongsToServer(commands, serverName) {
  return commands.loadedFrom === "mcp"
    ? strongestOverride_2(serverName, [commands.name, ...qualifiedOverrideNames(commands)])
    : ownLookup(serverName, commands.name);
}
//@ chunk-ygke3hz8.js:1728-1978 placement
/**
 * 技能来源的显示标签：claude.ai 同步、mcp、plugin、memory store、built-in，或设置来源名。
 */
function getSkillSourceLabel({ source, loadedFrom, pluginInfo }) {
  if (loadedFrom === "syncedSkills" || isSyncedMarketplacePlugin(pluginInfo?.repository))
    return CLAUDE_AI_SYNC_LABEL;
  switch (source) {
    case "mcp":
    case "plugin":
      return source;
    case "memoryStore":
      return "memory store";
    case "bundled":
    case "builtin":
      return "built-in";
    default:
      return getSettingSourceName(source);
  }
}
//@ chunk-ygke3hz8.js:1978-2045 placement
/**
 * 给出 claude.ai 同步技能对外显示的名字（命令名可用时用命令名）。
 */
function claudeAiSkillDisplayName(command) {
  let alias = syncedSkillUnqualifiedAlias(command);
  return alias !== undefined && getCommandName(command) === alias ? alias : command.name;
}
//@ chunk-ygke3hz8.js:2045-4103 placement
/**
 * 说明哪些 claude.ai 同步技能的 /名字 在本会话被其他命令占用或不可用：单条时给出具体原因（被自己的技能/项目/组织/插件/内置命令占用，或名字太相近），多条时汇总并建议重命名或删除用户自己的同名技能。
 */
function describeSyncedSkillConflicts(commands, allCommands) {
  let filtered = allCommands.filter((command) => command.loadedFrom !== "syncedSkills");
  let conflicts = [];
  for (let command of commands) {
    let unqualifiedName = command.unqualifiedName;
    if (
      command.loadedFrom !== "syncedSkills" ||
      unqualifiedName === undefined ||
      getSyncedSkillUnqualifiedAlias(command) !== undefined
    )
      continue;
    let bareName = printableText(unqualifiedName);
    let exactMatch = findCommand(unqualifiedName, filtered);
    let foldedName = foldName(unqualifiedName);
    let namesOf = (command) => [command.name, getCommandName(command), ...(command.aliases ?? [])];
    let findFoldMatch = (command) =>
      namesOf(command).find((candidateName) => foldName(candidateName) === foldedName);
    let holder = exactMatch ?? filtered.find((command) => findFoldMatch(command));
    if (!holder) {
      conflicts.push({
        bare: bareName,
        sentence: `Your claude.ai skill can't use /${bareName} in this session.`,
        held: false,
        userCanFree: false,
        renameNeedsNameLine: false,
      });
      continue;
    }
    let promptHolder = holder.type === "prompt" ? holder : undefined;
    let kindText =
      promptHolder?.skillRoot !== undefined ? "skill" : `command file ${printableText(holder.name)}.md`;
    let holderDescription;
    let userAdvice = "";
    let needsNameLine = false;
    if (holder.kind === "workflow") holderDescription = "a workflow";
    else if (holder.loadedFrom === "plugin") holderDescription = "a command from a plugin";
    else
      switch (isBuiltinCommandSource(holder)) {
        case "user": {
          let rootSuffix =
            promptHolder?.skillRoot !== undefined
              ? ` in ${printableText(tildify(promptHolder.skillRoot))}`
              : "";
          holderDescription = `your own ${kindText}${rootSuffix}`;
          needsNameLine = holder.loadedFrom === "skills";
          userAdvice = needsNameLine
            ? " Rename it (folder and SKILL.md name) or delete it to use the claude.ai one."
            : " Rename or delete it to use the claude.ai one.";
          break;
        }
        case "project":
          holderDescription = `this project's ${kindText}`;
          break;
        case "managed":
          holderDescription = `a ${kindText} your organization manages`;
          break;
        case "plugin":
          holderDescription = "a command from a plugin";
          break;
        case "remote":
          holderDescription =
            holder.loadedFrom === "mcp"
              ? "a skill from an MCP server"
              : holder.isMcp
                ? "a prompt from an MCP server"
                : "another command";
          break;
        case "builtin":
        case "bundled":
          holderDescription = "a built-in Claude Code command";
          break;
        default:
          holderDescription = "another command";
      }
    let holderSlash = `/${printableText(findFoldMatch(holder) ?? holder.name)}`;
    let sentence =
      exactMatch !== undefined
        ? `/${bareName} runs ${holderDescription}${userAdvice ? `.${userAdvice}` : ", not your claude.ai skill."}`
        : `/${bareName} is too close to ${holderSlash}, ${holderDescription}${userAdvice ? `.${userAdvice}` : ", so your claude.ai skill can't use it."}`;
    conflicts.push({
      bare: bareName,
      sentence,
      held: true,
      userCanFree: userAdvice !== "",
      renameNeedsNameLine: needsNameLine,
    });
  }
  if (conflicts.length === 0) return;
  if (conflicts.length === 1) return conflicts[0].sentence;
  let takenPhrase = conflicts.every((conflict) => conflict.held)
    ? "are taken by other commands"
    : "are taken by other commands or unavailable in this session";
  let summarySentence = `${formatSlashList(conflicts)} ${takenPhrase}, so they don't run your claude.ai skills.`;
  let conflicts_2 = conflicts.filter((conflict) => conflict.userCanFree);
  if (conflicts_2.length === 0) return summarySentence;
  let renameVerb = conflicts_2.some((conflict) => conflict.renameNeedsNameLine)
    ? "Rename (folder and SKILL.md name)"
    : "Rename";
  let onesWord = conflicts_2.length === 1 ? "one" : "ones";
  return `${summarySentence} ${renameVerb} or delete your own ${formatSlashList(conflicts_2)} to use the claude.ai ${onesWord}.`;
}
//@ chunk-ygke3hz8.js:4103-4301 placement
function formatSlashList(conflicts) {
  let mapped = conflicts.map((conflict) => `/${conflict.bare}`);
  if (mapped.length === 1) return mapped[0];
  if (mapped.length <= 4) return `${mapped.slice(0, -1).join(", ")} and ${mapped.at(-1)}`;
  return `${mapped.slice(0, 3).join(", ")} and ${mapped.length - 3} more`;
}
//@ chunk-ygke3hz8.js:4301-4563 placement
/**
 * 列出可配置的技能并排序：按估算 token 降序（可选），否则按来源标签再按名字。
 */
function sortSkillsForListing(commands, { sortByTokens = false } = {}) {
  let filtered = commands.filter(isSkillCommand);
  if (sortByTokens) {
    let tokenCounts = new Map(filtered.map((command) => [command, estimateSkillListingTokens(command)]));
    return filtered.sort(
      (left, right) =>
        (tokenCounts.get(right) ?? 0) - (tokenCounts.get(left) ?? 0) ||
        claudeAiSkillDisplayName(left).localeCompare(claudeAiSkillDisplayName(right)),
    );
  }
  return filtered.sort(
    (left, right) =>
      getSkillSourceLabel(left).localeCompare(getSkillSourceLabel(right)) ||
      claudeAiSkillDisplayName(left).localeCompare(claudeAiSkillDisplayName(right)),
  );
}
//@ chunk-ygke3hz8.js:4563-4656 placement
/**
 * 复制本地设置里的 skillOverrides 表。
 */
function localSkillOverrides() {
  return Object.assign(Object.create(null), getSettingsForSource("localSettings")?.skillOverrides);
}
//@ chunk-ygke3hz8.js:4656-4827 placement
/**
 * 构建技能覆盖判断的上下文：本地覆盖、较低层级的同名技能与被锁定的技能。
 */
function buildSkillOverrideContext(commands, localOverrides = localSkillOverrides()) {
  let lowerTier = new Map();
  let locked = new Map();
  for (let command of commands) {
    let lowerTierSkillOverride = getLowerTierSkillOverride(command);
    if (lowerTierSkillOverride) lowerTier.set(command.name, lowerTierSkillOverride);
    let lockedSkillOverride = getLockedSkillOverride(command);
    if (lockedSkillOverride) locked.set(command, lockedSkillOverride);
  }
  return {
    localOverrides,
    lowerTier,
    locked,
  };
}
//@ chunk-ygke3hz8.js:4827-5019 placement
/**
 * 计算每个技能当前生效的覆盖值：锁定值 > 本地覆盖 > 低层设置 > on。
 */
function getEffectiveSkillStates(commands, context) {
  let states = Object.create(null);
  for (let command of commands) {
    if (Object.hasOwn(states, command.name)) continue;
    states[command.name] =
      context.locked.get(command)?.value ??
      commandBelongsToServer(command, context.localOverrides) ??
      context.lowerTier.get(command.name) ??
      "on";
  }
  return states;
}
//@ chunk-ygke3hz8.js:5019-6089 placement
/**
 * 计算要写入本地设置的技能覆盖差异：跳过锁定技能；MCP 技能处理别名键的迁移；同步技能处理裸名键；只在与低层值不同时写入。返回差异、写入数与生效值变化数。
 */
function diffSkillOverrides(commands, desired, context) {
  let { localOverrides, lowerTier, locked } = context;
  let lockedNames = new Set(Array.from(locked.keys(), (command) => command.name));
  let seenNames = new Set(lockedNames);
  let diff = Object.create(null);
  let writes = 0;
  let effectiveChanged = 0;
  for (let command of commands) {
    if (seenNames.has(command.name)) continue;
    seenNames.add(command.name);
    let desiredState = ownLookup(desired, command.name) ?? "on";
    let tierDefault = lowerTier.get(command.name) ?? "on";
    let currentState = commandBelongsToServer(command, localOverrides) ?? tierDefault;
    if (command.loadedFrom === "mcp") {
      if (desiredState === currentState) continue;
      let didWrite = false;
      let newValue = desiredState === tierDefault ? undefined : desiredState;
      if (newValue !== ownLookup(localOverrides, command.name) || Object.hasOwn(diff, command.name)) {
        diff[command.name] = newValue;
        didWrite = true;
      }
      for (let qualifiedName of qualifiedOverrideNames(command)) {
        if (ownLookup(localOverrides, qualifiedName) === undefined) continue;
        for (let command_2 of commands) {
          if (
            command_2.name === command.name ||
            command_2.loadedFrom !== "mcp" ||
            !qualifiedOverrideNames(command_2).includes(qualifiedName) ||
            Object.hasOwn(diff, command_2.name)
          )
            continue;
          let otherState = commandBelongsToServer(command_2, localOverrides);
          if (
            (lockedNames.has(command_2.name) ||
              (ownLookup(desired, command_2.name) ?? "on") ===
                (otherState ?? lowerTier.get(command_2.name) ?? "on")) &&
            otherState !== undefined
          )
            diff[command_2.name] = otherState;
        }
        diff[qualifiedName] = undefined;
        didWrite = true;
      }
      if (didWrite) writes++;
      effectiveChanged++;
      continue;
    }
    let bareKey = command.loadedFrom === "syncedSkills" ? bareSkillName(command) : undefined;
    if (
      bareKey != null &&
      ownLookup(localOverrides, bareKey) !== undefined &&
      desiredState !== currentState
    ) {
      let baseTier =
        getLowerTierSkillOverride(command, {
          skipLocalBareKey: true,
        }) ?? "on";
      let storedValue = desiredState === baseTier ? undefined : desiredState;
      if (storedValue !== ownLookup(localOverrides, command.name)) diff[command.name] = storedValue;
      diff[bareKey] = undefined;
      writes++;
      effectiveChanged++;
      continue;
    }
    if (command.loadedFrom === "syncedSkills" && desiredState === currentState) continue;
    let storedValue = desiredState === tierDefault ? undefined : desiredState;
    if (storedValue !== ownLookup(localOverrides, command.name)) {
      diff[command.name] = storedValue;
      writes++;
    }
    if (desiredState !== currentState) effectiveChanged++;
  }
  return {
    diff,
    writes,
    effectiveChanged,
  };
}
export {
  sortSkillsForListing,
  describeSyncedSkillConflicts,
  localSkillOverrides,
  buildSkillOverrideContext,
  getEffectiveSkillStates,
  claudeAiSkillDisplayName,
  getSkillSourceLabel,
  diffSkillOverrides,
  getLockedSkillOverride,
};
