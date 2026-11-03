/**
 * ink/dom.ts
 *
 * 并入旧版已有路径：Ink DOM。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/dom.ts
 * pieces: chunk-24t3dkzb.js (1), chunk-bzr73sfg.js (24)
 * attribution: placement 7, fingerprint 10, callgraph-witnessed 2, layout 1, file-local 3, affinity 1, callgraph-fingerprint 1
 */
import { Yoga } from "./components/ErrorBoundary.js";
import { markHasAbsoluteDescendant } from "./focus.js";
import { Uy, dd, squashTextNodesToSegments, F0t } from "./squash-text-nodes.js";
import { Wy } from "./styles.js";
import { Gy, nrn } from "./layout/node.js";
import { nje } from "./wrapAnsi.js";
import { wrapText } from "./wrap-text.js";
import { isSoftWrapMode } from "./render-node-to-output.js";
import { cleanupYogaNode, releaseRawModeRefs } from "./reconciler.js";
import { textWrapStyle } from "./components/Text.js";
import { isEmptyCellAt, cellAt, softWrapStartCol, cellAtIndex, setCellStyleId } from "./screen.js";
import { hitTest } from "./hit-test.js";

/**
 * 创建 DOM 元素节点：除 ink-virtual-text/ink-link/ink-progress 外都建 yoga 节点；ink-text 和 ink-raw-ansi 挂测量函数。316 的节点比 2.1.88 多了大量滚动（scrollTop/pendingScrollDelta/stickyScroll/scrollAnchor…）、渲染缓存（cachedLayout/paintsPastRect/childrenOverlap/pendingClears）、原始模式引用与无障碍字段。
 */
//@ chunk-bzr73sfg.js:182451-183635 fingerprint = createNode (0.457)
var createNode = (nodeName, yogaConfig) => {
  let node = {
    nodeName: nodeName,
    attributes: {},
    childNodes: [],
    textStyles: void 0,
    accessibility: void 0,
    onComputeLayout: void 0,
    layoutStale: void 0,
    transcriptFrontCutRows: void 0,
    onRender: void 0,
    onImmediateRender: void 0,
    hasRenderedContent: void 0,
    dirty: !1,
    isHidden: void 0,
    _eventHandlers: void 0,
    _holdsRawModeRef: void 0,
    scrollTop: void 0,
    pendingScrollDelta: void 0,
    scrollClampMin: void 0,
    scrollClampMax: void 0,
    scrollHeight: void 0,
    scrollHeightHwm: void 0,
    scrollViewportHeight: void 0,
    scrollViewportTop: void 0,
    scrollTopRendered: void 0,
    stickyScroll: void 0,
    scrollAnchor: void 0,
    focusManager: void 0,
    setRawMode: void 0,
    _pendingRawModeDelta: void 0,
    scrollCommitStartedAt: void 0,
    lastCommitMs: void 0,
    debugRepaints: void 0,
    debugOwnerChain: void 0,
    hasAbsoluteDescendant: void 0,
    cachedLayout: void 0,
    hasEscapingDescendant: void 0,
    paintsPastRect: void 0,
    childrenOverlap: void 0,
    childrenPaintingPastRect: void 0,
    pendingClears: void 0,
    absoluteNodeRemoved: void 0,
    parentNode: void 0,
    yogaNode:
      nodeName !== "ink-virtual-text" && nodeName !== "ink-link" && nodeName !== "ink-progress"
        ? Yoga.Node.create(yogaConfig)
        : void 0,
    style: {},
  };
  if (nodeName === "ink-text") node.yogaNode?.setMeasureFunc(measureTextNode.bind(null, node));
  else if (nodeName === "ink-raw-ansi") node.yogaNode?.setMeasureFunc(measureRawAnsiNode.bind(null, node));
  return node;
};
/**
 * DOM 子节点增删：appendChildNode / insertBeforeNode 同步插入 yoga 子节点（yoga 下标只数有 yoga 节点的兄弟），绝对定位时标记祖先；removeChildNode 移除 yoga 子节点、收集被删节点上次绘制的区域作为待清除矩形。三者最后都 markDirty。
 */
