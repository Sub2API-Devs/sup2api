/**
 * services/artifacts/artifactMcpSwap.ts
 *
 * 2.1.316 新增。Artifact MCP 服务切换。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kmc5hpaz.js (15)
 * attribution: placement 15
 */
import { isRemoteToolForwardingEnabledCached } from "../remoteTools/servingGates.js";
import {
  jX,
  getToolNameForPermissionCheck_3 as getToolNameForPermissionCheck_3_2,
  getToolNameForPermissionCheck_2 as getToolNameForPermissionCheck_2_2,
  DEVICE_BASH,
} from "../remoteTools/backgroundCommands.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { startupCcrEnv } from "../../tasks/RemoteAgentTask/remoteAgentKinds.js";
import { isRunnerDynamicServer } from "../analytics/metadata.js";
import { USn, n4e } from "../mcp/client.js";
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
import { mSe } from "./rosterWait.js";

/**
 * （归属疑误：工具集组装）远程设备工具在特定条件下隐藏重复的工具。
 */
//@ chunk-kmc5hpaz.js:622-808 placement = getToolNameForPermissionCheck (1)
function getToolNameForPermissionCheck(e, t = e) {
  let n =
    isRemoteToolForwardingEnabledCached() &&
    t.some((o) => o.mcpInfo?.serverName === jX && o.mcpInfo.toolName === BASH_TOOL_NAME);
  return getToolNameForPermissionCheck_3_2(getToolNameForPermissionCheck_2_2(e)).filter(
    (o) => !n || o.mcpInfo?.serverName !== jX || o.mcpInfo.toolName !== DEVICE_BASH,
  );
}
//@ chunk-kmc5hpaz.js:808-962 placement
function getArtifactsMcpEntryPredicate() {
  if (startupCcrEnv.isSelfHostedRunnerChild) return isRunnerDynamicServer;
  if (USn() === void 0 && !isBuiltInArtifactHiddenForMcp()) return null;
  return require("./chunk-d5fbj7hf.js").isArtifactsMcpLaptopEntry;
}
//@ chunk-kmc5hpaz.js:962-1028 placement
function s(e) {
  let t = USn();
  return t !== void 0 && e(t.config) ? t : void 0;
}
//@ chunk-kmc5hpaz.js:1028-1131 placement
function isMcpEntryUsable(e) {
  let t = s(e);
  if (t === void 0 || n4e(t)) return !1;
  return t.type === "connected" || t.type === "cached";
}
//@ chunk-kmc5hpaz.js:1131-1219 placement
function _() {
  return require("./chunk-tbts81qj.js").artifactToolWithholdingGate() !== null;
}
//@ chunk-kmc5hpaz.js:1219-1289 placement
function y() {
  return require("./chunk-hp6arx45.js").MCP_ROW_TOOL_NAMES;
}
//@ chunk-kmc5hpaz.js:1289-1429 placement = getToolNameForPermissionCheck (1)
function getToolNameForPermissionCheck_2(tool) {
  let flattened = tool.flatMap((n) =>
    n.mcpInfo?.serverName === CLAUDE_ARTIFACTS ? [n.mcpInfo.toolName] : [],
  );
  return (
    !artifactsMcpInCloudSession() ||
    isBuiltInArtifactHiddenForMcp() ||
    (flattened.includes(ARTIFACTS_MCP_READ_COMMENTS_TOOL) &&
      flattened.includes(ARTIFACTS_MCP_REPLY_SHARED_COMMENT_TOOL))
  );
}
//@ chunk-kmc5hpaz.js:1429-1539 placement = getToolNameForPermissionCheck (1)
function getToolNameForPermissionCheck_3(tool) {
  let t = y();
  return (
    tool.some((n) => n.mcpInfo?.serverName === CLAUDE_ARTIFACTS && !t.includes(n.mcpInfo.toolName)) &&
    getToolNameForPermissionCheck_2(tool)
  );
}
/**
 * （归属疑误：工具集组装/Artifacts）Artifacts 内置工具与 MCP 版本的切换过滤。
 */
