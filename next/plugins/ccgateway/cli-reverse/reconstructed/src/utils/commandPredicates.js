/**
 * utils/commandPredicates.ts
 *
 * 2.1.316 新增：命令判定谓词
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (65)
 * attribution: placement 65
 */
import { getOwn } from "./objectSafety.js";
import { getInitialSettings_2, getSettingsForSource } from "./settings/settings.js";
import { skillOverrides } from "./proactivity.js";
import { denyMatchNamesWithColon } from "../tools/SkillTool/skillToolNames.js";
import { SOURCES, isSettingSourceEnabled } from "./settings/constants.js";
import {
  stripSyncedSkillPrefix,
  pluginSkillAliases,
  hasSyncedSkillPrefix,
  withSyncedSkillPrefix,
  isSafeSkillName,
} from "../skills/syncedSkills.js";
import { areSkillsConvertedAsPlugins } from "./permissions/permissionRulePayload.js";
import { marketplaceSuffix } from "./plugins/pluginIdentifier.js";
import { SYNCED, ANTHROPIC_SKILLS_PLUGIN_ID } from "./telemetry/pluginTelemetry.js";
import { isBuiltinSkillGated, isSkillOutsideCorePolicy } from "../skills/bundledSkillsGate.js";
import { getDisableSlashCommands } from "../bootstrap/state.js";
import {
  isSkillOff,
  getCommandName as getCommandName_2,
  addCommandSpellings,
  filterCommandAliases,
} from "../commands.js";
import { uniqByExport } from "../../vendor/lodash-es/uniqBy.js";
import { HOST_SKILLS_MOUNT, PUBLIC } from "../skills/hostSkillMounts.js";
import { usesReservedSkillNamespace, reservedNamespaceOf } from "../skills/reservedSkillNames.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { foldName as foldName_2, MAX_FOLDABLE_NAME_LENGTH } from "./plugins/syncedItems.js";
import { logError } from "./log.js";
import { logForDebugging } from "./debug.js";
import { formatCommandDescription } from "../tools/SkillTool/prompt.js";
import { memorySkillCommands } from "../services/memorySync/memorySkills.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:950488-950584 placement
/**
 * skillOverrides 取值到严格程度的排序（on < name-only < user-invocable-only < off）。
 */
var SKILL_OVERRIDE_RANK = {
  on: 0,
  "name-only": 1,
  "user-invocable-only": 2,
  off: 3,
};
var POLICY_SETTING_SOURCES = ["policySettings", "flagSettings"];
//@ chunk-e6aww6q8.js:950584-950640 placement
/**
 * 安全地读取对象的自有属性（任一为空返回 undefined）。
 */
function ownLookup(object, key) {
  return object == null || key == null ? undefined : getOwn(object, key);
}
//@ chunk-e6aww6q8.js:950640-950679 placement
/**
 * 判断键名不是 __proto__。
 */
function isNotProtoKey(name) {
  return name !== "__proto__";
}
//@ chunk-e6aww6q8.js:950679-950795 placement
function skillOverrideFromSettings(names) {
  for (let overrides of [getInitialSettings_2().skillOverrides, skillOverrides()])
    for (let name of names) {
      let override = ownLookup(overrides, name);
      if (override !== undefined) return override;
    }
  return;
}
//@ chunk-e6aww6q8.js:950795-950908 placement
function skillOverrideFromAdminSources(names) {
  for (let name of names)
    for (let source of POLICY_SETTING_SOURCES) {
      let override = ownLookup(getSettingsForSource(source)?.skillOverrides, name);
      if (override !== undefined) return override;
    }
  return;
}
//@ chunk-e6aww6q8.js:950908-951043 placement
/**
 * 取技能的无前缀名（同步技能的裸名被保留时不可用）。
 */
function bareSkillName(name) {
  let unqualifiedName = name.unqualifiedName;
  if (unqualifiedName == null) return;
  if (name.loadedFrom !== "syncedSkills") return unqualifiedName;
  return name.bareNameReserved ? undefined : unqualifiedName;
}
//@ chunk-e6aww6q8.js:951043-951199 placement
function skillOverrideNames(cmd) {
  let reservedLabels = cmd.reservedLabels ?? [];
  return [
    ...(cmd.aliases ?? []),
    ...(cmd.unqualifiedName != null ? [cmd.unqualifiedName] : []),
    ...denyMatchNamesWithColon(cmd).filter((name) => !reservedLabels.includes(name)),
  ];
}
//@ chunk-e6aww6q8.js:951199-951288 placement
/**
 * 保留标签上的覆盖值（on 视为没有覆盖）。
 */
