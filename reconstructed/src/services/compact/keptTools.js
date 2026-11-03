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
import { uLn } from "../../bootstrap/stateSlices.js";

//@ chunk-s61vbvea.js:377152-377237 placement
function D7s(e, n) {
  try {
    if (isSillyShoreGateOn()) {
      let r = canonicalToolName(e.trim());
      getConversationToolsUsed().record([r, n]);
    }
  } catch (error) {
    logError(error);
  }
}
/**
 * 记录助手消息中用到的服务端/MCP 工具（用于清理时保留）。
 */
//@ chunk-s61vbvea.js:377237-377427 placement
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
function Uv(e) {
  try {
    if (isSillyShoreGateOn()) getConversationToolsUsed().record([e]);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-s61vbvea.js:377486-377558 placement
function XKo(e) {
  try {
    if (isSillyShoreGateOn()) getConversationToolsUsed().record(tagUntrustedArtifactContent(e, void 0, !1));
  } catch (error) {
    logError(error);
  }
}
//@ chunk-s61vbvea.js:377558-377568 placement
var eL = 64;
/**
 * 从内部元数据恢复 tools_kept_by_clear 记录。
 */
//@ chunk-s61vbvea.js:377568-377682 placement
function restoreToolsKeptByClear(e) {
  let n = e?.internal?.tools_kept_by_clear;
  if (Array.isArray(n)) getConversationToolsUsed().record(n.slice(0, eL).filter(uLn));
}
//@ chunk-s61vbvea.js:377682-377773 placement
function nL() {
  let filtered = getConversationToolsUsed().names().filter(uLn);
  return { tools_kept_by_clear: filtered.length > 0 ? filtered : null };
}
//@ chunk-s61vbvea.js:377773-377847 placement
function N7s(e) {
  try {
    e?.notifyInternalMetadataChanged(nL());
  } catch (error) {
    logError(error);
  }
}

export { XKo, Uv, restoreToolsKeptByClear, N7s, recordServerToolsUsed, D7s };
