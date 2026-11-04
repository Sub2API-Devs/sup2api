/**
 * native-ts/yoga-layout/index.ts
 *
 * yoga 布局引擎的 TS 移植：样式存储、flex 算法、测量缓存、基线、绝对定位、像素取整
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/native-ts/yoga-layout/index.ts
 * pieces: chunk-bzr73sfg.js (75)
 * attribution: callgraph-witnessed 6, placement 1, layout 40, fingerprint 23, callgraph-fingerprint 3, file-local 2
 */
//@ chunk-bzr73sfg.js:145717-145765 callgraph-witnessed = AUTO_VALUE (1)
var UNDEFINED_VALUE = {
  unit: 0,
  value: NaN,
};
var AUTO_VALUE = {
  unit: 3,
  value: NaN,
};
//@ chunk-bzr73sfg.js:145765-145831 placement = sanitizePath (0.712)
/**
 * 数值是否有限且绝对值不超过 2^31-1（能放进 Int32 布局存储）。
 */
function isInt32Finite(value) {
  return Number.isFinite(value) && Math.abs(value) <= 2147483647;
}
//@ chunk-bzr73sfg.js:145831-145883 callgraph-witnessed = pointValue (1)
/**
 * 点值 {unit:1, value: 取整后的整数}；超出 Int32 返回 undefined。
 */
function pointValue(v) {
  return isInt32Finite(v)
    ? {
        unit: 1,
        value: roundToInt(v),
      }
    : UNDEFINED_VALUE;
}
//@ chunk-bzr73sfg.js:145883-145931 callgraph-witnessed = percentValue (1)
/**
 * 百分比值 {unit:2, value}；超出范围返回 undefined。
 */
function percentValue(v) {
  return isInt32Finite(v)
    ? {
        unit: 2,
        value: v,
      }
    : UNDEFINED_VALUE;
}
//@ chunk-bzr73sfg.js:145931-146056 callgraph-witnessed = resolveValue (1)
/**
 * 把 Value 解析成具体数值：点值原样，百分比按 ownerSize 计算并取整（超范围为 NaN），其它 NaN。
 */
function resolveValue(v, ownerSize) {
  switch (v.unit) {
    case 1:
      return v.value;
    case 2: {
      let percentValue = (v.value * ownerSize) / 100;
      return isInt32Finite(percentValue) ? roundToInt(percentValue) : NaN;
    }
    default:
      return NaN;
  }
}
//@ chunk-bzr73sfg.js:146056-146087 layout
function isDefined(value) {
  return !isNaN(value);
}
//@ chunk-bzr73sfg.js:146087-146106 layout
var INT32_NAN = -2147483648;
//@ chunk-bzr73sfg.js:146106-146149 layout
/**
 * 四舍五入到整数（远离零），结果为 int32。
 */
function roundToInt(value) {
  return value >= 0 ? (value + 0.5) | 0 : (value - 0.5) | 0;
}
//@ chunk-bzr73sfg.js:146149-146182 layout
/**
 * NaN 转成 INT32_NAN 哨兵，用于 Int32 缓存键比较。
 */
function toInt32Key(value) {
  return value !== value ? INT32_NAN : value;
}
//@ chunk-bzr73sfg.js:146182-146201 layout
var SZ_FLEX_BASIS = 0;
var SZ_MAIN = 1;
var SZ_CROSS = 2;
//@ chunk-bzr73sfg.js:146201-146250 layout
function createInt32Cache(length) {
  return new Int32Array(length).fill(INT32_NAN);
}
//@ chunk-bzr73sfg.js:146250-146644 fingerprint = defaultStyle (1)
/**
 * 节点默认样式：方向/flexDirection column(0)、alignItems stretch、alignContent flex-start、positionType relative、flexBasis auto、宽高 auto，边距/内边距/边框/定位 9 个边全 undefined，gap 3 槽。
 */
function defaultStyle() {
  return {
    direction: 0,
    flexDirection: 0,
    justifyContent: 0,
    alignItems: 4,
    alignSelf: 0,
    alignContent: 1,
    flexWrap: 0,
    overflow: 0,
    display: 0,
    positionType: 1,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: AUTO_VALUE,
    margin: [, , , , , , , , ,].fill(UNDEFINED_VALUE),
    padding: [, , , , , , , , ,].fill(UNDEFINED_VALUE),
    border: [, , , , , , , , ,].fill(UNDEFINED_VALUE),
    position: [, , , , , , , , ,].fill(UNDEFINED_VALUE),
    gap: [, , ,].fill(UNDEFINED_VALUE),
    width: AUTO_VALUE,
    height: AUTO_VALUE,
    minWidth: UNDEFINED_VALUE,
    minHeight: UNDEFINED_VALUE,
    maxWidth: UNDEFINED_VALUE,
    maxHeight: UNDEFINED_VALUE,
  };
}
//@ chunk-bzr73sfg.js:146644-146668 layout
var EDGE_LEFT = 0;
var EDGE_TOP = 1;
var EDGE_RIGHT = 2;
var EDGE_BOTTOM = 3;
//@ chunk-bzr73sfg.js:146668-146773 callgraph-witnessed = resolveEdge (0.186)
/**
 * 解析某个物理边的值（经 Start/End、Horizontal/Vertical、All 回退）；auto 在 allowAuto 时返回 NaN，否则 0。
 */
function resolveEdge(edges, physicalEdge, ownerSize, allowAuto = false) {
  let edgeRaw = resolveEdgeRaw(edges, physicalEdge);
  if (edgeRaw.unit === 0) return 0;
  if (edgeRaw.unit === 3) return allowAuto ? NaN : 0;
  return resolveValue(edgeRaw, ownerSize);
}
//@ chunk-bzr73sfg.js:146773-146925 callgraph-witnessed = resolveEdgeRaw (0.186)
/**
 * 取物理边的原始 Value：左/右先看 Start/End，再看本边、Horizontal/Vertical、All。
 */
function resolveEdgeRaw(edges, physicalEdge) {
  let edge = physicalEdge === EDGE_LEFT ? edges[4] : physicalEdge === EDGE_RIGHT ? edges[5] : UNDEFINED_VALUE;
  if (edge.unit === 0) edge = edges[physicalEdge];
  if (edge.unit === 0)
    if (physicalEdge === EDGE_LEFT || physicalEdge === EDGE_RIGHT) edge = edges[6];
    else edge = edges[7];
  if (edge.unit === 0) edge = edges[8];
  return edge;
}
//@ chunk-bzr73sfg.js:146925-146966 callgraph-fingerprint = isMarginAuto (1)
function isMarginAuto(edges, physicalEdge) {
  return resolveEdgeRaw(edges, physicalEdge).unit === 3;
}
//@ chunk-bzr73sfg.js:146966-147038 callgraph-fingerprint = hasAnyAutoEdge (1)
function hasAnyEdgeWithUnit(edges, unit) {
  for (let i = 0; i < 9; i++) if (edges[i].unit === unit) return true;
  return false;
}
//@ chunk-bzr73sfg.js:147038-147108 callgraph-fingerprint = hasAnyDefinedEdge (1)
function hasAnyDefinedEdge(edges) {
  for (let i = 0; i < 9; i++) if (edges[i].unit !== 0) return true;
  return false;
}
//@ chunk-bzr73sfg.js:147108-147222 layout
/**
 * 样式是否依赖父宽度（宽/最小/最大宽或边距、内边距用了百分比）：是则父宽变化时要重新布局。
 */
function readsOwnerWidth(style) {
  return (
    style.width.unit === 2 ||
    style.minWidth.unit === 2 ||
    style.maxWidth.unit === 2 ||
    hasAnyEdgeWithUnit(style.margin, 2) ||
    hasAnyEdgeWithUnit(style.padding, 2)
  );
}
//@ chunk-bzr73sfg.js:147222-147306 layout
function readsOwnerHeight(style) {
  return style.height.unit === 2 || style.minHeight.unit === 2 || style.maxHeight.unit === 2;
}
//@ chunk-bzr73sfg.js:147306-147624 layout
/**
 * 一次解析四个物理边（左右顶底，含 Start/End、Horizontal/Vertical、All 回退）写进 out（Int32Array），百分比按父宽算并取整。
 */
function resolveEdges4Into(edges, ownerWidth, out) {
  let edgeStart = edges[6];
  let edgeEnd = edges[7];
  let edgeAll = edges[8];
  let edgeLeft = edges[4];
  let edgeRight = edges[5];
  let value = edgeLeft;
  if (value.unit === 0) value = edges[0];
  if (value.unit === 0) value = edgeStart;
  if (value.unit === 0) value = edgeAll;
  out[0] = resolveEdgeValueToInt(value, ownerWidth);
  value = edges[1];
  if (value.unit === 0) value = edgeEnd;
  if (value.unit === 0) value = edgeAll;
  out[1] = resolveEdgeValueToInt(value, ownerWidth);
  value = edgeRight;
  if (value.unit === 0) value = edges[2];
  if (value.unit === 0) value = edgeStart;
  if (value.unit === 0) value = edgeAll;
  out[2] = resolveEdgeValueToInt(value, ownerWidth);
  value = edges[3];
  if (value.unit === 0) value = edgeEnd;
  if (value.unit === 0) value = edgeAll;
  out[3] = resolveEdgeValueToInt(value, ownerWidth);
}
//@ chunk-bzr73sfg.js:147624-147738 file-local
function resolveEdgeValueToInt(value, ownerSize) {
  let unit = value.unit;
  if (unit === 1) return value.value;
  if (unit === 2) {
    let percentValue = (value.value * ownerSize) / 100;
    return isInt32Finite(percentValue) ? roundToInt(percentValue) : 0;
  }
  return 0;
}
//@ chunk-bzr73sfg.js:147738-147773 layout
function isRow(flexDirection) {
  return flexDirection === 2 || flexDirection === 3;
}
//@ chunk-bzr73sfg.js:147773-147808 layout
function isReverse(flexDirection) {
  return flexDirection === 3 || flexDirection === 1;
}
//@ chunk-bzr73sfg.js:147808-147840 layout
function crossAxis(flexDirection) {
  return isRow(flexDirection) ? 0 : 2;
}
//@ chunk-bzr73sfg.js:147840-147934 layout
function leadingEdge(flexDirection) {
  switch (flexDirection) {
    case 2:
      return EDGE_LEFT;
    case 3:
      return EDGE_RIGHT;
    case 0:
      return EDGE_TOP;
    case 1:
      return EDGE_BOTTOM;
  }
}
//@ chunk-bzr73sfg.js:147934-148028 layout
function trailingEdge(flexDirection) {
  switch (flexDirection) {
    case 2:
      return EDGE_RIGHT;
    case 3:
      return EDGE_LEFT;
    case 0:
      return EDGE_BOTTOM;
    case 1:
      return EDGE_TOP;
  }
}
//@ chunk-bzr73sfg.js:148028-148508 fingerprint = createConfig (0.721)
/**
 * 创建布局配置：pointScaleFactor 只能 0 或 1（Int32 存储，1 时布局结果取整）、errata、useWebDefaults；另含每次 calculateLayout 的统计计数（访问节点数、测量调用、缓存命中、存活节点数）与代数 generation。
 */
