/**
 * utils/reactText.ts
 *
 * 2.1.316 新增：React 文本工具。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sqp1074w.js (2)
 * attribution: placement 2
 */
import { init_react_production, isValidElement_default } from "../../vendor/react/cjs/react.production.js";

//@ chunk-sqp1074w.js:229-233 placement
init_react_production();
//@ chunk-sqp1074w.js:233-427 placement
/**
 * 递归提取 React 节点的纯文本（字符串、数字、数组与元素 children）。
 */
function reactNodeText(r) {
  if (typeof r === "string") return r;
  if (typeof r === "number") return String(r);
  if (!r) return "";
  if (Array.isArray(r)) return r.map(reactNodeText).join("");
  if (isValidElement_default(r)) return reactNodeText(r.props.children);
  return "";
}
export { reactNodeText };
