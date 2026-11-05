/**
 * utils/codeMode/scriptHelperPairs.ts
 *
 * 成对的 script helper 虚拟消息的识别与剔除（无实际结果时清掉空壳）（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9br2jtex.js (4)
 * attribution: placement 4
 */
import { isCodeModeEnabled } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { isScriptHelperCallName } from "./scriptHelperNames.js";
import { isEvalToolName, REPL_TOOL_NAME } from "../../tools/REPLTool/constants.js";
import { isStoppedReplResult } from "../../tools/REPLTool/stopReport.js";
import { getFirstLine } from "../stringUtils.js";

//@ chunk-9br2jtex.js:4884-4922 placement
var ERROR_PREFIX_PATTERN = /^(?:[A-Za-z_$][\w$]*)?Error: /;
//@ chunk-9br2jtex.js:4922-4956 placement
/**
 * 一个工具调用是否属于 script helper 调用（Code 模式开启且名字在 helper 表里）。
 */
function isHelperCall(toolName) {
  return isCodeModeEnabled() && isScriptHelperCallName(toolName);
}
//@ chunk-9br2jtex.js:4956-6276 placement
/**
 * 剔除没有实际结果配对的 script helper 虚拟消息与结果对。
 */
function dropRedundantHelperErrors(messages) {
  if (!isCodeModeEnabled()) return messages;
  let evalIds = new Set();
  let helperIds = new Set();
  let redundantIds = new Set();
  let lastFailure;
  for (let message of messages) {
    if (message.type === "assistant") {
      for (let block of message.message.content) {
        if (block.type !== "tool_use") continue;
        if (message.isVirtual !== true) {
          if (isEvalToolName(block.name)) evalIds.add(block.id);
        } else if (isScriptHelperCallName(block.name)) helperIds.add(block.id);
      }
      if (message.isVirtual !== true) lastFailure = undefined;
      continue;
    }
    if (message.type !== "user") continue;
    let content = message.message.content;
    if (message.isVirtual !== true) {
      lastFailure = undefined;
      if (!Array.isArray(content)) continue;
      for (let block of content) {
        if (block.type !== "tool_result" || !evalIds.has(block.tool_use_id)) continue;
        let toolUseResult = message.toolUseResult;
        lastFailure = {
          failed: block.is_error === true && !isStoppedReplResult(REPL_TOOL_NAME, toolUseResult),
          error:
            typeof toolUseResult === "object" &&
            toolUseResult !== null &&
            "error" in toolUseResult &&
            typeof toolUseResult.error === "string"
              ? toolUseResult.error
              : "",
          firstLine: undefined,
        };
      }
      continue;
    }
    if (!Array.isArray(content)) continue;
    for (let block of content) {
      if (block.type !== "tool_result" || !helperIds.has(block.tool_use_id)) continue;
      let isRedundant = block.is_error === true && lastFailure?.failed !== false;
      if (isRedundant && lastFailure !== undefined) {
        if (lastFailure.firstLine === undefined)
          lastFailure.firstLine = stripErrorPrefix(getFirstLine(lastFailure.error));
        let firstLine = getFirstLine(typeof block.content === "string" ? block.content : "");
        isRedundant = firstLine === "" || lastFailure.firstLine !== stripErrorPrefix(firstLine);
      }
      if (!isRedundant) redundantIds.add(block.tool_use_id);
    }
  }
  if (redundantIds.size === 0) return messages;
  return messages.filter((message) => {
    if (message.type === "assistant" && message.isVirtual === true) {
      let content = message.message.content;
      return !(
        content.length > 0 &&
        content.every((block) => block.type === "tool_use" && redundantIds.has(block.id))
      );
    }
    if (message.type === "user" && message.isVirtual === true) {
      let content = message.message.content;
      return !(
        Array.isArray(content) &&
        content.length > 0 &&
        content.every((block) => block.type === "tool_result" && redundantIds.has(block.tool_use_id))
      );
    }
    return true;
  });
}
//@ chunk-9br2jtex.js:6276-6341 placement
function stripErrorPrefix(firstLine) {
  let text = firstLine;
  while (ERROR_PREFIX_PATTERN.test(text)) text = text.replace(ERROR_PREFIX_PATTERN, "");
  return text;
}
export { isHelperCall, dropRedundantHelperErrors };
