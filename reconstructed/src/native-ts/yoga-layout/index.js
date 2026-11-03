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
var UNDEFINED_VALUE = { unit: 0, value: NaN },
  AUTO_VALUE = { unit: 3, value: NaN };
/**
 * 数值是否有限且绝对值不超过 2^31-1（能放进 Int32 布局存储）。
 */
//@ chunk-bzr73sfg.js:145765-145831 placement = sanitizePath (0.712)
function isInt32Finite(value) {
  return Number.isFinite(value) && Math.abs(value) <= 2147483647;
}
/**
 * 点值 {unit:1, value: 取整后的整数}；超出 Int32 返回 undefined。
 */
//@ chunk-bzr73sfg.js:145831-145883 callgraph-witnessed = pointValue (1)
function pointValue(v) {
  return isInt32Finite(v) ? { unit: 1, value: roundToInt(v) } : UNDEFINED_VALUE;
}
/**
 * 百分比值 {unit:2, value}；超出范围返回 undefined。
 */
//@ chunk-bzr73sfg.js:145883-145931 callgraph-witnessed = percentValue (1)
function percentValue(v) {
  return isInt32Finite(v) ? { unit: 2, value: v } : UNDEFINED_VALUE;
}
/**
 * 把 Value 解析成具体数值：点值原样，百分比按 ownerSize 计算并取整（超范围为 NaN），其它 NaN。
 */
