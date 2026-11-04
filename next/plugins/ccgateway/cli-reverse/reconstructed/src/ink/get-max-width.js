/**
 * ink/get-max-width.ts
 *
 * 求节点内容区宽度（去掉 padding 与边框）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/get-max-width.ts
 * pieces: chunk-bzr73sfg.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-bzr73sfg.js:288084-288217 fingerprint = getMaxWidth (0.706)
/**
 * yoga 节点的内容宽度：计算宽度减左右内边距与边框。
 */
var getMaxWidth = (yogaNode) =>
  yogaNode.getComputedWidth() -
  yogaNode.getComputedPadding(0) -
  yogaNode.getComputedPadding(2) -
  yogaNode.getComputedBorder(0) -
  yogaNode.getComputedBorder(2);
var getMaxWidthAlias = getMaxWidth;
export { getMaxWidthAlias };