//@ chunk-bzr73sfg.js:183734-184657 callgraph-witnessed = removeChildNode (0.48)
var appendChildNode = (parent, child) => {
    if (child.parentNode) removeChildNode(child.parentNode, child);
    if (((child.parentNode = parent), parent.childNodes.push(child), child.yogaNode))
      parent.yogaNode?.insertChild(child.yogaNode, parent.yogaNode.getChildCount());
    if (child.style.position === "absolute" || (child.nodeName !== "#text" && child.hasAbsoluteDescendant))
      markHasAbsoluteDescendant(parent);
    markDirty(parent);
  },
  insertBeforeNode = (parent, child, beforeChild) => {
    if (child.parentNode) removeChildNode(child.parentNode, child);
    if (
      ((child.parentNode = parent),
      child.style.position === "absolute" || (child.nodeName !== "#text" && child.hasAbsoluteDescendant))
    )
      markHasAbsoluteDescendant(parent);
    let index = parent.childNodes.indexOf(beforeChild);
    if (index >= 0) {
      let p = 0;
      if (child.yogaNode && parent.yogaNode) {
        for (let g = 0; g < index; g++) if (parent.childNodes[g]?.yogaNode) p++;
      }
      if ((parent.childNodes.splice(index, 0, child), child.yogaNode && parent.yogaNode))
        parent.yogaNode.insertChild(child.yogaNode, p);
      markDirty(parent);
      return;
    }
    if ((parent.childNodes.push(child), child.yogaNode))
      parent.yogaNode?.insertChild(child.yogaNode, parent.yogaNode.getChildCount());
    markDirty(parent);
  },
  removeChildNode = (parent, child) => {
    if (child.yogaNode) child.parentNode?.yogaNode?.removeChild(child.yogaNode);
    if (collectRemovedRects(parent, child, !1)) Uy(parent);
    child.parentNode = void 0;
    let index = parent.childNodes.indexOf(child);
    if (index >= 0) parent.childNodes.splice(index, 1);
    markDirty(parent);
  };
/**
 * 递归收集被删除子树里各节点上次绘制的矩形（cachedLayout 与 pendingClears），记到父节点的待清除列表；返回子树里是否有绝对定位节点（需要更大范围重绘）。
 */
//@ chunk-bzr73sfg.js:184657-184907 fingerprint = collectRemovedRects (0.864)
function collectRemovedRects(parent, removed, underAbsolute) {
  if (removed.nodeName === "#text") return !1;
  let element = removed,
    isAbsolute = underAbsolute || element.style.position === "absolute",
    hadAbsolute = !1,
    cachedLayout = element.cachedLayout;
  if (cachedLayout) (dd(parent, cachedLayout), (element.cachedLayout = void 0), (hadAbsolute = isAbsolute));
  for (let T of element.pendingClears ?? []) dd(parent, T);
  for (let child of element.childNodes) if (collectRemovedRects(parent, child, isAbsolute)) hadAbsolute = !0;
  return hadAbsolute;
}
/**
 * 节点属性写入：setAttribute（children 除外，值变了才 markDirty）、setAccessibility、setStyle（浅比较不变则跳过，新变成 absolute 时标记祖先）、setStyleAndApplyLayout（只把变化的样式键写进 yoga）、diffProps（返回变化键，删掉的键值为 undefined）、setTextStyles。
 */
//@ chunk-bzr73sfg.js:184907-185533 callgraph-witnessed = appendChildNode (0.225)
var setAttribute = (node, key, value) => {
    if (key === "children") return;
    if (node.attributes[key] === value) return;
    ((node.attributes[key] = value), markDirty(node));
  },
  setAccessibility = (node, u) => {
    node.accessibility = u;
  },
  setStyle = (node, style) => {
    if (stylesEqual(node.style, style)) return;
    let f = style.position === "absolute" && node.style.position !== "absolute";
    if (((node.style = style), f && node.parentNode)) markHasAbsoluteDescendant(node.parentNode);
    markDirty(node);
  },
  setStyleAndApplyLayout = (node, style) => {
    let f = diffProps(node.style, style);
    if ((setStyle(node, style), f && node.yogaNode)) Wy(node.yogaNode, f, style);
  },
  diffProps = (prev, next) => {
    if (prev === next) return;
    if (!prev) return next;
    let f = {},
      m = !1;
    for (let p of Object.keys(prev)) if (next ? !Object.hasOwn(next, p) : !0) ((f[p] = void 0), (m = !0));
    if (next) {
      for (let p of Object.keys(next)) if (next[p] !== prev[p]) ((f[p] = next[p]), (m = !0));
    }
    return m ? f : void 0;
  },
  setTextStyles = (node, textStyles) => {
    if (shallowEqual(node.textStyles, textStyles)) return;
    ((node.textStyles = textStyles), markDirty(node));
  };
