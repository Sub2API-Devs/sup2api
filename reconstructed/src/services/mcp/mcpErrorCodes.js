/**
 * services/mcp/mcpErrorCodes.ts
 *
 * 2.1.316 新增：MCP JSON-RPC 错误码判定（MethodNotFound、InvalidParams、UrlElicitationRequired）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-72dd9akm.js (7)
 * attribution: placement 7
 */
import {
  ProtocolErrorCode,
  ProtocolError,
} from "../../../vendor/@modelcontextprotocol/client/dist/src-D_zzAWoS.mjs";

//@ chunk-72dd9akm.js:258-299 placement
/**
 * 视为参数类错误的 JSON-RPC 码集合（-32002、InvalidParams）。
 */
var PARAMS_ERROR_CODES = new Set([-32002, ProtocolErrorCode.InvalidParams]);
//@ chunk-72dd9akm.js:299-350 placement
/**
 * 取 ProtocolError 的 code。
 */
function protocolErrorCode(o) {
  return o instanceof ProtocolError ? o.code : undefined;
}
//@ chunk-72dd9akm.js:350-415 placement
/**
 * 判断是否为 MethodNotFound。
 */
function isMethodNotFoundError(o) {
  return o instanceof ProtocolError && o.code === ProtocolErrorCode.MethodNotFound;
}
//@ chunk-72dd9akm.js:415-509 placement
/**
 * 判断是否为 MethodNotFound 或 InvalidParams。
 */
function isMethodNotFoundOrInvalidParams(o) {
  return (
    o instanceof ProtocolError &&
    (o.code === ProtocolErrorCode.MethodNotFound || o.code === ProtocolErrorCode.InvalidParams)
  );
}
//@ chunk-72dd9akm.js:509-561 placement
/**
 * 判断是否属于参数类错误码。
 */
function isParamsOrInvalidError(o) {
  return o instanceof ProtocolError && PARAMS_ERROR_CODES.has(o.code);
}
//@ chunk-72dd9akm.js:561-625 placement
/**
 * 判断是否为 InvalidParams。
 */
function isInvalidParamsError(o) {
  return o instanceof ProtocolError && o.code === ProtocolErrorCode.InvalidParams;
}
//@ chunk-72dd9akm.js:625-698 placement
/**
 * 判断是否为 UrlElicitationRequired。
 */
function isUrlElicitationRequiredError(o) {
  return o instanceof ProtocolError && o.code === ProtocolErrorCode.UrlElicitationRequired;
}
