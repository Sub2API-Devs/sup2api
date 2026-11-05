/**
 * utils/reactText.ts
 *
 * 2.1.316 新增：React 文本工具。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-z8708bgf.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, isValidElement_default } from "../../vendor/react/cjs/react.production.js";

//@ chunk-z8708bgf.js:229-233 placement
init_react_production();
//@ chunk-z8708bgf.js:233-427 placement
/**
 * 递归提取 React 节点的纯文本（字符串、数字、数组与元素 children）。
 */
function reactNodeText(node) {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (!node) return "";
  if (Array.isArray(node)) return node.map(reactNodeText).join("");
  if (isValidElement_default(node)) return reactNodeText(node.props.children);
  return "";
}
export { reactNodeText };
