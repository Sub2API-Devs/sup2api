/**
 * ink/render-node-to-output.ts
 *
 * 并入已有模块：节点渲染到输出的补充。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/render-node-to-output.ts
 * pieces: chunk-2avr6cej.js (49)
 * attribution: fingerprint 11, placement 8, layout 18, file-local 1, sole-consumer 10, shared-adjacent 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { walkTabbable } from "./focus.js";
import { ESC } from "./termio/ansi.js";
import { applyTextStyles, levelGeneration } from "./colorize.js";
import { SoftWrapKind } from "./screen.js";
import { tokenizeAll } from "./termio/tokenize.js";
import { wrapText, truncate } from "./wrap-text.js";
import { widestLine, recordScrollOut } from "./widest-line.js";
import { needsTextNormalization, regExp_2 } from "./layout/node.js";
import { indentString } from "../../vendor/indent-string/index.js";
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
import { applyBackgroundColor } from "../utils/theme.js";
import { ELLIPSIS } from "./styles.js";

//@ chunk-2avr6cej.js:181811-181880 fingerprint (2.1.88 match: wrapWithSoftWrap, 0.609)
/**
 * textWrap 是否是折行类（wrap、wrap-trim、wrap-stream），而不是截断类。
 */
function isSoftWrapMode(textWrap) {
  return textWrap === "wrap" || textWrap === "wrap-trim" || textWrap === "wrap-stream";
}
//@ chunk-2avr6cej.js:193423-193464 placement
/**
 * 按文档顺序收集子树里所有可 Tab 聚焦的元素。
 */
function collectTabbable(root) {
  let result = [];
  walkTabbable(root, result);
  return result;
}
//@ chunk-2avr6cej.js:292075-292190 placement
function hasAbsoluteAncestor(node) {
  for (let parentNode = node.parentNode; parentNode !== undefined; parentNode = parentNode.parentNode)
    if (parentNode.style.position === "absolute") return true;
  return false;
}
//@ chunk-2avr6cej.js:292190-292479 placement
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
//@ chunk-2avr6cej.js:292479-292719 placement
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
//@ chunk-2avr6cej.js:292719-292916 placement
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
//@ chunk-2avr6cej.js:292916-293104 placement
/**
 * 上一帧越出父框的绝对定位矩形本帧没再出现、却被本帧的 blit 覆盖到了（可能拷回旧图像），需要下一帧整树重画。
 */
function hasStaleAbsolutePaint(state, output) {
  let absoluteRectsCur = state.absoluteRectsCur;
  return state.absoluteRectsPrev.some(
    (previousRect) =>
      !previousRect.withinParent &&
      !absoluteRectsCur.some(
        (currentRect) =>
          currentRect.x === previousRect.x &&
          currentRect.y === previousRect.y &&
          currentRect.width === previousRect.width &&
          currentRect.height === previousRect.height,
      ) &&
      output.blitsOver(previousRect),
  );
}
//@ chunk-2avr6cej.js:293104-293197 layout
function isDescendantOfNode(node, ancestor) {
  for (let parentNode = node.parentNode; parentNode !== undefined; parentNode = parentNode.parentNode)
    if (parentNode === ancestor) return true;
  return false;
}
//@ chunk-2avr6cej.js:293197-293233 layout
var PROPORTIONAL_DRAIN_MIN = 4;
var ADAPTIVE_INSTANT_MAX = 5;
var ADAPTIVE_SLOW_MAX = 12;
var ADAPTIVE_STEP_MEDIUM = 2;
var ADAPTIVE_STEP_LARGE = 3;
var ADAPTIVE_BACKLOG_MAX = 30;
//@ chunk-2avr6cej.js:293233-293487 fingerprint (2.1.88 match: drainAdaptive, 1)
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
//@ chunk-2avr6cej.js:293487-293670 layout (2.1.88 match: drainAdaptive, 1)
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
//@ chunk-2avr6cej.js:293670-293695 layout
var OSC = "\x1B]";
var BEL = "\x07";
//@ chunk-2avr6cej.js:293695-293755 fingerprint (2.1.88 match: wrapWithOsc8Link, 1)
/**
 * 用 OSC 8 把文本包成超链接。
 */
function wrapWithOsc8Link(text, url) {
  return `${OSC}8;;${url}${BEL}${text}${OSC}8;;${BEL}`;
}
//@ chunk-2avr6cej.js:293755-294061 layout
/**
 * 为压平的文本段建“字符下标 → 段号”表（复用 state 里的 Uint32Array），折行后据此给每个字符还原样式。
 */
