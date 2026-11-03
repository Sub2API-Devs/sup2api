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

/**
 * 从 node 沿父链向上标记 hasAbsoluteDescendant（遇到已标记的停止）；绝对定位子孙会影响渲染缓存的失效范围。
 */
//@ chunk-bzr73sfg.js:183635-183734 fingerprint = isInTree (0.603)
function markHasAbsoluteDescendant(node) {
  let current = node;
  while (current && !current.hasAbsoluteDescendant)
    ((current.hasAbsoluteDescendant = !0), (current = current.parentNode));
}
//@ chunk-bzr73sfg.js:191113-191123 placement
var MAX_FOCUS_STACK = 32;
/**
 * 焦点管理器（挂在根节点 focusManager）：activeElement、焦点历史栈与 autoFocus 回退栈（各最多 32）；focus 时 tabIndex=-1 的容器会解析到其内上次聚焦的子孙；节点删除时从历史栈恢复焦点；focusNext/Previous 按 Tab 顺序循环；focusDirection 按屏幕几何找某方向最近的可聚焦元素（316 新增）；handleClickFocus 点击聚焦。
 */
//@ chunk-bzr73sfg.js:191123-193701 placement = FocusManager (0.759)
class FocusManager {
  activeElement = null;
  dispatchFocusEvent;
  focusStack = [];
  autoFocusStack = [];
  listeners = new Set();
  constructor(n) {
    this.dispatchFocusEvent = n;
  }
  subscribe = (n) => (this.listeners.add(n), () => this.listeners.delete(n));
  notify() {
    for (let listener of this.listeners) listener();
  }
  focus(n) {
    let scope = this.resolveScope(n);
    if (scope === this.activeElement) return;
    let activeElement = this.activeElement;
    if (activeElement) {
      let index = this.focusStack.indexOf(activeElement);
      if (index !== -1) this.focusStack.splice(index, 1);
      if ((this.focusStack.push(activeElement), this.focusStack.length > MAX_FOCUS_STACK))
        this.focusStack.shift();
      this.dispatchFocusEvent(activeElement, new FocusEvent("blur", scope));
    }
    ((this.activeElement = scope),
      this.dispatchFocusEvent(scope, new FocusEvent("focus", activeElement)),
      this.notify());
  }
  resolveScope(n) {
    if (n.attributes.tabIndex !== -1) return n;
    let u = (p) => !!p && p !== n && isTabbable(p) && isDescendantOf(p, n);
    if (u(this.activeElement)) return this.activeElement;
    let last = this.focusStack.findLast(u);
    if (last) return last;
    return this.autoFocusStack.findLast((p) => p.attributes.autoFocus === !0 && u(p)) ?? n;
  }
  blur() {
    if (!this.activeElement) return;
    let activeElement = this.activeElement;
    ((this.activeElement = null),
      this.dispatchFocusEvent(activeElement, new FocusEvent("blur", null)),
      this.notify());
  }
  handleNodeRemoved(n, u) {
    if (
      ((this.focusStack = this.focusStack.filter((p) => p !== n && isDescendantOf(p, u))),
      (this.autoFocusStack = this.autoFocusStack.filter((p) => p !== n && isDescendantOf(p, u))),
      !this.activeElement)
    )
      return;
    if (this.activeElement !== n && isDescendantOf(this.activeElement, u)) return;
    let activeElement = this.activeElement;
    ((this.activeElement = null), this.dispatchFocusEvent(activeElement, new FocusEvent("blur", null)));
    while (this.focusStack.length > 0) {
      let p = this.focusStack.pop();
      if (isDescendantOf(p, u)) {
        ((this.activeElement = p),
          this.dispatchFocusEvent(p, new FocusEvent("focus", activeElement)),
          this.notify());
        return;
      }
    }
    let at = this.autoFocusStack.at(-1);
    if (at) ((this.activeElement = at), this.dispatchFocusEvent(at, new FocusEvent("focus", activeElement)));
    this.notify();
  }
  pushAutoFocusFallback(n) {
    if (this.autoFocusStack.at(-1) === n) return;
    let index = this.autoFocusStack.indexOf(n);
    if (index !== -1) this.autoFocusStack.splice(index, 1);
    if ((this.autoFocusStack.push(n), this.autoFocusStack.length > MAX_FOCUS_STACK))
      this.autoFocusStack.shift();
  }
  handleAutoFocus(n) {
    (this.pushAutoFocusFallback(n), this.focus(n));
  }
  handleClickFocus(n) {
    if (typeof n.attributes.tabIndex !== "number") return;
    this.focus(n);
  }
  focusNext(n) {
    this.moveFocus(1, n);
  }
  focusPrevious(n) {
    this.moveFocus(-1, n);
  }
  focusDirection(n, u) {
    if (!this.activeElement) return (this.moveFocus(1, u), !0);
    let f = getNodeScreenRect(this.activeElement);
    if (!f) return !1;
    let m = null,
      p = 1 / 0;
    for (let g of collectTabbable(u)) {
      if (isDescendantOf(this.activeElement, g)) continue;
      let E = getNodeScreenRect(g);
      if (!E) continue;
      let T = directionalFocusScore(f, E, n);
      if (T < p) ((p = T), (m = g));
    }
    if (m) return (this.focus(m), !0);
    return !1;
  }
  moveFocus(n, u) {
    let f = collectTabbable(u);
    if (f.length === 0) return;
    let m = this.activeElement ? f.indexOf(this.activeElement) : -1,
      p = m === -1 ? (n === 1 ? 0 : f.length - 1) : (m + n + f.length) % f.length,
      g = f[p];
    if (g) this.focus(g);
  }
}
/**
 * tabIndex 是非负数即可 Tab 聚焦。
 */