function createConfig() {
  let config = {
    pointScaleFactor: 1,
    errata: 0,
    useWebDefaults: false,
    generation: 0,
    nodesVisited: 0,
    measureCalls: 0,
    measureCacheHits: 0,
    cacheHits: 0,
    liveNodes: 0,
    free() {},
    isExperimentalFeatureEnabled() {
      return false;
    },
    setExperimentalFeatureEnabled() {},
    setPointScaleFactor(scaleFactor) {
      if (scaleFactor !== 0 && scaleFactor !== 1)
        throw Error("setPointScaleFactor: Int32 storage supports scale 0 or 1 only");
      config.pointScaleFactor = scaleFactor;
    },
    getErrata() {
      return config.errata;
    },
    setErrata(e) {
      config.errata = e;
    },
    setUseWebDefaults(v) {
      config.useWebDefaults = v;
    },
  };
  return config;
}
//@ chunk-bzr73sfg.js:148508-157070 fingerprint = Node (0.93)
/**
 * yoga 节点（纯 TS 移植，接口兼容 yoga-layout 的 Node）：style、layout（left/top/width/height 与 Int32Array 的 border/padding/margin）、父子关系、measureFunc、脏标记。多组 Int32 缓存：_lc/_mc 单槽布局/测量结果缓存（输入键 + 宽高）、_cIn/_cOut 8 槽多结果缓存、_mfC 4 槽测量函数缓存、_fb flex basis 缓存、_sz 本次的 basis/主轴/交叉轴尺寸。setter 改样式即 markDirty 并预算 _readsOwnerWidth/Height、_has* 标志；calculateLayout 自增 generation、从根 layoutNode，最后在 pointScaleFactor≠0 时取整。aspectRatio、boxSizing、dirtiedFunc 等为空实现。
 */
class Node {
  style;
  layout;
  parent;
  children;
  measureFunc;
  config;
  isDirty_;
  isReferenceBaseline_;
  _sz = new Int32Array(3);
  _lineIndex = 0;
  _hasAutoMargin = false;
  _hasPosition = false;
  _hasPadding = false;
  _hasBorder = false;
  _hasMargin = false;
  _readsOwnerWidth = false;
  _readsOwnerHeight = false;
  _lc = createInt32Cache(6);
  _lWM = 0;
  _lHM = 0;
  _lFW = false;
  _lFH = false;
  _hasL = false;
  _mc = createInt32Cache(6);
  _mWM = 0;
  _mHM = 0;
  _hasM = false;
  _fb = createInt32Cache(5);
  _fbCrossMode = -1;
  _fbIsRow = false;
  _fbGen = -1;
  _cIn = null;
  _cOut = null;
  _cGen = -1;
  _cN = 0;
  _cWr = 0;
  _mfC = null;
  _mfN = 0;
  _mfWr = 0;
  _mGen = -1;
  constructor(config) {
    this.style = defaultStyle();
    this.layout = {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      border: new Int32Array(4),
      padding: new Int32Array(4),
      margin: new Int32Array(4),
    };
    this.parent = null;
    this.children = [];
    this.measureFunc = null;
    this.config = config ?? DEFAULT_CONFIG;
    this.isDirty_ = true;
    this.isReferenceBaseline_ = false;
    this.config.liveNodes++;
  }
  insertChild(child, index) {
    if (child.config !== this.config) throw Error("insertChild: child was created with a different Config");
    child.parent = this;
    this.children.splice(index, 0, child);
    this.markDirty();
  }
  removeChild(child) {
    let idx = this.children.indexOf(child);
    if (idx >= 0) {
      this.children.splice(idx, 1);
      child.parent = null;
      this.markDirty();
    }
  }
  getChild(index) {
    return this.children[index];
  }
  getChildCount() {
    return this.children.length;
  }
  getParent() {
    return this.parent;
  }
  free() {
    this.parent = null;
    this.children = [];
    this.measureFunc = null;
    this._cIn = null;
    this._cOut = null;
    this.config.liveNodes--;
  }
  freeRecursive() {
    let children = this.children;
    for (let idx = 0, childCount = children.length; idx < childCount; idx++) children[idx].freeRecursive();
    this.free();
  }
  clearLayoutCacheRecursive() {
    let visited = new Set();
    let stack = [this];
    let budget = (this.config.liveNodes | 0) * 4 + 1024;
    while (stack.length > 0 && --budget >= 0) {
      let node = stack.pop();
      if (!(node instanceof Node) || visited.has(node)) continue;
      visited.add(node);
      node.isDirty_ = true;
      node._hasL = false;
      node._hasM = false;
      node._cN = 0;
      node._cWr = 0;
      node._cGen = -1;
      node._mfN = 0;
      node._mfWr = 0;
      node._fbCrossMode = -1;
      node._fbGen = -1;
      node._mGen = -1;
      let children = node.children;
      if (Array.isArray(children))
        for (let idx = 0, childCount = children.length; idx < childCount && idx < budget; idx++)
          stack.push(children[idx]);
    }
    try {
      this.markDirty();
    } catch {}
  }
  reset() {
    this.style = defaultStyle();
    this.children = [];
    this.parent = null;
    this.measureFunc = null;
    this.isDirty_ = true;
    this._hasAutoMargin = false;
    this._hasPosition = false;
    this._hasPadding = false;
    this._hasBorder = false;
    this._hasMargin = false;
    this._readsOwnerWidth = false;
    this._readsOwnerHeight = false;
    this._hasL = false;
    this._hasM = false;
    this._cN = 0;
    this._cWr = 0;
    this._mfN = 0;
    this._mfWr = 0;
    this._fbCrossMode = -1;
    this._fbGen = -1;
    this._mGen = -1;
  }
  markDirty() {
    this.isDirty_ = true;
    this._mfN = 0;
    this._mfWr = 0;
    let parent = this.parent;
    if (parent && !parent.isDirty_) parent.markDirty();
  }
  isDirty() {
    return this.isDirty_;
  }
  hasNewLayout() {
    return true;
  }
  markLayoutSeen() {}
  setMeasureFunc(fn) {
    this.measureFunc = fn;
    this.markDirty();
  }
  unsetMeasureFunc() {
    this.measureFunc = null;
    this.markDirty();
  }
  getComputedLeft() {
    return this.layout.left;
  }
  getComputedTop() {
    return this.layout.top;
  }
  getComputedWidth() {
    return this.layout.width;
  }
  getComputedHeight() {
    return this.layout.height;
  }
  getComputedRight() {
    let parent = this.parent;
    if (!parent) return 0;
    let layout = this.layout;
    return parent.layout.width - layout.left - layout.width;
  }
  getComputedBottom() {
    let parent = this.parent;
    if (!parent) return 0;
    let layout = this.layout;
    return parent.layout.height - layout.top - layout.height;
  }
  getComputedLayout() {
    return {
      left: this.layout.left,
      top: this.layout.top,
      right: this.getComputedRight(),
      bottom: this.getComputedBottom(),
      width: this.layout.width,
      height: this.layout.height,
    };
  }
  getComputedBorder(edge) {
    return this.layout.border[physicalEdge(edge)];
  }
  getComputedPadding(edge) {
    return this.layout.padding[physicalEdge(edge)];
  }
  getComputedMargin(edge) {
    return this.layout.margin[physicalEdge(edge)];
  }
  getOfferedWidth(ownerWidth, heightMode) {
    let _mfC = this._mfC;
    let offeredWidth = ownerWidth;
    for (let cacheOffset = this._mfN * 6 - 6; cacheOffset >= 0; cacheOffset -= 6) {
      if (
        !canUseCachedMeasurement(
          1,
          ownerWidth,
          _mfC[cacheOffset + 1],
          _mfC[cacheOffset],
          _mfC[cacheOffset + 4],
        )
      )
        continue;
      if (_mfC[cacheOffset + 5] !== heightMode) return ownerWidth;
      offeredWidth = _mfC[cacheOffset + 1] === 2 ? _mfC[cacheOffset] : ownerWidth;
    }
    return offeredWidth;
  }
  setWidth(v) {
    this.style.width = parseDimension(v);
    this._readsOwnerWidth = readsOwnerWidth(this.style);
    this.markDirty();
  }
  setWidthPercent(v) {
    this.style.width = percentValue(v);
    this._readsOwnerWidth = readsOwnerWidth(this.style);
    this.markDirty();
  }
  setWidthAuto() {
    this.style.width = AUTO_VALUE;
    this._readsOwnerWidth = readsOwnerWidth(this.style);
    this.markDirty();
  }
  setHeight(v) {
    this.style.height = parseDimension(v);
    this._readsOwnerHeight = readsOwnerHeight(this.style);
    this.markDirty();
  }
  setHeightPercent(v) {
    this.style.height = percentValue(v);
    this._readsOwnerHeight = readsOwnerHeight(this.style);
    this.markDirty();
  }
  setHeightAuto() {
    this.style.height = AUTO_VALUE;
    this._readsOwnerHeight = readsOwnerHeight(this.style);
    this.markDirty();
  }
  setMinWidth(v) {
    this.style.minWidth = parseDimension(v);
    this._readsOwnerWidth = readsOwnerWidth(this.style);
    this.markDirty();
  }
  setMinWidthPercent(v) {
    this.style.minWidth = percentValue(v);
    this._readsOwnerWidth = readsOwnerWidth(this.style);
    this.markDirty();
  }
  setMinHeight(v) {
    this.style.minHeight = parseDimension(v);
    this._readsOwnerHeight = readsOwnerHeight(this.style);
    this.markDirty();
  }
  setMinHeightPercent(v) {
    this.style.minHeight = percentValue(v);
    this._readsOwnerHeight = readsOwnerHeight(this.style);
    this.markDirty();
  }
  setMaxWidth(v) {
    this.style.maxWidth = parseDimension(v);
    this._readsOwnerWidth = readsOwnerWidth(this.style);
    this.markDirty();
  }
  setMaxWidthPercent(v) {
    this.style.maxWidth = percentValue(v);
    this._readsOwnerWidth = readsOwnerWidth(this.style);
    this.markDirty();
  }
  setMaxHeight(v) {
    this.style.maxHeight = parseDimension(v);
    this._readsOwnerHeight = readsOwnerHeight(this.style);
    this.markDirty();
  }
  setMaxHeightPercent(v) {
    this.style.maxHeight = percentValue(v);
    this._readsOwnerHeight = readsOwnerHeight(this.style);
    this.markDirty();
  }
  setFlexDirection(dir) {
    this.style.flexDirection = dir;
    this.markDirty();
  }
  setFlexGrow(v) {
    this.style.flexGrow = v ?? 0;
    this.markDirty();
  }
  setFlexShrink(v) {
    this.style.flexShrink = v ?? 0;
    this.markDirty();
  }
  setFlex(v) {
    if (v === undefined || isNaN(v)) {
      this.style.flexGrow = 0;
      this.style.flexShrink = 0;
    } else if (v > 0) {
      this.style.flexGrow = v;
      this.style.flexShrink = 1;
      this.style.flexBasis = pointValue(0);
    } else if (v < 0) {
      this.style.flexGrow = 0;
      this.style.flexShrink = -v;
    } else {
      this.style.flexGrow = 0;
      this.style.flexShrink = 0;
    }
    this.markDirty();
  }
  setFlexBasis(v) {
    this.style.flexBasis = parseDimension(v);
    this.markDirty();
  }
  setFlexBasisPercent(v) {
    this.style.flexBasis = percentValue(v);
    this.markDirty();
  }
  setFlexBasisAuto() {
    this.style.flexBasis = AUTO_VALUE;
    this.markDirty();
  }
  setFlexWrap(wrap) {
    this.style.flexWrap = wrap;
    this.markDirty();
  }
  setAlignItems(alignItems) {
    this.style.alignItems = alignItems;
    this.markDirty();
  }
  setAlignSelf(alignSelf) {
    this.style.alignSelf = alignSelf;
    this.markDirty();
  }
  setAlignContent(alignContent) {
    this.style.alignContent = alignContent;
    this.markDirty();
  }
  setJustifyContent(j) {
    this.style.justifyContent = j;
    this.markDirty();
  }
  setDisplay(display) {
    this.style.display = display;
    this.markDirty();
  }
  getDisplay() {
    return this.style.display;
  }
  setPositionType(t) {
    this.style.positionType = t;
    this.markDirty();
  }
  setPosition(edge, v) {
    this.style.position[edge] = parseDimension(v);
    this._hasPosition = hasAnyDefinedEdge(this.style.position);
    this.markDirty();
  }
  setPositionPercent(edge, v) {
    this.style.position[edge] = percentValue(v);
    this._hasPosition = true;
    this.markDirty();
  }
  setPositionAuto(edge) {
    this.style.position[edge] = AUTO_VALUE;
    this._hasPosition = true;
    this.markDirty();
  }
  setOverflow(overflow) {
    this.style.overflow = overflow;
    this.markDirty();
  }
  setDirection(direction) {
    this.style.direction = direction;
    this.markDirty();
  }
  setBoxSizing(boxSizing) {}
  setMargin(edge, v) {
    let val = parseDimension(v);
    this.style.margin[edge] = val;
    if (val.unit === 3) this._hasAutoMargin = true;
    else this._hasAutoMargin = hasAnyEdgeWithUnit(this.style.margin, 3);
    this._hasMargin = this._hasAutoMargin || hasAnyDefinedEdge(this.style.margin);
    this._readsOwnerWidth = readsOwnerWidth(this.style);
    this.markDirty();
  }
  setMarginPercent(edge, v) {
    this.style.margin[edge] = percentValue(v);
    this._hasAutoMargin = hasAnyEdgeWithUnit(this.style.margin, 3);
    this._hasMargin = true;
    this._readsOwnerWidth = readsOwnerWidth(this.style);
    this.markDirty();
  }
  setMarginAuto(edge) {
    this.style.margin[edge] = AUTO_VALUE;
    this._hasAutoMargin = true;
    this._hasMargin = true;
    this._readsOwnerWidth = readsOwnerWidth(this.style);
    this.markDirty();
  }
  setPadding(edge, v) {
    this.style.padding[edge] = parseDimension(v);
    this._hasPadding = hasAnyDefinedEdge(this.style.padding);
    this._readsOwnerWidth = readsOwnerWidth(this.style);
    this.markDirty();
  }
  setPaddingPercent(edge, v) {
    this.style.padding[edge] = percentValue(v);
    this._hasPadding = true;
    this._readsOwnerWidth = readsOwnerWidth(this.style);
    this.markDirty();
  }
  setBorder(edge, v) {
    this.style.border[edge] = v === undefined ? UNDEFINED_VALUE : pointValue(v);
    this._hasBorder = hasAnyDefinedEdge(this.style.border);
    this.markDirty();
  }
  setGap(gutter, v) {
    this.style.gap[gutter] = parseDimension(v);
    this.markDirty();
  }
  setGapPercent(gutter, v) {
    this.style.gap[gutter] = percentValue(v);
    this.markDirty();
  }
  getFlexDirection() {
    return this.style.flexDirection;
  }
  getJustifyContent() {
    return this.style.justifyContent;
  }
  getAlignItems() {
    return this.style.alignItems;
  }
  getAlignSelf() {
    return this.style.alignSelf;
  }
  getAlignContent() {
    return this.style.alignContent;
  }
  getFlexGrow() {
    return this.style.flexGrow;
  }
  getFlexShrink() {
    return this.style.flexShrink;
  }
  getFlexBasis() {
    return this.style.flexBasis;
  }
  getFlexWrap() {
    return this.style.flexWrap;
  }
  getWidth() {
    return this.style.width;
  }
  getHeight() {
    return this.style.height;
  }
  getOverflow() {
    return this.style.overflow;
  }
  getPositionType() {
    return this.style.positionType;
  }
  getDirection() {
    return this.style.direction;
  }
  copyStyle(other) {}
  setDirtiedFunc(fn) {}
  unsetDirtiedFunc() {}
  setIsReferenceBaseline(v) {
    this.isReferenceBaseline_ = v;
    this.markDirty();
  }
  isReferenceBaseline() {
    return this.isReferenceBaseline_;
  }
  setAspectRatio(ratio) {}
  getAspectRatio() {
    return NaN;
  }
  setAlwaysFormsContainingBlock(value) {}
  calculateLayout(ownerWidth, ownerHeight, _direction) {
    let config = this.config;
    config.nodesVisited = 0;
    config.measureCalls = 0;
    config.measureCacheHits = 0;
    config.cacheHits = 0;
    config.generation++;
    let roundedWidth = isInt32Finite(ownerWidth) ? roundToInt(ownerWidth) : NaN;
    let roundedHeight = isInt32Finite(ownerHeight) ? roundToInt(ownerHeight) : NaN;
    layoutNode(
      this,
      roundedWidth,
      roundedHeight,
      isDefined(roundedWidth) ? 1 : 0,
      isDefined(roundedHeight) ? 1 : 0,
      roundedWidth,
      roundedHeight,
      true,
      false,
      false,
    );
    let mar = this.layout.margin;
    let posL = resolveValue(
      resolveEdgeRaw(this.style.position, EDGE_LEFT),
      isDefined(roundedWidth) ? roundedWidth : 0,
    );
    let posT = resolveValue(
      resolveEdgeRaw(this.style.position, EDGE_TOP),
      isDefined(roundedHeight) ? roundedHeight : 0,
    );
    this.layout.left = mar[EDGE_LEFT] + (isDefined(posL) ? posL : 0);
    this.layout.top = mar[EDGE_TOP] + (isDefined(posT) ? posT : 0);
    if (this.config.pointScaleFactor !== 0) roundLayout(this);
  }
}
//@ chunk-bzr73sfg.js:157070-157092 layout
var DEFAULT_CONFIG = createConfig();
var LAYOUT_CACHE_SLOTS = 8;
var MEASURE_CACHE_SLOTS = 4;
//@ chunk-bzr73sfg.js:157092-157491 fingerprint = cacheWrite (0.953)
/**
 * 把本次布局的输入键与结果宽高写进节点的 8 槽环形缓存（同一 generation 内复用；performLayout 时换代先清空）。
 */
