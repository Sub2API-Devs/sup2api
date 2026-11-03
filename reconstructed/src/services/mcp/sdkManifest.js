/**
 * services/mcp/sdkManifest.ts
 *
 * 2.1.316 新增。SDK 宿主清单校验。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-z1n5m6nf.js (4)
 * attribution: placement 4
 */
import {
  InitializeResultSchema,
  SUPPORTED_PROTOCOL_VERSIONS,
  ListToolsResultSchema,
  JSONRPCMessageSchema,
} from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js";
import { logMCPDebug } from "../../utils/log.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";

//@ chunk-z1n5m6nf.js:155462-155558 placement = countToolCallsSince (1)
function getFirstToolUseId_2(e) {
  if (e.message.content[0]?.type !== "tool_use") return;
  return e.message.content[0].id;
}
//@ chunk-z1n5m6nf.js:155558-156534 placement
function validateHostManifest_2(e, r) {
  if (r === undefined) return;
  let n = InitializeResultSchema.safeParse(r.initializeResult);
  if (
    !n.success ||
    !SUPPORTED_PROTOCOL_VERSIONS.includes(n.data.protocolVersion) ||
    !isValidJsonRpcResult(r.initializeResult)
  ) {
    logMCPDebug(
      e,
      "Host manifest initializeResult is not a valid InitializeResult for this client \u2014 handshaking over the control channel instead",
    );
    logFeatureSad("mcp_sdk_manifest", "mcp_sdk_manifest_invalid_initialize");
    return;
  }
  if (
    r.toolsListResult !== undefined &&
    (!ListToolsResultSchema.safeParse(r.toolsListResult).success || !isValidJsonRpcResult(r.toolsListResult))
  ) {
    logMCPDebug(
      e,
      "Host manifest toolsListResult is not a valid ListToolsResult \u2014 handshaking over the control channel instead",
    );
    logFeatureSad("mcp_sdk_manifest", "mcp_sdk_manifest_invalid_tools_list");
    return;
  }
  if (r.toolsListResult !== undefined && r.toolsListResult.nextCursor !== undefined) {
    logMCPDebug(
      e,
      "Host manifest toolsListResult is paginated (nextCursor) \u2014 replaying initialize only and listing tools over the control channel",
    );
    logFeatureSad("mcp_sdk_manifest", "mcp_sdk_manifest_paginated_tools_list");
    return {
      initializeResult: r.initializeResult,
    };
  }
  return r;
}
//@ chunk-z1n5m6nf.js:156534-156608 placement
/**
 * 校验对象是否为合法 JSON-RPC 结果（v1 副本）。
 */
function isValidJsonRpcResult(result) {
  return JSONRPCMessageSchema.safeParse({
    jsonrpc: "2.0",
    id: 0,
    result,
  }).success;
}
//@ chunk-z1n5m6nf.js:156608-156945 placement
/**
 * 记录 SDK 宿主 MCP 清单的结果（v1 副本）。
 */
function logManifestOutcomeV1(manifestOutcome, r) {
  switch (manifestOutcome) {
    case "none":
    case "pending":
      return;
    case "replayed":
      if (r) logFeatureOk("mcp_sdk_manifest");
      else logFeatureBad("mcp_sdk_manifest", "mcp_sdk_manifest_replay_failed");
      return;
    case "protocol_version_mismatch":
    case "client_capabilities_declared":
    case "malformed_result":
    case "unexpected_message":
      logFeatureSad("mcp_sdk_manifest", `mcp_sdk_manifest_${manifestOutcome}`);
      return;
  }
}
export { validateHostManifest_2, logManifestOutcomeV1, getFirstToolUseId_2 };