//@ chunk-bzr73sfg.js:145931-146056 callgraph-witnessed = resolveValue (1)
function resolveValue(v, ownerSize) {
  switch (v.unit) {
    case 1:
      return v.value;
    case 2: {
      let f = (v.value * ownerSize) / 100;
      return isInt32Finite(f) ? roundToInt(f) : NaN;
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
/**
 * 四舍五入到整数（远离零），结果为 int32。
 */
//@ chunk-bzr73sfg.js:146106-146149 layout
function roundToInt(value) {
  return value >= 0 ? (value + 0.5) | 0 : (value - 0.5) | 0;
}
/**
 * NaN 转成 INT32_NAN 哨兵，用于 Int32 缓存键比较。
 */
//@ chunk-bzr73sfg.js:146149-146182 layout
function toInt32Key(value) {
  return value !== value ? INT32_NAN : value;
}
//@ chunk-bzr73sfg.js:146182-146201 layout
var SZ_FLEX_BASIS = 0,
  SZ_MAIN = 1,
  SZ_CROSS = 2;
//@ chunk-bzr73sfg.js:146201-146250 layout
function createInt32Cache(length) {
  return new Int32Array(length).fill(INT32_NAN);
}
/**
 * 节点默认样式：方向/flexDirection column(0)、alignItems stretch、alignContent flex-start、positionType relative、flexBasis auto、宽高 auto，边距/内边距/边框/定位 9 个边全 undefined，gap 3 槽。
 */
//@ chunk-bzr73sfg.js:146250-146644 fingerprint = defaultStyle (1)
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
var EDGE_LEFT = 0,
  EDGE_TOP = 1,
  EDGE_RIGHT = 2,
  EDGE_BOTTOM = 3;
/**
 * 解析某个物理边的值（经 Start/End、Horizontal/Vertical、All 回退）；auto 在 allowAuto 时返回 NaN，否则 0。
 */
//@ chunk-bzr73sfg.js:146668-146773 callgraph-witnessed = resolveEdge (0.186)
function resolveEdge(edges, physicalEdge, ownerSize, allowAuto = !1) {
  let p = resolveEdgeRaw(edges, physicalEdge);
  if (p.unit === 0) return 0;
  if (p.unit === 3) return allowAuto ? NaN : 0;
  return resolveValue(p, ownerSize);
}
/**
 * 取物理边的原始 Value：左/右先看 Start/End，再看本边、Horizontal/Vertical、All。
 */
//@ chunk-bzr73sfg.js:146773-146925 callgraph-witnessed = resolveEdgeRaw (0.186)
function resolveEdgeRaw(edges, physicalEdge) {
  let f = physicalEdge === EDGE_LEFT ? edges[4] : physicalEdge === EDGE_RIGHT ? edges[5] : UNDEFINED_VALUE;
  if (f.unit === 0) f = edges[physicalEdge];
  if (f.unit === 0)
    if (physicalEdge === EDGE_LEFT || physicalEdge === EDGE_RIGHT) f = edges[6];
    else f = edges[7];
  if (f.unit === 0) f = edges[8];
  return f;
}
//@ chunk-bzr73sfg.js:146925-146966 callgraph-fingerprint = isMarginAuto (1)
function isMarginAuto(edges, physicalEdge) {
  return resolveEdgeRaw(edges, physicalEdge).unit === 3;
}
//@ chunk-bzr73sfg.js:146966-147038 callgraph-fingerprint = hasAnyAutoEdge (1)
function hasAnyEdgeWithUnit(edges, unit) {
  for (let f = 0; f < 9; f++) if (edges[f].unit === unit) return !0;
  return !1;
}
//@ chunk-bzr73sfg.js:147038-147108 callgraph-fingerprint = hasAnyDefinedEdge (1)
function hasAnyDefinedEdge(edges) {
  for (let u = 0; u < 9; u++) if (edges[u].unit !== 0) return !0;
  return !1;
}
/**
 * 样式是否依赖父宽度（宽/最小/最大宽或边距、内边距用了百分比）：是则父宽变化时要重新布局。
 */
//@ chunk-bzr73sfg.js:147108-147222 layout
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
/**
 * 一次解析四个物理边（左右顶底，含 Start/End、Horizontal/Vertical、All 回退）写进 out（Int32Array），百分比按父宽算并取整。
 */
//@ chunk-bzr73sfg.js:147306-147624 layout
function resolveEdges4Into(edges, ownerWidth, out) {
  let m = edges[6],
    p = edges[7],
    g = edges[8],
    E = edges[4],
    T = edges[5],
    value = E;
  if (value.unit === 0) value = edges[0];
  if (value.unit === 0) value = m;
  if (value.unit === 0) value = g;
  if (((out[0] = resolveEdgeValueToInt(value, ownerWidth)), (value = edges[1]), value.unit === 0)) value = p;
  if (value.unit === 0) value = g;
  if (((out[1] = resolveEdgeValueToInt(value, ownerWidth)), (value = T), value.unit === 0)) value = edges[2];
  if (value.unit === 0) value = m;
  if (value.unit === 0) value = g;
  if (((out[2] = resolveEdgeValueToInt(value, ownerWidth)), (value = edges[3]), value.unit === 0)) value = p;
  if (value.unit === 0) value = g;
  out[3] = resolveEdgeValueToInt(value, ownerWidth);
}
//@ chunk-bzr73sfg.js:147624-147738 file-local
function resolveEdgeValueToInt(value, ownerSize) {
  let unit = value.unit;
  if (unit === 1) return value.value;
  if (unit === 2) {
    let m = (value.value * ownerSize) / 100;
    return isInt32Finite(m) ? roundToInt(m) : 0;
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
/**
 * 创建布局配置：pointScaleFactor 只能 0 或 1（Int32 存储，1 时布局结果取整）、errata、useWebDefaults；另含每次 calculateLayout 的统计计数（访问节点数、测量调用、缓存命中、存活节点数）与代数 generation。
 */
//@ chunk-bzr73sfg.js:148028-148508 fingerprint = createConfig (0.721)
function createConfig() {
  let n = {
    pointScaleFactor: 1,
    errata: 0,
    useWebDefaults: !1,
    generation: 0,
    nodesVisited: 0,
    measureCalls: 0,
    measureCacheHits: 0,
    cacheHits: 0,
    liveNodes: 0,
    free() {},
    isExperimentalFeatureEnabled() {
      return !1;
    },
    setExperimentalFeatureEnabled() {},
    setPointScaleFactor(u) {
      if (u !== 0 && u !== 1) throw Error("setPointScaleFactor: Int32 storage supports scale 0 or 1 only");
      n.pointScaleFactor = u;
    },
    getErrata() {
      return n.errata;
    },
    setErrata(u) {
      n.errata = u;
    },
    setUseWebDefaults(u) {
      n.useWebDefaults = u;
    },
  };
  return n;
}
/**
 * yoga 节点（纯 TS 移植，接口兼容 yoga-layout 的 Node）：style、layout（left/top/width/height 与 Int32Array 的 border/padding/margin）、父子关系、measureFunc、脏标记。多组 Int32 缓存：_lc/_mc 单槽布局/测量结果缓存（输入键 + 宽高）、_cIn/_cOut 8 槽多结果缓存、_mfC 4 槽测量函数缓存、_fb flex basis 缓存、_sz 本次的 basis/主轴/交叉轴尺寸。setter 改样式即 markDirty 并预算 _readsOwnerWidth/Height、_has* 标志；calculateLayout 自增 generation、从根 layoutNode，最后在 pointScaleFactor≠0 时取整。aspectRatio、boxSizing、dirtiedFunc 等为空实现。
 */
//@ chunk-bzr73sfg.js:148508-157070 fingerprint = Node (0.93)
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
  _hasAutoMargin = !1;
  _hasPosition = !1;
  _hasPadding = !1;
  _hasBorder = !1;
  _hasMargin = !1;
  _readsOwnerWidth = !1;
  _readsOwnerHeight = !1;
  _lc = createInt32Cache(6);
  _lWM = 0;
  _lHM = 0;
  _lFW = !1;
  _lFH = !1;
  _hasL = !1;
  _mc = createInt32Cache(6);
  _mWM = 0;
  _mHM = 0;
  _hasM = !1;
  _fb = createInt32Cache(5);
  _fbCrossMode = -1;
  _fbIsRow = !1;
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
  constructor(n) {
    ((this.style = defaultStyle()),
      (this.layout = {
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        border: new Int32Array(4),
        padding: new Int32Array(4),
        margin: new Int32Array(4),
      }),
      (this.parent = null),
      (this.children = []),
      (this.measureFunc = null),
      (this.config = n ?? DEFAULT_CONFIG),
      (this.isDirty_ = !0),
      (this.isReferenceBaseline_ = !1),
      this.config.liveNodes++);
  }
  insertChild(n, u) {
    if (n.config !== this.config) throw Error("insertChild: child was created with a different Config");
    ((n.parent = this), this.children.splice(u, 0, n), this.markDirty());
  }
  removeChild(n) {
    let index = this.children.indexOf(n);
    if (index >= 0) (this.children.splice(index, 1), (n.parent = null), this.markDirty());
  }
  getChild(n) {
    return this.children[n];
  }
  getChildCount() {
    return this.children.length;
  }
  getParent() {
    return this.parent;
  }
  free() {
    ((this.parent = null),
      (this.children = []),
      (this.measureFunc = null),
      (this._cIn = null),
      (this._cOut = null),
      this.config.liveNodes--);
  }
  freeRecursive() {
    let children = this.children;
    for (let u = 0, f = children.length; u < f; u++) children[u].freeRecursive();
    this.free();
  }
  clearLayoutCacheRecursive() {
    let n = new Set(),
      u = [this],
      f = (this.config.liveNodes | 0) * 4 + 1024;
    while (u.length > 0 && --f >= 0) {
      let m = u.pop();
      if (!(m instanceof Node) || n.has(m)) continue;
      (n.add(m),
        (m.isDirty_ = !0),
        (m._hasL = !1),
        (m._hasM = !1),
        (m._cN = 0),
        (m._cWr = 0),
        (m._cGen = -1),
        (m._mfN = 0),
        (m._mfWr = 0),
        (m._fbCrossMode = -1),
        (m._fbGen = -1),
        (m._mGen = -1));
      let children = m.children;
      if (Array.isArray(children))
        for (let g = 0, E = children.length; g < E && g < f; g++) u.push(children[g]);
    }
    try {
      this.markDirty();
    } catch {}
  }
  reset() {
    ((this.style = defaultStyle()),
      (this.children = []),
      (this.parent = null),
      (this.measureFunc = null),
      (this.isDirty_ = !0),
      (this._hasAutoMargin = !1),
      (this._hasPosition = !1),
      (this._hasPadding = !1),
      (this._hasBorder = !1),
      (this._hasMargin = !1),
      (this._readsOwnerWidth = !1),
      (this._readsOwnerHeight = !1),
      (this._hasL = !1),
      (this._hasM = !1),
      (this._cN = 0),
      (this._cWr = 0),
      (this._mfN = 0),
      (this._mfWr = 0),
      (this._fbCrossMode = -1),
      (this._fbGen = -1),
      (this._mGen = -1));
  }
  markDirty() {
    ((this.isDirty_ = !0), (this._mfN = 0), (this._mfWr = 0));
    let parent = this.parent;
    if (parent && !parent.isDirty_) parent.markDirty();
  }
  isDirty() {
    return this.isDirty_;
  }
  hasNewLayout() {
    return !0;
  }
  markLayoutSeen() {}
  setMeasureFunc(n) {
    ((this.measureFunc = n), this.markDirty());
  }
  unsetMeasureFunc() {
    ((this.measureFunc = null), this.markDirty());
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
  getComputedBorder(n) {
    return this.layout.border[physicalEdge(n)];
  }
  getComputedPadding(n) {
    return this.layout.padding[physicalEdge(n)];
  }
  getComputedMargin(n) {
    return this.layout.margin[physicalEdge(n)];
  }
  getOfferedWidth(n, u) {
    let _mfC = this._mfC,
      m = n;
    for (let p = this._mfN * 6 - 6; p >= 0; p -= 6) {
      if (!canUseCachedMeasurement(1, n, _mfC[p + 1], _mfC[p], _mfC[p + 4])) continue;
      if (_mfC[p + 5] !== u) return n;
      m = _mfC[p + 1] === 2 ? _mfC[p] : n;
    }
    return m;
  }
  setWidth(n) {
    ((this.style.width = parseDimension(n)),
      (this._readsOwnerWidth = readsOwnerWidth(this.style)),
      this.markDirty());
  }
  setWidthPercent(n) {
    ((this.style.width = percentValue(n)),
      (this._readsOwnerWidth = readsOwnerWidth(this.style)),
      this.markDirty());
  }
  setWidthAuto() {
    ((this.style.width = AUTO_VALUE),
      (this._readsOwnerWidth = readsOwnerWidth(this.style)),
      this.markDirty());
  }
  setHeight(n) {
    ((this.style.height = parseDimension(n)),
      (this._readsOwnerHeight = readsOwnerHeight(this.style)),
      this.markDirty());
  }
  setHeightPercent(n) {
    ((this.style.height = percentValue(n)),
      (this._readsOwnerHeight = readsOwnerHeight(this.style)),
      this.markDirty());
  }
  setHeightAuto() {
    ((this.style.height = AUTO_VALUE),
      (this._readsOwnerHeight = readsOwnerHeight(this.style)),
      this.markDirty());
  }
  setMinWidth(n) {
    ((this.style.minWidth = parseDimension(n)),
      (this._readsOwnerWidth = readsOwnerWidth(this.style)),
      this.markDirty());
  }
  setMinWidthPercent(n) {
    ((this.style.minWidth = percentValue(n)),
      (this._readsOwnerWidth = readsOwnerWidth(this.style)),
      this.markDirty());
  }
  setMinHeight(n) {
    ((this.style.minHeight = parseDimension(n)),
      (this._readsOwnerHeight = readsOwnerHeight(this.style)),
      this.markDirty());
  }
  setMinHeightPercent(n) {
    ((this.style.minHeight = percentValue(n)),
      (this._readsOwnerHeight = readsOwnerHeight(this.style)),
      this.markDirty());
  }
  setMaxWidth(n) {
    ((this.style.maxWidth = parseDimension(n)),
      (this._readsOwnerWidth = readsOwnerWidth(this.style)),
      this.markDirty());
  }
  setMaxWidthPercent(n) {
    ((this.style.maxWidth = percentValue(n)),
      (this._readsOwnerWidth = readsOwnerWidth(this.style)),
      this.markDirty());
  }
  setMaxHeight(n) {
    ((this.style.maxHeight = parseDimension(n)),
      (this._readsOwnerHeight = readsOwnerHeight(this.style)),
      this.markDirty());
  }
  setMaxHeightPercent(n) {
    ((this.style.maxHeight = percentValue(n)),
      (this._readsOwnerHeight = readsOwnerHeight(this.style)),
      this.markDirty());
  }
  setFlexDirection(n) {
    ((this.style.flexDirection = n), this.markDirty());
  }
  setFlexGrow(n) {
    ((this.style.flexGrow = n ?? 0), this.markDirty());
  }
  setFlexShrink(n) {
    ((this.style.flexShrink = n ?? 0), this.markDirty());
  }
  setFlex(n) {
    if (n === void 0 || isNaN(n)) ((this.style.flexGrow = 0), (this.style.flexShrink = 0));
    else if (n > 0)
      ((this.style.flexGrow = n), (this.style.flexShrink = 1), (this.style.flexBasis = pointValue(0)));
    else if (n < 0) ((this.style.flexGrow = 0), (this.style.flexShrink = -n));
    else ((this.style.flexGrow = 0), (this.style.flexShrink = 0));
    this.markDirty();
  }
  setFlexBasis(n) {
    ((this.style.flexBasis = parseDimension(n)), this.markDirty());
  }
  setFlexBasisPercent(n) {
    ((this.style.flexBasis = percentValue(n)), this.markDirty());
  }
  setFlexBasisAuto() {
    ((this.style.flexBasis = AUTO_VALUE), this.markDirty());
  }
  setFlexWrap(n) {
    ((this.style.flexWrap = n), this.markDirty());
  }
  setAlignItems(n) {
    ((this.style.alignItems = n), this.markDirty());
  }
  setAlignSelf(n) {
    ((this.style.alignSelf = n), this.markDirty());
  }
  setAlignContent(n) {
    ((this.style.alignContent = n), this.markDirty());
  }
  setJustifyContent(n) {
    ((this.style.justifyContent = n), this.markDirty());
  }
  setDisplay(n) {
    ((this.style.display = n), this.markDirty());
  }
  getDisplay() {
    return this.style.display;
  }
  setPositionType(n) {
    ((this.style.positionType = n), this.markDirty());
  }
  setPosition(n, u) {
    ((this.style.position[n] = parseDimension(u)),
      (this._hasPosition = hasAnyDefinedEdge(this.style.position)),
      this.markDirty());
  }
  setPositionPercent(n, u) {
    ((this.style.position[n] = percentValue(u)), (this._hasPosition = !0), this.markDirty());
  }
  setPositionAuto(n) {
    ((this.style.position[n] = AUTO_VALUE), (this._hasPosition = !0), this.markDirty());
  }
  setOverflow(n) {
    ((this.style.overflow = n), this.markDirty());
  }
  setDirection(n) {
    ((this.style.direction = n), this.markDirty());
  }
  setBoxSizing(n) {}
  setMargin(n, u) {
    let f = parseDimension(u);
    if (((this.style.margin[n] = f), f.unit === 3)) this._hasAutoMargin = !0;
    else this._hasAutoMargin = hasAnyEdgeWithUnit(this.style.margin, 3);
    ((this._hasMargin = this._hasAutoMargin || hasAnyDefinedEdge(this.style.margin)),
      (this._readsOwnerWidth = readsOwnerWidth(this.style)),
      this.markDirty());
  }
  setMarginPercent(n, u) {
    ((this.style.margin[n] = percentValue(u)),
      (this._hasAutoMargin = hasAnyEdgeWithUnit(this.style.margin, 3)),
      (this._hasMargin = !0),
      (this._readsOwnerWidth = readsOwnerWidth(this.style)),
      this.markDirty());
  }
  setMarginAuto(n) {
    ((this.style.margin[n] = AUTO_VALUE),
      (this._hasAutoMargin = !0),
      (this._hasMargin = !0),
      (this._readsOwnerWidth = readsOwnerWidth(this.style)),
      this.markDirty());
  }
  setPadding(n, u) {
    ((this.style.padding[n] = parseDimension(u)),
      (this._hasPadding = hasAnyDefinedEdge(this.style.padding)),
      (this._readsOwnerWidth = readsOwnerWidth(this.style)),
      this.markDirty());
  }
  setPaddingPercent(n, u) {
    ((this.style.padding[n] = percentValue(u)),
      (this._hasPadding = !0),
      (this._readsOwnerWidth = readsOwnerWidth(this.style)),
      this.markDirty());
  }
  setBorder(n, u) {
    ((this.style.border[n] = u === void 0 ? UNDEFINED_VALUE : pointValue(u)),
      (this._hasBorder = hasAnyDefinedEdge(this.style.border)),
      this.markDirty());
  }
  setGap(n, u) {
    ((this.style.gap[n] = parseDimension(u)), this.markDirty());
  }
  setGapPercent(n, u) {
    ((this.style.gap[n] = percentValue(u)), this.markDirty());
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
  copyStyle(n) {}
  setDirtiedFunc(n) {}
  unsetDirtiedFunc() {}
  setIsReferenceBaseline(n) {
    ((this.isReferenceBaseline_ = n), this.markDirty());
  }
  isReferenceBaseline() {
    return this.isReferenceBaseline_;
  }
  setAspectRatio(n) {}
  getAspectRatio() {
    return NaN;
  }
  setAlwaysFormsContainingBlock(n) {}
  calculateLayout(n, u, f) {
    let config = this.config;
    ((config.nodesVisited = 0),
      (config.measureCalls = 0),
      (config.measureCacheHits = 0),
      (config.cacheHits = 0),
      config.generation++);
    let p = isInt32Finite(n) ? roundToInt(n) : NaN,
      g = isInt32Finite(u) ? roundToInt(u) : NaN;
    layoutNode(this, p, g, isDefined(p) ? 1 : 0, isDefined(g) ? 1 : 0, p, g, !0, !1, !1);
    let margin = this.layout.margin,
      T = resolveValue(resolveEdgeRaw(this.style.position, EDGE_LEFT), isDefined(p) ? p : 0),
      A = resolveValue(resolveEdgeRaw(this.style.position, EDGE_TOP), isDefined(g) ? g : 0);
    if (
      ((this.layout.left = margin[EDGE_LEFT] + (isDefined(T) ? T : 0)),
      (this.layout.top = margin[EDGE_TOP] + (isDefined(A) ? A : 0)),
      this.config.pointScaleFactor !== 0)
    )
      roundLayout(this);
  }
}
//@ chunk-bzr73sfg.js:157070-157092 layout
var DEFAULT_CONFIG = createConfig(),
  LAYOUT_CACHE_SLOTS = 8,
  MEASURE_CACHE_SLOTS = 4;
/**
 * 把本次布局的输入键与结果宽高写进节点的 8 槽环形缓存（同一 generation 内复用；performLayout 时换代先清空）。
 */
//@ chunk-bzr73sfg.js:157092-157491 fingerprint = cacheWrite (0.953)
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
  if (performLayout && node._cGen !== generation) ((node._cN = 0), (node._cWr = 0));
  if (isMeasureOnly) return;
  if (!node._cIn)
    ((node._cIn = new Int32Array(LAYOUT_CACHE_SLOTS * 8)),
      (node._cOut = new Int32Array(LAYOUT_CACHE_SLOTS * 2)));
  let slot = node._cWr++ % LAYOUT_CACHE_SLOTS;
  if (node._cN < LAYOUT_CACHE_SLOTS) node._cN = node._cWr;
  let base = slot * 8,
    cIn = node._cIn;
  ((cIn[base] = toInt32Key(availW)),
    (cIn[base + 1] = toInt32Key(availH)),
    (cIn[base + 2] = widthMode),
    (cIn[base + 3] = heightMode),
    (cIn[base + 4] = toInt32Key(ownerW)),
    (cIn[base + 5] = toInt32Key(ownerH)),
    (cIn[base + 6] = forceWidth ? 1 : 0),
    (cIn[base + 7] = forceHeight ? 1 : 0));
  let { _cOut: _cOut, layout: layout } = node;
  ((_cOut[slot * 2] = layout.width), (_cOut[slot * 2 + 1] = layout.height), (node._cGen = generation));
}
//@ chunk-bzr73sfg.js:157491-157598 layout
function commitSingleCacheResult(node, performLayout) {
  let layout = node.layout,
    { width: width, height: height } = layout;
  if (performLayout) ((node._lc[4] = width), (node._lc[5] = height));
  else ((node._mc[4] = width), (node._mc[5] = height));
}
/**
 * 读最近一次 calculateLayout 的统计：访问节点数、测量调用、测量缓存命中、布局缓存命中、存活节点数。
 */
//@ chunk-bzr73sfg.js:157598-157758 fingerprint = getYogaCounters (0.632)
function getYogaCounters(n) {
  let config = n.config;
  return {
    visited: config.nodesVisited,
    measured: config.measureCalls,
    measureCacheHits: config.measureCacheHits,
    cacheHits: config.cacheHits,
    live: config.liveNodes,
  };
}
/**
 * 布局缓存查找：未脏时依次查单槽布局缓存 _lc、8 槽缓存 _cIn/_cOut、单槽测量缓存 _mc，键为（可用宽高、宽高模式、依赖时的父宽高、强制宽高标志），命中则把宽高写进 out 并返回真。
 */
//@ chunk-bzr73sfg.js:157758-158548 fingerprint = layoutNode (0.491)
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
  let config = node.config,
    generation = config.generation,
    sameGenCached = node._cGen === generation && !isMeasureOnly,
    measuredThisGen = isMeasureOnly && node._mGen === generation,
    wasDirty = node.isDirty_;
  if ((wasDirty && !sameGenCached) || measuredThisGen) return !1;
  let crossAx = toInt32Key(availW),
    isMainRow = toInt32Key(availH),
    mainLead = toInt32Key(ownerW),
    mainTrail = toInt32Key(ownerH);
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
  )
    return (config.cacheHits++, (out.width = node._lc[4]), (out.height = node._lc[5]), !0);
  let _cN = node._cN;
  if (_cN > 0 && !isMeasureOnly && (sameGenCached || !wasDirty)) {
    let { _cIn: _cIn, _cOut: _cOut } = node,
      ee = forceWidth ? 1 : 0,
      ae = forceHeight ? 1 : 0;
    for (let ne = 0; ne < _cN; ne++) {
      let de = ne * 8;
      if (
        _cIn[de + 2] === widthMode &&
        _cIn[de + 3] === heightMode &&
        _cIn[de + 6] === ee &&
        _cIn[de + 7] === ae &&
        _cIn[de] === crossAx &&
        _cIn[de + 1] === isMainRow &&
        _cIn[de + 4] === mainLead &&
        _cIn[de + 5] === mainTrail
      )
        return ((out.width = _cOut[ne * 2]), (out.height = _cOut[ne * 2 + 1]), config.cacheHits++, !0);
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
  )
    return ((out.width = node._mc[4]), (out.height = node._mc[5]), config.cacheHits++, !0);
  return !1;
}
/**
 * 记下本次布局/测量的缓存键（performLayout 写 _lc 并清脏，否则写 _mc），返回调用前是否为脏。
 */
//@ chunk-bzr73sfg.js:158548-158888 layout
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
    if (
      ((node._lc[0] = toInt32Key(availW)),
      (node._lc[1] = toInt32Key(availH)),
      (node._lWM = widthMode),
      (node._lHM = heightMode),
      (node._lc[2] = toInt32Key(ownerW)),
      (node._lc[3] = toInt32Key(ownerH)),
      (node._lFW = forceWidth),
      (node._lFH = forceHeight),
      (node._hasL = !0),
      (node.isDirty_ = !1),
      isDirty_)
    )
      node._hasM = !1;
  } else if (
    ((node._mc[0] = toInt32Key(availW)),
    (node._mc[1] = toInt32Key(availH)),
    (node._mWM = widthMode),
    (node._mHM = heightMode),
    (node._mc[2] = toInt32Key(ownerW)),
    (node._mc[3] = toInt32Key(ownerH)),
    (node._hasM = !0),
    (node._mGen = node.config.generation),
    isDirty_)
  )
    node._hasL = !1;
  return isDirty_;
}
/**
 * 节点布局入口（递归）：先查缓存；解析内边距、边框、外边距到 layout；样式宽高确定时改为 EXACTLY 模式；按 min/max 约束；无子节点时调用测量函数（measureLeaf）或用内边距+边框；有子节点时 layoutFlexContainer；最后写缓存。
 */
//@ chunk-bzr73sfg.js:158888-159701 layout
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
  let { style: style, layout: layout } = node,
    keyOwnerW = node._readsOwnerWidth ? ownerW : NaN,
    keyOwnerH = node._readsOwnerHeight ? ownerH : NaN;
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
    ),
    { padding: padding, border: border, margin: margin } = layout;
  if (node._hasPadding) resolveEdges4Into(style.padding, ownerW, padding);
  else padding[0] = padding[1] = padding[2] = padding[3] = 0;
  if (node._hasBorder) resolveEdges4Into(style.border, ownerW, border);
  else border[0] = border[1] = border[2] = border[3] = 0;
  if (node._hasMargin) resolveEdges4Into(style.margin, ownerW, margin);
  else margin[0] = margin[1] = margin[2] = margin[3] = 0;
  let paddingBorderX = padding[0] + padding[2] + border[0] + border[2],
    paddingBorderY = padding[1] + padding[3] + border[1] + border[3],
    styleWidth = forceWidth ? NaN : resolveValue(style.width, ownerW),
    styleHeight = forceHeight ? NaN : resolveValue(style.height, ownerH),
    width = availW,
    height = availH,
    wMode = widthMode,
    hMode = heightMode;
  if (isDefined(styleWidth)) ((width = styleWidth), (wMode = 1));
  if (isDefined(styleHeight)) ((height = styleHeight), (hMode = 1));
  if (
    ((width = boundAxis(style, !0, width, ownerW, ownerH)),
    (height = boundAxis(style, !1, height, ownerW, ownerH)),
    node.children.length === 0)
  )
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
    else
      ((layout.width = wMode === 1 ? width : boundAxis(style, !0, paddingBorderX, ownerW, ownerH)),
        (layout.height = hMode === 1 ? height : boundAxis(style, !1, paddingBorderY, ownerW, ownerH)));
  else
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
  (commitSingleCacheResult(node, performLayout),
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
    ));
}
/**
 * 叶子节点测量：两轴都 EXACTLY 直接用；否则以内容区宽高与模式调用 measureFunc（4 槽缓存，按 yoga 的 canUseCachedMeasurement 规则复用），结果向上取整加回内边距边框并按 min/max 约束。
 */
