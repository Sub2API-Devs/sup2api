/**
 * components/VirtualMessageList.tsx
 *
 * 虚拟滚动消息列表：按测量高度只渲染视口内的项，支持搜索高亮跳转、置顶用户提示跟踪。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/VirtualMessageList.tsx
 * pieces: chunk-hnxhr3bs.js (33)
 * attribution: placement 17, layout 3, file-local 2, fingerprint 4, sole-consumer 7
 */
import {
  useSyncExternalStore,
  useState,
  useRef,
  useMemo,
  useEffectEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useContext,
} from "../../vendor/react/cjs/react.production.js";
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
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { APP_CONTEXT } from "../../vendor/convert-to-spaces/dist/index.js";
import { useScrollChrome } from "./FullscreenLayout.js";
import { sanitizeEventKey } from "../services/api/errors.js";
import { plural } from "../utils/stringUtils.js";

//@ chunk-hnxhr3bs.js:162661-162717 placement
function useHandleValue(scrollViewport, select) {
  return useSyncExternalStore(scrollViewport.subscribe, () => select(scrollViewport.handle));
}
//@ chunk-hnxhr3bs.js:162717-162787 placement
/**
 * 函数 bumpClawdPoseRun（姿态运行计数 +1）；位于「虚拟滚动消息列表：按测量高度只渲染视口内的项，支持搜索高亮跳转、置顶用户提示跟踪」模块。
 */
function bumpClawdPoseRun() {
  let runs = getClawdPoseState().runs + 1;
  clawdPoseStore.set({
    ...getClawdPoseState(),
    runs,
  });
  return runs;
}
//@ chunk-hnxhr3bs.js:162787-162844 placement
/**
 * 导出值：releaseKeptPoseIfStale（运行号过期时清除保留姿态）；位于「虚拟滚动消息列表：按测量高度只渲染视口内的项，支持搜索高亮跳转、置顶用户提示跟踪」模块。
 */
var releaseKeptPoseIfStale = (runs) =>
  runs !== undefined && runs > getClawdPoseState().takenAfter ? clearKeptClawdPose() : undefined;
//@ chunk-hnxhr3bs.js:162844-162947 placement
function clearKeptPoseOnSelection(source) {
  return getClawdPoseState().kept !== undefined &&
    source.hasTextSelection() &&
    source.getSelectedText() !== ""
    ? clearKeptClawdPose()
    : undefined;
}
//@ chunk-hnxhr3bs.js:162947-163154 placement
function isSelectionWithinViewport(selection, viewport) {
  let inViewport = (row) => row !== undefined && viewport.first <= row && row <= viewport.last;
  let anchorInViewport = selection.virtualAnchorRow !== undefined || inViewport(selection.anchor?.row);
  let focusInViewport = selection.virtualFocusRow !== undefined || inViewport(selection.focus?.row);
  return (
    viewport.node !== null && selection.scope?.node === viewport.node && anchorInViewport && focusInViewport
  );
}
//@ chunk-hnxhr3bs.js:163154-163375 placement
function getAbsoluteTop(element) {
  let top = 0;
  let node = element;
  while (node !== undefined) {
    if (node.yogaNode === undefined) return;
    let isScrollContainer = node !== element && (node.style.overflowY ?? node.style.overflow) === "scroll";
    top += node.yogaNode.getComputedTop() - (isScrollContainer ? (node.scrollTopRendered ?? 0) : 0);
    node = node.parentNode;
  }
  return top;
}
//@ chunk-hnxhr3bs.js:163375-163513 placement
function getNodeRowRange(requestId, element) {
  let absoluteTop = getAbsoluteTop(element);
  let height = element.yogaNode?.getComputedHeight() ?? 0;
  if (absoluteTop === undefined) return;
  return height < 1
    ? undefined
    : {
        requestId,
        first: absoluteTop,
        last: absoluteTop + height - 1,
      };
}
//@ chunk-hnxhr3bs.js:163513-163584 placement
var requestIdForSelection = (selectionRowRange, ranges) =>
  ranges.find((range) => range.first <= selectionRowRange.first && selectionRowRange.last <= range.last)
    ?.requestId;
