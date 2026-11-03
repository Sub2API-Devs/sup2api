/**
 * ink/render-node-to-output.ts
 *
 * 并入已有模块：节点渲染到输出的补充。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/render-node-to-output.ts
 * pieces: chunk-bzr73sfg.js (47)
 * attribution: fingerprint 11, placement 6, layout 18, file-local 1, sole-consumer 10, shared-adjacent 1
 */
import { walkTabbable } from "./focus.js";
import { ESC } from "./termio/ansi.js";
import { applyTextStyles } from "./colorize.js";
import { SoftWrapKind } from "./screen.js";
import { tokenizeAll } from "./termio/tokenize.js";
import { wrapText } from "./wrap-text.js";
import { widestLine, recordScrollOut } from "./widest-line.js";
import { md, regExp_2 } from "./layout/node.js";
import { indentString } from "../../vendor/indent-string/index.js";
import { rewriteRawAnsiBackground, truncateStyledText } from "./render-to-screen-reader.js";
import { bunStringWidth } from "./stringWidth.js";
import {
  MAX_TREE_DEPTH,
  reportTreeDepthExceeded,
  setUnpaintedLayout,
  shiftCachedLayouts,
  pushOrCreate,
  HARD_BREAK_ONLY,
  clearShiftedFlags,
} from "./hit-test.js";
import { squashTextNodesToSegments } from "./squash-text-nodes.js";
import { getMaxWidthAlias } from "./get-max-width.js";
import { renderBorderAlias } from "./render-border.js";
import { logForDebugging } from "../utils/debug.js";
import { b9 } from "./terminal.js";
import { isDegenerateBorderBox, isDOMElement } from "./dom.js";
import { intersectClip, isClipRedundant } from "./output.js";

/**
 * textWrap 是否是折行类（wrap、wrap-trim、wrap-stream），而不是截断类。
 */
//@ chunk-bzr73sfg.js:182062-182131 fingerprint = wrapWithSoftWrap (0.607)
function isSoftWrapMode(textWrap) {
  return textWrap === "wrap" || textWrap === "wrap-trim" || textWrap === "wrap-stream";
}
/**
 * 按文档顺序收集子树里所有可 Tab 聚焦的元素。
 */
//@ chunk-bzr73sfg.js:193777-193818 placement
function collectTabbable(root) {
  let result = [];
  return (walkTabbable(root, result), result);
}
//@ chunk-bzr73sfg.js:292494-292609 placement
function hasAbsoluteAncestor(node) {
  for (let parentNode = node.parentNode; parentNode !== void 0; parentNode = parentNode.parentNode)
    if (parentNode.style.position === "absolute") return !0;
  return !1;
}
//@ chunk-bzr73sfg.js:292609-292898 placement
function makeAbsoluteRect(node, rect, parentX, parentY) {
  let p = node.parentNode?.yogaNode,
    withinParent =
      p !== void 0 &&
      !hasAbsoluteAncestor(node) &&
      parentX !== void 0 &&
      parentY !== void 0 &&
      rect.x >= parentX &&
      rect.y >= parentY &&
      rect.x + rect.width <= parentX + p.getComputedWidth() &&
      rect.y + rect.height <= parentY + p.getComputedHeight();
  return {
    node: node,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    withinParent: withinParent,
    escapes: node.paintsPastRect === !0,
  };
}
/**
 * 一次渲染遍历的共享状态：是否有覆盖层、布局是否移动、滚动提示（DECSTBM）、待继续排水的滚动节点、跟随滚动信息、绝对定位矩形（上一帧/本帧）、片段映射与原始 ANSI 背景改写缓存。
 */
//@ chunk-bzr73sfg.js:292898-293138 placement
function createRenderState() {
  return {
    overlayActive: !1,
    layoutShifted: !1,
    scrollHint: null,
    scrollDrainNode: null,
    followScroll: null,
    absolutePaintCut: !1,
    absoluteRectsPrev: [],
    absoluteRectsCur: [],
    segmentMapScratch: new Uint32Array(0),
    rawBgRewriteCache: new WeakMap(),
  };
}
//@ chunk-bzr73sfg.js:293138-293335 placement
function resetRenderState(state) {
  ((state.overlayActive = !1),
    (state.layoutShifted = !1),
    (state.scrollHint = null),
    (state.scrollDrainNode = null),
    (state.followScroll = null),
    (state.absolutePaintCut = !1),
    (state.absoluteRectsPrev = state.absoluteRectsCur),
    (state.absoluteRectsCur = []));
}
/**
 * 上一帧越出父框的绝对定位矩形本帧没再出现、却被本帧的 blit 覆盖到了（可能拷回旧图像），需要下一帧整树重画。
 */
//@ chunk-bzr73sfg.js:293335-293523 placement
function hasStaleAbsolutePaint(state, output) {
  let absoluteRectsCur = state.absoluteRectsCur;
  return state.absoluteRectsPrev.some(
    (m) =>
      !m.withinParent &&
      !absoluteRectsCur.some(
        (p) => p.x === m.x && p.y === m.y && p.width === m.width && p.height === m.height,
      ) &&
      output.blitsOver(m),
  );
}
//@ chunk-bzr73sfg.js:293523-293616 layout
function isDescendantOfNode(node, ancestor) {
  for (let parentNode = node.parentNode; parentNode !== void 0; parentNode = parentNode.parentNode)
    if (parentNode === ancestor) return !0;
  return !1;
}
//@ chunk-bzr73sfg.js:293616-293652 layout
var PROPORTIONAL_DRAIN_MIN = 4,
  ADAPTIVE_INSTANT_MAX = 5,
  ADAPTIVE_SLOW_MAX = 12,
  ADAPTIVE_STEP_MEDIUM = 2,
  ADAPTIVE_STEP_LARGE = 3,
  ADAPTIVE_BACKLOG_MAX = 30;
/**
 * 自适应滚动排水：待滚量 ≤5 一次滚完，<12 每帧 2 行，否则每帧 3 行；超过 30 的积压直接跳过；单帧不超过视口高-1，剩余写回 pendingScrollDelta。
 */
//@ chunk-bzr73sfg.js:293652-293906 fingerprint = drainAdaptive (1)
function drainAdaptive(node, pending, innerHeight) {
  let m = pending > 0 ? 1 : -1,
    abs = Math.abs(pending),
    applied = 0;
  if (abs > ADAPTIVE_BACKLOG_MAX)
    ((applied += m * (abs - ADAPTIVE_BACKLOG_MAX)), (abs = ADAPTIVE_BACKLOG_MAX));
  let E =
    abs <= ADAPTIVE_INSTANT_MAX ? abs : abs < ADAPTIVE_SLOW_MAX ? ADAPTIVE_STEP_MEDIUM : ADAPTIVE_STEP_LARGE;
  applied += m * E;
  let T = abs - E,
    cap = Math.max(1, innerHeight - 1),
    totalAbs = Math.abs(applied);
  if (totalAbs > cap) {
    let O = totalAbs - cap;
    return ((node.pendingScrollDelta = m * (T + O)), m * cap);
  }
  return ((node.pendingScrollDelta = T > 0 ? m * T : void 0), applied);
}
/**
 * 比例滚动排水：每帧滚动待滚量的 3/4（至少 4 行，不超过视口高-1），剩余写回 pendingScrollDelta。由设置 useAdaptiveDrain 选择用哪种。
 */
//@ chunk-bzr73sfg.js:293906-294089 layout = drainAdaptive (1)
function drainProportional(node, pending, innerHeight) {
  let abs = Math.abs(pending),
    max = Math.max(1, innerHeight - 1),
    min = Math.min(max, Math.max(PROPORTIONAL_DRAIN_MIN, (abs * 3) >> 2));
  if (abs <= min) return ((node.pendingScrollDelta = void 0), pending);
  let E = pending > 0 ? min : -min;
  return ((node.pendingScrollDelta = pending - E), E);
}
//@ chunk-bzr73sfg.js:294089-294114 layout
var OSC = "\x1B]",
  BEL = "\x07";
