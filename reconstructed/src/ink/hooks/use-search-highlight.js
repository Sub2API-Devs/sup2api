/**
 * ink/hooks/use-search-highlight.ts
 *
 * useSearchHighlight：设置全屏搜索高亮词与当前命中
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/hooks/use-search-highlight.ts
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { Se, Q } from "../../../vendor/react/cjs/react.production.js";
import { StdinContextAlias } from "../terminalModes.js";
import { getSecondRootError } from "../terminal.js";

//@ chunk-18hwfzwa.js:136070-136342 fingerprint = useSearchHighlight (1)
/**
 * 搜索高亮钩子：setQuery（全屏高亮所有匹配）、scanElement（在某元素子树里扫描匹配位置）、setPositions（设置位置式高亮与当前匹配）。
 */
function useSearchHighlight() {
  Se(StdinContextAlias);
  let ink = getSecondRootError().get(process.stdout);
  return Q(() => {
    if (!ink)
      return {
        setQuery: () => {},
        scanElement: () => [],
        setPositions: () => {},
      };
    return {
      setQuery: (query) => ink.setSearchHighlight(query),
      scanElement: (el) => ink.scanElementSubtree(el),
      setPositions: (state) => ink.setSearchPositions(state),
    };
  }, [ink]);
}
export { useSearchHighlight };
