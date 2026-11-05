/**
 * services/agentImport/importItemOrder.ts
 *
 * 2.1.316 新增：导入项的排序与分组（指令、设置、子代理、命令、MCP、技能）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-k9ewfrhk.js (4)
 * attribution: placement 4
 */
//@ chunk-k9ewfrhk.js:191-334 placement
/**
 * 其他代理的指令文件名与导入项排序权重。
 */
var INSTRUCTION_FILE_NAMES = new Set(["agents.md", "agents.override.md", "gemini.md", ".cursorrules"]);
var IMPORT_KIND_ORDER = {
  instructions: 0,
  setting: 1,
  subagent: 2,
  command: 3,
  mcp: 4,
  skill: 5,
};
//@ chunk-k9ewfrhk.js:334-404 placement
/**
 * 导出函数 `isPlainUserImportItem`：参数 e，返回 e.scope === "user" && !e.warning && e.kind !== "skill"。
 */
function isPlainUserImportItem(item) {
  return item.scope === "user" && !item.warning && item.kind !== "skill";
}
//@ chunk-k9ewfrhk.js:404-517 placement
/**
 * 导入项分组：project / warned / null。
 */
function importItemGroup(item) {
  if (item.scope === "project") return "project";
  if (item.warning || item.kind === "skill") return "warned";
  return null;
}
//@ chunk-k9ewfrhk.js:517-670 placement
/**
 * 按类型、作用域（项目优先）、标签排序导入项。
 */
function compareImportItems(a, b) {
  let kindOrder = IMPORT_KIND_ORDER[a.kind] - IMPORT_KIND_ORDER[b.kind];
  if (kindOrder !== 0) return kindOrder;
  if (a.scope !== b.scope) return a.scope === "project" ? -1 : 1;
  return a.label.localeCompare(b.label);
}
export { INSTRUCTION_FILE_NAMES, isPlainUserImportItem, importItemGroup, compareImportItems };