/**
 * 用 OSC 8 把文本包成超链接。
 */
//@ chunk-bzr73sfg.js:294114-294174 fingerprint = wrapWithOsc8Link (1)
function wrapWithOsc8Link(text, url) {
  return `${OSC}8;;${url}${BEL}${text}${OSC}8;;${BEL}`;
}
/**
 * 为压平的文本段建“字符下标 → 段号”表（复用 state 里的 Uint32Array），折行后据此给每个字符还原样式。
 */
//@ chunk-bzr73sfg.js:294174-294480 layout
function buildCharToSegmentIndex(state, segments) {
  let f = 0;
  for (let g = 0; g < segments.length; g++) f += segments[g].text.length;
  if (state.segmentMapScratch.length < f)
    state.segmentMapScratch = new Uint32Array(Math.max(f, state.segmentMapScratch.length * 2));
  let map = state.segmentMapScratch.subarray(0, f),
    p = 0;
  for (let g = 0; g < segments.length; g++) {
    let E = p + segments[g].text.length;
    (map.fill(g, p, E), (p = E));
  }
  return map;
}
/**
 * 把折行后的纯文本重新套上样式与超链接：按“字符→段号”表在原文本中同步推进（跳过折行吞掉的空白与 \r\n），段号变化时切出一段套 applyTextStyles，文本内自带的 ANSI 序列原样保留。
 */
//@ chunk-bzr73sfg.js:294480-295548 fingerprint = applyStylesToWrappedText (0.78)
function applyStylesToWrappedText(n, u, f, m, p = !1, g) {
  let parts = n.split(`
`),
    resultLines = [],
    A = m.includes(ESC) ? mapAnsiSequenceEnds(m) : void 0,
    D = 0;
  for (let O = 0; O < parts.length; O++) {
    let _ = parts[O];
    if (p && _.length > 0) {
      let lineStartsWithWhitespace = /\s/.test(_[0]);
      if (D < m.length && /\s/.test(m[D]) && !lineStartsWithWhitespace)
        while (D < m.length && /\s/.test(m[D])) D++;
    }
    let styledLine = "",
      L = 0,
      P = f[D] ?? 0,
      z = _.includes(ESC) ? mapAnsiSequenceEnds(_) : void 0;
    for (let K = 0; K < _.length; K++) {
      let q = z?.get(K),
        Y = 1;
      if (q !== void 0) {
        let sliced = _.slice(K, q);
        if (p) D = skipWhitespaceTo(m, D, sliced);
        if (((K = q - 1), !m.startsWith(sliced, D))) continue;
        Y = sliced.length;
      } else {
        for (let V = A?.get(D); V !== void 0; V = A?.get(D)) D = V;
        if (p && _[K] !== m[D]) D = skipWhitespaceTo(m, D, _[K]);
      }
      let J = f[D] ?? P;
      if (J !== P) {
        let V = K + 1 - Y,
          runText = _.slice(L, V),
          ae = u[P];
        if (ae) {
          let styled = applyTextStyles(runText, ae.styles);
          if (ae.hyperlink) styled = wrapWithOsc8Link(styled, ae.hyperlink);
          styledLine += styled;
        } else styledLine += runText;
        ((L = V), (P = J));
      }
      D += Y;
    }
    let runText = _.slice(L),
      X = u[P];
    if (X) {
      let styled = applyTextStyles(runText, X.styles);
      if (X.hyperlink) styled = wrapWithOsc8Link(styled, X.hyperlink);
      styledLine += styled;
    } else styledLine += runText;
    if ((resultLines.push(styledLine), D < m.length && m[D] === "\r")) D++;
    if (
      D < m.length &&
      m[D] ===
        `
`
    )
      D++;
    if (g?.[O + 1] === SoftWrapKind.ContinuationElidedSep && D < m.length && m[D] === " ") D++;
    if (p && O < parts.length - 1) {
      let K = parts[O + 1],
        q = K.length > 0 ? K[0] : null;
      while (D < m.length && /\s/.test(m[D])) {
        if (q !== null && m[D] === q) break;
        D++;
      }
    }
  }
  return resultLines.join(`
`);
}
//@ chunk-bzr73sfg.js:295548-295672 layout
function mapAnsiSequenceEnds(text) {
  let u = new Map(),
    f = 0;
  for (let m of tokenizeAll(text)) {
    let p = f + m.value.length;
    if (m.type === "sequence") u.set(f, p);
    f = p;
  }
  return u;
}
//@ chunk-bzr73sfg.js:295672-295766 file-local
function skipWhitespaceTo(n, u, f) {
  let m = u;
  while (m < n.length && /\s/.test(n[m])) m++;
  return n.startsWith(f, m) ? m : u;
}
/**
 * 折行并记录每行的软换行种类（HardBreak 原有换行 / Continuation 折出来的续行 / ContinuationElidedSep 续行吞掉了行首空格），复制选中文本时据此拼回原行；wrap-stream 丢掉最后一行（流式输出的未完成行）。
 */
//@ chunk-bzr73sfg.js:295766-296245 layout
function wrapWithSoftWrap(text, maxWidth, textWrap) {
  let isStream = textWrap === "wrap-stream";
  if (!isSoftWrapMode(textWrap)) return { wrapped: wrapText(text, maxWidth, textWrap), softWrap: void 0 };
  let p = isStream ? "wrap" : textWrap,
    parts = text.replace(
      /\r\n?/g,
      `
`,
    ).split(`
`),
    lines = [],
    softWrap = [];
  for (let A of parts) {
    let parts = wrapText(A, maxWidth, p).split(`
`);
    for (let O = 0; O < parts.length; O++) {
      if (O === 0) {
        (lines.push(parts[O]), softWrap.push(SoftWrapKind.HardBreak));
        continue;
      }
      let _ = parts[O],
        U = _.startsWith(" ") ? _.slice(1) : _,
        L = widestLine(U) > 0 ? U : _;
      (lines.push(L),
        softWrap.push(L.length < _.length ? SoftWrapKind.ContinuationElidedSep : SoftWrapKind.Continuation));
    }
  }
  if (isStream) (lines.pop(), softWrap.pop());
  return {
    wrapped: lines.join(`
`),
    softWrap: softWrap,
  };
}
/**
 * 折行；若行数与 yoga 计算的高度不一致，改用测量时实际给出的宽度（getOfferedWidth）重折，保证与布局一致。
 */
//@ chunk-bzr73sfg.js:296245-296431 layout
function wrapForYogaNode(text, maxWidth, textWrap, yogaNode) {
  let p = wrapWithSoftWrap(text, maxWidth, textWrap);
  if (p.softWrap === void 0 || p.softWrap.length === yogaNode.getComputedHeight()) return p;
  let offeredWidth = yogaNode.getOfferedWidth(maxWidth, yogaNode.getComputedHeight());
  return offeredWidth === maxWidth ? p : wrapWithSoftWrap(text, offeredWidth, textWrap);
}
//@ chunk-bzr73sfg.js:296431-296572 layout
function joinSegmentTexts(segments) {
  let mapped = segments.map((m) => m.text),
    f = md(mapped);
  if (f === void 0) return mapped.join("");
  for (let [m, p] of segments.entries()) p.text = f[m] ?? "";
  return f.join("");
}
/**
 * 按 ink-text 首个子节点的 yoga 偏移给文本加上顶部空行与左缩进（同时在软换行表前补 HardBreak）。
 */
//@ chunk-bzr73sfg.js:296572-296761 fingerprint = applyPaddingToText (0.915)
function applyPaddingToText(node, text, softWrap) {
  let yogaNode = node.childNodes[0]?.yogaNode;
  if (yogaNode) {
    let offsetX = yogaNode.getComputedLeft(),
      offsetY = yogaNode.getComputedTop();
    if (
      ((text =
        `
`.repeat(offsetY) + indentString(text, offsetX)),
      softWrap && offsetY > 0)
    )
      softWrap.unshift(...Array(offsetY).fill(SoftWrapKind.HardBreak));
  }
  return text;
}
/**
 * 把排好样式的文本写进 Output（有 textDirection 时走 writeDirected），并记录是否画出了自身矩形（paintsPastRect）。
 */