function cacheWrite(
  node,
  availW,
  availH,
  widthMode,
  heightMode,
  ownerW,
  ownerH,
  forceWidth,
  forceHeight,
  isMeasureOnly,
  performLayout,
) {
  let generation = node.config.generation;
  if (performLayout && node._cGen !== generation) {
    node._cN = 0;
    node._cWr = 0;
  }
  if (isMeasureOnly) return;
  if (!node._cIn) {
    node._cIn = new Int32Array(LAYOUT_CACHE_SLOTS * 8);
    node._cOut = new Int32Array(LAYOUT_CACHE_SLOTS * 2);
  }
  let slot = node._cWr++ % LAYOUT_CACHE_SLOTS;
  if (node._cN < LAYOUT_CACHE_SLOTS) node._cN = node._cWr;
  let base = slot * 8;
  let cIn = node._cIn;
  cIn[base] = toInt32Key(availW);
  cIn[base + 1] = toInt32Key(availH);
  cIn[base + 2] = widthMode;
  cIn[base + 3] = heightMode;
  cIn[base + 4] = toInt32Key(ownerW);
  cIn[base + 5] = toInt32Key(ownerH);
  cIn[base + 6] = forceWidth ? 1 : 0;
  cIn[base + 7] = forceHeight ? 1 : 0;
  let { _cOut, layout } = node;
  _cOut[slot * 2] = layout.width;
  _cOut[slot * 2 + 1] = layout.height;
  node._cGen = generation;
}
//@ chunk-bzr73sfg.js:157491-157598 layout
function commitSingleCacheResult(node, performLayout) {
  let layout = node.layout;
  let { width, height } = layout;
  if (performLayout) {
    node._lc[4] = width;
    node._lc[5] = height;
  } else {
    node._mc[4] = width;
    node._mc[5] = height;
  }
}
//@ chunk-bzr73sfg.js:157598-157758 fingerprint = getYogaCounters (0.632)
/**
 * 读最近一次 calculateLayout 的统计：访问节点数、测量调用、测量缓存命中、布局缓存命中、存活节点数。
 */
function getYogaCounters(node) {
  let config = node.config;
  return {
    visited: config.nodesVisited,
    measured: config.measureCalls,
    measureCacheHits: config.measureCacheHits,
    cacheHits: config.cacheHits,
    live: config.liveNodes,
  };
}
//@ chunk-bzr73sfg.js:157758-158548 fingerprint = layoutNode (0.491)
/**
 * 布局缓存查找：未脏时依次查单槽布局缓存 _lc、8 槽缓存 _cIn/_cOut、单槽测量缓存 _mc，键为（可用宽高、宽高模式、依赖时的父宽高、强制宽高标志），命中则把宽高写进 out 并返回真。
 */
function lookupLayoutCache(
  node,
  out,
  availW,
  availH,
  widthMode,
  heightMode,
  ownerW,
  ownerH,
  isMeasureOnly,
  forceWidth,
  forceHeight,
) {
  let config = node.config;
  let generation = config.generation;
  let sameGenCached = node._cGen === generation && !isMeasureOnly;
  let measuredThisGen = isMeasureOnly && node._mGen === generation;
  let wasDirty = node.isDirty_;
  if ((wasDirty && !sameGenCached) || measuredThisGen) return false;
  let crossAx = toInt32Key(availW);
  let isMainRow = toInt32Key(availH);
  let mainLead = toInt32Key(ownerW);
  let mainTrail = toInt32Key(ownerH);
  if (
    !wasDirty &&
    node._hasL &&
    node._lWM === widthMode &&
    node._lHM === heightMode &&
    node._lFW === forceWidth &&
    node._lFH === forceHeight &&
    node._lc[0] === crossAx &&
    node._lc[1] === isMainRow &&
    node._lc[2] === mainLead &&
    node._lc[3] === mainTrail
  ) {
    config.cacheHits++;
    out.width = node._lc[4];
    out.height = node._lc[5];
    return true;
  }
  let cachedMeasureCount = node._cN;
  if (cachedMeasureCount > 0 && !isMeasureOnly && (sameGenCached || !wasDirty)) {
    let { _cIn, _cOut } = node;
    let forceWidthFlag = forceWidth ? 1 : 0;
    let forceHeightFlag = forceHeight ? 1 : 0;
    for (let idx = 0; idx < cachedMeasureCount; idx++) {
      let entryBase = idx * 8;
      if (
        _cIn[entryBase + 2] === widthMode &&
        _cIn[entryBase + 3] === heightMode &&
        _cIn[entryBase + 6] === forceWidthFlag &&
        _cIn[entryBase + 7] === forceHeightFlag &&
        _cIn[entryBase] === crossAx &&
        _cIn[entryBase + 1] === isMainRow &&
        _cIn[entryBase + 4] === mainLead &&
        _cIn[entryBase + 5] === mainTrail
      ) {
        out.width = _cOut[idx * 2];
        out.height = _cOut[idx * 2 + 1];
        config.cacheHits++;
        return true;
      }
    }
  }
  if (
    !wasDirty &&
    !isMeasureOnly &&
    node._hasM &&
    node._mWM === widthMode &&
    node._mHM === heightMode &&
    node._mc[0] === crossAx &&
    node._mc[1] === isMainRow &&
    node._mc[2] === mainLead &&
    node._mc[3] === mainTrail
  ) {
    out.width = node._mc[4];
    out.height = node._mc[5];
    config.cacheHits++;
    return true;
  }
  return false;
}
//@ chunk-bzr73sfg.js:158548-158888 layout
/**
 * 记下本次布局/测量的缓存键（performLayout 写 _lc 并清脏，否则写 _mc），返回调用前是否为脏。
 */
