/**
 * utils/agentSwarmsEnabled.ts
 *
 * 团队（agent teams / swarm）功能总开关：需要 CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS 或 --agent-teams，且 GrowthBook tengu_amber_flint 为真
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/agentSwarmsEnabled.ts
 * pieces: chunk-t1w43pjj.js (3)
 * attribution: fingerprint 1, facade-exports 2
 */
import { env } from "./env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";

//@ chunk-t1w43pjj.js:261-320 fingerprint = isAgentTeamsFlagSet (1)
/**
 * 命令行是否带 --agent-teams。
 */
function isAgentTeamsFlagSet() {
  return process.argv.includes("--agent-teams");
}
//@ chunk-t1w43pjj.js:320-440 facade-exports = isAgentSwarmsEnabled (0.709)
/**
 * 团队功能是否启用：env CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS 或 --agent-teams 二者之一，并且 tengu_amber_flint（默认 true）未关闭。
 */
function isAgentSwarmsEnabled() {
  if (!env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS && !isAgentTeamsFlagSet()) return false;
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_flint", true)) return false;
  return true;
}
//@ chunk-t1w43pjj.js:440-552 facade-exports
async function captureTeammateModeSnapshotIfEnabled() {
  if (!isAgentSwarmsEnabled()) return;
  let { captureTeammateModeSnapshot } = await import("./swarm/backends/teammateModeSnapshot.js");
  captureTeammateModeSnapshot();
}
export { isAgentSwarmsEnabled, captureTeammateModeSnapshotIfEnabled };
