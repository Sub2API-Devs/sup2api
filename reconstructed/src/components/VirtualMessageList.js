/**
 * components/VirtualMessageList.tsx
 *
 * 虚拟滚动消息列表：按测量高度只渲染视口内的项，支持搜索高亮跳转、置顶用户提示跟踪。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/VirtualMessageList.tsx
 * pieces: chunk-ag5x7vhf.js (33)
 * attribution: placement 17, layout 3, file-local 2, fingerprint 4, sole-consumer 7
 */
import { yt, y, R, Q, Oo, ce, P, vxe, Se } from "../../vendor/react/cjs/react.production.js";
import { getClawdPoseState, Rmt, clearKeptClawdPose } from "./LogoV2/Clawd.js";
import { i2r } from "../plugins/functionHooks/uiApi.js";
import { getMessageSearchText } from "./Messages.js";
import { t7 } from "../utils/messages/pluginPrompts.js";
import { joinTextContent } from "../utils/messageProvenance.js";
import { stripLeadingSystemReminders, UUID_PREFIX_LENGTH } from "../utils/messages.js";
import { e, r, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Zmt } from "../ink/components/Text.js";
import { useHost } from "../context/session.js";
import { NAVIGABLE_TYPES } from "./messageActions.js";
import { useVirtualScroll, raiseScrollHeight } from "../hooks/useVirtualScroll.js";
import { clampScrollTop } from "../ink/events/event-handlers.js";
import { logForDebugging } from "../utils/debug.js";
import { useClock } from "../ink/components/ClockContext.js";
import { sleep } from "../utils/sleep.js";
import { hasStringUuid } from "../bridge/inboundMessages.js";
import { di } from "../ink/terminal.js";
import { isMessageStreaming } from "./MessageRow.js";
import { claimOnceStore } from "../services/api/verificationRequired.js";
import { logError } from "../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../utils/errors.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { kp } from "../../vendor/convert-to-spaces/dist/index.js";
import { useScrollChrome } from "./FullscreenLayout.js";
import { rpn } from "../services/api/errors.js";
import { plural } from "../utils/stringUtils.js";

//@ chunk-ag5x7vhf.js:158361-158417 placement
function qp(m, h) {
  return yt(m.subscribe, () => h(m.handle));
}
//@ chunk-ag5x7vhf.js:158417-158487 placement
function Ypt() {
  let m = getClawdPoseState().runs + 1;
  return (Rmt.set({ ...getClawdPoseState(), runs: m }), m);
}
//@ chunk-ag5x7vhf.js:158487-158544 placement
var Xpt = (m) => (m !== void 0 && m > getClawdPoseState().takenAfter ? clearKeptClawdPose() : void 0);
//@ chunk-ag5x7vhf.js:158544-158647 placement
function clearKeptPoseOnSelection(m) {
  return getClawdPoseState().kept !== void 0 && m.hasTextSelection() && m.getSelectedText() !== ""
    ? clearKeptClawdPose()
    : void 0;
}
//@ chunk-ag5x7vhf.js:158647-158854 placement
function isSelectionWithinViewport(m, h) {
  let x = (_) => _ !== void 0 && h.first <= _ && _ <= h.last,
    T = m.virtualAnchorRow !== void 0 || x(m.anchor?.row),
    k = m.virtualFocusRow !== void 0 || x(m.focus?.row);
  return h.node !== null && m.scope?.node === h.node && T && k;
}
//@ chunk-ag5x7vhf.js:158854-159075 placement
function getAbsoluteTop(m) {
  let h = 0,
    x = m;
  while (x !== void 0) {
    if (x.yogaNode === void 0) return;
    let T = x !== m && (x.style.overflowY ?? x.style.overflow) === "scroll";
    ((h += x.yogaNode.getComputedTop() - (T ? (x.scrollTopRendered ?? 0) : 0)), (x = x.parentNode));
  }
  return h;
}
//@ chunk-ag5x7vhf.js:159075-159213 placement
function getNodeRowRange(m, h) {
  let x = getAbsoluteTop(h),
    T = h.yogaNode?.getComputedHeight() ?? 0;
  if (x === void 0) return;
  return T < 1 ? void 0 : { requestId: m, first: x, last: x + T - 1 };
}
//@ chunk-ag5x7vhf.js:159213-159284 placement
var cx = (m, h) => h.find((x) => x.first <= m.first && m.last <= x.last)?.requestId;
//@ chunk-ag5x7vhf.js:159284-159462 placement
function getSelectionRowRange(m) {
  if (m.anchor === null || m.focus === null) return;
  let h = [m.virtualAnchorRow ?? m.anchor.row, m.virtualFocusRow ?? m.focus.row];
  return { first: Math.min(...h), last: Math.max(...h) };
}
//@ chunk-ag5x7vhf.js:159462-159576 placement
function getSelectedRowsInViewport(m) {
  let h = getSelectionRowRange(m.selection);
  if (h === void 0) return;
  return isSelectionWithinViewport(m.selection, m.viewport) ? cx(h, m.rows()) : void 0;
}
//@ chunk-ag5x7vhf.js:159576-159688 placement
var getViewportRange = (m) => ({
  node: m.getDomElement(),
  first: m.getViewportTop(),
  last: m.getViewportTop() + m.getViewportHeight() - 1,
});
//@ chunk-ag5x7vhf.js:159688-159856 placement
function getSelectionCopyPayload(m) {
  if (m.source === void 0) return;
  let x = m.source.hasTextSelection() ? m.source.getSelectedText() : "";
  return x === "" ? void 0 : i2r(x, m.rowHolding(m.source.selection));
}
//@ chunk-ag5x7vhf.js:159856-159937 placement
function tHi(m) {
  return m.source?.isAltScreenActive === !0
    ? (getSelectionCopyPayload(m) ?? getClawdPoseState().kept)
    : void 0;
}
//@ chunk-ag5x7vhf.js:159937-159975 placement
var dx = (m) => () => m.forEach((h) => h?.());
//@ chunk-ag5x7vhf.js:159975-160072 placement
function mx(m) {
  let h = getSelectionCopyPayload(m);
  if (h === void 0) return;
  Rmt.set({ ...getClawdPoseState(), kept: h, takenAfter: getClawdPoseState().runs });
}
/**
 * 订阅选区收起/变化事件（收起时同步、变化时清除保留的姿态），返回合并的取消订阅函数。
 */