//@ chunk-bzr73sfg.js:296761-296937 layout
function writeTextNode(node, output, x, y, width, height, text, softWrap, maxWidth) {
  text = applyPaddingToText(node, text, softWrap);
  let textDirection = node.style.textDirection;
  if (textDirection === void 0) output.write(x, y, text, softWrap);
  else output.writeDirected(x, y, text, softWrap, textDirection, maxWidth);
  node.paintsPastRect = paintsPastHeight(text, y, height) || paintsPastWidth(output, text, x, width);
}
/**
 * 写 ink-raw-ansi：有继承背景色时先把原始 ANSI 里的背景重写（带缓存），记录 paintsPastRect。
 */
//@ chunk-bzr73sfg.js:296937-297037 layout
function writeRawAnsiNode(node, output, state, x, y, width, height, rawText, backgroundColor) {
  (output.write(
    x,
    y,
    backgroundColor ? rewriteRawAnsiBackground(state, node, rawText, backgroundColor) : rawText,
  ),
    (node.paintsPastRect =
      paintsPastHeight(rawText, y, height) || paintsPastWidth(output, rawText, x, width)));
}
//@ chunk-bzr73sfg.js:297037-297167 layout
function paintsPastWidth(output, text, x, width) {
  let floored = Math.floor(width);
  for (let g of text.split(`
`))
    if ((regExp_2.test(g) ? output.paintedWidth(g, x) : bunStringWidth(g)) > floored) return !0;
  return !1;
}
//@ chunk-bzr73sfg.js:297167-297298 layout
function paintsPastHeight(text, y, height) {
  let m = text === "" ? 0 : 1;
  for (
    let index = text.indexOf(`
`);
    index !== -1;
    index = text.indexOf(
      `
`,
      index + 1,
    )
  )
    m++;
  return Math.floor(y) + m > Math.ceil(y + height);
}
/**
 * 渲染一个 DOM 节点到 Output（每帧从根递归）：display:none 时清掉旧区域；未脏且位置尺寸背景都不变时直接从上一帧 blit（再补拷越界的绝对定位子孙）；否则清旧区域、处理 pendingClears，按类型绘制——ink-raw-ansi 原样写；ink-text 压平→按 textWrap 折行/截断→套样式与 OSC 8→写入；ink-box 处理 noSelect、overflow 裁剪、overflow:scroll（滚动锚点、粘底、排水、DECSTBM 滚动提示 + 只重画新露出的行）、背景/opaque、子节点、边框。最后记 cachedLayout 供下一帧比较与命中测试。
 */
