/**
 * utils/textWrap.ts
 *
 * 2.1.316 新增：文本换行。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7p2hc4jn.js (2)
 * attribution: placement 2
 */
import { wrapAnsi } from "../ink/wrapAnsi.js";
import { expandTabs } from "../ink/tabstops.js";
import { wrapByDisplayWidth } from "./Cursor.js";

//@ chunk-7p2hc4jn.js:19065-19109 placement
var ANSI_OR_C1_RE = /[\u001b\u0080-\u009f]/g;
var WORD_JOINER = "\u2060";
//@ chunk-7p2hc4jn.js:19109-19521 placement
/**
 * 把文本按宽度折行成行列表，折行结果与原文不一致时退回简单切分。
 */
function wrapTextRows(text, maxWidth, wrap = wrapAnsi) {
  let source = text.search(ANSI_OR_C1_RE) === -1 ? text : expandTabs(text);
  let lines = wrap(source, maxWidth, {
    hard: true,
    trim: false,
  }).split(`
`);
  let rows = [];
  let offset = 0;
  let isPrecededByNewline = true;
  for (let line of lines) {
    if (!source.startsWith(line, offset))
      return {
        rows: wrapByDisplayWidth(text, maxWidth),
        degraded: true,
      };
    let lineEnd = offset + line.length;
    let separatorLength = source.startsWith(
      `\r
`,
      lineEnd,
    )
      ? 2
      : source[lineEnd] ===
            `
` || source[lineEnd] === "\r"
        ? 1
        : 0;
    rows.push({
      text: text.slice(offset, lineEnd),
      startOffset: offset,
      isPrecededByNewline,
      endsWithNewline: separatorLength > 0,
    });
    isPrecededByNewline = separatorLength > 0;
    offset = lineEnd + separatorLength;
  }
  return offset === text.length
    ? {
        rows,
        degraded: false,
      }
    : {
        rows: wrapByDisplayWidth(text, maxWidth),
        degraded: true,
      };
}
export { wrapTextRows, ANSI_OR_C1_RE, WORD_JOINER };
