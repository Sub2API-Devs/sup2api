/**
 * services/compact/keptTools.ts
 *
 * 清理时保留的工具类型（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (10)
 * attribution: placement 8, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  isSillyShoreGateOn,
  getToolUseName,
  isToolUseLikeBlockType,
  collectToolsUsedBeforeSummary,
} from "../../utils/messages/untrustedArtifactContent.js";
import { canonicalToolName } from "../../utils/permissions/permissionRuleParser.js";
import { getConversationToolsUsed } from "../../bootstrap/state.js";
import { logError } from "../../utils/log.js";
import { UNREADABLE_TOOLS_USED_BEFORE_SUMMARY, isGmailAttachmentTool } from "../../bootstrap/stateSlices.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { logFeatureOk } from "../analytics/featureTelemetry.js";

//@ chunk-7jxyna5q.js:233887-233972 placement
/**
 * 记录一次工具使用（工具名 + 输入），供清理/压缩时保留相关工具；开关关闭或出错时静默。
 */
function recordToolUsePair(name, name_2) {
  try {
    if (isSillyShoreGateOn()) {
      let canonical = canonicalToolName(name.trim());
      getConversationToolsUsed().record([canonical, name_2]);
    }
  } catch (error) {
    logError(error);
  }
}
//@ chunk-7jxyna5q.js:233972-234162 placement
/**
 * 记录助手消息中用到的服务端/MCP 工具（用于清理时保留）。
 */
function recordServerToolsUsed(message) {
  try {
    if (!isSillyShoreGateOn()) return;
    let names = [];
    for (let block of message.message.content)
      if (block.type === "server_tool_use" || block.type === "mcp_tool_use")
        names.push(getToolUseName(block));
    if (names.length > 0) getConversationToolsUsed().record(names);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-7jxyna5q.js:234162-234221 placement
/**
 * 记录一个用过的工具名。
 */
function recordToolUsed(name) {
  try {
    if (isSillyShoreGateOn()) getConversationToolsUsed().record([name]);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-7jxyna5q.js:234221-234367 layout
function recordServerListedTool(event) {
  if (!isToolUseLikeBlockType(event.type)) return;
  let entry =
    typeof event.name === "string"
      ? getToolUseName({
          type: event.type,
          name: event.name,
          server_name: event.server_name,
        })
      : "";
  recordToolUsed(entry === "" ? UNREADABLE_TOOLS_USED_BEFORE_SUMMARY : entry);
}
//@ chunk-7jxyna5q.js:234367-234635 layout
function recordEarlierToolsUnknown(event) {
  let request = isPlainObject(event) ? event.request : undefined;
  let messages = isPlainObject(request) && Array.isArray(request.messages) ? request.messages : [];
  if (
    [event, ...messages].some(
      (request) =>
        isPlainObject(request) &&
        request.earlier_tools_unknown !== undefined &&
        request.earlier_tools_unknown !== null &&
        request.earlier_tools_unknown !== false,
    ) &&
    getConversationToolsUsed().record([UNREADABLE_TOOLS_USED_BEFORE_SUMMARY])
  )
    logFeatureOk("api_tools_used_unknown_mark");
}
//@ chunk-7jxyna5q.js:234635-234707 placement
/**
 * 记录经标签处理的工具输入（artifact 内容加不可信标记）。
 */
function recordToolUseTagged(name) {
  try {
    if (isSillyShoreGateOn())
      getConversationToolsUsed().record(collectToolsUsedBeforeSummary(name, undefined, false));
  } catch (error) {
    logError(error);
  }
}
//@ chunk-7jxyna5q.js:234707-234717 placement
/**
 * 从内部元数据恢复 tools_kept_by_clear 时最多恢复的工具数（64）。
 */
var MAX_RESTORED_TOOLS = 64;
//@ chunk-7jxyna5q.js:234717-234831 placement
/**
 * 从内部元数据恢复 tools_kept_by_clear 记录。
 */
function restoreToolsKeptByClear(restoredWorkerState) {
  let toolsKeptByClear = restoredWorkerState?.internal?.tools_kept_by_clear;
  if (Array.isArray(toolsKeptByClear))
    getConversationToolsUsed().record(
      toolsKeptByClear.slice(0, MAX_RESTORED_TOOLS).filter(isGmailAttachmentTool),
    );
}
//@ chunk-7jxyna5q.js:234831-234922 placement
/**
 * 生成要写回内部元数据的 tools_kept_by_clear 字段。
 */
function toolsKeptMetadata() {
  let filtered = getConversationToolsUsed().names().filter(isGmailAttachmentTool);
  return {
    tools_kept_by_clear: filtered.length > 0 ? filtered : null,
  };
}
//@ chunk-7jxyna5q.js:234922-234996 placement
/**
 * 把当前保留工具列表写回会话内部元数据（出错静默）。
 */
function notifyToolsKept(sessionState) {
  try {
    sessionState?.notifyInternalMetadataChanged(toolsKeptMetadata());
  } catch (error) {
    logError(error);
  }
}
export {
  restoreToolsKeptByClear,
  recordEarlierToolsUnknown,
  recordToolUsed,
  notifyToolsKept,
  recordServerListedTool,
  recordToolUseTagged,
  recordToolUsePair,
  recordServerToolsUsed,
};