//@ chunk-hnxhr3bs.js:163584-163762 placement
function getSelectionRowRange(selection) {
  if (selection.anchor === null || selection.focus === null) return;
  let rows = [
    selection.virtualAnchorRow ?? selection.anchor.row,
    selection.virtualFocusRow ?? selection.focus.row,
  ];
  return {
    first: Math.min(...rows),
    last: Math.max(...rows),
  };
}
//@ chunk-hnxhr3bs.js:163762-163876 placement
function getSelectedRowsInViewport(selectionInfo) {
  let selectionRowRange = getSelectionRowRange(selectionInfo.selection);
  if (selectionRowRange === undefined) return;
  return isSelectionWithinViewport(selectionInfo.selection, selectionInfo.viewport)
    ? requestIdForSelection(selectionRowRange, selectionInfo.rows())
    : undefined;
}
//@ chunk-hnxhr3bs.js:163876-163988 placement
var getViewportRange = (handle) => ({
  node: handle.getDomElement(),
  first: handle.getViewportTop(),
  last: handle.getViewportTop() + handle.getViewportHeight() - 1,
});
//@ chunk-hnxhr3bs.js:163988-164156 placement
function getSelectionCopyPayload(selectionInfo) {
  if (selectionInfo.source === undefined) return;
  let text = selectionInfo.source.hasTextSelection() ? selectionInfo.source.getSelectedText() : "";
  return text === ""
    ? undefined
    : selectionValue(text, selectionInfo.rowHolding(selectionInfo.source.selection));
}
//@ chunk-hnxhr3bs.js:164156-164237 placement
/**
 * 函数 selectionPayloadForAltScreen（alt-screen 下的选区载荷）；位于「虚拟滚动消息列表：按测量高度只渲染视口内的项，支持搜索高亮跳转、置顶用户提示跟踪」模块。
 */
function selectionPayloadForAltScreen(selectionInfo) {
  return selectionInfo.source?.isAltScreenActive === true
    ? (getSelectionCopyPayload(selectionInfo) ?? getClawdPoseState().kept)
    : undefined;
}
//@ chunk-hnxhr3bs.js:164237-164275 placement
var subscribeAll = (unsubscribes) => () => unsubscribes.forEach((unsubscribe) => unsubscribe?.());
//@ chunk-hnxhr3bs.js:164275-164372 placement
function keepSelectionPayload(selectionInfo) {
  let selectionCopyPayload = getSelectionCopyPayload(selectionInfo);
  if (selectionCopyPayload === undefined) return;
  clawdPoseStore.set({
    ...getClawdPoseState(),
    kept: selectionCopyPayload,
    takenAfter: getClawdPoseState().runs,
  });
}
//@ chunk-hnxhr3bs.js:164372-164522 placement
/**
 * 订阅选区收起/变化事件（收起时同步、变化时清除保留的姿态），返回合并的取消订阅函数。
 */
