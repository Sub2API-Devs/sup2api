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
function rTn(e) {
  return (e.denyMatchNames ?? []).filter((t) => t.includes(":"));
}
/**
 * 为 MCP 技能计算被其他命令占用的保留标签，标签不变时保持原对象。
 */
//@ chunk-pvce3whe.js:265-613 placement
function withReservedLabels(e, t) {
  let a;
  return e.map((n) => {
    if (n.loadedFrom !== "mcp") return n;
    let s = rTn(n);
    if (s.length === 0) return n;
    a ??= new Set([...t.map((r) => r.name), ...e.map((r) => r.name)]);
    let filtered = s.filter((r) => r !== n.name && a.has(r)),
      l = n.reservedLabels ?? [];
    if (filtered.length === l.length && filtered.every((r, d) => r === l[d])) return n;
    return { ...n, reservedLabels: filtered.length === 0 ? void 0 : filtered };
  });
}
//@ chunk-pvce3whe.js:613-641 placement
var SKILL = "Skill",
  SKILL_2 = "skill__";
//@ chunk-pvce3whe.js:641-721 placement
function t5e(e) {
  return SKILL_2 + e.replaceAll(":", "__").replace(/[^a-zA-Z0-9_-]/g, "_");
}
/**
 * 列出技能的备用名称（别名、旧别名、未限定名、保留标签、目录名），统一规范化。
 */
//@ chunk-pvce3whe.js:721-940 placement
function skillAlternateNames(e) {
  let t = [
    ...(e.aliases ?? []),
    ...(e.shedAliases ?? []),
    ...(e.unqualifiedName != null ? [e.unqualifiedName] : []),
    ...rTn(e),
    ...(e.directoryListingName !== void 0 ? [e.directoryListingName] : []),
  ];
  return t.length ? t.map(t5e) : void 0;
}

export { SKILL, SKILL_2, withReservedLabels, rTn, t5e, skillAlternateNames };
