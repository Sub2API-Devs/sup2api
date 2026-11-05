/**
 * ink/render-to-screen-reader.ts
 *
 * 2.1.316 新增：把 Ink 节点树渲染为屏幕阅读器友好的纯文本（限制深度）；计算某节点在屏幕阅读器输出中的偏移等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2avr6cej.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { renderNodeToOutput } from "./render-node-to-output.js";
import { stripAnsiPerLine } from "../utils/stripAnsi.js";
import { MAX_TREE_DEPTH, reportTreeDepthExceeded } from "./hit-test.js";

//@ chunk-2avr6cej.js:315718-315729 placement
var renderNodeToOutputAlias = renderNodeToOutput;
//@ chunk-2avr6cej.js:315729-315800 placement
var SCREEN_READER_STRIP_RE = /[\x00-\x08\x0b-\x1f\x7f-\x9f\u061c\u202a-\u202e\u2066-\u2069]/;
//@ chunk-2avr6cej.js:315800-316060 placement
/**
 * 屏幕阅读器输出清洗：去掉转义序列与控制字符（保留 \t \n），双向控制字符换成 U+FFFD。
 */
function sanitizeForScreenReader(text) {
  if (!SCREEN_READER_STRIP_RE.test(text)) return text;
  let stripped = stripAnsiPerLine(text);
  let out = "";
  for (let idx = 0; idx < stripped.length; idx++) {
    let code = stripped.charCodeAt(idx);
    if (code < 32) {
      if (code === 9 || code === 10) out += stripped[idx];
    } else if (code === 127 || (code >= 128 && code <= 159));
    else if (code === 1564 || (code >= 8234 && code <= 8238) || (code >= 8294 && code <= 8297))
      out += "\uFFFD";
    else out += stripped[idx];
  }
  return out;
}
//@ chunk-2avr6cej.js:316060-316134 placement
var BLOCKQUOTE_PREFIX = "> ";
var NO_PRESERVE_RANGES = [];
var NO_ROW_PREFIXES = [];
var EMPTY_SR_OUTPUT = {
  text: "",
  preserveRanges: NO_PRESERVE_RANGES,
  rowPrefixRanges: NO_ROW_PREFIXES,
};
//@ chunk-2avr6cej.js:316134-317297 placement
/**
 * 把 Ink 节点树渲染为屏幕阅读器友好的纯文本（限制深度）。
 */
function renderNodeToScreenReaderOutput(node, parentRole, depth = 0) {
  if (depth >= MAX_TREE_DEPTH) {
    reportTreeDepthExceeded("renderNodeToScreenReaderOutput", node.nodeName);
    return EMPTY_SR_OUTPUT;
  }
  if (node.nodeName === "#text")
    return {
      text: sanitizeForScreenReader(node.nodeValue),
      preserveRanges: NO_PRESERVE_RANGES,
      rowPrefixRanges: NO_ROW_PREFIXES,
    };
  let accessibility = node.accessibility;
  if (accessibility?.hidden) return EMPTY_SR_OUTPUT;
  if (node.isHidden || node.yogaNode?.getDisplay() === 1) return EMPTY_SR_OUTPUT;
  let text = "";
  let preserveRanges = NO_PRESERVE_RANGES;
  let rowPrefixRanges = NO_ROW_PREFIXES;
  if (accessibility?.label !== undefined) text = sanitizeForScreenReader(accessibility.label);
  else if (
    node.nodeName === "ink-text" ||
    node.nodeName === "ink-virtual-text" ||
    node.nodeName === "ink-link"
  )
    for (let childNode of node.childNodes) {
      let childOutput = renderNodeToScreenReaderOutput(
        childNode,
        accessibility?.role ?? parentRole,
        depth + 1,
      );
      if (childOutput.preserveRanges.length > 0)
        preserveRanges = offsetRanges(preserveRanges, childOutput.preserveRanges, text.length);
      if (childOutput.rowPrefixRanges.length > 0)
        rowPrefixRanges = offsetRowPrefixes(rowPrefixRanges, childOutput.rowPrefixRanges, text.length);
      text += childOutput.text;
    }
  else if (node.nodeName === "ink-box" || node.nodeName === "ink-root") {
    let boxOutput = renderBoxToScreenReaderOutput(node, accessibility?.role ?? parentRole, depth);
    text = boxOutput.text;
    preserveRanges = boxOutput.preserveRanges;
    rowPrefixRanges = boxOutput.rowPrefixRanges;
  }
  if (accessibility?.state) {
    let filtered = Object.keys(accessibility.state).filter((key) => accessibility.state[key]);
    if (filtered.length > 0) {
      let statePrefix = `(${filtered.join(", ")}) `;
      text = statePrefix + text;
      preserveRanges = offsetRanges(NO_PRESERVE_RANGES, preserveRanges, statePrefix.length);
      rowPrefixRanges = offsetRowPrefixes(NO_ROW_PREFIXES, rowPrefixRanges, statePrefix.length);
    }
  }
  if (accessibility?.role && accessibility.role !== parentRole && accessibility.role !== "blockquote") {
    let rolePrefix = `${accessibility.role}: `;
    text = rolePrefix + text;
    preserveRanges = offsetRanges(NO_PRESERVE_RANGES, preserveRanges, rolePrefix.length);
    rowPrefixRanges = offsetRowPrefixes(NO_ROW_PREFIXES, rowPrefixRanges, rolePrefix.length);
  }
  if (accessibility?.preserveWhitespace && text !== "") preserveRanges = [[0, text.length]];
  if (accessibility?.role === "blockquote" && text !== "")
    rowPrefixRanges = [[0, text.length, BLOCKQUOTE_PREFIX]];
  return {
    text,
    preserveRanges,
    rowPrefixRanges,
  };
}
//@ chunk-2avr6cej.js:317297-317341 placement
function screenReaderText(node, role, depth = 0) {
  return renderNodeToScreenReaderOutput(node, role, depth).text;
}
//@ chunk-2avr6cej.js:317341-317452 placement
function offsetRanges(base, preserveRanges, offset) {
  if (preserveRanges.length === 0) return base;
  let merged = base === NO_PRESERVE_RANGES ? [] : [...base];
  for (let [start, end] of preserveRanges) merged.push([start + offset, end + offset]);
  return merged;
}
//@ chunk-2avr6cej.js:317452-317567 placement
function offsetRowPrefixes(base, rowPrefixRanges, offset) {
  if (rowPrefixRanges.length === 0) return base;
  let merged = base === NO_ROW_PREFIXES ? [] : [...base];
  for (let [start, end, prefix] of rowPrefixRanges) merged.push([start + offset, end + offset, prefix]);
  return merged;
}
//@ chunk-2avr6cej.js:317567-318042 placement
/**
 * 按 flex 方向拼接子节点的屏幕阅读器文本。
 */