function buildCharToSegmentIndex(state, segments) {
  let totalChars = 0;
  for (let idx = 0; idx < segments.length; idx++) totalChars += segments[idx].text.length;
  if (state.segmentMapScratch.length < totalChars)
    state.segmentMapScratch = new Uint32Array(Math.max(totalChars, state.segmentMapScratch.length * 2));
  let map = state.segmentMapScratch.subarray(0, totalChars);
  let charIndex = 0;
  for (let idx = 0; idx < segments.length; idx++) {
    let runEnd = charIndex + segments[idx].text.length;
    map.fill(idx, charIndex, runEnd);
    charIndex = runEnd;
  }
  return map;
}
//@ chunk-2avr6cej.js:294061-295129 fingerprint (2.1.88 match: applyStylesToWrappedText, 0.78)
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
  let ansiEnds = originalPlain.includes(ESC) ? mapAnsiSequenceEnds(originalPlain) : undefined;
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
    let lineAnsiEnds = text.includes(ESC) ? mapAnsiSequenceEnds(text) : undefined;
    for (let idx = 0; idx < text.length; idx++) {
      let ansiEnd = lineAnsiEnds?.get(idx);
      let charStep = 1;
      if (ansiEnd !== undefined) {
        let needle = text.slice(idx, ansiEnd);
        if (trimEnabled) charIndex = skipWhitespaceTo(originalPlain, charIndex, needle);
        idx = ansiEnd - 1;
        if (!originalPlain.startsWith(needle, charIndex)) continue;
        charStep = needle.length;
      } else {
        for (let skipTo = ansiEnds?.get(charIndex); skipTo !== undefined; skipTo = ansiEnds?.get(charIndex))
          charIndex = skipTo;
        if (trimEnabled && text[idx] !== originalPlain[charIndex])
          charIndex = skipWhitespaceTo(originalPlain, charIndex, text[idx]);
      }
      let segmentIndex = charToSegment[charIndex] ?? runSegmentIndex;
      if (segmentIndex !== runSegmentIndex) {
        let runEndIndex = idx + 1 - charStep;
        let runText = text.slice(runStart, runEndIndex);
        let segment = segments[runSegmentIndex];
        if (segment) {
          let styled = applyTextStyles(runText, segment.styles);
          if (segment.hyperlink) styled = wrapWithOsc8Link(styled, segment.hyperlink);
          styledLine += styled;
        } else styledLine += runText;
        runStart = runEndIndex;
        runSegmentIndex = segmentIndex;
      }
      charIndex += charStep;
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
//@ chunk-2avr6cej.js:295129-295253 layout
function mapAnsiSequenceEnds(text) {
  let ends = new Map();
  let offset = 0;
  for (let token of tokenizeAll(text)) {
    let nextOffset = offset + token.value.length;
    if (token.type === "sequence") ends.set(offset, nextOffset);
    offset = nextOffset;
  }
  return ends;
}
//@ chunk-2avr6cej.js:295253-295347 file-local
function skipWhitespaceTo(originalPlain, charIndex, needle) {
  let scanIndex = charIndex;
  while (scanIndex < originalPlain.length && /\s/.test(originalPlain[scanIndex])) scanIndex++;
  return originalPlain.startsWith(needle, scanIndex) ? scanIndex : charIndex;
}
//@ chunk-2avr6cej.js:295347-295826 layout
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
  let wrapMode = isStream ? "wrap" : textWrap;
  let lines = text.replace(
    /\r\n?/g,
    `
`,
  ).split(`
`);
  let lines_2 = [];
  let softWrap = [];
  for (let orig of lines) {
    let pieces = wrapText(orig, maxWidth, wrapMode).split(`
`);
    for (let i = 0; i < pieces.length; i++) {
      if (i === 0) {
        lines_2.push(pieces[i]);
        softWrap.push(SoftWrapKind.HardBreak);
        continue;
      }
      let piece = pieces[i];
      let trimmedPiece = piece.startsWith(" ") ? piece.slice(1) : piece;
      let lineText = widestLine(trimmedPiece) > 0 ? trimmedPiece : piece;
      lines_2.push(lineText);
      softWrap.push(
        lineText.length < piece.length ? SoftWrapKind.ContinuationElidedSep : SoftWrapKind.Continuation,
      );
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
//@ chunk-2avr6cej.js:295826-296012 layout
/**
 * 折行；若行数与 yoga 计算的高度不一致，改用测量时实际给出的宽度（getOfferedWidth）重折，保证与布局一致。
 */
function wrapForYogaNode(text, maxWidth, textWrap, yogaNode) {
  let result = wrapWithSoftWrap(text, maxWidth, textWrap);
  if (result.softWrap === undefined || result.softWrap.length === yogaNode.getComputedHeight()) return result;
  let maxWidth_2 = yogaNode.getOfferedWidth(maxWidth, yogaNode.getComputedHeight());
  return maxWidth_2 === maxWidth ? result : wrapWithSoftWrap(text, maxWidth_2, textWrap);
}
//@ chunk-2avr6cej.js:296012-296153 layout
function joinSegmentTexts(segments) {
  let texts = segments.map((segment) => segment.text);
  let normalized = needsTextNormalization(texts);
  if (normalized === undefined) return texts.join("");
  for (let [index, segment] of segments.entries()) segment.text = normalized[index] ?? "";
  return normalized.join("");
}
//@ chunk-2avr6cej.js:296153-296342 fingerprint (2.1.88 match: applyPaddingToText, 0.915)
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
//@ chunk-2avr6cej.js:296342-296518 layout
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
//@ chunk-2avr6cej.js:296518-296618 layout
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
//@ chunk-2avr6cej.js:296618-296748 layout
function paintsPastWidth(output, text, x, width) {
  let floored = Math.floor(width);
  for (let line of text.split(`
`))
    if ((regExp_2.test(line) ? output.paintedWidth(line, x) : bunStringWidth(line)) > floored) return true;
  return false;
}
//@ chunk-2avr6cej.js:296748-296879 layout
function paintsPastHeight(text, y, height) {
  let lineCount = text === "" ? 0 : 1;
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
    lineCount++;
  return Math.floor(y) + lineCount > Math.ceil(y + height);
}
//@ chunk-2avr6cej.js:296879-304124 fingerprint (2.1.88 match: renderNodeToOutput, 0.712)
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
          let wrapped = wrapForYogaNode(plainText, maxWidth, textWrap, yogaNode);
          softWrap = wrapped.softWrap;
          text = wrapped.wrapped
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
          let wrapped = wrapForYogaNode(plainText, maxWidth, textWrap, yogaNode);
          softWrap = wrapped.softWrap;
          let charToSegment = buildCharToSegmentIndex(state, segments);
          text = applyStylesToWrappedText(
            wrapped.wrapped,
            segments,
            charToSegment,
            plainText,
            textWrap === "wrap-trim",
            wrapped.softWrap,
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
      let hasClip = clip !== undefined;
      let y1 = clip?.y1;
      let y2 = clip?.y2;
      if (clip) output.clip(clip);
      let clips_2 = prevScreen ? advanceClips(clips, clip, cached?.clip) : clips;
      let flagE = false;
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
        let top = resolveScrollTop(
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
          let offsetY = y + contentYoga.getComputedTop() - top;
          let cachedLayout = content.cachedLayout;
          let hint = null;
          let floored = Math.floor(viewportTop);
          let isExactScrollDelta = false;
          if (cachedLayout && cachedLayout.y !== offsetY) {
            let scrollDelta = cachedLayout.y - offsetY;
            let regionTop = Math.floor(y1 ?? y);
            let spansFullWidth = Math.floor(x) <= 0 && Math.floor(x + width) >= output.width;
            let viewportDelta = innerHeight - scrollViewportHeight;
            isExactScrollDelta =
              cached !== undefined &&
              viewportDelta !== 0 &&
              height - cached.height === viewportDelta &&
              scrollDelta === -viewportDelta;
            let bottom =
              floored + (isExactScrollDelta ? Math.max(innerHeight, scrollViewportHeight) : innerHeight) - 1;
            if (
              spansFullWidth &&
              cached?.y === y &&
              cached.x === x &&
              cached.width === width &&
              cachedLayout.x === offsetX &&
              cachedLayout.width === contentYoga.getComputedWidth() &&
              (cached.height === height || isExactScrollDelta) &&
              innerHeight > 0 &&
              Math.abs(scrollDelta) <
                (isExactScrollDelta ? Math.min(innerHeight, scrollViewportHeight) : innerHeight) &&
              padTop === 0
            ) {
              hint = {
                top: regionTop,
                bottom,
                delta: scrollDelta,
              };
              state.scrollHint = hint;
            } else state.layoutShifted = true;
          }
          let scrollHeight = contentYoga.getComputedHeight();
          let prevHeight = cachedLayout?.height ?? scrollHeight;
          let heightDelta = scrollHeight - prevHeight;
          let heightConsistent = !hint || heightDelta === 0 || (hint.delta > 0 && heightDelta === hint.delta);
          let any = state.absoluteRectsPrev.some((rect) => isDescendantOfNode(rect.node, content));
          let hasEscapingPaint =
            hint !== null &&
            content.childNodes.some(
              (childNode) =>
                childNode.nodeName !== "#text" &&
                childNode.paintsPastRect === true &&
                childNode.cachedLayout !== undefined,
            );
          let canShiftBlit =
            prevScreen &&
            heightConsistent &&
            !state.overlayActive &&
            !any &&
            cached?.background === inheritedBackgroundColor &&
            !hasEscapingPaint &&
            clipsAllowScrollBlit(clips, cached, {
              x,
              y,
              width,
              height,
            });
          if (hint && !canShiftBlit) state.scrollHint = null;
          if (hint && canShiftBlit) {
            let { top: top_2, bottom, delta } = hint;
            let floored_2 = Math.floor(width);
            let blankLine = " ".repeat(floored_2);
            let absoluteCountBefore = state.absoluteRectsCur.length;
            let clippedTop = 0;
            if (delta > 0 && floored > top_2)
              for (let childNode of content.childNodes) {
                let yogaNode = childNode.yogaNode;
                if (!yogaNode) continue;
                let computedTop = yogaNode.getComputedTop();
                if (computedTop + yogaNode.getComputedHeight() > top) {
                  clippedTop = Math.max(0, Math.min(floored - top_2, top - computedTop));
                  break;
                }
              }
            let screenBottom = floored + innerHeight - 1;
            let blitBottom = isExactScrollDelta ? floored + scrollViewportHeight - 1 : screenBottom;
            let blitTop = floored + Math.max(0, delta) - clippedTop;
            let min = Math.min(blitBottom, screenBottom + delta);
            output.blit(prevScreen, Math.floor(x), blitTop, floored_2, min - blitTop + 1, {
              unclipped: min > screenBottom,
            });
            output.shift(top_2, bottom, delta);
            let freshTop = delta > 0 ? min - delta + 1 : floored;
            let edgeBottom = delta > 0 ? screenBottom : floored - delta - 1;
            let dirtyChildren;
            let shiftedNodes;
            let coveredRows = content.dirty ? new Uint8Array(bottom - top_2 + 1) : undefined;
            for (let childNode of content.childNodes) {
              let node = childNode;
              let cy = node.yogaNode;
              if (!cy) continue;
              let cachedLayout = node.cachedLayout;
              let childTop = cy.getComputedTop();
              let childH = cy.getComputedHeight();
              if (childTop + childH <= top || childTop >= top + innerHeight) {
                dropSubtreeCache(node);
                continue;
              }
              if (cachedLayout) {
                let stillMatches =
                  Math.floor(cachedLayout.y) - delta === Math.floor(offsetY + childTop) &&
                  cachedLayout.height === childH;
                shiftCachedLayouts(node, -delta);
                if (stillMatches && !node.dirty) {
                  let rowOffsetInParent = Math.floor(cachedLayout.y) - top_2;
                  coveredRows?.fill(
                    1,
                    Math.max(rowOffsetInParent, 0),
                    Math.max(rowOffsetInParent + childH, 0),
                  );
                  continue;
                }
              }
              if (
                childH > 0 &&
                Math.max(childTop, top) >= freshTop - offsetY &&
                Math.min(childTop + childH, top + innerHeight) <= edgeBottom + 1 - offsetY
              )
                continue;
              dirtyChildren = pushOrCreate(dirtyChildren, node);
              if (!node.dirty) shiftedNodes = pushOrCreate(shiftedNodes, node);
            }
            if (coveredRows) {
              for (let idx = 0; idx < coveredRows.length; idx++)
                if (coveredRows[idx] === 0)
                  output.write(Math.floor(x), top_2 + idx, blankLine, HARD_BREAK_ONLY);
            }
            if (freshTop <= edgeBottom) {
              let clearTop = delta < 0 ? top_2 : freshTop;
              output.clear({
                x: Math.floor(x),
                y: clearTop,
                width: floored_2,
                height: edgeBottom - clearTop + 1,
              });
              output.clip({
                x1: undefined,
                x2: undefined,
                y1: clearTop,
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
                freshTop - offsetY,
                edgeBottom + 1 - offsetY,
                boxBackgroundColor,
                depth + 2,
                true,
              );
              output.unclip();
            }
            if (dirtyChildren)
              for (let child of dirtyChildren) {
                let yogaNode = child.yogaNode;
                if (!yogaNode) continue;
                let computedTop = yogaNode.getComputedTop();
                let shiftedTop = Math.max(
                  Math.floor(offsetY + computedTop),
                  delta < 0 ? edgeBottom + 1 : -1 / 0,
                );
                let screenBottom = Math.min(
                  Math.floor(offsetY + computedTop + yogaNode.getComputedHeight()),
                  Math.floor((y1 ?? y) + computedPadding + innerHeight),
                  delta > 0 ? freshTop : 1 / 0,
                );
                if (shiftedTop < screenBottom) {
                  let fill = Array(screenBottom - shiftedTop).fill(blankLine).join(`
`);
                  output.write(Math.floor(x), shiftedTop, fill, HARD_BREAK_ONLY);
                }
                output.clip({
                  x1: undefined,
                  x2: undefined,
                  y1: shiftedTop,
                  y2: Math.max(shiftedTop, screenBottom),
                });
                renderNodeToOutput(child, output, state, {
                  offsetX,
                  offsetY,
                  prevScreen: undefined,
                  inheritedBackgroundColor: boxBackgroundColor,
                  depth: depth + 2,
                });
                output.unclip();
              }
            for (let rect of state.absoluteRectsPrev) {
              if (rect.y >= bottom + 1 || rect.y + rect.height <= top_2) continue;
              let shiftedTop = Math.max(top_2, Math.floor(rect.y) - delta);
              let shiftedBottom = Math.min(bottom + 1, Math.floor(rect.y + rect.height) - delta);
              if (shiftedTop >= freshTop && shiftedBottom <= edgeBottom + 1) continue;
              if (shiftedTop >= shiftedBottom) continue;
              let fill = Array(shiftedBottom - shiftedTop).fill(blankLine).join(`
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
            clearShiftedFlags(shiftedNodes);
            for (let index = absoluteCountBefore; index < state.absoluteRectsCur.length; index++)
              if (!state.absoluteRectsCur[index].withinParent) {
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
              top,
              top + innerHeight,
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
        flagE = renderChildren(
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
      if (hasClip) output.unclip();
      node.hasEscapingDescendant = hasClip ? false : flagE;
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
//@ chunk-2avr6cej.js:304124-305921 layout
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
      let anchorTop = computedTop + node.scrollAnchor.offset;
      let anchorBottom = computedTop + yogaNode.getComputedHeight() - viewportHeight;
      switch (node.scrollAnchor.block) {
        case "nearest":
          node.scrollTop = Math.min(Math.max(node.scrollTop ?? 0, anchorBottom), anchorTop);
          break;
        case "end":
          node.scrollTop = Math.max(0, Math.min(anchorBottom, anchorTop));
          break;
        case "center":
          node.scrollTop = Math.max(0, Math.min(Math.floor((anchorBottom + anchorTop) / 2), anchorTop));
          break;
        case "start":
          node.scrollTop = anchorTop;
          break;
      }
      node.pendingScrollDelta = undefined;
    }
    node.scrollAnchor = undefined;
  }
  let prevScrollTop = node.scrollTop ?? 0;
  let stickyScroll = node.attributes.stickyScroll;
  let sticky = node.stickyScroll ?? Boolean(stickyScroll);
  let previousHeight = sticky ? prevContentHeight : Math.max(node.scrollHeightHwm ?? 0, prevContentHeight);
  node.scrollHeightHwm = sticky ? undefined : Math.max(previousHeight, contentHeight);
  let max = Math.max(0, previousHeight - prevViewportHeight);
  let grew = contentHeight >= prevContentHeight;
  let followsGrowth = node.attributes.followGrowth !== false;
  if (
    (sticky || (stickyScroll !== false && followsGrowth && grew && prevScrollTop >= max)) &&
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
  let hasClampBounds = scrollClampMin !== undefined && scrollClampMax !== undefined;
  if (pendingScrollDelta !== undefined && pendingScrollDelta !== 0) {
    let innerHeight =
      hasClampBounds &&
      ((pendingScrollDelta < 0 && scrollTop < scrollClampMin) ||
        (pendingScrollDelta > 0 && scrollTop > scrollClampMax))
        ? Math.min(4, viewportHeight >> 3)
        : viewportHeight;
    let useAdaptiveDrain = hasCursorUpViewportYankBug().useAdaptiveDrain;
    let drained = useAdaptiveDrain
      ? drainAdaptive(node, pendingScrollDelta, innerHeight)
      : drainProportional(node, pendingScrollDelta, innerHeight);
    scrollTop += drained;
    recordScrollOut(drained, node.pendingScrollDelta ?? 0, useAdaptiveDrain ? "adaptive" : "proportional");
  } else if (pendingScrollDelta === 0) node.pendingScrollDelta = undefined;
  let max_2 = Math.max(0, Math.min(scrollTop, Math.max(maxScroll, previousHeight - viewportHeight)));
  let max_3 = Math.max(0, Math.min(scrollTop, maxScroll));
  let clampedScroll =
    hasClampBounds && !sticky ? Math.max(scrollClampMin, Math.min(max_3, scrollClampMax)) : max_3;
  node.scrollTop = max_2;
  if (max_2 !== scrollTop) node.pendingScrollDelta = undefined;
  if (node.pendingScrollDelta !== undefined) state.scrollDrainNode = node;
  max_3 = clampedScroll;
  let renderDelta = max_3 - (node.scrollTopRendered ?? max_3);
  if (renderDelta !== 0)
    state.followScroll = {
      delta: renderDelta,
      viewportLeft: Math.floor(x),
      viewportRight: Math.floor(x + width) - 1,
      viewportTop,
      viewportBottom: viewportTop + viewportHeight - 1,
    };
  node.scrollTopRendered = max_3;
  return max_3;
}
//@ chunk-2avr6cej.js:305921-306343 layout
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
  let innerWidth = Math.floor(width) - computedBorder - computedBorder_2;
  let innerHeight = Math.floor(height) - computedBorder_3 - computedBorder_4;
  if (innerWidth > 0 && innerHeight > 0) {
    let blankLine = " ".repeat(innerWidth);
    let styledLine = backgroundColor
      ? applyTextStyles(blankLine, {
          backgroundColor,
        })
      : blankLine;
    let joined = Array(innerHeight).fill(styledLine).join(`
`);
    output.write(x + computedBorder, y + computedBorder_3, joined);
  }
}
//@ chunk-2avr6cej.js:306343-306741 layout
/**
 * 是否有绝对定位子节点隐藏或位置尺寸变了（则兄弟不能从上一帧 blit）。
 */
function absoluteChildMoved(node, x, y) {
  if (!node.hasAbsoluteDescendant) return false;
  for (let childNode of node.childNodes) {
    let childNode_2 = childNode;
    if (childNode_2.style.position !== "absolute") continue;
    let yogaNode = childNode_2.yogaNode;
    if (!yogaNode) continue;
    let cachedLayout = childNode_2.cachedLayout;
    if (!cachedLayout) continue;
    if (yogaNode.getDisplay() === 1) return true;
    let childX = x + yogaNode.getComputedLeft();
    let childY = y + yogaNode.getComputedTop();
    if (childY < 0) childY = 0;
    if (
      cachedLayout.x !== childX ||
      cachedLayout.y !== childY ||
      cachedLayout.width !== yogaNode.getComputedWidth() ||
      cachedLayout.height !== yogaNode.getComputedHeight()
    )
      return true;
  }
  return false;
}
//@ chunk-2avr6cej.js:306741-307599 layout
/**
 * 找出被后面兄弟“越界绘制”的变化区域覆盖到的前面兄弟（它们不能 blit，需要重画）。
 */
function collectSiblingsUnderEscapingChange(node, x, y) {
  let result;
  let childNodes = node.childNodes;
  for (let idx = 1; idx < childNodes.length; idx++) {
    let sibling = childNodes[idx];
    if (sibling.hasEscapingDescendant !== true || sibling.style.position === "absolute") continue;
    let { yogaNode, cachedLayout } = sibling;
    if (!yogaNode || cachedLayout === undefined) continue;
    let nextX = x + yogaNode.getComputedLeft();
    let nextY = y + yogaNode.getComputedTop();
    if (
      !sibling.dirty &&
      cachedLayout.x === nextX &&
      cachedLayout.y === nextY &&
      cachedLayout.width === yogaNode.getComputedWidth() &&
      cachedLayout.height === yogaNode.getComputedHeight()
    )
      continue;
    let stack = [[sibling, nextX, nextY]];
    for (let entry = stack.pop(); entry !== undefined; entry = stack.pop()) {
      let [current, currentX, currentY] = entry;
      for (let pendingClear of current.pendingClears ?? [])
        result = addOverlappingSiblings(childNodes, idx, pendingClear, result);
      for (let childNode of current.childNodes) {
        if (childNode.nodeName === "#text") continue;
        let childNode_2 = childNode;
        let { cachedLayout, yogaNode } = childNode_2;
        if (childNode_2.style.position === "absolute" || cachedLayout === undefined || !yogaNode) continue;
        let childX = currentX + yogaNode.getComputedLeft();
        let childY = currentY + yogaNode.getComputedTop();
        if (
          childNode_2.dirty ||
          cachedLayout.x !== childX ||
          cachedLayout.y !== childY ||
          cachedLayout.width !== yogaNode.getComputedWidth() ||
          cachedLayout.height !== yogaNode.getComputedHeight()
        )
          result = addOverlappingSiblings(childNodes, idx, cachedLayout, result);
        if (childNode_2.hasEscapingDescendant === true) stack.push([childNode_2, childX, childY]);
      }
    }
  }
  return result;
}
//@ chunk-2avr6cej.js:307599-307814 layout
function addOverlappingSiblings(siblings, beforeIndex, rect, result) {
  for (let idx = 0; idx < beforeIndex; idx++) {
    let sibling = siblings[idx];
    let cachedLayout = sibling.cachedLayout;
    if (
      cachedLayout !== undefined &&
      sibling.style.position !== "absolute" &&
      rect.x < cachedLayout.x + cachedLayout.width &&
      cachedLayout.x < rect.x + rect.width &&
      rect.y < cachedLayout.y + cachedLayout.height &&
      cachedLayout.y < rect.y + rect.height
    ) {
      result ??= new Set();
      result.add(sibling);
    }
  }
  return result;
}
//@ chunk-2avr6cej.js:307814-309082 fingerprint (2.1.88 match: renderChildren, 0.724)
/**
 * 渲染子节点：决定每个子节点能否用上一帧 blit（前面有脏的非裁剪兄弟、绝对定位子节点移动、被越界兄弟覆盖等情况不能），统计子节点是否越出父框、互相重叠、画出自身矩形，返回是否有越界子孙。
 */
function renderChildren(
  node,
  output,
  state,
  offsetX,
  offsetY,
  width,
  height,
  pendingClears,
  prevScreen,
  clips,
  inheritedBackgroundColor,
  depth,
) {
  let absoluteMoved = prevScreen !== undefined && absoluteChildMoved(node, offsetX, offsetY);
  let escapingSiblings =
    prevScreen === undefined ? undefined : collectSiblingsUnderEscapingChange(node, offsetX, offsetY);
  let blittableChildren =
    pendingClears === undefined || prevScreen === undefined
      ? undefined
      : findBlittableChildren(node, offsetX, offsetY, pendingClears);
  let sawDirtyChild = false;
  let sawClippedDirty = false;
  let hasOverflowChild = false;
  let childPaintsPastRect = false;
  let childrenOverlap = false;
  let paintPastCount = 0;
  let childrenPaintingPastRect = node.childrenPaintingPastRect ?? 0;
  let minX = 1 / 0;
  let minY = 1 / 0;
  let maxX = -1 / 0;
  let maxY = -1 / 0;
  let rightEdge = offsetX + width;
  let bottomEdge = offsetY + height;
  for (let childNode of node.childNodes) {
    let childElem = childNode;
    let wasDirty = childElem.dirty;
    let isAbsolute = childElem.style.position === "absolute";
    if (wasDirty && !isAbsolute && overlapsBounds(childElem, offsetX, offsetY, minX, minY, maxX, maxY))
      node.childrenOverlap = true;
    renderNodeToOutput(childElem, output, state, {
      offsetX,
      offsetY,
      prevScreen:
        (blittableChildren !== undefined &&
          (!blittableChildren.has(childElem) || overlapsAbsoluteRects(childElem, state))) ||
        sawDirtyChild ||
        (absoluteMoved && !isAbsolute) ||
        escapingSiblings?.has(childElem) === true ||
        (sawClippedDirty && childElem.hasEscapingDescendant === true)
          ? undefined
          : prevScreen,
      clips,
      skipSelfBlit:
        sawClippedDirty &&
        isAbsolute &&
        !childElem.style.opaque &&
        childElem.style.backgroundColor === undefined,
      inheritedBackgroundColor,
      depth,
    });
    if (wasDirty && !sawDirtyChild)
      if (!clipsBothAxes(childElem) || isAbsolute) sawDirtyChild = true;
      else sawClippedDirty = true;
    if (!hasOverflowChild) {
      let cachedLayout = childElem.cachedLayout;
      if (
        childElem.hasEscapingDescendant ||
        (cachedLayout !== undefined &&
          !isAbsolute &&
          (cachedLayout.x < offsetX ||
            cachedLayout.y < offsetY ||
            cachedLayout.x + cachedLayout.width > rightEdge ||
            cachedLayout.y + cachedLayout.height > bottomEdge))
      )
        hasOverflowChild = true;
    }
    childPaintsPastRect ||= childElem.paintsPastRect === true;
    let cachedLayout = childElem.cachedLayout;
    if (!isAbsolute && cachedLayout !== undefined) {
      if (childElem.paintsPastRect === true) {
        paintPastCount++;
        node.childrenPaintingPastRect = childrenPaintingPastRect + paintPastCount;
      }
      childrenOverlap ||=
        cachedLayout.x < maxX &&
        minX < cachedLayout.x + cachedLayout.width &&
        cachedLayout.y < maxY &&
        minY < cachedLayout.y + cachedLayout.height;
      if (childrenOverlap) node.childrenOverlap = true;
      if (cachedLayout.width > 0 && cachedLayout.height > 0) {
        minX = Math.min(minX, cachedLayout.x);
        minY = Math.min(minY, cachedLayout.y);
        maxX = Math.max(maxX, cachedLayout.x + cachedLayout.width);
        maxY = Math.max(maxY, cachedLayout.y + cachedLayout.height);
      }
    }
  }
  node.childrenOverlap = childrenOverlap;
  node.childrenPaintingPastRect = paintPastCount;
  node.paintsPastRect =
    (!clipsBothAxes(node) && (hasOverflowChild || childPaintsPastRect)) ||
    isDegenerateBorderBox(node, width, height);
  return hasOverflowChild;
}
//@ chunk-2avr6cej.js:309082-310448 sole-consumer
/**
 * 父节点有 pendingClears 时，找出仍可安全 blit 的子节点（不与被清区域、越界兄弟重叠的未脏子节点）。
 */
function findBlittableChildren(node, x, y, pendingClears) {
  let result = new Set();
  let paintingAncestors = [];
  let child = node;
  for (
    let parentNode = node.parentNode;
    parentNode !== undefined;
    child = parentNode, parentNode = parentNode.parentNode
  ) {
    let paintsPast = child.style.position !== "absolute" && child.paintsPastRect === true;
    if (
      parentNode.childrenOverlap !== false ||
      (parentNode.childrenPaintingPastRect ?? 0) > (paintsPast ? 1 : 0)
    )
      return result;
    if (paintsPast) paintingAncestors.push(child);
  }
  let topmostClear = 1 / 0;
  for (let pendingClear of pendingClears) topmostClear = Math.min(topmostClear, rowSpan(pendingClear).top);
  let filtered = node.childNodes.filter(isDOMElement);
  let rowTops = Array(filtered.length);
  let rowBottoms = Array(filtered.length);
  for (let idx = 0; idx < filtered.length; idx++) {
    let childNode = filtered[idx];
    let { cachedLayout, yogaNode } = childNode;
    let isDisplayed = yogaNode !== undefined && yogaNode.getDisplay() !== 1;
    let childY = isDisplayed ? y + yogaNode.getComputedTop() : 0;
    let yogaSpan = isDisplayed
      ? rowSpan({
          y: childY,
          height: yogaNode.getComputedHeight(),
        })
      : undefined;
    if (
      childNode.style.position !== "absolute" &&
      childNode.paintsPastRect === true &&
      (childNode.dirty ||
        cachedLayout === undefined ||
        !isDisplayed ||
        cachedLayout.x !== x + yogaNode.getComputedLeft() ||
        cachedLayout.y !== childY ||
        cachedLayout.width !== yogaNode.getComputedWidth() ||
        cachedLayout.height !== yogaNode.getComputedHeight())
    )
      return result;
    let top = 1 / 0;
    let bottom = -1 / 0;
    if (childNode.style.position !== "absolute") {
      if (cachedLayout !== undefined) ({ top, bottom } = rowSpan(cachedLayout));
      if (yogaSpan !== undefined) {
        top = Math.min(top, yogaSpan.top);
        bottom = Math.max(bottom, yogaSpan.bottom);
      }
    }
    rowTops[idx] = top;
    rowBottoms[idx] = bottom;
  }
  let nextTops = Array(filtered.length);
  let minNextTop = 1 / 0;
  for (let idx = filtered.length - 1; idx >= 0; idx--) {
    nextTops[idx] = minNextTop;
    minNextTop = Math.min(minNextTop, rowTops[idx]);
  }
  let previousBottom = -1 / 0;
  for (let idx = 0; idx < filtered.length; idx++) {
    let candidate = filtered[idx];
    let cachedLayout = candidate.cachedLayout;
    if (
      candidate.style.position !== "absolute" &&
      !candidate.dirty &&
      candidate.pendingScrollDelta === undefined &&
      cachedLayout !== undefined &&
      cachedLayout.height > 0 &&
      candidate.yogaNode?.getComputedHeight() !== 0 &&
      candidate.hasAbsoluteDescendant !== true &&
      candidate.paintsPastRect !== true &&
      rowBottoms[idx] <= topmostClear &&
      previousBottom <= rowTops[idx] &&
      nextTops[idx] >= rowBottoms[idx] &&
      paintingAncestors.every(
        (ancestor) =>
          ancestor.cachedLayout !== undefined && rectContains(cachedLayout, ancestor.cachedLayout),
      )
    )
      result.add(candidate);
    previousBottom = Math.max(previousBottom, rowBottoms[idx]);
  }
  return result;
}
//@ chunk-2avr6cej.js:310448-310571 sole-consumer
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
//@ chunk-2avr6cej.js:310664-310871 sole-consumer
function overlapsBounds(childElem, offsetX, offsetY, minX, minY, maxX, maxY) {
  let yogaNode = childElem.yogaNode;
  if (yogaNode === undefined || yogaNode.getDisplay() === 1) return false;
  let childX = offsetX + yogaNode.getComputedLeft();
  let childY = offsetY + yogaNode.getComputedTop();
  return (
    childX < maxX &&
    minX < childX + yogaNode.getComputedWidth() &&
    childY < maxY &&
    minY < childY + yogaNode.getComputedHeight()
  );
}
//@ chunk-2avr6cej.js:310871-310968 sole-consumer (2.1.88 match: unionRect, 1)
function rectContains(inner, outer) {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}
//@ chunk-2avr6cej.js:310968-311088 sole-consumer
function overlapsAbsoluteRects(node, state) {
  let cachedLayout = node.cachedLayout;
  if (cachedLayout === undefined) return false;
  return (
    anyRectOverlaps(state.absoluteRectsPrev, cachedLayout) ||
    anyRectOverlaps(state.absoluteRectsCur, cachedLayout)
  );
}
//@ chunk-2avr6cej.js:311088-311262 sole-consumer (2.1.88 match: unionRect, 0.778)
function anyRectOverlaps(rects, rect) {
  for (let rect_2 of rects) {
    let slack = rect_2.width > 0 && rect_2.height > 0 ? 0 : 1;
    if (
      rect_2.escapes ||
      (rect_2.x - slack < rect.x + rect.width &&
        rect.x < rect_2.x + rect_2.width + slack &&
        rect_2.y - slack < rect.y + rect.height &&
        rect.y < rect_2.y + rect_2.height + slack)
    )
      return true;
  }
  return false;
}
//@ chunk-2avr6cej.js:311262-311637 sole-consumer
/**
 * overflow hidden/scroll 的 box 的裁剪矩形（边框内侧），两个方向都不裁剪时返回 undefined。
 */
function getOverflowClip(node, yogaNode, x, y) {
  let overflowX = node.style.overflowX ?? node.style.overflow;
  let overflowY = node.style.overflowY ?? node.style.overflow;
  let clipsX = overflowX === "hidden" || overflowX === "scroll";
  let clipsY = overflowY === "hidden" || overflowY === "scroll";
  if (!clipsX && !clipsY) return;
  return {
    x1: clipsX ? x + yogaNode.getComputedBorder(0) : undefined,
    x2: clipsX ? x + yogaNode.getComputedWidth() - yogaNode.getComputedBorder(2) : undefined,
    y1: clipsY ? y + yogaNode.getComputedBorder(1) : undefined,
    y2: clipsY ? y + yogaNode.getComputedHeight() - yogaNode.getComputedBorder(3) : undefined,
  };
}
//@ chunk-2avr6cej.js:311637-311887 sole-consumer (2.1.88 match: intersectClip, 0.813)
/**
 * 维护 {now, before, grew}：本帧与上一帧各自的累积裁剪区，grew 表示裁剪区比上一帧大（之前被裁掉的部分需要重画，不能 blit）。
 */
function advanceClips(clips, clip, prevClip) {
  if (!clip && !prevClip) return clips;
  let next = clip ? intersectClip(clips?.now, clip) : clips?.now;
  if (
    clips?.now === clips?.before &&
    clip?.x1 === prevClip?.x1 &&
    clip?.x2 === prevClip?.x2 &&
    clip?.y1 === prevClip?.y1 &&
    clip?.y2 === prevClip?.y2
  )
    return {
      now: next,
      before: next,
      grew: false,
    };
  let before = prevClip ? intersectClip(clips?.before, prevClip) : clips?.before;
  return {
    now: next,
    before,
    grew: !isClipRedundant(next, before),
  };
}
//@ chunk-2avr6cej.js:311887-312124 sole-consumer
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
//@ chunk-2avr6cej.js:312124-312225 sole-consumer
function clipsAllowScrollBlit(clips, cached, rect) {
  return (
    cached?.unpainted !== true &&
    (clips === undefined ||
      (isClipRedundant(undefined, clips.before, cached) && isClipRedundant(undefined, clips.now, rect)))
  );
}
//@ chunk-2avr6cej.js:312225-312385 fingerprint (2.1.88 match: clipsBothAxes, 1)
/**
 * 节点在 X、Y 两个方向都裁剪（overflow hidden/scroll）。
 */
function clipsBothAxes(node) {
  let overflowX = node.style.overflowX ?? node.style.overflow;
  let overflowY = node.style.overflowY ?? node.style.overflow;
  return (
    (overflowX === "hidden" || overflowX === "scroll") && (overflowY === "hidden" || overflowY === "scroll")
  );
}
//@ chunk-2avr6cej.js:312385-312684 fingerprint (2.1.88 match: siblingSharesY, 1)
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
//@ chunk-2avr6cej.js:312684-313408 fingerprint (2.1.88 match: blitEscapingAbsoluteDescendants, 0.684)
/**
 * 节点整体 blit 后，再把越出它矩形的绝对定位子孙（及越界子孙）也从上一帧拷过来，并登记绝对定位矩形。
 */
function blitEscapingAbsoluteDescendants(parentNode, output, state, prevScreen, x, y, width, height) {
  if (!parentNode.hasAbsoluteDescendant && !parentNode.hasEscapingDescendant) return;
  let right = x + width;
  let bottom = y + height;
  let stack = [];
  let escapingFlags = [];
  let pushChildren = (parentNode, inheritsEscaping) => {
    let childNodes = parentNode.childNodes;
    for (let idx = childNodes.length - 1; idx >= 0; idx--) {
      let childNode = childNodes[idx];
      if (childNode.nodeName !== "#text") {
        stack.push(childNode);
        escapingFlags.push(inheritsEscaping);
      }
    }
  };
  pushChildren(parentNode, parentNode.hasEscapingDescendant === true);
  for (let descendantNode = stack.pop(); descendantNode !== undefined; descendantNode = stack.pop()) {
    let escapes = escapingFlags.pop();
    let cachedLayout = descendantNode.cachedLayout;
    if (cachedLayout && !cachedLayout.unpainted) {
      let isAbsolute = descendantNode.style.position === "absolute";
      if (isAbsolute) {
        let cachedLayout_2 = descendantNode.parentNode?.cachedLayout;
        state.absoluteRectsCur.push(
          makeAbsoluteRect(descendantNode, cachedLayout, cachedLayout_2?.x, cachedLayout_2?.y),
        );
      }
      if (isAbsolute || escapes) {
        let cx = Math.floor(cachedLayout.x);
        let cy = Math.floor(cachedLayout.y);
        let cw = Math.floor(cachedLayout.width);
        let ch = Math.floor(cachedLayout.height);
        if (cx < x || cy < y || cx + cw > right || cy + ch > bottom)
          output.blit(prevScreen, cx, cy, cw, ch, {
            restoreNoSelect: descendantNode.style.opaque,
          });
      }
    }
    let childEscapes = escapes && descendantNode.hasEscapingDescendant === true;
    if (descendantNode.hasAbsoluteDescendant || childEscapes) pushChildren(descendantNode, childEscapes);
  }
}
//@ chunk-2avr6cej.js:313408-313723 fingerprint (2.1.88 match: renderScrolledChildren, 0.842)
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
  prevScreen,
  clips,
  top,
  bottom,
  inheritedBackgroundColor,
  depth,
  keepOffscreen = false,
) {
  let seenDirtyChild = false;
  for (let childNode of node.childNodes) {
    let childElem = childNode;
    let cy = childElem.yogaNode;
    if (cy) {
      let computedTop = cy.getComputedTop();
      if (computedTop + cy.getComputedHeight() <= top || computedTop >= bottom) {
        if (!keepOffscreen) dropSubtreeCache(childElem);
        continue;
      }
    }
    let wasDirty = childElem.dirty;
    renderNodeToOutput(childElem, output, state, {
      offsetX,
      offsetY,
      prevScreen: hadPendingClears || seenDirtyChild ? undefined : prevScreen,
      clips,
      inheritedBackgroundColor,
      depth,
    });
    if (wasDirty) seenDirtyChild = true;
  }
}
//@ chunk-2avr6cej.js:313723-313942 shared-adjacent (2.1.88 match: dropSubtreeCache, 0.809)
/**
 * 清掉子树所有节点的 cachedLayout（下一帧不能 blit、命中测试也找不到）。
 */
function dropSubtreeCache(node) {
  if (node.cachedLayout === undefined) return;
  let stack = [node];
  for (let node = stack.pop(); node !== undefined; node = stack.pop()) {
    node.cachedLayout = undefined;
    let childNodes = node.childNodes;
    for (let idx = childNodes.length - 1; idx >= 0; idx--) {
      let childNode = childNodes[idx];
      if (childNode.nodeName !== "#text") stack.push(childNode);
    }
  }
}
//@ chunk-2avr6cej.js:314916-315136 placement
function rewriteRawAnsiBackground(state, node, text, color) {
  let generation = levelGeneration();
  let cached = state.rawBgRewriteCache.get(node);
  if (cached && cached.text === text && cached.color === color && cached.levelGeneration === generation)
    return cached.out;
  let rewritten = applyBackgroundColor(text, color);
  state.rawBgRewriteCache.set(node, {
    text,
    color,
    levelGeneration: generation,
    out: rewritten,
  });
  return rewritten;
}
//@ chunk-2avr6cej.js:315136-315718 placement
/**
 * 截断带样式的文本到给定显示宽度（按段落总宽计算保留头尾），只给 daemon 预览/渲染用。
 */
function truncateStyledText(text, maxWidth, segments, charSegments, position) {
  if (maxWidth < 1) return "";
  let truncation = truncate(text, maxWidth, position);
  if (truncation === null) return applyStylesToWrappedText(text, segments, charSegments, text);
  let { head, tail } = truncation;
  let wrappedPlain = head + ELLIPSIS + tail;
  if (!text.startsWith(head) || !text.endsWith(tail))
    return applyStylesToWrappedText(wrappedPlain, segments, charSegments, text);
  let headLength = head.length;
  let tailStart = text.length - tail.length;
  let segmentAt = (index) =>
    index < headLength
      ? (charSegments[index] ?? 0)
      : index === headLength
        ? (charSegments[Math.max(0, tailStart - 1)] ?? 0)
        : (charSegments[tailStart + (index - headLength - 1)] ?? 0);
  let lines = wrappedPlain.split(`
`);
  let lineStart = 0;
  for (let idx = 0; idx < lines.length; idx++) {
    let line = lines[idx];
    let styledLine = "";
    let runStart = 0;
    let segmentIndex = line.length > 0 ? segmentAt(lineStart) : -1;
    for (let idx = 1; idx <= line.length; idx++) {
      let nextSegmentIndex = idx < line.length ? segmentAt(lineStart + idx) : -1;
      if (nextSegmentIndex !== segmentIndex) {
        let segment = segments[segmentIndex];
        let sliced = line.slice(runStart, idx);
        if (segment) {
          let styled = applyTextStyles(sliced, segment.styles);
          if (segment.hyperlink) styled = wrapWithOsc8Link(styled, segment.hyperlink);
          styledLine += styled;
        } else styledLine += sliced;
        runStart = idx;
        segmentIndex = nextSegmentIndex;
      }
    }
    lines[idx] = styledLine;
    lineStart += line.length + 1;
  }
  return lines.join(`
`);
}
export {
  isSoftWrapMode,
  collectTabbable,
  dropSubtreeCache,
  renderNodeToOutput,
  createRenderState,
  resetRenderState,
  hasStaleAbsolutePaint,
};
