/**
 * ink/_new/findPointerTarget.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bzr73sfg.js (1)
 * attribution: sole-consumer-new 1
 */
import { hitTest } from "../hit-test.js";

/**
 * 从命中节点向上找第一个有 onPointer 的节点；先遇到 onClick 或可聚焦节点则返回 null（让普通点击处理）。
 */
//@ chunk-bzr73sfg.js:258061-258255 sole-consumer-new
function findPointerTarget(root, col, row) {
  let node = hitTest(root, col, row) ?? void 0;
  while (node) {
    let _eventHandlers = node._eventHandlers;
    if (_eventHandlers?.onPointer) return node;
    if (_eventHandlers?.onClick || typeof node.attributes.tabIndex === "number") return null;
    node = node.parentNode;
  }
  return null;
}

export { findPointerTarget };
