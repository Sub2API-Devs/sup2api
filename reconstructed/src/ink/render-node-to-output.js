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
import { needsTextNormalization, regExp_2 } from "./layout/node.js";
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
import { hasCursorUpViewportYankBug } from "./terminal.js";
import { isDegenerateBorderBox, isDOMElement } from "./dom.js";
import { intersectClip, isClipRedundant } from "./output.js";

//@ chunk-bzr73sfg.js:182062-182131 fingerprint = wrapWithSoftWrap (0.607)
/**
 * textWrap 是否是折行类（wrap、wrap-trim、wrap-stream），而不是截断类。
 */
function isSoftWrapMode(textWrap) {
  return textWrap === "wrap" || textWrap === "wrap-trim" || textWrap === "wrap-stream";
}
//@ chunk-bzr73sfg.js:193777-193818 placement
/**
 * 按文档顺序收集子树里所有可 Tab 聚焦的元素。
 */
function collectTabbable(root) {
  let result = [];
  walkTabbable(root, result);
  return result;
}
//@ chunk-bzr73sfg.js:292494-292609 placement
function hasAbsoluteAncestor(node) {
  for (let parentNode = node.parentNode; parentNode !== undefined; parentNode = parentNode.parentNode)
    if (parentNode.style.position === "absolute") return true;
  return false;
}
//@ chunk-bzr73sfg.js:292609-292898 placement
function makeAbsoluteRect(node, rect, parentX, parentY) {
  let yogaNode = node.parentNode?.yogaNode;
  let withinParent =
    yogaNode !== undefined &&
    !hasAbsoluteAncestor(node) &&
    parentX !== undefined &&
    parentY !== undefined &&
    rect.x >= parentX &&
    rect.y >= parentY &&
    rect.x + rect.width <= parentX + yogaNode.getComputedWidth() &&
    rect.y + rect.height <= parentY + yogaNode.getComputedHeight();
  return {
    node,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    withinParent,
    escapes: node.paintsPastRect === true,
  };
}
//@ chunk-bzr73sfg.js:292898-293138 placement
/**
 * 一次渲染遍历的共享状态：是否有覆盖层、布局是否移动、滚动提示（DECSTBM）、待继续排水的滚动节点、跟随滚动信息、绝对定位矩形（上一帧/本帧）、片段映射与原始 ANSI 背景改写缓存。
 */
function createRenderState() {
  return {
    overlayActive: false,
    layoutShifted: false,
    scrollHint: null,
    scrollDrainNode: null,
    followScroll: null,
    absolutePaintCut: false,
    absoluteRectsPrev: [],
    absoluteRectsCur: [],
    segmentMapScratch: new Uint32Array(0),
    rawBgRewriteCache: new WeakMap(),
  };
}
//@ chunk-bzr73sfg.js:293138-293335 placement
function resetRenderState(state) {
  state.overlayActive = false;
  state.layoutShifted = false;
  state.scrollHint = null;
  state.scrollDrainNode = null;
  state.followScroll = null;
  state.absolutePaintCut = false;
  state.absoluteRectsPrev = state.absoluteRectsCur;
  state.absoluteRectsCur = [];
}
//@ chunk-bzr73sfg.js:293335-293523 placement
/**
 * 上一帧越出父框的绝对定位矩形本帧没再出现、却被本帧的 blit 覆盖到了（可能拷回旧图像），需要下一帧整树重画。
 */
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
  for (let parentNode = node.parentNode; parentNode !== undefined; parentNode = parentNode.parentNode)
    if (parentNode === ancestor) return true;
  return false;
}
//@ chunk-bzr73sfg.js:293616-293652 layout
var PROPORTIONAL_DRAIN_MIN = 4;
var ADAPTIVE_INSTANT_MAX = 5;
var ADAPTIVE_SLOW_MAX = 12;
var ADAPTIVE_STEP_MEDIUM = 2;
var ADAPTIVE_STEP_LARGE = 3;
var ADAPTIVE_BACKLOG_MAX = 30;
//@ chunk-bzr73sfg.js:293652-293906 fingerprint = drainAdaptive (1)
/**
 * 自适应滚动排水：待滚量 ≤5 一次滚完，<12 每帧 2 行，否则每帧 3 行；超过 30 的积压直接跳过；单帧不超过视口高-1，剩余写回 pendingScrollDelta。
 */
function drainAdaptive(node, pending, innerHeight) {
  let sign = pending > 0 ? 1 : -1;
  let abs = Math.abs(pending);
  let applied = 0;
  if (abs > ADAPTIVE_BACKLOG_MAX) {
    applied += sign * (abs - ADAPTIVE_BACKLOG_MAX);
    abs = ADAPTIVE_BACKLOG_MAX;
  }
  let step =
    abs <= ADAPTIVE_INSTANT_MAX ? abs : abs < ADAPTIVE_SLOW_MAX ? ADAPTIVE_STEP_MEDIUM : ADAPTIVE_STEP_LARGE;
  applied += sign * step;
  let rem = abs - step;
  let cap = Math.max(1, innerHeight - 1);
  let totalAbs = Math.abs(applied);
  if (totalAbs > cap) {
    let excess = totalAbs - cap;
    node.pendingScrollDelta = sign * (rem + excess);
    return sign * cap;
  }
  node.pendingScrollDelta = rem > 0 ? sign * rem : undefined;
  return applied;
}
//@ chunk-bzr73sfg.js:293906-294089 layout = drainAdaptive (1)
/**
 * 比例滚动排水：每帧滚动待滚量的 3/4（至少 4 行，不超过视口高-1），剩余写回 pendingScrollDelta。由设置 useAdaptiveDrain 选择用哪种。
 */
function drainProportional(node, pending, innerHeight) {
  let abs = Math.abs(pending);
  let cap = Math.max(1, innerHeight - 1);
  let step = Math.min(cap, Math.max(PROPORTIONAL_DRAIN_MIN, (abs * 3) >> 2));
  if (abs <= step) {
    node.pendingScrollDelta = undefined;
    return pending;
  }
  let applied = pending > 0 ? step : -step;
  node.pendingScrollDelta = pending - applied;
  return applied;
}
//@ chunk-bzr73sfg.js:294089-294114 layout
var OSC = "\x1B]";
var BEL = "\x07";
//@ chunk-bzr73sfg.js:294114-294174 fingerprint = wrapWithOsc8Link (1)
/**
 * 用 OSC 8 把文本包成超链接。
 */
function wrapWithOsc8Link(text, url) {
  return `${OSC}8;;${url}${BEL}${text}${OSC}8;;${BEL}`;
}
//@ chunk-bzr73sfg.js:294174-294480 layout
/**
 * 为压平的文本段建“字符下标 → 段号”表（复用 state 里的 Uint32Array），折行后据此给每个字符还原样式。
 */
function buildCharToSegmentIndex(state, segments) {
  let f = 0;
  for (let idx = 0; idx < segments.length; idx++) f += segments[idx].text.length;
  if (state.segmentMapScratch.length < f)
    state.segmentMapScratch = new Uint32Array(Math.max(f, state.segmentMapScratch.length * 2));
  let map = state.segmentMapScratch.subarray(0, f);
  let p = 0;
  for (let idx = 0; idx < segments.length; idx++) {
    let E = p + segments[idx].text.length;
    map.fill(idx, p, E);
    p = E;
  }
  return map;
}
//@ chunk-bzr73sfg.js:294480-295548 fingerprint = applyStylesToWrappedText (0.78)
/**
 * 把折行后的纯文本重新套上样式与超链接：按“字符→段号”表在原文本中同步推进（跳过折行吞掉的空白与 \r\n），段号变化时切出一段套 applyTextStyles，文本内自带的 ANSI 序列原样保留。
 */
