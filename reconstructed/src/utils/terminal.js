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
//@ chunk-bn7jsn5n.js:648-1006 fingerprint = wrapText (0.843)
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
//@ chunk-bn7jsn5n.js:1006-1372 layout = wrapText (0.814)
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
    let f = -1;
    for (;;) {
      f = trimmedContent.indexOf(
        `
`,
        f + 1,
      );
      if (f === -1) break;
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
function exceedsLineLimit(r, columns) {
  if (typeof r !== "string") return false;
  let t = r.trimEnd();
  let n = 0;
  let e = 0;
  for (let j = 0; j <= MAX_TRUNCATION_LINES; j++) {
    n = t.indexOf(
      `
`,
      n,
    );
    if (n === -1) break;
    e++;
    n++;
  }
  if (n !== -1 && n < t.length) return true;
  if (columns === undefined) return false;
  let max = Math.max(columns - MIN_WRAP_WIDTH, 10);
  let s = MAX_TRUNCATION_LINES + 1;
  let a = MAX_TRUNCATION_LINES * max * 4;
  if (t.length > a) return true;
  if (e === 0) {
    let l = s * max;
    if (t.length <= l) return false;
    return bunStringWidth(t) > l;
  }
  let c = 0;
  for (let line of t.split(`
`)) {
    c += Math.max(1, Math.ceil(bunStringWidth(line) / max));
    if (c > s) return true;
  }
  return false;
}
//@ chunk-ah34pb7m.js:54284-54747 fingerprint = renderTruncatedContent (0.433)
function renderTruncatedContent(
  m,
  {
    maxChars: d = HOOK_FEEDBACK_MAX_WIDTH,
    maxLines: c = HOOK_FEEDBACK_MAX_LINES + 1,
    preserveLayout: g = false,
  } = {},
) {
  let f;
  if (g) {
    let lines = m.split(`
`);
    let index = lines.findIndex((line) => line.trim() !== "");
    let lastIndex = lines.findLastIndex((line) => line.trim() !== "");
    f = index === -1 ? [] : lines.slice(index, lastIndex + 1).map((line) => line.trimEnd() || " ");
  } else
    f = m
      .split(
        `
`,
      )
      .map((line) => line.trim())
      .filter((T) => T.length > 0);
  let mapped = f.slice(0, c).map((T) => {
    let x = truncateToLength(T, d);
    return x.length < T.length ? `${x}\u2026` : T;
  });
  let M = f.length - mapped.length;
  if (M > 0) mapped.push(`\u2026 +${M} more ${M === 1 ? "line" : "lines"}`);
  return mapped;
}
export { exceedsLineLimit, renderTruncatedContent, wrapText_2 };
