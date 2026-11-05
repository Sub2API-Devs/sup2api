/**
 * components/teams/TeamStatus.tsx
 *
 * 团队状态（只剩小片段）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/teams/TeamStatus.tsx
 * pieces: chunk-czq1j3j2.js (1), chunk-p68axnzw.js (1)
 * attribution: fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getTeamName, getAgentId } from "../../utils/teammate.js";

//@ chunk-p68axnzw.js:1490-1564 fingerprint (2.1.88 match: _temp2, 1)
function isTeamLeadDefault(t) {
  if (!(t || getTeamName())) return false;
  let agentId = getAgentId();
  return !agentId || agentId === "team-lead";
}
//@ chunk-czq1j3j2.js:912077-912118 fingerprint (2.1.88 match: _temp, 1)
function selectTeamContext(s) {
  return s.teamContext;
}
export { isTeamLeadDefault, selectTeamContext };
