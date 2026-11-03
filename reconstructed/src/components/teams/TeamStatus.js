/**
 * components/teams/TeamStatus.tsx
 *
 * 团队状态（只剩小片段）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/teams/TeamStatus.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-ay9hyszk.js (1)
 * attribution: fingerprint 2
 */
import { getTeamName, getAgentId } from "../../utils/teammate.js";

//@ chunk-18hwfzwa.js:879200-879241 fingerprint = _temp (1)
function selectTeamContext(s) {
  return s.teamContext;
}
//@ chunk-ay9hyszk.js:1490-1564 fingerprint = _temp2 (1)
function y(t) {
  if (!(t || getTeamName())) return !1;
  let n = getAgentId();
  return !n || n === "team-lead";
}

export { selectTeamContext, y };
