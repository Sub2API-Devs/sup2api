/**
 * ink/hit-test.ts
 *
 * 并入已有模块：按坐标在 Ink DOM 树中做命中测试（考虑 overflow 裁剪与绝对定位后代，限制深度）；按坐标找文本选择的作用域节点与边界等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/hit-test.ts
 * pieces: chunk-bzr73sfg.js (13)
 * attribution: placement 10, fingerprint 3
 */
import { claimOnce } from "../services/api/verificationRequired.js";
import { logError } from "../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../utils/errors.js";
import { isOverBlankCell, acceptsHover } from "./dom.js";
import { SoftWrapKind } from "./screen.js";
import { dropSubtreeCache } from "./render-node-to-output.js";

//@ chunk-bzr73sfg.js:253776-253787 placement
var MAX_TREE_DEPTH = 256;
//@ chunk-bzr73sfg.js:253787-254033 placement
function reportTreeDepthExceeded(walker, nodeName) {
  if (!claimOnce().claim(`ink_tree_depth_cap:${walker}`)) return;
  logError(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${walker}: ink tree depth exceeded MAX_TREE_DEPTH (${MAX_TREE_DEPTH}) at <${nodeName}>; skipping deeper subtree instead of overflowing the call stack`,
      "ink tree walk stopped at MAX_TREE_DEPTH",
    ),
  );
}
//@ chunk-bzr73sfg.js:254033-254826 placement
/**
 * 按坐标在 Ink DOM 树中做命中测试（考虑 overflow 裁剪与绝对定位后代，限制深度）。
 */
function hitTest(node, col, row, depth = 0) {
  if (depth >= MAX_TREE_DEPTH) {
    reportTreeDepthExceeded("hitTest", node.nodeName);
    return null;
  }
  let cachedLayout = node.cachedLayout;
  if (!cachedLayout) return null;
  let inside =
    col >= cachedLayout.x &&
    col < cachedLayout.x + cachedLayout.width &&
    row >= cachedLayout.y &&
    row < cachedLayout.y + cachedLayout.height;
  if (!inside && !node.hasAbsoluteDescendant) return null;
  if (!inside) {
    let A = node.style.overflowX ?? node.style.overflow;
    let D = node.style.overflowY ?? node.style.overflow;
    let O =
      (A === "hidden" || A === "scroll") &&
      (col < cachedLayout.x || col >= cachedLayout.x + cachedLayout.width);
    let _ =
      (D === "hidden" || D === "scroll") &&
      (row < cachedLayout.y || row >= cachedLayout.y + cachedLayout.height);
    if (O || _) return null;
  }
  let best = null;
  let bestIsEscaping = false;
  for (let idx = node.childNodes.length - 1; idx >= 0; idx--) {
    let D = node.childNodes[idx];
    if (D.nodeName === "#text") continue;
    let cachedLayout = D.cachedLayout;
    if (!cachedLayout) continue;
    let _ =
      col >= cachedLayout.x &&
      col < cachedLayout.x + cachedLayout.width &&
      row >= cachedLayout.y &&
      row < cachedLayout.y + cachedLayout.height;
    if (!_ && !D.hasAbsoluteDescendant) continue;
    if (best !== null && _) continue;
    let U = hitTest(D, col, row, depth + 1);
    if (!U) continue;
    let L = !_;
    if (best === null || (L && !bestIsEscaping)) {
      best = U;
      bestIsEscaping = L;
    }
    if (bestIsEscaping) break;
  }
  return best ?? (inside ? node : null);
}
//@ chunk-bzr73sfg.js:254826-255304 placement
/**
 * 按坐标找文本选择的作用域节点与边界。
 */
function findSelectionScope(root, col, row) {
  let node = hitTest(root, col, row) ?? undefined;
  let scope;
  while (node) {
    let cachedLayout = node.cachedLayout;
    if (cachedLayout) {
      let floored = Math.floor(cachedLayout.x);
      let floored_2 = Math.floor(cachedLayout.x + cachedLayout.width);
      if (!scope) {
        if (node.style.selectionScope) {
          let yogaNode = node.yogaNode;
          let D = yogaNode ? yogaNode.getComputedBorder(0) + yogaNode.getComputedPadding(0) : 0;
          let O = yogaNode ? yogaNode.getComputedBorder(2) + yogaNode.getComputedPadding(2) : 0;
          scope = {
            x1: floored + D,
            x2: floored_2 - O,
            node,
          };
        }
      } else {
        let A = node.style.overflowX ?? node.style.overflow;
        if (A === "hidden" || A === "scroll") {
          scope.x1 = Math.max(scope.x1, floored);
          scope.x2 = Math.min(scope.x2, floored_2);
        }
      }
    }
    node = node.parentNode;
  }
  return scope && scope.x2 > scope.x1 ? scope : undefined;
}
//@ chunk-bzr73sfg.js:255304-255785 fingerprint = dispatchClick (0.76)
/**
 * 派发点击：命中测试找目标；不是窗口激活点击时，最近的有 tabIndex 的祖先获得焦点；然后沿父链调用 onClick（填好 localCol/localRow），立即停止传播则结束；返回是否有处理器没调 allowDefault()（即点击被消费）。
 */
function dispatchClick(root, event) {
  let { col, row } = event;
  let target = hitTest(root, col, row) ?? undefined;
  if (!target) return false;
  if (root.focusManager && !event.isWindowActivation) {
    let focusTarget = target;
    while (focusTarget) {
      if (typeof focusTarget.attributes.tabIndex === "number") {
        root.focusManager.handleClickFocus(focusTarget);
        break;
      }
      focusTarget = focusTarget.parentNode;
    }
  }
  let handled = false;
  while (target) {
    let handler = target._eventHandlers?.onClick;
    if (handler) {
      let rect = target.cachedLayout;
      if (rect) {
        event.localCol = col - rect.x;
        event.localRow = row - rect.y;
      }
      event.defaultAllowed = false;
      handler(event);
      if (event.didStopImmediatePropagation()) return !event.defaultAllowed;
      if (!event.defaultAllowed) handled = true;
    }
    target = target.parentNode;
  }
  return handled;
}
//@ chunk-bzr73sfg.js:255785-256096 fingerprint = dispatchHover (1)
/**
 * 悬停派发：命中节点及其祖先中有 onMouseEnter/Leave 的组成新集合，与旧集合比较后分别调用 onMouseLeave/onMouseEnter（不冒泡）。
 */
function dispatchHover(root, col, row, hovered, pointerMode = false) {
  let next = new Set();
  let target = hitTest(root, col, row);
  let accepts =
    typeof pointerMode === "boolean" ? pointerMode : isOverBlankCell(root, pointerMode, target, col, row);
  let node = target ?? undefined;
  while (node) {
    if (acceptsHover(node, accepts)) next.add(node);
    node = node.parentNode;
  }
  for (let old of hovered)
    if (!next.has(old)) {
      hovered.delete(old);
      if (old.parentNode) old._eventHandlers?.onMouseLeave?.();
    }
  for (let n of next)
    if (!hovered.has(n)) {
      hovered.add(n);
      n._eventHandlers?.onMouseEnter?.();
    }
}
//@ chunk-bzr73sfg.js:256096-256529 placement = dispatchHover (0.794)
/**
 * 重绘后重新判定悬停：只针对带 hoverFollowsPaint 属性的节点（内容移动到鼠标下方或移走时触发 enter/leave），返回是否有变化。
 */
function dispatchHoverFollowsPaint(root, col, row, hovered, pointerMode = false) {
  let node = hitTest(root, col, row) ?? undefined;
  let overBlank =
    typeof pointerMode === "boolean"
      ? pointerMode
      : isOverBlankCell(root, pointerMode, node ?? null, col, row);
  let T = false;
  for (let old of hovered) {
    if (!old.attributes.hoverFollowsPaint) continue;
    let O = acceptsHover(old, overBlank) ? node : undefined;
    while (O && O !== old) O = O.parentNode;
    if (!O) {
      hovered.delete(old);
      T = true;
      if (old.parentNode) old._eventHandlers?.onMouseLeave?.();
    }
  }
  let node_2 = node;
  while (node_2) {
    if (node_2.attributes.hoverFollowsPaint && acceptsHover(node_2, overBlank) && !hovered.has(node_2)) {
      hovered.add(node_2);
      T = true;
      node_2._eventHandlers?.onMouseEnter?.();
    }
    node_2 = node_2.parentNode;
  }
  return T;
}
//@ chunk-bzr73sfg.js:258061-258255 placement
/**
 * 从命中节点向上找第一个有 onPointer 的节点；先遇到 onClick 或可聚焦节点则返回 null（让普通点击处理）。
 */
function findPointerTarget(root, col, row) {
  let node = hitTest(root, col, row) ?? undefined;
  while (node) {
    let _eventHandlers = node._eventHandlers;
    if (_eventHandlers?.onPointer) return node;
    if (_eventHandlers?.onClick || typeof node.attributes.tabIndex === "number") return null;
    node = node.parentNode;
  }
  return null;
}
//@ chunk-bzr73sfg.js:314361-314383 placement
var HARD_BREAK_ONLY = [SoftWrapKind.HardBreak];
//@ chunk-bzr73sfg.js:314383-314443 placement
function pushOrCreate(n, u) {
  if (n === undefined) return [u];
  n.push(u);
  return n;
}
//@ chunk-bzr73sfg.js:314443-314486 placement
function clearShiftedFlags(nodes) {
  if (nodes) for (let node of nodes) shiftCachedLayouts(node, 0);
}
//@ chunk-bzr73sfg.js:314486-314874 placement
/**
 * 把子树的缓存布局整体平移若干行。
 */
function shiftCachedLayouts(node, dy) {
  let f = [node];
  for (let m = f.pop(); m !== undefined; m = f.pop()) {
    let cachedLayout = m.cachedLayout;
    if (cachedLayout === undefined) continue;
    cachedLayout.y += dy;
    cachedLayout.shifted = true;
    if (m.scrollViewportTop !== undefined) m.scrollViewportTop += dy;
    let clip = cachedLayout.clip;
    if (clip)
      cachedLayout.clip = {
        x1: clip.x1,
        x2: clip.x2,
        y1: clip.y1 === undefined ? undefined : clip.y1 + dy,
        y2: clip.y2 === undefined ? undefined : clip.y2 + dy,
      };
    let childNodes = m.childNodes;
    for (let idx = childNodes.length - 1; idx >= 0; idx--) {
      let A = childNodes[idx];
      if (A.nodeName !== "#text") f.push(A);
    }
  }
}
//@ chunk-bzr73sfg.js:314874-315335 fingerprint = hitTest (0.489)
/**
 * 零高度节点的子树不绘制，但仍按 yoga 布局写入 cachedLayout（标 unpainted），使点击命中测试与焦点几何可用。
 */
function setUnpaintedLayout(node, offsetX, offsetY) {
  let m = [
    {
      node,
      offsetX,
      offsetY,
    },
  ];
  for (let p = m.pop(); p !== undefined; p = m.pop()) {
    let yogaNode = p.node.yogaNode;
    if (!yogaNode || yogaNode.getDisplay() === 1) {
      dropSubtreeCache(p.node);
      continue;
    }
    let E = p.offsetX + yogaNode.getComputedLeft();
    let T = p.offsetY + yogaNode.getComputedTop();
    p.node.cachedLayout = {
      x: E,
      y: T,
      width: yogaNode.getComputedWidth(),
      height: yogaNode.getComputedHeight(),
      unpainted: true,
    };
    let childNodes = p.node.childNodes;
    for (let idx = childNodes.length - 1; idx >= 0; idx--) {
      let child = childNodes[idx];
      if (child.nodeName !== "#text")
        m.push({
          node: child,
          offsetX: E,
          offsetY: T,
        });
    }
  }
}
export {
  hitTest,
  MAX_TREE_DEPTH,
  reportTreeDepthExceeded,
  setUnpaintedLayout,
  shiftCachedLayouts,
  pushOrCreate,
  HARD_BREAK_ONLY,
  clearShiftedFlags,
  dispatchClick,
  dispatchHover,
  dispatchHoverFollowsPaint,
  findPointerTarget,
  findSelectionScope,
};
