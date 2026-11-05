/**
 * skills/syncedSkills.ts
 *
 * 2.1.316 新增：外部技能名到内置插件名的映射；同步技能的别名列表等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z20c443b.js (21)
 * attribution: placement 21
 */
//@ chunk-z20c443b.js:11606-11658 placement
/**
 * 同步技能命名前缀 anthropic-skills。
 */
var SYNCED_SKILL_PREFIXES = ["anthropic-skills"];
var ANTHROPIC_SKILLS = "anthropic-skills";
//@ chunk-z20c443b.js:11658-11741 placement
/**
 * 加 anthropic-skills: 前缀。
 */
function withSyncedSkillPrefix(name) {
  return name.startsWith("anthropic-skills:") ? name : `anthropic-skills:${name}`;
}
//@ chunk-z20c443b.js:11741-11801 placement
/**
 * 是否有同步技能前缀。
 */
function hasSyncedSkillPrefix(name) {
  return SYNCED_SKILL_PREFIXES.some((prefix) => name.startsWith(`${prefix}:`));
}
//@ chunk-z20c443b.js:11801-11851 placement
/**
 * 名字是否只含安全字符。
 */
function isSafeSkillName(name) {
  return /^[A-Za-z0-9._-]+$/.test(name);
}
//@ chunk-z20c443b.js:11851-11915 placement
/**
 * 是否为合法技能目录名。
 */
function isValidSkillDirName(dirName) {
  return dirName.length <= 255 && isSafeSkillName(dirName) && dirName !== "." && dirName !== "..";
}
//@ chunk-z20c443b.js:11915-11985 placement
/**
 * 去掉 anthropic-skills: 前缀。
 */
function stripSyncedSkillPrefix(name) {
  return name.startsWith("anthropic-skills:") ? name.slice(17) : name;
}
//@ chunk-z20c443b.js:11985-12036 placement
/**
 * 取技能的对外显示名，没有则用原名。
 */
function displayNameOf(command) {
  return command.userFacingName?.() ?? command.name;
}
//@ chunk-z20c443b.js:12036-12364 placement
/**
 * 插件技能的别名列表。
 */
function pluginSkillAliases(command) {
  if (command.loadedFrom !== "plugin") return [];
  let duplicatedName = getDuplicatedSkillName(command.name) ?? getDuplicatedSkillName(displayNameOf(command));
  if (duplicatedName === undefined) return [];
  let sliced = command.name.slice(command.name.indexOf(":") + 1);
  return [
    toSyncedSkillAlias(`${duplicatedName}:${duplicatedName}`),
    duplicatedName,
    ...[...(command.aliases ?? []), ...(command.shedAliases ?? [])]
      .filter((alias) => alias !== duplicatedName)
      .map((alias) => `anthropic-skills:${alias}`),
    ...(sliced !== duplicatedName && !sliced.includes(":") ? [`anthropic-skills:${sliced}`, sliced] : []),
  ];
}
//@ chunk-z20c443b.js:12364-12490 placement
function getDuplicatedSkillName(name) {
  let index = name.indexOf(":");
  if (index <= 0) return;
  let sliced = name.slice(0, index);
  let sliced_2 = name.slice(index + 1);
  return sliced_2 === sliced && !SYNCED_SKILL_PREFIXES.includes(sliced) ? sliced_2 : undefined;
}
//@ chunk-z20c443b.js:12490-12672 placement
function toSyncedSkillAlias(name) {
  let duplicatedSkillName = getDuplicatedSkillName(name);
  if (duplicatedSkillName !== undefined) return `anthropic-skills:${duplicatedSkillName}`;
  if (!name.startsWith("anthropic-skills:")) return;
  let sliced = name.slice(17);
  return sliced && !sliced.includes(":") ? `${sliced}:${sliced}` : undefined;
}
//@ chunk-z20c443b.js:12672-13004 placement
/**
 * 同步技能的别名列表。
 */
