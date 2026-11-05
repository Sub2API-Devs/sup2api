/**
 * utils/messages/textLineCount.ts
 *
 * 2.1.316 新增：是否为文本块。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-d342dwxg.js (4)
 * attribution: placement 4
 */

//@ chunk-d342dwxg.js:191-202 placement
/**
 * 行数阈值（10 行）。
 */
var MAX_LINES_THRESHOLD = 10;
//@ chunk-d342dwxg.js:202-450 placement
/**
 * 判断内容是否超过 10 行：字符串直接数换行；内容块数组中每块至少算一行，文本块再加上其中的换行。
 */
function exceedsTenLines(text) {
  if (typeof text === "string") return exceedsLineCount(text, 9);
  if (!Array.isArray(text)) return false;
  let lineCount = 0;
  for (let block of text) {
    lineCount += 1;
    if (lineCount > 10) return true;
    if (!isTextBlock(block)) continue;
    let text = block.text;
    let newlineIndex = 0;
    while (lineCount <= 10) {
      newlineIndex = text.indexOf(
        `
`,
        newlineIndex,
      );
      if (newlineIndex === -1) break;
      newlineIndex++;
      lineCount++;
    }
    if (lineCount > 10) return true;
  }
  return false;
}
//@ chunk-d342dwxg.js:450-570 placement (2.1.88 match: extractErrorTypeFromData, 1)
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
//@ chunk-d342dwxg.js:570-667 placement
function exceedsLineCount(text, maxNewlines) {
  let newlineIndex = 0;
  for (let i = 0; i <= maxNewlines; i++) {
    newlineIndex = text.indexOf(
      `
`,
      newlineIndex,
    );
    if (newlineIndex === -1) return false;
    newlineIndex++;
  }
  return true;
}
export { isTextBlock, exceedsTenLines, MAX_LINES_THRESHOLD };
