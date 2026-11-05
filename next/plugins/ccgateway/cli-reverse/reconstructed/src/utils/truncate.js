/**
 * utils/truncate.ts
 *
 * 按显示宽度截断/定位文本（混有输入框光标移动的误归声明）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/truncate.ts
 * pieces: chunk-2avr6cej.js (1)
 * attribution: callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getGraphemeSegmenter } from "./intl.js";

//@ chunk-2avr6cej.js:322737-322866 callgraph-fingerprint (2.1.88 match: truncateToWidth, 1)
function isGraphemeBoundary(text, index) {
  if (index <= 0) return true;
  for (let segment of getGraphemeSegmenter().segment(text)) {
    if (segment.index === index) return true;
    if (segment.index > index) return false;
  }
  return index >= text.length;
}
export { isGraphemeBoundary };
