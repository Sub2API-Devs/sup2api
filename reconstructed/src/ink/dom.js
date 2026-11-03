/**
 * ink/dom.ts
 *
 * 并入旧版已有路径：Ink DOM。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/dom.ts
 * pieces: chunk-24t3dkzb.js (1), chunk-bzr73sfg.js (27)
 * attribution: placement 10, fingerprint 10, callgraph-witnessed 2, layout 1, file-local 3, affinity 1, callgraph-fingerprint 1
 */
import { Yoga } from "./components/ErrorBoundary.js";
import { markHasAbsoluteDescendant } from "./focus.js";
import {
  markAbsoluteNodeRemoved,
  queuePendingClear,
  squashTextNodesToSegments,
  measureTextAlias,
} from "./squash-text-nodes.js";
import { applyAllStylesAlias } from "./styles.js";
import { squashTextNodesAlias, squashTextOf } from "./layout/node.js";
import { hasControlSequences } from "./wrapAnsi.js";
import { wrapText } from "./wrap-text.js";
import { isSoftWrapMode } from "./render-node-to-output.js";
import { cleanupYogaNode, releaseRawModeRefs } from "./reconciler.js";
import { textWrapStyle } from "./components/Text.js";
import { isEmptyCellAt, cellAt, softWrapStartCol, cellAtIndex, setCellStyleId } from "./screen.js";
import { hitTest } from "./hit-test.js";

//@ chunk-bzr73sfg.js:182451-183635 fingerprint = createNode (0.457)
/**
 * 创建 DOM 元素节点：除 ink-virtual-text/ink-link/ink-progress 外都建 yoga 节点；ink-text 和 ink-raw-ansi 挂测量函数。316 的节点比 2.1.88 多了大量滚动（scrollTop/pendingScrollDelta/stickyScroll/scrollAnchor…）、渲染缓存（cachedLayout/paintsPastRect/childrenOverlap/pendingClears）、原始模式引用与无障碍字段。
 */
var createNode = (nodeName, yogaConfig) => {
  let node = {
    nodeName,
    attributes: {},
    childNodes: [],
    textStyles: undefined,
    accessibility: undefined,
    onComputeLayout: undefined,
    layoutStale: undefined,
    transcriptFrontCutRows: undefined,
    onRender: undefined,
    onImmediateRender: undefined,
    hasRenderedContent: undefined,
    dirty: false,
    isHidden: undefined,
    _eventHandlers: undefined,
    _holdsRawModeRef: undefined,
    scrollTop: undefined,
    pendingScrollDelta: undefined,
    scrollClampMin: undefined,
    scrollClampMax: undefined,
    scrollHeight: undefined,
    scrollHeightHwm: undefined,
    scrollViewportHeight: undefined,
    scrollViewportTop: undefined,
    scrollTopRendered: undefined,
    stickyScroll: undefined,
    scrollAnchor: undefined,
    focusManager: undefined,
    setRawMode: undefined,
    _pendingRawModeDelta: undefined,
    scrollCommitStartedAt: undefined,
    lastCommitMs: undefined,
    debugRepaints: undefined,
    debugOwnerChain: undefined,
    hasAbsoluteDescendant: undefined,
    cachedLayout: undefined,
    hasEscapingDescendant: undefined,
    paintsPastRect: undefined,
    childrenOverlap: undefined,
    childrenPaintingPastRect: undefined,
    pendingClears: undefined,
    absoluteNodeRemoved: undefined,
    parentNode: undefined,
    yogaNode:
      nodeName !== "ink-virtual-text" && nodeName !== "ink-link" && nodeName !== "ink-progress"
        ? Yoga.Node.create(yogaConfig)
        : undefined,
    style: {},
  };
  if (nodeName === "ink-text") node.yogaNode?.setMeasureFunc(measureTextNode.bind(null, node));
  else if (nodeName === "ink-raw-ansi") node.yogaNode?.setMeasureFunc(measureRawAnsiNode.bind(null, node));
  return node;
};
//@ chunk-bzr73sfg.js:183734-184657 callgraph-witnessed = removeChildNode (0.48)
/**
 * DOM 子节点增删：appendChildNode / insertBeforeNode 同步插入 yoga 子节点（yoga 下标只数有 yoga 节点的兄弟），绝对定位时标记祖先；removeChildNode 移除 yoga 子节点、收集被删节点上次绘制的区域作为待清除矩形。三者最后都 markDirty。
 */