function syncedSkillAliases(command) {
  if (
    (command.loadedFrom !== "syncedSkills" && command.loadedFrom !== "plugin") ||
    !command.name.startsWith("anthropic-skills:")
  )
    return [];
  let sliced = command.name.slice(17);
  let displayName = displayNameOf(command);
  let bareDisplayName = displayName.startsWith("anthropic-skills:") ? displayName.slice(17) : undefined;
  if (!sliced || sliced.includes(":")) return [];
  return [
    toSyncedSkillAlias(command.name),
    ...(bareDisplayName !== undefined && bareDisplayName !== sliced && !bareDisplayName.includes(":")
      ? [`${bareDisplayName}:${bareDisplayName}`, `${bareDisplayName}:${sliced}`, bareDisplayName]
      : []),
  ];
}
//@ chunk-z20c443b.js:13004-13463 placement
/**
 * 外部技能名到内置插件名的映射。
 */
var EXTERNAL_PLUGIN_SKILL_MAP = new Map();
var externalPluginSkillMap = () => {
  let map =
    EXTERNAL_PLUGIN_SKILL_MAP.get("external") ??
    new Map([
      ["responsive-mode", "cc-plugin-responsive-mode"],
      ["tips", "cc-plugin-tips"],
      ["mermaid", "cc-plugin-mermaid"],
      ["claude-test", "cc-plugin-claude-test"],
      ["agents-md", "cc-plugin-agents-md"],
      ["diff", "cc-plugin-diff"],
      ["telemetry", "cc-plugin-telemetry"],
      ["plugin-authoring", "cc-plugin-plugin-authoring"],
      ["sec-default", "cc-plugin-sec-default"],
      ["easel", "cc-plugin-easel"],
      ...[],
    ]);
  EXTERNAL_PLUGIN_SKILL_MAP.set("external", map);
  return map;
};
//@ chunk-z20c443b.js:13463-13479 placement
/**
 * 取外部技能映射表。
 */
var getExternalPluginSkillMap = () => externalPluginSkillMap();
//@ chunk-z20c443b.js:13479-13507 placement
/**
 * 外部技能名换成插件名，无映射时原样返回。
 */
var externalSkillToPluginName = (skillName) => getExternalPluginSkillMap().get(skillName) ?? skillName;
//@ chunk-z20c443b.js:13507-13560 placement
/**
 * 列出映射到某插件名的所有外部技能名。
 */
var skillNamesForPlugin = (pluginName) =>
  [...getExternalPluginSkillMap()].flatMap(([skillName, mappedPlugin]) =>
    mappedPlugin === pluginName ? [skillName] : [],
  );
//@ chunk-z20c443b.js:13560-13584 placement
/**
 * 映射到某插件名的第一个外部技能名。
 */
var firstSkillNameForPlugin = (pluginName) => skillNamesForPlugin(pluginName)[0] ?? pluginName;
//@ chunk-z20c443b.js:13584-13610 placement
/**
 * 映射到某插件名的最后一个外部技能名。
 */
var lastSkillNameForPlugin = (name) => skillNamesForPlugin(name).at(-1);
//@ chunk-z20c443b.js:13610-13652 placement
/**
 * 加载来源是否为 inline 或 synced。
 */
function isInlineOrSyncedSource(source) {
  return isInlineSource(source) || source === "synced";
}
//@ chunk-z20c443b.js:13652-13687 placement
/**
 * 加载来源是否为 inline。
 */
function isInlineSource(source) {
  return source === "inline";
}
//@ chunk-z20c443b.js:13687-13764 placement
/**
 * 解析 1–8192 的整数上限，非法返回 undefined。
 */
function parseSkillLimit(columns) {
  let floored = Math.floor(columns ?? Number.NaN);
  return floored >= 1 && floored <= 8192 ? floored : undefined;
}
//@ chunk-z20c443b.js:13764-13799 placement
/**
 * 拼出 agent-<name> 形式的技能名。
 */
function agentSkillName(newAgentId) {
  return `agent-${newAgentId}`;
}
export {
  toSyncedSkillAlias,
  ANTHROPIC_SKILLS,
  withSyncedSkillPrefix,
  isSafeSkillName,
  stripSyncedSkillPrefix,
  pluginSkillAliases,
  hasSyncedSkillPrefix,
  isValidSkillDirName,
  SYNCED_SKILL_PREFIXES,
  syncedSkillAliases,
  getDuplicatedSkillName,
  agentSkillName,
  lastSkillNameForPlugin,
  externalSkillToPluginName,
  parseSkillLimit,
  getExternalPluginSkillMap,
  firstSkillNameForPlugin,
  skillNamesForPlugin,
  isInlineOrSyncedSource,
};