//@ chunk-bzr73sfg.js:185533-185565 layout
function stylesEqual(n, u) {
  return shallowEqual(n, u);
}
/**
 * 浅比较两个样式/属性对象（commitUpdate 判断是否需要写回）。
 */
//@ chunk-bzr73sfg.js:185565-185774 file-local
function shallowEqual(a, b) {
  if (a === b) return !0;
  if (a === void 0 || b === void 0) return !1;
  let aKeys = Object.keys(a),
    bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return !1;
  for (let key of aKeys) if (!Object.hasOwn(b, key) || a[key] !== b[key]) return !1;
  return !0;
}
/**
 * createTextNode 建 #text 节点；measureTextNode 是 ink-text 的 yoga 测量函数：取压平文本（含 ANSI 时按段），wrap-stream 少算末尾一行；放得下直接返回自然尺寸，否则按 textWrap 折行后再量。
 */
//@ chunk-bzr73sfg.js:185774-186235 fingerprint = measureTextNode (0.761)
var createTextNode = (text) => {
    let node = { nodeName: "#text", nodeValue: text, yogaNode: void 0, parentNode: void 0, style: {} };
    return (setTextNodeValue(node, text), node);
  },
  measureTextNode = function (node, width, widthMode) {
    let text = node.nodeName === "#text" ? node.nodeValue : Gy(node),
      textWrap = node.style?.textWrap ?? "wrap",
      lines = nrn(
        node.nodeName !== "#text" && nje(text) ? squashTextNodesToSegments(node).map((T) => T.text) : [text],
      );
    if (textWrap === "wrap-stream") {
      let T = measureWrappedText(lines, width, widthMode, "wrap");
      return { width: T.width, height: Math.max(0, T.height - 1) };
    }
    let size = F0t(lines, width);
    if (widthMode === 0 || size.width <= width) return size;
    if (size.width >= 1 && width > 0 && width < 1) return size;
    return measureWrappedText(lines, width, widthMode, textWrap);
  };
/**
 * 按 textWrap 折行后测量；AT_MOST 模式下含非 ASCII 字符且按实际宽度重折会改变行数时，宽度取满 maxWidth，避免二次布局抖动。
 */
//@ chunk-bzr73sfg.js:186235-186428 file-local
function measureWrappedText(text, maxWidth, widthMode, textWrap) {
  let size = F0t(wrapText(text, maxWidth, textWrap), 1 / 0);
  if (
    widthMode === 2 &&
    size.width > 0 &&
    size.width < maxWidth &&
    isSoftWrapMode(textWrap) &&
    /[^\x00-\x7f]/.test(text) &&
    F0t(wrapText(text, size.width, textWrap), 1 / 0).height !== size.height
  )
    return { width: maxWidth, height: size.height };
  return size;
}
/**
 * measureRawAnsiNode：ink-raw-ansi 的测量函数，直接用 rawWidth/rawHeight 属性。markDirty：沿父链置 dirty，并把最近的 ink-text/ink-raw-ansi 的 yoga 节点标脏。scheduleRenderFrom：找到根并调 onRender。scheduleLayoutFrom：同上但先置 layoutStale。
 */
//@ chunk-bzr73sfg.js:186428-186908 fingerprint = markDirty (0.771)
var measureRawAnsiNode = function (node) {
    return { width: node.attributes.rawWidth, height: node.attributes.rawHeight };
  },
  markDirty = (node) => {
    let cur = node,
      yogaMarked = !1;
    while (cur) {
      if (cur.nodeName !== "#text") {
        if (
          ((cur.dirty = !0),
          !yogaMarked && (cur.nodeName === "ink-text" || cur.nodeName === "ink-raw-ansi") && cur.yogaNode)
        )
          (cur.yogaNode.markDirty(), (yogaMarked = !0));
      }
      cur = cur.parentNode;
    }
  },
  scheduleRenderFrom = (node) => {
    let cur = node;
    while (cur?.parentNode) cur = cur.parentNode;
    if (cur && cur.nodeName !== "#text") cur.onRender?.();
  },
  scheduleLayoutFrom = (node) => {
    let cur = node;
    while (cur?.parentNode) cur = cur.parentNode;
    if (cur && cur.nodeName !== "#text") ((cur.layoutStale = !0), cur.onRender?.());
  };
