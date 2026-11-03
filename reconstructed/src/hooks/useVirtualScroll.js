/**
 * hooks/useVirtualScroll.ts
 *
 * 虚拟滚动核心 hook：测量项高度、计算可见区间与滚动偏移。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useVirtualScroll.ts
 * pieces: chunk-ag5x7vhf.js (6)
 * attribution: sole-consumer 2, affinity 3, fingerprint 1
 */
import { R, y, yt, P, Q, Se, eJ, ce, zt } from "../../vendor/react/cjs/react.production.js";
import { notePinnedState } from "../utils/scrollTelemetry.js";
import { SpinnerPaceContext } from "../components/Spinner/paceContext.js";

//@ chunk-ag5x7vhf.js:151715-151758 sole-consumer
var DEFAULT_ITEM_HEIGHT = 3;
var OVERSCAN_BUCKET = 40;
var MAX_RENDERED_ROWS = 80;
var rounded = Math.round(OVERSCAN_BUCKET * 1.5);
//@ chunk-ag5x7vhf.js:151758-151824 sole-consumer
function renderedRowCount(m) {
  return Math.max(rounded, Math.min(Math.round(m * 1.5), MAX_RENDERED_ROWS));
}
//@ chunk-ag5x7vhf.js:151824-151852 affinity
var TAIL_RENDER_ROWS = 30;
var DEFAULT_ROW_HEIGHT_ESTIMATE = 1;
var MAX_ROWS_PER_BATCH = 300;
var MIN_ROWS_PER_BATCH = 25;
//@ chunk-ag5x7vhf.js:151852-158046 fingerprint = useVirtualScroll (0.791)
function useVirtualScroll(scrollRef, itemKeys, columns) {
  let heightCache = R(new Map());
  let offsetVersionRef = R(0);
  let lastScrollTopRef = R(0);
  let offsetsRef = R({
    arr: new Float64Array(0),
    version: -1,
    n: -1,
  });
  let itemRefs = R(new Map());
  let refCache = R(new Map());
  let prevColumns = R({
    len: 0,
    first: undefined,
    last: undefined,
  });
  let prevColumns_2 = R(columns);
  let skipMeasurementRef = R(false);
  let prevRangeRef = R(null);
  let K = R({
    count: 0,
    lastKey: undefined,
  });
  let q = R(0);
  let Y = R(null);
  let pe = R(null);
  if (prevColumns_2.current !== columns) {
    let ratio = prevColumns_2.current / columns;
    prevColumns_2.current = columns;
    for (let [k, Be] of heightCache.current)
      if (Be !== 0) heightCache.current.set(k, Math.max(1, Math.round(Be * ratio)));
    offsetVersionRef.current++;
    skipMeasurementRef.current = true;
    q.current = 2;
    pe.current = Y.current;
  }
  let xe = K.current.count !== itemKeys.length || K.current.lastKey !== itemKeys.at(-1);
  if (q.current > 0 && xe) q.current = 0;
  if (xe) prevRangeRef.current = null;
  let listOriginRef = R(0);
  let [, Re] = y(0);
  let spacerRef = R(null);
  yt(scrollRef.subscribe, () => {
    let handle = scrollRef.handle;
    if (!handle) return NaN;
    let target = handle.getScrollTop() + handle.getPendingDelta();
    let bin = Math.floor(target / OVERSCAN_BUCKET);
    return handle.isSticky() ? ~bin : bin;
  });
  let scrollTop = scrollRef.handle?.getScrollTop() ?? -1;
  let pendingDelta = scrollRef.handle?.getPendingDelta() ?? 0;
  let te = scrollRef.handle?.getViewportHeight() ?? 0;
  let me = renderedRowCount(te);
  let se = scrollRef.handle?.isSticky() ?? true;
  if (q.current > 0) {
    let de = pe.current;
    if (de === null)
      pe.current = {
        sticky: se,
        scrollTop,
      };
    else if (de.sticky !== se || (!se && Math.abs(scrollTop - de.scrollTop) >= Math.max(1, te)))
      q.current = 0;
  }
  let _e = q.current > 0 ? prevRangeRef.current : null;
  P(() => {
    notePinnedState(se);
    return () => notePinnedState(true);
  }, [se]);
  Q(() => {
    let de = prevColumns.current;
    let le = itemKeys[0];
    let Be = itemKeys.length >= de.len && le === de.first && itemKeys[de.len - 1] === de.last;
    de.len = itemKeys.length;
    de.first = le;
    de.last = itemKeys.at(-1);
    if (Be) return;
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
  if (_e) [start, end] = _e;
  else if (te === 0 || scrollTop < 0) {
    start = Math.max(0, n - TAIL_RENDER_ROWS);
    end = n;
  } else {
    if (se) {
      let budget = te + me;
      start = n;
      while (start > 0 && totalHeight - offsets[start - 1] < budget) start--;
      end = n;
    } else {
      let listOrigin = listOriginRef.current;
      let MAX_SPAN_ROWS = te * 3;
      let rawLo = Math.min(scrollTop, scrollTop + pendingDelta);
      let rawHi = Math.max(scrollTop, scrollTop + pendingDelta);
      let span = rawHi - rawLo;
      let clampedLo = span > MAX_SPAN_ROWS ? (pendingDelta < 0 ? rawHi - MAX_SPAN_ROWS : rawLo) : rawLo;
      let clampedHi = clampedLo + Math.min(span, MAX_SPAN_ROWS);
      let effLo = Math.max(0, clampedLo - listOrigin);
      let effHi = clampedHi - listOrigin;
      let lo = effLo - me;
      {
        let Yt = 0;
        let Qt = n;
        while (Yt < Qt) {
          let m = (Yt + Qt) >> 1;
          if (offsets[m + 1] <= lo) Yt = m + 1;
          else Qt = m;
        }
        start = Yt;
      }
      {
        let Yt = prevRangeRef.current;
        if (Yt && Yt[0] < start)
          for (let i = Yt[0]; i < Math.min(start, Yt[1]); i++) {
            let k = itemKeys[i];
            let ee = itemRefs.current.get(k);
            if (
              ee &&
              !heightCache.current.has(k) &&
              !(ee.yogaNode?.getComputedHeight() === 0 && hasDrawPending(ee))
            ) {
              start = i;
              break;
            }
          }
      }
      let needed = te + 2 * me;
      let Po = 0;
      let So = 0;
      end = start;
      while (end < n && So < MAX_ROWS_PER_BATCH && (Po < needed || offsets[end] < effHi + te + me)) {
        let Yt = heightCache.current.get(itemKeys[end]);
        Po += Yt ?? DEFAULT_ROW_HEIGHT_ESTIMATE;
        if (Yt !== 0) So++;
        end++;
      }
    }
    let needed = te + 2 * me;
    let le = 0;
    let Be = 0;
    for (let i = start; i < end; i++) {
      let ze = heightCache.current.get(itemKeys[i]);
      le += ze ?? DEFAULT_ROW_HEIGHT_ESTIMATE;
      if (ze !== 0) Be++;
    }
    while (start > 0 && Be < MAX_ROWS_PER_BATCH && le < needed) {
      start--;
      let Ve = heightCache.current.get(itemKeys[start]);
      le += Ve ?? DEFAULT_ROW_HEIGHT_ESTIMATE;
      if (Ve !== 0) Be++;
    }
    let prev = prevRangeRef.current;
    let scrollVelocity = Math.abs(scrollTop - lastScrollTopRef.current) + Math.abs(pendingDelta);
    if (prev && scrollVelocity > te * 2) {
      let [Ve, ze] = prev;
      if (start < Ve - MIN_ROWS_PER_BATCH) start = Ve - MIN_ROWS_PER_BATCH;
      if (end > ze + MIN_ROWS_PER_BATCH) end = ze + MIN_ROWS_PER_BATCH;
      if (start > end) end = Math.min(start + MIN_ROWS_PER_BATCH, n);
    }
    lastScrollTopRef.current = scrollTop;
  }
  if (q.current > 0) q.current--;
  else {
    prevRangeRef.current = [start, end];
    K.current = {
      count: n,
      lastKey: itemKeys[n - 1],
    };
    Y.current = {
      sticky: se,
      scrollTop,
    };
  }
  let lt = !(Se(SpinnerPaceContext) !== null && se);
  let dStart = R([start, end, n]);
  if (!lt) dStart.current = [start, end, n];
  let ae = eJ(lt ? start : null) ?? dStart.current[0];
  let tt = eJ(lt ? end : null) ?? dStart.current[1];
  let ct = eJ(lt ? n : null) ?? dStart.current[2];
  let effStart = start < ae ? ae : start;
  let $e = end > tt ? tt : end;
  if (effStart > $e || se) {
    effStart = start;
    $e = end;
  }
  if (pendingDelta > 0) $e = end;
  if ($e < end && ct < n && tt >= ct && scrollTop + te > listOriginRef.current + offsets[$e]) $e = end;
  if ($e - effStart > MAX_ROWS_PER_BATCH) {
    let de = -MAX_ROWS_PER_BATCH;
    for (let le = effStart; le < $e; le++) if (heightCache.current.get(itemKeys[le]) !== 0) de++;
    if (de > 0) {
      let le = (offsets[effStart] + offsets[$e]) / 2;
      if (scrollTop - listOriginRef.current < le) {
        while (de > 0) {
          $e--;
          if (heightCache.current.get(itemKeys[$e]) !== 0) de--;
        }
      } else
        while (de > 0) {
          if (heightCache.current.get(itemKeys[effStart]) !== 0) de--;
          effStart++;
        }
    }
  }
  let Qe = offsets[effStart];
  let Wt = $e === n ? 1 / 0 : Math.max(Qe, offsets[$e] - te);
  let Ze = R(null);
  let pt = R(0);
  let Xt = R(null);
  let rt = ce(() => {
    let handle = scrollRef.handle;
    let le = handle?.getScrollTop() ?? 0;
    let Be = handle?.getPendingDelta() ?? 0;
    let st = Boolean(handle?.getDomElement()?.scrollAnchor);
    let Ge = Ze.current;
    if (!Ge || Be !== 0 || st) return le;
    let yogaNode = itemRefs.current.get(Ge.key)?.yogaNode;
    if (!yogaNode || yogaNode.getComputedWidth() === 0) return le;
    let ze = yogaNode.getComputedTop() - Ge.yogaTop;
    if (ze === 0) return le;
    let At = le + ze;
    pt.current += ze;
    Ge.yogaTop += ze;
    handle?.scrollTo(At, {
      preserveHwm: true,
    });
    let listOrigin = pe.current;
    if (q.current > 0 && listOrigin) listOrigin.scrollTop += ze;
    if (handle && ze > 0) raiseScrollHeight(handle);
    return At;
  }, [scrollRef]);
  let qe = ce((de) => {
    let le;
    let Be = -1 / 0;
    itemRefs.current.forEach((st, Ge) => {
      let yogaNode = st.yogaNode;
      if (!yogaNode || yogaNode.getComputedWidth() === 0 || yogaNode.getComputedHeight() === 0) return;
      let computedTop = yogaNode.getComputedTop();
      if (computedTop <= de && computedTop > Be) {
        Be = computedTop;
        le = Ge;
      }
    });
    Ze.current =
      le !== undefined
        ? {
            key: le,
            yogaTop: Be,
          }
        : null;
  }, []);
  zt(() => {
    if (se || scrollTop < 0 || te === 0) {
      Ze.current = null;
      return;
    }
    qe(rt());
  });
  let onLayout = ce(() => {
    let handle = scrollRef.handle;
    if (!handle || handle.isSticky() || handle.getViewportHeight() === 0) {
      Ze.current = null;
      return;
    }
    let le = rt();
    let Be = Xt.current;
    if (Be !== null && Be.max !== 1 / 0) handle.setClampBounds(Be.min, Be.max + Math.max(0, pt.current));
    qe(le);
  }, [scrollRef, rt, qe]);
  zt(() => {
    let spacerYoga = spacerRef.current?.yogaNode;
    if (spacerYoga && spacerYoga.getComputedWidth() > 0) {
      let computedTop = spacerYoga.getComputedTop();
      let Ve = listOriginRef.current;
      listOriginRef.current = computedTop;
      if (Ve !== 0 && Math.abs(computedTop - Ve) > 1) Re((ze) => ze + 1);
    }
    let le = listOriginRef.current;
    if (se) {
      Xt.current = null;
      scrollRef.handle?.setClampBounds(undefined, undefined);
    } else {
      let Ge = effStart === 0 ? 0 : Qe + le;
      let Ve = Wt === 1 / 0 ? 1 / 0 : Wt + le + Math.max(0, pt.current);
      Xt.current = {
        min: Ge,
        max: Ve,
      };
      scrollRef.handle?.setClampBounds(Ge, Ve);
    }
    pt.current = 0;
    if (skipMeasurementRef.current) {
      skipMeasurementRef.current = false;
      return;
    }
    let anyChanged = false;
    let st = false;
    for (let [key, Ve] of itemRefs.current) {
      let yoga = Ve.yogaNode;
      if (!yoga) continue;
      let computedHeight = yoga.getComputedHeight();
      let prev = heightCache.current.get(key);
      if (computedHeight > 0) {
        if (prev !== computedHeight) {
          heightCache.current.set(key, computedHeight);
          anyChanged = true;
          st ||= prev !== undefined && prev - computedHeight > te;
        }
      } else if (yoga.getComputedWidth() > 0 && prev !== 0 && !hasDrawPending(Ve)) {
        heightCache.current.set(key, 0);
        anyChanged = true;
      }
    }
    if (anyChanged) offsetVersionRef.current++;
    if (st) Re((Ge) => Ge + 1);
  });
  let measureRef = ce((key) => {
    let fn = refCache.current.get(key);
    if (!fn) {
      fn = (el) => {
        if (el) itemRefs.current.set(key, el);
        else {
          let st = itemRefs.current.get(key);
          let yoga = st?.yogaNode;
          if (st && yoga && !skipMeasurementRef.current) {
            let computedHeight = yoga.getComputedHeight();
            if (
              (computedHeight > 0 || (yoga.getComputedWidth() > 0 && !hasDrawPending(st))) &&
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
  let getItemTop = ce(
    (index) => {
      let yoga = itemRefs.current.get(itemKeys[index])?.yogaNode;
      if (!yoga || yoga.getComputedWidth() === 0) return -1;
      return yoga.getComputedTop();
    },
    [itemKeys],
  );
  let getItemElement = ce((index) => itemRefs.current.get(itemKeys[index]) ?? null, [itemKeys]);
  let getItemHeight = ce((index) => heightCache.current.get(itemKeys[index]), [itemKeys]);
  let scrollToIndex = ce(
    (i) => {
      let le = offsetsRef.current;
      if (i < 0 || i >= le.n) return;
      scrollRef.handle?.scrollTo(le.arr[i] + listOriginRef.current);
    },
    [scrollRef],
  );
  let effBottomSpacer = totalHeight - offsets[$e];
  return {
    range: [effStart, $e],
    topSpacer: Qe,
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
//@ chunk-ag5x7vhf.js:158046-158178 affinity = dropSubtreeCache (0.775)
function hasDrawPending(node) {
  if (node.attributes.drawPending === true) return true;
  for (let child of node.childNodes) if (child.nodeName !== "#text" && hasDrawPending(child)) return true;
  return false;
}
//@ chunk-ag5x7vhf.js:158178-158357 affinity
function raiseScrollHeight(m) {
  let domElement = m.getDomElement();
  if (!domElement) return;
  let freshScrollHeight = m.getFreshScrollHeight();
  domElement.scrollHeightHwm = Math.max(domElement.scrollHeightHwm ?? 0, freshScrollHeight);
  domElement.scrollHeight = Math.max(domElement.scrollHeight ?? 0, freshScrollHeight);
}
export { useVirtualScroll, raiseScrollHeight };
