/**
 * utils/teamMemoryOps.ts
 *
 * 团队记忆读/搜/写计数在折叠摘要中的展示文字。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/teamMemoryOps.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-5xgkngpb.js:4785826-4786326 fingerprint (2.1.88 match: appendTeamMemorySummaryParts, 1)
/**
 * 在折叠摘要中追加"Recalling/Recalled N team memories"等团队记忆读/搜/写计数。
 */
function appendTeamMemorySummaryParts(memoryCounts, isActive, parts) {
  let teamReadCount = memoryCounts.teamMemoryReadCount ?? 0;
  let teamSearchCount = memoryCounts.teamMemorySearchCount ?? 0;
  let teamWriteCount = memoryCounts.teamMemoryWriteCount ?? 0;
  if (teamReadCount > 0) {
    let verb = isActive
      ? parts.length === 0
        ? "Recalling"
        : "recalling"
      : parts.length === 0
        ? "Recalled"
        : "recalled";
    parts.push(`${verb} ${teamReadCount} team ${teamReadCount === 1 ? "memory" : "memories"}`);
  }
  if (teamSearchCount > 0) {
    let verb = isActive
      ? parts.length === 0
        ? "Searching"
        : "searching"
      : parts.length === 0
        ? "Searched"
        : "searched";
    parts.push(`${verb} team memories`);
  }
  if (teamWriteCount > 0) {
    let verb = isActive
      ? parts.length === 0
        ? "Writing"
        : "writing"
      : parts.length === 0
        ? "Wrote"
        : "wrote";
    parts.push(`${verb} ${teamWriteCount} team ${teamWriteCount === 1 ? "memory" : "memories"}`);
  }
}
export { appendTeamMemorySummaryParts };