function storeCacheInputs(
  node,
  availW,
  availH,
  widthMode,
  heightMode,
  ownerW,
  ownerH,
  performLayout,
  forceWidth,
  forceHeight,
) {
  let isDirty_ = node.isDirty_;
  if (performLayout) {
    node._lc[0] = toInt32Key(availW);
    node._lc[1] = toInt32Key(availH);
    node._lWM = widthMode;
    node._lHM = heightMode;
    node._lc[2] = toInt32Key(ownerW);
    node._lc[3] = toInt32Key(ownerH);
    node._lFW = forceWidth;
    node._lFH = forceHeight;
    node._hasL = true;
    node.isDirty_ = false;
    if (isDirty_) node._hasM = false;
  } else {
    node._mc[0] = toInt32Key(availW);
    node._mc[1] = toInt32Key(availH);
    node._mWM = widthMode;
    node._mHM = heightMode;
    node._mc[2] = toInt32Key(ownerW);
    node._mc[3] = toInt32Key(ownerH);
    node._hasM = true;
    node._mGen = node.config.generation;
    if (isDirty_) node._hasL = false;
  }
  return isDirty_;
}
//@ chunk-bzr73sfg.js:158888-159701 layout
/**
 * 节点布局入口（递归）：先查缓存；解析内边距、边框、外边距到 layout；样式宽高确定时改为 EXACTLY 模式；按 min/max 约束；无子节点时调用测量函数（measureLeaf）或用内边距+边框；有子节点时 layoutFlexContainer；最后写缓存。
 */
function layoutNode(
  node,
  availW,
  availH,
  widthMode,
  heightMode,
  ownerW,
  ownerH,
  performLayout,
  forceWidth,
  forceHeight,
) {
  node.config.nodesVisited++;
  let { style, layout } = node;
  let keyOwnerW = node._readsOwnerWidth ? ownerW : NaN;
  let keyOwnerH = node._readsOwnerHeight ? ownerH : NaN;
  if (
    lookupLayoutCache(
      node,
      layout,
      availW,
      availH,
      widthMode,
      heightMode,
      keyOwnerW,
      keyOwnerH,
      performLayout,
      forceWidth,
      forceHeight,
    )
  )
    return;
  let wasDirty = storeCacheInputs(
    node,
    availW,
    availH,
    widthMode,
    heightMode,
    keyOwnerW,
    keyOwnerH,
    performLayout,
    forceWidth,
    forceHeight,
  );
  let { padding, border, margin } = layout;
  if (node._hasPadding) resolveEdges4Into(style.padding, ownerW, padding);
  else padding[0] = padding[1] = padding[2] = padding[3] = 0;
  if (node._hasBorder) resolveEdges4Into(style.border, ownerW, border);
  else border[0] = border[1] = border[2] = border[3] = 0;
  if (node._hasMargin) resolveEdges4Into(style.margin, ownerW, margin);
  else margin[0] = margin[1] = margin[2] = margin[3] = 0;
  let paddingBorderX = padding[0] + padding[2] + border[0] + border[2];
  let paddingBorderY = padding[1] + padding[3] + border[1] + border[3];
  let styleWidth = forceWidth ? NaN : resolveValue(style.width, ownerW);
  let styleHeight = forceHeight ? NaN : resolveValue(style.height, ownerH);
  let width = availW;
  let height = availH;
  let wMode = widthMode;
  let hMode = heightMode;
  if (isDefined(styleWidth)) {
    width = styleWidth;
    wMode = 1;
  }
  if (isDefined(styleHeight)) {
    height = styleHeight;
    hMode = 1;
  }
  width = boundAxis(style, true, width, ownerW, ownerH);
  height = boundAxis(style, false, height, ownerW, ownerH);
  if (node.children.length === 0) {
    if (node.measureFunc)
      measureLeaf(
        node,
        style,
        layout,
        width,
        height,
        wMode,
        hMode,
        paddingBorderX,
        paddingBorderY,
        ownerW,
        ownerH,
      );
    else {
      layout.width = wMode === 1 ? width : boundAxis(style, true, paddingBorderX, ownerW, ownerH);
      layout.height = hMode === 1 ? height : boundAxis(style, false, paddingBorderY, ownerW, ownerH);
    }
  } else
    layoutFlexContainer(
      node,
      style,
      layout,
      width,
      height,
      wMode,
      hMode,
      paddingBorderX,
      paddingBorderY,
      ownerW,
      ownerH,
      performLayout,
    );
  commitSingleCacheResult(node, performLayout);
  cacheWrite(
    node,
    availW,
    availH,
    widthMode,
    heightMode,
    keyOwnerW,
    keyOwnerH,
    forceWidth,
    forceHeight,
    performLayout,
    wasDirty,
  );
}
//@ chunk-bzr73sfg.js:159701-160456 file-local
/**
 * 叶子节点测量：两轴都 EXACTLY 直接用；否则以内容区宽高与模式调用 measureFunc（4 槽缓存，按 yoga 的 canUseCachedMeasurement 规则复用），结果向上取整加回内边距边框并按 min/max 约束。
 */
function measureLeaf(
  node,
  style,
  layout,
  width,
  height,
  widthMode,
  heightMode,
  paddingBorderX,
  paddingBorderY,
  ownerW,
  ownerH,
) {
  if (widthMode === 1 && heightMode === 1) {
    layout.width = width;
    layout.height = height;
    return;
  }
  let innerW = widthMode === 0 ? NaN : Math.max(0, width - paddingBorderX);
  let innerWidth = innerW >= 1 ? innerW | 0 : innerW;
  let innerHeightRaw = heightMode === 0 ? NaN : Math.max(0, height - paddingBorderY);
  let innerH = innerHeightRaw >= 1 ? innerHeightRaw | 0 : innerHeightRaw;
  let config = node.config;
  config.measureCalls++;
  let widthKey = toInt32Key(innerWidth);
  let heightKey = toInt32Key(innerH);
  let _mfC = node._mfC;
  for (let idx = 0; idx < node._mfN; idx++) {
    let slotBase = idx * 6;
    let cachedResult = _mfC[slotBase + 4];
    let cachedResult_2 = _mfC[slotBase + 5];
    if (
      canUseCachedMeasurement(widthMode, widthKey, _mfC[slotBase + 1], _mfC[slotBase], cachedResult) &&
      canUseCachedMeasurement(heightMode, heightKey, _mfC[slotBase + 3], _mfC[slotBase + 2], cachedResult_2)
    ) {
      config.measureCacheHits++;
      layout.width =
        widthMode === 1 ? width : boundAxis(style, true, cachedResult + paddingBorderX, ownerW, ownerH);
      layout.height =
        heightMode === 1 ? height : boundAxis(style, false, cachedResult_2 + paddingBorderY, ownerW, ownerH);
      return;
    }
  }
  let measureResult = node.measureFunc(innerWidth, widthMode, innerH, heightMode);
  if (!_mfC) _mfC = node._mfC = new Int32Array(MEASURE_CACHE_SLOTS * 6);
  let slotIndex = node._mfWr++ % MEASURE_CACHE_SLOTS;
  if (node._mfN < MEASURE_CACHE_SLOTS) node._mfN++;
  let slotOffset = slotIndex * 6;
  _mfC[slotOffset] = widthKey;
  _mfC[slotOffset + 1] = widthMode;
  _mfC[slotOffset + 2] = heightKey;
  _mfC[slotOffset + 3] = heightMode;
  let measuredWidth = isInt32Finite(measureResult.width) ? Math.ceil(measureResult.width) : 0;
  let measuredHeight = isInt32Finite(measureResult.height) ? Math.ceil(measureResult.height) : 0;
  _mfC[slotOffset + 4] = measuredWidth;
  _mfC[slotOffset + 5] = measuredHeight;
  layout.width =
    widthMode === 1 ? width : boundAxis(style, true, measuredWidth + paddingBorderX, ownerW, ownerH);
  layout.height =
    heightMode === 1 ? height : boundAxis(style, false, measuredHeight + paddingBorderY, ownerW, ownerH);
}
//@ chunk-bzr73sfg.js:160456-160592 layout
/**
 * 能否复用缓存的测量结果：模式与尺寸相同；或新为 EXACTLY 且尺寸等于缓存结果；或新为 AT_MOST 且缓存结果不超过新上限。
 */
function canUseCachedMeasurement(mode, size, cachedMode, cachedSize, cachedResult) {
  if (cachedMode === mode && cachedSize === size) return true;
  if (cachedMode === 1) return false;
  if (mode === 1) return size === cachedResult && (cachedMode === 0 || cachedResult <= cachedSize);
  return mode === 2 && cachedResult <= size && (cachedMode === 0 || cachedSize > size);
}
//@ chunk-bzr73sfg.js:160592-162177 layout
/**
 * flex 容器布局：收集流内/绝对定位子节点；算每个子节点的 flex basis（带缓存）；按 flexWrap 断行；逐行解析弹性长度并布局子节点（layoutFlexLine）、算行的主轴/交叉轴尺寸（baseline 对齐另计）；据此确定容器自身尺寸（含 overflow:scroll 时的收缩规则）；performLayout 时再做 alignContent、stretch、justify 与交叉轴对齐定位（positionLineChildren），最后布局绝对定位子节点。
 */
