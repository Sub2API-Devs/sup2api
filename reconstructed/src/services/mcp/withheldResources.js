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
import { Zl } from "./cliOwnedClients.js";
import { isRunnerDynamicServer } from "../analytics/metadata.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { hostedDesktopRefusal } from "./mcpWireUtils.js";
import { isMemoryToolServer } from "../../memdir/memoryTool.js";

//@ chunk-e6aww6q8.js:3289667-3289942 placement
function artifactsResourcesWithheld(e) {
  return (Zl(e.config) ? require("./chunk-d5fbj7hf.js").isArtifactsMcpLaptopEntry(e.config) : !1) ||
    isRunnerDynamicServer(e.config)
    ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Server "${e.name}" is the Artifacts MCP server; Claude Code doesn't read its resources. Use its tools.`,
        "artifacts MCP resources withheld",
      )
    : void 0;
}
//@ chunk-e6aww6q8.js:3289942-3290197 placement
function resourcesWithheldError(e, n) {
  return (
    hostedDesktopRefusal(e) ??
    artifactsResourcesWithheld(e) ??
    (n !== void 0 && isMemoryToolServer(e)
      ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Server "${e.name}" is the account memory server; its resources are not available to a subagent. Use its tools if you have them.`,
          "account memory resources withheld from subagent",
        )
      : void 0)
  );
}
//@ chunk-e6aww6q8.js:3290197-3290240 placement
function Lfn(e, n) {
  return resourcesWithheldError(e, n) !== void 0;
}
//@ chunk-e6aww6q8.js:3290240-3290286 placement
function Hfn(e, n) {
  let r = resourcesWithheldError(e, n);
  if (r) throw r;
}

export { Lfn, Hfn };