//@ chunk-ag5x7vhf.js:160072-160222 placement
function subscribeToSelectionEvents(m) {
  let source = m.source,
    x = source === void 0;
  return (
    clearKeptClawdPose(),
    dx(
      x
        ? []
        : [
            source.subscribeToSelectionTakeDown(() => mx(m)),
            source.subscribeToSelectionChange(() => clearKeptPoseOnSelection(source)),
          ],
    )
  );
}
//@ chunk-ag5x7vhf.js:160222-160254 layout
var Yp = 3,
  fx = 250,
  _A = 2000,
  gx = 3000;
//@ chunk-ag5x7vhf.js:160254-160341 file-local
function defaultExtractSearchText(m, h) {
  let cached = m.get(h);
  if (cached !== void 0) return cached;
  let lowered = getMessageSearchText(h);
  return (m.set(h, lowered), lowered);
}
//@ chunk-ag5x7vhf.js:160341-160435 layout
function createSearchTextCache() {
  let weakMap = new WeakMap();
  return { promptText: new WeakMap(), extractSearchText: (h) => defaultExtractSearchText(weakMap, h) };
}
//@ chunk-ag5x7vhf.js:160435-160446 layout
var DA = 500;
//@ chunk-ag5x7vhf.js:160446-160559 file-local
function stickyPromptText(m, h) {
  if (h === void 0) return null;
  let cached = m.get(h);
  if (cached !== void 0) return cached;
  let result = computeStickyPromptText(h);
  return (m.set(h, result), result);
}
//@ chunk-ag5x7vhf.js:160559-160996 fingerprint = computeStickyPromptText (0.933)
function computeStickyPromptText(msg) {
  let raw = null;
  if (msg.type === "user") {
    if (msg.isMeta || msg.isVisibleInTranscriptOnly) return null;
    let block = msg.message.content[0];
    if (block?.type !== "text") return null;
    raw = t7(block.text, msg.pluginPrompt);
  } else if (
    msg.type === "attachment" &&
    msg.attachment.type === "queued_command" &&
    msg.attachment.commandMode !== "task-notification" &&
    !msg.attachment.isMeta
  )
    raw = joinTextContent(msg.attachment.prompt);
  if (raw === null) return null;
  let x = stripLeadingSystemReminders(raw);
  if (x.startsWith("<") || x === "") return null;
  return x;
}
//@ chunk-ag5x7vhf.js:160996-161474 fingerprint = VirtualItem (0.854)
function VirtualItem({
  itemKey: itemKey,
  msg: msg,
  measureRef: measureRef,
  expanded: expanded,
  hovered: hovered,
  clickable: clickable,
  onClickK: onClickK,
  onEnterK: onEnterK,
  onLeaveK: onLeaveK,
  children: children,
}) {
  return e(Box, {
    ref: measureRef(itemKey),
    flexDirection: "column",
    backgroundColor: expanded ? "userMessageBackgroundHover" : void 0,
    paddingBottom: expanded ? 1 : void 0,
    onClick: clickable
      ? (V) => {
          if (V.hyperlinkUrl) return V.allowDefault();
          onClickK(itemKey, msg, V.cellIsBlank, expanded === !0);
        }
      : void 0,
    onMouseEnter: clickable ? () => onEnterK(itemKey) : void 0,
    onMouseLeave: clickable ? () => onLeaveK(itemKey) : void 0,
    hoverIgnoresBlankCells: !expanded,
    children: e(Zmt.Provider, { value: hovered && !expanded, children: children }),
  });
}
/**
 * 虚拟滚动消息列表：useVirtualScroll 计算可见区间，只挂载视口内的 VirtualItem；支持搜索索引（warmSearchIndex/setSearchQuery）、高亮跳转与 StickyTracker 置顶提示。
 */
