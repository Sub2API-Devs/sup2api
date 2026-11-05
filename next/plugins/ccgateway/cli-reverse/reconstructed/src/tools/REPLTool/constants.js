/**
 * tools/REPLTool/constants.ts
 *
 * REPL 工具名与 isReplModeEnabled（外部构建中 REPL 工具槽恒为 null，实际不存在）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/REPLTool/constants.ts
 * pieces: chunk-1ectaxf9.js (4), chunk-ap4nnw1y.js (1)
 * attribution: placement 4, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { LEGACY_TOOL_NAME_ALIASES } from "../../utils/permissions/permissionRuleParser.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ap4nnw1y.js:494-519 fingerprint (2.1.88 match: REPL_TOOL_NAME, 0.761)
var REPL_TOOL_NAME_2; // deferred: uses LEGACY_TOOL_NAME_ALIASES (../../utils/permissions/permissionRuleParser.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ap4nnw1y.js:494", () => {
  REPL_TOOL_NAME_2 = {
    ...LEGACY_TOOL_NAME_ALIASES,
    Eval: "REPL",
  };
});
//@ chunk-1ectaxf9.js:227-262 placement
/**
 * REPL 工具名常量 "REPL"。
 */
var REPL_TOOL_NAME = "REPL";
var EVAL_TOOL_NAME = "Eval";
var REPL_DISPLAY_NAME = "Code";
//@ chunk-1ectaxf9.js:262-299 placement
/**
 * 判断工具名是 REPL 工具名或其别名。
 */
function isEvalToolName(toolName) {
  return toolName === REPL_TOOL_NAME || toolName === EVAL_TOOL_NAME;
}
//@ chunk-1ectaxf9.js:299-353 placement
/**
 * 判断工具名是否精确等于 REPL 工具名。
 */
function isEvalToolCallName(name) {
  if (name === REPL_TOOL_NAME) return true;
  return codeModeAccepted() && name === EVAL_TOOL_NAME;
}
//@ chunk-1ectaxf9.js:353-394 placement
/**
 * 原样返回输入（辅助占位）。
 */
function shownToolName(value) {
  return codeModeAccepted() && isEvalToolName(value) ? REPL_DISPLAY_NAME : value;
}
export {
  REPL_TOOL_NAME,
  isEvalToolName,
  isEvalToolCallName,
  EVAL_TOOL_NAME,
  REPL_TOOL_NAME_2,
  shownToolName,
  REPL_DISPLAY_NAME,
};
