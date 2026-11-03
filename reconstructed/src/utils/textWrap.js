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
var tt = /[\u001b\u0080-\u009f]/g,
  Rt = "\u2060";
/**
 * 把文本按宽度折行成行列表，折行结果与原文不一致时退回简单切分。
 */
//@ chunk-7p2hc4jn.js:19109-19521 placement
function wrapTextRows(e, r, n = wrapAnsi) {
  let s = e.search(tt) === -1 ? e : expandTabs(e),
    parts = n(s, r, { hard: !0, trim: !1 }).split(`
`),
    u = [],
    d = 0,
    h = !0;
  for (let x of parts) {
    if (!s.startsWith(x, d)) return { rows: wrapByDisplayWidth(e, r), degraded: !0 };
    let T = d + x.length,
      E = s.startsWith(
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
    (u.push({ text: e.slice(d, T), startOffset: d, isPrecededByNewline: h, endsWithNewline: E > 0 }),
      (h = E > 0),
      (d = T + E));
  }
  return d === e.length ? { rows: u, degraded: !1 } : { rows: wrapByDisplayWidth(e, r), degraded: !0 };
}

export { wrapTextRows, tt, Rt };