function layoutFlexContainer(
  node,
  style,
  layout,
  width,
  height,
  widthMode,
  heightMode,
  paddingBorderX,
  paddingBorderY,
  ownerW,
  ownerH,
  performLayout,
) {
  let { padding, border } = layout;
  let flexDirection = style.flexDirection;
  let crossDir = crossAxis(flexDirection);
  let isMainRow = isRow(flexDirection);
  let mainSize = isMainRow ? width : height;
  let crossSize = isMainRow ? height : width;
  let mainMode = isMainRow ? widthMode : heightMode;
  let crossMode = isMainRow ? heightMode : widthMode;
  let paddingBorderMain = isMainRow ? paddingBorderX : paddingBorderY;
  let paddingBorderCross = isMainRow ? paddingBorderY : paddingBorderX;
  let availMain = isDefined(mainSize) ? Math.max(0, mainSize - paddingBorderMain) : NaN;
  let availCross = isDefined(crossSize) ? Math.max(0, crossSize - paddingBorderCross) : NaN;
  let mainGap = resolveGap(style, isMainRow ? 0 : 1, availMain);
  let flowChildren = [];
  let absChildren = [];
  collectLayoutChildren(node, flowChildren, absChildren);
  let ownerW_2 = isMainRow ? availMain : availCross;
  let ownerH_2 = isMainRow ? availCross : availMain;
  let isWrap = style.flexWrap !== 0;
  let crossGap = resolveGap(style, isMainRow ? 1 : 0, availCross);
  let childCount = flowChildren.length;
  for (let idx = 0; idx < childCount; idx++) {
    let child = flowChildren[idx];
    child._sz[SZ_FLEX_BASIS] = cachedFlexBasis(
      child,
      flexDirection,
      availMain,
      availCross,
      crossMode,
      ownerW_2,
      ownerH_2,
    );
  }
  let lines;
  if (!isWrap || !isDefined(availMain) || childCount === 0) {
    for (let idx = 0; idx < childCount; idx++) flowChildren[idx]._lineIndex = 0;
    lines = [flowChildren];
  } else
    lines = breakIntoLines(flowChildren, availMain, isMainRow, flexDirection, ownerW_2, ownerH_2, mainGap);
  let lineCount = lines.length;
  let isBaseline = isBaselineLayout(node, flowChildren);
  let int32Array = new Int32Array(lineCount);
  let int32Array_2 = new Int32Array(lineCount);
  let baselines = isBaseline ? new Int32Array(lineCount) : EMPTY_INT32;
  let ownerMain = isMainRow ? ownerW : ownerH;
  let lineMainSizes = 0;
  let lineCrossSizes = 0;
  for (let idx = 0; idx < lineCount; idx++) {
    let line = lines[idx];
    layoutFlexLine(
      line,
      style,
      flexDirection,
      crossDir,
      isMainRow,
      availMain,
      availCross,
      crossMode,
      mainGap,
      ownerW_2,
      ownerH_2,
      ownerMain,
      paddingBorderMain,
      isWrap,
      performLayout,
    );
    let lineCross = lineCrossSizeOut;
    if (isBaseline) lineCross = computeLineBaseline(node, line, ownerW_2, baselines, idx, lineCross);
    let lineMainSize = lineMainSizeOut;
    int32Array[idx] = lineMainSize;
    int32Array_2[idx] = lineCross;
    lineMainSizes = Math.max(lineMainSizes, lineMainSize);
    lineCrossSizes += lineCross;
  }
  let totalCrossGap = lineCount > 1 ? crossGap * (lineCount - 1) : 0;
  lineCrossSizes += totalCrossGap;
  let isScrollOverflow = style.overflow === 2;
  let mainContentSize = lineMainSizes + paddingBorderMain;
  let containerMainSize =
    mainMode === 1
      ? mainSize
      : mainMode === 2 && isScrollOverflow
        ? Math.max(Math.min(mainSize, mainContentSize), paddingBorderMain)
        : isWrap && lineCount > 1 && mainMode === 2
          ? mainSize
          : mainContentSize;
  let crossContentSize = lineCrossSizes + paddingBorderCross;
  let containerCrossSize =
    crossMode === 1
      ? crossSize
      : crossMode === 2 && isScrollOverflow
        ? Math.max(Math.min(crossSize, crossContentSize), paddingBorderCross)
        : crossContentSize;
  let parentWidth = boundAxis(
    style,
    true,
    isMainRow ? containerMainSize : containerCrossSize,
    ownerW,
    ownerH,
  );
  let parentHeight = boundAxis(
    style,
    false,
    isMainRow ? containerCrossSize : containerMainSize,
    ownerW,
    ownerH,
  );
  layout.width = parentWidth;
  layout.height = parentHeight;
  if (!performLayout) return;
  let availMain_2 = (isMainRow ? parentWidth : parentHeight) - paddingBorderMain;
  let availCrossInner = (isMainRow ? parentHeight : parentWidth) - paddingBorderCross;
  let leadingMainEdge = leadingEdge(flexDirection);
  let crossLeadEdge = isMainRow ? EDGE_TOP : EDGE_LEFT;
  let crossTrailEdge = isMainRow ? EDGE_BOTTOM : EDGE_RIGHT;
  let isReverse_2 = isReverse(flexDirection);
  let containerMain = isMainRow ? parentWidth : parentHeight;
  let crossLeadOffset = padding[crossLeadEdge] + border[crossLeadEdge];
  let effectiveCrossGap = crossGap;
  let remaining = availCrossInner - lineCrossSizes;
  if (lineCount === 1 && !isWrap && !isBaseline) int32Array_2[0] = availCrossInner;
  else {
    resolveAlignContent(style.alignContent, remaining, lineCount, int32Array_2);
    crossLeadOffset += alignContentLeadOffset;
    effectiveCrossGap += alignContentBetween;
  }
  let isWrapReverse = style.flexWrap === 2;
  let wrapsCrossSize = isMainRow ? parentHeight : parentWidth;
  let needsCrossStretch = isWrap || crossMode !== 1;
  let leadingMain = padding[leadingMainEdge] + border[leadingMainEdge];
  let alignItems = style.alignItems;
  let lineCrossOffset = crossLeadOffset;
  for (let idx = 0; idx < lineCount; idx++) {
    let line = lines[idx];
    let lineCrossSize = int32Array_2[idx];
    if (needsCrossStretch)
      stretchLineChildren(
        line,
        alignItems,
        isMainRow,
        crossDir,
        crossLeadEdge,
        crossTrailEdge,
        lineCrossSize,
        ownerW_2,
        ownerH_2,
        performLayout,
      );
    positionLineChildren(
      line,
      style,
      flexDirection,
      isMainRow,
      lineCrossSize,
      isWrapReverse ? wrapsCrossSize - lineCrossOffset - lineCrossSize : lineCrossOffset,
      int32Array[idx],
      availMain_2,
      leadingMain,
      containerMain,
      mainGap,
      ownerW_2,
      ownerH_2,
      isReverse_2,
      isWrapReverse,
      isBaseline,
      isBaseline ? baselines[idx] : 0,
    );
    lineCrossOffset += lineCrossSize + effectiveCrossGap;
  }
  for (let idx = 0, absCount = absChildren.length; idx < absCount; idx++)
    layoutAbsoluteChild(node, absChildren[idx], parentWidth, parentHeight, padding, border);
}
//@ chunk-bzr73sfg.js:162177-162222 layout
var EMPTY_INT32 = new Int32Array(0);
var alignContentLeadOffset = 0;
var alignContentBetween = 0;
var lineMainSizeOut = 0;
var lineCrossSizeOut = 0;
//@ chunk-bzr73sfg.js:162222-163212 layout
/**
 * 布局一行：可用主轴空间未定时按容器 min/max 推出；resolveFlexibleLengths 分配主轴尺寸；逐个子节点决定交叉轴尺寸（固定、stretch 时撑满、否则 AT_MOST）并 layoutNode；输出本行主轴总长与最大交叉轴尺寸。
 */
function layoutFlexLine(
  line,
  style,
  flexDirection,
  crossDir,
  isMainRow,
  availMain,
  availCross,
  crossMode,
  mainGap,
  ownerW,
  ownerH,
  ownerMain,
  paddingBorderMain,
  isWrap,
  performLayout,
) {
  let lineCount = line.length;
  let alignItems = style.alignItems;
  let totalGap = lineCount > 1 ? mainGap * (lineCount - 1) : 0;
  let totalBasis = totalGap;
  for (let idx = 0; idx < lineCount; idx++) {
    let child = line[idx];
    totalBasis += child._sz[SZ_FLEX_BASIS] + childMarginForAxis(child, flexDirection, ownerW);
  }
  let availForFlex = availMain;
  if (availForFlex !== availForFlex) {
    let value = resolveValue(isMainRow ? style.minWidth : style.minHeight, ownerMain);
    let value_2 = resolveValue(isMainRow ? style.maxWidth : style.maxHeight, ownerMain);
    if (value_2 === value_2 && totalBasis > value_2 - paddingBorderMain)
      availForFlex = Math.max(0, value_2 - paddingBorderMain);
    else if (value === value && totalBasis < value - paddingBorderMain)
      availForFlex = Math.max(0, value - paddingBorderMain);
  }
  resolveFlexibleLengths(line, availForFlex, totalBasis, isMainRow, ownerW, ownerH);
  let crossLeadEdge = isMainRow ? EDGE_TOP : EDGE_LEFT;
  let crossTrailEdge = isMainRow ? EDGE_BOTTOM : EDGE_RIGHT;
  let hasCrossSize = availCross === availCross;
  let maxCrossSize = 0;
  for (let idx = 0; idx < lineCount; idx++) {
    let child = line[idx];
    let style = child.style;
    let alignSelf = style.alignSelf;
    let effectiveAlign = alignSelf === 0 ? alignItems : alignSelf;
    let crossMargin = childMarginForAxis(child, crossDir, ownerW);
    let crossSizeResolved = NaN;
    let crossSizeMode = 0;
    let value = resolveValue(isMainRow ? style.height : style.width, isMainRow ? ownerH : ownerW);
    let hasCrossAutoMargin = false;
    if (child._hasAutoMargin) {
      let margin = style.margin;
      hasCrossAutoMargin = isMarginAuto(margin, crossLeadEdge) || isMarginAuto(margin, crossTrailEdge);
    }
    if (value === value) {
      crossSizeResolved = value;
      crossSizeMode = 1;
    } else if (effectiveAlign === 4 && !hasCrossAutoMargin && !isWrap && hasCrossSize && crossMode === 1) {
      crossSizeResolved = Math.max(0, availCross - crossMargin);
      crossSizeMode = 1;
    } else if (!isWrap && hasCrossSize) {
      crossSizeResolved = Math.max(0, availCross - crossMargin);
      crossSizeMode = 2;
    }
    let mainSizeForLayout = isMainRow ? child._sz[SZ_MAIN] : crossSizeResolved;
    let crossSizeForLayout = isMainRow ? crossSizeResolved : child._sz[SZ_MAIN];
    layoutNode(
      child,
      mainSizeForLayout,
      crossSizeForLayout,
      isMainRow ? 1 : crossSizeMode,
      isMainRow ? crossSizeMode : 1,
      ownerW,
      ownerH,
      performLayout,
      isMainRow,
      !isMainRow,
    );
    let layout = child.layout;
    child._sz[SZ_CROSS] = isMainRow ? layout.height : layout.width;
    maxCrossSize = Math.max(maxCrossSize, child._sz[SZ_CROSS] + crossMargin);
  }
  let leadEdge = leadingEdge(flexDirection);
  let trailEdge = trailingEdge(flexDirection);
  let lineMainSizeTotal = totalGap;
  for (let idx = 0; idx < lineCount; idx++) {
    let child = line[idx];
    let margin = child.layout.margin;
    lineMainSizeTotal += child._sz[SZ_MAIN] + margin[leadEdge] + margin[trailEdge];
  }
  lineMainSizeOut = lineMainSizeTotal;
  lineCrossSizeOut = maxCrossSize;
}
//@ chunk-bzr73sfg.js:163212-164533 layout
/**
 * 定位一行的子节点：主轴按 auto margin 或 justifyContent（center/flex-end/space-between/around/evenly）分配剩余空间；交叉轴按 alignSelf/alignItems（含 auto margin、baseline）；有测量函数的节点向下取整、其余四舍五入；带 position 偏移的相对定位节点加偏移。
 */