//@ chunk-bzr73sfg.js:159701-160456 file-local
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
    ((layout.width = width), (layout.height = height));
    return;
  }
  let innerW = widthMode === 0 ? NaN : Math.max(0, width - paddingBorderX),
    U = innerW >= 1 ? innerW | 0 : innerW,
    L = heightMode === 0 ? NaN : Math.max(0, height - paddingBorderY),
    innerH = L >= 1 ? L | 0 : L,
    config = node.config;
  config.measureCalls++;
  let G = toInt32Key(U),
    X = toInt32Key(innerH),
    _mfC = node._mfC;
  for (let ae = 0; ae < node._mfN; ae++) {
    let ne = ae * 6,
      de = _mfC[ne + 4],
      se = _mfC[ne + 5];
    if (
      canUseCachedMeasurement(widthMode, G, _mfC[ne + 1], _mfC[ne], de) &&
      canUseCachedMeasurement(heightMode, X, _mfC[ne + 3], _mfC[ne + 2], se)
    ) {
      (config.measureCacheHits++,
        (layout.width = widthMode === 1 ? width : boundAxis(style, !0, de + paddingBorderX, ownerW, ownerH)),
        (layout.height =
          heightMode === 1 ? height : boundAxis(style, !1, se + paddingBorderY, ownerW, ownerH)));
      return;
    }
  }
  let measureFunc = node.measureFunc(U, widthMode, innerH, heightMode);
  if (!_mfC) _mfC = node._mfC = new Int32Array(MEASURE_CACHE_SLOTS * 6);
  let Y = node._mfWr++ % MEASURE_CACHE_SLOTS;
  if (node._mfN < MEASURE_CACHE_SLOTS) node._mfN++;
  let J = Y * 6;
  ((_mfC[J] = G), (_mfC[J + 1] = widthMode), (_mfC[J + 2] = X), (_mfC[J + 3] = heightMode));
  let V = isInt32Finite(measureFunc.width) ? Math.ceil(measureFunc.width) : 0,
    ee = isInt32Finite(measureFunc.height) ? Math.ceil(measureFunc.height) : 0;
  ((_mfC[J + 4] = V),
    (_mfC[J + 5] = ee),
    (layout.width = widthMode === 1 ? width : boundAxis(style, !0, V + paddingBorderX, ownerW, ownerH)),
    (layout.height = heightMode === 1 ? height : boundAxis(style, !1, ee + paddingBorderY, ownerW, ownerH)));
}
/**
 * 能否复用缓存的测量结果：模式与尺寸相同；或新为 EXACTLY 且尺寸等于缓存结果；或新为 AT_MOST 且缓存结果不超过新上限。
 */