/**
 * 在根节点记下滚动提交开始时间（resetAfterCommit 据此算 lastCommitMs）。
 */
//@ chunk-bzr73sfg.js:186908-187008 file-local
function markScrollCommitStart(node) {
  let root = node;
  while (root.parentNode) root = root.parentNode;
  root.scrollCommitStartedAt = performance.now();
}
/**
 * 设置文本节点内容，变了才 markDirty。
 */
//@ chunk-bzr73sfg.js:187008-187105 fingerprint = setTextNodeValue (1)
var setTextNodeValue = (node, text) => {
  if (typeof text !== "string") text = String(text);
  if (node.nodeValue === text) return;
  ((node.nodeValue = text), markDirty(node));
};
//@ chunk-bzr73sfg.js:187105-187148 fingerprint = isDOMElement (1)
function isDOMElement(node) {
  return node.nodeName !== "#text";
}
/**
 * 递归清掉子树上的 yogaNode 引用（释放 yoga 节点前调用）。
 */
//@ chunk-bzr73sfg.js:187148-187232 fingerprint = clearYogaNodeReferences (1)
var clearYogaNodeReferences = (node) => {
  if ("childNodes" in node) for (let child of node.childNodes) clearYogaNodeReferences(child);
  node.yogaNode = void 0;
};
/**
 * 调试重绘用：找出覆盖屏幕第 y 行的最深节点的 React 组件所有者链（debugOwnerChain）。
 */
//@ chunk-bzr73sfg.js:187232-187497 fingerprint = findOwnerChainAtRow (0.916)
function findOwnerChainAtRow(root, y) {
  let best = [];
  return (walk(root, 0), best);
  function walk(node, offsetY) {
    let yoga = node.yogaNode;
    if (!yoga || yoga.getDisplay() === 1) return;
    let top = offsetY + yoga.getComputedTop(),
      height = yoga.getComputedHeight();
    if (y < top || y >= top + height) return;
    if (node.debugOwnerChain) best = node.debugOwnerChain;
    for (let child of node.childNodes) if (isDOMElement(child)) walk(child, top);
  }
}
/**
 * reconciler 的 removeChild：从 DOM 和 yoga 中移除并释放 yoga 节点；通知焦点管理器节点已删除；归还子树持有的原始模式引用。
 */
//@ chunk-bzr73sfg.js:195730-195906 fingerprint = scheduleRenderFrom (0.662)
function removeChildAndCleanup(parent, child) {
  if ((removeChildNode(parent, child), cleanupYogaNode(child), child.nodeName === "#text")) return;
  let root = parent;
  while (root.parentNode) root = root.parentNode;
  if (!root.focusManager) return;
  (root.focusManager.handleNodeRemoved(child, root), releaseRawModeRefs(child, root));
}
//@ chunk-bzr73sfg.js:249748-249859 affinity
var DEFAULT_TREE_BOX_STYLE = {
  flexWrap: "nowrap",
  flexDirection: "row",
  flexGrow: 0,
  flexShrink: 1,
  overflowX: "visible",
  overflowY: "visible",
};
/**
 * 命令式 DOM 子树：在某个挂载节点下直接创建/插入/删除 ink-box、ink-text、ink-virtual-text（span），改样式和文字，改动后只触发重新布局与重绘（不经 React）；校验节点归属与嵌套规则（文字里只能放 span）。rect() 读上一帧的位置。2.1.88 没有。
 */
