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
/**
 * 行数阈值（10 行）。
 */
var MAX_LINES_THRESHOLD = 10;
//@ chunk-rmf8afvh.js:202-450 placement
/**
 * 判断内容是否超过 10 行：字符串直接数换行；内容块数组中每块至少算一行，文本块再加上其中的换行。
 */
function exceedsTenLines(content) {
  if (typeof content === "string") return exceedsLineCount(content, 9);
  if (!Array.isArray(content)) return false;
  let t = 0;
  for (let r of content) {
    t += 1;
    if (t > 10) return true;
    if (!isTextBlock(r)) continue;
    let text = r.text;
    let o = 0;
    while (t <= 10) {
      o = text.indexOf(
        `
`,
        o,
      );
      if (o === -1) break;
      o++;
      t++;
    }
    if (t > 10) return true;
  }
  return false;
}
//@ chunk-rmf8afvh.js:450-570 placement = extractErrorTypeFromData (1)
/**
 * 是否为文本块。
 */
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
function exceedsLineCount(e, t) {
  let r = 0;
  for (let i = 0; i <= t; i++) {
    r = e.indexOf(
      `
`,
      r,
    );
    if (r === -1) return false;
    r++;
  }
  return true;
}
export { exceedsTenLines, isTextBlock, MAX_LINES_THRESHOLD };
