/**
 * components/LogoV2/Feed.tsx
 *
 * 欢迎区 Feed 宽度计算；本模块还混入了 metricsStatusCache 的裁剪工具（切分误归）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LogoV2/Feed.tsx
 * pieces: chunk-hnxhr3bs.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-hnxhr3bs.js:9047-9153 fingerprint (2.1.88 match: calculateFeedWidth, 0.334)
function calculateFeedWidth(config) {
  return (
    (config.data !== null && (config.data.suggestions.length > 0 || !!config.data.emptyMessage)) ||
    config.dialog != null
  );
}
export { calculateFeedWidth };