//@ chunk-bzr73sfg.js:297298-304543 fingerprint = renderNodeToOutput (0.712)
function renderNodeToOutput(
  node,
  output,
  state,
  {
    offsetX: offsetX = 0,
    offsetY: offsetY = 0,
    prevScreen: prevScreen,
    clips: clips,
    skipSelfBlit: skipSelfBlit = !1,
    inheritedBackgroundColor: inheritedBackgroundColor,
    depth: depth = 0,
  },
) {
  if (depth >= MAX_TREE_DEPTH) {
    reportTreeDepthExceeded("renderNodeToOutput", node.nodeName);
    return;
  }
  let { yogaNode: yogaNode } = node;
  if (yogaNode) {
    if (yogaNode.getDisplay() === 1) {
      if (node.dirty) {
        let cachedLayout = node.cachedLayout;
        if (cachedLayout)
          (output.clear({
            x: Math.floor(cachedLayout.x),
            y: Math.floor(cachedLayout.y),
            width: Math.floor(cachedLayout.width),
            height: Math.floor(cachedLayout.height),
          }),
            dropSubtreeCache(node),
            (state.layoutShifted = !0));
      }
      ((node.hasEscapingDescendant = !1), (node.paintsPastRect = !1));
      return;
    }
    let x = offsetX + yogaNode.getComputedLeft(),
      yogaTop = yogaNode.getComputedTop(),
      y = offsetY + yogaTop,
      width = yogaNode.getComputedWidth(),
      height = yogaNode.getComputedHeight();
    if (y < 0 && node.style.position === "absolute") y = 0;
    let cachedLayout = node.cachedLayout;
    if (
      !node.dirty &&
      !skipSelfBlit &&
      node.pendingScrollDelta === void 0 &&
      cachedLayout &&
      cachedLayout.x === x &&
      cachedLayout.y === y &&
      cachedLayout.width === width &&
      cachedLayout.height === height &&
      cachedLayout.background === inheritedBackgroundColor &&
      !cachedLayout.shifted &&
      prevScreen &&
      !clipBlocksBlit(node, cachedLayout, clips)
    ) {
      let fx = Math.floor(x),
        fy = Math.floor(y),
        fw = Math.floor(width),
        fh = Math.floor(height);
      if (
        (output.blit(prevScreen, fx, fy, fw, fh, { restoreNoSelect: node.style.opaque }),
        node.style.position === "absolute")
      )
        state.absoluteRectsCur.push(makeAbsoluteRect(node, cachedLayout, offsetX, offsetY));
      blitEscapingAbsoluteDescendants(node, output, state, prevScreen, fx, fy, fw, fh);
      return;
    }
    let layoutMoved =
      cachedLayout !== void 0 &&
      ((cachedLayout.shifted && prevScreen !== void 0) ||
        cachedLayout.x !== x ||
        cachedLayout.y !== y ||
        cachedLayout.width !== width ||
        cachedLayout.height !== height);
    if (layoutMoved) state.layoutShifted = !0;
    if (cachedLayout && (node.dirty || layoutMoved))
      output.clear(
        {
          x: Math.floor(cachedLayout.x),
          y: Math.floor(cachedLayout.y),
          width: Math.floor(cachedLayout.width),
          height: Math.floor(cachedLayout.height),
        },
        node.style.position === "absolute",
      );
    let pendingClears = node.pendingClears,
      hadPendingClears = pendingClears !== void 0;
    if (hadPendingClears) {
      state.layoutShifted = !0;
      for (let rect of pendingClears)
        output.clear({
          x: Math.floor(rect.x),
          y: Math.floor(rect.y),
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        });
      node.pendingClears = void 0;
    }
    if (height === 0 && siblingSharesY(node, yogaNode)) {
      ((node.cachedLayout = {
        x: x,
        y: y,
        width: width,
        height: height,
        background: inheritedBackgroundColor,
      }),
        (node.hasEscapingDescendant = !1),
        (node.paintsPastRect = !1));
      for (let childNode of node.childNodes)
        if (childNode.nodeName !== "#text") setUnpaintedLayout(childNode, x, y);
      node.dirty = !1;
      return;
    }
    let clip;
    if (node.nodeName === "ink-raw-ansi") {
      let rawText = node.attributes.rawText;
      if (typeof rawText === "string" && rawText)
        writeRawAnsiNode(node, output, state, x, y, width, height, rawText, inheritedBackgroundColor);
    } else if (node.nodeName === "ink-text") {
      let segments = squashTextNodesToSegments(
          node,
          inheritedBackgroundColor ? { backgroundColor: inheritedBackgroundColor } : void 0,
        ),
        ee = joinSegmentTexts(segments);
      if (ee.length > 0) {
        let maxWidth = Math.min(getMaxWidthAlias(yogaNode), output.width - x),
          ne = node.style.textWrap ?? "wrap",
          de = ne === "wrap-stream" || widestLine(ee) > maxWidth,
          se,
          ye;
        if (de && segments.length === 1) {
          let ue = segments[0],
            ce = wrapForYogaNode(ee, maxWidth, ne, yogaNode);
          ((ye = ce.softWrap),
            (se = ce.wrapped
              .split(
                `
`,
              )
              .map((line) => {
                let styled = applyTextStyles(line, ue.styles);
                if (ue.hyperlink) styled = wrapWithOsc8Link(styled, ue.hyperlink);
                return styled;
              }).join(`
`)));
        } else if (de && (ne === "truncate-start" || ne === "truncate-middle" || ne === "middle"))
          se = truncateStyledText(
            ee,
            maxWidth,
            segments,
            buildCharToSegmentIndex(state, segments),
            ne === "truncate-start" ? "start" : "middle",
          );
        else if (de) {
          let ue = wrapForYogaNode(ee, maxWidth, ne, yogaNode);
          ye = ue.softWrap;
          let ce = buildCharToSegmentIndex(state, segments);
          se = applyStylesToWrappedText(ue.wrapped, segments, ce, ee, ne === "wrap-trim", ue.softWrap);
        } else
          se = segments
            .map((segment) => {
              let styledText = applyTextStyles(segment.text, segment.styles);
              if (segment.hyperlink) styledText = wrapWithOsc8Link(styledText, segment.hyperlink);
              return styledText;
            })
            .join("");
        writeTextNode(node, output, x, y, width, height, se, ye, maxWidth);
      }
    } else if (node.nodeName === "ink-box") {
      let V = node.style.backgroundColor ?? inheritedBackgroundColor;
      if (node.style.noSelect) {
        let boxX = Math.floor(x),
          ce = node.style.noSelect === "from-left-edge";
        output.noSelect({
          x: ce ? 0 : boxX,
          y: Math.floor(y),
          width: ce ? boxX + Math.floor(width) : Math.floor(width),
          height: Math.floor(height),
        });
      }
      let ee = (node.style.overflowY ?? node.style.overflow) === "scroll";
      clip = getOverflowClip(node, yogaNode, x, y);
      let ae = clip !== void 0,
        ne = clip?.y1,
        de = clip?.y2;
      if (clip) output.clip(clip);
      let se = prevScreen ? advanceClips(clips, clip, cachedLayout?.clip) : clips,
        ye = !1;
      if (ee) {
        let computedPadding = yogaNode.getComputedPadding(1),
          padTop = yogaNode.getComputedPadding(3),
          innerHeight = Math.max(0, (de ?? y + height) - (ne ?? y) - computedPadding - padTop),
          content = node.childNodes.find((childNode) => childNode.yogaNode),
          contentYoga = content?.yogaNode,
          fe = contentYoga?.getComputedHeight() ?? 0,
          ge = node.scrollHeight ?? fe,
          we = node.scrollViewportHeight ?? innerHeight;
        ((node.scrollHeight = fe), (node.scrollViewportHeight = innerHeight));
        let Fe = (ne ?? y) + computedPadding;
        node.scrollViewportTop = Fe;
        let Ne = resolveScrollTop(node, state, x, width, fe, ge, innerHeight, we, Fe);
        if (content && contentYoga) {
          let Ce = x + contentYoga.getComputedLeft(),
            Te = y + contentYoga.getComputedTop() - Ne,
            cachedLayout_2 = content.cachedLayout,
            hint = null,
            floored = Math.floor(Fe),
            it = !1;
          if (cachedLayout_2 && cachedLayout_2.y !== Te) {
            let Ie = cachedLayout_2.y - Te,
              regionTop = Math.floor(ne ?? y),
              lt = Math.floor(x) <= 0 && Math.floor(x + width) >= output.width,
              Ft = innerHeight - we;
            it = cachedLayout !== void 0 && Ft !== 0 && height - cachedLayout.height === Ft && Ie === -Ft;
            let vn = floored + (it ? Math.max(innerHeight, we) : innerHeight) - 1;
            if (
              lt &&
              cachedLayout?.y === y &&
              cachedLayout.x === x &&
              cachedLayout.width === width &&
              cachedLayout_2.x === Ce &&
              cachedLayout_2.width === contentYoga.getComputedWidth() &&
              (cachedLayout.height === height || it) &&
              innerHeight > 0 &&
              Math.abs(Ie) < (it ? Math.min(innerHeight, we) : innerHeight) &&
              padTop === 0
            )
              ((hint = { top: regionTop, bottom: vn, delta: Ie }), (state.scrollHint = hint));
            else state.layoutShifted = !0;
          }
          let scrollHeight = contentYoga.getComputedHeight(),
            qn = cachedLayout_2?.height ?? scrollHeight,
            Xt = scrollHeight - qn,
            st = !hint || Xt === 0 || (hint.delta > 0 && Xt === hint.delta),
            any = state.absoluteRectsPrev.some((Ie) => isDescendantOfNode(Ie.node, content)),
            bn =
              hint !== null &&
              content.childNodes.some(
                (childNode) =>
                  childNode.nodeName !== "#text" &&
                  childNode.paintsPastRect === !0 &&
                  childNode.cachedLayout !== void 0,
              ),
            Ot =
              prevScreen &&
              st &&
              !state.overlayActive &&
              !any &&
              cachedLayout?.background === inheritedBackgroundColor &&
              !bn &&
              clipsAllowScrollBlit(clips, cachedLayout, { x: x, y: y, width: width, height: height });
          if (hint && !Ot) state.scrollHint = null;
          if (hint && Ot) {
            let { top: top, bottom: bottom, delta: delta } = hint,
              floored_2 = Math.floor(width),
              repeat = " ".repeat(floored_2),
              Xn = state.absoluteRectsCur.length,
              ct = 0;
            if (delta > 0 && floored > top)
              for (let childNode of content.childNodes) {
                let yogaNode = childNode.yogaNode;
                if (!yogaNode) continue;
                let computedTop = yogaNode.getComputedTop();
                if (computedTop + yogaNode.getComputedHeight() > Ne) {
                  ct = Math.max(0, Math.min(floored - top, Ne - computedTop));
                  break;
                }
              }
            let Sn = floored + innerHeight - 1,
              Br = it ? floored + we - 1 : Sn,
              li = floored + Math.max(0, delta) - ct,
              min = Math.min(Br, Sn + delta);
            (output.blit(prevScreen, Math.floor(x), li, floored_2, min - li + 1, { unclipped: min > Sn }),
              output.shift(top, bottom, delta));
            let rn = delta > 0 ? min - delta + 1 : floored,
              St = delta > 0 ? Sn : floored - delta - 1,
              on,
              Qn,
              Qe = content.dirty ? new Uint8Array(bottom - top + 1) : void 0;
            for (let childNode of content.childNodes) {
              let Ve = childNode,
                cy = Ve.yogaNode;
              if (!cy) continue;
              let cachedLayout = Ve.cachedLayout,
                childTop = cy.getComputedTop(),
                childH = cy.getComputedHeight();
              if (childTop + childH <= Ne || childTop >= Ne + innerHeight) {
                dropSubtreeCache(Ve);
                continue;
              }
              if (cachedLayout) {
                let Fl =
                  Math.floor(cachedLayout.y) - delta === Math.floor(Te + childTop) &&
                  cachedLayout.height === childH;
                if ((shiftCachedLayouts(Ve, -delta), Fl && !Ve.dirty)) {
                  let Ul = Math.floor(cachedLayout.y) - top;
                  Qe?.fill(1, Math.max(Ul, 0), Math.max(Ul + childH, 0));
                  continue;
                }
              }
              if (
                childH > 0 &&
                Math.max(childTop, Ne) >= rn - Te &&
                Math.min(childTop + childH, Ne + innerHeight) <= St + 1 - Te
              )
                continue;
              if (((on = pushOrCreate(on, Ve)), !Ve.dirty)) Qn = pushOrCreate(Qn, Ve);
            }
            if (Qe) {
              for (let Ue = 0; Ue < Qe.length; Ue++)
                if (Qe[Ue] === 0) output.write(Math.floor(x), top + Ue, repeat, HARD_BREAK_ONLY);
            }
            if (rn <= St) {
              let Ue = delta < 0 ? top : rn;
              (output.clear({ x: Math.floor(x), y: Ue, width: floored_2, height: St - Ue + 1 }),
                output.clip({ x1: void 0, x2: void 0, y1: Ue, y2: St + 1 }),
                renderScrolledChildren(
                  content,
                  output,
                  state,
                  Ce,
                  Te,
                  hadPendingClears,
                  void 0,
                  void 0,
                  rn - Te,
                  St + 1 - Te,
                  V,
                  depth + 2,
                  !0,
                ),
                output.unclip());
            }
            if (on)
              for (let Ue of on) {
                let yogaNode = Ue.yogaNode;
                if (!yogaNode) continue;
                let computedTop = yogaNode.getComputedTop(),
                  shiftedTop = Math.max(Math.floor(Te + computedTop), delta < 0 ? St + 1 : -1 / 0),
                  min = Math.min(
                    Math.floor(Te + computedTop + yogaNode.getComputedHeight()),
                    Math.floor((ne ?? y) + computedPadding + innerHeight),
                    delta > 0 ? rn : 1 / 0,
                  );
                if (shiftedTop < min) {
                  let joined = Array(min - shiftedTop).fill(repeat).join(`
`);
                  output.write(Math.floor(x), shiftedTop, joined, HARD_BREAK_ONLY);
                }
                (output.clip({ x1: void 0, x2: void 0, y1: shiftedTop, y2: Math.max(shiftedTop, min) }),
                  renderNodeToOutput(Ue, output, state, {
                    offsetX: Ce,
                    offsetY: Te,
                    prevScreen: void 0,
                    inheritedBackgroundColor: V,
                    depth: depth + 2,
                  }),
                  output.unclip());
              }
            for (let Ue of state.absoluteRectsPrev) {
              if (Ue.y >= bottom + 1 || Ue.y + Ue.height <= top) continue;
              let max = Math.max(top, Math.floor(Ue.y) - delta),
                shiftedBottom = Math.min(bottom + 1, Math.floor(Ue.y + Ue.height) - delta);
              if (max >= rn && shiftedBottom <= St + 1) continue;
              if (max >= shiftedBottom) continue;
              let joined = Array(shiftedBottom - max).fill(repeat).join(`
`);
              (output.write(Math.floor(x), max, joined, HARD_BREAK_ONLY),
                output.clip({ x1: void 0, x2: void 0, y1: max, y2: shiftedBottom }),
                renderScrolledChildren(
                  content,
                  output,
                  state,
                  Ce,
                  Te,
                  hadPendingClears,
                  void 0,
                  void 0,
                  max - Te,
                  shiftedBottom - Te,
                  V,
                  depth + 2,
                  !0,
                ),
                output.unclip());
            }
            clearShiftedFlags(Qn);
            for (let Ue = Xn; Ue < state.absoluteRectsCur.length; Ue++)
              if (!state.absoluteRectsCur[Ue].withinParent) {
                state.absolutePaintCut = !0;
                break;
              }
          } else {
            let Ie = cachedLayout_2 && cachedLayout_2.y !== Te;
            if (Ie && ne !== void 0 && de !== void 0)
              output.clear({
                x: Math.floor(x),
                y: Math.floor(ne),
                width: Math.floor(width),
                height: Math.floor(de - ne),
              });
            renderScrolledChildren(
              content,
              output,
              state,
              Ce,
              Te,
              hadPendingClears,
              Ie || layoutMoved ? void 0 : prevScreen,
              se,
              Ne,
              Ne + innerHeight,
              V,
              depth + 2,
            );
          }
          ((content.cachedLayout = {
            x: Ce,
            y: Te,
            width: contentYoga.getComputedWidth(),
            height: contentYoga.getComputedHeight(),
          }),
            (content.dirty = !1),
            (content.pendingClears = void 0));
        }
      } else {
        let ownBackgroundColor = node.style.backgroundColor;
        if (ownBackgroundColor || node.style.opaque)
          fillBoxBackground(node, yogaNode, output, x, y, width, height);
        ye = renderChildren(
          node,
          output,
          state,
          x,
          y,
          width,
          height,
          pendingClears,
          ownBackgroundColor || node.style.opaque ? void 0 : prevScreen,
          se,
          V,
          depth + 1,
        );
      }
      if (ae) output.unclip();
      ((node.hasEscapingDescendant = ae ? !1 : ye),
        renderBorderAlias(x, y, node, output, inheritedBackgroundColor));
    } else if (node.nodeName === "ink-root")
      node.hasEscapingDescendant = renderChildren(
        node,
        output,
        state,
        x,
        y,
        width,
        height,
        pendingClears,
        prevScreen,
        clips,
        inheritedBackgroundColor,
        depth + 1,
      );
    let J = { x: x, y: y, width: width, height: height, background: inheritedBackgroundColor, clip: clip };
    if (((node.cachedLayout = J), node.style.position === "absolute"))
      state.absoluteRectsCur.push(makeAbsoluteRect(node, J, offsetX, offsetY));
    node.dirty = !1;
  }
}
/**
 * 计算滚动容器本帧的 scrollTop：先处理 scrollAnchor（start/center/end/nearest）；stickyScroll 或在底部时跟随内容增长；按 useAdaptiveDrain 选择排水算法消耗 pendingScrollDelta（超出 clamp 范围时放慢）；夹到合法范围；scrollTop 变化时给 state.followScroll 记下差值（选区跟随用）。
 */
