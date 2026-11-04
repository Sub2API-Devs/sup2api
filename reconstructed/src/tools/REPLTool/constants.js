/**
 * tools/REPLTool/constants.ts
 *
 * REPL 工具名与 isReplModeEnabled（外部构建中 REPL 工具槽恒为 null，实际不存在）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/REPLTool/constants.ts
 * pieces: chunk-cy6qaqnq.js (4)
 * attribution: fingerprint 1, placement 3
 */
//@ chunk-cy6qaqnq.js:191-216 fingerprint = REPL_TOOL_NAME (1)
/**
 * REPL 工具名常量 "REPL"。
 */
var REPL_TOOL_NAME = "REPL";
var REPL_TOOL_NAME_ALIAS = "REPL";
//@ chunk-cy6qaqnq.js:216-254 placement
/**
 * 判断工具名是 REPL 工具名或其别名。
 */
function isReplToolName(toolName) {
  return toolName === REPL_TOOL_NAME || toolName === REPL_TOOL_NAME_ALIAS;
}
//@ chunk-cy6qaqnq.js:254-297 placement
/**
 * 判断工具名是否精确等于 REPL 工具名。
 */
function isExactReplToolName(name) {
  if (name === REPL_TOOL_NAME) return true;
  return false;
}
//@ chunk-cy6qaqnq.js:297-322 placement
/**
 * 原样返回输入（辅助占位）。
 */
function identity(value) {
  return value;
}
export { isReplToolName, REPL_TOOL_NAME, isExactReplToolName, identity, REPL_TOOL_NAME_ALIAS };
