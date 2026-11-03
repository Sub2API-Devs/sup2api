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
import { op } from "../../utils/remoteEnvironment.js";
import { env } from "../../utils/env.js";
import { getSessionIngressAuthToken } from "../../utils/sessionIngressAuth.js";
import { buildMcpToolName } from "../mcp/mcpStringUtils.js";
import { CLAUDE_ARTIFACTS } from "../mcp/firstPartyServerIds.js";
import { hasLiveState, getLiveState } from "../liveReplica/liveReplica.js";
import { ARTIFACT_FAMILY_TOOL_NAMES } from "../../tools/ArtifactTool/constants.js";

//@ chunk-3sqbw5c7.js:445-620 placement
var ARTIFACTS_MCP_READ_TOOL = "read_artifact",
  ARTIFACTS_MCP_GET_TOOL = "get_artifact",
  ARTIFACTS_MCP_READ_FILE_TOOL = "read_file",
  ARTIFACTS_MCP_READ_SHARED_TOOL = "read_shared_artifact",
  ARTIFACTS_MCP_READ_COMMENTS_TOOL = "read_comments",
  ARTIFACTS_MCP_REPLY_COMMENT_TOOL = "reply_comment",
  ARTIFACTS_MCP_RESOLVE_COMMENT_TOOL = "resolve_comment",
  ARTIFACTS_MCP_REPLY_SHARED_COMMENT_TOOL = "reply_shared_comment";
//@ chunk-3sqbw5c7.js:620-721 placement = runFilePersistence (0.184)
function artifactsMcpInCloudSession() {
  return (
    !op() &&
    (!!env.CLAUDE_CODE_REMOTE || !!env.CLAUDE_CODE_REMOTE_SESSION_ID || getSessionIngressAuthToken() !== null)
  );
}
//@ chunk-3sqbw5c7.js:721-753 placement
function artifactsMcpToolName(e) {
  return buildMcpToolName(CLAUDE_ARTIFACTS, e);
}
//@ chunk-3sqbw5c7.js:753-824 placement = getToolNameForPermissionCheck (1)
function artifactsMcpToolRef(tool) {
  return { name: artifactsMcpToolName(tool), mcpInfo: { serverName: CLAUDE_ARTIFACTS, toolName: tool } };
}
//@ chunk-3sqbw5c7.js:824-884 placement
function isBuiltInArtifactHiddenForMcp() {
  return hasLiveState() && getLiveState().builtInArtifactHiddenForMcp;
}
//@ chunk-3sqbw5c7.js:884-1014 placement
function isBuiltInArtifactReplacedByMcp(e) {
  let o = ARTIFACT_FAMILY_TOOL_NAMES;
  return (
    isBuiltInArtifactHiddenForMcp() &&
    [e.name, e.underlyingV1ToolName, e.familyParentToolName].some((t) => t !== void 0 && o.includes(t))
  );
}
//@ chunk-3sqbw5c7.js:1014-1083 placement = getToolNameForPermissionCheck (1)
function artifactMcpToolsReplaceBuiltIn(tool) {
  return isBuiltInArtifactHiddenForMcp() && tool.some((o) => o.mcpInfo?.serverName === CLAUDE_ARTIFACTS);
}
//@ chunk-3sqbw5c7.js:1083-1139 placement = getToolNameForPermissionCheck (1)
function standsInForBuiltInArtifact(tool) {
  return isBuiltInArtifactHiddenForMcp() && tool.mcpInfo?.serverName === CLAUDE_ARTIFACTS;
}
//@ chunk-3sqbw5c7.js:1139-1212 placement
function mcpReadToolsForHiddenBuiltIn(e) {
  if (!isBuiltInArtifactHiddenForMcp()) return [];
  return [ARTIFACTS_MCP_READ_TOOL, ARTIFACTS_MCP_GET_TOOL, ...(e ? [ARTIFACTS_MCP_READ_FILE_TOOL] : [])].map(
    artifactsMcpToolRef,
  );
}
//@ chunk-3sqbw5c7.js:1212-1255 placement
class n {
  tool = null;
  register(e) {
    this.tool = e;
  }
}
//@ chunk-3sqbw5c7.js:1255-1269 placement
var hiddenBuiltInArtifactToolSlot = new n();
//@ chunk-3sqbw5c7.js:1269-1320 placement
function hiddenBuiltInArtifactTool() {
  return isBuiltInArtifactHiddenForMcp() ? (hiddenBuiltInArtifactToolSlot.tool ?? void 0) : void 0;
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
};
