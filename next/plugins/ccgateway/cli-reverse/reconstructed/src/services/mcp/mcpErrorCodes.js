/**
 * services/mcp/mcpErrorCodes.ts
 *
 * 2.1.316 新增：MCP JSON-RPC 错误码判定（MethodNotFound、InvalidParams、UrlElicitationRequired）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a5k4nhz1.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  ProtocolErrorCode,
  ProtocolError,
} from "../../../vendor/@modelcontextprotocol/client/dist/src-D_zzAWoS.mjs";

//@ chunk-a5k4nhz1.js:258-299 placement
/**
 * 视为参数类错误的 JSON-RPC 码集合（-32002、InvalidParams）。
 */
var PARAMS_ERROR_CODES = new Set([-32002, ProtocolErrorCode.InvalidParams]);
//@ chunk-a5k4nhz1.js:299-350 placement
/**
 * 取 ProtocolError 的 code。
 */
function protocolErrorCode(error) {
  return error instanceof ProtocolError ? error.code : undefined;
}
//@ chunk-a5k4nhz1.js:350-415 placement
/**
 * 判断是否为 MethodNotFound。
 */
function isMethodNotFoundError(error) {
  return error instanceof ProtocolError && error.code === ProtocolErrorCode.MethodNotFound;
}
//@ chunk-a5k4nhz1.js:415-509 placement
/**
 * 判断是否为 MethodNotFound 或 InvalidParams。
 */
function isMethodNotFoundOrInvalidParams(error) {
  return (
    error instanceof ProtocolError &&
    (error.code === ProtocolErrorCode.MethodNotFound || error.code === ProtocolErrorCode.InvalidParams)
  );
}
//@ chunk-a5k4nhz1.js:509-561 placement
/**
 * 判断是否属于参数类错误码。
 */
function isParamsOrInvalidError(error) {
  return error instanceof ProtocolError && PARAMS_ERROR_CODES.has(error.code);
}
//@ chunk-a5k4nhz1.js:561-625 placement
/**
 * 判断是否为 InvalidParams。
 */
function isInvalidParamsError(error) {
  return error instanceof ProtocolError && error.code === ProtocolErrorCode.InvalidParams;
}
//@ chunk-a5k4nhz1.js:625-698 placement
/**
 * 判断是否为 UrlElicitationRequired。
 */
function isUrlElicitationRequiredError(error) {
  return error instanceof ProtocolError && error.code === ProtocolErrorCode.UrlElicitationRequired;
}
export {
  protocolErrorCode,
  isMethodNotFoundError,
  isInvalidParamsError,
  isParamsOrInvalidError,
  isMethodNotFoundOrInvalidParams,
  isUrlElicitationRequiredError,
};