function positionLineChildren(
  line,
  style,
  flexDirection,
  isMainRow,
  lineCrossSize,
  crossOffset,
  lineMainSize,
  availMain,
  leadingMain,
  containerMain,
  betweenMain,
  ownerW,
  ownerH,
  isReverse,
  isWrapReverse,
  isBaseline,
  lineBaseline,
) {
  let lineCount = line.length;
  let alignItems = style.alignItems;
  let leadEdge = leadingEdge(flexDirection);
  let trailEdge = trailingEdge(flexDirection);
  let crossLeadEdge = isMainRow ? EDGE_TOP : EDGE_LEFT;
  let crossTrailEdge = isMainRow ? EDGE_BOTTOM : EDGE_RIGHT;
  let mainOffset = leadingMain;
  let betweenMainOffset = betweenMain;
  let autoMarginCount = 0;
  for (let idx = 0; idx < lineCount; idx++) {
    let child = line[idx];
    if (!child._hasAutoMargin) continue;
    let margin = child.style.margin;
    if (isMarginAuto(margin, leadEdge)) autoMarginCount++;
    if (isMarginAuto(margin, trailEdge)) autoMarginCount++;
  }
  let freeSpace = availMain - lineMainSize;
  let max = Math.max(0, freeSpace);
  let autoMarginShare = autoMarginCount > 0 && max > 0 ? max / autoMarginCount : 0;
  if (autoMarginCount === 0)
    switch (style.justifyContent) {
      case 0:
        break;
      case 1:
        mainOffset += freeSpace / 2;
        break;
      case 2:
        mainOffset += freeSpace;
        break;
      case 3:
        if (lineCount > 1) betweenMainOffset += max / (lineCount - 1);
        break;
      case 4:
        if (lineCount > 0) {
          betweenMainOffset += max / lineCount;
          mainOffset += max / lineCount / 2;
        }
        break;
      case 5:
        if (lineCount > 0) {
          betweenMainOffset += max / (lineCount + 1);
          mainOffset += max / (lineCount + 1);
        }
        break;
    }
  let cursor = mainOffset;
  for (let idx = 0; idx < lineCount; idx++) {
    let node = line[idx];
    let { style, layout } = node;
    let mainSize = node._sz[SZ_MAIN];
    let margin = style.margin;
    let margin_2 = layout.margin;
    let isLeadAuto = false;
    let isTrailAuto = false;
    let isCrossLeadAuto = false;
    let isCrossTrailAuto = false;
    let leadMargin;
    let trailMargin;
    let crossLeadMargin;
    let crossTrailMargin;
    if (node._hasAutoMargin) {
      isLeadAuto = isMarginAuto(margin, leadEdge);
      isTrailAuto = isMarginAuto(margin, trailEdge);
      isCrossLeadAuto = isMarginAuto(margin, crossLeadEdge);
      isCrossTrailAuto = isMarginAuto(margin, crossTrailEdge);
      leadMargin = isLeadAuto ? autoMarginShare : margin_2[leadEdge];
      trailMargin = isTrailAuto ? autoMarginShare : margin_2[trailEdge];
      crossLeadMargin = isCrossLeadAuto ? 0 : margin_2[crossLeadEdge];
      crossTrailMargin = isCrossTrailAuto ? 0 : margin_2[crossTrailEdge];
    } else {
      leadMargin = margin_2[leadEdge];
      trailMargin = margin_2[trailEdge];
      crossLeadMargin = margin_2[crossLeadEdge];
      crossTrailMargin = margin_2[crossTrailEdge];
    }
    let mainPos = isReverse ? containerMain - (cursor + leadMargin) - mainSize : cursor + leadMargin;
    let alignSelf = style.alignSelf;
    let align = alignSelf === 0 ? alignItems : alignSelf;
    let crossPos = crossOffset + crossLeadMargin;
    let crossRemaining = lineCrossSize - node._sz[SZ_CROSS] - crossLeadMargin - crossTrailMargin;
    if (isCrossLeadAuto && isCrossTrailAuto) crossPos += Math.max(0, crossRemaining) / 2;
    else if (isCrossLeadAuto) crossPos += Math.max(0, crossRemaining);
    else if (isCrossTrailAuto);
    else
      switch (align) {
        case 1:
        case 4:
          if (isWrapReverse) crossPos += crossRemaining;
          break;
        case 2:
          crossPos += crossRemaining / 2;
          break;
        case 3:
          if (!isWrapReverse) crossPos += crossRemaining;
          break;
        case 5:
          if (isBaseline) crossPos = crossOffset + lineBaseline - calculateBaseline(node);
          break;
        default:
          break;
      }
    let isTextNode = node.measureFunc !== null;
    let mainPosFinal = isMainRow ? mainPos : crossPos;
    let crossPosFinal = isMainRow ? crossPos : mainPos;
    let roundedLeft = isTextNode ? Math.floor(mainPosFinal) : roundToInt(mainPosFinal);
    let top = isTextNode ? Math.floor(crossPosFinal) : roundToInt(crossPosFinal);
    if (node._hasPosition) applyRelativePosition(node, ownerW, ownerH, layout, roundedLeft, top);
    else {
      layout.left = roundedLeft;
      layout.top = top;
    }
    cursor += mainSize + leadMargin + trailMargin + betweenMainOffset;
  }
}
//@ chunk-bzr73sfg.js:164533-164793 layout
/**
 * flex-wrap 断行：按 clamp 后的 basis + 外边距 + gap 累加，超出可用主轴长度就换行；记录每个子节点的 _lineIndex。
 */
function breakIntoLines(children, availMain, isMainRow, flexDirection, ownerW, ownerH, gap) {
  let lines = [];
  let childCount = children.length;
  let lineStart = 0;
  let lineLength = 0;
  for (let idx = 0; idx < childCount; idx++) {
    let child = children[idx];
    let mainSize = boundAxis(child.style, isMainRow, child._sz[SZ_FLEX_BASIS], ownerW, ownerH);
    let mainOuterSize = Math.max(0, mainSize) + childMarginForAxis(child, flexDirection, ownerW);
    let gapSize = idx > lineStart ? gap : 0;
    if (idx > lineStart && lineLength + gapSize + mainOuterSize > availMain) {
      lines.push(children.slice(lineStart, idx));
      lineStart = idx;
      lineLength = mainOuterSize;
    } else lineLength += gapSize + mainOuterSize;
    child._lineIndex = lines.length;
  }
  lines.push(children.slice(lineStart));
  return lines;
}
//@ chunk-bzr73sfg.js:164793-165032 fingerprint = commitCacheOutputs (0.633)
/**
 * baseline 对齐时计算一行的基线（最大上伸，写入 baselines[lineIndex]）与所需行高（上伸+下伸），返回不小于原行高的值。
 */
function computeLineBaseline(node, line, ownerW, baselines, lineIndex, lineCross) {
  let maxAscent = 0;
  let maxDescent = 0;
  for (let idx = 0, childCount = line.length; idx < childCount; idx++) {
    let child = line[idx];
    if (resolveChildAlign(node, child) !== 5) continue;
    let margin = child.style.margin;
    let edge = resolveEdge(margin, EDGE_TOP, ownerW);
    let edge_2 = resolveEdge(margin, EDGE_BOTTOM, ownerW);
    let ascent = calculateBaseline(child) + edge;
    let descent = child.layout.height + edge + edge_2 - ascent;
    if (ascent > maxAscent) maxAscent = ascent;
    if (descent > maxDescent) maxDescent = descent;
  }
  baselines[lineIndex] = maxAscent;
  let lineHeight = maxAscent + maxDescent;
  return lineHeight > lineCross ? lineHeight : lineCross;
}
//@ chunk-bzr73sfg.js:165032-165355 layout
/**
 * alignContent：center/flex-end 设起始偏移，stretch 把剩余空间按整数均分到各行，space-between/around/evenly 设行间距（写入 alignContentLeadOffset/Between）。
 */
function resolveAlignContent(alignContent, remaining, lineCount, lineSizes) {
  let max = Math.max(0, remaining);
  switch (((alignContentLeadOffset = 0), (alignContentBetween = 0), alignContent)) {
    case 1:
      break;
    case 2:
      alignContentLeadOffset = remaining / 2;
      break;
    case 3:
      alignContentLeadOffset = remaining;
      break;
    case 4:
      if (lineCount > 0 && max > 0) {
        let accum = 0;
        let prevRounded = 0;
        for (let idx = 0; idx < lineCount; idx++) {
          accum += max / lineCount;
          let rounded = roundToInt(accum);
          lineSizes[idx] += rounded - prevRounded;
          prevRounded = rounded;
        }
      }
      break;
    case 6:
      if (lineCount > 1) alignContentBetween = max / (lineCount - 1);
      break;
    case 7:
      if (lineCount > 0) {
        alignContentBetween = max / lineCount;
        alignContentLeadOffset = alignContentBetween / 2;
      }
      break;
    case 8:
      if (lineCount > 0) {
        alignContentBetween = max / (lineCount + 1);
        alignContentLeadOffset = alignContentBetween;
      }
      break;
    default:
      break;
  }
}
//@ chunk-bzr73sfg.js:165355-165708 layout
/**
 * stretch 对齐：交叉轴尺寸未定且无 auto margin 的子节点重新以 EXACTLY 布局到行的交叉轴尺寸。
 */
function stretchLineChildren(
  line,
  alignItems,
  isMainRow,
  crossDir,
  crossLeadEdge,
  crossTrailEdge,
  lineCrossSize,
  ownerW,
  ownerH,
  performLayout,
) {
  for (let idx = 0, count = line.length; idx < count; idx++) {
    let child = line[idx];
    let style = child.style;
    let alignSelf = style.alignSelf;
    if ((alignSelf === 0 ? alignItems : alignSelf) !== 4) continue;
    if (isDefined(resolveValue(isMainRow ? style.height : style.width, isMainRow ? ownerH : ownerW)))
      continue;
    if (child._hasAutoMargin) {
      let margin = style.margin;
      if (isMarginAuto(margin, crossLeadEdge) || isMarginAuto(margin, crossTrailEdge)) continue;
    }
    let margin = childMarginForAxis(child, crossDir, ownerW);
    let max = Math.max(0, lineCrossSize - margin);
    if (child._sz[SZ_CROSS] !== max) {
      let mainSize = child._sz[SZ_MAIN];
      layoutNode(
        child,
        isMainRow ? mainSize : max,
        isMainRow ? max : mainSize,
        1,
        1,
        ownerW,
        ownerH,
        performLayout,
        isMainRow,
        !isMainRow,
      );
      child._sz[SZ_CROSS] = max;
    }
  }
}
//@ chunk-bzr73sfg.js:165708-165887 layout
function applyRelativePosition(node, ownerW, ownerH, layout, left, top) {
  let position = node.style.position;
  let value = resolveValue(resolveEdgeRaw(position, EDGE_LEFT), ownerW);
  let value_2 = resolveValue(resolveEdgeRaw(position, EDGE_RIGHT), ownerW);
  let value_3 = resolveValue(resolveEdgeRaw(position, EDGE_TOP), ownerH);
  let value_4 = resolveValue(resolveEdgeRaw(position, EDGE_BOTTOM), ownerH);
  let leftOffset = isDefined(value) ? value : isDefined(value_2) ? -value_2 : 0;
  let topOffset = isDefined(value_3) ? value_3 : isDefined(value_4) ? -value_4 : 0;
  layout.left = left + leftOffset;
  layout.top = top + topOffset;
}
//@ chunk-bzr73sfg.js:165887-166915 fingerprint = layoutAbsoluteChild (0.944)
/**
 * 布局绝对定位子节点：左右/上下都给定时由此推出宽高；以 EXACTLY/UNDEFINED 布局后，按 position 偏移或父节点的 justifyContent/alignItems（考虑反向与 wrap-reverse）定位。
 */