function applyStylesToWrappedText(
  wrappedPlain,
  segments,
  charToSegment,
  originalPlain,
  trimEnabled = false,
  softWrap,
) {
  let lines = wrappedPlain.split(`
`);
  let resultLines = [];
  let A = originalPlain.includes(ESC) ? mapAnsiSequenceEnds(originalPlain) : undefined;
  let charIndex = 0;
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    let text = lines[lineIdx];
    if (trimEnabled && text.length > 0) {
      let lineStartsWithWhitespace = /\s/.test(text[0]);
      if (
        charIndex < originalPlain.length &&
        /\s/.test(originalPlain[charIndex]) &&
        !lineStartsWithWhitespace
      )
        while (charIndex < originalPlain.length && /\s/.test(originalPlain[charIndex])) charIndex++;
    }
    let styledLine = "";
    let runStart = 0;
    let runSegmentIndex = charToSegment[charIndex] ?? 0;
    let z = text.includes(ESC) ? mapAnsiSequenceEnds(text) : undefined;
    for (let idx = 0; idx < text.length; idx++) {
      let q = z?.get(idx);
      let Y = 1;
      if (q !== undefined) {
        let sliced = text.slice(idx, q);
        if (trimEnabled) charIndex = skipWhitespaceTo(originalPlain, charIndex, sliced);
        idx = q - 1;
        if (!originalPlain.startsWith(sliced, charIndex)) continue;
        Y = sliced.length;
      } else {
        for (let V = A?.get(charIndex); V !== undefined; V = A?.get(charIndex)) charIndex = V;
        if (trimEnabled && text[idx] !== originalPlain[charIndex])
          charIndex = skipWhitespaceTo(originalPlain, charIndex, text[idx]);
      }
      let J = charToSegment[charIndex] ?? runSegmentIndex;
      if (J !== runSegmentIndex) {
        let V = idx + 1 - Y;
        let runText = text.slice(runStart, V);
        let segment = segments[runSegmentIndex];
        if (segment) {
          let styled = applyTextStyles(runText, segment.styles);
          if (segment.hyperlink) styled = wrapWithOsc8Link(styled, segment.hyperlink);
          styledLine += styled;
        } else styledLine += runText;
        runStart = V;
        runSegmentIndex = J;
      }
      charIndex += Y;
    }
    let runText = text.slice(runStart);
    let segment = segments[runSegmentIndex];
    if (segment) {
      let styled = applyTextStyles(runText, segment.styles);
      if (segment.hyperlink) styled = wrapWithOsc8Link(styled, segment.hyperlink);
      styledLine += styled;
    } else styledLine += runText;
    resultLines.push(styledLine);
    if (charIndex < originalPlain.length && originalPlain[charIndex] === "\r") charIndex++;
    if (
      charIndex < originalPlain.length &&
      originalPlain[charIndex] ===
        `
`
    )
      charIndex++;
    if (
      softWrap?.[lineIdx + 1] === SoftWrapKind.ContinuationElidedSep &&
      charIndex < originalPlain.length &&
      originalPlain[charIndex] === " "
    )
      charIndex++;
    if (trimEnabled && lineIdx < lines.length - 1) {
      let nextLine = lines[lineIdx + 1];
      let nextLineFirstChar = nextLine.length > 0 ? nextLine[0] : null;
      while (charIndex < originalPlain.length && /\s/.test(originalPlain[charIndex])) {
        if (nextLineFirstChar !== null && originalPlain[charIndex] === nextLineFirstChar) break;
        charIndex++;
      }
    }
  }
  return resultLines.join(`
`);
}
//@ chunk-bzr73sfg.js:295548-295672 layout
function mapAnsiSequenceEnds(text) {
  let u = new Map();
  let f = 0;
  for (let m of tokenizeAll(text)) {
    let p = f + m.value.length;
    if (m.type === "sequence") u.set(f, p);
    f = p;
  }
  return u;
}
//@ chunk-bzr73sfg.js:295672-295766 file-local
function skipWhitespaceTo(originalPlain, charIndex, f) {
  let m = charIndex;
  while (m < originalPlain.length && /\s/.test(originalPlain[m])) m++;
  return originalPlain.startsWith(f, m) ? m : charIndex;
}
//@ chunk-bzr73sfg.js:295766-296245 layout
/**
 * 折行并记录每行的软换行种类（HardBreak 原有换行 / Continuation 折出来的续行 / ContinuationElidedSep 续行吞掉了行首空格），复制选中文本时据此拼回原行；wrap-stream 丢掉最后一行（流式输出的未完成行）。
 */
function wrapWithSoftWrap(text, maxWidth, textWrap) {
  let isStream = textWrap === "wrap-stream";
  if (!isSoftWrapMode(textWrap))
    return {
      wrapped: wrapText(text, maxWidth, textWrap),
      softWrap: undefined,
    };
  let p = isStream ? "wrap" : textWrap;
  let lines = text.replace(
    /\r\n?/g,
    `
`,
  ).split(`
`);
  let lines_2 = [];
  let softWrap = [];
  for (let orig of lines) {
    let pieces = wrapText(orig, maxWidth, p).split(`
`);
    for (let i = 0; i < pieces.length; i++) {
      if (i === 0) {
        lines_2.push(pieces[i]);
        softWrap.push(SoftWrapKind.HardBreak);
        continue;
      }
      let _ = pieces[i];
      let U = _.startsWith(" ") ? _.slice(1) : _;
      let L = widestLine(U) > 0 ? U : _;
      lines_2.push(L);
      softWrap.push(L.length < _.length ? SoftWrapKind.ContinuationElidedSep : SoftWrapKind.Continuation);
    }
  }
  if (isStream) {
    lines_2.pop();
    softWrap.pop();
  }
  return {
    wrapped: lines_2.join(`
`),
    softWrap,
  };
}
//@ chunk-bzr73sfg.js:296245-296431 layout
/**
 * 折行；若行数与 yoga 计算的高度不一致，改用测量时实际给出的宽度（getOfferedWidth）重折，保证与布局一致。
 */
function wrapForYogaNode(text, maxWidth, textWrap, yogaNode) {
  let p = wrapWithSoftWrap(text, maxWidth, textWrap);
  if (p.softWrap === undefined || p.softWrap.length === yogaNode.getComputedHeight()) return p;
  let maxWidth_2 = yogaNode.getOfferedWidth(maxWidth, yogaNode.getComputedHeight());
  return maxWidth_2 === maxWidth ? p : wrapWithSoftWrap(text, maxWidth_2, textWrap);
}
//@ chunk-bzr73sfg.js:296431-296572 layout
function joinSegmentTexts(segments) {
  let mapped = segments.map((segment) => segment.text);
  let f = needsTextNormalization(mapped);
  if (f === undefined) return mapped.join("");
  for (let [m, p] of segments.entries()) p.text = f[m] ?? "";
  return f.join("");
}
//@ chunk-bzr73sfg.js:296572-296761 fingerprint = applyPaddingToText (0.915)
/**
 * 按 ink-text 首个子节点的 yoga 偏移给文本加上顶部空行与左缩进（同时在软换行表前补 HardBreak）。
 */