var appendChildNode = (parent, child) => {
  if (child.parentNode) removeChildNode(child.parentNode, child);
  child.parentNode = parent;
  parent.childNodes.push(child);
  if (child.yogaNode) parent.yogaNode?.insertChild(child.yogaNode, parent.yogaNode.getChildCount());
  if (child.style.position === "absolute" || (child.nodeName !== "#text" && child.hasAbsoluteDescendant))
    markHasAbsoluteDescendant(parent);
  markDirty(parent);
};
var insertBeforeNode = (parent, child, beforeChild) => {
  if (child.parentNode) removeChildNode(child.parentNode, child);
  child.parentNode = parent;
  if (child.style.position === "absolute" || (child.nodeName !== "#text" && child.hasAbsoluteDescendant))
    markHasAbsoluteDescendant(parent);
  let index = parent.childNodes.indexOf(beforeChild);
  if (index >= 0) {
    let yogaIndex = 0;
    if (child.yogaNode && parent.yogaNode) {
      for (let i = 0; i < index; i++) if (parent.childNodes[i]?.yogaNode) yogaIndex++;
    }
    parent.childNodes.splice(index, 0, child);
    if (child.yogaNode && parent.yogaNode) parent.yogaNode.insertChild(child.yogaNode, yogaIndex);
    markDirty(parent);
    return;
  }
  parent.childNodes.push(child);
  if (child.yogaNode) parent.yogaNode?.insertChild(child.yogaNode, parent.yogaNode.getChildCount());
  markDirty(parent);
};
var removeChildNode = (parent, child) => {
  if (child.yogaNode) child.parentNode?.yogaNode?.removeChild(child.yogaNode);
  if (collectRemovedRects(parent, child, false)) markAbsoluteNodeRemoved(parent);
  child.parentNode = undefined;
  let index = parent.childNodes.indexOf(child);
  if (index >= 0) parent.childNodes.splice(index, 1);
  markDirty(parent);
};
//@ chunk-bzr73sfg.js:184657-184907 fingerprint = collectRemovedRects (0.864)
/**
 * 递归收集被删除子树里各节点上次绘制的矩形（cachedLayout 与 pendingClears），记到父节点的待清除列表；返回子树里是否有绝对定位节点（需要更大范围重绘）。
 */
function collectRemovedRects(parent, removed, underAbsolute) {
  if (removed.nodeName === "#text") return false;
  let element = removed;
  let isAbsolute = underAbsolute || element.style.position === "absolute";
  let hadAbsolute = false;
  let cached = element.cachedLayout;
  if (cached) {
    queuePendingClear(parent, cached);
    element.cachedLayout = undefined;
    hadAbsolute = isAbsolute;
  }
  for (let T of element.pendingClears ?? []) queuePendingClear(parent, T);
  for (let child of element.childNodes)
    if (collectRemovedRects(parent, child, isAbsolute)) hadAbsolute = true;
  return hadAbsolute;
}
//@ chunk-bzr73sfg.js:184907-185533 callgraph-witnessed = appendChildNode (0.225)
/**
 * 节点属性写入：setAttribute（children 除外，值变了才 markDirty）、setAccessibility、setStyle（浅比较不变则跳过，新变成 absolute 时标记祖先）、setStyleAndApplyLayout（只把变化的样式键写进 yoga）、diffProps（返回变化键，删掉的键值为 undefined）、setTextStyles。
 */
