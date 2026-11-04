/**
 * components/LogoV2/Feed.tsx
 *
 * 欢迎区 Feed 宽度计算；本模块还混入了 metricsStatusCache 的裁剪工具（切分误归）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LogoV2/Feed.tsx
 * pieces: chunk-3n6ygrtf.js (2), chunk-ag5x7vhf.js (1)
 * attribution: affinity 1, callgraph-fingerprint 1, fingerprint 1
 */
import { isValidStatusCacheLine } from "../../services/api/metricsOptOut.js";

//@ chunk-3n6ygrtf.js:3624-3632 affinity
var FEED_ROW_HEIGHT = 8;
//@ chunk-3n6ygrtf.js:3632-3774 callgraph-fingerprint (2.1.88 match: Feed, 0.152)
function Feed(t0) {
  let sliced = Object.entries(t0)
    .filter(([, value]) => isValidStatusCacheLine(value))
    .sort(([, entryA], [, entryB]) => entryB.timestamp - entryA.timestamp)
    .slice(0, FEED_ROW_HEIGHT);
  return Object.fromEntries(sliced);
}
//@ chunk-ag5x7vhf.js:10200-10306 fingerprint (2.1.88 match: calculateFeedWidth, 0.333)
function calculateFeedWidth(config) {
  return (
    (config.data !== null && (config.data.suggestions.length > 0 || !!config.data.emptyMessage)) ||
    config.dialog != null
  );
}
export { Feed, calculateFeedWidth };
