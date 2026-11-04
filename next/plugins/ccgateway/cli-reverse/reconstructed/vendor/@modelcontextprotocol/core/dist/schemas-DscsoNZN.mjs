/**
 * @modelcontextprotocol/core/dist/schemas-DscsoNZN.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/core@2.0.0
 * pieces: chunk-8t8n4kdh.js (2), chunk-r1g76qsy.js (1)
 * attribution: esm-fingerprint 1, esm-layout 2
 */
import { MCP_PROTOCOL_NEXT, MCP_PROTOCOL_LATEST } from "../../../../src/services/mcp/mcpCallConstants.js";
import { lit, fromEnum } from "../../../../src/services/analytics/safeMetadata.js";

//@ chunk-r1g76qsy.js:65920-66033 esm-layout
var IO_MODELCONTEXTPROTOCOL_TASKS = "io.modelcontextprotocol/tasks";
var TASK_STATUSES = new Set(["working", "input_required", "completed", "failed", "cancelled"]);
//@ chunk-8t8n4kdh.js:205823-205892 esm-fingerprint
var SUPPORTED_PROTOCOL_VERSIONS = [
  MCP_PROTOCOL_NEXT,
  MCP_PROTOCOL_LATEST,
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
  "2024-10-07",
];
//@ chunk-8t8n4kdh.js:205892-205988 esm-layout
function protocolVersionLiteral(negotiatedProtocolVersion) {
  if (negotiatedProtocolVersion === undefined) return;
  let found = SUPPORTED_PROTOCOL_VERSIONS.find((value) => value === negotiatedProtocolVersion);
  return found === undefined ? lit("other") : fromEnum(found);
}
export { protocolVersionLiteral, TASK_STATUSES, IO_MODELCONTEXTPROTOCOL_TASKS };
