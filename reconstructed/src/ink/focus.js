/**
 * ink/focus.ts
 *
 * 并入已有模块：取节点的绝对布局（缓存或由 yoga 计算并累加父节点偏移）；方向键焦点移动时计算两个节点间的距离（不在该方向返回无穷大）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/focus.ts
 * pieces: chunk-bzr73sfg.js (13)
 * attribution: fingerprint 4, placement 9
 */
import { FocusEvent } from "./events/focus-event.js";
import { collectTabbable } from "./render-node-to-output.js";

//@ chunk-bzr73sfg.js:183635-183734 fingerprint = isInTree (0.603)
/**
 * 从 node 沿父链向上标记 hasAbsoluteDescendant（遇到已标记的停止）；绝对定位子孙会影响渲染缓存的失效范围。
 */
function markHasAbsoluteDescendant(node) {
  let current = node;
  while (current && !current.hasAbsoluteDescendant) {
    current.hasAbsoluteDescendant = true;
    current = current.parentNode;
  }
}
//@ chunk-bzr73sfg.js:191113-191123 placement
var MAX_FOCUS_STACK = 32;
//@ chunk-bzr73sfg.js:191123-193701 placement = FocusManager (0.759)
/**
 * 焦点管理器（挂在根节点 focusManager）：activeElement、焦点历史栈与 autoFocus 回退栈（各最多 32）；focus 时 tabIndex=-1 的容器会解析到其内上次聚焦的子孙；节点删除时从历史栈恢复焦点；focusNext/Previous 按 Tab 顺序循环；focusDirection 按屏幕几何找某方向最近的可聚焦元素（316 新增）；handleClickFocus 点击聚焦。
 */
class FocusManager {
  activeElement = null;
  dispatchFocusEvent;
  focusStack = [];
  autoFocusStack = [];
  listeners = new Set();
  constructor(dispatchFocusEvent) {
    this.dispatchFocusEvent = dispatchFocusEvent;
  }
  subscribe = (n) => {
    this.listeners.add(n);
    return () => this.listeners.delete(n);
  };
  notify() {
    for (let listener of this.listeners) listener();
  }
  focus(n) {
    let node = this.resolveScope(n);
    if (node === this.activeElement) return;
    let previous = this.activeElement;
    if (previous) {
      let idx = this.focusStack.indexOf(previous);
      if (idx !== -1) this.focusStack.splice(idx, 1);
      this.focusStack.push(previous);
      if (this.focusStack.length > MAX_FOCUS_STACK) this.focusStack.shift();
      this.dispatchFocusEvent(previous, new FocusEvent("blur", node));
    }
    this.activeElement = node;
    this.dispatchFocusEvent(node, new FocusEvent("focus", previous));
    this.notify();
  }
  resolveScope(n) {
    if (n.attributes.tabIndex !== -1) return n;
    let u = (node) => !!node && node !== n && isTabbable(node) && isDescendantOf(node, n);
    if (u(this.activeElement)) return this.activeElement;
    let last = this.focusStack.findLast(u);
    if (last) return last;
    return this.autoFocusStack.findLast((p) => p.attributes.autoFocus === true && u(p)) ?? n;
  }
  blur() {
    if (!this.activeElement) return;
    let previous = this.activeElement;
    this.activeElement = null;
    this.dispatchFocusEvent(previous, new FocusEvent("blur", null));
    this.notify();
  }
  handleNodeRemoved(node, root) {
    this.focusStack = this.focusStack.filter((n) => n !== node && isDescendantOf(n, root));
    this.autoFocusStack = this.autoFocusStack.filter((p) => p !== node && isDescendantOf(p, root));
    if (!this.activeElement) return;
    if (this.activeElement !== node && isDescendantOf(this.activeElement, root)) return;
    let removed = this.activeElement;
    this.activeElement = null;
    this.dispatchFocusEvent(removed, new FocusEvent("blur", null));
    while (this.focusStack.length > 0) {
      let candidate = this.focusStack.pop();
      if (isDescendantOf(candidate, root)) {
        this.activeElement = candidate;
        this.dispatchFocusEvent(candidate, new FocusEvent("focus", removed));
        this.notify();
        return;
      }
    }
    let last = this.autoFocusStack.at(-1);
    if (last) {
      this.activeElement = last;
      this.dispatchFocusEvent(last, new FocusEvent("focus", removed));
    }
    this.notify();
  }
  pushAutoFocusFallback(n) {
    if (this.autoFocusStack.at(-1) === n) return;
    let index = this.autoFocusStack.indexOf(n);
    if (index !== -1) this.autoFocusStack.splice(index, 1);
    this.autoFocusStack.push(n);
    if (this.autoFocusStack.length > MAX_FOCUS_STACK) this.autoFocusStack.shift();
  }
  handleAutoFocus(node) {
    this.pushAutoFocusFallback(node);
    this.focus(node);
  }
  handleClickFocus(node) {
    if (typeof node.attributes.tabIndex !== "number") return;
    this.focus(node);
  }
  focusNext(root) {
    this.moveFocus(1, root);
  }
  focusPrevious(root) {
    this.moveFocus(-1, root);
  }
  focusDirection(direction, root) {
    if (!this.activeElement) {
      this.moveFocus(1, root);
      return true;
    }
    let fromRect = getNodeScreenRect(this.activeElement);
    if (!fromRect) return false;
    let m = null;
    let p = 1 / 0;
    for (let g of collectTabbable(root)) {
      if (isDescendantOf(this.activeElement, g)) continue;
      let toRect = getNodeScreenRect(g);
      if (!toRect) continue;
      let T = directionalFocusScore(fromRect, toRect, direction);
      if (T < p) {
        p = T;
        m = g;
      }
    }
    if (m) {
      this.focus(m);
      return true;
    }
    return false;
  }
  moveFocus(direction, root) {
    let tabbable = collectTabbable(root);
    if (tabbable.length === 0) return;
    let currentIndex = this.activeElement ? tabbable.indexOf(this.activeElement) : -1;
    let nextIndex =
      currentIndex === -1
        ? direction === 1
          ? 0
          : tabbable.length - 1
        : (currentIndex + direction + tabbable.length) % tabbable.length;
    let next = tabbable[nextIndex];
    if (next) this.focus(next);
  }
}
//@ chunk-bzr73sfg.js:193701-193777 fingerprint = walkTree (0.357)
/**
 * tabIndex 是非负数即可 Tab 聚焦。
 */
