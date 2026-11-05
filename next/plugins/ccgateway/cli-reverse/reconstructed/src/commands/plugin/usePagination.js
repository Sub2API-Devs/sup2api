/**
 * commands/plugin/usePagination.ts
 *
 * 列表分页 Hook
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plugin/usePagination.ts
 * pieces: chunk-wb51jffc.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { useRef, useState, useMemo, useCallback } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-wb51jffc.js:70060-70069 affinity
var DEFAULT_MAX_VISIBLE = 5;
//@ chunk-wb51jffc.js:70069-71161 fingerprint (2.1.88 match: usePagination, 0.702)
function usePagination({
  totalItems,
  maxVisible = DEFAULT_MAX_VISIBLE,
  selectedIndex = 0,
  firstSelectableIndex = 0,
  onScroll,
}) {
  let needsPagination = totalItems > maxVisible;
  let scrollOffsetRef = useRef(0);
  let [tick, setTick] = useState(0);
  let scrollOffset = useMemo(() => {
    if (!needsPagination) return 0;
    let prevOffset = scrollOffsetRef.current;
    if (selectedIndex < prevOffset) {
      let clamped = selectedIndex <= firstSelectableIndex ? 0 : selectedIndex;
      scrollOffsetRef.current = clamped;
      return clamped;
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
  }, [selectedIndex, maxVisible, needsPagination, totalItems, firstSelectableIndex, tick]);
  let startIndex = scrollOffset;
  let endIndex = Math.min(scrollOffset + maxVisible, totalItems);
  let getVisibleItems = useCallback(
    (items) => {
      if (!needsPagination) return items;
      return items.slice(startIndex, endIndex);
    },
    [needsPagination, startIndex, endIndex],
  );
  let toActualIndex = useCallback((visibleIndex) => startIndex + visibleIndex, [startIndex]);
  let isOnCurrentPage = useCallback(
    (newIndex, setSelectedIndex) => {
      let clampedIndex = Math.max(0, Math.min(newIndex, totalItems - 1));
      setSelectedIndex(clampedIndex);
    },
    [totalItems],
  );
  function handleSelectionChange(actualIndex) {
    scrollOffsetRef.current = actualIndex;
    setTick((n) => n + 1);
    onScroll?.(actualIndex);
  }
  function handleScroll(delta) {
    let clampedIndex = Math.max(0, Math.min(delta, totalItems - maxVisible));
    handleSelectionChange(clampedIndex <= firstSelectableIndex ? 0 : clampedIndex);
  }
  function handleWheel(event) {
    if (event.deltaY === 0) return;
    let downward = event.deltaY > 0;
    let currentOffset = scrollOffsetRef.current;
    let maxOffset = totalItems - maxVisible;
    let totalPages = Math.max(0, Math.min(currentOffset + (downward ? 1 : -1), maxOffset));
    let min = Math.min(firstSelectableIndex + 1, maxOffset);
    let clamped = downward ? min : 0;
    let actualIndex = totalPages > firstSelectableIndex ? totalPages : clamped;
    if (actualIndex !== currentOffset) handleSelectionChange(actualIndex);
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
      onScrollTo: needsPagination ? handleScroll : undefined,
    },
    onWheel: needsPagination ? handleWheel : undefined,
    scrollPosition: {
      current: selectedIndex + 1,
      total: totalItems,
      canScrollUp: scrollOffset > 0,
      canScrollDown: scrollOffset + maxVisible < totalItems,
    },
  };
}
export { usePagination };
