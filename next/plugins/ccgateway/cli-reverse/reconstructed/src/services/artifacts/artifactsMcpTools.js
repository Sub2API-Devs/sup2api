/**
 * services/artifacts/artifactsMcpTools.ts
 *
 * 2.1.316 新增。Artifacts MCP 工具名，以及云会话中 MCP 工具替代内置 Artifact 工具的规则。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3sqbw5c7.js (12)
 * attribution: placement 12
 */
import { isByocEnvironment } from "../../utils/remoteEnvironment.js";
import { env } from "../../utils/env.js";
import { getSessionIngressAuthToken } from "../../utils/sessionIngressAuth.js";
import { buildMcpToolName } from "../mcp/mcpStringUtils.js";
import { CLAUDE_ARTIFACTS } from "../mcp/firstPartyServerIds.js";
import { hasLiveState, getLiveState } from "../liveReplica/liveReplica.js";
import { ARTIFACT_FAMILY_TOOL_NAMES } from "../../tools/ArtifactTool/constants.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-3sqbw5c7.js:445-620 placement
var ARTIFACTS_MCP_READ_TOOL = "read_artifact";
var ARTIFACTS_MCP_GET_TOOL = "get_artifact";
var ARTIFACTS_MCP_READ_FILE_TOOL = "read_file";
var ARTIFACTS_MCP_READ_SHARED_TOOL = "read_shared_artifact";
var ARTIFACTS_MCP_READ_COMMENTS_TOOL = "read_comments";
var ARTIFACTS_MCP_REPLY_COMMENT_TOOL = "reply_comment";
var ARTIFACTS_MCP_RESOLVE_COMMENT_TOOL = "resolve_comment";
var ARTIFACTS_MCP_REPLY_SHARED_COMMENT_TOOL = "reply_shared_comment";
//@ chunk-3sqbw5c7.js:620-721 placement (2.1.88 match: runFilePersistence, 0.184)
function artifactsMcpInCloudSession() {
  return (
    !isByocEnvironment() &&
    (!!env.CLAUDE_CODE_REMOTE || !!env.CLAUDE_CODE_REMOTE_SESSION_ID || getSessionIngressAuthToken() !== null)
  );
}
//@ chunk-3sqbw5c7.js:721-753 placement
function artifactsMcpToolName(server) {
  return buildMcpToolName(CLAUDE_ARTIFACTS, server);
}
//@ chunk-3sqbw5c7.js:753-824 placement (2.1.88 match: getToolNameForPermissionCheck, 1)
function artifactsMcpToolRef(tool) {
  return {
    name: artifactsMcpToolName(tool),
    mcpInfo: {
      serverName: CLAUDE_ARTIFACTS,
      toolName: tool,
    },
  };
}
//@ chunk-3sqbw5c7.js:824-884 placement
function isBuiltInArtifactHiddenForMcp() {
  return hasLiveState() && getLiveState().builtInArtifactHiddenForMcp;
}
//@ chunk-3sqbw5c7.js:884-1014 placement
function isBuiltInArtifactReplacedByMcp(name) {
  let names = ARTIFACT_FAMILY_TOOL_NAMES;
  return (
    isBuiltInArtifactHiddenForMcp() &&
    [name.name, name.underlyingV1ToolName, name.familyParentToolName].some(
      (name) => name !== undefined && names.includes(name),
    )
  );
}
//@ chunk-3sqbw5c7.js:1014-1083 placement (2.1.88 match: getToolNameForPermissionCheck, 1)
function artifactMcpToolsReplaceBuiltIn(tool) {
  return (
    isBuiltInArtifactHiddenForMcp() && tool.some((tool) => tool.mcpInfo?.serverName === CLAUDE_ARTIFACTS)
  );
}
//@ chunk-3sqbw5c7.js:1083-1139 placement (2.1.88 match: getToolNameForPermissionCheck, 1)
function standsInForBuiltInArtifact(tool) {
  return isBuiltInArtifactHiddenForMcp() && tool.mcpInfo?.serverName === CLAUDE_ARTIFACTS;
}
//@ chunk-3sqbw5c7.js:1139-1212 placement
function mcpReadToolsForHiddenBuiltIn(builtIn) {
  if (!isBuiltInArtifactHiddenForMcp()) return [];
  return [
    ARTIFACTS_MCP_READ_TOOL,
    ARTIFACTS_MCP_GET_TOOL,
    ...(builtIn ? [ARTIFACTS_MCP_READ_FILE_TOOL] : []),
  ].map(artifactsMcpToolRef);
}
//@ chunk-3sqbw5c7.js:1212-1255 placement
class HiddenBuiltInArtifactToolSlot {
  tool = null;
  register(tool) {
    this.tool = tool;
  }
}
//@ chunk-3sqbw5c7.js:1255-1269 placement
var hiddenBuiltInArtifactToolSlot; // deferred: uses HiddenBuiltInArtifactToolSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-3sqbw5c7.js:1255", () => {
  hiddenBuiltInArtifactToolSlot = new HiddenBuiltInArtifactToolSlot();
});
//@ chunk-3sqbw5c7.js:1269-1320 placement
function hiddenBuiltInArtifactTool() {
  return isBuiltInArtifactHiddenForMcp() ? (hiddenBuiltInArtifactToolSlot.tool ?? undefined) : undefined;
}
export {
  isBuiltInArtifactHiddenForMcp,
  hiddenBuiltInArtifactTool,
  artifactsMcpInCloudSession,
  ARTIFACTS_MCP_READ_COMMENTS_TOOL,
  ARTIFACTS_MCP_REPLY_COMMENT_TOOL,
  hiddenBuiltInArtifactToolSlot,
  artifactsMcpToolRef,
  ARTIFACTS_MCP_REPLY_SHARED_COMMENT_TOOL,
  artifactsMcpToolName,
  ARTIFACTS_MCP_RESOLVE_COMMENT_TOOL,
  isBuiltInArtifactReplacedByMcp,
  ARTIFACTS_MCP_READ_TOOL,
  ARTIFACTS_MCP_GET_TOOL,
  ARTIFACTS_MCP_READ_SHARED_TOOL,
  ARTIFACTS_MCP_READ_FILE_TOOL,
  artifactMcpToolsReplaceBuiltIn,
  mcpReadToolsForHiddenBuiltIn,
  standsInForBuiltInArtifact,
};