//@ chunk-bzr73sfg.js:160456-160592 layout
function canUseCachedMeasurement(mode, size, cachedMode, cachedSize, cachedResult) {
  if (cachedMode === mode && cachedSize === size) return !0;
  if (cachedMode === 1) return !1;
  if (mode === 1) return size === cachedResult && (cachedMode === 0 || cachedResult <= cachedSize);
  return mode === 2 && cachedResult <= size && (cachedMode === 0 || cachedSize > size);
}
/**
 * flex 容器布局：收集流内/绝对定位子节点；算每个子节点的 flex basis（带缓存）；按 flexWrap 断行；逐行解析弹性长度并布局子节点（layoutFlexLine）、算行的主轴/交叉轴尺寸（baseline 对齐另计）；据此确定容器自身尺寸（含 overflow:scroll 时的收缩规则）；performLayout 时再做 alignContent、stretch、justify 与交叉轴对齐定位（positionLineChildren），最后布局绝对定位子节点。
 */
//@ chunk-bzr73sfg.js:160592-162177 layout
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
  let { padding: padding, border: border } = layout,
    flexDirection = style.flexDirection,
    z = crossAxis(flexDirection),
    isMainRow = isRow(flexDirection),
    mainSize = isMainRow ? width : height,
    crossSize = isMainRow ? height : width,
    q = isMainRow ? widthMode : heightMode,
    Y = isMainRow ? heightMode : widthMode,
    J = isMainRow ? paddingBorderX : paddingBorderY,
    V = isMainRow ? paddingBorderY : paddingBorderX,
    availMain = isDefined(mainSize) ? Math.max(0, mainSize - J) : NaN,
    availCross = isDefined(crossSize) ? Math.max(0, crossSize - V) : NaN,
    mainGap = resolveGap(style, isMainRow ? 0 : 1, availMain),
    flowChildren = [],
    absChildren = [];
  collectLayoutChildren(node, flowChildren, absChildren);
  let ye = isMainRow ? availMain : availCross,
    ue = isMainRow ? availCross : availMain,
    isWrap = style.flexWrap !== 0,
    crossGap = resolveGap(style, isMainRow ? 1 : 0, availCross),
    Se = flowChildren.length;
  for (let Qe = 0; Qe < Se; Qe++) {
    let Ue = flowChildren[Qe];
    Ue._sz[SZ_FLEX_BASIS] = cachedFlexBasis(Ue, flexDirection, availMain, availCross, Y, ye, ue);
  }
  let lines;
  if (!isWrap || !isDefined(availMain) || Se === 0) {
    for (let Qe = 0; Qe < Se; Qe++) flowChildren[Qe]._lineIndex = 0;
    lines = [flowChildren];
  } else lines = breakIntoLines(flowChildren, availMain, isMainRow, flexDirection, ye, ue, mainGap);
  let lineCount = lines.length,
    isBaseline = isBaselineLayout(node, flowChildren),
    int32Array = new Int32Array(lineCount),
    int32Array_2 = new Int32Array(lineCount),
    Ne = isBaseline ? new Int32Array(lineCount) : EMPTY_INT32,
    Ce = isMainRow ? ownerW : ownerH,
    Te = 0,
    Ae = 0;
  for (let Qe = 0; Qe < lineCount; Qe++) {
    let Ue = lines[Qe];
    layoutFlexLine(
      Ue,
      style,
      flexDirection,
      z,
      isMainRow,
      availMain,
      availCross,
      Y,
      mainGap,
      ye,
      ue,
      Ce,
      J,
      isWrap,
      performLayout,
    );
    let Ve = lineCrossSizeOut;
    if (isBaseline) Ve = computeLineBaseline(node, Ue, ye, Ne, Qe, Ve);
    let gt = lineMainSizeOut;
    ((int32Array[Qe] = gt), (int32Array_2[Qe] = Ve), (Te = Math.max(Te, gt)), (Ae += Ve));
  }
  let Pe = lineCount > 1 ? crossGap * (lineCount - 1) : 0;
  Ae += Pe;
  let Ze = style.overflow === 2,
    it = Te + J,
    Pn =
      q === 1
        ? mainSize
        : q === 2 && Ze
          ? Math.max(Math.min(mainSize, it), J)
          : isWrap && lineCount > 1 && q === 2
            ? mainSize
            : it,
    qn = Ae + V,
    Xt = Y === 1 ? crossSize : Y === 2 && Ze ? Math.max(Math.min(crossSize, qn), V) : qn,
    st = boundAxis(style, !0, isMainRow ? Pn : Xt, ownerW, ownerH),
    At = boundAxis(style, !1, isMainRow ? Xt : Pn, ownerW, ownerH);
  if (((layout.width = st), (layout.height = At), !performLayout)) return;
  let bn = (isMainRow ? st : At) - J,
    Ot = (isMainRow ? At : st) - V,
    Ie = leadingEdge(flexDirection),
    Ht = isMainRow ? EDGE_TOP : EDGE_LEFT,
    lt = isMainRow ? EDGE_BOTTOM : EDGE_RIGHT,
    Ft = isReverse(flexDirection),
    vn = isMainRow ? st : At,
    ct = padding[Ht] + border[Ht],
    Sn = crossGap,
    Br = Ot - Ae;
  if (lineCount === 1 && !isWrap && !isBaseline) int32Array_2[0] = Ot;
  else
    (resolveAlignContent(style.alignContent, Br, lineCount, int32Array_2),
      (ct += alignContentLeadOffset),
      (Sn += alignContentBetween));
  let li = style.flexWrap === 2,
    Bn = isMainRow ? At : st,
    rn = isWrap || Y !== 1,
    St = padding[Ie] + border[Ie],
    alignItems = style.alignItems,
    Qn = ct;
  for (let Qe = 0; Qe < lineCount; Qe++) {
    let Ue = lines[Qe],
      Ve = int32Array_2[Qe];
    if (rn) stretchLineChildren(Ue, alignItems, isMainRow, z, Ht, lt, Ve, ye, ue, performLayout);
    (positionLineChildren(
      Ue,
      style,
      flexDirection,
      isMainRow,
      Ve,
      li ? Bn - Qn - Ve : Qn,
      int32Array[Qe],
      bn,
      St,
      vn,
      mainGap,
      ye,
      ue,
      Ft,
      li,
      isBaseline,
      isBaseline ? Ne[Qe] : 0,
    ),
      (Qn += Ve + Sn));
  }
  for (let Qe = 0, Ue = absChildren.length; Qe < Ue; Qe++)
    layoutAbsoluteChild(node, absChildren[Qe], st, At, padding, border);
}
//@ chunk-bzr73sfg.js:162177-162222 layout
var EMPTY_INT32 = new Int32Array(0),
  alignContentLeadOffset = 0,
  alignContentBetween = 0,
  lineMainSizeOut = 0,
  lineCrossSizeOut = 0;