function layoutAbsoluteChild(parent, child, parentWidth, parentHeight, pad, bor) {
  let cs = child.style;
  let posLeft = resolveEdgeRaw(cs.position, EDGE_LEFT);
  let posRight = resolveEdgeRaw(cs.position, EDGE_RIGHT);
  let posTop = resolveEdgeRaw(cs.position, EDGE_TOP);
  let posBottom = resolveEdgeRaw(cs.position, EDGE_BOTTOM);
  let rLeft = resolveValue(posLeft, parentWidth);
  let rRight = resolveValue(posRight, parentWidth);
  let rTop = resolveValue(posTop, parentHeight);
  let rBottom = resolveValue(posBottom, parentHeight);
  let paddingBoxW = parentWidth - bor[0] - bor[2];
  let paddingBoxH = parentHeight - bor[1] - bor[3];
  let cw = resolveValue(cs.width, paddingBoxW);
  let ch = resolveValue(cs.height, paddingBoxH);
  if (!isDefined(cw) && isDefined(rLeft) && isDefined(rRight)) cw = paddingBoxW - rLeft - rRight;
  if (!isDefined(ch) && isDefined(rTop) && isDefined(rBottom)) ch = paddingBoxH - rTop - rBottom;
  layoutNode(
    child,
    cw,
    ch,
    isDefined(cw) ? 1 : 0,
    isDefined(ch) ? 1 : 0,
    paddingBoxW,
    paddingBoxH,
    true,
    false,
    false,
  );
  let mL = resolveEdge(cs.margin, EDGE_LEFT, parentWidth);
  let mT = resolveEdge(cs.margin, EDGE_TOP, parentWidth);
  let mR = resolveEdge(cs.margin, EDGE_RIGHT, parentWidth);
  let mB = resolveEdge(cs.margin, EDGE_BOTTOM, parentWidth);
  let style = parent.style;
  let mainAxis = style.flexDirection;
  let reversed = isReverse(mainAxis);
  let mainRow = isRow(mainAxis);
  let wrapReverse = style.flexWrap === 2;
  let justifyContent = style.justifyContent;
  let alignSelf = cs.alignSelf;
  let alignment = alignSelf === 0 ? style.alignItems : alignSelf;
  let layout = child.layout;
  let { width, height } = layout;
  let left;
  if (isDefined(rLeft)) left = bor[0] + rLeft + mL;
  else if (isDefined(rRight)) left = parentWidth - bor[2] - rRight - width - mR;
  else if (mainRow) {
    let lead = pad[0] + bor[0];
    let trail = parentWidth - pad[2] - bor[2];
    left = reversed ? trail - width - mR : justifyAbsolute(justifyContent, lead, trail, width) + mL;
  } else
    left = alignAbsolute(alignment, pad[0] + bor[0], parentWidth - pad[2] - bor[2], width, wrapReverse) + mL;
  let top;
  if (isDefined(rTop)) top = bor[1] + rTop + mT;
  else if (isDefined(rBottom)) top = parentHeight - bor[3] - rBottom - height - mB;
  else if (mainRow)
    top = alignAbsolute(alignment, pad[1] + bor[1], parentHeight - pad[3] - bor[3], height, wrapReverse) + mT;
  else {
    let lead = pad[1] + bor[1];
    let trail = parentHeight - pad[3] - bor[3];
    top = reversed ? trail - height - mB : justifyAbsolute(justifyContent, lead, trail, height) + mT;
  }
  let hasMeasure = child.measureFunc !== null;
  layout.left = hasMeasure ? Math.floor(left) : roundToInt(left);
  layout.top = hasMeasure ? Math.floor(top) : roundToInt(top);
}
//@ chunk-bzr73sfg.js:166915-167008 layout
function justifyAbsolute(justify, start, end, size) {
  switch (justify) {
    case 1:
      return start + (end - start - size) / 2;
    case 2:
      return end - size;
    default:
      return start;
  }
}
//@ chunk-bzr73sfg.js:167008-167113 layout
function alignAbsolute(align, start, end, size, isWrapReverse) {
  switch (align) {
    case 2:
      return start + (end - start - size) / 2;
    case 3:
      return isWrapReverse ? start : end - size;
    default:
      return isWrapReverse ? end - size : start;
  }
}
//@ chunk-bzr73sfg.js:167113-167142 layout
var FB_VALUE = 0;
var FB_OWNER_W = 1;
var FB_OWNER_H = 2;
var FB_AVAIL_W = 3;
var FB_AVAIL_H = 4;
//@ chunk-bzr73sfg.js:167142-167542 layout
/**
 * 带缓存地计算子节点 flex basis（同一代或未脏且键相同则复用 _fb）。
 */
function cachedFlexBasis(child, flexDirection, availW, availH, crossMode, ownerW, ownerH) {
  let flexBasisCache = child._fb;
  let generation = child.config.generation;
  let ownerWKey = child._readsOwnerWidth ? toInt32Key(ownerW) : INT32_NAN;
  let ownerHKey = child._readsOwnerHeight ? toInt32Key(ownerH) : INT32_NAN;
  let availWKey = toInt32Key(availW);
  let availHKey = toInt32Key(availH);
  let isMainRow = isRow(flexDirection);
  if (
    (child._fbGen === generation || !child.isDirty_) &&
    child._fbCrossMode === crossMode &&
    child._fbIsRow === isMainRow &&
    flexBasisCache[FB_OWNER_W] === ownerWKey &&
    flexBasisCache[FB_OWNER_H] === ownerHKey &&
    flexBasisCache[FB_AVAIL_W] === availWKey &&
    flexBasisCache[FB_AVAIL_H] === availHKey
  )
    return flexBasisCache[FB_VALUE];
  let basis = isMainRow
    ? computeFlexBasis(child, availW, availH, crossMode, ownerW, ownerH)
    : computeColumnFlexBasis(child, availW, availH, crossMode, ownerW, ownerH);
  flexBasisCache[FB_VALUE] = basis;
  flexBasisCache[FB_OWNER_W] = ownerWKey;
  flexBasisCache[FB_OWNER_H] = ownerHKey;
  flexBasisCache[FB_AVAIL_W] = availWKey;
  flexBasisCache[FB_AVAIL_H] = availHKey;
  child._fbCrossMode = crossMode;
  child._fbIsRow = isMainRow;
  child._fbGen = generation;
  return basis;
}
//@ chunk-bzr73sfg.js:167542-167858 fingerprint = computeFlexBasis (0.65)
/**
 * 行方向 flex basis：flexBasis → width → 以内容测量（交叉轴约束按 stretch 决定 EXACTLY 或 AT_MOST，子树有测量函数时主轴给 AT_MOST）。
 */
function computeFlexBasis(child, availW, availH, crossMode, ownerW, ownerH) {
  let cs = child.style;
  let basis = resolveValue(cs.flexBasis, availW);
  if (basis === basis) return basis > 0 ? basis : 0;
  let resolved = resolveValue(cs.width, ownerW);
  if (resolved === resolved) return resolved > 0 ? resolved : 0;
  let crossConstraint = resolveValue(cs.height, ownerH);
  let crossModeResolved;
  if (crossConstraint === crossConstraint) crossModeResolved = 1;
  else if (availH === availH) {
    crossConstraint = availH - childMarginForAxis(child, 0, ownerW);
    crossModeResolved = crossMode === 1 && isStretchAlign(child) ? 1 : 2;
  } else crossModeResolved = 0;
  let mainConstraint = NaN;
  let mainMode = 0;
  if (availW === availW && hasMeasureFuncInSubtree(child)) {
    mainConstraint = availW - childMarginForAxis(child, 2, ownerW);
    mainMode = 2;
  }
  layoutNode(
    child,
    mainConstraint,
    crossConstraint,
    mainMode,
    crossModeResolved,
    ownerW,
    ownerH,
    false,
    false,
    false,
  );
  return child.layout.width;
}
//@ chunk-bzr73sfg.js:167858-168129 layout
/**
 * 列方向 flex basis：flexBasis → height → 以宽度约束测量内容高度。
 */
function computeColumnFlexBasis(child, availH, availW, crossMode, ownerW, ownerH) {
  let style = child.style;
  let value = resolveValue(style.flexBasis, availH);
  if (value === value) return value > 0 ? value : 0;
  let value_2 = resolveValue(style.height, ownerH);
  if (value_2 === value_2) return value_2 > 0 ? value_2 : 0;
  let value_3 = resolveValue(style.width, ownerW);
  let crossModeResolved;
  if (value_3 === value_3) crossModeResolved = 1;
  else if (availW === availW) {
    value_3 = availW - childMarginForAxis(child, 2, ownerW);
    crossModeResolved = crossMode === 1 && isStretchAlign(child) ? 1 : 2;
  } else crossModeResolved = 0;
  layoutNode(child, value_3, NaN, crossModeResolved, 0, ownerW, ownerH, false, false, false);
  return child.layout.height;
}
//@ chunk-bzr73sfg.js:168129-168248 fingerprint = hasMeasureFuncInSubtree (1)
/**
 * 子树中是否有带测量函数的节点（决定 basis 计算时是否给主轴上限）。
 */
function hasMeasureFuncInSubtree(node) {
  if (node.measureFunc) return true;
  let children = node.children;
  for (let idx = 0, count = children.length; idx < count; idx++)
    if (hasMeasureFuncInSubtree(children[idx])) return true;
  return false;
}
//@ chunk-bzr73sfg.js:168248-168321 layout
var frozenBits = new Int32Array(8);
var unclampedSizes = new Float64Array(64);
var clampedSizes = new Float64Array(64);
//@ chunk-bzr73sfg.js:168321-168358 layout
function isFrozen(index) {
  return frozenBits[index >>> 5] & (1 << index);
}
//@ chunk-bzr73sfg.js:168358-168389 layout
function freeze(index) {
  frozenBits[index >>> 5] |= 1 << index;
}
//@ chunk-bzr73sfg.js:168389-169514 fingerprint = resolveFlexibleLengths (0.852)
/**
 * 弹性长度分配（CSS flexbox 的冻结迭代算法）：按 grow/shrink 系数分配剩余空间，被 min/max 夹住的项冻结后重新分配，直到不再变化；grow/shrink 系数和小于 1 时只分配相应比例；最后用累计取整把尺寸写进 _sz（避免舍入误差累积）。
 */
