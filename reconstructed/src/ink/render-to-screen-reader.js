/**
 * ink/render-to-screen-reader.ts
 *
 * 2.1.316 新增：把 Ink 节点树渲染为屏幕阅读器友好的纯文本（限制深度）；计算某节点在屏幕阅读器输出中的偏移等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bzr73sfg.js (14)
 * attribution: placement 14
 */
import { kBe, applyTextStyles } from "./colorize.js";
import { applyBackgroundColor } from "../utils/theme.js";
import { truncate } from "./wrap-text.js";
import { applyStylesToWrappedText, wrapWithOsc8Link, renderNodeToOutput } from "./render-node-to-output.js";
import { ELLIPSIS } from "./styles.js";
import { qa } from "../utils/stripAnsi.js";
import { MAX_TREE_DEPTH, reportTreeDepthExceeded } from "./hit-test.js";

//@ chunk-bzr73sfg.js:315335-315555 placement
function rewriteRawAnsiBackground(state, node, text, color) {
  let p = kBe(),
    g = state.rawBgRewriteCache.get(node);
  if (g && g.text === text && g.color === color && g.levelGeneration === p) return g.out;
  let E = applyBackgroundColor(text, color);
  return (state.rawBgRewriteCache.set(node, { text: text, color: color, levelGeneration: p, out: E }), E);
}
/**
 * 为屏幕阅读器输出截断文本并保持区间映射。
 */
//@ chunk-bzr73sfg.js:315555-316137 placement
function truncateStyledText(text, maxWidth, segments, charSegments, position) {
  if (maxWidth < 1) return "";
  let g = truncate(text, maxWidth, position);
  if (g === null) return applyStylesToWrappedText(text, segments, charSegments, text);
  let { head: head, tail: tail } = g,
    A = head + ELLIPSIS + tail;
  if (!text.startsWith(head) || !text.endsWith(tail))
    return applyStylesToWrappedText(A, segments, charSegments, text);
  let D = head.length,
    O = text.length - tail.length,
    _ = (P) =>
      P < D
        ? (charSegments[P] ?? 0)
        : P === D
          ? (charSegments[Math.max(0, O - 1)] ?? 0)
          : (charSegments[O + (P - D - 1)] ?? 0),
    parts = A.split(`
`),
    L = 0;
  for (let P = 0; P < parts.length; P++) {
    let z = parts[P],
      G = "",
      X = 0,
      K = z.length > 0 ? _(L) : -1;
    for (let q = 1; q <= z.length; q++) {
      let Y = q < z.length ? _(L + q) : -1;
      if (Y !== K) {
        let J = segments[K],
          sliced = z.slice(X, q);
        if (J) {
          let ee = applyTextStyles(sliced, J.styles);
          if (J.hyperlink) ee = wrapWithOsc8Link(ee, J.hyperlink);
          G += ee;
        } else G += sliced;
        ((X = q), (K = Y));
      }
    }
    ((parts[P] = G), (L += z.length + 1));
  }
  return parts.join(`
`);
}
//@ chunk-bzr73sfg.js:316137-316148 placement
var renderNodeToOutputAlias = renderNodeToOutput;
//@ chunk-bzr73sfg.js:316148-316219 placement
var SCREEN_READER_STRIP_RE = /[\x00-\x08\x0b-\x1f\x7f-\x9f\u061c\u202a-\u202e\u2066-\u2069]/;
/**
 * 屏幕阅读器输出清洗：去掉转义序列与控制字符（保留 \t \n），双向控制字符换成 U+FFFD。
 */
//@ chunk-bzr73sfg.js:316219-316479 placement
function sanitizeForScreenReader(text) {
  if (!SCREEN_READER_STRIP_RE.test(text)) return text;
  let u = qa(text),
    f = "";
  for (let m = 0; m < u.length; m++) {
    let code = u.charCodeAt(m);
    if (code < 32) {
      if (code === 9 || code === 10) f += u[m];
    } else if (code === 127 || (code >= 128 && code <= 159));
    else if (code === 1564 || (code >= 8234 && code <= 8238) || (code >= 8294 && code <= 8297)) f += "\uFFFD";
    else f += u[m];
  }
  return f;
}
//@ chunk-bzr73sfg.js:316479-316553 placement
var BLOCKQUOTE_PREFIX = "> ",
  NO_PRESERVE_RANGES = [],
  NO_ROW_PREFIXES = [],
  EMPTY_SR_OUTPUT = { text: "", preserveRanges: NO_PRESERVE_RANGES, rowPrefixRanges: NO_ROW_PREFIXES };
