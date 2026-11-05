/**
 * tools/SkillTool/skillToolNames.ts
 *
 * 2.1.316 新增：Skill 工具名常量。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ewnm1pnf.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-ewnm1pnf.js:191-265 placement
/**
 * 去掉不含冒号的拒绝匹配名。
 */
function denyMatchNamesWithColon(command) {
  return (command.denyMatchNames ?? []).filter((name) => name.includes(":"));
}
//@ chunk-ewnm1pnf.js:265-613 placement
/**
 * 为 MCP 技能计算被其他命令占用的保留标签，标签不变时保持原对象。
 */
function withReservedLabels(mcpCommands, otherCommands) {
  let knownNames;
  return mcpCommands.map((command) => {
    if (command.loadedFrom !== "mcp") return command;
    let colonNames = denyMatchNamesWithColon(command);
    if (colonNames.length === 0) return command;
    knownNames ??= new Set([
      ...otherCommands.map((command) => command.name),
      ...mcpCommands.map((command) => command.name),
    ]);
    let filtered = colonNames.filter((name) => name !== command.name && knownNames.has(name));
    let reservedLabels = command.reservedLabels ?? [];
    if (
      filtered.length === reservedLabels.length &&
      filtered.every((name, index) => name === reservedLabels[index])
    )
      return command;
    return {
      ...command,
      reservedLabels: filtered.length === 0 ? undefined : filtered,
    };
  });
}
//@ chunk-ewnm1pnf.js:613-641 placement
var SKILL = "Skill";
var SKILL_2 = "skill__";
//@ chunk-ewnm1pnf.js:641-721 placement
/**
 * 把技能名规范成工具名（冒号换下划线、非法字符换下划线）。
 */
function normalizedSkillToolName(name) {
  return SKILL_2 + name.replaceAll(":", "__").replace(/[^a-zA-Z0-9_-]/g, "_");
}
//@ chunk-ewnm1pnf.js:721-940 placement
/**
 * 列出技能的备用名称（别名、旧别名、未限定名、保留标签、目录名），统一规范化。
 */
function skillAlternateNames(command) {
  let names = [
    ...(command.aliases ?? []),
    ...(command.shedAliases ?? []),
    ...(command.unqualifiedName != null ? [command.unqualifiedName] : []),
    ...denyMatchNamesWithColon(command),
    ...(command.directoryListingName !== undefined ? [command.directoryListingName] : []),
  ];
  return names.length ? names.map(normalizedSkillToolName) : undefined;
}
export {
  SKILL,
  SKILL_2,
  denyMatchNamesWithColon,
  normalizedSkillToolName,
  withReservedLabels,
  skillAlternateNames,
};
