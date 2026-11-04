/**
 * services/mcp/mcpErrors.ts
 *
 * 2.1.316 新增：MCP 相关错误类。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7mmyrw4c.js (7)
 * attribution: placement 7
 */
import { ErrorCode, McpError } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js";

//@ chunk-7mmyrw4c.js:230-271 placement
/**
 * 视为参数类错误的码集合（McpError 版本）。
 */
var PARAMS_ERROR_CODES = new Set([-32002, ErrorCode.InvalidParams]);
//@ chunk-7mmyrw4c.js:271-322 placement
/**
 * 取 McpError 的 code。
 */
function mcpErrorCode(error) {
  return error instanceof McpError ? error.code : undefined;
}
//@ chunk-7mmyrw4c.js:322-387 placement
/**
 * 判断是否为 MethodNotFound。
 */
function isMethodNotFoundError(error) {
  return error instanceof McpError && error.code === ErrorCode.MethodNotFound;
}
//@ chunk-7mmyrw4c.js:387-481 placement
/**
 * 判断是否为 MethodNotFound 或 InvalidParams。
 */
function isMethodNotFoundOrInvalidParams(error) {
  return (
    error instanceof McpError &&
    (error.code === ErrorCode.MethodNotFound || error.code === ErrorCode.InvalidParams)
  );
}
//@ chunk-7mmyrw4c.js:481-533 placement
/**
 * 判断是否属于参数类错误码。
 */
function isParamsOrInvalidError(error) {
  return error instanceof McpError && PARAMS_ERROR_CODES.has(error.code);
}
//@ chunk-7mmyrw4c.js:533-597 placement
/**
 * 判断是否为 InvalidParams。
 */
function isInvalidParamsError(error) {
  return error instanceof McpError && error.code === ErrorCode.InvalidParams;
}
//@ chunk-7mmyrw4c.js:597-670 placement
/**
 * 判断是否为 UrlElicitationRequired。
 */
function isUrlElicitationRequiredError(error) {
  return error instanceof McpError && error.code === ErrorCode.UrlElicitationRequired;
}
export {
  mcpErrorCode,
  isMethodNotFoundError,
  isInvalidParamsError,
  isParamsOrInvalidError,
  isMethodNotFoundOrInvalidParams,
  isUrlElicitationRequiredError,
};