var setAttribute = (node, key, value) => {
  if (key === "children") return;
  if (node.attributes[key] === value) return;
  node.attributes[key] = value;
  markDirty(node);
};
var setAccessibility = (node, accessibility) => {
  node.accessibility = accessibility;
};
var setStyle = (node, style) => {
  if (stylesEqual(node.style, style)) return;
  let f = style.position === "absolute" && node.style.position !== "absolute";
  node.style = style;
  if (f && node.parentNode) markHasAbsoluteDescendant(node.parentNode);
  markDirty(node);
};
var setStyleAndApplyLayout = (node, style) => {
  let f = diffProps(node.style, style);
  setStyle(node, style);
  if (f && node.yogaNode) applyAllStylesAlias(node.yogaNode, f, style);
};
var diffProps = (prev, next) => {
  if (prev === next) return;
  if (!prev) return next;
  let f = {};
  let m = false;
  for (let key of Object.keys(prev))
    if (next ? !Object.hasOwn(next, key) : true) {
      f[key] = undefined;
      m = true;
    }
  if (next) {
    for (let key of Object.keys(next))
      if (next[key] !== prev[key]) {
        f[key] = next[key];
        m = true;
      }
  }
  return m ? f : undefined;
};
var setTextStyles = (node, textStyles) => {
  if (shallowEqual(node.textStyles, textStyles)) return;
  node.textStyles = textStyles;
  markDirty(node);
};
//@ chunk-bzr73sfg.js:185533-185565 layout
function stylesEqual(style, style_2) {
  return shallowEqual(style, style_2);
}
//@ chunk-bzr73sfg.js:185565-185774 file-local
/**
 * 浅比较两个样式/属性对象（commitUpdate 判断是否需要写回）。
 */
function shallowEqual(a, b) {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  let aKeys = Object.keys(a);
  let bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (let key of aKeys) if (!Object.hasOwn(b, key) || a[key] !== b[key]) return false;
  return true;
}
//@ chunk-bzr73sfg.js:185774-186235 fingerprint = measureTextNode (0.761)
/**
 * createTextNode 建 #text 节点；measureTextNode 是 ink-text 的 yoga 测量函数：取压平文本（含 ANSI 时按段），wrap-stream 少算末尾一行；放得下直接返回自然尺寸，否则按 textWrap 折行后再量。
 */
var createTextNode = (text) => {
  let node = {
    nodeName: "#text",
    nodeValue: text,
    yogaNode: undefined,
    parentNode: undefined,
    style: {},
  };
  setTextNodeValue(node, text);
  return node;
};
var measureTextNode = function (node, width, widthMode) {
  let text = node.nodeName === "#text" ? node.nodeValue : squashTextNodesAlias(node);
  let textWrap = node.style?.textWrap ?? "wrap";
  let lines = squashTextOf(
    node.nodeName !== "#text" && hasControlSequences(text)
      ? squashTextNodesToSegments(node).map((T) => T.text)
      : [text],
  );
  if (textWrap === "wrap-stream") {
    let T = measureWrappedText(lines, width, widthMode, "wrap");
    return {
      width: T.width,
      height: Math.max(0, T.height - 1),
    };
  }
  let size = measureTextAlias(lines, width);
  if (widthMode === 0 || size.width <= width) return size;
  if (size.width >= 1 && width > 0 && width < 1) return size;
  return measureWrappedText(lines, width, widthMode, textWrap);
};
//@ chunk-bzr73sfg.js:186235-186428 file-local
/**
 * 按 textWrap 折行后测量；AT_MOST 模式下含非 ASCII 字符且按实际宽度重折会改变行数时，宽度取满 maxWidth，避免二次布局抖动。
 */
function measureWrappedText(text, maxWidth, widthMode, textWrap) {
  let size = measureTextAlias(wrapText(text, maxWidth, textWrap), 1 / 0);
  if (
    widthMode === 2 &&
    size.width > 0 &&
    size.width < maxWidth &&
    isSoftWrapMode(textWrap) &&
    /[^\x00-\x7f]/.test(text) &&
    measureTextAlias(wrapText(text, size.width, textWrap), 1 / 0).height !== size.height
  )
    return {
      width: maxWidth,
      height: size.height,
    };
  return size;
}
//@ chunk-bzr73sfg.js:186428-186908 fingerprint = markDirty (0.771)
/**
 * measureRawAnsiNode：ink-raw-ansi 的测量函数，直接用 rawWidth/rawHeight 属性。markDirty：沿父链置 dirty，并把最近的 ink-text/ink-raw-ansi 的 yoga 节点标脏。scheduleRenderFrom：找到根并调 onRender。scheduleLayoutFrom：同上但先置 layoutStale。
 */
