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
  totalItems: totalItems,
  maxVisible: maxVisible = DEFAULT_MAX_VISIBLE,
  selectedIndex: selectedIndex = 0,
  firstSelectableIndex: firstSelectableIndex = 0,
  onScroll: onScroll,
}) {
  let T = totalItems > maxVisible,
    scrollOffsetRef = R(0),
    [U, L] = y(0),
    scrollOffset = Q(() => {
      if (!T) return 0;
      let prevOffset = scrollOffsetRef.current;
      if (selectedIndex < prevOffset) {
        let Oe = selectedIndex <= firstSelectableIndex ? 0 : selectedIndex;
        return ((scrollOffsetRef.current = Oe), Oe);
      }
      if (selectedIndex >= prevOffset + maxVisible) {
        let Oe = selectedIndex - maxVisible + 1;
        return ((scrollOffsetRef.current = Oe), Oe);
      }
      let maxOffset = Math.max(0, totalItems - maxVisible),
        clampedOffset = Math.min(prevOffset, maxOffset);
      return ((scrollOffsetRef.current = clampedOffset), clampedOffset);
    }, [selectedIndex, maxVisible, T, totalItems, firstSelectableIndex, U]),
    startIndex = scrollOffset,
    endIndex = Math.min(scrollOffset + maxVisible, totalItems),
    getVisibleItems = ce(
      (items) => {
        if (!T) return items;
        return items.slice(startIndex, endIndex);
      },
      [T, startIndex, endIndex],
    ),
    toActualIndex = ce((visibleIndex) => startIndex + visibleIndex, [startIndex]),
    isOnCurrentPage = ce(
      (ne, he) => {
        let max = Math.max(0, Math.min(ne, totalItems - 1));
        he(max);
      },
      [totalItems],
    );
  function pe(actualIndex) {
    ((scrollOffsetRef.current = actualIndex), L((he) => he + 1), onScroll?.(actualIndex));
  }
  function fe(ne) {
    let clampedIndex = Math.max(0, Math.min(ne, totalItems - maxVisible));
    pe(clampedIndex <= firstSelectableIndex ? 0 : clampedIndex);
  }
  function me(ne) {
    if (ne.deltaY === 0) return;
    let he = ne.deltaY > 0,
      W = scrollOffsetRef.current,
      Oe = totalItems - maxVisible,
      totalPages = Math.max(0, Math.min(W + (he ? 1 : -1), Oe)),
      min = Math.min(firstSelectableIndex + 1, Oe),
      je = he ? min : 0,
      ae = totalPages > firstSelectableIndex ? totalPages : je;
    if (ae !== W) pe(ae);
    ne.stopImmediatePropagation();
  }
  return {
    startIndex: startIndex,
    endIndex: endIndex,
    needsPagination: T,
    getVisibleItems: getVisibleItems,
    toActualIndex: toActualIndex,
    handleSelectionChange: isOnCurrentPage,
    bar: {
      offset: startIndex,
      visible: endIndex - startIndex,
      total: totalItems,
      onScrollTo: T ? fe : void 0,
    },
    onWheel: T ? me : void 0,
    scrollPosition: {
      current: selectedIndex + 1,
      total: totalItems,
      canScrollUp: scrollOffset > 0,
      canScrollDown: scrollOffset + maxVisible < totalItems,
    },
  };
}

export { usePagination };