function applyPaddingToText(node, text, softWrap) {
  let yogaNode = node.childNodes[0]?.yogaNode;
  if (yogaNode) {
    let offsetX = yogaNode.getComputedLeft();
    let offsetY = yogaNode.getComputedTop();
    text =
      `
`.repeat(offsetY) + indentString(text, offsetX);
    if (softWrap && offsetY > 0) softWrap.unshift(...Array(offsetY).fill(SoftWrapKind.HardBreak));
  }
  return text;
}
//@ chunk-bzr73sfg.js:296761-296937 layout
/**
 * 把排好样式的文本写进 Output（有 textDirection 时走 writeDirected），并记录是否画出了自身矩形（paintsPastRect）。
 */
function writeTextNode(node, output, x, y, width, height, text, softWrap, maxWidth) {
  text = applyPaddingToText(node, text, softWrap);
  let textDirection = node.style.textDirection;
  if (textDirection === undefined) output.write(x, y, text, softWrap);
  else output.writeDirected(x, y, text, softWrap, textDirection, maxWidth);
  node.paintsPastRect = paintsPastHeight(text, y, height) || paintsPastWidth(output, text, x, width);
}
//@ chunk-bzr73sfg.js:296937-297037 layout
/**
 * 写 ink-raw-ansi：有继承背景色时先把原始 ANSI 里的背景重写（带缓存），记录 paintsPastRect。
 */
