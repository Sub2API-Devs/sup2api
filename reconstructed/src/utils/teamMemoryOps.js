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

/**
 * 在折叠摘要中追加"Recalling/Recalled N team memories"等团队记忆读/搜/写计数。
 */
//@ chunk-e6aww6q8.js:4677220-4677720 fingerprint = appendTeamMemorySummaryParts (1)
function appendTeamMemorySummaryParts(memoryCounts, isActive, parts) {
  let s = memoryCounts.teamMemoryReadCount ?? 0,
    h = memoryCounts.teamMemorySearchCount ?? 0,
    y = memoryCounts.teamMemoryWriteCount ?? 0;
  if (s > 0) {
    let S = isActive
      ? parts.length === 0
        ? "Recalling"
        : "recalling"
      : parts.length === 0
        ? "Recalled"
        : "recalled";
    parts.push(`${S} ${s} team ${s === 1 ? "memory" : "memories"}`);
  }
  if (h > 0) {
    let S = isActive
      ? parts.length === 0
        ? "Searching"
        : "searching"
      : parts.length === 0
        ? "Searched"
        : "searched";
    parts.push(`${S} team memories`);
  }
  if (y > 0) {
    let S = isActive ? (parts.length === 0 ? "Writing" : "writing") : parts.length === 0 ? "Wrote" : "wrote";
    parts.push(`${S} ${y} team ${y === 1 ? "memory" : "memories"}`);
  }
}

export { appendTeamMemorySummaryParts };
