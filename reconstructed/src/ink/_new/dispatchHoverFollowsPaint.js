/**
 * ink/_new/dispatchHoverFollowsPaint.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bzr73sfg.js (1)
 * attribution: sole-consumer-new 1
 */
import { hitTest } from "../hit-test.js";
import { isOverBlankCell, acceptsHover } from "../dom.js";

/**
 * 重绘后重新判定悬停：只针对带 hoverFollowsPaint 属性的节点（内容移动到鼠标下方或移走时触发 enter/leave），返回是否有变化。
 */
//@ chunk-bzr73sfg.js:256096-256529 sole-consumer-new = dispatchHover (0.794)
function dispatchHoverFollowsPaint(root, col, row, hovered, pointerMode = !1) {
  let node = hitTest(root, col, row) ?? void 0,
    E =
      typeof pointerMode === "boolean"
        ? pointerMode
        : isOverBlankCell(root, pointerMode, node ?? null, col, row),
    T = !1;
  for (let old of hovered) {
    if (!old.attributes.hoverFollowsPaint) continue;
    let O = acceptsHover(old, E) ? node : void 0;
    while (O && O !== old) O = O.parentNode;
    if (!O) {
      if ((hovered.delete(old), (T = !0), old.parentNode)) old._eventHandlers?.onMouseLeave?.();
    }
  }
  let A = node;
  while (A) {
    if (A.attributes.hoverFollowsPaint && acceptsHover(A, E) && !hovered.has(A))
      (hovered.add(A), (T = !0), A._eventHandlers?.onMouseEnter?.());
    A = A.parentNode;
  }
  return T;
}

export { dispatchHoverFollowsPaint };