function writeRawAnsiNode(node, output, state, x, y, width, height, rawText, backgroundColor) {
  output.write(
    x,
    y,
    backgroundColor ? rewriteRawAnsiBackground(state, node, rawText, backgroundColor) : rawText,
  );
  node.paintsPastRect = paintsPastHeight(rawText, y, height) || paintsPastWidth(output, rawText, x, width);
}
//@ chunk-bzr73sfg.js:297037-297167 layout
function paintsPastWidth(output, text, x, width) {
  let floored = Math.floor(width);
  for (let line of text.split(`
`))
    if ((regExp_2.test(line) ? output.paintedWidth(line, x) : bunStringWidth(line)) > floored) return true;
  return false;
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
//@ chunk-bzr73sfg.js:297298-304543 fingerprint = renderNodeToOutput (0.712)
/**
 * 渲染一个 DOM 节点到 Output（每帧从根递归）：display:none 时清掉旧区域；未脏且位置尺寸背景都不变时直接从上一帧 blit（再补拷越界的绝对定位子孙）；否则清旧区域、处理 pendingClears，按类型绘制——ink-raw-ansi 原样写；ink-text 压平→按 textWrap 折行/截断→套样式与 OSC 8→写入；ink-box 处理 noSelect、overflow 裁剪、overflow:scroll（滚动锚点、粘底、排水、DECSTBM 滚动提示 + 只重画新露出的行）、背景/opaque、子节点、边框。最后记 cachedLayout 供下一帧比较与命中测试。
 */
function renderNodeToOutput(
  node,
  output,
  state,
  { offsetX = 0, offsetY = 0, prevScreen, clips, skipSelfBlit = false, inheritedBackgroundColor, depth = 0 },
) {
  if (depth >= MAX_TREE_DEPTH) {
    reportTreeDepthExceeded("renderNodeToOutput", node.nodeName);
    return;
  }
  let { yogaNode } = node;
  if (yogaNode) {
    if (yogaNode.getDisplay() === 1) {
      if (node.dirty) {
        let cached = node.cachedLayout;
        if (cached) {
          output.clear({
            x: Math.floor(cached.x),
            y: Math.floor(cached.y),
            width: Math.floor(cached.width),
            height: Math.floor(cached.height),
          });
          dropSubtreeCache(node);
          state.layoutShifted = true;
        }
      }
      node.hasEscapingDescendant = false;
      node.paintsPastRect = false;
      return;
    }
    let x = offsetX + yogaNode.getComputedLeft();
    let yogaTop = yogaNode.getComputedTop();
    let y = offsetY + yogaTop;
    let width = yogaNode.getComputedWidth();
    let height = yogaNode.getComputedHeight();
    if (y < 0 && node.style.position === "absolute") y = 0;
    let cached = node.cachedLayout;
    if (
      !node.dirty &&
      !skipSelfBlit &&
      node.pendingScrollDelta === undefined &&
      cached &&
      cached.x === x &&
      cached.y === y &&
      cached.width === width &&
      cached.height === height &&
      cached.background === inheritedBackgroundColor &&
      !cached.shifted &&
      prevScreen &&
      !clipBlocksBlit(node, cached, clips)
    ) {
      let fx = Math.floor(x);
      let fy = Math.floor(y);
      let fw = Math.floor(width);
      let fh = Math.floor(height);
      output.blit(prevScreen, fx, fy, fw, fh, {
        restoreNoSelect: node.style.opaque,
      });
      if (node.style.position === "absolute")
        state.absoluteRectsCur.push(makeAbsoluteRect(node, cached, offsetX, offsetY));
      blitEscapingAbsoluteDescendants(node, output, state, prevScreen, fx, fy, fw, fh);
      return;
    }
    let layoutMoved =
      cached !== undefined &&
      ((cached.shifted && prevScreen !== undefined) ||
        cached.x !== x ||
        cached.y !== y ||
        cached.width !== width ||
        cached.height !== height);
    if (layoutMoved) state.layoutShifted = true;
    if (cached && (node.dirty || layoutMoved))
      output.clear(
        {
          x: Math.floor(cached.x),
          y: Math.floor(cached.y),
          width: Math.floor(cached.width),
          height: Math.floor(cached.height),
        },
        node.style.position === "absolute",
      );
    let clears = node.pendingClears;
    let hadPendingClears = clears !== undefined;
    if (hadPendingClears) {
      state.layoutShifted = true;
      for (let rect of clears)
        output.clear({
          x: Math.floor(rect.x),
          y: Math.floor(rect.y),
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        });
      node.pendingClears = undefined;
    }
    if (height === 0 && siblingSharesY(node, yogaNode)) {
      node.cachedLayout = {
        x,
        y,
        width,
        height,
        background: inheritedBackgroundColor,
      };
      node.hasEscapingDescendant = false;
      node.paintsPastRect = false;
      for (let childNode of node.childNodes)
        if (childNode.nodeName !== "#text") setUnpaintedLayout(childNode, x, y);
      node.dirty = false;
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
        inheritedBackgroundColor
          ? {
              backgroundColor: inheritedBackgroundColor,
            }
          : undefined,
      );
      let plainText = joinSegmentTexts(segments);
      if (plainText.length > 0) {
        let maxWidth = Math.min(getMaxWidthAlias(yogaNode), output.width - x);
        let textWrap = node.style.textWrap ?? "wrap";
        let needsWrapping = textWrap === "wrap-stream" || widestLine(plainText) > maxWidth;
        let text;
        let softWrap;
        if (needsWrapping && segments.length === 1) {
          let segment = segments[0];
          let ce = wrapForYogaNode(plainText, maxWidth, textWrap, yogaNode);
          softWrap = ce.softWrap;
          text = ce.wrapped
            .split(
              `
`,
            )
            .map((line) => {
              let styled = applyTextStyles(line, segment.styles);
              if (segment.hyperlink) styled = wrapWithOsc8Link(styled, segment.hyperlink);
              return styled;
            }).join(`
`);
        } else if (
          needsWrapping &&
          (textWrap === "truncate-start" || textWrap === "truncate-middle" || textWrap === "middle")
        )
          text = truncateStyledText(
            plainText,
            maxWidth,
            segments,
            buildCharToSegmentIndex(state, segments),
            textWrap === "truncate-start" ? "start" : "middle",
          );
        else if (needsWrapping) {
          let ue = wrapForYogaNode(plainText, maxWidth, textWrap, yogaNode);
          softWrap = ue.softWrap;
          let charToSegment = buildCharToSegmentIndex(state, segments);
          text = applyStylesToWrappedText(
            ue.wrapped,
            segments,
            charToSegment,
            plainText,
            textWrap === "wrap-trim",
            ue.softWrap,
          );
        } else
          text = segments
            .map((segment) => {
              let styledText = applyTextStyles(segment.text, segment.styles);
              if (segment.hyperlink) styledText = wrapWithOsc8Link(styledText, segment.hyperlink);
              return styledText;
            })
            .join("");
        writeTextNode(node, output, x, y, width, height, text, softWrap, maxWidth);
      }
    } else if (node.nodeName === "ink-box") {
      let boxBackgroundColor = node.style.backgroundColor ?? inheritedBackgroundColor;
      if (node.style.noSelect) {
        let boxX = Math.floor(x);
        let fromEdge = node.style.noSelect === "from-left-edge";
        output.noSelect({
          x: fromEdge ? 0 : boxX,
          y: Math.floor(y),
          width: fromEdge ? boxX + Math.floor(width) : Math.floor(width),
          height: Math.floor(height),
        });
      }
      let overflowX = (node.style.overflowY ?? node.style.overflow) === "scroll";
      clip = getOverflowClip(node, yogaNode, x, y);
      let ae = clip !== undefined;
      let y1 = clip?.y1;
      let y2 = clip?.y2;
      if (clip) output.clip(clip);
      let clips_2 = prevScreen ? advanceClips(clips, clip, cached?.clip) : clips;
      let ye = false;
      if (overflowX) {
        let computedPadding = yogaNode.getComputedPadding(1);
        let padTop = yogaNode.getComputedPadding(3);
        let innerHeight = Math.max(0, (y2 ?? y + height) - (y1 ?? y) - computedPadding - padTop);
        let content = node.childNodes.find((childNode) => childNode.yogaNode);
        let contentYoga = content?.yogaNode;
        let scrollHeight = contentYoga?.getComputedHeight() ?? 0;
        let scrollHeight_2 = node.scrollHeight ?? scrollHeight;
        let scrollViewportHeight = node.scrollViewportHeight ?? innerHeight;
        node.scrollHeight = scrollHeight;
        node.scrollViewportHeight = innerHeight;
        let viewportTop = (y1 ?? y) + computedPadding;
        node.scrollViewportTop = viewportTop;
        let scrollTop = resolveScrollTop(
          node,
          state,
          x,
          width,
          scrollHeight,
          scrollHeight_2,
          innerHeight,
          scrollViewportHeight,
          viewportTop,
        );
        if (content && contentYoga) {
          let offsetX = x + contentYoga.getComputedLeft();
          let offsetY = y + contentYoga.getComputedTop() - scrollTop;
          let cachedLayout = content.cachedLayout;
          let hint = null;
          let floored = Math.floor(viewportTop);
          let it = false;
          if (cachedLayout && cachedLayout.y !== offsetY) {
            let Ie = cachedLayout.y - offsetY;
            let regionTop = Math.floor(y1 ?? y);
            let lt = Math.floor(x) <= 0 && Math.floor(x + width) >= output.width;
            let Ft = innerHeight - scrollViewportHeight;
            it = cached !== undefined && Ft !== 0 && height - cached.height === Ft && Ie === -Ft;
            let bottom = floored + (it ? Math.max(innerHeight, scrollViewportHeight) : innerHeight) - 1;
            if (
              lt &&
              cached?.y === y &&
              cached.x === x &&
              cached.width === width &&
              cachedLayout.x === offsetX &&
              cachedLayout.width === contentYoga.getComputedWidth() &&
              (cached.height === height || it) &&
              innerHeight > 0 &&
              Math.abs(Ie) < (it ? Math.min(innerHeight, scrollViewportHeight) : innerHeight) &&
              padTop === 0
            ) {
              hint = {
                top: regionTop,
                bottom,
                delta: Ie,
              };
              state.scrollHint = hint;
            } else state.layoutShifted = true;
          }
          let scrollHeight = contentYoga.getComputedHeight();
          let prevHeight = cachedLayout?.height ?? scrollHeight;
          let heightDelta = scrollHeight - prevHeight;
          let st = !hint || heightDelta === 0 || (hint.delta > 0 && heightDelta === hint.delta);
          let any = state.absoluteRectsPrev.some((Ie) => isDescendantOfNode(Ie.node, content));
          let bn =
            hint !== null &&
            content.childNodes.some(
              (childNode) =>
                childNode.nodeName !== "#text" &&
                childNode.paintsPastRect === true &&
                childNode.cachedLayout !== undefined,
            );
          let Ot =
            prevScreen &&
            st &&
            !state.overlayActive &&
            !any &&
            cached?.background === inheritedBackgroundColor &&
            !bn &&
            clipsAllowScrollBlit(clips, cached, {
              x,
              y,
              width,
              height,
            });
          if (hint && !Ot) state.scrollHint = null;
          if (hint && Ot) {
            let { top, bottom, delta } = hint;
            let floored_2 = Math.floor(width);
            let vn = " ".repeat(floored_2);
            let Xn = state.absoluteRectsCur.length;
            let ct = 0;
            if (delta > 0 && floored > top)
              for (let childNode of content.childNodes) {
                let yogaNode = childNode.yogaNode;
                if (!yogaNode) continue;
                let computedTop = yogaNode.getComputedTop();
                if (computedTop + yogaNode.getComputedHeight() > scrollTop) {
                  ct = Math.max(0, Math.min(floored - top, scrollTop - computedTop));
                  break;
                }
              }
            let Sn = floored + innerHeight - 1;
            let Br = it ? floored + scrollViewportHeight - 1 : Sn;
            let li = floored + Math.max(0, delta) - ct;
            let min = Math.min(Br, Sn + delta);
            output.blit(prevScreen, Math.floor(x), li, floored_2, min - li + 1, {
              unclipped: min > Sn,
            });
            output.shift(top, bottom, delta);
            let rn = delta > 0 ? min - delta + 1 : floored;
            let edgeBottom = delta > 0 ? Sn : floored - delta - 1;
            let on;
            let nodes;
            let Qe = content.dirty ? new Uint8Array(bottom - top + 1) : undefined;
            for (let childNode of content.childNodes) {
              let node = childNode;
              let cy = node.yogaNode;
              if (!cy) continue;
              let cachedLayout = node.cachedLayout;
              let childTop = cy.getComputedTop();
              let childH = cy.getComputedHeight();
              if (childTop + childH <= scrollTop || childTop >= scrollTop + innerHeight) {
                dropSubtreeCache(node);
                continue;
              }
              if (cachedLayout) {
                let Fl =
                  Math.floor(cachedLayout.y) - delta === Math.floor(offsetY + childTop) &&
                  cachedLayout.height === childH;
                shiftCachedLayouts(node, -delta);
                if (Fl && !node.dirty) {
                  let Ul = Math.floor(cachedLayout.y) - top;
                  Qe?.fill(1, Math.max(Ul, 0), Math.max(Ul + childH, 0));
                  continue;
                }
              }
              if (
                childH > 0 &&
                Math.max(childTop, scrollTop) >= rn - offsetY &&
                Math.min(childTop + childH, scrollTop + innerHeight) <= edgeBottom + 1 - offsetY
              )
                continue;
              on = pushOrCreate(on, node);
              if (!node.dirty) nodes = pushOrCreate(nodes, node);
            }
            if (Qe) {
              for (let idx = 0; idx < Qe.length; idx++)
                if (Qe[idx] === 0) output.write(Math.floor(x), top + idx, vn, HARD_BREAK_ONLY);
            }
            if (rn <= edgeBottom) {
              let Ue = delta < 0 ? top : rn;
              output.clear({
                x: Math.floor(x),
                y: Ue,
                width: floored_2,
                height: edgeBottom - Ue + 1,
              });
              output.clip({
                x1: undefined,
                x2: undefined,
                y1: Ue,
                y2: edgeBottom + 1,
              });
              renderScrolledChildren(
                content,
                output,
                state,
                offsetX,
                offsetY,
                hadPendingClears,
                undefined,
                undefined,
                rn - offsetY,
                edgeBottom + 1 - offsetY,
                boxBackgroundColor,
                depth + 2,
                true,
              );
              output.unclip();
            }
            if (on)
              for (let Ue of on) {
                let yogaNode = Ue.yogaNode;
                if (!yogaNode) continue;
                let computedTop = yogaNode.getComputedTop();
                let shiftedTop = Math.max(
                  Math.floor(offsetY + computedTop),
                  delta < 0 ? edgeBottom + 1 : -1 / 0,
                );
                let screenBottom = Math.min(
                  Math.floor(offsetY + computedTop + yogaNode.getComputedHeight()),
                  Math.floor((y1 ?? y) + computedPadding + innerHeight),
                  delta > 0 ? rn : 1 / 0,
                );
                if (shiftedTop < screenBottom) {
                  let fill = Array(screenBottom - shiftedTop).fill(vn).join(`
`);
                  output.write(Math.floor(x), shiftedTop, fill, HARD_BREAK_ONLY);
                }
                output.clip({
                  x1: undefined,
                  x2: undefined,
                  y1: shiftedTop,
                  y2: Math.max(shiftedTop, screenBottom),
                });
                renderNodeToOutput(Ue, output, state, {
                  offsetX,
                  offsetY,
                  prevScreen: undefined,
                  inheritedBackgroundColor: boxBackgroundColor,
                  depth: depth + 2,
                });
                output.unclip();
              }
            for (let Ue of state.absoluteRectsPrev) {
              if (Ue.y >= bottom + 1 || Ue.y + Ue.height <= top) continue;
              let shiftedTop = Math.max(top, Math.floor(Ue.y) - delta);
              let shiftedBottom = Math.min(bottom + 1, Math.floor(Ue.y + Ue.height) - delta);
              if (shiftedTop >= rn && shiftedBottom <= edgeBottom + 1) continue;
              if (shiftedTop >= shiftedBottom) continue;
              let fill = Array(shiftedBottom - shiftedTop).fill(vn).join(`
`);
              output.write(Math.floor(x), shiftedTop, fill, HARD_BREAK_ONLY);
              output.clip({
                x1: undefined,
                x2: undefined,
                y1: shiftedTop,
                y2: shiftedBottom,
              });
              renderScrolledChildren(
                content,
                output,
                state,
                offsetX,
                offsetY,
                hadPendingClears,
                undefined,
                undefined,
                shiftedTop - offsetY,
                shiftedBottom - offsetY,
                boxBackgroundColor,
                depth + 2,
                true,
              );
              output.unclip();
            }
            clearShiftedFlags(nodes);
            for (let Ue = Xn; Ue < state.absoluteRectsCur.length; Ue++)
              if (!state.absoluteRectsCur[Ue].withinParent) {
                state.absolutePaintCut = true;
                break;
              }
          } else {
            let scrolled = cachedLayout && cachedLayout.y !== offsetY;
            if (scrolled && y1 !== undefined && y2 !== undefined)
              output.clear({
                x: Math.floor(x),
                y: Math.floor(y1),
                width: Math.floor(width),
                height: Math.floor(y2 - y1),
              });
            renderScrolledChildren(
              content,
              output,
              state,
              offsetX,
              offsetY,
              hadPendingClears,
              scrolled || layoutMoved ? undefined : prevScreen,
              clips_2,
              scrollTop,
              scrollTop + innerHeight,
              boxBackgroundColor,
              depth + 2,
            );
          }
          content.cachedLayout = {
            x: offsetX,
            y: offsetY,
            width: contentYoga.getComputedWidth(),
            height: contentYoga.getComputedHeight(),
          };
          content.dirty = false;
          content.pendingClears = undefined;
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
          clears,
          ownBackgroundColor || node.style.opaque ? undefined : prevScreen,
          clips_2,
          boxBackgroundColor,
          depth + 1,
        );
      }
      if (ae) output.unclip();
      node.hasEscapingDescendant = ae ? false : ye;
      renderBorderAlias(x, y, node, output, inheritedBackgroundColor);
    } else if (node.nodeName === "ink-root")
      node.hasEscapingDescendant = renderChildren(
        node,
        output,
        state,
        x,
        y,
        width,
        height,
        clears,
        prevScreen,
        clips,
        inheritedBackgroundColor,
        depth + 1,
      );
    let rect = {
      x,
      y,
      width,
      height,
      background: inheritedBackgroundColor,
      clip,
    };
    node.cachedLayout = rect;
    if (node.style.position === "absolute")
      state.absoluteRectsCur.push(makeAbsoluteRect(node, rect, offsetX, offsetY));
    node.dirty = false;
  }
}
//@ chunk-bzr73sfg.js:304543-306340 layout
/**
 * 计算滚动容器本帧的 scrollTop：先处理 scrollAnchor（start/center/end/nearest）；stickyScroll 或在底部时跟随内容增长；按 useAdaptiveDrain 选择排水算法消耗 pendingScrollDelta（超出 clamp 范围时放慢）；夹到合法范围；scrollTop 变化时给 state.followScroll 记下差值（选区跟随用）。
 */
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
      let computedTop = yogaNode.getComputedTop();
      let ue = computedTop + node.scrollAnchor.offset;
      let ce = computedTop + yogaNode.getComputedHeight() - viewportHeight;
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
      node.pendingScrollDelta = undefined;
    }
    node.scrollAnchor = undefined;
  }
  let prevScrollTop = node.scrollTop ?? 0;
  let stickyScroll = node.attributes.stickyScroll;
  let sticky = node.stickyScroll ?? Boolean(stickyScroll);
  let L = sticky ? prevContentHeight : Math.max(node.scrollHeightHwm ?? 0, prevContentHeight);
  node.scrollHeightHwm = sticky ? undefined : Math.max(L, contentHeight);
  let max = Math.max(0, L - prevViewportHeight);
  let z = contentHeight >= prevContentHeight;
  let G = node.attributes.followGrowth !== false;
  if (
    (sticky || (stickyScroll !== false && G && z && prevScrollTop >= max)) &&
    (node.pendingScrollDelta ?? 0) >= 0
  ) {
    node.scrollTop = maxScroll;
    node.pendingScrollDelta = undefined;
    if (node.stickyScroll === false && prevScrollTop >= max) {
      if (maxScroll - prevScrollTop > 3)
        logForDebugging(
          `render-node-to-output: positional follow re-enabled sticky (scrollTop=${prevScrollTop} prevMax=${max} \u2192 newMax=${maxScroll}, prevH=${prevContentHeight} \u2192 ${contentHeight})`,
        );
      node.stickyScroll = true;
    }
  }
  let scrollTop = node.scrollTop ?? 0;
  let { pendingScrollDelta, scrollClampMin, scrollClampMax } = node;
  let V = scrollClampMin !== undefined && scrollClampMax !== undefined;
  if (pendingScrollDelta !== undefined && pendingScrollDelta !== 0) {
    let innerHeight =
      V &&
      ((pendingScrollDelta < 0 && scrollTop < scrollClampMin) ||
        (pendingScrollDelta > 0 && scrollTop > scrollClampMax))
        ? Math.min(4, viewportHeight >> 3)
        : viewportHeight;
    let useAdaptiveDrain = hasCursorUpViewportYankBug().useAdaptiveDrain;
    let ce = useAdaptiveDrain
      ? drainAdaptive(node, pendingScrollDelta, innerHeight)
      : drainProportional(node, pendingScrollDelta, innerHeight);
    scrollTop += ce;
    recordScrollOut(ce, node.pendingScrollDelta ?? 0, useAdaptiveDrain ? "adaptive" : "proportional");
  } else if (pendingScrollDelta === 0) node.pendingScrollDelta = undefined;
  let max_2 = Math.max(0, Math.min(scrollTop, Math.max(maxScroll, L - viewportHeight)));
  let max_3 = Math.max(0, Math.min(scrollTop, maxScroll));
  let ne = V && !sticky ? Math.max(scrollClampMin, Math.min(max_3, scrollClampMax)) : max_3;
  node.scrollTop = max_2;
  if (max_2 !== scrollTop) node.pendingScrollDelta = undefined;
  if (node.pendingScrollDelta !== undefined) state.scrollDrainNode = node;
  max_3 = ne;
  let de = max_3 - (node.scrollTopRendered ?? max_3);
  if (de !== 0)
    state.followScroll = {
      delta: de,
      viewportLeft: Math.floor(x),
      viewportRight: Math.floor(x + width) - 1,
      viewportTop,
      viewportBottom: viewportTop + viewportHeight - 1,
    };
  node.scrollTopRendered = max_3;
  return max_3;
}
//@ chunk-bzr73sfg.js:306340-306762 layout
/**
 * 给有 backgroundColor 或 opaque 的 box 在边框内填空格（带背景色）；opaque 还会清掉该区域的 noSelect。
 */
