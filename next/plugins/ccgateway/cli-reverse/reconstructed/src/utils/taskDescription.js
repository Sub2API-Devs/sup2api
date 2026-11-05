/**
 * utils/taskDescription.ts
 *
 * 2.1.316 新增：后台任务描述的清洗与截断
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3zeyk1f5.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { collapseWhitespace, truncateToLength } from "./stringUtils.js";
import { stripAnsi } from "./stripAnsi.js";
import { truncateToWidth } from "./format.js";

//@ chunk-3zeyk1f5.js:301-373 placement
var MAX_DESCRIPTION_DISPLAY_CHARS = 200;
var MAX_DESCRIPTION_INPUT_CHARS = MAX_DESCRIPTION_DISPLAY_CHARS * 4;
var INVISIBLE_CHARS_RE = /[\p{Cf}\p{Cs}\p{Zl}\p{Zp}\p{Variation_Selector}]+/gu;
//@ chunk-3zeyk1f5.js:373-467 placement
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
