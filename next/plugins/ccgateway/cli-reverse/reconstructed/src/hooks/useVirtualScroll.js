/**
 * hooks/useVirtualScroll.ts
 *
 * 虚拟滚动核心 hook：测量项高度、计算可见区间与滚动偏移。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useVirtualScroll.ts
 * pieces: chunk-hnxhr3bs.js (6)
 * attribution: sole-consumer 2, affinity 3, fingerprint 1
 */
import {
  useRef,
  useState,
  useSyncExternalStore,
  useEffect,
  useMemo,
  useContext,
  useDeferredValue,
  useCallback,
  useLayoutEffect,
} from "../../vendor/react/cjs/react.production.js";
import { notePinnedState } from "../utils/scrollTelemetry.js";
import { SpinnerPaceContext } from "../components/Spinner/paceContext.js";

//@ chunk-hnxhr3bs.js:156015-156058 sole-consumer
var DEFAULT_ITEM_HEIGHT = 3;
var OVERSCAN_BUCKET = 40;
var MAX_RENDERED_ROWS = 80;
var rounded = Math.round(OVERSCAN_BUCKET * 1.5);
//@ chunk-hnxhr3bs.js:156058-156124 sole-consumer
function renderedRowCount(viewportHeight) {
  return Math.max(rounded, Math.min(Math.round(viewportHeight * 1.5), MAX_RENDERED_ROWS));
}
//@ chunk-hnxhr3bs.js:156124-156152 affinity
var TAIL_RENDER_ROWS = 30;
var DEFAULT_ROW_HEIGHT_ESTIMATE = 1;
var MAX_ROWS_PER_BATCH = 300;
var MIN_ROWS_PER_BATCH = 25;
//@ chunk-hnxhr3bs.js:156152-162346 fingerprint (2.1.88 match: useVirtualScroll, 0.799)
function useVirtualScroll(scrollRef, itemKeys, columns) {
  let heightCache = useRef(new Map());
  let offsetVersionRef = useRef(0);
  let lastScrollTopRef = useRef(0);
  let offsetsRef = useRef({
    arr: new Float64Array(0),
    version: -1,
    n: -1,
  });
  let itemRefs = useRef(new Map());
  let refCache = useRef(new Map());
  let prevColumns = useRef({
    len: 0,
    first: undefined,
    last: undefined,
  });
  let prevColumns_2 = useRef(columns);
  let skipMeasurementRef = useRef(false);
  let prevRangeRef = useRef(null);
  let keysSnapshot = useRef({
    count: 0,
    lastKey: undefined,
  });
  let settleTicks = useRef(0);
  let lastRangeState = useRef(null);
  let pendingRangeState = useRef(null);
  if (prevColumns_2.current !== columns) {
    let ratio = prevColumns_2.current / columns;
    prevColumns_2.current = columns;
    for (let [k, height] of heightCache.current)
      if (height !== 0) heightCache.current.set(k, Math.max(1, Math.round(height * ratio)));
    offsetVersionRef.current++;
    skipMeasurementRef.current = true;
    settleTicks.current = 2;
    pendingRangeState.current = lastRangeState.current;
  }
  let keysChanged =
    keysSnapshot.current.count !== itemKeys.length || keysSnapshot.current.lastKey !== itemKeys.at(-1);
  if (settleTicks.current > 0 && keysChanged) settleTicks.current = 0;
  if (keysChanged) prevRangeRef.current = null;
  let listOriginRef = useRef(0);
  let [, forceRender] = useState(0);
  let spacerRef = useRef(null);
  useSyncExternalStore(scrollRef.subscribe, () => {
    let handle = scrollRef.handle;
    if (!handle) return NaN;
    let target = handle.getScrollTop() + handle.getPendingDelta();
    let bin = Math.floor(target / OVERSCAN_BUCKET);
    return handle.isSticky() ? ~bin : bin;
  });
  let scrollTop = scrollRef.handle?.getScrollTop() ?? -1;
  let pendingDelta = scrollRef.handle?.getPendingDelta() ?? 0;
  let viewportHeight = scrollRef.handle?.getViewportHeight() ?? 0;
  let renderedRows = renderedRowCount(viewportHeight);
  let isSticky = scrollRef.handle?.isSticky() ?? true;
  if (settleTicks.current > 0) {
    let pending = pendingRangeState.current;
    if (pending === null)
      pendingRangeState.current = {
        sticky: isSticky,
        scrollTop,
      };
    else if (
      pending.sticky !== isSticky ||
      (!isSticky && Math.abs(scrollTop - pending.scrollTop) >= Math.max(1, viewportHeight))
    )
      settleTicks.current = 0;
  }
  let pinnedRange = settleTicks.current > 0 ? prevRangeRef.current : null;
  useEffect(() => {
    notePinnedState(isSticky);
    return () => notePinnedState(true);
  }, [isSticky]);
  useMemo(() => {
    let snapshot = prevColumns.current;
    let firstKey = itemKeys[0];
    let isUnchanged =
      itemKeys.length >= snapshot.len &&
      firstKey === snapshot.first &&
      itemKeys[snapshot.len - 1] === snapshot.last;
    snapshot.len = itemKeys.length;
    snapshot.first = firstKey;
    snapshot.last = itemKeys.at(-1);
    if (isUnchanged) return;
    let live = new Set(itemKeys);
    let dirty = false;
    for (let k of heightCache.current.keys())
      if (!live.has(k)) {
        heightCache.current.delete(k);
        dirty = true;
      }
    for (let k of refCache.current.keys()) if (!live.has(k)) refCache.current.delete(k);
    if (dirty) offsetVersionRef.current++;
  }, [itemKeys]);
  let n = itemKeys.length;
  if (offsetsRef.current.version !== offsetVersionRef.current || offsetsRef.current.n !== n) {
    let arr = offsetsRef.current.arr.length >= n + 1 ? offsetsRef.current.arr : new Float64Array(n + 1);
    arr[0] = 0;
    for (let i = 0; i < n; i++)
      arr[i + 1] = arr[i] + (heightCache.current.get(itemKeys[i]) ?? DEFAULT_ITEM_HEIGHT);
    offsetsRef.current = {
      arr,
      version: offsetVersionRef.current,
      n,
    };
  }
  let offsets = offsetsRef.current.arr;
  let totalHeight = offsets[n];
  let start;
  let end;
  if (pinnedRange) [start, end] = pinnedRange;
  else if (viewportHeight === 0 || scrollTop < 0) {
    start = Math.max(0, n - TAIL_RENDER_ROWS);
    end = n;
  } else {
    if (isSticky) {
      let budget = viewportHeight + renderedRows;
      start = n;
      while (start > 0 && totalHeight - offsets[start - 1] < budget) start--;
      end = n;
    } else {
      let listOrigin = listOriginRef.current;
      let MAX_SPAN_ROWS = viewportHeight * 3;
      let rawLo = Math.min(scrollTop, scrollTop + pendingDelta);
      let rawHi = Math.max(scrollTop, scrollTop + pendingDelta);
      let span = rawHi - rawLo;
      let clampedLo = span > MAX_SPAN_ROWS ? (pendingDelta < 0 ? rawHi - MAX_SPAN_ROWS : rawLo) : rawLo;
      let clampedHi = clampedLo + Math.min(span, MAX_SPAN_ROWS);
      let effLo = Math.max(0, clampedLo - listOrigin);
      let effHi = clampedHi - listOrigin;
      let lo = effLo - renderedRows;
      {
        let low = 0;
        let high = n;
        while (low < high) {
          let m = (low + high) >> 1;
          if (offsets[m + 1] <= lo) low = m + 1;
          else high = m;
        }
        start = low;
      }
      {
        let previousRange = prevRangeRef.current;
        if (previousRange && previousRange[0] < start)
          for (let i = previousRange[0]; i < Math.min(start, previousRange[1]); i++) {
            let k = itemKeys[i];
            let element = itemRefs.current.get(k);
            if (
              element &&
              !heightCache.current.has(k) &&
              !(element.yogaNode?.getComputedHeight() === 0 && hasDrawPending(element))
            ) {
              start = i;
              break;
            }
          }
      }
      let needed = viewportHeight + 2 * renderedRows;
      let estimatedHeight = 0;
      let measuredCount = 0;
      end = start;
      while (
        end < n &&
        measuredCount < MAX_ROWS_PER_BATCH &&
        (estimatedHeight < needed || offsets[end] < effHi + viewportHeight + renderedRows)
      ) {
        let height = heightCache.current.get(itemKeys[end]);
        estimatedHeight += height ?? DEFAULT_ROW_HEIGHT_ESTIMATE;
        if (height !== 0) measuredCount++;
        end++;
      }
    }
    let needed = viewportHeight + 2 * renderedRows;
    let estimatedHeight = 0;
    let measuredCount = 0;
    for (let i = start; i < end; i++) {
      let height = heightCache.current.get(itemKeys[i]);
      estimatedHeight += height ?? DEFAULT_ROW_HEIGHT_ESTIMATE;
      if (height !== 0) measuredCount++;
    }
    while (start > 0 && measuredCount < MAX_ROWS_PER_BATCH && estimatedHeight < needed) {
      start--;
      let height = heightCache.current.get(itemKeys[start]);
      estimatedHeight += height ?? DEFAULT_ROW_HEIGHT_ESTIMATE;
      if (height !== 0) measuredCount++;
    }
    let prev = prevRangeRef.current;
    let scrollVelocity = Math.abs(scrollTop - lastScrollTopRef.current) + Math.abs(pendingDelta);
    if (prev && scrollVelocity > viewportHeight * 2) {
      let [previousStart, previousEnd] = prev;
      if (start < previousStart - MIN_ROWS_PER_BATCH) start = previousStart - MIN_ROWS_PER_BATCH;
      if (end > previousEnd + MIN_ROWS_PER_BATCH) end = previousEnd + MIN_ROWS_PER_BATCH;
      if (start > end) end = Math.min(start + MIN_ROWS_PER_BATCH, n);
    }
    lastScrollTopRef.current = scrollTop;
  }
  if (settleTicks.current > 0) settleTicks.current--;
  else {
    prevRangeRef.current = [start, end];
    keysSnapshot.current = {
      count: n,
      lastKey: itemKeys[n - 1],
    };
    lastRangeState.current = {
      sticky: isSticky,
      scrollTop,
    };
  }
  let allowsDeferredRange = !(useContext(SpinnerPaceContext) !== null && isSticky);
  let dStart = useRef([start, end, n]);
  if (!allowsDeferredRange) dStart.current = [start, end, n];
  let committedStart = useDeferredValue(allowsDeferredRange ? start : null) ?? dStart.current[0];
  let committedEnd = useDeferredValue(allowsDeferredRange ? end : null) ?? dStart.current[1];
  let committedCount = useDeferredValue(allowsDeferredRange ? n : null) ?? dStart.current[2];
  let effStart = start < committedStart ? committedStart : start;
  let rangeEnd = end > committedEnd ? committedEnd : end;
  if (effStart > rangeEnd || isSticky) {
    effStart = start;
    rangeEnd = end;
  }
  if (pendingDelta > 0) rangeEnd = end;
  if (
    rangeEnd < end &&
    committedCount < n &&
    committedEnd >= committedCount &&
    scrollTop + viewportHeight > listOriginRef.current + offsets[rangeEnd]
  )
    rangeEnd = end;
  if (rangeEnd - effStart > MAX_ROWS_PER_BATCH) {
    let excessMeasured = -MAX_ROWS_PER_BATCH;
    for (let index = effStart; index < rangeEnd; index++)
      if (heightCache.current.get(itemKeys[index]) !== 0) excessMeasured++;
    if (excessMeasured > 0) {
      let midpoint = (offsets[effStart] + offsets[rangeEnd]) / 2;
      if (scrollTop - listOriginRef.current < midpoint) {
        while (excessMeasured > 0) {
          rangeEnd--;
          if (heightCache.current.get(itemKeys[rangeEnd]) !== 0) excessMeasured--;
        }
      } else
        while (excessMeasured > 0) {
          if (heightCache.current.get(itemKeys[effStart]) !== 0) excessMeasured--;
          effStart++;
        }
    }
  }
  let topSpacer = offsets[effStart];
  let bottomSpace = rangeEnd === n ? 1 / 0 : Math.max(topSpacer, offsets[rangeEnd] - viewportHeight);
  let anchorKey = useRef(null);
  let correction = useRef(0);
  let clampBounds = useRef(null);
  let compensateScroll = useCallback(() => {
    let handle = scrollRef.handle;
    let scrollTop = handle?.getScrollTop() ?? 0;
    let pendingDelta = handle?.getPendingDelta() ?? 0;
    let hasScrollAnchor = Boolean(handle?.getDomElement()?.scrollAnchor);
    let anchor = anchorKey.current;
    if (!anchor || pendingDelta !== 0 || hasScrollAnchor) return scrollTop;
    let yogaNode = itemRefs.current.get(anchor.key)?.yogaNode;
    if (!yogaNode || yogaNode.getComputedWidth() === 0) return scrollTop;
    let delta = yogaNode.getComputedTop() - anchor.yogaTop;
    if (delta === 0) return scrollTop;
    let nextScrollTop = scrollTop + delta;
    correction.current += delta;
    anchor.yogaTop += delta;
    handle?.scrollTo(nextScrollTop, {
      preserveHwm: true,
    });
    let listOrigin = pendingRangeState.current;
    if (settleTicks.current > 0 && listOrigin) listOrigin.scrollTop += delta;
    if (handle && delta > 0) raiseScrollHeight(handle);
    return nextScrollTop;
  }, [scrollRef]);
  let trackAnchor = useCallback((scrollTop) => {
    let anchorKey_2;
    let bestTop = -1 / 0;
    itemRefs.current.forEach((element, key) => {
      let yogaNode = element.yogaNode;
      if (!yogaNode || yogaNode.getComputedWidth() === 0 || yogaNode.getComputedHeight() === 0) return;
      let computedTop = yogaNode.getComputedTop();
      if (computedTop <= scrollTop && computedTop > bestTop) {
        bestTop = computedTop;
        anchorKey_2 = key;
      }
    });
    anchorKey.current =
      anchorKey_2 !== undefined
        ? {
            key: anchorKey_2,
            yogaTop: bestTop,
          }
        : null;
  }, []);
  useLayoutEffect(() => {
    if (isSticky || scrollTop < 0 || viewportHeight === 0) {
      anchorKey.current = null;
      return;
    }
    trackAnchor(compensateScroll());
  });
  let onLayout = useCallback(() => {
    let handle = scrollRef.handle;
    if (!handle || handle.isSticky() || handle.getViewportHeight() === 0) {
      anchorKey.current = null;
      return;
    }
    let scrollTop = compensateScroll();
    let bounds = clampBounds.current;
    if (bounds !== null && bounds.max !== 1 / 0)
      handle.setClampBounds(bounds.min, bounds.max + Math.max(0, correction.current));
    trackAnchor(scrollTop);
  }, [scrollRef, compensateScroll, trackAnchor]);
  useLayoutEffect(() => {
    let spacerYoga = spacerRef.current?.yogaNode;
    if (spacerYoga && spacerYoga.getComputedWidth() > 0) {
      let computedTop = spacerYoga.getComputedTop();
      let previousOrigin = listOriginRef.current;
      listOriginRef.current = computedTop;
      if (previousOrigin !== 0 && Math.abs(computedTop - previousOrigin) > 1)
        forceRender((version) => version + 1);
    }
    let listOrigin = listOriginRef.current;
    if (isSticky) {
      clampBounds.current = null;
      scrollRef.handle?.setClampBounds(undefined, undefined);
    } else {
      let min = effStart === 0 ? 0 : topSpacer + listOrigin;
      let max = bottomSpace === 1 / 0 ? 1 / 0 : bottomSpace + listOrigin + Math.max(0, correction.current);
      clampBounds.current = {
        min,
        max,
      };
      scrollRef.handle?.setClampBounds(min, max);
    }
    correction.current = 0;
    if (skipMeasurementRef.current) {
      skipMeasurementRef.current = false;
      return;
    }
    let anyChanged = false;
    let sawShrink = false;
    for (let [key, element] of itemRefs.current) {
      let yoga = element.yogaNode;
      if (!yoga) continue;
      let computedHeight = yoga.getComputedHeight();
      let prev = heightCache.current.get(key);
      if (computedHeight > 0) {
        if (prev !== computedHeight) {
          heightCache.current.set(key, computedHeight);
          anyChanged = true;
          sawShrink ||= prev !== undefined && prev - computedHeight > viewportHeight;
        }
      } else if (yoga.getComputedWidth() > 0 && prev !== 0 && !hasDrawPending(element)) {
        heightCache.current.set(key, 0);
        anyChanged = true;
      }
    }
    if (anyChanged) offsetVersionRef.current++;
    if (sawShrink) forceRender((version) => version + 1);
  });
  let measureRef = useCallback((key) => {
    let fn = refCache.current.get(key);
    if (!fn) {
      fn = (el) => {
        if (el) itemRefs.current.set(key, el);
        else {
          let element = itemRefs.current.get(key);
          let yoga = element?.yogaNode;
          if (element && yoga && !skipMeasurementRef.current) {
            let computedHeight = yoga.getComputedHeight();
            if (
              (computedHeight > 0 || (yoga.getComputedWidth() > 0 && !hasDrawPending(element))) &&
              heightCache.current.get(key) !== computedHeight
            ) {
              heightCache.current.set(key, computedHeight);
              offsetVersionRef.current++;
            }
          }
          itemRefs.current.delete(key);
        }
      };
      refCache.current.set(key, fn);
    }
    return fn;
  }, []);
  let getItemTop = useCallback(
    (index) => {
      let yoga = itemRefs.current.get(itemKeys[index])?.yogaNode;
      if (!yoga || yoga.getComputedWidth() === 0) return -1;
      return yoga.getComputedTop();
    },
    [itemKeys],
  );
  let getItemElement = useCallback((index) => itemRefs.current.get(itemKeys[index]) ?? null, [itemKeys]);
  let getItemHeight = useCallback((index) => heightCache.current.get(itemKeys[index]), [itemKeys]);
  let scrollToIndex = useCallback(
    (i) => {
      let offsetsSnapshot = offsetsRef.current;
      if (i < 0 || i >= offsetsSnapshot.n) return;
      scrollRef.handle?.scrollTo(offsetsSnapshot.arr[i] + listOriginRef.current);
    },
    [scrollRef],
  );
  let effBottomSpacer = totalHeight - offsets[rangeEnd];
  return {
    range: [effStart, rangeEnd],
    topSpacer,
    bottomSpacer: effBottomSpacer,
    measureRef,
    spacerRef,
    offsets,
    getItemTop,
    getItemElement,
    getItemHeight,
    onLayout,
    scrollToIndex,
  };
}
//@ chunk-hnxhr3bs.js:162346-162478 affinity (2.1.88 match: dropSubtreeCache, 0.776)
function hasDrawPending(node) {
  if (node.attributes.drawPending === true) return true;
  for (let child of node.childNodes) if (child.nodeName !== "#text" && hasDrawPending(child)) return true;
  return false;
}
//@ chunk-hnxhr3bs.js:162478-162657 affinity
function raiseScrollHeight(handle) {
  let domElement = handle.getDomElement();
  if (!domElement) return;
  let freshScrollHeight = handle.getFreshScrollHeight();
  domElement.scrollHeightHwm = Math.max(domElement.scrollHeightHwm ?? 0, freshScrollHeight);
  domElement.scrollHeight = Math.max(domElement.scrollHeight ?? 0, freshScrollHeight);
}
export { useVirtualScroll, raiseScrollHeight };
