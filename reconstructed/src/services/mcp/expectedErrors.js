/**
 * services/mcp/expectedErrors.ts
 *
 * 预期中的 MCP 错误判定（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f1mqry73.js (2)
 * attribution: placement 2
 */
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { StreamableHTTPError } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/client/streamableHttp.js";

//@ chunk-f1mqry73.js:375-582 placement
var EXPECTED_MCP_ERROR_NAMES = new Set([
  "ClaudeAiProxyBearerRejectedError",
  "McpAuthError",
  "McpError",
  "McpResponseSchemaError",
  "McpToolCallError",
  "ProtocolError",
  "SdkError",
  "SdkHttpError",
  "StreamableHTTPError",
  "TelemetrySafeError",
]);
//@ chunk-f1mqry73.js:582-953 placement
function isExpectedMcpError(r) {
  if (r instanceof DOMException) return r.name === "TimeoutError";
  if (!(r instanceof Error)) return false;
  if (r instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) return true;
  if (r instanceof StreamableHTTPError) return true;
  if (
    (("errorCode" in r && typeof r.errorCode === "string") || ("code" in r && typeof r.code === "string")) &&
    /^HTTP 40[13]\b/.test(r.message)
  )
    return true;
  let e = r.name !== "Error" ? r.name : (r.constructor?.name ?? "");
  return EXPECTED_MCP_ERROR_NAMES.has(e);
}
