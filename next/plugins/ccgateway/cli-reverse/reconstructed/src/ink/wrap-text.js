/**
 * ink/wrap-text.ts
 *
 * 并入已有模块：文本换行补充。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/wrap-text.ts
 * pieces: chunk-bzr73sfg.js (4)
 * attribution: fingerprint 1, placement 3
 */
import { squashSingleText } from "./layout/node.js";
import { bunStringWidth } from "./stringWidth.js";
import { sliceAnsiToWidth, ELLIPSIS } from "./styles.js";
import { wrapAnsi } from "./wrapAnsi.js";

//@ chunk-bzr73sfg.js:181595-181854 fingerprint (2.1.88 match: truncate, 0.817)
/**
 * 按显示宽度截断：放得下返回 null；start/middle/end 三种位置返回 {head, tail}（中间插省略号由调用方完成）。
 */
function truncate(text, columns, position) {
  text = squashSingleText(text);
  let width = bunStringWidth(text);
  if (width <= columns) return null;
  if (columns === 1)
    return {
      head: "",
      tail: "",
    };
  if (position === "start")
    return {
      head: "",
      tail: sliceAnsiToWidth(text, width - columns + 1, width),
    };
  if (position === "middle") {
    let halves = readHeadAndTail(text, width, columns);
    let usedWidth = bunStringWidth(halves.head) + 1 + bunStringWidth(halves.tail);
    return usedWidth < columns ? readHeadAndTail(text, width, usedWidth) : halves;
  }
  return {
    head: sliceAnsiToWidth(text, 0, columns - 1),
    tail: "",
  };
}
//@ chunk-bzr73sfg.js:181854-181965 placement (2.1.88 match: readHeadAndTail, 0.802)
function readHeadAndTail(filePath, fileSize, buf) {
  let headSlice = sliceAnsiToWidth(filePath, 0, Math.floor(buf / 2));
  let tailText = sliceAnsiToWidth(filePath, fileSize - (buf - 1 - bunStringWidth(headSlice)), fileSize);
  return {
    head: sliceAnsiToWidth(filePath, 0, buf - 1 - bunStringWidth(tailText)),
    tail: tailText,
  };
}
//@ chunk-bzr73sfg.js:181965-182062 placement (2.1.88 match: readHeadAndTail, 0.802)
function readHeadAndTail_2(filePath, fileSize, buf) {
  if (fileSize < 1) return "";
  let text = squashSingleText(filePath);
  let truncated = truncate(text, fileSize, buf);
  return truncated === null ? text : truncated.head + ELLIPSIS + truncated.tail;
}
//@ chunk-bzr73sfg.js:182131-182451 placement (2.1.88 match: wrapText, 0.934)
/**
 * 按 textWrap 模式处理文本：wrap/wrap-stream 硬折行保留空白，wrap-trim 折行去首尾空白，end/middle/truncate-* 截断，其余原样。
 */
function wrapText(text, maxWidth, wrapType = "wrap") {
  if (wrapType === "wrap" || wrapType === "wrap-stream")
    return wrapAnsi(text, maxWidth, {
      trim: false,
      hard: true,
    });
  if (wrapType === "wrap-trim")
    return wrapAnsi(text, maxWidth, {
      trim: true,
      hard: true,
    });
  if (wrapType === "end" || wrapType === "middle" || wrapType.startsWith("truncate")) {
    let position = "end";
    if (wrapType === "truncate-middle" || wrapType === "middle") position = "middle";
    if (wrapType === "truncate-start") position = "start";
    return readHeadAndTail_2(text, maxWidth, position);
  }
  return text;
}
export { wrapText, truncate };