function isTabbable(node) {
  let tabIndex = node.attributes.tabIndex;
  return typeof tabIndex === "number" && tabIndex >= 0;
}
//@ chunk-bzr73sfg.js:193818-193960 placement = dropSubtreeCache (0.808)
function walkTabbable(node, result) {
  let tabIndex = node.attributes.tabIndex;
  if (typeof tabIndex === "number" && tabIndex >= 0) result.push(node);
  for (let child of node.childNodes) if (child.nodeName !== "#text") walkTabbable(child, result);
}
//@ chunk-bzr73sfg.js:193960-194072 placement = dropSubtreeCache (1)
function hasTabbableDescendant(node) {
  for (let child of node.childNodes) {
    if (child.nodeName === "#text") continue;
    if (collectTabbable(child).length > 0) return true;
  }
  return false;
}
//@ chunk-bzr73sfg.js:194072-194383 placement
/**
 * 方向键焦点移动时计算两个节点间的距离（不在该方向返回无穷大）。
 */
function directionalFocusScore(fromRect, toRect, direction) {
  let fromCx = fromRect.x + fromRect.width / 2;
  let fromCy = fromRect.y + fromRect.height / 2;
  let toCx = toRect.x + toRect.width / 2;
  let toCy = toRect.y + toRect.height / 2;
  let isHorizontal = direction === "left" || direction === "right";
  let sign = direction === "right" || direction === "down" ? 1 : -1;
  let distance = (isHorizontal ? toCx - fromCx : toCy - fromCy) * sign;
  if (distance <= 0) return 1 / 0;
  let offAxis = isHorizontal
    ? distanceOutsideSpan(fromCy, toRect.y, toRect.height)
    : distanceOutsideSpan(fromCx, toRect.x, toRect.width);
  let overlap = isHorizontal
    ? spanOverlap(fromRect.y, fromRect.height, toRect.y, toRect.height)
    : spanOverlap(fromRect.x, fromRect.width, toRect.x, toRect.width);
  return distance + (isHorizontal ? 2 : 0.5) * offAxis - overlap;
}
//@ chunk-bzr73sfg.js:194383-194453 placement
function distanceOutsideSpan(value, start, length) {
  if (value < start) return start - value;
  if (value > start + length) return value - (start + length);
  return 0;
}
//@ chunk-bzr73sfg.js:194453-194525 placement
function spanOverlap(n, u, f, m) {
  return Math.max(0, Math.min(n + u, f + m) - Math.max(n, f));
}
//@ chunk-bzr73sfg.js:194525-194881 placement
/**
 * 取节点的绝对布局（缓存或由 yoga 计算并累加父节点偏移）。
 */
function getNodeScreenRect(node) {
  let cachedLayout = node.cachedLayout;
  if (cachedLayout) return cachedLayout;
  let yogaNode = node.yogaNode;
  if (!yogaNode) return;
  let computedLeft = yogaNode.getComputedLeft();
  let computedTop = yogaNode.getComputedTop();
  let parentNode = node.parentNode;
  while (parentNode) {
    let cachedLayout = parentNode.cachedLayout;
    if (cachedLayout)
      return {
        x: cachedLayout.x + computedLeft,
        y: cachedLayout.y + computedTop,
        width: yogaNode.getComputedWidth(),
        height: yogaNode.getComputedHeight(),
      };
    if (parentNode.yogaNode) {
      computedLeft += parentNode.yogaNode.getComputedLeft();
      computedTop += parentNode.yogaNode.getComputedTop();
    }
    parentNode = parentNode.parentNode;
  }
  return;
}
//@ chunk-bzr73sfg.js:194881-194957 placement
/**
 * 判断节点是否在另一节点之下。
 */
function isDescendantOf(node, ancestor) {
  let f = node;
  while (f) {
    if (f === ancestor) return true;
    f = f.parentNode;
  }
  return false;
}
//@ chunk-bzr73sfg.js:194957-195089 fingerprint = getRootNode (1)
/**
 * 沿父链找挂着 focusManager 的根节点，找不到抛错。
 */
function getRootNode(node) {
  let current = node;
  while (current) {
    if (current.focusManager) return current;
    current = current.parentNode;
  }
  throw Error("Node is not in a tree with a FocusManager");
}
//@ chunk-bzr73sfg.js:195089-195131 fingerprint = getFocusManager (1)
/**
 * 取节点所在树的 FocusManager。
 */
function getFocusManager(node) {
  return getRootNode(node).focusManager;
}
export {
  getFocusManager,
  isDescendantOf,
  markHasAbsoluteDescendant,
  walkTabbable,
  getRootNode,
  FocusManager,
};