/**
 * 布局一行：可用主轴空间未定时按容器 min/max 推出；resolveFlexibleLengths 分配主轴尺寸；逐个子节点决定交叉轴尺寸（固定、stretch 时撑满、否则 AT_MOST）并 layoutNode；输出本行主轴总长与最大交叉轴尺寸。
 */
//@ chunk-bzr73sfg.js:162222-163212 layout
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
  let z = line.length,
    alignItems = style.alignItems,
    X = z > 1 ? mainGap * (z - 1) : 0,
    totalBasis = X;
  for (let se = 0; se < z; se++) {
    let ye = line[se];
    totalBasis += ye._sz[SZ_FLEX_BASIS] + childMarginForAxis(ye, flexDirection, ownerW);
  }
  let availForFlex = availMain;
  if (availForFlex !== availForFlex) {
    let se = resolveValue(isMainRow ? style.minWidth : style.minHeight, ownerMain),
      ye = resolveValue(isMainRow ? style.maxWidth : style.maxHeight, ownerMain);
    if (ye === ye && totalBasis > ye - paddingBorderMain) availForFlex = Math.max(0, ye - paddingBorderMain);
    else if (se === se && totalBasis < se - paddingBorderMain)
      availForFlex = Math.max(0, se - paddingBorderMain);
  }
  resolveFlexibleLengths(line, availForFlex, totalBasis, isMainRow, ownerW, ownerH);
  let Y = isMainRow ? EDGE_TOP : EDGE_LEFT,
    J = isMainRow ? EDGE_BOTTOM : EDGE_RIGHT,
    V = availCross === availCross,
    ee = 0;
  for (let se = 0; se < z; se++) {
    let ye = line[se],
      style = ye.style,
      alignSelf = style.alignSelf,
      pe = alignSelf === 0 ? alignItems : alignSelf,
      Se = childMarginForAxis(ye, crossDir, ownerW),
      xe = NaN,
      fe = 0,
      ge = resolveValue(isMainRow ? style.height : style.width, isMainRow ? ownerH : ownerW),
      we = !1;
    if (ye._hasAutoMargin) {
      let margin = style.margin;
      we = isMarginAuto(margin, Y) || isMarginAuto(margin, J);
    }
    if (ge === ge) ((xe = ge), (fe = 1));
    else if (pe === 4 && !we && !isWrap && V && crossMode === 1)
      ((xe = Math.max(0, availCross - Se)), (fe = 1));
    else if (!isWrap && V) ((xe = Math.max(0, availCross - Se)), (fe = 2));
    let Fe = isMainRow ? ye._sz[SZ_MAIN] : xe,
      Ne = isMainRow ? xe : ye._sz[SZ_MAIN];
    layoutNode(
      ye,
      Fe,
      Ne,
      isMainRow ? 1 : fe,
      isMainRow ? fe : 1,
      ownerW,
      ownerH,
      performLayout,
      isMainRow,
      !isMainRow,
    );
    let layout = ye.layout;
    ((ye._sz[SZ_CROSS] = isMainRow ? layout.height : layout.width),
      (ee = Math.max(ee, ye._sz[SZ_CROSS] + Se)));
  }
  let ae = leadingEdge(flexDirection),
    ne = trailingEdge(flexDirection),
    de = X;
  for (let se = 0; se < z; se++) {
    let ye = line[se],
      margin = ye.layout.margin;
    de += ye._sz[SZ_MAIN] + margin[ae] + margin[ne];
  }
  ((lineMainSizeOut = de), (lineCrossSizeOut = ee));
}
/**
 * 定位一行的子节点：主轴按 auto margin 或 justifyContent（center/flex-end/space-between/around/evenly）分配剩余空间；交叉轴按 alignSelf/alignItems（含 auto margin、baseline）；有测量函数的节点向下取整、其余四舍五入；带 position 偏移的相对定位节点加偏移。
 */