//@ chunk-bzr73sfg.js:304543-306340 layout
function resolveScrollTop(
  node,
  state,
  x,
  width,
  contentHeight,
  prevContentHeight,
  viewportHeight,
  prevViewportHeight,
  viewportTop,
) {
  let maxScroll = Math.max(0, contentHeight - viewportHeight);
  if (node.scrollAnchor) {
    let yogaNode = node.scrollAnchor.el.yogaNode;
    if (yogaNode) {
      let computedTop = yogaNode.getComputedTop(),
        ue = computedTop + node.scrollAnchor.offset,
        ce = computedTop + yogaNode.getComputedHeight() - viewportHeight;
      switch (node.scrollAnchor.block) {
        case "nearest":
          node.scrollTop = Math.min(Math.max(node.scrollTop ?? 0, ce), ue);
          break;
        case "end":
          node.scrollTop = Math.max(0, Math.min(ce, ue));
          break;
        case "center":
          node.scrollTop = Math.max(0, Math.min(Math.floor((ce + ue) / 2), ue));
          break;
        case "start":
          node.scrollTop = ue;
          break;
      }
      node.pendingScrollDelta = void 0;
    }
    node.scrollAnchor = void 0;
  }
  let prevScrollTop = node.scrollTop ?? 0,
    stickyScroll = node.attributes.stickyScroll,
    sticky = node.stickyScroll ?? Boolean(stickyScroll),
    L = sticky ? prevContentHeight : Math.max(node.scrollHeightHwm ?? 0, prevContentHeight);
  node.scrollHeightHwm = sticky ? void 0 : Math.max(L, contentHeight);
  let max = Math.max(0, L - prevViewportHeight),
    z = contentHeight >= prevContentHeight,
    G = node.attributes.followGrowth !== !1;
  if (
    (sticky || (stickyScroll !== !1 && G && z && prevScrollTop >= max)) &&
    (node.pendingScrollDelta ?? 0) >= 0
  ) {
    if (
      ((node.scrollTop = maxScroll),
      (node.pendingScrollDelta = void 0),
      node.stickyScroll === !1 && prevScrollTop >= max)
    ) {
      if (maxScroll - prevScrollTop > 3)
        logForDebugging(
          `render-node-to-output: positional follow re-enabled sticky (scrollTop=${prevScrollTop} prevMax=${max} \u2192 newMax=${maxScroll}, prevH=${prevContentHeight} \u2192 ${contentHeight})`,
        );
      node.stickyScroll = !0;
    }
  }
  let scrollTop = node.scrollTop ?? 0,
    {
      pendingScrollDelta: pendingScrollDelta,
      scrollClampMin: scrollClampMin,
      scrollClampMax: scrollClampMax,
    } = node,
    V = scrollClampMin !== void 0 && scrollClampMax !== void 0;
  if (pendingScrollDelta !== void 0 && pendingScrollDelta !== 0) {
    let ye =
        V &&
        ((pendingScrollDelta < 0 && scrollTop < scrollClampMin) ||
          (pendingScrollDelta > 0 && scrollTop > scrollClampMax))
          ? Math.min(4, viewportHeight >> 3)
          : viewportHeight,
      useAdaptiveDrain = b9().useAdaptiveDrain,
      ce = useAdaptiveDrain
        ? drainAdaptive(node, pendingScrollDelta, ye)
        : drainProportional(node, pendingScrollDelta, ye);
    ((scrollTop += ce),
      recordScrollOut(ce, node.pendingScrollDelta ?? 0, useAdaptiveDrain ? "adaptive" : "proportional"));
  } else if (pendingScrollDelta === 0) node.pendingScrollDelta = void 0;
  let max_2 = Math.max(0, Math.min(scrollTop, Math.max(maxScroll, L - viewportHeight))),
    max_3 = Math.max(0, Math.min(scrollTop, maxScroll)),
    ne = V && !sticky ? Math.max(scrollClampMin, Math.min(max_3, scrollClampMax)) : max_3;
  if (((node.scrollTop = max_2), max_2 !== scrollTop)) node.pendingScrollDelta = void 0;
  if (node.pendingScrollDelta !== void 0) state.scrollDrainNode = node;
  max_3 = ne;
  let de = max_3 - (node.scrollTopRendered ?? max_3);
  if (de !== 0)
    state.followScroll = {
      delta: de,
      viewportLeft: Math.floor(x),
      viewportRight: Math.floor(x + width) - 1,
      viewportTop: viewportTop,
      viewportBottom: viewportTop + viewportHeight - 1,
    };
  return ((node.scrollTopRendered = max_3), max_3);
}
/**
 * 给有 backgroundColor 或 opaque 的 box 在边框内填空格（带背景色）；opaque 还会清掉该区域的 noSelect。
 */