//@ chunk-bzr73sfg.js:193701-193777 fingerprint = walkTree (0.357)
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
    if (collectTabbable(child).length > 0) return !0;
  }
  return !1;
}
/**
 * 方向键焦点移动时计算两个节点间的距离（不在该方向返回无穷大）。
 */
//@ chunk-bzr73sfg.js:194072-194383 placement
function directionalFocusScore(fromRect, toRect, direction) {
  let fromCx = fromRect.x + fromRect.width / 2,
    fromCy = fromRect.y + fromRect.height / 2,
    toCx = toRect.x + toRect.width / 2,
    toCy = toRect.y + toRect.height / 2,
    isHorizontal = direction === "left" || direction === "right",
    sign = direction === "right" || direction === "down" ? 1 : -1,
    distance = (isHorizontal ? toCx - fromCx : toCy - fromCy) * sign;
  if (distance <= 0) return 1 / 0;
  let offAxis = isHorizontal
      ? distanceOutsideSpan(fromCy, toRect.y, toRect.height)
      : distanceOutsideSpan(fromCx, toRect.x, toRect.width),
    overlap = isHorizontal
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
/**
 * 取节点的绝对布局（缓存或由 yoga 计算并累加父节点偏移）。
 */
//@ chunk-bzr73sfg.js:194525-194881 placement
function getNodeScreenRect(node) {
  let cachedLayout = node.cachedLayout;
  if (cachedLayout) return cachedLayout;
  let yogaNode = node.yogaNode;
  if (!yogaNode) return;
  let computedLeft = yogaNode.getComputedLeft(),
    computedTop = yogaNode.getComputedTop(),
    parentNode = node.parentNode;
  while (parentNode) {
    let cachedLayout = parentNode.cachedLayout;
    if (cachedLayout)
      return {
        x: cachedLayout.x + computedLeft,
        y: cachedLayout.y + computedTop,
        width: yogaNode.getComputedWidth(),
        height: yogaNode.getComputedHeight(),
      };
    if (parentNode.yogaNode)
      ((computedLeft += parentNode.yogaNode.getComputedLeft()),
        (computedTop += parentNode.yogaNode.getComputedTop()));
    parentNode = parentNode.parentNode;
  }
  return;
}
/**
 * 判断节点是否在另一节点之下。
 */
//@ chunk-bzr73sfg.js:194881-194957 placement
function isDescendantOf(node, ancestor) {
  let f = node;
  while (f) {
    if (f === ancestor) return !0;
    f = f.parentNode;
  }
  return !1;
}
/**
 * 沿父链找挂着 focusManager 的根节点，找不到抛错。
 */
//@ chunk-bzr73sfg.js:194957-195089 fingerprint = getRootNode (1)
function getRootNode(node) {
  let current = node;
  while (current) {
    if (current.focusManager) return current;
    current = current.parentNode;
  }
  throw Error("Node is not in a tree with a FocusManager");
}
/**
 * 取节点所在树的 FocusManager。
 */
//@ chunk-bzr73sfg.js:195089-195131 fingerprint = getFocusManager (1)
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
