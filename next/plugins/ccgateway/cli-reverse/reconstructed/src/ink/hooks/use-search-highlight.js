/**
 * ink/hooks/use-search-highlight.ts
 *
 * useSearchHighlight：设置全屏搜索高亮词与当前命中
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/hooks/use-search-highlight.ts
 * pieces: chunk-czq1j3j2.js (1)
 * attribution: fingerprint 1
 */
import { useContext, useMemo } from "../../../vendor/react/cjs/react.production.js";
import { StdinContextAlias } from "../terminalModes.js";
import { getSecondRootError } from "../terminal.js";

//@ chunk-czq1j3j2.js:137184-137456 fingerprint (2.1.88 match: useSearchHighlight, 1)
/**
 * 搜索高亮钩子：setQuery（全屏高亮所有匹配）、scanElement（在某元素子树里扫描匹配位置）、setPositions（设置位置式高亮与当前匹配）。
 */
function useSearchHighlight() {
  useContext(StdinContextAlias);
  let ink = getSecondRootError().get(process.stdout);
  return useMemo(() => {
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
