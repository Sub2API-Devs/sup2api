/**
 * ink/hit-test.ts
 *
 * 并入已有模块：按坐标在 Ink DOM 树中做命中测试（考虑 overflow 裁剪与绝对定位后代，限制深度）；按坐标找文本选择的作用域节点与边界等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/hit-test.ts
 * pieces: chunk-bzr73sfg.js (11)
 * attribution: placement 8, fingerprint 3
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
/**
 * 按坐标在 Ink DOM 树中做命中测试（考虑 overflow 裁剪与绝对定位后代，限制深度）。
 */
//@ chunk-bzr73sfg.js:254033-254826 placement
function hitTest(node, col, row, depth = 0) {
  if (depth >= MAX_TREE_DEPTH) return (reportTreeDepthExceeded("hitTest", node.nodeName), null);
  let cachedLayout = node.cachedLayout;
  if (!cachedLayout) return null;
  let inside =
    col >= cachedLayout.x &&
    col < cachedLayout.x + cachedLayout.width &&
    row >= cachedLayout.y &&
    row < cachedLayout.y + cachedLayout.height;
  if (!inside && !node.hasAbsoluteDescendant) return null;
  if (!inside) {
    let A = node.style.overflowX ?? node.style.overflow,
      D = node.style.overflowY ?? node.style.overflow,
      O =
        (A === "hidden" || A === "scroll") &&
        (col < cachedLayout.x || col >= cachedLayout.x + cachedLayout.width),
      _ =
        (D === "hidden" || D === "scroll") &&
        (row < cachedLayout.y || row >= cachedLayout.y + cachedLayout.height);
    if (O || _) return null;
  }
  let best = null,
    bestIsEscaping = !1;
  for (let A = node.childNodes.length - 1; A >= 0; A--) {
    let D = node.childNodes[A];
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
    if (best === null || (L && !bestIsEscaping)) ((best = U), (bestIsEscaping = L));
    if (bestIsEscaping) break;
  }
  return best ?? (inside ? node : null);
}
/**
 * 按坐标找文本选择的作用域节点与边界。
 */
//@ chunk-bzr73sfg.js:254826-255304 placement
function findSelectionScope(root, col, row) {
  let node = hitTest(root, col, row) ?? void 0,
    scope;
  while (node) {
    let cachedLayout = node.cachedLayout;
    if (cachedLayout) {
      let floored = Math.floor(cachedLayout.x),
        floored_2 = Math.floor(cachedLayout.x + cachedLayout.width);
      if (!scope) {
        if (node.style.selectionScope) {
          let yogaNode = node.yogaNode,
            D = yogaNode ? yogaNode.getComputedBorder(0) + yogaNode.getComputedPadding(0) : 0,
            O = yogaNode ? yogaNode.getComputedBorder(2) + yogaNode.getComputedPadding(2) : 0;
          scope = { x1: floored + D, x2: floored_2 - O, node: node };
        }
      } else {
        let A = node.style.overflowX ?? node.style.overflow;
        if (A === "hidden" || A === "scroll")
          ((scope.x1 = Math.max(scope.x1, floored)), (scope.x2 = Math.min(scope.x2, floored_2)));
      }
    }
    node = node.parentNode;
  }
  return scope && scope.x2 > scope.x1 ? scope : void 0;
}
/**
 * 派发点击：命中测试找目标；不是窗口激活点击时，最近的有 tabIndex 的祖先获得焦点；然后沿父链调用 onClick（填好 localCol/localRow），立即停止传播则结束；返回是否有处理器没调 allowDefault()（即点击被消费）。
 */
//@ chunk-bzr73sfg.js:255304-255785 fingerprint = dispatchClick (0.76)
function dispatchClick(root, event) {
  let { col: col, row: row } = event,
    target = hitTest(root, col, row) ?? void 0;
  if (!target) return !1;
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
  let handled = !1;
  while (target) {
    let handler = target._eventHandlers?.onClick;
    if (handler) {
      let cachedLayout = target.cachedLayout;
      if (cachedLayout) ((event.localCol = col - cachedLayout.x), (event.localRow = row - cachedLayout.y));
      if (((event.defaultAllowed = !1), handler(event), event.didStopImmediatePropagation()))
        return !event.defaultAllowed;
      if (!event.defaultAllowed) handled = !0;
    }
    target = target.parentNode;
  }
  return handled;
}
/**
 * 悬停派发：命中节点及其祖先中有 onMouseEnter/Leave 的组成新集合，与旧集合比较后分别调用 onMouseLeave/onMouseEnter（不冒泡）。
 */
