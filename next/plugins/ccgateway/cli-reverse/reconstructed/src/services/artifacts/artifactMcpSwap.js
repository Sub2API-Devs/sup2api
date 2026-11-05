/**
 * services/artifacts/artifactMcpSwap.ts
 *
 * 2.1.316 新增。Artifact MCP 服务切换。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-70g559f4.js (1), chunk-v7crmwhb.js (14)
 * attribution: placement 15
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { startupCcrEnv } from "../../tasks/RemoteAgentTask/remoteAgentKinds.js";
import { isRunnerDynamicServer } from "../analytics/metadata.js";
import { artifactsMcpClient, isEntryRowNotServed } from "../mcp/client.js";
import {
  isBuiltInArtifactHiddenForMcp,
  artifactsMcpInCloudSession,
  ARTIFACTS_MCP_READ_COMMENTS_TOOL,
  ARTIFACTS_MCP_REPLY_SHARED_COMMENT_TOOL,
} from "./artifactsMcpTools.js";
import { CLAUDE_ARTIFACTS } from "../mcp/firstPartyServerIds.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { emitSummonArmsForActivity } from "./summonArms.js";
import { isArtifactFamilyTool } from "./rosterWait.js";
import { isRemoteToolsForwardEnabled2 } from "../../bridge/deviceRegistration.js";
import { isRemoteToolForwardingEnabledCached } from "../remoteTools/servingGates.js";
import {
  REMOTE_DEVICES_SERVER_NAME,
  getToolNameForPermissionCheck_3 as getToolNameForPermissionCheck_3_2,
  getToolNameForPermissionCheck_2 as getToolNameForPermissionCheck_2_2,
  DEVICE_BASH,
} from "../remoteTools/backgroundCommands.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";

//@ chunk-v7crmwhb.js:535-689 placement
function getArtifactsMcpEntryPredicate() {
  if (startupCcrEnv.isSelfHostedRunnerChild) return isRunnerDynamicServer;
  if (artifactsMcpClient() === undefined && !isBuiltInArtifactHiddenForMcp()) return null;
  return require("./artifactsMcpLaptop.js").isArtifactsMcpLaptopEntry;
}
//@ chunk-v7crmwhb.js:689-755 placement
function findMcpRowEntry(matchesConfig) {
  let client = artifactsMcpClient();
  return client !== undefined && matchesConfig(client.config) ? client : undefined;
}
//@ chunk-v7crmwhb.js:755-858 placement
function isMcpEntryUsable(name) {
  let mcpRowEntry = findMcpRowEntry(name);
  if (mcpRowEntry === undefined || isEntryRowNotServed(mcpRowEntry)) return false;
  return mcpRowEntry.type === "connected" || mcpRowEntry.type === "cached";
}
//@ chunk-v7crmwhb.js:858-946 placement
function _() {
  return require("./artifactToolGates.js").artifactToolWithholdingGate() !== null;
}
//@ chunk-v7crmwhb.js:946-1016 placement
function mcpRowToolNames() {
  return require("./artifactMcpWire.js").MCP_ROW_TOOL_NAMES;
}
//@ chunk-v7crmwhb.js:1016-1156 placement (2.1.88 match: getToolNameForPermissionCheck, 1)
function getToolNameForPermissionCheck_2(tool) {
  let flattened = tool.flatMap((tool) =>
    tool.mcpInfo?.serverName === CLAUDE_ARTIFACTS ? [tool.mcpInfo.toolName] : [],
  );
  return (
    !artifactsMcpInCloudSession() ||
    isBuiltInArtifactHiddenForMcp() ||
    (flattened.includes(ARTIFACTS_MCP_READ_COMMENTS_TOOL) &&
      flattened.includes(ARTIFACTS_MCP_REPLY_SHARED_COMMENT_TOOL))
  );
}
//@ chunk-v7crmwhb.js:1156-1266 placement (2.1.88 match: getToolNameForPermissionCheck, 1)
function getToolNameForPermissionCheck_3(tool) {
  let names = mcpRowToolNames();
  return (
    tool.some(
      (name) => name.mcpInfo?.serverName === CLAUDE_ARTIFACTS && !names.includes(name.mcpInfo.toolName),
    ) && getToolNameForPermissionCheck_2(tool)
  );
}
//@ chunk-v7crmwhb.js:1266-1527 placement (2.1.88 match: getToolNameForPermissionCheck, 1)
/**
 * （归属疑误：工具集组装/Artifacts）Artifacts 内置工具与 MCP 版本的切换过滤。
 */
function getToolNameForPermissionCheck_4(tool, permissionTools = tool) {
  let artifactsMcpEntryPredicate = getArtifactsMcpEntryPredicate();
  if (artifactsMcpEntryPredicate === null) return [...tool];
  let others = () => tool.filter((tool) => tool.mcpInfo?.serverName !== CLAUDE_ARTIFACTS);
  let mcpRowEntry = findMcpRowEntry(artifactsMcpEntryPredicate);
  if (mcpRowEntry !== undefined && (isEntryRowNotServed(mcpRowEntry) || _())) return others();
  let tool_2 = permissionTools.filter((tool) => tool.mcpInfo?.serverName === CLAUDE_ARTIFACTS);
  if (
    tool_2.length === 0 ||
    (getToolNameForPermissionCheck_3(tool_2) && getToolNameForPermissionCheck_2(tool)) ||
    !isMcpEntryUsable(artifactsMcpEntryPredicate)
  )
    return [...tool];
  return others();
}
//@ chunk-v7crmwhb.js:1527-1757 placement
/**
 * （归属疑误：Artifacts）首次切换到 Artifacts MCP 时隐藏内置工具并记录 artifact_mcp_swap。
 */