function reservedLabelOverride(skillOverrides, cmd) {
  let override = strongestOverride_2(skillOverrides, cmd.reservedLabels ?? []);
  return override === undefined || override === "on" ? undefined : override;
}
//@ chunk-e6aww6q8.js:951288-951353 placement
/**
 * 两个覆盖值里取更严格的一个。
 */
function strongestOverride(skillOverrides, names) {
  return skillOverrides === undefined
    ? names
    : names !== undefined && SKILL_OVERRIDE_RANK[names] > SKILL_OVERRIDE_RANK[skillOverrides]
      ? names
      : skillOverrides;
}
//@ chunk-e6aww6q8.js:951353-951461 placement
/**
 * 在多个名字的覆盖值中取级别最高的一个。
 */
function strongestOverride_2(skillOverrides, names) {
  let chosen;
  for (let name of names) {
    let override = ownLookup(skillOverrides, name);
    if (
      override !== undefined &&
      (chosen === undefined || SKILL_OVERRIDE_RANK[override] > SKILL_OVERRIDE_RANK[chosen])
    )
      chosen = override;
  }
  return chosen;
}
//@ chunk-e6aww6q8.js:951461-951601 placement
/**
 * 列出技能可被 skillOverrides 引用的名字：无前缀名，MCP 技能再加上未被保留的限定名。
 */
function qualifiedOverrideNames(cmd) {
  let bareName = bareSkillName(cmd);
  let reservedLabels = cmd.reservedLabels ?? [];
  return [
    ...(bareName != null ? [bareName] : []),
    ...(cmd.loadedFrom === "mcp"
      ? denyMatchNamesWithColon(cmd).filter((name) => !reservedLabels.includes(name))
      : []),
  ];
}
//@ chunk-e6aww6q8.js:951601-951879 placement
function mcpSkillOverride(cmd, names) {
  let lookupNames = [cmd.name, ...names];
  let override;
  let source;
  for (let sourceName of POLICY_SETTING_SOURCES) {
    let skillOverrides = getSettingsForSource(sourceName)?.skillOverrides;
    override = strongestOverride(override, strongestOverride_2(skillOverrides, lookupNames));
    source = strongestOverride(source, reservedLabelOverride(skillOverrides, cmd));
  }
  if (override !== undefined) return strongestOverride(override, source);
  for (let sourceName of SOURCES) {
    if (!isSettingSourceEnabled(sourceName)) continue;
    let candidate = strongestOverride_2(getSettingsForSource(sourceName)?.skillOverrides, lookupNames);
    if (candidate !== undefined) return strongestOverride(candidate, source);
  }
  return strongestOverride(strongestOverride_2(skillOverrides(), lookupNames), source);
}
//@ chunk-e6aww6q8.js:951879-951915 placement
/**
 * 用全部名称与来源解析某技能的覆盖状态。
 */
function resolveSkillOverrideAll(cmd) {
  return resolveSkillOverride(cmd, "all");
}
//@ chunk-e6aww6q8.js:951915-952243 placement
/**
 * 计算某个命令/技能的 skillOverrides 取值：MCP 技能按来源合并最强值；其他按名称与别名在各设置来源查找，取限制最强者。
 */
