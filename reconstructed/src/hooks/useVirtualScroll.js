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
var JD = 3,
  rx = 40,
  QD = 80,
  rounded = Math.round(rx * 1.5);
//@ chunk-ag5x7vhf.js:151758-151824 sole-consumer
function eA(m) {
  return Math.max(rounded, Math.min(Math.round(m * 1.5), QD));
}
//@ chunk-ag5x7vhf.js:151824-151852 affinity
var tA = 30,
  $p = 1,
  rc = 300,
  Ii = 25;
//@ chunk-ag5x7vhf.js:151852-158046 fingerprint = useVirtualScroll (0.791)
function useVirtualScroll(scrollRef, itemKeys, columns) {
  let heightCache = R(new Map()),
    offsetVersionRef = R(0),
    lastScrollTopRef = R(0),
    offsetsRef = R({ arr: new Float64Array(0), version: -1, n: -1 }),
    itemRefs = R(new Map()),
    refCache = R(new Map()),
    prevColumns = R({ len: 0, first: void 0, last: void 0 }),
    skipMeasurementRef = R(columns),
    prevRangeRef = R(!1),
    freezeRendersRef = R(null),
    K = R({ count: 0, lastKey: void 0 }),
    q = R(0),
    Y = R(null),
    pe = R(null);
  if (skipMeasurementRef.current !== columns) {
    let de = skipMeasurementRef.current / columns;
    skipMeasurementRef.current = columns;
    for (let [le, Be] of heightCache.current)
      if (Be !== 0) heightCache.current.set(le, Math.max(1, Math.round(Be * de)));
    (offsetVersionRef.current++, (prevRangeRef.current = !0), (q.current = 2), (pe.current = Y.current));
  }
  let xe = K.current.count !== itemKeys.length || K.current.lastKey !== itemKeys.at(-1);
  if (q.current > 0 && xe) q.current = 0;
  if (xe) freezeRendersRef.current = null;
  let listOriginRef = R(0),
    [, Re] = y(0),
    spacerRef = R(null);
  yt(scrollRef.subscribe, () => {
    let handle = scrollRef.handle;
    if (!handle) return NaN;
    let le = handle.getScrollTop() + handle.getPendingDelta(),
      bin = Math.floor(le / rx);
    return handle.isSticky() ? ~bin : bin;
  });
  let fe = scrollRef.handle?.getScrollTop() ?? -1,
    Fe = scrollRef.handle?.getPendingDelta() ?? 0,
    te = scrollRef.handle?.getViewportHeight() ?? 0,
    me = eA(te),
    se = scrollRef.handle?.isSticky() ?? !0;
  if (q.current > 0) {
    let de = pe.current;
    if (de === null) pe.current = { sticky: se, scrollTop: fe };
    else if (de.sticky !== se || (!se && Math.abs(fe - de.scrollTop) >= Math.max(1, te))) q.current = 0;
  }
  let _e = q.current > 0 ? freezeRendersRef.current : null;
  (P(() => (notePinnedState(se), () => notePinnedState(!0)), [se]),
    Q(() => {
      let de = prevColumns.current,
        le = itemKeys[0],
        Be = itemKeys.length >= de.len && le === de.first && itemKeys[de.len - 1] === de.last;
      if (((de.len = itemKeys.length), (de.first = le), (de.last = itemKeys.at(-1)), Be)) return;
      let live = new Set(itemKeys),
        Ge = !1;
      for (let Ve of heightCache.current.keys())
        if (!live.has(Ve)) (heightCache.current.delete(Ve), (Ge = !0));
      for (let Ve of refCache.current.keys()) if (!live.has(Ve)) refCache.current.delete(Ve);
      if (Ge) offsetVersionRef.current++;
    }, [itemKeys]));
  let oe = itemKeys.length;
  if (offsetsRef.current.version !== offsetVersionRef.current || offsetsRef.current.n !== oe) {
    let de = offsetsRef.current.arr.length >= oe + 1 ? offsetsRef.current.arr : new Float64Array(oe + 1);
    de[0] = 0;
    for (let le = 0; le < oe; le++) de[le + 1] = de[le] + (heightCache.current.get(itemKeys[le]) ?? JD);
    offsetsRef.current = { arr: de, version: offsetVersionRef.current, n: oe };
  }
  let offsets = offsetsRef.current.arr,
    Ee = offsets[oe],
    He,
    Ue;
  if (_e) [He, Ue] = _e;
  else if (te === 0 || fe < 0) ((He = Math.max(0, oe - tA)), (Ue = oe));
  else {
    if (se) {
      let Ve = te + me;
      He = oe;
      while (He > 0 && Ee - offsets[He - 1] < Ve) He--;
      Ue = oe;
    } else {
      let listOrigin = listOriginRef.current,
        ze = te * 3,
        rawLo = Math.min(fe, fe + Fe),
        rawHi = Math.max(fe, fe + Fe),
        jt = rawHi - rawLo,
        oo = jt > ze ? (Fe < 0 ? rawHi - ze : rawLo) : rawLo,
        mo = oo + Math.min(jt, ze),
        effLo = Math.max(0, oo - listOrigin),
        Gt = mo - listOrigin,
        Mo = effLo - me;
      {
        let Yt = 0,
          Qt = oe;
        while (Yt < Qt) {
          let ne = (Yt + Qt) >> 1;
          if (offsets[ne + 1] <= Mo) Yt = ne + 1;
          else Qt = ne;
        }
        He = Yt;
      }
      {
        let Yt = freezeRendersRef.current;
        if (Yt && Yt[0] < He)
          for (let Qt = Yt[0]; Qt < Math.min(He, Yt[1]); Qt++) {
            let ne = itemKeys[Qt],
              ee = itemRefs.current.get(ne);
            if (
              ee &&
              !heightCache.current.has(ne) &&
              !(ee.yogaNode?.getComputedHeight() === 0 && hasDrawPending(ee))
            ) {
              He = Qt;
              break;
            }
          }
      }
      let Vo = te + 2 * me,
        Po = 0,
        So = 0;
      Ue = He;
      while (Ue < oe && So < rc && (Po < Vo || offsets[Ue] < Gt + te + me)) {
        let Yt = heightCache.current.get(itemKeys[Ue]);
        if (((Po += Yt ?? $p), Yt !== 0)) So++;
        Ue++;
      }
    }
    let de = te + 2 * me,
      le = 0,
      Be = 0;
    for (let Ve = He; Ve < Ue; Ve++) {
      let ze = heightCache.current.get(itemKeys[Ve]);
      if (((le += ze ?? $p), ze !== 0)) Be++;
    }
    while (He > 0 && Be < rc && le < de) {
      He--;
      let Ve = heightCache.current.get(itemKeys[He]);
      if (((le += Ve ?? $p), Ve !== 0)) Be++;
    }
    let prev = freezeRendersRef.current,
      Ge = Math.abs(fe - lastScrollTopRef.current) + Math.abs(Fe);
    if (prev && Ge > te * 2) {
      let [Ve, ze] = prev;
      if (He < Ve - Ii) He = Ve - Ii;
      if (Ue > ze + Ii) Ue = ze + Ii;
      if (He > Ue) Ue = Math.min(He + Ii, oe);
    }
    lastScrollTopRef.current = fe;
  }
  if (q.current > 0) q.current--;
  else
    ((freezeRendersRef.current = [He, Ue]),
      (K.current = { count: oe, lastKey: itemKeys[oe - 1] }),
      (Y.current = { sticky: se, scrollTop: fe }));
  let lt = !(Se(SpinnerPaceContext) !== null && se),
    dStart = R([He, Ue, oe]);
  if (!lt) dStart.current = [He, Ue, oe];
  let ae = eJ(lt ? He : null) ?? dStart.current[0],
    tt = eJ(lt ? Ue : null) ?? dStart.current[1],
    ct = eJ(lt ? oe : null) ?? dStart.current[2],
    Je = He < ae ? ae : He,
    $e = Ue > tt ? tt : Ue;
  if (Je > $e || se) ((Je = He), ($e = Ue));
  if (Fe > 0) $e = Ue;
  if ($e < Ue && ct < oe && tt >= ct && fe + te > listOriginRef.current + offsets[$e]) $e = Ue;
  if ($e - Je > rc) {
    let de = -rc;
    for (let le = Je; le < $e; le++) if (heightCache.current.get(itemKeys[le]) !== 0) de++;
    if (de > 0) {
      let le = (offsets[Je] + offsets[$e]) / 2;
      if (fe - listOriginRef.current < le) {
        while (de > 0) if (($e--, heightCache.current.get(itemKeys[$e]) !== 0)) de--;
      } else
        while (de > 0) {
          if (heightCache.current.get(itemKeys[Je]) !== 0) de--;
          Je++;
        }
    }
  }
  let Qe = offsets[Je],
    Wt = $e === oe ? 1 / 0 : Math.max(Qe, offsets[$e] - te),
    Ze = R(null),
    pt = R(0),
    Xt = R(null),
    rt = ce(() => {
      let handle = scrollRef.handle,
        le = handle?.getScrollTop() ?? 0,
        Be = handle?.getPendingDelta() ?? 0,
        st = Boolean(handle?.getDomElement()?.scrollAnchor),
        Ge = Ze.current;
      if (!Ge || Be !== 0 || st) return le;
      let Ve = itemRefs.current.get(Ge.key)?.yogaNode;
      if (!Ve || Ve.getComputedWidth() === 0) return le;
      let ze = Ve.getComputedTop() - Ge.yogaTop;
      if (ze === 0) return le;
      let At = le + ze;
      ((pt.current += ze), (Ge.yogaTop += ze), handle?.scrollTo(At, { preserveHwm: !0 }));
      let listOrigin = pe.current;
      if (q.current > 0 && listOrigin) listOrigin.scrollTop += ze;
      if (handle && ze > 0) raiseScrollHeight(handle);
      return At;
    }, [scrollRef]),
    qe = ce((de) => {
      let le,
        Be = -1 / 0;
      (itemRefs.current.forEach((st, Ge) => {
        let yogaNode = st.yogaNode;
        if (!yogaNode || yogaNode.getComputedWidth() === 0 || yogaNode.getComputedHeight() === 0) return;
        let computedTop = yogaNode.getComputedTop();
        if (computedTop <= de && computedTop > Be) ((Be = computedTop), (le = Ge));
      }),
        (Ze.current = le !== void 0 ? { key: le, yogaTop: Be } : null));
    }, []);
  zt(() => {
    if (se || fe < 0 || te === 0) {
      Ze.current = null;
      return;
    }
    qe(rt());
  });
  let St = ce(() => {
    let handle = scrollRef.handle;
    if (!handle || handle.isSticky() || handle.getViewportHeight() === 0) {
      Ze.current = null;
      return;
    }
    let le = rt(),
      Be = Xt.current;
    if (Be !== null && Be.max !== 1 / 0) handle.setClampBounds(Be.min, Be.max + Math.max(0, pt.current));
    qe(le);
  }, [scrollRef, rt, qe]);
  zt(() => {
    let de = spacerRef.current?.yogaNode;
    if (de && de.getComputedWidth() > 0) {
      let computedTop = de.getComputedTop(),
        Ve = listOriginRef.current;
      if (((listOriginRef.current = computedTop), Ve !== 0 && Math.abs(computedTop - Ve) > 1))
        Re((ze) => ze + 1);
    }
    let le = listOriginRef.current;
    if (se) ((Xt.current = null), scrollRef.handle?.setClampBounds(void 0, void 0));
    else {
      let Ge = Je === 0 ? 0 : Qe + le,
        Ve = Wt === 1 / 0 ? 1 / 0 : Wt + le + Math.max(0, pt.current);
      ((Xt.current = { min: Ge, max: Ve }), scrollRef.handle?.setClampBounds(Ge, Ve));
    }
    if (((pt.current = 0), prevRangeRef.current)) {
      prevRangeRef.current = !1;
      return;
    }
    let Be = !1,
      st = !1;
    for (let [Ge, Ve] of itemRefs.current) {
      let yoga = Ve.yogaNode;
      if (!yoga) continue;
      let computedHeight = yoga.getComputedHeight(),
        prev = heightCache.current.get(Ge);
      if (computedHeight > 0) {
        if (prev !== computedHeight)
          (heightCache.current.set(Ge, computedHeight),
            (Be = !0),
            (st ||= prev !== void 0 && prev - computedHeight > te));
      } else if (yoga.getComputedWidth() > 0 && prev !== 0 && !hasDrawPending(Ve))
        (heightCache.current.set(Ge, 0), (Be = !0));
    }
    if (Be) offsetVersionRef.current++;
    if (st) Re((Ge) => Ge + 1);
  });
  let measureRef = ce((key) => {
      let fn = refCache.current.get(key);
      if (!fn)
        ((fn = (el) => {
          if (el) itemRefs.current.set(key, el);
          else {
            let st = itemRefs.current.get(key),
              yoga = st?.yogaNode;
            if (st && yoga && !prevRangeRef.current) {
              let computedHeight = yoga.getComputedHeight();
              if (
                (computedHeight > 0 || (yoga.getComputedWidth() > 0 && !hasDrawPending(st))) &&
                heightCache.current.get(key) !== computedHeight
              )
                (heightCache.current.set(key, computedHeight), offsetVersionRef.current++);
            }
            itemRefs.current.delete(key);
          }
        }),
          refCache.current.set(key, fn));
      return fn;
    }, []),
    getItemTop = ce(
      (index) => {
        let yoga = itemRefs.current.get(itemKeys[index])?.yogaNode;
        if (!yoga || yoga.getComputedWidth() === 0) return -1;
        return yoga.getComputedTop();
      },
      [itemKeys],
    ),
    getItemElement = ce((index) => itemRefs.current.get(itemKeys[index]) ?? null, [itemKeys]),
    getItemHeight = ce((index) => heightCache.current.get(itemKeys[index]), [itemKeys]),
    scrollToIndex = ce(
      (de) => {
        let le = offsetsRef.current;
        if (de < 0 || de >= le.n) return;
        scrollRef.handle?.scrollTo(le.arr[de] + listOriginRef.current);
      },
      [scrollRef],
    ),
    to = Ee - offsets[$e];
  return {
    range: [Je, $e],
    topSpacer: Qe,
    bottomSpacer: to,
    measureRef: measureRef,
    spacerRef: spacerRef,
    offsets: offsets,
    getItemTop: getItemTop,
    getItemElement: getItemElement,
    getItemHeight: getItemHeight,
    onLayout: St,
    scrollToIndex: scrollToIndex,
  };
}
//@ chunk-ag5x7vhf.js:158046-158178 affinity = dropSubtreeCache (0.775)
function hasDrawPending(node) {
  if (node.attributes.drawPending === !0) return !0;
  for (let child of node.childNodes) if (child.nodeName !== "#text" && hasDrawPending(child)) return !0;
  return !1;
}
//@ chunk-ag5x7vhf.js:158178-158357 affinity
function raiseScrollHeight(m) {
  let domElement = m.getDomElement();
  if (!domElement) return;
  let freshScrollHeight = m.getFreshScrollHeight();
  ((domElement.scrollHeightHwm = Math.max(domElement.scrollHeightHwm ?? 0, freshScrollHeight)),
    (domElement.scrollHeight = Math.max(domElement.scrollHeight ?? 0, freshScrollHeight)));
}

export { useVirtualScroll, raiseScrollHeight };
