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
import { UnauthorizedError as UnauthorizedError_2 } from "../../../vendor/@modelcontextprotocol/client/dist/index.mjs";
import {
  SdkHttpError,
  SdkErrorCode,
  ProtocolError,
  SdkError,
} from "../../../vendor/@modelcontextprotocol/client/dist/src-D_zzAWoS.mjs";
import { UnauthorizedError } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/auth.js";
import { McpError } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js";

//@ chunk-s7nhrpfy.js:239-330 placement
function isClaudeAiBearerRejectedError(r) {
  return r instanceof Error && "code" in r && r.code === "CLAUDEAI_BEARER_REJECTED";
}
//@ chunk-s7nhrpfy.js:330-645 placement
/**
 * MCP 列表请求的认证错误判定。
 */
function isListAuthError(error) {
  if (error instanceof UnauthorizedError_2) return true;
  if (isClaudeAiBearerRejectedError(error)) return false;
  if (error instanceof SdkHttpError && (error.status === 403 || error.status === 401))
    return (
      error.code !== SdkErrorCode.ClientHttpAuthentication && error.code !== SdkErrorCode.ClientHttpForbidden
    );
  if (
    error instanceof Error &&
    !(error instanceof ProtocolError) &&
    !(error instanceof SdkError) &&
    "code" in error &&
    (error.code === 403 || error.code === 401)
  )
    return true;
  return false;
}
//@ chunk-zmmcqmt0.js:263-354 placement
function isClaudeAiBearerRejectedError_2(error) {
  return error instanceof Error && "code" in error && error.code === "CLAUDEAI_BEARER_REJECTED";
}
//@ chunk-zmmcqmt0.js:354-666 placement
function isListAuthError_2(error) {
  if (error instanceof UnauthorizedError) return true;
  if (isClaudeAiBearerRejectedError_2(error)) return false;
  if (error instanceof Error && !(error instanceof McpError) && "code" in error) {
    if (error.code === 403) return !error.message.includes("Server returned 403 after trying upscoping");
    if (error.code === 401)
      return !error.message.includes("Server returned 401 after successful authentication");
  }
  return false;
}
export { isListAuthError, isClaudeAiBearerRejectedError, isListAuthError_2, isClaudeAiBearerRejectedError_2 };
