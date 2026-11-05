/**
 * services/mcp/fileGrants.ts
 *
 * 2.1.316 新增。取出并清空 MCP 文件授权。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-dtxma1da.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { recordToolUseDecision } from "../../components/permissions/hooks.js";

//@ chunk-dtxma1da.js:264-304 placement
/**
 * 按会话根保存的“工具调用 → 文件授权”表。
 */
var fileGrantsByToolUse = new SessionRootSlot(() => ({
  byToolUse: new Map(),
}));
//@ chunk-dtxma1da.js:304-375 placement
function keepFileGrants(session, toolUseId, fileInputUpload) {
  fileGrantsByToolUse.of(session).byToolUse.set(toolUseId, fileInputUpload);
  recordToolUseDecision(session, toolUseId, () => {
    dropFileGrants(session, toolUseId);
  });
}
//@ chunk-dtxma1da.js:375-424 placement
function dropFileGrants(session, toolUseId) {
  fileGrantsByToolUse.peek(session)?.byToolUse.delete(toolUseId);
}
//@ chunk-dtxma1da.js:424-494 placement
function hasFileGrants(session, toolUseId) {
  return toolUseId !== undefined && fileGrantsByToolUse.peek(session)?.byToolUse.has(toolUseId) === true;
}
//@ chunk-dtxma1da.js:494-585 placement
/**
 * 取出并清空 MCP 文件授权。
 */
function takeFileGrants(session, toolUseId) {
  if (toolUseId === undefined) return;
  let grants = fileGrantsByToolUse.peek(session)?.byToolUse.get(toolUseId);
  dropFileGrants(session, toolUseId);
  return grants;
}
export { takeFileGrants, keepFileGrants, dropFileGrants, hasFileGrants };
