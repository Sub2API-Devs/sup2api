/**
 * ink/squash-text-nodes.ts
 *
 * 并入已有模块：文本节点合并补充。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/squash-text-nodes.ts
 * pieces: chunk-bzr73sfg.js (6)
 * attribution: placement 4, fingerprint 2
 */
import { measureText } from "./measure-text.js";

//@ chunk-bzr73sfg.js:175892-175903 placement
/**
 * measureText 的门面导出别名。
 */
var measureTextAlias = measureText;
//@ chunk-bzr73sfg.js:175903-175988 placement
/**
 * 追加待清理项
 */
function queuePendingClear(parent, clear) {
  if (parent.pendingClears) parent.pendingClears.push(clear);
  else parent.pendingClears = [clear];
}
//@ chunk-bzr73sfg.js:175988-176070 placement
/**
 * 标记根节点被移出
 */
function markAbsoluteNodeRemoved(parent) {
  let ancestor = parent;
  while (ancestor.parentNode) ancestor = ancestor.parentNode;
  ancestor.absoluteNodeRemoved = true;
}
//@ chunk-bzr73sfg.js:176070-176152 placement
/**
 * 读取节点是否被整体移出，并复位标记。
 */
function consumeAbsoluteNodeRemoved(node) {
  let wasRemoved = node.absoluteNodeRemoved === true;
  node.absoluteNodeRemoved = false;
  return wasRemoved;
}
//@ chunk-bzr73sfg.js:176152-176712 fingerprint (2.1.88 match: squashTextNodesToSegments, 0.881)
/**
 * 把 ink-text 子树压平成 {text, styles, hyperlink} 段：样式沿树合并，ink-link 的 href 作为超链接下传；跨文本节点被拆开的 UTF-16 代理对会拼回前一段。
 */
function squashTextNodesToSegments(node, inheritedStyles = {}, inheritedHyperlink, out = []) {
  let styles = node.textStyles
    ? {
        ...inheritedStyles,
        ...node.textStyles,
      }
    : inheritedStyles;
  for (let childNode of node.childNodes) {
    if (childNode === undefined) continue;
    if (childNode.nodeName === "#text") {
      let last = out.at(-1);
      let joinsSurrogate =
        last !== undefined &&
        (childNode.nodeValue.charCodeAt(0) & 64512) === 56320 &&
        (last.text.charCodeAt(last.text.length - 1) & 64512) === 55296;
      if (joinsSurrogate) last.text += childNode.nodeValue.charAt(0);
      let rest = joinsSurrogate ? childNode.nodeValue.substring(1) : childNode.nodeValue;
      if (rest.length > 0)
        out.push({
          text: rest,
          styles,
          hyperlink: inheritedHyperlink,
        });
    } else if (childNode.nodeName === "ink-text" || childNode.nodeName === "ink-virtual-text")
      squashTextNodesToSegments(childNode, styles, inheritedHyperlink, out);
    else if (childNode.nodeName === "ink-link") {
      let href = childNode.attributes.href;
      squashTextNodesToSegments(childNode, styles, href || inheritedHyperlink, out);
    }
  }
  return out;
}
//@ chunk-bzr73sfg.js:176712-176949 fingerprint (2.1.88 match: squashTextNodes, 1)
/**
 * 把 ink-text 子树的纯文本拼起来（不带样式）。
 */
function squashTextNodes(node) {
  let text = "";
  for (let childNode of node.childNodes) {
    if (childNode === undefined) continue;
    if (childNode.nodeName === "#text") text += childNode.nodeValue;
    else if (childNode.nodeName === "ink-text" || childNode.nodeName === "ink-virtual-text")
      text += squashTextNodes(childNode);
    else if (childNode.nodeName === "ink-link") text += squashTextNodes(childNode);
  }
  return text;
}
export {
  squashTextNodes,
  markAbsoluteNodeRemoved,
  queuePendingClear,
  squashTextNodesToSegments,
  measureTextAlias,
  consumeAbsoluteNodeRemoved,
};
