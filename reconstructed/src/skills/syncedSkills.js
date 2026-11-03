/**
 * skills/syncedSkills.ts
 *
 * 2.1.316 新增：外部技能名到内置插件名的映射；同步技能的别名列表等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (21)
 * attribution: placement 21
 */
//@ chunk-dcmhvw5a.js:11729-11781 placement
/**
 * 同步技能命名前缀 anthropic-skills。
 */
var SYNCED_SKILL_PREFIXES = ["anthropic-skills"];
var ANTHROPIC_SKILLS = "anthropic-skills";
//@ chunk-dcmhvw5a.js:11781-11864 placement
/**
 * 加 anthropic-skills: 前缀。
 */
function withSyncedSkillPrefix(e) {
  return e.startsWith("anthropic-skills:") ? e : `anthropic-skills:${e}`;
}
//@ chunk-dcmhvw5a.js:11864-11924 placement
/**
 * 是否有同步技能前缀。
 */
function hasSyncedSkillPrefix(e) {
  return SYNCED_SKILL_PREFIXES.some((n) => e.startsWith(`${n}:`));
}
//@ chunk-dcmhvw5a.js:11924-11974 placement
/**
 * 名字是否只含安全字符。
 */
function isSafeSkillName(e) {
  return /^[A-Za-z0-9._-]+$/.test(e);
}
//@ chunk-dcmhvw5a.js:11974-12038 placement
/**
 * 是否为合法技能目录名。
 */
function isValidSkillDirName(e) {
  return e.length <= 255 && isSafeSkillName(e) && e !== "." && e !== "..";
}
//@ chunk-dcmhvw5a.js:12038-12108 placement
/**
 * 去掉 anthropic-skills: 前缀。
 */
function stripSyncedSkillPrefix(e) {
  return e.startsWith("anthropic-skills:") ? e.slice(17) : e;
}
//@ chunk-dcmhvw5a.js:12108-12159 placement
/**
 * 取技能的对外显示名，没有则用原名。
 */
function displayNameOf(e) {
  return e.userFacingName?.() ?? e.name;
}
//@ chunk-dcmhvw5a.js:12159-12487 placement
/**
 * 插件技能的别名列表。
 */
function pluginSkillAliases(e) {
  if (e.loadedFrom !== "plugin") return [];
  let n = getDuplicatedSkillName(e.name) ?? getDuplicatedSkillName(displayNameOf(e));
  if (n === undefined) return [];
  let sliced = e.name.slice(e.name.indexOf(":") + 1);
  return [
    toSyncedSkillAlias(`${n}:${n}`),
    n,
    ...[...(e.aliases ?? []), ...(e.shedAliases ?? [])]
      .filter((s) => s !== n)
      .map((s) => `anthropic-skills:${s}`),
    ...(sliced !== n && !sliced.includes(":") ? [`anthropic-skills:${sliced}`, sliced] : []),
  ];
}
//@ chunk-dcmhvw5a.js:12487-12613 placement
function getDuplicatedSkillName(name) {
  let index = name.indexOf(":");
  if (index <= 0) return;
  let sliced = name.slice(0, index);
  let sliced_2 = name.slice(index + 1);
  return sliced_2 === sliced && !SYNCED_SKILL_PREFIXES.includes(sliced) ? sliced_2 : undefined;
}
//@ chunk-dcmhvw5a.js:12613-12795 placement
function toSyncedSkillAlias(e) {
  let duplicatedSkillName = getDuplicatedSkillName(e);
  if (duplicatedSkillName !== undefined) return `anthropic-skills:${duplicatedSkillName}`;
  if (!e.startsWith("anthropic-skills:")) return;
  let sliced = e.slice(17);
  return sliced && !sliced.includes(":") ? `${sliced}:${sliced}` : undefined;
}
//@ chunk-dcmhvw5a.js:12795-13127 placement
/**
 * 同步技能的别名列表。
 */
function syncedSkillAliases(e) {
  if (
    (e.loadedFrom !== "syncedSkills" && e.loadedFrom !== "plugin") ||
    !e.name.startsWith("anthropic-skills:")
  )
    return [];
  let sliced = e.name.slice(17);
  let r = displayNameOf(e);
  let s = r.startsWith("anthropic-skills:") ? r.slice(17) : undefined;
  if (!sliced || sliced.includes(":")) return [];
  return [
    toSyncedSkillAlias(e.name),
    ...(s !== undefined && s !== sliced && !s.includes(":") ? [`${s}:${s}`, `${s}:${sliced}`, s] : []),
  ];
}
//@ chunk-dcmhvw5a.js:13127-13586 placement
/**
 * 外部技能名到内置插件名的映射。
 */
var EXTERNAL_PLUGIN_SKILL_MAP = new Map();
var externalPluginSkillMap = () => {
  let e =
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
  EXTERNAL_PLUGIN_SKILL_MAP.set("external", e);
  return e;
};
//@ chunk-dcmhvw5a.js:13586-13602 placement
/**
 * 取外部技能映射表。
 */
var getExternalPluginSkillMap = () => externalPluginSkillMap();
//@ chunk-dcmhvw5a.js:13602-13630 placement
/**
 * 外部技能名换成插件名，无映射时原样返回。
 */
var externalSkillToPluginName = (e) => getExternalPluginSkillMap().get(e) ?? e;
//@ chunk-dcmhvw5a.js:13630-13683 placement
/**
 * 列出映射到某插件名的所有外部技能名。
 */
var skillNamesForPlugin = (e) => [...getExternalPluginSkillMap()].flatMap(([n, r]) => (r === e ? [n] : []));
//@ chunk-dcmhvw5a.js:13683-13707 placement
/**
 * 映射到某插件名的第一个外部技能名。
 */
var firstSkillNameForPlugin = (e) => skillNamesForPlugin(e)[0] ?? e;
//@ chunk-dcmhvw5a.js:13707-13733 placement
/**
 * 映射到某插件名的最后一个外部技能名。
 */
var lastSkillNameForPlugin = (name) => skillNamesForPlugin(name).at(-1);
//@ chunk-dcmhvw5a.js:13733-13775 placement
/**
 * 加载来源是否为 inline 或 synced。
 */
function isInlineOrSyncedSource(e) {
  return isInlineSource(e) || e === "synced";
}
//@ chunk-dcmhvw5a.js:13775-13810 placement
/**
 * 加载来源是否为 inline。
 */
function isInlineSource(e) {
  return e === "inline";
}
//@ chunk-dcmhvw5a.js:13810-13887 placement
/**
 * 解析 1–8192 的整数上限，非法返回 undefined。
 */
function parseSkillLimit(columns) {
  let floored = Math.floor(columns ?? Number.NaN);
  return floored >= 1 && floored <= 8192 ? floored : undefined;
}
//@ chunk-dcmhvw5a.js:13887-13922 placement
/**
 * 拼出 agent-<name> 形式的技能名。
 */
function agentSkillName(newAgentId) {
  return `agent-${newAgentId}`;
}
export {
  toSyncedSkillAlias,
  agentSkillName,
  externalSkillToPluginName,
  stripSyncedSkillPrefix,
  ANTHROPIC_SKILLS,
  isValidSkillDirName,
  lastSkillNameForPlugin,
  parseSkillLimit,
  getExternalPluginSkillMap,
  firstSkillNameForPlugin,
  skillNamesForPlugin,
  isInlineOrSyncedSource,
  pluginSkillAliases,
  hasSyncedSkillPrefix,
  withSyncedSkillPrefix,
  isSafeSkillName,
  SYNCED_SKILL_PREFIXES,
  syncedSkillAliases,
  getDuplicatedSkillName,
};
