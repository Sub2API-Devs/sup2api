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
import { getClawdPoseState, clawdPoseStore, clearKeptClawdPose } from "./LogoV2/Clawd.js";
import { selectionValue } from "../plugins/functionHooks/uiApi.js";
import { getMessageSearchText } from "./Messages.js";
import { renderPluginPromptColon } from "../utils/messages/pluginPrompts.js";
import { joinTextContent } from "../utils/messageProvenance.js";
import { stripLeadingSystemReminders, UUID_PREFIX_LENGTH } from "../utils/messages.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, textSignal } from "../ink/components/Text.js";
import { useHost } from "../context/session.js";
import { NAVIGABLE_TYPES } from "./messageActions.js";
import { useVirtualScroll, raiseScrollHeight } from "../hooks/useVirtualScroll.js";
import { clampScrollTop } from "../ink/events/event-handlers.js";
import { logForDebugging } from "../utils/debug.js";
import { useClock } from "../ink/components/ClockContext.js";
import { sleep } from "../utils/sleep.js";
import { hasStringUuid } from "../bridge/inboundMessages.js";
import { getSecondRootError } from "../ink/terminal.js";
import { isMessageStreaming } from "./MessageRow.js";
import { claimOnceStore } from "../services/api/verificationRequired.js";
import { logError } from "../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../utils/errors.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { kp } from "../../vendor/convert-to-spaces/dist/index.js";
import { useScrollChrome } from "./FullscreenLayout.js";
import { sanitizeEventKey } from "../services/api/errors.js";
import { plural } from "../utils/stringUtils.js";

//@ chunk-ag5x7vhf.js:158361-158417 placement
function useHandleValue(scrollViewport, h) {
  return yt(scrollViewport.subscribe, () => h(scrollViewport.handle));
}
//@ chunk-ag5x7vhf.js:158417-158487 placement
/**
 * 函数 bumpClawdPoseRun（姿态运行计数 +1）；位于「虚拟滚动消息列表：按测量高度只渲染视口内的项，支持搜索高亮跳转、置顶用户提示跟踪」模块。
 */
function bumpClawdPoseRun() {
  let m = getClawdPoseState().runs + 1;
  clawdPoseStore.set({
    ...getClawdPoseState(),
    runs: m,
  });
  return m;
}
//@ chunk-ag5x7vhf.js:158487-158544 placement
/**
 * 导出值：releaseKeptPoseIfStale（运行号过期时清除保留姿态）；位于「虚拟滚动消息列表：按测量高度只渲染视口内的项，支持搜索高亮跳转、置顶用户提示跟踪」模块。
 */
var releaseKeptPoseIfStale = (m) =>
  m !== undefined && m > getClawdPoseState().takenAfter ? clearKeptClawdPose() : undefined;
//@ chunk-ag5x7vhf.js:158544-158647 placement
function clearKeptPoseOnSelection(source) {
  return getClawdPoseState().kept !== undefined &&
    source.hasTextSelection() &&
    source.getSelectedText() !== ""
    ? clearKeptClawdPose()
    : undefined;
}
//@ chunk-ag5x7vhf.js:158647-158854 placement
function isSelectionWithinViewport(selection, viewport) {
  let x = (row) => row !== undefined && viewport.first <= row && row <= viewport.last;
  let T = selection.virtualAnchorRow !== undefined || x(selection.anchor?.row);
  let k = selection.virtualFocusRow !== undefined || x(selection.focus?.row);
  return viewport.node !== null && selection.scope?.node === viewport.node && T && k;
}
//@ chunk-ag5x7vhf.js:158854-159075 placement
function getAbsoluteTop(m) {
  let h = 0;
  let x = m;
  while (x !== undefined) {
    if (x.yogaNode === undefined) return;
    let T = x !== m && (x.style.overflowY ?? x.style.overflow) === "scroll";
    h += x.yogaNode.getComputedTop() - (T ? (x.scrollTopRendered ?? 0) : 0);
    x = x.parentNode;
  }
  return h;
}
//@ chunk-ag5x7vhf.js:159075-159213 placement
function getNodeRowRange(requestId, itemElement) {
  let absoluteTop = getAbsoluteTop(itemElement);
  let T = itemElement.yogaNode?.getComputedHeight() ?? 0;
  if (absoluteTop === undefined) return;
  return T < 1
    ? undefined
    : {
        requestId,
        first: absoluteTop,
        last: absoluteTop + T - 1,
      };
}
//@ chunk-ag5x7vhf.js:159213-159284 placement
var requestIdForSelection = (selectionRowRange, h) =>
  h.find((x) => x.first <= selectionRowRange.first && selectionRowRange.last <= x.last)?.requestId;
