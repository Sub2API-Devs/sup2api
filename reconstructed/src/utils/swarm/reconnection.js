/**
 * utils/swarm/reconnection.ts
 *
 * 会话启动/恢复时重建团队上下文（teamContext）：从动态团队上下文或会话记录读取团队文件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/swarm/reconnection.ts
 * pieces: chunk-47mye09a.js (2)
 * attribution: fingerprint 2
 */
import { getDynamicTeamContext } from "../teammate.js";
import { logForDebugging } from "../debug.js";
import { readTeamFileAsync, getTeamFilePath } from "./teamHelpers.js";
import { logError } from "../log.js";
import { withTelemetryMessage } from "../errors.js";

//@ chunk-47mye09a.js:2287-2880 fingerprint = computeInitialTeamContext (0.946)
/**
 * 启动时根据动态团队上下文与团队文件计算初始 teamContext（无 agentId 视为 leader）。
 */
async function computeInitialTeamContext(storage) {
  let context = getDynamicTeamContext();
  if (!context?.teamName || !context?.agentName) {
    logForDebugging("[Reconnection] computeInitialTeamContext: No teammate context set (not a teammate)");
    return;
  }
  let { teamName, agentId, agentName } = context;
  let teamFile = await readTeamFileAsync(teamName, storage);
  if (!teamFile) {
    logError(
      withTelemetryMessage(
        Error(`[computeInitialTeamContext] Could not read team file for ${teamName}`),
        "[computeInitialTeamContext] Could not read team file",
      ),
    );
    return;
  }
  let teamFilePath = getTeamFilePath(teamName);
  let isLeader = !agentId;
  logForDebugging(
    `[Reconnection] Computed initial team context for ${isLeader ? "leader" : `teammate ${agentName}`} in team ${teamName}`,
  );
  return {
    teamName,
    teamFilePath,
    leadAgentId: teamFile.leadAgentId,
    selfAgentId: agentId,
    selfAgentName: agentName,
    isLeader,
    teammates: {},
  };
}
//@ chunk-47mye09a.js:2880-3454 fingerprint = initializeTeammateContextFromSession (0.955)
/**
 * 恢复会话时从团队文件找回成员 agentId，写入 AppState.teamContext（isLeader=false）。
 */
async function initializeTeammateContextFromSession(setAppState, teamName, agentName, storage) {
  let teamFile = await readTeamFileAsync(teamName, storage);
  if (!teamFile) {
    logForDebugging(
      `[initializeTeammateContextFromSession] Could not read team file for ${teamName} (agent: ${agentName}) \u2014 team may have been disbanded`,
      {
        level: "error",
      },
    );
    return;
  }
  let member = teamFile.members.find((m) => m.name === agentName);
  if (!member)
    logForDebugging(
      `[Reconnection] Member ${agentName} not found in team ${teamName} - may have been removed`,
    );
  let agentId = member?.agentId;
  let teamFilePath = getTeamFilePath(teamName);
  setAppState((prev) => ({
    ...prev,
    teamContext: {
      teamName,
      teamFilePath,
      leadAgentId: teamFile.leadAgentId,
      selfAgentId: agentId,
      selfAgentName: agentName,
      isLeader: false,
      teammates: {},
    },
  }));
  logForDebugging(
    `[Reconnection] Initialized agent context from session for ${agentName} in team ${teamName}`,
  );
}
export { computeInitialTeamContext, initializeTeammateContextFromSession };