function fillBoxBackground(node, yogaNode, output, x, y, width, height) {
  if (node.style.opaque)
    output.clearNoSelect({
      x: Math.floor(x),
      y: Math.floor(y),
      width: Math.floor(width),
      height: Math.floor(height),
    });
  let backgroundColor = node.style.backgroundColor;
  let computedBorder = yogaNode.getComputedBorder(0);
  let computedBorder_2 = yogaNode.getComputedBorder(2);
  let computedBorder_3 = yogaNode.getComputedBorder(1);
  let computedBorder_4 = yogaNode.getComputedBorder(3);
  let U = Math.floor(width) - computedBorder - computedBorder_2;
  let L = Math.floor(height) - computedBorder_3 - computedBorder_4;
  if (U > 0 && L > 0) {
    let P = " ".repeat(U);
    let z = backgroundColor
      ? applyTextStyles(P, {
          backgroundColor,
        })
      : P;
    let joined = Array(L).fill(z).join(`
`);
    output.write(x + computedBorder, y + computedBorder_3, joined);
  }
}
//@ chunk-bzr73sfg.js:306762-307160 layout
/**
 * 是否有绝对定位子节点隐藏或位置尺寸变了（则兄弟不能从上一帧 blit）。
 */
function absoluteChildMoved(node, x, y) {
  if (!node.hasAbsoluteDescendant) return false;
  for (let childNode of node.childNodes) {
    let p = childNode;
    if (p.style.position !== "absolute") continue;
    let yogaNode = p.yogaNode;
    if (!yogaNode) continue;
    let cachedLayout = p.cachedLayout;
    if (!cachedLayout) continue;
    if (yogaNode.getDisplay() === 1) return true;
    let T = x + yogaNode.getComputedLeft();
    let A = y + yogaNode.getComputedTop();
    if (A < 0) A = 0;
    if (
      cachedLayout.x !== T ||
      cachedLayout.y !== A ||
      cachedLayout.width !== yogaNode.getComputedWidth() ||
      cachedLayout.height !== yogaNode.getComputedHeight()
    )
      return true;
  }
  return false;
}
//@ chunk-bzr73sfg.js:307160-308018 layout
/**
 * 找出被后面兄弟“越界绘制”的变化区域覆盖到的前面兄弟（它们不能 blit，需要重画）。
 */
