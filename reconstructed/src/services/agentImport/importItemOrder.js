/**
 * services/agentImport/importItemOrder.ts
 *
 * 2.1.316 新增：导入项的排序与分组（指令、设置、子代理、命令、MCP、技能）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-h3ha77z5.js (4)
 * attribution: placement 4
 */

/**
 * 其他代理的指令文件名与导入项排序权重。
 */
//@ chunk-h3ha77z5.js:191-334 placement
var INSTRUCTION_FILE_NAMES = new Set(["agents.md", "agents.override.md", "gemini.md", ".cursorrules"]),
  IMPORT_KIND_ORDER = { instructions: 0, setting: 1, subagent: 2, command: 3, mcp: 4, skill: 5 };
//@ chunk-h3ha77z5.js:334-404 placement
function YFt(e) {
  return e.scope === "user" && !e.warning && e.kind !== "skill";
}
/**
 * 导入项分组：project / warned / null。
 */
//@ chunk-h3ha77z5.js:404-517 placement
function importItemGroup(e) {
  if (e.scope === "project") return "project";
  if (e.warning || e.kind === "skill") return "warned";
  return null;
}
/**
 * 按类型、作用域（项目优先）、标签排序导入项。
 */
//@ chunk-h3ha77z5.js:517-670 placement
function compareImportItems(e, t) {
  let r = IMPORT_KIND_ORDER[e.kind] - IMPORT_KIND_ORDER[t.kind];
  if (r !== 0) return r;
  if (e.scope !== t.scope) return e.scope === "project" ? -1 : 1;
  return e.label.localeCompare(t.label);
}

export { compareImportItems, YFt, importItemGroup, INSTRUCTION_FILE_NAMES };
