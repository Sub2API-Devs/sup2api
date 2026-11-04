/**
 * utils/taskDescription.ts
 *
 * 2.1.316 新增：后台任务描述的清洗与截断
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s1p2wv8d.js (2)
 * attribution: placement 2
 */
import { collapseWhitespace, truncateToLength } from "./stringUtils.js";
import { stripAnsi } from "./stripAnsi.js";
import { truncateToWidth } from "./format.js";

//@ chunk-s1p2wv8d.js:302-374 placement
var MAX_DESCRIPTION_DISPLAY_CHARS = 200;
var MAX_DESCRIPTION_INPUT_CHARS = MAX_DESCRIPTION_DISPLAY_CHARS * 4;
var INVISIBLE_CHARS_RE = /[\p{Cf}\p{Cs}\p{Zl}\p{Zp}\p{Variation_Selector}]+/gu;
//@ chunk-s1p2wv8d.js:374-469 placement
/**
 * 清洗后台任务描述：去 ANSI/不可见字符、压缩空白并按显示宽度截断。
 */
function cleanTaskDescription(description) {
  let cleaned =
    description === undefined
      ? ""
      : collapseWhitespace(stripAnsi(description).replace(INVISIBLE_CHARS_RE, " "));
  return cleaned === ""
    ? undefined
    : truncateToWidth(truncateToLength(cleaned, MAX_DESCRIPTION_INPUT_CHARS), MAX_DESCRIPTION_DISPLAY_CHARS);
}
export { cleanTaskDescription };
