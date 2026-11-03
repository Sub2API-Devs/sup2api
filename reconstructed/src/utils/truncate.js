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
import { charDisplayWidth, zWe, qmt } from "./Cursor.js";

//@ chunk-530hfzwb.js:927-1022 callgraph-fingerprint = truncateToWidth (1)
function truncateToWidth(e, t, r) {
  let width = 0;
  for (let { segment: segment } of getGraphemeSegmenter().segment(e.slice(t, r)))
    width += charDisplayWidth(segment, width);
  return width;
}
/**
 * 按显示宽度截断文本（不加省略号）。
 */
//@ chunk-530hfzwb.js:1555-2385 callgraph-fingerprint = truncateToWidthNoEllipsis (1)
function truncateToWidthNoEllipsis(e, t, r, n) {
  let s = [];
  for (let { segment: segment, index: index } of getGraphemeSegmenter().segment(e))
    s.push({ segment: segment, index: index });
  if (s.length === 0) return null;
  let o = s.length - 1;
  for (let width = 0; width < s.length; width++) {
    let O = s[width],
      I = width + 1 < s.length ? s[width + 1].index : e.length;
    if (t >= O.index && t < I) {
      o = width;
      break;
    }
  }
  let i = (b) => s[b]?.segment ?? "",
    u = (b) => (b < s.length ? s[b].index : e.length),
    f = (b) =>
      i(b) !==
        `
` && zWe(i(b)),
    d = (b) => n(i(b)),
    p = (b) => qmt(i(b)),
    h = o,
    x = o;
  if (d(o)) {
    while (h > 0 && d(h - 1)) h--;
    while (x < s.length && d(x)) x++;
  } else if (zWe(i(o))) {
    let b = (K) => zWe(i(K)),
      O = t >= e.length,
      I = r && !O ? f : b;
    while (x < s.length && I(x)) x++;
    let F = !r && x === s.length,
      D = O || F ? b : f;
    while (h > 0 && D(h - 1)) h--;
    return { start: u(h), end: u(x) };
  } else if (p(o)) {
    while (h > 0 && p(h - 1)) h--;
    while (x < s.length && p(x)) x++;
  }
  if (!r)
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
  return { start: u(h), end: u(x) };
}

export { truncateToWidth, truncateToWidthNoEllipsis };