function collectSiblingsUnderEscapingChange(node, x, y) {
  let result;
  let childNodes = node.childNodes;
  for (let idx = 1; idx < childNodes.length; idx++) {
    let E = childNodes[idx];
    if (E.hasEscapingDescendant !== true || E.style.position === "absolute") continue;
    let { yogaNode, cachedLayout } = E;
    if (!yogaNode || cachedLayout === undefined) continue;
    let D = x + yogaNode.getComputedLeft();
    let O = y + yogaNode.getComputedTop();
    if (
      !E.dirty &&
      cachedLayout.x === D &&
      cachedLayout.y === O &&
      cachedLayout.width === yogaNode.getComputedWidth() &&
      cachedLayout.height === yogaNode.getComputedHeight()
    )
      continue;
    let _ = [[E, D, O]];
    for (let U = _.pop(); U !== undefined; U = _.pop()) {
      let [L, P, z] = U;
      for (let G of L.pendingClears ?? []) result = addOverlappingSiblings(childNodes, idx, G, result);
      for (let childNode of L.childNodes) {
        if (childNode.nodeName === "#text") continue;
        let X = childNode;
        let { cachedLayout, yogaNode } = X;
        if (X.style.position === "absolute" || cachedLayout === undefined || !yogaNode) continue;
        let Y = P + yogaNode.getComputedLeft();
        let J = z + yogaNode.getComputedTop();
        if (
          X.dirty ||
          cachedLayout.x !== Y ||
          cachedLayout.y !== J ||
          cachedLayout.width !== yogaNode.getComputedWidth() ||
          cachedLayout.height !== yogaNode.getComputedHeight()
        )
          result = addOverlappingSiblings(childNodes, idx, cachedLayout, result);
        if (X.hasEscapingDescendant === true) _.push([X, Y, J]);
      }
    }
  }
  return result;
}
//@ chunk-bzr73sfg.js:308018-308233 layout
function addOverlappingSiblings(siblings, beforeIndex, rect, result) {
  for (let idx = 0; idx < beforeIndex; idx++) {
    let g = siblings[idx];
    let cachedLayout = g.cachedLayout;
    if (
      cachedLayout !== undefined &&
      g.style.position !== "absolute" &&
      rect.x < cachedLayout.x + cachedLayout.width &&
      cachedLayout.x < rect.x + rect.width &&
      rect.y < cachedLayout.y + cachedLayout.height &&
      cachedLayout.y < rect.y + rect.height
    ) {
      result ??= new Set();
      result.add(g);
    }
  }
  return result;
}
//@ chunk-bzr73sfg.js:308233-309501 fingerprint = renderChildren (0.724)
/**
 * 渲染子节点：决定每个子节点能否用上一帧 blit（前面有脏的非裁剪兄弟、绝对定位子节点移动、被越界兄弟覆盖等情况不能），统计子节点是否越出父框、互相重叠、画出自身矩形，返回是否有越界子孙。
 */
