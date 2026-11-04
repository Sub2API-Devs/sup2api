/**
 * utils/teamMemoryOps.ts
 *
 * 团队记忆读/搜/写计数在折叠摘要中的展示文字。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/teamMemoryOps.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-e6aww6q8.js:4677220-4677720 fingerprint (2.1.88 match: appendTeamMemorySummaryParts, 1)
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
