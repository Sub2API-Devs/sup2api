/**
 * commands/plugin/usePagination.ts
 *
 * 列表分页 Hook
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plugin/usePagination.ts
 * pieces: chunk-vrb44rx7.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { R, y, Q, ce } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-vrb44rx7.js:69906-69915 affinity
var DEFAULT_MAX_VISIBLE = 5;
//@ chunk-vrb44rx7.js:69915-71007 fingerprint = usePagination (0.7)
function usePagination({
  totalItems,
  maxVisible = DEFAULT_MAX_VISIBLE,
  selectedIndex = 0,
  firstSelectableIndex = 0,
  onScroll,
}) {
  let needsPagination = totalItems > maxVisible;
  let scrollOffsetRef = R(0);
  let [U, L] = y(0);
  let scrollOffset = Q(() => {
    if (!needsPagination) return 0;
    let prevOffset = scrollOffsetRef.current;
    if (selectedIndex < prevOffset) {
      let Oe = selectedIndex <= firstSelectableIndex ? 0 : selectedIndex;
      scrollOffsetRef.current = Oe;
      return Oe;
    }
    if (selectedIndex >= prevOffset + maxVisible) {
      let newOffset = selectedIndex - maxVisible + 1;
      scrollOffsetRef.current = newOffset;
      return newOffset;
    }
    let maxOffset = Math.max(0, totalItems - maxVisible);
    let clampedOffset = Math.min(prevOffset, maxOffset);
    scrollOffsetRef.current = clampedOffset;
    return clampedOffset;
  }, [selectedIndex, maxVisible, needsPagination, totalItems, firstSelectableIndex, U]);
  let startIndex = scrollOffset;
  let endIndex = Math.min(scrollOffset + maxVisible, totalItems);
  let getVisibleItems = ce(
    (items) => {
      if (!needsPagination) return items;
      return items.slice(startIndex, endIndex);
    },
    [needsPagination, startIndex, endIndex],
  );
  let toActualIndex = ce((visibleIndex) => startIndex + visibleIndex, [startIndex]);
  let isOnCurrentPage = ce(
    (newIndex, setSelectedIndex) => {
      let clampedIndex = Math.max(0, Math.min(newIndex, totalItems - 1));
      setSelectedIndex(clampedIndex);
    },
    [totalItems],
  );
  function pe(actualIndex) {
    scrollOffsetRef.current = actualIndex;
    L((he) => he + 1);
    onScroll?.(actualIndex);
  }
  function fe(ne) {
    let clampedIndex = Math.max(0, Math.min(ne, totalItems - maxVisible));
    pe(clampedIndex <= firstSelectableIndex ? 0 : clampedIndex);
  }
  function me(event) {
    if (event.deltaY === 0) return;
    let he = event.deltaY > 0;
    let W = scrollOffsetRef.current;
    let Oe = totalItems - maxVisible;
    let totalPages = Math.max(0, Math.min(W + (he ? 1 : -1), Oe));
    let min = Math.min(firstSelectableIndex + 1, Oe);
    let je = he ? min : 0;
    let actualIndex = totalPages > firstSelectableIndex ? totalPages : je;
    if (actualIndex !== W) pe(actualIndex);
    event.stopImmediatePropagation();
  }
  return {
    startIndex,
    endIndex,
    needsPagination,
    getVisibleItems,
    toActualIndex,
    handleSelectionChange: isOnCurrentPage,
    bar: {
      offset: startIndex,
      visible: endIndex - startIndex,
      total: totalItems,
      onScrollTo: needsPagination ? fe : undefined,
    },
    onWheel: needsPagination ? me : undefined,
    scrollPosition: {
      current: selectedIndex + 1,
      total: totalItems,
      canScrollUp: scrollOffset > 0,
      canScrollDown: scrollOffset + maxVisible < totalItems,
    },
  };
}
export { usePagination };