function resolveSkillOverride(cmd, scope) {
  let qualifiedNames = qualifiedOverrideNames(cmd);
  if (cmd.loadedFrom === "mcp") return mcpSkillOverride(cmd, qualifiedNames);
  let fromSettings = (scope === "all" ? skillOverrideFromSettings : skillOverrideFromAdminSources)([
    cmd.name,
    ...qualifiedNames,
  ]);
  let names = skillOverrideNames(cmd);
  if (!names.length) return fromSettings;
  for (let sourceName of POLICY_SETTING_SOURCES) {
    let skillOverrides = getSettingsForSource(sourceName)?.skillOverrides;
    if (ownLookup(skillOverrides, cmd.name) !== undefined) break;
    let override = strongestOverride_2(skillOverrides, names);
    if (
      override !== undefined &&
      (fromSettings === undefined || SKILL_OVERRIDE_RANK[override] > SKILL_OVERRIDE_RANK[fromSettings])
    )
      fromSettings = override;
    if (qualifiedNames.some((name) => ownLookup(skillOverrides, name) !== undefined)) break;
  }
  return fromSettings;
}
//@ chunk-e6aww6q8.js:952243-952533 placement
/**
 * 返回命令的 skillOverrides 取值及其设置来源；插件技能改按其同步技能别名（administrator 范围）取最强者。
 */
function skillOverrideWithSource(cmd) {
  if (cmd.source !== "plugin") return lookupSkillOverride(cmd, "all");
  let result;
  for (let alias of syncedSkillAliases(cmd)) {
    let bareName = stripSyncedSkillPrefix(alias);
    let lookup = {
      name: alias,
      unqualifiedName: bareName,
      loadedFrom: "syncedSkills",
      bareNameReserved: !(cmd.aliases ?? []).includes(bareName),
    };
    let skillOverride = lookupSkillOverride(lookup, "administrator");
    if (
      skillOverride !== undefined &&
      (result === undefined || SKILL_OVERRIDE_RANK[skillOverride.value] > SKILL_OVERRIDE_RANK[result.value])
    )
      result = skillOverride;
  }
  return result;
}
//@ chunk-e6aww6q8.js:952533-952731 placement
function syncedSkillAliases(cmd) {
  if (!areSkillsConvertedAsPlugins() && cmd.pluginInfo?.followsSyncedSkillState !== true) return [];
  let aliases = cmd.pluginInfo === undefined ? undefined : marketplaceSuffix(cmd.pluginInfo.repository);
  if (aliases !== undefined && aliases !== SYNCED) return [];
  return pluginSkillAliases(cmd).filter(hasSyncedSkillPrefix);
}
//@ chunk-e6aww6q8.js:952731-952930 placement
function syncedSkillOverride(cmd) {
  let followsSyncedState = cmd.pluginInfo?.followsSyncedSkillState === true;
  let override;
  for (let alias of syncedSkillAliases(cmd)) {
    let bareName = stripSyncedSkillPrefix(alias);
    let candidate = skillOverrideFromSettings(
      followsSyncedState || (cmd.aliases ?? []).includes(bareName) ? [alias, bareName] : [alias],
    );
    if (followsSyncedState || candidate === "user-invocable-only")
      override = strongestOverride(override, candidate);
  }
  return override;
}
//@ chunk-e6aww6q8.js:952930-953295 placement
/**
 * 按设置来源优先级查找技能的 skillOverrides 覆盖值：本地技能取第一个命中的来源；MCP 技能取各来源中级别最高的；结果可被特定规则再改写。
 */
function lookupSkillOverride(cmd, scope) {
  let names = skillOverrideNames(cmd);
  let chosen;
  for (let sourceName of POLICY_SETTING_SOURCES) {
    let skillOverrides = getSettingsForSource(sourceName)?.skillOverrides;
    let override =
      cmd.loadedFrom === "mcp"
        ? strongestOverride(
            strongestOverride_2(skillOverrides, [cmd.name, ...names]),
            reservedLabelOverride(skillOverrides, cmd),
          )
        : (ownLookup(skillOverrides, cmd.name) ??
          strongestOverride_2(skillOverrides, names) ??
          reservedLabelOverride(skillOverrides, cmd));
    if (override === undefined) continue;
    if (cmd.loadedFrom !== "mcp") {
      chosen = {
        value: override,
        source: sourceName,
      };
      break;
    }
    if (chosen === undefined || SKILL_OVERRIDE_RANK[override] > SKILL_OVERRIDE_RANK[chosen.value])
      chosen = {
        value: override,
        source: sourceName,
      };
  }
  return chosen === undefined
    ? undefined
    : {
        value: resolveSkillOverride(cmd, scope) ?? chosen.value,
        source: chosen.source,
      };
}
//@ chunk-e6aww6q8.js:953295-953332 placement
/**
 * OVERRIDABLE_LOCAL_COMMANDS：new Set(["auto-mode-setup"])：可用 skillOverrides 关掉的 local 命令。
 */
