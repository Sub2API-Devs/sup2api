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

/**
 * REPL 工具名常量 "REPL"。
 */
//@ chunk-cy6qaqnq.js:191-216 fingerprint = REPL_TOOL_NAME (1)
var REPL_TOOL_NAME = "REPL",
  REPL_TOOL_NAME_ALIAS = "REPL";
//@ chunk-cy6qaqnq.js:216-254 placement
function _O(o) {
  return o === REPL_TOOL_NAME || o === REPL_TOOL_NAME_ALIAS;
}
//@ chunk-cy6qaqnq.js:254-297 placement
function S4(o) {
  if (o === REPL_TOOL_NAME) return !0;
  return !1;
}
//@ chunk-cy6qaqnq.js:297-322 placement
function pae(o) {
  return o;
}

export { _O, REPL_TOOL_NAME, S4, pae, REPL_TOOL_NAME_ALIAS };