function renderBoxToScreenReaderOutput(node, role, depth) {
  let flexDirection = node.style.flexDirection ?? "row";
  let isColumn = flexDirection === "column" || flexDirection === "column-reverse";
  let isReversed = flexDirection === "row-reverse" || flexDirection === "column-reverse";
  let separator = isColumn
    ? `
`
    : " ";
  let childOutputs = [];
  for (let childNode of node.childNodes) {
    let childOutput = renderNodeToScreenReaderOutput(childNode, role, depth + 1);
    if (childOutput.text !== "") childOutputs.push(childOutput);
  }
  if (isReversed) childOutputs.reverse();
  let text = "";
  let preserveRanges = NO_PRESERVE_RANGES;
  let rowPrefixRanges = NO_ROW_PREFIXES;
  for (let childOutput of childOutputs) {
    if (text !== "") text += separator;
    if (childOutput.preserveRanges.length > 0)
      preserveRanges = offsetRanges(preserveRanges, childOutput.preserveRanges, text.length);
    if (childOutput.rowPrefixRanges.length > 0)
      rowPrefixRanges = offsetRowPrefixes(rowPrefixRanges, childOutput.rowPrefixRanges, text.length);
    text += childOutput.text;
  }
  return {
    text,
    preserveRanges,
    rowPrefixRanges,
  };
}
//@ chunk-2avr6cej.js:318042-318940 placement
/**
 * 计算某节点在屏幕阅读器输出中的偏移。
 */
function screenReaderOffsetOf(node, target, role, depth = 0) {
  if (depth >= MAX_TREE_DEPTH) return null;
  if (node === target) return 0;
  if (node.nodeName === "#text") return null;
  let accessibility = node.accessibility;
  if (accessibility?.hidden) return null;
  if (node.isHidden || node.yogaNode?.getDisplay() === 1) return null;
  if (accessibility?.label !== undefined) return null;
  if (node.nodeName === "ink-text" || node.nodeName === "ink-virtual-text" || node.nodeName === "ink-link")
    return null;
  if (node.nodeName !== "ink-box" && node.nodeName !== "ink-root") return null;
  let role_2 = accessibility?.role ?? role;
  let prefixLength = 0;
  if (accessibility?.state) {
    let filtered = Object.keys(accessibility.state).filter((key) => accessibility.state[key]);
    if (filtered.length > 0) prefixLength += `(${filtered.join(", ")}) `.length;
  }
  if (accessibility?.role && accessibility.role !== role) prefixLength += `${accessibility.role}: `.length;
  let flexDirection = node.style.flexDirection ?? "row";
  let isColumn = flexDirection === "column" || flexDirection === "column-reverse";
  let isReversed = flexDirection === "row-reverse" || flexDirection === "column-reverse";
  let separatorLength = isColumn ? 1 : 1;
  let children = [];
  for (let childNode of node.childNodes) {
    let childText = screenReaderText(childNode, role_2, depth + 1);
    if (childText !== "")
      children.push({
        node: childNode,
        out: childText,
      });
  }
  if (isReversed) children.reverse();
  let offsetSoFar = 0;
  for (let child of children) {
    let childOffset = screenReaderOffsetOf(child.node, target, role_2, depth + 1);
    if (childOffset !== null) return prefixLength + offsetSoFar + childOffset;
    offsetSoFar += child.out.length + separatorLength;
  }
  return null;
}
//@ chunk-2avr6cej.js:318940-319061 placement
function setTranscriptFrontCut(node) {
  let root = node;
  while (root.parentNode !== undefined) root = root.parentNode;
  if (root.nodeName === "ink-root") root.transcriptFrontCutRows = node;
}
//@ chunk-2avr6cej.js:319061-319154 placement
function takeTranscriptFrontCut(rootNode) {
  let transcriptFrontCutRows = rootNode.transcriptFrontCutRows ?? null;
  rootNode.transcriptFrontCutRows = undefined;
  return transcriptFrontCutRows;
}
export {
  renderNodeToOutputAlias,
  renderNodeToScreenReaderOutput,
  sanitizeForScreenReader,
  takeTranscriptFrontCut,
  screenReaderOffsetOf,
  setTranscriptFrontCut,
  screenReaderText,
};
