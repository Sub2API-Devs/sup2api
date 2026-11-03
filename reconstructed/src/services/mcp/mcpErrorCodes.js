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
import { ma, ProtocolError } from "../../../vendor/@modelcontextprotocol/client/dist/src-D_zzAWoS.mjs";

//@ chunk-72dd9akm.js:258-299 placement
var n = new Set([-32002, ma.InvalidParams]);
//@ chunk-72dd9akm.js:299-350 placement
function e(o) {
  return o instanceof ProtocolError ? o.code : void 0;
}
//@ chunk-72dd9akm.js:350-415 placement
function t(o) {
  return o instanceof ProtocolError && o.code === ma.MethodNotFound;
}
//@ chunk-72dd9akm.js:415-509 placement
function c(o) {
  return o instanceof ProtocolError && (o.code === ma.MethodNotFound || o.code === ma.InvalidParams);
}
//@ chunk-72dd9akm.js:509-561 placement
function i(o) {
  return o instanceof ProtocolError && n.has(o.code);
}
//@ chunk-72dd9akm.js:561-625 placement
function u(o) {
  return o instanceof ProtocolError && o.code === ma.InvalidParams;
}
//@ chunk-72dd9akm.js:625-698 placement
function d(o) {
  return o instanceof ProtocolError && o.code === ma.UrlElicitationRequired;
}
