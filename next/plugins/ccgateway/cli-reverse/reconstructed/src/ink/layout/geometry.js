/**
 * ink/layout/geometry.ts
 *
 * 矩形工具（并、包含、相交、滚动目标计算）；部分声明误归（图表、盒线画布）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/layout/geometry.ts
 * pieces: chunk-2avr6cej.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-2avr6cej.js:199097-199269 fingerprint (2.1.88 match: unionRect, 1)
/**
 * 两个矩形的并（包围盒）。
 */
function unionRect(a, b) {
  let minX = Math.min(a.x, b.x);
  let minY = Math.min(a.y, b.y);
  let maxX = Math.max(a.x + a.width, b.x + b.width);
  let maxY = Math.max(a.y + a.height, b.y + b.height);
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
export { unionRect };