//@ chunk-bzr73sfg.js:255785-256096 fingerprint = dispatchHover (1)
function dispatchHover(root, col, row, hovered, pointerMode = !1) {
  let next = new Set(),
    target = hitTest(root, col, row),
    accepts =
      typeof pointerMode === "boolean" ? pointerMode : isOverBlankCell(root, pointerMode, target, col, row),
    node = target ?? void 0;
  while (node) {
    if (acceptsHover(node, accepts)) next.add(node);
    node = node.parentNode;
  }
  for (let old of hovered)
    if (!next.has(old)) {
      if ((hovered.delete(old), old.parentNode)) old._eventHandlers?.onMouseLeave?.();
    }
  for (let D of next) if (!hovered.has(D)) (hovered.add(D), D._eventHandlers?.onMouseEnter?.());
}
//@ chunk-bzr73sfg.js:314361-314383 placement
var HARD_BREAK_ONLY = [SoftWrapKind.HardBreak];
//@ chunk-bzr73sfg.js:314383-314443 placement
function pushOrCreate(n, u) {
  if (n === void 0) return [u];
  return (n.push(u), n);
}
//@ chunk-bzr73sfg.js:314443-314486 placement
function clearShiftedFlags(nodes) {
  if (nodes) for (let u of nodes) shiftCachedLayouts(u, 0);
}
/**
 * 把子树的缓存布局整体平移若干行。
 */
//@ chunk-bzr73sfg.js:314486-314874 placement
function shiftCachedLayouts(node, dy) {
  let f = [node];
  for (let m = f.pop(); m !== void 0; m = f.pop()) {
    let cachedLayout = m.cachedLayout;
    if (cachedLayout === void 0) continue;
    if (((cachedLayout.y += dy), (cachedLayout.shifted = !0), m.scrollViewportTop !== void 0))
      m.scrollViewportTop += dy;
    let clip = cachedLayout.clip;
    if (clip)
      cachedLayout.clip = {
        x1: clip.x1,
        x2: clip.x2,
        y1: clip.y1 === void 0 ? void 0 : clip.y1 + dy,
        y2: clip.y2 === void 0 ? void 0 : clip.y2 + dy,
      };
    let childNodes = m.childNodes;
    for (let T = childNodes.length - 1; T >= 0; T--) {
      let A = childNodes[T];
      if (A.nodeName !== "#text") f.push(A);
    }
  }
}
/**
 * 零高度节点的子树不绘制，但仍按 yoga 布局写入 cachedLayout（标 unpainted），使点击命中测试与焦点几何可用。
 */
//@ chunk-bzr73sfg.js:314874-315335 fingerprint = hitTest (0.489)
function setUnpaintedLayout(node, offsetX, offsetY) {
  let m = [{ node: node, offsetX: offsetX, offsetY: offsetY }];
  for (let p = m.pop(); p !== void 0; p = m.pop()) {
    let yogaNode = p.node.yogaNode;
    if (!yogaNode || yogaNode.getDisplay() === 1) {
      dropSubtreeCache(p.node);
      continue;
    }
    let E = p.offsetX + yogaNode.getComputedLeft(),
      T = p.offsetY + yogaNode.getComputedTop();
    p.node.cachedLayout = {
      x: E,
      y: T,
      width: yogaNode.getComputedWidth(),
      height: yogaNode.getComputedHeight(),
      unpainted: !0,
    };
    let childNodes = p.node.childNodes;
    for (let D = childNodes.length - 1; D >= 0; D--) {
      let child = childNodes[D];
      if (child.nodeName !== "#text") m.push({ node: child, offsetX: E, offsetY: T });
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
  findSelectionScope,
};
