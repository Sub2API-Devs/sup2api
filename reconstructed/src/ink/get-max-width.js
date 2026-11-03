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

/**
 * yoga 节点的内容宽度：计算宽度减左右内边距与边框。
 */
//@ chunk-bzr73sfg.js:288084-288217 fingerprint = getMaxWidth (0.706)
var getMaxWidth = (n) =>
    n.getComputedWidth() -
    n.getComputedPadding(0) -
    n.getComputedPadding(2) -
    n.getComputedBorder(0) -
    n.getComputedBorder(2),
  getMaxWidthAlias = getMaxWidth;

export { getMaxWidthAlias };