//@ chunk-ag5x7vhf.js:159284-159462 placement
function getSelectionRowRange(selection) {
  if (selection.anchor === null || selection.focus === null) return;
  let h = [
    selection.virtualAnchorRow ?? selection.anchor.row,
    selection.virtualFocusRow ?? selection.focus.row,
  ];
  return {
    first: Math.min(...h),
    last: Math.max(...h),
  };
}
//@ chunk-ag5x7vhf.js:159462-159576 placement
function getSelectedRowsInViewport(m) {
  let selectionRowRange = getSelectionRowRange(m.selection);
  if (selectionRowRange === undefined) return;
  return isSelectionWithinViewport(m.selection, m.viewport)
    ? requestIdForSelection(selectionRowRange, m.rows())
    : undefined;
}
//@ chunk-ag5x7vhf.js:159576-159688 placement
var getViewportRange = (handle) => ({
  node: handle.getDomElement(),
  first: handle.getViewportTop(),
  last: handle.getViewportTop() + handle.getViewportHeight() - 1,
});
//@ chunk-ag5x7vhf.js:159688-159856 placement
function getSelectionCopyPayload(m) {
  if (m.source === undefined) return;
  let text = m.source.hasTextSelection() ? m.source.getSelectedText() : "";
  return text === "" ? undefined : selectionValue(text, m.rowHolding(m.source.selection));
}
//@ chunk-ag5x7vhf.js:159856-159937 placement
/**
 * 函数 selectionPayloadForAltScreen（alt-screen 下的选区载荷）；位于「虚拟滚动消息列表：按测量高度只渲染视口内的项，支持搜索高亮跳转、置顶用户提示跟踪」模块。
 */
function selectionPayloadForAltScreen(m) {
  return m.source?.isAltScreenActive === true
    ? (getSelectionCopyPayload(m) ?? getClawdPoseState().kept)
    : undefined;
}
//@ chunk-ag5x7vhf.js:159937-159975 placement
var subscribeAll = (m) => () => m.forEach((h) => h?.());
//@ chunk-ag5x7vhf.js:159975-160072 placement
function keepSelectionPayload(m) {
  let selectionCopyPayload = getSelectionCopyPayload(m);
  if (selectionCopyPayload === undefined) return;
  clawdPoseStore.set({
    ...getClawdPoseState(),
    kept: selectionCopyPayload,
    takenAfter: getClawdPoseState().runs,
  });
}
//@ chunk-ag5x7vhf.js:160072-160222 placement
/**
 * 订阅选区收起/变化事件（收起时同步、变化时清除保留的姿态），返回合并的取消订阅函数。
 */
function subscribeToSelectionEvents(m) {
  let source = m.source;
  let x = source === undefined;
  clearKeptClawdPose();
  return subscribeAll(
    x
      ? []
      : [
          source.subscribeToSelectionTakeDown(() => keepSelectionPayload(m)),
          source.subscribeToSelectionChange(() => clearKeptPoseOnSelection(source)),
        ],
  );
}
//@ chunk-ag5x7vhf.js:160222-160254 layout
var SCROLL_OFFSET_ADJUST = 3;
var REVEAL_DEBOUNCE_MS = 250;
var LANDED_STALE_MS = 2000;
var REVEAL_TIMEOUT_MS = 3000;
//@ chunk-ag5x7vhf.js:160254-160341 file-local
function defaultExtractSearchText(weakMap, msg) {
  let cached = weakMap.get(msg);
  if (cached !== undefined) return cached;
  let lowered = getMessageSearchText(msg);
  weakMap.set(msg, lowered);
  return lowered;
}
//@ chunk-ag5x7vhf.js:160341-160435 layout
function createSearchTextCache() {
  let weakMap = new WeakMap();
  return {
    promptText: new WeakMap(),
    extractSearchText: (msg) => defaultExtractSearchText(weakMap, msg),
  };
}
//@ chunk-ag5x7vhf.js:160435-160446 layout
var STICKY_PROMPT_MAX_CHARS = 500;
//@ chunk-ag5x7vhf.js:160446-160559 file-local
function stickyPromptText(promptText, msg) {
  if (msg === undefined) return null;
  let cached = promptText.get(msg);
  if (cached !== undefined) return cached;
  let result = computeStickyPromptText(msg);
  promptText.set(msg, result);
  return result;
}
//@ chunk-ag5x7vhf.js:160559-160996 fingerprint = computeStickyPromptText (0.933)
function computeStickyPromptText(msg) {
  let raw = null;
  if (msg.type === "user") {
    if (msg.isMeta || msg.isVisibleInTranscriptOnly) return null;
    let block = msg.message.content[0];
    if (block?.type !== "text") return null;
    raw = renderPluginPromptColon(block.text, msg.pluginPrompt);
  } else if (
    msg.type === "attachment" &&
    msg.attachment.type === "queued_command" &&
    msg.attachment.commandMode !== "task-notification" &&
    !msg.attachment.isMeta
  )
    raw = joinTextContent(msg.attachment.prompt);
  if (raw === null) return null;
  let t = stripLeadingSystemReminders(raw);
  if (t.startsWith("<") || t === "") return null;
  return t;
}
//@ chunk-ag5x7vhf.js:160996-161474 fingerprint = VirtualItem (0.854)
function VirtualItem({
  itemKey,
  msg,
  measureRef,
  expanded,
  hovered,
  clickable,
  onClickK,
  onEnterK,
  onLeaveK,
  children,
}) {
  return jsxProd_default(Box, {
    ref: measureRef(itemKey),
    flexDirection: "column",
    backgroundColor: expanded ? "userMessageBackgroundHover" : undefined,
    paddingBottom: expanded ? 1 : undefined,
    onClick: clickable
      ? (V) => {
          if (V.hyperlinkUrl) return V.allowDefault();
          onClickK(itemKey, msg, V.cellIsBlank, expanded === true);
        }
      : undefined,
    onMouseEnter: clickable ? () => onEnterK(itemKey) : undefined,
    onMouseLeave: clickable ? () => onLeaveK(itemKey) : undefined,
    hoverIgnoresBlankCells: !expanded,
    children: jsxProd_default(textSignal.Provider, {
      value: hovered && !expanded,
      children,
    }),
  });
}
//@ chunk-ag5x7vhf.js:161474-172316 fingerprint = VirtualMessageList (0.833)
/**
 * 虚拟滚动消息列表：useVirtualScroll 计算可见区间，只挂载视口内的 VirtualItem；支持搜索索引（warmSearchIndex/setSearchQuery）、高亮跳转与 StickyTracker 置顶提示。
 */