function resolveFlexibleLengths(children, availableInnerMain, totalFlexBasis, isMainRow, ownerW, ownerH) {
  let n = children.length;
  let wordCount = (n + 31) >>> 5;
  if (wordCount > frozenBits.length) frozenBits = new Int32Array(wordCount * 2);
  if (n > unclampedSizes.length) {
    unclampedSizes = new Float64Array(n * 2);
    clampedSizes = new Float64Array(n * 2);
  }
  let unclamped = unclampedSizes;
  let clamped = clampedSizes;
  frozenBits.fill(0, 0, wordCount);
  let initialFree = isDefined(availableInnerMain) ? availableInnerMain - totalFlexBasis : 0;
  for (let i = 0; i < n; i++) {
    let child = children[i];
    let style = child.style;
    let basis = child._sz[SZ_FLEX_BASIS];
    let clamped_2 = boundAxis(style, isMainRow, basis, ownerW, ownerH);
    if (
      !isDefined(availableInnerMain) ||
      (initialFree >= 0 ? style.flexGrow === 0 : style.flexShrink === 0)
    ) {
      clamped[i] = Math.max(0, clamped_2);
      freeze(i);
    } else clamped[i] = basis;
  }
  for (let iter = 0; iter <= n; iter++) {
    let frozenDelta = 0;
    let totalGrow = 0;
    let totalShrinkScaled = 0;
    let unfrozenCount = 0;
    for (let i = 0; i < n; i++) {
      let child = children[i];
      let basis = child._sz[SZ_FLEX_BASIS];
      if (isFrozen(i)) frozenDelta += clamped[i] - basis;
      else {
        let style = child.style;
        totalGrow += style.flexGrow;
        totalShrinkScaled += style.flexShrink * basis;
        unfrozenCount++;
      }
    }
    if (unfrozenCount === 0) break;
    let remaining = initialFree - frozenDelta;
    if (remaining > 0 && totalGrow > 0 && totalGrow < 1) {
      let scaled = initialFree * totalGrow;
      if (scaled < remaining) remaining = scaled;
    } else if (remaining < 0 && totalShrinkScaled > 0) {
      let totalShrink = 0;
      for (let i = 0; i < n; i++) if (!isFrozen(i)) totalShrink += children[i].style.flexShrink;
      if (totalShrink < 1) {
        let scaled = initialFree * totalShrink;
        if (scaled > remaining) remaining = scaled;
      }
    }
    let totalViolation = 0;
    for (let i = 0; i < n; i++) {
      if (isFrozen(i)) continue;
      let child = children[i];
      let style = child.style;
      let basis = child._sz[SZ_FLEX_BASIS];
      let t = basis;
      if (remaining > 0 && totalGrow > 0) t += (remaining * style.flexGrow) / totalGrow;
      else if (remaining < 0 && totalShrinkScaled > 0)
        t += (remaining * (style.flexShrink * basis)) / totalShrinkScaled;
      unclamped[i] = t;
      let clamped_2 = Math.max(0, boundAxis(style, isMainRow, t, ownerW, ownerH));
      clamped[i] = clamped_2;
      totalViolation += clamped_2 - t;
    }
    if (totalViolation === 0) break;
    let anyFrozen = false;
    for (let i = 0; i < n; i++) {
      if (isFrozen(i)) continue;
      let v = clamped[i] - unclamped[i];
      if ((totalViolation > 0 && v > 0) || (totalViolation < 0 && v < 0)) {
        freeze(i);
        anyFrozen = true;
      }
    }
    if (!anyFrozen) break;
  }
  let running = 0;
  let prevRounded = 0;
  for (let idx = 0; idx < n; idx++) {
    running += clamped[idx];
    let rounded = (running + 0.5) | 0;
    children[idx]._sz[SZ_MAIN] = rounded - prevRounded;
    prevRounded = rounded;
  }
}
//@ chunk-bzr73sfg.js:169514-169622 fingerprint = isStretchAlign (1)
/**
 * 子节点在交叉轴上是否拉伸（alignSelf 为 auto 时看父节点 alignItems，4 = stretch）。
 */
function isStretchAlign(child) {
  let parent = child.parent;
  if (!parent) return false;
  let align = child.style.alignSelf;
  return (align === 0 ? parent.style.alignItems : align) === 4;
}
//@ chunk-bzr73sfg.js:169622-169697 fingerprint = resolveChildAlign (1)
/**
 * 子节点实际交叉轴对齐：alignSelf 为 auto 时继承父节点 alignItems。
 */
function resolveChildAlign(parent, child) {
  let alignSelf = child.style.alignSelf;
  return alignSelf === 0 ? parent.style.alignItems : alignSelf;
}
//@ chunk-bzr73sfg.js:169697-170006 fingerprint = calculateBaseline (0.933)
/**
 * 求节点基线：取第一行里 alignSelf=baseline 或标记为参考基线的子节点（否则第一个流内子节点）递归求基线加其 top；没有子节点时用自身高度。
 */
function calculateBaseline(node) {
  let children = node.children;
  let count = children.length;
  let baselineIndex = -1;
  for (let idx = 0; idx < count; idx++) {
    let child = children[idx];
    if (child._lineIndex > 0) break;
    let style = child.style;
    if (style.positionType === 2) continue;
    if (style.display === 1) continue;
    if (resolveChildAlign(node, child) === 5 || child.isReferenceBaseline_) {
      baselineIndex = idx;
      break;
    }
    if (baselineIndex === -1) baselineIndex = idx;
  }
  if (baselineIndex === -1) return node.layout.height;
  let node_2 = children[baselineIndex];
  return calculateBaseline(node_2) + node_2.layout.top;
}
//@ chunk-bzr73sfg.js:170006-170176 fingerprint = isBaselineLayout (1)
/**
 * 行方向容器且 alignItems 或某个子节点 alignSelf 为 baseline 时需要基线布局。
 */
function isBaselineLayout(node, flowChildren) {
  let style = node.style;
  if (!isRow(style.flexDirection)) return false;
  if (style.alignItems === 5) return true;
  for (let idx = 0, count = flowChildren.length; idx < count; idx++)
    if (flowChildren[idx].style.alignSelf === 5) return true;
  return false;
}
//@ chunk-bzr73sfg.js:170176-170285 fingerprint = childMarginForAxis (1)
/**
 * 子节点在某轴上的前后外边距之和（没有外边距时快速返回 0）。
 */
function childMarginForAxis(child, axis, ownerWidth) {
  if (!child._hasMargin) return 0;
  let margin = child.style.margin;
  let lead = resolveEdge(margin, leadingEdge(axis), ownerWidth);
  let trail = resolveEdge(margin, trailingEdge(axis), ownerWidth);
  return lead + trail;
}
//@ chunk-bzr73sfg.js:170285-170387 fingerprint = resolveGap (0.686)
/**
 * 解析 gap：指定方向未设置时退回 gap[all]，负值按 0。
 */
function resolveGap(style, gutter, ownerSize) {
  let gap = style.gap;
  let gapValue = gap[gutter];
  if (gapValue.unit === 0) gapValue = gap[2];
  let value = resolveValue(gapValue, ownerSize);
  return isDefined(value) ? Math.max(0, value) : 0;
}
//@ chunk-bzr73sfg.js:170387-170592 fingerprint = boundAxis (1)
/**
 * 按 min/max 宽（或高）约束一个值（百分比按父尺寸）。
 */
function boundAxis(style, isWidth, value, ownerWidth, ownerHeight) {
  let minV = isWidth ? style.minWidth : style.minHeight;
  let maxV = isWidth ? style.maxWidth : style.maxHeight;
  let minU = minV.unit;
  let maxU = maxV.unit;
  if (minU === 0 && maxU === 0) return value;
  let minValue = minU === 1 || minU === 2 ? minV.value : 0;
  let maxValue = maxU === 1 || maxU === 2 ? maxV.value : 0;
  return clampMinMax(value, minU, maxU, minValue, maxValue, isWidth ? ownerWidth : ownerHeight);
}
//@ chunk-bzr73sfg.js:170592-170778 layout
function clampMinMax(value, minUnit, maxUnit, minValue, maxValue, ownerSize) {
  let v = value;
  if (maxUnit === 1) {
    if (v > maxValue) v = maxValue;
  } else if (maxUnit === 2) {
    let m = (maxValue * ownerSize) / 100;
    if (isInt32Finite(m) && v > m) v = roundToInt(m);
  }
  if (minUnit === 1) {
    if (v < minValue) v = minValue;
  } else if (minUnit === 2) {
    let m = (minValue * ownerSize) / 100;
    if (isInt32Finite(m) && v < m) v = roundToInt(m);
  }
  return v;
}
//@ chunk-bzr73sfg.js:170778-170831 layout
function zeroLayout(layout) {
  layout.left = 0;
  layout.top = 0;
  layout.width = 0;
  layout.height = 0;
}
//@ chunk-bzr73sfg.js:170831-170895 fingerprint = zeroLayoutRecursive (0.794)
/**
 * 把节点的布局清零并标脏（display:none 子树用）。
 */
function zeroLayoutRecursive(node) {
  zeroLayout(node.layout);
  node.isDirty_ = true;
  node._hasL = false;
  node._hasM = false;
}
//@ chunk-bzr73sfg.js:170895-170983 layout
function zeroChildrenLayout(node) {
  let children = node.children;
  for (let idx = 0, count = children.length; idx < count; idx++) {
    let node = children[idx];
    zeroLayoutRecursive(node);
    zeroChildrenLayout(node);
  }
}
//@ chunk-bzr73sfg.js:170983-171202 fingerprint = collectLayoutChildren (0.679)
/**
 * 收集参与布局的子节点：display:none 的清零跳过；display:contents（2）的展开其子节点；绝对定位进 abs，其余进 flow。
 */
function collectLayoutChildren(node, flow, abs) {
  let children = node.children;
  for (let idx = 0, count = children.length; idx < count; idx++) {
    let node = children[idx];
    let style = node.style;
    let disp = style.display;
    if (disp === 1) {
      zeroLayout(node.layout);
      zeroChildrenLayout(node);
    } else if (disp === 2) {
      zeroLayout(node.layout);
      collectLayoutChildren(node, flow, abs);
    } else if (style.positionType === 2) abs.push(node);
    else flow.push(node);
  }
}
//@ chunk-bzr73sfg.js:171202-171357 fingerprint = roundLayout (0.847)
/**
 * 递归把布局结果截断为整数（|0）。
 */
function roundLayout(node) {
  let layout = node.layout;
  layout.left = layout.left | 0;
  layout.top = layout.top | 0;
  layout.width = layout.width | 0;
  layout.height = layout.height | 0;
  let children = node.children;
  for (let idx = 0, count = children.length; idx < count; idx++) roundLayout(children[idx]);
}
//@ chunk-bzr73sfg.js:171357-171629 fingerprint = parseDimension (1)
/**
 * 把样式值（undefined/auto/数字/"50%"/数字字符串）解析成 yoga Value。
 */
function parseDimension(v) {
  if (v === undefined) return UNDEFINED_VALUE;
  if (v === "auto") return AUTO_VALUE;
  if (typeof v === "number") return Number.isFinite(v) ? pointValue(v) : UNDEFINED_VALUE;
  if (typeof v === "string" && v.endsWith("%")) {
    let number = parseFloat(v);
    return Number.isFinite(number) ? percentValue(number) : UNDEFINED_VALUE;
  }
  let n = parseFloat(v);
  return Number.isFinite(n) ? pointValue(n) : UNDEFINED_VALUE;
}
//@ chunk-bzr73sfg.js:171629-171755 layout
/**
 * Edge 枚举 → 物理边下标（Start→左、End→右）。
 */
function physicalEdge(edge) {
  switch (edge) {
    case 0:
    case 4:
      return EDGE_LEFT;
    case 1:
      return EDGE_TOP;
    case 2:
    case 5:
      return EDGE_RIGHT;
    case 3:
      return EDGE_BOTTOM;
    default:
      return EDGE_LEFT;
  }
}
//@ chunk-bzr73sfg.js:171755-171893 fingerprint = YOGA_INSTANCE (1)
/**
 * 对外的 yoga 实例：Config.create、Node.create/createDefault/createWithConfig（与 yoga-layout 包接口一致，destroy 为空）。
 */
var YOGA_INSTANCE = {
  Config: {
    create: createConfig,
    destroy() {},
  },
  Node: {
    create: (config) => new Node(config),
    createDefault: () => new Node(),
    createWithConfig: (config) => new Node(config),
    destroy() {},
  },
};
export { YOGA_INSTANCE, getYogaCounters };
