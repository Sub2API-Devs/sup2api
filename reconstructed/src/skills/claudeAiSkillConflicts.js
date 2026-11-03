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
  DCe,
  qualifiedOverrideNames,
  strongestOverride,
  BC,
  bareSkillName,
  Cfn,
  getSyncedSkillUnqualifiedAlias,
} from "../utils/commandPredicates.js";
import { isSettingSourceEnabled, getSettingSourceName } from "../utils/settings/constants.js";
import { getSettingsForSource } from "../utils/settings/settings.js";
import { i3 } from "../utils/permissions/permissionRulePayload.js";
import { CLAUDE_AI_SYNC_LABEL, isBuiltinCommandSource } from "../utils/settings/commandSyncNames.js";
import { getCommandName, findCommand } from "../commands.js";
import { wh } from "../utils/stringUtils.js";
import { foldName } from "../utils/plugins/syncedItems.js";
import { tildify } from "../utils/path.js";
import { isSkillCommand } from "../components/skills/SkillsMenu.js";
import { estimateSkillListingTokens } from "./loadSkillsDir.js";

/**
 * 判断技能覆盖状态是否被锁定及来源：策略/flag 设置、保留名（不可调用模型）、作者声明仅用户可调用、插件；无锁定返回 undefined。
 */
//@ chunk-ygke3hz8.js:796-1212 placement
function getLockedSkillOverride(e) {
  let n = skillOverrideWithSource(e);
  if (n) {
    let t = e.source === "plugin" ? getSkillOverrideState(e) : n.value;
    return { value: t, source: t !== n.value ? "plugin" : n.source === "policySettings" ? "policy" : "flag" };
  }
  if (!DCe(e.name))
    return { value: e.disableModelInvocation ? "user-invocable-only" : "on", source: "reserved-name" };
  if (e.disableModelInvocation) return { value: "user-invocable-only", source: "author" };
  if (e.source === "plugin") return { value: getSkillOverrideState(e), source: "plugin" };
  return;
}
/**
 * 从项目/用户（MCP 技能还看别名；同步技能还看本地设置的裸名）设置的 skillOverrides 里读取某技能的覆盖值。
 */
//@ chunk-ygke3hz8.js:1212-1645 placement
function getLowerTierSkillOverride(e, { skipLocalBareKey: n = !1 } = {}) {
  if (e.loadedFrom === "mcp") {
    let a = [e.name, ...qualifiedOverrideNames(e)];
    for (let y of ["projectSettings", "userSettings"]) {
      if (!isSettingSourceEnabled(y)) continue;
      let m = strongestOverride(getSettingsForSource(y)?.skillOverrides, a);
      if (m !== void 0) return m;
    }
    return;
  }
  let t = (a) => (isSettingSourceEnabled(a) ? getSettingsForSource(a)?.skillOverrides : void 0),
    o = (a) => BC(t("projectSettings"), a) ?? BC(t("userSettings"), a),
    i = bareSkillName(e),
    f = n ? void 0 : BC(getSettingsForSource("localSettings")?.skillOverrides, i);
  return o(e.name) ?? (i != null ? (f ?? o(i)) : void 0);
}
//@ chunk-ygke3hz8.js:1645-1728 placement = filterMcpPromptsByServer (0.787)
function commandBelongsToServer(commands, serverName) {
  return commands.loadedFrom === "mcp"
    ? strongestOverride(serverName, [commands.name, ...qualifiedOverrideNames(commands)])
    : BC(serverName, commands.name);
}
/**
 * 技能来源的显示标签：claude.ai 同步、mcp、plugin、memory store、built-in，或设置来源名。
 */