var OVERRIDABLE_LOCAL_COMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:953295", () => {
  OVERRIDABLE_LOCAL_COMMANDS = new Set(["auto-mode-setup"]);
});
//@ chunk-e6aww6q8.js:953332-953715 placement
/**
 * getSkillOverrideState：返回 on/off/user-invocable-only（skillOverrides、插件隐藏）。
 */
function getSkillOverrideState(cmd) {
  if (cmd.type === "prompt" && cmd.hiddenBehindPlugin !== undefined) return "off";
  if ((cmd.type === "local-jsx" || cmd.type === "local") && OVERRIDABLE_LOCAL_COMMANDS.has(cmd.name))
    return ownLookup(getInitialSettings_2().skillOverrides, cmd.name) === "off" ? "off" : "on";
  if (cmd.type !== "prompt") return "on";
  if (cmd.source === "plugin")
    return strongestOverride(skillOverrideWithSource(cmd)?.value, syncedSkillOverride(cmd)) ?? "on";
  let settings = getInitialSettings_2();
  let state = resolveSkillOverrideAll(cmd) ?? "on";
  if (isBuiltinSkillGated(cmd, settings)) return state === "off" ? "off" : "user-invocable-only";
  return state;
}
//@ chunk-e6aww6q8.js:953715-953787 placement
/**
 * isHiddenFromModel：override 为 user-invocable-only 或 off。
 */
function isHiddenFromModel(cmd) {
  let skillOverrideState = getSkillOverrideState(cmd);
  return skillOverrideState === "user-invocable-only" || skillOverrideState === "off";
}
//@ chunk-e6aww6q8.js:955649-955886 placement
/**
 * getCommandRequirements：{workspace, ink}：requires 字段或按类型默认（local 需工作区，local-jsx 需工作区+Ink）。
 */
function getCommandRequirements(cmd) {
  if (cmd.requires)
    return {
      workspace: cmd.requires.workspace ?? false,
      ink: cmd.requires.ink ?? false,
    };
  switch (cmd.type) {
    case "prompt":
      return {
        workspace: false,
        ink: false,
      };
    case "local":
      return {
        workspace: true,
        ink: false,
      };
    case "local-jsx":
      return {
        workspace: true,
        ink: true,
      };
  }
}
//@ chunk-e6aww6q8.js:955886-955957 placement
/**
 * isUsableWithoutWorkspace：不需要工作区或声明了 thinClientDispatch。
 */
function isUsableWithoutWorkspace(cmd) {
  return !getCommandRequirements(cmd).workspace || cmd.thinClientDispatch !== undefined;
}
//@ chunk-e6aww6q8.js:955957-956279 placement
/**
 * getThinClientDispatchMode：瘦客户端（远程查看端）对命令的派发方式：post-text/local/unavailable。
 */
function getThinClientDispatchMode(cmd, hasRpc) {
  if (cmd.type === "prompt") return "post-text";
  switch (cmd.thinClientDispatch) {
    case "post-text":
      return "post-text";
    case "control-request":
    case "local-then-rpc":
      return cmd.type === "local" && !hasRpc ? "unavailable" : "local";
    case "twin":
      return "post-text";
    case undefined:
      return cmd.type === "local-jsx" || !getCommandRequirements(cmd).workspace ? "local" : "post-text";
  }
}
//@ chunk-e6aww6q8.js:956279-956333 placement
/**
 * getNonInteractiveCommands：禁用斜杠命令时为空，否则过滤 supportsNonInteractive。
 */
function getNonInteractiveCommands(commands) {
  if (getDisableSlashCommands()) return [];
  return commands.filter(supportsNonInteractive);
}
//@ chunk-e6aww6q8.js:956333-956444 placement
/**
 * supportsNonInteractive：prompt 且未 disableNonInteractive，或 local 且 supportsNonInteractive。
 */
function supportsNonInteractive(cmd) {
  return (
    (cmd.type === "prompt" && !cmd.disableNonInteractive) ||
    (cmd.type === "local" && cmd.supportsNonInteractive)
  );
}
//@ chunk-e6aww6q8.js:956444-956496 placement
/**
 * 判断命令是否用户可调用且未被关闭。
 */
