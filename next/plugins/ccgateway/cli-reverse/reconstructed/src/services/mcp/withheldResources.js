/**
 * services/mcp/withheldResources.ts
 *
 * 2.1.316 新增：被扣留的 MCP 资源
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isCliOwnedConfig } from "./cliOwnedClients.js";
import { isRunnerDynamicServer } from "../analytics/metadata.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { hostedDesktopRefusal_2 } from "./mcpWireUtils.js";
import { isMemoryToolServer_2 } from "../../memdir/memoryTool.js";

//@ chunk-5xgkngpb.js:3375460-3375735 placement
function artifactsResourcesWithheld(connection) {
  return (isCliOwnedConfig(connection.config)
    ? require("../artifacts/artifactsMcpLaptop.js").isArtifactsMcpLaptopEntry(connection.config)
    : false) || isRunnerDynamicServer(connection.config)
    ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Server "${connection.name}" is the Artifacts MCP server; Claude Code doesn't read its resources. Use its tools.`,
        "artifacts MCP resources withheld",
      )
    : undefined;
}
//@ chunk-5xgkngpb.js:3375735-3375990 placement
function resourcesWithheldError(connection, agentId) {
  return (
    hostedDesktopRefusal_2(connection) ??
    artifactsResourcesWithheld(connection) ??
    (agentId !== undefined && isMemoryToolServer_2(connection)
      ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Server "${connection.name}" is the account memory server; its resources are not available to a subagent. Use its tools if you have them.`,
          "account memory resources withheld from subagent",
        )
      : undefined)
  );
}
//@ chunk-5xgkngpb.js:3375990-3376033 placement
/**
 * 该资源是否被扣留（存在错误）。
 */
function hasWithheldResources(connection, agentId) {
  return resourcesWithheldError(connection, agentId) !== undefined;
}
//@ chunk-5xgkngpb.js:3376033-3376079 placement
/**
 * 资源被扣留时抛出错误。
 */
function throwIfWithheldResources(connection, agentId) {
  let error = resourcesWithheldError(connection, agentId);
  if (error) throw error;
}
export { hasWithheldResources, throwIfWithheldResources };
