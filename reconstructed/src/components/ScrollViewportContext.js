/**
 * components/ScrollViewportContext.tsx
 *
 * 滚动视口上下文（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2e3jzhrc.js (6)
 * attribution: placement 6
 */
import { j, qt, Se } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";

//@ chunk-2e3jzhrc.js:267-271 placement
j();
//@ chunk-2e3jzhrc.js:271-287 placement
var $E = qt(null);
//@ chunk-2e3jzhrc.js:287-322 placement
function Tl() {
  return Se($E) !== null;
}
/**
 * 在滚动视口上下文里时返回视口的 rows/columns，否则返回传入的尺寸。
 */
//@ chunk-2e3jzhrc.js:322-461 placement
function useScrollViewportSize(o) {
  let c = w(3),
    l = Se($E),
    n;
  if (c[0] !== l || c[1] !== o)
    ((n = l ? { rows: l.rows, columns: l.columns } : o), (c[0] = l), (c[1] = o), (c[2] = n));
  else n = c[2];
  return n;
}
//@ chunk-2e3jzhrc.js:461-512 placement
function fTe() {
  return Se($E)?.scrollViewport ?? null;
}
//@ chunk-2e3jzhrc.js:512-563 placement
function Xmt() {
  return Se($E)?.claimScrollBox ?? null;
}

export { useScrollViewportSize, Tl, fTe, Xmt, $E };
