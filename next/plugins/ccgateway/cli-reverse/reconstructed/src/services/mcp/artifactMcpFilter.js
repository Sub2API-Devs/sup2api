/**
 * services/mcp/artifactMcpFilter.ts
 *
 * 2.1.316 新增：Artifacts 关闭时剔除连接 Artifacts 的 MCP 服务器
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-28kne31x.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-28kne31x.js:5524-5846 placement
/**
 * Artifacts 被关闭时忽略连接 Artifacts 的 MCP 服务器的说明文案（两种关闭方式）。
 */
var ARTIFACTS_OFF_SERVER_IGNORED =
  "Ignored: Artifacts are turned off in Claude Code settings, so this server, which connects to Artifacts, is not connected";
var ARTIFACTS_OFF_SERVER_IGNORED_RUNNER =
  "Ignored: Artifacts are turned off here (the enableArtifact setting, CLAUDE_CODE_DISABLE_ARTIFACT, or a deny rule on Artifact), so this server, which connects to Artifacts, is not connected";
//@ chunk-28kne31x.js:5846-6274 placement
/**
 * Artifacts 被关闭（设置、CLAUDE_CODE_DISABLE_ARTIFACT 或 deny 规则）时，从 MCP 服务器配置中剔除连向 Artifacts 服务的条目，返回保留项、被剔除的名字和提示文字。
 */
function withoutWithheldCcrArtifactsEntry(entries) {
  let kept = Object.create(null);
  let dropped = [];
  let isSelfHostedRunnerChild = startupCcrEnv.isSelfHostedRunnerChild;
  let artifactsOff =
    isArtifactSwitchedOffInSettings() ||
    (isSelfHostedRunnerChild &&
      (!resolveArtifactEnableSetting().enabled ||
        getDenyRuleForTool(
          getEmptyToolPermissionContext(),
          {
            name: ARTIFACT_TOOL_NAME,
          },
          loadAllPermissionRulesFromDisk().filter((rule) => rule.ruleBehavior === "deny"),
        ) !== null));
  for (let [key, value] of Object.entries(entries))
    if (artifactsOff && isInjectedCcrServer(value)) dropped.push(key);
    else kept[key] = value;
  if (dropped.length > 0)
    logForDebugging(
      `[MCP] Artifacts are switched off: MCP server entries left out because they reach Claude Code Remote's Artifacts server: ${dropped.length}`,
    );
  return {
    kept,
    dropped,
    error: isSelfHostedRunnerChild ? ARTIFACTS_OFF_SERVER_IGNORED_RUNNER : ARTIFACTS_OFF_SERVER_IGNORED,
  };
}
export {
  ARTIFACTS_OFF_SERVER_IGNORED,
  ARTIFACTS_OFF_SERVER_IGNORED_RUNNER,
  withoutWithheldCcrArtifactsEntry,
};
