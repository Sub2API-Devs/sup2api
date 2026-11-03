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
function getLockedSkillOverride(e) {
  let n = skillOverrideWithSource(e);
  if (n) {
    let t = e.source === "plugin" ? getSkillOverrideState(e) : n.value;
    return {
      value: t,
      source: t !== n.value ? "plugin" : n.source === "policySettings" ? "policy" : "flag",
    };
  }
  if (!isNotProtoKey(e.name))
    return {
      value: e.disableModelInvocation ? "user-invocable-only" : "on",
      source: "reserved-name",
    };
  if (e.disableModelInvocation)
    return {
      value: "user-invocable-only",
      source: "author",
    };
  if (e.source === "plugin")
    return {
      value: getSkillOverrideState(e),
      source: "plugin",
    };
  return;
}
//@ chunk-ygke3hz8.js:1212-1645 placement
/**
 * 从项目/用户（MCP 技能还看别名；同步技能还看本地设置的裸名）设置的 skillOverrides 里读取某技能的覆盖值。
 */
function getLowerTierSkillOverride(e, { skipLocalBareKey: n = false } = {}) {
  if (e.loadedFrom === "mcp") {
    let a = [e.name, ...qualifiedOverrideNames(e)];
    for (let y of ["projectSettings", "userSettings"]) {
      if (!isSettingSourceEnabled(y)) continue;
      let m = strongestOverride_2(getSettingsForSource(y)?.skillOverrides, a);
      if (m !== undefined) return m;
    }
    return;
  }
  let t = (a) => (isSettingSourceEnabled(a) ? getSettingsForSource(a)?.skillOverrides : undefined);
  let o = (a) => ownLookup(t("projectSettings"), a) ?? ownLookup(t("userSettings"), a);
  let i = bareSkillName(e);
  let f = n ? undefined : ownLookup(getSettingsForSource("localSettings")?.skillOverrides, i);
  return o(e.name) ?? (i != null ? (f ?? o(i)) : undefined);
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
function claudeAiSkillDisplayName(e) {
  let n = syncedSkillUnqualifiedAlias(e);
  return n !== undefined && getCommandName(e) === n ? n : e.name;
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
    let O = foldName(unqualifiedName);
    let v = (g) => [g.name, getCommandName(g), ...(g.aliases ?? [])];
    let C = (g) => v(g).find((R) => foldName(R) === O);
    let holder = exactMatch ?? filtered.find((g) => C(g));
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
    let p = holder.type === "prompt" ? holder : undefined;
    let k = p?.skillRoot !== undefined ? "skill" : `command file ${printableText(holder.name)}.md`;
    let holderDescription;
    let userAdvice = "";
    let h = false;
    if (holder.kind === "workflow") holderDescription = "a workflow";
    else if (holder.loadedFrom === "plugin") holderDescription = "a command from a plugin";
    else
      switch (isBuiltinCommandSource(holder)) {
        case "user": {
          let g = p?.skillRoot !== undefined ? ` in ${printableText(tildify(p.skillRoot))}` : "";
          holderDescription = `your own ${k}${g}`;
          h = holder.loadedFrom === "skills";
          userAdvice = h
            ? " Rename it (folder and SKILL.md name) or delete it to use the claude.ai one."
            : " Rename or delete it to use the claude.ai one.";
          break;
        }
        case "project":
          holderDescription = `this project's ${k}`;
          break;
        case "managed":
          holderDescription = `a ${k} your organization manages`;
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
    let w = `/${printableText(C(holder) ?? holder.name)}`;
    let sentence =
      exactMatch !== undefined
        ? `/${bareName} runs ${holderDescription}${userAdvice ? `.${userAdvice}` : ", not your claude.ai skill."}`
        : `/${bareName} is too close to ${w}, ${holderDescription}${userAdvice ? `.${userAdvice}` : ", so your claude.ai skill can't use it."}`;
    conflicts.push({
      bare: bareName,
      sentence,
      held: true,
      userCanFree: userAdvice !== "",
      renameNeedsNameLine: h,
    });
  }
  if (conflicts.length === 0) return;
  if (conflicts.length === 1) return conflicts[0].sentence;
  let i = conflicts.every((conflict) => conflict.held)
    ? "are taken by other commands"
    : "are taken by other commands or unavailable in this session";
  let f = `${formatSlashList(conflicts)} ${i}, so they don't run your claude.ai skills.`;
  let filtered_2 = conflicts.filter((conflict) => conflict.userCanFree);
  if (filtered_2.length === 0) return f;
  let y = filtered_2.some((l) => l.renameNeedsNameLine) ? "Rename (folder and SKILL.md name)" : "Rename";
  let m = filtered_2.length === 1 ? "one" : "ones";
  return `${f} ${y} or delete your own ${formatSlashList(filtered_2)} to use the claude.ai ${m}.`;
}
//@ chunk-ygke3hz8.js:4103-4301 placement
function formatSlashList(e) {
  let mapped = e.map((t) => `/${t.bare}`);
  if (mapped.length === 1) return mapped[0];
  if (mapped.length <= 4) return `${mapped.slice(0, -1).join(", ")} and ${mapped.at(-1)}`;
  return `${mapped.slice(0, 3).join(", ")} and ${mapped.length - 3} more`;
}
//@ chunk-ygke3hz8.js:4301-4563 placement
/**
 * 列出可配置的技能并排序：按估算 token 降序（可选），否则按来源标签再按名字。
 */
function sortSkillsForListing(commands, { sortByTokens: n = false } = {}) {
  let filtered = commands.filter(isSkillCommand);
  if (n) {
    let o = new Map(filtered.map((i) => [i, estimateSkillListingTokens(i)]));
    return filtered.sort(
      (i, f) =>
        (o.get(f) ?? 0) - (o.get(i) ?? 0) ||
        claudeAiSkillDisplayName(i).localeCompare(claudeAiSkillDisplayName(f)),
    );
  }
  return filtered.sort(
    (o, i) =>
      getSkillSourceLabel(o).localeCompare(getSkillSourceLabel(i)) ||
      claudeAiSkillDisplayName(o).localeCompare(claudeAiSkillDisplayName(i)),
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
function buildSkillOverrideContext(e, localOverrides = localSkillOverrides()) {
  let t = new Map();
  let o = new Map();
  for (let i of e) {
    let lowerTierSkillOverride = getLowerTierSkillOverride(i);
    if (lowerTierSkillOverride) t.set(i.name, lowerTierSkillOverride);
    let lockedSkillOverride = getLockedSkillOverride(i);
    if (lockedSkillOverride) o.set(i, lockedSkillOverride);
  }
  return {
    localOverrides,
    lowerTier: t,
    locked: o,
  };
}
//@ chunk-ygke3hz8.js:4827-5019 placement
/**
 * 计算每个技能当前生效的覆盖值：锁定值 > 本地覆盖 > 低层设置 > on。
 */
function getEffectiveSkillStates(e, n) {
  let t = Object.create(null);
  for (let o of e) {
    if (Object.hasOwn(t, o.name)) continue;
    t[o.name] =
      n.locked.get(o)?.value ??
      commandBelongsToServer(o, n.localOverrides) ??
      n.lowerTier.get(o.name) ??
      "on";
  }
  return t;
}
//@ chunk-ygke3hz8.js:5019-6089 placement
/**
 * 计算要写入本地设置的技能覆盖差异：跳过锁定技能；MCP 技能处理别名键的迁移；同步技能处理裸名键；只在与低层值不同时写入。返回差异、写入数与生效值变化数。
 */
function diffSkillOverrides(commands, desired, context) {
  let { localOverrides, lowerTier, locked } = context;
  let a = new Set(Array.from(locked.keys(), (r) => r.name));
  let y = new Set(a);
  let diff = Object.create(null);
  let writes = 0;
  let effectiveChanged = 0;
  for (let command of commands) {
    if (y.has(command.name)) continue;
    y.add(command.name);
    let u = ownLookup(desired, command.name) ?? "on";
    let O = lowerTier.get(command.name) ?? "on";
    let v = commandBelongsToServer(command, localOverrides) ?? O;
    if (command.loadedFrom === "mcp") {
      if (u === v) continue;
      let p = false;
      let k = u === O ? undefined : u;
      if (k !== ownLookup(localOverrides, command.name) || Object.hasOwn(diff, command.name)) {
        diff[command.name] = k;
        p = true;
      }
      for (let c of qualifiedOverrideNames(command)) {
        if (ownLookup(localOverrides, c) === undefined) continue;
        for (let command_2 of commands) {
          if (
            command_2.name === command.name ||
            command_2.loadedFrom !== "mcp" ||
            !qualifiedOverrideNames(command_2).includes(c) ||
            Object.hasOwn(diff, command_2.name)
          )
            continue;
          let h = commandBelongsToServer(command_2, localOverrides);
          if (
            (a.has(command_2.name) ||
              (ownLookup(desired, command_2.name) ?? "on") ===
                (h ?? lowerTier.get(command_2.name) ?? "on")) &&
            h !== undefined
          )
            diff[command_2.name] = h;
        }
        diff[c] = undefined;
        p = true;
      }
      if (p) writes++;
      effectiveChanged++;
      continue;
    }
    let C = command.loadedFrom === "syncedSkills" ? bareSkillName(command) : undefined;
    if (C != null && ownLookup(localOverrides, C) !== undefined && u !== v) {
      let p =
        getLowerTierSkillOverride(command, {
          skipLocalBareKey: true,
        }) ?? "on";
      let k = u === p ? undefined : u;
      if (k !== ownLookup(localOverrides, command.name)) diff[command.name] = k;
      diff[C] = undefined;
      writes++;
      effectiveChanged++;
      continue;
    }
    if (command.loadedFrom === "syncedSkills" && u === v) continue;
    let d = u === O ? undefined : u;
    if (d !== ownLookup(localOverrides, command.name)) {
      diff[command.name] = d;
      writes++;
    }
    if (u !== v) effectiveChanged++;
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
