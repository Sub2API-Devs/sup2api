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
import { Cy, Zu } from "../components/messages/SystemNoticeMessage.js";
import { truncateToLength } from "./stringUtils.js";

//@ chunk-bn7jsn5n.js:635-648 affinity
var d = 3,
  u = 10;
//@ chunk-bn7jsn5n.js:648-1006 fingerprint = wrapText (0.843)
function wrapText(text, wrapWidth) {
  let parts = text.split(`
`),
    wrappedLines = [];
  for (let line of parts) {
    let visibleWidth = bunStringWidth(line);
    if (visibleWidth <= wrapWidth) wrappedLines.push(line.trimEnd());
    else {
      let position = 0;
      while (position < visibleWidth) {
        let sliceAnsi = Bun.sliceAnsi(line, position, position + wrapWidth);
        (wrappedLines.push(sliceAnsi.trimEnd()), (position += wrapWidth));
      }
    }
  }
  let remainingLines = wrappedLines.length - d;
  if (remainingLines === 1)
    return {
      aboveTheFold: wrappedLines
        .slice(0, d + 1)
        .join(
          `
`,
        )
        .trimEnd(),
      remainingLines: 0,
    };
  return {
    aboveTheFold: wrappedLines
      .slice(0, d)
      .join(
        `
`,
      )
      .trimEnd(),
    remainingLines: Math.max(0, remainingLines),
  };
}
//@ chunk-bn7jsn5n.js:1006-1372 layout = wrapText (0.814)
function wrapText_2(r, o, t = !1) {
  let trimEnd = r.trimEnd();
  if (!trimEnd) return "";
  let max = Math.max(o - u, 10),
    i = d * max * 4,
    s = trimEnd.length > i,
    a = s ? trimEnd.slice(0, i) : trimEnd,
    { aboveTheFold: aboveTheFold, remainingLines: remainingLines } = wrapText(a, max),
    m = remainingLines;
  if (s) {
    let position = 0,
      f = -1;
    for (;;) {
      if (
        ((f = trimEnd.indexOf(
          `
`,
          f + 1,
        )),
        f === -1)
      )
        break;
      position++;
    }
    let max_2 = Math.max(position + 1, Math.ceil(trimEnd.length / max));
    m = Math.max(remainingLines, max_2 - d);
  }
  return [
    aboveTheFold,
    m > 0 ? sequential.dim(formatOverflowHint(m) + (t ? "" : ` ${ctrlOToExpand()}`)) : "",
  ].filter(Boolean).join(`
`);
}
/**
 * 文本按宽度换行后是否超过显示行数上限。
 */
//@ chunk-bn7jsn5n.js:1372-1778 placement
function exceedsLineLimit(r, o) {
  if (typeof r !== "string") return !1;
  let trimEnd = r.trimEnd(),
    n = 0,
    e = 0;
  for (let l = 0; l <= d; l++) {
    if (
      ((n = trimEnd.indexOf(
        `
`,
        n,
      )),
      n === -1)
    )
      break;
    (e++, n++);
  }
  if (n !== -1 && n < trimEnd.length) return !0;
  if (o === void 0) return !1;
  let max = Math.max(o - u, 10),
    s = d + 1,
    a = d * max * 4;
  if (trimEnd.length > a) return !0;
  if (e === 0) {
    let l = s * max;
    if (trimEnd.length <= l) return !1;
    return bunStringWidth(trimEnd) > l;
  }
  let c = 0;
  for (let l of trimEnd.split(`
`))
    if (((c += Math.max(1, Math.ceil(bunStringWidth(l) / max))), c > s)) return !0;
  return !1;
}
//@ chunk-ah34pb7m.js:54284-54747 fingerprint = renderTruncatedContent (0.433)
function renderTruncatedContent(m, { maxChars: d = Cy, maxLines: c = Zu + 1, preserveLayout: g = !1 } = {}) {
  let f;
  if (g) {
    let parts = m.split(`
`),
      index = parts.findIndex((b) => b.trim() !== ""),
      lastIndex = parts.findLastIndex((b) => b.trim() !== "");
    f = index === -1 ? [] : parts.slice(index, lastIndex + 1).map((b) => b.trimEnd() || " ");
  } else
    f = m
      .split(
        `
`,
      )
      .map((T) => T.trim())
      .filter((T) => T.length > 0);
  let mapped = f.slice(0, c).map((T) => {
      let x = truncateToLength(T, d);
      return x.length < T.length ? `${x}\u2026` : T;
    }),
    M = f.length - mapped.length;
  if (M > 0) mapped.push(`\u2026 +${M} more ${M === 1 ? "line" : "lines"}`);
  return mapped;
}

export { exceedsLineLimit, renderTruncatedContent, wrapText_2 };