function renderChildren(
  node,
  output,
  state,
  m,
  p,
  width,
  height,
  pendingClears,
  A,
  clips,
  inheritedBackgroundColor,
  depth,
) {
  let U = A !== undefined && absoluteChildMoved(node, m, p);
  let L = A === undefined ? undefined : collectSiblingsUnderEscapingChange(node, m, p);
  let P =
    pendingClears === undefined || A === undefined
      ? undefined
      : findBlittableChildren(node, m, p, pendingClears);
  let z = false;
  let G = false;
  let X = false;
  let K = false;
  let q = false;
  let Y = 0;
  let childrenPaintingPastRect = node.childrenPaintingPastRect ?? 0;
  let V = 1 / 0;
  let ee = 1 / 0;
  let ae = -1 / 0;
  let ne = -1 / 0;
  let de = m + width;
  let se = p + height;
  for (let childNode of node.childNodes) {
    let childElem = childNode;
    let wasDirty = childElem.dirty;
    let pe = childElem.style.position === "absolute";
    if (wasDirty && !pe && overlapsBounds(childElem, m, p, V, ee, ae, ne)) node.childrenOverlap = true;
    renderNodeToOutput(childElem, output, state, {
      offsetX: m,
      offsetY: p,
      prevScreen:
        (P !== undefined && (!P.has(childElem) || overlapsAbsoluteRects(childElem, state))) ||
        z ||
        (U && !pe) ||
        L?.has(childElem) === true ||
        (G && childElem.hasEscapingDescendant === true)
          ? undefined
          : A,
      clips,
      skipSelfBlit: G && pe && !childElem.style.opaque && childElem.style.backgroundColor === undefined,
      inheritedBackgroundColor,
      depth,
    });
    if (wasDirty && !z)
      if (!clipsBothAxes(childElem) || pe) z = true;
      else G = true;
    if (!X) {
      let cachedLayout = childElem.cachedLayout;
      if (
        childElem.hasEscapingDescendant ||
        (cachedLayout !== undefined &&
          !pe &&
          (cachedLayout.x < m ||
            cachedLayout.y < p ||
            cachedLayout.x + cachedLayout.width > de ||
            cachedLayout.y + cachedLayout.height > se))
      )
        X = true;
    }
    K ||= childElem.paintsPastRect === true;
    let cachedLayout = childElem.cachedLayout;
    if (!pe && cachedLayout !== undefined) {
      if (childElem.paintsPastRect === true) {
        Y++;
        node.childrenPaintingPastRect = childrenPaintingPastRect + Y;
      }
      q ||=
        cachedLayout.x < ae &&
        V < cachedLayout.x + cachedLayout.width &&
        cachedLayout.y < ne &&
        ee < cachedLayout.y + cachedLayout.height;
      if (q) node.childrenOverlap = true;
      if (cachedLayout.width > 0 && cachedLayout.height > 0) {
        V = Math.min(V, cachedLayout.x);
        ee = Math.min(ee, cachedLayout.y);
        ae = Math.max(ae, cachedLayout.x + cachedLayout.width);
        ne = Math.max(ne, cachedLayout.y + cachedLayout.height);
      }
    }
  }
  node.childrenOverlap = q;
  node.childrenPaintingPastRect = Y;
  node.paintsPastRect = (!clipsBothAxes(node) && (X || K)) || isDegenerateBorderBox(node, width, height);
  return X;
}
//@ chunk-bzr73sfg.js:309501-310867 sole-consumer
/**
 * 父节点有 pendingClears 时，找出仍可安全 blit 的子节点（不与被清区域、越界兄弟重叠的未脏子节点）。
 */
function findBlittableChildren(node, x, y, pendingClears) {
  let result = new Set();
  let g = [];
  let E = node;
  for (
    let parentNode = node.parentNode;
    parentNode !== undefined;
    E = parentNode, parentNode = parentNode.parentNode
  ) {
    let z = E.style.position !== "absolute" && E.paintsPastRect === true;
    if (parentNode.childrenOverlap !== false || (parentNode.childrenPaintingPastRect ?? 0) > (z ? 1 : 0))
      return result;
    if (z) g.push(E);
  }
  let T = 1 / 0;
  for (let pendingClear of pendingClears) T = Math.min(T, rowSpan(pendingClear).top);
  let filtered = node.childNodes.filter(isDOMElement);
  let D = Array(filtered.length);
  let O = Array(filtered.length);
  for (let idx = 0; idx < filtered.length; idx++) {
    let z = filtered[idx];
    let { cachedLayout, yogaNode } = z;
    let K = yogaNode !== undefined && yogaNode.getDisplay() !== 1;
    let q = K ? y + yogaNode.getComputedTop() : 0;
    let Y = K
      ? rowSpan({
          y: q,
          height: yogaNode.getComputedHeight(),
        })
      : undefined;
    if (
      z.style.position !== "absolute" &&
      z.paintsPastRect === true &&
      (z.dirty ||
        cachedLayout === undefined ||
        !K ||
        cachedLayout.x !== x + yogaNode.getComputedLeft() ||
        cachedLayout.y !== q ||
        cachedLayout.width !== yogaNode.getComputedWidth() ||
        cachedLayout.height !== yogaNode.getComputedHeight())
    )
      return result;
    let J = 1 / 0;
    let V = -1 / 0;
    if (z.style.position !== "absolute") {
      if (cachedLayout !== undefined) ({ top: J, bottom: V } = rowSpan(cachedLayout));
      if (Y !== undefined) {
        J = Math.min(J, Y.top);
        V = Math.max(V, Y.bottom);
      }
    }
    D[idx] = J;
    O[idx] = V;
  }
  let _ = Array(filtered.length);
  let U = 1 / 0;
  for (let idx = filtered.length - 1; idx >= 0; idx--) {
    _[idx] = U;
    U = Math.min(U, D[idx]);
  }
  let L = -1 / 0;
  for (let idx = 0; idx < filtered.length; idx++) {
    let z = filtered[idx];
    let cachedLayout = z.cachedLayout;
    if (
      z.style.position !== "absolute" &&
      !z.dirty &&
      z.pendingScrollDelta === undefined &&
      cachedLayout !== undefined &&
      cachedLayout.height > 0 &&
      z.yogaNode?.getComputedHeight() !== 0 &&
      z.hasAbsoluteDescendant !== true &&
      z.paintsPastRect !== true &&
      O[idx] <= T &&
      L <= D[idx] &&
      _[idx] >= O[idx] &&
      g.every((X) => X.cachedLayout !== undefined && rectContains(cachedLayout, X.cachedLayout))
    )
      result.add(z);
    L = Math.max(L, O[idx]);
  }
  return result;
}
//@ chunk-bzr73sfg.js:310867-310990 sole-consumer
function rowSpan(rect) {
  let floored = Math.floor(rect.y);
  if (rect.height > 0)
    return {
      top: floored,
      bottom: Math.ceil(rect.y + rect.height),
    };
  return {
    top: floored - 1,
    bottom: floored + 1,
  };
}
//@ chunk-bzr73sfg.js:311083-311290 sole-consumer
function overlapsBounds(childElem, u, f, m, p, g, E) {
  let yogaNode = childElem.yogaNode;
  if (yogaNode === undefined || yogaNode.getDisplay() === 1) return false;
  let A = u + yogaNode.getComputedLeft();
  let D = f + yogaNode.getComputedTop();
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
  if (cachedLayout === undefined) return false;
  return (
    anyRectOverlaps(state.absoluteRectsPrev, cachedLayout) ||
    anyRectOverlaps(state.absoluteRectsCur, cachedLayout)
  );
}
//@ chunk-bzr73sfg.js:311507-311681 sole-consumer = unionRect (0.777)
function anyRectOverlaps(rects, rect) {
  for (let rect_2 of rects) {
    let m = rect_2.width > 0 && rect_2.height > 0 ? 0 : 1;
    if (
      rect_2.escapes ||
      (rect_2.x - m < rect.x + rect.width &&
        rect.x < rect_2.x + rect_2.width + m &&
        rect_2.y - m < rect.y + rect.height &&
        rect.y < rect_2.y + rect_2.height + m)
    )
      return true;
  }
  return false;
}
//@ chunk-bzr73sfg.js:311681-312056 sole-consumer
/**
 * overflow hidden/scroll 的 box 的裁剪矩形（边框内侧），两个方向都不裁剪时返回 undefined。
 */