//@ chunk-ag5x7vhf.js:161474-172316 fingerprint = VirtualMessageList (0.833)
function VirtualMessageList({
  messages: messages,
  scrollViewport: scrollViewport,
  columns: columns,
  itemKey: itemKey,
  renderItem: renderItem,
  onItemClick: onItemClick,
  isItemClickable: isItemClickable,
  isItemExpanded: isItemExpanded,
  extractSearchText: extractSearchText,
  trackStickyPrompt: trackStickyPrompt,
  jumpRef: jumpRef,
  revealRef: revealRef,
  onSearchMatchesChange: onSearchMatchesChange,
  scanElement: scanElement,
  setPositions: setPositions,
}) {
  let Y = useHost(),
    [pe] = y(createSearchTextCache),
    xe = extractSearchText ?? pe.extractSearchText,
    keysRef = R({ keys: [], uuids: [], seen: new Map(), itemKey: itemKey, loggedDups: new Set() }),
    Re = Q(() => computeItemKeys(messages, itemKey, keysRef.current, NAVIGABLE_TYPES), [messages, itemKey]),
    {
      range: range,
      topSpacer: topSpacer,
      bottomSpacer: bottomSpacer,
      measureRef: measureRef,
      spacerRef: spacerRef,
      offsets: offsets,
      getItemTop: getItemTop,
      getItemElement: getItemElement,
      onLayout: onLayout,
      scrollToIndex: scrollToIndex,
    } = useVirtualScroll(scrollViewport, Re, columns);
  if (Re.length > messages.length) reportItemKeysDesync(Y, Re.length, messages.length, range);
  let [He, Ue] = range,
    min = Math.min(Ue, messages.length),
    min_2 = Math.min(He, min),
    ae = R({
      offsets: offsets,
      start: min_2,
      getItemElement: getItemElement,
      getItemTop: getItemTop,
      messages: messages,
      keys: Re,
      scrollToIndex: scrollToIndex,
    });
  ae.current = {
    offsets: offsets,
    start: min_2,
    getItemElement: getItemElement,
    getItemTop: getItemTop,
    messages: messages,
    keys: Re,
    scrollToIndex: scrollToIndex,
  };
  let jumpState = R(null);
  function ct(ne, ee) {
    let { messages: messages } = ae.current;
    for (let Ce = ne + ee; Ce >= 0 && Ce < messages.length; Ce += ee)
      if (stickyPromptText(pe.promptText, messages[Ce]) !== null) return Ce;
    return -1;
  }
  let scanRequestRef = R(null),
    elementPositions = R({ msgIdx: -1, positions: [] }),
    startPtrRef = R(-1),
    phantomBurstRef = R(0),
    pendingStepRef = R(0),
    stepRef = Oo(step),
    highlightRef = Oo(highlight),
    searchState = R({ matches: [], ptr: 0, screenOrd: 0, prefixSum: [] }),
    searchAnchor = R(-1),
    indexWarmed = R(!1);
  function targetFor(ne) {
    let top = ae.current.getItemTop(ne);
    return Math.max(0, top - Yp);
  }
  function highlight(ord) {
    let handle = scrollViewport.handle,
      { msgIdx: msgIdx, positions: positions } = elementPositions.current;
    if (!handle || positions.length === 0 || msgIdx < 0) {
      setPositions?.(null);
      return;
    }
    let idx = Math.max(0, Math.min(ord, positions.length - 1)),
      Ke = positions[idx],
      top = ae.current.getItemTop(msgIdx),
      vpTop = handle.getViewportTop(),
      domElement = handle.getDomElement(),
      Et = top - (domElement ? clampScrollTop(domElement) : handle.getScrollTop()),
      vp = handle.getViewportHeight(),
      bt = vpTop + Et + Ke.row;
    if (bt < vpTop || bt >= vpTop + vp)
      (handle.scrollTo(Math.max(0, top + Ke.row - Yp)),
        (Et = top - (domElement ? clampScrollTop(domElement) : handle.getScrollTop())),
        (bt = vpTop + Et + Ke.row));
    setPositions?.({ positions: positions, rowOffset: vpTop + Et, currentIdx: idx });
    let st = searchState.current,
      xt = st.prefixSum.at(-1) ?? 0,
      $t = (st.prefixSum[st.ptr] ?? 0) + idx + 1;
    (onSearchMatchesChange?.(xt, $t),
      logForDebugging(
        `highlight(i=${msgIdx}, ord=${idx}/${positions.length}): pos={row:${Ke.row},col:${Ke.col}} lo=${Et} screenRow=${bt} badge=${$t}/${xt}`,
      ));
  }
  let [Ot, It] = y(0),
    bumpSeek = ce(() => It((ne) => ne + 1), []);
  P(() => {
    let req = scanRequestRef.current;
    if (!req) return;
    let { idx: idx, wantLast: wantLast, tries: tries } = req,
      handle = scrollViewport.handle;
    if (!handle) return;
    let { getItemElement: getItemElement, getItemTop: getItemTop, scrollToIndex: scrollToIndex } = ae.current,
      el = getItemElement(idx),
      Et = el?.yogaNode?.getComputedHeight() ?? 0;
    if (!el || Et === 0) {
      if (tries > 1) {
        ((scanRequestRef.current = null),
          logForDebugging(`seek(i=${idx}): no mount after scrollToIndex, skip`),
          stepRef(wantLast ? -1 : 1));
        return;
      }
      ((scanRequestRef.current = { idx: idx, wantLast: wantLast, tries: tries + 1 }),
        scrollToIndex(idx),
        bumpSeek());
      return;
    }
    ((scanRequestRef.current = null), handle.scrollTo(Math.max(0, getItemTop(idx) - Yp)));
    let Ct = scanElement?.(el) ?? [];
    if (
      ((elementPositions.current = { msgIdx: idx, positions: Ct }),
      logForDebugging(`seek(i=${idx} t=${tries}): ${Ct.length} positions`),
      Ct.length === 0)
    ) {
      if (++phantomBurstRef.current > 20) {
        phantomBurstRef.current = 0;
        return;
      }
      stepRef(wantLast ? -1 : 1);
      return;
    }
    phantomBurstRef.current = 0;
    let bt = wantLast ? Ct.length - 1 : 0;
    ((searchState.current.screenOrd = bt), (startPtrRef.current = -1), highlightRef(bt));
    let pending = pendingStepRef.current;
    if (pending) ((pendingStepRef.current = 0), stepRef(pending));
  }, [Ot]);
  let to = useClock(),
    de = R(null),
    le = ce((ne) => {
      let ee = de.current;
      if (!ee) return;
      if (((de.current = null), ee.cancelGiveUp(), ee.landed)) return;
      switch (ee.request.kind) {
        case "reveal":
          ee.request.done(ne);
          break;
        case "jump":
          if (ne) jumpState.current = null;
          break;
      }
    }, []),
    Be = ce(() => le(!0), [le]);
  P(() => () => le(!1), [le]);
  function jump(ne, wantLast) {
    let handle = scrollViewport.handle;
    if (!handle) return;
    le(!0);
    let Ce = ae.current,
      { getItemElement: getItemElement, scrollToIndex: scrollToIndex } = Ce;
    if (ne < 0 || ne >= Ce.messages.length) return;
    (setPositions?.(null),
      (elementPositions.current = { msgIdx: -1, positions: [] }),
      (scanRequestRef.current = { idx: ne, wantLast: wantLast, tries: 0 }),
      (jumpState.current = ne));
    let el = getItemElement(ne),
      je = el?.yogaNode?.getComputedHeight() ?? 0;
    if (el && je > 0) handle.scrollTo(targetFor(ne));
    else scrollToIndex(ne);
    bumpSeek();
  }
  function step(delta) {
    le(!0);
    let st = searchState.current,
      { matches: matches, prefixSum: prefixSum } = st,
      et = prefixSum.at(-1) ?? 0;
    if (matches.length === 0) return;
    if (scanRequestRef.current) {
      pendingStepRef.current = delta;
      return;
    }
    if (startPtrRef.current < 0) startPtrRef.current = st.ptr;
    let { positions: positions } = elementPositions.current,
      Ye = st.screenOrd + delta;
    if (Ye >= 0 && Ye < positions.length) {
      ((st.screenOrd = Ye), highlight(Ye), (startPtrRef.current = -1));
      return;
    }
    let je = (st.ptr + delta + matches.length) % matches.length;
    if (je === startPtrRef.current) {
      (setPositions?.(null),
        (startPtrRef.current = -1),
        logForDebugging(`step: wraparound at ptr=${je}, all ${matches.length} msgs phantoms`));
      return;
    }
    ((st.ptr = je), (st.screenOrd = 0), jump(matches[je], delta < 0));
    let Xe = delta < 0 ? (prefixSum[je + 1] ?? et) : prefixSum[je] + 1;
    onSearchMatchesChange?.(et, Xe);
  }
  function Ve() {
    let handle = scrollViewport.handle,
      { offsets: offsets, start: start, getItemTop: getItemTop, messages: messages } = ae.current,
      Ke = messages.length;
    if (!handle || Ke === 0) return -1;
    let scrollTop = handle.getScrollTop(),
      je = getItemTop(start);
    if (je >= 0 && je <= scrollTop) {
      let _t = start;
      for (let xt = start; xt < Ke; xt++) {
        let $t = getItemTop(xt);
        if ($t < 0 || $t > scrollTop) break;
        _t = xt;
      }
      return _t;
    }
    let Xe = je >= 0 ? je - offsets[start] : 0,
      Et = scrollTop - Xe,
      Ct = 0,
      bt = Ke - 1;
    while (Ct < bt) {
      let _t = (Ct + bt + 1) >> 1;
      if (offsets[_t] <= Et) Ct = _t;
      else bt = _t - 1;
    }
    return Ct;
  }
  function ze() {
    let ne = jumpState.current,
      handle = scrollViewport.handle,
      we = de.current;
    if (ne === null || !handle || (we?.request.kind === "jump" && !we.landed)) return ne;
    let { getItemElement: getItemElement, getItemTop: getItemTop } = ae.current,
      Ke = getItemTop(ne),
      Ye = getItemElement(ne)?.yogaNode?.getComputedHeight() ?? 0,
      scrollTop = handle.getScrollTop();
    return Ke >= 0 && Ke + Math.max(Ye, 1) > scrollTop && Ke < scrollTop + handle.getViewportHeight()
      ? ne
      : null;
  }
  function At(ne) {
    let handle = scrollViewport.handle,
      {
        messages: messages,
        keys: keys,
        getItemElement: getItemElement,
        scrollToIndex: scrollToIndex,
      } = ae.current,
      Ye = keys[ne];
    if (!handle || messages[ne] === void 0 || Ye === void 0) return;
    if (
      (le(!0), (scanRequestRef.current = null), (pendingStepRef.current = 0), handle.getPendingDelta() !== 0)
    )
      handle.scrollTo(handle.getScrollTop());
    let je = getItemElement(ne),
      Xe = je?.yogaNode,
      Et = Xe?.getComputedHeight() ?? 0;
    if (je && Xe && Et > 0 && Xe.getComputedWidth() > 0) {
      let computedTop = Xe.getComputedTop();
      (hx(handle, je, computedTop),
        (de.current = {
          request: { kind: "jump", key: Ye },
          idx: ne,
          messages: messages,
          landed: {
            at: performance.now(),
            top: computedTop,
            height: Et,
            viewport: handle.getViewportHeight(),
          },
          cancelGiveUp: () => {},
        }));
      return;
    }
    if (
      ((de.current = {
        request: { kind: "jump", key: Ye },
        idx: ne,
        messages: messages,
        landed: void 0,
        cancelGiveUp: to.setTimeout(() => le(!1), gx),
      }),
      !je)
    )
      scrollToIndex(ne);
    bumpSeek();
  }
  vxe(
    jumpRef,
    () => ({
      jumpToIndex: (ne) => {
        let handle = scrollViewport.handle;
        if (handle) (le(!0), handle.scrollTo(targetFor(ne)));
      },
      nextMessage: () => {
        let ne = ze() ?? Ve();
        if (ne < 0) return;
        let ee = ct(ne, 1);
        if (ee < 0) return;
        (At(ee), (jumpState.current = ee));
      },
      prevMessage: () => {
        let ne = ze(),
          ee = ne ?? Ve();
        if (ee < 0) return;
        let handle = scrollViewport.handle,
          { messages: messages, getItemElement: getItemElement, getItemTop: getItemTop } = ae.current,
          Ye = ne === null ? getItemElement(ee) : null,
          Xe =
            handle !== null &&
            Ye !== null &&
            stickyPromptText(pe.promptText, messages[ee]) !== null &&
            getItemTop(ee) + leadingTopMargin(Ye) < handle.getScrollTop()
              ? ee
              : ct(ee, -1);
        if (Xe < 0) return;
        (At(Xe), (jumpState.current = Xe));
      },
      setSearchQuery: (ne) => {
        (le(!0),
          (scanRequestRef.current = null),
          (elementPositions.current = { msgIdx: -1, positions: [] }),
          (startPtrRef.current = -1),
          setPositions?.(null));
        let lq = ne.toLowerCase(),
          matches = [],
          prefixSum = [0];
        if (lq) {
          let msgs = ae.current.messages;
          for (let xt = 0; xt < msgs.length; xt++) {
            let $t = msgs[xt];
            if ($t === void 0) continue;
            let text = xe($t),
              pos = text.indexOf(lq),
              Yo = 0;
            while (pos >= 0) (Yo++, (pos = text.indexOf(lq, pos + lq.length)));
            if (Yo > 0) (matches.push(xt), prefixSum.push(prefixSum.at(-1) + Yo));
          }
        }
        let total = prefixSum.at(-1),
          Ke = 0,
          handle = scrollViewport.handle,
          { offsets: offsets, start: start, getItemTop: getItemTop } = ae.current,
          firstTop = getItemTop(start),
          bt = firstTop >= 0 ? firstTop - offsets[start] : 0;
        if (matches.length > 0 && handle) {
          let _t = searchAnchor.current >= 0 ? searchAnchor.current : handle.getScrollTop(),
            xt = 1 / 0;
          for (let $t = 0; $t < matches.length; $t++) {
            let abs = Math.abs(bt + offsets[matches[$t]] - _t);
            if (abs <= xt) ((xt = abs), (Ke = $t));
          }
          logForDebugging(
            `setSearchQuery('${ne}'): ${matches.length} msgs \xB7 ptr=${Ke} msgIdx=${matches[Ke]} curTop=${_t} origin=${bt}`,
          );
        }
        if (
          ((searchState.current = { matches: matches, ptr: Ke, screenOrd: 0, prefixSum: prefixSum }),
          matches.length > 0)
        )
          jump(matches[Ke], !0);
        else if (searchAnchor.current >= 0 && handle)
          (handle.scrollTo(searchAnchor.current), (jumpState.current = null));
        onSearchMatchesChange?.(total, matches.length > 0 ? (prefixSum[Ke + 1] ?? total) : 0);
      },
      nextMatch: () => step(1),
      prevMatch: () => step(-1),
      setAnchor: () => {
        let handle = scrollViewport.handle;
        if (handle) searchAnchor.current = handle.getScrollTop();
      },
      disarmSearch: () => {
        if (
          (setPositions?.(null),
          (scanRequestRef.current = null),
          (elementPositions.current = { msgIdx: -1, positions: [] }),
          (startPtrRef.current = -1),
          (jumpState.current = null),
          de.current?.request.kind === "jump")
        )
          le(!0);
      },
      warmSearchIndex: async () => {
        if (indexWarmed.current) return 0;
        let msgs = ae.current.messages,
          CHUNK = 500,
          we = 0,
          wallStart = performance.now();
        for (let Ke = 0; Ke < msgs.length; Ke += CHUNK) {
          await sleep(0);
          let t0 = performance.now(),
            end = Math.min(Ke + CHUNK, msgs.length);
          for (let Xe = Ke; Xe < end; Xe++) {
            let Et = msgs[Xe];
            if (Et !== void 0) xe(Et);
          }
          we += performance.now() - t0;
        }
        let wallMs = Math.round(performance.now() - wallStart);
        return (
          logForDebugging(
            `warmSearchIndex: ${msgs.length} msgs \xB7 work=${Math.round(we)}ms wall=${wallMs}ms chunks=${Math.ceil(msgs.length / CHUNK)}`,
          ),
          (indexWarmed.current = !0),
          Math.round(we)
        );
      },
    }),
    [scrollViewport, xe],
  );
  let ut = ce(
    (ne) => {
      let ee = de.current;
      if (!ee) return;
      let handle = scrollViewport.handle;
      if (!handle) {
        le(!1);
        return;
      }
      if (handle.getPendingDelta() !== 0) {
        le(!0);
        return;
      }
      let {
          messages: messages,
          keys: keys,
          getItemElement: getItemElement,
          scrollToIndex: scrollToIndex,
        } = ae.current,
        { request: request, landed: landed } = ee;
      if (request.kind === "jump" && landed && handle.isSticky()) {
        le(!0);
        return;
      }
      if (messages !== ee.messages)
        switch (((ee.messages = messages), request.kind)) {
          case "reveal":
            ee.idx = findStreamingMessageIndex(messages, request.requestId);
            break;
          case "jump":
            ee.idx = keys.indexOf(request.key);
            break;
        }
      if (ee.idx < 0) {
        le(!1);
        return;
      }
      let startTime = performance.now();
      if (landed && startTime - landed.at >= _A) {
        de.current = null;
        return;
      }
      let handlersRef = getItemElement(ee.idx);
      if (!handlersRef) {
        if (ne) (scrollToIndex(ee.idx), (ee.landed = landed && { ...landed, top: -1, height: -1 }));
        return;
      }
      let yogaNode = handlersRef.yogaNode;
      if (!yogaNode || yogaNode.getComputedWidth() === 0) return;
      let computedHeight = yogaNode.getComputedHeight(),
        computedTop = yogaNode.getComputedTop();
      if (computedHeight === 0) {
        switch (request.kind) {
          case "reveal":
            handle.scrollToElement(handlersRef, 0, { block: request.block });
            break;
          case "jump":
            handle.scrollToElement(handlersRef);
            break;
        }
        return;
      }
      let viewportHeight = handle.getViewportHeight();
      if (
        landed &&
        landed.top === computedTop &&
        landed.height === computedHeight &&
        landed.viewport === viewportHeight
      )
        return;
      switch (request.kind) {
        case "reveal":
          if ((handle.scrollToElement(handlersRef, 0, { block: request.block }), !landed)) request.done(!0);
          break;
        case "jump":
          hx(handle, handlersRef, computedTop);
          break;
      }
      if (
        ((ee.landed = {
          at: landed?.at ?? startTime,
          top: computedTop,
          height: computedHeight,
          viewport: viewportHeight,
        }),
        !landed)
      )
        ee.cancelGiveUp();
    },
    [scrollViewport, le],
  );
  (vxe(
    revealRef,
    () => ({
      reveal: (ne, ee) => {
        le(!0);
        let { messages: messages } = ae.current,
          onClickK = findStreamingMessageIndex(messages, ne);
        if (!scrollViewport.handle || onClickK < 0) return null;
        return new Promise((et) => {
          ((de.current = {
            request: { kind: "reveal", requestId: ne, block: ee, done: et },
            idx: onClickK,
            messages: messages,
            landed: void 0,
            cancelGiveUp: to.setTimeout(() => le(!1), gx),
          }),
            ut(!0));
        });
      },
      release: Be,
      rowHolding: (ne) => {
        let handle = scrollViewport.handle;
        if (!handle) return;
        return getSelectedRowsInViewport({
          selection: ne,
          viewport: getViewportRange(handle),
          rows: () => {
            let { messages: messages, getItemElement: getItemElement } = ae.current;
            return messages.flatMap((msg, cellIsBlank) => {
              let Ye = getItemElement(cellIsBlank),
                je = Ye && hasStringUuid(msg) ? getNodeRowRange(countToolCallsSince_3(msg), Ye) : void 0;
              return je ? [je] : [];
            });
          },
        });
      },
    }),
    [scrollViewport, to, ut, le, Be],
  ),
    P(() => ut(!0)));
  let jt = ce(() => {
      (ut(!1), onLayout());
    }, [onLayout, ut]),
    [oo, mo] = y(null),
    Jt = R({ onItemClick: onItemClick, isItemExpanded: isItemExpanded, setHoveredKey: mo });
  Jt.current = { onItemClick: onItemClick, isItemExpanded: isItemExpanded, setHoveredKey: mo };
  let [Gt] = y(() => new Map());
  P(
    () => () => {
      for (let ne of Array.from(Gt.values())) ne(!1);
    },
    [Gt],
  );
  let Mo = ce(
      (ne, ee, we, Ce) => {
        let et = Jt.current;
        if (we || !et.onItemClick) return;
        let Ke = Gt.get(ne);
        if (Ke) {
          Ke(!0);
          return;
        }
        if (!Ce) {
          et.onItemClick(ee);
          return;
        }
        let Ye = di().get(process.stdout),
          je = Ye?.subscribeToSelectionChange(() => {
            if (Ye.hasTextSelection()) Gt.get(ne)?.(!1);
          }),
          Xe = () => {
            if (Ye?.selection.isDragging) {
              Et = to.setTimeout(Xe, fx);
              return;
            }
            Gt.get(ne)?.(!0);
          },
          Et = to.setTimeout(Xe, fx);
        Gt.set(ne, (Ct) => {
          (Gt.delete(ne), je?.(), Et());
          let bt = Jt.current;
          if (Ct && bt.isItemExpanded?.(ee)) bt.onItemClick?.(ee);
        });
      },
      [to, Gt],
    ),
    onEnterK = ce((ne) => {
      Jt.current.setHoveredKey(ne);
    }, []),
    onLeaveK = ce((ne) => {
      Jt.current.setHoveredKey((prev) => (prev === ne ? null : prev));
    }, []),
    So = R(null),
    Yt = So.current?.renderItem === renderItem ? So.current.rows : void 0,
    Qt = new Map();
  return (
    (So.current = { renderItem: renderItem, rows: Qt }),
    r(Fragment, {
      children: [
        e(Box, { ref: spacerRef, height: topSpacer, flexShrink: 0 }),
        messages.slice(min_2, min).map((msg, ee) => {
          let we = min_2 + ee;
          if (msg === void 0) return (reportMessageHole(Y, we, messages, `mounted=[${min_2},${min})`), null);
          let Ce = Re[we],
            et = !!onItemClick && (isItemClickable?.(msg) ?? !0),
            Ke = et && oo === Ce,
            expanded = isItemExpanded?.(msg),
            je = Yt?.get(Ce),
            Xe = je !== void 0 && je.msg === msg ? je : { msg: msg, row: renderItem(msg, we) };
          return (
            Qt.set(Ce, Xe),
            e(
              VirtualItem,
              {
                itemKey: Ce,
                msg: msg,
                measureRef: measureRef,
                expanded: expanded,
                hovered: Ke,
                clickable: et,
                onClickK: Mo,
                onEnterK: onEnterK,
                onLeaveK: onLeaveK,
                children: Xe.row,
              },
              Ce,
            )
          );
        }),
        bottomSpacer > 0 && e(Box, { height: bottomSpacer, flexShrink: 0 }),
        e(LayoutSubscriber, { onLayout: jt }),
        trackStickyPrompt &&
          e(StickyTracker, {
            messages: messages,
            start: min_2,
            end: min,
            offsets: offsets,
            getItemTop: getItemTop,
            getItemElement: getItemElement,
            scrollViewport: scrollViewport,
            scratch: pe,
            releaseReveal: Be,
          }),
      ],
    })
  );
}
//@ chunk-ag5x7vhf.js:172316-172392 sole-consumer
function hx(m, h, x) {
  let T = leadingTopMargin(h);
  (m.scrollTo(x + T), m.scrollToElement(h, T), raiseScrollHeight(m));
}
//@ chunk-ag5x7vhf.js:172392-172537 sole-consumer = dropSubtreeCache (0.771)
function leadingTopMargin(node) {
  let h = 0,
    x = node.childNodes[0];
  while (x && x.nodeName !== "#text" && x.yogaNode)
    ((h += x.yogaNode.getComputedMargin(1)), (x = x.childNodes[0]));
  return h;
}
//@ chunk-ag5x7vhf.js:172537-172708 sole-consumer
function findStreamingMessageIndex(m, h) {
  let index = m.findIndex((T) => T !== void 0 && isMessageStreaming(T, h));
  if (index >= 0) return index;
  return m.findIndex(
    (T) =>
      hasStringUuid(T) &&
      h.length === T.uuid.length &&
      T.uuid.slice(0, UUID_PREFIX_LENGTH) === h.slice(0, UUID_PREFIX_LENGTH),
  );
}
//@ chunk-ag5x7vhf.js:172708-172936 sole-consumer = countToolCallsSince (1)
function countToolCallsSince_3(m) {
  let h = m.type === "assistant" || m.type === "user" ? m.message.content[0] : void 0;
  if (typeof h !== "object") return m.uuid;
  switch (h.type) {
    case "tool_use":
      return h.id;
    case "tool_result":
      return h.tool_use_id;
    default:
      return m.uuid;
  }
}
//@ chunk-ag5x7vhf.js:173244-173538 sole-consumer
function reportMessageHole(m, h, x, T) {
  if (!claimOnceStore.of(m).claim("vml-message-hole")) return;
  let k = (I) => (I === void 0 ? "undefined" : NAVIGABLE_TYPES(I).replaceAll("/", ".")),
    _ =
      "VirtualMessageList: undefined element in messages[] \u2014 " +
      `undefined at messages[${h}] (len=${x.length} ${T} neighbors=[${k(x[h - 1])},${k(x[h + 1])}])`;
  logError(new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(_));
}
//@ chunk-ag5x7vhf.js:173538-173726 sole-consumer
function reportItemKeysDesync(m, h, x, T) {
  if (!claimOnceStore.of(m).claim("vml-keys-desync")) return;
  let k = `VirtualMessageList: itemKeys/messages length desync (keys=${h} messages=${x} range=[${T[0]},${T[1]}))`;
  logError(new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(k));
}
//@ chunk-ag5x7vhf.js:173726-173905 sole-consumer
function LayoutSubscriber(m) {
  let $ = w(4),
    { onLayout: onLayout } = m,
    { subscribeLayout: subscribeLayout } = Se(kp),
    k,
    _;
  if ($[0] !== onLayout || $[1] !== subscribeLayout)
    ((k = () => subscribeLayout(onLayout)),
      (_ = [subscribeLayout, onLayout]),
      ($[0] = onLayout),
      ($[1] = subscribeLayout),
      ($[2] = k),
      ($[3] = _));
  else ((k = $[2]), (_ = $[3]));
  return (P(k, _), null);
}
//@ chunk-ag5x7vhf.js:173905-175325 fingerprint = StickyTracker (0.777)
function StickyTracker({
  messages: messages,
  start: start,
  end: end,
  offsets: offsets,
  getItemTop: getItemTop,
  getItemElement: getItemElement,
  scrollViewport: scrollViewport,
  scratch: scratch,
  releaseReveal: releaseReveal,
}) {
  let L = useHost(),
    { setStickyPrompt: setStickyPrompt } = useScrollChrome(),
    W = qp(scrollViewport, (te) => te?.isSticky() ?? !0),
    subscribe = qp(scrollViewport, (listener) =>
      listener ? listener.getScrollTop() + listener.getPendingDelta() : 0,
    ),
    target = Math.max(0, subscribe),
    q = start,
    firstVisibleTop = -1;
  for (let te = end - 1; te >= start; te--) {
    let top = getItemTop(te);
    if (top >= 0) {
      if (top < target) break;
      firstVisibleTop = top;
    }
    q = te;
  }
  let idx = -1,
    text = null;
  if (q > 0 && !W)
    for (let te = q - 1; te >= 0; te--) {
      let me = messages[te];
      if (me === void 0) reportMessageHole(L, te, messages, `range=[${start},${end}] firstVisible=${q}`);
      let se = stickyPromptText(scratch.promptText, me);
      if (se === null) continue;
      let _e = getItemTop(te);
      if (_e >= 0 && _e + 1 >= target) continue;
      ((idx = te), (text = se));
      break;
    }
  let ge = firstVisibleTop >= 0 ? firstVisibleTop - offsets[q] : 0,
    Re = idx >= 0 ? Math.max(0, ge + offsets[idx]) : -1,
    pending = R({ idx: -1, tries: 0 }),
    suppress = R("none"),
    lastIdx = R(-1);
  return (
    P(() => {
      if (pending.current.idx >= 0) return;
      if (suppress.current === "armed") {
        suppress.current = "force";
        return;
      }
      let te = suppress.current === "force";
      if (((suppress.current = "none"), !te && lastIdx.current === idx)) return;
      if (((lastIdx.current = idx), text === null)) {
        setStickyPrompt(null);
        return;
      }
      let trimmed = text.trimStart(),
        paraEnd = trimmed.search(/\n\s*\n/),
        collapsed = (paraEnd >= 0 ? trimmed.slice(0, paraEnd) : trimmed)
          .slice(0, DA)
          .replace(/\s+/g, " ")
          .trim();
      if (collapsed === "") {
        setStickyPrompt(null);
        return;
      }
      let oe = idx,
        ve = Re;
      setStickyPrompt({
        text: collapsed,
        scrollTo: () => {
          (releaseReveal(), setStickyPrompt("clicked"), (suppress.current = "armed"));
          let el = getItemElement(oe);
          if (el) scrollViewport.handle?.scrollToElement(el, 1);
          else (scrollViewport.handle?.scrollTo(ve), (pending.current = { idx: oe, tries: 0 }));
        },
      });
    }),
    P(() => {
      if (pending.current.idx < 0) return;
      let el = getItemElement(pending.current.idx);
      if (el) (scrollViewport.handle?.scrollToElement(el, 1), (pending.current = { idx: -1, tries: 0 }));
      else if (++pending.current.tries > 5) pending.current = { idx: -1, tries: 0 };
    }),
    null
  );
}
/**
 * 增量计算消息列表的 React key：复用前缀缓存，重复 key 加 #N 后缀并只上报一次重复。
 */