function VirtualMessageList({
  messages,
  scrollViewport,
  columns,
  itemKey,
  renderItem,
  onItemClick,
  isItemClickable,
  isItemExpanded,
  extractSearchText,
  trackStickyPrompt,
  jumpRef,
  revealRef,
  onSearchMatchesChange,
  scanElement,
  setPositions,
}) {
  let host = useHost();
  let [pe] = y(createSearchTextCache);
  let xe = extractSearchText ?? pe.extractSearchText;
  let keysRef = R({
    keys: [],
    uuids: [],
    seen: new Map(),
    itemKey,
    loggedDups: new Set(),
  });
  let itemKeys = Q(
    () => computeItemKeys(messages, itemKey, keysRef.current, NAVIGABLE_TYPES),
    [messages, itemKey],
  );
  let {
    range,
    topSpacer,
    bottomSpacer,
    measureRef,
    spacerRef,
    offsets,
    getItemTop,
    getItemElement,
    onLayout,
    scrollToIndex,
  } = useVirtualScroll(scrollViewport, itemKeys, columns);
  if (itemKeys.length > messages.length) reportItemKeysDesync(host, itemKeys.length, messages.length, range);
  let [He, Ue] = range;
  let min = Math.min(Ue, messages.length);
  let start = Math.min(He, min);
  let jumpState = R({
    offsets,
    start,
    getItemElement,
    getItemTop,
    messages,
    keys: itemKeys,
    scrollToIndex,
  });
  jumpState.current = {
    offsets,
    start,
    getItemElement,
    getItemTop,
    messages,
    keys: itemKeys,
    scrollToIndex,
  };
  let jumpState_2 = R(null);
  function ct(ne, ee) {
    let { messages } = jumpState.current;
    for (let i = ne + ee; i >= 0 && i < messages.length; i += ee)
      if (stickyPromptText(pe.promptText, messages[i]) !== null) return i;
    return -1;
  }
  let scanRequestRef = R(null);
  let elementPositions = R({
    msgIdx: -1,
    positions: [],
  });
  let startPtrRef = R(-1);
  let phantomBurstRef = R(0);
  let pendingStepRef = R(0);
  let stepRef = Oo(step);
  let highlightRef = Oo(highlight);
  let searchState = R({
    matches: [],
    ptr: 0,
    screenOrd: 0,
    prefixSum: [],
  });
  let searchAnchor = R(-1);
  let indexWarmed = R(false);
  function targetFor(i) {
    let top = jumpState.current.getItemTop(i);
    return Math.max(0, top - SCROLL_OFFSET_ADJUST);
  }
  function highlight(ord) {
    let handle = scrollViewport.handle;
    let { msgIdx, positions } = elementPositions.current;
    if (!handle || positions.length === 0 || msgIdx < 0) {
      setPositions?.(null);
      return;
    }
    let idx = Math.max(0, Math.min(ord, positions.length - 1));
    let Ke = positions[idx];
    let top = jumpState.current.getItemTop(msgIdx);
    let vpTop = handle.getViewportTop();
    let domElement = handle.getDomElement();
    let lo = top - (domElement ? clampScrollTop(domElement) : handle.getScrollTop());
    let vp = handle.getViewportHeight();
    let screenRow = vpTop + lo + Ke.row;
    if (screenRow < vpTop || screenRow >= vpTop + vp) {
      handle.scrollTo(Math.max(0, top + Ke.row - SCROLL_OFFSET_ADJUST));
      lo = top - (domElement ? clampScrollTop(domElement) : handle.getScrollTop());
      screenRow = vpTop + lo + Ke.row;
    }
    setPositions?.({
      positions,
      rowOffset: vpTop + lo,
      currentIdx: idx,
    });
    let st = searchState.current;
    let total = st.prefixSum.at(-1) ?? 0;
    let current = (st.prefixSum[st.ptr] ?? 0) + idx + 1;
    onSearchMatchesChange?.(total, current);
    logForDebugging(
      `highlight(i=${msgIdx}, ord=${idx}/${positions.length}): pos={row:${Ke.row},col:${Ke.col}} lo=${lo} screenRow=${screenRow} badge=${current}/${total}`,
    );
  }
  let [seekGen, setSeekGen] = y(0);
  let bumpSeek = ce(() => setSeekGen((ne) => ne + 1), []);
  P(() => {
    let req = scanRequestRef.current;
    if (!req) return;
    let { idx, wantLast, tries } = req;
    let handle = scrollViewport.handle;
    if (!handle) return;
    let { getItemElement, getItemTop, scrollToIndex } = jumpState.current;
    let el = getItemElement(idx);
    let Et = el?.yogaNode?.getComputedHeight() ?? 0;
    if (!el || Et === 0) {
      if (tries > 1) {
        scanRequestRef.current = null;
        logForDebugging(`seek(i=${idx}): no mount after scrollToIndex, skip`);
        stepRef(wantLast ? -1 : 1);
        return;
      }
      scanRequestRef.current = {
        idx,
        wantLast,
        tries: tries + 1,
      };
      scrollToIndex(idx);
      bumpSeek();
      return;
    }
    scanRequestRef.current = null;
    handle.scrollTo(Math.max(0, getItemTop(idx) - SCROLL_OFFSET_ADJUST));
    let positions = scanElement?.(el) ?? [];
    elementPositions.current = {
      msgIdx: idx,
      positions,
    };
    logForDebugging(`seek(i=${idx} t=${tries}): ${positions.length} positions`);
    if (positions.length === 0) {
      if (++phantomBurstRef.current > 20) {
        phantomBurstRef.current = 0;
        return;
      }
      stepRef(wantLast ? -1 : 1);
      return;
    }
    phantomBurstRef.current = 0;
    let ord = wantLast ? positions.length - 1 : 0;
    searchState.current.screenOrd = ord;
    startPtrRef.current = -1;
    highlightRef(ord);
    let pending = pendingStepRef.current;
    if (pending) {
      pendingStepRef.current = 0;
      stepRef(pending);
    }
  }, [seekGen]);
  let clock = useClock();
  let de = R(null);
  let le = ce((ne) => {
    let ee = de.current;
    if (!ee) return;
    de.current = null;
    ee.cancelGiveUp();
    if (ee.landed) return;
    switch (ee.request.kind) {
      case "reveal":
        ee.request.done(ne);
        break;
      case "jump":
        if (ne) jumpState_2.current = null;
        break;
    }
  }, []);
  let Be = ce(() => le(true), [le]);
  P(() => () => le(false), [le]);
  function jump(i, wantLast) {
    let handle = scrollViewport.handle;
    if (!handle) return;
    le(true);
    let Ce = jumpState.current;
    let { getItemElement, scrollToIndex } = Ce;
    if (i < 0 || i >= Ce.messages.length) return;
    setPositions?.(null);
    elementPositions.current = {
      msgIdx: -1,
      positions: [],
    };
    scanRequestRef.current = {
      idx: i,
      wantLast,
      tries: 0,
    };
    jumpState_2.current = i;
    let el = getItemElement(i);
    let je = el?.yogaNode?.getComputedHeight() ?? 0;
    if (el && je > 0) handle.scrollTo(targetFor(i));
    else scrollToIndex(i);
    bumpSeek();
  }
  function step(delta) {
    le(true);
    let st = searchState.current;
    let { matches, prefixSum } = st;
    let total = prefixSum.at(-1) ?? 0;
    if (matches.length === 0) return;
    if (scanRequestRef.current) {
      pendingStepRef.current = delta;
      return;
    }
    if (startPtrRef.current < 0) startPtrRef.current = st.ptr;
    let { positions } = elementPositions.current;
    let newOrd = st.screenOrd + delta;
    if (newOrd >= 0 && newOrd < positions.length) {
      st.screenOrd = newOrd;
      highlight(newOrd);
      startPtrRef.current = -1;
      return;
    }
    let ptr = (st.ptr + delta + matches.length) % matches.length;
    if (ptr === startPtrRef.current) {
      setPositions?.(null);
      startPtrRef.current = -1;
      logForDebugging(`step: wraparound at ptr=${ptr}, all ${matches.length} msgs phantoms`);
      return;
    }
    st.ptr = ptr;
    st.screenOrd = 0;
    jump(matches[ptr], delta < 0);
    let placeholder = delta < 0 ? (prefixSum[ptr + 1] ?? total) : prefixSum[ptr] + 1;
    onSearchMatchesChange?.(total, placeholder);
  }
  function Ve() {
    let handle = scrollViewport.handle;
    let { offsets, start, getItemTop, messages } = jumpState.current;
    let Ke = messages.length;
    if (!handle || Ke === 0) return -1;
    let scrollTop = handle.getScrollTop();
    let itemTop = getItemTop(start);
    if (itemTop >= 0 && itemTop <= scrollTop) {
      let _t = start;
      for (let xt = start; xt < Ke; xt++) {
        let itemTop = getItemTop(xt);
        if (itemTop < 0 || itemTop > scrollTop) break;
        _t = xt;
      }
      return _t;
    }
    let Xe = itemTop >= 0 ? itemTop - offsets[start] : 0;
    let Et = scrollTop - Xe;
    let Ct = 0;
    let bt = Ke - 1;
    while (Ct < bt) {
      let _t = (Ct + bt + 1) >> 1;
      if (offsets[_t] <= Et) Ct = _t;
      else bt = _t - 1;
    }
    return Ct;
  }
  function ze() {
    let ne = jumpState_2.current;
    let handle = scrollViewport.handle;
    let we = de.current;
    if (ne === null || !handle || (we?.request.kind === "jump" && !we.landed)) return ne;
    let { getItemElement, getItemTop } = jumpState.current;
    let itemTop = getItemTop(ne);
    let Ye = getItemElement(ne)?.yogaNode?.getComputedHeight() ?? 0;
    let scrollTop = handle.getScrollTop();
    return itemTop >= 0 &&
      itemTop + Math.max(Ye, 1) > scrollTop &&
      itemTop < scrollTop + handle.getViewportHeight()
      ? ne
      : null;
  }
  function At(ne) {
    let handle = scrollViewport.handle;
    let { messages, keys, getItemElement, scrollToIndex } = jumpState.current;
    let Ye = keys[ne];
    if (!handle || messages[ne] === undefined || Ye === undefined) return;
    le(true);
    scanRequestRef.current = null;
    pendingStepRef.current = 0;
    if (handle.getPendingDelta() !== 0) handle.scrollTo(handle.getScrollTop());
    let itemElement = getItemElement(ne);
    let yogaNode = itemElement?.yogaNode;
    let Et = yogaNode?.getComputedHeight() ?? 0;
    if (itemElement && yogaNode && Et > 0 && yogaNode.getComputedWidth() > 0) {
      let computedTop = yogaNode.getComputedTop();
      scrollToElement(handle, itemElement, computedTop);
      de.current = {
        request: {
          kind: "jump",
          key: Ye,
        },
        idx: ne,
        messages,
        landed: {
          at: performance.now(),
          top: computedTop,
          height: Et,
          viewport: handle.getViewportHeight(),
        },
        cancelGiveUp: () => {},
      };
      return;
    }
    de.current = {
      request: {
        kind: "jump",
        key: Ye,
      },
      idx: ne,
      messages,
      landed: undefined,
      cancelGiveUp: clock.setTimeout(() => le(false), REVEAL_TIMEOUT_MS),
    };
    if (!itemElement) scrollToIndex(ne);
    bumpSeek();
  }
  vxe(
    jumpRef,
    () => ({
      jumpToIndex: (i) => {
        let handle = scrollViewport.handle;
        if (handle) {
          le(true);
          handle.scrollTo(targetFor(i));
        }
      },
      nextMessage: () => {
        let ne = ze() ?? Ve();
        if (ne < 0) return;
        let ee = ct(ne, 1);
        if (ee < 0) return;
        At(ee);
        jumpState_2.current = ee;
      },
      prevMessage: () => {
        let ne = ze();
        let ee = ne ?? Ve();
        if (ee < 0) return;
        let handle = scrollViewport.handle;
        let { messages, getItemElement, getItemTop } = jumpState.current;
        let node = ne === null ? getItemElement(ee) : null;
        let Xe =
          handle !== null &&
          node !== null &&
          stickyPromptText(pe.promptText, messages[ee]) !== null &&
          getItemTop(ee) + leadingTopMargin(node) < handle.getScrollTop()
            ? ee
            : ct(ee, -1);
        if (Xe < 0) return;
        At(Xe);
        jumpState_2.current = Xe;
      },
      setSearchQuery: (ne) => {
        le(true);
        scanRequestRef.current = null;
        elementPositions.current = {
          msgIdx: -1,
          positions: [],
        };
        startPtrRef.current = -1;
        setPositions?.(null);
        let lq = ne.toLowerCase();
        let matches = [];
        let prefixSum = [0];
        if (lq) {
          let msgs = jumpState.current.messages;
          for (let i = 0; i < msgs.length; i++) {
            let $t = msgs[i];
            if ($t === undefined) continue;
            let text = xe($t);
            let pos = text.indexOf(lq);
            let cnt = 0;
            while (pos >= 0) {
              cnt++;
              pos = text.indexOf(lq, pos + lq.length);
            }
            if (cnt > 0) {
              matches.push(i);
              prefixSum.push(prefixSum.at(-1) + cnt);
            }
          }
        }
        let total = prefixSum.at(-1);
        let ptr = 0;
        let handle = scrollViewport.handle;
        let { offsets, start, getItemTop } = jumpState.current;
        let firstTop = getItemTop(start);
        let origin = firstTop >= 0 ? firstTop - offsets[start] : 0;
        if (matches.length > 0 && handle) {
          let curTop = searchAnchor.current >= 0 ? searchAnchor.current : handle.getScrollTop();
          let best = 1 / 0;
          for (let k = 0; k < matches.length; k++) {
            let cn = Math.abs(origin + offsets[matches[k]] - curTop);
            if (cn <= best) {
              best = cn;
              ptr = k;
            }
          }
          logForDebugging(
            `setSearchQuery('${ne}'): ${matches.length} msgs \xB7 ptr=${ptr} msgIdx=${matches[ptr]} curTop=${curTop} origin=${origin}`,
          );
        }
        searchState.current = {
          matches,
          ptr,
          screenOrd: 0,
          prefixSum,
        };
        if (matches.length > 0) jump(matches[ptr], true);
        else if (searchAnchor.current >= 0 && handle) {
          handle.scrollTo(searchAnchor.current);
          jumpState_2.current = null;
        }
        onSearchMatchesChange?.(total, matches.length > 0 ? (prefixSum[ptr + 1] ?? total) : 0);
      },
      nextMatch: () => step(1),
      prevMatch: () => step(-1),
      setAnchor: () => {
        let handle = scrollViewport.handle;
        if (handle) searchAnchor.current = handle.getScrollTop();
      },
      disarmSearch: () => {
        setPositions?.(null);
        scanRequestRef.current = null;
        elementPositions.current = {
          msgIdx: -1,
          positions: [],
        };
        startPtrRef.current = -1;
        jumpState_2.current = null;
        if (de.current?.request.kind === "jump") le(true);
      },
      warmSearchIndex: async () => {
        if (indexWarmed.current) return 0;
        let msgs = jumpState.current.messages;
        let CHUNK = 500;
        let workMs = 0;
        let wallStart = performance.now();
        for (let i = 0; i < msgs.length; i += CHUNK) {
          await sleep(0);
          let startTime = performance.now();
          let end = Math.min(i + CHUNK, msgs.length);
          for (let j = i; j < end; j++) {
            let Et = msgs[j];
            if (Et !== undefined) xe(Et);
          }
          workMs += performance.now() - startTime;
        }
        let wallMs = Math.round(performance.now() - wallStart);
        logForDebugging(
          `warmSearchIndex: ${msgs.length} msgs \xB7 work=${Math.round(workMs)}ms wall=${wallMs}ms chunks=${Math.ceil(msgs.length / CHUNK)}`,
        );
        indexWarmed.current = true;
        return Math.round(workMs);
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
        le(false);
        return;
      }
      if (handle.getPendingDelta() !== 0) {
        le(true);
        return;
      }
      let { messages, keys, getItemElement, scrollToIndex } = jumpState.current;
      let { request, landed } = ee;
      if (request.kind === "jump" && landed && handle.isSticky()) {
        le(true);
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
        le(false);
        return;
      }
      let startTime = performance.now();
      if (landed && startTime - landed.at >= LANDED_STALE_MS) {
        de.current = null;
        return;
      }
      let handlersRef = getItemElement(ee.idx);
      if (!handlersRef) {
        if (ne) {
          scrollToIndex(ee.idx);
          ee.landed = landed && {
            ...landed,
            top: -1,
            height: -1,
          };
        }
        return;
      }
      let yogaNode = handlersRef.yogaNode;
      if (!yogaNode || yogaNode.getComputedWidth() === 0) return;
      let computedHeight = yogaNode.getComputedHeight();
      let computedTop = yogaNode.getComputedTop();
      if (computedHeight === 0) {
        switch (request.kind) {
          case "reveal":
            handle.scrollToElement(handlersRef, 0, {
              block: request.block,
            });
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
          handle.scrollToElement(handlersRef, 0, {
            block: request.block,
          });
          if (!landed) request.done(true);
          break;
        case "jump":
          scrollToElement(handle, handlersRef, computedTop);
          break;
      }
      ee.landed = {
        at: landed?.at ?? startTime,
        top: computedTop,
        height: computedHeight,
        viewport: viewportHeight,
      };
      if (!landed) ee.cancelGiveUp();
    },
    [scrollViewport, le],
  );
  vxe(
    revealRef,
    () => ({
      reveal: (ne, block) => {
        le(true);
        let { messages } = jumpState.current;
        let onClickK = findStreamingMessageIndex(messages, ne);
        if (!scrollViewport.handle || onClickK < 0) return null;
        return new Promise((resolve) => {
          de.current = {
            request: {
              kind: "reveal",
              requestId: ne,
              block,
              done: resolve,
            },
            idx: onClickK,
            messages,
            landed: undefined,
            cancelGiveUp: clock.setTimeout(() => le(false), REVEAL_TIMEOUT_MS),
          };
          ut(true);
        });
      },
      release: Be,
      rowHolding: (selection) => {
        let handle = scrollViewport.handle;
        if (!handle) return;
        return getSelectedRowsInViewport({
          selection,
          viewport: getViewportRange(handle),
          rows: () => {
            let { messages, getItemElement } = jumpState.current;
            return messages.flatMap((msg, cellIsBlank) => {
              let itemElement = getItemElement(cellIsBlank);
              let je =
                itemElement && hasStringUuid(msg)
                  ? getNodeRowRange(countToolCallsSince_3(msg), itemElement)
                  : undefined;
              return je ? [je] : [];
            });
          },
        });
      },
    }),
    [scrollViewport, clock, ut, le, Be],
  );
  P(() => ut(true));
  let onLayout_2 = ce(() => {
    ut(false);
    onLayout();
  }, [onLayout, ut]);
  let [oo, mo] = y(null);
  let Jt = R({
    onItemClick,
    isItemExpanded,
    setHoveredKey: mo,
  });
  Jt.current = {
    onItemClick,
    isItemExpanded,
    setHoveredKey: mo,
  };
  let [Gt] = y(() => new Map());
  P(
    () => () => {
      for (let ne of Array.from(Gt.values())) ne(false);
    },
    [Gt],
  );
  let onClickK = ce(
    (ne, ee, we, Ce) => {
      let et = Jt.current;
      if (we || !et.onItemClick) return;
      let Ke = Gt.get(ne);
      if (Ke) {
        Ke(true);
        return;
      }
      if (!Ce) {
        et.onItemClick(ee);
        return;
      }
      let Ye = getSecondRootError().get(process.stdout);
      let je = Ye?.subscribeToSelectionChange(() => {
        if (Ye.hasTextSelection()) Gt.get(ne)?.(false);
      });
      let Xe = () => {
        if (Ye?.selection.isDragging) {
          Et = clock.setTimeout(Xe, REVEAL_DEBOUNCE_MS);
          return;
        }
        Gt.get(ne)?.(true);
      };
      let Et = clock.setTimeout(Xe, REVEAL_DEBOUNCE_MS);
      Gt.set(ne, (Ct) => {
        Gt.delete(ne);
        je?.();
        Et();
        let bt = Jt.current;
        if (Ct && bt.isItemExpanded?.(ee)) bt.onItemClick?.(ee);
      });
    },
    [clock, Gt],
  );
  let onEnterK = ce((k) => {
    Jt.current.setHoveredKey(k);
  }, []);
  let onLeaveK = ce((k) => {
    Jt.current.setHoveredKey((prev) => (prev === k ? null : prev));
  }, []);
  let So = R(null);
  let rows = So.current?.renderItem === renderItem ? So.current.rows : undefined;
  let Qt = new Map();
  So.current = {
    renderItem,
    rows: Qt,
  };
  return jsxProd_default_2(Fragment, {
    children: [
      jsxProd_default(Box, {
        ref: spacerRef,
        height: topSpacer,
        flexShrink: 0,
      }),
      messages.slice(start, min).map((msg, i) => {
        let we = start + i;
        if (msg === undefined) {
          reportMessageHole(host, we, messages, `mounted=[${start},${min})`);
          return null;
        }
        let k = itemKeys[we];
        let clickable = !!onItemClick && (isItemClickable?.(msg) ?? true);
        let hovered = clickable && oo === k;
        let expanded = isItemExpanded?.(msg);
        let je = rows?.get(k);
        let Xe =
          je !== undefined && je.msg === msg
            ? je
            : {
                msg,
                row: renderItem(msg, we),
              };
        Qt.set(k, Xe);
        return jsxProd_default(
          VirtualItem,
          {
            itemKey: k,
            msg,
            measureRef,
            expanded,
            hovered,
            clickable,
            onClickK,
            onEnterK,
            onLeaveK,
            children: Xe.row,
          },
          k,
        );
      }),
      bottomSpacer > 0 &&
        jsxProd_default(Box, {
          height: bottomSpacer,
          flexShrink: 0,
        }),
      jsxProd_default(LayoutSubscriber, {
        onLayout: onLayout_2,
      }),
      trackStickyPrompt &&
        jsxProd_default(StickyTracker, {
          messages,
          start,
          end: min,
          offsets,
          getItemTop,
          getItemElement,
          scrollViewport,
          scratch: pe,
          releaseReveal: Be,
        }),
    ],
  });
}
//@ chunk-ag5x7vhf.js:172316-172392 sole-consumer
function scrollToElement(handle, node, x) {
  let T = leadingTopMargin(node);
  handle.scrollTo(x + T);
  handle.scrollToElement(node, T);
  raiseScrollHeight(handle);
}
//@ chunk-ag5x7vhf.js:172392-172537 sole-consumer = dropSubtreeCache (0.771)
function leadingTopMargin(node) {
  let h = 0;
  let x = node.childNodes[0];
  while (x && x.nodeName !== "#text" && x.yogaNode) {
    h += x.yogaNode.getComputedMargin(1);
    x = x.childNodes[0];
  }
  return h;
}
//@ chunk-ag5x7vhf.js:172537-172708 sole-consumer
function findStreamingMessageIndex(messages, streamingToolUseIDs) {
  let index = messages.findIndex((T) => T !== undefined && isMessageStreaming(T, streamingToolUseIDs));
  if (index >= 0) return index;
  return messages.findIndex(
    (T) =>
      hasStringUuid(T) &&
      streamingToolUseIDs.length === T.uuid.length &&
      T.uuid.slice(0, UUID_PREFIX_LENGTH) === streamingToolUseIDs.slice(0, UUID_PREFIX_LENGTH),
  );
}
//@ chunk-ag5x7vhf.js:172708-172936 sole-consumer = countToolCallsSince (1)
function countToolCallsSince_3(msg) {
  let h = msg.type === "assistant" || msg.type === "user" ? msg.message.content[0] : undefined;
  if (typeof h !== "object") return msg.uuid;
  switch (h.type) {
    case "tool_use":
      return h.id;
    case "tool_result":
      return h.tool_use_id;
    default:
      return msg.uuid;
  }
}
//@ chunk-ag5x7vhf.js:173244-173538 sole-consumer
function reportMessageHole(host, h, messages, T) {
  if (!claimOnceStore.of(host).claim("vml-message-hole")) return;
  let k = (I) => (I === undefined ? "undefined" : NAVIGABLE_TYPES(I).replaceAll("/", "."));
  let _ =
    "VirtualMessageList: undefined element in messages[] \u2014 " +
    `undefined at messages[${h}] (len=${messages.length} ${T} neighbors=[${k(messages[h - 1])},${k(messages[h + 1])}])`;
  logError(new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(_));
}
//@ chunk-ag5x7vhf.js:173538-173726 sole-consumer
function reportItemKeysDesync(host, h, x, range) {
  if (!claimOnceStore.of(host).claim("vml-keys-desync")) return;
  let k = `VirtualMessageList: itemKeys/messages length desync (keys=${h} messages=${x} range=[${range[0]},${range[1]}))`;
  logError(new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(k));
}
//@ chunk-ag5x7vhf.js:173726-173905 sole-consumer
function LayoutSubscriber(props) {
  let $ = w(4);
  let { onLayout } = props;
  let { subscribeLayout } = Se(kp);
  let k;
  let _;
  if ($[0] !== onLayout || $[1] !== subscribeLayout) {
    k = () => subscribeLayout(onLayout);
    _ = [subscribeLayout, onLayout];
    $[0] = onLayout;
    $[1] = subscribeLayout;
    $[2] = k;
    $[3] = _;
  } else {
    k = $[2];
    _ = $[3];
  }
  P(k, _);
  return null;
}
//@ chunk-ag5x7vhf.js:173905-175325 fingerprint = StickyTracker (0.777)
function StickyTracker({
  messages,
  start,
  end,
  offsets,
  getItemTop,
  getItemElement,
  scrollViewport,
  scratch,
  releaseReveal,
}) {
  let host = useHost();
  let { setStickyPrompt } = useScrollChrome();
  let W = useHandleValue(scrollViewport, (te) => te?.isSticky() ?? true);
  let subscribe = useHandleValue(scrollViewport, (listener) =>
    listener ? listener.getScrollTop() + listener.getPendingDelta() : 0,
  );
  let target = Math.max(0, subscribe);
  let firstVisible = start;
  let firstVisibleTop = -1;
  for (let i = end - 1; i >= start; i--) {
    let top = getItemTop(i);
    if (top >= 0) {
      if (top < target) break;
      firstVisibleTop = top;
    }
    firstVisible = i;
  }
  let idx = -1;
  let text = null;
  if (firstVisible > 0 && !W)
    for (let i = firstVisible - 1; i >= 0; i--) {
      let me = messages[i];
      if (me === undefined)
        reportMessageHole(host, i, messages, `range=[${start},${end}] firstVisible=${firstVisible}`);
      let se = stickyPromptText(scratch.promptText, me);
      if (se === null) continue;
      let top = getItemTop(i);
      if (top >= 0 && top + 1 >= target) continue;
      idx = i;
      text = se;
      break;
    }
  let baseOffset = firstVisibleTop >= 0 ? firstVisibleTop - offsets[firstVisible] : 0;
  let estimate = idx >= 0 ? Math.max(0, baseOffset + offsets[idx]) : -1;
  let pending = R({
    idx: -1,
    tries: 0,
  });
  let suppress = R("none");
  let lastIdx = R(-1);
  P(() => {
    if (pending.current.idx >= 0) return;
    if (suppress.current === "armed") {
      suppress.current = "force";
      return;
    }
    let force = suppress.current === "force";
    suppress.current = "none";
    if (!force && lastIdx.current === idx) return;
    lastIdx.current = idx;
    if (text === null) {
      setStickyPrompt(null);
      return;
    }
    let trimmed = text.trimStart();
    let paraEnd = trimmed.search(/\n\s*\n/);
    let collapsed = (paraEnd >= 0 ? trimmed.slice(0, paraEnd) : trimmed)
      .slice(0, STICKY_PROMPT_MAX_CHARS)
      .replace(/\s+/g, " ")
      .trim();
    if (collapsed === "") {
      setStickyPrompt(null);
      return;
    }
    let capturedIdx = idx;
    let capturedEstimate = estimate;
    setStickyPrompt({
      text: collapsed,
      scrollTo: () => {
        releaseReveal();
        setStickyPrompt("clicked");
        suppress.current = "armed";
        let el = getItemElement(capturedIdx);
        if (el) scrollViewport.handle?.scrollToElement(el, 1);
        else {
          scrollViewport.handle?.scrollTo(capturedEstimate);
          pending.current = {
            idx: capturedIdx,
            tries: 0,
          };
        }
      },
    });
  });
  P(() => {
    if (pending.current.idx < 0) return;
    let el = getItemElement(pending.current.idx);
    if (el) {
      scrollViewport.handle?.scrollToElement(el, 1);
      pending.current = {
        idx: -1,
        tries: 0,
      };
    } else if (++pending.current.tries > 5)
      pending.current = {
        idx: -1,
        tries: 0,
      };
  });
  return null;
}
//@ chunk-ag5x7vhf.js:175824-176529 placement
/**
 * 增量计算消息列表的 React key：复用前缀缓存，重复 key 加 #N 后缀并只上报一次重复。
 */
function computeItemKeys(messages, getKey, cache, describe = (k) => sanitizeEventKey(k.type)) {
  let k = 0;
  if (cache.itemKey === getKey && messages.length >= cache.keys.length) {
    let I = cache.keys.length;
    while (k < I && messages[k].uuid === cache.uuids[k]) k++;
  }
  if (k < cache.keys.length) {
    cache.keys = [];
    cache.uuids = [];
    cache.seen = new Map();
    k = 0;
  }
  cache.itemKey = getKey;
  let _ = null;
  for (; k < messages.length; k++) {
    let I = messages[k];
    let key = getKey(I);
    let A = cache.seen.get(key);
    if (A === undefined) {
      cache.seen.set(key, 1);
      cache.keys.push(key);
    } else {
      cache.seen.set(key, A + 1);
      cache.keys.push(`${key}#${A}`);
      if (!cache.loggedDups.has(key)) {
        cache.loggedDups.add(key);
        (_ ??= new Map()).set(key, describe(I));
      }
    }
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
export {
  VirtualMessageList,
  selectionPayloadForAltScreen,
  subscribeToSelectionEvents,
  bumpClawdPoseRun,
  releaseKeptPoseIfStale,
};
