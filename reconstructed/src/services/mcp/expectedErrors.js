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
function isExpectedMcpError(error) {
  if (error instanceof DOMException) return error.name === "TimeoutError";
  if (!(error instanceof Error)) return false;
  if (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS) return true;
  if (error instanceof StreamableHTTPError) return true;
  if (
    (("errorCode" in error && typeof error.errorCode === "string") ||
      ("code" in error && typeof error.code === "string")) &&
    /^HTTP 40[13]\b/.test(error.message)
  )
    return true;
  let constructorName = error.name !== "Error" ? error.name : (error.constructor?.name ?? "");
  return EXPECTED_MCP_ERROR_NAMES.has(constructorName);
}
export { isExpectedMcpError };