//@ chunk-ygke3hz8.js:1728-1978 placement
function getSkillSourceLabel({ source: source, loadedFrom: loadedFrom, pluginInfo: pluginInfo }) {
  if (loadedFrom === "syncedSkills" || i3(pluginInfo?.repository)) return CLAUDE_AI_SYNC_LABEL;
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
function DJe(e) {
  let n = Cfn(e);
  return n !== void 0 && getCommandName(e) === n ? n : e.name;
}
/**
 * 说明哪些 claude.ai 同步技能的 /名字 在本会话被其他命令占用或不可用：单条时给出具体原因（被自己的技能/项目/组织/插件/内置命令占用，或名字太相近），多条时汇总并建议重命名或删除用户自己的同名技能。
 */
//@ chunk-ygke3hz8.js:2045-4103 placement
function describeSyncedSkillConflicts(commands, allCommands) {
  let filtered = allCommands.filter((l) => l.loadedFrom !== "syncedSkills"),
    conflicts = [];
  for (let l of commands) {
    let unqualifiedName = l.unqualifiedName;
    if (
      l.loadedFrom !== "syncedSkills" ||
      unqualifiedName === void 0 ||
      getSyncedSkillUnqualifiedAlias(l) !== void 0
    )
      continue;
    let bareName = wh(unqualifiedName),
      exactMatch = findCommand(unqualifiedName, filtered),
      O = foldName(unqualifiedName),
      v = (g) => [g.name, getCommandName(g), ...(g.aliases ?? [])],
      C = (g) => v(g).find((R) => foldName(R) === O),
      holder = exactMatch ?? filtered.find((g) => C(g));
    if (!holder) {
      conflicts.push({
        bare: bareName,
        sentence: `Your claude.ai skill can't use /${bareName} in this session.`,
        held: !1,
        userCanFree: !1,
        renameNeedsNameLine: !1,
      });
      continue;
    }
    let p = holder.type === "prompt" ? holder : void 0,
      k = p?.skillRoot !== void 0 ? "skill" : `command file ${wh(holder.name)}.md`,
      holderDescription,
      userAdvice = "",
      h = !1;
    if (holder.kind === "workflow") holderDescription = "a workflow";
    else if (holder.loadedFrom === "plugin") holderDescription = "a command from a plugin";
    else
      switch (isBuiltinCommandSource(holder)) {
        case "user": {
          let g = p?.skillRoot !== void 0 ? ` in ${wh(tildify(p.skillRoot))}` : "";
          ((holderDescription = `your own ${k}${g}`),
            (h = holder.loadedFrom === "skills"),
            (userAdvice = h
              ? " Rename it (folder and SKILL.md name) or delete it to use the claude.ai one."
              : " Rename or delete it to use the claude.ai one."));
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
    let w = `/${wh(C(holder) ?? holder.name)}`,
      N =
        exactMatch !== void 0
          ? `/${bareName} runs ${holderDescription}${userAdvice ? `.${userAdvice}` : ", not your claude.ai skill."}`
          : `/${bareName} is too close to ${w}, ${holderDescription}${userAdvice ? `.${userAdvice}` : ", so your claude.ai skill can't use it."}`;
    conflicts.push({
      bare: bareName,
      sentence: N,
      held: !0,
      userCanFree: userAdvice !== "",
      renameNeedsNameLine: h,
    });
  }
  if (conflicts.length === 0) return;
  if (conflicts.length === 1) return conflicts[0].sentence;
  let i = conflicts.every((l) => l.held)
      ? "are taken by other commands"
      : "are taken by other commands or unavailable in this session",
    f = `${formatSlashList(conflicts)} ${i}, so they don't run your claude.ai skills.`,
    filtered_2 = conflicts.filter((l) => l.userCanFree);
  if (filtered_2.length === 0) return f;
  let y = filtered_2.some((l) => l.renameNeedsNameLine) ? "Rename (folder and SKILL.md name)" : "Rename",
    m = filtered_2.length === 1 ? "one" : "ones";
  return `${f} ${y} or delete your own ${formatSlashList(filtered_2)} to use the claude.ai ${m}.`;
}
//@ chunk-ygke3hz8.js:4103-4301 placement
function formatSlashList(e) {
  let mapped = e.map((t) => `/${t.bare}`);
  if (mapped.length === 1) return mapped[0];
  if (mapped.length <= 4) return `${mapped.slice(0, -1).join(", ")} and ${mapped.at(-1)}`;
  return `${mapped.slice(0, 3).join(", ")} and ${mapped.length - 3} more`;
}
/**
 * 列出可配置的技能并排序：按估算 token 降序（可选），否则按来源标签再按名字。
 */
//@ chunk-ygke3hz8.js:4301-4563 placement
function sortSkillsForListing(e, { sortByTokens: n = !1 } = {}) {
  let filtered = e.filter(isSkillCommand);
  if (n) {
    let o = new Map(filtered.map((i) => [i, estimateSkillListingTokens(i)]));
    return filtered.sort((i, f) => (o.get(f) ?? 0) - (o.get(i) ?? 0) || DJe(i).localeCompare(DJe(f)));
  }
  return filtered.sort(
    (o, i) => getSkillSourceLabel(o).localeCompare(getSkillSourceLabel(i)) || DJe(o).localeCompare(DJe(i)),
  );
}
//@ chunk-ygke3hz8.js:4563-4656 placement
function rxr() {
  return Object.assign(Object.create(null), getSettingsForSource("localSettings")?.skillOverrides);
}
/**
 * 构建技能覆盖判断的上下文：本地覆盖、较低层级的同名技能与被锁定的技能。
 */
//@ chunk-ygke3hz8.js:4656-4827 placement
function buildSkillOverrideContext(e, n = rxr()) {
  let t = new Map(),
    o = new Map();
  for (let i of e) {
    let f = getLowerTierSkillOverride(i);
    if (f) t.set(i.name, f);
    let a = getLockedSkillOverride(i);
    if (a) o.set(i, a);
  }
  return { localOverrides: n, lowerTier: t, locked: o };
}
/**
 * 计算每个技能当前生效的覆盖值：锁定值 > 本地覆盖 > 低层设置 > on。
 */
//@ chunk-ygke3hz8.js:4827-5019 placement
function getEffectiveSkillStates(e, n) {
  let create = Object.create(null);
  for (let o of e) {
    if (Object.hasOwn(create, o.name)) continue;
    create[o.name] =
      n.locked.get(o)?.value ??
      commandBelongsToServer(o, n.localOverrides) ??
      n.lowerTier.get(o.name) ??
      "on";
  }
  return create;
}
/**
 * 计算要写入本地设置的技能覆盖差异：跳过锁定技能；MCP 技能处理别名键的迁移；同步技能处理裸名键；只在与低层值不同时写入。返回差异、写入数与生效值变化数。
 */
//@ chunk-ygke3hz8.js:5019-6089 placement
function diffSkillOverrides(commands, desired, context) {
  let { localOverrides: localOverrides, lowerTier: lowerTier, locked: locked } = context,
    a = new Set(Array.from(locked.keys(), (r) => r.name)),
    y = new Set(a),
    diff = Object.create(null),
    writes = 0,
    effectiveChanged = 0;
  for (let r of commands) {
    if (y.has(r.name)) continue;
    y.add(r.name);
    let u = BC(desired, r.name) ?? "on",
      O = lowerTier.get(r.name) ?? "on",
      v = commandBelongsToServer(r, localOverrides) ?? O;
    if (r.loadedFrom === "mcp") {
      if (u === v) continue;
      let p = !1,
        k = u === O ? void 0 : u;
      if (k !== BC(localOverrides, r.name) || Object.hasOwn(diff, r.name)) ((diff[r.name] = k), (p = !0));
      for (let c of qualifiedOverrideNames(r)) {
        if (BC(localOverrides, c) === void 0) continue;
        for (let s of commands) {
          if (
            s.name === r.name ||
            s.loadedFrom !== "mcp" ||
            !qualifiedOverrideNames(s).includes(c) ||
            Object.hasOwn(diff, s.name)
          )
            continue;
          let h = commandBelongsToServer(s, localOverrides);
          if (
            (a.has(s.name) || (BC(desired, s.name) ?? "on") === (h ?? lowerTier.get(s.name) ?? "on")) &&
            h !== void 0
          )
            diff[s.name] = h;
        }
        ((diff[c] = void 0), (p = !0));
      }
      if (p) writes++;
      effectiveChanged++;
      continue;
    }
    let C = r.loadedFrom === "syncedSkills" ? bareSkillName(r) : void 0;
    if (C != null && BC(localOverrides, C) !== void 0 && u !== v) {
      let p = getLowerTierSkillOverride(r, { skipLocalBareKey: !0 }) ?? "on",
        k = u === p ? void 0 : u;
      if (k !== BC(localOverrides, r.name)) diff[r.name] = k;
      ((diff[C] = void 0), writes++, effectiveChanged++);
      continue;
    }
    if (r.loadedFrom === "syncedSkills" && u === v) continue;
    let d = u === O ? void 0 : u;
    if (d !== BC(localOverrides, r.name)) ((diff[r.name] = d), writes++);
    if (u !== v) effectiveChanged++;
  }
  return { diff: diff, writes: writes, effectiveChanged: effectiveChanged };
}

export {
  sortSkillsForListing,
  describeSyncedSkillConflicts,
  rxr,
  buildSkillOverrideContext,
  getEffectiveSkillStates,
  DJe,
  getSkillSourceLabel,
  diffSkillOverrides,
  getLockedSkillOverride,
};