function subscribeToSelectionEvents(selectionInfo) {
  let source = selectionInfo.source;
  let hasNoSource = source === undefined;
  clearKeptClawdPose();
  return subscribeAll(
    hasNoSource
      ? []
      : [
          source.subscribeToSelectionTakeDown(() => keepSelectionPayload(selectionInfo)),
          source.subscribeToSelectionChange(() => clearKeptPoseOnSelection(source)),
        ],
  );
}
//@ chunk-hnxhr3bs.js:164522-164554 layout
var SCROLL_OFFSET_ADJUST = 3;
var REVEAL_DEBOUNCE_MS = 250;
var LANDED_STALE_MS = 2000;
var REVEAL_TIMEOUT_MS = 3000;
//@ chunk-hnxhr3bs.js:164554-164641 file-local
function defaultExtractSearchText(weakMap, msg) {
  let cached = weakMap.get(msg);
  if (cached !== undefined) return cached;
  let lowered = getMessageSearchText(msg);
  weakMap.set(msg, lowered);
  return lowered;
}
//@ chunk-hnxhr3bs.js:164641-164735 layout
function createSearchTextCache() {
  let weakMap = new WeakMap();
  return {
    promptText: new WeakMap(),
    extractSearchText: (msg) => defaultExtractSearchText(weakMap, msg),
  };
}
//@ chunk-hnxhr3bs.js:164735-164746 layout
var STICKY_PROMPT_MAX_CHARS = 500;
//@ chunk-hnxhr3bs.js:164746-164859 file-local
function stickyPromptText(promptText, msg) {
  if (msg === undefined) return null;
  let cached = promptText.get(msg);
  if (cached !== undefined) return cached;
  let result = computeStickyPromptText(msg);
  promptText.set(msg, result);
  return result;
}
//@ chunk-hnxhr3bs.js:164859-165297 fingerprint (2.1.88 match: computeStickyPromptText, 0.933)
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
//@ chunk-hnxhr3bs.js:165297-165775 fingerprint (2.1.88 match: VirtualItem, 0.854)
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
      ? (clickEvent) => {
          if (clickEvent.hyperlinkUrl) return clickEvent.allowDefault();
          onClickK(itemKey, msg, clickEvent.cellIsBlank, expanded === true);
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
//@ chunk-hnxhr3bs.js:165775-176618 fingerprint (2.1.88 match: VirtualMessageList, 0.833)
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
  let [searchTextCache] = useState(createSearchTextCache);
  let extractSearchTextFn = extractSearchText ?? searchTextCache.extractSearchText;
  let keysRef = useRef({
    keys: [],
    uuids: [],
    seen: new Map(),
    itemKey,
    loggedDups: new Set(),
  });
  let itemKeys = useMemo(
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
  let [rangeStart, rangeEnd] = range;
  let min = Math.min(rangeEnd, messages.length);
  let start = Math.min(rangeStart, min);
  let jumpState = useRef({
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
  let jumpState_2 = useRef(null);
  function findPromptIndex(fromIndex, direction) {
    let { messages } = jumpState.current;
    for (let i = fromIndex + direction; i >= 0 && i < messages.length; i += direction)
      if (stickyPromptText(searchTextCache.promptText, messages[i]) !== null) return i;
    return -1;
  }
  let scanRequestRef = useRef(null);
  let elementPositions = useRef({
    msgIdx: -1,
    positions: [],
  });
  let startPtrRef = useRef(-1);
  let phantomBurstRef = useRef(0);
  let pendingStepRef = useRef(0);
  let stepRef = useEffectEvent(step);
  let highlightRef = useEffectEvent(highlight);
  let searchState = useRef({
    matches: [],
    ptr: 0,
    screenOrd: 0,
    prefixSum: [],
  });
  let searchAnchor = useRef(-1);
  let indexWarmed = useRef(false);
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
    let position = positions[idx];
    let top = jumpState.current.getItemTop(msgIdx);
    let vpTop = handle.getViewportTop();
    let domElement = handle.getDomElement();
    let lo = top - (domElement ? clampScrollTop(domElement) : handle.getScrollTop());
    let vp = handle.getViewportHeight();
    let screenRow = vpTop + lo + position.row;
    if (screenRow < vpTop || screenRow >= vpTop + vp) {
      handle.scrollTo(Math.max(0, top + position.row - SCROLL_OFFSET_ADJUST));
      lo = top - (domElement ? clampScrollTop(domElement) : handle.getScrollTop());
      screenRow = vpTop + lo + position.row;
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
      `highlight(i=${msgIdx}, ord=${idx}/${positions.length}): pos={row:${position.row},col:${position.col}} lo=${lo} screenRow=${screenRow} badge=${current}/${total}`,
    );
  }
  let [seekGen, setSeekGen] = useState(0);
  let bumpSeek = useCallback(() => setSeekGen((previous) => previous + 1), []);
  useEffect(() => {
    let req = scanRequestRef.current;
    if (!req) return;
    let { idx, wantLast, tries } = req;
    let handle = scrollViewport.handle;
    if (!handle) return;
    let { getItemElement, getItemTop, scrollToIndex } = jumpState.current;
    let el = getItemElement(idx);
    let height = el?.yogaNode?.getComputedHeight() ?? 0;
    if (!el || height === 0) {
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
  let pendingRevealRef = useRef(null);
  let settleReveal = useCallback((success) => {
    let pendingReveal = pendingRevealRef.current;
    if (!pendingReveal) return;
    pendingRevealRef.current = null;
    pendingReveal.cancelGiveUp();
    if (pendingReveal.landed) return;
    switch (pendingReveal.request.kind) {
      case "reveal":
        pendingReveal.request.done(success);
        break;
      case "jump":
        if (success) jumpState_2.current = null;
        break;
    }
  }, []);
  let releaseReveal = useCallback(() => settleReveal(true), [settleReveal]);
  useEffect(() => () => settleReveal(false), [settleReveal]);
  function jump(i, wantLast) {
    let handle = scrollViewport.handle;
    if (!handle) return;
    settleReveal(true);
    let jumpSnapshot = jumpState.current;
    let { getItemElement, scrollToIndex } = jumpSnapshot;
    if (i < 0 || i >= jumpSnapshot.messages.length) return;
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
    let height = el?.yogaNode?.getComputedHeight() ?? 0;
    if (el && height > 0) handle.scrollTo(targetFor(i));
    else scrollToIndex(i);
    bumpSeek();
  }
  function step(delta) {
    settleReveal(true);
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
  function findFirstVisibleIndex() {
    let handle = scrollViewport.handle;
    let { offsets, start, getItemTop, messages } = jumpState.current;
    let messageCount = messages.length;
    if (!handle || messageCount === 0) return -1;
    let scrollTop = handle.getScrollTop();
    let itemTop = getItemTop(start);
    if (itemTop >= 0 && itemTop <= scrollTop) {
      let visibleIndex = start;
      for (let candidateIndex = start; candidateIndex < messageCount; candidateIndex++) {
        let itemTop = getItemTop(candidateIndex);
        if (itemTop < 0 || itemTop > scrollTop) break;
        visibleIndex = candidateIndex;
      }
      return visibleIndex;
    }
    let baseOffset = itemTop >= 0 ? itemTop - offsets[start] : 0;
    let targetOffset = scrollTop - baseOffset;
    let lo = 0;
    let hi = messageCount - 1;
    while (lo < hi) {
      let mid = (lo + hi + 1) >> 1;
      if (offsets[mid] <= targetOffset) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }
  function currentJumpTarget() {
    let targetIndex = jumpState_2.current;
    let handle = scrollViewport.handle;
    let pendingReveal = pendingRevealRef.current;
    if (targetIndex === null || !handle || (pendingReveal?.request.kind === "jump" && !pendingReveal.landed))
      return targetIndex;
    let { getItemElement, getItemTop } = jumpState.current;
    let itemTop = getItemTop(targetIndex);
    let height = getItemElement(targetIndex)?.yogaNode?.getComputedHeight() ?? 0;
    let scrollTop = handle.getScrollTop();
    return itemTop >= 0 &&
      itemTop + Math.max(height, 1) > scrollTop &&
      itemTop < scrollTop + handle.getViewportHeight()
      ? targetIndex
      : null;
  }
  function jumpToIndex(index) {
    let handle = scrollViewport.handle;
    let { messages, keys, getItemElement, scrollToIndex } = jumpState.current;
    let itemKey = keys[index];
    if (!handle || messages[index] === undefined || itemKey === undefined) return;
    settleReveal(true);
    scanRequestRef.current = null;
    pendingStepRef.current = 0;
    if (handle.getPendingDelta() !== 0) handle.scrollTo(handle.getScrollTop());
    let itemElement = getItemElement(index);
    let yogaNode = itemElement?.yogaNode;
    let height = yogaNode?.getComputedHeight() ?? 0;
    if (itemElement && yogaNode && height > 0 && yogaNode.getComputedWidth() > 0) {
      let computedTop = yogaNode.getComputedTop();
      scrollToElement(handle, itemElement, computedTop);
      pendingRevealRef.current = {
        request: {
          kind: "jump",
          key: itemKey,
        },
        idx: index,
        messages,
        landed: {
          at: performance.now(),
          top: computedTop,
          height,
          viewport: handle.getViewportHeight(),
        },
        cancelGiveUp: () => {},
      };
      return;
    }
    pendingRevealRef.current = {
      request: {
        kind: "jump",
        key: itemKey,
      },
      idx: index,
      messages,
      landed: undefined,
      cancelGiveUp: clock.setTimeout(() => settleReveal(false), REVEAL_TIMEOUT_MS),
    };
    if (!itemElement) scrollToIndex(index);
    bumpSeek();
  }
  useImperativeHandle(
    jumpRef,
    () => ({
      jumpToIndex: (i) => {
        let handle = scrollViewport.handle;
        if (handle) {
          settleReveal(true);
          handle.scrollTo(targetFor(i));
        }
      },
      nextMessage: () => {
        let currentIndex = currentJumpTarget() ?? findFirstVisibleIndex();
        if (currentIndex < 0) return;
        let nextIndex = findPromptIndex(currentIndex, 1);
        if (nextIndex < 0) return;
        jumpToIndex(nextIndex);
        jumpState_2.current = nextIndex;
      },
      prevMessage: () => {
        let currentIndex = currentJumpTarget();
        let fromIndex = currentIndex ?? findFirstVisibleIndex();
        if (fromIndex < 0) return;
        let handle = scrollViewport.handle;
        let { messages, getItemElement, getItemTop } = jumpState.current;
        let node = currentIndex === null ? getItemElement(fromIndex) : null;
        let prevIndex =
          handle !== null &&
          node !== null &&
          stickyPromptText(searchTextCache.promptText, messages[fromIndex]) !== null &&
          getItemTop(fromIndex) + leadingTopMargin(node) < handle.getScrollTop()
            ? fromIndex
            : findPromptIndex(fromIndex, -1);
        if (prevIndex < 0) return;
        jumpToIndex(prevIndex);
        jumpState_2.current = prevIndex;
      },
      setSearchQuery: (query) => {
        settleReveal(true);
        scanRequestRef.current = null;
        elementPositions.current = {
          msgIdx: -1,
          positions: [],
        };
        startPtrRef.current = -1;
        setPositions?.(null);
        let lq = query.toLowerCase();
        let matches = [];
        let prefixSum = [0];
        if (lq) {
          let msgs = jumpState.current.messages;
          for (let i = 0; i < msgs.length; i++) {
            let message = msgs[i];
            if (message === undefined) continue;
            let text = extractSearchTextFn(message);
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
            let distance = Math.abs(origin + offsets[matches[k]] - curTop);
            if (distance <= best) {
              best = distance;
              ptr = k;
            }
          }
          logForDebugging(
            `setSearchQuery('${query}'): ${matches.length} msgs \xB7 ptr=${ptr} msgIdx=${matches[ptr]} curTop=${curTop} origin=${origin}`,
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
        if (pendingRevealRef.current?.request.kind === "jump") settleReveal(true);
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
            let message = msgs[j];
            if (message !== undefined) extractSearchTextFn(message);
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
    [scrollViewport, extractSearchTextFn],
  );
  let landPendingReveal = useCallback(
    (canScroll) => {
      let pendingReveal = pendingRevealRef.current;
      if (!pendingReveal) return;
      let handle = scrollViewport.handle;
      if (!handle) {
        settleReveal(false);
        return;
      }
      if (handle.getPendingDelta() !== 0) {
        settleReveal(true);
        return;
      }
      let { messages, keys, getItemElement, scrollToIndex } = jumpState.current;
      let { request, landed } = pendingReveal;
      if (request.kind === "jump" && landed && handle.isSticky()) {
        settleReveal(true);
        return;
      }
      if (messages !== pendingReveal.messages)
        switch (((pendingReveal.messages = messages), request.kind)) {
          case "reveal":
            pendingReveal.idx = findStreamingMessageIndex(messages, request.requestId);
            break;
          case "jump":
            pendingReveal.idx = keys.indexOf(request.key);
            break;
        }
      if (pendingReveal.idx < 0) {
        settleReveal(false);
        return;
      }
      let startTime = performance.now();
      if (landed && startTime - landed.at >= LANDED_STALE_MS) {
        pendingRevealRef.current = null;
        return;
      }
      let handlersRef = getItemElement(pendingReveal.idx);
      if (!handlersRef) {
        if (canScroll) {
          scrollToIndex(pendingReveal.idx);
          pendingReveal.landed = landed && {
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
      pendingReveal.landed = {
        at: landed?.at ?? startTime,
        top: computedTop,
        height: computedHeight,
        viewport: viewportHeight,
      };
      if (!landed) pendingReveal.cancelGiveUp();
    },
    [scrollViewport, settleReveal],
  );
  useImperativeHandle(
    revealRef,
    () => ({
      reveal: (requestId, block) => {
        settleReveal(true);
        let { messages } = jumpState.current;
        let onClickK = findStreamingMessageIndex(messages, requestId);
        if (!scrollViewport.handle || onClickK < 0) return null;
        return new Promise((resolve) => {
          pendingRevealRef.current = {
            request: {
              kind: "reveal",
              requestId,
              block,
              done: resolve,
            },
            idx: onClickK,
            messages,
            landed: undefined,
            cancelGiveUp: clock.setTimeout(() => settleReveal(false), REVEAL_TIMEOUT_MS),
          };
          landPendingReveal(true);
        });
      },
      release: releaseReveal,
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
              let range =
                itemElement && hasStringUuid(msg)
                  ? getNodeRowRange(getStableMessageKey(msg), itemElement)
                  : undefined;
              return range ? [range] : [];
            });
          },
        });
      },
    }),
    [scrollViewport, clock, landPendingReveal, settleReveal, releaseReveal],
  );
  useEffect(() => landPendingReveal(true));
  let onLayout_2 = useCallback(() => {
    landPendingReveal(false);
    onLayout();
  }, [onLayout, landPendingReveal]);
  let [hoveredKey, setHoveredKey] = useState(null);
  let clickHandlersRef = useRef({
    onItemClick,
    isItemExpanded,
    setHoveredKey,
  });
  clickHandlersRef.current = {
    onItemClick,
    isItemExpanded,
    setHoveredKey,
  };
  let [pendingClicks] = useState(() => new Map());
  useEffect(
    () => () => {
      for (let release of Array.from(pendingClicks.values())) release(false);
    },
    [pendingClicks],
  );
  let onClickK = useCallback(
    (itemKey, message, cellIsBlank, expanded) => {
      let handlers = clickHandlersRef.current;
      if (cellIsBlank || !handlers.onItemClick) return;
      let release = pendingClicks.get(itemKey);
      if (release) {
        release(true);
        return;
      }
      if (!expanded) {
        handlers.onItemClick(message);
        return;
      }
      let rootError = getSecondRootError().get(process.stdout);
      let unsubscribe = rootError?.subscribeToSelectionChange(() => {
        if (rootError.hasTextSelection()) pendingClicks.get(itemKey)?.(false);
      });
      let checkDrag = () => {
        if (rootError?.selection.isDragging) {
          timer = clock.setTimeout(checkDrag, REVEAL_DEBOUNCE_MS);
          return;
        }
        pendingClicks.get(itemKey)?.(true);
      };
      let timer = clock.setTimeout(checkDrag, REVEAL_DEBOUNCE_MS);
      pendingClicks.set(itemKey, (shouldOpen) => {
        pendingClicks.delete(itemKey);
        unsubscribe?.();
        timer();
        let handlers_ = clickHandlersRef.current;
        if (shouldOpen && handlers_.isItemExpanded?.(message)) handlers_.onItemClick?.(message);
      });
    },
    [clock, pendingClicks],
  );
  let onEnterK = useCallback((k) => {
    clickHandlersRef.current.setHoveredKey(k);
  }, []);
  let onLeaveK = useCallback((k) => {
    clickHandlersRef.current.setHoveredKey((prev) => (prev === k ? null : prev));
  }, []);
  let rowsCacheRef = useRef(null);
  let rows = rowsCacheRef.current?.renderItem === renderItem ? rowsCacheRef.current.rows : undefined;
  let rowsCache = new Map();
  rowsCacheRef.current = {
    renderItem,
    rows: rowsCache,
  };
  return jsxProd_default_2(Fragment, {
    children: [
      jsxProd_default(Box, {
        ref: spacerRef,
        height: topSpacer,
        flexShrink: 0,
      }),
      messages.slice(start, min).map((msg, i) => {
        let index = start + i;
        if (msg === undefined) {
          reportMessageHole(host, index, messages, `mounted=[${start},${min})`);
          return null;
        }
        let k = itemKeys[index];
        let clickable = !!onItemClick && (isItemClickable?.(msg) ?? true);
        let hovered = clickable && hoveredKey === k;
        let expanded = isItemExpanded?.(msg);
        let cachedRow = rows?.get(k);
        let rowEntry =
          cachedRow !== undefined && cachedRow.msg === msg
            ? cachedRow
            : {
                msg,
                row: renderItem(msg, index),
              };
        rowsCache.set(k, rowEntry);
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
            children: rowEntry.row,
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
          scratch: searchTextCache,
          releaseReveal,
        }),
    ],
  });
}
//@ chunk-hnxhr3bs.js:176618-176694 sole-consumer
function scrollToElement(handle, node, computedTop) {
  let topMargin = leadingTopMargin(node);
  handle.scrollTo(computedTop + topMargin);
  handle.scrollToElement(node, topMargin);
  raiseScrollHeight(handle);
}
//@ chunk-hnxhr3bs.js:176694-176839 sole-consumer (2.1.88 match: dropSubtreeCache, 0.771)
function leadingTopMargin(node) {
  let margin = 0;
  let child = node.childNodes[0];
  while (child && child.nodeName !== "#text" && child.yogaNode) {
    margin += child.yogaNode.getComputedMargin(1);
    child = child.childNodes[0];
  }
  return margin;
}
//@ chunk-hnxhr3bs.js:176839-177010 sole-consumer
function findStreamingMessageIndex(messages, streamingToolUseIDs) {
  let index = messages.findIndex(
    (message) => message !== undefined && isMessageStreaming(message, streamingToolUseIDs),
  );
  if (index >= 0) return index;
  return messages.findIndex(
    (message) =>
      hasStringUuid(message) &&
      streamingToolUseIDs.length === message.uuid.length &&
      message.uuid.slice(0, UUID_PREFIX_LENGTH) === streamingToolUseIDs.slice(0, UUID_PREFIX_LENGTH),
  );
}
//@ chunk-hnxhr3bs.js:177010-177238 sole-consumer
function getStableMessageKey(msg) {
  let firstBlock = msg.type === "assistant" || msg.type === "user" ? msg.message.content[0] : undefined;
  if (typeof firstBlock !== "object") return msg.uuid;
  switch (firstBlock.type) {
    case "tool_use":
      return firstBlock.id;
    case "tool_result":
      return firstBlock.tool_use_id;
    default:
      return msg.uuid;
  }
}
//@ chunk-hnxhr3bs.js:177546-177840 sole-consumer
function reportMessageHole(host, index, messages, neighborsNote) {
  if (!claimOnceStore.of(host).claim("vml-message-hole")) return;
  let describeMessage = (message) =>
    message === undefined ? "undefined" : NAVIGABLE_TYPES(message).replaceAll("/", ".");
  let errorText =
    "VirtualMessageList: undefined element in messages[] \u2014 " +
    `undefined at messages[${index}] (len=${messages.length} ${neighborsNote} neighbors=[${describeMessage(messages[index - 1])},${describeMessage(messages[index + 1])}])`;
  logError(new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(errorText));
}
//@ chunk-hnxhr3bs.js:177840-178028 sole-consumer
function reportItemKeysDesync(host, keysLength, messagesLength, range) {
  if (!claimOnceStore.of(host).claim("vml-keys-desync")) return;
  let errorText = `VirtualMessageList: itemKeys/messages length desync (keys=${keysLength} messages=${messagesLength} range=[${range[0]},${range[1]}))`;
  logError(new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(errorText));
}
//@ chunk-hnxhr3bs.js:178028-178207 sole-consumer
function LayoutSubscriber(props) {
  let $ = useMemoCache(4);
  let { onLayout } = props;
  let { subscribeLayout } = useContext(APP_CONTEXT);
  let subscribeEffect;
  let subscribeDeps;
  if ($[0] !== onLayout || $[1] !== subscribeLayout) {
    subscribeEffect = () => subscribeLayout(onLayout);
    subscribeDeps = [subscribeLayout, onLayout];
    $[0] = onLayout;
    $[1] = subscribeLayout;
    $[2] = subscribeEffect;
    $[3] = subscribeDeps;
  } else {
    subscribeEffect = $[2];
    subscribeDeps = $[3];
  }
  useEffect(subscribeEffect, subscribeDeps);
  return null;
}
//@ chunk-hnxhr3bs.js:178207-179627 fingerprint (2.1.88 match: StickyTracker, 0.777)
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
  let isSticky = useHandleValue(scrollViewport, (handle) => handle?.isSticky() ?? true);
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
  if (firstVisible > 0 && !isSticky)
    for (let i = firstVisible - 1; i >= 0; i--) {
      let message = messages[i];
      if (message === undefined)
        reportMessageHole(host, i, messages, `range=[${start},${end}] firstVisible=${firstVisible}`);
      let promptText = stickyPromptText(scratch.promptText, message);
      if (promptText === null) continue;
      let top = getItemTop(i);
      if (top >= 0 && top + 1 >= target) continue;
      idx = i;
      text = promptText;
      break;
    }
  let baseOffset = firstVisibleTop >= 0 ? firstVisibleTop - offsets[firstVisible] : 0;
  let estimate = idx >= 0 ? Math.max(0, baseOffset + offsets[idx]) : -1;
  let pending = useRef({
    idx: -1,
    tries: 0,
  });
  let suppress = useRef("none");
  let lastIdx = useRef(-1);
  useEffect(() => {
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
  useEffect(() => {
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
//@ chunk-hnxhr3bs.js:180126-180831 placement
/**
 * 增量计算消息列表的 React key：复用前缀缓存，重复 key 加 #N 后缀并只上报一次重复。
 */
function computeItemKeys(messages, getKey, cache, describe = (message) => sanitizeEventKey(message.type)) {
  let reusedCount = 0;
  if (cache.itemKey === getKey && messages.length >= cache.keys.length) {
    let cachedCount = cache.keys.length;
    while (reusedCount < cachedCount && messages[reusedCount].uuid === cache.uuids[reusedCount])
      reusedCount++;
  }
  if (reusedCount < cache.keys.length) {
    cache.keys = [];
    cache.uuids = [];
    cache.seen = new Map();
    reusedCount = 0;
  }
  cache.itemKey = getKey;
  let duplicates = null;
  for (; reusedCount < messages.length; reusedCount++) {
    let message = messages[reusedCount];
    let key = getKey(message);
    let seenCount = cache.seen.get(key);
    if (seenCount === undefined) {
      cache.seen.set(key, 1);
      cache.keys.push(key);
    } else {
      cache.seen.set(key, seenCount + 1);
      cache.keys.push(`${key}#${seenCount}`);
      if (!cache.loggedDups.has(key)) {
        cache.loggedDups.add(key);
        (duplicates ??= new Map()).set(key, describe(message));
      }
    }
    cache.uuids.push(message.uuid);
  }
  if (duplicates) {
    let mapped = [...duplicates]
      .slice(0, 3)
      .map(([key, typeLabel]) => `[${typeLabel}] \xD7${cache.seen.get(key)}`);
    logError(
      Error(
        `VirtualMessageList: duplicate sibling itemKeys (deduped via #N suffix; upstream uuid-dup): ${duplicates.size} ${plural(duplicates.size, "key")}, ${mapped.join(", ")}`,
      ),
    );
  }
  return cache.keys;
}
export {
  bumpClawdPoseRun,
  releaseKeptPoseIfStale,
  VirtualMessageList,
  selectionPayloadForAltScreen,
  subscribeToSelectionEvents,
};
