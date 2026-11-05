/**
 * hooks/useDiffData.ts
 *
 * /diff 数据加载 hook（工作区 diff 或分支点 diff）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useDiffData.ts
 * pieces: chunk-e2r2f340.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DIFF_DEBOUNCE_MS } from "./useWorkspaceDiff.js";

//@ chunk-e2r2f340.js:3841-4330 fingerprint (2.1.88 match: useDiffData, 0.786)
function useDiffData(diff) {
  let skippedLargeSet = new Set(diff.skippedLarge);
  let restrictedSet = new Set(diff.restricted);
  let files = diff.perFileStats
    .map((perFileStat) => {
      let isLargeFile = skippedLargeSet.has(perFileStat.path);
      return {
        path: perFileStat.path,
        linesAdded: perFileStat.added,
        linesRemoved: perFileStat.removed,
        isBinary: perFileStat.isBinary,
        isLargeFile,
        isTruncated:
          !isLargeFile && !perFileStat.isBinary && perFileStat.added + perFileStat.removed > DIFF_DEBOUNCE_MS,
        isUntracked: perFileStat.isUntracked,
        isRestricted: restrictedSet.has(perFileStat.path),
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
  return {
    stats: diff.stats,
    files,
    hunks: new Map(diff.hunks.map((hunk) => [hunk.path, hunk.hunks])),
    loading: false,
    source: diff.source,
    baseMode: "branch-point",
  };
}
export { useDiffData };