/**
 * 把 Ink 节点树渲染为屏幕阅读器友好的纯文本（限制深度）。
 */
//@ chunk-bzr73sfg.js:316553-317716 placement
function renderNodeToScreenReaderOutput(node, parentRole, depth = 0) {
  if (depth >= MAX_TREE_DEPTH)
    return (reportTreeDepthExceeded("renderNodeToScreenReaderOutput", node.nodeName), EMPTY_SR_OUTPUT);
  if (node.nodeName === "#text")
    return {
      text: sanitizeForScreenReader(node.nodeValue),
      preserveRanges: NO_PRESERVE_RANGES,
      rowPrefixRanges: NO_ROW_PREFIXES,
    };
  let accessibility = node.accessibility;
  if (accessibility?.hidden) return EMPTY_SR_OUTPUT;
  if (node.isHidden || node.yogaNode?.getDisplay() === 1) return EMPTY_SR_OUTPUT;
  let p = "",
    g = NO_PRESERVE_RANGES,
    E = NO_ROW_PREFIXES;
  if (accessibility?.label !== void 0) p = sanitizeForScreenReader(accessibility.label);
  else if (
    node.nodeName === "ink-text" ||
    node.nodeName === "ink-virtual-text" ||
    node.nodeName === "ink-link"
  )
    for (let childNode of node.childNodes) {
      let A = renderNodeToScreenReaderOutput(childNode, accessibility?.role ?? parentRole, depth + 1);
      if (A.preserveRanges.length > 0) g = offsetRanges(g, A.preserveRanges, p.length);
      if (A.rowPrefixRanges.length > 0) E = offsetRowPrefixes(E, A.rowPrefixRanges, p.length);
      p += A.text;
    }
  else if (node.nodeName === "ink-box" || node.nodeName === "ink-root") {
    let T = renderBoxToScreenReaderOutput(node, accessibility?.role ?? parentRole, depth);
    ((p = T.text), (g = T.preserveRanges), (E = T.rowPrefixRanges));
  }
  if (accessibility?.state) {
    let filtered = Object.keys(accessibility.state).filter((A) => accessibility.state[A]);
    if (filtered.length > 0) {
      let A = `(${filtered.join(", ")}) `;
      ((p = A + p),
        (g = offsetRanges(NO_PRESERVE_RANGES, g, A.length)),
        (E = offsetRowPrefixes(NO_ROW_PREFIXES, E, A.length)));
    }
  }
  if (accessibility?.role && accessibility.role !== parentRole && accessibility.role !== "blockquote") {
    let T = `${accessibility.role}: `;
    ((p = T + p),
      (g = offsetRanges(NO_PRESERVE_RANGES, g, T.length)),
      (E = offsetRowPrefixes(NO_ROW_PREFIXES, E, T.length)));
  }
  if (accessibility?.preserveWhitespace && p !== "") g = [[0, p.length]];
  if (accessibility?.role === "blockquote" && p !== "") E = [[0, p.length, BLOCKQUOTE_PREFIX]];
  return { text: p, preserveRanges: g, rowPrefixRanges: E };
}
//@ chunk-bzr73sfg.js:317716-317760 placement
function screenReaderText(n, u, f = 0) {
  return renderNodeToScreenReaderOutput(n, u, f).text;
}
//@ chunk-bzr73sfg.js:317760-317871 placement
function offsetRanges(n, u, f) {
  if (u.length === 0) return n;
  let m = n === NO_PRESERVE_RANGES ? [] : [...n];
  for (let [p, g] of u) m.push([p + f, g + f]);
  return m;
}
//@ chunk-bzr73sfg.js:317871-317986 placement
function offsetRowPrefixes(n, u, f) {
  if (u.length === 0) return n;
  let m = n === NO_ROW_PREFIXES ? [] : [...n];
  for (let [p, g, E] of u) m.push([p + f, g + f, E]);
  return m;
}
/**
 * 按 flex 方向拼接子节点的屏幕阅读器文本。
 */