function isUserInvocableSkill(cmd) {
  return cmd.userInvocable !== false && !isSkillOff(cmd);
}
//@ chunk-e6aww6q8.js:956496-956544 placement = mergeClients (1)
function mergeClients(cmd) {
  return uniqByExport(cmd, "name").filter(isUserInvocableSkill);
}
//@ chunk-e6aww6q8.js:956544-956633 placement
/**
 * isFallbackSkill：prompt 且 fallback=true 且非 syncedSkills。
 */
function isFallbackSkill(cmd) {
  return cmd.type === "prompt" && cmd.fallback === true && cmd.loadedFrom !== "syncedSkills";
}
//@ chunk-e6aww6q8.js:956633-956657 placement
/**
 * 宿主技能公开目录的路径。
 */
var HOST_SKILLS_PUBLIC_DIR = `${HOST_SKILLS_MOUNT}/${PUBLIC}`;
//@ chunk-e6aww6q8.js:956657-956707 placement
/**
 * 构造宿主技能目录与技能集合。
 */
function hostSkillsEntry(skills) {
  return {
    dir: HOST_SKILLS_PUBLIC_DIR,
    skills: new Set(skills),
  };
}
//@ chunk-e6aww6q8.js:956707-956771 placement
/**
 * isHostCatalogSkill：prompt 且 fromHostCatalog=true。
 */
function isHostCatalogSkill(cmd) {
  return cmd.type === "prompt" && cmd.fromHostCatalog === true;
}
//@ chunk-e6aww6q8.js:956771-956831 placement
/**
 * isSyncedSkill：loadedFrom=syncedSkills 且非宿主目录技能。
 */
function isSyncedSkill(cmd) {
  return cmd.loadedFrom === "syncedSkills" && !isHostCatalogSkill(cmd);
}
//@ chunk-e6aww6q8.js:956831-956875 placement
/**
 * isKilledHostCatalogSkill：宿主目录技能且被内建技能开关关掉。
 */
function isKilledHostCatalogSkill(cmd) {
  return isHostCatalogSkill(cmd) && isSkillOutsideCorePolicy(stripSyncedSkillPrefix(cmd.name));
}
//@ chunk-e6aww6q8.js:958749-958820 placement
/**
 * 判断插件信息是否来自账号技能包装插件。
 */
function isAccountSkillsWrapperPlugin(pluginInfo) {
  return pluginInfo.repository === ANTHROPIC_SKILLS_PLUGIN_ID && pluginInfo.accountSkillsWrapper === true;
}
//@ chunk-e6aww6q8.js:958820-958965 placement = getCommandId (0.769)
function getCommandId(cmd) {
  return (
    cmd.type === "prompt" &&
    cmd.source === "plugin" &&
    cmd.pluginInfo !== undefined &&
    isAccountSkillsWrapperPlugin(cmd.pluginInfo) &&
    cmd.pluginInfo.hostNamedSkillsFolder === true
  );
}
//@ chunk-e6aww6q8.js:958965-959100 placement
/**
 * 判断命令是否为同步技能或受管插件提供的技能。
 */
function isSyncedOrManagedSkill(cmd) {
  return (
    cmd.loadedFrom === "syncedSkills" ||
    (cmd.type === "prompt" &&
      cmd.source === "plugin" &&
      cmd.pluginInfo !== undefined &&
      isAccountSkillsWrapperPlugin(cmd.pluginInfo))
  );
}
//@ chunk-e6aww6q8.js:959100-959195 placement
/**
 * 判断命令名是否被同步/受管技能或保留名覆盖。
 */
function isShadowedSkillName(name) {
  if (isSyncedOrManagedSkill(name)) return false;
  if (usesReservedSkillNamespace(name.name)) return true;
  let commandName = getCommandName_2(name);
  return commandName !== name.name && usesReservedSkillNamespace(commandName);
}
//@ chunk-e6aww6q8.js:959195-959224 placement
var TENGU_PLAID_HARBOR = "tengu_plaid_harbor";
//@ chunk-e6aww6q8.js:959224-959261 placement
/**
 * 读取 tengu_plaid_harbor 开关（默认开，服务端明确关闭才关）。
 */
function isPlaidHarborOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_PLAID_HARBOR, true) !== false;
}
//@ chunk-e6aww6q8.js:959261-959430 placement
/**
 * 隐藏被同步/受管技能同名覆盖的命令，以及名字被保留的命令。
 */
function hideShadowedCommands(commands, commands_2) {
  let managedNames = new Set(commands_2.filter(isSyncedOrManagedSkill).map((cmd) => foldName_2(cmd.name)));
  return commands.filter(
    (cmd) =>
      isSyncedOrManagedSkill(cmd) ||
      !(
        managedNames.has(foldName_2(cmd.name)) ||
        [cmd.name, getCommandName_2(cmd)].some(
          (cmd) => reservedNamespaceOf(cmd) === undefined && usesReservedSkillNamespace(cmd),
        )
      ),
  );
}
//@ chunk-e6aww6q8.js:959509-959638 placement
/**
 * 有同步技能时，去掉与非同步命令名冲突的同步技能。
 */
function dropSyncedNameClashes(commands, syncedNames) {
  if (syncedNames.length === 0 || !commands.some((cmd) => cmd.loadedFrom === "syncedSkills"))
    return [...commands];
  let dropped = new Set();
  addNonSyncedSpellings(dropped, syncedNames);
  return admitSyncedSkills(commands, dropped);
}
//@ chunk-e6aww6q8.js:959841-959917 placement
/**
 * addNameAndAliases：规范化 name 与 aliases 加入集合。
 */
function addNameAndAliases(reserved, cmd) {
  reserved.add(foldName_2(cmd.name));
  for (let alias of cmd.aliases ?? []) reserved.add(foldName_2(alias));
}
//@ chunk-e6aww6q8.js:959917-959990 placement
/**
 * addNonSyncedSpellings：对非 syncedSkills 命令调用 addCommandSpellings。
 */
function addNonSyncedSpellings(reserved, reserved_2) {
  for (let cmd of reserved_2) if (cmd.loadedFrom !== "syncedSkills") addCommandSpellings(reserved, cmd);
}
//@ chunk-e6aww6q8.js:959990-960077 placement
/**
 * isSyncedSkillNameTaken：同步技能名为空或已被占用。
 */
function isSyncedSkillNameTaken(cmd, reserved) {
  return (
    foldName_2(stripSyncedSkillPrefix(cmd.name)) === "" ||
    reserved.has(foldName_2(cmd.name)) ||
    reserved.has(foldName_2(withSyncedSkillPrefix(getCommandName_2(cmd))))
  );
}
//@ chunk-e6aww6q8.js:960077-960089 placement
/**
 * MCP 命令名、展示名或别名的最大长度。
 */
var MAX_MCP_NAME_CHARS; // deferred: uses PRINTABLE_NAME_RE (./plugins/syncedItems.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:960077", () => {
  MAX_MCP_NAME_CHARS = MAX_FOLDABLE_NAME_LENGTH;
});
//@ chunk-e6aww6q8.js:960089-960816 placement
function checkCommandListable(commands, onRefused) {
  let listed = [];
  for (let cmd of commands) {
    let displayName = getCommandName_2(cmd);
    if (typeof cmd.name !== "string" || typeof displayName !== "string") {
      let mapped = [cmd.name, displayName].map((name) => (Array.isArray(name) ? "array" : typeof name));
      let mapped_2 = [cmd.type, cmd.type === "prompt" ? cmd.source : undefined, cmd.loadedFrom, cmd.kind].map(
        (name) => (typeof name === "string" && /^[\w-]{1,24}$/.test(name) ? name : typeof name),
      );
      logError(
        Error(
          `Command not listed: its name or display name is not a string. Types of its name and display name: ${mapped.join(", ")}. Its command type, source, loadedFrom and kind: ${mapped_2.join(", ")}`,
        ),
      );
      continue;
    }
    if (
      cmd.isMcp === true &&
      [cmd.name, displayName, ...(cmd.aliases ?? [])].some((name) => name.length > MAX_MCP_NAME_CHARS)
    ) {
      logForDebugging(
        `MCP command not listed: its name, display name or an alias has over ${MAX_MCP_NAME_CHARS} characters`,
      );
      continue;
    }
    if (formatCommandDescription(cmd)) {
      onRefused(cmd);
      continue;
    }
    listed.push(isSyncedOrManagedSkill(cmd) ? cmd : dropReservedAliases(cmd, usesReservedSkillNamespace));
  }
  return listed;
}
//@ chunk-e6aww6q8.js:960816-960963 placement
/**
 * 去掉命令中被判定为保留的别名（全部去掉时 aliases 为 undefined）。
 */