//@ chunk-bzr73sfg.js:306340-306762 layout
function fillBoxBackground(node, yogaNode, output, x, y, width, height) {
  if (node.style.opaque)
    output.clearNoSelect({
      x: Math.floor(x),
      y: Math.floor(y),
      width: Math.floor(width),
      height: Math.floor(height),
    });
  let backgroundColor = node.style.backgroundColor,
    computedBorder = yogaNode.getComputedBorder(0),
    computedBorder_2 = yogaNode.getComputedBorder(2),
    computedBorder_3 = yogaNode.getComputedBorder(1),
    computedBorder_4 = yogaNode.getComputedBorder(3),
    U = Math.floor(width) - computedBorder - computedBorder_2,
    L = Math.floor(height) - computedBorder_3 - computedBorder_4;
  if (U > 0 && L > 0) {
    let repeat = " ".repeat(U),
      z = backgroundColor ? applyTextStyles(repeat, { backgroundColor: backgroundColor }) : repeat,
      joined = Array(L).fill(z).join(`
`);
    output.write(x + computedBorder, y + computedBorder_3, joined);
  }
}
/**
 * 是否有绝对定位子节点隐藏或位置尺寸变了（则兄弟不能从上一帧 blit）。
 */
//@ chunk-bzr73sfg.js:306762-307160 layout
function absoluteChildMoved(node, x, y) {
  if (!node.hasAbsoluteDescendant) return !1;
  for (let childNode of node.childNodes) {
    let p = childNode;
    if (p.style.position !== "absolute") continue;
    let yogaNode = p.yogaNode;
    if (!yogaNode) continue;
    let cachedLayout = p.cachedLayout;
    if (!cachedLayout) continue;
    if (yogaNode.getDisplay() === 1) return !0;
    let T = x + yogaNode.getComputedLeft(),
      A = y + yogaNode.getComputedTop();
    if (A < 0) A = 0;
    if (
      cachedLayout.x !== T ||
      cachedLayout.y !== A ||
      cachedLayout.width !== yogaNode.getComputedWidth() ||
      cachedLayout.height !== yogaNode.getComputedHeight()
    )
      return !0;
  }
  return !1;
}
/**
 * 找出被后面兄弟“越界绘制”的变化区域覆盖到的前面兄弟（它们不能 blit，需要重画）。
 */
//@ chunk-bzr73sfg.js:307160-308018 layout
function collectSiblingsUnderEscapingChange(node, x, y) {
  let result,
    childNodes = node.childNodes;
  for (let g = 1; g < childNodes.length; g++) {
    let E = childNodes[g];
    if (E.hasEscapingDescendant !== !0 || E.style.position === "absolute") continue;
    let { yogaNode: yogaNode, cachedLayout: cachedLayout } = E;
    if (!yogaNode || cachedLayout === void 0) continue;
    let D = x + yogaNode.getComputedLeft(),
      O = y + yogaNode.getComputedTop();
    if (
      !E.dirty &&
      cachedLayout.x === D &&
      cachedLayout.y === O &&
      cachedLayout.width === yogaNode.getComputedWidth() &&
      cachedLayout.height === yogaNode.getComputedHeight()
    )
      continue;
    let _ = [[E, D, O]];
    for (let U = _.pop(); U !== void 0; U = _.pop()) {
      let [L, P, z] = U;
      for (let G of L.pendingClears ?? []) result = addOverlappingSiblings(childNodes, g, G, result);
      for (let childNode of L.childNodes) {
        if (childNode.nodeName === "#text") continue;
        let X = childNode,
          { cachedLayout: cachedLayout, yogaNode: yogaNode } = X;
        if (X.style.position === "absolute" || cachedLayout === void 0 || !yogaNode) continue;
        let Y = P + yogaNode.getComputedLeft(),
          J = z + yogaNode.getComputedTop();
        if (
          X.dirty ||
          cachedLayout.x !== Y ||
          cachedLayout.y !== J ||
          cachedLayout.width !== yogaNode.getComputedWidth() ||
          cachedLayout.height !== yogaNode.getComputedHeight()
        )
          result = addOverlappingSiblings(childNodes, g, cachedLayout, result);
        if (X.hasEscapingDescendant === !0) _.push([X, Y, J]);
      }
    }
  }
  return result;
}
//@ chunk-bzr73sfg.js:308018-308233 layout
function addOverlappingSiblings(siblings, beforeIndex, rect, result) {
  for (let p = 0; p < beforeIndex; p++) {
    let g = siblings[p],
      cachedLayout = g.cachedLayout;
    if (
      cachedLayout !== void 0 &&
      g.style.position !== "absolute" &&
      rect.x < cachedLayout.x + cachedLayout.width &&
      cachedLayout.x < rect.x + rect.width &&
      rect.y < cachedLayout.y + cachedLayout.height &&
      cachedLayout.y < rect.y + rect.height
    )
      ((result ??= new Set()), result.add(g));
  }
  return result;
}
/**
 * 渲染子节点：决定每个子节点能否用上一帧 blit（前面有脏的非裁剪兄弟、绝对定位子节点移动、被越界兄弟覆盖等情况不能），统计子节点是否越出父框、互相重叠、画出自身矩形，返回是否有越界子孙。
 */