function getOverflowClip(node, yogaNode, x, y) {
  let overflowX = node.style.overflowX ?? node.style.overflow;
  let overflowY = node.style.overflowY ?? node.style.overflow;
  let E = overflowX === "hidden" || overflowX === "scroll";
  let T = overflowY === "hidden" || overflowY === "scroll";
  if (!E && !T) return;
  return {
    x1: E ? x + yogaNode.getComputedBorder(0) : undefined,
    x2: E ? x + yogaNode.getComputedWidth() - yogaNode.getComputedBorder(2) : undefined,
    y1: T ? y + yogaNode.getComputedBorder(1) : undefined,
    y2: T ? y + yogaNode.getComputedHeight() - yogaNode.getComputedBorder(3) : undefined,
  };
}
//@ chunk-bzr73sfg.js:312056-312306 sole-consumer = intersectClip (0.813)
/**
 * 维护 {now, before, grew}：本帧与上一帧各自的累积裁剪区，grew 表示裁剪区比上一帧大（之前被裁掉的部分需要重画，不能 blit）。
 */
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
    return {
      now: m,
      before: m,
      grew: false,
    };
  let p = prevClip ? intersectClip(clips?.before, prevClip) : clips?.before;
  return {
    now: m,
    before: p,
    grew: !isClipRedundant(m, p),
  };
}
//@ chunk-bzr73sfg.js:312306-312543 sole-consumer
function clipBlocksBlit(node, cachedLayout, clips) {
  if (cachedLayout.unpainted) return true;
  return (
    clips !== undefined &&
    clips.grew &&
    (node.hasAbsoluteDescendant === true ||
      node.paintsPastRect === true ||
      !isClipRedundant(clips.now, clips.before, {
        x: Math.floor(cachedLayout.x),
        y: Math.floor(cachedLayout.y),
        width: Math.floor(cachedLayout.width),
        height: Math.floor(cachedLayout.height),
      }))
  );
}
//@ chunk-bzr73sfg.js:312543-312644 sole-consumer
function clipsAllowScrollBlit(clips, cached, f) {
  return (
    cached?.unpainted !== true &&
    (clips === undefined ||
      (isClipRedundant(undefined, clips.before, cached) && isClipRedundant(undefined, clips.now, f)))
  );
}
//@ chunk-bzr73sfg.js:312644-312804 fingerprint = clipsBothAxes (1)
/**
 * 节点在 X、Y 两个方向都裁剪（overflow hidden/scroll）。
 */
function clipsBothAxes(node) {
  let u = node.style.overflowX ?? node.style.overflow;
  let f = node.style.overflowY ?? node.style.overflow;
  return (u === "hidden" || u === "scroll") && (f === "hidden" || f === "scroll");
}
//@ chunk-bzr73sfg.js:312804-313103 fingerprint = siblingSharesY (1)
/**
 * 零高度节点是否与相邻兄弟同一行（这种节点只更新缓存位置，不绘制）。
 */
function siblingSharesY(node, yogaNode) {
  let parent = node.parentNode;
  if (!parent) return false;
  let myTop = yogaNode.getComputedTop();
  let siblings = parent.childNodes;
  let idx = siblings.indexOf(node);
  for (let i = idx + 1; i < siblings.length; i++) {
    let sib = siblings[i].yogaNode;
    if (!sib) continue;
    return sib.getComputedTop() === myTop;
  }
  for (let i = idx - 1; i >= 0; i--) {
    let sib = siblings[i].yogaNode;
    if (!sib) continue;
    return sib.getComputedTop() === myTop;
  }
  return false;
}
//@ chunk-bzr73sfg.js:313103-313827 fingerprint = blitEscapingAbsoluteDescendants (0.684)
/**
 * 节点整体 blit 后，再把越出它矩形的绝对定位子孙（及越界子孙）也从上一帧拷过来，并登记绝对定位矩形。
 */
function blitEscapingAbsoluteDescendants(node, output, state, prevScreen, p, g, E, T) {
  if (!node.hasAbsoluteDescendant && !node.hasEscapingDescendant) return;
  let A = p + E;
  let D = g + T;
  let O = [];
  let _ = [];
  let U = (L, P) => {
    let childNodes = L.childNodes;
    for (let idx = childNodes.length - 1; idx >= 0; idx--) {
      let X = childNodes[idx];
      if (X.nodeName !== "#text") {
        O.push(X);
        _.push(P);
      }
    }
  };
  U(node, node.hasEscapingDescendant === true);
  for (let node = O.pop(); node !== undefined; node = O.pop()) {
    let P = _.pop();
    let cachedLayout = node.cachedLayout;
    if (cachedLayout && !cachedLayout.unpainted) {
      let X = node.style.position === "absolute";
      if (X) {
        let cachedLayout_2 = node.parentNode?.cachedLayout;
        state.absoluteRectsCur.push(
          makeAbsoluteRect(node, cachedLayout, cachedLayout_2?.x, cachedLayout_2?.y),
        );
      }
      if (X || P) {
        let cx = Math.floor(cachedLayout.x);
        let cy = Math.floor(cachedLayout.y);
        let cw = Math.floor(cachedLayout.width);
        let ch = Math.floor(cachedLayout.height);
        if (cx < p || cy < g || cx + cw > A || cy + ch > D)
          output.blit(prevScreen, cx, cy, cw, ch, {
            restoreNoSelect: node.style.opaque,
          });
      }
    }
    let G = P && node.hasEscapingDescendant === true;
    if (node.hasAbsoluteDescendant || G) U(node, G);
  }
}
//@ chunk-bzr73sfg.js:313827-314142 fingerprint = renderScrolledChildren (0.842)
/**
 * 渲染滚动容器的内容子节点：完全在 [top,bottom) 可见范围外的跳过（并丢弃其缓存）；有子节点变脏后，后续子节点不再 blit。
 */
function renderScrolledChildren(
  node,
  output,
  state,
  offsetX,
  offsetY,
  hadPendingClears,
  E,
  clips,
  A,
  D,
  inheritedBackgroundColor,
  depth,
  U = false,
) {
  let seenDirtyChild = false;
  for (let childNode of node.childNodes) {
    let childElem = childNode;
    let cy = childElem.yogaNode;
    if (cy) {
      let computedTop = cy.getComputedTop();
      if (computedTop + cy.getComputedHeight() <= A || computedTop >= D) {
        if (!U) dropSubtreeCache(childElem);
        continue;
      }
    }
    let wasDirty = childElem.dirty;
    renderNodeToOutput(childElem, output, state, {
      offsetX,
      offsetY,
      prevScreen: hadPendingClears || seenDirtyChild ? undefined : E,
      clips,
      inheritedBackgroundColor,
      depth,
    });
    if (wasDirty) seenDirtyChild = true;
  }
}
//@ chunk-bzr73sfg.js:314142-314361 shared-adjacent = dropSubtreeCache (0.809)
/**
 * 清掉子树所有节点的 cachedLayout（下一帧不能 blit、命中测试也找不到）。
 */
function dropSubtreeCache(node) {
  if (node.cachedLayout === undefined) return;
  let u = [node];
  for (let f = u.pop(); f !== undefined; f = u.pop()) {
    f.cachedLayout = undefined;
    let childNodes = f.childNodes;
    for (let idx = childNodes.length - 1; idx >= 0; idx--) {
      let g = childNodes[idx];
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