function dropReservedAliases(cmd, isReserved) {
  let aliases = cmd.aliases;
  if (!aliases) return cmd;
  let kept = aliases.filter((alias) => !isReserved(alias));
  if (kept.length === aliases.length) return cmd;
  return {
    ...cmd,
    aliases: kept.length ? kept : undefined,
  };
}
//@ chunk-e6aww6q8.js:960963-961037 placement = getMcpPrefix (1)
function isQualifiedToolReference(name, serverName) {
  return name.includes(":") || name.startsWith("mcp__") || serverName.has(name);
}
//@ chunk-e6aww6q8.js:961037-961073 placement
/**
 * 准入某命令的全部别名。
 */
function admitAllAliases(cmd) {
  return filterCommandAliases(cmd, () => true);
}
//@ chunk-e6aww6q8.js:961073-961188 placement
/**
 * 准入一个同步技能：名字已被占用返回 null，否则去掉与已有工具引用冲突的别名。
 */
function admitSyncedSkill(cmd, reserved) {
  if (cmd.loadedFrom !== "syncedSkills") return cmd;
  if (isSyncedSkillNameTaken(cmd, reserved)) return null;
  return filterCommandAliases(cmd, (alias) => isQualifiedToolReference(foldName_2(alias), reserved));
}
//@ chunk-e6aww6q8.js:961361-961529 placement
/**
 * syncedSkills 来源的 prompt 命令，若 unqualifiedName 在 aliases 中则返回它，否则 undefined。
 */
function getSyncedSkillUnqualifiedAlias(cmd) {
  return cmd.type === "prompt" &&
    cmd.loadedFrom === "syncedSkills" &&
    cmd.unqualifiedName != null &&
    (cmd.aliases?.includes(cmd.unqualifiedName) ?? false)
    ? cmd.unqualifiedName
    : undefined;
}
//@ chunk-e6aww6q8.js:961529-961593 placement
/**
 * 同步技能的安全未限定别名（不安全时 undefined）。
 */
function syncedSkillUnqualifiedAlias(cmd) {
  let syncedSkillUnqualifiedAlias = getSyncedSkillUnqualifiedAlias(cmd);
  return syncedSkillUnqualifiedAlias !== undefined && isSafeSkillName(syncedSkillUnqualifiedAlias)
    ? syncedSkillUnqualifiedAlias
    : undefined;
}
//@ chunk-e6aww6q8.js:961593-961742 placement
/**
 * 逐个准入命令中的同步技能，被拒的回调通知，已准入的名字与别名加入占用集合。
 */
function admitSyncedSkills(commands, reserved, blockedAliases) {
  let admitted = [];
  for (let cmd of commands) {
    let filtered = admitSyncedSkill(cmd, reserved);
    if (filtered === null) {
      blockedAliases?.(cmd);
      continue;
    }
    if (filtered.loadedFrom === "syncedSkills") addNameAndAliases(reserved, filtered);
    admitted.push(filtered);
  }
  return admitted;
}
//@ chunk-e6aww6q8.js:961742-961865 placement
/**
 * 隐藏与同步技能同名的宿主目录技能。
 */
function hideDuplicateCatalogSkills(commands, syncedCommands) {
  let syncedNames = new Set();
  for (let cmd of syncedCommands) if (isSyncedSkill(cmd)) syncedNames.add(foldName_2(cmd.name));
  return commands.filter((cmd) => !isHostCatalogSkill(cmd) || !syncedNames.has(foldName_2(cmd.name)));
}
//@ chunk-e6aww6q8.js:961865-961959 placement = filterMcpPromptsByServer (0.897)
function filterMcpPromptCommands(commands) {
  return commands.filter(
    (command) => command.type === "prompt" && (command.loadedFrom === "mcp" || command.isMcp === true),
  );
}
//@ chunk-e6aww6q8.js:961959-962001 placement
/**
 * MCP 提示命令加上保留命令。
 */
