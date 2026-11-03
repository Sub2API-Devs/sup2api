/**
 * services/mcp/artifactMcpFilter.ts
 *
 * 2.1.316 新增：Artifacts 关闭时剔除连接 Artifacts 的 MCP 服务器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vtyyqz9q.js (2)
 * attribution: placement 2
 */
import { startupCcrEnv } from "../../tasks/RemoteAgentTask/remoteAgentKinds.js";
import {
  isArtifactSwitchedOffInSettings,
  resolveArtifactEnableSetting,
} from "../artifacts/artifactToolGates.js";
import { getDenyRuleForTool } from "../../utils/permissions/permissions.js";
import { getEmptyToolPermissionContext } from "../../Tool.js";
import { ARTIFACT_TOOL_NAME } from "../../tools/ArtifactTool/constants.js";
import { loadAllPermissionRulesFromDisk } from "../../utils/permissions/permissionsLoader.js";
import { isInjectedCcrServer } from "../analytics/metadata.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-vtyyqz9q.js:5104-5426 placement
/**
 * Artifacts 被关闭时忽略连接 Artifacts 的 MCP 服务器的说明文案（两种关闭方式）。
 */
var ARTIFACTS_OFF_SERVER_IGNORED =
  "Ignored: Artifacts are turned off in Claude Code settings, so this server, which connects to Artifacts, is not connected";
var ARTIFACTS_OFF_SERVER_IGNORED_RUNNER =
  "Ignored: Artifacts are turned off here (the enableArtifact setting, CLAUDE_CODE_DISABLE_ARTIFACT, or a deny rule on Artifact), so this server, which connects to Artifacts, is not connected";
//@ chunk-vtyyqz9q.js:5426-5854 placement
/**
 * Artifacts 被关闭（设置、CLAUDE_CODE_DISABLE_ARTIFACT 或 deny 规则）时，从 MCP 服务器配置中剔除连向 Artifacts 服务的条目，返回保留项、被剔除的名字和提示文字。
 */
function withoutWithheldCcrArtifactsEntry(s) {
  let o = Object.create(null);
  let e = [];
  let isSelfHostedRunnerChild = startupCcrEnv.isSelfHostedRunnerChild;
  let c =
    isArtifactSwitchedOffInSettings() ||
    (isSelfHostedRunnerChild &&
      (!resolveArtifactEnableSetting().enabled ||
        getDenyRuleForTool(
          getEmptyToolPermissionContext(),
          {
            name: ARTIFACT_TOOL_NAME,
          },
          loadAllPermissionRulesFromDisk().filter((r) => r.ruleBehavior === "deny"),
        ) !== null));
  for (let [key, value] of Object.entries(s))
    if (c && isInjectedCcrServer(value)) e.push(key);
    else o[key] = value;
  if (e.length > 0)
    logForDebugging(
      `[MCP] Artifacts are switched off: MCP server entries left out because they reach Claude Code Remote's Artifacts server: ${e.length}`,
    );
  return {
    kept: o,
    dropped: e,
    error: isSelfHostedRunnerChild ? ARTIFACTS_OFF_SERVER_IGNORED_RUNNER : ARTIFACTS_OFF_SERVER_IGNORED,
  };
}
