/**
 * @modelcontextprotocol/core/dist/schemas-DscsoNZN.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @modelcontextprotocol/core@2.0.0
 * pieces: chunk-qq5knpkd.js (1), chunk-sywnjtqb.js (2)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { MCP_PROTOCOL_NEXT, MCP_PROTOCOL_LATEST } from "../../../../src/services/mcp/mcpCallConstants.js";
import { lit, fromEnum } from "../../../../src/services/analytics/safeMetadata.js";

//@ chunk-qq5knpkd.js:70402-70515 esm-layout
var IO_MODELCONTEXTPROTOCOL_TASKS = "io.modelcontextprotocol/tasks";
var TASK_STATUSES = new Set(["working", "input_required", "completed", "failed", "cancelled"]);
//@ chunk-sywnjtqb.js:208003-208072 esm-fingerprint
var SUPPORTED_PROTOCOL_VERSIONS = [
  MCP_PROTOCOL_NEXT,
  MCP_PROTOCOL_LATEST,
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
  "2024-10-07",
];
//@ chunk-sywnjtqb.js:208072-208168 esm-layout
function protocolVersionLiteral(negotiatedProtocolVersion) {
  if (negotiatedProtocolVersion === undefined) return;
  let found = SUPPORTED_PROTOCOL_VERSIONS.find((value) => value === negotiatedProtocolVersion);
  return found === undefined ? lit("other") : fromEnum(found);
}
export { protocolVersionLiteral, TASK_STATUSES, IO_MODELCONTEXTPROTOCOL_TASKS };