//@ chunk-bzr73sfg.js:308233-309501 fingerprint = renderChildren (0.724)
function renderChildren(n, u, f, m, p, g, E, T, A, D, O, _) {
  let U = A !== void 0 && absoluteChildMoved(n, m, p),
    L = A === void 0 ? void 0 : collectSiblingsUnderEscapingChange(n, m, p),
    P = T === void 0 || A === void 0 ? void 0 : findBlittableChildren(n, m, p, T),
    z = !1,
    G = !1,
    X = !1,
    K = !1,
    q = !1,
    Y = 0,
    J = n.childrenPaintingPastRect ?? 0,
    V = 1 / 0,
    ee = 1 / 0,
    ae = -1 / 0,
    ne = -1 / 0,
    de = m + g,
    se = p + E;
  for (let childNode of n.childNodes) {
    let childElem = childNode,
      wasDirty = childElem.dirty,
      pe = childElem.style.position === "absolute";
    if (wasDirty && !pe && overlapsBounds(childElem, m, p, V, ee, ae, ne)) n.childrenOverlap = !0;
    if (
      (renderNodeToOutput(childElem, u, f, {
        offsetX: m,
        offsetY: p,
        prevScreen:
          (P !== void 0 && (!P.has(childElem) || overlapsAbsoluteRects(childElem, f))) ||
          z ||
          (U && !pe) ||
          L?.has(childElem) === !0 ||
          (G && childElem.hasEscapingDescendant === !0)
            ? void 0
            : A,
        clips: D,
        skipSelfBlit: G && pe && !childElem.style.opaque && childElem.style.backgroundColor === void 0,
        inheritedBackgroundColor: O,
        depth: _,
      }),
      wasDirty && !z)
    )
      if (!clipsBothAxes(childElem) || pe) z = !0;
      else G = !0;
    if (!X) {
      let cachedLayout = childElem.cachedLayout;
      if (
        childElem.hasEscapingDescendant ||
        (cachedLayout !== void 0 &&
          !pe &&
          (cachedLayout.x < m ||
            cachedLayout.y < p ||
            cachedLayout.x + cachedLayout.width > de ||
            cachedLayout.y + cachedLayout.height > se))
      )
        X = !0;
    }
    K ||= childElem.paintsPastRect === !0;
    let cachedLayout = childElem.cachedLayout;
    if (!pe && cachedLayout !== void 0) {
      if (childElem.paintsPastRect === !0) (Y++, (n.childrenPaintingPastRect = J + Y));
      if (
        ((q ||=
          cachedLayout.x < ae &&
          V < cachedLayout.x + cachedLayout.width &&
          cachedLayout.y < ne &&
          ee < cachedLayout.y + cachedLayout.height),
        q)
      )
        n.childrenOverlap = !0;
      if (cachedLayout.width > 0 && cachedLayout.height > 0)
        ((V = Math.min(V, cachedLayout.x)),
          (ee = Math.min(ee, cachedLayout.y)),
          (ae = Math.max(ae, cachedLayout.x + cachedLayout.width)),
          (ne = Math.max(ne, cachedLayout.y + cachedLayout.height)));
    }
  }
  return (
    (n.childrenOverlap = q),
    (n.childrenPaintingPastRect = Y),
    (n.paintsPastRect = (!clipsBothAxes(n) && (X || K)) || isDegenerateBorderBox(n, g, E)),
    X
  );
}
/**
 * 父节点有 pendingClears 时，找出仍可安全 blit 的子节点（不与被清区域、越界兄弟重叠的未脏子节点）。
 */
//@ chunk-bzr73sfg.js:309501-310867 sole-consumer
function findBlittableChildren(node, x, y, pendingClears) {
  let result = new Set(),
    g = [],
    E = node;
  for (
    let parentNode = node.parentNode;
    parentNode !== void 0;
    E = parentNode, parentNode = parentNode.parentNode
  ) {
    let z = E.style.position !== "absolute" && E.paintsPastRect === !0;
    if (parentNode.childrenOverlap !== !1 || (parentNode.childrenPaintingPastRect ?? 0) > (z ? 1 : 0))
      return result;
    if (z) g.push(E);
  }
  let T = 1 / 0;
  for (let P of pendingClears) T = Math.min(T, rowSpan(P).top);
  let filtered = node.childNodes.filter(isDOMElement),
    D = Array(filtered.length),
    O = Array(filtered.length);
  for (let P = 0; P < filtered.length; P++) {
    let z = filtered[P],
      { cachedLayout: cachedLayout, yogaNode: yogaNode } = z,
      K = yogaNode !== void 0 && yogaNode.getDisplay() !== 1,
      q = K ? y + yogaNode.getComputedTop() : 0,
      Y = K ? rowSpan({ y: q, height: yogaNode.getComputedHeight() }) : void 0;
    if (
      z.style.position !== "absolute" &&
      z.paintsPastRect === !0 &&
      (z.dirty ||
        cachedLayout === void 0 ||
        !K ||
        cachedLayout.x !== x + yogaNode.getComputedLeft() ||
        cachedLayout.y !== q ||
        cachedLayout.width !== yogaNode.getComputedWidth() ||
        cachedLayout.height !== yogaNode.getComputedHeight())
    )
      return result;
    let J = 1 / 0,
      V = -1 / 0;
    if (z.style.position !== "absolute") {
      if (cachedLayout !== void 0) ({ top: J, bottom: V } = rowSpan(cachedLayout));
      if (Y !== void 0) ((J = Math.min(J, Y.top)), (V = Math.max(V, Y.bottom)));
    }
    ((D[P] = J), (O[P] = V));
  }
  let _ = Array(filtered.length),
    U = 1 / 0;
  for (let P = filtered.length - 1; P >= 0; P--) ((_[P] = U), (U = Math.min(U, D[P])));
  let L = -1 / 0;
  for (let P = 0; P < filtered.length; P++) {
    let z = filtered[P],
      cachedLayout = z.cachedLayout;
    if (
      z.style.position !== "absolute" &&
      !z.dirty &&
      z.pendingScrollDelta === void 0 &&
      cachedLayout !== void 0 &&
      cachedLayout.height > 0 &&
      z.yogaNode?.getComputedHeight() !== 0 &&
      z.hasAbsoluteDescendant !== !0 &&
      z.paintsPastRect !== !0 &&
      O[P] <= T &&
      L <= D[P] &&
      _[P] >= O[P] &&
      g.every((X) => X.cachedLayout !== void 0 && rectContains(cachedLayout, X.cachedLayout))
    )
      result.add(z);
    L = Math.max(L, O[P]);
  }
  return result;
}
//@ chunk-bzr73sfg.js:310867-310990 sole-consumer
function rowSpan(rect) {
  let floored = Math.floor(rect.y);
  if (rect.height > 0) return { top: floored, bottom: Math.ceil(rect.y + rect.height) };
  return { top: floored - 1, bottom: floored + 1 };
}
//@ chunk-bzr73sfg.js:311083-311290 sole-consumer
function overlapsBounds(n, u, f, m, p, g, E) {
  let yogaNode = n.yogaNode;
  if (yogaNode === void 0 || yogaNode.getDisplay() === 1) return !1;
  let A = u + yogaNode.getComputedLeft(),
    D = f + yogaNode.getComputedTop();
  return A < g && m < A + yogaNode.getComputedWidth() && D < E && p < D + yogaNode.getComputedHeight();
}
//@ chunk-bzr73sfg.js:311290-311387 sole-consumer = unionRect (1)
function rectContains(inner, outer) {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}
//@ chunk-bzr73sfg.js:311387-311507 sole-consumer
function overlapsAbsoluteRects(node, state) {
  let cachedLayout = node.cachedLayout;
  if (cachedLayout === void 0) return !1;
  return (
    anyRectOverlaps(state.absoluteRectsPrev, cachedLayout) ||
    anyRectOverlaps(state.absoluteRectsCur, cachedLayout)
  );
}
//@ chunk-bzr73sfg.js:311507-311681 sole-consumer = unionRect (0.777)
function anyRectOverlaps(rects, rect) {
  for (let f of rects) {
    let m = f.width > 0 && f.height > 0 ? 0 : 1;
    if (
      f.escapes ||
      (f.x - m < rect.x + rect.width &&
        rect.x < f.x + f.width + m &&
        f.y - m < rect.y + rect.height &&
        rect.y < f.y + f.height + m)
    )
      return !0;
  }
  return !1;
}
/**
 * overflow hidden/scroll 的 box 的裁剪矩形（边框内侧），两个方向都不裁剪时返回 undefined。
 */