var measureRawAnsiNode = function (node) {
  return {
    width: node.attributes.rawWidth,
    height: node.attributes.rawHeight,
  };
};
var markDirty = (node) => {
  let cur = node;
  let yogaMarked = false;
  while (cur) {
    if (cur.nodeName !== "#text") {
      cur.dirty = true;
      if (!yogaMarked && (cur.nodeName === "ink-text" || cur.nodeName === "ink-raw-ansi") && cur.yogaNode) {
        cur.yogaNode.markDirty();
        yogaMarked = true;
      }
    }
    cur = cur.parentNode;
  }
};
var scheduleRenderFrom = (node) => {
  let cur = node;
  while (cur?.parentNode) cur = cur.parentNode;
  if (cur && cur.nodeName !== "#text") cur.onRender?.();
};
var scheduleLayoutFrom = (node) => {
  let cur = node;
  while (cur?.parentNode) cur = cur.parentNode;
  if (cur && cur.nodeName !== "#text") {
    cur.layoutStale = true;
    cur.onRender?.();
  }
};
//@ chunk-bzr73sfg.js:186908-187008 file-local
/**
 * 在根节点记下滚动提交开始时间（resetAfterCommit 据此算 lastCommitMs）。
 */
function markScrollCommitStart(node) {
  let root = node;
  while (root.parentNode) root = root.parentNode;
  root.scrollCommitStartedAt = performance.now();
}
//@ chunk-bzr73sfg.js:187008-187105 fingerprint = setTextNodeValue (1)
/**
 * 设置文本节点内容，变了才 markDirty。
 */
var setTextNodeValue = (node, text) => {
  if (typeof text !== "string") text = String(text);
  if (node.nodeValue === text) return;
  node.nodeValue = text;
  markDirty(node);
};
//@ chunk-bzr73sfg.js:187105-187148 fingerprint = isDOMElement (1)
function isDOMElement(node) {
  return node.nodeName !== "#text";
}
//@ chunk-bzr73sfg.js:187148-187232 fingerprint = clearYogaNodeReferences (1)
/**
 * 递归清掉子树上的 yogaNode 引用（释放 yoga 节点前调用）。
 */
var clearYogaNodeReferences = (node) => {
  if ("childNodes" in node) for (let child of node.childNodes) clearYogaNodeReferences(child);
  node.yogaNode = undefined;
};
//@ chunk-bzr73sfg.js:187232-187497 fingerprint = findOwnerChainAtRow (0.916)
/**
 * 调试重绘用：找出覆盖屏幕第 y 行的最深节点的 React 组件所有者链（debugOwnerChain）。
 */
function findOwnerChainAtRow(root, y) {
  let best = [];
  walk(root, 0);
  return best;
  function walk(node, offsetY) {
    let yoga = node.yogaNode;
    if (!yoga || yoga.getDisplay() === 1) return;
    let top = offsetY + yoga.getComputedTop();
    let height = yoga.getComputedHeight();
    if (y < top || y >= top + height) return;
    if (node.debugOwnerChain) best = node.debugOwnerChain;
    for (let child of node.childNodes) if (isDOMElement(child)) walk(child, top);
  }
}
//@ chunk-bzr73sfg.js:195730-195906 fingerprint = scheduleRenderFrom (0.662)
/**
 * reconciler 的 removeChild：从 DOM 和 yoga 中移除并释放 yoga 节点；通知焦点管理器节点已删除；归还子树持有的原始模式引用。
 */
