/**
 * components/ScrollViewportContext.tsx
 *
 * 滚动视口上下文（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-b9xp9wdk.js (6)
 * attribution: placement 6
 */
import { init_react_production, createContext, useContext } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";

//@ chunk-b9xp9wdk.js:267-271 placement
init_react_production();
//@ chunk-b9xp9wdk.js:271-287 placement
/**
 * 导出值：scrollViewportContext（滚动视口上下文）；位于「滚动视口上下文（2.1.316 新增）」模块。
 */
var scrollViewportContext = createContext(null);
//@ chunk-b9xp9wdk.js:287-322 placement
/**
 * 函数 useHasScrollViewport（是否在滚动视口内）；位于「滚动视口上下文（2.1.316 新增）」模块。
 */
function useHasScrollViewport() {
  return useContext(scrollViewportContext) !== null;
}
//@ chunk-b9xp9wdk.js:322-461 placement
/**
 * 在滚动视口上下文里时返回视口的 rows/columns，否则返回传入的尺寸。
 */
function useScrollViewportSize(terminalSize) {
  let $ = useMemoCache(3);
  let viewport = useContext(scrollViewportContext);
  let size;
  if ($[0] !== viewport || $[1] !== terminalSize) {
    size = viewport
      ? {
          rows: viewport.rows,
          columns: viewport.columns,
        }
      : terminalSize;
    $[0] = viewport;
    $[1] = terminalSize;
    $[2] = size;
  } else size = $[2];
  return size;
}
//@ chunk-b9xp9wdk.js:461-512 placement
/**
 * 函数 useScrollViewportHandle（取滚动视口句柄）；位于「滚动视口上下文（2.1.316 新增）」模块。
 */
function useScrollViewportHandle() {
  return useContext(scrollViewportContext)?.scrollViewport ?? null;
}
//@ chunk-b9xp9wdk.js:512-563 placement
/**
 * 函数 useClaimScrollBox（取认领滚动框函数）；位于「滚动视口上下文（2.1.316 新增）」模块。
 */
function useClaimScrollBox() {
  return useContext(scrollViewportContext)?.claimScrollBox ?? null;
}
export {
  scrollViewportContext,
  useScrollViewportHandle,
  useClaimScrollBox,
  useScrollViewportSize,
  useHasScrollViewport,
};
