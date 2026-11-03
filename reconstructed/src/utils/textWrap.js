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
function wrapTextRows(text, columns, n = wrapAnsi) {
  let s = text.search(ANSI_OR_C1_RE) === -1 ? text : expandTabs(text);
  let lines = n(s, columns, {
    hard: true,
    trim: false,
  }).split(`
`);
  let u = [];
  let d = 0;
  let isPrecededByNewline = true;
  for (let line of lines) {
    if (!s.startsWith(line, d))
      return {
        rows: wrapByDisplayWidth(text, columns),
        degraded: true,
      };
    let T = d + line.length;
    let E = s.startsWith(
      `\r
`,
      T,
    )
      ? 2
      : s[T] ===
            `
` || s[T] === "\r"
        ? 1
        : 0;
    u.push({
      text: text.slice(d, T),
      startOffset: d,
      isPrecededByNewline,
      endsWithNewline: E > 0,
    });
    isPrecededByNewline = E > 0;
    d = T + E;
  }
  return d === text.length
    ? {
        rows: u,
        degraded: false,
      }
    : {
        rows: wrapByDisplayWidth(text, columns),
        degraded: true,
      };
}
export { wrapTextRows, ANSI_OR_C1_RE, WORD_JOINER };
