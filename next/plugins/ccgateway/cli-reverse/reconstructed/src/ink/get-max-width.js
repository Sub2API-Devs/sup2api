/**
 * ink/get-max-width.ts
 *
 * 求节点内容区宽度（去掉 padding 与边框）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/get-max-width.ts
 * pieces: chunk-2avr6cej.js (1)
 * attribution: fingerprint 1
 */
//@ chunk-2avr6cej.js:287665-287798 fingerprint (2.1.88 match: getMaxWidth, 0.708)
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
