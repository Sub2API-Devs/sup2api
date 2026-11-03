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

/**
 * 同步技能命名前缀 anthropic-skills。
 */
//@ chunk-dcmhvw5a.js:11729-11781 placement
var SYNCED_SKILL_PREFIXES = ["anthropic-skills"],
  ANTHROPIC_SKILLS = "anthropic-skills";
/**
 * 加 anthropic-skills: 前缀。
 */
//@ chunk-dcmhvw5a.js:11781-11864 placement
function withSyncedSkillPrefix(e) {
  return e.startsWith("anthropic-skills:") ? e : `anthropic-skills:${e}`;
}
/**
 * 是否有同步技能前缀。
 */
//@ chunk-dcmhvw5a.js:11864-11924 placement
function hasSyncedSkillPrefix(e) {
  return SYNCED_SKILL_PREFIXES.some((n) => e.startsWith(`${n}:`));
}
/**
 * 名字是否只含安全字符。
 */
//@ chunk-dcmhvw5a.js:11924-11974 placement
function isSafeSkillName(e) {
  return /^[A-Za-z0-9._-]+$/.test(e);
}
/**
 * 是否为合法技能目录名。
 */
//@ chunk-dcmhvw5a.js:11974-12038 placement
function isValidSkillDirName(e) {
  return e.length <= 255 && isSafeSkillName(e) && e !== "." && e !== "..";
}
/**
 * 去掉 anthropic-skills: 前缀。
 */
//@ chunk-dcmhvw5a.js:12038-12108 placement
function stripSyncedSkillPrefix(e) {
  return e.startsWith("anthropic-skills:") ? e.slice(17) : e;
}
//@ chunk-dcmhvw5a.js:12108-12159 placement
function sa(e) {
  return e.userFacingName?.() ?? e.name;
}
/**
 * 插件技能的别名列表。
 */
//@ chunk-dcmhvw5a.js:12159-12487 placement
function pluginSkillAliases(e) {
  if (e.loadedFrom !== "plugin") return [];
  let n = getDuplicatedSkillName(e.name) ?? getDuplicatedSkillName(sa(e));
  if (n === void 0) return [];
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
function getDuplicatedSkillName(e) {
  let index = e.indexOf(":");
  if (index <= 0) return;
  let sliced = e.slice(0, index),
    sliced_2 = e.slice(index + 1);
  return sliced_2 === sliced && !SYNCED_SKILL_PREFIXES.includes(sliced) ? sliced_2 : void 0;
}
//@ chunk-dcmhvw5a.js:12613-12795 placement
function toSyncedSkillAlias(e) {
  let n = getDuplicatedSkillName(e);
  if (n !== void 0) return `anthropic-skills:${n}`;
  if (!e.startsWith("anthropic-skills:")) return;
  let sliced = e.slice(17);
  return sliced && !sliced.includes(":") ? `${sliced}:${sliced}` : void 0;
}
/**
 * 同步技能的别名列表。
 */
//@ chunk-dcmhvw5a.js:12795-13127 placement
function syncedSkillAliases(e) {
  if (
    (e.loadedFrom !== "syncedSkills" && e.loadedFrom !== "plugin") ||
    !e.name.startsWith("anthropic-skills:")
  )
    return [];
  let sliced = e.name.slice(17),
    r = sa(e),
    s = r.startsWith("anthropic-skills:") ? r.slice(17) : void 0;
  if (!sliced || sliced.includes(":")) return [];
  return [
    toSyncedSkillAlias(e.name),
    ...(s !== void 0 && s !== sliced && !s.includes(":") ? [`${s}:${s}`, `${s}:${sliced}`, s] : []),
  ];
}
/**
 * 外部技能名到内置插件名的映射。
 */
//@ chunk-dcmhvw5a.js:13127-13586 placement
var EXTERNAL_PLUGIN_SKILL_MAP = new Map(),
  aa = () => {
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
    return (EXTERNAL_PLUGIN_SKILL_MAP.set("external", e), e);
  };
//@ chunk-dcmhvw5a.js:13586-13602 placement
var Pt = () => aa();
//@ chunk-dcmhvw5a.js:13602-13630 placement
var ibr = (e) => Pt().get(e) ?? e;
//@ chunk-dcmhvw5a.js:13630-13683 placement
var _t = (e) => [...Pt()].flatMap(([n, r]) => (r === e ? [n] : []));
//@ chunk-dcmhvw5a.js:13683-13707 placement
var la = (e) => _t(e)[0] ?? e;
//@ chunk-dcmhvw5a.js:13707-13733 placement
var yPi = (e) => _t(e).at(-1);
//@ chunk-dcmhvw5a.js:13733-13775 placement
function da(e) {
  return bh(e) || e === "synced";
}
//@ chunk-dcmhvw5a.js:13775-13810 placement
function bh(e) {
  return e === "inline";
}
//@ chunk-dcmhvw5a.js:13810-13887 placement
function ca(e) {
  let floored = Math.floor(e ?? Number.NaN);
  return floored >= 1 && floored <= 8192 ? floored : void 0;
}
//@ chunk-dcmhvw5a.js:13887-13922 placement
function _Pi(e) {
  return `agent-${e}`;
}

export {
  toSyncedSkillAlias,
  _Pi,
  ibr,
  stripSyncedSkillPrefix,
  ANTHROPIC_SKILLS,
  isValidSkillDirName,
  yPi,
  ca,
  Pt,
  la,
  _t,
  da,
  pluginSkillAliases,
  hasSyncedSkillPrefix,
  withSyncedSkillPrefix,
  isSafeSkillName,
  SYNCED_SKILL_PREFIXES,
  syncedSkillAliases,
  getDuplicatedSkillName,
};
