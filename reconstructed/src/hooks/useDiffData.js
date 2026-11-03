/**
 * hooks/useDiffData.ts
 *
 * /diff 数据加载 hook（工作区 diff 或分支点 diff）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useDiffData.ts
 * pieces: chunk-qwh6zcf0.js (1)
 * attribution: fingerprint 1
 */
import { DIFF_DEBOUNCE_MS } from "./useWorkspaceDiff.js";

//@ chunk-qwh6zcf0.js:3841-4330 fingerprint = useDiffData (0.786)
function useDiffData(diff) {
  let r = new Set(diff.skippedLarge);
  let o = new Set(diff.restricted);
  let files = diff.perFileStats
    .map((perFileStat) => {
      let a = r.has(perFileStat.path);
      return {
        path: perFileStat.path,
        linesAdded: perFileStat.added,
        linesRemoved: perFileStat.removed,
        isBinary: perFileStat.isBinary,
        isLargeFile: a,
        isTruncated:
          !a && !perFileStat.isBinary && perFileStat.added + perFileStat.removed > DIFF_DEBOUNCE_MS,
        isUntracked: perFileStat.isUntracked,
        isRestricted: o.has(perFileStat.path),
      };
    })
    .sort((i, a) => i.path.localeCompare(a.path));
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