function mcpPromptCommandsWithReserved(commands) {
  return [...filterMcpPromptCommands(commands), ...memorySkillCommands()];
}
//@ chunk-e6aww6q8.js:962001-962038 placement
/**
 * 去掉与同步技能重名的命令。
 */
function dropSyncedClashes(commands, syncedNames) {
  return dropSyncedNameClashes(commands, mcpPromptCommandsWithReserved(syncedNames));
}
//@ chunk-e6aww6q8.js:962038-962118 placement
/**
 * 通知安装向导已粘贴（当前无实现，返回已解决的 Promise）。
 */
function notifySetupGuidePasted(...args) {
  return null?.notifySetupGuidePasted(...args) ?? Promise.resolve();
}
//@ chunk-e6aww6q8.js:962118-962198 placement
/**
 * 通知安装向导已加载（当前无实现）。
 */
function notifySetupGuideLoaded(...args) {
  return null?.notifySetupGuideLoaded(...args) ?? Promise.resolve();
}
//@ chunk-e6aww6q8.js:962198-962283 placement
/**
 * 拉取关联的安装向导（当前无实现）。
 */
function fetchLinkedSetupGuide(...args) {
  return null?.fetchLinkedSetupGuide(...args) ?? Promise.resolve(undefined);
}
//@ chunk-e6aww6q8.js:962283-962336 placement
/**
 * 返回已加载安装向导的提示（当前无实现）。
 */
function loadedSetupGuideNotice() {
  return null?.loadedSetupGuideNotice();
}
//@ chunk-e6aww6q8.js:962336-962390 placement
/**
 * 判断输入是否为安装向导粘贴（当前无实现，恒 false）。
 */
function isSetupGuidePaste(text) {
  return null?.isSetupGuidePaste(text) ?? false;
}
//@ chunk-e6aww6q8.js:962390-962443 placement
/**
 * 判断输入是否为安装向导链接（当前无实现，恒 false）。
 */
function isSetupGuideLink(text) {
  return null?.isSetupGuideLink(text) ?? false;
}
//@ chunk-e6aww6q8.js:962443-962504 placement
/**
 * 返回安装向导 chip 的高亮列表（当前无实现，空数组）。
 */
function setupGuideChipHighlights(displayedValue) {
  return null?.setupGuideChipHighlights(displayedValue) ?? [];
}
export {
  isNotProtoKey,
  dropSyncedClashes,
  isKilledHostCatalogSkill,
  isSyncedSkill,
  isHostCatalogSkill,
  dropSyncedNameClashes,
  getNonInteractiveCommands,
  setupGuideChipHighlights,
  isSetupGuideLink,
  isSetupGuidePaste,
  getThinClientDispatchMode,
  syncedSkillUnqualifiedAlias,
  checkCommandListable,
  mergeClients,
  getCommandRequirements,
  isHiddenFromModel,
  notifySetupGuideLoaded,
  fetchLinkedSetupGuide,
  loadedSetupGuideNotice,
  notifySetupGuidePasted,
  ownLookup,
  skillOverrideWithSource,
  bareSkillName,
  isFallbackSkill,
  filterMcpPromptCommands,
  isShadowedSkillName,
  isUserInvocableSkill,
  isSyncedOrManagedSkill,
  isPlaidHarborOn,
  mcpPromptCommandsWithReserved,
  getSkillOverrideState,
  dropReservedAliases,
  getSyncedSkillUnqualifiedAlias,
  isUsableWithoutWorkspace,
  isQualifiedToolReference,
  addNonSyncedSpellings,
  admitSyncedSkills,
  admitAllAliases,
  hideDuplicateCatalogSkills,
  admitSyncedSkill,
  addNameAndAliases,
  supportsNonInteractive,
  getCommandId,
  hideShadowedCommands,
  hostSkillsEntry,
  resolveSkillOverrideAll,
  qualifiedOverrideNames,
  strongestOverride_2,
};
