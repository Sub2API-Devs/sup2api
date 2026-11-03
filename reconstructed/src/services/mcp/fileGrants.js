/**
 * services/mcp/fileGrants.ts
 *
 * 2.1.316 新增。取出并清空 MCP 文件授权。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cp2ytehj.js (5)
 * attribution: placement 5
 */
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { recordToolUseDecision } from "../../components/permissions/hooks.js";

//@ chunk-cp2ytehj.js:264-304 placement
/**
 * 按会话根保存的“工具调用 → 文件授权”表。
 */
var fileGrantsByToolUse = new SessionRootSlot(() => ({
  byToolUse: new Map(),
}));
//@ chunk-cp2ytehj.js:304-375 placement
function keepFileGrants(session, toolUseId, fileInputUpload) {
  fileGrantsByToolUse.of(session).byToolUse.set(toolUseId, fileInputUpload);
  recordToolUseDecision(session, toolUseId, () => {
    dropFileGrants(session, toolUseId);
  });
}
//@ chunk-cp2ytehj.js:375-424 placement
function dropFileGrants(n, e) {
  fileGrantsByToolUse.peek(n)?.byToolUse.delete(e);
}
//@ chunk-cp2ytehj.js:424-494 placement
function hasFileGrants(n, e) {
  return e !== undefined && fileGrantsByToolUse.peek(n)?.byToolUse.has(e) === true;
}
//@ chunk-cp2ytehj.js:494-585 placement
/**
 * 取出并清空 MCP 文件授权。
 */
function takeFileGrants(session, toolUseId) {
  if (toolUseId === undefined) return;
  let i = fileGrantsByToolUse.peek(session)?.byToolUse.get(toolUseId);
  dropFileGrants(session, toolUseId);
  return i;
}
export { takeFileGrants, keepFileGrants, dropFileGrants };