//@ chunk-kmc5hpaz.js:1539-1800 placement = getToolNameForPermissionCheck (1)
function getToolNameForPermissionCheck_4(e, t = e) {
  let n = getArtifactsMcpEntryPredicate();
  if (n === null) return [...e];
  let o = () => e.filter((i) => i.mcpInfo?.serverName !== CLAUDE_ARTIFACTS),
    r = s(n);
  if (r !== void 0 && (n4e(r) || _())) return o();
  let filtered = t.filter((i) => i.mcpInfo?.serverName === CLAUDE_ARTIFACTS);
  if (
    filtered.length === 0 ||
    (getToolNameForPermissionCheck_3(filtered) && getToolNameForPermissionCheck_2(e)) ||
    !isMcpEntryUsable(n)
  )
    return [...e];
  return o();
}
/**
 * （归属疑误：Artifacts）首次切换到 Artifacts MCP 时隐藏内置工具并记录 artifact_mcp_swap。
 */
//@ chunk-kmc5hpaz.js:1800-2030 placement
function swapToArtifactsMcp(e, t) {
  if (!isBuiltInArtifactHiddenForMcp()) {
    let entryPredicate = getArtifactsMcpEntryPredicate();
    if (entryPredicate === null || !getToolNameForPermissionCheck_3(t) || !isMcpEntryUsable(entryPredicate))
      return [...e];
    let liveState = getLiveState();
    ((liveState.builtInArtifactHiddenForMcp = !0),
      (liveState.autoReact.enabledMemo = !1),
      logFeatureOk("artifact_mcp_swap"),
      emitSummonArmsForActivity(liveState.live),
      m(),
      require("./chunk-2rzz5p5d.js"));
  }
  return T(e);
}
/**
 * （归属疑误：Artifacts）Artifacts MCP 条目状态变化时恢复或保持内置工具。
 */
//@ chunk-kmc5hpaz.js:2030-2664 placement
function swapBackFromArtifactsMcp() {
  if (!isBuiltInArtifactHiddenForMcp()) return;
  let e = getArtifactsMcpEntryPredicate();
  if (e === null) return;
  let entryState = s(e);
  if (entryState !== void 0 && n4e(entryState)) logFeatureSad("artifact_mcp_swap", "entry_not_served");
  else
    switch (entryState?.type) {
      case void 0:
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
  ((liveState.builtInArtifactHiddenForMcp = !1),
    (liveState.autoReact.optIn = !1),
    (liveState.autoReact.wakeEnabledMemo = !1),
    emitSummonArmsForActivity(liveState.live));
  for (let o of [...liveState.wakes.takenFrom.keys()])
    import("./chunk-4te7h8m1.js").then((r) => r.handBackTakenOverSlug(o));
  m();
}
//@ chunk-kmc5hpaz.js:2664-2740 placement
function m() {
  require("./chunk-mvgsex7x.js").clearCommandMemoizationCaches();
}
//@ chunk-kmc5hpaz.js:2740-2780 placement
function dHs(e) {
  return isBuiltInArtifactHiddenForMcp() ? T(e) : [...e];
}
/**
 * 判断工具是否是 Artifact 相关工具，或是（非 MCP 的）Artifact REPL 工具。
 */
//@ chunk-kmc5hpaz.js:2780-2926 placement
function isArtifactReplTool(e) {
  if (mSe(e)) return !0;
  let APPIFACT_REPL_TOOL_NAME = require("./chunk-q973gz0n.js").APPIFACT_REPL_TOOL_NAME;
  return APPIFACT_REPL_TOOL_NAME !== void 0 && e.mcpInfo === void 0 && e.name === APPIFACT_REPL_TOOL_NAME;
}
//@ chunk-kmc5hpaz.js:2926-2970 placement
function T(e) {
  return e.filter((t) => !isArtifactReplTool(t));
}

export {
  getToolNameForPermissionCheck,
  dHs,
  getToolNameForPermissionCheck_4,
  isArtifactReplTool,
  swapBackFromArtifactsMcp,
  swapToArtifactsMcp,
};
