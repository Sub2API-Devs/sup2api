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
  JSONRPCMessageSchema as JSONRPCMessageSchema_2,
} from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js";
import { logMCPDebug } from "../../utils/log.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";

//@ chunk-z1n5m6nf.js:155462-155558 placement = countToolCallsSince (1)
function getFirstToolUseId_2(message) {
  if (message.message.content[0]?.type !== "tool_use") return;
  return message.message.content[0].id;
}
//@ chunk-z1n5m6nf.js:155558-156534 placement
function validateHostManifest_2(serverName, manifest) {
  if (manifest === undefined) return;
  let parseResult = InitializeResultSchema.safeParse(manifest.initializeResult);
  if (
    !parseResult.success ||
    !SUPPORTED_PROTOCOL_VERSIONS.includes(parseResult.data.protocolVersion) ||
    !isValidJsonRpcResult(manifest.initializeResult)
  ) {
    logMCPDebug(
      serverName,
      "Host manifest initializeResult is not a valid InitializeResult for this client \u2014 handshaking over the control channel instead",
    );
    logFeatureSad("mcp_sdk_manifest", "mcp_sdk_manifest_invalid_initialize");
    return;
  }
  if (
    manifest.toolsListResult !== undefined &&
    (!ListToolsResultSchema.safeParse(manifest.toolsListResult).success ||
      !isValidJsonRpcResult(manifest.toolsListResult))
  ) {
    logMCPDebug(
      serverName,
      "Host manifest toolsListResult is not a valid ListToolsResult \u2014 handshaking over the control channel instead",
    );
    logFeatureSad("mcp_sdk_manifest", "mcp_sdk_manifest_invalid_tools_list");
    return;
  }
  if (manifest.toolsListResult !== undefined && manifest.toolsListResult.nextCursor !== undefined) {
    logMCPDebug(
      serverName,
      "Host manifest toolsListResult is paginated (nextCursor) \u2014 replaying initialize only and listing tools over the control channel",
    );
    logFeatureSad("mcp_sdk_manifest", "mcp_sdk_manifest_paginated_tools_list");
    return {
      initializeResult: manifest.initializeResult,
    };
  }
  return manifest;
}
//@ chunk-z1n5m6nf.js:156534-156608 placement
/**
 * 校验对象是否为合法 JSON-RPC 结果（v1 副本）。
 */
function isValidJsonRpcResult(result) {
  return JSONRPCMessageSchema_2.safeParse({
    jsonrpc: "2.0",
    id: 0,
    result,
  }).success;
}
//@ chunk-z1n5m6nf.js:156608-156945 placement
/**
 * 记录 SDK 宿主 MCP 清单的结果（v1 副本）。
 */
function logManifestOutcomeV1(manifestOutcome, ok) {
  switch (manifestOutcome) {
    case "none":
    case "pending":
      return;
    case "replayed":
      if (ok) logFeatureOk("mcp_sdk_manifest");
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