//@ chunk-bzr73sfg.js:249859-251690 callgraph-fingerprint = createTextNode (0.198)
class ImperativeTree {
  mount;
  own = new WeakSet();
  constructor(n) {
    this.mount = n;
  }
  box(n = {}) {
    return this.create("ink-box", { ...DEFAULT_TREE_BOX_STYLE, ...n });
  }
  text(n, u = {}) {
    let create = this.create("ink-text", textWrapStyle("wrap"));
    return (setTextStyles(create, u), appendChildNode(create, createTextNode(n)), create);
  }
  span(n, u = {}) {
    let create = this.create("ink-virtual-text", {});
    return (setTextStyles(create, u), appendChildNode(create, createTextNode(n)), create);
  }
  append(n, u) {
    (this.mustHold(n, u), appendChildNode(n, u), this.changed(n));
  }
  insertBefore(n, u, f) {
    (this.mustHold(n, u), this.mustBeOwn(f), insertBeforeNode(n, u, f), this.changed(n));
  }
  remove(n) {
    (this.mustBeOwn(n), this.forget(n));
    let parentNode = n.parentNode;
    if (!parentNode) return;
    (removeChildAndCleanup(parentNode, n), this.changed(parentNode));
  }
  empty() {
    for (let n of this.mount.childNodes.slice())
      if (n.nodeName !== "#text" && this.own.has(n)) this.remove(n);
  }
  setStyle(n, u) {
    (this.mustBeOwn(n), setStyleAndApplyLayout(n, { ...DEFAULT_TREE_BOX_STYLE, ...u }), this.changed(n));
  }
  setTextStyles(n, u) {
    (this.mustBeOwn(n), setTextStyles(n, u), this.changed(n));
  }
  setText(n, u) {
    (setTextNodeValue(this.textOf(n), u), this.changed(n));
  }
  appendText(n, u) {
    let textOf = this.textOf(n);
    (setTextNodeValue(textOf, textOf.nodeValue + u), this.changed(n));
  }
  rect(n) {
    this.mustBeOwn(n);
    let cachedLayout = n.cachedLayout;
    if (!cachedLayout) return;
    return { x: cachedLayout.x, y: cachedLayout.y, width: cachedLayout.width, height: cachedLayout.height };
  }
  create(n, u) {
    let f = createNode(n, this.mount.yogaNode?.config);
    return (setStyleAndApplyLayout(f, u), this.own.add(f), f);
  }
  changed(n) {
    let u = n;
    while (u && u !== this.mount) u = u.parentNode;
    if (u) scheduleLayoutFrom(this.mount);
  }
  textOf(n) {
    this.mustBeOwn(n);
    let u = n.childNodes[0];
    if (u?.nodeName !== "#text") throw Error("Tree: only a text or a span has text");
    return u;
  }
  mustBeOwn(n) {
    if (!this.own.has(n)) throw Error("Tree: that node is not this tree\u2019s");
  }
  mustHold(n, u) {
    if (n !== this.mount) this.mustBeOwn(n);
    this.mustBeOwn(u);
    let f = n.nodeName === "ink-text" || n.nodeName === "ink-virtual-text" || n.nodeName === "ink-link";
    if (f && u.nodeName !== "ink-virtual-text")
      throw Error("Tree: a box or a text can\u2019t go inside text, only a span");
    if (!f && u.nodeName === "ink-virtual-text") throw Error("Tree: a span only goes inside text");
  }
  forget(n) {
    if ((this.own.delete(n), n.nodeName === "#text")) return;
    for (let childNode of n.childNodes) this.forget(childNode);
  }
}
/**
 * 悬停时鼠标是否落在“真正的空白”上：格为空，且不是文本节点内部两段文字之间的空隙（左右最近的非空格都属于同一文本节点则不算空白）。配合 hoverIgnoresBlankCells 使用。
 */
//@ chunk-bzr73sfg.js:256529-256809 placement
function isOverBlankCell(root, screen, target, col, row) {
  if (!isEmptyCellAt(screen, col, row)) return !1;
  let textRect =
    target?.nodeName === "ink-text" || target?.nodeName === "ink-raw-ansi" ? target.cachedLayout : void 0;
  if (!textRect) return !0;
  let leftInk = findInkCol(screen, row, col, Math.floor(textRect.x) - 1, -1),
    rightInk = findInkCol(screen, row, col, Math.ceil(textRect.x + textRect.width), 1);
  return !(
    leftInk !== void 0 &&
    rightInk !== void 0 &&
    hitTest(root, leftInk, row) === target &&
    hitTest(root, rightInk, row) === target
  );
}
//@ chunk-bzr73sfg.js:256809-256887 placement
function findInkCol(screen, row, fromCol, stopCol, step) {
  for (let g = fromCol + step; g !== stopCol; g += step) if (!isEmptyCellAt(screen, g, row)) return g;
  return;
}
//@ chunk-bzr73sfg.js:256887-257019 placement
function acceptsHover(node, overBlank) {
  let _eventHandlers = node._eventHandlers;
  return (
    Boolean(_eventHandlers?.onMouseEnter || _eventHandlers?.onMouseLeave) &&
    !(overBlank && node.attributes.hoverIgnoresBlankCells)
  );
}
/**
 * 取 (col,row) 格的 OSC 8 链接；点在宽字符右半时取左半的链接。
 */