function swapToArtifactsMcp(tools, tool) {
  if (!isBuiltInArtifactHiddenForMcp()) {
    let entryPredicate = getArtifactsMcpEntryPredicate();
    if (
      entryPredicate === null ||
      !getToolNameForPermissionCheck_3(tool) ||
      !isMcpEntryUsable(entryPredicate)
    )
      return [...tools];
    let liveState = getLiveState();
    liveState.builtInArtifactHiddenForMcp = true;
    liveState.autoReact.enabledMemo = false;
    logFeatureOk("artifact_mcp_swap");
    emitSummonArmsForActivity(liveState.live);
    clearCommandCaches();
    require("../../tools/ArtifactTool/ArtifactTool.js");
  }
  return filterOutArtifactReplTools(tools);
}
//@ chunk-v7crmwhb.js:1757-2391 placement
/**
 * （归属疑误：Artifacts）Artifacts MCP 条目状态变化时恢复或保持内置工具。
 */
function swapBackFromArtifactsMcp() {
  if (!isBuiltInArtifactHiddenForMcp()) return;
  let matchesConfig = getArtifactsMcpEntryPredicate();
  if (matchesConfig === null) return;
  let entryState = findMcpRowEntry(matchesConfig);
  if (entryState !== undefined && isEntryRowNotServed(entryState))
    logFeatureSad("artifact_mcp_swap", "entry_not_served");
  else
    switch (entryState?.type) {
      case undefined:
        logFeatureSad("artifact_mcp_swap", "entry_gone");
        break;
      case "failed":
        logFeatureSad("artifact_mcp_swap", "entry_failed");
        break;
      case "needs-auth":
        logFeatureSad("artifact_mcp_swap", "entry_needs_auth");
        break;
      case "connected":
      case "cached":
      case "pending":
      case "disabled":
        return;
      default:
        return;
    }
  let liveState = getLiveState();
  liveState.builtInArtifactHiddenForMcp = false;
  liveState.autoReact.optIn = false;
  liveState.autoReact.wakeEnabledMemo = false;
  emitSummonArmsForActivity(liveState.live);
  for (let key of [...liveState.wakes.takenFrom.keys()])
    import("./replyYieldHolder.js").then((mod) => mod.handBackTakenOverSlug(key));
  clearCommandCaches();
}
//@ chunk-v7crmwhb.js:2391-2467 placement
function clearCommandCaches() {
  require("../../commands.js").clearCommandMemoizationCaches();
}
//@ chunk-v7crmwhb.js:2467-2507 placement
/**
 * 导出函数 `visibleTools`：参数 e，返回 isBuiltInArtifactHiddenForMcp() ? T(e) : [...e]。
 */
function visibleTools(tools) {
  return isBuiltInArtifactHiddenForMcp() ? filterOutArtifactReplTools(tools) : [...tools];
}
//@ chunk-v7crmwhb.js:2507-2653 placement
/**
 * 判断工具是否是 Artifact 相关工具，或是（非 MCP 的）Artifact REPL 工具。
 */
function isArtifactReplTool(tool) {
  if (isArtifactFamilyTool(tool)) return true;
  let APPIFACT_REPL_TOOL_NAME = require("../../tools/AppifactReplTool/prompt.js").APPIFACT_REPL_TOOL_NAME;
  return (
    APPIFACT_REPL_TOOL_NAME !== undefined &&
    tool.mcpInfo === undefined &&
    tool.name === APPIFACT_REPL_TOOL_NAME
  );
}
//@ chunk-v7crmwhb.js:2653-2697 placement
function filterOutArtifactReplTools(tools) {
  return tools.filter((tool) => !isArtifactReplTool(tool));
}
//@ chunk-70g559f4.js:347-539 placement (2.1.88 match: getToolNameForPermissionCheck, 1)
/**
 * （归属疑误：工具集组装）远程设备工具在特定条件下隐藏重复的工具。
 */
function getToolNameForPermissionCheck(tool, permissionTool = tool) {
  let serverName =
    isRemoteToolsForwardEnabled2() &&
    isRemoteToolForwardingEnabledCached() &&
    permissionTool.some(
      (tool) =>
        tool.mcpInfo?.serverName === REMOTE_DEVICES_SERVER_NAME && tool.mcpInfo.toolName === BASH_TOOL_NAME,
    );
  return getToolNameForPermissionCheck_3_2(getToolNameForPermissionCheck_2_2(tool)).filter(
    (tool) =>
      !serverName ||
      tool.mcpInfo?.serverName !== REMOTE_DEVICES_SERVER_NAME ||
      tool.mcpInfo.toolName !== DEVICE_BASH,
  );
}
export {
  isArtifactReplTool,
  swapBackFromArtifactsMcp,
  getToolNameForPermissionCheck_4,
  getToolNameForPermissionCheck,
  swapToArtifactsMcp,
  visibleTools,
};
