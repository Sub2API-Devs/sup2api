/**
 * utils/terminal.ts
 *
 * 终端文本工具：按宽度换行、截断内容并显示 "+N more lines"。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/terminal.ts
 * pieces: chunk-ah34pb7m.js (1), chunk-bn7jsn5n.js (4)
 * attribution: fingerprint 2, affinity 1, layout 1, placement 1
 */
import { bunStringWidth } from "../ink/stringWidth.js";
import { sequential } from "./sequential.js";
import { formatOverflowHint } from "./format.js";
import { ctrlOToExpand } from "../components/CtrlOToExpand.js";
import {
  HOOK_FEEDBACK_MAX_WIDTH,
  HOOK_FEEDBACK_MAX_LINES,
} from "../components/messages/SystemNoticeMessage.js";
import { truncateToLength } from "./stringUtils.js";

//@ chunk-bn7jsn5n.js:635-648 affinity
var MAX_TRUNCATION_LINES = 3;
var MIN_WRAP_WIDTH = 10;
//@ chunk-bn7jsn5n.js:648-1006 fingerprint (2.1.88 match: wrapText, 0.843)
function wrapText(text, wrapWidth) {
  let lines = text.split(`
`);
  let wrappedLines = [];
  for (let line of lines) {
    let visibleWidth = bunStringWidth(line);
    if (visibleWidth <= wrapWidth) wrappedLines.push(line.trimEnd());
    else {
      let position = 0;
      while (position < visibleWidth) {
        let chunk = Bun.sliceAnsi(line, position, position + wrapWidth);
        wrappedLines.push(chunk.trimEnd());
        position += wrapWidth;
      }
    }
  }
  let remainingLines = wrappedLines.length - MAX_TRUNCATION_LINES;
  if (remainingLines === 1)
    return {
      aboveTheFold: wrappedLines
        .slice(0, MAX_TRUNCATION_LINES + 1)
        .join(
          `
`,
        )
        .trimEnd(),
      remainingLines: 0,
    };
  return {
    aboveTheFold: wrappedLines
      .slice(0, MAX_TRUNCATION_LINES)
      .join(
        `
`,
      )
      .trimEnd(),
    remainingLines: Math.max(0, remainingLines),
  };
}
//@ chunk-bn7jsn5n.js:1006-1372 layout (2.1.88 match: wrapText, 0.814)
function wrapText_2(content, terminalWidth, suppressExpandHint = false) {
  let trimmedContent = content.trimEnd();
  if (!trimmedContent) return "";
  let wrapWidth = Math.max(terminalWidth - MIN_WRAP_WIDTH, 10);
  let maxChars = MAX_TRUNCATION_LINES * wrapWidth * 4;
  let preTruncated = trimmedContent.length > maxChars;
  let contentForWrapping = preTruncated ? trimmedContent.slice(0, maxChars) : trimmedContent;
  let { aboveTheFold, remainingLines } = wrapText(contentForWrapping, wrapWidth);
  let estimatedRemaining = remainingLines;
  if (preTruncated) {
    let position = 0;
    let newlineIndex = -1;
    for (;;) {
      newlineIndex = trimmedContent.indexOf(
        `
`,
        newlineIndex + 1,
      );
      if (newlineIndex === -1) break;
      position++;
    }
    let max = Math.max(position + 1, Math.ceil(trimmedContent.length / wrapWidth));
    estimatedRemaining = Math.max(remainingLines, max - MAX_TRUNCATION_LINES);
  }
  return [
    aboveTheFold,
    estimatedRemaining > 0
      ? sequential.dim(
          formatOverflowHint(estimatedRemaining) + (suppressExpandHint ? "" : ` ${ctrlOToExpand()}`),
        )
      : "",
  ].filter(Boolean).join(`
`);
}
//@ chunk-bn7jsn5n.js:1372-1778 placement
/**
 * 文本按宽度换行后是否超过显示行数上限。
 */
function exceedsLineLimit(content, columns) {
  if (typeof content !== "string") return false;
  let trimmed = content.trimEnd();
  let lines = 0;
  let overlong = 0;
  for (let j = 0; j <= MAX_TRUNCATION_LINES; j++) {
    lines = trimmed.indexOf(
      `
`,
      lines,
    );
    if (lines === -1) break;
    overlong++;
    lines++;
  }
  if (lines !== -1 && lines < trimmed.length) return true;
  if (columns === undefined) return false;
  let max = Math.max(columns - MIN_WRAP_WIDTH, 10);
  let maxLines = MAX_TRUNCATION_LINES + 1;
  let lineBudgetChars = MAX_TRUNCATION_LINES * max * 4;
  if (trimmed.length > lineBudgetChars) return true;
  if (overlong === 0) {
    let lineBudgetChars = maxLines * max;
    if (trimmed.length <= lineBudgetChars) return false;
    return bunStringWidth(trimmed) > lineBudgetChars;
  }
  let wrappedLineCount = 0;
  for (let line of trimmed.split(`
`)) {
    wrappedLineCount += Math.max(1, Math.ceil(bunStringWidth(line) / max));
    if (wrappedLineCount > maxLines) return true;
  }
  return false;
}
//@ chunk-ah34pb7m.js:54284-54747 fingerprint (2.1.88 match: renderTruncatedContent, 0.433)
function renderTruncatedContent(
  content,
  { maxChars = HOOK_FEEDBACK_MAX_WIDTH, maxLines = HOOK_FEEDBACK_MAX_LINES + 1, preserveLayout = false } = {},
) {
  let lines;
  if (preserveLayout) {
    let lines_2 = content.split(`
`);
    let index = lines_2.findIndex((line) => line.trim() !== "");
    let lastIndex = lines_2.findLastIndex((line) => line.trim() !== "");
    lines = index === -1 ? [] : lines_2.slice(index, lastIndex + 1).map((line) => line.trimEnd() || " ");
  } else
    lines = content
      .split(
        `
`,
      )
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  let mapped = lines.slice(0, maxLines).map((line) => {
    let truncatedLine = truncateToLength(line, maxChars);
    return truncatedLine.length < line.length ? `${truncatedLine}\u2026` : line;
  });
  let hiddenLineCount = lines.length - mapped.length;
  if (hiddenLineCount > 0)
    mapped.push(`\u2026 +${hiddenLineCount} more ${hiddenLineCount === 1 ? "line" : "lines"}`);
  return mapped;
}
export { exceedsLineLimit, renderTruncatedContent, wrapText_2 };