//@ chunk-ag5x7vhf.js:175824-176529 placement
function computeItemKeys(messages, getKey, cache, describe = (k) => rpn(k.type)) {
  let k = 0;
  if (cache.itemKey === getKey && messages.length >= cache.keys.length) {
    let I = cache.keys.length;
    while (k < I && messages[k].uuid === cache.uuids[k]) k++;
  }
  if (k < cache.keys.length) ((cache.keys = []), (cache.uuids = []), (cache.seen = new Map()), (k = 0));
  cache.itemKey = getKey;
  let _ = null;
  for (; k < messages.length; k++) {
    let I = messages[k],
      D = getKey(I),
      A = cache.seen.get(D);
    if (A === void 0) (cache.seen.set(D, 1), cache.keys.push(D));
    else if ((cache.seen.set(D, A + 1), cache.keys.push(`${D}#${A}`), !cache.loggedDups.has(D)))
      (cache.loggedDups.add(D), (_ ??= new Map()).set(D, describe(I)));
    cache.uuids.push(I.uuid);
  }
  if (_) {
    let mapped = [..._].slice(0, 3).map(([D, A]) => `[${A}] \xD7${cache.seen.get(D)}`);
    logError(
      Error(
        `VirtualMessageList: duplicate sibling itemKeys (deduped via #N suffix; upstream uuid-dup): ${_.size} ${plural(_.size, "key")}, ${mapped.join(", ")}`,
      ),
    );
  }
  return cache.keys;
}

export { VirtualMessageList, tHi, subscribeToSelectionEvents, Ypt, Xpt };
