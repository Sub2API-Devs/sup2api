/**
 * services/mcp/withheldResources.ts
 *
 * 2.1.316 新增：被扣留的 MCP 资源
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: placement 4
 */
import { isCliOwnedConfig } from "./cliOwnedClients.js";
import { isRunnerDynamicServer } from "../analytics/metadata.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { hostedDesktopRefusal_2 } from "./mcpWireUtils.js";
import { isMemoryToolServer_2 } from "../../memdir/memoryTool.js";

//@ chunk-e6aww6q8.js:3289667-3289942 placement
function artifactsResourcesWithheld(e) {
  return (isCliOwnedConfig(e.config)
    ? require("./chunk-d5fbj7hf.js").isArtifactsMcpLaptopEntry(e.config)
    : false) || isRunnerDynamicServer(e.config)
    ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Server "${e.name}" is the Artifacts MCP server; Claude Code doesn't read its resources. Use its tools.`,
        "artifacts MCP resources withheld",
      )
    : undefined;
}
//@ chunk-e6aww6q8.js:3289942-3290197 placement
function resourcesWithheldError(e, n) {
  return (
    hostedDesktopRefusal_2(e) ??
    artifactsResourcesWithheld(e) ??
    (n !== undefined && isMemoryToolServer_2(e)
      ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Server "${e.name}" is the account memory server; its resources are not available to a subagent. Use its tools if you have them.`,
          "account memory resources withheld from subagent",
        )
      : undefined)
  );
}
//@ chunk-e6aww6q8.js:3290197-3290240 placement
/**
 * 该资源是否被扣留（存在错误）。
 */
function hasWithheldResources(e, agentId) {
  return resourcesWithheldError(e, agentId) !== undefined;
}
//@ chunk-e6aww6q8.js:3290240-3290286 placement
/**
 * 资源被扣留时抛出错误。
 */
function throwIfWithheldResources(connectedClient, agentId) {
  let r = resourcesWithheldError(connectedClient, agentId);
  if (r) throw r;
}
export { hasWithheldResources, throwIfWithheldResources };
