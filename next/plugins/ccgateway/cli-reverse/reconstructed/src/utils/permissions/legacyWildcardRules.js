/**
 * utils/permissions/legacyWildcardRules.ts
 *
 * 旧式 (*) / () 通配规则名的兼容：在 bot_protected_tengu_amber_plover 开关下把整工具通配改写成 *，并给出兼容说明文案（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gg17c06d.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { READ } from "../../tools/FileReadTool/constants.js";
import { EDIT } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { LSP_TOOL_NAME } from "../../tools/LSPTool/UI.js";
import { SEND_USER_FILE_TOOL_NAME } from "../../tools/SendUserFileTool/prompt.js";
import { getFeatureValue_SESSION_PINNED } from "../../services/analytics/growthbook.js";
import {
  classifyRuleParens,
  parseRuleString,
  permissionRuleValueFromString as permissionRuleValueFromString_2,
} from "./permissionRuleParser.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-gg17c06d.js:4390-4454 placement
var READ_LIKE_TOOLS; // deferred: uses GLOB_TOOL_NAME (../../tools/GlobTool/prompt.js) of its import cycle while loading; runs once the cycle is complete
var WRITE_LIKE_TOOLS;
deferInit("chunk-gg17c06d.js:4390", () => {
  READ_LIKE_TOOLS = new Set([
    READ,
    EDIT,
    FILE_WRITE_TOOL_NAME,
    NOTEBOOK_EDIT_TOOL_NAME,
    GLOB_TOOL_NAME,
    GREP_TOOL_NAME,
    LSP_TOOL_NAME,
    SEND_USER_FILE_TOOL_NAME,
  ]);
  WRITE_LIKE_TOOLS = new Set([EDIT, FILE_WRITE_TOOL_NAME, NOTEBOOK_EDIT_TOOL_NAME]);
});
//@ chunk-gg17c06d.js:4454-4800 placement
/**
 * 生成说明：某工具在 (*)-式规则下的含义与旧版本兼容性。
 */
function describeWildcardHint(ruleText, toolName) {
  return `${WRITE_LIKE_TOOLS.has(toolName) ? `lets ${toolName} run without asking only in the working directories` : `adds nothing to ${toolName}'s default, which already runs without asking in the working directories`}. "${toolName}" alone allows every path. Older versions of Claude Code treat "${ruleText}" as "${toolName}", and this version will too if Anthropic turns this change off.`;
}
//@ chunk-gg17c06d.js:4866-4928 placement
function isAmberPloverOn() {
  return getFeatureValue_SESSION_PINNED("bot_protected_tengu_amber_plover", true);
}
//@ chunk-gg17c06d.js:4928-5174 placement
/**
 * 把以 (*)/() 结尾的 allow 规则在开关打开时改写成整工具 * 规则；permissions 使用。
 */
function normalizeRuleString(rule, behavior) {
  if (behavior === "allow" && typeof rule === "string" && (rule.endsWith("(*)") || rule.endsWith("()"))) {
    let parens = classifyRuleParens(rule);
    if (
      parens.kind === "call" &&
      (parens.rawContent === "*" || parens.rawContent === "") &&
      READ_LIKE_TOOLS.has(parens.toolName) &&
      isAmberPloverOn()
    )
      return {
        toolName: parens.toolName,
        ruleContent: "*",
      };
  }
  return parseRuleString(rule);
}
//@ chunk-gg17c06d.js:5174-5206 placement
/**
 * 把规则文本解析后再规范化。
 */
function parseRuleValue(rule) {
  return permissionRuleValueFromString_2(parseRuleString(rule));
}
export { normalizeRuleString, describeWildcardHint, parseRuleValue, READ_LIKE_TOOLS, isAmberPloverOn };