function removeChildAndCleanup(parent, child) {
  removeChildNode(parent, child);
  cleanupYogaNode(child);
  if (child.nodeName === "#text") return;
  let root = parent;
  while (root.parentNode) root = root.parentNode;
  if (!root.focusManager) return;
  root.focusManager.handleNodeRemoved(child, root);
  releaseRawModeRefs(child, root);
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
//@ chunk-bzr73sfg.js:249859-251690 callgraph-fingerprint = createTextNode (0.198)
/**
 * 命令式 DOM 子树：在某个挂载节点下直接创建/插入/删除 ink-box、ink-text、ink-virtual-text（span），改样式和文字，改动后只触发重新布局与重绘（不经 React）；校验节点归属与嵌套规则（文字里只能放 span）。rect() 读上一帧的位置。2.1.88 没有。
 */
class ImperativeTree {
  mount;
  own = new WeakSet();
  constructor(mount) {
    this.mount = mount;
  }
  box(n = {}) {
    return this.create("ink-box", {
      ...DEFAULT_TREE_BOX_STYLE,
      ...n,
    });
  }
  text(text, u = {}) {
    let parent = this.create("ink-text", textWrapStyle("wrap"));
    setTextStyles(parent, u);
    appendChildNode(parent, createTextNode(text));
    return parent;
  }
  span(text, u = {}) {
    let parent = this.create("ink-virtual-text", {});
    setTextStyles(parent, u);
    appendChildNode(parent, createTextNode(text));
    return parent;
  }
  append(parent, child) {
    this.mustHold(parent, child);
    appendChildNode(parent, child);
    this.changed(parent);
  }
  insertBefore(parent, child, beforeChild) {
    this.mustHold(parent, child);
    this.mustBeOwn(beforeChild);
    insertBeforeNode(parent, child, beforeChild);
    this.changed(parent);
  }
  remove(child) {
    this.mustBeOwn(child);
    this.forget(child);
    let parentNode = child.parentNode;
    if (!parentNode) return;
    removeChildAndCleanup(parentNode, child);
    this.changed(parentNode);
  }
  empty() {
    for (let childNode of this.mount.childNodes.slice())
      if (childNode.nodeName !== "#text" && this.own.has(childNode)) this.remove(childNode);
  }
  setStyle(n, u) {
    this.mustBeOwn(n);
    setStyleAndApplyLayout(n, {
      ...DEFAULT_TREE_BOX_STYLE,
      ...u,
    });
    this.changed(n);
  }
  setTextStyles(n, u) {
    this.mustBeOwn(n);
    setTextStyles(n, u);
    this.changed(n);
  }
  setText(n, u) {
    setTextNodeValue(this.textOf(n), u);
    this.changed(n);
  }
  appendText(n, u) {
    let f = this.textOf(n);
    setTextNodeValue(f, f.nodeValue + u);
    this.changed(n);
  }
  rect(n) {
    this.mustBeOwn(n);
    let cachedLayout = n.cachedLayout;
    if (!cachedLayout) return;
    return {
      x: cachedLayout.x,
      y: cachedLayout.y,
      width: cachedLayout.width,
      height: cachedLayout.height,
    };
  }
  create(nodeName, u) {
    let node = createNode(nodeName, this.mount.yogaNode?.config);
    setStyleAndApplyLayout(node, u);
    this.own.add(node);
    return node;
  }
  changed(node) {
    let cur = node;
    while (cur && cur !== this.mount) cur = cur.parentNode;
    if (cur) scheduleLayoutFrom(this.mount);
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
    this.own.delete(n);
    if (n.nodeName === "#text") return;
    for (let childNode of n.childNodes) this.forget(childNode);
  }
}
//@ chunk-bzr73sfg.js:256529-256809 placement
/**
 * 悬停时鼠标是否落在“真正的空白”上：格为空，且不是文本节点内部两段文字之间的空隙（左右最近的非空格都属于同一文本节点则不算空白）。配合 hoverIgnoresBlankCells 使用。
 */
function isOverBlankCell(root, screen, target, col, row) {
  if (!isEmptyCellAt(screen, col, row)) return false;
  let textRect =
    target?.nodeName === "ink-text" || target?.nodeName === "ink-raw-ansi" ? target.cachedLayout : undefined;
  if (!textRect) return true;
  let leftInk = findInkCol(screen, row, col, Math.floor(textRect.x) - 1, -1);
  let rightInk = findInkCol(screen, row, col, Math.ceil(textRect.x + textRect.width), 1);
  return !(
    leftInk !== undefined &&
    rightInk !== undefined &&
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
//@ chunk-bzr73sfg.js:257019-257135 placement
/**
 * 取 (col,row) 格的 OSC 8 链接；点在宽字符右半时取左半的链接。
 */
function hyperlinkAt(screen, col, row) {
  let cell = cellAt(screen, col, row);
  if (!cell?.hyperlink && cell?.width === 2) return cellAt(screen, col - 1, row)?.hyperlink;
  return cell?.hyperlink;
}
//@ chunk-bzr73sfg.js:257135-257613 placement
/**
 * 在屏幕缓冲中找出同一超链接/样式的软换行连续片段。
 */
function underlineHyperlinkAt(screen, col, row, url, stylePool) {
  if (url === undefined || hyperlinkAt(screen, col, row) !== url) return [];
  let span = hyperlinkSpanInRow(screen, col, row, url);
  let spans = [span];
  let T = span;
  for (let idx = row + 1; idx < screen.height; idx++) {
    let O = screen.softWrap[idx];
    let col = softWrapStartCol(O);
    if (O === 0 || T.to + 1 !== O >>> 16 || hyperlinkAt(screen, col, idx) !== url) break;
    T = hyperlinkSpanInRow(screen, col, idx, url);
    spans.push(T);
  }
  let A = span;
  for (let D = row; D > 0; D--) {
    let O = screen.softWrap[D];
    let col = (O >>> 16) - 1;
    if (O === 0 || A.from !== softWrapStartCol(O) || hyperlinkAt(screen, col, D - 1) !== url) break;
    A = hyperlinkSpanInRow(screen, col, D - 1, url);
    spans.push(A);
  }
  for (let span of spans)
    for (let from = span.from; from <= span.to; from++) {
      let _ = cellAtIndex(screen, span.row * screen.width + from);
      setCellStyleId(screen, from, span.row, stylePool.withUnderline(_.styleId));
    }
  return spans;
}
//@ chunk-bzr73sfg.js:257613-257728 placement = countUniqueFilesFromOutgoingCalls (0.482)
/**
 * 在终端网格某行内向左右扩展同值单元格，返回 {row, from, to}（Ink 选择相关，归属错误）。
 */
function hyperlinkSpanInRow(screen, col, row, url) {
  let p = col;
  while (hyperlinkAt(screen, p - 1, row) === url) p--;
  let g = col;
  while (hyperlinkAt(screen, g + 1, row) === url) g++;
  return {
    row,
    from: p,
    to: g,
  };
}
//@ chunk-bzr73sfg.js:258541-258557 placement
var fiberStack = [];
var domStack = [];
//@ chunk-bzr73sfg.js:258557-258754 placement
function countFibers(root) {
  if (!root) return 0;
  let u = 0;
  let f = fiberStack;
  f.length = 0;
  f.push(root);
  while (f.length > 0) {
    let m = f.pop();
    u++;
    if (m.alternate) u++;
    if (m.sibling) f.push(m.sibling);
    if (m.child) f.push(m.child);
  }
  f.length = 0;
  return u;
}
//@ chunk-bzr73sfg.js:258754-258955 placement = clearYogaNodeReferences (0.804)
function countDomNodes(root) {
  if (!root) return 0;
  let u = 0;
  let f = domStack;
  f.length = 0;
  f.push(root);
  while (f.length > 0) {
    let m = f.pop();
    u++;
    if ("childNodes" in m) {
      let childNodes = m.childNodes;
      for (let idx = 0; idx < childNodes.length; idx++) f.push(childNodes[idx]);
    }
  }
  f.length = 0;
  return u;
}
//@ chunk-bzr73sfg.js:310990-311083 fingerprint = setStyle (0.644)
function isDegenerateBorderBox(node, width, height) {
  return node.style.borderStyle !== undefined && (Math.floor(width) < 2 || Math.floor(height) === 0);
}
//@ chunk-24t3dkzb.js:6720-6874 placement
/**
 * 把 aria-* 属性收成 accessibility 对象（全空返回 undefined）。
 */
function buildAccessibility(hidden, label, role, state, preserveWhitespace) {
  if (
    hidden === undefined &&
    label === undefined &&
    role === undefined &&
    state === undefined &&
    preserveWhitespace === undefined
  )
    return;
  return {
    hidden,
    label,
    role,
    state,
    preserveWhitespace,
  };
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
  countDomNodes,
  countFibers,
  hyperlinkAt,
  ImperativeTree,
};
