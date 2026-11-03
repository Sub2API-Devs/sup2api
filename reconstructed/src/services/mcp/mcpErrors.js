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
var o = new Set([-32002, ErrorCode.InvalidParams]);
//@ chunk-7mmyrw4c.js:271-322 placement
function e(n) {
  return n instanceof McpError ? n.code : void 0;
}
//@ chunk-7mmyrw4c.js:322-387 placement
function t(n) {
  return n instanceof McpError && n.code === ErrorCode.MethodNotFound;
}
//@ chunk-7mmyrw4c.js:387-481 placement
function i(n) {
  return n instanceof McpError && (n.code === ErrorCode.MethodNotFound || n.code === ErrorCode.InvalidParams);
}
//@ chunk-7mmyrw4c.js:481-533 placement
function c(n) {
  return n instanceof McpError && o.has(n.code);
}
//@ chunk-7mmyrw4c.js:533-597 placement
function u(n) {
  return n instanceof McpError && n.code === ErrorCode.InvalidParams;
}
//@ chunk-7mmyrw4c.js:597-670 placement
function d(n) {
  return n instanceof McpError && n.code === ErrorCode.UrlElicitationRequired;
}