//@ chunk-bzr73sfg.js:163212-164533 layout
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
  _,
  U,
  isReverse,
  isWrapReverse,
  isBaseline,
  lineBaseline,
) {
  let X = line.length,
    alignItems = style.alignItems,
    q = leadingEdge(flexDirection),
    Y = trailingEdge(flexDirection),
    J = isMainRow ? EDGE_TOP : EDGE_LEFT,
    V = isMainRow ? EDGE_BOTTOM : EDGE_RIGHT,
    ee = leadingMain,
    ae = betweenMain,
    autoMarginCount = 0;
  for (let ce = 0; ce < X; ce++) {
    let pe = line[ce];
    if (!pe._hasAutoMargin) continue;
    let margin = pe.style.margin;
    if (isMarginAuto(margin, q)) autoMarginCount++;
    if (isMarginAuto(margin, Y)) autoMarginCount++;
  }
  let de = availMain - lineMainSize,
    max = Math.max(0, de),
    ye = autoMarginCount > 0 && max > 0 ? max / autoMarginCount : 0;
  if (autoMarginCount === 0)
    switch (style.justifyContent) {
      case 0:
        break;
      case 1:
        ee += de / 2;
        break;
      case 2:
        ee += de;
        break;
      case 3:
        if (X > 1) ae += max / (X - 1);
        break;
      case 4:
        if (X > 0) ((ae += max / X), (ee += max / X / 2));
        break;
      case 5:
        if (X > 0) ((ae += max / (X + 1)), (ee += max / (X + 1)));
        break;
    }
  let ue = ee;
  for (let ce = 0; ce < X; ce++) {
    let pe = line[ce],
      { style: style, layout: layout } = pe,
      fe = pe._sz[SZ_MAIN],
      margin = style.margin,
      margin_2 = layout.margin,
      Fe = !1,
      Ne = !1,
      Ce = !1,
      Te = !1,
      Ae,
      Pe,
      Ze,
      it;
    if (pe._hasAutoMargin)
      ((Fe = isMarginAuto(margin, q)),
        (Ne = isMarginAuto(margin, Y)),
        (Ce = isMarginAuto(margin, J)),
        (Te = isMarginAuto(margin, V)),
        (Ae = Fe ? ye : margin_2[q]),
        (Pe = Ne ? ye : margin_2[Y]),
        (Ze = Ce ? 0 : margin_2[J]),
        (it = Te ? 0 : margin_2[V]));
    else ((Ae = margin_2[q]), (Pe = margin_2[Y]), (Ze = margin_2[J]), (it = margin_2[V]));
    let Pn = isReverse ? containerMain - (ue + Ae) - fe : ue + Ae,
      alignSelf = style.alignSelf,
      Xt = alignSelf === 0 ? alignItems : alignSelf,
      st = crossOffset + Ze,
      At = lineCrossSize - pe._sz[SZ_CROSS] - Ze - it;
    if (Ce && Te) st += Math.max(0, At) / 2;
    else if (Ce) st += Math.max(0, At);
    else if (Te);
    else
      switch (Xt) {
        case 1:
        case 4:
          if (isWrapReverse) st += At;
          break;
        case 2:
          st += At / 2;
          break;
        case 3:
          if (!isWrapReverse) st += At;
          break;
        case 5:
          if (isBaseline) st = crossOffset + lineBaseline - calculateBaseline(pe);
          break;
        default:
          break;
      }
    let bn = pe.measureFunc !== null,
      Ot = isMainRow ? Pn : st,
      Ie = isMainRow ? st : Pn,
      Ht = bn ? Math.floor(Ot) : roundToInt(Ot),
      lt = bn ? Math.floor(Ie) : roundToInt(Ie);
    if (pe._hasPosition) applyRelativePosition(pe, _, U, layout, Ht, lt);
    else ((layout.left = Ht), (layout.top = lt));
    ue += fe + Ae + Pe + ae;
  }
}
/**
 * flex-wrap 断行：按 clamp 后的 basis + 外边距 + gap 累加，超出可用主轴长度就换行；记录每个子节点的 _lineIndex。
 */
//@ chunk-bzr73sfg.js:164533-164793 layout
function breakIntoLines(children, availMain, isMainRow, flexDirection, ownerW, ownerH, gap) {
  let lines = [],
    A = children.length,
    lineStart = 0,
    lineLength = 0;
  for (let _ = 0; _ < A; _++) {
    let U = children[_],
      L = boundAxis(U.style, isMainRow, U._sz[SZ_FLEX_BASIS], ownerW, ownerH),
      P = Math.max(0, L) + childMarginForAxis(U, flexDirection, ownerW),
      z = _ > lineStart ? gap : 0;
    if (_ > lineStart && lineLength + z + P > availMain)
      (lines.push(children.slice(lineStart, _)), (lineStart = _), (lineLength = P));
    else lineLength += z + P;
    U._lineIndex = lines.length;
  }
  return (lines.push(children.slice(lineStart)), lines);
}
/**
 * baseline 对齐时计算一行的基线（最大上伸，写入 baselines[lineIndex]）与所需行高（上伸+下伸），返回不小于原行高的值。
 */
//@ chunk-bzr73sfg.js:164793-165032 fingerprint = commitCacheOutputs (0.633)
function computeLineBaseline(node, line, ownerW, baselines, lineIndex, lineCross) {
  let E = 0,
    T = 0;
  for (let D = 0, O = line.length; D < O; D++) {
    let _ = line[D];
    if (resolveChildAlign(node, _) !== 5) continue;
    let margin = _.style.margin,
      L = resolveEdge(margin, EDGE_TOP, ownerW),
      P = resolveEdge(margin, EDGE_BOTTOM, ownerW),
      z = calculateBaseline(_) + L,
      G = _.layout.height + L + P - z;
    if (z > E) E = z;
    if (G > T) T = G;
  }
  baselines[lineIndex] = E;
  let A = E + T;
  return A > lineCross ? A : lineCross;
}
/**
 * alignContent：center/flex-end 设起始偏移，stretch 把剩余空间按整数均分到各行，space-between/around/evenly 设行间距（写入 alignContentLeadOffset/Between）。
 */
//@ chunk-bzr73sfg.js:165032-165355 layout
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
        let g = 0,
          E = 0;
        for (let T = 0; T < lineCount; T++) {
          g += max / lineCount;
          let A = roundToInt(g);
          ((lineSizes[T] += A - E), (E = A));
        }
      }
      break;
    case 6:
      if (lineCount > 1) alignContentBetween = max / (lineCount - 1);
      break;
    case 7:
      if (lineCount > 0)
        ((alignContentBetween = max / lineCount), (alignContentLeadOffset = alignContentBetween / 2));
      break;
    case 8:
      if (lineCount > 0)
        ((alignContentBetween = max / (lineCount + 1)), (alignContentLeadOffset = alignContentBetween));
      break;
    default:
      break;
  }
}
/**
 * stretch 对齐：交叉轴尺寸未定且无 auto margin 的子节点重新以 EXACTLY 布局到行的交叉轴尺寸。
 */
//@ chunk-bzr73sfg.js:165355-165708 layout
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
  for (let O = 0, _ = line.length; O < _; O++) {
    let U = line[O],
      style = U.style,
      alignSelf = style.alignSelf;
    if ((alignSelf === 0 ? alignItems : alignSelf) !== 4) continue;
    if (isDefined(resolveValue(isMainRow ? style.height : style.width, isMainRow ? ownerH : ownerW)))
      continue;
    if (U._hasAutoMargin) {
      let margin = style.margin;
      if (isMarginAuto(margin, crossLeadEdge) || isMarginAuto(margin, crossTrailEdge)) continue;
    }
    let X = childMarginForAxis(U, crossDir, ownerW),
      max = Math.max(0, lineCrossSize - X);
    if (U._sz[SZ_CROSS] !== max) {
      let q = U._sz[SZ_MAIN];
      (layoutNode(
        U,
        isMainRow ? q : max,
        isMainRow ? max : q,
        1,
        1,
        ownerW,
        ownerH,
        performLayout,
        isMainRow,
        !isMainRow,
      ),
        (U._sz[SZ_CROSS] = max));
    }
  }
}
//@ chunk-bzr73sfg.js:165708-165887 layout
function applyRelativePosition(node, ownerW, ownerH, layout, left, top) {
  let position = node.style.position,
    T = resolveValue(resolveEdgeRaw(position, EDGE_LEFT), ownerW),
    A = resolveValue(resolveEdgeRaw(position, EDGE_RIGHT), ownerW),
    D = resolveValue(resolveEdgeRaw(position, EDGE_TOP), ownerH),
    O = resolveValue(resolveEdgeRaw(position, EDGE_BOTTOM), ownerH),
    _ = isDefined(T) ? T : isDefined(A) ? -A : 0,
    U = isDefined(D) ? D : isDefined(O) ? -O : 0;
  ((layout.left = left + _), (layout.top = top + U));
}
/**
 * 布局绝对定位子节点：左右/上下都给定时由此推出宽高；以 EXACTLY/UNDEFINED 布局后，按 position 偏移或父节点的 justifyContent/alignItems（考虑反向与 wrap-reverse）定位。
 */
