/**
 * tools/SkillTool/skillToolNames.ts
 *
 * 2.1.316 新增：Skill 工具名常量。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-pvce3whe.js (5)
 * attribution: placement 5
 */

//@ chunk-pvce3whe.js:191-265 placement
/**
 * 去掉不含冒号的拒绝匹配名。
 */
function denyMatchNamesWithColon(e) {
  return (e.denyMatchNames ?? []).filter((t) => t.includes(":"));
}
//@ chunk-pvce3whe.js:265-613 placement
/**
 * 为 MCP 技能计算被其他命令占用的保留标签，标签不变时保持原对象。
 */
function withReservedLabels(e, t) {
  let a;
  return e.map((n) => {
    if (n.loadedFrom !== "mcp") return n;
    let s = denyMatchNamesWithColon(n);
    if (s.length === 0) return n;
    a ??= new Set([...t.map((r) => r.name), ...e.map((r) => r.name)]);
    let filtered = s.filter((r) => r !== n.name && a.has(r));
    let reservedLabels = n.reservedLabels ?? [];
    if (filtered.length === reservedLabels.length && filtered.every((r, d) => r === reservedLabels[d]))
      return n;
    return {
      ...n,
      reservedLabels: filtered.length === 0 ? undefined : filtered,
    };
  });
}
//@ chunk-pvce3whe.js:613-641 placement
var SKILL = "Skill";
var SKILL_2 = "skill__";
//@ chunk-pvce3whe.js:641-721 placement
/**
 * 把技能名规范成工具名（冒号换下划线、非法字符换下划线）。
 */
function normalizedSkillToolName(name) {
  return SKILL_2 + name.replaceAll(":", "__").replace(/[^a-zA-Z0-9_-]/g, "_");
}
//@ chunk-pvce3whe.js:721-940 placement
/**
 * 列出技能的备用名称（别名、旧别名、未限定名、保留标签、目录名），统一规范化。
 */
function skillAlternateNames(e) {
  let t = [
    ...(e.aliases ?? []),
    ...(e.shedAliases ?? []),
    ...(e.unqualifiedName != null ? [e.unqualifiedName] : []),
    ...denyMatchNamesWithColon(e),
    ...(e.directoryListingName !== undefined ? [e.directoryListingName] : []),
  ];
  return t.length ? t.map(normalizedSkillToolName) : undefined;
}
export {
  SKILL,
  SKILL_2,
  withReservedLabels,
  denyMatchNamesWithColon,
  normalizedSkillToolName,
  skillAlternateNames,
};