//@ chunk-bzr73sfg.js:311681-312056 sole-consumer
function getOverflowClip(node, yogaNode, x, y) {
  let overflowX = node.style.overflowX ?? node.style.overflow,
    overflowY = node.style.overflowY ?? node.style.overflow,
    E = overflowX === "hidden" || overflowX === "scroll",
    T = overflowY === "hidden" || overflowY === "scroll";
  if (!E && !T) return;
  return {
    x1: E ? x + yogaNode.getComputedBorder(0) : void 0,
    x2: E ? x + yogaNode.getComputedWidth() - yogaNode.getComputedBorder(2) : void 0,
    y1: T ? y + yogaNode.getComputedBorder(1) : void 0,
    y2: T ? y + yogaNode.getComputedHeight() - yogaNode.getComputedBorder(3) : void 0,
  };
}
/**
 * 维护 {now, before, grew}：本帧与上一帧各自的累积裁剪区，grew 表示裁剪区比上一帧大（之前被裁掉的部分需要重画，不能 blit）。
 */
//@ chunk-bzr73sfg.js:312056-312306 sole-consumer = intersectClip (0.813)
function advanceClips(clips, clip, prevClip) {
  if (!clip && !prevClip) return clips;
  let m = clip ? intersectClip(clips?.now, clip) : clips?.now;
  if (
    clips?.now === clips?.before &&
    clip?.x1 === prevClip?.x1 &&
    clip?.x2 === prevClip?.x2 &&
    clip?.y1 === prevClip?.y1 &&
    clip?.y2 === prevClip?.y2
  )
    return { now: m, before: m, grew: !1 };
  let p = prevClip ? intersectClip(clips?.before, prevClip) : clips?.before;
  return { now: m, before: p, grew: !isClipRedundant(m, p) };
}
//@ chunk-bzr73sfg.js:312306-312543 sole-consumer
function clipBlocksBlit(node, cachedLayout, clips) {
  if (cachedLayout.unpainted) return !0;
  return (
    clips !== void 0 &&
    clips.grew &&
    (node.hasAbsoluteDescendant === !0 ||
      node.paintsPastRect === !0 ||
      !isClipRedundant(clips.now, clips.before, {
        x: Math.floor(cachedLayout.x),
        y: Math.floor(cachedLayout.y),
        width: Math.floor(cachedLayout.width),
        height: Math.floor(cachedLayout.height),
      }))
  );
}
//@ chunk-bzr73sfg.js:312543-312644 sole-consumer
function clipsAllowScrollBlit(n, u, f) {
  return (
    u?.unpainted !== !0 &&
    (n === void 0 || (isClipRedundant(void 0, n.before, u) && isClipRedundant(void 0, n.now, f)))
  );
}
/**
 * 节点在 X、Y 两个方向都裁剪（overflow hidden/scroll）。
 */
//@ chunk-bzr73sfg.js:312644-312804 fingerprint = clipsBothAxes (1)
function clipsBothAxes(node) {
  let u = node.style.overflowX ?? node.style.overflow,
    f = node.style.overflowY ?? node.style.overflow;
  return (u === "hidden" || u === "scroll") && (f === "hidden" || f === "scroll");
}
/**
 * 零高度节点是否与相邻兄弟同一行（这种节点只更新缓存位置，不绘制）。
 */
//@ chunk-bzr73sfg.js:312804-313103 fingerprint = siblingSharesY (1)
function siblingSharesY(node, yogaNode) {
  let parent = node.parentNode;
  if (!parent) return !1;
  let myTop = yogaNode.getComputedTop(),
    siblings = parent.childNodes,
    idx = siblings.indexOf(node);
  for (let E = idx + 1; E < siblings.length; E++) {
    let sib = siblings[E].yogaNode;
    if (!sib) continue;
    return sib.getComputedTop() === myTop;
  }
  for (let E = idx - 1; E >= 0; E--) {
    let sib = siblings[E].yogaNode;
    if (!sib) continue;
    return sib.getComputedTop() === myTop;
  }
  return !1;
}
/**
 * 节点整体 blit 后，再把越出它矩形的绝对定位子孙（及越界子孙）也从上一帧拷过来，并登记绝对定位矩形。
 */
//@ chunk-bzr73sfg.js:313103-313827 fingerprint = blitEscapingAbsoluteDescendants (0.684)
function blitEscapingAbsoluteDescendants(n, u, f, m, p, g, E, T) {
  if (!n.hasAbsoluteDescendant && !n.hasEscapingDescendant) return;
  let A = p + E,
    D = g + T,
    O = [],
    _ = [],
    U = (L, P) => {
      let childNodes = L.childNodes;
      for (let G = childNodes.length - 1; G >= 0; G--) {
        let X = childNodes[G];
        if (X.nodeName !== "#text") (O.push(X), _.push(P));
      }
    };
  U(n, n.hasEscapingDescendant === !0);
  for (let L = O.pop(); L !== void 0; L = O.pop()) {
    let P = _.pop(),
      cachedLayout = L.cachedLayout;
    if (cachedLayout && !cachedLayout.unpainted) {
      let X = L.style.position === "absolute";
      if (X) {
        let K = L.parentNode?.cachedLayout;
        f.absoluteRectsCur.push(makeAbsoluteRect(L, cachedLayout, K?.x, K?.y));
      }
      if (X || P) {
        let cx = Math.floor(cachedLayout.x),
          cy = Math.floor(cachedLayout.y),
          cw = Math.floor(cachedLayout.width),
          ch = Math.floor(cachedLayout.height);
        if (cx < p || cy < g || cx + cw > A || cy + ch > D)
          u.blit(m, cx, cy, cw, ch, { restoreNoSelect: L.style.opaque });
      }
    }
    let G = P && L.hasEscapingDescendant === !0;
    if (L.hasAbsoluteDescendant || G) U(L, G);
  }
}
/**
 * 渲染滚动容器的内容子节点：完全在 [top,bottom) 可见范围外的跳过（并丢弃其缓存）；有子节点变脏后，后续子节点不再 blit。
 */
//@ chunk-bzr73sfg.js:313827-314142 fingerprint = renderScrolledChildren (0.842)
function renderScrolledChildren(n, u, f, m, p, g, E, T, A, D, O, _, U = !1) {
  let L = !1;
  for (let childNode of n.childNodes) {
    let childElem = childNode,
      cy = childElem.yogaNode;
    if (cy) {
      let computedTop = cy.getComputedTop();
      if (computedTop + cy.getComputedHeight() <= A || computedTop >= D) {
        if (!U) dropSubtreeCache(childElem);
        continue;
      }
    }
    let wasDirty = childElem.dirty;
    if (
      (renderNodeToOutput(childElem, u, f, {
        offsetX: m,
        offsetY: p,
        prevScreen: g || L ? void 0 : E,
        clips: T,
        inheritedBackgroundColor: O,
        depth: _,
      }),
      wasDirty)
    )
      L = !0;
  }
}
/**
 * 清掉子树所有节点的 cachedLayout（下一帧不能 blit、命中测试也找不到）。
 */
//@ chunk-bzr73sfg.js:314142-314361 shared-adjacent = dropSubtreeCache (0.809)
function dropSubtreeCache(node) {
  if (node.cachedLayout === void 0) return;
  let u = [node];
  for (let f = u.pop(); f !== void 0; f = u.pop()) {
    f.cachedLayout = void 0;
    let childNodes = f.childNodes;
    for (let p = childNodes.length - 1; p >= 0; p--) {
      let g = childNodes[p];
      if (g.nodeName !== "#text") u.push(g);
    }
  }
}

export {
  isSoftWrapMode,
  createRenderState,
  dropSubtreeCache,
  collectTabbable,
  applyStylesToWrappedText,
  wrapWithOsc8Link,
  renderNodeToOutput,
  resetRenderState,
  hasStaleAbsolutePaint,
};
