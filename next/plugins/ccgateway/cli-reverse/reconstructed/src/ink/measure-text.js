/**
 * ink/measure-text.ts
 *
 * 测量文字宽高与按宽度折行后的行数
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/measure-text.ts
 * pieces: chunk-2avr6cej.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { lineWidth } from "./line-width-cache.js";

//@ chunk-2avr6cej.js:175344-175641 fingerprint (2.1.88 match: measureText, 1)
/**
 * 测量文本：宽度为最宽行，高度为按 maxWidth 折行后的行数（maxWidth 非正或无穷时不折行）。
 */
function measureText(text, maxWidth) {
  if (text.length === 0)
    return {
      width: 0,
      height: 0,
    };
  let noWrap = maxWidth <= 0 || !Number.isFinite(maxWidth);
  let height = 0;
  let width = 0;
  let pos = 0;
  while (pos <= text.length) {
    let end = text.indexOf(
      `
`,
      pos,
    );
    let line = end === -1 ? text.substring(pos) : text.substring(pos, end);
    let lineW = lineWidth(line);
    width = Math.max(width, lineW);
    if (noWrap) height++;
    else height += lineW === 0 ? 1 : Math.ceil(lineW / maxWidth);
    if (end === -1) break;
    pos = end + 1;
  }
  return {
    width,
    height,
  };
}
export { measureText };
