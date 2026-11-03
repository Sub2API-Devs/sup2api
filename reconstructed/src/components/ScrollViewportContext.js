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
import { init_react_production, qt, Se } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";

//@ chunk-2e3jzhrc.js:267-271 placement
init_react_production();
//@ chunk-2e3jzhrc.js:271-287 placement
/**
 * 导出值：scrollViewportContext（滚动视口上下文）；位于「滚动视口上下文（2.1.316 新增）」模块。
 */
var scrollViewportContext = qt(null);
//@ chunk-2e3jzhrc.js:287-322 placement
/**
 * 函数 useHasScrollViewport（是否在滚动视口内）；位于「滚动视口上下文（2.1.316 新增）」模块。
 */
function useHasScrollViewport() {
  return Se(scrollViewportContext) !== null;
}
//@ chunk-2e3jzhrc.js:322-461 placement
/**
 * 在滚动视口上下文里时返回视口的 rows/columns，否则返回传入的尺寸。
 */
function useScrollViewportSize(terminalSize) {
  let c = w(3);
  let l = Se(scrollViewportContext);
  let n;
  if (c[0] !== l || c[1] !== terminalSize) {
    n = l
      ? {
          rows: l.rows,
          columns: l.columns,
        }
      : terminalSize;
    c[0] = l;
    c[1] = terminalSize;
    c[2] = n;
  } else n = c[2];
  return n;
}
//@ chunk-2e3jzhrc.js:461-512 placement
/**
 * 函数 useScrollViewportHandle（取滚动视口句柄）；位于「滚动视口上下文（2.1.316 新增）」模块。
 */
function useScrollViewportHandle() {
  return Se(scrollViewportContext)?.scrollViewport ?? null;
}
//@ chunk-2e3jzhrc.js:512-563 placement
/**
 * 函数 useClaimScrollBox（取认领滚动框函数）；位于「滚动视口上下文（2.1.316 新增）」模块。
 */
function useClaimScrollBox() {
  return Se(scrollViewportContext)?.claimScrollBox ?? null;
}
export {
  useScrollViewportSize,
  useHasScrollViewport,
  useScrollViewportHandle,
  useClaimScrollBox,
  scrollViewportContext,
};