//@ chunk-bzr73sfg.js:317986-318461 placement
function renderBoxToScreenReaderOutput(node, role, depth) {
  let m = node.style.flexDirection ?? "row",
    p = m === "column" || m === "column-reverse",
    g = m === "row-reverse" || m === "column-reverse",
    E = p
      ? `
`
      : " ",
    T = [];
  for (let childNode of node.childNodes) {
    let U = renderNodeToScreenReaderOutput(childNode, role, depth + 1);
    if (U.text !== "") T.push(U);
  }
  if (g) T.reverse();
  let A = "",
    D = NO_PRESERVE_RANGES,
    O = NO_ROW_PREFIXES;
  for (let _ of T) {
    if (A !== "") A += E;
    if (_.preserveRanges.length > 0) D = offsetRanges(D, _.preserveRanges, A.length);
    if (_.rowPrefixRanges.length > 0) O = offsetRowPrefixes(O, _.rowPrefixRanges, A.length);
    A += _.text;
  }
  return { text: A, preserveRanges: D, rowPrefixRanges: O };
}
/**
 * 计算某节点在屏幕阅读器输出中的偏移。
 */
//@ chunk-bzr73sfg.js:318461-319359 placement
function screenReaderOffsetOf(node, target, role, depth = 0) {
  if (depth >= MAX_TREE_DEPTH) return null;
  if (node === target) return 0;
  if (node.nodeName === "#text") return null;
  let accessibility = node.accessibility;
  if (accessibility?.hidden) return null;
  if (node.isHidden || node.yogaNode?.getDisplay() === 1) return null;
  if (accessibility?.label !== void 0) return null;
  if (node.nodeName === "ink-text" || node.nodeName === "ink-virtual-text" || node.nodeName === "ink-link")
    return null;
  if (node.nodeName !== "ink-box" && node.nodeName !== "ink-root") return null;
  let g = accessibility?.role ?? role,
    E = 0;
  if (accessibility?.state) {
    let filtered = Object.keys(accessibility.state).filter((P) => accessibility.state[P]);
    if (filtered.length > 0) E += `(${filtered.join(", ")}) `.length;
  }
  if (accessibility?.role && accessibility.role !== role) E += `${accessibility.role}: `.length;
  let T = node.style.flexDirection ?? "row",
    A = T === "column" || T === "column-reverse",
    D = T === "row-reverse" || T === "column-reverse",
    O = A ? 1 : 1,
    _ = [];
  for (let childNode of node.childNodes) {
    let P = screenReaderText(childNode, g, depth + 1);
    if (P !== "") _.push({ node: childNode, out: P });
  }
  if (D) _.reverse();
  let U = 0;
  for (let L of _) {
    let P = screenReaderOffsetOf(L.node, target, g, depth + 1);
    if (P !== null) return E + U + P;
    U += L.out.length + O;
  }
  return null;
}
//@ chunk-bzr73sfg.js:319359-319480 placement
function setTranscriptFrontCut(n) {
  let u = n;
  while (u.parentNode !== void 0) u = u.parentNode;
  if (u.nodeName === "ink-root") u.transcriptFrontCutRows = n;
}
//@ chunk-bzr73sfg.js:319480-319573 placement
function takeTranscriptFrontCut(n) {
  let u = n.transcriptFrontCutRows ?? null;
  return ((n.transcriptFrontCutRows = void 0), u);
}

export {
  setTranscriptFrontCut,
  screenReaderText,
  renderNodeToOutputAlias,
  rewriteRawAnsiBackground,
  truncateStyledText,
  renderNodeToScreenReaderOutput,
  sanitizeForScreenReader,
  takeTranscriptFrontCut,
  screenReaderOffsetOf,
};
