/**
 * utils/messages/textLineCount.ts
 *
 * 2.1.316 新增：是否为文本块。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-rmf8afvh.js (4)
 * attribution: placement 4
 */

//@ chunk-rmf8afvh.js:191-202 placement
var WCt = 10;
/**
 * 判断内容是否超过 10 行：字符串直接数换行；内容块数组中每块至少算一行，文本块再加上其中的换行。
 */
//@ chunk-rmf8afvh.js:202-450 placement
function exceedsTenLines(e) {
  if (typeof e === "string") return s(e, 9);
  if (!Array.isArray(e)) return !1;
  let t = 0;
  for (let r of e) {
    if (((t += 1), t > 10)) return !0;
    if (!isTextBlock(r)) continue;
    let text = r.text,
      o = 0;
    while (t <= 10) {
      if (
        ((o = text.indexOf(
          `
`,
          o,
        )),
        o === -1)
      )
        break;
      (o++, t++);
    }
    if (t > 10) return !0;
  }
  return !1;
}
/**
 * 是否为文本块。
 */
//@ chunk-rmf8afvh.js:450-570 placement = extractErrorTypeFromData (1)
function isTextBlock(data) {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === "text" &&
    "text" in data &&
    typeof data.text === "string"
  );
}
//@ chunk-rmf8afvh.js:570-667 placement
function s(e, t) {
  let r = 0;
  for (let n = 0; n <= t; n++) {
    if (
      ((r = e.indexOf(
        `
`,
        r,
      )),
      r === -1)
    )
      return !1;
    r++;
  }
  return !0;
}

export { exceedsTenLines, isTextBlock, WCt };