//@ chunk-bzr73sfg.js:165887-166915 fingerprint = layoutAbsoluteChild (0.944)
function layoutAbsoluteChild(parent, child, parentWidth, parentHeight, pad, bor) {
  let cs = child.style,
    posLeft = resolveEdgeRaw(cs.position, EDGE_LEFT),
    posRight = resolveEdgeRaw(cs.position, EDGE_RIGHT),
    posTop = resolveEdgeRaw(cs.position, EDGE_TOP),
    posBottom = resolveEdgeRaw(cs.position, EDGE_BOTTOM),
    rLeft = resolveValue(posLeft, parentWidth),
    rRight = resolveValue(posRight, parentWidth),
    rTop = resolveValue(posTop, parentHeight),
    rBottom = resolveValue(posBottom, parentHeight),
    z = parentWidth - bor[0] - bor[2],
    G = parentHeight - bor[1] - bor[3],
    cw = resolveValue(cs.width, z),
    ch = resolveValue(cs.height, G);
  if (!isDefined(cw) && isDefined(rLeft) && isDefined(rRight)) cw = z - rLeft - rRight;
  if (!isDefined(ch) && isDefined(rTop) && isDefined(rBottom)) ch = G - rTop - rBottom;
  layoutNode(child, cw, ch, isDefined(cw) ? 1 : 0, isDefined(ch) ? 1 : 0, z, G, !0, !1, !1);
  let mL = resolveEdge(cs.margin, EDGE_LEFT, parentWidth),
    mT = resolveEdge(cs.margin, EDGE_TOP, parentWidth),
    mR = resolveEdge(cs.margin, EDGE_RIGHT, parentWidth),
    mB = resolveEdge(cs.margin, EDGE_BOTTOM, parentWidth),
    style = parent.style,
    mainAxis = style.flexDirection,
    reversed = isReverse(mainAxis),
    mainRow = isRow(mainAxis),
    se = style.flexWrap === 2,
    justifyContent = style.justifyContent,
    alignSelf = cs.alignSelf,
    alignment = alignSelf === 0 ? style.alignItems : alignSelf,
    layout = child.layout,
    { width: width, height: height } = layout,
    fe;
  if (isDefined(rLeft)) fe = bor[0] + rLeft + mL;
  else if (isDefined(rRight)) fe = parentWidth - bor[2] - rRight - width - mR;
  else if (mainRow) {
    let Fe = pad[0] + bor[0],
      Ne = parentWidth - pad[2] - bor[2];
    fe = reversed ? Ne - width - mR : justifyAbsolute(justifyContent, Fe, Ne, width) + mL;
  } else fe = alignAbsolute(alignment, pad[0] + bor[0], parentWidth - pad[2] - bor[2], width, se) + mL;
  let ge;
  if (isDefined(rTop)) ge = bor[1] + rTop + mT;
  else if (isDefined(rBottom)) ge = parentHeight - bor[3] - rBottom - height - mB;
  else if (mainRow)
    ge = alignAbsolute(alignment, pad[1] + bor[1], parentHeight - pad[3] - bor[3], height, se) + mT;
  else {
    let Fe = pad[1] + bor[1],
      Ne = parentHeight - pad[3] - bor[3];
    ge = reversed ? Ne - height - mB : justifyAbsolute(justifyContent, Fe, Ne, height) + mT;
  }
  let we = child.measureFunc !== null;
  ((layout.left = we ? Math.floor(fe) : roundToInt(fe)), (layout.top = we ? Math.floor(ge) : roundToInt(ge)));
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
var FB_VALUE = 0,
  FB_OWNER_W = 1,
  FB_OWNER_H = 2,
  FB_AVAIL_W = 3,
  FB_AVAIL_H = 4;
/**
 * 带缓存地计算子节点 flex basis（同一代或未脏且键相同则复用 _fb）。
 */
//@ chunk-bzr73sfg.js:167142-167542 layout
function cachedFlexBasis(child, flexDirection, availW, availH, crossMode, ownerW, ownerH) {
  let _fb = child._fb,
    generation = child.config.generation,
    D = child._readsOwnerWidth ? toInt32Key(ownerW) : INT32_NAN,
    O = child._readsOwnerHeight ? toInt32Key(ownerH) : INT32_NAN,
    _ = toInt32Key(availW),
    U = toInt32Key(availH),
    isMainRow = isRow(flexDirection);
  if (
    (child._fbGen === generation || !child.isDirty_) &&
    child._fbCrossMode === crossMode &&
    child._fbIsRow === isMainRow &&
    _fb[FB_OWNER_W] === D &&
    _fb[FB_OWNER_H] === O &&
    _fb[FB_AVAIL_W] === _ &&
    _fb[FB_AVAIL_H] === U
  )
    return _fb[FB_VALUE];
  let P = isMainRow
    ? computeFlexBasis(child, availW, availH, crossMode, ownerW, ownerH)
    : computeColumnFlexBasis(child, availW, availH, crossMode, ownerW, ownerH);
  return (
    (_fb[FB_VALUE] = P),
    (_fb[FB_OWNER_W] = D),
    (_fb[FB_OWNER_H] = O),
    (_fb[FB_AVAIL_W] = _),
    (_fb[FB_AVAIL_H] = U),
    (child._fbCrossMode = crossMode),
    (child._fbIsRow = isMainRow),
    (child._fbGen = generation),
    P
  );
}
/**
 * 行方向 flex basis：flexBasis → width → 以内容测量（交叉轴约束按 stretch 决定 EXACTLY 或 AT_MOST，子树有测量函数时主轴给 AT_MOST）。
 */
//@ chunk-bzr73sfg.js:167542-167858 fingerprint = computeFlexBasis (0.65)
function computeFlexBasis(child, availW, availH, crossMode, ownerW, ownerH) {
  let cs = child.style,
    basis = resolveValue(cs.flexBasis, availW);
  if (basis === basis) return basis > 0 ? basis : 0;
  let resolved = resolveValue(cs.width, ownerW);
  if (resolved === resolved) return resolved > 0 ? resolved : 0;
  let crossConstraint = resolveValue(cs.height, ownerH),
    O;
  if (crossConstraint === crossConstraint) O = 1;
  else if (availH === availH)
    ((crossConstraint = availH - childMarginForAxis(child, 0, ownerW)),
      (O = crossMode === 1 && isStretchAlign(child) ? 1 : 2));
  else O = 0;
  let mainConstraint = NaN,
    U = 0;
  if (availW === availW && hasMeasureFuncInSubtree(child))
    ((mainConstraint = availW - childMarginForAxis(child, 2, ownerW)), (U = 2));
  return (
    layoutNode(child, mainConstraint, crossConstraint, U, O, ownerW, ownerH, !1, !1, !1),
    child.layout.width
  );
}
/**
 * 列方向 flex basis：flexBasis → height → 以宽度约束测量内容高度。
 */
//@ chunk-bzr73sfg.js:167858-168129 layout
function computeColumnFlexBasis(child, availH, availW, crossMode, ownerW, ownerH) {
  let style = child.style,
    T = resolveValue(style.flexBasis, availH);
  if (T === T) return T > 0 ? T : 0;
  let A = resolveValue(style.height, ownerH);
  if (A === A) return A > 0 ? A : 0;
  let D = resolveValue(style.width, ownerW),
    O;
  if (D === D) O = 1;
  else if (availW === availW)
    ((D = availW - childMarginForAxis(child, 2, ownerW)),
      (O = crossMode === 1 && isStretchAlign(child) ? 1 : 2));
  else O = 0;
  return (layoutNode(child, D, NaN, O, 0, ownerW, ownerH, !1, !1, !1), child.layout.height);
}
/**
 * 子树中是否有带测量函数的节点（决定 basis 计算时是否给主轴上限）。
 */
//@ chunk-bzr73sfg.js:168129-168248 fingerprint = hasMeasureFuncInSubtree (1)
function hasMeasureFuncInSubtree(node) {
  if (node.measureFunc) return !0;
  let children = node.children;
  for (let f = 0, m = children.length; f < m; f++) if (hasMeasureFuncInSubtree(children[f])) return !0;
  return !1;
}
//@ chunk-bzr73sfg.js:168248-168321 layout
var frozenBits = new Int32Array(8),
  unclampedSizes = new Float64Array(64),
  clampedSizes = new Float64Array(64);
//@ chunk-bzr73sfg.js:168321-168358 layout
function isFrozen(index) {
  return frozenBits[index >>> 5] & (1 << index);
}
//@ chunk-bzr73sfg.js:168358-168389 layout
function freeze(index) {
  frozenBits[index >>> 5] |= 1 << index;
}
/**
 * 弹性长度分配（CSS flexbox 的冻结迭代算法）：按 grow/shrink 系数分配剩余空间，被 min/max 夹住的项冻结后重新分配，直到不再变化；grow/shrink 系数和小于 1 时只分配相应比例；最后用累计取整把尺寸写进 _sz（避免舍入误差累积）。
 */
//@ chunk-bzr73sfg.js:168389-169514 fingerprint = resolveFlexibleLengths (0.852)
function resolveFlexibleLengths(children, availableInnerMain, totalFlexBasis, isMainRow, ownerW, ownerH) {
  let E = children.length,
    T = (E + 31) >>> 5;
  if (T > frozenBits.length) frozenBits = new Int32Array(T * 2);
  if (E > unclampedSizes.length)
    ((unclampedSizes = new Float64Array(E * 2)), (clampedSizes = new Float64Array(E * 2)));
  let A = unclampedSizes,
    D = clampedSizes;
  frozenBits.fill(0, 0, T);
  let initialFree = isDefined(availableInnerMain) ? availableInnerMain - totalFlexBasis : 0;
  for (let L = 0; L < E; L++) {
    let P = children[L],
      style = P.style,
      G = P._sz[SZ_FLEX_BASIS],
      clamped = boundAxis(style, isMainRow, G, ownerW, ownerH);
    if (!isDefined(availableInnerMain) || (initialFree >= 0 ? style.flexGrow === 0 : style.flexShrink === 0))
      ((D[L] = Math.max(0, clamped)), freeze(L));
    else D[L] = G;
  }
  for (let L = 0; L <= E; L++) {
    let P = 0,
      z = 0,
      G = 0,
      X = 0;
    for (let J = 0; J < E; J++) {
      let V = children[J],
        ee = V._sz[SZ_FLEX_BASIS];
      if (isFrozen(J)) P += D[J] - ee;
      else {
        let style = V.style;
        ((z += style.flexGrow), (G += style.flexShrink * ee), X++);
      }
    }
    if (X === 0) break;
    let K = initialFree - P;
    if (K > 0 && z > 0 && z < 1) {
      let J = initialFree * z;
      if (J < K) K = J;
    } else if (K < 0 && G > 0) {
      let J = 0;
      for (let V = 0; V < E; V++) if (!isFrozen(V)) J += children[V].style.flexShrink;
      if (J < 1) {
        let V = initialFree * J;
        if (V > K) K = V;
      }
    }
    let q = 0;
    for (let J = 0; J < E; J++) {
      if (isFrozen(J)) continue;
      let V = children[J],
        style = V.style,
        ae = V._sz[SZ_FLEX_BASIS],
        ne = ae;
      if (K > 0 && z > 0) ne += (K * style.flexGrow) / z;
      else if (K < 0 && G > 0) ne += (K * (style.flexShrink * ae)) / G;
      A[J] = ne;
      let clamped = Math.max(0, boundAxis(style, isMainRow, ne, ownerW, ownerH));
      ((D[J] = clamped), (q += clamped - ne));
    }
    if (q === 0) break;
    let Y = !1;
    for (let J = 0; J < E; J++) {
      if (isFrozen(J)) continue;
      let V = D[J] - A[J];
      if ((q > 0 && V > 0) || (q < 0 && V < 0)) (freeze(J), (Y = !0));
    }
    if (!Y) break;
  }
  let _ = 0,
    U = 0;
  for (let L = 0; L < E; L++) {
    _ += D[L];
    let P = (_ + 0.5) | 0;
    ((children[L]._sz[SZ_MAIN] = P - U), (U = P));
  }
}
/**
 * 子节点在交叉轴上是否拉伸（alignSelf 为 auto 时看父节点 alignItems，4 = stretch）。
 */
//@ chunk-bzr73sfg.js:169514-169622 fingerprint = isStretchAlign (1)
function isStretchAlign(child) {
  let parent = child.parent;
  if (!parent) return !1;
  let alignSelf = child.style.alignSelf;
  return (alignSelf === 0 ? parent.style.alignItems : alignSelf) === 4;
}
/**
 * 子节点实际交叉轴对齐：alignSelf 为 auto 时继承父节点 alignItems。
 */
//@ chunk-bzr73sfg.js:169622-169697 fingerprint = resolveChildAlign (1)
function resolveChildAlign(parent, child) {
  let alignSelf = child.style.alignSelf;
  return alignSelf === 0 ? parent.style.alignItems : alignSelf;
}
/**
 * 求节点基线：取第一行里 alignSelf=baseline 或标记为参考基线的子节点（否则第一个流内子节点）递归求基线加其 top；没有子节点时用自身高度。
 */
//@ chunk-bzr73sfg.js:169697-170006 fingerprint = calculateBaseline (0.933)
function calculateBaseline(node) {
  let children = node.children,
    f = children.length,
    m = -1;
  for (let g = 0; g < f; g++) {
    let E = children[g];
    if (E._lineIndex > 0) break;
    let style = E.style;
    if (style.positionType === 2) continue;
    if (style.display === 1) continue;
    if (resolveChildAlign(node, E) === 5 || E.isReferenceBaseline_) {
      m = g;
      break;
    }
    if (m === -1) m = g;
  }
  if (m === -1) return node.layout.height;
  let p = children[m];
  return calculateBaseline(p) + p.layout.top;
}
/**
 * 行方向容器且 alignItems 或某个子节点 alignSelf 为 baseline 时需要基线布局。
 */
//@ chunk-bzr73sfg.js:170006-170176 fingerprint = isBaselineLayout (1)
function isBaselineLayout(node, flowChildren) {
  let style = node.style;
  if (!isRow(style.flexDirection)) return !1;
  if (style.alignItems === 5) return !0;
  for (let m = 0, p = flowChildren.length; m < p; m++) if (flowChildren[m].style.alignSelf === 5) return !0;
  return !1;
}
/**
 * 子节点在某轴上的前后外边距之和（没有外边距时快速返回 0）。
 */
//@ chunk-bzr73sfg.js:170176-170285 fingerprint = childMarginForAxis (1)
function childMarginForAxis(child, axis, ownerWidth) {
  if (!child._hasMargin) return 0;
  let margin = child.style.margin,
    lead = resolveEdge(margin, leadingEdge(axis), ownerWidth),
    trail = resolveEdge(margin, trailingEdge(axis), ownerWidth);
  return lead + trail;
}
/**
 * 解析 gap：指定方向未设置时退回 gap[all]，负值按 0。
 */
//@ chunk-bzr73sfg.js:170285-170387 fingerprint = resolveGap (0.686)
function resolveGap(style, gutter, ownerSize) {
  let gap = style.gap,
    p = gap[gutter];
  if (p.unit === 0) p = gap[2];
  let g = resolveValue(p, ownerSize);
  return isDefined(g) ? Math.max(0, g) : 0;
}
/**
 * 按 min/max 宽（或高）约束一个值（百分比按父尺寸）。
 */
//@ chunk-bzr73sfg.js:170387-170592 fingerprint = boundAxis (1)
function boundAxis(style, isWidth, value, ownerWidth, ownerHeight) {
  let g = isWidth ? style.minWidth : style.minHeight,
    E = isWidth ? style.maxWidth : style.maxHeight,
    minU = g.unit,
    maxU = E.unit;
  if (minU === 0 && maxU === 0) return value;
  let D = minU === 1 || minU === 2 ? g.value : 0,
    O = maxU === 1 || maxU === 2 ? E.value : 0;
  return clampMinMax(value, minU, maxU, D, O, isWidth ? ownerWidth : ownerHeight);
}
//@ chunk-bzr73sfg.js:170592-170778 layout
function clampMinMax(value, minUnit, maxUnit, minValue, maxValue, ownerSize) {
  let E = value;
  if (maxUnit === 1) {
    if (E > maxValue) E = maxValue;
  } else if (maxUnit === 2) {
    let T = (maxValue * ownerSize) / 100;
    if (isInt32Finite(T) && E > T) E = roundToInt(T);
  }
  if (minUnit === 1) {
    if (E < minValue) E = minValue;
  } else if (minUnit === 2) {
    let T = (minValue * ownerSize) / 100;
    if (isInt32Finite(T) && E < T) E = roundToInt(T);
  }
  return E;
}
//@ chunk-bzr73sfg.js:170778-170831 layout
function zeroLayout(layout) {
  ((layout.left = 0), (layout.top = 0), (layout.width = 0), (layout.height = 0));
}
/**
 * 把节点的布局清零并标脏（display:none 子树用）。
 */
//@ chunk-bzr73sfg.js:170831-170895 fingerprint = zeroLayoutRecursive (0.794)
function zeroLayoutRecursive(node) {
  (zeroLayout(node.layout), (node.isDirty_ = !0), (node._hasL = !1), (node._hasM = !1));
}
//@ chunk-bzr73sfg.js:170895-170983 layout
function zeroChildrenLayout(node) {
  let children = node.children;
  for (let f = 0, m = children.length; f < m; f++) {
    let p = children[f];
    (zeroLayoutRecursive(p), zeroChildrenLayout(p));
  }
}
/**
 * 收集参与布局的子节点：display:none 的清零跳过；display:contents（2）的展开其子节点；绝对定位进 abs，其余进 flow。
 */
//@ chunk-bzr73sfg.js:170983-171202 fingerprint = collectLayoutChildren (0.679)
function collectLayoutChildren(node, flow, abs) {
  let children = node.children;
  for (let p = 0, g = children.length; p < g; p++) {
    let E = children[p],
      style = E.style,
      disp = style.display;
    if (disp === 1) (zeroLayout(E.layout), zeroChildrenLayout(E));
    else if (disp === 2) (zeroLayout(E.layout), collectLayoutChildren(E, flow, abs));
    else if (style.positionType === 2) abs.push(E);
    else flow.push(E);
  }
}
/**
 * 递归把布局结果截断为整数（|0）。
 */
//@ chunk-bzr73sfg.js:171202-171357 fingerprint = roundLayout (0.847)
function roundLayout(n) {
  let layout = n.layout;
  ((layout.left = layout.left | 0),
    (layout.top = layout.top | 0),
    (layout.width = layout.width | 0),
    (layout.height = layout.height | 0));
  let children = n.children;
  for (let m = 0, p = children.length; m < p; m++) roundLayout(children[m]);
}
/**
 * 把样式值（undefined/auto/数字/"50%"/数字字符串）解析成 yoga Value。
 */
//@ chunk-bzr73sfg.js:171357-171629 fingerprint = parseDimension (1)
function parseDimension(v) {
  if (v === void 0) return UNDEFINED_VALUE;
  if (v === "auto") return AUTO_VALUE;
  if (typeof v === "number") return Number.isFinite(v) ? pointValue(v) : UNDEFINED_VALUE;
  if (typeof v === "string" && v.endsWith("%")) {
    let f = parseFloat(v);
    return Number.isFinite(f) ? percentValue(f) : UNDEFINED_VALUE;
  }
  let u = parseFloat(v);
  return Number.isFinite(u) ? pointValue(u) : UNDEFINED_VALUE;
}
/**
 * Edge 枚举 → 物理边下标（Start→左、End→右）。
 */
//@ chunk-bzr73sfg.js:171629-171755 layout
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
/**
 * 对外的 yoga 实例：Config.create、Node.create/createDefault/createWithConfig（与 yoga-layout 包接口一致，destroy 为空）。
 */
//@ chunk-bzr73sfg.js:171755-171893 fingerprint = YOGA_INSTANCE (1)
var YOGA_INSTANCE = {
  Config: { create: createConfig, destroy() {} },
  Node: {
    create: (n) => new Node(n),
    createDefault: () => new Node(),
    createWithConfig: (n) => new Node(n),
    destroy() {},
  },
};

export { YOGA_INSTANCE, getYogaCounters };
