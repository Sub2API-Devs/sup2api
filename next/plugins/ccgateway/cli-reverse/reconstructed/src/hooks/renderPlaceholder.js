/**
 * hooks/renderPlaceholder.ts
 *
 * 渲染输入框占位符（光标位于首字符时反显）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/renderPlaceholder.ts
 * pieces: chunk-3t80v0fz.js (1)
 * attribution: fingerprint 1
 */
import { inverseText } from "../ink/screen.js";
import { sequential } from "../utils/sequential.js";

//@ chunk-3t80v0fz.js:6717-7030 fingerprint (2.1.88 match: renderPlaceholder, 0.952)
function renderPlaceholder({
  placeholder,
  value,
  showCursor,
  focus,
  terminalFocus = true,
  invert = inverseText,
  hidePlaceholderText = false,
}) {
  let renderedPlaceholder = undefined;
  if (placeholder) {
    if (hidePlaceholderText) renderedPlaceholder = showCursor && focus && terminalFocus ? invert(" ") : "";
    else {
      renderedPlaceholder = sequential.dim(placeholder);
      if (showCursor && focus && terminalFocus)
        renderedPlaceholder =
          placeholder.length > 0
            ? invert(placeholder[0]) + sequential.dim(placeholder.slice(1))
            : invert(" ");
    }
  }
  let showPlaceholder = value.length === 0 && Boolean(placeholder);
  return {
    renderedPlaceholder,
    showPlaceholder,
  };
}
export { renderPlaceholder };
