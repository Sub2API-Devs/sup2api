/**
 * services/mcp/listAuthError.ts
 *
 * 2.1.316 新增。MCP 列表请求的认证错误判定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s7nhrpfy.js (2), chunk-zmmcqmt0.js (2)
 * attribution: placement 4
 */
import { UnauthorizedError } from "../../../vendor/@modelcontextprotocol/client/dist/index.mjs";
import {
  SdkHttpError,
  Ti,
  ProtocolError,
  SdkError,
} from "../../../vendor/@modelcontextprotocol/client/dist/src-D_zzAWoS.mjs";
import { AM } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/auth.js";
import { McpError } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js";

//@ chunk-s7nhrpfy.js:239-330 placement
function isClaudeAiBearerRejectedError(r) {
  return r instanceof Error && "code" in r && r.code === "CLAUDEAI_BEARER_REJECTED";
}
/**
 * MCP 列表请求的认证错误判定。
 */
//@ chunk-s7nhrpfy.js:330-645 placement
function isListAuthError(r) {
  if (r instanceof UnauthorizedError) return !0;
  if (isClaudeAiBearerRejectedError(r)) return !1;
  if (r instanceof SdkHttpError && (r.status === 403 || r.status === 401))
    return r.code !== Ti.ClientHttpAuthentication && r.code !== Ti.ClientHttpForbidden;
  if (
    r instanceof Error &&
    !(r instanceof ProtocolError) &&
    !(r instanceof SdkError) &&
    "code" in r &&
    (r.code === 403 || r.code === 401)
  )
    return !0;
  return !1;
}
//@ chunk-zmmcqmt0.js:263-354 placement
function isClaudeAiBearerRejectedError_2(r) {
  return r instanceof Error && "code" in r && r.code === "CLAUDEAI_BEARER_REJECTED";
}
//@ chunk-zmmcqmt0.js:354-666 placement
function isListAuthError_2(r) {
  if (r instanceof AM) return !0;
  if (isClaudeAiBearerRejectedError_2(r)) return !1;
  if (r instanceof Error && !(r instanceof McpError) && "code" in r) {
    if (r.code === 403) return !r.message.includes("Server returned 403 after trying upscoping");
    if (r.code === 401) return !r.message.includes("Server returned 401 after successful authentication");
  }
  return !1;
}

export { isListAuthError, isClaudeAiBearerRejectedError, isListAuthError_2, isClaudeAiBearerRejectedError_2 };
