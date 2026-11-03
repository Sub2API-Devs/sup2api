/**
 * hooks/renderPlaceholder.ts
 *
 * 渲染输入框占位符（光标位于首字符时反显）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/renderPlaceholder.ts
 * pieces: chunk-81qqq1aq.js (1)
 * attribution: fingerprint 1
 */
import { inverseText } from "../ink/screen.js";
import { sequential } from "../utils/sequential.js";

//@ chunk-81qqq1aq.js:6714-7027 fingerprint = renderPlaceholder (0.952)
function renderPlaceholder({
  placeholder: placeholder,
  value: h,
  showCursor: showCursor,
  focus: focus,
  terminalFocus: terminalFocus = !0,
  invert: invert = inverseText,
  hidePlaceholderText: hidePlaceholderText = !1,
}) {
  let o = void 0;
  if (placeholder) {
    if (hidePlaceholderText) o = showCursor && focus && terminalFocus ? invert(" ") : "";
    else if (((o = sequential.dim(placeholder)), showCursor && focus && terminalFocus))
      o =
        placeholder.length > 0 ? invert(placeholder[0]) + sequential.dim(placeholder.slice(1)) : invert(" ");
  }
  let showPlaceholder = h.length === 0 && Boolean(placeholder);
  return { renderedPlaceholder: o, showPlaceholder: showPlaceholder };
}

export { renderPlaceholder };
