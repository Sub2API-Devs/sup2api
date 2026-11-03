/**
 * utils/truncate.ts
 *
 * 按显示宽度截断/定位文本（混有输入框光标移动的误归声明）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/truncate.ts
 * pieces: chunk-530hfzwb.js (2)
 * attribution: callgraph-fingerprint 2
 */
import { getGraphemeSegmenter } from "./intl.js";
import { charDisplayWidth, isWhitespaceChar, isPunctuationChar } from "./Cursor.js";

//@ chunk-530hfzwb.js:927-1022 callgraph-fingerprint = truncateToWidth (1)
function truncateToWidth(text, offset, offset_2) {
  let width = 0;
  for (let { segment } of getGraphemeSegmenter().segment(text.slice(offset, offset_2)))
    width += charDisplayWidth(segment, width);
  return width;
}
//@ chunk-530hfzwb.js:1555-2385 callgraph-fingerprint = truncateToWidthNoEllipsis (1)
/**
 * 按显示宽度截断文本（不加省略号）。
 */
function truncateToWidthNoEllipsis(text, offset, isInner, n) {
  let s = [];
  for (let { segment, index } of getGraphemeSegmenter().segment(text))
    s.push({
      segment,
      index,
    });
  if (s.length === 0) return null;
  let o = s.length - 1;
  for (let width = 0; width < s.length; width++) {
    let O = s[width];
    let I = width + 1 < s.length ? s[width + 1].index : text.length;
    if (offset >= O.index && offset < I) {
      o = width;
      break;
    }
  }
  let i = (b) => s[b]?.segment ?? "";
  let u = (b) => (b < s.length ? s[b].index : text.length);
  let f = (b) =>
    i(b) !==
      `
` && isWhitespaceChar(i(b));
  let d = (b) => n(i(b));
  let p = (b) => isPunctuationChar(i(b));
  let h = o;
  let x = o;
  if (d(o)) {
    while (h > 0 && d(h - 1)) h--;
    while (x < s.length && d(x)) x++;
  } else if (isWhitespaceChar(i(o))) {
    let b = (K) => isWhitespaceChar(i(K));
    let O = offset >= text.length;
    let I = isInner && !O ? f : b;
    while (x < s.length && I(x)) x++;
    let F = !isInner && x === s.length;
    let D = O || F ? b : f;
    while (h > 0 && D(h - 1)) h--;
    return {
      start: u(h),
      end: u(x),
    };
  } else if (p(o)) {
    while (h > 0 && p(h - 1)) h--;
    while (x < s.length && p(x)) x++;
  }
  if (!isInner)
    if (x < s.length && f(x)) while (x < s.length && f(x)) x++;
    else {
      let b = h;
      while (b > 0 && f(b - 1)) b--;
      if (
        b > 0 &&
        i(b - 1) !==
          `
`
      )
        h = b;
    }
  return {
    start: u(h),
    end: u(x),
  };
}
export { truncateToWidth, truncateToWidthNoEllipsis };