//@ chunk-bzr73sfg.js:257019-257135 placement
function hyperlinkAt(screen, col, row) {
  let cell = cellAt(screen, col, row);
  if (!cell?.hyperlink && cell?.width === 2) return cellAt(screen, col - 1, row)?.hyperlink;
  return cell?.hyperlink;
}
/**
 * 在屏幕缓冲中找出同一超链接/样式的软换行连续片段。
 */
//@ chunk-bzr73sfg.js:257135-257613 placement
function underlineHyperlinkAt(screen, col, row, url, stylePool) {
  if (url === void 0 || hyperlinkAt(screen, col, row) !== url) return [];
  let span = hyperlinkSpanInRow(screen, col, row, url),
    spans = [span],
    T = span;
  for (let D = row + 1; D < screen.height; D++) {
    let O = screen.softWrap[D],
      _ = softWrapStartCol(O);
    if (O === 0 || T.to + 1 !== O >>> 16 || hyperlinkAt(screen, _, D) !== url) break;
    ((T = hyperlinkSpanInRow(screen, _, D, url)), spans.push(T));
  }
  let A = span;
  for (let D = row; D > 0; D--) {
    let O = screen.softWrap[D],
      _ = (O >>> 16) - 1;
    if (O === 0 || A.from !== softWrapStartCol(O) || hyperlinkAt(screen, _, D - 1) !== url) break;
    ((A = hyperlinkSpanInRow(screen, _, D - 1, url)), spans.push(A));
  }
  for (let D of spans)
    for (let from = D.from; from <= D.to; from++) {
      let _ = cellAtIndex(screen, D.row * screen.width + from);
      setCellStyleId(screen, from, D.row, stylePool.withUnderline(_.styleId));
    }
  return spans;
}
/**
 * 在终端网格某行内向左右扩展同值单元格，返回 {row, from, to}（Ink 选择相关，归属错误）。
 */
//@ chunk-bzr73sfg.js:257613-257728 placement = countUniqueFilesFromOutgoingCalls (0.482)
function hyperlinkSpanInRow(screen, col, row, url) {
  let p = col;
  while (hyperlinkAt(screen, p - 1, row) === url) p--;
  let g = col;
  while (hyperlinkAt(screen, g + 1, row) === url) g++;
  return { row: row, from: p, to: g };
}
//@ chunk-bzr73sfg.js:310990-311083 fingerprint = setStyle (0.644)
function isDegenerateBorderBox(node, width, height) {
  return node.style.borderStyle !== void 0 && (Math.floor(width) < 2 || Math.floor(height) === 0);
}
/**
 * 把 aria-* 属性收成 accessibility 对象（全空返回 undefined）。
 */
//@ chunk-24t3dkzb.js:6720-6874 placement
function buildAccessibility(hidden, label, role, state, preserveWhitespace) {
  if (
    hidden === void 0 &&
    label === void 0 &&
    role === void 0 &&
    state === void 0 &&
    preserveWhitespace === void 0
  )
    return;
  return { hidden: hidden, label: label, role: role, state: state, preserveWhitespace: preserveWhitespace };
}

export {
  markDirty,
  markScrollCommitStart,
  scheduleRenderFrom,
  buildAccessibility,
  isDegenerateBorderBox,
  isDOMElement,
  clearYogaNodeReferences,
  setStyleAndApplyLayout,
  setAccessibility,
  setAttribute,
  createNode,
  createTextNode,
  setTextNodeValue,
  appendChildNode,
  insertBeforeNode,
  removeChildAndCleanup,
  diffProps,
  setTextStyles,
  isOverBlankCell,
  acceptsHover,
  underlineHyperlinkAt,
  findOwnerChainAtRow,
  hyperlinkAt,
  ImperativeTree,
};
