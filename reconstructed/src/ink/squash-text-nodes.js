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
var F0t = measureText;
//@ chunk-bzr73sfg.js:175903-175988 placement
function dd(n, u) {
  if (n.pendingClears) n.pendingClears.push(u);
  else n.pendingClears = [u];
}
//@ chunk-bzr73sfg.js:175988-176070 placement
function Uy(n) {
  let u = n;
  while (u.parentNode) u = u.parentNode;
  u.absoluteNodeRemoved = !0;
}
//@ chunk-bzr73sfg.js:176070-176152 placement
function Iy(n) {
  let u = n.absoluteNodeRemoved === !0;
  return ((n.absoluteNodeRemoved = !1), u);
}
/**
 * 把 ink-text 子树压平成 {text, styles, hyperlink} 段：样式沿树合并，ink-link 的 href 作为超链接下传；跨文本节点被拆开的 UTF-16 代理对会拼回前一段。
 */
//@ chunk-bzr73sfg.js:176152-176712 fingerprint = squashTextNodesToSegments (0.881)
function squashTextNodesToSegments(node, inheritedStyles = {}, inheritedHyperlink, out = []) {
  let styles = node.textStyles ? { ...inheritedStyles, ...node.textStyles } : inheritedStyles;
  for (let childNode of node.childNodes) {
    if (childNode === void 0) continue;
    if (childNode.nodeName === "#text") {
      let at = out.at(-1),
        joinsSurrogate =
          at !== void 0 &&
          (childNode.nodeValue.charCodeAt(0) & 64512) === 56320 &&
          (at.text.charCodeAt(at.text.length - 1) & 64512) === 55296;
      if (joinsSurrogate) at.text += childNode.nodeValue.charAt(0);
      let rest = joinsSurrogate ? childNode.nodeValue.substring(1) : childNode.nodeValue;
      if (rest.length > 0) out.push({ text: rest, styles: styles, hyperlink: inheritedHyperlink });
    } else if (childNode.nodeName === "ink-text" || childNode.nodeName === "ink-virtual-text")
      squashTextNodesToSegments(childNode, styles, inheritedHyperlink, out);
    else if (childNode.nodeName === "ink-link") {
      let href = childNode.attributes.href;
      squashTextNodesToSegments(childNode, styles, href || inheritedHyperlink, out);
    }
  }
  return out;
}
/**
 * 把 ink-text 子树的纯文本拼起来（不带样式）。
 */
//@ chunk-bzr73sfg.js:176712-176949 fingerprint = squashTextNodes (1)
function squashTextNodes(node) {
  let text = "";
  for (let childNode of node.childNodes) {
    if (childNode === void 0) continue;
    if (childNode.nodeName === "#text") text += childNode.nodeValue;
    else if (childNode.nodeName === "ink-text" || childNode.nodeName === "ink-virtual-text")
      text += squashTextNodes(childNode);
    else if (childNode.nodeName === "ink-link") text += squashTextNodes(childNode);
  }
  return text;
}

export { squashTextNodes, Uy, dd, squashTextNodesToSegments, F0t, Iy };
