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
import { K } from "./useWorkspaceDiff.js";

//@ chunk-qwh6zcf0.js:3841-4330 fingerprint = useDiffData (0.786)
function useDiffData(t) {
  let r = new Set(t.skippedLarge),
    o = new Set(t.restricted),
    sorted = t.perFileStats
      .map((perFileStat) => {
        let a = r.has(perFileStat.path);
        return {
          path: perFileStat.path,
          linesAdded: perFileStat.added,
          linesRemoved: perFileStat.removed,
          isBinary: perFileStat.isBinary,
          isLargeFile: a,
          isTruncated: !a && !perFileStat.isBinary && perFileStat.added + perFileStat.removed > K,
          isUntracked: perFileStat.isUntracked,
          isRestricted: o.has(perFileStat.path),
        };
      })
      .sort((i, a) => i.path.localeCompare(a.path));
  return {
    stats: t.stats,
    files: sorted,
    hunks: new Map(t.hunks.map((hunk) => [hunk.path, hunk.hunks])),
    loading: !1,
    source: t.source,
    baseMode: "branch-point",
  };
}

export { useDiffData };
