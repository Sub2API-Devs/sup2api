/**
 * services/compact/keptTools.ts
 *
 * 清理时保留的工具类型（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (8)
 * attribution: placement 8
 */
import {
  isSillyShoreGateOn,
  getToolUseName,
  tagUntrustedArtifactContent,
} from "../../utils/messages/untrustedArtifactContent.js";
import { canonicalToolName } from "../../utils/permissions/permissionRuleParser.js";
import { getConversationToolsUsed } from "../../bootstrap/state.js";
import { logError } from "../../utils/log.js";
import { isGmailAttachmentTool } from "../../bootstrap/stateSlices.js";

//@ chunk-s61vbvea.js:377152-377237 placement
/**
 * 记录一次工具使用（工具名 + 输入），供清理/压缩时保留相关工具；开关关闭或出错时静默。
 */
function recordToolUsePair(e, name) {
  try {
    if (isSillyShoreGateOn()) {
      let r = canonicalToolName(e.trim());
      getConversationToolsUsed().record([r, name]);
    }
  } catch (error) {
    logError(error);
  }
}
//@ chunk-s61vbvea.js:377237-377427 placement
/**
 * 记录助手消息中用到的服务端/MCP 工具（用于清理时保留）。
 */
function recordServerToolsUsed(e) {
  try {
    if (!isSillyShoreGateOn()) return;
    let n = [];
    for (let r of e.message.content)
      if (r.type === "server_tool_use" || r.type === "mcp_tool_use") n.push(getToolUseName(r));
    if (n.length > 0) getConversationToolsUsed().record(n);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-s61vbvea.js:377427-377486 placement
/**
 * 记录一个用过的工具名。
 */
function recordToolUsed(e) {
  try {
    if (isSillyShoreGateOn()) getConversationToolsUsed().record([e]);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-s61vbvea.js:377486-377558 placement
/**
 * 记录经标签处理的工具输入（artifact 内容加不可信标记）。
 */
function recordToolUseTagged(e) {
  try {
    if (isSillyShoreGateOn())
      getConversationToolsUsed().record(tagUntrustedArtifactContent(e, undefined, false));
  } catch (error) {
    logError(error);
  }
}
//@ chunk-s61vbvea.js:377558-377568 placement
/**
 * 从内部元数据恢复 tools_kept_by_clear 时最多恢复的工具数（64）。
 */
var MAX_RESTORED_TOOLS = 64;
//@ chunk-s61vbvea.js:377568-377682 placement
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
//@ chunk-s61vbvea.js:377682-377773 placement
/**
 * 生成要写回内部元数据的 tools_kept_by_clear 字段。
 */
function toolsKeptMetadata() {
  let filtered = getConversationToolsUsed().names().filter(isGmailAttachmentTool);
  return {
    tools_kept_by_clear: filtered.length > 0 ? filtered : null,
  };
}
//@ chunk-s61vbvea.js:377773-377847 placement
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
  recordToolUseTagged,
  recordToolUsed,
  restoreToolsKeptByClear,
  notifyToolsKept,
  recordServerToolsUsed,
  recordToolUsePair,
};
